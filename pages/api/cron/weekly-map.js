// pages/api/cron/weekly-map.js
import { supabaseGet, supabasePost, sendTelegram, callClaudeJSON, MY_CHAT_ID } from '../../../lib/helpers';

export default async function handler(req, res) {
  if (req.headers['authorization'] !== `Bearer ${process.env.CRON_SECRET}` && !req.query.manual) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    const now = new Date();
    const periodEnd = now.toISOString().split('T')[0];
    const periodStart = new Date(now.getTime() - 7 * 86400000).toISOString().split('T')[0];
    const startISO = periodStart + 'T00:00:00';
    
    const aspects = await supabaseGet('/rest/v1/aspects?select=*&is_active=eq.true');
    const eligibleAspects = aspects.filter(a => !a.no_read_mode);
    
    const diary = await supabaseGet(`/rest/v1/diary_log?created_at=gte.${startISO}&order=created_at.desc`);
    const ideas = await supabaseGet(`/rest/v1/ideas?created_at=gte.${startISO}&order=created_at.desc`);
    const reflections = await supabaseGet(`/rest/v1/reflections?created_at=gte.${startISO}&order=created_at.desc`);
    const questions = await supabaseGet(`/rest/v1/question_log?created_at=gte.${startISO}&order=created_at.desc`);
    const jobs = await supabaseGet(`/rest/v1/jobs?completed_at=gte.${startISO}&status=eq.completed&order=completed_at.desc`);
    const recentMaps = await supabaseGet('/rest/v1/weekly_maps?order=created_at.desc&limit=2');
    
    const aspectMap = {};
    aspects.forEach(a => { aspectMap[a.id] = a.name; });
    
    const context = `
== ASPECTS ==
${eligibleAspects.map(a => `- ${a.name} (${a.aspect_type})${a.meaning ? ': ' + a.meaning.slice(0, 100) : ''}`).join('\n')}

== DIARY THIS WEEK ==
${(diary || []).filter(d => !aspects.find(a => a.id === d.aspect_id)?.no_read_mode).map(d => `[${aspectMap[d.aspect_id]}] ${d.entry}`).join('\n') || '(none)'}

== IDEAS THIS WEEK ==
${(ideas || []).filter(i => !aspects.find(a => a.id === i.aspect_id)?.no_read_mode).map(i => `[${aspectMap[i.aspect_id]}] ${i.content}`).join('\n\n') || '(none)'}

== REFLECTIONS THIS WEEK ==
${(reflections || []).filter(r => !aspects.find(a => a.id === r.aspect_id)?.no_read_mode).map(r => `[${aspectMap[r.aspect_id]}] ${r.content}`).join('\n\n') || '(none)'}

== QUESTIONS ANSWERED ==
${(questions || []).filter(q => q.answer && !aspects.find(a => a.id === q.aspect_id)?.no_read_mode).map(q => `[${aspectMap[q.aspect_id]}]\nQ: ${q.question}\nA: ${q.answer}`).join('\n\n') || '(none)'}

== JOBS DONE ==
${(jobs || []).map(j => `[${aspectMap[j.aspect_id]}] ${j.title}`).join('\n') || '(none)'}

== RECENT MAPS (do not repeat) ==
${(recentMaps || []).map(m => `[${m.period_end}] ${(m.full_note || '').slice(0, 200)}...`).join('\n\n') || '(none)'}
`;
    
    const result = await callClaudeJSON(
      `You are the Mapping Engine. Read the week and produce a Weekly Map.

${context}

Frame the map as observations to land with them, not assertions. Use phrases like "I noticed", "it looks like", "I wonder if". Be specific. Quote actual content where useful. No flattery.

Identify:
1. DISTINCTIVE MOVES — moves only this person would have made this week
2. ENERGY GAPS — where they spent energy that did not amplify distinctiveness
3. CROSS-ASPECT SIGNATURE — the pattern running across all aspects (the most important section)
4. MAPPING HYPOTHESES — three specific directions where their distinctiveness would compound

Return JSON: {
  "distinctive_moves": "...",
  "energy_gaps": "...",
  "cross_aspect_signature": "...",
  "mapping_hypotheses": "...",
  "full_note": "the complete map, written as prose to be read"
}`,
      2500
    );
    
    if (!result) return res.status(500).json({ error: 'Failed to generate' });
    
    await supabasePost('/rest/v1/weekly_maps', {
      period_start: periodStart, period_end: periodEnd,
      distinctive_moves: result.distinctive_moves,
      energy_gaps: result.energy_gaps,
      cross_aspect_signature: result.cross_aspect_signature,
      mapping_hypotheses: result.mapping_hypotheses,
      full_note: result.full_note
    });
    
    await sendTelegram(MY_CHAT_ID, '🗺 *Sunday Map is ready.*');
    const full = result.full_note;
    if (full.length < 4000) {
      await sendTelegram(MY_CHAT_ID, full);
    } else {
      await sendTelegram(MY_CHAT_ID, full.slice(0, 3800));
      await sendTelegram(MY_CHAT_ID, full.slice(3800));
    }
    
    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

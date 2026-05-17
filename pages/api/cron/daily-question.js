// pages/api/cron/daily-question.js
import { supabaseGet, supabasePost, sendTelegram, callClaudeJSON, MY_CHAT_ID } from '../../../lib/helpers';

async function pickAspect() {
  const aspects = await supabaseGet('/rest/v1/aspects?select=*&is_active=eq.true&aspect_type=neq.derived');
  if (!Array.isArray(aspects) || aspects.length === 0) return null;
  const eligible = aspects.filter(a => !a.no_read_mode);
  if (eligible.length === 0) return null;
  
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const recentQs = await supabaseGet(`/rest/v1/question_log?created_at=gte.${sevenDaysAgo}&select=aspect_id`);
  
  const counts = {};
  eligible.forEach(a => { counts[a.id] = 0; });
  (recentQs || []).forEach(q => { if (counts[q.aspect_id] !== undefined) counts[q.aspect_id]++; });
  
  let best = eligible[0];
  let bestScore = -Infinity;
  for (const a of eligible) {
    const score = (a.priority_score || 50) - (counts[a.id] * 30);
    if (score > bestScore) { bestScore = score; best = a; }
  }
  return best;
}

export default async function handler(req, res) {
  if (req.headers['authorization'] !== `Bearer ${process.env.CRON_SECRET}` && !req.query.manual) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    const aspect = await pickAspect();
    if (!aspect) return res.status(200).json({ message: 'No eligible aspect' });
    
    const recent = await supabaseGet(`/rest/v1/question_log?aspect_id=eq.${aspect.id}&order=created_at.desc&limit=8`);
    const previousQs = (recent || []).map(q => `Q: ${q.question}\nA: ${q.answer || '(unanswered)'}`).join('\n\n');
    const isInner = aspect.aspect_type === 'inner';
    
    const q = await callClaudeJSON(
      `You are a question engine. Aspect: ${aspect.name} (${aspect.aspect_type})\n` +
      `${aspect.meaning ? 'Meaning: ' + aspect.meaning : ''}\n` +
      `${aspect.achievement_goal ? 'Goal: ' + aspect.achievement_goal : ''}\n` +
      `${aspect.current_struggle ? 'Struggle: ' + aspect.current_struggle : ''}\n\n` +
      `Previous questions (do NOT repeat):\n${previousQs || '(none)'}\n\n` +
      `${isInner ? 'INNER aspect — help them locate themselves.' : 'DOING aspect — reveal what they have not named.'}\n\n` +
      `Return JSON: {"question":"specific, not generic","depth":"surface|behavioural|identity|distinctiveness|shadow","rationale":"one sentence"}`,
      600
    );
    
    if (!q) return res.status(500).json({ error: 'Failed to generate' });
    
    await supabasePost('/rest/v1/question_log', {
      aspect_id: aspect.id, question: q.question, question_depth: q.depth, source: 'daily'
    });
    
    await sendTelegram(MY_CHAT_ID, `🌅 *Today's question — ${aspect.name}*\n_${q.depth}_\n\n${q.question}\n\n_Reply when you have a moment._`);
    
    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

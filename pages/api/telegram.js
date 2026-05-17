// pages/api/telegram.js — Stage 1
export const config = { api: { bodyParser: { sizeLimit: '1mb' } } };

import { supabaseGet, supabasePost, supabasePatch, sendTelegram, callClaude, callClaudeJSON, MY_CHAT_ID, SUPABASE_URL, SUPABASE_KEY } from '../../lib/helpers';

// ── Conversation state ──
async function getConvState(chatId) {
  const states = await supabaseGet(`/rest/v1/conversation_state?chat_id=eq.${chatId}&order=created_at.desc&limit=1`);
  return states && states[0];
}
async function setConvState(chatId, flowType, step, context) {
  await fetch(SUPABASE_URL + `/rest/v1/conversation_state?chat_id=eq.${chatId}`, {
    method: 'DELETE', headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
  });
  return supabasePost('/rest/v1/conversation_state', { chat_id: chatId, flow_type: flowType, step, context });
}
async function updateConvState(chatId, step, contextUpdates) {
  const current = await getConvState(chatId);
  if (!current) return;
  return supabasePatch(`/rest/v1/conversation_state?id=eq.${current.id}`, {
    step, context: { ...current.context, ...contextUpdates }, updated_at: new Date().toISOString()
  });
}
async function clearConvState(chatId) {
  return fetch(SUPABASE_URL + `/rest/v1/conversation_state?chat_id=eq.${chatId}`, {
    method: 'DELETE', headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
  });
}

// ── Question generation ──
async function generateQuestion(aspect, recent) {
  const previousQs = (recent || []).slice(0, 8).map(q => `Q: ${q.question}\nA: ${q.answer || '(unanswered)'}`).join('\n\n');
  const isInner = aspect.aspect_type === 'inner';
  
  const prompt = `You are a question engine for a personal operating system. Your goal: ask ONE question that reveals something new about this person.

Aspect: ${aspect.name} (${aspect.aspect_type})
${aspect.meaning ? 'What it means to them: ' + aspect.meaning : ''}
${aspect.achievement_goal ? 'What they want to achieve: ' + aspect.achievement_goal : ''}
${aspect.current_struggle ? 'Where they struggle: ' + aspect.current_struggle : ''}

Previous questions you have asked (do NOT repeat):
${previousQs || '(none)'}

${isInner ? 'This is an INNER aspect — the question should help them locate themselves more clearly. Not a "do this" question. A "see this" question.' : 'This is a DOING aspect — the question should reveal what they have not yet named about the work, the choice, or the trajectory.'}

Pick the depth level that yields the most signal RIGHT NOW given what is known and unknown.

Return JSON only:
{
  "question": "the question, specific and not generic",
  "depth": "surface|behavioural|identity|distinctiveness|shadow",
  "rationale": "one sentence why this question now"
}

Rules:
- Specific to THIS aspect and THIS person, never generic
- Not a question they could ask themselves easily
- No coaching cliches
- Frame as offering, not assertion`;
  
  return callClaudeJSON(prompt, 600);
}

// ── Pick aspect for daily question ──
async function pickAspectForQuestion() {
  const aspects = await supabaseGet('/rest/v1/aspects?select=*&is_active=eq.true&aspect_type=neq.derived&order=priority_score.desc');
  if (!Array.isArray(aspects) || aspects.length === 0) return null;
  
  // Filter out aspects with no_read_mode
  const eligible = aspects.filter(a => !a.no_read_mode);
  if (eligible.length === 0) return null;
  
  // Score: prefer aspects with fewer recent questions
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const recentQs = await supabaseGet(`/rest/v1/question_log?created_at=gte.${sevenDaysAgo}&select=aspect_id`);
  
  const counts = {};
  eligible.forEach(a => { counts[a.id] = 0; });
  (recentQs || []).forEach(q => { if (counts[q.aspect_id] !== undefined) counts[q.aspect_id]++; });
  
  let best = eligible[0];
  let bestScore = -Infinity;
  for (const a of eligible) {
    const recentCount = counts[a.id] || 0;
    const score = (a.priority_score || 50) - (recentCount * 30) + (a.high_care_mode ? -20 : 0);
    if (score > bestScore) { bestScore = score; best = a; }
  }
  return best;
}

// ── Decision flow ──
async function handleDecideFlow(chatId, text, state) {
  const ctx = state.context;
  
  if (state.step === 'awaiting_decision') {
    const aspects = await supabaseGet('/rest/v1/aspects?select=*&is_active=eq.true');
    const list = aspects.map(a => `- ${a.name} (id: ${a.id})`).join('\n');
    
    const match = await callClaudeJSON(
      `User is facing this decision: "${text}"\n\nWhich aspect does it belong to?\n${list}\n\nReturn JSON: {"aspect_id":"uuid","aspect_name":"name"}`,
      300
    );
    if (!match) {
      await sendTelegram(chatId, 'Could not identify aspect. Try again.');
      await clearConvState(chatId);
      return;
    }
    
    const aspect = aspects.find(a => a.id === match.aspect_id);
    await sendTelegram(chatId, `📋 Decision noted for *${aspect.name}*.\n\n_Classifying..._`);
    
    const cls = await callClaudeJSON(
      `Classify this decision in the context of "${aspect.name}":\n\n"${text}"\n\n` +
      `Context: ${aspect.meaning || ''}\nGoal: ${aspect.achievement_goal || ''}\n\n` +
      `Return JSON: {"reversible":bool,"urgent":bool,"driver":"fear|ambition|obligation|curiosity","certainty":"high|medium|low","decision_type_summary":"one sentence","underneath_question":"ONE question revealing the unspoken"}`,
      600
    );
    if (!cls) {
      await sendTelegram(chatId, 'Could not classify.');
      await clearConvState(chatId);
      return;
    }
    
    await sendTelegram(chatId,
      `*Classification*\n` +
      `• ${cls.reversible ? 'Reversible' : 'Irreversible'}\n` +
      `• ${cls.urgent ? 'Urgent' : 'Not urgent'}\n` +
      `• Driver: ${cls.driver}\n` +
      `• Certainty: ${cls.certainty}\n\n${cls.decision_type_summary}\n\n` +
      `*Question 1 of 2:*\n${cls.underneath_question}`
    );
    
    await updateConvState(chatId, 'awaiting_underneath', {
      decision: text, aspect_id: aspect.id, aspect_name: aspect.name,
      classification: cls, underneath_question: cls.underneath_question
    });
    return;
  }
  
  if (state.step === 'awaiting_underneath') {
    const premortemQ = `Now imagine it is two years from today, and this decision has clearly failed. Before I share what I think, tell me — what do *you* think the most likely reason for failure would be? Be specific.\n\n*Question 2 of 2:*`;
    await sendTelegram(chatId, premortemQ);
    await updateConvState(chatId, 'awaiting_premortem', { ...ctx, underneath_answer: text, premortem_question: premortemQ });
    return;
  }
  
  if (state.step === 'awaiting_premortem') {
    await sendTelegram(chatId, '🧭 _Generating counter-scenarios..._');
    
    const counter = await callClaudeJSON(
      `Decision: "${ctx.decision}"\nAspect: ${ctx.aspect_name}\nClassification: ${JSON.stringify(ctx.classification)}\nUnderneath: "${ctx.underneath_answer}"\nUser thinks failure cause: "${text}"\n\n` +
      `Generate TWO scenarios deliberately tilted AWAY from existing thinking. Surface blind spots.\n\n` +
      `Return JSON: {"scenarios":[{"title":"...","description":"...","blind_spot_named":"...","implication":"..."}],"decision_summary":"honest read"}`,
      1500
    );
    
    const now = new Date();
    const revisit3 = new Date(now.getTime() + 90 * 86400000).toISOString().split('T')[0];
    const revisit6 = new Date(now.getTime() + 180 * 86400000).toISOString().split('T')[0];
    
    await supabasePost('/rest/v1/decisions', {
      aspect_id: ctx.aspect_id, question: ctx.decision,
      classification: ctx.classification,
      underneath_question: ctx.underneath_question, underneath_answer: ctx.underneath_answer,
      premortem_question: ctx.premortem_question, premortem_answer: text,
      counter_scenarios: counter, tree: { label: ctx.decision, options: [] },
      revisit_3mo_date: revisit3, revisit_6mo_date: revisit6, status: 'open'
    });
    
    let reply = `*Counter-scenarios:*\n\n`;
    if (counter?.scenarios) {
      counter.scenarios.forEach((s, i) => {
        reply += `*${i+1}. ${s.title}*\n${s.description}\n_Blind spot:_ ${s.blind_spot_named}\n_→_ ${s.implication}\n\n`;
      });
      reply += `*Honest summary:*\n${counter.decision_summary}\n\n`;
    }
    reply += `✓ Decision recorded. Revisit in 3 and 6 months.`;
    
    await sendTelegram(chatId, reply);
    await clearConvState(chatId);
    return;
  }
}

// ── Process general update ──
async function processUpdate(chatId, inputText) {
  const aspects = await supabaseGet('/rest/v1/aspects?select=*&is_active=eq.true');
  if (!Array.isArray(aspects)) {
    await sendTelegram(chatId, 'Could not connect to database.');
    return;
  }
  
  const list = aspects.map(a => `- ${a.name} (${a.aspect_type}, id: ${a.id}): ${a.meaning?.slice(0, 80) || ''}`).join('\n');
  
  const result = await callClaudeJSON(
    `Personal OS aspects:\n${list}\n\nUser sent: "${inputText}"\n\n` +
    `Determine which aspect this belongs to and what kind of entry it is.\n\n` +
    `Return JSON:\n{"aspect_id":"uuid","aspect_name":"name","intent":"update|idea|job_done|reflection|answer","reply":"2 sentence honest confirmation, no flattery","diary_entry":"one line summary"}`,
    1000
  );
  
  if (!result) {
    await sendTelegram(chatId, 'Could not process.');
    return;
  }
  
  const aspect = aspects.find(a => a.id === result.aspect_id);
  if (!aspect) {
    await sendTelegram(chatId, 'Could not match to an aspect.');
    return;
  }
  
  // Check no-read mode
  if (aspect.no_read_mode) {
    await supabasePost('/rest/v1/diary_log', {
      aspect_id: aspect.id, entry: inputText, entry_type: 'note', source: 'telegram'
    });
    await sendTelegram(chatId, `✓ Logged to *${aspect.name}* (no-read mode — not analysed).`);
    return;
  }
  
  // Check for unanswered questions
  const unanswered = await supabaseGet(`/rest/v1/question_log?aspect_id=eq.${aspect.id}&answer=is.null&order=created_at.desc&limit=1`);
  if (unanswered?.[0] && (result.intent === 'answer' || inputText.length > 40)) {
    await supabasePatch(`/rest/v1/question_log?id=eq.${unanswered[0].id}`, {
      answer: inputText, answered_at: new Date().toISOString()
    });
  }
  
  // Log diary
  await supabasePost('/rest/v1/diary_log', {
    aspect_id: aspect.id, entry: result.diary_entry,
    entry_type: result.intent, source: 'telegram'
  });
  
  // Type-specific saves
  if (result.intent === 'idea') {
    await supabasePost('/rest/v1/ideas', { aspect_id: aspect.id, content: inputText, source: 'telegram' });
  } else if (result.intent === 'job_done') {
    await supabasePost('/rest/v1/jobs', {
      aspect_id: aspect.id, title: inputText, status: 'completed', completed_at: new Date().toISOString()
    });
  } else if (result.intent === 'reflection') {
    await supabasePost('/rest/v1/reflections', { aspect_id: aspect.id, content: inputText });
  }
  
  await sendTelegram(chatId, `✓ *${aspect.name}*\n\n${result.reply}`);
}

// ── Main handler ──
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(200).json({ ok: true });
  const message = req.body?.message;
  if (!message) return res.status(200).json({ ok: true });
  
  const chatId = message.chat.id.toString();
  if (chatId !== MY_CHAT_ID) {
    await sendTelegram(chatId, 'This is a private system.');
    return res.status(200).json({ ok: true });
  }
  
  const text = (message.text || '').split('@')[0].trim();
  
  try {
    const state = await getConvState(chatId);
    if (state && state.flow_type === 'decide' && !text.startsWith('/')) {
      await handleDecideFlow(chatId, text, state);
      return res.status(200).json({ ok: true });
    }
    
    if (text === '/start') {
      await sendTelegram(chatId,
        '*Personal OS active.*\n\n' +
        '/status — your 12 aspects\n' +
        '/ask [aspect] — generate a question\n' +
        '/decide — structured decision\n' +
        '/map — weekly map\n' +
        '/cancel — exit any flow\n\n' +
        'Or send any update.'
      );
      return res.status(200).json({ ok: true });
    }
    
    if (text === '/cancel') {
      await clearConvState(chatId);
      await sendTelegram(chatId, 'Cancelled.');
      return res.status(200).json({ ok: true });
    }
    
    if (text === '/status') {
      const aspects = await supabaseGet('/rest/v1/aspects?select=name,aspect_type,status,priority_score&is_active=eq.true&order=sort_order');
      if (!aspects?.length) {
        await sendTelegram(chatId, 'No aspects.');
        return res.status(200).json({ ok: true });
      }
      const doing = aspects.filter(a => a.aspect_type === 'doing');
      const inner = aspects.filter(a => a.aspect_type === 'inner');
      const derived = aspects.filter(a => a.aspect_type === 'derived');
      
      let msg = '*Aspects*\n\n';
      msg += '*Doing*\n' + doing.map(a => `• ${a.name} (${a.status})`).join('\n') + '\n\n';
      msg += '*Inner*\n' + inner.map(a => `• ${a.name}`).join('\n') + '\n\n';
      msg += '*Derived*\n' + derived.map(a => `• ${a.name}`).join('\n');
      
      await sendTelegram(chatId, msg);
      return res.status(200).json({ ok: true });
    }
    
    if (text.startsWith('/ask')) {
      const name = text.slice(5).trim();
      let aspect;
      if (name) {
        const found = await supabaseGet(`/rest/v1/aspects?select=*&name=ilike.*${encodeURIComponent(name)}*&is_active=eq.true`);
        aspect = found?.[0];
        if (!aspect) {
          await sendTelegram(chatId, `Could not find aspect matching "${name}".`);
          return res.status(200).json({ ok: true });
        }
      } else {
        aspect = await pickAspectForQuestion();
        if (!aspect) {
          await sendTelegram(chatId, 'No eligible aspects.');
          return res.status(200).json({ ok: true });
        }
      }
      
      if (aspect.no_read_mode) {
        await sendTelegram(chatId, `${aspect.name} is in no-read mode. No question generated.`);
        return res.status(200).json({ ok: true });
      }
      
      await sendTelegram(chatId, `_Thinking about ${aspect.name}..._`);
      
      const recent = await supabaseGet(`/rest/v1/question_log?aspect_id=eq.${aspect.id}&order=created_at.desc&limit=8`);
      const q = await generateQuestion(aspect, recent);
      if (!q) {
        await sendTelegram(chatId, 'Could not generate.');
        return res.status(200).json({ ok: true });
      }
      
      await supabasePost('/rest/v1/question_log', {
        aspect_id: aspect.id, question: q.question, question_depth: q.depth, source: 'on_demand'
      });
      
      await sendTelegram(chatId, `*${aspect.name}* — _${q.depth}_\n\n${q.question}\n\n_Reply when ready._`);
      return res.status(200).json({ ok: true });
    }
    
    if (text === '/decide') {
      await setConvState(chatId, 'decide', 'awaiting_decision', {});
      await sendTelegram(chatId, '🧭 *Decision Protocol*\n\nDescribe the decision you are facing. Be specific.\n\n_/cancel to exit._');
      return res.status(200).json({ ok: true });
    }
    
    if (text === '/map') {
      await sendTelegram(chatId, '🗺 _Generating map..._ This takes 20-30 seconds.');
      // Forward to the cron endpoint
      const url = `https://${req.headers.host}/api/cron/weekly-map?manual=1`;
      await fetch(url);
      return res.status(200).json({ ok: true });
    }
    
    if (text) {
      await processUpdate(chatId, text);
    }
    
  } catch (err) {
    console.error(err);
    await sendTelegram(chatId, `Error: ${err.message}`);
  }
  
  return res.status(200).json({ ok: true });
}

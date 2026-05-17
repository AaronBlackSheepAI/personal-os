// pages/api/cron/decision-revisits.js
import { supabaseGet, supabasePatch, sendTelegram, MY_CHAT_ID } from '../../../lib/helpers';

export default async function handler(req, res) {
  if (req.headers['authorization'] !== `Bearer ${process.env.CRON_SECRET}` && !req.query.manual) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const due3 = await supabaseGet(
      `/rest/v1/decisions?revisit_3mo_done=eq.false&revisit_3mo_date=lte.${today}&select=*,aspects(name)`
    );
    
    for (const d of (due3 || [])) {
      await sendTelegram(MY_CHAT_ID,
        `📅 *3-month revisit — ${d.aspects?.name || ''}*\n\n` +
        `Decision: "${d.question}"\n\n` +
        `You predicted the most likely failure mode would be:\n_"${d.premortem_answer}"_\n\n` +
        `How has it played out? Reply with the actual outcome.`
      );
      await supabasePatch(`/rest/v1/decisions?id=eq.${d.id}`, { revisit_3mo_done: true });
    }
    
    const due6 = await supabaseGet(
      `/rest/v1/decisions?revisit_6mo_done=eq.false&revisit_6mo_date=lte.${today}&select=*,aspects(name)`
    );
    
    for (const d of (due6 || [])) {
      await sendTelegram(MY_CHAT_ID,
        `📅 *6-month revisit — ${d.aspects?.name || ''}*\n\n` +
        `Decision: "${d.question}"\n\n` +
        `Six months in. How has this aged? What did you learn?`
      );
      await supabasePatch(`/rest/v1/decisions?id=eq.${d.id}`, { revisit_6mo_done: true });
    }
    
    return res.status(200).json({ ok: true, revisits_3mo: due3?.length || 0, revisits_6mo: due6?.length || 0 });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

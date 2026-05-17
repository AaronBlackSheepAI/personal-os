// lib/helpers.js — shared functions

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
export const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
export const MY_CHAT_ID = process.env.YOUR_CHAT_ID;

export async function supabaseGet(path) {
  const r = await fetch(SUPABASE_URL + path, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
  });
  return r.json();
}

export async function supabasePost(path, body) {
  return fetch(SUPABASE_URL + path, {
    method: 'POST',
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
    body: JSON.stringify(body)
  }).then(r => r.json());
}

export async function supabasePatch(path, body) {
  return fetch(SUPABASE_URL + path, {
    method: 'PATCH',
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
    body: JSON.stringify(body)
  });
}

export async function supabaseDelete(path) {
  return fetch(SUPABASE_URL + path, {
    method: 'DELETE',
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
  });
}

export async function sendTelegram(chatId, text) {
  await fetch('https://api.telegram.org/bot' + TELEGRAM_TOKEN + '/sendMessage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: text, parse_mode: 'Markdown' })
  });
}

export async function callClaude(prompt, maxTokens = 1500) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }]
    })
  });
  const data = await r.json();
  if (!data.content || !data.content[0]) return null;
  return data.content[0].text;
}

export async function callClaudeJSON(prompt, maxTokens = 1500) {
  const text = await callClaude(prompt, maxTokens);
  if (!text) return null;
  const match = text.match(/\{[\s\S]*\}/);
  return match ? JSON.parse(match[0]) : null;
}

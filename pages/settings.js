// pages/settings.js — Settings, export, feature suggestions
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';
import Head from 'next/head';

export default function Settings() {
  const router = useRouter();
  const [exporting, setExporting] = useState(false);
  const [suggestion, setSuggestion] = useState('');
  const [suggestions, setSuggestions] = useState([]);

  async function fetchSuggestions() {
    const { data } = await supabase.from('feature_suggestions').select('*').order('created_at', { ascending: false });
    setSuggestions(data || []);
  }
  useEffect(() => { fetchSuggestions(); }, []);

  async function exportAll() {
    setExporting(true);
    const tables = ['aspects', 'sub_aspects', 'vision_board', 'ideas', 'reflections', 'jobs', 'decisions', 'question_log', 'weekly_maps', 'diary_log', 'lifestyle_state', 'feature_suggestions'];
    const result = {};
    for (const t of tables) {
      const { data } = await supabase.from(t).select('*');
      result[t] = data;
    }
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `personal-os-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setExporting(false);
  }

  async function addSuggestion() {
    if (!suggestion.trim()) return;
    await supabase.from('feature_suggestions').insert({ suggestion });
    setSuggestion('');
    fetchSuggestions();
  }

  return (
    <>
      <Head>
        <title>Settings — Personal OS</title>
        <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Clash+Display:wght@500;600;700&display=swap" rel="stylesheet" />
      </Head>
      <div className="page">
        <button className="back-btn" onClick={() => router.push('/')}>← Back</button>
        <h1 className="title">Settings</h1>

        <div className="block">
          <h2>Data Export</h2>
          <p>Download everything in your Personal OS as JSON. Your data, in your hands, any time.</p>
          <button className="btn" onClick={exportAll} disabled={exporting}>{exporting ? 'Exporting...' : 'Export all data'}</button>
        </div>

        <div className="block">
          <h2>Feature Suggestions</h2>
          <p>Anything you notice missing or wish the system did differently — write it down here. It becomes your personal product roadmap.</p>
          <div className="suggestion-input">
            <textarea className="field-textarea" rows={3} value={suggestion} onChange={e => setSuggestion(e.target.value)} placeholder="What would help you use this system better?" />
            <button className="btn" onClick={addSuggestion}>Add</button>
          </div>
          {suggestions.length > 0 && (
            <div className="suggestions-list">
              {suggestions.map(s => (
                <div key={s.id} className="suggestion-item">
                  <div className="s-text">{s.suggestion}</div>
                  <div className="s-meta">{new Date(s.created_at).toLocaleDateString('en-GB')} · {s.status}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="block">
          <h2>Telegram Commands</h2>
          <ul className="commands">
            <li><code>/status</code> — see all 12 aspects with status</li>
            <li><code>/ask [aspect]</code> — generate a question on demand</li>
            <li><code>/decide</code> — start the structured decision protocol</li>
            <li><code>/map</code> — generate a weekly map immediately</li>
            <li><code>/cancel</code> — exit any active flow</li>
          </ul>
        </div>
      </div>

      <style jsx global>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #070b12; color: #c8cdd8; font-family: 'IBM Plex Mono', monospace; min-height: 100vh; }
        .page { max-width: 720px; margin: 0 auto; padding: 32px 24px 80px; }
        .back-btn { background: none; border: 1px solid rgba(255,255,255,0.1); color: #667; font-family: inherit; font-size: 11px; padding: 6px 12px; cursor: pointer; letter-spacing: 0.04em; margin-bottom: 24px; }
        .back-btn:hover { color: #aab; }
        .title { font-family: 'Clash Display', sans-serif; font-size: 32px; font-weight: 700; color: #fff; margin-bottom: 36px; }
        .block { margin-bottom: 40px; padding-bottom: 32px; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .block h2 { font-family: 'Clash Display', sans-serif; font-size: 14px; color: #99aacc; letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 10px; font-weight: 600; }
        .block p { font-size: 12px; color: #667; line-height: 1.7; margin-bottom: 16px; }
        .btn { background: rgba(100,130,200,0.12); border: 1px solid rgba(100,130,200,0.3); color: #99aadd; font-family: inherit; font-size: 11px; padding: 9px 18px; cursor: pointer; letter-spacing: 0.06em; }
        .btn:hover { background: rgba(100,130,200,0.2); }
        .btn:disabled { opacity: 0.5; }
        .field-textarea { width: 100%; background: rgba(255,255,255,0.025); border: 1px solid rgba(255,255,255,0.08); color: #ccd; font-family: inherit; font-size: 12px; padding: 12px; resize: vertical; outline: none; line-height: 1.6; }
        .suggestion-input { display: flex; flex-direction: column; gap: 8px; align-items: flex-end; }
        .suggestions-list { display: flex; flex-direction: column; gap: 8px; margin-top: 20px; }
        .suggestion-item { padding: 12px 14px; background: rgba(255,255,255,0.02); border-left: 2px solid rgba(100,130,200,0.3); }
        .s-text { font-size: 12px; color: #99aacc; line-height: 1.6; margin-bottom: 4px; }
        .s-meta { font-size: 9px; color: #445; letter-spacing: 0.08em; }
        .commands { list-style: none; padding: 0; }
        .commands li { padding: 8px 0; font-size: 12px; color: #889; line-height: 1.6; }
        .commands code { background: rgba(255,255,255,0.05); padding: 2px 8px; color: #99aacc; margin-right: 8px; font-family: inherit; }
      `}</style>
    </>
  );
}

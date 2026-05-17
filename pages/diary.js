// pages/diary.js — Chronological cross-aspect log
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';
import Head from 'next/head';

export default function Diary() {
  const router = useRouter();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  async function fetchEntries() {
    const { data } = await supabase.from('diary_log').select('*, aspects(name)').order('created_at', { ascending: false }).limit(200);
    setEntries(data || []);
    setLoading(false);
  }

  useEffect(() => { fetchEntries(); }, []);

  return (
    <>
      <Head>
        <title>Diary — Personal OS</title>
        <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Clash+Display:wght@500;600;700&display=swap" rel="stylesheet" />
      </Head>
      <div className="page">
        <button className="back-btn" onClick={() => router.push('/')}>← Back</button>
        <h1 className="title">Diary</h1>
        <p className="subtitle">Every update, idea, completed job, and answered question across all aspects, in chronological order.</p>

        {loading && <div className="loading">Loading...</div>}
        {!loading && entries.length === 0 && <div className="empty">No entries yet. The diary fills up as you use the system.</div>}

        {!loading && entries.map(e => (
          <div key={e.id} className="entry">
            <div className="entry-meta">
              <span className="aspect">{e.aspects?.name || 'Unknown'}</span>
              <span className="type">{e.entry_type}</span>
              <span className="date">{new Date(e.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div className="entry-text">{e.entry}</div>
          </div>
        ))}
      </div>

      <style jsx global>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #070b12; color: #c8cdd8; font-family: 'IBM Plex Mono', monospace; min-height: 100vh; }
        .page { max-width: 800px; margin: 0 auto; padding: 32px 24px 80px; }
        .back-btn { background: none; border: 1px solid rgba(255,255,255,0.1); color: #667; font-family: inherit; font-size: 11px; padding: 6px 12px; cursor: pointer; letter-spacing: 0.04em; margin-bottom: 24px; }
        .back-btn:hover { color: #aab; }
        .title { font-family: 'Clash Display', sans-serif; font-size: 32px; font-weight: 700; color: #fff; margin-bottom: 8px; }
        .subtitle { color: #556; font-size: 13px; margin-bottom: 36px; line-height: 1.6; }
        .loading, .empty { color: #445; padding: 40px; text-align: center; font-size: 13px; }
        .entry { padding: 16px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .entry-meta { display: flex; gap: 12px; margin-bottom: 8px; font-size: 10px; align-items: center; flex-wrap: wrap; }
        .aspect { color: #6688cc; letter-spacing: 0.08em; text-transform: uppercase; font-weight: 600; }
        .type { color: #556; }
        .date { color: #334; margin-left: auto; }
        .entry-text { font-size: 13px; color: #889; line-height: 1.7; }
      `}</style>
    </>
  );
}

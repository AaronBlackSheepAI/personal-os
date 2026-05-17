// pages/maps.js — Weekly Maps
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';
import Head from 'next/head';

export default function Maps() {
  const router = useRouter();
  const [maps, setMaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  async function fetchMaps() {
    const { data } = await supabase.from('weekly_maps').select('*').order('period_end', { ascending: false });
    setMaps(data || []);
    setLoading(false);
  }

  useEffect(() => { fetchMaps(); }, []);

  return (
    <>
      <Head>
        <title>Weekly Maps — Personal OS</title>
        <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Clash+Display:wght@500;600;700&display=swap" rel="stylesheet" />
      </Head>
      <div className="page">
        <button className="back-btn" onClick={() => router.push('/')}>← Back</button>
        <h1 className="title">Weekly Maps</h1>
        <p className="subtitle">What the Mapping Engine noticed each week — distinctive moves, energy gaps, the patterns running across all 12 aspects.</p>

        {loading && <div className="loading">Loading...</div>}
        {!loading && maps.length === 0 && (
          <div className="empty">
            <p>No maps yet. The first one runs next Sunday at 08:00.</p>
            <p>You can also send <code>/map</code> in Telegram any time.</p>
          </div>
        )}

        {!loading && maps.map((m, i) => (
          <div key={m.id} className="map-card">
            <div className="map-header" onClick={() => setExpanded(expanded === i ? null : i)}>
              <div>
                <div className="map-date">{m.period_start} → {m.period_end}</div>
                <div className="map-preview">{(m.cross_aspect_signature || m.full_note || '').slice(0, 200)}...</div>
              </div>
              <div className="map-toggle">{expanded === i ? '−' : '+'}</div>
            </div>
            {expanded === i && (
              <div className="map-body">
                <pre className="map-full">{m.full_note}</pre>
              </div>
            )}
          </div>
        ))}
      </div>

      <style jsx global>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #070b12; color: #c8cdd8; font-family: 'IBM Plex Mono', monospace; min-height: 100vh; }
        .page { max-width: 820px; margin: 0 auto; padding: 32px 24px 80px; }
        .back-btn { background: none; border: 1px solid rgba(255,255,255,0.1); color: #667; font-family: inherit; font-size: 11px; padding: 6px 12px; cursor: pointer; letter-spacing: 0.04em; margin-bottom: 24px; }
        .back-btn:hover { color: #aab; }
        .title { font-family: 'Clash Display', sans-serif; font-size: 32px; font-weight: 700; color: #fff; margin-bottom: 8px; }
        .subtitle { color: #556; font-size: 13px; margin-bottom: 36px; line-height: 1.6; }
        .loading, .empty { color: #445; padding: 40px; text-align: center; font-size: 13px; line-height: 1.8; }
        .empty code { background: rgba(255,255,255,0.05); padding: 2px 6px; color: #99aacc; }
        .map-card { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.07); margin-bottom: 12px; }
        .map-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; cursor: pointer; gap: 16px; }
        .map-header:hover { background: rgba(255,255,255,0.03); }
        .map-date { font-family: 'Clash Display', sans-serif; font-size: 13px; color: #99aacc; margin-bottom: 6px; }
        .map-preview { font-size: 12px; color: #667; line-height: 1.5; }
        .map-toggle { font-size: 20px; color: #445; }
        .map-body { padding: 0 20px 20px; border-top: 1px solid rgba(255,255,255,0.05); }
        .map-full { font-family: 'IBM Plex Mono', monospace; font-size: 13px; color: #889; line-height: 1.8; white-space: pre-wrap; word-break: break-word; padding: 20px 0; }
      `}</style>
    </>
  );
}

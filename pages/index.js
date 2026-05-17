// pages/index.js — Personal OS Command Centre
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';
import Head from 'next/head';

const STATUS_COLORS = {
  'Critical': '#ff4444',
  'Attention': '#ffaa00',
  'On Track': '#00cc88',
  'Dormant': '#445'
};

const TYPE_LABELS = {
  doing: 'Doing',
  inner: 'Inner',
  derived: 'Derived'
};

export default function Dashboard() {
  const router = useRouter();
  const [aspects, setAspects] = useState([]);
  const [recentDiary, setRecentDiary] = useState([]);
  const [poolCount, setPoolCount] = useState(0);
  const [committedCount, setCommittedCount] = useState(0);
  const [latestMap, setLatestMap] = useState(null);
  const [loading, setLoading] = useState(true);

  async function fetchAll() {
    const { data: a } = await supabase.from('aspects').select('*').eq('is_active', true).order('sort_order');
    setAspects(a || []);

    const { data: d } = await supabase.from('diary_log').select('*').order('created_at', { ascending: false }).limit(10);
    setRecentDiary(d || []);

    const { count: pc } = await supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('status', 'pool');
    setPoolCount(pc || 0);

    const { count: cc } = await supabase.from('jobs').select('*', { count: 'exact', head: true }).in('status', ['this_week', 'this_month']);
    setCommittedCount(cc || 0);

    const { data: m } = await supabase.from('weekly_maps').select('*').order('created_at', { ascending: false }).limit(1).single();
    setLatestMap(m);

    setLoading(false);
  }

  useEffect(() => {
    fetchAll();
    const i = setInterval(fetchAll, 30000);
    return () => clearInterval(i);
  }, []);

  const doingAspects = aspects.filter(a => a.aspect_type === 'doing');
  const innerAspects = aspects.filter(a => a.aspect_type === 'inner');
  const derivedAspects = aspects.filter(a => a.aspect_type === 'derived');

  function AspectCard({ aspect }) {
    const cfg = STATUS_COLORS[aspect.status] || '#445';
    const isInner = aspect.aspect_type === 'inner';
    const isDerived = aspect.aspect_type === 'derived';
    const hasDefinition = aspect.meaning || aspect.achievement_goal || aspect.current_struggle;

    return (
      <div className="aspect-card" onClick={() => router.push(`/aspect/${aspect.id}`)}>
        <div className="ac-header">
          <div className="ac-name">{aspect.name}</div>
          {!isInner && !isDerived && (
            <div className="ac-status" style={{ color: cfg }}>{aspect.status}</div>
          )}
          {isInner && <div className="ac-tag">inner</div>}
          {isDerived && <div className="ac-tag">derived</div>}
        </div>
        {aspect.meaning && <div className="ac-meaning">{aspect.meaning}</div>}
        {!hasDefinition && <div className="ac-empty">Tap to define</div>}
        {aspect.high_care_mode && <div className="ac-care">🤍 High care mode</div>}
        {aspect.no_read_mode && <div className="ac-noread">🔒 No-read mode</div>}
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Personal OS</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Clash+Display:wght@500;600;700&display=swap" rel="stylesheet" />
      </Head>
      <div className="app">
        <aside className="sidebar">
          <div className="logo">POS</div>
          <nav className="sidenav">
            <button className="active">Command Centre</button>
            <button onClick={() => router.push('/jobs')}>Jobs Pool</button>
            <button onClick={() => router.push('/diary')}>Diary</button>
            <button onClick={() => router.push('/maps')}>Weekly Maps</button>
            <button onClick={() => router.push('/decisions')}>Decisions Log</button>
            <button onClick={() => router.push('/settings')}>Settings</button>
          </nav>
          <div className="sidebar-stats">
            <div className="ss-row"><span>Pool</span><span>{poolCount}</span></div>
            <div className="ss-row"><span>Committed</span><span>{committedCount}</span></div>
          </div>
          <div className="sidebar-date">{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
        </aside>

        <main className="content">
          {loading && <div className="loading">Loading...</div>}

          {!loading && (
            <>
              <div className="page-title">Command Centre</div>

              {latestMap && (
                <div className="map-banner" onClick={() => router.push('/maps')}>
                  <div className="mb-label">Latest Weekly Map</div>
                  <div className="mb-period">{latestMap.period_start} → {latestMap.period_end}</div>
                  <div className="mb-snippet">{latestMap.cross_aspect_signature?.slice(0, 200) || latestMap.full_note?.slice(0, 200)}...</div>
                </div>
              )}

              <div className="section">
                <div className="section-header">
                  <h2>Doing</h2>
                  <div className="section-desc">Aspects where life is actively unfolding — work, body, money, relationships</div>
                </div>
                <div className="grid">
                  {doingAspects.map(a => <AspectCard key={a.id} aspect={a} />)}
                </div>
              </div>

              <div className="section">
                <div className="section-header">
                  <h2>Inner</h2>
                  <div className="section-desc">Where you locate yourself — reflections, beliefs, the compass</div>
                </div>
                <div className="grid">
                  {innerAspects.map(a => <AspectCard key={a.id} aspect={a} />)}
                </div>
              </div>

              <div className="section">
                <div className="section-header">
                  <h2>Derived</h2>
                  <div className="section-desc">The live read on how your doing and inner aspects interact</div>
                </div>
                <div className="grid">
                  {derivedAspects.map(a => <AspectCard key={a.id} aspect={a} />)}
                </div>
              </div>
            </>
          )}
        </main>
      </div>

      <style jsx global>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #070b12; color: #c8cdd8; font-family: 'IBM Plex Mono', monospace; min-height: 100vh; }
        a { color: inherit; text-decoration: none; }

        .app { display: flex; min-height: 100vh; }

        .sidebar {
          width: 220px; min-height: 100vh;
          background: #0c1220; border-right: 1px solid rgba(255,255,255,0.06);
          display: flex; flex-direction: column;
          padding: 28px 20px; gap: 28px;
          position: fixed; top: 0; left: 0; bottom: 0;
        }

        .logo {
          font-family: 'Clash Display', sans-serif;
          font-size: 22px; font-weight: 700;
          background: linear-gradient(135deg, #fff, #6688cc);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          letter-spacing: 0.1em;
        }

        .sidenav { display: flex; flex-direction: column; gap: 2px; }
        .sidenav button {
          background: none; border: none; color: #556;
          font-family: 'IBM Plex Mono', monospace; font-size: 11px;
          text-align: left; padding: 9px 12px; cursor: pointer;
          letter-spacing: 0.06em; text-transform: uppercase;
          border-radius: 3px; transition: all 0.2s;
        }
        .sidenav button:hover { color: #aab; background: rgba(255,255,255,0.03); }
        .sidenav button.active { color: #fff; background: rgba(255,255,255,0.05); }

        .sidebar-stats { display: flex; flex-direction: column; gap: 8px; margin-top: auto; padding: 14px; background: rgba(255,255,255,0.02); border-radius: 4px; }
        .ss-row { display: flex; justify-content: space-between; font-size: 11px; color: #889; }
        .ss-row span:last-child { color: #99aacc; font-weight: 600; }
        .sidebar-date { font-size: 10px; color: #334; }

        .content { margin-left: 220px; flex: 1; padding: 40px 48px; max-width: 1400px; }

        .page-title {
          font-family: 'Clash Display', sans-serif;
          font-size: 32px; font-weight: 700;
          color: #fff; margin-bottom: 32px;
          letter-spacing: 0.01em;
        }

        .loading { color: #445; padding: 60px; text-align: center; font-size: 13px; }

        .map-banner {
          background: linear-gradient(135deg, rgba(100,130,200,0.08), rgba(100,130,200,0.02));
          border: 1px solid rgba(100,130,200,0.25);
          padding: 20px 24px;
          margin-bottom: 36px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .map-banner:hover { border-color: rgba(100,130,200,0.5); }
        .mb-label { font-size: 9px; color: #6688cc; letter-spacing: 0.12em; text-transform: uppercase; font-weight: 600; margin-bottom: 6px; }
        .mb-period { font-family: 'Clash Display', sans-serif; font-size: 14px; color: #dde; margin-bottom: 8px; }
        .mb-snippet { font-size: 12px; color: #889; line-height: 1.6; }

        .section { margin-bottom: 40px; }
        .section-header { margin-bottom: 16px; }
        .section h2 {
          font-family: 'Clash Display', sans-serif;
          font-size: 13px; font-weight: 600;
          color: #99aacc; letter-spacing: 0.18em;
          text-transform: uppercase; margin-bottom: 4px;
        }
        .section-desc { font-size: 11px; color: #445; line-height: 1.5; }

        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: 10px;
        }

        .aspect-card {
          background: rgba(255,255,255,0.025);
          border: 1px solid rgba(255,255,255,0.07);
          padding: 18px 18px 16px;
          cursor: pointer;
          transition: all 0.2s;
          min-height: 110px;
          display: flex;
          flex-direction: column;
        }
        .aspect-card:hover { border-color: rgba(255,255,255,0.18); background: rgba(255,255,255,0.04); }

        .ac-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; gap: 8px; }
        .ac-name {
          font-family: 'Clash Display', sans-serif;
          font-size: 15px; font-weight: 600;
          color: #dde; line-height: 1.3;
        }
        .ac-status {
          font-size: 9px; padding: 2px 7px;
          background: rgba(255,255,255,0.03);
          letter-spacing: 0.08em; text-transform: uppercase;
        }
        .ac-tag {
          font-size: 9px; color: #445;
          letter-spacing: 0.1em; text-transform: uppercase;
        }
        .ac-meaning { font-size: 11px; color: #667; line-height: 1.55; }
        .ac-empty { font-size: 10px; color: #334; font-style: italic; margin-top: 4px; }
        .ac-care { font-size: 10px; color: #c89; margin-top: auto; padding-top: 8px; }
        .ac-noread { font-size: 10px; color: #889; margin-top: auto; padding-top: 8px; }

        @media (max-width: 768px) {
          .sidebar { display: none; }
          .content { margin-left: 0; padding: 24px 20px; }
          .grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </>
  );
}

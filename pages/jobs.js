// pages/jobs.js — Cross-aspect Jobs Pool
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';
import Head from 'next/head';

export default function JobsPool() {
  const router = useRouter();
  const [jobs, setJobs] = useState([]);
  const [aspects, setAspects] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  async function fetchAll() {
    const { data: j } = await supabase.from('jobs').select('*, aspects(name)').neq('status', 'completed').neq('status', 'dropped').order('priority', { ascending: false });
    const { data: a } = await supabase.from('aspects').select('*').eq('is_active', true).order('sort_order');
    setJobs(j || []);
    setAspects(a || []);
    setLoading(false);
  }

  useEffect(() => { fetchAll(); }, []);

  async function moveTo(jobId, status) {
    const updates = { status };
    if (status === 'completed') updates.completed_at = new Date().toISOString();
    await supabase.from('jobs').update(updates).eq('id', jobId);
    fetchAll();
  }

  let filtered = jobs;
  if (filter === 'week') filtered = jobs.filter(j => j.status === 'this_week');
  else if (filter === 'month') filtered = jobs.filter(j => j.status === 'this_month');
  else if (filter === 'pool') filtered = jobs.filter(j => j.status === 'pool');
  else if (filter === 'lifestyle') filtered = jobs.filter(j => j.pulls_on_lifestyle);

  const byAspect = {};
  filtered.forEach(j => {
    const name = j.aspects?.name || 'Unknown';
    if (!byAspect[name]) byAspect[name] = [];
    byAspect[name].push(j);
  });

  return (
    <>
      <Head>
        <title>Jobs Pool — Personal OS</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Clash+Display:wght@500;600;700&display=swap" rel="stylesheet" />
      </Head>
      <div className="page">
        <button className="back-btn" onClick={() => router.push('/')}>← Back</button>
        <h1 className="title">Jobs Pool</h1>
        <p className="subtitle">Every active job across all 12 aspects. Curate what goes into your week or month.</p>

        <div className="filters">
          {[['all', 'All'], ['pool', 'Pool'], ['week', 'This Week'], ['month', 'This Month'], ['lifestyle', '↯ Lifestyle pulls']].map(([k, l]) => (
            <button key={k} className={`fbtn ${filter === k ? 'active' : ''}`} onClick={() => setFilter(k)}>{l}</button>
          ))}
        </div>

        {loading && <div className="loading">Loading...</div>}
        {!loading && filtered.length === 0 && <div className="empty">No jobs in this view.</div>}

        {!loading && Object.entries(byAspect).map(([aspectName, items]) => (
          <div key={aspectName} className="aspect-group">
            <h2 className="aspect-name">{aspectName} <span className="count">({items.length})</span></h2>
            {items.map(j => (
              <div key={j.id} className={`job priority-${j.priority}`}>
                <div className="j-main">
                  <div className="j-title">{j.title}</div>
                  <div className="j-meta">
                    <span className="j-status">{j.status.replace('_', ' ')}</span>
                    {j.pulls_on_lifestyle && <span className="j-pull">↯ Lifestyle</span>}
                    <span className="j-priority">{j.priority}</span>
                  </div>
                </div>
                <div className="j-actions">
                  {j.status !== 'this_week' && <button onClick={() => moveTo(j.id, 'this_week')}>→ Week</button>}
                  {j.status !== 'this_month' && <button onClick={() => moveTo(j.id, 'this_month')}>→ Month</button>}
                  {j.status !== 'pool' && <button onClick={() => moveTo(j.id, 'pool')}>→ Pool</button>}
                  <button onClick={() => moveTo(j.id, 'completed')}>✓ Done</button>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      <style jsx global>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #070b12; color: #c8cdd8; font-family: 'IBM Plex Mono', monospace; min-height: 100vh; }
        .page { max-width: 1000px; margin: 0 auto; padding: 32px 24px 80px; }
        .back-btn { background: none; border: 1px solid rgba(255,255,255,0.1); color: #667; font-family: inherit; font-size: 11px; padding: 6px 12px; cursor: pointer; letter-spacing: 0.04em; margin-bottom: 24px; }
        .back-btn:hover { color: #aab; }
        .title { font-family: 'Clash Display', sans-serif; font-size: 32px; font-weight: 700; color: #fff; margin-bottom: 8px; }
        .subtitle { color: #556; font-size: 13px; margin-bottom: 28px; line-height: 1.6; }
        .filters { display: flex; gap: 6px; margin-bottom: 32px; flex-wrap: wrap; }
        .fbtn { background: none; border: 1px solid rgba(255,255,255,0.1); color: #667; font-family: inherit; font-size: 11px; padding: 7px 14px; cursor: pointer; letter-spacing: 0.06em; }
        .fbtn:hover { color: #aab; border-color: rgba(255,255,255,0.2); }
        .fbtn.active { color: #fff; border-color: rgba(100,130,200,0.5); background: rgba(100,130,200,0.1); }
        .loading, .empty { color: #445; padding: 40px; text-align: center; font-size: 13px; }
        .aspect-group { margin-bottom: 32px; }
        .aspect-name { font-family: 'Clash Display', sans-serif; font-size: 14px; font-weight: 600; color: #99aacc; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 12px; }
        .count { color: #445; font-weight: 400; }
        .job { background: rgba(255,255,255,0.025); border: 1px solid rgba(255,255,255,0.07); padding: 12px 14px; margin-bottom: 6px; display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
        .job.priority-urgent { border-left: 3px solid #ff4444; }
        .job.priority-high { border-left: 3px solid #ffaa00; }
        .job.priority-medium { border-left: 3px solid #6688cc; }
        .job.priority-low { border-left: 3px solid #445; }
        .j-main { flex: 1; min-width: 200px; }
        .j-title { font-size: 12px; color: #ccd; line-height: 1.5; margin-bottom: 4px; }
        .j-meta { display: flex; gap: 10px; font-size: 9px; color: #556; letter-spacing: 0.08em; text-transform: uppercase; }
        .j-pull { color: #c89; }
        .j-actions { display: flex; gap: 4px; }
        .j-actions button { background: none; border: 1px solid rgba(255,255,255,0.08); color: #667; font-family: inherit; font-size: 9px; padding: 4px 8px; cursor: pointer; letter-spacing: 0.04em; white-space: nowrap; }
        .j-actions button:hover { color: #aab; border-color: rgba(255,255,255,0.2); }
      `}</style>
    </>
  );
}

// pages/decisions.js — Cross-aspect decisions log
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';
import Head from 'next/head';

export default function DecisionsLog() {
  const router = useRouter();
  const [decisions, setDecisions] = useState([]);
  const [expanded, setExpanded] = useState(null);

  async function fetch() {
    const { data } = await supabase.from('decisions').select('*, aspects(name)').order('created_at', { ascending: false });
    setDecisions(data || []);
  }
  useEffect(() => { fetch(); }, []);

  return (
    <>
      <Head>
        <title>Decisions — Personal OS</title>
        <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Clash+Display:wght@500;600;700&display=swap" rel="stylesheet" />
      </Head>
      <div className="page">
        <button className="back-btn" onClick={() => router.push('/')}>← Back</button>
        <h1 className="title">Decisions Log</h1>
        <p className="subtitle">Every decision put through the protocol — classified, pre-mortem'd, with counter-scenarios and revisit dates.</p>
        <p className="hint">Use <code>/decide</code> in Telegram to start a new decision.</p>

        {decisions.length === 0 && <div className="empty">No decisions logged yet.</div>}

        {decisions.map((d, i) => (
          <div key={d.id} className="dec-card">
            <div className="dec-header" onClick={() => setExpanded(expanded === i ? null : i)}>
              <div>
                <div className="dec-aspect">{d.aspects?.name}</div>
                <div className="dec-q">{d.question}</div>
                <div className="dec-meta">
                  {d.classification?.reversible !== undefined && <span>{d.classification.reversible ? 'reversible' : 'irreversible'}</span>}
                  {d.classification?.driver && <span>{d.classification.driver}</span>}
                  <span>{new Date(d.created_at).toLocaleDateString('en-GB')}</span>
                </div>
              </div>
              <div className="dec-toggle">{expanded === i ? '−' : '+'}</div>
            </div>
            {expanded === i && (
              <div className="dec-body">
                {d.underneath_question && (
                  <div className="dec-section">
                    <div className="sec-label">Underneath</div>
                    <div className="q">{d.underneath_question}</div>
                    <div className="a">{d.underneath_answer}</div>
                  </div>
                )}
                {d.premortem_question && (
                  <div className="dec-section">
                    <div className="sec-label">Pre-mortem</div>
                    <div className="q">{d.premortem_question}</div>
                    <div className="a">{d.premortem_answer}</div>
                  </div>
                )}
                {d.counter_scenarios?.scenarios && (
                  <div className="dec-section">
                    <div className="sec-label">Counter-scenarios</div>
                    {d.counter_scenarios.scenarios.map((s, i) => (
                      <div key={i} className="cs">
                        <div className="cs-title">{s.title}</div>
                        <div className="cs-desc">{s.description}</div>
                        <div className="cs-note">Blind spot: {s.blind_spot_named}</div>
                        <div className="cs-note">→ {s.implication}</div>
                      </div>
                    ))}
                  </div>
                )}
                {d.outcome_notes && (
                  <div className="dec-section">
                    <div className="sec-label">Outcome</div>
                    <div className="a">{d.outcome_notes}</div>
                  </div>
                )}
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
        .subtitle { color: #556; font-size: 13px; margin-bottom: 8px; line-height: 1.6; }
        .hint { color: #445; font-size: 11px; margin-bottom: 28px; }
        .hint code { background: rgba(255,255,255,0.05); padding: 1px 6px; color: #99aacc; }
        .empty { color: #445; padding: 40px; text-align: center; font-size: 13px; }
        .dec-card { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.07); margin-bottom: 10px; }
        .dec-header { display: flex; justify-content: space-between; align-items: flex-start; padding: 14px 18px; cursor: pointer; gap: 16px; }
        .dec-header:hover { background: rgba(255,255,255,0.03); }
        .dec-aspect { font-size: 10px; color: #6688cc; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 4px; }
        .dec-q { font-size: 13px; color: #dde; margin-bottom: 6px; line-height: 1.5; }
        .dec-meta { display: flex; gap: 12px; font-size: 10px; color: #445; text-transform: uppercase; letter-spacing: 0.06em; }
        .dec-toggle { font-size: 18px; color: #445; }
        .dec-body { padding: 0 18px 18px; border-top: 1px solid rgba(255,255,255,0.05); display: flex; flex-direction: column; gap: 16px; }
        .dec-section { padding-top: 16px; }
        .sec-label { font-size: 9px; color: #445; letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 8px; }
        .q { font-size: 12px; color: #99aacc; margin-bottom: 8px; font-style: italic; }
        .a { font-size: 12px; color: #889; line-height: 1.7; padding: 10px 12px; background: rgba(255,255,255,0.02); }
        .cs { padding: 12px 14px; background: rgba(255,255,255,0.02); margin-bottom: 8px; }
        .cs-title { font-family: 'Clash Display', sans-serif; font-size: 13px; color: #dde; margin-bottom: 4px; }
        .cs-desc { font-size: 11px; color: #889; line-height: 1.6; margin-bottom: 6px; }
        .cs-note { font-size: 10px; color: #667; margin-top: 2px; }
      `}</style>
    </>
  );
}

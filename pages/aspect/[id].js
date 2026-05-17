// pages/aspect/[id].js — Aspect detail page with surfaces
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabase';
import Head from 'next/head';

// Tab sets by aspect type
const DOING_TABS = ['Overview', 'Vision', 'Sub-aspects', 'Ideas', 'Jobs', 'Done'];
const INNER_TABS = ['Overview', 'Vision', 'Reflections', 'Ideas'];
const DERIVED_TABS = ['Lifestyle'];
const COMPASS_TABS = ['Overview', 'Vision', 'Beliefs', 'Purpose', 'Mission', 'Standpoints', 'Reflections'];

export default function AspectPage() {
  const router = useRouter();
  const { id } = router.query;
  const [aspect, setAspect] = useState(null);
  const [tab, setTab] = useState('Overview');

  async function fetchAspect() {
    if (!id) return;
    const { data } = await supabase.from('aspects').select('*').eq('id', id).single();
    setAspect(data);
  }

  useEffect(() => { fetchAspect(); }, [id]);

  if (!aspect) return <div className="loading-page">Loading...</div>;

  const isCompass = aspect.name === 'Compass';
  const isLifestyle = aspect.name === 'Lifestyle';
  const tabs = isCompass ? COMPASS_TABS
             : aspect.aspect_type === 'derived' ? DERIVED_TABS
             : aspect.aspect_type === 'inner' ? INNER_TABS
             : DOING_TABS;

  if (tabs.indexOf(tab) === -1) setTab(tabs[0]);

  return (
    <>
      <Head>
        <title>{aspect.name} — Personal OS</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Clash+Display:wght@500;600;700&display=swap" rel="stylesheet" />
      </Head>
      <div className="page">
        <div className="header">
          <button className="back-btn" onClick={() => router.push('/')}>← Back</button>
          <div className="title-wrap">
            <h1 className="title">{aspect.name}</h1>
            <div className="type-tag">{aspect.aspect_type}</div>
          </div>
          <button className="settings-btn" onClick={() => router.push(`/aspect/${id}/settings`)}>⚙ Settings</button>
        </div>

        <div className="tabs">
          {tabs.map(t => (
            <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{t}</button>
          ))}
        </div>

        {tab === 'Overview' && <OverviewTab aspect={aspect} onUpdate={fetchAspect} />}
        {tab === 'Vision' && <VisionTab aspectId={id} />}
        {tab === 'Sub-aspects' && <SubAspectsTab aspectId={id} />}
        {tab === 'Ideas' && <IdeasTab aspectId={id} />}
        {tab === 'Jobs' && <JobsTab aspectId={id} aspectName={aspect.name} />}
        {tab === 'Done' && <DoneTab aspectId={id} />}
        {tab === 'Reflections' && <ReflectionsTab aspectId={id} section={null} />}
        {tab === 'Beliefs' && <ReflectionsTab aspectId={id} section="beliefs" sectionLabel="Beliefs — what you hold to be true" />}
        {tab === 'Purpose' && <ReflectionsTab aspectId={id} section="purpose" sectionLabel="Purpose — why you are here" />}
        {tab === 'Mission' && <ReflectionsTab aspectId={id} section="mission" sectionLabel="Mission — the active expression of purpose right now" />}
        {tab === 'Standpoints' && <ReflectionsTab aspectId={id} section="standpoints" sectionLabel="Standpoints — the commitments that govern your choices" />}
        {tab === 'Lifestyle' && <LifestyleTab />}
      </div>

      <style jsx global>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #070b12; color: #c8cdd8; font-family: 'IBM Plex Mono', monospace; min-height: 100vh; }

        .loading-page { color: #445; padding: 60px; text-align: center; }

        .page { max-width: 920px; margin: 0 auto; padding: 32px 24px 80px; }

        .header { display: flex; align-items: center; gap: 16px; margin-bottom: 28px; }
        .back-btn, .settings-btn {
          background: none; border: 1px solid rgba(255,255,255,0.1);
          color: #667; font-family: inherit; font-size: 11px;
          padding: 6px 12px; cursor: pointer; letter-spacing: 0.04em;
        }
        .back-btn:hover, .settings-btn:hover { color: #aab; border-color: rgba(255,255,255,0.25); }
        .settings-btn { margin-left: auto; }

        .title-wrap { display: flex; align-items: center; gap: 12px; flex: 1; }
        .title {
          font-family: 'Clash Display', sans-serif;
          font-size: 28px; font-weight: 700; color: #fff;
          letter-spacing: 0.01em;
        }
        .type-tag {
          font-size: 9px; padding: 3px 9px;
          background: rgba(255,255,255,0.05);
          color: #889; letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .tabs {
          display: flex; gap: 2px;
          margin-bottom: 32px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          overflow-x: auto;
        }
        .tab {
          background: none; border: none; color: #445;
          font-family: inherit; font-size: 11px;
          padding: 10px 16px; cursor: pointer;
          letter-spacing: 0.08em; text-transform: uppercase;
          border-bottom: 2px solid transparent;
          transition: all 0.2s; white-space: nowrap;
        }
        .tab:hover { color: #889; }
        .tab.active { color: #fff; border-bottom-color: #6688cc; }

        .sec-label { font-size: 9px; color: #445; letter-spacing: 0.14em; text-transform: uppercase; font-weight: 600; margin-bottom: 8px; }
        .empty-state { color: #334; font-size: 12px; text-align: center; padding: 48px 20px; line-height: 1.7; }

        .field-input, .field-textarea {
          width: 100%;
          background: rgba(255,255,255,0.025);
          border: 1px solid rgba(255,255,255,0.08);
          color: #ccd; font-family: inherit; font-size: 12px;
          padding: 12px 14px; outline: none;
          line-height: 1.6;
        }
        .field-textarea { resize: vertical; min-height: 80px; }
        .field-input:focus, .field-textarea:focus { border-color: rgba(100,130,200,0.4); }

        .btn {
          background: rgba(100,130,200,0.12); 
          border: 1px solid rgba(100,130,200,0.3);
          color: #99aadd; font-family: inherit; font-size: 11px;
          padding: 8px 14px; cursor: pointer;
          letter-spacing: 0.06em;
        }
        .btn:hover { background: rgba(100,130,200,0.2); }
        .btn:disabled { opacity: 0.5; cursor: wait; }
        .btn-secondary {
          background: none; border: 1px solid rgba(255,255,255,0.1);
          color: #667;
        }
        .btn-secondary:hover { color: #aab; border-color: rgba(255,255,255,0.25); }
      `}</style>
    </>
  );
}

// ── Overview Tab ─────────────────────────────────────────
function OverviewTab({ aspect, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [meaning, setMeaning] = useState(aspect.meaning || '');
  const [goal, setGoal] = useState(aspect.achievement_goal || '');
  const [struggle, setStruggle] = useState(aspect.current_struggle || '');
  const [customFields, setCustomFields] = useState(aspect.custom_fields || {});
  const [newFieldName, setNewFieldName] = useState('');
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await supabase.from('aspects').update({
      meaning, achievement_goal: goal, current_struggle: struggle,
      custom_fields: customFields
    }).eq('id', aspect.id);
    setSaving(false);
    setEditing(false);
    onUpdate();
  }

  function addCustomField() {
    if (!newFieldName.trim()) return;
    const key = newFieldName.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    setCustomFields({ ...customFields, [key]: { label: newFieldName, value: '' } });
    setNewFieldName('');
  }

  function updateCustomField(key, value) {
    setCustomFields({ ...customFields, [key]: { ...customFields[key], value } });
  }

  function removeCustomField(key) {
    const next = { ...customFields };
    delete next[key];
    setCustomFields(next);
  }

  if (!editing) {
    return (
      <div className="tab-body">
        <div className="overview-section">
          <div className="sec-label">What this aspect means to me</div>
          <div className="ov-text">{aspect.meaning || <span className="ov-empty">Not yet written</span>}</div>
        </div>
        <div className="overview-section">
          <div className="sec-label">What I'm trying to achieve</div>
          <div className="ov-text">{aspect.achievement_goal || <span className="ov-empty">Not yet written</span>}</div>
        </div>
        <div className="overview-section">
          <div className="sec-label">Where I'm struggling</div>
          <div className="ov-text">{aspect.current_struggle || <span className="ov-empty">Not yet written</span>}</div>
        </div>
        {aspect.custom_fields && Object.entries(aspect.custom_fields).map(([key, field]) => (
          <div key={key} className="overview-section">
            <div className="sec-label">{field.label}</div>
            <div className="ov-text">{field.value || <span className="ov-empty">Empty</span>}</div>
          </div>
        ))}
        <button className="btn" onClick={() => setEditing(true)}>Edit</button>

        <style jsx>{`
          .tab-body { display: flex; flex-direction: column; gap: 24px; }
          .overview-section { padding-bottom: 8px; }
          .ov-text { font-size: 13px; color: #99aacc; line-height: 1.8; white-space: pre-wrap; }
          .ov-empty { color: #334; font-style: italic; }
        `}</style>
      </div>
    );
  }

  return (
    <div className="tab-body">
      <div>
        <div className="sec-label">What this aspect means to me</div>
        <textarea className="field-textarea" value={meaning} onChange={e => setMeaning(e.target.value)} placeholder="Write in your own words what this aspect is to you, why it matters, what it touches in your life..." />
      </div>
      <div>
        <div className="sec-label">What I'm trying to achieve</div>
        <textarea className="field-textarea" value={goal} onChange={e => setGoal(e.target.value)} placeholder="The live ambition. What this aspect is reaching toward..." />
      </div>
      <div>
        <div className="sec-label">Where I'm struggling</div>
        <textarea className="field-textarea" value={struggle} onChange={e => setStruggle(e.target.value)} placeholder="The honest friction. What's hard right now..." />
      </div>

      {Object.entries(customFields).map(([key, field]) => (
        <div key={key}>
          <div className="cf-header">
            <div className="sec-label">{field.label}</div>
            <button className="cf-remove" onClick={() => removeCustomField(key)}>Remove</button>
          </div>
          <textarea className="field-textarea" value={field.value || ''} onChange={e => updateCustomField(key, e.target.value)} />
        </div>
      ))}

      <div className="add-field">
        <input className="field-input" placeholder="Add a custom field (e.g. 'Current question', 'Constraint')..." value={newFieldName} onChange={e => setNewFieldName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCustomField()} />
        <button className="btn btn-secondary" onClick={addCustomField}>+ Add field</button>
      </div>

      <div className="actions">
        <button className="btn" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
        <button className="btn btn-secondary" onClick={() => setEditing(false)}>Cancel</button>
      </div>

      <style jsx>{`
        .tab-body { display: flex; flex-direction: column; gap: 20px; }
        .cf-header { display: flex; align-items: center; justify-content: space-between; }
        .cf-remove { background: none; border: none; color: #667; font-family: inherit; font-size: 10px; cursor: pointer; letter-spacing: 0.04em; }
        .cf-remove:hover { color: #c66; }
        .add-field { display: flex; gap: 8px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.05); }
        .actions { display: flex; gap: 8px; padding-top: 12px; }
      `}</style>
    </div>
  );
}

// ── Vision Board Tab ─────────────────────────────────────
function VisionTab({ aspectId }) {
  const [items, setItems] = useState([]);
  const [adding, setAdding] = useState(false);
  const [itemType, setItemType] = useState('text');
  const [url, setUrl] = useState('');
  const [content, setContent] = useState('');
  const [notes, setNotes] = useState('');

  async function fetchItems() {
    const { data } = await supabase.from('vision_board').select('*').eq('aspect_id', aspectId).order('pinned', { ascending: false }).order('created_at', { ascending: false });
    setItems(data || []);
  }

  useEffect(() => { fetchItems(); }, [aspectId]);

  async function addItem() {
    if (!content && !url) return;
    await supabase.from('vision_board').insert({
      aspect_id: aspectId, item_type: itemType, url, content, notes
    });
    setUrl(''); setContent(''); setNotes(''); setAdding(false);
    fetchItems();
  }

  async function togglePin(item) {
    await supabase.from('vision_board').update({ pinned: !item.pinned }).eq('id', item.id);
    fetchItems();
  }

  async function deleteItem(id) {
    await supabase.from('vision_board').delete().eq('id', id);
    fetchItems();
  }

  return (
    <div className="tab-body">
      <p className="tab-intro">The pull, not the push. Images, quotes, links, articles, screenshots — anything that reminds you what you're moving toward in this aspect.</p>

      {!adding && <button className="btn" onClick={() => setAdding(true)}>+ Add to vision board</button>}

      {adding && (
        <div className="add-form">
          <div className="type-row">
            {['text', 'quote', 'link', 'image'].map(t => (
              <button key={t} className={`type-btn ${itemType === t ? 'active' : ''}`} onClick={() => setItemType(t)}>{t}</button>
            ))}
          </div>
          {(itemType === 'link' || itemType === 'image') && (
            <input className="field-input" placeholder={itemType === 'image' ? 'Image URL' : 'Link URL'} value={url} onChange={e => setUrl(e.target.value)} />
          )}
          <textarea className="field-textarea" placeholder={itemType === 'quote' ? 'The quote...' : 'Content or caption...'} value={content} onChange={e => setContent(e.target.value)} />
          <input className="field-input" placeholder="Your reflection on this (optional)" value={notes} onChange={e => setNotes(e.target.value)} />
          <div className="actions">
            <button className="btn" onClick={addItem}>Save</button>
            <button className="btn btn-secondary" onClick={() => setAdding(false)}>Cancel</button>
          </div>
        </div>
      )}

      {items.length === 0 && !adding && <div className="empty-state">Empty for now. Add what pulls you forward.</div>}

      <div className="board">
        {items.map(item => (
          <div key={item.id} className={`vb-item ${item.pinned ? 'pinned' : ''}`}>
            {item.item_type === 'image' && item.url && <img src={item.url} alt="" />}
            {item.item_type === 'link' && (
              <a href={item.url} target="_blank" rel="noopener noreferrer" className="vb-link">{item.url}</a>
            )}
            {item.item_type === 'quote' && <div className="vb-quote">"{item.content}"</div>}
            {item.item_type === 'text' && <div className="vb-text">{item.content}</div>}
            {item.content && item.item_type !== 'text' && item.item_type !== 'quote' && <div className="vb-caption">{item.content}</div>}
            {item.notes && <div className="vb-notes">{item.notes}</div>}
            <div className="vb-actions">
              <button onClick={() => togglePin(item)}>{item.pinned ? '★ Pinned' : '☆ Pin'}</button>
              <button onClick={() => deleteItem(item.id)}>Remove</button>
            </div>
          </div>
        ))}
      </div>

      <style jsx>{`
        .tab-body { display: flex; flex-direction: column; gap: 18px; }
        .tab-intro { font-size: 12px; color: #667; line-height: 1.6; padding: 14px 16px; background: rgba(255,255,255,0.02); border-left: 2px solid rgba(255,255,255,0.08); }
        .add-form { display: flex; flex-direction: column; gap: 10px; padding: 16px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.08); }
        .type-row { display: flex; gap: 4px; }
        .type-btn { background: none; border: 1px solid rgba(255,255,255,0.1); color: #667; font-family: inherit; font-size: 10px; padding: 6px 12px; cursor: pointer; letter-spacing: 0.06em; text-transform: uppercase; }
        .type-btn.active { color: #fff; border-color: rgba(100,130,200,0.5); background: rgba(100,130,200,0.1); }
        .actions { display: flex; gap: 8px; }
        .board { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px; }
        .vb-item { background: rgba(255,255,255,0.025); border: 1px solid rgba(255,255,255,0.07); padding: 14px; display: flex; flex-direction: column; gap: 8px; }
        .vb-item.pinned { border-color: rgba(200,170,100,0.3); }
        .vb-item img { width: 100%; height: 160px; object-fit: cover; }
        .vb-link { font-size: 11px; color: #6688cc; word-break: break-all; }
        .vb-quote { font-family: 'Clash Display', sans-serif; font-size: 14px; color: #dde; line-height: 1.5; font-style: italic; }
        .vb-text { font-size: 12px; color: #99aacc; line-height: 1.6; }
        .vb-caption { font-size: 11px; color: #889; }
        .vb-notes { font-size: 10px; color: #556; line-height: 1.6; padding: 8px 10px; background: rgba(255,255,255,0.02); border-left: 2px solid rgba(255,255,255,0.08); }
        .vb-actions { display: flex; gap: 10px; margin-top: auto; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.04); }
        .vb-actions button { background: none; border: none; color: #556; font-family: inherit; font-size: 10px; cursor: pointer; padding: 0; }
        .vb-actions button:hover { color: #aab; }
      `}</style>
    </div>
  );
}

// ── Sub-aspects Tab ──────────────────────────────────────
function SubAspectsTab({ aspectId }) {
  const [subs, setSubs] = useState([]);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');

  async function fetchSubs() {
    const { data } = await supabase.from('sub_aspects').select('*').eq('aspect_id', aspectId).eq('is_active', true).order('sort_order');
    setSubs(data || []);
  }

  useEffect(() => { fetchSubs(); }, [aspectId]);

  async function addSub() {
    if (!name.trim()) return;
    await supabase.from('sub_aspects').insert({
      aspect_id: aspectId, name, description: desc, sort_order: subs.length + 1
    });
    setName(''); setDesc(''); setAdding(false);
    fetchSubs();
  }

  return (
    <div className="tab-body">
      <p className="tab-intro">Sub-aspects let you break down a domain. For example: three businesses inside Career, or running and strength training inside Fitness. Use them when something deserves its own structure within the aspect.</p>

      {!adding && <button className="btn" onClick={() => setAdding(true)}>+ Add sub-aspect</button>}

      {adding && (
        <div className="add-form">
          <input className="field-input" placeholder="Name (e.g. 'DomainBroker.AI')" value={name} onChange={e => setName(e.target.value)} />
          <textarea className="field-textarea" placeholder="Short description (optional)" value={desc} onChange={e => setDesc(e.target.value)} />
          <div className="actions">
            <button className="btn" onClick={addSub}>Save</button>
            <button className="btn btn-secondary" onClick={() => setAdding(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="sub-list">
        {subs.map(s => (
          <div key={s.id} className="sub-card">
            <div className="sub-name">{s.name}</div>
            {s.description && <div className="sub-desc">{s.description}</div>}
          </div>
        ))}
      </div>
      {subs.length === 0 && !adding && <div className="empty-state">No sub-aspects yet. Add them when this domain needs internal structure.</div>}

      <style jsx>{`
        .tab-body { display: flex; flex-direction: column; gap: 18px; }
        .tab-intro { font-size: 12px; color: #667; line-height: 1.6; padding: 14px 16px; background: rgba(255,255,255,0.02); border-left: 2px solid rgba(255,255,255,0.08); }
        .add-form { display: flex; flex-direction: column; gap: 10px; padding: 16px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.08); }
        .actions { display: flex; gap: 8px; }
        .sub-list { display: flex; flex-direction: column; gap: 8px; }
        .sub-card { background: rgba(255,255,255,0.025); border: 1px solid rgba(255,255,255,0.07); padding: 14px 16px; }
        .sub-name { font-family: 'Clash Display', sans-serif; font-size: 14px; color: #dde; font-weight: 600; margin-bottom: 4px; }
        .sub-desc { font-size: 11px; color: #667; line-height: 1.5; }
      `}</style>
    </div>
  );
}

// ── Ideas Tab ────────────────────────────────────────────
function IdeasTab({ aspectId }) {
  const [ideas, setIdeas] = useState([]);
  const [content, setContent] = useState('');

  async function fetchIdeas() {
    const { data } = await supabase.from('ideas').select('*').eq('aspect_id', aspectId).order('pinned', { ascending: false }).order('created_at', { ascending: false });
    setIdeas(data || []);
  }

  useEffect(() => { fetchIdeas(); }, [aspectId]);

  async function add() {
    if (!content.trim()) return;
    await supabase.from('ideas').insert({ aspect_id: aspectId, content, source: 'manual' });
    setContent('');
    fetchIdeas();
  }

  async function togglePin(idea) {
    await supabase.from('ideas').update({ pinned: !idea.pinned }).eq('id', idea.id);
    fetchIdeas();
  }

  return (
    <div className="tab-body">
      <div className="input-row">
        <textarea className="field-textarea" rows={3} placeholder="Drop an idea, insight, or thought..." value={content} onChange={e => setContent(e.target.value)} />
        <button className="btn" onClick={add}>Add</button>
      </div>
      <div className="ideas-list">
        {ideas.map(i => (
          <div key={i.id} className={`idea-card ${i.pinned ? 'pinned' : ''}`}>
            <div className="idea-meta">
              <span className="idea-date">{new Date(i.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
              <button className="pin-btn" onClick={() => togglePin(i)}>{i.pinned ? '★' : '☆'}</button>
            </div>
            <div className="idea-text">{i.content}</div>
            {i.ai_assessment && <div className="idea-assessment">{i.ai_assessment}</div>}
          </div>
        ))}
      </div>
      {ideas.length === 0 && <div className="empty-state">No ideas yet.</div>}

      <style jsx>{`
        .tab-body { display: flex; flex-direction: column; gap: 18px; }
        .input-row { display: flex; flex-direction: column; gap: 8px; align-items: flex-end; }
        .input-row .field-textarea { width: 100%; }
        .ideas-list { display: flex; flex-direction: column; gap: 10px; }
        .idea-card { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); padding: 14px 16px; }
        .idea-card.pinned { border-color: rgba(200,170,100,0.3); }
        .idea-meta { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
        .idea-date { font-size: 10px; color: #445; }
        .pin-btn { background: none; border: none; color: #667; cursor: pointer; font-size: 14px; }
        .pin-btn:hover { color: #c89; }
        .idea-text { font-size: 12px; color: #99aacc; line-height: 1.7; }
        .idea-assessment { font-size: 11px; color: #667; line-height: 1.6; padding: 10px 12px; background: rgba(255,255,255,0.02); border-left: 2px solid #445; margin-top: 10px; }
      `}</style>
    </div>
  );
}

// ── Jobs Tab ─────────────────────────────────────────────
function JobsTab({ aspectId, aspectName }) {
  const [jobs, setJobs] = useState([]);
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('medium');
  const [pulls, setPulls] = useState(false);

  async function fetchJobs() {
    const { data } = await supabase.from('jobs').select('*').eq('aspect_id', aspectId).neq('status', 'completed').neq('status', 'dropped').order('priority', { ascending: false }).order('created_at', { ascending: false });
    setJobs(data || []);
  }

  useEffect(() => { fetchJobs(); }, [aspectId]);

  async function add() {
    if (!title.trim()) return;
    await supabase.from('jobs').insert({ aspect_id: aspectId, title, priority, pulls_on_lifestyle: pulls });
    setTitle(''); setPriority('medium'); setPulls(false);
    fetchJobs();
  }

  async function moveTo(jobId, status) {
    const updates = { status };
    if (status === 'completed') {
      updates.completed_at = new Date().toISOString();
    }
    await supabase.from('jobs').update(updates).eq('id', jobId);
    fetchJobs();
  }

  const pool = jobs.filter(j => j.status === 'pool');
  const week = jobs.filter(j => j.status === 'this_week');
  const month = jobs.filter(j => j.status === 'this_month');

  function JobItem({ j }) {
    return (
      <div className={`job-item priority-${j.priority}`}>
        <div className="j-main">
          <div className="j-title">{j.title}</div>
          {j.pulls_on_lifestyle && <span className="j-pull">↯ Pulls on lifestyle</span>}
        </div>
        <div className="j-actions">
          {j.status !== 'this_week' && <button onClick={() => moveTo(j.id, 'this_week')}>Week</button>}
          {j.status !== 'this_month' && <button onClick={() => moveTo(j.id, 'this_month')}>Month</button>}
          {j.status !== 'pool' && <button onClick={() => moveTo(j.id, 'pool')}>Pool</button>}
          <button onClick={() => moveTo(j.id, 'completed')}>✓ Done</button>
        </div>
      </div>
    );
  }

  return (
    <div className="tab-body">
      <div className="add-job">
        <input className="field-input" placeholder="Add a job for this aspect..." value={title} onChange={e => setTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} />
        <select className="priority-select" value={priority} onChange={e => setPriority(e.target.value)}>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>
        <label className="pull-check">
          <input type="checkbox" checked={pulls} onChange={e => setPulls(e.target.checked)} />
          <span>Pulls on lifestyle</span>
        </label>
        <button className="btn" onClick={add}>+ Add</button>
      </div>

      {week.length > 0 && (
        <div className="section">
          <div className="sec-label">This Week ({week.length})</div>
          {week.map(j => <JobItem key={j.id} j={j} />)}
        </div>
      )}
      {month.length > 0 && (
        <div className="section">
          <div className="sec-label">This Month ({month.length})</div>
          {month.map(j => <JobItem key={j.id} j={j} />)}
        </div>
      )}
      {pool.length > 0 && (
        <div className="section">
          <div className="sec-label">Pool ({pool.length})</div>
          {pool.map(j => <JobItem key={j.id} j={j} />)}
        </div>
      )}
      {jobs.length === 0 && <div className="empty-state">No jobs yet.</div>}

      <style jsx>{`
        .tab-body { display: flex; flex-direction: column; gap: 20px; }
        .add-job { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
        .add-job .field-input { flex: 1; min-width: 200px; }
        .priority-select { background: rgba(255,255,255,0.025); border: 1px solid rgba(255,255,255,0.08); color: #ccd; font-family: inherit; font-size: 11px; padding: 8px 10px; outline: none; }
        .pull-check { display: flex; align-items: center; gap: 6px; font-size: 11px; color: #889; cursor: pointer; }
        .section { display: flex; flex-direction: column; gap: 6px; }
        .job-item { background: rgba(255,255,255,0.025); border: 1px solid rgba(255,255,255,0.07); padding: 10px 14px; display: flex; align-items: center; justify-content: space-between; gap: 10px; }
        .job-item.priority-urgent { border-left: 3px solid #ff4444; }
        .job-item.priority-high { border-left: 3px solid #ffaa00; }
        .job-item.priority-medium { border-left: 3px solid #6688cc; }
        .job-item.priority-low { border-left: 3px solid #445; }
        .j-main { flex: 1; }
        .j-title { font-size: 12px; color: #99aacc; line-height: 1.5; }
        .j-pull { font-size: 9px; color: #c89; letter-spacing: 0.04em; }
        .j-actions { display: flex; gap: 4px; }
        .j-actions button { background: none; border: 1px solid rgba(255,255,255,0.08); color: #667; font-family: inherit; font-size: 9px; padding: 4px 8px; cursor: pointer; letter-spacing: 0.04em; }
        .j-actions button:hover { color: #aab; border-color: rgba(255,255,255,0.2); }
      `}</style>
    </div>
  );
}

// ── Done Tab ─────────────────────────────────────────────
function DoneTab({ aspectId }) {
  const [jobs, setJobs] = useState([]);
  
  async function fetchDone() {
    const { data } = await supabase.from('jobs').select('*').eq('aspect_id', aspectId).eq('status', 'completed').order('completed_at', { ascending: false });
    setJobs(data || []);
  }
  useEffect(() => { fetchDone(); }, [aspectId]);

  return (
    <div className="tab-body">
      <p className="tab-intro">What you've actually completed in this aspect. The honest record of your motion.</p>
      {jobs.length === 0 && <div className="empty-state">Nothing logged yet.</div>}
      {jobs.map(j => (
        <div key={j.id} className="done-item">
          <span className="check">✓</span>
          <div>
            <div className="done-title">{j.title}</div>
            <div className="done-date">{new Date(j.completed_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
          </div>
        </div>
      ))}
      <style jsx>{`
        .tab-body { display: flex; flex-direction: column; gap: 8px; }
        .tab-intro { font-size: 12px; color: #667; line-height: 1.6; padding: 14px 16px; background: rgba(255,255,255,0.02); border-left: 2px solid rgba(255,255,255,0.08); margin-bottom: 8px; }
        .done-item { display: flex; gap: 12px; padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.04); align-items: flex-start; }
        .check { color: #00cc88; font-size: 14px; }
        .done-title { font-size: 12px; color: #99aacc; line-height: 1.5; }
        .done-date { font-size: 10px; color: #334; margin-top: 4px; }
      `}</style>
    </div>
  );
}

// ── Reflections Tab (with optional section filter for Compass) ──
function ReflectionsTab({ aspectId, section, sectionLabel }) {
  const [reflections, setReflections] = useState([]);
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');

  async function fetchReflections() {
    let q = supabase.from('reflections').select('*').eq('aspect_id', aspectId).eq('archived', false);
    if (section !== null && section !== undefined) q = q.eq('section', section);
    q = q.order('pinned', { ascending: false }).order('created_at', { ascending: false });
    const { data } = await q;
    setReflections(data || []);
  }

  useEffect(() => { fetchReflections(); }, [aspectId, section]);

  async function add() {
    if (!content.trim()) return;
    await supabase.from('reflections').insert({
      aspect_id: aspectId, title, content, section: section || null
    });
    setContent(''); setTitle('');
    fetchReflections();
  }

  async function togglePin(r) {
    await supabase.from('reflections').update({ pinned: !r.pinned }).eq('id', r.id);
    fetchReflections();
  }

  return (
    <div className="tab-body">
      {sectionLabel && <div className="section-intro">{sectionLabel}</div>}
      <div className="input-area">
        <input className="field-input" placeholder="Title (optional)" value={title} onChange={e => setTitle(e.target.value)} />
        <textarea className="field-textarea" rows={6} placeholder={section === 'beliefs' ? 'A belief you hold...' : section === 'purpose' ? 'On purpose...' : section === 'mission' ? 'Your active mission...' : section === 'standpoints' ? 'A standpoint you have taken...' : 'Write freely...'} value={content} onChange={e => setContent(e.target.value)} />
        <button className="btn" onClick={add}>Add</button>
      </div>
      <div className="reflection-list">
        {reflections.map(r => (
          <div key={r.id} className={`reflection-card ${r.pinned ? 'pinned' : ''}`}>
            <div className="r-meta">
              <span>{new Date(r.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              <button onClick={() => togglePin(r)}>{r.pinned ? '★' : '☆'}</button>
            </div>
            {r.title && <div className="r-title">{r.title}</div>}
            <div className="r-content">{r.content}</div>
          </div>
        ))}
      </div>
      {reflections.length === 0 && <div className="empty-state">Nothing here yet.</div>}

      <style jsx>{`
        .tab-body { display: flex; flex-direction: column; gap: 20px; }
        .section-intro { font-family: 'Clash Display', sans-serif; font-size: 13px; color: #99aacc; line-height: 1.6; padding: 14px 16px; background: rgba(100,130,200,0.05); border-left: 2px solid rgba(100,130,200,0.3); }
        .input-area { display: flex; flex-direction: column; gap: 8px; align-items: flex-end; }
        .input-area .field-input, .input-area .field-textarea { width: 100%; }
        .reflection-list { display: flex; flex-direction: column; gap: 12px; }
        .reflection-card { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); padding: 18px 20px; }
        .reflection-card.pinned { border-color: rgba(200,170,100,0.3); }
        .r-meta { display: flex; justify-content: space-between; align-items: center; font-size: 10px; color: #445; margin-bottom: 10px; }
        .r-meta button { background: none; border: none; color: #667; cursor: pointer; font-size: 14px; }
        .r-meta button:hover { color: #c89; }
        .r-title { font-family: 'Clash Display', sans-serif; font-size: 15px; color: #dde; margin-bottom: 8px; }
        .r-content { font-size: 13px; color: #99aacc; line-height: 1.9; white-space: pre-wrap; }
      `}</style>
    </div>
  );
}

// ── Lifestyle Tab ────────────────────────────────────────
function LifestyleTab() {
  const [defaultState, setDefaultState] = useState(null);
  const [presentState, setPresentState] = useState(null);
  const [pulls, setPulls] = useState([]);
  const [editingDefault, setEditingDefault] = useState(false);
  const [defaultDesc, setDefaultDesc] = useState('');

  async function fetchAll() {
    const { data: defaults } = await supabase.from('lifestyle_state').select('*').eq('state_type', 'default').single();
    const { data: present } = await supabase.from('lifestyle_state').select('*').eq('state_type', 'present').single();
    const { data: pullingJobs } = await supabase.from('jobs').select('*').eq('pulls_on_lifestyle', true).in('status', ['this_week', 'this_month', 'pool']);
    
    setDefaultState(defaults);
    setPresentState(present);
    setPulls(pullingJobs || []);
    setDefaultDesc(defaults?.description || '');
  }

  useEffect(() => { fetchAll(); }, []);

  async function saveDefault() {
    await supabase.from('lifestyle_state').update({ description: defaultDesc }).eq('state_type', 'default');
    setEditingDefault(false);
    fetchAll();
  }

  const gap = pulls.length;

  return (
    <div className="tab-body">
      <div className="lifestyle-header">
        <div className="lh-label">The gap between your default and your present</div>
        <div className={`gap-indicator gap-${gap === 0 ? 'none' : gap < 3 ? 'small' : 'large'}`}>
          {gap === 0 ? '✓ At default' : `${gap} pull${gap > 1 ? 's' : ''} active`}
        </div>
      </div>

      <div className="ls-section">
        <div className="ls-section-header">
          <div className="sec-label">Default Lifestyle</div>
          {!editingDefault && <button className="btn btn-secondary" onClick={() => setEditingDefault(true)}>Edit</button>}
        </div>
        {!editingDefault ? (
          <div className="ls-text">{defaultState?.description || <span className="empty">Write your ideal lifestyle — how your time, energy, sleep, work, rest, relationships, body, and creativity ideally flow when nothing is on fire.</span>}</div>
        ) : (
          <div className="ls-edit">
            <textarea className="field-textarea" rows={10} value={defaultDesc} onChange={e => setDefaultDesc(e.target.value)} placeholder="Describe your ideal lifestyle..." />
            <div className="actions">
              <button className="btn" onClick={saveDefault}>Save</button>
              <button className="btn btn-secondary" onClick={() => { setEditingDefault(false); setDefaultDesc(defaultState?.description || ''); }}>Cancel</button>
            </div>
          </div>
        )}
      </div>

      <div className="ls-section">
        <div className="sec-label">What is pulling on your lifestyle right now</div>
        {pulls.length === 0 ? (
          <div className="ls-text"><span className="empty">Nothing currently pulling on your lifestyle. You should be close to your default.</span></div>
        ) : (
          <div className="pulls-list">
            {pulls.map(p => (
              <div key={p.id} className="pull-item">
                <span className="pull-icon">↯</span>
                <span className="pull-title">{p.title}</span>
                <span className="pull-status">{p.status.replace('_', ' ')}</span>
              </div>
            ))}
            <div className="pulls-note">
              Each of these is currently pulling your present-time lifestyle away from your default. Resolve them and you move closer to default. Mark them as not lifestyle-pulling on the relevant job to remove from this view.
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .tab-body { display: flex; flex-direction: column; gap: 24px; }
        .lifestyle-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); }
        .lh-label { font-size: 11px; color: #889; letter-spacing: 0.04em; }
        .gap-indicator { font-size: 12px; font-weight: 600; padding: 4px 12px; border-radius: 2px; }
        .gap-indicator.gap-none { color: #00cc88; background: rgba(0,204,136,0.1); }
        .gap-indicator.gap-small { color: #ffaa00; background: rgba(255,170,0,0.1); }
        .gap-indicator.gap-large { color: #ff4444; background: rgba(255,68,68,0.1); }
        .ls-section { display: flex; flex-direction: column; gap: 10px; }
        .ls-section-header { display: flex; justify-content: space-between; align-items: center; }
        .ls-text { font-size: 13px; color: #99aacc; line-height: 1.9; white-space: pre-wrap; padding: 16px 18px; background: rgba(255,255,255,0.02); }
        .empty { color: #445; font-style: italic; }
        .ls-edit { display: flex; flex-direction: column; gap: 8px; align-items: flex-end; }
        .ls-edit .field-textarea { width: 100%; }
        .actions { display: flex; gap: 8px; }
        .pulls-list { display: flex; flex-direction: column; gap: 8px; }
        .pull-item { display: flex; align-items: center; gap: 12px; padding: 10px 14px; background: rgba(255,170,0,0.05); border-left: 2px solid #ffaa00; font-size: 12px; }
        .pull-icon { color: #ffaa00; }
        .pull-title { color: #ccd; flex: 1; }
        .pull-status { font-size: 9px; color: #889; letter-spacing: 0.08em; text-transform: uppercase; }
        .pulls-note { font-size: 11px; color: #667; line-height: 1.6; padding: 10px 12px; background: rgba(255,255,255,0.02); border-left: 2px solid rgba(255,255,255,0.06); margin-top: 6px; }
      `}</style>
    </div>
  );
}

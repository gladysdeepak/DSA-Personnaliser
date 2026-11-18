import React, { useEffect, useRef, useState } from 'react';
import { Bot, Send, Trash2, LoaderCircle, Wrench, Target, Sparkles } from 'lucide-react';

const API = 'http://localhost:5001';
const TOOL_LABELS = {
  get_learning_profile: 'Read your learning profile',
  get_weak_concepts: 'Checked diagnosed weak concepts',
  search_problems: 'Searched the LeetCode dataset',
  get_attempt_history: 'Reviewed recent attempts',
  get_problem_details: 'Retrieved problem details',
  get_personalized_plan: 'Built a four-step practice plan',
  save_learning_goal: 'Saved your learning goal'
};

export default function LearningAssistant() {
  const [userId] = useState(() => {
    const stored = localStorage.getItem('dsa-personaliser-user-id');
    if (stored) return stored;
    const generated = `learner_${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem('dsa-personaliser-user-id', generated);
    return generated;
  });
  const [messages, setMessages] = useState([]);
  const [goals, setGoals] = useState([]);
  const [configured, setConfigured] = useState(true);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [lastTrace, setLastTrace] = useState([]);
  const endRef = useRef(null);

  async function loadHistory() {
    try {
      const response = await fetch(`${API}/api/agent/history?user_id=${encodeURIComponent(userId)}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not load assistant history.');
      setMessages(data.history || []);
      setGoals(data.goals || []);
      setConfigured(Boolean(data.configured));
    } catch (err) { setError(err.message); }
  }

  useEffect(() => { loadHistory(); }, [userId]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, busy]);

  async function send(event) {
    event.preventDefault();
    const message = draft.trim();
    if (!message || busy || !configured) return;
    setDraft(''); setError(''); setBusy(true); setLastTrace([]);
    setMessages((current) => [...current, { role: 'user', content: message, localOnly: true }]);
    try {
      const response = await fetch(`${API}/api/agent/chat`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, message })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'The assistant could not answer.');
      setMessages((current) => [...current.filter((entry) => !entry.localOnly), { role: 'assistant', content: data.answer }]);
      setLastTrace(data.tool_trace || []);
      await loadHistory();
    } catch (err) {
      setError(err.message);
      setMessages((current) => current.filter((entry) => !entry.localOnly));
      await loadHistory();
    } finally { setBusy(false); }
  }

  async function clearHistory() {
    setError('');
    try {
      const response = await fetch(`${API}/api/agent/history?user_id=${encodeURIComponent(userId)}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Could not clear conversation history.');
      setMessages([]); setLastTrace([]);
    } catch (err) { setError(err.message); }
  }

  return (
    <section className="learning-assistant-layout" style={{ maxWidth: 1050, margin: '0 auto', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 270px', gap: 18 }}>
      <div className="glass-card" style={{ minHeight: '72vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <header style={{ padding: '20px 22px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 11, background: 'rgba(99,102,241,.2)', display: 'grid', placeItems: 'center' }}><Bot color="var(--accent-primary)" /></div>
          <div style={{ flex: 1 }}><h2 style={{ fontSize: '1.12rem' }}>AI Learning Assistant</h2><p style={{ fontSize: '.82rem', color: 'var(--text-muted)' }}>Grounded in your diagnosis, attempts, and the LeetCode dataset</p></div>
          <button type="button" onClick={clearHistory} title="Clear conversation" aria-label="Clear conversation" style={{ background: 'transparent', color: 'var(--text-muted)', border: 0, cursor: 'pointer', padding: 8 }}><Trash2 size={17} /></button>
        </header>
        {!configured && <div style={{ padding: '12px 20px', background: 'rgba(245,158,11,.1)', color: '#fbbf24', borderBottom: '1px solid rgba(245,158,11,.2)', fontSize: '.88rem' }}>
          Add <code>OPENAI_API_KEY</code> to the project’s server environment and restart the backend to enable the agent.
        </div>}
        {error && <div role="alert" style={{ margin: '14px 18px 0', color: '#f87171', fontSize: '.88rem' }}>{error}</div>}
        <div style={{ flex: 1, padding: 20, display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto', maxHeight: '56vh' }}>
          {messages.length === 0 && <div style={{ margin: 'auto', maxWidth: 480, textAlign: 'center', color: 'var(--text-muted)' }}>
            <Sparkles size={26} color="var(--accent-cyan)" style={{ marginBottom: 12 }} />
            <h3 style={{ color: 'var(--text-main)', marginBottom: 8 }}>What are you working toward?</h3>
            <p>Ask for a focused practice plan, help with a weak concept, or problems matching a technique. The assistant can inspect your stored attempts and save a goal when you ask.</p>
          </div>}
          {messages.map((entry, index) => (
            <div key={`${entry.role}-${entry.created_at || index}`} style={{ alignSelf: entry.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '88%', padding: '13px 15px', borderRadius: 14, background: entry.role === 'user' ? 'rgba(99,102,241,.2)' : 'rgba(255,255,255,.055)', border: `1px solid ${entry.role === 'user' ? 'rgba(99,102,241,.28)' : 'var(--border-color)'}`, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
              <div style={{ fontSize: '.7rem', color: 'var(--text-muted)', marginBottom: 5 }}>{entry.role === 'user' ? 'You' : 'Learning assistant'}</div>
              {entry.content}
            </div>
          ))}
          {busy && <div style={{ color: 'var(--text-muted)', display: 'flex', gap: 8, alignItems: 'center' }}><LoaderCircle size={16} /> Checking your learning context…</div>}
          <div ref={endRef} />
        </div>
        {lastTrace.length > 0 && <div style={{ padding: '10px 20px', borderTop: '1px solid var(--border-color)', color: 'var(--text-muted)', display: 'flex', flexWrap: 'wrap', gap: 10, fontSize: '.75rem' }}>
          {lastTrace.map((entry, index) => <span key={`${entry.tool}-${index}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Wrench size={12} />{TOOL_LABELS[entry.tool] || entry.tool}</span>)}
        </div>}
        <form onSubmit={send} style={{ display: 'flex', gap: 10, padding: 16, borderTop: '1px solid var(--border-color)' }}>
          <input value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={3000} disabled={!configured || busy} placeholder={configured ? 'Ask about your DSA learning…' : 'Configure the server API key to start'} aria-label="Message the AI learning assistant" style={{ flex: 1, minWidth: 0, padding: '12px 14px', borderRadius: 9, background: 'rgba(255,255,255,.05)', border: '1px solid var(--border-color)', color: 'var(--text-main)', font: 'inherit' }} />
          <button className="btn-primary" type="submit" disabled={!configured || busy || !draft.trim()} aria-label="Send message"><Send size={16} /></button>
        </form>
      </div>
      <aside style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="glass-card" style={{ padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}><Target size={17} color="var(--accent-cyan)" /><h3 style={{ fontSize: '.98rem' }}>Active learning goals</h3></div>
          {goals.length === 0 ? <p style={{ color: 'var(--text-muted)', fontSize: '.85rem', lineHeight: 1.5 }}>Tell the assistant to save a goal and it will appear here.</p> : goals.map((goal) => (
            <div key={goal.id} style={{ padding: '10px 0', borderTop: '1px solid var(--border-color)' }}><p style={{ fontSize: '.87rem', lineHeight: 1.45 }}>{goal.goal}</p>{goal.deadline && <p style={{ marginTop: 5, color: 'var(--text-muted)', fontSize: '.76rem' }}>Target: {goal.deadline}</p>}</div>
          ))}
        </div>
        <div className="glass-card" style={{ padding: 18, color: 'var(--text-muted)', fontSize: '.82rem', lineHeight: 1.55 }}>
          <h3 style={{ color: 'var(--text-main)', fontSize: '.94rem', marginBottom: 8 }}>Tools it can use</h3>
          <p>Profile and mastery · Weak-concept diagnosis · CSV problem search · Attempt history · Problem lookup · Four-step remediation · Goal memory</p>
        </div>
        <div style={{ padding: '0 4px', color: 'var(--text-muted)', fontSize: '.76rem', lineHeight: 1.5 }}>
          Recent chat context and tool results used for an answer are sent to the configured model API. Conversation history and goals are stored in this app’s SQLite database.
        </div>
      </aside>
    </section>
  );
}

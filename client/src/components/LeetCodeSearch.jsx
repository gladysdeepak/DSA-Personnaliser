import React, { useEffect, useState } from 'react';
import { Search, ExternalLink, Database, LoaderCircle, Sparkles, Link2 } from 'lucide-react';

const API = 'http://localhost:5001';

export default function LeetCodeSearch({ onStartRemediation }) {
  const [query, setQuery] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [mode, setMode] = useState('semantic');
  const [results, setResults] = useState([]);
  const [embeddingStatus, setEmbeddingStatus] = useState(null);
  const [startingId, setStartingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    fetch(`${API}/api/embeddings/status`).then((response) => response.json())
      .then(setEmbeddingStatus).catch(() => setEmbeddingStatus(null));
  }, []);

  async function search(event) {
    event.preventDefault();
    if (!query.trim()) return;
    setLoading(true); setError(''); setSearched(true);
    try {
      const response = await fetch(`${API}/api/search/${mode === 'semantic' ? 'semantic' : 'hybrid'}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, difficulty, limit: 20 })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Search failed');
      setResults(data.results || []);
    } catch (err) {
      const needsEmbeddingSetup = err.message.includes('embeddings') || err.message.includes('OPENAI_API_KEY');
      const help = needsEmbeddingSetup && !err.message.includes('npm run embeddings:build')
        ? ' Add OPENAI_API_KEY to .env and run npm run embeddings:build.'
        : needsEmbeddingSetup ? ''
        : ' Make sure the backend is running.';
      setError(`${err.message}.${help}`);
      setResults([]);
    } finally { setLoading(false); }
  }

  async function startRemediation(problem) {
    setStartingId(problem.id); setError('');
    try {
      const response = await fetch(`${API}/api/leetcode/${problem.id}/remediation`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: 'local', reason: 'Flagged from LeetCode search for remediation' })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not build a remediation path.');
      onStartRemediation(problem.id, data.recommendation);
    } catch (err) { setError(err.message); }
    finally { setStartingId(null); }
  }

  return (
    <section style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div className="glass-card" style={{ padding: 28, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <Database color="var(--accent-cyan)" />
          <h2 style={{ fontSize: '1.5rem' }}>Explore the LeetCode problem corpus</h2>
        </div>
        <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>
          leetcode.csv is the primary problem source. Descriptions are optional; titles, topic tags, difficulty, and similar-question links remain searchable.
        </p>
        <p style={{ color: 'var(--text-muted)', fontSize: '.78rem', marginBottom: 14 }}>
          Embedding search sends the query and indexed problem text to the configured OpenAI API. Keyword search runs locally.
        </p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={() => setMode('semantic')} className={mode === 'semantic' ? 'btn-primary' : 'btn-secondary'}><Sparkles size={15} />Embedding search</button>
            <button type="button" onClick={() => setMode('lexical')} className={mode === 'lexical' ? 'btn-primary' : 'btn-secondary'}><Search size={15} />Keyword search</button>
          </div>
          <span style={{ fontSize: '.78rem', color: 'var(--text-muted)' }}>
            {embeddingStatus ? `Embedding index: ${embeddingStatus.indexed}/${embeddingStatus.corpus}` : 'Embedding index status unavailable'}
          </span>
        </div>
        <form onSubmit={search} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder={mode === 'semantic' ? 'Describe the technique or learning goal you have in mind' : 'Try a title, topic keyword, or problem ID'}
            aria-label="Search LeetCode problems"
            style={{ flex: '1 1 360px', minWidth: 220, padding: '13px 15px', borderRadius: 8, color: 'var(--text-main)', background: 'rgba(255,255,255,.05)', border: '1px solid var(--border-color)', font: 'inherit' }} />
          <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} aria-label="Filter by difficulty"
            style={{ padding: '0 14px', borderRadius: 8, color: 'var(--text-main)', background: '#171f2e', border: '1px solid var(--border-color)', font: 'inherit' }}>
            <option value="">Any difficulty</option><option>Easy</option><option>Medium</option><option>Hard</option>
          </select>
          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? <LoaderCircle size={17} /> : <Search size={17} />}{loading ? 'Searching' : 'Search'}
          </button>
        </form>
      </div>
      {error && <p role="alert" style={{ color: '#f87171', marginBottom: 16 }}>{error}</p>}
      {searched && !loading && !error && <p style={{ color: 'var(--text-muted)', marginBottom: 14 }}>{results.length ? `${results.length} matching problems` : 'No matching problems found.'}</p>}
      <div style={{ display: 'grid', gap: 12 }}>
        {results.map((problem) => (
          <article className="glass-card" key={problem.id} style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'flex-start' }}>
              <div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
                  <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>#{problem.id}</span>
                  <h3 style={{ fontSize: '1.08rem' }}>{problem.title}</h3>
                  <span className={`badge badge-${(problem.difficulty || '').toLowerCase()}`}>{problem.difficulty || 'Unspecified'}</span>
                  {Number.isFinite(problem.score) && <span style={{ color: 'var(--text-muted)', fontSize: '.76rem' }}>relevance {problem.score.toFixed(3)}</span>}
                </div>
                <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginTop: 12 }}>
                  {(problem.topic_tags || []).map((tag) => <span className="badge badge-topic" key={tag}>{tag}</span>)}
                </div>
                <p style={{ color: 'var(--text-muted)', lineHeight: 1.55, marginTop: 13 }}>
                  {problem.description ? `${problem.description.slice(0, 360)}${problem.description.length > 360 ? '…' : ''}` : 'No description is available; this record remains available through its title, tags, difficulty, and similar-question links.'}
                </p>
              </div>
              {problem.problem_url && <a href={problem.problem_url} target="_blank" rel="noreferrer" aria-label={`Open ${problem.title} on LeetCode`} style={{ color: 'var(--accent-cyan)' }}><ExternalLink size={18} /></a>}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border-color)' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '.78rem', display: 'inline-flex', gap: 6, alignItems: 'center' }}><Link2 size={14} />Build a path from this problem’s similar-question links</span>
              <button className="btn-secondary" type="button" onClick={() => startRemediation(problem)} disabled={startingId === problem.id}>
                {startingId === problem.id ? <LoaderCircle size={15} /> : <Link2 size={15} />}{startingId === problem.id ? 'Building path' : 'Flag for remediation'}
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

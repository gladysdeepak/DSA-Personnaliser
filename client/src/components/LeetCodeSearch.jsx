import React, { useState } from 'react';
import { Search, ExternalLink, Database, LoaderCircle } from 'lucide-react';

const API = 'http://localhost:5001';

export default function LeetCodeSearch() {
  const [query, setQuery] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  async function search(event) {
    event.preventDefault();
    if (!query.trim()) return;
    setLoading(true); setError(''); setSearched(true);
    try {
      const response = await fetch(`${API}/api/search/hybrid`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, difficulty, limit: 20 })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Search failed');
      setResults(data.results || []);
    } catch (err) {
      setError(`${err.message}. Make sure the backend is running.`);
      setResults([]);
    } finally { setLoading(false); }
  }

  return (
    <section style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div className="glass-card" style={{ padding: 28, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <Database color="var(--accent-cyan)" />
          <h2 style={{ fontSize: '1.5rem' }}>Explore 3,000 LeetCode problems</h2>
        </div>
        <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>
          Search titles, descriptions, and topic tags from the local leetcode.csv dataset. Exact problem IDs are supported.
        </p>
        <form onSubmit={search} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Try: variable sliding window, graph shortest path, or 76"
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
                </div>
                <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginTop: 12 }}>
                  {problem.topic_tags.map((tag) => <span className="badge badge-topic" key={tag}>{tag}</span>)}
                </div>
                <p style={{ color: 'var(--text-muted)', lineHeight: 1.55, marginTop: 13 }}>
                  {problem.description ? `${problem.description.slice(0, 360)}${problem.description.length > 360 ? '…' : ''}` : 'No description is available in the source dataset.'}
                </p>
              </div>
              {problem.problem_url && <a href={problem.problem_url} target="_blank" rel="noreferrer" aria-label={`Open ${problem.title} on LeetCode`} style={{ color: 'var(--accent-cyan)' }}><ExternalLink size={18} /></a>}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

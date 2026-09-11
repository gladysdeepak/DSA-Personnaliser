import React, { useEffect, useState } from 'react';
import { Brain, AlertTriangle, ArrowRight, ShieldAlert, CheckCircle } from 'lucide-react';

export default function ConceptMasteryMatrix({ onStartRemediation }) {
  const [concepts, setConcepts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  useEffect(() => {
    fetchConcepts();
  }, []);

  const fetchConcepts = async () => {
    try {
      setLoading(true);
      const res = await fetch('http://localhost:5001/api/concepts');
      const data = await res.json();
      setConcepts(data);
    } catch (err) {
      console.error('Failed to fetch concepts:', err);
    } finally {
      setLoading(false);
    }
  };

  const categories = ['ALL', ...Array.from(new Set(concepts.map((c) => c.category)))];

  const filteredConcepts = concepts.filter((c) => {
    if (selectedCategory !== 'ALL' && c.category !== selectedCategory) return false;
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Controls */}
      <div className="glass-card" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: '700', color: '#fff' }}>
            Latent Concept Mastery Matrix
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: '2px' }}>
            Tracking genuine concept transfer across 27 fundamental DSA reasoning primitives
          </p>
        </div>

        <select
          className="form-select"
          style={{ width: '220px' }}
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
        >
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat === 'ALL' ? 'All Categories' : cat}
            </option>
          ))}
        </select>
      </div>

      {/* Concept Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
        {filteredConcepts.map((c) => {
          const isWeak = !!c.is_weakness;
          const score = c.mastery_score || 100;

          return (
            <div
              key={c.id}
              className="glass-card glass-card-interactive"
              style={{
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                justify: 'space-between',
                gap: '14px',
                borderColor: isWeak ? 'rgba(244, 63, 94, 0.4)' : 'var(--border-color)'
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="badge badge-topic">{c.category}</span>
                  {isWeak ? (
                    <span className="badge badge-hard" style={{ background: 'rgba(244, 63, 94, 0.2)' }}>
                      <ShieldAlert size={12} /> Weakness Flagged
                    </span>
                  ) : score >= 80 ? (
                    <span className="badge badge-easy">
                      <CheckCircle size={12} /> Mastered
                    </span>
                  ) : (
                    <span className="badge badge-medium">Developing</span>
                  )}
                </div>

                <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#fff' }}>
                  {c.title}
                </h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                  {c.description}
                </p>
              </div>

              {/* Progress & Stats */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '6px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Estimated Mastery</span>
                    <span style={{ fontWeight: '700', color: isWeak ? '#f43f5e' : '#34d399' }}>
                      {score}%
                    </span>
                  </div>
                  <div className="progress-track">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${score}%`,
                        background: isWeak ? 'linear-gradient(90deg, #f43f5e, #fbbf24)' : 'linear-gradient(90deg, #6366f1, #34d399)'
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', background: 'rgba(10, 13, 20, 0.5)', padding: '8px 10px', borderRadius: '4px' }}>
                  <span>Attempts: {c.total_attempts || 0}</span>
                  <span>Failed: {c.failed_count || 0}</span>
                  <span>Solution-Viewed: {c.solution_count || 0}</span>
                </div>

                <button
                  className="btn-primary"
                  style={{ width: '100%', justifyContent: 'center', marginTop: '4px', fontSize: '0.85rem' }}
                  onClick={() => onStartRemediation(c.id)}
                >
                  Remediate & Test Transfer <ArrowRight size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

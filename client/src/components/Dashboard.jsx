import React, { useEffect, useState } from 'react';
import { Brain, AlertCircle, CheckCircle2, Target, ArrowRight, ShieldAlert, Sparkles, Activity } from 'lucide-react';

export default function Dashboard({ onStartRemediation, onNavigateToGraph }) {
  const [profile, setProfile] = useState(null);
  const [diagnostics, setDiagnostics] = useState([]);
  const [recommendation, setRecommendation] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [profRes, diagRes, recRes] = await Promise.all([
        fetch('http://localhost:5001/api/profile'),
        fetch('http://localhost:5001/api/diagnostics'),
        fetch('http://localhost:5001/api/recommendation')
      ]);

      const profData = await profRes.json();
      const diagData = await diagRes.json();
      const recData = await recRes.json();

      setProfile(profData);
      setDiagnostics(diagData);
      setRecommendation(recData);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <Activity className="animate-spin" size={32} style={{ marginBottom: '12px', color: 'var(--accent-primary)' }} />
        <p>Analyzing knowledge graph & computing latent diagnosis...</p>
      </div>
    );
  }

  const { summary = {}, categoryProfile = [] } = profile || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Hero Header */}
      <div
        className="glass-card"
        style={{
          padding: '28px',
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(6, 182, 212, 0.08) 100%)',
          border: '1px solid rgba(99, 102, 241, 0.25)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-cyan)', fontWeight: '600', fontSize: '0.85rem', marginBottom: '6px' }}>
            <Sparkles size={16} />
            INTELLIGENT CONCEPT DIAGNOSIS ENGINE
          </div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: '800', marginBottom: '8px' }}>
            NeetCode 150 Mastery & Transfer Analysis
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', maxWidth: '650px' }}>
            Your solving behavior is mapped across 150 problem nodes and 27 latent reasoning primitives to identify underlying failure patterns rather than memorized code.
          </p>
        </div>

        <button className="btn-primary" onClick={onNavigateToGraph}>
          <Brain size={18} />
          Explore Knowledge Graph
        </button>
      </div>

      {/* Top Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <div className="glass-card" style={{ padding: '20px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>
            Total Attempts
          </span>
          <div style={{ fontSize: '2rem', fontWeight: '800', marginTop: '6px', color: '#fff' }}>
            {summary.totalAttempts || 0}
          </div>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>NeetCode 150 solving log</span>
        </div>

        <div className="glass-card" style={{ padding: '20px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>
            Independent Solves
          </span>
          <div style={{ fontSize: '2rem', fontWeight: '800', marginTop: '6px', color: '#34d399' }}>
            {summary.independentSolves || 0}
          </div>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Derived without hints or solutions</span>
        </div>

        <div className="glass-card" style={{ padding: '20px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>
            Detected Weak Concepts
          </span>
          <div style={{ fontSize: '2rem', fontWeight: '800', marginTop: '6px', color: diagnostics.length > 0 ? '#f43f5e' : '#34d399' }}>
            {diagnostics.length}
          </div>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Latent reasoning bottlenecks</span>
        </div>

        <div className="glass-card" style={{ padding: '20px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>
            Transfer Readiness Score
          </span>
          <div style={{ fontSize: '2rem', fontWeight: '800', marginTop: '6px', color: '#818cf8' }}>
            {summary.transferReadiness}%
          </div>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Unseen problem derivation probability</span>
        </div>
      </div>

      {/* Main Grid: Diagnostics & Recommendation */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Diagnostic Weaknesses Alert Panel */}
        <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ShieldAlert size={22} color="var(--accent-rose)" />
              <h2 style={{ fontSize: '1.15rem', fontWeight: '700' }}>Latent Concept Weaknesses</h2>
            </div>
            <span className="badge badge-hard">{diagnostics.length} Active</span>
          </div>

          {diagnostics.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', background: 'rgba(16, 185, 129, 0.05)', borderRadius: 'var(--radius-sm)', border: '1px dashed rgba(16, 185, 129, 0.2)' }}>
              <CheckCircle2 size={32} color="#34d399" style={{ margin: '0 auto 8px' }} />
              <p style={{ fontWeight: '600', color: '#34d399' }}>No Conceptual Weaknesses Detected!</p>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Log more problem attempts to trigger latent graph pattern analysis.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {diagnostics.map((diag) => (
                <div
                  key={diag.concept_id}
                  style={{
                    padding: '16px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(244, 63, 94, 0.08)',
                    border: '1px solid rgba(244, 63, 94, 0.25)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: '700', color: '#f87171', fontSize: '0.95rem' }}>
                      {diag.title}
                    </span>
                    <span className="badge" style={{ background: 'rgba(244, 63, 94, 0.2)', color: '#f43f5e' }}>
                      Mastery: {diag.mastery_score}%
                    </span>
                  </div>
                  <p style={{ fontSize: '0.84rem', color: 'var(--text-main)', lineHeight: '1.4' }}>
                    {diag.diagnosis}
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      Category: {diag.category}
                    </span>
                    <button
                      className="btn-secondary"
                      style={{ padding: '4px 10px', fontSize: '0.78rem', border: '1px solid rgba(244, 63, 94, 0.4)' }}
                      onClick={() => onStartRemediation(diag.concept_id)}
                    >
                      Remediate Concept <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Next Recommended Practice Action Card */}
        <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Target size={22} color="var(--accent-cyan)" />
            <h2 style={{ fontSize: '1.15rem', fontWeight: '700' }}>Recommended Next Action</h2>
          </div>

          {recommendation && recommendation.concept ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%', justifyContent: 'space-between' }}>
              <div style={{ padding: '16px', background: 'rgba(6, 182, 212, 0.08)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(6, 182, 212, 0.25)' }}>
                <span className="badge badge-topic" style={{ marginBottom: '8px' }}>
                  Target: {recommendation.concept.category}
                </span>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#fff', marginBottom: '6px' }}>
                  Target Concept: {recommendation.concept.title}
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                  Targeted 4-step sequence designed to repair failure points in baseline problem formulation and test unseen concept transfer.
                </p>
              </div>

              {/* Sequence Preview */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Sequence Roadmap
                </span>
                {recommendation.remediation_steps.map((step) => (
                  <div
                    key={step.step}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(255, 255, 255, 0.03)',
                      fontSize: '0.83rem'
                    }}
                  >
                    <span
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        background: 'var(--accent-primary)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.7rem',
                        fontWeight: '700'
                      }}
                    >
                      {step.step}
                    </span>
                    <span style={{ fontWeight: '500', color: '#fff' }}>{step.title}</span>
                  </div>
                ))}
              </div>

              <button
                className="btn-primary"
                style={{ width: '100%', justifyContent: 'center', marginTop: '10px' }}
                onClick={() => onStartRemediation(recommendation.concept.id)}
              >
                Launch 4-Step Remediation Flow <ArrowRight size={16} />
              </button>
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Log attempts to receive personalized practice recommendations.
            </p>
          )}
        </div>
      </div>

      {/* Algorithmic Difficulty Fingerprint Bars */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: '700', marginBottom: '16px' }}>
          Algorithmic Difficulty Fingerprint by Topic
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          {categoryProfile.map((cat) => (
            <div key={cat.category} style={{ background: 'rgba(10, 13, 20, 0.6)', padding: '14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.85rem' }}>
                <span style={{ fontWeight: '600', color: '#fff' }}>{cat.category}</span>
                <span style={{ color: cat.average_mastery < 65 ? '#f43f5e' : '#34d399', fontWeight: '700' }}>
                  {cat.average_mastery}%
                </span>
              </div>
              <div className="progress-track">
                <div
                  className="progress-fill"
                  style={{
                    width: `${cat.average_mastery}%`,
                    background: cat.average_mastery < 65 ? 'linear-gradient(90deg, #f43f5e, #fbbf24)' : 'linear-gradient(90deg, #6366f1, #34d399)'
                  }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <span>{cat.concept_count} Concepts</span>
                {cat.weakness_count > 0 && <span style={{ color: '#f87171' }}>{cat.weakness_count} Weaknesses</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

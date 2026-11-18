import React, { useEffect, useState } from 'react';
import { BookOpen, CheckCircle, ArrowRight, ArrowLeft, Target, Sparkles, ExternalLink, Lightbulb, Link2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import SimilarProblemGraph from './SimilarProblemGraph';

export default function RemediationFlow({ conceptId, leetcodeProblemId, initialRecommendation, onLogAttempt, onBackToDashboard }) {
  const [recommendation, setRecommendation] = useState(null);
  const [activeStep, setActiveStep] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (initialRecommendation) {
      setRecommendation(initialRecommendation);
      setActiveStep(1);
      setLoading(false);
      return;
    }
    fetchRecommendation();
  }, [conceptId, leetcodeProblemId, initialRecommendation]);

  const fetchRecommendation = async () => {
    try {
      setLoading(true);
      const url = leetcodeProblemId
        ? `http://localhost:5001/api/leetcode/${leetcodeProblemId}/remediation`
        : conceptId ? `http://localhost:5001/api/recommendation?concept_id=${conceptId}` : 'http://localhost:5001/api/recommendation';
      const res = await fetch(url);
      const data = await res.json();
      setRecommendation(data.recommendation || data);
      setActiveStep(1);
    } catch (err) {
      console.error('Failed to fetch recommendation sequence:', err);
    } finally {
      setLoading(false);
    }
  };

  const triggerCelebration = () => {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 }
    });
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <p>Loading targeted 4-step remediation sequence...</p>
      </div>
    );
  }

  if (!recommendation) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p>No recommendation sequence found.</p>
        <button className="btn-secondary" onClick={onBackToDashboard} style={{ marginTop: '16px' }}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  const { concept, remediation_steps } = recommendation;
  const currentStepData = remediation_steps.find((s) => s.step === activeStep);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Sequence Header */}
      <div className="glass-card" style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <button
            onClick={onBackToDashboard}
            style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}
          >
            <ArrowLeft size={16} /> Back to Dashboard
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="badge badge-topic">{concept.category}</span>
            <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#fff' }}>
              Remediation Sequence: {concept.title}
            </h2>
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Target Mastery</span>
          <div style={{ fontSize: '1.2rem', fontWeight: '800', color: concept.is_weakness ? '#f43f5e' : '#34d399' }}>
            {concept.mastery_score}%
          </div>
        </div>
      </div>

      {recommendation.source === 'leetcode.csv' && (
        <div className="glass-card" style={{ padding: '16px 20px', borderColor: 'rgba(6, 182, 212, .25)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--accent-cyan)', marginBottom: 10 }}>
            <Link2 size={17} /><strong style={{ fontSize: '.9rem' }}>Similar-problem graph from leetcode.csv</strong>
          </div>
          <p style={{ fontSize: '.82rem', color: 'var(--text-muted)', marginBottom: 10 }}>
            {recommendation.flagged_problem.title} connects to these related problems. The path below uses these edges for warm-up and transfer practice.
          </p>
          <SimilarProblemGraph problemId={recommendation.flagged_problem.id} />
        </div>
      )}

      {/* Step Stepper Tabs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
        {remediation_steps.map((s) => {
          const isActive = s.step === activeStep;
          return (
            <button
              key={s.step}
              onClick={() => setActiveStep(s.step)}
              style={{
                padding: '14px',
                borderRadius: 'var(--radius-sm)',
                border: isActive ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                background: isActive ? 'rgba(99, 102, 241, 0.15)' : 'rgba(22, 30, 46, 0.6)',
                color: isActive ? '#fff' : 'var(--text-muted)',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}
            >
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: isActive ? 'var(--accent-primary)' : 'rgba(255, 255, 255, 0.1)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.8rem',
                  fontWeight: '700'
                }}
              >
                {s.step}
              </div>
              <div>
                <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', display: 'block', color: 'var(--text-muted)' }}>
                  {s.type}
                </span>
                <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>
                  {s.step === 1 ? 'Concept Primer' : s.step === 2 ? 'Warm-up Baseline' : s.step === 3 ? 'Target Problem' : 'Transfer Test'}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Step Content */}
      <div className="glass-card" style={{ padding: '28px', minHeight: '400px' }}>
        {activeStep === 1 && currentStepData.data && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--accent-cyan)' }}>
              <Lightbulb size={24} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: '700' }}>
                Conceptual Primer & Invariant Reasoning Rules
              </h3>
            </div>

            <p style={{ fontSize: '0.95rem', color: 'var(--text-main)', lineHeight: '1.6' }}>
              {currentStepData.data.overview}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '10px' }}>
              {/* Key Invariants */}
              <div style={{ background: 'rgba(16, 185, 129, 0.06)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '18px', borderRadius: 'var(--radius-sm)' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#34d399', marginBottom: '10px' }}>
                  Core Reasoning Invariants
                </h4>
                <ul style={{ paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.88rem', color: 'var(--text-main)' }}>
                  {currentStepData.data.key_invariants.map((inv, idx) => (
                    <li key={idx}>{inv}</li>
                  ))}
                </ul>
              </div>

              {/* Common Pitfalls */}
              <div style={{ background: 'rgba(244, 63, 94, 0.06)', border: '1px solid rgba(244, 63, 94, 0.2)', padding: '18px', borderRadius: 'var(--radius-sm)' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#f87171', marginBottom: '10px' }}>
                  Common Pitfalls & Failure Modes
                </h4>
                <ul style={{ paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.88rem', color: 'var(--text-main)' }}>
                  {currentStepData.data.common_pitfalls.map((pit, idx) => (
                    <li key={idx}>{pit}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button className="btn-primary" onClick={() => setActiveStep(2)}>
                Proceed to Step 2: Warm-up Practice <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {activeStep > 1 && currentStepData.problem && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span className="badge badge-topic" style={{ marginBottom: '6px' }}>
                  {currentStepData.problem.topic}
                </span>
                <h3 style={{ fontSize: '1.3rem', fontWeight: '800', color: '#fff' }}>
                  {currentStepData.problem.title}
                </h3>
              </div>
              <span className={`badge badge-${currentStepData.problem.difficulty.toLowerCase()}`}>
                {currentStepData.problem.difficulty}
              </span>
            </div>

            <div style={{ background: 'rgba(10, 13, 20, 0.6)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Algorithmic Pattern</span>
                <strong style={{ color: '#fff', fontSize: '0.95rem' }}>{currentStepData.problem.pattern}</strong>
              </div>

              {currentStepData.problem.leetcode_url && (
                <a
                  href={currentStepData.problem.leetcode_url}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-secondary"
                  style={{ fontSize: '0.85rem' }}
                >
                  Solve on LeetCode <ExternalLink size={14} />
                </a>
              )}
            </div>

            {/* Instruction Box */}
            <div style={{ padding: '16px', background: 'rgba(99, 102, 241, 0.08)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(99, 102, 241, 0.25)' }}>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>
                {activeStep === 2 && "Solve this warm-up problem to establish the core pattern baseline without pressure."}
                {activeStep === 3 && "Re-tackle this problem. Ensure you derive the invariant step-by-step rather than reproducing code from memory."}
                {activeStep === 4 && "This unseen transfer problem shares the identical concept node. Solve it independently to prove concept transfer mastery!"}
              </p>
            </div>

            {/* Action Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' }}>
              <button className="btn-secondary" onClick={() => setActiveStep(Math.max(1, activeStep - 1))}>
                <ArrowLeft size={16} /> Previous Step
              </button>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  className="btn-secondary"
                  onClick={() => onLogAttempt(currentStepData.problem)}
                >
                  Log Attempt Outcome
                </button>

                {activeStep < 4 ? (
                  <button className="btn-primary" onClick={() => setActiveStep(activeStep + 1)}>
                    Next Step <ArrowRight size={16} />
                  </button>
                ) : (
                  <button
                    className="btn-primary"
                    style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
                    onClick={() => {
                      triggerCelebration();
                      onBackToDashboard();
                    }}
                  >
                    Complete Sequence & Update Diagnosis <Sparkles size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

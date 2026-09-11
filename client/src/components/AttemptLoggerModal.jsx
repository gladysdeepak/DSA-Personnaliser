import React, { useState } from 'react';
import { X, CheckCircle, AlertTriangle, HelpCircle, Clock, BookOpen, Brain } from 'lucide-react';

export default function AttemptLoggerModal({ problem, onClose, onAttemptLogged }) {
  const [status, setStatus] = useState('Solved Independently');
  const [timeSpent, setTimeSpent] = useState(20);
  const [hintUsed, setHintUsed] = useState(false);
  const [solutionViewed, setSolutionViewed] = useState(false);
  const [memorized, setMemorized] = useState(false);
  const [difficultyRating, setDifficultyRating] = useState('Fair');
  const [selectedFailurePoints, setSelectedFailurePoints] = useState([]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const failurePointOptions = [
    "Couldn't identify initial algorithm / pattern",
    "Struggled to state or maintain the core invariant",
    "Incorrect boundary or edge case logic",
    "Difficulty formulating DP state transitions",
    "Knew approach but struggled with code implementation/syntax",
    "Over-relied on memorized code structure"
  ];

  const handleToggleFailurePoint = (point) => {
    if (selectedFailurePoints.includes(point)) {
      setSelectedFailurePoints(selectedFailurePoints.filter((p) => p !== point));
    } else {
      setSelectedFailurePoints([...selectedFailurePoints, point]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    const payload = {
      problem_id: problem.id,
      status,
      time_spent_mins: Number(timeSpent),
      hint_used: hintUsed ? 1 : 0,
      solution_viewed: solutionViewed ? 1 : 0,
      memorized: memorized ? 1 : 0,
      difficulty_rating: difficultyRating,
      failure_reasons: selectedFailurePoints,
      notes
    };

    try {
      const res = await fetch('http://localhost:5001/api/attempts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        onAttemptLogged();
        onClose();
      }
    } catch (err) {
      console.error('Failed to log attempt:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <span className="badge badge-topic">{problem.topic}</span>
            <h2 style={{ fontSize: '1.3rem', marginTop: '6px', fontWeight: '700' }}>
              Log Attempt: {problem.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Outcome Status */}
          <div className="form-group">
            <label className="form-label">Attempt Outcome</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {[
                { id: 'Solved Independently', label: 'Solved Independently', color: '#10b981' },
                { id: 'Solved with Hint', label: 'Solved with Hint', color: '#f59e0b' },
                { id: 'Solved after Solution View', label: 'Solution Viewed & Solved', color: '#8b5cf6' },
                { id: 'Memorized', label: 'Memorized Approach', color: '#ec4899' },
                { id: 'Failed', label: 'Failed / Unable to Solve', color: '#f43f5e' }
              ].map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => setStatus(item.id)}
                  style={{
                    padding: '10px',
                    borderRadius: 'var(--radius-sm)',
                    border: status === item.id ? `2px solid ${item.color}` : '1px solid var(--border-color)',
                    background: status === item.id ? `${item.color}22` : 'rgba(10, 13, 20, 0.6)',
                    color: status === item.id ? '#fff' : 'var(--text-muted)',
                    fontWeight: status === item.id ? '600' : '400',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Time & Checks */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '18px' }}>
            <div>
              <label className="form-label">Time Spent (Minutes)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={16} color="var(--text-muted)" />
                <input
                  type="number"
                  className="form-input"
                  value={timeSpent}
                  onChange={(e) => setTimeSpent(e.target.value)}
                  min="1"
                  max="300"
                />
              </div>
            </div>

            <div>
              <label className="form-label">Perceived Difficulty</label>
              <select
                className="form-select"
                value={difficultyRating}
                onChange={(e) => setDifficultyRating(e.target.value)}
              >
                <option value="Easy">Easy / Comfortable</option>
                <option value="Fair">Fair / Standard</option>
                <option value="Challenging">Challenging / Tricky</option>
                <option value="Overwhelming">Overwhelming / Stuck</option>
              </select>
            </div>
          </div>

          {/* Assistance Flags */}
          <div className="form-group" style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
            <label className="form-label" style={{ marginBottom: '10px' }}>Assistance & Derivation Check</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={hintUsed}
                  onChange={(e) => setHintUsed(e.target.checked)}
                />
                Used Hints / Editorial Hints
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={solutionViewed}
                  onChange={(e) => setSolutionViewed(e.target.checked)}
                />
                Viewed Full Solution / Code Walkthrough
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={memorized}
                  onChange={(e) => setMemorized(e.target.checked)}
                />
                Felt like I recalled code pattern without full derivation
              </label>
            </div>
          </div>

          {/* Failure Reasons Checklist */}
          {(status === 'Failed' || solutionViewed || hintUsed) && (
            <div className="form-group">
              <label className="form-label" style={{ color: 'var(--accent-amber)' }}>
                What was the main source of difficulty?
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {failurePointOptions.map((pt) => {
                  const isChecked = selectedFailurePoints.includes(pt);
                  return (
                    <label
                      key={pt}
                      onClick={() => handleToggleFailurePoint(pt)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '0.82rem',
                        padding: '6px 10px',
                        borderRadius: '4px',
                        background: isChecked ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                        border: isChecked ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid transparent',
                        color: isChecked ? '#fbbf24' : 'var(--text-muted)',
                        cursor: 'pointer'
                      }}
                    >
                      <input type="checkbox" checked={isChecked} readOnly />
                      {pt}
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Reflections / Notes */}
          <div className="form-group">
            <label className="form-label">Personal Reflection & Notes</label>
            <textarea
              className="form-textarea"
              rows="3"
              placeholder="e.g. Remembered to shrink sliding window when frequency of distinct chars > K..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Updating Graph...' : 'Log Attempt & Update Diagnosis'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

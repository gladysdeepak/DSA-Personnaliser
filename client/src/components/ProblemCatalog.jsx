import React, { useEffect, useState } from 'react';
import { Search, Filter, ExternalLink, CheckCircle, Clock, AlertTriangle, PlusCircle } from 'lucide-react';

export default function ProblemCatalog({ onLogAttempt }) {
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('ALL');
  const [selectedDifficulty, setSelectedDifficulty] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  useEffect(() => {
    fetchProblems();
  }, []);

  const fetchProblems = async () => {
    try {
      setLoading(true);
      const res = await fetch('http://localhost:5001/api/problems');
      const data = await res.json();
      setProblems(data);
    } catch (err) {
      console.error('Failed to fetch problems:', err);
    } finally {
      setLoading(false);
    }
  };

  const topics = ['ALL', ...Array.from(new Set(problems.map((p) => p.topic)))];

  const filteredProblems = problems.filter((p) => {
    if (selectedTopic !== 'ALL' && p.topic !== selectedTopic) return false;
    if (selectedDifficulty !== 'ALL' && p.difficulty !== selectedDifficulty) return false;
    if (selectedStatus !== 'ALL' && p.userStatus !== selectedStatus) return false;
    if (searchQuery && !p.title.toLowerCase().includes(searchQuery.toLowerCase()) && !p.pattern.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header & Filter Controls */}
      <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: '700', color: '#fff' }}>
              NeetCode 150 Problem Catalog
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: '2px' }}>
              Showing {filteredProblems.length} of {problems.length} problems tagged with latent reasoning concepts
            </p>
          </div>
        </div>

        {/* Filter bar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '36px' }}
              placeholder="Search problem or pattern..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <select
            className="form-select"
            value={selectedTopic}
            onChange={(e) => setSelectedTopic(e.target.value)}
          >
            {topics.map((t) => (
              <option key={t} value={t}>
                {t === 'ALL' ? 'All Topics (18)' : t}
              </option>
            ))}
          </select>

          <select
            className="form-select"
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value)}
          >
            <option value="ALL">All Difficulties</option>
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
          </select>

          <select
            className="form-select"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="ALL">All Statuses</option>
            <option value="Solved Independently">Solved Independently</option>
            <option value="Solved with Hint">Solved with Hint</option>
            <option value="Solved after Solution View">Solution Viewed</option>
            <option value="Failed">Failed / Struggled</option>
            <option value="Unattempted">Unattempted</option>
          </select>
        </div>
      </div>

      {/* Problems Table */}
      <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ background: 'rgba(255, 255, 255, 0.04)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase' }}>
              <th style={{ padding: '14px 20px' }}>Problem</th>
              <th style={{ padding: '14px 16px' }}>Topic & Pattern</th>
              <th style={{ padding: '14px 16px' }}>Difficulty</th>
              <th style={{ padding: '14px 16px' }}>Latent Concept</th>
              <th style={{ padding: '14px 16px' }}>Status</th>
              <th style={{ padding: '14px 20px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredProblems.map((prob) => {
              let statusBadgeClass = 'badge-status-unattempted';
              if (prob.userStatus === 'Solved Independently') statusBadgeClass = 'badge-status-solved';
              else if (prob.userStatus === 'Solved with Hint' || prob.userStatus === 'Solved after Solution View') statusBadgeClass = 'badge-status-assisted';
              else if (prob.userStatus === 'Failed') statusBadgeClass = 'badge-status-failed';

              return (
                <tr
                  key={prob.id}
                  style={{
                    borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                    transition: 'background 0.2s'
                  }}
                  className="table-row-hover"
                >
                  <td style={{ padding: '14px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: '700', color: '#fff' }}>{prob.title}</span>
                      {prob.leetcode_url && (
                        <a href={prob.leetcode_url} target="_blank" rel="noreferrer" style={{ color: 'var(--text-muted)' }}>
                          <ExternalLink size={14} />
                        </a>
                      )}
                    </div>
                  </td>

                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '0.82rem', color: 'var(--accent-cyan)', fontWeight: '600' }}>
                        {prob.topic}
                      </span>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {prob.pattern}
                      </span>
                    </div>
                  </td>

                  <td style={{ padding: '14px 16px' }}>
                    <span className={`badge badge-${prob.difficulty.toLowerCase()}`}>
                      {prob.difficulty}
                    </span>
                  </td>

                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {prob.concepts && prob.concepts.map((c) => (
                        <span key={c.id} className="badge badge-concept" style={{ fontSize: '0.7rem' }}>
                          {c.title}
                        </span>
                      ))}
                    </div>
                  </td>

                  <td style={{ padding: '14px 16px' }}>
                    <span className={`badge ${statusBadgeClass}`}>
                      {prob.userStatus}
                    </span>
                  </td>

                  <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                    <button
                      className="btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                      onClick={() => onLogAttempt(prob)}
                    >
                      <PlusCircle size={14} /> Log Attempt
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

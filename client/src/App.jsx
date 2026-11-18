import React, { useState } from 'react';
import './App.css';
import { LayoutDashboard, Network, ListChecks, Brain, Target, Search, Sparkles } from 'lucide-react';
import Dashboard from './components/Dashboard';
import GraphExplorer from './components/GraphExplorer';
import ProblemCatalog from './components/ProblemCatalog';
import ConceptMasteryMatrix from './components/ConceptMasteryMatrix';
import RemediationFlow from './components/RemediationFlow';
import AttemptLoggerModal from './components/AttemptLoggerModal';
import LeetCodeSearch from './components/LeetCodeSearch';
import LearningAssistant from './components/LearningAssistant';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [targetConceptId, setTargetConceptId] = useState(null);
  const [loggerProblem, setLoggerProblem] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleStartRemediation = (conceptId) => {
    setTargetConceptId(conceptId);
    setActiveTab('remediation');
  };

  const handleLogAttempt = (problem) => {
    setLoggerProblem(problem);
  };

  const handleAttemptLogged = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Navbar */}
      <header
        style={{
          height: '64px',
          background: 'rgba(18, 24, 36, 0.85)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          position: 'sticky',
          top: 0,
          zIndex: 100
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: 'var(--radius-sm)',
              background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-cyan) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff'
            }}
          >
            <Brain size={20} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#fff', letterSpacing: '-0.02em' }}>
              DSA Personaliser
            </h1>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginTop: '-2px' }}>
              Concept Mastery & Diagnostic Platform
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav style={{ display: 'flex', gap: '8px' }}>
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'graph', label: 'Knowledge Graph', icon: Network },
            { id: 'catalog', label: 'NeetCode 150', icon: ListChecks },
            { id: 'search', label: 'LeetCode Search', icon: Search },
            { id: 'assistant', label: 'AI Coach', icon: Sparkles },
            { id: 'concepts', label: 'Concept Matrix', icon: Brain },
            { id: 'remediation', label: 'Remediation Path', icon: Target }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '8px 14px',
                  borderRadius: 'var(--radius-sm)',
                  border: isActive ? '1px solid var(--accent-primary-glow)' : '1px solid transparent',
                  background: isActive ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                  color: isActive ? '#fff' : 'var(--text-muted)',
                  fontSize: '0.85rem',
                  fontWeight: isActive ? '600' : '500',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease'
                }}
              >
                <Icon size={16} color={isActive ? 'var(--accent-primary)' : 'var(--text-muted)'} />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </header>

      {/* Main App Workspace */}
      <main style={{ flex: 1, padding: '24px', maxWidth: '1400px', width: '100%', margin: '0 auto' }}>
        {activeTab === 'dashboard' && (
          <Dashboard
            key={refreshKey}
            onStartRemediation={handleStartRemediation}
            onNavigateToGraph={() => setActiveTab('graph')}
          />
        )}

        {activeTab === 'graph' && (
          <GraphExplorer
            key={refreshKey}
            onLogAttempt={handleLogAttempt}
            onStartRemediation={handleStartRemediation}
          />
        )}

        {activeTab === 'catalog' && (
          <ProblemCatalog
            key={refreshKey}
            onLogAttempt={handleLogAttempt}
          />
        )}

        {activeTab === 'search' && <LeetCodeSearch />}

        {activeTab === 'assistant' && <LearningAssistant />}

        {activeTab === 'concepts' && (
          <ConceptMasteryMatrix
            key={refreshKey}
            onStartRemediation={handleStartRemediation}
          />
        )}

        {activeTab === 'remediation' && (
          <RemediationFlow
            key={refreshKey}
            conceptId={targetConceptId}
            onLogAttempt={handleLogAttempt}
            onBackToDashboard={() => setActiveTab('dashboard')}
          />
        )}
      </main>

      {/* Attempt Logger Modal */}
      {loggerProblem && (
        <AttemptLoggerModal
          problem={loggerProblem}
          onClose={() => setLoggerProblem(null)}
          onAttemptLogged={handleAttemptLogged}
        />
      )}
    </div>
  );
}

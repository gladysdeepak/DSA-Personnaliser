import React, { useEffect, useRef, useState } from 'react';
import { Network } from 'vis-network/standalone';
import { Layers, Flame, Search, Filter, RefreshCw, ChevronRight, X, ExternalLink, Eye, EyeOff, Sparkles } from 'lucide-react';

export default function GraphExplorer({ onLogAttempt, onStartRemediation }) {
  const containerRef = useRef(null);
  const networkRef = useRef(null);
  const [graphData, setGraphData] = useState({ nodes: [], edges: [] });
  const [selectedNode, setSelectedNode] = useState(null);
  const [heatmapMode, setHeatmapMode] = useState(true);
  const [showEdgeLabels, setShowEdgeLabels] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [selectedTopic, setSelectedTopic] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGraph();
  }, []);

  const fetchGraph = async () => {
    try {
      setLoading(true);
      const res = await fetch('http://localhost:5001/api/graph');
      const data = await res.json();
      setGraphData(data);
    } catch (err) {
      console.error('Failed to fetch graph data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Get list of topics for dropdown
  const topics = ['ALL', ...Array.from(new Set(graphData.nodes.filter((n) => n.type === 'problem' && n.topic).map((n) => n.topic)))];

  useEffect(() => {
    if (!containerRef.current || graphData.nodes.length === 0) return;

    // Filter nodes based on user selections
    let filteredNodes = graphData.nodes.filter((n) => {
      if (filterType !== 'all' && n.type !== filterType) return false;
      if (selectedTopic !== 'ALL') {
        if (n.type === 'problem' && n.topic !== selectedTopic) return false;
        if (n.type === 'topic' && n.label !== selectedTopic) return false;
        if (n.type === 'concept' && n.category !== selectedTopic) return false;
      }
      if (searchQuery && !n.label.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });

    const nodeIds = new Set(filteredNodes.map((n) => n.id));
    const filteredEdges = graphData.edges.filter((e) => nodeIds.has(e.from) && nodeIds.has(e.to));

    // Vis.js Network styling options
    const formattedNodes = filteredNodes.map((n) => {
      let color = { background: '#3b82f6', border: '#1d4ed8' };
      let shape = 'dot';
      let size = 16;

      if (n.type === 'concept') {
        shape = 'diamond';
        size = 22;
        if (heatmapMode && n.is_weakness) {
          color = { background: '#f43f5e', border: '#9f1239' }; // Red weakness glow
        } else if (n.mastery_score < 70) {
          color = { background: '#f59e0b', border: '#b45309' }; // Amber
        } else {
          color = { background: '#a855f7', border: '#6b21a8' }; // Purple concept
        }
      } else if (n.type === 'problem') {
        shape = 'dot';
        size = 14;
        if (n.statusState === 'solved') {
          color = { background: '#10b981', border: '#047857' };
        } else if (n.statusState === 'assisted') {
          color = { background: '#f59e0b', border: '#b45309' };
        } else if (n.statusState === 'failed') {
          color = { background: '#f43f5e', border: '#9f1239' };
        } else {
          color = { background: '#4b5563', border: '#1f2937' };
        }
      } else if (n.type === 'topic') {
        shape = 'box';
        size = 20;
        color = { background: '#06b6d4', border: '#0e7490' };
      }

      return {
        id: n.id,
        label: n.label,
        shape,
        size,
        color,
        font: { color: '#ffffff', size: 11, face: 'Outfit', strokeWidth: 3, strokeColor: '#0a0d14' },
        raw: n
      };
    });

    const formattedEdges = filteredEdges.map((e) => {
      let color = { color: 'rgba(255, 255, 255, 0.15)', highlight: '#818cf8' };
      let dashes = false;
      let width = 1;
      let arrows = undefined;

      if (e.type === 'concept_req') {
        color = { color: 'rgba(168, 85, 247, 0.35)', highlight: '#c084fc' };
        dashes = [4, 4];
        width = 1.5;
      } else if (e.type === 'prerequisite') {
        color = { color: 'rgba(245, 158, 11, 0.45)', highlight: '#fbbf24' };
        arrows = { to: { enabled: true, scaleFactor: 0.5 } };
        width = 1.8;
      } else if (e.type === 'similar') {
        color = { color: 'rgba(156, 163, 175, 0.18)', highlight: '#9ca3af' };
        dashes = [2, 4];
      } else if (e.type === 'topic_link') {
        color = { color: 'rgba(6, 182, 212, 0.25)', highlight: '#22d3ee' };
      }

      return {
        from: e.from,
        to: e.to,
        label: showEdgeLabels ? e.label : undefined,
        font: showEdgeLabels ? { color: '#9ca3af', size: 9, strokeWidth: 2, strokeColor: '#0a0d14' } : undefined,
        color,
        dashes,
        width,
        arrows
      };
    });

    const options = {
      nodes: {
        borderWidth: 2,
        shadow: true
      },
      edges: {
        smooth: { type: 'continuous' }
      },
      physics: {
        barnesHut: {
          gravitationalConstant: -10000,
          centralGravity: 0.25,
          springLength: 140,
          springConstant: 0.03
        },
        stabilization: { iterations: 120 }
      },
      interaction: {
        hover: true,
        tooltipDelay: 150,
        zoomView: true
      }
    };

    const network = new Network(containerRef.current, { nodes: formattedNodes, edges: formattedEdges }, options);
    networkRef.current = network;

    network.on('click', (params) => {
      if (params.nodes.length > 0) {
        const nodeId = params.nodes[0];
        const targetNode = graphData.nodes.find((n) => n.id === nodeId);
        setSelectedNode(targetNode || null);
      } else {
        setSelectedNode(null);
      }
    });

    return () => {
      network.destroy();
    };
  }, [graphData, heatmapMode, showEdgeLabels, filterType, selectedTopic, searchQuery]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: 'calc(100vh - 120px)' }}>
      {/* Controls Bar */}
      <div className="glass-card" style={{ padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Search */}
          <div style={{ position: 'relative' }}>
            <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '10px' }} />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '32px', width: '200px', height: '36px', fontSize: '0.85rem' }}
              placeholder="Search problem or concept..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Node Type Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Filter size={15} color="var(--text-muted)" />
            <select
              className="form-select"
              style={{ height: '36px', fontSize: '0.85rem', padding: '4px 10px' }}
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="all">All Node Types</option>
              <option value="problem">Problems Only</option>
              <option value="concept">Concepts Only</option>
              <option value="topic">Topics Only</option>
            </select>
          </div>

          {/* Topic Sub-network Isolator */}
          <select
            className="form-select"
            style={{ height: '36px', fontSize: '0.85rem', padding: '4px 10px', width: '170px' }}
            value={selectedTopic}
            onChange={(e) => setSelectedTopic(e.target.value)}
          >
            {topics.map((t) => (
              <option key={t} value={t}>
                {t === 'ALL' ? 'All Topics' : t}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Edge Label Visibility Toggle */}
          <button
            onClick={() => setShowEdgeLabels(!showEdgeLabels)}
            style={{
              padding: '6px 12px',
              borderRadius: 'var(--radius-sm)',
              border: showEdgeLabels ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
              background: showEdgeLabels ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.04)',
              color: showEdgeLabels ? '#fff' : 'var(--text-muted)',
              fontSize: '0.82rem',
              fontWeight: '500',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            {showEdgeLabels ? <Eye size={14} /> : <EyeOff size={14} />}
            {showEdgeLabels ? 'Edge Labels: Shown' : 'Edge Labels: Hidden'}
          </button>

          {/* Heatmap Toggle */}
          <button
            onClick={() => setHeatmapMode(!heatmapMode)}
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--radius-sm)',
              border: heatmapMode ? '1px solid #f43f5e' : '1px solid var(--border-color)',
              background: heatmapMode ? 'rgba(244, 63, 94, 0.15)' : 'rgba(255, 255, 255, 0.05)',
              color: heatmapMode ? '#f87171' : 'var(--text-muted)',
              fontSize: '0.82rem',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Flame size={15} />
            {heatmapMode ? 'Heatmap Mode: On' : 'Heatmap: Off'}
          </button>

          <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.82rem' }} onClick={fetchGraph}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* Main Canvas & Sidebar Container */}
      <div style={{ display: 'flex', gap: '16px', flex: 1, position: 'relative', overflow: 'hidden' }}>
        {/* Vis.js Canvas Container */}
        <div
          ref={containerRef}
          className="glass-card"
          style={{
            flex: 1,
            height: '100%',
            borderRadius: 'var(--radius-md)',
            background: 'radial-gradient(circle at center, rgba(18, 24, 36, 0.95) 0%, rgba(10, 13, 20, 0.98) 100%)',
            border: '1px solid var(--border-color)'
          }}
        />

        {/* Selected Node Details Drawer */}
        {selectedNode && (
          <div
            className="glass-card"
            style={{
              width: '320px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              overflowY: 'auto',
              borderLeft: '2px solid var(--accent-primary)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className={`badge badge-${selectedNode.type}`}>
                {selectedNode.type.toUpperCase()}
              </span>
              <button
                onClick={() => setSelectedNode(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: '#fff' }}>
                {selectedNode.label}
              </h3>
              {selectedNode.category && (
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Category: {selectedNode.category}
                </span>
              )}
            </div>

            {selectedNode.type === 'concept' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ padding: '12px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    Mastery Score
                  </span>
                  <span style={{ fontSize: '1.4rem', fontWeight: '800', color: selectedNode.is_weakness ? '#f43f5e' : '#34d399' }}>
                    {selectedNode.mastery_score}%
                  </span>
                </div>
                <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                  {selectedNode.description}
                </p>
                <button
                  className="btn-primary"
                  style={{ width: '100%', justifyContent: 'center', marginTop: '10px', fontSize: '0.85rem' }}
                  onClick={() => onStartRemediation(selectedNode.id.replace('concept_', ''))}
                >
                  Start Practice Sequence <ChevronRight size={16} />
                </button>
              </div>
            )}

            {selectedNode.type === 'problem' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <span className={`badge badge-${selectedNode.difficulty ? selectedNode.difficulty.toLowerCase() : 'easy'}`}>
                    {selectedNode.difficulty}
                  </span>
                  <span className="badge badge-topic">{selectedNode.topic}</span>
                </div>

                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Pattern: <strong style={{ color: '#fff' }}>{selectedNode.pattern}</strong>
                </p>

                {selectedNode.leetcode_url && (
                  <a
                    href={selectedNode.leetcode_url}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: 'var(--accent-cyan)', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
                  >
                    Open on LeetCode <ExternalLink size={12} />
                  </a>
                )}

                <button
                  className="btn-primary"
                  style={{ width: '100%', justifyContent: 'center', marginTop: '10px', fontSize: '0.85rem' }}
                  onClick={() => onLogAttempt({ id: selectedNode.id.replace('prob_', ''), title: selectedNode.label, topic: selectedNode.topic })}
                >
                  Log Attempt
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

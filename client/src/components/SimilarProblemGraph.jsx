import React, { useEffect, useRef, useState } from 'react';
import { Network } from 'vis-network/standalone';
import { LoaderCircle, Network as NetworkIcon } from 'lucide-react';

const API = 'http://localhost:5001';

export default function SimilarProblemGraph({ problemId }) {
  const containerRef = useRef(null);
  const networkRef = useRef(null);
  const [graph, setGraph] = useState({ nodes: [], edges: [] });
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    fetch(`${API}/api/graph/leetcode/${problemId}`).then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not load the similarity graph.');
      if (active) setGraph(data);
    }).catch((err) => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; networkRef.current?.destroy(); networkRef.current = null; };
  }, [problemId]);

  useEffect(() => {
    if (!containerRef.current || graph.nodes.length === 0) return undefined;
    const nodes = graph.nodes.map((node) => ({
      id: node.id,
      label: `#${node.id} ${node.title}`,
      shape: node.id === Number(problemId) ? 'box' : 'dot',
      color: node.id === Number(problemId)
        ? { background: '#6366f1', border: '#a5b4fc' }
        : { background: '#0891b2', border: '#22d3ee' },
      font: { color: '#f3f4f6', size: 12, face: 'Outfit', strokeWidth: 3, strokeColor: '#0a0d14' },
      margin: 10,
      title: `${node.title}\n${node.difficulty || 'Difficulty unavailable'} · ${(node.topic_tags || []).join(', ')}`
    }));
    const edges = graph.edges.map((edge) => ({
      from: edge.from, to: edge.to, label: 'similar question',
      color: { color: 'rgba(6, 182, 212, .55)', highlight: '#67e8f9' },
      font: { color: '#9ca3af', size: 10, strokeWidth: 2, strokeColor: '#0a0d14' },
      smooth: { type: 'continuous' }
    }));
    const network = new Network(containerRef.current, { nodes, edges }, {
      physics: { stabilization: { iterations: 80 }, barnesHut: { gravitationalConstant: -3000, springLength: 160 } },
      interaction: { hover: true, navigationButtons: true, keyboard: true },
      nodes: { borderWidth: 2, shadow: true },
      edges: { width: 2 }
    });
    networkRef.current = network;
    network.on('click', ({ nodes: clicked }) => setSelected(graph.nodes.find((node) => node.id === clicked[0]) || null));
    return () => { network.destroy(); networkRef.current = null; };
  }, [graph, problemId]);

  return (
    <div className="glass-card" style={{ padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7, color: 'var(--accent-cyan)' }}>
        <NetworkIcon size={17} /><strong style={{ color: 'var(--text-main)', fontSize: '.9rem' }}>Similar-problem graph</strong>
        {loading && <LoaderCircle size={15} />}
      </div>
      <p style={{ color: 'var(--text-muted)', fontSize: '.78rem', marginBottom: 12 }}>Connections are built from the CSV’s similar_questions field.</p>
      {error && <p role="alert" style={{ color: '#f87171', fontSize: '.82rem' }}>{error}</p>}
      {!loading && !error && graph.edges.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '.82rem', padding: '16px 0' }}>No similar-question links in this CSV record could be resolved to another problem.</p>}
      {graph.edges.length > 0 && <div ref={containerRef} style={{ height: 260, borderRadius: 10, background: 'rgba(10,13,20,.45)', border: '1px solid var(--border-color)' }} />}
      {selected && <p style={{ color: 'var(--text-muted)', fontSize: '.8rem', marginTop: 9 }}>Selected: <strong style={{ color: 'var(--text-main)' }}>#{selected.id} {selected.title}</strong></p>}
    </div>
  );
}

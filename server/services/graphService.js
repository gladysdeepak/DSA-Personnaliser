const { db } = require('../db');

function queryAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

async function getFullGraph() {
  const problems = await queryAll('SELECT * FROM problems');
  const concepts = await queryAll('SELECT * FROM concepts');
  const problemConcepts = await queryAll('SELECT * FROM problem_concepts');
  const masteries = await queryAll('SELECT * FROM user_concept_mastery');
  const attempts = await queryAll('SELECT problem_id, status, count(*) as count FROM attempts GROUP BY problem_id, status');

  const masteryMap = {};
  masteries.forEach((m) => {
    masteryMap[m.concept_id] = m;
  });

  const problemStatusMap = {};
  attempts.forEach((a) => {
    if (!problemStatusMap[a.problem_id]) {
      problemStatusMap[a.problem_id] = {};
    }
    problemStatusMap[a.problem_id][a.status] = a.count;
  });

  const nodes = [];
  const edges = [];

  // Topics and Patterns sets
  const topicsSet = new Set();
  const patternsSet = new Set();

  // 1. Concept Nodes
  concepts.forEach((c) => {
    const mastery = masteryMap[c.id] || { mastery_score: 100, is_weakness: 0 };
    nodes.push({
      id: `concept_${c.id}`,
      label: c.title,
      type: 'concept',
      category: c.category,
      description: c.description,
      mastery_score: mastery.mastery_score,
      is_weakness: !!mastery.is_weakness,
      group: 'Concept'
    });
  });

  // 2. Problem Nodes
  problems.forEach((p) => {
    topicsSet.add(p.topic);
    patternsSet.add(p.pattern);

    const statuses = problemStatusMap[p.id] || {};
    let statusState = 'unattempted';
    if (statuses['Solved Independently'] || statuses['Mastered']) {
      statusState = 'solved';
    } else if (statuses['Solved with Hint'] || statuses['Solved after Solution View']) {
      statusState = 'assisted';
    } else if (statuses['Failed'] || statuses['Attempted']) {
      statusState = 'failed';
    }

    nodes.push({
      id: `prob_${p.id}`,
      label: p.title,
      type: 'problem',
      difficulty: p.difficulty,
      topic: p.topic,
      pattern: p.pattern,
      leetcode_url: p.leetcode_url,
      statusState,
      group: 'Problem'
    });

    // Similarity & Prerequisite Edges
    let prereqs = [];
    let similars = [];
    try {
      prereqs = JSON.parse(p.prerequisite_ids || '[]');
      similars = JSON.parse(p.similar_ids || '[]');
    } catch (e) {}

    prereqs.forEach((prereqId) => {
      edges.push({
        from: `prob_${prereqId}`,
        to: `prob_${p.id}`,
        label: 'prerequisite',
        type: 'prerequisite'
      });
    });

    similars.forEach((simId) => {
      edges.push({
        from: `prob_${p.id}`,
        to: `prob_${simId}`,
        label: 'similar',
        type: 'similar'
      });
    });
  });

  // 3. Topic Nodes
  topicsSet.forEach((t) => {
    nodes.push({
      id: `topic_${t}`,
      label: t,
      type: 'topic',
      group: 'Topic'
    });
  });

  // 4. Problem to Concept Edges & Problem to Topic Edges
  problemConcepts.forEach((pc) => {
    edges.push({
      from: `prob_${pc.problem_id}`,
      to: `concept_${pc.concept_id}`,
      label: 'requires',
      type: 'concept_req'
    });
  });

  problems.forEach((p) => {
    edges.push({
      from: `prob_${p.id}`,
      to: `topic_${p.topic}`,
      label: 'belongs to',
      type: 'topic_link'
    });
  });

  return { nodes, edges };
}

module.exports = {
  getFullGraph
};

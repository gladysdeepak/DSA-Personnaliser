const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDb, db } = require('./db');
const { getFullGraph } = require('./services/graphService');
const { handleNewAttempt, getDiagnosticInsights, getAlgorithmicProfile } = require('./services/diagnosisEngine');
const { getPersonalizedRecommendation } = require('./services/recommender');

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

// Helper SQL queries
function queryAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function queryGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function queryRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

// 1. Healthcheck
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// 2. Full Knowledge Graph
app.get('/api/graph', async (req, res) => {
  try {
    const graph = await getFullGraph();
    res.json(graph);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Get all problems
app.get('/api/problems', async (req, res) => {
  try {
    const problems = await queryAll('SELECT * FROM problems ORDER BY id ASC');
    const attempts = await queryAll('SELECT problem_id, status, count(*) as count FROM attempts GROUP BY problem_id, status');
    const problemConcepts = await queryAll(
      `SELECT pc.problem_id, c.id as concept_id, c.title as concept_title, c.category 
       FROM problem_concepts pc 
       JOIN concepts c ON pc.concept_id = c.id`
    );

    const attemptsMap = {};
    attempts.forEach((a) => {
      if (!attemptsMap[a.problem_id]) attemptsMap[a.problem_id] = {};
      attemptsMap[a.problem_id][a.status] = a.count;
    });

    const pcMap = {};
    problemConcepts.forEach((pc) => {
      if (!pcMap[pc.problem_id]) pcMap[pc.problem_id] = [];
      pcMap[pc.problem_id].push({ id: pc.concept_id, title: pc.concept_title, category: pc.category });
    });

    const result = problems.map((p) => {
      const statuses = attemptsMap[p.id] || {};
      let userStatus = 'Unattempted';
      if (statuses['Solved Independently'] || statuses['Mastered']) userStatus = 'Solved Independently';
      else if (statuses['Solved with Hint']) userStatus = 'Solved with Hint';
      else if (statuses['Solved after Solution View']) userStatus = 'Solved after Solution View';
      else if (statuses['Memorized']) userStatus = 'Memorized';
      else if (statuses['Failed'] || statuses['Attempted']) userStatus = 'Failed';

      return {
        ...p,
        prerequisite_ids: JSON.parse(p.prerequisite_ids || '[]'),
        similar_ids: JSON.parse(p.similar_ids || '[]'),
        concepts: pcMap[p.id] || [],
        userStatus,
        attemptCounts: statuses
      };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Single problem details
app.get('/api/problems/:id', async (req, res) => {
  try {
    const problem = await queryGet('SELECT * FROM problems WHERE id = ?', [req.params.id]);
    if (!problem) return res.status(404).json({ error: 'Problem not found' });

    const concepts = await queryAll(
      `SELECT c.* FROM concepts c JOIN problem_concepts pc ON c.id = pc.concept_id WHERE pc.problem_id = ?`,
      [req.params.id]
    );

    const attempts = await queryAll(
      'SELECT * FROM attempts WHERE problem_id = ? ORDER BY timestamp DESC',
      [req.params.id]
    );

    res.json({
      ...problem,
      prerequisite_ids: JSON.parse(problem.prerequisite_ids || '[]'),
      similar_ids: JSON.parse(problem.similar_ids || '[]'),
      concepts,
      attempts
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Log new attempt
app.post('/api/attempts', async (req, res) => {
  try {
    const {
      problem_id,
      status,
      time_spent_mins = 0,
      hint_used = 0,
      solution_viewed = 0,
      memorized = 0,
      difficulty_rating = 'Fair',
      failure_reasons = [],
      notes = ''
    } = req.body;

    if (!problem_id || !status) {
      return res.status(400).json({ error: 'problem_id and status are required' });
    }

    const failureReasonsStr = JSON.stringify(failure_reasons);

    const result = await queryRun(
      `INSERT INTO attempts 
       (problem_id, status, time_spent_mins, hint_used, solution_viewed, memorized, difficulty_rating, failure_reasons, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        problem_id,
        status,
        time_spent_mins,
        hint_used ? 1 : 0,
        solution_viewed ? 1 : 0,
        memorized ? 1 : 0,
        difficulty_rating,
        failureReasonsStr,
        notes
      ]
    );

    // Recalculate concept mastery & weakness flags for connected concepts
    await handleNewAttempt(problem_id);

    res.json({ success: true, attemptId: result.lastID });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Get all concept masteries
app.get('/api/concepts', async (req, res) => {
  try {
    const concepts = await queryAll(
      `SELECT c.*, ucm.mastery_score, ucm.total_attempts, ucm.failed_count, ucm.solution_count, ucm.is_weakness
       FROM concepts c
       LEFT JOIN user_concept_mastery ucm ON c.id = ucm.concept_id
       ORDER BY ucm.is_weakness DESC, ucm.mastery_score ASC`
    );
    res.json(concepts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Diagnostic Insights & Latent Weaknesses
app.get('/api/diagnostics', async (req, res) => {
  try {
    const insights = await getDiagnosticInsights();
    res.json(insights);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 8. User Algorithmic Profile / Fingerprint
app.get('/api/profile', async (req, res) => {
  try {
    const profile = await getAlgorithmicProfile();
    res.json(profile);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 9. Personalized Practice Recommendation
app.get('/api/recommendation', async (req, res) => {
  try {
    const conceptId = req.query.concept_id;
    const recommendation = await getPersonalizedRecommendation(conceptId);
    res.json(recommendation);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start server
initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`DSA Personaliser backend server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err);
  });

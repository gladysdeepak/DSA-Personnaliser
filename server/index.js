require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDb, db } = require('./db');
const { getFullGraph } = require('./services/graphService');
const { handleNewAttempt, getDiagnosticInsights, getAlgorithmicProfile } = require('./services/diagnosisEngine');
const { getPersonalizedRecommendation } = require('./services/recommender');
const { ingestCsv } = require('./services/leetcodeDataset');
const { runLearningAgent } = require('./services/learningAgent');

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

// CSV-backed retrieval corpus (separate from the NeetCode graph dataset).
app.get('/api/dataset/status', async (_req, res) => {
  try {
    const row = await queryGet(`SELECT COUNT(*) AS count, SUM(has_description=0) AS missing_descriptions
      FROM leetcode_problems WHERE active=1`);
    res.json({ source: 'leetcode.csv', ...row });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/dataset/quality', async (_req, res) => {
  try {
    const fs = require('fs');
    const reportPath = path.join(__dirname, 'data', 'leetcode_quality_report.json');
    if (!fs.existsSync(reportPath)) return res.status(404).json({ error: 'Dataset quality report is not available yet.' });
    res.json(JSON.parse(fs.readFileSync(reportPath, 'utf8')));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/leetcode/:id', async (req, res) => {
  try {
    const problem = await queryGet('SELECT * FROM leetcode_problems WHERE id=? AND active=1', [req.params.id]);
    if (!problem) return res.status(404).json({ error: 'LeetCode problem not found' });
    res.json({ ...problem, topic_tags: JSON.parse(problem.topic_tags), similar_questions: JSON.parse(problem.similar_questions), raw_record: JSON.parse(problem.raw_record) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/search/hybrid', async (req, res) => {
  try {
    const query = String(req.body.query || '').trim();
    if (!query) return res.status(400).json({ error: 'query is required' });
    const limit = Math.max(1, Math.min(50, Number.parseInt(req.body.limit, 10) || 10));
    const difficulty = String(req.body.difficulty || '').trim();
    const requestedTopics = Array.isArray(req.body.topics) ? req.body.topics.map((x) => String(x).toLowerCase()) : [];
    const exactId = query.match(/^\s*(?:#|problem\s*)?(\d+)\s*$/i)?.[1];
    if (exactId) {
      const exact = await queryGet('SELECT * FROM leetcode_problems WHERE id=? AND active=1', [exactId]);
      if (exact && (!difficulty || exact.difficulty?.toLowerCase() === difficulty.toLowerCase())) {
        const result = { ...exact };
        delete result.raw_record;
        delete result.content_hash;
        return res.json({ query, mode: 'exact_id', results: [{ ...result, topic_tags: JSON.parse(exact.topic_tags), similar_questions: JSON.parse(exact.similar_questions), score: 1 }] });
      }
    }
    const terms = query.toLowerCase().match(/[\p{L}\p{N}]+/gu) || [];
    if (!terms.length) return res.json({ query, mode: 'hybrid', results: [] });
    const ftsQuery = [...new Set(terms)].map((term) => `"${term.replace(/"/g, '""')}"`).join(' OR ');
    const candidates = await queryAll(`SELECT p.*, bm25(leetcode_problem_fts, 4.0, 1.0, 3.0) AS lexical_rank
      FROM leetcode_problem_fts JOIN leetcode_problems p ON p.id=leetcode_problem_fts.rowid
      WHERE leetcode_problem_fts MATCH ? AND p.active=1
      ${difficulty ? 'AND lower(p.difficulty)=lower(?)' : ''}
      ORDER BY lexical_rank LIMIT 250`, difficulty ? [ftsQuery, difficulty] : [ftsQuery]);
    const scored = candidates.map((problem, index) => {
      const result = { ...problem };
      delete result.raw_record;
      delete result.content_hash;
      const tags = JSON.parse(problem.topic_tags);
      const normTags = tags.map((tag) => tag.toLowerCase());
      const topicMatches = requestedTopics.filter((topic) => normTags.some((tag) => tag.includes(topic) || topic.includes(tag))).length;
      const tokenMatches = terms.reduce((sum, term) => sum + (normTags.some((tag) => tag.includes(term)) ? 1 : 0), 0);
      const reciprocalRank = 1 / (60 + index + 1);
      const score = reciprocalRank + topicMatches * 0.02 + tokenMatches * 0.005;
      return { ...result, topic_tags: tags, similar_questions: JSON.parse(problem.similar_questions), score, topic_matches: topicMatches };
    }).sort((a, b) => b.score - a.score).slice(0, limit);
    res.json({ query, mode: 'hybrid_lexical', results: scored });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/agent/history', async (req, res) => {
  try {
    const userId = String(req.query.user_id || 'local').trim();
    if (!/^[a-zA-Z0-9_-]{1,80}$/.test(userId)) return res.status(400).json({ error: 'Invalid user_id.' });
    const history = await queryAll(`SELECT role,content,created_at FROM (
      SELECT role,content,created_at,id FROM agent_conversations WHERE user_id=?
      ORDER BY id DESC LIMIT 40
    ) ORDER BY id ASC`, [userId]);
    const goals = await queryAll(`SELECT id,goal,deadline,status,created_at FROM learning_goals
      WHERE user_id=? AND status='active' ORDER BY id DESC LIMIT 10`, [userId]);
    res.json({ history, goals, configured: Boolean(process.env.OPENAI_API_KEY) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/agent/history', async (req, res) => {
  try {
    const userId = String(req.query.user_id || 'local').trim();
    if (!/^[a-zA-Z0-9_-]{1,80}$/.test(userId)) return res.status(400).json({ error: 'Invalid user_id.' });
    await queryRun('DELETE FROM agent_conversations WHERE user_id=?', [userId]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/agent/chat', async (req, res) => {
  try {
    const userId = String(req.body.user_id || 'local').trim();
    const message = String(req.body.message || '').trim();
    if (!/^[a-zA-Z0-9_-]{1,80}$/.test(userId)) return res.status(400).json({ error: 'Invalid user_id.' });
    if (!message) return res.status(400).json({ error: 'message is required.' });
    if (message.length > 3000) return res.status(400).json({ error: 'message must be 3,000 characters or fewer.' });
    if (!process.env.OPENAI_API_KEY) return res.status(503).json({
      code: 'agent_not_configured',
      error: 'The learning agent needs OPENAI_API_KEY in the server environment.'
    });
    const history = await queryAll(`SELECT role,content FROM (
      SELECT role,content,id FROM agent_conversations WHERE user_id=?
      ORDER BY id DESC LIMIT 10
    ) ORDER BY id ASC`, [userId]);
    const result = await runLearningAgent({ userId, message, history });
    await queryRun('INSERT INTO agent_conversations(user_id,role,content) VALUES(?,?,?)', [userId, 'user', message]);
    await queryRun('INSERT INTO agent_conversations(user_id,role,content) VALUES(?,?,?)', [userId, 'assistant', result.answer]);
    res.json(result);
  } catch (err) {
    console.error('Learning agent request failed:', err.message);
    res.status(err.code === 'agent_not_configured' ? 503 : 502).json({ code: err.code || 'agent_error', error: err.message });
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

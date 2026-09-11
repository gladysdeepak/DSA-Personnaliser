const { db } = require('../db');

function queryAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
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

async function recalculateMasteryForConcept(conceptId) {
  // Fetch all problem IDs connected to this concept
  const pcs = await queryAll('SELECT problem_id FROM problem_concepts WHERE concept_id = ?', [conceptId]);
  const problemIds = pcs.map((p) => p.problem_id);

  if (problemIds.length === 0) return;

  const placeholders = problemIds.map(() => '?').join(',');
  const attempts = await queryAll(
    `SELECT * FROM attempts WHERE problem_id IN (${placeholders}) ORDER BY timestamp DESC`,
    problemIds
  );

  if (attempts.length === 0) {
    await queryRun(
      'UPDATE user_concept_mastery SET mastery_score = 100.0, total_attempts = 0, failed_count = 0, solution_count = 0, is_weakness = 0 WHERE concept_id = ?',
      [conceptId]
    );
    return;
  }

  let totalScore = 0;
  let weightedCount = 0;
  let failedCount = 0;
  let solutionCount = 0;

  attempts.forEach((a) => {
    let weight = 1.0;
    // Outcome score calculation
    if (a.status === 'Solved Independently' || a.status === 'Mastered') {
      weight = 1.0;
    } else if (a.status === 'Solved with Hint') {
      weight = 0.6;
    } else if (a.status === 'Solved after Solution View') {
      weight = 0.35;
      solutionCount++;
    } else if (a.status === 'Memorized') {
      weight = 0.3;
      solutionCount++;
    } else {
      weight = 0.0;
      failedCount++;
    }

    // Penalize if solution viewed or hint used explicitly
    if (a.solution_viewed) weight *= 0.7;
    if (a.hint_used) weight *= 0.85;

    totalScore += weight * 100;
    weightedCount += 1;
  });

  const masteryScore = Math.round(totalScore / weightedCount);

  // Weakness detection heuristic
  const isWeakness = (attempts.length >= 1 && masteryScore < 65) || failedCount >= 2 || solutionCount >= 2 ? 1 : 0;

  await queryRun(
    `UPDATE user_concept_mastery 
     SET mastery_score = ?, total_attempts = ?, failed_count = ?, solution_count = ?, is_weakness = ?, updated_at = CURRENT_TIMESTAMP
     WHERE concept_id = ?`,
    [masteryScore, attempts.length, failedCount, solutionCount, isWeakness, conceptId]
  );
}

async function handleNewAttempt(problemId) {
  // Find connected concepts
  const pcs = await queryAll('SELECT concept_id FROM problem_concepts WHERE problem_id = ?', [problemId]);
  for (const pc of pcs) {
    await recalculateMasteryForConcept(pc.concept_id);
  }
}

async function getDiagnosticInsights() {
  const weakConcepts = await queryAll(
    `SELECT ucm.*, c.title, c.category, c.description 
     FROM user_concept_mastery ucm 
     JOIN concepts c ON ucm.concept_id = c.id 
     WHERE ucm.is_weakness = 1 OR ucm.mastery_score < 70 
     ORDER BY ucm.mastery_score ASC`
  );

  const insights = [];

  for (const c of weakConcepts) {
    const pcs = await queryAll('SELECT problem_id FROM problem_concepts WHERE concept_id = ?', [c.concept_id]);
    const problemIds = pcs.map((p) => p.problem_id);
    let problemTitles = [];
    if (problemIds.length > 0) {
      const placeholders = problemIds.map(() => '?').join(',');
      const probs = await queryAll(`SELECT title FROM problems WHERE id IN (${placeholders})`, problemIds);
      problemTitles = probs.map((p) => p.title);
    }

    insights.push({
      concept_id: c.concept_id,
      title: c.title,
      category: c.category,
      description: c.description,
      mastery_score: c.mastery_score,
      failed_count: c.failed_count,
      solution_count: c.solution_count,
      total_attempts: c.total_attempts,
      affected_problems: problemTitles,
      diagnosis: `Your performance indicates a struggle with "${c.title}" (${c.category}). You have ${c.failed_count} failed attempt(s) and ${c.solution_count} solution-assisted solve(s) across connected problems (${problemTitles.slice(0, 3).join(', ')}). Target this concept to build genuine transfer ability.`
    });
  }

  return insights;
}

async function getAlgorithmicProfile() {
  const masteries = await queryAll(
    `SELECT c.category, c.title, ucm.mastery_score, ucm.is_weakness, ucm.total_attempts 
     FROM user_concept_mastery ucm
     JOIN concepts c ON ucm.concept_id = c.id`
  );

  const categoryMap = {};
  masteries.forEach((m) => {
    if (!categoryMap[m.category]) {
      categoryMap[m.category] = { total: 0, sum: 0, count: 0, weaknesses: 0 };
    }
    categoryMap[m.category].sum += m.mastery_score;
    categoryMap[m.category].count += 1;
    if (m.is_weakness) categoryMap[m.category].weaknesses += 1;
  });

  const categoryProfile = Object.keys(categoryMap).map((cat) => ({
    category: cat,
    average_mastery: Math.round(categoryMap[cat].sum / categoryMap[cat].count),
    concept_count: categoryMap[cat].count,
    weakness_count: categoryMap[cat].weaknesses
  }));

  const allAttempts = await queryAll('SELECT * FROM attempts');
  const totalAttempts = allAttempts.length;
  const independentSolves = allAttempts.filter((a) => a.status === 'Solved Independently' || a.status === 'Mastered').length;
  const assistedSolves = allAttempts.filter((a) => a.status === 'Solved with Hint' || a.status === 'Solved after Solution View').length;
  const failedCount = allAttempts.filter((a) => a.status === 'Failed' || a.status === 'Attempted').length;

  return {
    categoryProfile,
    summary: {
      totalAttempts,
      independentSolves,
      assistedSolves,
      failedCount,
      transferReadiness: totalAttempts > 0 ? Math.round((independentSolves / totalAttempts) * 100) : 100
    }
  };
}

module.exports = {
  handleNewAttempt,
  recalculateMasteryForConcept,
  getDiagnosticInsights,
  getAlgorithmicProfile
};

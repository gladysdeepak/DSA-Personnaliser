const { db } = require('../db');

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

async function getPersonalizedRecommendation(targetConceptId = null) {
  let concept;
  if (targetConceptId) {
    concept = await queryGet(
      `SELECT c.*, ucm.mastery_score, ucm.is_weakness 
       FROM concepts c 
       JOIN user_concept_mastery ucm ON c.id = ucm.concept_id 
       WHERE c.id = ?`,
      [targetConceptId]
    );
  }

  if (!concept) {
    // Pick the concept with lowest mastery score or flagged as weakness
    concept = await queryGet(
      `SELECT c.*, ucm.mastery_score, ucm.is_weakness 
       FROM concepts c 
       JOIN user_concept_mastery ucm ON c.id = ucm.concept_id 
       ORDER BY ucm.is_weakness DESC, ucm.mastery_score ASC 
       LIMIT 1`
    );
  }

  if (!concept) {
    return null;
  }

  // Get all problems associated with this concept
  const pcs = await queryAll('SELECT problem_id FROM problem_concepts WHERE concept_id = ?', [concept.id]);
  const problemIds = pcs.map((p) => p.problem_id);

  if (problemIds.length === 0) return null;

  const placeholders = problemIds.map(() => '?').join(',');
  const problems = await queryAll(`SELECT * FROM problems WHERE id IN (${placeholders})`, problemIds);

  // Fetch all user attempts
  const attempts = await queryAll('SELECT * FROM attempts');
  const attemptedProblemIds = new Set(attempts.map((a) => a.problem_id));
  const solvedIndependentlyIds = new Set(
    attempts.filter((a) => a.status === 'Solved Independently' || a.status === 'Mastered').map((a) => a.problem_id)
  );

  // 1. Warm-up Problem (Easy difficulty preferred)
  const warmup =
    problems.find((p) => p.difficulty === 'Easy') ||
    problems[0];

  // 2. Target Problem (Medium/Hard problem, failed or unattempted)
  const targetProb =
    problems.find((p) => !solvedIndependentlyIds.has(p.id) && p.id !== warmup.id) ||
    problems.find((p) => p.id !== warmup.id) ||
    warmup;

  // 3. Transfer Test Problem (Unseen problem requiring this concept or adjacent concept)
  const transferProb =
    problems.find((p) => !attemptedProblemIds.has(p.id) && p.id !== warmup.id && p.id !== targetProb.id) ||
    problems.find((p) => p.id !== warmup.id && p.id !== targetProb.id) ||
    targetProb;

  // Primer text per concept
  const primer = {
    title: concept.title,
    category: concept.category,
    overview: concept.description,
    key_invariants: [
      `Always maintain the exact mathematical condition required by ${concept.title}.`,
      `Identify the trigger event that invalidates the invariant (e.g., duplicate element, negative count, non-monotonic stack item).`,
      `Shrink or rebalance state cleanly before moving to the next iteration.`
    ],
    common_pitfalls: [
      `Failing to update state variables before shrinking boundaries.`,
      `Confusing solution recall with deriving the underlying invariant.`,
      `Not testing edge cases (empty collections, single-element arrays, all duplicates).`
    ]
  };

  return {
    concept: {
      id: concept.id,
      title: concept.title,
      category: concept.category,
      mastery_score: concept.mastery_score,
      is_weakness: !!concept.is_weakness
    },
    remediation_steps: [
      {
        step: 1,
        type: 'primer',
        title: 'Step 1: Conceptual Reasoning Primer',
        subtitle: 'Deconstruct the underlying invariant before coding',
        data: primer
      },
      {
        step: 2,
        type: 'warmup',
        title: 'Step 2: Warm-up Baseline Practice',
        subtitle: 'Build confidence with a fundamental problem testing this concept directly',
        problem: warmup
      },
      {
        step: 3,
        type: 'target',
        title: 'Step 3: Target Problem Remediation',
        subtitle: 'Re-tackle your struggle area to verify pattern formulation',
        problem: targetProb
      },
      {
        step: 4,
        type: 'transfer',
        title: 'Step 4: Unseen Concept Transfer Test',
        subtitle: 'Prove genuine understanding by applying this concept to an unseen problem',
        problem: transferProb
      }
    ]
  };
}

module.exports = {
  getPersonalizedRecommendation
};

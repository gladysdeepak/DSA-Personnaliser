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

  // Keep the diagnosed concept as the personalization signal, but resolve its
  // practice problems against leetcode.csv and follow CSV similarity edges.
  const csvIds = [...new Set(problemIds.map(Number).filter((id) => Number.isInteger(id) && id > 0))];
  if (csvIds.length) {
    const csvPlaceholders = csvIds.map(() => '?').join(',');
    const csvProblems = await queryAll(`SELECT id,title,difficulty,topic_tags,problem_url
      FROM leetcode_problems WHERE active=1 AND id IN (${csvPlaceholders})`, csvIds);
    if (csvProblems.length) {
      const recentAttempts = await queryAll(`SELECT problem_id,status,timestamp FROM attempts
        WHERE problem_id IN (${csvPlaceholders}) ORDER BY timestamp DESC`, csvIds.map(String));
      const statusById = new Map();
      for (const attempt of recentAttempts) if (!statusById.has(String(attempt.problem_id))) statusById.set(String(attempt.problem_id), attempt.status);
      const needsWork = (id) => !['Solved Independently', 'Mastered'].includes(statusById.get(String(id)));
      const csvTarget = csvProblems.find((problem) => needsWork(problem.id)) || csvProblems[0];
      const csvPlan = await getCsvProblemRemediation(csvTarget.id);
      if (csvPlan) {
        csvPlan.concept = {
          id: concept.id, title: concept.title, category: concept.category,
          mastery_score: concept.mastery_score, is_weakness: Boolean(concept.is_weakness)
        };
        csvPlan.target_concept = { id: concept.id, title: concept.title, category: concept.category };
        return csvPlan;
      }
    }
  }

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

function difficultyRank(value) {
  return ({ Easy: 0, Medium: 1, Hard: 2 })[value] ?? 1;
}

async function getCsvProblemRemediation(problemId) {
  const target = await queryGet(`SELECT id,title,difficulty,topic_tags,description,problem_url,similar_questions
    FROM leetcode_problems WHERE id=? AND active=1`, [problemId]);
  if (!target) return null;
  const neighbors = await queryAll(`SELECT p.id,p.title,p.difficulty,p.topic_tags,p.description,p.problem_url
    FROM leetcode_problem_edges e JOIN leetcode_problems p
      ON p.id=CASE WHEN e.source_id=? THEN e.target_id ELSE e.source_id END
    WHERE (e.source_id=? OR e.target_id=?) AND p.active=1 AND p.id<>?
    GROUP BY p.id`, [problemId, problemId, problemId, problemId]);
  let related = neighbors;
  let relationSource = 'similar_questions';
  if (!related.length) {
    // Some source records point to titles absent from this CSV extract. Keep
    // the remediation usable by finding a lexical fallback from the CSV tags.
    const tags = JSON.parse(target.topic_tags || '[]');
    const terms = tags.slice(0, 4).map((tag) => String(tag).match(/[\p{L}\p{N}]+/gu)?.[0]).filter(Boolean);
    if (terms.length) {
      const match = terms.map((term) => `"${term.replace(/"/g, '""')}"`).join(' OR ');
      related = await queryAll(`SELECT p.id,p.title,p.difficulty,p.topic_tags,p.description,p.problem_url
        FROM leetcode_problem_fts JOIN leetcode_problems p ON p.id=leetcode_problem_fts.rowid
        WHERE leetcode_problem_fts MATCH ? AND p.active=1 AND p.id<>?
        ORDER BY bm25(leetcode_problem_fts,4.0,1.0,3.0) LIMIT 12`, [match, problemId]);
      relationSource = 'topic_fallback';
    }
  }
  const tags = JSON.parse(target.topic_tags || '[]');
  const mapped = related.map((problem) => ({
    ...problem, topic_tags: JSON.parse(problem.topic_tags || '[]'),
    similar_to: Number(problem.id) === Number(problemId)
  }));
  const warmup = mapped.filter((problem) => difficultyRank(problem.difficulty) <= difficultyRank(target.difficulty))
    .sort((a, b) => difficultyRank(a.difficulty) - difficultyRank(b.difficulty))[0] || mapped[0] || target;
  const transfer = mapped.find((problem) => problem.id !== warmup.id) || warmup;
  const asFlowProblem = (problem) => ({
    id: problem.id, title: problem.title, difficulty: problem.difficulty || 'Medium',
    topic: (problem.topic_tags || tags).join(', '), pattern: (problem.topic_tags || tags).join(', '),
    leetcode_url: problem.problem_url
  });
  const targetFlow = asFlowProblem({ ...target, topic_tags: tags });
  const overview = `You flagged ${target.title} for extra practice. Revisit the underlying ${tags.join(', ') || 'problem-solving'} ideas, then transfer them to a related problem from the LeetCode dataset.`;
  return {
    source: 'leetcode.csv', relation_source: relationSource,
    concept: { id: `leetcode_problem_${target.id}`, title: target.title, category: tags.join(', ') || 'LeetCode', mastery_score: null, is_weakness: true },
    flagged_problem: { ...target, topic_tags: tags },
    similar_problems: mapped.map((problem) => ({ ...problem, topic_tags: problem.topic_tags })),
    remediation_steps: [
      { step: 1, type: 'primer', title: 'Review the target problem', subtitle: 'Name the pattern and identify the key invariant before coding', data: {
        title: target.title, category: tags.join(', ') || 'Problem reasoning', overview,
        key_invariants: [
          `Restate the core requirement in your own words before choosing a data structure.`,
          `Identify what state must remain true after every iteration for ${target.title}.`,
          `Check boundary cases and explain why each transition preserves the invariant.`
        ],
        common_pitfalls: [
          'Starting implementation before making the state and invariant explicit.',
          'Reproducing a remembered solution without explaining why each transition works.',
          'Skipping edge cases such as empty input, repeated values, or minimum-size input.'
        ]
      } },
      { step: 2, type: 'warmup', title: 'Practice a related problem', subtitle: 'Warm up with a linked problem from the source dataset', problem: asFlowProblem(warmup) },
      { step: 3, type: 'target', title: 'Revisit the flagged problem', subtitle: 'Retry the original problem after writing down your approach', problem: targetFlow },
      { step: 4, type: 'transfer', title: 'Test transfer on another related problem', subtitle: relationSource === 'similar_questions' ? 'Apply the same reasoning to a similar-question edge from the CSV' : 'Apply the same topic to another problem in the CSV', problem: asFlowProblem(transfer) }
    ]
  };
}

module.exports = {
  getPersonalizedRecommendation,
  getCsvProblemRemediation
};

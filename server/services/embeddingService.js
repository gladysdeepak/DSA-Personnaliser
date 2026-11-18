const { db } = require('../db');

const AI_PROVIDER = String(process.env.AI_PROVIDER || (process.env.GEMINI_API_KEY ? 'gemini' : 'openai')).toLowerCase();
const API_KEY = AI_PROVIDER === 'gemini' ? process.env.GEMINI_API_KEY : process.env.OPENAI_API_KEY;
const EMBEDDING_MODEL = AI_PROVIDER === 'gemini'
  ? (process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001')
  : (process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small');
const EMBEDDING_DIMENSIONS = Number.parseInt(
  AI_PROVIDER === 'gemini' ? process.env.GEMINI_EMBEDDING_DIMENSIONS : process.env.OPENAI_EMBEDDING_DIMENSIONS, 10
) || 256;
const EMBEDDING_URL = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1/responses')
  .replace(/\/responses\/?$/, '/embeddings');

function all(sql, params = []) {
  return new Promise((resolve, reject) => db.all(sql, params, (error, rows) => error ? reject(error) : resolve(rows)));
}
function get(sql, params = []) {
  return new Promise((resolve, reject) => db.get(sql, params, (error, row) => error ? reject(error) : resolve(row)));
}
function run(sql, params = []) {
  return new Promise((resolve, reject) => db.run(sql, params, function (error) { error ? reject(error) : resolve(this); }));
}

function problemEmbeddingText(problem) {
  const tags = JSON.parse(problem.topic_tags || '[]');
  const similar = JSON.parse(problem.similar_questions || '[]');
  const description = String(problem.description || '').slice(0, 6000);
  return [
    `Title: ${problem.title}`,
    `Difficulty: ${problem.difficulty || 'Unknown'}`,
    `Topics: ${tags.join(', ') || 'None listed'}`,
    description ? `Description: ${description}` : '',
    similar.length ? `Related problems: ${similar.slice(0, 12).join(', ')}` : ''
  ].filter(Boolean).join('\n');
}

async function requestEmbeddings(input) {
  if (!API_KEY) throw new Error(`Set ${AI_PROVIDER === 'gemini' ? 'GEMINI_API_KEY' : 'OPENAI_API_KEY'} in .env before building or querying embeddings.`);
  if (AI_PROVIDER === 'gemini') {
    const requests = input.map((text) => ({
      model: `models/${EMBEDDING_MODEL}`,
      content: { parts: [{ text }] },
      outputDimensionality: EMBEDDING_DIMENSIONS
    }));
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:batchEmbedContents`, {
      method: 'POST', headers: { 'x-goog-api-key': API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests }), signal: AbortSignal.timeout(120000)
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error?.message || `Gemini embedding request returned HTTP ${response.status}`);
    return payload.embeddings.map((item) => item.values);
  }
  const url = EMBEDDING_URL.startsWith('https://api.openai.com')
    ? 'https://api.openai.com/v1/embeddings'
    : EMBEDDING_URL;
  const response = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: EMBEDDING_MODEL, input, dimensions: EMBEDDING_DIMENSIONS, encoding_format: 'float' }),
    signal: AbortSignal.timeout(120000)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error?.message || `Embedding request returned HTTP ${response.status}`);
  return payload.data.sort((a, b) => a.index - b.index).map((item) => item.embedding);
}

async function buildProblemEmbeddings({ batchSize = 64, onProgress = () => {} } = {}) {
  const problems = await all(`SELECT p.id,p.title,p.description,p.difficulty,p.topic_tags,p.similar_questions,p.content_hash
    FROM leetcode_problems p LEFT JOIN problem_embeddings e ON e.problem_id=p.id
    WHERE p.active=1 AND (e.problem_id IS NULL OR e.content_hash<>p.content_hash OR e.model_name<>?)
    ORDER BY p.id`, [EMBEDDING_MODEL]);
  let completed = 0;
  for (let offset = 0; offset < problems.length; offset += batchSize) {
    const batch = problems.slice(offset, offset + batchSize);
    const vectors = await requestEmbeddings(batch.map(problemEmbeddingText));
    for (let index = 0; index < batch.length; index += 1) {
      await run(`INSERT INTO problem_embeddings(problem_id,model_name,content_hash,dimensions,vector_json,created_at)
        VALUES(?,?,?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(problem_id) DO UPDATE SET
        model_name=excluded.model_name,content_hash=excluded.content_hash,dimensions=excluded.dimensions,
        vector_json=excluded.vector_json,created_at=CURRENT_TIMESTAMP`, [
        batch[index].id, EMBEDDING_MODEL, batch[index].content_hash, vectors[index].length, JSON.stringify(vectors[index])
      ]);
      completed += 1;
    }
    onProgress({ completed, total: problems.length });
  }
  const status = await get(`SELECT COUNT(*) AS indexed, (SELECT COUNT(*) FROM leetcode_problems WHERE active=1) AS corpus
    FROM problem_embeddings e JOIN leetcode_problems p ON p.id=e.problem_id
    WHERE p.active=1 AND e.model_name=? AND e.content_hash=p.content_hash`, [EMBEDDING_MODEL]);
  return { ...status, model: EMBEDDING_MODEL, dimensions: EMBEDDING_DIMENSIONS, newly_embedded: completed };
}

async function embedQuery(query) {
  const [vector] = await requestEmbeddings([String(query).trim().slice(0, 6000)]);
  return vector;
}

async function semanticSearch(query, { difficulty = null, limit = 10, topic = null } = {}) {
  const status = await get(`SELECT COUNT(*) AS count FROM problem_embeddings e
    JOIN leetcode_problems p ON p.id=e.problem_id
    WHERE p.active=1 AND e.model_name=? AND e.content_hash=p.content_hash`, [EMBEDDING_MODEL]);
  if (!status.count) {
    const error = new Error(`No current embeddings are indexed. Configure ${AI_PROVIDER === 'gemini' ? 'GEMINI_API_KEY' : 'OPENAI_API_KEY'} and run npm run embeddings:build.`);
    error.code = 'embeddings_not_ready';
    throw error;
  }
  const queryVector = await embedQuery(query);
  const filters = ['p.active=1', 'e.model_name=?', 'e.content_hash=p.content_hash'];
  const params = [EMBEDDING_MODEL];
  if (difficulty) { filters.push('lower(p.difficulty)=lower(?)'); params.push(difficulty); }
  if (topic) { filters.push('lower(p.topic_tags) LIKE ?'); params.push(`%${String(topic).toLowerCase().slice(0, 80)}%`); }
  const rows = await all(`SELECT p.id,p.title,p.difficulty,p.topic_tags,p.description,p.problem_url,e.vector_json
    FROM problem_embeddings e JOIN leetcode_problems p ON p.id=e.problem_id
    WHERE ${filters.join(' AND ')}`, params);
  const scored = rows.map((row) => {
    const vector = JSON.parse(row.vector_json);
    let dot = 0, qNorm = 0, dNorm = 0;
    const dimensions = Math.min(vector.length, queryVector.length);
    for (let i = 0; i < dimensions; i += 1) {
      dot += vector[i] * queryVector[i];
      qNorm += queryVector[i] * queryVector[i];
      dNorm += vector[i] * vector[i];
    }
    const score = qNorm && dNorm ? dot / Math.sqrt(qNorm * dNorm) : 0;
    return {
      id: row.id, title: row.title, difficulty: row.difficulty,
      topic_tags: JSON.parse(row.topic_tags || '[]'),
      description: String(row.description || '').slice(0, 900), problem_url: row.problem_url, score
    };
  }).sort((a, b) => b.score - a.score).slice(0, Math.max(1, Math.min(50, limit)));
  return { query, mode: 'semantic', embedding_model: EMBEDDING_MODEL, indexed_count: status.count, results: scored };
}

async function getEmbeddingStatus() {
  return get(`SELECT COUNT(*) AS indexed, (SELECT COUNT(*) FROM leetcode_problems WHERE active=1) AS corpus
    FROM problem_embeddings e JOIN leetcode_problems p ON p.id=e.problem_id
    WHERE p.active=1 AND e.model_name=? AND e.content_hash=p.content_hash`, [EMBEDDING_MODEL]);
}

module.exports = { EMBEDDING_MODEL, EMBEDDING_DIMENSIONS, buildProblemEmbeddings, semanticSearch, getEmbeddingStatus, problemEmbeddingText };

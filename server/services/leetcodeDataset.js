const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const CSV_PATH = path.resolve(__dirname, '..', '..', 'leetcode.csv');
const REPORT_PATH = path.join(__dirname, '..', 'data', 'leetcode_quality_report.json');

function parseCsv(text) {
  const rows = [];
  let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i += 1; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"' && field.length === 0) quoted = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i += 1;
      row.push(field); field = '';
      if (row.some((value) => value.length)) rows.push(row);
      row = [];
    } else field += ch;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  if (!rows.length) return [];
  const headers = rows.shift().map((header) => header.replace(/^\uFEFF/, '').trim());
  return rows.map((values) => Object.fromEntries(headers.map((header, i) => [header, values[i] ?? ''])));
}

function numeric(value) {
  if (value == null || String(value).trim() === '') return null;
  const parsed = Number(String(value).replace(/,/g, '').replace(/%$/, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function parseArray(value) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map((item) => String(item).trim().replace(/^'|'$/g, '')) : [];
  } catch {
    const text = String(value).trim();
    const quoted = [...text.matchAll(/'((?:\\.|[^'])*)'|"((?:\\.|[^"])*)"/g)]
      .map((match) => (match[1] ?? match[2]).trim()).filter(Boolean);
    return quoted.length ? quoted : text.split(/[|;,]/).map((part) => part.trim().replace(/^['"\[\]]+|['"\[\]]+$/g, '')).filter(Boolean);
  }
}

function normalize(raw) {
  const id = Number(raw.id);
  const title = String(raw.title || '').trim();
  const description = String(raw.problem_description || '').trim();
  const tags = [...new Set(parseArray(raw.topic_tags).map((tag) => String(tag).trim()).filter(Boolean))];
  const difficulty = ['easy', 'medium', 'hard'].find((value) => value === String(raw.difficulty || '').trim().toLowerCase());
  const normalized = {
    id, title, description, difficulty: difficulty ? difficulty[0].toUpperCase() + difficulty.slice(1) : null,
    topic_tags: tags, is_premium: /^(true|1|yes)$/i.test(String(raw.is_premium || '').trim()) ? 1 : 0,
    similar_questions: parseArray(raw.similar_questions), acceptance: numeric(raw.acceptance),
    accepted: numeric(raw.accepted), submission: numeric(raw.submission), likes: numeric(raw.likes),
    dislikes: numeric(raw.dislikes), discussion_count: numeric(raw.discussion_count),
    problem_url: String(raw.problem_URL || '').trim() || null, solution_url: String(raw.solution_URL || '').trim() || null,
    raw_record: raw
  };
  normalized.content_hash = crypto.createHash('sha256').update(JSON.stringify({ ...normalized, content_hash: undefined })).digest('hex');
  return normalized;
}

function run(db, sql, params = []) {
  return new Promise((resolve, reject) => db.run(sql, params, function (err) {
    if (err) reject(err); else resolve(this);
  }));
}
function get(db, sql, params = []) {
  return new Promise((resolve, reject) => db.get(sql, params, (err, row) => err ? reject(err) : resolve(row)));
}

async function ingestCsv(db) {
  if (!fs.existsSync(CSV_PATH)) return { available: false, reason: 'leetcode.csv was not found in the project root.' };
  const parsedRows = parseCsv(fs.readFileSync(CSV_PATH, 'utf8'));
  const report = {
    source: path.basename(CSV_PATH), generated_at: new Date().toISOString(), rows_read: parsedRows.length,
    imported: 0, unchanged: 0, invalid_ids: 0, missing_titles: 0, missing_descriptions: 0,
    invalid_difficulties: 0, invalid_urls: 0, duplicate_ids: 0, duplicates: [], difficulty_counts: {},
    missing_description_ids: [], invalid_difficulty_ids: [], invalid_url_ids: []
  };
  const seen = new Set();
  const records = [];
  for (const raw of parsedRows) {
    const record = normalize(raw);
    if (!Number.isInteger(record.id) || record.id <= 0) { report.invalid_ids += 1; continue; }
    if (seen.has(record.id)) { report.duplicate_ids += 1; report.duplicates.push(record.id); continue; }
    seen.add(record.id);
    if (!record.title) report.missing_titles += 1;
    if (!record.description) { report.missing_descriptions += 1; report.missing_description_ids.push(record.id); }
    if (!record.difficulty) { report.invalid_difficulties += 1; report.invalid_difficulty_ids.push(record.id); }
    try { if (record.problem_url && !['http:', 'https:'].includes(new URL(record.problem_url).protocol)) throw new Error('invalid'); }
    catch { report.invalid_urls += 1; report.invalid_url_ids.push(record.id); }
    records.push(record);
  }

  const insert = `INSERT INTO leetcode_problems
    (id,title,description,difficulty,topic_tags,is_premium,similar_questions,acceptance,accepted,submission,likes,dislikes,discussion_count,problem_url,solution_url,content_hash,raw_record,has_description,active,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET title=excluded.title,description=excluded.description,difficulty=excluded.difficulty,
    topic_tags=excluded.topic_tags,is_premium=excluded.is_premium,similar_questions=excluded.similar_questions,
    acceptance=excluded.acceptance,accepted=excluded.accepted,submission=excluded.submission,likes=excluded.likes,
    dislikes=excluded.dislikes,discussion_count=excluded.discussion_count,problem_url=excluded.problem_url,
    solution_url=excluded.solution_url,content_hash=excluded.content_hash,raw_record=excluded.raw_record,
    has_description=excluded.has_description,active=1,updated_at=CURRENT_TIMESTAMP`;
  await run(db, 'BEGIN IMMEDIATE');
  try {
    await run(db, 'UPDATE leetcode_problems SET active=0');
    for (const record of records) {
      const prior = await get(db, 'SELECT content_hash FROM leetcode_problems WHERE id=?', [record.id]);
      if (prior && prior.content_hash === record.content_hash) {
        await run(db, 'UPDATE leetcode_problems SET active=1 WHERE id=?', [record.id]);
        report.unchanged += 1;
      } else {
        await run(db, insert, [record.id, record.title, record.description, record.difficulty,
          JSON.stringify(record.topic_tags), record.is_premium, JSON.stringify(record.similar_questions),
          record.acceptance, record.accepted, record.submission, record.likes, record.dislikes,
          record.discussion_count, record.problem_url, record.solution_url, record.content_hash,
          JSON.stringify(record.raw_record), record.description ? 1 : 0]);
        report.imported += 1;
      }
      if (record.difficulty) report.difficulty_counts[record.difficulty] = (report.difficulty_counts[record.difficulty] || 0) + 1;
    }
    // This is an external-content FTS5 table; rebuild its index from the
    // canonical table instead of issuing DELETE against the virtual table.
    await run(db, "INSERT INTO leetcode_problem_fts(leetcode_problem_fts) VALUES('rebuild')");
    await run(db, 'COMMIT');
  } catch (error) {
    await run(db, 'ROLLBACK');
    throw error;
  }
  report.active_records = records.length;
  report.unique_ids = seen.size;
  fs.writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`LeetCode CSV indexed: ${report.active_records} records (${report.imported} updated, ${report.unchanged} unchanged).`);
  return { available: true, ...report };
}

module.exports = { ingestCsv };

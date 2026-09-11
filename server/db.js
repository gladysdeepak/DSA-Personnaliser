const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'dsa_personaliser.db');
const db = new sqlite3.Database(DB_PATH);

function initDb() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // 1. Problems table
      db.run(`
        CREATE TABLE IF NOT EXISTS problems (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          leetcode_url TEXT,
          difficulty TEXT,
          topic TEXT,
          pattern TEXT,
          prerequisite_ids TEXT,
          similar_ids TEXT
        )
      `);

      // 2. Concepts table
      db.run(`
        CREATE TABLE IF NOT EXISTS concepts (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          category TEXT,
          description TEXT
        )
      `);

      // 3. Problem Concepts mapping table
      db.run(`
        CREATE TABLE IF NOT EXISTS problem_concepts (
          problem_id TEXT,
          concept_id TEXT,
          PRIMARY KEY (problem_id, concept_id),
          FOREIGN KEY (problem_id) REFERENCES problems(id),
          FOREIGN KEY (concept_id) REFERENCES concepts(id)
        )
      `);

      // 4. Attempts table
      db.run(`
        CREATE TABLE IF NOT EXISTS attempts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          problem_id TEXT NOT NULL,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          status TEXT NOT NULL,
          time_spent_mins INTEGER DEFAULT 0,
          hint_used INTEGER DEFAULT 0,
          solution_viewed INTEGER DEFAULT 0,
          memorized INTEGER DEFAULT 0,
          difficulty_rating TEXT,
          failure_reasons TEXT,
          notes TEXT,
          FOREIGN KEY (problem_id) REFERENCES problems(id)
        )
      `);

      // 5. Concept Mastery table
      db.run(`
        CREATE TABLE IF NOT EXISTS user_concept_mastery (
          concept_id TEXT PRIMARY KEY,
          mastery_score REAL DEFAULT 0,
          total_attempts INTEGER DEFAULT 0,
          failed_count INTEGER DEFAULT 0,
          solution_count INTEGER DEFAULT 0,
          is_weakness INTEGER DEFAULT 0,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (concept_id) REFERENCES concepts(id)
        )
      `);

      // Seed data if empty
      db.get('SELECT COUNT(*) as count FROM problems', (err, row) => {
        if (err) return reject(err);
        if (row.count === 0) {
          seedInitialData().then(resolve).catch(reject);
        } else {
          resolve();
        }
      });
    });
  });
}

function seedInitialData() {
  return new Promise((resolve, reject) => {
    const seedPath = path.join(__dirname, 'data', 'neetcode150.json');
    if (!fs.existsSync(seedPath)) {
      return resolve();
    }
    const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf8'));

    db.serialize(() => {
      const stmtConcept = db.prepare(`
        INSERT INTO concepts (id, title, category, description)
        VALUES (?, ?, ?, ?)
      `);
      seedData.concepts.forEach((c) => {
        stmtConcept.run(c.id, c.title, c.category, c.description);
      });
      stmtConcept.finalize();

      const stmtProblem = db.prepare(`
        INSERT INTO problems (id, title, leetcode_url, difficulty, topic, pattern, prerequisite_ids, similar_ids)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const stmtPC = db.prepare(`
        INSERT INTO problem_concepts (problem_id, concept_id)
        VALUES (?, ?)
      `);

      seedData.problems.forEach((p) => {
        stmtProblem.run(
          p.id,
          p.title,
          p.leetcode_url,
          p.difficulty,
          p.topic,
          p.pattern,
          JSON.stringify(p.prerequisite_ids || []),
          JSON.stringify(p.similar_ids || [])
        );

        if (p.concepts && Array.isArray(p.concepts)) {
          p.concepts.forEach((cid) => {
            stmtPC.run(p.id, cid);
          });
        }
      });

      stmtProblem.finalize();
      stmtPC.finalize();

      // Initialize concept mastery rows
      const stmtMastery = db.prepare(`
        INSERT INTO user_concept_mastery (concept_id, mastery_score, total_attempts, failed_count, solution_count, is_weakness)
        VALUES (?, 100.0, 0, 0, 0, 0)
      `);
      seedData.concepts.forEach((c) => {
        stmtMastery.run(c.id);
      });
      stmtMastery.finalize();

      console.log('Seeded database with NeetCode 150 dataset.');
      resolve();
    });
  });
}

module.exports = {
  db,
  initDb
};

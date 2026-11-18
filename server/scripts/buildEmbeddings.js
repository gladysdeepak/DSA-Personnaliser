require('dotenv').config();

const { db, initDb } = require('../db');
const { buildProblemEmbeddings } = require('../services/embeddingService');

async function main() {
  try {
    const provider = String(process.env.AI_PROVIDER || (process.env.GEMINI_API_KEY ? 'gemini' : 'openai')).toLowerCase();
    const keyName = provider === 'gemini' ? 'GEMINI_API_KEY' : 'OPENAI_API_KEY';
    if (!process.env[keyName]) throw new Error(`${keyName} is required. Add it to .env before building embeddings.`);
    await initDb();
    const result = await buildProblemEmbeddings({
      onProgress: ({ completed, total }) => console.log(`Embedded ${completed}/${total} changed problems.`)
    });
    console.log(`Semantic index ready: ${result.indexed}/${result.corpus} problems, ${result.dimensions} dimensions, ${result.model}.`);
  } finally {
    db.close();
  }
}

main().catch((error) => {
  console.error(`Embedding build failed: ${error.message}`);
  process.exitCode = 1;
});

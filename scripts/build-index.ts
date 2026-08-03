/**
 * Build the vector index for RAG.
 *
 * Reads every retrievable chunk (derived from `data/intents/*.json`), embeds each
 * one with the configured embedding model, and writes `.data/vector-store.json`.
 *
 * Requires either `AI_GATEWAY_API_KEY` or `OPENAI_API_KEY`.
 *
 * Usage: npm run index:build
 */
import { loadChunks, saveVectorStore } from '../lib/rag';
import { embedTexts } from '../lib/embeddings';
import { config, hasLLM } from '../lib/config';

async function main() {
  if (!hasLLM()) {
    console.error('No embedding provider configured. Set AI_GATEWAY_API_KEY or OPENAI_API_KEY.');
    process.exit(1);
  }
  const chunks = await loadChunks();
  console.log(`Embedding ${chunks.length} chunks with ${config.embeddingModel}...`);
  const texts = chunks.map((c) => `${c.title}\n${c.text}`);

  const batchSize = 64;
  const embeddings: number[][] = [];
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const partial = await embedTexts(batch);
    embeddings.push(...partial);
    console.log(`  embedded ${Math.min(i + batchSize, texts.length)}/${texts.length}`);
  }

  await saveVectorStore({
    model: config.embeddingModel,
    entries: chunks.map((c, i) => ({ ...c, embedding: embeddings[i] })),
  });
  console.log(`Wrote .data/vector-store.json with ${chunks.length} entries.`);
}

main().catch((err) => {
  console.error('[build-index] failed:', err);
  process.exit(1);
});

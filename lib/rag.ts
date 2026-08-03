import { promises as fs } from 'node:fs';
import path from 'node:path';
import { loadIntents, type Intent } from './intents';

export type KnowledgeChunk = {
  id: string;
  intent: string;
  title: string;
  text: string;
  sourceTitle: string;
  sourceUrl: string;
};

export type RetrievedChunk = KnowledgeChunk & { score: number };

const VECTOR_STORE_PATH = path.join(process.cwd(), '.data', 'vector-store.json');

type VectorStoreEntry = KnowledgeChunk & { embedding: number[] };
type VectorStore = { model: string; entries: VectorStoreEntry[] };

let cachedChunks: KnowledgeChunk[] | null = null;
let cachedStore: VectorStore | null | undefined;

export async function loadChunks(): Promise<KnowledgeChunk[]> {
  if (cachedChunks) return cachedChunks;
  const intents = await loadIntents();
  const chunks: KnowledgeChunk[] = [];
  for (const intent of intents) {
    const primarySource = intent.sources[0] ?? { title: 'Unknown', url: '' };
    chunks.push({
      id: `${intent.tag}:response`,
      intent: intent.tag,
      title: `${intent.tag} :: first-aid guidance`,
      text: intent.response,
      sourceTitle: primarySource.title,
      sourceUrl: primarySource.url,
    });
    if (intent.red_flags.length > 0) {
      chunks.push({
        id: `${intent.tag}:red_flags`,
        intent: intent.tag,
        title: `${intent.tag} :: red flags requiring assessment`,
        text: `Get medical assessment for any of these signs: ${intent.red_flags.join('; ')}.`,
        sourceTitle: primarySource.title,
        sourceUrl: primarySource.url,
      });
    }
    for (const src of intent.sources.slice(1)) {
      chunks.push({
        id: `${intent.tag}:src:${src.title}`,
        intent: intent.tag,
        title: `${intent.tag} :: additional source`,
        text: `Additional guidance on ${intent.scope}. See: ${src.title}.`,
        sourceTitle: src.title,
        sourceUrl: src.url,
      });
    }
  }
  cachedChunks = chunks;
  return chunks;
}

async function loadVectorStore(): Promise<VectorStore | null> {
  if (cachedStore !== undefined) return cachedStore;
  try {
    const raw = await fs.readFile(VECTOR_STORE_PATH, 'utf-8');
    cachedStore = JSON.parse(raw) as VectorStore;
  } catch {
    cachedStore = null;
  }
  return cachedStore;
}

export async function saveVectorStore(store: VectorStore): Promise<void> {
  await fs.mkdir(path.dirname(VECTOR_STORE_PATH), { recursive: true });
  await fs.writeFile(VECTOR_STORE_PATH, JSON.stringify(store), 'utf-8');
  cachedStore = store;
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

// --- BM25-lite fallback ---

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

const STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'from', 'that', 'this', 'have', 'has', 'had',
  'not', 'but', 'you', 'your', 'are', 'was', 'were', 'been', 'get', 'got',
  'can', 'may', 'will', 'would', 'should', 'could', 'about', 'into',
]);

function bm25Score(query: string[], doc: string[]): number {
  const k1 = 1.5;
  const b = 0.75;
  const avgDocLen = 40;
  const docLen = doc.length;
  const tf = new Map<string, number>();
  for (const t of doc) tf.set(t, (tf.get(t) ?? 0) + 1);
  let score = 0;
  for (const q of query) {
    const f = tf.get(q) ?? 0;
    if (f === 0) continue;
    const idf = 1.5;
    score += idf * ((f * (k1 + 1)) / (f + k1 * (1 - b + b * (docLen / avgDocLen))));
  }
  return score;
}

// --- Public retrieve ---

export async function retrieve(query: string, topK = 5): Promise<{ hits: RetrievedChunk[]; mode: 'embedding' | 'bm25' | 'none' }> {
  const chunks = await loadChunks();
  if (chunks.length === 0) return { hits: [], mode: 'none' };

  const store = await loadVectorStore();
  if (store && store.entries.length > 0) {
    try {
      const { embedText } = await import('./embeddings');
      const queryEmbedding = await embedText(query);
      const scored = store.entries.map((entry) => ({
        ...entry,
        score: cosineSimilarity(queryEmbedding, entry.embedding),
      }));
      scored.sort((a, b) => b.score - a.score);
      return {
        hits: scored.slice(0, topK).map(({ embedding: _e, ...rest }) => rest),
        mode: 'embedding',
      };
    } catch (err) {
      console.warn('[rag] embedding retrieval failed, falling back to BM25:', err);
    }
  }

  const queryTokens = tokenize(query);
  const scored = chunks.map((chunk) => ({
    ...chunk,
    score: bm25Score(queryTokens, tokenize(chunk.text + ' ' + chunk.intent + ' ' + chunk.title)),
  }));
  scored.sort((a, b) => b.score - a.score);
  return { hits: scored.slice(0, topK).filter((c) => c.score > 0), mode: 'bm25' };
}

export function formatContext(hits: RetrievedChunk[]): string {
  if (hits.length === 0) return '(no retrieved passages)';
  return hits
    .map((h, i) => `[${i + 1}] (${h.intent}) ${h.text}\n    source: ${h.sourceTitle} - ${h.sourceUrl}`)
    .join('\n\n');
}

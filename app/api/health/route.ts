import { config, hasLLM } from '@/lib/config';
import { loadIntents } from '@/lib/intents';
import { loadChunks } from '@/lib/rag';
import { promises as fs } from 'node:fs';
import path from 'node:path';

export const runtime = 'nodejs';

export async function GET() {
  const intents = await loadIntents();
  const chunks = await loadChunks();
  let vectorStore: { present: boolean; entries: number; model?: string } = { present: false, entries: 0 };
  try {
    const raw = await fs.readFile(path.join(process.cwd(), '.data', 'vector-store.json'), 'utf-8');
    const parsed = JSON.parse(raw);
    vectorStore = { present: true, entries: parsed.entries?.length ?? 0, model: parsed.model };
  } catch {}

  return Response.json({
    status: 'ok',
    llm: hasLLM() ? { enabled: true, model: config.model, gateway: config.hasAIGateway } : { enabled: false },
    embeddings: hasLLM() ? { model: config.embeddingModel } : { model: 'none' },
    intents: { count: intents.length, tags: intents.map((i) => i.tag) },
    corpus: { chunks: chunks.length },
    vectorStore,
    locale: config.locale,
  });
}

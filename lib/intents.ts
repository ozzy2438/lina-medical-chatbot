import { promises as fs } from 'node:fs';
import path from 'node:path';

export type Source = { title: string; url: string };
export type IntentRoute = 'routine' | 'urgent_if_flags' | 'emergency' | 'poison_control';

export type Intent = {
  tag: string;
  route: IntentRoute;
  scope: string;
  patterns: string[];
  response: string;
  red_flags: string[];
  sources: Source[];
};

export type IntentIndex = {
  version: string;
  reviewed: string;
  fallback: string;
  intent_files: string[];
};

const INTENTS_DIR = path.join(process.cwd(), 'data', 'intents');
const INDEX_PATH = path.join(process.cwd(), 'data', 'intents.json');

let cachedIndex: IntentIndex | null = null;
let cachedIntents: Intent[] | null = null;

export async function loadIndex(): Promise<IntentIndex> {
  if (cachedIndex) return cachedIndex;
  const raw = await fs.readFile(INDEX_PATH, 'utf-8');
  cachedIndex = JSON.parse(raw) as IntentIndex;
  return cachedIndex;
}

export async function loadIntents(): Promise<Intent[]> {
  if (cachedIntents) return cachedIntents;
  const index = await loadIndex();
  const results: Intent[] = [];
  for (const tag of index.intent_files) {
    try {
      const raw = await fs.readFile(path.join(INTENTS_DIR, `${tag}.json`), 'utf-8');
      results.push(JSON.parse(raw) as Intent);
    } catch (err) {
      console.warn(`[intents] failed to load ${tag}:`, err);
    }
  }
  cachedIntents = results;
  return results;
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokens(text: string): Set<string> {
  return new Set(normalize(text).split(' ').filter((w) => w.length > 2));
}

export type Classification = {
  intent: Intent | null;
  tag: string;
  score: number;
  normalizedScore: number;
  fallback: string;
  ranked: { tag: string; score: number }[];
};

export async function classify(userText: string): Promise<Classification> {
  const intents = await loadIntents();
  const index = await loadIndex();
  const messageNorm = normalize(userText);
  const messageTokens = tokens(userText);

  const ranked = intents.map((intent) => {
    let score = 0;
    for (const pattern of intent.patterns) {
      const patternNorm = normalize(pattern);
      if (messageNorm.includes(patternNorm)) score += 12;
      for (const t of tokens(pattern)) {
        if (messageTokens.has(t)) score += 1;
      }
    }
    return { intent, tag: intent.tag, score };
  });

  ranked.sort((a, b) => b.score - a.score);
  const best = ranked[0];
  const maxPossible = 20;
  const normalizedScore = Math.min(1, best?.score / maxPossible);

  return {
    intent: best && best.score >= 2 ? best.intent : null,
    tag: best?.tag ?? 'fallback',
    score: best?.score ?? 0,
    normalizedScore,
    fallback: index.fallback,
    ranked: ranked.slice(0, 5).map((r) => ({ tag: r.tag, score: r.score })),
  };
}

/** Back-compat helper used by legacy consumers. */
export async function getReply(userText: string) {
  const { intent, fallback } = await classify(userText);
  if (!intent) return { intent: 'fallback', message: fallback, urgent: false };
  return {
    intent: intent.tag,
    message: intent.response,
    urgent: intent.route === 'emergency' || intent.route === 'poison_control',
  };
}

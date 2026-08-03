import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const DATA_DIR = path.join(process.cwd(), '.data');
const SESSIONS_PATH = path.join(DATA_DIR, 'sessions.json');
const TELEMETRY_PATH = path.join(DATA_DIR, 'telemetry.jsonl');

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

export type Session = {
  id: string;
  createdAt: string;
  lastActiveAt: string;
  turns: number;
};

async function readSessions(): Promise<Record<string, Session>> {
  await ensureDir();
  try {
    const raw = await fs.readFile(SESSIONS_PATH, 'utf-8');
    return JSON.parse(raw) as Record<string, Session>;
  } catch {
    return {};
  }
}

async function writeSessions(sessions: Record<string, Session>) {
  await ensureDir();
  await fs.writeFile(SESSIONS_PATH, JSON.stringify(sessions, null, 2), 'utf-8');
}

export async function touchSession(id?: string): Promise<Session> {
  const sessions = await readSessions();
  const now = new Date().toISOString();
  if (id && sessions[id]) {
    sessions[id].lastActiveAt = now;
    sessions[id].turns += 1;
  } else {
    id = id ?? randomUUID();
    sessions[id] = { id, createdAt: now, lastActiveAt: now, turns: 1 };
  }
  await writeSessions(sessions);
  return sessions[id];
}

export type TelemetryEvent = {
  ts: string;
  sessionId: string;
  route: string;
  intent?: string;
  score?: number;
  retrievalHits?: number;
  generation: 'llm' | 'deterministic' | 'safety-static';
  latencyMs: number;
  safetyMatches?: string[];
  tools?: string[];
  error?: string;
};

export async function logEvent(event: TelemetryEvent) {
  await ensureDir();
  await fs.appendFile(TELEMETRY_PATH, JSON.stringify(event) + '\n', 'utf-8');
}

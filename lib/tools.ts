import { tool } from 'ai';
import { z } from 'zod';
import { retrieve, formatContext } from './rag';
import { logEvent } from './db';

/**
 * Tools exposed to the LLM. All tool executions are logged to telemetry so a reviewer
 * can audit what evidence the model asked for and what safety events it flagged.
 */
export function buildTools(sessionId: string) {
  return {
    retrieveKnowledge: tool({
      description:
        'Retrieve additional first-aid passages from the curated knowledge corpus. Use only for topics that fall within Lina\u2019s scope (everyday minor injuries). Do not call for emergencies or poisoning \u2014 the safety gate has already routed those.',
      inputSchema: z.object({
        query: z.string().min(3).describe('A short search query describing the injury or question.'),
        topK: z.number().int().min(1).max(8).default(4).describe('How many passages to retrieve.'),
      }),
      execute: async ({ query, topK }) => {
        const { hits, mode } = await retrieve(query, topK);
        await logEvent({
          ts: new Date().toISOString(),
          sessionId,
          route: 'routine',
          generation: 'llm',
          latencyMs: 0,
          retrievalHits: hits.length,
          tools: ['retrieveKnowledge'],
        });
        return {
          mode,
          count: hits.length,
          passages: hits.map((h) => ({
            intent: h.intent,
            text: h.text,
            source: `${h.sourceTitle} - ${h.sourceUrl}`,
          })),
          formatted: formatContext(hits),
        };
      },
    }),
    logSafetyEvent: tool({
      description:
        'Record a structured safety concern the model observed in the conversation (e.g., late-appearing red flag). Use this before or alongside advising the user to seek urgent or emergency care.',
      inputSchema: z.object({
        concern: z.string().min(3).describe('Short description of the safety concern.'),
        severity: z.enum(['info', 'urgent', 'emergency']).default('urgent'),
        recommendedAction: z.string().min(3),
      }),
      execute: async ({ concern, severity, recommendedAction }) => {
        await logEvent({
          ts: new Date().toISOString(),
          sessionId,
          route: severity === 'emergency' ? 'emergency' : severity === 'urgent' ? 'urgent' : 'routine',
          generation: 'llm',
          latencyMs: 0,
          tools: ['logSafetyEvent'],
          safetyMatches: [`llm:${severity}:${concern}`],
        });
        return { logged: true, severity, recommendedAction };
      },
    }),
  };
}

import { streamText } from 'ai';
import { checkSafety } from './safety';
import { classify } from './intents';
import { retrieve, formatContext } from './rag';
import { buildSystemPrompt } from './prompt';
import { buildTools } from './tools';
import { getChatModel } from './model';
import { config, hasLLM } from './config';
import { logEvent, touchSession } from './db';
import { streamTextResponse, renderDeterministic } from './streaming';

export type ChatMessage = { role: 'user' | 'assistant' | 'system'; content: string };

export async function handleChat(
  messages: ChatMessage[],
  sessionIdHint?: string,
): Promise<Response> {
  const startedAt = Date.now();
  const session = await touchSession(sessionIdHint);
  const lastUser = [...messages].reverse().find((m) => m.role === 'user');
  const userText = lastUser?.content?.trim() ?? '';

  // Layer 1 — Deterministic safety gate.
  const safety = checkSafety(userText);
  if (safety.route !== 'routine') {
    const text = safety.message ?? 'This may need urgent care. Please contact local emergency services.';
    await logEvent({
      ts: new Date().toISOString(),
      sessionId: session.id,
      route: safety.route,
      generation: 'safety-static',
      latencyMs: Date.now() - startedAt,
      safetyMatches: safety.matches,
    });
    return streamTextResponse(text);
  }

  // Layer 2 — Intent classification.
  const classification = await classify(userText);

  // Layer 3 — RAG retrieval.
  const retrieveQuery = classification.intent
    ? `${classification.intent.tag} ${userText}`
    : userText;
  const { hits, mode } = await retrieve(retrieveQuery, config.topK);

  // Layer 4 — Generation.
  if (hasLLM()) {
    try {
      const model = await getChatModel();
      const systemPrompt = buildSystemPrompt({
        intent: classification.intent,
        hits,
        safety,
        fallback: classification.fallback,
      });
      const result = streamText({
        model: model as any,
        system: systemPrompt,
        messages: messages.map((m) => ({ role: m.role, content: m.content })) as any,
        temperature: config.temperature,
        tools: buildTools(session.id),
      });

      // Fire-and-forget telemetry after the stream is initiated.
      logEvent({
        ts: new Date().toISOString(),
        sessionId: session.id,
        route: 'routine',
        intent: classification.tag,
        score: classification.normalizedScore,
        retrievalHits: hits.length,
        generation: 'llm',
        latencyMs: Date.now() - startedAt,
      }).catch(() => {});

      return result.toTextStreamResponse({
        headers: { 'x-lina-mode': `llm+${mode}` },
      });
    } catch (err) {
      console.error('[pipeline] LLM path failed, falling back to deterministic:', err);
      // fall through
    }
  }

  // Layer 4b — Deterministic composer.
  const intent = classification.intent;
  const text = intent
    ? renderDeterministic({
        header: 'Here is what I can share for what you described:',
        bodyLines: [intent.response, '', 'Related passages from the knowledge base:', formatContext(hits)],
        redFlags: intent.red_flags,
        sources: intent.sources,
      })
    : renderDeterministic({
        header: classification.fallback,
        bodyLines: hits.length > 0 ? ['', 'Possibly relevant passages:', formatContext(hits)] : [],
      });

  await logEvent({
    ts: new Date().toISOString(),
    sessionId: session.id,
    route: 'routine',
    intent: classification.tag,
    score: classification.normalizedScore,
    retrievalHits: hits.length,
    generation: 'deterministic',
    latencyMs: Date.now() - startedAt,
  });

  const res = streamTextResponse(text);
  res.headers.set('x-lina-mode', `deterministic+${mode}`);
  res.headers.set('x-lina-session', session.id);
  return res;
}

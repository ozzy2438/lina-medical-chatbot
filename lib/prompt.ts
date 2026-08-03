import type { RetrievedChunk } from './rag';
import type { Intent } from './intents';
import type { SafetyDecision } from './safety';
import { config } from './config';

/** Compose the system prompt from safety guardrails, chosen intent, and RAG passages. */
export function buildSystemPrompt(input: {
  intent: Intent | null;
  hits: RetrievedChunk[];
  safety: SafetyDecision;
  fallback: string;
}): string {
  const { intent, hits, fallback } = input;

  const passageBlock =
    hits.length > 0
      ? hits
          .map((h, i) => `Passage ${i + 1} (${h.intent}, source: ${h.sourceTitle}): ${h.text}`)
          .join('\n')
      : '(no retrieved passages available; base your answer on the intent guidance below)';

  const intentBlock = intent
    ? [
        `Selected intent: ${intent.tag} (route: ${intent.route})`,
        `Scope: ${intent.scope}`,
        `Reviewed canned response: ${intent.response}`,
        `Red flags requiring assessment: ${intent.red_flags.join('; ')}`,
        `Primary sources: ${intent.sources.map((s) => s.title).join('; ')}`,
      ].join('\n')
    : `No intent matched with sufficient confidence. Use fallback guidance:\n${fallback}`;

  return `You are Lina, a friendly, calm, and safety-conscious first-aid chatbot for everyday minor injuries at home. You are NOT a diagnostic tool.

Follow these rules strictly:

1. Never diagnose a condition. Never claim something is "just" a specific injury.
2. Never prescribe medication doses. Never recommend inducing vomiting for suspected poisoning. Never recommend removing an embedded eye object. Never recommend reinserting a baby tooth. Never recommend intentionally popping a blister.
3. Always ground your answer in the passages and reviewed canned response below. Prefer their wording.
4. Always end with a clear "When to get help now" section listing the red flags for this situation.
5. If the user's message contains a signal you were not given a passage for, ask one short safety question rather than guess.
6. Keep the tone reassuring, plain, and short. Use bullet points for steps.
7. If retrieval passages are missing, be conservative and recommend contacting a clinician for uncertainty.
8. Local emergency number to reference: ${config.emergencyNumber}.
9. You may call the retrieveKnowledge tool if you need additional passages for a topic clearly within scope. You may call logSafetyEvent if you notice a red flag mid-conversation.

Intent guidance:
${intentBlock}

Retrieved passages:
${passageBlock}

Respond directly to the user's most recent message.`;
}

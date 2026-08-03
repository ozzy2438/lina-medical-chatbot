# Architecture

Lina v2 is a **layered safety-first chatbot** for everyday injury guidance. The design assumes:

- Emergency and poison-exposure signals must never depend on a probabilistic model.
- LLM output must be grounded in curated, cited passages, not free recall.
- The pipeline must degrade gracefully when no API key is available.
- Every decision must be observable (telemetry) and reproducible (versioned intents).

## Data flow

```
                           HTTP POST /api/chat
                                   \u2502
                                   \u25bc
        \u250c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510
        \u2502  1. Safety gate (deterministic)                \u2502
        \u2502     regex + phrase lexicon                      \u2502
        \u2502     \u2192 emergency | poison | urgent | routine     \u2502
        \u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u252c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518
                      \u2502
     non-routine \u25c4\u2500\u2500\u2500\u2500\u2524\u2500\u2500\u2500\u2500\u25ba routine
     short reviewed  \u2502           \u2502
     response        \u2502           \u25bc
                     \u2502   \u250c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510\n                     \u2502   \u2502  2. Intent classifier      \u2502\n                     \u2502   \u2502     keyword score + slots   \u2502\n                     \u2502   \u2514\u2500\u2500\u2500\u2500\u2500\u2500\u252c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518\n                     \u2502          \u2502\n                     \u2502          \u25bc\n                     \u2502   \u250c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510\n                     \u2502   \u2502  3. RAG retrieval          \u2502\n                     \u2502   \u2502  cosine similarity if       \u2502\n                     \u2502   \u2502  embeddings built,          \u2502\n                     \u2502   \u2502  else BM25-lite over MDX    \u2502\n                     \u2502   \u2514\u2500\u2500\u2500\u2500\u2500\u2500\u252c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518\n                     \u2502          \u2502\n                     \u2502          \u25bc\n                     \u2502   \u250c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510\n                     \u2502   \u2502  4. Generation             \u2502\n                     \u2502   \u2502   \u2022 streamText + tools if   \u2502\n                     \u2502   \u2502     API key present         \u2502\n                     \u2502   \u2502   \u2022 deterministic composer  \u2502\n                     \u2502   \u2502     otherwise               \u2502\n                     \u2502   \u2514\u2500\u2500\u2500\u2500\u2500\u2500\u252c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518\n                     \u2502          \u2502\n                     \u25bc          \u25bc\n              \u250c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510\n              \u2502  5. Streaming response + telemetry \u2502\n              \u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518\n```

## Layer responsibilities

### 1. Safety gate (`lib/safety.ts`)

Runs first. Uses a reviewed lexicon of emergency phrases (\"cannot breathe\", \"unconscious\", \"seizure\", \"turning blue\"...), poison-exposure phrases (\"swallowed cleaner\", \"took wrong dose\"...), and eye-chemical phrases (\"bleach in eye\"...). Any match short-circuits the pipeline to a reviewed, source-cited emergency response. A classifier score never overrides a safety match.

### 2. Intent classifier (`lib/intents.ts`)

A keyword-scoring classifier trained on the patterns in `data/intents.json`. Each intent carries:

- `tag`, `route` (routine | urgent | emergency | poison)
- `patterns` (10\u201315 realistic user phrases)
- `response` (reviewed canned reply used for deterministic path and as system-prompt scaffold for LLM)
- `red_flags` (short escalation list)
- `exclusions`, `slots`, `sources`

The classifier also extracts safety slots (breathing, alertness, vision, tooth type, animal type) when present in the message.

### 3. RAG retrieval (`lib/rag.ts`)

Two retrievers with the same interface:

- **Embedding retriever**: reads `.data/vector-store.json` (built by `scripts/build-index.ts` using Vercel AI SDK `embedMany`), computes cosine similarity, returns top-k passages.
- **BM25-lite fallback**: tokenizes each knowledge chunk, scores by term overlap with a length penalty. Works without any API key.

The corpus lives in `data/knowledge.jsonl` \u2014 one JSON per line with source attribution.

### 4. Generation (`lib/pipeline.ts` + `app/api/chat/route.ts`)

If `AI_GATEWAY_API_KEY` or `OPENAI_API_KEY` is set, the pipeline calls `streamText` from the Vercel AI SDK with:

- A system prompt built from the intent's canned response, the top-k RAG passages, and hard safety guardrails
- A history of the chat converted to model messages
- Tools: `retrieveKnowledge` (extra passage lookup) and `logSafetyEvent` (structured incident log)

Without an API key, the pipeline composes the same information deterministically \u2014 canned response, retrieved passages, red-flag block \u2014 and streams it as chunks.

### 5. Streaming + telemetry

Both LLM and deterministic paths return `text/plain` streaming. The UI reads the body reader chunk by chunk and updates the last assistant message. Every request writes an entry to `.data/telemetry.jsonl` with the safety decision, chosen intent, retrieval hits, generation mode, and latency.

## Multi-store rationale

| Store | Why separate |\n|---|---|\n| `data/intents.json` | Product-reviewed content that must be versioned and diffable |\n| `data/knowledge.jsonl` | Longer paraphrased passages meant for retrieval, kept independent of the classifier |\n| `.data/vector-store.json` | Rebuild-only artifact so it never blocks source-of-truth edits |\n| `.data/sessions.json` | Ephemeral session index for the UI |\n| `.data/telemetry.jsonl` | Append-only audit trail for safety review |\n\nThis separation lets a medical reviewer update wording, a data engineer rebuild embeddings, and a product team edit patterns without touching each other's files.\n
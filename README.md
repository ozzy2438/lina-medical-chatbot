# Lina v2 — Everyday Injury Helper (RAG + LLM + Layered Safety)

Lina is a safety-conscious first-aid chatbot for common home injuries. Version 2 upgrades the original keyword classifier into a **layered architecture** combining:

- **Deterministic safety gate** — regex-driven emergency and poison-exposure override that runs *before* any LLM call
- **Intent classifier** — evidence-based taxonomy of 14+ intents with red-flag exclusions, slot requirements, and source citations
- **RAG (Retrieval-Augmented Generation)** — curated first-aid knowledge corpus (Mayo Clinic, NHS, CDC, MedlinePlus, Red Cross, Poison Control, HealthyChildren, Healthdirect) with either cosine-similarity embedding retrieval or a BM25-lite keyword fallback
- **LLM streaming with tool calling** — Vercel AI SDK v6 `streamText` with typed tools for retrieval and safety logging, streamed to the browser via a plain text stream
- **Multi-store persistence** — JSON-backed session store, append-only JSON-lines telemetry log, and a versioned intents database
- **Graceful degradation** — no API key? The deterministic pipeline still returns safe, evidence-based responses with retrieved passages

> **Safety note.** Lina provides general first-aid education, not medical diagnosis. Every response ends with a red-flag escalation list. The system routes urgent phrases to emergency services or Poison Control before consulting the language model. See [docs/SAFETY.md](./docs/SAFETY.md).

## Architecture at a glance

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full description and diagram.

```
User message
    │
    ▼
[1] Safety gate ─── emergency | poison | urgent ──► short reviewed reply + escalation
    │ routine
    ▼
[2] Intent classifier (keyword + slot extraction)
    │
    ▼
[3] RAG retrieval (embeddings if available, else BM25 fallback)
    │
    ▼
[4] LLM (streamText + tools) OR deterministic composer
    │
    ▼
[5] Streamed reply + telemetry log
```

## Run locally

```bash
cp .env.example .env.local   # optional: add AI_GATEWAY_API_KEY or OPENAI_API_KEY
npm install
npm run dev
```

Open http://localhost:3000

### Build the vector index (optional, needs API key)

```bash
npm run index:build
```

This embeds `data/knowledge.jsonl` into `.data/vector-store.json`. If you skip this step, Lina uses the BM25-lite keyword retriever over the same corpus — the pipeline still works.

### Tests

```bash
npm test
```

Covers the safety gate, intent classifier, and retrieval fallback. No API key required.

## Data stores

| Store | Path | Purpose |
|---|---|---|
| Intents (versioned) | `data/intents.json` | Canonical intent taxonomy, patterns, canned responses, red flags, sources |
| Knowledge corpus | `data/knowledge.jsonl` | Paraphrased first-aid passages with source attribution — used by RAG |
| Vector index | `.data/vector-store.json` | Embedded chunks (built on demand) |
| Sessions | `.data/sessions.json` | Chat session metadata |
| Telemetry | `.data/telemetry.jsonl` | Safety events, route decisions, tool calls (append-only) |

## Environment

| Variable | Default | Purpose |
|---|---|---|
| `AI_GATEWAY_API_KEY` | — | Enables LLM path via Vercel AI Gateway |
| `OPENAI_API_KEY` | — | Alternative direct OpenAI access |
| `LINA_MODEL` | `openai/gpt-4o-mini` | Chat model id |
| `LINA_EMBEDDING_MODEL` | `openai/text-embedding-3-small` | Embedding model id |
| `LINA_TEMPERATURE` | `0.2` | LLM temperature |
| `LINA_TOP_K` | `5` | RAG top-k |
| `LINA_LOCALE` | `en-US` | Response locale |
| `LINA_EMERGENCY_NUMBER` | your local emergency number | Localized emergency instruction |

## Not a substitute for medical care

If someone may be in immediate danger, has trouble breathing, is unconscious, has uncontrolled bleeding, is choking, may have been poisoned, has a knocked-out permanent tooth, or has a suspected chemical eye splash, follow the on-screen escalation instructions and contact local emergency services or Poison Control directly.

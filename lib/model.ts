import { config } from './config';

/**
 * Provider factory. Returns a LanguageModel-compatible reference the AI SDK can consume.
 *
 * With `AI_GATEWAY_API_KEY` set, the AI SDK v6 accepts `"openai/gpt-4o-mini"` as a
 * bare string and routes it through the Vercel AI Gateway. With `OPENAI_API_KEY` set,
 * the `@ai-sdk/openai` provider maps the model id directly.
 */
export async function getChatModel() {
  if (config.hasAIGateway) {
    // AI Gateway accepts provider/model strings directly.
    return config.model;
  }
  if (config.hasOpenAI) {
    const { openai } = await import('@ai-sdk/openai');
    const stripped = config.model.startsWith('openai/')
      ? config.model.slice('openai/'.length)
      : config.model;
    return openai(stripped);
  }
  throw new Error('No LLM provider configured. Set AI_GATEWAY_API_KEY or OPENAI_API_KEY.');
}

export async function getEmbeddingModel() {
  if (config.hasAIGateway) {
    return config.embeddingModel;
  }
  if (config.hasOpenAI) {
    const { openai } = await import('@ai-sdk/openai');
    const stripped = config.embeddingModel.startsWith('openai/')
      ? config.embeddingModel.slice('openai/'.length)
      : config.embeddingModel;
    return openai.textEmbeddingModel(stripped);
  }
  throw new Error('No embedding provider configured. Set AI_GATEWAY_API_KEY or OPENAI_API_KEY.');
}

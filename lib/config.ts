export const config = {
  model: process.env.LINA_MODEL ?? 'openai/gpt-4o-mini',
  embeddingModel: process.env.LINA_EMBEDDING_MODEL ?? 'openai/text-embedding-3-small',
  temperature: Number(process.env.LINA_TEMPERATURE ?? 0.2),
  topK: Number(process.env.LINA_TOP_K ?? 5),
  locale: process.env.LINA_LOCALE ?? 'en-US',
  emergencyNumber: process.env.LINA_EMERGENCY_NUMBER ?? 'your local emergency number',
  hasAIGateway: Boolean(process.env.AI_GATEWAY_API_KEY),
  hasOpenAI: Boolean(process.env.OPENAI_API_KEY),
};

export function hasLLM(): boolean {
  return config.hasAIGateway || config.hasOpenAI;
}

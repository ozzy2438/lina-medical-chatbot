import { embed, embedMany } from 'ai';
import { getEmbeddingModel } from './model';

export async function embedText(text: string): Promise<number[]> {
  const model = await getEmbeddingModel();
  const { embedding } = await embed({ model: model as any, value: text });
  return embedding;
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const model = await getEmbeddingModel();
  const { embeddings } = await embedMany({ model: model as any, values: texts });
  return embeddings;
}

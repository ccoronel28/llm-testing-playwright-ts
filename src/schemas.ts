import { z } from 'zod';

/**
 * Runtime schema for a structured sentiment-analysis response.
 * The most common LLM-integration bug is output that *looks* like JSON but violates the
 * contract (missing field, wrong type, out-of-range number). Zod catches all three.
 */
export const SentimentSchema = z.object({
  sentiment: z.enum(['positive', 'negative', 'neutral']),
  confidence: z.number().min(0).max(1),
  keywords: z.array(z.string()).min(1).max(10),
});

export type Sentiment = z.infer<typeof SentimentSchema>;

/** Safely parse model text as JSON, tolerating code fences the model may add. */
export function parseJsonLoose(text: string): unknown {
  const cleaned = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  return JSON.parse(cleaned);
}

import { test, expect } from '@playwright/test';
import { LlmClient } from '../src/llmClient';
import { SentimentSchema, parseJsonLoose } from '../src/schemas';

/**
 * Structured-output tests.
 * When an LLM feeds a downstream system, malformed output is the #1 production bug.
 * We force JSON, parse it, and validate the contract at runtime with Zod.
 */
test.describe('Structured output', () => {
  test('sentiment response conforms to schema', async ({ request }) => {
    const llm = new LlmClient(request);
    const res = await llm.ask(
      'Classify the sentiment of this review and return JSON with sentiment, confidence, keywords: ' +
        '"I love the great service and quality."',
      { json: true, temperature: 0 },
    );

    const parsed = parseJsonLoose(res.text);
    const result = SentimentSchema.safeParse(parsed);

    expect(
      result.success,
      `Output did not match schema: ${JSON.stringify(result, null, 2)}`,
    ).toBeTruthy();

    if (result.success) {
      expect(result.data.confidence).toBeGreaterThanOrEqual(0);
      expect(result.data.confidence).toBeLessThanOrEqual(1);
      expect(result.data.keywords.length).toBeGreaterThan(0);
    }
  });
});

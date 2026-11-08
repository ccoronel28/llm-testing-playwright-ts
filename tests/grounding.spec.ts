import { test } from '@playwright/test';
import { LlmClient } from '../src/llmClient';
import { expectGrounded, expectNoHallucinations } from '../src/assertions';

/**
 * Grounding tests: "sounds right" vs "is right".
 * The exact wording will vary, so we assert that required facts are present and that
 * known-wrong facts are absent — not that the string matches.
 */
test.describe('Grounding & hallucination', () => {
  test('answer contains the required fact', async ({ request }) => {
    const llm = new LlmClient(request);
    const res = await llm.ask('What is the capital of France? Answer in one sentence.', {
      temperature: 0,
    });
    expectGrounded(res.text, ['Paris']);
  });

  test('answer does not hallucinate a wrong capital', async ({ request }) => {
    const llm = new LlmClient(request);
    const res = await llm.ask('What is the capital of France? Answer in one sentence.', {
      temperature: 0,
    });
    expectNoHallucinations(res.text, ['London', 'Berlin', 'Madrid', 'Rome']);
  });
});

import { test, expect } from '@playwright/test';
import { LlmClient } from '../src/llmClient';
import { expectGrounded } from '../src/assertions';

/**
 * Self-consistency: the heart of non-deterministic testing.
 * We run the same prompt N times and assert the STABLE property holds every time,
 * accepting that surface wording differs. This catches intermittent regressions that
 * a single-run test would miss.
 */
test.describe('Self-consistency', () => {
  test('capital-of-France answer is stable across 5 runs', async ({ request }) => {
    const llm = new LlmClient(request);
    const runs = 5;
    const answers: string[] = [];

    for (let i = 0; i < runs; i++) {
      const res = await llm.ask('What is the capital of France? One sentence.', {
        temperature: 0.7, // deliberately non-zero to prove stability under variation
      });
      answers.push(res.text);
      expectGrounded(res.text, ['Paris']); // stable property must hold on every run
    }

    // Surface variety is expected and healthy; we just log it as evidence.
    const unique = new Set(answers.map((a) => a.trim()));
    test.info().annotations.push({
      type: 'consistency',
      description: `${unique.size} distinct phrasings across ${runs} runs; grounding held every time.`,
    });
    expect(answers.length).toBe(runs);
  });
});

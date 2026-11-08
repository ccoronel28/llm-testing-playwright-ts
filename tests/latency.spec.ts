import { test, expect } from '@playwright/test';
import { LlmClient } from '../src/llmClient';
import { percentile } from '../src/assertions';

/**
 * Latency as a tested SLO. LLM calls are slow and variable; treat p95 as a budget,
 * not an afterthought. Sample several calls and assert the percentile.
 */
test.describe('Latency SLO', () => {
  test('p95 latency stays within budget', async ({ request }) => {
    const llm = new LlmClient(request);
    // Real providers are far slower than the mock; set the budget from the environment
    // so the same test guards mock (CI) and live runs with appropriate thresholds.
    const budgetMs = Number(process.env.LATENCY_P95_MS ?? (llm.activeProvider === 'mock' ? 200 : 8000));
    const samples = 8;
    const latencies: number[] = [];

    for (let i = 0; i < samples; i++) {
      const res = await llm.ask('Say hello in one short sentence.', { temperature: 0 });
      latencies.push(res.latencyMs);
    }

    const p95 = percentile(latencies, 95);
    test.info().annotations.push({
      type: 'latency',
      description: `p95=${p95}ms over ${samples} samples (budget ${budgetMs}ms).`,
    });
    expect(p95, `p95 latency ${p95}ms exceeded budget ${budgetMs}ms`).toBeLessThanOrEqual(budgetMs);
  });
});

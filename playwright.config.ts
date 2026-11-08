import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  // LLM calls are slow and variable — give them room, but keep it a tested budget.
  timeout: 60_000,
  expect: { timeout: 15_000 },
  // Non-determinism means occasional legitimate variance; a single retry keeps
  // CI signal clean without hiding real regressions. Keep it low and visible.
  retries: process.env.CI ? 1 : 0,
  // Parallelism is safe here because tests are stateless API calls.
  fullyParallel: true,
  workers: process.env.CI ? 4 : undefined,
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    ['json', { outputFile: 'results.json' }],
  ],
  use: {
    trace: 'on-first-retry',
  },
});

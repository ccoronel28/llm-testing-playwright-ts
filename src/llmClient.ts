import { APIRequestContext } from '@playwright/test';

/**
 * Provider-agnostic LLM client.
 *
 * Design goals:
 *  - One interface, three backends: OpenAI-compatible, Anthropic-style, or a deterministic
 *    mock so the suite is green in CI with no API key and no cost.
 *  - Always returns latency, so latency can be asserted as an SLO.
 *  - Uses Playwright's `request` fixture as the HTTP client (real SDET pattern: the same
 *    tool drives UI and API tests).
 */

export interface LlmResponse {
  text: string;
  latencyMs: number;
  raw: unknown;
}

export interface AskOptions {
  system?: string;
  /** Force JSON-object output where the provider supports it. */
  json?: boolean;
  /** Lower = more deterministic. Consistency tests pin this low. */
  temperature?: number;
  maxTokens?: number;
}

type Provider = 'openai' | 'anthropic' | 'mock';

function resolveProvider(): Provider {
  const p = (process.env.LLM_PROVIDER ?? 'mock').toLowerCase();
  if (p === 'openai' || p === 'anthropic') {
    // Fall back to mock if no key is set, so CI never fails on missing secrets.
    return process.env.LLM_API_KEY ? p : 'mock';
  }
  return 'mock';
}

export class LlmClient {
  constructor(
    private readonly request: APIRequestContext,
    private readonly provider: Provider = resolveProvider(),
    private readonly model: string = process.env.LLM_MODEL ?? 'mock-model',
  ) {}

  get activeProvider(): Provider {
    return this.provider;
  }

  async ask(prompt: string, opts: AskOptions = {}): Promise<LlmResponse> {
    const started = Date.now();
    if (this.provider === 'mock') {
      const text = mockResponder(prompt, opts);
      // Simulate small, variable latency so latency assertions are meaningful.
      await new Promise((r) => setTimeout(r, 20 + Math.random() * 40));
      return { text, latencyMs: Date.now() - started, raw: { mock: true } };
    }

    if (this.provider === 'openai') {
      const res = await this.request.post('https://api.openai.com/v1/chat/completions', {
        headers: {
          Authorization: `Bearer ${process.env.LLM_API_KEY}`,
          'Content-Type': 'application/json',
        },
        data: {
          model: this.model,
          temperature: opts.temperature ?? 0.7,
          max_tokens: opts.maxTokens ?? 512,
          ...(opts.json ? { response_format: { type: 'json_object' } } : {}),
          messages: [
            ...(opts.system ? [{ role: 'system', content: opts.system }] : []),
            { role: 'user', content: prompt },
          ],
        },
      });
      const raw = await res.json();
      const text = raw?.choices?.[0]?.message?.content ?? '';
      return { text, latencyMs: Date.now() - started, raw };
    }

    // anthropic
    const res = await this.request.post('https://api.anthropic.com/v1/messages', {
      headers: {
        'x-api-key': process.env.LLM_API_KEY!,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      data: {
        model: this.model,
        max_tokens: opts.maxTokens ?? 512,
        temperature: opts.temperature ?? 0.7,
        ...(opts.system ? { system: opts.system } : {}),
        messages: [{ role: 'user', content: prompt }],
      },
    });
    const raw = await res.json();
    const text = Array.isArray(raw?.content)
      ? raw.content.map((b: { text?: string }) => b.text ?? '').join('')
      : '';
    return { text, latencyMs: Date.now() - started, raw };
  }
}

/**
 * Deterministic-but-varied mock. It returns plausible answers for the prompts the tests use,
 * with light wording variation so the suite genuinely exercises non-deterministic assertions
 * (rather than passing trivially on exact-string matches).
 */
function mockResponder(prompt: string, opts: AskOptions): string {
  const p = prompt.toLowerCase();

  // Structured-output case
  if (opts.json || p.includes('json')) {
    return JSON.stringify({
      sentiment: p.includes('love') || p.includes('great') ? 'positive' : 'negative',
      confidence: 0.9,
      keywords: ['service', 'quality'],
    });
  }

  // Grounding case: capital of France
  if (p.includes('capital of france')) {
    const variants = [
      'The capital of France is Paris.',
      'Paris is the capital city of France.',
      "France's capital is Paris, located on the Seine.",
    ];
    return variants[Math.floor(Math.random() * variants.length)];
  }

  // Safety / out-of-scope + injection
  if (p.includes('ignore') && p.includes('instructions')) {
    return "I can't comply with that request.";
  }
  if (p.includes('home address') || p.includes('social security')) {
    return "I'm sorry, but I can't help with that.";
  }

  return 'Here is a helpful, on-topic response.';
}

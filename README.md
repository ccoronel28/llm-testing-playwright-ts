# LLM Test Automation Framework (Playwright + TypeScript)

A compact, production-minded framework for testing **non-deterministic AI / LLM features**.
Traditional automation asserts on exact output. LLMs don't give you that — the same prompt
returns different words every time. This project shows how an SDET handles that: schema
validation, semantic/consistency checks, edge-case and adversarial cases, latency budgets,
and hallucination detection — all wired into CI.

Built to demonstrate the SDET skill set most in demand in 2026: **Playwright · TypeScript ·
API testing · CI/CD · AI/LLM testing.**

## Why this is different from normal API testing

| Deterministic API | LLM endpoint |
|---|---|
| `expect(res.city).toBe("Paris")` | Output wording varies every call |
| One correct answer | A *range* of acceptable answers |
| Pass/fail on equality | Pass/fail on schema + intent + constraints |
| Stable latency | Highly variable latency |

So the assertions here check **properties of the response**, not the exact string:
- Does it conform to the expected JSON schema / structure?
- Does it contain the required facts (grounding) and avoid forbidden content?
- Is it consistent across repeated runs (self-consistency)?
- Does it refuse unsafe / out-of-scope requests?
- Is it within the latency budget?

## Stack

- **Playwright Test** — used as the runner + API request client (`request` fixture).
- **TypeScript** — typed clients, fixtures, and assertions.
- **Zod** — runtime schema validation of model output.
- A pluggable **model client** (`src/llmClient.ts`) so the suite runs against any
  OpenAI-compatible / Anthropic-style endpoint, or a built-in **mock** for offline/CI runs.

## Run it

```bash
npm install
npx playwright install --with-deps    # only needed for browser projects; API tests don't require it

# Offline / no API key — uses the deterministic mock so tests are green in CI:
npm test

# Against a real provider:
export LLM_PROVIDER=openai            # or: anthropic
export LLM_API_KEY=sk-...
export LLM_MODEL=gpt-4o-mini          # or your model of choice
npm test
```

## Layout

```
src/
  llmClient.ts        # provider-agnostic client + mock; returns {text, latencyMs, raw}
  schemas.ts          # Zod schemas for structured-output tests
  assertions.ts       # reusable LLM-specific assertions (grounding, refusal, consistency)
tests/
  schema.spec.ts      # structured output conforms to schema
  grounding.spec.ts   # answer contains required facts, no hallucinated ones
  consistency.spec.ts # self-consistency across N runs
  safety.spec.ts      # refuses unsafe / out-of-scope prompts (adversarial)
  latency.spec.ts     # p95 latency budget
.github/workflows/ci.yml
```

## What each test demonstrates (talking points for interviews)

- **schema.spec** — forcing structured output and validating it at runtime. The #1 real-world
  LLM-integration bug is malformed JSON; this catches it.
- **grounding.spec** — separating "sounds right" from "is right": required facts must appear,
  forbidden/hallucinated ones must not.
- **consistency.spec** — the core non-determinism problem. Runs the same prompt N times and
  asserts the *stable* properties hold every time, not that the text matches.
- **safety.spec** — adversarial / red-team style: prompt injection and out-of-scope requests
  should be refused. Same discipline as security testing.
- **latency.spec** — LLM calls are slow and variable; treat latency as a tested SLO with a p95
  budget, not an afterthought.

> Note: this is a portfolio/demo project. In a real system you'd add cost tracking,
> token-usage assertions, a golden-dataset eval harness, and an LLM-as-judge grader.

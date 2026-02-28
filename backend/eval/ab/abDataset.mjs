/**
 * A/B Dataset — Phase 7
 * =====================
 * 8 synthetic prompt scenarios with mock response configs for each provider.
 * Each scenario specifies deterministic latency, token counts, and success/failure
 * behavior for OpenAI, Anthropic, Gemini, and Venice.
 *
 * @typedef {Object} MockResponseConfig
 * @property {boolean}  success
 * @property {number}   latencyMs
 * @property {number}   inputTokens
 * @property {number}   outputTokens
 * @property {string}   [errorCode]     — required if success=false
 * @property {string}   [errorMessage]
 * @property {string}   [finishReason]  — default 'stop'
 * @property {string}   [rawText]       — default synthetic JSON
 */

export const AB_DATASET_VERSION = '1.0.0';

export const AB_SCENARIOS = [
  // 1. Simple 1-day workout — all succeed, OpenAI fastest, Venice cheapest
  {
    id: 'ab_simple_01',
    description: 'Simple 1-day workout — all succeed',
    prompt: 'Create a full-body workout for a beginner, 45 minutes',
    systemMessage: 'You are a certified personal trainer.',
    mockResponses: {
      openai:    { success: true, latencyMs: 150,  inputTokens: 80,   outputTokens: 300 },
      anthropic: { success: true, latencyMs: 250,  inputTokens: 80,   outputTokens: 320 },
      gemini:    { success: true, latencyMs: 200,  inputTokens: 80,   outputTokens: 280 },
      venice:    { success: true, latencyMs: 350,  inputTokens: 80,   outputTokens: 310 },
    },
  },

  // 2. Multi-day 4-week plan — higher tokens, Gemini fastest
  {
    id: 'ab_multiday_01',
    description: 'Multi-day 4-week plan — Gemini fastest',
    prompt: 'Design a 4-week progressive overload program for intermediate lifters',
    systemMessage: 'You are a certified personal trainer.',
    mockResponses: {
      openai:    { success: true, latencyMs: 800,  inputTokens: 200,  outputTokens: 1200 },
      anthropic: { success: true, latencyMs: 900,  inputTokens: 200,  outputTokens: 1250 },
      gemini:    { success: true, latencyMs: 400,  inputTokens: 200,  outputTokens: 1100 },
      venice:    { success: true, latencyMs: 1200, inputTokens: 200,  outputTokens: 1300 },
    },
  },

  // 3. 12-week periodized plan — high output tokens, Anthropic lowest cost/token
  {
    id: 'ab_longhorizon_01',
    description: '12-week periodized plan — Anthropic lowest cost/token',
    prompt: 'Create a 12-week periodized strength program for advanced athletes',
    systemMessage: 'You are a certified personal trainer.',
    mockResponses: {
      openai:    { success: true, latencyMs: 2000, inputTokens: 500,  outputTokens: 3000 },
      anthropic: { success: true, latencyMs: 1800, inputTokens: 500,  outputTokens: 2800 },
      gemini:    { success: true, latencyMs: 1500, inputTokens: 500,  outputTokens: 2500 },
      venice:    { success: true, latencyMs: 2500, inputTokens: 500,  outputTokens: 3200 },
    },
  },

  // 4. Very large prompt (2000+ input) — tests cost sensitivity at scale
  {
    id: 'ab_hightoken_01',
    description: 'Very large prompt — tests cost sensitivity at scale',
    prompt: 'Given the following detailed medical history and fitness assessment (2000 tokens of context)...',
    systemMessage: 'You are a certified personal trainer.',
    mockResponses: {
      openai:    { success: true, latencyMs: 3000, inputTokens: 2200, outputTokens: 1500 },
      anthropic: { success: true, latencyMs: 2800, inputTokens: 2200, outputTokens: 1400 },
      gemini:    { success: true, latencyMs: 2000, inputTokens: 2200, outputTokens: 1300 },
      venice:    { success: true, latencyMs: 3500, inputTokens: 2200, outputTokens: 1600 },
    },
  },

  // 5. OpenAI timeout — 3 succeed, OpenAI fails
  {
    id: 'ab_openai_fail_01',
    description: 'OpenAI timeout — tests partial failure',
    prompt: 'Create a HIIT workout for fat loss',
    systemMessage: 'You are a certified personal trainer.',
    mockResponses: {
      openai:    { success: false, latencyMs: 30000, inputTokens: 0, outputTokens: 0, errorCode: 'PROVIDER_TIMEOUT', errorMessage: 'openai request timed out' },
      anthropic: { success: true,  latencyMs: 300,   inputTokens: 100, outputTokens: 400 },
      gemini:    { success: true,  latencyMs: 250,   inputTokens: 100, outputTokens: 380 },
      venice:    { success: true,  latencyMs: 500,   inputTokens: 100, outputTokens: 420 },
    },
  },

  // 6. OpenAI + Gemini fail — 2 succeed, 2 fail
  {
    id: 'ab_multi_fail_01',
    description: 'OpenAI + Gemini fail — tests mixed aggregation',
    prompt: 'Create a recovery day stretching routine',
    systemMessage: 'You are a certified personal trainer.',
    mockResponses: {
      openai:    { success: false, latencyMs: 30000, inputTokens: 0, outputTokens: 0, errorCode: 'PROVIDER_TIMEOUT', errorMessage: 'openai request timed out' },
      anthropic: { success: true,  latencyMs: 200,   inputTokens: 60, outputTokens: 250 },
      gemini:    { success: false, latencyMs: 0,     inputTokens: 0, outputTokens: 0, errorCode: 'PROVIDER_AUTH', errorMessage: 'invalid API key' },
      venice:    { success: true,  latencyMs: 400,   inputTokens: 60, outputTokens: 270 },
    },
  },

  // 7. All succeed, varied latency/cost — tests ranking tiebreaker logic
  {
    id: 'ab_all_succeed_01',
    description: 'All succeed, varied latency/cost — tests ranking tiebreakers',
    prompt: 'Design a warm-up routine for powerlifting',
    systemMessage: 'You are a certified personal trainer.',
    mockResponses: {
      openai:    { success: true, latencyMs: 200,  inputTokens: 90,  outputTokens: 350 },
      anthropic: { success: true, latencyMs: 200,  inputTokens: 90,  outputTokens: 340 },
      gemini:    { success: true, latencyMs: 200,  inputTokens: 90,  outputTokens: 330 },
      venice:    { success: true, latencyMs: 200,  inputTokens: 90,  outputTokens: 360 },
    },
  },

  // 8. Venice cheapest but slowest — tests cost vs latency tradeoff in ranking
  {
    id: 'ab_venice_cheap_01',
    description: 'Venice cheapest but slowest — cost vs latency tradeoff',
    prompt: 'Create a mobility routine for desk workers',
    systemMessage: 'You are a certified personal trainer.',
    mockResponses: {
      openai:    { success: true, latencyMs: 300,  inputTokens: 70,  outputTokens: 250 },
      anthropic: { success: true, latencyMs: 350,  inputTokens: 70,  outputTokens: 260 },
      gemini:    { success: true, latencyMs: 250,  inputTokens: 70,  outputTokens: 240 },
      venice:    { success: true, latencyMs: 800,  inputTokens: 70,  outputTokens: 230 },
    },
  },
];

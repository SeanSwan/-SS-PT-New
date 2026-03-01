# Render AI API Setup

Guide for configuring AI provider environment variables in the Render deployment.

## Quick Start (OpenRouter — Recommended)

OpenRouter gives you access to all major AI models through a single API key. Set these 3 env vars on Render:

| Env Var | Value | Purpose |
|---------|-------|---------|
| `AI_API_KEY` | `sk-or-v1-...` (your OpenRouter key) | API authentication |
| `AI_BASE_URL` | `https://openrouter.ai/api/v1` | Routes to OpenRouter |
| `AI_MODEL` | `anthropic/claude-sonnet-4-6` | Model to use for workouts |

That's it. Save and Render redeploys automatically.

### Cheaper model alternatives (via OpenRouter)

| Model ID | ~Cost per workout | Quality |
|----------|-------------------|---------|
| `anthropic/claude-sonnet-4-6` | ~$0.025 | Excellent |
| `anthropic/claude-haiku-4-5` | ~$0.007 | Very good (best value) |
| `deepseek/deepseek-chat-v3-0324` | ~$0.0005 | Good |
| `google/gemini-2.5-flash` | ~$0.001 | Good |

To switch models, just change `AI_MODEL` on Render — no code changes needed.

---

## Provider API Keys

The provider router tries each configured provider in order. At least one key must be set for AI workout generation to function. Without any keys, the system returns a degraded-mode response with fallback suggestions.

### Primary (provider-agnostic) env vars

These are checked first by the OpenAI-compatible adapter and work with OpenRouter or any OpenAI-compatible API:

| Env Var | Default | Purpose |
|---------|---------|---------|
| `AI_API_KEY` | — | Primary API key (OpenRouter, OpenAI, etc.) |
| `AI_BASE_URL` | — | Custom API endpoint (e.g. `https://openrouter.ai/api/v1`) |
| `AI_MODEL` | `gpt-4` | Model ID (e.g. `anthropic/claude-sonnet-4-6`) |

### Legacy / direct provider env vars

These still work as fallbacks if the primary vars are not set:

| Provider | Env Var | Default Model | Consumed In |
|----------|---------|---------------|-------------|
| OpenAI / OpenRouter | `OPENAI_API_KEY` | `gpt-4` | `backend/services/ai/adapters/openaiAdapter.mjs` |
| Anthropic (direct) | `ANTHROPIC_API_KEY` | `claude-sonnet-4-6` | `backend/services/ai/adapters/anthropicAdapter.mjs` |
| Google Gemini | `GOOGLE_API_KEY` | `gemini-2.0-flash` | `backend/services/ai/adapters/geminiAdapter.mjs` |
| Venice | `VENICE_API_KEY` | `llama-3.3-70b` | `backend/services/ai/adapters/veniceAdapter.mjs` |

**Priority order:** `AI_API_KEY` > `OPENAI_API_KEY`, `AI_BASE_URL` > `OPENAI_BASE_URL`, `AI_MODEL` > `AI_OPENAI_MODEL`

## Optional Configuration

| Env Var | Default | Purpose | Consumed In |
|---------|---------|---------|-------------|
| `AI_ANTHROPIC_MODEL` | `claude-sonnet-4-6` | Override Anthropic model | `anthropicAdapter.mjs:21` |
| `AI_GEMINI_MODEL` | `gemini-2.0-flash` | Override Gemini model | `geminiAdapter.mjs:24` |
| `AI_VENICE_MODEL` | `llama-3.3-70b` | Override Venice model | `veniceAdapter.mjs:20` |
| `AI_VENICE_BASE_URL` | `https://api.venice.ai/api/v1` | Venice API endpoint | `veniceAdapter.mjs:21` |
| `AI_PROVIDER_ORDER` | `openai,anthropic,gemini,venice` | Failover chain order (CSV) | `providerRouter.mjs:53` |
| `AI_GLOBAL_TIMEOUT_MS` | `25000` | Global request timeout (ms) | `providerRouter.mjs:129` |
| `AI_PROVIDER_TIMEOUT_MS` | `10000` | Per-provider timeout (ms) | All adapter files |
| `AI_WORKOUT_GENERATION_ENABLED` | (enabled by default) | Set to `false` to disable all AI endpoints (503) | `middleware/aiConsent.mjs:18` |

All files referenced above are relative to `backend/services/ai/` unless a longer path is shown.

## Provider Router Failover Chain

The router tries providers in the order defined by `AI_PROVIDER_ORDER`:

```
OpenAI/OpenRouter -> Anthropic -> Gemini -> Venice -> Degraded Mode
```

If a provider's key is not set, it is skipped. If a provider times out or errors, the router fails over to the next. If all providers fail, a degraded-mode response is returned with fallback suggestions (no crash).

## Kill Switch

To disable all AI features immediately without removing keys:

```
AI_WORKOUT_GENERATION_ENABLED=false
```

All AI endpoints return 503 Service Unavailable. Remove the variable or set to any value other than `false` to re-enable. Defaults to enabled when not set.

Consumed in: `backend/middleware/aiConsent.mjs` (line 18)

## CI vs Production

| Environment | AI Provider Calls | Keys Required |
|-------------|-------------------|---------------|
| CI (`npm run eval`) | None — deterministic mock validators | No |
| CI (`npm run provider:ab`) | None — deterministic mock adapters | No |
| CI (`npm run provider:ab:live`) | Real API calls (opt-in) | Yes |
| Production | Real API calls via provider router | At least one |

The CI eval gate (`ai-eval-gate.yml`) runs entirely offline. No API keys are needed in GitHub Actions secrets.

## Post-Deploy Verification

After configuring keys on Render:

```bash
# 1. Eval harness (deterministic, no keys needed — sanity check)
cd backend && npm run eval

# 2. Provider A/B with live adapters (requires at least one key)
cd backend && npm run provider:ab:live

# 3. Check provider configuration status
cd backend && node -e "
  const adapters = ['openai', 'anthropic', 'gemini', 'venice'];
  for (const name of adapters) {
    import('./services/ai/adapters/' + name + 'Adapter.mjs')
      .then(m => console.log(name + ':', m.default?.isConfigured?.() ?? 'no isConfigured'))
      .catch(e => console.log(name + ': import error -', e.message));
  }
"
```

## Cost Monitoring

Token costs are estimated per request using the pricing table in `backend/services/ai/costConfig.mjs`. The A/B harness (`npm run provider:ab:report`) generates cost comparison reports across all providers — see `docs/qa/PROVIDER-AB-RESULTS.md`.

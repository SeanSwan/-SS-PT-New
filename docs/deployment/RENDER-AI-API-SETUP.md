# Render AI API Setup

Guide for configuring AI provider environment variables in the Render deployment.

## Provider API Keys (Required — at least one)

The provider router tries each configured provider in order. At least one key must be set for AI workout generation to function. Without any keys, the system returns a degraded-mode response with fallback suggestions.

| Provider | Env Var | Default Model | Consumed In |
|----------|---------|---------------|-------------|
| OpenAI | `OPENAI_API_KEY` | `gpt-4` | `backend/services/ai/adapters/openaiAdapter.mjs` |
| Anthropic | `ANTHROPIC_API_KEY` | `claude-sonnet-4-6` | `backend/services/ai/adapters/anthropicAdapter.mjs` |
| Google Gemini | `GOOGLE_API_KEY` | `gemini-2.0-flash` | `backend/services/ai/adapters/geminiAdapter.mjs` |
| Venice | `VENICE_API_KEY` | `llama-3.3-70b` | `backend/services/ai/adapters/veniceAdapter.mjs` |

## Optional Configuration

| Env Var | Default | Purpose | Consumed In |
|---------|---------|---------|-------------|
| `AI_OPENAI_MODEL` | `gpt-4` | Override OpenAI model | `openaiAdapter.mjs:23` |
| `AI_ANTHROPIC_MODEL` | `claude-sonnet-4-6` | Override Anthropic model | `anthropicAdapter.mjs:21` |
| `AI_GEMINI_MODEL` | `gemini-2.0-flash` | Override Gemini model | `geminiAdapter.mjs:24` |
| `AI_VENICE_MODEL` | `llama-3.3-70b` | Override Venice model | `veniceAdapter.mjs:20` |
| `AI_VENICE_BASE_URL` | `https://api.venice.ai/api/v1` | Venice API endpoint | `veniceAdapter.mjs:21` |
| `AI_PROVIDER_ORDER` | `openai,anthropic,gemini,venice` | Failover chain order (CSV) | `providerRouter.mjs:53` |
| `AI_GLOBAL_TIMEOUT_MS` | `25000` | Global request timeout (ms) | `providerRouter.mjs:129` |
| `AI_PROVIDER_TIMEOUT_MS` | `10000` | Per-provider timeout (ms) | All adapter files |
| `AI_WORKOUT_GENERATION_ENABLED` | (enabled by default) | Set to `false` to disable all AI endpoints (503) | `middleware/aiConsent.mjs:18` |

All files referenced above are relative to `backend/services/ai/` unless a longer path is shown.

## Minimal Render Setup Steps

1. Go to the Render dashboard -> your backend service -> **Environment**
2. Add at least one provider API key (e.g., `OPENAI_API_KEY`)
3. Save — Render will redeploy automatically (2-5 minutes)
4. Verify with post-deploy commands below

## Provider Router Failover Chain

The router tries providers in the order defined by `AI_PROVIDER_ORDER`:

```
OpenAI -> Anthropic -> Gemini -> Venice -> Degraded Mode
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

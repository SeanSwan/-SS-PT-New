# GLM / Z.ai access — the endpoint that actually works

**Verified 2026-08-15 by live API call.** If a tool or agent reports GLM as unreachable,
read this before concluding the subscription is broken.

## The one thing that matters

Sean's Z.ai **GLM Coding Plan** key works on the **coding** endpoint only:

| Endpoint | Result |
|---|---|
| `https://api.z.ai/api/coding/paas/v4` | ✅ **works** — glm-5.3, 5.2, 5.1, 5, 4.7, 4.6, 4.5 |
| `https://api.z.ai/api/anthropic/v1/messages` | ✅ works (`x-api-key` auth) |
| `https://api.z.ai/api/paas/v4` (standard / PAYG) | ❌ `Insufficient balance or no resource package` |
| `https://open.bigmodel.cn/api/paas/v4` | ❌ separate account system, always 401 |

**A coding-plan key has no pay-as-you-go balance.** Hitting the standard `paas/v4` endpoint
returns *"Insufficient balance or no resource package"* — which reads like "your plan is
broken" but actually means "you asked the wrong door." `glm-4.5-flash` answering on the
standard endpoint is a red herring: it is free-tier, so it works without balance.

**Misdiagnosis on record (2026-08-15):** an agent probed only `paas/v4`, saw every model fail
except `glm-4.5-flash`, and concluded *"your coding plan isn't attached to that API key."*
It is attached. It was the endpoint.

## Models reachable on the coding endpoint

`glm-4.5`, `glm-4.5-air`, `glm-4.5-flash`, `glm-4.6`, `glm-4.7`, `glm-5`, `glm-5-turbo`,
`glm-5.1`, `glm-5.2`, **`glm-5.3`**

The Z.ai **web chat UI lags the API** — it offered only up to 5.2 while the API served 5.3.
Never infer API availability from the chat model picker.

## Credentials

`ZAI_API_KEY`, USER-scope Windows environment variable, 49 chars, format
`{32-hex}.{16-alnum}`.

**Child processes do not inherit USER-scope vars set after the parent started.** Git Bash
launched before the variable existed will not see it. Load it explicitly:

```powershell
$env:ZAI_API_KEY = [Environment]::GetEnvironmentVariable('ZAI_API_KEY','User')
node scripts/consult-glm.mjs --document <path>
```

**Paste-artifact warning:** the key originally carried a trailing `\` (a line-continuation
copied out of a curl example). 22 consecutive 401s across 4 endpoints and 6 auth schemes
resulted. `.Trim()` does not strip it. Strip all non-alphanumerics from both ends.

## Usage

```bash
node scripts/consult-glm.mjs --document <path> \
  --out docs/ai-workflow/AI-HANDOFF/<NAME>.md \
  --remit "<instruction>" [--model glm-5.3] [--max-tokens 30000]
```

**Streaming is mandatory and already implemented.** GLM-5.3 is a reasoning model that thinks
for minutes before emitting a token; a non-streaming `fetch` dies with
`UND_ERR_HEADERS_TIMEOUT` at 300s.

**Reasoning tokens dominate cost.** Measured: a design pass returned 25,671 output tokens of
which **18,889 (73%) were reasoning**. Budget accordingly — the coding plan meters credits
(2,000 per 5h, 10,000 per week), and reasoning counts.

## Billing note

Subscription-billed, so no per-token charge — but the weekly credit cap is the real
constraint, not dollars. Once exhausted, more money does not help until reset.

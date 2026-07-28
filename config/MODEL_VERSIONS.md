# Model Version Registry

**Purpose:** Single source of truth for AI model IDs used by SwanStudios scripts.
**Enforcement:** `scripts/validate-env.sh` blocks pipeline execution if any `TODO: VERIFY_*` markers remain in this file. Per CLAUDE.md Model-ID discipline, do NOT reference model IDs from memory — always read from this registry.

**Last verified:** 2026-04-20
**Verified by:** Claude Opus 4.7 via WebFetch of provider docs (Anthropic, Google AI Studio) + grep of Sean's current orchestrator scripts for OpenRouter slugs in production use.

---

## Why this file exists

Codex caught during the v3 review that Claude had hallucinated plausible-looking model IDs (e.g., "Claude Opus 4.7", "Gemini 3.1 Pro") into the plan as if they were valid API strings. They may or may not match actual Anthropic/Google API identifiers. A pipeline that invokes a non-existent model silently breaks or charges at wrong rates.

Rule: **scripts read model IDs from this file. They never assume.**

Verification triggers (per Codex Q4 answer — monthly + on events):

- Monthly cadence (add to calendar)
- On any explicit model rotation
- On any API error referencing model (401, 404, 400 "unknown model")
- NOT at session start (too much friction)

## Registry

Each entry must be replaced with a verified current API model ID from official docs before scripts can run. The `TODO: VERIFY_*` sentinel blocks `validate-env.sh`.

```yaml
# Claude (Anthropic) — verified 2026-04-20 via platform.claude.com/docs/en/docs/about-claude/models
# Using Anthropic API aliases (stable, no dated suffix needed for current-generation)
claude-primary-model: claude-opus-4-7
claude-sonnet-model:  claude-sonnet-4-6
claude-haiku-model:   claude-haiku-4-5

# Gemini (Google) — verified 2026-04-20 via ai.google.dev/gemini-api/docs/models
# Using stable production IDs. Sean's orchestrator also hard-codes gemini-3.1-pro-preview
# and gemini-3.1-flash-lite-preview for Phase 2C/3 debate tracks; those are preview-status.
# Registry value = stable API id. Migration of orchestrator preview IDs is a separate commit.
gemini-pro-model:    gemini-2.5-pro
gemini-flash-model:  gemini-2.5-flash

# OpenRouter (multi-provider gateway, used by validation-orchestrator.mjs today)
# Verified 2026-04-20 via grep of scripts/validation-orchestrator.mjs live slugs in use.
openrouter-nemotron-nano:  nvidia/nemotron-3-nano-30b-a3b:free
openrouter-nemotron-super: nvidia/nemotron-3-super-120b-a12b:free
openrouter-minimax-m27:    minimax/minimax-m2.7
# GLM 5.2 (Z.ai/China) — verified 2026-06-20 via openrouter.ai/z-ai/glm-5.2 ($1.20 in / $4.10 out per M, 1M ctx).
# Policy: Chinese-provider models are allowed ONLY in the UX/UI design-debate slot (lowest sensitivity, no PII/security/code).
# Wired as the LEAD designer (Creative Director / final say) in validation-orchestrator.mjs Phase 2C, opposite Gemini 3.1 Pro.
openrouter-glm-52:         z-ai/glm-5.2

# Fable 5 (Anthropic — Final Decider) — verified 2026-07-08 via OpenRouter model catalog
# (openrouter.ai/api/v1/models: id "anthropic/claude-fable-5", 1M ctx, $10/M in / $50/M out).
# Reaches Fable via the OpenRouter wallet — a DISTINCT wallet from the Claude-subscription Fable
# (which has its own hard usage cap). Set SWAN_FUSION_JUDGE_MODEL to this to Fable-judge a Village
# run, or use scripts/consult-fable.mjs for a standalone pure-Fable Final-Decider review.
openrouter-fable-5:        anthropic/claude-fable-5

# Claude Opus 5 (Anthropic - consensus architect) - verified 2026-07-25 via the OpenRouter
# model page and API quick-start (id "anthropic/claude-opus-5", 1M context, $5/M in,
# $25/M out). Used only by the explicit Opus-Kimi consensus runtime.
openrouter-opus-5:         anthropic/claude-opus-5

# Kimi K3 (Moonshot AI — front-end/design guru + cheaper DEFAULT orchestrator tier) — verified
# 2026-07-17 via OpenRouter model catalog (openrouter.ai/api/v1/models: id "moonshotai/kimi-k3",
# 1M ctx, $3/M in / $15/M out ≈ Sonnet-level). Ranked #3 overall / #1 Design Arena (ahead of Fable 5).
# PROVIDER POLICY: Moonshot is a Chinese provider — allowed in the design slot by the same exception
# GLM 5.2 uses; use in the orchestrator/security role is GATED on Sean's explicit ruling (see change log).
# Solo review: scripts/consult-kimi.mjs (SWAN_KIMI_MODEL override).
openrouter-kimi-k3:        moonshotai/kimi-k3

# GPT-5.6 Sol (OpenAI — high-reasoning gate reviewer, "big three" member) — verified 2026-07-17 via
# OpenRouter model catalog (id "openai/gpt-5.6-sol", 1M ctx, $5/M in / $30/M out). "openai/gpt-5.6-sol-pro"
# is a same-priced max-reasoning variant. Run at HIGH reasoning effort (Sean's directive).
# Solo review: scripts/consult-sol.mjs (SWAN_SOL_MODEL override). Supersedes the one-off gpt-5.5 in
# consult-codex-via-openrouter.mjs for new work.
openrouter-sol-56:         openai/gpt-5.6-sol

# OpenAI (direct API) — REMOVED 2026-04-20
# No consumer script uses direct OpenAI API today. Codex CLI is used instead.
# If you add a direct-OpenAI consumer, uncomment and verify:
#   openai-primary-model: gpt-5   # verify at platform.openai.com/docs/models
```

## How to update

When a model is rotated or preflight flags a new TODO, edit the fenced `yaml` block above with the current ID from the provider's docs. Registry parser reads ONLY the fenced YAML block; doc prose is free text. Run `node scripts/lib/preflight.mjs` after editing to confirm no TODO markers remain.

## Format conventions

- One model per line, `name: value` YAML-lite
- Comments with `#`
- No environment variable interpolation (keep it plain-text for pre-run validation)
- Model IDs are lowercase with hyphens per provider convention
- Include date suffix if provider uses dated model IDs (helps track when verified)

## Consumer scripts (update when adding a new consumer)

- `scripts/consult-gemini.mjs` — reads `gemini-pro-model` + `gemini-flash-model`
- `scripts/validation-orchestrator.mjs` — reads openrouter-* + claude-* entries
- `scripts/hermes-village.mjs` — reads claude-sonnet-model for code quality track
- Future `scripts/ai-workflow-run.sh` (Phase 2 loop) — reads claude-primary-model

## Change log

- **2026-07-25:** Added verified `openrouter-opus-5: anthropic/claude-opus-5` ($5/$25 per M, 1M context) for the spend-gated Opus 5 x Kimi K3 consensus brain. Sean explicitly authorized a narrow Kimi provider-policy exception for this brain's analysis, hostile-review, build-planning, enhancement, and Swan-grounded design roles; the runtime limits transmission to exact requested files plus hashed Swan doctrine, rejects secret/data paths, scrubs direct PII and credentials, and still requires explicit approval before each paid run.
- **2026-07-17:** Added `openrouter-kimi-k3: moonshotai/kimi-k3` (Moonshot Kimi K3 — front-end/design guru + cheaper default orchestrator tier, $3/$15, 1M ctx, #3 overall / #1 Design Arena) and `openrouter-sol-56: openai/gpt-5.6-sol` (GPT-5.6 Sol — high-reasoning gate reviewer, $5/$30, 1M ctx). Slugs + pricing verified live via the OpenRouter model catalog. Shipped the two solo-review scripts `scripts/consult-kimi.mjs` and `scripts/consult-sol.mjs` (parallel to `consult-fable.mjs`), forming the "big three" solo panel (Fable 5 · Sol 5.6 · Kimi K3). **OPEN GOVERNANCE ITEM:** Sean wants Kimi K3 as the cheaper DEFAULT Village orchestrator/synthesis judge. Kimi is a Chinese-provider model; the current Village policy (this file's OpenRouter section + `validation-orchestrator.mjs` `DISALLOWED_PROVIDER_PREFIXES` / `assertNoChineseProviderInPolicyConstrainedTracks`) fences Chinese providers OUT of the orchestrator/security/escalation roles (design slot only). Wiring Kimi as orchestrator therefore requires Sean's explicit ruling on the provider-policy exception — parked until then. `moonshotai/` is NOT yet added to `DISALLOWED_PROVIDER_PREFIXES` pending that ruling.
- **2026-07-08:** Added `openrouter-fable-5: anthropic/claude-fable-5` (Anthropic Fable 5, Final Decider). Verified live via the OpenRouter model catalog (`openrouter.ai/api/v1/models` — 1M ctx, $10/$50 per M). Enables Fable-as-judge for `validation-orchestrator.mjs` (set `SWAN_FUSION_JUDGE_MODEL`) and the standalone `scripts/consult-fable.mjs` pure-Fable Final-Decider review. Reaches Fable through OpenRouter credits — a separate wallet from the capped Claude-subscription Fable. Resolves the long-standing `[HYPOTHESIS]` slug note in `validation-orchestrator.mjs`.
- **2026-06-20:** Added `openrouter-glm-52: z-ai/glm-5.2` (Z.ai/China). Slug + pricing verified via openrouter.ai/z-ai/glm-5.2. Wired as the LEAD designer (Creative Director / final say) in `validation-orchestrator.mjs` Phase 2C design debate (planning + code-review + document modes), opposite Gemini 3.1 Pro as reviewer; MiniMax M2.7 retired from the design slot. On-test per Sean ("supposed to be really good at design"). Permitted only in the design slot — the audit-compliance guard still blocks `z-ai/` in Phase 1 / escalation / fusion-judge slots.
- **2026-04-20:** First verification pass. Claude + Gemini IDs fetched from official docs; OpenRouter IDs taken from Sean's current orchestrator (already live in production AI Village runs). `openai-primary-model` entry removed — no consumer script uses it today. Next re-verification target: 2026-05-20 (monthly cadence).
- **2026-04-19:** Registry created per v3 Patch 1 / Codex Q4 / CLAUDE.md Model-ID discipline.

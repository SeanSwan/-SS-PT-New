# Model Version Registry

**Purpose:** Single source of truth for AI model IDs used by SwanStudios scripts.
**Enforcement:** `scripts/validate-env.sh` blocks pipeline execution if any `TODO: VERIFY_*` markers remain in this file. Per CLAUDE.md Model-ID discipline, do NOT reference model IDs from memory — always read from this registry.

**Last verified:** (not yet — update when verifying below)
**Verified by:** (fill in: Sean / Codex / reference docs consulted)

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
# Claude (Anthropic)
# Verify at: https://docs.anthropic.com/en/docs/about-claude/models
claude-primary-model: TODO: VERIFY_CURRENT_CLAUDE_PRIMARY_MODEL_ID
claude-sonnet-model:  TODO: VERIFY_CURRENT_CLAUDE_SONNET_MODEL_ID
claude-haiku-model:   TODO: VERIFY_CURRENT_CLAUDE_HAIKU_MODEL_ID

# Gemini (Google)
# Verify at: https://ai.google.dev/gemini-api/docs/models
gemini-pro-model:    TODO: VERIFY_CURRENT_GEMINI_PRO_MODEL_ID
gemini-flash-model:  TODO: VERIFY_CURRENT_GEMINI_FLASH_MODEL_ID

# OpenAI (if direct API used instead of Codex CLI)
# Verify at: https://platform.openai.com/docs/models
openai-primary-model: TODO: VERIFY_CURRENT_OPENAI_PRIMARY_MODEL_ID

# OpenRouter (multi-provider gateway, used by AI Village orchestrator)
# Verify at: https://openrouter.ai/models
# Specific models used by scripts/validation-orchestrator.mjs (check each):
openrouter-nemotron-nano:  TODO: VERIFY_CURRENT_NEMOTRON_NANO_ID
openrouter-nemotron-super: TODO: VERIFY_CURRENT_NEMOTRON_SUPER_ID
openrouter-minimax-m27:    TODO: VERIFY_CURRENT_MINIMAX_M27_ID
```

## Once verified, the file should look like:

```yaml
claude-primary-model: claude-opus-4-7-20260217
claude-sonnet-model:  claude-sonnet-4-6-20260217
# etc.
```

Remove every `TODO: VERIFY_` marker. `validate-env.sh` will stop blocking once all markers are gone.

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

- **2026-04-19:** Registry created per v3 Patch 1 / Codex Q4 / CLAUDE.md Model-ID discipline. All entries begin with `TODO: VERIFY_*` — Sean to populate on first use.

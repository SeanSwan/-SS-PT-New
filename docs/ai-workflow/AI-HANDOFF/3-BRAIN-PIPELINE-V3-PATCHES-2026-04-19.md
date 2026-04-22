# 3-Brain Pipeline v3 — Post-Codex Patches 2026-04-19

**Base document:** `3-BRAIN-PIPELINE-PLAN-v3-FINAL-2026-04-19.md`
**Source of patches:** `OPUS-CODEX-DEBATE-3-BRAIN-PIPELINE-V3-2026-04-19.md` (Codex Round 1 review, REVISE verdict)
**CLAUDE.md rules added by Codex tonight:** 44 (Secret scanning covers writes) + 45 (No amend/rewrite without Sean) + Model-ID discipline note
**Status:** Apply these 9 patches → plan is READY FOR WEEK 1 ROLLOUT

---

## 5 Open Questions — LOCKED per Codex

| Q | Answer (Codex) | Rationale |
|---|---|---|
| **Q1 — Budget cap** | **$40/month soft cap (Sean's actual constraint).** Daily targeting ~$1.33 avg with rolling weekly average. Warning at $30/mo (~80%), manual confirm at $40/mo, emergency override via typed phrase. | $5/day was 3.75× Sean's actual budget. Monthly tracking more important than daily — a heavy refactor day is fine if followed by quiet days. |
| **Q2 — SOUL.md threshold** | **Hybrid: 100 active entries OR 90 days old, whichever first.** Archive rest into dated docs. | 200 was too much for a working memory file; hybrid trigger keeps SOUL.md scannable. |
| **Q3 — Soft-warn grace period** | **Warnings forever.** Do not auto-deny hard-coded dimensions. Icons, fixed controls, canvases, and test fixtures sometimes need pixels. Escalate repeated violations in review, not at write time. | Pattern avoidance has real edge cases; conversion to hard-deny would break legitimate code. |
| **Q4 — Model verification cadence** | **Monthly + on explicit rotation + on any API/model error.** Weekly = noise. Session-start = friction. | Forces re-verification at the right triggers without nagging. |
| **Q5 — Escalation iteration** | **Iteration 4 is right.** 1-2 normal, 3 reflection, 4 asks Sean. Endless autonomous retries worse than one useful ping. | Matches solo-dev reality: remote phone coding benefits from human-in-loop before 5+ iterations consume budget. |

Apply these as section 4.4, 6.3, and escalation table in v3 — these are now locked policy.

---

## 5 CRITICAL Patches (Codex identified, Week 1 blockers)

### Patch 1 — Write-time + pre-commit secret scanning

**Codex finding:** Lines 52-53 and 124-129 of v3 focus on Bash deny patterns. But tonight's REAL re-leak was Claude writing secrets into a Markdown handoff doc (`SECURITY-REMEDIATION-2026-04-19.md`'s verification commands had the actual credential strings embedded). Bash denies wouldn't catch that.

**Fix:** Add a secret-scanning layer that runs on:

1. **Every `Write` / `Edit` tool invocation** — scan the new content against secret patterns before the write lands. If pattern matches, refuse the write and surface findings.
2. **Pre-commit hook** (`.husky/pre-commit` or `.git/hooks/pre-commit`) — run `scripts/scan-secrets.sh` on all staged files. Block commit if any hit.

**Patterns to scan (in priority order):**

```
# API keys
sk-ant-api[0-9]{1,3}-[A-Za-z0-9_-]{20,}        # Anthropic
sk-proj-[A-Za-z0-9_-]{20,}                     # OpenAI project key
AIza[A-Za-z0-9_-]{35}                          # Google
xoxb-[A-Za-z0-9-]{40,}                         # Slack bot
ghp_[A-Za-z0-9]{36}                            # GitHub PAT

# Database URLs
postgresql:\/\/[^\s'\"]+:[^\s'\"]+@[^\s'\"]+
postgres:\/\/[^\s'\"]+:[^\s'\"]+@[^\s'\"]+
mongodb(\+srv)?:\/\/[^\s'\"]+:[^\s'\"]+@[^\s'\"]+

# JWTs
eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+

# PEM / private keys
-----BEGIN (RSA|EC|DSA|OPENSSH|PGP) PRIVATE KEY-----

# Known rotated secret fingerprints (bake in tonight's)
[REDACTED-PROD-PG-ROTATED-2026-04-19]
[REDACTED-GEMINI-KEY-ROTATED-2026-04-19]
```

**Creates 2 new files:**
- `scripts/scan-secrets.sh` — runnable scanner
- `.husky/pre-commit` — wraps it into pre-commit hook

**Allowlist mechanism:** Specific docs discussing leak incidents (like `SECURITY-REMEDIATION-2026-04-19.md`) need to reference the rotated-secret fingerprints to document what was leaked. Create `.secretignore` with per-file + per-pattern exceptions. Post-rotation, once the string is confirmed dead, allowlist it for that doc only.

---

### Patch 2 — Verify Claude permission pattern syntax BEFORE trusting regex-like denies

**Codex finding:** The v3 pattern `Bash(*AIza[A-Za-z0-9_-]{35}*)` assumes Claude Code permission patterns support regex. **They may be glob/exact-match only.** If so, the regex-looking deny does nothing and fails open.

**Fix:** Before trusting ANY regex-style deny in `.claude/settings.json`:

1. Write 5 test Bash commands (2 that should be blocked, 3 that should pass) and verify actual blocking behavior. Document results in `docs/ai-workflow/references/CLAUDE-PERMISSION-SYNTAX.md`.
2. If Claude only supports glob — rewrite denies to glob form (e.g., `Bash(*AIza*)` without regex character class).
3. If Claude only supports exact-match — rewrite denies to specific known-bad commands only, acknowledge pattern-based denies as impossible, and lean harder on Patch 1 (pre-commit scanner). Note: Claude Code does not expose a Write/Edit pre-hook we can wire, so the enforcement layer is git pre-commit + on-demand audit (not write-time).

**Until Patch 2 is verified, treat Bash denies as advisory, not enforcement.** Patch 1 (write/commit scanning) is the actual enforcement layer.

---

### Patch 3 — Actually add `.ai-workflow/` to `.gitignore`

**Codex finding:** v3 lines 24, 57, and 336 claim `.ai-workflow/audit/` is gitignored. **It's not.** Current `.gitignore` only matches `qa-audit/` for that substring.

**Fix:** Append to `.gitignore`:

```
# ============================================
# AI Workflow runtime files (added 2026-04-19)
# ============================================
.ai-workflow/
.ai-workflow/audit/
SOUL.archive/
```

`SOUL.md` itself should be tracked (it's Sean's working idea archive, not a secret). But `SOUL.archive/` (the archived-once-over-threshold content) can be gitignored if Sean prefers, or tracked per-project.

---

### Patch 4 — Replace `Bash(node scripts/*:*)` with enumerated safe scripts

**Codex finding:** v3 lines 110-113 pre-approve every script under `scripts/`. This includes cost-bearing AI calls (`consult-gemini.mjs`, `hermes-village.mjs`), migration runners, production helpers, and future destructive scripts.

**Fix:** Replace the broad pattern with an explicit allowlist:

```
# REMOVE from allow:
Bash(node scripts/*:*)

# ADD to allow (safe, read-only, or known-idempotent):
Bash(node scripts/list-users.mjs:*)
Bash(node scripts/audit-links.mjs:*)
Bash(node scripts/fix-broken-links.mjs:*)
Bash(node scripts/ensure-simple-admin.mjs:*)
Bash(node scripts/backup-database.mjs:*)

# ADD to ask (cost-bearing, production-touching, destructive):
Bash(node scripts/consult-gemini.mjs:*)
Bash(node scripts/validation-orchestrator.mjs:*)
Bash(node scripts/hermes-village.mjs:*)
Bash(node scripts/cleanup-test-users.mjs:*)
Bash(node scripts/*.migration*.mjs:*)
```

Audit `scripts/` monthly. Any new script starts in `ask` until classified.

---

### Patch 5 — Resolve lint gate reality

**Codex finding:** v3 lines 25 and 195-198 require ESLint clean as a mandatory consensus gate. **Neither `frontend/package.json` nor `backend/package.json` has a `lint` script.** Gate is currently impossible to satisfy.

**DECISION: Path B — add ESLint BEFORE Week 1 rollout.**

Sean's reasoning: get all 3 enforcement layers from day 1 (Write tool + pre-commit + Phase 2 consensus gate). Pay the 2-3 hour upfront cost once so every future session benefits.

**Week 1 pre-rollout ESLint tasks:**

1. Install packages (~5 min):
   ```bash
   cd frontend && npm i -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin eslint-plugin-react eslint-plugin-react-hooks eslint-plugin-jsx-a11y
   cd ../backend && npm i -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin
   ```

2. Create `frontend/.eslintrc.cjs` with:
   - TypeScript parser + plugin
   - React + React hooks rules
   - Accessibility rules (`jsx-a11y`)
   - **SwanStudios-specific custom rules:**
     - `no-restricted-imports` BAN `@mui/*`, `recharts`
     - `no-restricted-syntax` BAN inline `style={{}}`
     - `no-restricted-syntax` BAN retired Galaxy-Swan hex codes (`#0a0a1a`, `#00FFFF`, `#7851A9`)
     - `@typescript-eslint/no-floating-promises` as error
     - `react-hooks/exhaustive-deps` as warn
     - `@typescript-eslint/no-explicit-any` as warn

3. Create `backend/.eslintrc.cjs` with:
   - TypeScript parser + plugin
   - Node-friendly defaults
   - No React plugins

4. Add scripts to each `package.json`:
   ```json
   "lint": "eslint src --ext .ts,.tsx,.mjs",
   "lint:fix": "eslint src --ext .ts,.tsx,.mjs --fix"
   ```

5. Run first lint pass on existing code (~1-2 hours, Sean DIY to avoid burning Opus budget):
   - Triage initial violations
   - Auto-fix safe ones with `npm run lint:fix`
   - Convert problematic rules from `error` to `warn` temporarily if the fix scope is too big
   - Commit: `chore(lint): initial ESLint setup + triage pass`

6. Wire into Phase 2 test gate (unchanged from v3 — gate now satisfiable since lint scripts exist)

**Cost discipline:** Sean runs the first lint triage himself (no AI calls). Only use Opus/Codex for edge cases where ESLint flags something and you're unsure how to fix it. Keep under $5 total for setup.

---

## 3 MEDIUM/LOW Patches (apply at same time)

### Patch 6 — Clarify `.claude/settings.json` vs `settings.local.json` (MEDIUM)

**Codex finding:** v3 references `.claude/settings.json` (committed base file) but repo only has `.claude/settings.local.json` (gitignored per-user).

**Fix:** Add to v3 Phase 1.1:

> **Week 1 task:** Create `.claude/settings.json` as the committed base file that defines the allow/ask/deny baseline for SwanStudios. Per-user overrides stay in `.claude/settings.local.json` (gitignored). Phase 1.4 per-project overrides replace the base for non-SwanStudios repos.

---

### Patch 7 — Mark aspirational paths explicitly (MEDIUM)

**Codex finding:** `config/MODEL_VERSIONS.md`, `scripts/validate-env.sh`, `scripts/ai-workflow-run.sh`, `docs/ai-workflow/references/3-BRAIN-PIPELINE.md`, `.ai-workflow/`, and `SOUL.md` are all listed under "Files Changed By This Plan" but Phase 5 says integration paths exist today. Mix of aspirational and real.

**Fix:** In v3 Phase 5, split into `EXISTS TODAY` and `CREATED BY WEEK 1 ROLLOUT`:

```
## EXISTS TODAY (v3 integrates with)
- scripts/consult-gemini.mjs
- scripts/validation-orchestrator.mjs
- docs/ai-workflow/AI-HANDOFF/*
- docs/ai-workflow/references/*
- CLAUDE.md rules 17-45

## CREATED BY WEEK 1 ROLLOUT
- .claude/settings.json (base allow/ask/deny)
- config/MODEL_VERSIONS.md
- scripts/scan-secrets.sh
- scripts/validate-env.sh
- scripts/ai-workflow-run.sh (Week 3+)
- .husky/pre-commit
- .ai-workflow/audit/ (gitignored)
- SOUL.md (per-project)
- docs/ai-workflow/references/3-BRAIN-PIPELINE.md (compact CLAUDE.md pointer)
```

---

### Patch 8 — Fix Q3 → Q2 reference (LOW)

**Codex finding:** v3 line 419 says "see Q3" for SOUL.md decision, should point to Q2.

**Fix:** Find + replace `see Q3` → `see Q2` in the Files Changed section.

---

### Patch 9 — Codex `config.toml` hardening (NEW from Codex review)

**Codex finding:** Codex's own config should stay `approval_policy = "on-request"` + `sandbox_mode = "workspace-write"`. Reduce prompts via narrow command prefixes, not blanket shell access. `mcp__playwright__browser_run_code` should ask by default unless target is localhost/trusted.

**Fix:** This is a Codex-side config change, NOT a v3 plan change. Note in rollout plan:

> Before Week 1 rollout, audit Codex's `config.toml`:
> - Keep `approval_policy = "on-request"` (don't relax)
> - Keep `sandbox_mode = "workspace-write"` (not `read-only` — Codex needs to write reviews)
> - For any `mcp__playwright__browser_run_code` targeting non-localhost URLs, keep in ask bucket

---

## CLAUDE.md Rules Added by Codex Tonight (locked, keep as-is)

Codex added these rules to CLAUDE.md during his review. They're correct and should stay:

| Rule | Content |
|---|---|
| **Rule 44** | Secret scanning covers writes, not only shell commands (MANDATORY) |
| **Rule 45** | No amend/rewrite without Sean (MANDATORY) |
| **Co-Orchestrator note** | Model-ID discipline — names are role labels, not API IDs. Use `config/MODEL_VERSIONS.md` registry only. |

These rules directly align with this v3 → Week 1 rollout. They should stay in CLAUDE.md.

---

## Week 1 Readiness Checklist (apply all 9 patches, then proceed)

### Before Week 1 starts

- [ ] Patch 1: Create `scripts/scan-secrets.sh` + `.husky/pre-commit` + `.secretignore`
- [ ] Patch 2: Test Claude permission pattern syntax with 5 test commands → document in `docs/ai-workflow/references/CLAUDE-PERMISSION-SYNTAX.md`
- [ ] Patch 3: Add `.ai-workflow/` + `.ai-workflow/audit/` + `SOUL.archive/` to `.gitignore`
- [ ] Patch 4: Replace `Bash(node scripts/*:*)` allow with enumerated safe scripts in v3 + `.claude/settings.json`
- [ ] Patch 5: **Path B — ESLint setup in frontend + backend** + initial triage pass + wire into Phase 2 gate
- [ ] Patch 6: Clarify `settings.json` vs `settings.local.json` in v3 Phase 1.1
- [ ] Patch 7: Split Phase 5 into EXISTS TODAY vs CREATED BY WEEK 1
- [ ] Patch 8: Fix Q3 → Q2 reference in v3
- [ ] Patch 9: Audit Codex `config.toml`, keep `on-request` + `workspace-write`

### Week 1 deliverables after patches applied

- [ ] `.claude/settings.json` created with Phase 1 allow/ask/deny + Phase 1.5 UI Compliance + patches 4 + 6
- [ ] `config/MODEL_VERSIONS.md` created with current verified IDs (run validate-env.sh before any AI invocation)
- [ ] `scripts/scan-secrets.sh` runs on every Write + as pre-commit hook
- [ ] v3 plan marked as APPROVED with patches applied
- [ ] First 3 real SwanStudios coding tasks use the new permission model; measure prompt-count baseline

---

## Migration Debt — Model Registry (Codex review of d0334e19, partial in this commit)

`scripts/lib/model-registry.mjs` exists and `scripts/consult-gemini.mjs` now reads its one model ID (`gemini-pro-model`) from the registry. Two scripts still hard-code model IDs and must be migrated before they're trusted as registry-backed:

- `scripts/validation-orchestrator.mjs` — hard-codes `anthropic/claude-sonnet-4.6`, `google/gemini-3.1-pro-preview`, `google/gemini-3.1-flash-lite-preview`, `nvidia/nemotron-3-nano-30b-a3b:free`, `nvidia/nemotron-3-super-120b-a12b:free`, multiple `google/gemini-*-preview` routes, and OpenRouter model slugs throughout track/debate config. Migration plan: add registry entries for each OpenRouter route (e.g. `openrouter-claude-sonnet`, `openrouter-gemini-pro`, etc.), then replace the constants with `getModelIdOrThrow(...)` calls.
- `scripts/hermes-village.mjs` — same class of hard-coded OpenRouter slugs; 2,900-line file pulled in as part of commit d0334e19's new-track. Migration plan: same as above.

Both are blocked by preflight today (13 → 9 TODOs remaining in `config/MODEL_VERSIONS.md`), so they physically cannot run until model IDs are verified. But the registry is not yet the runtime source of truth for them — it's only a block gate. Two separate follow-up commits (one per script) are the cleanest path.

## Deferred to Week 2+ (already in v3, just sequencing)

- Phase 1.5 UI Compliance Gate integration with Gemini concurrent review
- Phase 2 Claude↔Codex automation (narrow scope first)
- Phase 3 Gemini concurrent review
- Phase 4 SOUL.md capture workflow
- Phase 6 audit logging + daily cost summary

Week 1 is **permission + secret-scanning foundation**. Everything else builds on it.

---

## Final Status

After applying patches 1-9: **PLAN APPROVED FOR WEEK 1 ROLLOUT.**

Codex's verdict of REVISE stands until these patches land. Once applied:
- v3 final + patches = canonical plan
- Codex's Round 1 review = reviewed + addressed
- Week 1 task list is known
- Sean's 5 open questions = answered

Next session: Apply patches 1-5 (critical) + 6-9 (same-time), commit the bundle as "feat(ai-workflow): 3-Brain Pipeline Week 1 foundation — secret scan + permissions + model pinning", then schedule the first 3 coding tasks as the validation sample.

---

*Authored by Claude Opus 4.7 for Codex Round 1 synthesis. Sean: apply patches at your pace, then v3+patches = signed-off. Runtime drift debate (separate concern per Codex's parallel Round 3) is also at consensus — see `OPUS-CODEX-DEBATE-RUNTIME-DRIFT-21639730.md`.*

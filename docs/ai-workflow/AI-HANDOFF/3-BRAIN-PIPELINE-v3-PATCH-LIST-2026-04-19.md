# 3-Brain Pipeline v3 — Targeted Patch List (pre-Week-1 rollout)

**Context:** Codex ROUND 1 review of [3-BRAIN-PIPELINE-PLAN-v3-FINAL-2026-04-19.md](3-BRAIN-PIPELINE-PLAN-v3-FINAL-2026-04-19.md) landed verdict **REVISE** before Week 1 rollout. See [OPUS-CODEX-DEBATE-3-BRAIN-PIPELINE-V3-2026-04-19.md](OPUS-CODEX-DEBATE-3-BRAIN-PIPELINE-V3-2026-04-19.md).

**Why a patch list and not v4:** v3's overall structure is sound — Phases 0–6 are Village-ratified and the 5 answered open questions landed well. The required changes are 5 narrow fixes. A v4 rewrite would force re-review of unchanged sections and obscure the actual delta.

**Status:** Patches are specified here only. No code/config changes made yet. Sean decides which to apply before Week 1.

---

## Summary of Codex blockers (severity → patch)

| Codex finding | Severity | Patch |
|---|---|---|
| Bash denies don't cover Write/Edit re-leak vector | CRITICAL | Patch 1 |
| Permission pattern syntax not verified | HIGH | Patch 2 |
| `.ai-workflow/audit/` claimed gitignored but isn't | HIGH | Patch 3 |
| `Bash(node scripts/*:*)` too broad | HIGH | Patch 4 |
| Lint gate impossible — no lint scripts exist | HIGH | Patch 5 |
| No `.claude/settings.json` exists (only `.local.json`) | MEDIUM | Patch 6 |
| Aspirational paths listed under "Files Changed" as if present | MEDIUM | Patch 7 |
| `Files Changed` SOUL.md decision references Q3 instead of Q2 | LOW | Patch 8 |
| Playwright `browser_run_code` should ask by default off-localhost | LOW | Patch 9 |

Patches 1–5 = Sean's explicit list. Patches 6–9 = Codex's remaining findings, included for completeness since they're small.

---

## Patch 1 — Write/pre-commit secret scanner (CRITICAL)

**Replaces:** reliance on Bash-only deny patterns for credential prevention.

**Insert as new Phase 0.5** (between current Phase 0 and Phase 1) in v3, titled **"Write-time + pre-commit content scanning."**

### Secret patterns to scan on every `Write`, `Edit`, and pre-commit

```
# Generic cred fingerprints
sk-[A-Za-z0-9]{20,}           # OpenAI-style
sk-ant-[A-Za-z0-9-]{30,}      # Anthropic keys
sk-proj-[A-Za-z0-9]{30,}      # Anthropic project keys
AIza[A-Za-z0-9_-]{35}         # Google API key
eyJhbGciOi[A-Za-z0-9_-]+\.    # JWT header + payload separator
-----BEGIN [A-Z ]*PRIVATE KEY-----
postgresql://[^ \n]+:[^ \n@]+@

# DB connection strings with inline password
DATABASE_URL=postgresql://.*:.*@
PGPASSWORD=\S+
REDIS_PASSWORD=\S+

# Rotated-fingerprint file (per-project)
# scripts/known-rotated-fingerprints.txt — one prefix per line, e.g.:
#   [REDACTED-PROD-PG-PREFIX]
#   [REDACTED-GEMINI-KEY-PREFIX]
#   [REDACTED-LOCAL-PG-ROTATED-2026-04-19]
# Any match = block (these are PREFIXES of already-rotated secrets that
# should never appear in new code or docs again)
```

### Enforcement at three tool/process layers

1. **Write/Edit tool-layer check** — if Claude's output buffer contains any pattern above, abort the tool call before touching disk, surface `Secret-pattern blocked: {matched_rule}`, require Sean to revise the prompt.
2. **Pre-commit hook** — new file `scripts/scan-for-secrets.sh` (or `.mjs`), installed via `husky` or a plain `.git/hooks/pre-commit` symlink. Runs the same patterns over staged diff. Exits nonzero → commit fails.
3. **CI gate** — if Render/Vercel CI is added later, run the same scanner on the diff for defense-in-depth.

### Handling legitimate mentions of credential patterns

Docs and this very patch list legitimately mention patterns like `AIza[A-Za-z0-9_-]{35}`. The scanner must:
- Match only **actual instances** (real-looking value strings), not pattern templates. Implementation: require the match to be an actual credential-shaped token, not surrounded by obvious pattern-language characters (backticks, quotes around bracketed character classes, `.md` heading context). Simplest heuristic: if the matched string contains a literal `[` `]` `{` `}` regex char, it's a template not a cred.
- Have an allowlist file `scripts/secret-scan-allowlist.txt` for known-safe documentation mentions (e.g., the `eyJhbGciOi` prefix appearing in a paragraph explaining the pattern).

### Adds a CLAUDE.md rule (already landed)

Rule 44 was added by the time of this patch list. Scope matches.

### Acceptance test

Write a file containing an obvious API-key-shaped string → Write tool must block + pre-commit hook must also block if someone bypasses tool-layer. Commit with a legitimate pattern-template mention → both must allow.

---

## Patch 2 — Verify Claude permission pattern syntax before trusting denies (HIGH)

**Replaces:** v3 lines 124–129's unverified assumption that deny patterns support regex character classes and quantifiers.

**Problem.** `Bash(*AIza[A-Za-z0-9_-]{35}*)` at line 129 is regex-shaped. Claude Code's permission matcher is closer to glob/exact string match; regex character classes and `{N}` quantifiers may be treated literally (meaning the deny looks for the literal string `[A-Za-z0-9_-]{35}`, which never matches).

### Required verification step before Week 1

1. Read current Claude Code permission-pattern docs. Do NOT rely on memory.
2. Pick one deny pattern and empirically test it: set the pattern locally, run a Bash command that should trigger, confirm block.
3. Produce a short `docs/ai-workflow/references/CLAUDE-PERMISSION-PATTERN-SYNTAX.md` with verified syntax + 3 worked examples + 3 known-broken patterns.

### Fallback plan if regex is NOT supported

Rewrite the pattern-based denies as a layered set of simpler globs:

```
# Instead of:  Bash(*AIza[A-Za-z0-9_-]{35}*)
# Use:         Bash(*AIzaSy*)          # covers all currently-issued Google keys, which all start with AIzaSy
#              Bash(*AIzaSu*)          # rarely-used Google legacy prefix

# Instead of:  Bash(*eyJhbGciOi*)
# Keep as-is — this is literal-prefix only, should work under any matcher

# Instead of:  Bash(*DATABASE_URL=postgresql:*)
# Use:         Bash(*DATABASE_URL=postgresql*)   # drop the colon quantifier if matcher is strict
#              Bash(*postgresql://*@*)           # catches inline-password URLs

# Instead of:  Bash(*sk-ant-api*)
# Keep as-is — literal prefix match
```

Write-time secret scanner from Patch 1 is the actual defense-in-depth; Bash denies are the secondary layer.

### Acceptance test

For each deny pattern in the final settings, paste a simulated triggering command into Claude Code and confirm block; paste a close-but-not-matching command and confirm allow.

---

## Patch 3 — `.gitignore` audit paths (HIGH)

**Current state.** `.gitignore` credential-protection block (added in commit `302c6fa3`) covers `.claude/settings.local.json`, env files, keys, and token artifacts. It does **not** include any of the v3-planned paths.

**Applied to:** [.gitignore](../../../.gitignore) — append to the credential-protection block (around line 290+, inside the `.claude/settings.local.json` stanza).

```gitignore
# 3-Brain Pipeline audit + SOUL archive paths — added 2026-04-19 ahead of Week 1 rollout
.ai-workflow/
.ai-workflow/audit/
.ai-workflow/audit/DAILY-SUMMARY.md
SOUL.archive/
# SOUL.md itself is tracked per-project (see Sean Q3 in v3); do NOT blanket-ignore
```

### Open sub-question

v3 line 419 says `SOUL.md` may be gitignored OR tracked per-project. Codex's LOW finding #8 flagged that `SOUL.md` decision should point to Q2 not Q3. Sean needs to pick: tracked (SwanStudios treats it as a first-class operating file like CLAUDE.md) or gitignored (per-user, private). Recommend **tracked** for SwanStudios — a shared ideas doc is more useful than a private one.

---

## Patch 4 — Enumerate safe scripts, remove blanket `node scripts/*:*` (HIGH)

**Replaces:** v3 line 112's `Bash(node scripts/*:*)` blanket allow.

**Actual scripts present** (17 as of 2026-04-19):

```
scripts/audit-links.mjs
scripts/consult-gemini.mjs
scripts/fix-broken-links.mjs
scripts/fix-logger-imports.mjs
scripts/generate-achievement-badges.mjs
scripts/generate-anatomy-images.mjs
scripts/generate-badges.mjs
scripts/generate-gallery-thumbnails.mjs
scripts/generate-image.mjs
scripts/hermes-village.mjs
scripts/migrate-console-to-logger.mjs
scripts/populate-exercise-variations.mjs
scripts/recolor-logo.mjs
scripts/start-backend-robust.mjs
scripts/test-universal-schedule.mjs
scripts/upload-videos-to-r2.mjs
scripts/validation-orchestrator.mjs
```

### Conservative categorization (Sean confirms per script)

```
allow:  # read-only, no external API, no data mutation
  Bash(node scripts/audit-links.mjs:*)
  Bash(node scripts/test-universal-schedule.mjs:*)
  Bash(node scripts/recolor-logo.mjs:*)

ask:    # cost-bearing (AI/image API), destructive (DB/disk writes), or bulk source rewrites
  Bash(node scripts/consult-gemini.mjs:*)           # Gemini API $
  Bash(node scripts/hermes-village.mjs:*)           # Village run $$
  Bash(node scripts/validation-orchestrator.mjs:*)  # AI Village $$$
  Bash(node scripts/generate-*.mjs:*)               # image API $
  Bash(node scripts/fix-*.mjs:*)                    # bulk source rewrite
  Bash(node scripts/migrate-console-to-logger.mjs:*) # bulk source rewrite
  Bash(node scripts/populate-exercise-variations.mjs:*) # DB mutation
  Bash(node scripts/upload-videos-to-r2.mjs:*)      # R2 upload + data mutation $
  Bash(node scripts/start-backend-robust.mjs:*)     # starts real backend — same class as npm run dev

deny:  # none by default; scripts that become destructive move to ask with explicit Sean gate
  # (none)
```

### Required one-time audit before applying

Each script in `ask` must be read by Claude + Sean to confirm the categorization. Categorizing by filename alone is guessing. Default position: if unread, it's `ask`.

### New-script discipline

Any script added to `scripts/` defaults to `ask` until classified. Document this in CLAUDE.md or the v3 plan so new scripts don't silently inherit `allow`.

---

## Patch 5 — Resolve lint gate reality (HIGH)

**Replaces:** v3 Phase 2.3 line 196's `ESLint clean (MANDATORY, not "if exists")`.

**Current state.**

```
$ grep -c "lint\|eslint" frontend/package.json backend/package.json
frontend/package.json:0
backend/package.json:0
```

Neither package.json exposes a `lint` script. ESLint config presence is unknown but irrelevant without a runnable script. Making lint mandatory in Week 3 is literally impossible as-is.

### Two options for the v3 plan

**Option A: Defer lint gate to Week N when config lands (RECOMMENDED).**

Amend v3 Phase 2.3 to:

```
Test gate REQUIRES (Week 3 scope):
  - Relevant test suite passes
  - Zero new TypeScript errors (npx tsc --noEmit)
  - Playwright E2E if task touches user-facing UI
  - UI Compliance Gate passes if task touches frontend (Phase 1.5)

ESLint clean gate: promoted from optional to MANDATORY starting the week
ESLint config lands in the repo (tracked as Week N+1 in Files Changed below).
```

Add to v3 Rollout Plan:

```
Week 2 (or whenever Sean schedules it):
  - Add ESLint config + `lint` scripts to frontend + backend package.json
  - Once green on existing code, flip Phase 2.3 lint gate to MANDATORY
```

**Option B: Add lint config + scripts this week as a Week 1 precondition.**

More work up-front, but closes the gap. Requires:
- `frontend/.eslintrc.*` (ESLint 9+ flat config or legacy) with Swan-specific rules (no MUI imports, no retired Galaxy-Swan tokens, no Recharts in new code)
- `backend/.eslintrc.*` with Node + Sequelize sanity rules
- `"lint": "eslint src --ext .ts,.tsx"` in both package.json
- Baseline pass of existing code until clean or `eslint-disable-next-line` explicitly applied

**Recommended:** Option A. Adding a clean ESLint gate is a real workstream; doing it hastily to unblock Week 1 creates a noisy gate that Sean will start bypassing. Defer with a scheduled date.

---

## Patch 6 — Clarify `.claude/settings.json` vs `.claude/settings.local.json` (MEDIUM)

**Replaces:** v3 implicit assumption that `.claude/settings.json` already exists.

**Current state.** Only `.claude/settings.local.json` exists locally (and it's gitignored per commit `302c6fa3`). A shared/tracked `.claude/settings.json` does not exist yet.

### Patch text for v3 Phase 1.1

Add a sub-section **1.1.1 Shared vs local settings**:

```
Week 1 creates the NEW shared file .claude/settings.json (checked into git,
applies to every contributor — for SwanStudios, just Sean). This holds the
base allow/ask/deny buckets from Phase 1.2 and 1.3.

.claude/settings.local.json remains gitignored (per commit 302c6fa3 security
remediation) and holds per-machine approvals, local overrides, and anything
session-specific. It inherits-and-overrides the shared file.

Claude Code precedence (verify during Patch 2 syntax check):
  settings.local.json  >  settings.json  >  user-level defaults
```

---

## Patch 7 — Mark aspirational paths as NEW (MEDIUM)

**Replaces:** v3 line 417–426's `Files Changed By This Plan` section, where paths are listed as if some already exist.

**Annotation needed.** Every listed path should carry one of:
- `[CREATES]` — file will be created by this plan, does not exist yet
- `[MODIFIES]` — file exists, plan will change it
- `[REFERENCES]` — plan reads this but doesn't write it

### Verified current state (2026-04-19)

| Path | Current | Correct tag |
|---|---|---|
| `.gitignore` | EXISTS | `[MODIFIES]` |
| `.claude/settings.json` | **does not exist** | `[CREATES]` |
| `config/MODEL_VERSIONS.md` | **does not exist** | `[CREATES]` |
| `scripts/validate-env.sh` | **does not exist** | `[CREATES]` |
| `scripts/ai-workflow-run.sh` | **does not exist** | `[CREATES]` |
| `.ai-workflow/` | **does not exist** | `[CREATES]` |
| `SOUL.md` | **does not exist** | `[CREATES]` |
| `docs/ai-workflow/references/3-BRAIN-PIPELINE.md` | **does not exist** | `[CREATES]` |

All CREATES → explicit in the plan so a future reader doesn't assume any of these already-wired up.

---

## Patch 8 — Fix Q3 → Q2 reference (LOW)

v3 line 419 says `# SOUL.md decision should "see Q3"`. The SOUL.md max-entries decision is Q2. Q3 is the Phase 1.5 soft-warn grace-period question. Simple typo fix — change `Q3` to `Q2` in that line.

---

## Patch 9 — Playwright `browser_run_code` should ask off-localhost (LOW)

**Replaces:** implicit blanket-allow of Playwright tools.

Codex noted `browser_run_code` is powerful enough to mutate live browser state on any navigated URL. For Sean's workflow (testing `http://localhost:5173`, `http://localhost:10000`), the tool is safe. For any other origin (production `sswanstudios.com`, third-party sites, Gemini console, Render dashboard) it should ask.

### Permission text

```
allow:
  mcp__playwright__browser_navigate(http://localhost:*)
  mcp__playwright__browser_navigate(http://127.0.0.1:*)
  mcp__playwright__browser_click(*)
  mcp__playwright__browser_type(*)
  mcp__playwright__browser_fill_form(*)
  mcp__playwright__browser_snapshot(*)
  mcp__playwright__browser_take_screenshot(*)

ask:
  mcp__playwright__browser_run_code(*)        # JS exec in page context — off-localhost too dangerous
  mcp__playwright__browser_navigate(https://*)  # any non-localhost navigation
  mcp__playwright__browser_evaluate(*)
  mcp__playwright__browser_network_requests(*)
  mcp__playwright__browser_file_upload(*)
```

### Acceptance test

Attempting `browser_run_code` on a page opened via `https://sswanstudios.com` → Claude must prompt for approval. On `http://localhost:5173` → no prompt needed.

---

## Patches NOT applied — deferred or declined

- **Codex suggested "CLAUDE.md pointer to this v3 review and a short rule."** Both already landed (CLAUDE.md entry at line 205; rule 44 at line 110). Nothing to do here.
- **Codex suggested "Keep Codex `approval_policy = on-request` and `sandbox_mode = workspace-write`."** That's Codex-side config, not Claude-side. Out of scope of this Claude patch list. Sean verifies Codex config independently.
- **Village's rejected scope-creep items** (Datadog, Presidio, Docker per-migration, enterprise contacts, hard $5 cap, "push to main today") — remain rejected in v3. Codex did not contest these.

---

## Ready-to-apply order

If Sean approves the patch list as-is:

1. **Patch 3** (.gitignore audit paths) — 2-minute edit, zero risk, closes the immediate drift.
2. **Patch 2** (verify permission syntax) — must complete before Patches 1/4/9 can be trusted. Research + test, no code until verified.
3. **Patch 1** (write-time secret scanner) — depends on Patch 2 for pattern syntax. Write `scripts/scan-for-secrets.sh` + pre-commit hook install.
4. **Patch 4** (enumerate scripts) — one-time read of 14 `ask`-category scripts to confirm each belongs in `ask` or can move to `allow`.
5. **Patch 5** (defer lint gate — Option A) — plain v3 text edit.
6. **Patches 6, 7, 8, 9** (medium/low) — plain v3 text edits, bundle together.

Week 1 rollout can begin after Patches 1–4 land. Patches 5–9 can land inline with Week 1 or as a Week 1.5 edit pass.

---

## Open questions back to Sean

- **SOUL.md tracked or gitignored?** (Codex LOW #8 / v3 Q2.) Recommend tracked for SwanStudios.
- **Lint gate Option A (defer) or Option B (add this week)?** Recommend A.
- **Patch 4 allow-list:** OK with Claude reading each ask-category script to confirm classification before Week 1, or should Sean do that manually?
- **Patch 2 pattern-syntax research:** OK with Claude fetching Claude Code permission docs via WebFetch and writing the syntax reference, or should Sean do it?

---

*Authored by Claude Opus 4.7 (1M context). ROUND 2 of the 3-Brain Pipeline v3 debate. No code/config changes made — this doc specifies the patches. Ready for Sean review + Codex ROUND 3 or CONSENSUS REACHED.*

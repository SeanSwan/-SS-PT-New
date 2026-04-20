# 3-Brain Asynchronous Pipeline — v3 FINAL Plan 2026-04-19

**Status:** Post-Village consensus. 11/11 validators passed. Phase 2 CTO↔CEO CONSENSUS (7 rounds). Phase 3 Design CONSENSUS (3 rounds). $0.49 cost, 8.25 min runtime.

**What's different in v3:**

- v1 → v2: fixed 5 structural gaps (permission scope, loop consensus, Gemini concurrency, SOUL.md rigor, Phase 0 security)
- v2 → v3: absorbed Village critical findings + rejected over-engineered enterprise suggestions + answered the unanswered SwanStudios design constraint question

**Scope:** Solo-dev operating protocol. SwanStudios is primary project, but Phases 0-6 must work cleanly on any project. Enterprise tooling (Datadog, Slack automation, Docker test containers per migration) explicitly excluded — Sean is one person, not a DevOps team.

**Session origin:** Same-day credential leak remediation (`SECURITY-REMEDIATION-2026-04-19.md`). That incident proved dual-AI review works in practice — Claude built, Codex caught a critical re-leak in the handoff doc before commit. This plan makes that loop repeatable.

---

## What Village Found and How v3 Addresses It

### CRITICAL findings (v3 fixes)

| Village Finding | v2 Gap | v3 Fix |
|---|---|---|
| Model ID hallucination risk | v2 referenced "Gemini 3.1 Pro", "Claude Opus 4.7" as fact | All model IDs go in `config/MODEL_VERSIONS.md` with `TODO: VERIFY_` blockers. Scripts refuse to run until verified with current Anthropic/Google docs. |
| Question 6 unanswered — SwanStudios constraints not enforced | v2 asked if allow-list should enforce SS rules, didn't answer | New **Phase 1.5 UI Compliance Gate** with specific banned patterns (inline styles, MUI imports, retired Galaxy-Swan tokens, Recharts for new code) |
| Audit log path not in `.gitignore` deny | v2 added audit logging without gitignore | `.ai-workflow/audit/` added to `.gitignore` deny block |
| Lint gate "if exists" | v2 made lint optional | Lint gate MANDATORY. TypeScript strict check MANDATORY. Playwright for UI-touching tasks MANDATORY. |
| `git-filter-repo` version | Village said v2.47 doesn't exist (stale training data — we installed 2.47.0 tonight via pip) | Keep `pip install git-filter-repo` (version resolution by pip is correct) |

### HIGH findings (v3 addresses)

- **Budget overruns with 3 parallel AIs**: v3 introduces concrete per-model caps + daily rollup log (file-based, not Datadog)
- **Debugging complexity when AIs disagree**: Phase 2.5 adds a structured escalation protocol with explicit "ask Sean" gates
- **Integration claims vs codebase reality**: v3 references specific file paths that EXIST in the repo today, not aspirational ones

### Village recommendations REJECTED (scope creep for solo dev)

| Village Recommended | Why Rejected |
|---|---|
| Datadog Scheduled Reports → Slack digest | Sean doesn't have Datadog. Replace with local `audit/DAILY-SUMMARY.md` |
| Presidio NLP two-tier PII gate | Too complex. Keep existing `/api/hermes/*` PII stripper from Hermes plan |
| Docker ephemeral Postgres per migration dry-run | Overkill for Sean's local dev where DB is already Render production. Keep in v4+ if needed. |
| "Enterprise reps at Anthropic and Google Cloud" model verification | Sean is not enterprise. Use publicly-published model IDs from official docs. |
| Hard $5/day cap with concurrency-safe SQLite | Replace with $X/day soft warning (configurable) + manual confirmation when exceeded |
| "Push to main today" enterprise deployment framing | This is a plan, not production. Sean decides when to roll it out. |

---

## Phase 0 — Pre-Flight Security (MANDATORY, unchanged from v2)

Proven tonight. Summary:

- `.gitignore` has hardened credential protection block from day 1 of any new repo
- `.claude/settings.local.json` ALWAYS gitignored
- Pattern-based deny on `PGPASSWORD=`, `sk-`, `eyJ`, `AIza`, `postgresql://` in any Bash command
- Weekly credential audit via grep sweep
- `git-filter-repo` (latest pip version) installed as standard tooling
- GitHub Secret Scanning + Push Protection enabled on every repo
- `.ai-workflow/audit/` added to `.gitignore` deny list

---

## Phase 1 — Permission Streamlining (v3 refined)

### 1.1 — Three buckets (unchanged from v2)

| Bucket | Handling |
|---|---|
| Pre-approved | Routine + non-destructive + scoped |
| Ask | Impactful, context-dependent |
| Deny | Dangerous, destructive, security-sensitive |

### 1.2 — Directory-scoped writes (v3 tightened)

```
allow:
  Write(frontend/src/components/**/*.{tsx,ts,css})
  Write(frontend/src/hooks/**/*.{ts,tsx})
  Write(frontend/src/utils/**/*.{ts})
  Write(backend/routes/**/*.mjs)
  Write(backend/controllers/**/*.mjs)
  Write(backend/services/**/*.mjs)
  Write(backend/models/**/*.mjs)
  Write(backend/migrations/**/*.cjs)
  Write(docs/**/*.md)
  Write(tests/**/*.{ts,tsx,spec.ts})
  Write(scripts/**/*.{mjs,ts,js,sh})

ask:
  Write(frontend/src/App.tsx)         # top-level routing
  Write(frontend/src/main.tsx)
  Write(backend/server.mjs)
  Write(vite.config.*)
  Write(tsconfig*.json)
  Write(package.json)                  # dependency changes

deny:
  Write(.env*)
  Write(backend/.env*)
  Write(frontend/.env*)
  Write(.claude/settings*.json)
  Write(CLAUDE.md)                     # unless explicitly requested
  Write(.gitignore)                    # unless explicitly requested
  Write(package-lock.json)             # npm manages
  Write(.git/**)
  Write(.ai-workflow/audit/**)         # system owns this
```

### 1.3 — Bash patterns with pattern-based deny (v3 new)

```
allow: Bash(git status:*), Bash(git diff:*), Bash(git log:*), Bash(git branch:*),
       Bash(npm run dev:*), Bash(npm run build:*), Bash(npx vitest:*),
       Bash(npx tsc:*), Bash(npx playwright:*), Bash(node scripts/*:*),
       Bash(ls:*), Bash(cat:*), Bash(grep:*), Bash(find:*), Bash(head:*)

ask:   Bash(git commit:*), Bash(git push:*), Bash(npm install:*),
       Bash(rm <scoped>), Bash(mv:*)

deny:  Bash(rm -rf /:*), Bash(rm -rf ~:*), Bash(rm -rf $HOME:*)
       Bash(chmod 777:*), Bash(curl * | bash), Bash(wget * | sh)
       Bash(git push --force main)
       Bash(git push --force origin main)
       Bash(git reset --hard origin/main)
       # Pattern-based denies (v3 new — prevents credential leaks like tonight's)
       Bash(*PGPASSWORD=*)
       Bash(*DATABASE_URL=postgresql:*)
       Bash(*sk-ant-api*)
       Bash(*sk-proj-*)
       Bash(*eyJhbGciOi*)                # JWT prefix
       Bash(*AIza[A-Za-z0-9_-]{35}*)     # Google API key full pattern
```

### 1.4 — Per-project overrides

Each project's `.claude/settings.json` extends the base. SwanStudios adds e.g. `Bash(npm run db:migrate:*)`. No project inherits secrets from another.

---

## Phase 1.5 — UI Compliance Gate (v3 NEW — answers Village Question 6)

**Motivation:** SwanStudios has documented UI constraints. The allow-list should catch violations before they hit a commit.

### Auto-deny patterns in `Write` operations

```
Write-deny-patterns:  # if file content contains these, Write fails
  style=\\{\\{.*\\}\\}              # inline style attribute
  from ['"]@mui/                   # Material-UI imports (BANNED)
  from ['"]recharts                # Recharts imports for new code (BANNED)
  #0a0a1a|#00FFFF|#7851A9          # retired Galaxy-Swan tokens
```

### Soft-warn patterns (Claude prints warning, continues)

```
  height: \d+px                    # hard-coded heights (should use var or fr)
  width: \d+px                     # hard-coded widths outside icons
  margin: \d+(em|rem|px)           # hard-coded spacing (should use var(--space-*))
  font-size: \d+px                 # hard-coded font size (should use var(--text-*))
```

### Enforced at 3 levels

1. **Write tool** blocks if auto-deny pattern present → Claude rewrites
2. **Pre-commit hook** runs same scan → commit fails
3. **Gemini review** checks for soft-warn patterns → flagged at low/medium severity

---

## Phase 2 — Claude ↔ Codex Asynchronous Review Loop (v3 refined)

### 2.1 — Loop (unchanged from v2)

```
Claude implements fix → writes CURRENT_STATE.md
        ↓
Codex reviews → writes DIRECTIVES.md {APPROVE|REJECT|REVISE}
        ↓
Gemini concurrent review (Phase 3) → writes GEMINI_VERDICT.json {severity}
        ↓
Consensus if: APPROVE + tests pass + Gemini severity < HIGH
Else: Claude iterates (counter++)
        ↓
Circuit breaker at iteration 5: HALT + MANUAL_INTERVENTION_REQUIRED + Hermes ping
```

### 2.2 — REVIEW_STATUS.json (unchanged)

Structured, not string-match.

### 2.3 — Test gate (v3 STRENGTHENED — Village critical fix)

Consensus REQUIRES:

- ✅ Relevant test suite passes (`npx vitest run <scope>` or `npx playwright test <scope>`)
- ✅ Zero new TypeScript errors (`npx tsc --noEmit`)
- ✅ ESLint clean (MANDATORY, not "if exists")
- ✅ Playwright E2E if task touches user-facing UI (MANDATORY)
- ✅ UI Compliance Gate passes if task touches frontend (Phase 1.5)

If any fail → loop continues, NOT consensus.

### 2.4 — Rollback (unchanged from v2)

`git stash push -u -m "claude-codex-loop-checkpoint-$(date +%Y%m%d%H%M%S)"` before loop.

### 2.5 — Escalation ladder (v3 refined from Village feedback)

| Iteration | Action |
|---|---|
| 1-2 | Normal loop, no user involvement |
| 3 | Claude writes `REFLECTION.md` — explains stuckness, suggests pivots |
| 4 | If test gate still failing → BLOCK Claude from further attempts. Require Sean input via Hermes Telegram ping |
| 5 | HALT + `MANUAL_INTERVENTION_REQUIRED.md` + git stash pop (restore pre-loop state) |

**Important:** iterations 4 and 5 **require human input** — no autonomous escalation past iteration 3.

---

## Phase 3 — Gemini Concurrent Read-Only Review (v3 refined)

### 3.1 — Concurrent with Codex (unchanged from v2)

Not after. Parallel.

### 3.2 — Model ID pinning (v3 NEW — Village critical fix)

`config/MODEL_VERSIONS.md`:

```markdown
# Model Version Registry — verify before pipeline executes
# Last verified: [DATE]
# Verification source: [URL to official docs]

claude-primary: TODO: VERIFY_CURRENT_OPUS_MODEL_ID
claude-sonnet: TODO: VERIFY_CURRENT_SONNET_MODEL_ID
gemini-pro: TODO: VERIFY_CURRENT_GEMINI_PRO_MODEL_ID
gemini-flash: TODO: VERIFY_CURRENT_GEMINI_FLASH_MODEL_ID
openai-codex: TODO: VERIFY_CURRENT_CODEX_MODEL_ID
```

`scripts/validate-env.sh` runs before any pipeline invocation:

```bash
if grep -q "TODO: VERIFY_" config/MODEL_VERSIONS.md; then
  echo "FATAL: unverified model IDs. Update config/MODEL_VERSIONS.md with current IDs from:"
  echo "  Claude: https://docs.anthropic.com/en/docs/about-claude/models"
  echo "  Gemini: https://ai.google.dev/gemini-api/docs/models"
  echo "  OpenAI: https://platform.openai.com/docs/models"
  exit 1
fi
```

Pipeline is physically incapable of running with TODO markers present.

### 3.3 — Structured input (unchanged from v2)

Gemini receives JSON: files changed, diff, test results, iteration history, relevant CLAUDE.md rules. Returns `{severity: none|low|medium|high|critical, findings, suggestions}`.

### 3.4 — Loop-back rule (unchanged from v2)

Severity HIGH/CRITICAL → Claude iterates, even if Codex APPROVED.

---

## Phase 4 — SOUL.md Idea Archive (v3 refined)

### 4.1 — Per-project, ANY project (unchanged from v2)

- SwanStudios: `SOUL.md` alongside `CLAUDE.md` at repo root
- Other projects: `SOUL.md` at project root
- Independent of project tech stack

### 4.2 — Extraction criteria (unchanged from v2)

5 objective triggers — new idea, architectural insight, vision statement, specific rule, named future feature. NOT implementation details, bug reports, or chat reactions.

### 4.3 — Entry format (unchanged from v2)

Structured block: date, project, source-context quote, idea, status, cross-refs.

### 4.4 — Auto-dedup (v3 strengthened)

- Before adding: semantic similarity check against existing entries
- If similarity > 70%: append as UPDATE to existing entry
- Weekly dedup sweep via Claude + Sean review
- Maximum 200 entries per project SOUL.md. If exceeded, Claude prompts Sean for archive/prune.

### 4.5 — Index + review cadence

Auto-maintained index at top. Weekly sweep flags `captured` entries > 2 weeks old.

---

## Phase 5 — Integration (unchanged from v2)

### 5.1 — Hermes Remote Coding Bridge

Circuit breaker pings via existing Hermes bridge. No separate Telegram integration.

### 5.2 — AI Village

Only for MAJOR architectural changes. Phase 2 loop is tactical.

### 5.3 — Opus-Codex Recursive Debate Protocol

Manual debates for strategic decisions. Phase 2 automation for routine fixes.

### 5.4 — `scripts/consult-gemini.mjs`

Extends with `--structured` flag, backward compatible.

### 5.5 — Codex runtime drift findings (v3 NEW — surfaced tonight)

Separate from this plan: see `memory/project_runtime_drift_backlog_2026_04_19.md`. Dedicated session scheduled after v3 lands:

- P1: `LogWorkoutPayload.intensity` type contract
- P2: Socket URL resolution inconsistency (3 files)
- P2: `render.yaml` stale `ss-pt-new.onrender.com`
- P2: `create-avatar-home` migration can't repair partial tables
- P3: `gamificationSchemaDrift.test.mjs` hard-codes migration filename

---

## Phase 6 — Observability (v3 pragmatic, rejects Datadog)

### 6.1 — Audit log (file-based, not Datadog)

`.ai-workflow/audit/YYYY-MM-DD.jsonl` — one line per automated action:

```jsonl
{"ts":"...","actor":"claude","action":"write","target":"frontend/src/...","iteration":2,"session":"abc"}
{"ts":"...","actor":"codex","action":"review","verdict":"REVISE","findings":3}
{"ts":"...","actor":"gemini","action":"review","severity":"low","cost_cents":4}
```

`.ai-workflow/audit/` is GITIGNORED (Village critical fix).

### 6.2 — Daily cost rollup (file-based, not Slack)

`.ai-workflow/audit/DAILY-SUMMARY.md` (auto-regenerated each day):

```markdown
# Cost + Activity Summary — 2026-04-19
Total session cost: $1.23
  Claude: $0.89 (26 calls)
  Codex: $0.22 (17 calls)
  Gemini Flash: $0.08 (33 calls)
  Gemini Pro: $0.04 (2 calls)

Iterations completed: 14
Circuit breaker trips: 0
Manual interventions: 0
```

### 6.3 — Soft cost cap (v3 pragmatic)

Configurable daily soft cap (default: `$5/day` per project, Sean can override). At 80% of cap → terminal banner warning. At 100% → Telegram notification via Hermes + require manual confirmation per subsequent AI call. NO hard kill — just friction that prevents runaway loops.

### 6.4 — Stash checkpoint naming

`claude-codex-loop-<timestamp>` prefix so Sean can differentiate manual vs automated stashes.

---

## Rollout Plan (v3 sequenced)

### Week 1 (THIS WEEK)
- Phase 0 repo hygiene (already done for SS-PT; template for other repos)
- Phase 1 directory-scoped permissions + pattern-based denies
- `config/MODEL_VERSIONS.md` with verified IDs

### Week 2
- Phase 1.5 UI Compliance Gate (SwanStudios-specific + portable to any project)
- Phase 4 SOUL.md for SwanStudios

### Week 3
- Phase 2 Claude↔Codex automation (narrow scope: single-file bug fixes first)
- Phase 6.1 audit logging

### Week 4
- Phase 3 Gemini concurrent review
- Phase 6.2 daily summary + soft cap

### Week 5+
- Expand Phase 2 scope (multi-file fixes, then refactors)
- Migrate older projects to this protocol

Each week delivers independent value.

---

## Acceptance Criteria (v3 measurable)

1. Sean completes a typical SwanStudios session with 80%+ fewer permission prompts (baseline: ~60/session)
2. Zero credentials accumulate in `.claude/settings.local.json` over 30-day observation window
3. Phase 2 loop runs a single-file bug fix end-to-end without Sean intervention → clean commit + tests pass
4. Gemini catches at least 1 architectural smell that Codex missed (dual-review signal validation)
5. Sean `/clear`s a session, later opens `SOUL.md`, finds a specific idea from an earlier conversation
6. Circuit breaker halts at iteration 5 on a deliberately-unsolvable test case + git stash restored
7. New-project onboarding Phase 0 completes in < 15 minutes
8. Credential pattern in a simulated Bash command → blocked by pattern-based deny (regression test for tonight's leak)
9. Inline style in a new component → blocked by UI Compliance Gate (regression test for Phase 1.5)
10. Daily cost summary auto-generates; 80% threshold triggers soft warning

---

## Open Questions (for Sean, not Village)

1. **Default daily soft cap:** $5 feels right for solo dev. Too low? Too high?
2. **SOUL.md max entries:** 200 per project. When Sean hits 200, prompt to archive or prune — is that the right trigger?
3. **Phase 1.5 soft-warn patterns:** should soft-warns become errors after a grace period, or stay as warnings forever?
4. **Model verification cadence:** re-verify `config/MODEL_VERSIONS.md` weekly, monthly, or only on explicit rotation?
5. **Escalation iteration numbers:** iteration 4 = manual input required. Too early? Should it be iteration 6 or 7?

---

## Files Changed By This Plan (when rolled out)

- `.gitignore` — add `.ai-workflow/audit/` + `SOUL.md` (gitignored per-project OR tracked per-project — see Q3 to Sean)
- `.claude/settings.json` — new base allow/deny block (Phase 1 + 1.5)
- `config/MODEL_VERSIONS.md` — NEW file
- `scripts/validate-env.sh` — NEW file
- `scripts/ai-workflow-run.sh` — NEW file (orchestrates Phase 2 loop)
- `.ai-workflow/` directory — NEW, gitignored
- `SOUL.md` — NEW at project root
- `docs/ai-workflow/references/3-BRAIN-PIPELINE.md` — compact reference for CLAUDE.md to point to

---

*v3 final. Authored by Claude Opus 4.7 (1M context). Ready for Sean review + Week 1 rollout decision. Village has approved structure; remaining decisions are solo-dev scope choices for Sean.*

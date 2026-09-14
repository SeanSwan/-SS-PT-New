# 3-Brain Asynchronous Pipeline — v2 Plan 2026-04-19

**To AI Village:** Review this blueprint. Analyze for security flaws, permission bottlenecks, token efficiency, overlap with existing SwanStudios systems, and idea-capture reliability. Provide consensus on whether to adopt as the primary coding protocol.

**Scope:** This is a **Sean-facing operating protocol** for solo AI-assisted coding across ALL projects (SwanStudios is primary, but the protocol must also serve side-projects, personal tasks, and future client work).

**Session context:** Written during the same session where Sean and Claude (Opus 4.7) completed a full credential-rotation + git-history-purge security incident, with OpenAI Codex acting as an independent verifier who caught a critical leak in the handoff doc (see `SECURITY-REMEDIATION-2026-04-19.md`). That incident is the real-world proof that dual-AI review works — and also the reason Phase 0 is now mandatory.

---

## Problem Statement (what Sean actually wants)

1. **Stop permission-prompt interruptions** for routine commands. Sean sometimes misses an "Allow" prompt, work stalls, context drifts. He wants frequently-used safe commands auto-approved, clearly dangerous commands explicitly blocked.

2. **Keep dual-AI review discipline** (Claude + Codex) that already works in practice (proven tonight) but make it asynchronous and file-based so the loop is debuggable, replayable, and doesn't hammer API budgets.

3. **Keep Gemini 3.1 Pro as a third independent brain** that cannot modify files — so its architectural review is valuable but can't go rogue.

4. **Preserve good ideas across `/clear` boundaries.** When Sean clears chat context to stay under token limits, he currently loses mid-conversation ideas, visions, and architectural insights he mentioned but never turned into code yet. He wants those captured to a revisitable archive (`SOUL.md` per project) so nothing is lost.

5. **Integrate with — not reinvent — existing SwanStudios systems** already documented in CLAUDE.md:
   - Opus-Codex Recursive Debate Protocol (already defined — this plan EXTENDS it)
   - Hermes Remote Coding Bridge plan (`HERMES-REMOTE-CODING-BRIDGE-PLAN-2026-04-19.md`)
   - AI Village 15-brain validation
   - `scripts/consult-gemini.mjs` (existing Gemini CTO consult)
   - `docs/ai-workflow/AI-HANDOFF/` debate archive + protocol

6. **Support EVERY project**, not just SwanStudios. The operating model has to work when Sean opens a fresh project folder.

---

## What changed from v1 (the 2026-04-19 evening draft)

v1 proposed a clean 4-phase architecture but failed two internal reviews (Claude's self-critique + implicit Codex-style hostile read):

| v1 Proposal | Problem Found | v2 Fix |
|---|---|---|
| Whitelist `Write(*.ts, *.js, *.md)` broadly | Lets Claude overwrite ANY .ts/.js/.md in the whole repo without prompting, including `CLAUDE.md`, `backend/server.mjs`, etc. | Scope writes to specific directories. Explicit deny on sensitive files (`.env*`, `.claude/settings*`, `CLAUDE.md`, `package-lock.json`, `migrations/*`) |
| Async Claude↔Codex loop ends on string-match `"STATUS: 100% CONSENSUS"` | Brittle. What if Codex never agrees? What if AI outputs close-but-not-exact match? No test gate before consensus. No rollback. | Structured JSON status file. Test-suite gate MUST pass before consensus. Git stash before loop. Explicit 5-iteration circuit breaker with escalation, not just halt. |
| Gemini as read-only capstone via standalone script — advisory-only post-consensus | If Gemini catches a real flaw, there's no loop-back. Advisory treated as capstone. Sends "plain text" strips file structure. | Gemini runs CONCURRENT with Codex review (not after). Structured input (file list + test results + diff). If Gemini flags severity-HIGH finding, loop-back to Claude for addressal. |
| `SOUL.md` captures "creative ideas, architectural visions, living soul concepts" | Vaporous extraction criteria = dumping ground. No dedup, no indexing, no retrieval pattern. | Per-project `SOUL.md` with structured entry format: date, project, idea, source-context quote, status, reviewed-on. Auto-dedup via semantic similarity check. Index at top. |
| Telegram notifications via Hermes | Duplicates the Hermes Remote Coding Bridge plan we literally wrote same day with proper privacy gate + TOTP | Reference existing Hermes bridge. Notification integration is a downstream user of the bridge, not a new channel. |

And a **new Phase 0** (immediate pre-flight security check) was added after tonight's credential leak incident.

---

## Phase 0 — Pre-Flight Security Check (MANDATORY before any coding session starts)

**Reason:** Tonight's leak happened because `.claude/settings.local.json` accumulated credentials over 6 months while Sean clicked "Allow" on one-off Bash commands that had JWTs/passwords embedded. The permission streamlining proposed in Phase 1 makes this risk WORSE if we don't address it first.

### 0.1 — One-time repo cleanup (done tonight, documented here for future repos)

Every new project repo gets this before coding begins:

- **`.gitignore` has credential protection block** (use the hardened version from SS-PT as template — covers SSH keys, SSL certs, cloud creds, MCP configs, K8s secrets, tokens, JWT dumps)
- **`.claude/settings.local.json` MUST be in `.gitignore`** — always, no exception, from day 1
- **`git-filter-repo` v2.47+ installed** via `pip install git-filter-repo` for emergency history rewrites
- **GitHub Secret Scanning + Push Protection enabled** (free for personal accounts on public AND private repos)

### 0.2 — Permission file hygiene (prevents credential accumulation in allow-lists)

The root cause tonight: Sean pasted Bash commands with `PGPASSWORD=...`, `TOKEN="..."`, `DATABASE_URL=postgresql://...` directly, and the permission system auto-added them to the allow-list. To prevent recurrence:

- **NEVER paste secrets into shell commands.** Use env vars (`$VAR`) or interactive prompts (`read -s`, Python `getpass`).
- **Regular audit:** Scan `.claude/settings.local.json` weekly for patterns matching `AIza`, `sk-`, `eyJ` (JWT), `postgresql://`, password-like strings. Any hit = rotate + remove.
- **Keep `.claude/settings.local.json` git-ignored FOREVER** — even if it only contains allow-lists, the moment someone pastes a sensitive command, it leaks.

### 0.3 — Pre-session checklist (automatable via skill)

Before any new coding session begins, the system verifies:

1. `git status` clean OR explicit acknowledgment of WIP state
2. `git log --oneline -3` — last 3 commits visible (session memory)
3. No `.env` or `.claude/settings.local.json` showing as modified-and-tracked
4. `.gitignore` credential protection block present (grep check)
5. Current branch is the expected working branch
6. No unexpected `stash@{}` entries (could be orphaned work from earlier sessions)

If any check fails → print warnings + pause for Sean's acknowledgment before proceeding.

---

## Phase 1 — Permission Streamlining (Directory-Scoped, Explicit Denies)

**Goal:** Eliminate 90%+ of permission prompts during normal coding work WITHOUT weakening security posture.

### 1.1 — The allow-list philosophy

Commands/paths fall into 3 buckets:

| Bucket | Handling | Examples |
|---|---|---|
| **Pre-approved (auto-allow)** | Routine, non-destructive, clearly scoped | `Read` anywhere in repo; `Grep`/`Glob`; `git status/diff/log/branch`; `npm run dev/build/test`; `npx vitest`; `npx tsc` |
| **Ask (prompt every time)** | Potentially impactful, context-dependent | `git commit`; `git push`; `npm install <new-package>`; `Write` to config files; `Bash(rm -rf <small-scope>)` |
| **Deny (never allow)** | Dangerous, destructive, security-sensitive | `rm -rf /`, `rm -rf ~`, `chmod 777`, `curl \| bash`, `git push --force main`, `DROP TABLE`, `DELETE FROM Users`, writes to `.env*`, writes to `.claude/settings*`, writes to `CLAUDE.md` (unless explicitly requested in current task) |

### 1.2 — Directory scope for `Write`

The v1 proposal `Write(*.ts, *.js, *.md)` is too broad — lets Claude overwrite `CLAUDE.md` or `backend/server.mjs` without asking. Replace with directory-scoped patterns:

```
allow:
  Write(frontend/src/**/*.{tsx,ts,jsx,js,css})
  Write(backend/{routes,controllers,services,models}/**/*.{mjs,js})
  Write(backend/migrations/**/*.cjs)   # new migrations
  Write(docs/**/*.md)
  Write(tests/**/*.{ts,tsx,spec.ts})
  Write(frontend/src/assets/icons/**/*.{svg,png})

deny:
  Write(.env*)
  Write(backend/.env*)
  Write(frontend/.env*)
  Write(.claude/settings*.json)
  Write(CLAUDE.md)              # unless current task explicitly requested
  Write(.gitignore)             # unless current task explicitly requested
  Write(package-lock.json)      # npm manages this
  Write(.git/**)                # never
```

### 1.3 — Bash command patterns

```
allow:
  Bash(git status:*)           Bash(git diff:*)           Bash(git log:*)
  Bash(git branch:*)           Bash(git stash:*)          Bash(git checkout:*)
  Bash(npm run dev:*)          Bash(npm run build:*)      Bash(npm test:*)
  Bash(npx vitest:*)           Bash(npx tsc:*)            Bash(npx playwright:*)
  Bash(ls:*)                   Bash(cat:*)                Bash(grep:*)
  Bash(find:*)                 Bash(wc:*)                 Bash(head:*)
  Bash(echo:*)                 Bash(mkdir:*)              Bash(cp:*)
  Bash(mv:* <files>)           Bash(node scripts/*:*)     Bash(python scripts/*:*)

ask:
  Bash(git commit:*)           Bash(git push:*)
  Bash(npm install:*)          Bash(npm uninstall:*)
  Bash(rm:*)                   Bash(rm -rf:<small-scope>)

deny:
  Bash(rm -rf /)               Bash(rm -rf ~)            Bash(rm -rf $HOME)
  Bash(chmod 777:*)            Bash(curl * | bash)       Bash(wget * | sh)
  Bash(git push --force main)  Bash(git push --force origin main)
  Bash(git reset --hard origin/main)
  Bash(*PGPASSWORD=*)          Bash(*DATABASE_URL=*)     # pattern: secrets in command line
  Bash(*sk-*)                  Bash(*eyJhbGciOi*)        # common secret prefixes
  Bash(*AIza*)                 # Google API key prefix
```

The **pattern-based denies** (`PGPASSWORD=`, `sk-`, `eyJ`, `AIza`) prevent the exact vector that caused tonight's leak.

### 1.4 — Per-project overrides

The SwanStudios `.claude/settings.json` extends the base with project-specific allows (e.g., `Bash(npm run db:migrate:*)`, `Bash(psql:*)` because local Postgres is in scope for this project).

Other projects start from the base and add their own. No project ever inherits a secret-bearing allow from another project.

---

## Phase 2 — Claude ↔ Codex Asynchronous Review Loop

**Relationship to existing Opus-Codex Recursive Debate Protocol (CLAUDE.md):** This Phase EXTENDS the existing debate protocol, which is manual (Sean pastes Codex responses into Claude). The Phase 2 proposal adds **file-based automation** so the loop runs without Sean in the loop for routine fixes — but Sean can still jump in for major decisions.

### 2.1 — Loop mechanics

```
[Claude implements fix in WORKING_BRANCH]
       ↓
[Claude writes CURRENT_STATE.md → CODEX_QUEUE]
       ↓
[Codex reviews (gets STATE.md + diff + test results)]
       ↓
[Codex writes DIRECTIVES.md → {APPROVE | REJECT | REVISE} + rationale]
       ↓
[If APPROVE + tests pass + Gemini concurrent-review complete → done]
[If REJECT or REVISE → Claude iterates, counter++]
       ↓
[After 5 iterations without consensus → STOP + MANUAL_INTERVENTION_REQUIRED]
```

### 2.2 — Structured status (not string-match)

`REVIEW_STATUS.json` (machine-readable, not brittle string-match):

```json
{
  "phase": "review" | "implementation" | "consensus" | "escalation",
  "iteration": 3,
  "claude_action": "implemented commit abc123",
  "codex_verdict": "REVISE",
  "codex_findings": ["race condition in line X", "missing null check"],
  "tests_passed": true,
  "tests_failed": [],
  "gemini_severity": null,
  "consensus_reached": false,
  "escalation_triggered": false,
  "updated_at": "2026-04-19T22:00:00Z"
}
```

### 2.3 — Test gate (mandatory before consensus)

Consensus CANNOT be declared without:
- Relevant test suite passing (`npx vitest`, `npx playwright`, or task-specific)
- Zero new TS errors (`npx tsc --noEmit`)
- Lint clean (`npm run lint` if exists)

This catches the "both AIs agreed on broken code" failure mode from v1.

### 2.4 — Rollback / git stash safety net

Before the loop starts:

```bash
git stash push -u -m "claude-codex-loop-checkpoint-$(date +%Y%m%d%H%M%S)"
```

If loop produces broken code OR circuit-breaker trips:

```bash
git stash pop  # restores pre-loop state
```

Sean's work is always recoverable.

### 2.5 — Circuit breaker escalation (not just halt)

v1 proposed "STOP + notify user" after 5 iterations. That's reactive. v2 escalates:

| Iteration | Action |
|---|---|
| 1-2 | Normal loop |
| 3 | Claude self-pauses, writes REFLECTION.md explaining stuckness |
| 4 | Opus-level re-read of CURRENT_STATE.md with fresh context (like `/compact`) |
| 5 | HALT + write `MANUAL_INTERVENTION_REQUIRED.md` + Telegram ping via Hermes bridge + git stash pop to restore pre-loop state |

---

## Phase 3 — Gemini 3.1 Pro as Concurrent Read-Only Third Brain

**v1 proposal:** Gemini runs AFTER consensus as advisory-only capstone. Fixed: Gemini now runs CONCURRENT with Codex review, and high-severity findings loop back to Claude.

### 3.1 — Concurrent execution

When Claude writes `CURRENT_STATE.md`, the system dispatches TWO parallel review jobs:

1. **Codex review:** via existing Opus-Codex file protocol
2. **Gemini review:** via existing `scripts/consult-gemini.mjs --review`

Both run in parallel. Gemini's budget for this role is low-cost (Flash 2.5 not Pro 3.1 unless Sean overrides) because it's a read-only architectural-smell check, not deep reasoning.

### 3.2 — Structured input (not plain text)

Gemini receives:

- File list changed in the implementation
- Diff (unified format, not plain text strip)
- Test results (pass/fail counts + specific failures)
- Prior iteration history (compressed if > 3 iterations)
- Relevant CLAUDE.md rules for the task type (e.g., styled-components-only for UI work)

Gemini returns a JSON verdict with severity:

```json
{
  "severity": "none" | "low" | "medium" | "high" | "critical",
  "findings": ["...", "..."],
  "suggested_improvements": ["..."]
}
```

### 3.3 — Gemini's sandboxed script

Gemini cannot modify files. Enforcement = Python script with NO `Write`/`Edit` imports, running in a restricted subprocess with no filesystem write permissions. This IS a genuinely clever pattern — preserved from v1.

### 3.4 — Loop-back rule

If Gemini returns `severity: "high" | "critical"` AND Codex returns `APPROVE` — the system does NOT declare consensus. Loop-back to Claude with Gemini's findings attached. Codex re-reviews after Claude's next iteration.

If Gemini returns `severity: "low" | "medium"` — advisory only, does not block consensus.

---

## Phase 4 — SOUL.md: Idea Archive Across `/clear` Boundaries

**Sean's actual goal (clarified this session):** When he types `/clear` to stay under token limits, he loses mid-conversation ideas, visions, and insights he never turned into code. He wants those captured to a revisitable archive so great ideas don't die in compacted contexts.

**Scope:** Per-project, supports ANY project. For SwanStudios, `SOUL.md` lives alongside `CLAUDE.md`. For side projects, it lives at project root.

### 4.1 — Extraction criteria (must be objective, not "creative vibe")

Claude captures a candidate SOUL entry when a user statement contains:

- **An idea for the project NOT in the current codebase** ("we could add X", "what if we built Y", "imagine Z")
- **An architectural insight** ("the reason this hurts is because...", "we should separate A from B")
- **A vision statement** ("the long-term goal is...", "what makes this premium is...")
- **A specific constraint or rule** ("we never want to use Z", "avoid this pattern")
- **A named future feature** ("Phase 17", "the workout timeline", "Swan Oracle v2")

NOT captured:
- Implementation details for the CURRENT task
- Bug reports (those go to issue tracker)
- Chat reactions ("good", "nice", "ok")

### 4.2 — Entry format

```markdown
## 2026-04-19 — Avatar Mirror System reflects logged health data
**Project:** SwanStudios
**Source context:** "...my avatar gets weaker when I don't log workouts or eat poorly..."
**Idea:** Personal avatar that visibly mirrors the user's health state based on training/nutrition logs. Avatar is separate from companion pets. Run through AI Village before implementing.
**Status:** captured | reviewed | in-plan | implemented | rejected
**Cross-refs:** See `avatar_mirror_system.md` memory entry
```

### 4.3 — Capture workflow

- Claude detects candidate (per 4.1) during normal conversation
- Claude appends the candidate to `SOUL.md` draft zone (top of file)
- At end of session, Claude consolidates draft-zone entries into the archive
- Before `/clear`: Claude guarantees all candidates are persisted

### 4.4 — Dedup via semantic similarity

Before adding a new entry, Claude checks the existing archive for similar ideas. If similarity > 70% → append the new context as an UPDATE to existing entry rather than a new entry. Prevents the "dumping ground" failure mode from v1.

### 4.5 — Index at top (for fast retrieval)

`SOUL.md` has an auto-maintained index:

```markdown
# SOUL.md — SwanStudios Idea Archive
Last updated: 2026-04-19 | Entries: 47 | Open status: 23

## Quick index
- Avatar Mirror System (2026-04-19) — status: captured
- Hermes Remote Coding Bridge (2026-04-19) — status: in-plan
- Plaud audio pipeline (2026-04-14) — status: in-plan
- ...
```

### 4.6 — Review cadence

Weekly (or per-session at Sean's option): Claude sweeps `SOUL.md` and flags entries with status `captured` that have sat untouched for > 2 weeks. Asks Sean: promote to plan, implement, reject, or let sit.

---

## Phase 5 — Integration with Existing Systems (not parallel reinvention)

### 5.1 — Hermes Remote Coding Bridge

Already planned in `HERMES-REMOTE-CODING-BRIDGE-PLAN-2026-04-19.md`. This Phase 2 loop is a DOWNSTREAM user of the bridge — when circuit breaker trips, the `MANUAL_INTERVENTION_REQUIRED` notification uses the Hermes Telegram bridge (not a separate Telegram integration).

### 5.2 — AI Village 15-brain validation

For MAJOR architectural changes only (not every fix). The Phase 2 loop is for routine implementation. Village is for initial planning + final major pivots.

### 5.3 — Opus-Codex Recursive Debate Protocol (CLAUDE.md)

Manual debates continue for strategic decisions where Sean wants his eyes on every round. Phase 2 automation is for tactical fixes where speed matters more than Sean's round-by-round oversight.

**Decision rule:** Is Sean explicitly asking to review Codex's output? If yes → manual debate protocol. If no (routine implementation) → Phase 2 automated loop.

### 5.4 — `scripts/consult-gemini.mjs`

Existing infrastructure. Phase 3 extends with the `--structured` flag (new) that takes JSON input and returns JSON output. Backward compatible with existing `--plan`, `--design`, `--review`, `--ask` modes.

---

## Phase 6 — Observability, Token Budget, Audit Log

### 6.1 — Audit log

Every automated action writes to `.ai-workflow/audit/YYYY-MM-DD.jsonl`:

```json
{"ts": "2026-04-19T22:00:00Z", "actor": "claude", "action": "write", "target": "frontend/src/...", "iteration": 2, "session": "abc123"}
{"ts": "2026-04-19T22:00:05Z", "actor": "codex", "action": "review", "verdict": "REVISE", "findings": 3}
{"ts": "2026-04-19T22:00:07Z", "actor": "gemini", "action": "review", "severity": "low"}
```

Sean can review history, debug loops post-facto, and detect anomalies.

### 6.2 — Token budget

Each loop iteration's token usage recorded. Daily rollup at `audit/token-summary.md`. If daily tokens > threshold (configurable per-project), system self-throttles and prompts Sean before continuing.

### 6.3 — Git stash checkpoint naming

Stashes created by the loop have a consistent prefix `claude-codex-loop-` so Sean can identify and clean up old ones without disturbing his manual stashes.

---

## Rollout & Acceptance Criteria

### Success criteria (what makes this LIVE)

1. Sean runs a typical SwanStudios coding session and experiences 80%+ fewer permission prompts
2. Zero credentials end up in `.claude/settings.local.json` allow-list
3. Claude↔Codex loop runs a fix end-to-end without Sean intervention, produces clean commit
4. Gemini catches at least one architectural smell that Codex missed in a dual-review sample
5. Sean `/clear`s a session and later opens `SOUL.md` to find a specific idea he mentioned an hour prior
6. Circuit breaker trips correctly on a deliberately-unsolvable test case
7. Any new project onboarding Phase 0 completes in < 15 minutes
8. Dual-AI catches a simulated credential in handoff doc before commit (regression test for tonight's Codex catch)

### Phased rollout

- **Week 1 (tonight + next session):** Phase 0 + Phase 1 permissions update. Tightest-scoped allow-list goes live. Test on 3 real tasks.
- **Week 2:** Phase 4 SOUL.md for SwanStudios only. Test idea-capture on 3 sessions with intentional `/clear`.
- **Week 3:** Phase 2 Claude↔Codex automation for narrow scope (single-file bug fixes only). Build up from there.
- **Week 4:** Phase 3 Gemini concurrent review.
- **Week 5:** Phase 6 observability + audit logs.

Each week's work is independently valuable — no big-bang deploy.

---

## Questions for AI Village Review

1. **Is Phase 1's directory-scoped allow-list tight enough?** Or still too broad in places (e.g., `Write(frontend/src/**/*.{tsx,ts,jsx,js,css})` could still let Claude overwrite critical files like `App.tsx`)?

2. **Is the Phase 2 circuit-breaker escalation (iteration 3 → REFLECTION, iteration 4 → Opus re-read, iteration 5 → HALT) the right granularity?** Or should it be more aggressive (halt sooner)?

3. **Is the Phase 3 structured input (diff + test results + rules) enough for Gemini to do real review?** Or does it need more (runtime screenshots, type-check errors, dependency graph)?

4. **Is the Phase 4 extraction criteria objective enough?** Or will Claude still flag too many / too few things as SOUL-worthy?

5. **Does this plan create any security regressions** (even small ones) compared to current state?

6. **Are there critical SwanStudios constraints we missed** (e.g., styled-components-only, 44px touch targets, Dual-Button Glow) that the allow-list should auto-enforce by pattern?

7. **Can this plan work for non-SwanStudios projects from day 1**, or does it have SS-specific coupling?

8. **What does the Phase 0 Pre-Flight Security Check look like as a `.claude/skills/` skill?** Should it auto-run at session start (hook in `.claude/settings.json`)?

9. **Should SOUL.md entries auto-sync to the existing auto-memory system** (`<HOME>\.claude\projects\...\memory\`)? They seem like adjacent concerns.

10. **What's the failure mode if Codex service is unavailable** (rate-limited, down)? Does the Phase 2 loop gracefully fall back to Claude-only or block entirely?

11. **Does the $0 / $0.42 / $X per session cost model work** across the 3-brain split, or is one layer disproportionately expensive?

12. **Is there anything tonight's security remediation session (real-world dual-AI review proof) teaches us** that this plan isn't yet capturing?

---

*Authored by Claude Opus 4.7 (1M context) during SwanStudios session 2026-04-19, following the same session's credential-rotation + git-history-purge security incident. v1 draft evaluated by self-critique identified the 5 fixes above. Ready for 15-brain Village review to find everything v1 + v2 still miss.*

# ACTIVE PRIORITIES

**Purpose:** Stable current priority board for SwanStudios production stability and the next implementation slices.
**Status:** Evergreen file. Update this when production priorities shift.
**Read after:** `CLAUDE.md`, `ACTIVE-INDEX.md`
**Last updated:** 2026-09-25 (full evidence rebuild by vs-claude/GLM-5.3 — every entry re-verified against the live tree per rule 88; previous update 2026-05-15)
**Rule-88 discipline:** entries carry as-of dates. Anything you cannot re-verify before acting on, treat as stale and check the live source.

---

## Purpose

This file is the canonical "what matters now" tracker.

- Use this for current production priorities and next-slice sequencing.
- Do not treat `CURRENT-TASK.md` as the live priority board; it is historical context.
- Keep `CLAUDE.md` compact and use this file for the active backlog.

---

## Current Production State (verified 2026-09-25)

- Branch `creator-brains-engine-r2-20260915` is **in sync with origin**; the 2026-09-22 object-store incident's unpushed-exposure class is closed for this branch (pushed through `9edd7fa76`).
- **Active workstream (from git history, last ~20 commits):** the creator-brains console lane — five release sites wired (`0761650fc`), keyed-id redaction class widened (`9eb93e6b2`), creator-add reply deadline fix (`b6030a83d`), refused-repair returns 422 not success-200 (`6c9f15490`), privacy: `selectedClientName` inadmissible in any form (`d18cc8e91`), socket auth consulting the token-revocation registry (`bbfb7a1a1`), gallery photo-number race (`ac2e13a90`), M1 import-closure guard wired into pre-commit (`8509b2f39`), GLM transport titling fix (`503e801d2`), Swan Coach dock inline mic dictation (`2986619ef`).
- **Rulebook upgraded 2026-09-25:** rules 87–90 added + rules 71/73 amended (`501bbb12a`), Open Items volatile-fact prune (`ef7e2d3a4`), mandatory Where-We-Are/What's-Next closeout block landed by rescue (`9edd7fa76`).
- **Swan Coach command surface — code-level liveness VERIFIED on THIS BRANCH:** `initializeRegistry()` registers **121 commands across 14 categories** at runtime (the registry docblock's "119 across 16" is stale); `view_available_slots` is registered; scoped dispatcher suites **46/46 green** after the 2026-09-25 contract fix (`2012086ee`). **Production parity: diverged** — main @ `467009c` self-reports 139 commands (2026-08-21 recount); re-count after next merge (see What's Next #3).
- **2026-09-22 incident debts (§10):** (1) re-commit decision for surviving untracked work — **SEAN'S CALL, still open**; (2) the gc/concurrency question — answer filed with the 3-day hostile review record (`ae2c0bac4`); (3) `emailTemplates.mjs` private escaper — **RESOLVED** (verified 2026-09-25: imports shared `escapeHtml` from `utils/htmlEscape.mjs` at line 18).
- ⚠ **DB connectivity — CORRECTED 2026-09-25 (two credentials, not one):** the **Render production credential is VALID** (direct probe 2026-09-25: TCP open, auth OK, `SELECT 1` → 1 against `dpg-cv1qga1u0jms738nc8lg-a.oregon-postgres.render.com`). The vitest "password authentication failed for swanadmin" failures were **the H-06 guard working as designed** (`database.mjs:39-76` — it refuses the hosted DB from non-production processes because test suites once wrote to production SequelizeMeta) and falling back to the **LOCAL PostgreSQL** (listening on localhost:5432) where the `PG_USER=swanadmin` / `PG_PASSWORD` pair in `backend/.env` does not match the local instance. An earlier board entry wrongly implied the Render credential might be stale — corrected.

---

## What's Next (ranked recommendation, 2026-09-25)

1. ~~**P1 — Fix the verified coach contract defect**~~ ✅ **RESOLVED 2026-09-25** (`2012086ee`): triage verdict — the dispatcher was RIGHT (the `UserAchievement` table has no `isNew` column; rule-58-verified 2026-07-29 in `clientSelfServiceReadDispatchers.mjs:243`); the stale test line + harness mock re-created the exact query that threw against the live DB. Both now assert the real semantics (`isCompleted` + `notificationSent:false`); scoped suites **46/46**.
2. **P2 — Local PostgreSQL credential fix** (reframed from "Render credential rotation", which is NOT needed): test-mode DB-backed smoke authenticates against LOCAL PG (`PG_HOST`/`PG_USER`/`PG_PASSWORD` in `backend/.env`) and that pair fails. **Launcher ready 2026-09-25: `c:/tmp/sspt-local-pg-fix.ps1`** — Sean runs it once (prompts interactively for the local `postgres` superuser password; aligns the local role to the `.env` pair; SQL via stdin, secrets never echoed; output redacted to `c:/tmp/sspt-local-pg-fix.out.txt`). DB-free unit suites are unaffected (most don't touch the DB).
3. **P2 — Production dispatch probe (app half):** partially verified 2026-09-25 — **live API is healthy** (`/api/health` → 200, `"ready":true`, deployed from `main` @ `467009c`, uptime ~25.7h at probe) and the admin surface **refuses unauthenticated calls live** (`/api/admin/system/health` → "Not authorized, no token") — the auth gate is production-enforced. Remaining: an authenticated command round-trip (needs a real user credential — Sean's to grant or run). **Registry parity note:** production's registry self-reports **139 commands** (its own 2026-08-21 recount) vs **121 on this branch** — main and this branch diverged at `40791570a`; **re-run the registry count after the next merge to main** (rule 88: counts are per-tree).
4. **P2 — Sean decisions owed:** (a) re-commit policy for any remaining untracked 2026-09-22 surviving work (incident §10.1); (b) confirm or re-rank the carried business priorities below.
5. **Carried business priorities (from the 2026-05-09 product plan — SEAN, confirm still current before investing):** Stripe store/cart/session purchase readiness (note: CLAUDE.md still records `/api/cart/add` 404 as unresolved, as-of 2026-04-11 — probe before assuming it reproduces, rule 55); client onboarding/account readiness; teach-first guided flows; PLAUD intake audio playback.

---

## Priority Stack

**Completed through 2026-05-15:** the former stack items 1–7 and the Phase 18.B/19.A/19.B lanes are DONE — full history in `git log` and the archived April/May versions of this file (`git show 625359441:docs/ai-workflow/AI-HANDOFF/ACTIVE-PRIORITIES.md`).

**Carried (open) items:**

1. **P1 (2026-09-25) — coach self-service XP/streak contract defect** — see What's Next #1.
2. **P1 (2026-09-25) — local DB auth restoration** — see What's Next #2.
3. **P2 (carried from ≤2026-04-22, still unverified done) — writer-side default-value fix:** `formRating`, `set.rpe`, `overallIntensity` explicit-interaction persistence vs seeded neutral defaults. `enhancedProgressAnalyticsTruth.test.ts` exists — check whether it already locks the desired behavior before re-planning.
4. **Later — official PLAUD OAuth/webhook integration** (as-of 2026-04-14: private beta / waitlist).
5. **Later — Gemini File Upload API for transcripts > 20MB** (cap enforced at 3 layers; separate slice when stable).

---

## Blocked / Deferred

- Official PLAUD existing-account sync — private beta per April 2026 note; re-verify before depending on it.
- `CURRENT-TASK.md` remains historical; do not revive it as the priority board.
- DB-backed local test smoke: blocked only by the LOCAL PostgreSQL credential (see What's Next #2); production DB itself is reachable and its credential is valid — any deliberate prod-DB smoke from a non-production process requires `SWAN_DEV_ALLOW_PRODUCTION_DATABASE_URL=1` (H-06 guard; touches production — Sean's explicit call).

---

## Latest Verified Commits (as-of 2026-09-25)

- `2012086ee` - test(coach): align self-service badge contract with the real schema (46/46)
- `49dd46f1e` - chore(mirrors): regenerate AGENTS/CODEBUDDY/GEMINI from CLAUDE.md
- `5816d5822` - docs(priorities): full rule-88 evidence rebuild of ACTIVE-PRIORITIES
- `2986619ef` - fix(coach): inline mic dictation in the Swan Coach dock
- `503e801d2` - fix(ai-workflow): GLM transport document titling
- `2bef60d74` - docs(ai-workflow): review record's eight majors marked fixed
- `8509b2f39` - chore(hooks): M1 import-closure guard wired into pre-commit
- `ac2e13a90` - fix(gallery): lost photo-number race re-numbers instead of 500
- `bbfb7a1a1` - fix(socket): socket auth consults the token-revocation registry
- `ae2c0bac4` - docs(ai-workflow): 3-day hostile review record (67 commits) with the gc-question answer
- `6cd3ea72f` - chore(hygiene): strip generated logo-evidence bundles

---

## Next Claude Prompt Source

Future sessions should start with:

1. `CLAUDE.md`
2. `ACTIVE-INDEX.md`
3. `docs/ai-workflow/AI-HANDOFF/ACTIVE-PRIORITIES.md`
4. Relevant continuity handoff docs

Use this file as the current source of truth for sequencing the next bug-fix or implementation slice — and re-verify its dated entries against the live tree before leaning on them (rule 88).

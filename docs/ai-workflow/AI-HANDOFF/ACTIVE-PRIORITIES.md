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
- **Swan Coach command surface — code-level liveness VERIFIED:** `initializeRegistry()` registers **121 commands across 14 categories** at runtime (the registry docblock's "119 across 16" is stale); `view_available_slots` is registered; scoped dispatcher suites **45/46 green** with 1 named contract defect (see Priority Stack P1-1).
- **2026-09-22 incident debts (§10):** (1) re-commit decision for surviving untracked work — **SEAN'S CALL, still open**; (2) the gc/concurrency question — answer filed with the 3-day hostile review record (`ae2c0bac4`); (3) `emailTemplates.mjs` private escaper — **RESOLVED** (verified 2026-09-25: imports shared `escapeHtml` from `utils/htmlEscape.mjs` at line 18).
- ⚠ **Local DB auth is failing** (2026-09-25: `DATABASE_URL` rejected, password authentication failed for `swanadmin`; later attempt `ECONNRESET`). Since local dev uses the production DB, this blocks ALL local smoke. Credential rotation status is Sean's domain — not probed further (rule 59).

---

## What's Next (ranked recommendation, 2026-09-25)

1. **P1 — Fix the verified coach contract defect** `clientSelfServiceCommandDispatcherContract.test.mjs` > "summarizes XP, streaks, and badges without profile PII": dispatcher queries `isNew: true`, test expects `isCompleted: true`. Small, test-covered; triage which side is right before touching either (rule 52). Owning seat: coach lane.
2. **P1 — Restore local DB auth.** Without it, no local smoke anywhere (the "works locally = works in production" path is dark). Check whether `swanadmin` was rotated and update the local env — Sean/credentials domain.
3. **P1 — Production dispatch probe** for the 121-command surface (authenticated command round-trip against the running backend). Unblocked by item 2. This is the last step to retire the `[UNKNOWN]`-class production claims in CLAUDE.md's coach lane.
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
- Production smoke of any kind until local DB auth is restored (see What's Next #2).

---

## Latest Verified Commits (as-of 2026-09-25)

- `9edd7fa76` - rescue(rulebook): land the co-writer closeout-section lines (byte-for-byte, private index)
- `625359441` - docs(learning): ledger line for the shared-index concurrency lesson
- `ef7e2d3a4` - docs(claude-md): rule-88 volatile-fact prune of Open Items
- `501bbb12a` - docs(claude-md): add rules 87-90 and harden 71/73
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

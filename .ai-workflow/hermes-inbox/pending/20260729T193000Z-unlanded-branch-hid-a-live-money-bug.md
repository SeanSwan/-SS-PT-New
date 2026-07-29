# An unlanded branch was hiding a live money bug — and `git cherry` can't tell you that

**When:** 2026-07-29 (UTC) · **Where:** VS-Claude terminal · **Linear:** SWA-75 / SWA-62 / SWA-87 / SWA-89
**Handoff:** `docs/ai-workflow/AI-HANDOFF/BRANCH-PARITY-AND-UNLANDED-WORK-HANDOFF-2026-07-29.md`

## The headline lesson

**"Is this branch's work on main?" is a content question, not a commit question — and answering it wrong hides production bugs.**

`git cherry origin/main HEAD` compares **patch-ids**. A fix reimplemented differently on main reads as `+` (absent) even though the substance is present; a fix that never landed reads the same way. Identical signal, opposite meaning. The only answer that holds is per-file: `git cat-file -e origin/main:<path>` for new files, and a grep for the *fix marker* for modified ones.

Result here: 47 commits absent, **11 of 13 key runtime files do not exist on main at all**. Genuinely unlanded — not lost, not half-merged. Better than silent corruption; worse than assumed.

## What the verification actually found (the reason it mattered)

Checking *whether* the work landed surfaced two things live on main:

1. **Independent trainers underpaid 20 percentage points.** `creditsController.mjs:132` calls `calculateCommissionSplit` with **4 arguments** — the 5th (`{ trainerType }`) is never passed. So `options.trainerType || 'hired'` → else-branch → 65% where an independent trainer is owed 85%. `grep -c trainerType` in that file = **0**. Route is mounted (`routes.mjs:720`). ~$1,680 short on an $8,400 package. **Silent** — no error, plausible-looking split, nothing logged.
2. **Two DELETE routes missing the owner-admin guard** (`adminPackageRoutes.mjs:325,596`; `grep -c ownerAdminOnly` = 0). Any admin can delete storefront packages.

Both fixes were **already written and Codex-reviewed** on the unlanded branch (`0b60de7db`). The bug wasn't unfixed — it was **unshipped**. That is a distinct failure mode worth naming: a review-approved fix sitting on a branch is worth zero.

**The sibling caller was fine.** `CommissionService.mjs:85-111` reads `trainer.trainerType` from the DB and passes it. Only one of two callers was broken — so a blanket "fix the calculator" would have broken the correct path. Check every caller before changing a shared money function.

## Method notes worth keeping

- **`grep -c` exits 1 on zero matches** and silently truncates an `&&` chain. Two verification batches this session died mid-run and *looked* like a passing result. Append `|| true`.
- **`git cat-file -e <ref>:<path>` inside an `&&`/`||` chain gave a false ABSENT** on a file `git ls-tree` listed. When two git queries disagree, resolve with `ls-tree` on the exact path, then read the blob by SHA.
- **Counts drift under you.** The behind-count moved 1,237 → 1,238 mid-write because other agents push continuously. Put the derivation command in the doc, not just the number.
- **No version endpoint exists** (`/version` → 503, `/api/version` → 404), so you cannot tell what is deployed without the Render dashboard. This blocked deploy verification. ~15 lines exposing `RENDER_GIT_COMMIT` fixes it permanently.

## Facts for the next session

- The **SWA-87 bugs are on main (live); the audits that prove them are branch-only.** That asymmetry is why they keep getting rediscovered — `audit-write-paths.mjs` is ABSENT from main.
- **Gamification cannot award anything.** `UserAchievement` declares phantom `maxProgress`; both write paths are structurally impossible; table = 0 rows. Presents as "quiet," not "broken."
- **Sequelize `create()` builds its INSERT from all model-declared attributes**, not just the keys passed — so trimming the caller's payload does NOT fix a write. Reconcile the model against the table.
- `.claude/settings.json` conflicts on merge: **keep main's** Hermes auto-closeout command hook (`5c2eb2f08`).
- Failing-test baseline is **23**, verified on a pristine `origin/main` worktree. Not regressions. Confirm on a clean worktree before blaming your own change.

*IDs, paths and SHAs only. No PII, credentials, or customer data.*

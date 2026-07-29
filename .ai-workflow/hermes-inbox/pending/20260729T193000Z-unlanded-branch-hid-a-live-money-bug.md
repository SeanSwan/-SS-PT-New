# An unlanded branch was hiding a live money bug — and `git cherry` can't tell you that

**When:** 2026-07-29 (UTC) · **Where:** VS-Claude terminal · **Linear:** SWA-75 / SWA-62 / SWA-87 / SWA-89
**Handoff:** `docs/ai-workflow/AI-HANDOFF/BRANCH-PARITY-AND-UNLANDED-WORK-HANDOFF-2026-07-29.md`

## The headline lesson

**"Is this branch's work on main?" is a content question, not a commit question — and answering it wrong hides production bugs.**

`git cherry origin/main HEAD` compares **patch-ids**. A fix reimplemented differently on main reads as `+` (absent) even though the substance is present; a fix that never landed reads the same way. Identical signal, opposite meaning. The only answer that holds is per-file: `git cat-file -e origin/main:<path>` for new files, and a grep for the *fix marker* for modified ones.

Result here: 47 commits absent, **11 of 13 key runtime files do not exist on main at all**. Genuinely unlanded — not lost, not half-merged. Better than silent corruption; worse than assumed.

## What the verification actually found (the reason it mattered)

Checking *whether* the work landed surfaced two things live on main:

1. **An independent trainer WOULD be underpaid 20 points — latent, not yet firing.** `creditsController.mjs:132` calls `calculateCommissionSplit` with **4 arguments**; the 5th (`{ trainerType }`) is never passed. So `options.trainerType || 'hired'` → else-branch → 65% where independent is owed 85%. `grep -c trainerType` in that file = **0**. Route is mounted (`routes.mjs:720`) and the split is **persisted** to `trainer_commissions`. Executed against main's calculator: **$1,680** short on $8,400, **$3,360** on $16,800, **$6,720** on $33,600 — a **constant 20 points of gross** across every lead source and with the loyalty bump, so there is no milder case.

   **But the live DB says nothing is lost yet:** 0 trainer-role users, `trainer_commissions` 0 rows, `TrainerCommissions` (PascalCase) no such table. **Fix before the first independent trainer is onboarded and the cost is zero; after, it is back-pay plus reconciliation.** That is the whole reason it sequences first — a closing window, not a current drain.
2. **Two DELETE routes missing the owner-admin guard** (`adminPackageRoutes.mjs:325,596`; `grep -c ownerAdminOnly` = 0). Any admin can delete storefront packages.

The authz fix was **already written and Codex-reviewed** on the unlanded branch (`0b60de7db`) — unfixed vs **unshipped** is a distinct failure mode worth naming: a review-approved fix sitting on a branch is worth zero.

## The sharper lesson: "the fix exists on the branch" was itself wrong

I wrote that first, then checked. **The branch fix does NOT close the money hole.** Its resolver `baseRatesForType()` throws on an unknown type — but the caller is `options.trainerType || DEFAULT_TRAINER_TYPE`, and `DEFAULT_TRAINER_TYPE = 'affiliated'` = `{businessRate: 35, trainerRate: 65}`. So an **absent** type never reaches the throw; it silently resolves to the same 65%.

| `creditsController` passes no type → | trainer gets |
| -- | -- |
| main today: `'hired'` → else-branch | 65% |
| after landing the fix: `'affiliated'` default | **65% — identical** |

`git show 0b60de7db --name-only` does not include `creditsController.mjs`. **A fail-loud helper is not a fail-loud path** — one defaulting caller upstream neutralises it completely. Check the call site, not the helper's contract.

**Generalisable:** when a fix is described as "no silent fallthrough," verify where the default is applied. A `|| DEFAULT` above a throwing resolver means the throw is dead code for the exact case it was written for.

## Third lesson: severity needs the DATA, not just the code

Code proved the bug was *possible*. Only the live DB could say whether it had *victims* — and it had none (0 trainers, 0 commission rows). I had already written "money owed to real people, accruing silently" into the recommendation section before checking. **A code-only read systematically over-states urgency**, because code shows capability while data shows incidence. Both are needed, and the doc that recommends the fix order needs the data one.

Corollary that survived: latent still sequenced first, but for a different and more defensible reason — **the cost of this bug depends on when you fix it** (before the first trainer: free; after: back-pay + reconciliation), whereas the live schema bugs cost the same whenever they are fixed. Sequencing on a closing window is sound; sequencing on a fabricated current loss is not.

## Fourth: my own edits were a defect source

Round 6 caught **3 stale `1,237` references** my earlier corrections had missed (I fixed 2 of 3), a count that had drifted 47→48 *during the session*, and an internal contradiction where §2.1 said "already in the books" while the DB section said 0 rows. Round 7 found the same stale claim had **also** survived in §5 — the recommendation section, the worst place for it.

Then a `bash` heredoc feeding `python` **ate the backticks** in a replacement string (shell command substitution), silently producing "Three defects on , all proven" in the headline. **Never edit backtick-bearing markdown through a shell heredoc** — use the file-edit tool. `grep -c` also exits 1 on zero matches and truncated two `&&` verification chains this session; append `|| true`.

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

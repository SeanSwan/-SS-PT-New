---
decision: 47 commits on wip/comms-notifications-2026-07-05 are genuinely ABSENT from main, not lost in translation. Verifying that surfaced a P0 live commission underpayment (creditsController passes no trainerType -> independent trainers get 65% instead of 85%) which the unlanded branch fix does NOT close, plus 2 unguarded DELETE routes live on main.
status: open
supersedes: none
---

# Handoff — branch parity, unlanded work, and what is broken on main RIGHT NOW

**Date:** 2026-07-29 · **Author:** vs-claude (Opus 5) · **Linear:** SWA-75 (launch audit), SWA-62 (commission), SWA-87 (schema drift), SWA-89 (script guards), SWA-74 (gym-ops)
**Written to `main` deliberately** so any agent on any branch can find it.

> **Read this section first if you read nothing else.** Two things are broken in production right now, both proven by execution. The authz one is fixed on a branch that never landed. **The money one is NOT fixed anywhere — and the branch fix that looks like it closes it does not.** See §2.

---

## 1. The question Sean asked, and the answer

**Question:** the branch that is ~1,238 commits behind main — is its work "just sitting there," or is it "getting lost in translation"? Is the code actually being applied?

> **On the numbers in this doc:** the behind-count moved 1,237 → 1,238 during the 20 minutes it took to write this, because other agents keep pushing to `main`. Treat every count here as "as of 2026-07-29" and re-derive it with the commands in §6 before acting. The *findings* are stable; the *arithmetic* drifts.

**Answer: it is genuinely sitting there, unlanded. Nothing was lost in translation — the code was never applied to main at all.** That is better news than silent loss (nothing is corrupted or half-merged) and worse news than expected (real fixes, including a money bug, have never reached production).

### Why `git cherry` alone was not enough to answer this

`git cherry origin/main HEAD` compares **patch-ids**. A fix that was later reimplemented differently on main reads as `+` (absent) even though the *substance* is present. So a commit-level answer cannot answer "is the code applied." Content-level verification was required, and was done.

### Method used (reproducible)

```bash
cd <repo>
git fetch origin main
git cherry origin/main HEAD | awk '{print $1}' | sort | uniq -c      # 47 '+', 4 '-'
# then, per key file, the decisive check:
git cat-file -e origin/main:<path> && echo ON MAIN || echo ABSENT
# and for MODIFIED files, compare substance not existence:
git show origin/main:<path> | grep -nE '<the fix marker>'
```

### `[VERIFIED]` Content-level result — 11 of 13 key runtime files do not exist on main

| File | On `origin/main`? |
| -- | -- |
| `backend/models/Location.mjs` | **ABSENT** |
| `backend/controllers/locationController.mjs` | **ABSENT** |
| `backend/routes/locationRoutes.mjs` | **ABSENT** |
| `backend/tests/unit/locationController.test.mjs` | **ABSENT** |
| `backend/config/gymPolicy.mjs` | **ABSENT** |
| `backend/config/economicsFlags.mjs` | **ABSENT** |
| `backend/services/economics/shadowObserver.mjs` | **ABSENT** |
| `backend/scripts/audit-model-health.mjs` | **ABSENT** |
| `backend/scripts/audit-write-paths.mjs` | **ABSENT** |
| `backend/scripts/audit-named-exports.mjs` | **ABSENT** |
| `scripts/check-main-parity.mjs` | **ABSENT** |
| `scripts/catalog-regen.mjs` | ON MAIN |
| `docs/ai-workflow/CATALOG.md` | ON MAIN |

Only the Rule-72 Catalog work landed (it went to main by a separate route). Everything else is branch-only.

**Conclusion:** the branch is a genuine unlanded work queue, not a merge artifact. It needs a deliberate landing operation, not a push.

---

## 2. `[VERIFIED]` What is broken on `main` right now

These are live on production. Both were found by *executing* code, not reading it.

### 2.1 P0 — MONEY. Independent trainers are underpaid 20 percentage points on one purchase path

**Mechanism, proven end to end on `origin/main`:**

1. `backend/core/routes.mjs:720` → `app.use('/api', creditsRoutes)` — **mounted**
2. `backend/routes/creditsRoutes.mjs:28,41` → `creditsController.adminPurchaseAndGrant`, `creditsController.trainerPurchaseAndGrant`
3. `backend/controllers/creditsController.mjs:132` calls the calculator with **4 arguments — no options object**:

```js
const commission = calculateCommissionSplit(
  leadSource,
  taxCalc.grossAmount,
  sessionsGranted,
  applyLoyaltyBump          // <-- 4 args. The 5th ({ trainerType }) is never passed.
);
```

4. `backend/utils/commissionCalculator.mjs:49` → `const trainerType = options.trainerType || 'hired';`
5. `:55` → `if (trainerType === 'independent') { 15/85 } else { 35/65 }`

**Result:** `trainerType` is `undefined` → defaults to `'hired'` → **else** branch → trainer gets **65%** when an independent trainer is entitled to **85%**.

**Corroboration:** the string `trainerType` appears **0 times** in `creditsController.mjs` on main (`grep -c` → 0).

**Dollar impact at Sean's real prices:** 20 points on the 3-month package ($8,400) = **$1,680** short. On the 6-month ($16,800) = **$3,360** short.

**Why it is silent:** there is no error. The split is computed, persisted, and looks plausible. Nothing logs a warning.

**The other caller is FINE — do not "fix" it.** `backend/services/CommissionService.mjs:85,93,106-111` reads `trainer.trainerType` from the DB and passes it. Only the `creditsController` path is affected. A blanket change risks breaking the correct path.

### 🛑 `[VERIFIED]` The unlanded fix does NOT fix this. Landing the branch is not enough.

**This corrects an earlier reading in this same document — verify it yourself before acting, then trust the verification, not the intuition.**

Commit `0b60de7db` (SWA-62 S0) adds `backend/utils/commissionRates.mjs` with a genuinely fail-loud resolver:

```js
export function baseRatesForType(trainerType) {
  const rates = BASE_RATES[trainerType];
  if (!rates) throw new Error(`[commissionRates] Unknown trainerType "${trainerType}". ...`);
  return rates;
}
```

**But the caller never reaches the throw.** The branch's `commissionCalculator.mjs:59-60` is:

```js
const trainerType = options.trainerType || DEFAULT_TRAINER_TYPE;   // <-- absent type is DEFAULTED, not thrown
const base = baseRatesForType(trainerType);
```

And `commissionRates.mjs:28,36-37`:

```js
export const DEFAULT_TRAINER_TYPE = 'affiliated';
export const BASE_RATES = Object.freeze({
  independent: { businessRate: 15, trainerRate: 85 },
  affiliated:  { businessRate: 35, trainerRate: 65 },   // <-- same 65% as today
});
```

**So the arithmetic is unchanged for this path:**

| | `creditsController` passes no type → | trainer receives |
| -- | -- | -- |
| main today | `'hired'` → else-branch | **65%** |
| after landing `0b60de7db` | `'affiliated'` (the default) | **65%** |

**`git show 0b60de7db --name-only` does not include `creditsController.mjs`.** The commit fixes six files; the broken caller is not one of them.

The fix is still worth landing — it kills the phantom `'hired'` literal (which cannot exist in the DB enum `['affiliated','independent']`), canonicalizes the rates so no literal lives in two places, and makes an *explicitly wrong* type fail loudly. It just **does not close this hole**, because an *absent* type still silently resolves to the 65% rate.

**The actual fix required (new work, ~10 lines):** `creditsController.mjs` must look up the trainer and pass the type — exactly as `CommissionService.mjs:85,93,106-111` already does:

```js
// pattern to copy from CommissionService.mjs
const trainer = await User.findByPk(finalTrainerId, { attributes: ['id','trainerType'], transaction });
const commission = calculateCommissionSplit(
  leadSource, taxCalc.grossAmount, sessionsGranted, applyLoyaltyBump,
  { trainerType: trainer.trainerType }        // <-- the missing 5th argument
);
```

⚠️ **Whoever does this: make the default fail loudly for this path rather than silently paying 65%.** A default that silently underpays is the exact shape of the original bug. Prefer an explicit error (or a logged alert) when `trainerType` is missing on a money path, and write a regression test that fails before the fix.

⚠️ **Before shipping a fix, decide the back-pay question.** If independent trainers were paid through the credits path, they were underpaid. That is a books question for Sean, not a code question. Landing the fix stops the bleeding; it does not reconcile history. Commit `0b60de7db` also ships `backend/scripts/reconcile-commission-rates.mjs` — read it before writing anything new.

### 2.2 HIGH — AUTHZ. Two DELETE routes on main lack the owner-admin guard

On `origin/main`, `backend/routes/adminPackageRoutes.mjs`:

| Line | Route | Guard on main | Guard on branch |
| -- | -- | -- | -- |
| 49, 61 | router-level | route-local `requireAdmin` | shared `adminOnly` (also emits a security log line) |
| **325** | `router.delete('/:id')` | **none beyond router-level** | `ownerAdminOnly` |
| **596** | `router.delete('/variants/:variantId')` | **none beyond router-level** | `ownerAdminOnly` |

Any account with `role === 'admin'` can delete storefront packages and variants. The unlanded fix restricts destructive package operations to owner-admin. Fixed in the same commit `0b60de7db`.

### 2.3 `[VERIFIED]` SWA-87 — models that can never be written (this is the recommended next slice)

The **bugs are on main and live**. The **audits that prove them are branch-only** (`audit-write-paths.mjs` is ABSENT from main), which is why they keep getting rediscovered.

**Confirmed on `origin/main`:**

| Model | Table | Problem | Evidence |
| -- | -- | -- | -- |
| `FoodScanHistory` | `food_scan_history` | `productName` is `NOT NULL` and **undeclared by the model** → every INSERT fails. `grep -c productName` on main = **0** | rolled-back raw INSERT: `null value in column "productName" ... violates not-null constraint` |
| `FoodScanHistory` | (same) | **Second independent blocker:** caller `foodScannerService.mjs:498` writes `productId`, `barcode`, `wasConsumed` — none exist (real column is `productCode`) | table has **0 rows** |
| `TrainerPermissions` | `trainer_permissions` | required-but-undeclared: `trainerId`, `permissionType`, `grantedBy` | audit-write-paths |
| `UserAchievement` | `UserAchievements` (PascalCase) | declares phantom `maxProgress` (main:65, used at :386-387). Unrestricted read at `progressController.mjs:733` throws and is swallowed → **silently reports zero**. Both write paths (`gamificationController.mjs:1639,1753`) are structurally impossible | table has **0 rows** → **no achievement can ever be awarded** |

**Product impact:** gamification — badges, XP, rarity tiers, all first-class in CLAUDE.md — **cannot award anything**. It presents as "quiet," not "broken."

**Two traps for whoever takes this:**
1. **Fixing the caller's payload is not enough.** Sequelize `create()` builds its INSERT from *all model-declared attributes*, not just the keys you pass. A phantom column anywhere in the model fails the write even if the payload is clean. **The model's attributes must be reconciled with the table.**
2. **`FoodScanHistory` has two independent blockers.** Fixing only the payload leaves the write still failing, and still silent — the handler swallows the error by design so the scan still returns a product.

**Read before starting** (already in-repo, consumed memos):
- `.ai-workflow/hermes-inbox/consumed/2026-07/20260729T050135Z-backend-write-path-audit.md`
- `.ai-workflow/hermes-inbox/consumed/2026-07/20260729T044629Z-backend-column-drift-read-write-asymmetry.md`

**Probe method that worked** (copy it): isolated rolled-back transaction **per assertion** (Postgres aborts the whole transaction after the first error — a shared transaction produces false findings), plus a **control probe** on a drift-free model to prove failures are real drift and not harness error. Run DB probes from `backend/` — `sequelize` is not resolvable from the repo root. Row count is corroboration, never proof; the proof is the executed write attempt.

---

## 3. The unlanded queue — what is on the branch

`wip/comms-notifications-2026-07-05` · **47 commits absent from main**, 4 already landed · spans **2026-07-05 → 2026-07-29** · all authored `SeanSwan`.

**Branch is ~1,238 commits BEHIND `origin/main`** (and climbing — other agents push to main continuously). There is no fast-forward. This is a merge/rebase with real conflict surface, not a push.

### Grouped by workstream

| Workstream | Commits | Substance | Risk if it keeps waiting |
| -- | -- | -- | -- |
| **SWA-62 trainer-economics** | 4 (`0b60de7db`, `5642a9dea`, `875b21dd6`, `a8119a6fa`) | canonical rates, `'hired'` phantom removed, `ownerAdminOnly` on DELETEs, shadow-price instrumentation, Codex review fixes. **Does NOT fix the creditsController underpayment — see §2.1** | **DELETEs under-guarded (§2.2). Underpayment needs separate new work.** |
| **SWA-89 script guards** | 1 (`0ed96925f`) | fail-closed guards on **two unguarded production-destroying scripts** | a wrong invocation can destroy production data |
| **Audit family** | 8 (`e8b704a74`, `44653c508`, `16494a5c6`, `5c6ce5d3d`, `91e4b022f`, `9c57261c8`, `515017d7f`, +) | `audit-model-health`, `audit-write-paths`, `audit-named-exports`, boot-crash coverage for 66 previously-invisible model classes | Rule-42 boot-crash class stays unguarded; SWA-87 keeps being rediscovered |
| **SWA-74 gym-ops S0** | 7 (`b59eb8de8` → `c3c5d17b3`) | `Location` model, policy config, DST-safe zoned time, controller+routes+tests, 12 hostile-review rounds, 300-line extraction | complete reviewed feature sitting idle |
| **Tooling** | 7 (`check-main-parity` + fixes) | dead-file findings vs branch staleness, Windows backslash paths, `--help`, hang fix | — |
| **Docs** | ~15 | cinematic design tier (SWA-55), swanverse, workout-os Fable/Kimi plans, gym-policy warn-off | low risk, low urgency |
| **Config/permissions** | ~4 | `.claude/settings.json`, `.gitignore`, `MODEL_VERSIONS.md`, permission pruning | see conflict warning below |

### `[VERIFIED]` Shared files that WILL conflict

Main has also changed these. Do not expect a clean merge:

`backend/models/associations.mjs` (4 touches) · `backend/models/index.mjs` (3) · `backend/core/routes.mjs` (2) · `backend/package.json` (3) · `CLAUDE.md` (3) · `AGENTS.md` (3) · `.claude/settings.json` (2) · `.gitignore` (2)

⚠️ **`.claude/settings.json` specifically:** per `MEMORY.md`, main carries a Hermes auto-closeout **command** hook (`5c2eb2f08`). When reconciling this file, **keep main's command hook** — do not let the branch version clobber it.

---

## 4. What already shipped (context — do not redo)

The launch audit (SWA-75) is **complete and live on main**. Verified: all commits `merge-base --is-ancestor origin/main`; Rule 42 clean both classes; backend `/health` 200, frontend 200.

| Slice | Result | Commit |
| -- | -- | -- |
| S1 data-subject rights | export + erasure (anonymisation; financial skeleton survives), mutation-proven. **Deliberately NOT route-wired** — pending Sean's access-control decision | `1389f0d0d` |
| S2+S7 | email-failure visibility + rollback policy | `e431a9bda` |
| S5 observability | 5xx captured at the **response boundary** — the global handler saw only ~8% (1,094 direct `res.status(5xx)` across 203 files) | `42c888ecb` |
| S8 orphans | 3 components / 1,934 lines deleted, 4-way verified | `2231bbc52` |
| Hostile rounds | 6 URL/PII capture defects + 3 erasure defects, both sets mutation-proven | `14032c035`, `451e611f8` |

**Suite state:** 6,319 passing. Pre-existing failing baseline **23 across ~10 files** — verified identical on a pristine `origin/main` worktree. **Not regressions.** It grew 21→23 mid-session from another agent's `dayBriefCommand` push. Verify the baseline on a clean worktree before blaming your own change.

### Known gaps, honestly stated

- **No version/build endpoint exists.** `/version` → 503, `/api/version` → 404. **You cannot tell what is deployed** without the Render dashboard. This blocked deploy verification during the audit. A ~15-line endpoint exposing `RENDER_GIT_COMMIT` would fix it permanently and is read-only/safe.
- **S6 mobile pass** (3 flows × 2 browsers) — needs a real authenticated browser session. Not doable headless.
- **Sean-only, untouched:** restore drill (tooling shipped + guard-tested, **never executed**), Stripe key rotation → live `$1 charge → webhook → refund`, external uptime probe, `NASMAdminDashboard.tsx` (1,128 lines) wire/park/archive ruling, data-rights route access policy.
- **`hermes-inbox/pending/` is at 137 memos** — undrained, and includes other agents' files. A queue that deep stops functioning as "what to read next."

---

## 5. Next slice — Sean's framing, with a recommendation

Sean named two candidates:

> **(A)** push the batch (this commit rides with whatever else this tree is holding) — or **(B)**, higher value: point the same loop at the 2 write-broken + 5 column-drift models the audits keep proving (SWA-87), which are real production write failures rather than tooling polish.

### Recommendation: neither, quite — do §2.1 first, then (B), then (A)

**Rationale, and this is a change of ranking on evidence found during this verification:** Sean's option (B) is correctly ranked above (A) — SWA-87 is real production breakage and gamification cannot award anything. But the commission underpayment found in §2.1 outranks both: it is **money owed to real people, accruing silently, on a mounted route**, and the fix is already written and Codex-reviewed on the branch.

**Suggested order:**

1. **`S-MONEY` — fix the caller, then land the branch fix.** Two distinct pieces, in this order:
   - **1a. Pass `trainerType` in `creditsController.mjs:132`** (§2.1). This is the actual bug and it is **new work** — `0b60de7db` does not cover it, and landing the branch alone leaves independent trainers on 65%. Copy the `CommissionService.mjs:85-111` pattern. Regression test must fail before the fix.
   - **1b. Land `0b60de7db`** for the canonical rates, the `'hired'` removal, and the `ownerAdminOnly` DELETE guards (§2.2).
   - **Do not touch `CommissionService` — it is correct.** Surface the back-pay question to Sean; do not attempt reconciliation autonomously.
2. **`S-SWA87` — fix the write-broken models.** Reconcile model attributes against real table columns for `FoodScanHistory`, `TrainerPermissions`, `UserAchievement`. Heed both traps in §2.3. Prove each fix with an executed, rolled-back INSERT — not a read.
3. **`S-LAND` — land the rest of the branch in reviewed groups**, not one 47-commit merge. Suggested order: SWA-89 guards → audit family → SWA-74 gym-ops → tooling → docs. Rebase-and-verify per group against 1,237 commits of drift; resolve the shared-file conflicts in §3 deliberately.
4. *(cheap, any time)* **version endpoint** — removes the deploy-verification blind spot permanently.

### Before touching anything

- **Rule 67:** `wip/comms-notifications-2026-07-05` may be another agent's live lane. Read `.ai-workflow/coordination/*.lane.md` + `review-queue.md` and claim files before editing. Sean's standing instruction: *"don't step on nobody's toes."*
- **Rule 52 / branch freshness:** verify against `origin/main`, not the local branch. This tree is 1,237 commits behind; local reads will lie to you.
- **Rule 74:** no "done/fixed" without current-session proof + a clean hostile pass in the same message.
- **Landing ≠ deploying.** Pushing to `main` triggers Render. Money-path and authz changes deserve a deliberate deploy + verification, not a batch ride-along.

---

## 6. Orientation for a fresh session

```bash
# 1. truth about what is deployed
git fetch origin main && git log origin/main --oneline -5

# 2. how far is this tree from truth?
git log HEAD..origin/main --oneline | wc -l        # ~1238+ on the wip branch, climbing
git cherry origin/main HEAD | grep -c '^+' || true # ~47 unlanded. NOTE: grep -c exits 1 on
                                                  # zero matches and will break an && chain

# 3. who else is working
cat .ai-workflow/coordination/*.lane.md .ai-workflow/coordination/review-queue.md

# 4. confirm the two live bugs still exist before fixing (they may have been landed)
git show origin/main:backend/controllers/creditsController.mjs | grep -c trainerType   # 0 = §2.1 still live
git show origin/main:backend/routes/adminPackageRoutes.mjs | grep -n "router.delete"   # no ownerAdminOnly = §2.2 still live
git show origin/main:backend/models/FoodScanHistory.mjs | grep -c productName          # 0 = §2.3 still live
```

**Load order:** `CLAUDE.md` → `ACTIVE-INDEX.md` → `.ai-workflow/continuity/rolling-last-done.md` → coordination lanes → this file.

*IDs, file paths, and commit SHAs only. No PII, credentials, or customer data.*

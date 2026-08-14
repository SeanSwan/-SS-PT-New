---
decision: SwanStudios has an activation problem, not a building problem. Land the S2L cockpit half before flipping any outbound flag, then run a tiered activation wave.
status: open
supersedes: none
---

# Activation Debt Audit — 2026-08-14

**Baseline:** `origin/main` @ `c4a5a396e`. Audited in a clean worktree, **not** the wip tree
(which sits ~1930 commits behind main and lies about what exists).

**Trigger:** Sean — *"I don't like having stuff that's created and not wired up. I need to
figure that out."* A review of one lane (marketing / speed-to-lead) found the pattern is
systemic.

---

## 1. The finding

SwanStudios does not have a building problem. It has an **activation** problem.

Roughly **235 cumulative feature-days** of finished, tested, shipped code sits behind
off-by-default switches that were never flipped — plus ~1,146 lines of backend code with
**zero importers**. There is no inventory, no owner, and no expiry attached to any of it.

A commit from 2026-07-20 (`f2be2c592`) says it in the repo's own words:
**"program 8/8 built, 0/8 activated; activation wave = next."** That wave never ran.

---

## 2. "Not wired up" is four different problems

Conflating these is why the problem feels unbounded. The remedies are different sizes.

| Class | Meaning | Remedy | Verified count |
|---|---|---|---|
| **Dark** | built, gated OFF, intended to activate | flip, or set an expiry | ~24 backend `=== 'true'` gates + 4 frontend build-time flags |
| **Dead** | zero importers, no successor named | delete (Rule 34 grep-check first) | 10 files / ~1,146 lines |
| **Superseded** | replaced by a live successor, corpse still in tree | delete | 3 confirmed |
| **Merge debt** | finished work on unmerged branches | land or close | 2 recent + ~20 stale (staleness unverified) |

---

## 3. Dark — the flag inventory

### 3.1 Days dark (first-commit date → today)

| Program | Gate | Shipped | Days dark |
|---|---|---|---|
| Marketing outbound automation engine | `SWAN_AUTOMATION_CRON_ENABLED` | 2026-06-16 | **59** |
| Session settlement worker | `SESSION_SETTLEMENT_WORKER_ENABLED` | 2026-06-30 | **45** |
| Dashboard V2 finance | `DASHBOARD_V2_FINANCE` | 2026-07-18 | **27** |
| Post-save handoff | `ENABLE_POST_SAVE_HANDOFF` | 2026-07-18 | **27** |
| PRISM lead capture | `PRISM_CAPTURE_ENABLED` | 2026-07-19 | **26** |
| Speed-to-lead reply | `SPEED_TO_LEAD_REPLY_ENABLED` | 2026-07-21 | **24** |
| Planner IA V2 (S16–S25, ~10 slices) | `VITE_ENABLE_PLANNER_IA_V2` | 2026-07-31 | **14** |
| Voice Mode V2 (S6/S9/S10) | `VITE_ENABLE_VOICE_MODE_V2` | 2026-08-01 | **13** |

Also flag-OFF: gallery vNext, print storefront, Prodigi fulfilment, print Stripe Tax,
store V4 lens seam, home vNext optics hero, dashboards V2 shell, billing session-completion
policy, Hermes OS headless runner.

### 3.2 Three activation mechanics — only one is governed

Launch Control **exists and is live**:
- `backend/services/launchControlService.mjs` + `launchControlResolve.mjs`
- API mounted: `backend/core/routes.mjs:497` → `/api/admin/flags`
- UI mounted: `UniversalDashboardLayout.routes.tsx:116` → `/launch-control`
- DB override + scheduled rollout + role targeting + deterministic % bucketing; never throws,
  falls back to env baseline if the DB is unreachable

It governs exactly **three** flags (`launchControlResolve.mjs:9`):
`dashboardV2Finance`, `postSaveHandoff`, `prismCapture`.

| Class | Count | Flip cost | Visible to Sean? |
|---|---|---|---|
| Launch Control DB flags | 3 | instant, admin UI, targetable, one-click revert | **Yes** |
| Backend env flags | ~20 | Render dashboard + redeploy (~2–5 min) | No |
| Frontend `VITE_*` build-time flags | 4+ | **rebuild + redeploy** | No |

`VITE_*` vars are build-time only, so Launch Control's DB overrides can **never** reach the
planner/voice V2 work. That is an architectural ceiling, not a missing row.

Only **5** flags are declared in `render.yaml`. The rest exist solely as Render dashboard
state with no infrastructure-as-code record — a service rebuilt from blueprint loses them.

---

## 4. The speed-to-lead lane — verified, and a correction to its own handoff

### 4.1 What is true

| Claim | Verdict | Evidence |
|---|---|---|
| Service on main | VERIFIED | `backend/services/speedToLeadService.mjs` |
| Flag gate | VERIFIED | `:24` — `SPEED_TO_LEAD_REPLY_ENABLED === 'true'` |
| Real call sites | VERIFIED | `contactRoutes.mjs:226`, `consultRequestRoutes.mjs:101`, `leadCaptureRoutes.mjs:150` |
| Routes mounted | VERIFIED | `core/routes.mjs:392` `/api/contact`, `:396` `/api/consult-request`, `:762` `/api/leads` |
| Flag is the only remaining gate | **CONFIRMED** | full chain traced |

The lane author's central claim — *the flag is the constraint, more code does not move it* —
is correct and independently confirmed.

### 4.2 The correction: ordering is backwards

The lane's handoff recommends **flip the flag first, observability fourth**. That is wrong,
and the reason is already in the repo.

**On `main`, the readiness cockpit is blind to the flag it exists to report.**
`marketingReadinessService.mjs` reports `sendgridConfigured` (`:149`) but contains **zero**
references to `SPEED_TO_LEAD_REPLY_ENABLED`. It can say "ready" while the feature is off.

**The instrument is already built** — on branch `claude/marketing-readiness-s2l-clean-2026-08-14`:
`speedToLeadReadiness.mjs` (148 lines) + 13 tests, which specifically assert it:
- `blocks when armed without SENDGRID_API_KEY` (`speedToLeadReadiness.test.mjs:71`)
- `blocks when armed without SENDGRID_FROM_EMAIL` (`:77`)
- `degrades when armed with an off-domain from-address (SPF/DKIM misalignment)` (`:83`)
- `never emits an env VALUE — only presence booleans` (`:151`)

Verified independent of the fuzzy-variable work (`marketingReadinessService.mjs` has no
fuzzy import; `speedToLeadReadiness.mjs` imports only `./readinessStatus.mjs`). Verified to
merge into current `main` with **zero conflicts**.

So the branch is **two deliverables**, not one:
- **A — cockpit visibility.** Merge-ready, zero product risk, and it is the instrument that
  tells you whether the flip worked. **Land this first.**
- **B — fuzzy-variable validator.** Genuinely unwired (zero non-test importers confirmed).
  Its flag `MARKETING_FUZZY_VARS_ENABLED` is read only inside its own service — no consumer
  exists. Needs a build slice. **Defer.**

### 4.3 Silent-failure risk (ongoing operation, not activation)

- `sendGridEmail` returns `{success:false, retryable:true}` on bad config.
- `speedToLeadService` catches it, writes `logger.warn`, returns `{sent:false}`.
- `adminAlertService.mjs` **exists and works** — but exports only `raiseMoneyWriteAlert` and
  is consumed solely by `CommissionService` and `trainerSessionEarningService`.
- Neither `speedToLeadService` nor `sendgridService` writes to it.

A post-activation failure (expired key, quota, bounce spike) produces **no signal Sean will
see**. In fairness: `SPEED-TO-LEAD-ACTIVATION-RUNBOOK-2026-07-22.md` (written 2026-07-21,
never executed) does cover activation-time verification manually. The gap is **ongoing
operation**. Extending the existing alert service to the send lane is small — the alert
model, admin surface, and retention worker already exist.

---

## 5. Dead code — verified zero importers

Every row below was re-verified by hand after a delegated sweep (which was **77% accurate** —
3 of its 13 headline claims were false and are excluded here).

| File | Lines | Class |
|---|---|---|
| `backend/controllers/sessionSyncController.mjs` | 269 | dead |
| `backend/controllers/clientProfileController.mjs` | 179 | dead |
| `backend/controllers/adminController.mjs` | 139 | dead |
| `backend/controllers/sessionPackageController.mjs` | 75 | dead |
| `backend/controllers/adminReportsController.mjs` | 75 | dead |
| `backend/controllers/progressSyncController.mjs` | 36 | dead |
| `backend/services/workoutPlanAiPdfAttachmentService.mjs` | 128 | dead |
| `backend/services/recraftService.mjs` | 105 | dead |
| `backend/services/schedual.mjs` | 82 | dead (also a typo'd filename) |
| `backend/services/mockCheckoutService.mjs` | 58 | dead |

**Total ~1,146 lines, 10 files, zero importers.** Per Rule 34 these are *deletion candidates
pending approval*, not "safe to delete."

**Superseded (successor named in-tree):**
- `TrainerOverviewPage` — `TrainerHomeTab.tsx:5`: "REPLACES: TrainerOverviewPage"
- `SwanCoachAssistantPage` — `ClientPicker.tsx:192`: "no longer consumed"
- `MyClientsView` lazy export at `routeComponents.tsx:53` — unrouted; canonical is
  `TrainerClientsWorkspace` at `routes.tsx:186`

**Orphan (built, never wired, no successor):**
- `TrainerVideosPage` — lazy-exported at `routeComponents.tsx:83`, in **no** route.
  Textbook Rule 26: a lazy `import()` is not a mount.
- 12 `DesignPlayground` concept homepages absent from `playgroundRegistry.ts`

Backend darkness is **flag-based, not mount-based** — no genuine unmounted route orphans were
found. An initial "25 unmounted routes" list was entirely false positives: a second aggregator
(`backend/routes/api.mjs`, mounted at `core/routes.mjs:833`) serves them.

---

## 6. Blast-radius tiers — this drives the safe order

- **Tier 1 — internal / read-only.** `DASHBOARD_V2_FINANCE`, `SESSION_SETTLEMENT_WORKER_ENABLED`,
  `ENABLE_POST_SAVE_HANDOFF`. Two are already on Launch Control: flip, watch, revert in one click.
- **Tier 2 — in-app visible, no outbound send.** Planner IA V2, Voice Mode V2, planner
  templates/lenses. Needs rebuild+redeploy, so it carries deploy risk and no instant revert.
  `voiceModeV2Flag.ts:5` documents its own activation gate ("10 real dictations") — never run.
- **Tier 3 — reaches real humans.** `SPEED_TO_LEAD_REPLY_ENABLED` (one transactional email in
  direct response to a form the person just submitted — fail-closed, non-blocking; the
  *lowest-risk* T3), `PRISM_CAPTURE_ENABLED`, and at the top of the range
  `SWAN_AUTOMATION_CRON_ENABLED` (bulk scheduled outbound — 59 days dark, the single most
  dangerous flip in the inventory).

---

## 7. Recommended sequence

Ordered by value per minute of Sean's attention.

| # | Action | Owner | Time | Why here |
|---|---|---|---|---|
| 1 | Land S2L branch **half A** (cockpit visibility) | agent | ~30 min | Builds the instrument before the flip. Merges clean, 13 tests, zero product risk. |
| 2 | Wire send failures into existing `adminAlertService` | agent | ~1 h | Small — infra exists. Turns silent failure into a signal *before* anything is armed. |
| 3 | Flip `SPEED_TO_LEAD_REPLY_ENABLED`, run the existing runbook's live test | **Sean** | ~5 min + deploy | Highest-value single action in the lane. Now instrumented. |
| 4 | Tier-1 flips via Launch Control | **Sean** | ~2 min | One-click revert; 99 feature-days recovered. |
| 5 | Delete the 10 verified-dead files (Rule 34 approval) | agent | ~30 min | Removes 1,146 lines of agent-confusing noise. |
| 6 | Tier-2 (planner/voice V2) behind one deploy | agent + Sean | ~1 h | Run `voiceModeV2Flag`'s own "10 real dictations" gate first. |
| 7 | Fuzzy-variable wiring (S2L branch half B) | agent | ~2 h | Only after 1–3 prove the send path works end to end. |
| 8 | `SWAN_AUTOMATION_CRON_ENABLED` | **Sean** | — | Last. Bulk outbound; needs 1–3 proven first. |

**Explicitly not recommended:** cold-outreach lead scraping (wrong motion for trainer-led
B2B2C), and migrating all ~20 backend env flags onto Launch Control (over-engineering for a
single-operator product).

---

## 8. The systemic fix

The mechanism that failed is not code — it is that **a flag can be created with no owner, no
activation criterion, and no expiry**, so "ship it dark" has no natural end.

Proposed, cheapest-first:

1. **Every new flag is born with an expiry date in a comment beside its read.** No registry to
   curate — the date lives where the flag is read, so it cannot drift from the code.
2. **A flag past expiry is a build warning, not a silent state.** Either flip it or delete
   the branch of code it guards.
3. **`voiceModeV2Flag.ts:5` already does the right thing** ("Gate to flip: 10 real
   dictations") — it names its own activation criterion. Make that the house pattern.

Open for review — see §9.

---

## 9. Review status

- **Claude (Opus 5)** — code truth, verified against `origin/main` in a clean worktree.
  Three instrument-validation catches during this audit: a `rg -rn` replace-flag artifact
  that fabricated a catastrophic phantom bug; a regex error whose failure still printed a
  "= dark" conclusion; and a naive mount check that produced 25 false-positive orphans.
  All three would have shipped wrong findings if output had been trusted over exit status.
- **Haiku ×3 (delegated sweeps)** — backend orphans, frontend dark surfaces, flag census.
  Combined accuracy ~77%; every load-bearing claim re-verified by hand. The flag census
  **missed `SPEED_TO_LEAD_REPLY_ENABLED`** and 7 others in the `_ENABLED` family — its counts
  are directional only; §3 uses my own scan.
- **Kimi K3** — process/sequencing lens on §7 and §8. See §10.

---

## 10. Kimi K3 — external review

_(pending — appended on return)_

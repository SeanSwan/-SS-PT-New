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
**zero importers**.

Important nuance, found by attacking my own first draft (§3.1a): **that 235 is not all
neglect.** About 139 feature-days are either governed by Launch Control or deliberately
gated for a documented reason — the nurture engine in particular is disarmed on purpose
because arming it without one-click unsubscribe would be a CAN-SPAM/GDPR problem. The
genuinely undocumented drift is **~72 feature-days**: settlement worker (45), planner V2
(14), voice V2 (13) — three programs where nobody recorded why they are off or what would
turn them on.

The pattern underneath both halves is the same: **a flag can be created with no owner, no
activation criterion, and no expiry**, so "ship it dark" has no natural end.

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

### 3.1a NOT all of this is neglect — and the split is the real finding

A hostile round against my own table above changed it materially. Some of these are
**deliberately gated with a documented reason**, and calling them debt is wrong:

- **`SWAN_AUTOMATION_CRON_ENABLED` is a compliance gate, not forgotten debt.**
  `ACQUISITION-FUNNEL-ACTIVATION-BUILD-PROMPT-2026-07-21.md:198-209` states the day-0/1/3/7
  nurture sequence is *"deliberately disarmed"*, that `automationService.mjs:72-77` seeds
  `isActive:false` **on purpose**, and that arming requires **lawful basis + one-click
  unsubscribe in every nurture email** (CAN-SPAM / GDPR) — a drip is marketing, not
  transactional. It explicitly says a builder **may not** flip it.
  **Correction to §7:** this is not "flip it last." It is *blocked on a build slice*
  (unsubscribe + suppression check) that does not yet exist. Flipping it before that would
  be a legal problem, not just a risky deploy.

Cross-checking which flags carry a documented reason splits the inventory cleanly:

| Flag | Days dark | Docs referencing it | On Launch Control? |
|---|---|---|---|
| `DASHBOARD_V2_FINANCE` | 27 | 9 | **yes** |
| `ENABLE_POST_SAVE_HANDOFF` | 27 | 9 | **yes** |
| `PRISM_CAPTURE_ENABLED` | 26 | 8 | **yes** |
| `SWAN_AUTOMATION_CRON_ENABLED` | 59 | documented (legal gate) | no |
| `SESSION_SETTLEMENT_WORKER_ENABLED` | 45 | **0** | no |
| `VITE_ENABLE_PLANNER_IA_V2` | 14 | **0** | no |
| `VITE_ENABLE_VOICE_MODE_V2` | 13 | **0** | no |

**The flags on Launch Control are the flags that are documented. The flags off it are the
flags nobody wrote down.** The governance gap and the documentation gap are the same gap —
which is what §8 has to fix.

So the honest headline is not "235 days of neglect." It is: **~139 feature-days are governed
or deliberately gated, and ~72 feature-days (settlement worker 45, planner V2 14, voice V2 13)
are genuinely undocumented drift** — nobody recorded why they are off or what would turn
them on.

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
`speedToLeadReadiness.mjs` (148 lines) + tests — **27/27 passing, verified this session** (`npx vitest run __tests__/speedToLeadReadiness.test.mjs`). They specifically assert it:
- `blocks when armed without SENDGRID_API_KEY` (`speedToLeadReadiness.test.mjs:71`)
- `blocks when armed without SENDGRID_FROM_EMAIL` (`:77`)
- `degrades when armed with an off-domain from-address (SPF/DKIM misalignment)` (`:83`)
- `never emits an env VALUE — only presence booleans` (`:151`)

Verified independent of the fuzzy-variable work (`marketingReadinessService.mjs` has no
fuzzy import; `speedToLeadReadiness.mjs` imports only `./readinessStatus.mjs`). Verified to
merge into current `main` with **zero conflicts**.

So the branch is **two deliverables**, not one:
- **A — cockpit visibility.** Merge-ready, 27/27 tests green, zero product risk, and it is the instrument that
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
| 1 | Land S2L branch **half A** (cockpit visibility) | agent | ~30 min | Builds the instrument before the flip. Merges clean, 27/27 tests green, zero product risk. |
| 2 | Wire send failures into existing `adminAlertService` | agent | ~1 h | Small — infra exists. Turns silent failure into a signal *before* anything is armed. |
| 3 | Flip `SPEED_TO_LEAD_REPLY_ENABLED`, run the existing runbook's live test | **Sean** | ~5 min + deploy | Highest-value single action in the lane. Now instrumented. |
| 4 | Tier-1 flips via Launch Control | **Sean** | ~2 min | One-click revert; 99 feature-days recovered. |
| 5 | Delete the 10 verified-dead files (Rule 34 approval) | agent | ~30 min | Removes 1,146 lines of agent-confusing noise. |
| 6 | Tier-2 (planner/voice V2) behind one deploy | agent + Sean | ~1 h | Run `voiceModeV2Flag`'s own "10 real dictations" gate first. |
| 7 | Fuzzy-variable wiring (S2L branch half B) | agent | ~2 h | Only after 1–3 prove the send path works end to end. |
| 8 | Nurture unsubscribe + suppression build slice, **then** `SWAN_AUTOMATION_CRON_ENABLED` | agent, then **Sean** | ~1 day | **Not a flip.** Blocked on a legal prerequisite (one-click unsubscribe in every nurture email, CAN-SPAM/GDPR) that does not exist yet — see §3.1a. |
| 9 | Write down *why* the 3 undocumented flags are off | agent | ~20 min | Settlement worker (45d), planner V2 (14d), voice V2 (13d) have **zero** docs. Cheapest possible fix for the gap §8 describes. |

### 7.1 Why steps 1 and 3 must be two deploys, not one

It is tempting to land half A and set the env var in the same deploy window — Render
redeploys on an env change anyway, so it looks like a free saving. It is not.

Landing A **first**, alone, and confirming the cockpit reports **DARK**, proves the gauge
works *while the feature is still off* — a zero-risk test of the instrument. If you change
both at once and the cockpit says "live," you cannot tell whether the flag worked, the
cockpit worked, or both are lying in the same direction. One extra deploy cycle (which runs
unattended) buys an unambiguous reading. Sean's attention cost is unchanged; only wall-clock
moves.

**Explicitly not recommended:** cold-outreach lead scraping (wrong motion for trainer-led
B2B2C), and migrating all ~20 backend env flags onto Launch Control (over-engineering for a
single-operator product — §8's comment-with-expiry is the cheaper fix).

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

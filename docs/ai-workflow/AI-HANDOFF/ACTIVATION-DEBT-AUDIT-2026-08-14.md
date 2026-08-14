---
decision: Nothing forces a decision when a flag or file stops being needed, so dark code accumulates. Sean flips S2L + PRISM + the two Launch Control flags in one ~40-minute sitting; an agent then deletes the corpses, lands the cockpit merge, wires send-failure alerting, and replaces the wave pattern with a self-firing expiry assert.
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

### 4.2 A real gap in the cockpit — but NOT a reason to delay the flip

> **Superseded in part.** This section originally argued the lane's "flip first, observability
> fourth" ordering was backwards. External review overturned that (§10 #1) and §7 now flips
> first. What survives is the underlying defect, which is real and still worth fixing — it is
> just step 5, not step 1.

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
- **A — cockpit visibility.** Merge-ready, 27/27 tests green, low-risk and test-covered, and it is the instrument that
  tells you whether the flip worked. **Land it in the same week (§7 step 5) — not ahead of the flip.**
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

Every row below was re-verified by hand — importer counts **and** line counts (`wc -l` totals
exactly 1,146) — after a delegated sweep that was **77% accurate** (3 of 13 headline claims
false, excluded here). A fourth false claim from that sweep escaped into an earlier revision
of this document; it is retracted immediately below the table rather than silently removed.

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
- `TrainerVideosPage` — lazy-exported at `routeComponents.tsx:83` and appearing in **no**
  route table (`UniversalDashboardLayout.routes.tsx` **or** `main-routes.tsx`). Textbook
  Rule 26: a lazy `import()` is not a mount. **Re-verified after the retraction below.**

> ### ⚠ RETRACTED — the "12 orphaned DesignPlayground concepts" claim was FALSE
>
> An earlier revision of this document listed 12 `DesignPlayground` concept homepages as
> orphans absent from `playgroundRegistry.ts`. **That was wrong, and acting on it would have
> deleted 12 live files.**
>
> The claim came from a delegated sweep and I published it **without verifying it myself** —
> a direct Rule 30 violation, in the same document where I wrote that delegated findings are
> hypotheses.
>
> The truth: there are **two** registries. `playgroundRegistry.ts` is the *parked-surface
> manifest* for vNext pages (7 entries: home, store, about, contact, video, gallery,
> dashboard). The concept homepages live in a **different** file —
> `concepts/shared/conceptRegistry.ts:53-64` — where **all 12 are registered**, and the chain
> is fully live: `main-routes.tsx:902` renders `<LegacyConceptPreviewPage />` → that page
> imports `./concepts/shared/conceptRegistry` (`:15`) → the 12 lazy entries.
> The only unregistered file in `concepts/` is `shared/ConceptWrapper.tsx`, a helper, which is
> correctly absent.
>
> Two lessons, both already in this document and both violated anyway:
> 1. **Rule 30** — I relayed a subagent claim as fact. The sweep checked a plausible-looking
>    registry with the right name and the wrong contents.
> 2. **§3.1a's own lesson, repeated** — the registry's header calls it a *"Design Studio
>    parked-surface manifest"*. Like the nurture engine, this is **deliberate**, not neglect.
>    I made the "assumed neglect without checking for a stated reason" error twice in one audit.

Backend darkness is **flag-based, not mount-based** — no genuine unmounted route orphans were
found. An initial "25 unmounted routes" list was entirely false positives: a second aggregator
(`backend/routes/api.mjs`, mounted at `core/routes.mjs:833`) serves them.

---

## 6. Sort by REVERSIBILITY, not by external visibility

My first draft tiered these by blast radius (internal → in-app → reaches humans). Kimi K3
showed that axis is wrong for a solo operator, and the counter-example is decisive:

> *One click flips the settlement worker; no click un-settles a 45-day backlog. Meanwhile
> PRISM — which I filed as the riskiest tier — is one-click revertible.*

External visibility is not the thing that hurts. **Irreversibility** is. Re-sorted:

| Revert cost | Flags | Why |
|---|---|---|
| **One click, no deploy** | `PRISM_CAPTURE_ENABLED`, `DASHBOARD_V2_FINANCE`, `ENABLE_POST_SAVE_HANDOFF` | Launch Control DB overrides, role-targetable. Safest things in the inventory despite two being user-visible. |
| **One env flip + redeploy** | `SPEED_TO_LEAD_REPLY_ENABLED` | Fail-closed, non-blocking, transactional-class. Rollback is the same switch. |
| **Redeploy, no instant revert** | `VITE_ENABLE_PLANNER_IA_V2`, `VOICE_MODE_V2`, templates, lenses | Build-time. Batch all four into ONE deploy — deploys are the scarce resource. |
| **NOT REVERSIBLE** | `SESSION_SETTLEMENT_WORKER_ENABLED` | Settling a 45-day backlog cannot be undone. **Investigate before flipping** (§7 step 8). |
| **Reputation-coupled** | `SWAN_AUTOMATION_CRON_ENABLED` | A deliverability incident degrades the sender reputation S2L now depends on. The two lanes are coupled. |

---

## 7. Recommended sequence

Ordered by value per minute of Sean's attention.

**This sequence was rewritten after external review.** My first version put two code slices
ahead of the only revenue item. Kimi K3 pointed out I had refuted myself in my own document:
I endorsed *"the flag is the constraint; more code does not move it"* and then scheduled two
code slices before flipping it. If code does not move it, code cannot be on its critical
path. Conceded — see §10.

**Sean's part is ONE ~40-minute sitting (steps 1–3). Everything else is an agent's.**

| # | Action | Owner | Time | Why here |
|---|---|---|---|---|
| 1 | Flip `SPEED_TO_LEAD_REPLY_ENABLED` + run the existing runbook's live test | **Sean** | ~20 min | The only revenue item one flip from live. Worst case ≈ today (no auto-reply), and the runbook's Step 3 live test catches a silent failure *at flip time*. |
| 2 | Flip `PRISM_CAPTURE_ENABLED` via Launch Control + 5-min smoke | **Sean** | ~10 min | Acquisition lever, one-click revert, no deploy. **Omitted entirely from my first draft — the biggest gap in it**, given acquisition is the weakest link. Note: this makes a capture form appear on the home hero (`f3e450d18`), so it is a visible change, not just an API. Double-capture checked: the route 404s when off and is separate from the contact form. |
| 3 | Flip `dashboardV2Finance` + `postSaveHandoff`, **role-targeted to owner** | **Sean** | ~10 min | Launch Control supports role targeting — Sean is the head trainer, so he is the free canary. |
| 4 | One decide-and-delete sitting | agent | ~30 min | 10 verified-dead files (1,146 lines, counts re-verified), `TrainerVideosPage`, the 3 superseded corpses. **NOT the 12 playground concepts — that claim is retracted, see §5.** Rule 34 grep before each. Every deletion shrinks all downstream work. |
| 5 | Land S2L branch **half A** (cockpit visibility) | agent | ~30 min | Cost is mostly sunk; 27/27 green; merges clean. Same week, **not** flip-gating. |
| 6 | Wire send failures into existing `adminAlertService` | agent | ~1–2 h | The correct fix for the ongoing-operation gap — placed after revenue, not before it. |
| 7 | Declare all env flags in `render.yaml` + a key-diff sync check | agent | ~30–60 min | ~19 flags exist only as Render dashboard state with no record in the repo. **I underweighted this**; see §10 #7. |
| 8 | **Investigate** the settlement worker, then flip-or-delete | agent | ~1 h | 45 days off. There *is* an inline path (`sessionDeductionService.mjs`, `sessionSettlementPolicy.mjs`), so the worker is likely a backstop — but whether a backlog accumulated is **unverified** and needs a read-only query. Not a flip: settling a backlog cannot be undone. |
| 9 | Voice 10-dictation gate, then **ONE batched deploy** of all four `VITE_*` V2 flags | agent + **Sean** | ~1 h | `voiceModeV2Flag.ts:5` names its own gate and it was never run. Never four deploys for four flags. |
| 10 | Automation cron: **decide backlog-or-delete. Do not flip.** | **Sean** decides | — | Two independent blocks: a legal prerequisite that does not exist (one-click unsubscribe, §3.1a) *and* sender-reputation coupling — a deliverability incident here degrades the reputation S2L now depends on. |
| 11 | Fuzzy-variable wiring (S2L branch half B) | agent | ~2 h | Only after 1 and 5–6 prove the send path works end to end. |

### 7.1 A note on an argument I made and then dropped

An earlier revision argued at length that the cockpit merge and the flag flip must be two
separate deploys, so that confirming the cockpit reports DARK proves the gauge before the
lever moves. That reasoning is sound **in isolation** and is now moot: once the flip moves
to step 1 and the merge to step 5, they are already separate, and the runbook's live test —
not the cockpit — is what verifies the flip. Recorded because the argument was committed
(`f4701e8bc`) and a future reader will otherwise wonder where it went.

**Explicitly not recommended:** cold-outreach lead scraping (wrong motion for trainer-led
B2B2C), and migrating all ~20 backend env flags onto Launch Control (over-engineering for a
single-operator product — §8's comment-with-expiry is the cheaper fix).

---

## 8. The systemic fix

The mechanism that failed is not code — it is that **a flag can be created with no owner, no
activation criterion, and no expiry**, so "ship it dark" has no natural end.

### 8.1 The correction that matters most: governance was never the binding constraint

My §3.1a concluded *"the governance gap and the documentation gap are the same gap"* and
implied the fix was to govern more flags. **My own data refutes that**, and Kimi K3 caught it:

> Three flags were fully governed on Launch Control — visible, revertible, targetable —
> **and still sat dark 26–27 days.**

Governance coverage was already 100% for those three and they rotted anyway. What was missing
was never visibility. It was a **forcing function**. The same document proves it twice more:
a runbook written 2026-07-21 and never executed, and a commit announcing an activation wave
that never ran. Unenforced artifacts decay on exactly the timescale the flags did.

**So: do not grow the control plane. Grow the assert.**

### 8.2 Revised mechanism — zero-maintenance, cheapest first

1. **One flags module.** A single file declaring every env flag with
   `{description, shippedDate, expiresOn}`. A mechanical refactor of ~23 reads, done once.
   The file *is* the inventory — code, not a wiki nobody curates.
2. **A boot-time expiry assert that fires itself.** Any flag past `expiresOn` raises an alert
   through the **existing `adminAlertService`** — the channel already carrying the money
   alerts Sean demonstrably acts on. No curation; the failure is automatic; the alert says
   "flip or delete." Permanent flags carry `expiresOn: never` plus a reason.
   **Alert, do not crash** — a boot crash on an expired flag is a self-inflicted outage.
3. **`render.yaml` as the declaration of record**, sync-checked by a ~20-line key-diff script.
   Kills the dashboard-only-state class and the blueprint-loss risk in one move.
4. **Flips go on Sean's calendar at flag-creation time.** A head trainer's appointment book is
   the one system he provably never ignores.
5. **Kill the "wave" pattern permanently.** Batching eight activations into one future event
   is what guaranteed deferral. `f2be2c592` planned a wave; the wave never ran. That was not a
   discipline failure — it was a bad plan shape.

**Do not migrate the ~20 env flags onto Launch Control.** Worker on/off switches cannot use
percentage bucketing or role targeting, each migration is a risky diff, and their real
deficits (record, expiry, visibility) are fixed far cheaper by 1–3 above. Migrate
opportunistically — only when a flag actually needs a staged rollout.

**For the frontend: stop minting build-time `VITE_*` feature flags.** New ones resolve at
runtime through the flags API, fixed as you touch them. The existing four get flipped or
deleted per §7 step 9, and the class dies with them.

---

## 9. Review status

- **Claude (Opus 5)** — code truth, verified against `origin/main` in a clean worktree.
  Three instrument-validation catches during this audit: a `rg -rn` replace-flag artifact
  that fabricated a catastrophic phantom bug; a regex error whose failure still printed a
  "= dark" conclusion; and a naive mount check that produced 25 false-positive orphans.
  All three would have shipped wrong findings if output had been trusted over exit status.
- **Haiku ×3 (delegated sweeps)** — backend orphans, frontend dark surfaces, flag census.
  Combined accuracy ~77% on the claims I *did* check. **I did not check all of them** — the
  "12 orphaned playground concepts" claim shipped unverified and was false (§5 retraction).
  Corrected posture: every claim in this document has now been hand-verified, and the one
  that was not is retracted rather than quietly fixed. The flag census
  **missed `SPEED_TO_LEAD_REPLY_ENABLED`** and 7 others in the `_ENABLED` family — its counts
  are directional only; §3 uses my own scan.
- **Kimi K3** — process/sequencing lens on §7 and §8. See §10.

---

## 10. Kimi K3 — external review, and what I conceded

**Run:** `moonshotai/kimi-k3`, effort medium, 3,153 in / 16,322 out, **$0.2543**, 612s,
`finish_reason: stop` (not truncated). Full text:
`scratchpad/KIMI-ACTIVATION-DEBT-REVIEW.md`. Remit was deliberately narrow — process and
sequencing, explicitly *not* re-deriving code facts, because the code truth was already
proven and buying a second pass with my own lens is what §11 warns against.

### Conceded — these changed the document

| # | Kimi's finding | Verdict | What changed |
|---|---|---|---|
| 1 | My ordering put two code slices ahead of the only revenue item, guarding a failure mode ≈ the status quo — and I had refuted myself in my own text | **CONCEDED** | §7 rewritten; flip is now step 1 |
| 2 | PRISM had **no slot at all** in my sequence — the largest omission given acquisition is the weakest link | **CONCEDED** | §7 step 2; double-capture probed and clean |
| 3 | Sort by **reversibility**, not external visibility; settlement is irreversible, PRISM is one-click | **CONCEDED** | §6 fully re-sorted |
| 4 | 3/3 *governed* flags also sat dark ~4 weeks → governance is not the binding constraint; grow the assert, not the control plane | **CONCEDED** | §8.1 / §8.2 rewritten |
| 5 | "235 feature-days" is a vanity metric — the units are not commensurable across a revenue feature, corpses, and an unwanted engine | **CONCEDED** | §1 headline de-emphasised |
| 6 | "Zero product risk" is a categorical claim; evidence supports "low-risk, test-covered" | **CONCEDED** | wording fixed throughout |
| 7 | I underweighted `render.yaml` — ~19 flags have no record in the repo at all | **PARTLY** | promoted to §7 step 7. I do **not** adopt "most dangerous fact in the document": Render's blueprint-sync semantics were not verified here, so the *severity* is `[HYPOTHESIS]`. The *recommendation* stands regardless — no repo record is bad on its own terms. |
| 8 | Settlement worker may be a billing leak, not a flag question | **PARTLY** | §7 step 8. Probed: an inline path exists (`sessionDeductionService.mjs`), so the worker is likely a backstop. Whether a backlog accrued is genuinely **unverified** and needs a read-only query — a valid question, not a proven bug. |
| 9 | Automation cron: delete, don't flip — the lanes are reputation-coupled to S2L | **PARTLY** | §7 step 10 states both blocks. Framed as *Sean decides backlog-or-delete* rather than auto-delete: nurture may still be wanted once unsubscribe exists, and that is his call, not an agent's. |
| 10 | Days-dark measured from first commit rather than merge-to-main inflates the figures | **CONCEDED** | noted; the metric is de-emphasised anyway per #5 |

### Not conceded

- **"Activation problem, not a building problem" overreaches.** Partly fair — roughly a third
  is deletion work and some is build work, and §2 already said so. But the framing survives
  because the *cause* is identical across all four classes: nothing forces a decision at the
  point a flag or a file stops being needed. I sharpened §1 rather than retracting it.

### Calibration — worth recording against the prior note

The lane handoff rated Kimi *"truncated, least useful here"* on a code-validator review and
recommended buying a different lens instead. On this **process/sequencing** task it was the
single highest-value input of the session: ~10 findings, most valid, several inverting my
conclusions, for $0.25 and no truncation. **The earlier rating was task-class-specific and
should not be generalised** — Kimi was weak at attacking a regex validator and strong at
attacking a plan.

---

## 11. The thing most worth keeping

The lane handoff I inherited ended with: *a hostile loop run by the author converges on the
author's blind spots.* This audit reproduced that exactly. Four self-hostile rounds found
three instrument artifacts and one genuine self-correction (§3.1a) — real work, and all of it
still inside my own frame. It took an outside lens to notice I had scheduled two code slices
in front of the one action I had just finished proving was the only constraint.

The rounds were not wasted; they are what made the packet good enough to get a sharp answer.
But the lesson holds in both directions: **when your own loop runs dry, that is the moment to
buy a different lens — not to run another round.**

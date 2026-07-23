# Kimi K3 — Front-End / Design Review

**Reviewer:** OpenRouter `moonshotai/kimi-k3` (effort: high)
**Document:** C:/Users/BIGOTS~1/AppData/Local/Temp/claude/c--Users-BigotSmasher-Desktop-quick-pt-SS-PT/60dae4f0-968f-430a-bd11-293cfae81a64/scratchpad/trainer-economics-KIMI-PACKET.md
**Seed:** (none)
**Tokens:** 4056 in / 10728 out · **Cost:** ~$0.1731 · **Wall:** 437.8s

---

# SwanStudios Trainer Economics — Complete Design Plan

**Author:** Senior Systems + Product Designer
**Status:** Buildable plan. All plug-in points grounded in the real codebase facts provided. Defaults are best-judgment; Sean-decisions flagged. **[LAWYER REVIEW]** marks legally load-bearing items. **⚠ HIGH-STAKES** marks money/commission slices requiring security review before merge.

---

## 0. Design Principles (applied throughout)

1. **Snapshot, don't reach back.** Money facts (price, rate, type, override) are captured at transaction time into `CartItem.price` and `TrainerCommission` rows. Later config changes never rewrite history.
2. **Detect, surface, human-decide.** The algorithm ranks and evidences; the admin adjudicates. Nothing auto-punishes trainers. (Throttles on *resource* abuse may auto-engage — different domain, different stakes.)
3. **Fairness by construction.** Honest trainers should never feel the system. Tolerances are generous; attestations are first-class; the default state is invisible.
4. **Extend, don't parallel-build.** AdminSpecial, rate limiters, audit logs, and the commission pipeline already exist. Every net-new table below is justified by a confirmed gap.

---

## PART 1 — Two Trainer Types

### 1.1 The canonical type model

| Attribute | **Independent** | **Affiliated/Staff** |
|---|---|---|
| Clients | Brings own | SwanStudios' own (platform-assigned via `ClientTrainerAssignment.assignedBy`) |
| Pricing | Sets own base prices, governed (Part 2) | SwanStudios sets all pricing |
| Split | 15/85 (business/trainer) — **Sean's locked number** | 35/65 (business/trainer) — matches existing code at `commissionCalculator.mjs:36`; see §1.3 |
| Agreement | Independent-contractor agreement **[LAWYER REVIEW]** | Employment/affiliation agreement **[LAWYER REVIEW]** |
| Can create/edit storefront items | Yes (own items only) | No |
| Can run specials | Yes, capped (Part 2) | No |
| Type changes | Admin-only, audited, forward-dated | Same |

> **[LAWYER REVIEW] — misclassification is the single biggest legal exposure in Part 1.** "Affiliated works for Sean, helps run the operation" walks directly toward *employee* under IRS common-law and state ABC tests (especially if Sean is in California). If Affiliated trainers are functionally employees, they need payroll/W-2 treatment, not a 1099-style commission split. The comp model below assumes this gets resolved before affiliated onboarding ships. Do not let the software's label ("affiliated") paper over a de facto employment relationship.

### 1.2 Onboarding branch (single page, choose up front)

**Step 0 — "Which type are you?"** is a *request*, not a grant. The applicant selects a type; the account is created in `pending` status; the admin confirms or overrides the type during approval. This is the A9 defense: type is **never self-serviceable after signup**, and even the initial selection is advisory until admin confirmation.

**Independent branch fields:**
- Business name, EIN (optional in v1), service area
- **Certificate of Insurance upload** (plugs into existing R2 via `photoStorageService`/`r2StorageService`)
- Base-price setup wizard (creates their first governed `StorefrontItem`s, price-locked on save — see Part 2)
- Agreement: Independent Contractor Agreement + Platform Fee Schedule (15%) **[LAWYER REVIEW]**

**Affiliated branch fields:**
- Payroll/HR fields as required by the resolved classification **[LAWYER REVIEW]**
- Certifications, emergency contact, availability
- No pricing UI at all (removes the affordance, not just the permission)
- Agreement: Affiliation/Employment Agreement + comp schedule **[LAWYER REVIEW]**

**Admin confirmation surface:** the admin approval screen shows the requested type, a type selector (admin can change it), and a mandatory confirmation checkbox: *"I confirm this trainer's classification and comp model."* Every set/change writes an audit row (Part 5 makes the type itself safe to compute on).

### 1.3 Affiliated comp model — recommendation

**Recommend: percentage split, 35/65 (business/trainer), exactly as `commissionCalculator.mjs:36` already implements** — *not* flat $/session.

Rationale:
- The pipeline (`CommissionService.mjs` → `stripeWebhook.mjs:384` → `TrainerCommission`) already computes, snapshots, and tracks percentage splits with lead-source modifiers and loyalty bump. Flat $/session would require a parallel payout ledger, pro-rating on refunds, and a second reconciliation path — net-new money code for zero anti-abuse benefit.
- A flat rate creates a perverse incentive mismatch (staff trainer is paid identically whether the session sold for $60 or $120), and it decouples Sean's margin from his own pricing decisions.
- 65% to the trainer is generous-vs-market for staff-type arrangements and matches Sean's "fair employer" goal.

**Sean-decision:** 35/65 vs flat rate, and the exact affiliated rate. Default if no answer: **35/65, lead-source modifiers OFF for affiliated** (they don't bring clients; `leadSource` defaults to `'platform'`), loyalty bump retained.

### 1.4 Admin-controlled type (A9 defense)

- `User.trainerType` writable only by admin; every change audited (who/when/old→new/effective-date) using the `AdminAccountAuditLog.mjs` pattern.
- Type changes are **forward-effective only** and never recompute existing `TrainerCommission` rows (rates are snapshotted per transaction — see Part 5).
- A type change triggers a one-time re-run of the Part 3 scorer on that trainer's last 180 days (type-gaming often precedes fee-dodging).

---

## PART 2 — Anti-Abuse Pricing Governance ("Locked Base + Regulated Specials")

### 2.1 Where it plugs in

Every charge flows through `CartItem.price` (`cartRoutes.mjs:435`), resolved by `firstMoney(variant?.price, storeFrontItem.totalCost, storeFrontItem.price)` (`cartRoutes.mjs:169`). **The governance layer plugs in at two points:**

1. **Write path (price-setting):** trainer-facing package CRUD validates all rules below *before* persisting `StorefrontItem.pricePerSession`. Invalid prices can never enter the catalog.
2. **Read path (checkout):** a price-resolution step inserted immediately before `firstMoney` at `cartRoutes.mjs:169`: resolve buyer's active trainer (`ClientTrainerAssignment`, status='active') → load the governing `StorefrontItem` → apply any *valid, in-window, cap-compliant* special → apply floor → feed result to `firstMoney`. Checkout and commission then flow from the snapshotted `CartItem.price` automatically — no downstream changes needed.

**Do not add a third admin package surface.** Extend the legacy `/api/admin/storefront` mount (the live UI) and plan deprecation of `/api/admin/packages`; and **standardize on the shared `adminOnly` middleware** across `adminPackageRoutes` and `adminSpecialRoutes` (the `requireAdmin`/`adminOnly` inconsistency is a latent auth bug — fix in Slice S0). ⚠ Flag for security review.

### 2.2 Base-price rules

| Rule | Default | Sean-decision? |
|---|---|---|
| Cooldown between base-price changes | **30 days** per item | Yes (30 vs 60 — 30 recommended; 60 punishes honest trainers correcting an early misprice) |
| Price increase cap per change | **+25%** per change event (A8 intro-then-trap defense) | Safe to default |
| Price decrease cap | None (decreases are consumer-friendly; floor still applies) | Safe to default |
| Existing-client protection | **Grandfathered**: active packages (any `TrainerCommission` with `sessionsConsumed < sessionsGranted`, or any unredeemed purchase) keep their purchased price; new price applies only to *new purchases* | Safe to default (also a consumer-protection point — **[LAWYER REVIEW]** the grandfathering language in the trainer agreement) |
| Audit | Every change → `PriceChangeLog` row (§7) before commit | Safe to default |
| Floor | Post-discount session price ≥ **$40/session** platform minimum | **Yes — Sean-decision.** $40 is the best-judgment default for an upscale LA-adjacent market; the floor is the A4/A6 backstop and directly protects the 15% fee base. |
| Price ceiling | None | Safe to default |

### 2.3 Specials/discount rules

**Extend `AdminSpecial.mjs`, don't fork it.** Add a sibling `TrainerSpecial` table (§7) rather than overloading admin bonus-session promos — AdminSpecial is a *bonus-sessions* primitive, trainer specials are *price discounts*; different semantics, same shape (it already proves `assignedClientIds[]` client-scoping works — that's the A5 mitigation hook: discounts must be offered to all of a trainer's active clients or a documented cohort, not weaponized per-client).

| Rule | Default | Sean-decision? |
|---|---|---|
| Max discount depth | **25% off base** | Yes (25 recommended; deeper discounts are the A4 dodge vector) |
| Max duration per special | **14 days** | Safe to default |
| Real end date | **Required**, enforced by validity check at the `cartRoutes.mjs:169` plug-in (expired special = ignored, not error) | Safe to default |
| Max special-days per quarter | **28 of 90 days** per trainer | Safe to default |
| Cooldown between specials | **14 days** per item | Safe to default |
| Max concurrent specials | **1 per item** | Safe to default |
| Post-discount floor | Special can never push price below §2.2 floor — validation rejects, doesn't clamp | Safe to default |
| Client-scoping | Special applies to all trainer's active clients OR an admin-visible cohort list; cohort membership is logged (A5) | Safe to default |
| Audit | Every create/extend/early-end → `PriceChangeLog` | Safe to default |

### 2.4 Fee base (A6 defense)

SwanStudios 15% is computed on the **actual charged amount** — the snapshotted `CartItem.price` (post-discount, floor-enforced, in-platform only). Because commission flows from the same snapshot via `stripeWebhook.mjs:384`, there is no separate "fee base" to manipulate: the price the client paid *is* the fee base, by construction. Off-platform payment is undetectable by pricing rules alone — that's exactly what Part 3 exists for (A1/A10).

### 2.5 Abuse-vector coverage check (Part 2's static half)

A2 churn → cooldown + caps. A3 always-on-sale → quarterly day-budget + cooldowns + required end dates. A4 $0 dodge → floor. A5 discriminatory pricing → cohort-scoping + logged membership. A6 fee-base → snapshot identity. A8 intro-then-trap → +25% increase cap + grandfathering. A1/A7/A9/A10 → Parts 3/4/5.

**New vectors I'd add to the adversarial doc:**
- **A11 — loyalty-bump farming:** trainer creates shell client accounts and buys small packages to push a real client (or themselves) past the >100-sessions loyalty threshold (−5% business cut). Defense: Part 3 signal S8 (§3.4) + shell-account heuristics (same device/payment instrument across "clients" — flagged for admin, IDs-only).
- **A12 — attestation fraud:** trainer marks genuinely paid sessions as "comp/make-up" to launder the Part 3 mismatch signal. Defense: attestation *volume* is itself a scored signal (S6, §3.4); attestations are auditable per-session and revocable.

---

## PART 3 — THE ABUSE-DETECTION ALGORITHM (Centerpiece)

### 3.1 The core insight (the moat)

Most fitness platforms see *payments only*. SwanStudios sees **payments and actual training activity**, because the workout-log system is first-party. "Trained" (logged) and "paid" (package balance) live in the same database, keyed by the same `(trainerId, clientId)` pair. The detector is fundamentally a **reconciliation engine**: does funded supply match consumed demand?

### 3.2 Data sources (real tables/fields)

| Signal input | Source |
|---|---|
| Paid sessions granted | `TrainerCommission.sessionsGranted` (written by `CommissionService.mjs` from the Stripe webhook at `stripeWebhook.mjs:384`) |
| Paid sessions consumed (platform-reconciled) | `TrainerCommission.sessionsConsumed` |
| Actual sessions delivered | **First-party workout-log table** (per-client workout/session logs; fields used: `clientId`, `trainerId` or owning-plan trainer, `completedAt`/session timestamp, status). *Implementation note: confirm the exact model name at build time (WorkoutLog/WorkoutSession); the design only requires per-session rows with client, trainer, timestamp.* |
| Active relationships | `ClientTrainerAssignment` (`status='active'`, partial-unique pair) |
| Pricing behavior | `StorefrontItem.pricePerSession`, `PriceChangeLog`, `TrainerSpecial` (Part 2) |
| Refunds | Stripe refund events (extend webhook handling — see gap note §3.8) |
| Comp attestations | `SessionAttestation` (net-new, §7) |
| Trainer economics | `TrainerCommission.grossAmount`, `commissionRateBusiness/Trainer` |

### 3.3 The core signal (A10), computed concretely

For each active `(trainer, client)` pair, over window **W = rolling 90 days** (default):

```
logged    = count of completed workout-log sessions for pair in W
paid      = sum of sessionsGranted in W + carry-in balance
            (carry-in = max(0, prior sessionsGranted − prior sessionsConsumed))
attested  = count of admin-visible comp/make-up/trial attestations in W
tolerance = max(2 sessions, 15% of paid)        // generosity to honest trainers

overrun   = max(0, logged − paid − attested − tolerance)
ratio     = overrun / max(paid, 1)
```

- `ratio = 0` → clean. Most honest trainers live here permanently.
- Persistent `ratio > 0` means sessions are being delivered that the platform never sold and no one attested — the A10 signature.

Also compute a **depletion-tail signal** per package: `balance hits 0 (sessionsConsumed = sessionsGranted)` AND `logged activity continues ≥ 2 sessions within 14 days after depletion` with no new purchase. This catches the mismatch even when the 90-day aggregate is muddy.

### 3.4 Full signal set and weights

Each signal produces a sub-score in [0,1]; composite is a weighted sum, scaled to 0–100.

| # | Signal | Weight | Notes |
|---|---|---|---|
| S1 | Session overrun ratio (§3.3) | **35** | The moat signal; strongest |
| S2 | Depletion-tail activity | **15** | Balance 0, training continues |
| S3 | Cadence mismatch | 8 | Logged cadence (e.g. 3×/wk) vs funded cadence implied by purchase rate (1×/wk), sustained ≥ 4 weeks |
| S4 | Chronic small-package + high-activity | 8 | ≥ 60% of pair's purchases are the trainer's smallest package while logged volume ≥ 2× funded volume |
| S5 | Near-zero revenue, many active clients | 10 | Trainer-level: ≥ 5 active `ClientTrainerAssignment`s, trailing-90d gross < floor × 8 |
| S6 | Attestation abuse | 7 | Attestations > 25% of logged sessions (A12) |
| S7 | High refund rate | 6 | Refunds > 10% of gross or > 2 refund events/90d (A7) |
| S8 | Loyalty-threshold gaming | 4 | Purchases clustered suspiciously around the >100-session loyalty bump (A11) |
| S9 | Floor-hugging + churn-adjacent pricing | 4 | ≥ 80% of items at floor; special-days at quarterly cap (weak signal — legal behavior, contextual only) |
| S10 | Logged sessions with no on-platform booking *ever* for pair | 3 | Supplementary evidence |

**Confidence scaling:** a trainer with 2 clients and 8 logged sessions shouldn't score like one with 30 clients. Multiply the composite by a volume-confidence factor: `min(1, totalLoggedInW / 20)`. Below 20 logged sessions, scores decay toward 0 — the queue stays clean.

### 3.5 Thresholds, tolerance bands, and tiers (defaults)

| Composite score | Tier | System behavior |
|---|---|---|
| < 40 | Clean | Nothing. Invisible to admin. |
| 40–59 | **Watch** | Logged; appears in queue's "monitoring" section; no notification |
| 60–79 | **Alert** | Admin notification; enters ranked review queue with evidence packet |
| ≥ 80, or Alert persisting ≥ 30 days | **Critical** | Pinned to top of queue; admin notified prominently; still no automatic action against the trainer |

All thresholds, weights, window W, and tolerances live in a `platform_settings`-backed config (tunable from admin, changes audited). **Sean-decision:** the 60/80 cut lines; everything else safe to default.

### 3.6 Run cadence and output

- **Cadence:** nightly batch (Four-C Cadence automation) + event-triggered re-score on: package depletion, refund event, type change (§1.4), attestation spike.
- **Output = a ranked review queue, not events.** Each queue entry:

```
[CRITICAL] Trainer T-4821 · Client C-1093
  Logged 34 sessions vs 12 paid (rolling 90d) — overrun 19 after tolerance/attestations
  Depletion-tail: balance hit 0 on Jun 3; 9 sessions logged since, no new purchase
  Trainer aggregate: 71 (4 of 9 clients flagged)
  [View evidence timeline] [Mark reviewed] [Send reconcile request] [Escalate]
```

- Evidence packet = the per-pair timeline (purchases, grants, consumption, logged sessions, attestations) rendered with **Victory charts** (per house rules), IDs-only (no PII beyond what's already in the admin's own dashboard — the admin already sees these clients; the *algorithm* and any LLM touch never sees PII).
- Trainer-level rollup aggregates pair scores (weighted by logged volume) so the queue leads with the worst trainers, not the most clients.

### 3.7 Response ladder (human-decided, graduated)

| Rung | Action | Who |
|---|---|---|
| R0 | Nothing | System |
| R1 | **Soft nudge** — in-app notice to trainer: "Sessions logged for client C exceed their package balance. Please reconcile or mark comps." Self-serve correction | Admin clicks |
| R2 | **Reconcile request** — trainer must respond within 7 days: log missing purchase, attest comps, or explain. Non-response auto-escalates visibility (not punishment) | Admin clicks |
| R3 | **Restrictions** — pause trainer's ability to create specials and new packages; new client purchases require admin approval. Reversible | Admin clicks, audited |
| R4 | **For-cause suspension** per contract | Admin, **[LAWYER REVIEW]** the for-cause termination clause and evidence-retention policy must exist in the trainer agreement *before* R4 is ever used |

**False-positive handling (first-class, not an afterthought):**
- **Legitimate causes are structural:** comped sessions, make-ups, trials, family/friends training. These are *expected* — the system provides the `SessionAttestation` escape valve so honest trainers can keep their ledger clean in 10 seconds.
- The tolerance band (`max(2, 15%)`) absorbs casual comps with zero trainer action.
- Admin can **dismiss with reason** (`comp_arrangement`, `makeup_policy`, `data_error`, `other`); dismissals suppress re-flagging of the same pattern for 90 days and feed threshold tuning.
- Every trainer-facing message is non-accusatory by copy design: the system says "reconcile," never "we caught you." **[LAWYER REVIEW]** any trainer-facing language implying breach.

### 3.8 Gaps this exposes (proactive)

- **Refund events don't appear in the grounded webhook flow** — `stripeWebhook.mjs:384` handles the purchase path; S7 needs refund/chargeback event handling added. Small, but it's money-adjacent → include in a reviewed slice.
- **`sessionsConsumed` bookkeeping** must be wired to session redemption (check-in/log completion) if it isn't already — the depletion-tail signal depends on it. Verify in Slice S5; if unpopulated, consuming on log-completion is the fix.

### 3.9 Governance (Four-C Cadence)

Owner: admin. **Kill switch:** a single `abuse_detection_enabled` config flag halts scoring and queue generation (evidence retained). Privacy: the scorer reads IDs, counts, and timestamps only — zero PII to any LLM. All thresholds tunable with audit. Every admin action on the queue is audit-logged (mirror `AdminAccountAuditLog.mjs`).

---

## PART 4 — Two Admin Comp Toggles

### 4.1 Trainer fee-waiver (lifetime free access = 0% platform fee)

**Data model:** `User.platformFeeOverride` (nullable DECIMAL; `NULL` = default rate, `0` = waived) + `CompOverrideAudit` row on every set/clear (adminId, timestamp, old→new, optional reason). Nullable-override (not boolean) chosen deliberately: it generalizes to future negotiated rates without schema change, and `NULL` cleanly means "no exception."

**Calc integration:** `CommissionService.mjs` reads the override when loading `trainerType`, *before* calling `calculateCommissionSplit` (`commissionCalculator.mjs:36`). When override = 0: compute with business rate 0 / trainer rate 100, and **still write the `TrainerCommission` row** with `commissionRateBusiness=0` — the audit trail of *what was waived* is as valuable as the money. Never skip the row.

**Oversight intact:** waiver affects the fee calc only. The Part 3 scorer, pricing governance, and Part 6 metering are untouched — waived from fee, not from oversight. (A waived trainer running A10 costs Sean clients, not commission; still abuse.)

**Admin UI:** a toggle on the trainer row in the admin section (44px target, styled-components, Crystalline Swan). Toggle requires a confirm dialog ("Grant lifetime 0% platform fee to T-4821?") and writes the audit row atomically with the flag flip. Flippable at will, either direction, each flip audited.

### 4.2 Client free-access

**Recommended model:** free access = **waived platform membership/subscription cost** (whatever recurring client-side fee exists), *not* free training sessions and not free merchandise. Rationale: training sessions are the trainer's inventory and the commission base — comping them would corrupt both the fee base and the Part 3 signal (every comped package looks like an overrun). Membership is Sean's to give; sessions are partly the trainer's.

**Data model:** `User.freeAccessGranted` (BOOLEAN) + `User.freeAccessScope` (ENUM, default `'membership'`) + same `CompOverrideAudit` pattern. The access/billing check reads the flag; toggleable at will per client from the client row in the admin dashboard; audited identically to §4.1.

**Linkage to Part 6 (per Sean's instruction):** granting free access **also assigns a usage profile** (`usageTier='comped'`) in the same transaction — the account is metered under comped caps from day one (§6.4).

**Sean-decision:** what "free access" means for a client. Default if unanswered: membership-waiver scope as above.

---

## PART 5 — trainerType Schema-Drift Reconciliation ⚠ HIGH-STAKES (money) — build FIRST

### 5.1 The confirmed drift

- `User.trainerType` ENUM = `['affiliated','independent']`
- `commissionCalculator.mjs:49` and `CommissionService.mjs:92` default/compare against `'hired'` — a value that **cannot exist in the DB**
- Net effect: `'affiliated'` trainers fall into the else-branch and compute as 35/65 — which happens to be the *intended* affiliated rate, so today's money is accidentally right, but for the wrong reason, and any future edit to the 'hired' comparison silently changes affiliated pay
- Header comments say 10%/40% while code does 15%/35% — documentation drift on a money file

### 5.2 Canonical reconciliation

**Decision: the DB enum wins.** Canonical type values: `'independent'` (15/85) and `'affiliated'` (35/65). The string `'hired'` is purged from code.

1. **Single source of truth:** a `commissionRates` constants module (or a `commission_rates` config table if Sean wants admin-tunable rates later — recommend constants module for v1, config table is a premature knob on a locked number). `commissionCalculator.mjs` and `CommissionService.mjs` both import from it. No rate literals anywhere else.
2. **Fix the comparison** at `commissionCalculator.mjs:49` and `CommissionService.mjs:92`: compare against `'affiliated'`; add a defensive `default:` that **throws/alerts on unknown type** rather than silently computing — silent fallthrough on money code is how this bug happened.
3. **Fix the header comments** (15%/35%) in the same commit.
4. **Unit-test the matrix:** every enum value × every leadSource × override present/absent → assert exact splits. This test file is the regression wall.

### 5.3 Money-safe migration path

1. **No DB enum migration needed** — `'hired'` can't exist in the column (that's the bug's silver lining). Confirm with a one-time audit query: `SELECT trainerType, COUNT(*) FROM "Users" WHERE trainerType NOT IN ('affiliated','independent')` → expect zero; alert if not.
2. **Historical commissions: do NOT recompute.** `TrainerCommission` rows snapshot `commissionRateBusiness/Trainer` and cuts at transaction time — they are a ledger, not a view. Because affiliated trainers were *accidentally* computed at the intended 35/65, historical rows are economically correct. ⚠ **But verify before declaring it:** run a reconciliation report sampling historical `TrainerCommission` rows joined to the trainer's type, confirming rate = intended rate for the type at that date. Any discrepancy → itemized report to Sean; remediation is a **manual, audited adjustment entry** (never an UPDATE to ledger rows). **[LAWYER REVIEW]** if any material under/overpayment surfaces.
3. **Deploy order:** constants module + tests → code fix → reconciliation report → sign-off. This slice (S0) ships **before any Part 1/2/4 code touches the commission path**, and gets security review.

---

## PART 6 — Resource-Usage Metering, Free-Account Watch, and Throttle/Enforcement

### 6.1 Audit-first: what already exists (extend, don't rebuild)

| Existing | Assessment | Plan |
|---|---|---|
| "AI cost scaling strategy" concept | Concept-level; no per-user token accounting grounded | Feed its policy intent into the ledger's LLM dimension; the ledger supplies the *measurement* it lacks |
| `authMiddleware.mjs` rateLimiter | Per-user request limiting exists at gateway | **The throttle enforcement point** — extend to read per-account `usageTier` and apply tiered limits (§6.5) |
| In-memory limiter in `workoutLogUploadRoutes.mjs` | Route-local, in-memory (doesn't survive restart/multi-instance) | Replace with ledger-backed check; keep interface |
| `photoStorageService` / `r2StorageService` | Upload path exists | Add byte-accounting hook at upload completion (storage dimension) |

**Genuinely missing (net-new justified):** per-user LLM token accounting, storage/bandwidth attribution per account, per-account cost rollup, a usage-ledger store, comped-account ceilings, and a throttle *mechanism* (today there are limiters but no graduated, admin-controlled, per-account throttle state).

### 6.2 The usage ledger (single store for all dimensions)

`UsageLedger` (§7): append-only rows `(userId, dimension, periodBucket, quantity, estimatedCostMicros)`. Dimensions: `llm_tokens`, `storage_bytes` (gauge — current R2 footprint), `bandwidth_bytes` (R2 egress + streaming), `api_requests`, `video_seconds`, `email_sends`. Period buckets: hourly raw, rolled to daily/monthly aggregates (retention: hourly 30d, daily 13mo, monthly forever). Cost attribution uses a rate-card config (LLM $/token by model, R2 $/GB stored + $/GB egress, Render compute estimate) — tunable, audited, approximate-but-consistent. Estimated cost is for *ranking and alerting*, not billing. **[LAWYER REVIEW]** only if cost estimates are ever shown to users as charges — don't; keep it internal.

**Collection points:** LLM call wrapper (count tokens in/out per `userId` — IDs only, zero PII to LLMs per house rule); R2 upload/egress hooks in the storage services; gateway middleware increments `api_requests`; notification service increments `email_sends`.

### 6.3 The watch algorithm

Nightly aggregation per account + rolling checks. Alert conditions (defaults):

| Condition | Default trigger |
|---|---|
| Comped account over monthly cap (any dimension) | 80% → Watch; 100% → Alert + auto-throttle per §6.5 |
| Paid account anomalous usage | 3× trailing-90d personal baseline → Watch |
| Storage growth spike | > 1 GB/week added → Watch |
| Cost concentration | Any single account > 25% of total platform estimated cost/month → Alert (free or paid) |

Output feeds the **same admin review surface as Part 3** — one "Abuse & Usage Review" console with two tabs (Trainer Economics / Resource Usage), shared ranked-queue pattern, shared audit. Free accounts are visually highlighted throughout.

### 6.4 Usage caps (defaults — all Sean-decisions on the numbers, safe-to-default on the structure)

| Dimension | Comped account (hard ceiling, day one) | Paid account |
|---|---|---|
| LLM tokens | **100k/month** (Swan Coach active use ≈ 30–60k) | 500k/month soft alert |
| Storage | **1 GB** | 10 GB soft alert |
| Bandwidth | **5 GB/month** | 25 GB/month soft alert |
| API requests | **2,000/day** | 10,000/day soft alert |
| Video streaming | **2 GB/month** | soft alert only |

Structure: comped = hard ceiling + enforced from grant day (linked to Part 4 toggle); paid = soft alerts (their revenue covers cost; throttling a paying customer is a business decision for Sean, never automatic).

### 6.5 Throttle / enforcement mechanism

**Enforcement point:** extend `authMiddleware.mjs` rateLimiter into a **tier-aware gateway limiter** reading `User.usageTier` (`'normal' | 'comped' | 'throttled_l1' | 'throttled_l2' | 'suspended'`, admin-set or auto-set, audited). Token checks additionally gate at the LLM wrapper; storage at upload time. Replace the in-memory limiter in `workoutLogUploadRoutes.mjs` with the same tier check (fixes the multi-instance hole).

**Graduated response:**

| Stage | Trigger | Effect |
|---|---|---|
| Soft cap | 80% of cap | User sees neutral meter ("you've used 80% of your monthly AI allowance"); admin Watch entry |
| Hard cap / L1 throttle | 100% (comped: automatic) | Requests limited to floor: LLM 2k tokens/day, uploads 10 MB/day, 60 req/min. **Auto-engage for LLM tokens and bandwidth (marginal-cost, fast-bleeding); require admin action for storage** (deleting/blocking someone's stored media is destructive-feeling → human decision) |
| L2 throttle | Admin-set after L1 breach/repeat | Tighter floor: LLM off, uploads off, read-only platform |
| Suspend | Last resort, admin-only, always | Account frozen; **[LAWYER REVIEW]** suspension language in ToS |

**User messaging (non-hostile, per Sean):** "You've reached your monthly usage limit. Your access restores on [date], or contact your trainer/SwanStudios about options." Never "abuse detected."

**Reversibility:** admin restores any tier at will from the same review surface — same toggle-and-audit pattern as Part 4. Every tier change (auto or manual) writes an audit row and notifies the admin.

**Governance:** Four-C — owner admin, kill switch (`usage_enforcement_enabled`; when off, metering continues, enforcement stops), IDs-only, tunable caps.

### 6.6 Proactive hardening (Sean's granted latitude)

1. **Per-user AI budget wrapper** — the single highest-value gap; without token attribution, Swan Coach cost is a black box.
2. **Upload size/type caps** at `workoutLogUploadRoutes.mjs` and COI/media uploads (e.g. 25 MB/file images, 200 MB video) — uncapped uploads are the cheapest abuse vector to close.
3. **Distributed rate limiting** — in-memory limiters fail silently under horizontal scaling on Render; back them with the ledger or Redis before a second instance ships.
4. **Monthly cost rollup report** to admin (estimated spend by dimension, top-10 accounts, comped-vs-paid split) — Sean should see his free-access generosity's price tag monthly.
5. **R2 lifecycle rules** for orphaned media (deleted accounts' uploads) — pure cost hygiene.

---

## 7. Data-Model Summary (net-new; everything else extends existing)

| Table / Column | Fields (key) | Plugs into |
|---|---|---|
| `PriceChangeLog` | id, storeFrontItemId, changedByUserId, changeType (`base`/`special`), oldValue, newValue, createdAt | Mirrors `AdminAccountAuditLog.mjs` pattern; written by Part 2 write-path |
| `TrainerSpecial` | id, trainerId, storeFrontItemId, discountPct, startDate, endDate (required), cohortClientIds[], status, soft-delete | Sibling of `AdminSpecial.mjs`; validated at write, enforced at `cartRoutes.mjs:169` |
| `SessionAttestation` | id, trainerId, clientId, sessionLogId, reason (`comp`/`makeup`/`trial`/`other`), createdAt, revokedAt | Read by Part 3 scorer; written from trainer UI |
| `AbuseScore` | id, trainerId, clientId (nullable for trainer-level), window, subScores (JSONB), composite, tier, computedAt | Written nightly by Part 3; queue reads latest |
| `AbuseReviewAction` | id, abuseScoreId, adminId, action (`dismiss`/`nudge`/`reconcile`/`restrict`/`suspend`), reason, createdAt | Admin queue; audit pattern |
| `CompOverrideAudit` | id, targetUserId, adminId, overrideType (`fee_waiver`/`free_access`), oldValue, newValue, reason, createdAt | Part 4 both toggles |
| `User.platformFeeOverride` | nullable DECIMAL | Read by `CommissionService.mjs` pre-calculator |
| `User.freeAccessGranted`, `User.freeAccessScope` | BOOLEAN, ENUM | Billing/access check |
| `User.usageTier` | ENUM (`normal`/`comped`/`throttled_l1`/`throttled_l2`/`suspended`) | Read by extended `authMiddleware.mjs` limiter |
| `UsageLedger` | id, userId, dimension, periodBucket, quantity, estimatedCostMicros | Written by metering hooks (§6.2); read by watch algorithm + dashboard |
| `UsageTierAudit` | id, userId, setBy (adminId or `system`), oldTier, newTier, reason, createdAt | Throttle governance |
| `StorefrontItem.createdByTrainerId`, `.priceLockedAt`, `.lastPriceChangedAt` | FK→"Users", timestamps | Cooldown + ownership scoping for Part 2 |
| Config: pricing knobs, abuse thresholds, usage caps, kill switches | key-value `platform_settings`-backed, audit-on-change | All parts |

All FKs reference `"Users"`; styled-components + Crystalline Swan + 44px targets + Victory charts for all UI; zero PII to LLMs (IDs/roles only).

---

## 8. Build-Slice Sequence (independently shippable)

| Slice | Contents | Stakes |
|---|---|---|
| **S0** | Part 5 drift fix (constants module, 'hired'→'affiliated', comment fix, test matrix, historical reconciliation report) + `requireAdmin`/`adminOnly` auth standardization | ⚠ **HIGH-STAKES money + auth — security review required** |
| **S1** | Audit infrastructure: `PriceChangeLog`, `CompOverrideAudit` tables + writers | Low |
| **S2** | Part 2 write-path governance (locks, cooldowns, floor, grandfathering) + price-resolution plug-in at `cartRoutes.mjs:169` | ⚠ **HIGH-STAKES money — security review required** |
| **S3** | `TrainerSpecial` + caps/validity enforcement | Medium (touches price read-path) |
| **S4** | Part 4 toggles (both) + fee-calc override integration + admin UI | ⚠ **HIGH-STAKES money — security review required** |
| **S5** | Part 3 detector in **shadow mode**: scorer + queue render, no trainer-facing actions; validate `sessionsConsumed` bookkeeping; add refund-event handling | Medium; shadow mode lets thresholds be tuned against reality before anyone sees a nudge |
| **S6** | Response ladder (R1–R3) + attestations + dismissals | Medium — requires **[LAWYER REVIEW]** of trainer-facing copy before R1 ships |
| **S7** | Usage ledger + metering hooks + usage dashboard (watch only) | Low |
| **S8** | Throttle tiers + gateway enforcement + auto-throttle for LLM/bandwidth | ⚠ **HIGH-STAKES (enforcement/auth-layer) — security review required** |

S0 blocks S2/S4 (never build pricing on a drifting type). S5's shadow period (recommend 2–4 weeks) de-risks S6's false-positive rate.

---

## 9. Open Questions for Sean (material to design)

1. **Price floor $** — $40/session post-discount is my default; the floor is the single most load-bearing number in Part 2. What's the real market floor?
2. **Affiliated comp** — confirm 35/65 split (code's current behavior) vs flat $/session; and confirm the classification resolution with counsel before affiliated onboarding ships **[LAWYER REVIEW]**.
3. **"Free access" for a client** — membership-waiver (my default) vs broader? Broader scopes corrupt the Part 3 signal and need explicit design.
4. **Usage-cap values** — my defaults (§6.4) are sized for "generous but bounded." What's the actual monthly LLM/R2/Render bill today, and what monthly comped-cost-per-account feels acceptable?
5. **Historical commission reconciliation** — if the S0 report finds any affiliated trainer was ever paid off the *intended* rate, remediate or grandfather? **[LAWYER REVIEW]** + money decision.
6. **Auto-throttle scope** — OK with automatic L1 throttling on comped accounts for LLM/bandwidth (my recommendation), or should every throttle be manual until trust in the metering is established?
7. **Cooldown length** — 30 vs 60 days on base-price changes (I recommend 30).

---

### Closing note on the dual mandate

The system's fairness comes from its *tolerances and escape valves* (15% session tolerance, one-tap attestations, dismiss-with-reason, grandfathered pricing); its robustness comes from its *structure* (snapshot-at-charge pricing, admin-owned types, the paid-vs-logged reconciliation no competitor can replicate). Honest trainers will never know it exists. Abusive ones will meet a human holding a receipt.

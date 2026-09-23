# Money-Path Workstream — WORK ORDER for the next agent
**Date:** 2026-08-19
**From:** Opus 5 (claude-opus-5)
**Read this first, then** `MONEY-PATH-SECURITY-HANDOFF-2026-08-17.md` for the full history.

This document is the **what to do next**. The handoff is the **what happened and why**.

---

## 0. State — SHIPPED 2026-08-19

**SLICE 0 IS DONE. The 14 commits are on main and deploy-verified.**

```
Pushed:   4e8394673..af5e1b30a -> main   (fast-forward, 14 commits)
Deploy:   CONFIRMED live 2026-08-19
Branch:   claude/cart-role-escalation-20260816 (rebased, == origin/main)
Worktree: c:/tmp/ss-cart-role-20260816
```

**Verification performed before the push** (do the same for your slices):
- Rebased onto `origin/main` @ `4e8394673` — 14/14 replayed, 0 conflicts.
- Baseline re-measured AT THE NEW origin/main: **8 failed / 36 failed files** / 9122 passed.
- Rebased branch, identical command: **8 failed / 36 failed files** / 9220 passed.
- **Zero new failures, +98 tests.**
- Rule 42 audit clean; secret scan on 32 changed files CLEAN.

**Deploy verified by behaviour, not by assumption.** `POST /api/roles/test-upgrade`
was deleted by `7721460c5`, so it is a free release marker: old bundle returns 401
(route exists, auth rejects), new bundle returns 404. Observed flipping 401 -> 404 at
t+180s with `/api/health` holding 200 throughout — new code live, no crash-loop.
**Reuse this trick:** whenever a slice deletes or adds a route, that route is a
zero-cost release marker. The health endpoint exposes no commit SHA.

### NOTE — baseline moved upstream
The baseline was **6 failed / 34 failed files** at `8257e42b6` and is **8 / 36** at
`4e8394673`. `main` acquired 2 new failing tests on its own across those 157 commits.
Not from this branch. Worth a separate look; do not let it drift further unexamined.

### Environment hazards hit during this push — you will likely hit them too

**1. `backend/node_modules` was found COMPLETELY EMPTY** (0 packages, including
`express` and `sequelize`); root and frontend were intact. Fixed with
`npm install --no-audit --no-fund` in `backend/` (842 packages, ~1 min). If tests
cannot resolve `vitest`, check this first.

**2. The worktree's `node_modules` are NTFS junctions to the main tree** — so the main
tree being broken breaks the worktree. Recreate with `mklink /J` via a `.bat` file;
Git Bash mangles the paths.

**3. `git stash` is REPO-WIDE, not per-worktree.** `git stash push` on a clean tree
saves nothing, so a following `git stash pop` will pop **another worktree's** stash and
conflict into unrelated files. This happened during this push. Never `stash pop` blind:
capture the ref from the `push` output, or check `git stash list` first. If you pop a
foreign stash, `git reset --hard <your-tip>` and **do not drop the stash** — it belongs
to someone else.

---

## 1. RECOMMENDED SEQUENCE — and why this order

My recommendation, strongest first. Reasoning matters more than the list; if you
disagree with the reasoning, reorder.

### ~~SLICE 0 — PUSH THE 14 COMMITS~~ ✅ DONE 2026-08-19 (`af5e1b30a`, deploy-verified)

*(Kept for the reasoning, which applies to every future batch.)* Reasons it went first:
- These close real, currently-exploitable holes on a production money path: unpaid
  role escalation, retired items purchasable on the primary rail, packages that ring
  up at $0, and money captured with nothing granted.
- Nothing is half-finished. Every slice is committed, tested, and verified against a
  re-measured baseline.
- `origin/main` gained 157 commits and is still moving. Rebase risk compounds; the
  branch is clean *today*.
- One push, one Render deploy, one health check.

After push: verify backend health and confirm the release marker reached the deployed
bundle. Do NOT continue building on an unverified deploy.

### ~~SLICE 1 — refund/dispute lifecycle~~ ✅ DONE 2026-08-19 (`38e8355c1`, pushed)

Shipped `charge.dispute.closed`, `charge.refund.updated`, `charge.refund.created`
through the existing `handleChargeReversal`, with an explicit event taxonomy (each
event delivers a different object shape) and outcome-bearing labels/payload. Order
status is moved only by a charge-level FULL refund — a won dispute booked as refunded
would be wrong bookkeeping. Detection only; revocation still blocked on Sean.

15/15 new tests, 7 RED before the change. Baseline at base `6d05daf78`: 6 failed / 35
files; branch identical, +15 tests, zero new failures.

**Mutation lesson worth repeating:** M1 (unwire the cases) went RED correctly. M2
(disable the order-status guard) initially stayed GREEN — a real dispute object has no
`amount_refunded`, so the flip was already impossible for unrelated reasons and the
assertion was decoration. Fixed by feeding a charge-shaped payload carrying
`amount_refunded`, making the event-type guard the only thing preventing the write.
**Always ask whether your test can actually REACH the guard it claims to protect.**

### SLICE 2 — START HERE. Durable alert outbox *(GLM MEDIUM-7)*

> **⚠ READ BEFORE WRITING THE MODEL — production DDL trap, discovered 2026-08-19.**
>
> This slice adds a NEW TABLE. Production table creation does NOT come from
> `sequelize.sync()` — `sequelize.sync({ alter })` is fail-closed behind
> `STARTUP_SCHEMA_ALTER` and skipped on normal deploys. Tables are created by
> `utils/productionDatabaseSync.mjs` -> `createTablesInOrder(models)`, which
> **iterates ONLY the explicit list in `utils/tableCreationOrder.mjs`.**
>
> A model registered in `getModels()` but ABSENT from that list **never gets a table
> in production.** This has already happened once: see the comment at
> `tableCreationOrder.mjs:108` — `packages` was missing from the list, the table was
> never created, and four admin finance routes queried a table that did not exist
> (SWA-157). The file itself calls this *"a self-healing boot that heals only what
> someone remembered to enumerate."*
>
> An alert-durability feature whose own table silently does not exist would be the
> worst possible version of this bug — the outbox would swallow every alert it was
> built to save, and look healthy doing it.
>
> **Required steps for this slice:**
> 1. Add the table name to `utils/tableCreationOrder.mjs` in the correct dependency
>    phase, with a comment naming its FKs (follow the existing entries' style).
> 2. Verify FK types match the referenced columns EXACTLY. The same file documents
>    `PainEntryCorrectiveExercises` being deliberately excluded because an
>    `exerciseId` vs `Exercises.id` UUID mismatch would error on every boot.
> 3. Prefer NO foreign keys at all for the outbox. It is a durability buffer: it must
>    still accept a row when the thing it references is missing or mid-rollback. An FK
>    turns a lost alert into a failed insert, which is the failure this slice exists
>    to remove.
> 4. Assert table registration in a test (`tableCreationOrder` contains the name), the
>    same way the sweeper's startup wiring is asserted — built-but-unregistered is
>    indistinguishable from built-and-working until production.
>
> **Design note:** write the row on transport FAILURE (GLM's recommendation), not on
> every alert. Relay from the existing cron pattern; `renderLeaseSweeperCron.mjs` and
> `checkoutReconciliationCron.mjs` are the two reference implementations.



Add `charge.dispute.closed`, `charge.refund.updated`, `charge.refund.created`.

**Why first among the code slices:** it is the only remaining piece of the refund lane
that needs **no policy decision from Sean**. Today a lost dispute produces no second
signal, and an undone refund leaves an order stuck at `refunded` forever. Pure "state
changed, tell someone" — bounded, testable, no judgement calls.

Reuse the existing `handleChargeReversal` in `webhooks/stripeWebhook.mjs`. Keep it
policy-neutral: never revoke sessions, never demote a role. That half stays blocked.

Every money alert shipped in this branch is **fire-and-forget**. If the transport is
down at that moment, the alert is lost permanently, because Stripe already got its 200.

**Why this ranks above the bigger fixes:** it is what makes all the detection already
built actually *trustworthy*. Refund detection that silently fails to notify is
equivalent to no refund detection. Persist a row inside the same failure path, relay
from the existing cron.

### SLICE 3 — Stripe client factory *(GLM M2)*

`v2PaymentRoutes` guards against a live key on a dev box via
`shouldBlockLiveStripeInLocal`. `cartRoutes`, `achPaymentRoutes`, and `stripeWebhook`
do not. One `getStripeClient()`, replace 4 init sites, pin `apiVersion` once.

Same fail-open-misconfiguration class as the `NODE_ENV` blacklist already deleted from
`roleRoutes`. Small, mechanical, and it removes three copies of conditional-init code.

### SLICE 4 — Batch the smalls

- Cart-rail line-count cap (`MAX_PAYMENT_LINE_ITEMS` bounds ACH/offline only; Stripe
  caps `line_items` at 100, so the 101st distinct cart line errors).
- Gallery/print expiry logging `No cartId` at `error` — routine noise at wrong severity.
- `offlinePaymentOrderItems.buildPaymentOrderItemRows` still uses
  `parseInt(item.quantity, 10)` — a weaker second copy of the quantity predicate,
  currently shielded by route-level validation.

### SLICE 5 — Merch oversell must not withhold paid TRAINING sessions *(GLM M1/E7)*

`cartCheckoutFulfillmentService` throws `CheckoutInventoryError` inside the grant
transaction. If a hoodie oversells between checkout and fulfilment, a paid customer's
training sessions are withheld and the webhook retries forever. Record the shortfall,
flag the order item `needs_review`, notify, and let the grant proceed. Strictness
belongs at session creation, where it already runs.

### SLICE 6 — ACH two-phase PaymentIntent *(SWA-168 item 3 remainder)*

Only the SILENCE was fixed. The PaymentIntent is still created INSIDE the DB
transaction, so a rollback leaves a live PI carrying a dangling `metadata.orderId`.
Create it after the idempotent claim commits; attach `paymentId` in a second small
transaction keyed on `paymentId IS NULL`.

### Then, in rough order of value
Unified purchasability policy (item 6) · crash-after-finalize half of the window
(MEDIUM-2) · snapshot-at-claim (MEDIUM-1 residual) · tax in `Order.totalAmount`
(item 8) · per-line commissions (item 9) · audit ledger (item 12).

### INDEPENDENT LANE — the Qwen replay harness

Settled design in handoff §6.6. **Does not touch the money path**, so it can run in
parallel with a different agent. Build the replay harness FIRST; only wire Qwen into
the live review loop if the replay shows it competitive. Full rationale and the
first calibration data point in §6.6–6.7.

---

## 2. BLOCKED — do not start these

| Item | Blocker |
|---|---|
| Refund **revocation** policy | Sean's decision: revoke all / unused only / none / freeze pending review. Now framed as consumption-freeze vs revoke — see handoff §5. |
| Cart-add DB unique index (item 7) | Needs a duplicate-row audit query FIRST; the migration fails on existing dirty rows. Migration = blast-radius, needs explicit approval. |
| `packageType: 'monthly'` (item 11) | Product decision: implement recurring billing, or block monthly items from one-time checkout. `createSubscription` is a stub. |

---

## 3. HOW TO WORK — non-negotiable, this produced the results

Full list in handoff §7. The five that matter most:

1. **Write the failing test FIRST.** Reproduce the exploit, then close it. Every real
   finding in this branch was reproduced before being fixed.
2. **Mutation-test every guard.** Break it on purpose; confirm the test goes RED. A
   source-text assertion that survives `if (false)` is decoration — that happened
   twice in this branch, once on the most important fix.
3. **Full-suite run against a RE-MEASURED baseline.** Do not trust a remembered
   number. `npx vitest run tests` also matches `__tests__`, so counts drift. Stash,
   checkout `8257e42b6`, run, restore, compare. Current baseline: **6 failed / 34
   failed files**.
4. **Any import change needs a full-suite run.** A static import once broke four
   suites while every targeted suite stayed green.
5. **Treat every external finding as a HYPOTHESIS.** Verify against the real caller
   path before acting. Roughly 30% of external findings evaporated on inspection —
   and one of my own "disproofs" was itself wrong because I read a line without its
   enclosing block.

---

## 4. WHEN THE SLICES ARE DONE — mandatory hostile review

Sean's standing instruction: **run GLM-5.3 and Kimi K3 hostile + security reviews on
the finished work, then fix everything real that they find.**

```bash
node scripts/consult-glm.mjs  --document <packet> --model glm-5.3 --max-tokens 28000 \
  --out c:/tmp/glm-review.md --remit "<remit>"
node scripts/consult-kimi.mjs --document <packet> --effort high --max-tokens 32000 \
  --cap-usd 3 --confirm-spend --out c:/tmp/kimi-review.md --remit "<remit>"
node scripts/consult-qwen.mjs --document <packet> --out c:/tmp/qwen-review.md \
  --remit "<remit>"    # free third voice; see §6.6 gating before wiring it in
```

**Packet construction matters more than the remit.** Ship the COMPLETE source of the
family under review, not a diff. When GLM was given a diff it rated two things CRITICAL
that collapsed the moment the named file was opened; given the whole family it declared
seven items explicitly unverifiable instead of guessing. Same model, same task — the
packet was the variable.

**Then verify every finding before acting on it.** Both models produce real findings
AND confident wrong ones. Fix what survives verification; record what does not, with
the evidence that disproved it, so it is not re-raised.

**Run reviews as background tasks and keep working.** Blocking on them wastes the
wall-clock; this branch processed two full review rounds without ever idling.

**Cost note:** reviewing a short design document costs roughly $0.05 on Kimi; reviewing
a large source packet costs roughly $0.37. Design review is nearly free — use it
liberally, before building rather than after.

**Model routing, measured across three rounds:**
- **Kimi K3** — multi-step operational sequences, second-order reasoning. Found the
  crash-window CRITICAL, and a vulnerability created by two individually-safe fixes
  *composed*. Best at "what does this change interact with?"
- **GLM-5.3** — control-flow and verifiable statements. Found a guard-ordering bug and
  that two shipped fixes were inert no-ops. Note: it 429'd three times on 2026-08-18
  (Z.ai overloaded) — have a fallback.
- **Qwen 3.8 (local, free)** — useful third voice, clearly below the other two. One
  calibration row so far: 4 of 5 findings useful, 2 mechanisms nobody else found, 1
  recommendation that would have been wrong to implement, and it shipped pseudocode
  contradicting its own analysis. Read its output; do not skim it.

---

## 5. Definition of done for this workstream

- All Tier-A slices shipped, each with a failing-test-first commit.
- Full suite matching the re-measured baseline exactly; zero new failures.
- GLM + Kimi hostile review run on the finished work, every finding verified,
  everything real fixed, everything disproven recorded with evidence.
- SWA-164 / SWA-168 / SWA-175 updated.
- Branch pushed, deploy health-verified.
- The three blocked items still blocked, and still clearly flagged to Sean.

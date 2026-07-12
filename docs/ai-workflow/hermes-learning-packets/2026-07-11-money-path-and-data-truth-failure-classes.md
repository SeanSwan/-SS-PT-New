---
originating_model: claude-fable-5
tier_gate: PASS
date: 2026-07-11
topic: Six durable failure classes surfaced by a 3-round hostile review (15 verified bugs) — money-path duplication, post-payment throws, and synthetic-vs-real data truth
surfaces: [stripe-webhook, session-grant, cart-checkout-fulfillment, storefront-specials, workout-pr-detection, history-backfill, admin-onboarding-list, auth-register]
---

## What was decided/built (Fable-tier lesson)

A 3-round hostile review (money path · auth/IDOR · launch-charter + nutrition) found **15 real bugs**. Every finding was independently re-derived from code before any fix (several subagent claims were rejected or corrected), and the highest-severity regressions were **proven to fail on the pre-fix code** before being locked. The individual bugs matter less than the **six failure classes** below — those are what should change how the next slice is written and reviewed.

---

### Class 1 — "Two writers, one record": dedupe on the NATURAL key, never on a path-specific idempotency key

A refactor gave the grant service its own Order writer (`cart-fulfillment:<cartId>`) while the older webhook writer (`stripe-webhook-cart:<cartId>`) was left in place. **Each deduped correctly against its own key and neither could see the other**, so every cart sale wrote **two** `completed` Order rows with the same `totalAmount`. Revenue (`Order.sum` where `status='completed'`) read **~2x for four weeks in production**, and nothing failed: both paths "worked," every test passed, the UI looked right.

- **Rule:** when two code paths can create the same entity, dedupe on the **natural key** (`cartId`), never on a key that is private to one path. A path-scoped idempotency key guarantees idempotency *of that path*, not *of the record*.
- **The tell was a comment.** The call site said *"The helper is idempotent by cart id"* — and it simply was not. A confident comment asserting an invariant the code does not enforce is a **high-yield place to attack**: it marks where an author *believed* something. Grep comments for asserted invariants and verify them.
- **Detection heuristic:** for any money/credit/record-of-truth table, ask "how many rows can one business event create?" and prove it with a uniqueness argument on the natural key — not by reading each writer in isolation.

### Class 2 — A post-payment boundary must NEVER throw ("fail closed" inverts after the charge)

Two separate bugs shared one root: code that throws *after* Stripe has captured money.

Throwing post-payment does two things at once: **(a)** it rolls back the grant, so a **charged customer gets nothing**; and **(b)** the webhook returns 500, Stripe **retries forever**, and sustained failures make **Stripe disable the endpoint** — which kills server-side fulfillment for **every** sale, not just the failing one. A single merch-only cart (0 session credits, a legitimate shape) could therefore have taken down the whole fulfillment path.

- **Rule:** `fail-closed` is correct **before** the charge and catastrophic **after** it. Post-payment code **honors + alerts**; it does not reject.
- **Prevention lives before the money moves:** gate at checkout, expire the in-flight session on cancel, cap session expiry. Do not try to enforce a business rule at the redemption boundary — by then it is too late to say no.
- **Corollary:** any `throw` reachable from a webhook handler after a successful capture is a latent outage, not just a failed request. Audit them as availability bugs.

### Class 3 — A code fix stops NEW corruption; it does not undo what is already written

The duplicate-Order fix prevents further duplication but leaves **four weeks of duplicate rows in production**. Historical revenue stays inflated until a reconciliation.

- **Rule:** every data-corruption fix has **two halves** — stop the bleeding, and clean the wound. Shipping only the first and calling it "fixed" is a false closeout. Always ask explicitly: *"what is already in the database, and who reconciles it?"* and surface it as an owed item.

### Class 4 — Synthetic data must be INERT with respect to records of truth

The workout backfill fabricated sets by pairing `MAX(weight)` with `MAX(reps)` taken from **independent aggregates** — producing a lift the client never performed (real `225x1` + `135x15` → a fake `225x12`). Its estimated 1RM **out-scored the client's real personal record**, overwrote it, and repointed the record at the generated filler session. The backfill's **undo then deleted that row** — permanently erasing the client's real best.

- **Rule:** generated/filler/synthetic records must never be able to **establish or beat** a record of truth (PR, best, baseline, streak). Suppress at the source (a source-policy flag), not by hoping the numbers stay small.
- **Rule:** an **"undo" that DESTROYs is not an inverse.** If an operation can *overwrite* prior state, its undo must **restore** the prior value, not delete the row — otherwise undo destroys data the operation never owned. Ask of every undo: "can this delete something the forward op did not create?"
- **Rule:** never pair independent aggregates. `MAX(a)` and `MAX(b)` from the same GROUP BY did not necessarily co-occur; combining them fabricates a datum. If you need a matched pair, select the row, not the aggregates.

### Class 5 — Guard symmetry: when you add a correctness guard to one branch, sweep its siblings

The PR engine correctly gated its UPDATE path ("only celebrate a record that actually persisted") but left the **CREATE** path swallowing every error while still emitting the celebration — so a transient DB failure announced a new record with no row written, and the next workout celebrated it *again*. The commit that added the guard delivered exactly half of its own stated claim.

- **Rule:** a guard added to one branch of a create/update (or read/write, or success/failure) pair is a prompt to check the sibling **in the same pass**. Asymmetric guards are a recurring class, and the commit message will usually claim the symmetric property.

### Class 6 — Clamping invalid input creates absorbing states; REJECT instead

`estimateBrzycki1RM` clamped an above-human-ceiling estimate to a `1500` cap rather than rejecting it. Because the PR comparison is a strict `>`, a single garbage entry stored `1500` and then **nothing could ever beat it** — estimated-1RM records froze **permanently**.

- **Rule:** invalid input should be **rejected** (`null`), not clamped into the valid domain, where it becomes indistinguishable from a legitimate extreme and can become an **absorbing state** under a monotone comparison. Clamping hides bad data *and* poisons the future.

---

## Why (the rationale Hermes should carry forward)

- **The expensive bugs were all invisible to the test suite.** The suite was green while production double-counted revenue for a month. Passing tests prove the paths you thought of; they say nothing about an entity written by two paths that never meet. Green ≠ correct.
- **The severity ranking was counter-intuitive.** The scariest bug was not the one that loses a sale — it was the one that could get the **Stripe endpoint disabled**, converting one bad cart into a total fulfillment outage. Reason about **blast radius**, not the immediate symptom.
- **Comments and commit messages are attack surface for a reviewer.** Two of the worst bugs were sitting directly under a comment or commit message that *asserted the property the code failed to have*. Confident prose marks an unverified belief.
- **Subagent findings are hypotheses, never root cause** (Rule 30). Several were wrong or mis-scoped; one flagged handlers that were in fact correctly guarded. Re-derive from the line before touching code — and equally, do **not** discard a finding because the area recently passed a gate (Rule 52 cuts both ways: this area had a fresh Codex APPROVE and still contained a 4-week-old live revenue bug).

## Reusable pattern / rule Hermes should apply next time

When reviewing or planning anything that touches money, credits, or records of truth, run this checklist:

1. **How many rows can one business event write?** Prove uniqueness on the **natural key**, not on each writer's own idempotency key.
2. **Is there a `throw` reachable after the money is captured?** If yes, it is an outage. Convert to honor + alert; move the enforcement earlier.
3. **What is already in the database?** A fix that only prevents new corruption is half a fix — name the reconciliation owner.
4. **Can synthetic/generated data touch a record of truth?** It must not. And can any "undo" delete a row the forward operation did not create?
5. **Did a guard get added to only one branch?** Sweep the sibling.
6. **Is invalid input clamped rather than rejected?** Check for absorbing states under `>` / `<` comparisons.
7. **Does a comment assert an invariant?** Verify it — that is where the bugs live.

## Risks / guardrails

- **Live production risk still open at time of writing:** the revenue double-count fix is committed but **unpushed**, so production continues to double-count; and even after the push, the **already-written duplicate rows remain** until reconciled (Class 3).
- Two open decisions are Sean's, not engineering's: **honor-vs-refund** when a client pays for a deal cancelled after their checkout was minted; and whether to **remove `admin` from public self-registration** (the compare is now constant-time + fail-closed regardless).
- Do not "fix" a post-payment throw by making it fail *harder* — that is the trap this review kept finding. Enforcement must migrate **earlier**, before capture.

## Provenance & privacy

- `originating_model: claude-fable-5` (Fable 5). Findings were surfaced by subagents but **independently re-derived, corrected, and adjudicated by Fable in the main loop**; the design calls (natural-key dedupe via `paymentAppliedAt`, source-policy PR suppression, deferring to Codex's locked honor-behavior) are Fable-tier synthesis. `tier_gate: PASS`.
- Sanitizer: `scripts/scan-secrets.sh` PASS (0 hits). IDs/roles only — **no** client names, PII, medical data, secrets, keys, tokens, DB URLs, or absolute user paths.

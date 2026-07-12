---
originating_model: claude-fable-5
tier_gate: PASS
date: 2026-07-11
topic: Identity-function drift — one law behind three unrelated-looking bugs (revenue double-count, duplicate PR baselines, wrong-day heatmap)
surfaces: [stripe-webhook, cart-checkout-fulfillment, workout-pr-detection, chart-data-controller, workout-heatmap]
---

## What was decided/built (Fable-tier lesson)

Across a hostile-review sweep I fixed three bugs that looked completely unrelated — they lived in three different subsystems, were surfaced by three different reviews, and presented as three different symptoms:

| Symptom | Subsystem | Root |
|---|---|---|
| Every cart sale counted **twice** in revenue (4 weeks, live) | Stripe fulfillment | one writer deduped on `cart-fulfillment:<cartId>`, the other on `stripe-webhook-cart:<cartId>` |
| Client got **two** personal-record baselines for one exercise | PR engine | PR table keyed on raw `exerciseName`; analytics grouped by `LOWER(exerciseName)` |
| Evening workouts rendered on the **wrong day and wrong week** | Heatmap | server labelled the day in **UTC**; the grid bucketed it in **browser-local** time |

They are **the same bug**. In each case, **one entity was given two different identity functions in two different layers**, and the layers then tried to match on identity.

> **The law:** whenever an entity crosses a layer boundary, both sides must compute its identity **the same way**. An "identity function" is whatever answers *"is this the same thing?"* — a dedupe key, a map key, a `GROUP BY`, a calendar-day label, a unique index, a `Map.get()` lookup. If the two sides disagree, the system **silently splits or duplicates the entity**. Nothing throws. Every test passes. The corruption is only visible if you aggregate.

This is why it is so expensive: each layer is *individually correct and internally consistent*. The webhook's idempotency was airtight — for the webhook. The PR engine's unique index was correct — for the PR engine. The heatmap's Monday-aligned column math was, I verified, arithmetically perfect. **The defect lives in the gap between two correct components**, which is exactly where unit tests do not look.

## Why (the rationale Hermes should carry forward)

- **Duplication and misplacement are the same failure.** If the identity functions disagree, you get a duplicate (two rows for one thing) *or* a misfile (the thing lands in the wrong bucket). Same root, different presentation — so do not treat "duplicate row" and "wrong bucket" as different investigations.
- **The green test suite is not evidence.** All three shipped under a fully green suite and lived in production. Unit tests assert *within* a layer; identity drift only manifests *between* layers. If you want a test to catch it, the test must span both sides (e.g. produce a row through path A and assert path B finds *that* row, not a new one).
- **Comments mark the drift.** The revenue bug sat under a comment asserting *"idempotent by cart id"* — which the code did not do. Confident prose about an invariant is a reliable tell that someone *assumed* an identity function nobody enforced.
- **Layer-crossing is where the money is.** Two of the three were money/data-truth bugs; the third corrupted the client-facing proof of their own training. Identity drift preferentially damages the things you aggregate — revenue, streaks, records, counts — i.e. exactly the numbers a business decides on.

## Reusable pattern / rule Hermes should apply next time

When reviewing or planning **any** feature where data crosses a boundary (service ↔ service, DB ↔ app, backend ↔ frontend, write-path ↔ read-path), ask these five questions:

1. **What is this entity's identity?** Name the natural key out loud (`cartId`, the exercise, the calendar day).
2. **Who computes that identity, and how — on EACH side?** Write both expressions down next to each other. Do they produce the same value for the same entity?
3. **Is anyone deduping on a key private to their own path?** A path-scoped idempotency key guarantees idempotency *of that path*, never *of the record*. Dedupe on the **natural key**.
4. **Is anyone normalizing when the other side isn't?** `LOWER()`, `trim()`, `slice(0,150)`, rounding, `TO_CHAR`, a timezone conversion — every normalization is an identity function. **Check the same value you store; store the same value you check.** (A fourth bug in the same sweep: an equipment duplicate-check queried the *untruncated* name while the insert stored a *truncated* one — 500 instead of 409, same law.)
5. **Whose clock decides "what day is this"?** A timestamp has no day until someone picks a timezone. If the writer picks UTC and the reader picks local, they disagree about reality. Ship the **instant**, let **one** side derive the day, and say which one.

**Detection heuristic that works:** grep for the same entity being keyed in two places and diff the expressions. `Order.findOne({where:{cartId}})` vs `lookupWhere:{idempotencyKey}` · `GROUP BY LOWER(name)` vs `where:{exerciseName: name}` · `TO_CHAR(date,'MM/DD')` vs `date.getMonth()/getDate()`. In all three, the bug is visible **just by putting the two lines side by side** — no execution required.

## Risks / guardrails

- **Fixing the drift does not undo the damage.** All three had already written bad data: duplicate Order rows (four weeks, still in production), duplicate PR rows, and mis-bucketed history. A code fix stops the bleeding; a **reconciliation is a separate, owed piece of work**. Never close a data-corruption item on the code fix alone.
- **Do not "fix" drift by making both sides wrong in the same way.** Bucketing the heatmap in UTC to match the server would have made it *consistent* and *still wrong* (the client did not train on Monday). Converge on the identity that is **semantically true for the user**, not merely the one that is easier to match.
- Changing an identity function is a **behavior change on a live surface**. Two of these fixes touched the money path; both were landed behind regression tests **proven to fail on the pre-fix code** before being trusted. Do that.

## Provenance & privacy

- `originating_model: claude-fable-5` (Fable 5). All three bugs were independently re-derived from source, fixed, and locked by Fable in the main loop; the unification into a single law is Fable-tier synthesis performed after the fact. `tier_gate: PASS`.
- Sanitizer: `scripts/scan-secrets.sh` PASS (0 hits). IDs/roles only — no client names, PII, medical data, secrets, keys, tokens, DB URLs, or absolute user paths.

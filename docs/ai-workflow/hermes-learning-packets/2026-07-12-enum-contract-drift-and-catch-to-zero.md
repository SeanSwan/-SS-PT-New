---
originating_model: claude-fable-5
tier_gate: PASS
date: 2026-07-12
topic: The catch-to-zero anti-pattern — how a phantom enum label made production admin revenue read $0 under a fully green test suite
surfaces: [orders-status-enum, admin-revenue-routes, analytics-revenue, stripe-analytics, session-billing-flag]
---

## What was decided/built (Fable-tier lesson)

A hostile-review round found that **every admin revenue KPI in production was reading $0 (or 500ing)** — and had been for a long time — while CI stayed green. The root cause is a two-part failure worth naming precisely, because both parts recur.

### Part 1 — Enum-contract drift: asking the data for an identity it never has

`orders.status` is a Postgres ENUM: `(pending, processing, completed, refunded, failed, pending_payment)`. Payment success writes `'completed'`. But six separate call sites filtered on `status = 'paid'` or `status IN ('completed','paid')`. **`'paid'` is not a label in that enum and is never written to that column.**

This is subtly worse than a normal wrong-value bug. In Postgres, comparing an enum column to a *non-member* string literal is not "matches nothing" — it is a **hard error** (`invalid input value for enum enum_orders_status: "paid"`) thrown at query time, *before any row is examined*. So the query doesn't return an empty set; it throws.

Why 'paid' looked plausible to whoever wrote it: `'paid'` **is** a real, valid value — just on *different* tables. `shopping_carts.paymentStatus` is a plain STRING where `'paid'` is written and correct. `print_orders.status` uses `'paid'`. Stripe's `session.payment_status === 'paid'` is correct. The word is right everywhere except the one enum column where it's fatal. **A value's validity is per-column, never global.** The same string is a correct filter on one table and a query-throwing bug on the next.

### Part 2 — Catch-to-zero: an error handler that laundered a crash into a plausible number

Every one of those throwing queries sat inside a `try/catch` that returned a **safe-looking default** — `{ totalRevenue: 0, mrr: 0 }`, or a `safeSum` that swallows and returns `0`. So the enum crash never surfaced as an error to anyone. It surfaced as **"$0 revenue this month"** on the admin dashboard — a number a human reads as *"no sales,"* not *"the query is broken."* One catch even logged "table may not exist," actively pointing the next debugger away from the real cause. (Where the catch instead re-threw — analyticsRevenueRoutes, adminFinanceRoutes — the panel 500'd, which is *better*: at least it's visibly broken.)

**Catch-to-zero is the most dangerous error handler in a metrics/money system.** A metric that throws gets noticed. A metric that silently reads zero gets *trusted* — it's a valid-looking value, it renders, no alert fires, and it quietly informs business decisions with a lie. The safe-default was written to make the dashboard "robust"; it made it confidently wrong.

### Why the test suite was green the whole time

The compliance route's test **mocks `sequelize.query`** and returns a hardcoded `totalRevenue: 5678`. The real SQL — the thing that was broken — never ran in CI. The test asserted the *shape* of the response, not that the query the code actually issues is executable against the real schema. So a green suite certified a route that could not work in production.

## Why (the rationale Hermes should carry forward)

- **A green suite is not evidence the query runs.** When the DB layer is mocked, tests prove the *code around* the query, never the query itself. Any SQL/enum/column-name correctness has to be proven against the real schema (a migration cross-check, a staging probe, or an integration test with a real DB) — never inferred from a passing mock-backed test. (This is the same lesson the revenue double-count taught from the other side: the corruption was invisible to unit tests because it lived between two layers.)
- **`$0` is a value, not an error, and that's the trap.** In money/metrics code, "the safe default on failure" and "a legitimate reading" are indistinguishable to the reader once they're the same number. A failure in a metric should be *visible as a failure* (null + an explicit "unavailable" state, or a thrown 500), not a plausible zero.
- **Enum membership is a schema fact, not a naming convention.** You cannot reason about which status strings are valid from the surrounding code's vocabulary; you must read the enum's definition (model + the CREATE/ALTER TYPE migrations). The same word is valid on one column and fatal on the next.

## Reusable pattern / rule Hermes should apply next time

When reviewing or writing any query that filters/aggregates on a status-like column:

1. **Read the enum's real labels** from the model AND the migration that created it (plus any `ALTER TYPE ... ADD VALUE`). Do not trust the string that's already in the code — that's the thing under suspicion.
2. **Grep the same literal across tables.** If `'paid'` (or any status word) appears on multiple models, confirm which columns are enums and which are free strings — the correct value is per-column. A sibling sweep here isn't optional; the bug travels as "the right word on the wrong table."
3. **Treat every `catch` in a metric/money path as suspect.** Ask: *if the query threw, what does the user see?* If the answer is a plausible number (0, or a stale default), that's catch-to-zero — the failure must instead be surfaced (null + "unavailable", or a re-throw). A comment like "table may not exist" on a catch is a smell that the author guessed at the failure mode instead of reading it.
4. **Distrust green tests that mock the DB layer.** For anything with non-trivial SQL, require the query to run against the real schema somewhere (staging probe / integration test). A mock that returns a hardcoded revenue proves nothing about whether the revenue query executes.

**Detection heuristic:** `rg "status.*'paid'|IN \('completed', 'paid'\)|= 'paid'"` then, for each hit, read the model of the table being queried. If it's an enum without `'paid'`, it throws in prod. Pair with: grep the file's `catch` blocks for `return { ...: 0 }` / `safeSum` / `|| 0` on the revenue path — that's what's hiding it.

## Risks / guardrails

- **Live at time of writing:** the fix is committed but unpushed, so prod admin revenue still reads $0 / 500s. And one fix (a raw correlated subquery in adminFinanceRoutes) is committed but **explicitly flagged for a staging probe** — raw SQL that can't be verified against a mocked query must not be trusted on a green CI alone (this is the very lesson above, applied to my own fix).
- **Do not "harden" a metric by widening its catch.** The instinct when a KPI errors is to wrap it and return a default so the page renders. That instinct created this bug. The correct move is to fix the query and let a genuine failure be loud.
- Fixing `status = 'paid'` -> `'completed'` is a behavior change on a money surface: verify each call site's intent (some wanted completed-only revenue; one wanted completed+in-flight and just had a phantom extra label). Don't blanket-replace without reading each.

## Provenance & privacy

- `originating_model: claude-fable-5` (Fable 5). The cluster was surfaced by a peer session's audit but the enum root cause was **independently re-verified from Order.mjs + migration 20250506000001** and every fix authored/adjudicated by Fable in the main loop; the catch-to-zero generalization is Fable-tier synthesis. `tier_gate: PASS`.
- Sanitizer: `scripts/scan-secrets.sh` PASS (0 hits). IDs/roles only — no client names, PII, secrets, keys, tokens, DB URLs, or absolute user paths.

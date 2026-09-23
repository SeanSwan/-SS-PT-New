---
decision: The Stripe webhook is redelivery-safe on both money rails, proven by executed tests rather than by code comments
status: shipped
supersedes: none
---

# Stripe webhook integrity

What protects a paying customer from being granted twice, or from being charged
and granted nothing. Written because the previous answer to "can this
double-grant?" was a code comment, and two test files named "idempotency truth"
turned out to `readFileSync` the handler and assert that a string appears in it.

Read this before changing anything under `backend/webhooks/stripeWebhook.mjs`,
`backend/services/SessionGrantService.mjs`, or the ACH rail.

## Where the events arrive

Two mounts, one router, one handler:

| path | why it exists | file |
|---|---|---|
| `/api/webhook/stripe` | what the Stripe dashboard is configured to POST | `backend/core/routes.mjs:779` |
| `/webhooks/stripe` | legacy path, kept so an old configuration cannot 404 | `backend/core/routes.mjs:777` |

Inside the router, both `POST /` and `POST /webhook` reach the same handler
(`stripeWebhook.mjs:824`, `:826`), so all four URL combinations behave
identically. A "legacy mount that silently acked" is a defect class this repo has
already been bitten by; keeping one handler is what prevents the rails drifting.

## The raw body is load-bearing

`express.raw({ type: 'application/json' })` at `stripeWebhook.mjs:821` runs before
the handler. Signature verification hashes the **exact bytes Stripe sent**, so any
JSON body-parser upstream of this route silently breaks every signature by
re-serialising the payload. If webhooks start failing verification wholesale after
a middleware change, this is the first thing to check.

Verification itself is `stripeClient.webhooks.constructEvent(req.body, signature,
webhookSecret)` at `stripeWebhook.mjs:153`. Everything before that line treats the
request as unauthenticated attacker-controlled input — which is why the
missing-secret branch logs the body's *byte length* and never its content.

## Idempotency: two rails, two different keys

This is the part most likely to be got wrong by someone changing one rail and
assuming the other is covered. **They do not share a key.**

| rail | idempotency key | where the decision is made | the write it guards |
|---|---|---|---|
| Cart / store checkout | `cart.sessionsGranted === true` | `SessionGrantService.mjs:206` | `user.increment('availableSessions')` |
| ACH bank payment | `order.paymentAppliedAt` is set | `stripeWebhook.mjs:666` | `allocateSessionsFromOrder(...)` |

On the cart rail the check deliberately runs **before** the ownership check. An
already-granted cart needs no further work no matter which session asks, so
answering "already done" is always safe; checking ownership first made a second
session for an already-fulfilled cart throw a 500, which made Stripe retry a cart
that had in fact been granted correctly.

Also deliberate: the cart rail does **not** use `status === 'completed'` as the
key. The webhook sets that status before `verify-session` runs, so it would report
"already done" for work that had not happened.

## What Stripe sees, and why it matters

The handler answers `200 {"received": true}` for every event it processes,
including a redelivery it recognised as already-done. It does **not** surface
`alreadyProcessed` in the HTTP response — that field exists on the service's
return value and in the logs, not on the wire.

This is intentional. Stripe retries on any non-2xx, and sustained failures get an
endpoint **disabled** — which would stop fulfilment for every customer, not just
the one whose event failed. So the classification rule is:

> Return a non-2xx **only** when a redelivery could plausibly succeed.

| condition | verdict | response | why |
|---|---|---|---|
| DB blip, lock timeout, transient fulfilment error | TRANSIENT | 500, rethrow | a retry can succeed and the grant is idempotent |
| Stock ran out between checkout and payment (`CheckoutInventoryError`, `stripeWebhook.mjs:376`) | TERMINAL | 200 + admin alert | no redelivery restocks the shelf |
| Paid session names a cart owned by a different session (`SESSION_DOES_NOT_OWN_CART`, `SessionGrantService.mjs:255`) | TERMINAL | 200 + alert | state can never change; retrying is pure harm |
| Adoption where the charged amount cannot be verified (`SessionGrantService.mjs:310`) | HOLD | 200 + alert | fails closed; a human decides |
| Cart missing, owner missing, unusable cart id | TERMINAL | 200 + alert | a retry cannot conjure a row |

Every terminal branch alerts. That is the actual protection: captured money that
was not fulfilled must never be silent, and a 200 with no alert is exactly how it
becomes silent.

## The verify-session race

Two paths can fulfil the same cart: this webhook, and `verify-session` on the
success page the browser is redirected to. They are **not** coordinated, and do
not need to be — whichever arrives second reads the idempotency key and returns
`alreadyProcessed`.

That is why the webhook can safely fulfil session packages that `verify-session`
would also handle. Before it did, a buyer who closed the tab, lost the redirect,
or crashed had paid and was never granted, because the browser was the only thing
that triggered fulfilment.

## Proof

`backend/tests/api/stripeWebhookRedelivery.test.mjs` — 8 executed tests. Both
rails deliver the *same* event twice through the real router and assert exactly
one write.

What is real in that test: the router, the handler, and `SessionGrantService`.
The idempotency decision is made by production code. Only the persistence beneath
it is faked, by a stateful object whose `.update()` mutates its own fields the way
a row would.

Mocking `grantSessionsForCart` itself would have been easier and worthless — the
test would assert that a mock returns what the mock was told to return.

**Controls, executed:**

| mutation | expected result | verified |
|---|---|---|
| `SessionGrantService.mjs:206` check disabled | cart grant-count tests fail | yes, 2 failed |
| `stripeWebhook.mjs:666` guard removed | ACH allocation test fails, cart tests unaffected | yes, exactly 1 failed |
| fixture cannot persist either key | both rails double-write | yes, asserted in-suite |

The last row runs on every CI pass rather than only when someone remembers to
mutate by hand.

## Known gap: no backend test can see the real Stripe SDK

`backend/tests/setup.mjs` mocks the `stripe` module globally for every backend
test, exposing only `checkout` and `webhooks`. Inside vitest a client has own keys
`[checkout, webhooks]` and no `getApiField`; under plain node it is a function.

So nothing in this suite verifies real SDK behaviour — signature verification
included. The redelivery tests above prove the **handler's** logic, not that
`constructEvent` rejects a forged signature. That remains covered only by Stripe's
own implementation. Worth closing if the payments surface grows.

## Open: dashboard API version

The Stripe dashboard renders webhook payloads at the **endpoint's** configured API
version, not the version of the client that created the object. That value gates
the Phase B version unification, because unifying clients while the endpoint
renders a different shape would change what this handler receives.

**Not yet recorded — Sean to supply from the Stripe dashboard:**

```
Webhook endpoint API version: <pending>
```

Until it is known, do not start Phase B. See
`OSS-EXECUTION-BLUEPRINT-V3-2026-09-02.md` §10.

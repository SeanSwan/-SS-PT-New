---
title: Repo-wide id-coercion sweep — no live bypass, and the requested grep was incomplete
decision: No second instance of the limiter bug exists. The guards are stronger than expected and
  Postgres is the real backstop. One hardening is recommended but NOT applied — it changes
  behaviour on 12+ live auth routes and is Sean's call.
status: shipped
supersedes: none
extends: AUTHZ-THREE-WAY-REVIEW-ADJUDICATION-2026-08-14.md
---

# Id-coercion sweep

**Date:** 2026-08-15 · **Agent:** Claude Opus 5, session `main-seae22129`
**Trigger:** handoff D §6.4 called loose id coercion "latent, not live." The three-way review
proved it is **not latent where a security control consumes it** — the prekey limiter bucketed on
a raw param while its handler used `parseInt`, and the limit was fully bypassable. This sweep asks
whether a second instance exists.

**Answer: no live bypass found.** Details, including why, below.

---

## 1. The requested grep is structurally incomplete — this matters more than the result

`grep "Number(req.params" / "parseInt(req.params"` finds **48** sites outside tests.

It misses **212** destructured reads of the form `const { userId } = req.params`.

Those are the *more* dangerous class, because a coerced read at least normalizes; a destructured
read carries the raw string onward untouched. `progressController` alone has four, sitting behind
a guard that authorized a `parseInt`-ed value. **Any future sweep of this kind must include
`const \{[^}]*\} = req\.params`** or it will report a clean result it did not earn.

This was my sixth broken-probe instance of the session and the only one caught by asking "what
shape of read would this pattern never match?" rather than by a positive control.

---

## 2. Why there is no live bypass — three independent reasons

**a. The strong guards use a strict parser that already exists.**
`verifyClientAccess.mjs:53` defines `parseStrictPositiveInteger`, whose test is `/^[1-9]\d*$/`.
That rejects leading zeros, `+`, decimals, scientific notation, hex and trailing junk — every
spelling that defeated the limiter. `assertAssignmentOrAdmin` uses it. **The repo already owns the
correct primitive.**

**b. The trainer/client guard explicitly defends the confused deputy.**
`authMiddleware.mjs:670-690` rejects any request where `params.clientId` and `body.clientId`
disagree, then pins `req.authorizedClientId` so handlers consume the authorized id rather than
re-reading the param. That is exactly the shape that would have prevented the limiter bug, written
before it.

**c. Postgres is the backstop for raw passthrough.**
Where a handler passes the raw string to `findByPk` on an integer PK, the database cast either
agrees with the guard's `parseInt` (`'0902'::integer` → 902) or errors outright
(`'9e2'::integer`, `'902.5'::integer`). It cannot silently address a different row. This is luck
that happens to hold, not a designed control — it would not hold for a string or UUID key column.

---

## 3. The one weak spot — structural risk, no proven exploit

`authorizeResourceAccess(paramName)` (`authMiddleware.mjs:768`) authorizes
`parseInt(req.params[paramName] || req.body[paramName], 10)` and **pins nothing**, so every
handler behind it re-reads the param independently. Its 12+ consumers are in `exerciseRoutes`,
`gamificationV1Routes`, `profileRoutes` and `workoutRoutes`.

If any handler behind it ever resolves with `Number()` instead of `parseInt`, the two disagree:
`Number('9e2')` is 900 while `parseInt('9e2',10)` is 9; `Number('0x10')` is 16 while
`parseInt('0x10',10)` is 0. That is an authorization bypass — authorize one user, act on another.

**I traced every consumer and found no such handler today.** `workoutController` reads raw and is
additionally covered by `assertAssignmentOrAdmin` (strict); `progressController` reads raw into
`findByPk` (Postgres backstop). So the risk is structural, not live.

**Recommended, NOT applied:** make `authorizeResourceAccess` use `parseStrictPositiveInteger` and
pin `req.authorizedUserId` the way `checkTrainerClientRelationship` pins its client id. **Not
shipped because it changes behaviour on 12+ live auth routes** — `'0902'` would go from
authorized-as-902 to a 400 — and that is Sean's call, not a reviewer's. It is cheap and low-risk
whenever he wants it.

---

## 4. What was checked

| Check | Result |
|---|---|
| `Number(`/`parseInt(` on `req.params`, non-test | 48 sites |
| Destructured `req.params` reads | **212 — invisible to the requested grep** |
| Files coercing the same param two ways | 2 (`bootcampRoutes`, `equipmentRoutes`) — different handlers, not intra-request. Not the bug shape. |
| `keyGenerator`s repo-wide | 9; only the prekey one ever read `req.params`, and it is fixed |
| Guards reading raw params | 3 in `authMiddleware`; all strict-compare, pin, or fail closed |
| Consumers of `authorizeResourceAccess` | 4 route files, 12+ routes, all traced — no `Number()` handler |

**No code changed by this sweep.** It is an evidence document.

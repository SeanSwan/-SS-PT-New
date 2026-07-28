# Admin-surface audit — the privilege gates held; the privacy layer had colliding identities

**When:** 2026-07-28 (UTC) · **Where:** VS-Claude terminal · **Linear:** SWA-75
**Shipped:** `ba9e7200e` on `origin/main`

## What held — verified, so it need not be re-audited

- **`adminOnly` does not trust the JWT.** `protect` does a fresh `User.findByPk` and takes `role` from the DB, and also checks `isActive`. Demotion and deactivation therefore take effect on the very next request — no stale-token window. (Same property as the trainer-assignment revocation proven earlier.)
- **Impersonation is well-built.** Owner-gated (stricter than `adminOnly`), targets restricted to client/trainer/user so an admin cannot impersonate another admin, 45-minute expiry, writes an `impersonation_start` audit row, and `protect` logs `impersonatedBy` on every request during the session. `req.user` becomes the TARGET, so the actor de-escalates rather than carrying admin rights around.
- **`viewAsWriteBlocker` is genuinely mounted** (`core/app.mjs:329`) and blocks all mutations on the `?viewAs=` read-only path. Note it keys on the QUERY PARAM only — JWT impersonation is a separate, deliberately full-access QA mechanism, not a gap.
- **Admin promotion** requires an existing admin PLUS a constant-time-compared `ADMIN_ACCESS_CODE`, fails closed at 503 when unconfigured, and is transactional.
- **Password reset** uses `crypto.randomBytes`, stores the token HASHED, enforces expiry inside the query, and nulls the token after use.
- **`middleware/auth.mjs` is a re-export alias layer** over `authMiddleware.mjs` (`authenticateToken = protect`, `authorizeAdmin = adminOnly`). The two auth modules cannot drift apart — worth knowing before anyone "fixes" a perceived duplicate.

## The defect

`maskRef` in `services/dashboardV2/refs.mjs` derived a **4-digit** code (`% 10000`). These refs are the Dashboards v2 privacy layer — they REPLACE the person's name — and `dashboardV2Service` uses trainer refs as CHART LABELS, where a collision merges two people into one series. `/api/dashboard` is live.

Measured against the real HMAC: 100 clients → 1 colliding ref, 250 → 3, 500 → 13. Now 0 at 500.

Both kinds widened to a 6-digit space, modulus drawn from 32 bits instead of 24. Safe because refs are computed at projection time and never persisted.

## Two lessons worth carrying

**1. A privacy layer needs a uniqueness test, not just a non-reversibility test.** `dashboardV2RefsPrivacy.test.mjs` proved the ref was deterministic and could not be reversed — both true, both necessary, neither sufficient. Nobody asked whether two people could get the same one. When masking replaces an identity, uniqueness IS a correctness property.

**2. "The roster is small" is not a defence at a 10,000-value space.** My first fix left trainers on the 4-digit space with exactly that reasoning. The uniqueness test produced a collision at FIFTY trainers. Birthday-bound intuition is badly wrong at small N — check it empirically instead of arguing about it.

## Method note

Enumerating admin-path routes and privileged actions produced 49 candidates and **every single one was a false positive**. The blind spots were: in-handler role checks (`if (!['admin','trainer'].includes(req.user?.role)) return 403`), anonymous `router.use((req,res,next) => {...})` gates, sub-routers inheriting guards from a parent, and line-offset drift that sliced neighbouring handlers. The real finding came from reading a file the sweep never flagged.

Enumeration is good at pointing; it is bad at concluding. Budget for opening every candidate by hand.

*IDs and roles only. No PII, credentials, or customer data.*

---
title: The router.use-cleared tier — 6 handlers executed, 20 of 21 properly scoped, 1 open question
decision: This tier is far better guarded than its clearance suggests — 20 of 21 do real per-client
  authorization one hop inside the controller. One (renewalAlertRoutes:54) is role-gated only; that
  is consistent across its whole feature and is a product question for Sean, not a bug I should fix.
  Two harness issues found, one of them a production-database safety gap.
status: shipped
supersedes: none
extends: AUTHZ-THREE-WAY-REVIEW-ADJUDICATION-2026-08-14.md
---

# The `router.use`-cleared tier

**Date:** 2026-08-15 · **Agent:** Claude Opus 5, session `main-seae22129`
**Suite:** `backend/tests/api/routerUseClearedAuthzExecution.test.mjs` (12 tests) · commit `8b6608e0d`
**List re-derived this session:** `node backend/scripts/audit-idor-surface.mjs --verbose | grep '\[router\.use'` → **21**, audit exit 0 measured unpiped.

---

## 1. What this tier's clearance is actually worth

`[router.use(authorize)]` proves a guard **runs**. It cannot prove what the guard **authorizes**.
Every one of these 21 routes is param-scoped (`/clients/:clientId/...`) while the router-level guard
is role-scoped, so a clearance of this class can only ever answer *"is the caller staff?"* — never
*"is the caller staff **for this client**?"*

The characteristic failure of the tier is **declaration order**: a route registered *above* its
`router.use` guard is completely unguarded while a file-level audit still clears it. **Checked
first, across all five files — every guard precedes every route definition. No route escapes.**

| File | Guard | Handlers |
|---|---|---|
| `adminClientRoutes.mjs` | `authorize(['admin'])` | 12 |
| `adminOnboardingRoutes.mjs` | `authorize(['admin','trainer'])` | 3 |
| `adminWorkoutLoggerRoutes.mjs` | `authorize(['admin','trainer'])` | 4 |
| `adminRoutes.mjs` | `authorizeAdmin` | 1 |
| `renewalAlertRoutes.mjs` | `requireStaff` (admin **or trainer**) | 1 |

**20 of 21 do their real authorization a hop further in**, via `ensureClientAccess`
(`utils/clientAccess.mjs`) — which the router-level clearance never looks at. Reading the router
alone calls them unguarded; reading the guard alone calls them safe. Only running them settles it.

`ensureClientAccess` is genuinely good: strict id parsing (`/^[1-9]\d*$/`), admin passthrough,
client self-only, trainer gated on an active assignment, and a **fail-closed** final deny.

---

## 2. Coverage — exactly what is and is not executed

**Executed crossings (6 handlers)** — an unassigned trainer attempting another coach's client:

| Handler | Verb | Result |
|---|---|---|
| `/clients/:clientId/workouts` | GET | 403 |
| `/clients/:clientId/workouts` | POST | 403 |
| `/clients/:clientId/workouts/:sessionId` | PATCH | 403 |
| `/clients/:clientId/workouts/:sessionId/logs/:logId` | DELETE | 403 — the destructive one |
| `/clients/:clientId/onboarding` | GET | 403 — health PII |
| `/clients/:clientId/onboarding` | DELETE | 403 |

Each paired with a control that must **not** be denied (assigned trainer on their own client, and
an admin crossing freely), so an all-403 suite cannot pass against a route broken shut.

**NOT executed (15)** — verified by reading only, and I am saying so rather than implying coverage:
- `POST /clients/:clientId/onboarding` (1) — same guard as its two tested siblings
  (`adminOnboardingController.mjs:35` calls `ensureClientAccess`).
- `adminClientRoutes` (12) — `authorize(['admin'])`, so no trainer crossing is reachable; the
  crossing this suite tests cannot exist there.
- `adminRoutes.mjs:35 PUT /users/:id` (1) — `authorizeAdmin`.
- `renewalAlertRoutes.mjs:54` (1) — see §3.

---

## 3. 🔶 Open question for Sean — `GET /api/renewal-alerts/user/:userId`

This is the **only one of the 21 where the router-level role gate is the entire authorization.**

`requireStaff` (defined inline, `renewalAlertRoutes.mjs:~44`) admits `admin` **or `trainer`**. Then:
`getAlertsForUser` destructures `req.params.userId` raw, calls `getUserAlerts(userId)`, and **never
consults `req.user`**. The service builds `whereClause = { userId }` with no actor filter. No
`ensureClientAccess`, unlike every sibling in this tier.

**Effect:** any trainer can read any user's renewal alerts — `sessionsRemaining`, `lastSessionDate`,
`daysSinceLastSession`, `urgencyScore`, `contactedBy`, and free-text `notes`.

**Why I did not "fix" it.** The *entire* renewal-alert feature behaves this way — `getAlerts` and
`getCriticalRenewalAlerts` are equally unscoped. Consistency across a whole feature reads as a
deliberate product decision (a staff-wide retention/sales queue), not an oversight. Tightening it
would change behaviour for every trainer on a live staff tool. **Sean's call.** If it is intended,
it deserves a comment saying so; if not, `ensureClientAccess` is already the house pattern.

**A prior session recorded this route GUARDED** (`SESSION-HANDOFF-AUTHZ-AND-CORPUS-2026-08-14.md:91`)
on the evidence that `router.use(protect)` and `router.use(requireStaff)` sit above the route
definitions. Both facts are true. Neither is per-resource authorization. That verdict answered a
narrower question than the one that matters, which is precisely the weakness of this tier.

---

## 4. 🔴 Harness gap — a test can reach the PRODUCTION database

`backend/tests/setup.mjs` sets `NODE_ENV=test` and several fake keys, but **never clears
`DATABASE_URL`**. `database.mjs` uses `DATABASE_URL` whenever present, and in this repo it points at
production (CLAUDE.md: "Local dev uses production DB"). Sequelize connects **lazily**, so the vast
majority of suites never notice.

Any test that reaches a real `sequelize.transaction()` or query without mocking will attempt a
**live connection to production**. The first run of this slice's suite did exactly that and produced
`SequelizeConnectionError: SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a string` —
it failed only because no password was set in that shell. On a shell where it is set, it connects.

**Recommended (not applied — it touches every suite):** have `tests/setup.mjs` delete
`process.env.DATABASE_URL` (and set a `sqlite::memory:` or unreachable default) so the harness is
fail-safe rather than fail-lucky. `sqlite3` is **not installed** and installing it would rewrite the
shared `node_modules` that a sibling session is using, so that part needs its own slice.

Interim mitigation in this suite: `database.mjs` is mocked with a real Sequelize built from options
(no credential-shaped URL) with `transaction`/`query`/`authenticate` stubbed. Verified 0 connection
attempts.

---

## 5. Minor — `editWorkout` opens a transaction before authorizing

`adminWorkoutLoggerController.mjs:283` runs `await sequelize.transaction()` as its first statement;
the `ensureClientAccess` check is at :286 and correctly rolls back on denial. Not a security hole —
the rollback is right — but an unauthorized request still costs a transaction round-trip. Worth
knowing if that endpoint is ever load-tested or abused.

---

## 6. Mutation results — the evidence the suite is not decorative

| Mutation | Caught | Tests red |
|---|---|---|
| `isTrainerAssigned` → always `true` | ✓ | 6 crossings; all 5 controls stayed green |
| `authorize` role check → `if (true)` | ✓ | 1 (client rejection) |
| strict parser `/^[1-9]\d*$/` → `/^\d+$/` | **✗ → ✓ after rewrite** | **0 → 1** |

The survivor was mine. The spelling test used an **unassigned** trainer, so it returned 403 whether
the parser was strict or loose and could never see the mutation. Rewritten to use the **assigned**
trainer on their **own** client, where strict refuses `'0901'` with a 400 and loose would resolve it
to 901 and **allow** the request — with a control proving the 400 is about the spelling.

**A fourth, accidental:** `sed` and `perl` each silently failed to apply a mutation, and the green
run that followed looked exactly like a surviving mutation. **A mutation you did not verify was
applied is not a mutation.** Every mutation above is confirmed by grepping the changed line before
running the suite.

---

## 7. Verification

12/12, stable across 3 consecutive runs · full `tests/api` **2702 collected / 2 failed** — the same
two pre-existing failures (`associationsModelRegistryParity`, `phase1bControllers`), this suite not
among them · `authMiddleware.mjs` and `clientAccess.mjs` restored byte-identical after every
mutation (`git status` clean) · secret scan CLEAN (it caught a fake `postgres://` literal in my own
first draft and again in a comment — both removed) · Rule 42 both checks empty · 0 database
connection attempts.

# Tencent Hy3 - Design Inspiration

**Reviewer:** `tencent/hy3` (medium)
**Document:** C:/tmp/review-packet.md
**Seed:** (none)
**Tokens:** 17190 in / 6140 out | **Cost:** ~$0.0055 | **Wall:** 40.5s | **finish_reason:** stop

---

# Hostile Absence Review — what is MISSING and will break unseen

Ranked by value left on the table. Every claim ties to a file/endpoint/table named in the packet.

---

## 1. (HIGHEST) The RenewalAlert "fix" switches on a dead automation with zero runtime proof and no alerting — blast radius is real users

**What is missing:** The packet proves the model now *parses* and *loads as a Model* (`modelName RenewalAlert, tableName renewal_alerts, belongsTo present`). It explicitly states: *"has NOT been exercised against a real database. No query has run. `/api/renewal-alerts` has not been called. The cron tick has not been run."*

**Specific failure waiting:** The cron tick (`backend/jobs`, referenced as "automation cron tick") has been swallowing its throw into a log for months. The fix removes the throw (model now registers) — so the cron will, for the first time, **execute its real body**. This is a churn-risk queue: it queries users by `sessionsRemaining`/`daysSinceLastSession` and (per SWA-138 S10 intent) contacts them. If the cron body's query, scoring, or outbound-notification call is wrong, you will mass-email or mass-flag real users on the next cron run. The fix did **not** add alerting to the cron — only registration. So a now-*live* cron that throws on real data will still vanish into the same unread log.

**Cheapest check before deploy:** Run the cron tick once in a dry-run against a staging DB with seeded data and assert it touches 0 or N expected rows and sends 0 messages; grep the cron file for `logger.error`/`console.error` inside the tick and require it call an alert path. Cost: one script, one staging boot.

---

## 2. (HIGH) `associations.mjs` never executed — the static parser is blind to the exact bug class it was written for

**What is missing:** `modelRegistryAudit.mjs` is purely textual. It parses `return { … }` in `associations.mjs` and collects identifiers. It never executes `setupAssociations()`.

**Specific failure waiting:** The returned object at line ~1496 now contains `RenewalAlert`. But the static parser matches *any* identifier shaped like a model name. If a future edit writes `RenewalAlert: Notification` (wrong variable bound to the key) or omits the `await import('./RenewalAlert.mjs')` while keeping the key, `getModel('RenewalAlert')` still throws at runtime — and the static test passes, because the *name* is present in the text. The parser explicitly notes it reads "to end-of-file" risk; the inverse (wrong value bound) is uncaught. The packet's own doctrine: *"An empty registry would make every drift assertion vacuously true"* — but a **wrongly-populated** registry passes silently.

**Cheapest check:** Boot Sequelize against SQLite (or a throwaway staging replica), call `getModel()` for every name `readRegisteredModels()` returns, and assert each returns a non-null model whose `tableName` matches expectation. One `vitest` that imports `associations.mjs` with a mock `database.mjs`.

---

## 3. (HIGH) 39 newly-added crawl routes were never visited — first prod crawl will report 39 crashes or 500s

**What is missing:** The drift gate proves the *strings* exist in `UniversalDashboardLayout.routes.tsx` and are now in `roleRoutes`. It does **not** prove the page mounts or its API calls succeed. The packet states: *"NONE of the 39 newly-added crawl routes has ever been visited."*

**Specific failure waiting:** Routes like `/dashboard/trainer/earnings` (commission ledger), `/dashboard/admin/trainer-payouts`, `session-allocation`, `client-trainer-assignments`, `trainer-permissions`, owner support inbox. Each renders a component that calls a backend endpoint. If any of those endpoints is missing, mis-guarded, or throws (same class as RenewalAlert's 500), the first production crawl emits 39 route-failures — or, worse, the crawl now *reaches* them and the read-only guard blocks a POST the page makes, inventing findings. The drift gate cannot see this; it checks route *existence*, not *render success*.

**Cheapest check:** Run the crawl once against a preview/staging deploy with seeded auth states (the packet admits no auth states exist this session). Even a single role's 39 routes, headless, against staging, catches render/console errors before prod.

---

## 4. (MEDIUM-HIGH) No migration↔model gate — a model with no table is the quiet twin of RenewalAlert

**What is missing:** The model-registry tripwire checks files ↔ `associations.mjs` ↔ `getModel` call sites. It does **not** check that a migration file exists that creates the table, nor that the table columns match the model's `init()` definition.

**Specific failure waiting:** `RenewalAlert` "had a migration" per the packet — but it was never run against a DB (item 1). If `renewal_alerts` lacks the `contactedBy` column (the model defines `references: { model: 'Users', key: 'id' }` on `contactedBy`), the `belongsTo(User, { foreignKey: 'contactedBy', as: 'contactedByUser' })` association will throw on first include — exactly the "User is not associated" death, now via schema mismatch instead of registry miss. The 21 `dormantModels.mjs` entries (e.g. `AcquisitionEvent`, `ProgressReport`) have unknown migration status; if any is later wired, a missing table 500s in prod.

**Cheapest check:** A script that lists `models/*.mjs` (excluding dormant/direct-acknowledged) and asserts a matching `migrations/*Create<Model>.mjs` exists and that `DESCRIBE <tableName>` on staging returns the columns the model declares.

---

## 5. (MEDIUM) 15 smoke specs typechecked-not-executed — a suppressor regression is invisible

**What is missing:** The 15 specs had their suppression predicate swapped to `isSuppressedProductNoise`. They were `tsc`'d, not run. `inDateSuppressionMatcher` (from `qaSuppressions.audit`, not shown but imported) could match too broadly.

**Specific failure waiting:** If `isSuppressedProductNoise` returns `true` for an empty string or a real error message containing a substring of a suppression pattern, all 15 specs will **silently suppress real console errors** — the exact "gate people learn to ignore" failure the beacon registry was built to prevent. Because the specs never ran, this ships green.

**Cheapest check:** One unit test: `expect(isSuppressedProductNoise('Uncaught TypeError: cannot read property of undefined')).toBe(false)` and `expect(isSuppressedProductNoise('preloaded using link preload', '2026-11-11')).toBe(false)` (post-expiry must bite). Runs in ms, no browser.

---

## 6. (MEDIUM) Equivalent un-gated enumerations — same two-sources-of-truth defect, still open

The work gated beacons, suppressions, dashboard routes, user tabs, models. Still un-gated, same failure shape:

- **Mounted routes vs controllers** (`core/routes.mjs` mounts `/api/renewal-alerts`): no gate asserts the controller method referenced actually exists and is exported. A mounted path with a missing handler 500s — the backend twin of route-drift.
- **Cron jobs vs error alerting** (`backend/jobs`): only RenewalAlert's swallow was found by accident. No gate asserts any job's `try/catch` routes to an alert, not just `logger.error`. Every other cron can fail silently for months.
- **Socket events**: no gate that server-emitted `socket.emit(...)` events match client `socket.on(...)` listeners — realtime route-drift, same class.
- **Env vars vs usage**: `SWAN_DASHBOARD_CRAWL_TEST_TIMEOUT_MS` etc. are read with `|| default`; a misspelled var fails silently to default. No boot-time assertion that required vars are present.

---

## 7. (META) Evidence the RenewalAlert class of bug happened elsewhere here

- `missionQaAutomation.test.mjs` was **RED since `d528fd25f`** — a guard test failing for months, unnoticed because the normal command didn't collect it. Same silence pattern.
- **21 backend `node:test` files are never collected by vitest** (stated, "another agent's lane") — meaning any of them could be red or asserting on deleted internals, exactly as the re-anchored test was.
- `dormantModels.mjs` lists 21 models as "no caller anywhere" — but the drift test only checks they aren't *called via `getModel`*; it does **not** verify they have no migration, no seeder reference, no mounted route. A model can be "dormant" and still partially wired (migration + route, no service) — a half-corpse.

**ONE script to enumerate every "fully built but cannot run" instance:**
`auditWiring.mjs` — build a graph: `core/routes.mjs` mounted paths → controller file/method → service imports → `getModel('X')` → `associations.mjs` registration → `migrations/` table → `backend/jobs` cron references. Report any node with a dangling edge: mounted route with no method, method with no model, model with no migration, cron referencing model with no alert. This catches RenewalAlert's twins in one pass.

---

## 8. (THE UNASKED QUESTION)

**"Should a previously-dead automation be switched on in the same change that fixes its registration — or behind a flag?"**

The author fixed the wiring and moved on. They never asked what the feature *does* now that it can run. The cron will fire on the next schedule, query real users, and likely notify them. A churn-risk email blast to every low-session user, or a 500 loop now that the throw is gone, is a production incident caused by *completing* the work, not by leaving it broken. The highest-value change to this work: gate the cron behind `UserFeatureFlag` or a `RENEWAL_ALERTS_ENABLED` env var for one cycle, with alerting, before turning it on.

---

### Verification pointers for the reviewer
- Real: `missionQaAutomation.test.mjs` RED since `d528fd25f` (packet states). Real: 21 `node:test` uncollected (packet states). Real: associations never executed (packet states). Real: cron swallowed throw (packet states). Real: `core/routes.mjs` mounts `/api/renewal-alerts` (packet states).
- Asserted-but-unproven by me: whether `renewal_alerts` migration has `contactedBy` column (packet says migration exists but never describes it — verify against `migrations/`). Whether other crons swallow (verify by grepping `backend/jobs` for `catch`+`console`/`logger` without alert). Whether `inDateSuppressionMatcher` over-matches (verify by reading `qaSuppressions.audit.ts`, not in packet).

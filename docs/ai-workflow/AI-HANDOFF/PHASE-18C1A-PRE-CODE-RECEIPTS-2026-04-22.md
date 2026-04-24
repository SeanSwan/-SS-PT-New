# Phase 18.C.1A — Three Pre-Code Audit Receipts

**Date:** 2026-04-22
**Author:** Claude Opus 4.7 (1M)
**Produced per:** `PHASE-18C1-PLANNING-BACKEND-VIEWAS-READ-OVERRIDE-2026-04-22.md` §10.3 — three audit receipts are a hard pre-code gate before any `.mjs` file is written for 18.C.1A.
**Status:** Draft for Codex review. Gate #2 of 3 in the split implementation plan (Gate #1 = planning-doc APPROVE, achieved Round 7 after 7 REVISE cycles; Gate #2 = these receipts; Gate #3 = impl diff).
**Scope-of-claim lock (rule 28):** This is a DISCOVERY document. No code written. No files staged. The receipts surface a handful of small amendments to the planning doc (noted inline + summarized in §5) that adjust the planning-spec to match the live codebase — zero substantive spec changes.

---

## 1. Receipt — Middleware Mount Point

### 1.1 Evidence

| Layer | File:Line | What it shows |
|-------|-----------|---------------|
| App-level routes entry | [backend/core/app.mjs:15](backend/core/app.mjs#L15) | `import { setupRoutes } from './routes.mjs';` |
| App-level routes call | [backend/core/app.mjs:302](backend/core/app.mjs#L302) | `await setupRoutes(app);` — ROUTES mounted here |
| Gamification V1 import | [backend/core/routes.mjs:90](backend/core/routes.mjs#L90) | `import gamificationV1Routes from '../routes/gamificationV1Routes.mjs';` |
| Gamification V1 mount (primary) | [backend/core/routes.mjs:367](backend/core/routes.mjs#L367) | `app.use('/api/v1/gamification', gamificationV1Routes);` |
| Gamification V1 mount (legacy alias) | [backend/core/routes.mjs:369](backend/core/routes.mjs#L369) | `app.use('/api/gamification', gamificationV1Routes);` |
| Auth middleware file | [backend/middleware/authMiddleware.mjs:272](backend/middleware/authMiddleware.mjs#L272) | `export const protect = async (req, res, next) => { ... }` — JWT verifier, sets `req.user`. |
| Route-level auth idiom | [backend/routes/gamificationV1Routes.mjs:19](backend/routes/gamificationV1Routes.mjs#L19) | `import { protect, adminOnly, trainerOnly, trainerOrAdminOnly, authorizeResourceAccess, requireAnyRole } from '../middleware/authMiddleware.mjs';` |
| Route-level auth alias in gamification | [backend/routes/gamificationV1Routes.mjs:28](backend/routes/gamificationV1Routes.mjs#L28) | `const authenticate = protect;` — aliased locally in this file |
| Representative protected route chain | [backend/routes/gamificationV1Routes.mjs:488](backend/routes/gamificationV1Routes.mjs#L488) | `router.get('/profile', authenticate, requireUser, (req, res) => { ... });` |

### 1.2 Finding

**`protect` is applied PER-ROUTE as middleware, not app-globally.** `req.user` is not set at the app level — it's set inside each protected route's middleware chain by `protect`. This means an `app.use(viewAsGuard)` global mount cannot inspect `req.user` reliably because public routes (those without `protect`) never populate it.

### 1.3 Proposed Mount Pattern (amends planning §6.6)

Per-route insertion, immediately after `authenticate`/`protect` and before the role-check / handler:

```js
// Before (existing):
router.get('/profile', authenticate, requireUser, (req, res) => { ... });

// After (adds viewAsGuard):
router.get('/profile', authenticate, viewAsGuard, requireUser, (req, res) => { ... });
```

This is the idiom already used by every protected route in the codebase (auth first, then role gate, then handler). viewAsGuard slots into the same pattern as just another middleware.

### 1.4 Planning-doc amendment for §6.6

Replace the "single `app.use(...)` mount after `jwtAuth`" narrative with:

> The viewAsGuard middleware is inserted per-route in the middleware chain, immediately after `authenticate`/`protect` and before the role-check / handler. `app.use()` global mount is NOT viable in this codebase because `protect` is per-route — `req.user` is not populated at the app level.

No behavioral change to the guard itself; only the insertion mechanism. The §4.1 diagram ("Middleware order") still holds semantically: `protect → viewAsGuard → controller`.

### 1.5 Downstream role-gate compatibility — proof `requireUser` allows admin

Codex Round-8 HIGH #2 raised: does `requireUser` permit an admin actor to pass after `viewAsGuard` succeeds? Evidence from the code:

| File:Line | Code |
|-----------|------|
| [backend/routes/gamificationV1Routes.mjs:31](backend/routes/gamificationV1Routes.mjs#L31) | `const requireUser = requireAnyRole('client', 'trainer', 'admin');` |
| [backend/middleware/authMiddleware.mjs:541-547](backend/middleware/authMiddleware.mjs#L541-L547) | `export const requireAnyRole = (...roles) => (req, res, next) => { if (!req.user) return 401; if (roles.includes(req.user.role)) return next(); return 403; };` |

`requireUser` is a partial application of `requireAnyRole` with `admin` explicitly in the allowed-roles list. An admin actor reaching `requireUser` with valid JWT passes the check and continues to the handler. The middleware chain `authenticate, viewAsGuard, requireUser, <handler>` therefore correctly allows:

- Admin + `?viewAs=<client_id>` → `authenticate` OK → `viewAsGuard` sets `req.viewAsUserId` → `requireUser` checks admin role OK → handler calls `getEffectiveReadUserId(req)` → returns target client.
- Client/trainer without `?viewAs=` → `authenticate` OK → `viewAsGuard` no-op → `requireUser` OK → handler uses `req.user.id` (unchanged behavior).
- Non-admin with `?viewAs=` → `authenticate` OK → `viewAsGuard` 403 → chain short-circuits.

No change to `requireUser` or `requireAnyRole` needed. No need for a distinct admin-viewAs role gate.

### 1.6 Legacy-alias mount coverage (Codex Round-8 HIGH #1)

`gamificationV1Routes` is mounted at BOTH paths in [backend/core/routes.mjs](backend/core/routes.mjs):
- Line 367: `app.use('/api/v1/gamification', gamificationV1Routes);` (canonical)
- Line 369: `app.use('/api/gamification', gamificationV1Routes);` (legacy alias)

Because the router is SHARED between both mounts, per-route middleware inserted inside the router (including `viewAsGuard`) runs for BOTH URL surfaces. This means `?viewAs=` will be honored at:

- `GET /api/v1/gamification/profile?viewAs=X` (canonical — primary target)
- `GET /api/v1/gamification/dashboard?viewAs=X` (canonical — primary target)
- `GET /api/gamification/profile?viewAs=X` (legacy alias — inherits)
- `GET /api/gamification/dashboard?viewAs=X` (legacy alias — inherits)

**Decision:** include both the canonical and legacy alias paths in `viewAsSupportedEndpoints.mjs`. This keeps the manifest accurate and lets frontend callers (Phase 18.C.2) pick either path and get the expected behavior. No new logic needed in the guard to distinguish the mounts. Manifest entries for E1/E2 grow from 2 to 4.

Alternative considered + rejected: gating the guard to reject `?viewAs=` on legacy `/api/gamification/*` paths. This would require `req.baseUrl` inspection inside the guard, adding path-specific logic to a guard that's meant to be route-agnostic. Rejected — the SHARED-router reality means the simpler and more honest answer is "both mounts support viewAs."

### 1.7 API-test coverage for both mounts

The E1/E2 API test file (`backend/tests/api/gamificationViewAs.test.mjs` per planning §10.1) MUST cover both URL surfaces:

| Test case (per endpoint) | URLs |
|--------------------------|------|
| Admin GET with valid viewAs returns target's data | `GET /api/v1/gamification/profile?viewAs=X` AND `GET /api/gamification/profile?viewAs=X` |
| Admin GET without viewAs returns admin's data | both |
| Client GET with viewAs returns 403 | both |
| Admin POST with viewAs to any endpoint returns 403 | see §1.8 write-blocker global test |

This doubles the E1/E2 API test count but stays narrow (still scoped to gamification profile + dashboard paths).

### 1.8 Write-blocking policy — two-layer guard design (Codex Round-9 HIGH)

**Finding:** Per-route mount (§1.3) correctly handles the per-endpoint opt-in for READ swapping, but it does NOT preserve planning §5's "writes blocked under viewAs" global guarantee. If `viewAsGuard` runs only on converted routes, then:

- `POST /api/anywhere-unconverted?viewAs=123` → guard doesn't run → write proceeds. The write happens as `req.user.id` (admin), not as the viewAs target — so no impersonation-write happens at the DATA layer. But planning §5's contract said the backend should return 403 IMPERSONATION_READ_ONLY for any mutation with `?viewAs=` — and the per-route scope no longer honors that contract.

**Resolution (amends planning §5): two-layer guard.** The middleware file `backend/middleware/viewAsGuard.mjs` exports TWO functions with distinct mount strategies:

| Layer | Export | Mount pattern | Responsibility |
|-------|--------|----------------|----------------|
| **L1 — global write-blocker** | `viewAsWriteBlocker` | `app.use(viewAsWriteBlocker)` at the app level, early in the chain (after CORS, before routes) | Rejects ANY request where `req.method ∈ {POST, PUT, PATCH, DELETE}` AND `req.query.viewAs` is present — returns **403 IMPERSONATION_READ_ONLY** unconditionally, without needing `req.user`. Uses the §4.2.1 strict-parsing to detect that the param is present (but doesn't validate its numeric shape — any non-undefined `viewAs` on a mutation verb triggers the block). |
| **L2 — per-route read guard** | `viewAsGuard` | Per-route middleware inserted after `authenticate` in converted GET/HEAD routes only (§1.3, §1.6) | Full parsing + admin gate + target validation + sets `req.viewAsUserId`. Runs only for converted read endpoints that have opted in. Mutation verbs with viewAs never reach L2 because L1 blocks them upstream. |

**Why this works:**
- L1 doesn't need `req.user` — it just checks method + param presence, which are set before `protect` runs. Safe to mount globally early.
- L1 enforces the "writes blocked under viewAs" global contract that planning §5 promised, regardless of which read routes have opted in.
- L2 stays scoped to converted routes, preserving the per-endpoint opt-in discipline from §6.2 "do not monkey-patch controllers."
- No interaction between the two — mutation verbs can never reach L2 because L1 short-circuits them. Read verbs skip L1 (it only fires on mutation verbs) and hit L2 per-route.

**Alternative considered + rejected:** narrowing the planning-§5 guarantee to "only opted-in routes block writes, frontend must avoid sending viewAs to unsupported paths." Rejected because: (a) it shifts the security boundary to the frontend, which is less defensible than a backend guarantee; (b) a frontend bug or a manually-crafted curl could still execute a write with `?viewAs=` on an unconverted endpoint, and planning §5 was explicit that this class of request must 403. The global L1 mount restores the contract without shifting trust.

**Mount-point receipt for L1 (app-level):** needs to be located at `backend/core/app.mjs` or `backend/core/routes.mjs` BEFORE `setupRoutes(app)` is called (before line 302 in app.mjs). CORS handling happens earlier (line 76+); L1 can mount right after CORS headers are applied and before the main routes block. Exact line TBD during implementation — insert as close to `setupRoutes(app)` as reasonable, in front of it.

**Mount-point receipt for L2 (per-route):** unchanged from §1.3 — inserted in `backend/routes/gamificationV1Routes.mjs` after `authenticate` on E1 (line 488) and E2 (line 509) only.

**Test implications:**

| Test case | Layer tested | Location |
|-----------|--------------|----------|
| Admin POST with viewAs to converted route → 403 IMPERSONATION_READ_ONLY | L1 (short-circuits before L2) | `gamificationViewAs.test.mjs` (E1/E2-scoped) OR new global test file |
| Admin POST with viewAs to **un**converted route → 403 IMPERSONATION_READ_ONLY | L1 global contract | **NEW:** `backend/tests/unit/viewAsWriteBlocker.test.mjs` OR expanded `viewAsGuard.test.mjs` covering both exports |
| Admin GET with valid viewAs on converted route → 200 + target data | L2 | `gamificationViewAs.test.mjs` |
| Admin GET with viewAs on unconverted route → param silently ignored, admin data returned (L2 not mounted there) | L2 opt-in semantics | can be asserted against a representative unconverted endpoint (optional — low priority) |
| Non-admin any-verb with viewAs → 403 | L1 rejects mutation verbs first; L2 rejects GET with non-admin role | both paths via L1 + L2 test cases |

**Planning-doc amendment for §5 Request Policy:** add a subsection "two-layer enforcement model" that distinguishes L1 global write-blocker from L2 per-route read guard, per the mapping in §1.8 above. The contract "writes blocked under viewAs" stays; its enforcement mechanism is documented as L1.

## 2. Receipt — User Model State Fields

### 2.1 Evidence

| Field | File:Line | Shape | Semantics |
|-------|-----------|-------|-----------|
| `isActive` | [backend/models/User.mjs:234](backend/models/User.mjs#L234) | `BOOLEAN, not null, default true` | "Whether the user account is active." Set `false` to disable. |
| `accountStatus` | [backend/models/User.mjs:346](backend/models/User.mjs#L346) | `ENUM('stub', 'invited', 'active'), default 'active'` | Crystalline Link Protocol. `stub` = admin-created no-login, `invited` = claim-token sent, `active` = can log in. |
| `deletedAt` (auto) | [backend/models/User.mjs:476](backend/models/User.mjs#L476) | `paranoid: true` on model config | Sequelize soft-delete. Default find queries exclude rows where `deletedAt IS NOT NULL` unless `paranoid: false` is passed explicitly. |
| `lastActive` | [backend/models/User.mjs:458](backend/models/User.mjs#L458) | `DATE` | Not a state gate — activity-tracking timestamp only. |

### 2.2 Fields planning §4.2.3 ASSUMED that DO NOT EXIST

- **`isDeleted`** — does not exist. Soft-delete is `deletedAt IS NOT NULL` via Sequelize paranoid mode (handled automatically by default find scope).
- **`isSuspended`** — does not exist. There is **no suspended-state field** anywhere on the User model. Attempts to check it at runtime would be no-ops.
- **No `banned` field either** (grepped case-insensitively for completeness).

### 2.3 Planning-doc amendment for §4.2.3

Replace the `isActive` / `isDeleted` / `isSuspended` trio with the real check set:

- **`target.isActive !== false`** — reject if disabled. **Evidence:** field exists at [User.mjs:234](backend/models/User.mjs#L234) as `BOOLEAN not null default true`. Clear semantics: "Whether the user account is active". Hard gate.
- **`target.deletedAt IS NULL`** — handled by Sequelize paranoid default-scope automatically. **Evidence:** [User.mjs:476](backend/models/User.mjs#L476) `paranoid: true`. If `User.findOne({ where: { id: targetId } })` returns a row, it is not soft-deleted. Hard gate, automatic.
- **`target.accountStatus === 'active'`** — **PRODUCT-DECISION GATE, NOT PURELY TECHNICAL.** The field exists at [User.mjs:346](backend/models/User.mjs#L346) as `ENUM('stub', 'invited', 'active')`. The inline comment describes the semantics: *"stub=admin-created no login, invited=claim token sent, active=can login"*. This proves stub/invited users **cannot log in** — they are part of the Crystalline Link Protocol for admin-created placeholder accounts. BUT: the choice to REJECT admin impersonation of stub/invited targets is a product/security decision, not a pure technical constraint. Codex Round-8 MEDIUM correctly flagged that the "no real data to impersonate" assertion is a rationale rather than hard evidence. **Sean decision needed before locking:** should admin-viewAs reject stub/invited targets (safer default, less confusion), or allow them (admin could use impersonation as a QA tool to see what stub/invited users would see)?

Document the non-existence of `isSuspended` and `isDeleted` explicitly so future readers don't re-add them speculatively.

### 2.4 Proposed query shape (for implementation, not committed now)

```js
// Sequelize paranoid default scope already excludes soft-deleted rows.
const target = await User.findOne({ where: { id: targetId } });
if (!target) return 404_NOT_FOUND;                     // missing OR soft-deleted → not found
if (target.isActive === false) return 404_NOT_FOUND;   // disabled → treat as not-found (no info leak)
if (target.accountStatus !== 'active') return 404_NOT_FOUND;  // stub/invited → not real, treat as not-found
if (!['client', 'user'].includes(target.role)) return 400_TARGET_INVALID_ROLE;
// All checks passed — safe to set req.viewAsUserId = target.id
```

## 3. Receipt — E1/E2 Controller Audit

### 3.1 E1 — `GET /api/v1/gamification/profile`

**Handler location:** [backend/routes/gamificationV1Routes.mjs:488-491](backend/routes/gamificationV1Routes.mjs#L488-L491)

```js
router.get('/profile', authenticate, requireUser, (req, res) => {
  req.params.userId = req.user.id;                              // ← IDENTITY-SCOPE read
  return gamificationController.getUserProfile(req, res);
});
```

**`req.user.id` reads in this handler — complete enumeration:**

| Line | Code | Classification | Action in 18.C.1A |
|------|------|----------------|--------------------|
| 489 | `req.params.userId = req.user.id` | **IDENTITY-SCOPE** — controls which user's data is fetched | **SWAP** to `getEffectiveReadUserId(req)` |

**Downstream audit — line-level evidence (Codex Round-8 MEDIUM):**

- [backend/controllers/gamificationController.mjs:595](backend/controllers/gamificationController.mjs#L595) — function defined: `getUserProfile: async (req, res) => {`
- [backend/controllers/gamificationController.mjs:597](backend/controllers/gamificationController.mjs#L597) — FIRST LINE of function body: `const { userId } = req.params;`
- [backend/controllers/gamificationController.mjs:600](backend/controllers/gamificationController.mjs#L600) — data fetch: `const user = await User.findByPk(userId, { ... })` using the destructured `userId` (which came from `req.params.userId`)

The controller reads `req.params.userId` ONLY; no `req.user.id` in the data-fetching path. Since E1's route handler at `gamificationV1Routes.mjs:489` assigns `req.params.userId = req.user.id` (pre-fix) or `req.params.userId = getEffectiveReadUserId(req)` (post-fix), the target client id propagates cleanly. `req.user.id` is preserved throughout for actor/audit purposes.

Grep cross-check: lines 2188, 2592, 2680, 2836, 2902, 2930, 2961, 2999, 3044, 3087, 3109, 3158, 3190 all have additional `req.user.id` or `req.params.userId` references in OTHER controller functions (not `getUserProfile`). Those are OUT OF SCOPE for 18.C.1A — they belong to other endpoints (challenges, streak-freeze, comeback-challenge, companion-pet, etc.) which are part of later batches (18.C.1B–1E) and get their own receipts when scheduled.

**Middleware chain delta:**

```
Before: authenticate, requireUser, <handler>
After:  authenticate, viewAsGuard, requireUser, <handler>
```

### 3.2 E2 — `GET /api/v1/gamification/dashboard`

**Handler location:** [backend/routes/gamificationV1Routes.mjs:509-517](backend/routes/gamificationV1Routes.mjs#L509-L517)

```js
router.get('/dashboard', authenticate, requireUser, async (req, res) => {
  try {
    const dashboard = await getDashboardData(req.user.id);      // ← IDENTITY-SCOPE read
    return res.status(200).json({ success: true, dashboard });
  } catch (error) {
    logger.error('[Gamification] Dashboard error:', { error: error.message });
    return res.status(500).json({ success: false, message: 'Failed to fetch dashboard data' });
  }
});
```

**`req.user.id` reads in this handler — complete enumeration:**

| Line | Code | Classification | Action in 18.C.1A |
|------|------|----------------|--------------------|
| 511 | `await getDashboardData(req.user.id)` | **IDENTITY-SCOPE** — passed to service as the target user whose dashboard to fetch | **SWAP** to `getEffectiveReadUserId(req)` |

**Downstream audit — line-level evidence (Codex Round-8 MEDIUM):**

- [backend/services/gamificationDashboardService.mjs:18](backend/services/gamificationDashboardService.mjs#L18) — signature: `export async function getDashboardData(userId) {` — explicit `userId` parameter, not a `req` object.
- [backend/services/gamificationDashboardService.mjs:25](backend/services/gamificationDashboardService.mjs#L25) — first data fetch: `const user = await User.findByPk(userId, { ... })` using the explicit param.
- [backend/services/gamificationDashboardService.mjs:32](backend/services/gamificationDashboardService.mjs#L32) — `where: { userId }` (subsequent query)
- [backend/services/gamificationDashboardService.mjs:38](backend/services/gamificationDashboardService.mjs#L38), [:45](backend/services/gamificationDashboardService.mjs#L45), [:75](backend/services/gamificationDashboardService.mjs#L75), [:85](backend/services/gamificationDashboardService.mjs#L85) — additional `{ userId }` query clauses, all referencing the function parameter.

The service **never accesses `req` directly**; it only knows the `userId` passed to it. Grep confirms zero `req.user` or `req.user.id` references in the service file. Whatever id the handler at `gamificationV1Routes.mjs:511` passes is what the service uses throughout. Swap at the handler level propagates cleanly.

**Audit-scope reads:** only the `logger.error` call at `gamificationV1Routes.mjs:514`, which takes `{ error: error.message }` — does not reference `req.user.id` in the current code. No change needed. Note: if a future maintenance pass adds actor-context to this logger, it should use `req.user.id` (NOT `getEffectiveReadUserId(req)`) to preserve audit trail pointing at the admin who made the request.

**Middleware chain delta:**

```
Before: authenticate, requireUser, <handler>
After:  authenticate, viewAsGuard, requireUser, <handler>
```

### 3.3 Summary — E1 + E2 touch points

| File | Line | Current | Post-18.C.1A | Why |
|------|------|---------|--------------|-----|
| `backend/routes/gamificationV1Routes.mjs` | 488 | `router.get('/profile', authenticate, requireUser, ...)` | `router.get('/profile', authenticate, viewAsGuard, requireUser, ...)` | Mount guard per-route per §1.3 |
| `backend/routes/gamificationV1Routes.mjs` | 489 | `req.params.userId = req.user.id;` | `req.params.userId = getEffectiveReadUserId(req);` | Swap identity read |
| `backend/routes/gamificationV1Routes.mjs` | 509 | `router.get('/dashboard', authenticate, requireUser, ...)` | `router.get('/dashboard', authenticate, viewAsGuard, requireUser, ...)` | Mount guard per-route |
| `backend/routes/gamificationV1Routes.mjs` | 511 | `await getDashboardData(req.user.id);` | `await getDashboardData(getEffectiveReadUserId(req));` | Swap identity read |

**Total E1+E2 change scope: 4 line edits in 1 existing file** (+ new middleware + helper + manifest + tests per planning §10.1).

**Files NOT modified by E1+E2 conversions:**

- `backend/controllers/gamificationController.mjs` — `getUserProfile` is already keyed off `req.params.userId`; swap propagates automatically via the route-handler's param rewrite.
- `backend/services/gamificationDashboardService.mjs` — `getDashboardData(userId)` already takes an explicit userId arg; swap propagates automatically.
- `backend/core/routes.mjs` — mount points at :367 and :369 stay unchanged. No route-tree rewiring.
- `backend/core/app.mjs` — app-level middleware chain unchanged.

## 4. Planning-doc amendments flowing from these receipts

These amendments correct the planning spec to match the live codebase. None change behavior; all three are spec-clarifications:

1. **§6.6 Middleware Mount Point** — narrative revised from "single `app.use()` mount after `jwtAuth`" to "per-route insertion after `authenticate`/`protect`". Receipt §1.3-1.4 above carries the replacement wording.
2. **§4.2.3 Target identity checks** — `isActive`/`isDeleted`/`isSuspended` trio replaced with real-field set: `isActive`, `accountStatus === 'active'`, and paranoid-default `deletedAt` handling. Document `isSuspended` non-existence. Receipt §2.3-2.4 carries the replacement.
3. **§10.2 Modified files list** — add `backend/routes/gamificationV1Routes.mjs` (the route-file, not the controller, is where the swap lives because the param rewrite is in the inline route handler). The planning doc assumed controller-level swaps; reality puts both identity reads in the route file for E1 and E2.

4. **§5 Request Policy** (NEW from Codex Round-9 HIGH) — add subsection "two-layer enforcement model" per receipt §1.8. L1 global write-blocker (`viewAsWriteBlocker`, mounted at app level, rejects mutation verbs with `?viewAs=` without needing `req.user`). L2 per-route read guard (`viewAsGuard`, mounted per-route after `authenticate`, does admin gate + target validation). Contract unchanged — "writes blocked under viewAs" still holds globally; mechanism is the L1 mount.

5. **§10.1 New files list** — `backend/middleware/viewAsGuard.mjs` now exports TWO functions (not one): `viewAsWriteBlocker` (L1 global) and `viewAsGuard` (L2 per-route). Unit test file `viewAsGuard.test.mjs` expands to cover both exports (or splits into two test files if the scope warrants).

6. **§10.2 Modified files list** — add `backend/core/app.mjs` (or `backend/core/routes.mjs`) for the L1 global mount. Exact file + line determined during implementation (before `setupRoutes(app)`).

These amendments are proposed, not applied. If Codex approves this receipt, I will land them as a small follow-up edit to the planning doc before the implementation commit, so the planning doc and the code stay in sync.

## 5. What this receipt does NOT cover (explicit scope guards)

- No implementation code written or staged.
- No middleware code, helper code, manifest code, or test code written — those are the next phase (Impl commit #1 per the split plan).
- No 18.C.1B, 1C, 1D, 1E scoping beyond what the planning doc already states.
- No controller-level audits for E3 (`/api/workout/sessions`) or later endpoints — they get their own receipts when their batch starts.
- No middleware-vs-controller performance analysis — planning doc already locked the helper-opt-in pattern.

## 6. Exit Criteria for Gate #2

1. Codex APPROVE on this receipt document.
2. **Sean decides the `accountStatus` handling** (see §2.3): reject stub/invited targets as a hard gate, or allow them. Default recommendation: reject (safer; admin impersonating a stub user sees empty dashboards which is confusing UX). Alternative: allow, on the theory that admin may want to QA the stub/invited experience. One sentence from Sean locks this.
3. On Codex APPROVE + Sean's accountStatus call: I apply the 6 planning-doc amendments in §4 above as a separate small edit, incorporating the locked accountStatus decision and the two-layer guard design (pre-Gate-#3 cleanup).
4. Then: begin Impl commit #1 per planning §10.1 — `viewAsWriteBlocker` (L1) + `viewAsGuard` (L2) + `getEffectiveReadUserId` helper + `viewAsSupportedEndpoints.mjs` manifest (with all 4 entries — E1 canonical + legacy, E2 canonical + legacy) + unit tests for both L1 and L2 + L1 global mount in app.mjs. No E1/E2 route conversions yet.
5. No E1/E2 route conversions yet in that first commit — those come in Impl commit #2 with API tests covering both URL surfaces (canonical + legacy alias) per §1.7.

## 7. Ground rules

- Read ONLY this receipt + the files it cites.
- Do NOT write code for the implementation yet. Gate #3 covers that.
- Do NOT commit, stage, push, amend, or rewrite history. This is review-only.
- If REVISE: list findings with severity (CONTENT / BOOKKEEPING) and file:line evidence so the right amendment category is clear.
- If APPROVE: Sean greenlights the planning-doc amendments + Impl commit #1.

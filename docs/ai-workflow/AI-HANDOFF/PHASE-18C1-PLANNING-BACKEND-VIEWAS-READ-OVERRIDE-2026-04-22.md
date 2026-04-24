# Phase 18.C.1 Planning — Backend `?viewAs=` Read Override

**Date:** 2026-04-22
**Author:** Claude Opus 4.7 (1M)
**Type:** PLANNING DOC — no code. Rule 15 recursive planning gate.
**Status:** Draft under multi-round Codex review. All prior rounds returned REVISE; all findings + pre-Round-3 hygiene-pass fixes applied (see §15 for round-by-round history). Currently pending the **next Codex APPROVE verdict on the planning doc**. No implementation starts until Codex approves. Forward-looking Codex-cycle references in this doc are round-agnostic per the **handoff-convention subsection at the end of §15**; round numbers appear only in the earlier §15 round-log subsections as historical record.
**Predecessors:**
- [PHASE-18C-PLANNING-ADMIN-IMPERSONATION-2026-04-22.md](PHASE-18C-PLANNING-ADMIN-IMPERSONATION-2026-04-22.md) — original frontend-first plan (superseded by §10 addendum for ordering; decisions §7 still apply to later phases).
- [PHASE-18C1-CANONICAL-SURFACE-WALK-2026-04-22.md](PHASE-18C1-CANONICAL-SURFACE-WALK-2026-04-22.md) — hook audit revealed 67% of non-display client tabs are backend-resolved via `req.user.id` (JWT). Addendum §10 recommended reorder; Sean accepted Path 1.

**Scope-of-claim lock (rule 28):** This doc plans **backend-only** read-side impersonation. It does NOT implement frontend scaffolding, does NOT touch writes, does NOT swap JWTs, does NOT add audit-schema changes. Phase 18.C.2 is the frontend scaffolding slice; Phase 18.C.3 is per-tab enablement; Phase 18.C.4 is production smoke.

---

## 1. Purpose + Why the Reorder

The Phase 18.C.1 canonical surface walk (`PHASE-18C1-CANONICAL-SURFACE-WALK-2026-04-22.md`) ran a hook audit across the 18 live client-role routes. Result:
- **5 of 15 non-display tabs** support frontend-only impersonation (they already accept explicit `userId`/`clientId` in URL path or component prop).
- **10 of 15** are backend-resolved: the frontend sends `authAxios.get('/api/foo')` with no userId, backend uses `req.user.id` from JWT to return data. No amount of frontend context can make those endpoints return target-client data.

If frontend-first (original plan) had shipped, admins would see "not yet supported" panels on 10 of 18 tabs including the core READ surfaces (Home, Workouts, Profile, Rewards, Nutrition, Avatar Home, Virtual Olympics). Per §10.3 of the addendum, Sean's escape clause triggered. Path 1 (backend first) was accepted.

**Ship order (new):**
1. **18.C.1 (this doc) — backend `?viewAs=` middleware + per-endpoint audit.** Enables read-side impersonation at the protocol layer.
2. **18.C.2 — frontend scaffolding** (AdminImpersonationContext, banner, one entry CTA, request-interceptor for `?viewAs=` propagation).
3. **18.C.3 — per-tab enablement.** Most tabs become unblocked automatically once the frontend sends `?viewAs=` on the backend-audited endpoints.
4. **18.C.4 — live smoke + production validation.**

## 2. Scope Lock (Verbatim from Sean + Codex Round 1)

- Admin-only `?viewAs=` read override for **GET/HEAD only**.
- Writes remain blocked. No POST/PUT/PATCH/DELETE override.
- No JWT/session swap.
- No write-through or audit schema.
- No frontend implementation.
- No dormant deletion.

### 2.1 Sub-phase split (Codex Round 1 HIGH)

Codex REVISE verdict required splitting Phase 18.C.1 to reduce first-commit blast radius. New split:

| Sub-phase | Scope | Rationale |
|-----------|-------|-----------|
| **Phase 18.C.1A** (THIS DOC'S IMPLEMENTATION TARGET) | Middleware + `getEffectiveReadUserId` helper + tests + **E1/E2 gamification profile & dashboard only**. Proves the pattern on one controller family. | Smallest backend commit that proves the end-to-end flow. Middleware mount + one audit receipt scope. |
| **Phase 18.C.1B** | E3 (workout sessions) + E4 (profile). | Second batch after 18.C.1A ships clean. |
| **Phase 18.C.1C** | E12 (macro/nutrition). | Depends on endpoint audit (endpoint path TBD). |
| **Phase 18.C.1D** | E5–E11 (avatar-home + olympics). | Lower-frequency tabs; last in the priority stack. |
| **Phase 18.C.1E** | Messaging + schedule endpoints, IF approved after safety audit. | Either converted or explicitly marked unsupported. |
| **Phase 18.C.2** | Frontend scaffolding (AdminImpersonationContext, ImpersonationBanner, entry CTA, request interceptor). | Lands after 18.C.1A proves the pattern. Consumes supported-endpoint status via a mechanism chosen in 18.C.2's own planning (derived from the backend manifest — see §6.5; mechanism options include shared config / API endpoint / generated copy). |
| **Phase 18.C.3** | Per-tab enablement matched to the supported-endpoint manifest at each point in time. | Rolling — each 18.C.1 batch unlocks more tabs. |
| **Phase 18.C.4** | Live smoke + production validation. | Unchanged. |

This doc plans **Phase 18.C.1A only**. Each B/C/D/E batch gets its own planning addendum and Codex review before implementation.

## 3. Identity Model

### 3.1 Actor vs Target

| Concept | Source | Purpose |
|---------|--------|---------|
| **Actor** (authenticated user) | `req.user.id` — from JWT verification middleware | Always equals the admin making the request. Never mutated. Used for audit, write attribution, permission checks, log lines. |
| **Target** (impersonated client) | `req.viewAsUserId` (new field set by the 18.C.1 middleware) | Equals the target client id when a valid `?viewAs=` query param is present AND the actor is admin. Undefined otherwise. Used ONLY by endpoints that explicitly opt in via `getEffectiveReadUserId(req)`. |

**Non-negotiable:** `req.user.id` is NEVER mutated by the middleware. Any downstream code reading `req.user.id` continues to read the admin's id. This preserves:
- Audit trail integrity (logs still say `admin_id = <admin>`).
- Permission middleware semantics (admin's role / flags still drive authZ).
- Any third-party integrations (Sentry breadcrumbs, analytics) that read `req.user.id`.

### 3.2 Why a separate field (not `req.user.id` override)

Sean's design point #1: *"do NOT mutate `req.user.id` globally unless you can prove all downstream audit/log behavior remains correct"*. We cannot prove that — the codebase has many controllers and services that read `req.user.id` for both data-identity AND audit-identity. Mixing them causes silent writes-as-target, which is exactly the failure mode Sean rejected.

A separate field (`req.viewAsUserId`) is explicit opt-in at each endpoint. Endpoints that opt in via `getEffectiveReadUserId(req)` get target-scoped reads. Endpoints that don't opt in continue to read `req.user.id` and return admin data — with the middleware already rejecting mutations, this is the safe default.

## 4. Authorization Gates

### 4.1 Middleware order (proposed)

```
jwtAuth (existing — sets req.user)
  → viewAsGuard (NEW — sets req.viewAsUserId, gates mutation verbs)
    → controller (reads req.user.id for actor, req.viewAsUserId for target via helper)
```

### 4.2 Gate rules

Execution order for each rule group is top-to-bottom. First match wins.

#### 4.2.1 Parse + shape checks (Codex HIGH #3 — strict parsing, tightened Round 2)

Rules applied top-to-bottom, first match wins.

| Condition | Action |
|-----------|--------|
| `req.query.viewAs` is truly absent from the query string (`typeof raw === 'undefined'`) | No-op. `req.viewAsUserId` stays undefined. Proceed normally. |
| `req.query.viewAs` is present but non-string (object from `?viewAs[id]=1`, etc.) — `typeof raw !== 'string' && !Array.isArray(raw)` | **400 Bad Request** — `{ code: 'IMPERSONATION_INVALID_PARAM', message: 'Invalid viewAs shape (expected positive integer string).' }`. Codex Round 2 MEDIUM — explicit rejection of Express/qs object shapes. |
| `req.query.viewAs` is array (e.g. `?viewAs=1&viewAs=2`) | **400** — `{ code: 'IMPERSONATION_INVALID_PARAM', message: 'Only one viewAs parameter allowed.' }`. |
| `req.query.viewAs` is the empty string (`?viewAs=` or valueless `?viewAs`) | **400** — `{ code: 'IMPERSONATION_INVALID_PARAM', message: 'viewAs parameter cannot be empty.' }`. Codex Round 2 HIGH — presence without value is explicit misuse, not a no-op. |
| `req.query.viewAs` is a string but contains whitespace, `+`/`-` sign, `.`, `e`, `x`, or other non-digit characters | **400** — `{ code: 'IMPERSONATION_INVALID_PARAM', message: 'Invalid viewAs parameter (must be a positive integer).' }`. Rejects `1e3`, `0x10`, `  42  `, `+42`, `-1`, `1.0`. |
| Leading zero (e.g. `042`) — regex rejects | **400** — same code. |
| `Number.isSafeInteger(parsed) === false` (after bare-digits parse) | **400** — same code. |
| `parsed <= 0` | **400** — same (rejects `0` and negatives; regex above already rejects leading `0`, but defense-in-depth). |

**Parsing strategy (strict — Codex pre-Round-3 order fix):**
1. `const raw = req.query.viewAs;`
2. `if (typeof raw === 'undefined') return next();` — only true-absence is no-op.
3. `if (Array.isArray(raw)) return 400 IMPERSONATION_INVALID_PARAM 'Only one viewAs parameter allowed.';` — **MUST come before the typeof check**, because arrays have `typeof === 'object'` and would otherwise be swallowed by step 4 with a less-accurate error message.
4. `if (typeof raw !== 'string') return 400 IMPERSONATION_INVALID_PARAM 'Invalid viewAs shape (expected positive integer string).';` — rejects objects from qs parser output like `?viewAs[id]=1`.
5. `if (raw === '') return 400 IMPERSONATION_INVALID_PARAM 'viewAs parameter cannot be empty.';` — explicit empty-string rejection.
6. `if (!/^[1-9][0-9]*$/.test(raw)) return 400 IMPERSONATION_INVALID_PARAM 'Invalid viewAs parameter (must be a positive integer).';` — bare-digits + no-leading-zero.
7. `const parsed = Number(raw); if (!Number.isSafeInteger(parsed) || parsed <= 0) return 400;`

No `parseInt` (silently truncates trailing garbage). No `+raw` coercion (same issue). Step-3-before-step-4 order is mandatory — arrays must get the array-specific error, not the generic shape error.

#### 4.2.2 Actor + verb checks

| Condition | Action |
|-----------|--------|
| Parsed OK AND `req.user.role !== 'admin'` | **403 Forbidden** — `{ code: 'IMPERSONATION_ADMIN_ONLY', message: 'Only admin users may use impersonation.' }`. Explicit rejection for misuse. |
| Parsed OK AND admin AND method ∈ {POST, PUT, PATCH, DELETE} | **403** — `{ code: 'IMPERSONATION_READ_ONLY', message: 'Writes are not permitted while impersonating.' }`. |

#### 4.2.3 Target identity checks (Codex HIGH #2 — role gate tightened)

| Condition | Action |
|-----------|--------|
| Parsed OK AND admin AND method ∈ {GET, HEAD} AND target does not exist in Users table | **404 Not Found** — `{ code: 'IMPERSONATION_TARGET_NOT_FOUND', message: 'Target user not found.' }`. |
| Parsed OK AND admin AND target role ∉ {`client`, `user`} | **400 Bad Request** — `{ code: 'IMPERSONATION_TARGET_INVALID_ROLE', message: 'Can only impersonate client-scope users.' }`. Explicitly rejects `admin`, `trainer`, and any other role. |
| Parsed OK AND admin AND target has any "user is not eligible" state (see model-audit gate below) | **404 Not Found** (treats as non-existent; avoids leaking user-state info). Same `IMPERSONATION_TARGET_NOT_FOUND` code. |

**Model-audit gate (Codex Round 2 LOW):** the field names `isActive`, `isDeleted`, `isSuspended` are provisional. Before implementation, Phase 18.C.1A's pre-code audit receipt (§10.3) MUST verify the actual User model field names for active/deleted/suspended states against `backend/models/User.mjs`. If field names differ (e.g. `deletedAt` timestamp instead of `isDeleted` boolean, or no suspended-state at all), the middleware uses the real fields and the planning doc gets a §4.2.3 correction addendum. If the app lacks one of these states, document the gap explicitly — do not invent a check for a field that doesn't exist.
| Parsed OK AND admin AND GET/HEAD AND target passes all checks | Set `req.viewAsUserId = parsed`. Proceed. |

**Role normalization note:** the app normalizes `role === 'user'` as the client dashboard role ([`UniversalDashboardLayout.tsx:647`](frontend/src/components/DashBoard/UniversalDashboardLayout.tsx#L647) — `rawRole === 'user' ? 'client' : rawRole`). Middleware accepts both `client` AND `user` for symmetry with that normalization.

### 4.3 Non-admin silent-ignore vs 403 decision

Sean's design point #2: recommends **403 for explicit misuse**. Accepted. Silent-ignore would mask potential bugs in frontend callers and would undermine the "this is admin-only" contract.

## 5. Request Policy — Error Semantics

- **Verb gate:** mutation verbs + viewAs → 403 with body `{ code: 'IMPERSONATION_READ_ONLY', message: '...' }`.
- **Target-valid gate:** malformed/missing/admin target → 400/404 with code strings for frontend to distinguish.
- **No data leak:** 404 for "not found" uses the same timing/response shape as 403 where possible, matching how existing admin endpoints already respond to invalid ids.

## 6. Endpoint Strategy — `getEffectiveReadUserId(req)` Helper

### 6.1 Helper shape

```javascript
// backend/utils/viewAs/getEffectiveReadUserId.mjs
export function getEffectiveReadUserId(req) {
  // Returns the user id whose READ data should be fetched.
  // If admin is impersonating (viewAsGuard set req.viewAsUserId), return target.
  // Otherwise return actor id. Mutation verbs never reach here — the guard rejects them upstream.
  //
  // Codex pre-Round-3: defensive check upgraded from Number.isFinite to
  // Number.isSafeInteger + positive. Guards against any future bug where
  // a test/middleware sets a non-safe-integer (0, -1, 1.5, Infinity).
  // The upstream middleware already enforces safe-positive-integer at
  // §4.2.1 step 7, but this helper must not trust that invariant blindly.
  if (
    typeof req.viewAsUserId === 'number' &&
    Number.isSafeInteger(req.viewAsUserId) &&
    req.viewAsUserId > 0
  ) {
    return req.viewAsUserId;
  }
  return req.user?.id;
}
```

### 6.2 Do NOT monkey-patch controllers

Sean's design point #4: *"do not try to monkey-patch every controller by changing `req.user.id`"*. Accepted. Instead:

- Each backend-resolved controller that needs impersonation support gets one line changed: `const userId = req.user.id` → `const userId = getEffectiveReadUserId(req)` (and an import).
- No global override. Endpoints that don't opt in continue to return admin data on reads (which, combined with the mutation-verb block at middleware, is safe).

### 6.3 Endpoint inventory (from walk addendum §10.1)

Endpoints identified from the canonical surface walk. **Phase 18.C.1A implements ONLY E1 and E2** (Codex HIGH #1 scope split). Remaining endpoints land in later sub-phases (§2.1).

| # | Endpoint | Controller file (proposed — LOCKED DURING AUDIT) | Sub-phase | Notes |
|---|----------|---------------------------------------------------|-----------|-------|
| **E1** | `GET /api/v1/gamification/profile` | `backend/controllers/gamificationController.mjs` | **18.C.1A** | Used by ClientHomeTab (entry tab). First pattern proof. |
| **E2** | `GET /api/v1/gamification/dashboard` | `backend/controllers/gamificationController.mjs` | **18.C.1A** | Used by ClientRewardsPage. Sibling to E1 — same controller likely, clean to convert together. |
| E3 | `GET /api/workout/sessions` | `backend/controllers/workoutController.mjs` (or session-specific) | 18.C.1B | ClientMyWorkoutsPage. |
| E4 | `GET /api/profile` | `backend/controllers/profileController.mjs` | 18.C.1B | ClientProfilePage. Audit carefully — profile may include email/phone/auth-adjacent fields that require selective field-level exposure under impersonation. |
| E12 | `GET /api/macro-summary` (or whatever `useMacroSummary` hits — path TBD) | `backend/controllers/nutritionController.mjs` (TBD) | 18.C.1C | NutritionWorkspace. |
| E5 | `GET /api/avatar-home` | `backend/controllers/avatarHomeController.mjs` | 18.C.1D | AvatarHomePage. Level-10-gated — lower frequency. |
| E6 | `GET /api/avatar-home/minimalist-mode` | same | 18.C.1D | Companion state. |
| E7 | `GET /api/avatar-home/room` | same | 18.C.1D | |
| E8 | `GET /api/gamification/profile` (AvatarHome inline fetch at [:145](frontend/src/components/AvatarHome/AvatarHomePage.tsx#L145)) | Resolve during audit — may be same as E1 | 18.C.1A if same as E1, else 18.C.1D | |
| E9 | `GET /api/olympics/events` | `backend/controllers/olympicsController.mjs` | 18.C.1D | Audit whether truly per-user or global. |
| E10 | `GET /api/olympics/leaderboard/:eventType` | same | 18.C.1D | Leaderboards likely global — target-swap may be no-op. Audit. |
| E11 | `GET /api/olympics/recovery-status` | same | 18.C.1D | |
| E13 | Messaging threads endpoint (TBD) | `backend/controllers/messagingController.mjs` (TBD) | **18.C.1E OR unsupported** | Privacy-sensitive; admin reading client DMs is an audit-worthy action. Default: explicitly marked unsupported unless separate Sean approval. |
| E14 | Schedule endpoints (TBD) | likely `backend/controllers/sessionController.mjs` | **18.C.1E OR unsupported** | Some endpoints may already be admin-only with their own model. Audit. |

**18.C.1A's first concrete task (post-approval):** per-endpoint audit receipt for E1 + E2 ONLY — controller file paths confirmed, current signatures documented, opt-in change-list locked.

### 6.4 Endpoints that may NOT be safe to impersonate

Sean's design point #4: *"if any endpoint is not safe to impersonate, list it as unsupported for 18.C.2 frontend blocking"*. Candidates identified now (final list locked during per-batch audit):

- **Messaging threads (E13):** conversation threads have privacy constraints — admin reading client's DMs is an audit-sensitive action. Recommend: mark unsupported; requires separate Sean approval before joining 18.C.1E.
- **Consent endpoint (AiConsentScreen if any backend fetch exists):** consent is self-only by design. Do not add viewAs support; middleware should not be applied to consent routes.
- **Auth / token endpoints** (`/api/auth/*`, session refresh, logout): NEVER apply viewAs. Admin's JWT stays admin.
- **Admin-only analytics endpoints** that already differentiate admin vs client views — out of scope (admin already sees all clients).
- **Any endpoint that writes as a side effect** even on GET (rare but possible — e.g., a "last-seen" tracker on profile GET). Audit per endpoint.

### 6.5 Supported-Endpoint Manifest (Codex Round 1 MEDIUM #2, corrected Round 2 MEDIUM)

**Revised Round 2:** the manifest is a **backend-side** source of truth for 18.C.1A. Frontend-consumption design is explicitly DEFERRED to Phase 18.C.2's planning, which will choose between: (a) shared config location intended for both sides, (b) an API endpoint like `GET /api/view-as/supported-endpoints` that returns the list, or (c) a generated frontend copy produced by a build-time script. 18.C.1A does NOT ship a Vite-importable backend path (backend/config is not Vite-reachable).

**Location:** `backend/config/viewAsSupportedEndpoints.mjs` (backend-only). Exported shape:

```javascript
// BACKEND-SIDE source of truth for viewAs-supported endpoints.
// Phase 18.C.2 will choose its own frontend consumption mechanism
// (shared config / API endpoint / generated copy). Do NOT import
// this file from frontend code — backend/config is not in the
// Vite module graph.
export const VIEW_AS_SUPPORTED_ENDPOINTS = [
  // Phase 18.C.1A — shipped
  { method: 'GET', path: '/api/v1/gamification/profile', batch: '18.C.1A' },
  { method: 'GET', path: '/api/v1/gamification/dashboard', batch: '18.C.1A' },
  // later batches appended as they ship (1B/1C/1D/1E)
];

export const VIEW_AS_UNSUPPORTED_ENDPOINTS = [
  { method: 'GET', path: '/api/messaging/*', reason: 'privacy — audit-sensitive, pending separate approval', status: 'unsafe' },
  { method: 'GET', path: '/api/consent/*', reason: 'self-only by design', status: 'self-only' },
  { method: 'GET', path: '/api/auth/*', reason: 'never impersonate auth/token flows', status: 'never' },
  // plus any others identified during audit
];
```

**Consumers in 18.C.1A:**
- **Backend tests:** a contract test asserts that every controller with a `getEffectiveReadUserId(req)` call-site has a corresponding entry in `VIEW_AS_SUPPORTED_ENDPOINTS`. Prevents drift where a controller is converted but the manifest forgets the entry (or vice versa).
- **Backend documentation:** the manifest is the authoritative list of which paths are impersonation-safe for this batch.
- **Frontend (Phase 18.C.2):** NOT a direct consumer in 18.C.1A. Phase 18.C.2's planning chooses the frontend-consumption mechanism.

**Runtime enforcement:** the manifest itself does not gate runtime behavior; controllers opt in via `getEffectiveReadUserId`. The manifest is documentation + test-contract. Runtime safety comes from the middleware's verb/role/target gates + the opt-in helper pattern.

### 6.6 Middleware Mount Point (Codex MEDIUM #1)

The mount point MUST be concrete before code. Phase 18.C.1A's first concrete task is a pre-code receipt that identifies:

1. Where `jwtAuth` (or equivalent) is mounted in the app.
2. The exact line where `viewAsGuard` should be inserted (after `jwtAuth`, before protected route handlers).
3. Confirmation that it is NOT mounted on public routes (auth, health check, webhooks).
4. Confirmation that the mount point is a single canonical entry point (e.g. `app.use(...)` at the app level) vs scattered per-router.

Candidate files to inspect:
- `backend/core/app.mjs` (likely the main Express app)
- `backend/core/routes.mjs` (if routes are split out)
- `backend/server.mjs` or `backend/index.mjs` (app entry)
- any auth middleware module (`backend/middleware/auth.mjs` or similar)

Without identifying the concrete mount point, the middleware could land either too early (intercepts public routes and 400s on malformed `?viewAs=` for any caller) or too late (misses handlers that do manual auth). The mount-point receipt is a hard pre-code gate.

## 7. Audit / Logging

### 7.1 Log line format (Codex Round 1 LOW + Round 2 LOW — scope clarified)

**Single implementation path for SUCCESSFUL impersonated requests:** the middleware attaches a `res.on('finish')` listener ONLY when all gates pass and `req.viewAsUserId` has been set. Emits exactly one structured log line per successful impersonated request, with the response status known at emission time.

```
[viewAs] actor=<admin.id> target=<viewAs.id> method=GET route=<req.originalUrl> status=<res.statusCode>
```

The **helper `getEffectiveReadUserId` does NOT log.** Helper stays silent — it's called from many places in a handler (potentially N+1) and logging from there would create duplicate lines. Middleware `finish` logging is the single authoritative emission point for successes.

Structured log level: `info` (impersonation is a normal admin workflow).

### 7.2 Denied-attempt logging — explicitly OUT OF SCOPE for 18.C.1A (Codex Round 2 LOW + pre-Round-3 rollout guard)

Parse / role / verb / target-role / target-state rejections all return 400/403/404 from the middleware BEFORE `req.viewAsUserId` is set. No `finish` listener is attached in those paths. Consequently:

- **18.C.1A does NOT log denied viewAs attempts.** A client sending `?viewAs=` that gets 403, or an admin sending a malformed `?viewAs=` that gets 400, produces **no viewAs-specific log line**.
- This is explicit scope. Denied-attempt logging (with structured rate-limit-aware shape, no target-id leak for NOT_FOUND cases, possibly distinct log level) is a follow-up — can be added in Phase 18.C.1B or later with its own review cycle.
- The middleware DOES propagate the error status up the Express chain normally, so whatever `error-handling-middleware` / access logger is already running sees the 4xx response and logs it per existing conventions (not as a viewAs-specific line).

**Rollout guard (Codex pre-Round-3):** deferring denied-attempt logging is only acceptable while the feature is **frontend-inert** — i.e. before Phase 18.C.2 ships an "View As" CTA that causes the wild to start sending `?viewAs=` at the middleware. Before 18.C.2 goes live on origin, either:
(a) denied-attempt logging lands (new phase — 18.C.1F — with its own planning + Codex cycle), OR
(b) an equivalent abuse-visibility mechanism lands (e.g. rate-limiter hooks, structured access-log post-processing that recognizes the `IMPERSONATION_*` error codes).

The specific abuse vectors to address before frontend rollout:
- Admin target enumeration (repeated `?viewAs=` with incrementing ids to discover which users exist — `IMPERSONATION_TARGET_NOT_FOUND` responses leak signal).
- Repeated malformed `viewAs` attempts (could indicate a misbehaving admin script or an attacker with a stolen admin JWT).
- Role-gate 403s from non-admin users (could indicate a compromised client JWT + a frontend bug that sent `?viewAs=`).

This guard is a HARD exit criterion for Phase 18.C.2 launch, not a 18.C.1A constraint. Documented here so it's not forgotten during 18.C.2 planning.

### 7.3 Write-attribution preserved

Since `req.user.id` is never mutated and writes are blocked under impersonation, existing write-audit code (e.g., "createdBy", "updatedBy" columns, audit-trail tables) is unaffected. No write ever attributes to the target client.

### 7.4 Non-impersonated requests unchanged

The middleware is a no-op when `req.query.viewAs` is truly absent (per §4.2.1 row 1). No `res.on('finish')` listener attached. No new log lines for normal traffic.

### 7.5 Handler-level errors AFTER middleware success

If the middleware sets `req.viewAsUserId` successfully and the downstream handler then errors (throws 500, timeout, etc.), the `finish` listener still fires with the actual response status. One log line emitted reflecting the 5xx outcome. This is distinct from middleware denials (§7.2) where the listener was never attached.

## 8. Tests

### 8.1 Middleware contract tests (`backend/tests/unit/viewAsGuard.test.mjs`)

Test groups match §4.2 rule groups.

#### 8.1.1 Parse + shape checks (Codex Round 1 HIGH #3 + Round 2 HIGH/MEDIUM)

| Test | Setup | Assertion |
|------|-------|-----------|
| Query param truly absent → no-op | admin GET, no query param at all | `req.viewAsUserId === undefined`, next() called, no log |
| `?viewAs=` (present, empty value) → 400 | `?viewAs=` | status 400, code `IMPERSONATION_INVALID_PARAM`, message "cannot be empty" — Round 2 HIGH |
| `?viewAs` (valueless, Express parses as empty string) → 400 | `?viewAs` | same as above |
| Object-shaped (if harness supports qs `?viewAs[id]=1`) → 400 | `req.query.viewAs = { id: '1' }` (simulated) | status 400, "Invalid viewAs shape" — Round 2 MEDIUM |
| Array viewAs → 400 | `?viewAs=1&viewAs=2` | status 400 |
| Non-integer string → 400 | `?viewAs=abc` | 400 |
| Float → 400 | `?viewAs=1.0` | 400 |
| Scientific notation → 400 | `?viewAs=1e3` | 400 |
| Hex → 400 | `?viewAs=0x10` | 400 |
| Whitespace-padded → 400 | `?viewAs=%2042%20` (URL-encoded `  42 `) | 400 |
| Leading `+` → 400 | `?viewAs=+42` | 400 |
| Leading `-` → 400 | `?viewAs=-1` | 400 |
| Zero → 400 | `?viewAs=0` | 400 |
| Beyond safe integer → 400 | `?viewAs=9007199254740993` (MAX_SAFE_INTEGER + 2) | 400 |
| Leading zero → 400 | `?viewAs=042` | 400 (strict regex rejects leading zeros) |
| Valid positive integer (parses clean) | `?viewAs=42` | proceeds to actor checks |

#### 8.1.2 Actor + verb checks

| Test | Setup | Assertion |
|------|-------|-----------|
| Client GET with valid viewAs → 403 | client role, `?viewAs=42` | status 403, code `IMPERSONATION_ADMIN_ONLY` |
| Trainer GET with valid viewAs → 403 | trainer role | same |
| No-auth GET with valid viewAs → 401 (via upstream jwtAuth) | no JWT | upstream handles; viewAsGuard never runs |
| Admin POST with valid viewAs → 403 | admin, POST | status 403, code `IMPERSONATION_READ_ONLY` |
| Admin PUT with valid viewAs → 403 | admin, PUT | same |
| Admin PATCH with valid viewAs → 403 | admin, PATCH | same |
| Admin DELETE with valid viewAs → 403 | admin, DELETE | same |
| Admin HEAD with valid viewAs → proceeds | admin, HEAD | verb-gate passes |

#### 8.1.3 Target identity checks (Codex HIGH #2)

| Test | Setup | Assertion |
|------|-------|-----------|
| Admin GET, target does not exist → 404 | admin, `?viewAs=99999` | status 404, code `IMPERSONATION_TARGET_NOT_FOUND` |
| Admin GET, target is admin → 400 | target.role = 'admin' | status 400, code `IMPERSONATION_TARGET_INVALID_ROLE` |
| Admin GET, target is trainer → 400 | target.role = 'trainer' | same |
| Admin GET, target role is `client` → sets req.viewAsUserId | target.role = 'client' | `req.viewAsUserId === target.id`, next() |
| Admin GET, target role is `user` → sets req.viewAsUserId | target.role = 'user' | same (role normalization) |
| Admin GET, target isActive === false → 404 | target soft-inactive | 404, same code as not-found |
| Admin GET, target isDeleted === true → 404 | target soft-deleted | 404 |
| Admin GET, target isSuspended === true → 404 | target suspended | 404 |
| Admin GET, target valid client → sets req.viewAsUserId, calls next() | happy path | `req.viewAsUserId === target.id`, next() called, log line emitted on finish |

#### 8.1.4 Logging tests (Codex Round 2 LOW — clarified)

| Test | Setup | Assertion |
|------|-------|-----------|
| Admin GET happy path (200) → one log line on `res.on('finish')` | admin, valid target, handler returns 200 | log line emitted exactly once, includes actor, target, method, route, status=200 |
| No-viewAs request → no log line | | `res.on('finish')` never attached by viewAsGuard, no viewAs-specific log line emitted |
| Middleware rejection (parse 400) → NO viewAs log line | `?viewAs=0` | viewAsGuard finish listener NEVER attached (reject happens before `req.viewAsUserId` is set); 18.C.1A explicitly does not log denied attempts |
| Middleware rejection (role 403) → NO viewAs log line | client GET with valid viewAs | same — listener not attached |
| Middleware rejection (verb 403) → NO viewAs log line | admin POST with valid viewAs | same |
| Middleware rejection (target 400/404) → NO viewAs log line | admin GET with admin-target or missing-target | same |
| Handler 5xx AFTER middleware success → log line WITH 5xx status | admin, valid target, handler throws 500 | listener was attached at middleware success; fires on finish with status=500 |

### 8.2 Helper tests (`backend/tests/unit/getEffectiveReadUserId.test.mjs`) — Codex pre-Round-3 expansion

Helper must defensively reject any non-safe-positive-integer even if the middleware was bypassed/buggy. Test the full fallback matrix:

| Test | Setup | Assertion |
|------|-------|-----------|
| Valid target → returns target | `req.viewAsUserId = 42`, `req.user.id = 7` | returns 42 |
| viewAsUserId undefined → returns actor | `req.viewAsUserId` absent, `req.user.id = 7` | returns 7 |
| viewAsUserId is `0` → returns actor | `req.viewAsUserId = 0` | returns 7 (reject non-positive) |
| viewAsUserId is `-1` → returns actor | `req.viewAsUserId = -1` | returns 7 |
| viewAsUserId is `1.5` → returns actor | `req.viewAsUserId = 1.5` | returns 7 (reject non-integer) |
| viewAsUserId is `Infinity` → returns actor | `req.viewAsUserId = Infinity` | returns 7 (reject non-safe-integer) |
| viewAsUserId is `NaN` → returns actor | `req.viewAsUserId = NaN` | returns 7 |
| viewAsUserId is string `'42'` → returns actor | `req.viewAsUserId = '42'` | returns 7 (typeof not number) |
| viewAsUserId is `MAX_SAFE_INTEGER + 1` → returns actor | `req.viewAsUserId = 9007199254740992` | returns 7 (fails isSafeInteger) |
| `req.user` is undefined AND viewAsUserId undefined → returns undefined | no auth context | returns `undefined` (downstream checks) |

### 8.3 Endpoint tests — for each converted endpoint

Minimum two tests per endpoint (per §6.3 priority — HIGH endpoints get full coverage, LOW can get one):

| Test | Assertion |
|------|-----------|
| Admin GET with viewAs returns target's data | response payload matches target client's record |
| Admin GET without viewAs returns admin's own data | response payload matches admin's own record (may be empty) |
| Client GET (not admin) returns own data regardless of viewAs query | confirms client-path is unchanged |

### 8.4 Regression test — `req.user.id` stays actor across controllers

One explicit test that an audit-sensitive controller (suggest: a write controller with viewAs blocked — ensures the 403 path doesn't accidentally allow writes) receives `req.user.id === admin.id` even when a viewAs query is present and rejected. Prevents silent regression where future middleware changes mutate `req.user.id`.

### 8.5 Test gate

- All new middleware + helper tests must pass.
- Existing backend test suite (1677/1677 per prior sessions) must not regress.

## 9. Rule 42 Considerations

Phase 18.C.1 touches backend. Rule 42 gate applies:

### 9.1 Pre-push audit (at push time)

- `git ls-files --others --exclude-standard backend/` → must be 0
- `git diff --name-only HEAD backend/` → must be 0 (no uncommitted backend drift)

### 9.2 Test gate before push

Per rule 42 + CLAUDE.md test discipline:
- `cd backend && npm test` — full suite must pass.
- Targeted tests (new middleware + helper + endpoint tests) must all pass.
- No test skips. No TODO tests.

### 9.3 Commit scope discipline

- One narrow commit per logical unit: (a) middleware + helper + their tests, (b) per-endpoint conversion batches.
- No mixing with frontend work (frontend is 18.C.2).
- No dormant-file deletion.

## 10. Proposed File List — Phase 18.C.1A ONLY (scope per §2.1)

Phase 18.C.1A implements middleware + helper + tests + E1/E2 only. Later sub-phases (1B/1C/1D/1E) each get their own planning addendum + file list.

### 10.1 New files (18.C.1A)
- `backend/middleware/viewAsGuard.mjs` — the middleware.
- `backend/utils/viewAs/getEffectiveReadUserId.mjs` — the helper.
- `backend/config/viewAsSupportedEndpoints.mjs` — supported-endpoint manifest (§6.5), initial entries: E1 + E2.
- `backend/tests/unit/viewAsGuard.test.mjs` — middleware contract tests (all groups in §8.1).
- `backend/tests/unit/getEffectiveReadUserId.test.mjs` — helper tests (§8.2).
- `backend/tests/api/gamificationViewAs.test.mjs` — endpoint conversion tests for E1 + E2 (§8.3).

### 10.2 Modified files (18.C.1A — LOCKED DURING AUDIT)
- **Middleware mount point** — TBD per §6.6 receipt. Candidate: `backend/core/app.mjs` after `jwtAuth`. Concrete line locked by pre-code mount-point audit.
- **`backend/controllers/gamificationController.mjs`** — E1 and E2 conversions. Single-line `getEffectiveReadUserId(req)` swap per handler. Audit may reveal multiple internal callsites that need the swap per handler (grep per handler function).

### 10.3 Pre-code audit receipts (18.C.1A)

Before any code, THREE audit receipts land in `docs/ai-workflow/AI-HANDOFF/`:

1. **Mount-point receipt** — per §6.6. Identifies the exact `app.use(...)` line where `viewAsGuard` registers, with evidence that it comes after `jwtAuth` and does not apply to public routes.
2. **User-model-state receipt (Codex Round 2 LOW)** — reads `backend/models/User.mjs` and reports the actual field names for active/deleted/suspended states. Confirms §4.2.3's assumed `isActive`/`isDeleted`/`isSuspended` OR lists the real fields the middleware should check. If any of these states don't exist in the model, documents the gap explicitly (the middleware then simply omits that check, not invents one).
3. **Controller audit receipt for E1+E2** — identifies the exact handler function(s) for `/api/v1/gamification/profile` and `/api/v1/gamification/dashboard`, lists every `req.user.id` read in each handler, and confirms which ones are identity-scope reads (swap) vs audit-scope reads (keep as `req.user.id`).

All three receipts go to Codex for review before any `.mjs` file is written.

### 10.4 Deferred (18.C.1B and later — NOT in this doc's scope)

- All other endpoints (E3–E14) — each gets its own batch.
- Frontend scaffolding — Phase 18.C.2.
- Per-tab enablement — Phase 18.C.3.
- Live smoke — Phase 18.C.4.

**Total estimate for 18.C.1A:** 6 new files + 1 modified controller + 1 modified app-mount line. Audit-first confirms these.

## 11. Risks + Hostile Critique (Rule 17 Dual-Pass Inline)

### 11.1 Auth/privacy failure modes

- **Admin accidentally reads restricted data (medical, auth tokens) under impersonation.** Mitigation: per-endpoint opt-in. Controllers that serve sensitive data don't add `getEffectiveReadUserId` unless explicitly approved. Messaging is already flagged unsafe (§6.4).
- **Helper reads `req.viewAsUserId` from a request where the middleware never ran.** Mitigation: helper checks `Number.isSafeInteger(req.viewAsUserId) && req.viewAsUserId > 0` and falls back to `req.user?.id` (per §6.1). Defense-in-depth even if middleware was bypassed.
- **Target-user role escalation (admin impersonating another admin).** Mitigation: middleware gates `target.role !== 'admin'`.
- **Session hijack + viewAs abuse** (stolen admin JWT + viewAs). Mitigation: same as any admin-JWT compromise — out of scope for this phase. Existing JWT security model stands.

### 11.2 Implementation failure modes

- **Middleware mounted wrong place in the chain.** If mounted before jwtAuth, `req.user` is undefined and everything 500s. Must mount AFTER jwtAuth. Covered by middleware contract test (mock req without user → graceful handling).
- **Controller opts into helper but forgets to update a SECOND userId read in the same handler.** Half-impersonation — some data target, some data actor. Mitigation: one-line grep per controller file before declaring done; unit test per endpoint asserts full response matches target. Rule 17 dual-pass applies.
- **N+1 query at controller level assumes `req.user.id` for performance.** Cache keys / memoization that use `req.user.id` now return wrong-user data. Mitigation: grep for memoization in each converted controller; adjust cache keys to include `getEffectiveReadUserId`.
- **Writes leak via batch endpoints.** An endpoint that reads AND writes (e.g., `/api/feature-usage/track`) mounted as GET but does a write side-effect. Mitigation: audit each HIGH-priority endpoint explicitly; document any read-that-writes as unsafe.

### 11.3 Scope-creep failure modes

- **"While we're here, let's add write-through..."** NO. Phase 18.C.1 is read-only. Rule 28 scope lock.
- **"Let's add a UI for selecting the target."** NO. That's 18.C.2.
- **"Let's fix the audit schema while we're in the middleware code."** NO. Audit schema is a separate decision; current log-line format is additive.

### 11.4 Rollback plan

If the middleware ships and a production issue surfaces:
- Disable by removing middleware registration in `backend/core/app.mjs` (one-line revert).
- All endpoints continue to work normally since `getEffectiveReadUserId` falls back to `req.user.id` when `req.viewAsUserId` is undefined.
- Zero frontend impact (18.C.2 hasn't shipped yet).

## 12. Decisions Needed From Sean (post-Codex-Round-2-REVISE + pre-Round-3 hygiene)

Codex Round 1 verdict: REVISE → all 5 HIGH/MEDIUM + 1 LOW findings applied (§15.1) — count is `3 HIGH + 2 MEDIUM + 1 LOW`.
Codex Round 2 verdict: REVISE → all 1 HIGH + 3 MEDIUM + 2 LOW findings applied (§15.2).
Codex pre-Round-3 hygiene pass → 6 additional pre-send fixes applied (§15.3).

1. **Accept the revised planning doc as-is** → I draft the next Codex planning-doc review prompt. On Codex APPROVE, first concrete 18.C.1A task is the three pre-code audit receipts (§10.3) — still no code. (Round numbers intentionally omitted from forward-looking gate language; see the round-agnostic handoff-convention subsection at the end of §15.)
2. **Override Codex's scope split** — Sean can direct a different split (e.g. middleware + E1 only in 18.C.1A, no E2; or include E3/E4 in 18.C.1A). Default: keep Codex's E1/E2 split.
3. **Override Codex's role-gate decision** — e.g. allow `trainer` targets too. Default: keep `client`/`user` only.
4. **Reject the query-param design** — `X-View-As-User-Id` header instead of `?viewAs=42`. Would change §3–§5. Default: keep query-param.

Default path: approve as-is → **next Codex APPROVE on the planning doc** (closes planning gate) → pre-code audit receipts → **Codex APPROVE on the receipts** → implementation → **Codex APPROVE on the impl diff** → first code commit. Round numbering intentionally omitted in forward references — each REVISE cycle advances the counter, so round-specific gate names have drifted twice already.

## 13. Scope Guards

- No write-through.
- No audit-schema change.
- No JWT / session swap.
- No frontend implementation.
- No dormant deletion.
- No trainer impersonation (out of scope for 18.C entirely).
- No mutation of `req.user.id`.

## 14. Exit Criteria for Phase 18.C.1A (narrow scope per §2.1)

Phase 18.C.1A is DONE when:
1. Mount-point receipt approved (§6.6, §10.3).
2. Controller audit receipt for E1+E2 approved (§10.3).
3. `viewAsGuard` middleware + `getEffectiveReadUserId` helper + supported-endpoint manifest land with full test coverage (§8).
4. E1 (`/api/v1/gamification/profile`) and E2 (`/api/v1/gamification/dashboard`) converted + tested.
5. Backend test suite passes (existing tests + new tests).
6. Rule 42 audit clean at push time (backend untracked = 0; modified-uncommitted = 0 except this slice's staged files).
7. Rule 44 secret scan clean.
8. **Next Codex APPROVE on the revised planning doc** (closes the planning gate after successive REVISE cycles). **Codex APPROVE on the pre-code audit receipts** (mount-point + user-model-state + controller audit for E1+E2). **Codex APPROVE on the actual implementation diff** before commit. Three Codex APPROVE gates remaining; round numbers deliberately not cited here because each REVISE cycle advances them.
9. Admin-only gate enforced in middleware. Feature is inert until Phase 18.C.2 frontend sends `?viewAs=`.
10. Manual smoke: admin GET to E1 or E2 with `?viewAs=<valid client>` returns target client's data (not admin's); admin GET without `?viewAs=` returns admin's own data unchanged; client GET with `?viewAs=` returns 403.

No Phase 18.C.1B work until 18.C.1A ships + is live on origin. Each subsequent batch (1B, 1C, 1D, 1E) repeats the audit → Codex → code → test → Codex → ship cycle.

**Phase 18.C.2 frontend scaffolding gate (Codex Round 2 MEDIUM — contradiction resolved; Codex pre-Round-3 wording clarified):** Phase 18.C.2 CAN begin after 18.C.1A ships + is live on origin. It does NOT require all 1B–1E batches to ship first. 18.C.2 enables frontend impersonation ONLY for tabs whose underlying endpoint is classified "supported" per the backend manifest (§6.5) — the exact consumption mechanism (shared config / API endpoint / generated copy) is an open design decision for 18.C.2's own planning. Tabs whose endpoints are classified "unsupported" (messaging, consent, auth, etc.) or not yet in the supported list get a "not yet supported under impersonation" block panel. As each 18.C.1B–1E batch ships and adds entries to the manifest, 18.C.2 (or a follow-up 18.C.3 per-tab enablement pass) unlocks the corresponding tabs. This is the "rolling unlock" model that preserves the proof-of-pattern split.

---

## 15. Codex Review Cycle

### 15.1 Round 1 (COMPLETE — 2026-04-22)

Codex Round 1 verdict: **REVISE**.

Findings applied:
- **HIGH #1 (scope split):** §2.1 added — 18.C.1A narrow (middleware + helper + E1/E2), 18.C.1B+ for remaining endpoints.
- **HIGH #2 (role gate):** §4.2.3 tightened — allow `client` + `user` only; reject `admin`, `trainer`, inactive/deleted/suspended.
- **HIGH #3 (strict parsing):** §4.2.1 added — explicit regex + `Number.isSafeInteger`, reject 0/negatives/floats/sci-notation/hex/whitespace/arrays; §8.1.1 adds comprehensive test cases.
- **MEDIUM #1 (mount point concreteness):** §6.6 added — pre-code mount-point receipt is a hard gate before implementation.
- **MEDIUM #2 (supported-endpoint manifest):** §6.5 added — `backend/config/viewAsSupportedEndpoints.mjs` ships in 18.C.1A with E1/E2 entries.
- **LOW (logging path):** §7.1 picks middleware `res.on('finish')` as the single emission point; helper stays silent.

### 15.2 Round 2 (COMPLETE — 2026-04-22)

Codex Round 2 verdict: **REVISE**.

Findings applied (all 6):
- **HIGH (empty `?viewAs=` must not be no-op):** §4.2.1 rewrote — only `typeof raw === 'undefined'` is no-op. `?viewAs=` and valueless `?viewAs` both return 400 `IMPERSONATION_INVALID_PARAM`. Tests added at §8.1.1.
- **MEDIUM (non-string/object parser shapes):** §4.2.1 adds explicit `typeof raw !== 'string'` rejection early; parsing strategy documents the full guard chain. Test added for object-shape via `?viewAs[id]=1`.
- **MEDIUM (manifest frontend-consumption):** §6.5 rewrote — manifest is **backend-side source of truth only** in 18.C.1A. Frontend consumption mechanism (shared config / API endpoint / generated copy) is Phase 18.C.2's decision. 18.C.1A's only manifest consumers are backend tests + documentation.
- **MEDIUM (§2.1 vs §14 contradiction):** §14 rewrote — 18.C.2 CAN begin after 18.C.1A ships. Rolling-unlock model: 18.C.2 enables only supported-manifest tabs; later 18.C.1B–1E batches expand the manifest, which expands the unlocked tab set.
- **LOW (target-state fields need model audit):** §4.2.3 adds a "Model-audit gate" note. §10.3 adds a third pre-code audit receipt (user-model state field names) reading `backend/models/User.mjs` before implementation.
- **LOW (logging wording — denied vs successful):** §7.1–§7.5 rewrote to be explicit. Only successful impersonations get the `[viewAs]` structured log line (via middleware-attached `finish` listener). Denied-attempt logging is explicitly OUT OF SCOPE for 18.C.1A. Tests at §8.1.4 clarified.

### 15.3 Pre-Round-3 Codex Hygiene Fixes (2026-04-22)

Before Round 3 was sent, Codex ran a pre-check pass and flagged 6 additional hygiene issues. All applied:

- **MEDIUM parsing-strategy order:** §4.2.1 step order corrected — `Array.isArray(raw)` check now precedes `typeof raw !== 'string'`. Arrays have `typeof === 'object'`, so the array-specific error message would otherwise be shadowed by the generic shape error. Step-order note added explicitly.
- **MEDIUM duplicate §6.4:** deleted the older/shorter §6.4 that reappeared after the §6.5/§6.6 insertions. One canonical §6.4 remains (with auth/token and read-side-effect risks, from Round 1).
- **MEDIUM helper strictness:** §6.1 helper tightened from `Number.isFinite` to `Number.isSafeInteger(x) && x > 0`. Defensive even if middleware was bypassed/buggy. §8.2 tests expanded to cover `0`, `-1`, `1.5`, `Infinity`, `NaN`, string `'42'`, `MAX_SAFE_INTEGER + 1`, and missing `req.user`.
- **LOW/MEDIUM §2.1/§14 manifest wording:** Phase 18.C.2 row no longer says "Reads the supported-endpoint manifest" (implies direct Vite import). Now says "consumes supported-endpoint status via a mechanism chosen in 18.C.2's own planning (derived from the backend manifest)". §14 rolling-unlock paragraph clarified similarly.
- **LOW stale Codex-cycle references:** §12 updated — "Codex Round 2" → "Codex Round 3" in default path. §14 exit criterion #8 — "Codex Round 2 APPROVE" → "Codex Round 3 APPROVE on the revised plan; Round 4 on pre-code receipts; Round 5 on implementation diff".
- **LOW denied-attempt rollout guard:** §7.2 adds explicit pre-18.C.2-rollout guard. Deferring denied-attempt logging is OK for 18.C.1A only while the feature is frontend-inert. Before 18.C.2 goes live, either denied-attempt logging lands (possible Phase 18.C.1F) or equivalent abuse-visibility mechanism. Specific abuse vectors enumerated (target enumeration, malformed-param attempts, role-gate 403s).

### 15.4 Round 3 (COMPLETE — 2026-04-22)

Codex Round 3 verdict: **REVISE** (3 LOW findings).

Findings applied:
- **LOW (stale helper strictness text at line 472)** — §11.1 risk note updated from `Number.isFinite` → `Number.isSafeInteger(req.viewAsUserId) && req.viewAsUserId > 0`, aligning with §6.1 helper and §15.3 hygiene summary.
- **LOW (stale status header at line 6)** — changed from "Codex Round 1 review" to current multi-round status with Round 4 pending.
- **LOW (Round 1 count inconsistency at line 498)** — corrected from "4 HIGH/MEDIUM + 1 LOW" to "5 HIGH/MEDIUM + 1 LOW (3 HIGH + 2 MEDIUM + 1 LOW)", matching the enumeration in §15.1 at lines 545-551.

### 15.5 Round 4 (COMPLETE — 2026-04-22)

Codex Round 4 verdict: **REVISE** (1 LOW finding).

Finding applied:
- **LOW (stale Codex-cycle references after Round 3 shifted the planning gate):** Round 3 REVISE meant the planning-doc approval gate shifted from Round 3 to Round 4 (and downstream gates from 4→5, 5→6). Lines 502, 507, 529, and old §15.5/601-603 still cited Round 3 as planning-gate. **Structural fix:** all forward-looking Codex-cycle references are now round-agnostic ("next Codex APPROVE on the planning doc", "Codex APPROVE on the pre-code audit receipts", "Codex APPROVE on the implementation diff"). Stops the drift at its source — future REVISE cycles no longer create stale round-number references. §15.6 handoff convention carries the round-agnostic canonical gate list; §15.1–§15.5 keep specific round numbers for historical record.

### 15.6 Round 5 (COMPLETE — 2026-04-22)

Codex Round 5 verdict: **REVISE** (2 LOW findings — stale forward refs that survived the Round 4 structural rewrite).

Findings applied:
- **LOW (stale status header at line 6 still citing "Round 4 pending"):** rewritten to round-agnostic — "Currently pending the **next Codex APPROVE verdict on the planning doc**. Forward-looking references in this doc are round-agnostic per §15.9 handoff convention."
- **LOW (§12 decision #1 at line 502 still citing "Round-4-ready planning doc" and "Codex Round 4 prompt"):** rewritten to "Accept the revised planning doc as-is → I draft the next Codex planning-doc review prompt. On Codex APPROVE, first concrete 18.C.1A task is the three pre-code audit receipts."

Both fixes complete the structural round-agnostic rewrite started in Round 4 — no forward-looking gate language in the doc cites specific round numbers after this point. Remaining "Round N" references are all historical (finding-attribution tags like "Codex Round 2 MEDIUM" in §4.2.1/§6.5/§7.1/§8.1/§10.3, or the §15.1–§15.8 round log).

### 15.7 Round 6 (COMPLETE — 2026-04-22)

Codex Round 6 verdict: **REVISE** (2 LOW findings — ledger drift; §15 ledger wasn't updated when Round 5 fixes were applied).

Findings applied:
- **LOW (§15 ledger still ends at Round 4):** added §15.6 Round 5 entry + this §15.7 Round 6 entry. Grand total in §15.8 updated to 26 (R1:6 + R2:6 + Hygiene:6 + R3:3 + R4:1 + R5:2 + R6:2).
- **LOW (next-step pointer at line 594 still cited "post-Round-4-REVISE"):** §15.8 next-step pointer rewritten to "post-Round-6-REVISE revised doc (this state)".

Both fixes catch the ledger up to the current review state. §15.9 handoff convention's "Rounds completed so far" list also updated to include Rounds 5 and 6.

### 15.8 Next Gate (PENDING)

Next step: Sean sends Codex the next planning-doc-review prompt pointing at the post-Round-6-REVISE revised doc (this state).

Running total of findings applied across all rounds:
- Round 1: 3 HIGH + 2 MEDIUM + 1 LOW = 6
- Round 2: 1 HIGH + 3 MEDIUM + 2 LOW = 6
- Pre-Round-3 hygiene pass: 6 fixes
- Round 3: 3 LOW = 3
- Round 4: 1 LOW = 1
- Round 5: 2 LOW = 2
- Round 6: 2 LOW = 2
- **Grand total: 26 findings applied**

Expected next-round verdict: **APPROVE** if no contradictions remain. Rounds 3–6 all caught bookkeeping drift of various kinds (stale round numbers, un-updated ledger). The round-agnostic forward-language rewrite (Round 4) + the ledger update (Round 6) together should close that class of drift. If another round still REVISEs on bookkeeping, the ledger itself needs a structural rewrite too (e.g. auto-generated from rounds completed, or dropped entirely).

### 15.9 Handoff convention (round-agnostic forward references)

No code committed, no push, until three successive Codex APPROVE verdicts, in order:

1. **Codex APPROVE on the planning doc** (this document; closes the planning gate after the sequence of REVISE cycles).
2. **Codex APPROVE on the pre-code audit receipts** (mount-point + user-model-state + controller audit for E1+E2).
3. **Codex APPROVE on the actual implementation diff**.

Round numbers deliberately not cited in these forward references — each REVISE cycle advances the counter (already drifted multiple times), so binding gate names to specific round numbers creates stale-reference churn. Rounds 3, 4, 5, and 6 REVISE findings all flagged this exact drift; round-agnostic language is the structural fix.

Rounds completed so far (for historical context only, see §15.1–§15.7):
- Round 1: REVISE (content findings)
- Round 2: REVISE (content findings)
- Pre-Round-3 hygiene: 6 fixes applied
- Round 3: REVISE (bookkeeping — 3 LOW)
- Round 4: REVISE (stale round-number references — 1 LOW, structural round-agnostic rewrite)
- Round 5: REVISE (stale refs that survived Round 4 rewrite — 2 LOW)
- Round 6: REVISE (ledger drift — 2 LOW, §15 ledger catch-up)
- Next: planning-doc gate re-review.

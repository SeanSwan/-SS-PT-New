# 03 — API Contracts & Interfaces (harvested from live code 2026-07-13, file:line cited)

These are the REAL handler behaviors, not doc comments. If a live response disagrees, STOP (ban #19).

## §0 Base URL & transport

- Production API origin: `https://sswanstudios.com` (web hardcodes this in
  `frontend/src/utils/axiosConfig.ts:15-38`; timeout 10000ms).
- Mobile: `mobile/src/config/env.ts` exports `{ apiBaseUrl }` read from `EXPO_PUBLIC_API_BASE_URL`
  with default `https://sswanstudios.com`. No trailing slash.
- Auth header: `Authorization: Bearer <accessToken>` on every authenticated request.
- All error responses are `{ success: false, message: string }` unless noted.

## §1 POST `/api/auth/login`

Handler `backend/controllers/authController.mjs:750`; rate-limited 10 req/15min/IP (router) PLUS a
controller-side per-IP/per-username limiter (429 "Too many login attempts. Please try again later.").

Request: `{ "username": string, "password": string }` — `username` accepts username OR email
(backend ORs both, authController.mjs:786-792). The mobile "Email or username" field maps to `username`.

Success 200:
```json
{ "success": true, "user": { ...full user object... }, "token": "<accessJWT>", "refreshToken": "<refreshJWT>" }
```
Special success 200 (forced first-login password change, authController.mjs:873-878):
```json
{ "success": true, "forcePasswordChange": true, "tempToken": "<15m JWT>", "message": "Password change required before first use" }
```
Mobile v1 handling of `forcePasswordChange`: show blocking message
"Please finish setting up your account on the SwanStudios website first, then sign in here."
and do NOT store tokens. (Password-change flow is out of scope v1.)

Errors: 400 missing fields · 401 "Invalid credentials" (user not found OR bad password) ·
401 "Account is locked. Please contact support." · 401 "Account is inactive. Please contact support." ·
429 (two variants) · 500. Map to the three banner strings in 02-wireframes S1.

Token TTLs (authController.mjs:253-254): access default **24h** (`JWT_EXPIRES_IN`), refresh **7d**
(`REFRESH_TOKEN_EXPIRES_IN`). (Doc comments claiming 3h are stale — trust these.)

## §2 Session lifecycle

- `GET /api/auth/me` (authController.mjs:1159, behind `protect`) → 200
  `{ "success": true, "user": {...} }`; 401 `{success:false,message}` variants:
  "Not authorized, no token" / "Invalid token type" / "User not found" / token-expired.
- `POST /api/auth/refresh-token` (authController.mjs:990; 20 req/15min/IP) —
  request `{ "refreshToken": string }` → 200 `{ "success": true, "token": "<new access>", "refreshToken": "<new refresh>" }`.
  **ROTATION:** both tokens are reissued and the server stores ONE bcrypt refresh hash per user
  (`User.refreshTokenHash`). Persist BOTH new tokens atomically before any other request. A reused
  old refresh token returns 401 "Invalid refresh token" and revokes the stored hash entirely.
  All 401s from this endpoint → wipe tokens, route to S1.
- **KNOWN LIMITATION (single active refresh token per user):** logging in on mobile overwrites the
  hash, silently breaking the user's WEB refresh token (web keeps working until its 24h access token
  expires, then re-login). Accepted for v1; do not "fix" server-side.
- 401-retry policy: single-flight — one refresh in progress at a time; queue concurrent 401'd
  requests; replay each ONCE; second 401 → logout.

## §3 POST `/api/workout/sessions` — save a workout

**Mount-order truth:** `/api/workout` (routes.mjs:347) shadows `/api/workout/sessions`
(routes.mjs:348); this POST is handled by `workoutController.createWorkoutSession`
(workoutController.mjs:295), NOT by the Zod-validated `workoutSessionRoutes` (that schema is dead
code for this verb). The controller **whitelists** exactly these body fields (others silently dropped):

`title, description, plannedStartTime, actualStartTime, actualEndTime, status, notes,
workoutPlanId, exercises, duration, sessionDate, nasmPhase, targetMuscleGroups, difficulty, type, userId`

Mobile payload (map from logger state; omit `userId` — defaults to the JWT user):
```json
{
  "title": "<workout title>",
  "status": "completed",
  "sessionDate": "<ISO8601 of session start>",
  "actualStartTime": "<ISO8601>",
  "actualEndTime": "<ISO8601>",
  "duration": <int minutes>,
  "notes": "<user notes, may be empty>",
  "workoutPlanId": "<uuid | omit if no plan>",
  "exercises": [
    { "name": "<exercise name>", "sets": [ { "setNumber": 1, "weight": 95, "reps": 10 } ] }
  ]
}
```
Success 201 envelope (responseUtils.mjs:13): `{ "success": true, "message": "Success", "data": { "session": {...} } }`.
403 if posting for another user. Treat any non-201 (or network failure) as enqueue-for-retry.

Model truth (backend/models/WorkoutSession.mjs, table `workout_sessions`): session-level columns
only — `id(UUID), userId(int), title, date, duration(int min), intensity(1-10|null), notes,
totalWeight(float), totalReps(int), totalSets(int), status(planned|in_progress|completed|skipped|cancelled),
startedAt, completedAt, sessionType('solo'|'trainer-led'), workoutPlanId(UUID|null), trainerId(int|null)…`
There is NO `exercises` column — per-exercise detail persists via associated logs. **Never assume
per-exercise data returns on list endpoints.**

## §4 Reads

- **Current plan:** `GET /api/workouts/:userId/current` (clientWorkoutRoutes.mjs:58; `protect` +
  `ensureClientAccess` — use the logged-in user's own id). 200 always:
  - no plan: `{ "success": true, "data": null, "plan": null, "todayAssignment": ..., "message": ... }`
  - plan: `{ "success": true, "data": <enrichedPlan>, "plan": <same>, "currentSession": ..., "todayAssignment": ... }`
  Mobile reads `data`; `data === null` → S2 empty state. Parse defensively with zod: pick only
  `title`, `exercises[]` (name, sets, reps, weight targets) — log-and-null anything unparseable.
- **History:** `GET /api/workouts/:userId/history?limit=<n≤100>` (clientWorkoutRoutes.mjs:166) →
  `{ "success": true, "data": [ ...completed sessions, completedAt DESC ] }`. Use for S5 + S6.
  (v1 uses `limit=100`, client-side range filter; no offset pagination on this endpoint.)
- **Gamification (Home tiles):** `GET /api/v1/gamification/profile`
  (gamificationV1Routes.mjs:607-610) → `{ "profile": { points, level, tier, streakDays, ... } }`
  (hook-unwrap `data.profile ?? data`). Mobile uses ONLY `streakDays`. Failure → hide the streak
  tile (never block Home).
- **Analytics (later phases; NOT v1):** `GET /api/client/analytics/chart-*` — userId is
  JWT-injected server-side (clientAnalyticsRoutes.mjs:72-77); envelope `{ success, data: [{x,y}...] }`.

## §5 Mobile-internal interfaces (builder must create exactly)

```ts
// mobile/src/services/tokenStore.ts
export interface TokenStore {
  getAccessToken(): Promise<string | null>;
  getRefreshToken(): Promise<string | null>;
  setTokens(access: string, refresh: string): Promise<void>;  // atomic pair-write
  clear(): Promise<void>;
}
export const secureTokenStore: TokenStore; // expo-secure-store keys: 'ss.access', 'ss.refresh'

// mobile/src/services/apiClient.ts
export class ApiError extends Error { constructor(public status: number, public serverMessage: string) }
export interface ApiClient {
  get<T>(path: string, schema: ZodType<T>): Promise<T>;
  post<T>(path: string, body: unknown, schema: ZodType<T>): Promise<T>;
}
export function createApiClient(baseUrl: string, tokens: TokenStore, onAuthFailure: () => void): ApiClient;
// fetch-based; 10s timeout (AbortController); Bearer header; single-flight 401→refresh→replay-once.

// mobile/src/services/offlineQueue.ts
export interface QueuedSave { draftId: string; payload: SaveWorkoutBody; queuedAt: string; attempts: number; }
export const offlineQueue: {
  enqueue(item: QueuedSave): Promise<void>;          // dedupes by draftId
  flush(api: ApiClient): Promise<{ sent: number; remaining: number }>;
  pending(): Promise<QueuedSave[]>;
};
// storage: expo-file-system JSON file; flush on NetInfo reconnect + AppState 'active';
// backoff 30s → 5m (cap), max 20 attempts, then keep with attempts frozen + surface banner.

// mobile/src/features/workout/draftStore.ts
export interface WorkoutDraft { draftId: string; planTitle: string; startedAt: string;
  exercises: { name: string; targetText: string; sets: { setNumber: number; weight: string; reps: string; logged: boolean }[] }[]; }
export const draftStore: { save(d: WorkoutDraft): Promise<void>; load(): Promise<WorkoutDraft | null>; clear(): Promise<void>; };
```

## §6 Contract regression tests (backend side, Slice 0.3 — the ONLY backend files allowed)

`backend/tests/contracts/mobile-v1-contracts.test.mjs` — supertest against the app: asserts
(a) login 400/401 shapes, (b) `/api/auth/me` 401 shape, (c) mount-order: POST `/api/workout/sessions`
reaches `workoutController` (spy/route-stack walk), (d) `GET /api/workouts/:userId/current` envelope
keys, (e) history envelope keys. Additive-only lock: these tests failing = a backend change broke
the mobile contract.

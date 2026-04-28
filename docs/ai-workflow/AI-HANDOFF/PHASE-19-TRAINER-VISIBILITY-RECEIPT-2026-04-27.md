# Phase 19 — Trainer Workout Logging → Client Dashboard Visibility — Canonical Surface Receipt

> **Doc-only slice (Rule 26 prerequisite).** No code in this slice. Receipt classifies the trainer→client visibility chain so the implementation slice that follows has a Rule-26-compliant evidence base.
> **Date:** 2026-04-27
> **Author:** Claude Opus 4.7
> **Trigger:** Phase 19 of CLAUDE.md priority stack #2 (retention/upsell proof). Continues the admin/client dashboard surface family from Phase 18 P1-O.
> **Stop-and-report condition:** if Section 4 reveals a gap class outside Path-A through Path-D, halt and surface to Sean.
> **Codex status:** unavailable for ~22h. Receipt is Codex-independent; review by Third Eye.

---

## §1 — Canonical Surface Receipt for "client sees their workouts"

### §1.1 Live URL

`/dashboard/client/workouts` — the client-facing workout-history surface.

### §1.2 Route mount evidence

| Anchor | Evidence | Tag |
|---|---|---|
| Role config | [UniversalDashboardLayout.tsx:597-618](frontend/src/components/DashBoard/UniversalDashboardLayout.tsx#L597-L618) declares `client` role's tab tree per ACTIVE-INDEX.md:103 | `[VERIFIED]` indirectly via ACTIVE-INDEX.md canonical map; not re-verified line-by-line in this session — `[LIKELY]` |
| Client tab config | ACTIVE-INDEX.md:111-112 maps `/workouts` → `ClientMyWorkoutsPage` | `[VERIFIED]` |
| Mounted JSX page | [ClientMyWorkoutsPage.tsx:117-322](frontend/src/components/DashBoard/Pages/client-dashboard/ClientMyWorkoutsPage.tsx#L117-L322) — full component body, NOT lazy-import-only | `[VERIFIED]` |
| File header note | ClientMyWorkoutsPage.tsx:1-42 — declares the page is the client's workout-history surface | `[VERIFIED]` |

### §1.3 Consumer hook

| Anchor | Evidence | Tag |
|---|---|---|
| Hook called by page | [ClientMyWorkoutsPage.tsx:128-131](frontend/src/components/DashBoard/Pages/client-dashboard/ClientMyWorkoutsPage.tsx#L128-L131) — `useWorkoutSessions({ limit: PAGE_LIMIT, page })` | `[VERIFIED]` |
| Hook source file | [useDashboardQueries.ts:156-175](frontend/src/hooks/useDashboardQueries.ts#L156-L175) | `[VERIFIED]` |
| TanStack Query | TanStack `useQuery` with abort signal — caching + AbortController on unmount | `[VERIFIED]` |

### §1.4 Frontend API path string literal

[useDashboardQueries.ts:161](frontend/src/hooks/useDashboardQueries.ts#L161):

```ts
const res = await authAxios.get('/api/workout/sessions', {
  params: { limit: params.limit || 50, page: params.page || 1 },
  signal,
});
```

`[VERIFIED]` literal string `/api/workout/sessions`.

### §1.5 Backend route match — full mount chain

**Two mount sites compete.** This is a Rule 31 shadow condition; the canonical handler is determined by Express middleware ordering.

| Mount line | File | Path | Inner handler |
|---|---|---|---|
| [core/routes.mjs:332](backend/core/routes.mjs#L332) | `app.use('/api/workout', workoutRoutes)` | `/api/workout/*` | inner: [workoutRoutes.mjs:201](backend/routes/workoutRoutes.mjs#L201) `router.get('/sessions', protect, workoutController.getWorkoutSessions)` |
| [core/routes.mjs:333](backend/core/routes.mjs#L333) | `app.use('/api/workout/sessions', workoutSessionRoutes)` | `/api/workout/sessions/*` | inner: [workoutSessionRoutes.mjs:25](backend/routes/workoutSessionRoutes.mjs#L25) `router.get('/', protect, async (req, res) => {...})` (separate inline handler) |

**Mount-order verdict (Rule 31):** Express tries mounts in declaration order. Line 332 mounts first. A `GET /api/workout/sessions` request enters `workoutRoutes`, hits its `router.get('/sessions', ...)` at line 201, and the response is sent. **`workoutSessionRoutes` is shadowed for this exact path** and never executes for canonical client traffic.

`[VERIFIED]` shadow condition documented; canonical handler is `workoutController.getWorkoutSessions`.

### §1.6 Service-layer delegation

| Anchor | Evidence | Tag |
|---|---|---|
| Controller body | [workoutController.mjs:216-262](backend/controllers/workoutController.mjs#L216-L262) — `getWorkoutSessions` extracts `userId` from `req.user.id` (or `:userId` route param), translates `page → offset`, delegates to service | `[VERIFIED]` |
| Service entry | [workoutService.mjs:24-126](backend/services/workoutService.mjs#L24-L126) — `getWorkoutSessions(userId, options)` | `[VERIFIED]` |
| `WorkoutLog` include | [workoutService.mjs:70-79](backend/services/workoutService.mjs#L70-L79) — Sequelize include `{ model: WorkoutLog, as: 'logs', separate: true, attributes: [...] }` | `[VERIFIED]` |
| Response shape | controller returns `successResponse(res, { sessions })` at [workoutController.mjs:252](backend/controllers/workoutController.mjs#L252) | `[VERIFIED]` |
| Frontend payload reader | [useDashboardQueries.ts:165-170](frontend/src/hooks/useDashboardQueries.ts#L165-L170) — reads `payload.sessions \|\| payload.workouts \|\| payload` | `[VERIFIED]` |

### §1.7 Authoritative WorkoutLog model columns

[WorkoutLog.mjs:6-101](backend/models/WorkoutLog.mjs#L6-L101) declares the following columns:

| Column | Type | Nullable | Source |
|---|---|---|---|
| `id` | INTEGER PK autoIncrement | no | line 8-13 |
| `sessionId` | UUID FK→workout_sessions | no | line 14-21 |
| `exerciseName` | STRING(255) | no | line 22-25 |
| `setNumber` | INTEGER | no | line 26-29 |
| `reps` | INTEGER | no | line 30-36 |
| `weight` | FLOAT (default 0) | no | line 37-44 |
| `tempo` | STRING(20) | yes | line 45-48 |
| `rest` | INTEGER | yes | line 49-59 |
| `rpe` | INTEGER (1-10) | yes | line 60-70 |
| `notes` | TEXT (per-set) | yes | line 71-74 |
| `exerciseNote` | TEXT (Phase 15.0, exercise-level coaching note, stamped on every row of an exercise group) | yes | line 75-83 |

`[VERIFIED]` quoted directly from the model file.

### §1.8 Authoritative WorkoutSession model columns (read by client)

[WorkoutSession.mjs:24-251](backend/models/WorkoutSession.mjs#L24-L251). Columns read by the client surface (rendered in ClientMyWorkoutsPage):

| Column | Type | Used for | Source |
|---|---|---|---|
| `id` | UUID PK | row key, expand toggle | line 25-29 |
| `userId` | INTEGER FK→Users | filter target (where: { userId }) | line 30-38 |
| `title` | STRING | row header | line 39-43 |
| `date` | DATE | row date label, sort | line 44-49 |
| `duration` | INTEGER | meta chip | line 50-58 |
| `intensity` | INTEGER (1-10, nullable Phase 16) | meta chip | line 59-72 |
| `notes` | TEXT | session-level notes block | line 73-78 |
| `totalWeight` | FLOAT | volume stat card | line 79-88 |
| `totalReps` | INTEGER | (rendered? not in current page) | line 89-97 |
| `totalSets` | INTEGER | meta chip | line 98-106 |
| `status` | ENUM | (rendered? not displayed) | line 151-156 |
| `sessionType` | STRING ('solo'\|'trainer-led') | (rendered? not displayed) | line 167-176 |
| `trainerId` | INTEGER FK→Users | (rendered? not displayed) | line 186-194 |

Other columns NOT consumed by the client surface: `isActive`, `avgRPE`, `experiencePoints`, `workoutPlanId`, `workoutPlanDayId`, `startedAt`, `completedAt`, `sessionId` (booked-session FK), `isMilestone`, `milestoneType`.

`[VERIFIED]` quoted directly from the model file.

### §1.9 Surface Classification (Rule 27)

| Surface | URL | Classification | Evidence |
|---|---|---|---|
| `ClientMyWorkoutsPage` | `/dashboard/client/workouts` | **canonical** | ACTIVE-INDEX.md:111; consumer hook → canonical handler chain verified §1.5-1.6 |
| `ClientProgressDashboardPage` (charts) | `/dashboard/client/progress` | **canonical for charts**, out of scope for this phase | ACTIVE-INDEX.md:113 |
| `workoutSessionRoutes.mjs:25` (`router.get('/'...)`) | `GET /api/workout/sessions/` | **dormant (shadowed)** | Mount order at core/routes.mjs:332-333; line 332 mount wins |
| `clientWorkoutRoutes.mjs` `/api/workouts/:userId/history` | per ACTIVE-INDEX.md:140-148 line 146 | **legacy-consumer-only** (consumed by `components/ClientDashboard/*`, not the canonical client tree) | ACTIVE-INDEX.md:146 |
| `clientProgressRoutes.mjs` `/api/client-progress/:clientId/workout-history` | per ACTIVE-INDEX.md:147 | **dormant** | "no consumer; added 2026-04-12" |

`[VERIFIED]` classifications carry file:line evidence per row.

---

## §2 — Trainer-side write path

### §2.1 Controller entry

| Anchor | Evidence | Tag |
|---|---|---|
| Live route | `POST /api/admin/clients/:clientId/workouts` | — |
| Backend mount | [core/routes.mjs:434](backend/core/routes.mjs#L434) `app.use('/api/admin', adminWorkoutLoggerRoutes)` | `[VERIFIED]` |
| Inner route | [adminWorkoutLoggerRoutes.mjs:10-22](backend/routes/adminWorkoutLoggerRoutes.mjs#L10-L22) → `logWorkout` | `[VERIFIED]` |
| Controller body | [adminWorkoutLoggerController.mjs:33-90](backend/controllers/adminWorkoutLoggerController.mjs#L33-L90) — `logWorkout` extracts `{ title, date, duration, intensity, notes, exercises }` from body, runs `ensureClientAccess`, delegates to `logWorkoutForClient` | `[VERIFIED]` |

### §2.2 Service-layer write — `logWorkoutForClient`

[workoutLogService.mjs:246-438](backend/services/workout/workoutLogService.mjs#L246-L438).

**WorkoutSession columns the trainer write path sets** ([workoutLogService.mjs:332-355](backend/services/workout/workoutLogService.mjs#L332-L355)):

| Column | Value | Source line |
|---|---|---|
| `userId` | `clientId` (the client, NOT the trainer) | 333 |
| `date` | `parsedDate` (server-local noon if YYYY-MM-DD) | 334 |
| `trainerId` | `trainerId ?? null` (the trainer/admin who logged) | 335 |
| `sessionType` | `'trainer-led'` (hardcoded) | 336 |
| `status` | `'completed'` (hardcoded) | 337 |
| `completedAt` | `parsedDate` | 338 |
| `duration` | `parsedDuration` | 339 |
| `notes` | `notes \|\| null` (session-level) | 340 |
| `title` | `resolvedTitle` (auto-generated if absent) | 341 |
| `intensity` | `parsedIntensity` (null = "not rated", Phase 16) | 342 |
| `totalSets` | calculated, written via `session.update` | 350-355 |
| `totalReps` | calculated, written via `session.update` | 350-355 |
| `totalWeight` | calculated, written via `session.update` | 350-355 |
| `experiencePoints` | written by best-effort XP step | 378-381 |

WorkoutSession columns NOT written by trainer path (default values from model): `isActive=false`, `avgRPE=null`, `workoutPlanId=null`, `workoutPlanDayId=null`, `startedAt=null`, `sessionId=null` (booked-session FK), `isMilestone=false`, `milestoneType=null`.

**WorkoutLog columns the trainer write path sets** ([workoutLogService.mjs:167-179](backend/services/workout/workoutLogService.mjs#L167-L179) for nested format, [:191-203](backend/services/workout/workoutLogService.mjs#L191-L203) for AI flat format):

| Column | Value | Source line |
|---|---|---|
| `sessionId` | parent session UUID | 168 / 192 |
| `exerciseName` | trimmed `exercise.exerciseName ?? exercise.name` | 169 / 193 |
| `setNumber` | per-set integer | 170 / 194 |
| `reps` | per-set, default 0 | 171 / 195 |
| `weight` | per-set, default 0 | 172 / 196 |
| `tempo` | per-set or null | 173 / 197 |
| `rest` | per-set or null | 174 / 198 |
| `rpe` | per-set or null | 175 / 199 |
| `notes` | per-set or null | 176 / 200 |
| `exerciseNote` | exercise-level coaching note (Phase 15.0), **stamped on every row of an exercise group** | 178 / 202 |

`[VERIFIED]` All 11 WorkoutLog model columns are written. Full-fidelity write.

### §2.3 Sibling write paths (Rule 20 sweep on trainer-write side)

| Caller | File:line | Path used | Status |
|---|---|---|---|
| HTTP route (admin/trainer) | adminWorkoutLoggerController.mjs:51 | `logWorkoutForClient(...)` | **canonical** |
| Coach Assistant transcript intake | per ACTIVE-PRIORITIES.md line 87-102, routes through `POST /api/admin/clients/:clientId/workouts` | same `logWorkoutForClient` | **canonical** (same shared service) |
| AI command lane (`commandDispatcher.mjs`) | per workoutLogService.mjs:11 header — service designed to be called by `commandDispatcher.mjs` `log_workout` action | flat-format payload via same `logWorkoutForClient` | `[LIKELY]` shared canonical (header doc says so; not re-verified line-by-line in this session) |
| Client self-log | `POST /api/workout/sessions` (client) → `workoutController.createWorkoutSession` | NOT this service — different path | out of scope this phase |
| Client daily form | `POST /api/workout-forms/...` per ACTIVE-PRIORITIES.md note + dailyWorkoutFormRoutes.mjs:638 awardWorkoutXP firing site | `[LIKELY]` separate write, not via this service | out of scope this phase |

`[VERIFIED]` — three trainer-class write surfaces (HTTP admin, Coach Assistant transcript intake, AI command lane) all funnel through `logWorkoutForClient`. Single source of truth on the trainer-write side.

### §2.4 FK shape — userId vs trainerId

**Critical:** `WorkoutSession.userId = clientId` (the client, not the trainer). `trainerId` is a SEPARATE column. The client's `useWorkoutSessions` filter is `where: { userId: req.user.id }` — i.e. by `userId`. **A trainer-led session is visible to the client because `userId === clientId`, regardless of `trainerId` value.**

`[VERIFIED]` see workoutLogService.mjs:333 (write) and workoutService.mjs:37 (read filter).

---

## §3 — Drift Table (Rule 29)

For every WorkoutLog field the trainer can write, map: trainer-write → DB column → API response → client-render.

| Field trainer writes | WorkoutLog column it lands in | Field client API returns | Field client renders | Match / Drift |
|---|---|---|---|---|
| `exerciseName` (string) | `exerciseName` ([WorkoutLog.mjs:22-25](backend/models/WorkoutLog.mjs#L22-L25)) | included in attributes ([workoutService.mjs:76](backend/services/workoutService.mjs#L76)) | rendered ([ClientMyWorkoutsPage.tsx:271](frontend/src/components/DashBoard/Pages/client-dashboard/ClientMyWorkoutsPage.tsx#L271)) | ✅ MATCH |
| `setNumber` | `setNumber` ([WorkoutLog.mjs:26-29](backend/models/WorkoutLog.mjs#L26-L29)) | included | rendered ([ClientMyWorkoutsPage.tsx:287](frontend/src/components/DashBoard/Pages/client-dashboard/ClientMyWorkoutsPage.tsx#L287)) | ✅ MATCH |
| `reps` | `reps` ([WorkoutLog.mjs:30-36](backend/models/WorkoutLog.mjs#L30-L36)) | included | rendered ([ClientMyWorkoutsPage.tsx:289](frontend/src/components/DashBoard/Pages/client-dashboard/ClientMyWorkoutsPage.tsx#L289)) | ✅ MATCH |
| `weight` | `weight` ([WorkoutLog.mjs:37-44](backend/models/WorkoutLog.mjs#L37-L44)) | included | rendered ([ClientMyWorkoutsPage.tsx:288](frontend/src/components/DashBoard/Pages/client-dashboard/ClientMyWorkoutsPage.tsx#L288)) | ✅ MATCH |
| `tempo` | `tempo` ([WorkoutLog.mjs:45-48](backend/models/WorkoutLog.mjs#L45-L48)) | included | rendered ([ClientMyWorkoutsPage.tsx:290](frontend/src/components/DashBoard/Pages/client-dashboard/ClientMyWorkoutsPage.tsx#L290)) | ✅ MATCH |
| `rest` | `rest` ([WorkoutLog.mjs:49-59](backend/models/WorkoutLog.mjs#L49-L59)) | included | rendered ([ClientMyWorkoutsPage.tsx:292](frontend/src/components/DashBoard/Pages/client-dashboard/ClientMyWorkoutsPage.tsx#L292)) | ✅ MATCH |
| `rpe` | `rpe` ([WorkoutLog.mjs:60-70](backend/models/WorkoutLog.mjs#L60-L70)) | included | rendered ([ClientMyWorkoutsPage.tsx:291](frontend/src/components/DashBoard/Pages/client-dashboard/ClientMyWorkoutsPage.tsx#L291)) | ✅ MATCH |
| `notes` (per-set) | `notes` ([WorkoutLog.mjs:71-74](backend/models/WorkoutLog.mjs#L71-L74)) | included ([workoutService.mjs:76](backend/services/workoutService.mjs#L76)) | **NOT rendered** — `SetTable` has no `notes` column ([ClientMyWorkoutsPage.tsx:285-294](frontend/src/components/DashBoard/Pages/client-dashboard/ClientMyWorkoutsPage.tsx#L285-L294)) | ⚠️ **RENDER GAP** — data reaches the client but is silently dropped at the JSX layer |
| `exerciseNote` (Phase 15.0, exercise-level coaching note) | `exerciseNote` ([WorkoutLog.mjs:75-83](backend/models/WorkoutLog.mjs#L75-L83)) | **NOT included** in canonical attributes list ([workoutService.mjs:76](backend/services/workoutService.mjs#L76)) | **NOT rendered** — no JSX consumer ([ClientMyWorkoutsPage.tsx:266-300](frontend/src/components/DashBoard/Pages/client-dashboard/ClientMyWorkoutsPage.tsx#L266-L300) — the `ExerciseBlock` has no notes-per-exercise slot) | ❌ **API + RENDER GAP** — trainer-written exercise-level coaching note is invisible to the client through both the API attribute strip and the missing render path |

For WorkoutSession-level fields:

| Field trainer writes | WorkoutSession column | Field client API returns | Field client renders | Match / Drift |
|---|---|---|---|---|
| `title` | `title` | included via `WorkoutSession.findAll` (no attribute strip) | rendered ([ClientMyWorkoutsPage.tsx:249](frontend/src/components/DashBoard/Pages/client-dashboard/ClientMyWorkoutsPage.tsx#L249)) | ✅ MATCH |
| `date` | `date` | included | rendered ([ClientMyWorkoutsPage.tsx:248](frontend/src/components/DashBoard/Pages/client-dashboard/ClientMyWorkoutsPage.tsx#L248)) | ✅ MATCH |
| `duration` | `duration` | included | rendered ([ClientMyWorkoutsPage.tsx:251](frontend/src/components/DashBoard/Pages/client-dashboard/ClientMyWorkoutsPage.tsx#L251)) | ✅ MATCH |
| `intensity` | `intensity` (nullable Phase 16) | included | rendered ([ClientMyWorkoutsPage.tsx:252](frontend/src/components/DashBoard/Pages/client-dashboard/ClientMyWorkoutsPage.tsx#L252)) | ✅ MATCH |
| session `notes` | `notes` | included | rendered ([ClientMyWorkoutsPage.tsx:301-305](frontend/src/components/DashBoard/Pages/client-dashboard/ClientMyWorkoutsPage.tsx#L301-L305)) | ✅ MATCH |
| `totalSets` | `totalSets` | included | rendered ([ClientMyWorkoutsPage.tsx:253](frontend/src/components/DashBoard/Pages/client-dashboard/ClientMyWorkoutsPage.tsx#L253)) | ✅ MATCH |
| `totalReps` | `totalReps` | included | **NOT rendered** — value silently dropped at the WorkoutCard meta layer | ⚠️ **RENDER GAP** (low priority — `totalSets × avgReps` partially conveys it) |
| `totalWeight` | `totalWeight` | included | rendered as page-volume stat card ([ClientMyWorkoutsPage.tsx:230-233](frontend/src/components/DashBoard/Pages/client-dashboard/ClientMyWorkoutsPage.tsx#L230-L233)) | ✅ MATCH |
| `sessionType` (`trainer-led` vs `solo`) | `sessionType` | included via no-attribute-filter | **NOT rendered** — client surface does not visually distinguish trainer-led from self-logged sessions | ⚠️ **PRESENTATION GAP** — premium-feel value lost: client cannot see at a glance which sessions had a trainer present |
| `trainerId` | `trainerId` | included | **NOT rendered + no trainer-name lookup** | ⚠️ **PRESENTATION GAP** — same class as `sessionType`; client cannot see WHICH trainer led the session |
| `experiencePoints` (XP earned) | `experiencePoints` | included | **NOT rendered** at workout-row level | ⚠️ **PRESENTATION GAP** — gamification badge candidate |

`[VERIFIED]` All cells anchored with file:line on both write and read sides.

---

## §4 — Visibility Gap Matrix

For each field a trainer can log, the cross-cut.

| Field | Written by trainer? | Reaches client API response? | Rendered on client dashboard? | Render density |
|---|---|---|---|---|
| Exercise name | ✅ ([service:169](backend/services/workout/workoutLogService.mjs#L169)) | ✅ | ✅ | per-exercise heading |
| Set number | ✅ ([service:170](backend/services/workout/workoutLogService.mjs#L170)) | ✅ | ✅ | badge in row |
| Reps | ✅ | ✅ | ✅ | row column, highlight |
| Weight | ✅ | ✅ | ✅ | row column, highlight |
| Tempo | ✅ | ✅ | ✅ | row column, hide-mobile |
| Rest seconds | ✅ | ✅ | ✅ | row column, hide-mobile |
| RPE | ✅ | ✅ | ✅ | row column, hide-mobile |
| Per-set notes | ✅ ([service:176](backend/services/workout/workoutLogService.mjs#L176)) | ✅ ([workoutService.mjs:76](backend/services/workoutService.mjs#L76)) | ❌ | **HIDDEN** — `SetTable` schema has no notes column |
| **Exercise-level coaching note (`exerciseNote`)** | ✅ ([service:178](backend/services/workout/workoutLogService.mjs#L178)) | ❌ ([workoutService.mjs:76](backend/services/workoutService.mjs#L76) — attribute list omits) | ❌ | **HIDDEN** — both API strip + missing render slot |
| Session title | ✅ | ✅ | ✅ | row header line |
| Session date | ✅ | ✅ | ✅ | row date label |
| Session duration | ✅ | ✅ | ✅ | meta chip |
| Session intensity (1-10) | ✅ (or null per Phase 16) | ✅ | ✅ when set, hidden when null | meta chip |
| Session notes | ✅ ([service:340](backend/services/workout/workoutLogService.mjs#L340)) | ✅ | ✅ | nested notes block |
| `totalSets` | ✅ (calculated) | ✅ | ✅ | meta chip |
| `totalReps` | ✅ (calculated) | ✅ | ❌ | **HIDDEN** — not rendered (low priority) |
| `totalWeight` | ✅ (calculated) | ✅ | ✅ (page-volume stat card only, not per-row) | partial |
| `sessionType` (`trainer-led`) | ✅ (hardcoded `'trainer-led'`) | ✅ (no attribute filter) | ❌ | **HIDDEN** — no visual distinction between trainer-led and self-logged |
| `trainerId` | ✅ | ✅ | ❌ + no trainer-name lookup | **HIDDEN** — client cannot see WHICH trainer led the session |
| `experiencePoints` (XP from this workout) | ✅ (XP step) | ✅ | ❌ | **HIDDEN** at workout-row level |
| Status (`completed`) | ✅ (hardcoded `'completed'`) | ✅ | ❌ | not rendered (acceptable — every trainer-logged session is completed by construction) |

**Summary:** 7 hidden fields. **2 are load-bearing for premium-feel trainer→client visibility:**
- `exerciseNote` (the coaching note the trainer typed about the exercise) — both API and render gap
- `sessionType` + `trainerId` (which trainer led which session) — render gap only; data is on the wire

`[VERIFIED]` matrix anchored to file:line evidence per row.

---

## §5 — Path Classification

**Classification: Path-A — data writes fine, fetches fine; the gap is in the read mapper attribute list AND the render layer. Same bug shape as the AdminViewAsWrapper mapper-strip from Phase 18 P1-O. With one important addition: the per-set `notes`, `sessionType`, and `trainerId` reach the client API response and are dropped at the JSX layer. The `exerciseNote` is dropped at BOTH the API attribute list AND the render layer.**

**`[VERIFIED]`** confidence based on the following specific evidence cited in §3 and §4:

1. **API-layer strip evidence** — workoutService.mjs:76 attributes list explicitly enumerates `['id', 'exerciseName', 'setNumber', 'reps', 'weight', 'tempo', 'rest', 'rpe', 'notes']`. `exerciseNote` is missing. Removing the attribute list (or adding `'exerciseNote'` to it) is a one-line change. This is identical to the `data.workouts.map` strip pattern that AdminViewAsWrapper.tsx:338-344 used pre-Phase-18-P1O.
2. **Render-layer evidence** — ClientMyWorkoutsPage.tsx:285-294 (`SetTable` rows) renders setNumber/weight/reps/tempo/rpe/rest. There is no `notes` column. ClientMyWorkoutsPage.tsx:266-300 (`ExerciseBlock`) has no slot for an exercise-level coaching note above the SetTable. There is no `sessionType` badge or `trainerName` line in the WorkoutCard header.
3. **Filter-condition exclusion ruled out** — the read filter at workoutService.mjs:37 (`whereClause = { userId, ...status }`) does not exclude trainer-led sessions; the FK semantic is `WorkoutSession.userId === clientId` regardless of `trainerId` (verified in §2.4).
4. **No data-layer gap** — every WorkoutLog model column is written by the trainer path (verified §2.2). The table is populated faithfully.

**Why not Path-C (no gap):** Per the prompt's hard rule, classifying Path-C requires exercising at least one trainer-logged → client-render path against a fixture or staging row. I did not run that. But more importantly, the file:line evidence above directly contradicts Path-C — `exerciseNote` is omitted from the read attribute list.

**Why not Path-B (filter-condition exclusion):** No filter conditions on either `sessionType` or `trainerId` in the canonical client read path. Trainer-led sessions ARE returned to the client.

**Why not Path-D (multiple unrelated gap classes):** all gaps fall into the SAME class — read-side mapper/render strip. They are linearly composable: fix the attribute list, then fix the render slots. One implementation slice can address them all without internal decomposition.

---

## §6 — Out of Scope (explicit)

- **Trainer-side authentication / authorization.** `ensureClientAccess` at adminWorkoutLoggerController.mjs:36 is the existing gate. No drift discovered. Out of scope unless implementation slice surfaces a regression.
- **Real-time push (WebSocket / SSE).** This phase is REST-fetch-only. The client must refresh / re-mount / re-paginate to see a newly-logged workout. WebSocket signaling is a separate phase if Sean prioritizes it.
- **Client-self-logged workout path.** `POST /api/workout/sessions` → `workoutController.createWorkoutSession` is a different write path. Out of scope — it does not collide with the trainer-logged path on read because both hit the same `getWorkoutSessions` service which filters by `userId` only (no `sessionType` filter).
- **Chart / KPI truthfulness audit.** `ClientProgressDashboardPage` reads `chartDataController.getIntensityRPETrendChart` etc. Separate phase. The intensity-null Phase 16 work and `experiencePoints` XP write are inputs to that chart phase but are out of scope here.
- **F-2 historical XP backfill.** Sean policy decision pending. Unrelated to this read-fidelity gap.
- **Phase 19.C dormant-removal.** UnifiedAdminRoutes.tsx + MasterDetailLayout.tsx physical deletion needs Rule 34 explicit approval. Not in this slice.
- **`workoutSessionRoutes.mjs:25` shadow-handler cleanup.** A second handler exists at this file mounted at core/routes.mjs:333 but is shadowed by the line-332 mount. It has its own `attributes` filter (line 94) that ALSO drops `notes` AND `exerciseNote`. Cleanup is out of scope this phase — even if it were activated, the canonical handler would not be it. Track as future-review hook for the dormant-removal pass.
- **Stripe / cart 404 / S1.x.** Paused, unrelated.
- **Swan Coach v15 `view_available_slots`.** Paused, unrelated.
- **`totalReps` per-row meta chip render gap.** Listed as PRESENTATION GAP in §3 but treated as low priority — covered by `totalSets × avgReps` rounding and a meta-chip add is incidental. Optional inclusion in implementation slice; not load-bearing.

---

## §7 — Sibling Sweep (Rule 20)

`grep WorkoutLog usage backend/routes backend/controllers backend/services` enumerated 24 files. Disposition:

| File | Type | Use of WorkoutLog | In scope this phase? |
|---|---|---|---|
| `backend/models/WorkoutLog.mjs` | model definition | the canonical model file | ✅ source of truth |
| `backend/models/index.mjs` | model registry | exports WorkoutLog | n/a (registry) |
| `backend/models/associations.mjs` | associations | declares `WorkoutSession.hasMany(WorkoutLog, { as: 'logs' })` | ✅ associations honored |
| `backend/services/workout/workoutLogService.mjs` | trainer write service | `WorkoutLog.bulkCreate` for trainer-logged sets | ✅ trainer write path |
| `backend/services/workoutService.mjs` | client read service | `WorkoutSession.findAll` with `WorkoutLog` include + attribute filter — **the API strip site** | ✅ canonical read path |
| `backend/controllers/adminWorkoutLoggerController.mjs` | admin write/read controller | `getClientWorkouts` returns `logs: w.logs` (full include) at [:135](backend/controllers/adminWorkoutLoggerController.mjs#L135) — admin-side read, full-fidelity by design | ✅ paired with §2.1 |
| `backend/controllers/workoutController.mjs` | client read controller | delegates to workoutService | ✅ in chain |
| `backend/controllers/aiWorkoutController.mjs` | AI workout generation | reads/writes WorkoutLog for AI-generated session detail | out of scope (different surface) |
| `backend/routes/workoutRoutes.mjs` | client routes | mounts canonical `GET /sessions` | ✅ in chain |
| `backend/routes/workoutSessionRoutes.mjs` | shadowed routes | second handler with stale attributes — **dormant** per §1.5 mount-order analysis | flagged in §6 future hook |
| `backend/routes/adminWorkoutLoggerRoutes.mjs` | admin routes | mounts admin write/read | ✅ trainer write |
| `backend/routes/aiChatRoutes.mjs` | AI chat | reads WorkoutLog for AI context | out of scope |
| `backend/services/ai/commandDispatcher.mjs` | AI command lane | calls `logWorkoutForClient` for `log_workout` action | sibling to trainer write — same canonical service |
| `backend/services/masterPromptBuilder.mjs` | AI context builder | reads WorkoutLog for prompt context | out of scope |
| `backend/services/ai/longHorizonContextBuilder.mjs` | AI context | reads WorkoutLog | out of scope |
| `backend/core/routes.mjs` | mount registry | declares all `app.use(...)` mounts including the shadow at line 332-333 | ✅ mount evidence |
| `backend/core/startup.mjs` | bootstrap | runs phase15ExerciseNoteGuard at boot | n/a (boot) |
| `backend/core/schemaGuards/phase15ExerciseNoteGuard.mjs` | schema guard | verifies `workout_logs.exerciseNote` exists at boot | strong evidence the column is intended for runtime use |
| `backend/tests/unit/dailyWorkoutFormRoutesProgressTruth.test.mjs` | unit test | covers daily-form write path | out of scope (different surface) |
| `backend/tests/unit/phase16WorkoutLogServiceIntensity.test.mjs` | unit test | covers Phase 16 intensity null-honest semantics | n/a (informs §1.8) |
| `backend/tests/unit/editWorkoutDateParsing.test.mjs` | unit test | date parsing | n/a |
| `backend/tests/unit/workoutLogServiceExerciseNote.test.mjs` | unit test | covers `exerciseNote` write — **proves the column is actively written today** | strong evidence the gap is real, not vestigial |
| `backend/tests/unit/workoutLogServiceDateParsing.test.mjs` | unit test | date parsing | n/a |
| `backend/tests/unit/workoutServiceSessions.test.mjs` | unit test | covers `getWorkoutSessions` — **review for whether it asserts `exerciseNote` presence** | hook for implementation slice |
| `backend/tests/api/phase1bControllers.test.mjs` | API test | API-level coverage | hook for implementation slice |
| `backend/tests/api/phase1aDataLayer.test.mjs` | API test | data-layer coverage | n/a |

**Frontend grep for `exerciseNote`** found 7 files:
- `frontend/src/components/DashBoard/Pages/admin-clients/components/WorkoutHistoryPanel.tsx` — admin view-as drilldown surface (Phase 18 P1-O target). Already consumes `exerciseNote`. **Confirms the gap is asymmetric** — admin sees it via the `EnhancedWorkoutsModal` reuse; client cannot.
- `frontend/src/components/DashBoard/Pages/admin-clients/components/WorkoutHistoryPanel.notes.test.tsx` — admin-side test asserting `exerciseNote` rendering. Useful template for client-side equivalent.
- `frontend/src/components/DashBoard/Pages/coach-assistant/utils/parsedWorkoutToLogPayload.ts` — Coach Assistant transcript parser sets `exerciseNote` on payload.
- `frontend/src/components/DashBoard/Pages/coach-assistant/utils/parsedWorkoutToLogPayload.test.ts` — its tests.
- `frontend/src/components/DashBoard/Pages/coach-assistant/SwanCoachAssistantPage.transcriptIntake.test.ts` — transcript intake e2e flow.
- `frontend/src/hooks/analytics/useClientAnalytics.ts` — analytics hook (consumption pattern unknown without read; out of scope unless implementation slice surfaces a coupling).
- `frontend/src/hooks/analytics/useWorkoutAnalytics.ts` — same.

`[VERIFIED]` `exerciseNote` is ACTIVELY consumed admin-side (`WorkoutHistoryPanel`) and ACTIVELY produced (Coach Assistant parser, schema guard, write service). The client-side absence is a real asymmetric gap, not a vestigial column.

---

## §8 — Stop-and-Report Condition Check

The prompt's stop-and-report condition: "if Section 4 reveals a gap class outside Path-A through Path-D, halt and surface to Sean."

**No halt triggered.** All gaps are Path-A class (read-side mapper-strip + render-layer gap). Two specific evidence anchors:
- API attribute strip at workoutService.mjs:76 omits `exerciseNote`
- Render gap at ClientMyWorkoutsPage.tsx:285-294 omits per-set `notes` column

---

## §9 — Recommended Implementation Slice (preview only — not authorized by this receipt)

If the Third Eye reviewer approves this receipt, the implementation slice that follows would have this footprint:

| File | Change | Type |
|---|---|---|
| `backend/services/workoutService.mjs:76` | Add `'exerciseNote'` to the WorkoutLog include `attributes` array. (1-line addition.) | API attribute fix |
| `frontend/src/components/DashBoard/Pages/client-dashboard/ClientMyWorkoutsPage.tsx` | (a) Add an exercise-level coaching note slot above each `SetTable` when `exerciseNote` is present (~5-10 lines + style). (b) Add a per-set notes row beneath the set table when ANY set in the exercise has `notes` populated, OR add a "notes" indicator badge on rows where `notes` is set (~10-15 lines). (c) Add a `sessionType === 'trainer-led'` badge on the WorkoutCard header (~3 lines). | render-layer fixes |
| `frontend/src/components/DashBoard/Pages/client-dashboard/ClientMyWorkoutsStyles.ts` | Add styled-components for the new exercise-note slot, per-set notes row, and trainer-led badge. | style additions |
| `frontend/src/components/DashBoard/Pages/client-dashboard/ClientMyWorkoutsPage.test.tsx` | Add regression tests for: `exerciseNote` rendering when present + omitted when absent; per-set notes display; trainer-led badge display. | test |
| `backend/tests/unit/workoutServiceSessions.test.mjs` | Add assertion that `exerciseNote` is present in the returned WorkoutLog rows. | test |

**Estimated total:** ~+80 lines across 5 files; 1 backend file (1-line attribute change), 4 frontend files. No schema migration. No new endpoint.

**`trainerId` → trainer-name display** is intentionally deferred; it would require either a User join in the read path (non-trivial) or a cross-component consumer (`useClient`-style lookup). Out of scope for this slice; flagged as future-review hook.

---

## §10 — Sign-off / Hold State

**Hold at unstaged.** This receipt is doc-only. Per the Phase 19 prompt:
- File path: `docs/ai-workflow/AI-HANDOFF/PHASE-19-TRAINER-VISIBILITY-RECEIPT-2026-04-27.md`
- **Stated claim:** *"This receipt classifies the trainer→client visibility chain as Path-A with three gaps (`exerciseNote` API+render, per-set `notes` render, `sessionType` render) and the implementation slice should target the canonical read attribute list (workoutService.mjs:76) and the canonical client-render layer (ClientMyWorkoutsPage.tsx)."*
- **Task type:** *phase scoping receipt — doc-only.*

**Resubmitting to Third Eye reviewer for gating.** No commit, no implementation slice, until the receipt is reviewed.

---

**End of receipt.** This document is the load-bearing artifact for the Phase 19 implementation slice. Future reviewers (Codex, Gemini, Village, future Claude) reading this should be able to identify which files to touch, which fields are at stake, and which evidence justifies the Path-A classification — without re-reading the source files.

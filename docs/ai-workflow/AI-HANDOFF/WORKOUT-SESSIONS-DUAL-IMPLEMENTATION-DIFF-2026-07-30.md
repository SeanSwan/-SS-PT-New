---
decision: The shadowing winner (/api/workout) is the correct owner of workout-session CRUD; retire the 5 unreachable routes from workoutSessionRoutes rather than reorder mounts, and port its input validation into the winner
status: open
supersedes: none
---

# `/api/workout/sessions` — which implementation should win?

**Written:** 2026-07-30 · **By:** vs-claude (Opus 5) · **Linear:** SWA-75
**Read-only.** No code changed. This is the missing input for the SWA-75 routing decision.

## The situation

Two routers claim `/api/workout/sessions`:

| | Module | Mount | Lines |
| -- | -- | -- | -- |
| **Winner** | `routes/workoutRoutes.mjs` → `controllers/workoutController.mjs` → `services/workoutService.mjs` | `/api/workout` @69 | 343 / 709 / — |
| **Shadowed** | `routes/workoutSessionRoutes.mjs` (self-contained) | `/api/workout/sessions` @70 | 818 |

Five routes on the shadowed router are unreachable — proven by execution in the previous slice (handlers swapped for markers, real requests driven): `GET /`, `GET /:id`, `POST /`, `PUT /:id`, `DELETE /:id` are all answered by `/api/workout@69`. Surviving: `POST /start`, `POST /:id/end`, `GET /:id/handoff`, `GET /statistics/:userId`.

## Recommendation: **retire the 5 dead routes. Do NOT reorder the mounts.**

Reordering would hand live traffic to a router whose contract **no live consumer uses**, and would break the one consumer that exists. Details below.

---

## 1. Authorization — EQUIVALENT (this was my wrong hypothesis)

I expected the winner to be the weaker one. It is not. Both call the same helper, `assertAssignmentOrAdmin`, on every comparable route:

| Route | Winner | Shadowed |
| -- | -- | -- |
| get by id | `workoutController.mjs:282` | `workoutSessionRoutes.mjs:225` |
| create | `:322` | `:313` |
| update | `:352` | `:400` |
| delete | `:392` | `:437` |

Authorization is **not** a differentiator. Anyone deciding this on "the newer router must be safer" would be deciding on a false premise.

## 2. Write path — the WINNER is materially better

- **Winner:** `workoutService.createWorkoutSession` opens a **transaction** and creates `WorkoutSession` + `WorkoutExercise` + `Set` together (`services/workoutService.mjs:237-259`).
- **Shadowed:** `WorkoutSession.create(sessionData)` — a single model write, no transaction, no normalized children (`workoutSessionRoutes.mjs:333`).

Switching writes to the shadowed router would **lose the transaction and the normalized exercise/set store.**

## 3. Read contract — genuinely different APIs

| | Winner | Shadowed |
| -- | -- | -- |
| params | `limit, offset, page, status, startDate, endDate, sort, order` | `userId, page, limit, sortBy, sortDirection, startDate, endDate, searchTerm` |
| response | `{ success, message, data: { sessions } }` | `{ success, data: { workouts, total, page, limit, hasMore } }` |
| pagination meta | none | `total`, `hasMore` |
| input validation | **none** | bounded limit (max 100), `SORT_FIELDS` allowlist, direction allowlist, date parsing — all 400 on bad input |
| cross-user read | not supported | `?userId=` + `assertAssignmentOrAdmin` |

Different param **names** (`sort`/`order` vs `sortBy`/`sortDirection`) and a different response **key** (`sessions` vs `workouts`).

## 4. Who actually calls it — the decisive evidence

**The live consumer was built for the winner.** `useDashboardQueries.useWorkoutSessions` sends `{ limit, page }`, and `workoutController.getWorkoutSessions` carries an explicit comment naming that hook and translating `page → offset` for it. It also defensively reads `payload.sessions || payload.workouts` — written to tolerate both shapes.

**The shadowed contract belongs to a dormant service.** `services/types/session.types.ts:49` defines `FetchSessionsParams` as `{ userId, page, limit, sortBy, sortDirection, startDate, endDate, searchTerm }` — character-for-character the shadowed router's contract. Its consumer, `services/workout-session-service.ts`, is exported from the services barrel and has a test, but **zero components import it** (verified including barrel re-export). No live code sends `sortBy` or `searchTerm` to this path.

So the shadowed router's distinctive features are used by nobody, and its dead CRUD routes have been dead without anyone noticing.

## 5. ⚠️ The shadowed router CANNOT be removed wholesale

`GET /:id/handoff` survives shadowing and is **load-bearing**. It has a dedicated rate limiter (`middleware/rateLimiter.mjs:174` — "authenticated but triggers a real…") and three services document re-entry through it:

- `services/postSaveHandoffAssembler.mjs:71` — "if assembly outruns it, resolve null (UI suppresses; `GET /:id/handoff` can re-fetch)"
- `services/workoutProofLoader.mjs:132`
- `services/workoutProofSeriesService.mjs:114`

Deleting the router would break the post-save workout-proof handoff path. Keep it mounted for its four surviving routes.

## 6. Hardening opportunity the shadowed router already solved

The winner has **no bound on `limit`**. The route does not validate it (`workoutRoutes.mjs:201` is `protect` only), and `workoutService.getWorkoutSessions` destructures `limit = 10` and passes it straight into the query with no cap. An authenticated caller can request an arbitrarily large page. The shadowed router caps at 100 (`workoutSessionRoutes.mjs:97`).

Severity is a hardening gap, not a vulnerability — it is authenticated and self-scoped — but it is free to close by porting the shadowed router's validation.

---

## Proposed plan (for Sean's approval — nothing done yet)

1. **Delete the 5 unreachable routes** from `workoutSessionRoutes.mjs`. They are already dead, so this is a **zero-behaviour-change** edit that removes 818→~400 lines of misleading parallel implementation. Then empty the `KNOWN_SHADOWED` allowlist in `tests/api/routerStackMountTopology.test.mjs` — which will fail loudly if the deletion is incomplete.
2. **Port the input validation** into the winner: bounded limit, sort-field allowlist, date parsing. Closes the unbounded-`limit` gap.
3. **Optionally** add `total`/`hasMore` to the winner's response so pagination metadata is not lost. `useDashboardQueries` ignores extra keys, so this is additive.
4. **Leave the mounts alone.** No reordering.
5. Separately decide whether `services/workout-session-service.ts` and `FetchSessionsParams` should be deleted as orphans (Rule 34 — needs approval, not swept).

## What is NOT proven here

Response shapes and side effects were established by **reading** the implementations, not by executing both handlers — the winner's list path needs a live DB and the shadowed CRUD routes are unreachable, so they cannot be driven through the mounted app at all. The routing facts (which router answers) *were* proven by execution in the previous slice. No claim here rests on runtime behaviour of the shadowed CRUD handlers.

# S0 Manifest — Evidence & Test Isolation (2026-09-26)

Implements Astra blueprint slice S0 (`04-build-order.md`, `09-tests.md`).
Companion: `CHECKPOINTS-IMPLEMENTATION.md` (slice log).

## Source hashes at slice start (sha256, `git hash-object` of working tree)

Files S1 will modify — these hashes are the "before" evidence for the S1 diff:

| File | Role |
|---|---|
| `backend/controllers/workoutController.mjs` | first-mounted session/plan CRUD (696 lines — extraction manifest below) |
| `backend/routes/workoutRoutes.mjs` | first-mounted router at `/api/workout` (756 lines) |
| `backend/routes/workoutSessionRoutes.mjs` | shadowed router at `/api/workout/sessions` (gated in campaign H1; see ownership finding) |
| `backend/routes/variationRoutes.mjs` | variation engine router (gated in campaign H2) |
| `backend/routes/formAnalysisRoutes.mjs` | form-analysis router (gated in campaign H3, self-access fixed round 2) |

(Exact hashes recorded in the S0 commit; regenerate with `git hash-object <file>`.)

## Route ownership finding (the S1 justification)

`backend/core/routes.mjs:356-357` mounts `workoutRoutes` at `/api/workout` BEFORE
`workoutSessionRoutes` at `/api/workout/sessions`. Because `workoutRoutes` defines
`/sessions`, `/sessions/:sessionId` (GET/POST/PUT/DELETE, `workoutRoutes.mjs:201-236`),
it SHADOWS the identically-shaped `workoutSessionRoutes` handlers for every core session
CRUD path. Consequence, confirmed by Astra's mounted-caller evidence and re-derived here:

- The campaign's H1 gates (`b35da21e0`) live in `workoutSessionRoutes.mjs` — they are
  DEAD CODE for `/api/workout/sessions/*` CRUD because the first mount answers first.
- The LIVE handlers are `workoutController.mjs`, whose gates are role-only
  (`role !== 'admin' && role !== 'trainer'`, `:280/:310/:340/:380/:403/:426/:470`) —
  the exact defect class H1 named, in the file that actually serves traffic.
- D-001 (keep route ordering, repair the first-mounted controller) is therefore the
  S1 fix point: gate `workoutController.mjs` handlers, leave mount order untouched.

Ownership table (session CRUD paths under `/api/workout/sessions/*`):
| Path | Live handler | Current gate | S1 target |
|---|---|---|---|
| GET `/sessions` | workoutController.getWorkoutSessions | self via default; `/sessions/user/:userId` middleware-gated | controller-level matrix gate |
| GET `/sessions/:sessionId` | workoutController.getWorkoutSessionById | role-only (DEFECT) | self/assignment gate, 404 fail-closed |
| POST `/sessions` | workoutController.createWorkoutSession | role-only (DEFECT) + body.userId target | assignment gate on target |
| PUT `/sessions/:sessionId` | workoutController.updateWorkoutSession | role-only (DEFECT) | assignment gate; owner immutable |
| DELETE `/sessions/:sessionId` | workoutController.deleteWorkoutSession | role-only (DEFECT) | assignment gate |
| GET `/progress/:userId` · `/statistics/:userId` · `/recommendations/:userId` | workoutController.* | middleware `authorizeResourceAccess` | controller-level backstop |
| plans CRUD | workoutController.plan handlers | trainerId/clientId ownership; `updateWorkoutPlan` passes raw `req.body` (:595) — trainerId/clientId transferable | whitelist + transfer rejection |

## Extraction manifest (rule 4 — no blanket exemption, D-016)

Oversized leaves touched by this campaign:
- `backend/controllers/workoutController.mjs` (696): S1 adds gates in-place; bounded
  extraction (session/plan handler split) is granted only as its own follow-up slice
  with its own manifest — no behavior change rides along.
- `backend/routes/workoutRoutes.mjs` (756): NOT modified by S1 (controller-level fix
  keeps the router untouched); extraction deferred likewise.

## Archive receipt

- Original Astra packet: `astra-packet.md` (committed `74170358b`).
- Astra reply + 15 split docs: `ASTRA-REPLY.md`, `00-README.md` … `14-verification.md`
  (committed `aecfb3fec`). Both immutable inputs for this build; this manifest and
  `CHECKPOINTS-IMPLEMENTATION.md` are the only files appended during implementation.
- S0 artifacts: `backend/tests/security/campaign-safety.test.mjs` (4 probes: 3
  documented-live-defect, 1 isolation guard), `scripts/run-disposable-security-tests.mjs`
  (resource guard, negative-control verified: ambient `DATABASE_URL` → exit 3),
  `backend/vitest.config.mjs` (tests/security excluded from default run).

## Probe ledger

| Probe | State at S0 | Turns green in |
|---|---|---|
| R02 missing-charge-evidence blocks fulfillment | documented-live-defect | S6/S7 (D-017) |
| R02 unpriced-line cannot vanish from reconciliation | documented-live-defect | S6/S7 (D-017) |
| R01 unassigned trainer cannot read another client's session | documented-live-defect | **S1** |
| S0 guard: VM isolation holds | hard assertion (green) | — |

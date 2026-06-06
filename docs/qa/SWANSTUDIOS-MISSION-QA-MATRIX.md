# SwanStudios Mission QA Matrix

Purpose: test SwanStudios against the business mission, not only page load. Mission QA asks whether a trainer, admin, and client can use the app for the work Sean needs: onboard clients, assign or log workouts, produce progress proof, protect session billing rules, and keep Swan Coach grounded in real client history.

## Mission QA Modes

| Mode | Command | Writes | Use Case |
| --- | --- | --- | --- |
| Contract | `npm run qa:mission` | Blocked by default | Deterministic Playwright checks with mocked mission-shaped APIs. Safe first layer for every branch. |
| Production Read-Only | `npm run qa:mission:prod-readonly` | Blocked by default | Production bundle smoke against `https://sswanstudios.com` with API writes blocked or avoided. |
| Production Live Read-Only | `npm run qa:mission:prod-live-readonly` | Blocked by default | Real production GET checks against `https://sswanstudios.com`; protected role dashboards require local Playwright storage state. |
| Staging Write | `node scripts/qa/playwright-mission.mjs --staging-write --base-url=<staging-url>` | Enabled only by explicit flags | Full persona workflows against isolated staging DB and Stripe test keys. |

Write-heavy tests must not run against production or local-prod DB by accident. Local development can use the production `DATABASE_URL`, so any write mode must verify the target database is isolated before running.

## Required Personas

| Persona | Required Data | Mission Rule |
| --- | --- | --- |
| Admin | Active `role=admin` | Can see proof-of-value, client readiness, stale clients, and intervention points. |
| Trainer | Active `role=trainer` with assigned clients | Can find a client fast, log a session, review history, adjust plans, and use Swan Coach. |
| SwanStudios paid client | `role=client`, `clientSource=swanstudios`, positive `availableSessions` | Paid sessions deduct only when workout/session policy says they should. |
| Move Fitness client | `role=client`, `clientSource=move_fitness`, `availableSessions=0` | Free-tracking client data persists, but paid SwanStudios sessions are not deducted. |
| Stub/new client | `accountStatus=stub` or invite state | Admin/trainer can onboard and later activate without losing training context. |

QA emails should use `@swanstudios-qa.local` so cleanup can identify them. Production cleanup must be targeted; do not use broad scripts that clear all sessions.

## Critical Mission Workflows

| Workflow | What Must Be Proven | First Test Layer |
| --- | --- | --- |
| Client proof loop | Client sees today's assignment, can reach logging, and sees progress charts from logged-data-shaped APIs. | `client-proof-loop.contract.mission.spec.ts` |
| Admin/trainer proof loop | Trainer can see an assigned SwanStudios paid client with workout proof, and admin can open the planner for that client context without writes. | `admin-trainer-proof-loop.contract.mission.spec.ts` |
| Admin onboarding | Admin can create/import a client, classify source, and route into the Client Hub without route confusion. | Planned staging write |
| Trainer daily logging | Trainer can select client, log workout, persist sets/reps/RPE/notes, and reload history. | Planned staging write |
| Plan vault | Client/trainer/admin can see 1 day, 1 week, 1 month, 3 month, 6 month, 9 month, and 12 month plan horizons. | Planned contract + staging write |
| Session deduction | SwanStudios paid sessions deduct; Move Fitness/external sessions do not; schedule cancellation policy is explicit. | Planned staging write |
| Store/session purchase | Client buys sessions with Stripe test keys, fulfillment grants sessions, idempotency prevents double-grant. | Planned staging write only |
| Swan Coach | Voice/text assistant uses client history, pain/onboarding/equipment context, and asks for confirmation before writes. | Planned contract + staging write |
| Community proof | Workout wins can be posted/shared with simple tags and no duplicate badge clutter. | Planned contract |

## Safety Gates

- Default mission tests must be read-only and tagged `@contract` or `@readonly`.
- Write tests must be tagged `@write` and run with retries disabled.
- Production read-only may run against `sswanstudios.com`; production writes require Sean's explicit approval and the launcher `--allow-prod-write` flag.
- Production live read-only must use `SWAN_MISSION_QA_LIVE_API=1`, must block `POST`, `PUT`, `PATCH`, and `DELETE`, and must never store auth state in git. The `.auth/` directory is ignored for local Playwright storage states.
- Capture local production auth state with `npm run qa:prod-auth:capture:admin`, `npm run qa:prod-auth:capture:trainer`, or `npm run qa:prod-auth:capture:client`. The helper opens a browser and saves storage state only after interactive login.
- Authenticated production checks are optional until local state files exist. Supported env vars: `SWAN_PROD_AUTH_STATE` as a generic client fallback, plus `SWAN_PROD_ADMIN_AUTH_STATE`, `SWAN_PROD_TRAINER_AUTH_STATE`, and `SWAN_PROD_CLIENT_AUTH_STATE` for role-specific checks. Do not hardcode secrets or login values in specs.
- If `DATABASE_URL` looks production-like, write mode requires `SWAN_MISSION_QA_CONFIRM_PROD_DB_WRITES=true`.
- No live Stripe cards or live local Stripe keys in mission QA. Use Stripe test keys and disposable QA carts.
- The existing `stripe-testmode-replay` command is no-real-charge, but it can write session grants/orders to the target DB. Keep it out of read-only mission QA.
- Targeted cleanup is `npm run qa:mission:cleanup`; it is dry-run unless `--confirm=delete-qa-only` is supplied and only `@swanstudios-qa.local` records are in scope.
- Mission evidence reports are generated with `npm run qa:mission:report` into `docs/qa/reports/`.

## Next Expansion Slices

1. Add production read-only specs for login-free public store and route health.
2. Expand staging-only write specs from safety gates into full persistence checks once an isolated staging DB is confirmed.
3. Run `qa:mission:cleanup` only after staging-write tests create real QA records.
4. Add deeper Swan Coach UI tests once the canonical in-app command surface is mounted with stable selectors.
5. Attach `qa:mission:report` output to the phase audit record after each production/staging QA pass.

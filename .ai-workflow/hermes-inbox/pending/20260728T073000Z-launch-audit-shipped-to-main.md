# Launch audit SHIPPED to main — 8 commits, and the four traps it removed

**When:** 2026-07-28 (UTC) · **Where:** VS-Claude terminal · **Linear:** SWA-75
**Range:** `f05c37dda..f3024e428` on `origin/main` · **Revert target: `f05c37dda`**

## What is now true of main that was not before

1. **Block actually blocks.** `Friendship.status='blocked'` is enforced on BOTH message send paths (REST `messageController.sendMessage` and socket `'send_message'`). It was set and never read.
2. **Message send is throttled** on both paths — 30/min burst, 600/hr, per USER not per IP, env-tunable, fail-open, in-memory per-instance.
3. **Onboarding is reachable and no longer lossy.** A card on `/dashboard/client/overview` links to the wizard (previously nothing did), and answers autosave per-user to device storage, cleared on submit.
4. **The trainer-permission lockout trap is defused** — see below.
5. **1,321 + 6,956 lines of unreachable code are gone.**

## Four traps worth remembering, because each nearly cost real time

**A commented-out mount reads exactly like live code.** `gamificationRoutes.mjs` got a full IDOR fix + 41 tests before anyone checked `core/routes.mjs:105`. Prove the mount BEFORE fixing.

**An import-graph check is not a reachability check.** After deleting that module, a test broke that read it via `readFileSync` — this repo's own static-contract idiom. Deletion sweeps must grep for file PATHS.

**Fixing one send path is fixing nothing.** Messaging has TWO complete send paths. A REST-only block guard or throttle is bypassed by emitting over the websocket. Same for anything future.

**"Built but unwired" can be actively dangerous, not merely idle.** `trainerPermissionMiddleware.mjs` (563 lines, zero routes) returned FALSE with no grant row — and `trainer_permissions` has NEVER had a row in production. Wiring it would have 403'd every trainer, which is exactly the 2026-05-01 incident recorded at `dailyWorkoutFormRoutes.mjs:495`. Its semantic is now the production-proven one (explicit grant → allow; zero rows → allow; has rows but not this one → deny; throws → allow + warn), and a test asserts it stays unwired until an admin grant UI exists.

## Verification facts to reuse

- Backend suite now runs: **6,177 passing**. Pre-existing failures, verified identical on a pristine `origin/main` worktree — do NOT chase as regressions: `commandRegistryCoverage`, `evalHarness`, `logRedactionShared`, `loggerRedaction` (4 files / 7 tests) and frontend `DashboardBackgroundStudio.mount.contract`.
- Supertest + a mocked `protect` that injects `req.user` is the repo's pattern for driving real routers with a fake session — used for the new lateral-access probe.
- A guard test only counts if it FAILS against the bug: re-injecting `if (role==='trainer') return next()` into `authorizeResourceAccess` fails exactly 3 probe tests.
- Deploy verification by chunk-hash comparison does NOT work here — Render builds with different env, so hashes differ from local, and app chunks are lazy so they never appear in `index.html`. Use a behavioural check instead.

## Environment (cost real time twice)

- `backend/node_modules` is a Linux install on Windows; `npm install` cannot complete (Linux-only `dcraw-vendored-linux`, EBADPLATFORM). `npm install --force` works.
- **Removing a git worktree whose `node_modules` is a Windows JUNCTION follows the link and deletes the TARGET.** This gutted the shared backend `node_modules` (550 → 44 packages) mid-session. Always `rmdir` the junction BEFORE `git worktree remove`.
- Git Bash `ln -s` copies instead of symlinking here; use `cmd //c mklink /J`.

## Owner-gated, still open

Stripe key rotation (scripts that read/rewrote live key material existed in the repo root — deleting them did not change exposure), the live $1 charge→webhook→refund proof, running the backup drill, and observability (there is still no error tracking or 5xx alerting, so post-deploy "verified" means manual checks only).

*IDs and roles only. No PII, credentials, or customer data.*

# Launch audit: dead code doesn't just clutter — it manufactures false security findings

**When:** 2026-07-28 (UTC) · **Where:** VS-Claude terminal, worktree `c:/tmp/ss-launch-audit-20260727`
**Branch:** `claude/launch-audit-20260727` off `origin/main@c0c9b7454` · **Linear:** SWA-75
**Status:** 4 commits local, NOT pushed (Rule 70 batch cadence)

## The lesson worth carrying

An IDOR guard in `routes/gamificationRoutes.mjs` was extracted, hardened, covered by 41 tests, and *proven* to fail against the old implementation — before anyone noticed the file's mount was commented out at `core/routes.mjs:105`, directly beneath a comment claiming the legacy routes were "kept for backward compatibility." No request could ever reach it. The live surface was already correctly guarded.

**Transferable rule:** run the mount/reachability proof BEFORE the fix, not after. Rule 26 already says this; the failure mode is that a file which *reads* like production code passes every smell test a code reader applies. Only the mount graph tells the truth, and a commented-out mount sitting under a confident comment is worse than no comment.

Corollary that cost a second round: **an import-graph check is not a reachability check.** After deleting the module, `tests/api/gamificationLegacyLeaderboardControllerSecurity.test.mjs` broke — it read the file via `readFileSync`, which is this repo's own static-contract test idiom. Deletion sweeps must grep for file *paths*, not just `import` specifiers.

## Facts worth keeping

- **`gamificationV1Routes` serves BOTH `/api/v1/gamification` AND `/api/gamification`.** There is no legacy gamification router anymore. Do not resurrect one; add to V1.
- **`authorizeResourceAccess(paramName)`** (`middleware/authMiddleware.mjs:741`) is the canonical IDOR guard: self / admin / trainer-with-ACTIVE-assignment, and it logs blocked attempts. `assertAssignmentOrAdmin` (`middleware/verifyClientAccess.mjs:84`) is the fail-closed boolean form.
- **Messaging has two independent send paths.** REST `controllers/messaging/messageController.mjs sendMessage` and socket `socket/socket.mjs 'send_message'`. Any messaging-side rule must be applied to both or it is not applied at all.
- **Live messaging is text-only** — zero attachment/upload support in `messagingRoutes.mjs` (10 routes). Attachment-safety concerns are moot until that changes.
- **`shouldRedirectClientToOnboarding`** (`UniversalDashboardLayout.logic.ts`) is dead logic: imported by its own test file and nothing else. Do not treat its existence as evidence of an onboarding gate.
- **The client onboarding wizard is 8 sections**, routed at `/dashboard/client/onboarding`, and now autosaves per-user to device storage.

## Environment truth (cost ~an hour to rediscover)

- `frontend/node_modules` was EMPTY — earlier sessions reporting "tests won't run" were correct and it was never fixed.
- `backend/node_modules` is a **Linux install on a Windows box**: missing `@rollup/rollup-win32-x64-msvc`, `@esbuild/win32-x64`, `sanitize-html`; `archiver` present as 8.0.0 (pure ESM, no default export) while the lockfile correctly pins 7.0.1.
- `backend` npm install **cannot complete on Windows at all** — a Linux-only transitive dep (`dcraw-vendored-linux`) hard-fails EBADPLATFORM. Workaround: install the missing package in a scratch dir and copy it into `node_modules`.
- Git Bash `ln -s` on this machine **copies** instead of symlinking; use `cmd //c mklink /J` for worktree node_modules.
- With that repaired the backend suite runs: **7,192 passing**.

## Baseline failures — do NOT chase these as regressions

Proven identical on pristine `origin/main` via a scratch worktree:
- `tests/unit/commandRegistryCoverage.test.mjs`, `evalHarness.test.mjs`, `logRedactionShared.test.mjs`, `loggerRedaction.test.mjs` — 4 files / 7 tests
- `frontend .../DashboardBackgroundStudio.mount.contract.test.ts` — 1 test
- Repo-wide `tsc --noEmit` OOMs at 8GB. Not a regression.

## Method note

Static guard analysis proves **no unauthenticated exposure**. It structurally cannot see authenticated lateral movement (a valid session requesting another user's id). Any future "the routes are guarded" claim must carry that scope limit.

## Open, owner-gated

Stripe keys were readable/rewritable by scripts that existed in the repo root; deleting the scripts did not change exposure — rotation is owner-only. A WIP branch carries 1,216 uncommitted files while 5+ agents share the tree.

*IDs and roles only. No PII, credentials, or absolute customer data.*

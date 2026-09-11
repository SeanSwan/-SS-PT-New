# G11 — release readiness for the Swan Coach Universe V3 candidate

Artifact `SCU-G11-45`. Version 1. Date: 2026-09-11. Owner: Sean.
Route: packet [31](31-gwen-execution-handoff.md) G11/S11 row, contract
[32](32-gwen-domain-and-verification-contract.md) T40–T44/T47, release matrix
in [15](15-acceptance-and-release.md).

## Candidate truth (executed 2026-09-11, Windows Node 24 + WSL Node 22.23.2)

| Gate | Command | Result |
|---|---|---|
| Backend full suite | `cd backend && npx vitest run` | 1,243 files: **10,232 pass / 15 fail / 4 skip** — all 15 failures proven PRE-EXISTING at baseline `0c96142f2` (11 files re-run there fail identically; `physicalConfirmChannelSplit` proven by zero-overlap import closure: no commit `0c96142f2..HEAD` touches voiceConfirmationTier/physicalConfirm/confirmationProjection) |
| Model registry drift | fixed this slice | CoachFact adopted (G09) was unregistered — associations wiring from the S1 commit replicated (5 hunks); drift test now 8/8 PASS. Remaining parity failure (`RenewalAlert` early-return imbalance) pre-existing at baseline |
| Frontend full suite | `cd frontend && npx vitest run` | 1,641 files: **8,529 pass / 5 fail** — 4 proven pre-existing in G06 (stash roundtrip), 5th (`TrainingTabContent.defaultSection`) proven by zero-overlap diff (`0c96142f2..HEAD` touches nothing under clients-team) |
| node:test contracts | `node --test tests/unit/coachProgressEvidence.test.mjs` | 8/8 PASS |
| TypeScript | `tsc --noEmit` (WSL, 10GB heap) | exit 0, zero errors |
| Production build | `npx vite build` | exit 0 |
| Migrations syntax | `node --check` (both coach_facts migrations) | OK |

Incident during verification (disclosed): an unresolved stash-pop conflict in
the WORKTREE ROOT `package.json` (`UU`, committed nowhere) blocked the frontend
config load; resolved to HEAD's version (`git checkout HEAD -- package.json`).
Also: a baseline-comparison junction cleanup wiped `backend/node_modules`;
restored exactly via `npm ci` (lockfile hash unchanged).

## NOT executed (environment-gated — belongs to the final Astra review / Sean)

Real-PostgreSQL migration run (no DATABASE_URL in the worktree), Redis T44,
authenticated browser journeys over all 127 entries + nested workspaces, the
120-scenario evaluation corpus with frozen holdout (T40–T42 support fixtures),
performance budgets, restore drill. These are environment- or
authorization-gated and are NOT claimed as run.

## Rollback (per slice; no deployment has occurred)

- Whole candidate: `git revert d9d7dfe61..b42fd972b` range on this branch, or
  reset the integration branch to `0c96142f2` before any merge to main.
- G06 voice lifecycle: revert `d9d7dfe61` (frontend-only; no migration).
- G07 evidence: revert `93b7b9d28` (backend-only; no migration; charts were
  never touched).
- G08 registry: revert `54d5f6dc5` (additive modules; no wiring to routes).
- G09 memory: revert `d4ab6ae72` AND run the new migration's `down()`
  (drops forgottenAt/purgeAfterAt/conflictMetadata); the adopted S1
  model/migration/service files revert with the same commit.
- G10 nudges: revert `b42fd972b` (pure module; no cron wired → nothing to
  disable at runtime).
- Kill switches: nudge engine is not wired to any worker (cannot send);
  evidence tools remain read-only; no client-facing surface changed.

## Next gate

Stage is FINAL in the override controller (9/24 review admissions remaining):
the single combined Astra hostile review + repairs owns T40–T47, the
real-harness matrix, and the go/no-go. Push/deploy stays gated on Sean's
explicit approval.

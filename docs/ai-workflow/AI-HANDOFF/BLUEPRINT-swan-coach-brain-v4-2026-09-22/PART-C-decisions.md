# PART C — Decisions and dependencies

Each decision has a recommended default so work does not stall. Only D1 blocks the first
coach-lane slice.

| ID | Decision | Recommended default | Owner | Blocks |
|---|---|---|---|---|
| D1 | Canonical base for coach work | `codex/swan-coach-astra-owned-20260906` + the vs-claude R7 commits + the S83 backend delta, then merge `origin/main` into it and PR to `main`. Freeze coach paths on `creator-brains-engine-r2-20260915` | Sean | P0.2–P0.6 |
| D2 | Which brains serve `coach_chat`, and the budget | Primary: a top-tier tool-calling model (Claude or GPT class). Backup: a second vendor. `fast` role for summaries. Local (Ollama) for evals only. Start at a per-trainer daily cap of $2 and a per-turn cap of $0.10; tune with the P2b leaderboard | Sean | P2b.3 |
| D3 | Which providers may receive **de-identified** client-bound turns | Only providers under zero-retention or BAA-capable terms that Sean has confirmed; everything else gets `general` turns only | Sean | P1 for client-bound turns (roster/self turns can proceed) |
| D4 | Approval policy by risk | One-tap approve with a 10-minute undo receipt for `reversible` writes (log workout, add pain entry). Always a full diff card for `irreversible` or cross-client writes (cancel, deactivate, credits). TTL 5 minutes (was 120 s) | Sean | P3.1 |
| D5 | Redis for the approval store in production | Provision Render Key Value and set `APPROVAL_STORE=redis`, `REDIS_URL`; health reports `approvalStore: redis` (`aiCommandRoutes.mjs:898`) | Sean / Render | P3 exit |
| D6 | Agent concurrency | One agent per worktree via the lane lock; a second seat reviews read-only. Paid review seats only at phase exits | Sean | P0.5 |
| D7 | What to do if Render cuts streams (U1) | Keep turns ≤ the measured limit, and add resume-by-`turnId`. Moving the stream endpoint off Render is not planned | Builder measures → Sean | P1.2 |
| D8 | Voice stack | Keep the Web Speech API for dictation (already built on the fork) and evaluate a server STT at P6 | Sean | P6 |

## External dependencies

| Dependency | State (2026-09-22) | Owner | Needed by |
|---|---|---|---|
| S83 backend delta committed and pushed (C3) | **Not done.** Only on disk in an orphaned worktree; `53005a6da` backend tree destroyed; lane branch not pushed | vs-claude lane | P0.1 |
| Review 7 open items R7-05, R7-07, R7-09 and the R7-06 schema matrix | Open, per the lane's own report | vs-claude lane | P0 exit (S83 completion) |
| Verified-clean clone for pushing | Named in `2026-09-21-221624-git-object-store-round-3` | whoever pushes | P0.1 |
| New dependency `zod-to-json-schema` | Not installed (`backend/package.json`) | builder | P2.1 |
| Staging environment for stream soak | UNVERIFIED | Sean | P1.0 |

## Nothing here is marked N/A

Everything above is either a default with an owner or a named blocker.

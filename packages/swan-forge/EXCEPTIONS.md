# @swan/forge — Exception Ledger

Governance (plan §11.C3/C4): every drift-lint suppression lives here with an owner and an
expiry — the linter reads this file and suppresses ONLY unexpired, matching rows. An
expired row stops suppressing automatically. This ledger is reviewed at each Forge release;
a growing ledger is a shadow catalog (GLM Part 4 #3) — prefer contributing a variant over
filing an exception.

Rules: R1 raw hex in Forge css/ · R2 consumer override of sw-* surface · R3 reorder property in a pack · R4 legacy import (telemetry, never blocking)

| path-substring | rule | owner | expiry | reason |
|---|---|---|---|---|
| frontend/src/pages/OptimizedSignupModal.tsx | R4 | vs-claude (Forge PR #2) | 2026-11-23 | REACHABLE T1 conversion surface DEFERRED from PR #2: its GlowButton usage is inside a Modal x Field x Auth composition that must strangle together (auth strangler PR, backlog T2). Recorded so the T1-first law is not false advertising (Ox, PR #2 review). R4 is telemetry-only; second-party review: PENDING — request filed in .ai-workflow/coordination/review-queue.md |

<!-- Example row:
| frontend/src/components/Legacy.css | R2 | sean | 2026-10-01 | migration in flight, delete-PR scheduled forge-v0.2 |
-->

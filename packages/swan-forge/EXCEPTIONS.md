# @swan/forge — Exception Ledger

Governance (plan §11.C3/C4): every drift-lint suppression lives here with an owner and an
expiry — the linter reads this file and suppresses ONLY unexpired, matching rows. An
expired row stops suppressing automatically. This ledger is reviewed at each Forge release;
a growing ledger is a shadow catalog (GLM Part 4 #3) — prefer contributing a variant over
filing an exception.

Rules: R1 raw hex in Forge css/ · R2 consumer override of sw-* surface · R3 reorder property in a pack · R4 legacy import (telemetry, never blocking)

| path-substring | rule | owner | expiry | reason |
|---|---|---|---|---|

<!-- Example row:
| frontend/src/components/Legacy.css | R2 | sean | 2026-10-01 | migration in flight, delete-PR scheduled forge-v0.2 |
-->

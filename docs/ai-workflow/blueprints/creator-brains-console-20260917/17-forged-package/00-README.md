**Creator Brains Console — adjudicated revision, 2026-09-20**

Owner: Sean. Architect: Astra. Status: **FORGED DRAFT; implementation advancement blocked by the gates below.**

This revision supplies the updated governing documents for the existing packet. It supersedes contradictory planning statements, not historical observations. Installation into the canonical packet requires preserved source hashes, a supersession map, and archive filing.

**Builder contract**

Follow decided behavior exactly. Build one slice at a time. Return the scoped diff and actual acceptance evidence at each checkpoint. Missing evidence is NOT RUN or BLOCKED. Do not infer authorization for engine edits, relocation, transfer, paid review, production writes, or pushing.

**Current state**

| Surface | State |
|---|---|
| S0/S1 source | [VERIFIED] Present in the inspected untracked console directory. |
| Bridge 105 tests / web 48 tests | [VERIFIED] Reported by supplied receipts; **not rerun here**. |
| Engine 181/183 | [VERIFIED] Reported by `16#S1-H14`; current result **NOT RUN**. |
| Server split | [VERIFIED] `server.mjs` and `routes.mjs` exist; cap decision closed. |
| S2–S6 | Planned; no completion claim. |
| S7 | Gated on Sean’s explicit transfer instruction. |
| CD3 | Locked. |
| D7 relocation | Recommended; owner decision pending. |
| Backup | Blocked by transcript-export policy conflict. |

**Path vocabulary**

- `E = scripts/creator-brains`
- `C = scripts/creator-brains/console` until D7 is decided.
- If relocation is approved, `C = packages/creator-brains-console`.
- `W = C/web`
- Store root is explicit `r`, otherwise `CREATOR_BRAINS_ROOT`, otherwise the engine default. Relocation must not change that resolution.
- `C`/`W` are documentation abbreviations, not new environment variables.

**Requirements and traceability**

| Requirement | Acceptance | Component / tests | Slice |
|---|---|---|---|
| R1 | Desktop launch renders in ≤15s; binds `127.0.0.1`, port 0 | launcher/server; T-E1, T-MOVE | S0R/S6 |
| R2 | All existing status instruments remain visible and authoritative | StatusBoard; T-B1/W3/W10/W11 | S1R |
| R3 | Damage names the file; unknown values never become zero | validators/refusals; T-B2/B17/B19, T-W3 | Every consumer |
| R4 | New creator disabled; re-add preserves consent; explicit toggles persist | roster/resolver; T-B3/B19, T-ADD, T-W4 | S2 |
| R5 | Cited hits, named searched terms, visible skipped rows | QueryConsole; T-B9/W5 | S3a |
| R6 | One pinned published generation; real claims; no raw transcripts | BrainDrawer; T-B8/B22, T-BRAIN | S2 |
| R7 | Validated budget; correlated launch; honest terminal result | RunConsole; T-B4/B5, T-RUN/W6 | S4 |
| R8 | Canary and repair report actual results; backup withheld until resolved | OpsRail; T-OPS | S3 |
| R9 | No dangerous command endpoint | route allowlist; T-B6/B13 | Every slice |
| R10 | Registry-driven constellation, accessible equivalent, zero prohibited loading | scene; T-T1/T-T2/W7/E3 | S5 |
| R11 | Closed tokens, all states, 44px targets, required contrast | all panels; T-W8/W9 | Every UI slice |
| R12 | UI uses adapter only; consumed payloads validated | adapters; T-W1/W2, T-CONTRACT | Every slice |
| R13 | Node-only bridge; loopback, write-origin, body and path boundaries | server/workers; T-B7/B18/B23/B24, T-SEC | S0R/S1R |
| R14 | Eleven widths, including 375px, without lost controls or clipped content | layout; T-E2 | S6 |
| R15 | Verified source snapshot before separately authorized transfer | snapshot; T-B12 | S7 |
| R16 | Complete keyboard route, focus restoration, accessible enhancement | DOM controls; T-W9/W7 | S2–S6 |

No runtime tests were executed for this revision. New named tests are implementation deliverables, not retroactive PASS claims.

**Applicability**

Requirements, architecture, wireframes, flows, sequences, state machines, contracts, privacy matrix, tests, traceability, rollback, and checkpoints apply. SQL migrations and Sequelize definitions are **N/A — no database tables are created or modified**. Diagram rendering and browser inspection are NOT RUN.

**Creator Brains Console — round-2 governing revision**

Status: **REVISE; package emitted, not installed; implementation readiness not established.**

Owner: Sean. This revision retains CD3, D1–D9 adjudication and the executed D7 relocation. It authorizes no implementation, provider call, engine modification, transfer, push or deployment beyond the operator’s existing instructions.

**Path constants**

```text
C = packages/creator-brains-console
W = packages/creator-brains-console/web
E = scripts/creator-brains
P = docs/ai-workflow/blueprints/creator-brains-console-20260917
```

These are documentation abbreviations, not environment variables.

**Builder contract**

Follow decided behavior. Build one bounded slice at a time. Supply its diff, tests and real boundary evidence. Advance only after its checkpoint passes. Return consequential undisclosed decisions for adjudication; minor choices are bounded in Part C. Never replace missing evidence with historical test counts.

**Current state**

| Item | State |
|---|---|
| Relocated console and server split | [VERIFIED] Source present; D7 closed |
| Engine consistency | [VERIFIED] 15/15, 85 `.mjs` files |
| TypeScript | [VERIFIED] Current `typecheck` passes |
| Fatal UTF-8 decoding | [VERIFIED] Direct positive/negative probe |
| S0/S1 implementation | [VERIFIED] Present; remaining defects listed in Part A |
| Bridge/web test counts | Historical receipts only; fresh suites NOT RUN |
| Roster, drawer UI, query UI, run UI, constellation | Planned |
| Desktop launcher | Unproven; R1 incomplete |
| Backup | Visible blocked capability; endpoint absent |
| S7 | Explicit owner transfer gate |
| Archive / installed readiness receipt | BLOCKED by read-only session |

**Requirements and traceability**

| ID | Acceptance criterion | Component / test group | Slice |
|---|---|---|---|
| R1 | Desktop launch → usable console ≤15s; bind loopback port 0 | launcher; LAUNCH | S6 |
| R2 | All status instruments plus health provenance and >3-day warning | StatusBoard; HEALTH/WEB | S0H |
| R3 | Name damage; distinguish unknown, absent and measured zero | readers/validators; CONTRACT/READ | All |
| R4 | New creator disabled; re-add preserves consent; toggles persist | creator worker/roster; ADD | S2 |
| R5 | Search submitted terms; show cited hits and skipped data | query reader/UI; QUERY | S3a |
| R6 | One pinned generation; four derived files; no private presentation reads | published reader/drawer; READ | S0H/S2 |
| R7 | Valid budget; one accepted launch; engine-correlated verdict | run service/UI; RUN | S4 |
| R8 | Canary honest; repair reports actual result; Backup remains blocked | OpsRail; OPS | S3 |
| R9 | No restore/rollback/authorize/backup endpoint | route allowlist; ROUTES | All |
| R10 | Registry-driven scene; accessible equivalent; bounded loading/motion | constellation; SCENE | S5 |
| R11 | Closed tokens, 44px controls, contrast and complete states | components; WEB/VISUAL | All UI |
| R12 | UI uses adapter only; every consumed response validated | adapters; CONTRACT | All |
| R13 | Node-only bridge; exact-origin writes; bounded workers/readers | bridge; POLICY/HEALTH/READ | S0H |
| R14 | Eleven specified viewport sizes, including 375px | layout; VISUAL | S6 |
| R15 | Tag, copied source and verified manifest before authorized transfer | snapshot; TRANSFER | S7 |
| R16 | Complete keyboard workflow and focus restoration | DOM controls; WEB/VISUAL | S2–S6 |

**Document authority**

These nine documents supersede conflicting active planning instructions in original documents 01–08 and README when installed. Preserve original bytes first and record the mapping. Original reviews and receipts remain historical; document 10’s predictive usage claims are superseded, not validated.

No SQL tables, Sequelize models or database migrations are introduced. Filesystem data contracts, trust boundaries, sequences, state machines, rollback and tests apply. Mermaid rendering is NOT RUN.

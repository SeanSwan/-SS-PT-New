**K1 — Readiness receipt**

Every slice receipt must include:

```text
Slice:
Status:
Source commit and dirty-state boundary:
Changed paths:
Preserved-source hashes:
Requirements covered:
Exact commands:
Actual exit codes:
Evidence artifacts and hashes:
Mocks and unverified boundaries:
Open findings:
Route/budget/approval receipt, if applicable:
Archive status:
Next authorized action:
```

Allowed status values:

- `NOT RUN`
- `PASS`
- `FAIL`
- `BLOCKED`
- `N/A — <concrete reason>`

**K2 — Traceability**

| Requirement | Main artifact/component | Acceptance evidence | Slice |
|---|---|---|---|
| V-01 | `01#A1`, engine, caller adapters | Caller-level mode/entry tests | S2, S5, S6 |
| V-02 | `03#C2–C3`, manifest | P01–P02; content/provenance inspection | S1 |
| V-03 | `03#C5`, freeze/dispatch | T01–T02; adapter boundary tests | S2–S5 |
| V-04 | `03#C4`, provider verifier | P03–P05; real route receipts | S1, S3, S4 |
| V-05 | `03#C4–C6`, policy/budget | P04; B01–B03; paid-route negative tests | S1, S2, S4 |
| V-06 | `03#C7`, coverage | P06–P08; manual relevance assessment | S1 |
| V-07 | `03#C8`, rounds | R01–R05; real prompt-equality capture | S2 |
| V-08 | `03#C8`, findings | D01–D03; complete resolution ledger | S1, S7 |
| V-09 | `03#C6,C9`, journal/engine | E01–E03; crash/concurrency tests | S2–S4 |
| V-10 | `04#B2`, caller migration | Reference map, compatibility tests, preservation hashes | S0, S5, S6 |
| V-11 | Reports and receipts | Evidence/status inspection; archive receipt | All |
| V-12 | Scope and ownership | Diff review and boundary tests | S0, S5, S7 |

**K3 — Coverage limits that must remain visible**

- Local schema tests do not prove semantic absence of personal information.
- Reference checks do not prove reviewer comprehension.
- Synthetic adapters do not prove subscription inclusion or provider isolation.
- In-memory journal tests do not prove filesystem durability.
- A single selected-route run does not prove every registry route.
- A legacy move does not prove other machine copies stopped dispatching.
- A structural readiness checker does not prove application behavior.

**K4 — Current receipt**

| Item | Current result |
|---|---|
| Existing packet review | Findings emitted in A1 |
| One self-review pass | Corrections emitted in A2 |
| Nine-document package | Emitted in this response |
| Repository inspection | NOT RUN — prohibited |
| Named skill loading | NOT RUN — source not supplied; filesystem access prohibited |
| Current test execution | NOT RUN |
| Current provider verification | NOT RUN |
| Implementation | NOT PERFORMED |
| Archive filing | NOT PERFORMED |
| Readiness | BLOCKED |

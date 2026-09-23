
---

> **CONTINUED FROM `03-contracts-a.md`** (C1–C5). Split at the C6 seam on 2026-09-22 for Rule 4 (300-line cap).

**C6 — Budgets**

```ts
type Amount = {
  calls: number;
  tokens: number;
  usdMicros: number;
};

type Budget = {
  limits: Amount;
  charged: Amount;
};
```

All values are nonnegative safe integers. One dollar equals 1,000,000 `usdMicros`.

Per-call output ceiling: 8,000 tokens.  
Per-call timeout ceiling: 600 seconds.  
Concurrent provider calls: one.

The operator declares the task’s call, token, and monetary limits. A subscription profile requires `usdMicros: 0`.

A round is admissible only if:

```text
charged
+ all requests in the proposed round
+ one remaining adjudication reservation
<= declared limits
```

The final reservation is counted exactly once.

Input bounds include instructions, artifacts, and peer material. If an adapter cannot produce a conservative input bound, dispatch is blocked. For metered routes, current price evidence must bound both input and output charges; rough packet prices are insufficient.

Settlement:

- Count every started invocation as one attempt.
- Use authoritative usage to settle tokens and spend.
- Missing usage retains the maximum reservation.
- Timeout or uncertain execution retains the full reservation and blocks the run.
- Actual usage beyond a declared bound is a reported budget breach and blocks further dispatch.
- Never retry automatically.

Maximum review-plus-adjudication call counts are:

```text
Mode 1: N + 1
Mode 2: N × completed_review_rounds + 1
```

For four reviewers: 5, 13, and 29 calls correspond to one, three, and seven review rounds.

A cap need not fund every allowed round. For example, a 12-call cap can admit two complete four-seat rounds plus adjudication, totaling nine calls; it cannot admit the third round.

**C7 — Review and coverage contract**

Ten areas, fixed order:

1. Architecture and boundaries.
2. Logic and correctness.
3. Backend.
4. Frontend.
5. Data and persistence.
6. Security and trust boundaries.
7. Performance.
8. Tests and verifiability.
9. Operations and failure modes.
10. Design and UX.

```ts
type EvidenceRef = {
  artifactId: string;
  sha256: string;
  startLine: number;
  endLine: number;
  quote: string;
};

type AreaCoverage = {
  area: number;
  status: 'examined' | 'not_applicable' | 'unexamined';
  method: 'static_inspection' | 'test_evidence' | 'none';
  observation: string;
  evidence: EvidenceRef[];
  findingIds: string[];
};

type Finding = {
  localId: string;
  area: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  claim: string;
  fix: string;
  evidence: EvidenceRef[];
};
```

The response also contains:

- `schemaVersion: 1`
- `seatId`
- `round`
- `findings`
- `coverage`
- `positions`
- `stop: "continue" | "settled" | "disagree"`

Validation:

- Exact JSON only; no prose extraction or fence stripping.
- Ten coverage entries, each area exactly once.
- `examined` requires a nonempty observation, a real method, and at least one valid reference.
- `not_applicable` must match the approved manifest; the reviewer cannot invent it.
- `unexamined` is retained as an honest result but blocks successful completion.
- Every reference must match artifact hash and complete referenced line text.
- Reference ranges contain 1–20 lines; quotations are limited to 8 KiB each.
- Every finding has a concrete fix and valid evidence.
- Coverage finding IDs must exist and match the area.
- Maximum 50 findings per response; excess is an invalid response, never silently discarded.
- No field may claim an unexecuted test passed.
- Citations establish reference integrity, not semantic correctness.

Finding IDs are assigned by the engine:

```text
<seatId>:r<round>:<localId>
```

**C8 — Debate and adjudication**

Round 1:

- Same approved subject and remit for every reviewer.
- No peer reviews in any request.
- Distinct seat identity is the only seat-specific instruction.

Later rounds:

- Every seat receives the same complete frozen prior-review corpus and finding ledger.
- No seat sees another seat’s current-round answer.
- Serial execution does not change available evidence.
- Peer content is delimited as untrusted data.

A position is:

```ts
type Position = {
  findingId: string;
  stance: 'uphold' | 'dismiss' | 'defer';
};
```

Convergence requires:

1. Every selected reviewer returned valid, evidence-complete output.
2. Every reviewer addresses exactly the current ledger.
3. No new finding appeared in this round.
4. All normalized position vectors agree.
5. No position is `defer`.
6. Every reviewer explicitly chose `settled`.

“Agree to disagree” requires all reviewers to choose `disagree`, complete ledger coverage, and at least one actual conflicting position.

Otherwise continue only if below the round limit and the next complete round plus adjudication fits the budget.

Adjudication is one fresh call with the complete ledger and reviews. Each ledger finding receives exactly one resolution:

```ts
type Resolution = {
  findingId: string;
  disposition: 'confirmed' | 'dismissed' | 'duplicate' | 'unresolved';
  rationale: string;
  evidence: EvidenceRef[];
  duplicateOf: string | null;
};
```

Duplicate links must resolve to a known nonduplicate finding and contain no cycle.

The adjudicator may introduce new evidenced findings. These receive engine-assigned adjudicator IDs and force `REVISE`; they do not trigger an unbudgeted debate.

The engine derives the result:

- `APPROVE`: complete valid evidence; every finding dismissed or linked to a dismissed duplicate root; no new findings.
- `REVISE`: any confirmed, unresolved, or new finding.
- `INCONCLUSIVE`: missing, invalid, or incomplete required evidence.

Convergence is a workflow condition, not a claim that the reviewed work is correct.

**C9 — Journal and failure behavior**

Persist before every provider invocation:

- Run/stage/request IDs.
- Frozen-content and policy digests.
- Reservation.
- `STARTED` state.
- Attempt timestamp.

Persist afterward:

- `COMPLETE`, `FAILED`, or `AMBIGUOUS`.
- Verified requested/served identity.
- Usage or retained maximum reservation.
- Structured error code.
- Response artifact digest.

A restarted process encountering `STARTED` without a terminal receipt marks it `AMBIGUOUS` and makes no new call.

Use exclusive run ownership and atomic writes. Do not seize a provider lock held by another process. If platform-specific durability cannot be demonstrated, live dispatch remains blocked.

Raw sensitive matches and credential-bearing errors must not enter public logs or receipts. Raw responses stay local and are not forwarded or archived until inspected and admitted.

**C10 — Configuration, storage, migration, rollback**

No new environment variable enables fallback or spending.

The existing `SWAN_COUNCIL_ENABLE_METERED_FALLBACK` must not bypass the new explicit profile and approval contract. Its current behavior requires inspection before integration.

Run-local files:

```text
run.json
manifest.json
roster-receipt.json
budget.json
journal.jsonl
stages/<stageId>.json
requests/<requestId>.json
responses/<requestId>.json
report.json
report.md
```

The run directory must be private, outside tracked source, and verified writable only by the intended local account and required system administrators. Do not invent a Windows ACL command without inspecting the actual environment.

No database migration is required.

Rollback:

- Disable new live dispatch.
- Preserve run evidence.
- Restore verified source snapshots if needed.
- Do not restore an old unguarded network path as the rollback behavior.
- No automatic deletion or retention cleanup occurs.

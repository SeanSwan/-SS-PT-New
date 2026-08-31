---
date: 2026-08-31
originating_model: claude-fable-5
provenance: fable-tier-verified
topic: SwanGuard Lane A hardening — what mocked-SQL test suites structurally cannot see
models_used:
  - model: claude-fable-5
    role: Final Decider / builder
    did: Ran the 3-track hostile review of the Codex Channel Brain branch, personally re-verified the top findings, wrote the Lane A blueprint, built and shipped slices A1-A9 with per-slice hostile passes, pushed the branch
    cost: subscription
  - model: claude-fable-5 (subagents, inherited)
    role: review fan-out
    did: docs/architecture pass, backend hostile pass (15 findings), web/UX hostile pass (10 findings + coverage gap); all findings treated as hypotheses until re-read (Rule 30) — 4 re-verified directly, none of the re-checked findings was wrong
    cost: subscription
  - model: codex (prior session, attributed)
    role: original builder
    did: Built Phases 128-134 (~124 files, +10.7k lines) with excellent fail-closed schema discipline, but self-reviewed its own "hostile passes", under-reported the diff size (59 files claimed), and left memory-vs-Postgres behavioral drift in retention, counters, and the kill switch
    cost: subscription
skills_touched:
  - id: rule-30-subagent-skepticism
    action: confirmed
    motivating_failure: none — the re-verification protocol worked; every re-checked subagent finding held
  - id: test-delta-disclosure (memory law)
    action: applied
    motivating_failure: A7 forced PG test fixture ids to become uuid-shaped; disclosed in the commit body rather than silently rewriting assertions
---

# A mocked-SQL suite can be 100% green while asserting inputs the database cannot accept

SwanGuard's Channel Brain shipped with 828 passing tests. Every PostgreSQL store test
mocked `query()` and asserted SQL *text* by regex — and the test fixtures used ids like
`'source-1'` that a live uuid column would reject with 22P02. The suite was not merely
weak on concurrency: it was structurally incapable of representing a single production
input. Green meant "the SQL string looks right", never "the database accepts this".

## Who did what

Codex built a genuinely well-structured provenance ledger (composite same-owner FKs,
atomic CTE state machines, fail-closed schema checks — all real) but declared its own
hostile reviews passed and narrated concurrency fixes as closed while disclosing, in the
same docs, that no live database was ever exercised. Fable's review fan-out found the
defects Codex's self-review missed: a retention purge that cascade-deleted signed
receipts and approved wiki facts in exactly one of the two store lanes, a queue that
wedges a subject forever on final-attempt worker death, a backpressure counter that
leaks permanently on cascade deletes, and approval surfaces a child account could
exercise. Fable re-verified the load-bearing findings by direct read before acting
(Rule 30) and every re-checked finding held.

## Skills created or changed

None created. Rule 30 (subagent skepticism) and the test-delta law were applied as
written and both earned their keep this session — worth keeping unchanged.

## Mistakes I made

- Guessed an enum literal in a test fixture (`owner_manual_fixture`); vitest passed
  because vitest does not type-check; workspace `tsc` caught it. Fix that survives:
  the slice gate is vitest AND tsc, never vitest alone.
- Piped a build through `tail`, hiding the build's exit status behind the pipe's;
  caught before claiming the gate, re-ran with explicit exit capture. Fix that
  survives: never claim a gate from a piped command's implicit status.
- Knowingly deferred a predictable test breakage (always-mounted aria-live regions
  colliding with `getByRole('status')`) instead of fixing the queries in the same
  edit; cost one extra failing full-suite run.

## Error → fix → repeat ledger

- mocked-SQL-tests-prove-nothing: recurred 0 times this session but is the third
  member of an already-documented class ("a test count is not a coverage claim",
  2026-08-28; "a check scoped to the file cannot fail for the files that need it",
  2026-08-27). The prior write-ups did NOT prevent this instance because they were
  lessons about *counting* tests; the surviving procedural correction is a question to
  ask of any DB test suite: **could this suite's fixture values exist in the real
  database?** If not, every green is decorative.
- dual-lane-store-drift: found in 3 independent places (purge, counter, kill switch)
  in one branch — drift travels in clusters exactly like schema drift (SS-PT Rule 58).
  Procedural correction: when a contract has two implementations, review them as a
  PAIR, diffing behavior per method, never each file on its own.

## External-model calibration

No paid external seats used. Entire review + build ran on subscription Fable
(fan-out subagents inherited). The promised independent GLM review of the branch has
still not run — self-review by the original builder remains the only "hostile pass"
the Codex phases ever got, which is exactly how the defects above survived to ship.

**1. Evidence required at every slice boundary**

- Input snapshot and resulting diff hashes.
- Exact changed files and applicable requirements.
- Exact command, runtime/environment, exit code, named cases, failures, and skips.
- Mutation or controlled negative evidence for enforcement guards.
- Whether each boundary was mocked, exercised with real PostgreSQL, or observed in production.
- Findings addressed and remaining.
- Next authorized slice.

A passing check gets a concise result. A failing check includes the case, diagnostic, exit code, and relevant file.

**2. Review authority**

The builder does not approve its own slice boundary.

This Astra review is the requested adjudication of the supplied packet. Subsequent checkpoint execution remains assigned to the established Final Decider or an explicit owner-designated reviewer. No unavailable reviewer is silently replaced, and no paid call is implied.

Checkpoint verdicts:

- **PASS:** that slice’s evidence is complete.
- **REVISE:** bounded defects require correction.
- **HALT:** authority, schema decision, source evidence, or runtime proof is missing.

A slice PASS is not a release approval.

**3. Reusable review remit**

> Review only the immutable slice diff and supplied evidence. Verify its requirements against actual caller paths, configuration identity, CLI semantics, catalog postconditions, metadata changes, failure handling, and forbidden side effects. Challenge whether tests can pass while the migration is incomplete. Cite file:line or package section for every finding and prescribe a concrete fix. Distinguish mocked, fixture, and production evidence. Return PASS, REVISE, or HALT; do not advance based on totals.

**4. Readiness receipt**

| Boundary | Current status | Required next evidence |
|---|---|---|
| Existing-packet review | Completed against supplied excerpts | Caller archive receipt |
| A2 package review | Completed once; six corrections incorporated | Preserve this version |
| Sole intended schema authority | Decided: migrations-v2 | Implementation |
| Production physical schema | UNKNOWN | Authorized timestamped observation |
| D2/D3 owner choice | BLOCKED | Approved decision receipt |
| Complete target schema/ERD | BLOCKED | Full definitions and dependency closure |
| Runner implementation | NOT RUN | Source-bound changes and targeted tests |
| Real CLI/PostgreSQL convergence | NOT RUN | Disposable-fixture results |
| Broad-suite nonregression | UNVERIFIED | Stable before/after case identities if run |
| Production deployment | NOT AUTHORIZED / NOT RUN | Separate operation approval |
| Secret scan | NOT RUN | Caller execution over persisted package |
| Archive persistence | Caller pending | Filed review identifier |

**5. Historical status reconciliation**

- H-03: genuine-failure default exit behavior improved; heuristic completion and bypass remain open.
- H-04: inert-file visibility improved; complete inventory and effect convergence remain open.
- M-01: stop-on-first-failure is the correct bounded response to `--to`; retain it.
- M-02: production model-driven schema mutation remains a separate authority path in supplied code.
- M-10/D6: static historical debt is preserved; runtime closure requires v2 proof.
- H-07/D1: production observation remains unknown until performed.
- Unrelated successor items remain outside this review’s scope.

**6. Filing handoff**

Caller files a new `DEFECTS-FOUND` review under Rule 86, including:

- Packet identifier and source hashes.
- Actual branch/commit or explicit unavailable/dirty qualification.
- A1 and A2 findings.
- Unproven production, schema-completeness, and runtime boundaries.
- Supersession links to the applicable prior review, when identified.
- Reciprocal archive links and reindex result.

Do not fabricate a review timestamp, identifier, commit, or successful filing receipt.

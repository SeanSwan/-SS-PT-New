# 07 — Checkpoints: submission protocol and review remit

Every slice is followed by a checkpoint. The builder submits; the reviewer adjudicates; only then does
the next slice begin. This document defines what a submission must contain and what the reviewer is
responsible for establishing.

---

#### Submission required after each slice

1. Starting and ending commit SHA.
2. Explicit changed-file list and diff.
3. Source excerpts for every changed trust boundary, with `file:line`.
4. Test command, exit code, and unedited output.
5. Migration up/down or documented nonreversible operation evidence.
6. Real-database concurrency output where required.
7. Exact HTTP status, headers relevant to the contract, and JSON body for acceptance curls.
8. Screenshots at 1440×900 and 375×812.
9. Keyboard/focus and reduced-motion evidence.
10. Bundle report for S6.
11. Secret-scan result.
12. Protected-file diff.
13. New deviations or unresolved questions, including an explicit `"None"` when empty.

#### Verdicts

- **PASS:** all slice criteria and regressions evidenced.
- **PASS WITH BOUNDED FOLLOW-UP:** only nonfunctional documentation cleanup; no security, privacy, migration, concurrency, contract, or accessibility exception.
- **FAIL:** return exact fixes; builder stops.
- **BLOCKED:** missing evidence or owner decision; builder stops.

No approval by silence.

#### Reusable review remit

> Review this slice as a hostile maintainer. Compare the implementation against the approved package and actual source excerpts. Inspect raw-body handling, authorization, exact DTO serialization, database constraints, transaction boundaries, concurrent execution, retry/revision ordering, kill-switch races, timezone boundaries, image-fetch isolation, accessibility, protected surfaces, and deployment migration discovery. Every implementation finding must include actual file:line evidence and a specific fix. Distinguish confirmed defects from hypotheses. Do not accept test counts without output, screenshots without viewport dimensions, or privacy claims based only on grep. Return PASS, FAIL, or BLOCKED with required actions.

#### Rollback boundaries

- Application rollback must not erase new revision/tombstone state.
- On receiver trouble: disable Spotlight; pause publishing; preserve outbox and cursor.
- On publisher trouble: pause publishing; retain drafts, events, and receipts.
- On digest trouble: stop the job and hide its surface; preserve preferences.
- On ceremony graphics trouble: force static rendering without changing claims.
- On migration trouble: restore only through the rehearsed database procedure, not a speculative down migration.
- Re-enablement requires the failed checkpoint to pass again.

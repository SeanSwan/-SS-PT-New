**Checkpoint order**

1. Verify dated, artifact-bound outputs against the slice criteria.
2. Walk applicable decision IDs.
3. Verify delegated bounds and required evidence.
4. Inspect drift: built-but-unspecified, specified-but-unbuilt, violated bans, changed registry facts.
5. Review screenshots and actual user flows.
6. Return `PASS`, `REVISE`, or `HALT`.

**Reusable review remit**

> Review only the declared slice and its dependencies. Verify mounted callers, authorized data sources, failure paths, and actual measurements. Attempt to break each claimed protection using the named negative controls. Check visual hierarchy and 375px usability as product requirements. Treat mocks as frontend evidence, not backend or production proof. Report each finding with an artifact location, reproduction, impact, and concrete correction. Do not relabel missing evidence as passing.

**Review authority**

This consult is the Astra planning review. The operator’s requested Opus 5.5 final review remains pending. No consultation, provider entitlement, paid call, or final approval is implied by this document.

**Verdict log**

| Stage | Verdict | Evidence | Reviewer |
|---|---|---|---|
| Supplied r1 review | DEFECTS-FOUND, historical | Packet §3 | Sable, as reported |
| This design consult | DEFECTS-FOUND; integration unready | PART A | Astra |
| S0 scoped repairs | Candidate tests PASS; application/review pending | 13 and 14; delivery evidence | Codex/Astra |
| S1–S9 implementation checkpoints | NOT RUN | None | Unassigned |
| Final Opus 5.5 review | PENDING | None | Requested by operator |

**HALT taxonomy**

| Code | Required action |
|---|---|
| SURFACE-ABSENT | Classify as new or remove the proposed upgrade claim; do not fabricate a mount |
| REGISTRY-MOVED | Refresh binding and affected contracts |
| DECISION-CONFLICT | Return conflicting IDs to architect |
| BOUND-UNSATISFIABLE | Provide measured constraint and proposed bounded revision |
| CLAIM-CONFLICT | Stop edits to affected files |
| CRITERION-UNMEASURABLE | Repair test/instrument before implementation claim |
| POLICY-UNAPPROVED | Keep monetary/retention/provider-dependent capability disabled |
| SOURCE-UNVERIFIED | Do not ingest, accrue, or show the source as authoritative |

**Drift report format**

`slice · tree hash · specified files · actual files · missing work · extra work · changed bindings · violated bounds · remediation · reviewer verdict`

**r3 guard**

Before any implementation checkpoint, run `node packet-integrity.mjs` from this packet and its mutation tests. This is an integrity check only. S0 candidate tests cannot pass S1–S9. Shared application requires complete ownership clearance, unchanged baseline hashes or reviewed conflict resolution, and exact-path claims. Final cross-family review stays PENDING; no Astra self-approval or invented subscription receipt.

**Status:** R2 bounded replacement candidate; not merged, implemented, tested or archived.

**Purpose:** Define the smallest enforceable closure path for controlled Village dispatch, identify unresolved evidence and decisions, and propose additive improvements.

**Claim boundary:** Controlled Village dispatch rejects forbidden artifact classes, requires review of frozen outbound content, and enforces an approved transport boundary. It does not certify arbitrary natural-language content as free of personal or clinical information.

**Fixed decisions**

- One Village; independent review and equal bounded debate are its two modes.
- Billing profiles are `subscription` and `special`.
- Subscription routes require verified included access and zero incremental API spend.
- Special routes require exact preflight and explicit spend authorization.
- Kimi and its aliases are prohibited in both profiles.
- Astra requests use `gpt-6-astra`, effort `xhigh`, subject to route verification.
- Fable remains the project-wide Final Decider and commit gate.
- Coverage is `examined`, `not_applicable`, or `unexamined`.
- At most seven review rounds; one separately reserved adjudication call.
- Incomplete rounds prevent adjudication.
- No automatic fallback or retry.
- Deletion and changes to other machine copies are outside scope.
- The console consumes engine artifacts additively.

**Requirements and acceptance**

| ID | Requirement | Acceptance |
|---|---|---|
| R-01 | Reject unsupported routes and prohibited identities. | Unknown routes, Kimi aliases and unverified billing profiles produce zero dispatches. |
| R-02 | Enforce corpus eligibility separately from identity redaction. | Forbidden and unresolved restricted-material classes cannot obtain a dispatchable envelope. |
| R-03 | Bind approval to actual outbound content and destination. | Any content, route, role, capability or budget change invalidates approval. |
| R-04 | Protect the final transport boundary. | Captured HTTP bodies/stdin equal the approved bytes; appended canaries cause zero sends. |
| R-05 | Preserve bounded review semantics. | Frozen roster, common remit, round cap, complete-round gate and separate adjudication reservation are enforced. |
| R-06 | Preserve spend and execution truth. | Reservations precede sends; uncertain execution does not release funds or trigger retry. |
| R-07 | Preserve authority boundaries. | Model output cannot authorize policy changes, commits, deployment or spend. |
| R-08 | Make conclusions resumable. | Reports bind to exact artifacts, disclose coverage and unknowns, and are filed before a completion claim. |
| R-09 | Keep the console additive. | Engine operation and results are identical with the console absent. |
| R-10 | Preserve existing work. | Originals and review history remain intact; locked shared files are not edited. |

**Roles**

- **Sean:** selects restricted-material policy and authorizes special-profile spend.
- **Content approver:** Sean, or a person explicitly delegated that authority with recorded bounds; approves exact frozen content.
- **Corpus preparer:** classifies artifacts and supplies provenance; cannot approve their own authority by setting a request field.
- **Route maintainer:** supplies current route, entitlement and capability evidence.
- **Run operator:** selects the proven roster and may cancel; cannot waive admission or budget checks.
- **Dispatcher/adapters:** enforce admission, final-byte equality and execution accounting.
- **Reviewers:** produce evidence-linked findings and declared coverage.
- **Astra adjudicator:** evaluates completed rounds without acquiring commit authority.
- **Fable:** retains the project-wide final decision and commit gate.
- **Archive owner:** files and links the review evidence.

These are responsibilities, not a requirement for separate people in every role. Any delegated authority must be explicit.

**Materialization**

The nine level-3 headings are the primary document boundaries.

Auxiliary files are emitted in `BEGIN FILE` / `END FILE` blocks:

- `03a-tightening.md`
- `09a-adapter-tests.md`
- `10-gaps.md`
- `11-upgrades.md`

After the normal nine-document split, the host must extract each auxiliary block verbatim into its named file and remove that block from the generated parent candidate. No existing splitter support is assumed.

Split points are:

1. `03-contracts.md` ends after C9; closure tables become `03a-tightening.md`.
2. `09-tests.md` ends after its execution-status paragraph; adapter cases become `09a-adapter-tests.md`.
3. `10-gaps.md` and `11-upgrades.md` are independent auxiliary documents.

These are proposed replacement boundaries, **not** a verified lossless split of the unavailable 420-line and 445-line originals.

Before adoption, preserve the original files, reconcile all original requirements, and verify every materialized file is at most 300 lines. Until then, documentation migration is BLOCKED.

**Unchanged document:** `02-wireframes.md`; its contents were not supplied and are not reproduced or certified here.

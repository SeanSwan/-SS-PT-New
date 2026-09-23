**Package version:** proposed v1  
**Status:** **DRAFT — PLAN NOT READY**  
**Implementation:** NOT PERFORMED  
**Tests:** NOT RUN  
**Review basis:** supplied packet only

**R0 — Intended outcome**

Build one Village review engine with:

1. Independent review followed by fresh adjudication.
2. Independent review followed by equal, bounded debate and fresh adjudication.

Both modes use the same packet-admission, provider-admission, budget, transport, evidence, and reporting contracts.

The privacy claim is deliberately bounded:

> Controlled Village dispatch rejects forbidden artifact classes, requires review of frozen outbound content, and enforces the approved transport boundary. It does not certify that arbitrary natural-language content is free of personal or clinical information.

A machine-wide “clinical narrative cannot leave” guarantee is **not established** by this package.

**R1 — Requirements**

| ID | Requirement | Observable acceptance |
|---|---|---|
| V-01 | One engine, two modes | Both entry paths execute the same engine and dispatcher. |
| V-02 | Structural packet admission | Unknown fields, production-derived artifacts, unknown provenance, and undeclared attachments cause zero sends. |
| V-03 | Approved outbound content | A changed stage, body, roster, policy, or budget invalidates authorization. |
| V-04 | Verified routes | Every selected seat has admissible current route evidence; Kimi is rejected. |
| V-05 | Explicit billing profiles | Subscription runs admit no metered route; special runs require bounded spend authorization. |
| V-06 | Accounted review coverage | All ten areas have valid examined evidence or approved N/A status. Unexamined areas prevent a successful review result. |
| V-07 | Bounded equal debate | Round 1 is blind; later seats receive identical frozen peer material. No hidden call or phrase-based termination exists. |
| V-08 | Complete adjudication | One fresh call resolves every namespaced finding, including duplicates and uncertainties. |
| V-09 | Durable accounting | Attempts are recorded before dispatch; ambiguous execution cannot be retried automatically. |
| V-10 | Compatible consolidation | Known callers are migrated and tested before any legacy move. |
| V-11 | Honest reporting | Reports distinguish corpus scope, route proof, test evidence, unresolved findings, and archive status. |
| V-12 | Preserve product boundaries | Product clinical-context policy and synthesis workflows are not silently changed. |

**R2 — Scope**

Included:

- The proposed `scripts/village/` implementation.
- The quoted review-egress boundary and its integration with selected transports.
- Council and retained review entry-point integration.
- Migration planning for the listed legacy review harnesses.
- Investigation and correction of the six listed image-dispatch bypass locations, subject to the media-contract blocker.

Excluded:

- Changes to product clinical-data retention.
- Repository-wide or machine-wide data-loss-prevention guarantees.
- New provider subscriptions, purchases, or entitlement assumptions.
- Automatic cleanup of other machine copies.
- Deletion of legacy evidence.
- Unrelated application work.

**R3 — Artifact applicability**

| Artifact class | Treatment |
|---|---|
| Blueprints | Supplied in documents `00`, `01`, `04`–`07`. |
| Wireframes | N/A for the proposed headless CLI; exact terminal states are specified in `02`. |
| Flowcharts | Literal Mermaid in `01`. |
| Sequence/state diagrams | Literal Mermaid in `01`. |
| Database ERD | N/A — no database change is proposed and no authoritative database schema was supplied. |
| Contracts/migrations/rollback | Supplied in `03` and `04`. |
| Executable tests | Contract-test source and exact commands in `09`; real integrations remain explicitly unverified. |

**R4 — Readiness gates**

Local implementation may begin only after the builder establishes the actual checkout, ownership, current source, preservation requirements, and existing exports.

Live dispatch additionally requires:

- Admitted routes for the entire selected roster.
- Demonstrated adapter content boundaries.
- An approved packet and frozen outbound stage.
- A sufficient budget including adjudication.
- Required local tests.
- No unresolved transport or provenance blocker affecting that dispatch.

No document in this package claims those conditions currently hold.

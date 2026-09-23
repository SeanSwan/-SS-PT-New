
#### 10-gaps.md

**B-R2-B — Missing specifications and evidence**

“Missing” below means missing from the supplied corpus. Except where directly stated by the packet, absence from the full original package remains `[UNKNOWN]`.

| ID | Missing item and evidence | Why it is a defect or blocking gap | Evidence that closes it |
|---|---|---|---|
| G-01 | Complete original finding, ban and decision registers. Evidence: packet §2 supplies counts and selected excerpts. | An amendment can silently remove obligations; exhaustive review cannot be claimed. | Original bytes plus one-to-one reconciliation. |
| G-02 | Final-writer proof for reported D1. Evidence: packet §0.1, prior review `#D1`. | Scanner correctness does not prove transmitted content matches approval. | Original canary and captured final-byte RED→GREEN evidence. |
| G-03 | CLI ambient-context capability contract. Evidence: round-1 A1-03 quoted in packet §0.2. | Approved stdin alone does not bound automatic context or tool-mediated egress. | Enforced isolation design and actual integration probes. |
| G-04 | Approval lifetime across generated rounds. Evidence: packet §1 items 1 and 8. | Future responses can enter new requests after the initial content was approved. | C3 implementation and `T-APPROVAL-03`. |
| G-05 | PRIVATE restricted-material authority record. Evidence: packet §0.3. | An adapter would otherwise decide a product-policy dispute. | Sean’s bounded decision and policy tests. |
| G-06 | Explicit approval, route-maintenance, cancellation and archive responsibilities. Evidence: packet §1 defines reviewer/final-decider authority but supplies no complete operator-role contract. | Missing responsibility can leave authorization and recovery ownerless. | Named owners/delegations implementing `00-README.md#Roles`. |
| G-07 | Cross-process duplicate-dispatch and restart contract. Evidence: packet §3 reports four worktrees and live locks. | Concurrent or restarted runners can duplicate external calls and reservations. | Atomic-claim and crash-recovery tests using separate processes. |
| G-08 | Ambiguous delivery and budget settlement semantics. Evidence: packet §1 items 4 and 8. | Timeout can otherwise enable duplicate execution, overspend or false completion. | `T-BUDGET-03` and recovery tests. |
| G-09 | Typed schemas for the six image bypass locations. Evidence: packet §2 blocked image-repair item; §3 lint count. | An image exemption can hide text, metadata or unsupported payload channels. | Exact caller schemas and six caller-level tests. |
| G-10 | Credential and diagnostic channel boundaries. Evidence: A1-03 includes diagnostic uncertainty; Council’s `redactKey` is not content redaction, packet §0.1. | Correct body scanning can coexist with credential or content leakage elsewhere. | Authentication allowlist and log/query/header canary tests. |
| G-11 | Untrusted reviewer-output authority boundary. Evidence: packet §1 item 6 preserves Fable’s authority. | Generated instructions can otherwise be interpreted as control-plane actions. | Typed report ingestion and zero-side-effect injection tests. |
| G-12 | Dirty-tree evidence identity. Evidence: packet §3 reports 1,347 dirty paths. | HEAD alone cannot identify the reviewed implementation. | Relevant file hashes, source provenance and reproducible evidence binding. |
| G-13 | Runnable regression sources and actual outcomes. Evidence: packet §2 lists unavailable integration tests; §3 says S0 has not run. | Named test plans cannot establish implementation behavior. | Test bodies, commands, observed failures and passing results. |
| G-14 | Archive publication and supersession disposition. Evidence: packet §0.1 and §2 identify prior reviews without full bodies. | An unfiled or overbroad successor can make unresolved findings disappear from discovery. | Filed R2 review with explicit scope; retain R1 as applicable until reconciliation supports supersession. |
| G-15 | Artifact retention, access and deletion policy. Evidence: bounded frozen-content approval requires stored content, packet §1 item 1; retention rules are not supplied. | Frozen prompts and reports may themselves contain sensitive material; ad hoc storage or cleanup can violate the privacy boundary or destroy evidence. | Explicit storage access, retention and authorized cleanup contract. No deletion is authorized here. |

**Required unknown closures**

| Required item | Current answer | What proves closure |
|---|---|---|
| A1-01 — product/dev sharing | Still unprovable. | Actual import/caller graph and boundary tests; preserving product clinical-field behavior while denying ineligible Village content. |
| A1-03 — channel coverage | Shared subscription-input control is a verified gap; other channels remain unproved. | Final-writer and capability tests for each admitted adapter. |
| A1-04 — subscription automation | Still unprovable. | Route-specific included automation evidence and a bounded synthetic probe where authorized. |
| A1-06 — Fable correction scope | Decision scope closed by packet §1 item 6; code unproved. | Diff and tests showing only model-specific remit authority changed. |
| A1-07 — Council assurances | Shared-boundary assurance contradicted by supplied evidence; remaining assurances unproved. | Recover exact assurance claims and test the actual Council path for each. |
| A1-10 — budget terms | Still unprovable. | Exact route limits, entitlement/pricing evidence, frozen budget record and reservation tests. |
| A1-13 — route currency | Reference count and retired slug are host-supported; replacement route eligibility unproved. | Current provider-route evidence and complete caller inventory. |
| Four unsupplied historical artifacts | Unreviewed; identities/bodies not supplied. | Supply each artifact’s identity, exact bytes and relevant sections; close each separately. |
| INCONCLUSIVE egress review’s six unproven items | Still unproved. | Recover the six exact items and attach a result to each; zero reported defects is not closure. |
| Requested versus served model | Requested configuration is reportable; served identity remains unobservable on the supplied transport. | Only new transport evidence exposing served identity can change that claim. No assumed identity is needed to record honest requested-route evidence. |

<!-- END FILE: 10-gaps.md -->

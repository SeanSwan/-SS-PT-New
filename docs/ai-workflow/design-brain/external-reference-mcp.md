# External Reference MCP Protocol

Status: hardened after independent Opus and Kimi review on 2026-07-26. The shared runtime enum is `scripts/design-brain/src/reference-modes.mjs`. Legacy H/T/L letters and Inspect (`I`) are refused with `E_LEGACY_MODE_REFUSED`; they are never privilege-mapped.

## Modes

| Mode | Name | Allowed purpose | Durable write | State |
|---|---|---|---|---|
| P | Probe | One connector-availability check | One overwrite-only `probe.json` heartbeat | enabled |
| S | Spec | Original Swan-authored task-local experiment | none | disabled |
| D | Doctrine | Sean-authored canon decision based on owned Swan trials | Sean-only canon edit | gated |
| X | Source corpus | Store provider-derived source material | none | blocked |

### P - Probe

Exactly one query and one result. The only retained fields are schema, day, connector, availability, and the fixed purpose `current connector availability`. Query text, result identity, product identity, timestamps, research detail, and source media are forbidden. The heartbeat overwrites the prior value; it is not an activity log. Pre-hardening `probe.log`, attestation, or timestamped write-ledger artifacts are not migrated automatically; operators must inventory them and obtain explicit cleanup approval before any purge.

### S - Spec

`spec-mode.json` remains `enabled:false`. An enabled boolean is insufficient: activation requires a valid Ed25519-signed, expiring, revocable `authority/1` record, a trusted clock, evidence references, and Sean as approver. SDIR v2 permits only `owned-synthetic`, `synthetic`, or `licensed` provenance and Class 0/1 data. Production-derived data is forbidden. Safety-critical surfaces require screening, contraindication, trainer-approval, and stale-assessment states plus qualified review; prescriptive loads, reps, sets, tempo, range-of-motion, percentage, or similar instructions are rejected. There is no `design-specs` vault writer.

Activation remains blocked until all external gates exist: written clarification from Mobbin, qualified legal review, explicit Sean risk acceptance, protected-branch/CODEOWNERS enforcement, sole-path network egress enforcement, production IAM, hardware/KMS-backed authority keys, a trusted time source, and revocation operations.

### D - Doctrine

Only Sean changes canon. Mobbin records and SDIRs are never corroboration, novelty, or doctrine evidence. Doctrine requires owned Swan trials and an explicit human decision.

### X - Source-corpus

Blocked by default. A clearance file must be `clearance/2`, limited to `source-corpus`, tied to terms `2026-05-16`, based on written permission, Ed25519-signed by Sean, time-bounded, checked against revocation, and verified using trusted time. This code contract does not claim Mobbin permission or legal approval.

## Egress and audit

`egress-policy.mjs` denies by default. Only typed Class 0 fields (`taskId`, `testCount`) may be authorized for an external model. Class 1, Class 2, free text, screenshots, identifiers, URLs, tokens, customer information, and production-derived content are denied. This module is a policy primitive; production sole-path enforcement is still an external deployment gate.

Stateful receipt-write adapters record a minimal `denial/1` receipt containing only day, a closed code, and a closed operation. The `authorizeAndAuditEgress` wrapper records denied egress attempts; the pure predicate remains test-only until production sole-path enforcement is installed. Rejected payloads are never persisted.

## Source classes

New writes must use exactly `owned-synthetic`, `synthetic`, `licensed`, or `mobbin`. `owned` is a refused legacy label; any production-derived class is blocked. Mobbin remains excluded from novelty and corroboration and cannot enter the source corpus without valid X clearance.
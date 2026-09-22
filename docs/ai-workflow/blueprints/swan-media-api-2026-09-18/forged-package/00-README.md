**Artifact:** Swan Media API blueprint revision 2  
**Baseline:** `90f8e34ed228fbe207dcdfdbcf12c4003c037e0d`  
**Owner:** Sean  
**Status:** UPDATED PLAN; implementation and archive gates remain BLOCKED.

This package carries forward the prior adjudication’s neutral asynchronous API, explicit provider identity, server-owned allowances, durable jobs, truthful settlement, and five slices. It repairs contradictory execution instructions and specifies missing boundaries. It does not enable execution.

**Canonical placement**

Use the existing directory:

```text
docs/ai-workflow/blueprints/swan-media-api-2026-09-18/
```

Preserve `PACKET.md`, `ASTRA-PRO-REPLY.md`, and the existing README as historical evidence. The nine numbered documents become the revised implementation package after being saved and checkpointed. Do not create a competing blueprint directory.

The documents are emitted here but have **not** been saved. Preservation hashes, splitter validation, secret scan, archive filing, and readiness-tool execution remain NOT RUN.

**Outcome**

An authenticated caller can discover eligible routes, obtain an immutable quote, admit one durable job, observe truthful execution, and retrieve verified media. Local and hosted execution retain their distinct duration, licence, resource, billing, and cancellation semantics.

**Non-goals**

No frontend, MiniSwan generation worker, production deployment, external image upload API, arbitrary graph API, vendor proxy, automatic fallback, predictive GPU-time guarantee, or provider enablement.

| Requirement | Measurable acceptance | Owner/component | Tests |
|---|---|---|---|
| R1 — Explicit execution identity | Every admitted job pins provider, profile/schema, policy and quote hashes | Registry, profiles, admission | ROUTE-001, CAP-001 |
| R2 — Strict authenticated API | Invalid shape/auth refuses before any admission or backend request | HTTP, auth, contracts | API-001, AUTH-001/002 |
| R3 — Policy preservation | Licence, prompt, preview and graph gates remain authoritative | Existing policy modules | LIC-001, GRAPH-001, REG-001 |
| R4 — Bounded admission | Atomic run count and integer-money reservation precede dispatch | Existing ledger extended | PAY-001/002, PRICE-001 |
| R5 — Durable lifecycle | Restart never invents failure or repeats uncertain submission | Store, journal, dispatcher | JOB-001/002/003, STORE-001 |
| R6 — Controlled artifacts | Success means copied, hashed, inspected, owned asset with provenance | Artifact service | ASSET-001, DUR-002 |
| R7 — Exposure boundary | Literal loopback only; no configuration escape hatch | Server configuration | NET-001 |
| R8 — Honest evidence | Claims identify observed, published, synthetic and unproven facts | Catalogue, receipts | CAP-001, EVID-001 |

**Builder contract**

Follow the package’s decisions. Build one bounded sub-slice at a time. Return its exact diff and acceptance evidence for checkpoint review. Where a consequential dependency is unavailable, record BLOCKED rather than inventing it. Never convert a mock result into live proof.

**Current receipt**

- VERIFIED: baseline commit and branch; targeted static source evidence.
- RECORDED, NOT RERUN: 29 gates / 1097 assertions.
- BLOCKED: real Slice 1 execution, resource-policy integration identification, Windows crash proof, hosted contract/enablement, archive filing.
- NOT RUN: new tests, rendered-diagram validation, secret scan, structural readiness check.
- N/A: frontend wireframes, UI accessibility matrix, Sequelize migration.
- No files, screenshots, or temporary artifacts created in this pass.

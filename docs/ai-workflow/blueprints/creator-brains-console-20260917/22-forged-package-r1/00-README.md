**Package version:** upgrade-r1-adjudicated.  
**Disposition:** **REVISE → S2 entry permitted for planning/source binding; implementation readiness conditional on the named entry receipts.**

**Decision:** This package is the normative upgrade overlay. Preserve the supplied originals and historical receipts. Do not overwrite a filed review, erase a declined finding, or relabel unexecuted tests as passing.

**Builder Contract**

> Follow the decisions below. Build one bounded slice at a time. Return its explicit diff, requirement-linked evidence, and checkpoint result. Do not silently substitute APIs, change engine files, or turn an unresolved contract into an assumption. Record actual output in evidence files; report green checks concisely and failures with the failing assertion, file, and exit code. Advance only after the checkpoint passes.

**Locked boundaries**

- Console home: `packages/creator-brains-console/`.
- Engine tree: `scripts/creator-brains/**`, including README files, is immutable for this work.
- CD3 remains locked; preserve S5 and integrate it.
- Standalone first. S7 transfer remains separately gated on Sean’s explicit go.
- Backup remains visible, blocked, and endpoint-free.
- No raw transcript content in HTTP responses, worker result messages, UI, logs, verification records, or exports.
- No new provider calls, authentication system, database, or engine dependency.

**Historical evidence retained**

Every row below is `[VERIFIED]` as a **packet report**, not a fresh execution result.

| Receipt | Preserved scope and interpretation |
|---|---|
| Engine baselines | 136/136 offline over 15 files; earlier 191/182-of-189/185 references; 183/183 over 25 files later superseded; subsequent C1 failure and independent HR14f flakiness. None is promoted to current baseline. |
| S0/S1 | Nine-route S0 receipt; bridge 105/105 and web 48/48 at the stated checkpoint; S1’s original 31 tests, 81-test bridge regression, 49-module build, 180.35kB raw/60.21kB gzip. |
| Round-4 S1 | Eight findings repaired; web 39/39; 12/12 exit checks; 60.39kB gzip; 41-source cap walk and 30 containment refusals. The reported 97 bridge count remains marked inflated. |
| Round-5 counts | 97 reported versus 85 unique tests; helper moved to `fixtures.mjs`; then 93, 99, and 105 at successive checkpoints. Later 137 is a separate dated receipt. |
| D7 | Relocation executed; engine consistency gate 15/15; 85 engine sources instead of the polluted 184-file walk; no engine edit claimed by that receipt. |
| S5 unit/render receipt | T-T1 14/14; T-T2 8/8; T-W7/T-E3 11/11; initial `WebGLRenderer` count 0 versus deferred 6; initial/deferred raw sizes 220.64/521.98kB; CPU-side 0.0036ms measurement. |
| S5 rendered evidence | GPU census 42,576 on / 15,927 off; camera-fit and pointer-coordinate defects repaired; extraction preserved byte-identical canvas readback. |
| Later S5 browser receipt | 90,740 changed pixels; median 0.1ms; synchronized samples ≤2.2ms; allocation 30→30; dolly moved/converged; five mutation failures. Midday retraction and later replacement remain part of the history. |
| S5 exit suites | Engine `204/0/6`, console `336/0`, web `145/0`, TypeScript zero errors, zero files over 300, as recorded. Do not reinterpret the third engine number without its runner output. |
| Structural readiness | Historical `structurallyReady:true`; reference integrity only. |
| Review provenance | Eight reported reviews; first HY4 attribution corrected to probably Hy3, second to builder; three paid zero-output attempts; recorded cost $0.0563. |
| Astra consult history | Initial CLI-flag failure; repaired harness 10/10; subsequent quota refusal. Later adjudication: REVISE, 16 A1 findings, six A2 corrections; requested identity/effort distinguished from unverified served identity. |
| Astra usage receipt | The supplied adjudication records 666.5s, 1,196,022 input / 20,637 output / 1,553 reasoning tokens and $0 metered. Preserve as reported receipt fields; do not infer remaining allowance or reuse the superseded 75k/~20k estimates. |
| Repository maintenance | Historical 24 dangling skill links, 119→2 reported deletions, zero dangling afterward, preserved prompt-watcher edit. Not a console release criterion. |
| Cap | Historical peak 283 is superseded by the packet’s later engine measurements: 300 and 297. Current console source counts require a new bound manifest. |

**Requirement amendments**

| ID | Binding acceptance criterion |
|---|---|
| R1–R3 | Preserve launcher, status, and damage behavior. Actual launcher timing remains a Windows receipt; status damage remains a field on HTTP 200 where specified. |
| **R4 amended** | New creator starts disabled; re-add preserves existing consent; enable/disable reflects authoritative reread. A concurrent read completes while resolution is blocked. |
| R5–R6 | Preserve cited queries and pinned derived BrainDoc reads. Missing publication, skipped content, and zero matches have different UI states. |
| R7 | Acceptance is not completion. A terminal verdict requires correlated engine evidence. Shared exclusion covers daily and repair. |
| **R8 amended** | Canary executable; repair gated by run safety; backup visible but locally blocked with no request or destination input. |
| R9–R16 | Retain excluded operations, CD3, design law, adapter boundary, zero-dependency bridge, viewport matrix, gated transfer, and keyboard equivalence. |
| **R17 — Responsive writes** | T-N01 proves real synchronous resolution runs off-thread; T-N02 proves console registry writes cannot race; T-N03 proves uncertainty never triggers automatic replay. |
| **R18 — Runtime contracts** | Every newly consumed response passes its named validator. A missing dereferenced field yields `PAYLOAD_INVALID` naming the JSON path, with shell and retry UI retained. |
| **R19 — Display/privacy** | Allowlisted projections and inert rendering pass leak, traversal, unsafe-link, and error-redaction controls. Derived content never receives a curated/reviewed badge. |
| **R20 — Evidence freshness** | Each view displays observation/freshness and publication identity without implying a cross-route atomic snapshot. A late response cannot replace newer selection/data. |
| **R21 — Software Review Ledger** | Candidate verification requires passing applicable evidence, review, no unresolved blocking finding, and a matching anchor. Tamper, truncation, stale target, and candidate-only controls fail eligibility. |
| **R22 — Optional Evidence map** | No new route; explicit lazy load; list remains usable after module/render failure; absent data produces a named error; no temporal/geographic inference. |
| **R23 — Measured visual quality** | Exact six-token palette, 44px controls, 4.5:1 normal text, viewport matrix, focus behavior, screenshot review, and preserved S5 rendering gates. |
| **R24 — Evidence integrity** | Unique tests, file hashes, actual commands, environments, mocks, exclusions, and unresolved gates accompany every completion claim. |

**Two additional improvements worth their cost**

1. **Publication reference copy:** copy only channel ID, generation, and content digest from the drawer. This makes a reported discrepancy reproducible. No transcript or full claim export.
2. **In-memory return context:** preserve query text, selected creator, and scroll position when opening/closing a drawer. Clear on reload; add no browser persistence or migration.

**Single next slice:** **S2**, starting with the source-binding receipt and S1-H12 regression. S8/S9 do not delay this work.

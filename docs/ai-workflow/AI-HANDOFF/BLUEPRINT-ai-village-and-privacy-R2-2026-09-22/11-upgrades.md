
#### 11-upgrades.md

**B-R2-C — Additive improvements, ranked by value per unit risk**

All upgrades consume artifacts the correctness work already requires. If those artifacts do not expose the needed data, defer the upgrade; do not modify the engine merely for presentation.

| Rank | Upgrade | Value | Cost | Risk | Dependency | Recommendation |
|---|---|---|---|---|---|---|
| 1 | Read-only closure navigator joining finding IDs to tests, evidence and remaining blockers. | Makes unresolved defects easy to locate across rounds. | Low. | Low; must retain unknown statuses. | Published closure ledger and receipts. | **RECOMMENDED** |
| 2 | Local comparison of two approved manifests and their redacted previews. | Shows exactly why reapproval is needed. | Low–medium. | Low if restricted to already-approved artifacts. | Stable manifest/preview format. | **RECOMMENDED** |
| 3 | Portable synthetic adapter-conformance kit. | Lets new routes demonstrate the same rejection and byte-equality guarantees. | Medium. | Low–medium; avoid implying it proves provider internals. | Stable final-writer seam and tests. | **RECOMMENDED** |
| 4 | Read-only run timeline for reservations, round completion, cancellation and uncertainty. | Improves recovery ergonomics. | Medium. | Low; derived views must show missing data explicitly. | Existing run receipts/journal exports. | **OPTIONAL** |
| 5 | Offline comparison of prior reviewer findings by stable evidence references. | Helps detect repeated findings and changing interpretations. | Medium. | Medium; similarity is not equivalence or resolution. | Filed reports with stable IDs. | **OPTIONAL** |
| 6 | Statistical summaries of reviewer disagreement and coverage declarations. | May improve roster selection over time. | Medium. | Medium–high; easily mistaken for reviewer quality or correctness. | Sufficient comparable historical reports. | **SPECULATIVE** |

**Considered and rejected**

- **Engine changes for richer console animations or dashboards:** REFUSED; violates the additive boundary.
- **Automatic model-based sensitive-content clearance:** rejected as an admission authority; classification uncertainty cannot become permission.
- **Automatic replacement of retired routes:** rejected; violates route selection, entitlement and no-fallback requirements.
- **Automatic PRIVATE allowance because Sean has a subscription:** rejected; silently resolves the reserved policy decision.
- **Automatic extra reviewer or adjudication retries:** rejected; changes the frozen budget and run contract.
- **Reviewer leaderboard based on “issues found”:** rejected; rewards inflated and duplicate findings.
- **Legacy deletion as consolidation:** rejected; cleanup authorization and migration evidence are absent.

<!-- END FILE: 11-upgrades.md -->

**M0 — Preserve L6 source**

- **Entry:** packet’s candidate locations and named scopes; local preservation owner assigned.
- **Work:** provisional rescue; writer coordination; stable inventories; version reconciliation; two verified copies.
- **Exit:** preservation records satisfy MR-01.
- **Test:** `preflight: preservation` in `09-tests.md`.
- **Stop:** missing source, unexplained divergence, incomplete copy or unattested storage independence.
- **Recovery:** retain all candidates and repeat stable capture after resolving the gap.
- **No product code change.**

**M1 — Establish the manual substrate**

- **Entry:** verified preservation or an explicit preserved emergency state while other nondependent preparation continues.
- **Work:** snapshot the existing policy; amend its installed-mechanism section; create registry and evidence tests; assign integration ownership.
- **Exit:** no active claim that nonexistent controller/native-hook enforcement protects this task; registry paths and authority references are valid.
- **Tests:** `preflight: registry`, plus a manual policy inspection recorded in the receipt.
- **Stop:** multiple apparent canonical mandate files, unresolved authority or overlapping ownership.
- **Rollback:** revert the isolated policy/tooling commit; retain all evidence.

**M2 — Admit one lane slice**

- **Entry:** M1 complete; lane selected under `04-build-order.md`.
- **Work:** map existing implementation; bind exact contracts; update the lane’s own package; identify executable tests; implement only the admitted scope; freeze the result.
- **Exit:** lane behavior tests pass, exact-source preflight passes, required reviews are filed and final authority admits the revision.
- **Tests:** complete evidence suite plus the lane’s frozen named commands.
- **Stop:** unverified caller, schema, API, authority, source identity or acceptance boundary.
- **Rollback:** discard no shared work; repair or revert only the isolated slice under a new revision.

**M3 — Integrate and verify the combined state**

- **Entry:** individually admitted slice; integration owner has exclusive merge ownership.
- **Work:** integrate explicit commits; resolve conflicts as new changes; bind resulting tree; run affected consumer and regression checks.
- **Exit:** combined revision accepted under the applicable review policy.
- **Tests:** complete evidence suite on the integrated snapshot and the affected lane test union.
- **Stop:** conflict resolution changes reviewed behavior, runtime dependency drifts or a consumer check fails.
- **Rollback:** revert the lane’s integration commits and verify the restored integration tree.
- **Deployment:** separate; M3 grants no production push authority.

**Lane work remains bounded**

Existing lane slice IDs and acceptance criteria remain authoritative. The queue above does not rename their internal slices or replace their tests with master artifact checks.

**Traceability**

| Packet concern | Requirement | Slice | Verification |
|---|---|---|---|
| X1 missing controller | MR-03 | M1 | Manual policy inspection; no hook-enforcement claim |
| X2 unverified implementations | MR-05, MR-06, MR-09 | M2/M3 | Existing-artifact classification; actual lane results |
| X3 repeated readiness blockers | MR-02, MR-06, MR-07 | M1/M2 | Shared records plus per-revision evidence |
| X4 path/supersession drift | MR-04 | M1 | Registry test and authority inspection |
| X5 dirty, concurrent source | MR-02, MR-08 | M2/M3 | Clean isolated source and exact manifest checks |
| X6 vulnerable L6 work | MR-01 | M0 | Stable inventory/copy verification |
| X7 React cohort risk | MR-06, MR-08 | L1 B1/B2 | Exact dependency cohort and separate runtime acceptance |

# PART A — Hostile Review (Astra Pro)

> Review first, per the Forge: findings carry file:line evidence and a fix.
> A finding without a fix is not a finding.

---

**Verdict: DEFECTS-FOUND in the supplied cross-lane planning and admission model. No implementation verdict is issued.**

Evidence labels apply throughout:

- **[VERIFIED]** — established by the supplied packet or explicitly decided in this package.
- **[LIKELY]** — supported inference, requiring confirmation before implementation.
- **[HYPOTHESIS]** — a possibility to test, not an established dependency or defect.
- **[UNKNOWN]** — evidence was not supplied.

Repository measurements are inherited **as dated 2026-09-20 premises**, not independently refreshed facts. References below use packet sections because source-file line numbers were not supplied. No invented line numbers are used.

**A1 — Review of the supplied existing-blueprint material**

Review coverage: the eight lane excerpts, document inventories, cross-lane findings, infrastructure inventory and archive summary. **[UNKNOWN]** The contents of the underlying wireframes, schemas, tests, adjudications and archived findings were not supplied. Their correctness—and whether particular findings were previously settled—is outside this pass.

The following findings identify cross-lane consequences and decisions. They do not claim to rediscover the archived lane defects.

| ID | Severity | Finding and evidence | Concrete fix |
|---|---|---|---|
| A1-01 | High | **[VERIFIED]** The specified controller is absent in the packet’s measurement, while concurrent writers remain active. A written freeze cannot establish that a native hook blocks their edits. Evidence: `MASTER-PACKET.md §1`, `§3/X1`, `§3/X5`. The new master concern is **false enforcement across lanes**, beyond the already reported missing files. | Select an explicitly manual workflow. Freeze isolated, committed revisions; record review policy and source hashes; check them before admission and integration. Amend the actual canonical mandate to remove active controller/hook claims. Do not implement a controller in this workstream. |
| A1-02 | Critical | **[VERIFIED]** L6 contains reported uncommitted, ignored work, but the listed current salvage worktree and the lane’s original source directory are different locations. Their equivalence is **[UNKNOWN]**. Evidence: `§1`, `§2/L6`, `§3/X6`. Treating the registered salvage worktree as proof that preservation is finished could strand a unique version. | Inventory and preserve each candidate independently. Start a provisional rescue immediately; then obtain writer quiescence, reconcile inventories and verify stable copies. Do not delete either source or choose a winner from branch names alone. |
| A1-03 | High | **[VERIFIED]** `S5 BUILDABLE` is a lane-local claim; the archive summary also records an L4 correctness review with `DEFECTS-FOUND`. Whether that review has been resolved is **[UNKNOWN]**. Evidence: `§2/L4`, `§5`. A master queue must not promote that label into current admission. | Put L4 first in the product implementation queue **after** exact-revision source binding, review disposition and executable acceptance gates. No lane receives present implementation admission from this packet. |
| A1-04 | High | **[VERIFIED]** Eight unverified implementations do not imply eight absent implementations. L6 explicitly contains code and a results document; L3 names existing runtime facilities. Evidence: `§2/L3`, `§2/L6`, `§3/X2`. Treating these lanes as greenfield would risk duplicate systems or overwriting work. | Require an adopt/extend/preserve classification of existing artifacts before each lane slice. Never rebuild a component solely because its implementation acceptance is unverified. |
| A1-05 | High | **[VERIFIED]** Package aliases, document supersession and architectural authority are different concerns. L2 has a location mismatch, L4 records a rename, and L6 rejects an older merge document while retaining selected patterns. Evidence: `§2/L2`, `§2/L4`, `§2/L6`, `§3/X4`. A universal “old path redirects to new authority” rule would collapse these distinctions. | Introduce one registry with separate fields for canonical package paths, aliases, document status and authority scope. Keep L6’s `MEGA-BLUEPRINT.md` authoritative inside L6; the master governs only cross-lane admission and integration. |
| A1-06 | High | **[VERIFIED]** The packet does not establish runtime dependency edges between the eight lanes. Shared product vocabulary is insufficient to prove that L2 consumes L3, L4 consumes L3 events, or the public homepage consumes L6 fleet assets. Evidence: `§2/L1–L8`, `§4`. | Separate mandatory gates, chosen scheduling priorities and conditional consumer dependencies. A conditional dependency becomes a hard edge only when a frozen caller/contract receipt proves it. |
| A1-07 | High | **[VERIFIED]** X7 is a dated dependency measurement. It does not provide a tested replacement cohort, complete transitive compatibility evidence or React 19 runtime results. The `framer-motion`/`motion` row also spans different package names. Evidence: `§3/X7`. | Carry the measurement unchanged as the planning baseline. Keep L1 A independent. Require an exact lockfile cohort and import/API audit for B Stage 1; require separate runtime acceptance for B Stage 2. Do not infer compatibility from peer ranges or negative grep results alone. |
| A1-08 | Medium | **[VERIFIED]** L3, L5 and L7 lack separately named `09-tests.md` documents in the supplied inventories. Whether their existing documents already contain usable tests is **[UNKNOWN]**. Evidence: `§2/L3`, `§2/L5`, `§2/L7`. The master currently cannot address their acceptance commands uniformly. | Produce a lane test index by first mapping existing tests and acceptance criteria. Add missing executable cases only where an actual coverage gap is established. Missing filenames are not proof that testing content is absent. |
| A1-09 | High | **[VERIFIED]** L7’s inherited boundary is an unchanged existing API and no web modifications. Its actual endpoint contracts are not supplied. Evidence: `§2/L7`. A master “shared API improvement” could silently violate that lane decision. | Freeze the API contract used by mobile before Phase 1/2 admission. If mobile requirements cannot be met without backend changes, block that requirement and obtain an explicit scope amendment; do not hide the change inside another lane. |
| A1-10 | High | **[VERIFIED]** The archive summary supplies verdicts and IDs, not review bodies, exact reviewed bytes or dispositions. Evidence: `§5`. This response cannot establish that an old defect is closed or that a new package is filed. | The caller files this master review and records its archive ID. Each lane’s later admission requires the actual applicable review, its revision binding and resolution evidence. The master review does not supersede the lane reviews. |

**A2 — One hostile review of the draft master package**

The draft was reviewed once. The following changes are incorporated into PART B.

| ID | Draft defect found | Fix reflected in the emitted package |
|---|---|---|
| A2-01 | Requiring a fully stabilized source before taking any L6 copy would prolong the data-loss exposure. Evidence: draft `04-build-order.md#M0`. | Split preservation into immediate **provisional rescue** and later **verified stable preservation**. The former authorizes no build or deletion. |
| A2-02 | A single ordered list made scheduling preferences resemble proven technical dependencies. Evidence: draft `01-architecture.md#Dependency model`. | Label every edge as mandatory, conditional or scheduling-only. Supply a bounded rule for skipping a blocked lane. |
| A2-03 | Including review receipts inside the artifact they hash creates a circular identity and invalidates the snapshot when a review is filed. Evidence: draft `03-contracts.md#Revision identity`. | Freeze source and policy in `snapshot.json`; store test results, archive references and admission attestations outside that snapshot. |
| A2-04 | “All evidence tests pass” could be mistaken for product acceptance even when only manifests and receipts were checked. Evidence: draft `07-checkpoints.md#Admission`. | Separate evidence-integrity checks, lane behavior tests, human adjudication, integration verification and deployment proof. None substitutes for the next. |
| A2-05 | A universal reviewer chain would overwrite lane-specific authority that this packet explicitly preserves. Evidence: draft `03-contracts.md#Review policy`. | Freeze the applicable lane policy, including exact seat order and final authority. Resolve it from existing scoped instructions; ambiguity blocks review admission. No master-selected replacement reviewer. |
| A2-06 | A salvage test that verified hashes but trusted the labels “two devices” would overclaim independent preservation. Evidence: draft `09-tests.md#Preservation`. | Require a separate storage-topology attestation and identify its limits. Automated checks verify copied bytes and receipt consistency; the operator verifies independent storage failure domains. |

**Filing disposition:** caller filing pending. The combined review’s scope is the supplied master packet and this forged package. It does not certify or supersede the underlying eight lane reviews.

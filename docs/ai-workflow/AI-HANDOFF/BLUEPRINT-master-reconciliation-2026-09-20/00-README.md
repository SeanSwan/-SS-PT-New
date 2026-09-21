**Package ID:** `MASTER-RECONCILIATION-20260920`  
**Proposed canonical directory:** `docs/ai-workflow/AI-HANDOFF/BLUEPRINT-master-reconciliation-2026-09-20/`  
**Status:** `PLAN ISSUED — ADMISSION BLOCKED`  
**Implementation verified:** No.  
**Deployed:** Not established.

**[VERIFIED — decision]** This package establishes one shared, manual admission process and one build queue. It does not redesign the eight lanes or authorize production deployment, paid reviews, messages to third parties, deletion or broad staging of the shared checkout.

**Outcome**

Protect L6’s vulnerable source; establish stable revision identity; reconcile package references; and admit independently verifiable lane slices without invalidating another lane’s work.

**Authority**

1. Latest explicit, applicable user instructions govern scope and authorized overrides.
2. This package governs shared preservation, source binding, registry resolution, cross-lane ordering and integration gates.
3. Each lane retains its internal architectural decisions and adjudications.
4. L4 retains its stated source-excerpt precedence.
5. L6 retains its internal `MEGA-BLUEPRINT.md` authority. Its rejected August merge document remains rejected as an architectural source.
6. A conflict is recorded and blocks the affected slice. The builder may not silently choose whichever document permits advancement.

The master does not supersede any lane package or archived review.

**Shared substrate — defined once, instantiated per revision**

| Shared element | Built once | Recorded per lane/revision |
|---|---|---|
| Manual workflow policy | Policy amendment and checkpoint definitions | Applicable authority, reviewer order, counters and transition evidence |
| Package registry | Canonical identities, aliases and authority model | Package version, applicable documents and source binding |
| Preservation procedure | Capture and verification rules | Inventories, copies and storage attestations |
| Evidence integrity tests | `scripts/blueprint-master-evidence.test.mjs`, supplied in `09-tests.md` | Snapshot, results, review references and admission attestation |
| Integration discipline | One integration owner and serialized merges | Conflict resolution, resulting revision and rerun evidence |

This is evidence tooling around a manual process. It is **not** a workflow controller or native write-blocking hook.

**Requirements**

| Requirement | Acceptance criterion | Artifact / evidence |
|---|---|---|
| MR-01 Preserve vulnerable source | Every identified L6 candidate has a reconciled inventory and two verified copies on independently attested storage failure domains | `03`, M0, preservation records |
| MR-02 Bind decisions to bytes | Full commit/tree IDs, clean isolated checkout and hashes for every tracked file match at preflight and admission | `03`, `09`, snapshot |
| MR-03 Make enforcement truthful | Actual canonical mandate explicitly selects manual execution; controller and native-hook enforcement are not claimed | `03`, policy amendment |
| MR-04 Resolve references | Exactly one canonical path per lane; aliases resolve directly; rejected documents cannot become active authority through aliases | Registry, `09` |
| MR-05 Preserve lane decisions | Every admitted slice references its existing applicable architecture and adjudications | Lane admission record |
| MR-06 Make acceptance executable | Required behavior tests have files, named cases, exact commands, fixtures, boundaries and observed results | Lane test index, `09` |
| MR-07 Preserve review authority | Applicable ordered seats and final authority are frozen; required reviews bind the same revision and are archived | `03`, `07` |
| MR-08 Prevent integration drift | Integrated bytes receive fresh binding and affected-boundary verification | M3, integration receipt |
| MR-09 Preserve deployment truth | Plan, implementation and deployment statuses remain separate | Every checkpoint receipt |

**Inherited lane constraints and canonical paths**

All paths below are beneath `docs/ai-workflow/AI-HANDOFF/`.

| Lane | Canonical package directory | Inherited constraint |
|---|---|---|
| L1 | `BLUEPRINT-cinematic-frontend-2026-09-19/` | Preserve `HomePage.V4`, twelve sections, V3 fallback and conversion flow. A is independent of B. Keep `PerformanceTierProvider.tsx`, `full / lean / reduced`, `useAnimationTier` and `useTierFlags`. |
| L2 | `BLUEPRINT-coach-cc-ai-harness-2026-09-20/` | Preserve three role routes and Talk / Review / History. Model prose cannot authorize mutation. Preserve authoritative outcomes and committed execution receipts. |
| L3 | `BLUEPRINT-cortex-phase1-knowledge-spine-2026-07-14/` | Preserve knowledge provenance, Sean approval, rule version/conflict tracking and progression/regression intent. Adopt or extend the existing loader and catalog. |
| L4 | `BLUEPRINT-social-bridge-completion-2026-09-19/` | Preserve S5–S8 decisions and source-excerpt precedence. The supplied `BUILDABLE` claim is not master admission. |
| L5 | `BLUEPRINT-speed-to-lead-email-2026-07-16/` | One slice at a time; acceptance evidence and checkpoint verdict before the next. |
| L6 | `BLUEPRINT-swan-brain-console-v3-merge-2026-09-18/` | Preserve all salvage candidates first. Retain internal decision authority and the rejection of the older merge analysis. |
| L7 | `BLUEPRINT-swan-native-mobile-2026-07-13/` | Standalone `mobile/` application; existing API unchanged; no web modifications. Phases 3–6 remain roadmap-only. |
| L8 | `BLUEPRINT-theme-lens-2026-09-20/` | R6.1 remains the active proposal; preserve R5 and reviews. Theme selection, persistence, restoration and focus must work without animation or WebGL. |

**What can start from the supplied evidence**

“Can start” below means a bounded future operator action; no execution is claimed in this response.

| Lane | Permitted preparatory work | Product implementation admission |
|---|---|---|
| L1 | Bind A/B scopes; inventory capability/theme consumers; preserve X7 measurement | **Blocked:** source binding, complete acceptance commands and applicable review disposition absent |
| L2 | Resolve package alias; bind mounted submission/execute/recovery contracts | **Blocked:** dirty source unbound; integration evidence expressly required |
| L3 | Preserve intent; compare old baseline with selected integration base; index existing tests | **Blocked:** stale baseline and unverified current model/caller contracts |
| L4 | Reconcile the latest filed correctness review with its current package and source excerpts | **Blocked:** exact current reviewed revision and defect disposition absent |
| L5 | Bind current implementation candidates and existing acceptance material | **Blocked:** current source/API evidence and executable acceptance index absent |
| L6 | **Immediate provisional preservation**, followed by stable inventory reconciliation | **Blocked:** S0 preservation/admission evidence and latest review disposition absent |
| L7 | Execute its foundation/contract-audit planning step against bound sources | **Blocked:** current API contract and mobile acceptance evidence absent |
| L8 | Bind R6.1, source and theme registry; index its acceptance tests | **Blocked:** the lane’s explicit source, executable-evidence and archive gates remain |

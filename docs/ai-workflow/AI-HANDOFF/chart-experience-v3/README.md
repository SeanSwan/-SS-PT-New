---
artifact_id: SWAN-CHART-V3
owner: Sean / lead Codex
version: 3.2
effective: 2026-09-04
status: DESIGN APPROVED; KG/LB CONVERSION, STORAGE AND PURE DRAFTS LOCALLY VERIFIED; CHART UI UNBUILT
supersedes: chart unification v1, v2, and 2026-09-04 BUILD-CONTEXT for future work
---

# Your training, made visible

The client should understand a meaningful change in five seconds, inspect its evidence
in one action, and leave knowing the next useful action. Beauty comes from exceptional
hierarchy, precise typography, legible marks, and a sense of ownership—not more widgets.

**Sean approved Sapphire Ledger and all-live-chart uniformity on 2026-09-04.**
Lead Codex owns design and review; Luna owns implementation. S0 is authorized now; S1 onward
requires the preceding gates to pass. This approval does not waive source, ownership or test gates.
Nothing here authorizes deployment, production writes, new paid reviews, cleanup, or a
change to subscription entitlements. Missing knowledge is a stop-and-ask event, not a
license for Luna to improvise. There is no claim that the application now matches this packet.

**Subsequent Sean decision:** first-class pounds/kilograms are approved. The bounded unit
extension in [12](12-worldwide-weight-units.md) supersedes the no-schema-change restriction
for its additive fields only. KG0 pure conversion can proceed independently of the remaining
S0 database/chart gates. It does not authorize their bypass or deployment.
KG0 is now locally verified in the isolated lane; see [13](13-kg0-verification.md).
KG1a's readonly target guard is locally verified in17. The16-file model caller census is
adjudicated in18;20 verifies the actual ORM harness;22 verifies additive storage on synthetic
PostgreSQL. The pure operation/draft foundation is locally verified in26; mounted unit-aware
writers are now being implemented under [27](27-kg1c1-mounted-contract.md), with live
execution evidence in [28](28-kg1c1-verification.md). Preferences and chart adoption remain unbuilt.

## Read in this order

1. [Astra review and baseline](01-review-and-baseline.md): what exists, what fails, what is retained.
2. [Experience and wireframes](02-experience-and-wireframes.md): exact layout, copy, interactions.
3. [Visual study](preview.html): synthetic, annotated reference; not a live dashboard.
4. [Metric registry](03-metric-registry.md): all 15 client charts, formulas, units and drill meaning.
5. [Contracts](04-contracts.md): additive API, identity, permission, errors and cancellation.
6. [Flows](05-flows.md): architecture, request lifecycle, drill, sharing and rollback.
7. [Tests and traceability](06-tests-and-traceability.md): behavior, boundary and visual gates.
8. [Luna execution contract](07-luna-handoff.md): ordered slices, ownership and escalation.
9. [Original v3.0 readiness receipt](08-readiness.md): historical checks and limitations;
   its pending-authorization wording predates Sean's approval recorded below.
10. [Whole-product adoption register](09-adoption-register.md): every inherited chart cohort,
    its retained capabilities and the separate evidence required before calling all charts unified.
11. [Approved uniformity contract](10-approved-uniformity.md): frozen visual reference,
    whole-product consistency, cross-view data agreement, and twelve additional adoption gates.
12. [Current S0 receipt](11-s0-readiness.md): Luna audit, lead adjudication and next open gate.
13. [Worldwide weight units](12-worldwide-weight-units.md): explicit-unit storage, historical
    unknowns, unit controls, migration flow and KG01–KG20; overrides older unit assumptions.
14. [KG0 verification and next slice](13-kg0-verification.md): exact local code/test evidence,
    review corrections, synthetic database preparation, and what is still unbuilt.
15. [External review gate](14-external-review-gate.md): requested GLM pair, precise sanitized
    payload approval and the one completed pair's empty/truncated replies; both verdicts VOID.
16. [KG1 source census and decisions](15-kg1-preflight.md): known writers/readers, compatibility
    basis, versioned new writes, unresolved integration gates.
17. [KG1a database guard](16-kg1a-db-guard.md): implemented test-only contract; no migration.
18. [KG1a real-database verification](17-kg1a-verification.md):25 guard tests, readonly identity,
    source/CLI/PostgreSQL corrections, stopped cluster, and next schema gate.
19. [WorkoutLog field census](18-workout-log-field-census.md):16 matched caller files,
    actual columns, fallback-property drift, projection gaps, schema-before-code release rule.
20. [KG1b0 same-handle harness](19-kg1b0-same-handle.md): bounded Luna test-infrastructure
    contract, per-connection identity and cleanup; no application model changes.
21. [KG1b0 real-ORM verification](20-kg1b0-verification.md):24 infrastructure tests,
    transactional temp-write rollback and actual pool replacement evidence.
22. [KG1b1 additive storage blueprint](21-kg1b1-storage.md): exact SQL/model/fixture/test
    contract and release-runner limitation; implemented only after explicit bounded dispatch.
23. [KG1b1 storage verification](22-kg1b1-verification.md):20 actual SQL/model tests,
    cleanup-ownership repair, full historical-value preservation, stopped synthetic cluster,
    and the remaining writer/edit/precision design gates.
24. [Two writer decisions](23-writer-decision-receipt.md): Sean1B/2A approved mixed-history
    preservation and source-versus-display precision; no further product vote required.
25. [Canonical writer receipt](24-history-writer-surface-receipt.md): mounted history editor,
    replace-all/metadata risks, complete narrow prefix walk, trainer shadow and17-test baseline.
26. [KG1c0 writer/draft contract](25-kg1c0-writer-draft-contract.md): five-file pure operation
    parser + source-preserving draft state machine. No writer/UI/auth activation in this slice.
27. [KG1c0 verification](26-kg1c0-verification.md):25 new behavior cases,2 type groups and31
    prior regressions; fixture-type/shadow-artifact corrections, frozen hashes and next gates.
28. [Mounted identity-safe editor](27-kg1c1-mounted-contract.md): frozen v1 wire, revisions,
    source preservation, atomic reconciliation, per-route trainer repair and exact UI/test contract.
29. [KG1c1 execution evidence](28-kg1c1-verification.md): live RED/GREEN and hostile-review ledger;
    in-progress work is not release approval.

## Decisions frozen for the client milestone

| Decision | Binding choice | Rejected alternative |
|---|---|---|
| Product direction | **Progress Story**: one meaningful overview, then deliberate exploration | A wall of 15 equal cards or multiple animated cockpits |
| Visual direction | **Sapphire Ledger**: a dark, tactile training record; light follows evidence | Glass-on-glass, particles, 3D spinning charts, glow on every mark |
| Common chart system | Existing `SwanChart` + `swanChartTheme`; evolve contracts, keep one frame | A new competing `ProgressStoryChart` engine |
| Organization | Overview / All charts; Training / Strength / Body filters in All charts | Hiding data behind a carousel or moving Progress below Social |
| Opening viewport | Header, one sentence, one hero chart, one next action | Cockpit + reel + cube + war room before actual progress |
| Smart logic | Deterministic, traceable calculations; no model calls to interpret charts | Generated coaching advice, predictions or fabricated goals |
| Comparison | Equal, complete calendar periods; current period explicitly partial | Comparing this Friday with a complete prior week |
| Good/bad direction | Neutral deltas except verified same-metric records | More volume is always good; lower body fat is always good |
| Data truth | Versioned envelope with explicit units, periods, quality and capabilities | Inferring units/identity from a string label or masking errors as empty |
| Sharing | Owner-initiated preview and explicit publish; approved non-sensitive fields only | Auto-posting, screenshotting the dashboard, staff sharing for a client |
| Preservation | Keep original widgets/code for rollback; don't render duplicates in V3 | Deleting old components during this migration |
| Scope ladder | Client 15 first; all other live cohorts follow using common presentation contracts and their own verified data adapters | Claiming all charts unified after only the client grid |

## Concept alternatives considered

- **Training Journal**: strongest history readability, less immediate trend discovery.
- **Data Observatory**: strongest analytical density, repeats the current cognitive load.
- **Progress Story — selected under Sean's delegated design authority**: best first-visit clarity,
  with the journal's source detail and the observatory's depth available on demand.

World: existing product world/lens, no new world ID. Palette law: Swan-native.
Signature: the existing Crystallize confirmation only after a newly saved, verified workout
or record. Opening a chart does not manufacture a celebration. Reduced motion is a designed
static state. Reference status: [MOBBIN UNAVAILABLE]; direction derives from Swan canon and
source review, not external imitation. Existing design-router governs over stale chart
palette text. Gold is NOT a generic third series in V3; reserve it for eligible record numerals.

## Authority and migration safety

The source worktree is `C:/tmp/ss-charts-unify-20260903`; this packet resides in the shared
repository because the session could not write that source worktree. The older packet's
`ACTIVE BUILD AUTHORITY` label is superseded by this explicit decision. Its body is preserved,
not erased. Luna must read THIS entry point before taking any old T0/T1 instruction.

This is not permission to code into the stale shared checkout. First reconcile a new isolated
implementation lane against current main and the dirty chart foundation, then transfer this
packet without losing either version. Scope and base drift are stop conditions.

The backend V3 routes, feature flag and typed action contracts below are **NEW, UNBUILT**.
They intentionally supersede the old restriction to MM/DD drill routes. No database schema
migration was needed for v3.0; the newly approved bounded unit extension now specifies additive
fields. Any further schema change still triggers escalation.

## Definition of success

Every chart has an honest title, unit, period, source explanation, accessible data mirror,
appropriate drill or explanation, and useful state handling. The client overview has one
primary job. All 15 charts remain discoverable. No data/body-shaming inference is introduced.
Luna supplies actual RED→GREEN, mounted route, browser, auth and rollback evidence—not just
green foundation tests. A lead review and the repository's final decision gate follow.

---
artifact_id: SWAN-CHART-V3-REVIEW
owner: lead Codex; reviewer Astra
version: 3.0
status: SOURCE-VERIFIED REVIEW; RUNTIME REVISE
supersedes: prior readiness claims, not historical evidence
---

# Review, preservation and baseline

## Astra receipt

Requested model: `gpt-6-astra`, reasoning `xhigh`, native subagent.
Assigned agent: `01a06dfd-e196-7f73-abed-1cb904d099b1` (Parfit).
Completed substantive response received 2026-09-04; no truncation or missing verdict.
The native assignment is observed; there is no separate provider response attestation.
Read-only source review; no live client records, provider consults or app mutations.
Verdict: **runtime REVISE; proceed with V3 planning after freezing the named contracts**.
Same model-family review is an additional review, not independent-provider corroboration.

Follow-up on the NEW packet: Astra returned REVISE for (R1) insufficient comparison-basis/
calendar validation and (R2) S1 tests depending on S2 detail endpoints. Lead accepted both:
M08 now tests metric/exercise/reps/timezone/equal adjacent civil-week spans; gate matrix splits
B01a/B02a aggregates from B01b/B02b details and assigns API vs component assertions explicitly.
Astra also closed the corrected seriesKey/cursor, specialized metadata, missing-module RED
classification, set-offset pagination and aggregate-cap issues at specification/source level.
No runtime or deployment approval is inferred from closing a planning finding.

Final bounded reread: **Astra APPROVE — planning only**. Both R1/R2 closed; no remaining
blockers from that review. Reviewer inspected the corrected fixtures/contract; the lead,
not Astra, executed the packet validator and RED suite. This is not a new all-product audit.

All following source references are relative to `C:/tmp/ss-charts-unify-20260903`.

| Finding | Evidence | Lead adjudication and binding disposition |
|---|---|---|
| A1 / P1: failed fetch looks empty; successful frame lost on refresh | `frontend/src/hooks/analytics/useClientProgressCharts.ts:40`; grid `:98` | ACCEPT: per-chart resource union, retained same-key snapshot, independent retry; never issue a log-workout CTA for transport failure |
| A2 / P1: kg becomes lb | `backend/models/BodyMeasurement.mjs:31`; `backend/controllers/chartDataController.mjs:718`; body card `:53` | ACCEPT, parent independently read model+SQL: carry `weightUnit`, normalize before comparison, refuse unknown units |
| A3 / P2: useful capabilities removed; optional Expand inert | primary cards `:83`; `WorkoutDayDrilldown.tsx:180`; `swanDrillSource.ts:77`; `SwanChart.tsx:200` | ACCEPT, parent read old card/detail adapter: parity matrix before each migration; typed actions require a handler |
| A4 / P2: teaser chart has advanced-only drill | `backend/routes/clientAnalyticsRoutes.mjs:182-194`; grid `:158` | ACCEPT, parent read route chain: separate chart/detail capabilities; locked detail is not retryable error |
| A5 / P2: frequency label and window mismatch; intensity join bias | `chartDataController.mjs:139,349`; `workoutDayDetailService.mjs:87` | ACCEPT, parent verified `COUNT(*)` and joined AVG: frequency means sessions; full ISO bins; session intensity aggregated once per session |
| A6 / P2: obsolete async data survives changed identity | `useSwanDrill.ts:28`; `useCanonicalProgressChartsFetch.ts:71` | ACCEPT lifecycle gap; parent read token logic. Cross-client disclosure is NOT proven; require a negative-control subject race test |
| A7 / P2: source-string migration test is not behavior | `CanonicalProgressChartsGrid.swanMigration.test.ts:19`; page test `:70`; old BUILD-CONTEXT `:224` | ACCEPT: source checks remain guards, never the migration acceptance gate |
| A8 / P2: actual widget stack omitted from phone wireframe | `CanonicalProgressChartsGrid.tsx:122`; old BUILD-CONTEXT `:87` | ACCEPT structural overload; pixel severity unverified. Explicit widget disposition and real opening viewport now required |

**Refinement, not a reproduced bug:** MM/DD currently resolves within a 120-day window
(`workoutDayDetailService.mjs:79`). Ordinary repeated-year ambiguity is not established there.
V3 uses full ISO keys for durable identity and longer history, not a false claim of an existing
two-year collision. Do not relabel this as a verified P1.

Additional lead decisions: recovery keyword counts are not a medical recovery score;
body deltas are neutral; daily heaviest sets are not automatically lifetime PRs;
multi-series identity must include line style/shape/labels, not color alone.

## Exact baseline

| Location | Observed state |
|---|---|
| Chart source | branch `claude/chart-system-unification-20260903`, HEAD `c3e7e29e044752e2ca1cd88fb0d38e5d9d2b24be` |
| Dirty chart source | 23 modified + 7 untracked paths; preserved, not edited this turn |
| Observed local `origin/main` | `53120649f356c3efccee32872b530096d386642f`; source 8 ahead / 8 behind; no fresh fetch |
| Documentation destination | shared `SS-PT`, branch `wip/comms-notifications-2026-07-05`, HEAD observed `a89cbf0f080644877ae8a45729d3f0a59d4cb8b8` |
| Shared checkout | dirty multi-agent tree; docs only, not an implementation base |
| Ownership | dedicated `codex-chart-vision-astra-20260904.lane.md`; Aftertaste lane untouched |
| Existing chart claim | Claude `main-se392b3cb` lane still claims Swan foundation files; no locks seized |

Relevant committed sequence: `84cb0279f` test instruments/reduced motion → `57c731cc5`
color probe → `cd0f4ed93` branded theme → `bee4d93ca` staff entitlement parity →
`f81f0f308` measured frame → `a26accc63` drill → `9e077dda3` hook extraction →
`c3e7e29e0` reference body. Dirty changes contain first mounted frequency consumer and
additional tests/guards. These are useful foundations, not completed client migration.

## Canonical surface receipt

| Link | Current source evidence |
|---|---|
| Dashboard mount | `frontend/src/routes/main-routes.tsx:936` → UniversalDashboardLayout |
| Client progress mapping | `frontend/src/components/DashBoard/UniversalDashboardLayout.routes.tsx:224` |
| Actual route component JSX | `UniversalDashboardLayout.shellPieces.tsx:108`, `<Component />` |
| Actual grid JSX | `Pages/client-dashboard/ClientProgressDashboardPage.tsx:249` |
| Hook | `CanonicalProgressChartsGrid.tsx:66` → `hooks/analytics/useClientProgressCharts.ts:40` |
| Exact request | `/api/client/analytics/${suffix}`; 15 suffixes in `useClientProgressCharts.types.ts:33` |
| Backend match | `backend/core/routes.mjs:474` → `clientAnalyticsRoutes.mjs:69` protect → `:82` JWT subject → exact chart handlers `:188-255` |
| Drill | route `:182,185` → `progressPulseController.mjs:129` → `workoutDayDetailService.mjs` |
| Sessions | `WorkoutSession.mjs:30,44,57,66,158`: userId, date, duration, intensity, status |
| Sets | `WorkoutLog.mjs:14,22,40,44,51,74`: sessionId, exerciseName, setNumber, reps, weight, rpe |
| Measurements | `BodyMeasurement.mjs:24,28,31,35`: measurementDate, weight, weightUnit, bodyFatPercentage |

Mount order matters: `/api/analytics` at `routes.mjs:473` is a different prefix;
client analytics `:474` precedes broader `/api/client` at `:596-597`. V3 adds paths
inside the existing client analytics router, before broad fallback handlers. Luna must
repeat that narrow shadow audit on the reconciled base; longest-prefix reasoning is invalid.

## Surface and document classification

| Candidate | Classification | Governing action |
|---|---|---|
| `/dashboard/client/progress` grid | canonical runtime: 1 Swan + 14 old frames | V3 client milestone |
| `/progress/detailed` NASM wrapper | canonical separate surface; route map `:225` | preserve; later parity milestone |
| ClientAnalyticsPanel / staff grids | other mounted staff consumers, NOT the client route owner | later own receipt/permission matrix |
| ForgeChart | dormant in old audit, catalog class exists | recheck current consumers; add explicit Forge exception/adapter ruling before runtime edits |
| v1 September blueprint | historical audit/inventory, stale build authority | preserved source index for long-tail inventory; not executable plan |
| v2 September blueprint | historical foundation/review; stale semantics/palette/build authority | preserve compatible probe/measurement work, override via V3 |
| September BUILD-CONTEXT | stale client migration gate and layout | superseded by this packet |
| GLM review packet | historical, transmission not approved in prior turn | no fresh GLM approval claimed; not required for native Astra review |
| July expansive blueprint | historical vision, overlapping consumer concepts | retain useful features via disposition matrix; not another active IA |
| This directory | canonical current PLANNED contract | sole entry point for Luna's next planning/build handoff |

Discovery included `git log --all --source -- docs/ai-workflow/AI-HANDOFF/CHART-SYSTEM-UNIFICATION*`:
tracked blueprints trace to `84cb0279fd`; BUILD-CONTEXT is untracked. Freshest filename did
not establish authority; Sean's current design request plus this explicit supersession does.

## Non-destructive hygiene scan

Source root inventory: 5 Markdown, 5 JSON, one YAML and one YML, plus operating dotfiles.
Nine legacy theme sources/seven frames/61 renderers are HISTORICAL counts from v1, not a
fresh whole-repo count. The current competing-widget stack is directly verified above.
Archive candidates: old chart blueprints after V3 acceptance; dormant gallery/template charts
after real import/mount checks. No move/deletion authorized. This packet's QA captures belong
in the visualization output directory, not root. Existing `.gitignore` is unchanged.

## What is not proof

Prior 427-test, typecheck and build results are historical only. Browser helper previously
failed before startup on missing `zod`; passing `--help` was not a safe dry-run. No current
authenticated browser, database, deploy or whole-product chart audit is claimed here.

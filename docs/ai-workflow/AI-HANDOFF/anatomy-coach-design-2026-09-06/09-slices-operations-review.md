# Implementation slices, operations and hostile review

Artifact: SPA-OPERATIONS / owner: implementing leads + Sean / version 1.0, 2026-09-06.
Status: FUTURE IMPLEMENTATION PLAN. Next authorized work in this turn is artifact verification only. No application slice is authorized by this plan-only request.

## Ordered slices and exit evidence

| Slice | Entry / dependencies | Owned work | Exit proof / rollback boundary |
|---|---|---|---|
| S0 — reconcile baseline | New implementation authorization; coordination lanes read | Select actual release/worktree and governing Universe V3 receipt; hash mounted routes/models; full pain/workout caller drift and route-shadow tables; root hygiene inventory | No ambiguous active source; reproduce 2 failing frontend assertions and preserve their behavioral intent. No code copied across branches wholesale |
| S1 — data contracts | S0, isolated DB established | Pain response decoder, target fencing, v2 strict input/permission/replay contracts; replace mixed-region trend; reproduce recovery error-as-empty | Behavior RED→GREEN and access fixtures; old UI still works. Rollback UI adapter, no destructive DB operation |
| S2 — symptom history | S1 and reviewed schema/caller table | Additive observations/reviews/revisions; all v1/v2/AI writers share service; legacy baseline backfill | Real PostgreSQL transactions/concurrency/replay and restore drill; no invented history; retain tables on UI rollback |
| S3A/S3B — direct viewer port | S0; pinned upstream source/license/lock/model | S3A run original viewer as baseline; S3B port its existing scene, assets, decoder, selection and explosion into Swan through a minimal adapter | P09/T26 visual + functional parity before overlays/theming; preserve all source anatomy. No replacement basic mesh or initial geometry rebuild |
| S3C — custom Swan assets | S3B and character brief | Bounded derivative sample; practical diverse appearance/anatomy assets with mapping/credits, or documented DEFER CUSTOM retaining source assets | P10/T28 on shipped assets plus P13/T31 feasibility/fallback; no full-rebuild prerequisite |
| S3D — profile personalization | S0 unit/writer reconciliation; approved rig only for measured morphology | Shared measured/manual reference preference in Planner and Pain Atlas, scoped sources, conditional morphology and customization | P11/T29 and P12/T30 source truth, mode persistence, Planner parity, races and reversible preferences |
| S4 — Pain Chart | S1/S2/S3B; S3D mode choice; S3C rig required only when claiming measured morphology; source viewer fidelity proven | Swan workspace around the actual ported full viewer, selection bridge, DOM/list fallback, quick report/episode list/accessible sheet | Same target/draft through explorer, 2D fallback saves, role/phone/browser tests; flag off returns old UI |
| S5 — full explorer + motion | S4 | Search, systems, isolation, transparency, exploded assembly/reset, pain glow/pause | All capability matrix rows exercised, no drift after 100 explode/reset cycles, picking agrees visual transforms, context loss/reduced-motion tests |
| S6 — workout identity and observed recovery | S0 plus canonical writer/route proof | Stable exercise/source-set identity, reviewed muscle map, dedupe projection and observed-load API; migrate private consumers explicitly | Actual save/edit/delete/import alters exactly one projection; charts/locker/atlas agree sourceRevision; public social remains private by default |
| S7 — estimated recovery | S6 plus calibration/copy review | Versioned pure estimator and optional check-ins, unknown/stale semantics, independent pain precedence | Synthetic model tests plus consented calibration report, disabled-by-default missing config; no healing clearance or auto plan writes. Disable model flag keeps Stage A |
| S8 — Coach context facade | S0 and current V3 durable command acceptance | Single target/context owner, preserve registry/role/menu capability map | Unknown role denied, wrong-target race blocked, pending intents survive old/new view; facade rollback retains server contract |
| S9 — Coach shell and workspaces | S8, chosen hybrid wireframes | Reachable composer; Talk, Review, History; contextual notes/audio/intake/draft panels | Every capability mapped, representative real boundary receipts, mobile keyboard/QHD/4K; shell flag rollback |
| S10 — coaching loop | S2/S6/S8/S9, S7 optional by gate | Pain follow-up/evidence, recovery context, draft plan adjustments using canonical exercise library | Observed/inferred sources labeled; existing confirmation required; no duplicate notification/plan mutation, privacy tests |
| S11 — Design Brain vNext | Read-only comparison ready; owner authorizes doctrine change | D0–D4 plus13 teaching prompt/skill, project-local adapters, generated mirrors and T27 actual invocation benchmark | Parity tests + actual invocation receipt; restore preserved design.md/html/adapters on regression |
| S12 — rollout | All released-scope evidence accepted by review chain | Internal synthetic → opted-in internal use → assigned-client cohort → wider flag | Metrics within budgets, support runbook, exact build/source/deployment receipt. Production actions require existing explicit authorization |

S3 and S8 can be independent implementation lanes after S0 when delegation is actually authorized. Dependency labels are not permission to spawn agents now. Each slice updates this canonical packet and its receipt; no duplicate mega plan per component.

## Operational controls

Flags proposed: `painAtlasEnabled`, `painObservationsV2`, `anatomyExplorerEnabled`, `trainingExposureEnabled`, `recoveryEstimateEnabled`, `coachDeskEnabled`. Server capability response is authoritative; unknown flags disable new behavior. Do not use a frontend flag as authorization. Basic pain reporting remains usable when 3D/model/Coach features are unavailable. Keep schema additions compatible with the old reader during staged rollout.

Owner assignments are roles until Sean assigns people: backend lead owns transaction/history/mapping/data freshness; frontend lead owns scene disposal/input/accessibility; design lead owns task evaluation and tokens; operations lead owns flags, logs, backfills and restores; qualified content reviewer owns anatomy/care wording and calibration scope; Fable remains Final Decider/commit gate. No owner assignment implies completed review.

Metrics: p50/p95 report interaction/save, write conflicts, replay recovery, wrong-target suppression, unauthorized response count, stale recovery age, mapping and RPE coverage, model/config version, 3D load/fallback/context-loss, frame latency and memory stabilization. Aggregate without health text, patient IDs, anatomy selections linked to accounts or provider prompts. Operational request IDs are redacted under existing policy. Do not log raw SQL payloads from private queries.

Budgets: read API p95≤500ms warm over fixture cohort, save p95≤800ms excluding network; projection compute p95≤500ms for 10k eligible sets/user under profiled indexes; cache response p95≤150ms; projection freshness≤60s after committed edit under normal worker service, otherwise show stale. Large imports process bounded chunks and expose pending refresh. These are proposed thresholds needing measured hardware/data evidence, not current claims.

3D budgets are in 11-training-recovery.md. Coach initial interaction budget ≤200ms for local tab/context actions, composer reachable at supported sizes, no idle animation worker. Lazy-load geometry independently of chat. Use Victory and accessible tables for numerical charts. No added React framework, R3F migration or shadcn transplant unless an explicit tradeoff is reviewed later.

## Migration and recovery runbook

1. Confirm isolated DB identity with disposable fixture marker before migrations/tests. Local DATABASE_URL can target production. Never assume a local command is safe because it is named test.
2. Capture source, schema and preservation hashes; test additive migration, forward/backward compatibility, interruption resume and a restore with fixture observations. No production restore in acceptance runner.
3. Backfill in bounded pages with unique baseline markers and progress cursor. Replay a batch safely; preserve existing IDs and all staff privacy. Check before/after counts and sampled content hashes.
4. Recompute recovery from canonical source revisions; do not backfill invented timestamps, weights, RPE, muscle identity or diagnostic labels. Record excluded records and coverage.
5. Roll out reader flags before rich UI. Enable full history only after all writers preserve observations. Retain old frontend and idempotency read compatibility while testing unknown-outcome recovery.
6. On regression: disable affected presentation/model flag, keep save/list fallback and durable receipts, stop backfill if relevant, preserve new observations and logs. Recompute disposable projection caches after repair; never delete authoritative workout/pain facts to clear a chart.
7. Follow existing review/deploy permissions. Receipt must identify deployed SHA and mounted smoke separately from local tests. No “deployed” label based on git push alone.

## Hostile review and decisions

| Challenge | Decision / resolution in plan | Remaining evidence |
|---|---|---|
| Easy reporting was misread as permission to simplify the anatomy | The complete Human Atlas body is the default; organize the tools and report flow around it | Source fidelity T26 plus client task evaluation T01/T02 |
| Anatomical precision implies diagnosis | Plain region primary, structure reference optional, explicit uncertain area, no tissue-cause inference | Content review + labels test T06 |
| Recovery colors become clearance to train | Separate observed vs estimated vs reported pain; model profile disabled until reviewed; no auto writes | Calibration and harmful-misinterpretation review T14/T15 |
| Model fabricates input precision | WorkoutLog has no exercise UUID/unit; mapped-source coverage and unsupported-data exclusions required | Real writer/schema reconciliation T11/T12 |
| Same sets counted via locker, charts and Coach | Single projection with canonical set identities, projections are consumers | Real save/edit/import contract T12 |
| Old pain update silently erases history | All writers use shared append service; legacy baseline honest | PostgreSQL multi-writer test T05/T09 |
| UI race leaks prior client's medical data | Actor/target/access epoch fence, scoped cache and permission recheck | Delayed-response and revocation tests T04/T10 |
| Receipt loss produces duplicate workout/report | Same mutation key and payload hash; server truth check, no blind retry | Response-loss and concurrent confirm tests T09/T18 |
| Wrong proposed ID/API sneaks into blueprint | Hostile source check corrected proposed workoutSessionId to UUID and Coach commands to `/api/ai-command/*` | Source manifest + S0 route proof |
| Paid “design brain” becomes a claimed benchmark | No paid calls; distinguish doctrine-derived concepts from measured comparison | Controlled study NOT RUN T22 |
| Beauty hides baseline failures | Record 808/810 frontend, 5/5 backend source tests, 39/39 Brain tests; readiness gate retains FAIL | Reproduce on chosen release source |
| Huge plan becomes unbuildable | Small isolated slices, explicit reuse boundaries, no new database/event/ML framework | Builder estimates and S0 ownership |

Resolved means the **planning decision** is explicit, not that its application implementation passed. This was a self-hostile review, not independent Gemini/Fable approval. Unresolved gate owners and NOT RUN tests remain in readiness.json.

## Applicability receipt

Requirements, architecture, wireframes, flowchart, contracts, state/sequence/ERD, permissions, privacy, tests, traceability, slices, operations, preservation and hostile review all APPLY and have artifacts. No conditional section is waived. Application build/typecheck after changes: N/A this turn because no application changed. Future behavior tests, physical-device QA, real PostgreSQL isolation/restore, clinical/asset review, deployed SHA and model calibration: NOT RUN. Installed-skill validation and document/diagram checks are separate evidence, never application acceptance.

## v1.2 review decisions

Custom production blocking the whole chart is resolved by the authorized Track A fallback. Reference appearance contaminating prescriptions is prevented by separate shapeMode/preferences and measured health context. “All nationalities” means inclusive choices, not a nationality-to-anatomy inference. P12/T30 and P13/T31 cover these boundaries; no new app acceptance is claimed.

## v1.3 S4 amendment and hostile review

S4 owns P14/T32: Easy route default, musculoskeletal hit masks, familiar region/side choices, optional details, same-draft Explore return and list parity. S5 advanced polish cannot make reporting depend on anatomy knowledge. Entry retains S0/source-port gates. Exit requires actual saved region/side/score without tissue classification, no hidden-system hit interception and preserved draft through Explore. UI rollback preserves observations; no migration is added.

Planning review removed mandatory tissue classification, always-visible symptom fields and persistent advanced defaults. Full anatomy remains; controls and visible layers follow the user's task. Live hit testing, save, usability and physical-device acceptance remain NOT RUN.

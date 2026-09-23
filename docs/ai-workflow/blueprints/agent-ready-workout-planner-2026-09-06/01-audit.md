# Verified audit and canonical surface receipt

Artifact: SWAN-AGENT-PLANNER-AUDIT · v2.0 · 2026-09-06 · Owner: Sean
Status: source-verified and read-only live observations; no production writes.
Companion: [packet index](README.md). Supersedes: no existing architecture.

## Repository reality

| Surface | Observed state |
|---|---|
| Shared checkout | `C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT` |
| Shared branch/head | `wip/comms-notifications-2026-07-05` / `a89cbf0f080644877ae8a45729d3f0a59d4cb8b8` |
| Initial dirty state | 59 modified, 2 deleted, 745 untracked entries; unrelated work preserved |
| Ref refresh | `git fetch origin main` succeeded; main resolved to `53120649f356c3efccee32872b530096d386642f` |
| Audit source | `tmp/worktrees/agent-ready-planner-audit-20260906`, detached at that main SHA; runtime source unchanged |
| Current Coach work | Separate owned worktree `tmp/worktrees/swan-coach-astra-owned-20260906`; not yet part of this main snapshot |
| Ownership | Dedicated `vs-codex--SS-PT--c4e446e0.lane.md`; other active Codex planning lane preserved |
| Startup | Continuity read; bash count blocked by Windows process sandbox, equivalent regex counted 0 markers; prune removed 0 entries |

Test dependencies are junctions to already installed packages. Tests use the
packet's isolated configuration, not a lockfile-clean reinstall. This is a
focused source baseline, not a whole-build or dependency reproducibility claim.

Seven governing documents were preserved with SHA-256 verification and two
sample restores; see `evidence/preservation.json`. The native vault was invoked
explicitly where installed. It is absent in the detached main source, so the
compatible snapshot manifest/restore verifier was used for that source. This
does not prove automatic Codex hook execution. Existing originals remain intact.
The separate Gwen handoff is still an integration dependency, not main runtime.

## Live observation receipt

Date: 2026-09-06, approximately 22:13–22:16 UTC. URL:
`https://sswanstudios.com/dashboard/admin/workout-planner`.
A separate audit browser tab was used because another task owned the user's tab.
Only page reading, Advanced disclosure and Single/Multi-week scope were used.
No Generate, Deep Research, Save, Refresh backup, Promote, Blend or PDF action
was executed. Names, client IDs and private plan content are excluded here.

- The page renders the V2 context bar, single/multi-week scope, Generate and
  Advanced controls, Exercise Rolodex, Plan Builder, Coach dock and Saved Plans.
- Single Advanced exposes Category, Goal, Auto/Guide Me/Deep Grill and training
  style. Multi-week adds program length and sessions/week; Category is disabled.
- Visible multi-week text says changing duration picks a split. Source only
  selects duration; the new blueprint replaces that confusing promise with an
  actual supported split contract and an honest disabled reason until it exists.
- AI backup shows freshness, refresh, load and promotion; Blend Plans already
  exists. Neither is a missing feature.
- The library displayed 916 results at observation time. This is an observed
  count, not a constant or an authoritative taxonomy completeness claim.
- A no-active-plan context badge appeared inconsistent with the selected
  client's current-plan area. **UNPROVEN cause**: freeze context-switch/reload
  fixtures before diagnosing; do not publish client details or assert a fix.
- Some barbell/dumbbell-named items were labeled Bodyweight. Source fallback
  treats absent equipment as bodyweight. **VERIFIED display; underlying catalog
  cause UNPROVEN**. Unknown equipment must not become an eligibility guarantee.

No mobile live QA or exact deployed-commit proof was performed. HTML wireframes
are synthetic design artifacts, not screenshots of the production Planner.

## Source conventions

Every path and line in the following receipt is relative to the **audit worktree**,
not the stale shared checkout. The corresponding files are retained there.
`P/` abbreviates `frontend/src/components/DashBoard/Pages/admin-workout-planner/`.
`D/` abbreviates `frontend/src/components/DashBoard/`.
Exact source hashes and relevant excerpts are in `evidence/source-manifest.json`.

| Boundary | Canonical path and evidence |
|---|---|
| Admin/trainer URL | `D/UniversalDashboardLayout.routes.tsx:153,198` entries for `/workout-planner`; renderer `D/UniversalDashboardLayout.shellPieces.tsx:108` mounts `<Component />` |
| Planner mount | `P/WorkoutPlannerPage.tsx:15,16` mounts providers/layout; `P/WorkoutPlannerPageLayout.tsx:98` mounts `<WorkoutPlannerCommandPanelV2 />` when IA V2 is enabled |
| V2 composition | `P/WorkoutPlannerPageLayout.tsx:225` mounts V2 shell; `:227` mounts `<WorkoutPlannerRolodexPanelV2 />`; saved-plan section is shared |
| Advanced | `P/WorkoutPlannerCommandPanelV2.tsx:217` disclosure; `:223` advanced sheet and scoped fields |
| Generation selector | `P/plannerLogic/endpointFor.ts:4` maps `single` to `/api/workout-builder/generate`, `multi_week` to `/api/workout-builder/plan` |
| Generation request | `P/workoutPlannerGenerationActions.helpers.ts:104`; `:115` fixes count at 6; `:116` fixes rotation at standard |
| Generation handler | `backend/core/routes.mjs:437` → `backend/routes/workoutBuilderRoutes.mjs` POST `/generate`, `/plan`, `/candidates`; role and client-access gates → `backend/services/workoutBuilderService.mjs` |
| Library consumer | `P/useWorkoutPlannerRolodexState.tsx` → `frontend/src/components/WorkoutLogger/useExerciseSearch.ts:99`, exact `/api/exercises/library` |
| Library handler | `backend/core/routes.mjs:767` → `backend/routes/exerciseRoutes.mjs` GET `/library` → `backend/services/exerciseLibraryContract.mjs` |
| Library authority | `backend/models/Exercise.mjs:70` primaryMuscles, `:131` equipmentNeeded, `:233` registry identity area, `:315` nasmMovementPattern, `:329` defaultTempo, `:334` defaultRestSeconds; media and JSON mapping remain part of the contract |
| Save | `P/useWorkoutPlannerSaveActions.ts:98,129`, POST `/api/workout-plans`, PUT `/api/workout-plans/:id`; expected revision and PDF lifecycle must survive |
| Plan writer | `backend/routes/workoutPlanRoutes.mjs:468,557` → `backend/services/workoutPlanMutationService.mjs`; lifecycle transitions delegate to `workoutPlanLifecycleService.mjs` |
| Real plan fields | `backend/models/WorkoutPlan.mjs`: UUID id; userId; trainerId→trainer_id; title; description; nasmPhase→nasm_phase; dates; durationWeeks; status includes archived (`:103`); archivedAt/By (`:109,115`); currentWeek/Day; planData→plan_data (`:137`); contentRevision/Hash (`:144,152`); progressNotes; createdBy; metadata |
| Backups | `P/WorkoutPlannerSavedPlansSection.tsx:113` → `WorkoutPlannerBackupPanel.tsx:129,156,176` → GET `/api/workout-plans/backup/:userId`, POST suffix `/generate`, POST `/:id/promote-backup` |
| Backup server | `backend/routes/workoutPlanRoutes.mjs:281,320,419` → `backupPlanService.mjs`; stale at 21 days or 3 sessions; promotion delegates to lifecycle transaction |
| Blending | `P/WorkoutPlannerSavedPlansSection.tsx:189` → `WorkoutPlannerBlendDialog.tsx:226` POST `/api/workout-plans/blend` → route `:381` → `planBlendService.mjs` → existing create mutation |
| Existing Hermes | `backend/core/routes.mjs:716` → `hermesRoutes.mjs`; admin/trainer task queue → `services/hermes/hermesService.mjs` in-memory Map; not customer-owned model/device pairing |
| Old MCP | `backend/core/routes.mjs:732` conditional legacy mount; `backend/routes/mcpRoutes.mjs` retirement stub and 410 responses |

## Narrow route ownership / shadow audit

Main's mount order is: `/api/workout-plans` (409), `/api/workout/plans` (410),
`/api/workout` (411), `/api/workout/sessions` (412), `/api/workout-builder` (437),
`/api/hermes` (716), conditional `/api/mcp` (732), `/api/exercises` (767),
`/api/workout-forms` (774), then the general API fallback later in the file.
Both plan prefixes mount the SAME router. Its `/backup/:userId` is before `/:id`;
HTTP method and segment count keep `/blend` and backup generation distinct.
`workoutRoutes` still has `/plans` and `/plans/:planId/generate`; the earlier
plan-router mount owns matches it terminates, while fallthrough can reach the
older router. Do not add a competing agent writer under that overlap.
The `/api/workout/sessions` overlap is relevant to later history/log adapters and
must be re-walked there; it does not change ownership of current plan mutations.
New proposed `/api/agent-connect` and `/api/agent-gateway/mcp` have distinct prefixes.

## Surface and plan classification

| Candidate | Classification / disposition |
|---|---|
| V2 Planner shell/command/rolodex in audit main | CANONICAL_CURRENT for source route with IA V2; corresponding UI observed live |
| V1 command/rolodex components | canonical fallback when V2 is disabled; keep compatibility, not a deletion candidate |
| Shared checkout Planner | STALE relative to fetched main and observed live V2; not this implementation baseline |
| `pages/workout/components/WorkoutPlanner.tsx` | separate legacy dashboard path, not this admin/trainer Planner; do not patch it for this URL |
| `components/WorkoutManagement/WorkoutPlanBuilder.tsx` | different builder; legacy/orphaned under the verified admin/trainer route tree; no global-dead claim |
| July 31 JARVIS ultimate + incorporated Opus §§3–8 | CANONICAL_CURRENT Planner IA/endpoint/lens constraints; v3 Coach handoff supersedes older Coach portions only |
| July 29 Unified Workout OS Fable blueprint | CANONICAL_CURRENT workflow/assignment/receipt constraints; extension preserves them |
| WORKOUT-PLANNER-V2-MASTER-BLUEPRINT | HISTORICAL feature aspirations; stale counts, proposed libraries and checkbox status; not executable current authority |
| September 6 Gwen Coach handoff, owned packet 31/32 | CANONICAL_CURRENT for ongoing Coach runtime; reuse after verified integration, not assumed deployed |
| Old MCP routes and frontend services | explicitly retired; remain retired while new gateway is built |
| This packet | new canonical proposal for personal-agent access and Planner depth; does not revise protected existing rulings silently |

## Findings ranked by work needed

| Priority | Finding | Evidence / consequence |
|---|---|---|
| P0 before agents | No customer agent grant/device boundary proven in audited routes | Old MCP is retired; Hermes tasks are staff queue entries, not device sessions |
| P0 before agents | Existing app authorization is not delegated-agent authorization | An agent must not receive an app login bearer token or infer authority from a target ID |
| P1 | Advanced is mostly a small collection of mode/goal fields | Live disclosure + V2 JSX; add enforceable programming constraints, not just more labels |
| P1 | Count/rotation are fixed before reaching a capable backend | Real request-builder EXPECTED RED tests |
| P1 | Builder exposes only sets/reps/tempo/rest in ordinary rows | Current JSX; richer typed per-set/group controls need complete round-trip contracts |
| P1 | Backup refresh is presented as replacement in place | Existing UI/service; add compare and recoverable revision before discarding the previous prescription |
| P1 | Blending needs better explainability and validation UX | Current dialog is source/week selection; add previewed transitions and volume/constraint conflicts |
| P1 | Source checkout drift can lead to a regression disguised as an upgrade | Initial source lacked live features; resolved by independent main snapshot |
| P2 | Preset provenance, evidence freshness, equipment unknowns and unsupported-control explanations need one grammar | Preserve existing read models; do not turn missing data into defaults that assert safety |

The snapshot tests, mocked tests and source receipts do not establish real
PostgreSQL concurrency, clinical validity, agent egress or production permissions.
Those remain explicit implementation gates in 04.


## September 7–8 v2 addendum

The canonical direction is Training Studio with optional Program Map. Read 08-design-synthesis.md for the governing visual decisions, 09-model-connections-and-budgets.md for default Coach/personal OpenRouter/local policy and durable spending controls, and 10-coach-privacy-audit.md for current-source privacy gaps and release prerequisites. Earlier baseline results remain dated historical evidence. This pass changes the blueprint and synthetic preview only.

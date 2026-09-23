> v1.2 relocation receipt: current repository is C:/Users/BigotSmasher/Desktop/@Everything/quick-pt/SS-PT. HEAD remains a89cbf0f080644877ae8a45729d3f0a59d4cb8b8;925 dirty entries observed2026-09-07. All60 prior packet files and52+11 source entries matched at the moved location. Paths/baselines below are historical unless reverified in evidence/atlas-v12-review.json. No application files were changed or baseline behavior tests rerun by this docs revision.

# Baseline, canonical surfaces and evidence limits

Artifact: SPA-BASELINE / owner: Sean / version: 1.0, 2026-09-06 / status: AUDITED, READ ONLY.
Supersedes: no source or predecessor evidence; adds current-session observations to CC-UX-20260906.

## Identity and preservation

Repository: `C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT`.
Branch: `wip/comms-notifications-2026-07-05`; HEAD: `a89cbf0f080644877ae8a45729d3f0a59d4cb8b8`.
Initial status: 804 short-status entries. This is a heavily dirty shared checkout, not a clean release candidate. Existing frontend Coach edits and dependency changes predate this task. Two separate Coach worktrees were found; neither is the shared checkout or proven deployed source.

Read continuity priorities, rolling log, good ideas, both lanes and review queue. Coordination prune was invoked; no ownership inference from an old timestamp. Claude lane was idle; this task claims only this planning directory and a preserved cross-reference in the predecessor. Git Bash continuity count succeeded outside sandbox: 0. The initial Windows WSL/Git Bash failures were environment failures.

Discovery included ACTIVE-INDEX, named Coach packets, pain source/tests, design doctrine, all-ref path history and worktrees. The experience packet is untracked in this checkout; no path history establishes it as released. The old master Coach blueprint is explicitly superseded. Universe V3 is a separate current implementation stream, not the older August V3 wireframes.

Explicit portable skill snapshot: `.ai-workflow/vault/anatomy-coach-planning-20260906/manifest.json`.
243 planning files hash-verified; 2 restored into isolation and compared. Manifest SHA256: `8e1b2cda80369c65f0fbcaebe65a19181ae5220b043a269e26c86bd9a52b9c6a`.
Native vault module is PRESENT; native hook firing in this turn is UNOBSERVED. Portable CLI was used explicitly without native retention pruning. This is local preservation, not off-machine backup. Existing Design Brain sources are not edited.

## Canonical receipt — source evidence

All paths below are repository-relative. Source hashes are in evidence/source-manifest.json. A lazy import is not treated as mount proof.

| Surface | Classification | Mounted caller and boundary |
|---|---|---|
| Client pain chart `/dashboard/client/body-map` | CANONICAL configured route | `frontend/src/routes/DashboardRoutes.tsx:72-78` mounts UniversalDashboardLayout; role configuration `UniversalDashboardLayout.routes.tsx:203`; `UniversalDashboardLayout.shellPieces.tsx:94-108` renders `<Component />`; routeComponents `:38` resolves `../BodyMap` |
| Admin/trainer pain routes | CANONICAL configured routes | Same JSX chain; routes `:144` and `:175`. Live admin route inspected; real trainer/client sign-ins not tested |
| Pain data and editor | CANONICAL shared consumer | `frontend/src/components/BodyMap/index.tsx:165`, factory `:177`, fetch `:241`, create/update `:283-287`, SVG `:392`, panel `:443` |
| Staff client modal | ACTIVE alternate mount of same component | `EnhancedAdminClientManagementView.tsx:2388` → `components/ClientBodyMapModal.tsx:83` `<BodyMap userId={clientId} mode="trainer" />` |
| Biometrics card | ACTIVE nested consumer, parent reachability to recheck during S0 | `workspaces/clients-team/tabs/BiometricsTabContent.tsx:191` mounts the same BodyMap |
| Measurement entry | ACTIVE nested consumer, parent reachability to recheck during S0 | `Pages/admin-dashboard/MeasurementEntry.tsx:142` mounts same BodyMap |
| Workout outlet | CONDITIONAL wrapper | `workspaces/WorkoutOutletWrapper.tsx:60-63` body-map branch; mount not evidence every workspace route exposes it |
| Admin/trainer/client Coach | CANONICAL configured routes | role routes `:99`, `:179`, `:205` → same shell JSX → `Pages/coach-assistant/CoachCommandCenterPage.tsx:35`, controller `:38`, transcript `:187`, Review `:201`, History `:219`, dock `:237` |
| Older SwanCoachAssistantPage and old style shells | LEGACY for these routes | Current route map resolves CoachCommandCenterPage and its bridge styles. No deletion authorized; global unreachability not claimed |
| Universe/Astra-owned Coach candidates | COMPETING IMPLEMENTATION LANES | Separate dirty worktrees; shared shell refinement and durable intent work must be reconciled. Blocking for future graft/merge, not for this audit |

Pain API: `frontend/src/services/painEntryService.ts:60` defines `/api/pain-entries`; get `:64`, post `:78`, put `:84`, resolve `:90`, delete `:96`. `backend/core/routes.mjs:367` mounts painEntryRoutes. Router `:24` protect, `:27-36` assignment/self access and role gates. Controller `:88/130` reads; `:194` creates; `:249` scopes updates by both entry and user. Model is `backend/models/ClientPainEntry.mjs:21-145`.

Pain route walk: GET `/:userId`, GET `/:userId/active`, POST `/:userId`, PUT `/:userId/:entryId`, PUT `/:userId/:entryId/resolve`, DELETE `/:userId/:entryId`. Exact Express method/path termination prevents the shorter PUT matching the longer resolve path. One explicit pain mount found in core routes; inherited catch-all middleware remains an S0 release-route check.

Coach chain: controller → `useAIChat.ts:217,249,273,324,448` (`/api/ai-chat/conversations`, `/:id/messages`); `useCoachCommand.ts:96,170,207` (`/api/ai-command/execute`, `/confirm`, `/cancel`). Core mount order has the narrow stream-spike router before general ai-chat, then ai-command (`backend/core/routes.mjs:630-632` in this checkout). Existing chat returns complete responses; a streaming sibling is not proof this caller streams. Review mounts `CoachIntakeWorkspace`, `PlaudMergeWorkspace`, `CoachCommandCenterWorkbenchPanel` in ReviewPanel `:46-73`.

## Live observations, 2026-09-06

Authenticated admin Coach: Talk, Review→Intake/Audio/Drafts, and History inspected through the UI without submitting, uploading, confirming, or deleting. Pain route inspected in the no-client-selected state. No client names, medical histories or raw authenticated screenshots are copied into this packet.

At the actual 2195×1097 CSS viewport, Coach header measured 190px tall; input top 1139.6px and bottom 1191.6px; document height 1382px. Even the empty input was below the initial viewport. The selected-client header coexisted with “New chat No client selected.” Review showed an actionable hold/failure while another next-action surface said no active intake work. Audio initially showed no matching active clients while the header had a target: observed inconsistent state, not proven roster-fetch root cause. History mixed client threads without an explicit all-clients scope label.

Pain displayed two separated front/back silhouettes with many overlapping outlined targets, a large toolbar, neutral/male/female choices and independent zoom controls. The no-target gate was honest. This live toolbar differs from shared source's initial male default; deployed code SHA is UNKNOWN. Never assert local source equals production.

Viewport overrides requested 414×896, 2560×1440 and 3840×2160, but DOM still reported 2195×1097 each time. Overrides were reset. Those three sizes are UNVERIFIED in live acceptance; attempted resizing is not evidence. New wireframe inspection is separately labeled synthetic.

Human Atlas: assembled model, 15 systems, exploded slider 0→55→0 and anatomy search were exercised. Search “patella” returned combined and left/right results. Isolation controls are documented by its repository; a completed isolate interaction was not independently verified. No physical-device performance, medical accuracy or full-mesh count audit performed here.

## Source findings to carry into build gates

| ID | Evidence | Consequence |
|---|---|---|
| PA1 | BodyMap `:272` chooses first active entry for region; `:284` updates it | Repeated reporting may overwrite prior score; append observations before claiming longitudinal history |
| PA2 | painChartInsights `:201-235,285` sorts all entries and compares first/last of six | Different regions can drive a single improving/worsening label; trends must be episode/region/side specific |
| PA3 | BodyMap fetch `:228-248` has no generation/abort guard | Source-supported stale-client response race; reproduce with delayed responses before repair |
| PA4 | service create/update promises `{entry}`; controller responds `{data}` | Type/response drift, currently hidden because caller refetches; introduce a tested decoder before reusing response values |
| PA5 | model createdById/painType nullable; frontend types require them | Historical/null payload compatibility must be explicit |
| PA6 | bootcampPainAlerts `:24` queries `status:'active'`; model has `isActive` | Verified schema mismatch at source, runtime reachability/unhandled outcome not proven; do not silently patch in UI slice |
| PA7 | painWriteService `:92` hardcodes side center for all regions | Side precision differs across writer paths; preserve legacy records and normalize new writes in one server contract |
| CC1 | roleConfig `:39-41` defaults unknown role to admin | Frontend affordance risk; server bypass not proven. Future shell must default to denied/loading |

## Baseline tests and hygiene

Frontend installed Vitest, BodyMap plus entire coach-assistant: **808 pass / 2 fail**, 131 files, exit 1. Failures: CoachIntakeResponsiveContract expects `activeTab === 'chat'`; CoachIntakeRetentionCandidates.identity expects intake JSX directly in page despite ReviewPanel extraction. They are stale source-structure assertions by source inspection; do not delete without replacing intended behavioral coverage.
Backend source-only pain routes and AI pain context: **5/5 pass**. Design Brain local isolated tests: **39/39 pass**. These do not establish PostgreSQL, provider, production or medical correctness. Initial Vitest EPERM was resolved with reviewed elevation; not counted as RED.

Non-destructive hygiene: root inventory and relevant filenames captured in evidence/hygiene.json. Many old patches, backup configs, duplicate planning eras and nested worktrees exist. Candidate archive list: historical CC styles/pages after caller proof, superseded August plans after link updates, loose patch files after ownership and restore verification. No files moved/deleted. Entire repo cleanup and other dashboards are outside this handoff.

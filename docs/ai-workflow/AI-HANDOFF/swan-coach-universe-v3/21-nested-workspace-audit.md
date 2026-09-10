# SCU-NESTED-AUDIT — inner workspaces and One Coach context

Owner: Astra. Version: 3.2, 2026-09-06 UTC.
Scope: explicit mounted-source walks and selected existing component tests.
Complements 18's 127 top-level entries; not an authenticated functional closeout.
All source paths below are relative to frontend/src/components.

## Clients & Team and trainer Clients

TrainerClientsWorkspace.tsx:14 in DashBoard/workspaces renders
ClientsWorkspace audience="trainer". ClientsWorkspace.tsx:233 gets actual tab
renderers from ClientsWorkspaceTabs.tsx; :256–261 passes them to the view.
ClientsWorkspace.view.tsx:207 renders ClientDetailView and :210 supplies the
audience's visible tabs. ClientDetailView.tsx:67 declares six tabs and :126
dispatches their render callbacks. ClientsWorkspaceTabs.tsx:58 onward renders
the actual panels; placeholder fallbacks in ClientDetailView are not that chain.

| Nested view | Admin | Trainer | Coach context/action |
|---|---|---|---|
| Training | Visible | Visible | Selected-client draft, existing logger/planner; preserve revision and current audience |
| Progress | Visible | Visible | Actual logged evidence; unavailable metrics stay unavailable |
| Nutrition | Visible | Visible | Client timeline/review, separate from actor's own Nutrition workspace |
| Biometrics | Visible | Visible | Scoped measurement/body-map sources; explicit permission for images |
| Overview | Visible | Hidden | Staff overview is not client-visible context by inheritance |
| Settings | Visible | Hidden | Account lifecycle uses existing human workflow; no inferred grants |

Authority: workspaces/clients-team/clientHubAudience.ts:36–61. Trainer roster
operations panels are enabled in current source; their assignment enforcement
needs backend proof, not reliance on the explanatory comment in that file.

TrainingTabContent derives three modes from trainingWorkflowModes.ts:34 onward.
TrainingTabSectionContent.tsx:84–150 renders each real section:

| Mode | Sections | Audience / integration |
|---|---|---|
| Today | logger | Both; native WorkoutLogger and saved-workout receipt |
| Plan | plans, architect, copilot | Both; saved library, builder and Coach draft remain distinct |
| History & Inputs | history, import, plaud | Admin only in current audience config; trainer deep links coerce to logger |

Do not promise trainer history/import parity by exposing hidden buttons.
trainingWorkflowModes.ts:95 onward states that these sections still depend on
admin endpoints. A future trainer adapter needs assignment-scoped backend routes
before the UI restriction can be removed. This is a concrete integration gap.
The seven section IDs are existing query/deep-link contracts and must be retained.

## Nutrition workspace: fifteen actual render branches

workspaces/NutritionWorkspace.tabs.tsx declares IDs/labels; NutritionWorkspace.tsx
:209–280 conditionally renders them. The separate Client Hub nutrition panel
targets the selected client, whereas this workspace uses its own consumer context.

| ID | Rendered consumer / evidence | One Coach rule |
|---|---|---|
| today | Today dashboard at :209 | Summarize current food evidence and next permitted action |
| log | FoodIntakeForm :233 | Manual meal remains available; review exact food/quantity/unit |
| voice | VoiceNutritionPanel :234–244 | hasAINutrition lock; preserve dictation origin; never auto-save |
| search | FoodSearchPanel :245 | Search result is a candidate until selected/reviewed |
| barcode | NutritionBarcodeCapture :246 | Scanned product identity is not serving-size certainty |
| restaurant | RestaurantTab :247 | Confirm item/portion; absent nutrition is unavailable |
| hydration | NutritionHydrationTab :248 | Explicit volume/date; no duplicate drink on retry |
| macros | MacroChartsPanel or unavailable panel :249 | Same day/source totals as the tab; respect gentle mode |
| garden | GardeningTab :250 | Explain/navigate; unrelated external actions are not implied |
| farms | FarmFinderTab :251 | Location use requires existing user controls |
| supplements | SupplementsTab :252 | Record explicit user facts; no invented dose or prescriptions |
| quality | FoodQualityTab :253–257 | Source-linked analysis; no claim of medical clearance |
| meal-plan | MealPlanTab :258–268 | hasAINutrition lock; planning must not silently overwrite food logs |
| intelligence | FoodIntelligenceDashboard :269–279 | hasAINutrition lock; paid capability requires server entitlement too |
| learn | NutritionLearnTab :280 | Educational content; no implicit tool execution |

The three visible lock overlays are UI evidence only. The server must independently
enforce entitlement. Coach cannot route around an unavailable feature by using a
different endpoint. Logging from any producer must refresh the same macro consumer.

## Content Studio: six tabs, separate publishing authority

DashBoard/Pages/content-studio/ContentStudioHub.tsx:83–89 declares six tabs;
:135 filters visibility; :175–183 renders consumers; :208 mounts renderTab().
All six current rows lack provider gate fields. A generic service-status badge
must not imply that an unimplemented generation/provider tool is available.

| Tab ID | Actual consumer | Coach boundary |
|---|---|---|
| workflow | renderWorkflow() | Draft project stages and metadata; stage update is not publication |
| library | VideoLibraryV3 | Retrieve entitled training media; preserve ownership/visibility |
| coverage | CrystallineCoverageTracker | Report coverage from real library metadata |
| video-optimizer | VideoOptimizerPanel | Explicit selected media; reviewed processing and output receipt |
| nano-banana | NanoBananaBadgeCreator | UI label is Badge Assets; generation and badge award are separate |
| render-queue | CreatorRenderQueue | Job status is not proof an output was published |

Gallery, private client progress photos, live streaming and training-video purchase
entitlements remain separate domain authorities even when accessible nearby.
One Coach needs each selected asset's current owner, visibility and consent; never
carry a private photo into public content because the operator changed tabs.

## Component evidence and remaining audit work

Nine existing suites passed, 45 tests total, in evidence/astra-nested-tab-tests.log:
ClientsWorkspace.trainerAudience; ClientDetailView.visibleTabs;
TrainingTabContent.trainerAudience; NutritionWorkspace today/nutritionOS/
entitlement/macroRefresh; ContentStudioHub tabGating/creationBoundary.
These are component/source tests with substituted dependencies, not real-role
sessions or server authorization proof. No test result here establishes that all
127 routes or every nested view behaves correctly in production.

Next nested inventory walks: schedule/location drawers, equipment profile/scan
states, pain/body-map panels, waiver lifecycle, account-access controls, galleries,
form assessment and role-specific home/progress widgets. Each must produce the
same source-to-consumer receipt, authority and denied/empty/error test entries.
Avoid counting import-graph candidates as verified mounted tabs.

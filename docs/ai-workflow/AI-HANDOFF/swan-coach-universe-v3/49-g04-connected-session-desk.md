# G04 connected Session Desk

Artifact: SCU-G04C-49. Owner: Astra architecture; root adjudicates readiness and owns controller; Luna implements bounded slices. Version 1, 2026-09-12. Status: PLANNED; only G04.1 is eligible for PLAN READY after root baseline verification. G04.2-5 are NOT PLAN READY pending their exact checks below. No implementation, browser verification, deployment or passing tests are claimed by this document.

This is the canonical planning continuation explicitly assigned by root. It extends [31](31-gwen-execution-handoff.md), [32](32-gwen-domain-and-verification-contract.md), [14](14-experience-execution.md) and [38](38-g04a-architecture-draft.md), and operationalizes the G04 gaps in [47](47-astra-runtime-hostile-review.md) / [48](48-capability-truth-and-release-gaps.md). It supersedes only earlier G04 integration-complete claims and the prototype's content-carrying Logger bridge. It preserves the approved single shell owner, canonical workout boundary, reviewer assignments, submitted snapshot and server receipt authority. It does not replace the existing packet or reopen product architecture.

Sean's task override retains implementation/tests followed by combined Astra hostile review and repairs. GLM/Flash are not required gates for this task. No paid/provider calls or review-budget resets are authorized by this artifact.

## 1. Baseline and preservation receipt

Canonical worktree: `C:/Users/BigotSmasher/Desktop/@Everything/quick-pt/SS-PT/tmp/worktrees/swan-coach-astra-owned-20260906`. Branch `codex/swan-coach-astra-owned-20260906`; HEAD `48d792da5351a3f89518baba7f4ab553d69f41a8`. Dirty with concurrent root-owned repairs; this worker first inspected READ ONLY, then received authorization for exactly three new files: this document, [49-wireframe.html](49-wireframe.html), and `tmp/coach-astra-hostile-20260912/g04-architecture-handoff.json`. No product/test/controller/README changes.

All three paths were absent at preflight. CreateNew mode prevents overwrite; protected governing-document before/after hashes are recorded in JSON. New-file preservation is N/A for pre-edit snapshots; existing plans remain unchanged. Future revisions require a verified snapshot. Native vault hook path was absent, vault directory present; no hook execution or restore proof. Lane digest reported "not a git repository — no ledger" despite successful Git identity commands; root coordination is the ownership evidence, not a lane lock. Doc38 history most recently resolved to `0c96142f242cdafaf850388f274754efb8068213`; 47/48 govern over its older completion claims.

| Current source seam | Independent source finding |
|---|---|
| UniversalDashboardLayout / CoachSessionDraftContext | Existing provider owns shell-lifetime state; concurrent worker repairs owner/transport. Root reports getSnapshot():Readonly<DraftState> and admin/trainer admission forthcoming; reread completed code before freezing later APIs. |
| CoachCommandCenterPage / CoachSessionDesk | Desk unmounted. Prototype carries content in Logger bridge, ignores returned target intent, labels preparation Saved and contains no-op controls. |
| CoachWorkoutDraft | Free-text exercise identity unresolved; empty Floor Mode dereferences missing row; unit changes turn null load into zero. |
| useExerciseSearch / NASMExerciseRolodex | Existing canonical /api/exercises/library loader; Rolodex writes global localStorage recents and needs a memory-only opt-out. |
| WorkoutLogger / RunnerEngine.types / nasmApiService | Standalone mutable ExerciseEntry[] plus autosave/offline/AI/plan/direct-submit effects; numeric Runner model cannot represent nullable/unit-aware Coach content faithfully. |
| useCoachPinnedClient / controller / actions / controllerEffects | Picker, routed/automatic thread loads and route/pin effects bypass owner guard. |
| coachProposalService / existing proposal controller / CoachWorkoutResultState | Reuse preparation/detail/approval/check/strict proof and verified-record routing. |
| aiCommandRoutes / coachIntentListing | Authorized bounded server history already exists; no new receipt database needed. |

Names above refer to the exact paths in the JSON source evidence; source hashes bind this inspection. Historical test totals from48 are not this worker's baseline. Scoped current tests, Mermaid rendering, wireframe rendering and runtime journeys are NOT RUN.

## 2. Requirements and acceptance criteria

Job: an authorized trainer/admin edits one real workout task, moves between Desk and canonical Logger without duplicating state, explicitly approves a frozen proposal, and sees server-verified results for the correct client.

Scope: G04.1 canonical editor, G04.2 selection boundary, G04.3 shared Logger mode, G04.4 approval/results, G04.5 mounted responsive journeys. Non-goals: model/provider work, G08/G09/G10 activation, arbitrary computer control, new stores, browser draft persistence, exercise unit conversion, paid reviews, production release, and full Runner/protocol feature parity.

| ID | Measurable acceptance | Tests |
|---|---|---|
| G04C-R01 | Every added exercise is selected from the canonical library; id/key/name match the selected record; repeated selections create distinct instance UUIDs. | G04C-T01, G04C-T02 |
| G04C-R02 | Missing reps/weight remain null; bodyweight requires explicit zero; malformed/nonfinite/negative/decimal reps are rejected; kg cannot freeze for save or transport. | G04C-T03 |
| G04C-R03 | Current draft and frozen preview are distinct views; Edit/Cancel preview returns to current draft without modifying the snapshot; validation errors are visible; no no-op action is presented as working. | G04C-T04 |
| G04C-R04 | New workout content, selected exercise recents and submitted payload never enter browser storage/logs/provider prompts; reconnect sends zero automatic writes. | G04C-T05, G04C-T12 |
| G04C-R05 | Dirty cross-target selection is decided before local pin/URL/chat mutations; observed external change masks private content; Return restores actual original selection and Discard commits requested selection once. | G04C-T06, G04C-T07 |
| G04C-R06 | Desk and canonical Logger bind the same shell-owned task/content; reference-only handoff has a validated ACK; navigation and ACK do not increment semantic revision or save. | G04C-T08, G04C-T09 |
| G04C-R07 | Immutable submitted revision/request identity survives retries; edits do not alter approval payload; preparation alone never displays Saved or approves. | G04C-T10, G04C-T11 |
| G04C-R08 | Existing approval/review-token/readback classifies truth; Results reloads authorized server history with bounded pagination; open-record uses verified references only. | G04C-T11, G04C-T13 |
| G04C-R09 | Actor/raw-role/logout/target generation changes mask old private data and reject stale continuations; no A-B-A resurrection or unsupported-role staff authority. | G04C-T07, G04C-T09, G04C-T13 |
| G04C-R10 | Complete state matrix works at specified widths/zoom with >=44px controls, safe-area/keyboard, correct focus/IME/live-region/reduced-motion behavior and empty-safe Floor Mode. | G04C-T14, G04C-T15 |
| G04C-R11 | Standalone Logger, existing Review/intake/audio/History and legacy routes preserve their existing semantics. | G04C-T16 |
| G04C-R12 | Measured budgets, finite polling, capability withdrawal and scoped rollback are evidenced; server receipts are not erased by local closure/rollback. | G04C-T17, G04C-T18 |

Business invariants: explicit target, authenticated raw role as authority, exactly one mutable draft plus one immutable submitted snapshot, server-authorized access on every API boundary, no fabricated zero/record ID/receipt, no auto-approval, and no local-interest cancellation represented as a domain rollback.

Open decisions are implementation checks, not permission questions: root rereads repaired owner/transport API; exact null-target selection representation; shared-mode query preservation through canonical routes; availability of a real actor/assignment/browser fixture; existing style primitive accessibility; current receipt-reader frontend seam. No later slice may invent an answer silently.

## 3. Architecture and exact bounded slices

### G04.1 — canonical editor/library/presentation

Only this slice is eligible for PLAN READY after root verifies baseline, file ownership and readiness. Luna writes isolated behavioral RED cases before implementation; import/setup failure is not RED evidence.

Allowed: CoachWorkoutDraft.tsx, a scoped style/helper if needed, CoachSessionDesk.tsx presentation, NASMExerciseRolodex.tsx optional memory-only mode, and scoped tests. Do not edit owner/transport/controllers/routes or mount Desk. Existing headless canonical exercise adapter contract in root47/HR7 remains authoritative for that boundary; do not create a competing loader.

Add optional `persistRecentSelections?: boolean` default true to Rolodex. False bypasses both readRecentExercises and recordRecentExercise; Desk passes false. Existing useExerciseSearch remains source. Picker owns only query/highlight/open/loading presentation, no retained workout array.

A chosen ExerciseSlim supplies canonical id/key/name plus a fresh exerciseInstanceId UUID. Reject blank/malformed identity; display canonical name without free typing; replace through library selection. No generated library IDs. Null reps/load remain null; explicit bodyweight sets zero; kg blocks review/transport. Unit changes do not invent prior weights.

Fix empty Floor Mode, visible validation, current-draft versus immutable-preview selection, and keep all supported duration/intensity/source fields during metadata edits. Edit/Cancel preview returns to current draft without altering snapshot. Preparing reads "Preparing review..." / "Ready for approval"; no Saved or second approval button. Callback-backed Ask/Review progress do their actual job; otherwise unavailable with a reason. No no-op Retry or self-target fallback.

Exit: T01-05 PASS, scoped editor accessibility/state checks, baseline regressions PASS, diff review; Desk remains unmounted. Full T26-T29 remains pending.

### G04.2 — actual target selection

NOT PLAN READY until root rereads repaired owner/transport (including getSnapshot) and current selection paths. Add one page/controller adapter; keep roster/navigation callbacks outside the owner.

Intercept before mutation: useCoachPinnedClient picker, explicit handleThreadSelect, controller route callbacks, routed/automatic thread effects, route/global-pin reconciliation. Same-target compatible thread navigation may proceed. Dirty cross-target change holds typed request before chat.newChat, text clear, conversation load, pin or URL write.

Keep only bounded original/requested target+thread metadata. On externally changed URL/pin mask old private content during render and suspend reconciliation. Return restores actual permitted original pin/route/compatible thread using buildThreadSelectionSearchParams and existing selection functions. Discard retires local interest then commits requested selection once; it does not cancel server work. Revoked original access stays denied.

Null is explicit unscoped selection, never actor fallback. Existing requestTargetChange rejected null at inspection: root must bind a typed extension to the same owner's selection metadata or an adapter-held null request scoped to old-task discard. No new draft store. Exit T06-07 with actual router/global-client/controller integration.

### G04.3 — shared canonical Logger

NOT PLAN READY until G04.2 and root's owner/route checks. Split WorkoutLogger into a small dispatcher and unchanged standalone child. Branch into coach-session mode BEFORE standalone draft-peek, autosave, offline queue, AI listeners, plan prefill and direct-submit hooks mount.

Shared child consumes the existing owner and same CoachWorkoutDraft editor within Logger chrome; only view state is local. No initialData, copied ExerciseEntry[], array-bearing events, mirror refs, sessionStorage or router-state content. Pending reference/ACK belongs as bounded metadata in existing shell owner; exact methods await root reread.

`coachTask=<UUID>` selects mode but conveys no authority. Validate actor/raw-role/generation/task/target/revision against live owner before rendering/editing/ACK. Missing reload reference means unavailable with Return/reopen, never normal auto-load. ACK is binding proof only; stale revision requires fresh handoff.

Reuse existing admin Client Hub logger section, trainer log-workout route, and admin log-my-workout only for explicitly authorized self task. Client/general-user gets no staff mode. Extend existing safe route builder, remove loadPlan/assignment-prefill from shared-mode navigation, and verify EnhancedWorkoutLogger redirects plus TrainingTabSectionContent preserve selector.

Cost: roughly six production seams plus tests: dispatcher/standalone extraction, shared child, reference contract, route builder, owner metadata extension, styling. Full Runner skins need broader nullable/unit-aware types, all commands/calculations/protocol/superset compatibility; do not cast or zero-fill. Exit T08-09 plus standalone T16.

### G04.4 — approval and Results

NOT PLAN READY until repaired owner/transport, G04.3 and isolated real endpoint fixture. Validate -> freeze -> existing createCoachWorkoutDraft -> validate returned proposal/intent IDs -> getCoachProposal -> match workout type/target -> existing CoachActionProposalCard. Retain only generation/task/target/request/revision/proposal/intent references in existing shell metadata.

Existing controller remains approval/status authority. Mount one active card for selected reference, not parallel replacement controllers. An observer must preserve current publication semantics: supplied onProposalAction replaces event dispatch. Preparation means awaiting approval; only existing runApprove starts Saving. Existing CoachWorkoutResultState proof governs verified/open-record; unknown is not rollback.

Reuse GET intent-list with targetClientId, limit10 and opaque cursor. Keep <=50 loaded presentation entries, preserve continuation; validate identity/target through existing decoder. Close hides detail; reload fetches server history. No stored workout content.

Polling: one in-flight GET, <=6 checks at5-second intervals per explicit activation; only visible checkable outcome; stop terminal/denied/scope/background/offline/unmount. Manual Check remains. No approval retries as polling. Seed reloaded checkable state through existing controller if needed, not duplicated classification.

Exit T10-13 including isolated real backend/PostgreSQL; strict approval/readback, duplicate, interruption, denied and mismatched-proof cases.

### G04.5 — mount and responsive journey

NOT PLAN READY until prior exits. Reenable via capability gate and ErrorBoundary with working existing-page fallback; provider survives child failure. Preserve shell Talk/Review/History plus intake/audio/prepared reviews. S6 mobile Talk/Workout/Results subdivision stays within task area, with one composer.

Implement all real callbacks and states below. No fake context retry/correction action; wire authority or present read-only unavailable. Verified-only signature motion respects existing reduced-motion behavior. Transcript remains reachable in Floor Mode. Exit T14-18 plus complete T26-29 authenticated routes, combined Astra review/repairs and root's release gate.

## 4. Wireframes, states and accessibility

[49-wireframe.html](49-wireframe.html) is an inert synthetic design preview, not a product or rendered verification. It contains desktop/mobile draft layouts, review/Results and conflict/unavailable state cards. It uses sample Client 42 and fictional exercise values; no real customer, health record, account or infrastructure values. No scripts, network assets, storage or backend calls.

| Width | Required layout |
|---|---|
| 320-767 | Talk/Workout/Results within the task; one active content scroller; target/date visible; composer/action above visualViewport keyboard and safe area. Floor Mode one exercise. |
| 768-1023 | Stacked conversation and draft; Results drawer; no three narrow columns. |
| 1024-1919 | Two columns, conversation >=320px and draft >=400px; results below. |
| 1920-3840 | Desk max1760px; evidence gets extra width; prose <=68ch. Explicit 2560x1440 and 3840x2160 verification. |
| 200% zoom | Reflow to smaller arrangement; no horizontal page clipping; control text remains visible. |

| State | Copy / real action and constraint |
|---|---|
| Loading library/receipts | Named loading region; no fabricated row; cancel/close remains available. |
| Empty | What are we working on? Log workout / actual Ask / actual Review progress. |
| Partial/unavailable context | Name the missing source; real retry/manual review callback, or read-only unavailable explanation. |
| Draft/incomplete | Draft - not saved; canonical selector and editable rows; visible field errors at review attempt. |
| kg unsupported | Preserve values; explain mapping unavailable; no save/transport. |
| Frozen preview | Review this workout; Edit/Cancel preview preserve immutable snapshot. |
| Preparing / prepared | Preparing review... / Ready for approval; no Saved language. |
| Executing | Saving... from actual approval; inspect/check; stopping speech does not cancel write. |
| Committed-unverified / unknown | Saved; checking result / Checking whether it saved; Check result, close. |
| Verified | Saved and checked; verified-record link; correction only through actual reviewed path. |
| Proved rollback | Nothing was saved only with actual rollback proof; reviewed retry. |
| Offline | Open in this tab only; edit permitted; no preparation/approval; reconnect no POST. |
| Access revoked | Mask private content; close/choose permitted target. |
| Target conflict | Return to original / Discard draft, focus trap/restoration; actual selection changes only after decision. |
| Missing/stale Logger reference | Draft unavailable/stale handoff; Return/reopen; no standalone fallback or false ACK. |
| Reload | Unsaved memory-only draft lost honestly; GET server Results. |

All controls >=44px, labelled units/fields, non-color status, logical keyboard order. Decision dialogs trap/restore focus; embedded regions do not trap the page. One live region per active task. IME composition cannot submit. Reduced motion suppresses signature animation. Pure preview uses inert button-shaped labels; actual keyboard, soft-keyboard, screen reader and responsive behavior remain NOT RUN.

## 5. Contracts, authority and diagrams

Existing [38](38-g04a-architecture-draft.md), coachWorkoutDraftContract.ts, coachSessionDraftState.ts and coachProposalService.ts remain authoritative. Rebind exact exports after concurrent owner repair; getSnapshot():Readonly<DraftState> is parent-reported until reread. These semantic contracts are proposed integration metadata, not a second store:

~~~ts
type CoachSelection = Readonly<{ targetUserId: number | null; threadId: number | null }>;
type SelectionRequest = {
  kind: 'pin' | 'thread' | 'observed-navigation'; selection: CoachSelection;
};
type CoachLoggerReference = Readonly<{
  version: 1; handoffId: string; taskId: string; scopeToken: string;
  actorGeneration: number; targetUserId: number; revision: number;
}>;
type CoachLoggerAck = Readonly<{
  handoffId: string; taskId: string; actorGeneration: number;
  revision: number; status: 'bound' | 'stale' | 'unavailable';
}>;
type DraftSubmissionReference = Readonly<{
  taskId: string; requestKey: string; submittedRevision: number;
  actorGeneration: number; targetUserId: number;
  proposalId: string; intentId: string;
}>;
~~~

Validate IDs/revisions; no content in handoff, no semantic revision on ACK. Metadata clears on actor retirement. Discard ends local interest, not server execution. Existing schemaVersion1 request remains task UUID/request UUID/revision/target/allowlisted workout. Canonical string exercise identities differ from instance UUIDs; max100 exercises/200 sets, positive unique ordinals, nonnegative finite loads/integer reps, null incomplete, explicit bodyweight zero and kg UNIT_MAPPING_REQUIRED. Preserve supported session fields; no new billing/session-credit inference.

Existing APIs: GET library; POST /api/coach/proposals/workout-drafts; GET proposal/:id; POST proposal/:id/approve with reviewToken; GET /api/ai-command/intents/:intentId and scoped bounded list with opaque cursor. Server is role/assignment authority; route selectors/client flags are not.

~~~mermaid
flowchart TD
  Start[Open authorized task] --> Access{Actor role and target valid}
  Access -->|No| Denied[Mask content and choose permitted target]
  Access -->|Yes| Edit[Edit one shell draft]
  Edit --> Select{Target change requested}
  Select -->|Dirty| Decision[Hold selection and show Return or Discard]
  Decision -->|Return| Restore[Restore actual original pin route and compatible thread]
  Restore --> Edit
  Decision -->|Discard| Retire[Retire local interest then commit requested selection]
  Retire --> Start
  Select -->|No change| Review{Complete canonical data and online}
  Review -->|No| Fix[Explain validation or offline state]
  Fix --> Edit
  Review -->|Yes| Freeze[Freeze immutable submitted revision]
  Freeze --> Prepare[Prepare proposal using stable request key]
  Prepare -->|Failure| Retry[Explicit retry same request or edit new revision]
  Retry --> Edit
  Prepare -->|Success| Approval[Existing reviewed proposal approval]
  Approval -->|Defer or reject| Edit
  Approval -->|Approve| Execute[Execute existing server transaction]
  Execute --> Proof{Receipt proof}
  Proof -->|Unknown| Check[Bounded readback or manual check]
  Check --> Proof
  Proof -->|Verified| Record[Show authorized record]
  Proof -->|Proved rollback| Retry
  Record --> Close[Close view and retain server history]
~~~

~~~mermaid
stateDiagram-v2
  [*] --> Empty
  Empty --> Draft: explicit begin
  Draft --> Preview: valid freeze
  Preview --> Draft: edit or cancel preview
  Preview --> Preparing: explicit prepare
  Preparing --> AwaitingApproval: matched proposal reference
  Preparing --> PrepareFailed: error or timeout
  PrepareFailed --> Preparing: same snapshot explicit retry
  AwaitingApproval --> Executing: existing explicit approval
  AwaitingApproval --> Draft: defer
  Executing --> Unknown: interrupted confirmation
  Executing --> CommittedUnverified: commit proof only
  Executing --> Verified: verified receipt
  Unknown --> Verified: matched readback
  CommittedUnverified --> Verified: matched readback
  Unknown --> RolledBack: proved rollback
  RolledBack --> Draft: review retry
  Draft --> Conflict: target mismatch
  Conflict --> Draft: actual Return
  Conflict --> Empty: discard then switch
  Draft --> Masked: actor role or access change
  Preview --> Masked: actor role or access change
  AwaitingApproval --> Masked: actor role or access change
  Masked --> Empty: retired references
~~~

~~~mermaid
sequenceDiagram
  participant D as Desk
  participant O as Existing shell owner
  participant L as Canonical Logger shared mode
  participant C as Existing proposal controller
  participant S as Server
  D->>O: edit current token and revision
  O-->>D: same authoritative content
  D->>O: issue content-free handoff reference
  D->>L: canonical route selector
  L->>O: validate actor generation task target revision
  alt current binding
    O-->>L: shared content reference
    L->>O: ACK bound matching revision
    L->>O: edits through same owner
  else stale or missing
    L-->>D: unavailable or reopen action
  end
  D->>O: freeze current revision
  D->>S: prepare immutable request
  S-->>D: proposalId and intentId
  D->>C: fetch and review matched proposal
  C->>S: explicit approve with review token
  alt verified receipt
    S-->>C: matched persisted proof
    C-->>D: verified result and safe record route
  else interrupted or unknown
    C->>S: authorized GET result
    S-->>C: proof or unavailable
  end
  Note over O,S: Local closure retires interest, not server execution
~~~

| Actor/control | Draft editor/shared Logger | Prepare/approve | Receipt access |
|---|---|---|---|
| Authenticated admin | Explicit permitted target; self only explicit | Existing server staff checks and review token | Authorized scoped history and record |
| Authenticated trainer | Assigned target; fresh access checks | Existing server assignment checks and review token | Authorized assigned target only |
| Client/general user | No staff Desk/shared-session capability | No new staff authority | Existing self-scoped history contract unchanged |
| Missing/unsupported/changed identity | Mask and retire old scope | Zero new requests | No leaked old response |
| View-as/dashboard role | Presentation only | Raw authenticated role remains authority | Server checks remain authoritative |

~~~mermaid
flowchart LR
  UI[Authorized Desk or shared Logger] --> Owner[Memory-only shell draft and snapshot]
  Owner --> Envelope[Allowlisted explicit request]
  Envelope --> Guard[Authenticated role and target validation]
  Guard --> Proposal[Existing proposal review and transaction]
  Proposal --> DB[Existing proposal intent and workout records]
  DB --> Read[Authorized bounded readback]
  Read --> UI
  Owner -. forbidden .-> Storage[Browser storage logs or provider prompts]
  Route[Untrusted route selector] --> Bind[Validate against live owner]
  Bind --> UI
~~~

Data model: existing proposal -> intent -> workout references; no new table or persistent draft. ERD N/A for new schema because no relational change. Server receipt relationship is covered by sequence/contract and existing canonical backend. New backend migration/restore-data transformation N/A; existing transaction and restore behavior still requires integration proof.

Mermaid source is authored here; no renderer was run and no rendered-diagram verification is claimed.

## 6. Executable test plan and evidence status

All tests below are NOT RUN in this authoring task. IDs are new extensions mapped to existing T26-T29; existing G01/G03 tests remain required. Fixture IDs use synthetic Client42 and distinct Actor7/Actor8 with explicit permitted/denied assignments. Never assume a local database is disposable.

Proposed new executable files under frontend/src/components/DashBoard/Pages/coach-assistant:
- CoachWorkoutDraft.g04connection.test.tsx: T01-03.
- CoachSessionDesk.g04connection.test.tsx: T04.
- CoachSessionLibraryPrivacy.g04connection.test.tsx: T05.
- CoachSessionSelection.g04connection.test.tsx: T06-07.
- CoachSessionLogger.g04connection.test.tsx: T08-09.
- CoachSessionProposal.g04connection.test.tsx: T10-11.
- CoachSessionResults.g04connection.test.tsx: T12-13.

T14/T15/T17/T18 use repeatable browser/manual/performance procedures below and root's existing QA location; exact executable harness paths must be bound by root before those later slices. New files do not exist merely because named here. RED contracts run separately from the normal green regression suite.

| Test / legacy map | Level, fixture and action | Expected result and forbidden effects |
|---|---|---|
| G04C-T01 / T26 | Component; canonical library response; select same exercise twice, replace selection | Canonical IDs/key/name preserved; distinct instance UUIDs; no name-as-ID or auto-submit. |
| G04C-T02 / T26 | Component; malformed IDs/names, empty library, load failure and retry, delayed response after close | No invalid exercise installed; honest empty/loading/error and real retry; stale callback cannot add a row. |
| G04C-T03 / T26 | Component+contract; missing values, zero, negative, decimal reps, NaN, kg/bodyweight unit switches | Null remains absent; kg blocked; zero only explicit; ordered unique sets; no transport of invalid content. |
| G04C-T04 / T26 | Desk component; current revision plus frozen older snapshot; edit/cancel/review failure/prepare success | Current editable view returns; snapshot unchanged; visible errors; prepared is awaiting approval; no no-op controls. |
| G04C-T05 / T27 | Picker+Desk; spy on storage/log/network; select memory-only then normal standalone picker | Memory-only reads/writes zero recents or workout content; default standalone recents behavior unchanged. |
| G04C-T06 / T26 | Real router/global-client/controller; dirty draft then picker/recent/thread/auto-selection | Return leaves actual pin/URL/thread/task unchanged; Discard retires then commits once; no predecision chat clear/load. |
| G04C-T07 / T26 | Same harness; URL/back/global pin change, clear pin, revoked original, actor/raw-role A-B-A | First-frame masking and suspended effects; Return restores real permitted original; no self fallback or resurrection. |
| G04C-T08 / T26 | Mounted canonical admin/trainer Logger round trip | Same owner task/content reference/revision; edit reflected in Desk; no initialData clone/storage/plan load/write. |
| G04C-T09 / T26 | Forged/missing/stale reference, late ACK, actor/target generation change/reload | Typed stale/unavailable; no ACK or edit/save against another task; no standalone fallback. |
| G04C-T10 / T26 | Deferred API fixture; freeze, prepare retry/double-click, edit while pending | Same frozen retry key; old response bound only to its generation/revision; no hidden approval or Saved copy. |
| G04C-T11 / T26 | Isolated real server/PostgreSQL; library -> prepare -> detail -> approve -> readback; duplicate/interrupted write | Review token required; one canonical effect; matching proof only; no duplicate writes or false rollback. |
| G04C-T12 / T27 | Browser offline at submit; reconnect/reload with storage/network assertions | Editing stays memory-only, reload loses unsaved draft honestly, reconnect zero POST; GET server receipts only. |
| G04C-T13 / T26-T27 | Server list and card decoder fixtures plus real authorized read; cursor, foreign IDs, denied/reordered completion | Bounded history, target-bound proof, no guessed link; close retains receipt; stale/denied data masked. |
| G04C-T14 / T28 | Browser 320/390/414/768/1440/2560x1440/3840x2160, 200% zoom, mobile keyboard | No clipping/covered primary action; >=44px controls; one scroller; all matrix states. Capture evidence per width. |
| G04C-T15 / T29 | Keyboard/screen reader/IME/reduced-motion; empty/one/multiple Floor Mode | Correct focus/restore and labels; one live announcement; no composition submit; no empty crash. |
| G04C-T16 / compatibility | Existing scoped Logger/route/card/pinned-client/shell suites on current candidate | Standalone storage/save semantics and Talk/Review/History/intake/audio preserved. |
| G04C-T17 / operations | Mounted budget measurement and fake-timer+network polling probe | One in-flight GET; <=6 automatic checks; stops on hidden/offline/scope/terminal; 0 auto-POST; editor latency budget reported. |
| G04C-T18 / rollback | Isolated candidate disable Desk/shared mode then rerun canonical navigation and history lookup | Existing page/standalone Logger available; server receipt retained; no data deletion or domain undo claim. |

From frontend, root's G04.1 baseline command:
~~~powershell
node node_modules/vitest/vitest.mjs run src/components/DashBoard/Pages/coach-assistant/CoachWorkoutDraft.test.tsx src/components/DashBoard/Pages/coach-assistant/CoachSessionDesk.test.tsx src/components/DashBoard/Pages/coach-assistant/CoachSessionDesk.floorMode.test.tsx src/components/WorkoutLogger/NASMExerciseRolodex.selectionBehavior.test.tsx src/components/WorkoutLogger/NASMExerciseRolodex.recentRow.test.tsx --reporter=verbose --maxWorkers=1
~~~

Then G04.1 separate RED/GREEN command:
~~~powershell
node node_modules/vitest/vitest.mjs run src/components/DashBoard/Pages/coach-assistant/CoachWorkoutDraft.g04connection.test.tsx src/components/DashBoard/Pages/coach-assistant/CoachSessionDesk.g04connection.test.tsx src/components/DashBoard/Pages/coach-assistant/CoachSessionLibraryPrivacy.g04connection.test.tsx --reporter=verbose --maxWorkers=1
~~~

Before G04.2-4, root reruns repaired CoachSessionDraftContext/useCoachWorkoutDraftSubmit suites and the relevant existing pinned-client, route, proposal hostile/publication/identity suites. Use real exact test paths from current inventory, record command/exit/results, and keep red contracts separate. Root owns canonical configured typecheck/build and backend isolated test execution; generic memory-limit-failing commands are not substitutes.

## 7. Traceability and uncovered boundaries

| Requirement | Acceptance/component | Slice | Evidence required |
|---|---|---|---|
| R01/R02 | Canonical selector and CoachWorkoutDraft contract | G04.1 | T01-03 and baseline output |
| R03 | Desk current/frozen view and callback truth | G04.1 | T04 plus editor state captures |
| R04 | Memory-only picker/workout and reconnect | G04.1 then G04.4 | T05 then T12; full offline claim remains pending |
| R05 | Owner-driven real pin/thread/route selection | G04.2 | T06-07 actual router/controller boundary |
| R06 | Canonical Logger dispatcher/reference/ACK | G04.3 | T08-09 mounted admin/trainer paths |
| R07 | Stable submitted request and existing preparation | G04.4 | T10-11 real transport/DB boundary |
| R08/R09 | Card/readback/history and generation masking | G04.2-4 | T07/T09/T11/T13 |
| R10 | Wireframe/state/accessibility contract | G04.5 | T14-15, no synthetic preview as runtime proof |
| R11 | Existing surface compatibility | Every slice | T16 scoped regressions |
| R12 | Budgets/capability withdrawal/rollback | G04.5 | T17-18 measured results and isolated restore |

Table Rxx abbreviates G04C-Rxx only. Full reciprocal mappings are in the JSON receipt. No uncovered requirement is silently marked passed. Mock-only coverage remains for component fixtures until real T11/T13 and authenticated browser journeys run. Initial library success fixtures cannot prove mounted loader/auth/library drift. Synthetic wireframes cannot prove responsiveness/accessibility.

## 8. Operations, rollout and rollback

Root is operational owner until a deployed owner is named. New provider/spend behavior N/A. New database migration/backfill N/A. Server execution/rollback is reused, never implemented by deleting local drafts. Data restore testing applies to isolated backend integration and receipt retention, not a new migration.

Budgets to measure, not current achievements: render input-to-visible update p95 <=100ms at20 exercises/100 sets on recorded device/browser; no >200ms main-thread task from opening a normal draft; no automatic load above contract cap100 exercises/200 sets; one library fetch per mounted picker lifecycle subject to existing cache; one approval and one preparation in flight per bound snapshot; Results10/page, <=50 loaded presentation entries, polling as G04.4. Test maximum contract-size rendering separately and report if virtualization/scope reduction is needed; no unbounded mounted array.

Logs/metrics are enums/counts/durations only: operation category, validation code, ACK result, check result category, latency and attempts. No content, customer labels, health/free text, credential or private infrastructure values. Keep identifiers out of analytics unless an existing explicit policy permits them. Do not add analytics transport in G04.1.

Rollout order: dormant G04.1 tests -> selection tests -> shared Logger tests -> real proposal/Results proof -> flagged mounted staff role journeys -> combined hostile review/repairs -> root's separate GitHub/Render release gate. A passing structural receipt is not release permission or product verification.

Before source edits each builder records exact owned diff/source snapshots and root-coordinated boundaries. Rollback first withdraws Desk capability and shared-mode selector, retaining provider and existing working shell as appropriate; restore only owned changed files from verified snapshots in an isolated candidate, rerun T16/T18 and compare hashes. Do not restore pre-repair owner files over another worker. No reset/clean, no broad checkout, no server receipt deletion. This authoring task's new files are preserved; no rollback/delete was executed.

## 9. Hostile architecture review and decisions

| Challenge | Decision / unresolved proof |
|---|---|
| initialData or sessionStorage is the easy Logger bridge | Rejected: creates duplicate state or violates privacy. Reference-only shared branch before standalone hooks. |
| Reuse normal Logger with disabled Save only | Rejected: draft persistence, offline queue, AI listeners and plan prefills still mount and mutate. |
| Coerce Coach rows to ExerciseEntry[] | Rejected: null/unit/identity meaning differs; full Runner parity is larger separate work. |
| Picker guard covers target safety | Rejected: thread and reconciliation effects bypass it. All entry/effect paths included. |
| Clear warning implements Return | Rejected: actual pin/URL/thread must be retained/restored. |
| Prepared proposal means saved workout | Rejected: explicit existing approval and persisted receipt proof remain separate. |
| Timeline can fabricate verified from success=true | Rejected: reuse strict target-bound CoachWorkoutResultState decoding. |
| Offline recoverability means browser persistence | Rejected under current architecture: unsaved draft is lost honestly on reload; server receipts recover. |
| Rolodex is read-only UI | Rejected for current implementation: global localStorage recents require opt-out. |
| Owner API can be fixed here | Deferred to existing repair worker/root; no parallel owner edits or frozen stale signatures. |
| G04.1 can mount a helpful partial Desk | Rejected: mount waits G04.2-4 boundaries and G04.5 state proof. |
| Synthetic layout or a green structural gate proves readiness | Rejected: baseline, behavior, real boundaries and actual responsive/assistive journeys remain required. |

Architecture review is this worker's evidence-backed inspection and recommendation, not an independent final combined review. Root adjudicates this packet and later implementation; future findings remain pending until resolved. No external model call occurred. Requested role is gpt-6-astra/xhigh; served-model/token metadata unavailable is represented as null.

## 10. Readiness receipt and next authorized work

| Category | Disposition |
|---|---|
| Baseline/preservation | Current repo/source inspection and new-file preservation recorded; scoped current tests await root. Native hook and lane lock not verified. |
| Requirements/blueprint/contracts | Defined here; later owner API/route checks explicitly pending. |
| Wireframes | Synthetic desktop/mobile HTML exists after authoring; rendered visual QA NOT RUN. |
| Flow/state/sequence | Mermaid source provided; rendering/syntax tool validation NOT RUN. |
| Permissions/privacy | Applicable; contracts and negative tests above. |
| ERD/new migration | N/A: no schema change; existing record relationships reused. |
| Tests/traceability | IDs/fixtures/commands specified; all authoring-task test statuses NOT RUN. |
| Slices/operations | Bounded G04.1-5 with entry/exit/rollback; no deployment claim. |
| Review | Initial architecture inspection complete; root plan adjudication and combined implementation review pending. |
| Structural integrity | JSON receipt is intended for check-readiness.mjs. Full packet intentionally retains blockers; run output is evidence, not a passing-product claim. |

Next authorized slice: root verifies G04.1 current baseline, owns preservation/controller enrollment, confirms no file-owner conflict, rereads the editor seam and records G04.1 PLAN READY. Luna then runs real behavioral RED -> bounded G04.1 implementation -> GREEN. G04.2-5 remain NOT PLAN READY until their exact checks. No permission question is added; missing evidence is to be produced within existing authorization.

Structural command from repository root:
~~~powershell
node C:/Users/BigotSmasher/.agents/skills/non-vibe-coding/scripts/check-readiness.mjs tmp/coach-astra-hostile-20260912/g04-architecture-handoff.json .
~~~

This document cannot itself certify execution of that command, tests, screenshots, hook/controller enrollment, authenticated access, provider behavior, production migration, commit/push or Render deployment. The root should append actual results through its controlled receipt update after preserving this version.


G04.1 local exit,2026-09-12: Luna implemented dormant editor/library/Desk presentation; Astra repaired actual browser findings (lost Escape focus, uncontained absolute picker and clipped mobile set rows) and fenced delayed disabled/unmounted picker callbacks. Current scoped suite47PASS/8files; canonical npm run type-check exit0; actual editor/Rolodex/useExerciseSearch/worker browser7widths320..3840 PASS with synthetic library transport, native pointer/keyboard, no storage accesses, kgblocked and disabled retirement. Mobile/desktop screenshots visually inspected. Full Coach owner/proposal/backend journey is not established by this component harness. Desk stays unmounted; G04.2-5 and final combined review remain pending. Original builderRED recovered byteexact from native session:7fail2pass, but the kg assertion lacked controlled-prop rerender and is not valid behavioralRED. Six other failures showed intended missing/incorrect behavior; clean browserRED separately preserved. Latest GREEN12newtests+35compatibility=47. Prior full frontend1412 and productionbuild predate this slice.


G04.1 follow-up defect,2026-09-12: native decimal typing80.5 produced805 in g04-editor-browser-decimal-red/receipt.json. Prior integer-entry checks remain valid but do not prove fractional-load input. Plan54/HR10 reopens numeric entry before release. Desk remains unmounted.


HR10 local exit,2026-09-12: repaired native numeric entry using number-valued controls with exact nullable content, integer reps and decimal loads. New sequential-typing regressionRED6fail5pass becomes11PASS; expanded nine-file editor/Desk/library compatibility58PASS. Real Chromium at390/1440 passes ten numeric cases per width, including80.5/0.5/2.25/10, clear/null, negative/fractional rejection, nonfinite overflow and explicit bodyweightzero. Pointer/keyboard,44px controls, focus return, disabled retirement and no persistence remain verified; screenshots inspected. Canonical type-check passes but its actual graph excludes this dormant editor, so a separate explicit editor/dependency type-check was added and also passes. hr10-local-exit.json binds both commands and evidence. This closes the decimal acceptance defect, not the pending mounted Coach/Logger connections. Next is HR7-A canonical exercise reader; final combined review and release remain pending.

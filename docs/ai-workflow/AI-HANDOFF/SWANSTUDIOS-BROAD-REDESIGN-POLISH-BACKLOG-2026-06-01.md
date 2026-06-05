# SwanStudios Broad Redesign / Polish Backlog - 2026-06-01

**Purpose:** Park the broad redesign churn separately from the current production-fix lane so Sean can say "pick up the broad polish backlog" later and the next AI has a concrete scope.

**Use when:** Sean wants to resume visual/UX polish after the live workflow fixes are deployed and tested.

**Do not use for:** Emergency production bugs, auth/API/data-truth fixes, or session billing correctness. Those stay in the recursive slice lane first.

---

## Current Priority Boundary

The active production lane is still workout/progress-first:

1. Pick or onboard a client.
2. Dictate or manually log the workout.
3. Save the workout diary entry.
4. Generate truthful progress charts and exercise history.
5. Surface what changed, what is stale, and what needs action.
6. Make meaningful progress shareable to the community.

Broad polish should improve that loop. It should not bury it under decorative UI.

---

## Recently Moved Out Of Broad Polish

These items are no longer broad-redesign backlog items because they were handled in the production-fix lane:

- Client Hub full-page workout logging now returns completed logs to the selected client's Training > History view.
- Coach Command Center Client Hub return links reject unsafe return-path characters before rendering a back action.
- Workout Planner opened from Client Hub now offers a success-banner `Return to Client Hub` action after safe successful saves/activations.
- Client Hub Plan Next now returns to Training > Plans, where the selected client's saved plans load from `/api/workout/plans?clientId=...`.
- Clients & Team selected-client Coach commands now keep the selected client authoritative through backend execution instead of trusting stale classifier/clientRef output.
- Universal Master Schedule now blocks future-day sessions from opening the workout logger before the session day while preserving same-day gym-floor logging.
- Universal Master Schedule confirmation states now focus the modal on the active decision instead of showing unrelated Mark Complete / Cancel / Log Workout actions while cancel/no-show confirmations are open.
- Coach command malformed selected-client IDs now fail closed on the backend route, and the frontend preserves the route's validation message instead of masking it as a generic chat fallback.
- Admin activation queue now routes through the canonical `/api/sessions/admin/activation-queue` surface instead of the legacy sessions router.
- Universal Master Schedule admin bookings now allow Move Fitness/external/free-tracking clients to be scheduled without requiring or deducting SwanStudios paid credits.
- Schedule-to-Workout Logger handoff is verified through the canonical route chain: schedule opens the logger with `clientId`, `sessionId`, `sessionDate`, `source=master-schedule`, and a safe `returnTo`; the logger submits `scheduledSessionId`; the backend reconciles the linked scheduled session and only deducts when billing policy says to deduct.
- Workout Logger PDF export, duplicate-save summary unlock, Move Fitness zero-paid-session submit, and unsaved-cancel confirmation are covered by targeted tests, including the `jspdf-autotable` function-export guard that prevents the old production `doc.autoTable` crash.
- Swan Coach selected-client backend execution is now hardened across the stale-param bug family:
  - dispatcher slices now prefer `ctx.resolvedClient.id` over stale `params.clientId` for goal/nutrition, measurement/pain, client update/credentials, progress reads, legacy workout reads, legacy onboarding, and legacy client-admin commands.
  - The stale pattern scan across `backend/services/ai` now returns no matches for `params.clientId ?? ctx.resolvedClient?.id` or `params.clientId || ctx.resolvedClient?.id`.
  - Latest pushed Coach selected-client commits: `6ae3d9d53`, `9dfa1f260`, `f63797716`, `b721d1eba`, `2a273ce85`, `61499600b`, `9dbc7b4d1`.
- Workout Management theme-token bridge is now handled for the canonical workout management surface:
  - `ClientSelection`, `ExerciseLibrary`, and `WorkoutPlanBuilderStyles` now use universal dashboard theme variables instead of fixed blue/purple islands.
  - Contract coverage lives in `frontend/src/components/WorkoutManagement/WorkoutManagementThemeBridge.contract.test.ts`.
- Nutrition theme-token bridge is now handled for the active Nutrition workspace children audited in this lane:
  - Food log/search, Restaurant actions, Meal Plan controls, and Supplements style modules are locked by `frontend/src/components/FoodTracker/FoodTrackerThemeBridge.contract.test.ts`.
  - `QuickAddFood` remains dormant in the current route tree and was intentionally not patched in this production slice.
- Store/Revenue, Bootcamp Builder, and Client Hub theme-token bridge slices landed after the first backlog draft:
  - Store/Revenue order summary theme-token bridge: `bdfb5880d`.
  - Bootcamp Builder panel/button theme-token bridge: `8c3c70bbb`.
  - Client Hub list card, master/detail shell, selector, Training tab glow, and lifecycle confirmation dialog token bridges: `22db47283`, `7e9e75622`, `e06c37012`, `91dfcc145`, `051f84415`.
  - Client Hub coverage now includes targeted style/contract tests for the patched selector, shell, cards, Training tab, and lifecycle dialog.
- Universal Dashboard shell and active admin overview loading-state theme bridge are now handled:
  - `UniversalDashboardLayout.tsx` and `AdminLayout.styles.ts` route shared focus rings, button text, borders, shadows, fallback text, danger action background, and OmniTerminal FAB chrome through theme variables.
  - The shared `/dashboard/*` shell now routes focus shadows, mobile back shadows, OmniTerminal FAB shadows, and error-state danger soft background through `color-mix` token fallbacks instead of raw cyan/black/purple/red alpha shadows.
  - `WidgetSkeleton.tsx` routes the shared admin overview loading shimmer through theme variables and honors `prefers-reduced-motion`.
  - Coverage lives in `frontend/src/components/DashBoard/themeSync.contract.test.ts` and `frontend/src/components/DashBoard/Pages/admin-dashboard/components/WidgetSkeleton.themeBridge.test.ts`.
- Workout Logger shared Crystalline Swan palette is now theme-token bridged:
  - `WorkoutLoggerCS.ts` routes the shared logger colors, badge backgrounds/borders, and glow animation through dashboard theme variables while preserving fallback colors.
  - `withAlpha()` now supports CSS variable tokens via `color-mix(...)` instead of assuming every caller passes a hex value.
  - Coverage lives in `frontend/src/components/WorkoutLogger/WorkoutLoggerCS.themeBridge.test.ts`.
- Universal Master Schedule active drag preview glows are now theme-token bridged:
  - Canonical route evidence locks the path from dashboard/master schedule routes to `UniversalMasterSchedule` -> `ScheduleCalendar` -> `DragDropManager`.
  - `DragDropManager.tsx` routes valid/invalid drag overlay shadows through `var(--accent-secondary, #8B5CF6)` and `var(--danger, #ef4444)` using `color-mix(...)`.
  - Coverage lives in `frontend/src/components/UniversalMasterSchedule/DragDrop/DragDropManager.themeBridge.test.ts`.
- Trainer Home Swan Coach dock chrome is now theme-token bridged:
  - Canonical route evidence locks `/dashboard/trainer/overview` to `TrainerHomeTab` -> `SwanCoachDockTrainer`.
  - `SwanCoachDockTrainer.tsx` routes the pulse, skeleton, avatar, chip, and divider chrome through `var(--accent-secondary, #8B5CF6)` and `var(--text-primary, #E0ECF4)` token mixes.
  - Coverage lives in `frontend/src/components/DashBoard/Pages/trainer-dashboard/SwanCoachDockTrainer.themeBridge.test.ts`.
- Trainer Client Progress comparison benchmark bar is now theme-token bridged:
  - Canonical route evidence locks `/dashboard/trainer/client-progress` to `EnhancedClientProgressView` -> `EnhancedClientProgressViewShell` -> `ComparisonAnalytics`.
  - `ComparisonAnalyticsView.tsx` routes client and benchmark progress fills through `COMPARISON_PROGRESS_TONES`, including `var(--comparison-bar-secondary, color-mix(in srgb, var(--text-primary, #E0ECF4) 30%, transparent))`.
  - Coverage lives in `frontend/src/components/TrainerDashboard/ClientProgress/Analytics/ComparisonAnalytics.themeBridge.test.ts`.
- Trainer Client Progress advanced-mode quick action dock is now mobile-safe:
  - Canonical route evidence locks `/dashboard/trainer/client-progress` to `EnhancedClientProgressView` -> `EnhancedClientProgressViewShell` -> `QuickActionBar`.
  - `EnhancedClientProgressView.styles.ts` keeps the dock fixed on desktop, but changes it to an in-flow sticky safe-area-aware action bar under 640px so it does not cover progress content on phones.
  - Coverage lives in `frontend/src/components/TrainerDashboard/ClientProgress/EnhancedClientProgressView.themeBridge.test.ts`.
- Client sidebar workout-progress-first nav chrome is now theme-token bridged:
  - Canonical route evidence locks client dashboards to `UniversalDashboardLayout` -> `ClientStellarSidebar`.
  - `ClientStellarSidebar.nav.styles.ts` routes active nav glow, hover state, icon drop shadow, and collapsed tooltip chrome through `var(--accent-primary, #60C0F0)`, `var(--accent-secondary, #8B5CF6)`, and surface tokens.
  - Coverage lives in `frontend/src/components/DashBoard/Pages/client-dashboard/ClientStellarSidebar.navigation.test.ts`, which also keeps Home -> My Progress -> Log Workout as the first cluster.
- Client progress proof page and 12-chart grid cyan translucency are now theme-token bridged:
  - Canonical route evidence locks `/dashboard/client/progress` to `UniversalDashboardLayout` -> `ClientProgressDashboardPage` -> `CanonicalProgressChartsGrid`.
  - `ClientProgressDashboardPage.styles.ts` routes KPI card borders, XP glow, detailed-link hover, and skeleton loading shimmer through `color-mix(... var(--accent-primary, #60C0F0) ...)`.
  - `CanonicalProgressChartsGrid.styles.ts` routes chart-card borders, hover states, bar tracks, and default bar fill through dashboard theme tokens.
  - Coverage lives in `ClientProgressDashboardPage.themeBridge.test.ts`, `CanonicalProgressChartsGrid.themeBridge.test.ts`, and the existing KPI truth suite.
- Client overview quick actions are now workout-progress-first:
  - Canonical route evidence locks `/dashboard/client/overview` to `UniversalDashboardLayout` -> `ClientHomeTab` -> `ClientObservatoryHome`.
  - `ClientObservatoryData.ts` now orders overview actions as Log Workout -> Progress -> Book Session, while Move Fitness clients still hide booking and keep Log Workout -> Progress.
  - Coverage lives in `ClientObservatoryFeed.test.tsx` and the existing `ClientHomeTab.test.tsx` contracts for current-workout logging and Move Fitness booking suppression.
- Trainer client-progress shell fallback chrome is now theme-token bridged:
  - Canonical route evidence locks `/dashboard/trainer/client-progress` to `UniversalDashboardLayout` -> `EnhancedClientProgressView` -> `EnhancedClientProgressViewShell`.
  - `EnhancedClientProgressView.styles.ts` now routes panel/quick-action fallback backgrounds and shadows through `var(--bg-surface, #1A1A24)` and `var(--bg-base, #0A0A0F)` via `color-mix`.
  - Coverage lives in `EnhancedClientProgressView.themeBridge.test.ts`, with adjacent truth/list-identity contracts also passing.
- Trainer client-progress injury-risk panel fallback chrome is now theme-token bridged:
  - Canonical route evidence locks `/dashboard/trainer/client-progress` to `UniversalDashboardLayout` -> `EnhancedClientProgressView` -> `EnhancedClientProgressViewShell` -> `InjuryRiskAssessment`.
  - `InjuryRiskAssessment.styles.ts` now routes panel, accordion, table, progress-track, protocol, recommendation, and empty-state fallback surfaces through dashboard tokens and `color-mix`.
  - Coverage lives in `InjuryRiskAssessment.themeBridge.test.ts`; the active API path remains `/api/client-progress/:clientId/risk-assessment`.
- Trainer client-progress comparison analytics fallback chrome is now theme-token bridged:
  - Canonical route evidence locks `/dashboard/trainer/client-progress` to `UniversalDashboardLayout` -> `EnhancedClientProgressView` -> `EnhancedClientProgressViewShell` -> `ComparisonAnalytics`.
  - `ComparisonAnalytics.styles.ts` now routes panels, controls, toggles, table dividers, progress tracks, and insight cards through dashboard tokens and `color-mix`.
  - Coverage lives in `ComparisonAnalytics.themeBridge.test.ts`; the active API path remains `/api/client-progress/:clientId/comparison`.
- Trainer client-progress goal-tracker fallback chrome is now theme-token bridged:
  - Canonical route evidence locks `/dashboard/trainer/client-progress` to `UniversalDashboardLayout` -> `EnhancedClientProgressView` -> `EnhancedClientProgressViewShell` -> `GoalProgressTracker`.
  - `GoalProgressTracker.base.styles.ts`, `GoalProgressTracker.detail.styles.ts`, and `GoalProgressTracker.insight.styles.ts` now route panels, selectors, modal overlay/panel, table rows, chips, progress tracks, achievement cards, and insight surfaces through dashboard tokens and `color-mix`.
  - Coverage lives in `GoalProgressTracker.themeBridge.test.ts`; the active API paths remain `/api/client-progress/:clientId/goals` and `/api/client-progress/:clientId/goals/:goalId`.
- Admin client-progress tracking V2 fallback chrome is now theme-token bridged:
  - Canonical route evidence locks `/dashboard/admin/client-progress-tracking` to `UniversalDashboardLayout` -> `admin-client-progress-view.V2`.
  - `admin-client-progress-view.V2.tsx` now routes skeleton shimmer, header gradient, sidebar/list dividers, tab focus/hover states, avatar fallback gradient, progress bar, scrollbar, and leaderboard footer chrome through dashboard tokens and `color-mix`.
  - Coverage lives in `admin-client-progress-view.V2.themeBridge.test.ts`, with the existing client-id contract still passing; the active API paths remain `/api/client-progress/:userId` and `/api/client-progress/leaderboard`.
- Workout History shell/edit chrome is now theme-token bridged:
  - Canonical route evidence locks `/dashboard/admin/client-management` to `ClientsWorkspace` -> `TrainingTabContent` -> `WorkoutHistoryPanel`; the older `WorkoutHistoryTimeline` remains dormant and was not patched.
  - `WorkoutHistoryPanel.layoutStyles.ts` and `WorkoutHistoryPanel.styles.ts` now route summary bars, tab dividers, loading/error states, retry controls, edit buttons, inputs, error bars, and notes chrome through dashboard tokens and `color-mix`.
  - Coverage lives in `WorkoutHistoryPanel.themeBridge.test.ts`, with extraction/truth contracts still passing; the active read/edit API paths remain `/api/admin/clients/:clientId/workouts`, `/api/analytics/:userId/*`, and `/api/admin/clients/:clientId/workouts/:sessionId`.
- Workout History session/table/share chrome is now theme-token bridged:
  - Same canonical route evidence as the shell/edit slice; `WorkoutHistoryPanel.sessionStyles.ts` is consumed by `WorkoutHistorySessionCard`, `WorkoutHistoryExerciseTable`, `WorkoutHistorySessionFooter`, and `WorkoutHistoryPersonalRecordsTab`.
  - Session cards, table dividers, PR cards/badges, totals dividers, and share controls now route through dashboard tokens and `color-mix` instead of raw alpha palette declarations.
  - Coverage lives in `WorkoutHistoryPanel.sessionStyles.test.ts`, preserving the existing extraction contract while rejecting raw alpha declarations in the active helper.
- Active shared Workout Logger voice-import shell is now theme-token bridged:
  - Canonical route evidence locks the Training tab daily logger to `TrainingTabContent` -> `frontend/src/components/WorkoutLogger/WorkoutLogger.tsx`; `WorkoutLoggerTheme.ts` remains self-contained/dormant and was not patched.
  - `WorkoutLogger.styles.ts` now routes the voice/file import panel surface and helper text through dashboard token fallbacks instead of raw rgba values.
  - Coverage lives in `WorkoutLogger.styleExtraction.test.ts`, alongside the existing shared palette contract in `WorkoutLoggerCS.themeBridge.test.ts`.
- Trainer client-progress state/risk route chrome is now theme-token bridged:
  - Canonical route evidence locks `/dashboard/trainer/client-progress` to `UniversalDashboardLayout` -> `EnhancedClientProgressView` -> `EnhancedClientProgressViewShell`.
  - `EnhancedClientProgressView.styles.ts` and `EnhancedClientProgressViewStatePanels.tsx` now route risk-chip and missing/loading route-state surfaces through dashboard tokens and `color-mix` instead of raw rgba fallbacks.
  - Coverage lives in `EnhancedClientProgressView.themeBridge.test.ts`, alongside the existing truth/list-identity contracts.
- Admin overview Session Tracking widget chrome is now theme-token bridged:
  - Canonical route evidence locks `/dashboard/admin/overview` to `UniversalDashboardLayout` -> `admin-dashboard-view` -> `AdminOverviewPanel` -> `SessionTrackingWidget`.
  - `SessionTrackingWidget.tsx` now routes its icon, stat, rank, progress-bar, muted text, border, and empty/error fallback chrome through dashboard tokens and `color-mix` instead of the shared chart palette helper.
  - Coverage lives in `SessionTrackingWidget.truth.test.tsx`, which also preserves the real `/api/admin/analytics/statistics/workouts` data boundary.
- Admin overview Pending Payments muted chrome is now theme-token bridged:
  - Canonical route evidence locks `/dashboard/admin/overview` to `UniversalDashboardLayout` -> `admin-dashboard-view` -> `AdminOverviewPanel` -> `PendingPaymentsWidget`.
  - `PendingPaymentsWidget.styles.ts` now routes refresh, empty-state, and order-meta muted text through tokenized `color-mix` fallbacks instead of raw rgba fallbacks.
  - Coverage lives in `PendingPaymentsWidget.truth.test.tsx`, preserving the real `/api/orders` pending-payment boundary and 44px action controls.
- Admin overview Business Intelligence muted KPI chrome is now theme-token bridged:
  - Canonical route evidence locks `/dashboard/admin/overview` to `UniversalDashboardLayout` -> `admin-dashboard-view` -> `AdminOverviewPanel` -> `BusinessKPIDashboard`.
  - `BusinessKPIDashboard.styles.ts` now routes muted KPI labels, period tabs, and breakdown labels through tokenized `color-mix` fallbacks instead of raw rgba fallbacks.
  - Coverage lives in `BusinessKPIDashboard.truth.test.tsx`, preserving the real `/api/admin/analytics/business-kpis` boundary and active admin overview mount proof.
- Latest pushed production-lane commits relevant to this backlog: `77b64454f`, `c8991e2d4`, `5d25ac2e6`, `9f8d507e1`, `da231e3f8`, `380a7f5ee`, `3b2a70096`, `bdfb5880d`, `8c3c70bbb`, `22db47283`, `7e9e75622`, `e06c37012`, `91dfcc145`, `051f84415`.

Keep the remaining polish focused on visual hierarchy, mobile ergonomics, and workflow clarity around those now-wired routes.

---

## Backlog Buckets

### 1. Dashboard Information Architecture

- User dashboard should feel like a daily return destination, not only a profile shell.
- Client dashboard should group around journey state: Today, Progress, Plan, History, Recovery/Pain, Community/share.
- Trainer dashboard should group around operational flow: Today, Clients, Log, Review, Plan, Follow-up.
- Admin dashboard should emphasize proof-of-value: who trained, what improved, who is stale, who needs intervention, payments/session risk, and coach actions.
- Reduce duplicate tools that feel like separate apps: Coach Command Center, Clients & Team, Workout Logger, Workout Planner, Bootcamp Builder.

### 2. Client Hub / Training Flow Polish

- Client card should become an at-a-glance command object: source, paid/free status, session balance, last workout, next session, risk/stale status, quick log, quick progress, quick schedule.
- Clients & Team should make "select client -> log workout -> view charts/history" obvious in one or two clicks.
- Training > Plans is now wired as a saved-plan receipt; future polish can improve plan-card hierarchy, active-plan actions, and mobile density without changing the canonical API boundary.
- Dictation and manual form should be equal citizens: voice-first for speed, manual-first for corrections.
- Teach Mode should explain the active surface in plain steps without becoming a documentation dump.
- Any surface too complex for Teach Mode is a candidate for IA simplification.

### 3. Workout Logger / Builder Consolidation

- Workout Logger is the daily execution surface.
- Workout Planner/Builder is the forward-plan authoring surface.
- Shared components should exist for exercise search, exercise cards, NASM phase context, recommendations, and equipment profile selection.
- Avoid two competing "exercise Rolodex" experiences unless each has a distinct job.
- Keep cancel confirmation, PDF export, summary generation, AI command events, and schedule-linked session deduction wired to the canonical logger.

### 3A. Route / Workflow Hygiene Boundary

- Canonical `/api/sessions` is mounted to `backend/routes/sessions.mjs`.
- The older `backend/routes/sessionRoutes.mjs` still exists behind the later `/api` compatibility router in `backend/routes/api.mjs`.
- Do not treat legacy route retirement as visual polish. If Sean asks to clean this up, run a separate route-migration slice with mount-order evidence, endpoint inventory, compatibility tests, and Sean approval before deleting or archiving anything.
- Until that migration exists, broad UI work should use the canonical route receipts already proven for the live surface and avoid touching legacy route files for cosmetic reasons.

### 4. Bootcamp / Group Class Builder

- Support at least three boards: main intensity, joint-friendly alternative, second joint-friendly or low-impact alternative.
- AI generation should use equipment profile, class length, intensity, group size, low-impact constraints, and trainer notes.
- Joint-friendly means low-impact and modification-aware, not random alternatives.
- Hybrid/manual mode must allow adding exercises from the Rolodex without dead controls.
- Board output should be printable/shareable and reusable as a preset.

### 5. Theme Synchronization

- Schedule, Nutrition, Store/Revenue, Bootcamp, Workout Builder, Client Hub, Trainer Dashboard, Client Dashboard, and User Dashboard should consume the same theme tokens.
- No standalone bright-gradient islands unless they intentionally map to the active theme.
- Default visual posture remains dark-first Crystalline Swan.
- Theme QA should include desktop, 1440p/QHD, 4K, tablet, and mobile.
- Current status: Workout Management, audited active Nutrition children, Store/Revenue order summary, Bootcamp Builder controls, several canonical Client Hub surfaces, Universal Dashboard shell controls and shared shell shadow chrome, active admin overview skeleton loading chrome, active admin overview Session Tracking chrome, active admin overview Pending Payments muted chrome, active admin overview Business Intelligence muted KPI chrome, Admin client-progress tracking V2 fallback chrome, Workout History shell/edit chrome, Workout History session/table/share chrome, the Workout Logger shared palette and voice-import shell, the Universal Master Schedule drag preview, the Trainer Home Swan Coach dock, the Trainer Client Progress comparison benchmark bar, the Trainer Client Progress comparison fallback chrome, the Trainer Client Progress mobile quick action dock, the Trainer Client Progress fallback chrome, the Trainer Client Progress state/risk route chrome, the Trainer Client Progress injury-risk panel fallback chrome, the Trainer Client Progress goal-tracker fallback chrome, the Client sidebar workout-progress-first nav chrome, the Client progress proof page/chart grid translucency, and the Client overview workout-progress-first quick actions are covered by targeted contracts.
- Do not call theme synchronization complete yet. Continue with Trainer Dashboard, Client Dashboard, User Dashboard, Universal Master Schedule, and remaining admin widgets.

### 5A. Evidence-Backed Theme / Redesign Churn Still Parked

These are scan-backed candidates, not permission to patch everything at once. Each next slice still needs a Canonical Surface Receipt, a narrow failing contract or visual QA criterion, a surgical patch, and a hostile review.

- Trainer Client Progress:
  - `frontend/src/components/TrainerDashboard/ClientProgress/EnhancedClientProgressView.tsx` still has hardcoded light text, hardcoded tab borders, and raw shadow colors.
  - This is high value because trainer progress review is directly tied to the core workout-progress loop.
- Trainer Home:
  - `SwanCoachDockTrainer.tsx` is handled for the active `/dashboard/trainer/overview` route.
  - `TrainerOverviewPage.tsx` appears legacy because `TrainerHomeTab` is the mounted overview component; do not patch it as active trainer work without fresh route proof.
- Trainer Analytics:
  - `frontend/src/components/TrainerDashboard/ClientProgress/Analytics/InjuryRiskAssessment.tsx`, `GoalProgressTracker.tsx`, and `ComparisonAnalytics.tsx` still show raw colors/shadows in scans; the active `ComparisonAnalyticsView.tsx` benchmark bar is handled separately.
  - Patch only after confirming which analytics panels are mounted in the current Trainer Dashboard route.
- Workout Logger:
  - `frontend/src/components/WorkoutLogger/WorkoutLoggerCS.ts` is now handled for the active shared logger palette.
  - `frontend/src/components/WorkoutLogger/WorkoutLoggerTheme.ts` and `NASMProtocolSection.tsx` still show raw gradient, shadow, and accent literals.
  - `NASMProtocolSection.tsx` is not imported by the current `WorkoutLogger.tsx` route based on existing protocol-section tests; do not patch it as active daily-logger work without fresh mount proof.
  - Treat this as daily-use polish plus regression protection because Workout Logger is the execution surface.
- Admin widgets:
  - `PaymentSettingsPanel.tsx`, `UsersManagementSection.tsx`, and `TopTrainersWidget.tsx` still show raw colors/gradients/shadows.
  - `WidgetSkeleton.tsx` is handled for active admin overview loading states; do not reselect it as a broad-polish candidate.
  - Keep payment/session correctness ahead of visual-only widget polish.
- Universal Master Schedule:
  - Schedule theme bridge tests already exist in the schedule area, but Sean has specifically reported schedule theme drift.
  - The active drag preview path through `ScheduleCalendar` -> `DragDropManager` is handled.
  - `CalendarFallback` and `UniversalMasterSchedule/SessionAllocationManager.tsx` appear non-canonical from the latest route scan; do not patch either as active schedule work without fresh mount proof.
  - Next schedule pass should inspect active mounted cards/modals only after a Canonical Surface Receipt.
- Legacy admin-client surfaces:
  - `frontend/src/components/DashBoard/Pages/admin-clients/*` still contains older hardcoded colors and legacy workout modal code.
  - Do not patch these as canonical Client Hub work unless the route tree proves they are mounted.
- Mock/data-truth candidates:
  - `frontend/src/components/WorkoutManagement/ClientSelection.tsx` still has comments and fixtures referencing mock clients.
  - Any mock cleanup is a data-truth slice, not a visual-polish slice, and needs API ownership evidence before code changes.

### 6. User Dashboard Media / Header System

- Treat the current banner/collage/carousel work as a separate creative polish lane.
- Preserve the functional options already explored: single image, fit/crop/stretch/tile, collage, carousel variants, sticky mini carousel, presets, and video support.
- Future polish should remove dead space, make media flush and responsive, preserve full image visibility when requested, and keep profile/tier/feed content below the banner.
- Do not let media controls overlap tier/badge/profile content.

### 7. Feed / Social Creation Flow

- Simplify post creation around the primary Swan loops: workout share, transformation, achievement, challenge, and general community post.
- AI can infer secondary labels such as art, gaming, music, comedy, dance, and singing from text/media.
- Hashtags should be encouraged and made visible because hashtag feeds exist.
- Do not cover media with duplicate badges; place achievement/post-type identity in the text/action area.
- Achievement icons need tap/click details explaining what was earned and why.

### 8. Analytics / Progress Presentation

- Build a mega exercise-history board inspired by game stat pages: most-performed movements, least-performed movements, PRs, volume, consistency, and trends.
- Victory charts only for new chart work.
- Charts must read from real workout logs and session records, not mock progress data.
- Every chart needs a "what this means" and "what to do next" path without wordy UI.

### 9. Mobile-First Daily Use

- The trainer/admin mobile path should support real gym-floor use: open phone, select client, log sets, save, show progress.
- Keep touch targets at 44px minimum.
- Avoid dense desktop-only tables for daily workflows.
- Responsive QA must include 390, 414, 768, 1440, 1920, 2560x1440, and 3840x2160 where visual changes are substantial.

### 10. Later Creative / World-Building Ideas

- Premium achievement theater, milestone reels, stronger XP/streak presentation, creator-style progress diaries, and future "world" concepts belong after the core workout/session/business loop is stable.
- Do not let later gamification work obscure the trainer-led personal training product.

### 11. Backend / Command-Lane Technical Debt To Keep Separate

- `backend/services/ai/commandDispatcher.mjs` remains a large legacy dispatcher file. Do not mix broad UI polish with extraction work.
- If Sean asks to clean it up, run a dedicated extraction slice:
  - start with command registry and dispatcher ownership evidence.
  - move one cohesive command family at a time into `backend/services/ai/dispatchers/`.
  - preserve existing tests, add focused contract tests, and run backend full test before push.
- Do not treat extraction as visual redesign; it is production hardening and maintainability work.

---

## How To Resume

When Sean says to resume broad polish, start with this prompt:

> Resume `SWANSTUDIOS-BROAD-REDESIGN-POLISH-BACKLOG-2026-06-01.md`. Pick one narrow visible surface, produce a Canonical Surface Receipt, run the Swan design strategy gate, write failing tests or visual QA criteria first, implement surgically, run hostile review, verify responsive behavior, then update this backlog with what moved from planned to done.

---

## Current Non-Goals

- Do not redesign the entire app in one pass.
- Do not replace working API routes just to clean up UI.
- Do not add new visual systems that bypass Crystalline Swan theme tokens.
- Do not delete dormant or legacy files without the repo hygiene protocol and Sean approval.

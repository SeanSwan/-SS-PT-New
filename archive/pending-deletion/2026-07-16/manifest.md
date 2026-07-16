# Confirmed Unused Archive - 2026-07-16

Status: archive-only historical record pending a later deletion decision.

Sean explicitly authorized archiving unused files during the whole-site pre-launch audit. Each entry below was moved with its original repository path preserved. No file was deleted.

## Validation performed before the move

- Fallow classified each source as unreachable from the active runtime graph.
- Repo-wide import and dynamic-import searches found no consumer.
- Route, package-script, and launcher searches found no mount or executable entry point.
- Active frontend counterparts were confirmed for the misplaced React files.
- The legacy business-intelligence service has no importer; the mounted `/api/admin/business-intelligence/metrics` handler is owned by `backend/routes/adminEnterpriseRoutes.mjs`.

## Archived files

| Original path | Archived path | Classification |
| --- | --- | --- |
| `backend/Message.tsx` | `archive/pending-deletion/2026-07-16/backend/Message.tsx` | misplaced orphaned React component |
| `backend/MessageInput.tsx` | `archive/pending-deletion/2026-07-16/backend/MessageInput.tsx` | misplaced orphaned React component |
| `backend/SocketContext.tsx` | `archive/pending-deletion/2026-07-16/backend/SocketContext.tsx` | misplaced orphaned React context |
| `backend/core/NewConversationModal.tsx` | `archive/pending-deletion/2026-07-16/backend/core/NewConversationModal.tsx` | misplaced orphaned React component |
| `backend/routes/ClientActivityWidget.tsx` | `archive/pending-deletion/2026-07-16/backend/routes/ClientActivityWidget.tsx` | misplaced orphaned dashboard widget |
| `backend/routes/HighRiskClientsWidget.tsx` | `archive/pending-deletion/2026-07-16/backend/routes/HighRiskClientsWidget.tsx` | misplaced orphaned dashboard widget |
| `backend/routes/TopTrainersWidget.tsx` | `archive/pending-deletion/2026-07-16/backend/routes/TopTrainersWidget.tsx` | misplaced orphaned dashboard widget |
| `backend/services/analytics/BusinessIntelligenceService.mjs` | `archive/pending-deletion/2026-07-16/backend/services/analytics/BusinessIntelligenceService.mjs` | unmounted legacy service superseded by route-local database aggregators |
| `scripts/utilities/VIDEO-REFERENCE-EXAMPLES.jsx` | `archive/pending-deletion/2026-07-16/scripts/utilities/VIDEO-REFERENCE-EXAMPLES.jsx` | unlaunched historical code example |
| `frontend/src/components/DashBoard/Pages/admin-clients/AdminClientManagementView.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/DashBoard/Pages/admin-clients/AdminClientManagementView.tsx` | dormant V1 surface; canonical client management mounts `ClientsWorkspace` |
| `frontend/src/components/DashBoard/Pages/admin-client-progress/admin-client-progress-view.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/DashBoard/Pages/admin-client-progress/admin-client-progress-view.tsx` | dormant V1 surface; canonical progress route mounts V2 |
| `frontend/src/components/DialogD/dialog-description.component.jsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/DialogD/dialog-description.component.jsx` | unused incomplete component with undefined runtime identifiers |
| `frontend/src/components/ImageSlider/ImageSlider.component.jsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/ImageSlider/ImageSlider.component.jsx` | unused duplicate image slider |
| `frontend/src/pages/about/ImageSlider.component.jsx` | `archive/pending-deletion/2026-07-16/frontend/src/pages/about/ImageSlider.component.jsx` | unused duplicate image slider |
| `frontend/src/image-slider/imageslider.component.jsx` | `archive/pending-deletion/2026-07-16/frontend/src/image-slider/imageslider.component.jsx` | unused duplicate image slider |
| `frontend/src/components/ObjectDetection/ObjectDetection.component.jsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/ObjectDetection/ObjectDetection.component.jsx` | unused experimental object-detection surface |
| `frontend/src/components/common/ConstructionBanner.integration.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/common/ConstructionBanner.integration.tsx` | unused integration example with invalid standalone identifiers |
| `frontend/src/components/SessionDashboard/AdminSessionManager.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/SessionDashboard/AdminSessionManager.tsx` | unused legacy admin session surface |
| `frontend/src/components/SessionDashboard/FloatingSessionWidget.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/SessionDashboard/FloatingSessionWidget.tsx` | unused legacy session widget |
| `frontend/src/components/SessionDashboard/SessionDashboard.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/SessionDashboard/SessionDashboard.tsx` | unused legacy client session surface |
| `frontend/src/components/SessionDashboard/SessionDashboardIntegration.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/SessionDashboard/SessionDashboardIntegration.tsx` | unused legacy integration root |
| `frontend/src/components/SessionDashboard/SessionErrorBoundary.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/SessionDashboard/SessionErrorBoundary.tsx` | dependency used only by the archived legacy tree |
| `frontend/src/components/SessionDashboard/SessionErrorBoundary.truth.test.ts` | `archive/pending-deletion/2026-07-16/frontend/src/components/SessionDashboard/SessionErrorBoundary.truth.test.ts` | source-contract test for archived code |
| `frontend/src/components/SessionDashboard/TrainerClientSessions.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/SessionDashboard/TrainerClientSessions.tsx` | unused legacy trainer session surface |
| `frontend/src/components/SessionDashboard/index.ts` | `archive/pending-deletion/2026-07-16/frontend/src/components/SessionDashboard/index.ts` | unused barrel for archived tree |
| `frontend/src/components/SessionLogging/SessionLogButton.jsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/SessionLogging/SessionLogButton.jsx` | unused legacy voice-logger launcher |
| `frontend/src/components/SessionLogging/SessionLogService.js` | `archive/pending-deletion/2026-07-16/frontend/src/components/SessionLogging/SessionLogService.js` | dependency used only by archived voice logger |
| `frontend/src/components/SessionLogging/VoiceSessionLogger.jsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/SessionLogging/VoiceSessionLogger.jsx` | unused legacy voice-logger surface |
| `frontend/src/utils/hooksRecovery.js` | `archive/pending-deletion/2026-07-16/frontend/src/utils/hooksRecovery.js` | disabled unimported emergency bypass script |
| `frontend/src/components/BadgeGallery/BadgeArtGallery.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/BadgeGallery/BadgeArtGallery.tsx` | unmounted standalone badge-art browser |
| `frontend/src/components/SkeletonLoaders/BadgeGridSkeleton.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/SkeletonLoaders/BadgeGridSkeleton.tsx` | unconsumed duplicate skeleton |
| `frontend/src/components/SkeletonLoaders/FeedSkeleton.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/SkeletonLoaders/FeedSkeleton.tsx` | unconsumed duplicate skeleton |
| `frontend/src/components/SkeletonLoaders/ProfileSkeleton.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/SkeletonLoaders/ProfileSkeleton.tsx` | unconsumed duplicate skeleton |
| `frontend/src/components/SkeletonLoaders/index.ts` | `archive/pending-deletion/2026-07-16/frontend/src/components/SkeletonLoaders/index.ts` | unused barrel for duplicate skeletons |
| `frontend/src/TestApp.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/TestApp.tsx` | unlaunched blank-page diagnostic application |
| `frontend/src/routes/test-routes.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/routes/test-routes.tsx` | dormant route tree used only by archived TestApp |
| `frontend/src/components/Layout/test-layout.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/Layout/test-layout.tsx` | layout used only by archived test route tree |
| `frontend/src/pages/HomePage/components/HomePage.component.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/pages/HomePage/components/HomePage.component.tsx` | legacy homepage used only by dormant test route |
| `frontend/src/pages/HomePage/components/HomePage.V2.component.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/pages/HomePage/components/HomePage.V2.component.tsx` | unmounted legacy homepage V2 |
| `frontend/src/components/InstagramFeed/InstagramFeed.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/InstagramFeed/InstagramFeed.tsx` | dependency used only by archived legacy homepages |
| `frontend/src/components/DashBoard/Pages/content-studio/SocialDistributionPanel.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/DashBoard/Pages/content-studio/SocialDistributionPanel.tsx` | dormant social panel with unmatched backend endpoints |
| `frontend/src/components/DashBoard/Pages/content-studio/ContentStudioSettings.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/DashBoard/Pages/content-studio/ContentStudioSettings.tsx` | dormant settings panel excluded by canonical hub contract |
| `frontend/stripe-diagnostic.js` | `archive/pending-deletion/2026-07-16/frontend/stripe-diagnostic.js` | unlaunched one-off Stripe diagnostic |
| `frontend/test-build-fix.js` | `archive/pending-deletion/2026-07-16/frontend/test-build-fix.js` | unlaunched one-off build-fix script |
| `frontend/test-fixes/alchemist-validation.js` | `archive/pending-deletion/2026-07-16/frontend/test-fixes/alchemist-validation.js` | unlaunched historical validation script |
| `frontend/test-fixes/validate-runtime-fixes.js` | `archive/pending-deletion/2026-07-16/frontend/test-fixes/validate-runtime-fixes.js` | unlaunched historical validation script |

The 57-file legacy admin-client archive has an exact companion inventory at `legacy-admin-client-surface-manifest.md`.

## Restore procedure

Restore only after proving a real consumer and repairing the file for its intended runtime. Move the archived file back to its original path, add the missing import or launcher, and rerun the relevant typecheck, build, tests, lint, and route smoke.

## Destructive follow-up

These files remain recoverable. Permanent deletion requires a separate final reference check and Sean's explicit approval.

The 30-file dormant dashboard-island archive has an exact companion inventory at `dormant-dashboard-islands-manifest.md`.

The two-file dormant workout state island has an exact companion inventory at `dormant-workout-state-island-manifest.md`.

The 30-file legacy Advanced Gamification island has an exact companion inventory at `legacy-advanced-gamification-manifest.md`.

## Legacy About V1 island

| Original path | Archived path | Classification |
| --- | --- | --- |
| `frontend/src/pages/about/About.jsx` | `archive/pending-deletion/2026-07-16/frontend/src/pages/about/About.jsx` | unmounted legacy About root |
| `frontend/src/pages/about/Hero.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/pages/about/Hero.tsx` | dependency used only by legacy About root |
| `frontend/src/pages/about/AboutContent.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/pages/about/AboutContent.tsx` | dependency used only by legacy About root |
| `frontend/src/pages/about/FixedTestimonialSection.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/pages/about/FixedTestimonialSection.tsx` | dependency used only by legacy About root |
| `frontend/src/pages/about/TestimonialSection.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/pages/about/TestimonialSection.tsx` | unmounted alternate legacy testimonial surface |
| `frontend/src/pages/about/Testimonial.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/pages/about/Testimonial.tsx` | dependency used only by archived testimonial surfaces |
| `frontend/src/pages/about/ImageCarousel.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/pages/about/ImageCarousel.tsx` | unconsumed legacy image carousel |
| `frontend/src/pages/about/layout.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/pages/about/layout.tsx` | unconsumed legacy layout helper |

The mounted `/about` route still loads `About.V4.tsx` with `About.V3.tsx` as its explicit lazy-load fallback.

## Dormant FitnessStats island

| Original path | Archived path | Classification |
| --- | --- | --- |
| `frontend/src/components/FitnessStats/FitnessStats.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/FitnessStats/FitnessStats.tsx` | unmounted legacy homepage stats surface |
| `frontend/src/components/FitnessStats/SyncStatus.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/FitnessStats/SyncStatus.tsx` | unconsumed sync widget |
| `frontend/src/components/FitnessStats/SyncNotification.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/FitnessStats/SyncNotification.tsx` | unconsumed sync widget |
| `frontend/src/components/FitnessStats/charts/BarProgressChart.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/FitnessStats/charts/BarProgressChart.tsx` | unconsumed chart |
| `frontend/src/components/FitnessStats/charts/RadarProgressChart.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/FitnessStats/charts/RadarProgressChart.tsx` | unconsumed chart |

`ProgressAreaChart.tsx` remains active and in place because trainer progress analytics imports it directly.

The 55-file dormant Chart Gallery island has an exact companion inventory at `legacy-chart-gallery-manifest.md`.

The 12-file superseded public-root and dashboard-menu archive has an exact companion inventory at `legacy-public-roots-manifest.md`.

The 21-file legacy social-root and orphan-island archive has an exact companion inventory at `legacy-social-islands-manifest.md`.

The 42-file retired full Social Feed island has an exact companion inventory at `retired-social-feed-island-manifest.md`.

The 23-file dormant Homepage Design Lab archive has an exact companion inventory at `homepage-design-lab-manifest.md`.

The 11-file orphaned frontend-root and pseudo-integration archive has an exact companion inventory at `orphaned-frontend-roots-manifest.md`.

## Retired palette component

| Original path | Archived path | Classification |
| --- | --- | --- |
| `frontend/src/components/ui/SwanGalaxyLuxuryButton.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/ui/SwanGalaxyLuxuryButton.tsx` | unconsumed component built around retired Galaxy-Swan palette |

Its unused barrel export was removed from `components/ui/index.ts`.

The 12-file legacy nested Workout Planner archive has an exact companion inventory at `legacy-nested-workout-planner-manifest.md`.

The seven-file legacy Messaging archive has an exact companion inventory at `legacy-messaging-island-manifest.md`.

The 23-file orphaned frontend utilities and modals archive has an exact companion inventory at `orphaned-frontend-utilities-manifest.md`.

## Dormant diagnostic and emergency scripts

| Original path | Archived path | Classification |
| --- | --- | --- |
| `frontend/dev-auth-reset.js` | `archive/pending-deletion/2026-07-16/frontend/dev-auth-reset.js` | unlaunched development auth-reset instructions that generated mock credentials |
| `frontend/emergency-fixes/admin-dashboard-emergency-fix.js` | `archive/pending-deletion/2026-07-16/frontend/emergency-fixes/admin-dashboard-emergency-fix.js` | unlaunched browser-console emergency script with stale endpoints and raw token access |
| `frontend/emergency-fixes/enhanced-use-toast.ts` | `archive/pending-deletion/2026-07-16/frontend/emergency-fixes/enhanced-use-toast.ts` | unconsumed alternate toast implementation |
| `frontend/production-proxy-test.js` | `archive/pending-deletion/2026-07-16/frontend/production-proxy-test.js` | unlaunched historical production proxy console test |
| `frontend/test-proxy-detection.js` | `archive/pending-deletion/2026-07-16/frontend/test-proxy-detection.js` | unlaunched duplicate proxy detection console test |

## Fallow-proven unreachable diagnostic and backup modules

| Original path | Archived path | Classification |
| --- | --- | --- |
| `frontend/src/components/UniversalMasterSchedule/hooks/useCalendarData-SAFE-BACKUP.ts` | `archive/pending-deletion/2026-07-16/frontend/src/components/UniversalMasterSchedule/hooks/useCalendarData-SAFE-BACKUP.ts` | unreachable backup hook superseded by the active calendar-data hook |
| `frontend/src/utils/stripeDiagnostic.ts` | `archive/pending-deletion/2026-07-16/frontend/src/utils/stripeDiagnostic.ts` | unreachable browser-only Stripe diagnostic |
| `frontend/src/utils/debugHelpers.ts` | `archive/pending-deletion/2026-07-16/frontend/src/utils/debugHelpers.ts` | unreachable multi-dashboard debug helper |

## Fallow-proven unreachable schedule sub-island

The 23-file closed Universal Master Schedule analytics/hooks/fallback/alternate-integration archive has an exact companion inventory at `legacy-schedule-extras-manifest.md`.

## Legacy checkout-success leftovers

The three-file callerless legacy checkout-success archive has an exact companion inventory at `legacy-checkout-success-manifest.md`.

## Duplicate menu-state context

| Original path | Archived path | Classification |
| --- | --- | --- |
| `frontend/src/context/MenuStateContext.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/context/MenuStateContext.tsx` | Fallow-unreachable duplicate of the App-mounted hooks provider |

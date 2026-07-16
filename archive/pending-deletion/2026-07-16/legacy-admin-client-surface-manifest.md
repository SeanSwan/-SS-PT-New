# Legacy Admin Client Surface Archive

Status: archive-only historical record pending a later deletion decision.

## Canonical surface receipt

- `/dashboard/admin/client-management` is registered to `ClientsWorkspace` at `frontend/src/components/DashBoard/UniversalDashboardLayout.routes.tsx:108`.
- `ClientsWorkspace` is lazily imported at `frontend/src/components/DashBoard/UniversalDashboardLayout.routeComponents.tsx:93`.
- Registered components are rendered into mounted routes at `frontend/src/components/DashBoard/UniversalDashboardLayout.shellPieces.tsx:95-106`.
- `AdminClientManagementView.tsx` and `EnhancedAdminClientManagementView.tsx` had no runtime importer and were classified unused by the fresh production Fallow graph.

## Archive scope

This manifest covers 40 unused legacy source files and 17 tests that exercised only those dormant files. The canonical Client Hub, onboarding route, admin view-as route, workout-history modules, and `workspaces/clients-team/` tree remain active and were not moved.

Four active source-contract tests were narrowed only where they read the archived legacy tree. Their canonical service, image-safety, branded-confirmation, and ExerciseAutocomplete token assertions remain.

## Exact archived paths

- `frontend/src/components/DashBoard/Pages/admin-clients/AdminClientManagementView.tsx`
- `frontend/src/components/DashBoard/Pages/admin-clients/AdminClientsSummary.tsx`
- `frontend/src/components/DashBoard/Pages/admin-clients/ClientManagementDashboard.tsx`
- `frontend/src/components/DashBoard/Pages/admin-clients/components/AddSessionsDialog.tsx`
- `frontend/src/components/DashBoard/Pages/admin-clients/components/AdminOnboardingPanel.confirmationContract.test.ts`
- `frontend/src/components/DashBoard/Pages/admin-clients/components/AdminOnboardingPanel.tsx`
- `frontend/src/components/DashBoard/Pages/admin-clients/components/AdminOnboardingResetConfirmDialog.tsx`
- `frontend/src/components/DashBoard/Pages/admin-clients/components/AdminViewAsBar.tsx`
- `frontend/src/components/DashBoard/Pages/admin-clients/components/AIInsightsPanel.truth.test.ts`
- `frontend/src/components/DashBoard/Pages/admin-clients/components/AIInsightsPanel.tsx`
- `frontend/src/components/DashBoard/Pages/admin-clients/components/ApplyPaymentDialog.tsx`
- `frontend/src/components/DashBoard/Pages/admin-clients/components/BillingSessionsCard.clientSourcePolicy.test.ts`
- `frontend/src/components/DashBoard/Pages/admin-clients/components/BillingSessionsCard.tsx`
- `frontend/src/components/DashBoard/Pages/admin-clients/components/BookSessionDialog.tsx`
- `frontend/src/components/DashBoard/Pages/admin-clients/components/BulkActionDialog.tsx`
- `frontend/src/components/DashBoard/Pages/admin-clients/components/ClientAnalyticsOverview.tsx`
- `frontend/src/components/DashBoard/Pages/admin-clients/components/ClientAnalyticsPanel.truth.test.ts`
- `frontend/src/components/DashBoard/Pages/admin-clients/components/ClientAnalyticsPanel.tsx`
- `frontend/src/components/DashBoard/Pages/admin-clients/components/ClientAssessmentModal.tsx`
- `frontend/src/components/DashBoard/Pages/admin-clients/components/ClientBodyMapModal.tsx`
- `frontend/src/components/DashBoard/Pages/admin-clients/components/ClientDetailsModal.clientSourcePolicy.test.ts`
- `frontend/src/components/DashBoard/Pages/admin-clients/components/ClientDetailsModal.tsx`
- `frontend/src/components/DashBoard/Pages/admin-clients/components/ClientDetailsPanel.clientSourcePolicy.test.ts`
- `frontend/src/components/DashBoard/Pages/admin-clients/components/ClientDetailsPanel.tsx`
- `frontend/src/components/DashBoard/Pages/admin-clients/components/ClientMeasurementPanel.themeContract.test.ts`
- `frontend/src/components/DashBoard/Pages/admin-clients/components/ClientMeasurementPanel.tsx`
- `frontend/src/components/DashBoard/Pages/admin-clients/components/ClientPlanGenToggle.test.tsx`
- `frontend/src/components/DashBoard/Pages/admin-clients/components/ClientPlanGenToggle.tsx`
- `frontend/src/components/DashBoard/Pages/admin-clients/components/ClientPostsModal.tsx`
- `frontend/src/components/DashBoard/Pages/admin-clients/components/ClientProgressDashboard.truth.test.ts`
- `frontend/src/components/DashBoard/Pages/admin-clients/components/ClientProgressDashboard.tsx`
- `frontend/src/components/DashBoard/Pages/admin-clients/components/ClientSessionsModal.tsx`
- `frontend/src/components/DashBoard/Pages/admin-clients/components/ClientWeighInPanel.tsx`
- `frontend/src/components/DashBoard/Pages/admin-clients/components/ClientWorkoutsModal.tsx`
- `frontend/src/components/DashBoard/Pages/admin-clients/components/CommunicationCenter.truth.test.ts`
- `frontend/src/components/DashBoard/Pages/admin-clients/components/CommunicationCenter.tsx`
- `frontend/src/components/DashBoard/Pages/admin-clients/components/ExerciseEntryCard.tsx`
- `frontend/src/components/DashBoard/Pages/admin-clients/components/GamificationOverview.truth.test.ts`
- `frontend/src/components/DashBoard/Pages/admin-clients/components/GamificationOverview.tsx`
- `frontend/src/components/DashBoard/Pages/admin-clients/components/HermesCoachReviewQueue.styles.ts`
- `frontend/src/components/DashBoard/Pages/admin-clients/components/HermesCoachReviewQueue.tsx`
- `frontend/src/components/DashBoard/Pages/admin-clients/components/NASMAnalyticsCharts.tsx`
- `frontend/src/components/DashBoard/Pages/admin-clients/components/NutritionSummaryWidget.tsx`
- `frontend/src/components/DashBoard/Pages/admin-clients/components/useCommunicationVoiceDraft.test.tsx`
- `frontend/src/components/DashBoard/Pages/admin-clients/components/useCommunicationVoiceDraft.ts`
- `frontend/src/components/DashBoard/Pages/admin-clients/components/workoutChartsSanitizers.test.ts`
- `frontend/src/components/DashBoard/Pages/admin-clients/components/workoutChartsSanitizers.ts`
- `frontend/src/components/DashBoard/Pages/admin-clients/components/WorkoutChartsTab.tsx`
- `frontend/src/components/DashBoard/Pages/admin-clients/components/WorkoutLoggerModal.tsx`
- `frontend/src/components/DashBoard/Pages/admin-clients/components/WorkoutLoggerStyles.ts`
- `frontend/src/components/DashBoard/Pages/admin-clients/EnhancedAdminClientManagementView.alertContract.test.ts`
- `frontend/src/components/DashBoard/Pages/admin-clients/EnhancedAdminClientManagementView.clientSourcePolicy.test.ts`
- `frontend/src/components/DashBoard/Pages/admin-clients/EnhancedAdminClientManagementView.filterControls.test.ts`
- `frontend/src/components/DashBoard/Pages/admin-clients/EnhancedAdminClientManagementView.logic.test.ts`
- `frontend/src/components/DashBoard/Pages/admin-clients/EnhancedAdminClientManagementView.logic.ts`
- `frontend/src/components/DashBoard/Pages/admin-clients/EnhancedAdminClientManagementView.tsx`
- `frontend/src/components/DashBoard/Pages/admin-clients/hooks/useClientActions.ts`

Restore a file only after proving a real mounted consumer, then rerun typecheck, build, focused tests, full tests, lint, and route smoke. Permanent deletion still requires a final reference check and Sean approval.

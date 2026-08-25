---
decision: Ordered strangler backlog for migrating legacy GlowButton/GlacialInput/VaultDrawer consumers to @swan/forge — GENERATED from drift-lint R4 findings, ordered by risk tier
status: open
supersedes: none
---

# Forge Strangler Backlog (generated 2026-08-25 from `drift-lint --consumer frontend/src`)

**Law (Rule 84):** one component per strangler PR, in tier order (T1 public first → T4 money path last). T0 rows are tests/fixtures/unused surfaces — retire with their parent or leave; they are not migration targets. **Regenerate, never hand-edit:** `node packages/swan-forge/scripts/drift-lint.mjs --consumer frontend/src | grep '^\[R4\]' | node <gen-backlog.mjs>`. Each PR = Push-1.5 class (own receipt: Rule 26 mount proof, computed-style parity on the surface, rollback = revert).

**Done:** `frontend/src/pages/HomePage/components/sections/GolfSection.tsx` (Phase 1.5, `e16a68085`).

## T0 tests / fixtures / unused — retire or leave, do not migrate — 1 import site(s)

| # | file | line | legacy | Forge replacement |
|---|---|---|---|---|
| 1 | `frontend/src/components/ui/buttons/GlowButton.lensTone.test.tsx` | 10 | GlowButton | ForgeButton binding |

## T1 public / marketing — FIRST (same risk class as the Phase 1.5 proof) — 27 import site(s)

| # | file | line | legacy | Forge replacement |
|---|---|---|---|---|
| 1 | `frontend/src/components/FeaturesSection/FeaturesSection.tsx` | 13 | GlowButton | ForgeButton binding |
| 2 | `frontend/src/components/HeroSection/HeroSection.tsx` | 9 | GlowButton | ForgeButton binding |
| 3 | `frontend/src/components/ParallaxSection/ParallaxSection.tsx` | 5 | GlowButton | ForgeButton binding |
| 4 | `frontend/src/components/UniversalMasterSchedule/components/ScheduleBookingModal.tsx` | 14 | GlowButton | ForgeButton binding |
| 5 | `frontend/src/components/UniversalMasterSchedule/components/ScheduleCreateSessionModal.tsx` | 20 | GlowButton | ForgeButton binding |
| 6 | `frontend/src/components/UniversalMasterSchedule/components/ScheduleHeader.tsx` | 10 | GlowButton | ForgeButton binding |
| 7 | `frontend/src/components/UniversalMasterSchedule/SessionDetailFooterActions.tsx` | 8 | GlowButton | ForgeButton binding |
| 8 | `frontend/src/components/UniversalMasterSchedule/SessionDetailInfoGrid.tsx` | 4 | GlowButton | ForgeButton binding |
| 9 | `frontend/src/components/UniversalMasterSchedule/SessionDetailModal.feedbackStyles.ts` | 2 | GlowButton | ForgeButton binding |
| 10 | `frontend/src/components/UniversalMasterSchedule/SessionDetailModal.lateCancelStyles.ts` | 2 | GlowButton | ForgeButton binding |
| 11 | `frontend/src/components/UniversalMasterSchedule/SessionDetailSeriesCallout.tsx` | 8 | GlowButton | ForgeButton binding |
| 12 | `frontend/src/components/UniversalMasterSchedule/SessionEditModal.tsx` | 9 | GlowButton | ForgeButton binding |
| 13 | `frontend/src/pages/about/About.V3.tsx` | 22 | GlowButton | ForgeButton binding |
| 14 | `frontend/src/pages/about/components/sections/CTASection.tsx` | 8 | GlowButton | ForgeButton binding |
| 15 | `frontend/src/pages/about/components/sections/HeroSection.tsx` | 8 | GlowButton | ForgeButton binding |
| 16 | `frontend/src/pages/DesignPlayground/concepts/EtherealWilderness/EtherealWildernessHomepage.tsx` | 7 | GlowButton | ForgeButton binding |
| 17 | `frontend/src/pages/HomePage/components/Hero-Section.V2.tsx` | 6 | GlowButton | ForgeButton binding |
| 18 | `frontend/src/pages/HomePage/components/HomePage.V3.tsx` | 14 | GlowButton | ForgeButton binding |
| 19 | `frontend/src/pages/HomePage/components/ProgramsOverview.V3.tsx` | 6 | GlowButton | ForgeButton binding |
| 20 | `frontend/src/pages/HomePage/components/sections/AboutSection.tsx` | 21 | GlowButton | ForgeButton binding |
| 21 | `frontend/src/pages/HomePage/components/sections/CTASection.tsx` | 6 | GlowButton | ForgeButton binding |
| 22 | `frontend/src/pages/HomePage/components/sections/HeroSection.tsx` | 15 | GlowButton | ForgeButton binding |
| 23 | `frontend/src/pages/HomePage/components/sections/ProgramsSection.tsx` | 13 | GlowButton | ForgeButton binding |
| 24 | `frontend/src/pages/HomePage/components/sections/SocialSection.tsx` | 16 | GlowButton | ForgeButton binding |
| 25 | `frontend/src/pages/OptimizedSignupModal.tsx` | 15 | GlowButton | ForgeButton binding |
| 26 | `frontend/src/pages/PublicWaiverPage.V2.tsx` | 36 | GlowButton | ForgeButton binding |
| 27 | `frontend/src/styles/swan-theme-utils.tsx` | 13 | GlowButton | ForgeButton binding |

## T2 dashboards (authenticated) — 6 import site(s)

| # | file | line | legacy | Forge replacement |
|---|---|---|---|---|
| 1 | `frontend/src/components/DashBoard/Pages/user-management/modern-user-management.tsx` | 4 | GlowButton | ForgeButton binding |
| 2 | `frontend/src/components/TrainerDashboard/ClientManagement/MyClientsView.sections.tsx` | 19 | GlowButton | ForgeButton binding |
| 3 | `frontend/src/components/TrainerDashboard/ClientManagement/MyClientsView.tsx` | 46 | GlowButton | ForgeButton binding |
| 4 | `frontend/src/components/TrainerDashboard/ClientManagement/MyClientsViewWithFallback.tsx` | 15 | GlowButton | ForgeButton binding |
| 5 | `frontend/src/components/TrainerDashboard/WorkoutLogging/EnhancedWorkoutLogger.view.tsx` | 10 | GlowButton | ForgeButton binding |
| 6 | `frontend/src/pages/HomePage/components/sections/TrainersSection.tsx` | 21 | GlowButton | ForgeButton binding |

## T3 admin surfaces — 13 import site(s)

| # | file | line | legacy | Forge replacement |
|---|---|---|---|---|
| 1 | `frontend/src/components/Admin/CreateExerciseWizard.tsx` | 3 | GlowButton | ForgeButton binding |
| 2 | `frontend/src/components/DashBoard/Pages/admin-dashboard/MeasurementEntryFormPanel.tsx` | 19 | GlowButton | ForgeButton binding |
| 3 | `frontend/src/components/DashBoard/Pages/admin-onboarding/UnifiedOnboardingWizard.tsx` | 4 | GlowButton | ForgeButton binding |
| 4 | `frontend/src/components/DashBoard/Pages/admin-packages/admin-packages-view.dialogs.tsx` | 9 | GlowButton | ForgeButton binding |
| 5 | `frontend/src/components/DashBoard/Pages/admin-packages/admin-packages-view.tsx` | 7 | GlowButton | ForgeButton binding |
| 6 | `frontend/src/components/DashBoard/Pages/admin-sessions/AdminSessionsAddSessionsDialog.tsx` | 3 | GlowButton | ForgeButton binding |
| 7 | `frontend/src/components/DashBoard/Pages/admin-sessions/AdminSessionsDeleteDialogs.tsx` | 3 | GlowButton | ForgeButton binding |
| 8 | `frontend/src/components/DashBoard/Pages/admin-sessions/AdminSessionsEditSessionDialog.tsx` | 3 | GlowButton | ForgeButton binding |
| 9 | `frontend/src/components/DashBoard/Pages/admin-sessions/AdminSessionsMainCard.tsx` | 8 | GlowButton | ForgeButton binding |
| 10 | `frontend/src/components/DashBoard/Pages/admin-sessions/AdminSessionsNewSessionDialog.tsx` | 3 | GlowButton | ForgeButton binding |
| 11 | `frontend/src/components/DashBoard/Pages/admin-sessions/AdminSessionsTablePanel.tsx` | 4 | GlowButton | ForgeButton binding |
| 12 | `frontend/src/components/DashBoard/Pages/admin-sessions/TrainerAssignmentSection.tsx` | 3 | GlowButton | ForgeButton binding |
| 13 | `frontend/src/components/DashBoard/Pages/admin-sessions/ViewSessionModal.tsx` | 18 | GlowButton | ForgeButton binding |

## T4 money path — LAST, each with its own receipt + rollback — 16 import site(s)

| # | file | line | legacy | Forge replacement |
|---|---|---|---|---|
| 1 | `frontend/src/components/Checkout/methods/ACHPayment.tsx` | 18 | GlowButton | ForgeButton binding |
| 2 | `frontend/src/components/Checkout/methods/CheckPayment.tsx` | 7 | GlowButton | ForgeButton binding |
| 3 | `frontend/src/components/Checkout/methods/VenmoPayment.tsx` | 7 | GlowButton | ForgeButton binding |
| 4 | `frontend/src/components/Checkout/methods/ZellePayment.tsx` | 8 | GlowButton | ForgeButton binding |
| 5 | `frontend/src/components/NewCheckout/CheckoutButton.tsx` | 22 | GlowButton | ForgeButton binding |
| 6 | `frontend/src/components/NewCheckout/CheckoutView.sections.tsx` | 9 | GlowButton | ForgeButton binding |
| 7 | `frontend/src/components/NewCheckout/SuccessPage.stateViews.tsx` | 8 | GlowButton | ForgeButton binding |
| 8 | `frontend/src/components/NewCheckout/SuccessPage.tsx` | 26 | GlowButton | ForgeButton binding |
| 9 | `frontend/src/components/Shop/ProductDetail.tsx` | 9 | GlowButton | ForgeButton binding |
| 10 | `frontend/src/components/ShoppingCart/ShoppingCart.tsx` | 19 | GlowButton | ForgeButton binding |
| 11 | `frontend/src/components/ShoppingCart/ShoppingCartFooter.tsx` | 10 | GlowButton | ForgeButton binding |
| 12 | `frontend/src/components/UniversalMasterSchedule/ApplyPaymentModal.footer.tsx` | 3 | GlowButton | ForgeButton binding |
| 13 | `frontend/src/components/UniversalMasterSchedule/ApplyPaymentModal.SelectedClientPanel.tsx` | 3 | GlowButton | ForgeButton binding |
| 14 | `frontend/src/pages/gallery/PrintStore.tsx` | 9 | VaultDrawer | Modal `--drawer` variant |
| 15 | `frontend/src/pages/shop/components/PackageCard.tsx` | 24 | GlowButton | ForgeButton binding |
| 16 | `frontend/src/pages/shop/components/PricingInquiryModal.tsx` | 26 | GlowButton | ForgeButton binding |

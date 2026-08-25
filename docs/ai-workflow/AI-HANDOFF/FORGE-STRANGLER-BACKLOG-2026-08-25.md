---
decision: Ordered strangler backlog for migrating legacy GlowButton/GlacialInput/VaultDrawer consumers to @swan/forge — GENERATED from drift-lint R4 findings JOINED with import-graph reachability, ordered by risk tier
status: open
supersedes: none
---

# Forge Strangler Backlog v2 (generated 2026-08-25 — R4 findings × reachability from `frontend/src/main.jsx`)

**Law (Rule 84):** one component CLASS per strangler PR, in tier order (T1 public first → T4 money path last). **Reachability is evidence, not a guess:** each row says whether the file is reachable from the live route entry via static import graph (positive control: GolfSection = REACHABLE, verified live 2026-08-25). UNREACHABLE files are NOT migration targets — they are Rule 77 Tier-2 quarantine candidates (propose `archive/pending-deletion/`, never edit as if live). **Regenerate, never hand-edit:** `drift-lint --consumer frontend/src | grep '^\[R4\]' > r4.txt; reachability.mjs frontend/src frontend/src/main.jsx <files> > reach.txt; gen-backlog-v2.mjs r4.txt reach.txt`.

**v1 → v2 corrections:** UniversalMasterSchedule (authenticated) moved T1→T2; DesignPlayground → T0-playground; `styles/swan-theme-utils.tsx` (shared wrapper) → T2; 7 v1-T1 files proven UNREACHABLE. CORRECTION (PR #2 review, Ox + GLM): the `animateOnRender` note that stood here was stale — HomePage.V3 and About.V3 are REACHABLE route fallbacks and use it, so the Forge `.sw-btn--enter` entrance shipped in PR #2 under rule-of-two (3 reachable users).


## T0-dormant — UNREACHABLE from the app entry (Rule 77 Tier-2 quarantine candidates; do NOT migrate, propose archive) — 9 import site(s)

| # | file | line | legacy | reachable | Forge replacement |
|---|---|---|---|---|---|
| 1 | `frontend/src/components/Admin/CreateExerciseWizard.tsx` | 3 | GlowButton | NO | ForgeButton binding |
| 2 | `frontend/src/components/FeaturesSection/FeaturesSection.tsx` | 13 | GlowButton | NO | ForgeButton binding |
| 3 | `frontend/src/components/HeroSection/HeroSection.tsx` | 9 | GlowButton | NO | ForgeButton binding |
| 4 | `frontend/src/components/ParallaxSection/ParallaxSection.tsx` | 5 | GlowButton | NO | ForgeButton binding |
| 5 | `frontend/src/components/ui/buttons/GlowButton.lensTone.test.tsx` | 10 | GlowButton | NO | ForgeButton binding |
| 6 | `frontend/src/pages/HomePage/components/Hero-Section.V2.tsx` | 6 | GlowButton | NO | ForgeButton binding |
| 7 | `frontend/src/pages/HomePage/components/ProgramsOverview.V3.tsx` | 6 | GlowButton | NO | ForgeButton binding |
| 8 | `frontend/src/pages/PublicWaiverPage.V2.tsx` | 36 | GlowButton | NO | ForgeButton binding |
| 9 | `frontend/src/styles/swan-theme-utils.tsx` | 13 | GlowButton | NO | ForgeButton binding |

## T0-playground — preview surface, migrate last — 1 import site(s)

| # | file | line | legacy | reachable | Forge replacement |
|---|---|---|---|---|---|
| 1 | `frontend/src/pages/DesignPlayground/concepts/EtherealWilderness/EtherealWildernessHomepage.tsx` | 7 | GlowButton | yes | ForgeButton binding |

## T1 public / marketing — FIRST (same risk class as the Phase 1.5 proof) — 10 import site(s)

| # | file | line | legacy | reachable | Forge replacement |
|---|---|---|---|---|---|
| 1 | `frontend/src/pages/about/About.V3.tsx` | 22 | GlowButton | yes | ForgeButton binding |
| 2 | `frontend/src/pages/about/components/sections/CTASection.tsx` | 8 | GlowButton | yes | ForgeButton binding |
| 3 | `frontend/src/pages/about/components/sections/HeroSection.tsx` | 8 | GlowButton | yes | ForgeButton binding |
| 4 | `frontend/src/pages/HomePage/components/HomePage.V3.tsx` | 14 | GlowButton | yes | ForgeButton binding |
| 5 | `frontend/src/pages/HomePage/components/sections/AboutSection.tsx` | 21 | GlowButton | yes | ForgeButton binding |
| 6 | `frontend/src/pages/HomePage/components/sections/CTASection.tsx` | 6 | GlowButton | yes | ForgeButton binding |
| 7 | `frontend/src/pages/HomePage/components/sections/HeroSection.tsx` | 15 | GlowButton | yes | ForgeButton binding |
| 8 | `frontend/src/pages/HomePage/components/sections/ProgramsSection.tsx` | 13 | GlowButton | yes | ForgeButton binding |
| 9 | `frontend/src/pages/HomePage/components/sections/SocialSection.tsx` | 16 | GlowButton | yes | ForgeButton binding |
| 10 | `frontend/src/pages/OptimizedSignupModal.tsx` | 15 | GlowButton | yes | ForgeButton binding |

## T2 authenticated / shared-util surfaces — 15 import site(s)

| # | file | line | legacy | reachable | Forge replacement |
|---|---|---|---|---|---|
| 1 | `frontend/src/components/DashBoard/Pages/user-management/modern-user-management.tsx` | 4 | GlowButton | yes | ForgeButton binding |
| 2 | `frontend/src/components/TrainerDashboard/ClientManagement/MyClientsView.sections.tsx` | 19 | GlowButton | yes | ForgeButton binding |
| 3 | `frontend/src/components/TrainerDashboard/ClientManagement/MyClientsView.tsx` | 46 | GlowButton | yes | ForgeButton binding |
| 4 | `frontend/src/components/TrainerDashboard/ClientManagement/MyClientsViewWithFallback.tsx` | 15 | GlowButton | yes | ForgeButton binding |
| 5 | `frontend/src/components/TrainerDashboard/WorkoutLogging/EnhancedWorkoutLogger.view.tsx` | 10 | GlowButton | yes | ForgeButton binding |
| 6 | `frontend/src/components/UniversalMasterSchedule/components/ScheduleBookingModal.tsx` | 14 | GlowButton | yes | ForgeButton binding |
| 7 | `frontend/src/components/UniversalMasterSchedule/components/ScheduleCreateSessionModal.tsx` | 20 | GlowButton | yes | ForgeButton binding |
| 8 | `frontend/src/components/UniversalMasterSchedule/components/ScheduleHeader.tsx` | 10 | GlowButton | yes | ForgeButton binding |
| 9 | `frontend/src/components/UniversalMasterSchedule/SessionDetailFooterActions.tsx` | 8 | GlowButton | yes | ForgeButton binding |
| 10 | `frontend/src/components/UniversalMasterSchedule/SessionDetailInfoGrid.tsx` | 4 | GlowButton | yes | ForgeButton binding |
| 11 | `frontend/src/components/UniversalMasterSchedule/SessionDetailModal.feedbackStyles.ts` | 2 | GlowButton | yes | ForgeButton binding |
| 12 | `frontend/src/components/UniversalMasterSchedule/SessionDetailModal.lateCancelStyles.ts` | 2 | GlowButton | yes | ForgeButton binding |
| 13 | `frontend/src/components/UniversalMasterSchedule/SessionDetailSeriesCallout.tsx` | 8 | GlowButton | yes | ForgeButton binding |
| 14 | `frontend/src/components/UniversalMasterSchedule/SessionEditModal.tsx` | 9 | GlowButton | yes | ForgeButton binding |
| 15 | `frontend/src/pages/HomePage/components/sections/TrainersSection.tsx` | 21 | GlowButton | yes | ForgeButton binding |

## T3 admin surfaces — 12 import site(s)

| # | file | line | legacy | reachable | Forge replacement |
|---|---|---|---|---|---|
| 1 | `frontend/src/components/DashBoard/Pages/admin-dashboard/MeasurementEntryFormPanel.tsx` | 19 | GlowButton | yes | ForgeButton binding |
| 2 | `frontend/src/components/DashBoard/Pages/admin-onboarding/UnifiedOnboardingWizard.tsx` | 4 | GlowButton | yes | ForgeButton binding |
| 3 | `frontend/src/components/DashBoard/Pages/admin-packages/admin-packages-view.dialogs.tsx` | 9 | GlowButton | yes | ForgeButton binding |
| 4 | `frontend/src/components/DashBoard/Pages/admin-packages/admin-packages-view.tsx` | 7 | GlowButton | yes | ForgeButton binding |
| 5 | `frontend/src/components/DashBoard/Pages/admin-sessions/AdminSessionsAddSessionsDialog.tsx` | 3 | GlowButton | yes | ForgeButton binding |
| 6 | `frontend/src/components/DashBoard/Pages/admin-sessions/AdminSessionsDeleteDialogs.tsx` | 3 | GlowButton | yes | ForgeButton binding |
| 7 | `frontend/src/components/DashBoard/Pages/admin-sessions/AdminSessionsEditSessionDialog.tsx` | 3 | GlowButton | yes | ForgeButton binding |
| 8 | `frontend/src/components/DashBoard/Pages/admin-sessions/AdminSessionsMainCard.tsx` | 8 | GlowButton | yes | ForgeButton binding |
| 9 | `frontend/src/components/DashBoard/Pages/admin-sessions/AdminSessionsNewSessionDialog.tsx` | 3 | GlowButton | yes | ForgeButton binding |
| 10 | `frontend/src/components/DashBoard/Pages/admin-sessions/AdminSessionsTablePanel.tsx` | 4 | GlowButton | yes | ForgeButton binding |
| 11 | `frontend/src/components/DashBoard/Pages/admin-sessions/TrainerAssignmentSection.tsx` | 3 | GlowButton | yes | ForgeButton binding |
| 12 | `frontend/src/components/DashBoard/Pages/admin-sessions/ViewSessionModal.tsx` | 18 | GlowButton | yes | ForgeButton binding |

## T4 money path — LAST, each with its own receipt + rollback — 16 import site(s)

| # | file | line | legacy | reachable | Forge replacement |
|---|---|---|---|---|---|
| 1 | `frontend/src/components/Checkout/methods/ACHPayment.tsx` | 18 | GlowButton | yes | ForgeButton binding |
| 2 | `frontend/src/components/Checkout/methods/CheckPayment.tsx` | 7 | GlowButton | yes | ForgeButton binding |
| 3 | `frontend/src/components/Checkout/methods/VenmoPayment.tsx` | 7 | GlowButton | yes | ForgeButton binding |
| 4 | `frontend/src/components/Checkout/methods/ZellePayment.tsx` | 8 | GlowButton | yes | ForgeButton binding |
| 5 | `frontend/src/components/NewCheckout/CheckoutButton.tsx` | 22 | GlowButton | yes | ForgeButton binding |
| 6 | `frontend/src/components/NewCheckout/CheckoutView.sections.tsx` | 9 | GlowButton | yes | ForgeButton binding |
| 7 | `frontend/src/components/NewCheckout/SuccessPage.stateViews.tsx` | 8 | GlowButton | yes | ForgeButton binding |
| 8 | `frontend/src/components/NewCheckout/SuccessPage.tsx` | 26 | GlowButton | yes | ForgeButton binding |
| 9 | `frontend/src/components/Shop/ProductDetail.tsx` | 9 | GlowButton | yes | ForgeButton binding |
| 10 | `frontend/src/components/ShoppingCart/ShoppingCart.tsx` | 19 | GlowButton | yes | ForgeButton binding |
| 11 | `frontend/src/components/ShoppingCart/ShoppingCartFooter.tsx` | 10 | GlowButton | yes | ForgeButton binding |
| 12 | `frontend/src/components/UniversalMasterSchedule/ApplyPaymentModal.footer.tsx` | 3 | GlowButton | yes | ForgeButton binding |
| 13 | `frontend/src/components/UniversalMasterSchedule/ApplyPaymentModal.SelectedClientPanel.tsx` | 3 | GlowButton | yes | ForgeButton binding |
| 14 | `frontend/src/pages/gallery/PrintStore.tsx` | 9 | VaultDrawer | yes | Modal `--drawer` variant |
| 15 | `frontend/src/pages/shop/components/PackageCard.tsx` | 24 | GlowButton | yes | ForgeButton binding |
| 16 | `frontend/src/pages/shop/components/PricingInquiryModal.tsx` | 26 | GlowButton | yes | ForgeButton binding |

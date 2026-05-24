# SwanStudios Funnel Activation Surface Map - 2026-05-20

## Purpose

This map gives future AI agents a verified, privacy-safe path through the live SwanStudios acquisition and activation funnel:

```
public acquisition -> store -> checkout -> signup/login -> waiver/onboarding
  -> admin client management -> session allocation/scheduling
  -> client dashboard/workouts/progress/body map
```

This is a navigation and ownership document only. It does not approve archiving, deleting, or refactoring any runtime file.

## Current Worktree Boundaries

- Current HEAD observed during this audit: `a1fc836160ac33a402ad98853392ff21e47387f8`.
- Staging was empty during the audit.
- This Codex lane owns the payment activation resolver follow-up work on top of that HEAD.
- Runtime files touched by this lane: `backend/webhooks/stripeWebhook.mjs`, `backend/routes/v2PaymentRoutes.mjs`, `backend/utils/stripeIdempotency.mjs`, `backend/services/paymentActivationStatusService.mjs`, `backend/routes/adminClientRoutes.mjs`, `backend/controllers/adminClientController.mjs`, `backend/services/adminClientActivationQueueService.mjs`, `backend/__tests__/stripeWebhookSessionGrant.test.mjs`, `backend/__tests__/paymentActivationStatusRoute.test.mjs`, `backend/__tests__/adminClientActivationQueueRoute.test.mjs`, `backend/__tests__/adminClientActivationQueueService.test.mjs`, `backend/__tests__/checkoutSessionIdempotencyKey.test.mjs`, `backend/tests/api/payments.test.mjs`, `frontend/src/components/NewCheckout/SuccessPage.tsx`, `frontend/src/components/NewCheckout/checkoutActivation.ts`, `frontend/src/components/NewCheckout/checkoutActivation.test.ts`, `frontend/src/components/DashBoard/UniversalDashboardLayout.tsx`, `frontend/src/components/DashBoard/Pages/admin-clients/components/ClientBodyMapModal.tsx`, `frontend/src/components/DashBoard/Pages/admin-dashboard/MeasurementEntry.tsx`, `frontend/src/components/DashBoard/workspaces/ClientsWorkspace.tsx`, `frontend/src/components/DashBoard/workspaces/ClientActivationQueuePanel.tsx`, `frontend/src/components/DashBoard/workspaces/ClientActivationQueuePanel.test.tsx`, `frontend/src/components/DashBoard/workspaces/clientActivationQueue.ts`, and `frontend/src/components/DashBoard/workspaces/clientActivationQueue.test.ts`.
- No files were staged, committed, pushed, archived, moved, or deleted by this lane.
- This file is docs-only and contains no secrets, client PII, or production tokens.

## Canonical Surface Receipt

### Public entry, account, waiver, and checkout routes

| URL | Canonical frontend mount | Rendered component |
|---|---|---|
| `/login` | `frontend/src/routes/main-routes.tsx:299` | `EnhancedLoginModal` imported at `frontend/src/routes/main-routes.tsx:58`, rendered as `<LoginModal />` at `frontend/src/routes/main-routes.tsx:302` |
| `/signup` | `frontend/src/routes/main-routes.tsx:323` | `OptimizedSignupModal` imported at `frontend/src/routes/main-routes.tsx:70`, rendered as `<SignupModal />` at `frontend/src/routes/main-routes.tsx:326` |
| `/waiver` | `frontend/src/routes/main-routes.tsx:383` | `PublicWaiverPage.V3` imported at `frontend/src/routes/main-routes.tsx:96`, rendered as `<PublicWaiverPage />` at `frontend/src/routes/main-routes.tsx:386` |
| `/store` | `frontend/src/routes/main-routes.tsx:449` | `SwanStudiosStore` rendered at `frontend/src/routes/main-routes.tsx:452` |
| `/swanstudios-store` | `frontend/src/routes/main-routes.tsx:457` | Same `SwanStudiosStore`, rendered at `frontend/src/routes/main-routes.tsx:460` |
| `/shop` | `frontend/src/routes/main-routes.tsx:465` | Same `SwanStudiosStore`, rendered at `frontend/src/routes/main-routes.tsx:468` |
| `/checkout` | `frontend/src/routes/main-routes.tsx:626` | `NewCheckout/CheckoutView` imported at `frontend/src/routes/main-routes.tsx:141`, rendered at `frontend/src/routes/main-routes.tsx:630` |
| `/checkout/success` | `frontend/src/routes/main-routes.tsx:636` | `NewCheckout/SuccessPage` imported at `frontend/src/routes/main-routes.tsx:213`, rendered at `frontend/src/routes/main-routes.tsx:639` |
| `/checkout/cancel` | `frontend/src/routes/main-routes.tsx:644` | `pages/checkout/CheckoutCancel` imported at `frontend/src/routes/main-routes.tsx:217`, rendered at `frontend/src/routes/main-routes.tsx:647` |

### Dashboard route shell

| URL | Canonical frontend mount | Rendered component |
|---|---|---|
| `/client-dashboard` | `frontend/src/routes/main-routes.tsx:662` | Redirects to `/dashboard/client/overview` |
| `/client-dashboard-legacy` | `frontend/src/routes/main-routes.tsx:666` | Redirects to `/dashboard/client/overview` |
| `/user-dashboard` | `frontend/src/routes/main-routes.tsx:686` | Separate social/creator `UserDashboard`, rendered at `frontend/src/routes/main-routes.tsx:690` |
| `/dashboard/*` | `frontend/src/routes/main-routes.tsx:817` | `UniversalDashboardLayout`, rendered at `frontend/src/routes/main-routes.tsx:821` |

`/user-dashboard` is not the PT client dashboard. It is a separate user/social/creator surface. The PT client dashboard lives under `/dashboard/client/*`.

### Admin activation routes

`UniversalDashboardLayout` renders the active role route map through `roleConfig.routes.map` at `frontend/src/components/DashBoard/UniversalDashboardLayout.tsx:890`.

| URL under `/dashboard/admin` | Canonical component |
|---|---|
| `/client-management` | `ClientsWorkspace` at `frontend/src/components/DashBoard/UniversalDashboardLayout.tsx:519` |
| `/client-details` | `EnhancedAdminClientManagementView` at `frontend/src/components/DashBoard/UniversalDashboardLayout.tsx:521` |
| `/client-onboarding` | `ClientOnboardingWizard` at `frontend/src/components/DashBoard/UniversalDashboardLayout.tsx:522` |
| `/admin-sessions` | `EnhancedAdminSessionsView` at `frontend/src/components/DashBoard/UniversalDashboardLayout.tsx:537` |
| `/session-allocation` | `SessionAllocationManager` at `frontend/src/components/DashBoard/UniversalDashboardLayout.tsx:539` |
| `/body-map` | `BodyMapPage` at `frontend/src/components/DashBoard/UniversalDashboardLayout.tsx:583` |

### Client dashboard routes

| URL under `/dashboard/client` | Canonical component |
|---|---|
| `/overview` | `ClientHomeTab` at `frontend/src/components/DashBoard/UniversalDashboardLayout.tsx:624` |
| `/workouts` | `ClientMyWorkoutsPage` at `frontend/src/components/DashBoard/UniversalDashboardLayout.tsx:626` |
| `/progress` | `ClientProgressDashboardPage` at `frontend/src/components/DashBoard/UniversalDashboardLayout.tsx:628` |
| `/progress/detailed` | `ClientProgressWrapper` at `frontend/src/components/DashBoard/UniversalDashboardLayout.tsx:629` |
| `/body-map` | `BodyMapPage` at `frontend/src/components/DashBoard/UniversalDashboardLayout.tsx:639` |

## API And Backend Mapping

| Funnel area | Frontend API path evidence | Backend mount evidence | Handler evidence |
|---|---|---|---|
| Login | `frontend/src/services/api.service.ts:62` posts `/api/auth/login` | `backend/core/routes.mjs:276` mounts `/api/auth` | `backend/routes/authRoutes.mjs:355` posts login |
| Signup | `frontend/src/services/api.service.ts:112` posts `/api/auth/register` | `backend/core/routes.mjs:276` mounts `/api/auth` | `backend/routes/authRoutes.mjs:342` posts register |
| Store packages | `frontend/src/pages/shop/StoreV3.tsx:629` gets `/api/storefront` | `backend/core/routes.mjs:306` mounts `/api/storefront` | `backend/routes/storeFrontRoutes.mjs:84` gets `/` |
| Cart | `frontend/src/context/CartContext.tsx:116` gets `/api/cart`; `:231` posts `/api/cart/add` | `backend/core/routes.mjs:305` mounts `/api/cart` | `backend/routes/cartRoutes.mjs:135` gets `/`; `:205` posts `/add` |
| Stripe checkout | `frontend/src/components/NewCheckout/CheckoutView.tsx:450` checks `/api/v2/payments/health`; `:463` posts `/api/v2/payments/create-checkout-session` | `backend/core/routes.mjs:323` mounts `/api/v2/payments` | `backend/routes/v2PaymentRoutes.mjs:114` posts `/create-checkout-session`; `:542` gets `/health` |
| Stripe checkout idempotency | Checkout creation posts the active cart once per admin/client purchase action; backend computes a cart fingerprint before calling Stripe | `backend/core/routes.mjs:323` mounts `/api/v2/payments` | `backend/routes/v2PaymentRoutes.mjs:61` builds the Stripe key; `backend/utils/stripeIdempotency.mjs` normalizes numeric cart fingerprint parts so equivalent DECIMAL string/number shapes reuse the same key |
| Checkout success verify | `frontend/src/components/NewCheckout/SuccessPage.tsx:334` posts `/api/v2/payments/verify-session` | `backend/core/routes.mjs:323` mounts `/api/v2/payments` | `backend/routes/v2PaymentRoutes.mjs:414` posts `/verify-session` |
| Checkout activation resolver | `frontend/src/components/NewCheckout/checkoutActivation.ts:88` gets `/api/v2/payments/activation-status`; `SuccessPage.tsx:364` and `:394` consume it | `backend/core/routes.mjs:323` mounts `/api/v2/payments` | `backend/routes/v2PaymentRoutes.mjs:507` gets `/activation-status`; service is `backend/services/paymentActivationStatusService.mjs` |
| Public waiver | `frontend/src/services/publicWaiverService.ts:14` uses `/api/public/waivers`; `:70` gets `/versions/current`; `:77` posts `/submit` | `backend/core/routes.mjs:498` mounts `/api/public/waivers` | `backend/routes/publicWaiverRoutes.mjs:16` gets `/versions/current`; `:17` posts `/submit` |
| Onboarding | `frontend/src/pages/onboarding/ClientOnboardingWizard.tsx:497` posts `/api/onboarding/self` or `/api/onboarding` | `backend/core/routes.mjs:289` and `:291` both mount `/api/onboarding` | `backend/routes/onboardingRoutes.mjs:25` posts `/self`; `:33` posts `/` |
| Admin client hub | `frontend/src/components/DashBoard/workspaces/ClientsWorkspace.tsx:294` gets `/api/admin/clients` | `backend/core/routes.mjs:429` mounts `/api/admin` admin client routes | `backend/routes/adminClientRoutes.mjs:285` gets `/clients`; `:287` gets `/clients/:clientId`; `:288` posts `/clients` |
| Admin paid-client activation queue | `frontend/src/components/DashBoard/workspaces/clientActivationQueue.ts:82` gets `/api/admin/clients/activation-queue`; `ClientActivationQueuePanel.tsx:196` consumes it; `ClientsWorkspace.tsx:473` renders the panel when no client is selected | `backend/core/routes.mjs:429` mounts `/api/admin` admin client routes | `backend/routes/adminClientRoutes.mjs:286` gets `/clients/activation-queue` before the param route; `backend/controllers/adminClientController.mjs:511` delegates to `adminClientActivationQueueService.mjs`; default queue excludes `dashboard`-complete rows |
| Dashboard route chunking | Active dashboard pages are route-level components; the shell should not pull all admin/client route bodies into the initial dashboard chunk | `frontend/src/routes/main-routes.tsx:817` mounts `/dashboard/*` | `frontend/src/components/DashBoard/UniversalDashboardLayout.tsx:66-99` lazy-loads route pages; `ClientBodyMapModal.tsx:17` and `MeasurementEntry.tsx:20` lazy-load BodyMap to avoid mixed static/dynamic chunk warnings |
| Session allocation | `frontend/src/components/Admin/SessionAllocationManager.tsx:464` loads clients through `sessionService.getClients()`; `:541` posts `/api/sessions/add-to-user` | `backend/core/routes.mjs:348` mounts `/api/sessions` | `backend/routes/sessionRoutes.mjs:205` posts `/allocate-from-order`; `:255` posts `/add-to-user`; `:311` gets `/user-summary/:userId`; `:336` gets `/allocation-health` |
| Client home social/gamification | `frontend/src/components/DashBoard/Pages/client-dashboard/observatory/ClientObservatoryHome.tsx:6-9` documents `/api/v1/gamification/profile`, `/api/social/posts/feed`, `/api/social/challenges/active`, `/api/v1/gamification/leaderboard` | `backend/core/routes.mjs:407`, `:409`, and `:415` mount gamification/social APIs | Handlers are spread across social/gamification route modules; probe before patching |
| Client workouts | `frontend/src/components/DashBoard/Pages/client-dashboard/ClientMyWorkoutsPage.tsx:11` identifies `/api/workout/sessions` | `backend/core/routes.mjs:343` mounts `/api/workout`; `:344` mounts `/api/workout/sessions` | `backend/routes/workoutSessionRoutes.mjs:25` gets `/`; `:183` posts `/` |
| Client progress | `frontend/src/components/DashBoard/Pages/client-dashboard/ClientProgressDashboardPage.tsx:409` gets `/api/client/analytics/personal-records` | `backend/core/routes.mjs:402` mounts `/api/client/analytics`; `:512` and `:513` also mount `/api/client` routers | NEEDS PROBE before route edits |
| Body map | `frontend/src/services/painEntryService.ts:58` defines `/api/pain-entries` | `backend/core/routes.mjs:359` mounts `/api/pain-entries` | `backend/routes/painEntryRoutes.mjs:24-33` owns CRUD |

## Model Anchors

| Domain | Authoritative model evidence |
|---|---|
| User identity and role | `backend/models/User.mjs:30-47` first/last/email; `:91-95` role enum; `:144-148` availableSessions; `:358-377` client source/status fields |
| Order/payment state | `backend/models/Order.mjs:14-20` user/cart ids; `:22-35` order number/amount/status; `:36-50` payment fields; `:64-83` payment application/idempotency fields |
| Cart/payment session | `backend/models/ShoppingCart.mjs:19-23` status; `:30-49` payment intent/session/status; `:51-73` completion/session grant fields |
| Waiver | `backend/models/WaiverRecord.mjs:13-32` user/name/DOB; `:33-56` email/phone/status/source; `:58-99` activity/signature/guardian/provenance fields |
| Session | `backend/models/Session.mjs:32-45` session date/end/duration; `:69-78` user/trainer; `:135-145` status; `:172-187` deduction/confirmation; `:227-230` admin booking |

## Active Vs Legacy/Dormant Surface Table

| Surface | Classification | Evidence | Notes |
|---|---|---|---|
| `frontend/src/components/NewCheckout/SuccessPage.tsx` | Active canonical checkout success | Mounted at `/checkout/success` through `frontend/src/routes/main-routes.tsx:636-639` | Current lane wires it to backend activation status while keeping `/verify-session` as the Stripe verification path |
| `frontend/src/components/DashBoard/workspaces/ClientActivationQueuePanel.tsx` | Active canonical admin intake queue panel | Imported by `ClientsWorkspace.tsx:38` and rendered in the active `/dashboard/admin/client-management` workspace at `ClientsWorkspace.tsx:473` | Uses backend-owned activation status via `clientActivationQueue.ts`; keep as an admin queue, not payment truth |
| `frontend/src/pages/checkout/CheckoutSuccess.tsx` | Dormant/legacy candidate | Exists and exports `CheckoutSuccess`, but active route imports `NewCheckout/SuccessPage` at `frontend/src/routes/main-routes.tsx:213` | Do not polish. Archive only after final reference proof and approval |
| `frontend/src/pages/checkout/CheckoutCancel.tsx` | Active canonical cancel page | Imported at `frontend/src/routes/main-routes.tsx:217`, mounted at `:644-647` | Keep separate from success page |
| `/user-dashboard` | Active separate user/social/creator surface | `frontend/src/routes/main-routes.tsx:686-690` | Do not merge with PT client dashboard without explicit product decision |
| `/dashboard/client/*` | Active PT client dashboard | `frontend/src/routes/main-routes.tsx:817-821`; client routes at `UniversalDashboardLayout.tsx:624-639` | This is where client training/workout/progress/body-map live |
| `frontend/src/components/Admin/SessionAllocationManager.tsx` | Active canonical admin session allocation page | Lazy declared by `UniversalDashboardLayout.tsx:91`, mounted at `:539` | Uses `services/sessionService.ts` plus direct `/api/sessions/*` calls |
| `frontend/src/components/UniversalMasterSchedule/SessionAllocationManager.tsx` | NEEDS PROBE / likely dormant for this route | Not imported by the traced `/dashboard/admin/session-allocation` route; it imports `services/sessionService.ts` internally | Do not delete without repo-wide reference proof |
| `frontend/src/services/sessionService.ts` | Active service in traced allocation route | Imported by active `components/Admin/SessionAllocationManager.tsx:28` | Large legacy-shaped service; avoid broad refactor |
| `frontend/src/services/session-service.ts` | Ambiguous duplicate service | Contains newer allocation endpoints at `:277`, `:302`, `:328`, `:350`, but not used by active admin allocation route found in this receipt | Classify consumers before any cleanup |
| `frontend/src/pages/shop/StoreV3.tsx` | Active canonical store | Store route renders `SwanStudiosStore` at `main-routes.tsx:452`; `StoreV3` loads `/api/storefront` at `:629` | Has API fallback package data at `:658-662`; see funnel gaps |

## Funnel Gaps And Needs-Probe Items

1. `StoreV3` has a live `/api/storefront` fetch, but falls back to hardcoded packages when the API fails. That may be useful for local demos, but it can mislead production truth if not clearly gated.
2. `/api/onboarding` is mounted twice (`backend/core/routes.mjs:289` and `:291`). Do not patch onboarding endpoints without a mount-order receipt.
3. `/api/payments` is mounted before `/api/payments/ach` (`backend/core/routes.mjs:326-327`). Backend payment lanes must verify whether the general payments router shadows ACH siblings.
4. `/api/workout` is mounted before `/api/workout/sessions` (`backend/core/routes.mjs:343-344`). Workout history fixes must include route-shadow proof.
5. `/api/sessions` is mounted before `/api/sessions/deductions` (`backend/core/routes.mjs:348-349`). Session allocation/payment deduction work should document exact handler ownership.
6. `/api/client` has two mounts (`backend/core/routes.mjs:512-513`). Client analytics/progress changes need backend ownership proof.
7. Session allocation has two similarly named frontend components and two similarly named services. The active `/dashboard/admin/session-allocation` route uses `components/Admin/SessionAllocationManager.tsx` and `services/sessionService.ts`.
8. `/user-dashboard` and `/dashboard/client/overview` are both active but different products. The first is user/social/creator; the second is PT client training.
9. `ClientDetailsPanel`, `AddSessionsDialog`, `ApplyPaymentDialog`, `ClientPostsModal`, `ClientWorkoutsModal`, `NASMAnalyticsCharts`, and `AdminClientManagementView` were already flagged by prior cleanup passes as dormant or unproven. Do not polish them without fresh import/render proof.

## Recommended Ownership For Current Codex Lanes

| Lane | Owns | Avoids |
|---|---|---|
| Backend payment/session lane | Stripe webhook, payment activation status, session grant/idempotency, backend tests | Dormant checkout success variants, admin/session allocation UI refactors |
| Frontend/docs canonical funnel clarity lane | This map, `ACTIVE-INDEX.md` pointer, route receipts, checkout success resolver adapter, admin activation queue panel wiring | Dormant checkout success variants, archive decisions, broad dashboard redesign |
| Future frontend runtime lane | Store fallback truth, client first-run dashboard state, proven active public/store/checkout/dashboard pages only | Dormant checkout success, unmounted modal variants, duplicate session allocation/service files until classified |

## Next Safe Actions

1. Keep this document updated when the canonical funnel changes.
2. If editing runtime routes, begin with the receipt above and refresh line numbers first.
3. If archiving dormant files, do it as a separate approved cleanup pass with narrow `rg` proof and no broad staging.
4. If touching payment/session activation after this lane, start from `paymentActivationStatusService.mjs` and its regression tests before changing checkout UI behavior.
5. If continuing frontend funnel hardening, start with `StoreV3` fallback truth and the duplicated session allocation/service classification before touching UI polish.

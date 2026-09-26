**File ownership and size**

Measured current counts are below. New files have current count `0`. Every new leaf has a `≤300` line budget. Oversized existing files require a recorded extraction manifest before their slice; this package grants no exemption.

| Slice | Files / entry point | Current lines | Planned responsibility |
|---|---|---:|---|
| S0 | Package documents; new `backend/tests/security/campaign-safety.test.mjs`; new local-only test helpers | 0 for new files | Bind source, archive safely in a writable run, install regression probes and disposable-test guard. |
| S1 | `backend/controllers/workoutController.mjs`; `backend/routes/workoutRoutes.mjs`; `backend/routes/workoutSessionRoutes.mjs`; `backend/routes/variationRoutes.mjs`; `backend/routes/formAnalysisRoutes.mjs` | Controller 696; later workout router 756 | Shared authorization before each effect; immutable owners; preserve route contracts. |
| S2 | `backend/core/middleware/index.mjs`; `backend/core/routes.mjs`; `backend/core/photoServeCategories.mjs`; `backend/services/photoStorageService.mjs`; new `backend/services/privateMediaAccess.mjs` | Middleware 229; routes 903 | One private-media policy across aliases and storage publication. |
| S3 | `backend/routes/aiChatRoutes.mjs`; `backend/middleware/piiSanitizationMiddleware.mjs`; new `backend/services/ai/outboundPayloadPolicy.mjs` | AI routes 1090 | Local intake containment and transport-level allowlist. |
| S4 | `backend/controllers/publicWaiverController.mjs`; `backend/routes/publicWaiverRoutes.mjs`; `backend/routes/freeApiRoutes.mjs`; `backend/middleware/rateLimiter.mjs`; waiver result consumers | Controller 403; V3 page 795 | Unlinked anonymous intake and shared quotas. |
| S5 | `backend/scripts/render-start.mjs`; `backend/core/startup.mjs`; `backend/utils/startupMigrations.mjs`; `backend/utils/productionDatabaseSync.mjs` | Startup 652 | Explicit migration execution and fail-closed startup. |
| S6 | New `backend/models/CheckoutAttempt.mjs`, `PaymentEvent.mjs`; new `backend/services/payments/checkoutPreparation.mjs`, `paymentEvidence.mjs`; existing cart/v2 payment routes | Cart 1000; v2 payment 896 | Immutable snapshot, preparation recovery, provider binding. |
| S7 | New `backend/models/SessionCreditGrant.mjs`, `SessionCreditUse.mjs`; new `backend/services/payments/purchaseFulfillment.mjs`, `sessionCreditProvenance.mjs`; existing allocation adapters and scheduling consumers | Allocator 540; grant service 309; unified service 3055 | Single grant/effect transaction and purchase-specific consumption. |
| S8 | `backend/webhooks/stripeWebhook.mjs`; `backend/services/refundReconciliationService.mjs`; `backend/services/paymentActivationStatusService.mjs`; `SuccessPage.tsx`, state views, styles | Webhook 695; page 304 | Durable recovery, refunds, truthful receipt UI. |
| S9 | `backend/routes/clientOnboardRoutes.mjs`; `backend/models/ClientNote.mjs`; `backend/models/Notification.mjs`; `backend/services/badgeService.mjs`; `backend/controllers/challengeController.mjs`; targeted migrations | Onboard 361 | Atomic onboarding and database-enforced data integrity. |
| S10 | `backend/core/app.mjs`; `backend/core/middleware/errorHandler.mjs`; `backend/server.mjs`; `frontend/src/hooks/useEnhancedClientDashboard.ts`; `frontend/src/context/AuthContext.tsx`; dependency manifest/lockfile | App 404 | Log closure, process policy, lifecycle cleanup, upload maintenance. |
| S11 | Package receipts and release manifest only | New artifacts ≤300 each | Combined verification and gated release handoff. |

**Imports and exports**

- Preparation imports model getters and existing pricing/fulfillment validators; exports `prepareCheckout`.
- Evidence module is pure; exports `normalizePaymentEvidence`.
- Fulfillment imports model getters and provenance helpers; exports `fulfillPurchase`.
- Provenance module exports reserve/consume/release operations and refund calculations.
- Existing `SessionGrantService` and both allocation service entry points become compatibility adapters. No caller may implement a second balance mutation.
- Existing `verifyClientAccess.mjs:95–122` is the authorization pattern.
- Existing grant-service user lock and increment at `SessionGrantService.mjs:145–157,270–275` are the transaction pattern.
- Existing `SuccessPage.stateViews.tsx` is the UI composition pattern.

**Extraction bounds**

S0 records exact leaf names, exported symbols, importers, and line counts. Split by existing responsibility: route registration, controller operations, presentation styles, and pure helpers. Preserve imports through compatibility exports. No unrelated behavior change accompanies extraction.

New migration filenames reserve the `20260926` prefix only after checking for collisions. A collision changes the timestamp, not the migration contract.

No files are deleted during planning. Retirement decisions are in `12-orphan-disposition.md`.

# Canonical Surface Receipt — Trainer Onboarding Page (rules 26–31)

**Task:** net-new self-serve trainer onboarding page (fill info → e-sign contract → upload COI/credentials → land in Pending Review). High-stakes (auth + trainer PII + legal contract). Stripe Connect payout wiring EXPLICITLY DEFERRED to next slice.

## (a) Route file that mounts the target URL
- Frontend routes: `frontend/src/routes/main-routes.tsx`. Lazy-load helper pattern proven at `main-routes.tsx:101-104` (`lazyLoadWithErrorHandling(() => import(...), name, fallback)`). Public page mount pattern (JSX, not just import) at `main-routes.tsx:400-405` (`<PublicWaiverPage />` inside a route element). **New route to add:** `/trainer-onboarding` (or `/join/trainer`) — NET-NEW, no existing mount.

## (b) Mounted JSX page/component
- **Net-new** — `TrainerOnboardingPage`. Precedent template = `frontend/src/pages/PublicWaiverPage.V3.tsx` (single-page sectioned form). Proof no competing surface exists: scan §4 — no trainer-application route in `main-routes.tsx`; only admin-managed trainer surfaces + a redirect `trainer-dashboard/* → /dashboard/trainer/overview` (`main-routes.tsx:697-701`). No duplicate risk.

## (c) Consumer hook/service
- **Net-new** frontend service `trainerOnboardingService.ts` mirroring `services/publicWaiverService.ts`. Auth via existing `AuthContext` (`frontend/src/context/AuthContext.tsx`; role union incl. `'trainer'` at `:27`; `apiService` JWT transport).

## (d) Exact frontend API path string literal
- **Net-new:** `POST /api/trainer-onboarding/apply` (submit), `GET /api/trainer-onboarding/contract` (current contract version text), `POST /api/trainer-onboarding/credentials` (COI/cert upload). Namespaced under `/api/trainer-onboarding` — no collision (grep of `core/routes.mjs` shows no such mount).

## (e) Backend route match
- Mount site: `backend/core/routes.mjs` — public/admin mounts declared ~`:505-509` (`app.use('/api/public/waivers', publicWaiverRoutes)`). Route imports at `:142-143`. **New:** `import trainerOnboardingRoutes from '../routes/trainerOnboardingRoutes.mjs';` + `app.use('/api/trainer-onboarding', trainerOnboardingRoutes);`. Auth middleware `backend/middleware/authMiddleware.mjs` `protect` + `authorize([...])` (proven pattern `workoutLogUploadRoutes.mjs:128-133`).

## (f) Authoritative model fields (from model files, not memory)
- **Trainer = role on User** (NO separate Trainer table). `backend/models/User.mjs`:
  - `role` ENUM `('user','client','trainer','admin')` — `User.mjs:123-127`
  - `trainerType` STRING(20) `validate:{isIn:[['affiliated','independent']]}` default null — `User.mjs:264-270`
  - trainer profile cols: `specialties:242`… wait — `specialties` TEXT `:232`, `certifications` TEXT `:237`, `bio` TEXT `:242`, `availableDays` TEXT `:248`, `availableHours` TEXT `:253`, `hourlyRate` FLOAT `:259`
  - `isActive` BOOLEAN default true `:282`; `isOnboardingComplete` BOOLEAN `:304`
- **E-sign evidence pattern to mirror** — `backend/models/WaiverRecord.mjs`: `signatureData` TEXT notEmpty (base64 PNG) `:63-69`; `signedAt` DATE default NOW `:70`; `ipAddress` STRING(45) `:75`; `userAgent` TEXT `:79`; `metadata` JSONB `:96` (holds `versionTextSnapshots`+`textHash`+timestamps per `publicWaiverController.mjs:304-315`). Model registration convention: `associations.mjs` dynamic `await import('./X.mjs')` `:138-142`, `.default` `:349-353`, inline association decls `~:1106-1121`, return object `~:1346/1468`.

## Surface Classification Table (rule 27)
| Surface | Class | Evidence |
|---|---|---|
| `TrainerOnboardingPage` (new) | **dormant→canonical** (new, will be wired) | net-new; mount to be added `main-routes.tsx` |
| `/api/trainer-onboarding/*` (new) | **canonical** (only handler for path) | no existing mount in `core/routes.mjs` |
| `User.role/trainerType` + profile cols | **canonical** (live model) | `User.mjs:123-270` |
| Waiver e-sign stack | **canonical, REUSED as pattern** | `WaiverRecord.mjs`, `SignaturePad.tsx` |
| admin trainer mgmt UIs | **canonical, adjacent (not touched)** | `Admin/TrainerPermissionsManager.tsx` etc |
| `TrainerOrientation.tsx` (archived) | **legacy — DO NOT revive** | `archive/pending-deletion/...` |

## Schema-drift check (rule 29 / 58)
- ⚠️ **`trainerType` vocab drift:** `User.mjs:268` allows `['affiliated','independent']`; `CommissionService.mjs:92` compares `'hired'`. **Mitigation THIS slice:** set `trainerType='independent'` on approval (matches the 15% independent-contractor model + the enum). Do NOT touch CommissionService this slice; flag drift to Sean/Linear. New model writes use only the enum-legal value.
- New model `TrainerApplication` columns are self-authored; will provide a migration + register via the proven `associations.mjs` pattern; FK `userId → "Users"` (rule: FKs reference `"Users"`, the PascalCase table).

## Fail-closed activation posture (Sean's decision)
- Application lands `status='pending_review'`. Trainer CANNOT take clients/payments until admin flips to `approved` AND (next slice) Stripe Connect `charges_enabled`. No auto-activation. Insurance verified manually by admin before approval.

## Deferred (explicitly NOT this slice)
- Stripe Connect Express account creation, `application_fee_amount` 15% split, payout rails — confirmed net-new (scan §1: zero Connect code today). Next focused slice + security review.
- Final attorney-drafted contract text (this slice ships watermarked DRAFT v1 from the term sheet, versioned so swap-in needs no rebuild).

**No code written before this receipt. Receipt complete.**

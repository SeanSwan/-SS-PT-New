# Authentication Modernization Hygiene Inventory — Phase 1

**Date:** 2026-07-29
**Scope:** Canonical login, federated-auth foundation, onboarding boundary
**Mode:** Non-destructive inventory only
**Baseline:** `origin/main@85e6ee61e`

## Purpose

This artifact satisfies the route-tracing hygiene trigger before authentication
work. It separates the mounted login surface from lookalike route files, records
mount-order risks, and identifies cleanup candidates without moving or deleting
user files. Physical cleanup is a separate, explicitly approved pass.

## Root inventory

| Class | Current location | Classification | Disposition |
|---|---|---|---|
| Runtime applications | `backend/`, `frontend/`, `shared/` | active runtime code | keep |
| Operating guidance | `AGENTS.md`, `CLAUDE.md`, `ACTIVE-INDEX.md` | active operating docs | keep |
| Automation and validation | `scripts/`, `tools/`, `tests/` | active runtime/support code | keep |
| Configuration | root package files, `render.yaml`, TypeScript/Vite configs | active configuration | keep |
| Product/reference documentation | `docs/ai-workflow/` | active reference and handoff docs | keep; classify per index |
| Historical material | existing archive folders indexed by `ACTIVE-INDEX.md` | archive-only historical record | leave in place |
| Local dependencies | root/frontend/backend `node_modules/` | generated install artifact | ignored; never commit |
| Auth QA captures and Vite logs | `C:/tmp/auth-*.png`, `C:/tmp/sspt-auth-vite.*.log` | QA/temp output outside repo | remove after handoff or retain only by request |

No new root-level screenshot, log, or ad hoc markdown artifact was created by
this workstream.

## Canonical surface receipt

| Required link | Evidence | Finding |
|---|---|---|
| Router construction | `frontend/src/App.tsx:55,116` | `App` imports `MainRoutes` and constructs the browser router from it. |
| Mounted login route | `frontend/src/routes/main-routes.tsx:65,342-347` | `/login` mounts the lazy `EnhancedLoginModal`. |
| Mounted page | `frontend/src/pages/EnhancedLoginModal.tsx` | canonical sign-in form rendered inside `AuthLayout`. |
| Frontend consumer | `frontend/src/context/AuthContextProvider.tsx:498-533` | context login calls the production API service and installs returned auth state. |
| Exact API literal | `frontend/src/services/api.service.ts:92-95` | `POST /api/auth/login`. |
| Backend mount | `backend/core/routes.mjs:303` | `authRoutes` mounted at `/api/auth`. |
| Backend handler | `backend/routes/authRoutes.mjs:394-400` | `POST /login` validates and dispatches to `authController.login`. |
| Authoritative user fields | `backend/models/User.mjs:24-59,124-128,299-325,472-477,561-595` | integer id; required name/email/username/password; role; active/onboarding/account/token fields. |

## Surface classification

| Surface | Evidence | Classification | Reason |
|---|---|---|---|
| `EnhancedLoginModal` via `main-routes.tsx` | `App.tsx:55,116`; `main-routes.tsx:65,342-347` | canonical | proven in the actual browser-router tree |
| `authentication-routes.tsx` | lines 11-25 | legacy but still referenced | points to nonexistent `LoginModal.component` and `SignupModal.component`; imported only by noncanonical router helpers |
| `DirectAppRoutes.tsx` | lines 9-18 | dormant | no consumer from canonical `App.tsx`; combines the legacy auth tree |
| `routes/index.ts` | lines 8-17 | dormant | constructs another browser router, but canonical `App.tsx` does not import it |
| Development login tools | `frontend/src/components/DevTools/` | active development-only code | environment-gated diagnostics, not the public login surface |

The three noncanonical routing files are candidates for a later cleanup decision,
not deletion targets in this feature pass.

## Backend route ownership and shadow audit

Mount order for the touched path:

1. `backend/core/routes.mjs:303` — `/api/auth` → `authRoutes`.
2. `backend/core/routes.mjs:309` — `/api/auth` → `userManagementRoutes`.

`authRoutes` owns `/login`, `/register`, token, logout, validation, and profile
endpoints. The later user-management router exposes only `/users`, `/clients`,
`/trainers`, and `/user...` (`userManagementRoutes.mjs:355-692`), so it cannot
shadow `/api/auth/login` or the new `/api/auth/oauth/...` namespace.

A separate duplicate orientation mount exists at `core/routes.mjs:404` and again
through the generic `/api` router at line 808. It is out of scope and is not being
changed during authentication modernization.

## Onboarding and compliance boundary

- `ClientOnboardingLaunchCard.tsx:17-18,32,93,122-126` explicitly implements
  onboarding after signup as a dismissible dashboard action, “never as a wall.”
- `ClientHomeTab.tsx:47-52` mounts that launch card on the client dashboard.
- `shouldRedirectClientToOnboarding` exists only in its logic file and tests; no
  runtime caller was found, so there is no active onboarding redirect gate to remove.
- Waiver enforcement remains separate: the frontend redirects at
  `protected-route.tsx:296`; backend gating is defined by
  `waiverGate.mjs:15-90`. This compliance control is preserved.

## Candidate archive or move list

| Candidate | Current evidence | Required before any move |
|---|---|---|
| `frontend/src/routes/authentication-routes.tsx` | stale imports and no canonical router reachability | confirm no external/tooling consumer, update source-lock tests, Sean approval |
| `frontend/src/DirectAppRoutes.tsx` | no canonical consumer | full import and dynamic-import check, Sean approval |
| `frontend/src/routes/index.ts` | competing unused router | full import and build-entry check, Sean approval |

These are **likely cleanup candidates pending Phase 2 approval**, not “safe to
delete” claims.

## Recurrence and ignore policy

Existing ignore rules already cover dependency folders, logs, screenshots, and
common QA/temp output. No new recurring repository artifact class was introduced,
so this pass proposes no `.gitignore` change. The external `C:/tmp/auth-*` captures
are explicitly tracked in the task handoff until removed.

## Authentication schema cross-check

| Model | Authoritative columns | Runtime callers | Result |
|---|---|---|---|
| `AuthIdentity` | `id`, `userId`, `provider`, `providerSubject`, `emailVerifiedAt`, `lastUsedAt`, plus timestamps (`models/AuthIdentity.mjs:13-45`) | `services/auth/federatedAccountService.mjs:67-117` | every referenced field exists; unique provider-subject and user-provider constraints match the migration |
| `MagicLoginToken` | `id`, `userId`, `tokenHash`, `expiresAt`, `consumedAt`, plus timestamps (`models/MagicLoginToken.mjs:12-39`) | `services/auth/magicLinkService.mjs:44-110` | every referenced field exists; raw token is intentionally absent |

Drift table:

| Caller field | Real model column | Status |
|---|---|---|
| identity `userId` | `AuthIdentity.userId` | match |
| identity `provider` | `AuthIdentity.provider` | match |
| identity `providerSubject` | `AuthIdentity.providerSubject` | match |
| identity `emailVerifiedAt` | `AuthIdentity.emailVerifiedAt` | match |
| identity `lastUsedAt` | `AuthIdentity.lastUsedAt` | match |
| magic `userId` | `MagicLoginToken.userId` | match |
| magic `tokenHash` | `MagicLoginToken.tokenHash` | match |
| magic `expiresAt` | `MagicLoginToken.expiresAt` | match |
| magic `consumedAt` | `MagicLoginToken.consumedAt` | match |

The repo-wide caller sweep found no route/controller/service reference to a nonexistent column for either new model.
## Phase 1 result

No repository file was moved, archived, or deleted. The canonical login and its
backend owner are unambiguous; the onboarding/compliance boundary is verified;
and noncanonical route helpers are documented for a separate cleanup decision.
# Swan Support — Scoped Hygiene Inventory

**Date:** 2026-07-16
**Scope:** Report Room route, error, voice, notification, authorization, and model surfaces
**Mode:** Read-only classification; no moves, deletions, or archive operations authorized

## 1. Root Inventory

The isolated branch root is lean and follows the repo's operating structure:

- Active operating files: `AGENTS.md`, `CLAUDE.md`, `ACTIVE-INDEX.md`.
- Runtime code: `frontend/`, `backend/`.
- Active documentation and handoffs: `docs/`, `.ai-workflow/`.
- Tooling and QA: `scripts/`, `tests/`, `test-results/`.
- Historical material: `archive/` and documented archive subtrees.
- Package/config files: root package manifests, lockfiles, environment examples, and deployment configuration.

No new root-level screenshot, ad hoc log, export, or temporary report was created by Slice 0.

## 2. Competing and Adjacent Surface Inventory

| Item                                                 | Classification                     | Evidence                                                                                                 | Disposition                                                                     |
| ---------------------------------------------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `/user-dashboard` / `UserDashboardV3`                | active runtime code                | `frontend/src/routes/main-routes.tsx:742-756`                                                            | Canonical user entry area.                                                      |
| `/dashboard/client/overview` / `ClientDashboardHome` | active runtime code                | `frontend/src/components/DashBoard/UniversalDashboardLayout.routes.tsx:192-195` and mounted caller chain | Canonical dashboard client entry area.                                          |
| `/dashboard/coach-assistant`                         | active runtime code                | `frontend/src/components/DashBoard/UniversalDashboardLayout.routes.tsx:213`                              | Canonical Swan Coach surface; adjacent, not the issue domain.                   |
| `/contact`                                           | active runtime code                | `frontend/src/routes/main-routes.tsx:364-369`; `backend/routes/contactRoutes.mjs:80-136`                 | Public contact fallback; do not overload.                                       |
| Client dashboard Help entry                          | active UI with missing destination | `frontend/src/components/DashBoard/Pages/client-dashboard/ClientDashboardHome.sections.tsx:101`          | Later support UI slice may retarget after route exists.                         |
| Footer Contact Support link                          | active UI                          | `frontend/src/components/Footer/CompactFooter.tsx:81`                                                    | Currently points to `/contact`; later product decision, not Slice 0 cleanup.    |
| `ProcessingOverlay` support fallback                 | active UI                          | `frontend/src/components/ui/ProcessingOverlay.tsx:145-146`                                               | Currently points to `/contact`; candidate later integration.                    |
| App error boundary                                   | active runtime code                | `frontend/src/App.tsx:226-228`                                                                           | Canonical global boundary.                                                      |
| Route error boundary                                 | active runtime code                | `frontend/src/routes/main-routes.tsx:320`                                                                | Canonical route boundary.                                                       |
| User dashboard V3 boundary                           | active runtime code                | `frontend/src/components/UserDashboard/UserDashboardStatusStatesV3.tsx:73-105`                           | Canonical dashboard boundary.                                                   |
| `UserDashboard/components/ErrorBoundary.tsx`         | orphaned candidate                 | Only test consumer found in scoped search                                                                | Requires a separate final reference check before any cleanup proposal advances. |
| `p0Monitoring.mjs` correlation middleware            | dormant                            | Implementation found; no application mount/import found                                                  | Do not claim as live or delete. Evaluate separately if reused.                  |
| Report Room route/API/models                         | planned/unimplemented blueprint    | No mounted consumer, backend route, model, or migration found                                            | Build only after Slice 0 approval.                                              |

## 3. Duplicate Route and Feature Inventory

### Notifications

`backend/routes/notificationRoutes.mjs` is mounted directly at `/api/notifications` by `backend/core/routes.mjs:346` and again through the generic `/api` router via `backend/routes/api.mjs:36`. This is a pre-existing duplicate mount chain.

`backend/routes/notificationsRoutes.mjs` also exists, but no verified importer or mount was found. It is a dormant/legacy candidate, not an authorized deletion target.

### Error boundaries

Multiple error boundaries are legitimate because they protect different canonical scopes. The unmounted UserDashboard-local boundary is the only cleanup candidate identified, pending a separate full reference and history check.

### Contact versus issue reporting

The public contact form and proposed authenticated Report Room are separate product domains. Treating them as duplicates would erase required status tracking, diagnostics, privacy controls, owner-only access, and AI-ready prompt generation.

### Swan Coach versus issue reporting

Swan Coach is a valid conversational entry point, not the persistence or workflow owner. Issue records, status transitions, internal notes, and audit history belong to the new issue domain.

## 4. Active / Archive / Planned Classification

| Group                                                                                 | Classification                                                         |
| ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `frontend/src/routes/main-routes.tsx` and verified dashboard route tables             | active runtime code                                                    |
| Verified dashboard, Swan Coach, error-boundary, contact, notification, and auth files | active runtime code                                                    |
| Slice 0 receipt and this inventory                                                    | active reference docs for the support workstream                       |
| Fable-approved Report Room build prompt                                               | active reference / approved product blueprint                          |
| Report Room UI, APIs, models, migrations, and owner inbox                             | planned/unimplemented blueprint                                        |
| Existing repo `archive/` contents                                                     | archive-only historical record unless `ACTIVE-INDEX.md` says otherwise |
| This isolated worktree                                                                | QA/implementation workspace, not a product artifact                    |

## 5. Candidate Archive or Move List

No file is approved for move, archive, or deletion in this slice.

Possible candidates for a later, separate cleanup pass:

- `frontend/src/components/UserDashboard/components/ErrorBoundary.tsx` — appears unmounted based on the current scoped grep; requires import, route, test, and git-history review.
- `backend/routes/notificationsRoutes.mjs` — appears unmounted based on the current scoped grep; requires final importer, dynamic import, and route-registration review.

The duplicate singular notification mount is runtime behavior, not a file-placement problem. Any consolidation would be a separate backend route change with regression tests.

## 6. Recurring Artifact and `.gitignore` Review

This scoped scan found no newly recurring support-workstream artifact class. No `.gitignore` amendment is proposed.

## 7. Post-Slice Hygiene Result

- New temp artifacts: none inside the repo.
- New screenshots: none.
- New debate docs: none.
- New active reference docs: this inventory and the Slice 0 verification receipt, both intentionally stored under `docs/ai-workflow/`.
- New obsolete files: none.
- Physical cleanup performed: none.

This inventory satisfies the non-destructive Phase 1 hygiene requirement for the support surface. Cleanup remains separate from feature implementation and requires Sean's explicit approval.

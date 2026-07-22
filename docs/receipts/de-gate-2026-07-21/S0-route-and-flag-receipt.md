---
decision: Canonical surface, route ownership, and flag-plumbing receipt before design de-gating
status: verified-current-state
supersedes: none
---

# S0 Route and Flag Receipt

**Baseline:** `origin/main @ eb4bbdd63794d0d842f5e5c107254f8013544367`

## Canonical Surface Receipt

| Surface | Real route mount | Mounted JSX / current seam | Original branch | Design branch |
|---|---|---|---|---|
| Home `/` | `frontend/src/routes/main-routes.tsx:368` | `HomePage` is `HomeGate > HomePage.V4` at `:73-76` | `pages/HomePage/components/HomePage.V4.tsx` | `pages/HomePage/v-next/HomeVNext.tsx` |
| Contact `/contact` | `main-routes.tsx:418` | `ContactPage` is `ContactGate > ContactV3` at `:113-116` | `pages/contactpage/ContactV3.tsx` | `pages/contactpage/vnext/ContactVNext.tsx` |
| About `/about` | `main-routes.tsx:426` | `AboutPage` is `AboutGate > About.V4` at `:126-129` | `pages/about/About.V4.tsx` | `pages/about/v-next/AboutVNext.tsx` |
| Gallery `/gallery` | `main-routes.tsx:434` | lazy `GatedGalleryPage` declared at `:98-103` and mounted by the route | `pages/GalleryPage.tsx` | `pages/gallery-vnext/GalleryVNext.tsx` |
| Video `/video-library` | `main-routes.tsx:498` | `VideoLibraryPage` is `VideoGate > VideoLibraryV3` at `:164-167` | `pages/VideoLibraryV3.tsx` | `pages/video-vnext/VideoLibraryVNext.tsx` |
| Store `/store` | `main-routes.tsx:554` | `StorePage` is `StoreGate > StoreV3` at `:197-200` | `pages/shop/StoreV3.tsx` | `pages/shop/store-v4/StoreV4.tsx` |
| Dashboard `/dashboard/*` | `main-routes.tsx:943` | `DashboardV2RouteGate > UniversalDashboardLayout` at `:947-949` | `components/DashBoard/UniversalDashboardLayout.tsx` | `components/DashBoard/v2/shell/DashboardShell.tsx` |

### Consumer hook/service and exact API literal

Each design surface resolves flags independently rather than through a global provider:

- Home: `HomeGate.tsx:8,48` -> `HomePage/v-next/flags.ts:24` -> literal `/api/config/public-flags`.
- Store: `StoreGate.tsx:9,50` -> `store-v4/flags.ts:27` -> literal `/api/config/public-flags`.
- About: `AboutGate.tsx:7,44` -> `about/v-next/flags.ts:23` -> literal `/api/config/public-flags`.
- Contact: `ContactGate.tsx:8,45` -> `contactpage/vnext/flags.ts:23` -> literal `/api/config/public-flags`.
- Video: `VideoGate.tsx` -> `video-vnext/flags.ts:23` -> literal `/api/config/public-flags`.
- Gallery: `GalleryGate.tsx` -> `gallery-vnext/flags.ts:35` -> literal `/api/config/public-flags`.
- Dashboard: `DashboardV2RouteGate.tsx` -> `DashboardGate.tsx:7,48` -> `components/DashBoard/v2/flags.ts:37` -> literal `/api/config/public-flags`.

All seven flag modules import `previewOverride` from `frontend/src/config/previewFlags.ts`; therefore the `?swanpreview=` mechanism has no surviving consumer after the design flags are removed.

### Backend route match and shadow audit

- `backend/core/routes.mjs:291` mounts `publicConfigRoutes` at `/api/config`.
- `backend/routes/publicConfigRoutes.mjs:22` declares `router.get('/public-flags', ...)`, producing the exact touched path `GET /api/config/public-flags`.
- Repo-wide mount search found no second `/api/config` mount and no overlapping `/api/config/public-flags` handler. No route-shadow condition exists for the touched path.
- `backend/core/routes.mjs:455` mounts `adminFlagRoutes` at `/api/admin/flags`; that is a separate authenticated surface and does not shadow the public route.

### Authoritative schema fields

No Sequelize model is touched by this work. Launch Control uses migration-defined tables:

- `flags`: `flag`, `label`, `grp`, `parent_flag`, `health_threshold`, `created_at` (`20260720120000-launch-control.cjs:21-30`).
- `flag_overrides`: `flag`, `value`, `mode`, `roles`, `pct`, `starts_at`, `updated_by`, `updated_at` (`:32-43`); `flag` references `flags(flag) ON DELETE CASCADE` at `:33`.
- `flag_audit`: `id`, `flag`, `action`, `old_value`, `new_value`, `reason`, `actor_id`, `created_at` (`:45-53`). It has no foreign key to `flags`, so removing registry rows does not remove audit history.

## Surface Classification Table — before implementation

The route tree intentionally contains two runtime variants per surface. The live flag response and screenshots resolve which branch is visible today, while Sean's directive resolves the target state.

| Files / surface | Current classification | Evidence / target resolution |
|---|---|---|
| `HomeGate.tsx`, `HomePage.V4.tsx`, `v-next/HomeVNext.tsx` | competing | Gate mounts both branches; production flag true and vNext capsule rail visible. Target: V4 canonical, vNext Design Studio only. |
| `StoreGate.tsx`, `StoreV3.tsx`, `store-v4/StoreV4.tsx` | competing | Production shows Store V4-only hero. Target: StoreV3 canonical, Store V4 Design Studio only. |
| `AboutGate.tsx`, `About.V4.tsx`, `v-next/AboutVNext.tsx` | competing | Production flag true and caustic hero visible. Target: About.V4 canonical. |
| `ContactGate.tsx`, `ContactV3.tsx`, `vnext/ContactVNext.tsx` | competing | Production shows vNext-only headline. Target: ContactV3 canonical. |
| `VideoGate.tsx`, `VideoLibraryV3.tsx`, `video-vnext/VideoLibraryVNext.tsx` | competing | Production shows vNext-only empty state. Target: VideoLibraryV3 canonical. |
| `GalleryGate.tsx` / `GatedGalleryPage.tsx`, `GalleryPage.tsx`, `gallery-vnext/GalleryVNext.tsx` | competing | Production shows vNext-only hero. Target: GalleryPage canonical. |
| `DashboardV2RouteGate.tsx`, `DashboardGate.tsx`, `UniversalDashboardLayout.tsx`, `v2/shell/DashboardShell.tsx` | competing | One canonical `/dashboard/*` route conditionally mounts V1 or v2. Target: V1 canonical, v2 Design Studio only. |
| `DesignPlaygroundLayout.tsx` | dormant | Only compiled/mounted when `VITE_DESIGN_PLAYGROUND=true` at `main-routes.tsx:357,914`; target is unconditional admin-only Design Studio. |
| `ADMIN_DASHBOARD_TABS` | legacy but still referenced | Not used by live sidebar; referenced by tests such as `AdminStellarSidebar.workoutFirst.test.ts`. S3 must update tests before removal. |
| `WORKSPACE_CONFIG` | active runtime code | Imported by `AdminStellarSidebar.tsx:51,166`; contains 33 entries. |

The competing-state ambiguity is resolved by Sean's explicit law in the master handoff, so implementation does not require a new product choice.

## Parked surface enumeration

The asserted set reconciles to seven design directories/components:

1. `frontend/src/pages/HomePage/v-next/`
2. `frontend/src/pages/shop/store-v4/`
3. `frontend/src/pages/about/v-next/`
4. `frontend/src/pages/contactpage/vnext/`
5. `frontend/src/pages/video-vnext/`
6. `frontend/src/pages/gallery-vnext/`
7. `frontend/src/components/DashBoard/v2/`

No eighth independent directory surfaced. The tracker’s 8/8 count treats Gallery as two program slices, not two additional runtime directories.

## S1 deletion constraints

- The public flag fetch is per-surface, so the de-gated public routes must have zero import path to flag-resolution code.
- `gallery-vnext/useGalleryCredits.ts:26` imports `ENTRY_SEARCH` from `gallery-vnext/flags.ts`; that constant must be relocated or the file retained in inert form before deleting the hook exports.
- `PrismCapture` and `postSaveHandoff` retain their separate feature-flag hooks.
- The migration may delete the seven design rows from `flags`; `flag_overrides` rows are removed through the schema's cascade or an explicit idempotent delete, while `flag_audit` remains untouched.

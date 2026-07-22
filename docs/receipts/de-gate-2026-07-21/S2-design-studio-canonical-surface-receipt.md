---
decision: restore-design-studio
status: verified-local
verified_ref: 5bb59ace1
verified_at: 2026-07-21
---

# S2 Canonical Surface Receipt — Admin Design Studio

## Target URL and mount truth

| Requirement | Current evidence | S2 decision |
|---|---|---|
| Route file mounting the target URL | `frontend/src/components/DashBoard/UniversalDashboardLayout.routes.tsx:101-114` defines admin child routes; no `/design-playground` row exists yet. | Add `/design-playground` to the admin role configuration. The outer `/dashboard/*` route is already admin/trainer/client protected in `frontend/src/routes/main-routes.tsx:892-901`. |
| Mounted JSX component | `frontend/src/components/DashBoard/UniversalDashboardLayout.shellPieces.tsx:95-107` maps each active role route and renders `<Component />`. | The new route row will mount `DesignPlaygroundLayout` through this verified JSX path. |
| Live navigation consumer | `frontend/src/config/dashboard-tabs.ts:513-570` is the live `WORKSPACE_CONFIG`; it has no Design Studio entry. `frontend/src/config/dashboard-tabs.ts:425-433` is deprecated dead config and is build-gated. | Add one live `WORKSPACE_CONFIG` item labelled exactly `Design Studio` at `/dashboard/admin/design-playground`. |
| Existing preview route | `frontend/src/routes/main-routes.tsx:308-314,865-875` gates `/designs/:id` and its lazy component behind `VITE_DESIGN_PLAYGROUND`. | Remove the env gate and keep the legacy concept viewer admin-only. Add an admin-only parked-preview route whose component imports the parked registry. |
| Consumer hook/service | None. The Design Studio is a static manifest plus local viewport selection. | No new hook or service. Parked components retain their existing read bindings and are not promoted to canonical routes. |
| Frontend API literal | Not applicable to the Design Studio shell. | Do not add an API. Existing parked components keep their existing API readers. |
| Backend route match | Not applicable; no Design Studio API is introduced. | No backend files or routes in S2. |
| Authoritative model fields | Not applicable; no model is read or changed by the Studio shell. | No schema work in S2. |

## Surface classification before edits

| Surface | Classification | Evidence |
|---|---|---|
| `/dashboard/admin/design-playground` | dormant / missing | No matching admin route in `UniversalDashboardLayout.routes.tsx:101-171`; only dead legacy nav config at `dashboard-tabs.ts:425-433`. |
| `/designs/:id` legacy concept viewer | dormant build-gated | `main-routes.tsx:865-875` omits it unless `VITE_DESIGN_PLAYGROUND=true`; `DesignPlaygroundLayout.tsx:215-297` is the mounted viewer when enabled. |
| Original public Home, Store, About, Contact, Video, Gallery | canonical | Direct route components were verified and de-gated in S1 receipt `S1-degate-verification.md`. |
| HomeVNext, StoreV4, AboutVNext, ContactVNext, VideoLibraryVNext, GalleryVNext, DashboardShell v2 | parked | Their canonical route imports were removed in S1; their implementation directories remain and compile. |

## Auth and side-effect boundary

- `/dashboard/admin/design-playground`, `/designs/:id`, and `/design-previews/:id` must all remain behind the existing admin role guard.
- The Studio banner must say `PREVIEW — not live`.
- Preview imports may exist only in `frontend/src/pages/DesignPlayground/playgroundRegistry.ts`; public canonical routes must never import that registry.
- Promotion means replacing a canonical route import in a normal reviewed commit. No flag, env key, or Launch Control switch may promote a design.
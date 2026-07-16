# Superseded Public Roots and Dashboard Menu Archive - 2026-07-16

## Purpose

This companion manifest records superseded public page roots and a closed legacy dashboard menu island moved during the pre-launch audit. Original paths remain recoverable; no file was deleted.

## Canonical replacements

- `/` mounts `HomePage.V4` with `HomePage.V3` fallback (`main-routes.tsx:59-61,320-324`).
- `/contact` mounts `ContactV3` with `ContactV2` fallback (`main-routes.tsx:84-86,360-364`).
- `/waiver` mounts `PublicWaiverPage.V3` with V2 fallback (`main-routes.tsx:102-104,412-416`).
- `/video-library` mounts `VideoLibraryV3` with V2 fallback (`main-routes.tsx:119-121,440-444`).
- `/store`, `/swanstudios-store`, and `/shop` mount `StoreV3` with V2 fallback (`main-routes.tsx:144-146,496-516`).
- Universal Dashboard navigation is supplied by the mounted Stellar sidebars and route registry; no importer consumes `DashBoard/MenuList`.

## Exact file inventory

| Original path | Archived path | Classification |
| --- | --- | --- |
| `frontend/src/pages/PublicWaiverPage.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/pages/PublicWaiverPage.tsx` | superseded unmounted public UI |
| `frontend/src/pages/PublicWaiverPage.test.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/pages/PublicWaiverPage.test.tsx` | source-only test for archived legacy page |
| `frontend/src/pages/VideoLibrary.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/pages/VideoLibrary.tsx` | superseded unmounted public UI |
| `frontend/src/pages/contactpage/EnhancedContactPage.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/pages/contactpage/EnhancedContactPage.tsx` | superseded unmounted public UI |
| `frontend/src/pages/contactpage/index.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/pages/contactpage/index.tsx` | unused barrel for archived contact page |
| `frontend/src/pages/shop/OptimizedGalaxyStoreFront.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/pages/shop/OptimizedGalaxyStoreFront.tsx` | superseded unmounted public UI |
| `frontend/src/pages/HomePage/components/Hero-Section.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/pages/HomePage/components/Hero-Section.tsx` | superseded unmounted public UI |
| `frontend/src/pages/HomePage/components/TrainerProfilesSection.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/pages/HomePage/components/TrainerProfilesSection.tsx` | superseded unmounted public UI |
| `frontend/src/components/DashBoard/MenuList/menu-list.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/DashBoard/MenuList/menu-list.tsx` | closed legacy dashboard menu island |
| `frontend/src/components/DashBoard/MenuList/NavCollapse/nav-collapse.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/DashBoard/MenuList/NavCollapse/nav-collapse.tsx` | closed legacy dashboard menu island |
| `frontend/src/components/DashBoard/MenuList/NavGroup/nav-group.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/DashBoard/MenuList/NavGroup/nav-group.tsx` | closed legacy dashboard menu island |
| `frontend/src/components/DashBoard/MenuList/NavItem/nav-item.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/DashBoard/MenuList/NavItem/nav-item.tsx` | closed legacy dashboard menu island |

## Restore procedure

Restore only after proving a mounted consumer and product need, then rerun the relevant route contracts, typecheck, production build, full frontend suite, lint, and browser smoke.

Permanent deletion requires a separate fresh reference check and Sean's explicit approval.

# Dormant Homepage Design Lab Archive - 2026-07-16

## Purpose

This companion manifest records an unmounted homepage design lab and its self-contained cinematic prototype tree moved during the pre-launch audit. Original paths remain recoverable; no file was deleted.

## Evidence

- Exact import and dynamic-import search found no consumer of `HomepageDesignLab.tsx`.
- No main route, Universal Dashboard route, dashboard tab, or package script mounts the lab.
- The five cinematic variants and all shared sections/utilities are reachable only from that unmounted lab.
- Canonical `/` remains `HomePage.V4` with `HomePage.V3` fallback.
- The separate `/dashboard/admin/workout-design-lab` route mounts `WorkoutDesignLabPage` and was not changed.

## Exact file inventory

| Original path | Archived path | Classification |
| --- | --- | --- |
| `frontend/src/components/DashBoard/Pages/admin-design/HomepageDesignLab.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/DashBoard/Pages/admin-design/HomepageDesignLab.tsx` | unmounted design-lab root |
| `frontend/src/pages/HomePage/cinematic/ASSET-MANIFEST.md` | `archive/pending-deletion/2026-07-16/frontend/src/pages/HomePage/cinematic/ASSET-MANIFEST.md` | archive-only prototype asset manifest |
| `frontend/src/pages/HomePage/cinematic/cinematic-animations.ts` | `archive/pending-deletion/2026-07-16/frontend/src/pages/HomePage/cinematic/cinematic-animations.ts` | dependency used only by unmounted design lab |
| `frontend/src/pages/HomePage/cinematic/cinematic-shared.ts` | `archive/pending-deletion/2026-07-16/frontend/src/pages/HomePage/cinematic/cinematic-shared.ts` | dependency used only by unmounted design lab |
| `frontend/src/pages/HomePage/cinematic/cinematic-tokens.ts` | `archive/pending-deletion/2026-07-16/frontend/src/pages/HomePage/cinematic/cinematic-tokens.ts` | dependency used only by unmounted design lab |
| `frontend/src/pages/HomePage/cinematic/HomepageContent.ts` | `archive/pending-deletion/2026-07-16/frontend/src/pages/HomePage/cinematic/HomepageContent.ts` | dependency used only by unmounted design lab |
| `frontend/src/pages/HomePage/cinematic/sections/CinematicCreative.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/pages/HomePage/cinematic/sections/CinematicCreative.tsx` | dependency used only by unmounted design lab |
| `frontend/src/pages/HomePage/cinematic/sections/CinematicFeatures.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/pages/HomePage/cinematic/sections/CinematicFeatures.tsx` | dependency used only by unmounted design lab |
| `frontend/src/pages/HomePage/cinematic/sections/CinematicFooter.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/pages/HomePage/cinematic/sections/CinematicFooter.tsx` | dependency used only by unmounted design lab |
| `frontend/src/pages/HomePage/cinematic/sections/CinematicHero.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/pages/HomePage/cinematic/sections/CinematicHero.tsx` | dependency used only by unmounted design lab |
| `frontend/src/pages/HomePage/cinematic/sections/CinematicNavbar.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/pages/HomePage/cinematic/sections/CinematicNavbar.tsx` | dependency used only by unmounted design lab |
| `frontend/src/pages/HomePage/cinematic/sections/CinematicNewsletter.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/pages/HomePage/cinematic/sections/CinematicNewsletter.tsx` | dependency used only by unmounted design lab |
| `frontend/src/pages/HomePage/cinematic/sections/CinematicPrograms.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/pages/HomePage/cinematic/sections/CinematicPrograms.tsx` | dependency used only by unmounted design lab |
| `frontend/src/pages/HomePage/cinematic/sections/CinematicSocialFeed.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/pages/HomePage/cinematic/sections/CinematicSocialFeed.tsx` | dependency used only by unmounted design lab |
| `frontend/src/pages/HomePage/cinematic/sections/CinematicStats.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/pages/HomePage/cinematic/sections/CinematicStats.tsx` | dependency used only by unmounted design lab |
| `frontend/src/pages/HomePage/cinematic/sections/CinematicTestimonials.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/pages/HomePage/cinematic/sections/CinematicTestimonials.tsx` | dependency used only by unmounted design lab |
| `frontend/src/pages/HomePage/cinematic/sections/CinematicTrainers.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/pages/HomePage/cinematic/sections/CinematicTrainers.tsx` | dependency used only by unmounted design lab |
| `frontend/src/pages/HomePage/cinematic/sections/index.ts` | `archive/pending-deletion/2026-07-16/frontend/src/pages/HomePage/cinematic/sections/index.ts` | dependency used only by unmounted design lab |
| `frontend/src/pages/HomePage/cinematic/variants/EmberRealm.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/pages/HomePage/cinematic/variants/EmberRealm.tsx` | dependency used only by unmounted design lab |
| `frontend/src/pages/HomePage/cinematic/variants/FrozenCanopy.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/pages/HomePage/cinematic/variants/FrozenCanopy.tsx` | dependency used only by unmounted design lab |
| `frontend/src/pages/HomePage/cinematic/variants/NebulaCrown.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/pages/HomePage/cinematic/variants/NebulaCrown.tsx` | dependency used only by unmounted design lab |
| `frontend/src/pages/HomePage/cinematic/variants/ObsidianBloom.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/pages/HomePage/cinematic/variants/ObsidianBloom.tsx` | dependency used only by unmounted design lab |
| `frontend/src/pages/HomePage/cinematic/variants/TwilightLagoon.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/pages/HomePage/cinematic/variants/TwilightLagoon.tsx` | dependency used only by unmounted design lab |

## Restore procedure

Restore only after defining and mounting an approved admin route, then rerun homepage and dashboard route contracts, typecheck, production build, full frontend suite, lint, and browser smoke.

Permanent deletion requires a separate fresh reference check and Sean's explicit approval.

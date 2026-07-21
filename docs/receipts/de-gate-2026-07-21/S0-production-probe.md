---
decision: S0 live-production probe for the design de-gating workstream
status: blocked-on-authenticated-click-pass
supersedes: none
---

# S0 Production Probe — De-Gate Design Overhaul

**Probe time:** 2026-07-21T10:12:40-07:00
**Code baseline:** `origin/main @ eb4bbdd63794d0d842f5e5c107254f8013544367`
**Production origin:** `https://sswanstudios.com`

## Material delta from the master handoff

The handoff expected all redesign flags false or absent and the original public pages visible. The live probe contradicts both assumptions:

- `GET /api/config/public-flags` returned HTTP 200 with all seven design flags `true`.
- Read-only Playwright screenshots show vNext-only copy or structure on Home, Store, Contact, Video, and Gallery; About shows the vNext caustic-swan hero.
- Therefore S1 is a visible production rollback to the original designs, not a no-op removal of dark gates.
- The user directive still resolves the product decision: the original components become the unconditional public routes and the redesigns move to Design Studio.

## Public route evidence

| URL | HTTP | Rendered marker | Current classification | Evidence |
|---|---:|---|---|---|
| `/` | 200 | Capsule rail below `Health First. Community Always.` | vNext live | `HomeVNext.tsx:50-57`; `C:/tmp/degate-s0-home-viewport.png` |
| `/store` | 200 | `Coaching, made a commitment.` | Store V4 live | `StoreV4.tsx:87`; `StoreV4Hero.tsx:54-62`; `C:/tmp/degate-s0-store.png` |
| `/about` | 200 | caustic outlined swan behind `Achieve Your Best Self` | About vNext live | `AboutVNext.tsx:37`; `AboutHero.tsx:137-145`; `C:/tmp/degate-s0-about-viewport.png` |
| `/contact` | 200 | `Let’s start your training.` | Contact vNext live | `ContactVNext.tsx:197-220`; `C:/tmp/degate-s0-contact-viewport.png` |
| `/video-library` | 200 | vNext empty-state copy `No videos match your search yet...` | Video vNext live | `VideoLibraryVNext.tsx:72-102`; `C:/tmp/degate-s0-video-viewport.png` |
| `/gallery` | 200 | `Every moment, immortalized.` | Gallery vNext live | `GalleryVNext.tsx:167`; `EventsView.tsx:42-49`; `C:/tmp/degate-s0-gallery-viewport.png` |

All six HTML document requests returned the shared SPA title `Swan Studios - Personal Training / Social Health / And More!`; the rendered markers above were captured after a 4-second browser wait.

## Public flags before de-gating

Raw response saved as `public-flags.before.json`:

```json
{
  "dashboardV2": true,
  "dashboardV2Finance": true,
  "storeV4": true,
  "homeVNext": true,
  "aboutVNext": true,
  "videoVNext": true,
  "contactVNext": true,
  "galleryVNext": true,
  "prismCapture": true,
  "postSaveHandoff": true
}
```

This endpoint does not reveal whether each `true` came from a Render env baseline or a `flag_overrides` row. That distinction requires the authenticated Launch Control read-only check.

## Protected-feature verdicts

- `prismCapture`: preserved on the original Home branch because `HomePage.V4.tsx:18,75` imports and mounts `PrismCapture` independently of `HomeGate`.
- `dashboardV2Finance`: consumed by `components/DashBoard/v2/flags.ts:37-50` and passed into the v2 shell; no V1 consumer was found. It becomes dormant when dashboard v2 parks, but remains registered per the handoff.
- `postSaveHandoff`: separate consumer at `WorkoutLogger/handoff/usePostSaveHandoffFlag.ts:29`; no de-gating edit is authorized against it.
- Restore: `claude/recovery-compass-20260721 @ be85545c7` was not merged into this baseline at probe time, so it is outside the current branch rather than a mainline surface to regression-test yet.

## S0 blocker

The authenticated 33-link admin sidebar click-pass and Launch Control row inspection require Sean's existing production session. No credentials were requested or used. Record those results in `S0-admin-sidebar-click-pass.md` before treating S0 as complete.

## Temp artifacts

The probe created screenshots and one temporary browser script under `C:/tmp`:

- `degate-s0-home.png`, `degate-s0-home-viewport.png`, `degate-s0-home-viewport.jpg`
- `degate-s0-store.png`
- `degate-s0-about.png`, `degate-s0-about-viewport.png`
- `degate-s0-contact-viewport.png`, `degate-s0-contact-viewport.jpg`
- `degate-s0-video-viewport.png`, `degate-s0-gallery-viewport.png`
- `degate-s0-probe.cjs`

These are QA/temp artifacts, not production inputs. No cleanup is authorized in this phase.

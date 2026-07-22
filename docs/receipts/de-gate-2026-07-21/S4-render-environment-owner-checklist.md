---
decision: owner-only-render-environment-cleanup
status: ready-after-batch-deploy
verified_at: 2026-07-21
contains_secret_values: false
---

# S4 — Sean's 5-Minute Render Environment Checklist

Run this only after the approved S5 batch is deployed and the migration has completed. This checklist names keys only. Do not copy, reveal, or change any existing secret or feature value.

Render topology: `render.yaml:7-38` defines `swanstudios-main`, which builds both backend and frontend, while `render.yaml:69-100` defines the separate `swanstudios-frontend` static build. Check both services for frontend `VITE_*` keys.

## 1. Backend service — remove retired design controls

In the `swanstudios-main` Render service environment, delete/unset these seven backend keys if present. Remove the key; do not set it to `false`.

- [ ] `HOME_VNEXT_ENABLED`
- [ ] `STORE_V4_ENABLED`
- [ ] `ABOUT_VNEXT_ENABLED`
- [ ] `CONTACT_VNEXT_ENABLED`
- [ ] `VIDEO_VNEXT_ENABLED`
- [ ] `GALLERY_VNEXT_ENABLED`
- [ ] `DASHBOARD_V2_ENABLED`

Keep these three approved feature baselines. Do not change their current values during this cleanup.

- [ ] `DASHBOARD_V2_FINANCE` remains present/current
- [ ] `PRISM_CAPTURE_ENABLED` remains present/current
- [ ] `ENABLE_POST_SAVE_HANDOFF` remains present/current

## 2. Frontend/static service — remove retired build fallbacks

In both `swanstudios-main` and `swanstudios-frontend`, delete/unset these design-preview or redesign keys if present:

- [ ] `VITE_HOME_VNEXT`
- [ ] `VITE_STORE_V4`
- [ ] `VITE_ABOUT_VNEXT`
- [ ] `VITE_CONTACT_VNEXT`
- [ ] `VITE_VIDEO_VNEXT`
- [ ] `VITE_GALLERY_VNEXT`
- [ ] `VITE_DASHBOARD_V2`
- [ ] `VITE_DESIGN_PLAYGROUND`

Two older frontend-only dashboard keys have no live consumer after de-gating. Remove them if present so they cannot become a future surprise:

- [ ] `VITE_DASHBOARD_V2_FINANCE`
- [ ] `VITE_ENABLE_NEW_DASHBOARD`

The approved finance feature baseline remains the backend key `DASHBOARD_V2_FINANCE`.

## 3. Save and let Render finish

- [ ] Save the backend environment changes.
- [ ] Save the frontend/static environment changes.
- [ ] Let any Render-triggered deploys finish before verification.
- [ ] Do not manually delete `flag_overrides` rows. The S1 migration removes retired design registry rows and their overrides through the existing foreign-key cascade.
- [ ] Do not edit or delete `flag_audit`; it is append-only history.

## 4. Five-minute verification

- [ ] Open `/api/config/public-flags`. Its object has exactly three keys: `dashboardV2Finance`, `prismCapture`, and `postSaveHandoff`.
- [ ] Open Admin → Launch Control. It shows exactly those same three feature switches and no design surface.
- [ ] Open Home, Store, About, Contact, Video, and Gallery. Each is the original canonical page.
- [ ] Open one admin, one trainer, and one client dashboard. Each uses the original `UniversalDashboardLayout`.
- [ ] Open Admin → Design Studio. The seven parked redesigns are available as previews and marked `PREVIEW — not live`.
- [ ] Complete Sean's admin sidebar click-pass. Record any actual failure before changing a route.

## Builder verification

- Hostile review found and corrected the two-service Render topology trap: frontend build variables must be checked in both Render services.
- TDD red proved the dormant Redux VITE_ENABLE_NEW_DASHBOARD read still existed; the focused de-gating contract is now green 4/4 after its removal.
- Stale parked-Home comments that described the retired gate were rewritten as feature-parity guidance.
- Runtime source grep has zero hits for the seven retired backend design keys and the retired frontend design/build keys listed above.
- Focused S1/S2/S4 design contracts passed 16/16, and the 12 GB TypeScript compiler verification exited 0 after the hostile repair.
- No Render API or dashboard mutation was performed while preparing this checklist.
- Fresh hostile review is dry for S4.
## Stop conditions

Stop and report the exact key name or URL—never a secret value—if:

- the public-flags response contains a fourth key or any retired design key;
- Launch Control is missing one of the three approved feature switches;
- a canonical public page renders a parked redesign;
- Design Studio is missing or publicly accessible without admin authentication;
- an admin sidebar link reproduces a real 404/redirect defect.

## Rollback boundary

Do not restore retired design environment keys as a rollback. If the approved batch itself causes a production regression, use the release rollback/revert path and preserve the three feature baselines. The de-gate migration's down path restores registry metadata only; it intentionally does not resurrect historical overrides.

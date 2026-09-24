# G08 build evidence — 2026-09-11

## Changes
1. NEW backend/services/ai/dashboardSurfaceRegistry.mjs (267 lines): all 24
   domains D01-D24 in packet 19's surface-adapter shape; Map-based lookup
   (prototype-key probe proof); getSurfaceCapabilityManifest enforces role
   visibility server-side and returns declarations only; activation
   receipt-gated: D01/D02/D03/D05(read)/D11/D13/D19(read-only) active on
   G01-G07 receipts; D07/D09/D10/D17/D22 contract-fixed explain; all other
   waves explain with working manual fallback routes.
2. NEW frontend/src/services/dashboardSurfaceContext.ts (71 lines): route ->
   surfaceKey context mapper; segment-scoped wildcard patterns; longest-match
   wins; unknown paths resolve null (explain-only).
3. NEW DA contract tests: backend 6 tests (completeness, DA-01 scoped
   declarations, DA-02 role/unknown deny, DA-03 hostile probes, DA-07 active
   rows' commandKeys exist in the real registry + refreshKeys declared,
   DA-08 explain rows declare no capabilities + fixed explain rows) and
   frontend 5 tests.

## Slice-internal hostile review — findings fixed
- F1 route variant gap: '/dashboard/workout-logger' fell through to D23.
- F2 suffix-wildcard semantics: '*' now segment-scoped [^/]*, matching the
  backend pattern strings ('/dashboard/*/pain*').
- F3 active-row capability honesty: reviewed_write capability only emitted
  when the row actually carries commandKeys.
- F4 (design, disclosed) manifest serving endpoint intentionally out of this
  slice; the registry is import-consumable and the wiring slice can attach it
  to the existing ai-command surface without contract change.

## Known limitations (disclosed)
- Wave 2-4 write adapters remain explain rows BY CONTRACT until their own
  writer receipts exist; authenticated journeys over all 127 entries belong
  to G11's browser/release matrix.

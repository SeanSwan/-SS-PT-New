# G08 tests evidence — 2026-09-11

## RED story (honest labeling)
New-module contracts: the registry and mapper did not exist, so a pre-
implementation run would fail at import level, which the build protocol does
NOT accept as valid RED. The contract tests were WRITTEN FIRST and then
observed GREEN after implementation (green-lock). Two behavioral REDs did
occur during implementation against real behavior:
- frontend mapper: '/dashboard/workout-logger' resolved to D23 (missing route
  variant) and '/dashboard/admin/pain-tracker' resolved to D23 (dropped
  suffix wildcard) — both assertion failures observed and fixed.

## GREEN
- backend: tests/unit/dashboardSurfaceRegistry.da.test.mjs 6/6 (includes
  commandKey membership proof against the initialized 139-command registry).
- frontend: src/services/dashboardSurfaceContext.test.ts 5/5.
- tsc --noEmit: exit 0, zero errors (WSL Node 22, 10GB heap).
- vite build: exit 0. ESM import smoke SMOKE_PASS.

## Baseline (rule 56)
Backend coach suite and frontend coach-assistant suite verified clean/G06-G07
baselines earlier this session; this slice adds new files only (no regression
surface). Slice-clean equals baseline-clean for touched directories.

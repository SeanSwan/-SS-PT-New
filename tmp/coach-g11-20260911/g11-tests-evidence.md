# G11 tests evidence — 2026-09-11 (full logs in this directory)

- backend-full.log: full backend vitest — 10,232 pass / 15 fail (pre-existing, proven)
- backend-truehead-baseline.log: 11 of 12 failing files re-run at 0c96142f2 — identical failures
- frontend-full.log: full frontend vitest — 8,529 pass / 5 fail (all pre-existing, proven)
- tsc.log: tsc --noEmit exit 0 (WSL Node 22, 10GB heap)
- build.log: vite build exit 0
- physical-confirm-baseline.log: inconclusive harness attempt; superset proof used instead
  (zero-overlap import closure, 0 files in 0c96142f2..HEAD touch the confirmation lane)
- node:test calculator suite: 8/8 pass
- migrations: node --check OK on both coach_facts migrations
- modelRegistryDrift: 8/8 PASS after CoachFact associations wiring
- incidents: root package.json stash-pop conflict resolved to HEAD (uncommitted, committed nowhere);
  backend/node_modules wiped by junction cleanup during baseline proof — restored via exact npm ci

# S01 H21 — blend UUID preservation

Status: implementation verified locally.

Base revision: `c0cbe538d8ed2ca519bb494cdf3282bf43b76699`.

Changed application files:

- `frontend/src/components/DashBoard/Pages/admin-workout-planner/WorkoutPlannerBlendDialog.tsx`
- `frontend/src/components/DashBoard/Pages/admin-workout-planner/WorkoutPlannerBlendDialog.test.tsx`

The dialog now sends `planAId` and `planBId` as the canonical strings held by
the component. The tracked component suite keeps the legacy string-ID case,
adds parameterized digit-start and letter-start UUID cases, and checks title
trimming. No backend, route, planner, search, focus, or other-lane files
changed.

## Observed RED

The existing isolated UUID acceptance failed before the patch: the request body
contained `planAId: 550` and `planBId: 6` for UUIDs beginning with those digits.
Raw output: `s01-red-uuid-native.log`.

## Observed GREEN

Standalone UUID acceptance:

```powershell
$env:NODE_ENV='test'; node frontend/node_modules/vitest/vitest.mjs run --config tmp/rolodex-audit-evidence/red/vitest.config.ts --pool forks --maxWorkers 1 --reporter verbose --testTimeout 10000 tmp/rolodex-audit-evidence/red/blend-dialog-uuid.red.test.tsx
```

Result: 1 file passed, 1 test passed. The final rerun is
`s01-green-uuid-final.log`.

Exact component suite, run from `frontend`:

```powershell
$env:NODE_ENV='test'; node node_modules/vitest/vitest.mjs run --config vitest.config.ts --pool forks --maxWorkers 1 --reporter verbose --testTimeout 10000 src/components/DashBoard/Pages/admin-workout-planner/WorkoutPlannerBlendDialog.test.tsx
```

Result: 1 file passed, 7 tests passed. The final rerun is
`s01-green-component-regression.log`.

`git diff --check` passed; Git emitted only existing LF-to-CRLF normalization
warnings. API behavior is verified with mocked `authAxios`; no production
browser, backend, provider, network, or deployment check was run. H10 delayed
completion and later focus work remain outside S01.

## Evidence hashes

SHA-256 hashes are recorded in `s01-summary.json` for both changed files and all
authoritative RED/GREEN logs. Earlier green logs remain preserved as superseded
run history.

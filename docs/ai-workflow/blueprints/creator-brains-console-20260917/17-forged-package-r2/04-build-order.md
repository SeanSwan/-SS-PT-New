All files are under `C/` unless stated otherwise. Source and tests remain ≤300 canonical lines each.

| Order | File(s) | Imports / exports / responsibility | Budget |
|---|---|---|---|
| 1 | `P` current documents and readiness receipt | Preserve hashes; install this revision with supersession map | ≤300/document |
| 2 | `lib/write-gate.mjs`, `server.mjs` | Existing gate; pass validated serving origin; retain outer error handling | ≤280 each |
| 3 | `lib/published-paths.mjs` | Node fs/path; export pointer/leaf containment helpers | 240 |
| 4 | `lib/published-generation.mjs` | Path helpers; export pinned generation reader and bounded parser | 280 |
| 5 | `lib/published-query.mjs`, `lib/hits.mjs` | Reader + validated projection; export bounded scoring and `toQueryHit` | 240 each |
| 6 | `lib/brains.mjs` | Delegate drawer/query to common reader; remove unsafe second traversal | 220 |
| 7 | `lib/health-probe.mjs`, `lib/health-probe.worker.mjs`, `lib/health.mjs` | Worker ownership, epochs, timeout, root-specific history | 280 each |
| 8 | `web/src/adapters/types.ts`, `fixtures.ts`, `LocalEngineAdapter.ts`, `MockAdapter.ts` | Target DTOs, matching typed refusals, read signals | 280 each |
| 9 | `web/src/adapters/validate.ts`, `validate-derived.ts` | Existing validation pattern; export status and derived parsers | 260 each |
| 10 | `web/src/hooks/useStatus.ts`, `components/StatusBoard.tsx` | Abort timed-out reads; provenance-aware display | 280 each |
| 11 | `lib/resolve-creator.mjs`, `lib/resolve-creator.worker.mjs`, `lib/creators.mjs` | Resolver lifecycle; synchronous parent commit | 240 each |
| 12 | `web/src/components/CreatorRoster.tsx`, `AddCreatorForm.tsx`, `BrainDrawer.tsx` | Adapter-only UI, authoritative state, focus | 260 each |
| 13 | Corresponding hooks and `.styles.ts` | Separate lifecycle/styles; no global store | 220 each |
| 14 | `web/src/components/QueryConsole.tsx`, `QueryResults.tsx`, `OpsRail.tsx` | Search, canary, blocked Backup | 260 each |
| 15 | `lib/operation-slot.mjs`, `lib/repair.mjs`, `lib/repair.worker.mjs`, `routes.mjs` | Shared operation exclusion; projected repair result | 240 each |
| 16 | `lib/daily-launch.mjs`, `lib/run-observation.mjs`, `routes.mjs` | Fixed spawn and correlation | 260 each |
| 17 | `web/src/hooks/usePollingCoordinator.ts`, `useRun.ts`, `components/RunConsole.tsx` | One cadence owner; run state presentation | 260 each |
| 18 | `web/src/three/layoutBrains.ts`, `lifecycle.ts`, `BrainConstellation.tsx` | Deterministic data layout, eligibility and disposal | 260 each |
| 19 | Launcher template, `web/playwright.console.config.ts`, `web/e2e/*.spec.ts` | Actual fixture bridge and built-app verification | 260 each |
| 20 | S7 library build config and manifest tooling | Peer externals and receiving-adapter handoff | 260 each |

Tests listed in `09-tests.md` land before the corresponding implementation.

**Patterns to retain**

Literal route dispatch remains inspectable:

```js
if (req.method === 'GET' && p === '/api/creators') {
  return sendJson(res, 200, creatorRows(r));
}
```

The mounted inner boundary remains inside the shell:

```tsx
<ErrorBoundary scope="The status board">
  <StatusBoard state={status} />
</ErrorBoundary>
```

Styled-components continues using token fallbacks:

```tsx
const Panel = styled.section`
  background: var(--carbon, #141419);
  color: var(--frost-white, #E0ECF4);
  padding: var(--space-4, 16px);
`;
```

Fixture helpers remain in non-test modules. Do not import a test-registering module for its helper functions.

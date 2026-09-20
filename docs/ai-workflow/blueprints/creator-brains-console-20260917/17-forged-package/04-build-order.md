All paths are relative to `C` unless prefixed `E` or the packet directory. Every source/test file must remain ≤300 canonical lines. Split at responsibilities before exceeding the limit.

| Order / slice | Files | Purpose; imports/exports; budget |
|---|---|---|
| 1 / S0R | Existing packet, preservation manifest | Preserve owned tracked and untracked bytes; hash manifest; no source modification. |
| 2 / S0R | `server.mjs`, `api.mjs`, `lib/*`, `test/*`, launcher | Conditional relocation. Repair relative engine imports and direct-entry detection; preserve public exports. ≤300 each. |
| 3 / S0R | `test/bridge.relocation.test.mjs` | Spawn actual entry from unrelated cwd; verify store-root identity, static build location, instance exclusion. ≤220. |
| 4 / S1R | `lib/request-policy.mjs`, `lib/http.mjs`, `server.mjs` | Central write policy, fatal UTF-8, safe envelopes. Export `validateWriteRequest`. ≤220 new module. |
| 5 / S1R | `workers/health.mjs`, `lib/health-worker.mjs`, `lib/health.mjs` | Node worker probe, single-flight TTL/history; retain existing provenance behavior. ≤240 each. |
| 6 / S1R | `web/src/adapters/{types,LocalEngineAdapter,MockAdapter,validate}.ts` | Corrected contracts, custom header, read cancellation; preserve adapter seam. ≤280 each. |
| 7 / S1R | `web/src/hooks/useStatus.ts`, `components/StatusBoard.tsx` | Abort timed-out reads; label stale/history/unknown; retain error boundary. ≤280 each. |
| 8 / S2 | `workers/resolve-creator.mjs`, `lib/resolve-creator.mjs`, `lib/creators.mjs` | Resolve off-thread; parent commit; measured/null counts; one pending add. ≤240 each. |
| 9 / S2 | `lib/published-generation.mjs`, `lib/brains.mjs` | Pin/contain generation, read derived files, validate/project claims. ≤260 each. |
| 10 / S2 | `web/src/components/{CreatorRoster,AddCreatorForm,BrainDrawer}.tsx` | Forms, authoritative refresh, tabs, focus. ≤260 each. |
| 11 / S2 | `web/src/hooks/{useCreators,useBrain}.ts`, corresponding `.styles.ts` | Lifecycle and styles separated; adapter imports only. ≤220 each. |
| 12 / S3a | `web/src/components/{QueryConsole,QueryResults,OpsRail}.tsx` | Query, canary, visible blocked backup. ≤250 each. |
| 13 / S3b | `workers/repair.mjs`, `lib/{operation-slot,repair}.mjs`, `routes.mjs` | Shared operation slot; engine repair result; add repair route only now. ≤240 each. |
| 14 / S4 | `lib/{daily-launch,run-observation}.mjs`, `routes.mjs` | Fixed child spawn; launch metadata and correlation; add daily route only now. ≤260 each. |
| 15 / S4 | `web/src/{hooks/useRun,components/RunConsole}.tsx` | Use `.ts` for hook; poll state machine, no fake completion. ≤260 each. |
| 16 / S5 | `web/src/three/{layoutBrains,lifecycle}.ts`, `BrainConstellation.tsx` | Pure layout; lazy renderer; disposal and motion limits. ≤260 each. |
| 17 / S6 | `web/playwright.console.config.ts`, `web/e2e/*.spec.ts` | Isolated browser fixture server, viewport/accessibility/performance gates. ≤260 each. |
| 18 / S7 | library-mode config, snapshot manifest, receiving adapter spec | Explicitly gated transfer; host dependencies externalized. ≤300 each. |

**Existing patterns to preserve**

Route registration remains literal so the existing allowlist extractor sees it:

```js
if (req.method === 'GET' && p === '/api/creators') {
  return sendJson(res, 200, creatorRows(r));
}
```

Host/write gates remain outside the route table; the error envelope wraps dispatch.

UI retains its mounted inner boundary:

```tsx
<ErrorBoundary scope="The status board">
  <StatusBoard state={status} />
</ErrorBoundary>
```

Use styled-components and existing tokens. Extract style files; do not replace this stack.

Test helpers belong in non-test modules such as `test/fixtures.mjs`. Never import a module that registers tests merely to obtain fixtures.

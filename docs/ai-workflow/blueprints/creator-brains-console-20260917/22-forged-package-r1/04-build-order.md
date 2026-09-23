**Decision:** All paths below are relative to `packages/creator-brains-console/`. Existing files are modified only after source binding; new filenames are planned targets, not claims of present files. Every source/test file must stay ≤300 physical lines.

| Order / slice | File or exact file set | Budget each | Imports → exports / purpose |
|---|---|---:|---|
| S2 entry | `test/upgrade.source-binding.test.mjs` | 220 | Node test/fs → enforce manifest, entry contracts, engine no-edit boundary |
| S2 | `lib/registry-gate.mjs` | 100 | Node built-ins → `withRegistryMutation` |
| S2 | `lib/add-worker.mjs` | 160 | `node:worker_threads`, typed errors → `runAddInWorker` |
| S2 | `lib/add-worker-entry.mjs` | 140 | Node worker API + verified engine registry entry → allowlisted messages |
| S2 | `api.mjs`, `routes.mjs` | 260 | Existing composition → wire shared registry gate without bypassing server security |
| S2 | `lib/brain-read.mjs` | 260 | Existing contained-read pattern → shared pinned publication reader; extract before exceeding budget |
| S2 | `lib/query-read.mjs` | 220 | Shared reader + existing query semantics → contained query |
| S2 | `web/src/adapters/validateCreators.ts` | 180 | Existing validation/error pattern → row/rows validators |
| S2 | `web/src/adapters/validateBrain.ts` | 220 | Query-hit validator → BrainDoc validator |
| S2 | `web/src/adapters/validateQuery.ts` | 180 | Types/errors → hit/result validation |
| S2 | `web/src/adapters/LocalEngineAdapter.ts`, `MockAdapter.ts`, `types.ts`, `contract.assert.ts` | 280 | Existing adapter seams → compatible contracts and equivalent behavior |
| S2 | `web/src/hooks/useCreators.ts`, `useBrain.ts` | 180 | Adapter only → generation-guarded reads and mutation status |
| S2 | `web/src/components/CreatorRoster.tsx`, `AddCreatorForm.tsx` | 240 | Hooks/styles → roster and add UI |
| S2 | `web/src/components/BrainDrawer.tsx`, `BrainContent.tsx` | 240 | Validated BrainDoc → focus-safe dialog and inert content |
| S2 | `web/src/components/CreatorRoster.styles.ts`, `BrainDrawer.styles.ts` | 220 | styled-components `css` helper/tokens → scoped styles |
| S2 | `web/src/App.tsx` | 260 | Existing shell → actual JSX mounts, selection and focus ownership |
| S3 | `web/src/components/QueryConsole.tsx`, `OpsRail.tsx` | 240 | Validated adapters → Wire, canary, repair, blocked backup |
| S3 | `web/src/hooks/useQuery.ts` | 180 | Adapter → late-result suppression and preserved query context |
| S3/S4 | `lib/run-service.mjs`, `lib/run-operation.mjs` | 240 | Verified engine seam → shared admission/correlation |
| S3/S4 | `web/src/adapters/validateRun.ts`, `validateCanary.ts` | 180 | Types/errors → validators |
| S4 | `web/src/hooks/useRunState.ts`, `web/src/components/RunConsole.tsx` | 240 | Shared poll coordinator/adapter → correlated run UI |
| S5 integration | Existing `web/src/three/BrainConstellation.tsx` and actual extracted helpers | 280 | Validated roster/selection → preserve renderer; no redesign |
| S6 | Existing token/style files; `web/src/components/ConsolePanelState.tsx` | 220 | Six tokens → shared loading/error/stale presentation |
| S8 | `tools/verification-event.mjs`, `verification-chain.mjs` | 240 | Node crypto/fs → canonical events and chain validation |
| S8 | `tools/verification-gate.mjs`, `verification-cli.mjs` | 240 | Chain + evidence manifest → eligibility, append/verify/project commands |
| S8 | `web/src/components/VerificationPanel.tsx`, `web/src/adapters/validateVerification.ts` | 220 | Injected sanitized summary → read-only software verification |
| S9 | `web/src/adapters/EvidenceMapAdapter.ts`, `evidenceMap.types.ts` | 200 | Validated core adapter → optional projection |
| S9 | `web/src/components/EvidenceList.tsx`, `EvidenceMapGate.tsx`, `EvidenceMap.tsx` | 220 | Projection/styles → default list and lazy map boundary |
| Every slice | Named tests in `09-tests.md` | 260 | Existing test harness or explicitly new isolated fixture → requirement evidence |

If an existing file is already too close to its cap, extract a responsibility into a specifically named console file and record it before editing. Do not compress readable code to evade the cap.

**Patterns established by the supplied packet**

```ts
// Preserve this consumer contract: unknown counts are not zero.
type CreatorRow = {
  channelId: string; title: string; enabled: boolean;
  videos: number | null; fetched: number | null;
};

// Preserve this publication identity: the legacy name is compatibility.
type BrainIdentity = { slug: string; generation: string | null };

// Preserve this distinction: accepted is not completed.
type AcceptedRun = { requestId: string; runId: string | null };
```

[VERIFIED] The packet names `lib/health-probe.mjs` as the off-thread precedent, `adapters/validate.ts` as the runtime-validation precedent, and `fixtures.mjs` as the non-test fixture module. [UNKNOWN] Their full implementations are not quoted. Copy their **verified source patterns at entry**, not invented excerpts.

**Ordering constraints**

1. Bind source and record baseline.
2. Write failing worker/concurrency/privacy/shape tests.
3. Repair bridge seams.
4. Add validators before mounting consumers.
5. Mount roster and drawer.
6. Run actual browser against the isolated bridge.
7. Reintegrate existing S5 selection/accessibility.
8. Complete S2 checkpoint before S3.

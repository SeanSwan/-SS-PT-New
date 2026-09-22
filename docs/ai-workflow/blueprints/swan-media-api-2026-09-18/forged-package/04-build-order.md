**Order is by dependency, within the original five slices.** All new source files have a maximum budget of 300 lines. Extract by responsibility before exceeding it.

| Order / slice | File | Purpose and interface | Imports/pattern |
|---|---|---|---|
| 1 / 1A | Existing blueprint README and numbered documents | Correct authority, evidence labels and stop gates | Preserve historical originals |
| 2 / 1A | `media-api/contracts.mjs` | `parseGeneration(body)`, `parseAdmission(body)`, `canonicalHash(value)` | Existing strict HTTP object checks; reject unknown keys |
| 3 / 1A | `media-api/server.mjs` | Remove bind escape hatch; retain `buildServer`, `start`, `readServerConfig` | Existing Node HTTP surface |
| 4 / 1A | `media-api/profiles.mjs` | `resolveProfile(id)`, `inspectProfile(profile, deps)` | Existing graph inspection, registry and catalogue |
| 5 / 1A | `media-api/routesCatalog.mjs` | Timestamped readiness and arithmetic-only estimates | Existing `capabilities()` and shared evidence predicates |
| 6 / 1A | `media-api/auth.mjs` | `authenticate(req, principals)`, `requireScope(principal, scope)` | Existing constant-time primitive; OS-restricted verifiers |
| 7 / 1B | `media-api/storeSchema.mjs` | `validateRecord(kind, value)` | Strict explicit schema versions; no malformed-to-empty fallback |
| 8 / 1B | `media-api/store.mjs` | Preserve store exports; validated records and retention | Existing injected-I/O testing seam |
| 9 / 1B | `media-api/journal.mjs` | `transact(mutations)`, `recover()` | Single durable writer; idempotent replay |
| 10 / 1B | `shared/providers/video/usageLedger.mjs` | Extend existing persistence with reservations/events | No second ledger |
| 11 / 1B | `shared/providers/video/spendGuard.mjs` | Integer atomic admission judgment | Existing global authority |
| 12 / 1B | `media-api/admission.mjs` | `admit({principal,key,body,now})` | Contracts, quotes, journal and existing guards |
| 13 / 1B | `media-api/dispatcher.mjs` | `dispatchNext()`, `recoverExecution(job)` | Existing resource authority; lifecycle adapters |
| 14 / 1B | `shared/providers/video/comfyuiLocal.mjs` | Add lifecycle exports; preserve compatibility API | Existing graph and history modules |
| 15 / 1B | `backend/scripts/handlers/generateVideo.mjs` | Preserve shared policy/provenance; prevent accounting bypass | Existing adapters and ceilings |
| 16 / 1B | `media-api/artifacts.mjs` | `ingest(job, output)`, `openOwnedAsset(...)` | Existing provenance and checksum behavior |
| 17 / 1B | `media-api/routes.mjs`, `router.mjs`, `wire.mjs` | Mount strict contracts and public projections | Existing pure route table |
| 18 / 1C | `media-api/local-live.acceptance.mjs` | Authorized real Wan lifecycle/restart receipt | Actual existing graph; no synthetic substitute |
| 19 / 2 | Store, dispatcher, artifact and auth tests | Exhaustive crash, race, range and isolation coverage | Isolated temporary state; injected transports |
| 20 / 3 | `higgsfield.mjs`, `higgsfieldTransport.mjs`, disabled hosted data | Retrieved-contract-only lifecycle implementation | No guessed path or live call |
| 21 / 3 | `media-api/hostedContracts.mjs` | `validateHostedContract(record)` | Eight enablement prerequisites |
| 22 / 4 | Authorized verification harness | One separately approved hosted execution | Remains unbuilt/disabled pending authorization |
| 23 / 5 | `media-api/routingProfiles.mjs`, `recovery.mjs` | Pinned model routing and evidence-backed operator recovery | Existing identity/policy authority |

Example patterns already present and retained:

```js
// router.mjs: explicit method/path table, not a generic vendor proxy
if (method === 'POST' && path === '/v1/quotes') {
  return { handler: createQuote };
}
```

```js
// store.mjs: retain dependency injection, strengthen validation/durability
export function makeJobStore(path, {
  fs: io = defaultIo,
  maxJobs = DEFAULT_MAX_JOBS,
  now = () => new Date(),
} = {}) { /* target implementation */ }
```

The second excerpt is an interface pattern, not implementation supplied by this plan. `maxJobs` must stop admission or prune eligible terminal metadata only; it cannot discard active records.

**Hard dependency:** dispatcher implementation cannot proceed until the existing resource-policy file and recovery contract are identified. That is an explicit blocked integration decision, not delegated permission to invent an API.

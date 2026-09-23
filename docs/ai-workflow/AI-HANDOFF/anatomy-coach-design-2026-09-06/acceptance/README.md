# Running the future acceptance specifications

These files are planning deliverables. They are outside the normal app suite and were syntax-checked only. Application acceptance is NOT RUN until its future implementation slice. Missing setup/adapter is not behavioral RED.

Run commands from repository root unless stated otherwise:

- Model: set SPA_MODEL_MODULE to an absolute reviewed pure adapter, then `node --test docs/ai-workflow/AI-HANDOFF/anatomy-coach-design-2026-09-06/acceptance/model-conformance.test.mjs`.
- API: set SPA_FIXTURE_CONFIG to a private JSON file, then `node --test docs/ai-workflow/AI-HANDOFF/anatomy-coach-design-2026-09-06/acceptance/api-contract.test.mjs`.
- UI: set SPA_BASE_URL to the isolated fixture UI origin, then `node frontend/node_modules/@playwright/test/cli.js test --config=docs/ai-workflow/AI-HANDOFF/anatomy-coach-design-2026-09-06/acceptance/playwright.config.cjs`.
- Packet only: `node docs/ai-workflow/AI-HANDOFF/anatomy-coach-design-2026-09-06/acceptance/verify-packet.mjs`.
- Local wireframe preview: `node docs/ai-workflow/AI-HANDOFF/anatomy-coach-design-2026-09-06/acceptance/serve-review.mjs`, then open `http://127.0.0.1:8876/review.html`.

API config keys: baseUrl (loopback HTTP origin), instanceId, ownUserId integer, episodeId integer, ownToken and foreignClientToken. Tokens belong only in the private fixture config. Bootstrap a synthetic fixture before each suite; use one worker and no retry. The suite creates one synthetic observation and must be followed by disposal of the isolated fixture database through its reviewed harness. Do not run against real customer records or a local server connected to production.

The test server alone exposes GET `/__test__/fixture-identity` with `{kind:'swan-pain-atlas-disposable',instanceId,productionConnection:false,syntheticOnly:true}`. It is a guard, not proof by itself: inspect DB connection isolation and fixture bootstrap before running writes. Do not add this endpoint to production routes. UI fixture starts authenticated as a synthetic role; role coverage needs separate fixtures.

Model adapter contract: `evaluateRecovery({asOf,sets,calibration,pain})` returns `{status,eligibleSets,reasons:string[],muscles:[{exposure,estimate}],pain,actions?}`. It normalizes the future service result for conformance. No provider, DB or network is permitted in this adapter. The service's public read envelope is defined in 11-training-recovery.md; this test adapter is not a second production calculation.

Synthetic calibration values are intentionally named SYNTHETIC-ONLY. Tests cover exact decay, missing effort/profile, unsupported modality, planned/future exclusion, source dedupe and independent pain. They are not a physiological validation study. Additional complete scenarios and proposed files are in scenarios.json and 08-tests-traceability.md.

Artifact scripts capture current local source hashes and serve only this directory. Re-running capture-evidence refreshes evidence and embedded diagram source; regenerate readiness hashes afterward. To maintain an immutable review, preserve the packet before refreshing it.

## v1.1 source-port acceptance

T26 uses atlas-port-contract.test.mjs with SPA_UPSTREAM_MANIFEST and SPA_PORT_MANIFEST pointing to actual original source and initial port JSON exports. Both have sourceCommit(40hex),catalogHash,parts[{id,system,geometrySha256}],concepts[{id,partIds[]}],systems[],capabilities[]. Port includes modes.report/recovery/explore.catalogHash; report.rendererKind=ported-human-atlas and fallbackDefault=false. Use real exported inventory, never passing stubs. Missing setup is BLOCKED, not valid RED. Actual visual/GPU acceptance remains separate. T28 validates later custom geometry using its own manifest/coverage. T29 verifies profile morphing. T27 is an actual agent-invocation benchmark. All four future behavior acceptances are NOT RUN. v1.2 also adds T30 shared Planner/Atlas body preferences and T31 asset feasibility/fallback; their full fixtures and future commands are in scenarios.json and documents 14/15.

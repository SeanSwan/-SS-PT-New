All new cases below are **planned and NOT RUN**. Named files are required implementation deliverables. Existing historical tests remain required regressions.

**Harness rules**

Every integration fixture uses a newly created temporary `CREATOR_BRAINS_ROOT`, isolated port, fake external resolver/probe where network is irrelevant, and explicit teardown. No production backend or default store. No live YouTube traffic.

Pure unit mocks prove logic only. At least one integration case per route uses the actual HTTP handler and real engine file formats. Raw HTTP/socket tests construct malformed targets and framing without client normalization.

| Suite/file | Named cases and what they prove |
|---|---|
| `test/bridge.relocation.test.mjs` — **T-MOVE** | `entry launches from unrelated cwd`; `explicit store root unchanged`; `web dist resolves beside relocated console`; `old and new entry cannot claim same store`; `engine imports resolve without engine edits`. |
| `test/bridge.write-policy.test.mjs` — **T-SEC** | `foreign Origin denied before mutation`; `text/plain JSON denied`; `missing custom header denied`; `same-origin JSON succeeds`; `native JSON request without Origin succeeds`; `OPTIONS never enables CORS`; hostile Host still wins before URL parsing. Assert registry bytes unchanged on every refusal. |
| `test/bridge.utf8.test.mjs` — **T-SEC** | `invalid byte inside quoted ref rejected`; `valid non-ASCII input reaches semantic validator`; `65536-byte body accepted by reader`; `65537-byte body refused`; chunked/no-body cases and post-attack liveness retained. |
| `test/health.worker.test.mjs` — **T-HEALTH** | `blocked probe leaves status responsive`; `one refresh per TTL`; `history retains original timestamp`; `failed refresh cannot appear live`; `worker timeout releases slot`; `two store roots do not share history`. |
| `test/creators.worker.test.mjs` — **T-ADD** | `slow resolver permits concurrent status request`; `worker never writes registry`; `parent re-reads registry after resolution`; `new creator disabled`; `re-add preserves enabled state and counts`; `failed count read yields null`; `double add receives OPERATION_BUSY`; `worker failure leaves registry byte-identical`. |
| `test/brain-generation.test.mjs` — **T-BRAIN** | `published channel ID returns three documents and nonempty claims`; `pointer switch during read never mixes generations`; `missing rules reported`; `malformed claim reported`; `poisoned generation refused`; `real junction/symlink escape refused`; `raw-only sentinel never returned`; healthy large derived markdown remains valid. |
| `test/repair.test.mjs` — **T-OPS-repair** | `real repair record projects repaired built emptied`; `failed engine record retains ok false`; `daily and repair cannot overlap`; `repair refusal leaves state untouched`; no stdout scraping. |
| `test/run-launch.test.mjs` — **T-RUN** | `202 contains requestId and null runId`; `spawn failure releases slot`; `double post starts one child`; `engine child PID correlates journal`; `unrelated journal not adopted`; `exit zero without matching record is unknown`; `failed record never completed`; `bridge restart preserves engine work and loses only declared ephemeral metadata`. |
| `test/run-concurrency.test.mjs` — **T-RUN-GATE** | `losing external runner cannot replace active journal`; `repair versus daily shares truthful identity`; use two actual child processes and isolated engine store. Failure blocks S3b/S4 and routes to engine owner. |
| `web/src/test/route-contracts.test.ts` — **T-CONTRACT** | Local and Mock adapter parity for healthy/damaged/refused payloads; every newly consumed route rejects malformed nested fields; valid controls remain accepted; nullable counts and unknown provenance accepted. |
| `web/src/components/CreatorRoster.test.tsx` — **T-W4** | validation, disabled-on-add, preserved consent on re-add, no optimistic toggle, failed refresh after confirmed write, uncertain timeout copy. |
| `web/src/components/BrainDrawer.test.tsx` — **T-BRAIN-UI** | all four tabs, generation label, claims links, missing-file notices, literal HTML displayed harmlessly, Escape and focus return. |
| `web/src/components/QueryConsole.test.tsx` — **T-W5** | submitted-term zero-hit copy, creator ID filter, skipped rows, timestamp link, stale response cannot overwrite newer query. |
| `web/src/components/OpsRail.test.tsx` — **T-OPS-read** | provenance visible, error returns to panel, repair result not called “requeued”, Backup sends no request, CLI hints remain non-executable. |
| `web/src/components/RunConsole.test.tsx` — **T-W6** | rejects 0/negative/fraction/string/NaN/unsafe integer; holder display; exact state labels; unmount aborts reads; uncertain writes never auto-retry. |
| `web/src/three/layoutBrains.test.ts` — **T-T1** | sort by channel ID; deterministic positions; real counts drive size/coverage; null counts render unknown; color plus textual equivalent. |
| `web/src/three/lifecycle.test.ts` — **T-T2** | hidden/offscreen stop within one frame; runtime reduced-motion disposes; remount leaves one renderer; geometry/material/context/listeners released. |
| `web/e2e/console-launch.spec.ts` — **T-E1** | real fixture bridge serves built app; actual `main.tsx` mount renders status and survives named payload fault; missing hashed asset cannot masquerade as working UI. |
| `web/e2e/console-responsive.spec.ts` — **T-E2/W9** | eleven widths; no lost/clipped critical controls; 44px targets; keyboard tasks; focus restoration; axe plus measured contrast. |
| `web/e2e/console-motion.spec.ts` — **T-E3/W7** | network asserts no three chunk before gate; zero fetch on reduced-motion/mobile/no WebGL; late dolly skipped; DPR cap; frame samples on declared hardware. |
| `test/snapshot.test.mjs` — **T-B12** | S7 tag exists; copied source files exactly match manifest; changed/missing/unlisted source blocks transfer; original tree unchanged. |

**Exact targeted commands**

From repository root, using the approved `$consolePath` from `05-slices.md`:

```powershell
node --test "$consolePath/test/bridge.relocation.test.mjs"
node --test "$consolePath/test/bridge.write-policy.test.mjs" "$consolePath/test/bridge.utf8.test.mjs"
node --test "$consolePath/test/health.worker.test.mjs"
node --test "$consolePath/test/creators.worker.test.mjs" "$consolePath/test/brain-generation.test.mjs"
node --test "$consolePath/test/repair.test.mjs"
node --test "$consolePath/test/run-launch.test.mjs" "$consolePath/test/run-concurrency.test.mjs"
npm --prefix "$consolePath/web" test
npm --prefix "$consolePath/web" run typecheck
npm --prefix "$consolePath/web" run build
```

Missing test modules are setup gaps, **not valid RED evidence**. The builder must first write each test so it reaches the intended boundary, observe the intended behavioral failure, then implement.

Viewport matrix: `320×812`, `375×812`, `414×896`, `768×1024`, `1024×768`, `1280×800`, `1440×900`, `1920×1080`, `2560×1440`, `3840×2160`, `3440×1440`.

**Known evidence limits**

- Fake resolver/probe tests do not establish YouTube availability.
- Mock adapters do not prove bridge serialization.
- Stubbed API browser tests do not prove engine integration.
- Software WebGL does not certify Sean’s GPU.
- A transcript detector is a supplementary alarm, not proof of path isolation.
- No backup test may open private transcript fixtures through a console-owned reader.
- S7 receiver behavior cannot be certified by this repository’s suite.

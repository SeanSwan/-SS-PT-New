**Replace the cancelled GSAP/R3F tests and the scene-cost protocol. Retain unrelated B1/B2 tests.**

**Runner contract**

Use the proposed `frontend/playwright.cinematic.config.ts`, production Vite preview at `127.0.0.1:4173`, pinned installed browser tooling, and synthetic fixtures.

- Abort unexpected API requests; allow only documented synthetic read fixtures.
- Abort all non-read API requests.
- Do not start a backend connected to production.
- Do not submit the real orientation form.
- Exercise the real mounted V4 route for acceptance.
- Use an isolated controller fixture for deterministic fault injection; it does not replace route acceptance.
- Build-boundary checks examine the emitted manifest/module graph, including preload edges—not guessed chunk filenames.

**Unit and integration cases**

| ID | File and named cases | What they prove |
|---|---|---|
| P1 | `src/core/perf/performanceTierPolicy.test.ts`: `four cores plus saveData stays lean`; `low memory stays lean`; `reduced preference wins`; `unknown hardware stays lean`; `invalid numeric readings are unknown`; `forceTier cannot raise eligibility` | Ordered policy and malformed-signal handling. |
| P2 | `src/core/perf/PerformanceTierProvider.test.tsx`: `pending is distinct from ready reduced`; `subscription update does not resubscribe`; `cleanup removes listeners`; `preference downgrade publishes immediately` | Provider lifecycle and the bootstrap-latch fix. |
| P3 | `src/hooks/useAnimationTier.test.tsx`: `hook and flags consume one provider`; `missing provider is diagnosed`; `canonical tiers preserve mapped consumer flags` | No second detector or permanent vocabulary adapter. |
| P4 | `src/core/perf/motionTokens.test.ts`: `CSS values derive from numeric values`; `Framer seconds derive from milliseconds`; `reveal uses canonical cubic bezier` | One numerical authority and consistent units. |
| R1 | `src/components/SwanMark3D/swanMarkScene.behavior.test.ts`: `finite reveal reaches exact endpoint`; `settled scene stops scheduling`; `resize renders once without replay` | Actual finite scheduling behavior. |
| R2 | Same file: `display and scratch limits are independent`; `zero size does not allocate`; `hero options preserve default caller behavior` | Backing limits and header compatibility. |
| R3 | Same file: `construction failure disposes acquired resources`; `dispose is idempotent`; `late callback cannot render`; `one instance cannot dispose another` | Executable resource ownership. |
| R4 | Same file: `presentation callback follows successful blit`; `blit failure reports error`; `deliberate cleanup does not emit a second context-loss failure` | Correct handoff and failure reporting. |
| L1 | `src/pages/HomePage/components/sections/HeroSignature.test.tsx`: `pending detection never latches disabled`; `initially offscreen does not import`; `lean and reduced never invoke loader` | Eligibility without accidental download. |
| L2 | Same file: `late import after downgrade creates no controller`; `late import after unmount has no side effect`; `expired deadline rejects late success` | Races and bounded completion. |
| L3 | Same file: `poster remains until first presentation`; `context loss restores poster`; `failure remains latched after provider upgrade` | Fallback and no replay. |
| L4 | Same file: `hidden during loading latches disabled`; `hidden during reveal disposes controller`; `missing observer retains poster` | Visibility and unsupported-observer behavior. |
| L5 | Same file: `StrictMode effect replay permits one valid reveal`; `cleanup before presentation does not consume reveal`; `synchronous preparation exceeding deadline never presents late` | Effect replay and deadline honesty. |
| Q1 | `tests/cinematic/build-boundary.test.ts`: `hero initial graph excludes renderer and mesh`; `negative static-import fixture fails`; `header-shared chunks are attributed separately` | Lazy ownership and a meaningful negative control. |

Retain the existing source-contract tests for import boundaries and React-free controller structure. Their passing result is structural evidence only.

**R1 deletion checks**

- **D1 — `exclusive deletion manifest`:** record every removed file, its reference search, and why it is exclusive. Verify no live import/re-export/public-path dependency remains. This is an inspection artifact, not a fabricated runtime test.
- **D2 — `post-deletion compilation`:** run the exact type-check and build commands in `05`; distinguish new errors from recorded baseline failures.

**Browser cases**

| ID | File and named cases | Observable result |
|---|---|---|
| H1 | `tests/cinematic/home.spec.ts`: `static hero is complete at every required viewport`; `200 percent text zoom remains usable`; `twelve sections retain order` | Usable base surface without enhancement. |
| H2 | Same file: `poster and first frame preserve registration`; `handoff does not resize the hero`; `decorative mark is absent from keyboard navigation` | Visual continuity and accessibility. |
| H3 | Same file: `orientation opener receives keyboard and pointer activation`; `return restores expected focus`; `no submission request occurs` | Existing conversion flow remains reachable without production writes. Exact assertions bind to A0r’s real interface. |
| M1 | `tests/cinematic/signature.spec.ts`: `full mode presents and settles`; `import failure keeps poster`; `WebGL unavailable keeps poster`; `context loss keeps poster`; `route exit releases owned resources` | Real-browser lifecycle behavior. |
| M2 | Same file: `CSS gate works while JS motion is deliberately enabled`; `JS gate works with CSS gate deliberately removed`; `live reduced preference ends reveal` | Independent protection, with negative controls. |
| M3 | `tests/cinematic/motion-budget.spec.ts`: `shell and hero share viewport budget`; `sections appear final while signature runs`; `four targets fail`; `third animated property fails`; `100ms stagger fails` | Detector sensitivity and actual mounted motion limits. |
| Q2 | `tests/cinematic/performance.spec.ts`: `mobile LCP meets lab budget`; `restricted hero makes no loader attempt`; `whole page resources include header cost` | Loading/performance claims with correct scope. |
| Q3 | Same file: `real GPU reveal meets presentation budget`; `startup contains no attributable long task`; `settled hero submits no idle frames`; `ten mount cycles release owned resources` | Measurable presentation and lifecycle acceptance. |

**Measurement details**

- **LCP:** preserve 375×812, DSF 2, 150ms latency, 1.6Mbps down, 750Kbps up, CPU 4×, fresh cache/context, five navigations per mode. Nearest-rank p75 is the fourth ordered value. Record all values and the actual LCP element.
- **Presentation:** run separately from the throttled LCP test, on recorded real hardware. Record callback timestamps, CPU spans, dimensions, backend and browser version. Include first frames and all five mounts at each required performance viewport.
- **GPU diagnostics:** where supported, bracket only the GL commands being measured, poll query availability asynchronously, reject disjoint samples, and delete query objects. Do not include these values in a CPU+GPU sum.
- **Visual review:** use the exact same geometry, pose and palette for poster/first-frame comparison. Review the 0/360/720ms sequence beside the static composition; record acceptance or rejection without claiming measured conversion uplift.
- **Status:** every case above is **NOT RUN** here. Missing test implementation, fixture, browser, GPU evidence or intake contract remains explicit preparation work.

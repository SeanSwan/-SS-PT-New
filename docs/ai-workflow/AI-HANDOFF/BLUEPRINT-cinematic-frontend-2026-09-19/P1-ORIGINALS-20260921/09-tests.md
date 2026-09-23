**Execution status:** None of these tests ran in this consultation. Every test file named below is a **NEW implementation deliverable**. The commands become runnable after its owning slice creates the file and intake verifies the installed runner.

**Runner contract**

Use the repository’s installed Vitest and Playwright versions. Add **NEW** `frontend/playwright.cinematic.config.ts` only as a narrow configuration for this work:

- Production Vite preview on `127.0.0.1:4173`.
- Command: `npx --no-install vite preview --host 127.0.0.1 --port 4173 --strictPort`.
- Synthetic fixtures; reject unexpected non-read API requests.
- No backend process started against the production database.
- Browser projects use installed browser tooling; record exact browser versions.
- Missing runner/browser tooling is a preparation blocker, not permission to fetch an unpinned latest version.
- Reuse existing fixtures and conventions where discovered; record exact substitutions.

**Baseline and acceptance commands**

From `frontend/`:

```powershell
npm ls react react-dom three gsap framer-motion --depth=0
npx --no-install tsc --noEmit
npm run build
```

For the bundle audit, produce a manifest using the verified Vite build script:

```powershell
npm run build -- --manifest
```

No successful Vite build substitutes for the type-check command.

**Unit and integration cases**

| NEW test file | Named cases and proof |
|---|---|
| `src/core/perf/performanceTierPolicy.test.ts` | `reduced preference overrides all capabilities`; `low cores or memory select reduced`; `saveData and 2g select lean with eight cores`; `3g selects lean`; `unknown inputs select lean after detection`; `invalid values are unknown`; `eligible eight-core device selects full`. |
| `src/core/perf/PerformanceTierProvider.test.tsx` | `initial snapshot prohibits enhancement`; `one subscription survives tier changes`; `StrictMode cleanup restores baseline`; `media-query change updates mounted consumers`; `connection change downgrades immediately`; `forceTier cannot elevate capability`; `missing connection API does not throw`. |
| `src/hooks/useAnimationTier.test.tsx` | `hook reads provider without a second detector`; `temporary aliases map exactly`; `final flags derive from canonical values`; `two consumers observe the same update`. |
| `src/core/perf/motionTokens.test.ts` | `CSS and TS values agree`; `Framer seconds are converted once`; `stagger is sixty milliseconds`; `narrative value does not become helper default`. |
| `src/utils/motion-helpers.test.tsx` | `reduced variants reveal final content immediately`; `runtime reduction cancels active helper motion`; `plain component receives functioning motion wrapper`; `already motion-capable caller is not double wrapped`; `ref and click handler survive`; `motion props do not leak to DOM`; `stagger delay stays within ceiling`. |
| `src/components/PremiumParallax/PremiumParallax.lifecycle.test.tsx` | `owned timeline is cleaned on unmount`; `dependency change replaces rather than accumulates`; `StrictMode remount is balanced`; `deferred callback after cleanup creates no trigger`; `unrelated trigger survives cleanup`. |
| `src/three/swanMark/homeHeroFactory.test.ts` | `adapter reuses verified mark construction`; `factory creates no renderer or RAF`; `owned resources dispose once`; `shared resources remain usable`; `home spec obeys pose and resource limits`. |
| `src/pages/HomePage/components/sections/HeroSignature.test.tsx` | `poster renders before import`; `lean and reduced never invoke loader`; `rejected loader preserves CTA`; `late resolution after downgrade mounts no canvas`; `timeout latches fallback`; `unmount invalidates pending completion`; `context loss restores poster`; `successful first frame permits handoff`; `settled scene stops invalidating`. |

Run each file using the command in its slice. Run the complete unit group before A acceptance:

```powershell
npx --no-install vitest run src/core/perf src/hooks/useAnimationTier.test.tsx src/utils/motion-helpers.test.tsx src/components/PremiumParallax/PremiumParallax.lifecycle.test.tsx src/three/swanMark/homeHeroFactory.test.ts src/pages/HomePage/components/sections/HeroSignature.test.tsx
```

Mocks may test bookkeeping, but mocked GSAP counts do not establish browser cleanup. The browser case below supplies that evidence.

**Home and fallback browser tests**

NEW `tests/cinematic/home.spec.ts`:

- `actual home route mounts V4`: navigate through the verified route; assert V4 identity, exact H1, existing section order, and the real CTA.
- `orientation action remains connected`: keyboard activation opens the existing dialog; focus enters and returns on dismissal. Do not submit.
- `static layout survives pending and rejected scene`: delay/block the discovered scene chunk; assert headline, CTA, mark, and dimensions.
- `full mode renders the actual scene`: inject capability readings before page initialization; assert first frame and nonempty canvas, not merely a tier label.
- `saveData blocks scene requests`: eight cores plus save-data; inspect requests and canvas count.
- `slow connection blocks scene requests`: repeat with 2g.
- `reduced at startup remains static`: real browser reduced-motion emulation before navigation.
- `reduced during import prevents mount`: delay import, switch media preference, release import.
- `reduced during animation returns to poster`: change preference while the actual beat is active.
- `context loss preserves conversion`: trigger supported WebGL context loss and verify poster/CTA.
- `responsive matrix has no clipping`: all checkpoint dimensions, full and reduced states.
- `text zoom retains accessible controls`: 200% zoom/reflow.
- `V4 failure retains the existing V3 route fallback`: test the actual lazy boundary using the established repository error-injection pattern.

```powershell
npx --no-install playwright test -c playwright.cinematic.config.ts tests/cinematic/home.spec.ts
```

**Dual-gate and motion-budget tests**

NEW `tests/cinematic/motion-budget.spec.ts`:

1. `CSS gate independently stops component CSS motion`  
   Render the component’s real styled wrapper with ordinary animation styles while emulating reduced motion. Inspect computed animation/transition values. Do not rely on the JS branch for this case.

2. `JS gate independently stops imperative motion`  
   In a fixture without the component CSS gate, toggle the real media query and verify static final props, no canvas loader invocation, no changing transforms, and final counter values.

3. `one signature exists and executes once`  
   Assert one declared signature boundary, a real rendered beat in full mode, and no second execution on scroll re-entry. Inspect actual animation behavior; a marker alone cannot pass.

4. `no element animates more than two properties`  
   Sample the mounted home and shell through entrance, scrolling, hover, and keyboard focus. Include CSS/WAAPI animations and JS-driven computed-style changes.

5. `no viewport contains more than three active targets`  
   Sample rendered frames while traversing the page at every matrix size. Count pseudo-element motion and active canvas rendering; deduplicate by actual target. Observe JS-driven changes rather than relying solely on `document.getAnimations()`.

6. `stagger interval and group size comply`  
   Exercise real helper consumers; assert intervals ≤80ms and groups ≤5. Verify home sections do not introduce nested animated groups.

7. `budget detector rejects deliberate violations`  
   Fixture with four moving targets must fail the counter; fixture with a third animated property must fail; fixture with 100ms stagger must fail. These negative controls prevent vacuous enforcement.

8. `PremiumParallax returns actual triggers to baseline`  
   Mount/unmount its verified caller ten times; compare actual owned trigger counts and leave an unrelated sentinel trigger intact.

```powershell
npx --no-install playwright test -c playwright.cinematic.config.ts tests/cinematic/motion-budget.spec.ts
```

**Bundle checks**

NEW `tests/cinematic/bundle.spec.ts`:

- Follow the generated Vite manifest’s static import graph.
- Assert R3F and the home scene are outside the initial home-rendering graph.
- Assert the scene remains dynamically reachable from the enhancement boundary.
- Inspect browser network evidence for no scene request in lean/reduced mode.
- Negative fixture: making the scene a static entry import must fail the checker.
- Match module identity through build metadata, not guessed hashed filenames.

```powershell
npx --no-install playwright test -c playwright.cinematic.config.ts tests/cinematic/bundle.spec.ts
```

**Performance measurement**

NEW `tests/cinematic/performance.spec.ts`:

`mobile LCP meets budget`

- Production build, 375×812 viewport, device scale factor 2.
- Chromium browser/version and machine recorded.
- Fresh context/cache for every run.
- Network: 150ms latency, 1.6Mbps down, 750Kbps up.
- CPU: 4× slowdown.
- Five navigations per tested capability mode.
- Capture buffered LCP entries before user interaction; terminate collection at the documented settled observation point.
- Pass when nearest-rank p75 across the five runs is ≤2500ms.
- Record the actual LCP element and all five values.
- This is a lab gate, not a claim about production field p75. The 2.5s field target applies to the 75th percentile of visits. [LCP guidance](https://web.dev/articles/optimize-lcp)

`canvas count and actual DPR obey contract`

- Full mode must render a real scene.
- Count actual canvases on the route.
- Measure drawing-buffer dimensions against CSS dimensions.
- Assert count ≤1 and DPR ≤2; test at device scale factors 1, 2, and 3.

`scene cost stays below three milliseconds`

- Run headed on recorded hardware with a real GPU; software rendering does not qualify.
- Test 375×812 and 2560×1440 layouts at maximum configured scene DPR.
- Instrument actual scene update plus renderer submission on the CPU.
- Measure actual render commands with supported disjoint GPU timer queries.
- Collect every rendered signature frame across ten fresh mounts, including first rendered frames; do not discard expensive first frames as warm-up.
- Reject disjoint/invalid samples and rerun only the invalid sample set.
- Conservative package gate: **CPU scene cost + GPU render cost <3ms for every valid sampled frame**.
- Also report maximum and p95 values, renderer identity, sample count, and any invalid samples.
- Missing GPU timing support yields **INCONCLUSIVE**; the real-GPU checkpoint remains open.
- Frame intervals and `requestAnimationFrame` deltas are not GPU timings. The extension exposes elapsed GPU-query measurement and a disjoint flag. [Khronos timer-query specification](https://registry.khronos.org/webgl/extensions/EXT_disjoint_timer_query_webgl2/)

`settled scene is idle`

- After completion, verify no continuing scene-driven frame invalidation.
- Repeat while hidden/offscreen.
- Resizing may request bounded redraws but must not restart the signature.

```powershell
npx --no-install playwright test -c playwright.cinematic.config.ts tests/cinematic/performance.spec.ts
```

A successful fallback-only run cannot satisfy full-scene performance acceptance.

**React migration tests**

NEW `tests/cinematic/react19.spec.ts` and caller-specific unit tests selected from the intake manifest:

- `runtime and renderer resolve one React cohort`.
- `home mounts and signature settles under StrictMode`.
- `lazy map opens with synthetic fixtures`.
- `simple map renders its existing interactions`.
- `helmet updates and restores document metadata`.
- `representative Victory chart renders and updates`.
- `existing drag interaction completes`.
- `caught render failure displays its existing boundary`.
- `uncaught render failure reaches the configured reporter once`.
- `boundary and root reporting do not duplicate the same error`.
- `orientation dialog retains focus and dismissal behavior`.

React 19 changes render-error reporting and offers root callbacks; inspect the existing reporter before selecting ownership. Do not introduce a second reporting pipeline. [React upgrade guide](https://react.dev/blog/2024/04/25/react-19-upgrade-guide)

Stage 2 acceptance commands:

```powershell
npm ci
npm ls react react-dom @types/react @types/react-dom @react-three/fiber react-leaflet
npx --no-install tsc --noEmit
npm run build
npx --no-install playwright test -c playwright.cinematic.config.ts tests/cinematic/react19.spec.ts
```

Run these in the isolated migration checkout. `npm ci` uses the existing lockfile owner established at intake; if this repository installs from a different workspace root, freeze that exact command before B2 starts.

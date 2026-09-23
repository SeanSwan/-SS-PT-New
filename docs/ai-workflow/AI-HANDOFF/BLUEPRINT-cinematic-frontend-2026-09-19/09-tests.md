**P2 amendment applied 2026-09-21. Cancelled GSAP/R3F tests and the scene-cost protocol replaced;
unrelated B1/B2 tests retained. P1 text preserved in `/tmp/p1-originals-20260921/09-tests.md`
(md5-verified). **Correction 2026-09-21:** the earlier “*Not* in git history” note was wrong — this directory is **not** gitignored — the `.gitignore:496` claim was false (line 496 is blank, and the rules target `.ai-workflow/`, not `docs/ai-workflow/`); this packet is tracked in git as of 2026-09-21.**

**Execution status:** None of these tests ran in this consultation. Every test file named below is a **NEW implementation deliverable**. The commands become runnable after its owning slice creates the file and intake verifies the installed runner.

> **A0r finding: not one of them exists yet, and two configs are missing.** None of the eight named test
> files, no `frontend/tests/` directory, and no `playwright.cinematic.config.ts`. Existing runners are
> `frontend/vitest.config.ts` (`include: src/**` — `tests/cinematic/*` falls **outside** it) and
> `frontend/playwright.config.ts` (`testDir: './e2e'`). **Build-boundary and every browser case need new
> config before they can execute at all.** See `A0r-INTAKE-RECEIPT.md` §8.

**Runner contract**

Use the proposed `frontend/playwright.cinematic.config.ts`, production Vite preview at `127.0.0.1:4173`, pinned installed browser tooling, and synthetic fixtures.

- Abort unexpected API requests; allow only documented synthetic read fixtures.
- Abort all non-read API requests.
- Do not start a backend connected to production.
- Do not submit the real orientation form.
- Exercise the real mounted V4 route for acceptance.
- Use an isolated controller fixture for deterministic fault injection; it does not replace route acceptance.
- Build-boundary checks examine the emitted manifest/module graph, including preload edges—not guessed chunk filenames.
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

> **Gate.** Export `NODE_OPTIONS=--max-old-space-size=8192` before `tsc`. Measured 2026-09-21: the
> default ~4 GB heap exits 134 with **zero diagnostics emitted**, which reads as a mysterious failure
> rather than an environment limit. Baseline at HEAD `6e45e239` is zero errors.

**Unit and integration cases**

| ID | File and named cases | What they prove |
|---|---|---|
| P1 | `src/core/perf/performanceTierPolicy.test.ts`: `four cores plus saveData stays lean`; `low memory stays lean`; `reduced preference wins`; `unknown hardware stays lean`; `invalid numeric readings are unknown`; `forceTier cannot raise eligibility` | Ordered policy and malformed-signal handling. |
| P2 | `src/core/perf/PerformanceTierProvider.test.tsx`: `pending is distinct from ready reduced`; `subscription update does not resubscribe`; `cleanup removes listeners`; `preference downgrade publishes immediately` | Provider lifecycle and the bootstrap-latch fix. |
| P3 | `src/hooks/useAnimationTier.test.tsx`: `hook and flags consume one provider`; `missing provider is diagnosed`; `canonical tiers preserve mapped consumer flags` | No second detector or permanent vocabulary adapter. |
| P4 | `src/core/perf/motionTokens.test.ts`: `CSS values derive from numeric values`; `Framer seconds derive from milliseconds`; `stagger is sixty milliseconds`; `narrative value does not become helper default`; `reveal uses canonical cubic bezier` | One numerical authority and consistent units. |
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

> **Why "structural evidence only" is now load-bearing.** Astra's F11 is correct: a source-text
> contract cannot establish lifecycle correctness. `SwanMark3D.contract.test.ts` and
> `swanMarkPayload.contract.test.ts` can confirm a file *contains* `dispose()`,
> `cancelAnimationFrame()` and `forceContextLoss()` while those are called on the **wrong resources**.
> R1–R4 above are the executable replacements; the text contracts do not substitute for them.

**R1 deletion checks**

- **D1 — `exclusive deletion manifest`:** record every removed file, its reference search, and why it is exclusive. Verify no live import/re-export/public-path dependency remains. This is an inspection artifact, not a fabricated runtime test.
- **D2 — `post-deletion compilation`:** run the exact type-check and build commands in `05`; distinguish new errors from recorded baseline failures.

> **A0r supplies D1 and D2 baselines.** D1: the allowlist is **one file**, zero exclusive assets
> (`A0r-INTAKE-RECEIPT.md` §7). D2: **zero type errors** at HEAD `6e45e239` under an 8 GB heap; the
> production build is currently blocked by the sandbox's delete guard, not by the repo.

**Browser cases**

| ID | File and named cases | Observable result |
|---|---|---|
| H1 | `tests/cinematic/home.spec.ts`: `static hero is complete at every required viewport`; `200 percent text zoom remains usable`; `twelve sections retain order`; `responsive matrix has no clipping`; `V4 failure retains the existing V3 route fallback` | Usable base surface without enhancement. |
| H2 | Same file: `poster and first frame preserve registration`; `handoff does not resize the hero`; `decorative mark is absent from keyboard navigation` | Visual continuity and accessibility. |
| H3 | Same file: `orientation opener receives keyboard and pointer activation`; `return restores expected focus`; `no submission request occurs` | Existing conversion flow remains reachable without production writes. Exact assertions bind to A0r's real interface. |
| M1 | `tests/cinematic/signature.spec.ts`: `full mode presents and settles`; `import failure keeps poster`; `WebGL unavailable keeps poster`; `context loss keeps poster`; `route exit releases owned resources` | Real-browser lifecycle behavior. |
| M2 | Same file: `CSS gate works while JS motion is deliberately enabled`; `JS gate works with CSS gate deliberately removed`; `live reduced preference ends reveal` | Independent protection, with negative controls. |
| M3 | `tests/cinematic/motion-budget.spec.ts`: `shell and hero share viewport budget`; `sections appear final while signature runs`; `four targets fail`; `third animated property fails`; `100ms stagger fails` | Detector sensitivity and actual mounted motion limits. |
| Q2 | `tests/cinematic/performance.spec.ts`: `mobile LCP meets lab budget`; `restricted hero makes no loader attempt`; `whole page resources include header cost` | Loading/performance claims with correct scope. |
| Q3 | Same file: `real GPU reveal meets presentation budget`; `startup contains no attributable long task`; `settled hero submits no idle frames`; `ten mount cycles release owned resources` | Measurable presentation and lifecycle acceptance. |

> **H3 binds to the resolved CTA interface.** Verified chain: `HeroSection.tsx:136`
> `onClick={onOpenOrientation}` → `HomePage.V4.tsx:69` `setShowOrientation(true)` → `V4:106`
> `<OrientationForm onClose={...} />`. **`OrientationForm` accepts `{ onClose }` only.** Assertions
> should target that symbol, not a route change or a modal id. **The copy the button carries is
> unresolved** (`Book an orientation` vs shipped `Find a Trainer`) — see `A0r` §12 item 1.

**Measurement details**

- **LCP:** preserve 375×812, DSF 2, 150ms latency, 1.6Mbps down, 750Kbps up, CPU 4×, fresh cache/context, five navigations per mode. Nearest-rank p75 is the fourth ordered value. Record all values and the actual LCP element. This is a lab gate, not production field p75.
- **Presentation:** run separately from the throttled LCP test, on recorded real hardware. Record callback timestamps, CPU spans, dimensions, backend and browser version. Include first frames and all five mounts at each required performance viewport. Five fresh reveal mounts at 375×812 and 2560×1440, DSF 2, 60Hz display, recorded real GPU.
- **GPU diagnostics:** where supported, bracket only the GL commands being measured, poll query availability asynchronously, reject disjoint samples, and delete query objects. **Do not include these values in a CPU+GPU sum.**
- **Visual review:** use the exact same geometry, pose and palette for poster/first-frame comparison. Review the 0/360/720ms sequence beside the static composition; record acceptance or rejection without claiming measured conversion uplift.
- **Status:** every case above is **NOT RUN** here. Missing test implementation, fixture, browser, GPU evidence or intake contract remains explicit preparation work.

**Replaced P1 content — disposition**

| Replaced P1 item | Disposition |
|---|---|
| `src/utils/motion-helpers.test.tsx` (7 cases) | **Cancelled with A5.** The dormant helper is not represented as a live-home fix. The `stagger is sixty milliseconds` assertion **moved to P4**. |
| `src/components/PremiumParallax/PremiumParallax.lifecycle.test.tsx` (5 cases) | **Cancelled.** A6 is bounded **deletion**, not cleanup: the component has zero importers, so there is no timeline to reproduce, no triggers to count, and no appearance to preserve. D1/D2 replace it. |
| `src/three/swanMark/homeHeroFactory.test.ts` (5 cases) | **Cancelled.** `homeHeroFactory.ts` was cancelled by the five-module list; no adapter exists to test. Its concerns move to R1–R4 (controller) and L1–L5 (boundary). |
| `scene cost stays below three milliseconds` (CPU + GPU summed `<3ms/frame`) | **Deleted.** C4 replaces it with a presentation-callback interval budget (p95 ≤25ms, no interval >50ms) plus a separate sync-startup check, and explicitly forbids the CPU-plus-GPU sum. The P1 protocol also discarded first frames as "warm-up"; the replacement **includes** them. |
| `tests/cinematic/bundle.spec.ts` | **Renamed and narrowed** to `tests/cinematic/build-boundary.test.ts` (case Q1), reading the emitted manifest/module graph including preload edges rather than guessed chunk filenames. |
| `PremiumParallax returns actual triggers to baseline` (motion-budget case 8) | **Cancelled** with A6. Same reason as the lifecycle test above. |
| `initial snapshot prohibits enhancement` (provider case) | **Reframed** as `pending is distinct from ready reduced` — the P1 phrasing is exactly the latch P2 fixes. |
| `reduced variants reveal final content immediately`, `runtime reduction cancels active helper motion`, `plain component receives functioning motion wrapper`, `already motion-capable caller is not double wrapped`, `ref and click handler survive`, `motion props do not leak to DOM` | **Cancelled** with the helper-repair slice. None of these can be claimed as a live-home improvement. |
| `context loss preserves conversion` (home case) | **Retained**, moved under M1 as `context loss keeps poster`. |
| `V4 failure retains the existing V3 route fallback` | **Retained**, listed under H1. |
| `orientation action remains connected` | **Retained** as H3, with the interface now pinned to `onOpenOrientation` / `{ onClose }`. |
| Home/fallback and dual-gate browser cases stated as prose bullets | **Regrouped** under the H/M/Q case IDs so each maps to a checkpoint in `07`. |

**Retired plan ceilings, for the record.** P1's `explicit DPR range [1, 1.5]` and its `<3ms/frame>` gate
are both withdrawn — the first because it contradicted the `≤2` canvas contract in the same package
(Astra F08), the second because it was never defined. Neither is to be reinstated by a slice.

**React migration tests** *(retained from P1; `@react-three/fiber` removed from the peer check)*

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

React 19 changes render-error reporting and offers root callbacks; inspect the existing reporter before selecting ownership. Do not introduce a second reporting pipeline.

Stage 2 acceptance commands:

```powershell
npm ci
npm ls react react-dom @types/react @types/react-dom react-leaflet
npx --no-install tsc --noEmit
npm run build
npx --no-install playwright test -c playwright.cinematic.config.ts tests/cinematic/react19.spec.ts
```

Run these in the isolated migration checkout. `npm ci` uses the existing lockfile owner established at intake; if this repository installs from a different workspace root, freeze that exact command before B2 starts.

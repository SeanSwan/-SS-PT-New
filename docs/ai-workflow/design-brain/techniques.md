# techniques.md — World Effects Arsenal

- **Date:** 2026-07-12 · **Author:** Fable via builder agent, per `SWAN-WORLD-ENGINE-BUILD-HANDOFF-2026-07-12.md` · **Status:** CANONICAL within Design Brain scope
- **Authority:** `SWAN-CINEMATIC-DESIGN-SYSTEM.md` + `SWAN-ASSET-STORYBOARDING.md` > `design.md` > `experience-mode.md` > this file. A technique narrows those sources; it never grants a surface license.
- **Purpose:** define WFX-01–WFX-13 as reproducible effects with explicit maturity, backend, performance, loss, accessibility, and subtraction rules.

---

## 1. Namespaces, maturity, and dependency truth

- `WFX-*` identifies a visual technique. `M0–M4` is the experience budget in `experience-mode.md`; `Full / Lean / Still` is runtime quality; `B0–B3` is the render ladder; Hermes `T0–T4` is command-effect safety. Never reuse one namespace for another.
- **AVAILABLE:** browser-native or installed with a working repository pattern. **PROGRESSIVE:** browser-native behind feature detection with a complete fallback. **DEPENDENCY-GATED:** absent from the repo; requires an approved version/architecture spike. **RESEARCH-ONLY:** lab/factory lane; never a required delivery path.
- Repository check on 2026-07-12: React `^18.2.0`, Framer Motion `^10.16.5`, and Victory `^37.3.6` are installed. View Transitions and Web Audio have working repo patterns. Three.js, R3F, Drei, GSAP, and TypeGPU are not dependencies. If R3F is later approved while React remains 18, use R3F 8; R3F 9 pairs with React 19.
- Maturity is rung-specific. A B1 fallback may be AVAILABLE while a B2 centerpiece is DEPENDENCY-GATED and its B3 version is RESEARCH-ONLY.

## 2. Runtime render ladder and selection law

| Rung | Contract | Promotion evidence | Immediate loss action |
|---|---|---|---|
| **B0 Semantic Poster** | Real DOM heading, copy, navigation, proof, CTA, legal/form state, and a world-native still. Complete with JavaScript disabled | Unconditional first paint | Remains mounted through every upgrade or failure |
| **B1 Cinematic Media** | CSS/SVG, responsive stills, poster-first video, and native canvas where justified | Asset decode succeeds; B0 is stable; motion preference permits | Freeze to poster/static CSS; preserve DOM and focus |
| **B2 Production Spatial** | Three.js WebGL2, directly or through an approved React-18 adapter | Dependency spike, first render, forced WebGL-loss test, budgets, disposal, B1/B0 parity | Dispose and fall to B1 without reload |
| **B3 Frontier Spatial** | Isolated Three WebGPURenderer, TypeGPU, or raw WebGPU | Adapter/device/pipeline creation, compilation/error scopes, first render, `device.lost`, budgets, and B2/B1/B0 parity | Destroy/release resources and fall to B2, then B1 |

Selection is `reduced-motion → Still/B0`, otherwise initialize one rung at a time from the lowest already-good story. Capability checks start an experiment; successful initialization plus observed performance decides whether it stays. No user-agent device classes, no single `navigator.gpu` verdict, and no visible quality oscillation. After warm-up, each Full window contains exactly 120 eligible presentations. Downgrade after **three consecutive 120-frame Full windows with active deadline/cap breaches**; a missed presentation or active authored-work/pixel/draw/memory overage breaches that window, while any animation-related task over 50ms downgrades immediately. Recover only after ten clean seconds below 80% of every active cap. Allow at most one automatic upgrade per session, never above the user’s session choice. A failure may change decoration, never meaning, route, CTA, form state, price, or focus order.

## 3. Page-wide performance envelope

- B0 poster, heading, and CTA load with zero 3D/WebGPU engine bytes. Experience code lazy-loads after B0 is stable; Act 2+ assets start one viewport ahead.
- Field targets at p75: LCP ≤2.5s, INP ≤200ms, CLS ≤0.1. Canonical trace: no animation-related main-thread task >50ms.
- The **Full authored render/main-thread work budget is ≤16.7ms** after warm-up. Aggregate work proxies and trace-derived distributions are separate evidence and must retain their true names. Full also stays ≤3.7MP, ≤300 draw calls, and ≤192MiB. Lean authored work is ≤33.3ms, ≤2.1MP, ≤150 draws, and ≤96MiB. Still/reduced has no continuous effect loop.
- Per-effect limits below are allocations inside this page envelope, not additive entitlements. When effects compete, keep the story-bearing one and subtract the rest.
- Pause off-viewport and on `document.hidden`; coalesce worker messages; cancel callbacks; remove observers/listeners; pause media/audio; close or suspend audio graphs; dispose geometries, materials, textures, buffers, pipelines, workers, and contexts on unmount.

### Canonical frame-measurement law

- **Presentation cadence:** **rAF callback-to-callback p95 is presentation cadence, not authored work** because rAF generally follows display refresh and its timestamp marks the animation timeline/callback boundary ([MDN rAF](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame)). A direct rAF-p95 Full gate is forbidden. Capture 120 raw visible-page intervals in the same page’s authored Still state under identical conditions. The **Still-mode 120-frame cadence median identifies the refresh quantum** only; Full requires a **60Hz-or-faster** environment. A **missed presentation is any interval ≥1.5x the refresh quantum**. Raw intervals stay raw with **no fixed millisecond tolerance** and no baseline subtraction.
- **Authored work:** record **Chrome Performance task/style/layout/script deltas plus Long Animation Frame and Long Task evidence** for the same acts/windows. CDP aggregate metric deltas may report aggregate Chrome work-proxy ms/presentation by dividing attributable scripting/style/layout/render/paint work by eligible presentations. The aggregate is not per-frame data and must never be labeled p95. Keep a saved trace authoritative when LoAF is unavailable ([MDN LoAF](https://developer.mozilla.org/en-US/docs/Web/API/Performance_API/Long_animation_frame_timing); [Chrome Performance](https://developer.chrome.com/docs/devtools/performance/reference)).
- **Rung gate:** **B1 qualification requires zero missed presentations, no LoAF/long task, and aggregate Chrome work-proxy ms/presentation under 16.7ms** in the declared windows. **A saved DevTools/renderer trace is required to claim p95 and for B2/B3 production promotion**, with GPU/renderer timing, draw/pixel/memory evidence, forced-loss recovery, and bottleneck attribution; B1 aggregate evidence cannot promote a spatial renderer or claim a distribution.
- A **raw measurement receipt** keeps ordered raw rAF timestamps/intervals, Still median/refresh quantum, missed flags, raw trace/work deltas, LoAF/Long Task entries, route/build, viewport/DPR/display cadence, browser/device class, visibility, quality/rung, caps, and hysteresis decisions. Derived cadence/work summaries remain beside the raw evidence; never replace, trim, baseline-correct, or substitute one channel for the other.
- Field telemetry remains **raw unnormalized production RUM**. Preserve raw observed intervals and work signals plus declared window/mode/context metadata before aggregation. Never subtract Still calibration, refresh cadence, or lab/device baseline from production values.

## WFX-01 — Shader Surface

| Field | Contract |
|---|---|
| Job / payoff | Put light, refraction, fluid color, weather, or procedural material into one bounded surface; creates awe or tactility without making copy unreadable |
| Budget / maturity | M4 centerpiece; M3 only as the existing surgical accent. B1 encoded/CSS = PROGRESSIVE; raw WebGL2 or Three B2 = DEPENDENCY-GATED for this repo; WGSL/WebGPU B3 = RESEARCH-ONLY |
| Backend rungs | B0 authored still/gradient; B1 encoded media or CSS/SVG = PROGRESSIVE; B2 WebGL2/Three = DEPENDENCY-GATED; B3 WGSL/WebGPU = RESEARCH-ONLY. Every higher rung falls in place to the next verified rung. |
| Inputs / determinism | Versioned shader ID, seed, normalized time, pointer/audio inputs only after consent, quality/backend override, color-space and resolution manifest. No `Date.now()` or unbounded independent clock in render truth |
| Full / Lean / Still | Full: one shader surface inside the page envelope, ≤3.7MP. Lean: ≤2.1MP, half-rate or simplified pass, then encoded media. Still: authored frame/gradient, zero loop |
| Recovery | Timeout adapter/device/pipeline/first render; inspect WebGPU compilation/error scopes; handle `device.lost`, `uncapturederror`, and WebGL context loss; tear down then B3→B2→B1→B0 in place |
| A11y / static | Decorative canvas `aria-hidden`; informative output gets DOM text/table. Pause Effects freezes time. Reduced motion renders the selected authored still, not frame zero by accident |
| Implementation | Uniform updates are bounded; no per-frame React state; precompile off the critical path; cap DPR by drawing-buffer pixels; label GPU resources; large blur/filter animation is rejected |
| Wrong tool | The effect could be a graded still/video, exists only behind copy, needs unique information in pixels, or cannot recover from context loss without a blank page |

## WFX-02 — Particle Field / Swarm

| Field | Contract |
|---|---|
| Job / payoff | Show scale, wind, stars, rain, pollen, crystals, or collective motion; creates depth, aliveness, and wonder |
| Budget / maturity | M3 for ≤200 subtle particles; M4 for GPU swarms. CSS/SVG/canvas = PROGRESSIVE; instanced B2 = DEPENDENCY-GATED; compute B3 = RESEARCH-ONLY |
| Backend rungs | B0 composition with zero particles; B1 CSS/SVG/native-canvas particles = PROGRESSIVE; B2 instanced WebGL2 = DEPENDENCY-GATED; B3 compute swarm = RESEARCH-ONLY. |
| Inputs / determinism | Catalog version, fixed seed, spawn volume, forces, lifetime, density, scene time, quality override. Replays must match from the same manifest |
| Full / Lean / Still | Full: instanced swarm capped by the page frame/draw/memory limits; initial design ceiling 25k points pending measurement. Lean: ≤200 low-opacity elements or encoded layer. Still: zero particles; composition survives |
| Recovery | Density governor drops update rate/count before rung; failed worker/GPU path returns to B1 media/static. Stop spawn first, then simulation, then canvas |
| A11y / static | Particles never carry status, direction, proof, or CTA. No flashes >3/second; avoid rapid looming toward camera; Pause Effects and reduced motion remove them |
| Implementation | Instance repeats; pool objects; spatially bound overdraw; offscreen/hidden pause; no DOM node per GPU particle; deterministic sampling for snapshots |
| Wrong tool | Fewer than ~20 meaningful objects need labels/interaction, particles obscure reading, or density is being used to disguise a flat composition |

## WFX-03 — Procedural Generation

| Field | Contract |
|---|---|
| Job / payoff | Generate cities, terrain, starfields, flora, or voxel topology that feels explorable and never exactly generic |
| Budget / maturity | M4 · DEPENDENCY-GATED for live spatial generation; B1 pre-baked output is the fallback; B3 compute is RESEARCH-ONLY |
| Backend rungs | B0 authored overview; B1 pre-baked generated media = AVAILABLE fallback; B2 live WebGL2 generation = DEPENDENCY-GATED; B3 compute generation = RESEARCH-ONLY. |
| Inputs / determinism | Fixed generator/catalog version + seed + scene time + quality/backend override + asset hashes. No bare `Math.random()`, `Date.now()`, locale-dependent ordering, or render-thread clock |
| Full / Lean / Still | Full: incremental/worker generation, each main-thread slice <12ms and no task >50ms. Lean: lower topology/LOD or pre-baked media. Still: deterministic authored overview frame |
| Recovery | Invalid seed/schema, worker failure, timeout, memory breach, or non-finite geometry aborts that generator and loads a known-good manifest; never retry-loop visibly |
| A11y / static | Generated paths are decorative unless mirrored by DOM navigation. Randomness cannot reorder focus, prices, proof, choices, or reading order |
| Implementation | Validate ranges; hash the manifest; cache by version+seed; bound recursion, object count, topology, transfer size, and generation time; instance repeats and add LOD |
| Wrong tool | Hand-authored composition would be more legible, exact art direction matters more than variation, or reproducibility/provenance cannot be recorded |

## WFX-04 — Spatial Scene

| Field | Contract |
|---|---|
| Job / payoff | Make one object/world spatially present: orbit, approach, depth reveal, or flythrough; creates agency and embodied awe |
| Budget / maturity | M4 scaffolding only on licensed non-product/approved-marketing hosts; M3 retains one surgical accent. B2 DEPENDENCY-GATED; B3 RESEARCH-ONLY |
| Backend rungs | B0 art-directed frame; B1 turntable/video/layered media = PROGRESSIVE; B2 Three/WebGL2 scene = DEPENDENCY-GATED; B3 WebGPU scene = RESEARCH-ONLY. |
| Dependency truth | Three.js is the production B2 target after a spike. R3F is an adapter, not architecture; R3F 8 only while React is 18. One canvas default |
| Full / Lean / Still | Full: page envelope, reuse/instancing/LOD, demand render when restable. Lean: B1 turntable/video or simplified non-pinned scene. Still: art-directed 2D frame |
| Recovery | `<Suspense>` covers asset wait, not runtime loss. Failed import/model/context/device drops to B1/B0; retain camera-independent DOM story and action |
| A11y / static | Canvas cannot own navigation or unique copy. Interactive spatial targets have DOM controls/descriptions and logical keyboard order; no forced pointer lock/fullscreen |
| Implementation | Progressive model/texture loading, explicit dimensions, resource cache+dispose contract, bounded camera, no per-frame React state, offscreen stop |
| Wrong tool | 3D is not the point, the same idea works as 2D parallax, it makes a task slower, or the canvas becomes page scaffolding on a prohibited surface |

## WFX-05 — Scroll-Scrubbed Frame Sequence

| Field | Contract |
|---|---|
| Job / payoff | Tie a transformation or reveal to deliberate scroll progress; creates control, anticipation, and film-like causality |
| Budget / maturity | M3 · PROGRESSIVE using images/canvas/rAF; no new library required. Follow `cinematic-pages.md` §8 economics |
| Backend rungs | B0 composed poster; B1 responsive frame sequence/native canvas = PROGRESSIVE; B2 is INELIGIBLE because spatial rendering adds no sequence value; B3 is INELIGIBLE. Failed B1 remains B0. |
| Full / Lean / Still | Full: 60–120 responsive frames, ≤4–6MB desktop and ≤2MB mobile, draw only when index changes. Lean: ≤30 key frames or poster+CSS parallax. Still: composed poster |
| Recovery | First frame is truth; failed decode/network/canvas keeps poster. Abort preloads outside the scene; never block LCP or wait on the full set |
| A11y / static | Sequence conveys no copy that is absent from DOM; skip scene is keyboard-visible; reduced motion renders the chosen legible frame; no keyboard scroll hijack |
| Implementation | Priority first frame, lazy one viewport ahead, responsive `<picture>`/frame sets, decode in scroll direction, rAF-coalesced progress, explicit size prevents CLS |
| Wrong tool | The change is not understandable in static start/end frames, source cannot be compressed within budget, or scroll becomes a video seek bar with no story |

## WFX-06 — Variable-Font Animation

| Field | Contract |
|---|---|
| Job / payoff | Let one display word compress, thaw, widen, or gain grade as a narrative beat; creates tactile typographic transformation |
| Budget / maturity | M2+ · PROGRESSIVE. Browser support exists, but each font file’s axes, web license, subset, loading, and fallback metrics require verification |
| Backend rungs | B0 final static text; B1 variable-font CSS = PROGRESSIVE after font/license verification; B2 is INELIGIBLE; B3 is INELIGIBLE. Font failure preserves B0 text. |
| Safe exception | Exception to transform/opacity-only for one contained display line, never body, CTA, navigation, proof, pricing, legal, or data. Prefer registered `font-weight`/`font-stretch`; low-level axes only when needed |
| Full / Lean / Still | Full: one line, one axis (two only if measured), ≤900ms or scroll-bound, reserved box, CLS=0. Lean: static midpoint/final or opacity reveal. Still: final readable setting |
| Recovery | Font timeout/FOUT or unsupported axis uses metric-compatible static fallback; never hide text while fonts load; axis parse failure renders the final semantic text |
| A11y / static | DOM text never changes or duplicates; final reading is immediate to assistive tech; forced-colors remains plain text; reduced motion sets final axis with no transition |
| Implementation | Inspect `@font-face` ranges; subset WOFF2; use `font-display`; test every axis extreme for clipping, wrap, paint cost, and brightest-frame contrast |
| Wrong tool | The line wraps across states, the font is not licensed/variable, the beat delays reading, or transform/opacity delivers the same meaning more cheaply |

## WFX-07 — Kinetic / Generated Typography

| Field | Contract |
|---|---|
| Job / payoff | Stage an identity claim, signage build, count, mask, or controlled scramble; creates emphasis and curiosity while keeping language primary |
| Budget / maturity | M2+ · AVAILABLE with CSS/Framer; View Transitions/scroll timelines are PROGRESSIVE enhancements |
| Backend rungs | B0 final semantic phrase; B1 CSS/Framer/View-Transition enhancement = AVAILABLE/PROGRESSIVE; B2 is INELIGIBLE; B3 is INELIGIBLE. |
| Full / Lean / Still | Full: final text visible/settled ≤900ms, stagger ≤80ms and ≤5 units; max one short display phrase. Lean: word-level opacity/translate. Still: final typeset line immediately |
| Recovery | JS or feature failure leaves source-order final text. Cancel on navigation/unmount; animation cannot reset endlessly on scroll |
| A11y / static | One accessible text node exposes the final phrase; animated glyph clones are `aria-hidden`; no character-by-character live-region spam; comprehension never waits |
| Implementation | Transform/opacity default; deterministic tokens; `document.startViewTransition` only for navigation-level continuity and only through the existing feature-detected pattern |
| Wrong tool | Body copy, instructions, errors, consent, prices, or CTA clarity would be delayed; a flourish is compensating for weak words |

## WFX-08 — Scroll Film

| Field | Contract |
|---|---|
| Job / payoff | Orchestrate the four-act story as flowing and pinned scenes with earned cuts and a calm close; creates momentum and a memorable peak-end shape |
| Budget / maturity | M4 orchestration. Native sticky/IO/rAF + installed Framer are AVAILABLE; CSS timelines are PROGRESSIVE; GSAP is DEPENDENCY-GATED and earns import only for a measured long timeline |
| Backend rungs | B0 complete four-act storyboard; B1 sticky/IO/rAF/Framer orchestration = AVAILABLE/PROGRESSIVE; B2 may host only a separately licensed subordinate WFX-04 scene and is otherwise INELIGIBLE; B3 follows that subordinate scene only and never owns orchestration. |
| Full / Lean / Still | Full M4: scene ledger, total ≤20vh, ≤4 justified pins, ≤5 concurrent moving elements, ≤2 properties each. Lean: no pins, vertical scenes/posters. Still: complete static storyboard in act order |
| Recovery | Any pin/timeline/import failure releases normal document flow; progress and CTA remain reachable; deep links and browser scroll restoration remain native |
| A11y / static | Visible Skip-to-Content/scene; linear tab order; no wheel/touch/keyboard hijack or focus capture; Pause Effects freezes continuous atmosphere without hiding content |
| Implementation | One scroll owner; pins release at boundaries; temperature/light shifts at act cuts; CTA repeats only at Act 3→4 and page end; cleanup every timeline/context |
| Wrong tool | The logline or ledger is missing, content is task-first, total travel is filler, or a long page is being mistaken for a story |

## WFX-09 — Audio-Reactive Atmosphere

| Field | Contract |
|---|---|
| Job / payoff | Let user-started sound influence light, particles, or type; creates intimacy and responsive presence |
| Budget / maturity | M4 · AVAILABLE Web Audio primitives and repo patterns; PROGRESSIVE because activation, media, and device support vary. No added audio library by default |
| Backend rungs | B0 complete silent visual story; B1 Web Audio plus DOM/CSS media response = PROGRESSIVE; B2 spatial visual response = DEPENDENCY-GATED and optional; B3 compute response = RESEARCH-ONLY. |
| Full / Lean / Still | Full: analyser FFT ≤1024, visual updates ≤30Hz, batched off React render. Lean: ≤10Hz / 3-band envelope or non-reactive playback. Still: static atmosphere; user-started audio may continue with controls |
| Recovery | Audio unavailable/blocked/ended/suspended leaves the full visual story. Resume only inside user action; suspend on hidden tab; disconnect nodes and release media on exit |
| A11y / privacy | No autoplay. Visible 44px Play, Mute, and Stop with states; informational audio gets transcript/captions. Microphone input is a separate permissioned product decision, not implied by this effect |
| Implementation | Prefer existing `AudioContext` patterns; clamp/smooth analyser data; never expose raw audio or derived identity data; honor Pause Effects separately from Mute/Stop |
| Wrong tool | Sound is decorative but compulsory, the experience weakens when muted, input requires surprise microphone access, or reactive motion harms readability |

## WFX-10 — Playable Moment

| Field | Contract |
|---|---|
| Job / payoff | Offer a short optional interaction—assemble, steer, reveal, catch, or build—that expresses the world; creates agency and delight |
| Budget / maturity | M4. DOM/React/Canvas basics = AVAILABLE; physics/spatial engines = DEPENDENCY-GATED; XR version = RESEARCH-ONLY |
| Backend rungs | B0 Skip/Continue story path; B1 DOM/React/2D canvas = AVAILABLE; B2 spatial/physics moment = DEPENDENCY-GATED; B3/WebXR moment = RESEARCH-ONLY. No rung gates content or conversion. |
| Full / Lean / Still | Full: one bounded scene, ≤30s intended round, page frame envelope. Lean: simplified 2D/single-step version. Still: Skip continues to the same story/action with no penalty |
| Recovery | Load/input/game-loop failure shows an honest unavailable state plus Continue; state is ephemeral unless an explicit local save contract exists |
| A11y / ethics | Keyboard + touch + single-pointer alternative; instructions and status in DOM; pause/exit always visible; no content/conversion gate, forced fullscreen/pointer lock, fake reward, streak pressure, or pay-to-skip |
| Implementation | Deterministic seed for QA; bounded loop with stop condition; prevent accidental page-scroll capture only while focused and provide clear escape; no PII or production writes |
| Wrong tool | The “game” is a disguised form/CTA, requires motor precision without an alternative, or contributes no understanding of the offer/world |

## WFX-11 — 3D Product Orbit

| Field | Contract |
|---|---|
| Job / payoff | Let visitors inspect a meaningful object/model from controlled angles; creates trust, tactility, and ownership |
| Budget / maturity | M3 surgical / M4 centerpiece · B2 DEPENDENCY-GATED; B3 RESEARCH-ONLY. B1 turntable video is PROGRESSIVE |
| Backend rungs | B0 best three-quarter still + DOM description; B1 pausable turntable video/still set = PROGRESSIVE; B2 Three/WebGL2 orbit = DEPENDENCY-GATED; B3 WebGPU orbit = RESEARCH-ONLY. |
| Full / Lean / Still | Full: one model/canvas inside page envelope, bounded camera, LOD and compressed textures. Lean: pausable turntable video or limited angle still set. Still: best 3/4 hero frame + DOM description |
| Recovery | Model/decoder/context failure swaps to turntable/still without layout shift. Disposal releases controls, buffers, textures, and observers |
| A11y / static | Drag has 44px Rotate left/right/reset buttons and keyboard keys; current view announced only on committed steps; product facts and actions remain DOM-owned |
| Implementation | Optimize GLTF/Draco only after approved dependency/tooling spike; cap zoom/rotation; progressive texture load; demand render at rest; explicit dimensions |
| Wrong tool | The reverse side carries no useful information, photography is clearer, the asset provenance is uncertain, or orbit blocks purchase/task flow |

## WFX-12 — Atmospheric System

| Field | Contract |
|---|---|
| Job / payoff | Coordinate fog, rain, steam, god rays, grain, aurora, light shafts, or depth haze into one coherent weather/light system; creates place and emotional continuity |
| Budget / maturity | M3 ≤2 restrained layers; M4 remains budget-bounded. CSS/Framer = AVAILABLE; media/canvas = PROGRESSIVE; GPU atmosphere = DEPENDENCY-GATED/RESEARCH-ONLY by rung |
| Backend rungs | B0 composed static light/fog/grain; B1 CSS/Framer/media atmosphere = AVAILABLE/PROGRESSIVE; B2 WebGL2 atmosphere = DEPENDENCY-GATED; B3 compute atmosphere = RESEARCH-ONLY. |
| Full / Lean / Still | Full M4: ≤3 atmospheric layers and still within the page cap of 5 concurrent moving elements. Lean: one motion layer + static grain/depth. Still: composed static light/fog/grain |
| Recovery | Each layer can fail independently; remove the most expensive foreground/weather layer first, then encoded media, while scrims and B0 remain |
| A11y / static | Atmosphere never lowers 4.5:1 at the brightest frame, hides focus, simulates flashes, or crosses copy aggressively; Pause Effects freezes all continuous layers |
| Implementation | Transform/opacity layers; animate pre-rendered glow opacity, not large box-shadow/filter/blur; coherent light direction; pause/decode/dispose lifecycle per §3 |
| Wrong tool | “Premium” means piling on glow/fog, layers have no world-DNA job, or a single art-directed still carries the atmosphere better |

## WFX-13 — Living Data

| Field | Contract |
|---|---|
| Job / payoff | Let real values drive supplemental form, light, density, or motion so evidence feels alive; creates relevance and trustworthy momentum |
| Budget / maturity | M2+ · Victory/table authority = AVAILABLE; supplemental SVG/canvas mapping = PROGRESSIVE; GPU sculpture = DEPENDENCY-GATED and M4-only |
| Backend rungs | B0 timestamped accessible table/summary; B1 Victory/SVG supplemental form = AVAILABLE/PROGRESSIVE; B2 WebGL2 sculpture = DEPENDENCY-GATED and supplemental; B3 GPU sculpture = RESEARCH-ONLY. Data truth remains B0/B1. |
| Safe exception | Product/product-adjacent surfaces retain a canonical Victory chart or accessible table. Generative art is supplemental and may not alter scale, baseline, certainty, comparison, missingness, or meaning |
| Full / Lean / Still | Full: batch visual updates ≤2Hz unless the real source is slower; no task >50ms. Lean: ≤0.2Hz or on committed samples. Still: timestamped snapshot + authoritative chart/table |
| Recovery | Stale/disconnected/error states are explicit with last-updated time; never invent, interpolate as fact, or hold the last value as “live.” Supplemental art may disappear without losing evidence |
| A11y / truth | DOM table/summary names units, time range, source, missing values, and uncertainty; live regions announce only meaningful committed changes, throttled; color/motion never sole encoding |
| Implementation | Version and test the data→visual mapping; clamp domains transparently; preserve zero/negative/outlier semantics; pause offscreen; use Victory for every product chart |
| Wrong tool | Data is mock, decoration would imply false precision, the mapping cannot be explained in one sentence, or spectacle competes with the decision the data supports |

## 4. Frontier annex — experiments, not inherited permission

| Lane | Research contract | Required fallback |
|---|---|---|
| **F1 WebGPU compute worlds** | Large swarms, procedural terrain/cities, fluid/SDF effects; B3 only after error scopes, `device.lost`, deterministic seed, budgets, and repeatable snapshots | B2 simulation → B1 encoded result → B0 still |
| **F2 Browser-native continuity** | View Transitions for navigation-level continuity; CSS scroll/view timelines behind feature detection; never essential to interruption, cancellation, or reading | Final DOM state immediately |
| **F3 Worker rendering** | OffscreenCanvas/module worker only when profiling proves main-thread relief; bounded/coalesced messages, explicit worker/context teardown | Main-thread Lean renderer or B1 |
| **F4 Photoreal spatial capture** | Gaussian-splat portals for authorized environments only; consent, location/likeness review, progressive LOD, transfer/memory manifest | Pausable video → licensed still |
| **F5 Frame-synchronous media** | `requestVideoFrameCallback()` for decoded-frame sync; WebCodecs only for real low-level transformation, never ordinary playback | Standard `<video>`/frame sequence → poster |
| **F6 WebXR portal** | Sean-approved campaign/installation only; explicit Enter XR, secure-context permission/capability checks, privacy/comfort review, visible exit; no conversion gate | Conventional web experience at B2/B1/B0 |

## 5. Official research anchors (verified 2026-07-12)

- GPU/device loss/error scopes: [W3C WebGPU](https://gpuweb.github.io/gpuweb/) and [WGSL](https://gpuweb.github.io/gpuweb/wgsl/).
- Production/frontier renderers: [Three.js WebGPURenderer guide](https://threejs.org/manual/en/webgpurenderer), [R3F React pairing](https://r3f.docs.pmnd.rs/getting-started/introduction), [R3F scaling performance](https://r3f.docs.pmnd.rs/advanced/scaling-performance), and [TypeGPU](https://docs.swmansion.com/TypeGPU/).
- Browser-native motion/media: [View Transitions](https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API), [scroll-driven timelines](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Scroll-driven_animations), [OffscreenCanvas](https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas), [`requestVideoFrameCallback`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLVideoElement/requestVideoFrameCallback), [WebCodecs](https://developer.mozilla.org/en-US/docs/Web/API/WebCodecs_API), and [Page Visibility](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API).
- Type/audio/accessibility: [variable fonts](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Fonts/Variable_fonts), [Web Audio usage](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Using_Web_Audio_API), [autoplay policy](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay), and [WCAG 2.2](https://www.w3.org/TR/WCAG22/).
- Frontier/QA: [W3C WebXR](https://www.w3.org/TR/webxr/), [Inria 3D Gaussian Splatting](https://repo-sam.inria.fr/fungraph/3d-gaussian-splatting/), [Playwright Clock](https://playwright.dev/docs/clock), [reduced-motion emulation](https://playwright.dev/docs/api/class-page#page-emulate-media), and [visual comparisons](https://playwright.dev/docs/test-snapshots).

These sources guide a spike; they do not certify Swan compatibility. Promotion still requires the license ritual, dependency review, deterministic manifest, forced-loss tests, browser QA, and zero unresolved P0/P1 findings.

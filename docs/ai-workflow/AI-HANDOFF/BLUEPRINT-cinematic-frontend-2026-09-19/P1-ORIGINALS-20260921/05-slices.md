All test paths listed here are **NEW planned tests** detailed in `09-tests.md`. Commands run from `frontend/` unless stated otherwise.

| Slice | Files and work | Acceptance command / proof |
|---|---|---|
| **A0 — Intake** | Read-only receipt, caller inventories, dependency metadata, baseline, doctrine check. Record output inside this package’s existing documents and approved QA location. | `git status --short`; `npm ls react react-dom three gsap framer-motion --depth=0`; baseline type/build commands. No implementation before receipt. |
| **A1 — Pure tier policy** | NEW `performanceTierPolicy.ts` and unit test. Implement exact precedence and unknown handling. | `npx --no-install vitest run src/core/perf/performanceTierPolicy.test.ts` |
| **A2 — Provider lifecycle** | Existing `PerformanceTierProvider.tsx`; test. Canonical state, safe subscriptions, functional updates, restricted overrides. | `npx --no-install vitest run src/core/perf/PerformanceTierProvider.test.tsx` |
| **A3.n — Consumer migration** | `useAnimationTier.ts`, actual provider consumers, twelve sections, background/video consumers; batches ≤8 files. Temporary name adapters allowed. | `npx --no-install vitest run src/hooks/useAnimationTier.test.tsx`; type check; caller-specific smoke tests. Final batch removes old literals and duplicate detection. |
| **A4 — Token projection** | NEW motion token modules and verified existing style-root integration. | `npx --no-install vitest run src/core/perf/motionTokens.test.ts` |
| **A5.n — Helper repair** | `motion-helpers.tsx` and actual callers only. Duration/stagger correction, reduced path, caller-aware wrapping. | `npx --no-install vitest run src/utils/motion-helpers.test.tsx`; relevant caller tests. |
| **A6 — GSAP cleanup** | `PremiumParallax.tsx`; extract focused styles/effects if required to meet file cap. Preserve its public contract and appearance. | `npx --no-install vitest run src/components/PremiumParallax/PremiumParallax.lifecycle.test.tsx`; browser mount-cycle test. |
| **A7 — Static Act 1** | Existing `HeroSection` and V4 integration as verified; NEW poster/styles. Exact copy, layout, CTA binding, static reduced state. | `npx --no-install playwright test -c playwright.cinematic.config.ts tests/cinematic/home.spec.ts` |
| **A8 — Scene construction** | NEW `homeHeroSpec.ts`, `homeHeroFactory.ts`, `HeroSignatureScene.tsx`; exact compatible R3F 8 pin. Reuse existing geometry. | `npx --no-install vitest run src/three/swanMark/homeHeroFactory.test.ts`; peer check; build. |
| **A9 — Enhancement boundary** | NEW `HeroSignature.tsx`; integrate into Hero. Cancellation, first-frame handoff, errors, context loss. | `npx --no-install vitest run src/pages/HomePage/components/sections/HeroSignature.test.tsx`; full/fallback browser cases. |
| **A10.n — Motion budget** | Existing animation primitives and section callers, ≤8 files per batch. Single wrapper reveals, static nested effects, final counters. | `npx --no-install playwright test -c playwright.cinematic.config.ts tests/cinematic/motion-budget.spec.ts` |
| **A11 — A acceptance** | Actual V4 route, screenshots, accessibility, bundle and performance evidence. | Commands in `09-tests.md`; no waived thresholds disguised as passes. |
| **B1a — Framer** | Verified `framer-motion` candidate, lockfile, actual API adjustments. Keep import names. | Helper tests, home motion tests, type/build, existing animation caller tests. |
| **B1b — Lucide** | Verified candidate; fix compiler-proven export/API changes only, in bounded batches. | Type/build; icon rendering smoke on changed callers. |
| **B1c — Helmet** | Verified candidate; retain existing provider architecture. | Metadata mount/update/unmount tests and actual home browser checks. |
| **B1d — Simple Maps** | Verified candidate and its actual consumer. | Synthetic-data render/interaction test, type/build. |
| **B2a — React 19 preparation** | Generate compiler/dependency/caller manifest; React-18-compatible type corrections in ≤8-file batches. | Type/build on React 18; no automatic rewrite of every `useRef`. |
| **B2b — Cohort switch** | Isolated branch: React/DOM, types, R3F 9, Leaflet 5, required verified peers. | Clean dependency install, peer validation, type/build, React 19 test suite. |
| **B2c — Runtime acceptance** | Error boundaries/reporting, metadata, charts, drag/drop, lazy maps, scene lifecycle. | Actual caller tests with synthetic data; review and complete-cohort rollback rehearsal. |

**Nine supplied defects — disposition**

| Packet defect | Decision |
|---|---|
| §6.1 competing tiers | A1–A3: single provider authority, canonical vocabulary, bounded adapters. |
| §6.2 effect churn | A2: remove state dependency; stable subscriptions; pure updater. |
| §6.3 missing tokens | A4: shared numeric source and CSS projection. |
| §6.4 stagger ceiling | A5: 60ms; A10 independently enforces concurrency. |
| §6.5 missing helper gate | A5: explicit static variants and actual-consumer migration. |
| §6.6 inert `withMotion` | A5: caller classification and correct wrapping; no blind deletion. |
| §6.7 unmapped durations | A5: response defaults; explicit narrative signature. |
| §6.8 GSAP cleanup | A6: reproduce and fix resource ownership; verify real triggers. |
| §6.9 file-local contradiction | A0 documentation amendment plus A1/A9 implementation separation. |

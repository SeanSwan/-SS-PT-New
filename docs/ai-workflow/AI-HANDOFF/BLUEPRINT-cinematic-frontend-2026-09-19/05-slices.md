**P2 amendment applied 2026-09-21. Affected A slices replaced; B1/B2 retained except the cancelled R3F
cohort entry. P1 text preserved in `/tmp/p1-originals-20260921/05-slices.md` (md5-verified). **Correction 2026-09-21:** the earlier “*Not* in git history” note was wrong — this directory is **not** gitignored — the `.gitignore:496` claim was false (line 496 is blank, and the rules target `.ai-workflow/`, not `docs/ai-workflow/`); this packet is tracked in git as of 2026-09-21.**

Commands below run from `frontend/` using already installed tools. Missing tooling is a preparation blocker; these commands do not authorize package installation.

> **Gate that applies to every command below.** This tree OOMs at Node's ~4 GB default heap.
> Export `NODE_OPTIONS=--max-old-space-size=8192` before any `tsc` invocation, or it will exit 134
> with no diagnostics and look like a code failure. Measured 2026-09-21; baseline is zero errors.

| Slice | Concrete work | Exit evidence |
|---|---|---|
| A0r | Complete `04` receipts and reconcile overlapping P3 decisions | Receipt contains exact paths/hashes, measured baseline and explicit missing evidence. **— DONE 2026-09-21, 7/10 items; see `A0r-INTAKE-RECEIPT.md`** |
| A1 | Pure resolution with distinct pending phase | P1 tests pass. **— DONE 2026-09-21, 18/18; `SLICE-RECEIPTS-2026-09-21.md`** |
| A2 | Stable provider subscriptions; lower-only overrides | P2 tests pass; no listener accumulation. **— DONE 2026-09-21, 13/13 + mutation-proved** |
| A3 | Migrate measured hook/provider consumers | P3 tests and type check pass; About/direct-consumer behavior recorded. **— DONE 2026-09-21, 7/7 + tsc EXIT=0** |
| A4 | One motion-values module and CSS projection | P4 tests pass; no independent duplicate values. **— DONE 2026-09-21, 12/12** |
| A5 | **Cancelled:** dormant helper repair | Cancellation recorded; no runtime-improvement claim. |
| A6 | Delete `PremiumParallax` and allowlisted exclusive dependencies | D1 inventory, D2 type/build; no GSAP install. **— DONE 2026-09-21, allowlist = 1 file, tsc EXIT=0** |
| A7 | Static composition, reference provenance, hero poster, unchanged CTA delegation | **— PARTIALLY DONE 2026-09-21. `tests/cinematic/home.spec.ts`: 18 cases, 20/20 green in real Chromium, mutation-proved (removing the signup CTA fails 7, removing a capsule fails 5). H1 ✓, H3 ✓, H2's keyboard case ✓. Ruling 3's raw `rgba(0,217,255)` header-logo glow replaced with Ice Wing `#60C0F0`. NOT done: the Act-1 static composition, the hero poster and reference provenance — all three depend on A0r §13 item 5 (reference screenshots), still NOT TAKEN. H2's poster/first-frame registration cases need `HeroSignature` (A9).** |
| A8 | House-controller reveal, presentation callbacks and bounded backing | **DONE 2026-09-21 — 59/59 tests, `tsc` EXIT=0, three modules extracted, mutation-proved. Header defaults unchanged.** R3 (`swanMarkScene.behavior.test.ts`) and R4 are harness tests requiring a real browser and remain unrun — see `A8-NOTES-2026-09-21.md`. Backing contract fixed to shipped `maxBacking = 1024` |
| A9 | Lazy boundary, first-frame handoff and terminal fallback states | **— DONE 2026-09-21/22. `HeroSignature.tsx` + `heroSignatureMachine.ts`, MOUNTED in `HeroSection.tsx` behind a poster that is pixel-identical to the shipped logo. L1–L5: 15/15. Machine suite: 29/29 (its own file — A8's extraction lesson). Real-browser half: `tests/cinematic/signature.spec.ts`, 6/6. Mutation-proved 4 planted / 3 killed; the survivor (`disabled` terminal guard) is redundant-by-construction, proven by enumerating all six phase×tier combinations, and is documented in source rather than removed.** |
| A10 | Apply home-specific motion restrictions through mounted callers | **— DONE 2026-09-22.** `tests/cinematic/motion-budget.spec.ts` 8/8. Measured 41 concurrent targets, fixed to **3** (exactly the cap, one property each). Five home callers gated via `HOME_TEXT_SPLIT_ENABLED`. M3's violating fixtures all present and passing (four targets, third property, 100ms stagger) plus a compliant-fixture control. **One violation recorded and NOT fixed:** the hero entrance animates 9 wrappers vs “at most one wrapper” — re-choreographing the shipped hero needs Sean's ruling, so it is surfaced, not taken. M1/M2 real-browser lifecycle cases remain unwritten. |
| A11 | Production-route visual, accessibility, bundle and performance acceptance | Q1–Q3 plus C2–C4; report failures and unavailable measurements precisely. **— Q1 DONE 2026-09-22** (`tests/cinematic/build-boundary.test.ts`, 6/6): the home entry's static import closure contains **zero** edges to `three` or the mesh, both are dynamic, and the detector is mutation-proved against rollup's real output. Q2/Q3 NOT DONE. The “needs browser infra that does not exist” blocker is WITHDRAWN 2026-09-21: `frontend/playwright.cinematic.config.ts` and `frontend/tests/cinematic/` both exist and the harness runs (20/20 Chromium). `npm run build` also exits 0, so that blocker is withdrawn too. What genuinely remains: LCP is unmeasured, and Q3's GPU/presentation cases need recorded real hardware.** |

**Exact command groups**

```text
node node_modules/vitest/vitest.mjs run src/core/perf/performanceTierPolicy.test.ts src/core/perf/PerformanceTierProvider.test.tsx src/hooks/useAnimationTier.test.tsx src/core/perf/motionTokens.test.ts
```

```text
node node_modules/vitest/vitest.mjs run src/components/SwanMark3D/swanMarkScene.behavior.test.ts src/pages/HomePage/components/sections/HeroSignature.test.tsx tests/cinematic/build-boundary.test.ts
```

```text
node node_modules/typescript/bin/tsc --noEmit
npm run build
```

```text
node node_modules/@playwright/test/cli.js test -c playwright.cinematic.config.ts tests/cinematic/home.spec.ts tests/cinematic/signature.spec.ts tests/cinematic/motion-budget.spec.ts --project=chromium
```

```text
node node_modules/@playwright/test/cli.js test -c playwright.cinematic.config.ts tests/cinematic/performance.spec.ts --project=chromium --headed --workers=1
```

All named tests are **planned, NOT RUN** in this consultation.

> **A0r finding — they are also not yet written.** None of the eight named test files and neither named
> config (`playwright.cinematic.config.ts`) exists. `frontend/tests/` does not exist at all. Existing
> runners: `frontend/vitest.config.ts` (`include: src/**` — so `tests/cinematic/*` is outside it) and
> `frontend/playwright.config.ts` (`testDir: './e2e'`). Build-boundary and every browser case therefore
> need new config before they can run at all. Details: `A0r-INTAKE-RECEIPT.md` §8.

> **2026-09-21 execution update — REVISED LATE THE SAME DAY.** The first command group is green, but
> the count has grown past the original note: the unit surface is now **8 files / 109 tests passed**
> (A1–A4 plus A8's four SwanMark suites), `tsc --noEmit` EXIT=0 and `npm run build` EXIT=0.
>
> **The claim that "the other four command groups still cannot run" is now FALSE and is withdrawn.**
> `playwright.cinematic.config.ts` and `frontend/tests/cinematic/` were created 19:41–19:43 on
> 2026-09-21, after A0r §8 was written. The browser group runs: **20/20 in real Chromium.** A0r §8 was
> accurate when written and is now stale — do not re-derive a blocker from it without re-measuring.
>
> Still genuinely unrunnable: `tests/cinematic/signature.spec.ts`, `motion-budget.spec.ts`,
> `performance.spec.ts` and `build-boundary.test.ts` — those files do not exist, and the first two
> need `HeroSignature`, which is unbuilt.
> Per-slice evidence: `SLICE-RECEIPTS-2026-09-21.md`.

> **Heap prerequisite applies to `tsc`.** `NODE_OPTIONS=--max-old-space-size=8192` or the tree OOMs at
> the ~4 GB default and exits 134 with **no diagnostics**, which reads as a code failure. Applying it,
> `tsc --noEmit` returned **EXIT=0 with zero output lines** after every slice in this round.

**Nine supplied defects — disposition** *(P2 amended)*

| Packet defect | Decision |
|---|---|
| §6.1 competing tiers | A1–A3: single provider authority, canonical vocabulary, bounded adapters. |
| §6.2 effect churn | A2: remove state dependency; stable subscriptions; pure updater. **P2 adds: pending must be a distinct phase so the bootstrap cannot latch disablement.** |
| §6.3 missing tokens | A4: shared numeric source and CSS projection. |
| §6.4 stagger ceiling | A4 (not A5): 60ms; A10 independently enforces concurrency. |
| §6.5 missing helper gate | **A5 cancelled.** No runtime-improvement claim is made; the dormant helper is not represented as a live-home fix. |
| §6.6 inert `withMotion` | **A5 cancelled.** Same as above. |
| §6.7 unmapped durations | A4: response defaults; explicit narrative signature. |
| §6.8 GSAP cleanup | **A6 reclassified: bounded deletion, not cleanup.** The component has zero importers; there is nothing to reproduce or repair. |
| §6.9 file-local contradiction | A0r documentation amendment plus A1/A9 implementation separation. |

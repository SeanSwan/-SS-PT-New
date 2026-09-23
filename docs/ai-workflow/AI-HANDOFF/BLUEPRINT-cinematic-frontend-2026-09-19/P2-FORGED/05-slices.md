**Replace affected A slices; retain B1/B2 except the cancelled R3F cohort entry.**

Commands below run from `frontend/` using already installed tools. Missing tooling is a preparation blocker; these commands do not authorize package installation.

| Slice | Concrete work | Exit evidence |
|---|---|---|
| A0r | Complete `04` receipts and reconcile overlapping P3 decisions | Receipt contains exact paths/hashes, measured baseline and explicit missing evidence. |
| A1 | Pure resolution with distinct pending phase | P1 tests pass. |
| A2 | Stable provider subscriptions; lower-only overrides | P2 tests pass; no listener accumulation. |
| A3 | Migrate measured hook/provider consumers | P3 tests and type check pass; About/direct-consumer behavior recorded. |
| A4 | One motion-values module and CSS projection | P4 tests pass; no independent duplicate values. |
| A5 | **Cancelled:** dormant helper repair | Cancellation recorded; no runtime-improvement claim. |
| A6 | Delete `PremiumParallax` and allowlisted exclusive dependencies | D1 inventory, D2 type/build; no GSAP install. |
| A7 | Static composition, reference provenance, hero poster, unchanged CTA delegation | H1–H3 pass; missing CTA receipt blocks wiring changes. |
| A8 | House-controller reveal, presentation callbacks and bounded backing | R1–R4 pass; header defaults unchanged. |
| A9 | Lazy boundary, first-frame handoff and terminal fallback states | L1–L5 and real-browser signature cases pass. |
| A10 | Apply home-specific motion restrictions through mounted callers | M1–M3 pass, including deliberate violating fixtures. |
| A11 | Production-route visual, accessibility, bundle and performance acceptance | Q1–Q3 plus C2–C4; report failures and unavailable measurements precisely. |

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

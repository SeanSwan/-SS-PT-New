# MOBILE-VIEWPORT-MATRIX — the phone-truth responsive doctrine (Charter v3 Phase M.1)

**Established 2026-07-07** from top-50-phone research (Counterpoint best-sellers 2024–Q4'25, TelemetryDeck iPhone install base 6/2026, StatCounter US mobile Jan–Jun 2026 — full sourced report in the M.1 research record). StatCounter mobile "resolutions" are CSS `screen.*` px, so buckets map 1:1 to viewports. **This matrix supersedes the ad-hoc 320/375/414 phone shortlist** in the rule-24 audit matrix (desktop classes 768→3840 unchanged).

## The P1–P12 priority buckets (~93% of identifiable US mobile traffic)

| P | Viewport (portrait) | DPR | US share | Stands in for | Safe-area notes |
|---|---|---|---|---|---|
| P1 | 414×896 | 2 | 18.8% | iPhone XR / 11 / XS Max / 11 Pro Max | notch top 48pt · bottom 34pt |
| P2 | 390×844 | 3 | 12.4% | iPhone 12 / 13 / 14 / 16e | notch 47pt · 34pt |
| P3 | 393×852 | 3 | 6.3% | iPhone 14 Pro / 15 / 16 | Dynamic Island 59pt · 34pt |
| P4 | 375×812 | 3 | 6.7% | iPhone X / 12-13 mini | notch 44-50pt · 34pt — narrow+notched squeeze test |
| P5 | 402×874 | 3 | 4.3%↑ | iPhone 16 Pro / 17 / 17 Pro | Dynamic Island ~59-62pt · 34pt |
| P6 | 360×780 | 3 | 4.0% | Galaxy S22–S25 + A15/A16/A25/A36 | punch-hole; **the pixel-perfect Android floor width** |
| P7 | 412×915 | 2.625 | 3.0% | Pixel 6–8a, Moto G family, A5x (merges 412×892/905/923) | Chrome URL bar ±56dp |
| P8 | 430×932 | 3 | 3.5% | 14 Pro Max / 15 Plus / 15 Pro Max / 16 Plus (merges 428×926) | Dynamic Island · 34pt |
| P9 | 384×832 | 3.75 | 4.4% | Galaxy S23–S25 Ultra (WQHD) | highest-DPR hairline test |
| P10 | 375×667 | 2 | 3.3% | iPhone SE2/SE3/8 | no insets; **shortest mainstream viewport** — vertical-crowding test; PT clientele skews older → overweight |
| P11 | 440×956 | 3 | 3.0%↑ | 16 Pro Max / 17 Pro Max | widest mainstream phone |
| P12 | 320×568 | 2 | ~2% | SE1 + display-zoomed Androids | **degrade-gracefully floor only** (no h-scroll, nothing clipped) — 360 is the pixel-perfect floor |

Ultra ambiguity: the same Galaxy Ultra reports 384×832 (WQHD) or 412×892 (FHD+ default) per user display setting — P7+P9 cover both.

## Sweep rules (what "pixel perfect" asserts per bucket × surface)

No horizontal scroll · no clipped/overlapping critical text or controls · 44px touch targets · sticky-bar/FAB collision-free · `env(safe-area-inset-*)` honored where fixed elements exist (requires `viewport-fit=cover`) · hairlines visible at the bucket's real DPR (0.5/1px borders die at DPR 2, double at 3.75) · keyboard-open state: fixed CTAs must not sit under the keyboard (visual-viewport, logger forms especially).

## Playwright gotchas (verified against this repo's playwright-core)

1. **Built-in device descriptors are INCONSISTENT:** `iPhone 13` = 390×664 (Safari chrome subtracted), `Galaxy S24` = 360×780 (full), `Pixel 7` = 412×839 (Chrome subtracted). **Never use named descriptors — pin explicit `{viewport, deviceScaleFactor, isMobile, hasTouch}` per bucket.**
2. Test BOTH chrome states for `vh`-dependent surfaces: chrome-visible (`svh`, ≈ height −100..180pt iOS / −56dp Android) and expanded (`lvh`, the full heights above). `100vh` on Android Chrome = largest viewport → overflows under visible chrome; use `dvh/svh/lvh`.
3. Playwright's WebKit does NOT simulate iOS safe-area insets — the sweep injects CSS overrides (`--safe-top: 59px` etc.) to smoke Dynamic-Island overlap; real-device spot-check is a launch-gate nicety, not a per-slice gate.
4. Run at each bucket's true DPR for hairline/sheen assertions.
5. Also spot-check browser font-size 125% (the 320×693 bucket proves real users run enlarged display scaling).

## PORTABILITY DOCTRINE (Sean 2026-07-07 — MANDATORY for the sweep tool)

The sweep system must be **lift-out reusable in any web app**: it lives at `tools/viewport-sweep/` as a self-contained package — zero SwanStudios imports; the bucket matrix as a plain data module (`buckets.mjs`); everything app-specific (base URL, route list, per-route ready-selectors, auth strategy) injected via `viewport-sweep.config.mjs`; its own README with a 3-step "use in another app" recipe. Copying the folder + writing a new config = working sweep in any project.

## Surface priority order (M.2)

Coach command center → workout logger (incl. this arc's new panels) → client home + rails → charts grid + expand modal → nutrition workspace → schedule → store → home/about → auth.

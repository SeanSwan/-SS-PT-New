# Sheen tier — orb positioning: measured, and the proposed fix REJECTED (2026-09-02)

**Status:** closed. No code change to the orb. Read this before "fixing" it again.

## The proposal
Both hostile reviews (GLM 5.3 M1, GLM 5.3 Flash S2.5) independently recommended
changing `.sw-sheen__orb` from `inset-block-start/inline-start` to a `transform`,
on the reasoning that inset triggers layout → paint per frame while transform is
compositor-only, and that this compounds across ~20 planned sheen surfaces.

The reasoning is textbook-correct. It is also, on the evidence below, **not the
thing that costs anything here.**

## Method
`ForgeButton` with `sheen`, real components, one page. Both modes driven by the
SAME rAF loop writing the SAME number of custom properties per frame per orb —
only the property differs (inset vs `translate`). Frame deltas collected from
`requestAnimationFrame` timestamps, first 5 frames discarded, ~2.5-3s per run.
Layer count scaled by cloning the grid. Chromium via Playwright.

## Result

| sheened controls | inset mean | transform mean | delta | frames >16.7ms |
|---|---|---|---|---|
| 12 | 4.17 ms | 4.17 ms | 0.00 | 0 / ~700 |
| 48 | 6.71 ms | 7.10 ms | **−0.39** (transform slower) | 0 / ~400 |
| 96 | 8.08 ms | 7.54 ms | +0.54 (transform faster) | 2 vs 1 / ~400 |

A repeat run of `inset` at N=12 gave 4.17 ms — stable.

**The delta is ±0.5 ms and it flips sign between runs. That is noise, not signal.**
Even at 96 orbs — eight times any realistic page — both modes hold under 8.1 ms
mean with p95 12.5 ms.

## Conclusion
**Do not make the change.** It is a behavioural change to a shipped visual with no
measured benefit. Cost here scales with **layer count** (each frame carries a
spinning conic, a shimmer, a band/scene and a blurred orb), not with the
positioning property. Changing the property optimises the wrong term.

## What was done instead
A dev-only per-page budget warning in `SheenFrame.tsx` (`SHEEN_BUDGET = 6`).
Flash's review correctly noted that "exactly 1 sheen frame" was OBSERVED on the
homepage and never ENFORCED. Six is a design ceiling, not the measured limit: the
sheen is a hierarchy signal, and a page wearing seven of them signals nothing.

## Honest limits of this measurement
- **Desktop GPU only.** The reviews' concern was explicitly low-end mobile, and
  that is NOT tested here. This measurement refutes the finding on this hardware;
  it does not refute it on a budget Android device.
- The harness drove writes directly rather than through `useSheenPointer`, to
  isolate the rendering cost from the engine's own work.
- No CPU throttling was applied. A 4×/6× throttled run is the obvious next step
  if the tier ever reaches several surfaces per page.

## If you are here to re-open this
Bring a measurement, not an argument. The seams exist (`lastFrameWrites`,
`measureCount` on the engine) and the harness shape is in this document's method
section. The reasoning that motivated the change was sound; the numbers simply
did not agree, and on this codebase numbers win.

# Performance Budget Charter — Crystalline effect cost (Kimi roadmap #6)

> **Purpose.** Kimi's call: "Crystalline's biggest real-world risk is effect cost, not aesthetics." Caustics,
> facets, backdrop-filter, and canvas fields are beautiful and expensive. This charter sets hard budgets per
> surface so an activation flip can't quietly regress LCP/INP — especially on the money path (Store, Gallery)
> and on mid/low-end mobile Safari. A budget breach on a live surface is a `FLAG-FLIP-RUNBOOK.md` abort trigger.

## 1. Core Web Vitals budgets (field-representative, 75th percentile)
| Metric | Budget (all surfaces) | Money surfaces (Store, Gallery) |
|---|---|---|
| **LCP** | ≤ 2.5s | ≤ 2.0s |
| **INP** | ≤ 200ms | ≤ 150ms |
| **CLS** | ≤ 0.10 | ≤ 0.05 |
| **TTFB** | ≤ 0.8s | ≤ 0.8s |
Hero LCP element (poster/first image) must be `fetchpriority="high"`, never behind a lazy chunk. The V-next
optics chunk stays `React.lazy` and OUT of the critical path (it already does — the gate keeps it out while off).

## 2. Effect budgets (the Crystalline-specific risks)
- **`backdrop-filter`:** at most ONE full-viewport backdrop-filter layer per surface; none stacked. Prefer a
  pre-rendered frost texture over a live blur on scroll.
- **Canvas/caustic fields:** render at reduced internal resolution and upscale (the shipped `useCaustics`
  pattern); cap at ~30fps; pause via IntersectionObserver when off-screen; never run a rAF loop on an unmounted
  or backgrounded surface.
- **Animated properties:** transform/opacity ONLY. Banned in loops: `box-shadow`, `filter`,
  `background-position`, `top/left/width/height` (layout/paint thrash).
- **Reduced motion:** every effect has a static equivalent, disabled in **JS** (`initial={false}` / start-settled),
  not only CSS — an off effect must cost zero, not "render then hide."
- **DOM weight:** justified grids / long lists virtualize or paginate (cursor-based) — no 500-node paint on the
  Gallery grid.

## 3. Device + browser gate
- Primary probe class: **mid-tier mobile Safari** (iOS is the strictest for backdrop-filter + canvas cost).
- Verify at the Rule-24 matrix widths; measure the money surfaces FIRST.
- 4× CPU throttle + "Fast 3G" as the floor scenario for LCP/INP on Home, Store, Gallery.

## 4. Enforcement
- Measure per surface BEFORE its flag flip (a `FLAG-FLIP-RUNBOOK.md` §0 precondition).
- A live breach after a flip → abort (flip off), profile, fix, re-measure, re-flip.
- Track the numbers in the surface's phase audit (Rule 48). A future Lighthouse-CI / bundle-size gate can
  mechanize this; today it is a measured checklist.

## 5. Status
- Budgets: **SET** (this doc). Automated Lighthouse-CI gate: **pending** (proposed, not installed). No surface
  measured against these budgets yet — measurement is a precondition of the first flip, not an afterthought.

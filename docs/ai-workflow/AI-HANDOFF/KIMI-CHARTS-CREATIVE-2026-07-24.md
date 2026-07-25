# Kimi K3 — Front-End / Design Review

**Reviewer:** OpenRouter `moonshotai/kimi-k3` (effort: medium)
**Document:** C:/tmp/ss-trainer-dash/docs/ai-workflow/brainstorms/charts-expansive-upgrade-hive-mind-2026-07-24.md
**Seed:** (none)
**Tokens:** 3266 in / 1888 out · **Cost:** ~$0.0381 · **Wall:** 77.7s

---

# Kimi K3 — Hostile Design + Front-End Review: "Charts as the Progress-Proof Retention Engine"

---

## (a) VERDICT: **SHIP-WITH-CHANGES**

Strong strategic spine (data-truth, hive-mind, trophy loop) but it's a *strategy* brief that dodges the hard *craft* questions it claims to own. It scopes 6 features, names zero visual signatures, and leaves the "premium" claim as an assertion, not a design.

---

## (b) DESIGN WEAKNESSES (most severe first)

**1. NO SIGNATURE MOMENT IS DESIGNED — only asserted.** The brief says "premium," "alive," "awe surface," "cinematic story layer" — and specifies *nothing visual*. What does a Crystalline Swan chart *look like* that a competitor can't clone? The only brand-specific element mentioned is reusing the Crystal Ring — a component from another feature. A chart suite with no bespoke visual identity is a Victory default theme with a dark background. That's the definition of template feel.

**2. Missing palette/depth spec for data-viz specifically.** House rules cover Crystalline tokens, but nothing here defines: chart glow treatment, gradient fills on area series, glass chart cards vs. flat, how the 15-lens grid avoids a wall-of-identical-cards. 15 cards of the same chrome = dead dashboard. No hero card, no hierarchy, no size variance (all cards same size = no focal point).

**3. CTA hierarchy is undefined on the money moment.** "Share this progress" — the entire social-retention thesis — gets one clause. Where is the share CTA? Persistent? Reveal-on-hover (bad on mobile)? What's the primary action on a chart card: drill, share, or coach? Three competing CTAs with no stated priority = mush.

**4. The trophy card — the actual deliverable of the social thesis — is a blank.** "Branded, watermarked trophy card" is not a design. Aspect ratio? Static image (canvas render) vs. live embed? What data survives sanitization? This is the most-shared visual artifact in the product and it has zero spec.

**5. Drill grammar has two conflicting patterns.** Bottom-sheet vs. expand-in-place vs. the already-built (stranded) `ChartDrillSheet` — the brief asks Kimi to design what Arc C already partially decided. Contradiction between "finish C1–C8" and "design the drill interaction."

**6. Coach-on-chart annotation risks visual noise.** Pinned markers + action chips + captions + PR flags + pain flags + deload annotations on ONE Victory chart = clutter pileup. No annotation budget is set (mine: max 2 annotation layers visible, rest behind a toggle).

**7. "Cinematic 90-day journey scroll-narrative" is scope creep masquerading as craft.** A scrollytelling surface is a whole feature with its own motion/perf budget, dropped in as one bullet. It's also the *only* genuinely awe-capable idea here — burying it as bullet 7 of "craft non-negotiables" is a priority inversion.

---

## (c) IMPLEMENTATION-FIDELITY ATTACKS

- **Victory + drill events on mobile:** Victory's event system is mouse-first; touch scrub/pinch-zoom on Victory requires custom `VictoryContainer` work. Brief says "pinch/scrub on mobile" like it's free. It is not. Flag as a spike, not a bullet.
- **15+ lazy charts × IntersectionObserver × React.lazy** — good instinct, but `ProgressChartCube`/`WarRoomBoard`/`Observatory` already exist as composite views; are *they* lazy-boundary wrapped? Unstated.
- **Data windowing for 1yr/all-time series** — no decimation strategy named (LTTB or bucketed aggregates server-side). Victory chokes past ~2k points on Potato-PC; "data windowing" is hand-waving without an endpoint contract.
- **Trophy card rendering:** watermarking implies canvas/SVG→image export. Victory renders SVG — need an export path (serialize SVG → canvas → PNG) with fonts embedded, dark bg composited. Non-trivial; unmentioned.
- **44px targets:** drill hit-targets on line-chart points are ~4–8px. Requires invisible `VoronoiContainer` or enlarged touch zones — must be mandated explicitly or it won't happen.
- **Reduced-motion:** chart entrance animations, count-ups, scrub — what's the reduced-motion fallback for the "journey" narrative? Unstated. Rule 25 named but not operationalized.
- **≤300 lines:** the canonical grid + drill sheet + data table + annotations + coach chips will blow past 300/card unless the annotation system is its own module. Enforce a per-chart folder structure now.
- **a11y:** `ChartDataTable` covers SR access — good, keep it as the mandated tab, not a hidden fallback. Keyboard drill (arrow-key point traversal, Enter to drill) is not specified anywhere. Victory gives you nothing here for free.
- **Tokens:** brief repeats the rule but doesn't define the *chart-specific* token set (`--chart-series-1..n`, `--chart-grid-line`, `--chart-annotation-coach`). Without these, 15 charts will drift into 15 slightly-off purples.

---

## (d) THE ONE HIGHEST-IMPACT CHANGE

**Design and spec the Trophy Card FIRST, and make it the signature moment.** It's the artifact that leaves the app and markets for you. Concretely: a 4:5 (feed-native) crystalline card — dark Crystalline surface with a faceted-glass top edge catching cyan light, the chart rendered as a glowing gradient area-line (cyan→royal-purple fill fade), the milestone stat in oversized display type, a small swan watermark etched bottom-right at 8% opacity, and the user's rank badge (Crystal Ring state) as a corner emblem. Rendered to PNG via SVG→canvas at 2× DPR. Every other surface (grid, drill, coach) borrows this card's visual language — so designing it first *defines* the chart design system instead of the reverse. That's how you get "uniquely Swan" instead of "dark Victory."

---

## (e) WHAT A COMPETITOR OUT-BUILDS HERE

- **Whoop/Oura-style single-hero metric with a story** — one dominant number + one gorgeous chart, not a 15-card grid. Our grid-everything approach loses to focus.
- **Strava's share cards** — their trophy images are instantly recognizable in a feed. We have no equivalent spec (see d).
- **Apple Fitness' animated rings/celebrations** — the PR moment deserves a full-screen GPU-safe celebration (crystalline shatter → reform as the new 1RM). Brief says "one-tap share prompt" — a toast. A toast for a PR is a design failure.
- **Real percentile/cohort visualizations** (Gymverse, Hevy) ship comparison bands today; ours is aspirational with no endpoint.
- **Coach insight as a chat nag** — if "Coach spotted a plateau" renders as a chip, a competitor rendering it as an annotated chart region with a conversational voice wins the perceived-intelligence war.

---

## PHASING (as requested in §7)

1. **Slice 0 (merge, 1 day):** Merge or salvage `claude/arcb-mobbin-batch1` C1–C3 before it rots past recovery; delete `DEMO_DATA` from `GoalProgressBullet`; fix doc drift.
2. **Slice 1 (visible win, ~1 wk):** Trophy card + share CTA + PR celebration moment on WeightProgression only. One chart, perfect, shareable.
3. **Slice 2:** Consolidate the three client surfaces → canonical grid; chart token set + voronoi touch targets + keyboard drill + data-table tab on all 15.
4. **Slice 3:** Finish C4–C8 drills + time ranges (with server-side decimation contract).
5. **Slice 4 (Coach MVP):** read-only — one insight type (plateau detection) as a chart annotation region + "ask Coach" deep link. No write loop yet.
6. **Slice 5:** Cohort bands, privacy toggles, milestone→XP/ring loop.
7. **Slice 6 (last, if ever):** 90-day scrollytelling. Cut first if anything slips.

**Bottom line:** the strategy is right; the design is absent. Don't write a line of new chart code until the trophy card and chart token system exist as signed-off visuals.

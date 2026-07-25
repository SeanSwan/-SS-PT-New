---
decision: Charts = progress-proof retention engine — trophy-card-first design system, deep interactive drill, Coach hive-mind, community trophies
status: open
supersedes: none
---

# SwanStudios Charts — Expansive Upgrade BLUEPRINT

> **Authorship:** Claude (Opus 4.8) is the author. Kimi K3 was creative CONTEXT
> (`KIMI-CHARTS-CREATIVE-2026-07-24.md`); the 2026-07-24 chart audit is the ground
> truth; the design decisions below are mine, made to answer the gaps Kimi flagged.
> Brief this extends: `docs/ai-workflow/brainstorms/charts-expansive-upgrade-hive-mind-2026-07-24.md`.

## Ground truth (verified, do not re-litigate)
- Victory-only, data-truth SHIPPED (real logged data, honest empty/locked states).
- Interactive drill (Arc C / SWA-51) STRANDED at C1-C3 of C1-C8 on unmerged branch
  `claude/arcb-mobbin-batch1-20260722` (51 commits behind, not on main).
- NO Coach hive-mind connection exists yet.
- 3 overlapping client-progress surfaces (canonical grid = truth; 2 legacy still mounted).
- Residual dev-gated `DEMO_DATA` in `GoalProgressBullet`; `CHART-ANALYTICS-SYSTEM.md` doc drift.

Kimi's core critique (adopted): the strategy was right but the *design was absent* —
"premium/alive/awe" asserted, not designed. So this blueprint DESIGNS the signature.

---

## 1. THE SIGNATURE: the Trophy Card (design the artifact that leaves the app first)

The single highest-leverage object. It is what gets shared, so it defines the whole
chart visual language — every other surface (grid, drill, coach) borrows FROM it.

**Format:** `4:5` feed-native (1080x1350) for social; a `1:1` (1080x1080) thumbnail
variant for the grid and profile.

**Surface (Crystalline Swan, dark-first):**
- Base Obsidian Black `var(--bg-base,#0A0A0F)`; a Royal Depth `#003080` radial glow
  behind the plot; SheenCard faceted-glass top edge catching Ice Wing cyan light
  (the house card standard).
- Rarity-matched border, reusing the existing rarity system: Common=Swan Lavender,
  Rare=Gilded Fern, Epic=Wing Purple, Legendary=animated gradient. The milestone tier
  picks the border.

**Chart render (the dual-glow discipline applied to data):**
- Progress line = Ice Wing cyan `var(--accent-primary,#60C0F0)` stroke, area fill fading
  Wing Purple `var(--accent-secondary,#8B5CF6)` 22% -> transparent (`--chart-area-fade-*`).
- The record point glints Gilded Fern `var(--accent-gold,#C6A84B)`.

**Content hierarchy:**
- Hero stat in oversized Plus Jakarta Sans (`+18% in 90 days`, `225 lb PR`), Frost White,
  Gilded Fern accent underline for the "record" framing.
- Corner emblem (top-right): the user's Crystal Ring / Swan rank badge state.
- Watermark (bottom-right): swan wordmark, Frost White 8% opacity, etched.
- Caption band: milestone name + date + "SwanStudios".

**Privacy (Rule 8):** the export renders ONLY the toggled-public metric + chart shape;
no name, no client ID, no PII on the card. Sanitized at render.

**Render path (Kimi fidelity flag):** Victory SVG -> serialize -> draw to canvas at 2x
DPR with fonts embedded + dark bg composited -> PNG. Hook: `useTrophyExport(chartRef)`.

**The PR moment is NOT a toast** (Kimi/Apple-Fitness point): when a new record lands, a
GPU-safe **crystalline shatter** on the peak point -> shards reform as the new number
with a Gilded Fern flash, then the share prompt. `prefers-reduced-motion` -> static
"New PR" ribbon. Full-card scope (not full-screen) to stay mobile-safe.

---

## 2. Chart token system (closes "15 slightly-off purples")

Define once, in the chart theme, so 15 cards read as one system:
```
--chart-series-1: var(--accent-primary, #60C0F0);    /* primary metric — Ice Wing */
--chart-series-2: var(--accent-secondary, #8B5CF6);  /* comparison — Wing Purple */
--chart-series-3: var(--accent-gold, #C6A84B);       /* goal/target line — Gilded Fern */
--chart-series-4: var(--swan-lavender, #4070C0);     /* tertiary */
--chart-grid-line:     color-mix(in srgb, var(--text-primary,#E0ECF4) 8%, transparent);
--chart-axis-label:    color-mix(in srgb, var(--text-primary,#E0ECF4) 58%, transparent);
--chart-area-fade-from: color-mix(in srgb, var(--accent-primary,#60C0F0) 22%, transparent);
--chart-area-fade-to:   transparent;
--chart-annotation-coach: var(--accent-secondary, #8B5CF6);
--chart-annotation-pr:    var(--accent-gold, #C6A84B);
--chart-annotation-pain:  var(--danger, #ef4444);
--chart-cohort-band:      color-mix(in srgb, var(--accent-secondary,#8B5CF6) 14%, transparent);
```

### 2.1 Swan Lens connection (MANDATORY — theme-change wiring, Sean 2026-07-24)
Every chart must **recolor live with the active Swan Lens**. The chart tokens above
derive from `--accent-*` / `--text-*` / `--surface-*`, so they MUST resolve to the
tokens the **Style-Lens OS emits for the active `paletteThemeId`** — not hardcoded
Crystalline values. Wiring rules:
- Chart series/grid/annotation colors come ONLY from `var(--chart-*, <fallback>)` which
  chain to the lens-emitted `--accent-*`/`--surface-*`/`--text-*`. Changing the lens
  recolors all 15+ charts with zero per-chart edits.
- Victory theme object (`chartTheme.ts`) must read the CSS custom properties at render
  (or via a lens-subscribed hook), NOT bake hex at module load — otherwise charts freeze
  on the boot palette and ignore lens switches.
- The Trophy Card export snapshots the CURRENT lens palette (so a shared card reflects
  the lens the user was in).
- **Lying-gate guard (known trap):** the Swan Lens = Style-Lens `paletteThemeId`, which
  is DISTINCT from `UniversalThemeContext` (`swanstudios-theme`). Chart-recolor tests
  must seed the **Style-Lens** appearance profile, not `swanstudios-theme` — seeding the
  wrong system passes silently on `crystalline-dark` and proves nothing. Verify a real
  lens switch actually repaints a chart (computed-style probe on a Victory series path).

---

## 3. Card hierarchy (closes "15 identical cards = dead dashboard")

- **Hero card (2x2 span):** the client's PRIMARY metric this cycle (trainer-set focus,
  or the most recent PR). Full drill + Coach insight + prominent Share. The focal point.
- **Standard cards (1x1):** the rest of the lens grid.
- **Compact stat tiles (half height):** single-number KPIs (streak, total volume) — no
  full chart, just the number + spark.
Size variance IS the hierarchy Kimi said was missing.

---

## 4. CTA hierarchy (closes "three competing CTAs = mush")

Never three co-equal CTAs. State-driven priority:
- **Primary (always, 44px):** Drill — tap chart / "Details". The depth action.
- **Secondary:** Share (trophy) — PROMOTED to prominent when a milestone is fresh;
  otherwise a quiet icon.
- **Tertiary (contextual):** Ask Coach — a chip that appears ONLY when a Coach insight
  exists on that chart.

---

## 5. Coach hive-mind UX (bidirectional, annotation-budgeted)

- **Annotation budget: max 2 visible layers** per chart (Kimi's rule, adopted). Default =
  PR markers + the single most-relevant Coach insight. Pain flags / deloads / older
  insights live behind a "Timeline" toggle.
- **Coach insight is NOT a chip-nag:** it's a subtle shaded chart REGION
  (`--chart-annotation-coach`, low opacity over the plateau weeks) + one conversational
  caption below ("Coach: bench stalled here while volume climbed — a deload might break
  it. Tap to discuss."). Perceived-intelligence beats a chip.
- **One-tap chart -> Coach:** tapping the caption opens Swan Coach with that chart's
  DERIVED numeric series + client ID only (ZERO PII, Rule 8) in context.
- **Read-only MVP first** (one insight type: plateau detection). The write loop (Coach
  proposes a plan change from the chart) is later and TRAINER-GATED (indispensability
  doctrine: clients read+do, trainers decide).

---

## 6. Depth / drill grammar (reuse Arc C — don't re-design)

- Adopt the stranded `ChartDrillSheet` + `useChartDrill` + `victoryDrillEvents` +
  `ChartDataTable` (bottom-sheet on mobile, side-panel on desktop). Salvage C1-C3,
  finish C4-C8. Hierarchy: timeframe -> week -> session -> exercise -> set/rep.
- **Touch:** `VictoryVoronoiContainer` for 44px-equivalent hit zones (Victory points are
  4-8px — Kimi flag).
- **Keyboard:** arrow-key point traversal + Enter to drill (add to the contract).
- **a11y:** `ChartDataTable` is a MANDATED tab, not a hidden fallback.

---

## 7. Comparison + annotation depth
- vs past self (this cycle vs last), vs goal line (trainer target), vs cohort band
  (anonymized percentile — needs an endpoint, flagged below).
- Timeline annotations: PRs (auto), deloads, injury/pain (from body-map data), coach
  notes pinned to the date — all inside the 2-layer budget.
- Time ranges: 7d / 4w / 3mo / 1yr / all, scrub on mobile.

---

## 8. Implementation contracts (Kimi's fidelity gaps, answered)
- **Decimation:** server-side LTTB or bucketed aggregates; endpoint returns pre-decimated
  series per range. Never ship >~2k points to Victory on a potato PC.
- **Perf:** `React.lazy` per chart + `SafeChart` boundary + IntersectionObserver
  off-viewport animation pause (the Crystal Ring pattern). Wrap Cube/WarRoom/Observatory
  in lazy boundaries too.
- **File structure:** per-chart folder (chart / drill / annotations / trophy as separate
  modules) so nothing blows the 300-line cap.
- **Motion:** every entrance/count-up/scrub/shatter has a `prefers-reduced-motion` path.

---

## 9. Phasing (shippable order; Slice 0 needs Sean's go on the merge)

- **Slice 0 - Salvage + hygiene:** rescue Arc C C1-C3 (rebase the 3 slices forward, do
  NOT merge the 51-behind branch wholesale), delete `GoalProgressBullet` DEMO_DATA, fix
  `CHART-ANALYTICS-SYSTEM.md` doc drift. *(Merge decision = Sean's call.)*
- **Slice 1 - The signature (fastest visible win):** Trophy Card + chart token system +
  PR crystalline celebration on ONE chart (WeightProgression). One chart, perfect,
  shareable. Defines the design system.
- **Slice 2 - Consolidate + a11y:** collapse 3 client surfaces -> canonical grid; apply
  tokens + voronoi touch + keyboard drill + data-table tab across the grid; hero-card
  hierarchy.
- **Slice 3 - Depth:** finish C4-C8 drills + time ranges + server decimation contract.
- **Slice 4 - Coach hive-mind MVP:** read-only plateau annotation region + one-tap
  chart->Coach deep link (zero PII).
- **Slice 5 - Community loop:** trophy share to feed + per-chart privacy toggle +
  milestone -> XP / Crystal-Ring loop + cohort bands (needs cohort endpoint).
- **Slice 6 - Cinematic (cut first if anything slips):** 90-day scroll-narrative.

---

## 10. Decisions that need Sean's taste-cut before Slice 1 code
1. **Trophy Card share target:** in-app community feed only, or also export-to-Instagram/
   external? (changes the sanitization + branding rigor).
2. **PR celebration intensity:** full crystalline shatter vs a quieter gold-ribbon glint?
3. **Slice 0 merge:** rescue the stranded Arc C C1-C3, or leave it and rebuild fresh
   inside the new token system? (rescue = faster; rebuild = cleaner).
4. **Coach insight tone:** how forward should "Coach spotted a plateau" be — proactive
   push, or only when the client opens the chart?
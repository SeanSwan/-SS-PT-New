---
decision: Charts = progress-proof retention engine — trophy-card-first design system, deep interactive drill, Coach hive-mind, community trophies
status: open
supersedes: none
---

# SwanStudios Charts — Expansive Upgrade BLUEPRINT

> **Authorship (Rule 76 fusion model):** Claude (Opus 4.8) authored the FUSION. Kimi K3
> was a **creative peer** (`KIMI-CHARTS-CREATIVE-2026-07-24.md`) — its ideas are on the
> table alongside Claude's OWN original ideas (§12, added 2026-07-24 when Sean said "use
> your creativity AND Kimi's, combine them both"). The 2026-07-24 chart audit is ground
> truth. Creativity is ~50/50; authorship is Claude's. Idea provenance is tagged
> throughout: **[K]** = Kimi's, **[C]** = Claude's original, **[F]** = fused.
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

## 10. Sean's taste-cut — RESOLVED 2026-07-24 (all four locked)
1. **Slice 0 / stranded Arc C:** REBUILD FRESH inside the new token system (do NOT rescue
   the 51-behind branch). S0 becomes: delete `GoalProgressBullet` DEMO_DATA + fix doc
   drift only; drill-down is rebuilt clean in S2/S3 on the new token + Trophy-Card system.
2. **Trophy Card share target:** IN-APP COMMUNITY FEED FIRST (first-class post + per-chart
   privacy toggle). External PNG export is deferred to S5, not S1.
3. **PR celebration:** CRYSTALLINE SHATTER — record point shatters into shards that reform
   as the new number + gold flash, then share prompt. `prefers-reduced-motion` → static
   gold "New PR" ribbon.
4. **Coach insight tone:** ON-CHART, PULL not push — the plateau region + one-line
   conversational caption appears when the client OPENS the chart. No notifications.
   Proactive push is a possible later opt-in, not the MVP.

## 11. Next build (with decisions applied)
- **S0 (hygiene, no design needed):** delete `GoalProgressBullet` DEMO_DATA (close the
  prior Rule-34 breach); fix `CHART-ANALYTICS-SYSTEM.md` doc drift ("NOT YET CONNECTED" +
  Recharts mentions are stale). Small, safe, closes audit gaps.
- **S1 (the signature — real first value):** Trophy Card component + chart token system +
  Swan Lens bridge + crystalline PR celebration, on WeightProgression only. Routes through
  `swan-design-router` (Rule 40, net-new UI). This defines the whole chart design system.

---

## 12. Claude's ORIGINAL ideas — all on the table (Rule 76 fusion, added 2026-07-24)

Sean: "use YOUR creativity AND Kimi's — all ideas on the table." Kimi's contributions
(trophy card, annotation budget, PR-is-not-a-toast, decimation) are already woven above.
Here are Claude's OWN original ideas, each with a keep/defer/cut verdict. **[C]** = mine.

1. **[C] Next-Milestone Gravity — KEEP (fold into S1/S2).** Every chart shows not just
   where you are but the next milestone *pulling* you toward it: a glowing target line +
   "8 lb to a new PR" / "3 sessions to a 30-day streak," rendered as a gradient gravity
   well the current value drifts toward. Turns every chart into a next-best-action engine
   — directly serves the Product Core Loop. Cheap, high retention value.
2. **[C] "Why did this move?" one-tap explainer — KEEP (elevate S4).** Tap ANY surprising
   jump/drop → the Coach explains it in plain language from the real data ("squat jumped:
   +2 sessions and +3 lb bodyweight — good sign"). This is the hive-mind making the chart
   SELF-EXPLAINING for any point — a bigger, better version of Kimi's single plateau
   annotation. The signature "these charts are intelligent" moment.
3. **[C] Coach/Trainer Chapter Markers — KEEP (fold into S4).** The coach drops narrative
   markers on the timeline: "Wk3: switched to 5x5," "Wk7: deload." The chart becomes a
   STORY with a plot, not a bare curve — the trainer-indispensability doctrine made
   visual. Ties charts to the coaching relationship (retention + trainer value).
4. **[C] Constellation Correlation view — KEEP (new signature, S5/S6).** Instead of 15
   isolated charts, ONE view that connects them: sleep↑ → recovery↑ → volume↑ → 1RM↑ as a
   node/constellation graph. "Your sleep is the star your strength orbits." The "aha" that
   makes the whole suite feel intelligent; Coach-hive-mind-native (Coach explains the
   correlation). Distinctive — no competitor grid ships this.
5. **[C] Milestone → Crystal Ring FACET / Companion evolution — KEEP (deepen S5).** Deeper
   than Kimi's "milestone→XP." A bench PR literally adds a crystal FACET to your rank ring;
   a 90-day streak EVOLVES your Cygnet companion. Chart achievements become VISIBLE on your
   identity — charts feed the already-built Crystal Ring / companion game system.
6. **[C] Live-in-app / static-export Trophy Card — KEEP (fold into S1).** Refines Kimi's
   card: IN the app it's a LIVE mini-chart that animates on view; only the EXPORTED share
   version flattens to PNG. Alive inside, portable outside — best of both.
7. **[C] Data-as-Light aesthetic — KEEP (fold into S1 token/visual system).** On the dark
   Crystalline surface, the data IS the light source: the line glows and blooms a soft
   gradient onto the card behind it, brighter where the metric is higher. Progress
   literally lights up the card. Pure Enchanted-Apex signature; GPU-safe, reduced-motion
   fallback = flat line.
8. **[C] Ghost-Self overlay — KEEP (fold into S3 comparison).** A translucent "past you"
   line (your 90-days-ago trajectory) racing current you; the GAP between them is the
   story. Scrubbable. Gamifies vs-past-self more viscerally than a static comparison line.
9. **[C] "Trainer's Eyes" auto-highlight toggle — KEEP (fold into S2 trainer surface).**
   On the trainer's view of a client chart, a toggle that auto-highlights the ONE thing
   to care about (the plateau / missed week / PR) so a 30-second glance lands right.
   Serves the trainer dashboard proof-of-value + who-needs-intervention priority.
10. **[C] Weekly Proof Digest pushed BY the Coach — KEEP (S5 retention track).** Don't
    wait for the client to open the dashboard — every week the Coach delivers a 1-card
    digest with mini-charts ("your week: +2 sessions, bench PR, sleep dipped — here's the
    plan"). Pushes the proof; strong retention driver. Pull-not-push decision (§10.4)
    means this is a Coach *message*, not a nag notification.
11. **[C] Proof Reel — auto-generated progress micro-video — DEFER to S6 (replaces the
    scrollytelling as the "cinematic" slice).** A 6-8s vertical clip that animates the
    client's chart line drawing itself day-1→today, PR as the climax, using Swan's
    EXISTING Seedance/video muscle. More shareable than a manual scroll-narrative and
    cheaper to ship as an auto-artifact. This is the better "cinematic" bet than §9 S6.
12. **[C] Community "Beside You" reassurance band — DEFER to S5 (opt-in, privacy-gated).**
    An anonymized "others like you" trajectory band — NOT a leaderboard (which demoralizes)
    but a "you're not alone" band. Opt-in only; ties charts to belonging without toxic
    comparison. Needs the cohort endpoint, so it rides with the S5 cohort work.
13. **[C] Streak-as-Climb terrain metaphor — CUT (note only).** Reframing the consistency
    heatmap as a mountain ascent is emotionally nice but decorative; the Constellation (#4)
    is a stronger, more intelligent "aha" for the same slot. Recorded, not built — revisit
    only if #4 proves too heavy.

## 13. REFACTORED phasing (fused — Claude's ideas + Kimi's, provenance tagged)

- **S0 — Hygiene [F].** Delete `GoalProgressBullet` DEMO_DATA; fix `CHART-ANALYTICS-SYSTEM.md`
  doc drift. (Rebuild-fresh per §10.1, so no branch salvage.)
- **S1 — The Signature [F].** Trophy Card (live in-app / PNG on export **[C#6]**) + chart
  token system + Swan Lens bridge **[F]** + Data-as-Light glow **[C#7]** + Next-Milestone
  Gravity **[C#1]** + crystalline PR celebration **[K/F]**, on WeightProgression only.
  Defines the whole design system.
- **S2 — Consolidate + a11y + Trainer's Eyes [F].** Collapse 3 client surfaces → canonical
  grid; tokens + voronoi touch + keyboard drill + data-table across the grid; hero-card
  hierarchy **[K]**; "Trainer's Eyes" auto-highlight toggle **[C#9]** on the trainer view.
- **S3 — Depth + Ghost-Self [F].** Rebuild the C1-C8 drill grammar fresh in the token
  system **[K]** + time ranges + server decimation **[K]** + Ghost-Self overlay **[C#8]**.
- **S4 — Coach hive-mind [F], the intelligence layer.** On-chart pull-only plateau region
  **[K]** + **"Why did this move?" one-tap explainer for ANY point [C#2]** + Coach/Trainer
  Chapter Markers **[C#3]** + one-tap chart→Coach (zero PII, plugs into SWA-65 intent log).
- **S5 — Community + identity loop [F].** Trophy share to feed + per-chart privacy toggle
  **[K]** + Milestone → Crystal-Ring FACET / companion evolution **[C#5]** + Weekly Proof
  Digest **[C#10]** + "Beside You" opt-in band **[C#12]** (with the cohort endpoint).
- **S6 — Cinematic [C], the awe artifact.** **Proof Reel auto-video [C#11]** replaces the
  manual 90-day scrollytelling — more shareable, leverages Seedance, cut first if it slips.

**What the fusion changed vs the original plan:** the plan gained an *intelligence* spine
(explainer + chapter markers + constellation make the charts feel smart, not just pretty),
a stronger *retention* pull (milestone gravity + weekly digest push proof at the client),
a deeper *identity* tie (chart milestones become ring facets / companion evolutions), and a
better *cinematic* bet (auto Proof Reel over manual scrollytelling). Kimi's trophy-card-first
spine and craft gates are kept intact. Constellation **[C#4]** is the new stretch signature
for S5/S6 if capacity allows.
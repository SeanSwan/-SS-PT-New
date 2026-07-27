---
decision: Expansive charts upgrade — deep interactive progress-proof charts, Coach hive-mind connection, community-shareable trophy cards
status: open
supersedes: none
---

# SwanStudios — Charts as the Progress-Proof Retention Engine (Expansive Upgrade Brief)

> This is the ENHANCED/REMADE prompt (Sean asked me to fill the gaps he may have
> missed, then use it). It doubles as the Kimi K3 creative-ideation + hostile-design
> brief. Grounded in the 2026-07-24 chart audit (real current state below), not memory.

## 0. WHY THIS MATTERS (Sean's vision, sharpened)

Charts are the **#2 retention hook** after community — they are the *visible proof*
that a client's effort is real and compounding, which is what makes them stay faithful
to the platform. They are **shared into the community / social feed as trophies**, so
they must be **comprehensive, deep, beautiful, and alive**. Critically, they must be
**wired into the Swan Coach hive mind** — the coach reasons *over* the chart data to
give the next-best-action, and the coach's insights are surfaced *on* the charts.

The product core loop is: **log the workout → save it → turn it into charts/progress
proof → decide the next training action → make milestones shareable with the
community.** Charts are the third and fifth beats of that loop. This upgrade makes
those beats addictive.

## 1. GROUNDED CURRENT STATE (from the 2026-07-24 audit — VERIFIED)

**What already SHIPPED and is real (do NOT rebuild):**
- **Victory 37.3.6 is the sole chart library.** Zero Recharts / Nivo / chart.js in
  production. Rule 10 clean.
- **Data-truth is met.** Every progress/workout chart pulls real logged-workout data
  via `/api/client/analytics/chart-*` (client), `/api/analytics/:userId/chart-*`
  (admin/trainer), `/api/workout-forms/client/:id/progress-detailed` (legacy). Honest
  empty states ("Complete some workouts to see your progress") and server-truth
  tier-lock (402 → `LockedChartCard`, never faked).
- **Canonical client grid** = `CanonicalProgressChartsGrid.*` (~15 lens-filtered
  cards: primary, body, detail, balance, effort, PR bars) driven by
  `useClientProgressCharts` (the source-of-truth hook). Plus composite views:
  `ProgressChartCube`, `ProgressChartWarRoomBoard`, `ProgressChartRecoveryObservatory`.
- **Admin/trainer mirror** = `AdminProgressChartsGrid.*` (12 charts) via
  `useAdminClientProgressCharts`.
- **Live/social charts** = `Charts/charts/live/*` (WeightProgression, WorkoutFrequency,
  IntensityRpe, MuscleGroupBalance, RecoverySignal, BodyFat, MacroSplit) — already
  reused on `pages/Social/components/ProfileChartsSection.tsx`.

**What is a GAP / STRANDED / not done:**
- **Interactive drill-down (Arc C / SWA-51) is STRANDED at 3/8.** Built `C1–C3`
  (`useChartDrill`, `ChartDrillSheet`, `ChartDataTable`, `victoryDrillEvents`,
  WeightProgression + WorkoutFrequency + IntensityRpe drills) on branch
  `claude/arcb-mobbin-batch1-20260722` — **never merged**, 51 commits behind, absent
  from main and every live dashboard. `C4–C8` never started. The live charts are the
  **pre-drill hover-only** versions.
- **NO Coach hive-mind connection exists.** Zero chart→Coach integration today.
- **Three overlapping client-progress surfaces** (`CanonicalProgressChartsGrid` = truth;
  legacy `ClientProgressCharts` + `ClientAnalyticsPanel` still mounted on trainer view)
  — needs consolidation so there's one deep interactive surface, not three shallow ones.
- **Doc drift:** `CHART-ANALYTICS-SYSTEM.md` still says "Chart → Profile Integration
  (NOT YET CONNECTED)" and mentions Recharts — both stale.
- **Residual dev-gated `DEMO_DATA`** in `GoalProgressBullet.tsx` (production-safe but
  should be deleted to close the prior Rule-34 breach).

## 2. THE VISION — WHAT "EXPANSIVE + DEEP" MEANS (the gaps Sean may have missed)

### 2.1 DEPTH — every chart is a drill telescope, not a flat picture
- **Drill hierarchy:** timeframe → week → session → exercise → set → rep. Tap a point
  on the weight-progression line → see the session behind it → see the sets/reps/RPE
  that produced it → see the exact exercise. (This is what Arc C started; finish C1–C8
  AND extend the hierarchy deeper.)
- **Time ranges + zoom:** 7d / 4w / 3mo / 1yr / all-time, with pinch/scrub on mobile.
- **Comparison overlays:** vs **past self** (this month vs last), vs **goal line**
  (trainer-set target), vs **cohort/community** (anonymized percentile band — "you're
  in the top 15% for consistency this month").
- **Annotations on the timeline:** PRs (auto-detected), deload weeks, injury/pain flags
  (from the body-map pain data), and **coach notes** pinned to the exact date.
- **Data table view** for every chart (accessibility + "show me the numbers" — Arc C
  `ChartDataTable` started this).

### 2.2 COACH HIVE-MIND — bidirectional (the big new thing)
- **Charts → Coach (read):** the Swan Coach reasons over the *real* chart data (client
  IDs only, ZERO PII to the LLM per Rule 8) to produce next-best-action. "Your bench
  1RM has been flat 3 weeks while volume rose — Coach recommends a deload." The coach's
  hive-mind context includes the client's progress vectors.
- **Coach → Charts (write/annotate):** coach-generated insights are surfaced *on* the
  chart — a pinned marker "Coach spotted a plateau here," a recommended-action chip
  under the chart, a "why this matters" caption. Tapping it opens the Coach with that
  chart already in context (one-tap: chart → Coach conversation).
- **Trainer loop:** a trainer viewing a client's charts sees the same Coach insights +
  can dictate a plan adjustment straight from the chart (respecting the trainer
  indispensability doctrine — clients read+do, trainers decide).
- **Privacy contract:** the Coach receives derived numeric series + client ID, never
  names/PII; the mapping stays client-side.

### 2.3 COMMUNITY / SOCIAL — charts as shareable trophies
- **Chart card = first-class social post type.** "Share this progress" turns any chart
  into a branded, watermarked trophy card in the community feed.
- **Per-chart privacy toggle** (the `chartVisibility: {[chartId]: boolean}` model the
  ref doc specified but was never built): the client chooses which charts are public on
  their profile; admin sees all.
- **Milestone auto-share prompt:** hit a new 1RM / 30-day streak / body-comp goal →
  "You just set a PR — share it?" one-tap to the feed.
- **Cohort/challenge leaderboards** built from chart data (consistency, volume,
  progression) — ties into the existing challenges/groups system.
- **Milestone → gamification loop:** a chart milestone awards XP and can mint a
  shareable trophy that ties into the **Crystal Ring / Swan rank badge / companion
  system** already shipped on the client home (a PR could level the ring + drop a
  shareable badge card).

### 2.4 COMPREHENSIVENESS — all four surfaces + social
- **Client:** the deep interactive grid is home; progress is one tap from the client
  home (Product Core Loop — don't bury it).
- **Trainer:** the SAME interactive depth on the client-progress view so the coach can
  make decisions from real charts (today trainer view is the shallow legacy surface —
  upgrade it to the canonical interactive grid).
- **Admin:** proof-of-value roll-ups — who's progressing, who's stale, who needs
  intervention — chart-driven, drillable to the individual.
- **Social/profile:** the public trophy showcase (privacy-gated).

### 2.5 CRAFT — the non-negotiables
- **Data truth** (Rule): real logged data, honest empty/locked states, no mock.
- **Victory only** (Rule 10); Crystalline Swan palette via `var(--token,#fallback)`
  (Rule 6); dark-first (Rule 3); WCAG 4.5:1 (Rule 7); 44px touch targets (Rule 2);
  reduced-motion + GPU-safe (Rule 25); ≤300 lines/file (Rule 4); SafeChart error
  boundary per chart.
- **Potato-PC scalable** (Sean's standing mandate): lazy-load charts, off-viewport
  animation pause (the IntersectionObserver pattern used on the Crystal Ring),
  data windowing for large series, `React.lazy` + SafeChart — never eagerly load the
  whole gallery.
- **Mobile-first interaction:** touch drill, bottom-sheet detail, scrub not hover.
- **Cinematic story layer** (Sean's taste): a "your 90-day journey" scroll-narrative
  that turns the raw charts into a story worth sharing — the awe surface for progress.

## 3. WHAT I NEED FROM KIMI (creative ideation + hostile design review)

You are the SwanStudios front-end/design guru. Given the grounded state above:

1. **CREATIVE CHART IDEAS** — propose the most *comprehensive, deep, addictive*
   progress-proof chart system you can imagine for a trainer-led fitness SaaS whose
   charts are BOTH a retention hook AND social-feed trophies. Go beyond the obvious
   line/bar/radar. What chart types, interactions, comparisons, and narrative devices
   would make a client open the app daily to watch their progress compound? What makes
   a chart *shareable* (the trophy instinct)? Rank your ideas by retention impact.

2. **COACH HIVE-MIND UX** — design the bidirectional chart↔Coach experience. How does a
   coach insight appear ON a chart without clutter? How does one-tap "chart → Coach with
   this in context" feel? How do we show "Coach spotted a plateau" as a premium moment,
   not a nag?

3. **DEPTH / DRILL GRAMMAR** — design the drill interaction (timeframe→week→session→
   set→rep) so it's fluid on mobile and desktop. Bottom-sheet? Expand-in-place? What's
   the least-taps path to "why did this number move?"

4. **COMMUNITY TROPHY CARD** — design the shareable chart card: what does a beautiful,
   brand-specific, watermarked progress trophy look like in the feed? How does the
   milestone auto-share moment feel?

5. **CONSOLIDATION** — three overlapping client-progress surfaces exist. Recommend how
   to collapse to ONE deep interactive surface reused across client/trainer/admin/social
   without regressing anything.

6. **HOSTILE DESIGN REVIEW** — attack this brief. Where is it generic, over-scoped,
   un-shippable, or missing a signature moment? What would a design-savvy competitor
   out-build here? What's the ONE highest-impact change to make it feel premium and
   uniquely Swan?

7. **PHASING** — given Arc C is 3/8 stranded, propose the shippable slice order:
   what lands first for the fastest visible win, what's the dependency chain, and
   what's the MVP of the Coach hive-mind connection.

Binding house rules apply (Crystalline Swan dark-first, styled-components only, Victory
only, token-with-fallback, Dual-Button Glow, 44px, WCAG 4.5:1, ≤300 lines, reduced-
motion, no yoga/meditation, credentials "26+ years / NASM-protocol"). Be concrete,
specific, and opinionated — give your real design judgment, don't hedge to consensus.
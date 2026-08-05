# Tencent Hy3 - Design Inspiration

**Reviewer:** `tencent/hy3` (high)
**Document:** docs/ai-workflow/AI-HANDOFF/NUTRITION-HOSTILE-AUDIT-PACKET-2026-08-04.md
**Seed:** (none)
**Tokens:** 4349 in / 10001 out | **Cost:** ~$0.0059 | **Wall:** 163.6s | **finish_reason:** stop

---

# HY3 — HOSTILE UX/UI PASS
**Tencent HY3 · Remit §5(b) · Design System: "Enchanted Apex: Crystalline Swan"**
*Read-only audit `origin/main @ b17e13d90` · No PII · Builder-exact*

---

## 0. UX CRIMES (the packet's P2 massively undersells the violence)

1. **The `<select>` sin.** Nine of fourteen tabs buried in a native `<select>` (`NutritionWorkspace.tsx:153-170`). Native selects are OS-rendered, unstyleable, keyboard-hostile, and on mobile they hijack the viewport with the platform picker. For a surface whose owner directive is *"beautiful UX that makes people WANT to log"*, hiding 64% of the product behind a grey dropdown is discovery murder.
2. **Numeric-ID client picker.** `NutritionPlanBuilder` asks a trainer to type `4821` into a raw text input to set nutrition targets. Backend-tooling UX leaking into a paid SaaS. No typeahead, no recent-clients, no discoverability — and it's the *only* target writer.
3. **The coach tab is a self-aware lie.** `NutritionTabContent.tsx:86` hard-locks to today. A trainer between sessions gets a flat meal list + a card that literally self-captions *"Source and verification status only."* The real intelligence (NutritionTriageCard) is dumped on Overview where it fights workout data for attention. Wrong surface, wrong density.
4. **Roster truncation fraud.** `NutritionRosterTriagePanel` shows 4 rows while the header claims "N tracked." The UI states a number then hides the evidence — a trust violation, not a bug.
5. **Orphan scanner, 51 hardcoded colors.** `FoodScannerPage` is 741 lines of off-brand `#abcdef` literals, zero nav links, duplicating workspace barcode. A second app wearing a stolen logo.
6. **Ghost home module.** `useHomeNutritionAction.ts:26-32` silently drops the nutrition mission on loading/error/gentle-mode. Users see it once, then it trains them to ignore it.
7. **"Mobile-first" theater.** `NutritionTodayPanel` ships 2 `@media` blocks in 275 style lines. That is mobile-only-with-hope, not responsive.

---

## (a) COACH-FACING CLIENT NUTRITION TAB — 30-SECOND IA

**Rule:** A trainer has 30 seconds. The tab must answer *Has he logged? Is he consistent? Is he at risk?* before scroll — then offer verify in one tap.

**Above the fold (desktop, 0–600px):**
1. **`CoachClientNutritionHeader`** — alias + avatar + relative last-log (`Today 14:32 ✓` / `2d gap ⚠`). 44px row, `Midnight Sapphire` bg.
2. **`AdherenceHero`** — single card: adherence % (Gilded Fern, large), streak (Ice Wing glow), flag chips (`Na+ ⚠`, `Verify N`). One Victory radial or micro-bar.
3. **`ActualVsTargetGrid`** — 5 rows (kcal, P, C, F, Fiber, Hydration) with `Arctic Cyan` fill bars (chart-use exempt). Shows the *gap*, not just the number.
4. **`DateStepper`** — `[‹] Aug 04, 2026 [›]` 44px `Wing Purple` buttons → `Arctic Cyan` glow (dual-button rule). No full datepicker; tap-step, long-press for range.

**Below fold (progressive disclosure):**
5. **`TrendPanel`** — Victory line (logged solid Ice Wing, target dashed Gilded Fern). Collapsed sparkline → expand.
6. **`DiaryTimelineRow`** — inline `[verify ✓/⚠]` 44px targets; flagged rows get `Wing Purple` left-border.

**Z-order:** Status → Adherence → Actual/Target → Flags → Trend → Diary.

---

## (b) 14-TAB WORKSPACE — SEGMENTED IA + MOBILE NAV

**Kill the `<select>`. Segment by intent:**
- **Capture** — today, log, voice*, barcode, restaurant, hydration
- **Insights** — macros, intelligence*, garden, farms
- **Fuel** — meal-plan*, supplements
- **Explore** — search, learn

\*Gated → render as disabled pill with Gilded Fern lock icon, never hidden.

**Desktop:** `SegmentedTabBar` (4 segments; active = `Royal Depth` bg, `Ice Wing` text) + `SubPillRow` (horizontal pills; active = `Midnight Sapphire` bg, `Frost White` text, 44px height).

**Mobile (414px):** `BottomNav` with 4 icon+label segments (44px). Tapping a segment reveals `SubPillRow` as a horizontal swipeable strip below header. Native select banned.

---

## (c) MAKE PEOPLE WANT TO LOG — AFFORDANCES + SPECS

**Components (styled-components, token-bound):**
| Component | Spec | Tokens / Rules |
|---|---|---|
| `QuickAddFab` | fixed BR, 56px (44 min) | `Wing Purple` bg → `Arctic Cyan` glow; opens sheet: Repeat-Yesterday, Scan, Recent-5, Favorites |
| `RepeatYesterdayButton` | 1-tap clone prior day | `Ice Wing` icon; toast "Cloned 4 meals" |
| `StreakRing` | SVG circle | `stroke=var(--ice-wing,#60C0F0)` + `drop-shadow(0 0 8px)`; reduced-motion → static |
| `CelebrationToast` | top slide-in, 4s | Gilded Fern left-accent; `prefers-reduced-motion` disables transform |

**States (builder-exact):**
- **Empty:** `EmptyStateCard` — "Your nutrition story starts here 🦢" + CTA `Log first meal` (`Wing Purple` → cyan glow). No dead icons.
- **Loading:** `SkeletonShimmer` — `Ice Wing` @ 8% opacity sweep; reduced-motion → static 12% block.
- **Error:** `SwanErrorCard` — "The swan lost its way" + `[Retry]` (44px `Royal Depth`). Never raw `err.message`.

---

## (d) REMINDER UX — LIGHT, FRESH, NON-REPETITIVE

**Surfaces:**
- **Bell badge:** rotating copy in dropdown header ("3 days strong", "Chef Swan misses you").
- **Top toast:** Ice Wing glow slide-in, max 1/active-day.
- **`NutritionNudgeCard` (home):** daily-rotating, 4 copy pools:
  - *Celebration:* "12 days with wings spread 🦢 +50 XP"
  - *Gentle restart:* "A fresh plate waits. No streak lost, just paused."
  - *Curiosity:* "What did your week taste like? Tap to see."
  - *Recipe tease:* "Chef Swan suggests: salmon for omega-3."

**Frequency choreography:**
- Quiet hours 21:00–08:00 local.
- Max 1 nudge/24h; backoff after 3 ignores (skip 2d).
- Variety engine keys pool by `lastActionContext` (logged/streak/lapsed).
- Opt-out via `nutritionReminders` consent.
- **Guardrail:** no guilt verbs, no fake urgency, no social-comparison lies (clears ethical module).

---

## (e) ASCII WIREFRAMES

### (1) Client Hub Nutrition Tab — DESKTOP
```
+------------------------------------------------------------------+
| Aria V. [avatar]   Last log: Today 14:32 ✓                      |
+------------------------------------------------------------------+
| ADHERENCE 87%  | STREAK 12d | FLAGS: Na+⚠  Verify 2             |
| [======Ice Wing bar======]                                      |
+------------------------------------------------------------------+
| TODAY ACTUAL vs TARGET              (Arctic Cyan bars)           |
| Calories  1840/2100 [████████░░]                                 |
| Protein   142/150g  [█████████░]   Fiber 18/25 [█████░░░]       |
| Hydration 1.8/2.5L  [██████░░░░]                                |
+------------------------------------------------------------------+
| [‹ Prev]  Aug 04, 2026  [Next ›]   (44px Wing Purple → cyan)    |
+------------------------------------------------------------------+
| 14-DAY TREND (collapsed)                         [+ expand]     |
| |Victory: logged(line) vs target(dash)|                         |
+------------------------------------------------------------------+
| DIARY                                                           |
| 08:15 🍳 Oats      310kcal  [verify ✓]                          |
| 12:40 🍗 Bowl      640kcal  [verify ✓]                          |
| 14:32 🍫 Bar       220kcal  [verify ⚠] <- Wing Purple border    |
+------------------------------------------------------------------+
```

### (2) Client Hub Nutrition Tab — 414px MOBILE
```
+----------------------------------+
| Aria V. ✓ Today 14:32            |
+----------------------------------+
| ADHERENCE 87%  STREAK 12d        |
| [====Ice Wing bar====]  Na+⚠ 2v  |
+----------------------------------+
| TODAY vs TARGET                  |
| Cal 1840/2100 [█████░░]          |
| Pro 142/150  [█████░░]           |
| Hyd 1.8/2.5L [███░░░░]           |
+----------------------------------+
| [‹] Aug 04 [›]  (44px steppers)  |
+----------------------------------+
| TREND (tap)                      |
| [Victory sparkline]              |
+----------------------------------+
| DIARY                            |
| 🍳 08:15 Oats 310 [✓]            |
| 🍗 12:40 Bowl 640 [✓]            |
| 🍫 14:32 Bar 220 [⚠]             |
+----------------------------------+
| [+ Quick Add FAB]  (56px)        |
+----------------------------------+
```

### (3) Workspace IA — DESKTOP
```
+------------------------------------------------------------------+
| SWAN NUTRITION                                   [Search] [Learn]|
+------------------------------------------------------------------+
| [ Capture*] [ Insights ] [ Fuel ] [ Explore ]  <- SegmentedBar   |
|  today log voice barcode restaurant hydration  <- SubPillRow     |
+------------------------------------------------------------------+
|                                                                  |
|  MAIN: TodayPanel (ring + macro grid + diary timeline)           |
|                                                                  |
+------------------------------------------------------------------+
```
*\*active segment*

### (4) Workspace IA — 414px MOBILE
```
+----------------------------------+
| SWAN NUTRITION        [🔍]       |
+----------------------------------+
| [Cap][Ins][Fuel][Exp] bottom-nav |
|  today log voice barcode ...     |
+----------------------------------+
| content (TodayPanel mobile)      |
+----------------------------------+
| [bottom nav active: Capture]     |
+----------------------------------+
```

### (5) DELIGHT MOMENT — Streak Unlock
```
+------------------------------------------------------------------+
|  🦢  STREAK UNLOCKED                                             |
|        ( )                                                      |
|       / 12 \    "Your wing is spread."                          |
|      | DAYS|    Gilded Fern shimmer ring                         |
|       \    /    +50 XP (PointTransaction)                        |
|        ( )                                                      |
|  [Share Milestone]  (Wing Purple bg → Arctic Cyan glow)         |
+------------------------------------------------------------------+
```
*Reduced-motion: ring static, no shimmer keyframe, toast still fires.*

---

## (f) RANK — UGLIEST FAILURES & HIGHEST-LEVERAGE FIXES

**Ugliest current UX failures:**
1. Native `<select>` hiding 9/14 tabs (discovery murder)
2. Numeric-ID client picker in Plan Builder (backend-UI leak)
3. Today-only coach tab with self-deprecating "status only" card
4. 51 hardcoded colors on orphan scanner (brand violation)
5. Roster "N tracked" truncation lie

**Highest-leverage visual fixes (phased, builder-exact):**
1. **`SegmentedTabBar` + `SubPillRow`** (tokens: Royal Depth / Ice Wing / Frost White) — recovers 64% of surface in 1 component.
2. **`AdherenceHero` + `ActualVsTargetGrid`** on coach tab — turns a useless tab into the most-opened coaching screen.
3. **`QuickAddFab` + `RepeatYesterdayButton`** — kills re-typing friction; directly feeds the inert Phase-3 gamification loop.
4. **`StreakRing` with brand glow** — makes logging feel like a game without dark patterns.
5. **Tokenize `FoodScannerPage`** (replace 51 literals with `var(--*)`) + resurrect 727-line safety UI as `FoodQualityTab` under Explore; fix roster truncation → "Show all N" affordance.

**Phased slices:**
- **4A:** `CoachClientNutritionHeader`, `AdherenceHero`, `ActualVsTargetGrid`, `DateStepper`, `DiaryTimelineRow` → closes today-only + repositions triage card.
- **4B:** `SegmentedTabBar`, `SubPillRow`, mobile `BottomNav` → delete `<select>` in `NutritionWorkspace.tsx`.
- **4C:** `QuickAddFab`, `RepeatYesterdayButton`, `StreakRing`, `CelebrationToast`, `EmptyStateCard`, `SkeletonShimmer`, `SwanErrorCard`.
- **4D:** `NutritionNudgeCard` (home), `BellNudgeItem`, toast copy pools, frequency hook (wires to Phase-3 cron).
- **4E:** Scanner tokenization, `FoodQualityTab`, roster "Show all" fix.

**Global component contract:** `styled-components` only · `min-height:44px` interactive · `prefers-reduced-motion` guard on every animation · Victory for all charts (`Arctic Cyan` chart-only) · dual-button glow enforced (blue→purple, purple→cyan) · no MUI · no generic dashboard slop.

— HY3, signed off. The UX is salvageable; the current IA is not.

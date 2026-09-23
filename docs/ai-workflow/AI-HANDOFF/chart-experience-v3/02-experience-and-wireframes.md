---
artifact_id: SWAN-CHART-V3-UX
owner: lead Codex
version: 3.0
status: BUILD-EXACT DESIGN; UNIMPLEMENTED
supersedes: old client-grid wireframes
---

# Sapphire Ledger: exact experience

## Opening story

Route stays `/dashboard/client/progress`. Existing dashboard navigation, authentication,
world/lens shell, workout logging and detailed-progress entry points survive.

1. H1 **Your progress**; supporting line **Small steps. Visible progress.**
2. Right primary action **Log workout** uses the existing, mount-verified client logger route.
3. Local tabs **Overview** (default) / **All charts**. Native button semantics, `aria-selected`.
4. Hero chart: **Training rhythm**, fixed `workoutFrequency` ID; unit **sessions**.
5. One evidence sentence: e.g. **12 sessions in your last 4 complete weeks.** If comparison
   eligible: **3 more than the previous 4 weeks.** No percent needed for simple counts.
6. One supporting feature **Strength in focus**: best logged set/estimate for a named exercise,
   only if allowed and available. Fallback is **A closer look at your training** linking to
   volume if available; otherwise no extra card. Never fill gaps with fake metrics.
7. One next action under the hero: **Explore this week** when detail allowed; **View session
   counts** when detail locked; **Log workout** only for genuinely empty history.

Body measurements NEVER become an unsolicited overview story. No recovery scare card,
leaderboard, streak-loss warning, grade, or target invented from population norms.
Training rhythm remains the hero; the supporting story cannot reorder the page while reading.
Freeze the story selection until next route entry or explicit refresh, except permission loss.

## Desktop wireframe — 1440 CSS px, content maximum 1440 inside existing shell

```text
┌ existing dashboard nav ─────────────────────────────────────────────────────┐
│ YOUR PROGRESS                                            [Log workout]      │
│ Small steps. Visible progress.                                              │
│ [Overview] [All charts]                       Last updated 14:32 · [Refresh]│
│                                                                            │
│ ┌ TRAINING RHYTHM · sessions ──────────────┐ ┌ STRENGTH IN FOCUS ───────────┐│
│ │ 12 sessions                            │ │ Bench press                  ││
│ │ last 4 complete weeks · +3 vs prior 4   │ │ best logged set at 5 reps    ││
│ │ [4 weeks] [12 weeks] [24 weeks]         │ │ 135 lb · source Sep 2        ││
│ │ 4 ┤                     ▆        ▒     │ │ [See the evidence]           ││
│ │ 2 ┤ ▃  ▆  ▃  ▆  ▃  ▆  ▆ ▆  ▆  ▆ ▒     │ └─────────────────────────────┘│
│ │ 0 ┼────────────────────────────────    │                                 │
│ │ Jun 15    Jul 13    Aug 10     Sep 7*  │                                 │
│ │ * Current week · in progress           │                                 │
│ │ [Explore this week] [View table] [⋯]   │                                 │
│ └────────────────────────────────────────┘                                 │
│ Explore your progress                 [Browse all 15 charts →]             │
│ [Training — sessions & workload] [Strength — logged lifts] [Body — private] │
└────────────────────────────────────────────────────────────────────────────┘
```

Wireframe figures are schematic; preview fixture defines actual arithmetic.
At 1024–1919 use 8:4 hero/aside proportions, gap24, page gutter24, section gap32.
At 768–1023 use one hero row then supporting card, gutter24. At ≥1920 use max-width
1760; hero plot never exceeds1120, prose max64ch; keep weighted layout, do not add cards
just to fill 4K. Title32–40, hero number40–56, body16, data12–14. No 11px critical copy.

## Phone wireframe — 375/414 CSS px

```text
┌──────────────────────────────────┐
│ Your progress       [Log workout]│
│ Small steps. Visible progress.   │
│ [Overview] [All charts]           │
│ Updated 14:32          [Refresh]  │
│ ┌ TRAINING RHYTHM ──────────────┐ │
│ │ 12 sessions                  │ │
│ │ Last 4 complete weeks        │ │
│ │ 3 more than the previous 4   │ │
│ │ [4 weeks][12 weeks][24 weeks]│ │
│ │ ▃ ▆ ▃ ▆ ▃ ▆ ▆ █ ▆ ▆ ▆ ▒    │ │
│ │ Jun 15    Jul 27    Sep 7*    │ │
│ │ * Current week in progress   │ │
│ │ [Explore this week]          │ │
│ │ [View table]  [More actions] │ │
│ └──────────────────────────────┘ │
│ Strength in focus               │
│ [See the evidence]              │
│ [Browse all 15 charts]           │
└──────────────────────────────────┘
```

At320 use16 gutter,16 card padding,24 section gap, chart plot184 high, three x ticks,
no y-label rotation. At375/414 plot208 high, four x ticks if measured labels fit.
Cards naturally grow for text at200% zoom. Never fixed-height crop text. Header action
wraps below title at320. Actions wrap with8 gaps and ≥44×44 targets. No page-x scroll.

## All charts

Top: heading **All charts**, labeled search **Find a chart**, filter buttons **All**, **Training**,
**Strength**, **Body**, and **Saved**. Search title, plain-language description and exercise
label; case-insensitive contains; no remote request per keystroke. “Saved” means chart IDs
only, device-local, max3; no client measurements or notes persisted. Scope by authenticated
subject; clear on logout; never reuse another subject's saved list. Storage failure leaves
session-only selection and small **Saved for this visit** notice. Empty Saved shows **Save
up to 3 charts for quick access.** A fourth save is disabled with that reason.

Order within groups follows registry order. Desktop: two columns, no masonry; mobile one.
Only first4 plot bodies mount initially, then IntersectionObserver200px preload; every card
heading and state stays in the DOM for navigation/search. At most6 mounted plot bodies;
unmount distant plots without losing filters or data. Print/table mode can bypass this.
Do not hide locked cards: include title, description, existing tier name and one upgrade link.
Search match count includes locked; don't label them “missing data.” Body cards appear only
after Body or All selection—not Overview, Saved by default, or social preview.

## Exact card anatomy

`ChartHeader(title, period, save button)` → `MetricSummary(value, unit, comparison)` →
`SourceCaption` → `plot` → `Legend` if necessary → `ActionRow` → optional data table.
No cards inside cards. One frame owns header/chrome/states in grid and expanded modes.
All charts use the same typography, gaps, source caption and action positions; chart kinds
and scales remain appropriate to the metric. No requirement to make every chart a line.

Header overflow never hides title. Always-visible **View table** and **Expand chart**;
overflow menu contains CSV, PDF where supported, and allowed Share. Unsupported actions
are absent with reason in expanded **About this chart**, not inert buttons.

## Interaction contract

| Control | Result | Keyboard/focus and recovery |
|---|---|---|
| Plot point/bar | Select nearest actual datum and open evidence panel when capability allowed | Equivalent table row button; no transparent overlapping targets; point label matches selection |
| View table | Inline table immediately after actions, same values/units/order as plot | `aria-expanded`; focus remains trigger, table caption; row labels buttons if drillable |
| Expand chart | Single dialog, enlarged same frame + About + data tabs; does not refetch solely for size | Focus title then controls; Escape restores exact trigger; no nested modals |
| Detail inside expanded chart | Replace dialog's internal view; Back restores chart selection/scroll | Do NOT stack drill and expand dialogs |
| Range4/12/24w | Request selected full calendar bins; explicit current-week partial state | Keep old frame labeled old range during fetch; no relabeling stale points |
| Legend | Toggle series using same stable seriesKey; cannot hide last visible series | Last toggle disabled, reason; table follows selection with Show all rows option |
| Refresh | Refetch selected chart or visible overview resources | Disabled while own request in flight; targeted polite announcement |
| Locked detail | Show **Session details require {server tier label}.** + existing upgrade link | No doomed retry; chart aggregate remains available |
| Session in detail | Inline accordion with date/time, duration, exercises, sets/reps/load/RPE | Expanded state and 44px header; no navigation away from chart |
| Session PDF | Existing session export after parity check, with current-session details only | Explicit action; no hidden publish; failure retains details |
| Share | Open isolated allowlisted preview; then explicit **Publish to feed** | See sharing flow; never publish on opening, range change or close |

## Detail wireframe

```text
Desktop side panel 480px (≥1024) / mobile bottom sheet, max90dvh:
[Back when inside expand]       Week of Aug 24–30, 2026     [Close]
3 completed sessions · full week · timezone America/Los_Angeles
These are the sessions included in this bar.
[Mon Aug 24 · 42 min                         Expand session]
  Bench press           Set   Reps  Load      RPE
                         1      5   135 lb      8
                         2      5   130 lb      —
  [Download session PDF]
[Wed Aug 26 · 51 min                         Expand session]
[Sat Aug 29 · 38 min                         Expand session]
About this count: completed sessions, including two on the same day.
```

One scroll owner per overlay body. Sticky title/close and safe-area bottom padding. Background
inert/scroll-locked only while dialog open. Palette passed from origin; never re-resolve portal
against document defaults. Authorization loss closes, clears and restores focus to safe heading.

## State copy and rendering

| State | Visible output | Prohibited output |
|---|---|---|
| First load | Geometry-matched static skeleton; **Loading your training history…** | Invented series; all15 animated skeletons |
| Ready | Real marks, unit, absolute period, updated time | Unlabeled sum or percent |
| Empty | **Your first completed workout starts this chart.** + Log workout (training); **No measurements in this period.** + change period (body) | “Log a workout” for body data or request failures |
| Refreshing same key | Prior snapshot with **Updating…**; busy; no mark activation/export | Renaming old points to new range |
| Error without snapshot | **We couldn't load this chart.** + Retry | Zero, successful empty or success celebration |
| Refresh error | Old snapshot with **Showing the last successful update from {time}.** + Retry | Silent stale content, share/export of stale snapshot |
| Partial quality | Available points + **Some records need review.** and count/reason in About | Connecting invalid/missing observations into a continuous trend |
| Locked | Existing server tier label + **See plan options** link | Teaser raw-detail leak; changes to pricing |
| Denied/expired session | Clear data immediately; reauthenticate or permission message | Keep another identity's snapshot |
| No comparable prior | **Not enough comparable history yet.** | 0%, Infinity, “declining,” or a decorative progress ring |

## Existing-widget disposition — no deletion

| Current widget(s) | V3 disposition |
|---|---|
| ProofCockpit / FacetRail | Counts become library filter/status text; use simple filters |
| LatestMovementDigest / ProofReel | One deterministic supporting story; full historical list in expanded evidence |
| ProgressChartCube / MetricConstellation | Not mounted in V3 client overview; retain old implementation for flag-off/staff consumers |
| WarRoomBoard | Staff workflow later, not an unsolicited client landing surface |
| RecoveryObservatory | Replace client presentation with neutral Effort & notes chart, no diagnosis |
| ExerciseCodex / ExerciseMegaStats | Keep discoverable **Exercise history** link in Strength library; retain existing route until a separate redesign |
| Current charts grid | All15 migrated to same frame in All charts; not repeated beneath Overview |
| Level/streak/PR strips in parent page | One contextual verified record at most; no repeated facts above hero |

## Visual system (Swan router applied)

Single token bridge consumes existing world/lens values. Carbon/Graphite data surfaces with
quiet sapphire depth;1px crisp edge;20px card radius;12px controls. No backdrop animation under
data, hover translation, rotating cube, noisy glow, or chart entrance animation. Plot data
appears immediately after measurement. SNAP160ms opacity for selected UI;0ms reduced motion.
Plus Jakarta headings; Sora UI; Fira Code tabular data; one Cormorant line maximum per viewport.
Series1 Arctic Cyan, series2 Wing Purple; more series use direct labels + dash/shape, not gold.
Gold only earned PR numerals/deltas,1px filigree, focus, or one allowed badge—not bar fills.
Normal text contrast≥4.5:1, marks/focus≥3:1 against resolved surface. Forced colors: outlines,
patterns, text; no glow dependency. Primary button sapphire with purple focus; accent buttons
use deep-purple token only if measured contrast passes. No known failing Forge color waiver.

Preview is a static design study with synthetic data. It does not implement these interactions.

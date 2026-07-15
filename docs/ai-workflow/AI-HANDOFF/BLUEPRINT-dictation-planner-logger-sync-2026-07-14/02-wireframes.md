# 02 — Wireframes & Copy

Palette: `var(--bg-base,#030712)` page · `var(--bg-elevated,#141419)` dock ·
`var(--accent-primary,#60C0F0)` Ice Wing · `var(--accent-secondary,#8B5CF6)` Wing Purple ·
text `var(--text-primary,#E0ECF4)`. All buttons ≥44px. Dark-first. No hardcoded colors.

## A. Planner Coach dock — collapsed (default, desktop 1440px)
Rendered at the BOTTOM of the planner page (below the ThreePanel, above Saved Plans), full width.
```
┌──────────────────────────────────────────────────────────────────────────────┐
│ 🗣  Swan Coach — talk to build this plan                    [ Open Coach ▲ ] │
└──────────────────────────────────────────────────────────────────────────────┘
```
Copy: title `Swan Coach — talk to build this plan`. Button `Open Coach` (aria-expanded).

## B. Planner Coach dock — open (desktop)
```
┌──────────────────────────────────────────────────────────────────────────────┐
│ 🗣 Swan Coach                                   client: <ClientName chip>    │
│ ┌──────────────────────────────────────────────────────────────────────────┐ │
│ │ receipt feed (newest at bottom, max-height 180px, scroll)                │ │
│ │ ✓ Added Goblet Squat — 3×12 (builder)                                    │ │
│ │ ✓ Swapped Leg Press → Box Squat (Week 1 · Day 2)                         │ │
│ │ ✗ Couldn't find "blorp press" — say the exercise name again?             │ │
│ └──────────────────────────────────────────────────────────────────────────┘ │
│ ┌───────────────────────────────────────────────────────────┐ ┌────┐ ┌─────┐ │
│ │ textarea: "Tell Swan Coach what to change…"               │ │ 🎤 │ │Send │ │
│ │ (interim dictation shows as hint BELOW, never in value)   │ └────┘ └─────┘ │
│ └───────────────────────────────────────────────────────────┘                │
│ hint: `listening…  "swap the leg press for…"` (italic, muted)  [Collapse ▼]  │
└──────────────────────────────────────────────────────────────────────────────┘
```
- Mic button: `aria-label="Dictate to Swan Coach"`; `aria-pressed` while listening; Ice Wing idle,
  Wing Purple glow while listening (Dual-Button Glow: purple bg → cyan glow).
- Send: `aria-label="Send to Swan Coach"`. Enter submits; Shift+Enter newline.
- Receipt rows: prefix `✓`(success)/`✗`(failure); plain sentences, no JSON.
- Busy state: Send disabled + label `Working…`; feed shows `Swan Coach is thinking…` row.
- Error state (lane down): feed row `✗ Swan Coach is unreachable — try again.` (no toast).
- Empty state (first open): feed shows one muted row:
  `Try: "Add goblet squats, three sets of twelve" · "Swap leg press for box squat" · "Make day two lighter"`.

## C. Planner Coach dock — 375px mobile
Same dock; textarea full-width; mic + Send side-by-side below it (each ≥44px, 50% width).
Receipt feed max-height 120px. Collapse chip pinned right.

## D. Logger mic (S4) — placement
In the Workout Logger action bar (next to the existing action buttons; exact host file in 04):
```
[ + Add Exercise ]  [ 🎤 Dictate ]  [ Submit Workout ]
```
- Tap → dictation on (same tap-to-stop model as Coach); a slim strip appears above the exercise
  list:
```
┌ 🎤 listening… say things like "leg press, set two, ninety pounds, eleven reps" — [Stop] [Send] ┐
```
- On Send: text goes to the command lane with `surface:'workout-logger'` context; the strip shows
  the receipt sentence returned (e.g. `✓ Updated Leg Press set 2 → 90 lbs × 11`).
- If no command matched: `✗ I heard "<text>" — try naming the exercise and set number.`
  (NO chat fallback in the logger — see 06-bans.)

## E. Weight suggestion (S5) — set row
The existing per-set weight input gains a placeholder + tap-to-fill chip when a suggestion exists:
```
Set 2   Weight [  90 ⟲ ]   Reps [ 11 ]     ← placeholder shows "90" muted until typed
        chip below input: `last: 90 lbs · Jul 10` (tap = fills the input)
```
- Chip only when suggestion exists; `aria-label="Use last weight 90 pounds"`; 44px tap target.
- Never auto-COMMITS a weight — placeholder/chip only. An untouched field still submits 0 as today
  unless Sean taps the chip or types.

## F. States checklist (builder must implement all)
| Surface | Loading | Empty | Error | Reduced-motion |
|---|---|---|---|---|
| Coach dock feed | `Swan Coach is thinking…` row | example-prompts row | `✗ …unreachable` row | no pulse animation on mic |
| Logger dictate strip | n/a | hint copy in strip | `✗` sentence in strip | static mic icon |
| Weight chip | absent until fetch resolves | absent | absent (fail-silent, log console.warn) | n/a |

# 02 — Wireframes (all screens, 375pt-wide phone frame, dark-first)

Tokens referenced here are defined in `mobile/src/theme/tokens.ts` (see 04-build-order F1.2):
`bgBase #0A0A0F` · `bgCard #141419` · `bgSurface #1A1A24` · `textPrimary #E0ECF4` ·
`primary #002060` · `primaryElevated #003080` · `accentIce #60C0F0` · `accentGold #C6A84B` ·
`glowPurple #8B5CF6` · `dataCyan #50A0F0` (charts ONLY, never buttons) · `lavender #4070C0`.
Headings: Plus Jakarta Sans (bundle via expo-font). Data/numbers: Fira Code. UI: Sora.
Buttons: blue bg → purple glow shadow; purple bg → cyan glow shadow (Dual-Button Glow).
All pressables ≥44pt. Every screen has loading (skeleton), empty, and error states as drawn.

## S1 — Login  (`app/(auth)/login.tsx`)

```
┌─────────────────────────────────────┐
│              [swan logo]            │  bgBase
│         SwanStudios                 │  Plus Jakarta Sans 28 textPrimary
│   Your training, everywhere.        │  Sora 15 textPrimary @70%
│                                     │
│  Email or username                  │  label Sora 13
│  ┌───────────────────────────────┐  │  input: bgSurface, 1px lavender@40%,
│  │                               │  │  focus ring glowPurple, height 52
│  └───────────────────────────────┘  │
│  Password                     [👁]  │  eye toggles secureTextEntry, 44pt
│  ┌───────────────────────────────┐  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │  GlowButton: bg primary,
│  │           Sign In             │  │  purple glow, radius 12, h 52
│  └───────────────────────────────┘  │  disabled while pending → spinner
│                                     │
│        Forgot your password?        │  link accentIce — opens web URL
└─────────────────────────────────────┘
Error state: banner above button, bgSurface + 1px #EF4444@60%:
  wrong creds → "That login didn't match. Check your email and password."
  network     → "Can't reach SwanStudios. Check your connection and try again."
  5xx         → "Something went wrong on our end. Try again in a moment."
NO self-serve registration in v1 (clients are provisioned by their trainer). No signup link.
```

## S2 — Home (`app/(app)/index.tsx`)

```
┌─────────────────────────────────────┐
│ Good evening, {firstName}    [◎]    │  greeting by local time; ◎=avatar 44pt→Profile stub
│                                     │
│ ┌─────────────────────────────────┐ │  "Today" card, bgCard, radius 16
│ │ TODAY'S WORKOUT        chevron ›│ │  overline Sora 12 accentIce
│ │ {workout title}                 │ │  Plus Jakarta 20
│ │ {n} exercises · ~{est} min      │ │  Fira Code 13 @70%; omit "· ~{est} min"
│ │                                 │ │  entirely if the plan has no duration field
│ │ ┌─────────────────────────────┐ │ │  GlowButton "Start Workout"
│ │ └─────────────────────────────┘ │ │  → S3
│ └─────────────────────────────────┘ │
│ ┌───────────────┐ ┌───────────────┐ │  two stat tiles, bgCard
│ │ STREAK        │ │ THIS WEEK     │ │
│ │  {n} days 🔥  │ │ {n} workouts  │ │  numbers Fira Code 24 accentGold
│ └───────────────┘ └───────────────┘ │
│ ┌─────────────────────────────────┐ │  Progress preview card
│ │ PROGRESS                      › │ │  → S6
│ │ [mini sparkline, dataCyan]      │ │
│ └─────────────────────────────────┘ │
│ ────────── tab bar ──────────────── │
│   ● Home      ○ Log      ○ Progress │  bgSurface, active accentIce, 44pt
└─────────────────────────────────────┘
Empty (no plan assigned): Today card body → "No workout assigned yet. Your trainer is
building your plan." + secondary button "View past workouts" → S5.
Error: card body → "Couldn't load your workout." + "Retry" text button (accentIce).
Loading: skeleton blocks (bgSurface pulse) matching card layout.
```

## S3 — Workout Overview (`app/(app)/workout/current.tsx`)

```
┌─────────────────────────────────────┐
│ ‹ Back        {workout title}       │
│ {n} exercises · assigned {date}     │
│ ┌─────────────────────────────────┐ │  one row per exercise, bgCard
│ │ 1  Goblet Squat                 │ │  name Sora 16
│ │    3 sets × 10 reps @ 25 lb     │ │  Fira Code 13 @70%
│ ├─────────────────────────────────┤ │
│ │ 2  Bench Press …                │ │
│ └─────────────────────────────────┘ │
│ ┌───────────────────────────────┐   │  sticky bottom GlowButton
│ │        Begin Logging          │   │  → S4
│ └───────────────────────────────┘   │
└─────────────────────────────────────┘
```

## S4 — Workout Logger (`app/(app)/workout/logger.tsx`) — THE core screen

```
┌─────────────────────────────────────┐
│ ‹ Exit    Logging · {title}   00:00 │  session timer Fira Code; Exit → confirm sheet
│ [⚠ Offline — sets are saved on     │  offline banner (only when disconnected):
│    this phone and sync later]       │  bgSurface + accentGold border, persistent
│                                     │
│ Exercise 2 of 6                     │  progress text + thin bar (accentIce)
│ ┌─────────────────────────────────┐ │
│ │ Bench Press                     │ │  Plus Jakarta 20
│ │ Target: 3 × 10 @ 95 lb          │ │
│ │  SET   LBS      REPS       ✓    │ │  law grid: one row per set
│ │   1   [ 95 ]   [ 10 ]    [ ✓ ]  │ │  numeric inputs 56pt tall, Fira Code 18;
│ │   2   [ 95 ]   [ 10 ]    [ ○ ]  │ │  ✓ button 48pt — tap = set logged
│ │   3   [    ]   [    ]    [ ○ ]  │ │  (writes draft to disk IMMEDIATELY)
│ │            + Add set            │ │  text button, 44pt
│ └─────────────────────────────────┘ │
│  ‹ Prev exercise      Next exercise ›│  44pt, disabled at bounds
│ ┌───────────────────────────────┐   │  sticky: "Finish Workout" GlowButton
│ └───────────────────────────────┘   │  → S4b summary sheet
└─────────────────────────────────────┘
Keyboard: inputMode="decimal" for lbs, "numeric" for reps; KeyboardAvoidingView; tapping
✓ dismisses keyboard and auto-advances focus to next unlogged set.
Exit confirm sheet: "Leave workout? Your logged sets are saved as a draft." [Keep going]
[Leave — draft saved]. NEVER a destructive discard option.
```

## S4b — Finish & Save sheet

```
┌─────────────────────────────────────┐
│         Workout complete 🎉         │
│   {n} sets · {volume} lb total ·    │
│         {mm} minutes                │
│  Notes (optional)                   │
│  ┌───────────────────────────────┐  │  multiline, 3 rows
│  └───────────────────────────────┘  │
│  ┌───────────────────────────────┐  │  GlowButton "Save Workout"
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
Save success → toast "Workout saved." → navigate S5 (history) with new entry on top.
Save failure/offline → sheet stays, banner: "Saved on this phone — will sync automatically."
→ queue per 03-contracts §6; navigate to S5 where the entry shows a "Pending sync ↻" pill
(accentGold). NEVER lose the data; NEVER block the user on retry.
```

## S5 — History (`app/(app)/workout/history.tsx`)

```
┌─────────────────────────────────────┐
│ Workout History                     │
│ ┌─────────────────────────────────┐ │  one card per session, newest first,
│ │ Tue, Jul 14 · {title}           │ │  infinite scroll (page size 20)
│ │ {n} sets · {volume} lb · {mm}m  │ │
│ │ [Pending sync ↻]                │ │  pill only for queued offline entries
│ └─────────────────────────────────┘ │
Empty: "No workouts logged yet. Your first session will show up here."
```

## S6 — Progress (`app/(app)/progress.tsx`)

```
┌─────────────────────────────────────┐
│ Progress                            │
│ [ 4W ] [ 8W ] [ 12W ]               │  range pills, 44pt, active = primaryElevated
│ ┌─────────────────────────────────┐ │
│ │ WORKOUT VOLUME                  │ │  victory-native line/area chart,
│ │   (chart: dataCyan line,        │ │  240pt tall, axis labels Fira Code 11,
│ │    accentGold point on max)     │ │  grid lines textPrimary@8%
│ └─────────────────────────────────┘ │
│ Total volume {sum} lb · Best day    │
│ {date} ({n} lb)                     │
Empty: "Log two workouts to see your progress curve." Error: "Couldn't load progress."+Retry.
```

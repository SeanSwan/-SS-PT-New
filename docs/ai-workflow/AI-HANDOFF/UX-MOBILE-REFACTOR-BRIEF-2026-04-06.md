# UX and Mobile Refactor Brief

Date: 2026-04-06
Purpose: Isolate all UX, layout, readability, navigation, and mobile responsiveness problems into one focused refactor track.
Parent brief: `docs/ai-workflow/AI-HANDOFF/COMPREHENSIVE-SITE-REFRACTOR-BRIEF-2026-04-06.md`

## Primary Device Context

- Baseline device: iPhone XR
- Requirement: older or weaker phones must still have a smooth experience

## Core UX Principles

- mobile-first layout behavior
- no clipped columns or hidden controls
- contained scrolling instead of page-length overflow lists
- readable typography and contrast on all supported themes
- consistent drawer, modal, back, and overlay behavior
- no dead ends and no “stuck on this screen” flows

## Refactor Tracks

## 1. Rolodex and contained-scroll pattern

Apply a shared compact-scroll pattern to:

- workout planner exercise list
- bootcamp exercise selection
- manual workout mode
- content studio coverage tracker exercise list
- any other long mobile lists that currently fill the page

Expected behavior:

- show about 5 to 7 items at once on small screens
- keep the list inside a fixed-height panel
- preserve the main workspace above/beside it
- allow fast browsing without consuming the entire page

## 2. Mobile planner readability

Issues to solve:

- exercise names disappear in the mobile builder
- layout leaves only sets/reps/rest/tempo and index numbers
- builder and Teach Mode compete for space
- add interaction is unclear on desktop and mobile

Expected outcome:

- every exercise card remains identifiable
- add/remove/edit actions are explicit
- the builder remains readable at phone widths

## 3. Horizontal tab accessibility

Affected areas:

- Content Studio
- Marketing workspace
- any tab bar with too many tabs to fit on mobile

Expected outcome:

- horizontal swipe/scroll works
- tabs are reachable without zooming or layout breakage
- active state remains obvious

## 4. Contrast and readability overhaul

Affected areas called out explicitly:

- Boot Camp class preview
- form assessment tab
- marketing keyword/blog/email areas
- security workspace
- profile settings sliders
- companion text and smaller cards

Expected outcome:

- readable in the default theme
- readable in all supported themes
- no blue-on-blue or low-contrast states

## 5. Navigation and exit consistency

Problems:

- sidebar sometimes requires a second tap outside the target area to dismiss
- membership flow traps users
- content studio error recovery sends users to unrelated screens
- equipment/location flows lack a clear return path
- AI overlays can trap prior content behind them

Expected outcome:

- single predictable close/dismiss behavior
- back returns to the previous logical context
- drawers do not require “mystery taps”
- overlays have visible exit controls

## 6. Dashboard layout consolidation

Affected areas:

- admin overview
- trainer overview
- client overview
- companion/community/progress sections

Problems:

- too many weak tabs
- not enough strong widgets in overview areas
- important information is scattered instead of summarized

Expected outcome:

- stronger widget-first dashboards
- less fragmentation
- overview surfaces show the most important cards/charts/actions first

## 7. Responsive overflow and clipping review

Known examples:

- Find a Trainer hero view clipped on iPhone XR
- workout builder columns clip to the right
- enhanced client progress dashboard smashed on mobile
- bootcamp and other screens feel sticky or overflow awkwardly

Expected outcome:

- no horizontal clipping
- no hidden headers
- no broken columns
- stable scroll behavior

## 8. Performance on weaker phones

The mobile refactor must include:

- scroll performance review
- reduced layout thrash
- contained scroll regions instead of giant full-page lists
- careful handling of large drawers, charts, and long tab sets

## Output Expected From a UX/Mobile Pass

1. Shared mobile list/rolodex pattern
2. Shared drawer/modal/back-navigation pattern
3. Theme contrast audit
4. Overview/widget consolidation map
5. Overflow and clipping audit
6. iPhone XR acceptance criteria per module


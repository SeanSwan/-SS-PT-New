---
decision: "Session Shell — the WHOLE logger page refactored into 10 Lens-switchable full-page designs; consult packet v2 (Kimi/Opus5)"
status: open
supersedes: none
---

# SWAN SESSION SHELL — Full-Page Logger Remodel (Consult Packet v2, 2026-07-30)

## Sean's directive (verbatim intent)
Batch 1-3 only re-skinned the EXERCISE COLLECTION. Sean: "I wanted that page itself refactored as well… that entire front page… into 10 sharp ultra professional designs and the features that go with it… completely rethink the workout logger but do not forget what we had so we can build off of it… all connected to the Swan Lens… when I click buttons I don't want the browser jumping all over the place to different sections… straight to the point."

## What already shipped (BUILD ON THIS — do not discard)
`frontend/src/components/WorkoutLogger/runner/` — ONE engine (`useRunnerEngine`: exercises, renderExerciseCard, rest{endsAt-less v1}, stats, openRolodex, rows bundle), 4 live skins (Focus Flow default / Classic Ledger fallback / Ledger Pro / Sheet Stack), crash-boundary→Classic, Swan Lens **Runner tab** (Appearance Studio) with instant persisted switching (`ss.runner.style.v1`), Runner-styled empty state, and a **conformance harness** (swap-storm, static token law, 300-line cap, reduced-motion guard). 562/562 logger tests. The skins currently mount INSIDE the old page; this remodel inverts that: the SKIN owns the PAGE.

## The page today (why it feels confusing — full section inventory, top→bottom)
WorkoutLoggerHeader · ScheduledSessionStatusBanner · WorkoutDraftGateBanner · ActivePlanContextStrip (+plan-outcome empty panel) · EquipmentProfilePicker ("Training Location") · WorkoutLoggerCoachTerminal ("Ask Coach" + Deep-Research quick actions + "Swan Coach workout command") · SessionStatsBar · ModeBar (Quick/Detailed + offline + rest) · LearningModeToggle · NASMPhaseGuide · CompactProtocolSection ×3 (Warmup / Balance-Core / Cooldown) · WorkoutPlanAssignmentPicker + LoadPlanRow (Repeat Last / Load Today / History Import) · Search&Add + Dictate + Rolodex · **exercise collection (runner skins — DONE)** · SessionSummaryForm (intensity/notes) · SaveSuccessPanel + post-save handoff · StickyLogActionBar · Footer (Cancel/PDF/Save) · FloatingRestTimer + TimerFAB.
≈17 stacked sections on one scroll. Buttons open/toggle sections at different scroll positions → the "jumping all over" complaint. Two rest-timer surfaces. Three plan-loading affordances in different places. Coach appears twice (terminal + dictate strip).

## The remodel concept (attack this)
**SessionShell**: the page becomes a staged, skin-owned shell with FIVE fixed zones — every skin arranges the same zones, never invents new information architecture:
1. **Context bar** (one slim line: client · date · plan context · draft/sync state · Finish) — always visible, never scrolls away.
2. **Stage rail**: the session is THREE STAGES, not 17 sections — **Setup** (location/equipment, plan pick [ONE unified affordance: plan/repeat/history/suggested], warmup protocol) → **Train** (the existing runner skin + dictation + rolodex) → **Finish** (cooldown protocol, intensity/notes, save → celebration). Stage nav = explicit tabs/steps; advancing NEVER scroll-jumps — each stage replaces the canvas in place, scroll resets to top of canvas only.
3. **Coach dock** (ONE Coach surface per page: dictation + commands + proposals; Wing Purple; collapsible; replaces terminal-plus-strip duplication).
4. **Canvas** (the active stage's content — the runner skin IS the Train canvas).
5. **Action bar** (ONE bottom bar owned by the shell: stage-aware primary action [Start session / Log set·rest / Save workout], merges StickyLogActionBar + footer + skins' thumb bars + TimerFAB into one surface).

**Anti-jump interaction laws (Sean's explicit pain):** no `scrollIntoView`/anchor jumps on any button; toggles open IN PLACE (accordion max-height, no layout shift above the fold); overlays (rolodex/keypad/coach) are sheets/drawers that never move the page scroll; stage changes swap the canvas (no vertical travel); focus moves WITH intent (into the opened surface, back on close); `scroll-behavior` never 'smooth' on programmatic changes; NASM guide/learning/phase content behind progressive disclosure, closed by default.

**10 full-page designs** = the SAME roster (Focus Flow, Classic, Ledger Pro, Sheet Stack, + 7 Labs: Target Card, Split Zen, Ghost Rival, Timeline Pulse, Stadium HUD, World Immersion, Circuit Relay) promoted from collection-skins to PAGE recipes: each defines the zones' arrangement/chrome (e.g., Sheet Stack = stages as sheet detents; Ledger Pro = single-canvas power view with rail collapsed; World Immersion = Lens-world atmosphere behind all zones). Lens Runner tab keeps switching them live; swap keeps stage + scroll + drafts.

**Floors carried forward:** iPhone-X-first 375px; 320 never breaks; 44px; WCAG contrast + non-color state indicators; reduced-motion variant per recipe; Train token semantics (gold=earned only, purple=Coach only, world-accent=active); no raw colors (harness-enforced); 300-line files; conformance harness extends to page-level (stage-storm + swap-storm); engine contract unchanged for logging behavior (keypad/ghost/save untouched).

## Migration constraint (critical)
562 logger tests + canonical save path + dictation + AI_* events + draft gate + billing hints must keep passing. Slicing must be strangler-style: introduce SessionShell around the existing pieces zone by zone (Context bar → Action bar merge → Stage rail → Coach dock merge → per-style recipes), each slice shippable + revertible, hostile dry-loop per slice, batch pushes.

## Questions for consultants (answer ALL, ranked, concrete)
1. Attack the 3-stage IA (Setup/Train/Finish): what breaks for a real PT session flow (mid-session plan changes, skipped warmup, trainer logging DURING coaching)? Is a 4th stage or stage-optionality needed?
2. The five-zone shell: what's missing or wrongly merged (e.g., is merging footer+sticky bar+thumb bar into one action bar right)? Where do the 3 plan-loading affordances and the NASM protocol sections truly belong?
3. Anti-jump laws: add the interaction rules we missed (keypad/sheet focus return, back-button/stage history, unsaved-stage-exit guard, scroll restoration on swap).
4. Migration slicing: order the strangler slices for LOWEST risk to the 562-test suite + canonical save; name the tests that must be written FIRST.
5. Per-style page recipes: for Focus Flow, Ledger Pro, Sheet Stack — sketch (text) the 375px page layout in this shell (zone placement, what collapses).
6. The single biggest way this remodel fails Sean's "straight to the point" ask — and the mandate that prevents it.

---
decision: "FINAL 10 Lens-switchable Runner Styles — 3 archetype shells × recipes; Focus Flow default; engine contract v2 + conformance harness are the ship gates"
status: open
supersedes: none
---

# SWAN SESSION RUNNER — FINAL 10 (Fable synthesis of Kimi K3 + GPT Sol 5.6 + Opus 5, 2026-07-30)

Panel: `RUNNER-STYLES-CONSULT-KIMI-2026-07-30.md` ($0.09) · `-SOL-` · `-OPUS5-` (all against `RUNNER-STYLES-DESIGN-BRIEF-2026-07-30.md`). Verdicts converged on 6 points; rulings below are mine as Final Decider.

## The architecture that makes 10 affordable (Opus reframe — ADOPTED)
Ten styles are NOT ten layouts. They are **3 archetype shells × thin recipes**:
- **FOCUS shell** — one exercise dominant, session context as a rail. Slots: header, nowPanel, thumbBar, atmosphere, coachDock, ornament.
- **LEDGER shell** — whole session visible, dense, scrolling. Pinned active row + pinned bottom action bar.
- **SHEET shell** — persistent context canvas + ONE detented sheet host that owns all input surfaces (keypad, rolodex, coach, pain, finish).

A "Runner Style" = `{archetypeId, recipe}` — tokens, slot overrides, motion signature. New features land in shell slots and reach all 10 by default. Bundle = 3 chunks + recipes (≤18KB gz/skin, no new vendor deps). A skin crash error-bounds into **Focus Flow with engine state intact** ("Switched to Focus Flow to protect your session").

**Tiering (honesty about "flawlessly"):** Tier 1 full-SLA = Focus Flow, Ledger Pro, Sheet Stack. The other 7 ship as **Swan Labs** styles in the Lens picker (badged), auto-demoted if they fail the conformance harness. Instrument all 10 (taps-per-set, time-to-first-log, undo rate, abandon point); promote/kill on 90-day data.

## THE FINAL 10 (Lens picker roster)

**FOCUS shell**
1. **Focus Flow** ← **DEFAULT + crash-fallback.** One card, giant active set, next-up chip (mandatory), prev/next in the thumb bar (no edge swipe — iOS back-gesture collision), single soft pulse on focus change only (paused during rest). Panel: unanimous top-3; default per Sol+Opus (smallest failure surface).
2. **Split Zen** — arm's-length glance recipe: viewport-scale weight×reps, staged ± increments, **never auto-commit** (stage → Log → 5s undo pill).
3. **World Immersion** — the Lens world as atmosphere, CONSTRAINED: parallax only in top ~30% + gutters, data on opaque plates (4.5:1 vs worst animation frame), auto-degrade on reduced-motion/saveData/low battery/<60fps. Signature kept: log-commit fires a particle into the world (after durable commit, never on tap).
4. **Stadium HUD** — gamified chrome, REPAIRED: combo meter renders in `--world-accent` (momentum ≠ earned), **gold only for logged sets + verified PRs**, no sound by default. Combo rewards completed quality sets, and never shortens prescribed rest (safety ruling vs Kimi W10).
5. **Ghost Rival** — race your previous session: last session's sets replay as a translucent ghost alongside yours. Zero new data; pure retention. (Opus runner-up — promoted to fill the Voice-First slot.)

**LEDGER shell**
6. **Ledger Pro** (renamed from "Ladder Dense Pro" — no competitor names) — the perfected table: default columns `Set | Weight | Reps | Log` only, previous/target as ghost second line, row height ≥48px, selected row mirrors its Log into the pinned bottom bar. Power-user speed king.
7. **Timeline Pulse** — ledger + now-line recipe: 4px gutter timeline with pulse markers, auto-centered window (past 2 · NOW · next 2), **no scroll-hijack ever**.
8. **Target Card** (NEW — Opus; the biggest gap in the draft) — every set is a card of target-vs-last with ±steppers rounded via `roundToLoadable()`; **80% of sets log in one tap** without opening the keypad. Onboarding's "log without typing" pitch.

**SHEET shell**
9. **Sheet Stack** — iOS-native detent ergonomics; ONE sheet host, max 2 concurrent, detents from `visualViewport.height` (never 100vh), L2 keypad lives inside the sheet, every detent keeps a context header ("Bench Press · Set 2 of 4"), grabber-only dismiss, dirty values never silently discarded.
10. **Circuit Relay** (NEW — Sol) — supersets/circuits as rounds & stations: NOW card + "NEXT STATION" handoff (exercise, equipment, transition timer distinct from rest), `ROUND 2/4` indicator, skip-a-busy-station-and-return. Serves the real gym structure every flat list lies about.

**Cut/absorbed (with reasons):** Coach Voice-First → **a MODE in all 10** (waveform Wing-Purple strip expands from the coachDock; gyms are loud — voice is a shortcut, not a hierarchy). Command Deck → the **wide-viewport presentation of the FOCUS shell** (desktop/trainer-tablet two-pane), not a separate mobile skin. Ring Runner → rings survive where they're true: the **rest timer ring** + session mega-ring in header/finish (discrete sets as rings lose to "1/3" numerals at arm's length).

**Flagship future direction (own program, not this cycle): Duet — the Two-Body Runner.** Trainer's device drives, client's follows; either logs; coach attention = Wing-Purple halo on the set to do now; coach load adjustments arrive as live proposals. No consumer app can copy it (they have no coach) — it reuses the AI_* proposal pipeline (a human coach is just another proposal source). Needs realtime infra → schedule after B1b SSE spike.

## Engine contract v2 — P0 additions (unanimous; ship gate before any skin)
```ts
// identity/order   setId, exerciseInstanceId, clientId (idempotency), rev, exerciseOrder[], reorder*
// lifecycle        sessionStatus: draft|active|paused|finishing|saving|saved|save_failed|abandoned
//                  setStatus: pending|active|logging|logged|editing|error
// edit buffers     setDraftsById {weightText, repsText, rpeText, ..., dirtyFields[], validationErrors[]}
//                  updateSetDraft / commitSetDraft / discardSetDraft   // engine-owned: survives skin swap
// logging          logSet(setId) → {ok, eventId, prEvents[], nextFocus} | {ok:false, fieldErrors, recoverable}
// undo             undoLastAction(), restoreRemovedSet/Exercise, 5s window; destructive ops always undoable
// rest             rest {status, startedAt, endsAt: epochMs, prescribedSeconds, source, associatedSetId}
//                  // absolute deadline — derived display; visibilitychange reconcile; engine-owned haptics
// focus            focus {exerciseId, setId, field, reason}; focusNextAction(); advanceIntent() engine-owned
// sync truth       per-set syncState: draft|committed|queued|synced|conflict
//                  // GOLD only after durable local commit — earned color must never lie during signal drop
// structure        groupId + groupType superset|circuit, round/station, kind warmup|working|dropset|amrap,
//                  unilateral + side L|R|both        // Circuit Relay + honest supersets
// units            units lb|kg, per-exercise increment, availablePlates, roundToLoadable()
// provenance       target vs actual vs lastTime vs suggested {reason, confidence}
// a11y             announce(msg, politeness) — ONE host-owned live region
// surfaces         openSurface('keypad'|'rolodex'|'coach'|'pain'|'finish') — host arbitrates, skins present
// pause            pauseSession/resumeSession, pausedSegments[] (elapsed excludes pauses)
// dictation        status idle|listening|processing|needs_confirmation|failed + transcript + confirm/cancel
// coach proposals  proposal {id, command, explanation, status proposed|accepted|rejected|executing|failed}
// derived          engine-owned selectors: volume, setsDone/Total, nextUp, estRemaining (ten skins ≠ ten totals)
// telemetry        instrument(event, payload) — per-skin funnel; the evidence for 90-day promote/kill
// prefs            reducedMotion, density, glanceScale, haptics, handedness (mirror rails for lefties)
```

## Conformance harness (the ship gate for every skin)
`tests/skins/conformance/` — parametrized over all 10: log a set at 320+375 · keypad never occludes the active field · all targets ≥44px · Train-state contrast audit (color + shape indicator, WCAG 1.4.1 — never color-only) · reduced-motion snapshot honored · **swap-storm** (cycle all 10 at every lifecycle step; engine state hash byte-identical; focus restored semantically + announced) · save-failure recovery · supersets render grouped · pain capture reachable. Failing = auto-hidden in the Lens picker, not a blocked release. Lint: **no raw hex/rgb in any skin file** — semantic `--runner-*` tokens only; `--world-accent` may feed `--runner-active` but may never override logged-gold or coach-purple.

## Build order (Sol+Opus concurrence)
1. Engine contract v2 + shared primitives (SetRow, Stepper, GhostChip, RestRing, sheet host) + swap-storm test
2. **Focus Flow** (default + fallback; quality benchmark)
3. **Sheet Stack** → 4. **Ledger Pro** → 5. Conformance harness green across the three = Tier 1 ships
6. Target Card + Ghost Rival + Split Zen (FOCUS recipes are cheap now) → 7. Timeline Pulse, Stadium HUD, World Immersion, Circuit Relay (needs block model)
No new env flag (Sean's ruling); Lens picker exposure + git revert are the safety.

## iPhone-X floors (host-enforced, from all three consults)
`env(safe-area-inset-bottom)` + ≥8px on every bottom bar · no primary action in the bottom 20px home-swipe zone · no horizontal gesture within 24px of screen edges · nothing tappable above ~500px from bottom except back · `font-variant-numeric: tabular-nums` on all numerals · keypad-open = active field pinned above the sheet via `visualViewport` (explicit harness test at 375×~400 effective) · Dynamic-Type 200% no-overflow check at 320px.

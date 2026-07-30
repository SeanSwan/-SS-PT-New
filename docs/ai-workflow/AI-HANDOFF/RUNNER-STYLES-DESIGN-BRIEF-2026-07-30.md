---
decision: "Session Runner visual refactor — 10 Lens-switchable Runner Styles on ONE headless engine; consult packet for Kimi/Sol/Opus"
status: open
supersedes: none
---

# SWAN SESSION RUNNER — 10 Lens-Switchable Styles (Design Brief + Consult Packet, 2026-07-30)

## Mission (Sean, 2026-07-30)
The workout logger's UX/UI is the product's daily heartbeat and today it reads as a long vertical stack of dense tables. Rebuild it as a **Session Runner** so beautiful it sells the app on sight — **ultra professional, ultra sleek, easy to use, easy to SEE, iPhone-X-class first (375×812, notch, one thumb)** — and ship not one design but **TEN, switchable in the Swan Lens theme changer, flawlessly.** The logic layer (safety gates, drafts, dictation, save) is done and must be reused untouched.

## Architecture law (non-negotiable)
- **ONE headless engine, TEN skins.** A `useSessionRunner` contract owns ALL behavior; each style is a presentation component consuming the same contract. Switching styles mid-workout must lose nothing (state lives in the engine).
- **Engine contract (actions/state every skin must surface):** exercises[] w/ per-set logged state · activeExercise/activeSet focus · logSet / editSet(weight,reps,rpe,tempo,rest,notes — progressive disclosure allowed) · addSet/removeSet · addExercise (opens the Rolodex surface) · removeExercise · rest timer (running/skip/±15s) · last-weight ghost + overload suggestion chips · plan context (week/day/assignment title) · draft state ("saved · 2s ago") · dictation strip + Coach dock (AI_* command family incl. rest_skip/rest_adjust/AI_ADD_EXERCISE, suggested-session panel on no-plan) · pain check-in (capture-only) · session stats (elapsed, total sets/volume) · Finish → canonical save → post-save handoff (celebration).
- **Swan Lens integration, two layers:** (1) the RUNNER STYLE itself is a Lens selection (persisted like palettes; style picker rendered inside the Swan Lens changer; per-operator, instant swap, lazy-loaded skins); (2) every skin consumes Lens tokens — `--world-accent` drives the active hue, world recipes may retint atmosphere — plus the Train state semantics (pending=dim Frost / active=Ice Wing-or-world / logged=earned gold / coach=Wing Purple). No skin may make a state color lie.
- **Host-fixed floors that survive EVERY skin:** 320px never breaks; ≥44px touch targets; essentials (Set# | Weight | Reps | Log) reachable in ≤1 gesture; WCAG 4.5:1; `prefers-reduced-motion` variant per skin; keypad ergonomics (the L2 numeric sheet) preserved; GPU-safe motion only; no nested interactive elements.
- **In-gym reality:** sweaty thumb, arm's-length glances, interrupted attention. Big tabular numerals (Fira Code), thumb-zone primary actions, glanceable "where am I" (NOW state) from 1 meter.

## Reference evidence (Mobbin, iOS)
[Runna in-workout](https://mobbin.com/screens/5f5c55bd-9cb8-4916-9e86-2953b6c6ca18) part banner + active-set outline + inline rest · [Bevel](https://mobbin.com/screens/59b85c49-2f5f-49e2-b220-04500be76db5) calm tables, top timer + Finish, completion toast · [Ladder HUD](https://mobbin.com/screens/d1169c75-4219-4bf1-aa2c-f5eb8fc0187a) full-bleed media, giant dial numerals, bottom exercise bar · [Ladder rest takeover](https://mobbin.com/screens/f17aa38b-027a-4a2b-85e7-f1e80d2e7270) whole-screen REST 0:30 · [Gymshark](https://mobbin.com/screens/d4306cc7-2f80-4648-8635-e2c8f4abac3d) card steppers w/ target-vs-previous · [Runna plan-part](https://mobbin.com/screens/b2e29f82-7935-4ca4-a79d-d9e5a3797442) upcoming context. SwanStudios executes all of these in Crystalline Swan; never template-copies.

## The 10 Runner Styles (draft — attack and improve)
1. **Focus Flow** — one exercise card at a time, everything else recedes to a progress rail; prev/next swipe; Bevel-calm. Signature: the active set breathes with a soft Ice-Wing pulse.
2. **Command Deck** — desktop two-pane (exercise rail + giant NOW panel); mobile = swipeable deck with peek edges. Signature: "NOW: SET 2 OF 3" hero numerals.
3. **Ladder Dense Pro** — the perfected single-column data table; one accent; fastest for power users. Signature: column-perfect tabular rhythm, zero chrome.
4. **Coach Voice-First** — the dictation strip is the hero input at the thumb; visual log renders as confirmations; Coach proposals inline. Signature: waveform-reactive Wing-Purple strip.
5. **World Immersion** — the Lens world IS the backdrop (parallax atmosphere layers); the runner floats as glass cards. Signature: logging a set sends a particle into the world.
6. **Ring Runner** — per-exercise completion rings + a session mega-ring filling as sets log; rest lives inside the ring. Signature: the ring "snaps" gold on exercise completion.
7. **Timeline Pulse** — the session is a vertical timeline; sets are pulses on the line; rest countdowns render BETWEEN pulses. Signature: the now-line scrolls with you.
8. **Sheet Stack (iOS-native)** — bottom-sheet ergonomics for everything (keypad, rolodex, coach, rest); map-app one-hand feel. Signature: detents that match thumb arcs.
9. **Split Zen** — one giant weight×reps numeral pair; tap-zones/gestures increment; for the between-sets glance. Signature: numerals fill the viewport width.
10. **Stadium HUD** — gamified chrome: XP ticker, streak flame, combo meter on consecutive logged sets, PR sirens in gold; Sora type. Signature: the combo meter.

## Rolodex upgrade (applies across skins)
Search & Add becomes a first-class surface per skin's idiom (bottom sheet on mobile / side drawer on desktop): media previews, NASM filters, familiarity + "recommended for this phase" chips, pain-excluded exercises visibly filtered with the reason, one-tap add w/ ghost pre-fill.

## Coach + hive-mind (applies across skins)
Dictation everywhere the skin's idiom allows; Coach dock docked per-skin; AI_ADD_EXERCISE/rest commands respected; suggested-session panel on no-plan; post-save handoff (celebration/proof/streak/share) is the universal finish; demo sandbox client works in every skin.

## Questions for consultants (answer ALL, ranked, concrete)
1. Attack the 10: which are weak/duplicative? Merge/replace with better directions (name + one-line signature).
2. Your top 3 for iPhone-X one-hand gym use — and the ONE you'd make the DEFAULT.
3. The headless-engine contract above: what's missing that a skin will need (state or action) that would force skin-level hacks?
4. Lens-switchable-skins architecture: sharpest risks (state loss on swap, focus/a11y, bundle cost of 10 lazy skins, test matrix explosion) and the mitigation you'd mandate.
5. iPhone-X-specific traps for EACH of your top 3 (safe-area, reachability, keypad overlap).
6. One missing 11th direction we haven't thought of.

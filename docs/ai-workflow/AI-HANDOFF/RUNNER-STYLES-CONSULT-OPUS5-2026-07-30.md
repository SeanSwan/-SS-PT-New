# Consult reply — Claude Opus 5 (anthropic/claude-opus-5) — 2026-07-30T05:45:56.548Z

> tokens: prompt=2997 completion=16000

# SwanStudios Session Runner — Adversarial Consult Response

**Headline verdict:** the architecture law is right, the skin list is ~60% right, and the engine contract as written will force skin-level hacks within the first week. The biggest unstated risk is not bundle size or state loss — it's that **10 equally-supported skins halves your feature velocity permanently.** I'll give you a way to ship all 10 in the Lens picker without paying that tax.

---

## 0. The reframe that makes 10 survivable (read this first)

You do not have 10 designs. You have **3 information architectures × N presentation recipes.** Sort them:

| Archetype (real IA) | What it is | Members from your list |
|---|---|---|
| **FOCUS** | one exercise at a time, session context reduced to a rail | Focus Flow, Split Zen, Stadium HUD, World Immersion, Command Deck (mobile) |
| **LEDGER** | whole session visible, scrolls, dense | Ladder Dense Pro, Timeline Pulse |
| **SHEET** | persistent context + detented overlays own all input | Sheet Stack, Coach Voice-First |
| *(not an archetype)* | atmosphere, chrome, numeral scale, motion signature, gamification overlay | World Immersion, Ring Runner, Stadium HUD |

**Mandate:** build **3 archetype shells** with named slots (`header`, `nowPanel`, `setRow`, `thumbBar`, `atmosphere`, `coachDock`, `ornament`). A "Runner Style" is then `{archetypeId, recipe}` — recipe = tokens + slot overrides + motion signature. 10 styles = 3 shells + 10 thin recipes, not 10 layouts.

Consequences: bundle drops from 10 chunks to 3 + JSON-ish recipes; the test matrix collapses to 3 layouts × conformance suite; a new engine feature reaches all 10 skins **by default** because it lands in a shell slot. Any skin that can't be expressed as `archetype + recipe` is a red flag that it's actually a *mode* (see Voice-First below), not a style.

Second mandate: **skin tiers.** Tier 1 (3 skins) = full SLA, visual-regression gated, ships in every release. Tier 2 (7) = "Swan Labs," badged in the Lens picker, may lag one release, auto-falls-back if it fails CI conformance. Instrument all 10 and kill or promote on data in 90 days. This is how you honor "ten, flawlessly" without lying to users about support depth.

---

## 1. Attack the 10 — merges, cuts, replacements

**Cut / demote (3):**

1. **Ring Runner — cut as a runner.** Rings are a *summary* device for continuous progress. Sets are discrete with n=3–5; a 33%-filled ring is strictly less legible at arm's length than `1/3`. You'd be inventing a worse numeral. **Keep the ring in two correct places:** (a) as the **rest timer** (rest *is* continuous — ring is right), (b) as the session mega-ring in the header/finish moment. Replace the slot with:
 → **Target Card** — *every set is a card showing target vs last time with ±steppers; 80% of sets log without ever opening the keypad.* Your own reference evidence (Gymshark) is the fastest sweaty-thumb input pattern in the market and **no skin in your 10 embodies it.** That's the single biggest gap in the list.

2. **Coach Voice-First — cut as a skin, promote to a mode.** Dictation is a host-fixed requirement in *every* skin; "the strip is bigger" is a mode, not a design. Also: gyms are 85dB, voice logging is socially awkward, and you'll eat the accuracy complaints. Keep the waveform-reactive Wing-Purple strip as a **Coach Mode expansion available in all 10.** Replace the slot with:
 → **Hands-Free Bar Mode** — *screen locked to giant numerals, logging by earbud tap / wake word only; zero touch, for when your hands are on the bar.* Same voice tech, a real use case, and it's the only skin that works with chalk on your hands.

3. **Command Deck — merge, don't cut.** On mobile it degenerates into Focus Flow with peek edges — that's not a second design, that's the same design with worse edges. **Keep the name as the wide-viewport (desktop/coach-tablet) presentation of the FOCUS archetype** and **delete the mobile peek-swipe deck.** Horizontal swipe on 375px collides with the iOS interactive-pop gesture, with per-row reveal actions, and with any horizontal stepper drag. One horizontal gesture per screen, max.

**Merge (1):**

4. **Timeline Pulse → LEDGER + "now-line" recipe.** The now-line and pulse markers are excellent *ornaments* on the ledger, and terrible as a dedicated rail: a 48px vertical timeline eats 13% of a 375px viewport, and inserting rest countdowns *between* items causes layout shift while a sweaty thumb is mid-tap. Collapse the rail to a 4px gutter with pulse markers; keep the scrolling now-line. Ship it as a named Tier-2 style built on the ledger shell.

**Rename (1):**

5. **"Ladder Dense Pro" → "Ledger Pro."** Do not ship a user-visible skin named after a competitor app. Same for anything Gymshark-derived. Cheap fix, real brand/legal smell.

**Constrain (2):**

6. **World Immersion** — highest legibility and battery risk in the set. Mandate: atmosphere layers are **forbidden behind any data glyph**; parallax lives in the top ~30% and the gutters, data sits on an opaque (not translucent) glass plate with a measured 4.5:1 against the *worst frame of the animation*, not the average. Auto-degrade on `prefers-reduced-motion`, `saveData`, low battery, or <60fps for 2s. The "particle into the world" on log is your best signature moment in the whole brief — keep it, but it must fire *after* durable local commit, never on tap.

7. **Stadium HUD** — your own brand law breaks here. Gold = *earned truth* (logged/PR). A **combo meter is not earned truth** — a combo is momentum. Combo must render in `--world-accent`; gold reserved for logged sets and genuine PRs. "PR sirens" in gold: fine. Also kill any sound-by-default; gyms have headphones.

8. **Split Zen** — keep, but it's really a *state* every skin should adopt at arm's length. Hard constraint: **tap-zone/gesture increments must never auto-commit.** Steppers stage a value; the Log button commits; a 5-second undo pill follows. Otherwise you will silently write garbage data and your coaches will lose trust in the ledger.

**Final 10 (archetype → style):**
FOCUS: Focus Flow · Split Zen · Stadium HUD · World Immersion · Command Deck *(wide-first)*
LEDGER: Ledger Pro · Timeline Pulse · **Target Card** *(new)*
SHEET: Sheet Stack · **Hands-Free Bar Mode** *(new)*

---

## 2. Top 3 for iPhone-X one-hand gym use — and the DEFAULT

1. **Sheet Stack** — best raw ergonomics on 812px. Everything that needs input arrives at the thumb; the keypad *is* the sheet, so nothing is ever occluded. Also the highest implementation risk (see §5).
2. **Focus Flow** — lowest cognitive load, best "where am I" at 1 meter, fewest ways to fail at 320px.
3. **Target Card** — fewest taps per set of anything in the list; the only skin where a normal working set costs one tap.

**DEFAULT: Focus Flow.**

Defense, since the obvious argument is for Sheet Stack: the default must be the skin with the **smallest failure surface** and the fastest legibility for a first-time user who has never seen the app — it's also your crash-fallback target (§4) and your screenshot. Sheet Stack's detent math depends on `visualViewport`, nested scroll arbitration, and multi-sheet stacking — three of the four hardest things in mobile web. Focus Flow borrows sheet ergonomics for the two surfaces that need it (L2 keypad, Rolodex) — which are host-fixed floors anyway — and gets 90% of the ergonomic win with 20% of the risk.

Secondary defaults: **Ledger Pro** for desktop/coach-on-floor, **Target Card** as the first thing you offer in onboarding ("log without typing").

---

## 3. Engine contract gaps that *will* force skin-level hacks

Ranked by how fast the hack appears. The top 5 will bite in week one.

1. **Stable IDs + revisions.** `setId` (not array index), `exerciseInstanceId`, `clientId` for offline idempotency, `rev` for optimistic edits. Without this, any skin that animates insert/reorder keys on index and corrupts drafts.
2. **Units & loadable increments.** `units: 'lb'|'kg'`, per-exercise `increment` (barbell 5 / dumbbell 2.5 / pin-stack 10), `availablePlates`, `roundToLoadable(w)`. **Target Card, Split Zen and Stadium HUD literally cannot exist** without this; absent it, every skin hardcodes `+5` and you ship a bug in kg markets.
3. **Prescription vs performance.** `target: {weight, reps, rpe, tempo, restSec}` separate from `actual`, plus `lastTime` and `compliance`. The brief only gives you "last-weight ghost." Target-vs-previous is the entire premise of the fastest input pattern *and* of coach review.
4. **Rest timer as an absolute deadline, not a number.** `restTimer: {status, endsAt: epochMs, durationMs, source}`. Countdown integers drift, break on background/foreground, and mean 10 skins produce 10 different remaining values. Also: **one engine-owned haptics/audio emitter.** If skins fire haptics, users get double buzzes when a skin re-mounts.
5. **Set kinds and grouping.** `kind: 'warmup'|'working'|'dropset'|'amrap'|'backoff'|'failure'`, `groupId` + `groupType: 'superset'|'circuit'`, `restOwner`. Supersets are gym reality; without grouping every skin invents its own visual hack and they'll disagree.
6. **Unilateral / per-side logging.** `unilateral: boolean`, `side: 'L'|'R'|'both'`. Your contract has no side field. This is a hack magnet.
7. **Focus/intent as engine state.** `focus: {exerciseId, setId, field}`, `requestFocus(target, reason)`, and — critically — **`advanceIntent()` owned by the engine.** Otherwise Focus Flow and Ledger Pro will disagree about what "next" means, and a skin swap mid-set lands the user in a different place.
8. **Validation + undo.** `validateSet(patch) → {level: 'ok'|'warn'|'block', code, message}` (±40% jump, 0 reps, pain-flagged movement) and `undo()` with a 5s window and `undoStack`. Gesture-increment skins are undeployable without both.
9. **Per-set sync truth.** `syncState: 'draft'|'committed'|'queued'|'synced'|'conflict'`. Direct brand-law issue: **gold must not appear before the set is durably committed locally**, or the earned-state color lies during a signal drop. Gold on local durable commit; a small cyan dot for cloud sync.
10. **Pause & interrupt.** `pauseSession/resumeSession`, `pausedSegments[]`, `lastInteractionAt`, `idlePrompt`. Elapsed time must exclude pauses or every coach report is a lie.
11. **Memoized derived selectors, engine-owned.** `elapsedMs`, `setsDone/setsTotal`, `volume`, `perExerciseProgress`, `nextUp`, `estRemainingMs`, `sessionPhase`. Ten skins recomputing volume = ten different totals in screenshots.
12. **Media policy.** `exercise.media {thumb, loopSrc, poster, orientation, durationMs}` + `mediaPolicy` (cellular/battery/reduced-motion degrade). World Immersion and Command Deck need full-bleed loops; the policy must be central.
13. **Pain data as filter input.** `painFlags[]` with `excludes: exerciseId[]` and a human `reason` string. The brief promises "filtered with the reason" — the reason string must originate here, not in Rolodex copy.
14. **Coach routing via skin capability declaration.** `skin.capabilities = {hasBottomDock, supportsInlineProposal, supportsWaveform, maxConcurrentSheets}`; the engine routes proposals to a declared slot. Otherwise all 10 skins re-implement proposal placement.
15. **One host-owned live region.** `announce(msg, politeness)`. Buys all 10 skins screen-reader parity for free.
16. **`instrument(event, payload)`.** Per-skin funnel: time-to-first-log, taps-per-set, undo rate, mis-tap rate, abandon point. This is your *exit strategy* — it's how you demote 6 skins later with evidence instead of opinion. Mandate it before skin #1 ships.
17. **Prefs at engine level, not skin CSS.** `prefs: {reducedMotion, density, glanceScale, haptics, sounds, handedness}`. `handedness` matters: right-thumb-biased rails are hostile to lefties, and it costs one token.

---

## 4. Lens-switchable skins — sharpest risks and mandated mitigations

**R1 — State loss / drift on swap.** *Mitigation:* engine provider mounted by the **route host**, above the skin boundary; skins are `({engine}) => JSX` pure presentational. Skins may hold only ephemeral UI state, and even that goes into `engine.viewState[skinId]` (scroll offset, detent index, expanded rows) so sheet position survives a swap. **Mandated test: the "swap-storm."** Script a full session; at every step, cycle all 10 skins and assert a deep hash of engine state is byte-identical. This test is the license to ship 10.

**R2 — Focus and screen-reader collapse on swap.** Unmounting the skin dumps focus to `<body>` and resets the SR cursor to the top of the document. *Mitigation:* host restores focus in `useLayoutEffect` after skin mount from `engine.focus`, plus a polite announcement: *"Focus Flow. Bench Press, set 2 of 3."* Hard rule: **swap is blocked while a numeric sheet holds a dirty value** — commit or discard first, explicitly, with a confirm.

**R3 — Bundle cost is not "10 chunks," it's 10× duplicated vendor.** Ten chunks each pulling framer-motion + a sheet lib + a charting lib is where the megabytes come from. *Mitigations:* (a) one shared `swan-motion` primitive module, all skins import from it; (b) **hard budget: ≤18KB gzip per skin, 0 new vendor deps without an ADR**; (c) CI bundle-diff gate that fails the PR; (d) prefetch only the selected skin + Focus Flow (the fallback); (e) atmosphere/particle modules dynamically imported only when a recipe requests them and only past `matchMedia` + battery + `saveData` guards.

**R4 — Test matrix explosion.** Do not write 10 × N specs. *Mitigation:* (i) test the **engine once, exhaustively** — model-based/state-machine tests, since it's headless; (ii) a **skin conformance suite**: one parametrized Playwright spec over all 10 skins asserting a fixed contract of stable roles/`data-swan-*` hooks — log a set at 320px and 375px, keypad never occludes the active field, all targets ≥44px, automated contrast audit on the three Train states, reduced-motion snapshot, swap preserves state, focus restored after swap, live region fires. Failing conformance = auto-demote to hidden in the Lens picker, don't block the release. (iii) Visual regression on **3 archetypes × 4 states**, not 10 × N.

**R5 — Feature rot across 10 surfaces.** *Mitigation:* features land in **archetype shell slots**, never in individual skins; a skin that opts out must declare it in its manifest and that shows as a badge in the picker. Plus the Tier 1/Labs policy from §0.

**R6 — State colors lying.** *Mitigation:* single `useTrainStateTokens()` source; skins choose *position and shape*, never color. **Lint rule: no raw hex, rgb, or hsl in any skin file.** CI-enforced.

**R7 — A skin crashes mid-set.** Turn the risk into a feature: per-skin error boundary that swaps to Focus Flow **with engine state intact** and toasts *"Switched to Focus Flow to protect your session."* Nothing is lost, ever. This is also your marketing line for the 10-skin architecture.

---

## 5. iPhone-X traps, per top-3 skin

**Sheet Stack**
- `100vh` is wrong on iOS Safari. Use `100dvh` **and** compute detents from `window.visualViewport.height`, never `innerHeight`.
- Home indicator: 34px bottom inset; the primary CTA must clear `env(safe-area-inset-bottom)`. **No primary action within ~20px of the bottom edge** (iOS home-swipe zone) and **no horizontal gesture in the bottom 40px**.
- Prefer the **existing custom L2 keypad inside the sheet** over the native numeric keyboard — the native keyboard resizes the viewport and re-runs your detent math mid-interaction. This is the #1 sheet bug in every fitness app.
- Nested scroll vs sheet drag: `overscroll-behavior: contain`; drag only from the grabber/header once inner scrollTop > 0.
- **Cap concurrent sheets at 2.** Three detents deep on 812px leaves ~200px of usable content. Coach dock and keypad must be mutually exclusive.
- Landscape (phone propped on a bench is a real gym posture): 44px lateral notch inset, and re-derive detents.

**Focus Flow**
- Horizontal prev/next swipe collides with the iOS interactive back gesture. **No swipe origin in the leftmost 24px**, or better: drop horizontal navigation entirely — make the progress rail tappable and put prev/next in the thumb bar. Pick one horizontal gesture for the screen; per-set reveal actions and card paging cannot coexist.
- Reachability: on 812px, the top ~180px is unreachable one-handed. Exercise title and timer up there are fine (read-only). **Nothing tappable above ~500px from the bottom** except a large back target. Rail taps go bottom or right edge, with a `handedness` mirror.
- The "breathing pulse": transform/opacity only, ≤8% opacity delta, ≥2s cycle, **paused while the rest timer runs** (two competing animations destroys glanceability), and off under reduced-motion. A perpetual animation adjacent to numerals measurably hurts read speed on OLED.
- One-card-at-a-time destroys "where am I" — a `next up` chip is mandatory, not decorative.
- 320px worst case: `"225 × 12 @ RPE 8.5"` — `clamp()` sizing, `font-variant-numeric: tabular-nums`, and verify no horizontal scroll at 320 with Dynamic Type at 200%.

**Target Card**
- Steppers: ≥44px each with ≥8px separation, or sweaty thumbs produce double-increments. Long-press repeat needs acceleration, a haptic tick per step, and a hard ceiling.
- **No commit on stepper change.** Stage → explicit Log → 5s undo pill. Auto-commit + gesture input = corrupted ledger.
- Card content (target vs last, steppers, RPE, notes) will push **Log** below the fold on 812px. Log must be pinned in the thumb bar, *outside* the scrolling card.
- Rounding must go through `roundToLoadable()` or you'll offer 47.5 lb on a pin-stack machine.
- At 320px, collapse the two-column stepper row to stacked; never shrink a target below 44px to preserve columns.

---

## 6. The missing 11th direction

**Duet — the Two-Body Runner.** *Trainer and client on the same live session; the coach's device drives, the client's follows; either can log, and the coach's attention appears as a Wing-Purple halo on the set you should be doing right now.*

This is the one direction no consumer app can copy, because they have no coach. You are a **personal-training** SaaS — the on-floor session is literally two humans and two phones, and every one of your 10 skins currently assumes one. Duet gives you: real-time coach cueing, "coach adjusted your load to 185" as a Wing-Purple proposal on the client's screen, tempo/RPE corrections in the moment, and remote coaching as the same code path. It's also the highest-value demo in a sales call, and it reuses your existing AI_* proposal pipeline (a human coach is just another proposal source).

Runner-up if Duet is too big for this cycle: **Ghost Rival** — *your previous session runs beside you as a translucent ghost, set by set; you're racing your past self.* Zero new data (you already have last-weight), pure retention, and it drops straight into the FOCUS shell as a

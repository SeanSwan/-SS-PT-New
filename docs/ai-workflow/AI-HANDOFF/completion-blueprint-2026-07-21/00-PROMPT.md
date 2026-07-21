# KIMI — FORGE THE BUILD BLUEPRINT: SwanStudios Workout-Completion → Progress-Proof → Next-Action

**Date:** 2026-07-21 · **Architect:** Kimi · **Builder:** any competent AI/dev with ZERO other context.
**Deliverable:** a complete, buildable blueprint — mermaid flowchart + sequence + component tree, ASCII
wireframes at 320/414/desktop, a file-by-file build order with EXACT Swan tokens/components per element,
all four states, and executable per-slice acceptance criteria. Comprehensive enough that the builder makes
NO design decisions — you make them all. This is fable-blueprint-forge: the plan kills vibe-coding.

**Design-only. No code from you** unless a signature/prop shape is genuinely ambiguous without it.

---

## 0. WHAT THIS SCREEN IS

The moment a SwanStudios client finishes and SAVES a workout. Today an XP celebration overlay fires
(`PostWorkoutCelebration.tsx`, §3 — a HARD CONSTRAINT). Sean has now accepted 6 evidence-backed design
principles (§1), harvested from real shipped fitness apps via a governed Mobbin pilot, that describe a
richer completion experience: a branded **proof artifact**, named congrats, a next-goal hook, and a path
into progress. Your job: forge the blueprint that evolves the completion moment to embody all 6 principles
**in the real Crystalline Swan design system (§4/§5)**, without breaking the live XP celebration.

This is the emotional peak of the Product Core Loop: **log the workout → turn it into progress proof →
decide the next training action → make milestones shareable.** The completion screen is where "proof" and
"next action" and "shareable" all converge.

---

## 1. THE 6 ACCEPTED PRINCIPLES (evidence — human-adjudicated, now Swan doctrine-adjacent)

Each is a convergence claim: a principle observed across independent shipped products, accepted by Sean.
The **real observations** (what the apps actually did) are quoted so you design from behavior, not abstraction.

**P1 — CLM-43f6 · HIGH (5 products: Hevy, Fitplan, Runna, Fitbit, Centr)**
*"Completion renders a branded shareable stat card over brand art or user photo with one-tap share paths —
a proof artifact, not a plain confirmation."*
- Hevy: "Nice work! This is your 1st workout" + confetti; dominant element is a branded stat card
  (Duration 1h 5min · Volume 1740 kg · Sets 17) over the user's gym photo with logo + username; labeled
  share row (Stories, Copy Text, Workout Link, FB); single Done.
- Fitplan: hero card "Just crushed Day 1 — Upper-Body Power" + 3 stat chips; card carousel (alternate
  designs); Share-to-Feed toggle + full-width SHARE MY WORKOUT.
- Runna: editable share card (route map + Distance/Pace/Time/HR slots), "Tap card to edit", card carousel,
  destination row (Story/Community/iMessage/…), Save-to-device primary.
- Fitbit: dark branded card, three GOAL-RELATIVE stats (+77 of 2,325 steps) — contribution toward daily
  goals, not absolutes; card variant chips (Impact / Photo / Heart Rate).
- Centr: full-bleed trainer photo, checkmark badge, "Today's goals? Smashed, Alex!", program context line,
  total time, ADD SELFIE + SHARE as the two actions.

**P2 — CLM-b212 · MED (Centr, Strava, Hevy)**
*"Milestones and records trigger named personalized congratulations copy rather than generic success text."*
Centr "Smashed, Alex!"; Strava "Congrats! You just set your PR in the 1K"; Hevy "Congrats on a great month
{username} 👏".

**P3 — CLM-9d9c · MED (Ladder, Open)**
*"The completion screen surfaces streak or next-goal progress with an explicit prompt toward the next
workout, converting the finish moment into the next commitment."*
Ladder: "WORKOUT COMPLETE" medallion, then a Weekly Streak module "Complete 2 more workouts!" with a
3-segment progress bar, directly below the celebration. Open: streak stats (Day Streak / Best Streak /
Minutes) ARE the summary.

**P4 — CLM-f54a · MED (Strava, Hevy, Tempo)**
*"Progress surfaces lead with current-period truth then layer longer-horizon trends from week to
year-to-date to all-time."* (Relevant to the "see progress" CTA target the completion screen links into.)

**P5 — CLM-b7e2 · MED (Hevy, Tempo)**
*"Monthly reports visualize training balance on the body via muscle distribution radar or heat map as
physical proof of coverage."* (Relevant to what the "view progress" path can promise.)

**P6 — CLM-92f0 · MED (Strava, Tempo)**
*"Future insight is teased but gated on logging volume, making continued logging the price of unlocking
predictions and achievements."* (e.g. "Log 5 workouts to unlock your trend" — a next-action motivator.)

**Weighting:** P1 (HIGH, 5 products) is the spine of THIS screen. P2/P3 are on-screen. P4/P5/P6 shape the
"see full progress" destination and the next-action copy — design the HOOK to them here, not the full
progress surface (that is a separate future blueprint). Every principle you apply, cite by CLM id.

**Anti-clone rule (non-negotiable):** these are PRINCIPLES, not layouts to copy. "Hevy taught P1; Swan
applies it through [C-pattern] with [tokens] and OUR product story." Never reproduce a named app's exact
composition, copy, or choreography. No fake metrics — real logged data only (data-truth rule).

---

## 2. PRODUCT + DATA REALITY (build against this, not hypotheticals)

- **Stack:** React 18 + TypeScript + styled-components. **NO MUI, NO Tailwind** (rule 1). Charts = Victory
  only (rule 10). 300-line file cap (rule 4); blueprint header on components >100 lines (rule 5). `css``
  helper for any interpolated shared style fragment (rule 43).
- **Trigger:** fires after a workout is SAVED. Backend persists via `WorkoutSession` + `WorkoutLog`
  (`backend/services/workout/workoutLogService.mjs` — `logWorkoutForClient` → `WorkoutSession.create` +
  `WorkoutLog.bulkCreate` in a transaction). Real stats (duration, total volume, set count, exercises)
  come from the just-saved session. [VERIFIED shipped]
- **Data available at completion:** session duration, exercises[], sets/reps/weight per exercise, total
  volume, PR flags (if the logger computes them), the client's streak, and their program/next-session
  context. Assume a props contract the completion component receives; SPECIFY it explicitly (you decide the
  shape) so the builder wires the backend to it.
- **Gamification exists:** XP, levels, achievements, streaks (the existing overlay uses these). Rarity
  tiers: Common=Swan Lavender, Rare=Gilded Fern, Epic=Wing Purple, Legendary=animated gradient.
- **Zero PII to any external surface**; share targets are the client's own OS share sheet / in-app
  community — never an auto-post.

---

## 3. ⚠ THE HARD CONSTRAINT — `PostWorkoutCelebration.tsx` ALREADY EXISTS

`frontend/src/components/Celebrations/PostWorkoutCelebration.tsx` — **321 lines, already AT the 300-line
cap, live and tested** (XPCounter.test.tsx exists). It is a full-screen overlay:
- Props: `{ xpEarned, previousXP, newXP, surpriseMultiplier?, levelUp?, achievementUnlocked?, onDismiss }`
- Phases: `enter → counting → badges → idle`; children: `XPCounter`, `SurpriseMultiplierBadge`,
  `LevelUpGlow`, `AchievementBadge`. Dismisses on tap / 5s auto / Escape. Built on the **Peak-End Rule**.
- Siblings in `Celebrations/`: `CelebrationPortal`, `CelebrationToggles`, `ComebackBanner`, `XPCounter`.

**You MUST rule on the architecture (this is the single most important decision in the blueprint):**
Does the new proof/share/next-action surface (a) get folded INTO PostWorkoutCelebration (it's already at
the line cap — so this likely means extracting phases into child components), (b) become a NEW component
the celebration transitions into (overlay dismiss → a `WorkoutProofCard` / completion screen), or (c) a
restructure where the celebration becomes phase 1 of a multi-phase completion flow? Decide, justify against
the 300-line cap and the live/tested constraint, and specify the exact seam (what fires the transition,
what state carries across). **Do not break the XP celebration.**

---

## 4. THE REAL SWAN DESIGN SYSTEM (Sean's choice: use real tokens + C1–C12, not neutral wireframes)

**Tokens** (always `var(--token, #hex)`): `--midnight-sapphire #002060` (primary button bg) ·
`--royal-depth #003080` (elevated card surface) · `--ice-wing #60C0F0` (cyan glow, XP bars, success) ·
`--arctic-cyan #50A0F0` (**DATA/charts ONLY — never buttons/glow**) · `--gilded-fern #C6A84B` (luxury gold,
deltas, PR/rare-tier) · `--frost-white #E0ECF4` (text) · `--swan-lavender #4070C0` (tertiary, common-tier) ·
`--wing-purple #8B5CF6` (glow accent, purple buttons, epic-tier) · `--obsidian-black #0A0A0F` (page bg) ·
`--carbon #141419` (card dark) · `--graphite #1A1A24` (modal/drawer surface). Base bg fallback
`var(--bg-base, #030712)`.

**Dual-Button Glow (mandatory):** blue bg (sapphire/royal) → **Wing Purple** glow + focus ring; purple bg
(wing purple) → **Ice Wing** glow + focus ring.

**Typography:** Plus Jakarta Sans (headings/UI) · Cormorant Garamond Italic (drama — one beat per section,
e.g. the congrats line or empty-state prose) · Fira Code (stat VALUES — the completion numbers, 28–48px+ ·
tabular) · Sora (gaming/uppercase micro-labels, button labels on gaming surfaces).

**Success semantic = Ice Wing, NOT green** (Swan celebrates in ice-cyan). Danger `#E5484D` only for
destructive — not present on this screen.

**Components you'll compose (components.md C-index):** GlowButton (§10, the share/done/see-progress CTAs) ·
data card / SheenCard (§9 — is the proof card a SheenCard-family "sell/showcase" surface? it's meant to be
shared/celebrated → likely YES, full C12 sapphire/luxury glass + chrome + sheen, the one place motion is
earned) · Metric pill (§3, the stat chips) · Stat ticker (§4, C9 — the count-up values; the XP counter is
already this family) · Chart panel (§5, C11 — only if you put a mini-trend on-screen; the full charts live
at the "see progress" destination) · Toast (§15, the "saved / shared" confirmation) · Empty/loading/error
states (§22 — a workout with zero logged sets, a save still in flight, a save that failed).

**Motion:** 3 tiers (ambient/response/narrative), transform+opacity only, reduced-motion gated in BOTH CSS
and JS, ONE signature moment (the proof-card reveal / the count-up — pick one as the beat, keep the rest
calm). 44px min targets; WCAG 4.5:1; focus-visible rings; focus returns to trigger on any modal close.

**Dashboard narrative arc B2.2:** Orientation → Current state → Insight → **Next best action**. The
completion screen is a compressed version: celebrate (orientation) → proof card (current state) → streak/
next-goal (insight) → "start next" / "see progress" (next action). End on the next action (P3).

---

## 5. REQUIRED BLUEPRINT OUTPUT (produce ALL of it)

1. **BUILD SUMMARY** (≤15 lines) — the architecture decision (§3), the component tree, the slice count, the
   one signature motion moment.
2. **ARCHITECTURE RULING** (§3) — enhance / new-sibling / restructure, justified; the exact transition seam
   and carried state; how the live XP celebration is preserved.
3. **MERMAID — component tree** (`graph TD`): the completion flow's components and their parent/child edges,
   including the existing PostWorkoutCelebration and its children.
4. **MERMAID — sequence diagram**: workout save → completion trigger → celebration → proof card → share /
   next-action, across actor · frontend component · workout API · gamification. Show where real data loads.
5. **MERMAID — state/flow** (`stateDiagram-v2` or flowchart): the phases the client moves through and every
   branch (PR earned? level-up? streak milestone? save failed? zero sets logged?).
6. **ASCII WIREFRAMES** at **320px, 414px, and desktop** — the proof-card completion screen: congrats line,
   the branded stat card (what's on it, hierarchy), stat chips, streak/next-goal module, the action row
   (share · see progress · start next / done). Show the thumb-zone CTA placement on mobile.
7. **THE PROOF CARD SPEC** — the P1 spine: exact anatomy (surface recipe, which C12 baseline, chrome, the
   stats shown and their token/typography per element), what's shareable, and the anti-clone note (principle
   → Swan expression). Real data only; name the empty/loading/error variants.
8. **PROPS CONTRACT** — the exact TypeScript prop shape the completion surface receives (you decide it),
   mapped to the backend `WorkoutSession`/`WorkoutLog` fields so the builder can wire it.
9. **FILE-BY-FILE BUILD ORDER** — each new/changed file (path, ~line count, one-line purpose), respecting
   the 300-line cap and the `Celebrations/` location; ordered slices, each with a concrete acceptance test
   and a stop condition. Small first slice that delivers value alone.
10. **TOKENS/COMPONENTS PER ELEMENT** — a table: element → Swan component (C#) → exact tokens → typography →
    state behavior. No neutral boxes; every element names its real token.
11. **STATES** (§22, all four) — empty (workout with no sets / not enough to celebrate), loading (save in
    flight), error (save failed — never a dead end), success (the happy celebration).
12. **RESPONSIVE + A11Y + MOTION** acceptance: the 320/414/desktop checks, focus order + restoration,
    reduced-motion behavior of the signature moment, 44px targets, contrast.
13. **"DO NOT" LIST** — the specific traps for THIS screen (Arctic Cyan on a button; green success; fake/
    mock stats; cloning Hevy's/Centr's exact layout; auto-posting to a feed; a second modal over the
    celebration; breaking the XP overlay; exceeding the line cap).
14. **OPEN QUESTIONS for Sean** — anything a builder would otherwise guess (e.g. does Swan compute PRs
    today? is there an in-app community feed to share INTO, or only OS share sheet? one paragraph max).

Tag non-obvious claims `[VERIFIED]`/`[LIKELY]`/`[HYPOTHESIS]`/`[UNKNOWN]`. Be decisive and concrete — the
builder makes zero design decisions. Optimize for Sean's standing mandate: fewest taps to share and to start
the next action (P3), least reading, phone-first. If the honest answer to §3 is "new sibling, and here's the
20-line seam," say exactly that. Completeness beats brevity — a builder with zero context executes from this
document alone.

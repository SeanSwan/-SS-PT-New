---
title: Bootcamp Brain V2 — real-floor truth, Swan/Heart signals, true-burnout, overflow, room model, games
owner: Sean (Move Fitness / SwanStudios)
status: open
decision: pending — Kimi K3 + HY3 review requested
supersedes: none
originating_model: claude-opus-5
created: 2026-08-10
privacy: IDs/roles only; no client PII
---

# Bootcamp Brain V2 — Master Prompt

## 0. The one-line mission

Teach the Swan Coach bootcamp brain **how Move Fitness actually trains today**, then make the
class generator smarter than it is — without rebuilding what already works.

**This is an ENHANCEMENT brief, not a greenfield build.** The audit below proves most of the
foundation exists. Any proposal that rebuilds an existing subsystem must justify why extension
fails first.

---

## 1. Ground truth — what already exists (audited 2026-08-10, file:line verified)

`backend/services/bootcamp/` = **4,239 lines across 18 modules.**

| Capability | Where | State |
|---|---|---|
| Class generation | `bootcampGenerator.mjs` (965 L) | live (⚠ 3.2× the 300-line cap) |
| 12 class **styles** | `BootcampTemplate.mjs:18-21` — `standard, pyramid, superset, mixed, ladder, descending, chipper, countdown, death_by, ygig, contrast, density` | live |
| 37 class **formats** | `BootcampTemplate.mjs:8-16` — incl. `amrap, emom, tabata, circuit, partner, hybrid, custom`, plus `<stations>x<exercises>_r<rounds>` | live |
| Equipment gating | `bootcampGenerator.mjs:288-321` | live, **fail-closed** |
| Equipment quantity vs headcount | `bootcampCapacity.mjs` | live |
| Small-class collapse | `collapseStationCountForParticipants()` | live |
| Pain-aware exercise gating | `painAwareGating.mjs` (185 L) reads `ClientPainEntry` | live, ⚠ see §7 drift |
| Rolodex bridge | `exerciseRolodexBridge.mjs` (254 L) | live |
| Canonical exercise FK | `BootcampExercise.exerciseLibraryId` → `Exercises.id` | live |
| Drop-set / pyramid fields | `BootcampExercise.pyramidStartWeight`, `pyramidDrops` | live |
| Superset grouping | `supersetOrder`, `supersetGroupId` | live |
| Per-joint contraindications | `kneeMod, shoulderMod, ankleMod, wristMod, elbowMod, footMod, hipMod, backMod` | live |
| Difficulty variations | `easyVariation, mediumVariation, hardVariation` | live |
| High-impact classifier | `bootcampFinishers.mjs:42` — `['jump','burpee','hop','bound','tuck','star']` | live |
| Equipment inventory + AI photo scan | `Equipment, EquipmentItem, EquipmentProfile, EquipmentExerciseMap, ExerciseEquipment, EquipmentScanSession, EquipmentScanCandidate` | live |
| Client signals available | `ClientOnboardingQuestionnaire, ClientOnboardingCoverageItem, ClientPainEntry, PainEntryCorrectiveExercise, ClientProgress, ClientBaselineMeasurements, BodyMeasurement, DailyWorkoutForm, WorkoutLog, WorkoutPlan, ProgressData, Goal` | live |

**Three reserved holes already exist for the features Sean is asking for:**
1. `WorkoutLoggerTypes.ts:390` — `favorites: boolean` filter slot, **zero consumers** (dormant).
2. `bootcampChips.mjs:31` — `coach_favorite` chip **blocked pending "the preference model"**.
3. `GoalLike.mjs` — proven reaction pattern: `(goalId, userId, reactionType)` unique composite.

---

## 2. How Move Fitness actually trains (Sean, 2026-08-10)

**Space.** A separate open-floor studio, roughly square. Fits ~14; **16 fits but "feels tight —
you start feeling the heat, the breath."** The machine room is a *different room* — its equipment
must not be programmed into studio classes.

**Studio equipment.** Barbells · dumbbells · **kettlebells (many)** · cable machines · TRX ·
sliders · resistance bands · medicine + rubber slam balls · **weighted push sled/prowler** ·
**landmine (emphasized)** · stability balls · spin bikes.

**Structure.** 4–5 stations typical, 6 rare. ~4 people per station, **all working simultaneously**
(so every station exercise must support 4 concurrent users). Exercises-per-station scales
*inversely* with station count: 4–5 stations → 3–4 exercises; >5 → ~2; 6 → 2–3.

**Two formats in real use:**
- **A — short-interval circuit.** ~35s avg / 40s max / "usually 50s"; 3–4 exercises per station;
  3 rounds; ~5 stations.
- **B — AMRAP + full drop set (Sean's signature; must be supported).** **1:40 per exercise**;
  three exercises = one round.

**The drop-set protocol.** Start heavy (strength/power) → at failure drop ~half (80→40, 40→20) →
push to burnout → descend to 5–10 lb → **final ultra-light set ~20 reps at FULL range of
motion**; ridiculously light ≈ 10–12 reps. **No rest between drops.** Full ROM is deliberately
saved for *after* the muscle is fatigued. Sean's own example: leg extension, 250–300 lb, ~20 lb
per drop, AMRAP each, until "popping out fast ones" — *that is real failure.*

**THE GOVERNING DOCTRINE.** *"I'm trying to make these classes so that even if people are
half-assing it, they still hit failure."* **Treat this as an acceptance criterion for every
generated class, not as flavor text.** A format that lets low effort hide is a failed format.

**Style openness.** Do NOT hardcode Sean's style. Keep the system multi-style; he pulls from
everything, including **safe** CrossFit-derived movements — high-impact filtered, intense kept.

---

## 3. What to build

### 3.1 Swan + Heart + Usage — three signals, never conflated
- **Swan** — trainer-only, global. "This is a staple." Steers all generation. Rendered as the
  Swan logo acting as the like button (Sean's explicit design ask).
- **Heart** — per-user, private favorite. Steers only that user's own workouts.
- **Usage frequency** — *derived*, never stored as an opinion: count placements via
  `BootcampExercise.exerciseLibraryId`. **Must report coverage** ("counted N of M; X unlinked"),
  because NULL-FK rows silently drop out of any tally.

**Model (mirror `GoalLike`, Rule 18):** one `ExerciseReaction` — `exerciseId`, `userId`,
`reactionType ∈ {swan, heart}`, unique composite index `(exerciseId, userId, reactionType)` for
free idempotent toggling. Trainer-only `swan` enforced at the **route/role layer**, not schema.
Wire the dormant `favorites` filter slot; unblock the `coach_favorite` chip.

**Selection weighting must stay evidence-first.** Swans and Hearts are *tie-breakers and
tone*, never the primary driver. Primary drivers remain: client onboarding, pain entries,
prior workouts/logs, progress data, equipment feasibility, and space. A high Swan count must
never override a pain contraindication or an equipment/space infeasibility.

### 3.2 True-burnout mode (Sean's "real burnout" toggle)
An exercise-level switch: when on, the movement runs a **real strip-set to failure** instead of a
timed interval. **Eligibility auto-detected from equipment strip-speed:**

| Strip speed | Studio equipment | Rationale |
|---|---|---|
| Fastest | **cable machines** (pin stack) | pin move = instant drop — his true selectorized burnout |
| Fast | **kettlebells**, **dumbbells** | drop to next pair — **only if the rack is AT the station** |
| Near-instant | **bands** | swap band or change stance distance |
| Slow | barbell, sled, landmine | stripping plates costs hands and time |
| N/A | bodyweight, TRX, sliders, stability ball, spin bike | load is not shed — use tempo/leverage/variation |

Equipment tokens are free-text (`Exercise.equipmentNeeded` = JSON array); normalize through the
existing `addEquipmentToken()` path (`bootcampCapacity.mjs:11`). **Unknown token → conservative
default (not eligible).**

### 3.3 Overflow capacity — CONFIRMED GAP
`bootcampCapacity.mjs` can only **shrink** (`collapseStationCountForParticipants`). There is **no
expand/split/overflow path.** Sean explicitly wants a backup plan built into the creator.
Candidate strategies to evaluate: add a station (if counts allow) · two waves/heats at one
station · in-station pairing (work/rest alternation) · substitute for a higher-concurrency
exercise (bodyweight/band) · or **refuse honestly and name the bottleneck station**.
**Honest refusal must be a first-class outcome, not a fallback to a bad class.**

### 3.4 Room / space model — ⚠ RETRACTED: IT ALREADY EXISTS AND IS WIRED

**MY CLAIM THAT NO SPATIAL MODEL EXISTS WAS FALSE (corrected 2026-08-10).** I grepped
`roomWidth|roomLength|floorSpace|squareFeet|dimensions|obstacle|roomSize` across
`backend/models/` — none of which match the real field name `totalAreaSqft`. Too-narrow
search, false absence. **Kimi K3 answered Q1/Q2 on this bad premise; its 'build the Room
entity / add nullable columns to EquipmentProfile' recommendation is therefore void as
written** — the dedicated entity already exists.

`BootcampSpaceProfile` (`backend/models/BootcampSpaceProfile.mjs`) already carries:
`totalAreaSqft`, `maxStations`, `maxPerStation`, `layoutData` (JSONB), `mediaUrls` (JSONB),
`hasOutdoorAccess`, `outdoorDescription`, `locationName`, `notes`.

It is **wired, not dormant**: the generator loads it and ENFORCES `maxStations`
(`bootcampGenerator.mjs:549-556`); the route creates/updates it
(`bootcampRoutes.mjs:313-325`) with **`maxPerStation` defaulting to 4** — Sean’s number;
Swan Coach chat already surfaces it (`aiChatService.mjs:1478,1514`).

**So the real work is EXTEND + SURFACE, not build:**
- present: area, max stations, max per station, photos, outdoor access, free-form `layoutData`
- genuinely missing: explicit **obstacles** (could live in `layoutData`), **ceiling height**,
  and **lane availability** (Kimi’s `lane_required` / `overhead_clearance` / `swing_radius` /
  `bailout_clearance` tags) — plus the exercise-side spatial requirement tags to match against
- `maxPerStation` is not enforced anywhere in generation (only defaulted at the route) —
  that is a real gap and it is exactly Sean’s ~4-per-station constraint

Kimi’s SUBSTANCE still stands where it is premise-independent: gate by **tag-set membership,
not polygons**; stop after area/lane/ceiling checks; never simulate travel distance.

### 3.4b Original (now-corrected) framing
No spatial modeling exists anywhere (`roomWidth|roomLength|floorSpace|squareFeet|dimensions|
obstacle|roomSize` across `backend/models/` → nothing relevant). Sean wants room measurements +
obstacles captured so the AI knows the space and what is in the way.

This is the **missing third constraint**. Today the generator reasons about equipment and
headcount only — it cannot reason about floor area per person, travel distance between stations,
or fixed obstacles. That is why a sled (needs a long clear lane) or slam balls (need overhead +
rebound clearance) can be programmed into a room that cannot host them.

**Proposed:** extend `EquipmentProfile` (already the room-ish entity: `name`, `locationType`,
`address`) with dimensions + obstacle list — rather than a parallel Room model.
**→ EXPLICIT QUESTION FOR KIMI (§8).**

### 3.5 Games & fun formats
Research + the Move Fitness filter live in
`docs/ai-workflow/brainstorms/bootcamp-rolodex-swans-hearts-2026-08-10.md`. Headline: **most
standard bootcamp games fail here** on space (tight square) or on doctrine (**elimination and
turn-taking games reward losing with rest** — the inverse of "half-assing still hits failure").

Survivors: countdown ladder · death-by · team AMRAP · chipper · dice/randomizer · song-based.
**Four of those are already enum values** (`countdown`, `death_by`, `chipper`, `ladder`, `amrap`)
— so much of "add games" is **naming and surfacing**, not engine work.
Genuinely new primitives: **team scoring** (shared per-station tally) and the **randomizer**.
**→ KIMI IS ASKED TO GENERATE ADDITIONAL GAME OPTIONS (§8).**

---

## 4. Smart selection — the non-negotiable

Sean: *"AI is still supposed to be doing things in a way where it's not random, but it's smart."*

Selection must be **explainable and evidence-ordered**:
1. **Hard gates (never overridden):** pain contraindications · equipment availability for the
   *correct room profile* · equipment quantity for headcount · space feasibility (once §3.4
   lands) · high-impact filter where indicated.
2. **Fit:** client onboarding goals, progress data, prior logged workouts, day-type contract,
   muscle-region balance.
3. **Preference/tone (tie-breakers only):** Swans, Hearts, usage frequency, recency/variety.

Every selected exercise already carries a `selectionReason` (`bootcampGenerator.mjs:152-154`) —
**extend that, so every pick can explain itself.** "Smart, not random" must be *auditable*, not
asserted.

---

## 5. Slices (independently shippable)

1. **Studio equipment profile + creator UX** — scope classes to the room. Likely fixes the
   wrong-equipment complaint with zero engine change. *(config + UX)*
2. **`ExerciseReaction` model + routes** — Swan/Heart, trainer-gated Swan, wire the dormant
   `favorites` filter, unblock `coach_favorite`.
3. **Swan/Heart UI on the Rolodex** — Swan logo as like button + heart. *(HY3 design review)*
4. **Usage-frequency derivation + coverage reporting.**
5. **True-burnout mode** — strip-speed classification + generator support for Format B (1:40 AMRAP
   + drop ladder).
6. **Overflow strategies** — expand/split/pair/substitute/refuse, with honest refusal.
7. **Room model** — dimensions + obstacles on `EquipmentProfile`, fed into feasibility.
8. **Games surfacing + team scoring + randomizer.**
9. **Format-enum gap** — add `5x4_r3` / `4x4_r3` (§7).

---

## 6. Hard constraints

Zero PII to any model (IDs/roles only) · styled-components, no MUI · 44px touch targets ·
dark-first with `var(--token, #fallback)` · Victory for charts · ≤300 lines per file ·
`prefers-reduced-motion` respected · WCAG 4.5:1 · mobile checked at 320/375/414 ·
`bootcampGenerator.mjs` is already over the line cap — **do not grow it; extract.**

---

## 7. Known defects & unproven leads (do not "fix" blind)

- **[VERIFIED] Format-enum gap.** No `5x4_r3` or `4x4_r3`; `5x4_r1` exists. Sean's most common
  class (5 stations × 4 exercises × 3 rounds) is **not expressible** — generation would silently
  round him to a class he does not teach.
- **~~[VERIFIED] Two drift fossils documenting live defects~~ — RETRACTED 2026-08-10. THIS WAS MY
  ERROR. The pain gate is REPAIRED, TESTED, AND WORKING.**
  Both comments are **historical repair notes**, not live-defect markers:
  - `painAwareGating.mjs:14-20` is a `WHY THIS FILE EXISTS` docblock describing the bug in the
    **PREVIOUS inline version inside bootcampGenerator** — this file was created to fix it.
    It names the audit (*"Verified in the 2026-07-12 Cortex directive audit + triangle review"*)
    and the covering test.
  - `bootcampGenerator.mjs:738-742` says Step 9b **"repairs the dead `status: 'active'` query…
    and the wrong createdById roster semantics."** Repair language, not defect language.
  - **The live code is careful and fail-VISIBLE** (`painAwareGating.mjs:60-92`): it loads the real
    roster via `loadRosterClientIds(trainerId)`, gates on `painWhere.userId = { [Op.in]:
    rosterClientIds }`, uses the **correct `isActive`** column, and on an EMPTY roster it does not
    silently pass — it pushes a `pain_gate_roster_empty` explanation stating the class *"was not
    checked against any participant's pain report."* The `createdById` at :84 is a **documented,
    honestly-labeled fallback** for when the assignment model is unavailable
    (*"across trainer-authored pain entries (client roster unavailable)"*), not the old bug.
  - **PROOF: `npx vitest run tests/unit/bootcampPainGating.test.mjs` → 10/10 pass.**
    (It is a **vitest** test — `node --test` reports a false failure because `vi.mock` is
    unavailable there. My first two runs used the wrong runner.)
  - **⚠ CONSEQUENCE FOR REVIEWERS:** the Kimi K3 review of this document escalated this section to
    "Slice 0, ahead of everything," calling the safety gate *"unverified and possibly inert"* and
    *"protecting nobody."* **That conclusion is void — it was reasoning correctly from my false
    premise.** Do not reorder the roadmap around it. Every other Kimi finding stands on its own
    evidence and is adopted below.
- **[LIKELY, not proven] Wrong-equipment root cause = profile selection**, not code. The code path
  is correct and fail-closed. Needs a live read of which profile Sean's classes use.
- **[HYPOTHESIS, do NOT fix on this]** `bootcampGenerator.mjs:144-147` —
  `if (budgeted.length > 0) candidates = budgeted;` silently drops the gate when nothing passes.
  Real permissive degradation, but equipment is filtered upstream, so it is **not** the equipment
  bug. Probe what gate it governs first (Rule 55).
- **[VERIFIED] `bootcampGenerator.mjs` = 965 lines** vs the 300 cap. Flag only; cleanup is a
  separate pass (Rule 37).

---

## 8. Explicit questions for the reviewers

**For Kimi K3 (highest effort):**
1. **Room model abstraction.** Extend `EquipmentProfile` with dimensions + obstacles, or introduce
   a first-class `Room` entity owning N equipment profiles? Which survives multi-location growth?
   What is the minimum viable spatial representation that meaningfully improves selection —
   area alone? area + ceiling + obstacle polygons? a simple "lane available y/n" flag?
2. **How should space enter selection** without becoming a fake-precision simulator? What is the
   honest floor of usefulness here?
3. **Games — critique AND generate.** Is the doctrine filter correct (do elimination games really
   violate "half-assing still hits failure")? **Propose additional game/fun formats** that fit a
   tight square room, 4–5 stations, ~4 per station all working at once, Sean's equipment, and the
   failure doctrine. Sean explicitly wants your options here.
4. **Signal weighting.** Is "Swans/Hearts as tie-breakers only" right, or should endorsement carry
   more weight? How do we prevent a popular-exercise monoculture over time?
5. **Overflow.** Which strategy set, in what precedence order? Is honest refusal acceptable UX?
6. **True-burnout.** Is equipment strip-speed the right eligibility axis? What is missed?

**For HY3 (design):**
- Swan logo as a like button + heart on Rolodex cards — hierarchy, states, and the count display
  when Swan is trainer-only (does a client even see it?).
- Surfacing game formats without turning the creator into a toy.
- Room/obstacle capture UX that a trainer will actually complete.
- Must honor: Dual-Button Glow, 44px targets, dark-first, reduced-motion, mobile at 320/375/414.

---

## 9. Awaiting Sean

- Rough studio dimensions + fixed obstacles (or spec the capture and review the design instead).
- Confirm per-station minimum: code says `minPerStation = 2`, Sean says ~4.
- Confirm 5×4×3 as the most common class shape.
- **BOSU-Assisted Split Squat = FRONT foot on the dome** (decided; inherited code assumed rear —
  correct migration, seeder, and cues in the build slice).

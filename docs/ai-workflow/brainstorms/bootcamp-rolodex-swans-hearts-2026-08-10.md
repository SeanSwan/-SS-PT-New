---
title: Bootcamp reality + Rolodex Swans/Hearts + smart workout selection
owner: Sean
status: in-progress
decision: pending — grill in progress
supersedes: none
privacy: IDs/roles only; no client PII
created: 2026-08-10
---

# Bootcamp reality + Rolodex Swans/Hearts + smart selection

**Goal (Sean, 2026-08-10):** teach the Swan Coach brain how Move Fitness bootcamp is *actually*
run today, so generated classes match reality — then take what exists and make it better, not
rebuild it. Add a Swan-logo "like" and a "heart" (favorite) to the Workout Rolodex, plus a
popularity signal for staple exercises, and feed all of it into generation **without making
selection random**. Selection must stay driven by client onboarding, pain charts, prior
workouts, and every data point available.

Sean's framing: ~4 people per station on average, max, most of the time. Open to ideas.

## Grounded reality (audited 2026-08-10, before any questions)

> **⚠ TWO CORRECTIONS (2026-08-10).** My first pass at this table contained two FALSE absence
> claims, both caused by too-narrow searches — a `head -18` truncation and a case-sensitive grep
> (`weight` never matches `pyramidStartWeight`). Corrected rows below. **Do not build on the
> retracted claims; they nearly became the premise of a paid review.**

| Fact | Evidence | Why it matters |
|---|---|---|
| ~~`BootcampExercise` links by STRING, not FK~~ **RETRACTED — FALSE.** A canonical FK **exists**. | `BootcampExercise.mjs:130` — `exerciseLibraryId: UUID, references { model: 'Exercises', key: 'id' }, onDelete: 'SET NULL'` | Popularity aggregation **can** be trusted at the ID level. The real risk is narrower: rows where `exerciseLibraryId` is NULL (free-typed or legacy) fall out of any count. Popularity must report coverage ("counted N of M placements; X unlinked"), not a bare number. |
| Drop-set / pyramid structure **already modeled** (retracts my "no load/drop-set modeling") | `BootcampExercise.mjs:118-123` — `pyramidStartWeight` STRING(50), `pyramidDrops` INTEGER; also `supersetOrder`, `supersetGroupId` (124-129) | Sean's signature drop-set-to-failure style has a home already. **Extend these, do not invent a parallel scheme.** Open question: `pyramidStartWeight` is a STRING — likely fine for "80 lb" free text, but it cannot be computed on. |
| Rich per-exercise coaching data already exists | `BootcampExercise.mjs` — `easyVariation`/`mediumVariation`/`hardVariation`, joint mods (`kneeMod`, `shoulderMod`, `ankleMod`, `wristMod`, `elbowMod`, `footMod`, `hipMod`, `backMod`), `muscleTargets`, `equipmentRequired`, `isCardioFinisher`, `board` | The scaling + contraindication vocabulary for smart selection is **already there**. Pain-chart-aware selection can key off the joint mods that exist rather than needing a new schema. |
| 37 class formats + 12 class styles already enumerated | `BootcampTemplate.mjs:8-21` — formats incl. `amrap`, `emom`, `tabata`, `circuit`, `partner`, `hybrid`, `custom` and an `<stations>x<exercises>_r<rounds>` notation; styles incl. `pyramid`, `superset`, `ladder`, `descending`, `density` | Sean's "leave it open for different training styles" is **already supported**. But see the gap below — his most common real format may not be expressible. |
| **GAP — Sean's stated common format may not be representable** | Sean Q3: ~5 stations × 4 exercises × 3 rounds. Enum has `5x4_r1`, `5x3_r1`, `5x3_r2` — **no `5x4_r3`**; also no `4x4_r3` | Needs confirmation. If the enum can't express the class he actually teaches, generation will silently round him to a format he doesn't run. |
| No like/favorite/popularity field on Exercise | grep on `backend/models/Exercise.mjs` + `backend/services/exerciseLibraryContract.mjs` → 0 hits | Net-new. Nothing to extend; nothing to break. |
| An in-repo like-model pattern exists | `backend/models/GoalLike.mjs` | Match this pattern (Rule 18 existing-pattern-first) rather than inventing a new shape. |
| Class timing is already modeled | `BootcampTemplate` — `classFormat`, `targetDurationMin`, `demoDurationMin`, `clearDurationMin`, `dayType` | Demo and clear time are already first-class. Build on these, don't duplicate. |
| Station shape already modeled | `BootcampStation` — `stationNumber`, `stationName`, `equipmentNeeded`, `setupTimeSec`, `notes`, `sortOrder` | Station identity exists; per-station *capacity* (Sean's ~4 people) does not appear here. Likely gap. |

## Decisions locked

- **BOSU-Assisted Split Squat = FRONT foot on the dome** (Sean, 2026-08-10). Inherited code
  assumed REAR foot; migration, seeder, and coaching cues must be corrected in the build slice.
- Paid Kimi K3 review (highest effort) is spent on **this** prompt+plan, not the Jarvis
  implementation. HY3 additionally reviews for design.
- Jarvis implementation review: HELD.

## Q&A log

### Q1 — Class shape: how many stations, and how do people move through them?
- **Recommended:** 6 stations, ~4 people each, one pass through (matches code, which validates
  `stationNumber` 1–6).
- **Sean:** *"On average, there are normally about four stations. Sometimes we do five, but six
  is rare, to be honest. It's usually four to five stations."*
- **Implication:** the code's 1–6 range **over-represents reality**. Generation should default to
  **4 stations, allow 5, treat 6 as an explicit rare opt-in** — not sample the range uniformly.
  A generator that freely picks 6 produces classes Sean does not run. Station count needs a
  realistic default + a "this is unusual, confirm" affordance at 6.
  Combined with ~4 people/station → typical class cap ≈ **16–20**, not 24.
- **Still open from Q1:** number of passes/rounds through the stations (asked next).

### Q2 — Rounds & flow: how does the class fill time, and what happens while 4 share a station?
- **Recommended:** multiple rounds, all 4 work simultaneously, timed work/rest, group rotates.
- **Sean:** chose **multiple rounds, all 4 work at once**.
- **Implication — this is the single biggest generation constraint found so far:**
  **every exercise at a station must be performable by 4 people SIMULTANEOUSLY.** That means the
  Rolodex needs an equipment-multiplicity signal (how many can do this at once given typical gym
  stock), and generation must reject any exercise whose equipment cannot serve 4 concurrently.
  - Scales freely: bodyweight (push-up, pull-up if multiple bars, squat, lunge, plank), bands,
    anything with 4+ sets of light DBs.
  - Does NOT scale: single cable column, one barbell, one sled, one specialty machine.
  - This also **explains why staples feel like staples** — Sean's examples (push-ups, pull-ups,
    deadlift, dumbbell rows) are largely movements that scale to a group and hit a lot at once.
    Popularity may be partly a *proxy* for "scales to 4 + high systemic return." Worth modeling
    both signals separately so the AI does not conflate "Sean likes it" with "it fits 4 people."
- **Still open:** round count and work/rest seconds (asked next).

### Q3 — Round count and interval
- **Recommended:** 3 rounds, 40s/20s.
- **Sean (verbatim substance):** There are **two distinct formats**, not one.
  - **Format A — short-interval circuit.** ~35s average, 40s max, "usually 50 seconds"; 2 rounds
    at 50s sometimes. Typically **3–4 exercises per station, run 3 times, ~5 stations**.
  - **Format B — AMRAP + full drop set (Sean's signature, explicitly "my style", must be added).**
    **1:40 (100s) per exercise**; three exercises at 1:40 = one round. AMRAP with drop sets built in.
  - **Exercises-per-station scales INVERSELY with station count** (Sean, follow-up): 4–5 stations →
    3–4 exercises each; **>5 stations → ~2 exercises**; 6 stations → 2–3. Total movement count is
    roughly conserved.
- **Drop-set protocol (specific, Sean's own numbers):** start heavy (strength/power range) → at
  failure drop to **~half** (80→40, 40→20) → keep pushing to burnout → can descend to 5–10 lb →
  final ultra-light set **~20 reps at full range of motion**; ridiculously light ≈ 10–12 reps.
  **No rest between drops** — "instead of having them rest, we go and have them jump into the 10
  reps." Full ROM is deliberately saved for *after* the muscle is fatigued from heavier work.
- **Design philosophy (quote-worthy, drives the whole generator):** *"I'm trying to make these
  classes so that even if people are half-assing it, they still are getting [stimulus] in a way
  that they have to... They're going to be hitting failure."* → **the format must produce the
  stimulus even under low effort.** This is a first-class design constraint, not flavor text.
- **Style openness:** do NOT hardcode only Sean's style. Leave the system open to many training
  styles; he pulls "a little bit of everything," including **safe** CrossFit-derived movements —
  high-impact ones filtered out, intense-but-safe ones kept for everybody.
- **Implications:**
  - Format B needs `durationSec = 100` + the existing `pyramidStartWeight`/`pyramidDrops` fields
    carrying real drop structure. A STRING start-weight cannot compute the 80→40→20→10 ladder;
    likely needs a structured drop ladder or a documented convention.
  - "Even if half-assing, they hit failure" is a **scoring criterion** a generator can be judged
    against, and a good acceptance test for generated classes.
  - AMRAP + drop set means **load must be selectable per person** — reinforces the 4×-equipment
    constraint from Q2 (4 people each needing a heavy and a light option at the same station).

### Q4 — Swan/Heart scope
- **Recommended:** trainer-only Swans (global staple signal), per-user Hearts (private favorite).
- **Sean:** confirmed that split.
- **Implication:** three SEPARATE signals must not be conflated —
  1. **Swan** = trainer endorsement ("this is a staple"), global, steers all generation.
  2. **Heart** = personal affinity, private, steers only that user's own workouts.
  3. **Usage frequency** = observed programming count (Sean's "people do it all the time"),
     derived from `exerciseLibraryId` placements — an *observation*, not an opinion.
  Sean's original ask blended #1 and #3 ("a number that represents how popular"). Keeping them
  distinct matters: usage can be high because an exercise is easy to set up, not because it is
  good. Endorsement and observation must be weighted differently by the selector.

## Grounded reality, pass 2 — the bootcamp system is FAR more built than pass 1 assumed

A second audit (`backend/services/bootcamp/`, **4,239 lines across 18 modules** — corrected from
"14", which came from a truncated listing) overturned another assumption. **Bootcamp generation is
NOT client-blind.**

| Module | Lines | What it already does |
|---|---|---|
| `bootcampGenerator.mjs` | 965 | main generator (⚠ 3.2× over the 300-line rule) |
| `classStyleModifiers.mjs` | 328 | the 12 class styles (pyramid/superset/ladder/…) |
| `bootcampCrud.mjs` | 305 | persistence |
| `sprintService.mjs` / `sprintGenerator.mjs` | 299 / 264 | sprint formats |
| `dayTypeContract.mjs` | 286 | day-type contract |
| `exerciseRolodexBridge.mjs` | 254 | **the Rolodex bridge already exists** |
| `painAwareGating.mjs` | 185 | **reads `ClientPainEntry`, filters active entries** |
| `flowOptimizer.mjs` | 174 | flow/transition optimization |
| `bootcampCapacity.mjs` | — | **equipment-quantity vs headcount math** |

**The 4×-equipment constraint I "derived" in Q2 is already built.** `bootcampCapacity.mjs:44-46`:
*"owning ONE kettlebell does not make a kettlebell station work for 14 people (master prompt
§5.8). Items without a usable quantity count as 1."* Plus
`collapseStationCountForParticipants()` for small classes.

**Client-signal models available:** `ClientOnboardingQuestionnaire`, `ClientOnboardingCoverageItem`,
`ClientPainEntry`, `PainEntryCorrectiveExercise`, `PainEntryRevision`, `ClientProgress`,
`ClientBaselineMeasurements`, `BodyMeasurement`, `MeasurementMilestone`, `DailyWorkoutForm`,
`WorkoutLog`, `WorkoutPlan`, `WorkoutExercise`, `ProgressData`, `ProgressReport`,
`EquipmentScanSession`, `Goal`/`GoalMilestone`.

## ⭐ The feature already has a reserved hole — fill it, don't invent beside it

Three independent places converge on exactly what Sean asked for. This is the strongest
"enhance, don't rebuild" evidence in the whole audit.

| Piece | Evidence | Meaning |
|---|---|---|
| A **`favorites` filter slot already declared** on the Rolodex filter interface | `frontend/src/components/WorkoutLogger/WorkoutLoggerTypes.ts:390` — `favorites: boolean;` beside `categories`, `nasmPhases`, `targetMuscles`, `equipment`, `difficulty`, `recent`. **Exactly 1 occurrence in the whole WorkoutLogger tree — zero consumers.** | The Heart already has a designed home in the filter model. It is **dormant, not implemented**. Wire this slot; do not add a competing filter concept. |
| A **`coach_favorite` chip is already specced and BLOCKED** | `backend/services/bootcamp/bootcampChips.mjs:31` — *"new / coach_favorite require the preference model (slice 4)."* | The Swan is the **missing "preference model"** that bootcamp chips already reference by name. Sean's request *is* the deferred slice-4 dependency. |
| A **proven reaction pattern exists in-repo** | `backend/models/GoalLike.mjs` — `goalId`, `userId`, **`reactionType`**, `timestamps: true, updatedAt: false`, unique composite index `(goalId, userId, reactionType)` | Rule 18: mirror this shape. **`reactionType` means Swan and Heart are two values on ONE table**, not two tables. The unique composite index gives idempotent toggling for free. |

**Design consequence:** a single `ExerciseReaction`-style model (`exerciseId`, `userId`,
`reactionType ∈ {swan, heart}`, unique composite index) satisfies both signals, fills the
`coach_favorite` dependency, and wires the dormant `favorites` filter slot — while usage
frequency stays a *derived* count over `BootcampExercise.exerciseLibraryId`, never a stored
opinion. Trainer-only enforcement for `swan` happens at the route/role layer, not the schema.

## Q5–Q7 — overflow, true-burnout mode, real floor inventory

### Q5 — Dictation disambiguation
- Sean's trailing **"No."** = stray dictation artifact; everything else stands (confirmed).
- **"the real ocean kick button"** = a **TRUE-BURNOUT MODE toggle** (confirmed). An exercise-level
  switch: when on, that movement runs a real strip-set to failure instead of a timed interval.

### Q6 — Overflow capacity — **CONFIRMED GAP**
- **Sean:** *"we need to have a system that's ready for [overflow]… I know it's gonna be four
  people per station, but what if there's more? We need a backup plan built into the class
  creator."*
- **Ground truth:** `bootcampCapacity.mjs` exports exactly four functions —
  `buildAvailableEquipmentList`, `buildEquipmentCountMap`,
  **`collapseStationCountForParticipants`** (shrink only), `assessEquipmentFeasibility`.
  **There is no expand/split/overflow path.** The system can shrink a class for a small turnout
  but has no designed behavior for a large one. This is a real, confirmed gap — exactly what
  Sean asked for.
- Design directions to price in the plan: add a station (if equipment counts allow) · split into
  two waves/heats at the same station · pair up within station (work/rest alternation) ·
  substitute the station's exercise for one with higher concurrency (bodyweight/band) ·
  or explicitly refuse and tell the trainer which station is the bottleneck.

### Q7 — Real floor inventory — **the creator has been programming equipment that does not exist**
- **Sean:** the creator throws in *"leg extension machine, hamstring machine, that type of stuff.
  We don't have that stuff on the floor."*
- **Actual Move Fitness floor:** barbells · dumbbells · **kettlebells (lots)** · cable machines ·
  TRX/suspension · sliders · resistance bands · medicine balls + rubber slam balls · a **weighted
  push sled/prowler** · **landmine setup (emphasized)** · stability balls · **spin bikes**.
- **CORRECTION (Sean, same session):** the machines **do exist** — they are **in another room**.
  The bootcamp space is a separate open-floor studio. So this was never "phantom equipment"; it
  is **equipment scoped to the wrong space**. Facility-present ≠ room-available.
- **The bootcamp studio itself:** a large-ish open square. Fits ~14 people; 16 fits but **"feels
  tight — you start feeling the heat, the breath."** Space, not just equipment, is a real
  constraint on class design.
- **Consequence for the true-burnout design:** Sean's illustrative example (leg extension,
  250–300 lb, strip ~20 lb per drop, AMRAP each, until "popping out fast ones") uses a machine he
  does **not** own. The strip-speed gate must therefore be built around **his real burnout
  vehicles**:
  | Strip speed | His equipment | Why |
  |---|---|---|
  | **Fastest** | **cable machines** (pin stack) | pin move = instant drop; the true selectorized burnout he has |
  | Fast | **kettlebells** (he has many), **dumbbells** | drop to next pair — only if the rack is AT the station |
  | Medium | **bands** | switch band or change stance distance; near-instant |
  | Slow | barbell, **sled**, **landmine** | stripping plates takes hands and time |
  | N/A | bodyweight, TRX, sliders, stability ball, spin bike | load is not shed — use tempo/leverage/variation instead |

### Equipment gating — what is TRUE, and one unproven lead
- **[VERIFIED] The empty-inventory fallback is FAIL-CLOSED, not permissive.**
  `buildAvailableEquipmentList([])` returns `['bodyweight', 'none']` (`bootcampCapacity.mjs:29-40`).
  Three generator paths fall back to it (`bootcampGenerator.mjs:292, 306, 326`). My hypothesis
  that "empty inventory = allow anything" was **wrong** — disproven by reading the function.
- **[VERIFIED] A full inventory subsystem already exists:** `Equipment`, `EquipmentItem`,
  `EquipmentProfile`, `EquipmentExerciseMap`, `ExerciseEquipment`, plus AI photo scanning
  (`EquipmentScanSession`, `EquipmentScanCandidate`). Generator reads `models.EquipmentItem`
  (`bootcampGenerator.mjs:309`). **So the floor CAN be represented — the question is whether the
  Move Fitness profile is populated and correct.**
- **[HYPOTHESIS — needs a probe, Rule 55] Permissive gate degradation at
  `bootcampGenerator.mjs:144-147`:**
  ```js
  if (fallbackGate) {
    const budgeted = candidates.filter(fallbackGate);
    if (budgeted.length > 0) candidates = budgeted;   // if NOTHING passes → gate silently dropped
  }
  ```
  When zero candidates pass the gate, the filter is discarded and the **unfiltered** set is used.
  That is the classic shape of "equipment you don't own appears in the class."
  **NOT YET PROVEN:** (a) whether `fallbackGate` is the equipment gate or a time/intensity budget;
  (b) whether the `available` pool was already equipment-filtered upstream, which would make this
  degradation harmless for equipment. **Probe required before prescribing any fix** — do not
  "fix" line 146 on this hypothesis alone.
- **[VERIFIED] RESOLVED — the equipment path is CORRECT CODE; the defect is profile selection.**
  `bootcampGenerator.mjs:288-321`:
  - No `equipmentProfileId` → `['bodyweight','none']` + `equipmentCounts: null`, and the comment
    at :288-290 states *"the feasibility check treats null as 'cannot judge', never as
    'everything is fine'."* **Fail-closed by design.**
  - With a profile → `EquipmentItem.findAll({ where: { profileId, isActive: true,
    approvalStatus: IN ('approved','manual') } })`. **Equipment is already room/profile-scoped.**
  - `EquipmentProfile` carries `name`, `locationType`, `address`, `isDefault`, `isActive` — a
    trainer can hold MULTIPLE profiles.
  - **Therefore [LIKELY]:** classes are being generated against a facility-wide (or default)
    profile that includes the machine room, instead of a studio-scoped profile. **Fix is
    configuration + UX (create a "Bootcamp Studio" profile; make profile choice explicit and
    visible in the creator), not a code change.**
  - **The `fallbackGate:144-147` hypothesis is now LESS likely for equipment specifically**,
    since equipment filtering happens upstream at the profile query. It remains a real permissive
    degradation worth probing for whatever gate it *does* govern (time/intensity budget) — but it
    must NOT be "fixed" as an equipment bug. Probe first (Rule 55).

### Room/space model — **CONFIRMED NET-NEW GAP (Sean wants Kimi's input on this specifically)**
- **[VERIFIED] No spatial model exists.** Grep for `roomWidth|roomLength|floorSpace|squareFeet|
  dimensions|obstacle|roomSize` across `backend/models/` returns only `Goal.mjs` and
  `SocialCommerce.mjs` — unrelated senses of the words. There is **no room, no dimensions, no
  obstacle modeling anywhere.**
- **Sean's requirement:** room measurements + obstacles belong in the app and in the bootcamp
  creator, *"so that the AI will have a good idea of what a room you're working with and what
  obstacles are in the way."*
- Why it matters beyond aesthetics: it is the **missing third constraint**. Today generation
  reasons about (1) equipment counts and (2) headcount. It cannot reason about **floor area per
  person**, travel distance between stations, or fixed obstacles — which is exactly why 16 people
  "feels tight" and why sled/prowler work (needs a long clear lane) or slam-ball work (needs
  overhead + rebound clearance) can be programmed into a room that cannot host it.
- Natural home: extend `EquipmentProfile` (it is already the room-ish entity with `name` +
  `locationType`) with dimensions + an obstacle list, rather than inventing a parallel Room model.
  **Flag for Kimi:** confirm whether profile-as-room is the right abstraction or whether Room
  should be its own entity that owns N equipment profiles.

## Games & fun formats — research + the Move Fitness filter

**External research** (WodGuru, uniquebootcampworkouts, bootcampideas, workoutdesignclub — see
Sources in the session log) yields a standard vocabulary: relay races, partner circuits,
rock-paper-scissors circuits, cone flipping, dice workouts, partner tag, countdown ladders
(10-8-6-4-2), team AMRAPs, song-based challenges, Tabata.

**The valuable part is what survives Sean's constraints.** Two filters kill most of the list:

**Filter 1 — SPACE.** The studio is a tight-ish square; 16 people already "feels tight." Anything
needing running lanes, shuttle distance, or open-floor chasing does not fit.

**Filter 2 — THE FAILURE DOCTRINE (the important one).** Sean's governing rule is *"even if people
are half-assing it, they still hit failure."* **Elimination and turn-taking games reward losing
with rest.** Rock-paper-scissors circuits, knockout, and tag all mean the least-fit person works
least — the exact inverse of the doctrine. This is a filter no general bootcamp article applies,
and it should be stated explicitly in the master prompt.

| Format | Space | Failure doctrine | Verdict |
|---|---|---|---|
| **Countdown ladder** (10-8-6-4-2) | none needed | every rep counts, self-scaling | ✅ **strong** — and `countdown` + `ladder` are ALREADY style enum values |
| **Death-by** (add a rep per minute to failure) | none needed | **failure is the literal win condition** | ✅ **strongest doctrinal fit** — already `death_by` in the enum |
| **Team AMRAP** (shared station score) | in place | every rep adds to the team total; no hiding | ✅ **strong** — `amrap` already a format value |
| **Chipper** (work through a list) | none needed | finish-or-fail, no idle | ✅ already `chipper` in the enum |
| **Dice / randomizer** | none | neutral; adds novelty not intensity | ✅ **viable + app-native** (digital dice on the class screen) |
| **Song-based** (work the chorus) | none | neutral-to-good | ✅ viable; needs music timing, no equipment |
| **Cone flip / floor markers** | small footprint | neutral | ⚠️ viable but adds floor clutter in a tight room |
| **Partner circuits** | moderate | ⚠️ one works / one rests halves the stimulus | ⚠️ only as deliberate work:rest, not as the default |
| **Rock-paper-scissors circuit** | moderate + waiting | ❌ **winner advances, loser waits** = rest as reward | ❌ **rejected on doctrine** |
| **Relay race / partner tag** | ❌ needs lanes | ❌ queueing = idle time | ❌ **rejected on space + doctrine** |

### The reserved-hole pattern repeats
`countdown`, `death_by`, `chipper`, `ladder`, `amrap` are **already in the format/style enums**
(`BootcampTemplate.mjs:8-21`). They ARE game formats — they are simply not *surfaced or named* as
games anywhere in the UI. **A large part of "add games" is presentation, not new engine work:**
label these as play-formats, explain their win condition, and let the trainer pick one per class
or per station. Net-new engine work is limited to **team scoring** (a shared station tally) and
the **randomizer**.

### Design note for the plan
- Games should compose **within** the station structure (4 people, all working, rotating), not
  replace it. Station-local games fit; whole-room games fight both the space and the format.
- **Team scoring is the one genuinely new primitive** worth building: a per-station shared count
  that every participant contributes to. It makes low effort visible without shaming anyone
  individually, which serves the doctrine better than elimination does.
- Keep the `HIGH_IMPACT` classifier (`bootcampFinishers.mjs:42` —
  `['jump','burpee','hop','bound','tuck','star']`) in the loop: game formats bias toward
  explosive movements, and Sean's rule is safe-but-intense, high-impact filtered.

## Open flags

- **`minPerStation = 2`** (`bootcampCapacity.mjs:70`) vs Sean's stated **~4 per station**. Confirm
  which is the real floor — this changes station-collapse behavior for small classes.
- **Format-enum gap:** no `5x4_r3` / `4x4_r3` for Sean's most common class (see table above).
- **Two schema-drift fossils** (Rule 79 — comments documenting live defects):
  - `bootcampGenerator.mjs:740` — "drift: ClientPainEntry has `isActive`" + "the wrong
    createdById roster"
  - `painAwareGating.mjs:15` — "filtered `ClientPainEntry` on a `status` column that does not
    exist"
  Both need verification against the real DB before the selector trusts pain gating.
- `bootcampGenerator.mjs` at 965 lines violates the 300-line cap — flag, do not refactor in this
  slice (Rule 37, cleanup is a separate pass).
- Rows with NULL `exerciseLibraryId` fall out of usage counts — popularity must report coverage.

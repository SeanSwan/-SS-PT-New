---
decision: Master prompt for the Bootcamp Creator V2 rebuild — grounded audit + enhanced brief for the Kimi / Opus 5 consult panel
status: open
supersedes: none
---

# BOOTCAMP CREATOR V2 — MASTER PROMPT

**Author:** Claude Opus 5 (grounded audit pass) · **Date:** 2026-07-30 · **Owner:** Sean (CEO)
**Purpose:** This is the single artifact handed to Kimi and Opus 5. It carries the ground truth,
the confirmed defects, the decoded intent, and the build contract. A consultant reading only this
file must be able to produce a world-class design without asking what the code currently does.

> **⚠ Branch warning for every builder:** the tree this audit ran in
> (`wip/comms-notifications-2026-07-05`) is **~1248 commits behind `main`** and its `CLAUDE.md`
> stops at Rule 73 while `main` runs to Rule 77. **Branch V2 off `origin/main`.** Re-verify every
> file:line citation below against `origin/main` before writing code — the citations are true for
> the audited tree and are near-certainly still true, but they are `[LIKELY]`, not `[VERIFIED]`,
> on main.

---

## 1. MISSION

Rebuild the SwanStudios Bootcamp Creator into the best group-training class builder that exists —
a tool that plans a class Sean actually teaches, adapts on the gym floor in one tap, and can **run
the entire class off a TV screen on a timer** without the trainer touching anything.

Two hard architectural requirements sit alongside the product goal:

1. **It must be driven by the Swan Coach brain**, not a blind algorithm.
2. **It must be a portable component** — extractable into any other workout app with no
   SwanStudios coupling.

---

## 2. GROUND TRUTH — WHAT ALREADY EXISTS

**This is not greenfield.** The audit found **403 bootcamp-related files**, including 66 in
`frontend/src/components/BootcampBuilder/` alone, plus a backend service layer, 8 migrations, 5
models, and a substantial test suite. Any consultant who proposes "start from scratch" without
reading this section is proposing to destroy working, tested infrastructure.

### 2.1 Backend — the generator (deterministic, zero AI)
| File | Role |
|---|---|
| `backend/services/bootcamp/bootcampGenerator.mjs` (267 ln) | Orchestrates generation |
| `backend/services/bootcamp/bootcampStructure.mjs` | Resolves format → stations/duration math |
| `backend/services/bootcamp/bootcampConstants.mjs` | `FORMAT_CONFIG` (30+ formats), `DAY_TYPE_MUSCLES`, `CARDIO_FINISHERS` |
| `backend/services/bootcamp/bootcampExerciseSelection.mjs` | Picks the exercises **← primary defect site** |
| `backend/services/bootcamp/bootcampIntensityScoring.mjs` (249 ln) | `rankExercisesForBootcamp` |
| `backend/services/bootcamp/bootcampEquipmentContext.mjs` | Equipment profile → available-equipment tokens |
| `backend/services/bootcamp/bootcampPainAlerts.mjs` | Client pain → alerting |
| `backend/services/bootcamp/exerciseRolodexBridge.mjs` | Exercise library query + setup-time estimate |
| `backend/services/bootcamp/flowOptimizer.mjs` | Station flow / setup-time optimization |
| `backend/services/bootcamp/bootcampFunctionalRepSchemes.mjs`, `bootcampProgrammingNotes.mjs`, `bootcampCrud.mjs` | Prescription + persistence |

**Models:** `BootcampTemplate`, `BootcampExercise`, `BootcampStation`, `BootcampClassLog`,
`BootcampSpaceProfile`, `BootcampStretch`, `BootcampSprint`, `BootcampOverflowPlan`.

### 2.2 The rotations Sean asked for **already exist**
`bootcampConstants.mjs:73-78`:
```js
export const DAY_TYPE_MUSCLES = {
  lower_body: ['quads','hamstrings','glutes','calves','hip_flexors','core'],
  upper_body: ['chest','lats','anterior_deltoid','biceps','triceps','core'],
  cardio:     ['core','quads','glutes','chest','anterior_deltoid','hamstrings'],
  full_body:  ['quads','chest','lats','anterior_deltoid','glutes','core'],
};
```
These are exactly Sean's four gym rotations. **The taxonomy is correct. The enforcement is broken.**

### 2.3 Equipment Manager **is already wired** to the generator
`bootcampEquipmentContext.mjs` pulls `EquipmentItem` rows for a profile
(`isActive: true`, `approvalStatus IN ('approved','manual')`), builds a normalized token set, and
loads `EquipmentExerciseMap` rows where `confirmed: true`. When no profile is selected it returns
`strictEquipment: false` — i.e. **no equipment filter, generator picks freely.** Sean's "if we
choose none, let the AI choose" is therefore *half-built*: the "no filter" path exists, but what
fills it is the algorithm, not a brain.

Frontend equipment surface is mature: `EquipmentManagerPage.tsx`, `EquipmentProfilePicker.tsx`,
AI equipment **scanning** (`equipmentScanService.mjs`, V2 support, batch review, duplicate merge,
candidate persistence). Sean can photograph his gym and have equipment recognized.

### 2.4 Swan Coach **already has bootcamp context** — but is a separate brain
`backend/services/aiChatService.mjs:1499-1610` injects into the coach prompt:
- Recent classes from `bootcamp_class_logs` (anti-repeat)
- `bootcamp_space_profiles` (station/space constraints)
- Saved `bootcamp_templates`
- **Active client pain entries (severity 5+)** with Board-2/Board-3 modification guidance
- **Equipment profiles**, with the instruction to restrict exercises to listed equipment

There are two coach modes referencing bootcamp: `BOOTCAMP CLASS PLANNING` (line 738) and
`BOOTCAMP CLASS PLANNING (FULL AI ASSISTANT)` (line 921).

**The critical structural fact:** `bootcampGenerator.mjs` imports **nothing** from
`aiChatService`, `coachContextEngine`, or any AI service. Verified by import scan — its imports are
all local bootcamp modules plus `variationEngine` and `sequelize`.

> **There are two parallel brains that never speak.** Swan Coach can *talk* about a great class
> with full pain/equipment/history context but cannot *produce the saved artifact*. The generator
> produces the saved artifact but is blind. **This single split explains everything Sean feels.**

### 2.5 Floor / TV mode exists — but it is a browser, not a clock
`BootcampDemoMode.tsx` (256 ln) + `BootcampFloorPresentation.tsx` (59 ln) +
`BootcampDemoMode.floorDirector.ts` + `bootcampExerciseMedia.ts`.

Today it: groups exercises by station, renders a station grid, lets you **click** a station and
**click** an exercise to show its demo video/image, with media-readiness pills and a video modal.

It does **not** have: a clock, auto-advance, work/rest countdown, round tracking, audio cues,
fullscreen, or screen wake-lock. **It is a manual browse board.** Sean's "automatic stopwatch you
can run the whole class off" does not exist yet.

### 2.5b Already shipped on main that V2 must PRESERVE, not rebuild `[VERIFIED origin/main]`
- **`BootcampTaughtPanel.tsx` — one-tap "Mark as Taught" + recently-taught history strip.** It
  already feeds an exercise-freshness engine: **the next Generate excludes exercises taught in the
  last 14 days.** So §5.6 anti-repeat is *partially built*. V2 extends this to per-client
  attendance + progress log-back (decision §8.2) — it does **not** rebuild it.
- **Canonical mount points** (a receipt, per Rule 26): `/dashboard/admin/bootcamp`,
  `/dashboard/trainer/bootcamp`, and the `/bootcamp-builder` alias, all inheriting from
  `ClassPreviewPanel`.
- **`BootcampBuilderLensFrame.tsx`** — Swan Lens/style-system integration already wired.
- **Low-impact quality gate** (`bootcampGenerator.mjs:500-515`) — strips high-impact plyo unless
  the class is explicitly cardio/high-impact. Fail-open by design. Keep this behavior.
- **`painAwareGating.mjs`** (Cortex P0) and **`classStyleModifiers.mjs`**.
- **S0 IDOR hotfix** on `/generate` — equipment + space-profile ownership checks. **Do not
  regress this.** Any V2 route work must preserve ownership verification.

### 2.6 Other existing assets worth preserving
- `ExerciseRolodexPanel.tsx` (282 ln) — the Rolodex pattern Sean wants to beat, already integrated
- `BootcampExerciseAlternatives.ts` — alternative-exercise logic (the seed of one-tap swap)
- `BootcampBuilderPdfExport.ts` — printed class sheets (verified output in `tmp/pdfs/`)
- `BootcampEquipmentProfileFilter.ts`, `BootcampBoardViews.ts` (Board 1/2/3 = main / joint-friendly / low-impact)
- Migrations for media fields, preview media, joint-mod fields, low-impact board, template format/style
- `e2e/admin-bootcamp-4k-media-visual.spec.ts` — a 4K visual spec already exists

---

## 3. CONFIRMED DEFECTS — RE-VERIFIED AGAINST `origin/main@eb8e9bb52`

> **⚠ Correction notice.** §2's file map came from the wip tree. **The two branches have
> diverged on bootcamp.** `origin/main` has a *monolithic* `bootcampGenerator.mjs` (698 ln)
> and does **not** contain `bootcampExerciseSelection.mjs`, `bootcampStructure.mjs`,
> `bootcampIntensityScoring.mjs`, `bootcampEquipmentContext.mjs`, or `bootcampPainAlerts.mjs`.
> Main instead carries `painAwareGating.mjs`, `classStyleModifiers.mjs`, `sprintGenerator.mjs`.
> **Main is the build target. Every citation below is `[VERIFIED]` against main.**
> Main also has bootcamp work the wip tree lacks: a **S0 IDOR hotfix** on `/generate`
> (`7576453b1`), **Cortex P0 pain-aware gating**, and a **class-variety fix** (`263ba01af`).

Sean's report: *"some of the workouts… doesn't apply for those days."* Re-verified on main, the
mechanism is **sharper and more interesting** than the wip tree suggested.

### D1 — The day-type contract is too loose to mean anything `[VERIFIED main]`
Main **does** filter the pool by day type — `bootcampGenerator.mjs:453-460` passes
`muscleGroups: targetMuscles` into `queryExercisesForBootcamp`, and the registry fallback at
`:479` filters `.some(m => targetMuscles.includes(m))`.

**But look at what it's filtering against** (`bootcampConstants.mjs:73-78`):
```
lower_body: quads, hamstrings, glutes, calves, hip_flexors, core
upper_body: chest, lats, anterior_deltoid, biceps, triceps, core
cardio:     core, quads, glutes, chest, anterior_deltoid, hamstrings
full_body:  quads, chest, lats, anterior_deltoid, glutes, core
```
Two structural problems:
1. **`core` is in all four rotations.** Combined with `.some()`, **any exercise that lists `core`
   as a secondary muscle passes every day type.** A squat, lunge, or leg raise tagged
   `quads,core` is legal on **upper day**. *This is the actual mechanism behind Sean's complaint.*
2. **`cardio` and `full_body` are near-supersets** — 6 of the biggest muscle groups each. They
   barely constrain anything, which is why cardio day and full-body day feel interchangeable.

The fallback path then compounds it (`:112-114`):
```js
const remainingPool = available.filter(...);
selected.push(...sampleFromWindow(remainingPool, needed - selected.length, rng));
```
When muscle matches run out, it randomly samples from the (weakly-filtered) pool. **Post-variety-
fix this is now *random* wrong-day exercises instead of deterministic ones** — which is exactly
why classes vary per press yet still feel wrong.

> **The fix is not a stricter filter — it is a real contract.** Day type must define
> *primary-muscle inclusion* + *explicit exclusions* + *per-class muscle-volume budgets*, not a
> flat `some()` over an overlapping list.

### D2 — Cardio finisher on every station, day-type-blind `[VERIFIED main — partially mitigated]`
`bootcampGenerator.mjs:643,670`:
```js
const finisherOffset = Math.floor(rng() * CARDIO_FINISHERS.length);
const finisher = CARDIO_FINISHERS[(s + finisherOffset) % CARDIO_FINISHERS.length];
```
Still appended to **every** station; rotation is by station index + random offset — **not** by day
type, muscle, joint load, or client pain.

*Mitigation on main:* a quality gate at `:500-515` strips high-impact plyo unless the class is
explicitly cardio/high-impact, and `painAwareGating.mjs` exists. So burpees on leg day are less
likely than the wip tree implied — **but the finisher is still not day-aware**, and on lower day
you can still stack a leg-dominant finisher onto an already leg-loaded station.

### D3 — `full_group` receives no muscle distribution `[VERIFIED main]`
`:625-626` → `buildFullGroupWorkout(available, format, ...)` → `selectFullGroupExercises(available, rng)`.
**`targetMuscles` is never passed.** The pool is day-filtered upstream, so it's less severe than
first assessed, but there is **zero muscle *distribution*** across the class — it slices by
compound/cardio/accessory and interleaves. Combined with D1's loose contract, full-group upper
and full-group lower produce similar classes.

### D4 — ✅ **ALREADY FIXED on main.** Not a V2 defect.
`sampleFromWindow` (`:60-70`, partial Fisher-Yates + injectable `rng`) shipped in `263ba01af`
*"generate real class variety per press."* Selection is randomized per press and
`rankExercisesForBootcamp` is applied when an intensity category is set (`:495`).
**Consultants: do not propose fixing variety. It is done. Preserve the seeded-rng seam — it is
also the hook for reproducible/testable generation.**

### D5 — No AI in the artifact path `[VERIFIED main]`
Import scan of main's `bootcampGenerator.mjs`: zero AI/coach imports. The only hit for
`Cortex|coach|aiChat` is a **comment** at `:560`. §2.4's two-brain split is confirmed on main.

---

## 4. DECODED + ENHANCED INTENT

Sean's asks, restated precisely, with the enhancement layer.

| # | Sean said | Decoded requirement |
|---|---|---|
| A | "full body, cardio, upper, lower — that's what we do" | The 4 rotations are the **canonical spine**. Every generated exercise must be *justifiable* against the selected day. Nothing may enter a class without a stated reason tied to that day. |
| B | "some workouts don't apply for those days" | Fix D1–D4. **Zero unjustified exercises.** Enforce with a hard contract test, not a heuristic. |
| C | "use the Swan Coach brain" | Merge the two brains (§2.4). The coach reasons; the deterministic engine constrains and validates. |
| D | "Swan Coach knows what's in Equipment Manager" | Equipment context must reach the **brain**, not just the filter — including **quantity** (see E4). |
| E | "if we choose none, AI picks what it wants" | Explicit **Open Gym mode**: no profile → the brain proposes freely, and *states its equipment assumptions* so Sean can correct in one tap. |
| F | "better way to edit exercises on the fly, like the Rolodex but way better" | One-tap intelligent swap that preserves day-type, equipment, intensity, and joint-safety — with instant "why this one" reasoning. Must work **during** class, not just at build time. |
| G | "plug laptop into a PC/TV, run the whole bootcamp off the screen" | A true **Class Runner**: fullscreen, wake-locked, auto-advancing timer, per-station exercise + video that switches on the clock. |
| H | "usable in other workout apps" | Headless portable core + thin adapters (§6). |
| I | "world renowned" | The quality bar: what a trainer would pay for standalone. |

---

## 5. GAPS SEAN DIDN'T NAME — THE ENHANCEMENT LAYER

This is the part of the prompt that earns its keep. Each item is a real-gym failure mode.

**Class-day reality**
1. **Screen Wake Lock is mandatory.** A TV-driven class where the laptop sleeps at minute 12 is a
   dead product. `navigator.wakeLock` + a fallback. *Easy to forget, fatal to miss.*
2. **Audio cues.** Beep on transition, 10-second warning, whistle on round change, optional voice
   callout ("Station 3 — switch"). Screen-only still means Sean is yelling over music. Audio is
   what turns the screen into an actual instructor.
3. **Offline resilience.** Gym Wi-Fi dies. Pre-cache the class payload + demo media before start;
   the Runner must complete a class with the network unplugged.
4. **Late start / running behind.** Real classes start 6 minutes late. The Runner needs
   compress/extend: recalculate remaining rounds to still finish on time, or drop the last round
   cleanly instead of silently overrunning.
5. **Pause / resume / skip / rewind station.** Someone gets hurt, a delivery arrives.

**Programming quality**
6. **Cross-session anti-repeat + progression.** `bootcamp_class_logs` already exists and the coach
   already reads it. The *generator* must too: don't repeat last week's picks, and progress load
   or complexity where the same movement recurs. This is the single biggest "world renowned" lever.
7. **Warmup and cooldown are part of the class.** `BootcampStretch` exists. A class artifact that
   is only the work block is incomplete — the Runner should drive warmup → work → stretch.
8. **Equipment quantity, not just presence.** 14 people, 4 stations = 3–4 per station. Owning *one*
   kettlebell does not make a kettlebell station viable. Class size × station occupancy must
   validate against item counts, and the UI must say "you need 2 more of these."
9. **Fatigue sequencing.** Don't stack three consecutive posterior-chain stations. Alternate
   push/pull, upper/lower, high/low joint load — especially on full-body day.
10. **Joint-load budget per class.** Pair with existing pain data: cap high-impact exercises when
    the roster carries knee/back flags. Board 2/3 already exist — make them automatic, not manual.

**The loop back to the product**
11. **Attendance + log-back.** CLAUDE.md's Product Core Loop is workout-progress-first. A bootcamp
    that never writes to client records is a broken loop. After class: mark attendance, push a
    workout entry to each attendee's progress. *This is the highest-value item on the list and Sean
    did not mention it.*
12. **Post-class trainer feedback,** one tap per station ("too easy / just right / too hard"),
    feeding the next generation.

**Craft**
13. **20-foot legibility.** TV typography is a different design problem than app typography. Test
    at 2560×1440 and 3840×2160 (Rule 24) *from across a room*, not at a desk.
14. **Reduced motion + 44px targets** (Rules 2, 25) — the Runner is touched with sweaty hands, and
    someone may operate it from a phone as a remote.
15. **Phone-as-remote.** Sean walking the floor with the class on the TV should be able to
    pause/skip/swap from his phone. High leverage, low cost if the Runner state is already shared.

---

## 6. TARGET ARCHITECTURE

### 6.1 The three-layer brain (resolves the §2.4 split)
```
┌─ INTENT ─────────────────────────────────────────────────────────┐
│ Sean: day type · duration · class size · equipment profile │ or  │
│ natural language via Swan Coach ("upper day, 12 people, 45 min") │
└────────────────────────┬─────────────────────────────────────────┘
                         ▼
┌─ LAYER 1 · CONSTRAINT ENGINE (deterministic, testable, offline) ─┐
│ Builds the LEGAL exercise pool BEFORE any AI call:               │
│  · day-type muscle contract   · equipment profile + quantity     │
│  · pain/joint exclusions      · anti-repeat vs class log         │
│  · structure math (existing bootcampStructure.mjs)               │
│ OUTPUT: a pool where EVERY member is already valid for this day. │
└────────────────────────┬─────────────────────────────────────────┘
                         ▼
┌─ LAYER 2 · SWAN COACH BRAIN (judgment) ─────────────────────────┐
│ Chooses FROM the legal pool and orders it. Owns: variety,        │
│ fatigue sequencing, progression vs last week, station theming,   │
│ coaching cues. Returns a selection + a REASON per exercise.      │
│ May NEVER introduce an exercise outside the pool.                │
└────────────────────────┬─────────────────────────────────────────┘
                         ▼
┌─ LAYER 3 · VALIDATOR (fail-closed) ─────────────────────────────┐
│ Re-checks the brain's output against the Layer-1 contract.       │
│ Any violation → rejected and deterministically backfilled.       │
│ AI outage / timeout → Layer 1 + ranking alone still ships a      │
│ correct class. THE CLASS ALWAYS GENERATES.                       │
└──────────────────────────────────────────────────────────────────┘
```
**Why this shape:** it makes D1–D5 structurally impossible rather than patched. The brain cannot
emit an off-day exercise because off-day exercises are never in its input, and the validator
re-proves it. It also satisfies Rule 8 (zero PII to LLMs — pool entries are exercise IDs; client
constraints are aggregate flags like `knee_sensitive: 3`, never names).

### 6.2 Portability (requirement H)
```
packages/bootcamp-core/          ← ZERO SwanStudios imports. Pure TS.
  types.ts                       ← DayType, ClassFormat, Exercise, ClassPlan, RunnerState
  constraints/                   ← day-type contract, equipment, quantity, anti-repeat
  structure/                     ← format → stations/rounds/timing math
  sequencing/                    ← fatigue, joint-load, variety
  runner/                        ← the clock state machine (pure, framework-free)
  ports.ts                       ← interfaces: ExerciseSource, EquipmentSource,
                                   HistorySource, BrainPort, MediaSource
packages/bootcamp-react/         ← headless hooks + unstyled primitives
apps/swanstudios adapters:       ← Sequelize/Express impls of the ports + Swan styling
```
The clock **must** be a pure state machine (`tick(state, now) → state`), not `setInterval` inside a
component — that is what makes it testable, portable, and resilient to tab throttling. Drive it
from a monotonic clock (`performance.now()`), never accumulated timer drift.

### 6.3 The Class Runner (requirement G)
State machine phases: `idle → warmup → work → rest → station_transition → round_break → cooldown →
complete`, with `paused` orthogonal.

Screen: current exercise **huge**, its demo video auto-playing and looping, countdown ring, next-up
preview, station/round position, per-board modification line (joint-friendly / low-impact
alternative visible without interaction). Auto-advance on the clock. Audio cues per §5.2.
Wake-locked, fullscreen, offline-capable.

---

## 7. NON-NEGOTIABLE CONSTRAINTS

- **Rule 1** styled-components only, no MUI · **Rule 3** dark-first · **Rule 6** `var(--token, #fallback)`
- **Rule 2** 44px targets · **Rule 7** WCAG 4.5:1 · **Rule 25** reduced-motion
- **Rule 4** 300-line file cap — extract aggressively
- **Rule 8** zero PII to LLMs — exercise IDs and aggregate flags only
- **Rule 9** never "yoga"/"meditation" → "stretching"/"flexibility"
- **Rule 24** responsive matrix incl. 2560×1440 and 3840×2160 for the TV surface
- **Rule 40** all UI routes through `swan-design-router`
- **Rule 26/27** Canonical Surface Receipt before touching any live surface
- **Rule 58** proactive schema-drift check on every model touched
- **Rule 73/74** no "done" without current-session proof + a clean hostile dry-loop
- Palette: Midnight Sapphire / Ice Wing / Wing Purple / Gilded Fern; Dual-Button Glow
- **Branch off `origin/main`** (see the warning at the top)

---

## 8. DECISIONS — LOCKED BY SEAN 2026-07-30

These are **decided**. Consultants must design within them, not relitigate them.

| # | Decision | Ruling |
|---|---|---|
| 1 | **Scope** | ✅ **Re-architect the brain + build the Class Runner new. Preserve the tested plumbing** — models, migrations, PDF export, equipment scanning, board views, Rolodex integration. NOT full greenfield. Consultants: do not propose discarding §2 infrastructure. |
| 2 | **Log-back to client records** | ✅ **YES — mark attendance AND write workout entries** to each attendee's progress record. Closes the Product Core Loop. This is in scope for V2, not deferred. |
| 3 | **Runner control** | ✅ **Laptop drives the TV + phone acts as remote.** Runner state must be shareable/syncable so Sean can pause / skip / swap from his phone while walking the floor. Design the state machine for this from the start — it is not a bolt-on. |

### Still open (answer during/after consult — do not block on these)
4. **Rotation scope.** Are the four rotations *exactly* it, or is there a 5th (core/conditioning,
   partner day, competition day)? Should the system know the weekly *schedule* (e.g. Mon upper /
   Wed lower / Fri full) so it can auto-suggest today's day type and progress week over week?
   *Consultants: assume 4 rotations, and design the day-type contract to be extensible.*
5. **Class size** — typical and max? Drives station count and the equipment-quantity check (§5.8).
   *Consultants: assume 8–16, design for 6–24.*
6. **Audio** — beeps/whistle only, or voice callouts? Voice needs a TTS-vs-recorded-asset decision.
   *Consultants: recommend, with a cost/craft tradeoff.*

---

## 9. WHAT EACH CONSULTANT IS ASKED FOR

Both receive §1–§8 verbatim. Distinct remits so their outputs compose rather than duplicate:

**Kimi (K2/K3) — adversarial + systems remit**
- Attack the three-layer architecture (§6.1). Where does it fail on a real gym floor?
- Is the constraint-then-brain-then-validate order right, or should the brain propose constraints?
- Failure modes: AI timeout mid-generation, equipment profile edited during class, roster change,
  network loss at minute 20.
- What is missing from §5 that a 6am class would expose in week one?

**Opus 5 — product + craft remit**
- The Class Runner as a *product*: what makes a trainer choose this over a whiteboard and a phone timer?
- Information design at 20 feet — hierarchy, typography, what the participant needs vs the trainer.
- The one-tap swap interaction (§4-F): what does "way better than the Rolodex" concretely mean?
- The portable-core API surface (§6.2): is it the right seam for reuse in another app?
- Rank everything in §5 by value-per-unit-effort and name what to cut.

**Synthesis:** Claude reconciles both against the ground truth in §2–§3, resolves contradictions
in favor of verified code reality, and produces the final numbered, independently-shippable slice
plan (Rule 68 shape — each slice executable with zero further questions).

---

## 10. DEFINITION OF DONE (V2)

1. A contract test proves **zero** exercises outside the day-type contract across all 4 rotations
   × all formats × strict and open equipment modes — including the exhausted-pool path that
   causes D1 today.
2. Cardio finishers are day-type-aware and joint-load-aware (D2 closed).
3. `full_group` respects day type (D3 closed).
4. Generation is ranked and varied, with anti-repeat proven against `bootcamp_class_logs` (D4).
5. Swan Coach drives selection with a stated reason per exercise; **AI failure still ships a valid
   class** (D5 closed, fail-open to deterministic).
6. The Class Runner runs a full class start→finish, unattended, fullscreen, wake-locked, with
   audio cues, on a 4K TV — proven by a real run, not a unit test.
7. One-tap swap works mid-class and preserves day type + equipment + intensity + joint safety.
8. `packages/bootcamp-core` has zero SwanStudios imports and its test suite passes standalone.
9. Attendance logs back to client progress (if §8.5 = yes).
10. Rule 73/74 satisfied: current-session proof + a hostile dry-loop that runs clean.

---

## 11. ARCHITECTURE REVISIONS — KIMI K3 ADVERSARIAL PASS (accepted 2026-07-30)

Full review: `docs/ai-workflow/AI-HANDOFF/BOOTCAMP-V2-CONSULT-KIMI-2026-07-30.md`
(6,056 in / 6,500 out, $0.1157, 205s). Each finding below was **independently assessed**, not
accepted on authority. Verdict on the spine: **constraint-first survives** — the revisions are to
§6.1's internals, not its order.

### R1 — Anti-repeat is a PREFERENCE, not a legality constraint `[ACCEPTED — category error]`
§6.1 Layer 1 listed "anti-repeat vs class log" as legality. Kimi's counterexample is decisive:
upper day + strict equipment leaves ~8 legal exercises; 6 were taught Tuesday; a legality rule
leaves a pool of 2 for 12 slots. The engine then either fails closed (violating "the class always
generates") or silently relaxes — **reintroducing D1 through the back door with no code comment to
blame.**
→ **Move anti-repeat to Layer 2 ranking.** Layer 1 holds only hard legality: day-type contract,
equipment availability, hard joint-load exclusions. *Note: main's existing 14-day freshness
exclusion (§2.5b) is currently a hard filter — V2 must demote it to a ranking penalty.*

### R2 — Aggregate pain flags must NOT drive pool exclusion `[ACCEPTED]`
Rule 8 gives Layer 1 `knee_sensitive: 3` with no way to tell 3-of-14 from 12-of-14. Blanket
exclusion destroys the class for 11 healthy people; ignoring it is a liability.
→ **Per-person Board 2/3 modifications are a display-time + Layer-2 concern** (the boards already
exist, §2.6). Layer 1 may hold a *class-level joint-load budget* (§5.10) but **never blanket
exclusion**. Spell out which of the two Layer 1 does — the original diagram didn't.

### R3 — The relaxation ladder is the most important missing object `[ACCEPTED — new artifact]`
Layer 3 said "rejected and deterministically backfilled" without defining behavior on
**insufficiency** (pool can't fill the structure math). Backfill from an exhausted pool is empty;
backfill from a non-exhausted pool overrides the brain with exactly the ranking-bypass D4 was.
→ **Define an explicit, ordered relaxation ladder** — which constraint yields 1st, 2nd, 3rd — and
**surface which one relaxed** in the class explanation. Add a DoD item asserting *which* constraint
relaxed, not merely that the result was legal.

### R4 — §4-E (Open Gym) directly contradicts §6.1 `[ACCEPTED — my own error]`
§4-E: the brain "proposes freely and states its equipment assumptions." §6.1: the brain "may NEVER
introduce an exercise outside the pool." **A brain proposing against no equipment profile IS
proposing constraints.** Both sentences are mine and they cannot both hold.
→ **Resolution:** add a formal **assumption-declaration channel** on Layer 2. In Open Gym mode the
brain emits `{selection, declaredAssumptions[], rationale}`; Layer 3 validates that assumptions are
*stated and equipment-plausible* rather than validating against a profile that doesn't exist. Open
Gym is an explicit, named mode with its own validation rule — not a silent bypass.

### R5 — The DoD can pass with a DECORATIVE brain `[ACCEPTED — most important finding]`
DoD #1–#4 are all legality tests. The validator re-checks Layer 1 only, so a class with three
consecutive posterior-chain stations **passes**. V2 could ship, pass all ten items, and be
indistinguishable from the deterministic fallback — *the §2.4 two-brain split surviving the rebuild
in a trench coat.*
→ **New DoD #11: a judgment regression suite.** Fixed pool + fixed history; brain output must beat
the ranked-deterministic baseline on defined sequencing/variety/fatigue metrics. Also **instrument
the fallback rate** — otherwise the brain can be down for three weeks unnoticed.

### R6 — Class start FREEZES an immutable constraint snapshot `[ACCEPTED]`
Mid-class swap (DoD #7) queries a pool — against the live profile or a snapshot? If another admin
(or Sean's own phone) edits the equipment profile at minute 15, live-profile swaps can suggest
equipment not in the room.
→ **Snapshot at class start. All mid-class operations validate against the snapshot. Profile edits
apply to the next class.** Not stated anywhere in the original §6.

### R7 — Phone remote has TWO WRITERS and no defined authority `[ACCEPTED]`
The laptop clock auto-advances while the phone issues commands. Undefined authority means Sean taps
pause on a 4-second-stale screen and the command lands in the wrong phase, skipping a station.
→ **Laptop is single source of truth.** Every `RunnerState` carries a monotonic sequence number;
phone commands carry a base-version and are **idempotent** (pause-while-paused = no-op, not error);
rejected commands trigger full-state resync.
→ **Transport must be LAN-direct** (WebSocket/WebRTC over gym Wi-Fi, or laptop-hosted hotspot).
Cloud relay dies at exactly the moment §5.3 exists to survive.

### R8 — Wake-lock reality is worse than §5.1 assumed `[ACCEPTED — verify at build time]`
Three facts to design against: (a) `navigator.wakeLock` is **released on `visibilitychange`** and
must be re-requested — one alt-tab at minute 8 silently kills it; (b) iOS Safari support only from
16.4, so an older phone remote sleeps; (c) **wake-lock protects the laptop, not the TV** — consumer
TVs have their own sleep/auto-off timers no web API can touch.
→ Detect denial/loss → **persistent on-screen warning + audio heartbeat**; treat wake-lock loss as a
loud failure, never silent; ship TV-settings setup documentation as a product feature.

### R9 — Runner runtime hazards not in §5 `[ACCEPTED]`
- **Audio autoplay policy:** the first beep is blocked until a user gesture → **the Start button
  must be the gesture that unlocks the `AudioContext`**, and this must be tested.
- **Backgrounded-tab throttling:** §6.2's monotonic clock fixes *drift* but not a background tab
  where `requestAnimationFrame` stops entirely → drive ticks from `setInterval`/Web Worker/WebAudio
  clock, not rAF.
- **Tab crash/OOM** from pre-cached 4K video → checkpoint `RunnerState` to IndexedDB every phase
  transition; reload resumes in place. Nearly free given the pure state machine.
- **Auth/session expiry at 5:58am** — a cold laptop, an overnight browser update, an expired
  session. Kimi rates this *the most probable week-one failure*, and §5/§10 never mention Runner
  session survival. **Accepted: the Runner must survive an expired session for an already-loaded
  class.**
- **Cache pre-flight:** §5.3 said "pre-cache" with no size budget and no degradation rule →
  set a budget, define video→image→text degradation, and **gate the Start button on "class fully
  cached ✓"**.
- HDMI unplug → fullscreen exits onto the wrong display; Bluetooth speaker drop.

### R10 — Week-one gaps at 6am `[ACCEPTED]`
1. **The TV's own sleep/screensaver/input-switch** — week one it reverts to the cable box.
2. **Audio over gym music** — TV speakers vs a 6am playlist are inaudible. Cue routing (PA vs TV),
   independent volume, music ducking. This is *upstream* of open-Q6 (beeps vs voice).
3. **Latecomers** — §5.4 handles *Sean* starting late, not half the room arriving at 6:07.
   Warmup loop-until-ready + late-join cue.
4. **Small-class collapse** — §8 assumes 8–16; **the real 6am class is 4.** Station math for 12
   yields empty stations and dead transitions. Merge-stations / convert-to-full_group rule needed.
5. **Zero-decision mornings** — "generate tonight, run tomorrow": saved template → one-tap start
   should be the *default* Runner entry (templates already exist, §2.1).
6. **Turnover between classes** — 6:45 end → 7:00 start. `complete` must exit to a reset state with
   an equipment-reset checklist and the next class queued.
7. **Substitute trainer** — Sean's sick day: QR-on-screen to join as remote, no login.
8. **Incident capture** — pausing for an injury should log exercise + person back to
   `painAwareGating`. Cheapest safety-credibility feature available.

### R11 — Portability is ASSERTED, not demonstrated `[ACCEPTED — DoD #8 was too weak]`
"Zero SwanStudios imports" is a lint rule; you can have zero imports and total semantic coupling.
Four queued leaks:
- **`DayType` is the Swan leak wearing a generic name** — shipping
  `'lower_body'|'upper_body'|'cardio'|'full_body'` in core *is* Sean's gym schedule with the
  imports removed. → day types must be a **registry/config object injected into the constraint
  engine**, not a union type in core.
- **Board 1/2/3 is Swan pedagogy** → modification variants go behind a `ModificationPolicy` port or
  a generic `variants[]` on Exercise; never first-class fields on `ClassPlan`/`RunnerState`.
- **`Exercise` will be shaped by `exerciseRolodexBridge`** (setup-time, media-readiness, 4K preview)
  and the muscle taxonomy (`anterior_deltoid`) is Swan's → core defines a **minimal taxonomy** with
  adapter-side mapping.
- **`BrainPort` will calcify around the Swan Coach prompt** — `knee_sensitive: 3` is Swan's pain
  model in a generic hat. One implementation = zero forcing function for generality.
→ **DoD #8 is replaced:** the import scan is the *floor*. The real proof is a **second reference
adapter** — a tiny in-memory demo app inside `bootcamp-core`'s own test suite implementing all five
ports with fake data and running a full class end-to-end. **If the fake app needs to know what a
"board" is, the seam failed.**

---

## 12. PRODUCT REVISIONS — OPUS 5 PASS (accepted 2026-07-30)

Full reply: `docs/ai-workflow/AI-HANDOFF/BOOTCAMP-V2-CONSULT-OPUS5-2026-07-30.md`
(9,486 in / 16,000 out). **⚠ Truncated at the completion cap** mid-§2.2 — the swap-interaction
deep-dive (§4-F) and the ranked cut list of §5 were **not delivered**. Everything below is what
landed and is assessed as sound.

### P1 — §6.3 was designed as an AMRAP screen, not a circuit screen `[ACCEPTED — my worst error]`
> *"During work, 14 people are doing **4 different things simultaneously**. One-exercise-huge tells
> 10 of them nothing."*

§6.3 specified "current exercise **huge**, its video auto-playing." That is correct for warmup,
full-group, and finishers — and **wrong for the station circuit Sean actually teaches**. This
invalidates the single-screen design and replaces it with a screen inventory (P6).

### P2 — Laptop and TV are DIFFERENT screens, not a mirror `[ACCEPTED — supersedes Kimi R7 transport]`
HDMI is a **second display of the same machine**, not a cast. → Open the Runner as a **separate
same-origin window** dragged to the TV; the laptop keeps a **Trainer Console**. Sync via
**`BroadcastChannel`** — same-origin, **zero network**, immune to gym Wi-Fi.

> **Contradiction resolved in Opus 5's favor.** Kimi R7 prescribed LAN-direct WebSocket/WebRTC
> because it assumed laptop and TV were separate devices needing network sync. They are not.
> `BroadcastChannel` removes the hardest networking problem from the critical path entirely, and
> **demotes the phone from critical path to a floor convenience.** Kimi's *authority* rules (single
> source of truth, monotonic sequence, idempotent commands) still apply — to the phone link only.

### P3 — 20-foot legibility is physics, and it caps grid density `[ACCEPTED — hard constraint]`
Signage rule cap-height ≥ distance/150 for a mixed-age, out-of-breath audience. At 20 ft that is
**40.6 mm cap height ≈ 58 mm font**.

| TV | Min font (1:200) | **Design target (1:150)** | **Max station cards** |
|---|---|---|---|
| 55″ | 6.4 vh | **8.5 vh** | **4** |
| 65″ | 5.4 vh | **7.2 vh** | **6** |
| 75″ | 4.7 vh | **6.2 vh** | **8** |

Consequences: **size in `vh`/`cqh`, never `px`** (which also makes Rule 24's 2560×1440 / 3840×2160
free); when `stationCount > cardCapacity(tv)`, **do not shrink cards** — cross-fade the grid in
halves, or fall back to rotation-only + **printed station cards taped at each station** generated
from the same `ClassPlan` (**paper is a first-class output, not a legacy artifact**); and store
`tvDiagonalIn` + `maxViewDistanceFt` on `BootcampSpaceProfile` so the Runner **adapts density
automatically**.

### P4 — KILL LLM-authored prose reasons `[ACCEPTED — composes with Kimi R3]`
§6.1 had the brain "return a REASON per exercise." But Layer 3 **rejects and backfills** — so some
rendered reasons would be **fabricated justifications for exercises the brain never chose.** Worse
than no reasons, and a Rule-75 (Trailhead-Truth) violation waiting to happen.
→ Reasons become **structured facts emitted by Layer 1/3**, rendered as chips:
`{tag:'targets', value:'glutes'}` · `{tag:'anti_repeat', value:'not used 3 weeks'}` ·
`{tag:'low_impact', value:'2 knee flags'}`. **The LLM may rank and order; it may not narrate.**
Chips are also legible at 20 ft where prose is not, and they survive backfill because they derive
from the *final* plan.

### P5 — Design the `ClassPlan` JSON document FIRST `[ACCEPTED — reframes §6.2]`
Runner, PDF, phone card, log-back, offline cache, and the portable core are all pure functions that
**produce or consume `ClassPlan`**. §6.2 led with folders; folders are the wrong first artifact.
**The reusable asset is the schema, not the constraint engine.** This is a better answer to
portability than the folder tree — and it composes with Kimi R11: schema-first + a second reference
adapter is the real proof.

### P6 — Screen inventory (replaces the single screen in §6.3) `[ACCEPTED]`
| ID | Phase | Layout |
|---|---|---|
| **S0** | Lobby/Setup | Floor map + equipment per station + group colors + "starts in 3:00" — **participants set up their own stations**, removing Sean's setup lap |
| **S1** | Warmup | Hero, one exercise, looping (synchronized — hero is correct here) |
| **S2** | Work (circuit) | **Clock band + N station cards** ← the primary screen, per P1 |
| **S3** | Transition | Clock huge + `MOVE →` + rotation diagram + next-per-station small (the one screen where density is fine — everyone is walking and looking) |
| **S4** | Rest (in-station) | Clock huge + **next exercise's demo + one cue** — turns dead time into instruction |
| **S5** | Full-group/AMRAP/finisher | Hero — §6.3's original design, correctly scoped |
| **S6** | Cooldown | Hero stretch + hold timer + auto-advance — the thing that always gets skipped, automated so it can't be |
| **S7** | Complete | Work time · rounds · **Gilded Fern moment** · 3-tap feedback — capture §5.12 *here*, while Sean is standing in front of it |

Plus two craft details: **persistent wall-clock end time** (`ENDS 6:47`, top-right, small — costs
one line, people love it), and **hierarchy decays across rounds** — round 1 the exercise *name*
dominates (people are learning it), rounds 2+ the *rep scheme* dominates and the name demotes.
Almost no product does this.

### P7 — One user gesture must acquire everything `[ACCEPTED — composes with Kimi R9]`
Fullscreen, Wake Lock, `AudioContext.resume()`, and the first `video.play()` **all require user
activation and must happen in the SAME `onClick` handler** on Start Class. Split across a promise
chain → silent audio on some browsers, no video on others. One function, tested on the real laptop.

### P8 — Absolute deadlines, not accumulated ticks `[ACCEPTED — corrects both §6.2 and Kimi R9]`
Store an **epoch-ms `segmentEndsAt` per segment**; render with `requestAnimationFrame`; use
`performance.now()` only for sub-frame smoothing. Then background throttling degrades **render
rate, never correctness**, and laptop sleep becomes recoverable: on resume, diff wall clock and
offer **"You lost 4:12 — resume here / skip ahead / extend class."** This is a better mechanism
than my `performance.now()` tick spec *and* than Kimi's setInterval/Worker prescription.

### P9 — The competitive truth `[ACCEPTED — should govern prioritization]`
> *"A whiteboard and a phone timer are a very good product."*

Three axes only: **(1) Give Sean back the demo** — ~8 demos × 3 classes/week ≈ **21 min/week of
instruction returned**; that is the ROI story. **(2) Make participants stop asking the five
questions** — *what am I doing / how long / what's next / how do I do it / what if my knee hurts*.
Answering #5 on screen is a **dignity feature**: the 58-year-old with a bad knee gets the low-impact
option without raising a hand in front of 13 people. **(3) It remembers** — the only axis where
software structurally wins.

**Adoption is killed by setup friction, not missing features.** If getting a class on the TV takes
more than ~45 seconds and one decision, Sean uses the whiteboard permanently and the build is dead.
→ Opening the surface **resumes today's plan**; **one** primary action (`Start Class`, ≥64px);
"Move me to the TV" affordance; plan-identical PDF as disaster recovery.

---

## 13. SYNTHESIS — WHAT THE BUILD IS

The two reviews **compose** rather than conflict; one genuine contradiction (transport) resolved in
§P2. Net effect on the original plan:

**Survives:** constraint-first three-layer spine (§6.1 order), scope lock (§8.1), log-back (§8.2),
the D1–D3/D5 diagnosis, all Rule-7 constraints.
**Corrected:** D4 was already fixed on main · anti-repeat demoted to ranking (R1) · pain flags out
of pool exclusion (R2) · Open Gym gets a formal assumption channel (R4) · prose reasons killed for
structured chips (P4) · single Runner screen → 8-screen inventory (P1/P6) · mirror → console+audience
over BroadcastChannel (P2) · tick-accumulation → absolute deadlines (P8) · folders → schema-first (P5).
**Added:** relaxation ladder (R3) · judgment regression suite (R5) · constraint snapshot at class
start (R6) · wake-lock/TV-sleep reality (R8) · runtime hazards incl. session survival (R9) ·
week-one gaps incl. **the real 6am class is 4 people** (R10) · second reference adapter (R11) ·
20-ft physics capping grid density (P3) · setup-friction budget (P9).

### Proposed slice order (each independently shippable, Rule 68 shape)

| # | Slice | Why first |
|---|---|---|
| **0** | **`ClassPlan` schema + fixtures** | P5 — everything downstream is a pure function of it. Nothing else can be built correctly first. |
| **1** | **Day-type contract v2** — primary-muscle inclusion + explicit exclusions + volume budgets; kill the `core`-in-all-four `.some()` leak | Closes D1, the actual complaint. Shippable alone; immediately improves every class. |
| **2** | **Relaxation ladder + validator insufficiency behavior** (R3) + fact-chip emission (P4) | Makes slice 1 safe under a narrow equipment profile. |
| **3** | **Day-aware finishers (D2) + full-group distribution (D3)** + **`pacing` field (AMRAP/EMOM/Tabata)** — Sean ratified 2026-07-31 ("do what's recommended"): class styles ride into V2 as a block-level pacing member of the schema, designed here where finisher blocks live | Completes the correctness story and preserves the shipped class styles. |
| **4** | **Layer 2 brain integration** + Open Gym assumption channel (R4) + fallback instrumentation + judgment regression suite (R5) | The AI ask. Gated behind 1–3 so the brain can't paper over broken constraints. |
| **5** | **Runner core**: state machine on absolute deadlines (P8), IndexedDB checkpointing, one-gesture acquisition (P7), BroadcastChannel console↔audience (P2) | The engine, headless and testable. |
| **6** | **Audience screens S0–S7** (P6) with the `--tv-*` vh scale + density adaptation from `BootcampSpaceProfile` (P3) | The visible product. Routes through `swan-design-router` (Rule 40). |
| **7** | **Trainer Console + one-tap intelligent swap** against the frozen snapshot (R6) | §4-F. *Opus 5's deep-dive here was truncated — worth a targeted re-consult before building.* |
| **8** | **Attendance + progress log-back** (§8.2) incl. the guest/walk-in path (R10.c) | Closes the Product Core Loop. |
| **9** | **Offline pre-cache + pre-flight gate + degradation ladder** (R9) | Makes it survive a real gym. |
| **10** | **Floor Card (phone)** — idempotent commands, optimistic echo, invisible degradation (P2/R7) | Genuinely last, because P2 demoted it. |

**Open items before slice 7:** Opus 5's truncated swap-interaction and ranked cut list; Sean's TV
size + farthest-station distance (P3); open-Q4 weekly schedule (P9's resume-today's-plan depends
on it); open-Q5 real class size (R10.4 says design for **4**, not 8–16); open-Q6 audio, now
downstream of R10.2 "can anyone hear it over the music at all."

---

## 14. THE SWAP INTERACTION — OPUS 5 FOLLOW-UP (accepted 2026-07-30)

Full reply: `docs/ai-workflow/AI-HANDOFF/BOOTCAMP-V2-CONSULT-OPUS5-SWAP-2026-07-30.md`
(2,678 in / **15,030 out**, `finish_reason: stop` — complete). This is the §4-F / slice-7 spec.

### S1 — The primitive: `SwapDeck`, an inversion of the Rolodex
> *"The Rolodex's fatal flaw is not that it's a list. It's that it's **stateless**… Browsing is not
> the cost. **Verification is the cost.**"*

**Rolodex = browse → verify → pick → confirm. SwapDeck = decide → commit.** The system verifies
*before* the trainer touches anything and renders **three already-legal candidates in place of** the
exercise being replaced. `ExerciseRolodexPanel.tsx` survives **unchanged** as a demoted 4th tile,
`Browse all (142) →` — the escape hatch, not the front door.

One component, three densities keyed off `SwapContext.moment`:

| Moment | Surface | Taps to commit |
|---|---|---|
| **Build** (desktop) | Inline row expansion + delta preview (setup ±s, pattern shift, balance bar) | 2 · keyboard `s` / `←→` / `Enter` |
| **Pre-class** (60s, one hand) | Pre-flight list of **only flagged rows**, each pre-expanded to rank-1 with one `Use this` | 1 per row — **0 if nothing flagged** (screen is just `Start class`) |
| **Live** (phone, 20s) | Bottom sheet, thumb zone, 88px rows, ≤2 chips, no scroll/search/images | **2** |

**No mid-class confirmation dialog.** Confirmation is haptic + the TV state change; the net is an
**8-second undo toast**. A dialog costs a guaranteed tap every time to guard a 1-in-20 mistake.

### S2 — Ranking: exactly 3, deterministic tiers, moment-weighted
Three because Hick's law puts a 3-option decision at ~1.5s vs ~3s at 8, and three 88px rows is the
one-handed thumb arc without scroll.

`T0` hard filter (frozen snapshot — day-type legal · equipment present **and not committed to
another station this round** · not already used this class · not high-severity contraindicated) →
`T1` joint safety → `T2` movement fidelity (pattern > muscle > region) → `T3` setup delta →
`T4` anti-repeat *(preference — never a filter, per R1)* → `T5` novelty/favorite.

`moment` selects a **weight vector, not a different algorithm**. Live: T3+T1 dominate ~3×, T5 → 0
("the dumbbells are already there" beats "this is more interesting"). Build: T4/T5 carry weight,
T3 nearly none.

**Why-chips: ≤2 per candidate, closed enum, ordered by the tier that actually drove the rank** —
`same pattern` · `same kit` · `no setup` · `knee-safe ×3` · `low impact` · `not used 6 wks` · `new` ·
`coach favorite`. Three chips is a paragraph at 6am. The `×3` is the **aggregate**, carrying urgency
without a name (Rule 8 by construction). **Chip colour: cyan = structural, gold = earned/history,
gold outline = relaxed. Purple is FORBIDDEN here** — purple means AI-coach, and these chips are
deterministic; a purple chip lies about provenance.

### S3 — The relaxation ladder, surfaced (answers R3)
**Must never dead-end — mid-class a dead end is a stalled class in front of 14 people.** Each rung
relaxes exactly one constraint:

`R0` nothing (hard floor) → `R1` anti-repeat across weeks → `R2` novelty → `R3` pattern fidelity →
`R4` not-used-in-*this*-class ("the board says the same word twice") → `R5` equipment → bodyweight
regression → `R6` structure (no swap exists).

**R5 is a mathematical guarantee, not a search:** pin an **"always-legal 12"** — squat/hinge/push/
pull/carry/core × 2 variants, low-impact, zero-equipment, legal in every room profile. R5 therefore
cannot return empty; R6 is reachable only if the trainer *rejects* bodyweight.

**Never render an empty state.** The deck always has three rows. Any row from R1+ → header becomes
`Swap station 3 — no exact match`, each relaxed row gets a **gold outline** + one chip naming the
bent rule. The trainer chooses which rule to break, knowingly, in one glance. At R6 the deck offers
two structural outs instead of exercises: `Hold station 3 longer (tempo/iso)` or `Drop station 3 →
3 stations, 5 per station`. **The system never says no.**

Ladder volume by moment: **build = loud** (a plan defect deserves a modal) · **pre-class = one
flagged row** · **mid-class = silent until asked** (never a proactive warning during a live class).

### S4 — Blast radius
**Default scope: all remaining rounds.** The cause (bad knee, broken rack, movement failing at
scale) doesn't resolve in four minutes, and a station that changes every round is **unreadable at
20 ft** — it breaks the mental model 14 people just memorised.

**Default timing: commits at the NEXT ROUND BOUNDARY, not instantly.** Mutating a station mid-set is
exactly what makes fourteen heads look up confused, and the immediate individual need is already
served by the mod line (S5). Long-press → `Change now` for a true emergency.

TV, two anti-flicker states: **pending** = thin cyan bottom rule + `next round: …` at ~40% size (no
animation, no toast, no modal, ever); **applied** = lands *inside the round-transition screen that
already exists* (free attention), 400ms cross-fade on that one card + 2s cyan underline pulse. No
board re-render, no reflow.

**Undo:** 8s (not 5 — the trainer's eyes are on the room), Floor Card + console only, **never on the
TV**. After the window, undo is *not a stack* — the previous exercise is re-injected at rank 1 with a
`was here` chip. Every swap appends to `ClassPlan.log`
`{actor, moment, stationIdx, from, to, rung, appliedAtRound, ts}` — the feed for anti-repeat.

### S5 — The dignity case: **swap is a station tool, never a person tool** `[the most important rule]`
> *"There is no per-person swap. Ever."* — enforce it **in the type system.**

Three independent reasons, any one sufficient: (1) the data model forbids it — the system knows
`knee_sensitive: 3`, not Jane, and a person-level swap requires naming a person, which is the exact
announcement Sean is avoiding; (2) wrong blast radius — changes the board for 14 to serve 1;
(3) it is **invisible to its beneficiary** — the TV shows stations, not people, so it is a control
with no output.

**Decision rule: the mod line handles the person; the swap handles the station.** Escalate only when
the mod line cannot fix it for everyone in the rotation (≥2 flagged at that station, equipment
broken/occupied, form breaking down across the group, or the coach simply doesn't like it).

> **⚠ Concrete defect in this packet, called out by Opus 5:** the mid-class model as written makes
> **swap the primary station action. Invert it.** Pointing at a mod happens **~5×/class**; swapping
> **0–1×/class**. Tapping a station must open **Mods** (three lines at arm's-length legibility) with
> `Swap station` as a *secondary* button underneath.

Close the loop at build time with one anonymous zero-friction tap — **`mod used`** (a tally, no name,
no dropdown). Post-class: *"the knee mod was used in 3 of the last 4 classes at the squat station —
replace it in the template?"* The individual accommodation becomes a **plan improvement**, and no one
is ever named.
**Aggregate flag counts must NEVER render on the TV.** `knee ×3` is console/Floor-Card only —
leaking it to a 55″ screen builds the exact opposite of a dignity feature.

### S6 — Surface split + one architectural hole
**Floor Card only:** current round + mirrored `ENDS 6:47` (so the coach never turns around) ·
**station mod lines — the highest-value item on the device** · aggregate flag chips · `mod used` ·
`±30s`/pause · `Swap station` (secondary) · undo toast.
**Never on the Floor Card:** attendance editing, full library browse, plan restructuring, video,
analytics, anything needing two hands.
**Console only:** TV/fullscreen/WakeLock ownership · timer master · round transitions · music duck ·
**the full relaxation ladder with rung labels** · attendance/latecomers/rebalance · drag-reorder ·
structural fallback · save-as-template · `Browse all`. **The console must survive 40 minutes of
abandonment — no session expiry, no modal that can occlude the TV window.**

> **⚠ Hole to name:** laptop↔TV is same-origin `BroadcastChannel` (zero network, correct). **Phone↔
> laptop is NOT** — different device, different origin. If the Floor Card is assumed to be a live
> controller, **the network you removed in P2 is silently back.** Resolution consistent with
> demoting the phone: **the Floor Card is read-mostly with optimistic local writes and eventual
> sync; unreachable → it degrades to a pure cheat sheet**, which is ~80% of its value anyway. One
> writer per action, monotonic `ClassPlan` version, console wins ties.

### S7 — Cut from the swap feature
**Demo video/GIF thumbnails inside the swap flow.** Demos beautifully, dies at 6am: decode latency
in the one interaction that must be instant, layout shift on a 20-second budget, bytes on gym wifi,
and it competes with the chips for the only two seconds of attention. **Sean already knows all ~140
exercises in his own library — he needs *legality*, not *identification*.** Build-time only, behind
hover, lazy. Also cut: mid-class search-as-you-type · proactive "AI suggests a swap" nudges during a
live class · multi-level undo · starring favourites mid-class · drag-to-reorder on the phone.

---

## 15. RANKED CUT LIST — and what it CUTS from this packet

**Ship in V1** (V÷E ★★★★+): `ClassPlan` schema + freeze snapshot · one-click activation (absorbs
"TV sleep timers") · absolute-epoch `segmentEndsAt` + resume prompt · TV `vh` scale w/ max 4 cards
@55″ · **printed station cards** (zero-risk fallback for every failure below) · **mod lines always
visible** · `SwapDeck` live · relaxation ladder + always-legal 12 · **small-class collapse (n=4)** ·
zero-decision morning pre-flight · **no-auth local run + IndexedDB + offline pre-cache** (collapses
session-expiry + gym-wifi + tab-death into one local-first fix) · latecomer counter ·
gym-music-survivable chime + volume · **swap/mod logging** (not the review UI — the log must exist
from class #1).

**Fast follow:** post-class review + `mod used` → template suggestions · class turnover reset ·
substitute-trainer QR (printed cards cover the gap) · incident capture · build-time delta preview ·
template library · polished `Browse all` · multi-swap shuffle · audio ducking.

**CUT — including four things this packet treated as mandatory:**
- ❌ **Per-person swap** — §S5. The mod line is the answer.
- ❌ **Phone-as-TV-mirror / cast-from-phone** — **delete the whole code path** (P2).
- ❌ **Live cross-device sync as a hard requirement** — degrade the Floor Card to a cheat sheet.
- ❌ **Anti-repeat as a legality constraint** — ranking preference only (re-affirms R1).
- ❌ LLM prose reasons (re-affirms P4) · demo video in swap flow · mid-class search · proactive AI
  swap nudges · multi-level undo · participant-facing app · leaderboards (only coherent for AMRAP,
  not stations) · analytics dashboard v1 ("the whiteboard already solved this: Sean remembers").

### Slice-order amendments from §15
- **Slice 9 → V1**, merged into slice 5: local-first (no-auth run + IndexedDB + pre-cache) is one
  fix for three failure modes, not a late hardening pass.
- **Small-class collapse (n=4) enters slice 1**, not a follow-up — an 8–16 engine is wrong on day one.
- **Slice 10 (Floor Card) is re-scoped**: cheat-sheet first, controller second.
- **Swap/mod logging lands with slice 8**, before the review UI.

---

*End of master prompt. §2 file paths are wip-tree; §3/§2.5b re-verified against
`origin/main@eb8e9bb52`. §11 = Kimi K3 · §12 = Opus 5 (truncated) · §13 = Claude synthesis ·
§14–15 = Opus 5 swap follow-up (complete).*

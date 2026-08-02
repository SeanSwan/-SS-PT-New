# SwanStudios Bootcamp Rolodex Brain — Decision-Complete Build Blueprint

**Target builder:** Qwen-80B
**Authored by:** Opus 5, arbitrating a panel of Kimi K3 + Tencent HY3
**Date:** 2026-08-02
**Issue:** SWA-105 · builds on shipped slices 0–2
**Status:** BUILD-AUTHORITATIVE. Every decision in this document is final.

---

# 0. PRIME DIRECTIVE — read this before anything else

> **You build. You do not decide.**

Every algorithm, constant, threshold, field name, enum member, tie-break, fallback, colour token, breakpoint, and acceptance test in this document has already been decided by a panel of frontier models and arbitrated by the final decider. Your job is to render those decisions into working code.

**Rules for you, absolute:**

1. **Never substitute your own judgment for a value in this document.** If it says `NOVELTY_FLOOR = 0.30`, it is 0.30. Not 0.25, not "configurable, defaulting to 0.3 which seems reasonable."
2. **Never invent a colour, a spacing value, a font size, or a breakpoint.** They are all in §11 and §12. If you need one that is not listed, you have misread the spec — re-read it.
3. **Never invent an enum member.** All enums here are CLOSED. Adding a member is a product decision you do not have authority to make.
4. **If something is genuinely unspecified, STOP and say so** in a clearly marked `UNSPECIFIED:` block at the end of your output. Do not fill the gap. A named gap is useful; a guess is damage.
5. **Do not refactor, improve, tidy, or modernise code you were not asked to touch.** Match the surrounding style even where you would write it differently.
6. **Do not add libraries.** The stack is fixed (§1.3).
7. **You may reason in the style of the frontier models that wrote this** — meaning: state assumptions, prefer the simplest construction that satisfies the spec, and write the test before you claim the code works. You may not reason your way to a different design.

**What "done" means here:** every acceptance criterion in §13 for the slice you are building passes, verifiably, with output you can show. Not "should pass." Passes.

---

# 1. CONTEXT

## 1.1 The product

SwanStudios is a trainer-led personal-training platform. This blueprint concerns the **Bootcamp Creator** — the tool a trainer uses to generate a group fitness class built from stations. Participants rotate between stations in groups, all at the same time.

The design context is **6am on a gym floor**: a tired trainer, a phone in one hand, fourteen people waiting. Every decision below optimises for *glanceability* and *fewest taps*, not for completeness of information.

Real classes run as small as **4 people**. An engine built for 12 breaks at 4.

## 1.2 What is already built (DO NOT REBUILD, DO NOT REGRESS)

Shipped in slices 0–2, all tests green:

| Location | What it does |
|---|---|
| `shared/bootcamp-core/classPlan.mjs` | The `ClassPlan` document schema. Time-relative (stores durations, not timestamps). Attendee state is **aggregate counts only** (`{knee: 3}`) — no person is representable, so the privacy rule holds by construction. |
| `shared/bootcamp-core/taxonomy.mjs` | Movement taxonomy: `PATTERNS`, `REGIONS`, `JOINTS`, `IMPACT_LEVELS`, `OPPOSING_PATTERN`, `normalizeMovement()`. |
| `shared/bootcamp-core/dayTypes.mjs` | Day-type registry as injected config + `checkDayTypeLegality` + `checkVolumeBudget`. |
| `shared/bootcamp-core/relaxation.mjs` | The relaxation ladder R0–R6 + `runLadder()` + `summarizeRelaxations()`. |
| `shared/bootcamp-core/chips.mjs` | Fact-chip derivation, `CHIP_TONE`, `deriveChips()`. |
| `shared/bootcamp-core/constants.mjs` | Closed enums: `CHIPS`, `RUNGS`, `RUNG_CONSTRAINT`, `RUNG_CHIP`. |
| `shared/bootcamp-core/validate.mjs` + `validateSlots.mjs` | Structural validation incl. the insufficiency invariants. |
| `backend/services/bootcamp/dayTypeContract.mjs` | Swan adapter: maps Swan exercises into core movements, applies the contract via the ladder. |
| `backend/services/bootcamp/alwaysLegal.mjs` | The pinned 14-movement zero-equipment set that makes rung R5 non-empty. |
| `backend/services/bootcamp/bootcampGenerator.mjs` | The generation pipeline. **810 lines — already over the 300-line cap.** See §14 item 8. |

**The ladder's existing meaning** (you will modify exactly one rung, in §6.3):

```
R0 hard floor · R1 anti-repeat · R2 novelty · R3 pattern fidelity
R4 not-used-this-class · R5 equipment→bodyweight · R6 structural outs
```

**The existing chip discipline, which you must preserve:** chips are a closed enum, max 2 per row, derived from the FINAL plan (never from a rejected attempt), and a relaxed selection is *structurally required* to name the rule it bent — the validator rejects a plan that hides a relaxation, and rejects a clean row wearing a badge it did not earn.

## 1.3 Stack (fixed — add nothing)

Backend: Node.js ESM, Express, Sequelize, PostgreSQL.
Frontend: React 18, TypeScript, **styled-components only** — no Material-UI, no Tailwind, no CSS modules.
Charts: **Victory only.**
Files: **300 lines maximum.** Split by extracting hooks, helpers, styles, or types.

---

# 2. THE TWO RULINGS THIS BLUEPRINT IMPLEMENTS

These come from the product owner directly. They are the reason this work exists.

## Ruling D-A — Vary the TREATMENT, never ban the exercise

> *"I need it to NOT ban popular exercises that are staples and used a lot. Instead it should be supersetting or drop-setting with the exercise the next time it sees it, to switch it up on that level — vs 'oh, that exercise is used, can't use it for a week.'"*

**What is wrong today:** `bootcampGenerator.mjs` pulls exercise *names* from the last 10 class logs within 14 days and removes them from the candidate pool entirely, before any ranking happens. The more useful a movement is, the more often it gets banned. **The system punishes its own best exercises.**

**What replaces it:** a staple stays in rotation permanently. Freshness comes from changing *how it is executed* — superset, drop set, tempo, cluster, isometric hold, density — recorded per class so the brain can rotate through treatments deliberately.

## Ruling D-B — Equipment setup is a scheduling constraint, not a label

> *"We can have people putting on and taking off bands while the other group is doing rows individually. Next exercise, one group is ready, the other is not. So if we use bands it needs to be at the beginning, and the workouts need to utilize the bands through the chain, so the cardio can take bands off. I need the brain to think of many situations like that in a bootcamp and prepare for it."*

**What is wrong today:** setup time is a per-exercise scalar (`estimateSetupTime` returns the MAX across an exercise's equipment). Putting on a band costs 15 seconds *every time a band exercise appears* — even if the participant is already wearing the band from the previous exercise.

**What replaces it:** setup cost belongs to the **transition between two consecutive exercises**, not to either one alone. Once modelled that way, "bands early, chained through, cardio strips them" is not a rule anyone writes — it is the cheapest solution, and the optimiser finds it. You are building the cost function, not the heuristic.

---

# 3. DECISIONS REGISTER

Every value the panel disagreed on, and the final ruling. **These are not suggestions.**

| ID | Question | Panel positions | **RULING** | Why |
|---|---|---|---|---|
| DR-1 | Novelty floor — what fraction of a class must be genuinely new movements? | Opus 0.40 · HY3 0.20 | **`NOVELTY_FLOOR = 0.30`** | At 12 work slots that is 4 new movements per class: a 3×/week attendee meets something new every session, while 8 slots stay available for staples-with-varied-treatment. One named constant, one place to tune. |
| DR-2 | Novelty lookback window | Opus "last 3 classes" · HY3 "21 days" | **last 3 classes** | Class-count is stable under irregular schedules; a 21-day window silently widens when the trainer takes a week off. |
| DR-3 | Doff cost as a fraction of don cost | Opus 0.4 · HY3 0.5 | **`DOFF_FACTOR = 0.5`** | Both defensible; 0.5 is rounder, easier for a trainer to sanity-check, and equally directionally correct. |
| DR-4 | Scheduling algorithm | Opus per-station rig-descending sort · HY3 greedy per-boundary min-max | **Opus's per-station sort (§8)**, plus HY3's `> 30s` escape trigger | Greedy per-boundary can strand later boundaries. The sort is provably contiguous, `O(S·E log E)`, and deterministic — which the UI *requires* (DR-9). |
| DR-5 | Treatment eligibility source | Opus: derive from existing fields · HY3: new attributes (`loadable`, `pairable`, …) | **Derive from existing fields (§5.2)** | HY3's version needs a labelling project across ~916 exercises before anything ships. Opus's needs zero new data. |
| DR-6 | Chip key format | Kimi `treatment.superset` · HY3 `tx:drop-set` · shipped: flat `snake_case` | **Flat `snake_case`** | The shipped validator and fixtures enforce flat strings against `CHIPS`. Existing-pattern-first; namespacing buys grouping we can get from a prefix convention. |
| DR-7 | Chip priority when more than 2 apply | Kimi: `relaxed > situation > treatment > rig` | **`relaxed > situation > treatment > rig > structural > earned`** | Kimi's catch is correct and was a real hole: treatment + rig + situation + ladder chips can legitimately reach 4 on one staple. The bent rule must never lose to a virtue. |
| DR-8 | Colour tokens | Kimi and HY3 each invented a palette | **REJECT both. Use the real Crystalline Swan palette (§11.1)** | Both models hallucinated hex values. The real palette is fixed. HY3 additionally assigned a chip to Wing Purple labelled "AI-coach" — **forbidden**, see DR-10. |
| DR-9 | Must the scheduler be deterministic? | Kimi: yes, the UI diffs plans across presses | **Yes — identical input MUST produce identical output** | The UI highlights rows that changed between Generate presses. A nondeterministic optimiser makes that highlight flicker and destroys trust in the highlight itself. |
| DR-10 | Purple chips | HY3 proposed Wing Purple for a situation chip | **FORBIDDEN** | In this product purple means *AI-coach*. These chips are deterministic. A purple chip lies about provenance. There is no tone that maps to purple. |
| DR-11 | Transition-cost visualisation | Kimi: CSS-grid table, not a Victory heatmap | **CSS-grid table with numeric cells; Victory for the stall bar chart only** | A matrix with printed values is more accessible than a scatter-with-squares and survives screen readers. Rule "Victory only" governs *charts*; a data table is not a chart. |
| DR-12 | Ineligible treatments in the payload | Kimi: omit, never render as disabled | **Omit entirely** | A disabled chip invites "why not?", and the answer needs prose. The eligibility predicate stays server-side and the UI never sees it. |
| DR-13 | `MAX` vs `SUM` when donning several implements | shipped code uses MAX | **SUM** | One person cannot don a band and drag a bench simultaneously. |

---

# 4. DATA MODEL CHANGES

## 4.1 Treatment + rig history — ZERO MIGRATION REQUIRED

`BootcampClassLog.exercisesUsed` is already a **JSONB** column. Extend the shape of each entry:

```json
{
  "exerciseKey":  "goblet_squat",
  "exerciseName": "Goblet Squat",
  "treatment":    "drop_set",
  "stationIndex": 1,
  "rigTokens":    ["dumbbell"]
}
```

Because the column is JSONB this is **purely additive — write no migration.** Rows written before this change simply lack `treatment`, which reads as `null`, which the selector treats as "never used" — the correct cold-start behaviour, for free.

> **This is the first thing you build (slice 3a) and it is non-negotiable ordering.** Every other part of Ruling D-A is unlearnable until treatment is recorded. A brain cannot rotate what it never wrote down.

## 4.2 New exercise columns — additive, nullable, deferred to slice 3g

| Column | Type | Null means | Used by |
|---|---|---|---|
| `spatialNeed` | `ENUM('wall','floor','corner','open')` nullable | unconstrained | Situation 4 |
| `noiseLevel` | `ENUM('low','moderate','high')` nullable | unconstrained | Situation 11 |
| `requiresSpotter` | `BOOLEAN` nullable, default `false` | no spotter needed | Situation 6 |

Absent value must reproduce today's behaviour **exactly**. Write the migration additive-only; never backfill with a guess.

---

# 5. THE TREATMENT ENGINE (Ruling D-A)

**New file:** `shared/bootcamp-core/treatments.mjs` (portable core — must not import anything Swan-specific).

## 5.1 The closed enum

```js
export const TREATMENTS = Object.freeze([
  'straight', 'tempo', 'density', 'iso_hold', 'unilateral', 'partial_range',
  'mechanical_drop', 'drop_set', 'cluster', 'contrast',
  'superset_antagonist', 'superset_compound_iso',
]);
```

`TREATMENT_ORDER` is this array's index order — it is the deterministic tie-break in §5.3. Do not reorder it.

## 5.2 Eligibility predicates — derived from data that already exists (DR-5)

Each predicate takes `(movement, exercise)` where `movement` is the normalised core movement (`pattern`, `impact`, `joints`, `primaryRegion`) and `exercise` is the Swan record (`equipment`, `easy`, `exerciseType`, `name`).

| Treatment | Eligible when | Source field |
|---|---|---|
| `straight` | always | — |
| `tempo` | `impact !== 'high'` | `movement.impact` |
| `density` | `impact !== 'high'` | `movement.impact` |
| `iso_hold` | `pattern ∈ {squat, lunge, hinge, push_horizontal, push_vertical, pull_horizontal, pull_vertical, isometric}` | `movement.pattern` |
| `unilateral` | `pattern ∉ {gait, rotate}` AND name does not already match `/single|one[- ]arm|one[- ]leg|split/i` | `movement.pattern`, `exercise.name` |
| `partial_range` | `pattern ∈ {squat, lunge, push_horizontal, push_vertical, pull_horizontal, pull_vertical}` | `movement.pattern` |
| `mechanical_drop` | `exercise.easy` is a non-empty string | `easyVariation` — **already populated in the Rolodex** |
| `drop_set` | `equipment ∩ LOADABLE ≠ ∅` AND `pattern !== 'isometric'` | `exercise.equipment` |
| `cluster` | `equipment ∩ LOADABLE ≠ ∅` | `exercise.equipment` |
| `contrast` | `equipment ∩ LOADABLE ≠ ∅` AND `impact === 'high'` | both |
| `superset_antagonist` | `OPPOSING_PATTERN[pattern]` exists AND a station partner has that pattern | `taxonomy.mjs` — **already exported** |
| `superset_compound_iso` | `exercise.exerciseType === 'compound'` AND a station partner shares `primaryRegion` and is not compound | `exerciseType` |

```js
const LOADABLE = Object.freeze(new Set([
  'dumbbell', 'kettlebell', 'resistance_band', 'mini_band', 'cable', 'machine', 'barbell', 'medicine_ball',
]));
```

**Safety is the point of this table, not decoration.** A drop-set plank is nonsense; tempo on a burpee is an injury. Implement these as a hard gate. An exercise whose eligible set is only `{straight, tempo}` is a low-variation exercise — that is fine and must not be forced.

## 5.3 The selection function — deterministic LRU

**Signature note — the two superset predicates need station context.** `superset_antagonist` and `superset_compound_iso` cannot be evaluated from one exercise alone; they need the other exercises at the same station. The selector therefore takes a fourth argument, `stationPeers` (the array of exercises already assigned to this station, possibly empty). Predicates that do not need it ignore it. **Do not thread station context any other way, and do not make the selector query anything.**

```
selectTreatment(exercise, movement, history, classBudget, stationPeers) -> treatment

1. eligible   = TREATMENTS.filter(t => predicate(t)(movement, exercise, stationPeers))   // always contains 'straight'
2. lastUsed   = history.lastTreatmentFor(exercise.key)                     // null if never seen
3. candidates = eligible.filter(t => t !== lastUsed)                       // never repeat consecutively
4. if candidates is empty -> return 'straight'
5. sort candidates by:
      (a) lastAppliedAt ASC   (null (never used) sorts first)
      (b) TREATMENT_ORDER index ASC          // deterministic tie-break — DR-9
6. return the first candidate that fits classBudget (§5.4); if none fit, return 'straight'
```

**Anti-oscillation is structural, not heuristic.** LRU over an eligible set of size *k* yields a cycle of length *k*; the `lastUsed` exclusion guarantees no repeat even at *k*=2. Two Generate presses with identical history must return the identical treatment (DR-9).

## 5.4 Class-level treatment budget

A class where every station is a superset is unrunnable at 6am.

| Constraint | Value |
|---|---|
| max stations carrying any `superset_*` | `floor(stationCount / 2)` |
| max stations carrying `drop_set` or `cluster` | `2` |
| min stations at `straight` | `1` |
| treatments per exercise | `1` |

---

# 6. NOVELTY BUDGET — what replaces the ban

**The 14-day name ban is DELETED.** Remove the exclusion path in `bootcampGenerator.mjs` that feeds recent names into `combinedExclusions`. Recent-use becomes a *composition* input, never a *pool filter*.

That distinction is the whole fix: **pool filters delete options; composition constraints shape the result.**

## 6.1 Constants

```js
export const NOVELTY_FLOOR   = 0.30;  // DR-1
export const NOVELTY_LOOKBACK = 3;    // DR-2 — classes, not days
```

## 6.2 The rule

**Definition of "work slot", so you do not have to decide it:** a work slot is a Board-1 (`board === 'main'`) exercise that is **not** a cardio finisher (`isCardioFinisher !== true`) and not a warm-up stretch. This is exactly the population that `requiredSlots` sizes — `stationCount × (exercisesPerStation − 1)` — because the last slot at each station is a finisher appended from `CARDIO_FINISHERS`, not drawn from the pool. Board-2 and Board-3 alternatives are never counted.

```
novelty = (# work-slot exercises NOT present in the last NOVELTY_LOOKBACK classes) / (total work slots)

REQUIRE novelty >= NOVELTY_FLOOR
REQUIRE every repeated exercise carries a treatment != its treatment at its last appearance
NO exercise is ever banned outright
```

If the pool cannot reach `NOVELTY_FLOOR`, do not fail and do not silently ship. Relax rung R1 (§6.3) and emit the chip `used_recently`.

## 6.3 Redefining ladder rung R1 — the one rung you change

In `shared/bootcamp-core/constants.mjs`:

```js
R1: 'anti_repeat'   →   R1: 'novelty_budget'
```

`RUNG_CHIP.R1` stays `'used_recently'`. The chip name is still honest and the shipped validator invariants keep working **unchanged**.

Do not add a rung. Do not renumber. Do not touch R0 or R2–R6.

### 6.3.1 EXACT blast radius of this rename — update these four places and nothing else

The constraint name is a **key** in the injected `constraints` object passed to `runLadder()`, so renaming it breaks callers and tests that use the old key. These are all of them, verified:

| File | Line | Current | Change to |
|---|---|---|---|
| `shared/bootcamp-core/constants.mjs` | 62 | `R1: 'anti_repeat',` | `R1: 'novelty_budget',` |
| `shared/bootcamp-core/relaxation.mjs` | 102 | JSDoc `{ anti_repeat\|novelty\|...` | `{ novelty_budget\|novelty\|...` |
| `shared/bootcamp-core/__tests__/relaxation.test.mjs` | 77 | `anti_repeat: (i) => !i.stale,` | `novelty_budget: (i) => !i.stale,` |
| `shared/bootcamp-core/__tests__/relaxation.test.mjs` | 83 | `['anti_repeat', 'pattern_fidelity']` | `['novelty_budget', 'pattern_fidelity']` |
| `shared/bootcamp-core/__tests__/relaxation.test.mjs` | 91 | `anti_repeat: (i) => !i.stale,` | `novelty_budget: (i) => !i.stale,` |

The test at line 88–96 is titled *"anti-repeat (R1) yields before pattern fidelity (R3)"*. **Rename the title to "novelty budget (R1) yields before pattern fidelity (R3)" but do not change its assertions** — the ordering claim it proves is still exactly right and still load-bearing.

This is the complete list. `rg -n "anti_repeat" shared/ backend/` must return **zero hits** when you are done. If it returns anything else, you have found a file this blueprint did not know about — report it under `UNSPECIFIED:` rather than editing it.

---

# 7. THE RIG TRANSITION MODEL (Ruling D-B)

**New file:** `backend/services/bootcamp/rigTransition.mjs`

## 7.1 Definitions

A **rig** is the normalised set of equipment tokens a participant wears / holds / stands at for one exercise. `bodyweight` and `none` normalise to the empty set.

```js
rig(exercise) = normalize(exercise.equipment)          // Set<string>, ∅ for bodyweight

don(t)  = EQUIPMENT_SETUP_TIMES[t]      // existing table in exerciseRolodexBridge.mjs — DO NOT EDIT IT
doff(t) = Math.ceil(don(t) * DOFF_FACTOR)              // DOFF_FACTOR = 0.5  (DR-3)

cost(A → B) =   Σ don(t)  for t ∈ rig(B) \ rig(A)      // new kit: put it on
              + Σ doff(t) for t ∈ rig(A) \ rig(B)      // dropped kit: take it off
              + 0         for t ∈ rig(A) ∩ rig(B)      // ALREADY RIGGED — the entire point
```

Sum, do not take the max (DR-13).

**Worked example — verify your implementation against this exactly:**

```
resistance_band don = 15, doff = ceil(15*0.5) = 8
dumbbell        don = 5,  doff = ceil(5*0.5)  = 3

cost({band} → {band})       = 0      ← chained; this is why bands cluster
cost(∅ → {band})            = 15
cost({band} → ∅)            = 8      ← the cardio finisher strips the band, once
cost({band} → {dumbbell})   = 8 + 5 = 13
cost(∅ → {band, dumbbell})  = 15 + 5 = 20
```

## 7.2 Scarcity multiplier — links rig cost to equipment counts

If a station holds fewer implements than people standing at it, donning serialises into a queue:

```js
effectiveDon(t, station) = don(t) * Math.ceil(peopleAtStation / Math.max(1, equipmentCounts[t]))
```

One kettlebell for five people is not a 5-second setup; it is five 5-second setups in a line. Both inputs already exist — `assessEquipmentFeasibility` computes them today.

## 7.3 Coverage guard — build this, do not skip it

`EQUIPMENT_SETUP_TIMES` has 19 entries; the Rolodex holds ~916 exercises. Unmapped tokens silently fall back to `10`.

Emit a coverage report at generation time: `{mappedTokens, unmappedTokens, coveragePct}`. If `coveragePct < 80`, log a warning and add the class-level note *"setup estimates are partial."* **An optimiser trusted on unmeasured data optimises noise.**

---

# 8. THE ROTATION SCHEDULER

## 8.1 The objective — what the class actually pays

Groups advance **simultaneously**. Nobody starts the next exercise until the slowest station has finished rigging:

```
stall(i)    = MAX over stations s of cost( ex[s][i] → ex[s][i+1] )
class_stall = Σ over i of stall(i)                    ← minimise THIS
```

**The existing `optimizeStationFlow` minimises the wrong quantity.** It interleaves *within* a station; intra-station reordering cannot reduce a cross-station maximum. Both HY3 and Opus 5 independently identified this. Replace it (§8.4).

## 8.2 The algorithm — rig-descending contiguous ordering (DR-4)

Deterministic. `O(S · E log E)`. Explainable in two words: *rig-chained*.

```
for each station independently:
  1. group its exercises by rig (identical token set = one group)
  2. compute rigWeight(group) = Σ don(t) for t ∈ rig
  3. order groups by:
        (a) rigWeight DESC
        (b) group size DESC
        (c) first exercise key ASC          // determinism — DR-9
  4. emit exercises grouped, heaviest rig first, empty rig last
```

## 8.3 Why this also solves the cross-station problem

This is the non-obvious part and you should understand it rather than just implement it:

Every station sorted independently heavy→light produces the **same shape** — a monotonically non-increasing rig-cost profile. Same-rig runs (cost 0) therefore *align across stations*, and each station's single expensive doff lands in the same region of its sequence. The per-boundary maximum falls **as a side effect of every station being sorted the same way.** No cross-station coordination pass is needed, which is exactly what keeps this fast and explainable.

And it reproduces the owner's instruction verbatim without anyone encoding it: bands (don 15, among the heaviest in the table) sort to the front; they stay contiguous because band→band costs 0; the empty-rig cardio finisher sorts last, so the bands come off once, at the end.

**The heuristic was never written down. It is the optimum.**

## 8.4 Integration and escape hatch

- Replace the body of `optimizeStationFlow` in `flowOptimizer.mjs`. **Keep its exported name and signature** — it has existing callers and tests.
- Emit per boundary: `boundaries: [{ index, stallSeconds, bottleneckStationIndex }]`. The UI requires this payload (§12.4) and will otherwise invent per-exercise cost badges that lie.
- If `stall(i) > 30` seconds after ordering, trigger rung R5 (equipment→bodyweight) on the bottleneck station only, and emit chip `bottleneck`.
- If a station cannot be made contiguous without violating day-type legality or fatigue sequencing, **do not reorder across that constraint.** Flag the station and let the SwapDeck offer a rig-compatible replacement.

---

# 9. THE SITUATION LIBRARY

The owner asked the brain to *"think of many situations like that in a bootcamp and prepare for it."* Each row is **detection rule → deterministic mitigation**. Ranked by frequency × damage.

| # | Situation | Detection | Mitigation | Chip | Slice |
|---|---|---|---|---|---|
| 1 | **Rotation desync** (the owner's case) | `stall(i) > 20s` | §8.2 ordering; if still over, move the offending exercise to a later index | `bottleneck` | 3f |
| 2 | **Scarce-implement queue** | `equipmentCounts[t] < peopleAtStation` | apply §7.2 multiplier; warn pre-class; offer higher-count implement | `kit_contention` | 3f |
| 3 | **Cross-station simultaneous demand** | same token demanded by ≥2 stations at the same index, total > owned | shift one station's rig run by one index | `kit_contention` | 3f |
| 4 | **Spatial requirement unmet** | `spatialNeed` set, station lacks it | exclude at pool level (same shape as the day contract) | `wall_anchored` | 3g |
| 5 | **Adjacency hazard** | swinging/rotational implement adjacent to a rotation path | adjacency matrix over `pattern` × `equipment`; reorder **stations**, never the exercise | `adjacency_split` | 3g |
| 6 | **Spotter required** | `requiresSpotter === true` | hard-exclude from station rotation entirely; group work only | — | 3g |
| 7 | **Uneven groups** | `headcount % stationCount !== 0` | send the remainder to the **lowest-rig** stations — cheapest to over-populate | `size_uneven` | 3f |
| 8 | **Late arrival** | participant joins after start | insert at the empty-rig station — no rig-up debt | `late_joiner` | 3f |
| 9 | **Early finisher** | group completes before the buzzer | extend with `iso_hold` from the **same rig** — never a new implement | `desync_guard` | 3f |
| 10 | **Trainer sightline** | station count > 4 in an L-shaped room | cap by `BootcampSpaceProfile` (partially modelled today) | `sightline_kept` | 3g |
| 11 | **Cue audibility** | `noiseLevel === 'high'` at the far station | place high-noise nearest the trainer | — | 3g |

**Banner rule (from Kimi, adopted):** at most **one** situation banner visible at a time, chosen by this rank order. Stacking alerts at 6am trains banner-blindness, and then the trainer ignores the structural chips too.

---

# 10. CLASS-SIZE COUPLING

| Headcount | Stations | Treatment posture | Rig posture |
|---|---|---|---|
| ≤ 4 | 1–2 (collapse already shipped) | all treatments legal; supersets easy — everyone has their own kit | scarcity multiplier ≈ 1 |
| 5–8 | 2–3 | `superset_*` ≤ 1 station | watch `equipmentCounts` on loaded stations |
| 9–16 | 4 | `superset_*` ≤ 2; `drop_set` ≤ 2 | multiplier bites; prefer empty-rig and band stations |
| 17–24 | 4–5 + overflow lap | `superset_*` ≤ 1 — floor traffic dominates | prefer low-rig; bands only if `count ≥ headcount/stations` |
| > 24 | overflow lap rotation (shipped) | `straight` and `density` only | empty-rig only |

The through-line: **as headcount rises, treatment complexity and rig weight must both fall**, because floor traffic and implement scarcity compound.

**Render size warnings only when something was actually suppressed or degraded** — never as informational "you have 14 people" noise.

---

# 11. THE EXPLAINABILITY CONTRACT

## 11.1 Colour tokens — the REAL Crystalline Swan palette (DR-8)

Both consulted models invented palettes. **Both are rejected.** These are the only colours that exist:

| Token | Hex | Role |
|---|---|---|
| `--bg-base` | `#0A0A0F` | Obsidian Black — app background |
| `--bg-raised` | `#141419` | Carbon — cards, station panels |
| `--bg-overlay` | `#1A1A24` | Graphite — chip backgrounds, modals |
| `--surface-primary` | `#002060` | Midnight Sapphire — primary buttons |
| `--surface-elevated` | `#003080` | Royal Depth — elevated cards |
| `--ink-primary` | `#E0ECF4` | Frost White — body text |
| `--accent-primary` | `#60C0F0` | Ice Wing — interactive, focus ring, **structural** chips |
| `--accent-data` | `#50A0F0` | Arctic Cyan — **charts only**, never buttons or glow |
| `--accent-gold` | `#C6A84B` | Gilded Fern — **earned** chips, **relaxed** outline |
| `--tertiary` | `#4070C0` | Swan Lavender |
| `--glow-accent` | `#8B5CF6` | Wing Purple — **FORBIDDEN on chips** (DR-10) |

**Always** use the `var(--token, #fallback)` pattern. **Never** a raw hex inside a component.

Victory `colorScale` for the stall chart: `["#60C0F0", "#C6A84B", "#4070C0"]`.

## 11.2 Chip tones — three, and only three

| Tone | Visual | Meaning |
|---|---|---|
| `structural` | Ice Wing `#60C0F0` fill on Graphite | a property of the movement itself |
| `earned` | Gilded Fern `#C6A84B` fill on Graphite | a property of this gym's history with it |
| `relaxed` | Graphite fill + **1px Gilded Fern outline + 3px left bar** | a rule was bent — the confession |

**There is no purple tone and there will never be one.** Purple means AI-coach in this product; these chips are deterministic. A purple chip would lie about where the decision came from.

## 11.3 New chip enum members (flat `snake_case` — DR-6)

Append to `CHIPS` in `shared/bootcamp-core/constants.mjs`. **Do not** rename or remove existing members.

```js
// Treatment (D-A) — tone: earned
'staple_varied', 'new_treatment',
'tx_superset', 'tx_drop_set', 'tx_tempo', 'tx_cluster', 'tx_iso_hold', 'tx_density',
// Rig (D-B) — tone: structural
'same_rig', 'rig_chained', 'strips_kit',
// ⚠ `same_rig` is NOT `same_kit`. `same_kit` already ships and means
//   "same equipment as the exercise this one would REPLACE" (a SwapDeck
//   comparison against a candidate). `same_rig` means "the transition FROM
//   THE PREVIOUS EXERCISE in this station costs 0s" (a chaining fact about
//   the plan). Different question, different surface. Never substitute one
//   for the other, and do not merge them.
// Situations — tone: structural except where noted
'kit_contention', 'wall_anchored', 'adjacency_split', 'late_joiner',
'sightline_kept', 'desync_guard', 'size_uneven',
// Relaxed — tone: relaxed
'bottleneck',
```

Every new member must be added to `CHIP_TONE` in the same commit. The shipped test `untonedChips()` returns `[]` and **must keep returning `[]`** — that is your gate.

### 11.3.1 Treatment → chip mapping (there are 12 treatments and 6 treatment chips)

Not every treatment earns its own chip; six of them are visually indistinguishable to a trainer glancing at a board, and a 12-member chip vocabulary would blow the 2-chip budget for no gain. **This mapping is fixed:**

| Treatment | Chip |
|---|---|
| `superset_antagonist`, `superset_compound_iso` | `tx_superset` |
| `drop_set`, `mechanical_drop` | `tx_drop_set` |
| `tempo`, `partial_range` | `tx_tempo` |
| `cluster` | `tx_cluster` |
| `iso_hold` | `tx_iso_hold` |
| `density`, `contrast` | `tx_density` |
| `unilateral` | `tx_tempo` |
| `straight` | **no chip** — the default needs no explanation |

The *recorded* treatment in the log (§4.1) is always the precise one from `TREATMENTS`. Only the *rendered* chip collapses. Never store the collapsed value.

## 11.4 Chip priority — the collision rule (DR-7)

Kimi caught a real hole: treatment + rig + situation + ladder chips can legitimately reach **4** on one staple exercise, and the shipped max-2 rule never said which two win.

Update `CHIP_PRIORITY` in `shared/bootcamp-core/chips.mjs` to this order, highest first:

```
1. relaxed-tone chips     (the bent rule ALWAYS leads — never displaced by a virtue)
2. situation chips
3. treatment chips
4. rig chips
5. structural chips
6. earned chips
```

Ties break by index order in `CHIPS`. A builder must never have to pick.

## 11.5 The class-level line — assembled from booleans, never written

Fixed grammar. Each clause is emitted **only if true**, joined with ` · `, maximum 3 clauses, in this priority order: treatment → rig → size.

```
"{n} staples varied · {n} fresh · rigs chained through station {n} · cardio strips bands"
```

Maximum 90 characters, ellipsis on overflow, full string in `aria-label`.

**This is the anti-fabrication guarantee at sentence level: the line is assembled from booleans, never authored.** There is no code path in which a language model writes this string.

---

# 12. THE UI CONTRACT

> Both consulted models independently flagged that the original brief made ~40 backend decisions and ~0 frontend ones — which would have forced you to invent the entire presentation layer, violating §0. This section closes that. **You still invent nothing.**

## 12.1 File split (all ≤ 300 lines)

```
frontend/src/components/BootcampBuilder/
  ClassPlanView.tsx          ≤ 200   shell, layout, class-level line
  StationColumn.tsx          ≤ 160   one station card
  ExerciseRow.tsx            ≤ 180   one exercise + its chips
  ExplainabilityChip.tsx     ≤ 120   the closed-enum chip
  TransitionCostMatrix.tsx   ≤ 180   CSS-grid matrix + Victory stall bar
  SituationBanner.tsx        ≤ 100   the single banner slot
  motion.ts                  ≤  30   reduced-motion helper
```

If `ExerciseRow` approaches the cap, extract `ExerciseRowChips.tsx`. Do not exceed 300 lines in any file for any reason.

## 12.2 Responsive behaviour

| Breakpoint | Layout |
|---|---|
| **320 / 375 / 414** (primary — phone in one hand) | Stations become **stacked full-width cards**, not columns. Exercise rows ≥ 44px. Rotation boundaries are full-width dividers labelled `ROTATE — 20s`. Regenerate is a sticky bottom bar, 56px, full-width, thumb zone. |
| **768** | 2-column station grid. |
| **1024 / 1440** | Stations as columns, max 4 across, then wrap. Transition matrix in the right rail at 1440. |
| **2560 / 3840** | Content `max-width: 1600px`, centred. **Do not stretch station columns past 380px** — line length destroys scanability. |

No horizontal scroll at 320px. Ever. Typography: exercise name 16px `--ink-primary`; chips 12px; **never below 12px anywhere**.

## 12.3 Interaction rules

1. Every tappable element: `min-height: 44px; min-width: 44px`.
2. Chips: max 2 per row; overflow renders `+{n}` which opens a bottom sheet with 44px rows.
3. Chip label templates are fixed strings with at most **one interpolated number**. The interpolation type is `number | undefined` — **never `string`**. This is the type-level anti-fabrication wall.
4. Chip truncation: `max-width: 220px`, ellipsis, full label in `aria-label`.
5. Contrast: WCAG **4.5:1 minimum** for all text on its background.
6. Focus: 2px `--accent-primary` ring, 2px offset, always visible.

## 12.4 Backend payload the UI requires

Emit this or the matrix cannot be built:

```ts
boundaries: { index: number; stallSeconds: number; bottleneckStationIndex: number }[]
```

## 12.5 Generate-press states

| State | Spec |
|---|---|
| Idle | Sticky bar, label `Generate plan` |
| Pending | Label `Building plan…` with **non-animated** stage text tied to real pipeline stages: `Ordering stations` → `Chaining rigs` → `Checking situations`. **No spinner. No fake timer.** |
| No feasible plan | **Never blank.** Render the R6 structural-out plan plus one banner: `Relaxed 2 rules to fill this class — see marked rows.` The relaxed chips on those rows name the bent rules; the shipped validator already guarantees that data exists. |
| Offline registry | Banner: `Offline registry active — 76 exercises.` |

## 12.6 Reduced motion — non-negotiable

```ts
// motion.ts
export const motionSafe = (css: string) =>
  `@media (prefers-reduced-motion: no-preference) { ${css} }`;
```

- Every transition and animation wraps in `motionSafe(...)`. The reduced experience has **zero animation and loses no information.**
- Every Victory chart sets `animate={false}` unconditionally. Chart entry animation is decorative, and a 6am glance must be readable on first paint.
- Plan re-render after Regenerate: **no FLIP animation.** Instant re-render with a 1s `--bg-overlay` highlight on changed rows — colour change only, which is permitted under reduced motion.

---

# 13. SLICE ORDER AND ACCEPTANCE CRITERIA

Each slice ships independently. Each acceptance criterion is executable with zero further questions. **Build in this order** — 3a gates everything.

| Slice | Scope | Acceptance criteria |
|---|---|---|
| **3a** | Record `treatment` + `rigTokens` in `exercisesUsed` JSONB (§4.1) | Round-trip test: write a log, read it back, treatment preserved. A pre-existing row lacking `treatment` reads as `null` and does not throw. **No migration file exists in the diff.** |
| **3b** | `treatments.mjs`: enum + 12 eligibility predicates + LRU selector (§5) | `drop_set` never eligible for a plank (`pattern:'isometric'`). `tempo` never eligible when `impact:'high'`. Same history ⇒ same treatment across 100 runs (determinism). Treatment cycle length ≥ 3 when ≥3 eligible. `mechanical_drop` requires non-empty `easy`. |
| **3c** | Delete the 14-day ban; add novelty budget; redefine R1 (§6, §6.3.1) | A staple used last class **appears again** with a different treatment. `novelty >= 0.30` on a healthy pool. When the pool cannot reach it, chip `used_recently` is emitted and the rung is R1. `rg -n "anti_repeat" shared/ backend/` returns **zero hits**. **All shipped ladder + validator tests green after the §6.3.1 renames — which are the only test edits permitted in this slice.** |
| **3d** | `rigTransition.mjs` + coverage report (§7) | Every row of the §7.1 worked example matches exactly. `cost({band}→{band}) === 0`. Coverage % printed; `<80` emits the partial-estimate note. |
| **3e** | Rig-descending ordering replaces `optimizeStationFlow` body (§8) | Seeded fixture: 3 stations × 4 exercises, station 1 = `[band, bodyweight, band, bodyweight]`. **After ordering, station 1 must be `[band, band, bodyweight, bodyweight]`.** Counting only the 3 transitions *between* those 4 exercises (not the entry transition into the station): before = `doff(band) 8 + don(band) 15 + doff(band) 8 = 31s`; after = `0 + doff(band) 8 + 0 = 8s`. **Assert 31 and 8 exactly, not "lower".** Identical input ⇒ identical output across 100 runs (DR-9). `boundaries[]` emitted. Exported name and signature unchanged. |
| **3f** | Situation library rows 1, 2, 3, 7, 8, 9 — **no new columns** (§9) | Unit test per detection rule. At most one banner regardless of how many fire. |
| **3g** | New columns `spatialNeed` / `noiseLevel` / `requiresSpotter` + rows 4, 5, 6, 10, 11 | Migration is additive and nullable. With all three `null`, generated output is **byte-identical** to pre-migration output. |
| **3h** | Chip enum + tones + priority (§11.3–11.4) | `untonedChips()` returns `[]`. A row with 4 applicable chips renders the correct 2 per DR-7. All shipped chip tests stay green. |
| **UI-0** | `theme` tokens + `ExplainabilityChip` + `motion.ts` (§11.1, §12.6) | Every enum key renders from a fixture. axe-core passes on all three tones at 375px. Every chip ≥44px touch target. A fixture with a rejected-then-backfilled selection renders **zero** chips. |
| **UI-1** | `ClassPlanView` + `StationColumn` + `ExerciseRow` (§12.1–12.2) | Layout matches §12.2 at 320/375/414/768/1024/1440/2560/3840. No horizontal scroll at 320. Sticky 56px Generate bar ≤414px. |
| **UI-2** | Generate states (§12.5) | Pending advances through 3 stage texts with no animated element. Error state renders the R6 plan plus the banner. Reduced-motion emulation shows zero animation. |
| **UI-3** | `TransitionCostMatrix` + stall `VictoryBar` (DR-11) | Renders `boundaries[]`. Matrix cells carry **numeric text**, colour is redundant encoding only. Every Victory chart has `animate={false}`. Bottleneck station shows the alert border. |

---

# 14. PROHIBITIONS

Violating any of these fails the slice regardless of whether tests pass.

1. **Do not restore the 14-day ban** in any form, under any name.
2. **Do not add a rung** to the relaxation ladder, renumber one, or change any rung except R1's label per §6.3.
3. **Do not invent a colour.** §11.1 is the complete palette. No raw hex inside components.
4. **Do not use Wing Purple `#8B5CF6` on a chip** (DR-10).
5. **Do not add an enum member** to `CHIPS`, `TREATMENTS`, or `RUNGS` beyond those listed here.
6. **Do not let a language model author any user-visible string.** Chips are enum keys; the class line is assembled from booleans (§11.5).
7. **Do not edit `EQUIPMENT_SETUP_TIMES`.** Read it; do not tune it.
8. **Do not exceed 300 lines in any file.** `bootcampGenerator.mjs` is already at 810 — a pre-existing violation. Do not add to it; extract new logic into new files. Do not refactor it as part of these slices.
9. **Do not add a dependency.**
10. **Do not use Material-UI, Tailwind, or Recharts.** styled-components and Victory only.
11. **Do not write client names, medical data, or any personal identifier into a plan, a log, a chip, or a test fixture.** Aggregate counts only.
12. **Do not claim a slice is done without showing the passing output** of its acceptance criteria.

---

# 15. VERIFICATION REQUIRED BEFORE YOU REPORT A SLICE COMPLETE

For each slice, produce and show:

1. The acceptance criteria from §13, each with the command run and its actual output.
2. `node --check` on every file you created or modified.
3. The full existing bootcamp test suite, green — **99 tests across 15 files** is the current baseline. A regression is a failed slice.
4. `shared/bootcamp-core` suite green — **102 tests** is the current baseline.
5. A line count for every file you touched, proving ≤300.
6. An explicit statement of anything you could **not** verify, and why.

Then, and only then, report the slice complete.

**If you find yourself needing to make a decision this document did not make, do not make it.** Write it under `UNSPECIFIED:` and stop. That is the single most valuable thing you can do with a gap.

---

## Appendix — panel provenance

| Source | File |
|---|---|
| Brief | `BOOTCAMP-BRAIN-PANEL-BRIEF-2026-08-02.md` |
| Kimi K3 (design layer) | `BOOTCAMP-BRAIN-PANEL-KIMI-2026-08-02.md` — $0.1111, `finish=stop` |
| HY3 (design layer) | `BOOTCAMP-BRAIN-PANEL-HY3-2026-08-02.md` — $0.0032, `finish=stop` |
| HY3 (algorithmic) | `BOOTCAMP-BRAIN-PANEL-HY3-ALGO-2026-08-02.md` — `finish=stop` |
| Opus 5 (algorithmic) | `BOOTCAMP-BRAIN-PANEL-OPUS5-2026-08-02.md` |

**Independent convergences** (two or more models reaching the same conclusion separately — the highest-confidence findings in this document):

1. Treatment must be a **per-exercise** axis, not a class-level style. *(Opus, HY3)*
2. Setup is a **transition cost**, and "bands early" emerges from it rather than being encoded. *(Opus, HY3)*
3. `optimizeStationFlow` **optimises the wrong axis**. *(Opus, HY3)*
4. The brief had **no UI contract**, which broke its own "builder does not decide" rule. *(Kimi, HY3)*
5. Chips must derive from the **post-validation plan only**, so a backfilled selection cannot carry a fabricated justification. *(Kimi, and already shipped in slice 2)*

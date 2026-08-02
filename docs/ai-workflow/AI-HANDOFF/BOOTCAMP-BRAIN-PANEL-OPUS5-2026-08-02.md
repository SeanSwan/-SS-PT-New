# The Bootcamp Rolodex Brain — Opus 5 Panel Contribution

**Panelist:** Claude Opus 5 (1M context)
**Date:** 2026-08-02
**Brief:** `BOOTCAMP-BRAIN-PANEL-BRIEF-2026-08-02.md`
**Stance:** grounded in verified repo state; every mechanism below maps to fields that already exist unless explicitly marked NEW.

---

## Executive thesis

Build **treatment as a first-class axis of the plan**, and **setup as a property of transitions rather than of exercises**. Those two re-framings collapse the owner's entire ask into deterministic, testable machinery:

- A staple stops being banned because freshness is delivered by *how* it is executed. The treatment vocabulary already exists as class styles; it is at the wrong altitude (class-level) and mostly unimplemented (10 of 12 styles are text cues).
- "Bands early, chained through, cardio strips them" stops being a rule someone has to write, because it is the **minimum-cost solution** to a rig-transition ordering problem. You do not encode the heuristic; you encode the cost function, and the heuristic falls out.

The third re-framing is the one nobody asked for and the class actually runs on: in a station rotation, **groups move simultaneously, so the class advances at the speed of the slowest station's transition.** The existing optimizer minimises per-station setup, which is not what the class pays. The class pays the per-boundary *maximum*.

---

## 1. The treatment model (D-A)

### 1.1 Vocabulary — closed enum, eligibility keyed to fields that already exist

`TREATMENTS`, each with an eligibility predicate over the core movement (`pattern`, `impact`, `joints`) plus Rolodex fields (`equipment`, `easy`/`medium`/`hard`, `exerciseType`):

| Treatment | What changes | Eligibility predicate | Data needed |
|---|---|---|---|
| `straight` | nothing (baseline) | always | — |
| `tempo` | eccentric emphasis, e.g. 3-1-3 | always except `impact === 'high'` (you cannot slow a jump safely) | — |
| `density` | AMRAP inside fixed work window | always except `impact === 'high'` | — |
| `iso_hold` | terminal isometric added | `pattern ∈ {squat, lunge, hinge, push_*, pull_*, isometric}` | — |
| `unilateral` | one side at a time | `pattern ∉ {gait, rotate}` AND not already unilateral | name check |
| `partial_range` | 1.5-rep / pulse | `pattern ∈ {squat, lunge, push_*, pull_*}` | — |
| `mechanical_drop` | drop to an easier leverage at failure | **`easy` variation exists** | `easyVariation` — ALREADY POPULATED |
| `drop_set` | reduce load and continue | equipment ∩ {dumbbell, kettlebell, resistance_band, mini_band, cable, machine} ≠ ∅ | `equipment` |
| `cluster` | intra-set micro-rest | loaded (same predicate as `drop_set`) | `equipment` |
| `superset_antagonist` | paired with opposing pattern | `OPPOSING_PATTERN[pattern]` exists AND a partner exists in the same station | **`taxonomy.mjs` already exports `OPPOSING_PATTERN`** |
| `superset_compound_iso` | compound → isolation, same region | `exerciseType === 'compound'` AND an isolation partner shares `primaryRegion` | `exerciseType` |

**Why this list:** it spans the four independent levers a trainer actually has — time under tension (`tempo`, `iso_hold`, `cluster`), load (`drop_set`, `mechanical_drop`), range/limb (`partial_range`, `unilateral`), and pairing (`superset_*`, `density`). Two treatments from different levers never collide; two from the same lever must not stack.

**Critical safety rule:** `drop_set` on a plank is nonsense and `tempo` on a burpee is an injury. The predicates above are not decoration — a builder must implement them as a hard gate, and any exercise whose eligible set is `{straight, tempo}` only is simply a low-variation exercise, which is fine and must not be forced.

### 1.2 The selection function — deterministic LRU over the eligible set

```
selectTreatment(exercise, history, classBudget):
  eligible = TREATMENTS.filter(t => t.predicate(exercise))     // always contains 'straight'
  lastUsed = history.lastTreatmentFor(exercise.key)            // null on first ever use
  candidates = eligible.filter(t => t !== lastUsed)            // NEVER repeat consecutively
  if candidates is empty: return 'straight'                    // only when eligible == {lastUsed}
  order candidates by (lastAppliedAt ASC, TREATMENT_ORDER index ASC)   // LRU, ties broken by fixed enum order
  return first candidate that fits classBudget (§1.4)
```

**Anti-oscillation is structural, not heuristic:** LRU over an eligible set of size *k* produces a cycle of length *k*. With `k ≥ 3` the brain cannot ping-pong. The `lastUsed` exclusion guarantees it even at `k = 2`. Determinism matters — two Generate presses with the same history must produce the same treatment, or the trainer cannot trust it.

### 1.3 The recording gap — and why it needs NO migration

`BootcampClassLog.exercisesUsed` is **JSONB**. Today it holds `{exerciseName}`-shaped entries. Extend the entry shape to:

```json
{ "exerciseKey": "goblet_squat", "exerciseName": "Goblet Squat",
  "treatment": "drop_set", "stationIndex": 1, "rigTokens": ["dumbbell"] }
```

Because the column is JSONB, **this is additive with zero migration.** Old rows lacking `treatment` read as `null`, which the LRU treats as "never used" — the correct cold-start semantics for free. This is the single cheapest high-value change in the whole design and it must land first, because **every other part of D-A is unlearnable until treatment is recorded.** A brain cannot rotate what it never wrote down.

### 1.4 Class-level treatment budget — the floor-chaos guard

A class where every station is a superset is unrunnable at 6am. Budget per class:

| Constraint | Value | Why |
|---|---|---|
| max stations carrying a `superset_*` | `floor(stationCount / 2)` | supersets double a station's kit demand |
| max stations carrying `drop_set` or `cluster` | 2 | both need a load ladder staged at the station |
| min stations at `straight` | 1 | one station must always be legible with no explanation |
| treatments per station | 1 | two treatments on one row is a paragraph at 6am |

---

## 2. Repeat-with-variation vs genuine staleness

The 14-day ban is replaced by a **novelty budget**, which is a *composition* constraint (about the class as a whole) rather than a *pool* constraint (about which exercises may be considered). This distinction is the whole fix: pool filters delete options, composition constraints shape the result.

```
NOVELTY_FLOOR = 0.40      // ≥40% of work slots must be exercises NOT in the last 3 classes
STAPLE_RULE   = every repeated exercise MUST carry a treatment != its last treatment
HARD_REST     = none      // no exercise is ever banned outright
```

Rationale for 0.40: below ~1/3 the class reads as "same workout again" to a human even with varied treatments; above ~1/2 the trainer loses the staples that make the class effective. 40% is the defensible midpoint and is a single named constant the owner can tune in one place.

### Reconciling with the shipped ladder's R1

Shipped R1 = "anti-repeat," currently conceived as a pool constraint to relax under scarcity. **Redefine R1 as "relax the novelty budget."** Under scarcity the class may fall below `NOVELTY_FLOOR`, and the chip `used_recently` then names it honestly. This is a strictly better meaning for the rung — it keeps the ladder's semantics (one named constraint per rung, confessed by a chip) while removing the ban that the owner rejected. **No new rung is needed, and the existing validator invariants keep working unchanged.**

---

## 3. Setup as a transition function (D-B)

### 3.1 The rig model

A **rig** is the normalized equipment-token set a participant is wearing / holding / standing at for one exercise. `rig(exercise) = normalize(exercise.equipment)`, with `bodyweight`/`none` → `∅`.

```
don(t)  = EQUIPMENT_SETUP_TIMES[t]              // existing table, unchanged
doff(t) = ceil(don(t) * 0.4)                    // removal is faster than fitting
cost(A → B) = Σ don(t)  for t ∈ rig(B) \ rig(A)
            + Σ doff(t) for t ∈ rig(A) \ rig(B)
            + 0         for t ∈ rig(A) ∩ rig(B)   // ALREADY RIGGED — the whole point
```

**The 0.4 doff factor is a decision, not a measurement.** It is defensible (unclipping is faster than fitting), it is a single named constant, and it is directionally right in every case. A builder must not be left to invent it.

**SUM, not MAX.** `estimateSetupTime` currently returns the MAX across equipment. For a *transition* that is wrong: one person cannot don a band and drag a bench simultaneously. Sum the new tokens.

### 3.2 Scarcity multiplies transition cost — this links §2.4 to §2.6

If a station's implement count is below the people standing there, donning serialises:

```
effective_don(t, station) = don(t) * ceil(peopleAtStation / max(1, equipmentCounts[t]))
```

One kettlebell for five people is not a 5-second setup; it is five 5-second setups in a queue. The feasibility check already computes both inputs — this reuses them rather than adding data.

---

## 4. The rotation-boundary objective

### 4.1 The objective the class actually pays

Groups advance simultaneously. At exercise-index boundary *i*, every group transitions at its own station, and nobody starts until the slowest finishes:

```
stall(i)      = MAX over stations s of cost(ex[s][i] → ex[s][i+1])
class_stall   = Σ over i of stall(i)          ← minimise THIS
```

`optimizeStationFlow` today interleaves *within* a station. Intra-station reordering cannot reduce a cross-station maximum. **The shipped optimizer minimises a quantity the class does not pay.** This is the mechanism behind the owner's complaint and it is currently unaddressed.

### 4.2 The algorithm — rig-descending contiguous ordering

Deterministic, O(S · E log E), explainable in two words:

```
For each station independently:
  1. group its exercises by rig (identical token set = one group)
  2. order groups by rigWeight DESC, where rigWeight = Σ don(t) for t ∈ rig
     tie-break: larger group first, then exercise key ASC (determinism)
  3. emit exercises grouped, heaviest rig first, ∅-rig last
```

**Why this also solves the cross-station problem, which is the non-obvious part:** every station independently sorted heavy→light produces the same *shape* — a monotonically non-increasing rig-cost profile. Same-rig runs (cost 0) therefore align across stations, and each station's one expensive doff lands in the same region of the sequence. The maximum-per-boundary is minimised **as a side effect of every station being sorted the same way.** No cross-station coordination pass is required, which is what keeps this fast and explainable.

And it produces the owner's rule verbatim: bands (don 15, among the heaviest) sort to the front, stay contiguous through their run because same-rig transitions cost 0, and the ∅-rig cardio finisher sorts last — so the bands come off once, at the end. *The heuristic was never encoded; it is the optimum.*

### 4.3 Degradation

If a station's rig profile cannot be made contiguous without violating a higher constraint (day-type legality, fatigue sequencing), flag `bottleneckStation` with the boundary index and cost, surface chip `bottleneck`, and offer the SwapDeck a rig-compatible replacement. Never silently reorder across a constraint — the ladder's confession discipline applies here too.

---

## 5. The bootcamp situation library

Ranked by frequency × damage. Each row is detection → deterministic mitigation.

| # | Situation | Detection | Mitigation |
|---|---|---|---|
| 1 | **Rotation desync** (the owner's case) | `stall(i) > 20s` | §4.2 rig ordering; if still over, split the offending exercise to a later index |
| 2 | **Scarce-implement queue** | `equipmentCounts[t] < peopleAtStation` | §3.2 multiplier; warn pre-class; SwapDeck to a higher-count implement |
| 3 | **Cross-station simultaneous demand** | same token demanded by ≥2 stations at the same index, total > owned | stagger: shift one station's rig run by one index |
| 4 | **Spatial requirement unmet** | exercise needs wall / floor / corner; station has none | NEW field `spatialNeed`; exclude at pool level, same shape as the day contract |
| 5 | **Adjacency hazard** | swinging/rotational implement adjacent to a rotation path | adjacency matrix over `pattern` × `equipment`; reorder stations, never the exercise |
| 6 | **Spotter required** | exercise flagged `requiresSpotter` | hard-exclude from station rotation; group work only |
| 7 | **Uneven groups** | `headcount % stationCount ≠ 0` | distribute remainder to the LOWEST-rig stations (cheapest to over-populate) |
| 8 | **Late arrival** | participant joins after start | insert at the ∅-rig station — no rig-up debt |
| 9 | **Early finisher** | group completes before buzzer | station-local `iso_hold` extension from the same rig — never a new implement |
| 10 | **Trainer sightline** | station count > 4 in an L-shaped room | cap stations by `BootcampSpaceProfile`; already partially modelled |
| 11 | **Cue audibility** | high-noise implement (rope/plyo) at the far station | place high-noise at the NEAREST station to the trainer |

Rows 4, 5, 6 need NEW exercise fields (`spatialNeed`, `noiseLevel`, `requiresSpotter`). All three are nullable additive columns; absent = unconstrained, which preserves current behavior exactly.

---

## 6. Class-size coupling

| Headcount | Stations | Treatment posture | Rig posture |
|---|---|---|---|
| ≤4 | 1–2 (shipped collapse) | all treatments legal; supersets easy — everyone has own kit | scarcity multiplier ≈ 1 |
| 5–8 | 2–3 | supersets ≤ 1 station | watch `equipmentCounts` on loaded stations |
| 9–16 | 4 | supersets ≤ 2; `drop_set` ≤ 2 (needs a load ladder per station) | multiplier bites; prefer ∅-rig and band stations |
| 17–24 | 4–5 + overflow lap | supersets ≤ 1 — floor traffic dominates | strongly prefer low-rig; bands only if count ≥ headcount/stations |
| >24 | overflow lap rotation (shipped) | `straight` + `density` only | ∅-rig only |

The through-line: **as headcount rises, both treatment complexity and rig weight must fall**, because floor traffic and implement scarcity compound.

---

## 7. Explainability

New chips (closed enum, ≤2 per row, tone-mapped, never LLM-authored):

| Chip | Tone | Emitted when |
|---|---|---|
| `staple_varied` | earned | repeated exercise carrying a different treatment than last time |
| `new_treatment` | earned | treatment not used on this exercise before |
| `same_rig` | structural | transition from previous exercise costs 0 |
| `strips_kit` | structural | this row removes the rig for what follows |
| `rig_chained` | structural | belongs to a contiguous same-rig run |
| `bottleneck` | relaxed | this row sets `stall(i)` for the class |
| `used_recently` | relaxed | novelty budget relaxed (redefined R1) |

Class-level line: one sentence naming the class's total stall and its deepest relaxation. Everything else stays chips. The existing validator invariant — a relaxed row must name the rule it bent, a clean row may not wear a badge it did not earn — extends to these unchanged.

---

## 8. What I believe the brief gets wrong

1. **It assumes intra-station ordering is the lever.** It is not; see §4.1. The brief inherited that assumption from the shipped optimizer.
2. **It under-specifies the UI.** (Confirmed independently by HY3.) A blueprint that leaves the trainer-facing surface unspecified forces the builder to make design decisions, which violates its own "Qwen does not decide" constraint. The final blueprint must carry a component contract using the **real Crystalline Swan palette**, not an invented one.
3. **It treats "treatment" and "variation" as one idea.** They are two: treatment is *how the set is executed*; variation is *which exercise appears*. Conflating them is how you end up with a novelty budget that fights a treatment rotation.
4. **It assumes setup time data is adequate.** `EQUIPMENT_SETUP_TIMES` has 19 entries and the Rolodex has ~916 exercises; unmapped equipment silently falls back to `10`. Coverage must be measured before the optimizer is trusted, or it optimises noise.

## 9. Slice order

| # | Slice | Ships alone | Acceptance |
|---|---|---|---|
| 3a | Record `treatment` + `rigTokens` in `exercisesUsed` JSONB | yes | round-trip test; old rows read `null` |
| 3b | `TREATMENTS` enum + eligibility predicates + LRU selector (pure, portable core) | yes | no unsafe pairing possible; determinism test; cycle ≥3 |
| 3c | Replace ban with novelty budget; redefine ladder R1 | yes | staples reappear varied; existing ladder tests stay green |
| 3d | Rig transition cost model + coverage report on `EQUIPMENT_SETUP_TIMES` | yes | cost(A→B) table test; coverage % printed |
| 3e | Rig-descending contiguous ordering + `stall(i)` metric | yes | band class orders bands-first, cardio-last, measurably lower class_stall |
| 3f | Situation library rows 1,2,3,7 (no new columns) | yes | detection unit tests |
| 3g | New columns `spatialNeed`/`noiseLevel`/`requiresSpotter` + rows 4,5,6 | yes | additive migration; null = current behavior |
| 3h | UI contract: chips, transition bar, treatment history | yes | axe pass at 320/414; 44px targets; reduced-motion |

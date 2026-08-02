# Consult reply — HY3-brain (tencent/hy3) — 2026-08-02T22:13:49.102Z

> tokens: prompt=3368 completion=3512 | finish_reason: stop | max_tokens: 60000

# Executive Thesis

Replace the name-ban freshness filter with a **treatment-axis rotation engine** that records and varies *how* a staple is executed (superset, drop set, tempo, etc.) and reframe equipment setup from a per-exercise scalar to a **rig-state transition cost** across simultaneous station rotations; then minimize the per-boundary maximum transition (the true bootcamp stall) with a deterministic Min-Max Rig-Chaining scheduler, backed by an exhaustive floor-situation library and headcount-coupled rules — all rendered as closed-enum chips in the Crystalline Swan dark UI. This makes Qwen’s build decision-complete: every threshold, predicate, and fallback is specified below.

---

## 1. The Treatment Model (D-A)

**Vocabulary (fixed enum, per-exercise axis):**
`STANDARD | SUPERSET | DROPSET | TEMPO | CLUSTER | ISOHOLD | DENSITY | CONTRAST`

**Eligibility predicate** (from `exerciseRolodex` attributes):
| Treatment | Required attribute | Example block |
|---|---|---|
| SUPERSET | `pairable=true` | push-up + row |
| DROPSET | `loadable=true` & `isometric=false` | goblet squat |
| TEMPO | `has_range=true` | any lift |
| CLUSTER | `loadable=true` | bench press |
| ISOHOLD | `isometric_capable=true` | plank (not drop-set) |
| DENSITY | `any` | burpee |
| CONTRAST | `loadable=true` & `explosive_capable=true` | med-ball throw |
| STANDARD | always | – |

**Recorded per (exercise, class)** in `BootcampClassLog.exerciseTreatments` (JSONB):
`{exerciseId, treatment, rigStateBefore, rigStateAfter, transitionMs, classDate}`

**Selection function** `pickTreatment(exercise, history, classDate)`:
1. Filter to eligible treatments.
2. Compute `daysSinceLast(ex, tx)` = classDate – max(date where ex+tx recorded).
3. Rank by `daysSinceLast` DESC; tie-break by `usageCountLast30(ex,tx)` ASC.
4. **Oscillation guard:** forbid any treatment used for same exercise in last 2 class occurrences (track `lastTxGap`).
5. **Safety guard:** if `eligible=false` → excluded upstream.

*Default: if history empty → STANDARD. Consequence: staples never banned, only varied.*

---

## 2. Repeat-with-Variation vs Genuine Staleness

**Replace 14-day name ban** with:
- Exercise name may repeat anytime **if treatment differs** from its last class appearance.
- **Staleness line:** A class is stale if `noveltyRatio < 0.20` where `noveltyRatio = count(exerciseNames not used in prior 21 days) / totalMoves`.
- If stale → inject minimum number of novel-name moves to reach 0.20 (draw from R5 fallback set).

**Reconcile with shipped R1 (anti-repeat rung):**
- R1 becomes **R1′: treatment-diversity** – require `treatment ≠ lastTreatmentForExercise` at class build; if impossible under pool, relax to allow same but emit chip `relaxed:treatment-repeat` (gold #C6A84B). The old name-ban R1 is deleted.

---

## 3. Setup as Transition Function (D-B) — Confirmed Modelling Error

**Rig-state model:** `Rig = Set<equipmentCategory>` per participant (categories from `EQUIPMENT_SETUP_TIMES` keys).  
**Transition cost `cost(A→B)`** derived from table without new data:
- `same` : `0` if `Rig(A) == Rig(B)`
- `don`  : `Σ SETUP_TIMES[e] for e in Rig(B)\Rig(A)`
- `doff` : `0.5 * Σ SETUP_TIMES[e] for e in Rig(A)\Rig(B)`
- `swap` : `doff + don`

*Bands (15s) chained: A=band, B=band → cost 0. Terminate in bodyweight cardio → doff 7.5s only. The “bands early” rule emerges automatically.*

---

## 4. Rotation-Boundary Objective (§2.5)

**Algorithm:** `MinMaxRigChain`
For each rotation boundary k (stations rotate simultaneously):
1. For each station s, candidate next exercise from pool.
2. Compute `boundaryStall = MAX_s(cost(s_k-1 → candidate_s))`.
3. Greedily assign candidates that minimize `boundaryStall`; tie-break by least-recent treatment.
4. If `boundaryStall > 30s` → trigger R5 (equipment→bodyweight) on worst station.

**Complexity:** O(S·N log N) per boundary, S stations, N candidates. Deterministic, phone-fast.  
*Current `optimizeStationFlow` is deprecated – it optimizes wrong axis.*

---

## 5. Bootcamp Situation Library (Ranked by freq × damage)

| # | Situation | Detection rule | Deterministic mitigation |
|---|---|---|---|
| 1 | **Desync (one group ready)** | `stationFinishVar > 0.2*blockTime` | Assign `buffer: bodyweight` to early group (chip `sit:desync`) |
| 2 | **Equipment contention** | `EquipmentItem.quantity < participantsPerStation` | Alternate station order; else R5 fallback |
| 3 | **Space need (wall/corner)** | `exercise.spaceTag ∈ {wall,floor,corner}` | Co-locate all tagged in same station block |
| 4 | **Adjacency conflict** | `exercise.incompatibleWith includes other station ex` | Separated by ≥1 station index |
| 5 | **Trainer sightline** | `exercise.complexity ≥ 3` | Place in station 0 (front) |
| 6 | **Early finisher** | `actualDuration < planned-10%` | Same as desync buffer |
| 7 | **Late arrival** | Aggregate only – ignored (by design) |
| 8 | **Noise/echo** | `exercise.noiseTag=high` | Alternate with low-noise station |

---

## 6. Class-Size Coupling (4 → 24)

| Headcount | Stations | Treatment flips | Rig cost multiplier |
|---|---|---|---|
| 4–6 | 2 | No SUPERSET (kit per person insufficient) | `1.0` |
| 7–12 | 3–4 | SUPERSET ok if `qty≥2n` | `1+0.05*(n-4)` |
| 13–20 | 5–6 | Force rig-contiguous blocks | `1+0.08*(n-4)` |
| 21–24 | 7–8 (2 waves) | DENSITY preferred, CONTRAST banned | `1+0.10*(n-4)` |

---

## 7. Explainability (Crystalline Swan Chips)

**New chip enum:**
- `tx:drop-set` (Ice Wing cyan #60C0F0)
- `rig:band-chain` (Gilded Fern gold #C6A84B if earned)
- `sit:desync-buffer` (Wing Purple #8B5CF6 AI-coach)
- `relaxed:treatment-repeat` (gold)

**Trainer view:** Each plan row shows max 2 chips; class-level line: *“Bands chained stations 1–3, stripped at cardio finisher — max transition 12s.”* No LLM prose; backfilled selections carry `relaxed:*` only.

---

## 8. What the Brief Got Wrong / Holes

- **Assumption:** class style must be class-level. **Fix:** treatment is per-exercise; style becomes aggregate descriptor.
- **Assumption:** R1 anti-repeat ban is salvageable. **Fix:** deleted, replaced by R1′.
- **Mistaken:** `estimateSetupTime` max-scalar. **Confirmed error.**
- **Hole for builder:** exact `Rig` serialization (use comma-separated category string). UI chip component specs (sizes, contrast ratios) must be lifted from design system – provided here: chips are 12px rounded, bg sapphire `#0B1E3A`, text as listed.
- **Still to invent (minor):** none algorithmic – all thresholds given.

---

## 9. Slice Order (on top of 0–2)

| Slice | Scope | Acceptance (zero-question) |
|---|---|---|
| 3 | Add `exerciseTreatments` JSONB + eligibility matrix in `classStyleModifiers` | Generator records tx per ex; unit test: plank never DROPSET |
| 4 | Implement `rigTransition()` from `EQUIPMENT_SETUP_TIMES` | cost(band→band)=0; cost(band→body)=7.5 |
| 5 | `MinMaxRigChain` replaces `optimizeStationFlow` | Boundary stall ≤30s on seeded data |
| 6 | Situation library rules in `bootcampCapacity` | Desync buffer emitted when var>20% |
| 7 | Headcount coupling thresholds | n=4 excludes SUPERSET in plan |
| 8 | Chip enum + render in React styled-components | Gold chip on earned rig-chain only |

Each slice regression-tests against shipped R0–R6 ladder. Qwen builds; decisions are closed.

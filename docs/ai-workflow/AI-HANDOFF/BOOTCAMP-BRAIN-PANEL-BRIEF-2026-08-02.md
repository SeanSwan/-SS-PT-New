# The Bootcamp Rolodex Brain — Panel Brief

**Date:** 2026-08-02
**Panel:** Kimi K3 · HY3 · Opus 5
**Purpose:** produce insight that will be folded into a single decision-complete BUILD BLUEPRINT for a Qwen-80B builder model.
**Privacy:** sanitized repo evidence only. No client PII, no credentials, no production exports.
**Exclusion:** do not call, cite, or gate on Fable.

---

## 0. What you are being asked for

You are NOT being asked to write the blueprint. You are being asked for the **insight that makes the blueprint decision-complete** — specifically the decisions, edge cases, failure modes, and modelling choices that a builder model must never be left to invent.

The final blueprint targets a **Qwen-80B builder**. Its operating constraint is absolute:

> **Qwen builds. Qwen does not decide.** Every algorithm, threshold, data shape, ordering rule, tie-break, fallback, and acceptance test must already be specified. If Qwen has to ask a question or exercise judgment, the blueprint has failed.

So your output should be biased toward **naming the decisions that still need making, and making them** — with a recommended default and its consequence — rather than listing options.

---

## 1. The owner's ruling (verbatim intent, 2026-08-02)

The trainer (Sean, 26+ years, NASM-protocol) rejected the current anti-repeat design in his own words:

> "I need it to NOT ban popular exercises that are staples and used a lot. Instead it should be **supersetting or drop-setting** with the exercise the next time it sees it, to switch it up on that level — vs 'oh, that exercise is used, can't use it for a week.' And this should be done very smartly so that we are developing a **smart workout Rolodex brain** that is watching all of this and mixing and matching workouts with great thought — while being smart on class size, and the fact that **certain exercises take more setup time than others**.
>
> This is huge because we can have people putting on and taking off bands while the other group is doing rows individually. Next exercise, one group is ready, the other is not. So if we use bands it needs to be **at the beginning**, and the workouts need to **utilize the bands through the chain**, so the cardio can take bands off.
>
> I need the brain to think of many situations like that in a bootcamp and prepare for it with the exercises we have in the Workout Rolodex."

Two distinct demands live in that:

- **D-A — Variation by TREATMENT, not by EXCLUSION.** A staple (goblet squat, push-up, row) must stay in rotation. Freshness comes from changing *how it is executed* — superset, drop set, tempo, cluster, isometric hold, density — not from removing it for N days.
- **D-B — Setup-aware station chaining under simultaneous rotation.** Equipment rig-up/rig-down is a first-class scheduling constraint, because bootcamp groups rotate **at the same time** and the slowest station's transition stalls everyone.

---

## 2. Grounded current state (verified, with evidence)

### 2.1 The freshness ban is real and it is a hard filter

`bootcampGenerator.mjs:651-671` (`getRecentExerciseNames`) pulls the last 10 class logs within 14 days and returns a Set of exercise NAMES. That set becomes `combinedExclusions` (`:457`), which is passed to the Rolodex query as `excludeNames` and used to filter the registry fallback (`:502`). An exercise taught in the last 14 days is **removed from the candidate pool entirely** before any ranking happens.

Consequence: the more useful and staple an exercise is, the more often it is banned. The system punishes its own best movements. This is exactly what D-A rejects.

### 2.2 The treatment vocabulary already exists — but at the wrong altitude, and mostly as text

`bootcampRoutes.mjs:69-81` accepts 12 class styles: `standard, pyramid, superset, mixed, ladder, descending, chipper, countdown, death_by, ygig, contrast, density`.

But `classStyleModifiers.mjs:253-273` (`applyClassStyle`) shows:
- only **`pyramid`** and **`superset`** have real implementations (`applyPyramidStyle`, `applySupersetStyle`);
- **all ten others fall through to `addGenericStyleCue`** — a text string appended to the exercise. Nothing structural happens.
- The style is **class-level**: one style for the entire class.

D-A needs the opposite: **treatment as a per-exercise axis, selected from history**, so the same squat returns next week as a drop set. The vocabulary is there; the altitude and the implementations are not.

### 2.3 History is recorded but is not learnable

`BootcampClassLog` carries `exercisesUsed` (JSONB), `modificationsMade` (JSONB), `classRating` (INT), `energyLevel` (INT), `trainerNotes`, `actualParticipants`, `dayType`, `classDate`.

The generator reads exactly one thing from it: exercise **names**, to build the ban set. It never reads ratings or energy, and — critically — **there is no record of which TREATMENT was applied to an exercise**. So "vary the treatment next time" currently has nothing to read. The brain cannot rotate treatments it never recorded.

### 2.4 Setup time is modelled as a per-exercise SCALAR — this is the core modelling error behind D-B

`exerciseRolodexBridge.mjs:22-42` — `EQUIPMENT_SETUP_TIMES` (seconds):
```
bodyweight 0 · none 0 · mat 2 · foam_roller 3 · medicine_ball 3 · dumbbell 5
kettlebell 5 · slider 5 · bosu 8 · stability_ball 8 · trx 10 · bench 10 · other 10
mini_band 12 · resistance_band 15 · cable 15 · barbell 20 · landmine 20 · machine 25
```
`estimateSetupTime` (`:174-185`) returns the **MAX** across an exercise's equipment.

The owner's instinct is confirmed by the repo's own numbers: **bands are among the most expensive setups in the gym** (15s / 12s), beaten only by cable, barbell, landmine, machine.

The modelling error: setup is charged as an **attribute of one exercise**, so putting a band on costs 15s *every time a band exercise appears*. In reality, if the next exercise also uses that band, the cost is ≈0 — **you are already rigged**. Real cost is a property of the **transition between consecutive exercises**, not of either exercise alone:

```
cost(A → B) = f(rig(A), rig(B))
   same rig           ≈ 0        ("already wearing it")
   don (add kit)      = full don cost
   doff (remove kit)  = partial (cheaper than donning)
   swap (A kit → B kit) = doff(A) + don(B)
```

Once setup is a transition function, **"bands early, chained through, cardio strips them" stops being a hand-written rule and falls out of the optimizer automatically** — a band-contiguous run minimises total transition cost, and terminating in a no-kit cardio block is the cheapest exit. That reframing is, in our assessment, the single highest-leverage idea in this brief. Attack it.

### 2.5 The existing flow optimizer solves the WRONG axis

`flowOptimizer.mjs:120-155` (`optimizeStationFlow`) calls `interleaveBySetupTime(stationExs)` — it reorders exercises **within one station**.

But in a station-rotation bootcamp, groups rotate **simultaneously**. The class cannot advance until the **slowest station's transition** completes. So the quantity that determines real class flow is:

```
class_stall_at_boundary_k = MAX over stations s of transition_cost(s, k)
```

Intra-station interleaving does not reduce that maximum. **The optimizer is minimising the wrong objective.** The correct objective is bottleneck/makespan minimisation across the station set at each rotation boundary. This is D-B's actual mechanism, and the current code does not address it at all.

### 2.6 Class-size intelligence — partially built

Shipped: small-class collapse (4 participants → 2 stations, `bootcampCapacity.mjs`), equipment feasibility on real `EquipmentItem.quantity` (flags "kettlebell ×2 for ~5 people"), overflow lap-rotation above capacity.

Not built: any link between class size and **treatment** choice (a superset needs two stations' worth of kit per person; a drop set needs a load ladder — both get harder as headcount rises), or between class size and rig-transition cost (more people = longer real don/doff than the constant suggests).

### 2.7 What slices 0-2 already shipped (build ON this, do not re-litigate)

- **Portable core** at `shared/bootcamp-core/`: `ClassPlan` schema (time-relative, aggregate-only attendee state so no PII is representable), `compileTimeline`, day-type registry as injected config, validator.
- **Day-type contract**: primary-region inclusion + explicit pattern exclusions + volume budgets. Replaced a `.some()` filter that could not fail.
- **Relaxation ladder R0-R6**: R0 hard floor → R1 anti-repeat → R2 novelty → R3 pattern fidelity → R4 not-used-this-class → R5 equipment→bodyweight (guaranteed non-empty by a pinned 14-movement always-legal set) → R6 structural outs. Never dead-ends.
- **Fact chips**: closed enum, max 2 per selection, derived from the FINAL plan (never LLM-narrated), tone `structural|earned|relaxed`. A relaxed selection is structurally required to name the rule it bent — the validator rejects a plan that hides it, and rejects a clean row wearing a badge it did not earn.

**Note the collision:** R1 in the shipped ladder is "anti-repeat," modelled as a constraint to be *relaxed under scarcity*. D-A says anti-repeat should not be a pool constraint at all — it should be a **treatment-selection input**. Reconciling this cleanly is one of the questions below.

### 2.8 Operating constraints (non-negotiable)

Trainer-led B2B2C; group constraints are **anonymous aggregate counts** (`{knee: 3}`), never named people — a per-person public swap is deliberately unrepresentable in the schema. Zero PII to LLMs. Node/Express/Sequelize/Postgres backend, React 18 + TypeScript + styled-components frontend (no MUI/Tailwind). Rolodex holds ~916 active exercises; a 76-entry registry is the offline fallback. Real classes run as small as **4 people** — an engine built for 12 breaks at 4. Files cap at 300 lines. The 6am floor is the design context: decisions must survive a tired trainer with a phone in one hand.

---

## 3. What we want from you

Answer with **decisions**, not menus. Where a real alternative exists, pick one and say in a sentence why the other loses.

1. **The treatment model (D-A).** Define the complete treatment vocabulary a staple exercise can be varied by, and the **exact selection function** that picks this week's treatment given the exercise's history. What is recorded per (exercise, class) so the rotation is possible? What prevents the brain from oscillating between two treatments forever, and what prevents it from applying a treatment that is unsafe or physically impossible for that movement (you cannot drop-set a plank)? Give the eligibility predicate per treatment.

2. **Repeat-with-variation vs genuine staleness.** A staple should return varied; but *some* movements genuinely should rest, and a class of 100% repeats-with-new-treatment will feel stale to a human even if the treatments differ. Where is that line, numerically? What is the correct replacement for the current 14-day ban — and how does it reconcile with the shipped ladder's R1 rung (§2.7)?

3. **Setup as a transition function (D-B).** Attack or confirm §2.4. If confirmed, specify the rig-state model (what is a "rig"? bands, loads, mats, benches?), the four transition costs, and how they are estimated from the existing `EQUIPMENT_SETUP_TIMES` table without a data-collection project.

4. **The rotation-boundary objective (§2.5).** Specify the scheduling algorithm that minimises the per-boundary maximum transition across stations. It must be deterministic, explainable in one chip-sized phrase, fast enough to run per Generate press, and it must degrade gracefully when no good schedule exists. Name the algorithm and its complexity; do not hand-wave "optimise."

5. **The bootcamp situation library.** The owner asked the brain to "think of many situations like that and prepare for it." Enumerate the floor situations a station-rotation bootcamp actually produces — desync, equipment contention, a station that needs a wall/floor/corner, noise, sightlines to the trainer, an exercise that cannot be done adjacent to another, spotters, participants arriving late, one group finishing early — and for each give the **detection rule and the deterministic mitigation**. Rank by frequency × damage. This is the section we most expect to be under-imagined, so be exhaustive.

6. **Class-size coupling.** How do treatment choice, rig transitions, and station count change as headcount goes 4 → 8 → 14 → 24? Give the thresholds and what flips at each.

7. **Explainability.** Everything the brain decides must be renderable as a closed-enum chip (max 2 per row) plus one class-level line — no LLM prose, ever (a rejected-then-backfilled selection must never carry a fabricated justification). Specify the chips this new intelligence adds, and what the trainer sees when the brain makes a non-obvious choice.

8. **What we got wrong.** Name the assumptions in this brief that are mistaken, and anything a builder would still have to invent after reading it. This is the highest-value section — the blueprint must not ship with holes.

9. **Slice order.** Independently shippable slices, each with acceptance criteria a builder can execute with zero further questions, layered onto the shipped slices 0-2 without regressing them.

---

## 4. Output format

Markdown. Lead with a one-paragraph executive thesis stating exactly what you would build. Then answer 1-9 in order. Be specific enough that a builder model could implement from your answer alone — exact field names, exact thresholds, exact tie-breaks, exact fallbacks. Prefer a table to a paragraph. Do not restate this brief back to us.

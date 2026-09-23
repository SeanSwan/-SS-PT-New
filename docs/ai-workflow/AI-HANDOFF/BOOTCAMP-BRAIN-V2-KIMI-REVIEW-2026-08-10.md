# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** docs/ai-workflow/AI-HANDOFF/BOOTCAMP-BRAIN-V2-MASTER-PROMPT-2026-08-10.md
**Seed:** (none)
**Tokens:** 4295 in / 10108 out | **Cost:** ~$0.1645 | **Wall:** 311.2s | **finish_reason:** stop

---

# Review: Bootcamp Brain V2 — Hostile Pass + Game Generation

Verdict up front: the audit discipline is good and the "enhance, don't rebuild" framing is correct. The two soft spots are exactly where you pointed: §4's tiering collapses under constraint pressure (monoculture is the *steady state*, not a drift risk), and §7 is sitting on a safety path that may be decorative. Answers in order.

---

## Q1 — Room model abstraction

**Build the `Room` entity. But don't build it yet.**

The decisive fact is already in §2: Sean has **two rooms at one location today** (studio + machine room). Multi-room isn't a future-growth hypothetical — `EquipmentProfile.address` is *already* conflating location and room, and the "[LIKELY] wrong-equipment root cause = profile selection" defect in §7 is almost certainly this conflation expressing itself. A profile that means "the building" cannot express "the sled lives in the studio, the leg press doesn't."

So the target architecture is: `Location` → `Room` (dims, ceiling, lanes, no-go zones) → `EquipmentProfile` scoped to a room. However, shipping a parallel Room model in slice 7 violates your own ≤300-line and slice-independence constraints for zero immediate payoff — Sean has one location.

**Path:** add nullable spatial columns to `EquipmentProfile` now (`widthFt, lengthFt, ceilingFt, lanesJson, noGoZonesJson`), named and typed so they lift cleanly into a `Room` table later (all room-scoped fields prefixed or grouped, nothing location-scoped mixed in). When location #2 arrives, the migration is a column lift, not a data archaeology project.

**Minimum viable spatial representation:** not polygons. The honest unit is the **spatial requirement tag on the exercise** matched against **room features as a set**:

- Exercise side: `lane_required` (sled), `overhead_clearance` (slam balls, KB snatch), `swing_radius` (KB swings, landmine arcs), `bailout_clearance` (anything taken to failure under load — ties to Q6).
- Room side: ceiling height, `lanes[]` (length + width each), usable area = raw area minus no-go zones.

The gate is set membership, not geometry. That fixes the actual bug class you named — "sled programmed into a room with no lane" — with maybe 60 lines.

## Q2 — How space enters selection (honest floor)

Three checks, in order of value, and **stop after the third**:

1. **Tag gate (hard, tier-1 in §4):** exercise's spatial requirements ⊆ room's features. This alone kills the sled/slam-ball misfires. Highest value, lowest complexity.
2. **Capacity sanity:** `stations × 4 athletes × footprint-per-athlete ≤ usable area`. At 16 people in a tight square, this is the difference between "crowded" and "unsafe travel between stations." One arithmetic check, no simulation.
3. **Rotation feasibility:** if the format rotates stations (and Format A does), station count must be ≤ a `maxStations` value stored on the profile — **set by Sean once**, not computed. He knows his floor; a circulation model would be fake precision.

**Do not build:** trajectories, per-person heat maps, obstacle polygons, adjacency optimizers. The moment you're computing travel distances you're simulating a room you measured once with a tape measure. The floor of usefulness is the tag gate; the ceiling of honesty is check #3.

## Q3 — Games: doctrine-filter critique + generation

### Critique: the filter is right but stated imprecisely, and it has two holes

**The elimination rule needs sharpening, because `death_by` is on your survivor list and it is an elimination game.** The correct invariant is not "elimination games violate the doctrine." It's:

> **Elimination is legal when elimination *is* failure. It is illegal when elimination *earns* rest.**

Death-by survives because the person who drops out did the most relative work — they worked until they couldn't. Classic elimination (last-place-out, knockout) fails because the loser is *rewarded* with a chair while the strong keep working. Same mechanic, opposite doctrine valence. State it this way and the filter survives scrutiny.

**Hole 1 — team scoring is a freeloader amplifier.** You list team AMRAP as a survivor and team scoring as a new primitive. A shared per-station tally lets one half-asser hide behind three carriers — it is the single most doctrine-*violating* structure on your survivor list. Fix at the primitive level: the tally primitive must support **aggregation operators**, and the default game operator should be `min()` (team score = worst member's count), not `sum()`. One operator choice converts team games from doctrine-hole to doctrine-enforcer.

**Hole 2 — open-ended randomizers are doctrine-weak.** Dice that might roll a 2 let dose float with luck. Only **guaranteed-dose randomizers** survive: shuffled finite sets (a full deck) where total volume is fixed and luck only controls *order*. The randomizer primitive must take a fixed multiset, not a dice function.

**Concurrency is the silent second filter.** Turn-taking games (relays, hot-potato) fail before doctrine is even evaluated: §2's contract is ~4 per station **all working simultaneously**. One-implement games (sled relay: 1 pushes, 3 watch) violate the room contract independent of effort. Any game proposal below that puts a body at rest is out — unless it uses a rotating-role-with-continuous-base structure (see Game 8).

### Generated games

**1. Deck of Failure (deck-of-cards)**
*Runs:* Full 54-card deck at each station; suits map to the station's 3–4 exercises, face value = reps, all 4 athletes draw and work simultaneously. *Survives:* zero footprint beyond the station; total dose is fixed the moment the deck is shuffled — half-assing changes your finish time, not your volume. *Primitive:* guaranteed-dose randomizer (shuffled finite multiset).

**2. Anchor Leg (worst-member team AMRAP)**
*Runs:* Team AMRAP per station, but the station's posted score is the **lowest** individual count each round. *Survives:* simultaneous work, no space cost, and `min()` aggregation makes sandbagging mathematically visible — the coasting member *is* the score. *Primitive:* shared per-station tally with per-person sub-tallies + `min()` operator.

**3. Pay the Toll (accumulate-to-unlock)**
*Runs:* Each station owes a collective rep target per round. Hit it → the station *unlocks* the harder variation of its exercise next round (consumes the existing `easyVariation/mediumVariation/hardVariation` fields — zero new exercise data). Miss it → same variation again. *Survives:* the reward for work is harder work — the doctrine's reward function made literal. *Primitive:* shared tally + threshold gate that swaps variation tier.

**4. Clock Towers (per-station death-by)**
*Runs:* `death_by` parameterized per station with equipment-appropriate movements; all 4 climb the rep ladder together each minute. **Missing the minute converts you to a burnout hold/finisher at that station — you never sit down.** *Survives:* this is elimination-legal under the sharpened rule (elimination = failure, converted to more work, never rest). *Primitive:* ladder scheduler with station parameterization + a miss-protocol (failure→finisher conversion).

**5. Song Surge (song-based finisher)**
*Runs:* Continuous base movement (KB swings, bike) with surge cues fired on a lyric/drum timeline ("Thunderstruck" pattern). *Survives:* zero space; the base movement guarantees dose between cues. Caveat: cue density must be high or the base movement heavy — sparse cues let effort hide between them. *Primitive:* cue/event timeline overlay on a timed interval.

**6. Red Light Burn (coach-call tempo game)**
*Runs:* Everyone works continuously; coach injects holds, pulses, tempo changes at will; last to comply adds reps to *their own* tally. *Survives:* negative space requirement, and tempo is exactly the fatigue lever §3.2 assigns to "N/A" equipment (TRX, sliders, bodyweight) — this game is how non-strippable equipment reaches failure. *Primitive:* cue overlay + micro-penalty tally. No hardware, no new exercise data.

**7. Hot Stations (non-elimination musical stations)**
*Runs:* On the rotation cue, athletes move to the next station; slowest arrival owes 5 reps at the new station. Nobody is ever out. *Survives:* the tight square is an *advantage* (short travel = fast rotation = more work density). Requires the Q2 rotation check so traffic never crosses the sled lane. *Primitive:* rotation cue + penalty tally.

**8. Sled & Swing Carousel (rotating role, continuous base)**
*Runs:* The legal way to use single-implement equipment: at the sled station, one athlete pushes a length while the other three perform continuous goblet squats/swings; pusher rotates each length. Nobody rests, ever. *Survives:* converts a concurrency violation into a concurrency-compliant format; needs the lane flag from Q1. *Primitive:* rotating-role overlay (role token passes on a rep/distance trigger).

**9. Sleeve Climb (landmine leverage ladder duel)**
*Runs:* Pairs within a station (the `partner` format at `BootcampTemplate.mjs:8-16`) mirror each other's landmine press/row reps simultaneously; a miss steps your grip *up the sleeve* (leverage regression = lighter) instead of resting. *Survives:* landmine is Sean's emphasized equipment and this uses it with zero plate-stripping; failure converts to regression, not rest. *Primitive:* leverage-regression ladder (shared with Q6) + partner mirror scoring.

**10. Drop-Set Derby (burnout-mode game)**
*Runs:* At a burnout-eligible station (KB rack *at* the station per §3.2), all 4 run synchronized strip ladders; coach calls each drop; team score = total rungs cleared. *Survives:* this *is* the doctrine — the game layer on top of true-burnout mode. *Primitive:* burnout session state (current rung per athlete) — extends §3.2's eligibility flag with a rung tracker.

**Net engine cost:** four primitives, not ten — (a) shared tally with aggregation operators, (b) guaranteed-dose randomizer, (c) cue/event timeline overlay, (d) a generic **rung tracker** (death-by rung = strip rung = leverage rung; one state machine, three skins). Rotation cues and penalties are just (c) + (a). This strengthens your §3.5 thesis: "add games" is overwhelmingly surfacing + naming over these four primitives.

## Q4 — Signal weighting + the §4 monoculture stress test

"Tie-breakers only" is correct in principle and **load-bearing-wrong in practice**. Here's the hostile read of §4:

**Under constraint, tie-breakers become primary.** Tier-1 gates (pain, equipment-for-room, quantity-for-headcount, concurrency, space) shrink the candidate pool hard. In the *studio* profile specifically — no machine room, concurrency-4 required — the pool per slot may be a dozen exercises. Tier-2 fit signals (goals, muscle balance) are coarse; they will tie constantly. Every tie falls to tier 3 — which means **Swans effectively select the class** in exactly the environment Sean trains in most. Your "evidence-first" ordering inverts under pressure.

**The three tier-3 signals are one signal wearing three costumes.** Swans steer generation → placements (counted via `BootcampExercise.exerciseLibraryId`) become usage frequency → usage correlates with Swans → Hearts accumulate on what gets programmed. Feedback loop, no independent evidence. And since Swan is trainer-global, the monoculture has a single author: Sean's taste, compounded weekly.

**Fixes, all as constraints rather than preferences:**
1. **Movement-pattern coverage floor and per-exercise frequency cap as tier-2.5** — hard-ish constraints, not tie-breakers. E.g., no exercise appears >2× per rolling N classes for the same client cohort.
2. **One exploration slot per class**: reserve a slot drawn uniformly from eligible-but-low-usage candidates, tagged `selectionReason: 'exploration'` (extends the existing field at `bootcampGenerator.mjs:152-154`). This is the epsilon that keeps the system discovering instead of converging.
3. **Monoculture metric in the usage-coverage report** (§3.1 already mandates "counted N of M; X unlinked"): add an entropy/concentration measure over 30-day placements. The NULL-FK coverage gap matters double here — unlinked rows are invisible to the monoculture detector too.
4. **Audit the `selectionReason` distribution monthly.** §4 says "auditable, not asserted" — so audit it: if >X% of picks cite tier-3 reasons, the tiering has collapsed and the report should say so.

## Q5 — Overflow

Precedence order, cheapest-to-most-structural:

1. **Substitute to a higher-concurrency exercise** (bodyweight/band variant). Invisible to the athlete, zero structural change. First always.
2. **Add a station** — respects Sean's structure; gated by equipment counts (existing `bootcampCapacity.mjs` logic) *and* the Q2 space checks.
3. **Two waves/heats at the bottleneck station** — preserves per-person work; costs clock.
4. **In-station pairing LAST and coach-opt-in only** — work/rest alternation directly contradicts §2's "all working simultaneously" contract. Listing it as an equal candidate without that flag is a doctrine violation hiding in your own strategy list.
5. **Honest refusal available at every level**, naming the bottleneck station, the binding constraint (equipment count vs. floor area), and the nearest remediation ("add 4 KB pairs, or drop to 14 athletes").

Yes, honest refusal is acceptable UX — it's the *only* acceptable terminal state. A silently degraded class trains nobody and erodes trust in the generator; a named bottleneck converts a bad class into a config fix. Render it as a first-class creator state, not an error toast. Implementation: symmetric `expand*` functions in `bootcampCapacity.mjs` next to `collapseStationCountForParticipants()` — **not** in `bootcampGenerator.mjs`, which is already 965 lines against a 300 cap.

## Q6 — True-burnout eligibility

Strip-speed is the right *primary* axis but it's one axis short, and it has three data problems:

**Missing axis: movement risk at failure.** Strip-speed × failure-safety is the real eligibility matrix. Cable pressdown to failure ≠ barbell back squat to failure in a crowded 16-person room with no bailout clearance (ties to the Q1 `bailout_clearance` tag). Loaded-spine and overhead barbell movements should be burnout-ineligible regardless of strip speed. Conversely, **your "N/A" row is wrong**: bodyweight/TRX/sliders are eligible via **leverage regression** (feet-elevated push-up → flat → knees; TRX angle walk-back). A mechanical drop set is a true drop set — it's also the only way Games 6 and 9 reach failure. Two axes, near-universal coverage, better doctrine compliance.

**Data problems:**
1. **Rack proximity is a station-layout attribute, not an exercise attribute.** You already hedged ("only if the rack is AT the station") — encode it there or the KB/DB row lies.
2. **Concurrency multiplies inventory depth.** 4 simultaneous strippers need 4× *each rung* — and both ends of the ladder: the 80s and the 5–10 lb pairs for the final 20-rep full-ROM set. That's an `EquipmentItem` depth check the current quantity gate wasn't written for.
3. **The 1:40 window needs a drop cadence, not a boolean.** Heavy-to-failure eats ~30–45s; the remainder fits 2–3 drops max. `pyramidStartWeight`/`pyramidDrops` exist but carry no timing — Format B (1:40 AMRAP + drop ladder) is **not expressible** in the format enum at `BootcampTemplate.mjs:8-16` and needs its own token. Sequence dependency: land the `5x4_r3`/`4x4_r3` enum fix (§7, slice 9) *before* layering Format B on the same enum.

## §7 stress test — the pain-gate is a safety path and may be decorative

This is the most important section in the document and it is under-prioritized. Two verified fossils describe a system that can fail **silently** in two different ways:

- **`painAwareGating.mjs:15` filters on a `status` column that doesn't exist.** In Sequelize this is a SQL error at query time. The behavior then depends entirely on the caller: if anything upstream catches and proceeds, the gate is **fail-open on a safety path** — the worst possible outcome, indistinguishable from working in normal operation. Verification must trace the error path, not just the happy path.
- **`bootcampGenerator.mjs:740`'s wrong `createdById` roster is worse than a crash.** Gating runs, queries pain entries under the wrong user, finds none, excludes nothing — no error, no log, no protection. The system *appears* functional while protecting nobody. This failure mode is invisible without an assertion test.

Also suspect by adjacency: `PainEntryCorrectiveExercise` — if the parent entry query is broken, the corrective join is equally unverified. And reconcile `isActive` vs. `status` against migration history before touching anything (was there a rename? both fossils may be one rename viewed from two sides).

**Non-negotiables before any slice ships — this is Slice 0, ahead of Swans, Hearts, and every game above:**
1. **Schema-truth integration test against the real DB:** seed a client with an active knee pain entry, generate, *assert* a contraindicated exercise is excluded. Today that test does not exist and nothing else proves the gate fires.
2. **Fail-closed, loudly:** a gating error must refuse generation with a surfaced error — never fall back to an ungated class. This is the one place "honest refusal" (§3.3's principle) is mandatory rather than merely good UX.
3. **Log gate decisions into `selectionReason`** — every exclusion citing the pain entry ID. §4's "auditable, not asserted" currently applies to preferences but not to the one gate where auditability is a safety requirement.
4. **Single-source the roster/createdById lookup** — the 740 fossil exists because two code paths derived the same roster differently.

The hostile summary: §4's tier-1 gate #1 — the load-bearing safety constraint in the entire selection doctrine — is **unverified and possibly inert**, while the brief proposes slicing Swan buttons first. Ship order should be: pain-gate verification → format-enum gap (`5x4_r3` — Sean's actual class is currently inexpressible) → studio profile scoping → *then* the fun stuff. Everything else in this brief is good. Those two fossils are the difference between a smart generator and a liability.

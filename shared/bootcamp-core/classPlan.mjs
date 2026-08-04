/**
 * ============================================================================
 * FILE: shared/bootcamp-core/classPlan.mjs
 * PURPOSE: The ClassPlan document — the one artifact every surface is a pure
 *          function of (Runner, TV, PDF, Floor Card, log-back, offline cache).
 * AUTHOR: Claude Opus 5 | CREATED: 2026-07-31 | SLICE: SWA-105 Slice 0
 * ============================================================================
 *
 * DESIGN LAW (Opus 5 §0.5): design the document first; everything downstream is
 * a pure function of it. Folders are the wrong first artifact — the schema is
 * the reusable asset, not the constraint engine.
 *
 * KEY DECISION — the plan is TIME-RELATIVE, never absolute.
 * A plan stores DURATIONS. `compileTimeline(plan, startedAt)` produces absolute
 * epoch deadlines at run time (timeline.mjs). This matters twice: a saved
 * template has no epoch, so absolute times would make plans unsaveable; and
 * clock correctness requires absolute `segmentEndsAt`. Compiling one from the
 * other is the only way to have both.
 *
 * INVARIANTS THE SHAPE ITSELF ENFORCES:
 *   - No person identifiers anywhere. Attendee state is AGGREGATE COUNTS only
 *     (`{knee: 3}`), so Rule 8 holds by construction rather than by review.
 *   - No per-person swap is representable: a swap event is station-scoped and
 *     person fields are rejected (Opus 5 §A5 — "enforce it in the type system").
 *   - No free prose on a selection: `chips` is a closed enum, so a validator
 *     backfill can never render a fabricated justification.
 *
 * Validation lives in validate.mjs; the vocabularies live in constants.mjs.
 */

import { CLASS_PLAN_SCHEMA_VERSION } from './constants.mjs';

export {
  CLASS_PLAN_SCHEMA_VERSION, BLOCK_KINDS, WORK_SHAPES, CHIPS, RUNGS, ACTORS, MOMENTS,
  RUNG_CONSTRAINT, RUNG_CHIP,
} from './constants.mjs';
export { validateClassPlan, assertValidClassPlan } from './validate.mjs';
export { runLadder, pickTop, summarizeRelaxations, STRUCTURAL_OUTS } from './relaxation.mjs';
export { deriveChips, toneChips, chipTone, CHIP_TONE } from './chips.mjs';

/**
 * Create an empty, valid-shaped ClassPlan. Every field a consumer reads is
 * present, so nothing downstream needs `?? default` — which is how drift starts.
 */
export function createClassPlan(init = {}) {
  return {
    schemaVersion: CLASS_PLAN_SCHEMA_VERSION,
    planId: init.planId ?? null,
    createdAt: init.createdAt ?? null,
    name: init.name ?? '',

    intent: {
      dayTypeId: init.intent?.dayTypeId ?? null,
      targetDurationMin: init.intent?.targetDurationMin ?? 45,
      // No assumed floor. n=4 and n=16 traverse the same code path — an engine
      // BUILT for 12 is what breaks at 4 (Kimi R10.4).
      headcount: init.intent?.headcount ?? null,
      equipmentProfileId: init.intent?.equipmentProfileId ?? null,
      // 'open_gym' = no profile; the brain may declare assumptions (Kimi R4).
      mode: init.intent?.mode ?? 'strict',
    },

    /** Frozen at class start (Kimi R6). All mid-class ops validate against THIS. */
    snapshot: init.snapshot ?? null,

    structure: {
      shape: init.structure?.shape ?? 'stations',
      stationCount: init.structure?.stationCount ?? 0,
      exercisesPerStation: init.structure?.exercisesPerStation ?? 0,
      rounds: init.structure?.rounds ?? 1,
      workSec: init.structure?.workSec ?? 30,
      restSec: init.structure?.restSec ?? 15,
      stationTransitionSec: init.structure?.stationTransitionSec ?? 30,
      roundBreakSec: init.structure?.roundBreakSec ?? 0,
    },

    blocks: init.blocks ?? [],
    stations: init.stations ?? [],

    /** Append-only. Feeds anti-repeat and the "it remembers" axis. */
    log: init.log ?? [],

    provenance: {
      generator: init.provenance?.generator ?? 'deterministic',
      brainModel: init.provenance?.brainModel ?? null,
      /** Set when the brain failed and the deterministic path shipped the class. */
      fallbackReason: init.provenance?.fallbackReason ?? null,
      /** Open Gym only: what the brain assumed was in the room (Kimi R4). */
      declaredAssumptions: init.provenance?.declaredAssumptions ?? [],
    },
  };
}

/**
 * Create an exercise slot. `chips` + `rung` are how a selection explains itself
 * WITHOUT prose — the brain may rank and order, never narrate.
 */
export function createExerciseSlot(init = {}) {
  return {
    /**
     * OCCURRENCE identity — unique across the WHOLE plan, not per block.
     * NOT the exercise id. The same exercise may legitimately appear in the
     * warmup and again in the work block; each appearance needs its own slotId
     * because slotId is what a swap, a media lookup and a log entry target.
     * Setting `slotId = exerciseRef` is the natural mistake and it makes
     * "swap slot X" ambiguous — the validator rejects it.
     */
    slotId: init.slotId ?? null,
    /** EXERCISE identity — stable across occurrences and across classes. */
    exerciseRef: init.exerciseRef ?? null,
    /**
     * WHICH STATION this slot lives at. Required for work slots in the
     * 'stations' shape; must stay null in warmup/cooldown and full_group.
     * Without this binding the Audience screen cannot know what station 2 is
     * doing and the SwapDeck cannot target a station — a hostile round found
     * the schema could not express its own primary product surface.
     */
    stationIndex: init.stationIndex ?? null,
    displayName: init.displayName ?? '',
    movement: init.movement ?? null,
    workSec: init.workSec ?? null,
    restSec: init.restSec ?? null,
    /** Generic variants — NOT Swan's Board 1/2/3 (Kimi R11 anti-leak). */
    variants: init.variants ?? [],
    chips: init.chips ?? [],
    rung: init.rung ?? 'R0',
    equipmentRefs: init.equipmentRefs ?? [],
    setupSec: init.setupSec ?? 0,
    mediaRef: init.mediaRef ?? null,
  };
}

/**
 * Constraint snapshot frozen at class start. Once this exists, equipment-profile
 * edits apply to the NEXT class (Kimi R6) — otherwise a mid-class swap can
 * suggest kit that is not physically in the room.
 */
export function createConstraintSnapshot(init = {}) {
  return {
    frozenAt: init.frozenAt ?? null,
    dayTypeId: init.dayTypeId ?? null,
    equipmentProfileId: init.equipmentProfileId ?? null,
    /**
     * Equipment as COUNTS, not presence: `{eq_kettlebell: 2, eq_dumbbell: 8}`.
     * Owning ONE kettlebell does not make a kettlebell station viable for
     * 14 people (master prompt §5.8) — a flat ref list could not say so.
     * Presence checks derive from Object.keys().
     */
    equipmentCounts: init.equipmentCounts ?? {},
    /**
     * AGGREGATE joint flags: `{knee: 3, back: 1}`. Counts, never names —
     * this shape is the reason a per-person swap is not expressible (Rule 8).
     */
    jointFlagCounts: init.jointFlagCounts ?? {},
    /**
     * The subset at contraindication severity (main's pain gate fires at 5+).
     * `{knee: 3}` alone cannot distinguish three mild tweaks from three
     * contraindications — SwapDeck tier T0 needs the severe band; the mild
     * remainder drives modification-line visibility only. severe <= total
     * per joint, enforced by the validator.
     */
    severeJointFlagCounts: init.severeJointFlagCounts ?? {},
    headcount: init.headcount ?? null,
    /** Used in the last N weeks — a RANKING input, never a filter (Kimi R1). */
    recentExerciseRefs: init.recentExerciseRefs ?? [],
  };
}

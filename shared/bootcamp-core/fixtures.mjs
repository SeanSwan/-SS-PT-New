/**
 * ============================================================================
 * FILE: shared/bootcamp-core/fixtures.mjs
 * PURPOSE: Canonical ClassPlan fixtures — the shared vocabulary for every test
 *          and the reference payloads for downstream slices.
 * AUTHOR: Claude Opus 5; Fable review pass 2026-07-31 | SLICE: SWA-105 Slice 0
 * ============================================================================
 *
 * These are not toy objects. Each one pins a decision that was argued for:
 *   - smallUpperBodyClass  — n=4. The real 6am class, per the adversarial pass.
 *                            An engine built for 12 breaks here.
 *   - fullBodyStationClass — n=14, 3 stations x 2. The everyday case.
 *   - openGymClass         — no equipment profile; brain declares assumptions.
 *   - relaxedSwapClass     — carries an R3-rung slot and a swap event, so the
 *                            relaxation ladder has a payload before slice 2.
 *
 * Fable review corrections baked in:
 *   - every work slot carries its stationIndex (the schema now REQUIRES the
 *     slot->station binding; the earlier fixtures declared 4x3=12 slots and
 *     carried 6, and nothing objected)
 *   - equipment is COUNTS (`{eq_kettlebell: 2}`), not presence
 *   - joint flags carry a severe band (main's pain gate fires at severity 5+)
 *   - the swap event names the slotId it targets
 */

import { createClassPlan, createExerciseSlot, createConstraintSnapshot } from './classPlan.mjs';

const slot = (displayName, movement, extra = {}) => createExerciseSlot({
  slotId: extra.slotId ?? displayName.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
  exerciseRef: extra.exerciseRef ?? `ex_${displayName.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
  stationIndex: extra.stationIndex ?? null,
  displayName,
  movement,
  variants: extra.variants ?? [],
  chips: extra.chips ?? [],
  rung: extra.rung ?? 'R0',
  equipmentRefs: extra.equipmentRefs ?? [],
  setupSec: extra.setupSec ?? 0,
  workSec: extra.workSec ?? null,
  restSec: extra.restSec ?? null,
});

const move = (primaryRegion, pattern, loadedJoints = [], impact = 'low') => ({
  primaryRegion, regions: [primaryRegion], pattern, joints: loadedJoints, impact,
});

/**
 * n=4 upper-body class. Two stations — four people across four stations is one
 * person per station and no rotation pressure at all.
 */
export const smallUpperBodyClass = () => createClassPlan({
  planId: 'fixture_small_upper',
  createdAt: 1_785_000_000_000,
  name: 'Upper Body — small group',
  intent: {
    dayTypeId: 'upper_body',
    targetDurationMin: 45,
    headcount: 4,
    equipmentProfileId: 'profile_main_gym',
    mode: 'strict',
  },
  structure: {
    shape: 'stations',
    stationCount: 2,
    exercisesPerStation: 3,
    rounds: 3,
    workSec: 40,
    restSec: 20,
    stationTransitionSec: 30,
    roundBreakSec: 60,
  },
  blocks: [
    {
      kind: 'warmup',
      slots: [
        slot('Band Pull-Apart', move('upper', 'pull_horizontal', ['shoulder']), { workSec: 45 }),
        slot('Scapular Wall Slide', move('upper', 'push_vertical', ['shoulder']), { workSec: 45 }),
      ],
    },
    {
      kind: 'work',
      slots: [
        // Station 0 — Press
        slot('Dumbbell Bench Press', move('upper', 'push_horizontal', ['shoulder', 'elbow']), {
          stationIndex: 0, equipmentRefs: ['eq_dumbbell', 'eq_bench'], setupSec: 20, chips: ['same_kit'],
        }),
        slot('Half-Kneeling Press', move('upper', 'push_vertical', ['shoulder']), {
          stationIndex: 0, equipmentRefs: ['eq_dumbbell'], setupSec: 5, chips: ['not_used_recently'],
        }),
        slot('Push-Up', move('upper', 'push_horizontal', ['wrist', 'shoulder']), {
          stationIndex: 0,
          variants: [
            { key: 'easier', label: 'Hands elevated' },
            { key: 'harder', label: '3-1-3 tempo' },
            { key: 'wrist', label: 'Push-up on dumbbell handles' },
          ],
          chips: ['no_setup'],
        }),
        // Station 1 — Pull
        slot('Single-Arm Row', move('upper', 'pull_horizontal', ['elbow']), {
          stationIndex: 1, equipmentRefs: ['eq_dumbbell'], setupSec: 5, chips: ['no_setup', 'same_kit'],
        }),
        slot('Ring Row', move('upper', 'pull_horizontal', ['elbow']), {
          stationIndex: 1, equipmentRefs: ['eq_rings'], setupSec: 30,
        }),
        slot('Hollow Hold', move('core', 'isometric', [], 'none'), {
          stationIndex: 1, chips: ['low_impact'],
        }),
      ],
    },
    {
      kind: 'cooldown',
      slots: [
        slot('Doorway Pec Stretch', move('upper', 'isometric', [], 'none'), { workSec: 30 }),
        slot('Lat Stretch', move('upper', 'isometric', [], 'none'), { workSec: 30 }),
      ],
    },
  ],
  stations: [
    { stationIndex: 0, label: 'Press', equipmentRefs: ['eq_dumbbell', 'eq_bench'] },
    { stationIndex: 1, label: 'Pull', equipmentRefs: ['eq_dumbbell', 'eq_rings'] },
  ],
  snapshot: createConstraintSnapshot({
    frozenAt: 1_785_000_060_000,
    dayTypeId: 'upper_body',
    equipmentProfileId: 'profile_main_gym',
    equipmentCounts: { eq_dumbbell: 8, eq_bench: 2, eq_rings: 2, eq_band: 6 },
    jointFlagCounts: { shoulder: 1 },
    severeJointFlagCounts: {},
    headcount: 4,
    recentExerciseRefs: ['ex_barbell_bench_press'],
  }),
  provenance: { generator: 'deterministic' },
});

/** n=14, 3 stations x 2 — the everyday case the TV grid is sized for. */
export const fullBodyStationClass = () => createClassPlan({
  planId: 'fixture_full_body',
  createdAt: 1_785_000_000_000,
  name: 'Full Body — Friday',
  intent: {
    dayTypeId: 'full_body',
    targetDurationMin: 50,
    headcount: 14,
    equipmentProfileId: 'profile_main_gym',
    mode: 'strict',
  },
  structure: {
    shape: 'stations',
    stationCount: 3,
    exercisesPerStation: 2,
    rounds: 2,
    workSec: 40,
    restSec: 15,
    stationTransitionSec: 45,
    roundBreakSec: 90,
  },
  blocks: [
    { kind: 'warmup', slots: [slot('World\'s Greatest Stretch', move('full', 'lunge'), { workSec: 60 })] },
    {
      kind: 'work',
      slots: [
        // Station 0 — Squat + hinge
        slot('Goblet Squat', move('lower', 'squat', ['knee']), {
          stationIndex: 0, equipmentRefs: ['eq_kettlebell'], chips: ['same_pattern'],
        }),
        slot('Romanian Deadlift', move('lower', 'hinge', ['back']), {
          stationIndex: 0, equipmentRefs: ['eq_dumbbell'],
        }),
        // Station 1 — Push + pull
        slot('Push-Up', move('upper', 'push_horizontal', ['wrist']), {
          stationIndex: 1, chips: ['no_setup'],
        }),
        slot('Bent-Over Row', move('upper', 'pull_horizontal', ['back']), {
          stationIndex: 1, equipmentRefs: ['eq_dumbbell'],
        }),
        // Station 2 — Carry + core
        slot('Farmer Carry', move('full', 'carry', ['back']), {
          stationIndex: 2, equipmentRefs: ['eq_kettlebell'], chips: ['new'],
        }),
        slot('Dead Bug', move('core', 'isometric', [], 'none'), {
          stationIndex: 2, chips: ['low_impact'],
        }),
      ],
    },
    { kind: 'cooldown', slots: [slot('Hip Flexor Stretch', move('lower', 'isometric', [], 'none'), { workSec: 30 })] },
  ],
  stations: [
    { stationIndex: 0, label: 'Squat + Hinge', equipmentRefs: ['eq_kettlebell', 'eq_dumbbell'] },
    { stationIndex: 1, label: 'Push + Pull', equipmentRefs: ['eq_dumbbell'] },
    { stationIndex: 2, label: 'Carry + Core', equipmentRefs: ['eq_kettlebell'] },
  ],
  snapshot: createConstraintSnapshot({
    frozenAt: 1_785_000_060_000,
    dayTypeId: 'full_body',
    equipmentProfileId: 'profile_main_gym',
    // 14 people / 3 stations = 4-5 per station; 2 kettlebells make station 0 a
    // sharing bottleneck the equipment-feasibility check (slice 1) must flag.
    equipmentCounts: { eq_kettlebell: 2, eq_dumbbell: 8, eq_band: 6 },
    jointFlagCounts: { knee: 3, back: 1 },
    severeJointFlagCounts: { knee: 1 },
    headcount: 14,
    recentExerciseRefs: [],
  }),
  provenance: { generator: 'deterministic' },
});

/** No equipment profile — the brain proposes and MUST declare what it assumed. */
export const openGymClass = () => createClassPlan({
  planId: 'fixture_open_gym',
  createdAt: 1_785_000_000_000,
  name: 'Cardio — open gym',
  intent: {
    dayTypeId: 'cardio',
    targetDurationMin: 30,
    headcount: 8,
    equipmentProfileId: null,
    mode: 'open_gym',
  },
  structure: {
    shape: 'full_group',
    stationCount: 0,
    exercisesPerStation: 0,
    rounds: 3,
    workSec: 30,
    restSec: 15,
    stationTransitionSec: 0,
    roundBreakSec: 60,
  },
  blocks: [
    { kind: 'warmup', slots: [slot('March in Place', move('full', 'gait', [], 'none'), { workSec: 60 })] },
    {
      kind: 'work',
      slots: [
        slot('Squat to Stand', move('lower', 'squat', ['knee'], 'low'), { chips: ['no_setup'] }),
        slot('Fast Feet', move('full', 'gait', ['ankle'], 'moderate'), { chips: ['no_setup'] }),
        slot('Push-Up', move('upper', 'push_horizontal', ['wrist']), { chips: ['no_setup'] }),
      ],
    },
    { kind: 'cooldown', slots: [slot('Standing Forward Fold', move('lower', 'isometric', [], 'none'), { workSec: 45 })] },
  ],
  provenance: {
    generator: 'brain',
    brainModel: 'swan-coach-v1',
    declaredAssumptions: [
      'Assumed bodyweight only — no equipment profile was selected.',
      'Assumed a floor surface suitable for push-ups.',
    ],
  },
});

/** Carries a relaxed slot and a swap event so the ladder has a payload to test. */
export const relaxedSwapClass = () => {
  const plan = fullBodyStationClass();
  plan.planId = 'fixture_relaxed_swap';
  plan.blocks[1].slots[0] = slot('Box Squat', move('lower', 'squat', ['knee']), {
    stationIndex: 0,
    equipmentRefs: ['eq_box'],
    // R3 = pattern fidelity relaxed; the gold-outline row in the SwapDeck.
    rung: 'R3',
    chips: ['joint_safe', 'same_kit'],
  });
  plan.log = [
    {
      actor: 'trainer',
      type: 'swap',
      moment: 'live',
      stationIndex: 0,
      slotId: 'box_squat',
      from: 'ex_goblet_squat',
      to: 'ex_box_squat',
      rung: 'R3',
      appliedAtRound: 2,
      ts: 1_785_000_900_000,
    },
  ];
  return plan;
};

export const ALL_FIXTURES = Object.freeze({
  smallUpperBodyClass,
  fullBodyStationClass,
  openGymClass,
  relaxedSwapClass,
});

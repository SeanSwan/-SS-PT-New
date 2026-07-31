/**
 * ============================================================================
 * FILE: shared/bootcamp-core/fixtures.mjs
 * PURPOSE: Canonical ClassPlan fixtures — the shared vocabulary for every test
 *          and the reference payloads for downstream slices.
 * AUTHOR: Claude Opus 5 | CREATED: 2026-07-31 | SLICE: SWA-105 Slice 0
 * ============================================================================
 *
 * These are not toy objects. Each one pins a decision that was argued for:
 *   - smallUpperBodyClass  — n=4. The real 6am class, per the adversarial pass.
 *                            An engine built for 12 breaks here.
 *   - fullBodyStationClass — n=14, 4 stations. The everyday case.
 *   - openGymClass         — no equipment profile; brain declares assumptions.
 *   - relaxedSwapClass     — carries R3-rung slots and a swap event, so the
 *                            relaxation ladder has a payload before slice 2.
 */

import { createClassPlan, createExerciseSlot, createConstraintSnapshot } from './classPlan.mjs';

const slot = (displayName, movement, extra = {}) => createExerciseSlot({
  slotId: extra.slotId ?? displayName.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
  exerciseRef: extra.exerciseRef ?? `ex_${displayName.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
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
 * n=4 upper-body class. Two stations, because four people across four stations
 * is one person per station and no rotation pressure at all.
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
        slot('Dumbbell Bench Press', move('upper', 'push_horizontal', ['shoulder', 'elbow']), {
          equipmentRefs: ['eq_dumbbell', 'eq_bench'], setupSec: 20, chips: ['same_kit'],
        }),
        slot('Single-Arm Row', move('upper', 'pull_horizontal', ['elbow']), {
          equipmentRefs: ['eq_dumbbell'], setupSec: 5, chips: ['no_setup', 'same_kit'],
        }),
        slot('Half-Kneeling Press', move('upper', 'push_vertical', ['shoulder']), {
          equipmentRefs: ['eq_dumbbell'], setupSec: 5, chips: ['not_used_recently'],
        }),
        slot('Ring Row', move('upper', 'pull_horizontal', ['elbow']), {
          equipmentRefs: ['eq_rings'], setupSec: 30,
        }),
        slot('Push-Up', move('upper', 'push_horizontal', ['wrist', 'shoulder']), {
          variants: [
            { key: 'easier', label: 'Hands elevated' },
            { key: 'harder', label: '3-1-3 tempo' },
            { key: 'wrist', label: 'Push-up on dumbbell handles' },
          ],
          chips: ['no_setup'],
        }),
        slot('Hollow Hold', move('core', 'isometric', [], 'none'), { chips: ['low_impact'] }),
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
    availableEquipmentRefs: ['eq_dumbbell', 'eq_bench', 'eq_rings', 'eq_band'],
    jointFlagCounts: { shoulder: 1 },
    headcount: 4,
    recentExerciseRefs: ['ex_barbell_bench_press'],
  }),
  provenance: { generator: 'deterministic' },
});

/** n=14, 4 stations — the everyday case, and the one the TV grid is sized for. */
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
    stationCount: 4,
    exercisesPerStation: 3,
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
        slot('Goblet Squat', move('lower', 'squat', ['knee']), { equipmentRefs: ['eq_kettlebell'], chips: ['same_pattern'] }),
        slot('Romanian Deadlift', move('lower', 'hinge', ['back']), { equipmentRefs: ['eq_dumbbell'] }),
        slot('Push-Up', move('upper', 'push_horizontal', ['wrist']), { chips: ['no_setup'] }),
        slot('Bent-Over Row', move('upper', 'pull_horizontal', ['back']), { equipmentRefs: ['eq_dumbbell'] }),
        slot('Farmer Carry', move('full', 'carry', ['back']), { equipmentRefs: ['eq_kettlebell'], chips: ['new'] }),
        slot('Dead Bug', move('core', 'isometric', [], 'none'), { chips: ['low_impact'] }),
      ],
    },
    { kind: 'cooldown', slots: [slot('Hip Flexor Stretch', move('lower', 'isometric', [], 'none'), { workSec: 30 })] },
  ],
  stations: [
    { stationIndex: 0, label: 'Squat', equipmentRefs: ['eq_kettlebell'] },
    { stationIndex: 1, label: 'Hinge', equipmentRefs: ['eq_dumbbell'] },
    { stationIndex: 2, label: 'Push', equipmentRefs: [] },
    { stationIndex: 3, label: 'Pull', equipmentRefs: ['eq_dumbbell'] },
  ],
  snapshot: createConstraintSnapshot({
    frozenAt: 1_785_000_060_000,
    dayTypeId: 'full_body',
    equipmentProfileId: 'profile_main_gym',
    availableEquipmentRefs: ['eq_kettlebell', 'eq_dumbbell', 'eq_band'],
    jointFlagCounts: { knee: 3, back: 1 },
    headcount: 14,
    recentExerciseRefs: [],
  }),
  provenance: { generator: 'deterministic' },
});

/** No equipment profile — the brain proposes and MUST declare what it assumed. */
export const openGymClass = () => {
  const plan = createClassPlan({
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
  return plan;
};

/** Carries relaxed slots and a swap event so the ladder has a payload to test. */
export const relaxedSwapClass = () => {
  const plan = fullBodyStationClass();
  plan.planId = 'fixture_relaxed_swap';
  plan.blocks[1].slots[0] = slot('Box Squat', move('lower', 'squat', ['knee']), {
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

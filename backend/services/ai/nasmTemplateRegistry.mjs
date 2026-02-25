/**
 * NASM Template Registry
 * ======================
 * Config-backed, versioned registry of NASM-aligned workout templates.
 * Provides structured schema data for OPT, CES, and PAR-Q+ frameworks.
 *
 * Phase 4A — Template Registry + Structured Schema Integration
 *
 * Architecture: Static config-backed MVP (no DB migration).
 * All entries are immutable, versioned, and git-tracked.
 * Phase 4B can lift to DB-backed if admin-editable templates become a requirement.
 */

/** Registry metadata version */
export const REGISTRY_VERSION = '4a-1.0.0';

// ── OPT Programming Schemas ────────────────────────────────────────────────

const OPT_PHASE_1_SCHEMA = {
  phase: 1,
  phaseKey: 'stabilization_endurance',
  phaseName: 'Stabilization Endurance',
  focus: 'Muscular endurance and stability',
  duration: '4-6 weeks',
  programming: {
    repRange: '12-20',
    sets: '1-3',
    tempo: '4/2/1 (slow eccentric)',
    restPeriod: '0-90 seconds',
    intensity: '50-70% 1RM',
    exerciseSelection: [
      'stability ball exercises',
      'single-leg movements',
      'core stabilization',
      'balance training',
    ],
  },
  entryThreshold: {
    minNasmScore: null,
    maxNasmScore: 59,
    goalBased: true,
    eligibleGoals: ['general_fitness', 'weight_loss', 'muscle_tone', 'rehabilitation'],
  },
  contraindications: [
    { compensation: 'kneeValgus', modification: 'Reduce range of motion, add lateral band walks' },
    { compensation: 'excessiveForwardLean', modification: 'Elevate heels, reduce load' },
    { compensation: 'lowBackArch', modification: 'Emphasize core bracing, reduce overhead movements' },
  ],
  warmupProtocol: {
    smr: true,
    staticStretching: true,
    dynamicStretching: true,
    coreActivation: true,
    balanceWork: true,
  },
};

const OPT_PHASE_2_SCHEMA = {
  phase: 2,
  phaseKey: 'strength_endurance',
  phaseName: 'Strength Endurance',
  focus: 'Increased load with stabilization demands via supersets',
  duration: '4-6 weeks',
  programming: {
    repRange: '8-12',
    sets: '2-4',
    tempo: '2/0/2 (moderate)',
    restPeriod: '0-60 seconds',
    intensity: '70-80% 1RM',
    exerciseSelection: [
      'superset pairs (strength + stabilization)',
      'compound movements',
      'proprioceptive progressions',
      'integrated balance challenges',
    ],
  },
  entryThreshold: {
    minNasmScore: 60,
    maxNasmScore: 74,
    goalBased: true,
    eligibleGoals: ['general_fitness', 'muscle_tone', 'athletic_performance', 'weight_loss'],
  },
  contraindications: [
    { compensation: 'kneeValgus', modification: 'Maintain bilateral stance for heavy loads' },
    { compensation: 'armsFallForward', modification: 'Use neutral grip, reduce overhead pressing' },
  ],
  warmupProtocol: {
    smr: true,
    staticStretching: true,
    dynamicStretching: true,
    coreActivation: true,
    balanceWork: true,
  },
};

const OPT_PHASE_3_SCHEMA = {
  phase: 3,
  phaseKey: 'hypertrophy',
  phaseName: 'Hypertrophy',
  focus: 'Maximal muscle growth through volume and time under tension',
  duration: '4-6 weeks',
  programming: {
    repRange: '6-12',
    sets: '3-5',
    tempo: '2/0/2 (moderate)',
    restPeriod: '0-60 seconds',
    intensity: '75-85% 1RM',
    exerciseSelection: [
      'isolation and compound movements',
      'machine and free weight variations',
      'progressive overload focus',
      'muscle group split training',
    ],
  },
  entryThreshold: {
    minNasmScore: 75,
    maxNasmScore: 89,
    goalBased: true,
    eligibleGoals: ['muscle_gain', 'body_composition', 'athletic_performance'],
  },
  contraindications: [
    { compensation: 'lowBackArch', modification: 'Limit spinal loading, use belt for heavy sets' },
    { compensation: 'forwardHead', modification: 'Avoid heavy barbell back squats, use front-loaded variations' },
  ],
  warmupProtocol: {
    smr: true,
    staticStretching: false,
    dynamicStretching: true,
    coreActivation: true,
    balanceWork: false,
  },
};

const OPT_PHASE_4_SCHEMA = {
  phase: 4,
  phaseKey: 'maximal_strength',
  phaseName: 'Maximal Strength',
  focus: 'Maximum force production through heavy loading',
  duration: '4-6 weeks',
  programming: {
    repRange: '1-5',
    sets: '4-6',
    tempo: 'X/0/X (explosive or controlled)',
    restPeriod: '3-5 minutes',
    intensity: '85-100% 1RM',
    exerciseSelection: [
      'compound barbell movements',
      'powerlifting variations',
      'heavy machine work',
      'neural drive exercises',
    ],
  },
  entryThreshold: {
    minNasmScore: 90,
    maxNasmScore: null,
    goalBased: true,
    eligibleGoals: ['strength', 'athletic_performance', 'powerlifting'],
  },
  contraindications: [
    { compensation: 'kneeValgus', modification: 'Use box squats, limit depth under maximal load' },
    { compensation: 'excessiveForwardLean', modification: 'Use safety squat bar, front squat alternatives' },
    { compensation: 'lowBackArch', modification: 'Mandatory belt use, avoid good mornings' },
  ],
  warmupProtocol: {
    smr: true,
    staticStretching: false,
    dynamicStretching: true,
    coreActivation: true,
    balanceWork: false,
  },
};

const OPT_PHASE_5_SCHEMA = {
  phase: 5,
  phaseKey: 'power',
  phaseName: 'Power',
  focus: 'Maximum force at maximum velocity',
  duration: '4-6 weeks',
  programming: {
    repRange: '1-5 (strength) / 8-10 (power)',
    sets: '3-5',
    tempo: 'X/X/X (explosive)',
    restPeriod: '3-5 minutes',
    intensity: '30-45% 1RM (power) / 85-100% 1RM (strength)',
    exerciseSelection: [
      'superset pairs (strength + power)',
      'Olympic lift variations',
      'plyometrics',
      'medicine ball throws',
    ],
  },
  entryThreshold: {
    minNasmScore: 90,
    maxNasmScore: null,
    goalBased: true,
    eligibleGoals: ['athletic_performance', 'power', 'sport_specific'],
  },
  contraindications: [
    { compensation: 'kneeValgus', modification: 'Limit plyometric depth, use bilateral landings' },
    { compensation: 'excessiveForwardLean', modification: 'Reduce Olympic lift complexity, use hang variations' },
    { compensation: 'asymmetricWeightShift', modification: 'Address asymmetry before explosive loading' },
  ],
  warmupProtocol: {
    smr: true,
    staticStretching: false,
    dynamicStretching: true,
    coreActivation: true,
    balanceWork: false,
  },
};

// ── CES Corrective Schema ──────────────────────────────────────────────────

const CES_CORRECTIVE_SCHEMA = {
  compensationMap: [
    {
      compensationKey: 'kneeValgus',
      compensationLabel: 'Knee Valgus',
      view: 'anterior',
      overactiveMuscles: ['adductor complex', 'biceps femoris (short head)', 'TFL', 'vastus lateralis'],
      underactiveMuscles: ['gluteus medius', 'gluteus maximus', 'vastus medialis oblique (VMO)'],
      inhibit: [
        { muscle: 'adductor complex', exercise: 'Foam roll adductors', duration: '30-60s', sets: 1 },
        { muscle: 'TFL', exercise: 'Foam roll TFL/IT band', duration: '30-60s', sets: 1 },
      ],
      lengthen: [
        { muscle: 'adductor complex', exercise: 'Adductor stretch', duration: '30s', sets: 2 },
        { muscle: 'TFL', exercise: 'Standing TFL stretch', duration: '30s', sets: 2 },
      ],
      activate: [
        { muscle: 'gluteus medius', exercise: 'Side-lying hip abduction', reps: '10-15', sets: 2 },
        { muscle: 'VMO', exercise: 'Ball squeeze (terminal knee extension)', reps: '10-15', sets: 2 },
      ],
      integrate: [
        { muscle: 'gluteus medius', exercise: 'Lateral band walk', reps: '10-15 each direction', sets: 2 },
      ],
    },
    {
      compensationKey: 'feetTurnout',
      compensationLabel: 'Feet Turn Out',
      view: 'anterior',
      overactiveMuscles: ['soleus', 'lateral gastrocnemius', 'biceps femoris (short head)'],
      underactiveMuscles: ['medial gastrocnemius', 'medial hamstring', 'gracilis', 'popliteus'],
      inhibit: [
        { muscle: 'lateral gastrocnemius', exercise: 'Foam roll lateral calf', duration: '30-60s', sets: 1 },
        { muscle: 'biceps femoris', exercise: 'Foam roll lateral hamstring', duration: '30-60s', sets: 1 },
      ],
      lengthen: [
        { muscle: 'lateral gastrocnemius', exercise: 'Calf stretch (toes forward)', duration: '30s', sets: 2 },
      ],
      activate: [
        { muscle: 'medial hamstring', exercise: 'Single-leg Romanian deadlift', reps: '10-15', sets: 2 },
      ],
      integrate: [
        { muscle: 'medial hamstring', exercise: 'Step-up to balance', reps: '10-15', sets: 2 },
      ],
    },
    {
      compensationKey: 'feetFlattening',
      compensationLabel: 'Feet Flatten (Pronation Distortion)',
      view: 'anterior',
      overactiveMuscles: ['peroneals', 'lateral gastrocnemius', 'biceps femoris (short head)', 'TFL'],
      underactiveMuscles: ['anterior tibialis', 'posterior tibialis', 'gluteus medius'],
      inhibit: [
        { muscle: 'peroneals', exercise: 'Foam roll peroneals', duration: '30-60s', sets: 1 },
        { muscle: 'lateral gastrocnemius', exercise: 'Foam roll lateral calf', duration: '30-60s', sets: 1 },
      ],
      lengthen: [
        { muscle: 'gastrocnemius/soleus', exercise: 'Calf stretch', duration: '30s', sets: 2 },
      ],
      activate: [
        { muscle: 'anterior tibialis', exercise: 'Toe raises', reps: '10-15', sets: 2 },
        { muscle: 'posterior tibialis', exercise: 'Single-leg balance reach', reps: '10-15', sets: 2 },
      ],
      integrate: [
        { muscle: 'posterior tibialis', exercise: 'Single-leg squat', reps: '10-15', sets: 2 },
      ],
    },
    {
      compensationKey: 'excessiveForwardLean',
      compensationLabel: 'Excessive Forward Lean',
      view: 'lateral',
      overactiveMuscles: ['soleus', 'gastrocnemius', 'hip flexor complex', 'abdominal complex'],
      underactiveMuscles: ['gluteus maximus', 'erector spinae', 'anterior tibialis'],
      inhibit: [
        { muscle: 'gastrocnemius/soleus', exercise: 'Foam roll calves', duration: '30-60s', sets: 1 },
        { muscle: 'hip flexors', exercise: 'Foam roll hip flexors', duration: '30-60s', sets: 1 },
      ],
      lengthen: [
        { muscle: 'gastrocnemius/soleus', exercise: 'Standing calf stretch', duration: '30s', sets: 2 },
        { muscle: 'hip flexors', exercise: 'Kneeling hip flexor stretch', duration: '30s', sets: 2 },
      ],
      activate: [
        { muscle: 'gluteus maximus', exercise: 'Floor bridge', reps: '10-15', sets: 2 },
        { muscle: 'anterior tibialis', exercise: 'Toe raises', reps: '10-15', sets: 2 },
      ],
      integrate: [
        { muscle: 'gluteus maximus', exercise: 'Squat to row', reps: '10-15', sets: 2 },
      ],
    },
    {
      compensationKey: 'lowBackArch',
      compensationLabel: 'Low Back Arches (Anterior Pelvic Tilt)',
      view: 'lateral',
      overactiveMuscles: ['hip flexor complex', 'erector spinae', 'latissimus dorsi'],
      underactiveMuscles: ['gluteus maximus', 'hamstring complex', 'intrinsic core stabilizers'],
      inhibit: [
        { muscle: 'hip flexors', exercise: 'Foam roll hip flexors', duration: '30-60s', sets: 1 },
        { muscle: 'latissimus dorsi', exercise: 'Foam roll lats', duration: '30-60s', sets: 1 },
      ],
      lengthen: [
        { muscle: 'hip flexors', exercise: 'Kneeling hip flexor stretch', duration: '30s', sets: 2 },
        { muscle: 'latissimus dorsi', exercise: 'Lat stretch on ball', duration: '30s', sets: 2 },
      ],
      activate: [
        { muscle: 'core stabilizers', exercise: 'Drawing-in maneuver + plank', reps: '10-15s hold', sets: 2 },
        { muscle: 'gluteus maximus', exercise: 'Floor bridge', reps: '10-15', sets: 2 },
      ],
      integrate: [
        { muscle: 'core/glutes', exercise: 'Ball squat', reps: '10-15', sets: 2 },
      ],
    },
    {
      compensationKey: 'armsFallForward',
      compensationLabel: 'Arms Fall Forward',
      view: 'lateral',
      overactiveMuscles: ['latissimus dorsi', 'teres major', 'pectoralis major/minor'],
      underactiveMuscles: ['mid/lower trapezius', 'rhomboids', 'rotator cuff'],
      inhibit: [
        { muscle: 'latissimus dorsi', exercise: 'Foam roll lats', duration: '30-60s', sets: 1 },
        { muscle: 'pectoralis', exercise: 'Foam roll chest', duration: '30-60s', sets: 1 },
      ],
      lengthen: [
        { muscle: 'latissimus dorsi', exercise: 'Lat stretch', duration: '30s', sets: 2 },
        { muscle: 'pectoralis', exercise: 'Doorway chest stretch', duration: '30s', sets: 2 },
      ],
      activate: [
        { muscle: 'mid/lower trapezius', exercise: 'Prone Y-T-W raises', reps: '10-15', sets: 2 },
        { muscle: 'rotator cuff', exercise: 'External rotation', reps: '10-15', sets: 2 },
      ],
      integrate: [
        { muscle: 'scapular stabilizers', exercise: 'Standing cable row', reps: '10-15', sets: 2 },
      ],
    },
    {
      compensationKey: 'forwardHead',
      compensationLabel: 'Forward Head Posture',
      view: 'lateral',
      overactiveMuscles: ['upper trapezius', 'levator scapulae', 'sternocleidomastoid'],
      underactiveMuscles: ['deep cervical flexors', 'lower trapezius'],
      inhibit: [
        { muscle: 'upper trapezius', exercise: 'Foam roll upper traps', duration: '30-60s', sets: 1 },
        { muscle: 'sternocleidomastoid', exercise: 'Self-massage SCM', duration: '30-60s', sets: 1 },
      ],
      lengthen: [
        { muscle: 'upper trapezius', exercise: 'Upper trap stretch', duration: '30s', sets: 2 },
        { muscle: 'levator scapulae', exercise: 'Levator scapulae stretch', duration: '30s', sets: 2 },
      ],
      activate: [
        { muscle: 'deep cervical flexors', exercise: 'Chin tucks', reps: '10-15', sets: 2 },
      ],
      integrate: [
        { muscle: 'cervical/scapular', exercise: 'Standing chin tuck + scaption', reps: '10-15', sets: 2 },
      ],
    },
    {
      compensationKey: 'kneeVarus',
      compensationLabel: 'Knee Varus (Bowlegged)',
      view: 'anterior',
      overactiveMuscles: ['piriformis', 'biceps femoris (short head)', 'TFL', 'vastus lateralis'],
      underactiveMuscles: ['adductor complex', 'medial hamstring', 'medial gastrocnemius'],
      inhibit: [
        { muscle: 'piriformis', exercise: 'Foam roll piriformis', duration: '30-60s', sets: 1 },
        { muscle: 'TFL', exercise: 'Foam roll TFL', duration: '30-60s', sets: 1 },
      ],
      lengthen: [
        { muscle: 'piriformis', exercise: 'Piriformis stretch', duration: '30s', sets: 2 },
      ],
      activate: [
        { muscle: 'adductor complex', exercise: 'Side-lying adduction', reps: '10-15', sets: 2 },
        { muscle: 'medial hamstring', exercise: 'Ball squeeze + curl', reps: '10-15', sets: 2 },
      ],
      integrate: [
        { muscle: 'adductors/medial chain', exercise: 'Step-up with adduction emphasis', reps: '10-15', sets: 2 },
      ],
    },
    {
      compensationKey: 'asymmetricWeightShift',
      compensationLabel: 'Asymmetric Weight Shift',
      view: 'global',
      overactiveMuscles: ['dominant-side adductors', 'dominant-side hip flexors', 'QL (contralateral)'],
      underactiveMuscles: ['non-dominant gluteus medius', 'core obliques (contralateral)'],
      inhibit: [
        { muscle: 'adductors (dominant side)', exercise: 'Foam roll adductors (dominant)', duration: '30-60s', sets: 1 },
        { muscle: 'QL', exercise: 'Foam roll QL', duration: '30-60s', sets: 1 },
      ],
      lengthen: [
        { muscle: 'adductors', exercise: 'Adductor stretch (dominant side)', duration: '30s', sets: 2 },
      ],
      activate: [
        { muscle: 'gluteus medius (non-dominant)', exercise: 'Side-lying hip abduction (non-dominant)', reps: '10-15', sets: 2 },
        { muscle: 'core obliques', exercise: 'Side plank (non-dominant)', reps: '15-30s hold', sets: 2 },
      ],
      integrate: [
        { muscle: 'bilateral stability', exercise: 'Single-leg squat (non-dominant)', reps: '10-15', sets: 2 },
      ],
    },
  ],
  defaultIntegration: [
    { muscle: 'full body', exercise: 'Squat to row', reps: '10-15', sets: 2 },
    { muscle: 'full body', exercise: 'Step-up to balance with overhead press', reps: '10-15', sets: 2 },
  ],
  severityScoring: { none: 100, minor: 70, significant: 40 },
  checkpointCount: 9,
};

// ── PAR-Q+ Assessment Schema ───────────────────────────────────────────────

const PARQ_PLUS_SCHEMA = {
  questions: [
    { key: 'heartCondition', questionText: 'Has your doctor ever said that you have a heart condition?', requiresFollowUp: true, triggersMedicalClearance: true, followUpFields: ['heartConditionDetails'] },
    { key: 'chestPainActivity', questionText: 'Do you feel pain in your chest when you do physical activity?', requiresFollowUp: false, triggersMedicalClearance: true, followUpFields: [] },
    { key: 'chestPainRest', questionText: 'In the past month, have you had chest pain when you were not doing physical activity?', requiresFollowUp: false, triggersMedicalClearance: true, followUpFields: [] },
    { key: 'balanceDizziness', questionText: 'Do you lose your balance because of dizziness or do you ever lose consciousness?', requiresFollowUp: true, triggersMedicalClearance: true, followUpFields: ['dizzinessDetails'] },
    { key: 'boneJointProblem', questionText: 'Do you have a bone or joint problem that could be made worse by a change in your physical activity?', requiresFollowUp: true, triggersMedicalClearance: false, followUpFields: ['jointDetails'] },
    { key: 'drugsPrescribed', questionText: 'Is your doctor currently prescribing drugs for your blood pressure or heart condition?', requiresFollowUp: false, triggersMedicalClearance: true, followUpFields: [] },
    { key: 'otherReason', questionText: 'Do you know of any other reason why you should not do physical activity?', requiresFollowUp: true, triggersMedicalClearance: false, followUpFields: ['otherReasonDetails'] },
  ],
  clearanceRule: {
    directTriggerQuestions: ['heartCondition', 'chestPainActivity', 'chestPainRest', 'balanceDizziness', 'drugsPrescribed'],
    followUpRequiredQuestions: ['boneJointProblem', 'otherReason'],
  },
  requiredFields: ['heartCondition', 'chestPainActivity', 'chestPainRest', 'balanceDizziness', 'boneJointProblem', 'drugsPrescribed', 'otherReason'],
  optionalFields: ['heartConditionDetails', 'dizzinessDetails', 'jointDetails', 'otherReasonDetails'],
};

// ── Source Attribution ──────────────────────────────────────────────────────

const NASM_OPT_SOURCE = {
  provider: 'NASM',
  framework: 'NASM OPT Model',
  edition: '7th Edition',
  sourceUrl: null,
  sourceLabel: 'NASM Essentials of Personal Fitness Training',
  licenseNotes: 'App-native schema. No copyrighted content reproduced.',
  lastVerifiedAt: '2026-02-24',
};

const NASM_CES_SOURCE = {
  provider: 'NASM',
  framework: 'NASM Corrective Exercise Continuum',
  edition: '2nd Edition',
  sourceUrl: null,
  sourceLabel: 'NASM Essentials of Corrective Exercise Training',
  licenseNotes: 'App-native schema. No copyrighted content reproduced.',
  lastVerifiedAt: '2026-02-24',
};

const PARQ_SOURCE = {
  provider: 'NASM',
  framework: 'PAR-Q+ Pre-Participation Screening',
  edition: '2024 Revision',
  sourceUrl: null,
  sourceLabel: 'Physical Activity Readiness Questionnaire for Everyone',
  licenseNotes: 'App-native schema. No copyrighted content reproduced.',
  lastVerifiedAt: '2026-02-24',
};

const GENERAL_SOURCE = {
  provider: 'NASM',
  framework: 'General Programming',
  edition: '7th Edition',
  sourceUrl: null,
  sourceLabel: 'NASM Essentials of Personal Fitness Training',
  licenseNotes: 'App-native schema. No copyrighted content reproduced.',
  lastVerifiedAt: '2026-02-24',
};

// ── Registry Entries ────────────────────────────────────────────────────────

const NOW = '2026-02-24T00:00:00.000Z';

/** @type {NasmTemplateEntry[]} */
const REGISTRY = [
  {
    id: 'opt-phase-1-stabilization',
    label: 'OPT Phase 1: Stabilization Endurance',
    category: 'programming',
    status: 'active',
    source: NASM_OPT_SOURCE,
    templateVersion: '1.0.0',
    schemaVersion: '1.0.0',
    nasmFramework: 'OPT',
    optPhase: 1,
    supportsAiContext: true,
    enabledFor: { prepMode: true, sessionMode: true, aiDrafting: true },
    schema: OPT_PHASE_1_SCHEMA,
    tags: ['opt', 'stabilization', 'phase1', 'beginner'],
    createdAt: NOW,
    updatedAt: NOW,
    replacedBy: null,
  },
  {
    id: 'opt-phase-2-strength-endurance',
    label: 'OPT Phase 2: Strength Endurance',
    category: 'programming',
    status: 'active',
    source: NASM_OPT_SOURCE,
    templateVersion: '1.0.0',
    schemaVersion: '1.0.0',
    nasmFramework: 'OPT',
    optPhase: 2,
    supportsAiContext: true,
    enabledFor: { prepMode: true, sessionMode: true, aiDrafting: true },
    schema: OPT_PHASE_2_SCHEMA,
    tags: ['opt', 'strength-endurance', 'phase2', 'intermediate'],
    createdAt: NOW,
    updatedAt: NOW,
    replacedBy: null,
  },
  {
    id: 'opt-phase-3-hypertrophy',
    label: 'OPT Phase 3: Hypertrophy',
    category: 'programming',
    status: 'active',
    source: NASM_OPT_SOURCE,
    templateVersion: '1.0.0',
    schemaVersion: '1.0.0',
    nasmFramework: 'OPT',
    optPhase: 3,
    supportsAiContext: true,
    enabledFor: { prepMode: true, sessionMode: true, aiDrafting: true },
    schema: OPT_PHASE_3_SCHEMA,
    tags: ['opt', 'hypertrophy', 'phase3', 'intermediate'],
    createdAt: NOW,
    updatedAt: NOW,
    replacedBy: null,
  },
  {
    id: 'opt-phase-4-maximal-strength',
    label: 'OPT Phase 4: Maximal Strength',
    category: 'programming',
    status: 'active',
    source: NASM_OPT_SOURCE,
    templateVersion: '1.0.0',
    schemaVersion: '1.0.0',
    nasmFramework: 'OPT',
    optPhase: 4,
    supportsAiContext: true,
    enabledFor: { prepMode: true, sessionMode: true, aiDrafting: true },
    schema: OPT_PHASE_4_SCHEMA,
    tags: ['opt', 'maximal-strength', 'phase4', 'advanced'],
    createdAt: NOW,
    updatedAt: NOW,
    replacedBy: null,
  },
  {
    id: 'opt-phase-5-power',
    label: 'OPT Phase 5: Power',
    category: 'programming',
    status: 'active',
    source: NASM_OPT_SOURCE,
    templateVersion: '1.0.0',
    schemaVersion: '1.0.0',
    nasmFramework: 'OPT',
    optPhase: 5,
    supportsAiContext: true,
    enabledFor: { prepMode: true, sessionMode: true, aiDrafting: true },
    schema: OPT_PHASE_5_SCHEMA,
    tags: ['opt', 'power', 'phase5', 'advanced'],
    createdAt: NOW,
    updatedAt: NOW,
    replacedBy: null,
  },
  {
    id: 'ces-corrective-strategy',
    label: 'Corrective Exercise Strategy',
    category: 'corrective',
    status: 'active',
    source: NASM_CES_SOURCE,
    templateVersion: '1.0.0',
    schemaVersion: '1.0.0',
    nasmFramework: 'CES',
    optPhase: null,
    supportsAiContext: true,
    enabledFor: { prepMode: true, sessionMode: true, aiDrafting: true },
    schema: CES_CORRECTIVE_SCHEMA,
    tags: ['ces', 'corrective', 'movement-assessment'],
    createdAt: NOW,
    updatedAt: NOW,
    replacedBy: null,
  },
  {
    id: 'parq-plus-screening',
    label: 'PAR-Q+ Pre-Participation Screening',
    category: 'assessment',
    status: 'active',
    source: PARQ_SOURCE,
    templateVersion: '1.0.0',
    schemaVersion: '1.0.0',
    nasmFramework: 'PAR-Q+',
    optPhase: null,
    supportsAiContext: true,
    enabledFor: { prepMode: true, sessionMode: false, aiDrafting: true },
    schema: PARQ_PLUS_SCHEMA,
    tags: ['parq', 'screening', 'assessment', 'safety'],
    createdAt: NOW,
    updatedAt: NOW,
    replacedBy: null,
  },
  // ── Pending Schema (ID reservations) ─────────────────────────────────────
  {
    id: 'general-beginner',
    label: 'General Fitness: Beginner',
    category: 'programming',
    status: 'pending_schema',
    source: GENERAL_SOURCE,
    templateVersion: '0.1.0',
    schemaVersion: '0.1.0',
    nasmFramework: 'GENERAL',
    optPhase: null,
    supportsAiContext: false,
    enabledFor: { prepMode: false, sessionMode: false, aiDrafting: false },
    schema: null,
    tags: ['general', 'beginner'],
    createdAt: NOW,
    updatedAt: NOW,
    replacedBy: null,
  },
  {
    id: 'general-intermediate',
    label: 'General Fitness: Intermediate',
    category: 'programming',
    status: 'pending_schema',
    source: GENERAL_SOURCE,
    templateVersion: '0.1.0',
    schemaVersion: '0.1.0',
    nasmFramework: 'GENERAL',
    optPhase: null,
    supportsAiContext: false,
    enabledFor: { prepMode: false, sessionMode: false, aiDrafting: false },
    schema: null,
    tags: ['general', 'intermediate'],
    createdAt: NOW,
    updatedAt: NOW,
    replacedBy: null,
  },
  {
    id: 'general-advanced',
    label: 'General Fitness: Advanced',
    category: 'programming',
    status: 'pending_schema',
    source: GENERAL_SOURCE,
    templateVersion: '0.1.0',
    schemaVersion: '0.1.0',
    nasmFramework: 'GENERAL',
    optPhase: null,
    supportsAiContext: false,
    enabledFor: { prepMode: false, sessionMode: false, aiDrafting: false },
    schema: null,
    tags: ['general', 'advanced'],
    createdAt: NOW,
    updatedAt: NOW,
    replacedBy: null,
  },
];

// ── Degraded Response ID Alias Map ─────────────────────────────────────────

/**
 * Maps legacy degradedResponse.mjs IDs to new registry IDs.
 * Used to preserve backward compatibility without changing the public API contract.
 */
export const TEMPLATE_ID_ALIASES = {
  'opt-1-stabilization':    'opt-phase-1-stabilization',
  'opt-2-strength':         'opt-phase-2-strength-endurance',
  'opt-2-strength-endurance': 'opt-phase-2-strength-endurance',
  'opt-3-hypertrophy':      'opt-phase-3-hypertrophy',
  'opt-4-maxstrength':      'opt-phase-4-maximal-strength',
  'opt-4-maximal-strength': 'opt-phase-4-maximal-strength',
  'opt-5-power':            'opt-phase-5-power',
  'ces-general':            'ces-corrective-strategy',
  'general-beginner':       'general-beginner',
  'general-intermediate':   'general-intermediate',
  'general-advanced':       'general-advanced',
};

// ── Phase Key → Template ID Map ────────────────────────────────────────────

const PHASE_KEY_TO_TEMPLATE_ID = {
  stabilization_endurance: 'opt-phase-1-stabilization',
  strength_endurance:      'opt-phase-2-strength-endurance',
  hypertrophy:             'opt-phase-3-hypertrophy',
  maximal_strength:        'opt-phase-4-maximal-strength',
  power:                   'opt-phase-5-power',
};

// ── Lookup Functions ────────────────────────────────────────────────────────

/**
 * Get all templates.
 * @returns {NasmTemplateEntry[]}
 */
export function getAllTemplates() {
  return [...REGISTRY];
}

/**
 * Get a template by ID. Also checks alias map.
 * @param {string} id
 * @returns {NasmTemplateEntry | null}
 */
export function getTemplateById(id) {
  const resolvedId = TEMPLATE_ID_ALIASES[id] || id;
  return REGISTRY.find(t => t.id === resolvedId) || null;
}

/**
 * Get templates by category.
 * @param {'programming' | 'corrective' | 'assessment' | 'reference'} category
 * @returns {NasmTemplateEntry[]}
 */
export function getTemplatesByCategory(category) {
  return REGISTRY.filter(t => t.category === category);
}

/**
 * Get templates by NASM framework.
 * @param {'OPT' | 'CES' | 'PAR-Q+' | 'GENERAL'} framework
 * @returns {NasmTemplateEntry[]}
 */
export function getTemplatesByFramework(framework) {
  return REGISTRY.filter(t => t.nasmFramework === framework);
}

/**
 * Get templates by status.
 * @param {'active' | 'deprecated' | 'pending_schema'} status
 * @returns {NasmTemplateEntry[]}
 */
export function getTemplatesByStatus(status) {
  return REGISTRY.filter(t => t.status === status);
}

/**
 * Get a template by OPT phase key (e.g. 'stabilization_endurance').
 * @param {string} phaseKey
 * @returns {NasmTemplateEntry | null}
 */
export function getTemplateByPhaseKey(phaseKey) {
  const templateId = PHASE_KEY_TO_TEMPLATE_ID[phaseKey];
  if (!templateId) return null;
  return REGISTRY.find(t => t.id === templateId) || null;
}

/**
 * Resolve a legacy alias ID to the canonical registry ID.
 * Returns the input if no alias exists.
 * @param {string} aliasId
 * @returns {string}
 */
export function resolveAlias(aliasId) {
  return TEMPLATE_ID_ALIASES[aliasId] || aliasId;
}

export interface Assessment {
  id: number;
  clientName?: string;
  type?: string;
  score?: number;
  notes?: string;
  date?: string;
  fullName?: string;
  nasmAssessmentScore?: number;
  source?: string;
  assessmentDate?: string;
  status?: string;
}

export interface ClientOption {
  id: number;
  name: string;
}

export const ASSESSMENT_TYPES = [
  { value: 'movement_screen', label: 'Movement Screen' },
  { value: 'postural_analysis', label: 'Postural Analysis' },
  { value: 'performance_test', label: 'Performance Test' },
] as const;

export type AssessmentType = (typeof ASSESSMENT_TYPES)[number]['value'];

export const OHSA_CHECKPOINTS = [
  { key: 'feetTurnout', label: 'Feet Turn Out', view: 'anterior' },
  { key: 'feetFlattening', label: 'Feet Flatten (Pronate)', view: 'anterior' },
  { key: 'kneeValgus', label: 'Knees Move Inward (Valgus)', view: 'anterior' },
  { key: 'kneeVarus', label: 'Knees Move Outward (Varus)', view: 'anterior' },
  { key: 'excessiveForwardLean', label: 'Excessive Forward Lean', view: 'lateral' },
  { key: 'lowBackArch', label: 'Low Back Arches (Extension)', view: 'lateral' },
  { key: 'armsFallForward', label: 'Arms Fall Forward', view: 'lateral' },
  { key: 'forwardHead', label: 'Forward Head Posture', view: 'lateral' },
  { key: 'asymmetricWeightShift', label: 'Asymmetric Weight Shift', view: 'posterior' },
] as const;

export const OHSA_ANTERIOR_KEYS = ['feetTurnout', 'feetFlattening', 'kneeValgus', 'kneeVarus'];
export const OHSA_LATERAL_KEYS = ['excessiveForwardLean', 'lowBackArch', 'armsFallForward', 'forwardHead'];

export const POSTURAL_CHECKPOINTS = [
  { key: 'forwardHead', label: 'Forward Head Posture', view: 'lateral' },
  { key: 'roundedShoulders', label: 'Rounded Shoulders', view: 'lateral' },
  { key: 'kyphosis', label: 'Thoracic Kyphosis', view: 'lateral' },
  { key: 'anteriorPelvicTilt', label: 'Anterior Pelvic Tilt', view: 'lateral' },
  { key: 'kneeValgusVarus', label: 'Knee Valgus / Varus', view: 'anterior' },
  { key: 'footPronation', label: 'Foot Pronation', view: 'anterior' },
] as const;

export const PERFORMANCE_TESTS = [
  { key: 'pushUpReps', label: 'Push-Up Test (reps in 60s)', unit: 'reps' },
  { key: 'daviesScore', label: 'Davies Test (touches in 15s)', unit: 'touches' },
  { key: 'sharkSkillTime', label: 'Shark Skill Test (seconds)', unit: 'seconds' },
  { key: 'singleLegSquatScore', label: 'Single-Leg Squat (1-5 scale)', unit: 'score' },
  { key: 'cardioHR', label: 'YMCA Step Test (recovery HR)', unit: 'bpm' },
] as const;

export const COMPENSATION_LEVELS = ['none', 'minor', 'significant'] as const;
export type CompensationLevel = (typeof COMPENSATION_LEVELS)[number];

export const TYPE_CRITERIA: Record<AssessmentType, { description: string; criteria: string[]; checkpoints: string[] }> = {
  movement_screen: {
    description: 'NASM Overhead Squat Assessment (OHSA) - Evaluate kinetic chain checkpoints from anterior, lateral, and posterior views to identify movement compensations and muscle imbalances.',
    criteria: ['Foot/Ankle Complex', 'Knee Complex', 'LPHC (Lumbo-Pelvic-Hip)', 'Shoulder Complex', 'Cervical Spine / Head'],
    checkpoints: ['Feet flatten or turn out', 'Knees move inward (valgus)', 'Excessive forward lean', 'Low back arches (extension)', 'Arms fall forward'],
  },
  postural_analysis: {
    description: 'NASM Static Posture Assessment - Observe alignment deviations from anterior, lateral, and posterior views. Identify Upper Crossed Syndrome and Lower Crossed Syndrome patterns.',
    criteria: ['Forward Head Posture', 'Rounded Shoulders', 'Kyphosis / Lordosis', 'Anterior Pelvic Tilt', 'Knee Valgus / Varus'],
    checkpoints: ['Cervical spine extension', 'Scapular protraction / winging', 'Thoracic kyphosis increase', 'Lumbar lordosis increase', 'Foot pronation / supination'],
  },
  performance_test: {
    description: 'NASM Cardiorespiratory and Muscular Fitness Assessments - Establish baseline metrics for OPT phase selection and track client progress over time.',
    criteria: ['Push-Up Test (endurance)', 'Davies Test (UB agility)', 'Shark Skill Test (LB agility)', 'Single-Leg Squat', 'Rockport Walk / YMCA Step'],
    checkpoints: ['Max reps in 60 seconds', 'Alternating hand touches in 15s', 'Timed box pattern completion', 'Knee valgus / torso lean compensations', 'Estimated VO2max from HR recovery'],
  },
};

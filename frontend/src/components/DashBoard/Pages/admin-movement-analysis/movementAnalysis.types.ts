/**
 * Movement Analysis TypeScript Types
 * ===================================
 * Phase 13 — NASM + Squat University Movement Analysis
 */

export type CompensationLevel = 'none' | 'minor' | 'significant';
export type MobilityRating = 'adequate' | 'limited' | 'significant';
export type MovementRating = 'excellent' | 'good' | 'fair' | 'poor';
export type SquatDepth = 'full' | 'parallel' | 'above_parallel' | 'quarter';
export type AnalysisStatus = 'draft' | 'completed' | 'linked' | 'archived';
export type AnalysisSource = 'orientation' | 'admin_dashboard' | 'in_session';

export interface ParqScreening {
  q1_heart_condition: boolean;
  q2_chest_pain: boolean;
  q3_balance_dizziness: boolean;
  q4_bone_joint_problem: boolean;
  q5_blood_pressure_meds: boolean;
  q6_medical_reason: boolean;
  q7_aware_of_other: boolean;
}

export interface PosturalAssessment {
  anteriorView: string;
  lateralView: string;
  posteriorView: string;
  commonFindings: string[];
}

export interface OHSAAnteriorView {
  feetTurnout: CompensationLevel;
  feetFlattening: CompensationLevel;
  kneeValgus: CompensationLevel;
  kneeVarus: CompensationLevel;
}

export interface OHSALateralView {
  excessiveForwardLean: CompensationLevel;
  lowBackArch: CompensationLevel;
  armsFallForward: CompensationLevel;
  forwardHead: CompensationLevel;
}

export interface OverheadSquatAssessment {
  anteriorView: OHSAAnteriorView;
  lateralView: OHSALateralView;
  asymmetricWeightShift: CompensationLevel;
  notes?: string;
}

export interface AnkleDorsiflexionTest {
  left: { pass: boolean; degrees: number };
  right: { pass: boolean; degrees: number };
}

export interface HipMobilityScreen {
  internalRotation: { left: MobilityRating; right: MobilityRating };
  externalRotation: { left: MobilityRating; right: MobilityRating };
  flexion: { left: MobilityRating; right: MobilityRating };
}

export interface SquatUniversityAssessment {
  ankleDorsiflexion: AnkleDorsiflexionTest;
  hipMobility: HipMobilityScreen;
  thoracicSpineMobility: { rotationLeft: MobilityRating; rotationRight: MobilityRating };
  deepSquat: { depthAchieved: SquatDepth; compensations: string[] };
  singleLegBalance: {
    left: { eyesOpen: number; eyesClosed: number };
    right: { eyesOpen: number; eyesClosed: number };
  };
}

export interface SingleLegSquatAssessment {
  left: { rating: MovementRating; compensations: string[] };
  right: { rating: MovementRating; compensations: string[] };
}

export interface MovementQualityAssessments {
  singleLegSquat: SingleLegSquatAssessment;
  pushAssessment: { rating: MovementRating; compensations: string[] };
  pullAssessment: { rating: MovementRating; compensations: string[] };
  gaitAnalysis: { observations: string };
}

export interface CorrectiveExercise {
  muscle?: string;
  exercise: string;
  duration?: string;
  reps?: number;
  sets: number;
  cue?: string;
}

export interface CorrectiveStrategy {
  compensationsIdentified: string[];
  inhibit: CorrectiveExercise[];
  lengthen: CorrectiveExercise[];
  activate: CorrectiveExercise[];
  integrate: CorrectiveExercise[];
}

export interface OPTPhaseRecommendation {
  phase: number;
  name: string;
  focus: string;
  duration: string;
  repRange: string;
  tempo: string;
  rest: string;
}

export interface MovementAnalysisData {
  id?: number;
  userId: number | null;
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  address: string;
  status: AnalysisStatus;
  source: AnalysisSource;
  conductedBy?: number;
  assessmentDate?: string;
  completedAt?: string;
  parqScreening: ParqScreening | null;
  medicalClearanceRequired: boolean;
  medicalClearanceDate: string;
  medicalClearanceProvider: string;
  posturalAssessment: PosturalAssessment | null;
  overheadSquatAssessment: OverheadSquatAssessment | null;
  nasmAssessmentScore: number | null;
  squatUniversityAssessment: SquatUniversityAssessment | null;
  movementQualityAssessments: MovementQualityAssessments | null;
  correctiveExerciseStrategy: CorrectiveStrategy | null;
  optPhaseRecommendation: OPTPhaseRecommendation | null;
  overallMovementQualityScore: number | null;
  trainerNotes: string;
}

export interface PendingMatch {
  id: number;
  movementAnalysisId: number;
  candidateUserId: number;
  confidenceScore: number;
  matchMethod: string;
  status: string;
  candidateUser?: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
}

export const POSTURAL_COMMON_FINDINGS = [
  'Forward head', 'Rounded shoulders', 'Kyphosis', 'Lordosis',
  'Anterior pelvic tilt', 'Posterior pelvic tilt', 'Scoliosis',
  'Knee valgus', 'Knee varus', 'Pronated feet', 'Supinated feet',
  'Elevated shoulder', 'Winged scapula',
];

export const SQUAT_COMPENSATIONS = [
  'Heels rise', 'Knees cave in', 'Excessive forward lean',
  'Low back rounds', 'Asymmetric weight shift', 'Arms fall forward',
  'Feet turn out', 'Lateral trunk shift', 'Forward head',
];

export const MOVEMENT_COMPENSATIONS = [
  'Knee valgus', 'Hip drop', 'Trunk rotation', 'Loss of balance',
  'Compensatory lean', 'Excessive pronation', 'Hip hiking',
  'Lateral shift', 'Forward head', 'Scapular winging',
];

export const PARQ_QUESTIONS: { key: keyof ParqScreening; label: string }[] = [
  { key: 'q1_heart_condition', label: 'Has your doctor ever said that you have a heart condition and that you should only do physical activity recommended by a doctor?' },
  { key: 'q2_chest_pain', label: 'Do you feel pain in your chest when you do physical activity?' },
  { key: 'q3_balance_dizziness', label: 'In the past month, have you had chest pain when you were not doing physical activity?' },
  { key: 'q4_bone_joint_problem', label: 'Do you lose your balance because of dizziness or do you ever lose consciousness?' },
  { key: 'q5_blood_pressure_meds', label: 'Do you have a bone or joint problem that could be made worse by a change in your physical activity?' },
  { key: 'q6_medical_reason', label: 'Is your doctor currently prescribing drugs for your blood pressure or heart condition?' },
  { key: 'q7_aware_of_other', label: 'Do you know of any other reason why you should not do physical activity?' },
];

export const DEFAULT_FORM_DATA: MovementAnalysisData = {
  userId: null,
  fullName: '',
  email: '',
  phone: '',
  dateOfBirth: '',
  address: '',
  status: 'draft',
  source: 'admin_dashboard',
  parqScreening: null,
  medicalClearanceRequired: false,
  medicalClearanceDate: '',
  medicalClearanceProvider: '',
  posturalAssessment: null,
  overheadSquatAssessment: null,
  nasmAssessmentScore: null,
  squatUniversityAssessment: null,
  movementQualityAssessments: null,
  correctiveExerciseStrategy: null,
  optPhaseRecommendation: null,
  overallMovementQualityScore: null,
  trainerNotes: '',
};

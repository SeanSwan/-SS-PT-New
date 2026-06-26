import type { ExerciseSlim } from '../../../WorkoutLogger/exerciseSearchWorker';

export type SwanCoachGenerationMode = 'auto' | 'guide_me' | 'deep_grill';

export interface GuidedCandidateMedia {
  videoUrl?: string | null;
  previewVideoUrl?: string | null;
  imageUrl?: string | null;
  thumbnailUrl?: string | null;
}

export interface WorkoutGuidedCandidateExercise {
  candidateId?: string;
  exerciseKey: string;
  exerciseName: string;
  muscles?: string[];
  category?: string;
  equipment?: string[];
  sets?: number;
  reps?: number | string;
  tempo?: string;
  restSeconds?: number;
  intensityPercent?: number;
  readinessNote?: string | null;
  readinessIntensityGuardrail?: string | null;
  selectionReason?: string | null;
  score?: number;
  media?: GuidedCandidateMedia | null;
  exerciseSlim: ExerciseSlim;
}

export interface WorkoutGuidedCandidateSlot {
  slotId: string;
  focus: string;
  instruction: string;
  candidates: WorkoutGuidedCandidateExercise[];
}

export interface WorkoutGuidedCandidatesResponse {
  planningSystem?: 'swan_coach_planning';
  candidateSystem?: 'swan_coach_guided_candidates';
  generationMode: SwanCoachGenerationMode;
  category: string;
  primaryGoal: string;
  nasmPhase?: number;
  equipmentProfileId?: number | null;
  availableEquipmentCategories?: string[];
  swanCoachReadiness?: {
    level?: string;
    label?: string;
    trainerNote?: string;
  } | null;
  slots: WorkoutGuidedCandidateSlot[];
}
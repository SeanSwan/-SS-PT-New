import type {
  HardcoreTrainingMethod,
  PlanExercise,
  PlanGoal,
  TrainingIntensityMode,
  WorkoutCategory,
} from './WorkoutPlannerTypes';
import type {
  SwanCoachGenerationMode,
  WorkoutGuidedCandidateExercise,
  WorkoutGuidedCandidatesResponse,
} from './WorkoutPlannerGuidedCandidateTypes';

interface CandidateRequestInput {
  selectedClientId: number;
  category: WorkoutCategory;
  goal: PlanGoal;
  phaseNumber: number;
  selectedEquipmentProfileId: number | null;
  trainingIntensityMode: TrainingIntensityMode;
  hardcoreMethod: HardcoreTrainingMethod;
  generationMode: SwanCoachGenerationMode;
}

interface GuidedCandidateResponse {
  success?: boolean;
  candidates?: WorkoutGuidedCandidatesResponse;
}

const candidateCount = (generationMode: SwanCoachGenerationMode) => (
  generationMode === 'deep_grill' ? 6 : 4
);

export const isGuidedGenerationMode = (generationMode: SwanCoachGenerationMode) => (
  generationMode === 'guide_me' || generationMode === 'deep_grill'
);

export const buildWorkoutCandidateRequest = ({
  selectedClientId,
  category,
  goal,
  phaseNumber,
  selectedEquipmentProfileId,
  trainingIntensityMode,
  hardcoreMethod,
  generationMode,
}: CandidateRequestInput) => ({
  clientId: selectedClientId,
  category,
  primaryGoal: goal,
  nasmPhase: phaseNumber,
  generationMode,
  candidateCount: candidateCount(generationMode),
  trainingIntensityMode,
  hardcoreMethod,
  ...(selectedEquipmentProfileId ? { equipmentProfileId: selectedEquipmentProfileId } : {}),
});

export const readGuidedCandidates = (data: unknown): WorkoutGuidedCandidatesResponse | null => {
  const response = data as GuidedCandidateResponse | undefined;
  return response?.success && response.candidates ? response.candidates : null;
};

const safeNumber = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const candidateNotes = (candidate: WorkoutGuidedCandidateExercise) => [
  candidate.selectionReason || null,
  candidate.readinessNote || null,
  candidate.readinessIntensityGuardrail || null,
].filter(Boolean).join(' ');

export const mapGuidedCandidateToPlanExercise = (
  candidate: WorkoutGuidedCandidateExercise,
): PlanExercise => ({
  id: `guided-${candidate.exerciseKey}-${Date.now()}`,
  exerciseSlim: {
    ...candidate.exerciseSlim,
    videoUrl: candidate.exerciseSlim.videoUrl ?? candidate.media?.videoUrl ?? null,
    previewVideoUrl: candidate.exerciseSlim.previewVideoUrl ?? candidate.media?.previewVideoUrl ?? null,
    imageUrl: candidate.exerciseSlim.imageUrl ?? candidate.media?.imageUrl ?? null,
    thumbnailUrl: candidate.exerciseSlim.thumbnailUrl ?? candidate.media?.thumbnailUrl ?? null,
  },
  sets: safeNumber(candidate.sets, 3),
  reps: String(candidate.reps ?? '10'),
  tempo: candidate.tempo || candidate.exerciseSlim.defaultTempo || '2/0/2',
  restSeconds: safeNumber(candidate.restSeconds ?? candidate.exerciseSlim.defaultRestSeconds, 60),
  intensityPercent: safeNumber(candidate.intensityPercent, 70),
  notes: candidateNotes(candidate),
});
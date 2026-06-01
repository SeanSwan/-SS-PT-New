export const AI_CONTEXTS = [
  'coach_assistant',
  'general',
  'macro_logging',
  'form_tips',
  'workout_suggestions',
  'workout_generation',
  'client_review',
  'data_management',
  'scheduling',
  'progress_analysis',
  'exercise_library',
  'gamification',
  'client_onboarding',
] as const;

export type AIContext = (typeof AI_CONTEXTS)[number];

export interface AITerminalPanelProps {
  context?: AIContext;
  clientId?: number;
  equipmentProfileId?: number | null;
  placeholder?: string;
  label?: string;
  emptyHint?: string;
  compact?: boolean;
  defaultOpen?: boolean;
  onExerciseSelected?: (exercise: unknown) => void;
  onWorkoutGenerated?: (workout: unknown) => void;
}

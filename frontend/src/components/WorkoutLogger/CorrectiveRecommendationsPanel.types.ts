export type CesProtocolStep = 'inhibit' | 'lengthen' | 'activate' | 'integrate';

export interface CorrectiveExerciseRow {
  id: string;
  name: string;
  exerciseKey: string;
  bodyPartCategory?: string;
  sourceCitation?: string;
  cesProtocolStep?: CesProtocolStep;
}

export interface CorrectiveRecommendations {
  tags: string[];
  matchedCount: number;
  inhibit: CorrectiveExerciseRow[];
  lengthen: CorrectiveExerciseRow[];
  activate: CorrectiveExerciseRow[];
  integrate: CorrectiveExerciseRow[];
}

export type CompensationInput =
  | string
  | { type: string; avgSeverity?: number; frequency?: number; trend?: string };

export interface CorrectiveRecommendationsPanelProps {
  clientId: number;
  compensations: CompensationInput[];
  includeSteps?: CesProtocolStep[];
  title?: string;
  subtitle?: string;
  className?: string;
}

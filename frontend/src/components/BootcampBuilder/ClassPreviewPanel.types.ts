import type { GeneratedBootcamp, BootcampExercise } from '../../hooks/useBootcampAPI';
import type { BuildMode } from './BootcampBuilderPage.constants';

export type BoardView = 'main' | 'jointFriendly' | 'lowImpact';

export interface BootcampBoardViews {
  mainExercises: BootcampExercise[];
  stationExercises: Record<number, BootcampExercise[]>;
  jointFriendlyExercises: BootcampExercise[];
  lowImpactExercises: BootcampExercise[];
  getJointFriendlyExercises: (stationIndex: number) => BootcampExercise[];
  getLowImpactExercises: (stationIndex: number) => BootcampExercise[];
}

export interface ClassPreviewPanelProps {
  bootcamp: GeneratedBootcamp | null;
  buildMode: BuildMode;
  loading: boolean;
  floorMode: boolean;
  saving: boolean;
  onSave: () => void;
  onSelectExercise: (ex: BootcampExercise) => void;
  onDeleteExercise?: (exerciseIndex: number) => void;
  onDuplicateExercise?: (exerciseIndex: number) => void;
  onMoveExercise?: (exerciseIndex: number, targetStationIndex: number) => void;
  onSelectStation?: (stationIndex: number) => void;
  activeStation?: number | null;
}

import { memo, type ComponentProps, type FC } from 'react';
import ExerciseRolodexPanel from './ExerciseRolodexPanel';
import type { RolodexExercise } from './ExerciseRolodexPanel';

type ExerciseRolodexPanelProps = ComponentProps<typeof ExerciseRolodexPanel>;

export interface ExerciseIntelligencePickerProps extends ExerciseRolodexPanelProps {
  selectionContext?: 'manual_builder' | 'hybrid_builder';
}

const ExerciseIntelligencePicker: FC<ExerciseIntelligencePickerProps> = ({
  selectionContext: _selectionContext,
  ...props
}) => (
  <ExerciseRolodexPanel {...props} />
);

export type { RolodexExercise };
export default memo(ExerciseIntelligencePicker);

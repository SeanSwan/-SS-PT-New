import React from 'react';
import { BookOpen, Plus } from 'lucide-react';
import type { ExerciseSlim } from './useExerciseSearch';
import { getExerciseTips, parseEquipment } from './NASMExerciseRolodex.helpers';
import {
  AddButton,
  PreviewHeader,
  PreviewLabel,
  PreviewRow,
  PreviewSide,
  PreviewTitle,
} from './NASMExerciseRolodex.styles';

interface NASMExerciseRolodexPreviewProps {
  exercise: ExerciseSlim;
  onSelect: (exercise: ExerciseSlim) => void;
}

const NASMExerciseRolodexPreview: React.FC<NASMExerciseRolodexPreviewProps> = ({
  exercise,
  onSelect,
}) => (
  <PreviewSide>
    <PreviewHeader>
      <BookOpen size={12} />
      How to Perform
    </PreviewHeader>
    <PreviewTitle>{exercise.name}</PreviewTitle>
    <PreviewRow>
      <PreviewLabel>Muscles:</PreviewLabel>
      {(exercise.primaryMuscles || []).join(', ') || 'Full Body'}
    </PreviewRow>
    <PreviewRow>
      <PreviewLabel>Type:</PreviewLabel>
      {exercise.exerciseType || 'Exercise'}
    </PreviewRow>
    <PreviewRow>
      <PreviewLabel>Equipment:</PreviewLabel>
      {parseEquipment((exercise as any).equipment || (exercise as any).equipmentNeeded).join(', ') || 'Bodyweight'}
    </PreviewRow>
    <PreviewRow>
      <PreviewLabel>Tips:</PreviewLabel>
      {getExerciseTips(exercise)}
    </PreviewRow>
    {exercise.easyVariation && <PreviewRow><PreviewLabel>Easier:</PreviewLabel>{exercise.easyVariation}</PreviewRow>}
    {exercise.hardVariation && <PreviewRow><PreviewLabel>Harder:</PreviewLabel>{exercise.hardVariation}</PreviewRow>}
    <AddButton type="button" onClick={() => onSelect(exercise)}>
      <Plus size={14} /> Add to Workout
    </AddButton>
  </PreviewSide>
);

export default NASMExerciseRolodexPreview;

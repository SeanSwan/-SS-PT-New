import React from 'react';
import { BookOpen, Plus } from 'lucide-react';
import type { ExerciseSlim } from './useExerciseSearch';
import { getExerciseTips, parseEquipment } from './NASMExerciseRolodex.helpers';
import ExerciseMediaPreview from './ExerciseMediaPreview';
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
    <ExerciseMediaPreview exercise={exercise} />
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
      {parseEquipment(exercise.equipment || exercise.equipmentNeeded).join(', ') || 'Bodyweight'}
    </PreviewRow>
    {(exercise.recommendedSets || exercise.recommendedReps || exercise.recommendedDuration) && (
      <PreviewRow>
        <PreviewLabel>Plan:</PreviewLabel>
        {exercise.recommendedSets && exercise.recommendedReps
          ? `${exercise.recommendedSets} x ${exercise.recommendedReps}`
          : `${exercise.recommendedDuration ?? 0} sec`}
      </PreviewRow>
    )}
    {(exercise.defaultTempo || exercise.defaultRestSeconds) && (
      <PreviewRow>
        <PreviewLabel>Defaults:</PreviewLabel>
        {exercise.defaultTempo ? `Tempo ${exercise.defaultTempo}` : ''}
        {exercise.defaultTempo && exercise.defaultRestSeconds ? ' | ' : ''}
        {exercise.defaultRestSeconds ? `${exercise.defaultRestSeconds}s rest` : ''}
      </PreviewRow>
    )}
    {(exercise.nasmMovementPattern || exercise.optPhases?.length) && (
      <PreviewRow>
        <PreviewLabel>NASM:</PreviewLabel>
        {exercise.nasmMovementPattern || 'movement'}
        {exercise.optPhases?.length ? ` | OPT ${exercise.optPhases.join(', ')}` : ''}
      </PreviewRow>
    )}
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

/**
 * SwanExercisePickerPreview (Phase 2.3b)
 * ======================================
 * The coaching layer of the shared picker: media + meta from the already-
 * loaded ExerciseSlim, plus coaching cues + safety tips fetched LAZILY per
 * exercise via the existing useExerciseTeachData hook (client-safe
 * GET /api/exercises/:id/teach-mode, module-cached). Cues deliberately do
 * NOT ride the bulk library payload — 840 rows stay lean; one exercise
 * fetches on demand.
 *
 * States are truthful: fetching reads as loading, an empty cue list reads
 * as "none on file" — never silent.
 */
import React from 'react';
import ExerciseMediaPreview from '../../WorkoutLogger/ExerciseMediaPreview';
import { useExerciseTeachData } from '../../../features/teach-mode/hooks/useExerciseTeachData';
import { exerciseLevel } from './filters';
import { AddButton, MetaTag, StateMessage } from './styles';
import {
  CueList,
  PreviewBody,
  PreviewMeta,
  PreviewSection,
  PreviewSectionLabel,
  PreviewTitle,
} from './styles.overlay';
import type { ExerciseSlim, SwanPickerModeConfig } from './types';

export interface SwanExercisePickerPreviewProps {
  exercise: ExerciseSlim;
  config: SwanPickerModeConfig;
  onAction: (exercise: ExerciseSlim) => void;
}

const planLine = (exercise: ExerciseSlim): string | null => {
  const sets = exercise.recommendedSets;
  const reps = exercise.recommendedReps;
  if (sets && reps) return `${sets} sets × ${reps} reps`;
  if (exercise.recommendedDuration) return `${exercise.recommendedDuration}s per set`;
  return null;
};

const SwanExercisePickerPreview: React.FC<SwanExercisePickerPreviewProps> = ({
  exercise,
  config,
  onAction,
}) => {
  const teach = useExerciseTeachData(exercise.id, true);
  const cues: string[] = Array.isArray(teach.data?.coachingCues) ? teach.data.coachingCues : [];
  const safety = typeof teach.data?.safetyTips === 'string' && teach.data.safetyTips.trim()
    ? teach.data.safetyTips
    : null;
  const plan = planLine(exercise);

  return (
    <PreviewBody>
      <PreviewTitle>{exercise.name}</PreviewTitle>
      <ExerciseMediaPreview exercise={exercise} />

      <PreviewMeta>
        <MetaTag>{exercise.exerciseType}</MetaTag>
        <MetaTag>Level {exerciseLevel(exercise.difficulty)}</MetaTag>
        {(exercise.primaryMuscles ?? []).slice(0, 4).map((muscle) => (
          <MetaTag key={muscle}>{muscle}</MetaTag>
        ))}
        {plan && <MetaTag>{plan}</MetaTag>}
      </PreviewMeta>

      <PreviewSection>
        <PreviewSectionLabel>Coaching cues</PreviewSectionLabel>
        {teach.isLoading ? (
          <StateMessage>Loading coaching cues...</StateMessage>
        ) : cues.length > 0 ? (
          <CueList>
            {cues.map((cue) => (
              <li key={cue}>{cue}</li>
            ))}
          </CueList>
        ) : (
          <StateMessage>No coaching cues on file for this exercise yet.</StateMessage>
        )}
      </PreviewSection>

      {safety && (
        <PreviewSection>
          <PreviewSectionLabel>Safety</PreviewSectionLabel>
          <StateMessage>{safety}</StateMessage>
        </PreviewSection>
      )}

      <AddButton
        type="button"
        onClick={() => onAction(exercise)}
        aria-label={`${config.actionLabel} ${exercise.name}${config.actionAriaSuffix}`}
      >
        {config.actionLabel}
      </AddButton>
    </PreviewBody>
  );
};

export default SwanExercisePickerPreview;

/**
 * ============================================================================
 * FILE: CreateWorkoutAttachmentPanel.tsx
 * PURPOSE: Rolodex-backed workout attachment builder for Social Feed posts
 * AUTHOR: Codex | LAST MODIFIED: 2026-06-25
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Lets a member attach structured exercises to a workout
 * post using the existing Swan exercise library search, with a custom-exercise
 * fallback for movements that are not in the Rolodex yet.
 *
 * HOW IT FITS IN THE APP: CreatePostForm renders this only for workout posts.
 * useWorkoutAttachmentBuilder stores the selected exercises and the final
 * `workoutData` payload that powers the feed's Try This Workout modal.
 *
 * KEY DECISIONS: This component does not create Rolodex records. Suggested or
 * custom exercises are post-local until the later admin-review queue exists.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Dumbbell, Plus, Search, X } from 'lucide-react';

import { useExerciseSearch, type ExerciseSlim } from '../../../WorkoutLogger/useExerciseSearch';
import type {
  WorkoutAttachmentExercise,
  WorkoutAttachmentExerciseField,
} from '../types/CreatePostTypes';
import {
  AddCustomButton,
  EmptySlate,
  ExerciseCard,
  ExerciseFieldsGrid,
  ExerciseHeader,
  ExerciseMeta,
  ExerciseName,
  FieldLabel,
  PanelHeader,
  PanelInput,
  PanelShell,
  RemoveExerciseButton,
  ResultButton,
  ResultMeta,
  SearchField,
  SearchIconWrap,
  SearchInput,
  SearchResults,
  SelectedList,
  SmallCopy,
} from './CreateWorkoutAttachmentPanel.styles';

interface CreateWorkoutAttachmentPanelProps {
  exercises: WorkoutAttachmentExercise[];
  onAddExercise: (exercise: ExerciseSlim) => void;
  onAddCustomExercise: (name: string) => void;
  onExerciseChange: (index: number, field: WorkoutAttachmentExerciseField, value: string) => void;
  onRemoveExercise: (index: number) => void;
}

const formatMeta = (exercise: ExerciseSlim): string => {
  const muscle = exercise.primaryMuscles?.[0];
  return [exercise.bodyPartCategory, muscle].filter(Boolean).join(' - ');
};

const fieldId = (index: number, field: string): string => `workout-attachment-${index}-${field}`;

const CreateWorkoutAttachmentPanel: React.FC<CreateWorkoutAttachmentPanelProps> = ({
  exercises,
  onAddExercise,
  onAddCustomExercise,
  onExerciseChange,
  onRemoveExercise,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const searchInputId = React.useId();
  const { results, isLoading, isSearching, setQuery } = useExerciseSearch();

  useEffect(() => {
    setQuery(searchTerm);
  }, [searchTerm, setQuery]);

  const visibleResults = useMemo(() => (
    searchTerm.trim() ? results.slice(0, 5) : []
  ), [results, searchTerm]);

  const hasExactResult = visibleResults.some(
    (exercise) => exercise.name.toLowerCase() === searchTerm.trim().toLowerCase(),
  );

  const addExercise = (exercise: ExerciseSlim) => {
    onAddExercise(exercise);
    setSearchTerm('');
  };

  const addCustomExercise = () => {
    onAddCustomExercise(searchTerm);
    setSearchTerm('');
  };

  return (
    <PanelShell role="region" aria-label="Workout attachment builder">
      <PanelHeader>
        <span><Dumbbell size={16} /> Workout details</span>
        <SmallCopy>{exercises.length}/12 attached</SmallCopy>
      </PanelHeader>

      <SearchField>
        <label htmlFor={searchInputId}>Find exercise</label>
        <SearchIconWrap aria-hidden="true"><Search size={16} /></SearchIconWrap>
        <SearchInput
          id={searchInputId}
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Search Swan exercise library"
          autoComplete="off"
        />
      </SearchField>

      {searchTerm.trim() && (
        <SearchResults aria-label="Exercise search results">
          {(isLoading || isSearching) && <SmallCopy>Loading Swan exercise library...</SmallCopy>}
          {!isLoading && !isSearching && visibleResults.map((exercise) => (
            <ResultButton
              key={exercise.id}
              type="button"
              onClick={() => addExercise(exercise)}
              aria-label={`Add ${exercise.name}`}
            >
              <span>
                <strong>{exercise.name}</strong>
                <ResultMeta>{formatMeta(exercise) || 'Swan exercise library'}</ResultMeta>
              </span>
              <Plus size={16} />
            </ResultButton>
          ))}
          {!isLoading && !isSearching && !hasExactResult && (
            <AddCustomButton type="button" onClick={addCustomExercise}>
              <Plus size={16} /> Add "{searchTerm.trim()}" as custom exercise
            </AddCustomButton>
          )}
        </SearchResults>
      )}

      <SelectedList aria-label="Attached workout exercises">
        {exercises.length === 0 ? (
          <EmptySlate>
            No exercises attached yet.
          </EmptySlate>
        ) : exercises.map((exercise, index) => (
          <ExerciseCard key={exercise.id}>
            <ExerciseHeader>
              <div>
                <ExerciseName>{exercise.name}</ExerciseName>
                {exercise.sourceExerciseId && <ExerciseMeta>Rolodex matched</ExerciseMeta>}
              </div>
              <RemoveExerciseButton
                type="button"
                onClick={() => onRemoveExercise(index)}
                aria-label={`Remove ${exercise.name}`}
              >
                <X size={16} />
              </RemoveExerciseButton>
            </ExerciseHeader>

            <ExerciseFieldsGrid>
              {(['sets', 'reps', 'weight', 'rest'] as WorkoutAttachmentExerciseField[]).map((field) => (
                <FieldLabel key={field} htmlFor={fieldId(index, field)}>
                  <span>{field === 'reps' ? 'Reps / time' : field}</span>
                  <PanelInput
                    id={fieldId(index, field)}
                    value={exercise[field] ?? ''}
                    onChange={(event) => onExerciseChange(index, field, event.target.value)}
                    aria-label={`${field} for ${exercise.name}`}
                  />
                </FieldLabel>
              ))}
              <FieldLabel $wide htmlFor={fieldId(index, 'notes')}>
                <span>Notes</span>
                <PanelInput
                  id={fieldId(index, 'notes')}
                  value={exercise.notes ?? ''}
                  onChange={(event) => onExerciseChange(index, 'notes', event.target.value)}
                  aria-label={`Notes for ${exercise.name}`}
                  placeholder="Tempo, setup, or cue"
                />
              </FieldLabel>
            </ExerciseFieldsGrid>
          </ExerciseCard>
        ))}
      </SelectedList>
    </PanelShell>
  );
};

export default React.memo(CreateWorkoutAttachmentPanel);

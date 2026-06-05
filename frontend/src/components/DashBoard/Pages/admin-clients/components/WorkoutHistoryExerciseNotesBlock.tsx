/**
 * WorkoutHistoryExerciseNotesBlock
 *
 * Renders exercise-level and set-level notes for one exercise group in the
 * canonical admin workout-history table. Edit state comes from the editor
 * hook through the session card; this component displays notes and forwards edits.
 */
import React from 'react';

import type { WorkoutLogEntry } from '../../../../../hooks/analytics/useWorkoutAnalytics';
import { buildWorkoutHistoryNotesDisplay } from './workoutHistoryNotes';
import {
  ExerciseNoteEditRow,
  NotesBlock,
  NotesEditRow,
  NotesItem,
  NotesLabel,
} from './WorkoutHistoryPanel.styles';

export interface WorkoutHistoryExerciseNotesBlockProps {
  sessionId: string;
  exerciseName: string;
  groupSets: WorkoutLogEntry[];
  activeLogs: WorkoutLogEntry[];
  isEditing: boolean;
  updateExerciseNoteForGroup: (exerciseName: string, value: string) => void;
  updateEditField: (
    logIndex: number,
    field: keyof WorkoutLogEntry,
    value: string,
  ) => void;
}

const WorkoutHistoryExerciseNotesBlock: React.FC<WorkoutHistoryExerciseNotesBlockProps> = ({
  sessionId,
  exerciseName,
  groupSets,
  activeLogs,
  isEditing,
  updateExerciseNoteForGroup,
  updateEditField,
}) => {
  const {
    exerciseNoteValue,
    perSetDisplay,
    anyNoteAtAll,
  } = buildWorkoutHistoryNotesDisplay(groupSets, activeLogs);

  return (
    <NotesBlock
      data-testid={`notes-block-${sessionId}-${exerciseName}`}
    >
      <NotesLabel>
        <span>{exerciseName} &mdash; Notes</span>
      </NotesLabel>

      {isEditing ? (
        <>
          <ExerciseNoteEditRow>
            <strong>Coach</strong>
            <input
              type="text"
              placeholder="Exercise-level observation (e.g. knees caved on last set)"
              value={exerciseNoteValue}
              data-testid={`edit-notes-exercise-${sessionId}-${exerciseName}`}
              onChange={(event) =>
                updateExerciseNoteForGroup(exerciseName, event.target.value)
              }
            />
          </ExerciseNoteEditRow>
          {perSetDisplay.map((row, index) => (
            <NotesEditRow key={`edit-note-row-${row.logIndex}`}>
              <strong>Set {index + 1}</strong>
              <input
                type="text"
                placeholder="Set-specific note"
                value={row.setNote}
                data-testid={`edit-notes-set-${row.logIndex}`}
                onChange={(event) =>
                  updateEditField(row.logIndex, 'notes', event.target.value)
                }
              />
            </NotesEditRow>
          ))}
        </>
      ) : anyNoteAtAll ? (
        <>
          {exerciseNoteValue && (
            <NotesItem data-testid={`notes-exercise-${sessionId}-${exerciseName}`}>
              <strong>Coach</strong>
              <span>{exerciseNoteValue}</span>
            </NotesItem>
          )}
          {perSetDisplay.map((row, index) =>
            row.setNote ? (
              <NotesItem key={`note-row-${row.logIndex}`}>
                <strong>Set {index + 1}</strong>
                <span>{row.setNote}</span>
              </NotesItem>
            ) : null,
          )}
        </>
      ) : (
        <NotesItem $muted data-testid={`notes-empty-${sessionId}-${exerciseName}`}>
          <span>None given</span>
        </NotesItem>
      )}
    </NotesBlock>
  );
};

export default React.memo(WorkoutHistoryExerciseNotesBlock);

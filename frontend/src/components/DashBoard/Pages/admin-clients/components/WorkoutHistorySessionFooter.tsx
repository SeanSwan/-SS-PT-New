/**
 * WorkoutHistorySessionFooter
 *
 * Renders add-set controls, totals, session notes, and edit actions for one
 * expanded workout-history session. The parent owns save/edit behavior.
 */
import React from 'react';
import { Edit3, Plus, Save, X as XIcon } from 'lucide-react';

import type { WorkoutLogEntry, WorkoutSession } from '../../../../../hooks/analytics/useWorkoutAnalytics';
import { formatWorkoutHistoryVolume } from './workoutHistoryFormatters';
import { EditActionBar, EditBtn } from './WorkoutHistoryPanel.styles';
import { AddSetRow, SessionNotes, SessionTotals, TotalLabel, TotalValue } from './WorkoutHistoryPanel.sessionStyles';

export interface WorkoutHistorySessionFooterProps {
  session: WorkoutSession;
  tableExerciseGroups: Array<[string, WorkoutLogEntry[]]>;
  isEditing: boolean;
  readOnly?: boolean;
  saving: boolean;
  editLogsLength: number;
  addEditRow(exerciseName: string): void;
  cancelEdit(): void;
  saveEdit(workoutId: string): void;
  startEdit(session: WorkoutSession): void;
}

const WorkoutHistorySessionFooter: React.FC<WorkoutHistorySessionFooterProps> = ({
  session,
  tableExerciseGroups,
  isEditing,
  readOnly = false,
  saving,
  editLogsLength,
  addEditRow,
  cancelEdit,
  saveEdit,
  startEdit,
}) => (
  <>
    {isEditing && (
      <AddSetRow>
        {tableExerciseGroups.map(([exerciseName]) => (
          <EditBtn
            type="button"
            key={`add-set-${exerciseName}`}
            $variant="addSet"
            onClick={() => addEditRow(exerciseName)}
            data-testid={`edit-add-set-${exerciseName}`}
          >
            <Plus size={12} /> Add set to {exerciseName}
          </EditBtn>
        ))}
      </AddSetRow>
    )}
    <SessionTotals>
      <TotalLabel>Vol: <TotalValue>{formatWorkoutHistoryVolume(session.totalWeight)}</TotalValue></TotalLabel>
      <TotalLabel>Sets: <TotalValue>{session.totalSets}</TotalValue></TotalLabel>
      <TotalLabel>Reps: <TotalValue>{session.totalReps}</TotalValue></TotalLabel>
    </SessionTotals>
    {session.notes && <SessionNotes>{session.notes}</SessionNotes>}
    {!readOnly && (
      <EditActionBar>
        {isEditing ? (
          <>
            <EditBtn
              type="button"
              $variant="cancel"
              onClick={cancelEdit}
              disabled={saving}
              data-testid={`edit-cancel-${session.id}`}
            >
              <XIcon size={14} /> Cancel
            </EditBtn>
            <EditBtn
              type="button"
              $variant="save"
              onClick={() => saveEdit(session.id)}
              disabled={saving || editLogsLength === 0}
              data-testid={`edit-save-${session.id}`}
            >
              <Save size={14} />
              {saving ? 'Saving\u2026' : 'Save changes'}
            </EditBtn>
          </>
        ) : (
          <EditBtn
            type="button"
            $variant="edit"
            onClick={() => startEdit(session)}
            data-testid={`edit-start-${session.id}`}
          >
            <Edit3 size={14} /> Edit workout
          </EditBtn>
        )}
      </EditActionBar>
    )}
  </>
);

export default React.memo(WorkoutHistorySessionFooter);

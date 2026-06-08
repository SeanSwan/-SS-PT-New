/**
 * WorkoutHistorySessionCard
 *
 * Renders one expandable workout-history session card. The editor hook owns
 * edit/save behavior; the panel owns share modal state and expanded sessions.
 */
import React from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, Clock, Dumbbell, Share2, Target } from 'lucide-react';

import type { WorkoutLogEntry, WorkoutSession } from '../../../../../hooks/analytics/useWorkoutAnalytics';
import { formatWorkoutHistoryDate } from './workoutHistoryFormatters';
import { groupSessionLogs } from './workoutHistoryPanelData';
import { buildWorkoutHistoryExerciseTableState } from './workoutHistoryExerciseTableState';
import WorkoutHistoryExerciseNotesBlock from './WorkoutHistoryExerciseNotesBlock';
import WorkoutHistoryExerciseTable from './WorkoutHistoryExerciseTable';
import { EditErrorBar } from './WorkoutHistoryPanel.styles';
import {
  ExerciseTableViewport,
  MetaChip,
  SessionCard,
  SessionHeader,
  SessionHeaderActions,
  SessionMeta,
  SessionTitle,
  SessionToggleButton,
  ShareIconBtn,
} from './WorkoutHistoryPanel.sessionStyles';
import WorkoutHistorySessionFooter from './WorkoutHistorySessionFooter';

export interface WorkoutHistorySessionCardProps {
  session: WorkoutSession;
  isExpanded: boolean;
  editingSessionId: string | null;
  editLogs: WorkoutLogEntry[];
  readOnly?: boolean;
  saving: boolean;
  saveError: string | null;
  onToggle(sessionId: string): void;
  onShareSession(session: WorkoutSession): void;
  updateEditField(logIndex: number, field: keyof WorkoutLogEntry, value: string): void;
  removeEditRow(logIndex: number): void;
  updateExerciseNoteForGroup(exerciseName: string, value: string): void;
  addEditRow(exerciseName: string): void;
  cancelEdit(): void;
  saveEdit(workoutId: string): void;
  startEdit(session: WorkoutSession): void;
}

const WorkoutHistorySessionCard: React.FC<WorkoutHistorySessionCardProps> = ({
  session,
  isExpanded,
  editingSessionId,
  editLogs,
  readOnly = false,
  saving,
  saveError,
  onToggle,
  onShareSession,
  updateEditField,
  removeEditRow,
  updateExerciseNoteForGroup,
  addEditRow,
  cancelEdit,
  saveEdit,
  startEdit,
}) => {
  const exerciseGroups = groupSessionLogs(session);
  const renderExpandedContent = () => {
    const isEditing = editingSessionId === session.id;
    const activeLogs: WorkoutLogEntry[] = isEditing ? editLogs : session.logs;
    const {
      hasTempo,
      hasRest,
      hasRPE,
      hasWeight,
      exerciseGroups: tableExerciseGroups,
    } = buildWorkoutHistoryExerciseTableState(activeLogs);

    return (
      <ExerciseTableViewport>
        {isEditing && saveError && (
          <EditErrorBar data-testid={`edit-error-${session.id}`}>
            <AlertTriangle size={14} />
            <span>{saveError}</span>
          </EditErrorBar>
        )}
        <WorkoutHistoryExerciseTable
          tableExerciseGroups={tableExerciseGroups}
          activeLogs={activeLogs}
          isEditing={isEditing}
          hasTempo={hasTempo}
          hasRest={hasRest}
          hasRPE={hasRPE}
          hasWeight={hasWeight}
          updateEditField={updateEditField}
          removeEditRow={removeEditRow}
        />

        {tableExerciseGroups.map(([exerciseName, groupSets]) => (
          <WorkoutHistoryExerciseNotesBlock
            key={`notes-${session.id}-${exerciseName}`}
            sessionId={session.id}
            exerciseName={exerciseName}
            groupSets={groupSets}
            activeLogs={activeLogs}
            isEditing={isEditing}
            updateExerciseNoteForGroup={updateExerciseNoteForGroup}
            updateEditField={updateEditField}
          />
        ))}

        <WorkoutHistorySessionFooter
          session={session}
          tableExerciseGroups={tableExerciseGroups}
          isEditing={isEditing}
          readOnly={readOnly}
          saving={saving}
          editLogsLength={editLogs.length}
          addEditRow={addEditRow}
          cancelEdit={cancelEdit}
          saveEdit={saveEdit}
          startEdit={startEdit}
        />
      </ExerciseTableViewport>
    );
  };

  return (
    <SessionCard>
      <SessionHeader>
        <SessionToggleButton
          type="button"
          onClick={() => onToggle(session.id)}
          aria-expanded={isExpanded}
        >
          <div>
            <SessionTitle>{session.title}</SessionTitle>
            <SessionMeta>
              <MetaChip>{formatWorkoutHistoryDate(session.date)}</MetaChip>
              {session.duration > 0 && (
                <MetaChip><Clock size={12} /> {session.duration}min</MetaChip>
              )}
              <MetaChip><Dumbbell size={12} /> {exerciseGroups.length} exercises</MetaChip>
              {session.intensity > 0 && (
                <MetaChip><Target size={12} /> {session.intensity}/10</MetaChip>
              )}
            </SessionMeta>
          </div>
          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </SessionToggleButton>
        {!readOnly && (
          <SessionHeaderActions>
            <ShareIconBtn
              type="button"
              onClick={() => onShareSession(session)}
              aria-label={`Share ${session.title} to social feed`}
            >
              <Share2 size={12} /> Share
            </ShareIconBtn>
          </SessionHeaderActions>
        )}
      </SessionHeader>

      {isExpanded && renderExpandedContent()}
    </SessionCard>
  );
};

export default React.memo(WorkoutHistorySessionCard);

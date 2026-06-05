import { useCallback, useRef, useState } from 'react';

import type {
  WorkoutLogEntry,
  WorkoutSession,
} from '../../../../../hooks/analytics/useWorkoutAnalytics';
import { buildWorkoutEditExercises } from './workoutHistoryEditPayload';
import { buildEditableWorkoutLogs } from './workoutHistoryEditSession';
import {
  appendWorkoutEditRow,
  removeWorkoutEditRow,
  updateWorkoutEditField,
  updateWorkoutExerciseNote,
} from './workoutHistoryEditRows';

interface WorkoutHistoryAuthAxios {
  patch(url: string, body: unknown): Promise<unknown>;
}

interface UseWorkoutHistoryEditorArgs {
  authAxios?: WorkoutHistoryAuthAxios | null;
  clientId: number;
  refetch(): Promise<unknown> | unknown;
  expandSession(sessionId: string): void;
}

export function useWorkoutHistoryEditor({
  authAxios,
  clientId,
  refetch,
  expandSession,
}: UseWorkoutHistoryEditorArgs) {
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editLogs, setEditLogs] = useState<WorkoutLogEntry[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const nextTemporarySetIdRef = useRef(-1);

  const startEdit = useCallback((session: WorkoutSession) => {
    const migrated = buildEditableWorkoutLogs(session);
    setEditingSessionId(session.id);
    setEditLogs(migrated);
    setSaveError(null);
    expandSession(session.id);
  }, [expandSession]);

  const cancelEdit = useCallback(() => {
    setEditingSessionId(null);
    setEditLogs([]);
    setSaveError(null);
  }, []);

  const updateEditField = useCallback(
    (logIndex: number, field: keyof WorkoutLogEntry, value: string) => {
      setEditLogs((prev) => updateWorkoutEditField(prev, logIndex, field, value));
    },
    [],
  );

  const removeEditRow = useCallback((logIndex: number) => {
    setEditLogs((prev) => removeWorkoutEditRow(prev, logIndex));
  }, []);

  const updateExerciseNoteForGroup = useCallback(
    (exerciseName: string, value: string) => {
      setEditLogs((prev) => updateWorkoutExerciseNote(prev, exerciseName, value));
    },
    [],
  );

  const addEditRow = useCallback((exerciseName: string) => {
    setEditLogs((prev) => {
      const temporaryId = nextTemporarySetIdRef.current;
      nextTemporarySetIdRef.current -= 1;
      return appendWorkoutEditRow(prev, exerciseName, temporaryId);
    });
  }, []);

  const saveEdit = useCallback(
    async (workoutId: string) => {
      if (!authAxios) {
        setSaveError('Auth context unavailable - try reloading.');
        return;
      }
      setSaving(true);
      setSaveError(null);
      try {
        const exercises = buildWorkoutEditExercises(editLogs);

        await authAxios.patch(
          `/api/admin/clients/${clientId}/workouts/${workoutId}`,
          { exercises },
        );
        await refetch();
        setEditingSessionId(null);
        setEditLogs([]);
      } catch (err: unknown) {
        const e = err as { message?: string; response?: { data?: { error?: string } } };
        setSaveError(
          e.response?.data?.error || e.message || 'Failed to save workout changes',
        );
      } finally {
        setSaving(false);
      }
    },
    [authAxios, clientId, editLogs, refetch],
  );

  return {
    editingSessionId,
    editLogs,
    saving,
    saveError,
    startEdit,
    cancelEdit,
    updateEditField,
    removeEditRow,
    updateExerciseNoteForGroup,
    addEditRow,
    saveEdit,
  };
}

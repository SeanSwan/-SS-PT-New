/**
 * ============================================================================
 * FILE: useWorkoutAttachmentBuilder.ts
 * PURPOSE: Workout-share attachment state for the Social Feed composer
 * AUTHOR: Codex | LAST MODIFIED: 2026-06-25
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Keeps workout stats, recent workout history, and
 * Rolodex-selected exercises out of the create-post shell. It builds the
 * structured `workoutData` payload consumed by the Try This Workout modal.
 *
 * HOW IT FITS IN THE APP: useCreatePostForm owns the high-level submit flow and
 * delegates workout-specific state to this hook. The hook uses the existing
 * workout-session endpoint and the existing Swan exercise library search UI.
 *
 * KEY DECISIONS: The payload is intentionally small and client-readable. It
 * preserves Rolodex `sourceExerciseId` so later chart/workout replay work can
 * reconnect to the canonical exercise library without storing private notes.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import type { ExerciseSlim } from '../../../WorkoutLogger/useExerciseSearch';
import type { WorkoutPostData, WorkoutPostExercise } from '../types/PostCardTypes';
import type {
  WorkoutAttachmentExercise,
  WorkoutAttachmentExerciseField,
  WorkoutSession,
  WorkoutSessionsResponse,
  WorkoutStats,
} from '../types/CreatePostTypes';

const EMPTY_WORKOUT_STATS: WorkoutStats = {
  duration: '',
  exerciseCount: '',
  totalWeight: '',
  caloriesBurned: '',
};

type AuthAxiosLike = {
  get: <T>(url: string, config?: Record<string, unknown>) => Promise<{ data: T }>;
};

const toCleanText = (value: unknown): string => {
  if (typeof value !== 'string' && typeof value !== 'number') return '';
  return String(value).trim().replace(/\s+/g, ' ');
};

const firstWorkoutTitle = (content: string): string => {
  const firstLine = content.trim().split(/\r?\n/)[0]?.trim() ?? '';
  if (!firstLine) return 'Shared workout';
  return firstLine.length > 120 ? `${firstLine.slice(0, 117)}...` : firstLine;
};

const exerciseFromLibrary = (exercise: ExerciseSlim): WorkoutAttachmentExercise => {
  const restSeconds = exercise.defaultRestSeconds ?? exercise.restInterval;
  const reps = exercise.recommendedReps ? String(exercise.recommendedReps) : '';
  const duration = !reps && exercise.recommendedDuration ? String(exercise.recommendedDuration) : '';

  return {
    id: `rolodex-${exercise.id}`,
    sourceExerciseId: exercise.id,
    name: exercise.name,
    sets: exercise.recommendedSets ? String(exercise.recommendedSets) : '',
    reps,
    duration,
    rest: restSeconds ? `${restSeconds} sec` : '',
    weight: '',
    notes: '',
  };
};

const exerciseFromSession = (raw: unknown, index: number): WorkoutAttachmentExercise | null => {
  if (!raw || typeof raw !== 'object') return null;
  const item = raw as Record<string, unknown>;
  const nestedExercise = item.exercise && typeof item.exercise === 'object'
    ? item.exercise as Record<string, unknown>
    : null;
  const name = toCleanText(item.name ?? item.exerciseName ?? nestedExercise?.name);
  if (!name) return null;

  return {
    id: `history-${toCleanText(item.id) || index}`,
    sourceExerciseId: toCleanText(item.exerciseId ?? nestedExercise?.id),
    name,
    sets: toCleanText(item.sets),
    reps: toCleanText(item.reps),
    weight: toCleanText(item.weight),
    duration: toCleanText(item.duration),
    rest: toCleanText(item.rest),
    notes: '',
  };
};

const stripEmptyExerciseFields = (exercise: WorkoutAttachmentExercise): WorkoutPostExercise | null => {
  const cleaned: WorkoutPostExercise = {};
  const fields: WorkoutAttachmentExerciseField[] = [
    'name',
    'sourceExerciseId',
    'sets',
    'reps',
    'weight',
    'duration',
    'rest',
    'notes',
  ];

  fields.forEach((field) => {
    const value = toCleanText(exercise[field]);
    if (value) cleaned[field] = value;
  });

  return cleaned.name ? cleaned : null;
};

export function useWorkoutAttachmentBuilder(
  authAxios: AuthAxiosLike,
  setPostContent: (value: string) => void,
) {
  const [workoutStats, setWorkoutStats] = useState<WorkoutStats>(EMPTY_WORKOUT_STATS);
  const [showWorkoutHistory, setShowWorkoutHistory] = useState(false);
  const [workoutHistory, setWorkoutHistory] = useState<WorkoutSession[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [workoutExercises, setWorkoutExercises] = useState<WorkoutAttachmentExercise[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortControllerRef.current?.abort(), []);

  const hasWorkoutDraft = Object.values(workoutStats).some((value) => value.trim()) ||
    workoutExercises.length > 0;

  const fetchWorkoutHistory = useCallback(async () => {
    if (workoutHistory.length > 0) {
      setShowWorkoutHistory(true);
      return;
    }

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsLoadingHistory(true);

    try {
      const res = await authAxios.get<WorkoutSessionsResponse>(
        '/api/v1/workouts/sessions',
        { params: { limit: 20, status: 'completed' }, signal: controller.signal },
      );
      setWorkoutHistory(res.data.data);
      setShowWorkoutHistory(true);
    } catch (err: any) {
      if (err.name === 'CanceledError' || err.name === 'AbortError') return;
      console.error('Failed to fetch workout history:', err);
      setWorkoutHistory([]);
      setShowWorkoutHistory(true);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [authAxios, workoutHistory.length]);

  const selectWorkoutFromHistory = useCallback((workout: WorkoutSession) => {
    const duration = workout.duration || workout.durationMinutes || '';
    const sessionExercises = Array.isArray(workout.exercises)
      ? workout.exercises.map(exerciseFromSession).filter(Boolean).slice(0, 12) as WorkoutAttachmentExercise[]
      : [];
    const exerciseCount = sessionExercises.length || workout.exerciseCount || workout.exercises?.length || '';
    const totalWeight = workout.totalWeight || workout.volumeLoad || '';
    const caloriesBurned = workout.caloriesBurned || workout.calories || '';

    setWorkoutStats({
      duration: String(duration),
      exerciseCount: String(exerciseCount),
      totalWeight: String(totalWeight),
      caloriesBurned: String(caloriesBurned),
    });
    setWorkoutExercises(sessionExercises);

    const date = workout.date || workout.sessionDate || workout.createdAt;
    const dateStr = date ? new Date(date).toLocaleDateString() : '';
    const workoutName = workout.name || workout.workoutName || workout.title || 'Workout';
    setPostContent(
      `Just completed: ${workoutName}${dateStr ? ` on ${dateStr}` : ''}! ` +
      `${duration ? `${duration} min` : ''} ${exerciseCount ? `| ${exerciseCount} exercises` : ''} ` +
      `${totalWeight ? `| ${totalWeight} lbs lifted` : ''}`,
    );
    setShowWorkoutHistory(false);
  }, [setPostContent]);

  const addWorkoutExercise = useCallback((exercise: ExerciseSlim) => {
    setWorkoutExercises((current) => {
      if (current.some((item) => item.sourceExerciseId === exercise.id)) return current;
      const next = [...current, exerciseFromLibrary(exercise)].slice(0, 12);
      setWorkoutStats((stats) => ({ ...stats, exerciseCount: String(next.length) }));
      return next;
    });
  }, []);

  const addCustomWorkoutExercise = useCallback((name: string) => {
    const cleanName = toCleanText(name);
    if (!cleanName) return;

    setWorkoutExercises((current) => {
      if (current.some((item) => item.name.toLowerCase() === cleanName.toLowerCase())) return current;
      const next = [...current, {
        id: `custom-${Date.now()}`,
        name: cleanName,
        sets: '',
        reps: '',
        weight: '',
        duration: '',
        rest: '',
        notes: '',
      }].slice(0, 12);
      setWorkoutStats((stats) => ({ ...stats, exerciseCount: String(next.length) }));
      return next;
    });
  }, []);

  const updateWorkoutExercise = useCallback((
    index: number,
    field: WorkoutAttachmentExerciseField,
    value: string,
  ) => {
    setWorkoutExercises((current) => current.map((exercise, itemIndex) => (
      itemIndex === index ? { ...exercise, [field]: value } : exercise
    )));
  }, []);

  const removeWorkoutExercise = useCallback((index: number) => {
    setWorkoutExercises((current) => {
      const next = current.filter((_, itemIndex) => itemIndex !== index);
      setWorkoutStats((stats) => ({ ...stats, exerciseCount: next.length ? String(next.length) : '' }));
      return next;
    });
  }, []);

  const buildWorkoutData = useCallback((postContent: string): WorkoutPostData | null => {
    const exercises = workoutExercises
      .map(stripEmptyExerciseFields)
      .filter(Boolean)
      .slice(0, 12) as WorkoutPostExercise[];
    const hasStats = Object.values(workoutStats).some((value) => value.trim());

    if (!postContent.trim() && !hasStats && exercises.length === 0) return null;

    const data: WorkoutPostData = {
      source: 'composer',
      title: firstWorkoutTitle(postContent),
    };

    if (workoutStats.duration.trim()) data.duration = workoutStats.duration.trim();
    if (workoutStats.totalWeight.trim()) data.totalWeight = workoutStats.totalWeight.trim();
    if (workoutStats.caloriesBurned.trim()) data.caloriesBurned = workoutStats.caloriesBurned.trim();
    if (exercises.length > 0) {
      data.exercises = exercises;
      data.exerciseCount = String(exercises.length);
    } else if (workoutStats.exerciseCount.trim()) {
      data.exerciseCount = workoutStats.exerciseCount.trim();
    }

    return data;
  }, [workoutExercises, workoutStats]);

  const resetWorkoutAttachment = useCallback(() => {
    setWorkoutStats(EMPTY_WORKOUT_STATS);
    setWorkoutExercises([]);
    setShowWorkoutHistory(false);
  }, []);

  return {
    workoutStats,
    setWorkoutStats,
    showWorkoutHistory,
    workoutHistory,
    isLoadingHistory,
    workoutExercises,
    hasWorkoutDraft,
    fetchWorkoutHistory,
    selectWorkoutFromHistory,
    addWorkoutExercise,
    addCustomWorkoutExercise,
    updateWorkoutExercise,
    removeWorkoutExercise,
    buildWorkoutData,
    resetWorkoutAttachment,
  };
}

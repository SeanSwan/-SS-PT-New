/**
 * HOOK: useWorkoutPlanLoading
 * Parent: WorkoutLogger (decomposition slice D3 — plan-load cluster).
 * PURPOSE: Everything that fills the logger from existing records: client
 * info load (with session-balance warnings), today's-plan auto-load (route
 * signal + embedded signal, AI-prefill suppression), generated-plan-day
 * apply, and repeat-last-session. Extracted VERBATIM from WorkoutLogger.tsx
 * — fetch paths, toasts, signal dedupe, and fallback client shape are
 * unchanged. Owns the plan/client state (nothing above the call site reads
 * it); the component consumes the returned values.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import type { ExerciseEntry } from '../../services/nasmApiService';
import { ApiService } from '../../services/api.service';
import { getErrorMessage } from './WorkoutLoggerCS';
import { isNonDeductingClientSource } from '../DashBoard/workspaces/clients-team/clientSessionSignal';
import type {
  PlanAssignmentPickerItem,
  PlannedAssignment,
  WorkoutLoggerClient,
} from './WorkoutLogger.localTypes';
import {
  planAssignmentPickerItemToContext,
  planAssignmentPickerItemToEntries,
  planAssignmentPickerItemToSubmitAssignment,
} from './WorkoutLogger.helpers';
import { loadTodaysPlanIntoLogger } from './WorkoutLogger.loadTodaysPlan';
import { repeatLastSessionIntoLogger } from './WorkoutLogger.repeatLastSession';

interface WorkoutPlanLoadingParams {
  autoLoadTodayPlan: boolean;
  autoLoadTodayPlanRef: React.MutableRefObject<string | null>;
  /** C4a: a pending/restored draft blocks today-plan auto-load (draft wins). */
  blockTodayPlanForDraft?: boolean;
  createWorkoutLoggerLocalId: (prefix: string) => string;
  effectiveClientId: number | undefined;
  hasInitialExercises: boolean;
  isClientSelfMode: boolean;
  loadTodayPlanSignal: number;
  pendingAiPlanPrefillLoadedRef: React.MutableRefObject<boolean>;
  routeAssignmentKey: string | null;
  routeAssignmentType: string | null;
  scheduledSessionId: string | null;
  searchParams: URLSearchParams;
  setExercises: React.Dispatch<React.SetStateAction<ExerciseEntry[]>>;
}

export function useWorkoutPlanLoading({
  autoLoadTodayPlan,
  autoLoadTodayPlanRef,
  blockTodayPlanForDraft = false,
  createWorkoutLoggerLocalId,
  effectiveClientId,
  hasInitialExercises,
  isClientSelfMode,
  loadTodayPlanSignal,
  pendingAiPlanPrefillLoadedRef,
  routeAssignmentKey,
  routeAssignmentType,
  scheduledSessionId,
  searchParams,
  setExercises,
}: WorkoutPlanLoadingParams) {
  const [client, setClient] = useState<WorkoutLoggerClient | null>(null);
  const [isLoadingPlan, setIsLoadingPlan] = useState(false);
  const [isRepeatingSession, setIsRepeatingSession] = useState(false);
  const [plannedAssignment, setPlannedAssignment] = useState<PlannedAssignment | null>(null);
  const [loadedPlanContext, setLoadedPlanContext] = useState<PlannedAssignment | null>(null);
  // Value intentionally unread today (no loading UI yet) — kept so a future
  // client-loading state can surface without re-plumbing the fetch.
  const [, setIsLoadingClient] = useState(true);

  const executeLoadClientData = useCallback(async () => {
    setIsLoadingClient(true);
    try {
      if (typeof effectiveClientId !== 'number') {
        setClient(null);
        return;
      }

      const api = new ApiService();
      const infoUrl = isClientSelfMode
        ? '/api/workout-forms/my/info'
        : `/api/workout-forms/client/${effectiveClientId}/info`;
      const axiosResponse = await api.get(infoUrl);
      const data = axiosResponse?.data ?? axiosResponse;

      if (data.success && data.client) {
        setClient({
          id: data.client.id,
          firstName: data.client.firstName,
          lastName: data.client.lastName,
          email: data.client.email,
          availableSessions: data.client.availableSessions,
          clientSource: data.client.clientSource,
          phone: data.client.phone
        });
        if (data.client.hasWorkoutToday) {
          toast.warning(`${data.client.firstName} already has a workout logged for today`);
        }
        if (!isNonDeductingClientSource(data.client.clientSource) && data.client.availableSessions <= 1) {
          toast.warning(`${data.client.firstName} has only ${data.client.availableSessions} session(s) remaining`);
        }
      } else {
        throw new Error(data.message || 'Failed to load client data');
      }
    } catch (error: unknown) {
      console.error('Failed to load client data:', error);
      setClient({
        id: effectiveClientId ?? 0,
        firstName: 'Client',
        lastName: typeof effectiveClientId === 'number' ? `#${effectiveClientId}` : '',
        email: '',
        availableSessions: 0,
        clientSource: null,
        phone: ''
      });
      toast.error(getErrorMessage(error, 'Failed to load client information'));
    } finally {
      setIsLoadingClient(false);
    }
  }, [effectiveClientId, isClientSelfMode]);

  useEffect(() => {
    executeLoadClientData();
  }, [executeLoadClientData]);

  const loadTodaysPlan = useCallback(async () => {
    setLoadedPlanContext(null);
    await loadTodaysPlanIntoLogger({
      effectiveClientId,
      createWorkoutLoggerLocalId,
      routeAssignmentKey,
      routeAssignmentType,
      scheduledSessionId,
      setExercises,
      setIsLoadingPlan,
      setLoadedPlanContext,
      setPlannedAssignment,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveClientId, createWorkoutLoggerLocalId, routeAssignmentKey, routeAssignmentType, scheduledSessionId]);

  useEffect(() => {
    const todayPlanLoadSignal = loadTodayPlanSignal > 0
      ? `embedded:${loadTodayPlanSignal}`
      : autoLoadTodayPlan
        ? `route:${searchParams.toString()}`
        : null;

    // Draft-wins gate (C4a): return BEFORE the signal is consumed, so an
    // explicit discard re-runs this effect and the plan still loads; a
    // restore keeps blocking for the whole mount.
    if (blockTodayPlanForDraft) return;
    if (!todayPlanLoadSignal || autoLoadTodayPlanRef.current === todayPlanLoadSignal || hasInitialExercises) return;
    if (pendingAiPlanPrefillLoadedRef.current && autoLoadTodayPlan && loadTodayPlanSignal <= 0) {
      autoLoadTodayPlanRef.current = todayPlanLoadSignal;
      pendingAiPlanPrefillLoadedRef.current = false;
      return;
    }
    if (typeof effectiveClientId !== 'number') return;

    autoLoadTodayPlanRef.current = todayPlanLoadSignal;
    void loadTodaysPlan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoLoadTodayPlan, blockTodayPlanForDraft, effectiveClientId, hasInitialExercises, loadTodayPlanSignal, loadTodaysPlan, searchParams]);

  const handleApplyGeneratedPlanDay = useCallback((assignment: PlanAssignmentPickerItem) => {
    const prefilled = planAssignmentPickerItemToEntries(assignment, createWorkoutLoggerLocalId);
    if (prefilled.length === 0) {
      toast.info('That generated plan day has no exercises to load.');
      return;
    }

    setExercises((prev) => [...prev, ...prefilled]);
    const submitAssignment = planAssignmentPickerItemToSubmitAssignment(assignment);
    setPlannedAssignment(submitAssignment);
    setLoadedPlanContext(planAssignmentPickerItemToContext(assignment));
    const label = assignment.title || assignment.dayLabel || 'generated plan day';
    toast.success(`Loaded ${prefilled.length} exercise${prefilled.length === 1 ? '' : 's'} from ${label}${submitAssignment ? '' : ' as a draft'}.`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createWorkoutLoggerLocalId]);

  const handleRepeatLastSession = useCallback(
    () => repeatLastSessionIntoLogger({
      effectiveClientId,
      isClientSelfMode,
      createWorkoutLoggerLocalId,
      setExercises,
      setIsRepeatingSession,
    }),
    [effectiveClientId, isClientSelfMode, createWorkoutLoggerLocalId, setExercises],
  );

  return {
    client,
    handleApplyGeneratedPlanDay,
    handleRepeatLastSession,
    isLoadingPlan,
    isRepeatingSession,
    loadTodaysPlan,
    loadedPlanContext,
    plannedAssignment,
  };
}

/**
 * Hook: useWorkoutPlannerClientState
 * Purpose: Own role-aware client loading, active client selection, and
 * self-generation gates for the admin/trainer Workout Planner.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { User } from '../../../../context/AuthContext';
import {
  normalizeWorkoutPlannerClients,
  parseWorkoutPlannerClientId,
  pickWorkoutPlannerClientId,
} from './WorkoutPlannerClientIdentity';
import type { GeneratedPlan, PlanExercise, PlannerClient } from './WorkoutPlannerTypes';

interface PlannerAuthClient {
  get: (url: string) => Promise<{ data?: any }>;
}

interface TrainerAssignmentResponse {
  client?: PlannerClient;
  Client?: PlannerClient;
}

interface WorkoutPlannerClientStateInput {
  authAxios: PlannerAuthClient;
  user: User | null;
  requestedClientId: number | null;
  setPlanExercises: Dispatch<SetStateAction<PlanExercise[]>>;
  setGeneratedPlan: Dispatch<SetStateAction<GeneratedPlan | null>>;
  clearExplanations: () => void;
  resetLoadedPlanState: () => void;
}

export const useWorkoutPlannerClientState = ({
  authAxios,
  user,
  requestedClientId,
  setPlanExercises,
  setGeneratedPlan,
  clearExplanations,
  resetLoadedPlanState,
}: WorkoutPlannerClientStateInput) => {
  const [clients, setClients] = useState<PlannerClient[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [clientsLoading, setClientsLoading] = useState(true);

  const selectedClient = useMemo(
    () => clients.find(client => client.id === selectedClientId) || null,
    [clients, selectedClientId],
  );

  const clientSelfGenStatus: 'enabled' | 'disabled' | 'unknown' =
    selectedClient
      ? (selectedClient.canGenerateWorkoutPlans ? 'enabled' : 'disabled')
      : 'unknown';
  const isViewerClient = user?.role === 'client';
  const viewerClientId = parseWorkoutPlannerClientId(user?.id);
  const clientGenBlocked = isViewerClient
    && viewerClientId === selectedClientId
    && !selectedClient?.canGenerateWorkoutPlans;

  useEffect(() => {
    const fetchClients = async () => {
      try {
        if (user?.role === 'trainer' && user.id) {
          const res = await authAxios.get(`/api/client-trainer-assignments/trainer/${user.id}`);
          const assignments = res.data?.assignments || res.data?.data?.assignments || [];
          const assignmentClients = (Array.isArray(assignments) ? assignments : [])
            .map((assignment: TrainerAssignmentResponse) => assignment.client || assignment.Client);
          const clients = normalizeWorkoutPlannerClients(assignmentClients);
          setClients(clients);
          setSelectedClientId(pickWorkoutPlannerClientId(clients, requestedClientId));
        } else {
          const res = await authAxios.get('/api/auth/clients');
          if (res.data?.success && Array.isArray(res.data.clients)) {
            const clients = normalizeWorkoutPlannerClients(res.data.clients);
            setClients(clients);
            setSelectedClientId(pickWorkoutPlannerClientId(clients, requestedClientId));
          }
        }
      } catch {
        setClients([]);
      } finally {
        setClientsLoading(false);
      }
    };
    fetchClients();
  }, [authAxios, requestedClientId, user?.role, user?.id]);

  const handleClientSelectionChange = useCallback((rawClientId: string) => {
    const nextClientId = parseWorkoutPlannerClientId(rawClientId);
    if (!nextClientId) return;
    setSelectedClientId(nextClientId);
    setPlanExercises([]);
    setGeneratedPlan(null);
    clearExplanations();
    resetLoadedPlanState();
  }, [clearExplanations, resetLoadedPlanState, setGeneratedPlan, setPlanExercises]);

  return {
    clients,
    selectedClientId,
    clientsLoading,
    selectedClient,
    clientSelfGenStatus,
    isViewerClient,
    clientGenBlocked,
    handleClientSelectionChange,
  };
};

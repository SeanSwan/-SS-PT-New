/**
 * useTrainerClients.ts
 * --------------------
 * Data boundary for the canonical trainer /clients surface.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAuth } from '../../../context/AuthContext';
import { useGlobalClient } from '../../../context/GlobalClientContext';
import { useToast } from '../../../hooks/use-toast';
import { isNonDeductingClientSource } from '../../DashBoard/workspaces/clients-team/clientSessionSignal';
import { logger } from '@/utils/logger';
import { parseTrainerClientManagementId } from './MyClientsView.logic';
import type { Client, ClientAssignment, StatusFilter } from './MyClientsView.types';

type AdminClient = {
  id: string | number;
  firstName: string;
  lastName: string;
  email: string;
  photo?: string;
  availableSessions?: number;
  clientSource?: Client['clientSource'];
  totalWorkouts?: number;
  lastWorkoutDate?: string;
  nextSessionDate?: string;
  membershipLevel?: Client['membershipLevel'];
  createdAt?: string;
  joinDate?: string;
};

const toSessionCount = (value: unknown): number => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
};

const isClientAssignment = (assignment: ClientAssignment | null): assignment is ClientAssignment =>
  assignment !== null;

const adaptAdminClient = (client: AdminClient): ClientAssignment | null => {
  const parsedClientId = parseTrainerClientManagementId(client.id);
  if (parsedClientId === null) return null;

  return {
    id: `admin-viewas-${parsedClientId}`,
    assignedAt: new Date().toISOString(),
    isActive: true,
    notes: undefined,
    client: {
      id: String(parsedClientId),
      firstName: client.firstName,
      lastName: client.lastName,
      email: client.email,
      phone: undefined,
      photo: client.photo,
      availableSessions: toSessionCount(client.availableSessions),
      clientSource: client.clientSource ?? 'swanstudios',
      totalSessionsCompleted: client.totalWorkouts ?? 0,
      lastSessionDate: client.lastWorkoutDate,
      nextSessionDate: client.nextSessionDate,
      status: 'active',
      goals: { current: 0, completed: 0 },
      progress: {
        overallProgress: 0,
        recentTrend: 'stable',
        lastAssessment: undefined,
      },
      membershipLevel: client.membershipLevel ?? 'basic',
      joinDate: client.createdAt || client.joinDate || null,
      notes: undefined,
    },
  };
};

const adaptTrainerAssignment = async (
  assignment: any,
  authAxios: any,
): Promise<ClientAssignment | null> => {
  const parsedClientId = parseTrainerClientManagementId(assignment?.client?.id);
  if (parsedClientId === null || !assignment?.client) {
    logger.warn('Skipping trainer assignment with invalid client id:', {
      assignmentId: assignment?.id,
    });
    return null;
  }

  const clientId = String(parsedClientId);
  const assignmentStatus: string = assignment.status || 'active';

  try {
    const [sessions, upcomingSessions] = await Promise.all([
      authAxios.get(`/api/sessions/history/${clientId}?limit=5`),
      authAxios.get(`/api/sessions/upcoming/${clientId}?limit=3`),
    ]);

    const sessionRows = Array.isArray(sessions.data) ? sessions.data : [];
    const upcomingRows = Array.isArray(upcomingSessions.data) ? upcomingSessions.data : [];
    const client: Client = {
      ...assignment.client,
      id: clientId,
      availableSessions: toSessionCount(assignment.client.availableSessions),
      status: assignmentStatus as Client['status'],
      joinDate: assignment.client.joinDate || assignment.client.createdAt || null,
      totalSessionsCompleted: sessionRows.filter((session: any) => session.status === 'completed').length,
      lastSessionDate: sessionRows[0]?.sessionDate,
      nextSessionDate: upcomingRows[0]?.sessionDate,
      goals: { current: 0, completed: 0 },
      progress: {
        overallProgress: 0,
        recentTrend: 'stable',
        lastAssessment: sessionRows[0]?.sessionDate,
      },
      membershipLevel: assignment.client.membershipLevel || 'basic',
    };

    return {
      ...assignment,
      isActive: assignmentStatus === 'active',
      client,
    };
  } catch (err) {
    logger.warn('Error fetching client session data:', err);
    return {
      ...assignment,
      isActive: assignmentStatus === 'active',
      client: {
        ...assignment.client,
        id: clientId,
        availableSessions: toSessionCount(assignment.client.availableSessions),
        status: assignmentStatus as Client['status'],
        joinDate: assignment.client.joinDate || assignment.client.createdAt || null,
        totalSessionsCompleted: 0,
        goals: { current: 0, completed: 0 },
        progress: {
          overallProgress: 0,
          recentTrend: 'stable',
          lastAssessment: undefined,
        },
        membershipLevel: assignment.client.membershipLevel || 'basic',
      },
    };
  }
};

export const useTrainerClients = () => {
  const { user, authAxios } = useAuth();
  const { clientList, loadingClients: loadingGlobalClients } = useGlobalClient();
  const { toast } = useToast();
  const isAdminViewAs = user?.role === 'admin';
  const [clients, setClients] = useState<ClientAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [refreshing, setRefreshing] = useState(false);

  const filteredClients = useMemo(() => clients.filter((assignment) => {
    const client = assignment.client;
    const normalizedSearch = searchTerm.toLowerCase();
    const matchesSearch =
      client.firstName.toLowerCase().includes(normalizedSearch) ||
      client.lastName.toLowerCase().includes(normalizedSearch) ||
      client.email.toLowerCase().includes(normalizedSearch);
    const matchesStatus = statusFilter === 'all' || client.status === statusFilter;

    return matchesSearch && matchesStatus && assignment.isActive;
  }), [clients, searchTerm, statusFilter]);

  const stats = useMemo(() => {
    const activeClients = clients.filter((assignment) =>
      assignment.client.status === 'active' && assignment.isActive
    );
    const paidSessionInventory = activeClients.reduce((sum, assignment) => {
      if (isNonDeductingClientSource(assignment.client.clientSource)) {
        return sum;
      }

      return sum + toSessionCount(assignment.client.availableSessions);
    }, 0);
    const completedSessions = activeClients.reduce(
      (sum, assignment) => sum + assignment.client.totalSessionsCompleted,
      0
    );
    const loggedClients = activeClients.filter((assignment) =>
      assignment.client.totalSessionsCompleted > 0 || Boolean(assignment.client.lastSessionDate)
    ).length;

    return {
      totalClients: activeClients.length,
      paidSessionInventory,
      completedSessions,
      loggedClients,
    };
  }, [clients]);

  const loadClients = useCallback(async () => {
    if (!user) return;

    if (isAdminViewAs) {
      if (loadingGlobalClients) return;

      setLoading(true);
      setError(null);
      setClients((clientList as AdminClient[]).map(adaptAdminClient).filter(isClientAssignment));
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await authAxios.get(`/api/client-trainer-assignments/trainer/${user.id}`);
      const assignmentsData = response.data?.assignments || response.data || [];
      const enhancedAssignments = await Promise.all(
        (Array.isArray(assignmentsData) ? assignmentsData : []).map((assignment: any) =>
          adaptTrainerAssignment(assignment, authAxios)
        )
      );

      setClients(enhancedAssignments.filter(isClientAssignment));
    } catch (err: any) {
      console.error('Error loading clients:', err);
      setError(err.response?.data?.message || 'Failed to load clients');
      toast({
        title: 'Error',
        description: 'Failed to load client assignments',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, authAxios, toast, isAdminViewAs, clientList, loadingGlobalClients]);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadClients();
  }, [loadClients]);

  return {
    error,
    filteredClients,
    handleRefresh,
    loadClients,
    loading,
    refreshing,
    searchTerm,
    setSearchTerm,
    setStatusFilter,
    stats,
    statusFilter,
  };
};

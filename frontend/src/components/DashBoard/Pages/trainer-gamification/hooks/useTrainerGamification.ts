/**
 * Trainer gamification data hook.
 *
 * Live contract:
 * - clients come from /api/sessions/users/clients
 * - achievements come from /api/v1/gamification/achievements
 * - trainer/admin point awards write through /api/v1/gamification/users/:id/points
 */
import { useCallback, useMemo, useState } from 'react';
import { useAuth } from '../../../../../context/AuthContext';
import { useToast } from '../../../../../hooks/use-toast';
import {
  POINT_REASONS,
  asArray,
  getTrainerPointBalanceFallback,
  mapAchievement,
  mapClient,
  valueAsString,
  type Achievement,
  type Client,
  type PointReason,
} from '../trainerGamificationData';
export const useTrainerGamification = () => {
  const { authAxios } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState<boolean>(true);
  const [clients, setClients] = useState<Client[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const pointReasons = useMemo(() => POINT_REASONS, []);

  const filteredClients = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return clients;

    return clients.filter(client =>
      client.firstName.toLowerCase().includes(query) ||
      client.lastName.toLowerCase().includes(query) ||
      client.username.toLowerCase().includes(query)
    );
  }, [clients, searchQuery]);

  const fetchClientProfile = useCallback(async (clientId: string) => {
    const response = await authAxios.get(`/api/v1/gamification/users/${clientId}/profile`);
    return response.data;
  }, [authAxios]);

  const refreshClient = useCallback(async (clientId: string, fallback?: Partial<Client>) => {
    const current = clients.find(client => client.id === clientId);
    const mergedFallback = { ...current, ...fallback, id: clientId };

    try {
      const profile = await fetchClientProfile(clientId);
      const updated = mapClient(mergedFallback, profile);
      setClients(prev => prev.map(client => client.id === clientId ? updated : client));
      return updated;
    } catch {
      if (fallback) {
        const updated = mapClient(mergedFallback, mergedFallback);
        setClients(prev => prev.map(client => client.id === clientId ? updated : client));
        return updated;
      }
      return null;
    }
  }, [clients, fetchClientProfile]);

  const fetchClients = useCallback(async () => {
    try {
      const response = await authAxios.get('/api/sessions/users/clients');
      const rows = asArray(response.data);

      const mapped = await Promise.all(rows.map(async (client) => {
        const rawClient = client as Record<string, unknown>;
        const clientId = valueAsString(rawClient.id, rawClient.userId);
        if (!clientId) return mapClient(rawClient);

        try {
          const profile = await fetchClientProfile(clientId);
          return mapClient(rawClient, profile);
        } catch {
          return mapClient(rawClient);
        }
      }));

      setClients(mapped.filter(client => client.id));
    } catch (error) {
      console.error('Error fetching trainer gamification clients:', error);
      toast({ title: 'Error', description: 'Failed to fetch clients.', variant: 'destructive' });
      throw error;
    }
  }, [authAxios, fetchClientProfile, toast]);

  const fetchAchievements = useCallback(async () => {
    try {
      const response = await authAxios.get('/api/v1/gamification/achievements');
      setAchievements(asArray(response.data).map(mapAchievement).filter(achievement => achievement.id));
    } catch (error) {
      console.error('Error fetching trainer gamification achievements:', error);
      toast({ title: 'Error', description: 'Failed to fetch achievements.', variant: 'destructive' });
      throw error;
    }
  }, [authAxios, toast]);

  const awardPoints = useCallback(async (
    clientId: string,
    points: number,
    reason: string,
    description: string
  ) => {
    try {
      const response = await authAxios.post(`/api/v1/gamification/users/${clientId}/points`, {
        points,
        transactionType: 'earn',
        source: 'trainer_award',
        description,
        metadata: { reason },
        idempotencyKey: `trainer-award:${clientId}:${reason}:${Date.now()}`
      });

      await refreshClient(clientId, getTrainerPointBalanceFallback(response.data?.newBalance));
      const client = clients.find(c => c.id === clientId);

      toast({
        title: 'Success',
        description: `Awarded ${points} points to ${client ? `${client.firstName} ${client.lastName}` : 'client'}.`,
        variant: 'default'
      });
    } catch (error) {
      console.error('Error awarding trainer gamification points:', error);
      toast({ title: 'Error', description: 'Failed to award points.', variant: 'destructive' });
      throw error;
    }
  }, [authAxios, clients, refreshClient, toast]);

  const awardAchievement = useCallback(async (clientId: string, achievementId: string) => {
    try {
      await authAxios.post(`/api/v1/gamification/users/${clientId}/achievements/${achievementId}`);
      await refreshClient(clientId);

      const achievement = achievements.find(a => a.id === achievementId);
      const client = clients.find(c => c.id === clientId);

      toast({
        title: 'Success',
        description: `Awarded ${achievement?.name || 'achievement'} to ${client ? `${client.firstName} ${client.lastName}` : 'client'}.`,
        variant: 'default'
      });
    } catch (error) {
      console.error('Error awarding trainer gamification achievement:', error);
      toast({ title: 'Error', description: 'Failed to award achievement.', variant: 'destructive' });
      throw error;
    }
  }, [achievements, authAxios, clients, refreshClient, toast]);

  const loadInitialData = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([fetchClients(), fetchAchievements()]);
    } catch (error) {
      console.error('Error loading trainer gamification data:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchAchievements, fetchClients]);

  return {
    loading,
    clients,
    achievements,
    searchQuery,
    setSearchQuery,
    filteredClients,
    pointReasons,
    fetchClients,
    fetchAchievements,
    awardPoints,
    awardAchievement,
    loadInitialData
  };
};

export type { Client, Achievement, PointReason };

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

type TrainerTier = 'bronze' | 'silver' | 'gold' | 'platinum';

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  photo?: string;
  points: number;
  level: number;
  tier: TrainerTier;
  streakDays: number;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  pointValue: number;
  requirementType: string;
  requirementValue: number;
  tier: TrainerTier;
  isActive: boolean;
}

interface PointReason {
  id: string;
  name: string;
  description: string;
  pointValue: number;
  icon: string;
}

const POINT_REASONS: PointReason[] = [
  { id: 'workout_completion', name: 'Workout Completion', description: 'Completed a workout session', pointValue: 50, icon: 'CheckCircle' },
  { id: 'exercise_completion', name: 'Exercise Completion', description: 'Completed an exercise', pointValue: 10, icon: 'Dumbbell' },
  { id: 'streak_bonus', name: 'Streak Bonus', description: 'Maintained a workout streak', pointValue: 20, icon: 'Zap' },
  { id: 'assessment_completion', name: 'Assessment Completion', description: 'Completed a fitness assessment', pointValue: 100, icon: 'Target' },
  { id: 'referral_bonus', name: 'Referral Bonus', description: 'Referred a new client', pointValue: 200, icon: 'Users' },
  { id: 'special_achievement', name: 'Special Achievement', description: 'Earned a special achievement', pointValue: 150, icon: 'Award' },
  { id: 'custom', name: 'Custom Reason', description: 'Custom reason for points', pointValue: 0, icon: 'Edit' }
];

const asArray = (payload: any): any[] => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.clients)) return payload.clients;
  if (Array.isArray(payload?.achievements)) return payload.achievements;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.clients)) return payload.data.clients;
  if (Array.isArray(payload?.data?.achievements)) return payload.data.achievements;
  return [];
};

const unwrapProfile = (payload: any): any => (
  payload?.profile ?? payload?.data?.profile ?? payload?.data ?? payload ?? {}
);

const valueAsNumber = (...values: any[]): number => {
  for (const value of values) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
};

const valueAsString = (...values: any[]): string => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number') return String(value);
  }
  return '';
};

const normalizeTier = (tier: any): TrainerTier => {
  const key = String(tier || '').toLowerCase();
  if (key.includes('platinum') || key.includes('obsidian') || key.includes('crystalline')) return 'platinum';
  if (key.includes('gold') || key.includes('titanium')) return 'gold';
  if (key.includes('silver')) return 'silver';
  return 'bronze';
};

const usernameFromClient = (raw: any, profile: any, id: string): string => {
  const explicit = valueAsString(profile.username, raw.username);
  if (explicit) return explicit;

  const email = valueAsString(raw.email, profile.email);
  if (email.includes('@')) return email.split('@')[0];

  return `client-${id}`;
};

const mapClient = (raw: any, profilePayload?: any): Client => {
  const profile = unwrapProfile(profilePayload);
  const id = valueAsString(profile.id, profile.userId, raw.id, raw.userId);
  const firstName = valueAsString(profile.firstName, raw.firstName, 'Client');
  const lastName = valueAsString(profile.lastName, raw.lastName, id);

  return {
    id,
    firstName,
    lastName,
    username: usernameFromClient(raw, profile, id),
    photo: valueAsString(profile.photo, raw.photo) || undefined,
    points: valueAsNumber(profile.points, raw.points),
    level: Math.max(1, valueAsNumber(profile.level, raw.level, 1)),
    tier: normalizeTier(profile.tier ?? raw.tier),
    streakDays: valueAsNumber(profile.streakDays, raw.streakDays)
  };
};

const mapAchievement = (raw: any): Achievement => ({
  id: valueAsString(raw.id, raw.achievementId),
  name: valueAsString(raw.name, raw.title, 'Achievement'),
  description: valueAsString(raw.description, raw.summary),
  icon: valueAsString(raw.icon, raw.iconEmoji, 'Award'),
  pointValue: valueAsNumber(raw.pointValue, raw.xpReward, raw.pointsAwarded),
  requirementType: valueAsString(raw.requirementType, raw.category, 'custom'),
  requirementValue: valueAsNumber(raw.requirementValue, raw.requiredPoints, raw.maxProgress, 1),
  tier: normalizeTier(raw.tier, raw.rarity),
  isActive: raw.isActive !== false
});

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
        const clientId = valueAsString(client.id, client.userId);
        if (!clientId) return mapClient(client);

        try {
          const profile = await fetchClientProfile(clientId);
          return mapClient(client, profile);
        } catch {
          return mapClient(client);
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

      await refreshClient(clientId, { points: valueAsNumber(response.data?.newBalance) });
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

/**
 * Data controller for the canonical admin gamification shell.
 */

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import { useToast } from '../../../../hooks/use-toast';
import {
  buildAnalyticsData,
  mapAchievement,
  mapLeaderboardEntry,
  mapReward,
  mapTierThresholds,
  readApiArray,
} from './admin-gamification.mappers';
import type {
  Achievement,
  GamificationAnalyticsData,
  GamificationSettingsDraft,
  LeaderboardEntry,
  LevelSettings,
  PointValue,
  Reward,
  SystemSettings,
  TierThreshold,
} from './admin-gamification.types';

const DEFAULT_LEVEL_SETTINGS: LevelSettings = {
  pointsPerLevel: 500,
  levelCap: 100,
  enableLevelCap: false,
};

const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  enableGamification: true,
  enableAchievements: true,
  enableRewards: true,
  enableLeaderboard: true,
  enableLevels: true,
  enableTiers: true,
  enableStreaks: true,
  notifyOnAchievement: true,
  notifyOnLevelUp: true,
  notifyOnReward: true,
  streakExpirationDays: 3,
  pointsExpiration: { enabled: false, expirationDays: 365 },
};

type ToastVariant = 'default' | 'destructive';

export const useAdminGamificationController = () => {
  const { authAxios } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [pointValues, setPointValues] = useState<PointValue[]>([]);
  const [tierThresholds, setTierThresholds] = useState<TierThreshold[]>([]);
  const [levelSettings, setLevelSettings] = useState<LevelSettings>(DEFAULT_LEVEL_SETTINGS);
  const [systemSettings, setSystemSettings] = useState<SystemSettings>(DEFAULT_SYSTEM_SETTINGS);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [analyticsData, setAnalyticsData] = useState<GamificationAnalyticsData>(null);

  const notify = useCallback((title: string, description: string, variant: ToastVariant = 'default') => {
    toast({ title, description, variant });
  }, [toast]);

  const fetchAchievements = useCallback(async () => {
    const response = await authAxios.get('/api/v1/gamification/achievements');
    setAchievements(readApiArray(response.data, 'achievements').map(mapAchievement));
  }, [authAxios]);

  const fetchRewards = useCallback(async () => {
    const response = await authAxios.get('/api/v1/gamification/rewards');
    setRewards(readApiArray(response.data, 'rewards').map(mapReward));
  }, [authAxios]);

  const fetchSettings = useCallback(async () => {
    try {
      const response = await authAxios.get('/api/v1/gamification/settings');
      const data = response.data?.settings || response.data || {};
      if (data.pointValues) setPointValues(data.pointValues);
      if (data.tierThresholds) setTierThresholds(mapTierThresholds(data.tierThresholds));
      if (data.levelSettings) setLevelSettings(data.levelSettings);
      if (data.systemSettings) setSystemSettings(data.systemSettings);
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  }, [authAxios]);

  const fetchLeaderboard = useCallback(async () => {
    const response = await authAxios.get('/api/v1/gamification/leaderboard?limit=10');
    setLeaderboard(readApiArray(response.data, 'leaderboard').map(mapLeaderboardEntry));
  }, [authAxios]);

  const fetchAnalyticsData = useCallback(async () => {
    try {
      const [leaderboardRes, achievementsRes, rewardsRes] = await Promise.all([
        authAxios.get('/api/v1/gamification/leaderboard?limit=100').catch(() => ({ data: { leaderboard: [] } })),
        authAxios.get('/api/v1/gamification/achievements').catch(() => ({ data: { achievements: [] } })),
        authAxios.get('/api/v1/gamification/rewards').catch(() => ({ data: { rewards: [] } })),
      ]);
      setAnalyticsData(buildAnalyticsData(leaderboardRes.data, achievementsRes.data, rewardsRes.data));
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      notify('Error', 'Failed to fetch analytics data', 'destructive');
    }
  }, [authAxios, notify]);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchAchievements(), fetchRewards(), fetchSettings(), fetchLeaderboard()])
      .catch(error => {
        console.error('Error loading gamification data:', error);
        notify('Error', 'Failed to load gamification data. Please try again.', 'destructive');
      })
      .finally(() => setLoading(false));
  }, [fetchAchievements, fetchRewards, fetchSettings, fetchLeaderboard, notify]);

  const handleTabChange = useCallback((newValue: number) => {
    setTabValue(newValue);
    if (newValue === 3 && !analyticsData) fetchAnalyticsData();
  }, [analyticsData, fetchAnalyticsData]);

  const handleCreateAchievement = useCallback(async (achievement: Omit<Achievement, 'id'>) => {
    try {
      await authAxios.post('/api/v1/gamification/achievements', achievement);
      await fetchAchievements();
      notify('Success', 'Achievement created successfully');
    } catch (error) {
      console.error('Error creating achievement:', error);
      notify('Error', 'Failed to create achievement', 'destructive');
    }
  }, [authAxios, fetchAchievements, notify]);

  const handleUpdateAchievement = useCallback(async (id: string, updatedFields: Partial<Achievement>) => {
    try {
      await authAxios.put(`/api/v1/gamification/achievements/${id}`, updatedFields);
      await fetchAchievements();
      notify('Success', 'Achievement updated successfully');
    } catch (error) {
      console.error('Error updating achievement:', error);
      notify('Error', 'Failed to update achievement', 'destructive');
    }
  }, [authAxios, fetchAchievements, notify]);

  const handleDeleteAchievement = useCallback(async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this achievement? This action cannot be undone.')) return;
    try {
      await authAxios.delete(`/api/v1/gamification/achievements/${id}`);
      await fetchAchievements();
      notify('Success', 'Achievement deleted successfully');
    } catch (error) {
      console.error('Error deleting achievement:', error);
      notify('Error', 'Failed to delete achievement', 'destructive');
    }
  }, [authAxios, fetchAchievements, notify]);

  const handleToggleAchievementStatus = useCallback(async (id: string, isActive: boolean) => {
    try {
      await authAxios.put(`/api/v1/gamification/achievements/${id}`, { isActive });
      await fetchAchievements();
      notify('Success', `Achievement ${isActive ? 'activated' : 'deactivated'} successfully`);
    } catch (error) {
      console.error('Error toggling achievement status:', error);
      notify('Error', 'Failed to update achievement status', 'destructive');
    }
  }, [authAxios, fetchAchievements, notify]);

  const handleCreateReward = useCallback(async (reward: Omit<Reward, 'id' | 'redemptionCount'>) => {
    try {
      await authAxios.post('/api/v1/gamification/rewards', reward);
      await fetchRewards();
      notify('Success', 'Reward created successfully');
    } catch (error) {
      console.error('Error creating reward:', error);
      notify('Error', 'Failed to create reward', 'destructive');
    }
  }, [authAxios, fetchRewards, notify]);

  const handleUpdateReward = useCallback(async (id: string, updatedFields: Partial<Reward>) => {
    try {
      await authAxios.put(`/api/v1/gamification/rewards/${id}`, updatedFields);
      await fetchRewards();
      notify('Success', 'Reward updated successfully');
    } catch (error) {
      console.error('Error updating reward:', error);
      notify('Error', 'Failed to update reward', 'destructive');
    }
  }, [authAxios, fetchRewards, notify]);

  const handleDeleteReward = useCallback(async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this reward? This action cannot be undone.')) return;
    try {
      await authAxios.delete(`/api/v1/gamification/rewards/${id}`);
      await fetchRewards();
      notify('Success', 'Reward deleted successfully');
    } catch (error) {
      console.error('Error deleting reward:', error);
      notify('Error', 'Failed to delete reward', 'destructive');
    }
  }, [authAxios, fetchRewards, notify]);

  const handleToggleRewardStatus = useCallback(async (id: string, isActive: boolean) => {
    try {
      await authAxios.put(`/api/v1/gamification/rewards/${id}`, { isActive });
      await fetchRewards();
      notify('Success', `Reward ${isActive ? 'activated' : 'deactivated'} successfully`);
    } catch (error) {
      console.error('Error toggling reward status:', error);
      notify('Error', 'Failed to update reward status', 'destructive');
    }
  }, [authAxios, fetchRewards, notify]);

  const handleUpdateRewardStock = useCallback(async (id: string, stock: number) => {
    try {
      await authAxios.put(`/api/v1/gamification/rewards/${id}`, { stock });
      await fetchRewards();
      notify('Success', 'Reward stock updated successfully');
    } catch (error) {
      console.error('Error updating reward stock:', error);
      notify('Error', 'Failed to update reward stock', 'destructive');
    }
  }, [authAxios, fetchRewards, notify]);

  const handleSaveSettings = useCallback(async (draft?: GamificationSettingsDraft) => {
    const nextSettings = {
      pointValues: draft?.pointValues ?? pointValues,
      tierThresholds: draft?.tierThresholds ?? tierThresholds,
      levelSettings: draft?.levelSettings ?? levelSettings,
      systemSettings: draft?.systemSettings ?? systemSettings,
    };

    if (draft) {
      setPointValues(draft.pointValues);
      setTierThresholds(draft.tierThresholds);
      setLevelSettings(draft.levelSettings);
      setSystemSettings(draft.systemSettings);
    }

    try {
      await authAxios.put('/api/v1/gamification/settings', nextSettings);
      notify('Success', 'Gamification settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      notify('Error', 'Failed to save gamification settings', 'destructive');
    }
  }, [authAxios, levelSettings, notify, pointValues, systemSettings, tierThresholds]);

  const handleRestoreDefaults = useCallback(async () => {
    if (!window.confirm('Are you sure you want to restore default settings? This will reset all gamification settings to their factory defaults.')) return;
    try {
      await fetchSettings();
      notify('Success', 'Gamification settings restored to defaults');
    } catch (error) {
      console.error('Error restoring default settings:', error);
      notify('Error', 'Failed to restore default settings', 'destructive');
    }
  }, [fetchSettings, notify]);

  return {
    loading,
    tabValue,
    achievements,
    rewards,
    pointValues,
    tierThresholds,
    levelSettings,
    systemSettings,
    leaderboard,
    analyticsData,
    handleTabChange,
    handleCreateAchievement,
    handleUpdateAchievement,
    handleDeleteAchievement,
    handleToggleAchievementStatus,
    handleCreateReward,
    handleUpdateReward,
    handleDeleteReward,
    handleToggleRewardStatus,
    handleUpdateRewardStock,
    handleUpdatePointValues: setPointValues,
    handleUpdateTierThresholds: setTierThresholds,
    handleUpdateLevelSettings: setLevelSettings,
    handleUpdateSystemSettings: setSystemSettings,
    handleSaveSettings,
    handleRestoreDefaults,
  };
};

export type AdminGamificationController = ReturnType<typeof useAdminGamificationController>;

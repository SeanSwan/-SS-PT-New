/**
 * ⚙️ GAMIFICATION SETTINGS HOOK - SYSTEM CONFIGURATION
 * ====================================================
 * Custom hook for managing system-wide gamification settings,
 * configurations, and administrative controls
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import type {
  GamificationSettings,
  SystemStatistics,
  GamificationResponse
} from '../../types/gamification.types';

import adminGamificationAPI from '../../services/adminGamificationAPI';

// ================================================================
// TYPES FOR SETTINGS HOOK
// ================================================================

interface UseGamificationSettingsReturn {
  // Settings data
  settings: GamificationSettings | null;
  systemStats: SystemStatistics | null;
  systemHealth: any | null;
  
  // Loading states
  isLoading: boolean;
  isSaving: boolean;
  isLoadingStats: boolean;
  isLoadingHealth: boolean;
  
  // Error states
  error: string | null;
  saveError: string | null;
  statsError: string | null;
  healthError: string | null;
  
  // Settings sections
  xpSettings: GamificationSettings['xp'] | null;
  challengeSettings: GamificationSettings['challenges'] | null;
  achievementSettings: GamificationSettings['achievements'] | null;
  socialSettings: GamificationSettings['social'] | null;
  notificationSettings: GamificationSettings['notifications'] | null;
  premiumSettings: GamificationSettings['premium'] | null;
  
  // Actions
  loadSettings: () => Promise<void>;
  saveSettings: (settings: Partial<GamificationSettings>) => Promise<boolean>;
  resetToDefaults: () => void;
  loadSystemStats: (period?: { startDate: string; endDate: string }) => Promise<void>;
  loadSystemHealth: () => Promise<void>;
  
  // Individual setting updates
  updateXpSettings: (xpSettings: Partial<GamificationSettings['xp']>) => Promise<boolean>;
  updateChallengeSettings: (challengeSettings: Partial<GamificationSettings['challenges']>) => Promise<boolean>;
  updateAchievementSettings: (achievementSettings: Partial<GamificationSettings['achievements']>) => Promise<boolean>;
  updateSocialSettings: (socialSettings: Partial<GamificationSettings['social']>) => Promise<boolean>;
  updateNotificationSettings: (notificationSettings: Partial<GamificationSettings['notifications']>) => Promise<boolean>;
  updatePremiumSettings: (premiumSettings: Partial<GamificationSettings['premium']>) => Promise<boolean>;
  
  // Validation helpers
  validateSettings: (settings: Partial<GamificationSettings>) => { isValid: boolean; errors: string[] };
  hasUnsavedChanges: boolean;
  
  // Utility functions
  exportSettings: () => string;
  importSettings: (settingsJson: string) => boolean;
  getRecommendedSettings: () => Partial<GamificationSettings>;
}

interface UseGamificationSettingsOptions {
  autoLoad?: boolean;
  useMockData?: boolean;
  autoSaveDelay?: number; // milliseconds
}

// ================================================================
// DEFAULT SETTINGS
// ================================================================

const defaultSettings: GamificationSettings = {
  xp: {
    workoutBase: 25,
    challengeMultiplier: 1.5,
    streakBonus: 10,
    levelCurve: 'exponential',
    maxLevel: 100
  },
  challenges: {
    maxActivePerUser: 5,
    defaultDuration: 7,
    participationRewards: true,
    autoGenerateEnabled: false,
    difficultyAdjustment: true
  },
  achievements: {
    celebrationDuration: 3000,
    rarityThresholds: {
      common: 50,
      rare: 20,
      epic: 5,
      legendary: 1
    },
    secretAchievements: true
  },
  social: {
    leaderboardsEnabled: true,
    friendSystemEnabled: true,
    sharingEnabled: true,
    commentsEnabled: true
  },
  notifications: {
    defaultEnabled: true,
    maxPerDay: 10,
    quietHours: {
      start: '22:00',
      end: '08:00'
    },
    channels: ['app', 'email', 'push']
  },
  premium: {
    enabled: true,
    trialDuration: 14,
    exclusiveFeatures: ['advanced_analytics', 'custom_challenges', 'priority_support'],
    upgradePrompts: true
  }
};

// ================================================================
// MAIN HOOK IMPLEMENTATION
// ================================================================

export const useGamificationSettings = (
  options: UseGamificationSettingsOptions = {}
): UseGamificationSettingsReturn => {
  const {
    autoLoad = true,
    useMockData = process.env.NODE_ENV === 'development',
    autoSaveDelay = 2000
  } = options;
  
  // State management
  const [settings, setSettings] = useState<GamificationSettings | null>(null);
  const [originalSettings, setOriginalSettings] = useState<GamificationSettings | null>(null);
  const [systemStats, setSystemStats] = useState<SystemStatistics | null>(null);
  const [systemHealth, setSystemHealth] = useState<any | null>(null);
  
  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [isLoadingHealth, setIsLoadingHealth] = useState(false);
  
  // Error states
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  
  // Auto-save timeout
  const [autoSaveTimeout, setAutoSaveTimeout] = useState<NodeJS.Timeout | null>(null);
  
  // ================================================================
  // COMPUTED VALUES
  // ================================================================
  
  /**
   * Individual settings sections
   */
  const xpSettings = useMemo(() => settings?.xp || null, [settings]);
  const challengeSettings = useMemo(() => settings?.challenges || null, [settings]);
  const achievementSettings = useMemo(() => settings?.achievements || null, [settings]);
  const socialSettings = useMemo(() => settings?.social || null, [settings]);
  const notificationSettings = useMemo(() => settings?.notifications || null, [settings]);
  const premiumSettings = useMemo(() => settings?.premium || null, [settings]);
  
  /**
   * Check if there are unsaved changes
   */
  const hasUnsavedChanges = useMemo(() => {
    if (!settings || !originalSettings) return false;
    return JSON.stringify(settings) !== JSON.stringify(originalSettings);
  }, [settings, originalSettings]);
  
  // ================================================================
  // DATA FETCHING FUNCTIONS
  // ================================================================
  
  /**
   * Load system settings
   */
  const loadSettings = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      
      if (useMockData) {
        setSettings(defaultSettings);
        setOriginalSettings(defaultSettings);
        return;
      }
      
      const response = await adminGamificationAPI.getSystemSettings();
      
      if (response.success && response.data) {
        setSettings(response.data);
        setOriginalSettings(response.data);
      } else {
        setError(response.error?.message || 'Failed to load settings');
        // Use defaults as fallback
        setSettings(defaultSettings);
        setOriginalSettings(defaultSettings);
      }
      
    } catch (err) {
      console.error('Error loading settings:', err);
      setError('Failed to load settings');
      setSettings(defaultSettings);
      setOriginalSettings(defaultSettings);
    } finally {
      setIsLoading(false);
    }
  }, [useMockData]);
  
  /**
   * Load system statistics
   */
  const loadSystemStats = useCallback(async (
    period?: { startDate: string; endDate: string }
  ): Promise<void> => {
    try {
      setIsLoadingStats(true);
      setStatsError(null);
      
      if (useMockData) {
        // Mock system statistics
        const mockStats: SystemStatistics = {
          period: period || {
            startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            endDate: new Date().toISOString()
          },
          users: {
            totalUsers: 1247,
            activeUsers: 892,
            newUsers: 156,
            retentionRate: 73.5,
            averageSessionDuration: 28
          },
          challenges: {
            totalChallenges: 45,
            activeChallenges: 12,
            averageParticipation: 23.8,
            completionRate: 67.2,
            mostPopularCategory: 'cardio'
          },
          achievements: {
            totalUnlocks: 3420,
            newAchievements: 234,
            averageUnlockTime: 14.5,
            mostRareAchievement: 'Diamond Crusher'
          },
          performance: {
            averageLoadTime: 1.2,
            errorRate: 0.03,
            uptime: 99.9,
            userSatisfaction: 4.6
          }
        };
        
        setSystemStats(mockStats);
        return;
      }
      
      const response = await adminGamificationAPI.getSystemStatistics(period);
      
      if (response.success && response.data) {
        setSystemStats(response.data);
      } else {
        setStatsError(response.error?.message || 'Failed to load statistics');
      }
      
    } catch (err) {
      console.error('Error loading system stats:', err);
      setStatsError('Failed to load statistics');
    } finally {
      setIsLoadingStats(false);
    }
  }, [useMockData]);
  
  /**
   * Load system health status
   */
  const loadSystemHealth = useCallback(async (): Promise<void> => {
    try {
      setIsLoadingHealth(true);
      setHealthError(null);
      
      if (useMockData) {
        // Mock system health
        const mockHealth = {
          status: 'healthy' as const,
          checks: {
            database: true,
            cache: true,
            queue: true,
            storage: true
          },
          metrics: {
            uptime: 99.95,
            responseTime: 120,
            errorRate: 0.02,
            activeUsers: 892
          }
        };
        
        setSystemHealth(mockHealth);
        return;
      }
      
      const response = await adminGamificationAPI.getSystemHealth();
      
      if (response.success && response.data) {
        setSystemHealth(response.data);
      } else {
        setHealthError(response.error?.message || 'Failed to load system health');
      }
      
    } catch (err) {
      console.error('Error loading system health:', err);
      setHealthError('Failed to load system health');
    } finally {
      setIsLoadingHealth(false);
    }
  }, [useMockData]);
  
  // ================================================================
  // SAVE FUNCTIONS
  // ================================================================
  
  /**
   * Save settings to backend
   */
  const saveSettings = useCallback(async (
    updatedSettings: Partial<GamificationSettings>
  ): Promise<boolean> => {
    try {
      setIsSaving(true);
      setSaveError(null);
      
      const validation = validateSettings(updatedSettings);
      if (!validation.isValid) {
        setSaveError(`Validation errors: ${validation.errors.join(', ')}`);
        return false;
      }
      
      if (useMockData) {
        const newSettings = { ...settings, ...updatedSettings } as GamificationSettings;
        setSettings(newSettings);
        setOriginalSettings(newSettings);
        return true;
      }
      
      const response = await adminGamificationAPI.updateSystemSettings(updatedSettings);
      
      if (response.success && response.data) {
        setSettings(response.data);
        setOriginalSettings(response.data);
        return true;
      } else {
        setSaveError(response.error?.message || 'Failed to save settings');
        return false;
      }
      
    } catch (err) {
      console.error('Error saving settings:', err);
      setSaveError('Failed to save settings');
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [useMockData, settings]);
  
  // ================================================================
  // INDIVIDUAL SETTING UPDATES
  // ================================================================
  
  /**
   * Update XP settings
   */
  const updateXpSettings = useCallback(async (
    xpSettings: Partial<GamificationSettings['xp']>
  ): Promise<boolean> => {
    return await saveSettings({ xp: { ...settings?.xp, ...xpSettings } });
  }, [saveSettings, settings]);
  
  /**
   * Update challenge settings
   */
  const updateChallengeSettings = useCallback(async (
    challengeSettings: Partial<GamificationSettings['challenges']>
  ): Promise<boolean> => {
    return await saveSettings({ challenges: { ...settings?.challenges, ...challengeSettings } });
  }, [saveSettings, settings]);
  
  /**
   * Update achievement settings
   */
  const updateAchievementSettings = useCallback(async (
    achievementSettings: Partial<GamificationSettings['achievements']>
  ): Promise<boolean> => {
    return await saveSettings({ achievements: { ...settings?.achievements, ...achievementSettings } });
  }, [saveSettings, settings]);
  
  /**
   * Update social settings
   */
  const updateSocialSettings = useCallback(async (
    socialSettings: Partial<GamificationSettings['social']>
  ): Promise<boolean> => {
    return await saveSettings({ social: { ...settings?.social, ...socialSettings } });
  }, [saveSettings, settings]);
  
  /**
   * Update notification settings
   */
  const updateNotificationSettings = useCallback(async (
    notificationSettings: Partial<GamificationSettings['notifications']>
  ): Promise<boolean> => {
    return await saveSettings({ notifications: { ...settings?.notifications, ...notificationSettings } });
  }, [saveSettings, settings]);
  
  /**
   * Update premium settings
   */
  const updatePremiumSettings = useCallback(async (
    premiumSettings: Partial<GamificationSettings['premium']>
  ): Promise<boolean> => {
    return await saveSettings({ premium: { ...settings?.premium, ...premiumSettings } });
  }, [saveSettings, settings]);
  
  // ================================================================
  // UTILITY FUNCTIONS
  // ================================================================
  
  /**
   * Reset settings to defaults
   */
  const resetToDefaults = useCallback((): void => {
    setSettings(defaultSettings);
  }, []);
  
  /**
   * Validate settings
   */
  const validateSettings = useCallback((
    settings: Partial<GamificationSettings>
  ): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    // Validate XP settings
    if (settings.xp) {
      if (settings.xp.workoutBase !== undefined && settings.xp.workoutBase < 1) {
        errors.push('Workout base XP must be at least 1');
      }
      if (settings.xp.challengeMultiplier !== undefined && settings.xp.challengeMultiplier < 1) {
        errors.push('Challenge multiplier must be at least 1');
      }
      if (settings.xp.maxLevel !== undefined && settings.xp.maxLevel < 10) {
        errors.push('Max level must be at least 10');
      }
    }
    
    // Validate challenge settings
    if (settings.challenges) {
      if (settings.challenges.maxActivePerUser !== undefined && settings.challenges.maxActivePerUser < 1) {
        errors.push('Max active challenges per user must be at least 1');
      }
      if (settings.challenges.defaultDuration !== undefined && settings.challenges.defaultDuration < 1) {
        errors.push('Default challenge duration must be at least 1 day');
      }
    }
    
    // Validate achievement settings
    if (settings.achievements) {
      if (settings.achievements.celebrationDuration !== undefined && settings.achievements.celebrationDuration < 1000) {
        errors.push('Celebration duration must be at least 1 second');
      }
    }
    
    // Validate notification settings
    if (settings.notifications) {
      if (settings.notifications.maxPerDay !== undefined && settings.notifications.maxPerDay < 1) {
        errors.push('Max notifications per day must be at least 1');
      }
    }
    
    // Validate premium settings
    if (settings.premium) {
      if (settings.premium.trialDuration !== undefined && settings.premium.trialDuration < 1) {
        errors.push('Trial duration must be at least 1 day');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }, []);
  
  /**
   * Export settings as JSON
   */
  const exportSettings = useCallback((): string => {
    return JSON.stringify(settings, null, 2);
  }, [settings]);
  
  /**
   * Import settings from JSON
   */
  const importSettings = useCallback((settingsJson: string): boolean => {
    try {
      const importedSettings = JSON.parse(settingsJson);
      const validation = validateSettings(importedSettings);
      
      if (validation.isValid) {
        setSettings(importedSettings);
        return true;
      } else {
        console.error('Invalid settings:', validation.errors);
        return false;
      }
    } catch (err) {
      console.error('Failed to parse settings JSON:', err);
      return false;
    }
  }, [validateSettings]);
  
  /**
   * Get recommended settings based on usage patterns
   */
  const getRecommendedSettings = useCallback((): Partial<GamificationSettings> => {
    // This would analyze system statistics to provide recommendations
    // For now, return optimized defaults
    return {
      xp: {
        workoutBase: systemStats?.users.averageSessionDuration ? 
          Math.max(25, Math.round(systemStats.users.averageSessionDuration * 0.8)) : 25
      },
      challenges: {
        maxActivePerUser: systemStats?.challenges.averageParticipation && systemStats.challenges.averageParticipation > 30 ? 7 : 5
      },
      notifications: {
        maxPerDay: systemStats?.users.retentionRate && systemStats.users.retentionRate > 80 ? 8 : 12
      }
    };
  }, [systemStats]);
  
  // ================================================================
  // EFFECTS
  // ================================================================
  
  /**
   * Auto-load data on mount
   */
  useEffect(() => {
    if (autoLoad) {
      loadSettings();
      loadSystemStats();
      loadSystemHealth();
    }
  }, [autoLoad, loadSettings, loadSystemStats, loadSystemHealth]);
  
  /**
   * Auto-save on settings change
   */
  useEffect(() => {
    if (hasUnsavedChanges && settings && originalSettings) {
      // Clear existing timeout
      if (autoSaveTimeout) {
        clearTimeout(autoSaveTimeout);
      }
      
      // Set new timeout for auto-save
      const timeout = setTimeout(() => {
        saveSettings(settings);
      }, autoSaveDelay);
      
      setAutoSaveTimeout(timeout);
      
      return () => {
        clearTimeout(timeout);
      };
    }
  }, [hasUnsavedChanges, settings, originalSettings, autoSaveDelay, saveSettings, autoSaveTimeout]);
  
  // ================================================================
  // RETURN HOOK INTERFACE
  // ================================================================
  
  return {
    // Settings data
    settings,
    systemStats,
    systemHealth,
    
    // Loading states
    isLoading,
    isSaving,
    isLoadingStats,
    isLoadingHealth,
    
    // Error states
    error,
    saveError,
    statsError,
    healthError,
    
    // Settings sections
    xpSettings,
    challengeSettings,
    achievementSettings,
    socialSettings,
    notificationSettings,
    premiumSettings,
    
    // Actions
    loadSettings,
    saveSettings,
    resetToDefaults,
    loadSystemStats,
    loadSystemHealth,
    
    // Individual setting updates
    updateXpSettings,
    updateChallengeSettings,
    updateAchievementSettings,
    updateSocialSettings,
    updateNotificationSettings,
    updatePremiumSettings,
    
    // Validation helpers
    validateSettings,
    hasUnsavedChanges,
    
    // Utility functions
    exportSettings,
    importSettings,
    getRecommendedSettings
  };
};

export default useGamificationSettings;

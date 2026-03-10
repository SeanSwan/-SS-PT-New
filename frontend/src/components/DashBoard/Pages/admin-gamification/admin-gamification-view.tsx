import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import styled from 'styled-components';
import { 
  Trophy, 
  Gift, 
  Settings,
  Users
} from 'lucide-react';

// Import custom UI components (reusing from UniversalMasterSchedule)
import {
  PageTitle,
  BodyText,
  Spinner
} from '../../../UniversalMasterSchedule/ui';

// Import styled components
import { PageContainer } from './styled-gamification-system';

// Lazy load components for better initial load time
const AchievementManager = lazy(() => import('./components/AchievementManager'));
const RewardManager = lazy(() => import('./components/RewardManager'));
const GamificationSettings = lazy(() => import('./components/GamificationSettings'));

// New component for system analytics
const SystemAnalytics = lazy(() => import('./components/SystemAnalytics'));

// Import types and mock data
import { useAuth } from '../../../../context/AuthContext';
import { useToast } from '../../../../hooks/use-toast';

// Define interfaces
interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  pointValue: number;
  requirementType: string;
  requirementValue: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  isActive: boolean;
  badgeImageUrl?: string;
}

interface Reward {
  id: string;
  name: string;
  description: string;
  icon: string;
  pointCost: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  stock: number;
  isActive: boolean;
  redemptionCount: number;
  imageUrl?: string;
  expiresAt?: string;
}

interface PointValue {
  id: string;
  name: string;
  description: string;
  pointValue: number;
}

interface TierThreshold {
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  pointsRequired: number;
  levelRequired?: number;
}

interface LevelSettings {
  pointsPerLevel: number;
  levelCap: number;
  enableLevelCap: boolean;
}

interface SystemSettings {
  enableGamification: boolean;
  enableAchievements: boolean;
  enableRewards: boolean;
  enableLeaderboard: boolean;
  enableLevels: boolean;
  enableTiers: boolean;
  enableStreaks: boolean;
  notifyOnAchievement: boolean;
  notifyOnLevelUp: boolean;
  notifyOnReward: boolean;
  streakExpirationDays: number;
  pointsExpiration: {
    enabled: boolean;
    expirationDays: number;
  }
}

interface LeaderboardEntry {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  photo?: string;
  points: number;
  level: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  achievements: number;
  streakDays: number;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <TabPanelContainer
      role="tabpanel"
      hidden={value !== index}
      id={`admin-gamification-tabpanel-${index}`}
      aria-labelledby={`admin-gamification-tab-${index}`}
      {...other}
    >
      {value === index && <TabContent>{children}</TabContent>}
    </TabPanelContainer>
  );
}

function a11yProps(index: number) {
  return {
    id: `admin-gamification-tab-${index}`,
    'aria-controls': `admin-gamification-tabpanel-${index}`,
  };
}

/**
 * AdminGamificationView Component
 * Master admin interface for managing the entire gamification system
 */
const AdminGamificationView: React.FC = () => {
  const { authAxios } = useAuth();
  const { toast } = useToast();
  
  // State with optimization for better performance
  const [loading, setLoading] = useState<boolean>(true);
  const [tabValue, setTabValue] = useState<number>(0);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [pointValues, setPointValues] = useState<PointValue[]>([]);
  const [tierThresholds, setTierThresholds] = useState<TierThreshold[]>([]);
  const [levelSettings, setLevelSettings] = useState<LevelSettings>({
    pointsPerLevel: 500,
    levelCap: 100,
    enableLevelCap: false
  });
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
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
    pointsExpiration: {
      enabled: false,
      expirationDays: 365
    }
  });
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [analyticsData, setAnalyticsData] = useState<any>(null); // For system analytics
  
  // Handle tab change with performance optimization
  const handleTabChange = useCallback((newValue: number) => {
    setTabValue(newValue);
    
    // Only fetch analytics data when analytics tab is selected
    if (newValue === 3 && !analyticsData) {
      fetchAnalyticsData();
    }
  }, [analyticsData]);
  
  // Load data from real API
  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchAchievements(),
      fetchRewards(),
      fetchSettings(),
      fetchLeaderboard()
    ])
    .catch((error) => {
      console.error('Error loading gamification data:', error);
      toast({
        title: "Error",
        description: "Failed to load gamification data. Please try again.",
        variant: "destructive"
      });
    })
    .finally(() => {
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Fetch analytics — build from leaderboard + achievements + rewards data
  const fetchAnalyticsData = useCallback(async () => {
    try {
      // Build analytics from available API data
      const [leaderboardRes, achievementsRes, rewardsRes] = await Promise.all([
        authAxios.get('/api/v1/gamification/leaderboard?limit=100').catch(() => ({ data: { leaderboard: [] } })),
        authAxios.get('/api/v1/gamification/achievements').catch(() => ({ data: { achievements: [] } })),
        authAxios.get('/api/v1/gamification/rewards').catch(() => ({ data: { rewards: [] } })),
      ]);

      const lb = leaderboardRes.data?.leaderboard || leaderboardRes.data || [];
      const achs = achievementsRes.data?.achievements || achievementsRes.data || [];
      const rwds = rewardsRes.data?.rewards || rewardsRes.data || [];
      const users = Array.isArray(lb) ? lb : [];

      const totalUsers = users.length;
      const activeUsers = users.filter((u: any) => (u.points || 0) > 0).length;
      const totalPoints = users.reduce((s: number, u: any) => s + (u.points || u.totalPoints || 0), 0);
      const avgPoints = totalUsers > 0 ? Math.round(totalPoints / totalUsers) : 0;
      const avgLevel = totalUsers > 0 ? Math.round(users.reduce((s: number, u: any) => s + (u.level || 0), 0) / totalUsers) : 0;

      const tierDist = ['bronze', 'silver', 'gold', 'platinum'].map(tier => {
        const count = users.filter((u: any) => (u.tier || 'bronze') === tier).length;
        return { tier, count, percentage: totalUsers > 0 ? Math.round((count / totalUsers) * 100) : 0 };
      });

      setAnalyticsData({
        userEngagement: { totalUsers, activeUsers, engagementRate: totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0, averagePointsPerUser: avgPoints, averageLevelPerUser: avgLevel },
        achievementStats: { totalAchievementsEarned: achs.length, achievementCompletionRate: 0, mostPopularAchievement: achs[0] || null, leastPopularAchievement: achs[achs.length - 1] || null },
        rewardStats: { totalRewardsRedeemed: rwds.reduce((s: number, r: any) => s + (r.redemptionCount || 0), 0), totalPointsSpent: 0, mostRedeemedReward: rwds[0] || null, leastRedeemedReward: rwds[rwds.length - 1] || null },
        tierDistribution: tierDist,
        timeSeriesData: [],
      });
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      toast({ title: "Error", description: "Failed to fetch analytics data", variant: "destructive" });
    }
  }, [authAxios, toast]);
  
  // Fetch achievements from real API
  const fetchAchievements = useCallback(async () => {
    try {
      const response = await authAxios.get('/api/v1/gamification/achievements');
      const data = response.data?.achievements || response.data || [];
      setAchievements(Array.isArray(data) ? data.map((a: any) => ({
        id: String(a.id),
        name: a.title || a.name || '',
        description: a.description || '',
        icon: a.iconEmoji || a.icon || 'Award',
        pointValue: a.xpReward || a.pointValue || a.points || 0,
        requirementType: a.requirementType || a.requirement_type || a.progressUnit || '',
        requirementValue: a.requirementValue || a.requirement_value || a.maxProgress || 0,
        tier: a.tier || 'bronze',
        isActive: a.isActive !== undefined ? a.isActive : true,
        badgeImageUrl: a.badgeImageUrl || a.badge_image_url,
      })) : []);
    } catch (error) {
      console.error('Error fetching achievements:', error);
      throw error;
    }
  }, [authAxios]);
  
  // Fetch rewards from real API
  const fetchRewards = useCallback(async () => {
    try {
      const response = await authAxios.get('/api/v1/gamification/rewards');
      const data = response.data?.rewards || response.data || [];
      setRewards(Array.isArray(data) ? data.map((r: any) => ({
        id: String(r.id),
        name: r.name || '',
        description: r.description || '',
        icon: r.icon || 'Gift',
        pointCost: r.pointCost || r.point_cost || 0,
        tier: r.tier || 'bronze',
        stock: r.stock ?? r.quantity ?? 0,
        isActive: r.isActive !== undefined ? r.isActive : true,
        redemptionCount: r.redemptionCount || r.redemption_count || 0,
      })) : []);
    } catch (error) {
      console.error('Error fetching rewards:', error);
      throw error;
    }
  }, [authAxios]);
  
  // Fetch settings from real API
  const fetchSettings = useCallback(async () => {
    try {
      const response = await authAxios.get('/api/v1/gamification/settings');
      const data = response.data?.settings || response.data || {};
      if (data.pointValues) setPointValues(data.pointValues);
      if (data.tierThresholds) {
        // API returns object {bronze: 0, silver: 1000, ...} — convert to array
        const tt = data.tierThresholds;
        if (Array.isArray(tt)) {
          setTierThresholds(tt);
        } else if (typeof tt === 'object') {
          setTierThresholds(
            Object.entries(tt).map(([tier, pts]) => ({
              tier: tier as TierThreshold['tier'],
              pointsRequired: typeof pts === 'number' ? pts : 0,
            }))
          );
        }
      }
      if (data.levelSettings) setLevelSettings(data.levelSettings);
      if (data.systemSettings) setSystemSettings(data.systemSettings);
    } catch (error) {
      console.error('Error fetching settings:', error);
      // Settings may not exist yet — use defaults silently
    }
  }, [authAxios]);

  // Fetch leaderboard from real API
  const fetchLeaderboard = useCallback(async () => {
    try {
      const response = await authAxios.get('/api/v1/gamification/leaderboard?limit=10');
      const data = response.data?.leaderboard || response.data || [];
      setLeaderboard(Array.isArray(data) ? data.map((u: any) => ({
        id: String(u.id || u.userId),
        firstName: u.firstName || u.first_name || '',
        lastName: u.lastName || u.last_name || '',
        username: u.username || '',
        points: u.points || u.totalPoints || 0,
        level: u.level || 0,
        tier: u.tier || 'bronze',
        achievements: u.achievements || u.achievementCount || 0,
        streakDays: u.streakDays || u.streak_days || 0,
      })) : []);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      throw error;
    }
  }, [authAxios]);
  
  // Achievement management handlers with performance optimization
  const handleCreateAchievement = useCallback(async (achievement: Omit<Achievement, 'id'>) => {
    try {
      await authAxios.post('/api/v1/gamification/achievements', achievement);
      await fetchAchievements();

      toast({
        title: "Success",
        description: "Achievement created successfully",
        variant: "default"
      });
    } catch (error) {
      console.error('Error creating achievement:', error);
      toast({
        title: "Error",
        description: "Failed to create achievement",
        variant: "destructive"
      });
    }
  }, [authAxios, fetchAchievements, toast]);
  
  const handleUpdateAchievement = useCallback(async (id: string, updatedFields: Partial<Achievement>) => {
    try {
      await authAxios.put(`/api/v1/gamification/achievements/${id}`, updatedFields);
      await fetchAchievements();

      toast({
        title: "Success",
        description: "Achievement updated successfully",
        variant: "default"
      });
    } catch (error) {
      console.error('Error updating achievement:', error);
      toast({
        title: "Error",
        description: "Failed to update achievement",
        variant: "destructive"
      });
    }
  }, [authAxios, fetchAchievements, toast]);
  
  const handleDeleteAchievement = useCallback(async (id: string) => {
    try {
      const confirmed = window.confirm("Are you sure you want to delete this achievement? This action cannot be undone.");
      if (!confirmed) return;

      await authAxios.delete(`/api/v1/gamification/achievements/${id}`);
      await fetchAchievements();

      toast({
        title: "Success",
        description: "Achievement deleted successfully",
        variant: "default"
      });
    } catch (error) {
      console.error('Error deleting achievement:', error);
      toast({
        title: "Error",
        description: "Failed to delete achievement",
        variant: "destructive"
      });
    }
  }, [authAxios, fetchAchievements, toast]);
  
  const handleToggleAchievementStatus = useCallback(async (id: string, isActive: boolean) => {
    try {
      await authAxios.put(`/api/v1/gamification/achievements/${id}`, { isActive });
      await fetchAchievements();

      toast({
        title: "Success",
        description: `Achievement ${isActive ? 'activated' : 'deactivated'} successfully`,
        variant: "default"
      });
    } catch (error) {
      console.error('Error toggling achievement status:', error);
      toast({
        title: "Error",
        description: "Failed to update achievement status",
        variant: "destructive"
      });
    }
  }, [authAxios, fetchAchievements, toast]);
  
  // Reward management handlers with performance optimization
  const handleCreateReward = useCallback(async (reward: Omit<Reward, 'id' | 'redemptionCount'>) => {
    try {
      await authAxios.post('/api/v1/gamification/rewards', reward);
      await fetchRewards();

      toast({
        title: "Success",
        description: "Reward created successfully",
        variant: "default"
      });
    } catch (error) {
      console.error('Error creating reward:', error);
      toast({
        title: "Error",
        description: "Failed to create reward",
        variant: "destructive"
      });
    }
  }, [authAxios, fetchRewards, toast]);
  
  const handleUpdateReward = useCallback(async (id: string, updatedFields: Partial<Reward>) => {
    try {
      await authAxios.put(`/api/v1/gamification/rewards/${id}`, updatedFields);
      await fetchRewards();

      toast({
        title: "Success",
        description: "Reward updated successfully",
        variant: "default"
      });
    } catch (error) {
      console.error('Error updating reward:', error);
      toast({
        title: "Error",
        description: "Failed to update reward",
        variant: "destructive"
      });
    }
  }, [authAxios, fetchRewards, toast]);
  
  const handleDeleteReward = useCallback(async (id: string) => {
    try {
      const confirmed = window.confirm("Are you sure you want to delete this reward? This action cannot be undone.");
      if (!confirmed) return;

      await authAxios.delete(`/api/v1/gamification/rewards/${id}`);
      await fetchRewards();

      toast({
        title: "Success",
        description: "Reward deleted successfully",
        variant: "default"
      });
    } catch (error) {
      console.error('Error deleting reward:', error);
      toast({
        title: "Error",
        description: "Failed to delete reward",
        variant: "destructive"
      });
    }
  }, [authAxios, fetchRewards, toast]);
  
  const handleToggleRewardStatus = useCallback(async (id: string, isActive: boolean) => {
    try {
      await authAxios.put(`/api/v1/gamification/rewards/${id}`, { isActive });
      await fetchRewards();

      toast({
        title: "Success",
        description: `Reward ${isActive ? 'activated' : 'deactivated'} successfully`,
        variant: "default"
      });
    } catch (error) {
      console.error('Error toggling reward status:', error);
      toast({
        title: "Error",
        description: "Failed to update reward status",
        variant: "destructive"
      });
    }
  }, [authAxios, fetchRewards, toast]);
  
  const handleUpdateRewardStock = useCallback(async (id: string, stock: number) => {
    try {
      await authAxios.put(`/api/v1/gamification/rewards/${id}`, { stock });
      await fetchRewards();

      toast({
        title: "Success",
        description: "Reward stock updated successfully",
        variant: "default"
      });
    } catch (error) {
      console.error('Error updating reward stock:', error);
      toast({
        title: "Error",
        description: "Failed to update reward stock",
        variant: "destructive"
      });
    }
  }, [authAxios, fetchRewards, toast]);
  
  // Settings management handlers with performance optimization
  const handleUpdatePointValues = useCallback(async (updatedPointValues: PointValue[]) => {
    try {
      setPointValues(updatedPointValues);
    } catch (error) {
      console.error('Error updating point values:', error);
      toast({
        title: "Error",
        description: "Failed to update point values",
        variant: "destructive"
      });
    }
  }, [toast]);
  
  const handleUpdateTierThresholds = useCallback(async (updatedTierThresholds: TierThreshold[]) => {
    try {
      setTierThresholds(updatedTierThresholds);
    } catch (error) {
      console.error('Error updating tier thresholds:', error);
      toast({
        title: "Error",
        description: "Failed to update tier thresholds",
        variant: "destructive"
      });
    }
  }, [toast]);
  
  const handleUpdateLevelSettings = useCallback(async (updatedLevelSettings: LevelSettings) => {
    try {
      setLevelSettings(updatedLevelSettings);
    } catch (error) {
      console.error('Error updating level settings:', error);
      toast({
        title: "Error",
        description: "Failed to update level settings",
        variant: "destructive"
      });
    }
  }, [toast]);
  
  const handleUpdateSystemSettings = useCallback(async (updatedSystemSettings: SystemSettings) => {
    try {
      setSystemSettings(updatedSystemSettings);
    } catch (error) {
      console.error('Error updating system settings:', error);
      toast({
        title: "Error",
        description: "Failed to update system settings",
        variant: "destructive"
      });
    }
  }, [toast]);
  
  const handleSaveSettings = useCallback(async () => {
    try {
      await authAxios.put('/api/v1/gamification/settings', {
        pointValues,
        tierThresholds,
        levelSettings,
        systemSettings
      });

      toast({
        title: "Success",
        description: "Gamification settings saved successfully",
        variant: "default"
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: "Failed to save gamification settings",
        variant: "destructive"
      });
    }
  }, [authAxios, pointValues, tierThresholds, levelSettings, systemSettings, toast]);
  
  const handleRestoreDefaults = useCallback(async () => {
    try {
      const confirmed = window.confirm("Are you sure you want to restore default settings? This will reset all gamification settings to their factory defaults.");
      if (!confirmed) return;

      await fetchSettings();

      toast({
        title: "Success",
        description: "Gamification settings restored to defaults",
        variant: "default"
      });
    } catch (error) {
      console.error('Error restoring default settings:', error);
      toast({
        title: "Error",
        description: "Failed to restore default settings",
        variant: "destructive"
      });
    }
  }, [fetchSettings, toast]);
  
  if (loading) {
    return (
      <LoadingContainer>
        <Spinner size={48} />
      </LoadingContainer>
    );
  }
  
  // Loading fallback component for lazy-loaded tabs
  const TabLoadingFallback = () => (
    <TabLoadingContainer>
      <Spinner size={32} />
    </TabLoadingContainer>
  );

  return (
    <PageContainer role="main" aria-label="Gamification management dashboard">
      <PageTitle>Gamification System Administration</PageTitle>
      
      <HeaderDescription>
        <BodyText>
          Manage achievements, rewards, and system settings for your gamification platform. Use this dashboard to create engaging experiences that motivate your clients.
        </BodyText>
      </HeaderDescription>
      
      {/* Custom Tabs */}
      <TabsContainer role="tablist" aria-label="Gamification management tabs">
        <TabButton
          role="tab"
          aria-selected={tabValue === 0}
          {...a11yProps(0)}
          onClick={() => handleTabChange(0)}
          active={tabValue === 0}
          aria-label="Manage achievements and badges"
        >
          <Trophy size={16} />
          Achievements
        </TabButton>
        <TabButton
          role="tab"
          aria-selected={tabValue === 1}
          {...a11yProps(1)}
          onClick={() => handleTabChange(1)}
          active={tabValue === 1}
          aria-label="Manage rewards and redemptions"
        >
          <Gift size={16} />
          Rewards
        </TabButton>
        <TabButton
          role="tab"
          aria-selected={tabValue === 2}
          {...a11yProps(2)}
          onClick={() => handleTabChange(2)}
          active={tabValue === 2}
          aria-label="Configure gamification settings"
        >
          <Settings size={16} />
          System Settings
        </TabButton>
        <TabButton
          role="tab"
          aria-selected={tabValue === 3}
          {...a11yProps(3)}
          onClick={() => handleTabChange(3)}
          active={tabValue === 3}
          aria-label="View gamification analytics and reports"
        >
          <Users size={16} />
          Analytics
        </TabButton>
      </TabsContainer>
      
      {/* Achievement Management Tab */}
      <TabPanel value={tabValue} index={0}>
        <Suspense fallback={<TabLoadingFallback />}>
          <AchievementManager 
            achievements={achievements}
            onCreateAchievement={handleCreateAchievement}
            onUpdateAchievement={handleUpdateAchievement}
            onDeleteAchievement={handleDeleteAchievement}
            onToggleStatus={handleToggleAchievementStatus}
          />
        </Suspense>
      </TabPanel>
      
      {/* Reward Management Tab */}
      <TabPanel value={tabValue} index={1}>
        <Suspense fallback={<TabLoadingFallback />}>
          <RewardManager 
            rewards={rewards}
            onCreateReward={handleCreateReward}
            onUpdateReward={handleUpdateReward}
            onDeleteReward={handleDeleteReward}
            onToggleStatus={handleToggleRewardStatus}
            onUpdateStock={handleUpdateRewardStock}
          />
        </Suspense>
      </TabPanel>
      
      {/* System Settings Tab */}
      <TabPanel value={tabValue} index={2}>
        <Suspense fallback={<TabLoadingFallback />}>
          <GamificationSettings 
            pointValues={pointValues}
            tierThresholds={tierThresholds}
            levelSettings={levelSettings}
            systemSettings={systemSettings}
            onUpdatePointValues={handleUpdatePointValues}
            onUpdateTierThresholds={handleUpdateTierThresholds}
            onUpdateLevelSettings={handleUpdateLevelSettings}
            onUpdateSystemSettings={handleUpdateSystemSettings}
            onSaveSettings={handleSaveSettings}
            onRestoreDefaults={handleRestoreDefaults}
          />
        </Suspense>
      </TabPanel>

      {/* New Analytics Tab */}
      <TabPanel value={tabValue} index={3}>
        <Suspense fallback={<TabLoadingFallback />}>
          <SystemAnalytics data={analyticsData} />
        </Suspense>
      </TabPanel>
    </PageContainer>
  );
};

export default React.memo(AdminGamificationView);

// ==================== STYLED COMPONENTS ====================

const HeaderDescription = styled.div`
  margin-bottom: 2rem;
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 50vh;
`;

const TabLoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  padding: 2rem;
`;

const TabsContainer = styled.div`
  display: flex;
  gap: 0.5rem;
  border-bottom: 2px solid rgba(255, 255, 255, 0.1);
  margin-bottom: 1.5rem;
  overflow-x: auto;
  &::-webkit-scrollbar { height: 4px; }
  &::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.05); }
  &::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.2); border-radius: 2px; }
`;

const TabButton = styled.button<{ active: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: ${props => props.active ? 'rgba(59, 130, 246, 0.1)' : 'transparent'};
  border: none;
  border-bottom: 2px solid ${props => props.active ? '#3b82f6' : 'transparent'};
  color: ${props => props.active ? '#3b82f6' : '#94a3b8'};
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  margin-bottom: -2px;
  &:hover { background: rgba(59, 130, 246, 0.05); color: ${props => props.active ? '#3b82f6' : '#e2e8f0'}; }
  &:focus-visible { outline: 2px solid #3b82f6; outline-offset: -2px; }
  svg { flex-shrink: 0; }
`;

const TabPanelContainer = styled.div`
  &[hidden] { display: none; }
`;

const TabContent = styled.div`
  padding: 1.5rem 0;
`;
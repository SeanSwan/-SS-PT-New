// Advanced Gamification Components Export
export { default as AdvancedGamificationHub } from './AdvancedGamificationHub';

// User-Facing Components
export {
  GamificationHub,
  AchievementShowcase,
  ChallengeCenter,
  LeaderboardWidget,
  ProgressTracker
} from './components';

// Shared Components
export {
  GamificationCard,
  AnimatedButton,
  TabNavigation,
  ChallengeTypeSelector,
  DifficultySlider
} from './shared';

// Redux Integration
export {
  fetchUserStats,
  fetchAchievements,
  fetchChallenges,
  fetchLeaderboard,
  fetchProgressData,
  fetchMilestones,
  fetchGoals,
  joinChallenge,
  leaveChallenge,
  createChallenge,
  createGoal,
  shareAchievement,
  updateUserProgress,
  updateChallengeProgress,
  followUser,
  challengeUser,
  setAchievementFilter,
  setChallengeFilter,
  setLeaderboardFilter,
  setProgressTimeframe,
  updateUserStatsRealtime,
  updateChallengeProgressRealtime,
  updateLeaderboardRealtime,
  markAchievementAsViewed,
  clearError,
  resetGamificationState,
  selectUserStats,
  selectAchievements,
  selectUnlockedAchievements,
  selectActiveChallenges,
  selectAvailableChallenges,
  selectCompletedChallenges,
  selectLeaderboard,
  selectCurrentUserRank,
  selectProgressData,
  selectMilestones,
  selectGoals,
  selectGamificationLoading,
  selectGamificationError,
  selectGamificationFilters,
  selectFilteredAchievements,
  selectFilteredChallenges
} from '../../redux/slices/gamificationSlice';

// Component Types
export type {
  Achievement,
  Challenge,
  LeaderboardUser,
  UserStats,
  ProgressData,
  Milestone,
  Goal,
  GamificationState,
  AdvancedGamificationHubProps,
  GamificationHubProps,
  AchievementShowcaseProps,
  ChallengeCenterProps,
  LeaderboardWidgetProps,
  ProgressTrackerProps,
  GamificationCardProps,
  AnimatedButtonProps,
  TabNavigationProps,
  ChallengeTypeSelectorProps,
  DifficultySliderProps
} from './AdvancedGamificationHub';

export type {
  CategoryFilter,
  RarityFilter,
  ChallengeFilter,
  LeaderboardTimeframe,
  LeaderboardCategory,
  ProgressTimeframe,
  MetricType
} from './components';

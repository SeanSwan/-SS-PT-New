/**
 * 🎮 GAMIFICATION COMPONENTS - INDEX EXPORTS
 * ==========================================
 * Central export file for all gamification components,
 * making it easy to import and use throughout the application
 */

// Main Components
export { GamificationHub } from './GamificationHub';
export { AchievementShowcase } from './AchievementShowcase';
export { ChallengeCenter } from './ChallengeCenter';
export { LeaderboardWidget } from './LeaderboardWidget';
export { ProgressTracker } from './ProgressTracker';

// Shared Components (re-export for convenience)
export { GamificationCard } from '../shared/GamificationCard';
export { AnimatedButton } from '../shared/AnimatedButton';
export { TabNavigation } from '../shared/TabNavigation';
export { ChallengeTypeSelector } from '../shared/FormComponents/ChallengeTypeSelector';
export { DifficultySlider } from '../shared/FormComponents/DifficultySlider';

// Types (for external use)
export type {
  Achievement,
  Challenge,
  LeaderboardUser,
  UserStats,
  ProgressData,
  Milestone,
  Goal,
  GamificationHubProps,
  AchievementShowcaseProps,
  ChallengeCenterProps,
  LeaderboardWidgetProps,
  ProgressTrackerProps
} from './GamificationHub';

export type {
  CategoryFilter,
  RarityFilter
} from './AchievementShowcase';

export type {
  ChallengeFilter,
  CategoryFilter as ChallengeCategoryFilter
} from './ChallengeCenter';

export type {
  LeaderboardTimeframe,
  LeaderboardCategory
} from './LeaderboardWidget';

export type {
  ProgressTimeframe,
  MetricType
} from './ProgressTracker';

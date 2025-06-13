/**
 * index-optimized.ts
 * ===================
 * 
 * Optimized Export Index for Trainer Dashboard Components
 * Clean, organized exports for the modular trainer dashboard architecture
 * 
 * Key Improvements:
 * - Tree-shaking friendly exports
 * - Logical component grouping
 * - Clear naming conventions
 * - Type-safe exports
 */

// === MAIN COMPONENTS ===
export { default as StellarTrainerDashboard } from './StellarTrainerDashboard-optimized';
export { default as TrainerStellarSidebar } from './TrainerStellarSidebar';

// === MODULAR SECTION COMPONENTS ===
export { default as TrainingOverview } from './TrainingOverview-optimized';
export { default as ClientManagement } from './ClientManagement-optimized';
export { default as ContentStudio } from './ContentStudio-optimized';

// === SHARED COMPONENTS ===
export {
  StellarSection,
  StellarSectionHeader,
  StellarSectionTitle,
  ContentGrid,
  SearchContainer,
  LoadingState,
  LoadingSpinner,
  LoadingText,
  EmptyState,
  ErrorState,
  AnimatedGradientText,
  getInitials,
  formatTimeAgo,
  formatDuration
} from './TrainerSharedComponents-optimized';

// === STATISTICS COMPONENTS ===
export {
  StatsGrid,
  StatCard,
  StatIcon,
  StatContent,
  StatValue,
  StatLabel,
  StatTrend,
  StatItem,
  TrainerStatsGrid as StatsGrid,
  CompactStatCard
} from './TrainerStats-optimized';

// === TYPE EXPORTS (for TypeScript support) ===
export type { default as TrainingOverviewProps } from './TrainingOverview-optimized';
export type { default as ClientManagementProps } from './ClientManagement-optimized';
export type { default as ContentStudioProps } from './ContentStudio-optimized';
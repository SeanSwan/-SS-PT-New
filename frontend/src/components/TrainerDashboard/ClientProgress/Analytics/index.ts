// Enhanced Analytics Components for Client Progress Dashboard
export { default as ComparisonAnalytics } from './ComparisonAnalytics';
export { default as InjuryRiskAssessment } from './InjuryRiskAssessment';
export { default as GoalProgressTracker } from './GoalProgressTracker';

// Export proper type definitions
export type {
  ClientData,
  WorkoutHistoryEntry,
  ComparisonData,
  ComparisonMetric,
  AnalyticsInsight,
  GoalUpdate,
  ComparisonAnalyticsProps,
  InjuryRiskAssessmentProps,
  GoalProgressTrackerProps
} from './types';

// Legacy interfaces (deprecated - use types from ./types.ts instead)
export interface AnalyticsProps {
  clientId: string;
  clientData: any;
  workoutHistory?: any[];
  comparisonData?: any;
}

export interface GoalUpdateHandler {
  (goalId: string, update: any): void;
}
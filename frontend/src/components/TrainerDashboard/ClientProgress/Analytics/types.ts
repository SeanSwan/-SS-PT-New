// Enhanced Analytics Type Definitions for Client Progress Dashboard
// This file provides proper TypeScript interfaces to replace 'any' types

export interface ClientData {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  photo?: string;
  startDate: string;
  totalSessions: number;
  completedSessions: number;
  riskLevel: 'low' | 'medium' | 'high';
  primaryGoals: string[];
  lastAssessment: string;
  progressMetrics: {
    strength: number;
    cardio: number;
    flexibility: number;
    balance: number;
    stability: number;
  };
}

export interface WorkoutHistoryEntry {
  date: string;
  type: string;
  duration: number;
  intensity: number;
  exercises?: string[];
  notes?: string;
}

export interface ComparisonData {
  comparisonType: 'average' | 'clients' | 'historical' | 'goals';
  title: string;
  subtitle: string;
  metrics: ComparisonMetric[];
  insights: AnalyticsInsight[];
}

export interface ComparisonMetric {
  name: string;
  client: number;
  comparison: number;
  percentile?: number;
  trend: 'above' | 'below' | 'equal' | 'approaching' | 'in-progress';
  improvement: string;
  target?: string;
  current?: string;
}

export interface AnalyticsInsight {
  type: 'success' | 'warning' | 'info' | 'error';
  title: string;
  description: string;
  recommendation: string;
}

export interface GoalUpdate {
  progress?: number;
  currentValue?: number;
  status?: 'active' | 'completed' | 'paused' | 'overdue';
  notes?: string;
  milestones?: any[];
}

// Component Props Interfaces
export interface ComparisonAnalyticsProps {
  clientId: string;
  clientData: ClientData;
  comparisonData?: ComparisonData;
}

export interface InjuryRiskAssessmentProps {
  clientId: string;
  clientData: ClientData;
  workoutHistory: WorkoutHistoryEntry[];
}

export interface GoalProgressTrackerProps {
  clientId: string;
  clientData: ClientData;
  onGoalUpdate?: (goalId: string, update: GoalUpdate) => void;
}
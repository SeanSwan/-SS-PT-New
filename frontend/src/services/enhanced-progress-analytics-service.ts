// services/enhanced-progress-analytics-service.ts
import { AxiosInstance } from 'axios';
import { ClientProgressServiceInterface, createClientProgressService } from './client-progress-service';
import { logger } from '@/utils/logger';

export type { ClientProgressData } from './client-progress-service';

// Enhanced analytics interfaces
export interface ComparisonData {
  comparisonType: 'average' | 'clients' | 'historical' | 'goals';
  metrics: ComparisonMetric[];
  insights: AnalyticsInsight[];
  timeframe: string;
}

export interface ComparisonMetric {
  name: string;
  client: number;
  comparison: number;
  percentile?: number;
  trend: 'above' | 'below' | 'equal' | 'approaching';
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

export interface InjuryRiskData {
  overallRisk: 'low' | 'medium' | 'high';
  riskScore: number;
  lastAssessment: string;
  categories: RiskCategory[];
  criticalAlerts: CriticalAlert[];
  recommendations: RecommendationCategory[];
  correctiveProtocol: CorrectiveProtocol;
}

export interface RiskCategory {
  id: string;
  name: string;
  risk: 'low' | 'medium' | 'high';
  score: number;
  icon: string;
  findings: RiskFinding[];
}

export interface RiskFinding {
  pattern: string;
  status: 'good' | 'attention' | 'caution';
  notes: string;
  recommendation: string;
}

export interface CriticalAlert {
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  action: string;
  timeframe: string;
}

export interface RecommendationCategory {
  category: string;
  items: string[];
}

export interface CorrectiveProtocol {
  inhibit: CorrectiveExercise[];
  lengthen: CorrectiveExercise[];
  activate: CorrectiveExercise[];
  integrate: CorrectiveExercise[];
}

export interface CorrectiveExercise {
  muscle: string;
  exercise: string;
  duration?: string;
  reps?: string;
  frequency: string;
}

export interface GoalData {
  id: string;
  title: string;
  category: string;
  type: 'measurable' | 'performance' | 'behavioral';
  status: 'active' | 'completed' | 'paused' | 'overdue';
  priority: 'high' | 'medium' | 'low';
  progress: number;
  startDate: string;
  targetDate: string;
  completedDate?: string;
  currentValue: number;
  targetValue: number;
  unit: string;
  milestones: GoalMilestone[];
  progressHistory: ProgressPoint[];
  insights: GoalInsights;
}

export interface GoalMilestone {
  id: string;
  title: string;
  target: number;
  current: number;
  completed: boolean;
  date?: string;
  estimatedDate?: string;
}

export interface ProgressPoint {
  date: string;
  value: number;
}

export interface GoalInsights {
  trend: 'positive' | 'negative' | 'stalled' | 'achieved' | 'approaching';
  predictedCompletion: string;
  likelihood: number;
  weeklyRate?: number;
  completedAhead?: number;
  recommendation: string;
}

export interface GoalTrackingData {
  summary: GoalSummary;
  goals: GoalData[];
  achievements: Achievement[];
}

export interface GoalSummary {
  totalGoals: number;
  activeGoals: number;
  completedGoals: number;
  overdueGoals: number;
  averageProgress: number;
  onTrackGoals: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  earned: boolean;
  date?: string;
  progress?: number;
  icon: string;
}

export interface WorkoutHistoryEntry {
  date: string;
  type: string;
  duration: number;
  intensity: number | null;
  exercises?: string[];
  notes?: string;
}

// Enhanced service interface
export interface EnhancedProgressAnalyticsService extends ClientProgressServiceInterface {
  getComparisonAnalytics: (clientId: string, comparisonType: string, timeframe: string) => Promise<ComparisonData>;
  getInjuryRiskAssessment: (clientId: string) => Promise<InjuryRiskData>;
  getGoalTrackingData: (clientId: string) => Promise<GoalTrackingData>;
  updateGoal: (clientId: string, goalId: string, updates: Partial<GoalData>) => Promise<{ success: boolean; goal: GoalData }>;
  createGoal: (clientId: string, goalData: Partial<GoalData>) => Promise<{ success: boolean; goal: GoalData }>;
  getWorkoutHistory: (clientId: string, timeframe?: string) => Promise<WorkoutHistoryEntry[]>;
  generateProgressPredictions: (clientId: string) => Promise<any>;
}

function throwServiceError(context: string, error: unknown): never {
  const message = error instanceof Error ? error.message : String(error);
  logger.warn(`[EnhancedProgressAnalytics] ${context} failed:`, message);
  throw error instanceof Error ? error : new Error(message);
}

export const createEnhancedProgressAnalyticsService = (axios: AxiosInstance): EnhancedProgressAnalyticsService => {
  // Get base client progress service
  const baseService = createClientProgressService(axios);

  return {
    ...baseService,

    getComparisonAnalytics: async (clientId: string, comparisonType: string, timeframe: string) => {
      try {
        logger.log(`Fetching comparison analytics for client ${clientId}...`);
        const response = await axios.get(`/api/client-progress/${clientId}/comparison`, {
          params: { type: comparisonType, timeframe }
        });
        return response.data;
      } catch (error) {
        return throwServiceError('comparison analytics', error);
      }
    },

    getInjuryRiskAssessment: async (clientId: string) => {
      try {
        logger.log(`Fetching injury risk assessment for client ${clientId}...`);
        const response = await axios.get(`/api/client-progress/${clientId}/risk-assessment`);
        return response.data;
      } catch (error) {
        return throwServiceError('injury risk assessment', error);
      }
    },

    getGoalTrackingData: async (clientId: string) => {
      try {
        logger.log(`Fetching goal tracking data for client ${clientId}...`);
        const response = await axios.get(`/api/client-progress/${clientId}/goals`);
        return response.data;
      } catch (error) {
        return throwServiceError('goal tracking data', error);
      }
    },

    updateGoal: async (clientId: string, goalId: string, updates: Partial<GoalData>) => {
      try {
        logger.log(`Updating goal ${goalId} for client ${clientId}...`);
        const response = await axios.put(`/api/client-progress/${clientId}/goals/${goalId}`, updates);
        return response.data;
      } catch (error) {
        return throwServiceError('goal update', error);
      }
    },

    createGoal: async (clientId: string, goalData: Partial<GoalData>) => {
      try {
        logger.log(`Creating new goal for client ${clientId}...`);
        const response = await axios.post(`/api/client-progress/${clientId}/goals`, goalData);
        return response.data;
      } catch (error) {
        return throwServiceError('goal creation', error);
      }
    },

    getWorkoutHistory: async (clientId: string, timeframe = '3months') => {
      try {
        logger.log(`Fetching workout history for client ${clientId}...`);
        const response = await axios.get(`/api/client-progress/${clientId}/workout-history`, {
          params: { timeframe }
        });
        return Array.isArray(response.data) ? response.data : [];
      } catch (error) {
        // Honest empty state — do NOT fabricate history. Real trainer logs
        // must flow through the backend route; a failure here is a truth
        // signal, not a trigger for demo data.
        console.error('Error fetching workout history:', error);
        return [];
      }
    },

    generateProgressPredictions: async (clientId: string) => {
      try {
        logger.log(`Generating progress predictions for client ${clientId}...`);
        const response = await axios.get(`/api/client-progress/${clientId}/predictions`);
        return response.data;
      } catch (error) {
        return throwServiceError('progress predictions', error);
      }
    }
  };
};

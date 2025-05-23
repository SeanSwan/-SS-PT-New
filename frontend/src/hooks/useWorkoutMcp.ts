import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';

// Types for workout MCP integration
export interface Exercise {
  id: string;
  name: string;
  description: string;
  difficulty?: string;
  category?: string;
  exerciseType?: string;
  isRehabExercise?: boolean;
  optPhase?: string;
  muscleGroups?: { id: string; name: string; shortName: string; bodyRegion: string }[];
  equipment?: { id: string; name: string; category: string }[];
}

export interface SetData {
  setNumber: number;
  setType: string;
  repsGoal?: number;
  repsCompleted?: number;
  weightGoal?: number;
  weightUsed?: number;
  duration?: number;
  distance?: number;
  restGoal?: number;
  restTaken?: number;
  rpe?: number;
  tempo?: string;
  notes?: string;
  isPR?: boolean;
  completedAt?: string;
}

export interface WorkoutExercise {
  id?: string;
  exerciseId: string;
  orderInWorkout?: number;
  performanceRating?: number;
  difficultyRating?: number;
  painLevel?: number;
  formRating?: number;
  formNotes?: string;
  isRehabExercise?: boolean;
  notes?: string;
  startedAt?: string;
  completedAt?: string;
  sets?: SetData[];
  exercise?: Exercise;
}

export interface WorkoutSession {
  id?: string;
  userId: string;
  workoutPlanId?: string;
  title: string;
  description?: string;
  plannedStartTime?: string;
  startedAt?: string;
  completedAt?: string;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  duration?: number;
  caloriesBurned?: number;
  feelingRating?: number;
  intensityRating?: number;
  notes?: string;
  exercises?: WorkoutExercise[];
}

export interface ClientProgress {
  userId: string;
  strengthLevel: number;
  cardioLevel: number;
  flexibilityLevel: number;
  balanceLevel: number;
  coreLevel: number;
  totalWorkouts: number;
  totalSets: number;
  totalReps: number;
  totalWeight: number;
  totalExercises: number;
  lastWorkoutDate?: string;
  currentStreak: number;
  personalRecords?: Record<string, any>;
}

export interface WorkoutStatistics {
  totalWorkouts: number;
  totalDuration: number;
  totalExercises: number;
  totalSets: number;
  totalReps: number;
  totalWeight: number;
  averageIntensity: number;
  weekdayBreakdown: number[];
  exerciseBreakdown?: { exerciseId: string; name: string; count: number }[];
  muscleGroupBreakdown?: { muscleGroup: string; count: number }[];
  intensityTrends?: { date: string; intensity: number }[];
  recentWorkouts?: { id: string; title: string; date: string; duration: number }[];
}

export interface WorkoutPlanDayExercise {
  exerciseId: string;
  orderInWorkout?: number;
  setScheme?: string;
  repGoal?: string;
  restPeriod?: number;
  tempo?: string;
  intensityGuideline?: string;
  supersetGroup?: number;
  notes?: string;
  isOptional?: boolean;
  alternateExerciseId?: string;
}

export interface WorkoutPlanDay {
  dayNumber: number;
  name: string;
  focus?: string;
  dayType: string;
  optPhase?: string;
  notes?: string;
  warmupInstructions?: string;
  cooldownInstructions?: string;
  estimatedDuration?: number;
  sortOrder?: number;
  exercises?: WorkoutPlanDayExercise[];
}

export interface WorkoutPlan {
  id?: string;
  name: string;
  description?: string;
  trainerId: string;
  clientId: string;
  goal?: string;
  startDate?: string;
  endDate?: string;
  status: 'active' | 'completed' | 'archived';
  days?: WorkoutPlanDay[];
}

// MCP API base URL
const MCP_WORKOUT_API_URL = 'http://localhost:8000';

/**
 * Enhanced hook for Workout MCP integration
 * Provides comprehensive workout management functionality across all dashboard types
 */
export const useWorkoutMcp = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper function to make MCP API calls
  const callMcpTool = useCallback(async (toolName: string, inputData: any) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${MCP_WORKOUT_API_URL}/tools/${toolName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(inputData),
      });

      if (!response.ok) {
        throw new Error(`MCP API Error: ${response.status} - ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown MCP API error';
      setError(errorMessage);
      console.error(`MCP Tool ${toolName} error:`, err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get workout recommendations
  const getWorkoutRecommendations = useCallback(async (params: {
    userId: string;
    goal?: string;
    difficulty?: string;
    equipment?: string[];
    muscleGroups?: string[];
    excludeExercises?: string[];
    limit?: number;
    rehabFocus?: boolean;
    optPhase?: string;
  }) => {
    try {
      return await callMcpTool('GetWorkoutRecommendations', params);
    } catch (err) {
      console.warn('MCP call failed, using mock data for workout recommendations:', err);
      // Return mock data when MCP server is unavailable
      return {
        exercises: [
          {
            id: 'mock-1',
            name: 'Push-ups',
            description: 'Classic bodyweight exercise for chest and triceps',
            difficulty: 'beginner',
            category: 'strength',
            exerciseType: 'compound',
            muscleGroups: [{ id: 'chest', name: 'Chest', shortName: 'Chest', bodyRegion: 'upper_body' }]
          },
          {
            id: 'mock-2',
            name: 'Squats',
            description: 'Fundamental lower body exercise',
            difficulty: 'beginner',
            category: 'strength',
            exerciseType: 'compound',
            muscleGroups: [{ id: 'legs', name: 'Legs', shortName: 'Legs', bodyRegion: 'lower_body' }]
          }
        ].slice(0, params.limit || 10),
        message: 'Mock recommendations - MCP server unavailable'
      };
    }
  }, [callMcpTool]);

  // Get client progress
  const getClientProgress = useCallback(async (userId: string) => {
    try {
      return await callMcpTool('GetClientProgress', { userId });
    } catch (err) {
      console.warn('MCP call failed, using mock data for client progress:', err);
      return {
        progress: {
          userId,
          strengthLevel: 3,
          cardioLevel: 2,
          flexibilityLevel: 2,
          balanceLevel: 1,
          coreLevel: 3,
          totalWorkouts: 15,
          totalSets: 150,
          totalReps: 2250,
          totalWeight: 11250,
          totalExercises: 45,
          lastWorkoutDate: new Date().toISOString(),
          currentStreak: 3,
          personalRecords: {}
        },
        message: 'Mock progress data - MCP server unavailable'
      };
    }
  }, [callMcpTool]);

  // Get workout statistics
  const getWorkoutStatistics = useCallback(async (params: {
    userId: string;
    startDate?: string;
    endDate?: string;
    includeExerciseBreakdown?: boolean;
    includeMuscleGroupBreakdown?: boolean;
    includeWeekdayBreakdown?: boolean;
    includeIntensityTrends?: boolean;
  }) => {
    return callMcpTool('GetWorkoutStatistics', params);
  }, [callMcpTool]);

  // Log workout session
  const logWorkoutSession = useCallback(async (session: WorkoutSession) => {
    return callMcpTool('LogWorkoutSession', { session });
  }, [callMcpTool]);

  // Generate workout plan
  const generateWorkoutPlan = useCallback(async (params: {
    trainerId: string;
    clientId: string;
    name: string;
    description?: string;
    goal?: string;
    startDate?: string;
    endDate?: string;
    daysPerWeek: number;
    focusAreas?: string[];
    difficulty?: string;
    optPhase?: string;
    equipment?: string[];
  }) => {
    try {
      return await callMcpTool('GenerateWorkoutPlan', params);
    } catch (err) {
      console.warn('MCP call failed, using mock data for workout plan generation:', err);
      return {
        plan: {
          id: 'mock-plan-' + Date.now(),
          name: params.name,
          description: params.description || 'Mock generated workout plan',
          trainerId: params.trainerId,
          clientId: params.clientId,
          goal: params.goal || 'general',
          startDate: params.startDate || new Date().toISOString(),
          endDate: params.endDate || new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'active',
          days: Array.from({ length: params.daysPerWeek }, (_, i) => ({
            dayNumber: i + 1,
            name: `Day ${i + 1}: Full Body`,
            focus: 'full_body',
            dayType: 'training',
            exercises: [
              {
                exerciseId: 'mock-1',
                orderInWorkout: 1,
                setScheme: '3x10',
                repGoal: '10',
                restPeriod: 60
              },
              {
                exerciseId: 'mock-2',
                orderInWorkout: 2,
                setScheme: '3x12',
                repGoal: '12',
                restPeriod: 90
              }
            ]
          }))
        },
        message: 'Mock workout plan generated - MCP server unavailable'
      };
    }
  }, [callMcpTool]);

  // Get all available tools from MCP server
  const getMcpTools = useCallback(async () => {
    try {
      const response = await fetch(`${MCP_WORKOUT_API_URL}/tools`);
      if (!response.ok) {
        throw new Error(`Failed to fetch MCP tools: ${response.statusText}`);
      }
      return await response.json();
    } catch (err) {
      console.error('Error fetching MCP tools:', err);
      setError('Failed to connect to workout MCP server');
      return null;
    }
  }, []);

  // Check MCP server health
  const checkMcpHealth = useCallback(async () => {
    try {
      console.log('\n\n\n           GET', `${MCP_WORKOUT_API_URL}/health`);
      const response = await fetch(`${MCP_WORKOUT_API_URL}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // Add a timeout
        signal: AbortSignal.timeout(5000)
      });
      
      if (response.ok) {
        const healthData = await response.json();
        console.log('MCP server health check result:', healthData);
        setError(null); // Clear any previous errors
        return true;
      } else {
        console.error('MCP server returned non-ok status:', response.status, response.statusText);
        setError(`MCP server error: ${response.status} ${response.statusText}`);
        return false;
      }
    } catch (err) {
      console.error('MCP server health check failed:', err);
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          setError('MCP server timeout - server may be starting up');
        } else if (err.message.includes('Failed to fetch')) {
          setError('MCP server connection refused - ensure server is running on port 8000');
        } else {
          setError(`MCP server error: ${err.message}`);
        }
      } else {
        setError('Unknown MCP server error');
      }
      return false;
    }
  }, []);

  // Memoized object to prevent unnecessary re-renders
  const mcpApi = useMemo(() => ({
    getWorkoutRecommendations,
    getClientProgress,
    getWorkoutStatistics,
    logWorkoutSession,
    generateWorkoutPlan,
    getMcpTools,
    checkMcpHealth,
    loading,
    error,
    setError,
  }), [
    getWorkoutRecommendations,
    getClientProgress,
    getWorkoutStatistics,
    logWorkoutSession,
    generateWorkoutPlan,
    getMcpTools,
    checkMcpHealth,
    loading,
    error,
  ]);

  return mcpApi;
};

export default useWorkoutMcp;
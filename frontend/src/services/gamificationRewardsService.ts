/**
 * Gamification Rewards Service
 * ============================
 * Small authenticated service for awarding real SwanStudios gamification
 * rewards from app workflows. This intentionally targets the canonical
 * backend route instead of the retired MCP mock/fallback service.
 */

import apiService from './api.service';

export interface RecordWorkoutCompletionPayload {
  userId: string;
  workoutId: string;
  duration: number;
  exercisesCompleted?: number;
  caloriesBurned?: number;
  notes?: string;
}

export interface RecordWorkoutCompletionResponse {
  success: boolean;
  message?: string;
  points?: number;
  pointsAwarded?: number;
  newBalance?: number;
  newTotal?: number;
  achievement?: {
    title: string;
    points?: number;
  };
  levelUp?: boolean;
  newLevel?: number;
  awardedMilestones?: unknown[];
  streakDays?: number;
  totalWorkouts?: number;
}

export const gamificationRewardsService = {
  async recordWorkoutCompletion(
    payload: RecordWorkoutCompletionPayload
  ): Promise<RecordWorkoutCompletionResponse> {
    const response = await apiService.post<RecordWorkoutCompletionResponse>(
      '/api/gamification/record-workout',
      payload
    );

    return {
      ...response.data,
      newTotal: response.data.newTotal ?? response.data.newBalance
    };
  }
};

export default gamificationRewardsService;

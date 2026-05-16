/**
 * Workout intelligence API service.
 *
 * Legacy file name retained for existing imports. The implementation now uses
 * SwanStudios REST APIs instead of retired MCP server routes.
 */

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? '' : 'http://localhost:10000');

const workoutApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

workoutApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

const formatRecommendations = (recommendations = [], options = {}) => {
  if (!recommendations.length) {
    return [
      '# Workout Plan Draft',
      '',
      'No generated recommendations were returned by the workout API.',
      'Adjust the selected focus areas, equipment, or duration and try again.'
    ].join('\n');
  }

  return recommendations.map((workout, index) => {
    const exercises = workout.exercises || [];
    return [
      `## ${index + 1}. ${workout.name || options.workoutType || 'Workout Session'}`,
      '',
      workout.description || 'API-generated workout recommendation.',
      '',
      `Duration: ${workout.duration || options.sessionDuration || 60} minutes`,
      `Difficulty: ${workout.difficulty || options.intensity || 'moderate'}`,
      '',
      ...exercises.map((exercise, exerciseIndex) => (
        `${exerciseIndex + 1}. ${exercise.name || 'Exercise'} - ${exercise.sets || 3} sets x ${exercise.reps || '8-12 reps'}`
      ))
    ].join('\n');
  }).join('\n\n');
};

const MCPService = {
  generateWorkoutPlan: async (clientData, options = {}) => {
    const response = await workoutApi.post('/api/workout/recommendations', {
      userId: clientData?.id,
      client: clientData,
      focus: options.focusAreas,
      workoutType: options.workoutType,
      duration: options.sessionDuration,
      intensity: options.intensity,
      equipment: options.includeEquipment,
      excludeEquipment: options.excludeEquipment,
      notes: options.additionalNotes
    });

    const data = response.data?.data || response.data || {};
    const recommendations = data.recommendations || data.workouts || [];

    return {
      workoutPlan: data.content || data.workoutPlan || formatRecommendations(recommendations, options),
      metadata: {
        generatedAt: new Date().toISOString(),
        modelUsed: data.modelUsed || 'swanstudios-workout-api',
        clientId: clientData?.id,
        options
      }
    };
  },

  analyzeClientProgress: async (clientData) => {
    const response = await workoutApi.get(`/api/client/analytics/dashboard/${clientData.id}`);
    const data = response.data?.data || response.data || {};

    return {
      analysis: data.summary || data.analysis || 'No progress analysis is available yet.',
      metadata: {
        generatedAt: new Date().toISOString(),
        modelUsed: 'swanstudios-analytics-api',
        clientId: clientData.id
      }
    };
  },

  generateExerciseAlternatives: async (exercises, restrictions) => ({
    alternatives: exercises.map((exercise) => ({
      original: exercise.name || exercise,
      note: 'Use the active exercise library for approved substitutions.',
      restrictions
    })),
    metadata: {
      generatedAt: new Date().toISOString(),
      modelUsed: 'swanstudios-workout-api',
      originalExercises: exercises.map((exercise) => exercise.name || exercise)
    }
  }),

  generateNutritionPlan: async () => ({
    nutritionPlan: 'Nutrition planning is handled by the active nutrition workspace and macro APIs.',
    metadata: {
      generatedAt: new Date().toISOString(),
      modelUsed: 'swanstudios-nutrition-api'
    }
  }),

  checkServerStatus: async () => {
    try {
      const response = await workoutApi.get('/api/health');
      return response.status >= 200 && response.status < 500;
    } catch {
      return false;
    }
  }
};

export default MCPService;

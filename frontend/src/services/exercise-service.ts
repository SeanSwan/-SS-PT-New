// services/exercise-service.ts
import { AxiosInstance } from 'axios';
import { logger } from '@/utils/logger';

// Define Exercise interface
export interface Exercise {
  id: string;
  name: string;
  description: string;
  exerciseType: string;
  difficulty: number;
  recommendedSets?: number;
  recommendedReps?: number;
  recommendedDuration?: number; // in seconds
  primaryMuscles: string[];
  secondaryMuscles: string[];
  equipment: string[];
  videoUrl?: string | null;
  imageUrl?: string | null;
  instructions: string[];
  isFeatured: boolean;
  nasmCategory?: string;
}

// Response interfaces
export interface RecommendedExercisesResponse {
  success: boolean;
  message?: string;
  recommendedExercises: Exercise[];
  focusCategories: string[];
}

export interface SingleExerciseResponse {
  success: boolean;
  message?: string;
  exercise: Exercise;
}

export interface ExercisesListResponse {
  success: boolean;
  message?: string;
  exercises: Exercise[];
}

// Service interface
export interface ExerciseServiceInterface {
  getRecommendedExercises: (clientId?: string) => Promise<RecommendedExercisesResponse>;
  getExerciseById: (id: string) => Promise<SingleExerciseResponse>;
  getExercisesByType: (type: string) => Promise<ExercisesListResponse>;
  getExercisesByMuscleGroup: (muscleGroup: string) => Promise<ExercisesListResponse>;
  searchExercises: (query: string) => Promise<ExercisesListResponse>;
}

// Create service
export const createExerciseService = (axios: AxiosInstance): ExerciseServiceInterface => {
  return {
    getRecommendedExercises: async (clientId?: string) => {
      try {
        logger.log(`Fetching recommended exercises from API${clientId ? ` for client ${clientId}` : ''}...`);
        const url = clientId ? `/api/exercises/recommended/${clientId}` : '/api/exercises/recommended';
        const response = await axios.get<RecommendedExercisesResponse>(url);
        
        if (response.data && response.data.success) {
          logger.log(`Received ${response.data.recommendedExercises.length} recommended exercises`);
          return response.data;
        } else {
          throw new Error('Invalid API response format');
        }
      } catch (error) {
        console.error('Error fetching recommended exercises:', error);
        return {
          success: false,
          message: 'Recommended exercises are unavailable.',
          recommendedExercises: [],
          focusCategories: []
        };
      }
    },
    
    getExerciseById: async (id: string) => {
      try {
        const response = await axios.get<SingleExerciseResponse>(`/api/exercises/${id}`);
        return response.data;
      } catch (error) {
        console.error(`Error fetching exercise with ID ${id}:`, error);
        // Since we can't easily generate a specific exercise without knowing the ID details,
        // re-throw the error or provide a basic fallback
        throw error;
      }
    },
    
    getExercisesByType: async (type: string) => {
      try {
        const response = await axios.get<ExercisesListResponse>(`/api/exercises/type/${type}`);
        return response.data;
      } catch (error) {
        console.error(`Error fetching exercises by type ${type}:`, error);
        return {
          success: false,
          message: 'Exercises are unavailable.',
          exercises: []
        };
      }
    },
    
    getExercisesByMuscleGroup: async (muscleGroup: string) => {
      try {
        const response = await axios.get<ExercisesListResponse>(`/api/exercises/muscle/${muscleGroup}`);
        return response.data;
      } catch (error) {
        console.error(`Error fetching exercises by muscle group ${muscleGroup}:`, error);
        return {
          success: false,
          message: 'Exercises are unavailable.',
          exercises: []
        };
      }
    },
    
    searchExercises: async (query: string) => {
      try {
        const response = await axios.get<ExercisesListResponse>(`/api/exercises/search?q=${encodeURIComponent(query)}`);
        return response.data;
      } catch (error) {
        console.error(`Error searching exercises with query "${query}":`, error);
        return {
          success: false,
          message: 'Exercise search is unavailable.',
          exercises: []
        };
      }
    }
  };
};

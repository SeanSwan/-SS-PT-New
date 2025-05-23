// services/exercise-service.ts
import { AxiosInstance } from 'axios';

export interface Exercise {
  id: string;
  name: string;
  description: string;
  instructions: string;
  videoUrl?: string;
  imageUrl?: string;
  exerciseType: string;
  primaryMuscles: string[];
  secondaryMuscles?: string[];
  difficulty: number;
  progressionPath?: string[];
  prerequisites?: string[];
  equipmentNeeded?: string[];
  canBePerformedAtHome: boolean;
  contraindicationNotes?: string;
  safetyTips?: string;
  recommendedSets?: number;
  recommendedReps?: number;
  recommendedDuration?: number;
  restInterval?: number;
  scientificReferences?: string[];
  unlockLevel: number;
  experiencePointsEarned: number;
  isActive: boolean;
  isPopular: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ExercisesResponse {
  success: boolean;
  count: number;
  exercises: Exercise[];
}

export interface ExerciseResponse {
  success: boolean;
  exercise: Exercise;
}

export interface RecommendedExercisesResponse {
  success: boolean;
  focusCategories: string[];
  recommendedExercises: Exercise[];
  keyExercises?: {
    squats: Exercise[];
    lunges: Exercise[];
    planks: Exercise[];
    reversePlanks: Exercise[];
  };
}

export interface ExercisesByMuscleResponse {
  success: boolean;
  count: number;
  muscleGroup: string;
  exercises: Exercise[];
}

export interface ExerciseProgressionResponse {
  success: boolean;
  exercise: Exercise;
  prerequisites: Exercise[];
  nextExercises: Exercise[];
  progressionPath: Exercise[];
}

export interface ExerciseServiceInterface {
  getAllExercises: (params?: {
    type?: string;
    primaryMuscle?: string;
    difficulty?: string;
    search?: string;
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
  }) => Promise<ExercisesResponse>;
  
  getExerciseById: (id: string) => Promise<ExerciseResponse>;
  
  createExercise: (exerciseData: Omit<Exercise, 'id' | 'createdAt' | 'updatedAt'>) => Promise<ExerciseResponse>;
  
  updateExercise: (id: string, updates: Partial<Exercise>) => Promise<ExerciseResponse>;
  
  deleteExercise: (id: string) => Promise<{ success: boolean; message: string }>;
  
  getExercisesByType: (exerciseType: string) => Promise<ExercisesResponse>;
  
  getRecommendedExercises: (userId?: string) => Promise<RecommendedExercisesResponse>;
  
  getExercisesByMuscle: (muscleGroup: string) => Promise<ExercisesByMuscleResponse>;
  
  getKeyExercises: () => Promise<{ success: boolean; keyExercises: { squats: Exercise[]; lunges: Exercise[]; planks: Exercise[]; reversePlanks: Exercise[] } }>;
  
  getExerciseProgression: (exerciseId: string) => Promise<ExerciseProgressionResponse>;
}

export const createExerciseService = (axios: AxiosInstance): ExerciseServiceInterface => {
  return {
    getAllExercises: async (params = {}) => {
      try {
        const response = await axios.get<ExercisesResponse>('/api/exercises', { params });
        return response.data;
      } catch (error) {
        console.error('Error fetching exercises:', error);
        throw error;
      }
    },
    
    getExerciseById: async (id: string) => {
      try {
        const response = await axios.get<ExerciseResponse>(`/api/exercises/${id}`);
        return response.data;
      } catch (error) {
        console.error(`Error fetching exercise ${id}:`, error);
        throw error;
      }
    },
    
    createExercise: async (exerciseData) => {
      try {
        const response = await axios.post<ExerciseResponse>('/api/exercises', exerciseData);
        return response.data;
      } catch (error) {
        console.error('Error creating exercise:', error);
        throw error;
      }
    },
    
    updateExercise: async (id: string, updates) => {
      try {
        const response = await axios.put<ExerciseResponse>(`/api/exercises/${id}`, updates);
        return response.data;
      } catch (error) {
        console.error(`Error updating exercise ${id}:`, error);
        throw error;
      }
    },
    
    deleteExercise: async (id: string) => {
      try {
        const response = await axios.delete<{ success: boolean; message: string }>(`/api/exercises/${id}`);
        return response.data;
      } catch (error) {
        console.error(`Error deleting exercise ${id}:`, error);
        throw error;
      }
    },
    
    getExercisesByType: async (exerciseType: string) => {
      try {
        const response = await axios.get<ExercisesResponse>(`/api/exercises/type/${exerciseType}`);
        return response.data;
      } catch (error) {
        console.error(`Error fetching exercises by type ${exerciseType}:`, error);
        throw error;
      }
    },
    
    getRecommendedExercises: async (userId?: string) => {
      try {
        const url = userId ? `/api/exercises/recommended/${userId}` : '/api/exercises/recommended';
        const response = await axios.get<RecommendedExercisesResponse>(url);
        return response.data;
      } catch (error) {
        console.error('Error fetching recommended exercises:', error);
        throw error;
      }
    },
    
    getExercisesByMuscle: async (muscleGroup: string) => {
      try {
        const response = await axios.get<ExercisesByMuscleResponse>(`/api/exercises/muscle/${muscleGroup}`);
        return response.data;
      } catch (error) {
        console.error(`Error fetching exercises for muscle group ${muscleGroup}:`, error);
        throw error;
      }
    },
    
    getKeyExercises: async () => {
      try {
        const response = await axios.get<{ success: boolean; keyExercises: { squats: Exercise[]; lunges: Exercise[]; planks: Exercise[]; reversePlanks: Exercise[] } }>('/api/exercises/key-exercises');
        return response.data;
      } catch (error) {
        console.error('Error fetching key exercises:', error);
        throw error;
      }
    },
    
    getExerciseProgression: async (exerciseId: string) => {
      try {
        const response = await axios.get<ExerciseProgressionResponse>(`/api/exercises/progression/${exerciseId}`);
        return response.data;
      } catch (error) {
        console.error(`Error fetching progression for exercise ${exerciseId}:`, error);
        throw error;
      }
    }
  };
};

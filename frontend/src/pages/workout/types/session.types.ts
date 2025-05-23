/**
 * Session Types
 * ============
 * Type definitions for workout sessions
 */

// Workout set type
export interface WorkoutSet {
  setNumber: number;
  weight: number;
  reps: number;
  notes: string;
}

// Exercise within a workout session
export interface SessionExercise {
  id: string;
  name: string;
  muscleGroups: string[];
  sets: WorkoutSet[];
}

// Complete workout session type
export interface WorkoutSession {
  id: string;
  userId: string;
  title: string;
  date: string;
  duration: number; // in minutes
  intensity: number; // 1-10 scale
  exercises: SessionExercise[];
  notes: string;
  totalWeight: number;
  totalReps: number;
  totalSets: number;
}

// Response types for API calls
export interface WorkoutSessionResponse {
  session: WorkoutSession;
}

export interface WorkoutSessionsResponse {
  sessions: WorkoutSession[];
  totalCount: number;
}

// Parameters for fetching workout sessions
export interface FetchSessionsParams {
  userId: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  startDate?: string;
  endDate?: string;
  searchTerm?: string;
}

// Parameters for creating/updating a session
export interface SaveSessionParams {
  sessionId?: string; // If updating an existing session
  session: Omit<WorkoutSession, 'id'>;
}

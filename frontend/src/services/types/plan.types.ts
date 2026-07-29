/**
 * Plan Types
 * =========
 * Type definitions for workout plans
 */

// Workout plan exercise type
export interface PlanExercise {
  id: string;
  name: string;
  sets: number;
  reps: string;
  rest: number;
  notes: string;
}

// Workout plan day type
export interface PlanDay {
  dayNumber: number;
  title: string;
  exercises: PlanExercise[];
}

// Complete workout plan type
export interface WorkoutPlan {
  id: string;
  userId: string;
  title: string;
  description: string;
  durationWeeks: number;
  createdAt: string;
  updatedAt: string;
  status: 'active' | 'archived' | 'draft';
  tags: string[];
  days: PlanDay[];
}

// Response types for API calls
export interface WorkoutPlanResponse {
  plan: WorkoutPlan;
}

export interface WorkoutPlansResponse {
  plans: WorkoutPlan[];
  totalCount: number;
}

// Parameters for fetching workout plans
export interface FetchPlansParams {
  userId: string;
  status?: 'active' | 'archived' | 'draft' | 'all';
  page?: number;
  limit?: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  searchTerm?: string;
}

// Parameters for creating/updating a plan
export interface SavePlanParams {
  planId?: string; // If updating an existing plan
  plan: Omit<WorkoutPlan, 'id' | 'createdAt' | 'updatedAt'>;
}

// Parameters for creating a plan from an existing one
export interface ClonePlanParams {
  sourcePlanId: string;
  overrides?: {
    title?: string;
    description?: string;
    durationWeeks?: number;
  };
}

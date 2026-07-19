/**
 * NASM Workout Tracking API Service
 * =================================
 * 
 * Comprehensive API service for the NASM Workout Tracking System.
 * Handles client-trainer assignments, permissions, and workout form management.
 * 
 * Core Features:
 * - Client-trainer assignment operations
 * - Trainer permission management
 * - Daily workout form submission and retrieval
 * - Progress data fetching for charts
 * - Statistics and analytics endpoints
 * 
 * Part of the NASM Workout Tracking System - Phase 2.3: Core Components
 * Designed for SwanStudios Platform - Production Ready
 */

import apiService from './api.service';
import type { HandoffData } from '../components/WorkoutLogger/handoff/workoutHandoff.types';

// ==================== TYPE DEFINITIONS ====================

export interface ClientTrainerAssignment {
  id: number;
  clientId: number;
  trainerId: number;
  assignedBy: number;
  status: 'active' | 'inactive' | 'pending';
  notes?: string;
  assignedAt: string;
  createdAt: string;
  updatedAt: string;
  client?: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    availableSessions?: number;
  };
  trainer?: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  };
  assignedByUser?: {
    id: number;
    firstName: string;
    lastName: string;
  };
}

export interface TrainerPermission {
  id: number;
  trainerId: number;
  permissionType: 'edit_workouts' | 'view_progress' | 'manage_clients' | 'access_nutrition' | 'modify_schedules' | 'view_analytics';
  grantedBy: number;
  isActive: boolean;
  expiresAt?: string;
  grantedAt: string;
  revokedAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  trainer?: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  };
  grantedByUser?: {
    id: number;
    firstName: string;
    lastName: string;
  };
}

export interface TrainerDirectoryUser {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role?: 'trainer' | 'admin';
}

export interface ExerciseSet {
  loggerSetId?: string; // UI-only stable row id; stripped before API submit.
  setNumber: number;
  weight: number;
  reps: number;
  // Phase 16 (2026-04-16): rating fields nullable. null = "not rated".
  // Frontend omits these keys from the wire payload when null; backend
  // accepts both missing and explicit null and persists as DB null.
  rpe: number | null; // 1-10, null = not rated
  tempo?: string;
  restTime: number;
  formQuality: number | null; // 1-5, null = not rated
  notes?: string;
}

export interface ExerciseEntry {
  loggerExerciseId?: string; // UI-only stable row id; stripped before API submit.
  exerciseId: string;
  exerciseName: string;
  sets: ExerciseSet[];
  // Phase 16: null = not rated.
  formRating: number | null; // 1-5, null = not rated
  painLevel: number; // 0-10 (kept as number, painLevel null-honesty deferred to Phase 16.1)
  // Phase 3c.2: contiguous 1..N superset run id (null = ungrouped) — recorded
  // into formData so supersets are loggable, not display-only.
  supersetGroup?: number | null;
  performanceNotes?: string;
  category?: string;
  exerciseFamily?: string;
  movementPattern?: string;
  nasmMovementPattern?: string;
  bodyPartCategory?: string;
  muscleGroups?: string[];
  tags?: string[];
}

export interface PlannedWorkoutAssignmentMetadata {
  assignmentId?: string;
  assignmentKey: string;
  planId: string;
  assignmentType: 'homework' | 'active_recovery' | 'trainer_session' | string;
  source: 'workout_plan';
  isBillable: boolean;
  shouldDeductSession: boolean;
  status?: string;
  sessionType?: string;
  title?: string;
  scheduledDate?: string;
  weekNumber: number;
  dayNumber: number;
  dayLabel?: string;
  exerciseCount?: number;
  firstExerciseName?: string;
}

export interface DailyWorkoutFormSubmitSet {
  setNumber?: number;
  weight: number;
  reps: number;
  tempo?: string;
  restTime?: number;
  notes?: string;
  rpe?: number;
  formQuality?: number;
}

export interface DailyWorkoutFormSubmitExercise {
  exerciseId?: string;
  exerciseName: string;
  painLevel?: number;
  performanceNotes?: string;
  sets: DailyWorkoutFormSubmitSet[];
  formRating?: number;
}

export interface DailyWorkoutFormSubmitPayload {
  clientId: number;
  date: string;
  exercises: DailyWorkoutFormSubmitExercise[];
  scheduledSessionId?: string;
  equipmentProfileId?: number;
  sessionNotes?: string;
  // Phase 16 (2026-04-16): nullable on the wire. WorkoutLogger omits this
  // field from the payload when the user has not rated; the key is
  // simply absent rather than serialized as `null`. Backend contract
  // accepts either shape and persists DB null.
  overallIntensity?: number | null;
  plannedAssignment?: PlannedWorkoutAssignmentMetadata;
}

export interface WorkoutSessionBillingReceipt {
  status: 'deducted' | 'not_deducted' | 'previously_deducted' | string;
  shouldDeduct: boolean;
  sessionDeducted: boolean;
  creditsDeducted: number;
  creditsRequired: number;
  remainingSessions: number | null;
}

export interface ChallengeProgressImpactUpdate {
  challengeId: string | null;
  title: string;
  delta: number;
  progressUnit: string;
  currentProgress: number;
  progressPercentage: number;
  completed: boolean;
  xpEarned: number;
  assignedSessionOnly?: boolean;
  assignedSession?: boolean;
}

export interface ChallengeProgressImpactReceipt {
  status: 'processed' | 'failed' | string;
  updatedCount: number;
  skippedCount: number;
  headline: string | null;
  updates: ChallengeProgressImpactUpdate[];
}

/** Launch charter 4a: one server-detected PR (or first-lift baseline). */
export interface WorkoutPrEvent {
  exerciseName: string;
  metric: 'weight' | 'est1rm';
  value: number;
  previous: number | null;
  first: boolean;
}

export interface DailyWorkoutForm {
  id: string;
  formId?: string;
  sessionId?: string;
  clientId: number;
  trainerId: number;
  date: string;
  sessionDeducted: boolean;
  formData: {
    exercises: ExerciseEntry[];
    sessionNotes: string;
    // Phase 16 (2026-04-16): nullable / optional. When the logger did not
    // record an overall intensity, this key is omitted from formData.
    overallIntensity?: number | null;
    equipmentProfileId?: number;
    plannedAssignment?: PlannedWorkoutAssignmentMetadata;
    submittedBy: number;
    submittedAt: string;
    totalSets?: number;
    estimatedDuration?: number;
  };
  totalPointsEarned: number;
  mcpProcessed: boolean;
  billing?: WorkoutSessionBillingReceipt;
  challengeProgress?: ChallengeProgressImpactReceipt;
  /** Launch charter 4a: server-detected personal records from THIS save. */
  prEvents?: WorkoutPrEvent[];
  /**
   * Post-Save Handoff payload (Slice-2). Server-assembled AFTER commit, best-effort — null when the
   * feature flag is off or the save produced no chartable proof. The API returns it as a TOP-LEVEL
   * sibling of `form`; submitWorkoutForm re-attaches it here. Client-only fields (e.g. pendingSync)
   * are injected by the shell, never by the server.
   */
  handoff?: HandoffData | null;
  submittedAt: string;
  mcpProcessedAt?: string;
  processingErrors?: any;
  createdAt: string;
  updatedAt: string;
  client?: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  };
  trainer?: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface ProgressData {
  categories: {
    category: string;
    level: number;
    maxLevel: number;
    percentComplete: number;
  }[];
  workoutHistory: {
    date: string;
    duration: number;
    intensity: number;
    totalVolume: number;
    exerciseCount: number;
    pointsEarned: number;
  }[];
  formTrends: {
    date: string;
    averageFormRating: number;
    exerciseCount: number;
  }[];
  volumeProgression: {
    date: string;
    totalWeight: number;
    totalReps: number;
    totalSets: number;
  }[];
}

export interface PaginatedResponse<T> {
  success: boolean;
  data?: T[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// ==================== CLIENT-TRAINER ASSIGNMENTS ====================

export class ClientTrainerAssignmentService {
  private api: typeof apiService;

  constructor() {
    this.api = apiService;
  }

  /**
   * Get all client-trainer assignments with filtering
   */
  async getAssignments(filters?: {
    status?: string;
    trainerId?: number;
    clientId?: number;
    page?: number;
    limit?: number;
    includeInactive?: boolean;
  }): Promise<PaginatedResponse<ClientTrainerAssignment>> {
    try {
      const queryParams = new URLSearchParams();
      
      if (filters?.status) queryParams.append('status', filters.status);
      if (filters?.trainerId) queryParams.append('trainerId', filters.trainerId.toString());
      if (filters?.clientId) queryParams.append('clientId', filters.clientId.toString());
      if (filters?.page) queryParams.append('page', filters.page.toString());
      if (filters?.limit) queryParams.append('limit', filters.limit.toString());
      if (filters?.includeInactive) queryParams.append('includeInactive', filters.includeInactive.toString());

      const response = (await this.api.get(`/api/assignments?${queryParams.toString()}`)).data;
      return {
        success: response.success,
        data: response.assignments,
        pagination: response.pagination
      };
    } catch (error) {
      console.error('Error fetching assignments:', error);
      throw error;
    }
  }

  /**
   * Get assignments for a specific trainer
   */
  async getTrainerAssignments(trainerId: number): Promise<ApiResponse<ClientTrainerAssignment[]>> {
    try {
      const response = (await this.api.get(`/api/assignments/trainer/${trainerId}`)).data;
      return {
        success: response.success,
        data: response.assignments
      };
    } catch (error) {
      console.error('Error fetching trainer assignments:', error);
      throw error;
    }
  }

  /**
   * Get assignment for a specific client
   */
  async getClientAssignment(clientId: number): Promise<ApiResponse<ClientTrainerAssignment>> {
    try {
      const response = (await this.api.get(`/api/assignments/client/${clientId}`)).data;
      return {
        success: response.success,
        data: response.assignment
      };
    } catch (error) {
      console.error('Error fetching client assignment:', error);
      throw error;
    }
  }

  /**
   * Create a new client-trainer assignment
   */
  async createAssignment(data: {
    clientId: number;
    trainerId: number;
    notes?: string;
  }): Promise<ApiResponse<ClientTrainerAssignment>> {
    try {
      const response = (await this.api.post('/api/assignments', data)).data;
      return {
        success: response.success,
        data: response.assignment,
        message: response.message
      };
    } catch (error) {
      console.error('Error creating assignment:', error);
      throw error;
    }
  }

  /**
   * Update an assignment
   */
  async updateAssignment(id: number, data: {
    status?: string;
    notes?: string;
  }): Promise<ApiResponse<ClientTrainerAssignment>> {
    try {
      const response = (await this.api.put(`/api/assignments/${id}`, data)).data;
      return {
        success: response.success,
        data: response.assignment,
        message: response.message
      };
    } catch (error) {
      console.error('Error updating assignment:', error);
      throw error;
    }
  }

  /**
   * Delete (deactivate) an assignment
   */
  async deleteAssignment(id: number): Promise<ApiResponse<void>> {
    try {
      const response = (await this.api.delete(`/api/assignments/${id}`)).data;
      return {
        success: response.success,
        message: response.message
      };
    } catch (error) {
      console.error('Error deleting assignment:', error);
      throw error;
    }
  }

  /**
   * Get unassigned clients
   */
  async getUnassignedClients(): Promise<ApiResponse<any[]>> {
    try {
      const response = (await this.api.get('/assignments/unassigned/clients')).data;
      return {
        success: response.success,
        data: response.clients
      };
    } catch (error) {
      console.error('Error fetching unassigned clients:', error);
      throw error;
    }
  }

  /**
   * Get assignment statistics
   */
  async getAssignmentStats(): Promise<ApiResponse<any>> {
    try {
      const response = (await this.api.get('/assignments/stats')).data;
      return {
        success: response.success,
        data: response.stats
      };
    } catch (error) {
      console.error('Error fetching assignment stats:', error);
      throw error;
    }
  }
}

// ==================== TRAINER PERMISSIONS ====================

export class TrainerPermissionService {
  private api: typeof apiService;

  constructor() {
    this.api = apiService;
  }

  /**
   * Get live trainers from the authenticated user directory
   */
  async getTrainers(options: {
    includeAdmin?: boolean;
    limit?: number;
    page?: number;
  } = {}): Promise<ApiResponse<TrainerDirectoryUser[]>> {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('includeAdmin', String(options.includeAdmin ?? true));
      queryParams.append('limit', String(options.limit ?? 100));
      if (options.page) queryParams.append('page', options.page.toString());

      const response = (await this.api.get(`/api/auth/users/trainers?${queryParams.toString()}`)).data;
      return {
        success: response.success,
        data: response.trainers || []
      };
    } catch (error) {
      console.error('Error fetching trainers:', error);
      throw error;
    }
  }

  /**
   * Get all trainer permissions
   */
  async getPermissions(filters?: {
    trainerId?: number;
    permissionType?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<TrainerPermission>> {
    try {
      const queryParams = new URLSearchParams();
      
      if (filters?.trainerId) queryParams.append('trainerId', filters.trainerId.toString());
      if (filters?.permissionType) queryParams.append('permissionType', filters.permissionType);
      if (filters?.isActive !== undefined) queryParams.append('isActive', filters.isActive.toString());
      if (filters?.page) queryParams.append('page', filters.page.toString());
      if (filters?.limit) queryParams.append('limit', filters.limit.toString());

      const response = (await this.api.get(`/api/trainer-permissions?${queryParams.toString()}`)).data;
      return {
        success: response.success,
        data: response.permissions,
        pagination: response.pagination
      };
    } catch (error) {
      console.error('Error fetching permissions:', error);
      throw error;
    }
  }

  /**
   * Get permissions for a specific trainer
   */
  async getTrainerPermissions(trainerId: number): Promise<ApiResponse<any>> {
    try {
      const response = (await this.api.get(`/api/trainer-permissions/trainer/${trainerId}`)).data;
      return {
        success: response.success,
        data: {
          permissions: response.permissions,
          permissionsByType: response.permissionsByType,
          totalActivePermissions: response.totalActivePermissions,
          availablePermissionTypes: response.availablePermissionTypes
        }
      };
    } catch (error) {
      console.error('Error fetching trainer permissions:', error);
      throw error;
    }
  }

  /**
   * Grant a permission to a trainer
   */
  async grantPermission(data: {
    trainerId: number;
    permissionType: string;
    expiresAt?: string;
    notes?: string;
  }): Promise<ApiResponse<TrainerPermission>> {
    try {
      const response = (await this.api.post('/api/trainer-permissions/grant', data)).data;
      return {
        success: response.success,
        data: response.permission,
        message: response.message
      };
    } catch (error) {
      console.error('Error granting permission:', error);
      throw error;
    }
  }

  /**
   * Revoke a permission
   */
  async revokePermission(id: number, notes?: string): Promise<ApiResponse<TrainerPermission>> {
    try {
      const response = (await this.api.put(`/api/trainer-permissions/${id}/revoke`, { notes })).data;
      return {
        success: response.success,
        data: response.permission,
        message: response.message
      };
    } catch (error) {
      console.error('Error revoking permission:', error);
      throw error;
    }
  }

  /**
   * Extend permission expiration
   */
  async extendPermission(id: number, data: {
    expiresAt: string;
    notes?: string;
  }): Promise<ApiResponse<TrainerPermission>> {
    try {
      const response = (await this.api.put(`/api/trainer-permissions/${id}/extend`, data)).data;
      return {
        success: response.success,
        data: response.permission,
        message: response.message
      };
    } catch (error) {
      console.error('Error extending permission:', error);
      throw error;
    }
  }

  /**
   * Check if a trainer has a specific permission
   */
  async checkPermission(data: {
    trainerId: number;
    permissionType: string;
  }): Promise<ApiResponse<any>> {
    try {
      const response = (await this.api.post('/api/trainer-permissions/check', data)).data;
      return {
        success: response.success,
        data: {
          hasPermission: response.hasPermission,
          permission: response.permission,
          isExpiringSoon: response.isExpiringSoon,
          daysUntilExpiration: response.daysUntilExpiration
        }
      };
    } catch (error) {
      console.error('Error checking permission:', error);
      throw error;
    }
  }

  /**
   * Get available permission types
   */
  async getPermissionTypes(): Promise<ApiResponse<any[]>> {
    try {
      const response = (await this.api.get('/api/trainer-permissions/types')).data;
      return {
        success: response.success,
        data: response.permissionTypes
      };
    } catch (error) {
      console.error('Error fetching permission types:', error);
      throw error;
    }
  }

  /**
   * Get permission statistics
   */
  async getPermissionStats(): Promise<ApiResponse<any>> {
    try {
      const response = (await this.api.get('/api/trainer-permissions/stats')).data;
      return {
        success: response.success,
        data: response.stats
      };
    } catch (error) {
      console.error('Error fetching permission stats:', error);
      throw error;
    }
  }
}

// ==================== DAILY WORKOUT FORMS ====================

export class DailyWorkoutFormService {
  private api: typeof apiService;

  constructor() {
    this.api = apiService;
  }

  /**
   * Submit a daily workout form
   */
  async submitWorkoutForm(
    data: DailyWorkoutFormSubmitPayload,
    options: { signal?: AbortSignal } = {}
  ): Promise<ApiResponse<DailyWorkoutForm>> {
    try {
      // 2026-04-18 Phase 16.2 round 13 fix — `this.api.post()` returns
      // `AxiosResponse<T>`, so the backend payload lives under `.data`,
      // not on the top-level response object. Reading `response.success`
      // / `response.form` directly returned `undefined`, which
      // WorkoutLogger's caller interpreted as a failed save and pushed
      // the already-persisted workout into `ss-workout-queue-91` while
      // showing "Failed to submit workout form". The backend had in
      // fact returned 201 with `{ success: true, form: {...} }`.
      //
      // Unwrap `response.data` once, then map the server shape
      // `{ success, form, message }` to the frontend `ApiResponse<T>`
      // shape `{ success, data, message }`.
      const requestConfig = options.signal ? { signal: options.signal } : undefined;
      const response = requestConfig
        ? await this.api.post<{
            success: boolean;
            form: DailyWorkoutForm;
            message?: string;
            handoff?: HandoffData | null;
          }>('/api/workout-forms', data, requestConfig)
        : await this.api.post<{
            success: boolean;
            form: DailyWorkoutForm;
            message?: string;
            handoff?: HandoffData | null;
          }>('/api/workout-forms', data);
      const payload = response.data;
      // `handoff` is a TOP-LEVEL sibling of `form` on the wire — re-attach it onto the form so
      // WorkoutLogger's lastSaveResponse.handoff carries it (else this mapper silently drops it).
      // Guard both edges: keep `data: undefined` when there's no form (error bodies), and only attach
      // handoff when the server actually sent it (never inject a phantom key when it didn't).
      const mappedData = payload.form
        ? (payload.handoff !== undefined ? { ...payload.form, handoff: payload.handoff } : payload.form)
        : payload.form;
      return {
        success: payload.success,
        data: mappedData,
        message: payload.message
      };
    } catch (error) {
      const axiosError = error as {
        response?: {
          status?: number;
          data?: {
            success?: boolean;
            form?: DailyWorkoutForm;
            data?: DailyWorkoutForm;
            message?: string;
          };
        };
      };
      const status = axiosError.response?.status;
      const payload = axiosError.response?.data;
      if (payload?.success === false && status && status >= 400 && status < 500) {
        return {
          success: false,
          data: payload.form ?? payload.data,
          message: payload.message
        };
      }
      console.error('Error submitting workout form:', error);
      throw error;
    }
  }

  /**
   * Get workout forms with filtering
   */
  async getWorkoutForms(filters?: {
    clientId?: number;
    trainerId?: number;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
    mcpProcessed?: boolean;
  }): Promise<PaginatedResponse<DailyWorkoutForm>> {
    try {
      const queryParams = new URLSearchParams();
      
      if (filters?.clientId) queryParams.append('clientId', filters.clientId.toString());
      if (filters?.trainerId) queryParams.append('trainerId', filters.trainerId.toString());
      if (filters?.startDate) queryParams.append('startDate', filters.startDate);
      if (filters?.endDate) queryParams.append('endDate', filters.endDate);
      if (filters?.page) queryParams.append('page', filters.page.toString());
      if (filters?.limit) queryParams.append('limit', filters.limit.toString());
      if (filters?.mcpProcessed !== undefined) queryParams.append('mcpProcessed', filters.mcpProcessed.toString());

      const response = (await this.api.get(`/api/workout-forms?${queryParams.toString()}`)).data;
      return {
        success: response.success,
        data: response.forms,
        pagination: response.pagination
      };
    } catch (error) {
      console.error('Error fetching workout forms:', error);
      throw error;
    }
  }

  /**
   * Get a specific workout form
   */
  async getWorkoutForm(id: string): Promise<ApiResponse<DailyWorkoutForm & { stats: any }>> {
    try {
      const response = (await this.api.get(`/api/workout-forms/${id}`)).data;
      return {
        success: response.success,
        data: {
          ...response.form,
          stats: response.stats
        }
      };
    } catch (error) {
      console.error('Error fetching workout form:', error);
      throw error;
    }
  }

  /**
   * Get client progress data for charts
   */
  async getClientProgress(clientId: number, params?: {
    timeRange?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<ApiResponse<ProgressData & { totalWorkouts: number }>> {
    try {
      const queryParams = new URLSearchParams();
      
      if (params?.timeRange) queryParams.append('timeRange', params.timeRange);
      if (params?.startDate) queryParams.append('startDate', params.startDate);
      if (params?.endDate) queryParams.append('endDate', params.endDate);

      const response = (await this.api.get(`/api/workout-forms/client/${clientId}/progress?${queryParams.toString()}`)).data;
      return {
        success: response.success,
        data: {
          ...response.progressData,
          totalWorkouts: response.totalWorkouts
        }
      };
    } catch (error) {
      console.error('Error fetching client progress:', error);
      throw error;
    }
  }

  /**
   * Reprocess a workout form (Admin only)
   */
  async reprocessForm(id: string): Promise<ApiResponse<void>> {
    try {
      const response = (await this.api.post(`/api/workout-forms/${id}/reprocess`)).data;
      return {
        success: response.success,
        message: response.message
      };
    } catch (error) {
      console.error('Error reprocessing form:', error);
      throw error;
    }
  }

  /**
   * Get workout form statistics
   */
  async getWorkoutFormStats(): Promise<ApiResponse<any>> {
    try {
      const response = (await this.api.get('/api/workout-forms/stats/overview')).data;
      return {
        success: response.success,
        data: response.stats
      };
    } catch (error) {
      console.error('Error fetching workout form stats:', error);
      throw error;
    }
  }
}

// ==================== UNIFIED NASM SERVICE ====================

export class NASMApiService {
  public assignments: ClientTrainerAssignmentService;
  public permissions: TrainerPermissionService;
  public workoutForms: DailyWorkoutFormService;

  constructor() {
    this.assignments = new ClientTrainerAssignmentService();
    this.permissions = new TrainerPermissionService();
    this.workoutForms = new DailyWorkoutFormService();
  }
}

// Export singleton instance
export const nasmApiService = new NASMApiService();

// Export individual services
export const clientTrainerAssignmentService = new ClientTrainerAssignmentService();
export const trainerPermissionService = new TrainerPermissionService();
export const dailyWorkoutFormService = new DailyWorkoutFormService();

export default nasmApiService;

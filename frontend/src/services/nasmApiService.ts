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

export interface ExerciseSet {
  setNumber: number;
  weight: number;
  reps: number;
  rpe: number; // 1-10
  tempo?: string;
  restTime: number;
  formQuality: number; // 1-5
  notes?: string;
}

export interface ExerciseEntry {
  exerciseId: string;
  exerciseName: string;
  sets: ExerciseSet[];
  formRating: number; // 1-5
  painLevel: number; // 0-10
  performanceNotes?: string;
}

export interface DailyWorkoutForm {
  id: string;
  sessionId?: string;
  clientId: number;
  trainerId: number;
  date: string;
  sessionDeducted: boolean;
  formData: {
    exercises: ExerciseEntry[];
    sessionNotes: string;
    overallIntensity: number;
    submittedBy: number;
    submittedAt: string;
    totalSets?: number;
    estimatedDuration?: number;
  };
  totalPointsEarned: number;
  mcpProcessed: boolean;
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

      const response = await this.api.get(`/assignments?${queryParams.toString()}`);
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
      const response = await this.api.get(`/assignments/trainer/${trainerId}`);
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
      const response = await this.api.get(`/assignments/client/${clientId}`);
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
      const response = await this.api.post('/assignments', data);
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
      const response = await this.api.put(`/assignments/${id}`, data);
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
      const response = await this.api.delete(`/assignments/${id}`);
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
      const response = await this.api.get('/assignments/unassigned/clients');
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
      const response = await this.api.get('/assignments/stats');
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

      const response = await this.api.get(`/trainer-permissions?${queryParams.toString()}`);
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
      const response = await this.api.get(`/trainer-permissions/trainer/${trainerId}`);
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
      const response = await this.api.post('/trainer-permissions/grant', data);
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
      const response = await this.api.put(`/trainer-permissions/${id}/revoke`, { notes });
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
      const response = await this.api.put(`/trainer-permissions/${id}/extend`, data);
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
      const response = await this.api.post('/trainer-permissions/check', data);
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
      const response = await this.api.get('/trainer-permissions/types');
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
      const response = await this.api.get('/trainer-permissions/stats');
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
  async submitWorkoutForm(data: {
    clientId: number;
    date: string;
    exercises: ExerciseEntry[];
    sessionNotes?: string;
    overallIntensity?: number;
  }): Promise<ApiResponse<DailyWorkoutForm>> {
    try {
      const response = await this.api.post('/workout-forms', data);
      return {
        success: response.success,
        data: response.form,
        message: response.message
      };
    } catch (error) {
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

      const response = await this.api.get(`/workout-forms?${queryParams.toString()}`);
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
      const response = await this.api.get(`/workout-forms/${id}`);
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

      const response = await this.api.get(`/workout-forms/client/${clientId}/progress?${queryParams.toString()}`);
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
      const response = await this.api.post(`/workout-forms/${id}/reprocess`);
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
      const response = await this.api.get('/workout-forms/stats/overview');
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
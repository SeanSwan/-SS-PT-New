/**
 * Admin Client Service - Business-Critical API Integration
 * ======================================================
 * 
 * Service layer for all admin client management operations
 * Integrates with existing backend adminClientController
 * 
 * FUNCTIONALITY:
 * - Client CRUD operations (Create, Read, Update, Delete)
 * - Client data collection and onboarding
 * - Trainer assignment management
 * - Client analytics and reporting
 * - Bulk operations for multiple clients
 * - Integration with payment/session systems
 */

import apiService from './api.service';

type AdminApiClient = {
  get<T = any>(url: string, config?: any): Promise<{ data: T }>;
  post<T = any>(url: string, data?: any, config?: any): Promise<{ data: T }>;
  put<T = any>(url: string, data?: any, config?: any): Promise<{ data: T }>;
  delete<T = any>(url: string, config?: any): Promise<{ data: T }>;
};

const needsApiPrefix = (apiInstance: any): boolean => {
  const baseUrl = apiInstance?.defaults?.baseURL;
  return typeof baseUrl !== 'string' || !/\/api\/?$/.test(baseUrl);
};

const withApiPrefix = (path: string, apiInstance: any): string => {
  if (path.startsWith('/api/')) return path;
  return needsApiPrefix(apiInstance) ? `/api${path}` : path;
};

const createAdminApiClient = (apiInstance: any = apiService): AdminApiClient => ({
  get: (url, config) => apiInstance.get(withApiPrefix(url, apiInstance), config),
  post: (url, data, config) => apiInstance.post(withApiPrefix(url, apiInstance), data, config),
  put: (url, data, config) => apiInstance.put(withApiPrefix(url, apiInstance), data, config),
  delete: (url, config) => apiInstance.delete(withApiPrefix(url, apiInstance), config),
});

/**
 * Admin Client Service Class
 */
class AdminClientService {
  private readonly api: AdminApiClient;

  constructor(apiInstance?: any) {
    this.api = createAdminApiClient(apiInstance);
  }

  /**
   * Get all clients with filtering and pagination
   */
  async getClients(params = {}) {
    try {
      const response = await this.api.get('/admin/clients', { params });
      // API returns { success, data: { clients, count, ... } }
      // Axios unwraps once, so response.data = { success, data: { clients } }
      const payload = response.data?.data || response.data || {};
      const clients = payload.clients || [];
      return {
        clients,
        stats: {
          totalClients: payload.count || clients.length || 0,
          activeClients: clients.filter((c: any) => c.isActive)?.length || 0,
          newThisMonth: payload.newThisMonth || 0,
          totalRevenue: payload.totalRevenue || 0,
          sessionsBooked: payload.sessionsBooked || 0,
          averageSessionsPerClient: payload.averageSessionsPerClient || 0
        }
      };
    } catch (error) {
      console.error('Error fetching clients:', error);
      throw new Error('Failed to fetch clients');
    }
  }
  
  /**
   * Get detailed information for a specific client
   */
  async getClientDetails(clientId) {
    try {
      const response = await this.api.get(`/admin/clients/${clientId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching client details:', error);
      throw new Error('Failed to fetch client details');
    }
  }
  
  /**
   * Create a new client with comprehensive data
   */
  async createClient(clientData) {
    try {
      const { password: _discardedPassword, ...clientDataWithoutPassword } = clientData || {};
      const response = await this.api.post('/admin/clients', {
        ...clientDataWithoutPassword,
        // Ensure client role
        role: 'client',
        isActive: true,
        // Set available sessions from package
        availableSessions: clientData?.availableSessions || 0
      });
      
      return response.data;
    } catch (error) {
      console.error('Error creating client:', error);
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw new Error('Failed to create client');
    }
  }
  
  /**
   * Create an external client (Move Fitness, etc.) — 0 sessions, full tool access
   */
  async createExternalClient(clientData: CreateExternalClientRequest) {
    try {
      const { password: _discardedPassword, ...clientDataWithoutPassword } = clientData || {};
      const response = await this.api.post('/admin/clients/create-external', clientDataWithoutPassword);
      return response.data;
    } catch (error: any) {
      console.error('Error creating external client:', error);
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw new Error('Failed to create external client');
    }
  }

  /**
   * Update existing client information
   */
  async updateClient(clientId, updateData) {
    try {
      const response = await this.api.put(`/admin/clients/${clientId}`, updateData);
      return response.data;
    } catch (error) {
      console.error('Error updating client:', error);
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw new Error('Failed to update client');
    }
  }
  
  /**
   * Delete a client (soft delete - mark as inactive)
   */
  async deleteClient(clientId) {
    try {
      const response = await this.api.delete(`/admin/clients/${clientId}`, {
        data: { softDelete: true },
      });
      return response.data;
    } catch (error) {
      console.error('Error deleting client:', error);
      throw new Error('Failed to delete client');
    }
  }
  
  /**
   * Fetch trainers/admins that can own client assignments.
   */
  async getAssignableTrainers(): Promise<AssignableTrainer[]> {
    try {
      const response = await this.api.get('/admin/trainers');
      const payload = response.data?.data || response.data || {};
      const trainers = Array.isArray(payload.trainers)
        ? payload.trainers
        : Array.isArray(payload.users)
          ? payload.users
          : [];

      return trainers
        .filter((trainer: any) => trainer?.id && trainer?.firstName && trainer?.lastName)
        .map((trainer: any) => ({
          id: String(trainer.id),
          firstName: String(trainer.firstName),
          lastName: String(trainer.lastName),
          role: typeof trainer.role === 'string' ? trainer.role : undefined,
        }));
    } catch (error) {
      console.error('Error fetching assignable trainers:', error);
      throw new Error('Failed to fetch trainers');
    }
  }

  /**
   * Assign trainer to client
   */
  async assignTrainer(clientId, trainerId) {
    try {
      const response = await this.api.post(`/admin/clients/${clientId}/assign-trainer`, {
        trainerId
      });
      return response.data;
    } catch (error) {
      console.error('Error assigning trainer:', error);
      throw new Error('Failed to assign trainer');
    }
  }
  
  /**
   * Send a secure password reset email to a client.
   */
  async sendClientPasswordReset(clientId) {
    try {
      const response = await this.api.post(`/admin/clients/${clientId}/send-password-reset`, {});
      return response.data;
    } catch (error: any) {
      console.error('Error sending password reset:', error);
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw new Error('Failed to send password reset email');
    }
  }

  async resetClientPassword(clientId) {
    return this.sendClientPasswordReset(clientId);
  }
  
  /**
   * Get client workout statistics
   */
  async getClientWorkoutStats(clientId) {
    try {
      const response = await this.api.get(`/admin/clients/${clientId}/workout-stats`);
      return response.data;
    } catch (error) {
      console.error('Error fetching workout stats:', error);
      throw new Error('Failed to fetch workout statistics');
    }
  }
  
  /**
   * Generate workout plan for client through Swan Coach planning.
   */
  async generateWorkoutPlan(clientId, planData) {
    try {
      const targetClientId = Number(clientId);
      if (!Number.isSafeInteger(targetClientId) || targetClientId <= 0) {
        throw new Error('Valid client id required for Swan Coach planning');
      }
      const response = await this.api.post('/workout-builder/plan', {
        ...planData,
        clientId: targetClientId,
      });
      return response.data;
    } catch (error) {
      console.error('Error generating workout plan:', error);
      throw new Error('Failed to generate workout plan');
    }
  }
  
  /**
   * Bulk operations for multiple clients
   */
  async bulkUpdate(clientIds, updateData) {
    try {
      const response = await this.api.post('/admin/clients/bulk-update', {
        clientIds,
        updateData
      });
      return response.data;
    } catch (error) {
      console.error('Error in bulk update:', error);
      throw new Error('Failed to update clients');
    }
  }
  
  /**
   * Export client data
   */
  async exportClients(format = 'csv', filters = {}) {
    try {
      const response = await this.api.get('/admin/clients/export', {
        params: { format, ...filters },
        responseType: 'blob'
      });
      
      const blob = response.data instanceof Blob
        ? response.data
        : new Blob([response.data], { type: 'text/csv;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `clients-export-${new Date().toISOString().split('T')[0]}.${format}`);

      try {
        document.body.appendChild(link);
        link.click();
      } finally {
        link.remove();
        window.URL.revokeObjectURL(url);
      }
      
      return true;
    } catch {
      throw new Error('Failed to export client data');
    }
  }
  
  /**
   * Get client analytics dashboard data
   */
  async getClientAnalytics(timeRange = '30d') {
    try {
      const response = await this.api.get('/admin/clients/analytics', {
        params: { timeRange }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching analytics:', error);
      throw new Error('Failed to fetch analytics data');
    }
  }
  
  /**
   * Search clients with advanced filters
   */
  async searchClients(searchQuery, filters = {}) {
    try {
      const response = await this.api.get('/admin/clients/search', {
        params: {
          q: searchQuery,
          ...filters
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error searching clients:', error);
      throw new Error('Failed to search clients');
    }
  }
  
  /**
   * Get client session history
   */
  async getClientSessions(clientId, params = {}) {
    try {
      const response = await this.api.get(`/admin/clients/${clientId}/sessions`, { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching client sessions:', error);
      throw new Error('Failed to fetch client sessions');
    }
  }
  
  /**
   * Get client payment history
   */
  async getClientPayments(clientId, params = {}) {
    try {
      const response = await this.api.get(`/admin/clients/${clientId}/payments`, { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching client payments:', error);
      throw new Error('Failed to fetch client payments');
    }
  }
  
  /**
   * Add sessions to client account
   */
  async addSessions(clientId, sessionCount, packageId = null) {
    try {
      const response = await this.api.post(`/admin/clients/${clientId}/add-sessions`, {
        sessionCount,
        packageId
      });
      return response.data;
    } catch (error) {
      console.error('Error adding sessions:', error);
      throw new Error('Failed to add sessions');
    }
  }
  
  /**
   * Get MCP (AI) system status for client features
   */
  async getMCPStatus() {
    try {
      const response = await this.api.get('/admin/mcp-status');
      return response.data;
    } catch (error) {
      console.error('Error fetching MCP status:', error);
      // Don't throw error for MCP status - it's not critical
      return { status: 'unavailable' };
    }
  }

  // ==================== P0: BILLING & SESSIONS ====================

  /**
   * Get billing overview for a client (session credits, pending orders, upcoming sessions)
   */
  async getBillingOverview(clientId: string) {
    try {
      const response = await this.api.get(`/admin/clients/${clientId}/billing-overview`);
      return response.data;
    } catch (error) {
      console.error('Error fetching billing overview:', error);
      throw new Error('Failed to fetch billing overview');
    }
  }

  /**
   * Apply payment to an order (idempotent - prevents double-charging)
   * @param orderId - The order ID to apply payment to
   * @param paymentData - Payment details { method, reference }
   */
  async applyPayment(orderId: string | number, paymentData: { method: string; reference?: string }) {
    try {
      const response = await this.api.post(`/orders/${orderId}/apply-payment`, paymentData);
      return response.data;
    } catch (error) {
      console.error('Error applying payment:', error);
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw new Error('Failed to apply payment');
    }
  }

  /**
   * Book a session for a client (admin booking on behalf of client)
   * @param data - Session booking details { clientId, sessionDate, trainerId, duration, notes }
   */
  async bookSessionForClient(data: {
    clientId: number | string;
    sessionDate: string;
    trainerId: number | string;
    duration: number;
    notes?: string;
  }) {
    try {
      const response = await this.api.post('/sessions/admin/book', data);
      return response.data;
    } catch (error) {
      console.error('Error booking session for client:', error);
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw new Error('Failed to book session');
    }
  }

  /**
   * Add session credits to a client (admin grant)
   * Uses existing session-packages endpoint
   * Backend expects: { clientId, sessions, notes }
   */
  async addSessionCredits(clientId: string | number, data: {
    sessions: number;
    reason?: string;
    adminNote?: string;
  }) {
    try {
      // Map frontend fields to backend expected format
      const notes = [data.reason, data.adminNote].filter(Boolean).join(' - ');
      const response = await this.api.post('/session-packages/add-sessions', {
        clientId: clientId,  // Backend expects clientId, not userId
        sessions: data.sessions,
        notes: notes || undefined
      });
      return response.data;
    } catch (error) {
      console.error('Error adding session credits:', error);
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw new Error('Failed to add session credits');
    }
  }

  // ==================== PHASE 1C: ONBOARDING & WORKOUT LOGGING ====================

  /**
   * Get onboarding status for a client.
   * Returns { status: 'not_found', questionnaire: null } on 404 (no questionnaire yet).
   */
  async getOnboardingStatus(clientId: number | string) {
    try {
      const response = await this.api.get(`/admin/clients/${clientId}/onboarding`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return { status: 'not_found', questionnaire: null };
      }
      throw new Error(error.response?.data?.message || 'Failed to fetch onboarding status');
    }
  }

  /**
   * Save onboarding draft for a client.
   * Body: { mode: 'draft', responsesJson }
   */
  async saveOnboardingDraft(clientId: number | string, responsesJson: Record<string, any>) {
    try {
      const response = await this.api.post(`/admin/clients/${clientId}/onboarding`, {
        mode: 'draft',
        responsesJson,
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to save onboarding draft');
    }
  }

  /**
   * Submit completed onboarding for a client.
   * Body: { mode: 'submit', responsesJson }
   */
  async submitOnboarding(clientId: number | string, responsesJson: Record<string, any>) {
    try {
      const response = await this.api.post(`/admin/clients/${clientId}/onboarding`, {
        mode: 'submit',
        responsesJson,
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to submit onboarding');
    }
  }

  /**
   * Reset (delete) onboarding data for a client.
   */
  async resetOnboarding(clientId: number | string) {
    try {
      const response = await this.api.delete(`/admin/clients/${clientId}/onboarding`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to reset onboarding');
    }
  }

  /**
   * Log a workout for a client.
   * Response includes xp field (null if same-day/already-awarded/failed).
   */
  async logWorkout(clientId: number | string, workoutData: {
    title: string;
    date: string;
    duration: number;
    // Phase 16 (2026-04-16): optional on the wire. Backend persists DB null
    // when key is omitted. Kept aligned with LogWorkoutPayload.intensity in
    // parsedWorkoutToLogPayload.ts.
    intensity?: number;
    notes?: string;
    exercises: Array<{
      name: string;
      exerciseNote?: string;
      sets: Array<{
        setNumber: number;
        reps: number;
        weight: number;
        tempo?: string;
        rest?: number;
        rpe?: number;
        notes?: string;
      }>;
    }>;
  }) {
    try {
      const targetClientId = Number(clientId);
      if (!Number.isSafeInteger(targetClientId) || targetClientId <= 0) {
        throw new Error('Valid client id required to log workout');
      }

      const exercises = workoutData.exercises.map((exercise) => {
        const mappedExercise: {
          exerciseName: string;
          exerciseNote?: string;
          sets: Array<Record<string, number | string>>;
        } = {
          exerciseName: exercise.name,
          sets: exercise.sets.map((set) => {
            const nextSet: Record<string, number | string> = {
              setNumber: set.setNumber,
              reps: set.reps,
              weight: set.weight,
            };
            if (set.tempo) nextSet.tempo = set.tempo;
            if (set.rest !== undefined) nextSet.restTime = set.rest;
            if (set.rpe !== undefined) nextSet.rpe = set.rpe;
            if (set.notes) nextSet.notes = set.notes;
            return nextSet;
          }),
        };
        if (exercise.exerciseNote) mappedExercise.exerciseNote = exercise.exerciseNote;
        return mappedExercise;
      });

      const formPayload: Record<string, unknown> = {
        clientId: targetClientId,
        date: workoutData.date,
        exercises,
      };
      if (workoutData.notes) formPayload.sessionNotes = workoutData.notes;
      if (workoutData.intensity !== undefined) formPayload.overallIntensity = workoutData.intensity;

      const response = await this.api.post('/workout-forms', formPayload);
      const payload = response.data || {};
      const form = payload.form || payload.data || null;
      const formId = form?.id;
      return {
        success: payload.success,
        message: payload.message,
        id: formId,
        workoutId: formId,
        form,
        billing: form?.billing,
        workout: form
          ? {
              id: form.id,
              userId: form.clientId ?? targetClientId,
              title: workoutData.title,
              date: form.date ?? workoutData.date,
              duration: form.estimatedDuration ?? workoutData.duration,
              intensity: workoutData.intensity ?? null,
              totalSets: form.totalSets,
              totalReps: undefined,
              totalWeight: undefined,
              exerciseCount: workoutData.exercises.length,
              sessionDeducted: form.sessionDeducted,
            }
          : undefined,
        xp: null,
      };
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to log workout');
    }
  }

  /**
   * Get workout history for a client.
   */
  async getWorkoutHistory(clientId: number | string, params?: {
    from?: string;
    to?: string;
    limit?: number;
    offset?: number;
  }) {
    try {
      const response = await this.api.get(`/admin/clients/${clientId}/workouts`, { params });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch workout history');
    }
  }

  /**
   * Format client data for display
   */
  formatClientData(client) {
    return {
      ...client,
      fullName: `${client.firstName} ${client.lastName}`,
      age: client.dateOfBirth ? this.calculateAge(client.dateOfBirth) : null,
      memberSince: client.createdAt ? new Date(client.createdAt).getFullYear() : null,
      lastActivity: client.lastActivity ? new Date(client.lastActivity) : null
    };
  }
  
  /**
   * Calculate age from date of birth
   */
  calculateAge(dateOfBirth) {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }
  
  /**
   * Validate client data before submission
   */
  validateClientData(clientData) {
    const errors: Record<string, string> = {};
    
    // Required fields
    if (!clientData.firstName?.trim()) {
      errors.firstName = 'First name is required';
    }
    
    if (!clientData.lastName?.trim()) {
      errors.lastName = 'Last name is required';
    }
    
    if (!clientData.email?.trim()) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(clientData.email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    if (!clientData.phone?.trim()) {
      errors.phone = 'Phone number is required';
    }
    
    if (!clientData.dateOfBirth) {
      errors.dateOfBirth = 'Date of birth is required';
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }
}

// Client source types (AI Village consensus: STRING + Zod validation)
export type ClientSource = 'swanstudios' | 'move_fitness' | 'external';

export const CLIENT_SOURCE_LABELS: Record<ClientSource, string> = {
  swanstudios: 'SwanStudios',
  move_fitness: 'Move Fitness',
  external: 'External',
};

export const CLIENT_SOURCE_COLORS: Record<ClientSource, string> = {
  swanstudios: '#8B5CF6', // Wing Purple
  move_fitness: '#60C0F0', // Ice Wing
  external: '#C6A84B',    // Gilded Fern
};

// Client management types
export interface AdminClient {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  phone?: string;
  photo?: string;
  role: string;
  isActive: boolean;
  clientSource?: ClientSource;
  fitnessGoal?: string;
  availableSessions?: number;
  totalWorkouts?: number;
  totalOrders?: number;
  createdAt: string;
  lastWorkout?: any;
  nextSession?: any;
  measurementSchedule?: any;
}

export interface AdminClientFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: string;
  fitnessGoal?: string;
  trainer?: string;
  clientSource?: ClientSource;
}

export interface CreateClientRequest {
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  password: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  weight?: number;
  height?: number;
  fitnessGoal?: string;
  trainingExperience?: string;
  healthConcerns?: string;
  emergencyContact?: string;
  availableSessions?: number;
  trainerId?: string;
  clientSource?: ClientSource;
}

export interface CreateExternalClientRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  weight?: number;
  height?: number;
  fitnessGoal?: string;
  trainingExperience?: string;
  healthConcerns?: string;
  emergencyContact?: string;
  clientSource?: ClientSource;
  password?: string;
  trainerId?: string;
}

export interface AssignableTrainer {
  id: string;
  firstName: string;
  lastName: string;
  role?: string;
}

export interface UpdateClientRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  fitnessGoal?: string;
  clientSource?: ClientSource;
  [key: string]: any;
}

// P0: Billing Overview Types
export interface BillingOverviewData {
  client: {
    id: number;
    name: string;
    email: string;
    clientSource?: ClientSource;
  };
  sessionsRemaining: number;
  lastPurchase: {
    id: number;
    packageName: string;
    sessions: number;
    amount: number;
    grantedAt: string;
    paymentAppliedAt: string | null;
    paymentReference: string | null;
  } | null;
  pendingOrders: Array<{
    id: number;
    packageName: string;
    sessions: number;
    amount: number;
    status: string;
    createdAt: string;
  }>;
  nextSession: {
    id: number;
    date: string;
    duration: number;
    status: string;
    notes: string | null;
    trainer: {
      id: number;
      name: string;
    } | null;
  } | null;
  recentSessions: Array<{
    id: number;
    date: string;
    duration: number;
    completedAt: string;
    trainer: {
      id: number;
      name: string;
    } | null;
  }>;
}

export interface ApplyPaymentData {
  method: 'stripe' | 'cash' | 'venmo' | 'check' | 'other';
  reference?: string;
}

export interface BookSessionData {
  clientId: number | string;
  sessionDate: string;
  trainerId: number | string;
  duration: number;
  notes?: string;
}

export interface AddSessionCreditsData {
  sessions: number;
  reason?: string;
  adminNote?: string;
}

// TypeScript interface for the service
export interface AdminClientServiceInterface {
  getClients(params?: any): Promise<any>;
  getClientDetails(clientId: string): Promise<any>;
  createClient(clientData: any): Promise<any>;
  createExternalClient(clientData: CreateExternalClientRequest): Promise<any>;
  updateClient(clientId: string, updateData: any): Promise<any>;
  deleteClient(clientId: string): Promise<any>;
  getAssignableTrainers(): Promise<AssignableTrainer[]>;
  assignTrainer(clientId: string, trainerId: string): Promise<any>;
  sendClientPasswordReset(clientId: string): Promise<any>;
  resetClientPassword(clientId: string): Promise<any>;
  getClientWorkoutStats(clientId: string): Promise<any>;
  generateWorkoutPlan(clientId: string, planData: any): Promise<any>;
  bulkUpdate(clientIds: string[], updateData: any): Promise<any>;
  exportClients(format?: string, filters?: any): Promise<boolean>;
  getClientAnalytics(timeRange?: string): Promise<any>;
  searchClients(searchQuery: string, filters?: any): Promise<any>;
  getClientSessions(clientId: string, params?: any): Promise<any>;
  getClientPayments(clientId: string, params?: any): Promise<any>;
  addSessions(clientId: string, sessionCount: number, packageId?: string | null): Promise<any>;
  getMCPStatus(): Promise<any>;
  // P0: Billing & Sessions
  getBillingOverview(clientId: string): Promise<{ success: boolean; data: BillingOverviewData }>;
  applyPayment(orderId: string | number, paymentData: ApplyPaymentData): Promise<any>;
  bookSessionForClient(data: BookSessionData): Promise<any>;
  addSessionCredits(clientId: string | number, data: AddSessionCreditsData): Promise<any>;
  // Phase 1C: Admin onboarding + workout methods
  getOnboardingStatus(clientId: number | string): Promise<any>;
  saveOnboardingDraft(clientId: number | string, responsesJson: any): Promise<any>;
  submitOnboarding(clientId: number | string, responsesJson: any): Promise<any>;
  resetOnboarding(clientId: number | string): Promise<any>;
  logWorkout(clientId: number | string, workoutData: any): Promise<any>;
  getWorkoutHistory(clientId: number | string, params?: any): Promise<any>;
}

// Factory function for creating the service with custom API instance
export const createAdminClientService = (apiInstance?: any): AdminClientServiceInterface => {
  return new AdminClientService(apiInstance);
};

// Export singleton instance
export const adminClientService = new AdminClientService(apiService);
export default adminClientService;

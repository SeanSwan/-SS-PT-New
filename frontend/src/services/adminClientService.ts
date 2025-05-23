/**
 * Admin Client API Service
 * Provides admin-specific client management functionality
 */

import { AxiosInstance } from 'axios';

// Types for admin client management
export interface AdminClient {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  weight?: number;
  height?: number;
  fitnessGoal?: string;
  trainingExperience?: string;
  healthConcerns?: string;
  emergencyContact?: string;
  availableSessions: number;
  isActive: boolean;
  role: string;
  createdAt: string;
  updatedAt: string;
  // Computed fields from backend
  totalWorkouts?: number;
  totalOrders?: number;
  lastWorkout?: any;
  nextSession?: any;
}

export interface AdminClientsResponse {
  success: boolean;
  data: {
    clients: AdminClient[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
}

export interface AdminClientDetailsResponse {
  success: boolean;
  data: {
    client: AdminClient;
    mcpStats?: any;
  };
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
}

export interface UpdateClientRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
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
  isActive?: boolean;
}

export interface ResetPasswordRequest {
  newPassword: string;
}

export interface AssignTrainerRequest {
  trainerId: string;
  sessionCount?: number;
}

export interface WorkoutStatsResponse {
  success: boolean;
  data: any; // MCP server response structure
}

export interface GenerateWorkoutPlanRequest {
  trainerId?: string;
  name: string;
  description: string;
  goal: string;
  daysPerWeek?: number;
  difficulty?: string;
  focusAreas?: string[];
}

export interface GenerateWorkoutPlanResponse {
  success: boolean;
  message: string;
  data: any;
}

export interface MCPStatusResponse {
  success: boolean;
  data: {
    servers: Array<{
      name: string;
      url: string;
      status: 'online' | 'offline' | 'error';
      lastChecked: string;
      error?: string;
    }>;
    summary: {
      online: number;
      offline: number;
      error: number;
    };
  };
}

export interface AdminClientFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  fitnessGoal?: string;
  trainer?: string;
}

// Service interface
export interface AdminClientServiceInterface {
  getClients: (filters?: AdminClientFilters) => Promise<AdminClientsResponse>;
  getClientDetails: (clientId: string) => Promise<AdminClientDetailsResponse>;
  createClient: (data: CreateClientRequest) => Promise<{ success: boolean; message: string; data?: any }>;
  updateClient: (clientId: string, data: UpdateClientRequest) => Promise<{ success: boolean; message: string; data?: any }>;
  deleteClient: (clientId: string, softDelete?: boolean) => Promise<{ success: boolean; message: string }>;
  resetClientPassword: (clientId: string, data: ResetPasswordRequest) => Promise<{ success: boolean; message: string }>;
  assignTrainer: (clientId: string, data: AssignTrainerRequest) => Promise<{ success: boolean; message: string; data?: any }>;
  getWorkoutStats: (clientId: string, params?: any) => Promise<WorkoutStatsResponse>;
  generateWorkoutPlan: (clientId: string, data: GenerateWorkoutPlanRequest) => Promise<GenerateWorkoutPlanResponse>;
  getMCPStatus: () => Promise<MCPStatusResponse>;
}

// Create admin client service
export const createAdminClientService = (axios: AxiosInstance): AdminClientServiceInterface => {
  return {
    getClients: async (filters: AdminClientFilters = {}) => {
      try {
        const params = new URLSearchParams();
        
        // Add filters as query parameters
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            params.append(key, value.toString());
          }
        });
        
        const response = await axios.get<AdminClientsResponse>(`/api/admin/clients?${params}`);
        return response.data;
      } catch (error) {
        console.error('Error fetching clients:', error);
        throw error;
      }
    },

    getClientDetails: async (clientId: string) => {
      try {
        const response = await axios.get<AdminClientDetailsResponse>(`/api/admin/clients/${clientId}`);
        return response.data;
      } catch (error) {
        console.error(`Error fetching client details for ${clientId}:`, error);
        throw error;
      }
    },

    createClient: async (data: CreateClientRequest) => {
      try {
        const response = await axios.post('/api/admin/clients', data);
        return response.data;
      } catch (error) {
        console.error('Error creating client:', error);
        throw error;
      }
    },

    updateClient: async (clientId: string, data: UpdateClientRequest) => {
      try {
        const response = await axios.put(`/api/admin/clients/${clientId}`, data);
        return response.data;
      } catch (error) {
        console.error(`Error updating client ${clientId}:`, error);
        throw error;
      }
    },

    deleteClient: async (clientId: string, softDelete: boolean = true) => {
      try {
        const response = await axios.delete(`/api/admin/clients/${clientId}`, {
          data: { softDelete }
        });
        return response.data;
      } catch (error) {
        console.error(`Error deleting client ${clientId}:`, error);
        throw error;
      }
    },

    resetClientPassword: async (clientId: string, data: ResetPasswordRequest) => {
      try {
        const response = await axios.post(`/api/admin/clients/${clientId}/reset-password`, data);
        return response.data;
      } catch (error) {
        console.error(`Error resetting password for client ${clientId}:`, error);
        throw error;
      }
    },

    assignTrainer: async (clientId: string, data: AssignTrainerRequest) => {
      try {
        const response = await axios.post(`/api/admin/clients/${clientId}/assign-trainer`, data);
        return response.data;
      } catch (error) {
        console.error(`Error assigning trainer to client ${clientId}:`, error);
        throw error;
      }
    },

    getWorkoutStats: async (clientId: string, params: any = {}) => {
      try {
        const queryParams = new URLSearchParams(params);
        const response = await axios.get<WorkoutStatsResponse>(`/api/admin/clients/${clientId}/workout-stats?${queryParams}`);
        return response.data;
      } catch (error) {
        console.error(`Error fetching workout stats for client ${clientId}:`, error);
        throw error;
      }
    },

    generateWorkoutPlan: async (clientId: string, data: GenerateWorkoutPlanRequest) => {
      try {
        const response = await axios.post<GenerateWorkoutPlanResponse>(`/api/admin/clients/${clientId}/generate-workout-plan`, data);
        return response.data;
      } catch (error) {
        console.error(`Error generating workout plan for client ${clientId}:`, error);
        throw error;
      }
    },

    getMCPStatus: async () => {
      try {
        const response = await axios.get<MCPStatusResponse>('/api/admin/mcp-status');
        return response.data;
      } catch (error) {
        console.error('Error fetching MCP status:', error);
        throw error;
      }
    }
  };
};

/**
 * Client-Trainer Assignment Service
 * ================================
 * Service for managing client-trainer assignments in the Universal Master Schedule
 * 
 * This service handles the complete client-trainer assignment lifecycle,
 * including creation, management, and permissions control as outlined in
 * The Grand Unifying Blueprint v43.2.
 * 
 * FEATURES:
 * - Create and manage client-trainer assignments
 * - Handle trainer permissions and access control
 * - Support for bulk assignment operations
 * - Real-time assignment updates
 * - Integration with session management
 * - Audit trail and assignment history
 */

import apiService from './api.service';
import {
  ClientTrainerAssignment,
  AssignmentRequest,
  ApiResponse,
  PaginatedResponse,
  Client,
  Trainer,
  BulkOperationRequest
} from '../components/UniversalMasterSchedule/types';

/**
 * Client-Trainer Assignment Service Class
 */
class ClientTrainerAssignmentService {
  private apiService: typeof apiService;
  
  constructor() {
    this.apiService = apiService;
  }
  
  // ==================== ASSIGNMENT CRUD OPERATIONS ====================
  
  /**
   * Get all client-trainer assignments
   * @param filters - Optional filters for assignments
   * @returns Promise<ClientTrainerAssignment[]>
   */
  async getAssignments(filters?: {
    clientId?: string;
    trainerId?: string;
    isActive?: boolean;
    assignedBy?: string;
  }): Promise<ClientTrainerAssignment[]> {
    try {
      const params = new URLSearchParams();
      
      if (filters?.clientId) params.append('clientId', filters.clientId);
      if (filters?.trainerId) params.append('trainerId', filters.trainerId);
      if (filters?.isActive !== undefined) params.append('isActive', filters.isActive.toString());
      if (filters?.assignedBy) params.append('assignedBy', filters.assignedBy);
      
      const queryString = params.toString();
      const url = `/api/client-trainer-assignments${queryString ? `?${queryString}` : ''}`;
      
      const response = await this.apiService.get<ClientTrainerAssignment[]>(url);
      return response.data;
    } catch (error) {
      console.error('Error fetching assignments:', error);
      throw error;
    }
  }
  
  /**
   * Get assignments for a specific client
   * @param clientId - Client ID
   * @returns Promise<ClientTrainerAssignment[]>
   */
  async getClientAssignments(clientId: string): Promise<ClientTrainerAssignment[]> {
    try {
      const response = await this.apiService.get<ClientTrainerAssignment[]>(
        `/api/client-trainer-assignments/client/${clientId}`
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching client assignments:', error);
      throw error;
    }
  }
  
  /**
   * Get assignments for a specific trainer
   * @param trainerId - Trainer ID
   * @returns Promise<ClientTrainerAssignment[]>
   */
  async getTrainerAssignments(trainerId: string): Promise<ClientTrainerAssignment[]> {
    try {
      const response = await this.apiService.get<ClientTrainerAssignment[]>(
        `/api/client-trainer-assignments/trainer/${trainerId}`
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching trainer assignments:', error);
      throw error;
    }
  }
  
  /**
   * Create a new client-trainer assignment
   * @param assignmentData - Assignment data
   * @returns Promise<ClientTrainerAssignment>
   */
  async createAssignment(assignmentData: AssignmentRequest): Promise<ClientTrainerAssignment> {
    try {
      const response = await this.apiService.post<ClientTrainerAssignment>(
        '/api/client-trainer-assignments',
        assignmentData
      );
      return response.data;
    } catch (error) {
      console.error('Error creating assignment:', error);
      throw error;
    }
  }
  
  /**
   * Update an existing assignment
   * @param assignmentId - Assignment ID
   * @param updateData - Update data
   * @returns Promise<ClientTrainerAssignment>
   */
  async updateAssignment(
    assignmentId: string, 
    updateData: Partial<AssignmentRequest>
  ): Promise<ClientTrainerAssignment> {
    try {
      const response = await this.apiService.put<ClientTrainerAssignment>(
        `/api/client-trainer-assignments/${assignmentId}`,
        updateData
      );
      return response.data;
    } catch (error) {
      console.error('Error updating assignment:', error);
      throw error;
    }
  }
  
  /**
   * Deactivate an assignment
   * @param assignmentId - Assignment ID
   * @returns Promise<void>
   */
  async deactivateAssignment(assignmentId: string): Promise<void> {
    try {
      await this.apiService.put(`/api/client-trainer-assignments/${assignmentId}/deactivate`);
    } catch (error) {
      console.error('Error deactivating assignment:', error);
      throw error;
    }
  }
  
  /**
   * Delete an assignment
   * @param assignmentId - Assignment ID
   * @returns Promise<void>
   */
  async deleteAssignment(assignmentId: string): Promise<void> {
    try {
      await this.apiService.delete(`/api/client-trainer-assignments/${assignmentId}`);
    } catch (error) {
      console.error('Error deleting assignment:', error);
      throw error;
    }
  }
  
  // ==================== ASSIGNMENT OPERATIONS ====================
  
  /**
   * Assign a client to a trainer
   * @param clientId - Client ID
   * @param trainerId - Trainer ID
   * @param notes - Optional notes
   * @returns Promise<ClientTrainerAssignment>
   */
  async assignClientToTrainer(
    clientId: string,
    trainerId: string,
    notes?: string
  ): Promise<ClientTrainerAssignment> {
    return this.createAssignment({ clientId, trainerId, notes });
  }
  
  /**
   * Reassign a client to a different trainer
   * @param clientId - Client ID
   * @param newTrainerId - New trainer ID
   * @param notes - Optional notes
   * @returns Promise<ClientTrainerAssignment>
   */
  async reassignClient(
    clientId: string,
    newTrainerId: string,
    notes?: string
  ): Promise<ClientTrainerAssignment> {
    try {
      // First, deactivate existing assignments for this client
      const existingAssignments = await this.getClientAssignments(clientId);
      const activeAssignments = existingAssignments.filter(a => a.isActive);
      
      // Deactivate all active assignments
      await Promise.all(
        activeAssignments.map(assignment => 
          this.deactivateAssignment(assignment.id)
        )
      );
      
      // Create new assignment
      return this.createAssignment({
        clientId,
        trainerId: newTrainerId,
        notes: notes || 'Client reassigned'
      });
    } catch (error) {
      console.error('Error reassigning client:', error);
      throw error;
    }
  }
  
  /**
   * Unassign a client from all trainers
   * @param clientId - Client ID
   * @returns Promise<void>
   */
  async unassignClient(clientId: string): Promise<void> {
    try {
      const assignments = await this.getClientAssignments(clientId);
      const activeAssignments = assignments.filter(a => a.isActive);
      
      await Promise.all(
        activeAssignments.map(assignment => 
          this.deactivateAssignment(assignment.id)
        )
      );
    } catch (error) {
      console.error('Error unassigning client:', error);
      throw error;
    }
  }
  
  /**
   * Get unassigned clients
   * @returns Promise<Client[]>
   */
  async getUnassignedClients(): Promise<Client[]> {
    try {
      const response = await this.apiService.get<Client[]>(
        '/api/client-trainer-assignments/unassigned-clients'
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching unassigned clients:', error);
      throw error;
    }
  }
  
  /**
   * Get clients assigned to a specific trainer
   * @param trainerId - Trainer ID
   * @returns Promise<Client[]>
   */
  async getTrainerClients(trainerId: string): Promise<Client[]> {
    try {
      const response = await this.apiService.get<Client[]>(
        `/api/client-trainer-assignments/trainer/${trainerId}/clients`
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching trainer clients:', error);
      throw error;
    }
  }
  
  /**
   * Get the trainer assigned to a specific client
   * @param clientId - Client ID
   * @returns Promise<Trainer | null>
   */
  async getClientTrainer(clientId: string): Promise<Trainer | null> {
    try {
      const response = await this.apiService.get<Trainer>(
        `/api/client-trainer-assignments/client/${clientId}/trainer`
      );
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        return null; // No trainer assigned
      }
      console.error('Error fetching client trainer:', error);
      throw error;
    }
  }
  
  // ==================== BULK OPERATIONS ====================
  
  /**
   * Bulk assign multiple clients to a trainer
   * @param clientIds - Array of client IDs
   * @param trainerId - Trainer ID
   * @param notes - Optional notes
   * @returns Promise<ClientTrainerAssignment[]>
   */
  async bulkAssignClients(
    clientIds: string[],
    trainerId: string,
    notes?: string
  ): Promise<ClientTrainerAssignment[]> {
    try {
      const response = await this.apiService.post<ClientTrainerAssignment[]>(
        '/api/client-trainer-assignments/bulk-assign',
        {
          clientIds,
          trainerId,
          notes
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error bulk assigning clients:', error);
      throw error;
    }
  }
  
  /**
   * Bulk reassign multiple clients to a new trainer
   * @param clientIds - Array of client IDs
   * @param newTrainerId - New trainer ID
   * @param notes - Optional notes
   * @returns Promise<ClientTrainerAssignment[]>
   */
  async bulkReassignClients(
    clientIds: string[],
    newTrainerId: string,
    notes?: string
  ): Promise<ClientTrainerAssignment[]> {
    try {
      const response = await this.apiService.post<ClientTrainerAssignment[]>(
        '/api/client-trainer-assignments/bulk-reassign',
        {
          clientIds,
          newTrainerId,
          notes
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error bulk reassigning clients:', error);
      throw error;
    }
  }
  
  /**
   * Bulk unassign multiple clients
   * @param clientIds - Array of client IDs
   * @returns Promise<void>
   */
  async bulkUnassignClients(clientIds: string[]): Promise<void> {
    try {
      await this.apiService.post('/api/client-trainer-assignments/bulk-unassign', {
        clientIds
      });
    } catch (error) {
      console.error('Error bulk unassigning clients:', error);
      throw error;
    }
  }
  
  // ==================== ASSIGNMENT STATISTICS ====================
  
  /**
   * Get assignment statistics
   * @returns Promise<AssignmentStats>
   */
  async getAssignmentStatistics(): Promise<{
    totalAssignments: number;
    activeAssignments: number;
    unassignedClients: number;
    trainersWithClients: number;
    averageClientsPerTrainer: number;
    recentAssignments: ClientTrainerAssignment[];
  }> {
    try {
      const response = await this.apiService.get<any>(
        '/api/client-trainer-assignments/statistics'
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching assignment statistics:', error);
      throw error;
    }
  }
  
  /**
   * Get assignment history for a client
   * @param clientId - Client ID
   * @returns Promise<ClientTrainerAssignment[]>
   */
  async getClientAssignmentHistory(clientId: string): Promise<ClientTrainerAssignment[]> {
    try {
      const response = await this.apiService.get<ClientTrainerAssignment[]>(
        `/api/client-trainer-assignments/client/${clientId}/history`
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching client assignment history:', error);
      throw error;
    }
  }
  
  /**
   * Get assignment history for a trainer
   * @param trainerId - Trainer ID
   * @returns Promise<ClientTrainerAssignment[]>
   */
  async getTrainerAssignmentHistory(trainerId: string): Promise<ClientTrainerAssignment[]> {
    try {
      const response = await this.apiService.get<ClientTrainerAssignment[]>(
        `/api/client-trainer-assignments/trainer/${trainerId}/history`
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching trainer assignment history:', error);
      throw error;
    }
  }
  
  // ==================== VALIDATION AND UTILITIES ====================
  
  /**
   * Validate assignment data
   * @param assignmentData - Assignment data to validate
   * @returns ValidationResult
   */
  validateAssignmentData(assignmentData: AssignmentRequest): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    
    if (!assignmentData.clientId) {
      errors.push('Client ID is required');
    }
    
    if (!assignmentData.trainerId) {
      errors.push('Trainer ID is required');
    }
    
    if (assignmentData.clientId === assignmentData.trainerId) {
      errors.push('Client and trainer cannot be the same person');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Check if a client is assigned to a trainer
   * @param clientId - Client ID
   * @param trainerId - Trainer ID
   * @returns Promise<boolean>
   */
  async isClientAssignedToTrainer(clientId: string, trainerId: string): Promise<boolean> {
    try {
      const assignments = await this.getClientAssignments(clientId);
      return assignments.some(a => a.trainerId === trainerId && a.isActive);
    } catch (error) {
      console.error('Error checking client assignment:', error);
      return false;
    }
  }
  
  /**
   * Get assignment conflicts (multiple active assignments)
   * @returns Promise<ClientTrainerAssignment[]>
   */
  async getAssignmentConflicts(): Promise<ClientTrainerAssignment[]> {
    try {
      const response = await this.apiService.get<ClientTrainerAssignment[]>(
        '/api/client-trainer-assignments/conflicts'
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching assignment conflicts:', error);
      throw error;
    }
  }
  
  // ==================== REAL-TIME UPDATES ====================
  
  /**
   * Subscribe to assignment updates
   * @param callback - Callback function for updates
   * @returns Unsubscribe function
   */
  subscribeToAssignmentUpdates(callback: (assignment: ClientTrainerAssignment) => void): () => void {
    // TODO: Implement WebSocket subscription
    console.log('WebSocket subscription for assignments not yet implemented');
    return () => {};
  }
  
  /**
   * Notify assignment update
   * @param assignmentId - Assignment ID
   * @param updateType - Type of update
   */
  private notifyAssignmentUpdate(
    assignmentId: string, 
    updateType: 'created' | 'updated' | 'deleted'
  ): void {
    // TODO: Implement WebSocket notification
    console.log(`Assignment ${updateType}: ${assignmentId}`);
  }
}

// Export singleton instance
export const clientTrainerAssignmentService = new ClientTrainerAssignmentService();
export default clientTrainerAssignmentService;
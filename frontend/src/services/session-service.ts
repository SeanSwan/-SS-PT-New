/**
 * Session Service
 * 
 * This service handles all session-related operations including fetching sessions,
 * booking sessions, and managing session packages.
 */

import { axiosInstance, authAxiosInstance } from '../utils/axiosConfig';

// Types
export interface Session {
  id: string;
  sessionDate: string;
  duration: number;
  userId: string | null;
  trainerId: string | null;
  location: string | null;
  notes: string | null;
  status: 'available' | 'assigned' | 'requested' | 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
  client?: any;
  trainer?: any;
  confirmed: boolean;
  cancellationReason?: string;
  cancelledBy?: string;
  sessionDeducted: boolean;
  deductionDate?: string;
  assignedAt?: string;
  assignedBy?: string;
}

export interface SessionPackage {
  id: string;
  name: string;
  description: string;
  sessions: number;
  price: number;
  savings: number;
  popular: boolean;
}

export interface SessionServiceResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

class SessionService {
  /**
   * Get all available session packages
   */
  async getSessionPackages(): Promise<SessionServiceResponse<SessionPackage[]>> {
    try {
      const response = await axiosInstance.get('/api/session-packages');
      return {
        success: true,
        message: 'Session packages fetched successfully',
        data: response.data
      };
    } catch (error: any) {
      console.error('Error fetching session packages:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch session packages',
        error: error.message
      };
    }
  }

  /**
   * Purchase a session package
   * @param packageId The ID of the package to purchase
   */
  async purchaseSessionPackage(packageId: string): Promise<SessionServiceResponse<{checkoutUrl: string}>> {
    try {
      const response = await authAxiosInstance.post('/api/session-packages/purchase', { packageId });
      return {
        success: true,
        message: 'Package purchase initiated',
        data: {
          checkoutUrl: response.data.checkoutUrl
        }
      };
    } catch (error: any) {
      console.error('Error purchasing session package:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to purchase session package',
        error: error.message
      };
    }
  }

  /**
   * Get sessions with optional filtering
   * @param filters Optional filters
   */
  async getSessions(filters: any = {}): Promise<SessionServiceResponse<Session[]>> {
    try {
      const response = await authAxiosInstance.get('/api/sessions', { params: filters });
      return {
        success: true,
        message: 'Sessions fetched successfully',
        data: response.data
      };
    } catch (error: any) {
      console.error('Error fetching sessions:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch sessions',
        error: error.message
      };
    }
  }

  /**
   * Book an available session
   * @param sessionId The ID of the session to book
   */
  async bookSession(sessionId: string): Promise<SessionServiceResponse<Session>> {
    try {
      const response = await authAxiosInstance.post('/api/sessions/book', { sessionId });
      return {
        success: true,
        message: response.data.message || 'Session booked successfully',
        data: response.data.session
      };
    } catch (error: any) {
      console.error('Error booking session:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to book session',
        error: error.message
      };
    }
  }

  /**
   * Cancel a booked session
   * @param sessionId The ID of the session to cancel
   * @param reason Optional reason for cancellation
   */
  async cancelSession(sessionId: string, reason?: string): Promise<SessionServiceResponse<Session>> {
    try {
      const response = await authAxiosInstance.post(`/api/sessions/${sessionId}/cancel`, { reason });
      return {
        success: true,
        message: response.data.message || 'Session cancelled successfully',
        data: response.data.session
      };
    } catch (error: any) {
      console.error('Error cancelling session:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to cancel session',
        error: error.message
      };
    }
  }

  /**
   * Request a custom session
   * @param sessionData Data for the requested session
   */
  async requestSession(sessionData: any): Promise<SessionServiceResponse<Session>> {
    try {
      const response = await authAxiosInstance.post('/api/sessions/request', sessionData);
      return {
        success: true,
        message: response.data.message || 'Session requested successfully',
        data: response.data.session
      };
    } catch (error: any) {
      console.error('Error requesting session:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to request session',
        error: error.message
      };
    }
  }

  /**
   * Add sessions via session packages (admin only)
   * @param clientId The ID of the client
   * @param sessions Number of sessions to add
   * @param notes Optional admin notes
   */
  async addSessionsViaPackage(clientId: string, sessions: number, notes?: string): Promise<SessionServiceResponse<any>> {
    try {
      const response = await authAxiosInstance.post('/api/session-packages/add-sessions', {
        clientId,
        sessions,
        notes
      });
      return {
        success: true,
        message: response.data.message || 'Sessions added successfully',
        data: response.data.user
      };
    } catch (error: any) {
      console.error('Error adding sessions to client:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to add sessions',
        error: error.message
      };
    }
  }

  /**
   * Create a test client (development only)
   */
  async createTestClient(): Promise<SessionServiceResponse<any>> {
    try {
      const response = await authAxiosInstance.post('/api/test/create-client');
      return {
        success: true,
        message: 'Test client created successfully',
        data: response.data.client
      };
    } catch (error: any) {
      console.error('Error creating test client:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to create test client',
        error: error.message
      };
    }
  }

  /**
   * Add sessions to a test client (development only)
   * @param clientId The ID of the test client
   * @param sessions Number of sessions to add
   */
  async addSessionsToTestClient(clientId: string, sessions: number): Promise<SessionServiceResponse<any>> {
    try {
      const response = await authAxiosInstance.post('/api/test/add-sessions', {
        clientId,
        sessions
      });
      return {
        success: true,
        message: 'Sessions added to test client successfully',
        data: response.data.client
      };
    } catch (error: any) {
      console.error('Error adding sessions to test client:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to add sessions to test client',
        error: error.message
      };
    }
  }

  /**
   * ADMIN: Manually allocate sessions from completed order
   */
  async allocateSessionsFromOrder(orderId: number, userId: number): Promise<SessionServiceResponse<any>> {
    try {
      const response = await authAxiosInstance.post('/api/sessions/allocate-from-order', {
        orderId,
        userId
      });
      
      return {
        success: true,
        message: response.data.message || 'Sessions allocated successfully',
        data: response.data.data
      };
    } catch (error: any) {
      console.error('Error allocating sessions from order:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to allocate sessions',
        error: error.message
      };
    }
  }

  /**
   * ADMIN: Manually add sessions to user
   */
  async addSessionsToClient(userId: string, sessionCount: number, reason?: string): Promise<SessionServiceResponse<any>> {
    try {
      const response = await authAxiosInstance.post('/api/sessions/add-to-user', {
        userId,
        sessionCount,
        reason: reason || 'Manually added by admin'
      });
      
      return {
        success: true,
        message: response.data.message || 'Sessions added successfully',
        data: response.data.data
      };
    } catch (error: any) {
      console.error('Error adding sessions to client:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to add sessions',
        error: error.message
      };
    }
  }

  /**
   * ADMIN: Get session summary for specific user
   */
  async getUserSessionSummary(userId: string): Promise<SessionServiceResponse<any>> {
    try {
      const response = await authAxiosInstance.get(`/api/sessions/user-summary/${userId}`);
      
      return {
        success: true,
        message: 'Session summary retrieved successfully',
        data: response.data.data
      };
    } catch (error: any) {
      console.error('Error getting user session summary:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to get session summary',
        error: error.message
      };
    }
  }

  /**
   * ADMIN: Check session allocation service health
   */
  async checkAllocationHealth(): Promise<SessionServiceResponse<any>> {
    try {
      const response = await authAxiosInstance.get('/api/sessions/allocation-health');
      
      return {
        success: true,
        message: 'Health check completed',
        data: response.data.data
      };
    } catch (error: any) {
      console.error('Error checking allocation health:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Health check failed',
        error: error.message
      };
    }
  }

  /**
   * TRAINER ASSIGNMENT METHODS
   * ==========================
   * Enhanced trainer assignment system for client-trainer relationship management
   */

  /**
   * ADMIN: Assign trainer to client sessions
   * @param trainerId The ID of the trainer
   * @param clientId The ID of the client
   * @param sessionIds Optional array of specific session IDs (assigns all available if empty)
   */
  async assignTrainerToClient(trainerId: string, clientId: string, sessionIds?: string[]): Promise<SessionServiceResponse<any>> {
    try {
      const response = await authAxiosInstance.post('/api/sessions/assign-trainer', {
        trainerId,
        clientId,
        sessionIds: sessionIds || []
      });
      
      return {
        success: true,
        message: response.data.message || 'Trainer assigned successfully',
        data: response.data.data
      };
    } catch (error: any) {
      console.error('Error assigning trainer to client:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to assign trainer',
        error: error.message
      };
    }
  }

  /**
   * Get trainer assignments (for trainer dashboard)
   * @param trainerId The ID of the trainer
   */
  async getTrainerAssignments(trainerId: string): Promise<SessionServiceResponse<any>> {
    try {
      const response = await authAxiosInstance.get(`/api/sessions/trainer-assignments/${trainerId}`);
      
      return {
        success: true,
        message: 'Trainer assignments retrieved successfully',
        data: response.data.data
      };
    } catch (error: any) {
      console.error('Error getting trainer assignments:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to get trainer assignments',
        error: error.message
      };
    }
  }

  /**
   * Get client assignments (for client dashboard)
   * @param clientId The ID of the client
   */
  async getClientAssignments(clientId: string): Promise<SessionServiceResponse<any>> {
    try {
      const response = await authAxiosInstance.get(`/api/sessions/client-assignments/${clientId}`);
      
      return {
        success: true,
        message: 'Client assignments retrieved successfully',
        data: response.data.data
      };
    } catch (error: any) {
      console.error('Error getting client assignments:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to get client assignments',
        error: error.message
      };
    }
  }

  /**
   * ADMIN: Remove trainer assignment from sessions
   * @param sessionIds Array of session IDs to unassign
   */
  async removeTrainerAssignment(sessionIds: string[]): Promise<SessionServiceResponse<any>> {
    try {
      const response = await authAxiosInstance.post('/api/sessions/remove-trainer-assignment', {
        sessionIds
      });
      
      return {
        success: true,
        message: response.data.message || 'Trainer assignment removed successfully',
        data: response.data.data
      };
    } catch (error: any) {
      console.error('Error removing trainer assignment:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to remove trainer assignment',
        error: error.message
      };
    }
  }

  /**
   * ADMIN: Get assignment statistics for dashboard
   */
  async getAssignmentStatistics(): Promise<SessionServiceResponse<any>> {
    try {
      const response = await authAxiosInstance.get('/api/sessions/assignment-statistics');
      
      return {
        success: true,
        message: 'Assignment statistics retrieved successfully',
        data: response.data.data
      };
    } catch (error: any) {
      console.error('Error getting assignment statistics:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to get assignment statistics',
        error: error.message
      };
    }
  }

  /**
   * ADMIN: Check trainer assignment service health
   */
  async checkTrainerAssignmentHealth(): Promise<SessionServiceResponse<any>> {
    try {
      const response = await authAxiosInstance.get('/api/sessions/trainer-assignment-health');
      
      return {
        success: true,
        message: 'Trainer assignment health check completed',
        data: response.data.data
      };
    } catch (error: any) {
      console.error('Error checking trainer assignment health:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Trainer assignment health check failed',
        error: error.message
      };
    }
  }
}

export default new SessionService();

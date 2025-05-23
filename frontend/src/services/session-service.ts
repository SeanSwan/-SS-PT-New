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
  status: 'available' | 'requested' | 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
  client?: any;
  trainer?: any;
  confirmed: boolean;
  cancellationReason?: string;
  cancelledBy?: string;
  sessionDeducted: boolean;
  deductionDate?: string;
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
   * Add sessions to a client (admin only)
   * @param clientId The ID of the client
   * @param sessions Number of sessions to add
   * @param notes Optional admin notes
   */
  async addSessionsToClient(clientId: string, sessions: number, notes?: string): Promise<SessionServiceResponse<any>> {
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
}

export default new SessionService();

/**
 * Universal Master Schedule Service
 * ===============================
 * Production-ready service connecting to the enhanced backend API
 * Supports unified data sharing across Admin, Trainer, and Client dashboards
 * 
 * Features:
 * - Real-time session management with drag-and-drop
 * - Bulk operations for efficient admin workflows  
 * - Statistics and analytics for dashboard insights
 * - Role-based data access with unified data flow
 * - Cross-dashboard data synchronization
 * 
 * Part of Universal Dashboard Architecture - Phase 2 Implementation
 */

import axios, { AxiosResponse } from 'axios';
// Note: Toast notifications are handled by the service internally using react-hot-toast

// Import types from Universal Master Schedule
import type {
  Session,
  SessionEvent, 
  Client,
  Trainer,
  FilterOptions,
  ScheduleStats,
  BulkOperationRequest,
  ApiResponse,
  PaginatedResponse
} from '../components/UniversalMasterSchedule/types';

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:10000';

/**
 * Create axios instance with auth headers
 */
function createApiClient() {
  const token = localStorage.getItem('token');
  
  return axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    },
    timeout: 30000
  });
}

/**
 * Universal Master Schedule Service Class
 * Handles all scheduling operations with role-based access
 */
class UniversalMasterScheduleService {
  private api = createApiClient();

  // ==================== SESSION MANAGEMENT ====================

  /**
   * Get all sessions with comprehensive filtering
   * Role-based access: Admin sees all, Trainer sees assigned, Client sees own + available
   */
  async getSessions(filters?: FilterOptions): Promise<Session[]> {
    try {
      const params = new URLSearchParams();
      
      if (filters?.customDateStart) params.append('startDate', filters.customDateStart);
      if (filters?.customDateEnd) params.append('endDate', filters.customDateEnd);
      if (filters?.status && filters.status !== 'all') params.append('status', filters.status);
      if (filters?.trainerId) params.append('trainerId', filters.trainerId);
      if (filters?.clientId) params.append('clientId', filters.clientId);
      if (filters?.location) params.append('location', filters.location);
      if (filters?.searchTerm) params.append('search', filters.searchTerm);
      
      const response: AxiosResponse<Session[]> = await this.api.get(`/api/sessions?${params.toString()}`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching sessions:', error);
      // Error will be caught by component
      throw error;
    }
  }

  /**
   * Get sessions formatted for calendar display
   * Optimized for React Big Calendar integration
   */
  async getCalendarEvents(start: string, end: string, filters?: { trainerId?: string; clientId?: string }): Promise<SessionEvent[]> {
    try {
      const params = new URLSearchParams();
      params.append('start', start);
      params.append('end', end);
      
      if (filters?.trainerId) params.append('trainerId', filters.trainerId);
      if (filters?.clientId) params.append('clientId', filters.clientId);
      
      const response: AxiosResponse<ApiResponse<SessionEvent[]>> = await this.api.get(`/api/sessions/calendar-events?${params.toString()}`);
      
      if (response.data.success) {
        return response.data.data || [];
      } else {
        throw new Error('Failed to fetch calendar events');
      }
    } catch (error: any) {
      console.error('Error fetching calendar events:', error);
      // Error will be caught by component
      return []; // Return empty array for graceful degradation
    }
  }

  /**
   * Create a new session
   * Admin-only operation
   */
  async createSession(sessionData: Partial<Session>): Promise<Session> {
    try {
      const response: AxiosResponse<{ message: string; session: Session }> = await this.api.post('/api/sessions', sessionData);
      // Success feedback handled by component
      return response.data.session;
    } catch (error: any) {
      console.error('Error creating session:', error);
      // Error will be caught by component
      throw error;
    }
  }

  /**
   * Update a session (regular update)
   */
  async updateSession(sessionId: string, updates: Partial<Session>): Promise<Session> {
    try {
      const response: AxiosResponse<{ message: string; session: Session }> = await this.api.put(`/api/sessions/${sessionId}`, updates);
      // Success feedback handled by component
      return response.data.session;
    } catch (error: any) {
      console.error('Error updating session:', error);
      // Error will be caught by component
      throw error;
    }
  }

  /**
   * Optimized drag-and-drop session update
   * For real-time calendar interactions
   */
  async dragDropUpdate(sessionId: string, changes: { 
    sessionDate?: string; 
    duration?: number; 
    trainerId?: string | null; 
    userId?: string | null; 
  }): Promise<Session> {
    try {
      const response: AxiosResponse<ApiResponse<Session>> = await this.api.put(`/api/sessions/drag-drop/${sessionId}`, changes);
      
      if (response.data.success) {
        // Success feedback handled by component
        return response.data.data!;
      } else {
        throw new Error(response.data.message || 'Drag-drop update failed');
      }
    } catch (error: any) {
      console.error('Error in drag-drop update:', error);
      // Error will be caught by component
      throw error;
    }
  }

  /**
   * Delete a session
   */
  async deleteSession(sessionId: string): Promise<void> {
    try {
      await this.api.delete(`/api/sessions/cancel/${sessionId}`);
      // Success feedback handled by component
    } catch (error: any) {
      console.error('Error deleting session:', error);
      // Error will be caught by component
      throw error;
    }
  }

  // ==================== BULK OPERATIONS ====================

  /**
   * Update multiple sessions simultaneously
   * Perfect for bulk scheduling operations
   */
  async bulkUpdateSessions(updates: Array<{ id: string; [key: string]: any }>): Promise<{
    updated: Session[];
    errors: Array<{ id: string; error: string }>;
  }> {
    try {
      const response: AxiosResponse<ApiResponse<{
        updated: Session[];
        errors: Array<{ id: string; error: string }>;
      }>> = await this.api.post('/api/sessions/bulk-update', { updates });
      
      if (response.data.success) {
        const result = response.data.data!;
        // Success feedback handled by component
        
        return result;
      } else {
        throw new Error(response.data.message || 'Bulk update failed');
      }
    } catch (error: any) {
      console.error('Error in bulk update:', error);
      // Error will be caught by component
      throw error;
    }
  }

  /**
   * Assign trainer to multiple sessions
   */
  async bulkAssignTrainer(sessionIds: string[], trainerId: string): Promise<{
    updatedSessions: Session[];
    trainer: { id: string; firstName: string; lastName: string };
  }> {
    try {
      const response: AxiosResponse<ApiResponse<{
        updatedSessions: Session[];
        trainer: { id: string; firstName: string; lastName: string };
      }>> = await this.api.post('/api/sessions/bulk-assign-trainer', { sessionIds, trainerId });
      
      if (response.data.success) {
        const result = response.data.data!;
        // Success feedback handled by component
        return result;
      } else {
        throw new Error(response.data.message || 'Bulk trainer assignment failed');
      }
    } catch (error: any) {
      console.error('Error in bulk trainer assignment:', error);
      // Error will be caught by component
      throw error;
    }
  }

  /**
   * Delete multiple sessions
   */
  async bulkDeleteSessions(sessionIds: string[]): Promise<{
    deletedCount: number;
    deletedIds: string[];
  }> {
    try {
      const response: AxiosResponse<ApiResponse<{
        deletedCount: number;
        deletedIds: string[];
      }>> = await this.api.post('/api/sessions/bulk-delete', { sessionIds });
      
      if (response.data.success) {
        const result = response.data.data!;
        // Success feedback handled by component
        return result;
      } else {
        throw new Error(response.data.message || 'Bulk delete failed');
      }
    } catch (error: any) {
      console.error('Error in bulk delete:', error);
      // Error will be caught by component
      throw error;
    }
  }

  // ==================== STATISTICS & ANALYTICS ====================

  /**
   * Get comprehensive session statistics
   * Powers dashboard analytics across all roles
   */
  async getStatistics(filters?: {
    customDateStart?: string;
    customDateEnd?: string;
    trainerId?: string;
  }): Promise<ScheduleStats> {
    try {
      const params = new URLSearchParams();
      
      if (filters?.customDateStart) params.append('startDate', filters.customDateStart);
      if (filters?.customDateEnd) params.append('endDate', filters.customDateEnd);
      if (filters?.trainerId) params.append('trainerId', filters.trainerId);
      
      const response: AxiosResponse<ApiResponse<ScheduleStats>> = await this.api.get(`/api/sessions/statistics?${params.toString()}`);
      
      if (response.data.success) {
        return response.data.data!;
      } else {
        throw new Error('Failed to fetch statistics');
      }
    } catch (error: any) {
      console.error('Error fetching statistics:', error);
      // Error will be caught by component
      throw error;
    }
  }

  /**
   * Get utilization statistics by time period
   */
  async getUtilizationStats(period: 'day' | 'week' | 'month' = 'week', trainerId?: string): Promise<{
    utilizationData: Array<{ period: string; [status: string]: any }>;
    period: string;
    dateRange: { start: string; end: string };
  }> {
    try {
      const params = new URLSearchParams();
      params.append('period', period);
      
      if (trainerId) params.append('trainerId', trainerId);
      
      const response: AxiosResponse<ApiResponse<{
        utilizationData: Array<{ period: string; [status: string]: any }>;
        period: string;
        dateRange: { start: string; end: string };
      }>> = await this.api.get(`/api/sessions/utilization-stats?${params.toString()}`);
      
      if (response.data.success) {
        return response.data.data!;
      } else {
        throw new Error('Failed to fetch utilization stats');
      }
    } catch (error: any) {
      console.error('Error fetching utilization stats:', error);
      // Error will be caught by component
      throw error;
    }
  }

  // ==================== USER MANAGEMENT ====================

  /**
   * Get all clients for dropdown selection
   * Role-based: Admin sees all, Trainer sees assigned clients
   */
  async getClients(): Promise<Client[]> {
    try {
      const response: AxiosResponse<Client[]> = await this.api.get('/api/sessions/clients');
      return response.data;
    } catch (error: any) {
      console.error('Error fetching clients:', error);
      // Error will be caught by component
      return [];
    }
  }

  /**
   * Get all trainers for dropdown selection
   */
  async getTrainers(): Promise<Trainer[]> {
    try {
      const response: AxiosResponse<Trainer[]> = await this.api.get('/api/sessions/trainers');
      return response.data;
    } catch (error: any) {
      console.error('Error fetching trainers:', error);
      // Error will be caught by component
      return [];
    }
  }

  // ==================== CLIENT BOOKING OPERATIONS ====================

  /**
   * Book a session (Client/Admin operation)
   */
  async bookSession(sessionId: string, userId: string): Promise<Session> {
    try {
      const response: AxiosResponse<{ message: string; session: Session }> = await this.api.post(`/api/sessions/book/${userId}`, { sessionId });
      // Success feedback handled by component
      return response.data.session;
    } catch (error: any) {
      console.error('Error booking session:', error);
      // Error will be caught by component
      throw error;
    }
  }

  /**
   * Cancel a session (Client/Admin operation)
   */
  async cancelSession(sessionId: string, reason?: string): Promise<void> {
    try {
      await this.api.delete(`/api/sessions/cancel/${sessionId}`, { data: { reason } });
      // Success feedback handled by component
    } catch (error: any) {
      console.error('Error cancelling session:', error);
      // Error will be caught by component
      throw error;
    }
  }

  /**
   * Reschedule a session (Client/Admin operation)
   */
  async rescheduleSession(sessionId: string, newSessionDate: string): Promise<Session> {
    try {
      const response: AxiosResponse<{ message: string; session: Session }> = await this.api.put(`/api/sessions/reschedule/${sessionId}`, { newSessionDate });
      // Success feedback handled by component
      return response.data.session;
    } catch (error: any) {
      console.error('Error rescheduling session:', error);
      // Error will be caught by component
      throw error;
    }
  }

  // ==================== ADMIN OPERATIONS ====================

  /**
   * Create multiple available sessions (Admin)
   */
  async createAvailableSlots(slots: Array<{
    date: string;
    duration?: number;
    trainerId?: string;
    location?: string;
  }>): Promise<{ message: string; slots: Session[] }> {
    try {
      const response: AxiosResponse<{ message: string; slots: Session[] }> = await this.api.post('/api/sessions/available', { slots });
      // Success feedback handled by component
      return response.data;
    } catch (error: any) {
      console.error('Error creating available slots:', error);
      // Error will be caught by component
      throw error;
    }
  }

  /**
   * Create recurring available sessions (Admin)
   */
  async createRecurringSlots(config: {
    startDate: string;
    endDate: string;
    daysOfWeek: number[];
    times: string[];
    trainerId?: string;
    location?: string;
    duration?: number;
  }): Promise<{ message: string; count: number }> {
    try {
      const response: AxiosResponse<{ message: string; count: number }> = await this.api.post('/api/sessions/recurring', config);
      // Success feedback handled by component
      return response.data;
    } catch (error: any) {
      console.error('Error creating recurring slots:', error);
      // Error will be caught by component
      throw error;
    }
  }

  // ==================== ROLE-BASED DATA ACCESS ====================

  /**
   * Get user-specific session data based on role
   * Implements unified data sharing with role-based filtering
   */
  async getUserSessionData(userId: string, role: 'admin' | 'trainer' | 'client'): Promise<{
    sessions: Session[];
    statistics: ScheduleStats;
    accessLevel: string;
  }> {
    try {
      // Role-based data fetching
      let sessions: Session[] = [];
      let stats: ScheduleStats;

      switch (role) {
        case 'admin':
          // Admin sees everything
          sessions = await this.getSessions();
          stats = await this.getStatistics();
          break;
          
        case 'trainer':
          // Trainer sees their assigned sessions
          sessions = await this.getSessions({ trainerId: userId });
          stats = await this.getStatistics({ trainerId: userId });
          break;
          
        case 'client':
          // Client sees their sessions + available ones
          const [userSessions, availableSessions] = await Promise.all([
            this.getSessions({ clientId: userId }),
            this.getSessions({ status: 'available' })
          ]);
          sessions = [...userSessions, ...availableSessions];
          stats = await this.getStatistics(); // Basic stats for context
          break;
          
        default:
          throw new Error('Invalid user role');
      }

      return {
        sessions,
        statistics: stats,
        accessLevel: role
      };
    } catch (error: any) {
      console.error('Error fetching user session data:', error);
      throw error;
    }
  }

  // ==================== REAL-TIME SYNCHRONIZATION ====================

  /**
   * Sync data across all open dashboards
   * Call this after any session modification to ensure data consistency
   */
  async syncDashboardData(): Promise<void> {
    try {
      // Emit custom event for dashboard synchronization
      const event = new CustomEvent('dashboardDataSync', {
        detail: {
          timestamp: new Date().toISOString(),
          source: 'UniversalMasterScheduleService'
        }
      });
      
      window.dispatchEvent(event);
    } catch (error: any) {
      console.error('Error syncing dashboard data:', error);
    }
  }

  // ==================== ERROR HANDLING & RECOVERY ====================

  /**
   * Health check for service connectivity
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.api.get('/health');
      return response.status === 200;
    } catch (error) {
      console.warn('Universal Master Schedule service health check failed:', error);
      return false;
    }
  }

  /**
   * Retry failed operations with exponential backoff
   */
  async retryOperation<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: any;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (attempt === maxRetries) {
          break;
        }
        
        const delay = baseDelay * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError;
  }
}

// ==================== SINGLETON EXPORT ====================

/**
 * Export singleton instance for consistent usage across app
 */
export const universalMasterScheduleService = new UniversalMasterScheduleService();

/**
 * Export class for testing and custom instantiation
 */
export { UniversalMasterScheduleService };

/**
 * Export default for standard imports
 */
export default universalMasterScheduleService;

// ==================== CROSS-DASHBOARD DATA SYNC UTILITIES ====================

/**
 * Setup dashboard sync listener
 * Call this in your main dashboard components to listen for data updates
 */
export function setupDashboardSync(callback: () => void): () => void {
  const handleSync = () => callback();
  
  window.addEventListener('dashboardDataSync', handleSync);
  
  // Return cleanup function
  return () => {
    window.removeEventListener('dashboardDataSync', handleSync);
  };
}

/**
 * Trigger dashboard sync from any component
 * Call this after making changes that should be reflected across dashboards
 */
export function triggerDashboardSync(): void {
  universalMasterScheduleService.syncDashboardData();
}

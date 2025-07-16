/**
 * Enhanced Session Service
 * =======================
 * Service for managing sessions in the Universal Master Schedule
 * 
 * This service provides comprehensive session management capabilities
 * including drag-and-drop operations, bulk actions, and real-time updates
 * for the Universal Master Schedule component.
 * 
 * FEATURES:
 * - Session CRUD operations with drag-and-drop support
 * - Bulk session operations for admin efficiency
 * - Real-time session updates and notifications
 * - Session statistics and analytics
 * - Client session count management
 * - Trainer assignment integration
 * - Session history and audit trail
 */

import { ApiService } from './api.service';
import {
  Session,
  SessionRequest,
  SessionEvent,
  DragDropEventData,
  BulkOperationRequest,
  BulkActionType,
  ApiResponse,
  PaginatedResponse,
  ScheduleStats,
  FilterOptions
} from '../components/UniversalMasterSchedule/types';

/**
 * Enhanced Session Service Class
 */
class SessionService {
  private apiService: ApiService;
  
  constructor() {
    this.apiService = new ApiService();
  }
  
  // ==================== SESSION CRUD OPERATIONS ====================
  
  /**
   * Get all sessions with optional filtering
   * @param filters - Optional filters for sessions
   * @returns Promise<Session[]>
   */
  async getSessions(filters?: FilterOptions): Promise<Session[]> {
    try {
      const params = new URLSearchParams();
      
      if (filters?.trainerId) params.append('trainerId', filters.trainerId);
      if (filters?.clientId) params.append('clientId', filters.clientId);
      if (filters?.status && filters.status !== 'all') params.append('status', filters.status);
      if (filters?.location) params.append('location', filters.location);
      if (filters?.searchTerm) params.append('search', filters.searchTerm);
      if (filters?.dateRange && filters.dateRange !== 'all') {
        params.append('dateRange', filters.dateRange);
      }
      if (filters?.customDateStart) params.append('startDate', filters.customDateStart);
      if (filters?.customDateEnd) params.append('endDate', filters.customDateEnd);
      
      const queryString = params.toString();
      const url = `/api/sessions${queryString ? `?${queryString}` : ''}`;
      
      const response = await this.apiService.get<Session[]>(url);
      return response.data;
    } catch (error) {
      console.error('Error fetching sessions:', error);
      throw error;
    }
  }
  
  /**
   * Get sessions for a specific date range
   * @param startDate - Start date
   * @param endDate - End date
   * @returns Promise<Session[]>
   */
  async getSessionsByDateRange(startDate: string, endDate: string): Promise<Session[]> {
    try {
      const response = await this.apiService.get<Session[]>(
        `/api/sessions/date-range?start=${startDate}&end=${endDate}`
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching sessions by date range:', error);
      throw error;
    }
  }
  
  /**
   * Get a specific session by ID
   * @param sessionId - Session ID
   * @returns Promise<Session>
   */
  async getSession(sessionId: string): Promise<Session> {
    try {
      const response = await this.apiService.get<Session>(`/api/sessions/${sessionId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching session:', error);
      throw error;
    }
  }
  
  /**
   * Create a new session
   * @param sessionData - Session creation data
   * @returns Promise<Session>
   */
  async createSession(sessionData: SessionRequest): Promise<Session> {
    try {
      const response = await this.apiService.post<Session>('/api/sessions', sessionData);
      return response.data;
    } catch (error) {
      console.error('Error creating session:', error);
      throw error;
    }
  }
  
  /**
   * Update an existing session
   * @param sessionId - Session ID
   * @param updateData - Update data
   * @returns Promise<Session>
   */
  async updateSession(sessionId: string, updateData: Partial<SessionRequest>): Promise<Session> {
    try {
      const response = await this.apiService.put<Session>(
        `/api/sessions/${sessionId}`,
        updateData
      );
      return response.data;
    } catch (error) {
      console.error('Error updating session:', error);
      throw error;
    }
  }
  
  /**
   * Delete a session
   * @param sessionId - Session ID
   * @returns Promise<void>
   */
  async deleteSession(sessionId: string): Promise<void> {
    try {
      await this.apiService.delete(`/api/sessions/${sessionId}`);
    } catch (error) {
      console.error('Error deleting session:', error);
      throw error;
    }
  }
  
  // ==================== DRAG AND DROP OPERATIONS ====================
  
  /**
   * Handle session drag and drop (move operation)
   * @param sessionId - Session ID
   * @param newStart - New start date/time
   * @param newEnd - New end date/time
   * @returns Promise<Session>
   */
  async moveSession(sessionId: string, newStart: Date, newEnd: Date): Promise<Session> {
    try {
      const duration = Math.round((newEnd.getTime() - newStart.getTime()) / 60000);
      
      const updateData = {
        sessionDate: newStart.toISOString(),
        duration
      };
      
      const response = await this.apiService.put<Session>(
        `/api/sessions/${sessionId}`,
        updateData
      );
      
      return response.data;
    } catch (error) {
      console.error('Error moving session:', error);
      throw error;
    }
  }
  
  /**
   * Handle session resize operation
   * @param sessionId - Session ID
   * @param newStart - New start date/time
   * @param newEnd - New end date/time
   * @returns Promise<Session>
   */
  async resizeSession(sessionId: string, newStart: Date, newEnd: Date): Promise<Session> {
    try {
      const duration = Math.round((newEnd.getTime() - newStart.getTime()) / 60000);
      
      const updateData = {
        sessionDate: newStart.toISOString(),
        duration
      };
      
      const response = await this.apiService.put<Session>(
        `/api/sessions/${sessionId}`,
        updateData
      );
      
      return response.data;
    } catch (error) {
      console.error('Error resizing session:', error);
      throw error;
    }
  }
  
  /**
   * Create session from slot selection
   * @param startTime - Start time
   * @param endTime - End time
   * @param defaultData - Default session data
   * @returns Promise<Session>
   */
  async createSessionFromSlot(
    startTime: Date,
    endTime: Date,
    defaultData: Partial<SessionRequest> = {}
  ): Promise<Session> {
    try {
      const duration = Math.round((endTime.getTime() - startTime.getTime()) / 60000);
      
      const sessionData: SessionRequest = {
        sessionDate: startTime.toISOString(),
        duration,
        status: 'available',
        location: 'Main Studio',
        notes: 'Available slot created by admin',
        ...defaultData
      };
      
      const response = await this.apiService.post<Session>('/api/sessions', sessionData);
      return response.data;
    } catch (error) {
      console.error('Error creating session from slot:', error);
      throw error;
    }
  }
  
  // ==================== SESSION BOOKING AND ASSIGNMENT ====================
  
  /**
   * Book a session for a client
   * @param sessionId - Session ID
   * @param clientId - Client ID
   * @param trainerId - Optional trainer ID
   * @returns Promise<Session>
   */
  async bookSession(sessionId: string, clientId: string, trainerId?: string): Promise<Session> {
    try {
      const response = await this.apiService.post<Session>(
        `/api/sessions/${sessionId}/book`,
        {
          clientId,
          trainerId
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error booking session:', error);
      throw error;
    }
  }
  
  /**
   * Assign a session to a trainer
   * @param sessionId - Session ID
   * @param trainerId - Trainer ID
   * @returns Promise<Session>
   */
  async assignSessionToTrainer(sessionId: string, trainerId: string): Promise<Session> {
    try {
      const response = await this.apiService.put<Session>(
        `/api/sessions/${sessionId}/assign-trainer`,
        { trainerId }
      );
      return response.data;
    } catch (error) {
      console.error('Error assigning session to trainer:', error);
      throw error;
    }
  }
  
  /**
   * Confirm a session
   * @param sessionId - Session ID
   * @returns Promise<Session>
   */
  async confirmSession(sessionId: string): Promise<Session> {
    try {
      const response = await this.apiService.put<Session>(
        `/api/sessions/${sessionId}/confirm`
      );
      return response.data;
    } catch (error) {
      console.error('Error confirming session:', error);
      throw error;
    }
  }
  
  /**
   * Cancel a session
   * @param sessionId - Session ID
   * @param reason - Cancellation reason
   * @returns Promise<Session>
   */
  async cancelSession(sessionId: string, reason?: string): Promise<Session> {
    try {
      const response = await this.apiService.put<Session>(
        `/api/sessions/${sessionId}/cancel`,
        { reason }
      );
      return response.data;
    } catch (error) {
      console.error('Error canceling session:', error);
      throw error;
    }
  }
  
  /**
   * Complete a session
   * @param sessionId - Session ID
   * @param notes - Session notes
   * @returns Promise<Session>
   */
  async completeSession(sessionId: string, notes?: string): Promise<Session> {
    try {
      const response = await this.apiService.put<Session>(
        `/api/sessions/${sessionId}/complete`,
        { notes }
      );
      return response.data;
    } catch (error) {
      console.error('Error completing session:', error);
      throw error;
    }
  }
  
  // ==================== BULK OPERATIONS ====================
  
  /**
   * Perform bulk operations on sessions
   * @param sessionIds - Array of session IDs
   * @param action - Bulk action type
   * @param data - Additional data for the action
   * @returns Promise<Session[]>
   */
  async bulkSessionAction(
    sessionIds: string[],
    action: BulkActionType,
    data?: any
  ): Promise<Session[]> {
    try {
      const response = await this.apiService.post<Session[]>(
        '/api/sessions/bulk',
        {
          sessionIds,
          action,
          data
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error performing bulk action:', error);
      throw error;
    }
  }
  
  /**
   * Bulk confirm sessions
   * @param sessionIds - Array of session IDs
   * @returns Promise<Session[]>
   */
  async bulkConfirmSessions(sessionIds: string[]): Promise<Session[]> {
    return this.bulkSessionAction(sessionIds, 'confirm');
  }
  
  /**
   * Bulk cancel sessions
   * @param sessionIds - Array of session IDs
   * @param reason - Cancellation reason
   * @returns Promise<Session[]>
   */
  async bulkCancelSessions(sessionIds: string[], reason?: string): Promise<Session[]> {
    return this.bulkSessionAction(sessionIds, 'cancel', { reason });
  }
  
  /**
   * Bulk delete sessions
   * @param sessionIds - Array of session IDs
   * @returns Promise<void>
   */
  async bulkDeleteSessions(sessionIds: string[]): Promise<void> {
    try {
      await this.apiService.post('/api/sessions/bulk-delete', { sessionIds });
    } catch (error) {
      console.error('Error bulk deleting sessions:', error);
      throw error;
    }
  }
  
  /**
   * Bulk reassign sessions to a new trainer
   * @param sessionIds - Array of session IDs
   * @param trainerId - New trainer ID
   * @returns Promise<Session[]>
   */
  async bulkReassignSessions(sessionIds: string[], trainerId: string): Promise<Session[]> {
    return this.bulkSessionAction(sessionIds, 'reassign', { trainerId });
  }
  
  /**
   * Bulk reschedule sessions
   * @param sessionIds - Array of session IDs
   * @param offset - Time offset in minutes
   * @returns Promise<Session[]>
   */
  async bulkRescheduleSessions(sessionIds: string[], offset: number): Promise<Session[]> {
    return this.bulkSessionAction(sessionIds, 'reschedule', { offset });
  }
  
  // ==================== SESSION STATISTICS ====================
  
  /**
   * Get session statistics
   * @param filters - Optional filters
   * @returns Promise<ScheduleStats>
   */
  async getSessionStatistics(filters?: FilterOptions): Promise<ScheduleStats> {
    try {
      const params = new URLSearchParams();
      
      if (filters?.trainerId) params.append('trainerId', filters.trainerId);
      if (filters?.dateRange && filters.dateRange !== 'all') {
        params.append('dateRange', filters.dateRange);
      }
      if (filters?.customDateStart) params.append('startDate', filters.customDateStart);
      if (filters?.customDateEnd) params.append('endDate', filters.customDateEnd);
      
      const queryString = params.toString();
      const url = `/api/sessions/statistics${queryString ? `?${queryString}` : ''}`;
      
      const response = await this.apiService.get<ScheduleStats>(url);
      return response.data;
    } catch (error) {
      console.error('Error fetching session statistics:', error);
      throw error;
    }
  }
  
  /**
   * Get session analytics
   * @param userId - User ID (optional)
   * @returns Promise<SessionAnalytics>
   */
  async getSessionAnalytics(userId?: string): Promise<{
    totalSessions: number;
    completedSessions: number;
    averageDuration: number;
    weeklyProgress: any[];
    monthlyStats: any[];
  }> {
    try {
      const url = userId ? `/api/sessions/analytics/${userId}` : '/api/sessions/analytics';
      const response = await this.apiService.get<any>(url);
      return response.data;
    } catch (error) {
      console.error('Error fetching session analytics:', error);
      throw error;
    }
  }
  
  // ==================== SESSION AVAILABILITY ====================
  
  /**
   * Get available sessions
   * @param filters - Optional filters
   * @returns Promise<Session[]>
   */
  async getAvailableSessions(filters?: {
    trainerId?: string;
    dateRange?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<Session[]> {
    try {
      const params = new URLSearchParams({ status: 'available' });
      
      if (filters?.trainerId) params.append('trainerId', filters.trainerId);
      if (filters?.dateRange) params.append('dateRange', filters.dateRange);
      if (filters?.startDate) params.append('startDate', filters.startDate);
      if (filters?.endDate) params.append('endDate', filters.endDate);
      
      const response = await this.apiService.get<Session[]>(
        `/api/sessions/available?${params.toString()}`
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching available sessions:', error);
      throw error;
    }
  }
  
  /**
   * Check session availability
   * @param startTime - Start time
   * @param endTime - End time
   * @param trainerId - Optional trainer ID
   * @returns Promise<boolean>
   */
  async checkSessionAvailability(
    startTime: Date,
    endTime: Date,
    trainerId?: string
  ): Promise<boolean> {
    try {
      const params = new URLSearchParams({
        start: startTime.toISOString(),
        end: endTime.toISOString()
      });
      
      if (trainerId) params.append('trainerId', trainerId);
      
      const response = await this.apiService.get<{ available: boolean }>(
        `/api/sessions/check-availability?${params.toString()}`
      );
      return response.data.available;
    } catch (error) {
      console.error('Error checking session availability:', error);
      return false;
    }
  }
  
  // ==================== SESSION HISTORY ====================
  
  /**
   * Get session history for a user
   * @param userId - User ID
   * @param limit - Number of sessions to retrieve
   * @returns Promise<Session[]>
   */
  async getSessionHistory(userId: string, limit: number = 10): Promise<Session[]> {
    try {
      const response = await this.apiService.get<Session[]>(
        `/api/sessions/history/${userId}?limit=${limit}`
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching session history:', error);
      throw error;
    }
  }
  
  /**
   * Get upcoming sessions for a user
   * @param userId - User ID
   * @param limit - Number of sessions to retrieve
   * @returns Promise<Session[]>
   */
  async getUpcomingSessions(userId: string, limit: number = 10): Promise<Session[]> {
    try {
      const response = await this.apiService.get<Session[]>(
        `/api/sessions/upcoming/${userId}?limit=${limit}`
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching upcoming sessions:', error);
      throw error;
    }
  }
  
  // ==================== RECURRING SESSIONS ====================
  
  /**
   * Create recurring sessions
   * @param sessionData - Base session data
   * @param recurrenceConfig - Recurrence configuration
   * @returns Promise<Session[]>
   */
  async createRecurringSessions(
    sessionData: SessionRequest,
    recurrenceConfig: {
      pattern: 'daily' | 'weekly' | 'monthly';
      interval: number;
      endDate: string;
      daysOfWeek?: number[];
    }
  ): Promise<Session[]> {
    try {
      const response = await this.apiService.post<Session[]>(
        '/api/sessions/recurring',
        {
          sessionData,
          recurrenceConfig
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error creating recurring sessions:', error);
      throw error;
    }
  }
  
  // ==================== EXPORT AND IMPORT ====================
  
  /**
   * Export sessions data
   * @param format - Export format
   * @param filters - Optional filters
   * @returns Promise<Blob>
   */
  async exportSessions(
    format: 'csv' | 'excel' | 'pdf' | 'json',
    filters?: FilterOptions
  ): Promise<Blob> {
    try {
      const params = new URLSearchParams({ format });
      
      if (filters?.trainerId) params.append('trainerId', filters.trainerId);
      if (filters?.status && filters.status !== 'all') params.append('status', filters.status);
      if (filters?.dateRange && filters.dateRange !== 'all') {
        params.append('dateRange', filters.dateRange);
      }
      
      const response = await this.apiService.get(
        `/api/sessions/export?${params.toString()}`,
        { responseType: 'blob' }
      );
      
      return new Blob([response.data], { type: response.headers['content-type'] });
    } catch (error) {
      console.error('Error exporting sessions:', error);
      throw error;
    }
  }
  
  // ==================== REAL-TIME UPDATES ====================
  
  /**
   * Subscribe to session updates
   * @param callback - Callback function for updates
   * @returns Unsubscribe function
   */
  subscribeToSessionUpdates(callback: (session: Session) => void): () => void {
    // TODO: Implement WebSocket subscription
    console.log('WebSocket subscription for sessions not yet implemented');
    return () => {};
  }
  
  /**
   * Notify session update
   * @param sessionId - Session ID
   * @param updateType - Type of update
   */
  private notifySessionUpdate(
    sessionId: string,
    updateType: 'created' | 'updated' | 'deleted'
  ): void {
    // TODO: Implement WebSocket notification
    console.log(`Session ${updateType}: ${sessionId}`);
  }
}

// Export singleton instance
export const sessionService = new SessionService();
export default sessionService;

/**
 * Universal Master Schedule Service (Phase 2: Frontend Orchestration)
 * ====================================================================
 * Production-ready service connecting to the UNIFIED backend session service
 * 
 * ARCHITECTURAL TRANSFORMATION (Phase 2):
 * ✅ Updated to use unified backend endpoints from Phase 1
 * ✅ Role-based service methods for adaptive UI
 * ✅ Simplified API calls matching actual backend routes
 * ✅ Real-time calendar integration optimized
 * ✅ Cross-dashboard synchronization maintained
 * 
 * CONNECTS TO:
 * - backend/services/sessions/session.service.mjs (Unified Service)
 * - backend/routes/sessions.mjs (Unified Routes)
 * 
 * SUPPORTS ROLES:
 * - Admin: Full access to all operations
 * - Trainer: Assigned sessions and management
 * - Client: Own sessions + available booking
 * - User: Available sessions for booking
 */

import axios, { AxiosResponse } from 'axios';

// Import types from Universal Master Schedule
import type {
  Session,
  SessionEvent, 
  Client,
  Trainer,
  FilterOptions,
  ScheduleStats,
  ApiResponse
} from '../components/UniversalMasterSchedule/types';

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:10000';

/**
 * Create axios instance with dynamic auth headers
 * Uses interceptor to always get fresh token from localStorage
 */
function createApiClient() {
  const instance = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Content-Type': 'application/json'
    },
    timeout: 30000
  });

  // Add request interceptor to include fresh token on every request
  instance.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  return instance;
}

/**
 * Universal Master Schedule Service Class (Phase 2 - Unified Backend Integration)
 * Handles all scheduling operations with role-based access using the unified backend
 */
class UniversalMasterScheduleService {
  private api = createApiClient();

  // ==================== CORE SESSION OPERATIONS ====================

  /**
   * Get all sessions with role-based filtering (matches unified backend)
   * Role-based access handled automatically by backend service:
   * - Admin: All sessions
   * - Trainer: Assigned sessions only  
   * - Client: Own sessions + available sessions
   * - User: Available sessions only
   */
  async getSessions(filters?: FilterOptions): Promise<Session[]> {
    try {
      const params = new URLSearchParams();
      
      if (filters?.customDateStart) params.append('startDate', filters.customDateStart);
      if (filters?.customDateEnd) params.append('endDate', filters.customDateEnd);
      if (filters?.status && filters.status !== 'all') params.append('status', filters.status);
      if (filters?.trainerId) params.append('trainerId', filters.trainerId);
      if (filters?.clientId) params.append('userId', filters.clientId); // Backend uses 'userId' for client filtering
      if (filters?.location) params.append('location', filters.location);
      if (filters?.confirmed !== undefined) params.append('confirmed', filters.confirmed.toString());
      // MindBody Parity: Admin view scope toggle ('my' = my schedule only, 'global' = all trainers)
      if (filters?.adminScope) params.append('adminScope', filters.adminScope);
      
      const response: AxiosResponse<Session[]> = await this.api.get(`/api/sessions?${params.toString()}`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching sessions:', error);
      throw error;
    }
  }

  /**
   * Get a single session by ID with role-based access control
   */
  async getSessionById(sessionId: string): Promise<Session | null> {
    try {
      const response: AxiosResponse<{ success: boolean; session: Session }> = await this.api.get(`/api/sessions/${sessionId}`);
      
      if (response.data.success) {
        return response.data.session;
      }
      return null;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      console.error('Error fetching session by ID:', error);
      throw error;
    }
  }

  /**
   * Get sessions formatted for calendar display
   * Uses the unified getSessions with date filtering
   */
  async getCalendarEvents(start: string, end: string, filters?: { trainerId?: string; clientId?: string; adminScope?: 'my' | 'global' }): Promise<SessionEvent[]> {
    try {
      // Use unified getSessions with date range
      const sessions = await this.getSessions({
        customDateStart: start,
        customDateEnd: end,
        trainerId: filters?.trainerId,
        clientId: filters?.clientId,
        adminScope: filters?.adminScope
      });
      
      // Transform to calendar events format (sessions already have correct format from unified backend)
      return sessions.map(session => ({
        ...session,
        start: session.start || session.sessionDate,
        end: session.end || new Date(new Date(session.sessionDate).getTime() + (session.duration || 60) * 60000)
      }));
    } catch (error: any) {
      console.error('Error fetching calendar events:', error);
      return []; // Return empty array for graceful degradation
    }
  }

  // ==================== SESSION LIFECYCLE MANAGEMENT ====================

  /**
   * Create available session slots (Admin only)
   * Can optionally assign a client during creation
   */
  async createAvailableSessions(sessions: Array<{
    start: string;
    end?: string;
    duration?: number;
    trainerId?: string;
    userId?: string;
    clientName?: string;
    location?: string;
    notes?: string;
    sessionType?: string;
    notifyClient?: boolean;
  }>): Promise<{ sessions: Session[]; message: string }> {
    try {
      // Log payload for debugging
      console.log('[SessionService] Creating sessions with payload:', {
        sessions,
        sessionsCount: sessions?.length,
        firstSession: sessions?.[0]
      });

      const response: AxiosResponse<{
        success: boolean;
        message: string;
        sessions: Session[];
      }> = await this.api.post('/api/sessions', { sessions });

      console.log('[SessionService] Create response:', response.data);

      if (response.data.success) {
        return {
          sessions: response.data.sessions,
          message: response.data.message
        };
      } else {
        throw new Error(response.data.message || 'Failed to create sessions');
      }
    } catch (error: any) {
      console.error('Error creating sessions:', error);
      // Log detailed error info
      if (error.response) {
        console.error('[SessionService] Server responded with:', {
          status: error.response.status,
          data: error.response.data,
          message: error.response.data?.message
        });
      }
      throw error;
    }
  }

  /**
   * Create recurring available sessions (Admin only)
   */
  async createRecurringSessions(config: {
    startDate: string;
    endDate: string;
    daysOfWeek: number[];
    times: string[];
    trainerId?: string;
    location?: string;
    duration?: number;
    sessionType?: string;
  }): Promise<{ success: boolean; message: string; count: number }> {
    try {
      const response: AxiosResponse<{
        success: boolean;
        message: string;
        count: number;
      }> = await this.api.post('/api/sessions/recurring', config);
      
      return response.data;
    } catch (error: any) {
      console.error('Error creating recurring sessions:', error);
      throw error;
    }
  }

  /**
   * Book a session
   */
  async bookSession(sessionId: string, bookingData?: any): Promise<{ success: boolean; message: string; session: Session }> {
    try {
      const response: AxiosResponse<{
        success: boolean;
        message: string;
        session: Session;
      }> = await this.api.post(`/api/sessions/${sessionId}/book`, bookingData || {});
      
      return response.data;
    } catch (error: any) {
      console.error('Error booking session:', error);
      throw error;
    }
  }

  /**
   * Cancel a session
   */
  async cancelSession(sessionId: string, reason?: string): Promise<{ success: boolean; message: string }> {
    try {
      const response: AxiosResponse<{
        success: boolean;
        message: string;
      }> = await this.api.patch(`/api/sessions/${sessionId}/cancel`, { reason });
      
      return response.data;
    } catch (error: any) {
      console.error('Error cancelling session:', error);
      throw error;
    }
  }

  /**
   * Confirm a session (Admin/Trainer only)
   */
  async confirmSession(sessionId: string): Promise<{ success: boolean; message: string; session: Session }> {
    try {
      const response: AxiosResponse<{
        success: boolean;
        message: string;
        session: Session;
      }> = await this.api.patch(`/api/sessions/${sessionId}/confirm`);
      
      return response.data;
    } catch (error: any) {
      console.error('Error confirming session:', error);
      throw error;
    }
  }

  /**
   * Complete a session (Admin/Trainer only)
   */
  async completeSession(sessionId: string, notes?: string): Promise<{ success: boolean; message: string; session: Session }> {
    try {
      const response: AxiosResponse<{
        success: boolean;
        message: string;
        session: Session;
      }> = await this.api.patch(`/api/sessions/${sessionId}/complete`, { notes });
      
      return response.data;
    } catch (error: any) {
      console.error('Error completing session:', error);
      throw error;
    }
  }

  /**
   * Assign trainer to session (Admin only)
   */
  async assignTrainer(sessionId: string, trainerId: string): Promise<{ success: boolean; message: string; session: Session }> {
    try {
      const response: AxiosResponse<{
        success: boolean;
        message: string;
        session: Session;
      }> = await this.api.patch(`/api/sessions/${sessionId}/assign`, { trainerId });
      
      return response.data;
    } catch (error: any) {
      console.error('Error assigning trainer:', error);
      throw error;
    }
  }

  // ==================== STATISTICS & ANALYTICS ====================

  /**
   * Get schedule statistics with role-based data
   */
  async getScheduleStats(): Promise<ScheduleStats> {
    try {
      const response: AxiosResponse<{
        success: boolean;
        stats: ScheduleStats;
      }> = await this.api.get('/api/sessions/stats');
      
      if (response.data.success) {
        return response.data.stats;
      } else {
        throw new Error('Failed to fetch schedule statistics');
      }
    } catch (error: any) {
      console.error('Error fetching schedule statistics:', error);
      throw error;
    }
  }

  // ==================== USER MANAGEMENT ====================

  /**
   * Get all trainers for dropdown selection
   */
  async getTrainers(): Promise<Trainer[]> {
    try {
      const response: AxiosResponse<Trainer[]> = await this.api.get('/api/sessions/users/trainers');
      return response.data;
    } catch (error: any) {
      console.error('Error fetching trainers:', error);
      return [];
    }
  }

  /**
   * Get all clients for dropdown selection (Admin/Trainer only)
   */
  async getClients(): Promise<Client[]> {
    try {
      const response: AxiosResponse<Client[]> = await this.api.get('/api/sessions/users/clients');
      return response.data;
    } catch (error: any) {
      console.error('Error fetching clients:', error);
      // Return empty array if unauthorized (expected for non-admin/trainer users)
      return [];
    }
  }

  // ==================== LEGACY COMPATIBILITY METHODS ====================

  /**
   * Legacy method for backward compatibility
   * @deprecated Use bookSession instead
   */
  async bookSessionLegacy(sessionId: string, userId: string): Promise<Session> {
    const result = await this.bookSession(sessionId);
    return result.session;
  }

  /**
   * Update a session (generic update method)
   */
  async updateSession(sessionId: string, updates: Partial<Session>): Promise<Session> {
    try {
      // For now, we'll handle specific updates through dedicated methods
      // This could be extended to support more generic updates if needed
      
      if (updates.trainerId) {
        const result = await this.assignTrainer(sessionId, updates.trainerId);
        return result.session;
      }
      
      if (updates.status === 'confirmed') {
        const result = await this.confirmSession(sessionId);
        return result.session;
      }
      
      if (updates.status === 'completed') {
        const result = await this.completeSession(sessionId, updates.notes);
        return result.session;
      }
      
      // For other updates, we'd need to implement additional backend endpoints
      throw new Error('Update type not supported. Use specific methods like assignTrainer, confirmSession, etc.');
    } catch (error: any) {
      console.error('Error updating session:', error);
      throw error;
    }
  }

  /**
   * Delete a session (alias for cancel)
   */
  async deleteSession(sessionId: string): Promise<void> {
    await this.cancelSession(sessionId, 'Session deleted');
  }

  // ==================== ROLE-BASED HELPER METHODS ====================

  /**
   * Get role-appropriate session actions
   * Returns available actions based on current user role and session state
   */
  getRoleBasedActions(session: Session, userRole: 'admin' | 'trainer' | 'client' | 'user'): string[] {
    const actions: string[] = [];
    
    switch (userRole) {
      case 'admin':
        // Admin can do everything
        if (session.status === 'available') {
          actions.push('assign_trainer', 'delete');
        }
        if (['scheduled', 'requested'].includes(session.status)) {
          actions.push('confirm', 'cancel', 'assign_trainer');
        }
        if (['confirmed', 'scheduled'].includes(session.status)) {
          actions.push('complete', 'cancel');
        }
        actions.push('edit', 'view_details');
        break;
        
      case 'trainer':
        // Trainer can manage assigned sessions
        if (session.trainerId && ['scheduled', 'requested'].includes(session.status)) {
          actions.push('confirm', 'cancel');
        }
        if (session.trainerId && ['confirmed', 'scheduled'].includes(session.status)) {
          actions.push('complete', 'cancel');
        }
        if (session.trainerId) {
          actions.push('view_details');
        }
        break;
        
      case 'client':
        // Client can manage their own sessions and book available ones
        if (session.status === 'available') {
          actions.push('book');
        }
        if (session.userId && ['scheduled', 'confirmed'].includes(session.status)) {
          actions.push('cancel', 'view_details');
        }
        break;
        
      case 'user':
        // Regular users can only book available sessions
        if (session.status === 'available') {
          actions.push('book');
        }
        break;
    }
    
    return actions;
  }

  /**
   * Check if user can perform action on session
   */
  canPerformAction(session: Session, action: string, userRole: 'admin' | 'trainer' | 'client' | 'user', userId?: string): boolean {
    const allowedActions = this.getRoleBasedActions(session, userRole);
    
    // Additional ownership checks
    if (userRole === 'client' && userId && (action === 'cancel' || action === 'view_details')) {
      return allowedActions.includes(action) && session.userId === userId;
    }
    
    if (userRole === 'trainer' && userId && ['confirm', 'complete', 'cancel'].includes(action)) {
      return allowedActions.includes(action) && session.trainerId === userId;
    }
    
    return allowedActions.includes(action);
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

  // ==================== SERVICE HEALTH & MONITORING ====================

  /**
   * Health check for service connectivity
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.api.get('/api/sessions/health');
      return response.status === 200 && response.data.status === 'healthy';
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

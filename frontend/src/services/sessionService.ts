import apiService from './api.service';

// Type definitions
interface Session {
  id: string;
  sessionDate: string;
  duration: number;
  userId: string | null;
  trainerId: string | null;
  location?: string;
  notes?: string;
  status: 'available' | 'requested' | 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
}

interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

// Mock data for development
const mockSessions: Session[] = [
  {
    id: 'session-001',
    sessionDate: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
    duration: 60,
    userId: 'client-001',
    trainerId: 'trainer-001',
    location: 'Main Studio',
    notes: 'Focus on strength training',
    status: 'scheduled'
  },
  {
    id: 'session-002',
    sessionDate: new Date(Date.now() + 172800000).toISOString(), // Day after tomorrow
    duration: 45,
    userId: 'client-002',
    trainerId: 'trainer-001',
    location: 'Online',
    notes: 'Cardio session',
    status: 'confirmed'
  },
  {
    id: 'session-003',
    sessionDate: new Date(Date.now() + 259200000).toISOString(), // Three days from now
    duration: 45,
    userId: null,
    trainerId: 'trainer-002',
    location: 'Main Studio',
    notes: 'Available slot',
    status: 'available'
  },
  {
    id: 'session-004',
    sessionDate: new Date(Date.now() - 86400000).toISOString(), // Yesterday
    duration: 60,
    userId: 'client-001',
    trainerId: 'trainer-001',
    location: 'Main Studio',
    notes: 'Completed session',
    status: 'completed'
  }
];

// Session service implementation
export const sessionService = {
  // Get user's own sessions (FIXED: Use user-level endpoint)
  getSessions: async (userId?: string): Promise<ServiceResponse<Session[]>> => {
    try {
      // For development or if API is not available, return mock data
      if (process.env.NODE_ENV === 'development' || process.env.VITE_DEV_MODE === 'true') {
        console.log('[DEV MODE] Using mock session data');
        return {
          success: true,
          data: mockSessions
        };
      }

      // FIXED: Use user-level endpoint instead of admin-only endpoint
      if (!userId) {
        throw new Error('User ID is required to fetch sessions');
      }
      
      const response = await apiService.get(`/api/sessions/${userId}`);
      
      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      console.error('Error fetching sessions:', error);
      return {
        success: false,
        message: error.message || 'Failed to fetch sessions'
      };
    }
  },

  // Get available sessions for booking (NEW - FIXED ENDPOINT)
  getAvailableSessions: async (): Promise<ServiceResponse<Session[]>> => {
    try {
      // For development or if API is not available, return mock data
      if (process.env.NODE_ENV === 'development' || process.env.VITE_DEV_MODE === 'true') {
        console.log('[DEV MODE] Using mock available sessions data');
        const availableSessions = mockSessions.filter(s => s.status === 'available');
        return {
          success: true,
          data: availableSessions
        };
      }

      // FIXED: Use public endpoint for available sessions
      const response = await apiService.get('/api/sessions/available');
      
      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      console.error('Error fetching available sessions:', error);
      return {
        success: false,
        message: error.message || 'Failed to fetch available sessions'
      };
    }
  },

  // Book an available session (NEW - FIXED ENDPOINT)
  bookSession: async (sessionId: string, userId: string): Promise<ServiceResponse<any>> => {
    try {
      // For development or if API is not available, simulate success
      if (process.env.NODE_ENV === 'development' || process.env.VITE_DEV_MODE === 'true') {
        console.log(`[DEV MODE] Booked session ${sessionId} for user ${userId}`);
        return {
          success: true,
          data: { sessionId, userId, status: 'booked' }
        };
      }

      // FIXED: Use user-level booking endpoint
      const response = await apiService.post(`/api/sessions/book/${userId}`, {
        sessionId
      });
      
      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      console.error('Error booking session:', error);
      return {
        success: false,
        message: error.message || 'Failed to book session'
      };
    }
  },

  // Add sessions to a client account
  addSessionsToClient: async (
    clientId: string,
    sessionsCount: number,
    notes?: string
  ): Promise<ServiceResponse<any>> => {
    try {
      // For development or if API is not available, simulate success
      if (process.env.NODE_ENV === 'development' || process.env.VITE_DEV_MODE === 'true') {
        console.log(`[DEV MODE] Added ${sessionsCount} sessions to client ${clientId}`);
        return {
          success: true,
          data: { 
            clientId, 
            sessionsAdded: sessionsCount 
          }
        };
      }

      // In production, make a real API call
      const response = await apiService.post('/api/clients/sessions', {
        clientId,
        count: sessionsCount,
        notes
      });
      
      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      console.error('Error adding sessions to client:', error);
      return {
        success: false,
        message: error.message || 'Failed to add sessions'
      };
    }
  }
};

// Index file for all services
export default {
  session: {
    ...sessionService,
    // Re-export with clearer naming for the context
    getUserSessions: sessionService.getSessions,
    getAvailableSessions: sessionService.getAvailableSessions,
    bookSession: sessionService.bookSession
  }
};

import { useAuth } from '../context/AuthContext';

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
  // Get all sessions
  getSessions: async (): Promise<ServiceResponse<Session[]>> => {
    try {
      // For development or if API is not available, return mock data
      if (process.env.NODE_ENV === 'development' || process.env.VITE_DEV_MODE === 'true') {
        console.log('[DEV MODE] Using mock session data');
        return {
          success: true,
          data: mockSessions
        };
      }

      // In production, make a real API call
      const { authAxios } = useAuth();
      const response = await authAxios.get('/api/sessions');
      
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
      const { authAxios } = useAuth();
      const response = await authAxios.post('/api/clients/sessions', {
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
  session: sessionService
};

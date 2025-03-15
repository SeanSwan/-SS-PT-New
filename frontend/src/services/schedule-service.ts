/**
 * schedule-service.ts
 * Service for managing schedule and sessions via API
 */
import axios, { AxiosResponse } from 'axios';

// API base URL from environment variables
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

// Type definitions
interface Session {
  id: string;
  sessionDate: string;
  endDate?: string;
  duration?: number;
  status: 'available' | 'requested' | 'booked' | 'completed' | 'cancelled';
  confirmed: boolean;
  client?: User;
  trainer?: User;
  location?: string;
  notes?: string;
  privateNotes?: string;
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  status: string;
  confirmed: boolean;
  client?: User;
  trainer?: User;
  location?: string;
  notes?: string;
  privateNotes?: string;
  duration?: number;
  allDay: boolean;
  resource: any;
}

interface RecurringSessionData {
  startDate: string;
  endDate: string;
  daysOfWeek: number[];
  times: string[];
  trainerId?: string;
  location?: string;
  duration?: number;
}

// Helper function to get auth token
const getAuthToken = (): string => {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('No authentication token found');
  }
  return token;
};

/**
 * Get all sessions with optional filtering
 * @param params - Query parameters
 * @returns Promise with sessions data
 */
export const getSessions = async (params: Record<string, any> = {}): Promise<Session[]> => {
  try {
    const token = getAuthToken();
    
    const response: AxiosResponse<{ sessions: Session[] }> = await axios.get(`${API_BASE_URL}/api/schedule`, {
      headers: { Authorization: `Bearer ${token}` },
      params
    });
    
    return response.data.sessions;
  } catch (error) {
    console.error('Error fetching sessions:', error);
    throw error;
  }
};

/**
 * Get session by ID
 * @param sessionId - Session ID
 * @returns Promise with session data
 */
export const getSessionById = async (sessionId: string): Promise<Session> => {
  try {
    const token = getAuthToken();
    
    const response: AxiosResponse<{ session: Session }> = await axios.get(`${API_BASE_URL}/api/schedule/${sessionId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    return response.data.session;
  } catch (error) {
    console.error(`Error fetching session ${sessionId}:`, error);
    throw error;
  }
};

/**
 * Book an available session
 * @param sessionId - Session ID to book
 * @returns Promise with booking result
 */
export const bookSession = async (sessionId: string): Promise<{ success: boolean; message: string; session: Session }> => {
  try {
    const token = getAuthToken();
    
    const response = await axios.post(
      `${API_BASE_URL}/api/schedule/book`,
      { sessionId },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    return response.data;
  } catch (error) {
    console.error('Error booking session:', error);
    throw error;
  }
};

/**
 * Request a new session
 * @param data - Session request data
 * @returns Promise with request result
 */
export const requestSession = async (data: { 
  start: string; 
  end: string; 
  notes?: string;
}): Promise<{ success: boolean; message: string; session: Session }> => {
  try {
    const token = getAuthToken();
    
    const response = await axios.post(
      `${API_BASE_URL}/api/schedule/request`,
      data,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    return response.data;
  } catch (error) {
    console.error('Error requesting session:', error);
    throw error;
  }
};

/**
 * Cancel a session
 * @param sessionId - Session ID to cancel
 * @param reason - Reason for cancellation
 * @returns Promise with cancellation result
 */
export const cancelSession = async (sessionId: string, reason: string = ''): Promise<{ success: boolean; message: string }> => {
  try {
    const token = getAuthToken();
    
    const response = await axios.delete(
      `${API_BASE_URL}/api/schedule/cancel/${sessionId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        data: { reason }
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('Error cancelling session:', error);
    throw error;
  }
};

/**
 * Confirm a session (admin only)
 * @param sessionId - Session ID to confirm
 * @returns Promise with confirmation result
 */
export const confirmSession = async (sessionId: string): Promise<{ success: boolean; message: string; session: Session }> => {
  try {
    const token = getAuthToken();
    
    const response = await axios.put(
      `${API_BASE_URL}/api/schedule/confirm/${sessionId}`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    return response.data;
  } catch (error) {
    console.error('Error confirming session:', error);
    throw error;
  }
};

/**
 * Mark a session as completed (admin/trainer only)
 * @param sessionId - Session ID to mark as completed
 * @param notes - Optional notes about the completed session
 * @returns Promise with completion result
 */
export const completeSession = async (sessionId: string, notes: string = ''): Promise<{ success: boolean; message: string; session: Session }> => {
  try {
    const token = getAuthToken();
    
    const response = await axios.put(
      `${API_BASE_URL}/api/schedule/complete/${sessionId}`,
      { notes },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    return response.data;
  } catch (error) {
    console.error('Error completing session:', error);
    throw error;
  }
};

/**
 * Create available slots (admin only)
 * @param slots - Array of slot objects
 * @returns Promise with created slots
 */
export const createAvailableSlots = async (slots: Array<{
  start: string;
  end: string;
  trainerId?: string;
  location?: string;
}>): Promise<{ success: boolean; message: string; sessions: Session[] }> => {
  try {
    const token = getAuthToken();
    
    const response = await axios.post(
      `${API_BASE_URL}/api/schedule/available`,
      { slots },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    return response.data;
  } catch (error) {
    console.error('Error creating slots:', error);
    throw error;
  }
};

/**
 * Create recurring sessions (admin only)
 * @param data - Recurring sessions data
 * @returns Promise with created sessions
 */
export const createRecurringSessions = async (data: RecurringSessionData): Promise<{ 
  success: boolean; 
  message: string; 
  sessions: Session[] 
}> => {
  try {
    const token = getAuthToken();
    
    const response = await axios.post(
      `${API_BASE_URL}/api/schedule/recurring`,
      data,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    return response.data;
  } catch (error) {
    console.error('Error creating recurring sessions:', error);
    throw error;
  }
};

/**
 * Assign a trainer to a session (admin only)
 * @param sessionId - Session ID
 * @param trainerId - Trainer ID
 * @returns Promise with assignment result
 */
export const assignTrainer = async (sessionId: string, trainerId: string): Promise<{ 
  success: boolean; 
  message: string; 
  session: Session 
}> => {
  try {
    const token = getAuthToken();
    
    const response = await axios.put(
      `${API_BASE_URL}/api/schedule/assign/${sessionId}`,
      { trainerId },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    return response.data;
  } catch (error) {
    console.error('Error assigning trainer:', error);
    throw error;
  }
};

/**
 * Add notes to a session
 * @param sessionId - Session ID
 * @param notes - Notes text
 * @returns Promise with update result
 */
export const addSessionNotes = async (sessionId: string, notes: string): Promise<{ 
  success: boolean; 
  message: string; 
  session: Session 
}> => {
  try {
    const token = getAuthToken();
    
    const response = await axios.put(
      `${API_BASE_URL}/api/schedule/notes/${sessionId}`,
      { notes },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    return response.data;
  } catch (error) {
    console.error('Error adding session notes:', error);
    throw error;
  }
};

/**
 * Get all trainers
 * @returns Promise with trainers list
 */
export const getTrainers = async (): Promise<User[]> => {
  try {
    const token = getAuthToken();
    
    const response: AxiosResponse<{ trainers: User[] }> = await axios.get(
      `${API_BASE_URL}/api/users/trainers`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    return response.data.trainers;
  } catch (error) {
    console.error('Error fetching trainers:', error);
    throw error;
  }
};

/**
 * Get all clients
 * @returns Promise with clients list
 */
export const getClients = async (): Promise<User[]> => {
  try {
    const token = getAuthToken();
    
    const response: AxiosResponse<{ clients: User[] }> = await axios.get(
      `${API_BASE_URL}/api/users/clients`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    return response.data.clients;
  } catch (error) {
    console.error('Error fetching clients:', error);
    throw error;
  }
};

/**
 * Format sessions for react-big-calendar
 * @param sessions - Array of session objects
 * @returns Array of calendar event objects
 */
export const formatEventsForCalendar = (sessions?: Session[]): CalendarEvent[] => {
  if (!sessions || !Array.isArray(sessions)) return [];
  
  return sessions.map(session => {
    // Calculate end time if not provided
    const start = new Date(session.sessionDate);
    const end = session.endDate 
      ? new Date(session.endDate) 
      : new Date(start.getTime() + (session.duration || 60) * 60000);
    
    // Generate title based on session status
    let title = 'Session';
    
    if (session.status === 'available') {
      title = `Available ${session.trainer ? `(${session.trainer.firstName})` : ''}`;
    } else if (session.status === 'requested') {
      title = `Requested by ${session.client?.firstName || 'Client'}`;
    } else if (session.client) {
      const trainerInfo = session.trainer 
        ? ` with ${session.trainer.firstName}`
        : '';
      title = `${session.client.firstName}${trainerInfo}`;
    }
    
    return {
      id: session.id,
      title,
      start,
      end,
      status: session.status,
      confirmed: session.confirmed,
      client: session.client,
      trainer: session.trainer,
      location: session.location,
      notes: session.notes,
      privateNotes: session.privateNotes,
      duration: session.duration,
      allDay: false,
      resource: session
    };
  });
};

// Export all functions as default object
const scheduleService = {
  getSessions,
  getSessionById,
  bookSession,
  requestSession,
  cancelSession,
  confirmSession,
  completeSession,
  createAvailableSlots,
  createRecurringSessions,
  assignTrainer,
  addSessionNotes,
  getTrainers,
  getClients,
  formatEventsForCalendar
};

export default scheduleService;
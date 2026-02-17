/**
 * Admin Dashboard Integration Helper Functions
 * 
 * This file provides utility functions that facilitate the integration
 * between the Berry Admin dashboard components and custom application components.
 * 
 * It includes helper methods for handling data transformations, formatting,
 * and common operations needed across multiple admin components.
 */

import { format, parseISO, isValid, differenceInMinutes } from 'date-fns';
import { sessionStatusConfig } from '../berryAdminConfig';

// Types
export interface Session {
  id: string;
  clientId: string;
  clientName: string;
  trainerId: string;
  trainerName: string;
  type: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no-show' | 'available' | 'requested' | 'confirmed';
  startTime: string;
  endTime: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  location?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  status: Session['status'];
  client?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  trainer?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  location?: string;
  notes?: string;
  resource?: any;
}

/**
 * Converts API session data to calendar events format
 * @param sessions Array of session objects from the API
 * @returns Array of events formatted for the calendar component
 */
export const sessionsToCalendarEvents = (sessions: Session[]): CalendarEvent[] => {
  return sessions.map(session => {
    // Extract first and last name from clientName
    const nameParts = session.clientName.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';
    
    // Same for trainerName
    const trainerNameParts = session.trainerName.split(' ');
    const trainerFirstName = trainerNameParts[0] || '';
    const trainerLastName = trainerNameParts.slice(1).join(' ') || '';
    
    return {
      id: session.id,
      title: `${session.type} - ${session.clientName}`,
      start: new Date(session.startTime),
      end: new Date(session.endTime),
      status: session.status,
      client: {
        id: session.clientId,
        firstName: firstName,
        lastName: lastName
      },
      trainer: {
        id: session.trainerId,
        firstName: trainerFirstName,
        lastName: trainerLastName
      },
      location: session.location,
      notes: session.notes
    };
  });
};

/**
 * Format date for display in a consistent manner
 * @param dateString ISO date string
 * @param formatStr Optional format string
 * @returns Formatted date string
 */
export const formatDate = (dateString: string, formatStr: string = 'MMM d, yyyy h:mm a') => {
  const date = parseISO(dateString);
  if (!isValid(date)) return 'Invalid date';
  return format(date, formatStr);
};

/**
 * Calculate and format session duration
 * @param startTime Start time ISO string
 * @param endTime End time ISO string
 * @returns Formatted duration string (e.g., "1h 30m")
 */
export const calculateDuration = (startTime: string, endTime: string): string => {
  const start = parseISO(startTime);
  const end = parseISO(endTime);
  
  if (!isValid(start) || !isValid(end)) return 'Invalid duration';
  
  const durationMinutes = differenceInMinutes(end, start);
  
  if (durationMinutes < 60) {
    return `${durationMinutes} mins`;
  } else {
    const hours = Math.floor(durationMinutes / 60);
    const mins = durationMinutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
};

/**
 * Get event style based on status
 * @param status Session status
 * @param theme Current theme
 * @returns Style object for the event
 */
export const getEventStyle = (status: Session['status']) => {
  const statusConfig = sessionStatusConfig[status] || sessionStatusConfig.scheduled;

  return {
    backgroundColor: statusConfig.bgColor,
    color: statusConfig.textColor,
    borderRadius: '4px',
    opacity: 0.85,
    border: 'none',
    display: 'block'
  };
};

/**
 * Get a new session with default values
 * @returns Default session object
 */
export const getDefaultNewSession = () => {
  // Set default times for the session (next hour, one hour duration)
  const startTime = new Date();
  startTime.setHours(startTime.getHours() + 1, 0, 0, 0); // Next hour, on the hour
  
  const endTime = new Date(startTime);
  endTime.setHours(endTime.getHours() + 1); // One hour later
  
  return {
    clientId: '',
    clientName: '',
    trainerId: '',
    trainerName: '',
    type: 'Personal',
    status: 'scheduled' as const,
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    notes: '',
    location: ''
  };
};

/**
 * Apply filters to a list of sessions
 * @param sessions All sessions
 * @param filters Current filter state
 * @param tabValue Current tab value
 * @returns Filtered sessions
 */
export const applySessionFilters = (
  sessions: Session[],
  filters: {
    status: string;
    clientName: string;
    trainerName: string;
    type: string;
    dateRange: {
      start: string;
      end: string;
    };
  },
  tabValue: number
): Session[] => {
  let filtered = [...sessions];

  // Apply tab filter (status)
  if (tabValue === 0) {
    // All sessions - no status filter
  } else if (tabValue === 1) {
    filtered = filtered.filter(session => ['scheduled', 'confirmed', 'requested'].includes(session.status));
  } else if (tabValue === 2) {
    filtered = filtered.filter(session => session.status === 'completed');
  } else if (tabValue === 3) {
    filtered = filtered.filter(session => ['cancelled', 'no-show'].includes(session.status));
  }

  // Apply additional filters
  if (filters.status) {
    filtered = filtered.filter(session => session.status === filters.status);
  }

  if (filters.clientName) {
    filtered = filtered.filter(session => 
      session.clientName.toLowerCase().includes(filters.clientName.toLowerCase())
    );
  }

  if (filters.trainerName) {
    filtered = filtered.filter(session => 
      session.trainerName.toLowerCase().includes(filters.trainerName.toLowerCase())
    );
  }

  if (filters.type) {
    filtered = filtered.filter(session => session.type === filters.type);
  }

  if (filters.dateRange.start) {
    filtered = filtered.filter(session => new Date(session.startTime) >= new Date(filters.dateRange.start));
  }

  if (filters.dateRange.end) {
    filtered = filtered.filter(session => new Date(session.startTime) <= new Date(filters.dateRange.end));
  }

  return filtered;
};

/**
 * Get API endpoint URL with base URL
 * @param endpoint API endpoint
 * @returns Full API URL
 */
export const getApiUrl = (endpoint: string): string => {
  return `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}${endpoint}`;
};
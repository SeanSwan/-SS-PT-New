/**
 * calendarHelpers - Pure Utility Functions
 * ========================================
 * Pure utility functions extracted from the monolithic component
 * for better testability and reusability.
 */

import type { SessionEvent, Session } from '../types';

/**
 * Generates a display title for a session
 */
export const getSessionTitle = (session: any): string => {
  if (session.client) {
    return `${session.client.firstName} ${session.client.lastName}`;
  }
  if (session.trainer) {
    return `Available - ${session.trainer.firstName}`;
  }
  return 'Available Slot';
};

/**
 * Generates styling for calendar events based on their status
 */
export const getEventStyle = (event: SessionEvent) => {
  const baseStyle = {
    borderRadius: '4px',
    border: 'none',
    color: 'white',
    fontSize: '0.75rem',
    fontWeight: '500'
  };
  
  switch (event.status) {
    case 'available':
      return { ...baseStyle, backgroundColor: '#22c55e' };
    case 'booked':
    case 'scheduled':
      return { ...baseStyle, backgroundColor: '#3b82f6' };
    case 'confirmed':
      return { ...baseStyle, backgroundColor: '#0ea5e9' };
    case 'completed':
      return { ...baseStyle, backgroundColor: '#6c757d' };
    case 'cancelled':
      return { ...baseStyle, backgroundColor: '#ef4444' };
    default:
      return { ...baseStyle, backgroundColor: '#3b82f6' };
  }
};

/**
 * Validates session data for form submission
 */
export const validateSessionData = (sessionData: Partial<Session>): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!sessionData.start) {
    errors.push('Start time is required');
  }
  
  if (!sessionData.end) {
    errors.push('End time is required');
  }
  
  if (sessionData.start && sessionData.end && sessionData.start >= sessionData.end) {
    errors.push('End time must be after start time');
  }
  
  if (sessionData.duration && sessionData.duration < 15) {
    errors.push('Session duration must be at least 15 minutes');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Formats session duration for display
 */
export const formatSessionDuration = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h ${remainingMinutes}m`;
};

/**
 * Generates time slot options for dropdowns
 */
export const generateTimeSlots = (startHour: number = 6, endHour: number = 22, intervalMinutes: number = 15): string[] => {
  const slots: string[] = [];
  
  for (let hour = startHour; hour <= endHour; hour++) {
    for (let minute = 0; minute < 60; minute += intervalMinutes) {
      const time = new Date();
      time.setHours(hour, minute, 0, 0);
      
      const timeString = time.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      
      slots.push(timeString);
    }
  }
  
  return slots;
};

/**
 * Calculates session conflicts
 */
export const findSessionConflicts = (
  newSession: { start: Date; end: Date; trainerId?: string },
  existingSessions: Session[]
): Session[] => {
  return existingSessions.filter(session => {
    // Skip if different trainer (unless checking for room conflicts)
    if (newSession.trainerId && session.trainerId !== newSession.trainerId) {
      return false;
    }
    
    // Check for time overlap
    const sessionStart = new Date(session.start);
    const sessionEnd = new Date(session.end);
    
    return (
      (newSession.start < sessionEnd && newSession.end > sessionStart) ||
      (sessionStart < newSession.end && sessionEnd > newSession.start)
    );
  });
};

/**
 * Groups sessions by date for list views
 */
export const groupSessionsByDate = (sessions: SessionEvent[]): Record<string, SessionEvent[]> => {
  return sessions.reduce((groups, session) => {
    const dateKey = session.start.toDateString();
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(session);
    return groups;
  }, {} as Record<string, SessionEvent[]>);
};

/**
 * Calculates business hours coverage
 */
export const calculateCoverage = (sessions: Session[], businessHours: { start: number; end: number }): number => {
  const totalBusinessMinutes = (businessHours.end - businessHours.start) * 60;
  
  const coveredMinutes = sessions.reduce((total, session) => {
    const sessionStart = new Date(session.start);
    const sessionEnd = new Date(session.end);
    
    // Only count sessions within business hours
    const startHour = sessionStart.getHours();
    const endHour = sessionEnd.getHours();
    
    if (startHour >= businessHours.start && endHour <= businessHours.end) {
      return total + (sessionEnd.getTime() - sessionStart.getTime()) / (1000 * 60);
    }
    
    return total;
  }, 0);
  
  return Math.round((coveredMinutes / totalBusinessMinutes) * 100);
};

/**
 * Generates calendar event colors based on multiple factors
 */
export const getAdvancedEventStyle = (
  event: SessionEvent,
  options: {
    theme?: 'light' | 'dark';
    emphasizeSelected?: boolean;
    showPriority?: boolean;
  } = {}
) => {
  const { theme = 'dark', emphasizeSelected = false, showPriority = false } = options;
  
  let style = getEventStyle(event);
  
  // Apply theme-specific adjustments
  if (theme === 'light') {
    style = {
      ...style,
      color: 'black',
      border: '1px solid rgba(0, 0, 0, 0.1)'
    };
  }
  
  // Emphasize selected events
  if (emphasizeSelected) {
    style = {
      ...style,
      boxShadow: '0 0 0 2px #3b82f6',
      transform: 'scale(1.02)'
    };
  }
  
  // Show priority indicators
  if (showPriority && event.resource?.priority === 'high') {
    style = {
      ...style,
      borderLeft: '4px solid #ef4444'
    };
  }
  
  return style;
};

/**
 * Filters sessions based on multiple criteria
 */
export const filterSessions = (
  sessions: Session[],
  filters: {
    status?: string;
    trainerId?: string;
    clientId?: string;
    dateRange?: { start: Date; end: Date };
    searchTerm?: string;
  }
): Session[] => {
  return sessions.filter(session => {
    // Status filter
    if (filters.status && filters.status !== 'all' && session.status !== filters.status) {
      return false;
    }
    
    // Trainer filter
    if (filters.trainerId && session.trainerId !== filters.trainerId) {
      return false;
    }
    
    // Client filter
    if (filters.clientId && session.userId !== filters.clientId) {
      return false;
    }
    
    // Date range filter
    if (filters.dateRange) {
      const sessionDate = new Date(session.start);
      if (sessionDate < filters.dateRange.start || sessionDate > filters.dateRange.end) {
        return false;
      }
    }
    
    // Search term filter
    if (filters.searchTerm && filters.searchTerm.trim()) {
      const searchTerm = filters.searchTerm.toLowerCase();
      const searchableText = [
        session.client?.firstName,
        session.client?.lastName,
        session.trainer?.firstName,
        session.trainer?.lastName,
        session.notes,
        session.location
      ].filter(Boolean).join(' ').toLowerCase();
      
      if (!searchableText.includes(searchTerm)) {
        return false;
      }
    }
    
    return true;
  });
};

/**
 * Sorts sessions by multiple criteria
 */
export const sortSessions = (
  sessions: Session[],
  sortBy: 'date' | 'client' | 'trainer' | 'status' = 'date',
  order: 'asc' | 'desc' = 'asc'
): Session[] => {
  return [...sessions].sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'date':
        comparison = new Date(a.start).getTime() - new Date(b.start).getTime();
        break;
      case 'client':
        const clientA = `${a.client?.firstName || ''} ${a.client?.lastName || ''}`.trim();
        const clientB = `${b.client?.firstName || ''} ${b.client?.lastName || ''}`.trim();
        comparison = clientA.localeCompare(clientB);
        break;
      case 'trainer':
        const trainerA = `${a.trainer?.firstName || ''} ${a.trainer?.lastName || ''}`.trim();
        const trainerB = `${b.trainer?.firstName || ''} ${b.trainer?.lastName || ''}`.trim();
        comparison = trainerA.localeCompare(trainerB);
        break;
      case 'status':
        comparison = a.status.localeCompare(b.status);
        break;
    }
    
    return order === 'desc' ? -comparison : comparison;
  });
};

/**
 * useFilteredCalendarEvents - Calendar Event Transformation & Filtering Hook
 * =========================================================================
 * Specialized hook for transforming raw session data into filtered calendar events
 * 
 * SINGLE RESPONSIBILITY:
 * - Transform Session objects into SessionEvent objects
 * - Apply all filtering logic (trainer, client, status, location, search, dates)
 * - Provide memoized calendar events for optimal performance
 * - Handle session title generation and event mapping
 * 
 * ARCHITECTURAL BENEFITS:
 * - Pure function approach: Input → Transformation → Output
 * - Memoized for performance: Only recalculates when inputs change
 * - Easily testable: Clear input/output contract
 * - Reusable: Can be used by any component needing filtered events
 */

import { useCallback, useMemo } from 'react';
import type { 
  Session, 
  SessionEvent, 
  FilterOptions 
} from '../types';

export interface FilteredCalendarEventsValues {
  // Computed Data
  calendarEvents: SessionEvent[];
  
  // Statistics
  filteredEventCount: number;
  totalEventCount: number;
  filterEfficiency: number; // Percentage of events shown after filtering
}

export interface FilteredCalendarEventsActions {
  // Utility Functions (exposed for external use if needed)
  getSessionTitle: (session: Session) => string;
  transformSessionToEvent: (session: Session) => SessionEvent;
}

interface UseFilteredCalendarEventsParams {
  sessions: Session[];
  filterOptions: FilterOptions;
}

/**
 * useFilteredCalendarEvents Hook
 * 
 * Takes raw sessions and filter options, returns memoized filtered calendar events.
 * This hook is pure and stateless - it only transforms and filters data.
 */
export const useFilteredCalendarEvents = ({
  sessions,
  filterOptions
}: UseFilteredCalendarEventsParams) => {
  
  // ==================== UTILITY FUNCTIONS ====================
  
  /**
   * Generate appropriate session title based on client/trainer data
   */
  const getSessionTitle = useCallback((session: Session): string => {
    if (session.client) {
      return `${session.client.firstName} ${session.client.lastName}`;
    }
    if (session.trainer) {
      return `Available - ${session.trainer.firstName}`;
    }
    return 'Available Slot';
  }, []);

  /**
   * Transform a raw Session into a SessionEvent for calendar display
   */
  const transformSessionToEvent = useCallback((session: Session): SessionEvent => {
    return {
      id: session.id,
      title: getSessionTitle(session),
      start: new Date(session.start),
      end: new Date(session.end),
      status: session.status,
      userId: session.userId,
      trainerId: session.trainerId,
      client: session.client,
      trainer: session.trainer,
      location: session.location,
      notes: session.notes,
      duration: session.duration,
      resource: session
    };
  }, [getSessionTitle]);

  // ==================== MEMOIZED FILTERED EVENTS ====================
  
  /**
   * Core filtering and transformation logic
   * Memoized to prevent unnecessary recalculations
   */
  const calendarEvents = useMemo(() => {
    // Step 1: Transform all sessions to events
    let filteredEvents = sessions.map(transformSessionToEvent);
    
    // Step 2: Apply trainer filter
    if (filterOptions.trainerId) {
      filteredEvents = filteredEvents.filter(event => 
        event.trainerId === filterOptions.trainerId
      );
    }
    
    // Step 3: Apply client filter
    if (filterOptions.clientId) {
      filteredEvents = filteredEvents.filter(event => 
        event.userId === filterOptions.clientId
      );
    }
    
    // Step 4: Apply status filter
    if (filterOptions.status !== 'all') {
      filteredEvents = filteredEvents.filter(event => 
        event.status === filterOptions.status
      );
    }
    
    // Step 5: Apply location filter
    if (filterOptions.location) {
      filteredEvents = filteredEvents.filter(event => 
        event.location?.toLowerCase().includes(filterOptions.location.toLowerCase())
      );
    }
    
    // Step 6: Apply search term filter
    if (filterOptions.searchTerm) {
      const searchTerm = filterOptions.searchTerm.toLowerCase();
      filteredEvents = filteredEvents.filter(event =>
        event.title.toLowerCase().includes(searchTerm) ||
        event.client?.firstName?.toLowerCase().includes(searchTerm) ||
        event.client?.lastName?.toLowerCase().includes(searchTerm) ||
        event.trainer?.firstName?.toLowerCase().includes(searchTerm) ||
        event.trainer?.lastName?.toLowerCase().includes(searchTerm)
      );
    }
    
    // Step 7: Apply date range filter
    if (filterOptions.dateRange !== 'all') {
      const now = new Date();
      let startDate: Date;
      
      switch (filterOptions.dateRange) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          filteredEvents = filteredEvents.filter(event => 
            event.start >= startDate && event.start < new Date(startDate.getTime() + 24 * 60 * 60 * 1000)
          );
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          filteredEvents = filteredEvents.filter(event => event.start >= startDate);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          filteredEvents = filteredEvents.filter(event => event.start >= startDate);
          break;
        case 'custom':
          if (filterOptions.customDateStart) {
            const customStart = new Date(filterOptions.customDateStart);
            filteredEvents = filteredEvents.filter(event => event.start >= customStart);
          }
          if (filterOptions.customDateEnd) {
            const customEnd = new Date(filterOptions.customDateEnd);
            filteredEvents = filteredEvents.filter(event => event.start <= customEnd);
          }
          break;
      }
    }
    
    return filteredEvents;
  }, [
    sessions, 
    transformSessionToEvent,
    filterOptions.trainerId,
    filterOptions.clientId,
    filterOptions.status,
    filterOptions.location,
    filterOptions.searchTerm,
    filterOptions.dateRange,
    filterOptions.customDateStart,
    filterOptions.customDateEnd
  ]);

  // ==================== STATISTICS ====================
  
  const totalEventCount = useMemo(() => sessions.length, [sessions.length]);
  const filteredEventCount = useMemo(() => calendarEvents.length, [calendarEvents.length]);
  const filterEfficiency = useMemo(() => {
    if (totalEventCount === 0) return 100;
    return Math.round((filteredEventCount / totalEventCount) * 100);
  }, [filteredEventCount, totalEventCount]);

  // ==================== RETURN VALUES ====================
  
  const values: FilteredCalendarEventsValues = {
    calendarEvents,
    filteredEventCount,
    totalEventCount,
    filterEfficiency
  };
  
  const actions: FilteredCalendarEventsActions = {
    getSessionTitle,
    transformSessionToEvent
  };
  
  return { ...values, ...actions };
};

export default useFilteredCalendarEvents;

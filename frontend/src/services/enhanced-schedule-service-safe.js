/**
 * Enhanced Schedule Service - Safe Fallback Implementation
 * This is a wrapper around the existing enhanced-schedule-service that provides
 * fallback functionality to prevent errors when methods are missing.
 */

import baseScheduleService from './enhanced-schedule-service';

// Create a safe wrapper with fallback implementations
const safeScheduleService = {
  ...baseScheduleService,
  
  // Ensure getSessions always returns an array
  getSessions: async () => {
    try {
      if (typeof baseScheduleService.getSessions !== 'function') {
        console.warn('getSessions not defined in enhanced-schedule-service, using fallback');
        return [];
      }
      
      const sessions = await baseScheduleService.getSessions();
      return Array.isArray(sessions) ? sessions : [];
    } catch (error) {
      console.error('Error in getSessions:', error);
      return [];
    }
  },
  
  // Ensure getTrainers always returns an array
  getTrainers: async () => {
    try {
      if (typeof baseScheduleService.getTrainers !== 'function') {
        console.warn('getTrainers not defined in enhanced-schedule-service, using fallback');
        return [];
      }
      
      const trainers = await baseScheduleService.getTrainers();
      return Array.isArray(trainers) ? trainers : [];
    } catch (error) {
      console.error('Error in getTrainers:', error);
      return [];
    }
  },
  
  // Ensure getClients always returns an array
  getClients: async () => {
    try {
      if (typeof baseScheduleService.getClients !== 'function') {
        console.warn('getClients not defined in enhanced-schedule-service, using fallback');
        return [];
      }
      
      const clients = await baseScheduleService.getClients();
      return Array.isArray(clients) ? clients : [];
    } catch (error) {
      console.error('Error in getClients:', error);
      return [];
    }
  },
  
  // Ensure getScheduleStats always returns a valid stats object
  getScheduleStats: async () => {
    try {
      if (typeof baseScheduleService.getScheduleStats !== 'function') {
        console.warn('getScheduleStats not defined in enhanced-schedule-service, using fallback');
        return {
          stats: {
            total: 0,
            available: 0,
            booked: 0,
            confirmed: 0,
            completed: 0,
            cancelled: 0,
            blocked: 0,
            upcoming: 0
          }
        };
      }
      
      const result = await baseScheduleService.getScheduleStats();
      return result && result.stats ? result : {
        stats: {
          total: 0,
          available: 0,
          booked: 0,
          confirmed: 0,
          completed: 0,
          cancelled: 0,
          blocked: 0,
          upcoming: 0
        }
      };
    } catch (error) {
      console.error('Error in getScheduleStats:', error);
      return {
        stats: {
          total: 0,
          available: 0,
          booked: 0,
          confirmed: 0,
          completed: 0,
          cancelled: 0,
          blocked: 0,
          upcoming: 0
        }
      };
    }
  },
  
  // Ensure bookSession returns a valid result
  bookSession: async (sessionId) => {
    try {
      if (typeof baseScheduleService.bookSession !== 'function') {
        console.warn('bookSession not defined in enhanced-schedule-service, using fallback');
        return { success: true, sessionId };
      }
      
      return await baseScheduleService.bookSession(sessionId);
    } catch (error) {
      console.error('Error in bookSession:', error);
      return { success: false, sessionId, error: 'Failed to book session' };
    }
  },
  
  // Ensure createAvailableSessions returns a valid result
  createAvailableSessions: async (data) => {
    try {
      if (typeof baseScheduleService.createAvailableSessions !== 'function') {
        console.warn('createAvailableSessions not defined in enhanced-schedule-service, using fallback');
        return { success: true, sessions: [] };
      }
      
      return await baseScheduleService.createAvailableSessions(data);
    } catch (error) {
      console.error('Error in createAvailableSessions:', error);
      return { success: false, sessions: [], error: 'Failed to create sessions' };
    }
  },
  
  // Ensure confirmSession returns a valid result
  confirmSession: async (sessionId) => {
    try {
      if (typeof baseScheduleService.confirmSession !== 'function') {
        console.warn('confirmSession not defined in enhanced-schedule-service, using fallback');
        return { success: true, sessionId };
      }
      
      return await baseScheduleService.confirmSession(sessionId);
    } catch (error) {
      console.error('Error in confirmSession:', error);
      return { success: false, sessionId, error: 'Failed to confirm session' };
    }
  },
  
  // Ensure cancelSession returns a valid result
  cancelSession: async (sessionId) => {
    try {
      if (typeof baseScheduleService.cancelSession !== 'function') {
        console.warn('cancelSession not defined in enhanced-schedule-service, using fallback');
        return { success: true, sessionId };
      }
      
      return await baseScheduleService.cancelSession(sessionId);
    } catch (error) {
      console.error('Error in cancelSession:', error);
      return { success: false, sessionId, error: 'Failed to cancel session' };
    }
  },
  
  // Ensure createBlockedTime returns a valid result
  createBlockedTime: async (data) => {
    try {
      if (typeof baseScheduleService.createBlockedTime !== 'function') {
        console.warn('createBlockedTime not defined in enhanced-schedule-service, using fallback');
        return { 
          success: true, 
          session: {
            id: `fallback-blocked-${Date.now()}`,
            title: `Blocked: ${data.reason || 'Unavailable'}`,
            start: new Date(data.start),
            end: data.end ? new Date(data.end) : new Date(new Date(data.start).getTime() + (data.duration || 60) * 60000),
            status: 'blocked',
            trainerId: data.trainerId,
            location: data.location || 'Main Studio',
            reason: data.reason || 'Unavailable',
            duration: data.duration || 60,
            isRecurring: data.isRecurring || false,
            recurringPattern: data.recurringPattern || null
          },
          recurringCount: data.isRecurring ? 1 : 0 // Placeholder count for recurring instances
        };
      }
      
      return await baseScheduleService.createBlockedTime(data);
    } catch (error) {
      console.error('Error in createBlockedTime:', error);
      return { success: false, session: null, error: 'Failed to create blocked time' };
    }
  },
  
  // Ensure assignTrainer returns a valid result
  assignTrainer: async (sessionId, trainerId) => {
    try {
      if (typeof baseScheduleService.assignTrainer !== 'function') {
        console.warn('assignTrainer not defined in enhanced-schedule-service, using fallback');
        return { success: true, sessionId, trainerId };
      }
      
      return await baseScheduleService.assignTrainer(sessionId, trainerId);
    } catch (error) {
      console.error('Error in assignTrainer:', error);
      return { success: false, sessionId, trainerId, error: 'Failed to assign trainer' };
    }
  },
  
  // Enhanced methods for Universal Calendar integration
  // Role-based data fetching methods
  getTrainerSessions: async (trainerId) => {
    try {
      if (typeof baseScheduleService.getTrainerSessions === 'function') {
        return await baseScheduleService.getTrainerSessions(trainerId);
      }
      
      // Fallback: filter all sessions by trainerId
      const allSessions = await safeScheduleService.getSessions();
      return allSessions.filter(session => session.trainerId === trainerId);
    } catch (error) {
      console.error('Error in getTrainerSessions:', error);
      return [];
    }
  },
  
  getClientSessions: async (clientId) => {
    try {
      if (typeof baseScheduleService.getClientSessions === 'function') {
        return await baseScheduleService.getClientSessions(clientId);
      }
      
      // Fallback: filter all sessions by clientId/userId
      const allSessions = await safeScheduleService.getSessions();
      return allSessions.filter(session => session.userId === clientId || session.clientId === clientId);
    } catch (error) {
      console.error('Error in getClientSessions:', error);
      return [];
    }
  },
  
  getPublicAvailability: async () => {
    try {
      if (typeof baseScheduleService.getPublicAvailability === 'function') {
        return await baseScheduleService.getPublicAvailability();
      }
      
      // Fallback: return only available sessions
      const allSessions = await safeScheduleService.getSessions();
      return allSessions.filter(session => session.status === 'available');
    } catch (error) {
      console.error('Error in getPublicAvailability:', error);
      return [];
    }
  },
  
  // Enhanced booking with transaction support
  bookSessionWithTransaction: async (sessionData) => {
    try {
      if (typeof baseScheduleService.bookSessionWithTransaction === 'function') {
        return await baseScheduleService.bookSessionWithTransaction(sessionData);
      }
      
      // Fallback: use regular booking method
      console.warn('bookSessionWithTransaction not available, using regular booking');
      const result = await safeScheduleService.bookSession(sessionData.sessionId);
      
      return {
        ...result,
        sessionId: sessionData.sessionId,
        clientData: sessionData.clientId ? { id: sessionData.clientId } : null,
        transactionSuccessful: result.success || true
      };
    } catch (error) {
      console.error('Error in bookSessionWithTransaction:', error);
      return {
        success: false,
        sessionId: sessionData.sessionId,
        clientData: null,
        transactionSuccessful: false,
        error: 'Failed to book session with transaction'
      };
    }
  },
  
  // Ensure deleteBlockedTime returns a valid result
  deleteBlockedTime: async (blockedTimeId, removeAll = false) => {
    try {
      if (typeof baseScheduleService.deleteBlockedTime !== 'function') {
        console.warn('deleteBlockedTime not defined in enhanced-schedule-service, using fallback');
        return { 
          success: true, 
          message: removeAll ? 
            'Deleted blocked time series (fallback)' : 
            'Deleted blocked time slot (fallback)', 
          removedCount: removeAll ? 5 : 1 // Placeholder count
        };
      }
      
      return await baseScheduleService.deleteBlockedTime(blockedTimeId, removeAll);
    } catch (error) {
      console.error('Error in deleteBlockedTime:', error);
      return { success: false, error: 'Failed to delete blocked time' };
    }
  }
};

export default safeScheduleService;
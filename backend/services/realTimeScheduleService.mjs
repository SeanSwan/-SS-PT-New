/**
 * Real-Time Schedule Event Service - SwanStudios WebSocket Broadcasting
 * ====================================================================
 * Centralized service for broadcasting real-time schedule events across the platform
 * 
 * CORE RESPONSIBILITIES:
 * - Broadcast session lifecycle events (create, update, delete, book, cancel)
 * - Handle role-based event distribution (admin, trainer, client-specific)
 * - Manage conflict detection and prevention
 * - Integrate with gamification system events
 * - Provide connection analytics and monitoring
 * 
 * SUPPORTED EVENT TYPES:
 * - session:created - New session added to schedule
 * - session:updated - Session details modified
 * - session:deleted - Session removed from schedule
 * - session:booked - Session booked by client
 * - session:cancelled - Session booking cancelled
 * - session:confirmed - Session confirmed by trainer
 * - session:completed - Session marked as completed
 * - schedule:conflict - Real-time conflict detected
 * - allocation:updated - Session allocation changed
 * - gamification:achievement - Achievement unlocked
 * 
 * ROLE-BASED BROADCASTING:
 * - Admins: All events across entire platform
 * - Trainers: Events for assigned clients and own sessions
 * - Clients: Events for own sessions and available bookings
 * - Users: Available session updates only
 */

import { getIO } from '../socket/socketManager.mjs';
import logger from '../utils/logger.mjs';
import { getUser, getSession } from '../models/index.mjs';

/**
 * Real-Time Schedule Event Service Class
 * Manages all WebSocket broadcasting for schedule-related events
 */
class RealTimeScheduleService {
  constructor() {
    this.serviceName = 'RealTimeScheduleService';
    this.version = '1.0.0';
    this.eventsEmitted = 0;
    this.connectionsActive = 0;
    this.lastEventTime = null;
  }

  /**
   * Get Socket.IO instance with error handling
   */
  getSocketIO() {
    try {
      const io = getIO();
      if (!io) {
        logger.warn('[RealTimeScheduleService] Socket.IO not initialized - events will be skipped');
        return null;
      }
      return io;
    } catch (error) {
      logger.error('[RealTimeScheduleService] Error accessing Socket.IO:', error);
      return null;
    }
  }

  /**
   * Broadcast event to specific rooms based on roles and relationships
   * @param {string} eventType - Type of event (session:created, session:updated, etc.)
   * @param {object} eventData - Event payload data
   * @param {object} options - Broadcasting options (rooms, excludeUser, priority)
   */
  async broadcastEvent(eventType, eventData, options = {}) {
    try {
      const io = this.getSocketIO();
      if (!io) return;

      const {
        rooms = [],
        excludeUser = null,
        priority = 'normal',
        requireAuth = true,
        sessionId = null,
        trainerId = null,
        clientId = null
      } = options;

      // Create event payload
      const payload = {
        type: eventType,
        data: eventData,
        timestamp: new Date().toISOString(),
        priority,
        sessionId,
        trainerId,
        clientId
      };

      // Determine target rooms based on event type and relationships
      const targetRooms = await this.determineTargetRooms(eventType, eventData, options);

      // Broadcast to each target room
      for (const room of targetRooms) {
        if (excludeUser) {
          io.to(room).except(excludeUser).emit('schedule:update', payload);
        } else {
          io.to(room).emit('schedule:update', payload);
        }
        
        logger.info(`[RealTimeScheduleService] Event ${eventType} broadcasted to room: ${room}`);
      }

      // Update service metrics
      this.eventsEmitted++;
      this.lastEventTime = new Date();

      logger.info(`[RealTimeScheduleService] Event broadcasted successfully`, {
        eventType,
        rooms: targetRooms,
        excludeUser,
        payload: payload.data
      });

    } catch (error) {
      logger.error(`[RealTimeScheduleService] Error broadcasting event ${eventType}:`, error);
    }
  }

  /**
   * Determine which rooms should receive the event based on relationships
   * @param {string} eventType - Type of event
   * @param {object} eventData - Event data
   * @param {object} options - Additional options
   * @returns {Array} Array of room names to broadcast to
   */
  async determineTargetRooms(eventType, eventData, options) {
    const rooms = [];

    try {
      // Always broadcast to admin room
      rooms.push('admin');
      rooms.push('dashboard:admin');

      // Session-specific room for real-time collaboration
      if (eventData.sessionId || options.sessionId) {
        rooms.push(`session:${eventData.sessionId || options.sessionId}`);
      }

      // Trainer-specific events
      if (eventData.trainerId || options.trainerId) {
        const trainerId = eventData.trainerId || options.trainerId;
        rooms.push(`trainer:${trainerId}`);
        rooms.push('trainer'); // All trainers for general updates
      }

      // Client-specific events
      if (eventData.userId || eventData.clientId || options.clientId) {
        const clientId = eventData.userId || eventData.clientId || options.clientId;
        rooms.push(`user:${clientId}`);
        
        // If it's a booking event, also notify the assigned trainer
        if (eventType.includes('booked') || eventType.includes('cancelled')) {
          rooms.push('trainer'); // Notify all trainers of booking changes
        }
      }

      // Event-type specific room targeting
      switch (eventType) {
        case 'session:created':
        case 'session:updated':
          // Broadcast to all users who can see available sessions
          rooms.push('public'); // Public users looking for sessions
          rooms.push('client'); // All clients
          break;

        case 'session:deleted':
          // Notify everyone who might have been tracking this session
          rooms.push('public');
          rooms.push('client');
          rooms.push('trainer');
          break;

        case 'session:booked':
        case 'session:cancelled':
          // High priority - notify admins and involved parties immediately
          rooms.push('dashboard:admin');
          if (eventData.trainerId) {
            rooms.push(`trainer:${eventData.trainerId}`);
          }
          break;

        case 'allocation:updated':
          // Financial events - admin and affected user only
          if (eventData.userId) {
            rooms.push(`user:${eventData.userId}`);
          }
          break;

        case 'gamification:achievement':
          // Social events - broader distribution for community engagement
          rooms.push('client');
          rooms.push('social');
          if (eventData.userId) {
            rooms.push(`user:${eventData.userId}`);
          }
          break;

        case 'schedule:conflict':
          // Critical conflicts - immediate admin notification
          rooms.push('admin');
          rooms.push('dashboard:admin');
          if (eventData.trainerId) {
            rooms.push(`trainer:${eventData.trainerId}`);
          }
          break;
      }

      // Remove duplicates and return
      return [...new Set(rooms)];

    } catch (error) {
      logger.error('[RealTimeScheduleService] Error determining target rooms:', error);
      return ['admin']; // Fallback to admin room only
    }
  }

  // ==================== SESSION LIFECYCLE EVENTS ====================

  /**
   * Broadcast session creation event
   */
  async broadcastSessionCreated(sessionData, options = {}) {
    await this.broadcastEvent('session:created', {
      sessionId: sessionData.id,
      trainerId: sessionData.trainerId,
      startTime: sessionData.startTime,
      endTime: sessionData.endTime,
      status: sessionData.status,
      location: sessionData.location,
      title: sessionData.title || 'Training Session'
    }, {
      ...options,
      sessionId: sessionData.id,
      trainerId: sessionData.trainerId,
      priority: 'normal'
    });
  }

  /**
   * Broadcast session update event
   */
  async broadcastSessionUpdated(sessionData, changes, options = {}) {
    await this.broadcastEvent('session:updated', {
      sessionId: sessionData.id,
      trainerId: sessionData.trainerId,
      clientId: sessionData.userId,
      changes,
      startTime: sessionData.startTime,
      endTime: sessionData.endTime,
      status: sessionData.status,
      location: sessionData.location
    }, {
      ...options,
      sessionId: sessionData.id,
      trainerId: sessionData.trainerId,
      clientId: sessionData.userId,
      priority: 'high'
    });
  }

  /**
   * Broadcast session booking event
   */
  async broadcastSessionBooked(sessionData, clientData, options = {}) {
    await this.broadcastEvent('session:booked', {
      sessionId: sessionData.id,
      trainerId: sessionData.trainerId,
      clientId: clientData.id,
      clientName: `${clientData.firstName} ${clientData.lastName}`,
      startTime: sessionData.startTime,
      endTime: sessionData.endTime,
      location: sessionData.location,
      bookedAt: new Date().toISOString()
    }, {
      ...options,
      sessionId: sessionData.id,
      trainerId: sessionData.trainerId,
      clientId: clientData.id,
      priority: 'high'
    });
  }

  /**
   * Broadcast session cancellation event
   */
  async broadcastSessionCancelled(sessionData, reason, cancelledBy, options = {}) {
    await this.broadcastEvent('session:cancelled', {
      sessionId: sessionData.id,
      trainerId: sessionData.trainerId,
      clientId: sessionData.userId,
      reason,
      cancelledBy,
      startTime: sessionData.startTime,
      endTime: sessionData.endTime,
      cancelledAt: new Date().toISOString()
    }, {
      ...options,
      sessionId: sessionData.id,
      trainerId: sessionData.trainerId,
      clientId: sessionData.userId,
      priority: 'high'
    });
  }

  /**
   * Broadcast session completion event
   */
  async broadcastSessionCompleted(sessionData, completionData = {}, options = {}) {
    await this.broadcastEvent('session:completed', {
      sessionId: sessionData.id,
      trainerId: sessionData.trainerId,
      clientId: sessionData.userId,
      completedAt: new Date().toISOString(),
      ...completionData
    }, {
      ...options,
      sessionId: sessionData.id,
      trainerId: sessionData.trainerId,
      clientId: sessionData.userId,
      priority: 'normal'
    });
  }

  // ==================== CONFLICT DETECTION EVENTS ====================

  /**
   * Broadcast scheduling conflict detected
   */
  async broadcastScheduleConflict(conflictData, options = {}) {
    await this.broadcastEvent('schedule:conflict', {
      conflictType: conflictData.type, // 'double-booking', 'trainer-unavailable', 'time-overlap'
      sessionIds: conflictData.sessionIds,
      trainerId: conflictData.trainerId,
      timeSlot: conflictData.timeSlot,
      severity: conflictData.severity, // 'low', 'medium', 'high', 'critical'
      message: conflictData.message,
      suggestions: conflictData.suggestions || []
    }, {
      ...options,
      trainerId: conflictData.trainerId,
      priority: 'critical'
    });
  }

  // ==================== ALLOCATION EVENTS ====================

  /**
   * Broadcast session allocation update
   */
  async broadcastAllocationUpdated(allocationData, options = {}) {
    await this.broadcastEvent('allocation:updated', {
      userId: allocationData.userId,
      sessionsAdded: allocationData.sessionsAdded,
      sessionsRemaining: allocationData.sessionsRemaining,
      packageType: allocationData.packageType,
      reason: allocationData.reason,
      allocatedBy: allocationData.allocatedBy
    }, {
      ...options,
      clientId: allocationData.userId,
      priority: 'normal'
    });
  }

  // ==================== GAMIFICATION EVENTS ====================

  /**
   * Broadcast gamification achievement
   */
  async broadcastGamificationEvent(eventData, options = {}) {
    await this.broadcastEvent('gamification:achievement', {
      userId: eventData.userId,
      achievementType: eventData.type,
      points: eventData.points,
      level: eventData.level,
      badge: eventData.badge,
      message: eventData.message,
      celebrationLevel: eventData.celebrationLevel || 'standard'
    }, {
      ...options,
      clientId: eventData.userId,
      priority: 'normal'
    });
  }

  // ==================== SERVICE HEALTH & ANALYTICS ====================

  /**
   * Get service health and metrics
   */
  getServiceHealth() {
    const io = this.getSocketIO();
    
    return {
      service: this.serviceName,
      version: this.version,
      status: io ? 'active' : 'inactive',
      eventsEmitted: this.eventsEmitted,
      connectionsActive: io ? io.engine.clientsCount : 0,
      lastEventTime: this.lastEventTime,
      uptime: process.uptime()
    };
  }

  /**
   * Reset service metrics
   */
  resetMetrics() {
    this.eventsEmitted = 0;
    this.lastEventTime = null;
    logger.info('[RealTimeScheduleService] Metrics reset');
  }

  // ==================== DIRECT MESSAGING HELPERS ====================

  /**
   * Send direct message to specific user
   */
  async sendDirectMessage(userId, eventType, data, options = {}) {
    try {
      const io = this.getSocketIO();
      if (!io) return;

      const payload = {
        type: eventType,
        data,
        timestamp: new Date().toISOString(),
        direct: true,
        userId
      };

      io.to(`user:${userId}`).emit('schedule:direct', payload);
      
      logger.info(`[RealTimeScheduleService] Direct message sent to user ${userId}:`, eventType);
    } catch (error) {
      logger.error(`[RealTimeScheduleService] Error sending direct message:`, error);
    }
  }

  /**
   * Broadcast to all admins
   */
  async broadcastToAdmins(eventType, data, options = {}) {
    await this.broadcastEvent(eventType, data, {
      ...options,
      rooms: ['admin', 'dashboard:admin'],
      priority: 'high'
    });
  }

  /**
   * Broadcast to all trainers
   */
  async broadcastToTrainers(eventType, data, options = {}) {
    await this.broadcastEvent(eventType, data, {
      ...options,
      rooms: ['trainer'],
      priority: 'normal'
    });
  }
}

// Create and export singleton instance
const realTimeScheduleService = new RealTimeScheduleService();

export default realTimeScheduleService;

// Named exports for specific functionality
export { realTimeScheduleService };
export const {
  broadcastSessionCreated,
  broadcastSessionUpdated,
  broadcastSessionBooked,
  broadcastSessionCancelled,
  broadcastSessionCompleted,
  broadcastScheduleConflict,
  broadcastAllocationUpdated,
  broadcastGamificationEvent,
  sendDirectMessage,
  broadcastToAdmins,
  broadcastToTrainers,
  getServiceHealth
} = realTimeScheduleService;

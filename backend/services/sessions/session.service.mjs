/**
 * Unified Session Service - SwanStudios Master Session Management
 * ===============================================================
 * AAA 7-Star Production-Ready Consolidation (Phase 1: Backend Harmonization)
 * 
 * ARCHITECTURAL TRANSFORMATION:
 * ✅ Single Source of Truth for ALL session operations
 * ✅ Transactional integrity with ACID compliance
 * ✅ Role-based data filtering at service level
 * ✅ Consolidated business logic from 3+ fragmented services
 * ✅ Enterprise-grade error handling and logging
 * ✅ Notification system integration
 * ✅ Session allocation from completed orders
 * ✅ Real-time calendar event formatting
 * ✅ Comprehensive audit trail
 * 
 * CONSOLIDATED LOGIC FROM:
 * - SessionAllocationService.mjs (Order → Session allocation)
 * - TrainingSessionService.mjs (Package → Training sessions) 
 * - enhancedSessionController.mjs (CRUD + Advanced operations)
 * 
 * BUSINESS OPERATIONS UNIFIED:
 * - Session creation (available, recurring, blocked)
 * - Session booking with balance deduction
 * - Session lifecycle management (confirm, cancel, complete)
 * - Trainer assignment and scheduling
 * - Order-based session allocation
 * - Role-based data access and filtering
 * - Real-time calendar integration
 * - Comprehensive statistics and reporting
 */

import logger from '../../utils/logger.mjs';
import Session from '../../models/Session.mjs';
import User from '../../models/User.mjs';
import { Op } from 'sequelize';
import sequelize from '../../database.mjs';
import moment from 'moment';

// Import Real-Time Schedule Service for WebSocket broadcasting
import realTimeScheduleService from '../realTimeScheduleService.mjs';

// Import consolidated model getters for consistency
import { 
  getUser, 
  getOrder, 
  getOrderItem, 
  getStorefrontItem, 
  getSession,
  getFinancialTransaction 
} from '../../models/index.mjs';

// Import notification utilities
import { 
  sendEmailNotification,
  sendSmsNotification,
  notifySessionBooked, 
  notifyAdminSessionBooked, 
  notifySessionCancelled,
  processSessionDeduction,
  notifyLowSessionsRemaining,
  sendSessionReminder
} from '../../utils/notification.mjs';

/**
 * Unified Session Service Class
 * Handles ALL session-related operations with role-based access and transactional integrity
 */
class UnifiedSessionService {
  constructor() {
    this.serviceName = 'UnifiedSessionService';
    this.version = '1.0.0';
    this.enableRealTimeEvents = true; // Feature flag for real-time broadcasting
    // ✅ PHASE 2C FIX: Lazy-load models to avoid initialization order issues
    this._Session = null;
    this._User = null;
    this._Order = null;
    this._OrderItem = null;
    this._StorefrontItem = null;
    this._FinancialTransaction = null;
  }

  // ✅ ENHANCED P0 FIX: Robust lazy getters with initialization checks
  get Session() {
    if (!this._Session) {
      try {
        this._Session = getSession();
        if (!this._Session) {
          throw new Error('Session model not available - models cache may not be initialized');
        }
      } catch (error) {
        logger.error('[UnifiedSessionService] Error accessing Session model:', error);
        throw new Error(`Session model unavailable: ${error.message}`);
      }
    }
    return this._Session;
  }

  get User() {
    if (!this._User) {
      try {
        this._User = getUser();
        if (!this._User) {
          throw new Error('User model not available - models cache may not be initialized');
        }
      } catch (error) {
        logger.error('[UnifiedSessionService] Error accessing User model:', error);
        throw new Error(`User model unavailable: ${error.message}`);
      }
    }
    return this._User;
  }

  get Order() {
    if (!this._Order) {
      try {
        this._Order = getOrder();
        if (!this._Order) {
          throw new Error('Order model not available - models cache may not be initialized');
        }
      } catch (error) {
        logger.error('[UnifiedSessionService] Error accessing Order model:', error);
        throw new Error(`Order model unavailable: ${error.message}`);
      }
    }
    return this._Order;
  }

  get OrderItem() {
    if (!this._OrderItem) {
      try {
        this._OrderItem = getOrderItem();
        if (!this._OrderItem) {
          throw new Error('OrderItem model not available - models cache may not be initialized');
        }
      } catch (error) {
        logger.error('[UnifiedSessionService] Error accessing OrderItem model:', error);
        throw new Error(`OrderItem model unavailable: ${error.message}`);
      }
    }
    return this._OrderItem;
  }

  get StorefrontItem() {
    if (!this._StorefrontItem) {
      try {
        this._StorefrontItem = getStorefrontItem();
        if (!this._StorefrontItem) {
          throw new Error('StorefrontItem model not available - models cache may not be initialized');
        }
      } catch (error) {
        logger.error('[UnifiedSessionService] Error accessing StorefrontItem model:', error);
        throw new Error(`StorefrontItem model unavailable: ${error.message}`);
      }
    }
    return this._StorefrontItem;
  }

  get FinancialTransaction() {
    if (!this._FinancialTransaction) {
      try {
        this._FinancialTransaction = getFinancialTransaction();
        if (!this._FinancialTransaction) {
          throw new Error('FinancialTransaction model not available - models cache may not be initialized');
        }
      } catch (error) {
        logger.error('[UnifiedSessionService] Error accessing FinancialTransaction model:', error);
        throw new Error(`FinancialTransaction model unavailable: ${error.message}`);
      }
    }
    return this._FinancialTransaction;
  }

  // ==================== REAL-TIME EVENT BROADCASTING METHODS ====================

  /**
   * Broadcast session created event with real-time updates
   * @param {Object} sessionData - Session that was created
   * @param {Object} options - Broadcasting options
   */
  async broadcastSessionCreated(sessionData, options = {}) {
    if (!this.enableRealTimeEvents) return;
    
    try {
      await realTimeScheduleService.broadcastSessionCreated(sessionData, options);
      logger.debug(`[UnifiedSessionService] Broadcasted session created: ${sessionData.id}`);
    } catch (error) {
      logger.warn(`[UnifiedSessionService] Failed to broadcast session created:`, error.message);
    }
  }

  /**
   * Broadcast session updated event with real-time updates
   * @param {Object} sessionData - Updated session data
   * @param {Object} changes - What changed
   * @param {Object} options - Broadcasting options
   */
  async broadcastSessionUpdated(sessionData, changes, options = {}) {
    if (!this.enableRealTimeEvents) return;
    
    try {
      await realTimeScheduleService.broadcastSessionUpdated(sessionData, changes, options);
      logger.debug(`[UnifiedSessionService] Broadcasted session updated: ${sessionData.id}`);
    } catch (error) {
      logger.warn(`[UnifiedSessionService] Failed to broadcast session updated:`, error.message);
    }
  }

  /**
   * Broadcast session booked event with real-time updates
   * @param {Object} sessionData - Booked session data
   * @param {Object} clientData - Client who booked
   * @param {Object} options - Broadcasting options
   */
  async broadcastSessionBooked(sessionData, clientData, options = {}) {
    if (!this.enableRealTimeEvents) return;
    
    try {
      await realTimeScheduleService.broadcastSessionBooked(sessionData, clientData, options);
      logger.debug(`[UnifiedSessionService] Broadcasted session booked: ${sessionData.id}`);
    } catch (error) {
      logger.warn(`[UnifiedSessionService] Failed to broadcast session booked:`, error.message);
    }
  }

  /**
   * Broadcast session cancelled event with real-time updates
   * @param {Object} sessionData - Cancelled session data
   * @param {string} reason - Cancellation reason
   * @param {string} cancelledBy - Who cancelled (userId)
   * @param {Object} options - Broadcasting options
   */
  async broadcastSessionCancelled(sessionData, reason, cancelledBy, options = {}) {
    if (!this.enableRealTimeEvents) return;
    
    try {
      await realTimeScheduleService.broadcastSessionCancelled(sessionData, reason, cancelledBy, options);
      logger.debug(`[UnifiedSessionService] Broadcasted session cancelled: ${sessionData.id}`);
    } catch (error) {
      logger.warn(`[UnifiedSessionService] Failed to broadcast session cancelled:`, error.message);
    }
  }

  /**
   * Broadcast session completed event with real-time updates
   * @param {Object} sessionData - Completed session data
   * @param {Object} completionData - Completion details
   * @param {Object} options - Broadcasting options
   */
  async broadcastSessionCompleted(sessionData, completionData, options = {}) {
    if (!this.enableRealTimeEvents) return;
    
    try {
      await realTimeScheduleService.broadcastSessionCompleted(sessionData, completionData, options);
      logger.debug(`[UnifiedSessionService] Broadcasted session completed: ${sessionData.id}`);
    } catch (error) {
      logger.warn(`[UnifiedSessionService] Failed to broadcast session completed:`, error.message);
    }
  }

  /**
   * Broadcast scheduling conflict detected
   * @param {Object} conflictData - Conflict information
   * @param {Object} options - Broadcasting options
   */
  async broadcastScheduleConflict(conflictData, options = {}) {
    if (!this.enableRealTimeEvents) return;
    
    try {
      await realTimeScheduleService.broadcastScheduleConflict(conflictData, options);
      logger.debug(`[UnifiedSessionService] Broadcasted schedule conflict`);
    } catch (error) {
      logger.warn(`[UnifiedSessionService] Failed to broadcast schedule conflict:`, error.message);
    }
  }

  /**
   * Detect and broadcast potential scheduling conflicts
   * @param {Object} sessionData - Session to check for conflicts
   * @param {string} operation - Type of operation (create, update, book)
   */
  async detectAndBroadcastConflicts(sessionData, operation = 'create') {
    if (!this.enableRealTimeEvents) return;
    
    try {
      // Check for trainer double-booking
      if (sessionData.trainerId) {
        const conflictingSessions = await this.Session.findAll({
          where: {
            id: { [Op.ne]: sessionData.id || 0 }, // Exclude current session if updating
            trainerId: sessionData.trainerId,
            status: ['booked', 'confirmed'],
            [Op.and]: [
              {
                sessionDate: {
                  [Op.lt]: sessionData.endDate || new Date(new Date(sessionData.sessionDate).getTime() + 60 * 60000)
                }
              },
              {
                endDate: {
                  [Op.gt]: sessionData.sessionDate
                }
              }
            ]
          }
        });

        if (conflictingSessions.length > 0) {
          await this.broadcastScheduleConflict({
            type: 'trainer-double-booking',
            sessionIds: [sessionData.id, ...conflictingSessions.map(s => s.id)],
            trainerId: sessionData.trainerId,
            timeSlot: {
              start: sessionData.sessionDate,
              end: sessionData.endDate || new Date(new Date(sessionData.sessionDate).getTime() + 60 * 60000)
            },
            severity: 'high',
            message: `Trainer has conflicting sessions at this time`,
            suggestions: [
              'Reschedule one of the conflicting sessions',
              'Assign a different trainer',
              'Split the session into multiple shorter sessions'
            ]
          });
        }
      }

      // Check for client double-booking (if session is being booked)
      if (sessionData.userId && operation === 'book') {
        const clientConflicts = await this.Session.findAll({
          where: {
            id: { [Op.ne]: sessionData.id || 0 },
            userId: sessionData.userId,
            status: ['booked', 'confirmed'],
            [Op.and]: [
              {
                sessionDate: {
                  [Op.lt]: sessionData.endDate || new Date(new Date(sessionData.sessionDate).getTime() + 60 * 60000)
                }
              },
              {
                endDate: {
                  [Op.gt]: sessionData.sessionDate
                }
              }
            ]
          }
        });

        if (clientConflicts.length > 0) {
          await this.broadcastScheduleConflict({
            type: 'client-double-booking',
            sessionIds: [sessionData.id, ...clientConflicts.map(s => s.id)],
            trainerId: sessionData.trainerId,
            clientId: sessionData.userId,
            timeSlot: {
              start: sessionData.sessionDate,
              end: sessionData.endDate || new Date(new Date(sessionData.sessionDate).getTime() + 60 * 60000)
            },
            severity: 'medium',
            message: `Client has conflicting sessions at this time`,
            suggestions: [
              'Reschedule one of the conflicting sessions',
              'Confirm with client about their availability'
            ]
          });
        }
      }

    } catch (error) {
      logger.warn(`[UnifiedSessionService] Error detecting conflicts:`, error.message);
    }
  }

  // ==================== CORE SESSION CRUD OPERATIONS ====================

  /**
   * Get all sessions with role-based filtering and comprehensive options
   * @param {Object} options - Query options and filters
   * @param {Object} user - Requesting user (for role-based filtering)
   * @returns {Array} Filtered sessions
   */
  async getAllSessions(options = {}, user) {
    try {
      const {
        startDate,
        endDate,
        status,
        trainerId,
        userId,
        confirmed,
        location,
        includeStats = false
      } = options;

      // Build the filter object
      const filter = {};

      // Date range filter
      if (startDate && endDate) {
        filter.sessionDate = {
          [Op.between]: [new Date(startDate), new Date(endDate)]
        };
      } else if (startDate) {
        filter.sessionDate = {
          [Op.gte]: new Date(startDate)
        };
      } else if (endDate) {
        filter.sessionDate = {
          [Op.lte]: new Date(endDate)
        };
      }

      // Status filter
      if (status) {
        if (Array.isArray(status)) {
          filter.status = { [Op.in]: status };
        } else {
          filter.status = status;
        }
      }

      // Confirmed filter
      if (confirmed !== undefined) {
        filter.confirmed = confirmed === 'true' || confirmed === true;
      }
      
      // Location filter
      if (location) {
        filter.location = location;
      }

      // **CRITICAL: Role-based filtering at service level**
      if (user.role === 'client') {
        // Clients can only see their own sessions or available sessions
        filter[Op.or] = [
          { userId: user.id },
          { status: 'available' }
        ];
      } else if (user.role === 'trainer') {
        // Trainers can see sessions assigned to them
        filter.trainerId = user.id;
      }
      // Admins can see all sessions, so no additional filter needed

      // Specific trainer filter (admin only)
      if (trainerId && user.role === 'admin') {
        filter.trainerId = trainerId;
      }

      // Specific client filter (admin only)
      if (userId && user.role === 'admin') {
        filter.userId = userId;
      }

      // Fetch sessions with related user data
      const sessions = await this.Session.findAll({
        where: filter,
        include: [
          {
            model: this.User,
            as: 'client',
            attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'photo']
          },
          {
            model: this.User,
            as: 'trainer',
            attributes: ['id', 'firstName', 'lastName', 'email', 'photo', 'bio', 'specialties']
          }
        ],
        order: [['sessionDate', 'ASC']]
      });

      // Format sessions for calendar
      const formattedSessions = sessions.map(session => {
        const sessionData = session.get({ plain: true });
        
        // Calculate end time based on sessionDate and duration if endDate is not set
        if (!sessionData.endDate && sessionData.sessionDate && sessionData.duration) {
          const endDate = new Date(sessionData.sessionDate);
          endDate.setMinutes(endDate.getMinutes() + sessionData.duration);
          sessionData.endDate = endDate;
        }
        
        return {
          ...sessionData,
          id: sessionData.id.toString(),
          start: sessionData.sessionDate,
          end: sessionData.endDate || new Date(new Date(sessionData.sessionDate).getTime() + (sessionData.duration || 60) * 60000),
          title: this.createSessionTitle(sessionData)
        };
      });

      logger.info(`[UnifiedSessionService] Retrieved ${formattedSessions.length} sessions for user ${user.id} (${user.role})`);

      return formattedSessions;
    } catch (error) {
      logger.error(`[UnifiedSessionService] Error fetching sessions:`, error);
      throw new Error(`Failed to fetch sessions: ${error.message}`);
    }
  }

  /**
   * Get a single session by ID with role-based access control
   * @param {string|number} sessionId - Session ID
   * @param {Object} user - Requesting user
   * @returns {Object} Session data or null
   */
  async getSessionById(sessionId, user) {
    try {
      // Find the session with associated users
      const session = await this.Session.findByPk(sessionId, {
        include: [
          {
            model: this.User,
            as: 'client',
            attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'photo', 
              'fitnessGoal', 'trainingExperience', 'healthConcerns', 'weight', 'height']
          },
          {
            model: this.User,
            as: 'trainer',
            attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'photo', 'bio', 'specialties']
          }
        ]
      });
      
      if (!session) {
        return null;
      }
      
      // **CRITICAL: Role-based access control**
      if (
        user.role !== 'admin' && 
        user.role !== 'trainer' && 
        session.userId !== user.id &&
        session.status !== 'available'
      ) {
        throw new Error('You do not have permission to view this session');
      }
      
      // Check permissions for private notes
      const sessionData = session.get({ plain: true });
      if (user.role !== 'admin' && user.role !== 'trainer') {
        // Remove private notes for non-admin/trainer users
        delete sessionData.privateNotes;
      }
      
      // Calculate end time based on sessionDate and duration if endDate is not set
      if (!sessionData.endDate && sessionData.sessionDate && sessionData.duration) {
        const endDate = new Date(sessionData.sessionDate);
        endDate.setMinutes(endDate.getMinutes() + sessionData.duration);
        sessionData.endDate = endDate;
      }
      
      // Format response to match frontend expectations
      const formattedSession = {
        ...sessionData,
        id: sessionData.id.toString(),
        start: sessionData.sessionDate,
        end: sessionData.endDate || new Date(new Date(sessionData.sessionDate).getTime() + (sessionData.duration || 60) * 60000),
        title: this.createSessionTitle(sessionData)
      };
      
      return formattedSession;
    } catch (error) {
      logger.error(`[UnifiedSessionService] Error fetching session ${sessionId}:`, error);
      throw new Error(`Failed to fetch session: ${error.message}`);
    }
  }

  /**
   * Create available session slots (admin only)
   * @param {Array} sessions - Array of session data to create
   * @param {Object} user - Requesting user (must be admin)
   * @returns {Array} Created sessions
   */
  async createAvailableSessions(sessions, user) {
    // **CRITICAL: Admin-only operation**
    if (user.role !== 'admin') {
      throw new Error('Admin privileges required to create available sessions');
    }

    if (!Array.isArray(sessions) || sessions.length === 0) {
      throw new Error('Invalid request: sessions must be a non-empty array');
    }

    const transaction = await sequelize.transaction();

    try {
      // Validate each session
      for (const session of sessions) {
        if (!session.start) {
          throw new Error('Each session must include a start time');
        }
        
        // Check if date is in the past
        if (new Date(session.start) < new Date()) {
          throw new Error('Cannot create sessions in the past');
        }
      }

      // Create all sessions in a single transaction
      const createdSessions = await this.Session.bulkCreate(
        sessions.map(session => {
          const startDate = new Date(session.start);
          const endDate = session.end ? new Date(session.end) : 
                         new Date(startDate.getTime() + (session.duration || 60) * 60000);
          
          return {
            sessionDate: startDate,
            endDate: endDate,
            duration: session.duration || 60,
            status: 'available',
            trainerId: session.trainerId || null,
            location: session.location || 'Main Studio',
            notes: session.notes || '',
            sessionType: session.sessionType || 'Standard Training'
          };
        }),
        { transaction, returning: true }
      );

      await transaction.commit();

      // Format sessions for calendar
      const formattedSessions = createdSessions.map(session => {
        const sessionData = session.get({ plain: true });
        return {
          ...sessionData,
          id: sessionData.id.toString(),
          start: sessionData.sessionDate,
          end: sessionData.endDate,
          title: this.createSessionTitle(sessionData)
        };
      });

      // Broadcast real-time events for created sessions
      for (const session of formattedSessions) {
        await this.broadcastSessionCreated(session, {
          priority: 'normal',
          excludeUser: user.id
        });
        
        // Check for conflicts with existing schedule
        await this.detectAndBroadcastConflicts(session, 'create');
      }

      // Notify trainers about assigned sessions (async)
      this.notifyTrainersAboutNewSessions(createdSessions);

      logger.info(`[UnifiedSessionService] Created ${createdSessions.length} available sessions with real-time broadcasting`);

      return formattedSessions;
    } catch (error) {
      await transaction.rollback();
      logger.error(`[UnifiedSessionService] Error creating available sessions:`, error);
      throw new Error(`Failed to create sessions: ${error.message}`);
    }
  }

  /**
   * Create recurring sessions (admin only)
   * @param {Object} recurringData - Recurring session configuration
   * @param {Object} user - Requesting user (must be admin)
   * @returns {Object} Creation result with count
   */
  async createRecurringSessions(recurringData, user) {
    // **CRITICAL: Admin-only operation**
    if (user.role !== 'admin') {
      throw new Error('Admin privileges required to create recurring sessions');
    }

    const { 
      startDate, 
      endDate, 
      daysOfWeek,  // Array of days: [0,1,2,3,4,5,6] (0 = Sunday)
      times,       // Array of times: ["09:00", "14:00"]
      trainerId,
      location,
      duration,
      sessionType
    } = recurringData;
    
    if (!startDate || !endDate || !daysOfWeek || !times) {
      throw new Error('Missing required parameters for recurring sessions');
    }
    
    if (!Array.isArray(daysOfWeek) || daysOfWeek.length === 0) {
      throw new Error('daysOfWeek must be a non-empty array');
    }
    
    if (!Array.isArray(times) || times.length === 0) {
      throw new Error('times must be a non-empty array');
    }

    const transaction = await sequelize.transaction();

    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new Error('Invalid date format');
      }
      
      if (start >= end) {
        throw new Error('End date must be after start date');
      }

      // Generate session slots
      const sessions = [];
      const currentDate = new Date(start);
      
      // Loop through each day until end date
      while (currentDate <= end) {
        const dayOfWeek = currentDate.getDay();
        
        // Check if current day is one of the selected days
        if (daysOfWeek.includes(dayOfWeek)) {
          // For each selected time on this day
          for (const time of times) {
            const [hours, minutes] = time.split(':').map(Number);
            
            // Create date for this specific time slot
            const sessionDate = new Date(currentDate);
            sessionDate.setHours(hours, minutes, 0, 0);
            
            // Only add future sessions
            if (sessionDate >= new Date()) {
              // Calculate end time
              const endDate = new Date(sessionDate);
              endDate.setMinutes(endDate.getMinutes() + (duration || 60));
              
              sessions.push({
                sessionDate,
                endDate,
                duration: duration || 60,
                status: 'available',
                trainerId: trainerId || null,
                location: location || 'Main Studio',
                sessionType: sessionType || 'Standard Training'
              });
            }
          }
        }
        
        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      if (sessions.length === 0) {
        throw new Error('No valid future sessions could be generated');
      }

      // Create all sessions in bulk
      const createdSessions = await this.Session.bulkCreate(sessions, { transaction, returning: true });

      await transaction.commit();

      // Notify trainer if assigned (async)
      if (trainerId) {
        this.notifyTrainerAboutRecurringSessions(trainerId, createdSessions, location);
      }

      logger.info(`[UnifiedSessionService] Created ${createdSessions.length} recurring sessions`);

      return {
        success: true,
        message: `Successfully created ${createdSessions.length} recurring sessions`,
        count: createdSessions.length,
        sessions: createdSessions.slice(0, 5) // Return sample for response size management
      };
    } catch (error) {
      await transaction.rollback();
      logger.error(`[UnifiedSessionService] Error creating recurring sessions:`, error);
      throw new Error(`Failed to create recurring sessions: ${error.message}`);
    }
  }

  // ==================== SESSION BOOKING & LIFECYCLE MANAGEMENT ====================

  /**
   * Book an available session with transactional integrity
   * @param {string|number} sessionId - Session ID to book
   * @param {Object} user - User booking the session
   * @param {Object} bookingData - Additional booking data
   * @returns {Object} Booking result
   */
  async bookSession(sessionId, user, bookingData = {}) {
    const transaction = await sequelize.transaction();

    try {
      // Find the session and ensure it's available
      const session = await this.Session.findOne({
        where: {
          id: sessionId,
          status: 'available'
        },
        transaction
      });
      
      if (!session) {
        throw new Error('Session is not available for booking');
      }
      
      // Check if session date is in the past
      if (new Date(session.sessionDate) < new Date()) {
        throw new Error('Cannot book sessions in the past');
      }
      
      // Get the client (current user) with session balance
      const client = await this.User.findByPk(user.id, { transaction });
      
      if (!client) {
        throw new Error('Client not found');
      }

      // **TRANSACTIONAL INTEGRITY: Update session and process deduction atomically**
      
      // Update the session
      session.userId = client.id;
      session.status = 'scheduled';
      session.bookingDate = new Date();
      await session.save({ transaction });

      // Process session deduction if needed (this handles balance updates)
      if (bookingData.deductSession !== false) {
        await processSessionDeduction(client, session, transaction);
      }

      await transaction.commit();

      // Send notifications (async, after successful transaction)
      this.sendBookingNotifications(session, client);

      // Fetch the updated session with related data
      const updatedSession = await this.Session.findByPk(session.id, {
        include: [
          {
            model: this.User,
            as: 'client',
            attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'photo']
          },
          {
            model: this.User,
            as: 'trainer',
            attributes: ['id', 'firstName', 'lastName', 'email', 'photo']
          }
        ]
      });
      
      // Format response
      const sessionData = updatedSession.get({ plain: true });
      const formattedSession = {
        ...sessionData,
        id: sessionData.id.toString(),
        start: sessionData.sessionDate,
        end: sessionData.endDate || new Date(new Date(sessionData.sessionDate).getTime() + (sessionData.duration || 60) * 60000),
        title: this.createSessionTitle(sessionData)
      };

      logger.info(`[UnifiedSessionService] Session ${sessionId} booked by user ${user.id}`);
      
      return {
        success: true,
        message: 'Session booked successfully',
        session: formattedSession
      };
    } catch (error) {
      await transaction.rollback();
      logger.error(`[UnifiedSessionService] Error booking session ${sessionId}:`, error);
      throw new Error(`Failed to book session: ${error.message}`);
    }
  }

  /**
   * Cancel a session with proper notifications and cleanup
   * @param {string|number} sessionId - Session ID to cancel
   * @param {Object} user - User requesting cancellation
   * @param {string} reason - Cancellation reason
   * @returns {Object} Cancellation result
   */
  async cancelSession(sessionId, user, reason = 'No reason provided') {
    const transaction = await sequelize.transaction();

    try {
      // Find the session with related data
      const session = await this.Session.findByPk(sessionId, {
        include: [
          {
            model: this.User,
            as: 'client',
            attributes: ['id', 'firstName', 'lastName', 'email', 'phone']
          },
          {
            model: this.User,
            as: 'trainer',
            attributes: ['id', 'firstName', 'lastName', 'email', 'phone']
          }
        ],
        transaction
      });
      
      if (!session) {
        throw new Error('Session not found');
      }
      
      // **CRITICAL: Role-based access control**
      const isAdmin = user.role === 'admin';
      const isTrainer = user.role === 'trainer' && session.trainerId === user.id;
      const isOwner = session.userId === user.id;
      
      if (!isAdmin && !isOwner && !isTrainer) {
        throw new Error('You do not have permission to cancel this session');
      }
      
      // Check if cancellation is allowed for this status
      const allowedStatuses = ['available', 'scheduled', 'confirmed', 'requested'];
      if (!allowedStatuses.includes(session.status)) {
        throw new Error(`Cannot cancel a session with status: ${session.status}`);
      }

      // **TRANSACTIONAL INTEGRITY: Update session and restore balance if needed**
      
      // Update the session
      session.status = 'cancelled';
      session.cancelledBy = user.id;
      session.cancellationReason = reason;
      session.cancellationDate = new Date();
      await session.save({ transaction });

      // If session was deducted, restore the session count
      if (session.sessionDeducted && session.client) {
        const client = await this.User.findByPk(session.userId, { transaction });
        if (client) {
          client.availableSessions = (client.availableSessions || 0) + 1;
          await client.save({ transaction });
          
          logger.info(`[UnifiedSessionService] Restored 1 session to user ${client.id} balance after cancellation`);
        }
      }

      await transaction.commit();

      // Send cancellation notifications (async)
      this.sendCancellationNotifications(session, user, reason);

      logger.info(`[UnifiedSessionService] Session ${sessionId} cancelled by user ${user.id}`);
      
      return {
        success: true,
        message: 'Session cancelled successfully',
        session: {
          id: session.id,
          status: session.status,
          cancelledBy: session.cancelledBy,
          cancellationReason: session.cancellationReason,
          cancellationDate: session.cancellationDate
        }
      };
    } catch (error) {
      await transaction.rollback();
      logger.error(`[UnifiedSessionService] Error cancelling session ${sessionId}:`, error);
      throw new Error(`Failed to cancel session: ${error.message}`);
    }
  }

  /**
   * Confirm a session (admin/trainer only)
   * @param {string|number} sessionId - Session ID to confirm
   * @param {Object} user - User confirming the session
   * @returns {Object} Confirmation result
   */
  async confirmSession(sessionId, user) {
    // **CRITICAL: Role-based access control**
    if (user.role !== 'admin' && user.role !== 'trainer') {
      throw new Error('Admin or trainer privileges required to confirm sessions');
    }

    try {
      // Find the session with related data
      const session = await this.Session.findByPk(sessionId, {
        include: [
          {
            model: this.User,
            as: 'client',
            attributes: ['id', 'firstName', 'lastName', 'email', 'phone']
          },
          {
            model: this.User,
            as: 'trainer',
            attributes: ['id', 'firstName', 'lastName', 'email', 'phone']
          }
        ]
      });
      
      if (!session) {
        throw new Error('Session not found');
      }
      
      // Additional check for trainers - they can only confirm sessions assigned to them
      if (user.role === 'trainer' && session.trainerId !== user.id) {
        throw new Error('You can only confirm sessions assigned to you');
      }
      
      // Check if the session can be confirmed
      if (session.status !== 'scheduled' && session.status !== 'requested') {
        throw new Error('Only scheduled or requested sessions can be confirmed');
      }
      
      // Update the session
      session.confirmed = true;
      session.status = 'confirmed';
      session.confirmedBy = user.id;
      session.confirmationDate = new Date();
      await session.save();

      // Send confirmation notifications and schedule reminders (async)
      this.sendConfirmationNotifications(session);

      // Format response
      const sessionData = session.get({ plain: true });
      const formattedSession = {
        ...sessionData,
        id: sessionData.id.toString(),
        start: sessionData.sessionDate,
        end: sessionData.endDate || new Date(new Date(sessionData.sessionDate).getTime() + (sessionData.duration || 60) * 60000),
        title: this.createSessionTitle(sessionData)
      };

      logger.info(`[UnifiedSessionService] Session ${sessionId} confirmed by user ${user.id}`);
      
      return {
        success: true,
        message: 'Session confirmed successfully',
        session: formattedSession
      };
    } catch (error) {
      logger.error(`[UnifiedSessionService] Error confirming session ${sessionId}:`, error);
      throw new Error(`Failed to confirm session: ${error.message}`);
    }
  }

  /**
   * Mark a session as completed (admin/trainer only)
   * @param {string|number} sessionId - Session ID to complete
   * @param {Object} user - User completing the session
   * @param {string} notes - Completion notes
   * @returns {Object} Completion result
   */
  async completeSession(sessionId, user, notes = '') {
    // **CRITICAL: Role-based access control**
    if (user.role !== 'admin' && user.role !== 'trainer') {
      throw new Error('Admin or trainer privileges required to complete sessions');
    }

    try {
      // Find the session with related data
      const session = await this.Session.findByPk(sessionId, {
        include: [
          {
            model: this.User,
            as: 'client',
            attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'availableSessions']
          },
          {
            model: this.User,
            as: 'trainer',
            attributes: ['id', 'firstName', 'lastName', 'email', 'phone']
          }
        ]
      });
      
      if (!session) {
        throw new Error('Session not found');
      }
      
      // Additional check for trainers - they can only complete sessions assigned to them
      if (user.role === 'trainer' && session.trainerId !== user.id) {
        throw new Error('You can only complete sessions assigned to you');
      }
      
      // Check if the session can be completed
      if (session.status !== 'confirmed' && session.status !== 'scheduled') {
        throw new Error('Only confirmed or scheduled sessions can be completed');
      }
      
      // Update the session
      session.status = 'completed';
      session.completedBy = user.id;
      session.completionDate = new Date();
      
      // Add private notes if provided
      if (notes) {
        session.privateNotes = notes;
      }
      
      await session.save();

      // Send completion notifications (async)
      this.sendCompletionNotifications(session);

      // Format response
      const sessionData = session.get({ plain: true });
      const formattedSession = {
        ...sessionData,
        id: sessionData.id.toString(),
        start: sessionData.sessionDate,
        end: sessionData.endDate || new Date(new Date(sessionData.sessionDate).getTime() + (sessionData.duration || 60) * 60000),
        title: this.createSessionTitle(sessionData)
      };

      logger.info(`[UnifiedSessionService] Session ${sessionId} completed by user ${user.id}`);
      
      return {
        success: true,
        message: 'Session marked as completed',
        session: formattedSession
      };
    } catch (error) {
      logger.error(`[UnifiedSessionService] Error completing session ${sessionId}:`, error);
      throw new Error(`Failed to complete session: ${error.message}`);
    }
  }

  /**
   * Assign a trainer to a session (admin only)
   * @param {string|number} sessionId - Session ID
   * @param {string|number} trainerId - Trainer ID to assign
   * @param {Object} user - User making the assignment (must be admin)
   * @returns {Object} Assignment result
   */
  async assignTrainer(sessionId, trainerId, user) {
    // **CRITICAL: Admin-only operation**
    if (user.role !== 'admin') {
      throw new Error('Admin privileges required to assign trainers');
    }

    if (!trainerId) {
      throw new Error('Trainer ID is required');
    }

    const transaction = await sequelize.transaction();

    try {
      // Verify the trainer exists and is a trainer
      const trainer = await this.User.findOne({
        where: {
          id: trainerId,
          role: 'trainer'
        },
        transaction
      });
      
      if (!trainer) {
        throw new Error('Trainer not found');
      }
      
      // Find the session
      const session = await this.Session.findByPk(sessionId, {
        include: [
          {
            model: this.User,
            as: 'client',
            attributes: ['id', 'firstName', 'lastName', 'email', 'phone']
          }
        ],
        transaction
      });
      
      if (!session) {
        throw new Error('Session not found');
      }
      
      // Assign the trainer
      session.trainerId = trainerId;
      session.assignedAt = new Date();
      session.assignedBy = user.id;
      
      // If this was a requested session, update its status
      if (session.status === 'requested') {
        session.status = 'scheduled';
      }
      
      await session.save({ transaction });

      await transaction.commit();

      // Send assignment notifications (async)
      this.sendTrainerAssignmentNotifications(session, trainer);

      // Fetch updated session with trainer details
      const updatedSession = await this.Session.findByPk(sessionId, {
        include: [
          {
            model: this.User,
            as: 'client',
            attributes: ['id', 'firstName', 'lastName', 'email', 'phone']
          },
          {
            model: this.User,
            as: 'trainer',
            attributes: ['id', 'firstName', 'lastName', 'email', 'photo', 'bio', 'specialties']
          }
        ]
      });
      
      // Format response
      const sessionData = updatedSession.get({ plain: true });
      const formattedSession = {
        ...sessionData,
        id: sessionData.id.toString(),
        start: sessionData.sessionDate,
        end: sessionData.endDate || new Date(new Date(sessionData.sessionDate).getTime() + (sessionData.duration || 60) * 60000),
        title: this.createSessionTitle(sessionData)
      };

      logger.info(`[UnifiedSessionService] Trainer ${trainerId} assigned to session ${sessionId}`);
      
      return {
        success: true,
        message: 'Trainer assigned successfully',
        session: formattedSession
      };
    } catch (error) {
      await transaction.rollback();
      logger.error(`[UnifiedSessionService] Error assigning trainer to session ${sessionId}:`, error);
      throw new Error(`Failed to assign trainer: ${error.message}`);
    }
  }

  // ==================== SESSION ALLOCATION FROM ORDERS ====================

  /**
   * Allocate sessions from completed order (consolidated from SessionAllocationService)
   * @param {number} orderId - Completed order ID
   * @param {number} userId - User who made the purchase
   * @returns {Object} Allocation result
   */
  async allocateSessionsFromOrder(orderId, userId) {
    const startTime = Date.now();
    const transaction = await sequelize.transaction();

    logger.info(`[UnifiedSessionService] Starting session allocation for order ${orderId}`, {
      orderId,
      userId,
      timestamp: new Date().toISOString()
    });

    try {
      // 1. Validate order and user
      const { order, user } = await this.validateOrderAndUser(orderId, userId, transaction);
      
      // 2. Extract session information from order items
      const sessionData = await this.extractSessionDataFromOrder(order);
      
      if (sessionData.totalSessions === 0) {
        await transaction.commit();
        
        logger.info(`[UnifiedSessionService] No sessions to allocate for order ${orderId}`);
        return {
          success: true,
          allocated: 0,
          message: 'No sessions found in order items'
        };
      }

      // 3. **TRANSACTIONAL INTEGRITY**: Create sessions and update balance atomically
      const createdSessions = await this.createAvailableSessionsFromAllocation(sessionData, user, transaction);
      
      // 4. Update user session balance
      await this.updateUserSessionBalance(user, sessionData.totalSessions, transaction);
      
      // 5. Create financial transaction record
      await this.createFinancialTransactionRecord(order, sessionData, transaction);

      await transaction.commit();
      
      // 6. Log allocation success
      const duration = Date.now() - startTime;
      logger.info(`[UnifiedSessionService] Session allocation completed successfully`, {
        orderId,
        userId,
        allocatedSessions: createdSessions.length,
        totalSessionsFromOrder: sessionData.totalSessions,
        duration: `${duration}ms`,
        sessionIds: createdSessions.map(s => s.id)
      });

      return {
        success: true,
        allocated: createdSessions.length,
        totalSessions: sessionData.totalSessions,
        sessions: createdSessions,
        orderDetails: {
          orderNumber: order.orderNumber,
          totalAmount: order.totalAmount,
          items: sessionData.items
        },
        message: `Successfully allocated ${createdSessions.length} sessions for ${user.firstName} ${user.lastName}`
      };

    } catch (error) {
      await transaction.rollback();
      
      logger.error(`[UnifiedSessionService] Error allocating sessions for order ${orderId}`, {
        error: error.message,
        stack: error.stack,
        orderId,
        userId,
        duration: `${Date.now() - startTime}ms`
      });

      throw new Error(`Session allocation failed: ${error.message}`);
    }
  }

  // ==================== STATISTICS AND REPORTING ====================

  /**
   * Get comprehensive schedule statistics with role-based filtering
   * @param {Object} user - Requesting user
   * @returns {Object} Statistics object
   */
  async getScheduleStats(user) {
    try {
      const now = new Date();
      
      // Base filters
      let whereClause = {};
      
      // **CRITICAL: Role-based filtering**
      if (user.role === 'client') {
        // Clients see stats for their sessions only
        whereClause = {
          [Op.or]: [
            { userId: user.id },
            { status: 'available' }
          ]
        };
      } else if (user.role === 'trainer') {
        // Trainers see stats for their assigned sessions
        whereClause = { trainerId: user.id };
      }
      // Admins see stats for all sessions

      // Get counts with role-based filtering
      const totalSessions = await this.Session.count({ where: whereClause });
      
      const availableSessions = await this.Session.count({
        where: {
          ...whereClause,
          status: 'available',
          sessionDate: { [Op.gt]: now }
        }
      });
      
      const bookedSessions = await this.Session.count({
        where: {
          ...whereClause,
          status: { [Op.in]: ['scheduled', 'confirmed'] },
          sessionDate: { [Op.gt]: now }
        }
      });
      
      const completedSessions = await this.Session.count({
        where: {
          ...whereClause,
          status: 'completed'
        }
      });
      
      const cancelledSessions = await this.Session.count({
        where: {
          ...whereClause,
          status: 'cancelled'
        }
      });

      // Compile base stats
      const stats = {
        totalSessions,
        availableSessions,
        bookedSessions,
        completedSessions,
        cancelledSessions
      };

      // Add role-specific stats
      if (user.role === 'client') {
        const userBookedSessions = await this.Session.count({
          where: {
            userId: user.id,
            status: { [Op.in]: ['scheduled', 'confirmed'] },
            sessionDate: { [Op.gt]: now }
          }
        });
        stats.userBookedSessions = userBookedSessions;
      } else if (user.role === 'trainer') {
        const assignedSessions = await this.Session.count({
          where: {
            trainerId: user.id,
            status: { [Op.in]: ['scheduled', 'confirmed'] },
            sessionDate: { [Op.gt]: now }
          }
        });
        stats.assignedSessions = assignedSessions;
      } else if (user.role === 'admin') {
        const totalClients = await this.User.count({ where: { role: 'client' } });
        const totalTrainers = await this.User.count({ where: { role: 'trainer' } });
        stats.totalClients = totalClients;
        stats.totalTrainers = totalTrainers;
      }

      logger.info(`[UnifiedSessionService] Retrieved statistics for user ${user.id} (${user.role})`);

      return {
        success: true,
        stats
      };
    } catch (error) {
      logger.error(`[UnifiedSessionService] Error fetching schedule statistics:`, error);
      throw new Error(`Failed to fetch statistics: ${error.message}`);
    }
  }

  /**
   * Get all trainers (for dropdown selection)
   * @returns {Array} List of trainers
   */
  async getTrainers() {
    try {
      const trainers = await this.User.findAll({
        where: { role: 'trainer' },
        attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'photo', 'specialties', 'bio']
      });
      
      return trainers;
    } catch (error) {
      logger.error(`[UnifiedSessionService] Error fetching trainers:`, error);
      throw new Error(`Failed to fetch trainers: ${error.message}`);
    }
  }

  /**
   * Get all clients (admin/trainer only)
   * @param {Object} user - Requesting user
   * @returns {Array} List of clients
   */
  async getClients(user) {
    // **CRITICAL: Role-based access control**
    if (user.role !== 'admin' && user.role !== 'trainer') {
      throw new Error('Admin or trainer privileges required to view clients');
    }

    try {
      const clients = await this.User.findAll({
        where: { role: 'client' },
        attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'photo']
      });
      
      return clients;
    } catch (error) {
      logger.error(`[UnifiedSessionService] Error fetching clients:`, error);
      throw new Error(`Failed to fetch clients: ${error.message}`);
    }
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Create a descriptive title for session events
   * @param {Object} session - Session data
   * @returns {string} Formatted title
   */
  createSessionTitle(session) {
    let title = '';
    
    // Add status
    if (session.status) {
      title += session.status.charAt(0).toUpperCase() + session.status.slice(1);
    }
    
    // Add trainer name if available
    if (session.trainer && session.trainer.firstName) {
      title += ` with ${session.trainer.firstName}`;
    }
    
    // Add client name if available (admin/trainer view)
    if (session.client && session.client.firstName) {
      title += ` for ${session.client.firstName}`;
    }
    
    // Add location if available
    if (session.location) {
      title += ` @ ${session.location}`;
    }
    
    return title || 'Session';
  }

  /**
   * Validate order and user for allocation
   * @param {number} orderId - Order ID
   * @param {number} userId - User ID
   * @param {Object} transaction - Database transaction
   * @returns {Object} Validated order and user
   */
  async validateOrderAndUser(orderId, userId, transaction) {
    // Get order with items
    const order = await this.Order.findOne({
      where: { 
        id: orderId,
        userId,
        status: 'completed'
      },
      include: [{
        model: this.OrderItem,
        as: 'orderItems',
        include: [{
          model: this.StorefrontItem,
          as: 'storefrontItem'
        }]
      }],
      transaction
    });

    if (!order) {
      throw new Error(`Order ${orderId} not found or not completed for user ${userId}`);
    }

    if (!order.orderItems || order.orderItems.length === 0) {
      throw new Error(`Order ${orderId} has no items`);
    }

    // Get user
    const user = await this.User.findByPk(userId, { transaction });
    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    return { order, user };
  }

  /**
   * Extract session data from order items
   * @param {Object} order - Order with items
   * @returns {Object} Session data summary
   */
  async extractSessionDataFromOrder(order) {
    let totalSessions = 0;
    const items = [];

    for (const orderItem of order.orderItems) {
      const storefrontItem = orderItem.storefrontItem;
      
      if (!storefrontItem) {
        logger.warn(`[UnifiedSessionService] Order item ${orderItem.id} missing storefront item`);
        continue;
      }

      // Calculate sessions for this item
      let sessionCount = 0;
      
      if (storefrontItem.sessions) {
        // Fixed package with specific session count
        sessionCount = storefrontItem.sessions * orderItem.quantity;
      } else if (storefrontItem.totalSessions) {
        // Monthly package with calculated total sessions
        sessionCount = storefrontItem.totalSessions * orderItem.quantity;
      } else if (storefrontItem.packageType === 'monthly' && storefrontItem.months && storefrontItem.sessionsPerWeek) {
        // Calculate from monthly package parameters
        sessionCount = (storefrontItem.months * storefrontItem.sessionsPerWeek * 4) * orderItem.quantity;
      }

      if (sessionCount > 0) {
        items.push({
          orderItemId: orderItem.id,
          storefrontItemId: storefrontItem.id,
          name: storefrontItem.name,
          packageType: storefrontItem.packageType,
          sessionsPerItem: sessionCount / orderItem.quantity,
          quantity: orderItem.quantity,
          totalSessions: sessionCount,
          price: orderItem.price
        });

        totalSessions += sessionCount;
      }
    }

    return {
      totalSessions,
      items
    };
  }

  /**
   * Create available session slots from order allocation
   * @param {Object} sessionData - Session data from order
   * @param {Object} user - User object
   * @param {Object} transaction - Database transaction
   * @returns {Array} Created session records
   */
  async createAvailableSessionsFromAllocation(sessionData, user, transaction) {
    const createdSessions = [];

    logger.info(`[UnifiedSessionService] Creating ${sessionData.totalSessions} available sessions for user ${user.id}`);

    // Create sessions in batch for better performance
    const sessionsToCreate = [];
    
    for (let i = 0; i < sessionData.totalSessions; i++) {
      sessionsToCreate.push({
        userId: user.id,
        trainerId: null, // Will be assigned later by admin
        status: 'available',
        duration: 60, // Default 60 minutes
        location: null,
        notes: `Session ${i + 1} from purchase - Available for scheduling`,
        sessionDate: null, // Will be set when scheduled
        sessionDeducted: false, // Not deducted until scheduled/completed
        confirmed: false
      });
    }

    // Bulk create sessions
    const createdSessionRecords = await this.Session.bulkCreate(sessionsToCreate, {
      returning: true,
      transaction
    });

    createdSessions.push(...createdSessionRecords);

    logger.info(`[UnifiedSessionService] Successfully created ${createdSessions.length} session records`, {
      userId: user.id,
      sessionIds: createdSessions.map(s => s.id)
    });

    return createdSessions;
  }

  /**
   * Update user session balance
   * @param {Object} user - User object
   * @param {number} sessionCount - Sessions to add
   * @param {Object} transaction - Database transaction
   */
  async updateUserSessionBalance(user, sessionCount, transaction) {
    try {
      // Update user's available sessions count
      user.availableSessions = (user.availableSessions || 0) + sessionCount;
      await user.save({ transaction });
      
      logger.info(`[UnifiedSessionService] User ${user.id} balance updated with ${sessionCount} sessions`);
    } catch (error) {
      logger.error(`[UnifiedSessionService] Error updating user session balance`, {
        userId: user.id,
        sessionCount,
        error: error.message
      });
      throw error; // Re-throw to trigger transaction rollback
    }
  }

  /**
   * Create financial transaction record
   * @param {Object} order - Order object
   * @param {Object} sessionData - Session data
   * @param {Object} transaction - Database transaction
   */
  async createFinancialTransactionRecord(order, sessionData, transaction) {
    try {
      const financialTransaction = await this.FinancialTransaction.create({
        userId: order.userId,
        orderId: order.id,
        amount: order.totalAmount,
        currency: 'USD',
        status: 'succeeded',
        paymentMethod: order.paymentMethod || 'manual',
        description: `Session package purchase - ${sessionData.totalSessions} sessions`,
        metadata: JSON.stringify({
          sessionData,
          orderNumber: order.orderNumber,
          allocationDate: new Date().toISOString()
        }),
        processedAt: new Date()
      }, { transaction });

      logger.info(`[UnifiedSessionService] Financial transaction created`, {
        transactionId: financialTransaction.id,
        orderId: order.id,
        amount: order.totalAmount
      });
    } catch (error) {
      logger.warn(`[UnifiedSessionService] Error creating financial transaction record`, {
        orderId: order.id,
        error: error.message
      });
      // Don't fail the allocation if financial tracking fails
    }
  }

  // ==================== NOTIFICATION METHODS (ASYNC) ====================

  /**
   * Send booking notifications (async)
   * @param {Object} session - Session object
   * @param {Object} client - Client object
   */
  async sendBookingNotifications(session, client) {
    try {
      await notifySessionBooked(session, client);
      await notifyAdminSessionBooked(session, client);
    } catch (error) {
      logger.error('Error sending booking notifications:', error);
      // Don't throw - notifications are non-critical
    }
  }

  /**
   * Send cancellation notifications (async)
   * @param {Object} session - Session object
   * @param {Object} canceller - User who cancelled
   * @param {string} reason - Cancellation reason
   */
  async sendCancellationNotifications(session, canceller, reason) {
    try {
      await notifySessionCancelled(session, canceller, reason);
    } catch (error) {
      logger.error('Error sending cancellation notifications:', error);
      // Don't throw - notifications are non-critical
    }
  }

  /**
   * Send confirmation notifications and schedule reminders (async)
   * @param {Object} session - Session object
   */
  async sendConfirmationNotifications(session) {
    try {
      if (session.client) {
        await sendEmailNotification({
          to: session.client.email,
          subject: 'Session Confirmed - Swan Studios',
          html: `<p>Your session on <strong>${new Date(session.sessionDate).toLocaleString()}</strong> has been confirmed.</p>
                 <p>Location: ${session.location || 'Main Studio'}</p>
                 <p>Please arrive 10 minutes early.</p>`
        });
        
        if (session.client.phone) {
          await sendSmsNotification({
            to: session.client.phone,
            body: `Swan Studios: Your session on ${new Date(session.sessionDate).toLocaleString()} has been confirmed. Please arrive 10 minutes early.`
          });
        }
        
        // Schedule reminder for 24 hours before session
        const sessionTime = new Date(session.sessionDate).getTime();
        const currentTime = new Date().getTime();
        const timeUntilSession = sessionTime - currentTime;
        const timeUntilReminder = timeUntilSession - (24 * 60 * 60 * 1000); // 24 hours before
        
        if (timeUntilReminder > 0) {
          setTimeout(async () => {
            await sendSessionReminder(session, session.client, 24);
          }, timeUntilReminder);
        }
      }
    } catch (error) {
      logger.error('Error sending confirmation notifications:', error);
      // Don't throw - notifications are non-critical
    }
  }

  /**
   * Send completion notifications (async)
   * @param {Object} session - Session object
   */
  async sendCompletionNotifications(session) {
    try {
      if (session.client) {
        await sendEmailNotification({
          to: session.client.email,
          subject: 'Session Completed - Swan Studios',
          html: `<p>Your session on <strong>${new Date(session.sessionDate).toLocaleString()}</strong> has been marked as completed.</p>
                 <p>Thank you for training with us!</p>
                 <p>Please provide feedback on your session experience when you have a moment.</p>`
        });
      }
    } catch (error) {
      logger.error('Error sending completion notifications:', error);
      // Don't throw - notifications are non-critical
    }
  }

  /**
   * Send trainer assignment notifications (async)
   * @param {Object} session - Session object
   * @param {Object} trainer - Trainer object
   */
  async sendTrainerAssignmentNotifications(session, trainer) {
    try {
      await sendEmailNotification({
        to: trainer.email,
        subject: 'New Session Assignment - Swan Studios',
        html: `<p>You have been assigned to a session on <strong>${new Date(session.sessionDate).toLocaleString()}</strong>.</p>
               <p>Location: ${session.location || 'Main Studio'}</p>
               <p>Client: ${session.client ? `${session.client.firstName} ${session.client.lastName}` : 'To be determined'}</p>
               <p>Please check your schedule for details.</p>`
      });
      
      // Notify client if there is one
      if (session.client) {
        await sendEmailNotification({
          to: session.client.email,
          subject: 'Trainer Assigned - Swan Studios',
          html: `<p><strong>${trainer.firstName} ${trainer.lastName}</strong> has been assigned as your trainer for the session on <strong>${new Date(session.sessionDate).toLocaleString()}</strong>.</p>
                 <p>Location: ${session.location || 'Main Studio'}</p>`
        });
      }
    } catch (error) {
      logger.error('Error sending trainer assignment notifications:', error);
      // Don't throw - notifications are non-critical
    }
  }

  /**
   * Notify trainers about new sessions (async)
   * @param {Array} sessions - Created sessions
   */
  async notifyTrainersAboutNewSessions(sessions) {
    try {
      for (const session of sessions) {
        if (session.trainerId) {
          const trainer = await this.User.findByPk(session.trainerId);
          if (trainer) {
            await sendEmailNotification({
              to: trainer.email,
              subject: 'New Session Assignment - Swan Studios',
              html: `<p>You have been assigned to a new session on <strong>${new Date(session.sessionDate).toLocaleString()}</strong>.</p>
                     <p>Location: ${session.location || 'Main Studio'}</p>
                     <p>Please check your schedule for details.</p>`
            });
          }
        }
      }
    } catch (error) {
      logger.error('Error notifying trainers about new sessions:', error);
      // Don't throw - notifications are non-critical
    }
  }

  /**
   * Notify trainer about recurring sessions (async)
   * @param {string|number} trainerId - Trainer ID
   * @param {Array} sessions - Created sessions
   * @param {string} location - Session location
   */
  async notifyTrainerAboutRecurringSessions(trainerId, sessions, location) {
    try {
      const trainer = await this.User.findByPk(trainerId);
      if (trainer) {
        await sendEmailNotification({
          to: trainer.email,
          subject: 'New Recurring Sessions Assigned - Swan Studios',
          html: `<p>You have been assigned to <strong>${sessions.length}</strong> new recurring sessions.</p>
                 <p>First session: ${new Date(sessions[0].sessionDate).toLocaleString()}</p>
                 <p>Last session: ${new Date(sessions[sessions.length-1].sessionDate).toLocaleString()}</p>
                 <p>Location: ${location || 'Main Studio'}</p>
                 <p>Please check your schedule for details.</p>`
        });
      }
    } catch (error) {
      logger.error('Error notifying trainer about recurring sessions:', error);
      // Don't throw - notifications are non-critical
    }
  }

  /**
   * Health check for the service
   * @returns {Object} Health status
   */
  async healthCheck() {
    try {
      return {
        service: this.serviceName,
        version: this.version,
        status: 'healthy',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        service: this.serviceName,
        version: this.version,
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

// Create and export singleton instance
const unifiedSessionService = new UnifiedSessionService();

export default unifiedSessionService;
export { UnifiedSessionService };

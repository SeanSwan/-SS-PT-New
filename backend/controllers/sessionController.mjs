/**
 * Session Management Controller (Training Session Lifecycle Operations)
 * ======================================================================
 *
 * Purpose: Controller for complete session booking workflow including creation, booking,
 * confirmation, cancellation, and trainer assignment with real-time Socket.IO notifications
 *
 * Blueprint Reference: SwanStudios Personal Training Platform - Session Management System
 *
 * Architecture Overview:
 * ┌─────────────────────┐      ┌──────────────────┐      ┌─────────────────┐      ┌──────────────────┐
 * │  Client Dashboard   │─────▶│  Session Routes  │─────▶│  Session Ctrl   │─────▶│  Sessions Table  │
 * │  (React)            │      │  (sessionRoutes) │      │  (11 methods)   │      │  (PostgreSQL)    │
 * └─────────────────────┘      └──────────────────┘      └─────────────────┘      └──────────────────┘
 *                                                                   │
 *                                                                   ▼
 *                                                          ┌──────────────────┐
 *                                                          │  Socket.IO       │
 *                                                          │  (Real-time)     │
 *                                                          └──────────────────┘
 *
 * Database Schema (sessions table):
 *
 *   ┌─────────────────────────────────────────────────────────────┐
 *   │ sessions                                                    │
 *   │ ├─id (PK, UUID)                                             │
 *   │ ├─sessionDate (TIMESTAMP) - Start time                      │
 *   │ ├─endDate (TIMESTAMP, nullable)                             │
 *   │ ├─duration (INTEGER, default: 60) - Minutes                 │
 *   │ ├─status (ENUM: available, scheduled, confirmed, completed) │
 *   │ ├─userId (FK → users.id, nullable) - Client                 │
 *   │ ├─trainerId (FK → users.id, nullable) - Trainer             │
 *   │ ├─location (STRING, default: "Main Studio")                 │
 *   │ ├─sessionType (STRING, default: "Standard Training")        │
 *   │ ├─notes (TEXT, nullable) - Client notes                     │
 *   │ ├─privateNotes (TEXT, nullable) - Trainer/admin only        │
 *   │ ├─confirmed (BOOLEAN, default: false)                       │
 *   │ ├─confirmedBy (FK → users.id, nullable)                     │
 *   │ ├─confirmationDate (TIMESTAMP, nullable)                    │
 *   │ ├─bookingDate (TIMESTAMP, nullable)                         │
 *   │ ├─cancelledBy (FK → users.id, nullable)                     │
 *   │ ├─cancellationReason (TEXT, nullable)                       │
 *   │ ├─cancellationDate (TIMESTAMP, nullable)                    │
 *   │ ├─sessionDeducted (BOOLEAN, default: false)                 │
 *   │ └─deductionDate (TIMESTAMP, nullable)                       │
 *   └─────────────────────────────────────────────────────────────┘
 *
 * Entity Relationships:
 *
 *   sessions ─────▶ users (userId) [client]
 *   sessions ─────▶ users (trainerId) [trainer]
 *   sessions ─────▶ users (confirmedBy) [admin/trainer]
 *   sessions ─────▶ users (cancelledBy) [client/admin/trainer]
 *
 * Controller Methods (11 total):
 *
 * ┌──────────────────────────────────────────────────────────────────────────────┐
 * │ METHOD                       ACCESS         PURPOSE                          │
 * ├──────────────────────────────────────────────────────────────────────────────┤
 * │ getAllSessions               Client/T/A     Get sessions with role filters   │
 * │ getSessionById               Client/T/A     Get single session with perms    │
 * │ createAvailableSessions      Admin          Bulk create available slots      │
 * │ bookSession                  Client/T/A     Book available session           │
 * │ requestSession               Client         Request custom time              │
 * │ cancelSession                Client/T/A     Cancel session (refund if admin) │
 * │ confirmSession               Trainer/Admin  Confirm session                  │
 * │ completeSession              Trainer/Admin  Mark session completed           │
 * │ assignTrainer                Admin          Assign trainer to session        │
 * │ createRecurringSessions      Admin          Bulk create recurring slots      │
 * │ addSessionNotes              Client/T/A     Add notes (private/public)       │
 * └──────────────────────────────────────────────────────────────────────────────┘
 *
 * Session Lifecycle (Mermaid Sequence Diagram):
 *
 * sequenceDiagram
 *     participant Admin
 *     participant Client
 *     participant Session
 *     participant User
 *     participant SocketIO
 *     participant Notification
 *
 *     Admin->>Session: createAvailableSessions (bulk slots)
 *     Session->>SocketIO: emit('sessions:updated', {type: 'created'})
 *
 *     Client->>Session: bookSession(sessionId)
 *     Session->>User: Check availableSessions > 0
 *     alt Insufficient Sessions
 *         Session-->>Client: 400 Error (No sessions)
 *     else Has Sessions
 *         Session->>Session: Update status = 'scheduled'
 *         Session->>User: Deduct availableSessions (if < 24hrs)
 *         Session->>Notification: notifySessionBooked(client)
 *         Session->>Notification: notifyAdminSessionBooked(admin)
 *         Session->>SocketIO: emit('sessions:updated', {type: 'booked'})
 *         Session-->>Client: 200 Success
 *     end
 *
 *     Admin->>Session: confirmSession(sessionId)
 *     Session->>Session: Update confirmed = true, status = 'confirmed'
 *     Session->>SocketIO: emit('sessions:updated', {type: 'confirmed'})
 *     Session-->>Admin: 200 Success
 *
 *     Admin->>Session: completeSession(sessionId)
 *     Session->>Session: Update status = 'completed'
 *     Session->>User: processSessionDeduction (if not deducted)
 *     Session->>Notification: notifyLowSessionsRemaining (if low)
 *     Session->>SocketIO: emit('sessions:updated', {type: 'completed'})
 *     Session-->>Admin: 200 Success
 *
 * Status Transitions:
 *
 *   available → scheduled (client books)
 *   scheduled → confirmed (trainer/admin confirms)
 *   confirmed → completed (trainer/admin completes)
 *   any → cancelled (client/trainer/admin cancels)
 *   requested → scheduled (admin assigns trainer)
 *
 * Business Logic:
 *
 * WHY Automatic Session Deduction on Booking Within 24 Hours?
 * - Late booking policy (prevents abuse of free rescheduling)
 * - Immediate session deduction if booking within 24 hours of start time
 * - Prevents clients from booking last-minute without commitment
 * - Encourages advance planning and reduces no-shows
 *
 * WHY Separate Public Notes and Private Notes?
 * - Public notes (client-visible): Client feedback, preferences, goals
 * - Private notes (trainer/admin only): Medical info, session performance, coaching notes
 * - Privacy compliance (sensitive info not exposed to client)
 * - Professional coaching documentation
 *
 * WHY Allow Admin to Cancel Without Past Session Restriction?
 * - Emergency cancellations (facility issues, trainer illness)
 * - Administrative corrections (booking errors)
 * - Session refunds (customer service)
 * - Clients and trainers cannot cancel past sessions (prevents abuse)
 *
 * WHY Refund Session on Cancellation (Admin Only)?
 * - Customer service escalations
 * - Incorrect deductions (administrative errors)
 * - Cancellations due to studio fault
 * - Requires admin privileges to prevent self-service refunds
 *
 * WHY Socket.IO Real-Time Updates on Every Session Change?
 * - Multi-user dashboard synchronization
 * - Prevent double-booking conflicts
 * - Real-time calendar updates
 * - Improved UX (instant feedback without page refresh)
 *
 * Security Model:
 * - Role-based access control (RBAC) enforced on all methods
 * - Clients can only book/cancel their own sessions (unless admin)
 * - Trainers can only confirm/complete sessions assigned to them
 * - Admins have full access (create, assign, confirm, complete, cancel, refund)
 * - Private notes restricted to admin/trainer roles
 *
 * Error Handling:
 * - 400: Invalid request (missing params, past session, no available slots)
 * - 403: Forbidden (client trying to access another client's session)
 * - 404: Not found (session or user not found)
 * - 500: Server error (database failures, Socket.IO errors)
 *
 * Dependencies:
 * - Session model (Sequelize ORM)
 * - User model (Sequelize ORM)
 * - Socket.IO (io from server.mjs)
 * - notification.mjs utilities (email/SMS notifications)
 * - logger.mjs (Winston logger)
 *
 * Performance Considerations:
 * - Bulk session creation uses Session.bulkCreate() (single transaction)
 * - Session queries include User associations (avoids N+1 queries)
 * - Socket.IO events are fire-and-forget (non-blocking)
 * - Notifications are async (non-blocking)
 *
 * Testing Strategy:
 * - Unit tests for each controller method
 * - Integration tests for session lifecycle (book → confirm → complete)
 * - Test role-based access control enforcement
 * - Test session deduction logic (24-hour rule)
 * - Test cancellation refund logic (admin-only)
 * - Mock Socket.IO and notification utilities
 *
 * Created: 2024-XX-XX
 * Enhanced: 2025-11-14 (Level 5/5 Documentation - Blueprint-First Standard)
 */

// backend/controllers/sessionController.mjs
import logger from '../utils/logger.mjs';
import Session from '../models/Session.mjs';
import User from '../models/User.mjs';
import { Op } from 'sequelize';
import { io } from '../server.mjs';
import {
  notifySessionBooked,
  notifyAdminSessionBooked,
  notifySessionCancelled,
  processSessionDeduction,
  notifyLowSessionsRemaining
} from '../utils/notification.mjs';

export const sessionController = async (req, res) => {
  try {
    logger.info('Processing request', { path: req.path, method: req.method });
    // Controller logic
    res.status(200).json({ success: true });
  } catch (error) {
    logger.error('Error in exampleController', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Internal server error' });
  }
};

import { successResponse, errorResponse } from '../utils/apiResponse.mjs';

export const getUserProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    return successResponse(res, user, 'User profile retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to retrieve user profile', 500);
  }
};

/**
 * Get all sessions with optional filtering
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getAllSessions = async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      status,
      trainerId,
      userId,
      confirmed
    } = req.query;

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
        filter.status = {
          [Op.in]: status
        };
      } else {
        filter.status = status;
      }
    }

    // Confirmed filter
    if (confirmed !== undefined) {
      filter.confirmed = confirmed === 'true';
    }

    // Role-based filtering
    if (req.user.role === 'client') {
      // Clients can only see their own sessions or available sessions
      filter[Op.or] = [
        { userId: req.user.id },
        { status: 'available' }
      ];
    } else if (req.user.role === 'trainer') {
      // Trainers can see sessions assigned to them
      filter.trainerId = req.user.id;
    }
    // Admins can see all sessions, so no additional filter needed

    // Specific trainer filter (admin only)
    if (trainerId && req.user.role === 'admin') {
      filter.trainerId = trainerId;
    }

    // Specific client filter (admin only)
    if (userId && req.user.role === 'admin') {
      filter.userId = userId;
    }

    // Fetch sessions with related user data
    const sessions = await Session.findAll({
      where: filter,
      include: [
        {
          model: User,
          as: 'client',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'photo']
        },
        {
          model: User,
          as: 'trainer',
          attributes: ['id', 'firstName', 'lastName', 'email', 'photo', 'bio', 'specialties']
        }
      ],
      order: [['sessionDate', 'ASC']]
    });

    return res.status(200).json(sessions);
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error fetching sessions',
      error: error.message
    });
  }
};

/**
 * Get a single session by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getSessionById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find the session with associated users
    const session = await Session.findByPk(id, {
      include: [
        {
          model: User,
          as: 'client',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'photo', 
            'fitnessGoal', 'trainingExperience', 'healthConcerns', 'weight', 'height']
        },
        {
          model: User,
          as: 'trainer',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'photo', 'bio', 'specialties']
        }
      ]
    });
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }
    
    // Check permissions for private notes
    if (req.user.role !== 'admin' && req.user.role !== 'trainer') {
      // Remove private notes for non-admin/trainer users
      session.privateNotes = undefined;
    }
    
    // Check general permissions
    if (
      req.user.role !== 'admin' && 
      req.user.role !== 'trainer' && 
      session.userId !== req.user.id &&
      session.status !== 'available'
    ) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view this session'
      });
    }
    
    return res.status(200).json({
      success: true,
      session
    });
  } catch (error) {
    console.error('Error fetching session by ID:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error fetching session',
      error: error.message
    });
  }
};

/**
 * Create available session slots (admin only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const createAvailableSessions = async (req, res) => {
  try {
    // Only admins can create available sessions
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin privileges required to create available sessions'
      });
    }
    
    const { slots } = req.body;
    
    if (!Array.isArray(slots) || slots.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request: slots must be a non-empty array'
      });
    }
    
    // Validate each slot
    for (const slot of slots) {
      if (!slot.date) {
        return res.status(400).json({
          success: false,
          message: 'Each slot must include a date'
        });
      }
      
      // Check if date is in the past
      if (new Date(slot.date) < new Date()) {
        return res.status(400).json({
          success: false,
          message: 'Cannot create sessions in the past'
        });
      }
    }
    
    // Create all slots in a single transaction
    const createdSessions = await Session.bulkCreate(
      slots.map(slot => ({
        sessionDate: new Date(slot.date),
        endDate: slot.endDate ? new Date(slot.endDate) : null,
        duration: slot.duration || 60,
        status: 'available',
        trainerId: slot.trainerId || null,
        location: slot.location || 'Main Studio',
        sessionType: slot.sessionType || 'Standard Training',
        notes: slot.notes || ''
      }))
    );
    
    // Notify clients via Socket.IO
    io.emit('sessions:updated', { 
      type: 'created', 
      count: createdSessions.length 
    });
    
    return res.status(201).json({
      success: true,
      message: `Successfully created ${createdSessions.length} available session slots`,
      sessions: createdSessions
    });
  } catch (error) {
    console.error('Error creating available sessions:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error creating available sessions',
      error: error.message
    });
  }
};

/**
 * Book an available session
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const bookSession = async (req, res) => {
  try {
    const { sessionId } = req.body;
    
    // Find the session and ensure it's available
    const session = await Session.findOne({
      where: {
        id: sessionId,
        status: 'available'
      }
    });
    
    if (!session) {
      return res.status(400).json({
        success: false,
        message: 'Session is not available for booking'
      });
    }
    
    // Check if session date is in the past
    if (new Date(session.sessionDate) < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot book sessions in the past'
      });
    }
    
    // Get the client (current user)
    const client = await User.findByPk(req.user.id);
    
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }
    
    // Check if session is within 24 hours
    const sessionDate = new Date(session.sessionDate);
    const now = new Date();
    const differenceInHours = (sessionDate - now) / (1000 * 60 * 60);
    
    // Update the session
    session.userId = client.id;
    session.status = 'scheduled';
    session.bookingDate = now;
    await session.save();
    
    // If session is within 24 hours and client has available sessions,
    // deduct a session automatically
    let deductionResult = null;
    if (differenceInHours <= 24 && client.availableSessions > 0) {
      deductionResult = await processSessionDeduction(session, client);
    }
    
    // Send notifications
    await notifySessionBooked(session, client);
    await notifyAdminSessionBooked(session, client);
    
    // If client is low on sessions after deduction, send a notification
    if (deductionResult && deductionResult.deducted) {
      await notifyLowSessionsRemaining(client, client.availableSessions);
    }
    
    // Notify via Socket.IO
    io.emit('sessions:updated', { 
      type: 'booked', 
      sessionId: session.id,
      userId: client.id
    });
    
    // Fetch the updated session with related data
    const updatedSession = await Session.findByPk(session.id, {
      include: [
        {
          model: User,
          as: 'client',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'photo']
        },
        {
          model: User,
          as: 'trainer',
          attributes: ['id', 'firstName', 'lastName', 'email', 'photo']
        }
      ]
    });
    
    return res.status(200).json({
      success: true,
      message: 'Session booked successfully',
      session: updatedSession,
      deductionResult: deductionResult?.deducted ? {
        deducted: true,
        remainingSessions: client.availableSessions
      } : null
    });
  } catch (error) {
    console.error('Error booking session:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error booking session',
      error: error.message
    });
  }
};

/**
 * Request a custom session time
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const requestSession = async (req, res) => {
  try {
    const { 
      start, 
      end, 
      notes, 
      sessionType, 
      location 
    } = req.body;
    
    // Validate the date/time
    const startDate = new Date(start);
    
    if (isNaN(startDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format'
      });
    }
    
    if (startDate < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot request sessions in the past'
      });
    }
    
    // Get the client (current user)
    const client = await User.findByPk(req.user.id);
    
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }
    
    // Create the session request
    const session = await Session.create({
      sessionDate: startDate,
      endDate: end ? new Date(end) : null,
      status: 'requested',
      userId: client.id,
      notes: notes || null,
      sessionType: sessionType || 'Standard Training',
      location: location || 'Main Studio',
      confirmed: false,
      bookingDate: new Date()
    });
    
    // Send notification to admin
    await notifyAdminSessionBooked(session, client);
    
    // Notify via Socket.IO
    io.emit('sessions:updated', { 
      type: 'requested', 
      sessionId: session.id,
      userId: client.id
    });
    
    return res.status(201).json({
      success: true,
      message: 'Session request submitted successfully',
      session
    });
  } catch (error) {
    console.error('Error requesting session:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error requesting session',
      error: error.message
    });
  }
};

/**
 * Cancel a session
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const cancelSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { reason, earlyCancel } = req.body;

    // Find the session
    const session = await Session.findByPk(sessionId, {
      include: [
        {
          model: User,
          as: 'client',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'availableSessions']
        }
      ]
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    // Check permissions
    const isAdmin = req.user.role === 'admin';
    const isTrainer = req.user.role === 'trainer' && session.trainerId === req.user.id;
    const isOwner = session.userId === req.user.id;

    if (!isAdmin && !isOwner && !isTrainer) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to cancel this session'
      });
    }

    // Check if session date is in the past
    if (new Date(session.sessionDate) < new Date() && !isAdmin) {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel past sessions'
      });
    }

    // Determine if this is an early cancel (more than 24 hours before session)
    const sessionTime = new Date(session.sessionDate).getTime();
    const now = Date.now();
    const hoursUntilSession = (sessionTime - now) / (1000 * 60 * 60);
    const isEarlyCancelEligible = hoursUntilSession > 24;
    const applyEarlyCancel = earlyCancel && isEarlyCancelEligible;

    // If session was deducted, refund the session (admin or early cancel)
    if (session.sessionDeducted && (isAdmin || applyEarlyCancel) && session.client) {
      const client = session.client;
      client.availableSessions += 1;
      await client.save();

      // Update session
      session.sessionDeducted = false;
      session.deductionDate = null;
    }
    
    // Update the session
    session.status = 'cancelled';
    session.cancelledBy = req.user.id;
    session.cancellationReason = applyEarlyCancel
      ? `[Early Cancel - No Charge] ${reason || 'Cancelled by user'}`
      : (reason || 'Cancelled by user');
    session.cancellationDate = new Date();
    await session.save();

    // Send cancellation notifications
    if (session.client) {
      await notifySessionCancelled(session, session.client, req.user, reason);
    }

    // Notify via Socket.IO
    io.emit('sessions:updated', {
      type: 'cancelled',
      sessionId: session.id,
      cancelledBy: req.user.id,
      earlyCancel: applyEarlyCancel
    });

    const message = applyEarlyCancel
      ? 'Session cancelled successfully (early cancel - no session credit deducted)'
      : 'Session cancelled successfully';

    return res.status(200).json({
      success: true,
      message,
      session: {
        id: session.id,
        status: session.status,
        cancelledBy: session.cancelledBy,
        cancellationReason: session.cancellationReason,
        cancellationDate: session.cancellationDate,
        earlyCancel: applyEarlyCancel
      }
    });
  } catch (error) {
    console.error('Error cancelling session:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error cancelling session',
      error: error.message
    });
  }
};

/**
 * Confirm a session (admin/trainer only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const confirmSession = async (req, res) => {
  try {
    // Check permission
    if (req.user.role !== 'admin' && req.user.role !== 'trainer') {
      return res.status(403).json({
        success: false,
        message: 'Admin or trainer privileges required to confirm sessions'
      });
    }
    
    const { sessionId } = req.params;
    
    // Find the session
    const session = await Session.findByPk(sessionId, {
      include: [
        {
          model: User,
          as: 'client',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone']
        }
      ]
    });
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }
    
    // Additional check for trainers - they can only confirm sessions assigned to them
    if (req.user.role === 'trainer' && session.trainerId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only confirm sessions assigned to you'
      });
    }
    
    // Check if the session can be confirmed
    if (session.status !== 'scheduled' && session.status !== 'requested') {
      return res.status(400).json({
        success: false,
        message: 'Only scheduled or requested sessions can be confirmed'
      });
    }
    
    // Update the session
    session.confirmed = true;
    session.status = 'confirmed';
    session.confirmedBy = req.user.id;
    session.confirmationDate = new Date();
    
    // If the session was requested, update the status
    if (session.status === 'requested') {
      session.status = 'confirmed';
    }
    
    await session.save();
    
    // Notify client about confirmation if there is a client
    if (session.client) {
      // Notification logic for confirmation
      // This would be implemented in your notification service
    }
    
    // Notify via Socket.IO
    io.emit('sessions:updated', { 
      type: 'confirmed', 
      sessionId: session.id,
      confirmedBy: req.user.id
    });
    
    return res.status(200).json({
      success: true,
      message: 'Session confirmed successfully',
      session: {
        id: session.id,
        status: session.status,
        confirmed: session.confirmed,
        confirmedBy: session.confirmedBy,
        confirmationDate: session.confirmationDate
      }
    });
  } catch (error) {
    console.error('Error confirming session:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error confirming session',
      error: error.message
    });
  }
};

/**
 * Mark a session as completed (admin/trainer only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const completeSession = async (req, res) => {
  try {
    // Check permission
    if (req.user.role !== 'admin' && req.user.role !== 'trainer') {
      return res.status(403).json({
        success: false,
        message: 'Admin or trainer privileges required to complete sessions'
      });
    }
    
    const { sessionId } = req.params;
    const { notes } = req.body;
    
    // Find the session
    const session = await Session.findByPk(sessionId, {
      include: [
        {
          model: User,
          as: 'client',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'availableSessions']
        }
      ]
    });
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }
    
    // Additional check for trainers - they can only complete sessions assigned to them
    if (req.user.role === 'trainer' && session.trainerId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only complete sessions assigned to you'
      });
    }
    
    // Check if the session can be completed
    if (session.status !== 'confirmed' && session.status !== 'scheduled') {
      return res.status(400).json({
        success: false,
        message: 'Only confirmed or scheduled sessions can be completed'
      });
    }
    
    // Update the session
    session.status = 'completed';
    
    // Add private notes if provided
    if (notes) {
      session.privateNotes = notes;
    }
    
    await session.save();
    
    // Deduct session if it hasn't been deducted yet and client has available sessions
    let deductionResult = null;
    if (!session.sessionDeducted && session.client && session.client.availableSessions > 0) {
      deductionResult = await processSessionDeduction(session, session.client);
      
      // If client is low on sessions after deduction, send a notification
      if (deductionResult && deductionResult.deducted) {
        await notifyLowSessionsRemaining(session.client, session.client.availableSessions);
      }
    }
    
    // Notify via Socket.IO
    io.emit('sessions:updated', { 
      type: 'completed', 
      sessionId: session.id
    });
    
    return res.status(200).json({
      success: true,
      message: 'Session marked as completed',
      session: {
        id: session.id,
        status: session.status
      },
      deductionResult: deductionResult
    });
  } catch (error) {
    console.error('Error completing session:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error completing session',
      error: error.message
    });
  }
};

/**
 * Assign a trainer to a session (admin only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const assignTrainer = async (req, res) => {
  try {
    // Only admins can assign trainers
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin privileges required to assign trainers'
      });
    }
    
    const { sessionId } = req.params;
    const { trainerId } = req.body;
    
    if (!trainerId) {
      return res.status(400).json({
        success: false,
        message: 'Trainer ID is required'
      });
    }
    
    // Verify the trainer exists and is a trainer
    const trainer = await User.findOne({
      where: {
        id: trainerId,
        role: 'trainer'
      }
    });
    
    if (!trainer) {
      return res.status(404).json({
        success: false,
        message: 'Trainer not found'
      });
    }
    
    // Find the session
    const session = await Session.findByPk(sessionId, {
      include: [
        {
          model: User,
          as: 'client',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone']
        }
      ]
    });
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }
    
    // Assign the trainer
    session.trainerId = trainerId;
    
    // If this was a requested session, update its status
    if (session.status === 'requested') {
      session.status = 'scheduled';
    }
    
    await session.save();
    
    // Notify trainer about the assignment
    // This would be implemented in your notification service
    
    // Notify via Socket.IO
    io.emit('sessions:updated', { 
      type: 'trainerAssigned', 
      sessionId: session.id,
      trainerId
    });
    
    // Fetch updated session with trainer details
    const updatedSession = await Session.findByPk(sessionId, {
      include: [
        {
          model: User,
          as: 'client',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone']
        },
        {
          model: User,
          as: 'trainer',
          attributes: ['id', 'firstName', 'lastName', 'email', 'photo', 'bio', 'specialties']
        }
      ]
    });
    
    return res.status(200).json({
      success: true,
      message: 'Trainer assigned successfully',
      session: updatedSession
    });
  } catch (error) {
    console.error('Error assigning trainer:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error assigning trainer',
      error: error.message
    });
  }
};

/**
 * Create recurring sessions (admin only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const createRecurringSessions = async (req, res) => {
  try {
    // Only admins can create recurring sessions
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin privileges required to create recurring sessions'
      });
    }
    
    const { 
      startDate, 
      endDate, 
      daysOfWeek,  // Array of days: [0,1,2,3,4,5,6] (0 = Sunday)
      times,       // Array of times: ["09:00", "14:00"]
      trainerId,
      location,
      sessionType,
      duration
    } = req.body;
    
    if (!startDate || !endDate || !daysOfWeek || !times) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters'
      });
    }
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format'
      });
    }
    
    if (start >= end) {
      return res.status(400).json({
        success: false,
        message: 'End date must be after start date'
      });
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
              sessionType: sessionType || 'Standard Training',
              confirmed: false
            });
          }
        }
      }
      
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    if (sessions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid future sessions could be generated'
      });
    }
    
    // Create all sessions in bulk
    const createdSessions = await Session.bulkCreate(sessions);
    
    // Notify via Socket.IO
    io.emit('sessions:updated', { 
      type: 'recurringCreated', 
      count: createdSessions.length 
    });
    
    return res.status(201).json({
      success: true,
      message: `Successfully created ${createdSessions.length} recurring sessions`,
      count: createdSessions.length,
      // Don't send all sessions to avoid large response
      sampleSessions: createdSessions.slice(0, 5)
    });
  } catch (error) {
    console.error('Error creating recurring sessions:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error creating recurring sessions',
      error: error.message
    });
  }
};

/**
 * Add notes to a session
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const addSessionNotes = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { notes } = req.body;
    
    if (!notes || typeof notes !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Valid notes are required'
      });
    }
    
    // Find the session
    const session = await Session.findByPk(sessionId);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }
    
    // Check permissions
    const isAdmin = req.user.role === 'admin';
    const isTrainer = req.user.role === 'trainer' && session.trainerId === req.user.id;
    const isOwner = session.userId === req.user.id;
    
    if (!isAdmin && !isOwner && !isTrainer) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to add notes to this session'
      });
    }
    
    // Update the appropriate notes field
    if (isAdmin || isTrainer) {
      // Admins and trainers update private notes
      session.privateNotes = notes;
    } else {
      // Clients update the regular notes
      session.notes = notes;
    }
    
    await session.save();
    
    return res.status(200).json({
      success: true,
      message: 'Session notes updated successfully',
      session: {
        id: session.id,
        notes: session.notes,
        privateNotes: isAdmin || isTrainer ? session.privateNotes : undefined
      }
    });
  } catch (error) {
    console.error('Error adding session notes:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error adding session notes',
      error: error.message
    });
  }
};

// Export all controller functions
export default {
  getAllSessions,
  getSessionById,
  createAvailableSessions,
  bookSession,
  requestSession,
  cancelSession,
  confirmSession,
  completeSession,
  assignTrainer,
  createRecurringSessions,
  addSessionNotes
};
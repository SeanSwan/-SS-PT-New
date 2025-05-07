// backend/controllers/enhancedSessionController.mjs
import logger from '../utils/logger.mjs';
import Session from '../models/Session.mjs';
import User from '../models/User.mjs';
import { Op } from 'sequelize';
import { 
  notifySessionBooked, 
  notifyAdminSessionBooked, 
  notifySessionCancelled,
  processSessionDeduction,
  notifyLowSessionsRemaining,
  sendSessionReminder,
  sendEmailNotification,
  sendSmsNotification
} from '../utils/notification.mjs';

/**
 * Get all sessions with comprehensive filtering
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
      confirmed,
      location
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
    
    // Location filter
    if (location) {
      filter.location = location;
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

    // Format sessions for calendar
    const formattedSessions = sessions.map(session => {
      const sessionData = session.get({ plain: true });
      // Calculate end time based on sessionDate and duration if endDate is not set
      if (!sessionData.endDate && sessionData.sessionDate && sessionData.duration) {
        const endDate = new Date(sessionData.sessionDate);
        endDate.setMinutes(endDate.getMinutes() + sessionData.duration);
        sessionData.endDate = endDate;
      }
      
      // Rename fields to match frontend expectations
      return {
        ...sessionData,
        id: sessionData.id.toString(),
        start: sessionData.sessionDate,
        end: sessionData.endDate || new Date(new Date(sessionData.sessionDate).getTime() + (sessionData.duration || 60) * 60000),
        title: createSessionTitle(sessionData)
      };
    });

    return res.status(200).json(formattedSessions);
  } catch (error) {
    logger.error('Error fetching sessions:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error fetching sessions',
      error: error.message
    });
  }
};

/**
 * Create a descriptive title for session events
 * @param {Object} session - Session data
 * @returns {string} Formatted title
 */
const createSessionTitle = (session) => {
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
  
  return title;
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
    
    // Calculate end time based on sessionDate and duration if endDate is not set
    const sessionData = session.get({ plain: true });
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
      title: createSessionTitle(sessionData)
    };
    
    return res.status(200).json({
      success: true,
      session: formattedSession
    });
  } catch (error) {
    logger.error('Error fetching session by ID:', error);
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
    
    const { sessions } = req.body;
    
    if (!Array.isArray(sessions) || sessions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request: sessions must be a non-empty array'
      });
    }
    
    // Validate each session
    for (const session of sessions) {
      if (!session.start) {
        return res.status(400).json({
          success: false,
          message: 'Each session must include a start time'
        });
      }
      
      // Check if date is in the past
      if (new Date(session.start) < new Date()) {
        return res.status(400).json({
          success: false,
          message: 'Cannot create sessions in the past'
        });
      }
    }
    
    // Create all sessions in a single transaction
    const createdSessions = await Session.bulkCreate(
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
      })
    );
    
    // Format sessions for calendar
    const formattedSessions = createdSessions.map(session => {
      const sessionData = session.get({ plain: true });
      return {
        ...sessionData,
        id: sessionData.id.toString(),
        start: sessionData.sessionDate,
        end: sessionData.endDate,
        title: createSessionTitle(sessionData)
      };
    });
    
    // Notify trainers about assigned sessions
    for (const session of createdSessions) {
      if (session.trainerId) {
        const trainer = await User.findByPk(session.trainerId);
        if (trainer) {
          await sendEmailNotification({
            to: trainer.email,
            subject: 'New Session Assignment',
            text: `You have been assigned to a new session on ${new Date(session.sessionDate).toLocaleString()}`,
            html: `<p>You have been assigned to a new session on <strong>${new Date(session.sessionDate).toLocaleString()}</strong>.</p>
                   <p>Location: ${session.location || 'Main Studio'}</p>
                   <p>Please check your schedule for details.</p>`
          });
        }
      }
    }
    
    return res.status(201).json({
      success: true,
      message: `Successfully created ${createdSessions.length} available session slots`,
      sessions: formattedSessions
    });
  } catch (error) {
    logger.error('Error creating available sessions:', error);
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
    const { id } = req.params;
    
    // Find the session and ensure it's available
    const session = await Session.findOne({
      where: {
        id,
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
    
    // Update the session
    session.userId = client.id;
    session.status = 'scheduled';
    session.bookingDate = new Date();
    await session.save();
    
    // Send notifications
    await notifySessionBooked(session, client);
    await notifyAdminSessionBooked(session, client);
    
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
    
    // Format response
    const sessionData = updatedSession.get({ plain: true });
    const formattedSession = {
      ...sessionData,
      id: sessionData.id.toString(),
      start: sessionData.sessionDate,
      end: sessionData.endDate || new Date(new Date(sessionData.sessionDate).getTime() + (sessionData.duration || 60) * 60000),
      title: createSessionTitle(sessionData)
    };
    
    return res.status(200).json({
      success: true,
      message: 'Session booked successfully',
      session: formattedSession
    });
  } catch (error) {
    logger.error('Error booking session:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error booking session',
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
      duration,
      sessionType
    } = req.body;
    
    if (!startDate || !endDate || !daysOfWeek || !times) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters'
      });
    }
    
    if (!Array.isArray(daysOfWeek) || daysOfWeek.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'daysOfWeek must be a non-empty array'
      });
    }
    
    if (!Array.isArray(times) || times.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'times must be a non-empty array'
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
              sessionType: sessionType || 'Standard Training'
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
    
    // Format for response (just a sample to avoid large response)
    const sampleSessions = createdSessions.slice(0, 5).map(session => {
      const sessionData = session.get({ plain: true });
      return {
        ...sessionData,
        id: sessionData.id.toString(),
        start: sessionData.sessionDate,
        end: sessionData.endDate,
        title: createSessionTitle(sessionData)
      };
    });
    
    // Notify trainers if a trainer was assigned
    if (trainerId) {
      const trainer = await User.findByPk(trainerId);
      if (trainer) {
        await sendEmailNotification({
          to: trainer.email,
          subject: 'New Recurring Sessions Assigned',
          text: `You have been assigned to ${createdSessions.length} new recurring sessions.`,
          html: `<p>You have been assigned to <strong>${createdSessions.length}</strong> new recurring sessions.</p>
                 <p>First session: ${new Date(sessions[0].sessionDate).toLocaleString()}</p>
                 <p>Last session: ${new Date(sessions[sessions.length-1].sessionDate).toLocaleString()}</p>
                 <p>Location: ${location || 'Main Studio'}</p>
                 <p>Please check your schedule for details.</p>`
        });
      }
    }
    
    return res.status(201).json({
      success: true,
      message: `Successfully created ${createdSessions.length} recurring sessions`,
      count: createdSessions.length,
      sampleSessions
    });
  } catch (error) {
    logger.error('Error creating recurring sessions:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error creating recurring sessions',
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
    const { id } = req.params;
    const { reason } = req.body;
    
    // Find the session
    const session = await Session.findByPk(id, {
      include: [
        {
          model: User,
          as: 'client',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone']
        },
        {
          model: User,
          as: 'trainer',
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
    
    // Check if cancellation is allowed for this status
    const allowedStatuses = ['available', 'scheduled', 'confirmed', 'requested'];
    if (!allowedStatuses.includes(session.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel a session with status: ${session.status}`
      });
    }
    
    // Update the session
    session.status = 'cancelled';
    session.cancelledBy = req.user.id;
    session.cancellationReason = reason || 'Cancelled by user';
    session.cancellationDate = new Date();
    await session.save();
    
    // Send cancellation notifications
    try {
      // Get the canceller
      const canceller = await User.findByPk(req.user.id);
      
      // Notify client if they exist and didn't cancel themselves
      if (session.client && session.client.id !== req.user.id) {
        await sendEmailNotification({
          to: session.client.email,
          subject: 'Session Cancellation - Swan Studios',
          text: `Your session scheduled for ${new Date(session.sessionDate).toLocaleString()} has been cancelled by ${canceller ? `${canceller.firstName} ${canceller.lastName}` : 'the system'}.`,
          html: `<p>Your session scheduled for <strong>${new Date(session.sessionDate).toLocaleString()}</strong> has been cancelled by ${canceller ? `${canceller.firstName} ${canceller.lastName}` : 'the system'}.</p>
                 <p>Reason: ${session.cancellationReason}</p>`
        });
        
        // Send SMS if client has a phone number
        if (session.client.phone) {
          await sendSmsNotification({
            to: session.client.phone,
            body: `Swan Studios: Your session on ${new Date(session.sessionDate).toLocaleString()} has been cancelled. Reason: ${session.cancellationReason}`
          });
        }
      }
      
      // Notify trainer if they exist and didn't cancel themselves
      if (session.trainer && session.trainer.id !== req.user.id) {
        await sendEmailNotification({
          to: session.trainer.email,
          subject: 'Session Cancellation - Swan Studios',
          text: `A session scheduled for ${new Date(session.sessionDate).toLocaleString()} has been cancelled by ${canceller ? `${canceller.firstName} ${canceller.lastName}` : 'the system'}.`,
          html: `<p>A session scheduled for <strong>${new Date(session.sessionDate).toLocaleString()}</strong> has been cancelled by ${canceller ? `${canceller.firstName} ${canceller.lastName}` : 'the system'}.</p>
                 <p>Reason: ${session.cancellationReason}</p>`
        });
      }
      
      // Notify admin if they didn't cancel themselves
      if (!isAdmin) {
        // Get admin emails from environment variable
        const adminEmails = process.env.ADMIN_EMAIL || process.env.OWNER_EMAIL || 'ogpswan@yahoo.com';
        
        await sendEmailNotification({
          to: adminEmails,
          subject: 'Session Cancellation - Swan Studios',
          text: `A session scheduled for ${new Date(session.sessionDate).toLocaleString()} has been cancelled by ${canceller ? `${canceller.firstName} ${canceller.lastName}` : 'the system'}.`,
          html: `<p>A session scheduled for <strong>${new Date(session.sessionDate).toLocaleString()}</strong> has been cancelled by ${canceller ? `${canceller.firstName} ${canceller.lastName}` : 'the system'}.</p>
                 <p>Client: ${session.client ? `${session.client.firstName} ${session.client.lastName}` : 'None'}</p>
                 <p>Trainer: ${session.trainer ? `${session.trainer.firstName} ${session.trainer.lastName}` : 'None'}</p>
                 <p>Reason: ${session.cancellationReason}</p>`
        });
      }
    } catch (notificationError) {
      logger.error('Error sending cancellation notifications:', notificationError);
      // Continue with the response even if notifications failed
    }
    
    return res.status(200).json({
      success: true,
      message: 'Session cancelled successfully',
      session: {
        id: session.id,
        status: session.status,
        cancelledBy: session.cancelledBy,
        cancellationReason: session.cancellationReason,
        cancellationDate: session.cancellationDate
      }
    });
  } catch (error) {
    logger.error('Error cancelling session:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error cancelling session',
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
    
    const { id } = req.params;
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
    const session = await Session.findByPk(id, {
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
    try {
      await sendEmailNotification({
        to: trainer.email,
        subject: 'New Session Assignment - Swan Studios',
        text: `You have been assigned to a session on ${new Date(session.sessionDate).toLocaleString()}.`,
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
          text: `${trainer.firstName} ${trainer.lastName} has been assigned as your trainer for the session on ${new Date(session.sessionDate).toLocaleString()}.`,
          html: `<p><strong>${trainer.firstName} ${trainer.lastName}</strong> has been assigned as your trainer for the session on <strong>${new Date(session.sessionDate).toLocaleString()}</strong>.</p>
                 <p>Location: ${session.location || 'Main Studio'}</p>`
        });
      }
    } catch (notificationError) {
      logger.error('Error sending trainer assignment notifications:', notificationError);
      // Continue with the response even if notifications failed
    }
    
    // Fetch updated session with trainer details
    const updatedSession = await Session.findByPk(id, {
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
    
    // Format for response
    const sessionData = updatedSession.get({ plain: true });
    const formattedSession = {
      ...sessionData,
      id: sessionData.id.toString(),
      start: sessionData.sessionDate,
      end: sessionData.endDate || new Date(new Date(sessionData.sessionDate).getTime() + (sessionData.duration || 60) * 60000),
      title: createSessionTitle(sessionData)
    };
    
    return res.status(200).json({
      success: true,
      message: 'Trainer assigned successfully',
      session: formattedSession
    });
  } catch (error) {
    logger.error('Error assigning trainer:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error assigning trainer',
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
    
    const { id } = req.params;
    
    // Find the session
    const session = await Session.findByPk(id, {
      include: [
        {
          model: User,
          as: 'client',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone']
        },
        {
          model: User,
          as: 'trainer',
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
    await session.save();
    
    // Notify client about confirmation if there is a client
    try {
      if (session.client) {
        await sendEmailNotification({
          to: session.client.email,
          subject: 'Session Confirmed - Swan Studios',
          text: `Your session on ${new Date(session.sessionDate).toLocaleString()} has been confirmed.`,
          html: `<p>Your session on <strong>${new Date(session.sessionDate).toLocaleString()}</strong> has been confirmed.</p>
                 <p>Location: ${session.location || 'Main Studio'}</p>
                 <p>Trainer: ${session.trainer ? `${session.trainer.firstName} ${session.trainer.lastName}` : 'To be determined'}</p>
                 <p>Please arrive 10 minutes early.</p>`
        });
        
        // Send SMS if client has a phone number
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
    } catch (notificationError) {
      logger.error('Error sending confirmation notifications:', notificationError);
      // Continue with the response even if notifications failed
    }
    
    // Format for response
    const sessionData = session.get({ plain: true });
    const formattedSession = {
      ...sessionData,
      id: sessionData.id.toString(),
      start: sessionData.sessionDate,
      end: sessionData.endDate || new Date(new Date(sessionData.sessionDate).getTime() + (sessionData.duration || 60) * 60000),
      title: createSessionTitle(sessionData)
    };
    
    return res.status(200).json({
      success: true,
      message: 'Session confirmed successfully',
      session: formattedSession
    });
  } catch (error) {
    logger.error('Error confirming session:', error);
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
    
    const { id } = req.params;
    const { notes } = req.body;
    
    // Find the session
    const session = await Session.findByPk(id, {
      include: [
        {
          model: User,
          as: 'client',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'availableSessions']
        },
        {
          model: User,
          as: 'trainer',
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
    session.completedBy = req.user.id;
    session.completionDate = new Date();
    
    // Add private notes if provided
    if (notes) {
      session.privateNotes = notes;
    }
    
    await session.save();
    
    // Notify client about completion
    try {
      if (session.client) {
        await sendEmailNotification({
          to: session.client.email,
          subject: 'Session Completed - Swan Studios',
          text: `Your session on ${new Date(session.sessionDate).toLocaleString()} has been marked as completed.`,
          html: `<p>Your session on <strong>${new Date(session.sessionDate).toLocaleString()}</strong> has been marked as completed.</p>
                 <p>Thank you for training with us!</p>
                 <p>Please provide feedback on your session experience when you have a moment.</p>`
        });
      }
    } catch (notificationError) {
      logger.error('Error sending completion notifications:', notificationError);
      // Continue with the response even if notifications failed
    }
    
    // Format for response
    const sessionData = session.get({ plain: true });
    const formattedSession = {
      ...sessionData,
      id: sessionData.id.toString(),
      start: sessionData.sessionDate,
      end: sessionData.endDate || new Date(new Date(sessionData.sessionDate).getTime() + (sessionData.duration || 60) * 60000),
      title: createSessionTitle(sessionData)
    };
    
    return res.status(200).json({
      success: true,
      message: 'Session marked as completed',
      session: formattedSession
    });
  } catch (error) {
    logger.error('Error completing session:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error completing session',
      error: error.message
    });
  }
};

/**
 * Get all trainers (for dropdown selection)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getTrainers = async (req, res) => {
  try {
    const trainers = await User.findAll({
      where: { role: 'trainer' },
      attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'photo', 'specialties', 'bio']
    });
    
    return res.status(200).json(trainers);
  } catch (error) {
    logger.error('Error fetching trainers:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error fetching trainers',
      error: error.message
    });
  }
};

/**
 * Get all clients (for dropdown selection)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getClients = async (req, res) => {
  try {
    // Only admins and trainers can see clients
    if (req.user.role !== 'admin' && req.user.role !== 'trainer') {
      return res.status(403).json({
        success: false,
        message: 'Admin or trainer privileges required to view clients'
      });
    }
    
    const clients = await User.findAll({
      where: { role: 'client' },
      attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'photo']
    });
    
    return res.status(200).json(clients);
  } catch (error) {
    logger.error('Error fetching clients:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error fetching clients',
      error: error.message
    });
  }
};

/**
 * Get schedule statistics
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getScheduleStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    
    // Current time for date comparisons
    const now = new Date();
    
    // Base filters
    let whereClause = {};
    
    // Role-based filtering
    if (userRole === 'client') {
      // Clients see stats for their sessions only
      whereClause = {
        [Op.or]: [
          { userId },
          { status: 'available' }
        ]
      };
    } else if (userRole === 'trainer') {
      // Trainers see stats for their assigned sessions
      whereClause = { trainerId: userId };
    }
    // Admins see stats for all sessions
    
    // Get counts
    const totalSessions = await Session.count({ where: whereClause });
    
    const availableSessions = await Session.count({
      where: {
        ...whereClause,
        status: 'available',
        sessionDate: { [Op.gt]: now }
      }
    });
    
    const bookedSessions = await Session.count({
      where: {
        ...whereClause,
        status: { [Op.in]: ['scheduled', 'confirmed'] },
        sessionDate: { [Op.gt]: now }
      }
    });
    
    const completedSessions = await Session.count({
      where: {
        ...whereClause,
        status: 'completed'
      }
    });
    
    const cancelledSessions = await Session.count({
      where: {
        ...whereClause,
        status: 'cancelled'
      }
    });
    
    // For clients, get additional stat - their booked sessions
    let userBookedSessions = 0;
    if (userRole === 'client') {
      userBookedSessions = await Session.count({
        where: {
          userId,
          status: { [Op.in]: ['scheduled', 'confirmed'] },
          sessionDate: { [Op.gt]: now }
        }
      });
    }
    
    // For trainers, get additional stat - their assigned sessions
    let assignedSessions = 0;
    if (userRole === 'trainer') {
      assignedSessions = await Session.count({
        where: {
          trainerId: userId,
          status: { [Op.in]: ['scheduled', 'confirmed'] },
          sessionDate: { [Op.gt]: now }
        }
      });
    }
    
    // For admins, get total clients and trainers
    let totalClients = 0;
    let totalTrainers = 0;
    if (userRole === 'admin') {
      totalClients = await User.count({ where: { role: 'client' } });
      totalTrainers = await User.count({ where: { role: 'trainer' } });
    }
    
    // Compile stats
    const stats = {
      totalSessions,
      availableSessions,
      bookedSessions,
      completedSessions,
      cancelledSessions
    };
    
    // Add role-specific stats
    if (userRole === 'client') {
      stats.userBookedSessions = userBookedSessions;
    } else if (userRole === 'trainer') {
      stats.assignedSessions = assignedSessions;
    } else if (userRole === 'admin') {
      stats.totalClients = totalClients;
      stats.totalTrainers = totalTrainers;
    }
    
    return res.status(200).json({
      success: true,
      stats
    });
  } catch (error) {
    logger.error('Error fetching schedule statistics:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error fetching schedule statistics',
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
  cancelSession,
  confirmSession,
  completeSession,
  assignTrainer,
  createRecurringSessions,
  getTrainers,
  getClients,
  getScheduleStats
};

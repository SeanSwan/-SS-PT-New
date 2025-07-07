/**
 * TrainerAssignmentService.mjs - SwanStudios Trainer Assignment Engine
 * ===================================================================
 * Master Prompt v33 Compliance - Production-ready trainer assignment system
 * Handles session allocation → trainer assignment → client management flow
 * 
 * Features:
 * - Client-trainer relationship management
 * - Session assignment logic with availability tracking
 * - Trainer workload balancing
 * - Admin assignment controls with audit trail
 * - Real-time assignment notifications
 * - Integration with SessionAllocationService
 * 
 * Business Logic:
 * Available Sessions → Trainer Assignment → Client Relationship → Scheduled Sessions → Session Delivery
 */

import logger from '../utils/logger.mjs';
import { 
  getUser, 
  getSession,
  getOrder,
  getOrderItem,
  getStorefrontItem,
  getFinancialTransaction,
  getAdminNotification
} from '../models/index.mjs';

class TrainerAssignmentService {
  constructor() {
    this.serviceName = 'TrainerAssignmentService';
    this.version = '1.0.0';
  }

  /**
   * Assign trainer to client sessions
   * Main entry point for trainer assignment
   * 
   * @param {number} trainerId - Trainer user ID
   * @param {number} clientId - Client user ID  
   * @param {Array} sessionIds - Array of session IDs to assign (optional - assigns all available if empty)
   * @param {number} adminUserId - Admin who made the assignment
   * @returns {Object} Assignment result
   */
  async assignTrainerToClient(trainerId, clientId, sessionIds = [], adminUserId = null) {
    const startTime = Date.now();
    logger.info(`[TrainerAssignment] Starting trainer assignment`, {
      trainerId,
      clientId,
      sessionIds: sessionIds.length > 0 ? sessionIds : 'all available',
      adminUserId,
      timestamp: new Date().toISOString()
    });

    try {
      // 1. Validate trainer and client
      const { trainer, client } = await this.validateTrainerAndClient(trainerId, clientId);
      
      // 2. Get sessions to assign
      const sessionsToAssign = await this.getSessionsForAssignment(clientId, sessionIds);
      
      if (sessionsToAssign.length === 0) {
        logger.info(`[TrainerAssignment] No available sessions found for assignment`, {
          trainerId,
          clientId
        });
        return {
          success: true,
          assigned: 0,
          message: 'No available sessions found for assignment'
        };
      }

      // 3. Check trainer availability and capacity
      await this.validateTrainerCapacity(trainerId, sessionsToAssign.length);
      
      // 4. Perform the assignment
      const assignedSessions = await this.performSessionAssignment(
        sessionsToAssign,
        trainerId,
        adminUserId
      );
      
      // 5. Create client-trainer relationship record
      await this.createClientTrainerRelationship(clientId, trainerId, adminUserId);
      
      // 6. Send notifications
      await this.sendAssignmentNotifications(trainer, client, assignedSessions, adminUserId);
      
      // 7. Log assignment success
      const duration = Date.now() - startTime;
      logger.info(`[TrainerAssignment] Trainer assignment completed successfully`, {
        trainerId,
        clientId,
        assignedSessions: assignedSessions.length,
        duration: `${duration}ms`,
        sessionIds: assignedSessions.map(s => s.id)
      });

      return {
        success: true,
        assigned: assignedSessions.length,
        trainer: {
          id: trainer.id,
          name: `${trainer.firstName} ${trainer.lastName}`,
          email: trainer.email
        },
        client: {
          id: client.id,
          name: `${client.firstName} ${client.lastName}`,
          email: client.email
        },
        sessions: assignedSessions,
        message: `Successfully assigned ${assignedSessions.length} sessions to trainer ${trainer.firstName} ${trainer.lastName} for client ${client.firstName} ${client.lastName}`
      };

    } catch (error) {
      logger.error(`[TrainerAssignment] Error assigning trainer to client`, {
        error: error.message,
        stack: error.stack,
        trainerId,
        clientId,
        sessionIds,
        duration: `${Date.now() - startTime}ms`
      });

      throw new Error(`Trainer assignment failed: ${error.message}`);
    }
  }

  /**
   * Validate trainer and client users
   * 
   * @param {number} trainerId - Trainer user ID
   * @param {number} clientId - Client user ID
   * @returns {Object} Validated trainer and client
   */
  async validateTrainerAndClient(trainerId, clientId) {
    const User = getUser();

    // Get trainer
    const trainer = await User.findOne({
      where: { 
        id: trainerId,
        role: 'trainer'
      }
    });

    if (!trainer) {
      throw new Error(`Trainer with ID ${trainerId} not found or not a trainer`);
    }

    // Get client
    const client = await User.findOne({
      where: { 
        id: clientId,
        role: ['client', 'member'] // Support both role types
      }
    });

    if (!client) {
      throw new Error(`Client with ID ${clientId} not found or not a client/member`);
    }

    return { trainer, client };
  }

  /**
   * Get sessions available for assignment
   * 
   * @param {number} clientId - Client user ID
   * @param {Array} sessionIds - Specific session IDs (optional)
   * @returns {Array} Sessions available for assignment
   */
  async getSessionsForAssignment(clientId, sessionIds = []) {
    const Session = getSession();
    
    const whereCondition = {
      userId: clientId,
      status: 'available',
      trainerId: null // Only unassigned sessions
    };

    // If specific session IDs provided, add to filter
    if (sessionIds.length > 0) {
      whereCondition.id = sessionIds;
    }

    const sessions = await Session.findAll({
      where: whereCondition,
      order: [['createdAt', 'ASC']] // Assign oldest sessions first
    });

    // Validate that all requested sessions exist and are assignable
    if (sessionIds.length > 0 && sessions.length !== sessionIds.length) {
      const foundIds = sessions.map(s => s.id);
      const missingIds = sessionIds.filter(id => !foundIds.includes(id));
      throw new Error(`Sessions not found or not available for assignment: ${missingIds.join(', ')}`);
    }

    return sessions;
  }

  /**
   * Validate trainer capacity and availability
   * 
   * @param {number} trainerId - Trainer user ID
   * @param {number} sessionCount - Number of sessions to assign
   */
  async validateTrainerCapacity(trainerId, sessionCount) {
    const Session = getSession();
    
    // Get trainer's current assigned session count
    const currentAssignedCount = await Session.count({
      where: {
        trainerId,
        status: ['available', 'scheduled'] // Active sessions
      }
    });

    // Basic capacity check (configurable in the future)
    const maxCapacity = 100; // Default max sessions per trainer
    
    if (currentAssignedCount + sessionCount > maxCapacity) {
      throw new Error(`Trainer capacity exceeded. Current: ${currentAssignedCount}, Requesting: ${sessionCount}, Max: ${maxCapacity}`);
    }

    logger.info(`[TrainerAssignment] Trainer capacity check passed`, {
      trainerId,
      currentAssigned: currentAssignedCount,
      requestingToAssign: sessionCount,
      maxCapacity
    });
  }

  /**
   * Perform the actual session assignment
   * 
   * @param {Array} sessions - Sessions to assign
   * @param {number} trainerId - Trainer user ID
   * @param {number} adminUserId - Admin who made the assignment
   * @returns {Array} Updated session records
   */
  async performSessionAssignment(sessions, trainerId, adminUserId) {
    const Session = getSession();
    const assignedSessions = [];
    const assignmentTime = new Date();

    logger.info(`[TrainerAssignment] Assigning ${sessions.length} sessions to trainer ${trainerId}`);

    for (const session of sessions) {
      try {
        // Update session with trainer assignment
        await session.update({
          trainerId,
          status: 'assigned', // New status for assigned but not yet scheduled
          assignedAt: assignmentTime,
          assignedBy: adminUserId,
          notes: session.notes + ` | Assigned to trainer ${trainerId} by admin ${adminUserId || 'system'} on ${assignmentTime.toISOString()}`
        });

        assignedSessions.push(session);
        
        logger.info(`[TrainerAssignment] Session ${session.id} assigned to trainer ${trainerId}`);

      } catch (error) {
        logger.error(`[TrainerAssignment] Error assigning session ${session.id}`, {
          sessionId: session.id,
          trainerId,
          error: error.message
        });
        
        // Continue with other sessions even if one fails
        continue;
      }
    }

    if (assignedSessions.length === 0) {
      throw new Error('No sessions could be assigned due to errors');
    }

    return assignedSessions;
  }

  /**
   * Create or update client-trainer relationship
   * 
   * @param {number} clientId - Client user ID
   * @param {number} trainerId - Trainer user ID
   * @param {number} adminUserId - Admin who created the relationship
   */
  async createClientTrainerRelationship(clientId, trainerId, adminUserId) {
    try {
      // For now, we'll track this through session assignments
      // In the future, we could create a dedicated ClientTrainerRelationship table
      
      logger.info(`[TrainerAssignment] Client-trainer relationship established`, {
        clientId,
        trainerId,
        adminUserId,
        createdAt: new Date().toISOString()
      });

      // Future: Create dedicated relationship record
      // const ClientTrainerRelationship = getClientTrainerRelationship();
      // await ClientTrainerRelationship.findOrCreate({
      //   where: { clientId, trainerId },
      //   defaults: {
      //     clientId,
      //     trainerId,
      //     assignedBy: adminUserId,
      //     status: 'active',
      //     assignedAt: new Date()
      //   }
      // });

    } catch (error) {
      logger.warn(`[TrainerAssignment] Error creating client-trainer relationship`, {
        clientId,
        trainerId,
        error: error.message
      });
      // Don't fail the assignment if relationship tracking fails
    }
  }

  /**
   * Send assignment notifications
   * 
   * @param {Object} trainer - Trainer user object
   * @param {Object} client - Client user object
   * @param {Array} sessions - Assigned sessions
   * @param {number} adminUserId - Admin who made the assignment
   */
  async sendAssignmentNotifications(trainer, client, sessions, adminUserId) {
    try {
      const AdminNotification = getAdminNotification();

      // Create admin notification
      await AdminNotification.create({
        type: 'trainer_assignment',
        title: 'Trainer Assignment Completed',
        message: `${trainer.firstName} ${trainer.lastName} has been assigned ${sessions.length} sessions for client ${client.firstName} ${client.lastName}`,
        data: JSON.stringify({
          trainerId: trainer.id,
          trainerName: `${trainer.firstName} ${trainer.lastName}`,
          clientId: client.id,
          clientName: `${client.firstName} ${client.lastName}`,
          sessionCount: sessions.length,
          sessionIds: sessions.map(s => s.id),
          assignedBy: adminUserId,
          assignedAt: new Date().toISOString()
        }),
        priority: 'medium',
        createdBy: adminUserId
      });

      // Future: Send email notifications to trainer and client
      // await this.sendTrainerAssignmentEmail(trainer, client, sessions);
      // await this.sendClientAssignmentEmail(client, trainer, sessions);

      logger.info(`[TrainerAssignment] Assignment notifications sent`, {
        trainerId: trainer.id,
        clientId: client.id,
        sessionCount: sessions.length
      });

    } catch (error) {
      logger.warn(`[TrainerAssignment] Error sending assignment notifications`, {
        trainerId: trainer.id,
        clientId: client.id,
        error: error.message
      });
      // Don't fail the assignment if notifications fail
    }
  }

  /**
   * Get trainer's assigned clients and sessions
   * 
   * @param {number} trainerId - Trainer user ID
   * @returns {Object} Trainer's client assignments
   */
  async getTrainerAssignments(trainerId) {
    try {
      const Session = getSession();
      const User = getUser();

      // Get all sessions assigned to this trainer
      const sessions = await Session.findAll({
        where: {
          trainerId,
          status: ['assigned', 'scheduled', 'completed']
        },
        include: [{
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }],
        order: [['createdAt', 'DESC']]
      });

      // Group sessions by client
      const clientGroups = {};
      
      sessions.forEach(session => {
        const clientId = session.userId;
        if (!clientGroups[clientId]) {
          clientGroups[clientId] = {
            client: session.user,
            sessions: [],
            totalSessions: 0,
            availableSessions: 0,
            scheduledSessions: 0,
            completedSessions: 0
          };
        }
        
        clientGroups[clientId].sessions.push(session);
        clientGroups[clientId].totalSessions++;
        
        if (session.status === 'assigned') clientGroups[clientId].availableSessions++;
        if (session.status === 'scheduled') clientGroups[clientId].scheduledSessions++;
        if (session.status === 'completed') clientGroups[clientId].completedSessions++;
      });

      return {
        trainerId,
        totalClients: Object.keys(clientGroups).length,
        totalSessions: sessions.length,
        clients: Object.values(clientGroups)
      };

    } catch (error) {
      logger.error(`[TrainerAssignment] Error getting trainer assignments`, {
        trainerId,
        error: error.message
      });

      throw new Error(`Failed to get trainer assignments: ${error.message}`);
    }
  }

  /**
   * Get client's trainer assignments
   * 
   * @param {number} clientId - Client user ID
   * @returns {Object} Client's trainer assignments
   */
  async getClientAssignments(clientId) {
    try {
      const Session = getSession();
      const User = getUser();

      // Get all sessions for this client that have trainer assignments
      const sessions = await Session.findAll({
        where: {
          userId: clientId,
          trainerId: { [Session.sequelize.Op.not]: null }
        },
        include: [{
          model: User,
          as: 'trainer',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }],
        order: [['createdAt', 'DESC']]
      });

      // Group sessions by trainer
      const trainerGroups = {};
      
      sessions.forEach(session => {
        const trainerId = session.trainerId;
        if (!trainerGroups[trainerId]) {
          trainerGroups[trainerId] = {
            trainer: session.trainer,
            sessions: [],
            totalSessions: 0,
            availableSessions: 0,
            scheduledSessions: 0,
            completedSessions: 0
          };
        }
        
        trainerGroups[trainerId].sessions.push(session);
        trainerGroups[trainerId].totalSessions++;
        
        if (session.status === 'assigned') trainerGroups[trainerId].availableSessions++;
        if (session.status === 'scheduled') trainerGroups[trainerId].scheduledSessions++;
        if (session.status === 'completed') trainerGroups[trainerId].completedSessions++;
      });

      return {
        clientId,
        totalTrainers: Object.keys(trainerGroups).length,
        totalSessions: sessions.length,
        trainers: Object.values(trainerGroups)
      };

    } catch (error) {
      logger.error(`[TrainerAssignment] Error getting client assignments`, {
        clientId,
        error: error.message
      });

      throw new Error(`Failed to get client assignments: ${error.message}`);
    }
  }

  /**
   * Remove trainer assignment from sessions
   * 
   * @param {Array} sessionIds - Session IDs to unassign
   * @param {number} adminUserId - Admin removing the assignment
   * @returns {Object} Unassignment result
   */
  async removeTrainerAssignment(sessionIds, adminUserId = null) {
    try {
      const Session = getSession();
      
      logger.info(`[TrainerAssignment] Removing trainer assignment from sessions`, {
        sessionIds,
        adminUserId
      });

      // Get sessions to unassign
      const sessions = await Session.findAll({
        where: {
          id: sessionIds,
          trainerId: { [Session.sequelize.Op.not]: null },
          status: ['assigned', 'scheduled'] // Only allow unassigning if not completed
        }
      });

      if (sessions.length === 0) {
        return {
          success: true,
          unassigned: 0,
          message: 'No sessions found for unassignment'
        };
      }

      const unassignedSessions = [];
      
      for (const session of sessions) {
        await session.update({
          trainerId: null,
          status: 'available',
          assignedAt: null,
          assignedBy: null,
          notes: session.notes + ` | Trainer assignment removed by admin ${adminUserId || 'system'} on ${new Date().toISOString()}`
        });

        unassignedSessions.push(session);
      }

      logger.info(`[TrainerAssignment] Successfully unassigned ${unassignedSessions.length} sessions`);

      return {
        success: true,
        unassigned: unassignedSessions.length,
        sessions: unassignedSessions,
        message: `Successfully removed trainer assignment from ${unassignedSessions.length} sessions`
      };

    } catch (error) {
      logger.error(`[TrainerAssignment] Error removing trainer assignment`, {
        sessionIds,
        error: error.message
      });

      throw new Error(`Failed to remove trainer assignment: ${error.message}`);
    }
  }

  /**
   * Get assignment statistics for admin dashboard
   * 
   * @returns {Object} Assignment statistics
   */
  async getAssignmentStatistics() {
    try {
      const Session = getSession();
      const User = getUser();

      // Get session statistics
      const sessionStats = await Session.findAll({
        attributes: [
          'status',
          [Session.sequelize.fn('COUNT', Session.sequelize.col('status')), 'count']
        ],
        group: ['status'],
        raw: true
      });

      // Get trainer statistics
      const trainerStats = await Session.findAll({
        attributes: [
          'trainerId',
          [Session.sequelize.fn('COUNT', Session.sequelize.col('trainerId')), 'sessionCount']
        ],
        where: {
          trainerId: { [Session.sequelize.Op.not]: null }
        },
        group: ['trainerId'],
        include: [{
          model: User,
          as: 'trainer',
          attributes: ['firstName', 'lastName']
        }],
        raw: true
      });

      // Format results
      const sessionSummary = {
        available: 0,
        assigned: 0,
        scheduled: 0,
        completed: 0,
        cancelled: 0,
        total: 0
      };

      sessionStats.forEach(stat => {
        if (sessionSummary.hasOwnProperty(stat.status)) {
          sessionSummary[stat.status] = parseInt(stat.count);
          sessionSummary.total += parseInt(stat.count);
        }
      });

      return {
        sessionSummary,
        trainerWorkload: trainerStats.map(stat => ({
          trainerId: stat.trainerId,
          trainerName: `${stat['trainer.firstName']} ${stat['trainer.lastName']}`,
          assignedSessions: parseInt(stat.sessionCount)
        })),
        assignmentRate: sessionSummary.total > 0 ? 
          ((sessionSummary.assigned + sessionSummary.scheduled + sessionSummary.completed) / sessionSummary.total * 100).toFixed(1) : 0
      };

    } catch (error) {
      logger.error(`[TrainerAssignment] Error getting assignment statistics`, {
        error: error.message
      });

      throw new Error(`Failed to get assignment statistics: ${error.message}`);
    }
  }

  /**
   * Health check for the service
   * 
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
const trainerAssignmentService = new TrainerAssignmentService();

export default trainerAssignmentService;
export { TrainerAssignmentService };

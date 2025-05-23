// backend/controllers/adminClientController.mjs
import User from '../models/User.mjs';
import ClientProgress from '../models/ClientProgress.mjs';
import Session from '../models/Session.mjs';
import WorkoutSession from '../models/WorkoutSession.mjs';
import Order from '../models/Order.mjs';
import { Op } from 'sequelize';
import sequelize from '../database.mjs';
import logger from '../utils/logger.mjs';
import bcrypt from 'bcryptjs';

/**
 * Enhanced Admin Client Controller
 * Provides comprehensive client management functionality for admins
 */
class AdminClientController {
  /**
   * Get all clients with advanced filtering and pagination
   */
  async getClients(req, res) {
    try {
      const { 
        page = 1, 
        limit = 10, 
        search, 
        status, 
        sortBy = 'createdAt',
        sortOrder = 'DESC',
        fitnessGoal,
        trainer
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);
      const whereClause = { role: 'client' };
      
      // Build search conditions
      if (search) {
        whereClause[Op.or] = [
          { firstName: { [Op.iLike]: `%${search}%` } },
          { lastName: { [Op.iLike]: `%${search}%` } },
          { email: { [Op.iLike]: `%${search}%` } },
          { username: { [Op.iLike]: `%${search}%` } }
        ];
      }
      
      if (status) {
        whereClause.isActive = status === 'active';
      }
      
      if (fitnessGoal) {
        whereClause.fitnessGoal = { [Op.iLike]: `%${fitnessGoal}%` };
      }

      // Include related data
      const includeOptions = [
        {
          model: ClientProgress,
          as: 'clientProgress',
          required: false
        },
        {
          model: Session,
          as: 'clientSessions',
          required: false,
          where: { status: { [Op.in]: ['scheduled', 'confirmed'] } },
          separate: true,
          limit: 5
        },
        {
          model: WorkoutSession,
          as: 'workoutSessions',
          required: false,
          where: { status: 'completed' },
          separate: true,
          limit: 5,
          order: [['completedAt', 'DESC']]
        }
      ];

      const { count, rows: clients } = await User.findAndCountAll({
        where: whereClause,
        include: includeOptions,
        limit: parseInt(limit),
        offset,
        order: [[sortBy, sortOrder.toUpperCase()]],
        attributes: { exclude: ['password', 'refreshTokenHash'] }
      });

      // Enrich client data with computed fields
      const enrichedClients = await Promise.all(clients.map(async (client) => {
        const clientData = client.toJSON();
        
        // Calculate additional metrics
        const totalWorkouts = await WorkoutSession.count({
          where: { userId: client.id, status: 'completed' }
        });
        
        const totalOrders = await Order.count({
          where: { userId: client.id }
        });
        
        return {
          ...clientData,
          totalWorkouts,
          totalOrders,
          lastWorkout: clientData.workoutSessions?.[0] || null,
          nextSession: clientData.clientSessions?.[0] || null
        };
      }));

      return res.status(200).json({
        success: true,
        data: {
          clients: enrichedClients,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: count,
            pages: Math.ceil(count / parseInt(limit))
          }
        }
      });
    } catch (error) {
      logger.error('Error fetching clients:', error);
      return res.status(500).json({
        success: false,
        message: 'Error fetching clients',
        error: error.message
      });
    }
  }

  /**
   * Get detailed client information
   */
  async getClientDetails(req, res) {
    try {
      const { clientId } = req.params;

      const client = await User.findOne({
        where: { id: clientId, role: 'client' },
        include: [
          {
            model: ClientProgress,
            as: 'clientProgress'
          },
          {
            model: Session,
            as: 'clientSessions',
            include: [
              {
                model: User,
                as: 'trainer',
                attributes: ['id', 'firstName', 'lastName', 'email']
              }
            ]
          },
          {
            model: WorkoutSession,
            as: 'workoutSessions',
            limit: 10,
            order: [['createdAt', 'DESC']]
          },
          {
            model: Order,
            as: 'orders',
            limit: 10,
            order: [['createdAt', 'DESC']]
          }
        ],
        attributes: { exclude: ['password', 'refreshTokenHash'] }
      });

      if (!client) {
        return res.status(404).json({
          success: false,
          message: 'Client not found'
        });
      }

      // Get additional statistics from MCP servers if available
      let mcpStats = {};
      try {
        // Call workout MCP for additional stats
        const workoutMCPResponse = await fetch(`http://localhost:8000/tools/GetWorkoutStatistics`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: clientId })
        });
        
        if (workoutMCPResponse.ok) {
          const workoutData = await workoutMCPResponse.json();
          mcpStats.workout = workoutData.statistics;
        }
      } catch (mcpError) {
        logger.warn('Could not fetch MCP stats:', mcpError.message);
      }

      return res.status(200).json({
        success: true,
        data: {
          client: client.toJSON(),
          mcpStats
        }
      });
    } catch (error) {
      logger.error('Error fetching client details:', error);
      return res.status(500).json({
        success: false,
        message: 'Error fetching client details',
        error: error.message
      });
    }
  }

  /**
   * Create a new client
   */
  async createClient(req, res) {
    const transaction = await sequelize.transaction();
    
    try {
      const {
        firstName,
        lastName,
        email,
        username,
        password,
        phone,
        dateOfBirth,
        gender,
        weight,
        height,
        fitnessGoal,
        trainingExperience,
        healthConcerns,
        emergencyContact,
        availableSessions = 0,
        trainerId
      } = req.body;

      // Check if email/username already exists
      const existingUser = await User.findOne({
        where: {
          [Op.or]: [{ email }, { username }]
        }
      });

      if (existingUser) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Email or username already exists'
        });
      }

      // Create the client
      const newClient = await User.create({
        firstName,
        lastName,
        email,
        username,
        password,
        phone,
        dateOfBirth,
        gender,
        weight,
        height,
        fitnessGoal,
        trainingExperience,
        healthConcerns,
        emergencyContact,
        availableSessions,
        role: 'client',
        isActive: true
      }, { transaction });

      // Create client progress record
      await ClientProgress.create({
        userId: newClient.id
      }, { transaction });

      // If trainer specified, create initial sessions
      if (trainerId && availableSessions > 0) {
        const sessions = [];
        for (let i = 0; i < availableSessions; i++) {
          sessions.push({
            trainerId,
            userId: newClient.id,
            status: 'available',
            sessionType: 'personal_training'
          });
        }
        await Session.bulkCreate(sessions, { transaction });
      }

      // Initialize gamification in MCP server
      try {
        await fetch(`http://localhost:8001/tools/InitializeClient`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: newClient.id })
        });
      } catch (mcpError) {
        logger.warn('Could not initialize gamification:', mcpError.message);
      }

      await transaction.commit();

      return res.status(201).json({
        success: true,
        message: 'Client created successfully',
        data: {
          client: {
            id: newClient.id,
            firstName: newClient.firstName,
            lastName: newClient.lastName,
            email: newClient.email
          }
        }
      });
    } catch (error) {
      await transaction.rollback();
      logger.error('Error creating client:', error);
      return res.status(500).json({
        success: false,
        message: 'Error creating client',
        error: error.message
      });
    }
  }

  /**
   * Update client information
   */
  async updateClient(req, res) {
    const transaction = await sequelize.transaction();
    
    try {
      const { clientId } = req.params;
      const updates = req.body;

      // Remove sensitive fields that shouldn't be updated this way
      const { password, refreshTokenHash, ...safeUpdates } = updates;

      const client = await User.findOne({
        where: { id: clientId, role: 'client' },
        transaction
      });

      if (!client) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'Client not found'
        });
      }

      // Update client data
      await client.update(safeUpdates, { transaction });

      // Sync updates with MCP servers
      try {
        await fetch(`http://localhost:8000/tools/UpdateClientProfile`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            userId: clientId,
            profile: safeUpdates
          })
        });
      } catch (mcpError) {
        logger.warn('Could not sync with workout MCP:', mcpError.message);
      }

      await transaction.commit();

      return res.status(200).json({
        success: true,
        message: 'Client updated successfully',
        data: {
          client: await client.reload()
        }
      });
    } catch (error) {
      await transaction.rollback();
      logger.error('Error updating client:', error);
      return res.status(500).json({
        success: false,
        message: 'Error updating client',
        error: error.message
      });
    }
  }

  /**
   * Delete (deactivate) a client
   */
  async deleteClient(req, res) {
    const transaction = await sequelize.transaction();
    
    try {
      const { clientId } = req.params;
      const { softDelete = true } = req.body;

      const client = await User.findOne({
        where: { id: clientId, role: 'client' },
        transaction
      });

      if (!client) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'Client not found'
        });
      }

      if (softDelete) {
        // Soft delete - just deactivate
        await client.update({ isActive: false }, { transaction });
      } else {
        // Hard delete - remove completely
        await client.destroy({ transaction });
      }

      await transaction.commit();

      return res.status(200).json({
        success: true,
        message: `Client ${softDelete ? 'deactivated' : 'deleted'} successfully`
      });
    } catch (error) {
      await transaction.rollback();
      logger.error('Error deleting client:', error);
      return res.status(500).json({
        success: false,
        message: 'Error deleting client',
        error: error.message
      });
    }
  }

  /**
   * Reset client password
   */
  async resetClientPassword(req, res) {
    try {
      const { clientId } = req.params;
      const { newPassword } = req.body;

      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 6 characters long'
        });
      }

      const client = await User.findOne({
        where: { id: clientId, role: 'client' }
      });

      if (!client) {
        return res.status(404).json({
          success: false,
          message: 'Client not found'
        });
      }

      // Update password (it will be automatically hashed by the model hook)
      await client.update({ password: newPassword });

      return res.status(200).json({
        success: true,
        message: 'Password reset successfully'
      });
    } catch (error) {
      logger.error('Error resetting password:', error);
      return res.status(500).json({
        success: false,
        message: 'Error resetting password',
        error: error.message
      });
    }
  }

  /**
   * Assign trainer to client
   */
  async assignTrainer(req, res) {
    const transaction = await sequelize.transaction();
    
    try {
      const { clientId } = req.params;
      const { trainerId, sessionCount = 1 } = req.body;

      // Verify client exists
      const client = await User.findOne({
        where: { id: clientId, role: 'client' },
        transaction
      });

      if (!client) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'Client not found'
        });
      }

      // Verify trainer exists
      const trainer = await User.findOne({
        where: { id: trainerId, role: 'trainer' },
        transaction
      });

      if (!trainer) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'Trainer not found'
        });
      }

      // Create sessions for client with trainer
      const sessions = [];
      for (let i = 0; i < sessionCount; i++) {
        sessions.push({
          trainerId,
          userId: clientId,
          status: 'available',
          sessionType: 'personal_training'
        });
      }
      
      await Session.bulkCreate(sessions, { transaction });

      // Update client's available sessions count
      await client.increment('availableSessions', { 
        by: sessionCount,
        transaction 
      });

      await transaction.commit();

      return res.status(200).json({
        success: true,
        message: `Assigned ${sessionCount} sessions with trainer successfully`,
        data: {
          client: {
            id: client.id,
            name: `${client.firstName} ${client.lastName}`
          },
          trainer: {
            id: trainer.id,
            name: `${trainer.firstName} ${trainer.lastName}`
          },
          sessionsCreated: sessionCount
        }
      });
    } catch (error) {
      await transaction.rollback();
      logger.error('Error assigning trainer:', error);
      return res.status(500).json({
        success: false,
        message: 'Error assigning trainer',
        error: error.message
      });
    }
  }

  /**
   * Get client workout statistics using MCP
   */
  async getClientWorkoutStats(req, res) {
    try {
      const { clientId } = req.params;
      const { startDate, endDate } = req.query;

      // Call workout MCP server directly
      const mcpResponse = await fetch(`http://localhost:8000/tools/GetWorkoutStatistics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: clientId,
          startDate,
          endDate,
          includeExerciseBreakdown: true,
          includeMuscleGroupBreakdown: true,
          includeWeekdayBreakdown: true,
          includeIntensityTrends: true
        })
      });

      if (!mcpResponse.ok) {
        throw new Error(`MCP Server responded with ${mcpResponse.status}`);
      }

      const stats = await mcpResponse.json();

      return res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('Error fetching workout stats from MCP:', error);
      return res.status(500).json({
        success: false,
        message: 'Error fetching workout statistics',
        error: error.message
      });
    }
  }

  /**
   * Generate workout plan for client using MCP
   */
  async generateWorkoutPlan(req, res) {
    try {
      const { clientId } = req.params;
      const { 
        trainerId, 
        name, 
        description, 
        goal, 
        daysPerWeek = 3,
        difficulty = 'intermediate',
        focusAreas = []
      } = req.body;

      // Call workout MCP server to generate plan
      const mcpResponse = await fetch(`http://localhost:8000/tools/GenerateWorkoutPlan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trainerId,
          clientId,
          name,
          description,
          goal,
          daysPerWeek,
          difficulty,
          focusAreas
        })
      });

      if (!mcpResponse.ok) {
        throw new Error(`MCP Server responded with ${mcpResponse.status}`);
      }

      const planData = await mcpResponse.json();

      return res.status(200).json({
        success: true,
        message: 'Workout plan generated successfully',
        data: planData
      });
    } catch (error) {
      logger.error('Error generating workout plan:', error);
      return res.status(500).json({
        success: false,
        message: 'Error generating workout plan',
        error: error.message
      });
    }
  }

  /**
   * Get MCP server health status
   */
  async getMCPStatus(req, res) {
    try {
      const mcpServers = [
        { name: 'Workout MCP', url: 'http://localhost:8000' },
        { name: 'Gamification MCP', url: 'http://localhost:8001' },
        { name: 'YOLO MCP', url: 'http://localhost:8002' },
        { name: 'Social Media MCP', url: 'http://localhost:8003' },
        { name: 'Food Scanner MCP', url: 'http://localhost:8004' },
        { name: 'Video Processing MCP', url: 'http://localhost:8005' }
      ];

      const statusPromises = mcpServers.map(async (server) => {
        try {
          const response = await fetch(`${server.url}/`, { timeout: 5000 });
          return {
            ...server,
            status: response.ok ? 'online' : 'error',
            lastChecked: new Date()
          };
        } catch (error) {
          return {
            ...server,
            status: 'offline',
            error: error.message,
            lastChecked: new Date()
          };
        }
      });

      const statuses = await Promise.all(statusPromises);

      return res.status(200).json({
        success: true,
        data: {
          servers: statuses,
          summary: {
            online: statuses.filter(s => s.status === 'online').length,
            offline: statuses.filter(s => s.status === 'offline').length,
            error: statuses.filter(s => s.status === 'error').length
          }
        }
      });
    } catch (error) {
      logger.error('Error checking MCP status:', error);
      return res.status(500).json({
        success: false,
        message: 'Error checking MCP server status',
        error: error.message
      });
    }
  }
}

export default new AdminClientController();

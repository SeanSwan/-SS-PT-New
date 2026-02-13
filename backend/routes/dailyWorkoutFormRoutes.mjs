/**
 * Daily Workout Form Routes
 * ========================
 * 
 * Manages comprehensive NASM workout form submissions with MCP integration.
 * Handles workout logging, session deduction, and gamification processing.
 * 
 * Core Features:
 * - Submit and retrieve daily workout forms
 * - Session deduction with transactional safety
 * - MCP server integration for gamification and progress tracking
 * - Comprehensive workout analytics and reporting
 * - Progress visualization data endpoints
 * 
 * Part of the NASM Workout Tracking System - Phase 2.2: API Layer
 * Designed for SwanStudios Platform - Production Ready
 */

import express from 'express';
import { protect, trainerOrAdminOnly, adminOnly } from '../middleware/authMiddleware.mjs';
import { 
  getDailyWorkoutForm, 
  getUser, 
  getWorkoutSession, 
  getClientTrainerAssignment,
  getTrainerPermissions 
} from '../models/index.mjs';
import { PERMISSION_TYPES } from '../models/TrainerPermissions.mjs';
import sequelize from '../database.mjs';
import logger from '../utils/logger.mjs';
import { Op } from 'sequelize';

const router = express.Router();

/**
 * @route   GET /api/workout-forms/client/:clientId/info
 * @desc    Get client information for workout logging
 * @access  Trainer (with edit_workouts permission) or Admin
 */
router.get('/client/:clientId/info', protect, trainerOrAdminOnly, async (req, res) => {
  try {
    const { clientId } = req.params;
    const trainerId = req.user.id;
    const userRole = req.user.role;

    // Validate client ID
    if (!clientId || isNaN(parseInt(clientId))) {
      return res.status(400).json({
        success: false,
        message: 'Valid client ID is required'
      });
    }

    const User = getUser();
    const ClientTrainerAssignment = getClientTrainerAssignment();

    // Get client information
    const client = await User.findOne({
      where: {
        id: parseInt(clientId),
        role: 'client'
      },
      attributes: [
        'id',
        'firstName', 
        'lastName',
        'email',
        'phone',
        'availableSessions',
        'createdAt'
      ]
    });

    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    // Check trainer-client assignment (skip for admins)
    if (userRole === 'trainer') {
      const assignment = await ClientTrainerAssignment.findOne({
        where: {
          clientId: parseInt(clientId),
          trainerId: trainerId,
          status: 'active'
        }
      });

      if (!assignment) {
        return res.status(403).json({
          success: false,
          message: 'You are not assigned to this client'
        });
      }

      // Check edit_workouts permission
      const hasPermission = await checkTrainerPermission(trainerId, PERMISSION_TYPES.EDIT_WORKOUTS);
      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to edit workouts for this client'
        });
      }
    }

    // Get recent workout count for context
    const DailyWorkoutForm = getDailyWorkoutForm();
    const recentWorkoutCount = await DailyWorkoutForm.count({
      where: {
        clientId: parseInt(clientId),
        date: {
          [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      }
    });

    // Check if client already has a workout logged today
    const today = new Date().toISOString().split('T')[0];
    const todayWorkout = await DailyWorkoutForm.findOne({
      where: {
        clientId: parseInt(clientId),
        date: today
      }
    });

    const clientInfo = {
      id: client.id,
      firstName: client.firstName,
      lastName: client.lastName,
      email: client.email,
      phone: client.phone,
      availableSessions: client.availableSessions || 0,
      memberSince: client.createdAt,
      recentWorkoutCount,
      hasWorkoutToday: !!todayWorkout,
      todayWorkoutId: todayWorkout?.id || null
    };

    logger.info(`Client info loaded for workout logging: ${client.firstName} ${client.lastName} (${client.id})`);

    res.json({
      success: true,
      client: clientInfo
    });

  } catch (error) {
    logger.error('Error fetching client info for workout logging:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load client information',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Helper function to check trainer permissions
 */
const checkTrainerPermission = async (trainerId, permissionType) => {
  try {
    const TrainerPermissions = getTrainerPermissions();
    
    const permission = await TrainerPermissions.findOne({
      where: {
        trainerId,
        permissionType,
        isActive: true,
        [Op.or]: [
          { expiresAt: null },
          { expiresAt: { [Op.gt]: new Date() } }
        ]
      }
    });

    return !!permission;
  } catch (error) {
    logger.error('Error checking trainer permission:', error);
    return false;
  }
};

/**
 * Helper function to process MCP integration asynchronously
 */
const processMCPIntegration = async (formId, formData) => {
  try {
    logger.info(`Starting MCP processing for form ${formId}`);

    // Prepare MCP payload
    const mcpPayload = {
      formId,
      clientId: formData.clientId,
      trainerId: formData.trainerId,
      date: formData.date,
      exercises: formData.formData.exercises,
      sessionNotes: formData.formData.sessionNotes,
      overallIntensity: formData.formData.overallIntensity,
      submittedAt: formData.submittedAt
    };

    // Send to Gamification MCP Server
    let pointsEarned = 0;
    let mcpErrors = [];

    try {
      const gamificationUrl = process.env.GAMIFICATION_MCP_URL || 'http://localhost:8002';
      const gamificationResponse = await fetch(`${gamificationUrl}/tools/ProcessWorkoutForm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mcpPayload),
        timeout: 30000 // 30 second timeout
      });

      if (gamificationResponse.ok) {
        const gamificationResult = await gamificationResponse.json();
        pointsEarned = gamificationResult.pointsEarned || 0;
        logger.info(`Gamification MCP processing successful: ${pointsEarned} points earned`);
      } else {
        const errorText = await gamificationResponse.text();
        mcpErrors.push(`Gamification MCP error: ${errorText}`);
        logger.warn(`Gamification MCP error: ${errorText}`);
      }
    } catch (gamificationError) {
      mcpErrors.push(`Gamification MCP connection error: ${gamificationError.message}`);
      logger.warn(`Gamification MCP connection error:`, gamificationError);
    }

    // Send to Workout MCP Server for progress updates
    try {
      const workoutUrl = process.env.WORKOUT_MCP_URL || 'http://localhost:8000';
      const workoutResponse = await fetch(`${workoutUrl}/tools/UpdateClientProgress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mcpPayload),
        timeout: 30000 // 30 second timeout
      });

      if (workoutResponse.ok) {
        logger.info(`Workout MCP processing successful for form ${formId}`);
      } else {
        const errorText = await workoutResponse.text();
        mcpErrors.push(`Workout MCP error: ${errorText}`);
        logger.warn(`Workout MCP error: ${errorText}`);
      }
    } catch (workoutError) {
      mcpErrors.push(`Workout MCP connection error: ${workoutError.message}`);
      logger.warn(`Workout MCP connection error:`, workoutError);
    }

    // Update form with MCP results
    const DailyWorkoutForm = getDailyWorkoutForm();
    await DailyWorkoutForm.update({
      totalPointsEarned: pointsEarned,
      mcpProcessed: true,
      mcpProcessedAt: new Date(),
      processingErrors: mcpErrors.length > 0 ? { errors: mcpErrors } : null
    }, {
      where: { id: formId }
    });

    logger.info(`MCP processing completed for form ${formId}`, {
      pointsEarned,
      errorsCount: mcpErrors.length
    });

  } catch (error) {
    logger.error(`MCP processing failed for form ${formId}:`, error);
    
    // Update form with error status
    try {
      const DailyWorkoutForm = getDailyWorkoutForm();
      await DailyWorkoutForm.update({
        mcpProcessed: true,
        mcpProcessedAt: new Date(),
        processingErrors: { 
          errors: [`Processing failed: ${error.message}`],
          timestamp: new Date().toISOString()
        }
      }, {
        where: { id: formId }
      });
    } catch (updateError) {
      logger.error(`Failed to update form ${formId} with error status:`, updateError);
    }
  }
};

/**
 * @route   POST /api/workout-forms
 * @desc    Submit a daily workout form
 * @access  Trainer (with edit_workouts permission) or Admin
 * @body    { clientId, date, exercises, sessionNotes?, overallIntensity? }
 */
router.post('/', protect, trainerOrAdminOnly, async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { clientId, date, exercises, sessionNotes, overallIntensity } = req.body;
    const trainerId = req.user.id;
    const userRole = req.user.role;

    // Validate required fields
    if (!clientId || !date || !exercises || !Array.isArray(exercises) || exercises.length === 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Client ID, date, and exercises array are required'
      });
    }

    // Check trainer permissions (skip for admins)
    if (userRole === 'trainer') {
      const hasPermission = await checkTrainerPermission(trainerId, PERMISSION_TYPES.EDIT_WORKOUTS);
      if (!hasPermission) {
        await transaction.rollback();
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to edit workouts'
        });
      }

      // Verify trainer is assigned to this client
      const ClientTrainerAssignment = getClientTrainerAssignment();
      const assignment = await ClientTrainerAssignment.findOne({
        where: {
          clientId: parseInt(clientId),
          trainerId,
          status: 'active'
        },
        transaction
      });

      if (!assignment) {
        await transaction.rollback();
        return res.status(403).json({
          success: false,
          message: 'You are not assigned to this client'
        });
      }
    }

    // Validate client exists and has available sessions
    const User = getUser();
    const client = await User.findByPk(clientId, { transaction });
    if (!client) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    if (client.availableSessions <= 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Client has no available sessions remaining'
      });
    }

    // Validate date is not in the future
    const workoutDate = new Date(date);
    const today = new Date();
    today.setHours(23, 59, 59, 999); // Allow today
    
    if (workoutDate > today) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Workout date cannot be in the future'
      });
    }

    // Check if a workout form already exists for this client on this date
    const DailyWorkoutForm = getDailyWorkoutForm();
    const existingForm = await DailyWorkoutForm.findOne({
      where: {
        clientId: parseInt(clientId),
        date: date
      },
      transaction
    });

    if (existingForm) {
      await transaction.rollback();
      return res.status(409).json({
        success: false,
        message: 'A workout form already exists for this client on this date'
      });
    }

    // Calculate workout statistics
    const totalSets = exercises.reduce((sum, ex) => sum + (ex.sets ? ex.sets.length : 0), 0);
    const estimatedDuration = Math.min(totalSets * 3, 120); // 3 minutes per set, cap at 2 hours

    // Create or update workout session
    const WorkoutSession = getWorkoutSession();
    const [workoutSession] = await WorkoutSession.findOrCreate({
      where: { 
        userId: clientId, 
        date: date
      },
      defaults: {
        id: require('crypto').randomUUID(),
        userId: clientId,
        title: `Personal Training Session - ${date}`,
        date: date,
        duration: estimatedDuration,
        intensity: overallIntensity || 5,
        notes: sessionNotes || '',
        status: 'completed',
        completedAt: new Date()
      },
      transaction
    });

    // Create daily workout form
    const formData = {
      exercises,
      sessionNotes: sessionNotes || '',
      overallIntensity: overallIntensity || 5,
      submittedBy: trainerId,
      submittedAt: new Date(),
      totalSets,
      estimatedDuration
    };

    const dailyForm = await DailyWorkoutForm.create({
      sessionId: workoutSession.id,
      clientId: parseInt(clientId),
      trainerId,
      date,
      formData,
      sessionDeducted: false,
      mcpProcessed: false
    }, { transaction });

    // Deduct session from client's available sessions
    await client.decrement('availableSessions', { by: 1, transaction });
    await dailyForm.update({ sessionDeducted: true }, { transaction });

    await transaction.commit();

    // Process with MCP servers asynchronously (don't block response)
    setImmediate(() => {
      processMCPIntegration(dailyForm.id, {
        clientId,
        trainerId,
        date,
        formData,
        submittedAt: dailyForm.submittedAt
      });
    });

    logger.info(`Workout form submitted successfully`, {
      formId: dailyForm.id,
      clientId,
      trainerId,
      date,
      totalSets,
      sessionDeducted: true
    });

    res.status(201).json({
      success: true,
      form: {
        id: dailyForm.id,
        clientId,
        trainerId,
        date,
        totalSets,
        estimatedDuration,
        sessionDeducted: true,
        submittedAt: dailyForm.submittedAt
      },
      message: 'Workout logged successfully and session deducted'
    });

  } catch (error) {
    await transaction.rollback();
    logger.error('Error submitting workout form:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit workout form',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   GET /api/workout-forms
 * @desc    Get workout forms with filtering and pagination
 * @access  Trainer (own forms) or Admin (all forms)
 * @query   ?clientId=123&trainerId=456&startDate=2025-01-01&endDate=2025-01-31&page=1&limit=20
 */
router.get('/', protect, trainerOrAdminOnly, async (req, res) => {
  try {
    const { 
      clientId, 
      trainerId, 
      startDate, 
      endDate, 
      page = 1, 
      limit = 20,
      mcpProcessed 
    } = req.query;

    const requestingUserId = req.user.id;
    const requestingUserRole = req.user.role;

    // Build query conditions
    const whereConditions = {};

    if (clientId) {
      whereConditions.clientId = parseInt(clientId);
    }

    if (trainerId) {
      whereConditions.trainerId = parseInt(trainerId);
    } else if (requestingUserRole === 'trainer') {
      // Trainers can only see their own forms
      whereConditions.trainerId = requestingUserId;
    }

    if (startDate && endDate) {
      whereConditions.date = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    } else if (startDate) {
      whereConditions.date = {
        [Op.gte]: new Date(startDate)
      };
    } else if (endDate) {
      whereConditions.date = {
        [Op.lte]: new Date(endDate)
      };
    }

    if (mcpProcessed !== undefined) {
      whereConditions.mcpProcessed = mcpProcessed === 'true';
    }

    // Calculate pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const DailyWorkoutForm = getDailyWorkoutForm();
    const User = getUser();

    const { count, rows: forms } = await DailyWorkoutForm.findAndCountAll({
      where: whereConditions,
      include: [
        { 
          model: User, 
          as: 'client', 
          attributes: ['id', 'firstName', 'lastName', 'email'] 
        },
        { 
          model: User, 
          as: 'trainer', 
          attributes: ['id', 'firstName', 'lastName', 'email'] 
        }
      ],
      order: [['submittedAt', 'DESC']],
      limit: parseInt(limit),
      offset: offset
    });

    const totalPages = Math.ceil(count / parseInt(limit));

    logger.info(`Retrieved ${forms.length} workout forms`, {
      requestingUserId,
      filters: { clientId, trainerId, startDate, endDate },
      pagination: { page, limit, totalPages }
    });

    res.json({
      success: true,
      forms,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalCount: count,
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1
      }
    });

  } catch (error) {
    logger.error('Error fetching workout forms:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch workout forms',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   GET /api/workout-forms/:id
 * @desc    Get a specific workout form by ID
 * @access  Trainer (own forms) or Admin (all forms)
 */
router.get('/:id', protect, trainerOrAdminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const requestingUserId = req.user.id;
    const requestingUserRole = req.user.role;

    const DailyWorkoutForm = getDailyWorkoutForm();
    const User = getUser();

    let whereCondition = { id };
    
    // Trainers can only access their own forms
    if (requestingUserRole === 'trainer') {
      whereCondition.trainerId = requestingUserId;
    }

    const form = await DailyWorkoutForm.findOne({
      where: whereCondition,
      include: [
        { 
          model: User, 
          as: 'client', 
          attributes: ['id', 'firstName', 'lastName', 'email'] 
        },
        { 
          model: User, 
          as: 'trainer', 
          attributes: ['id', 'firstName', 'lastName', 'email'] 
        }
      ]
    });

    if (!form) {
      return res.status(404).json({
        success: false,
        message: 'Workout form not found'
      });
    }

    // Calculate additional statistics
    const formStats = {
      totalSets: form.getTotalSets(),
      totalVolume: form.getTotalVolume(),
      averageRPE: form.getAverageRPE(),
      estimatedDuration: form.getEstimatedDuration(),
      exerciseCount: form.getExerciseCount()
    };

    logger.info(`Retrieved workout form ${id}`, {
      requestingUserId,
      clientId: form.clientId,
      trainerId: form.trainerId
    });

    res.json({
      success: true,
      form,
      stats: formStats
    });

  } catch (error) {
    logger.error('Error fetching workout form:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch workout form',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   GET /api/workout-forms/client/:clientId/progress
 * @desc    Get NASM progress data for client charts
 * @access  Trainer (assigned clients) or Admin (all clients)
 * @query   ?timeRange=3months&startDate=2025-01-01&endDate=2025-01-31
 */
router.get('/client/:clientId/progress', protect, trainerOrAdminOnly, async (req, res) => {
  try {
    const { clientId } = req.params;
    const { timeRange = '3months', startDate, endDate } = req.query;
    const requestingUserId = req.user.id;
    const requestingUserRole = req.user.role;

    // Check access permissions
    if (requestingUserRole === 'trainer') {
      const ClientTrainerAssignment = getClientTrainerAssignment();
      const assignment = await ClientTrainerAssignment.findOne({
        where: {
          clientId: parseInt(clientId),
          trainerId: requestingUserId,
          status: 'active'
        }
      });

      if (!assignment) {
        return res.status(403).json({
          success: false,
          message: 'You are not assigned to this client'
        });
      }
    }

    // Calculate date range
    let dateRange = {};
    if (startDate && endDate) {
      dateRange = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    } else {
      const now = new Date();
      let startDateCalc;
      
      switch (timeRange) {
        case '1month':
          startDateCalc = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
          break;
        case '6months':
          startDateCalc = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
          break;
        case '1year':
          startDateCalc = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
          break;
        case '3months':
        default:
          startDateCalc = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
          break;
      }
      
      dateRange = {
        [Op.gte]: startDateCalc
      };
    }

    const DailyWorkoutForm = getDailyWorkoutForm();

    const forms = await DailyWorkoutForm.findAll({
      where: {
        clientId: parseInt(clientId),
        date: dateRange,
        mcpProcessed: true
      },
      order: [['date', 'ASC']]
    });

    // Process data for charts
    const workoutHistory = forms.map(form => ({
      date: form.date,
      duration: form.getEstimatedDuration(),
      intensity: form.formData.overallIntensity || 5,
      totalVolume: form.getTotalVolume(),
      exerciseCount: form.getExerciseCount(),
      pointsEarned: form.totalPointsEarned
    }));

    const formTrends = forms.map(form => ({
      date: form.date,
      averageFormRating: form.formData.exercises.reduce((sum, ex) => sum + (ex.formRating || 3), 0) / form.formData.exercises.length,
      exerciseCount: form.getExerciseCount()
    }));

    const volumeProgression = forms.map(form => ({
      date: form.date,
      totalWeight: form.getTotalVolume(),
      totalReps: form.formData.exercises.reduce((sum, ex) => {
        return sum + (ex.sets ? ex.sets.reduce((setSum, set) => setSum + (parseInt(set.reps) || 0), 0) : 0);
      }, 0),
      totalSets: form.getTotalSets()
    }));

    // Mock NASM categories (this would be enhanced with actual NASM data)
    const categories = [
      { category: 'Core Stability', level: 750, maxLevel: 1000, percentComplete: 75 },
      { category: 'Balance', level: 600, maxLevel: 1000, percentComplete: 60 },
      { category: 'Strength', level: 800, maxLevel: 1000, percentComplete: 80 },
      { category: 'Power', level: 400, maxLevel: 1000, percentComplete: 40 },
      { category: 'Agility', level: 550, maxLevel: 1000, percentComplete: 55 }
    ];

    const progressData = {
      categories,
      workoutHistory,
      formTrends,
      volumeProgression
    };

    logger.info(`Retrieved progress data for client ${clientId}`, {
      requestingUserId,
      timeRange,
      totalForms: forms.length
    });

    res.json({
      success: true,
      progressData,
      totalWorkouts: forms.length,
      dateRange: { startDate: startDate || dateRange[Op.gte], endDate: endDate || new Date() }
    });

  } catch (error) {
    logger.error('Error fetching progress data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch progress data',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   POST /api/workout-forms/:id/reprocess
 * @desc    Reprocess a workout form through MCP servers
 * @access  Admin Only
 */
router.post('/:id/reprocess', protect, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;

    const DailyWorkoutForm = getDailyWorkoutForm();
    const form = await DailyWorkoutForm.findByPk(id);

    if (!form) {
      return res.status(404).json({
        success: false,
        message: 'Workout form not found'
      });
    }

    // Reset MCP processing status
    await form.update({
      mcpProcessed: false,
      mcpProcessedAt: null,
      totalPointsEarned: 0,
      processingErrors: null
    });

    // Reprocess with MCP servers
    setImmediate(() => {
      processMCPIntegration(form.id, {
        clientId: form.clientId,
        trainerId: form.trainerId,
        date: form.date,
        formData: form.formData,
        submittedAt: form.submittedAt
      });
    });

    logger.info(`Admin ${req.user.id} initiated reprocessing for form ${id}`);

    res.json({
      success: true,
      message: 'Form queued for reprocessing'
    });

  } catch (error) {
    logger.error('Error reprocessing workout form:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reprocess workout form',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   GET /api/workout-forms/stats/overview
 * @desc    Get workout form statistics for admin dashboard
 * @access  Admin Only
 */
router.get('/stats/overview', protect, adminOnly, async (req, res) => {
  try {
    const DailyWorkoutForm = getDailyWorkoutForm();

    const [
      totalForms,
      formsToday,
      formsThisWeek,
      formsThisMonth,
      processedForms,
      pendingForms,
      averagePointsPerWorkout
    ] = await Promise.all([
      DailyWorkoutForm.count(),
      DailyWorkoutForm.count({ 
        where: { 
          date: new Date().toISOString().split('T')[0] 
        } 
      }),
      DailyWorkoutForm.count({ 
        where: { 
          date: { 
            [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) 
          } 
        } 
      }),
      DailyWorkoutForm.count({ 
        where: { 
          date: { 
            [Op.gte]: new Date(new Date().getFullYear(), new Date().getMonth(), 1) 
          } 
        } 
      }),
      DailyWorkoutForm.count({ where: { mcpProcessed: true } }),
      DailyWorkoutForm.count({ where: { mcpProcessed: false } }),
      DailyWorkoutForm.findAll({ 
        where: { mcpProcessed: true },
        attributes: ['totalPointsEarned']
      }).then(forms => {
        const totalPoints = forms.reduce((sum, form) => sum + form.totalPointsEarned, 0);
        return forms.length > 0 ? (totalPoints / forms.length).toFixed(1) : 0;
      })
    ]);

    const stats = {
      totalForms,
      formsToday,
      formsThisWeek,
      formsThisMonth,
      processedForms,
      pendingForms,
      processingRate: totalForms > 0 ? ((processedForms / totalForms) * 100).toFixed(1) : 0,
      averagePointsPerWorkout
    };

    logger.info('Retrieved workout form overview statistics', {
      userId: req.user.id,
      stats
    });

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    logger.error('Error fetching workout form statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch workout form statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   GET /api/workout-forms/:id/summary
 * @desc    Generate client-friendly workout summary from form data
 * @access  Trainer or Admin
 */
router.get('/:id/summary', protect, trainerOrAdminOnly, async (req, res) => {
  try {
    const DailyWorkoutForm = getDailyWorkoutForm();

    const form = await DailyWorkoutForm.findByPk(req.params.id);

    if (!form) {
      return res.status(404).json({
        success: false,
        message: 'Workout form not found'
      });
    }

    const { formData, trainerNotes, clientSummary, date } = form;

    // If a manual client summary exists, return it
    if (clientSummary) {
      return res.status(200).json({
        success: true,
        data: {
          formId: form.id,
          date,
          summary: clientSummary,
          trainerNotes: trainerNotes || null,
          source: 'manual'
        }
      });
    }

    // Auto-generate summary from formData
    const exercises = formData?.exercises || [];
    const totalSets = exercises.reduce((sum, ex) => sum + (ex.sets?.length || 0), 0);
    const totalVolume = exercises.reduce((sum, ex) => {
      return sum + (ex.sets || []).reduce((s, set) => s + ((set.weight || 0) * (set.reps || 0)), 0);
    }, 0);
    const avgRpe = exercises.reduce((sum, ex) => {
      const rpes = (ex.sets || []).filter(s => s.rpe).map(s => s.rpe);
      return sum + rpes.reduce((a, b) => a + b, 0) / Math.max(rpes.length, 1);
    }, 0) / Math.max(exercises.length, 1);

    const exerciseLines = exercises.map(ex => {
      const sets = ex.sets?.length || 0;
      return `- ${ex.exerciseName || 'Exercise'}: ${sets} set${sets !== 1 ? 's' : ''}`;
    });

    const generatedSummary = [
      `Workout on ${new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}`,
      ``,
      `Exercises (${exercises.length}):`,
      ...exerciseLines,
      ``,
      `Total: ${totalSets} sets, ${Math.round(totalVolume).toLocaleString()} lbs volume`,
      avgRpe > 0 ? `Average intensity (RPE): ${avgRpe.toFixed(1)}/10` : null,
      trainerNotes ? `\nTrainer Notes: ${trainerNotes}` : null,
    ].filter(Boolean).join('\n');

    return res.status(200).json({
      success: true,
      data: {
        formId: form.id,
        date,
        summary: generatedSummary,
        trainerNotes: trainerNotes || null,
        stats: {
          exerciseCount: exercises.length,
          totalSets,
          totalVolume: Math.round(totalVolume),
          avgRpe: Math.round(avgRpe * 10) / 10
        },
        source: 'auto-generated'
      }
    });
  } catch (error) {
    logger.error('Error generating workout summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate workout summary'
    });
  }
});

export default router;
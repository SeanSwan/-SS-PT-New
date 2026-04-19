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
import { randomUUID } from 'node:crypto';
import { protect, trainerOrAdminOnly, adminOnly, checkTrainerClientRelationship } from '../middleware/authMiddleware.mjs';
import {
  getDailyWorkoutForm,
  getUser,
  getWorkoutSession,
  getClientTrainerAssignment,
  getTrainerPermissions,
  getBodyMeasurement
} from '../models/index.mjs';
import { PERMISSION_TYPES } from '../models/TrainerPermissions.mjs';
import sequelize from '../database.mjs';
import logger from '../utils/logger.mjs';
import { Op } from 'sequelize';
import { awardWorkoutXP } from '../services/awardWorkoutXP.mjs';

const router = express.Router();

/**
 * @route   GET /api/workout-forms/my/info
 * @desc    Get own information for self-service workout logging (client)
 * @access  Any authenticated user
 */
router.get('/my/info', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const User = getUser();
    const DailyWorkoutForm = getDailyWorkoutForm();

    const client = await User.findOne({
      where: { id: userId },
      attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'availableSessions', 'createdAt']
    });

    if (!client) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    let recentWorkoutCount = 0;
    let todayWorkout = null;
    const today = new Date().toISOString().split('T')[0];

    if (DailyWorkoutForm) {
      try {
        recentWorkoutCount = await DailyWorkoutForm.count({
          where: { clientId: userId, date: { [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }
        });
        todayWorkout = await DailyWorkoutForm.findOne({ where: { clientId: userId, date: today } });
      } catch (formErr) {
        logger.warn('DailyWorkoutForm query failed:', formErr.message);
      }
    }

    res.json({
      success: true,
      client: {
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
      }
    });
  } catch (error) {
    logger.error('Error fetching own info for workout logging:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

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

    // Get client information (allow any role — admin may test with own account)
    const client = await User.findOne({
      where: {
        id: parseInt(clientId)
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
    let recentWorkoutCount = 0;
    if (DailyWorkoutForm) {
      try {
        recentWorkoutCount = await DailyWorkoutForm.count({
          where: {
            clientId: parseInt(clientId),
            date: {
              [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
            }
          }
        });
      } catch (formErr) {
        logger.warn('DailyWorkoutForm count failed (table may not exist yet):', formErr.message);
      }
    }

    // Check if client already has a workout logged today
    const today = new Date().toISOString().split('T')[0];
    let todayWorkout = null;
    if (DailyWorkoutForm) {
      try {
        todayWorkout = await DailyWorkoutForm.findOne({
          where: {
            clientId: parseInt(clientId),
            date: today
          }
        });
      } catch (formErr) {
        logger.warn('DailyWorkoutForm findOne failed (table may not exist yet):', formErr.message);
      }
    }

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
 * Gated behind ENABLE_MCP_PROCESSING env var (disabled by default)
 */
const processMCPIntegration = async (formId, formData) => {
  if (process.env.ENABLE_MCP_PROCESSING !== 'true') {
    logger.info(`[MCP] Skipping MCP processing for form ${formId} (MCP disabled)`);
    // Mark as processed with zero points to prevent reprocess queue buildup
    try {
      const DailyWorkoutForm = getDailyWorkoutForm();
      await DailyWorkoutForm.update({
        mcpProcessed: true,
        mcpProcessedAt: new Date(),
        totalPointsEarned: 0,
        processingErrors: null
      }, { where: { id: formId } });
    } catch (err) {
      logger.warn(`[MCP] Failed to mark form ${formId} as processed: ${err.message}`);
    }
    return;
  }

  // MCP processing code preserved for future re-enablement
  try {
    logger.info(`Starting MCP processing for form ${formId}`);

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

    let pointsEarned = 0;
    let mcpErrors = [];

    try {
      const gamificationUrl = process.env.GAMIFICATION_MCP_URL || 'http://localhost:8002';
      const gamificationResponse = await fetch(`${gamificationUrl}/tools/ProcessWorkoutForm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mcpPayload),
        timeout: 30000
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

    try {
      const workoutUrl = process.env.WORKOUT_MCP_URL || 'http://localhost:8000';
      const workoutResponse = await fetch(`${workoutUrl}/tools/UpdateClientProgress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mcpPayload),
        timeout: 30000
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
 * @access  Trainer (with edit_workouts permission), Admin, or Client (self only)
 * @body    { clientId, date, exercises, sessionNotes?, overallIntensity? }
 *
 * 2026-04-18 (Codex round 4 fix): removed `trainerOrAdminOnly` from the
 * middleware chain. The docstring above has always claimed client
 * self-log is allowed, and the handler body enforces it at lines 398-405
 * (client can only submit for themselves). But the previous middleware
 * chain included `trainerOrAdminOnly`, which 403'd clients BEFORE the
 * handler's self-check could run. The client self-log route at
 * `/dashboard/client/log-workout` hit this 403 on every save attempt.
 *
 * `checkTrainerClientRelationship` is role-aware
 * (authMiddleware.mjs:614+): admins pass, clients accessing their own
 * id pass, trainers must have an active ClientTrainerAssignment. That
 * middleware is correct as-is. The handler also runs the trainer
 * edit_workouts permission check inline (lines 408-416) so nothing is
 * lost by dropping the outer role gate.
 */
router.post('/', protect, checkTrainerClientRelationship, async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { clientId, date, exercises, sessionNotes, overallIntensity } = req.body;
    // 2026-04-18 Phase 16.2 round 5 fix — req.user.id is stored as a string
    // by `protect` (authMiddleware.mjs:359). Callers here need a number for
    // comparison against parseInt(clientId) and for Sequelize trainerId
    // lookups against an INT column. Coerce once at the top of the handler.
    const userNumericId = parseInt(req.user.id, 10);
    const trainerId = userNumericId;
    const userRole = req.user.role;

    // Validate required fields
    if (!clientId || !date || !exercises || !Array.isArray(exercises) || exercises.length === 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Client ID, date, and exercises array are required'
      });
    }

    // Client can only submit for themselves
    if (userRole === 'client' && parseInt(clientId, 10) !== userNumericId) {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: 'Clients can only log their own workouts'
      });
    }

    // Check trainer permissions (skip for admins and clients logging their own)
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
          clientId: parseInt(clientId, 10),
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

    // 2026-04-18 Phase 16.2 round 9 — derive the DailyWorkoutForm's
    // trainerId separately from the acting user. `trainerId` above is the
    // ACTOR (the authenticated user who submitted the request). For client
    // self-log, the actor IS the client, but the DailyWorkoutForm's
    // `trainer_id` column cannot be the client's own id — the model's
    // `clientTrainerDifferent` validator (DailyWorkoutForm.mjs:349-353)
    // rejects any row with `clientId === trainerId`. The column is also
    // `allowNull: false` with an FK to users(id), so we can't just set
    // null without a migration.
    //
    // Resolution order for client self-log:
    //   1. Use the client's active `ClientTrainerAssignment.trainerId` —
    //      semantically the trainer who oversees this client's program.
    //   2. Fall back to the lowest-id admin user — represents "no assigned
    //      trainer, platform-supervised workout" (typical for Move Fitness
    //      onboarding or unclaimed clients).
    //   3. If neither exists (no admin seeded), refuse the save with 500.
    //
    // Trainer/admin path: actor and form's trainerId are the same user.
    let attributedTrainerId = trainerId;
    if (userRole === 'client') {
      const ClientTrainerAssignment = getClientTrainerAssignment();
      const assignment = await ClientTrainerAssignment.findOne({
        where: {
          clientId: parseInt(clientId, 10),
          status: 'active',
        },
        transaction,
      });
      if (assignment?.trainerId && assignment.trainerId !== userNumericId) {
        attributedTrainerId = assignment.trainerId;
      } else {
        const fallbackAdmin = await User.findOne({
          where: { role: 'admin' },
          order: [['id', 'ASC']],
          transaction,
        });
        if (!fallbackAdmin || fallbackAdmin.id === userNumericId) {
          await transaction.rollback();
          return res.status(500).json({
            success: false,
            message: 'Unable to attribute workout — no valid trainer or admin available'
          });
        }
        attributedTrainerId = fallbackAdmin.id;
      }
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
        // 2026-04-18 Phase 16.2 round 8 fix — was `require('crypto').randomUUID()`
        // inside an .mjs module, which threw `require is not defined` at
        // runtime on the canonical save path. Switched to the ESM `node:crypto`
        // import at the top of this file. Same UUID v4 primitive, correct
        // module system.
        id: randomUUID(),
        userId: clientId,
        title: `Personal Training Session - ${date}`,
        date: date,
        duration: estimatedDuration,
        // Phase 16 (2026-04-16): honor null when the logger did not record
        // an intensity rating. The previous `|| 5` fallback seeded a
        // phantom 5/10 into the canonical chart on every untouched save.
        // Accepts both `undefined` (key omitted from payload — the wire
        // contract) and explicit `null`.
        intensity: (overallIntensity === undefined || overallIntensity === null)
          ? null
          : overallIntensity,
        notes: sessionNotes || '',
        status: 'completed',
        completedAt: new Date()
      },
      transaction
    });

    // Create daily workout form.
    //
    // Phase 16: when the client logger did not record an overall intensity
    // rating, omit the key from formData rather than stamping 5. Legacy
    // daily-form readers treat missing `overallIntensity` as "not rated"
    // (null-guards added in this phase).
    const formData = {
      exercises,
      sessionNotes: sessionNotes || '',
      submittedBy: trainerId,
      submittedAt: new Date(),
      totalSets,
      estimatedDuration
    };
    if (overallIntensity !== undefined && overallIntensity !== null) {
      formData.overallIntensity = overallIntensity;
    }

    const dailyForm = await DailyWorkoutForm.create({
      sessionId: workoutSession.id,
      clientId: parseInt(clientId),
      // Use the role-resolved attribution trainer (see round 9 derivation
      // above). For trainer/admin actors this equals `trainerId`; for
      // client self-log it's the assigned trainer or admin fallback so
      // the model's `clientTrainerDifferent` validator passes.
      trainerId: attributedTrainerId,
      date,
      formData,
      sessionDeducted: false,
      mcpProcessed: false
    }, { transaction });

    // Deduct session from client's available sessions
    await client.decrement('availableSessions', { by: 1, transaction });
    await dailyForm.update({ sessionDeducted: true }, { transaction });

    await transaction.commit();

    // Award XP/gamification points asynchronously (don't block response)
    setImmediate(async () => {
      let xpTransaction;
      try {
        xpTransaction = await sequelize.transaction();
        const exercises = formData?.exercises || [];
        await awardWorkoutXP({
          userId: clientId,
          workoutId: dailyForm.id,
          duration: estimatedDuration || null,
          exercisesCompleted: exercises.length,
          exerciseDetails: exercises.map(ex => ({
            name: ex.exerciseName || ex.name || 'unknown',
            sets: (ex.sets || []).length,
            type: ex.exerciseType || 'strength',
          })),
          workoutDate: date,
          awardedBy: trainerId || null,
        }, xpTransaction);
        await xpTransaction.commit();
        logger.info('Workout XP awarded', { clientId, formId: dailyForm.id, exerciseCount: exercises.length });
      } catch (xpErr) {
        if (xpTransaction) await xpTransaction.rollback().catch(() => {});
        logger.warn('XP award failed (non-critical)', { clientId, error: xpErr.message });
      }

      // Process with MCP servers (legacy, disabled by default)
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
 * @desc    Get legacy progress data for client charts
 * @access  Trainer (assigned clients), Admin (all clients), or Client (self only)
 * @query   ?timeRange=3months&startDate=2025-01-01&endDate=2025-01-31
 */
router.get('/client/:clientId/progress', protect, async (req, res) => {
  try {
    const { clientId } = req.params;
    const { timeRange = '3months', startDate, endDate } = req.query;
    const requestingUserId = req.user.id;
    const requestingUserRole = req.user.role;
    const parsedClientId = parseInt(clientId, 10);

    if (!parsedClientId || isNaN(parsedClientId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid client ID is required'
      });
    }

    // Check access permissions
    if (requestingUserRole === 'client') {
      if (String(requestingUserId) !== String(parsedClientId)) {
        return res.status(403).json({
          success: false,
          message: 'Clients can only view their own progress'
        });
      }
    } else if (requestingUserRole === 'trainer') {
      const ClientTrainerAssignment = getClientTrainerAssignment();
      const assignment = await ClientTrainerAssignment.findOne({
        where: {
          clientId: parsedClientId,
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
    } else if (requestingUserRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Calculate date range
    let dateRange = {};
    const now = new Date();
    let resolvedStartDate = startDate ? new Date(startDate) : null;
    let resolvedEndDate = endDate ? new Date(endDate) : now;

    if (startDate && endDate) {
      dateRange = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    } else {
      switch (timeRange) {
        case '7d':
          resolvedStartDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
          break;
        case '30d':
        case '1month':
          resolvedStartDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
          break;
        case '6months':
          resolvedStartDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
          break;
        case '1y':
        case '1year':
          resolvedStartDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
          break;
        case '90d':
        case '3months':
        default:
          resolvedStartDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
          break;
      }

      dateRange = {
        [Op.gte]: resolvedStartDate
      };
    }

    const DailyWorkoutForm = getDailyWorkoutForm();

    if (!DailyWorkoutForm) {
      logger.warn('DailyWorkoutForm model not available — returning empty progress data');
      return res.json({
        success: true,
        progressData: {
          categories: [],
          workoutHistory: [],
          formTrends: [],
          volumeProgression: []
        },
        totalWorkouts: 0,
        dateRange: { startDate: resolvedStartDate, endDate: resolvedEndDate }
      });
    }

    let forms = [];
    try {
      forms = await DailyWorkoutForm.findAll({
        where: {
          clientId: parsedClientId,
          date: dateRange
        },
        order: [['date', 'ASC']]
      });
    } catch (queryErr) {
      logger.warn('DailyWorkoutForm progress query failed (table may not exist):', queryErr.message);
      return res.json({
        success: true,
        progressData: {
          categories: [],
          workoutHistory: [],
          formTrends: [],
          volumeProgression: []
        },
        totalWorkouts: 0,
        dateRange: { startDate: resolvedStartDate, endDate: resolvedEndDate }
      });
    }

    // Process data for charts (null-safe: formData may be null/undefined).
    //
    // Phase 16 (2026-04-16): `|| 5` fallback removed. When the logger did
    // not record an intensity rating, propagate null to the reader so
    // downstream callers can render "not rated" instead of a phantom 5.
    // Matches the null-honest writer contract on this same file.
    const workoutHistory = forms.map(form => {
      const rawIntensity = form.formData?.overallIntensity;
      const intensity = (rawIntensity === undefined || rawIntensity === null)
        ? null
        : rawIntensity;
      return {
        date: form.date,
        duration: form.getEstimatedDuration(),
        intensity,
        totalVolume: form.getTotalVolume(),
        exerciseCount: form.getExerciseCount(),
        pointsEarned: form.totalPointsEarned
      };
    });

    const formTrends = forms.map(form => {
      const exercises = form.formData?.exercises || [];
      const ratingSum = exercises.reduce((sum, ex) => sum + (ex.formRating || 3), 0);
      return {
        date: form.date,
        averageFormRating: exercises.length > 0 ? ratingSum / exercises.length : 0,
        exerciseCount: form.getExerciseCount()
      };
    });

    const volumeProgression = forms.map(form => {
      const exercises = form.formData?.exercises || [];
      return {
        date: form.date,
        totalWeight: form.getTotalVolume(),
        totalReps: exercises.reduce((sum, ex) => {
          return sum + (ex.sets ? ex.sets.reduce((setSum, set) => setSum + (parseInt(set.reps) || 0), 0) : 0);
        }, 0),
        totalSets: form.getTotalSets()
      };
    });

    // canonical-surface-audit 2026-04-13:
    // The legacy fallback must not invent NASM category levels. When no
    // truthful classification exists, return an empty collection so the
    // mounted client chart can stay hidden.
    const categories = [];

    const progressData = {
      categories,
      workoutHistory,
      formTrends,
      volumeProgression
    };

    logger.info(`Retrieved progress data for client ${parsedClientId}`, {
      requestingUserId,
      timeRange,
      totalForms: forms.length
    });

    res.json({
      success: true,
      progressData,
      totalWorkouts: forms.length,
      dateRange: { startDate: resolvedStartDate, endDate: resolvedEndDate }
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
 * @route   GET /api/workout-forms/client/:clientId/progress-detailed
 * @desc    Get comprehensive progress data for client charts (volume, 1RM, body comp, etc.)
 * @access  Trainer (assigned clients), Admin (all clients), or Client (self only)
 * @query   ?timeRange=30d|90d|1y (default 90d)
 *
 * Performance notes:
 * - All workout form data fetched in a single query; 1RM/volume computed in-memory
 * - BodyMeasurement queried separately (different table, limited to 10 rows)
 * - Composite index on (clientId, date) used by the main query
 *   TODO: ensure composite index on (userId, createdAt) exists for BodyMeasurement
 */
router.get('/client/:clientId/progress-detailed', protect, async (req, res) => {
  try {
    const { clientId } = req.params;
    const { timeRange = '90d' } = req.query;
    const requestingUserId = req.user.id;
    const requestingUserRole = req.user.role;

    // Validate clientId as integer
    const parsedClientId = parseInt(clientId, 10);
    if (!parsedClientId || isNaN(parsedClientId)) {
      return res.status(400).json({ success: false, message: 'Valid client ID is required' });
    }

    // --- Access control (admin, trainer assignment, or client self-access) ---
    if (requestingUserRole === 'client') {
      if (requestingUserId !== parsedClientId) {
        return res.status(403).json({ success: false, message: 'Clients can only view their own progress' });
      }
    } else if (requestingUserRole === 'trainer') {
      const ClientTrainerAssignment = getClientTrainerAssignment();
      const assignment = await ClientTrainerAssignment.findOne({
        where: { clientId: parsedClientId, trainerId: requestingUserId, status: 'active' }
      });
      if (!assignment) {
        return res.status(403).json({ success: false, message: 'You are not assigned to this client' });
      }
    }
    // admins pass through

    // --- Calculate date range from timeRange param ---
    const now = new Date();
    let startDate;
    switch (timeRange) {
      case '7d':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
        break;
      case '30d':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        break;
      case '1y':
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        break;
      case '90d':
      default:
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
        break;
    }

    // --- Single query: all workout forms in range (uses composite index clientId+date) ---
    const DailyWorkoutForm = getDailyWorkoutForm();

    if (!DailyWorkoutForm) {
      logger.warn('DailyWorkoutForm model not available — returning empty detailed progress data');
      return res.json({
        success: true,
        progressData: {
          volumeProgression: [], oneRepMaxes: [], formTrends: [],
          nasmCategories: [], bodyComposition: [], strengthProgression: [],
          consistencyData: [], muscleGroupVolume: [],
          summary: { totalWorkouts: 0, totalVolume: 0, averageFormScore: 0, strongestLift: null, mostImproved: null, currentStreak: 0, weeklyAverage: 0 }
        }
      });
    }

    let forms;
    try {
      forms = await DailyWorkoutForm.findAll({
        where: {
          clientId: parsedClientId,
          date: { [Op.gte]: startDate }
        },
        order: [['date', 'ASC']],
        attributes: ['id', 'date', 'formData', 'totalPointsEarned', 'submittedAt', 'createdAt']
      });
    } catch (queryErr) {
      // Fallback: if specific attributes fail (column may not exist in prod), query without attribute filter
      logger.warn('Progress-detailed attribute query failed, retrying without attribute filter:', queryErr.message);
      try {
        forms = await DailyWorkoutForm.findAll({
          where: {
            clientId: parsedClientId,
            date: { [Op.gte]: startDate }
          },
          order: [['date', 'ASC']]
        });
      } catch (fallbackErr) {
        logger.warn('DailyWorkoutForm table may not exist in production:', fallbackErr.message);
        forms = [];
      }
    }

    // ========== Helper: Epley 1RM ==========
    const calcEpley1RM = (weight, reps) => {
      if (!weight || weight <= 0) return 0;
      if (!reps || reps <= 0) return 0;
      if (reps === 1) return weight;
      return Math.round(weight * (1 + reps / 30));
    };

    // ========== 1. Volume Progression (same pattern as existing endpoint) ==========
    const volumeProgression = forms.map(form => {
      const exercises = form.formData?.exercises || [];
      return {
        date: form.date,
        totalWeight: exercises.reduce((sum, ex) => {
          return sum + (ex.sets || []).reduce((s, set) => s + ((set.weight || 0) * (set.reps || 0)), 0);
        }, 0),
        totalReps: exercises.reduce((sum, ex) => {
          return sum + (ex.sets || []).reduce((s, set) => s + (parseInt(set.reps) || 0), 0);
        }, 0),
        totalSets: exercises.reduce((sum, ex) => sum + (ex.sets ? ex.sets.length : 0), 0)
      };
    });

    // ========== Intermediate: build per-exercise data for 1RM, strength, muscle group ==========
    // canonical-surface-audit 2026-04-13 (Phase 3 wireup):
    // Single pass over every persisted set captures everything four
    // previously-hidden charts need: RPE zone counts, per-exercise PR
    // (best raw set by Epley 1RM, weight > 0 only), per-exercise frequency,
    // and per-exercise last-performed date. Adding new aggregates here
    // costs one extra branch per set and avoids a second pass.
    const exerciseByDate = {}; // { exerciseName: { date: { max1RM, volume } } }
    const exerciseFrequency = {}; // { exerciseName: count }
    const exerciseLastPerformed = {}; // { exerciseName: 'YYYY-MM-DD' }
    const bestPRByExercise = {}; // { exerciseName: { date, exercise, weight, reps, estimated1RM } }
    const rpeZoneCounts = {
      'Easy (1-3)': 0,
      'Moderate (4-6)': 0,
      'Hard (7-8)': 0,
      'Max Effort (9-10)': 0,
    };

    for (const form of forms) {
      const exercises = form.formData?.exercises || [];
      for (const ex of exercises) {
        const name = ex.exerciseName || ex.name || 'Unknown';
        if (!exerciseByDate[name]) exerciseByDate[name] = {};
        if (!exerciseFrequency[name]) exerciseFrequency[name] = 0;
        exerciseFrequency[name]++;

        if (!exerciseLastPerformed[name] || form.date > exerciseLastPerformed[name]) {
          exerciseLastPerformed[name] = form.date;
        }

        let bestSetRM = 0;
        let exVolume = 0;
        for (const set of (ex.sets || [])) {
          const w = parseFloat(set.weight) || 0;
          const r = parseInt(set.reps) || 0;
          const rm = calcEpley1RM(w, r);
          if (rm > bestSetRM) bestSetRM = rm;
          exVolume += w * r;

          // RPE zone bucketing — truthful from persisted set.rpe, skipping
          // unset / invalid values so a missing field never inflates a zone.
          const rpeVal = parseInt(set.rpe, 10);
          if (Number.isFinite(rpeVal) && rpeVal >= 1 && rpeVal <= 10) {
            if (rpeVal <= 3) rpeZoneCounts['Easy (1-3)']++;
            else if (rpeVal <= 6) rpeZoneCounts['Moderate (4-6)']++;
            else if (rpeVal <= 8) rpeZoneCounts['Hard (7-8)']++;
            else rpeZoneCounts['Max Effort (9-10)']++;
          }

          // Personal record: track best raw set per exercise. Filter w > 0
          // so bodyweight exercises do not produce meaningless "PR: 0 lbs"
          // rows from Epley(0, r) === 0.
          if (w > 0 && rm > 0) {
            const existingPR = bestPRByExercise[name];
            if (!existingPR || rm > existingPR.estimated1RM) {
              bestPRByExercise[name] = {
                date: form.date,
                exercise: name,
                weight: w,
                reps: r,
                estimated1RM: rm,
              };
            }
          }
        }

        const dateKey = form.date;
        if (!exerciseByDate[name][dateKey]) {
          exerciseByDate[name][dateKey] = { max1RM: 0, volume: 0 };
        }
        if (bestSetRM > exerciseByDate[name][dateKey].max1RM) {
          exerciseByDate[name][dateKey].max1RM = bestSetRM;
        }
        exerciseByDate[name][dateKey].volume += exVolume;
      }
    }

    // ========== 2. One Rep Maxes (top 10 exercises by best 1RM) ==========
    const exerciseBest1RM = {};
    for (const [name, dateMap] of Object.entries(exerciseByDate)) {
      let best = 0;
      let bestDate = null;
      for (const [date, data] of Object.entries(dateMap)) {
        if (data.max1RM > best) {
          best = data.max1RM;
          bestDate = date;
        }
      }
      exerciseBest1RM[name] = { exercise: name, estimated1RM: best, date: bestDate };
    }
    const oneRepMaxes = Object.values(exerciseBest1RM)
      .sort((a, b) => b.estimated1RM - a.estimated1RM)
      .slice(0, 10);

    // ========== 3. Form Trends (average form rating per workout) ==========
    const formTrends = forms.map(form => {
      const exercises = form.formData?.exercises || [];
      const ratings = exercises.filter(ex => ex.formRating).map(ex => ex.formRating);
      return {
        date: form.date,
        averageFormRating: ratings.length > 0
          ? Math.round((ratings.reduce((s, r) => s + r, 0) / ratings.length) * 10) / 10
          : null,
        exerciseCount: exercises.length
      };
    });

    // ========== 4. NASM Categories ==========
    // canonical-surface-audit 2026-04-13:
    // Do not ship fabricated NASM category progress on the mounted client
    // surface. Until the writer/reader chain can classify real form data into
    // NASM buckets, return an empty array and let the frontend hide the chart.
    const nasmCategories = [];

    // ========== 5. Body Composition (from BodyMeasurement) ==========
    let bodyComposition = [];
    try {
      const BodyMeasurement = getBodyMeasurement();
      const measurements = await BodyMeasurement.findAll({
        where: { userId: parsedClientId },
        order: [['measurementDate', 'DESC']],
        limit: 10,
        attributes: ['measurementDate', 'weight', 'bodyFatPercentage', 'muscleMassPercentage', 'progressScore']
      });
      bodyComposition = measurements.reverse().map(m => ({
        date: m.measurementDate,
        weight: m.weight ? parseFloat(m.weight) : null,
        bodyFat: m.bodyFatPercentage ? parseFloat(m.bodyFatPercentage) : null,
        muscleMass: m.muscleMassPercentage ? parseFloat(m.muscleMassPercentage) : null,
        progressScore: m.progressScore || null
      }));
    } catch (bmErr) {
      logger.warn('BodyMeasurement query failed (table may not exist):', bmErr.message);
    }

    // ========== 6. Strength Progression (1RM per top-5 exercises over time) ==========
    const top5Exercises = Object.entries(exerciseFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name]) => name);

    // Collect all unique dates across top-5 exercises
    const strengthDates = new Set();
    for (const name of top5Exercises) {
      for (const date of Object.keys(exerciseByDate[name] || {})) {
        strengthDates.add(date);
      }
    }
    const strengthProgression = Array.from(strengthDates).sort().map(date => {
      const exercises = {};
      for (const name of top5Exercises) {
        const data = exerciseByDate[name]?.[date];
        if (data && data.max1RM > 0) {
          exercises[name] = data.max1RM;
        }
      }
      return { date, exercises };
    });

    // ========== 7. Consistency Data (daily counts for heatmap, last 90 days) ==========
    const ninetyDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 90);
    const consistencyMap = {};
    for (const form of forms) {
      const d = form.date;
      if (new Date(d) < ninetyDaysAgo) continue;
      if (!consistencyMap[d]) consistencyMap[d] = { count: 0, volume: 0 };
      consistencyMap[d].count++;
      const exercises = form.formData?.exercises || [];
      consistencyMap[d].volume += exercises.reduce((sum, ex) => {
        return sum + (ex.sets || []).reduce((s, set) => s + ((set.weight || 0) * (set.reps || 0)), 0);
      }, 0);
    }
    const consistencyData = Object.entries(consistencyMap)
      .map(([date, data]) => ({ date, count: data.count, volume: Math.round(data.volume) }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // ========== 8. Muscle Group Volume ==========
    // canonical-surface-audit 2026-04-13 (Phase 2 writer-chain audit):
    // The ExerciseEntry type in frontend/src/services/nasmApiService.ts has
    // no muscleGroup / category / exerciseType field, and every WorkoutLogger
    // handler strips classification metadata when building an entry. Until
    // the writer chain starts persisting real classification, exercises
    // without one must be SKIPPED, not bucketed under a fabricated
    // "Uncategorized" label. An empty muscleGroupVolume array lets the
    // mounted MuscleGroupRadar chart hide itself via its data.length > 0 gate
    // instead of rendering a single fake blob.
    const muscleGroupMap = {};
    const previousMidpoint = new Date((startDate.getTime() + now.getTime()) / 2);

    for (const form of forms) {
      const formDate = new Date(form.date);
      const isPreviousPeriod = formDate < previousMidpoint;
      const exercises = form.formData?.exercises || [];
      for (const ex of exercises) {
        const group = ex.muscleGroup || ex.category || ex.exerciseType;
        if (!group) continue;
        if (!muscleGroupMap[group]) muscleGroupMap[group] = { volume: 0, previousVolume: 0 };
        const vol = (ex.sets || []).reduce((s, set) => s + ((set.weight || 0) * (set.reps || 0)), 0);
        if (isPreviousPeriod) {
          muscleGroupMap[group].previousVolume += vol;
        } else {
          muscleGroupMap[group].volume += vol;
        }
      }
    }
    const muscleGroupVolume = Object.entries(muscleGroupMap).map(([muscleGroup, data]) => ({
      muscleGroup,
      volume: Math.round(data.volume),
      previousVolume: Math.round(data.previousVolume)
    }));

    // ========== 9. Summary ==========
    const totalVolume = volumeProgression.reduce((s, v) => s + v.totalWeight, 0);
    const formRatings = formTrends.filter(f => f.averageFormRating !== null);
    const averageFormScore = formRatings.length > 0
      ? Math.round((formRatings.reduce((s, f) => s + f.averageFormRating, 0) / formRatings.length) * 10) / 10
      : 0;

    // Strongest lift
    const strongestLift = oneRepMaxes.length > 0
      ? { exercise: oneRepMaxes[0].exercise, max: oneRepMaxes[0].estimated1RM }
      : null;

    // Most improved (exercise with largest 1RM increase from first to last appearance)
    let mostImproved = null;
    for (const name of top5Exercises) {
      const dates = Object.keys(exerciseByDate[name] || {}).sort();
      if (dates.length >= 2) {
        const first = exerciseByDate[name][dates[0]].max1RM;
        const last = exerciseByDate[name][dates[dates.length - 1]].max1RM;
        const improvement = last - first;
        if (!mostImproved || improvement > mostImproved.improvement) {
          mostImproved = { exercise: name, improvement };
        }
      }
    }

    // Current streak (consecutive days with workouts, working backwards from most recent)
    let currentStreak = 0;
    if (forms.length > 0) {
      const uniqueDates = [...new Set(forms.map(f => f.date))].sort().reverse();
      const today = now.toISOString().split('T')[0];
      // Start from today or most recent workout date
      let checkDate = new Date(uniqueDates[0] <= today ? uniqueDates[0] : today);
      for (const d of uniqueDates) {
        const dateStr = checkDate.toISOString().split('T')[0];
        if (d === dateStr) {
          currentStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else if (d < dateStr) {
          break;
        }
      }
    }

    // Weekly average
    const totalDays = Math.max(1, (now - startDate) / (1000 * 60 * 60 * 24));
    const totalWeeks = Math.max(1, totalDays / 7);
    const totalWorkouts = forms.length;
    const weeklyAverage = Math.round((totalWorkouts / totalWeeks) * 10) / 10;

    const summary = {
      totalWorkouts,
      totalVolume: Math.round(totalVolume),
      averageFormScore,
      strongestLift,
      mostImproved,
      currentStreak,
      weeklyAverage
    };

    // ========== 10. RPE Distribution (truthful from persisted set.rpe) ==========
    // canonical-surface-audit 2026-04-13 (Phase 3 wireup):
    // Caveat: WorkoutLogger initializes set.rpe to 5 on every set and only
    // updates it when the trainer touches the slider in ExerciseCardComponent
    // at line 178. Sessions where the slider is never touched will skew the
    // chart toward "Moderate (4-6)". This is real persisted data, not
    // fabrication, but the UX truthfulness depends on trainer interaction.
    const totalRpeCount = Object.values(rpeZoneCounts).reduce((s, c) => s + c, 0);
    const rpeZoneColors = {
      'Easy (1-3)': '#50A0F0',
      'Moderate (4-6)': '#60C0F0',
      'Hard (7-8)': '#8B5CF6',
      'Max Effort (9-10)': '#C6A84B',
    };
    const rpeDistribution = totalRpeCount > 0
      ? Object.entries(rpeZoneCounts).map(([zone, count]) => ({
          zone,
          count,
          percentage: Math.round((count / totalRpeCount) * 1000) / 10,
          color: rpeZoneColors[zone],
        }))
      : [];

    // ========== 11. Personal Records (top 10 by estimated 1RM) ==========
    // Sourced from bestPRByExercise which already filters w > 0 to avoid
    // bodyweight 0-lb fabrications.
    const personalRecords = Object.values(bestPRByExercise)
      .sort((a, b) => b.estimated1RM - a.estimated1RM)
      .slice(0, 10);

    // ========== 12. Exercise Frequency (count + last performed per exercise) ==========
    const exerciseFrequencyList = Object.entries(exerciseFrequency).map(([name, count]) => ({
      exercise: name,
      count,
      lastPerformed: exerciseLastPerformed[name] || '',
    }));

    // ========== 13. Session Intensity (per-form intensity + duration + volume) ==========
    // Phase 16 (2026-04-16): the writer no longer defaults overallIntensity
    // to 5. Honor null here so downstream charts can skip unrated sessions
    // (via `intensity != null` filters) rather than zero-filling and
    // dragging the trend line toward 0.
    const sessionIntensity = forms.map((form, i) => {
      const rawIntensity = form.formData?.overallIntensity;
      const intensity = (rawIntensity === undefined || rawIntensity === null)
        ? null
        : rawIntensity;
      return {
        date: form.date,
        duration: form.formData?.estimatedDuration || 0,
        intensity,
        totalVolume: volumeProgression[i]?.totalWeight || 0,
      };
    });

    // ========== Build response ==========
    const progressData = {
      volumeProgression,
      oneRepMaxes,
      formTrends,
      nasmCategories,
      bodyComposition,
      strengthProgression,
      consistencyData,
      muscleGroupVolume,
      rpeDistribution,
      personalRecords,
      exerciseFrequency: exerciseFrequencyList,
      sessionIntensity,
      summary
    };

    logger.info(`Retrieved detailed progress data for client ${parsedClientId}`, {
      requestingUserId,
      timeRange,
      totalForms: forms.length
    });

    res.json({
      success: true,
      progressData
    });

  } catch (error) {
    logger.error('Error fetching detailed progress data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch detailed progress data',
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

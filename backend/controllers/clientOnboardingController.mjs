/**
 * FILE: clientOnboardingController.mjs
 * SYSTEM: Client Onboarding + NASM Movement Screen
 *
 * PURPOSE:
 * - Manage onboarding questionnaire records and movement screen assessments.
 * - Persist NASM OHSA data and baseline measurements for downstream AI planning.
 *
 * ARCHITECTURE:
 * ```mermaid
 * graph TD
 *   A[Frontend Forms] --> B[clientOnboardingRoutes]
 *   B --> C[clientOnboardingController]
 *   C --> D[ClientOnboardingQuestionnaire]
 *   C --> E[ClientBaselineMeasurements]
 *   C --> F[User]
 * ```
 *
 * DATABASE ERD:
 * ```
 * users (id) 1--N client_onboarding_questionnaires
 * users (id) 1--N client_baseline_measurements
 * ```
 *
 * DATA FLOW (Movement Screen):
 * 1. Trainer submits POST /api/client-onboarding/:userId/movement-screen
 * 2. Controller validates role + user ownership/assignment
 * 3. Parses PAR-Q+ and OHSA payloads
 * 4. Computes NASM score and corrective strategy
 * 5. Creates baseline measurement row
 * 6. Responds with NASM summary + OPT phase
 *
 * ERROR STATES:
 * - 400: Missing userId or required NASM payloads
 * - 401: Unauthenticated
 * - 403: Trainer not assigned to client
 * - 404: User not found
 * - 500: Database or validation failure
 *
 * WHY Store Movement Screen in Baseline Measurements?
 * - Keeps all assessment inputs and outputs in one time-series record.
 * - Enables historical comparisons and AI safety checks.
 *
 * WHY Compute NASM Score Server-Side?
 * - Guarantees consistent scoring rules across clients.
 * - Prevents client-side tampering with assessments.
 *
 * DEPENDENCIES:
 * - sequelize models (User, ClientOnboardingQuestionnaire, ClientBaselineMeasurements)
 * - auth middleware (role + assignment checks)
 *
 * CREATED: 2026-01-10
 * LAST MODIFIED: 2026-01-18
 */
import logger from '../utils/logger.mjs';
import { getAllModels } from '../models/index.mjs';
import { Op } from 'sequelize';
import { createBaselineMeasurementRecord } from '../services/clientBaselineMeasurementService.mjs';
import { buildClientDataOverview } from '../services/clientDataOverviewService.mjs';
import { createMovementScreenRecord } from '../services/clientMovementScreenService.mjs';
import {
  TOTAL_QUESTION_COUNT,
  isPlainObject,
  toNumber,
  countAnsweredQuestions,
  calculateCompletionPercentage,
  normalizeOnboardingQueueStatus,
  extractPrimaryGoal,
  extractTrainingTier,
  extractCommitmentLevel,
  extractNutritionPrefs,
  calculateHealthRisk,
} from '../utils/onboardingHelpers.mjs';

const SELF_ROLES = new Set(['client', 'user']);

const parseUserId = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const normalizeJsonObject = (value) => {
  if (!value) {
    return null;
  }
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch (error) {
      return null;
    }
  }
  return isPlainObject(value) ? value : null;
};

const ensureClientAccess = async (requester, targetUserId, ClientTrainerAssignment) => {
  const requesterId = parseUserId(requester?.id);
  const requesterRole = requester?.role;

  if (!requesterId || !requesterRole) {
    return { ok: false, status: 401, message: 'Not authenticated' };
  }

  if (requesterRole === 'admin') {
    return { ok: true };
  }

  if (requesterRole === 'trainer') {
    const assignment = await ClientTrainerAssignment.findOne({
      where: {
        clientId: targetUserId,
        trainerId: requesterId,
        status: 'active',
      },
    });

    if (!assignment) {
      return { ok: false, status: 403, message: 'Access denied: Trainer not assigned to this client' };
    }
    return { ok: true };
  }

  if (SELF_ROLES.has(requesterRole)) {
    if (requesterId !== targetUserId) {
      return { ok: false, status: 403, message: 'Access denied: Cannot access another user' };
    }
    return { ok: true };
  }

  return { ok: false, status: 403, message: 'Access denied: Invalid role' };
};

const ensureTrainerAccess = async (requester, targetUserId, ClientTrainerAssignment) => {
  const requesterId = parseUserId(requester?.id);
  const requesterRole = requester?.role;

  if (!requesterId || !requesterRole) {
    return { ok: false, status: 401, message: 'Not authenticated' };
  }

  if (requesterRole === 'admin') {
    return { ok: true };
  }

  if (requesterRole === 'trainer') {
    const assignment = await ClientTrainerAssignment.findOne({
      where: {
        clientId: targetUserId,
        trainerId: requesterId,
        status: 'active',
      },
    });

    if (!assignment) {
      return { ok: false, status: 403, message: 'Access denied: Trainer not assigned to this client' };
    }
    return { ok: true };
  }

  return { ok: false, status: 403, message: 'Access denied: Only trainers or admins can perform assessments' };
};

export const createQuestionnaire = async (req, res) => {
  try {
    const targetUserId = parseUserId(req.params.userId);
    if (!targetUserId) {
      return res.status(400).json({ success: false, message: 'Invalid userId parameter' });
    }

    const models = getAllModels();
    const { User, ClientTrainerAssignment, ClientOnboardingQuestionnaire } = models;

    const accessResult = await ensureClientAccess(req.user, targetUserId, ClientTrainerAssignment);
    if (!accessResult.ok) {
      return res.status(accessResult.status).json({ success: false, message: accessResult.message });
    }

    const targetUser = await User.findByPk(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const rawResponses = req.body?.responses ?? req.body?.responsesJson;
    const responses = normalizeJsonObject(rawResponses);
    if (!responses) {
      return res.status(400).json({ success: false, message: 'responses must be a valid JSON object' });
    }

    const completionPercentage = calculateCompletionPercentage(responses);
    const primaryGoal = extractPrimaryGoal(responses);
    const trainingTier = extractTrainingTier(responses);
    const commitmentLevel = extractCommitmentLevel(responses);
    const healthRisk = calculateHealthRisk(responses);
    const nutritionPrefs = extractNutritionPrefs(responses);

    const status = completionPercentage === 100 ? 'completed' : 'submitted';
    const completedAt = completionPercentage === 100 ? new Date() : null;

    const questionnaire = await ClientOnboardingQuestionnaire.create({
      userId: targetUserId,
      createdBy: parseUserId(req.user?.id),
      questionnaireVersion: req.body?.questionnaireVersion ?? '3.0',
      status,
      responsesJson: responses,
      primaryGoal,
      trainingTier,
      commitmentLevel,
      healthRisk,
      nutritionPrefs,
      completedAt,
    });

    return res.status(201).json({
      success: true,
      questionnaire: {
        id: questionnaire.id,
        userId: questionnaire.userId,
        status: questionnaire.status,
        completionPercentage,
        questionnaireVersion: questionnaire.questionnaireVersion,
        primaryGoal: questionnaire.primaryGoal,
        trainingTier: questionnaire.trainingTier,
        commitmentLevel: questionnaire.commitmentLevel,
        healthRisk: questionnaire.healthRisk,
        createdAt: questionnaire.createdAt,
        completedAt: questionnaire.completedAt,
      },
    });
  } catch (error) {
    logger.error('Client onboarding questionnaire creation failed:', error);
    return res.status(500).json({ success: false, message: 'Failed to save questionnaire' });
  }
};

export const getQuestionnaire = async (req, res) => {
  try {
    const targetUserId = parseUserId(req.params.userId);
    if (!targetUserId) {
      return res.status(400).json({ success: false, message: 'Invalid userId parameter' });
    }

    const models = getAllModels();
    const { User, ClientTrainerAssignment, ClientOnboardingQuestionnaire } = models;

    const accessResult = await ensureClientAccess(req.user, targetUserId, ClientTrainerAssignment);
    if (!accessResult.ok) {
      return res.status(accessResult.status).json({ success: false, message: accessResult.message });
    }

    const targetUser = await User.findByPk(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const questionnaire = await ClientOnboardingQuestionnaire.findOne({
      where: { userId: targetUserId },
      order: [['createdAt', 'DESC']],
    });

    if (!questionnaire) {
      return res.status(404).json({ success: false, message: 'Questionnaire not found' });
    }

    const responses = normalizeJsonObject(questionnaire.responsesJson) ?? {};
    const completionPercentage = calculateCompletionPercentage(responses);

    return res.status(200).json({
      success: true,
      questionnaire: {
        id: questionnaire.id,
        userId: questionnaire.userId,
        status: questionnaire.status,
        completionPercentage,
        questionnaireVersion: questionnaire.questionnaireVersion,
        primaryGoal: questionnaire.primaryGoal,
        trainingTier: questionnaire.trainingTier,
        commitmentLevel: questionnaire.commitmentLevel,
        healthRisk: questionnaire.healthRisk,
        nutritionPrefs: questionnaire.nutritionPrefs,
        responses,
        completedAt: questionnaire.completedAt,
        createdAt: questionnaire.createdAt,
      },
    });
  } catch (error) {
    logger.error('Client onboarding questionnaire fetch failed:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve questionnaire' });
  }
};

export const createMovementScreen = async (req, res) => {
  try {
    const targetUserId = parseUserId(req.params.userId);
    if (!targetUserId) {
      return res.status(400).json({ success: false, message: 'Invalid userId parameter' });
    }

    const models = getAllModels();
    const { User, ClientTrainerAssignment } = models;

    const accessResult = await ensureTrainerAccess(req.user, targetUserId, ClientTrainerAssignment);
    if (!accessResult.ok) {
      return res.status(accessResult.status).json({ success: false, message: accessResult.message });
    }

    const targetUser = await User.findByPk(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const result = await createMovementScreenRecord({
      models,
      targetUserId,
      recordedBy: parseUserId(req.user?.id),
      body: req.body,
    });

    if (!result.ok) {
      return res.status(result.status).json({ success: false, message: result.message });
    }

    return res.status(201).json({
      success: true,
      movementScreen: result.movementScreen,
    });
  } catch (error) {
    logger.error('Movement screen creation failed:', error);
    return res.status(500).json({ success: false, message: 'Failed to save movement screen' });
  }
};

export const getClientDataOverview = async (req, res) => {
  try {
    const targetUserId = parseUserId(req.params.userId);
    if (!targetUserId) {
      return res.status(400).json({ success: false, message: 'Invalid userId parameter' });
    }

    const models = getAllModels();
    const { User, ClientTrainerAssignment } = models;

    const accessResult = await ensureClientAccess(req.user, targetUserId, ClientTrainerAssignment);
    if (!accessResult.ok) {
      return res.status(accessResult.status).json({ success: false, message: accessResult.message });
    }

    const targetUser = await User.findByPk(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const overview = await buildClientDataOverview({
      models,
      targetUserId,
      requesterRole: req.user?.role,
    });

    return res.status(200).json({
      success: true,
      overview,
    });
  } catch (error) {
    logger.error('Client data overview fetch failed:', error);
    return res.status(500).json({ success: false, message: 'Failed to load client overview' });
  }
};

/**
 * GET /api/admin/onboarding
 * Get all client onboarding data for admin management table
 * RBAC: admin, trainer only
 */
export const getAdminOnboardingList = async (req, res) => {
  try {
    const { User, ClientOnboardingQuestionnaire, ClientBaselineMeasurements, Package } = await getAllModels();

    // Parse query params
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 10));
    const offset = (page - 1) * limit;
    const packageFilter = req.query.package;
    const statusFilter = req.query.status;
    const searchQuery = req.query.search;

    // Build where clauses
    const userWhere = {};
    if (searchQuery) {
      userWhere[Op.or] = [
        { firstName: { [Op.iLike]: `%${searchQuery}%` } },
        { lastName: { [Op.iLike]: `%${searchQuery}%` } },
        { email: { [Op.iLike]: `%${searchQuery}%` } },
      ];
    }

    // Fetch users with their onboarding data
    const { count, rows: users } = await User.findAndCountAll({
      where: userWhere,
      include: [
        {
          model: Package,
          as: 'packages',
          required: false,
        },
        {
          model: ClientOnboardingQuestionnaire,
          as: 'questionnaires',
          required: false,
          order: [['createdAt', 'DESC']],
          limit: 1,
        },
        {
          model: ClientBaselineMeasurements,
          as: 'baselineMeasurements',
          required: false,
          order: [['createdAt', 'DESC']],
          limit: 1,
        },
      ],
      limit,
      offset,
      distinct: true,
    });

    // Format response data
    const clients = users.map((user) => {
      const latestQuestionnaire = user.questionnaires?.[0] || null;
      const latestBaseline = user.baselineMeasurements?.[0] || null;
      const activePackage = user.packages?.find((pkg) => pkg.status === 'active') || user.packages?.[0] || null;

      // Apply status filter
      const questionnaireStatus = normalizeOnboardingQueueStatus(latestQuestionnaire?.status);

      if (statusFilter && statusFilter !== 'all' && questionnaireStatus !== statusFilter) {
        return null;
      }

      // Apply package filter
      if (packageFilter && packageFilter !== 'all' && activePackage?.name !== packageFilter) {
        return null;
      }

      return {
        userId: user.id,
        client: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
        },
        package: {
          name: activePackage?.name || 'No Package',
        },
        questionnaire: latestQuestionnaire
          ? {
              status: latestQuestionnaire.status,
              completionPercentage: latestQuestionnaire.completionPercentage || 0,
              primaryGoal: latestQuestionnaire.primaryGoal,
              createdAt: latestQuestionnaire.createdAt,
            }
          : null,
        movementScreen: latestBaseline
          ? {
              nasmAssessmentScore: latestBaseline.nasmAssessmentScore,
              status: latestBaseline.nasmAssessmentScore !== null ? 'completed' : 'pending',
              createdAt: latestBaseline.createdAt,
            }
          : {
              nasmAssessmentScore: null,
              status: 'pending',
            },
      };
    }).filter(Boolean);

    const totalPages = Math.ceil(count / limit);

    return res.status(200).json({
      success: true,
      clients,
      pagination: {
        page,
        limit,
        totalPages,
        totalCount: count,
      },
    });
  } catch (error) {
    logger.error('Admin onboarding list fetch failed:', error);
    return res.status(500).json({ success: false, message: 'Failed to load onboarding list' });
  }
};

/**
 * POST /api/admin/baseline-measurements
 * Create new baseline measurements record
 * RBAC: admin, trainer only
 */
export const createBaselineMeasurements = async (req, res) => {
  try {
    const models = await getAllModels();
    const { ClientTrainerAssignment } = models;
    const targetUserId = parseUserId(req.body?.userId);

    if (!targetUserId) {
      return res.status(400).json({ success: false, message: 'userId is required' });
    }

    const accessResult = await ensureTrainerAccess(req.user, targetUserId, ClientTrainerAssignment);
    if (!accessResult.ok) {
      return res.status(accessResult.status).json({ success: false, message: accessResult.message });
    }

    const baseline = await createBaselineMeasurementRecord({
      models,
      targetUserId,
      recordedByUserId: req.user.id,
      measurementData: req.body,
    });

    logger.info(`Baseline measurements created for user ${targetUserId} by ${req.user.id}`);

    return res.status(201).json({
      success: true,
      baseline,
    });
  } catch (error) {
    logger.error('Baseline measurements creation failed:', error);
    return res.status(500).json({ success: false, message: 'Failed to create baseline measurements' });
  }
};

/**
 * GET /api/admin/baseline-measurements/:userId
 * Get baseline measurements history for a user
 * RBAC: admin, trainer, client (own data only)
 */
export const getBaselineMeasurementsHistory = async (req, res) => {
  try {
    const { ClientBaselineMeasurements, ClientTrainerAssignment } = await getAllModels();
    const targetUserId = parseUserId(req.params.userId);

    if (!targetUserId) {
      return res.status(400).json({ success: false, message: 'Invalid userId' });
    }

    const accessResult = await ensureClientAccess(req.user, targetUserId, ClientTrainerAssignment);
    if (!accessResult.ok) {
      return res.status(accessResult.status).json({ success: false, message: accessResult.message });
    }

    const measurements = await ClientBaselineMeasurements.findAll({
      where: { userId: targetUserId },
      order: [['takenAt', 'DESC']],
      limit: 50,
    });

    return res.status(200).json({
      success: true,
      measurements,
    });
  } catch (error) {
    logger.error('Baseline measurements history fetch failed:', error);
    return res.status(500).json({ success: false, message: 'Failed to load baseline measurements' });
  }
};

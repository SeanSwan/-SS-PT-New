// backend/controllers/clientProgressController.mjs

import { Op } from 'sequelize';
import {
  getClientPainEntry,
  getClientProgress as getClientProgressModel,
  getGoal,
  getUser,
  getWorkoutSession,
} from '../models/index.mjs';
import logger from '../utils/logger.mjs';
import { directoryAttributes, isStaffViewer } from '../utils/memberDirectoryAccess.mjs';
import { COMPARISON_LEVEL_FIELDS, buildComparisonAnalytics } from '../services/clientProgress/comparisonAnalyticsReadModel.mjs';
import {
  handleClientProgressError,
  requirePositiveClientId,
} from '../services/clientProgress/routeResponses.mjs';
import { buildGoalTrackingData } from '../services/clientProgress/goalTrackingReadModel.mjs';
import {
  normalizeGoalCreatePayload,
  normalizeGoalUpdatePayload,
} from '../services/clientProgress/goalPayloadNormalizer.mjs';
import { buildInjuryRiskAssessment } from '../services/clientProgress/injuryRiskReadModel.mjs';
import {
  parseWorkoutHistoryTimeframe,
  toWorkoutHistoryEntry,
} from '../services/clientProgress/workoutHistoryReadModel.mjs';
import {
  applyCurrentClientProgressUpdates,
  applyTrainerProgressUpdates,
} from '../services/clientProgress/currentProgressMutations.mjs';
import {
  createLegacyMeasurement,
  getLegacyClientProgress,
  getLegacyMeasurementHistory,
} from '../services/clientProgress/legacyClientProgressApi.mjs';

const GOAL_STATUSES = ['draft', 'active', 'completed', 'paused', 'cancelled', 'failed'];

const clientProgressHandler = (action, logMessage, publicMessage, options) => async (req, res) => {
  try {
    return await action(req, res);
  } catch (error) {
    return handleClientProgressError(res, error, logMessage, publicMessage, options);
  }
};

const findClientOrNull = async (userId, attributes) => {
  const User = getUser();
  return User.findOne({
    where: { id: userId, role: 'client' },
    attributes,
  });
};

const sendNotFound = (res, message) => res.status(404).json({
  success: false,
  message,
});

export const getCurrentClientProgress = clientProgressHandler(async (req, res) => {
  const ClientProgress = getClientProgressModel();
  const [clientProgress, created] = await ClientProgress.findOrCreate({
    where: { userId: req.user.id },
    defaults: {
      userId: req.user.id,
      overallLevel: 0,
      experiencePoints: 0,
    },
  });

  if (created) logger.info(`Created new progress record for user ${req.user.id}`);
  return res.status(200).json({ success: true, progress: clientProgress });
}, 'Error fetching client progress:', 'Server error fetching progress data');

export const updateCurrentClientProgress = clientProgressHandler(async (req, res) => {
  const clientProgress = await getClientProgressModel().findOne({ where: { userId: req.user.id } });
  if (!clientProgress) return sendNotFound(res, 'Client progress record not found');

  applyCurrentClientProgressUpdates(clientProgress, req.body);
  await clientProgress.save();
  return res.status(200).json({
    success: true,
    message: 'Progress updated successfully',
    progress: clientProgress,
  });
}, 'Error updating client progress:', 'Server error updating progress data');

export const getClientProgressLeaderboard = clientProgressHandler(async (req, res) => {
  const ClientProgress = getClientProgressModel();
  const User = getUser();
  const leaderboard = await ClientProgress.findAll({
    attributes: ['overallLevel', 'userId'],
    include: [{
      model: User,
      as: 'user',
      // Second mounted leaderboard. It carried surnames to every member and
      // ignored `leaderboardOptIn` entirely, while the guard pinned only the
      // OTHER implementation — "two implementations of one rule" is exactly how
      // this class kept re-opening.
      attributes: directoryAttributes(req.user),
      where: isStaffViewer(req.user) ? undefined : { leaderboardOptIn: true },
      required: true,
    }],
    order: [['overallLevel', 'DESC']],
    limit: 10,
  });
  return res.status(200).json({ success: true, leaderboard });
}, 'Error fetching leaderboard:', 'Server error fetching leaderboard');

export const getClientWorkoutHistory = clientProgressHandler(async (req, res) => {
  const numericClientId = requirePositiveClientId(req.params.clientId);
  const WorkoutSession = getWorkoutSession();
  if (!WorkoutSession) {
    logger.warn('[workout-history] WorkoutSession model unavailable');
    return res.status(200).json([]);
  }

  const days = parseWorkoutHistoryTimeframe(req.query.timeframe);
  const where = { userId: numericClientId, status: 'completed' };
  if (days) {
    const since = new Date();
    since.setDate(since.getDate() - days);
    where.date = { [Op.gte]: since };
  }

  const sessions = await WorkoutSession.findAll({
    where,
    order: [['date', 'DESC']],
    limit: 200,
    attributes: ['id', 'title', 'date', 'duration', 'intensity', 'notes'],
  });
  return res.status(200).json(sessions.map(toWorkoutHistoryEntry));
}, 'Error fetching client workout history:', 'Server error fetching workout history');

export const getClientComparisonAnalytics = clientProgressHandler(async (req, res) => {
  const numericClientId = requirePositiveClientId(req.params.clientId);
  const ClientProgress = getClientProgressModel();
  const fields = ['userId', ...COMPARISON_LEVEL_FIELDS.map(({ field }) => field)];
  const [clientProgress, cohortProgress] = await Promise.all([
    ClientProgress.findOne({ where: { userId: numericClientId }, attributes: fields }),
    ClientProgress.findAll({
      where: { userId: { [Op.ne]: numericClientId } },
      attributes: fields,
      limit: 500,
    }),
  ]);
  return res.status(200).json(buildComparisonAnalytics({
    clientProgress,
    cohortProgress,
    comparisonType: req.query.type,
    timeframe: req.query.timeframe,
  }));
}, 'Error fetching client comparison analytics:', 'Server error fetching comparison analytics');

export const getClientGoals = clientProgressHandler(async (req, res) => {
  const numericClientId = requirePositiveClientId(req.params.clientId);
  const Goal = getGoal();
  const goals = Goal ? await Goal.findAll({
    where: { userId: numericClientId, status: { [Op.in]: GOAL_STATUSES } },
    order: [['updatedAt', 'DESC']],
    limit: 100,
  }) : [];
  return res.status(200).json(buildGoalTrackingData({ goals }));
}, 'Error fetching client goal tracking:', 'Server error fetching goal tracking');

export const createClientGoal = clientProgressHandler(async (req, res) => {
  const numericClientId = requirePositiveClientId(req.params.clientId);
  const Goal = getGoal();
  const goal = await Goal.create({
    userId: numericClientId,
    ...normalizeGoalCreatePayload(req.body),
  });
  return res.status(201).json({
    success: true,
    goal: buildGoalTrackingData({ goals: [goal] }).goals[0],
  });
}, 'Error creating client goal:', 'Server error creating goal');

export const updateClientGoal = clientProgressHandler(async (req, res) => {
  const numericClientId = requirePositiveClientId(req.params.clientId);
  const Goal = getGoal();
  const goal = await Goal.findOne({ where: { userId: numericClientId, id: req.params.goalId } });
  if (!goal) return sendNotFound(res, 'Goal not found');

  goal.set(normalizeGoalUpdatePayload(req.body, goal));
  await goal.save();
  return res.status(200).json({
    success: true,
    goal: buildGoalTrackingData({ goals: [goal] }).goals[0],
  });
}, 'Error updating client goal:', 'Server error updating goal');

export const getClientInjuryRiskAssessment = clientProgressHandler(async (req, res) => {
  const numericClientId = requirePositiveClientId(req.params.clientId);
  const ClientProgress = getClientProgressModel();
  const ClientPainEntry = getClientPainEntry();
  const WorkoutSession = getWorkoutSession();
  const [clientProgress, painEntries, recentSessions] = await Promise.all([
    ClientProgress.findOne({
      where: { userId: numericClientId },
      attributes: [
        'userId',
        'balanceLevel',
        'stabilityLevel',
        'flexibilityLevel',
        'injuryPreventionLevel',
        'injuryRecoveryLevel',
      ],
    }),
    ClientPainEntry ? ClientPainEntry.findAll({
      where: { userId: numericClientId, isActive: true },
      order: [['updatedAt', 'DESC']],
      limit: 50,
    }) : [],
    WorkoutSession ? WorkoutSession.findAll({
      where: { userId: numericClientId, status: 'completed' },
      order: [['date', 'DESC']],
      limit: 40,
      attributes: ['id', 'title', 'date', 'duration', 'intensity', 'avgRPE', 'completedAt', 'updatedAt'],
    }) : [],
  ]);
  return res.status(200).json(buildInjuryRiskAssessment({
    clientProgress,
    painEntries,
    recentSessions,
  }));
}, 'Error fetching client injury risk assessment:', 'Server error fetching injury risk assessment');

export const getTargetClientProgress = clientProgressHandler(async (req, res) => {
  const userId = requirePositiveClientId(req.params.userId, 'userId');
  const client = await findClientOrNull(userId, ['id', 'firstName', 'lastName', 'username', 'photo']);
  if (!client) return sendNotFound(res, 'Client not found');

  const progress = await getClientProgressModel().findOne({ where: { userId } });
  if (!progress) return sendNotFound(res, 'Client progress record not found');
  return res.status(200).json({ success: true, client, progress });
}, 'Error fetching client progress:', 'Server error fetching progress data');

export const updateTargetClientProgress = clientProgressHandler(async (req, res) => {
  const userId = requirePositiveClientId(req.params.userId, 'userId');
  const client = await findClientOrNull(userId);
  if (!client) return sendNotFound(res, 'Client not found');

  const clientProgress = await getClientProgressModel().findOne({ where: { userId } });
  if (!clientProgress) return sendNotFound(res, 'Client progress record not found');
  applyTrainerProgressUpdates(clientProgress, req.body);
  await clientProgress.save();
  return res.status(200).json({
    success: true,
    message: 'Progress updated successfully by trainer/admin',
    progress: clientProgress,
  });
}, 'Error updating client progress:', 'Server error updating progress data');

export const getClientProgress = clientProgressHandler(
  getLegacyClientProgress,
  'Failed to load client progress',
  'Failed to load client progress',
);

export const getMeasurementHistory = clientProgressHandler(
  getLegacyMeasurementHistory,
  'Failed to load measurement history',
  'Failed to load measurement history',
);

export const createMeasurement = clientProgressHandler(
  createLegacyMeasurement,
  'Failed to create measurement',
  'Failed to create measurement',
);

/**
 * FILE: clientProgressController.mjs
 * SYSTEM: Client Progress Tracking
 *
 * PURPOSE:
 * Provide progress summaries and measurement history for client dashboards.
 *
 * ARCHITECTURE:
 * [Routes] -> [Controller] -> [Models: User, BodyMeasurement, ClientBaselineMeasurements, Session] -> [Response]
 */
import { getAllModels, Op } from '../models/index.mjs';
import logger from '../utils/logger.mjs';

const toNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const getRequesterId = (req) => {
  const id = Number(req.user?.id);
  return Number.isFinite(id) ? id : null;
};

const isUserAssignedToTrainer = async ({ ClientTrainerAssignment }, clientId, trainerId) => {
  if (!ClientTrainerAssignment) {
    return false;
  }

  const assignment = await ClientTrainerAssignment.findOne({
    where: {
      clientId,
      trainerId,
      status: 'active'
    }
  });

  return Boolean(assignment);
};

const ensureProgressAccess = async (req, clientId, models) => {
  const requesterId = getRequesterId(req);
  if (!requesterId) {
    return { allowed: false, status: 401, message: 'Invalid auth context' };
  }

  if (req.user?.role === 'admin') {
    return { allowed: true };
  }

  if (req.user?.role === 'client') {
    if (requesterId === clientId) {
      return { allowed: true };
    }
    return { allowed: false, status: 403, message: 'Access denied' };
  }

  if (req.user?.role === 'trainer') {
    const assigned = await isUserAssignedToTrainer(models, clientId, requesterId);
    if (!assigned) {
      return { allowed: false, status: 403, message: 'Access denied' };
    }
    return { allowed: true };
  }

  return { allowed: false, status: 403, message: 'Access denied' };
};

export const getClientProgress = async (req, res) => {
  try {
    const clientId = Number(req.params.userId);
    if (!Number.isFinite(clientId)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    const models = getAllModels();
    const { User, ClientBaselineMeasurements, BodyMeasurement, Session } = models;

    const client = await User.findByPk(clientId, {
      attributes: ['id', 'role', 'weight', 'masterPromptJson']
    });

    if (!client || client.role !== 'client') {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    const access = await ensureProgressAccess(req, clientId, models);
    if (!access.allowed) {
      return res.status(access.status || 403).json({ success: false, message: access.message });
    }

    const [latestBaseline, latestMeasurement, firstMeasurement, sessionsCompleted, lastSession] =
      await Promise.all([
        ClientBaselineMeasurements?.findOne({
          where: { userId: clientId },
          order: [['takenAt', 'DESC']]
        }),
        BodyMeasurement?.findOne({
          where: { userId: clientId },
          order: [['measurementDate', 'DESC']]
        }),
        BodyMeasurement?.findOne({
          where: { userId: clientId },
          order: [['measurementDate', 'ASC']]
        }),
        Session?.count({
          where: { userId: clientId, status: 'completed' }
        }),
        Session?.findOne({
          where: {
            userId: clientId,
            status: 'completed',
            sessionDate: { [Op.not]: null }
          },
          order: [['sessionDate', 'DESC']]
        })
      ]);

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentMeasurements = await BodyMeasurement?.findAll({
      where: {
        userId: clientId,
        measurementDate: { [Op.gte]: thirtyDaysAgo }
      },
      attributes: ['measurementDate', 'weight', 'bodyFatPercentage'],
      order: [['measurementDate', 'DESC']],
      limit: 30
    });

    const masterPrompt = client.masterPromptJson || {};
    const measurementInfo = masterPrompt.measurements || {};

    const currentWeight =
      toNumber(latestMeasurement?.weight) ??
      toNumber(client.weight) ??
      toNumber(measurementInfo.currentWeight);
    const startingWeight =
      toNumber(firstMeasurement?.weight) ??
      toNumber(measurementInfo.currentWeight) ??
      currentWeight;
    const weightChange =
      currentWeight !== null && startingWeight !== null ? currentWeight - startingWeight : null;

    const goals = [];
    const targetWeight = toNumber(measurementInfo.targetWeight);
    if (targetWeight !== null) {
      goals.push({
        name: 'Target Weight',
        target: targetWeight,
        current: currentWeight,
        unit: 'lbs'
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        currentWeight,
        startingWeight,
        weightChange,
        nasmScore: toNumber(latestBaseline?.nasmAssessmentScore),
        sessionsCompleted: Number(sessionsCompleted || 0),
        lastSessionDate: lastSession?.sessionDate || null,
        goals,
        recentMeasurements: (recentMeasurements || []).map((row) => ({
          date: row.measurementDate,
          weight: toNumber(row.weight),
          bodyFat: toNumber(row.bodyFatPercentage)
        })).reverse()
      }
    });
  } catch (error) {
    logger.error('Failed to load client progress', { error: error.message });
    return res.status(500).json({ success: false, message: 'Failed to load client progress' });
  }
};

export const getMeasurementHistory = async (req, res) => {
  try {
    const clientId = Number(req.params.userId);
    if (!Number.isFinite(clientId)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    const models = getAllModels();
    const { User, BodyMeasurement } = models;

    const client = await User.findByPk(clientId, { attributes: ['id', 'role'] });
    if (!client || client.role !== 'client') {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    const access = await ensureProgressAccess(req, clientId, models);
    if (!access.allowed) {
      return res.status(access.status || 403).json({ success: false, message: access.message });
    }

    const type = String(req.query.type || 'weight');
    const allowedTypes = {
      weight: 'weight',
      bodyFat: 'bodyFatPercentage',
      chest: 'chest',
      waist: 'naturalWaist',
      hips: 'hips'
    };

    const field = allowedTypes[type];
    if (!field) {
      return res.status(400).json({
        success: false,
        message: `Unsupported measurement type: ${type}`
      });
    }

    const limit = Math.min(Math.max(Number(req.query.limit) || 30, 1), 365);
    const measurements = await BodyMeasurement.findAll({
      where: {
        userId: clientId,
        [field]: { [Op.not]: null }
      },
      attributes: ['measurementDate', field],
      order: [['measurementDate', 'DESC']],
      limit
    });

    return res.status(200).json({
      success: true,
      data: measurements
        .map((row) => ({
          date: row.measurementDate,
          value: toNumber(row[field]),
          type
        }))
        .reverse()
    });
  } catch (error) {
    logger.error('Failed to load measurement history', { error: error.message });
    return res.status(500).json({ success: false, message: 'Failed to load measurement history' });
  }
};

export const createMeasurement = async (req, res) => {
  try {
    const clientId = Number(req.params.userId);
    if (!Number.isFinite(clientId)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    const models = getAllModels();
    const { User, BodyMeasurement } = models;

    const client = await User.findByPk(clientId, { attributes: ['id', 'role'] });
    if (!client || client.role !== 'client') {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    const access = await ensureProgressAccess(req, clientId, models);
    if (!access.allowed) {
      return res.status(access.status || 403).json({ success: false, message: access.message });
    }

    const {
      measurementDate,
      weight,
      bodyFat,
      chest,
      waist,
      hips,
      arms,
      thighs,
      notes
    } = req.body || {};

    const hasMetrics = [
      weight,
      bodyFat,
      chest,
      waist,
      hips,
      arms,
      thighs
    ].some((value) => value !== undefined && value !== null && value !== '');

    if (!hasMetrics) {
      return res.status(400).json({
        success: false,
        message: 'At least one measurement value is required'
      });
    }

    const parsedDate = measurementDate ? new Date(measurementDate) : new Date();
    if (Number.isNaN(parsedDate.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid measurementDate' });
    }

    const requesterId = getRequesterId(req);
    if (!requesterId) {
      return res.status(401).json({ success: false, message: 'Invalid auth context' });
    }

    const measurement = await BodyMeasurement.create({
      userId: clientId,
      recordedBy: requesterId,
      measurementDate: parsedDate,
      weight,
      bodyFatPercentage: bodyFat,
      chest,
      naturalWaist: waist,
      hips,
      rightBicep: arms,
      leftBicep: arms,
      rightThigh: thighs,
      leftThigh: thighs,
      notes
    });

    return res.status(201).json({
      success: true,
      measurement
    });
  } catch (error) {
    logger.error('Failed to create measurement', { error: error.message });
    return res.status(500).json({ success: false, message: 'Failed to create measurement' });
  }
};

import { getBodyMeasurement, getMeasurementMilestone, getUser, getNotification } from '../models/index.mjs';
import sequelize from '../database.mjs';
import { calculateComparisons } from '../services/measurementComparisonService.mjs';
import { detectMilestones } from '../services/measurementMilestoneService.mjs';
import { syncMeasurementDates } from '../services/measurementScheduleService.mjs';
import { Op } from 'sequelize';

/**
 * Body Measurement Controller
 * Handles CRUD operations for body measurements
 * Auto-triggers comparison calculations and milestone detection
 */

/**
 * Create new body measurement
 * POST /api/measurements
 */
export async function createMeasurement(req, res) {
  const transaction = await sequelize.transaction();

  try {
    const {
      userId,
      measurementDate,
      weight,
      weightUnit,
      bodyFatPercentage,
      muscleMassPercentage,
      bmi,
      circumferenceUnit,
      neck,
      shoulders,
      chest,
      upperChest,
      underChest,
      rightBicep,
      leftBicep,
      rightForearm,
      leftForearm,
      naturalWaist,
      umbilicus,
      lowerWaist,
      hips,
      rightThigh,
      leftThigh,
      rightCalf,
      leftCalf,
      notes,
      measurementMethod,
      photoUrls
    } = req.body;

    // Use provided userId or current user's ID (for client self-entry)
    const targetUserId = userId || req.user.id;

    // Create measurement
    const BodyMeasurement = getBodyMeasurement();
    const measurement = await BodyMeasurement.create({
      userId: targetUserId,
      recordedBy: req.user.id,
      measurementDate: measurementDate || new Date(),
      weight,
      weightUnit: weightUnit || 'lbs',
      bodyFatPercentage,
      muscleMassPercentage,
      bmi,
      circumferenceUnit: circumferenceUnit || 'inches',
      neck,
      shoulders,
      chest,
      upperChest,
      underChest,
      rightBicep,
      leftBicep,
      rightForearm,
      leftForearm,
      naturalWaist,
      umbilicus,
      lowerWaist,
      hips,
      rightThigh,
      leftThigh,
      rightCalf,
      leftCalf,
      notes,
      measurementMethod: measurementMethod || 'manual',
      photoUrls: photoUrls || [],
      isVerified: req.user.role === 'admin' || req.user.role === 'trainer'
    }, { transaction });

    // Auto-calculate comparisons
    const comparisonResult = await calculateComparisons(targetUserId, measurement.id);

    // Update measurement with comparison data
    await measurement.update({
      comparisonData: comparisonResult.comparisonData,
      hasProgress: comparisonResult.hasProgress,
      progressScore: comparisonResult.progressScore
    }, { transaction });

    // Auto-detect milestones
    const milestones = await detectMilestones(targetUserId, measurement);

    await transaction.commit();

    // Post-commit: sync measurement schedule dates on User (non-blocking)
    syncMeasurementDates(getUser(), targetUserId, measurement).catch(err =>
      console.warn('Failed to sync measurement dates:', err.message)
    );

    // Post-commit: clear persistent overdue measurement notifications (non-blocking)
    try {
      const NotificationModel = getNotification();
      if (NotificationModel) {
        NotificationModel.update(
          { read: true },
          { where: { type: 'measurement', relatedEntityId: targetUserId, persistent: true, read: false } }
        ).catch(err =>
          console.warn('Failed to clear measurement notifications:', err.message)
        );
      }
    } catch {
      // Notification model not initialized yet — skip
    }

    res.status(201).json({
      success: true,
      data: {
        measurement,
        milestones,
        comparisonSummary: {
          hasProgress: comparisonResult.hasProgress,
          progressScore: comparisonResult.progressScore,
          insights: comparisonResult.comparisonData.insights,
          celebrationMessage: comparisonResult.comparisonData.celebrationMessage
        }
      }
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Error creating measurement:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create measurement',
      error: error.message
    });
  }
}

/**
 * Get measurements for a user
 * GET /api/measurements/user/:userId
 */
export async function getUserMeasurements(req, res) {
  try {
    const { userId } = req.params;
    const { limit = 20, offset = 0, startDate, endDate } = req.query;

    const whereClause = { userId };

    if (startDate || endDate) {
      whereClause.measurementDate = {};
      if (startDate) whereClause.measurementDate[Op.gte] = new Date(startDate);
      if (endDate) whereClause.measurementDate[Op.lte] = new Date(endDate);
    }

    const BodyMeasurement = getBodyMeasurement();
    const User = getUser();

    const measurements = await BodyMeasurement.findAll({
      where: whereClause,
      order: [['measurementDate', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
      include: [{
        model: User,
        as: 'recorder',
        attributes: ['id', 'username', 'firstName', 'lastName']
      }]
    });

    const total = await BodyMeasurement.count({ where: whereClause });

    res.json({
      success: true,
      data: {
        measurements,
        pagination: {
          total,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: offset + measurements.length < total
        }
      }
    });

  } catch (error) {
    console.error('Error getting user measurements:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get measurements',
      error: error.message
    });
  }
}

/**
 * Get single measurement by ID
 * GET /api/measurements/:id
 */
export async function getMeasurementById(req, res) {
  try {
    const { id } = req.params;

    const BodyMeasurement = getBodyMeasurement();
    const User = getUser();
    const MeasurementMilestone = getMeasurementMilestone();

    const measurement = await BodyMeasurement.findByPk(id, {
      include: [
        {
          model: User,
          as: 'recorder',
          attributes: ['id', 'username', 'firstName', 'lastName']
        },
        {
          model: MeasurementMilestone,
          as: 'milestones',
          order: [['achievedAt', 'DESC']]
        }
      ]
    });

    if (!measurement) {
      return res.status(404).json({
        success: false,
        message: 'Measurement not found'
      });
    }

    res.json({
      success: true,
      data: measurement
    });

  } catch (error) {
    console.error('Error getting measurement:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get measurement',
      error: error.message
    });
  }
}

/**
 * Update measurement
 * PUT /api/measurements/:id
 */
export async function updateMeasurement(req, res) {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;
    const BodyMeasurement = getBodyMeasurement();
    const measurement = await BodyMeasurement.findByPk(id);

    if (!measurement) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Measurement not found'
      });
    }

    // Update measurement
    await measurement.update(req.body, { transaction });

    // Recalculate comparisons if measurement data changed
    const comparisonResult = await calculateComparisons(measurement.userId, measurement.id);

    await measurement.update({
      comparisonData: comparisonResult.comparisonData,
      hasProgress: comparisonResult.hasProgress,
      progressScore: comparisonResult.progressScore
    }, { transaction });

    // Re-detect milestones (will skip duplicates)
    const milestones = await detectMilestones(measurement.userId, measurement);

    await transaction.commit();

    res.json({
      success: true,
      data: {
        measurement,
        milestones
      }
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Error updating measurement:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update measurement',
      error: error.message
    });
  }
}

/**
 * Delete measurement
 * DELETE /api/measurements/:id
 */
export async function deleteMeasurement(req, res) {
  try {
    const { id } = req.params;
    const BodyMeasurement = getBodyMeasurement();
    const measurement = await BodyMeasurement.findByPk(id);

    if (!measurement) {
      return res.status(404).json({
        success: false,
        message: 'Measurement not found'
      });
    }

    await measurement.destroy();

    res.json({
      success: true,
      message: 'Measurement deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting measurement:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete measurement',
      error: error.message
    });
  }
}

/**
 * Get latest measurement for user
 * GET /api/measurements/user/:userId/latest
 */
export async function getLatestMeasurement(req, res) {
  try {
    const { userId } = req.params;

    const BodyMeasurement = getBodyMeasurement();
    const User = getUser();
    const MeasurementMilestone = getMeasurementMilestone();

    const measurement = await BodyMeasurement.findOne({
      where: { userId },
      order: [['measurementDate', 'DESC']],
      include: [
        {
          model: User,
          as: 'recorder',
          attributes: ['id', 'username', 'firstName', 'lastName']
        },
        {
          model: MeasurementMilestone,
          as: 'milestones',
          order: [['achievedAt', 'DESC']],
          limit: 5
        }
      ]
    });

    if (!measurement) {
      return res.status(404).json({
        success: false,
        message: 'No measurements found for user'
      });
    }

    res.json({
      success: true,
      data: measurement
    });

  } catch (error) {
    console.error('Error getting latest measurement:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get latest measurement',
      error: error.message
    });
  }
}

/**
 * Upload progress photos
 * POST /api/measurements/:id/photos
 */
export async function uploadProgressPhotos(req, res) {
  try {
    const { id } = req.params;
    const { photoUrls } = req.body;

    const BodyMeasurement = getBodyMeasurement();
    const measurement = await BodyMeasurement.findByPk(id);

    if (!measurement) {
      return res.status(404).json({
        success: false,
        message: 'Measurement not found'
      });
    }

    // Merge new photos with existing
    const existingPhotos = measurement.photoUrls || [];
    const updatedPhotos = [...existingPhotos, ...photoUrls];

    await measurement.update({
      photoUrls: updatedPhotos
    });

    res.json({
      success: true,
      data: measurement
    });

  } catch (error) {
    console.error('Error uploading photos:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload photos',
      error: error.message
    });
  }
}

/**
 * Get measurement statistics for a user
 * GET /api/measurements/user/:userId/stats
 */
export async function getMeasurementStats(req, res) {
  try {
    const { userId } = req.params;
    const BodyMeasurement = getBodyMeasurement();

    const [firstMeasurement, latestMeasurement, totalMeasurements, measurementsWithProgress] = await Promise.all([
      BodyMeasurement.findOne({
        where: { userId },
        order: [['measurementDate', 'ASC']]
      }),
      BodyMeasurement.findOne({
        where: { userId },
        order: [['measurementDate', 'DESC']]
      }),
      BodyMeasurement.count({ where: { userId } }),
      BodyMeasurement.count({ where: { userId, hasProgress: true } })
    ]);

    if (!firstMeasurement || !latestMeasurement) {
      return res.json({
        success: true,
        data: {
          totalMeasurements: 0,
          message: 'No measurements found'
        }
      });
    }

    const daysSinceStart = Math.floor(
      (new Date(latestMeasurement.measurementDate) - new Date(firstMeasurement.measurementDate)) / (1000 * 60 * 60 * 24)
    );

    const stats = {
      totalMeasurements,
      measurementsWithProgress,
      progressPercentage: totalMeasurements > 0 ? ((measurementsWithProgress / totalMeasurements) * 100).toFixed(1) : 0,
      daysSinceStart,
      avgProgressScore: latestMeasurement.progressScore || 0,
      firstMeasurement: {
        date: firstMeasurement.measurementDate,
        weight: firstMeasurement.weight,
        bodyFat: firstMeasurement.bodyFatPercentage,
        waist: firstMeasurement.naturalWaist
      },
      latestMeasurement: {
        date: latestMeasurement.measurementDate,
        weight: latestMeasurement.weight,
        bodyFat: latestMeasurement.bodyFatPercentage,
        waist: latestMeasurement.naturalWaist
      },
      totalChange: {
        weight: latestMeasurement.weight && firstMeasurement.weight
          ? (latestMeasurement.weight - firstMeasurement.weight).toFixed(2)
          : null,
        bodyFat: latestMeasurement.bodyFatPercentage && firstMeasurement.bodyFatPercentage
          ? (latestMeasurement.bodyFatPercentage - firstMeasurement.bodyFatPercentage).toFixed(2)
          : null,
        waist: latestMeasurement.naturalWaist && firstMeasurement.naturalWaist
          ? (latestMeasurement.naturalWaist - firstMeasurement.naturalWaist).toFixed(2)
          : null
      }
    };

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error getting measurement stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get measurement stats',
      error: error.message
    });
  }
}

/**
 * Get measurement schedule status for a specific user
 * GET /api/measurements/schedule/status/:userId
 */
export async function getScheduleStatus(req, res) {
  try {
    const { userId } = req.params;
    const { getMeasurementStatus } = await import('../services/measurementScheduleService.mjs');

    const User = getUser();
    const user = await User.findByPk(userId, {
      attributes: [
        'id', 'firstName', 'lastName',
        'lastFullMeasurementDate', 'lastWeighInDate',
        'measurementIntervalDays', 'weighInIntervalDays',
      ],
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const status = getMeasurementStatus(user);

    res.json({ success: true, data: { userId: user.id, ...status } });
  } catch (error) {
    console.error('Error getting schedule status:', error);
    res.status(500).json({ success: false, message: 'Failed to get schedule status', error: error.message });
  }
}

/**
 * Get clients with upcoming or overdue measurement checks
 * GET /api/measurements/schedule/upcoming
 */
export async function getUpcomingChecks(req, res) {
  try {
    const { limit = 20 } = req.query;
    const { getClientsWithUpcomingChecks } = await import('../services/measurementScheduleService.mjs');

    const clients = await getClientsWithUpcomingChecks(getUser(), parseInt(limit));

    res.json({ success: true, data: { clients } });
  } catch (error) {
    console.error('Error getting upcoming checks:', error);
    res.status(500).json({ success: false, message: 'Failed to get upcoming checks', error: error.message });
  }
}

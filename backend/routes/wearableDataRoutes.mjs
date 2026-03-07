/**
 * Wearable Data Routes
 * ====================
 * API endpoints for syncing, querying, and managing wearable health data.
 * Supports: Fitbit, Apple Health, Garmin, Samsung Health, Whoop, Oura, Polar, COROS.
 *
 * Data formats are normalized from each device's native export format.
 */

import { Router } from 'express';
import { protect, adminOnly } from '../middleware/authMiddleware.mjs';
import WearableData from '../models/WearableData.mjs';
import { getUser } from '../models/index.mjs';
import logger from '../utils/logger.mjs';
import { Op } from 'sequelize';

const router = Router();

// ---- Device data parsers ----
// Each parser normalizes device-specific data into our WearableData schema.

const parsers = {
  /**
   * Fitbit daily summary format
   * Fitbit Web API: /1/user/-/activities/date/{date}.json
   */
  fitbit(raw) {
    const s = raw.summary || raw;
    const sleep = raw.sleep?.[0] || {};
    return {
      steps: s.steps,
      distanceMeters: s.distances?.find(d => d.activity === 'total')?.distance * 1609.34 || null,
      floorsClimbed: s.floors,
      activeMinutes: (s.fairlyActiveMinutes || 0) + (s.veryActiveMinutes || 0),
      caloriesBurned: s.caloriesOut,
      activeCalories: s.activityCalories,
      restingHeartRate: s.restingHeartRate,
      heartRateZones: s.heartRateZones ? {
        outOfRange: s.heartRateZones.find(z => z.name === 'Out of Range')?.minutes,
        fatBurn: s.heartRateZones.find(z => z.name === 'Fat Burn')?.minutes,
        cardio: s.heartRateZones.find(z => z.name === 'Cardio')?.minutes,
        peak: s.heartRateZones.find(z => z.name === 'Peak')?.minutes,
      } : null,
      sleepDurationMinutes: sleep.duration ? Math.round(sleep.duration / 60000) : null,
      sleepScore: sleep.efficiency || null,
      sleepStages: sleep.levels?.summary ? {
        deep: sleep.levels.summary.deep?.minutes,
        light: sleep.levels.summary.light?.minutes,
        rem: sleep.levels.summary.rem?.minutes,
        awake: sleep.levels.summary.wake?.minutes,
      } : null,
      // Swimming (Fitbit swim tracking)
      swimLaps: raw.swimming?.laps,
      swimDistanceMeters: raw.swimming?.distance ? raw.swimming.distance * 1609.34 : null,
      swimDurationMinutes: raw.swimming?.duration ? Math.round(raw.swimming.duration / 60000) : null,
      swimStrokes: raw.swimming?.strokes,
      // Cycling (Fitbit cycling)
      cyclingDistanceMeters: raw.cycling?.distance ? raw.cycling.distance * 1609.34 : null,
      cyclingDurationMinutes: raw.cycling?.duration ? Math.round(raw.cycling.duration / 60000) : null,
      cyclingAvgSpeedKmh: raw.cycling?.speed ? raw.cycling.speed * 1.60934 : null,
      // Running (Fitbit running)
      runDistanceMeters: raw.running?.distance ? raw.running.distance * 1609.34 : null,
      runDurationMinutes: raw.running?.duration ? Math.round(raw.running.duration / 60000) : null,
      runAvgPaceMinPerKm: raw.running?.pace ? raw.running.pace / 1.60934 : null,
    };
  },

  /**
   * Apple Health export XML -> JSON (pre-parsed by client)
   * Expects normalized daily aggregates from Apple Health export
   */
  apple_health(raw) {
    return {
      steps: raw.stepCount,
      distanceMeters: raw.distanceWalkingRunning ? raw.distanceWalkingRunning * 1000 : null,
      floorsClimbed: raw.flightsClimbed,
      activeMinutes: raw.appleExerciseTime,
      caloriesBurned: raw.activeEnergyBurned ? Math.round(raw.activeEnergyBurned + (raw.basalEnergyBurned || 0)) : null,
      activeCalories: raw.activeEnergyBurned ? Math.round(raw.activeEnergyBurned) : null,
      restingHeartRate: raw.restingHeartRate,
      avgHeartRate: raw.heartRate,
      heartRateVariability: raw.heartRateVariability,
      sleepDurationMinutes: raw.sleepAnalysis ? Math.round(raw.sleepAnalysis) : null,
      vo2Max: raw.vo2Max,
      respiratoryRate: raw.respiratoryRate,
      spo2: raw.oxygenSaturation ? raw.oxygenSaturation * 100 : null,
      weight: raw.bodyMass,
      bodyFatPercentage: raw.bodyFatPercentage ? raw.bodyFatPercentage * 100 : null,
      // Swimming (Apple Watch swim data)
      swimDistanceMeters: raw.distanceSwimming ? raw.distanceSwimming * 1000 : null,
      swimStrokes: raw.swimmingStrokeCount,
      swimDurationMinutes: raw.swimmingDuration ? Math.round(raw.swimmingDuration) : null,
      // Cycling (Apple Watch cycling data)
      cyclingDistanceMeters: raw.distanceCycling ? raw.distanceCycling * 1000 : null,
      cyclingDurationMinutes: raw.cyclingDuration ? Math.round(raw.cyclingDuration) : null,
      cyclingAvgPowerWatts: raw.cyclingPower,
      cyclingAvgCadence: raw.cyclingCadence,
      // Running (Apple Watch running data)
      runDistanceMeters: raw.distanceWalkingRunning ? raw.distanceWalkingRunning * 1000 : null,
      runDurationMinutes: raw.runningDuration ? Math.round(raw.runningDuration) : null,
      runGroundContactTime: raw.groundContactTime,
      runVerticalOscillation: raw.verticalOscillation,
    };
  },

  /**
   * Garmin Connect daily summary
   * Garmin Connect API: /wellness-api/rest/dailies/{date}
   */
  garmin(raw) {
    return {
      steps: raw.totalSteps,
      distanceMeters: raw.totalDistanceMeters,
      floorsClimbed: raw.floorsAscended,
      activeMinutes: (raw.moderateIntensityMinutes || 0) + (raw.vigorousIntensityMinutes || 0),
      caloriesBurned: raw.totalKilocalories,
      activeCalories: raw.activeKilocalories,
      restingHeartRate: raw.restingHeartRate,
      avgHeartRate: raw.averageHeartRate,
      maxHeartRate: raw.maxHeartRate,
      heartRateVariability: raw.hrvSummary?.lastNightAvg,
      stressLevel: raw.averageStressLevel,
      bodyBatteryOrRecovery: raw.bodyBatteryChargedValue,
      sleepDurationMinutes: raw.sleepTimeSeconds ? Math.round(raw.sleepTimeSeconds / 60) : null,
      sleepScore: raw.sleepScores?.overall,
      sleepStages: raw.sleepLevels ? {
        deep: raw.sleepLevels.deepSleepSeconds ? Math.round(raw.sleepLevels.deepSleepSeconds / 60) : null,
        light: raw.sleepLevels.lightSleepSeconds ? Math.round(raw.sleepLevels.lightSleepSeconds / 60) : null,
        rem: raw.sleepLevels.remSleepSeconds ? Math.round(raw.sleepLevels.remSleepSeconds / 60) : null,
        awake: raw.sleepLevels.awakeSleepSeconds ? Math.round(raw.sleepLevels.awakeSleepSeconds / 60) : null,
      } : null,
      vo2Max: raw.vo2MaxValue,
      respiratoryRate: raw.respirationAvg,
      spo2: raw.averageSPO2,
      // Swimming (Garmin swim activities)
      swimLaps: raw.swimming?.totalLaps,
      swimDistanceMeters: raw.swimming?.totalDistanceMeters,
      swimDurationMinutes: raw.swimming?.durationSeconds ? Math.round(raw.swimming.durationSeconds / 60) : null,
      swimStrokes: raw.swimming?.totalStrokes,
      swimPacePer100m: raw.swimming?.avgPacePer100m,
      swimStrokeType: raw.swimming?.primaryStrokeType,
      swimSWOLF: raw.swimming?.avgSwolf,
      poolLengthMeters: raw.swimming?.poolLength,
      // Cycling (Garmin cycling activities)
      cyclingDistanceMeters: raw.cycling?.totalDistanceMeters,
      cyclingDurationMinutes: raw.cycling?.durationSeconds ? Math.round(raw.cycling.durationSeconds / 60) : null,
      cyclingAvgSpeedKmh: raw.cycling?.avgSpeed,
      cyclingMaxSpeedKmh: raw.cycling?.maxSpeed,
      cyclingAvgPowerWatts: raw.cycling?.avgPower,
      cyclingMaxPowerWatts: raw.cycling?.maxPower,
      cyclingAvgCadence: raw.cycling?.avgCadence,
      cyclingElevationGainMeters: raw.cycling?.elevationGain,
      cyclingNormalizedPower: raw.cycling?.normalizedPower,
      // Running (Garmin running activities)
      runDistanceMeters: raw.running?.totalDistanceMeters,
      runDurationMinutes: raw.running?.durationSeconds ? Math.round(raw.running.durationSeconds / 60) : null,
      runAvgPaceMinPerKm: raw.running?.avgPaceMinPerKm,
      runAvgCadence: raw.running?.avgCadence,
      runElevationGainMeters: raw.running?.elevationGain,
      runGroundContactTime: raw.running?.groundContactTime,
      runVerticalOscillation: raw.running?.verticalOscillation,
      runTrainingEffect: raw.running?.trainingEffect,
    };
  },

  /**
   * Samsung Health export (JSON format)
   */
  samsung_health(raw) {
    return {
      steps: raw.step_count,
      distanceMeters: raw.distance,
      activeMinutes: raw.active_time ? Math.round(raw.active_time / 60000) : null,
      caloriesBurned: raw.calorie ? Math.round(raw.calorie) : null,
      restingHeartRate: raw.heart_rate?.resting,
      avgHeartRate: raw.heart_rate?.average,
      maxHeartRate: raw.heart_rate?.max,
      sleepDurationMinutes: raw.sleep?.duration ? Math.round(raw.sleep.duration / 60000) : null,
      sleepScore: raw.sleep?.score,
      stressLevel: raw.stress?.average,
      spo2: raw.oxygen_saturation,
    };
  },

  /**
   * Whoop recovery/cycle data
   */
  whoop(raw) {
    const cycle = raw.cycle || raw;
    const recovery = raw.recovery || {};
    const sleep = raw.sleep || {};
    return {
      caloriesBurned: cycle.kilojoules ? Math.round(cycle.kilojoules / 4.184) : null,
      activeCalories: cycle.strain_kilojoules ? Math.round(cycle.strain_kilojoules / 4.184) : null,
      avgHeartRate: cycle.average_heart_rate,
      maxHeartRate: cycle.max_heart_rate,
      heartRateVariability: recovery.hrv_rmssd_milli,
      restingHeartRate: recovery.resting_heart_rate,
      bodyBatteryOrRecovery: recovery.score ? Math.round(recovery.score * 100) : null,
      sleepDurationMinutes: sleep.total_in_bed_time_milli ? Math.round(sleep.total_in_bed_time_milli / 60000) : null,
      sleepScore: sleep.score ? Math.round(sleep.score * 100) : null,
      sleepStages: sleep.stage_summary ? {
        deep: sleep.stage_summary.total_slow_wave_sleep_time_milli ? Math.round(sleep.stage_summary.total_slow_wave_sleep_time_milli / 60000) : null,
        light: sleep.stage_summary.total_light_sleep_time_milli ? Math.round(sleep.stage_summary.total_light_sleep_time_milli / 60000) : null,
        rem: sleep.stage_summary.total_rem_sleep_time_milli ? Math.round(sleep.stage_summary.total_rem_sleep_time_milli / 60000) : null,
        awake: sleep.stage_summary.total_awake_time_milli ? Math.round(sleep.stage_summary.total_awake_time_milli / 60000) : null,
      } : null,
      spo2: recovery.spo2_percentage,
      respiratoryRate: sleep.respiratory_rate,
    };
  },

  /**
   * Oura Ring daily readiness/sleep data
   */
  oura(raw) {
    const readiness = raw.readiness || {};
    const sleep = raw.sleep || {};
    const activity = raw.activity || {};
    return {
      steps: activity.steps,
      caloriesBurned: activity.cal_total,
      activeCalories: activity.cal_active,
      activeMinutes: activity.high ? activity.high + (activity.medium || 0) : null,
      restingHeartRate: sleep.hr_lowest,
      avgHeartRate: sleep.hr_average,
      heartRateVariability: sleep.rmssd,
      bodyBatteryOrRecovery: readiness.score,
      sleepDurationMinutes: sleep.total ? Math.round(sleep.total / 60) : null,
      sleepScore: sleep.score,
      sleepStages: {
        deep: sleep.deep ? Math.round(sleep.deep / 60) : null,
        light: sleep.light ? Math.round(sleep.light / 60) : null,
        rem: sleep.rem ? Math.round(sleep.rem / 60) : null,
        awake: sleep.awake ? Math.round(sleep.awake / 60) : null,
      },
      respiratoryRate: sleep.breath_average,
      spo2: sleep.spo2_percentage?.average,
    };
  },

  /**
   * Manual entry — data comes pre-formatted
   */
  manual(raw) {
    return { ...raw };
  },
};

// ---- Routes ----

/**
 * POST /api/wearable-data/sync
 * Sync wearable data (single day or batch)
 * Body: { deviceType, data: [{recordDate, ...fields}] } or { deviceType, recordDate, ...fields }
 */
router.post('/sync', protect, async (req, res) => {
  try {
    const { deviceType, data, recordDate, deviceId } = req.body;

    if (!deviceType || !WearableData.DEVICE_TYPES.includes(deviceType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid deviceType. Must be one of: ${WearableData.DEVICE_TYPES.join(', ')}`,
      });
    }

    const parser = parsers[deviceType] || parsers.manual;
    const items = Array.isArray(data) ? data : [{ recordDate, ...req.body }];
    const results = [];

    for (const item of items) {
      if (!item.recordDate) continue;

      const parsed = parser(item);
      const record = {
        userId: req.user.id,
        deviceType,
        deviceId: deviceId || item.deviceId || null,
        recordDate: item.recordDate,
        ...parsed,
        rawPayload: item,
        syncedAt: new Date(),
        dataQuality: deviceType === 'manual' ? 0.7 : 1.0,
      };

      // Remove undefined/null values from parsed so defaults aren't overwritten
      Object.keys(record).forEach(k => { if (record[k] === undefined) delete record[k]; });

      // Upsert by (userId, deviceType, recordDate)
      const [saved, created] = await WearableData.upsert(record, {
        conflictFields: ['userId', 'deviceType', 'recordDate'],
      });

      results.push({ recordDate: item.recordDate, created, id: saved.id });
    }

    res.json({
      success: true,
      message: `Synced ${results.length} record(s) from ${deviceType}`,
      results,
    });
  } catch (error) {
    logger.error('[WearableData] Sync error:', error);
    res.status(500).json({ success: false, message: 'Failed to sync wearable data' });
  }
});

/**
 * GET /api/wearable-data
 * Get own wearable data with optional filters
 * Query: ?days=30&deviceType=fitbit&metrics=steps,heartRate
 */
router.get('/', protect, async (req, res) => {
  try {
    const { days = 30, deviceType, startDate, endDate, limit: qLimit, offset: qOffset } = req.query;
    const limit = Math.min(parseInt(qLimit, 10) || 200, 1000);
    const offset = parseInt(qOffset, 10) || 0;

    const where = { userId: req.user.id };

    if (deviceType) where.deviceType = deviceType;

    if (startDate && endDate) {
      where.recordDate = { [Op.between]: [startDate, endDate] };
    } else {
      const start = new Date();
      start.setDate(start.getDate() - parseInt(days, 10));
      where.recordDate = { [Op.gte]: start.toISOString().split('T')[0] };
    }

    const { rows: data, count: total } = await WearableData.findAndCountAll({
      where,
      order: [['recordDate', 'DESC']],
      attributes: { exclude: ['rawPayload'] },
      limit,
      offset,
    });

    res.json({ success: true, data, count: data.length, total, limit, offset });
  } catch (error) {
    logger.error('[WearableData] Fetch error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch wearable data' });
  }
});

/**
 * GET /api/wearable-data/summary
 * Aggregated summary for dashboard charts
 * Query: ?weeks=12
 */
router.get('/summary', protect, async (req, res) => {
  try {
    const weeks = parseInt(req.query.weeks, 10) || 12;
    const weeklyAverages = await WearableData.getWeeklyAverages(req.user.id, weeks);

    // Also get most recent day's data
    const latest = await WearableData.findOne({
      where: { userId: req.user.id },
      order: [['recordDate', 'DESC']],
      attributes: { exclude: ['rawPayload'] },
    });

    // Get connected devices
    const devices = await WearableData.findAll({
      where: { userId: req.user.id },
      attributes: ['deviceType'],
      group: ['deviceType'],
    });

    res.json({
      success: true,
      latest: latest || null,
      weeklyAverages,
      connectedDevices: devices.map(d => d.deviceType),
    });
  } catch (error) {
    logger.error('[WearableData] Summary error:', error);
    res.status(500).json({ success: false, message: 'Failed to get wearable summary' });
  }
});

/**
 * GET /api/wearable-data/user/:userId
 * Admin/Trainer: View client's wearable data
 */
router.get('/user/:userId', protect, async (req, res) => {
  try {
    const { userId } = req.params;
    const { days = 30, deviceType, limit: qLimit, offset: qOffset } = req.query;
    const limit = Math.min(parseInt(qLimit, 10) || 200, 1000);
    const offset = parseInt(qOffset, 10) || 0;

    // Authorization: admin, trainer, or self
    if (req.user.role !== 'admin' && req.user.role !== 'trainer' && req.user.id !== parseInt(userId, 10)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const where = { userId: parseInt(userId, 10) };
    if (deviceType) where.deviceType = deviceType;
    const start = new Date();
    start.setDate(start.getDate() - parseInt(days, 10));
    where.recordDate = { [Op.gte]: start.toISOString().split('T')[0] };

    const { rows: data, count: total } = await WearableData.findAndCountAll({
      where,
      order: [['recordDate', 'DESC']],
      attributes: { exclude: ['rawPayload'] },
      limit,
      offset,
    });

    res.json({ success: true, data, count: data.length, total, limit, offset });
  } catch (error) {
    logger.error('[WearableData] User fetch error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch client wearable data' });
  }
});

/**
 * GET /api/wearable-data/user/:userId/summary
 * Admin/Trainer: Client wearable summary for dashboard
 */
router.get('/user/:userId/summary', protect, async (req, res) => {
  try {
    const { userId } = req.params;
    const weeks = parseInt(req.query.weeks, 10) || 12;

    if (req.user.role !== 'admin' && req.user.role !== 'trainer' && req.user.id !== parseInt(userId, 10)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const weeklyAverages = await WearableData.getWeeklyAverages(parseInt(userId, 10), weeks);

    const latest = await WearableData.findOne({
      where: { userId: parseInt(userId, 10) },
      order: [['recordDate', 'DESC']],
      attributes: { exclude: ['rawPayload'] },
    });

    const devices = await WearableData.findAll({
      where: { userId: parseInt(userId, 10) },
      attributes: ['deviceType'],
      group: ['deviceType'],
    });

    res.json({
      success: true,
      latest: latest || null,
      weeklyAverages,
      connectedDevices: devices.map(d => d.deviceType),
    });
  } catch (error) {
    logger.error('[WearableData] Client summary error:', error);
    res.status(500).json({ success: false, message: 'Failed to get client wearable summary' });
  }
});

/**
 * DELETE /api/wearable-data/:id
 * Delete a specific wearable data record (own only, or admin)
 */
router.delete('/:id', protect, async (req, res) => {
  try {
    const record = await WearableData.findByPk(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Record not found' });

    if (record.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    await record.destroy();
    res.json({ success: true, message: 'Wearable data record deleted' });
  } catch (error) {
    logger.error('[WearableData] Delete error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete record' });
  }
});

/**
 * POST /api/wearable-data/share
 * Share current wearable stats to social feed
 * Body: { category: 'overview'|'activity'|'heart'|'sleep'|'swim'|'cycle'|'run', metrics: [{label, value}], summary?: string }
 */
router.post('/share', protect, async (req, res) => {
  try {
    const { category, metrics, summary } = req.body;
    if (!category || !Array.isArray(metrics) || !metrics.length) {
      return res.status(400).json({ success: false, message: 'category and metrics[] are required' });
    }

    const { createWearableSharePost } = await import('../services/socialAutoPost.mjs');
    const post = await createWearableSharePost(req.user.id, { category, metrics, summary });

    res.json({ success: true, post, message: 'Stats shared to your feed!' });
  } catch (error) {
    logger.error('[WearableData] Share error:', error);
    res.status(500).json({ success: false, message: 'Failed to share stats' });
  }
});

/**
 * GET /api/wearable-data/devices
 * List supported device types with metadata
 */
router.get('/devices', (req, res) => {
  res.json({
    success: true,
    devices: [
      { id: 'fitbit', name: 'Fitbit', icon: 'Watch', exportFormat: 'JSON (Fitbit Web API)', fields: ['steps', 'heartRate', 'sleep', 'calories', 'floors', 'swimming', 'cycling', 'running'] },
      { id: 'apple_health', name: 'Apple Health', icon: 'Apple', exportFormat: 'XML export / JSON', fields: ['steps', 'heartRate', 'sleep', 'calories', 'vo2Max', 'hrv', 'spo2', 'swimming', 'cycling', 'running'] },
      { id: 'garmin', name: 'Garmin', icon: 'Watch', exportFormat: 'JSON (Garmin Connect API)', fields: ['steps', 'heartRate', 'sleep', 'calories', 'stress', 'bodyBattery', 'vo2Max', 'spo2', 'swimming', 'cycling', 'running'] },
      { id: 'samsung_health', name: 'Samsung Health', icon: 'Smartphone', exportFormat: 'CSV/JSON export', fields: ['steps', 'heartRate', 'sleep', 'calories', 'stress', 'spo2', 'swimming', 'cycling', 'running'] },
      { id: 'whoop', name: 'WHOOP', icon: 'Activity', exportFormat: 'JSON (WHOOP API)', fields: ['heartRate', 'hrv', 'sleep', 'recovery', 'calories', 'spo2'] },
      { id: 'oura', name: 'Oura Ring', icon: 'Circle', exportFormat: 'JSON (Oura API)', fields: ['steps', 'heartRate', 'hrv', 'sleep', 'readiness', 'spo2'] },
      { id: 'polar', name: 'Polar', icon: 'Watch', exportFormat: 'JSON (Polar Accesslink API)', fields: ['steps', 'heartRate', 'sleep', 'calories', 'swimming', 'cycling', 'running'] },
      { id: 'coros', name: 'COROS', icon: 'Watch', exportFormat: 'JSON (COROS API)', fields: ['steps', 'heartRate', 'sleep', 'calories', 'swimming', 'cycling', 'running'] },
      { id: 'manual', name: 'Manual Entry', icon: 'Edit3', exportFormat: 'Direct input', fields: ['all'] },
    ],
  });
});

export default router;

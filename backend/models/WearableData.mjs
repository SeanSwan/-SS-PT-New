/**
 * WearableData Model
 * ==================
 * Stores raw health/fitness data synced from wearable devices.
 * Supports Fitbit, Apple Health, Garmin, Samsung Health, Whoop, Oura.
 * Each record = one day of aggregated data from a single device.
 */

import { DataTypes } from 'sequelize';
import sequelize from '../database.mjs';

const DEVICE_TYPES = ['fitbit', 'apple_health', 'garmin', 'samsung_health', 'whoop', 'oura', 'polar', 'coros', 'manual'];

const WearableData = sequelize.define('WearableData', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'Users', key: 'id' },
    onDelete: 'CASCADE',
  },
  deviceType: {
    type: DataTypes.STRING(30),
    allowNull: false,
    validate: { isIn: [DEVICE_TYPES] },
    comment: 'Source device/platform',
  },
  deviceId: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Unique device identifier for dedup',
  },
  recordDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    comment: 'The date this data represents',
  },

  // --- Steps & Activity ---
  steps: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: { min: 0, max: 200000 },
  },
  distanceMeters: {
    type: DataTypes.FLOAT,
    allowNull: true,
    validate: { min: 0 },
    comment: 'Total distance in meters',
  },
  floorsClimbed: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: { min: 0 },
  },
  activeMinutes: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: { min: 0 },
    comment: 'Minutes of moderate+ activity',
  },
  caloriesBurned: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: { min: 0 },
    comment: 'Total calories burned (BMR + active)',
  },
  activeCalories: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: { min: 0 },
    comment: 'Calories from activity only',
  },

  // --- Heart Rate ---
  restingHeartRate: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: { min: 20, max: 220 },
  },
  avgHeartRate: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: { min: 20, max: 220 },
  },
  maxHeartRate: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: { min: 20, max: 250 },
  },
  heartRateVariability: {
    type: DataTypes.FLOAT,
    allowNull: true,
    validate: { min: 0 },
    comment: 'HRV in milliseconds',
  },
  heartRateZones: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Minutes per HR zone: {fatBurn, cardio, peak, outOfRange}',
  },

  // --- Sleep ---
  sleepDurationMinutes: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: { min: 0, max: 1440 },
  },
  sleepScore: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: { min: 0, max: 100 },
  },
  sleepStages: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Sleep stage breakdown: {deep, light, rem, awake} in minutes',
  },
  sleepStartTime: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  sleepEndTime: {
    type: DataTypes.DATE,
    allowNull: true,
  },

  // --- Workout Sessions ---
  workoutSessions: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Array of workout objects: [{type, duration, calories, avgHR, maxHR, startTime}]',
  },

  // --- Swimming Metrics ---
  swimLaps: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: { min: 0 },
    comment: 'Total laps swum',
  },
  swimDistanceMeters: {
    type: DataTypes.FLOAT,
    allowNull: true,
    validate: { min: 0 },
    comment: 'Total swim distance in meters',
  },
  swimDurationMinutes: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: { min: 0 },
  },
  swimStrokes: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: { min: 0 },
    comment: 'Total stroke count',
  },
  swimPacePer100m: {
    type: DataTypes.FLOAT,
    allowNull: true,
    comment: 'Average pace in seconds per 100m',
  },
  swimStrokeType: {
    type: DataTypes.STRING(30),
    allowNull: true,
    comment: 'Dominant stroke: freestyle, backstroke, breaststroke, butterfly, mixed',
  },
  swimSWOLF: {
    type: DataTypes.FLOAT,
    allowNull: true,
    comment: 'SWOLF score (swim efficiency: time + strokes per length)',
  },
  poolLengthMeters: {
    type: DataTypes.FLOAT,
    allowNull: true,
    validate: { min: 0 },
    comment: 'Pool length (25m or 50m typically)',
  },

  // --- Cycling Metrics ---
  cyclingDistanceMeters: {
    type: DataTypes.FLOAT,
    allowNull: true,
    validate: { min: 0 },
  },
  cyclingDurationMinutes: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: { min: 0 },
  },
  cyclingAvgSpeedKmh: {
    type: DataTypes.FLOAT,
    allowNull: true,
    validate: { min: 0 },
  },
  cyclingMaxSpeedKmh: {
    type: DataTypes.FLOAT,
    allowNull: true,
    validate: { min: 0 },
  },
  cyclingAvgPowerWatts: {
    type: DataTypes.FLOAT,
    allowNull: true,
    validate: { min: 0 },
    comment: 'Average power output (if power meter)',
  },
  cyclingMaxPowerWatts: {
    type: DataTypes.FLOAT,
    allowNull: true,
    validate: { min: 0 },
  },
  cyclingAvgCadence: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: { min: 0 },
    comment: 'Average cadence (RPM)',
  },
  cyclingElevationGainMeters: {
    type: DataTypes.FLOAT,
    allowNull: true,
    validate: { min: 0 },
  },
  cyclingNormalizedPower: {
    type: DataTypes.FLOAT,
    allowNull: true,
    comment: 'NP for training load calculation',
  },

  // --- Running Metrics ---
  runDistanceMeters: {
    type: DataTypes.FLOAT,
    allowNull: true,
    validate: { min: 0 },
  },
  runDurationMinutes: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: { min: 0 },
  },
  runAvgPaceMinPerKm: {
    type: DataTypes.FLOAT,
    allowNull: true,
    comment: 'Average pace in minutes per km',
  },
  runAvgCadence: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: { min: 0 },
    comment: 'Steps per minute',
  },
  runElevationGainMeters: {
    type: DataTypes.FLOAT,
    allowNull: true,
    validate: { min: 0 },
  },
  runGroundContactTime: {
    type: DataTypes.FLOAT,
    allowNull: true,
    comment: 'Ground contact time in ms (advanced running dynamics)',
  },
  runVerticalOscillation: {
    type: DataTypes.FLOAT,
    allowNull: true,
    comment: 'Vertical oscillation in cm',
  },
  runTrainingEffect: {
    type: DataTypes.FLOAT,
    allowNull: true,
    validate: { min: 0, max: 5 },
    comment: 'Aerobic training effect score (Garmin/Polar)',
  },

  // --- Body Composition (smart scales) ---
  weight: {
    type: DataTypes.FLOAT,
    allowNull: true,
    validate: { min: 0 },
    comment: 'Weight in lbs',
  },
  bodyFatPercentage: {
    type: DataTypes.FLOAT,
    allowNull: true,
    validate: { min: 0, max: 100 },
  },

  // --- Advanced Metrics ---
  vo2Max: {
    type: DataTypes.FLOAT,
    allowNull: true,
    validate: { min: 0, max: 100 },
  },
  respiratoryRate: {
    type: DataTypes.FLOAT,
    allowNull: true,
    validate: { min: 0, max: 60 },
    comment: 'Breaths per minute',
  },
  spo2: {
    type: DataTypes.FLOAT,
    allowNull: true,
    validate: { min: 0, max: 100 },
    comment: 'Blood oxygen saturation',
  },
  stressLevel: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: { min: 0, max: 100 },
    comment: 'Stress score (Garmin/Samsung)',
  },
  bodyBatteryOrRecovery: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: { min: 0, max: 100 },
    comment: 'Body Battery (Garmin) or Recovery (Whoop/Oura)',
  },

  // --- Raw Data ---
  rawPayload: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Full raw payload from device API for debugging/re-parsing',
  },

  // --- Sync Meta ---
  syncedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  dataQuality: {
    type: DataTypes.FLOAT,
    allowNull: true,
    validate: { min: 0, max: 1 },
    defaultValue: 1.0,
    comment: '0-1 confidence score (manual=0.7, device=1.0)',
  },
}, {
  tableName: 'WearableData',
  timestamps: true,
  indexes: [
    { fields: ['userId', 'recordDate'], unique: false },
    { fields: ['userId', 'deviceType', 'recordDate'], unique: true, name: 'wearable_user_device_date_unique' },
    { fields: ['userId', 'createdAt'] },
    { fields: ['deviceType'] },
    { fields: ['recordDate'] },
  ],
});

// Class methods
WearableData.DEVICE_TYPES = DEVICE_TYPES;

/**
 * Get latest data for a user across all devices
 */
WearableData.getLatestForUser = async function(userId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const { Op } = await import('sequelize');
  return this.findAll({
    where: {
      userId,
      recordDate: { [Op.gte]: startDate.toISOString().split('T')[0] },
    },
    order: [['recordDate', 'DESC']],
  });
};

/**
 * Get aggregated weekly averages
 */
WearableData.getWeeklyAverages = async function(userId, weeks = 12) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - (weeks * 7));

  return sequelize.query(`
    SELECT
      date_trunc('week', "recordDate"::timestamp) as week_start,
      AVG(steps)::int as avg_steps,
      AVG("restingHeartRate")::int as avg_resting_hr,
      AVG("sleepDurationMinutes")::int as avg_sleep_min,
      AVG("caloriesBurned")::int as avg_calories,
      AVG("activeMinutes")::int as avg_active_min,
      AVG("heartRateVariability")::float as avg_hrv,
      AVG(weight)::float as avg_weight,
      COUNT(*)::int as data_points
    FROM "WearableData"
    WHERE "userId" = :userId AND "recordDate" >= :startDate
    GROUP BY week_start
    ORDER BY week_start DESC
  `, {
    replacements: { userId, startDate: startDate.toISOString().split('T')[0] },
    type: sequelize.QueryTypes.SELECT,
  });
};

export default WearableData;
export { DEVICE_TYPES };

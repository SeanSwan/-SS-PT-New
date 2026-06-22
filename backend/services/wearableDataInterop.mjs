export const DEVICE_TYPES = ['fitbit', 'apple_health', 'health_connect', 'garmin', 'samsung_health', 'whoop', 'oura', 'polar', 'coros', 'manual'];

export const DEVICE_METADATA = [
  { id: 'fitbit', name: 'Fitbit', icon: 'Watch', exportFormat: 'JSON (Fitbit Web API)', fields: ['steps', 'heartRate', 'sleep', 'calories', 'floors', 'swimming', 'cycling', 'running'] },
  { id: 'apple_health', name: 'Apple Health', icon: 'Apple', exportFormat: 'XML export / JSON', fields: ['steps', 'heartRate', 'sleep', 'calories', 'vo2Max', 'hrv', 'spo2', 'swimming', 'cycling', 'running'] },
  { id: 'health_connect', name: 'Health Connect', icon: 'Smartphone', exportFormat: 'Native Health Connect aggregate JSON', fields: ['steps', 'heartRate', 'sleep', 'calories', 'hrv', 'spo2', 'weight', 'bodyFat', 'swimming', 'cycling', 'running'] },
  { id: 'garmin', name: 'Garmin', icon: 'Watch', exportFormat: 'JSON (Garmin Connect API)', fields: ['steps', 'heartRate', 'sleep', 'calories', 'stress', 'bodyBattery', 'vo2Max', 'spo2', 'swimming', 'cycling', 'running'] },
  { id: 'samsung_health', name: 'Samsung Health', icon: 'Smartphone', exportFormat: 'CSV/JSON export', fields: ['steps', 'heartRate', 'sleep', 'calories', 'stress', 'spo2', 'swimming', 'cycling', 'running'] },
  { id: 'whoop', name: 'WHOOP', icon: 'Activity', exportFormat: 'JSON (WHOOP API)', fields: ['heartRate', 'hrv', 'sleep', 'recovery', 'calories', 'spo2'] },
  { id: 'oura', name: 'Oura Ring', icon: 'Circle', exportFormat: 'JSON (Oura API)', fields: ['steps', 'heartRate', 'hrv', 'sleep', 'readiness', 'spo2'] },
  { id: 'polar', name: 'Polar', icon: 'Watch', exportFormat: 'JSON (Polar Accesslink API)', fields: ['steps', 'heartRate', 'sleep', 'calories', 'swimming', 'cycling', 'running'] },
  { id: 'coros', name: 'COROS', icon: 'Watch', exportFormat: 'JSON (COROS API)', fields: ['steps', 'heartRate', 'sleep', 'calories', 'swimming', 'cycling', 'running'] },
  { id: 'manual', name: 'Manual Entry', icon: 'Edit3', exportFormat: 'Direct input', fields: ['all'] },
];

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const DATE_REQUIRED = 'recordDate is required for every wearable sync item';
const DATE_INVALID = 'recordDate must be a real YYYY-MM-DD calendar date';
const DATE_FUTURE = 'recordDate cannot be in the future';
const KG_TO_LB = 2.2046226218;

const isFiniteNumber = (value) => typeof value === 'number' && Number.isFinite(value);
const roundInt = (value) => (isFiniteNumber(value) ? Math.round(value) : null);
const sumPresent = (...values) => (
  values.some(isFiniteNumber) ? values.reduce((sum, value) => sum + (isFiniteNumber(value) ? value : 0), 0) : null
);

const isValidDate = (value) => {
  if (typeof value !== 'string' || !DATE_REGEX.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
};

const serverUtcDateOnly = (offsetDays = 0, now = new Date()) => {
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + offsetDays));
  return date.toISOString().slice(0, 10);
};

export const resolveWearableRecordDate = (value) => {
  if (value === undefined || value === null || value === '') {
    return { error: DATE_REQUIRED };
  }
  if (!isValidDate(value)) return { error: DATE_INVALID };
  if (value > serverUtcDateOnly(1)) return { error: DATE_FUTURE };
  return { recordDate: value };
};

const metricNumber = (value, preferredKeys = []) => {
  if (isFiniteNumber(value)) return value;
  if (!value || typeof value !== 'object') return null;
  for (const key of [
    ...preferredKeys,
    'inMeters',
    'inKilocalories',
    'inSeconds',
    'inMinutes',
    'inMillis',
    'percentage',
    'count',
    'value',
    'average',
    'maximum',
  ]) {
    if (isFiniteNumber(value[key])) return value[key];
  }
  return null;
};

const durationMinutes = (value) => {
  if (isFiniteNumber(value)) return value;
  if (!value || typeof value !== 'object') return null;
  return isFiniteNumber(value.inMinutes) ? value.inMinutes
    : isFiniteNumber(value.inSeconds) ? value.inSeconds / 60
      : isFiniteNumber(value.inMillis) ? value.inMillis / 60000
        : null;
};

const secondsToMinutes = (value) => {
  const seconds = metricNumber(value, ['inSeconds']);
  return isFiniteNumber(seconds) ? seconds / 60 : null;
};

const percentageValue = (value) => {
  const n = metricNumber(value, ['percentage']);
  return isFiniteNumber(n) ? (n <= 1 ? n * 100 : n) : null;
};

const weightPounds = (value) => {
  if (isFiniteNumber(value)) return value;
  if (!value || typeof value !== 'object') return null;
  return isFiniteNumber(value.inPounds) ? value.inPounds
    : isFiniteNumber(value.inKilograms) ? value.inKilograms * KG_TO_LB
      : metricNumber(value, ['pounds']);
};

const parsers = {
  fitbit(raw) {
    const s = raw.summary || raw;
    const sleep = raw.sleep?.[0] || {};
    return {
      steps: s.steps,
      distanceMeters: s.distances?.find(d => d.activity === 'total')?.distance * 1609.34 || null,
      floorsClimbed: s.floors,
      activeMinutes: sumPresent(s.fairlyActiveMinutes, s.veryActiveMinutes),
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
      swimLaps: raw.swimming?.laps,
      swimDistanceMeters: raw.swimming?.distance ? raw.swimming.distance * 1609.34 : null,
      swimDurationMinutes: raw.swimming?.duration ? Math.round(raw.swimming.duration / 60000) : null,
      swimStrokes: raw.swimming?.strokes,
      cyclingDistanceMeters: raw.cycling?.distance ? raw.cycling.distance * 1609.34 : null,
      cyclingDurationMinutes: raw.cycling?.duration ? Math.round(raw.cycling.duration / 60000) : null,
      cyclingAvgSpeedKmh: raw.cycling?.speed ? raw.cycling.speed * 1.60934 : null,
      runDistanceMeters: raw.running?.distance ? raw.running.distance * 1609.34 : null,
      runDurationMinutes: raw.running?.duration ? Math.round(raw.running.duration / 60000) : null,
      runAvgPaceMinPerKm: raw.running?.pace ? raw.running.pace / 1.60934 : null,
    };
  },
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
      swimDistanceMeters: raw.distanceSwimming ? raw.distanceSwimming * 1000 : null,
      swimStrokes: raw.swimmingStrokeCount,
      swimDurationMinutes: raw.swimmingDuration ? Math.round(raw.swimmingDuration) : null,
      cyclingDistanceMeters: raw.distanceCycling ? raw.distanceCycling * 1000 : null,
      cyclingDurationMinutes: raw.cyclingDuration ? Math.round(raw.cyclingDuration) : null,
      cyclingAvgPowerWatts: raw.cyclingPower,
      cyclingAvgCadence: raw.cyclingCadence,
      runDistanceMeters: raw.distanceWalkingRunning ? raw.distanceWalkingRunning * 1000 : null,
      runDurationMinutes: raw.runningDuration ? Math.round(raw.runningDuration) : null,
      runGroundContactTime: raw.groundContactTime,
      runVerticalOscillation: raw.verticalOscillation,
    };
  },
  health_connect(raw) {
    const a = raw.aggregate || raw;
    const heartRate = a.heartRate || {};
    const exerciseDurationSeconds = a.exerciseDurationSeconds ?? raw.exerciseDurationSeconds;
    const exerciseDuration = a.exerciseDuration ?? raw.exerciseDuration;
    return {
      steps: roundInt(metricNumber(a.steps ?? raw.steps, ['count'])),
      distanceMeters: metricNumber(a.distance ?? a.distanceMeters ?? raw.distanceMeters, ['inMeters']),
      activeMinutes: roundInt(exerciseDurationSeconds !== undefined
        ? secondsToMinutes(exerciseDurationSeconds)
        : durationMinutes(exerciseDuration)),
      caloriesBurned: roundInt(metricNumber(a.totalCaloriesBurned ?? a.caloriesBurned ?? raw.caloriesBurned, ['inKilocalories'])),
      activeCalories: roundInt(metricNumber(a.activeCaloriesBurned ?? a.activeCalories ?? raw.activeCalories, ['inKilocalories'])),
      restingHeartRate: roundInt(metricNumber(a.restingHeartRate ?? raw.restingHeartRate)),
      avgHeartRate: roundInt(metricNumber(heartRate.average ?? a.avgHeartRate ?? raw.avgHeartRate)),
      maxHeartRate: roundInt(metricNumber(heartRate.maximum ?? a.maxHeartRate ?? raw.maxHeartRate)),
      heartRateVariability: metricNumber(a.heartRateVariabilityRmssd ?? a.heartRateVariability ?? raw.heartRateVariability, ['inMillis']),
      sleepDurationMinutes: roundInt(durationMinutes(a.sleepDuration ?? raw.sleepDuration)),
      vo2Max: metricNumber(a.vo2Max ?? raw.vo2Max),
      respiratoryRate: metricNumber(a.respiratoryRate ?? raw.respiratoryRate),
      spo2: percentageValue(a.oxygenSaturation ?? a.spo2 ?? raw.spo2),
      weight: weightPounds(a.weight ?? raw.weight),
      bodyFatPercentage: percentageValue(a.bodyFatPercentage ?? raw.bodyFatPercentage),
    };
  },
  garmin(raw) {
    return {
      steps: raw.totalSteps,
      distanceMeters: raw.totalDistanceMeters,
      floorsClimbed: raw.floorsAscended,
      activeMinutes: sumPresent(raw.moderateIntensityMinutes, raw.vigorousIntensityMinutes),
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
      swimLaps: raw.swimming?.totalLaps,
      swimDistanceMeters: raw.swimming?.totalDistanceMeters,
      swimDurationMinutes: raw.swimming?.durationSeconds ? Math.round(raw.swimming.durationSeconds / 60) : null,
      swimStrokes: raw.swimming?.totalStrokes,
      swimPacePer100m: raw.swimming?.avgPacePer100m,
      swimStrokeType: raw.swimming?.primaryStrokeType,
      swimSWOLF: raw.swimming?.avgSwolf,
      poolLengthMeters: raw.swimming?.poolLength,
      cyclingDistanceMeters: raw.cycling?.totalDistanceMeters,
      cyclingDurationMinutes: raw.cycling?.durationSeconds ? Math.round(raw.cycling.durationSeconds / 60) : null,
      cyclingAvgSpeedKmh: raw.cycling?.avgSpeed,
      cyclingMaxSpeedKmh: raw.cycling?.maxSpeed,
      cyclingAvgPowerWatts: raw.cycling?.avgPower,
      cyclingMaxPowerWatts: raw.cycling?.maxPower,
      cyclingAvgCadence: raw.cycling?.avgCadence,
      cyclingElevationGainMeters: raw.cycling?.elevationGain,
      cyclingNormalizedPower: raw.cycling?.normalizedPower,
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
  manual(raw) {
    return { ...raw };
  },
};

export const normalizeWearableData = (deviceType, raw) => {
  const parser = parsers[deviceType] || parsers.manual;
  return parser(raw);
};

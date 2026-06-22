/**
 * Wearable metric guard.
 *
 * Keeps sync endpoints from persisting metadata-only rows that pollute charts
 * and weekly averages as if the client had real wearable data.
 */
export const WEARABLE_METRIC_REQUIRED = 'At least one wearable metric is required for every sync item';

const WEARABLE_METRIC_FIELDS = [
  'steps',
  'distanceMeters',
  'floorsClimbed',
  'activeMinutes',
  'caloriesBurned',
  'activeCalories',
  'restingHeartRate',
  'avgHeartRate',
  'maxHeartRate',
  'heartRateVariability',
  'heartRateZones',
  'sleepDurationMinutes',
  'sleepScore',
  'sleepStages',
  'sleepStartTime',
  'sleepEndTime',
  'workoutSessions',
  'swimLaps',
  'swimDistanceMeters',
  'swimDurationMinutes',
  'swimStrokes',
  'swimPacePer100m',
  'swimStrokeType',
  'swimSWOLF',
  'poolLengthMeters',
  'cyclingDistanceMeters',
  'cyclingDurationMinutes',
  'cyclingAvgSpeedKmh',
  'cyclingMaxSpeedKmh',
  'cyclingAvgPowerWatts',
  'cyclingMaxPowerWatts',
  'cyclingAvgCadence',
  'cyclingElevationGainMeters',
  'cyclingNormalizedPower',
  'runDistanceMeters',
  'runDurationMinutes',
  'runAvgPaceMinPerKm',
  'runAvgCadence',
  'runElevationGainMeters',
  'runGroundContactTime',
  'runVerticalOscillation',
  'runTrainingEffect',
  'weight',
  'bodyFatPercentage',
  'vo2Max',
  'respiratoryRate',
  'spo2',
  'stressLevel',
  'bodyBatteryOrRecovery',
];

const hasMeaningfulValue = (value) => {
  if (value === undefined || value === null || value === '') return false;
  if (Array.isArray(value)) return value.some(hasMeaningfulValue);
  if (typeof value === 'object' && !(value instanceof Date)) {
    return Object.values(value).some(hasMeaningfulValue);
  }
  return true;
};

export const hasWearableMetrics = (record = {}) => (
  WEARABLE_METRIC_FIELDS.some((field) => hasMeaningfulValue(record[field]))
);

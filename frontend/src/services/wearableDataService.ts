/**
 * Wearable Data Service
 * =====================
 * Frontend service for syncing and querying wearable health data.
 * Uses the production API service with auth interceptors.
 */

import api from './api';

export interface WearableDevice {
  id: string;
  name: string;
  icon: string;
  exportFormat: string;
  fields: string[];
}

export interface WearableRecord {
  id: number;
  userId: number;
  deviceType: string;
  deviceId?: string;
  recordDate: string;

  // Activity
  steps?: number;
  distanceMeters?: number;
  floorsClimbed?: number;
  activeMinutes?: number;
  caloriesBurned?: number;
  activeCalories?: number;

  // Heart Rate
  restingHeartRate?: number;
  avgHeartRate?: number;
  maxHeartRate?: number;
  heartRateVariability?: number;
  heartRateZones?: {
    outOfRange?: number;
    fatBurn?: number;
    cardio?: number;
    peak?: number;
  };

  // Sleep
  sleepDurationMinutes?: number;
  sleepScore?: number;
  sleepStages?: {
    deep?: number;
    light?: number;
    rem?: number;
    awake?: number;
  };

  // Swimming
  swimLaps?: number;
  swimDistanceMeters?: number;
  swimDurationMinutes?: number;
  swimStrokes?: number;
  swimPacePer100m?: number;
  swimStrokeType?: string;
  swimSWOLF?: number;
  poolLengthMeters?: number;

  // Cycling
  cyclingDistanceMeters?: number;
  cyclingDurationMinutes?: number;
  cyclingAvgSpeedKmh?: number;
  cyclingMaxSpeedKmh?: number;
  cyclingAvgPowerWatts?: number;
  cyclingAvgCadence?: number;
  cyclingElevationGainMeters?: number;

  // Running
  runDistanceMeters?: number;
  runDurationMinutes?: number;
  runAvgPaceMinPerKm?: number;
  runAvgCadence?: number;
  runElevationGainMeters?: number;
  runTrainingEffect?: number;

  // Advanced
  vo2Max?: number;
  spo2?: number;
  stressLevel?: number;
  bodyBatteryOrRecovery?: number;
  weight?: number;
  bodyFatPercentage?: number;

  createdAt: string;
  updatedAt: string;
}

export interface WeeklyAverage {
  week_start: string;
  avg_steps: number;
  avg_resting_hr: number;
  avg_sleep_min: number;
  avg_calories: number;
  avg_active_min: number;
  avg_hrv: number;
  avg_weight: number;
  data_points: number;
}

export interface WearableSummary {
  latest: WearableRecord | null;
  weeklyAverages: WeeklyAverage[];
  connectedDevices: string[];
}

class WearableDataService {
  /**
   * Sync data from a wearable device
   */
  async syncData(deviceType: string, data: Record<string, unknown>[], deviceId?: string) {
    const response = await api.post('/api/wearable-data/sync', {
      deviceType,
      data,
      deviceId,
    });
    return response.data;
  }

  /**
   * Sync a single day's data
   */
  async syncDay(deviceType: string, recordDate: string, fields: Record<string, unknown>) {
    const response = await api.post('/api/wearable-data/sync', {
      deviceType,
      recordDate,
      ...fields,
    });
    return response.data;
  }

  /**
   * Get own wearable data
   */
  async getData(params?: { days?: number; deviceType?: string; startDate?: string; endDate?: string }): Promise<WearableRecord[]> {
    const response = await api.get('/api/wearable-data', { params });
    return response.data.data;
  }

  /**
   * Get aggregated summary for dashboard
   */
  async getSummary(weeks?: number): Promise<WearableSummary> {
    const response = await api.get('/api/wearable-data/summary', { params: { weeks } });
    return response.data;
  }

  /**
   * Get a specific client's wearable data (admin/trainer)
   */
  async getClientData(userId: number, params?: { days?: number; deviceType?: string }): Promise<WearableRecord[]> {
    const response = await api.get(`/api/wearable-data/user/${userId}`, { params });
    return response.data.data;
  }

  /**
   * Get a specific client's summary (admin/trainer)
   */
  async getClientSummary(userId: number, weeks?: number): Promise<WearableSummary> {
    const response = await api.get(`/api/wearable-data/user/${userId}/summary`, { params: { weeks } });
    return response.data;
  }

  /**
   * Get supported devices
   */
  async getDevices(): Promise<WearableDevice[]> {
    const response = await api.get('/api/wearable-data/devices');
    return response.data.devices;
  }

  /**
   * Delete a wearable data record
   */
  async deleteRecord(id: number) {
    const response = await api.delete(`/api/wearable-data/${id}`);
    return response.data;
  }

  /**
   * Share wearable stats to social feed
   */
  async shareToFeed(category: string, metrics: { label: string; value: string }[], summary?: string) {
    const response = await api.post('/api/wearable-data/share', { category, metrics, summary });
    return response.data;
  }

  /**
   * Parse Apple Health XML export file
   * Converts XML to our normalized JSON format client-side
   */
  parseAppleHealthExport(xmlText: string): Record<string, unknown>[] {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'text/xml');
    const records = doc.querySelectorAll('Record');
    const dailyData: Record<string, Record<string, number>> = {};

    records.forEach((record) => {
      const type = record.getAttribute('type') || '';
      const date = record.getAttribute('startDate')?.split(' ')[0] || record.getAttribute('creationDate')?.split(' ')[0];
      const value = parseFloat(record.getAttribute('value') || '0');

      if (!date || isNaN(value)) return;
      if (!dailyData[date]) dailyData[date] = {};

      const typeMap: Record<string, string> = {
        HKQuantityTypeIdentifierStepCount: 'stepCount',
        HKQuantityTypeIdentifierDistanceWalkingRunning: 'distanceWalkingRunning',
        HKQuantityTypeIdentifierFlightsClimbed: 'flightsClimbed',
        HKQuantityTypeIdentifierActiveEnergyBurned: 'activeEnergyBurned',
        HKQuantityTypeIdentifierBasalEnergyBurned: 'basalEnergyBurned',
        HKQuantityTypeIdentifierAppleExerciseTime: 'appleExerciseTime',
        HKQuantityTypeIdentifierRestingHeartRate: 'restingHeartRate',
        HKQuantityTypeIdentifierHeartRate: 'heartRate',
        HKQuantityTypeIdentifierHeartRateVariabilitySDNN: 'heartRateVariability',
        HKQuantityTypeIdentifierVO2Max: 'vo2Max',
        HKQuantityTypeIdentifierOxygenSaturation: 'oxygenSaturation',
        HKQuantityTypeIdentifierBodyMass: 'bodyMass',
        HKQuantityTypeIdentifierBodyFatPercentage: 'bodyFatPercentage',
        HKQuantityTypeIdentifierDistanceSwimming: 'distanceSwimming',
        HKQuantityTypeIdentifierSwimmingStrokeCount: 'swimmingStrokeCount',
        HKQuantityTypeIdentifierDistanceCycling: 'distanceCycling',
        HKQuantityTypeIdentifierRespiratoryRate: 'respiratoryRate',
      };

      const field = typeMap[type];
      if (field) {
        // Accumulate daily totals for count metrics, use latest for rate metrics
        const accumulateFields = ['stepCount', 'distanceWalkingRunning', 'flightsClimbed', 'activeEnergyBurned', 'basalEnergyBurned', 'appleExerciseTime', 'distanceSwimming', 'swimmingStrokeCount', 'distanceCycling'];
        if (accumulateFields.includes(field)) {
          dailyData[date][field] = (dailyData[date][field] || 0) + value;
        } else {
          dailyData[date][field] = value;
        }
      }
    });

    return Object.entries(dailyData).map(([date, fields]) => ({
      recordDate: date,
      ...fields,
    }));
  }

  /**
   * Parse Fitbit JSON export
   */
  parseFitbitExport(jsonData: Record<string, unknown>[]): Record<string, unknown>[] {
    return jsonData.map((day: Record<string, unknown>) => ({
      recordDate: day.dateTime || day.date,
      summary: day,
      sleep: (day as Record<string, unknown>).sleep,
      swimming: (day as Record<string, unknown>).swimming,
      cycling: (day as Record<string, unknown>).cycling,
      running: (day as Record<string, unknown>).running,
    }));
  }

  /**
   * Parse Garmin export
   */
  parseGarminExport(jsonData: Record<string, unknown>[]): Record<string, unknown>[] {
    return jsonData.map((day: Record<string, unknown>) => ({
      recordDate: day.calendarDate || day.date,
      ...day,
    }));
  }
}

export const wearableDataService = new WearableDataService();
export default wearableDataService;

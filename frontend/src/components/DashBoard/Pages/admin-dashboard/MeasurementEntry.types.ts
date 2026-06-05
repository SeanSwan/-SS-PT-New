/**
 * ============================================================================
 * FILE: MeasurementEntry.types.ts
 * PURPOSE: Shared contracts for the active body-measurement entry surface.
 * ============================================================================
 *
 * WHAT THIS FILE DOES:
 * Defines the client, measurement, stats, milestone, and chart data types used
 * by MeasurementEntry and its extracted helpers.
 *
 * HOW IT FITS IN THE APP:
 * ClientsWorkspace -> BiometricsTabContent -> MeasurementEntry.
 */

export interface Client {
  id: string;
  name: string;
}

export interface RawClient {
  id: string | number;
  firstName?: string;
  lastName?: string;
  email?: string;
}

export interface BodyMeasurement {
  id?: string;
  userId: string;
  measurementDate: string;
  weight?: number;
  weightUnit?: 'lbs' | 'kg';
  bodyFatPercentage?: number;
  muscleMassPercentage?: number;
  bmi?: number;
  circumferenceUnit?: 'inches' | 'cm';
  neck?: number;
  shoulders?: number;
  chest?: number;
  rightBicep?: number;
  leftBicep?: number;
  rightForearm?: number;
  leftForearm?: number;
  naturalWaist?: number;
  hips?: number;
  rightThigh?: number;
  leftThigh?: number;
  rightCalf?: number;
  leftCalf?: number;
  notes?: string;
  photoUrls?: string[];
}

export interface RecentMeasurement extends BodyMeasurement {
  id: string;
  recorder?: { firstName?: string; lastName?: string; username?: string };
}

export interface MeasurementStats {
  totalMeasurements?: number;
  daysSinceStart?: number;
  totalChange?: {
    weight?: string | number | null;
    bodyFat?: string | number | null;
    waist?: string | number | null;
  };
}

export interface MeasurementMilestone {
  celebrationMessage?: string;
}

export type RadarMeasurementKey =
  | 'neck'
  | 'shoulders'
  | 'chest'
  | 'rightBicep'
  | 'naturalWaist'
  | 'hips'
  | 'rightThigh'
  | 'rightCalf';

export interface RadarDatum {
  metric: string;
  first: number;
  current: number;
}

export interface MeasurementEntryProps {
  /** When embedded in BiometricsTabContent, auto-select this client. */
  embeddedClientId?: string;
  embeddedClientName?: string;
}

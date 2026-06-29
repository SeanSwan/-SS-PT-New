/**
 * ============================================================================
 * FILE: MeasurementEntry.dataUtils.ts
 * PURPOSE: Pure client and chart data helpers for MeasurementEntry.
 * ============================================================================
 *
 * WHAT THIS FILE DOES:
 * Maps admin client API shapes into local labels and builds deterministic
 * progress chart datasets from recent measurement history.
 *
 * HOW IT FITS IN THE APP:
 * MeasurementEntry calls these helpers from the active biometrics surface while
 * keeping API state, rendering, and user feedback in the component.
 */

import { RADAR_LABEL_MAP } from './MeasurementEntry.config';
import type {
  Client,
  RadarDatum,
  RadarMeasurementKey,
  RawClient,
  RecentMeasurement,
} from './MeasurementEntry.types';

export interface TrendDatum {
  date: string;
  weight: number | null;
  bodyFat: number | null;
  waist: number | null;
}

export const mapRawClients = (rawClients: unknown): Client[] => (
  Array.isArray(rawClients) ? rawClients : []
).map((client: RawClient) => ({
  id: String(client.id),
  name: [client.firstName, client.lastName].filter(Boolean).join(' ')
    || client.email
    || `Client ${client.id}`,
}));

export const filterClients = (clients: Client[], query: string): Client[] => {
  const normalizedQuery = query.toLowerCase();
  return clients.filter((client) => client.name.toLowerCase().includes(normalizedQuery));
};

const toFiniteMeasurementNumber = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' && !value.trim()) return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const getMeasurementTimestamp = (value: unknown): number | null => {
  if (typeof value !== 'string' && !(value instanceof Date)) return null;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
};

const compareByMeasurementDate = (
  a: { measurement: RecentMeasurement; index: number },
  b: { measurement: RecentMeasurement; index: number },
): number => {
  const aTime = getMeasurementTimestamp(a.measurement.measurementDate);
  const bTime = getMeasurementTimestamp(b.measurement.measurementDate);

  if (aTime === null && bTime === null) return a.index - b.index;
  if (aTime === null) return 1;
  if (bTime === null) return -1;
  return aTime - bTime || a.index - b.index;
};

const formatMeasurementDateLabel = (value: unknown, index: number): string => {
  const timestamp = getMeasurementTimestamp(value);
  return timestamp === null
    ? `Entry ${index + 1}`
    : new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const hasTrendValue = (datum: Pick<TrendDatum, 'weight' | 'bodyFat' | 'waist'>): boolean => (
  datum.weight !== null || datum.bodyFat !== null || datum.waist !== null
);

export const buildTrendData = (recentMeasurements: RecentMeasurement[]): TrendDatum[] => {
  if (recentMeasurements.length < 2) return [];
  const trendData = recentMeasurements
    .map((measurement, index) => ({ measurement, index }))
    .sort(compareByMeasurementDate)
    .map(({ measurement }) => ({
      measurement,
      weight: toFiniteMeasurementNumber(measurement.weight),
      bodyFat: toFiniteMeasurementNumber(measurement.bodyFatPercentage),
      waist: toFiniteMeasurementNumber(measurement.naturalWaist),
    }))
    .filter(hasTrendValue)
    .map(({ measurement, weight, bodyFat, waist }, index) => ({
      date: formatMeasurementDateLabel(measurement.measurementDate, index),
      weight,
      bodyFat,
      waist,
    }));

  return trendData.length >= 2 ? trendData : [];
};

export const buildRadarData = (recentMeasurements: RecentMeasurement[]): RadarDatum[] => {
  if (recentMeasurements.length < 2) return [];
  const sorted = recentMeasurements
    .map((measurement, index) => ({ measurement, index }))
    .sort(compareByMeasurementDate)
    .map(({ measurement }) => measurement);
  const first = sorted[0];
  const latest = sorted[sorted.length - 1];
  const fields: readonly RadarMeasurementKey[] = [
    'neck',
    'shoulders',
    'chest',
    'rightBicep',
    'naturalWaist',
    'hips',
    'rightThigh',
    'rightCalf',
  ];

  return fields
    .map((field) => ({
      metric: RADAR_LABEL_MAP[field],
      first: toFiniteMeasurementNumber(first[field]) ?? 0,
      current: toFiniteMeasurementNumber(latest[field]) ?? 0,
    }))
    .filter((datum) => datum.first > 0 || datum.current > 0);
};

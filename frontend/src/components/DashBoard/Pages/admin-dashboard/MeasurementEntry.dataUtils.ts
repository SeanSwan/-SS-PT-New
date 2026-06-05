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

export const buildTrendData = (recentMeasurements: RecentMeasurement[]): TrendDatum[] => {
  if (recentMeasurements.length < 2) return [];
  return [...recentMeasurements]
    .sort((a, b) => new Date(a.measurementDate).getTime() - new Date(b.measurementDate).getTime())
    .map((measurement) => ({
      date: new Date(measurement.measurementDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      weight: measurement.weight || null,
      bodyFat: measurement.bodyFatPercentage || null,
      waist: measurement.naturalWaist || null,
    }));
};

export const buildRadarData = (recentMeasurements: RecentMeasurement[]): RadarDatum[] => {
  if (recentMeasurements.length < 2) return [];
  const sorted = [...recentMeasurements]
    .sort((a, b) => new Date(a.measurementDate).getTime() - new Date(b.measurementDate).getTime());
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
      first: first[field] || 0,
      current: latest[field] || 0,
    }))
    .filter((datum) => datum.first > 0 || datum.current > 0);
};

import { describe, expect, it } from 'vitest';
import {
  buildRadarData,
  buildTrendData,
  filterClients,
  mapRawClients,
} from './MeasurementEntry.dataUtils';
import type { RecentMeasurement } from './MeasurementEntry.types';

describe('MeasurementEntry data helpers', () => {
  it('maps raw admin clients into searchable labels with safe fallbacks', () => {
    expect(mapRawClients([
      { id: 7, firstName: 'Ada', lastName: 'Lovelace' },
      { id: '8', email: 'solo@example.test' },
      { id: 9 },
    ])).toEqual([
      { id: '7', name: 'Ada Lovelace' },
      { id: '8', name: 'solo@example.test' },
      { id: '9', name: 'Client 9' },
    ]);
    expect(mapRawClients(null)).toEqual([]);
  });

  it('filters clients case-insensitively without mutating the source list', () => {
    const clients = [
      { id: '1', name: 'Sean Swan' },
      { id: '2', name: 'Move Fitness Client' },
    ];

    expect(filterClients(clients, 'swan')).toEqual([{ id: '1', name: 'Sean Swan' }]);
    expect(clients).toHaveLength(2);
  });

  it('builds sorted trend data and radar comparison data from recent measurements', () => {
    const measurements = [
      { id: 'latest', userId: '1', measurementDate: '2026-02-10T12:00:00', weight: 190, bodyFatPercentage: 18, naturalWaist: 34, neck: 16, shoulders: 44 },
      { id: 'first', userId: '1', measurementDate: '2026-01-02T12:00:00', weight: 200, bodyFatPercentage: 20, naturalWaist: 36, neck: 17, shoulders: 45 },
    ];

    expect(buildTrendData(measurements)).toEqual([
      { date: 'Jan 2', weight: 200, bodyFat: 20, waist: 36 },
      { date: 'Feb 10', weight: 190, bodyFat: 18, waist: 34 },
    ]);
    expect(buildRadarData(measurements)).toEqual([
      { metric: 'Neck', first: 17, current: 16 },
      { metric: 'Shoulders', first: 45, current: 44 },
      { metric: 'Waist', first: 36, current: 34 },
    ]);
  });

  it('keeps non-finite measurement trend values out of Victory datasets', () => {
    const measurements = [
      { id: 'latest', userId: '1', measurementDate: '2026-02-10T12:00:00', weight: 'Infinity', bodyFatPercentage: '18.5', naturalWaist: '33.25' },
      { id: 'bad', userId: '1', measurementDate: '2026-03-10T12:00:00', weight: 'NaN', bodyFatPercentage: 'bad', naturalWaist: '' },
      { id: 'undated', userId: '1', measurementDate: 'not-a-date', weight: '180', bodyFatPercentage: undefined, naturalWaist: undefined },
      { id: 'first', userId: '1', measurementDate: '2026-01-02T12:00:00', weight: '200.5', bodyFatPercentage: '20', naturalWaist: '36' },
    ] as unknown as RecentMeasurement[];

    const trendData = buildTrendData(measurements);

    expect(trendData).toEqual([
      { date: 'Jan 2', weight: 200.5, bodyFat: 20, waist: 36 },
      { date: 'Feb 10', weight: null, bodyFat: 18.5, waist: 33.25 },
      { date: 'Entry 3', weight: 180, bodyFat: null, waist: null },
    ]);
    expect(trendData.flatMap((datum) => [datum.weight, datum.bodyFat, datum.waist])
      .filter((value): value is number => value !== null)
      .every(Number.isFinite)).toBe(true);
  });

  it('coerces radar measurements to finite numbers before polar chart rendering', () => {
    const measurements = [
      { id: 'first', userId: '1', measurementDate: '2026-01-02T12:00:00', neck: 'NaN', shoulders: '44.5', naturalWaist: '' },
      { id: 'latest', userId: '1', measurementDate: '2026-02-10T12:00:00', neck: '16', shoulders: 'Infinity', naturalWaist: '34', rightBicep: 'bad' },
    ] as unknown as RecentMeasurement[];

    const radarData = buildRadarData(measurements);

    expect(radarData).toEqual([
      { metric: 'Neck', first: 0, current: 16 },
      { metric: 'Shoulders', first: 44.5, current: 0 },
      { metric: 'Waist', first: 0, current: 34 },
    ]);
    expect(radarData.flatMap((datum) => [datum.first, datum.current])
      .every(Number.isFinite)).toBe(true);
  });
});

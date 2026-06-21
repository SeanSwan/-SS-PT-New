import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  buildAvatarHomeRecoveryData,
  computeRecoveryRecommendation,
  registerAvatarHomeRecoveryRoutes,
} from '../../utils/avatarHomeRecovery.mjs';

const routeSource = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), '../../utils/avatarHomeRecovery.mjs'),
  'utf8'
);

describe('computeRecoveryRecommendation', () => {
  it('returns an empty-data prompt when no wearable metrics are present', () => {
    expect(computeRecoveryRecommendation(null, null, null)).toEqual({
      score: null,
      recommendation: 'Sync wearable data for recovery insights',
    });
  });

  it('scores high, moderate, and low recovery bands', () => {
    expect(computeRecoveryRecommendation(8, 55, 58)).toEqual({
      score: 100,
      recommendation: 'Great recovery - ready for high-intensity training!',
    });
    expect(computeRecoveryRecommendation(6.5, 35, 72)).toEqual({
      score: 70,
      recommendation: 'Moderate recovery - consider lighter volume today.',
    });
    expect(computeRecoveryRecommendation(5, 20, 82)).toEqual({
      score: 40,
      recommendation: 'Low recovery - prioritize flexibility and rest. Wisdom XP awaits!',
    });
  });

  it('does not count malformed metric objects as low recovery data', () => {
    expect(computeRecoveryRecommendation({ hours: 8 }, [], 'fast')).toEqual({
      score: null,
      recommendation: 'Sync wearable data for recovery insights',
    });
  });
});

describe('buildAvatarHomeRecoveryData', () => {
  it('normalizes valid wearable metric payloads before persistence', () => {
    expect(buildAvatarHomeRecoveryData({
      source: ' google_fit ',
      sleepHours: '7.5',
      hrv: '55',
      restingHR: '58',
      steps: '12000',
    }, '2026-06-20T18:25:00.000Z')).toEqual({
      error: null,
      status: 200,
      data: {
        sleepHours: 7.5,
        hrv: 55,
        restingHR: 58,
        steps: 12000,
        source: 'google_fit',
        syncedAt: '2026-06-20T18:25:00.000Z',
        recoveryRecommendation: {
          score: 100,
          recommendation: 'Great recovery - ready for high-intensity training!',
        },
      },
    });
  });

  it('rejects invalid sources and malformed/out-of-range metrics with safe copy', () => {
    expect(buildAvatarHomeRecoveryData({ source: 'fitbit', sleepHours: 7 })).toMatchObject({
      error: 'source must be: healthkit, google_fit',
      status: 400,
    });

    expect(buildAvatarHomeRecoveryData({ source: 'healthkit', sleepHours: { hours: 7 } })).toMatchObject({
      error: 'Invalid recovery metric',
      status: 400,
    });

    expect(buildAvatarHomeRecoveryData({ source: 'healthkit', restingHR: 500 })).toMatchObject({
      error: 'Invalid recovery metric',
      status: 400,
    });
  });

  it('registers recovery sync on the supplied router', () => {
    const calls = [];
    const router = {
      post: (path) => calls.push(['POST', path]),
    };

    registerAvatarHomeRecoveryRoutes(router, {
      requireUnlockedHome: async () => ({ home: null, status: 404, error: 'missing' }),
      logger: { info: () => {}, error: () => {} },
    });

    expect(calls).toEqual([['POST', '/recovery-sync']]);
  });

  it('keeps recovery sync route wired through the payload builder', () => {
    expect(routeSource).toContain('const built = buildAvatarHomeRecoveryData(req.body);');
    expect(routeSource).toContain('await home.update({ wearableRecoveryData: built.data });');
    expect(routeSource).not.toContain('sleepHours: sleepHours || null');
    expect(routeSource).not.toContain('recoveryRecommendation: computeRecoveryRecommendation(sleepHours, hrv, restingHR)');
  });
});

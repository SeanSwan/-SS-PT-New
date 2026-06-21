import { describe, expect, it } from 'vitest';
import {
  MAX_TRAINER_POINT_AWARD,
  getTrainerPointBalanceFallback,
  isTrainerPointAwardAllowed,
  mapAchievement,
  mapClient,
  normalizeTrainerPointInput,
} from './trainerGamificationData';

describe('trainerGamificationData', () => {
  it('maps malformed client metrics into truthful display floors', () => {
    const client = mapClient(
      {
        id: '42',
        firstName: '  Test\u0000 ',
        lastName: '\nClient ',
        email: 'client@example.com',
        points: -900,
        level: Number.NaN,
        tier: 'crystalline',
        streakDays: Number.NEGATIVE_INFINITY,
      },
      {
        success: true,
        profile: {
          points: 'bad',
          level: -4,
          streakDays: -12,
        },
      },
    );

    expect(client.firstName).toBe('Test');
    expect(client.lastName).toBe('Client');
    expect(client.username).toBe('client');
    expect(client.points).toBe(0);
    expect(client.level).toBe(1);
    expect(client.tier).toBe('platinum');
    expect(client.streakDays).toBe(0);

    const coercionClient = mapClient({
      id: '7',
      points: [900],
      level: '0x9',
      streakDays: '1e2',
    });

    expect(coercionClient.points).toBe(0);
    expect(coercionClient.level).toBe(1);
    expect(coercionClient.streakDays).toBe(0);
  });

  it('normalizes achievement points and requirements without emitting NaN', () => {
    const achievement = mapAchievement({
      id: 'badge-1',
      name: '  Proof\u0007 Badge ',
      pointValue: -50,
      requirementValue: Number.NaN,
      tier: 'gold',
    });

    expect(achievement.name).toBe('Proof Badge');
    expect(achievement.pointValue).toBe(0);
    expect(achievement.requirementValue).toBe(1);
    expect(achievement.tier).toBe('gold');

    const coercionAchievement = mapAchievement({
      id: 'badge-hex',
      pointValue: ['500'],
      requirementValue: '1e2',
    });

    expect(coercionAchievement.pointValue).toBe(0);
    expect(coercionAchievement.requirementValue).toBe(1);
  });

  it('enforces trainer point award boundaries before mutation calls', () => {
    expect(MAX_TRAINER_POINT_AWARD).toBe(500);
    expect(isTrainerPointAwardAllowed(1)).toBe(true);
    expect(isTrainerPointAwardAllowed(500)).toBe(true);
    expect(isTrainerPointAwardAllowed(0)).toBe(false);
    expect(isTrainerPointAwardAllowed(501)).toBe(false);
    expect(isTrainerPointAwardAllowed(50.5)).toBe(false);
    expect(isTrainerPointAwardAllowed('50')).toBe(false);

    expect(normalizeTrainerPointInput('9999')).toBe(500);
    expect(normalizeTrainerPointInput(' 25 ')).toBe(25);
    expect(normalizeTrainerPointInput('-12')).toBe(0);
    expect(normalizeTrainerPointInput('bad')).toBe(0);
    expect(normalizeTrainerPointInput([500])).toBe(0);
    expect(normalizeTrainerPointInput('0x10')).toBe(0);
    expect(normalizeTrainerPointInput('1e2')).toBe(0);
  });

  it('does not fabricate a zero balance fallback from malformed award responses', () => {
    expect(getTrainerPointBalanceFallback('bad')).toBeUndefined();
    expect(getTrainerPointBalanceFallback(Number.NaN)).toBeUndefined();
    expect(getTrainerPointBalanceFallback([1200])).toBeUndefined();
    expect(getTrainerPointBalanceFallback('0x10')).toBeUndefined();
    expect(getTrainerPointBalanceFallback('1e2')).toBeUndefined();
    expect(getTrainerPointBalanceFallback(-30)).toEqual({ points: 0 });
    expect(getTrainerPointBalanceFallback(1200)).toEqual({ points: 1200 });
  });
});

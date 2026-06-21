import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import workoutService from '../../services/workoutService.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const source = readFileSync(resolve(__dirname, '../../services/workoutService.mjs'), 'utf8');

function functionSource(name, nextName) {
  const start = source.indexOf(`async function ${name}`);
  const end = nextName ? source.indexOf(`async function ${nextName}`) : source.length;
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return source.slice(start, end);
}

describe('workoutService XP ledger hardening', () => {
  it('routes completed-session XP through the central point ledger', () => {
    const updateGamificationSource = functionSource('updateGamification', 'checkAchievements');

    expect(source).toContain("import('./gamification/GamificationPointsService.mjs')");
    expect(source).toContain('async function getGamificationPointsService()');
    expect(updateGamificationSource).toContain('GamificationPointsService.recordLedgerEntry({');
    expect(updateGamificationSource).toContain("source: 'workout_completion'");
    expect(updateGamificationSource).toContain('sourceId: null');
    expect(updateGamificationSource).toContain('workoutSessionId: session.id ?? null');
    expect(updateGamificationSource).toContain('idempotencyKey: `workout-service:${userId}:${session.id ?? \'unknown\'}:completion`');
    expect(updateGamificationSource).not.toContain('totalXP: (gamification.totalXP || 0) + totalXP');
  });

  it('routes workout-service achievement rewards through the central point ledger', () => {
    const checkAchievementsSource = functionSource('checkAchievements', null);

    expect(checkAchievementsSource).toContain("source: 'achievement_earned'");
    expect(checkAchievementsSource).toContain('sourceId: null');
    expect(checkAchievementsSource).toContain('idempotencyKey: `workout-service-achievement:${userId}:${achievement.id}`');
    expect(checkAchievementsSource).toContain('metadata: {');
    expect(checkAchievementsSource).toContain('achievementId: achievement.id');
    expect(checkAchievementsSource).not.toContain('totalXP: gamification.totalXP + (achievement.xpReward || 0)');
    expect(checkAchievementsSource).not.toContain('experience: gamification.experience + (achievement.xpReward || 0)');
  });

  it('clamps hostile set values before calculating XP', () => {
    expect(workoutService.calculateSetXP({
      repsCompleted: 999,
      weightUsed: 9999,
      rpe: 99,
      isPR: true,
    }, { formRating: 99 })).toBe(176);

    expect(workoutService.calculateSetXP({
      repsCompleted: -25,
      weightUsed: -500,
      rpe: -4,
      isPR: false,
    }, { formRating: -20 })).toBe(5);

    expect(workoutService.calculateSetXP({
      repsCompleted: [20],
      weightUsed: '0x100',
      rpe: ['10'],
      isPR: true,
    }, { formRating: ['10'] })).toBe(8);
  });
});

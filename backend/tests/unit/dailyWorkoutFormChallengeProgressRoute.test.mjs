import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const routeSource = readFileSync(
  resolve(process.cwd(), 'routes/dailyWorkoutFormRoutes.mjs'),
  'utf8',
);

describe('daily workout form challenge progress route contract', () => {
  it('wires accepted workout forms into challenge progress after the workout transaction commits', () => {
    const commitIndex = routeSource.indexOf('await transaction.commit();');
    const bridgeIndex = routeSource.indexOf('await applyDailyWorkoutFormChallengeProgress({');
    const responseIndex = routeSource.indexOf('res.status(201).json({');

    expect(routeSource).toContain("applyDailyWorkoutFormChallengeProgress");
    expect(routeSource).toContain("getChallenge,");
    expect(routeSource).toContain("getChallengeParticipant");
    expect(routeSource).toContain("buildChallengeProgressImpactReceipt");
    expect(commitIndex).toBeGreaterThan(-1);
    expect(bridgeIndex).toBeGreaterThan(commitIndex);
    expect(responseIndex).toBeGreaterThan(bridgeIndex);
  });

  it('keeps challenge progress non-fatal after the workout commit and visible in the save receipt', () => {
    const commitIndex = routeSource.indexOf('await transaction.commit();');
    const bridgeIndex = routeSource.indexOf('await applyDailyWorkoutFormChallengeProgress({');
    const setImmediateIndex = routeSource.indexOf('setImmediate(async () => {');
    const xpIndex = routeSource.indexOf('await awardWorkoutXP({');
    const warningIndex = routeSource.indexOf('workout_form_challenge_progress_failed');
    const responseIndex = routeSource.indexOf('res.status(201).json({');

    expect(bridgeIndex).toBeGreaterThan(commitIndex);
    expect(responseIndex).toBeGreaterThan(bridgeIndex);
    expect(xpIndex).toBeGreaterThan(setImmediateIndex);
    expect(routeSource).toContain('challengeProgress = buildChallengeProgressImpactReceipt(challengeProgressResult);');
    expect(routeSource).toContain("challengeProgress = buildChallengeProgressImpactReceipt(null, 'failed');");
    expect(routeSource).toContain('challengeProgress.updatedCount > 0 || challengeProgress.skippedCount > 0');
    expect(routeSource).toContain('Challenge progress processed from workout form');
    expect(routeSource).toContain('No active challenge progress for workout form');
    expect(routeSource).toContain('Challenge progress update failed (non-critical)');
    expect(routeSource).toContain('challengeProgress,');
    expect(warningIndex).toBeGreaterThan(bridgeIndex);
  });
});

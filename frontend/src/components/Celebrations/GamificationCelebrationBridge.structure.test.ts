/**
 * FILE: GamificationCelebrationBridge.structure.test.ts
 * PURPOSE: Source-contract lock for the celebration wiring (audit 2026-09-12
 *          P0-1). The bridge is the ONLY sanctioned connection between the
 *          backend gamification socket events and the CelebrationPortal
 *          triggers; this test fails if the wiring is removed or a celebration
 *          starts using a number that does not come from the server payload.
 *
 *          Follows the repo's source-contract pattern
 *          (useGamificationRealtime.structure.test.ts): a runtime socket test
 *          would need a live Socket.IO server; the contract here is the
 *          event→trigger mapping and the data-truth rule.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const bridgeSource = readFileSync(join(__dirname, 'GamificationCelebrationBridge.tsx'), 'utf8');

describe('GamificationCelebrationBridge source contract', () => {
  it('consumes the realtime hook and the celebration context', () => {
    expect(bridgeSource).toContain('useGamificationRealtime({ onEvent })');
    expect(bridgeSource).toContain('useCelebration()');
  });

  it('maps every server gamification event to a celebration trigger', () => {
    expect(bridgeSource).toContain("'gamification:workout_completed'");
    expect(bridgeSource).toContain("'gamification:points_awarded'");
    expect(bridgeSource).toContain("'gamification:level_up'");
    expect(bridgeSource).toContain("'gamification:achievement_unlocked'");
    expect(bridgeSource).toContain("'gamification:streak_milestone'");

    expect(bridgeSource).toContain('triggerXPPop(');
    expect(bridgeSource).toContain('triggerLevelUp(');
    expect(bridgeSource).toContain('triggerAchievement(');
    expect(bridgeSource).toContain('triggerStreak(');
  });

  it('celebration numbers come from the server payload, never fabricated', () => {
    // XP only from xpEarned/points fields…
    expect(bridgeSource).toContain('normalizeRealtimeXp(data.xpEarned)');
    // …level only from newLevel…
    expect(bridgeSource).toContain('Number(data.newLevel)');
    // …streak only from streakDays.
    expect(bridgeSource).toContain('Number(data.streakDays)');
  });

  it('dedupes the workout_completed / points_awarded echo', () => {
    expect(bridgeSource).toContain('POINTS_AWARD_DEDUPE_MS');
  });
});

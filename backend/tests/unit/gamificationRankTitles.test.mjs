import { describe, expect, it } from 'vitest';
import {
  buildRankTitleSelectionPayload,
  validateSelectedRankTitleKey,
} from '../../utils/gamificationRankTitles.mjs';
import { pointsForLevel } from '../../utils/levelingAlgorithm.mjs';

describe('gamification rank title selection helpers', () => {
  it('marks earned, current, and selected titles across the 100-title ladder', () => {
    const payload = buildRankTitleSelectionPayload({
      points: pointsForLevel(15),
      level: 1,
      selectedRankTitleKey: 'first_flight',
    });

    expect(payload.rankTitles).toHaveLength(100);
    expect(payload.earnedRankTitleCount).toBe(2);
    expect(payload.currentRankTitleDisplay).toMatchObject({ key: 'swan_initiate', rankNumber: 2 });
    expect(payload.selectedRankTitleDisplay).toMatchObject({ key: 'first_flight', rankNumber: 1 });
    expect(payload.nextRankTitleDisplay).toMatchObject({ key: 'dawn_wing', minLevel: 21 });
  });

  it('falls back to the current rank when a stored selected title is locked or invalid', () => {
    const locked = buildRankTitleSelectionPayload({
      points: pointsForLevel(15),
      selectedRankTitleKey: 'sapphire_tide',
    });
    const invalid = buildRankTitleSelectionPayload({
      points: pointsForLevel(15),
      selectedRankTitleKey: 'not-real',
    });

    expect(locked.selectedRankTitleKey).toBe('swan_initiate');
    expect(invalid.selectedRankTitleKey).toBe('swan_initiate');
  });

  it('validates selected title keys against the user earned level', () => {
    const earned = validateSelectedRankTitleKey('Swan Initiate', { points: pointsForLevel(15) });
    const locked = validateSelectedRankTitleKey('sapphire_tide', { points: pointsForLevel(15) });
    const missing = validateSelectedRankTitleKey('', { points: pointsForLevel(15) });

    expect(earned).toMatchObject({ ok: true, rankTitleKey: 'swan_initiate' });
    expect(locked).toMatchObject({ ok: false, status: 403, message: 'Rank title has not been earned yet' });
    expect(missing).toMatchObject({ ok: false, status: 400, message: 'Rank title key is required' });
  });

  it('does not let stale stored levels unlock titles beyond current XP', () => {
    const staleLevel = validateSelectedRankTitleKey('swan_initiate', { points: 0, level: 15 });

    expect(staleLevel).toMatchObject({ ok: false, status: 403 });
  });
});
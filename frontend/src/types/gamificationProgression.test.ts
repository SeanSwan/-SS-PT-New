import { describe, expect, it } from 'vitest';
import { pointsForLevel } from './gamification';
import {
  getProgressionBeatsForLevel,
  getUpcomingProgressionBeats,
} from './gamificationProgression';

describe('frontend gamification progression beats', () => {
  it('announces rank-title unlocks at the approved title boundaries', () => {
    const beats = getProgressionBeatsForLevel(21, { points: pointsForLevel(20) });

    expect(beats[0]).toMatchObject({
      level: 21,
      type: 'rank_title',
      label: 'Rank Title Unlock',
      reward: 'Equip Dawn Wing',
      rankTitleKey: 'dawn_wing',
      rankTitleName: 'Dawn Wing',
    });
    expect(beats[0].pointsRemaining).toBeGreaterThan(0);
  });

  it('adds dense non-title checkpoints between rank titles', () => {
    expect(getProgressionBeatsForLevel(25)[0]).toMatchObject({
      type: 'badge_showcase',
      label: 'Badge Showcase Charge',
    });
    expect(getProgressionBeatsForLevel(50)[0]).toMatchObject({
      type: 'skill_tree_surge',
      label: 'Skill Tree Surge',
    });
    expect(getProgressionBeatsForLevel(100)[0]).toMatchObject({
      type: 'biome_chapter',
      label: 'Biome Chapter',
    });
  });

  it('returns the next user-facing beat per upcoming level without overflowing the lifetime cap', () => {
    const upcoming = getUpcomingProgressionBeats({ level: 20, points: pointsForLevel(20), count: 4 });

    expect(upcoming.map((beat) => [beat.level, beat.type])).toEqual([
      [21, 'rank_title'],
      [25, 'badge_showcase'],
      [30, 'momentum'],
      [31, 'rank_title'],
    ]);
    expect(upcoming[0]).toMatchObject({ levelsAway: 1, pointsRequired: pointsForLevel(21) });
    expect(getUpcomingProgressionBeats({ level: 1000 })).toEqual([]);
  });
});
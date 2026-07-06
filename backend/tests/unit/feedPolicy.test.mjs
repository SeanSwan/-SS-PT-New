/**
 * feedPolicy.test — regression locks for the 2026-07-06 trust triple
 * ===================================================================
 * Locks the feed visibility contract: own posts at any visibility,
 * friends' posts ONLY public/friends (the old query leaked friends'
 * PRIVATE posts), strangers only public. Also locks composer type
 * normalization ('transformation' is not a SocialPost.type enum label
 * and used to 500 the live Home composer).
 */
import { describe, it, expect } from 'vitest';
import { Op } from 'sequelize';
import { buildFeedVisibilityWhere, normalizePostType } from '../../routes/social/feedPolicy.mjs';

const ALLOWED = ['general', 'workout', 'achievement', 'challenge', 'milestone', 'creative', 'dance', 'music', 'singing', 'art', 'gaming', 'comedy'];

describe('normalizePostType', () => {
  it("maps the composer 'transformation' type to 'milestone' (enum-drift 500 fix)", () => {
    expect(normalizePostType('transformation', ALLOWED)).toBe('milestone');
  });

  it('passes through every valid enum type unchanged', () => {
    for (const t of ALLOWED) expect(normalizePostType(t, ALLOWED)).toBe(t);
  });

  it('falls back to general for unknown, empty, or non-string types', () => {
    expect(normalizePostType('nonsense', ALLOWED)).toBe('general');
    expect(normalizePostType(undefined, ALLOWED)).toBe('general');
    expect(normalizePostType(42, ALLOWED)).toBe('general');
    expect(normalizePostType('', ALLOWED)).toBe('general');
    expect(normalizePostType('  transformation  ', ALLOWED)).toBe('milestone');
  });
});

describe('buildFeedVisibilityWhere — friends\' private posts must never leak', () => {
  it('viewer sees own posts at ANY visibility; friends only public+friends; strangers only public', () => {
    const where = buildFeedVisibilityWhere(7, [8, 9]);
    const branches = where[Op.or];
    expect(branches).toHaveLength(3);
    expect(branches[0]).toEqual({ userId: 7 });
    expect(branches[1].userId[Op.in]).toEqual([8, 9]);
    expect(branches[1].visibility[Op.in]).toEqual(['public', 'friends']);
    expect(branches[2]).toEqual({ visibility: 'public' });
  });

  it('omits the friend branch entirely when the viewer has no friends', () => {
    const where = buildFeedVisibilityWhere(7, []);
    expect(where[Op.or]).toHaveLength(2);
    expect(where[Op.or][0]).toEqual({ userId: 7 });
    expect(where[Op.or][1]).toEqual({ visibility: 'public' });
  });

  it('never produces a friend-ids branch without a visibility filter (the leaky shape)', () => {
    const where = buildFeedVisibilityWhere(7, [8]);
    for (const branch of where[Op.or]) {
      if (branch.userId && branch.userId[Op.in]) {
        expect(branch.visibility).toBeDefined();
        expect(branch.visibility[Op.in]).not.toContain('private');
      }
    }
  });
});

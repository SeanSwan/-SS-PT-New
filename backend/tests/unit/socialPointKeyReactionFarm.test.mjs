/**
 * socialPointKeyReactionFarm.test.mjs
 * ===================================
 * Regression for the reaction point-farm (hostile review round 5, 2026-07-11).
 *
 * Reactions allow 3 types (swan/heart/thumbs_up) and each is a distinct SocialLike row,
 * but the point rules are flat per relationship (post_like_given:1, post_like_received:2).
 * buildSocialPointKey used to fold reactionType into the idempotency key, so one user
 * cycling all three reactions on a post minted the award THREE times (3 pts to the reactor,
 * 6 to the owner), and removeReaction never clawed it back -> a permanent, repeatable
 * leaderboard/balance farm. The key must be identical across reaction types.
 */
import { describe, expect, it } from 'vitest';
import { buildSocialPointKey } from '../../routes/social/posts.mjs';

describe('buildSocialPointKey — reaction-type must NOT change the point idempotency key', () => {
  it('produces the SAME key for every reaction type on the same (user, action, post)', () => {
    const swan = buildSocialPointKey(7, 'post_like_given', { postId: 42, reactionType: 'swan' });
    const heart = buildSocialPointKey(7, 'post_like_given', { postId: 42, reactionType: 'heart' });
    const thumbs = buildSocialPointKey(7, 'post_like_given', { postId: 42, reactionType: 'thumbs_up' });
    expect(heart).toBe(swan);
    expect(thumbs).toBe(swan);
    // ...and it is still scoped per post (a different post = a different, legitimate award).
    expect(buildSocialPointKey(7, 'post_like_given', { postId: 99, reactionType: 'swan' })).not.toBe(swan);
  });

  it('still distinguishes user, action, and post', () => {
    const base = buildSocialPointKey(7, 'post_like_received', { postId: 42 });
    expect(buildSocialPointKey(8, 'post_like_received', { postId: 42 })).not.toBe(base); // user
    expect(buildSocialPointKey(7, 'post_like_given', { postId: 42 })).not.toBe(base);    // action
    expect(buildSocialPointKey(7, 'post_like_received', { postId: 43 })).not.toBe(base); // post
  });
});

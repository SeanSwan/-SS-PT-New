/**
 * Launch audit 2026-08-04 — /api/social/posts/trending like-shape contract.
 *
 * REGRESSION: the trending handler queried `SocialLike` with
 *   where: { postId: {...} }, attributes: ['postId']
 * but SocialLike has NO `postId` column. It is a POLYMORPHIC table keyed on
 * (targetType, targetId) — see models/social/SocialLike.mjs. Postgres raised
 * 42703 "column postId does not exist", and the handler's inner catch only
 * swallows 42P01 (missing table), so the error re-threw and the endpoint
 * returned 500 for every request where at least one post existed. It "worked"
 * on an empty feed and broke the moment the site had content — exactly the
 * shape of bug that survives staging and fails at launch.
 *
 * /feed already used the correct shape; /trending was the lone hand-rolled
 * outlier. These assertions pin the model's real shape AND the call site, and
 * use sliceBetween so a drifted anchor fails loudly rather than silently
 * widening or emptying the assertion window.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { sliceBetween } from '../helpers/sliceBetween.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const read = (p) => readFileSync(resolve(__dirname, p), 'utf8').replace(/\r\n/g, '\n');

const likeModelSource = read('../../models/social/SocialLike.mjs');
const postsRouteSource = read('../../routes/social/posts.mjs');

describe('social trending like-shape contract', () => {
  it('SocialLike is polymorphic — it has no postId column', () => {
    // If someone ever ADDS a real postId column, this test should be revisited
    // deliberately rather than silently drifting.
    expect(likeModelSource).toContain('targetType: {');
    expect(likeModelSource).toContain('targetId: {');
    expect(likeModelSource).not.toMatch(/^\s{2}postId:\s*\{/m);
  });

  it('the trending handler queries likes by targetType/targetId, never postId', () => {
    const trendingBlock = sliceBetween(
      postsRouteSource,
      "router.get('/trending'",
      "router.get('/user/:userId'",
      { label: 'posts.mjs /trending handler' },
    );

    // The canonical polymorphic shape must be present...
    expect(trendingBlock).toContain("targetType: 'post'");
    expect(trendingBlock).toContain('targetId: { [Op.in]: postIds }');
    expect(trendingBlock).toContain("attributes: ['targetId']");
    // ...and the drifted shape must not come back.
    expect(trendingBlock).not.toContain('where: { postId: { [Op.in]: postIds }, userId: req.user.id }');
    expect(trendingBlock).not.toContain("l.postId");
  });
});

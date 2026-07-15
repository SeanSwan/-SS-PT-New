/**
 * ============================================================================
 * FILE: postFeedFormatter.mjs
 * PURPOSE: Shared post-list decoration (comment counts, reactions, likes)
 *          for feed-style responses. First consumer: the group feed.
 * AUTHOR: Claude Fable 5 | LAST MODIFIED: 2026-07-14
 * ============================================================================
 *
 * Mirrors the decoration logic of GET /api/social/posts/feed so group feeds
 * return the exact same post shape the frontend PostCard already renders.
 * (The legacy feed keeps its inline copy untouched — surgical-change rule.)
 */

import { Op } from 'sequelize';
import sequelize from '../../database.mjs';
import { SocialComment, SocialLike } from '../../models/social/index.mjs';

export async function decoratePostsForFeed(posts, viewerId) {
  const postIds = posts.map((post) => post.id);
  if (postIds.length === 0) return [];

  const commentsCount = await SocialComment.findAll({
    attributes: ['postId', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
    where: { postId: { [Op.in]: postIds } },
    group: ['postId'],
    raw: true,
  });
  const commentCountMap = {};
  for (const item of commentsCount) commentCountMap[item.postId] = parseInt(item.count, 10);

  let reactionCountsMap = {};
  let userReactionsMap = {};
  try {
    reactionCountsMap = await SocialLike.getReactionCounts(postIds);
    userReactionsMap = await SocialLike.getUserReactions(viewerId, postIds);
  } catch {
    // Reaction helpers unavailable — legacy like check below still applies.
  }

  const userLikes = await SocialLike.findAll({
    where: { userId: viewerId, targetType: 'post', targetId: { [Op.in]: postIds } },
    attributes: ['targetId'],
  });
  const likedPostIds = new Set(userLikes.map((like) => like.targetId));

  return posts.map((post) => {
    const postObj = typeof post.toJSON === 'function' ? post.toJSON() : { ...post };
    postObj.commentsCount = commentCountMap[post.id] || 0;
    postObj.isLiked = likedPostIds.has(post.id);
    postObj.reactionCounts = reactionCountsMap[post.id] || { thumbs_up: 0, heart: 0, swan: 0 };
    postObj.userReactions = userReactionsMap[post.id] || [];
    return postObj;
  });
}

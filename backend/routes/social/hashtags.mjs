/**
 * ============================================================================
 * FILE: hashtags.mjs
 * PURPOSE: REST API routes for hashtag discovery, following, and management
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-24
 * AI VILLAGE VALIDATED: 2026-03-24
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Provides endpoints for trending hashtags, search,
 * follow/unfollow, hashtag pages, and admin moderation.
 * HOW IT FITS IN THE APP: Frontend FeedFilterBar / TrendingHashtags → this API
 *
 * KEY DECISIONS: Utility functions (extractHashtags, processHashtags, reset)
 * live in hashtagUtils.mjs to comply with 300-line monolith rule.
 *
 * ARCHITECTURE:
 * graph TD
 *   FeedFilterBar -->|GET /trending| TrendingEndpoint
 *   SearchBar -->|GET /search| SearchEndpoint
 *   UserProfile -->|GET /following| FollowingEndpoint
 *   HashtagPage -->|GET /:slug| DetailEndpoint
 *   HashtagChip -->|POST /follow| FollowEndpoint
 *   HashtagChip -->|DELETE /unfollow| UnfollowEndpoint
 */

import express from 'express';
import { Op } from 'sequelize';
import rateLimit from 'express-rate-limit';
import sequelize from '../../database.mjs';
import { protect } from '../../middleware/authMiddleware.mjs';
import Hashtag from '../../models/social/Hashtag.mjs';
import PostHashtag from '../../models/social/PostHashtag.mjs';
import UserHashtagFollow from '../../models/social/UserHashtagFollow.mjs';
import { SocialPost } from '../../models/social/index.mjs';
import { getUser } from '../../models/index.mjs';
import { directoryAttributes } from '../../utils/memberDirectoryAccess.mjs';

// Re-export utilities for backward compatibility with posts.mjs imports
export { extractHashtags, processHashtags, resetWeeklyCounters } from './hashtagUtils.mjs';

const router = express.Router();
router.use(protect);

// ─────────────────────────────────────────────────────────────
// SECTION: Rate Limiters
// PURPOSE: Prevent spam on follow/unfollow actions
// ─────────────────────────────────────────────────────────────
const followLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minute window
  max: 10,              // 10 follow/unfollow actions per minute
  message: { success: false, message: 'Too many follow actions. Try again in a minute.' },
  standardHeaders: true,
  legacyHeaders: false
});

// ─────────────────────────────────────────────────────────────
// SECTION: Discovery Routes (trending, search, suggestions)
// ─────────────────────────────────────────────────────────────

/**
 * GET /trending — Top trending hashtags
 * Query: ?category=fitness|creative|community&limit=20
 */
router.get('/trending', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const category = req.query.category;

    const where = { isBanned: false };
    if (category && ['fitness', 'creative', 'community', 'general'].includes(category)) {
      where.category = category;
    }

    const hashtags = await Hashtag.findAll({
      where,
      order: [['weeklyCount', 'DESC'], ['usageCount', 'DESC']],
      limit,
      attributes: ['id', 'name', 'slug', 'category', 'usageCount', 'weeklyCount', 'isOfficial']
    });

    return res.json({ success: true, data: hashtags });
  } catch (error) {
    // Non-fatal: table may not be migrated yet in production
    if (error.name === 'SequelizeDatabaseError' && error.message?.includes('does not exist')) {
      return res.json({ success: true, data: [] });
    }
    console.error('Error fetching trending hashtags:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch trending hashtags' });
  }
});

/**
 * GET /search — Search hashtags by prefix (for autocomplete)
 * Query: ?q=dan&limit=10
 */
router.get('/search', async (req, res) => {
  try {
    const q = (req.query.q || '').toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (q.length < 1) {
      return res.json({ success: true, data: [] });
    }

    const limit = Math.min(parseInt(req.query.limit) || 10, 30);

    const hashtags = await Hashtag.findAll({
      where: {
        name: { [Op.like]: `${q}%` },
        isBanned: false
      },
      order: [['usageCount', 'DESC']],
      limit,
      attributes: ['id', 'name', 'slug', 'category', 'usageCount', 'isOfficial']
    });

    return res.json({ success: true, data: hashtags });
  } catch (error) {
    console.error('Error searching hashtags:', error);
    return res.status(500).json({ success: false, message: 'Failed to search hashtags' });
  }
});

/**
 * GET /following — User's followed hashtags
 */
router.get('/following', async (req, res) => {
  try {
    const follows = await UserHashtagFollow.findAll({
      where: { userId: req.user.id },
      include: [{
        model: Hashtag,
        as: 'hashtag',
        attributes: ['id', 'name', 'slug', 'category', 'usageCount', 'isOfficial']
      }]
    });

    const hashtags = follows
      .filter(f => f.hashtag)
      .map(f => f.hashtag);

    return res.json({ success: true, data: hashtags });
  } catch (error) {
    console.error('Error fetching followed hashtags:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch followed hashtags' });
  }
});

/**
 * GET /suggestions — Suggested hashtags (popular ones user hasn't used/followed)
 */
router.get('/suggestions', async (req, res) => {
  try {
    const recentPostIds = await SocialPost.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']],
      limit: 20,
      attributes: ['id']
    });

    const postIds = recentPostIds.map(p => p.id);

    const usedTagIds = postIds.length > 0
      ? (await PostHashtag.findAll({
          where: { postId: { [Op.in]: postIds } },
          attributes: ['hashtagId'],
          group: ['hashtagId']
        })).map(ph => ph.hashtagId)
      : [];

    const followedIds = (await UserHashtagFollow.findAll({
      where: { userId: req.user.id },
      attributes: ['hashtagId']
    })).map(f => f.hashtagId);

    const excludeIds = [...new Set([...usedTagIds, ...followedIds])];

    const suggestions = await Hashtag.findAll({
      where: {
        isBanned: false,
        ...(excludeIds.length > 0 ? { id: { [Op.notIn]: excludeIds } } : {})
      },
      order: [['usageCount', 'DESC']],
      limit: 10,
      attributes: ['id', 'name', 'slug', 'category', 'usageCount', 'isOfficial']
    });

    return res.json({ success: true, data: suggestions });
  } catch (error) {
    console.error('Error fetching hashtag suggestions:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch suggestions' });
  }
});

// ─────────────────────────────────────────────────────────────
// SECTION: Hashtag Detail Page
// ─────────────────────────────────────────────────────────────

/**
 * GET /:slug — Hashtag detail page with posts + related tags
 * Query: ?page=1&limit=20&sort=recent|popular
 */
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const offset = (page - 1) * limit;
    const sort = req.query.sort === 'popular' ? 'popular' : 'recent';

    const hashtag = await Hashtag.findOne({
      where: { slug: slug.toLowerCase(), isBanned: false }
    });

    if (!hashtag) {
      return res.status(404).json({ success: false, message: 'Hashtag not found' });
    }

    const followerCount = await UserHashtagFollow.count({ where: { hashtagId: hashtag.id } });
    const isFollowing = await UserHashtagFollow.findOne({
      where: { userId: req.user.id, hashtagId: hashtag.id }
    });

    // Candidate post ids tagged with this hashtag. Group posts must be
    // excluded BEFORE pagination + related-tags derivation, otherwise a
    // private group's co-occurring hashtag names leak onto the public tag
    // page and pagination.total is inflated. We resolve the candidate set to
    // non-group ids first, then paginate/relate on the clean list.
    const candidateIds = (await PostHashtag.findAll({
      where: { hashtagId: hashtag.id },
      attributes: ['postId'],
      order: [['createdAt', 'DESC']],
      limit: 500
    })).map(ph => ph.postId);

    // Keep only non-group posts, preserving the candidate ordering.
    const nonGroupRows = candidateIds.length > 0
      ? await SocialPost.findAll({
          where: { id: { [Op.in]: candidateIds }, groupId: null },
          attributes: ['id'],
          raw: true
        })
      : [];
    const nonGroupSet = new Set(nonGroupRows.map(r => r.id));
    const postIds = candidateIds.filter(id => nonGroupSet.has(id));

    const paginatedIds = postIds.slice(offset, offset + limit);

    const posts = paginatedIds.length > 0
      ? await SocialPost.findAll({
          where: {
            id: { [Op.in]: paginatedIds },
            moderationStatus: { [Op.or]: ['approved', null] },
            // Belt-and-suspenders: postIds is already group-filtered above.
            groupId: null
          },
          order: sort === 'popular'
            ? [['likesCount', 'DESC'], ['createdAt', 'DESC']]
            : [['createdAt', 'DESC']],
          include: [{
            model: getUser(),
            as: 'user',
            attributes: directoryAttributes(req.user)
          }]
        })
      : [];

    // Co-occurring hashtags for "Related" section
    let relatedHashtags = [];
    if (paginatedIds.length > 0) {
      const relatedTagIds = await PostHashtag.findAll({
        where: {
          postId: { [Op.in]: postIds.slice(0, 100) },
          hashtagId: { [Op.ne]: hashtag.id }
        },
        attributes: [
          'hashtagId',
          [sequelize.fn('COUNT', sequelize.col('hashtagId')), 'coCount']
        ],
        group: ['hashtagId'],
        order: [[sequelize.literal('"coCount"'), 'DESC']],
        limit: 8,
        raw: true
      });

      if (relatedTagIds.length > 0) {
        relatedHashtags = await Hashtag.findAll({
          where: {
            id: { [Op.in]: relatedTagIds.map(r => r.hashtagId) },
            isBanned: false
          },
          attributes: ['id', 'name', 'slug', 'category', 'usageCount', 'isOfficial']
        });
      }
    }

    return res.json({
      success: true,
      data: {
        hashtag: { ...hashtag.toJSON(), followerCount, isFollowing: !!isFollowing },
        posts: posts.map(p => p.toJSON()),
        relatedHashtags,
        pagination: { page, limit, total: postIds.length, hasMore: offset + limit < postIds.length }
      }
    });
  } catch (error) {
    console.error('Error fetching hashtag page:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch hashtag' });
  }
});

// ─────────────────────────────────────────────────────────────
// SECTION: Follow / Unfollow (rate-limited)
// ─────────────────────────────────────────────────────────────

/**
 * POST /follow/:hashtagId — Follow a hashtag
 */
router.post('/follow/:hashtagId', followLimiter, async (req, res) => {
  try {
    const hashtagId = parseInt(req.params.hashtagId);
    const hashtag = await Hashtag.findByPk(hashtagId);
    if (!hashtag || hashtag.isBanned) {
      return res.status(404).json({ success: false, message: 'Hashtag not found' });
    }

    await UserHashtagFollow.findOrCreate({
      where: { userId: req.user.id, hashtagId },
      defaults: { userId: req.user.id, hashtagId }
    });

    return res.json({ success: true, message: `Now following #${hashtag.name}` });
  } catch (error) {
    console.error('Error following hashtag:', error);
    return res.status(500).json({ success: false, message: 'Failed to follow hashtag' });
  }
});

/**
 * DELETE /unfollow/:hashtagId — Unfollow a hashtag
 */
router.delete('/unfollow/:hashtagId', followLimiter, async (req, res) => {
  try {
    const hashtagId = parseInt(req.params.hashtagId);
    await UserHashtagFollow.destroy({
      where: { userId: req.user.id, hashtagId }
    });

    return res.json({ success: true, message: 'Unfollowed hashtag' });
  } catch (error) {
    console.error('Error unfollowing hashtag:', error);
    return res.status(500).json({ success: false, message: 'Failed to unfollow hashtag' });
  }
});

export default router;

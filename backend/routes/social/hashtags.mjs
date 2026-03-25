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
 */

import express from 'express';
import { Op } from 'sequelize';
import sequelize from '../../database.mjs';
import { protect } from '../../middleware/authMiddleware.mjs';
import Hashtag from '../../models/social/Hashtag.mjs';
import PostHashtag from '../../models/social/PostHashtag.mjs';
import UserHashtagFollow from '../../models/social/UserHashtagFollow.mjs';
import { SocialPost } from '../../models/social/index.mjs';
import { getUser } from '../../models/index.mjs';
import logger from '../../utils/logger.mjs';

const router = express.Router();
router.use(protect);

// ─────────────────────────────────────────────────────────────
// SECTION: Hashtag Extraction Utility
// PURPOSE: Extract and normalize hashtags from post content
// ─────────────────────────────────────────────────────────────

// Matches #hashtag (alphanumeric + underscores, 2-30 chars)
const HASHTAG_REGEX = /#([a-zA-Z0-9_]{2,30})/g;

/**
 * Extract unique hashtag names from text content.
 * @param {string} content - Post text content
 * @returns {string[]} Array of lowercase hashtag names (without #)
 */
export function extractHashtags(content) {
  if (!content || typeof content !== 'string') return [];
  const matches = content.match(HASHTAG_REGEX) || [];
  return [...new Set(matches.map(m => m.slice(1).toLowerCase()))].slice(0, 10);
}

/**
 * Process extracted hashtags: find-or-create, link to post, update counts.
 * @param {number} postId - The post ID to link hashtags to
 * @param {string[]} tagNames - Array of normalized tag names
 * @param {object} [transaction] - Optional Sequelize transaction
 * @returns {object[]} Array of linked Hashtag records
 */
export async function processHashtags(postId, tagNames, transaction = null) {
  if (!tagNames || tagNames.length === 0) return [];
  const { classifyHashtag } = await import('../../models/social/Hashtag.mjs');

  const linkedTags = [];

  for (const name of tagNames) {
    try {
      // Find or create the hashtag
      const [hashtag] = await Hashtag.findOrCreate({
        where: { name },
        defaults: {
          name,
          slug: name,
          category: classifyHashtag(name),
          isOfficial: false,
          isBanned: false
        },
        ...(transaction ? { transaction } : {})
      });

      // Skip banned hashtags
      if (hashtag.isBanned) continue;

      // Create the join record (ignore duplicates)
      await PostHashtag.findOrCreate({
        where: { postId, hashtagId: hashtag.id },
        defaults: { postId, hashtagId: hashtag.id },
        ...(transaction ? { transaction } : {})
      });

      // Increment usage counts
      await hashtag.increment(['usageCount', 'weeklyCount'], {
        ...(transaction ? { transaction } : {})
      });

      linkedTags.push(hashtag);
    } catch (err) {
      // Non-fatal: log and continue with other tags
      if (logger && logger.warn) {
        logger.warn(`Failed to process hashtag "${name}": ${err.message}`);
      } else {
        console.warn(`Failed to process hashtag "${name}": ${err.message}`);
      }
    }
  }

  return linkedTags;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Public Routes
// ─────────────────────────────────────────────────────────────

/**
 * GET /trending — Top trending hashtags
 * Query: ?period=24h|7d|30d&category=fitness|creative|community&limit=20
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
 * GET /suggestions — Suggested hashtags for user (based on recent post history)
 */
router.get('/suggestions', async (req, res) => {
  try {
    // Get hashtags from user's recent posts
    const recentPostIds = await SocialPost.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']],
      limit: 20,
      attributes: ['id']
    });

    const postIds = recentPostIds.map(p => p.id);

    // Find hashtags user has used
    const usedTagIds = postIds.length > 0
      ? (await PostHashtag.findAll({
          where: { postId: { [Op.in]: postIds } },
          attributes: ['hashtagId'],
          group: ['hashtagId']
        })).map(ph => ph.hashtagId)
      : [];

    // Find hashtags the user already follows
    const followedIds = (await UserHashtagFollow.findAll({
      where: { userId: req.user.id },
      attributes: ['hashtagId']
    })).map(f => f.hashtagId);

    const excludeIds = [...new Set([...usedTagIds, ...followedIds])];

    // Suggest popular hashtags the user hasn't interacted with
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

/**
 * GET /:slug — Hashtag detail page with posts
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

    // Count followers
    const followerCount = await UserHashtagFollow.count({
      where: { hashtagId: hashtag.id }
    });

    // Check if current user follows this hashtag
    const isFollowing = await UserHashtagFollow.findOne({
      where: { userId: req.user.id, hashtagId: hashtag.id }
    });

    // Get posts with this hashtag
    const postIds = (await PostHashtag.findAll({
      where: { hashtagId: hashtag.id },
      attributes: ['postId'],
      order: [['createdAt', 'DESC']],
      limit: limit + offset
    })).map(ph => ph.postId);

    const paginatedIds = postIds.slice(offset, offset + limit);

    const posts = paginatedIds.length > 0
      ? await SocialPost.findAll({
          where: {
            id: { [Op.in]: paginatedIds },
            moderationStatus: { [Op.or]: ['approved', null] }
          },
          order: sort === 'popular'
            ? [['likesCount', 'DESC'], ['createdAt', 'DESC']]
            : [['createdAt', 'DESC']],
          include: [{
            model: getUser(),
            as: 'user',
            attributes: ['id', 'firstName', 'lastName', 'username', 'photo']
          }]
        })
      : [];

    // Get related hashtags (co-occurring tags in the same posts)
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
        order: [[sequelize.literal('\"coCount\"'), 'DESC']],
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
        hashtag: {
          ...hashtag.toJSON(),
          followerCount,
          isFollowing: !!isFollowing
        },
        posts: posts.map(p => p.toJSON()),
        relatedHashtags,
        pagination: {
          page,
          limit,
          total: postIds.length,
          hasMore: offset + limit < postIds.length
        }
      }
    });
  } catch (error) {
    console.error('Error fetching hashtag page:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch hashtag' });
  }
});

/**
 * POST /follow/:hashtagId — Follow a hashtag
 */
router.post('/follow/:hashtagId', async (req, res) => {
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
router.delete('/unfollow/:hashtagId', async (req, res) => {
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

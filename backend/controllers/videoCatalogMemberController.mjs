/**
 * Video Catalog Member Controller
 * =================================
 * Handles authenticated member-only endpoints for the video library.
 * All routes require the `protect` middleware (req.user is guaranteed).
 *
 * Security model:
 *   - All endpoints require authentication (protect middleware).
 *   - List endpoints return thumbnail URLs only — never signed playback URLs.
 *   - Progress/history data is scoped to the authenticated user.
 *   - View tracking is fire-and-forget (async, non-blocking).
 *
 * Routes:
 *   GET   /api/v2/videos/members              → memberVideos
 *   POST  /api/v2/videos/:id/progress         → saveProgress
 *   GET   /api/v2/videos/history              → getHistory
 *   POST  /api/v2/videos/:id/track            → trackView
 *   POST  /api/v2/videos/:id/outbound-click   → trackOutboundClick
 */

import logger from '../utils/logger.mjs';
import { getVideoCatalog, getUserWatchHistory, getVideoOutboundClick, Op } from '../models/index.mjs';
import { generateThumbnailUrl } from '../services/r2StorageService.mjs';

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Resolve a thumbnail URL for a video.
 * @param {Object} video - plain object with thumbnailKey / thumbnailUrl
 * @returns {Promise<string|null>}
 */
async function resolveThumbnailUrl(video) {
  if (video.thumbnailKey) {
    try {
      return await generateThumbnailUrl(video.thumbnailKey);
    } catch (err) {
      logger.warn('Failed to generate thumbnail signed URL', {
        videoId: video.id,
        thumbnailKey: video.thumbnailKey,
        error: err.message,
      });
      return null;
    }
  }
  if (video.thumbnailUrl) {
    return video.thumbnailUrl;
  }
  return null;
}

// ── memberVideos ─────────────────────────────────────────────────────────────

/**
 * GET /api/v2/videos/members
 *
 * Members-only video catalog. Returns all published videos across all
 * visibility levels (public, unlisted, members_only) since the user is
 * authenticated. Only thumbnail URLs are returned — no signed playback URLs.
 *
 * Query params:
 *   - contentType: filter by content_type ENUM value
 *   - tags: comma-separated tag list (JSONB @> containment)
 *   - page: page number (default 1)
 *   - limit: items per page (default 12, max 50)
 */
export async function memberVideos(req, res) {
  try {
    const VideoCatalog = getVideoCatalog();

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 12));
    const offset = (page - 1) * limit;

    // Always published — members see all visibility levels
    const where = { status: 'published' };

    // Optional: filter by contentType
    if (req.query.contentType) {
      where.contentType = req.query.contentType;
    }

    // Optional: filter by tags (JSONB containment)
    if (req.query.tags) {
      const tagList = req.query.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      if (tagList.length > 0) {
        where.tags = { [Op.contains]: tagList };
      }
    }

    const { count, rows } = await VideoCatalog.findAndCountAll({
      where,
      attributes: [
        'id', 'title', 'slug', 'description', 'contentType', 'source',
        'visibility', 'accessTier', 'durationSeconds', 'thumbnailKey',
        'thumbnailUrl', 'tags', 'viewCount', 'likeCount', 'featured',
        'sortOrder', 'publishedAt', 'youtubeVideoId',
      ],
      order: [
        ['featured', 'DESC'],
        ['sortOrder', 'ASC'],
        ['publishedAt', 'DESC'],
      ],
      limit,
      offset,
    });

    const videos = await Promise.all(
      rows.map(async (row) => {
        const video = row.toJSON();
        video.thumbnail = await resolveThumbnailUrl(video);
        delete video.thumbnailKey;
        delete video.thumbnailUrl;
        video.locked = false; // Members see everything unlocked
        return video;
      })
    );

    const totalPages = Math.ceil(count / limit);

    return res.status(200).json({
      success: true,
      data: {
        videos,
        pagination: {
          page,
          limit,
          total: count,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      },
    });
  } catch (err) {
    logger.error('memberVideos failed', { error: err.message, stack: err.stack });
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

// ── saveProgress ─────────────────────────────────────────────────────────────

/**
 * POST /api/v2/videos/:id/progress
 *
 * Save or update watch progress for the authenticated user.
 * Uses upsert on the (user_id, video_id) unique index.
 *
 * Body:
 *   - progressSeconds: number (required) — current playback position
 *   - completionPct: number (0-100) — percentage watched
 *   - completed: boolean — whether the video has been fully watched
 */
export async function saveProgress(req, res) {
  try {
    const UserWatchHistory = getUserWatchHistory();
    const VideoCatalog = getVideoCatalog();

    const { id: videoId } = req.params;
    const userId = req.user.id;
    const { progressSeconds, completionPct, completed } = req.body;

    // Validate required field
    if (progressSeconds == null || typeof progressSeconds !== 'number') {
      return res.status(400).json({
        success: false,
        error: 'progressSeconds is required and must be a number',
      });
    }

    // Verify video exists
    const video = await VideoCatalog.findByPk(videoId, {
      attributes: ['id'],
    });

    if (!video) {
      return res.status(404).json({ success: false, error: 'Video not found' });
    }

    // Upsert watch history — FK fields use snake_case per model column names
    const [record, created] = await UserWatchHistory.findOrCreate({
      where: {
        user_id: userId,
        video_id: videoId,
      },
      defaults: {
        user_id: userId,
        video_id: videoId,
        progress_seconds: Math.max(0, Math.floor(progressSeconds)),
        completion_pct: completionPct != null ? Math.min(100, Math.max(0, completionPct)) : 0,
        completed: !!completed,
        last_watched_at: new Date(),
      },
    });

    if (!created) {
      // Update existing record
      await record.update({
        progress_seconds: Math.max(0, Math.floor(progressSeconds)),
        completion_pct: completionPct != null ? Math.min(100, Math.max(0, completionPct)) : record.completion_pct,
        completed: completed != null ? !!completed : record.completed,
        last_watched_at: new Date(),
      });
    }

    logger.info('Watch progress saved', {
      userId,
      videoId,
      progressSeconds,
      completionPct,
      completed,
      created,
    });

    return res.status(200).json({
      success: true,
      data: {
        progressSeconds: record.progress_seconds,
        completionPct: parseFloat(record.completion_pct),
        completed: record.completed,
        lastWatchedAt: record.last_watched_at,
      },
    });
  } catch (err) {
    logger.error('saveProgress failed', {
      videoId: req.params.id,
      userId: req.user?.id,
      error: err.message,
      stack: err.stack,
    });
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

// ── getHistory ───────────────────────────────────────────────────────────────

/**
 * GET /api/v2/videos/history
 *
 * Return the authenticated user's watch history with resume points.
 * Ordered by last_watched_at DESC (most recently watched first).
 *
 * Query params:
 *   - page: page number (default 1)
 *   - limit: items per page (default 20, max 50)
 */
export async function getHistory(req, res) {
  try {
    const UserWatchHistory = getUserWatchHistory();
    const VideoCatalog = getVideoCatalog();
    const userId = req.user.id;

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;

    const { count, rows } = await UserWatchHistory.findAndCountAll({
      where: { user_id: userId },
      include: [
        {
          model: VideoCatalog,
          as: 'video',
          attributes: [
            'id', 'title', 'slug', 'description', 'thumbnailKey',
            'thumbnailUrl', 'durationSeconds', 'source', 'contentType',
          ],
          where: { status: 'published' },
          required: true,
        },
      ],
      order: [['last_watched_at', 'DESC']],
      limit,
      offset,
    });

    const history = await Promise.all(
      rows.map(async (row) => {
        const entry = row.toJSON();
        const videoData = entry.video;

        // Resolve thumbnail
        let thumbnail = null;
        if (videoData) {
          thumbnail = await resolveThumbnailUrl(videoData);
        }

        return {
          videoId: entry.video_id,
          title: videoData?.title || null,
          slug: videoData?.slug || null,
          thumbnail,
          durationSeconds: videoData?.durationSeconds || null,
          contentType: videoData?.contentType || null,
          progressSeconds: entry.progress_seconds,
          completionPct: parseFloat(entry.completion_pct),
          completed: entry.completed,
          lastWatchedAt: entry.last_watched_at,
        };
      })
    );

    const totalPages = Math.ceil(count / limit);

    return res.status(200).json({
      success: true,
      data: {
        history,
        pagination: {
          page,
          limit,
          total: count,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      },
    });
  } catch (err) {
    logger.error('getHistory failed', {
      userId: req.user?.id,
      error: err.message,
      stack: err.stack,
    });
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

// ── trackView ────────────────────────────────────────────────────────────────

/**
 * POST /api/v2/videos/:id/track
 *
 * Increment the view_count on a video. This is fire-and-forget:
 * the response is sent immediately, and the DB update runs async
 * so playback is not blocked.
 */
export async function trackView(req, res) {
  const { id: videoId } = req.params;
  const userId = req.user.id;

  // Respond immediately — don't block playback
  res.status(202).json({ success: true, data: { tracked: true } });

  // Async increment — errors are logged but do not affect the client
  try {
    const VideoCatalog = getVideoCatalog();

    await VideoCatalog.increment('viewCount', {
      where: { id: videoId },
    });

    logger.info('View tracked', { videoId, userId });
  } catch (err) {
    logger.error('trackView async increment failed', {
      videoId,
      userId,
      error: err.message,
    });
  }
}

// ── trackOutboundClick ───────────────────────────────────────────────────────

/**
 * POST /api/v2/videos/:id/outbound-click
 *
 * Record an outbound click event (e.g., "Watch on YouTube", "Subscribe").
 * Used for YouTube funnel analytics and CTA conversion tracking.
 *
 * Body:
 *   - clickType: string (required) — one of: watch_on_youtube, subscribe, playlist, channel
 *   - sessionId: string (optional) — client-side session identifier
 */
export async function trackOutboundClick(req, res) {
  try {
    const VideoOutboundClick = getVideoOutboundClick();
    const { id: videoId } = req.params;
    const userId = req.user.id;
    const { clickType, sessionId } = req.body;

    // Validate clickType
    const validClickTypes = ['watch_on_youtube', 'subscribe', 'playlist', 'channel'];
    if (!clickType || !validClickTypes.includes(clickType)) {
      return res.status(400).json({
        success: false,
        error: `clickType is required and must be one of: ${validClickTypes.join(', ')}`,
      });
    }

    // Create outbound click record — FK fields use snake_case per model column names
    const record = await VideoOutboundClick.create({
      video_id: videoId,
      user_id: userId,
      click_type: clickType,
      session_id: sessionId || null,
      clicked_at: new Date(),
    });

    logger.info('Outbound click tracked', {
      videoId,
      userId,
      clickType,
      sessionId: sessionId || null,
      recordId: record.id,
    });

    return res.status(201).json({
      success: true,
      data: { recorded: true },
    });
  } catch (err) {
    logger.error('trackOutboundClick failed', {
      videoId: req.params.id,
      userId: req.user?.id,
      error: err.message,
      stack: err.stack,
    });
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

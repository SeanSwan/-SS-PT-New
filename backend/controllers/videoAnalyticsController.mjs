/**
 * Video Analytics Controller
 * ==========================
 *
 * Purpose: Admin-only endpoints for video library analytics — overview stats,
 *          top content, outbound click reports, and background job monitoring.
 *
 * Blueprint Reference: docs/ai-workflow/ADMIN-VIDEO-LIBRARY-ARCHITECTURE.mermaid.md
 *
 * Architecture:
 *   [Admin UI] --GET--> [videoAnalyticsController] --read--> [video_catalog]
 *                                                            [user_watch_history]
 *                                                            [video_outbound_clicks]
 *                                                            [video_job_log]
 *
 * API Endpoints:
 *   - GET /api/v2/admin/video-analytics/overview   - Dashboard overview stats
 *   - GET /api/v2/admin/video-analytics/top         - Top content by views or completions
 *   - GET /api/v2/admin/video-analytics/outbound    - Outbound click CTR report
 *   - GET /api/v2/admin/video-jobs                  - List background job log entries
 *
 * Security: All endpoints require admin RBAC.
 */

import logger from '../utils/logger.mjs';
import { getVideoCatalog, getUserWatchHistory, getVideoOutboundClick, getVideoJobLog, Op } from '../models/index.mjs';
import sequelize from '../database.mjs';

// ---------------------------------------------------------------------------
// Exported controller functions
// ---------------------------------------------------------------------------

/**
 * Get video library overview statistics.
 * GET /api/v2/admin/video-analytics/overview
 *
 * Returns: totalVideos, totalPublished, totalDraft, totalArchived,
 *          totalViews (sum of view_count), totalCollections
 */
export async function getOverview(req, res) {
  try {
    const VideoCatalog = getVideoCatalog();
    if (!VideoCatalog) {
      logger.error('[video-analytics] VideoCatalog model not initialized');
      return res.status(500).json({ success: false, error: 'Server error: Models not initialized' });
    }

    // Count by status
    const [totalVideos, totalPublished, totalDraft, totalArchived] = await Promise.all([
      VideoCatalog.count(),
      VideoCatalog.count({ where: { status: 'published' } }),
      VideoCatalog.count({ where: { status: 'draft' } }),
      VideoCatalog.count({ where: { status: 'archived' } }),
    ]);

    // Sum view_count across all non-deleted videos
    const viewSum = await VideoCatalog.sum('viewCount');
    const totalViews = viewSum || 0;

    // Count collections (use raw query since we only need the count)
    let totalCollections = 0;
    try {
      const [result] = await sequelize.query(
        `SELECT COUNT(*) AS count FROM video_collections WHERE "deletedAt" IS NULL`,
        { type: sequelize.QueryTypes ? sequelize.QueryTypes.SELECT : 'SELECT' }
      );
      totalCollections = parseInt(result?.count || 0, 10);
    } catch (collErr) {
      // Table may not exist yet; log and continue with 0
      logger.warn('[video-analytics] Could not count collections:', collErr.message);
    }

    logger.info('[video-analytics] Overview fetched', {
      totalVideos,
      totalPublished,
      totalViews,
      userId: req.user?.id,
    });

    return res.json({
      success: true,
      data: {
        totalVideos,
        totalPublished,
        totalDraft,
        totalArchived,
        totalViews,
        totalCollections,
      },
    });
  } catch (error) {
    logger.error('[video-analytics] getOverview failed:', {
      error: error.message,
      stack: error.stack,
    });
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch video analytics overview',
    });
  }
}

/**
 * Get top content by views or completions.
 * GET /api/v2/admin/video-analytics/top?metric=views&limit=10
 *
 * Query params:
 *   - metric: 'views' (default) | 'completions'
 *   - limit: number (default 10, max 100)
 */
export async function getTopContent(req, res) {
  try {
    const metric = req.query.metric || 'views';
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 100);

    if (!['views', 'completions'].includes(metric)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid metric. Must be "views" or "completions".',
      });
    }

    let data;

    if (metric === 'views') {
      // Top videos by view_count (denormalized counter on video_catalog)
      const VideoCatalog = getVideoCatalog();
      if (!VideoCatalog) {
        logger.error('[video-analytics] VideoCatalog model not initialized');
        return res.status(500).json({ success: false, error: 'Server error: Models not initialized' });
      }

      data = await VideoCatalog.findAll({
        where: { status: 'published' },
        order: [['viewCount', 'DESC']],
        limit,
        attributes: ['id', 'title', 'slug', 'source', 'viewCount', 'thumbnailUrl', 'durationSeconds', 'publishedAt'],
      });
    } else {
      // Top videos by completion count from user_watch_history
      const UserWatchHistory = getUserWatchHistory();
      if (!UserWatchHistory) {
        logger.error('[video-analytics] UserWatchHistory model not initialized');
        return res.status(500).json({ success: false, error: 'Server error: Models not initialized' });
      }

      // Aggregate completions grouped by video_id
      const completions = await UserWatchHistory.findAll({
        where: { completed: true },
        attributes: [
          'video_id',
          [sequelize.fn('COUNT', sequelize.col('id')), 'completionCount'],
        ],
        group: ['video_id'],
        order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
        limit,
        raw: true,
      });

      // Enrich with video metadata
      if (completions.length > 0) {
        const VideoCatalog = getVideoCatalog();
        if (VideoCatalog) {
          const videoIds = completions.map((c) => c.video_id);
          const videos = await VideoCatalog.findAll({
            where: { id: { [Op.in]: videoIds } },
            attributes: ['id', 'title', 'slug', 'source', 'viewCount', 'thumbnailUrl', 'durationSeconds'],
            raw: true,
          });

          const videoMap = {};
          for (const v of videos) {
            videoMap[v.id] = v;
          }

          data = completions.map((c) => ({
            ...videoMap[c.video_id],
            completionCount: parseInt(c.completionCount, 10),
          }));
        } else {
          data = completions;
        }
      } else {
        data = [];
      }
    }

    logger.info(`[video-analytics] Top content fetched: metric=${metric}, limit=${limit}`, {
      userId: req.user?.id,
    });

    return res.json({
      success: true,
      data,
      meta: { metric, limit },
    });
  } catch (error) {
    logger.error('[video-analytics] getTopContent failed:', {
      error: error.message,
      stack: error.stack,
    });
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch top content',
    });
  }
}

/**
 * Get outbound click report (YouTube funnel analytics).
 * GET /api/v2/admin/video-analytics/outbound
 *
 * Returns clicks aggregated by video_id and click_type,
 * enriched with video metadata for CTR analysis.
 */
export async function getOutboundReport(req, res) {
  try {
    const VideoOutboundClick = getVideoOutboundClick();
    if (!VideoOutboundClick) {
      logger.error('[video-analytics] VideoOutboundClick model not initialized');
      return res.status(500).json({ success: false, error: 'Server error: Models not initialized' });
    }

    // Aggregate outbound clicks by video_id and click_type
    const clickData = await VideoOutboundClick.findAll({
      attributes: [
        'video_id',
        'click_type',
        [sequelize.fn('COUNT', sequelize.col('id')), 'clickCount'],
      ],
      group: ['video_id', 'click_type'],
      order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
      raw: true,
    });

    // Enrich with video metadata and view counts for CTR calculation
    let enrichedData = clickData;

    if (clickData.length > 0) {
      const VideoCatalog = getVideoCatalog();
      if (VideoCatalog) {
        const videoIds = [...new Set(clickData.map((c) => c.video_id))];
        const videos = await VideoCatalog.findAll({
          where: { id: { [Op.in]: videoIds } },
          attributes: ['id', 'title', 'slug', 'viewCount', 'youtubeCTAStrategy'],
          raw: true,
        });

        const videoMap = {};
        for (const v of videos) {
          videoMap[v.id] = v;
        }

        enrichedData = clickData.map((c) => {
          const video = videoMap[c.video_id] || {};
          const clickCount = parseInt(c.clickCount, 10);
          const views = video.viewCount || 0;
          return {
            videoId: c.video_id,
            videoTitle: video.title || null,
            videoSlug: video.slug || null,
            ctaStrategy: video.youtubeCTAStrategy || null,
            clickType: c.click_type,
            clickCount,
            viewCount: views,
            ctr: views > 0 ? parseFloat(((clickCount / views) * 100).toFixed(2)) : 0,
          };
        });
      }
    }

    logger.info('[video-analytics] Outbound report fetched', {
      totalEntries: enrichedData.length,
      userId: req.user?.id,
    });

    return res.json({
      success: true,
      data: enrichedData,
    });
  } catch (error) {
    logger.error('[video-analytics] getOutboundReport failed:', {
      error: error.message,
      stack: error.stack,
    });
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch outbound click report',
    });
  }
}

/**
 * List video job log entries with filtering and pagination.
 * GET /api/v2/admin/video-jobs?jobType=youtube_import&status=completed&page=1&limit=20
 *
 * Query params:
 *   - jobType: filter by job_type enum value
 *   - status: filter by status enum value
 *   - page: page number (default 1)
 *   - limit: items per page (default 20, max 100)
 */
export async function listJobs(req, res) {
  try {
    const VideoJobLog = getVideoJobLog();
    if (!VideoJobLog) {
      logger.error('[video-analytics] VideoJobLog model not initialized');
      return res.status(500).json({ success: false, error: 'Server error: Models not initialized' });
    }

    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const offset = (page - 1) * limit;

    // Build WHERE conditions
    const where = {};

    if (req.query.jobType) {
      where.job_type = req.query.jobType;
    }

    if (req.query.status) {
      where.status = req.query.status;
    }

    const { count, rows } = await VideoJobLog.findAndCountAll({
      where,
      order: [['created_at', 'DESC']],
      limit,
      offset,
    });

    logger.info(`[video-analytics] Job log fetched: page=${page}, total=${count}`, {
      userId: req.user?.id,
    });

    return res.json({
      success: true,
      data: rows,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    logger.error('[video-analytics] listJobs failed:', {
      error: error.message,
      stack: error.stack,
    });
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch video job log',
    });
  }
}

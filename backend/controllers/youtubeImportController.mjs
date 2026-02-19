/**
 * YouTube Import Controller
 * =========================
 *
 * Purpose: Admin-only endpoints for importing YouTube videos into the
 *          SwanStudios video library (video_catalog table).
 *
 * Blueprint Reference: docs/ai-workflow/ADMIN-VIDEO-LIBRARY-ARCHITECTURE.mermaid.md
 *
 * Architecture:
 *   [Admin UI] --POST--> [youtubeImportController] --create--> [video_catalog (source='youtube')]
 *                                                  --enqueue-> [BullMQ videoJobQueue]
 *
 * API Endpoints:
 *   - POST /api/v2/admin/youtube/import          - Import a single YouTube video
 *   - POST /api/v2/admin/youtube/import-playlist  - Enqueue playlist import job
 *   - GET  /api/v2/admin/youtube/search           - Search YouTube (placeholder)
 *   - POST /api/v2/admin/youtube/sync/:id         - Re-sync metadata for a video
 *
 * Constraints:
 *   - YouTube videos MUST NOT have visibility='members_only' (DB CHECK constraint)
 *   - Slug uniqueness enforced via partial index (WHERE deletedAt IS NULL)
 *   - All endpoints require admin RBAC
 */

import logger from '../utils/logger.mjs';
import { getVideoCatalog, Op } from '../models/index.mjs';
// Graceful import — videoJobQueue depends on ioredis which may not be available
let addJob;
try {
  const mod = await import('../services/videoJobQueue.mjs');
  addJob = mod.addJob;
} catch {
  addJob = null;
}

// ---------------------------------------------------------------------------
// Slug helper
// ---------------------------------------------------------------------------

/**
 * Convert a title string to a URL-safe slug.
 * @param {string} text - The text to slugify
 * @returns {string} URL-safe slug
 */
function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

/**
 * Generate a unique slug by appending -2, -3, etc. on collision.
 * @param {Object} VideoCatalog - The Sequelize model
 * @param {string} baseSlug - The initial slug candidate
 * @returns {Promise<string>} A unique slug
 */
async function uniqueSlug(VideoCatalog, baseSlug) {
  let candidate = baseSlug;
  let suffix = 2;

  while (true) {
    const existing = await VideoCatalog.findOne({
      where: { slug: candidate },
      paranoid: false, // Check even soft-deleted rows to avoid confusion
    });

    if (!existing) return candidate;

    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;

    // Safety valve to prevent infinite loops
    if (suffix > 100) {
      candidate = `${baseSlug}-${Date.now()}`;
      return candidate;
    }
  }
}

// ---------------------------------------------------------------------------
// Exported controller functions
// ---------------------------------------------------------------------------

/**
 * Import a single YouTube video into the video catalog.
 * POST /api/v2/admin/youtube/import
 *
 * Body: {
 *   youtubeVideoId, title, thumbnailUrl, durationSeconds,
 *   youtubeChannelId, visibility, youtubeCTAStrategy, contentType
 * }
 */
export async function importSingleVideo(req, res) {
  try {
    const VideoCatalog = getVideoCatalog();
    if (!VideoCatalog) {
      logger.error('[youtube-import] VideoCatalog model not initialized');
      return res.status(500).json({ success: false, error: 'Server error: Models not initialized' });
    }

    const {
      youtubeVideoId,
      title,
      thumbnailUrl,
      durationSeconds,
      youtubeChannelId,
      visibility,
      youtubeCTAStrategy,
      contentType,
    } = req.body;

    // ── Validation ──
    if (!youtubeVideoId || !title) {
      return res.status(400).json({
        success: false,
        error: 'youtubeVideoId and title are required',
      });
    }

    // DB constraint: YouTube videos cannot be members_only
    if (visibility === 'members_only') {
      return res.status(400).json({
        success: false,
        error: 'YouTube videos cannot have visibility "members_only" (DB constraint)',
      });
    }

    // Check for duplicate YouTube video ID
    const duplicate = await VideoCatalog.findOne({
      where: { youtubeVideoId },
    });
    if (duplicate) {
      return res.status(409).json({
        success: false,
        error: `YouTube video ${youtubeVideoId} already exists in catalog (id: ${duplicate.id})`,
      });
    }

    // ── Generate unique slug ──
    const baseSlug = slugify(title);
    const slug = await uniqueSlug(VideoCatalog, baseSlug);

    // ── Create video_catalog entry ──
    const video = await VideoCatalog.create({
      title,
      slug,
      source: 'youtube',
      status: 'published',
      metadataCompleted: true,
      youtubeVideoId,
      youtubeChannelId: youtubeChannelId || null,
      thumbnailUrl: thumbnailUrl || null,
      durationSeconds: durationSeconds || null,
      visibility: visibility || 'public',
      youtubeCTAStrategy: youtubeCTAStrategy || 'none',
      contentType: contentType || null,
      publishedAt: new Date(),
      creatorId: req.user.id,
    });

    logger.info(`[youtube-import] Video imported: ${video.id} (yt:${youtubeVideoId})`, {
      videoId: video.id,
      youtubeVideoId,
      slug,
      userId: req.user.id,
    });

    return res.status(201).json({
      success: true,
      data: video,
    });
  } catch (error) {
    logger.error('[youtube-import] importSingleVideo failed:', {
      error: error.message,
      stack: error.stack,
    });
    return res.status(500).json({
      success: false,
      error: 'Failed to import YouTube video',
    });
  }
}

/**
 * Enqueue a playlist import job for background processing.
 * POST /api/v2/admin/youtube/import-playlist
 *
 * Body: { playlistUrl, defaultVisibility, defaultCTA, creatorId }
 */
export async function importPlaylist(req, res) {
  try {
    const { playlistUrl, defaultVisibility, defaultCTA, creatorId } = req.body;

    if (!playlistUrl) {
      return res.status(400).json({
        success: false,
        error: 'playlistUrl is required',
      });
    }

    // Validate visibility if provided
    if (defaultVisibility === 'members_only') {
      return res.status(400).json({
        success: false,
        error: 'YouTube videos cannot have visibility "members_only" (DB constraint)',
      });
    }

    const payload = {
      playlistUrl,
      defaultVisibility: defaultVisibility || 'public',
      defaultCTA: defaultCTA || 'none',
      creatorId: creatorId || req.user.id,
      requestedBy: req.user.id,
    };

    const job = addJob ? await addJob('youtube_import', payload) : null;

    if (!job) {
      logger.warn('[youtube-import] Queue unavailable — playlist import not enqueued');
      return res.status(503).json({
        success: false,
        error: 'Job queue unavailable. Please try again later.',
      });
    }

    logger.info(`[youtube-import] Playlist import enqueued: job=${job.id}`, {
      playlistUrl,
      userId: req.user.id,
    });

    return res.status(202).json({
      success: true,
      jobId: job.id,
      status: 'queued',
    });
  } catch (error) {
    logger.error('[youtube-import] importPlaylist failed:', {
      error: error.message,
      stack: error.stack,
    });
    return res.status(500).json({
      success: false,
      error: 'Failed to enqueue playlist import',
    });
  }
}

/**
 * Search YouTube for videos (placeholder).
 * GET /api/v2/admin/youtube/search
 *
 * Actual YouTube Data API integration comes in a later phase.
 */
export async function searchYouTube(req, res) {
  return res.status(501).json({
    success: false,
    error: 'YouTube search not yet implemented',
  });
}

/**
 * Enqueue a metadata sync job for an existing video.
 * POST /api/v2/admin/youtube/sync/:id
 */
export async function syncMetadata(req, res) {
  try {
    const { id } = req.params;

    // Verify the video exists
    const VideoCatalog = getVideoCatalog();
    if (!VideoCatalog) {
      logger.error('[youtube-import] VideoCatalog model not initialized');
      return res.status(500).json({ success: false, error: 'Server error: Models not initialized' });
    }

    const video = await VideoCatalog.findByPk(id);
    if (!video) {
      return res.status(404).json({
        success: false,
        error: 'Video not found',
      });
    }

    if (video.source !== 'youtube') {
      return res.status(400).json({
        success: false,
        error: 'Metadata sync is only available for YouTube videos',
      });
    }

    const job = addJob ? await addJob('youtube_sync', { videoId: id }) : null;

    if (!job) {
      logger.warn('[youtube-import] Queue unavailable — sync job not enqueued');
      return res.status(503).json({
        success: false,
        error: 'Job queue unavailable. Please try again later.',
      });
    }

    logger.info(`[youtube-import] Metadata sync enqueued: job=${job.id} video=${id}`, {
      videoId: id,
      userId: req.user.id,
    });

    return res.status(202).json({
      success: true,
      jobId: job.id,
      status: 'queued',
    });
  } catch (error) {
    logger.error('[youtube-import] syncMetadata failed:', {
      error: error.message,
      stack: error.stack,
    });
    return res.status(500).json({
      success: false,
      error: 'Failed to enqueue metadata sync',
    });
  }
}

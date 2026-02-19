/**
 * Video Catalog Public Controller
 * ================================
 * Handles public (optionalAuth) video browsing and watching endpoints.
 *
 * Security model:
 *   - All browse endpoints only show status='published' videos.
 *   - Watch endpoint uses probing-resistant response contract:
 *     unpublished videos return 404 (indistinguishable from non-existent)
 *     for non-admin users, preventing enumeration attacks.
 *   - Signed URLs are never returned in browse/list responses (thumbnail only).
 *   - Playback signed URLs are gated by entitlement checks.
 *
 * Routes:
 *   GET   /api/v2/videos                    → browseVideos
 *   GET   /api/v2/videos/watch/:slug        → watchVideo
 *   POST  /api/v2/videos/:id/refresh-url    → refreshUrl
 *   GET   /api/v2/videos/collections        → browseCollections
 *   GET   /api/v2/videos/collections/:slug  → getCollection
 */

import logger from '../utils/logger.mjs';
import { getVideoCatalog, getVideoCollection, getVideoCollectionItem, Op } from '../models/index.mjs';
import { canAccessVideo } from '../services/videoEntitlementService.mjs';
import { generatePlaybackUrl, generateThumbnailUrl } from '../services/r2StorageService.mjs';

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Resolve a thumbnail URL for a video.
 *   - Hosted (thumbnailKey): generate a signed R2 URL (1h TTL).
 *   - YouTube (thumbnailUrl): return the public CDN URL directly.
 *   - Neither: null.
 *
 * @param {Object} video - VideoCatalog instance (or plain object)
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
  // YouTube thumbnails are public CDN URLs — return as-is
  if (video.thumbnailUrl) {
    return video.thumbnailUrl;
  }
  return null;
}

// ── browseVideos ─────────────────────────────────────────────────────────────

/**
 * GET /api/v2/videos
 *
 * Browse published videos with optional filtering and pagination.
 * Returns thumbnail URLs only — no signed playback URLs in list responses.
 *
 * Query params:
 *   - contentType: filter by content_type ENUM value
 *   - tags: comma-separated tag list (JSONB @> containment)
 *   - page: page number (default 1)
 *   - limit: items per page (default 12, max 50)
 */
export async function browseVideos(req, res) {
  try {
    const VideoCatalog = getVideoCatalog();

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 12));
    const offset = (page - 1) * limit;

    // Build WHERE clause — always status='published'
    const where = { status: 'published' };

    // Optional: filter by contentType
    if (req.query.contentType) {
      where.contentType = req.query.contentType;
    }

    // Optional: filter by tags (JSONB containment — video.tags @> ['tag1','tag2'])
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

    // Resolve thumbnail URLs and add locked badge info
    const videos = await Promise.all(
      rows.map(async (row) => {
        const video = row.toJSON();
        video.thumbnail = await resolveThumbnailUrl(video);
        // Remove raw key/url fields — client only needs the resolved thumbnail
        delete video.thumbnailKey;
        delete video.thumbnailUrl;
        // Locked badge: members_only content shows lock icon to anonymous/non-member users
        video.locked = video.visibility === 'members_only';
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
    logger.error('browseVideos failed', { error: err.message, stack: err.stack });
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

// ── watchVideo ───────────────────────────────────────────────────────────────

/**
 * GET /api/v2/videos/watch/:slug
 *
 * Retrieve a single video for playback. Uses probing-resistant response
 * contract to prevent enumeration of draft/archived content.
 *
 * Response contract:
 *   - Not found            → 404 { error: 'not_found' }
 *   - Unpublished + !admin → 404 { error: 'not_found' } (indistinguishable)
 *   - Unpublished + admin  → 200 with video data (preview mode)
 *   - Access denied (anon) → 401 { error: 'login_required' }
 *   - Access denied (role) → 403 { error: 'access_denied' }
 *   - YouTube + granted    → 200 { video, youtubeVideoId }
 *   - Hosted + granted     → 200 { video, signedUrl, captionsUrl }
 */
export async function watchVideo(req, res) {
  try {
    const VideoCatalog = getVideoCatalog();
    const { slug } = req.params;

    // Find by slug — paranoid:false so we check deletedAt ourselves
    const video = await VideoCatalog.findOne({
      where: {
        slug,
        deletedAt: null,
      },
      paranoid: false,
    });

    // Not found — uniform 404
    if (!video) {
      return res.status(404).json({ success: false, error: 'not_found' });
    }

    // Unpublished + non-admin → identical 404 (probing-resistant)
    if (video.status !== 'published' && req.user?.role !== 'admin') {
      return res.status(404).json({ success: false, error: 'not_found' });
    }

    // Entitlement check
    const entitlement = await canAccessVideo(req.user || null, video);

    if (!entitlement.allowed) {
      // Map reason to appropriate HTTP status
      if (entitlement.reason === 'not_found') {
        return res.status(404).json({ success: false, error: 'not_found' });
      }
      if (entitlement.reason === 'login_required') {
        return res.status(401).json({ success: false, error: 'login_required' });
      }
      // not_member, premium_required, or any other denial
      return res.status(403).json({ success: false, error: 'access_denied' });
    }

    // Build response payload
    const videoData = video.toJSON();
    const thumbnail = await resolveThumbnailUrl(videoData);

    // Strip internal fields from response
    delete videoData.thumbnailKey;
    delete videoData.thumbnailUrl;
    delete videoData.hostedKey;
    delete videoData.pendingObjectKey;
    delete videoData.declaredFileSize;
    delete videoData.declaredMimeType;
    delete videoData.declaredChecksum;
    delete videoData.uploadMode;
    delete videoData.fileChecksumSha256;
    delete videoData.legacyImport;
    delete videoData.metadataCompleted;

    videoData.thumbnail = thumbnail;

    // Prevent caching of authenticated video data
    res.set('Cache-Control', 'private, no-store');

    // Source-specific response
    if (video.source === 'youtube') {
      return res.status(200).json({
        success: true,
        data: {
          video: videoData,
          youtubeVideoId: video.youtubeVideoId,
        },
      });
    }

    // Hosted video — include signed playback URLs from entitlement service
    return res.status(200).json({
      success: true,
      data: {
        video: videoData,
        signedUrl: entitlement.signedUrl || null,
        captionsUrl: entitlement.captionsUrl || null,
      },
    });
  } catch (err) {
    logger.error('watchVideo failed', {
      slug: req.params.slug,
      error: err.message,
      stack: err.stack,
    });
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

// ── refreshUrl ───────────────────────────────────────────────────────────────

/**
 * POST /api/v2/videos/:id/refresh-url
 *
 * Re-check entitlement and return a fresh signed URL for an R2-hosted video.
 * YouTube-sourced videos have no signed URL, so they receive a uniform 403.
 *
 * All non-success responses return identical 403 { error: 'access_denied' }
 * to prevent information leakage.
 *
 * Response:
 *   - Success → { signedUrl, expiresAt }
 *   - Any failure → 403 { error: 'access_denied' }
 */
export async function refreshUrl(req, res) {
  try {
    const VideoCatalog = getVideoCatalog();
    const { id } = req.params;

    const video = await VideoCatalog.findByPk(id);

    // Uniform error for all non-success cases
    if (!video) {
      return res.status(403).json({ success: false, error: 'access_denied' });
    }

    // YouTube source — no signed URL to refresh
    if (video.source === 'youtube') {
      return res.status(403).json({ success: false, error: 'access_denied' });
    }

    // Re-check entitlement
    const entitlement = await canAccessVideo(req.user || null, video);

    if (!entitlement.allowed) {
      return res.status(403).json({ success: false, error: 'access_denied' });
    }

    if (!entitlement.signedUrl) {
      return res.status(403).json({ success: false, error: 'access_denied' });
    }

    // Calculate approximate expiry (4 hours from now, matching R2 service default)
    const VIDEO_SIGNED_URL_TTL_HOURS = parseInt(process.env.VIDEO_SIGNED_URL_TTL_HOURS, 10) || 4;
    const expiresAt = new Date(Date.now() + VIDEO_SIGNED_URL_TTL_HOURS * 60 * 60 * 1000).toISOString();

    res.set('Cache-Control', 'private, no-store');

    return res.status(200).json({
      success: true,
      data: {
        signedUrl: entitlement.signedUrl,
        expiresAt,
      },
    });
  } catch (err) {
    logger.error('refreshUrl failed', {
      videoId: req.params.id,
      error: err.message,
      stack: err.stack,
    });
    // Uniform 403 even on internal errors to prevent probing
    return res.status(403).json({ success: false, error: 'access_denied' });
  }
}

// ── browseCollections ────────────────────────────────────────────────────────

/**
 * GET /api/v2/videos/collections
 *
 * List published video collections with video count per collection.
 *
 * Query params:
 *   - page: page number (default 1)
 *   - limit: items per page (default 20, max 50)
 */
export async function browseCollections(req, res) {
  try {
    const VideoCollection = getVideoCollection();
    const VideoCollectionItem = getVideoCollectionItem();
    const VideoCatalog = getVideoCatalog();

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;

    const { count, rows } = await VideoCollection.findAndCountAll({
      where: {
        visibility: 'public',
      },
      attributes: [
        'id', 'title', 'slug', 'description', 'type',
        'visibility', 'accessTier', 'thumbnailKey', 'sortOrder',
      ],
      include: [
        {
          model: VideoCollectionItem,
          as: 'collectionItems',
          attributes: ['id'],
          required: false,
          include: [
            {
              model: VideoCatalog,
              as: 'video',
              attributes: [],
              where: { status: 'published' },
              required: true,
            },
          ],
        },
      ],
      order: [
        ['sortOrder', 'ASC'],
        ['title', 'ASC'],
      ],
      limit,
      offset,
      distinct: true, // Ensure correct count with includes
    });

    const collections = await Promise.all(
      rows.map(async (row) => {
        const collection = row.toJSON();
        // Resolve thumbnail
        if (collection.thumbnailKey) {
          try {
            collection.thumbnail = await generateThumbnailUrl(collection.thumbnailKey);
          } catch {
            collection.thumbnail = null;
          }
        } else {
          collection.thumbnail = null;
        }
        delete collection.thumbnailKey;

        // Count published videos in collection
        collection.videoCount = collection.collectionItems
          ? collection.collectionItems.length
          : 0;
        delete collection.collectionItems;

        return collection;
      })
    );

    const totalPages = Math.ceil(count / limit);

    return res.status(200).json({
      success: true,
      data: {
        collections,
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
    logger.error('browseCollections failed', { error: err.message, stack: err.stack });
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

// ── getCollection ────────────────────────────────────────────────────────────

/**
 * GET /api/v2/videos/collections/:slug
 *
 * Get a single collection with its published videos, ordered by sort_order.
 */
export async function getCollection(req, res) {
  try {
    const VideoCollection = getVideoCollection();
    const VideoCollectionItem = getVideoCollectionItem();
    const VideoCatalog = getVideoCatalog();
    const { slug } = req.params;

    const collection = await VideoCollection.findOne({
      where: {
        slug,
        visibility: ['public', 'unlisted'], // Allow public + unlisted (direct link)
      },
      attributes: [
        'id', 'title', 'slug', 'description', 'type',
        'visibility', 'accessTier', 'thumbnailKey', 'sortOrder',
      ],
      include: [
        {
          model: VideoCollectionItem,
          as: 'collectionItems',
          attributes: ['id', 'sortOrder', 'addedAt'],
          include: [
            {
              model: VideoCatalog,
              as: 'video',
              where: { status: 'published' },
              required: true,
              attributes: [
                'id', 'title', 'slug', 'description', 'contentType', 'source',
                'visibility', 'accessTier', 'durationSeconds', 'thumbnailKey',
                'thumbnailUrl', 'tags', 'viewCount', 'featured', 'youtubeVideoId',
              ],
            },
          ],
          order: [['sortOrder', 'ASC']],
        },
      ],
    });

    if (!collection) {
      return res.status(404).json({ success: false, error: 'Collection not found' });
    }

    const collectionData = collection.toJSON();

    // Resolve collection thumbnail
    if (collectionData.thumbnailKey) {
      try {
        collectionData.thumbnail = await generateThumbnailUrl(collectionData.thumbnailKey);
      } catch {
        collectionData.thumbnail = null;
      }
    } else {
      collectionData.thumbnail = null;
    }
    delete collectionData.thumbnailKey;

    // Resolve video thumbnails and sort by item sortOrder
    if (collectionData.collectionItems) {
      collectionData.collectionItems.sort((a, b) => a.sortOrder - b.sortOrder);

      collectionData.videos = await Promise.all(
        collectionData.collectionItems.map(async (item) => {
          const video = item.video;
          if (!video) return null;

          video.thumbnail = await resolveThumbnailUrl(video);
          delete video.thumbnailKey;
          delete video.thumbnailUrl;
          video.locked = video.visibility === 'members_only';
          video.collectionSortOrder = item.sortOrder;
          return video;
        })
      );

      // Filter out any null entries (shouldn't happen with required:true, but defensive)
      collectionData.videos = collectionData.videos.filter(Boolean);
    } else {
      collectionData.videos = [];
    }
    delete collectionData.collectionItems;

    collectionData.videoCount = collectionData.videos.length;

    return res.status(200).json({
      success: true,
      data: { collection: collectionData },
    });
  } catch (err) {
    logger.error('getCollection failed', {
      slug: req.params.slug,
      error: err.message,
      stack: err.stack,
    });
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

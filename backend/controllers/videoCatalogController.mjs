/**
 * Video Catalog Controller (Admin CRUD)
 * =======================================
 * Handles the full lifecycle for SwanStudios video catalog entries:
 *   - CRUD (create / list / get / update / delete)
 *   - Publish / Unpublish toggle
 *   - Presigned upload URL generation (Mode A: checksum, Mode B: fallback)
 *   - Upload completion verification (R2 HEAD + atomic DB update)
 *   - Thumbnail presigned URL generation
 *
 * Security:
 *   - All endpoints are admin-only (enforced at router level)
 *   - TRUST_FIELDS are stripped from client-supplied bodies to prevent
 *     spoofing of upload-binding columns
 *   - Upload-complete uses SELECT FOR UPDATE + key binding to prevent
 *     replay / TOCTOU attacks
 *
 * Architecture:
 *   ┌──────────┐   ┌──────────────────────┐   ┌──────────┐   ┌────────┐
 *   │  Admin   │──▶│ videoCatalogController│──▶│ Sequelize│──▶│ Pg/R2  │
 *   │  Client  │   │  (this file)         │   │ (ORM)    │   │        │
 *   └──────────┘   └──────────────────────┘   └──────────┘   └────────┘
 */

import logger from '../utils/logger.mjs';
import { getVideoCatalog, getVideoJobLog, Op } from '../models/index.mjs';
import {
  generateUploadUrl,
  generatePlaybackUrl,
  generateThumbnailUrl,
  generateObjectKey,
  generateThumbnailKey,
  headObject,
  deleteObject,
} from '../services/r2StorageService.mjs';
import sequelize from '../database.mjs';

// videoJobQueue may not exist yet — import with graceful fallback.
// The stub logs a warning per-call so queue unavailability is visible in logs.
let addJob;
let jobQueueAvailable = false;
try {
  const mod = await import('../services/videoJobQueue.mjs');
  addJob = mod.addJob;
  jobQueueAvailable = true;
} catch (importErr) {
  logger.warn('[VideoCatalogController] videoJobQueue import failed: %s — background jobs will be unavailable', importErr.message);
  addJob = async (type, payload) => {
    logger.warn('[VideoCatalogController] videoJobQueue not available — skipping job: %s %j', type, payload);
    return null;
  };
}

/**
 * GET /api/v2/admin/video-jobs/health
 * Returns job queue availability status so admins can detect queue outages.
 */
export function jobQueueHealth(_req, res) {
  return res.json({
    success: true,
    data: { available: jobQueueAvailable, timestamp: new Date().toISOString() },
  });
}

// ── Trust Fields ─────────────────────────────────────────────────────────────
// These columns are set exclusively by server-side upload flow logic.
// Both snake_case (DB column) and camelCase (Sequelize attribute) variants
// are listed so that req.body stripping works regardless of client casing.
const TRUST_FIELDS = [
  'upload_mode', 'declared_checksum', 'declared_mime_type', 'declared_file_size',
  'pending_object_key', 'legacy_import', 'hosted_key', 'file_checksum_sha256',
  'uploadMode', 'declaredChecksum', 'declaredMimeType', 'declaredFileSize',
  'pendingObjectKey', 'legacyImport', 'hostedKey', 'fileChecksumSha256',
];

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Deterministic URL-safe slug from arbitrary text.
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
 * Strip trust fields from an object (returns a shallow copy).
 */
function stripTrust(body) {
  const cleaned = { ...body };
  for (const key of TRUST_FIELDS) {
    delete cleaned[key];
  }
  return cleaned;
}

/**
 * Strip file extension from a filename.
 */
function stripExtension(filename) {
  const lastDot = filename.lastIndexOf('.');
  return lastDot > 0 ? filename.substring(0, lastDot) : filename;
}

/**
 * Create a VideoCatalog row with slug collision retry.
 * Attempts the base slug, then -2, -3, -4, and finally a timestamp fallback.
 */
async function createWithSlugRetry(VideoCatalog, data) {
  const baseSlug = data.slug;

  // Attempt 1: base slug
  try {
    return await VideoCatalog.create(data);
  } catch (err) {
    if (!isUniqueViolation(err)) throw err;
  }

  // Attempts 2–4: -2, -3, -4 suffix
  for (let suffix = 2; suffix <= 4; suffix++) {
    try {
      return await VideoCatalog.create({ ...data, slug: `${baseSlug}-${suffix}` });
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
    }
  }

  // Final fallback: timestamp
  const tsSlug = `${baseSlug}-${Date.now()}`;
  return await VideoCatalog.create({ ...data, slug: tsSlug });
}

function isUniqueViolation(err) {
  // Sequelize wraps PG unique violation (23505) as UniqueConstraintError.
  // Also check the native PG error code for resilience across Sequelize versions.
  return err.name === 'SequelizeUniqueConstraintError'
    || err.original?.code === '23505';
}

// ── Allowed MIME types ───────────────────────────────────────────────────────

const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const ALLOWED_THUMBNAIL_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 2_147_483_648; // 2 GB

// ── Controller Functions ─────────────────────────────────────────────────────

/**
 * POST /api/v2/admin/videos
 * Create a video catalog entry (YouTube imports, manual entries).
 * NOT for upload-sourced videos — those use requestUploadUrl.
 */
export async function createVideo(req, res) {
  try {
    const VideoCatalog = getVideoCatalog();
    const body = stripTrust(req.body);

    // YouTube imports have metadata ready immediately
    if (body.source === 'youtube') {
      body.metadataCompleted = true;
    }

    // Ensure creatorId is set from authenticated user
    body.creatorId = req.user.id;

    // Generate slug from title if not provided
    if (!body.slug && body.title) {
      body.slug = slugify(stripExtension(body.title));
    }

    const video = await createWithSlugRetry(VideoCatalog, body);

    logger.info('[VideoCatalogController] Created video %s (source: %s, slug: %s)', video.id, video.source, video.slug);

    return res.status(201).json({ success: true, data: video });
  } catch (err) {
    logger.error('[VideoCatalogController] createVideo error: %s', err.message, { stack: err.stack });
    return res.status(500).json({ success: false, error: 'Failed to create video' });
  }
}

/**
 * GET /api/v2/admin/videos
 * List all videos for admin (draft, published, archived).
 * Supports filtering by status, source, visibility, contentType.
 * Paginated with total count.
 */
export async function listVideos(req, res) {
  try {
    const VideoCatalog = getVideoCatalog();

    const {
      status,
      source,
      visibility,
      contentType,
      search,
      page = 1,
      limit = 20,
    } = req.query;

    const where = {};
    if (status) where.status = status;
    if (source) where.source = source;
    if (visibility) where.visibility = visibility;
    if (contentType) where.contentType = contentType;
    if (search) where.title = { [Op.iLike]: `%${search}%` };

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * pageSize;

    const { count, rows } = await VideoCatalog.findAndCountAll({
      where,
      order: [['created_at', 'DESC']],
      limit: pageSize,
      offset,
    });

    logger.info('[VideoCatalogController] listVideos — page %d, limit %d, total %d', pageNum, pageSize, count);

    return res.status(200).json({
      success: true,
      data: rows,
      pagination: {
        page: pageNum,
        limit: pageSize,
        total: count,
        totalPages: Math.ceil(count / pageSize),
      },
    });
  } catch (err) {
    logger.error('[VideoCatalogController] listVideos error: %s', err.message, { stack: err.stack });
    return res.status(500).json({ success: false, error: 'Failed to list videos' });
  }
}

/**
 * GET /api/v2/admin/videos/:id
 * Get a single video by primary key.
 * Includes signed thumbnail and playback URLs where applicable.
 */
export async function getVideo(req, res) {
  try {
    const VideoCatalog = getVideoCatalog();
    const video = await VideoCatalog.findByPk(req.params.id);

    if (!video) {
      return res.status(404).json({ success: false, error: 'Video not found' });
    }

    // Build enriched response with signed URLs
    const data = video.toJSON();

    if (video.thumbnailKey) {
      try {
        data.signedThumbnailUrl = await generateThumbnailUrl(video.thumbnailKey);
      } catch (urlErr) {
        logger.warn('[VideoCatalogController] Failed to sign thumbnail URL for %s: %s', video.id, urlErr.message);
        data.signedThumbnailUrl = null;
      }
    }

    if (video.hostedKey) {
      try {
        data.signedPlaybackUrl = await generatePlaybackUrl({
          objectKey: video.hostedKey,
          mimeType: video.mimeType || 'video/mp4',
        });
      } catch (urlErr) {
        logger.warn('[VideoCatalogController] Failed to sign playback URL for %s: %s', video.id, urlErr.message);
        data.signedPlaybackUrl = null;
      }
    }

    logger.info('[VideoCatalogController] getVideo %s', video.id);

    return res.status(200).json({ success: true, data });
  } catch (err) {
    logger.error('[VideoCatalogController] getVideo error: %s', err.message, { stack: err.stack });
    return res.status(500).json({ success: false, error: 'Failed to get video' });
  }
}

/**
 * PUT /api/v2/admin/videos/:id
 * Update video metadata. Trust fields are stripped from the body.
 */
export async function updateVideo(req, res) {
  try {
    const VideoCatalog = getVideoCatalog();
    const body = stripTrust(req.body);

    const video = await VideoCatalog.findByPk(req.params.id);
    if (!video) {
      return res.status(404).json({ success: false, error: 'Video not found' });
    }

    await video.update(body);

    logger.info('[VideoCatalogController] Updated video %s', video.id);

    return res.status(200).json({ success: true, data: video });
  } catch (err) {
    logger.error('[VideoCatalogController] updateVideo error: %s', err.message, { stack: err.stack });
    return res.status(500).json({ success: false, error: 'Failed to update video' });
  }
}

/**
 * DELETE /api/v2/admin/videos/:id
 * Soft delete (Sequelize paranoid mode — sets deletedAt).
 */
export async function deleteVideo(req, res) {
  try {
    const VideoCatalog = getVideoCatalog();
    const video = await VideoCatalog.findByPk(req.params.id);

    if (!video) {
      return res.status(404).json({ success: false, error: 'Video not found' });
    }

    await video.destroy();

    logger.info('[VideoCatalogController] Soft-deleted video %s', video.id);

    return res.status(200).json({ success: true, data: { id: video.id, deleted: true } });
  } catch (err) {
    logger.error('[VideoCatalogController] deleteVideo error: %s', err.message, { stack: err.stack });
    return res.status(500).json({ success: false, error: 'Failed to delete video' });
  }
}

/**
 * PATCH /api/v2/admin/videos/:id/publish
 * Toggle publish/unpublish.
 *   - publish: true  -> verify metadata + optional checksum, set status=published
 *   - publish: false -> set status=draft, clear publishedAt
 */
export async function publishVideo(req, res) {
  try {
    const VideoCatalog = getVideoCatalog();
    const { publish } = req.body;
    const video = await VideoCatalog.findByPk(req.params.id);

    if (!video) {
      return res.status(404).json({ success: false, error: 'Video not found' });
    }

    if (publish) {
      // Gate: metadata must be complete
      if (!video.metadataCompleted) {
        return res.status(400).json({
          success: false,
          error: 'Cannot publish — metadata is not completed. Save metadata first.',
        });
      }

      // Gate: upload-sourced videos must have verified checksum
      if (video.source === 'upload' && !video.fileChecksumSha256) {
        return res.status(400).json({
          success: false,
          error: 'Cannot publish — upload has not been verified (missing checksum).',
        });
      }

      await video.update({
        status: 'published',
        publishedAt: new Date(),
      });

      logger.info('[VideoCatalogController] Published video %s', video.id);
    } else {
      await video.update({
        status: 'draft',
        publishedAt: null,
      });

      logger.info('[VideoCatalogController] Unpublished video %s (reverted to draft)', video.id);
    }

    return res.status(200).json({ success: true, data: video });
  } catch (err) {
    logger.error('[VideoCatalogController] publishVideo error: %s', err.message, { stack: err.stack });
    return res.status(500).json({ success: false, error: 'Failed to toggle publish state' });
  }
}

/**
 * POST /api/v2/admin/videos/upload-url
 * Generate a presigned PUT URL for direct-to-R2 upload.
 *
 * Creates a draft video_catalog row, generates the presigned URL, and returns
 * both the video ID and the upload URL to the client.
 *
 * Mode A: Client provides sha256hex (checksum enforced at R2 level).
 * Mode B: Client omits sha256hex (async checksum verification post-upload).
 */
export async function requestUploadUrl(req, res) {
  try {
    const VideoCatalog = getVideoCatalog();
    const { filename, contentType, fileSize, sha256hex } = req.body;

    // ── Validation ─────────────────────────────────────────────────────────
    if (!filename || !contentType || !fileSize) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: filename, contentType, fileSize',
      });
    }

    if (!ALLOWED_VIDEO_TYPES.includes(contentType)) {
      return res.status(400).json({
        success: false,
        error: `Invalid contentType. Allowed: ${ALLOWED_VIDEO_TYPES.join(', ')}`,
      });
    }

    const size = parseInt(fileSize, 10);
    if (isNaN(size) || size <= 0 || size > MAX_FILE_SIZE) {
      return res.status(400).json({
        success: false,
        error: `fileSize must be between 1 and ${MAX_FILE_SIZE} bytes (2 GB)`,
      });
    }

    // ── Key Generation ─────────────────────────────────────────────────────
    const objectKey = generateObjectKey({ creatorId: req.user.id, filename });
    const mode = sha256hex ? 'A' : 'B';

    // ── Create Draft Row ───────────────────────────────────────────────────
    const baseTitle = stripExtension(filename);
    const baseSlug = slugify(baseTitle);

    const draftData = {
      source: 'upload',
      status: 'draft',
      creatorId: req.user.id,
      pendingObjectKey: objectKey,
      declaredFileSize: size,
      declaredMimeType: contentType,
      uploadMode: mode,
      declaredChecksum: sha256hex || null,
      title: baseTitle,
      slug: baseSlug,
      metadataCompleted: false,
    };

    let video;
    try {
      video = await createWithSlugRetry(VideoCatalog, draftData);
    } catch (err) {
      logger.error('[VideoCatalogController] Failed to create draft row for upload: %s', err.message);
      return res.status(500).json({ success: false, error: 'Failed to create upload draft' });
    }

    // ── Generate Presigned URL ─────────────────────────────────────────────
    let uploadUrl;
    try {
      const result = await generateUploadUrl({
        objectKey,
        contentType,
        sha256hex: sha256hex || null,
        fileSize: size,
      });
      uploadUrl = result.uploadUrl;
    } catch (presignErr) {
      // Presign failed — clean up the draft row immediately
      logger.error('[VideoCatalogController] Presign failed, deleting draft %s: %s', video.id, presignErr.message);
      try {
        await video.destroy({ force: true });
      } catch (cleanupErr) {
        logger.warn('[VideoCatalogController] Draft cleanup also failed for %s: %s', video.id, cleanupErr.message);
      }
      return res.status(500).json({ success: false, error: 'Failed to generate upload URL' });
    }

    // Upload URL TTL is 5 minutes
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    logger.info(
      '[VideoCatalogController] Upload URL generated — video: %s, mode: %s, key: %s, size: %d',
      video.id, mode, objectKey, size,
    );

    return res.status(200).json({
      success: true,
      data: {
        videoId: video.id,
        uploadUrl,
        objectKey,
        expiresAt,
        mode,
      },
    });
  } catch (err) {
    logger.error('[VideoCatalogController] requestUploadUrl error: %s', err.message, { stack: err.stack });
    return res.status(500).json({ success: false, error: 'Failed to generate upload URL' });
  }
}

/**
 * POST /api/v2/admin/videos/upload-complete
 * Verify an upload landed in R2 and atomically bind the hosted key.
 *
 * Three-phase process:
 *   Phase A: Row validation (SELECT FOR UPDATE)
 *   Phase B: R2 object verification (HEAD + size/type/checksum checks)
 *   Phase C: Atomic DB update (set hostedKey, clear pendingObjectKey)
 *
 * Post-commit: enqueue checksum_verify job for Mode B uploads.
 */
export async function completeUpload(req, res) {
  const { videoId, objectKey } = req.body;

  if (!videoId || !objectKey) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: videoId, objectKey',
    });
  }

  let shouldDeleteR2 = false;
  let deleteReason = '';
  let enqueueChecksumJob = false;
  let finalVideo = null;

  try {
    await sequelize.transaction(async (t) => {
      const VideoCatalog = getVideoCatalog();

      // ── Phase A: Row Validation (SELECT FOR UPDATE) ─────────────────────
      const video = await VideoCatalog.findOne({
        where: {
          id: videoId,
          creatorId: req.user.id,
        },
        lock: t.LOCK.UPDATE,
        transaction: t,
      });

      if (!video) {
        // 403: wrong user or video does not exist — do NOT delete R2 object
        const err = new Error('UPLOAD_AUTH_FAILURE');
        err.statusCode = 403;
        err.clientMessage = 'Video not found or access denied';
        throw err;
      }

      // One-time completion: hostedKey must be NULL
      if (video.hostedKey) {
        const err = new Error('UPLOAD_ALREADY_COMPLETED');
        err.statusCode = 409;
        err.clientMessage = 'Upload already completed for this video';
        throw err;
      }

      // Key binding: pendingObjectKey must match
      if (video.pendingObjectKey !== objectKey) {
        const err = new Error('UPLOAD_KEY_MISMATCH');
        err.statusCode = 400;
        err.clientMessage = 'Object key does not match pending upload';
        throw err;
      }

      // Read persisted trust values
      const {
        uploadMode,
        declaredChecksum,
        declaredFileSize,
        declaredMimeType,
      } = video;

      // ── Phase B: R2 Object Verification (HEAD) ─────────────────────────
      let headResult;
      try {
        headResult = await headObject(objectKey);
      } catch (headErr) {
        logger.error('[VideoCatalogController] HEAD failed for %s: %s', objectKey, headErr.message);
        const err = new Error('UPLOAD_OBJECT_NOT_FOUND');
        err.statusCode = 400;
        err.clientMessage = 'Upload object not found in storage. Please re-upload.';
        throw err;
      }

      // Size verification
      if (declaredFileSize && headResult.contentLength !== parseInt(declaredFileSize, 10)) {
        shouldDeleteR2 = true;
        deleteReason = 'UPLOAD_SIZE_MISMATCH';
        const err = new Error('UPLOAD_SIZE_MISMATCH');
        err.statusCode = 400;
        err.clientMessage = `File size mismatch: declared ${declaredFileSize}, actual ${headResult.contentLength}`;
        throw err;
      }

      // Content-Type verification
      if (declaredMimeType && headResult.contentType !== declaredMimeType) {
        shouldDeleteR2 = true;
        deleteReason = 'UPLOAD_INVALID_CONTENT_TYPE';
        const err = new Error('UPLOAD_INVALID_CONTENT_TYPE');
        err.statusCode = 400;
        err.clientMessage = `Content-Type mismatch: declared ${declaredMimeType}, actual ${headResult.contentType}`;
        throw err;
      }

      // Mode A checksum verification (if R2 returned the header)
      let verifiedChecksum = null;
      if (uploadMode === 'A' && declaredChecksum) {
        if (headResult.checksumSHA256) {
          // R2 returns ChecksumSHA256 as base64 — convert to hex for comparison
          const actualHex = Buffer.from(headResult.checksumSHA256, 'base64').toString('hex');
          if (actualHex !== declaredChecksum.toLowerCase()) {
            shouldDeleteR2 = true;
            deleteReason = 'UPLOAD_CHECKSUM_MISMATCH';
            const err = new Error('UPLOAD_CHECKSUM_MISMATCH');
            err.statusCode = 400;
            err.clientMessage = 'Checksum mismatch — file may be corrupt. Please re-upload.';
            throw err;
          }
          verifiedChecksum = declaredChecksum.toLowerCase();
        } else {
          // R2 did not return checksum header — trust declared value for now
          verifiedChecksum = declaredChecksum.toLowerCase();
        }
      } else if (uploadMode === 'B') {
        // Mode B: no checksum at upload time, enqueue async verification
        enqueueChecksumJob = true;
      }

      // ── Phase C: Atomic DB Update ──────────────────────────────────────
      await video.update(
        {
          hostedKey: objectKey,
          pendingObjectKey: null,
          fileSizeBytes: headResult.contentLength,
          mimeType: headResult.contentType,
          fileChecksumSha256: verifiedChecksum,
        },
        { transaction: t },
      );

      finalVideo = video;
    });

    // ── Post-commit: Enqueue async jobs ──────────────────────────────────
    if (enqueueChecksumJob && finalVideo) {
      try {
        await addJob('checksum_verify', {
          videoId: finalVideo.id,
          objectKey,
        });
        logger.info('[VideoCatalogController] Enqueued checksum_verify job for video %s', finalVideo.id);
      } catch (jobErr) {
        logger.warn('[VideoCatalogController] Failed to enqueue checksum_verify for %s: %s', finalVideo.id, jobErr.message);
      }
    }

    logger.info('[VideoCatalogController] Upload completed — video: %s, key: %s', finalVideo.id, objectKey);

    return res.status(200).json({ success: true, data: finalVideo });
  } catch (err) {
    // Delete R2 object for verification failures (NOT for auth/state failures)
    if (shouldDeleteR2) {
      logger.warn('[VideoCatalogController] Deleting R2 object %s due to %s', objectKey, deleteReason);
      deleteObject(objectKey).catch((delErr) => {
        logger.warn('[VideoCatalogController] R2 cleanup failed for %s: %s', objectKey, delErr.message);
      });
    }

    const statusCode = err.statusCode || 500;
    const clientMessage = err.clientMessage || 'Failed to complete upload';

    if (statusCode >= 500) {
      logger.error('[VideoCatalogController] completeUpload error: %s', err.message, { stack: err.stack });
    } else {
      logger.warn('[VideoCatalogController] completeUpload rejected (%d): %s', statusCode, err.message);
    }

    return res.status(statusCode).json({ success: false, error: clientMessage });
  }
}

/**
 * POST /api/v2/admin/videos/thumbnail-url
 * Generate a presigned PUT URL for thumbnail upload.
 */
export async function requestThumbnailUrl(req, res) {
  try {
    const VideoCatalog = getVideoCatalog();
    const { videoId, filename, contentType } = req.body;

    // ── Validation ─────────────────────────────────────────────────────────
    if (!videoId || !filename || !contentType) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: videoId, filename, contentType',
      });
    }

    if (!ALLOWED_THUMBNAIL_TYPES.includes(contentType)) {
      return res.status(400).json({
        success: false,
        error: `Invalid contentType. Allowed: ${ALLOWED_THUMBNAIL_TYPES.join(', ')}`,
      });
    }

    // Verify video exists
    const video = await VideoCatalog.findByPk(videoId);
    if (!video) {
      return res.status(404).json({ success: false, error: 'Video not found' });
    }

    // ── Generate thumbnail key ─────────────────────────────────────────────
    const thumbnailKey = generateThumbnailKey({ videoId, filename });

    // ── Generate presigned PUT URL (5 min TTL) ─────────────────────────────
    let thumbnailUrl;
    try {
      const result = await generateUploadUrl({
        objectKey: thumbnailKey,
        contentType,
        sha256hex: null,
        fileSize: null,
      });
      thumbnailUrl = result.uploadUrl;
    } catch (presignErr) {
      logger.error('[VideoCatalogController] Thumbnail presign failed for video %s: %s', videoId, presignErr.message);
      return res.status(500).json({ success: false, error: 'Failed to generate thumbnail upload URL' });
    }

    logger.info('[VideoCatalogController] Thumbnail URL generated — video: %s, key: %s', videoId, thumbnailKey);

    return res.status(200).json({
      success: true,
      data: {
        thumbnailUrl,
        thumbnailKey,
      },
    });
  } catch (err) {
    logger.error('[VideoCatalogController] requestThumbnailUrl error: %s', err.message, { stack: err.stack });
    return res.status(500).json({ success: false, error: 'Failed to generate thumbnail URL' });
  }
}

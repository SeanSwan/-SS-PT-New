// backend/services/r2StorageService.mjs
// ─────────────────────────────────────────────────────────────────────────────
// Cloudflare R2 Storage Service for SwanStudios Video Library
//
// Provides presigned URL generation (upload PUT + playback GET), object
// verification (HEAD), deletion (DELETE), and scoped key generation.
//
// R2 uses an S3-compatible API, so we drive it with @aws-sdk/client-s3.
// ─────────────────────────────────────────────────────────────────────────────

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import logger from '../utils/logger.mjs';

// ── Environment ──────────────────────────────────────────────────────────────

const {
  R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_BUCKET_NAME,
  R2_ENDPOINT,
  VIDEO_SIGNED_URL_TTL_HOURS,
} = process.env;

const r2Configured = !!(R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_BUCKET_NAME);

if (!r2Configured) {
  logger.warn(
    '[R2StorageService] Missing one or more R2 env vars (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, ' +
    'R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME). R2 operations will be unavailable. ' +
    'This is acceptable for local dev without object storage.',
  );
}

// ── Singleton Client ─────────────────────────────────────────────────────────

let _client = null;

/**
 * Returns a singleton S3Client instance configured for Cloudflare R2.
 * Throws if R2 env vars are not set.
 */
export function getR2Client() {
  if (_client) return _client;

  if (!r2Configured) {
    throw new Error(
      '[R2StorageService] Cannot create S3Client — R2 env vars are not configured.',
    );
  }

  const endpoint =
    R2_ENDPOINT || `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

  _client = new S3Client({
    region: 'auto',
    endpoint,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });

  logger.info('[R2StorageService] S3Client initialised for R2 bucket: %s', R2_BUCKET_NAME);
  return _client;
}

// ── TTL Constants ────────────────────────────────────────────────────────────

const UPLOAD_TTL_SECONDS = 5 * 60; // 5 minutes
const PLAYBACK_TTL_SECONDS =
  (parseInt(VIDEO_SIGNED_URL_TTL_HOURS, 10) || 4) * 60 * 60; // default 4 hours
const THUMBNAIL_TTL_SECONDS = 1 * 60 * 60; // 1 hour

// ── Upload URL ───────────────────────────────────────────────────────────────

/**
 * Generate a presigned PUT URL for uploading an object to R2.
 *
 * Dual-mode signing:
 *   Mode A — sha256hex provided: sets x-amz-checksum-sha256 header condition
 *            (hex digest converted to base64).
 *   Mode B — sha256hex is null/undefined: no checksum header condition.
 *
 * @param {Object}  opts
 * @param {string}  opts.objectKey   - Full R2 object key.
 * @param {string}  opts.contentType - MIME type (e.g. "video/mp4").
 * @param {string|null} opts.sha256hex - SHA-256 hex digest of the file, or null.
 * @param {number}  opts.fileSize    - File size in bytes (used for Content-Length).
 * @returns {Promise<{ uploadUrl: string, mode: 'A' | 'B' }>}
 */
export async function generateUploadUrl({ objectKey, contentType, sha256hex, fileSize }) {
  const client = getR2Client();

  const commandInput = {
    Bucket: R2_BUCKET_NAME,
    Key: objectKey,
    ContentType: contentType,
    ContentLength: fileSize,
  };

  // Mode A: include checksum header (hex -> base64)
  if (sha256hex) {
    const checksumBase64 = Buffer.from(sha256hex, 'hex').toString('base64');
    commandInput.ChecksumSHA256 = checksumBase64;
  }

  const command = new PutObjectCommand(commandInput);

  const uploadUrl = await getSignedUrl(client, command, {
    expiresIn: UPLOAD_TTL_SECONDS,
  });

  const mode = sha256hex ? 'A' : 'B';

  logger.info(
    '[R2StorageService] Generated upload URL (mode %s) for key: %s  (size: %d, type: %s)',
    mode,
    objectKey,
    fileSize,
    contentType,
  );

  return { uploadUrl, mode };
}

// ── Playback URL ─────────────────────────────────────────────────────────────

/**
 * Generate a presigned GET URL for video playback.
 *
 * @param {Object} opts
 * @param {string} opts.objectKey - Full R2 object key.
 * @param {string} opts.mimeType  - MIME type for Content-Type response override.
 * @returns {Promise<string>} Signed URL.
 */
export async function generatePlaybackUrl({ objectKey, mimeType }) {
  const client = getR2Client();

  const command = new GetObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: objectKey,
    ResponseContentDisposition: 'inline',
    ResponseContentType: mimeType,
  });

  const url = await getSignedUrl(client, command, {
    expiresIn: PLAYBACK_TTL_SECONDS,
  });

  logger.info('[R2StorageService] Generated playback URL for key: %s  (ttl: %ds)', objectKey, PLAYBACK_TTL_SECONDS);
  return url;
}

// ── Thumbnail URL ────────────────────────────────────────────────────────────

/**
 * Generate a presigned GET URL for a thumbnail image.
 * Shorter TTL (1 hour) suitable for list endpoints.
 *
 * @param {string} objectKey - Full R2 object key for the thumbnail.
 * @returns {Promise<string>} Signed URL.
 */
export async function generateThumbnailUrl(objectKey) {
  const client = getR2Client();

  const command = new GetObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: objectKey,
  });

  const url = await getSignedUrl(client, command, {
    expiresIn: THUMBNAIL_TTL_SECONDS,
  });

  logger.info('[R2StorageService] Generated thumbnail URL for key: %s  (ttl: %ds)', objectKey, THUMBNAIL_TTL_SECONDS);
  return url;
}

// ── Head Object ──────────────────────────────────────────────────────────────

/**
 * Perform a HEAD request against an R2 object.
 * Used by upload-complete verification to confirm the object landed.
 *
 * @param {string} objectKey - Full R2 object key.
 * @returns {Promise<{ contentLength: number, contentType: string, checksumSHA256: string|null }>}
 */
export async function headObject(objectKey) {
  const client = getR2Client();

  const command = new HeadObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: objectKey,
  });

  const response = await client.send(command);

  const result = {
    contentLength: response.ContentLength,
    contentType: response.ContentType,
    checksumSHA256: response.ChecksumSHA256 || null,
  };

  logger.info(
    '[R2StorageService] HEAD %s — size: %d, type: %s, checksum: %s',
    objectKey,
    result.contentLength,
    result.contentType,
    result.checksumSHA256 ?? '(none)',
  );

  return result;
}

// ── Delete Object ────────────────────────────────────────────────────────────

/**
 * Delete an object from R2 (best-effort).
 *
 * @param {string} objectKey - Full R2 object key.
 * @returns {Promise<void>}
 */
export async function deleteObject(objectKey) {
  try {
    const client = getR2Client();

    const command = new DeleteObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: objectKey,
    });

    await client.send(command);
    logger.info('[R2StorageService] Deleted object: %s', objectKey);
  } catch (err) {
    logger.warn('[R2StorageService] Best-effort delete failed for %s: %s', objectKey, err.message);
  }
}

// ── Key Generation ───────────────────────────────────────────────────────────

/**
 * Generate a scoped R2 object key for a video upload.
 *
 * Format: `videos/{creatorId}/{YYYY-MM}/{uuid}.{ext}`
 *
 * @param {Object} opts
 * @param {string|number} opts.creatorId - User ID of the uploader.
 * @param {string}        opts.filename  - Original filename (used for extension).
 * @returns {string} Object key.
 */
export function generateObjectKey({ creatorId, filename }) {
  const ext = path.extname(filename).replace(/^\./, '') || 'bin';
  const now = new Date();
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const id = uuidv4();

  return `videos/${creatorId}/${yearMonth}/${id}.${ext}`;
}

/**
 * Generate a scoped R2 object key for a video thumbnail.
 *
 * Format: `thumbnails/{videoId}/{uuid}.{ext}`
 *
 * @param {Object} opts
 * @param {string|number} opts.videoId  - Associated video record ID.
 * @param {string}        opts.filename - Original filename (used for extension).
 * @returns {string} Object key.
 */
export function generateThumbnailKey({ videoId, filename }) {
  const ext = path.extname(filename).replace(/^\./, '') || 'jpg';
  const id = uuidv4();

  return `thumbnails/${videoId}/${id}.${ext}`;
}

/**
 * Generate a scoped R2 object key for a photo upload.
 *
 * Format: `photos/{category}/{userId}/{YYYY-MM}/{uuid}.{ext}`
 *
 * @param {Object} opts
 * @param {string|number} opts.userId   - User who owns the photo.
 * @param {string}        opts.category - e.g. "profiles", "banners", "measurements".
 * @param {string}        opts.filename - Original filename (used for extension).
 * @returns {string} Object key.
 */
export function generatePhotoKey({ userId, category, filename }) {
  const ext = path.extname(filename).replace(/^\./, '') || 'jpg';
  const now = new Date();
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const id = uuidv4();

  return `photos/${category}/${userId}/${yearMonth}/${id}.${ext}`;
}

/** Whether R2 env vars are configured. */
export { r2Configured };

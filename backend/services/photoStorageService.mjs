// backend/services/photoStorageService.mjs
// ─────────────────────────────────────────────────────────────────────────────
// Unified Photo Storage Service for SwanStudios
//
// Uploads photos to Cloudflare R2 when configured, falls back to local disk.
// Used by: profile photo, banner photo, measurement progress photos.
//
// R2 Setup:
//   1. Enable public access on your R2 bucket (Cloudflare dashboard)
//   2. Set R2_PUBLIC_URL env var to the r2.dev subdomain URL
//   3. Existing R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
//      R2_BUCKET_NAME env vars are shared with r2StorageService (video).
// ─────────────────────────────────────────────────────────────────────────────

import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.mjs';

// Lazy imports to avoid circular dependency issues
let _getR2Client = null;
let _r2Configured = false;

async function ensureR2Imports() {
  if (_getR2Client) return;
  try {
    const mod = await import('./r2StorageService.mjs');
    _getR2Client = mod.getR2Client;
    _r2Configured = mod.r2Configured;
  } catch {
    _r2Configured = false;
  }
}

const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;

/**
 * Upload a photo buffer to storage.
 *
 * @param {Buffer} buffer - File data
 * @param {Object} opts
 * @param {string|number} opts.userId          - Owner user ID
 * @param {string}        opts.category        - "profiles" | "banners" | "measurements"
 * @param {string}        opts.originalFilename - Original filename (used for extension)
 * @param {string}        [opts.contentType]    - MIME type, defaults to "image/jpeg"
 * @returns {Promise<{ url: string, storageKey: string, storage: 'r2'|'local' }>}
 */
export async function uploadPhoto(buffer, { userId, category, originalFilename, contentType }) {
  await ensureR2Imports();

  const ext = path.extname(originalFilename).toLowerCase().replace(/^\./, '') || 'jpg';
  const now = new Date();
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const objectKey = `photos/${category}/${userId}/${yearMonth}/${uuidv4()}.${ext}`;

  // ── R2 path ────────────────────────────────────────────────────────────────
  if (_r2Configured) {
    try {
      const client = _getR2Client();
      await client.send(new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: objectKey,
        Body: buffer,
        ContentType: contentType || 'image/jpeg',
      }));

      // Build the public URL
      const url = R2_PUBLIC_URL
        ? `${R2_PUBLIC_URL.replace(/\/+$/, '')}/${objectKey}`
        : objectKey; // store key only — caller must resolve

      logger.info('[PhotoStorage] Uploaded to R2: %s (%d bytes)', objectKey, buffer.length);
      return { url, storageKey: objectKey, storage: 'r2' };
    } catch (err) {
      logger.error('[PhotoStorage] R2 upload failed, falling back to disk: %s', err.message);
      // Fall through to local disk
    }
  }

  // ── Local disk fallback ────────────────────────────────────────────────────
  const localDir = path.join(process.cwd(), 'uploads', category);
  await fs.mkdir(localDir, { recursive: true });

  const filename = `${Date.now()}-${uuidv4()}.${ext}`;
  const localPath = path.join(localDir, filename);
  await fs.writeFile(localPath, buffer);

  const url = `/uploads/${category}/${filename}`;
  logger.info('[PhotoStorage] Saved to disk: %s (%d bytes)', url, buffer.length);
  return { url, storageKey: url, storage: 'local' };
}

/**
 * Delete a photo from storage (best-effort).
 *
 * @param {string} storageKey - The key/path returned by uploadPhoto
 */
export async function deletePhoto(storageKey) {
  if (!storageKey) return;
  await ensureR2Imports();

  // R2 stored photos have keys like "photos/profiles/1/2026-03/uuid.jpg"
  if (storageKey.startsWith('photos/') && _r2Configured) {
    try {
      const client = _getR2Client();
      await client.send(new DeleteObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: storageKey,
      }));
      logger.info('[PhotoStorage] Deleted from R2: %s', storageKey);
    } catch (err) {
      logger.warn('[PhotoStorage] R2 delete failed: %s', err.message);
    }
    return;
  }

  // Local disk paths (start with /uploads/)
  if (storageKey.startsWith('/uploads/') || storageKey.startsWith('uploads/')) {
    try {
      const fullPath = path.join(process.cwd(), storageKey.replace(/^\//, ''));
      await fs.access(fullPath);
      await fs.unlink(fullPath);
      logger.info('[PhotoStorage] Deleted from disk: %s', storageKey);
    } catch (err) {
      logger.warn('[PhotoStorage] Disk delete failed: %s', err.message);
    }
    return;
  }

  // Full HTTP URL (R2 public URL) — extract key and delete from R2
  if (storageKey.startsWith('http') && R2_PUBLIC_URL && storageKey.startsWith(R2_PUBLIC_URL)) {
    const key = storageKey.replace(R2_PUBLIC_URL.replace(/\/+$/, '') + '/', '');
    if (key && _r2Configured) {
      try {
        const client = _getR2Client();
        await client.send(new DeleteObjectCommand({
          Bucket: R2_BUCKET_NAME,
          Key: key,
        }));
        logger.info('[PhotoStorage] Deleted from R2 (via URL): %s', key);
      } catch (err) {
        logger.warn('[PhotoStorage] R2 delete via URL failed: %s', err.message);
      }
    }
  }
}

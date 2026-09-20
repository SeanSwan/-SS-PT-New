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
import { fileURLToPath } from 'node:url';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.mjs';

// `__dirname` does NOT exist in ES module scope. It was referenced below without
// being defined, which threw `ReferenceError: __dirname is not defined in ES
// module scope` on EVERY import — so this module could not be loaded by plain
// `node` at all, and the whole app failed to boot.
//
// It was invisible to the test suite because vitest transforms modules through
// Vite, which supplies a `__dirname` shim; `node server.mjs` supplies nothing.
// This is the same shape as the `uploadPhoto` defect above: a failure that only
// appears in the real runtime. Every other file in this repo that uses
// `__dirname` defines it exactly like this.
const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

// ── Local disk root (E-11, hostile review seat 3) ──────────────────────────
// Every disk path in the upload/serve/delete chain is derived from THIS one
// constant. The old code used process.cwd() in three places, but cwd is just
// wherever node happened to be launched from, while express.static mounts
// uploads from a __dirname-relative path. Start the process from anywhere else
// and uploads land where the server can never serve them, while deletePhoto
// silently no-ops on a path that does not exist.
export const UPLOADS_ROOT = path.resolve(__dirname, '..', '..', 'uploads');
export const DISK_URL_PREFIX = '/uploads';

/**
 * Resolve a "/uploads/category/filename" URL (or bare "category/filename")
 * to an absolute on-disk path.
 * @param {string} urlOrRelative
 * @returns {string} absolute path, always inside UPLOADS_ROOT
 */
export function resolveLocalUploadPath(urlOrRelative) {
  const relative = String(urlOrRelative || '')
    .replace(/^\/+/, '')
    .replace(/^uploads\//, '');
  const resolved = path.resolve(UPLOADS_ROOT, relative);
  // Path-traversal guard: never escape the uploads root.
  if (resolved !== UPLOADS_ROOT && !resolved.startsWith(UPLOADS_ROOT + path.sep)) {
    throw new Error(`Refusing to resolve upload path outside uploads root: ${urlOrRelative}`);
  }
  return resolved;
}

// ── Magic-byte sniffing (E-07, hostile review seat 3) ──────────────────────
// `contentType` and `originalFilename` are BOTH client-controlled. A caller
// can upload an HTML payload named "avatar.jpg" with Content-Type text/html,
// and R2 will serve it back from our own public domain with that Content-Type
// — stored XSS. Extension allowlists at the route layer do not stop it,
// because the attacker simply names the file "avatar.jpg".
//
// The bytes are the only trustworthy statement of what a file actually is, so
// the stored extension AND the stored Content-Type are both derived from the
// sniff, never from the request.
const HEIC_BRANDS = new Set(['heic', 'heix', 'hevc', 'heim', 'heis', 'hevm', 'hevs', 'mif1', 'msf1']);

const FILE_SIGNATURES = [
  // images
  { ext: 'jpg', mime: 'image/jpeg', test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { ext: 'png', mime: 'image/png', test: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { ext: 'gif', mime: 'image/gif', test: (b) => b.subarray(0, 3).toString('latin1') === 'GIF' && b[3] === 0x38 && (b[4] === 0x37 || b[4] === 0x39) && b[5] === 0x61 },
  { ext: 'webp', mime: 'image/webp', test: (b) => b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP' },
  { ext: 'heic', mime: 'image/heic', test: (b) => b.subarray(4, 8).toString('latin1') === 'ftyp' && HEIC_BRANDS.has(b.subarray(8, 12).toString('latin1')) },
  // video containers (social posts upload video through this same helper)
  { ext: 'mp4', mime: 'video/mp4', test: (b) => b.subarray(4, 8).toString('latin1') === 'ftyp' },
  { ext: 'webm', mime: 'video/webm', test: (b) => b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3 },
  { ext: 'avi', mime: 'video/x-msvideo', test: (b) => b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'AVI ' },
  // documents (trainer COI / certification uploads — see ALLOWED_MIME in trainerOnboardingRoutes.mjs)
  { ext: 'pdf', mime: 'application/pdf', test: (b) => b.subarray(0, 5).toString('latin1') === '%PDF-' },
];

/**
 * Identify a buffer from its leading bytes.
 * @param {Buffer} buffer
 * @returns {{ext: string, mime: string}|null} null when the bytes match nothing we accept
 */
export function sniffFileType(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return null;
  for (const sig of FILE_SIGNATURES) {
    // every test() reads at most the first 12 bytes, which the length guard covers
    if (sig.test(buffer)) return { ext: sig.ext, mime: sig.mime };
  }
  return null;
}

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

  // E-07: trust the bytes, not the request. This is the single choke point for
  // every upload caller (profile, banner, measurement, equipment, product,
  // challenge, social photo/video, trainer credential).
  const sniffed = sniffFileType(buffer);
  if (!sniffed) {
    logger.warn(
      '[PhotoStorage] Rejected upload — bytes match no accepted type (declared=%s name=%s bytes=%d)',
      contentType, originalFilename, buffer?.length ?? 0
    );
    throw new Error('Uploaded file is not a recognized image, video or PDF.');
  }
  if (contentType && contentType !== sniffed.mime) {
    logger.warn(
      '[PhotoStorage] Declared type %s disagrees with actual bytes (%s) — storing as %s',
      contentType, sniffed.mime, sniffed.mime
    );
  }

  const ext = sniffed.ext;
  const safeContentType = sniffed.mime;
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
        // E-07: never the client-declared type — the sniffed one.
        ContentType: safeContentType,
      }));

      // Build the public URL
      // When R2_PUBLIC_URL is set, build full URL; otherwise route through our
      // API proxy so Render's static-site layer doesn't intercept the request.
      const url = R2_PUBLIC_URL
        ? `${R2_PUBLIC_URL.replace(/\/+$/, '')}/${objectKey}`
        : `/api/serve-photo/${objectKey}`;

      logger.info('[PhotoStorage] Uploaded to R2: %s (%d bytes)', objectKey, buffer.length);
      return { url, storageKey: objectKey, storage: 'r2' };
    } catch (err) {
      logger.error('[PhotoStorage] R2 upload failed, falling back to disk: %s', err.message);
      // Fall through to local disk
    }
  }

  // ── Local disk fallback ────────────────────────────────────────────────────
  // E-11: UPLOADS_ROOT, not process.cwd().
  const localDir = path.join(UPLOADS_ROOT, category);
  await fs.mkdir(localDir, { recursive: true });

  const filename = `${Date.now()}-${uuidv4()}.${ext}`;
  const localPath = path.join(localDir, filename);
  await fs.writeFile(localPath, buffer);

  const url = `${DISK_URL_PREFIX}/${category}/${filename}`;
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
      // E-11: same resolver the write path and the serve proxy use, so a
      // delete always lands on the file the upload actually wrote.
      const fullPath = resolveLocalUploadPath(storageKey);
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

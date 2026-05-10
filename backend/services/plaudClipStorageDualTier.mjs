/**
 * plaudClipStorageDualTier.mjs
 * =============================
 * Dual-tier storage for PLAUD audio clips: Render disk (primary, fast)
 * + Cloudflare R2 (mirror, durable).
 *
 * Phase 3 Slice 3.3 (2026-05-04). Plan: PHASE-3-PLAUD-MERGE-INGESTION-PLAN-v3-2026-05-04.md §17.
 *
 * Public API:
 *   writeClipToDisk(userId, clipId, ext, buffer) -> { diskPath, sha256 }
 *     Writes the buffer to /tmp/plaud/<userId>/<clipId>.<ext>, mode 0600.
 *     Computes sha256 for integrity. Caller is responsible for ALSO
 *     creating the plaud_clips DB row + plaud_clip_mirror_jobs outbox row
 *     (per §5.1 two-phase upload pattern).
 *
 *   readClip(userId, clipId, ext, { fallbackR2Key } = {}) -> Buffer
 *     Tries disk first; on ENOENT reads from R2 via fallbackR2Key,
 *     restores to disk for next reader, returns buffer.
 *     Throws ClipNotFoundError if both miss.
 *
 *   deleteClip(userId, clipId, ext, { r2Key } = {}) -> void
 *     Best-effort cleanup of disk + R2. Errors logged, not thrown
 *     (called from cleanup paths where errors must not block).
 *
 *   computeR2Key(userId, clipId, ext) -> string
 *     Deterministic R2 object key: plaud-clips/<userId>/<clipId>.<ext>
 *
 * Storage layout:
 *   /tmp/plaud/<userId>/                   (mode 0700)
 *   /tmp/plaud/<userId>/<clipId>.<ext>     (mode 0600)
 *   /tmp/plaud/_normalized/<mergeId>/N.mp3 (slice 3.6 — not this slice)
 *   /tmp/plaud/_lists/<uuid>.txt           (slice 3.6 — not this slice)
 *
 * Codex Round 3 HIGH #2 fix: this file does NOT do the two-phase
 * upload (uploading -> pending_merge) — the controller orchestrates
 * that across this module + DB writes. This file just owns the disk
 * primitives.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { Readable } from 'node:stream';
import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import logger from '../utils/logger.mjs';
import {
  getPlaudR2BucketCandidates,
  getPlaudR2Client,
  isPlaudR2Configured,
} from './plaudR2Client.mjs';
import { PLAUD_UUID_REGEX } from '../utils/plaudUuidRegex.mjs';

// Read env on each call so tests can override PLAUD_DISK_BASE before
// invoking the service. Default '/tmp/plaud' is the production layout.
function getPlaudDiskBase() {
  return process.env.PLAUD_DISK_BASE || '/tmp/plaud';
}

export class ClipNotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ClipNotFoundError';
    this.code = 'CLIP_NOT_FOUND';
  }
}

function isR2NotFound(err) {
  return err?.name === 'NoSuchKey'
    || err?.name === 'NotFound'
    || err?.$metadata?.httpStatusCode === 404;
}

function isR2BucketAccessFallbackError(err) {
  return err?.name === 'AccessDenied'
    || err?.name === 'NoSuchBucket'
    || err?.$metadata?.httpStatusCode === 403;
}

function diskPathFor(userId, clipId, ext) {
  // Sanitize: userId is integer (controller responsibility); clipId is
  // UUID v4 (uppercase or lowercase hex + hyphens); ext is short alnum.
  if (!Number.isInteger(userId) || userId <= 0) {
    throw new Error(`Invalid userId: ${userId}`);
  }
  if (!PLAUD_UUID_REGEX.test(clipId)) {
    throw new Error(`Invalid clipId: ${clipId}`);
  }
  if (!/^[a-z0-9]{1,8}$/i.test(ext)) {
    throw new Error(`Invalid ext: ${ext}`);
  }
  return path.join(getPlaudDiskBase(), String(userId), `${clipId}.${ext}`);
}

export function computeR2Key(userId, clipId, ext) {
  if (!Number.isInteger(userId)) throw new Error(`Invalid userId: ${userId}`);
  // Codex Pass 2 Round 2 LOW finding: tightened to canonical UUID regex
  // for consistency with diskPathFor() and the rest of the PLAUD code.
  if (!PLAUD_UUID_REGEX.test(clipId)) throw new Error(`Invalid clipId: ${clipId}`);
  if (!/^[a-z0-9]{1,8}$/i.test(ext)) throw new Error(`Invalid ext: ${ext}`);
  return `plaud-clips/${userId}/${clipId}.${ext}`;
}

/**
 * Writes the buffer to disk under the PLAUD layout. Returns the disk
 * path and sha256 hash for integrity. Does NOT touch the DB or R2;
 * those are the caller's responsibility per the two-phase upload flow.
 */
export async function writeClipToDisk(userId, clipId, ext, buffer) {
  if (!Buffer.isBuffer(buffer)) {
    throw new Error('writeClipToDisk: buffer must be a Buffer');
  }
  const target = diskPathFor(userId, clipId, ext);
  const dir = path.dirname(target);
  await fs.mkdir(dir, { recursive: true, mode: 0o700 });

  const sha = createHash('sha256').update(buffer).digest('hex');

  // Write atomically: write to <target>.tmp then rename. Avoids partial
  // file on crash mid-write.
  const tmpPath = `${target}.tmp`;
  await fs.writeFile(tmpPath, buffer, { mode: 0o600 });
  await fs.rename(tmpPath, target);

  return { diskPath: target, sha256: sha };
}

/**
 * Read clip bytes. Disk first; falls back to R2 if disk missing.
 * Restores R2-fetched bytes to disk for the next reader.
 */
export async function readClip(userId, clipId, ext, opts = {}) {
  const target = diskPathFor(userId, clipId, ext);
  try {
    return await fs.readFile(target);
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }

  // Disk miss → try R2 fallback
  const r2Key = opts.fallbackR2Key || (opts.skipR2Fallback ? null : computeR2Key(userId, clipId, ext));
  if (!r2Key) {
    throw new ClipNotFoundError(`disk miss + no mirrored R2 key (clipId=${clipId})`);
  }
  if (!isPlaudR2Configured()) {
    throw new ClipNotFoundError(`disk miss + R2 not configured (clipId=${clipId})`);
  }

  const { client } = getPlaudR2Client();
  let response;
  let lastR2Error = null;
  for (const bucket of getPlaudR2BucketCandidates()) {
    try {
      response = await client.send(new GetObjectCommand({ Bucket: bucket, Key: r2Key }));
      break;
    } catch (err) {
      lastR2Error = err;
      if (isR2NotFound(err) || isR2BucketAccessFallbackError(err)) continue;
      throw err;
    }
  }
  if (!response) {
    if (lastR2Error && !isR2NotFound(lastR2Error)) throw lastR2Error;
    throw new ClipNotFoundError(`disk miss + R2 miss (clipId=${clipId})`);
  }

  const buffer = await streamToBuffer(response.Body);

  // Restore to disk so next reader (and the merge ffmpeg invocation)
  // hits disk instead of paying R2 latency again.
  //
  // Codex Pass 2 MEDIUM #3 fix: when the caller requires disk-backed
  // reads (the merge pipeline does — ffmpeg consumes the disk path),
  // restore failure must throw rather than silently log. Default
  // requireDiskRestore = true matches the merge pipeline; pass
  // requireDiskRestore: false for buffer-only consumers.
  try {
    await fs.mkdir(path.dirname(target), { recursive: true, mode: 0o700 });
    await fs.writeFile(target, buffer, { mode: 0o600 });
  } catch (err) {
    if (opts.requireDiskRestore !== false) {
      throw new ClipNotFoundError(
        `disk hit + R2 hit but disk restore failed (clipId=${clipId}): ${err.message}`,
      );
    }
    logger.warn('[plaudStorage] R2-restore-to-disk failed (caller opted out of disk restore): %s', err.message);
  }
  return buffer;
}

/**
 * Best-effort delete from BOTH disk and R2. Errors are logged, not thrown
 * (called from soft-delete and TTL cleanup paths where the caller must
 * always succeed even if storage layer is flaky).
 */
export async function deleteClip(userId, clipId, ext, opts = {}) {
  const target = diskPathFor(userId, clipId, ext);
  try {
    await fs.unlink(target);
  } catch (err) {
    if (err.code !== 'ENOENT') {
      logger.warn('[plaudStorage] disk unlink failed (continuing): %s', err.message);
    }
  }

  if (!isPlaudR2Configured()) return;
  const r2Key = opts.r2Key || computeR2Key(userId, clipId, ext);
  try {
    const { client } = getPlaudR2Client();
    for (const bucket of getPlaudR2BucketCandidates()) {
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: r2Key })).catch((err) => {
        if (!isR2NotFound(err) && !isR2BucketAccessFallbackError(err)) throw err;
      });
    }
  } catch (err) {
    logger.warn('[plaudStorage] R2 delete failed (continuing): %s', err.message);
  }
}

/**
 * Upload a clip from disk to R2. Used by the outbox worker.
 * Throws on failure so the worker can mark the job failed_retryable
 * and back off.
 */
export async function uploadClipToR2(userId, clipId, ext, mimetype) {
  if (!isPlaudR2Configured()) {
    throw new Error('R2 not configured');
  }
  const diskPath = diskPathFor(userId, clipId, ext);
  const body = await fs.readFile(diskPath);
  const r2Key = computeR2Key(userId, clipId, ext);
  const { client } = getPlaudR2Client();
  let lastR2Error = null;
  for (const bucket of getPlaudR2BucketCandidates()) {
    try {
      await client.send(new PutObjectCommand({
        Bucket: bucket,
        Key: r2Key,
        Body: body,
        ContentType: mimetype || 'application/octet-stream',
      }));
      return { r2Key, sizeBytes: body.length };
    } catch (err) {
      lastR2Error = err;
      if (isR2BucketAccessFallbackError(err)) {
        logger.warn('[plaudStorage] R2 upload denied for bucket %s; trying fallback bucket if configured', bucket);
        continue;
      }
      throw err;
    }
  }
  if (lastR2Error) throw lastR2Error;
  return { r2Key, sizeBytes: body.length };
}

export async function r2KeyExists(userId, clipId, ext) {
  if (!isPlaudR2Configured()) return false;
  const { client } = getPlaudR2Client();
  const key = computeR2Key(userId, clipId, ext);
  for (const bucket of getPlaudR2BucketCandidates()) {
    try {
      await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
      return true;
    } catch (err) {
      if (isR2NotFound(err) || isR2BucketAccessFallbackError(err)) continue;
      throw err;
    }
  }
  return false;
}

async function streamToBuffer(stream) {
  if (!stream) return Buffer.alloc(0);
  if (Buffer.isBuffer(stream)) return stream;
  if (stream instanceof Uint8Array) return Buffer.from(stream);
  // Node Readable
  if (typeof stream[Symbol.asyncIterator] === 'function') {
    const chunks = [];
    for await (const chunk of stream) {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }
    return Buffer.concat(chunks);
  }
  if (stream instanceof Readable) {
    return new Promise((resolve, reject) => {
      const chunks = [];
      stream.on('data', (c) => chunks.push(c));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  }
  throw new Error(`Unsupported stream type: ${typeof stream}`);
}

export const _internal = { diskPathFor, getPlaudDiskBase };

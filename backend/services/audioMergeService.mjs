/**
 * audioMergeService.mjs
 * ======================
 * ffmpeg subprocess wrapper for the PLAUD merge pipeline.
 *
 * Phase 3 Slice 3.6 (2026-05-04). Plan: PHASE-3-PLAUD-MERGE-INGESTION-PLAN-v3-2026-05-04.md §5.4 + §11.
 *
 * Public API:
 *   normalizeClip(inputPath, outputPath, opts) -> outputPath
 *     Encode any input container to mono 24kHz MP3 64kbit. Used per-clip
 *     before concat to handle mixed containers (Codex Round 2 HIGH #3).
 *
 *   mergeNormalizedClips(clipPaths, outputPath, opts) -> outputPath
 *     Concat normalized files via ffmpeg concat demuxer. Inputs MUST
 *     already be uniform (run normalizeClip first). Path validation
 *     guards against shell-escape via PLAUD_DISK_BASE-relative regex.
 *
 *   mergeAndCleanup(clips, mergeRequestId) -> mergedPath
 *     Convenience: runs normalize on all clips into a tmp dir then
 *     concats. Cleans up the tmp normalized files in finally.
 *
 * Hardening:
 *   - spawn (no shell:true)
 *   - 60s timeout for normalize (per clip), 120s for concat
 *   - SIGKILL on timeout
 *   - stderr capped to last 4KB (memory bound)
 *   - list file unlinked in BOTH exit and error paths (Codex Round 2 LOW)
 *   - mkdir 0700 for list dir before write (Codex Round 2 LOW)
 *   - clip path validation against env-resolved base (Codex Round 3 MEDIUM)
 */
import fs from 'node:fs/promises';
import path, { join } from 'node:path';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import logger from '../utils/logger.mjs';

const FFMPEG_BIN = process.env.PLAUD_FFMPEG_PATH || 'ffmpeg';
const NORMALIZE_TIMEOUT_MS = Number(process.env.PLAUD_NORMALIZE_TIMEOUT_MS) || 60_000;
const MERGE_TIMEOUT_MS = Number(process.env.PLAUD_MERGE_TIMEOUT_MS) || 120_000;

function getPlaudDiskBase() {
  return process.env.PLAUD_DISK_BASE || '/tmp/plaud';
}

export class FfmpegError extends Error {
  constructor(code, message, { stderr } = {}) {
    super(message);
    this.name = 'FfmpegError';
    this.code = code;
    this.stderr = stderr;
  }
}

/**
 * Encode one clip to a uniform intermediate format (mono 24kHz MP3 64kbit).
 * Used per-clip before concat to avoid mixed-container demuxer failure.
 */
export async function normalizeClip(inputPath, outputPath, { timeoutMs = NORMALIZE_TIMEOUT_MS } = {}) {
  if (typeof inputPath !== 'string' || !inputPath) throw new Error('normalizeClip: inputPath required');
  if (typeof outputPath !== 'string' || !outputPath) throw new Error('normalizeClip: outputPath required');

  // Ensure output dir
  await fs.mkdir(path.dirname(outputPath), { recursive: true, mode: 0o700 });

  return new Promise((resolve, reject) => {
    const proc = spawn(FFMPEG_BIN, [
      '-y',
      '-i', inputPath,
      '-c:a', 'libmp3lame',
      '-b:a', '64k',
      '-ar', '24000',
      '-ac', '1',
      outputPath,
    ], { stdio: ['ignore', 'ignore', 'pipe'], windowsHide: true });

    let stderr = '';
    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
      if (stderr.length > 4096) stderr = stderr.slice(-4096);
    });

    const timer = setTimeout(() => {
      try { proc.kill('SIGKILL'); } catch { /* already gone */ }
      reject(new FfmpegError('FFMPEG_NORMALIZE_TIMEOUT', `normalize timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    proc.on('exit', (code) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve(outputPath);
      } else {
        reject(new FfmpegError('FFMPEG_NORMALIZE_FAILED', `normalize exit ${code}`, { stderr }));
      }
    });

    proc.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

/**
 * Concat already-normalized files. Inputs must be uniform (same codec /
 * sample rate / channels) — caller must run normalizeClip on each first.
 */
export async function mergeNormalizedClips(clipPaths, outputPath, { timeoutMs = MERGE_TIMEOUT_MS } = {}) {
  if (!Array.isArray(clipPaths) || clipPaths.length === 0) {
    throw new Error('mergeNormalizedClips: clipPaths array required');
  }

  const base = getPlaudDiskBase();
  const listDir = join(base, '_lists');
  await fs.mkdir(listDir, { recursive: true, mode: 0o700 });

  // Path validation against env-resolved base (Codex Round 3 MEDIUM)
  const normalizedBase = path.resolve(base, '_normalized');
  for (const p of clipPaths) {
    const resolved = path.resolve(p);
    if (!resolved.startsWith(normalizedBase + path.sep)) {
      throw new Error(`Refusing untrusted clip path: ${p}`);
    }
    if (!/[0-9a-f-]{36}[\\/]\d+\.mp3$/i.test(resolved)) {
      throw new Error(`Refusing malformed clip path: ${p}`);
    }
  }

  const listFile = join(listDir, `${randomUUID()}.txt`);
  // ffmpeg concat demuxer file format: lines of `file '/abs/path'`
  const listContent = clipPaths
    .map((p) => `file '${p.replace(/'/g, "'\\''")}'`)
    .join('\n');
  await fs.writeFile(listFile, listContent, { mode: 0o600 });

  // Unified cleanup runs in BOTH exit and error paths (Codex Round 2 LOW #2)
  let cleaned = false;
  const cleanup = async () => {
    if (cleaned) return;
    cleaned = true;
    try { await fs.unlink(listFile); } catch { /* best-effort */ }
  };

  return new Promise((resolve, reject) => {
    const proc = spawn(FFMPEG_BIN, [
      '-y',
      '-f', 'concat',
      '-safe', '0',
      '-i', listFile,
      '-c:a', 'copy',     // inputs already normalized; no re-encode
      outputPath,
    ], { stdio: ['ignore', 'ignore', 'pipe'], windowsHide: true });

    let stderr = '';
    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
      if (stderr.length > 4096) stderr = stderr.slice(-4096);
    });

    const timer = setTimeout(() => {
      try { proc.kill('SIGKILL'); } catch { /* already gone */ }
      cleanup().finally(() => reject(new FfmpegError('FFMPEG_TIMEOUT', `concat timed out after ${timeoutMs}ms`)));
    }, timeoutMs);

    proc.on('exit', async (code) => {
      clearTimeout(timer);
      await cleanup();
      if (code === 0) {
        resolve(outputPath);
      } else {
        reject(new FfmpegError('FFMPEG_FAILED', `concat exit ${code}`, { stderr }));
      }
    });

    proc.on('error', async (err) => {
      clearTimeout(timer);
      await cleanup();
      reject(err);
    });
  });
}

/**
 * High-level: normalize each clip into a tmp dir, then concat into
 * outputPath. Cleans up the tmp normalized files in finally.
 *
 * @param {Array<{ diskPath: string }>} clips
 *   Source disk paths in the order they should appear in the merged audio.
 * @param {string} mergeRequestId
 *   UUID for this merge; used to namespace the normalized intermediate dir.
 * @param {string} outputPath
 *   Where to write the merged MP3.
 */
export async function mergeAndCleanup(clips, mergeRequestId, outputPath) {
  if (!Array.isArray(clips) || clips.length === 0) {
    throw new Error('mergeAndCleanup: clips array required');
  }
  // Codex Pass 2 MEDIUM #2 fix: canonical UUID regex with hyphen positions
  if (!/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(String(mergeRequestId || ''))) {
    throw new Error(`mergeAndCleanup: invalid mergeRequestId ${mergeRequestId}`);
  }

  const base = getPlaudDiskBase();
  const normDir = path.resolve(base, '_normalized', mergeRequestId);
  await fs.mkdir(normDir, { recursive: true, mode: 0o700 });

  const normalizedPaths = [];
  try {
    for (let i = 0; i < clips.length; i += 1) {
      const inputPath = clips[i].diskPath;
      const outPath = path.join(normDir, `${i}.mp3`);
      await normalizeClip(inputPath, outPath);
      normalizedPaths.push(outPath);
    }
    await mergeNormalizedClips(normalizedPaths, outputPath);
    return outputPath;
  } finally {
    // Always clean up the normalized intermediate files
    await Promise.all(
      normalizedPaths.map((p) => fs.unlink(p).catch(() => { /* best-effort */ })),
    );
    await fs.rmdir(normDir).catch(() => { /* best-effort */ });
  }
}

export const _internal = { getPlaudDiskBase, FFMPEG_BIN, NORMALIZE_TIMEOUT_MS, MERGE_TIMEOUT_MS };

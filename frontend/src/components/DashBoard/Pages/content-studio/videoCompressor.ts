/**
 * videoCompressor.ts
 * ==================
 * Thin ffmpeg.wasm orchestration for the Video Optimizer. The browser does the
 * transcode entirely client-side — the master never leaves the machine and is
 * never modified; we always emit a NEW .mp4 Blob the user downloads.
 *
 * SAFETY: this uses the SINGLE-THREADED @ffmpeg/core (loaded from CDN at runtime,
 * only when the user actually compresses). The single-threaded core needs NO
 * SharedArrayBuffer and NO site-wide Cross-Origin-Opener/Embedder-Policy headers,
 * so enabling this feature has ZERO blast radius on YouTube/Stripe/R2 embeds.
 * (The multithreaded core-mt would force COEP and break those — deliberately not used.)
 *
 * This module is integration-only (ffmpeg.wasm can't run in jsdom). All
 * decision logic lives in videoCompression.logic.ts; the panel mocks THIS module.
 */

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { buildFfmpegArgs, getPreset, outputFileName, type PresetId } from './videoCompression.logic';

// Pinned single-threaded core compatible with @ffmpeg/ffmpeg 0.12.x. Module-private
// for now; promote to an export / env override when a self-host-the-core slice needs it.
const FFMPEG_CORE_VERSION = '0.12.6';
const FFMPEG_CORE_BASE_URL = `https://unpkg.com/@ffmpeg/core@${FFMPEG_CORE_VERSION}/dist/umd`;

export interface CompressResult {
  blob: Blob;
  outputBytes: number;
  outputName: string;
  mimeType: string;
}

export interface CompressHandlers {
  /** Transcode progress, 0..1. */
  onProgress?: (ratio: number) => void;
  /** Raw ffmpeg log lines (for a debug/console view). */
  onLog?: (line: string) => void;
}

/** Quick capability gate so the panel can show a friendly message on old browsers. */
export function isLikelySupported(): boolean {
  return typeof WebAssembly !== 'undefined' && typeof Blob !== 'undefined';
}

const clamp01 = (n: number) => (Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0);

// Cache the resolved core blob URLs so repeat compressions don't re-download the
// ~30MB core. Reset on failure so a transient network error can be retried.
let coreUrlsPromise: Promise<{ coreURL: string; wasmURL: string }> | null = null;

async function resolveCoreUrls(): Promise<{ coreURL: string; wasmURL: string }> {
  if (!coreUrlsPromise) {
    coreUrlsPromise = (async () => ({
      coreURL: await toBlobURL(`${FFMPEG_CORE_BASE_URL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${FFMPEG_CORE_BASE_URL}/ffmpeg-core.wasm`, 'application/wasm'),
    }))();
  }
  try {
    return await coreUrlsPromise;
  } catch (err) {
    coreUrlsPromise = null; // allow a retry on the next attempt
    throw new Error('Could not load the in-browser video engine (network or CDN issue). Check your connection and try again.');
  }
}

function inputNameFor(file: File): string {
  const match = /\.([a-z0-9]+)$/i.exec(file.name || '');
  const ext = match ? match[1].toLowerCase() : 'mp4';
  return `input.${ext}`;
}

/**
 * Compress `file` with the chosen quality preset. Resolves with the new MP4 Blob.
 * A fresh FFmpeg instance per call keeps state isolated and avoids listener leaks;
 * the heavy core download is cached across calls.
 */
export async function compressVideo(
  file: File,
  presetId: PresetId,
  handlers: CompressHandlers = {},
): Promise<CompressResult> {
  const preset = getPreset(presetId);
  const inputName = inputNameFor(file);
  const outputName = outputFileName(file.name, presetId);

  const ffmpeg = new FFmpeg();
  if (handlers.onLog) ffmpeg.on('log', ({ message }) => handlers.onLog!(message));
  if (handlers.onProgress) ffmpeg.on('progress', ({ progress }) => handlers.onProgress!(clamp01(progress)));

  try {
    const urls = await resolveCoreUrls();
    await ffmpeg.load(urls);
    await ffmpeg.writeFile(inputName, await fetchFile(file));
    await ffmpeg.exec(buildFfmpegArgs(preset, inputName, outputName));

    const data = await ffmpeg.readFile(outputName);
    const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
    if (!bytes || bytes.length === 0) {
      throw new Error('Compression produced an empty file — the source may be unsupported or corrupt.');
    }
    // Copy into a fresh ArrayBuffer-backed view so the Blob part is unambiguously
    // a plain ArrayBuffer (the single-threaded core never produces SharedArrayBuffer).
    const out = new Uint8Array(bytes.length);
    out.set(bytes);
    const blob = new Blob([out], { type: 'video/mp4' });
    return { blob, outputBytes: blob.size, outputName, mimeType: 'video/mp4' };
  } finally {
    try { ffmpeg.terminate(); } catch { /* best-effort cleanup */ }
  }
}

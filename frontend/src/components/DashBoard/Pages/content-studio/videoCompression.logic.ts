/**
 * videoCompression.logic.ts
 * =========================
 * Pure logic for the Content Studio Video Optimizer: quality presets, ffmpeg
 * argument construction, size/cost math, and input validation.
 *
 * The actual transcode (ffmpeg.wasm) lives in videoCompressor.ts — it can't run
 * in jsdom, so everything decision-shaped lives here and is unit-tested.
 *
 * Design intent (Sean): "no fuzzy video — I want quality control." Presets are
 * explicit quality/size tradeoffs, never silent. Masters are NEVER modified;
 * compression always produces a NEW file (a Blob the user downloads).
 */

import { R2_USD_PER_GB_MONTH, formatBytes, formatUsd } from './storageMeter.logic';

const BYTES_PER_GB = 1024 ** 3;

/** Hard ceiling — ffmpeg.wasm runs in browser memory; bigger files risk OOM. */
export const MAX_INPUT_BYTES = 1024 ** 3; // 1 GB
/** Above this we still allow it but warn that the browser may struggle. */
export const SOFT_WARN_BYTES = 512 * 1024 * 1024; // 512 MB

export type PresetId = 'high' | 'balanced' | 'small';

export interface CompressionPreset {
  id: PresetId;
  label: string;
  /** What this preset is FOR — shown next to the choice so the tradeoff is explicit. */
  blurb: string;
  /** x264 constant rate factor (lower = higher quality + bigger file). */
  crf: number;
  /** Cap output height (keeps aspect, never upscales). */
  maxHeight: number;
  /** AAC audio bitrate, kbps. */
  audioKbps: number;
  /** Rough output/input size ratio for the pre-run estimate (very approximate). */
  estRatio: number;
}

export const PRESETS: readonly CompressionPreset[] = [
  {
    id: 'high',
    label: 'High',
    blurb: 'Showcase / hero — near-master quality, largest file.',
    crf: 20, maxHeight: 1080, audioKbps: 160, estRatio: 0.6,
  },
  {
    id: 'balanced',
    label: 'Balanced',
    blurb: 'Recommended — crisp web demo, much smaller.',
    crf: 26, maxHeight: 720, audioKbps: 128, estRatio: 0.35,
  },
  {
    id: 'small',
    label: 'Small',
    blurb: 'Many clips / quick reference — smallest file, softer.',
    crf: 30, maxHeight: 480, audioKbps: 96, estRatio: 0.18,
  },
] as const;

export const DEFAULT_PRESET_ID: PresetId = 'balanced';

export function getPreset(id: PresetId): CompressionPreset {
  return PRESETS.find(p => p.id === id) ?? PRESETS[1];
}

/**
 * ffmpeg argument vector for an H.264/AAC MP4 web copy.
 * - scale caps height to the preset, keeps aspect (-2 = nearest even width), never upscales (min()).
 * - +faststart moves the moov atom up front so the clip starts streaming immediately.
 * No shell is involved (ffmpeg.wasm takes an argv array), so the comma inside
 * min() is escaped for the filtergraph parser, not for a shell.
 */
export function buildFfmpegArgs(preset: CompressionPreset, inputName: string, outputName: string): string[] {
  return [
    '-i', inputName,
    '-vf', `scale=-2:min(${preset.maxHeight}\\,ih)`,
    '-c:v', 'libx264',
    '-preset', 'medium',
    '-crf', String(preset.crf),
    '-c:a', 'aac',
    '-b:a', `${preset.audioKbps}k`,
    '-movflags', '+faststart',
    outputName,
  ];
}

/** Pre-run size estimate (clearly an estimate — true size depends on the source). */
export function estimateOutputBytes(inputBytes: number, preset: CompressionPreset): number {
  if (!Number.isFinite(inputBytes) || inputBytes <= 0) return 0;
  return Math.round(inputBytes * preset.estRatio);
}

export interface Savings {
  savedBytes: number;
  /** 0–100; never negative (a bigger output reports 0% saved). */
  savedPct: number;
}

export function compressionSavings(inputBytes: number, outputBytes: number): Savings {
  if (!Number.isFinite(inputBytes) || inputBytes <= 0) return { savedBytes: 0, savedPct: 0 };
  const savedBytes = Math.max(0, inputBytes - outputBytes);
  const savedPct = Math.max(0, Math.min(100, (savedBytes / inputBytes) * 100));
  return { savedBytes, savedPct };
}

/** R2 monthly storage cost for an arbitrary byte size (projection only). */
export function monthlyUsdForBytes(bytes: number): number {
  if (!Number.isFinite(bytes) || bytes <= 0) return 0;
  return (bytes / BYTES_PER_GB) * R2_USD_PER_GB_MONTH;
}

export type InputCheck = { ok: true; warn: string | null } | { ok: false; error: string };

const VIDEO_EXT = /\.(mp4|mov|m4v|webm|mkv|avi|ogv|ogg)$/i;

export function validateInputFile(file: { type?: string; size: number; name: string }): InputCheck {
  const isVideoType = (file.type ?? '').startsWith('video/');
  const isVideoExt = VIDEO_EXT.test(file.name ?? '');
  if (!isVideoType && !isVideoExt) {
    return { ok: false, error: 'Pick a video file (mp4, mov, webm, …).' };
  }
  if (!Number.isFinite(file.size) || file.size <= 0) {
    return { ok: false, error: 'That file looks empty.' };
  }
  if (file.size > MAX_INPUT_BYTES) {
    return {
      ok: false,
      error: `Too large for in-browser compression (${formatBytes(file.size)} > ${formatBytes(MAX_INPUT_BYTES)}). Trim or compress on desktop first.`,
    };
  }
  if (file.size > SOFT_WARN_BYTES) {
    return { ok: true, warn: `${formatBytes(file.size)} is large — this may be slow or strain the browser.` };
  }
  return { ok: true, warn: null };
}

/** "squat.mov" + balanced -> "squat-web-balanced.mp4". Always outputs .mp4. */
export function outputFileName(inputName: string, presetId: PresetId): string {
  const base = (inputName || 'video').replace(/\.[^.]+$/, '').replace(/[^\w.-]+/g, '_') || 'video';
  return `${base}-web-${presetId}.mp4`;
}

/** One-line "before -> after" summary for the result card. */
export function savingsSummary(inputBytes: number, outputBytes: number): string {
  const { savedBytes, savedPct } = compressionSavings(inputBytes, outputBytes);
  const costDelta = monthlyUsdForBytes(savedBytes);
  return `${formatBytes(inputBytes)} → ${formatBytes(outputBytes)} · ${savedPct.toFixed(0)}% smaller · ≈ ${formatUsd(costDelta)}/mo saved on R2`;
}

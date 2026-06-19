/**
 * storageMeter.logic.ts
 * =====================
 * Pure presentation/maths for the Content Studio storage + cost meter.
 *
 * The base usage figures (totalBytes / objectCount / estMonthlyUsd) come from
 * the backend endpoint GET /api/content-studio/storage-usage (Codex's lane).
 * This module ONLY formats those numbers and derives a UI-side cost-headroom
 * projection — it never re-computes the authoritative monthly bill, it just
 * helps Sean reason about the quality/cost tradeoff of adding more backup clips.
 *
 * No React, no I/O — fully unit-testable in jsdom.
 */

/** Cloudflare R2 standard storage list price (USD per GB-month, no egress fee). */
export const R2_USD_PER_GB_MONTH = 0.015;

/** Monthly-cost tiers used to color the meter (USD/month). Backup clips are cheap. */
export const COST_TIER_WATCH_USD = 3;
export const COST_TIER_HIGH_USD = 10;

const BYTES_PER_GB = 1024 ** 3;

export interface StorageUsage {
  totalBytes: number;
  objectCount: number;
  estMonthlyUsd: number;
}

export type CostTier = 'ok' | 'watch' | 'high';

/** Human-readable byte size: 0 B, 932 KB, 1.2 GB, ... Always non-negative. */
export function formatBytes(bytes: number, fractionDigits = 1): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  // Bytes never show a fraction; everything else uses the requested precision.
  const digits = unit === 0 ? 0 : fractionDigits;
  return `${value.toFixed(digits)} ${units[unit]}`;
}

/** Compact USD: <$0.01 shows "<$0.01" so a tiny non-zero bill never rounds to $0.00. */
export function formatUsd(usd: number): string {
  if (!Number.isFinite(usd) || usd <= 0) return '$0.00';
  if (usd < 0.01) return '<$0.01';
  return `$${usd.toFixed(2)}`;
}

/** Average bytes per stored object, or null when there is nothing to average. */
export function averageObjectBytes(usage: StorageUsage): number | null {
  if (!usage || usage.objectCount <= 0 || usage.totalBytes <= 0) return null;
  return usage.totalBytes / usage.objectCount;
}

/** Estimated R2 storage cost per month for one average-sized clip (projection only). */
export function perClipMonthlyUsd(usage: StorageUsage): number | null {
  const avg = averageObjectBytes(usage);
  if (avg === null) return null;
  return (avg / BYTES_PER_GB) * R2_USD_PER_GB_MONTH;
}

/** Color/severity tier for the current monthly estimate. */
export function costTier(estMonthlyUsd: number): CostTier {
  if (!Number.isFinite(estMonthlyUsd) || estMonthlyUsd < COST_TIER_WATCH_USD) return 'ok';
  if (estMonthlyUsd < COST_TIER_HIGH_USD) return 'watch';
  return 'high';
}

/**
 * Cost headroom: roughly how many more average-sized clips fit before the
 * monthly estimate would reach `targetUsd`. Returns null when we can't project
 * (no objects yet, or already at/over target). Floors so we never over-promise.
 */
export function clipsUntilUsd(usage: StorageUsage, targetUsd: number): number | null {
  const perClip = perClipMonthlyUsd(usage);
  if (perClip === null || perClip <= 0) return null;
  const remaining = targetUsd - usage.estMonthlyUsd;
  if (remaining <= 0) return null;
  return Math.floor(remaining / perClip);
}

/**
 * One-line headroom hint for the meter, e.g.
 *   "Each clip ≈ 18.4 MB ≈ <$0.01/mo · room for ~163 more before $3/mo".
 * Falls back gracefully when no projection is possible.
 */
export function headroomHint(usage: StorageUsage): string | null {
  const avg = averageObjectBytes(usage);
  const perClip = perClipMonthlyUsd(usage);
  if (avg === null || perClip === null) return null;
  const base = `Each clip ≈ ${formatBytes(avg)} ≈ ${formatUsd(perClip)}/mo`;
  const headroom = clipsUntilUsd(usage, COST_TIER_WATCH_USD);
  if (headroom === null || headroom <= 0) return base;
  return `${base} · room for ~${headroom} more before ${formatUsd(COST_TIER_WATCH_USD)}/mo`;
}

/** Validate/normalize the raw endpoint payload; returns null if the shape is wrong. */
export function parseStorageUsage(raw: unknown): StorageUsage | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const totalBytes = Number(obj.totalBytes);
  const objectCount = Number(obj.objectCount);
  const estMonthlyUsd = Number(obj.estMonthlyUsd);
  if (![totalBytes, objectCount, estMonthlyUsd].every(Number.isFinite)) return null;
  return {
    totalBytes: Math.max(0, totalBytes),
    objectCount: Math.max(0, objectCount),
    estMonthlyUsd: Math.max(0, estMonthlyUsd),
  };
}

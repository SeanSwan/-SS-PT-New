/**
 * equipmentScanSessionMerge — Walk-the-Gym cross-photo batch merge (S7).
 * =============================================================================
 * Blueprint §10a #9 (Kimi #8 merge transparency): a multi-photo queue run
 * produces N independent `EquipmentScanBatch` results with NO cross-photo
 * dedupe — walking a gym photographs the same rack twice. This module merges
 * those per-photo batches into ONE tray and produces a human-readable receipt
 * for every dropped duplicate so the trainer sees exactly what was merged.
 *
 * Pure logic only — no React, no network, no side effects.
 *
 * Merge algorithm:
 *   - Dedupe key = normalized (trainerLabel || name) + '|' + normalized
 *     category, reusing `normalizeNameKey` from equipmentScanBatch.ts so the
 *     session merge agrees with the existing duplicate-match normalization.
 *   - Batches are walked in scan order; the FIRST occurrence of a key wins.
 *   - A later occurrence from a DIFFERENT photo is dropped and recorded as a
 *     `MergeReceiptEntry`. Same-photo repeats are kept untouched — the V3
 *     backend already deduped within one photo, and this module must never
 *     rewrite a single photo's tray content.
 *   - `createdItems`, `possibleItems`, and `duplicates` each dedupe within
 *     their own pool. Cross-pool dedupe (a possible item in photo 2 matching a
 *     created item from photo 1) is a deliberate NON-GOAL — pools carry
 *     different review affordances and silently collapsing them would hide a
 *     real low-confidence sighting.
 *   - Per-batch `degraded` flags surface as `degradedFiles` (the merged batch
 *     itself is NOT flagged degraded: the single-photo banner copy would be
 *     wrong for a session; the per-photo filmstrip chips carry that signal).
 *   - `scanSession` is intentionally OMITTED from the merged batch: each photo
 *     has its own `reviewSessionId`, and carrying one photo's id would
 *     mis-attribute candidate reviews from the other photos.
 *
 * Deliberate non-goals (deferred, documented per slice spec):
 *   - NO backend changes in this slice. A `batchId` column linking the N
 *     per-photo scan sessions into one walk-the-gym session is deferred; the
 *     review ledger already records per-photo sessions, so nothing is lost.
 */
import type { EquipmentItem, EquipmentScanCandidate, EquipmentScanDuplicate } from '../../hooks/useEquipmentAPI';
import { getCandidateName, normalizeNameKey } from './equipmentScanBatch';
import type { EquipmentScanBatch } from './equipmentScanBatch';

export interface MergeReceiptEntry {
  /** Display label of the occurrence that was kept. */
  keptLabel: string;
  /** File the kept occurrence came from (first sighting). */
  keptFile: string;
  /** File whose duplicate occurrence was dropped. */
  droppedFile: string;
  /** Normalized name+category dedupe key that matched. */
  key: string;
}

export interface EquipmentScanSessionMergeResult {
  merged: EquipmentScanBatch;
  receipt: MergeReceiptEntry[];
  /** File names of photos whose scan ran in degraded (caption-fallback) mode. */
  degradedFiles: string[];
}

const buildKey = (name: string | null | undefined, category: string | null | undefined): string => (
  `${normalizeNameKey(name)}|${normalizeNameKey(category)}`
);

const itemKey = (item: EquipmentItem): string => (
  buildKey(item.trainerLabel || item.name, item.category)
);

const itemLabel = (item: EquipmentItem): string => item.trainerLabel || item.name;

// Same category fallback chain as buildManualItemDraftFromCandidate, so the
// key a candidate merges under matches the category it would be added with.
const candidateKey = (candidate: EquipmentScanCandidate | EquipmentScanDuplicate): string => (
  buildKey(getCandidateName(candidate), candidate.suggestedCategory || candidate.category || 'other')
);

interface KeptOccurrence {
  label: string;
  file: string;
}

/**
 * Dedupe one pool (createdItems / possibleItems / duplicates) across batches.
 * `seen` persists across batches for the pool; receipt entries are appended
 * for every cross-photo drop.
 */
function dedupePool<T>(
  entries: T[],
  fileName: string,
  seen: Map<string, KeptOccurrence>,
  keyOf: (entry: T) => string,
  labelOf: (entry: T) => string,
  receipt: MergeReceiptEntry[],
): T[] {
  return entries.filter((entry) => {
    const key = keyOf(entry);
    // Nameless entries (normalized name empty) never merge — a blank key must
    // not collapse unrelated detections.
    if (key.startsWith('|')) return true;
    const kept = seen.get(key);
    if (!kept) {
      seen.set(key, { label: labelOf(entry), file: fileName });
      return true;
    }
    if (kept.file === fileName) return true; // same-photo repeat: preserve photo fidelity
    receipt.push({ keptLabel: kept.label, keptFile: kept.file, droppedFile: fileName, key });
    return false;
  });
}

/**
 * Merge N per-photo scan batches into one session batch + merge receipt.
 * Single-batch input passes through unchanged (today's single-photo behavior).
 */
export function mergeScanBatches(batches: EquipmentScanBatch[]): EquipmentScanSessionMergeResult {
  const degradedFiles = batches.filter(batch => batch.degraded === true).map(batch => batch.fileName);

  if (batches.length === 0) {
    return {
      merged: { fileName: '0 photos', createdItems: [], possibleItems: [], duplicates: [] },
      receipt: [],
      degradedFiles,
    };
  }

  if (batches.length === 1) {
    // Passthrough: same batch object, so single-photo runs are bit-identical.
    return { merged: batches[0], receipt: [], degradedFiles };
  }

  const receipt: MergeReceiptEntry[] = [];
  const seenCreated = new Map<string, KeptOccurrence>();
  const seenPossible = new Map<string, KeptOccurrence>();
  const seenDuplicates = new Map<string, KeptOccurrence>();

  const createdItems: EquipmentItem[] = [];
  const possibleItems: EquipmentScanCandidate[] = [];
  const duplicates: EquipmentScanDuplicate[] = [];

  for (const batch of batches) {
    createdItems.push(...dedupePool(
      batch.createdItems, batch.fileName, seenCreated, itemKey, itemLabel, receipt,
    ));
    possibleItems.push(...dedupePool(
      batch.possibleItems, batch.fileName, seenPossible, candidateKey, getCandidateName, receipt,
    ));
    duplicates.push(...dedupePool(
      batch.duplicates, batch.fileName, seenDuplicates, candidateKey, getCandidateName, receipt,
    ));
  }

  return {
    merged: {
      fileName: `${batches.length} photos`,
      createdItems,
      possibleItems,
      duplicates,
      // scanSession + degraded intentionally omitted — see header.
    },
    receipt,
    degradedFiles,
  };
}

/** Total detections in one batch — used for the per-photo filmstrip chips. */
export function countBatchDetections(batch: EquipmentScanBatch): number {
  return batch.createdItems.length + batch.possibleItems.length + batch.duplicates.length;
}

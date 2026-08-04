import type {
  EquipmentItem,
  EquipmentScanCandidate,
  EquipmentScanDuplicate,
  EquipmentScanErrorPayload,
  EquipmentScanResponse,
  EquipmentScanSession,
} from '../../hooks/useEquipmentAPI';

export interface EquipmentScanBatch {
  fileName: string;
  createdItems: EquipmentItem[];
  possibleItems: EquipmentScanCandidate[];
  duplicates: EquipmentScanDuplicate[];
  scanSession?: EquipmentScanSession;
  /** V3 honesty flag — caption fallback only saw the dominant object. */
  degraded?: boolean;
  error?: string;
}

/**
 * Trust tiers (blueprint §10a #3 — LOCKED, Kimi+HY3): user-facing copy never
 * shows raw confidence decimals; exact numbers live in the edit sheet only.
 */
export type TrustTier = 'confident' | 'likely' | 'uncertain';

export function getTrustTier(confidence: number | undefined): TrustTier {
  if (typeof confidence !== 'number' || Number.isNaN(confidence)) return 'uncertain';
  if (confidence >= 0.8) return 'confident';
  if (confidence >= 0.55) return 'likely';
  return 'uncertain';
}

export const TRUST_TIER_LABELS: Record<TrustTier, string> = {
  confident: 'Confident',
  likely: 'Likely — quick check',
  uncertain: 'Not sure — scan this spot closer?',
};

const byItemId = (items: EquipmentItem[]): EquipmentItem[] => {
  const seen = new Set<number>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
};

export function buildEquipmentScanBatch(
  response: EquipmentScanResponse | EquipmentScanErrorPayload | null | undefined,
  fileName: string,
): EquipmentScanBatch | null {
  if (!response || typeof response !== 'object') return null;

  const itemList = Array.isArray(response.items) ? response.items : [];
  const fallbackItem = response.item ? [response.item] : [];
  const createdItems = byItemId([...itemList, ...fallbackItem]);
  const possibleItems = Array.isArray(response.possibleItems) ? response.possibleItems : [];
  const duplicates = Array.isArray(response.duplicates) ? response.duplicates : [];
  const scanSession = response.scanSession;
  const candidateCount = scanSession?.candidateCount ?? response.candidates?.length ?? 0;

  if (createdItems.length === 0 && possibleItems.length === 0 && duplicates.length === 0 && candidateCount <= 1) {
    return null;
  }

  return {
    fileName,
    createdItems,
    possibleItems,
    duplicates,
    scanSession,
    degraded: response.degraded === true,
    error: 'error' in response && typeof response.error === 'string' ? response.error : undefined,
  };
}

export function shouldAutoOpenScanApproval(batch: EquipmentScanBatch | null): boolean {
  if (!batch) return true;
  return batch.createdItems.length <= 1
    && batch.possibleItems.length === 0
    && batch.duplicates.length === 0
    && (batch.scanSession?.candidateCount ?? batch.createdItems.length) <= 1;
}

export function formatScanConfidence(confidence: number | undefined): string {
  if (typeof confidence !== 'number' || Number.isNaN(confidence)) return 'confidence unavailable';
  return `${Math.round(Math.max(0, Math.min(1, confidence)) * 100)}% confidence`;
}

export function getCandidateName(candidate: EquipmentScanCandidate | EquipmentScanDuplicate): string {
  return candidate.suggestedName || 'Possible equipment';
}

export interface EquipmentCandidateManualItemDraft {
  name: string;
  category?: string;
  resistanceType?: string;
  description?: string;
  quantity?: number;
}

export interface EquipmentDuplicateQuantityMergeDraft {
  quantity: number;
}

export interface EquipmentScanBoundingBox {
  id: string;
  label: string;
  status: 'created' | 'possible' | 'duplicate';
  /** 1-based constellation pip number, assigned in render order. */
  pip: number;
  tier: TrustTier;
  left: number;
  top: number;
  width: number;
  height: number;
}

type RawBoundingBox = NonNullable<EquipmentScanCandidate['boundingBox']>;

const clampPercent = (value: number): number => Math.min(100, Math.max(0, value));

const normalizeBoxValue = (value: number): number => {
  const percent = Math.abs(value) <= 1 ? value * 100 : value;
  return Math.round(clampPercent(percent) * 100) / 100;
};

const normalizeBoundingBox = (box: RawBoundingBox | null | undefined) => {
  if (!box) return null;
  const left = normalizeBoxValue(box.x);
  const top = normalizeBoxValue(box.y);
  const width = Math.min(normalizeBoxValue(box.w), 100 - left);
  const height = Math.min(normalizeBoxValue(box.h), 100 - top);
  if (width <= 0 || height <= 0) return null;
  return { left, top, width, height };
};

const boxFromItem = (item: EquipmentItem): Omit<EquipmentScanBoundingBox, 'pip'> | null => {
  const box = normalizeBoundingBox(item.aiScanData?.boundingBox);
  if (!box) return null;
  return {
    id: `created-${item.id}`,
    label: item.trainerLabel || item.name,
    status: 'created',
    tier: getTrustTier(item.aiScanData?.confidence),
    ...box,
  };
};

const boxFromCandidate = (
  candidate: EquipmentScanCandidate | EquipmentScanDuplicate,
  index: number,
  status: EquipmentScanBoundingBox['status'],
): Omit<EquipmentScanBoundingBox, 'pip'> | null => {
  const box = normalizeBoundingBox(candidate.boundingBox);
  if (!box) return null;
  const label = getCandidateName(candidate);
  return {
    id: `${status}-${candidate.dedupeKey || label}-${index}`,
    label,
    status,
    tier: getTrustTier(candidate.confidence),
    ...box,
  };
};

export function getBatchBoundingBoxes(batch: EquipmentScanBatch): EquipmentScanBoundingBox[] {
  return [
    ...batch.createdItems.map(boxFromItem),
    ...batch.possibleItems.map((candidate, index) => boxFromCandidate(candidate, index, 'possible')),
    ...batch.duplicates.map((candidate, index) => boxFromCandidate(candidate, index, 'duplicate')),
  ]
    .filter((box): box is Omit<EquipmentScanBoundingBox, 'pip'> => Boolean(box))
    .map((box, index) => ({ ...box, pip: index + 1 }));
}

const normalizeCandidateQuantity = (quantity: number | undefined): number => {
  if (typeof quantity !== 'number' || !Number.isFinite(quantity)) return 1;
  return Math.max(1, Math.round(quantity));
};

// Exported so equipmentScanSessionMerge.ts reuses the SAME normalization for
// cross-photo dedupe keys (Walk-the-Gym, blueprint §10a #9).
export const normalizeNameKey = (value: string | null | undefined): string => (
  typeof value === 'string' ? value.trim().toLowerCase() : ''
);

export function findDuplicateMatchedItem(
  items: EquipmentItem[],
  duplicate: EquipmentScanDuplicate,
): EquipmentItem | null {
  const duplicateItemId = Number(duplicate.duplicateOfItemId);
  if (Number.isFinite(duplicateItemId)) {
    return items.find(item => item.id === duplicateItemId) ?? null;
  }

  const duplicateName = normalizeNameKey(getCandidateName(duplicate));
  if (!duplicateName) return null;
  return items.find(item => (
    normalizeNameKey(item.trainerLabel) === duplicateName
    || normalizeNameKey(item.name) === duplicateName
  )) ?? null;
}

export function buildDuplicateQuantityMerge(
  matchedItem: EquipmentItem,
  duplicate: EquipmentScanDuplicate,
): EquipmentDuplicateQuantityMergeDraft {
  return {
    quantity: normalizeCandidateQuantity(matchedItem.quantity) + normalizeCandidateQuantity(duplicate.quantity),
  };
}

export function buildManualItemDraftFromCandidate(
  candidate: EquipmentScanCandidate,
): EquipmentCandidateManualItemDraft {
  return {
    name: getCandidateName(candidate),
    category: candidate.suggestedCategory || candidate.category || 'other',
    resistanceType: candidate.resistanceType || undefined,
    description: candidate.description || undefined,
    quantity: normalizeCandidateQuantity(candidate.quantity),
  };
}

export function removeBatchPossibleItem(
  batch: EquipmentScanBatch | null,
  candidateIndex: number,
): EquipmentScanBatch | null {
  if (!batch) return batch;
  const possibleItems = batch.possibleItems.filter((_, index) => index !== candidateIndex);
  if (batch.createdItems.length === 0 && possibleItems.length === 0 && batch.duplicates.length === 0) {
    return null;
  }
  return { ...batch, possibleItems };
}

export function removeBatchDuplicateItem(
  batch: EquipmentScanBatch | null,
  duplicateIndex: number,
): EquipmentScanBatch | null {
  if (!batch) return batch;
  const duplicates = batch.duplicates.filter((_, index) => index !== duplicateIndex);
  if (batch.createdItems.length === 0 && batch.possibleItems.length === 0 && duplicates.length === 0) {
    return null;
  }
  return { ...batch, duplicates };
}
export function replaceBatchItem(
  batch: EquipmentScanBatch | null,
  nextItem: EquipmentItem,
): EquipmentScanBatch | null {
  if (!batch) return batch;
  return {
    ...batch,
    createdItems: batch.createdItems.map(item => (
      item.id === nextItem.id ? nextItem : item
    )),
  };
}

export function updateBatchItemStatus(
  batch: EquipmentScanBatch | null,
  itemId: number,
  approvalStatus: EquipmentItem['approvalStatus'],
): EquipmentScanBatch | null {
  if (!batch) return batch;
  return {
    ...batch,
    createdItems: batch.createdItems.map(item => (
      item.id === itemId ? { ...item, approvalStatus } : item
    )),
  };
}
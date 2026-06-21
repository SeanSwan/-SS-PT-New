/**
 * HELPERS: BadgeCreatorPayloadSafety
 * PURPOSE: Normalize Badge Creator API rows before mounted panels render them.
 */

import type { ArtStyle } from './StyleBrowser';

export interface GalleryBadgeRow {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  rarity: string;
  category: string;
  xpReward: number;
  assignedTo: string | null;
  assignedTarget: string | null;
  isShared: boolean;
  isAnimated: boolean;
  createdAt: string;
}

export interface MarketplaceBadgeRow {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  rarity: string;
  isAnimated: boolean;
  createdAt: string;
}

export interface BatchImageRow {
  index: number;
  variation: string;
  success: boolean;
  imageUrl: string | null;
}

export interface BadgeCreatorCredits {
  remaining: number;
  max: number;
}

const MAX_BATCH_IMAGE_ROWS = 5;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const asString = (value: unknown, fallback = '') =>
  typeof value === 'string' ? value : fallback;

const asNonEmptyString = (value: unknown): string | null => {
  const text = asString(value).trim();
  return text ? text : null;
};

const asNullableString = (value: unknown): string | null => {
  const text = asNonEmptyString(value);
  return text ?? null;
};

const asFiniteNumber = (value: unknown, fallback = 0) =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

export const normalizeCreditCount = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;

const normalizeArtStyle = (value: unknown): ArtStyle | null => {
  if (!isRecord(value)) return null;
  const id = asNonEmptyString(value.id);
  const name = asNonEmptyString(value.name);
  const category = asNonEmptyString(value.category);
  const promptModifier = asNonEmptyString(value.promptModifier);
  if (!id || !name || !category || !promptModifier) return null;

  return { id, name, category, promptModifier };
};

export const normalizeArtStyleRows = (value: unknown): ArtStyle[] => (
  Array.isArray(value)
    ? value.map(normalizeArtStyle).filter((style): style is ArtStyle => style !== null)
    : []
);

export const normalizeBadgeCreatorCredits = (value: unknown): BadgeCreatorCredits | null => {
  if (!isRecord(value)) return null;
  const remaining = normalizeCreditCount(value.remaining);
  const max = normalizeCreditCount(value.max);
  if (remaining === null || max === null || remaining > max) return null;
  return { remaining, max };
};

const asBoolean = (value: unknown) => value === true;

const normalizeBadgeBase = (value: unknown): MarketplaceBadgeRow | null => {
  if (!isRecord(value)) return null;
  const id = asNonEmptyString(value.id);
  const name = asNonEmptyString(value.name);
  if (!id || !name) return null;

  return {
    id,
    name,
    description: asString(value.description),
    imageUrl: asString(value.imageUrl),
    rarity: asNonEmptyString(value.rarity) ?? 'common',
    isAnimated: asBoolean(value.isAnimated),
    createdAt: asString(value.createdAt),
  };
};

const normalizeGalleryBadge = (value: unknown): GalleryBadgeRow | null => {
  const base = normalizeBadgeBase(value);
  if (!base || !isRecord(value)) return null;

  return {
    ...base,
    category: asNonEmptyString(value.category) ?? 'general',
    xpReward: asFiniteNumber(value.xpReward),
    assignedTo: asNullableString(value.assignedTo),
    assignedTarget: asNullableString(value.assignedTarget),
    isShared: asBoolean(value.isShared),
  };
};

export const normalizeGalleryBadges = (value: unknown): GalleryBadgeRow[] => (
  Array.isArray(value)
    ? value.map(normalizeGalleryBadge).filter((badge): badge is GalleryBadgeRow => badge !== null)
    : []
);

export const normalizeMarketplaceBadges = (value: unknown): MarketplaceBadgeRow[] => (
  Array.isArray(value)
    ? value.map(normalizeBadgeBase).filter((badge): badge is MarketplaceBadgeRow => badge !== null)
    : []
);

const normalizeBatchImage = (value: unknown, fallbackIndex: number): BatchImageRow | null => {
  if (!isRecord(value)) return null;
  return {
    index: asFiniteNumber(value.index, fallbackIndex),
    variation: asNonEmptyString(value.variation) ?? `Variation ${fallbackIndex + 1}`,
    success: asBoolean(value.success),
    imageUrl: typeof value.imageUrl === 'string' ? value.imageUrl : null,
  };
};

export const normalizeBatchImageRows = (value: unknown): BatchImageRow[] => (
  Array.isArray(value)
    ? value.slice(0, MAX_BATCH_IMAGE_ROWS).map(normalizeBatchImage).filter((image): image is BatchImageRow => image !== null)
    : []
);

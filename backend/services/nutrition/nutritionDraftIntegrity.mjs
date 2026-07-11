/**
 * Integrity policy for reviewed nutrition drafts.
 * Trust grades and replay receipts are derived server-side from durable input.
 */
import { createHash } from 'node:crypto';

const PROVIDER_SOURCES = new Set(['search', 'restaurant', 'barcode']);
const AI_SOURCES = new Set(['voice', 'photo', 'meal-plan']);
const COMMUNITY_PROVIDER_PATTERN = /open\s*food\s*facts/i;

const canonicalize = (value) => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== 'object') return value;
  return Object.keys(value).sort().reduce((result, key) => {
    if (value[key] !== undefined) result[key] = canonicalize(value[key]);
    return result;
  }, {});
};

export const nutritionDraftDigest = (value) => createHash('sha256')
  .update(JSON.stringify(canonicalize(value)))
  .digest('hex');

export const isCommunityNutritionProvider = (rawPayloadRef) =>
  COMMUNITY_PROVIDER_PATTERN.test(rawPayloadRef?.provider || '');

export const resolveNutritionSourceConfidence = (source, rawPayloadRef, reviewReason) => {
  if (source === 'manual') return 'community';
  if (AI_SOURCES.has(source)) return 'ai_estimate';
  if (source === 'barcode' && reviewReason === 'barcode_unmatched') return 'community';
  if (PROVIDER_SOURCES.has(source) && isCommunityNutritionProvider(rawPayloadRef)) return 'community';
  return PROVIDER_SOURCES.has(source) ? 'provider' : 'community';
};

export const hasDurableProviderReference = (source, rawPayloadRef) => {
  if (!PROVIDER_SOURCES.has(source)) return true;
  if (!rawPayloadRef?.provider) return false;
  if (source === 'barcode') return Boolean(rawPayloadRef.barcode || rawPayloadRef.externalId);
  return Boolean(rawPayloadRef.externalId);
};

export const nutritionEntryReceipt = (entry) => Object.fromEntries(Object.entries({
  id: entry?.id,
  date: entry?.date,
  mealType: entry?.mealType,
  reviewStatus: entry?.reviewStatus,
  reviewReason: entry?.reviewReason,
}).filter(([, value]) => value !== undefined));

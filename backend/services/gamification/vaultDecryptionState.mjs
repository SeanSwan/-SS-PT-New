/**
 * ============================================================================
 * FILE: vaultDecryptionState.mjs
 * PURPOSE: Normalize persisted Vault Decryption JSON state before UI/API use.
 * ============================================================================
 *
 * The vault inventory lives inside Gamification.activityLog JSON. This helper
 * keeps malformed stored rows from leaking unsafe strings, broken timestamps,
 * invalid colors, or object-shaped copy into active gamification responses.
 */

export const isPlainRecord = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

export const toActivityLogArray = (activityLog) =>
  Array.isArray(activityLog) ? activityLog.filter(isPlainRecord) : [];

export const getTimestampMs = (timestamp) => {
  const parsed = Date.parse(timestamp);
  return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY;
};

const SAFE_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;
const LOOT_ITEM_TYPES = new Set(['title', 'avatar_frame', 'emote', 'profile_banner', 'badge']);
const INVALID_TIMESTAMP_FALLBACK = '1970-01-01T00:00:00.000Z';

const normalizeString = (value, fallback, maxLength = 120) => {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : fallback;
};

const normalizeNumber = (value, fallback, min, max) => {
  const numeric = typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  return Math.min(max, Math.max(min, numeric));
};

const normalizeInteger = (value, fallback, min, max) => {
  const numeric = normalizeNumber(value, fallback, min, max);
  return Math.round(numeric);
};

const normalizeRarity = (value, rarityTiers) => (
  typeof value === 'string' && rarityTiers[value] ? value : 'common'
);

const normalizeColor = (value, fallback) => (
  typeof value === 'string' && SAFE_COLOR_PATTERN.test(value) ? value : fallback
);

const normalizeTimestamp = (value, fallbackIso) => {
  const parsed = typeof value === 'string' ? Date.parse(value) : NaN;
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : fallbackIso;
};

const normalizeLootItem = (value, rarity) => {
  const item = isPlainRecord(value) ? value : {};
  const itemType = typeof item.type === 'string' && LOOT_ITEM_TYPES.has(item.type) ? item.type : 'badge';
  const normalized = {
    id: normalizeString(item.id, 'unknown_reward', 120),
    type: itemType,
    name: normalizeString(item.name, 'Vault Reward', 120),
    description: normalizeString(item.description, 'Reward details unavailable', 240),
    rarity,
  };
  const duration = normalizeInteger(item.duration, 0, 0, 60 * 60 * 24 * 7);
  if (duration > 0) normalized.duration = duration;
  return normalized;
};

export const normalizeVaultDrop = (value, rarityTiers, timestampFallback = INVALID_TIMESTAMP_FALLBACK) => {
  if (!isPlainRecord(value)) return null;
  const rarity = normalizeRarity(value.rarity, rarityTiers);
  const rarityConfig = rarityTiers[rarity];

  return {
    id: normalizeString(value.id, 'vault_drop', 120),
    userId: normalizeInteger(value.userId, 0, 0, Number.MAX_SAFE_INTEGER),
    rarity,
    rarityLabel: normalizeString(value.rarityLabel, rarityConfig.label, 80),
    rarityColor: normalizeColor(value.rarityColor, rarityConfig.color),
    glowColor: normalizeColor(value.glowColor, rarityConfig.glowColor),
    decryptionTime: normalizeNumber(value.decryptionTime, rarityConfig.decryptionTime, 0.25, 30),
    xpBonus: 0,
    rewardMode: 'cosmetic_only',
    item: normalizeLootItem(value.item, rarity),
    trigger: normalizeString(value.trigger, 'Vault Reward', 80),
    actionType: normalizeString(value.actionType, 'vault_drop', 80),
    timestamp: normalizeTimestamp(value.timestamp, timestampFallback),
    idempotencyKey: normalizeString(value.idempotencyKey, '', 160),
  };
};

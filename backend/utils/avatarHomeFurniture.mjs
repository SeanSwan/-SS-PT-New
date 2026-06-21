import { FURNITURE_TIERS } from './avatarHomeCatalog.mjs';

const TIER_ORDER = ['starter', 'mid', 'premium', 'luxury'];
const SELECTOR_PATTERN = /^[A-Za-z0-9_-]+$/;

const isRecord = (value) => value && typeof value === 'object' && !Array.isArray(value);

const normalizeSelector = (value) => {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (trimmed === '') return null;
  if (trimmed.length > 50 || !SELECTOR_PATTERN.test(trimmed)) return undefined;
  return trimmed;
};

export const buildAvatarHomeFurnitureUpdate = ({ payload = {}, homeTier = 'starter', currentFurniture = {} } = {}) => {
  const room = normalizeSelector(payload?.room);
  const slot = normalizeSelector(payload?.slot);
  const item = normalizeSelector(payload?.item);

  if (room === null || slot === null || item === null) {
    return { error: 'room, slot, and item are required', status: 400, updates: {} };
  }
  if (room === undefined || slot === undefined) {
    return { error: 'Invalid room or slot', status: 400, updates: {} };
  }
  if (item === undefined) {
    return { error: 'Invalid furniture item', status: 400, updates: {} };
  }

  const roomTiers = FURNITURE_TIERS[room];
  const slotItems = roomTiers?.[slot];
  if (!slotItems) {
    return { error: 'Invalid room or slot', status: 400, updates: {} };
  }
  if (!slotItems.includes(item)) {
    return { error: 'Invalid furniture item', status: 400, updates: {} };
  }

  const maxTierIdx = Math.max(TIER_ORDER.indexOf(homeTier), 0);
  const itemTierIdx = slotItems.indexOf(item);
  if (itemTierIdx > maxTierIdx) {
    return { error: 'Item requires a higher home tier', status: 403, updates: {} };
  }

  const baseFurniture = isRecord(currentFurniture) ? { ...currentFurniture } : {};
  const roomFurniture = isRecord(baseFurniture[room]) ? { ...baseFurniture[room] } : {};
  roomFurniture[slot] = item;

  return {
    error: null,
    status: 200,
    updates: {
      furniture: {
        ...baseFurniture,
        [room]: roomFurniture,
      },
    },
  };
};

const ITEM_ID_PATTERN = /^[A-Za-z0-9_-]+$/;

const isRecord = (value) => value && typeof value === 'object' && !Array.isArray(value);

const optionalId = (value) => {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (trimmed === '') return null;
  if (trimmed.length > 80 || !ITEM_ID_PATTERN.test(trimmed)) return undefined;
  return trimmed;
};

const safeString = (value, fallback = '') => (typeof value === 'string' ? value : fallback);

export const normalizeMarketplaceItemId = (value) => optionalId(value);

export const normalizeCrystalBalance = (value) => {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
};

export const normalizeOwnedMarketplaceItems = (value) => {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => isRecord(item) && typeof item.id === 'string' && item.id.trim() !== '')
    .map((item) => ({
      id: item.id.trim(),
      type: safeString(item.type),
      name: safeString(item.name, item.id.trim()),
      rarity: safeString(item.rarity, 'common'),
      equippedIn: typeof item.equippedIn === 'string' ? item.equippedIn : null,
    }));
};

const normalizeEquipTarget = (value) => {
  if (value === null || value === undefined || value === '') return 'active';
  const normalized = optionalId(value);
  return normalized === null ? 'active' : normalized;
};

export const buildMarketplacePurchaseUpdate = ({ catalogItem, ownedItems, crystalBalance } = {}) => {
  if (!catalogItem) {
    return { error: 'Item not found in catalog', status: 404, updates: {}, data: null };
  }

  const owned = normalizeOwnedMarketplaceItems(ownedItems);
  if (owned.some((item) => item.id === catalogItem.id)) {
    return { error: 'Already owned', status: 409, updates: {}, data: null };
  }

  const balance = normalizeCrystalBalance(crystalBalance);
  if (balance < catalogItem.price) {
    return { error: 'Not enough crystals', status: 400, updates: {}, data: null };
  }

  const newItem = {
    id: catalogItem.id,
    type: catalogItem.type,
    name: catalogItem.name,
    rarity: catalogItem.rarity,
    equippedIn: null,
  };
  const newBalance = balance - catalogItem.price;
  const updatedOwned = [...owned, newItem];

  return {
    error: null,
    status: 200,
    updates: { ownedItems: updatedOwned, crystalBalance: newBalance },
    data: { item: newItem, crystalBalance: newBalance },
  };
};

export const buildMarketplaceEquipUpdate = ({ ownedItems, itemId, target } = {}) => {
  const safeItemId = normalizeMarketplaceItemId(itemId);
  if (!safeItemId) {
    return { error: 'itemId required', status: 400, updates: {}, data: null };
  }

  const safeTarget = normalizeEquipTarget(target);
  if (safeTarget === undefined) {
    return { error: 'Invalid equip target', status: 400, updates: {}, data: null };
  }

  const owned = normalizeOwnedMarketplaceItems(ownedItems);
  const idx = owned.findIndex((item) => item.id === safeItemId);
  if (idx === -1) {
    return { error: 'Item not owned', status: 404, updates: {}, data: null };
  }

  const updatedOwned = [...owned];
  updatedOwned[idx] = { ...updatedOwned[idx], equippedIn: safeTarget };
  return {
    error: null,
    status: 200,
    updates: { ownedItems: updatedOwned },
    data: { ownedItems: updatedOwned },
  };
};

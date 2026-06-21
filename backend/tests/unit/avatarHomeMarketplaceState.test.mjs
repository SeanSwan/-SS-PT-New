import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  buildMarketplaceEquipUpdate,
  buildMarketplacePurchaseUpdate,
  normalizeCrystalBalance,
  normalizeMarketplaceItemId,
  normalizeOwnedMarketplaceItems,
} from '../../utils/avatarHomeMarketplaceState.mjs';

const routeSource = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), '../../utils/avatarHomeMarketplaceRoutes.mjs'),
  'utf8'
);

const catalogItem = {
  id: 'crystal_bed',
  type: 'furniture',
  name: 'Crystalline Bed',
  rarity: 'epic',
  price: 500,
};

describe('avatarHomeMarketplaceState', () => {
  it('normalizes malformed owned item collections and balances', () => {
    expect(normalizeOwnedMarketplaceItems({ id: 'crystal_bed' })).toEqual([]);
    expect(normalizeOwnedMarketplaceItems([
      null,
      { id: 'crystal_bed', type: 'furniture', name: 'Crystalline Bed', rarity: 'epic', equippedIn: 12 },
    ])).toEqual([
      { id: 'crystal_bed', type: 'furniture', name: 'Crystalline Bed', rarity: 'epic', equippedIn: null },
    ]);

    expect(normalizeCrystalBalance({ amount: 999 })).toBe(0);
    expect(normalizeCrystalBalance(-4)).toBe(0);
    expect(normalizeCrystalBalance(42.9)).toBe(42);
  });

  it('validates marketplace item IDs before route lookup', () => {
    expect(normalizeMarketplaceItemId(' crystal_bed ')).toBe('crystal_bed');
    expect(normalizeMarketplaceItemId('')).toBe(null);
    expect(normalizeMarketplaceItemId({ id: 'crystal_bed' })).toBeUndefined();
    expect(normalizeMarketplaceItemId('x'.repeat(81))).toBeUndefined();
  });

  it('builds purchase updates from normalized state without persisting NaN', () => {
    expect(buildMarketplacePurchaseUpdate({
      catalogItem,
      ownedItems: { id: 'not-an-array' },
      crystalBalance: 650.8,
    })).toEqual({
      error: null,
      status: 200,
      data: {
        item: { id: 'crystal_bed', type: 'furniture', name: 'Crystalline Bed', rarity: 'epic', equippedIn: null },
        crystalBalance: 150,
      },
      updates: {
        ownedItems: [{ id: 'crystal_bed', type: 'furniture', name: 'Crystalline Bed', rarity: 'epic', equippedIn: null }],
        crystalBalance: 150,
      },
    });
  });

  it('returns safe purchase and equip errors for malformed state or target input', () => {
    expect(buildMarketplacePurchaseUpdate({
      catalogItem,
      ownedItems: [],
      crystalBalance: { amount: 900 },
    })).toMatchObject({ error: 'Not enough crystals', status: 400 });

    expect(buildMarketplaceEquipUpdate({
      ownedItems: { id: 'crystal_bed' },
      itemId: 'crystal_bed',
    })).toMatchObject({ error: 'Item not owned', status: 404 });

    expect(buildMarketplaceEquipUpdate({
      ownedItems: [{ id: 'crystal_bed' }],
      itemId: 'crystal_bed',
      target: { slot: 'bed' },
    })).toMatchObject({ error: 'Invalid equip target', status: 400 });
  });

  it('keeps the live marketplace routes wired through normalized state helpers', () => {
    expect(routeSource).toContain("from './avatarHomeMarketplaceState.mjs';");
    expect(routeSource).toContain('normalizeCrystalBalance(home.crystalBalance)');
    expect(routeSource).toContain('buildMarketplacePurchaseUpdate({');
    expect(routeSource).toContain('buildMarketplaceEquipUpdate({');
    expect(routeSource).not.toContain('const owned = home.ownedItems || [];');
    expect(routeSource).not.toContain('const owned = [...(home.ownedItems || [])];');
  });
});

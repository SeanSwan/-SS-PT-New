import { describe, expect, it } from 'vitest';
import { formatStorePrice, mapStorefrontItemToStoreItem } from './storeCatalog';

describe('storeCatalog mapper', () => {
  it('preserves physical product fields and sorted variants', () => {
    const item = mapStorefrontItemToStoreItem({
      id: 20,
      name: 'Buddy Fat Skin Recovery Drink',
      description: 'Fresh recovery drink',
      packageType: 'custom',
      price: '17.00',
      displayPrice: '17.00',
      itemKind: 'physical_product',
      isTaxable: true,
      fulfillmentType: 'local_delivery',
      stockQuantity: null,
      variants: [
        { id: 3, storefrontItemId: 20, label: 'Organic 1.5L', price: '24.00', displayOrder: 2 },
        { id: 2, storefrontItemId: 20, label: 'Everyday 16oz', price: '6.50', displayOrder: 1 },
      ],
    });

    expect(item.itemKind).toBe('physical_product');
    expect(item.packageType).toBe('custom');
    expect(item.isTaxable).toBe(true);
    expect(item.fulfillmentType).toBe('local_delivery');
    expect(item.variants.map((variant) => variant.label)).toEqual(['Everyday 16oz', 'Organic 1.5L']);
    expect(item.variants[0].price).toBe(6.5);
  });

  it('falls back to training-package semantics for unknown values', () => {
    const item = mapStorefrontItemToStoreItem({
      id: 21,
      name: 'Unknown',
      itemKind: 'subscription_box',
      fulfillmentType: 'teleport',
      packageType: 'surprise',
    });

    expect(item.itemKind).toBe('training_package');
    expect(item.fulfillmentType).toBe('none');
    expect(item.packageType).toBe('fixed');
    expect(item.variants).toEqual([]);
  });

  it('keeps only strict positive money values and preserves cents', () => {
    const item = mapStorefrontItemToStoreItem({
      id: 22,
      name: 'Truthful pricing',
      totalCost: '17.25',
      displayPrice: '17.25',
      pricePerSession: '17junk',
      variants: [
        { id: 1, label: 'Valid', price: '6.50' },
        { id: 2, label: 'Malformed', price: '6.50 USD' },
        { id: 3, label: 'Zero', price: 0 },
      ],
    });

    expect(item.displayPrice).toBe(17.25);
    expect(item.totalCost).toBe(17.25);
    expect(item.pricePerSession).toBeNull();
    expect(item.variants.map((variant) => variant.price)).toEqual([6.5, null, null]);
  });

  it('formats unavailable money honestly instead of inventing a free price', () => {
    expect(formatStorePrice(null)).toBe('Price unavailable');
    expect(formatStorePrice(undefined)).toBe('Price unavailable');
    expect(formatStorePrice(17.25)).toBe('$17.25');
  });

  it('does not recover a redacted canonical display price from another hidden field', () => {
    const item = mapStorefrontItemToStoreItem({ id: 23, name: 'Redacted', displayPrice: null, totalCost: '8400.00', price: '8400.00' });
    expect(item.displayPrice).toBeNull();
    expect(item.price).toBeNull();
  });

  it('normalizes malformed item and variant identities so they cannot authorize a cart write', () => {
    const item = mapStorefrontItemToStoreItem({
      id: '1.5',
      name: 'Malformed identity',
      displayPrice: '10.00',
      variants: [{ id: 0, storefrontItemId: 1, label: 'Broken', price: '2.00' }],
    });
    expect(item.id).toBe(0);
    expect(item.variants[0].id).toBe(0);
  });
});

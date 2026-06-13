import { describe, expect, it } from 'vitest';
import { mapStorefrontItemToStoreItem } from './storeCatalog';

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
});

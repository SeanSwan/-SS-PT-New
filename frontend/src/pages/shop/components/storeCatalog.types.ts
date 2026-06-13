/**
 * Storefront catalog contracts used by the public store UI.
 *
 * Keep this file data-only so StoreV3, StoreV2, package cards, and product cards
 * share one payload shape as commerce expands beyond training packages.
 */

export type StorePackageType = 'fixed' | 'monthly' | 'custom';
export type StoreItemKind = 'training_package' | 'physical_product';
export type StoreFulfillmentType = 'none' | 'dropship' | 'self_ship' | 'local_delivery' | 'pickup';

export interface ProductVariant {
  id: number;
  storefrontItemId: number;
  label: string;
  sku: string | null;
  price: number | null;
  stockQuantity: number | null;
  attributes: Record<string, unknown> | null;
  displayOrder: number;
  isActive: boolean;
}

export interface StoreItem {
  id: number;
  name: string;
  description: string;
  packageType: StorePackageType;
  pricePerSession?: number | null;
  sessions?: number | null;
  months?: number | null;
  sessionsPerWeek?: number | null;
  totalSessions?: number | null;
  price?: number | null;
  totalCost?: number | null;
  displayPrice: number;
  theme?: string;
  isActive: boolean;
  imageUrl: string | null;
  displayOrder?: number;
  includedFeatures?: string | null;
  itemKind: StoreItemKind;
  isTaxable: boolean;
  fulfillmentType: StoreFulfillmentType;
  stockQuantity: number | null;
  variants: ProductVariant[];
  activeSpecial?: {
    id: number;
    name: string;
    bonusSessions: number;
    bonusDuration?: number;
    endsAt: string;
  };
}

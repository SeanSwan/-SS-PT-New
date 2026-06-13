import type {
  ProductVariant,
  StoreFulfillmentType,
  StoreItem,
  StoreItemKind,
  StorePackageType,
} from './storeCatalog.types';

const PACKAGE_TYPES = new Set<StorePackageType>(['fixed', 'monthly', 'custom']);
const ITEM_KINDS = new Set<StoreItemKind>(['training_package', 'physical_product']);
const FULFILLMENT_TYPES = new Set<StoreFulfillmentType>([
  'none',
  'dropship',
  'self_ship',
  'local_delivery',
  'pickup',
]);
const EMPTY_NUMBER_VALUES: unknown[] = [null, undefined, ''];
type CatalogRecord = Record<string, unknown>;

export const formatStorePrice = (price: number | null | undefined): string => {
  const normalizedPrice = typeof price === 'number' && Number.isFinite(price) ? price : 0;
  const fractionDigits = Number.isInteger(normalizedPrice) ? 0 : 2;

  return normalizedPrice.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
};

const toNumber = (value: unknown, fallback = 0): number => {
  const parsed = typeof value === 'number' ? value : Number.parseFloat(String(value ?? ''));
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toNullableNumber = (value: unknown): number | null => {
  if (EMPTY_NUMBER_VALUES.includes(value)) return null;
  const parsed = typeof value === 'number' ? value : Number.parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : null;
};

const toRecord = (value: unknown): CatalogRecord => (
  value && typeof value === 'object' ? value as CatalogRecord : {}
);

const toStringValue = (value: unknown, fallback: string): string => (
  value ? String(value) : fallback
);

const toNullableString = (value: unknown): string | null => (
  value ? String(value) : null
);

const toAttributes = (value: unknown): Record<string, unknown> | null => (
  value && typeof value === 'object' ? value as Record<string, unknown> : null
);

const toPackageType = (value: unknown): StorePackageType => (
  PACKAGE_TYPES.has(value as StorePackageType) ? value as StorePackageType : 'fixed'
);

const toItemKind = (value: unknown): StoreItemKind => (
  ITEM_KINDS.has(value as StoreItemKind) ? value as StoreItemKind : 'training_package'
);

const toFulfillmentType = (value: unknown): StoreFulfillmentType => (
  FULFILLMENT_TYPES.has(value as StoreFulfillmentType) ? value as StoreFulfillmentType : 'none'
);

const mapVariant = (variant: unknown): ProductVariant => {
  const record = toRecord(variant);

  return {
    id: toNumber(record.id),
    storefrontItemId: toNumber(record.storefrontItemId),
    label: toStringValue(record.label, 'Variant'),
    sku: toNullableString(record.sku),
    price: toNullableNumber(record.price),
    stockQuantity: toNullableNumber(record.stockQuantity),
    attributes: toAttributes(record.attributes),
    displayOrder: toNumber(record.displayOrder),
    isActive: record.isActive !== false,
  };
};

const sortVariants = (left: ProductVariant, right: ProductVariant): number => (
  (left.displayOrder - right.displayOrder) || (left.id - right.id)
);

const mapVariants = (variants: unknown): ProductVariant[] => (
  Array.isArray(variants) ? variants.map(mapVariant).sort(sortVariants) : []
);

export const mapStorefrontItemToStoreItem = (pkg: any, fallbackTheme = 'purple'): StoreItem => {
  const price = toNumber(pkg?.totalCost ?? pkg?.price);
  const displayPrice = toNumber(pkg?.displayPrice ?? pkg?.totalCost ?? pkg?.price);
  const displayOrder = toNumber(pkg?.displayOrder ?? pkg?.id);

  return {
    id: toNumber(pkg?.id),
    name: String(pkg?.name || 'Store item'),
    description: String(pkg?.description || ''),
    packageType: toPackageType(pkg?.packageType),
    sessions: toNullableNumber(pkg?.sessions),
    months: toNullableNumber(pkg?.months),
    sessionsPerWeek: toNullableNumber(pkg?.sessionsPerWeek),
    totalSessions: toNullableNumber(pkg?.totalSessions ?? pkg?.sessions),
    pricePerSession: toNullableNumber(pkg?.pricePerSession),
    price,
    totalCost: toNullableNumber(pkg?.totalCost),
    displayPrice,
    imageUrl: pkg?.imageUrl || (pkg?.id ? `/assets/images/package-${pkg.id}.jpg` : null),
    theme: pkg?.theme || fallbackTheme,
    isActive: pkg?.isActive !== false,
    displayOrder,
    includedFeatures: pkg?.includedFeatures || null,
    itemKind: toItemKind(pkg?.itemKind),
    isTaxable: pkg?.isTaxable === true,
    fulfillmentType: toFulfillmentType(pkg?.fulfillmentType),
    stockQuantity: toNullableNumber(pkg?.stockQuantity),
    variants: mapVariants(pkg?.variants),
  };
};

export const isPhysicalProduct = (item: StoreItem): boolean => item.itemKind === 'physical_product';

export const hasTrackedStock = (stockQuantity: number | null | undefined): boolean => (
  typeof stockQuantity === 'number'
);

export const hasStockAvailable = (stockQuantity: number | null | undefined): boolean => (
  !hasTrackedStock(stockQuantity) || Number(stockQuantity) > 0
);

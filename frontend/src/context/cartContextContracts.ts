import { isAxiosError } from 'axios';

type CartStatus = 'active' | 'pending_payment' | 'completed' | 'cancelled';

interface CartProductVariant {
  id: number;
  label: string;
  sku?: string | null;
  price?: number | null;
  stockQuantity?: number | null;
  attributes?: Record<string, unknown> | null;
}

interface CartStorefrontItem {
  name: string;
  description?: string;
  imageUrl?: string;
  type?: string;
  sessions?: number;
  totalSessions?: number;
  packageType?: string;
  itemKind?: string;
  isTaxable?: boolean;
  fulfillmentType?: string;
}

interface CartItem {
  id: number;
  name?: string;
  packageName?: string;
  quantity: number;
  price: number;
  storefrontItemId: number;
  productVariantId?: number | null;
  productVariant?: CartProductVariant | null;
  storefrontItem?: CartStorefrontItem | null;
}

export interface Cart {
  id: number;
  status: CartStatus;
  items: CartItem[];
  total: number;
  totalSessions: number;
  itemCount: number;
  userRoleUpgrade?: boolean;
}

export interface AddToCartPayload {
  id?: number | string;
  storefrontItemId?: number | string;
  name?: string;
  price?: number;
  quantity?: number;
  productVariantId?: number | string | null;
  sessionCount?: number;
  packageType?: string;
  totalSessions?: number;
  timestamp?: number;
}

export interface CartContextType {
  cart: Cart | null;
  loading: boolean;
  error: string | null;
  showCart: boolean;
  addToCart: (itemData: AddToCartPayload) => Promise<void>;
  updateQuantity: (itemId: number, quantity: number) => Promise<void>;
  removeItem: (itemId: number) => Promise<void>;
  clearCart: () => Promise<void>;
  toggleCart: () => void;
  hideCart: () => void;
  fetchCart: () => Promise<void>;
  refreshCart: () => void;
}

type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const readString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() ? value : undefined;

const parseNonNegativeNumber = (value: unknown): number | null => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
};

const parseOptionalNonNegativeNumber = (value: unknown): number | null | undefined => {
  if (value === null) return null;
  if (value === undefined) return undefined;
  return parseNonNegativeNumber(value) ?? undefined;
};

export const parsePositiveCartInteger = (value: unknown): number | null => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
};

const parseNonNegativeInteger = (value: unknown): number | null => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
};

const normalizeProductVariant = (value: unknown): CartProductVariant | null => {
  if (!isRecord(value)) return null;
  const id = parsePositiveCartInteger(value.id);
  const label = readString(value.label);
  if (!id || !label) return null;

  return {
    id,
    label,
    sku: readString(value.sku) ?? null,
    price: parseOptionalNonNegativeNumber(value.price),
    stockQuantity: parseOptionalNonNegativeNumber(value.stockQuantity),
    attributes: isRecord(value.attributes) ? value.attributes : null,
  };
};

const normalizeStorefrontItem = (value: unknown): CartStorefrontItem | null => {
  if (!isRecord(value)) return null;
  const name = readString(value.name);
  if (!name) return null;

  return {
    name,
    description: readString(value.description),
    imageUrl: readString(value.imageUrl),
    type: readString(value.type),
    sessions: parseOptionalNonNegativeNumber(value.sessions) ?? undefined,
    totalSessions: parseOptionalNonNegativeNumber(value.totalSessions) ?? undefined,
    packageType: readString(value.packageType),
    itemKind: readString(value.itemKind),
    isTaxable: typeof value.isTaxable === 'boolean' ? value.isTaxable : undefined,
    fulfillmentType: readString(value.fulfillmentType),
  };
};

const normalizeCartItem = (value: unknown): CartItem | null => {
  if (!isRecord(value)) return null;
  const id = parsePositiveCartInteger(value.id);
  const quantity = parsePositiveCartInteger(value.quantity);
  const price = parseNonNegativeNumber(value.price);
  const storefrontItemId = parsePositiveCartInteger(value.storefrontItemId);
  if (!id || !quantity || price === null || !storefrontItemId) return null;

  let productVariantId: number | null = null;
  if (value.productVariantId !== null && value.productVariantId !== undefined) {
    productVariantId = parsePositiveCartInteger(value.productVariantId);
    if (!productVariantId) return null;
  }

  const productVariant = value.productVariant == null
    ? null
    : normalizeProductVariant(value.productVariant);
  const storefrontItem = value.storefrontItem == null
    ? null
    : normalizeStorefrontItem(value.storefrontItem);
  if (value.productVariant != null && !productVariant) return null;
  if (value.storefrontItem != null && !storefrontItem) return null;

  return {
    id,
    name: readString(value.name),
    packageName: readString(value.packageName),
    quantity,
    price,
    storefrontItemId,
    productVariantId,
    productVariant,
    storefrontItem,
  };
};

const isCartStatus = (value: unknown): value is CartStatus =>
  value === 'active' || value === 'pending_payment' || value === 'completed' || value === 'cancelled';

export const normalizeCartResponse = (payload: unknown, previous?: Cart | null): Cart | null => {
  if (!isRecord(payload) || !Array.isArray(payload.items)) return null;

  const id = parsePositiveCartInteger(payload.id) ?? previous?.id ?? null;
  const status = isCartStatus(payload.status) ? payload.status : previous?.status;
  const total = parseNonNegativeNumber(payload.total ?? previous?.total);
  const totalSessions = parseNonNegativeInteger(payload.totalSessions ?? previous?.totalSessions ?? 0);
  const items = payload.items.map(normalizeCartItem);

  if (!id || !status || total === null || totalSessions === null || items.some((item) => item === null)) {
    return null;
  }

  return {
    id,
    status,
    items: items as CartItem[],
    total,
    totalSessions,
    itemCount: items.length,
    userRoleUpgrade: typeof payload.userRoleUpgrade === 'boolean' ? payload.userRoleUpgrade : undefined,
  };
};

export const getCartErrorMessage = (error: unknown, fallback: string): string => {
  if (isAxiosError(error)) {
    if (isRecord(error.response?.data)) {
      // Server-authored copy is written for humans — e.g. the cart quantity
      // ceiling explains the limit and points at a person.
      const serverMessage = readString(error.response.data.message);
      if (serverMessage) return serverMessage;
    }

    // Deliberately does NOT fall through to error.message for transport
    // failures: axios yields "Request failed with status code 500", "Network
    // Error", "timeout of 30000ms exceeded". Those render straight into the
    // cart panel (ShoppingCart StatusMessage) and tell a buyer nothing they can
    // act on. Same defect class already fixed on the checkout and success
    // screens; the cart was the surface still leaking it.
    return fallback;
  }

  // A plain Error thrown by our own code carries intentional, user-facing copy
  // (e.g. "Please login to add items to cart") — that one should still show.
  return error instanceof Error && error.message.trim() ? error.message : fallback;
};

export const getCartErrorStatus = (error: unknown): number | null =>
  isAxiosError(error) && typeof error.response?.status === 'number' ? error.response.status : null;

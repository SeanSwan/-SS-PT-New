/**
 * FILE: CheckoutView.logic.ts
 * PURPOSE: Data-truth checkout math and non-PII fulfillment summaries.
 * LAST VALIDATED: 2026-06-13 via CheckoutView.logic.test.ts.
 */

type CheckoutCartItem = {
  price?: number | string | null;
  quantity?: number | string | null;
  productVariantId?: number | string | null;
  storefrontItem?: {
    itemKind?: string | null;
    isTaxable?: boolean | null;
    sessions?: number | string | null;
    totalSessions?: number | string | null;
    fulfillmentType?: string | null;
  } | null;
};

export type CheckoutFulfillmentIntent = {
  required: boolean;
  mode: CheckoutFulfillmentMode;
  itemCount: number;
  fulfillmentTypes: string[];
  summary: string;
  details?: CheckoutFulfillmentDetails;
};

export type CheckoutFulfillmentMode = 'none' | 'local_delivery' | 'pickup' | 'local_delivery_or_pickup';

export type CheckoutTaxMode = 'not_applicable' | 'stripe_automatic_tax';

export type CheckoutFulfillmentDetails = {
  mode: Exclude<CheckoutFulfillmentMode, 'none'>;
  recipientName: string;
  phone: string;
  streetAddress: string;
  city: string;
  state: string;
  postalCode: string;
  pickupWindow: string;
  notes: string;
};

const toNumber = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const roundMoney = (value: number): number => (
  Number(value.toFixed(2))
);

const isPhysicalProduct = (item: CheckoutCartItem): boolean => (
  item.storefrontItem?.itemKind === 'physical_product' || Boolean(item.productVariantId)
);

const isTaxablePhysicalProduct = (item: CheckoutCartItem): boolean => (
  isPhysicalProduct(item) && item.storefrontItem?.isTaxable === true
);

const defaultFulfillmentMode = (fulfillmentTypes: string[]): Exclude<CheckoutFulfillmentMode, 'none'> => {
  if (fulfillmentTypes.includes('local_delivery')) return 'local_delivery';
  if (fulfillmentTypes.includes('pickup')) return 'pickup';
  return 'local_delivery_or_pickup';
};

const hasText = (value: string | null | undefined): boolean => Boolean(value?.trim());

export const calculateCheckoutTotals = (cartItems: CheckoutCartItem[] = []) => {
  const subtotal = roundMoney(cartItems.reduce((sum, item) => (
    sum + (toNumber(item.price) * toNumber(item.quantity || 0))
  ), 0));

  const taxableProductSubtotal = roundMoney(cartItems.reduce((sum, item) => (
    isTaxablePhysicalProduct(item)
      ? sum + (toNumber(item.price) * toNumber(item.quantity || 0))
      : sum
  ), 0));

  const usesStripeTax = taxableProductSubtotal > 0;
  const tax = usesStripeTax ? null : 0;
  const total = subtotal;
  const sessionCount = cartItems.reduce((sum, item) => {
    const sessions = toNumber(item.storefrontItem?.sessions || item.storefrontItem?.totalSessions);
    return sum + (sessions * toNumber(item.quantity || 0));
  }, 0);

  return {
    subtotal,
    taxableProductSubtotal,
    tax,
    taxMode: usesStripeTax ? 'stripe_automatic_tax' as CheckoutTaxMode : 'not_applicable' as CheckoutTaxMode,
    taxLabel: usesStripeTax ? 'Calculated by Stripe at payment' : 'Not applicable',
    total,
    sessionCount,
  };
};

export const buildCheckoutFulfillmentIntent = (
  cartItems: CheckoutCartItem[] = []
): CheckoutFulfillmentIntent => {
  const physicalItems = cartItems.filter(isPhysicalProduct);
  if (!physicalItems.length) {
    return {
      required: false,
      mode: 'none',
      itemCount: 0,
      fulfillmentTypes: [],
      summary: 'No product fulfillment required.',
    };
  }

  const fulfillmentTypes = Array.from(new Set(
    physicalItems
      .map((item) => item.storefrontItem?.fulfillmentType || 'local_delivery')
      .filter(Boolean)
  )).sort();
  const productWord = physicalItems.length === 1 ? 'product' : 'products';

  return {
    required: true,
    mode: defaultFulfillmentMode(fulfillmentTypes),
    itemCount: physicalItems.length,
    fulfillmentTypes,
    summary: `Local delivery / pickup coordination required for ${physicalItems.length} ${productWord}.`,
  };
};

export const createDefaultFulfillmentDetails = (
  seed: Partial<CheckoutFulfillmentDetails> = {}
): CheckoutFulfillmentDetails => ({
  mode: seed.mode || 'local_delivery',
  recipientName: seed.recipientName || '',
  phone: seed.phone || '',
  streetAddress: seed.streetAddress || '',
  city: seed.city || '',
  state: seed.state || '',
  postalCode: seed.postalCode || '',
  pickupWindow: seed.pickupWindow || '',
  notes: seed.notes || '',
});

export const mergeCheckoutFulfillmentDetails = (
  intent: CheckoutFulfillmentIntent,
  details: CheckoutFulfillmentDetails
): CheckoutFulfillmentIntent => {
  if (!intent.required) return intent;
  return {
    ...intent,
    mode: details.mode,
    details,
  };
};

export const validateCheckoutFulfillment = (intent: CheckoutFulfillmentIntent): string | null => {
  if (!intent.required) return null;
  const details = intent.details;
  if (!details) return 'Delivery or pickup details are required before checkout.';
  if (!hasText(details.recipientName)) return 'Recipient name is required before checkout.';
  if (!hasText(details.phone)) return 'Fulfillment phone number is required before checkout.';
  if (details.mode === 'pickup') {
    return hasText(details.pickupWindow) ? null : 'Pickup window is required before checkout.';
  }
  return hasText(details.streetAddress)
    && hasText(details.city)
    && hasText(details.state)
    && hasText(details.postalCode)
    ? null
    : 'Delivery address is required before checkout.';
};

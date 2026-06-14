/**
 * checkoutFulfillmentIntentService.mjs
 * ============================================================
 * Validates physical-product delivery/pickup requirements before Stripe
 * checkout. This keeps fulfillment truth server-side instead of relying on the
 * browser's checkout form validation.
 */

export const FULFILLMENT_DETAILS_REQUIRED_CODE = 'FULFILLMENT_DETAILS_REQUIRED';
const FULFILLMENT_DETAILS_REQUIRED_MESSAGE =
  'Delivery address or pickup mode is required for physical product checkout.';
const DEFAULT_FULFILLMENT_MODE = 'local_delivery_or_pickup';
const FULFILLMENT_MODE_BY_VALUE = new Map([
  ['local_delivery', 'local_delivery'],
  ['pickup', 'pickup'],
  [DEFAULT_FULFILLMENT_MODE, DEFAULT_FULFILLMENT_MODE],
]);

const isPhysicalProductLine = (item) => (
  item?.storefrontItem?.itemKind === 'physical_product' || Boolean(item?.productVariantId)
);

const safeFulfillmentText = (value, max = 160) => (
  typeof value === 'string' ? value.trim().slice(0, max) : ''
);

const normalizeFulfillmentDetails = (details = {}, mode = 'local_delivery_or_pickup') => ({
  mode,
  recipientName: safeFulfillmentText(details.recipientName, 120),
  phone: safeFulfillmentText(details.phone, 40),
  streetAddress: safeFulfillmentText(details.streetAddress, 160),
  city: safeFulfillmentText(details.city, 80),
  state: safeFulfillmentText(details.state, 40),
  postalCode: safeFulfillmentText(details.postalCode, 24),
  pickupWindow: safeFulfillmentText(details.pickupWindow, 120),
  notes: safeFulfillmentText(details.notes, 240),
});

const resolveFulfillmentMode = (fulfillmentIntent = {}) => {
  const requestedModes = [fulfillmentIntent?.details?.mode, fulfillmentIntent?.mode];
  const validMode = requestedModes.find((mode) => FULFILLMENT_MODE_BY_VALUE.has(mode));
  return validMode || DEFAULT_FULFILLMENT_MODE;
};

const resolveFulfillmentTypes = (physicalItems) => Array.from(new Set(
  physicalItems
    .map((item) => item?.storefrontItem?.fulfillmentType || 'local_delivery')
    .filter(Boolean)
)).sort();

export function normalizeCheckoutFulfillmentIntent(fulfillmentIntent, cartItems = []) {
  const physicalItems = (cartItems || []).filter(isPhysicalProductLine);
  if (!physicalItems.length) {
    return {
      required: false,
      mode: 'none',
      itemCount: 0,
      fulfillmentTypes: [],
    };
  }

  const mode = resolveFulfillmentMode(fulfillmentIntent);

  return {
    required: true,
    mode,
    itemCount: physicalItems.length,
    fulfillmentTypes: resolveFulfillmentTypes(physicalItems),
    details: normalizeFulfillmentDetails(fulfillmentIntent?.details, mode),
  };
}

const hasDeliveryAddress = (details = {}) => (
  Boolean(details.streetAddress)
  && Boolean(details.city)
  && Boolean(details.state)
  && Boolean(details.postalCode)
);

const allowFulfillmentIntent = () => null;

const requireDeliveryAddress = (intent) => (
  hasDeliveryAddress(intent?.details) ? null : FULFILLMENT_DETAILS_REQUIRED_MESSAGE
);

const FULFILLMENT_VALIDATORS = new Map([
  ['pickup', allowFulfillmentIntent],
  ['local_delivery', requireDeliveryAddress],
  [DEFAULT_FULFILLMENT_MODE, requireDeliveryAddress],
]);

const getFulfillmentValidator = (intent) => {
  if (!intent?.required) return null;
  return FULFILLMENT_VALIDATORS.get(intent.mode) || requireDeliveryAddress;
};

export function validateCheckoutFulfillmentIntent(intent) {
  const validator = getFulfillmentValidator(intent);
  return validator ? validator(intent) : null;
}

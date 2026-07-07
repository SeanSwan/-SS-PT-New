// backend/services/print/prodigiConfig.mjs
// ─────────────────────────────────────────────────────────────────────────────
// Slice 3c — Prodigi drop-ship configuration.
//
// FLAG-OFF SCAFFOLD: default OFF. Nothing calls Prodigi until Sean:
//   1. creates a Prodigi account + gets an API key,
//   2. sets PRODIGI_API_KEY (+ PRODIGI_WEBHOOK_SECRET) in env,
//   3. fills the real SKUs in PRODIGI_SKU_MAP below (from the Prodigi catalog),
//   4. flips PRINT_FULFILLMENT_PRODIGI_ENABLED=true (sandbox first, PRODIGI_ENV=live later).
// While OFF, paid print orders sit at status='paid', visible for manual/admin fulfillment.
// ─────────────────────────────────────────────────────────────────────────────

/** Master kill-switch for automated Prodigi fulfillment. Default OFF. */
export function isProdigiFulfillmentEnabled() {
  return process.env.PRINT_FULFILLMENT_PRODIGI_ENABLED === 'true';
}

/** Sandbox by default; set PRODIGI_ENV=live only after sandbox verification. */
export function prodigiBaseUrl() {
  return process.env.PRODIGI_ENV === 'live'
    ? 'https://api.prodigi.com/v4.0'
    : 'https://api.sandbox.prodigi.com/v4.0';
}

/** Prodigi API key (env only — never repo, never logged). */
export function prodigiApiKey() {
  return process.env.PRODIGI_API_KEY || '';
}

/** Shared secret Prodigi includes on its status callbacks (set in the Prodigi dashboard). */
export function prodigiWebhookSecret() {
  return process.env.PRODIGI_WEBHOOK_SECRET || '';
}

/** Default Prodigi shipping method. Budget|Standard|Express|Overnight. */
export function prodigiShippingMethod() {
  return process.env.PRODIGI_SHIPPING_METHOD || 'Standard';
}

/**
 * SKU map — PLACEHOLDERS keyed to the real PRINT_PRODUCTS combos (galleryRoutes.mjs).
 * TODO(Sean, before go-live): replace every REPLACE_ME_* with the real Prodigi SKU
 * from your Prodigi product catalog — https://www.prodigi.com/print-api/products/.
 * Any unmapped combo fails closed (order stays 'paid', admin alerted) — never a wrong print.
 */
const PRODIGI_SKU_MAP = {
  'print:8x10': 'REPLACE_ME_PRINT_8X10',
  'print:11x14': 'REPLACE_ME_PRINT_11X14',
  'print:16x20': 'REPLACE_ME_PRINT_16X20',
  'print:24x36': 'REPLACE_ME_PRINT_24X36',
  'canvas:12x16': 'REPLACE_ME_CANVAS_12X16',
  'canvas:16x20': 'REPLACE_ME_CANVAS_16X20',
  'canvas:24x36': 'REPLACE_ME_CANVAS_24X36',
  'metal:8x10': 'REPLACE_ME_METAL_8X10',
  'metal:12x16': 'REPLACE_ME_METAL_12X16',
  'metal:16x20': 'REPLACE_ME_METAL_16X20',
  'metal:24x36': 'REPLACE_ME_METAL_24X36',
  'poster:12x18': 'REPLACE_ME_POSTER_12X18',
  'poster:18x24': 'REPLACE_ME_POSTER_18X24',
  'poster:24x36': 'REPLACE_ME_POSTER_24X36',
  'photobook:8x8': 'REPLACE_ME_PHOTOBOOK_8X8',
  'photobook:10x10': 'REPLACE_ME_PHOTOBOOK_10X10',
  'photobook:12x12': 'REPLACE_ME_PHOTOBOOK_12X12',
};

/** Resolve a Prodigi SKU for a product/size, or null (unmapped → fail closed). */
export function resolveProdigiSku(productType, size) {
  const sku = PRODIGI_SKU_MAP[`${productType}:${size}`];
  // A still-placeholder SKU counts as unmapped so a mis-config never ships wrong.
  if (!sku || sku.startsWith('REPLACE_ME')) return null;
  return sku;
}

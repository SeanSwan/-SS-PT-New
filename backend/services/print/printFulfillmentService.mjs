// backend/services/print/printFulfillmentService.mjs
// ─────────────────────────────────────────────────────────────────────────────
// Slice 3c — Prodigi drop-ship fulfillment (the money-path core).
//
// submitToProvider(): called on a PAID order (from the Stripe webhook, flag-gated,
// or an admin retry). Fail-closed: any precondition miss keeps the order 'paid'
// and alerts an admin — never a wrong/blank print. Double-submit is prevented at
// TWO layers: an atomic DB claim (paid → processing) AND a Prodigi Idempotency-Key.
//
// applyProviderStatus(): called from the Prodigi status webhook → idempotently
// advances processing → shipped + tracking.
// ─────────────────────────────────────────────────────────────────────────────
import sequelize from '../../database.mjs';
import PrintOrder from '../../models/PrintOrder.mjs';
import GalleryPhoto from '../../models/GalleryPhoto.mjs';
import logger from '../../utils/logger.mjs';
import { sendNotification } from '../notificationService.mjs';
import { generateGalleryOriginalUrl } from '../r2StorageService.mjs';
import { isProdigiFulfillmentEnabled, resolveProdigiSku, prodigiShippingMethod } from './prodigiConfig.mjs';
import { createProdigiOrder, getProdigiOrder } from './prodigiClient.mjs';

/** Normalize the stored shippingAddress (Stripe shipping_details shape) or null. */
function normalizeShipping(shippingAddress) {
  const a = shippingAddress?.address || shippingAddress || null;
  if (!a || !a.line1 || !a.country || !(a.postal_code || a.postalOrZipCode)) return null;
  return {
    name: shippingAddress?.name || shippingAddress?.recipientName || 'Recipient',
    line1: a.line1,
    line2: a.line2 || null,
    townOrCity: a.city || a.townOrCity || '',
    stateOrCounty: a.state || a.stateOrCounty || null,
    postalOrZipCode: a.postal_code || a.postalOrZipCode,
    countryCode: a.country || a.countryCode,
  };
}

function mapRecipient(s) {
  return {
    name: s.name,
    address: {
      line1: s.line1,
      line2: s.line2 || undefined,
      townOrCity: s.townOrCity,
      stateOrCounty: s.stateOrCounty || undefined,
      postalOrZipCode: s.postalOrZipCode,
      countryCode: s.countryCode,
    },
  };
}

async function alertAdmin(order, message) {
  try {
    await sendNotification({
      type: 'ADMIN_NOTIFICATION',
      title: 'Print Fulfillment Needs Attention',
      message: `Print order #${order.id}: ${message}`,
      data: { type: 'print_fulfillment_issue', orderId: order.id, timestamp: new Date().toISOString() },
      recipients: ['admin'],
    });
  } catch (e) {
    logger.warn('[Print Fulfillment] admin alert failed: %s', e.message);
  }
}

async function failClosed(order, reason, detail = '') {
  logger.error('[Print Fulfillment] order %d NOT submitted (%s%s) — stays paid', order.id, reason, detail ? `: ${detail}` : '');
  await alertAdmin(order, `not fulfilled — ${reason}${detail ? ` (${detail})` : ''}. Order held at 'paid' for review.`);
  return { ok: false, failClosed: reason };
}

async function revertToPaid(id) {
  await sequelize.query(
    `UPDATE print_orders SET status='paid', updated_at=NOW()
     WHERE id=:id AND status='processing' AND print_provider_order_id IS NULL`,
    { replacements: { id } }
  );
}

/** Extract provider id + status + tracking from a Prodigi order body (defensive; shape TODO-live). */
export function extractProviderStatus(orderBody) {
  const o = orderBody?.order || orderBody || {};
  return {
    providerOrderId: o.id ? String(o.id) : (orderBody?.orderId ? String(orderBody.orderId) : null),
    prodigiStatus: o.status?.stage || o.status || orderBody?.status || '',
    trackingNumber: o.shipments?.[0]?.tracking?.number || orderBody?.trackingNumber || null,
  };
}

/** Best-effort: pull the current Prodigi status for an order and apply it locally. */
async function reconcileFromProvider(providerOrderId) {
  try {
    const r = await getProdigiOrder(providerOrderId);
    if (!r.ok) return { ok: false, error: r.error };
    const { prodigiStatus, trackingNumber } = extractProviderStatus(r.body);
    return applyProviderStatus({ providerOrderId, prodigiStatus, trackingNumber });
  } catch (e) {
    logger.warn('[Print Fulfillment] reconcile %s failed: %s', providerOrderId, e.message);
    return { ok: false, error: e.message };
  }
}

/**
 * Submit a paid print order to Prodigi. Idempotent + fail-closed.
 * @returns {Promise<{ok:boolean, providerOrderId?:string, skipped?:string, failClosed?:string, error?:string}>}
 */
export async function submitToProvider(orderId, { source = 'webhook' } = {}) {
  if (!isProdigiFulfillmentEnabled()) return { ok: false, skipped: 'fulfillment_disabled' };

  const order = await PrintOrder.findByPk(orderId);
  if (!order) return { ok: false, error: 'order_not_found' };
  if (order.printProviderOrderId) {
    // Already at Prodigi — a retry becomes a status SYNC (catches a shipped state that
    // arrived while we were down, or that no callback delivered).
    await reconcileFromProvider(order.printProviderOrderId);
    return { ok: true, alreadySubmitted: true, providerOrderId: order.printProviderOrderId };
  }
  // 'paid' = normal; 'processing' = recover a stuck order (crash mid-submit, no provider id).
  // The Prodigi Idempotency-Key makes a re-submit safe (Prodigi dedupes on the same key).
  if (order.status !== 'paid' && order.status !== 'processing') {
    return { ok: false, error: `not_fulfillable (status=${order.status})` };
  }

  // Preconditions — fail closed (never claim, order stays 'paid').
  const sku = resolveProdigiSku(order.productType, order.size);
  if (!sku) return failClosed(order, 'no_sku_mapping', `${order.productType}:${order.size}`);

  const shipping = normalizeShipping(order.shippingAddress);
  if (!shipping) return failClosed(order, 'no_shipping_address');

  const photo = await GalleryPhoto.findByPk(order.photoId);
  if (!photo || !photo.originalStorageKey) return failClosed(order, 'no_print_master');

  // ATOMIC + EXCLUSIVE claim. A 'paid' order claims immediately; a 'processing' order is
  // only RE-claimed once it is genuinely STUCK (>5 min stale) — so two concurrent submits
  // can't both claim (the second sees a fresh 'processing' row, matches 0 rows, and skips).
  // The 5-min window recovers a crash-stranded order without opening a live double-submit.
  const [claimed] = await sequelize.query(
    `UPDATE print_orders SET status='processing', updated_at=NOW()
     WHERE id=:id AND print_provider_order_id IS NULL
       AND (status='paid' OR (status='processing' AND updated_at < NOW() - INTERVAL '5 minutes'))
     RETURNING id`,
    { replacements: { id: order.id }, type: sequelize.QueryTypes.SELECT }
  );
  if (!claimed) return { ok: true, alreadyClaimed: true };

  try {
    const assetUrl = await generateGalleryOriginalUrl(photo.originalStorageKey, { expiresInSeconds: 3600 });
    const payload = {
      shippingMethod: prodigiShippingMethod(),
      recipient: mapRecipient(shipping),
      items: [{
        sku,
        copies: order.quantity || 1,
        // TODO(live): honor order.cropData once the crop UI (3f) ships — 'fillPrintArea'
        // center-crops to the SKU aspect ratio, which may differ from a customer's crop.
        sizing: 'fillPrintArea',
        assets: [{ printArea: 'default', url: assetUrl }],
      }],
      metadata: { swanPrintOrderId: order.id },
    };
    const result = await createProdigiOrder(payload, { idempotencyKey: order.idempotencyKey || `swan-print-${order.id}` });

    if (!result.ok) {
      // Prodigi rejected / never created it → safe to retry from 'paid'.
      await revertToPaid(order.id);
      await alertAdmin(order, `Prodigi submit failed: ${result.error}`);
      return { ok: false, error: result.error };
    }

    // Prodigi ACCEPTED the order. Persist the provider id. If THIS write fails we must NOT
    // revert (Prodigi has the physical order) — leave it 'processing' + loud alert; the
    // recovery path (re-claim from 'processing' + same Idempotency-Key) backfills it safely.
    try {
      await sequelize.query(
        `UPDATE print_orders SET print_provider_order_id=:pid, updated_at=NOW() WHERE id=:id`,
        { replacements: { pid: result.providerOrderId, id: order.id } }
      );
    } catch (writeErr) {
      logger.error('[Print Fulfillment] order %d: Prodigi order %s CREATED but provider-id save failed: %s', order.id, result.providerOrderId, writeErr.message);
      await alertAdmin(order, `Prodigi order ${result.providerOrderId} created but its id failed to save — reconcile (order held at 'processing', do NOT re-charge).`);
      return { ok: false, error: 'provider_id_write_failed', providerOrderId: result.providerOrderId };
    }

    // If Prodigi's create response already reflects a shipped/complete state (e.g. an
    // idempotent hit on an order that shipped while we were stuck), sync it now.
    const synced = extractProviderStatus(result.body);
    if (synced.prodigiStatus) {
      await applyProviderStatus({ providerOrderId: result.providerOrderId, prodigiStatus: synced.prodigiStatus, trackingNumber: synced.trackingNumber });
    }

    logger.info('[Print Fulfillment] order %d submitted to Prodigi %s (via %s)', order.id, result.providerOrderId, source);
    return { ok: true, providerOrderId: result.providerOrderId };
  } catch (err) {
    // Error before/around the Prodigi call (e.g. asset URL). Prodigi has nothing → revert to
    // 'paid' (retryable). If Prodigi somehow did receive it, the Idempotency-Key dedupes.
    await revertToPaid(order.id);
    await alertAdmin(order, `Prodigi submit error: ${err.message}`);
    logger.error('[Print Fulfillment] order %d submit threw: %s', order.id, err.message);
    return { ok: false, error: err.message };
  }
}

// TODO(live): confirm Prodigi's exact status vocabulary against their docs when the
// account exists. v1 treats these tokens as "shipped".
function isShippedStatus(status) {
  return /shipped|dispatched|complete/i.test(String(status || ''));
}

/**
 * Apply an inbound Prodigi status update. Idempotent advance to shipped + tracking.
 */
export async function applyProviderStatus({ providerOrderId, prodigiStatus, trackingNumber }) {
  if (!providerOrderId) return { ok: false, error: 'missing_provider_order_id' };

  if (!isShippedStatus(prodigiStatus)) {
    logger.info('[Print Fulfillment] Prodigi status "%s" for %s (no state change)', prodigiStatus, providerOrderId);
    return { ok: true, noChange: true };
  }

  const [row] = await sequelize.query(
    `UPDATE print_orders SET status='shipped', tracking_number=:tn, shipped_at=NOW(), updated_at=NOW()
     WHERE print_provider_order_id=:pid AND status NOT IN ('shipped','delivered','cancelled')
     RETURNING id`,
    { replacements: { pid: providerOrderId, tn: trackingNumber || null }, type: sequelize.QueryTypes.SELECT }
  );
  if (!row) {
    // Already terminal — but backfill tracking if a later callback finally carries it
    // (first shipped callback may arrive without a tracking number).
    if (trackingNumber) {
      await sequelize.query(
        `UPDATE print_orders SET tracking_number=:tn, updated_at=NOW()
         WHERE print_provider_order_id=:pid AND tracking_number IS NULL`,
        { replacements: { pid: providerOrderId, tn: trackingNumber } }
      );
    }
    return { ok: true, noChange: true };
  }

  logger.info('[Print Fulfillment] order %d → shipped (Prodigi %s)', row.id, providerOrderId);
  return { ok: true, shipped: true, orderId: row.id };
}

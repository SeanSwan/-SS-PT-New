/**
 * Payment idempotency helpers.
 *
 * These functions turn payment attempt deduplication into a DB-backed claim:
 * callers check first, create once, and on a unique-index race re-read the
 * winning record instead of creating another payment/order side effect.
 */
import { buildWindowedStripeIdempotencyKey } from './stripeIdempotency.mjs';

export function buildGalleryPrintAttemptKey(payload, options = {}) {
  return buildWindowedStripeIdempotencyKey('gallery-print', {
    visitorId: payload.visitorId,
    eventId: payload.eventId,
    photoId: payload.photoId,
    productType: payload.productType,
    size: payload.size,
    quantity: payload.quantity,
    totalPrice: payload.totalPrice,
    cropData: payload.cropData ?? null,
  }, options);
}

export async function claimIdempotentRecord({
  model,
  lookupWhere,
  createValues,
  transaction,
}) {
  const options = {
    where: lookupWhere,
    defaults: createValues,
    ...(transaction ? { transaction } : {}),
  };

  // Sequelize findOrCreate wraps the create path in an internal transaction or
  // savepoint, so unique-key races do not poison the caller's transaction.
  const [record, created] = await model.findOrCreate(options);
  return { record, created };
}

/**
 * specialOfferRedemptionService.mjs
 * =================================
 * Paid-redemption boundary for per-client storefront specials. Every finite
 * redemption is consumed under a CustomPackage row lock in the same database
 * transaction as the session grant. This prevents two paid carts from reading
 * the same remaining count and makes missing backing rows fail closed.
 */
import { SpecialOfferError } from './specialOfferErrors.mjs';
import logger from '../utils/logger.mjs';

/**
 * The paid boundary CANNOT throw on a cancelled/expired special: by the time this
 * runs, Stripe has already charged the client, so throwing would (a) strand a paying
 * customer with zero sessions and (b) roll back the grant transaction, 500-looping the
 * webhook forever (Stripe then disables the endpoint). Prevention — stopping the payment
 * — belongs at cancel time (expire the in-flight Stripe session) and at checkout (cap the
 * session expiry). Here we HONOR the payment but make the anomaly LOUD and never silently
 * overwrite a terminal 'cancelled' status, so an admin can review/refund.
 * @returns {boolean} true when the special was cancelled/expired at redemption time
 */
function flagIfNotRedeemableAtPayment(customPackage, { now = new Date() } = {}) {
  const status = customPackage?.status;
  const expiresAt = customPackage?.expiresAt;
  const isCancelledOrTerminal = status && status !== 'active' && status !== 'redeemed';
  const isExpired = expiresAt && new Date(expiresAt).getTime() <= now.getTime();
  if (isCancelledOrTerminal || isExpired) {
    logger.error(
      `[SpecialRedemption] ANOMALY: paid redemption of a non-active special `
      + `(id=${customPackage?.id}, client=${customPackage?.clientId}, status=${status}, `
      + `expiresAt=${expiresAt || 'none'}). Payment already captured — grant HONORED. `
      + `Review for refund. code=PAID_AFTER_REVOKE_OR_EXPIRY`,
    );
    return true;
  }
  return false;
}

function assertPaidSpecialOwner(customPackage, userId) {
  if (!customPackage) {
    throw new SpecialOfferError('Special offer backing record not found.', {
      code: 'SPECIAL_NOT_FOUND',
      status: 409,
    });
  }
  if (Number(customPackage.clientId) !== Number(userId)) {
    throw new SpecialOfferError('This special offer belongs to another client.', {
      code: 'NOT_OWNER',
      status: 403,
    });
  }
}

export function assertClientOwnsActiveSpecial({ customPackage, userId, now = new Date() }) {
  if (!customPackage) {
    throw new SpecialOfferError('Special offer not found.', {
      code: 'SPECIAL_NOT_FOUND',
      status: 404,
    });
  }
  if (Number(customPackage.clientId) !== Number(userId)) {
    throw new SpecialOfferError('This special offer belongs to another client.', {
      code: 'NOT_OWNER',
      status: 403,
    });
  }
  if (customPackage.status !== 'active') {
    throw new SpecialOfferError(`This special offer is ${customPackage.status}.`, {
      code: 'NOT_ACTIVE',
      status: 409,
    });
  }
  if (customPackage.expiresAt && new Date(customPackage.expiresAt).getTime() <= now.getTime()) {
    throw new SpecialOfferError('This special offer has expired.', {
      code: 'EXPIRED',
      status: 410,
    });
  }
  const remaining = customPackage.remainingRedemptions;
  if (remaining !== null && remaining !== undefined && Number(remaining) <= 0) {
    throw new SpecialOfferError('This special offer has no redemptions left.', {
      code: 'NO_REDEMPTIONS_LEFT',
      status: 409,
    });
  }
  return true;
}

export async function assertCartSpecialsRedeemable({
  cartItems = [],
  userId,
  CustomPackage,
  now = new Date(),
}) {
  const specials = await loadLockedSpecials(cartItems, { CustomPackage });
  const seenSpecialIds = new Set();

  for (const item of cartItems) {
    const storefrontItemId = Number(item.storefrontItemId);
    const special = specials.get(storefrontItemId);
    const markedSpecial = item?.storefrontItem?.isSpecialOffer === true;

    if (!special && !markedSpecial) continue;
    assertClientOwnsActiveSpecial({ customPackage: special, userId, now });

    if (seenSpecialIds.has(storefrontItemId) || Number(item.quantity) !== 1) {
      throw new SpecialOfferError('A special offer can only be purchased once per order.', {
        code: 'SPECIAL_QUANTITY',
        status: 409,
      });
    }
    seenSpecialIds.add(storefrontItemId);
  }
  return true;
}

export async function recordSpecialRedemption(customPackage, { transaction, now = new Date() } = {}) {
  // Honor the already-paid checkout (throwing here would strand a charged customer and
  // 500-loop the webhook — see the header note), but make a cancelled/expired redemption
  // LOUD so an admin can review/refund. The redemption still resolves to a terminal
  // 'redeemed' state (locked by specialOfferPaidBoundary.test.mjs); the audit fact that
  // it was revoked/expired at payment time is preserved in the error log.
  flagIfNotRedeemableAtPayment(customPackage, { now });
  const updates = {};
  const remaining = customPackage.remainingRedemptions;

  if (remaining !== null && remaining !== undefined) {
    if (Number(remaining) <= 0) {
      throw new SpecialOfferError('This special offer has no redemptions left.', {
        code: 'NO_REDEMPTIONS_LEFT',
        status: 409,
      });
    }
    const left = Number(remaining) - 1;
    updates.remainingRedemptions = left;
    if (left === 0) updates.status = 'redeemed';
  } else if (customPackage.validityType === 'one_time') {
    updates.status = 'redeemed';
  }

  if (Object.keys(updates).length > 0) {
    await customPackage.update(updates, { transaction });
  }
  return updates;
}

async function loadLockedSpecials(cartItems, { CustomPackage, transaction }) {
  const ids = [...new Set(cartItems
    .map((item) => Number(item.storefrontItemId))
    .filter((id) => Number.isInteger(id) && id > 0))];

  if (ids.length === 0) return new Map();

  const query = {
    where: { storefrontItemId: ids },
    transaction,
  };
  if (transaction?.LOCK?.UPDATE) query.lock = transaction.LOCK.UPDATE;

  const rows = await CustomPackage.findAll(query);
  return new Map(rows.map((row) => [Number(row.storefrontItemId), row]));
}

export async function recordCartSpecialRedemptions({
  cartItems = [],
  userId,
  CustomPackage,
  transaction,
}) {
  const markedItems = cartItems.filter((item) => item?.storefrontItem?.isSpecialOffer === true);
  const specials = await loadLockedSpecials(markedItems, { CustomPackage, transaction });
  const seenSpecialIds = new Set();

  for (const item of markedItems) {
    const storefrontItemId = Number(item.storefrontItemId);
    const special = specials.get(storefrontItemId);
    assertPaidSpecialOwner(special, userId);
    if (seenSpecialIds.has(storefrontItemId) || Number(item.quantity) !== 1) {
      throw new SpecialOfferError('A special offer can only be purchased once per order.', {
        code: 'SPECIAL_QUANTITY',
        status: 409,
      });
    }
    seenSpecialIds.add(storefrontItemId);
  }

  const recorded = [];
  for (const item of markedItems) {
    const special = specials.get(Number(item.storefrontItemId));
    await recordSpecialRedemption(special, { transaction });
    recorded.push(special.id);
  }

  return [...new Set(recorded)];
}
export async function recordDirectSpecialRedemption({
  storefrontItemId,
  userId,
  CustomPackage,
  transaction,
}) {
  const query = {
    where: { storefrontItemId },
    transaction,
  };
  if (transaction?.LOCK?.UPDATE) query.lock = transaction.LOCK.UPDATE;

  const special = await CustomPackage.findOne(query);
  assertPaidSpecialOwner(special, userId);
  await recordSpecialRedemption(special, { transaction });
  return special.id;
}

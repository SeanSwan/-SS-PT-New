/**
 * checkoutLinePriceGuard.mjs — the price analogue of the quantity gate.
 * =====================================================================
 *
 * WHY THIS EXISTS
 *
 * The v2 rail re-validates QUANTITY immediately before charging Stripe, and
 * refuses fail-closed at 422 with this reasoning, quoted from that gate:
 *
 *     "never charge for a line the buyer's displayed total did not include"
 *
 * It then priced the same line with:
 *
 *     const itemPrice = toMoneyNumber(item?.price);   // non-finite -> 0
 *
 * so a CartItem row with `price: 0` (or null, or a string that does not parse)
 * was charged as $0.00 while its sessions were granted in full. Add-time
 * pricing goes through `resolveUnitPrice`, but rows can reach checkout without
 * passing add-time: an admin/repair/import path writing cart_items directly, a
 * row that predates the gate, or a snapshot written before the resolver landed.
 * The last gate before Stripe must not trust the snapshot it is about to charge.
 *
 * Found by GLM-5.3 (M3), 2026-08-19.
 *
 * WHY THIS IS NOT `resolveUnitPrice`
 *
 * `resolveUnitPrice` answers "what should this item cost?" from the CATALOG.
 * This answers "is the price we are about to charge a real number?" about the
 * CART SNAPSHOT. Re-resolving from the catalog here would silently reprice a
 * cart mid-checkout, changing the amount out from under the total the buyer was
 * shown — the opposite of the invariant above. So this validates the snapshot
 * rather than replacing it.
 *
 * STRINGS ARE VALID. Sequelize returns DECIMAL columns as strings; the cart
 * total helper already carries explicit string handling for exactly this
 * reason. Refusing strings here would refuse every real checkout.
 */

export const CHECKOUT_LINE_PRICE_INVALID_CODE = 'CART_ITEM_PRICE_INVALID';

export const CHECKOUT_LINE_PRICE_INVALID_MESSAGE =
  'Your cart needs to be refreshed before checkout. Please reload the store and try again.';

/**
 * A price is usable when it parses to a finite number strictly above zero.
 *
 * Zero is refused rather than allowed as a "free item" case: nothing on this
 * rail is legitimately free, and every zero-tolerating variant of this logic in
 * this codebase has ended up charging nothing while granting everything.
 */
const isUsablePrice = (value) => {
  if (value === null || value === undefined || value === '') return false;
  if (typeof value === 'boolean') return false;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0;
};

/**
 * First cart line whose snapshot price cannot be charged honestly.
 *
 * @param {Array<object>} cartItems
 * @returns {{code: string, status: number, message: string, cartItemId: any,
 *            storefrontItemId: any, rawPrice: any} | null} null when every line is fine
 */
export function findUnpriceableCheckoutLine(cartItems = []) {
  for (const item of cartItems || []) {
    if (isUsablePrice(item?.price)) continue;

    return {
      code: CHECKOUT_LINE_PRICE_INVALID_CODE,
      status: 422,
      message: CHECKOUT_LINE_PRICE_INVALID_MESSAGE,
      cartItemId: item?.id ?? null,
      storefrontItemId: item?.storefrontItemId ?? null,
      // Type only — the value itself is not needed to act on this and keeping
      // it out of logs avoids echoing arbitrary row content.
      rawPrice: typeof item?.price,
    };
  }

  return null;
}

export default { findUnpriceableCheckoutLine, CHECKOUT_LINE_PRICE_INVALID_CODE };

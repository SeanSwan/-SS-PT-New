/**
 * storefrontSpecialMoneyPath.test.mjs
 * ===================================
 * Source-contract regression matrix for the per-client custom-deal payment
 * boundary. Runtime service tests cover row locks and redemption mutation; these
 * checks lock the Express caller paths that previously allowed a priced cart to
 * change before grant, widened an invitation to unrelated packages, or routed a
 * hidden special through payment rails that do not own special redemption.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const readBackend = (relativePath) => readFileSync(resolve(here, '../..', relativePath), 'utf8');

const cartSource = readBackend('routes/cartRoutes.mjs');
const checkoutSource = readBackend('routes/v2PaymentRoutes.mjs');
const sessionPackageSource = readBackend('routes/sessionPackageRoutes.mjs');
const customPackageSource = readBackend('routes/customPackageRoutes.mjs');
const sessionGrantSource = readBackend('services/SessionGrantService.mjs');
const offlineSource = readBackend('routes/offlinePaymentRoutes.mjs');
const achSource = readBackend('routes/achPaymentRoutes.mjs');

function handlerBody(source, marker) {
  const start = source.indexOf(marker);
  if (start === -1) return '';
  const rest = source.slice(start + marker.length);
  const next = rest.search(/\nrouter\.(get|post|put|patch|delete)\(/);
  return next === -1 ? rest : rest.slice(0, next);
}

describe('special checkout amount-to-grant integrity', () => {
  it('freezes the priced cart in pending_payment after Stripe creates the session', () => {
    const body = handlerBody(checkoutSource, "router.post('/create-checkout-session'");
    expect(body).toMatch(/ShoppingCart\.update\(\{[\s\S]*status:\s*'pending_payment'[\s\S]*paymentStatus:\s*'initializing'/);
    expect(body).toMatch(/checkoutSessionId:\s*session\.id/);
    expect(body).toMatch(/buildCartCheckoutSnapshot\(cart\.cartItems, session\.id\)/);
  });

  it('keeps a special quantity at exactly one on every cart mutation path', () => {
    const add = handlerBody(cartSource, "router.post('/add'");
    const update = handlerBody(cartSource, "router.put('/update/:itemId'");
    expect(add).toMatch(/isOwnedSpecial[\s\S]*cartItem[\s\S]*SPECIAL_QUANTITY/);
    expect(update).toMatch(/storefrontItem\?\.isSpecialOffer[\s\S]*normalizedQuantity\s*!==\s*1/);
  });
});

describe('special invitation scope', () => {
  it('does not let any active special unlock unrelated direct package purchases', () => {
    const purchase = handlerBody(sessionPackageSource, "router.post('/purchase'");
    expect(purchase).not.toContain('clientHasActiveSpecial');
    expect(purchase).toMatch(/isSpecialOffer:\s*false/);
    expect(purchase).toMatch(/isPriceAccessGranted/);
  });

  it('lets an unflagged cart checkout only when every item is an owned special', () => {
    const checkout = handlerBody(checkoutSource, "router.post('/create-checkout-session'");
    expect(checkout).not.toContain('clientHasActiveSpecial');
    expect(checkout).toMatch(/cartContainsOnlySpecialOffers/);
    expect(checkout).toMatch(/assertCartSpecialsRedeemable/);
  });
});

describe('server-owned custom-deal pricing', () => {
  it('pins the paid-session sticker to STICKER_PER_SESSION regardless of request payload', () => {
    const create = handlerBody(customPackageSource, "router.post('/',");
    expect(create).not.toMatch(/pricePerSession\s*=\s*STICKER_PER_SESSION/);
    const pinnedUses = create.match(/pricePerSession:\s*STICKER_PER_SESSION/g) || [];
    expect(pinnedUses.length).toBeGreaterThanOrEqual(2);
  });

  it('returns only client-visible fields from GET /my', () => {
    const mine = handlerBody(customPackageSource, "router.get('/my'");
    expect(mine).toMatch(/attributes:\s*\[/);
    expect(mine).toMatch(/'storefrontItemId'/);
    const attributes = mine.slice(mine.indexOf('attributes:'), mine.indexOf('order:'));
    expect(attributes).not.toContain('adminNote');
    expect(attributes).not.toContain('approvedByAdminId');
    expect(attributes).not.toContain('overrideReason');
  });
});

describe('alternate payment rail containment', () => {
  it('keeps hidden specials out of offline-payment order creation', () => {
    // SWA-129 (Kimi F1 residual): the offline-payment lookup now also filters
    // isActive:true so a retired item can't be purchased by id-guess. Both
    // containment filters (isSpecialOffer:false AND isActive:true) must be present.
    expect(offlineSource).toMatch(/where:\s*\{\s*id:\s*itemIds,\s*isSpecialOffer:\s*false,\s*isActive:\s*true\s*\}/);
  });

  it('keeps hidden specials out of both ACH storefront lookups', () => {
    const filters = achSource.match(/isSpecialOffer:\s*false/g) || [];
    expect(filters.length).toBeGreaterThanOrEqual(2);
  });
});

describe('special checkout rail ownership', () => {
  it('keeps new custom-special checkout canonical to the cart/v2 rail', () => {
    const purchase = handlerBody(sessionPackageSource, "router.post('/purchase'");
    expect(purchase).toMatch(/isSpecialOffer:\s*false/);
    expect(purchase).not.toMatch(/SPECIAL_CART_CHECKOUT_REQUIRED/);
    expect(purchase).not.toMatch(/specialOfferId:\s*String\(selectedPackage\.id\)/);
  });
});
describe('checkout expiration recovery', () => {
  it('reopens only the cart tied to an expired Stripe session', () => {
    const webhook = handlerBody(cartSource, "router.post('/webhook'");
    const expired = webhook.slice(webhook.indexOf("case 'checkout.session.expired'"));
    expect(expired).toMatch(/status:\s*'active'/);
    expect(expired).toMatch(/paymentStatus:\s*'cancelled'/);
    expect(expired).toMatch(/checkoutSessionExpired:\s*true/);
    expect(expired).toMatch(/checkoutSessionId:\s*null/);
    expect(expired).toMatch(/where:\s*\{[\s\S]*id:\s*normalizedCartId[\s\S]*status:\s*'pending_payment'[\s\S]*checkoutSessionId:\s*session\.id/);
  });
});

describe('recursive hostile-release contracts', () => {
  it('refuses cart mutation while an existing cart is pending payment', () => {
    const add = handlerBody(cartSource, "router.post('/add'");
    expect(add).toMatch(/cart\.status\s*!==\s*'active'/);
    expect(add).toMatch(/CART_CHECKOUT_IN_PROGRESS/);
    expect(add).toMatch(/res\.status\(409\)/);
  });

  it('atomically claims one checkout and fulfills only its immutable Stripe snapshot', () => {
    const checkout = handlerBody(checkoutSource, "router.post('/create-checkout-session'");
    expect(checkout.indexOf('const [claimedCartCount] = await ShoppingCart.update')).toBeLessThan(
      checkout.indexOf('stripe.checkout.sessions.create'),
    );
    expect(checkout).toMatch(/where:\s*\{ id: normalizedCartId, userId, status: 'active' \}/);
    expect(checkout).toMatch(/stripeSessionData:\s*JSON\.stringify\(\{ checkoutSnapshot \}\)/);
    expect(sessionGrantSource).toMatch(/cart\.checkoutSessionId\s*!==\s*checkoutSessionId/);
    expect(sessionGrantSource).toMatch(/hydrateCartCheckoutItems/);
  });

  it('disables promotion-code stacking whenever a cart contains a special', () => {
    const checkout = handlerBody(checkoutSource, "router.post('/create-checkout-session'");
    expect(checkout).toMatch(/cartContainsSpecialOffers/);
    expect(checkout).toMatch(/allow_promotion_codes:\s*!cartContainsSpecialOffers/);
  });

  it('rotates the cart idempotency fingerprint after a prior checkout attempt', () => {
    expect(checkoutSource).toMatch(/priorCheckoutAttempt:\s*cart\?\.lastCheckoutAttempt[\s\S]{0,120}toISOString/);
  });

  it('requires paid Stripe status before direct package fulfillment', () => {
    expect(sessionPackageSource).toMatch(/payment_status\s*!==\s*'paid'/);
  });

  it('provides an authenticated conditional cart-release path for user cancellation', () => {
    const cancel = handlerBody(cartSource, "router.post('/cancel-checkout'");
    expect(cancel).toMatch(/checkout\.sessions\.retrieve/);
    expect(cancel).toMatch(/checkout\.sessions\.expire/);
    expect(cancel).toMatch(/status:\s*'pending_payment'/);
    expect(cancel).toMatch(/checkoutSessionId:\s*sessionId/);
    expect(cancel).toMatch(/status:\s*'active'/);
  });

  it('keeps time-window expiry mandatory on PATCH and hides expired or exhausted offers from /my', () => {
    const patch = handlerBody(customPackageSource, "router.patch('/:id'");
    const mine = handlerBody(customPackageSource, "router.get('/my'");
    expect(patch).toMatch(/assertValidityRules/);
    expect(patch).toMatch(/error instanceof SpecialOfferError/);
    expect(patch).toMatch(/error\.status/);
    expect(mine).toMatch(/expiresAt[\s\S]*Op\.gt/);
    expect(mine).toMatch(/remainingRedemptions[\s\S]*Op\.gt/);
  });
});

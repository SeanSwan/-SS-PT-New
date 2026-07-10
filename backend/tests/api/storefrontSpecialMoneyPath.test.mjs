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
    const update = body.slice(body.indexOf('await cart.update'));
    expect(update).toMatch(/status:\s*'pending_payment'/);
    expect(update).toMatch(/checkoutSessionId:\s*session\.id/);
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
    expect(purchase).toMatch(/selectedPackage\.isSpecialOffer/);
    expect(purchase).toMatch(/isPriceAccessGranted/);
  });

  it('lets an unflagged cart checkout only when every item is an owned special', () => {
    const checkout = handlerBody(checkoutSource, "router.post('/create-checkout-session'");
    expect(checkout).not.toContain('clientHasActiveSpecial');
    expect(checkout).toMatch(/cartContainsOnlySpecialOffers\(cart\.cartItems\)/);
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
    expect(offlineSource).toMatch(/where:\s*\{\s*id:\s*itemIds,\s*isSpecialOffer:\s*false\s*\}/);
  });

  it('keeps hidden specials out of both ACH storefront lookups', () => {
    const filters = achSource.match(/isSpecialOffer:\s*false/g) || [];
    expect(filters.length).toBeGreaterThanOrEqual(2);
  });
});

describe('direct special fulfillment marker', () => {
  it('marks direct Stripe sessions so fulfillment can burn the exact special', () => {
    const purchase = handlerBody(sessionPackageSource, "router.post('/purchase'");
    expect(purchase).toMatch(/specialOfferId:\s*String\(selectedPackage\.id\)/);
  });
});

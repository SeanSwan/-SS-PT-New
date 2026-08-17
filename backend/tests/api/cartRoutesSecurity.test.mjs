import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readSource = (path) => readFileSync(resolve(process.cwd(), path), 'utf8');
const cartRouteSource = readSource('routes/cartRoutes.mjs');
const middlewareSource = readSource('core/middleware/index.mjs');

const sliceBetween = (source, start, end) => {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);

  expect(startIndex).toBeGreaterThanOrEqual(0);
  expect(endIndex).toBeGreaterThan(startIndex);

  return source.slice(startIndex, endIndex);
};

describe('cart routes security hardening', () => {
  it('locks the live cart API mount and frontend consumer surface', () => {
    const coreRoutesSource = readSource('core/routes.mjs');
    const cartContextSource = readSource('../frontend/src/context/CartContextProvider.tsx');

    expect(coreRoutesSource).toContain("app.use('/api/cart', cartRoutes)");
    expect(cartContextSource).toContain("apiService.get<unknown>('/api/cart')");
    expect(cartContextSource).toContain("apiService.post<unknown>('/api/cart/add'");
    expect(cartContextSource).toContain('apiService.put<unknown>(`/api/cart/update/${normalizedItemId}`');
    expect(cartContextSource).toContain('apiService.delete<unknown>(`/api/cart/remove/${normalizedItemId}`)');
    expect(cartContextSource).toContain("apiService.delete<unknown>('/api/cart/clear')");
  });

  it('does not echo raw exception details from client-facing cart responses', () => {
    expect(cartRouteSource).toContain('const INTERNAL_ERROR =');
    expect(cartRouteSource).toContain('const sendInternalError =');
    expect(cartRouteSource).not.toContain("error: process.env.NODE_ENV === 'development' ? error.message : undefined");
    expect(cartRouteSource).not.toContain('Payment error: ${error.message.split');
    expect(cartRouteSource).not.toContain('Webhook processing error: ${err.message}');
  });

  it('keeps the mounted cart revenue path free of raw debug and exception logging', () => {
    expect(cartRouteSource).toContain('const toCartErrorMetadata =');
    expect(cartRouteSource).not.toMatch(/\bconsole\.(log|error|warn)\(/);
    expect(cartRouteSource).not.toContain('Cart add request body:');
    expect(cartRouteSource).not.toContain('req.user?.username');
    expect(cartRouteSource).not.toContain('req.user.username');
    expect(cartRouteSource).not.toContain('error.message');
    expect(cartRouteSource).not.toContain('err.message');
    expect(cartRouteSource).not.toContain("logger.info('Stripe session created:', session.id)");
  });

  it('strictly parses cart mutation IDs and quantities before model calls', () => {
    const addRoute = sliceBetween(
      cartRouteSource,
      "router.post('/add'",
      "router.put('/update/:itemId'"
    );
    const updateRoute = sliceBetween(
      cartRouteSource,
      "router.put('/update/:itemId'",
      "router.delete('/remove/:itemId'"
    );
    const removeRoute = sliceBetween(
      cartRouteSource,
      "router.delete('/remove/:itemId'",
      "router.delete('/clear'"
    );

    expect(addRoute).toContain('const normalizedStorefrontItemId = parsePositiveInteger(storefrontItemId);');
    expect(addRoute).toContain('const normalizedProductVariantId = parseOptionalPositiveInteger(productVariantId);');
    expect(addRoute).toContain('const normalizedQuantity = parsePositiveInteger(quantity);');
    expect(addRoute).toContain('const snapshot = await resolveCartItemSnapshot({');
    expect(addRoute).toContain('storefrontItemId: normalizedStorefrontItemId');
    expect(addRoute).toContain('productVariantId: normalizedProductVariantId');
    expect(addRoute).toContain('quantity: normalizedQuantity');
    expect(updateRoute).toContain('const normalizedItemId = parsePositiveInteger(itemId);');
    expect(updateRoute).toContain('const normalizedQuantity = parsePositiveInteger(quantity);');
    expect(updateRoute).toContain('where: { id: normalizedItemId }');
    expect(updateRoute).toContain('cartItem.quantity = normalizedQuantity;');
    expect(removeRoute).toContain('const normalizedItemId = parsePositiveInteger(itemId);');
    expect(removeRoute).toContain('where: { id: normalizedItemId }');
  });

  it('treats clear-cart as idempotent after checkout completes the active cart', () => {
    const clearRoute = sliceBetween(
      cartRouteSource,
      "router.delete('/clear'",
      "router.post('/checkout'"
    );

    expect(clearRoute).toContain('message: \'Cart already empty\'');
    expect(clearRoute).not.toContain('message: \'Active cart not found\'');
  });

  it('strictly parses Stripe webhook cart metadata before granting sessions', () => {
    // 2026-08-16: this asserted the LEGACY mount's own copy of the parsing. That copy
    // is gone — /api/cart/webhook now DELEGATES to the canonical handler by identity
    // (webhookMountParity.test.mjs proves it), because the duplicate switch silently
    // 200-acked every event type the canonical handler gained, including refunds.
    // Same invariant — metadata is strictly parsed, never parseInt'd, before a grant —
    // asserted where the code now lives.
    expect(cartRouteSource).toMatch(/router\.post\('\/webhook',\s*express\.raw\(/);
    expect(cartRouteSource).toContain('stripeWebhookHandler(req, res)');

    const canonical = readSource('webhooks/stripeWebhook.mjs');
    const completed = canonical.slice(canonical.indexOf("case 'checkout.session.completed'"));

    expect(completed).toContain('Number.parseInt(cartId, 10)');
    expect(completed).toContain('Number.isInteger(cartIdNumber)');
    // userId is taken from the DB row, never from event metadata — stronger than
    // parsing it, and the reason a forged metadata userId cannot cross accounts.
    expect(completed).toContain('grantSessionsForCart(cartIdNumber, cart.userId');
    expect(completed).not.toContain('parseInt(userId)');
  });

  it('skips global express.json for /api/cart/webhook so Stripe raw signature verification can work', () => {
    expect(middlewareSource).toMatch(
      /req\.path\.startsWith\(['"]\/api\/cart\/webhook['"]\)/,
    );
  });
});

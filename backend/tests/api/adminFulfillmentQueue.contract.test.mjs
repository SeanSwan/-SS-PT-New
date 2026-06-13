import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const read = (path) => readFileSync(resolve(root, path), 'utf8');

describe('admin fulfillment queue contract', () => {
  it('adds durable fulfillment columns to order_items with a migration', () => {
    const model = read('models/OrderItem.mjs');
    expect(model).toContain('fulfillmentStatus:');
    expect(model).toContain('fulfilledAt:');
    expect(model).toContain('fulfilledBy:');
    expect(model).toContain('fulfillmentNotes:');

    const migrationSources = readdirSync(resolve(root, 'migrations'))
      .filter((file) => /\.(cjs|mjs)$/.test(file))
      .map((file) => read(`migrations/${file}`));

    expect(migrationSources.some((source) => (
      source.includes('order_items')
      && source.includes('fulfillmentStatus')
      && source.includes('fulfilledAt')
      && source.includes('fulfilledBy')
      && source.includes('fulfillmentNotes')
    ))).toBe(true);
  });

  it('keeps the queue on the mounted admin orders surface', () => {
    const coreRoutes = read('core/routes.mjs');
    const orderRoutes = read('routes/adminOrdersRoutes.mjs');
    const service = read('services/adminFulfillmentQueueService.mjs');

    expect(coreRoutes).toContain("app.use('/api/admin', adminOrdersRoutes)");
    expect(orderRoutes).toContain("router.get('/orders/fulfillment'");
    expect(orderRoutes).toContain('router.patch(');
    expect(orderRoutes).toContain("'/orders/fulfillment-items/:itemId(\\\\d+)/complete'");
    expect(orderRoutes).toContain('getAdminFulfillmentQueue');
    expect(orderRoutes).toContain('completeFulfillmentItem');
    expect(service).toContain('OrderItem');
    expect(service).toContain('ProductVariant');
    expect(service).toContain('stockQuantity');
  });

  it('creates new paid checkout order items with first-class pending fulfillment status', () => {
    const fulfillment = read('services/cartCheckoutFulfillmentService.mjs');

    expect(fulfillment).toContain("fulfillmentStatus: isPhysicalCartItem(cartItem) ? 'pending_fulfillment' : 'not_required'");
    expect(fulfillment).toContain('customerInfo.fulfillmentIntent');
    expect(fulfillment).toContain('details');
  });
});

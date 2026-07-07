import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Slice 3d — admin print-order fulfillment view (source contract).
 * Locks the admin surface + the money-critical refund invariants (server-side PI
 * resolution, idempotent refund, refundable-states-only) without a live Stripe.
 */
const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '../../..');
const read = (rel) => readFileSync(resolve(repoRoot, rel), 'utf8');

describe('3d: PrintOrder associations registered', () => {
  const assoc = read('backend/models/associations.mjs');
  it('imports PrintOrder and registers belongsTo visitor/photo/event', () => {
    expect(assoc).toContain("await import('./PrintOrder.mjs')");
    expect(assoc).toContain('const PrintOrder = PrintOrderModule.default;');
    expect(assoc).toContain("PrintOrder.belongsTo(GalleryVisitor, { foreignKey: 'visitorId', as: 'visitor' })");
    expect(assoc).toContain("PrintOrder.belongsTo(GalleryPhoto, { foreignKey: 'photoId', as: 'photo' })");
    expect(assoc).toContain("PrintOrder.belongsTo(GalleryEvent, { foreignKey: 'eventId', as: 'event' })");
  });
});

describe('3d: admin fulfillment endpoints (adminGalleryRoutes)', () => {
  const src = read('backend/routes/adminGalleryRoutes.mjs');

  it('imports PrintOrder and lists orders with buyer/photo/event context, status-filtered, admin-gated', () => {
    expect(src).toContain("import PrintOrder from '../models/PrintOrder.mjs'");
    expect(src).toContain("router.get('/print-orders'");
    expect(src).toContain("as: 'visitor'");
    expect(src).toContain("as: 'photo'");
    expect(src).toContain("as: 'event'");
    // status filter is validated against the enum (no arbitrary where)
    expect(src).toMatch(/VALID\s*=\s*\['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled'\]/);
    // sits after the file-wide admin|trainer gate
    const gateIdx = src.indexOf('Admin or trainer access required');
    expect(src.indexOf("router.get('/print-orders'")).toBeGreaterThan(gateIdx);
  });

  it('mark-shipped only advances a PAID/processing order (never a never-paid pending one) — numeric-id guard', () => {
    expect(src).toContain("router.post('/print-orders/:orderId/mark-shipped'");
    expect(src).toContain('parseInt(req.params.orderId, 10)');
    expect(src).toMatch(/UPDATE print_orders[\s\S]*status='shipped'[\s\S]*WHERE id=:id AND status IN \('paid','processing'\)/);
  });

  it('the list hides commissionUsd (margin) from the trainer role', () => {
    expect(src).toContain("const isAdmin = req.user?.role === 'admin';");
    expect(src).toMatch(/attributes: isAdmin \? undefined : \{ exclude: \['commissionUsd'\] \}/);
  });

  it('refund resolves the PaymentIntent SERVER-SIDE and refunds idempotently, refundable-states-only', () => {
    expect(src).toContain("router.post('/print-orders/:orderId/refund'");
    // refunds are admin-only (not trainer) — money reversal
    const refundIdx = src.indexOf("router.post('/print-orders/:orderId/refund'");
    const refundBlock = src.slice(refundIdx, refundIdx + 1600);
    expect(refundBlock).toContain("req.user?.role !== 'admin'");
    // never trust client: resolve PI from the stored session
    expect(src).toContain('stripe.checkout.sessions.retrieve(order.stripeSessionId)');
    expect(src).toContain('session.payment_intent');
    // idempotent refund keyed on the order → a double-click never double-refunds
    expect(src).toContain('idempotencyKey: `print-refund:${order.id}`');
    // refundable states only
    expect(src).toContain("order.status === 'cancelled'");
    expect(src).toContain("order.status === 'pending'");
    // marks cancelled after refund
    expect(src).toMatch(/UPDATE print_orders SET status='cancelled'[\s\S]*WHERE id=:id AND status <> 'cancelled'/);
  });
});

describe('3d: frontend admin fulfillment UI', () => {
  const base = '../frontend/src/components/DashBoard/Pages/admin-gallery';
  const api = readFileSync(resolve(process.cwd(), `${base}/adminGalleryApi.ts`), 'utf8');
  const panel = readFileSync(resolve(process.cwd(), `${base}/components/PrintOrdersPanel.tsx`), 'utf8');
  const studio = readFileSync(resolve(process.cwd(), `${base}/AdminGalleryStudio.tsx`), 'utf8');
  const badge = readFileSync(resolve(process.cwd(), `${base}/components/PrintOrderStatusBadge.tsx`), 'utf8');

  it('api exposes list + the 3 fulfillment actions', () => {
    for (const fn of ['listPrintOrders', 'retryPrintFulfillment', 'markPrintOrderShipped', 'refundPrintOrder']) {
      expect(api).toContain(`export async function ${fn}`);
    }
  });

  it('panel is mounted in the studio and gates refund behind an inline confirm', () => {
    expect(studio).toContain('import PrintOrdersPanel');
    expect(studio).toContain('<PrintOrdersPanel />');
    expect(panel).toContain('confirmRefund');
    expect(panel).toContain('Confirm refund');
  });

  it('status badge uses tokens with fallbacks (Rule 6) for all six statuses', () => {
    for (const s of ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled']) {
      expect(badge).toContain(`${s}:`);
    }
    expect(badge).toContain('var(--');
    expect(badge).not.toMatch(/#[0-9a-fA-F]{6}(?![^(]*\))/); // no bare hex outside var() fallbacks
  });
});

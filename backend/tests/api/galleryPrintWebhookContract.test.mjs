import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Slice 3b — gallery print-order money loop (source contract).
 *
 * No Stripe/DB in dev, so this locks the billing INVARIANTS by asserting the
 * source. The money-critical ones (signature-verified entry, atomic replay
 * idempotency, server-set order mapping, fail-closed capture, transaction) are
 * the whole point — a regression silently double-charges, double-fulfills, or
 * strands a paid order in 'pending'.
 */
const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '../../..');
const read = (rel) => readFileSync(resolve(repoRoot, rel), 'utf8');

describe('gallery print webhook: checkout ↔ webhook contract', () => {
  const gallery = read('backend/routes/galleryRoutes.mjs');
  const webhook = read('backend/webhooks/stripeWebhook.mjs');

  it('checkout stamps a print_order type + server-set orderId and stores the session id on the order', () => {
    expect(gallery).toContain("type: 'print_order'");
    expect(gallery).toContain('orderId: String(order.id)');
    expect(gallery).toContain('await order.update({ stripeSessionId: session.id })');
  });

  it('webhook dispatches metadata.type === print_order to fulfillPrintOrder and imports PrintOrder', () => {
    expect(webhook).toContain("session.metadata?.type === 'print_order'");
    expect(webhook).toContain('await fulfillPrintOrder(session)');
    expect(webhook).toContain("import PrintOrder from '../models/PrintOrder.mjs'");
    expect(webhook).toContain('async function fulfillPrintOrder(session)');
  });
});

describe('gallery print webhook: billing correctness (fulfillPrintOrder)', () => {
  const webhook = read('backend/webhooks/stripeWebhook.mjs');
  const start = webhook.indexOf('async function fulfillPrintOrder(session)');
  const block = start >= 0 ? webhook.slice(start) : '';

  it('is reached only through the signature-verified handler (constructEvent), not a second entry point', () => {
    // Exactly one signature verification in the file; the print path rides it.
    expect(webhook).toContain('stripeClient.webhooks.constructEvent(');
    const verifications = webhook.split('constructEvent(').length - 1;
    expect(verifications).toBe(1);
  });

  it('uses the atomic processed_stripe_sessions replay guard (tier gallery-print) before any write', () => {
    expect(block).toContain("INSERT INTO processed_stripe_sessions");
    expect(block).toContain('ON CONFLICT ("sessionId") DO NOTHING');
    expect(block).toContain("'gallery-print'");
    // Duplicate delivery skips.
    expect(block).toContain('Duplicate print-order session');
    // Guard precedes the pending→paid flip.
    const guardIdx = block.indexOf('processed_stripe_sessions');
    const flipIdx = block.indexOf("SET status = 'paid'");
    expect(guardIdx).toBeGreaterThan(-1);
    expect(flipIdx).toBeGreaterThan(guardIdx);
  });

  it('maps the order from the session-owned id then the SERVER-set metadata.orderId (never trusts client input)', () => {
    expect(block).toContain('where: { stripeSessionId: session.id }');
    expect(block).toContain('Number.parseInt(meta.orderId, 10)');
    // parses/validates the fallback id, never uses a raw client-provided key.
    expect(block).toMatch(/Number\.isInteger\(orderId\)\s*&&\s*orderId\s*>\s*0/);
  });

  it('captures fail-closed: an idempotent pending→paid flip that sets paid_at', () => {
    expect(block).toMatch(/UPDATE print_orders SET status = 'paid', paid_at = NOW\(\)/);
    // Idempotent by construction — only flips a still-pending order.
    expect(block).toContain("WHERE id = :id AND status = 'pending'");
  });

  it('runs the replay-guard + flip in ONE transaction with rollback on failure (retry can re-process)', () => {
    expect(block).toContain('await sequelize.transaction()');
    expect(block).toContain('await t.commit()');
    expect(block).toContain('await t.rollback()');
    // A thrown fulfillment error rethrows so Stripe retries.
    expect(block).toContain('throw err;');
  });

  it('only marks orders paid when the session actually paid (payment_status guard)', () => {
    expect(block).toContain("session.payment_status !== 'paid'");
    expect(block).toContain('not marking paid');
  });

  it('does NOT submit to the print lab in this slice (that is 3c — captured, then fulfilled separately)', () => {
    // 3b stops at 'paid'. No provider submission / provider-id write here.
    expect(block).not.toContain('printProviderOrderId');
    expect(block).not.toContain('print_provider_order_id');
    expect(block).not.toMatch(/status = 'processing'/);
  });

  it('notifies admin best-effort AFTER commit (a notify failure cannot un-capture payment)', () => {
    const commitIdx = block.indexOf('await t.commit()');
    const notifyIdx = block.indexOf("title: 'Print Order Paid'");
    expect(commitIdx).toBeGreaterThan(-1);
    expect(notifyIdx).toBeGreaterThan(commitIdx);
    // notify is wrapped so it can't throw out of the handler.
    expect(block).toContain('Admin notification failed');
  });

  it('alerts admin on a PAID session with no matching order (plan: never leave a captured order invisible)', () => {
    expect(block).toContain("title: 'Print Payment Needs Attention'");
    expect(block).toContain("type: 'print_order_orphan'");
  });
});

describe('gallery print webhook: print_orders table creation (Rule-58 finding)', () => {
  const read = (rel) => readFileSync(resolve(repoRoot, rel), 'utf8');
  const mig = read('backend/migrations/20260706020000-create-print-orders-table.cjs');

  it('creates print_orders (the table never existed in prod) idempotently', () => {
    expect(mig).toContain("createTable('print_orders'");
    // Idempotent: skip if the table already exists.
    expect(mig).toContain("to_regclass('public.\"print_orders\"')");
    expect(mig).toContain("dropTable('print_orders')");
  });

  it('creates the idempotency UNIQUE index the checkout depends on (May migration never applied it)', () => {
    expect(mig).toMatch(/CREATE UNIQUE INDEX IF NOT EXISTS\s+"idx_print_orders_idempotency_key"/);
    expect(mig).toContain('WHERE "idempotency_key" IS NOT NULL');
  });

  it('defines the columns the checkout + webhook write (status, paid_at, stripe_session_id, idempotency_key)', () => {
    for (const col of ['status', 'paid_at', 'stripe_session_id', 'idempotency_key', 'price_usd', 'commission_usd']) {
      expect(mig).toContain(col);
    }
  });
});

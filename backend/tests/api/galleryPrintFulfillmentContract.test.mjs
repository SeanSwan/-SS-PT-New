import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Slice 3c — Prodigi drop-ship fulfillment (source contract).
 *
 * No Prodigi account in dev, so this locks the money-path INVARIANTS: flag-OFF by
 * default, fail-closed preconditions, double-submit prevented at two layers
 * (DB atomic claim + Prodigi Idempotency-Key), the un-watermarked master delivered
 * only via a signed URL, and the status webhook fail-closed on auth.
 */
const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '../../..');
const read = (rel) => readFileSync(resolve(repoRoot, rel), 'utf8');

describe('3c config — flag-OFF scaffold, fail-closed SKU', () => {
  const cfg = read('backend/services/print/prodigiConfig.mjs');

  it('is OFF by default and sandbox-first', () => {
    expect(cfg).toContain("process.env.PRINT_FULFILLMENT_PRODIGI_ENABLED === 'true'");
    expect(cfg).toContain('api.sandbox.prodigi.com');
    expect(cfg).toMatch(/PRODIGI_ENV === 'live'/);
  });

  it('treats placeholder/unmapped SKUs as null (never ships a wrong print)', () => {
    expect(cfg).toContain("sku.startsWith('REPLACE_ME')");
    expect(cfg).toContain('export function resolveProdigiSku');
    // keyed to the real PRINT_PRODUCTS combos
    expect(cfg).toContain("'print:8x10'");
    expect(cfg).toContain("'photobook:12x12'");
  });
});

describe('3c client — Prodigi REST wrapper', () => {
  const client = read('backend/services/print/prodigiClient.mjs');

  it('authenticates with X-API-Key and sends an Idempotency-Key on create', () => {
    expect(client).toContain("'X-API-Key': apiKey");
    expect(client).toContain("headers['Idempotency-Key']");
    expect(client).toContain('AbortController');
  });

  it('never logs the API key or response body (PII/secret hygiene)', () => {
    expect(client).not.toMatch(/logger\.(info|warn|error)\([^)]*apiKey/);
    expect(client).not.toMatch(/logger\.(info|warn|error)\([^)]*JSON\.stringify\(.*body/);
  });
});

describe('3c fulfillment service — the money-path core', () => {
  const svc = read('backend/services/print/printFulfillmentService.mjs');

  it('is flag-gated (no-op when fulfillment disabled)', () => {
    expect(svc).toContain('if (!isProdigiFulfillmentEnabled()) return { ok: false, skipped');
  });

  it('fails CLOSED on every precondition miss (order stays paid, admin alerted)', () => {
    expect(svc).toContain("failClosed(order, 'no_sku_mapping'");
    expect(svc).toContain("failClosed(order, 'no_shipping_address')");
    expect(svc).toContain("failClosed(order, 'no_print_master')");
    // failClosed alerts admin and never claims the order.
    expect(svc).toMatch(/async function failClosed[\s\S]*alertAdmin/);
  });

  it('prevents double-submit at TWO layers: atomic DB claim + Prodigi idempotency key', () => {
    // Layer 1: atomic + EXCLUSIVE claim — paid immediately, processing only if >5min stale.
    expect(svc).toMatch(/UPDATE print_orders SET status='processing'[\s\S]*WHERE id=:id AND print_provider_order_id IS NULL[\s\S]*status='paid' OR \(status='processing' AND updated_at < NOW\(\) - INTERVAL '5 minutes'\)[\s\S]*RETURNING id/);
    expect(svc).toContain('if (!claimed) return { ok: true, alreadyClaimed: true }');
    // already-submitted short-circuit → a retry becomes a status SYNC, not a re-submit.
    expect(svc).toContain('if (order.printProviderOrderId) {');
    expect(svc).toContain('await reconcileFromProvider(order.printProviderOrderId)');
    // Layer 2: Prodigi Idempotency-Key derived from the order.
    expect(svc).toContain('idempotencyKey: order.idempotencyKey || `swan-print-${order.id}`');
  });

  it('delivers the un-watermarked master via a short-lived SIGNED url, never public', () => {
    expect(svc).toContain('generateGalleryOriginalUrl(photo.originalStorageKey');
    expect(svc).toMatch(/assets: \[\{ printArea: 'default', url: assetUrl \}\]/);
  });

  it('reverts processing->paid on provider failure (retryable, never stuck)', () => {
    expect(svc).toContain('await revertToPaid(order.id)');
    expect(svc).toMatch(/UPDATE print_orders SET status='paid'[\s\S]*WHERE id=:id AND status='processing' AND print_provider_order_id IS NULL/);
  });

  it('applies inbound status idempotently (ship once)', () => {
    expect(svc).toContain('export async function applyProviderStatus');
    expect(svc).toMatch(/status='shipped'[\s\S]*WHERE print_provider_order_id=:pid AND status NOT IN \('shipped','delivered','cancelled'\)/);
  });
});

describe('3c wiring — webhook hand-off, shipping capture, mounts', () => {
  const webhook = read('backend/webhooks/stripeWebhook.mjs');
  const gallery = read('backend/routes/galleryRoutes.mjs');
  const admin = read('backend/routes/adminGalleryRoutes.mjs');
  const coreRoutes = read('backend/core/routes.mjs');
  const prodigiRoute = read('backend/routes/print/prodigiWebhookRoutes.mjs');

  it('checkout collects a shipping address (Prodigi cannot ship without one)', () => {
    expect(gallery).toContain('shipping_address_collection:');
  });

  it('webhook captures the shipping address (across Stripe API-version shapes) into the paid flip', () => {
    expect(webhook).toContain('session.shipping_details');
    expect(webhook).toContain('collected_information?.shipping_details');
    expect(webhook).toContain('shipping_address = :shipping::jsonb');
  });

  it('Prodigi hand-off is flag-gated, LAZY-imported, and runs AFTER commit (never un-captures / crashes payments)', () => {
    const commitIdx = webhook.indexOf('await t.commit()');
    const handoffIdx = webhook.indexOf('submitToProvider(flippedOrder.id');
    expect(commitIdx).toBeGreaterThan(-1);
    expect(handoffIdx).toBeGreaterThan(commitIdx);
    // inline env flag (no static print-module dep) + lazy import so payments can't crash on it
    expect(webhook).toContain("if (process.env.PRINT_FULFILLMENT_PRODIGI_ENABLED === 'true')");
    expect(webhook).toContain("await import('../services/print/printFulfillmentService.mjs')");
    expect(webhook).not.toContain("import { submitToProvider }");
    // wrapped so a hand-off error can't throw out of the webhook
    expect(webhook).toContain('Prodigi hand-off error (order stays paid)');
  });

  it('status webhook is shared-secret fail-closed and mounted publicly', () => {
    expect(prodigiRoute).toContain('prodigiWebhookSecret()');
    expect(prodigiRoute).toContain("return res.status(503)"); // secret unset -> reject
    expect(prodigiRoute).toContain("return res.status(401)"); // mismatch -> reject
    expect(coreRoutes).toContain("app.use('/api/print/webhooks', prodigiWebhookRouter)");
  });

  it('admin retry route is admin-gated (inherited) with a numeric-id guard', () => {
    expect(admin).toContain("router.post('/print-orders/:orderId/retry-fulfillment'");
    expect(admin).toContain('parseInt(req.params.orderId, 10)');
    // sits after the file-wide admin|trainer gate
    const gateIdx = admin.indexOf('Admin or trainer access required');
    const routeIdx = admin.indexOf("router.post('/print-orders/:orderId/retry-fulfillment'");
    expect(routeIdx).toBeGreaterThan(gateIdx);
  });
});

describe('3c hostile-review hardening (rounds 1-4)', () => {
  const svc = read('backend/services/print/printFulfillmentService.mjs');
  const gallery = read('backend/routes/galleryRoutes.mjs');
  const prodigiRoute = read('backend/routes/print/prodigiWebhookRoutes.mjs');

  it('R1: a stuck processing+null-provider order is recoverable (retry allowed from processing)', () => {
    expect(svc).toContain("if (order.status !== 'paid' && order.status !== 'processing')");
  });

  it('R1: does NOT revert to paid after Prodigi accepted (provider-id write failure held at processing)', () => {
    // The post-success write failure returns without reverting — Prodigi has the order.
    expect(svc).toContain("error: 'provider_id_write_failed'");
    expect(svc).toContain("do NOT re-charge");
  });

  it('R2: dead code removed — getProdigiOrder is wired into a reconcile (no orphan export)', () => {
    expect(svc).toContain('getProdigiOrder');
    expect(svc).toContain('async function reconcileFromProvider');
  });

  it('R1(PII): client print-order history excludes the home address + internal margin', () => {
    expect(gallery).toMatch(/attributes:\s*\{\s*exclude:\s*\[[^\]]*'shippingAddress'[^\]]*'commissionUsd'/);
  });

  it('R1(secret): Prodigi webhook secret is header-only + constant-time compared', () => {
    expect(prodigiRoute).toContain("req.get('x-prodigi-webhook-secret') || ''");
    expect(prodigiRoute).not.toContain('req.query.secret');
    expect(prodigiRoute).toContain('timingSafeEqual');
  });
});

describe('3c hostile-review hardening (wave 2)', () => {
  const svc = read('backend/services/print/printFulfillmentService.mjs');
  const gallery = read('backend/routes/galleryRoutes.mjs');
  const cfg = read('backend/services/print/prodigiConfig.mjs');
  const prodigiRoute = read('backend/routes/print/prodigiWebhookRoutes.mjs');
  const webhook = read('backend/webhooks/stripeWebhook.mjs');

  it('W2: concurrent double-claim closed — processing re-claim gated on a 5-min staleness window', () => {
    expect(svc).toContain("status='processing' AND updated_at < NOW() - INTERVAL '5 minutes'");
  });

  it('W2: checkout no longer echoes commission (Rule-20 sibling of the GET exclude)', () => {
    const start = gallery.indexOf("router.post('/print-order'");
    const end = gallery.indexOf("router.get('/print-orders'", start);
    const block = gallery.slice(start, end);
    expect(block).not.toMatch(/return res\.json\(\{[\s\S]*\bcommission,[\s\S]*\}\)/);
  });

  it('W2: Prodigi body parsing de-duplicated (Rule 63) — route uses the exported extractProviderStatus', () => {
    expect(svc).toContain('export function extractProviderStatus');
    expect(prodigiRoute).toContain('extractProviderStatus(req.body)');
    expect(prodigiRoute).not.toContain('order.shipments?.[0]?.tracking?.number');
  });

  it('W2: SKU map is not an unused export (Rule 63)', () => {
    expect(cfg).toContain('const PRODIGI_SKU_MAP');
    expect(cfg).not.toContain('export const PRODIGI_SKU_MAP');
  });

  it('W2: tracking backfills on a later callback even after shipped', () => {
    expect(svc).toMatch(/SET tracking_number=:tn[\s\S]*WHERE print_provider_order_id=:pid AND tracking_number IS NULL/);
  });

  it('W2: live payment webhook has no STATIC print-module import (boot-safety)', () => {
    expect(webhook).not.toContain("from '../services/print/printFulfillmentService.mjs'");
    expect(webhook).not.toContain("from '../services/print/prodigiConfig.mjs'");
  });
});

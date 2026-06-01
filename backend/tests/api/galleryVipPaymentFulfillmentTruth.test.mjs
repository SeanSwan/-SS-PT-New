import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '../../..');

const readRepoFile = (relativePath) => {
  const absolutePath = resolve(repoRoot, relativePath);
  return existsSync(absolutePath) ? readFileSync(absolutePath, 'utf8') : '';
};

describe('gallery VIP payment fulfillment contract', () => {
  it('fulfills VIP checkout only after Stripe payment verification and idempotent webhook processing', () => {
    const routeSource = readRepoFile('backend/routes/galleryRoutes.mjs');
    const webhookSource = readRepoFile('backend/webhooks/stripeWebhook.mjs');
    const fulfillmentSource = readRepoFile('backend/services/galleryVipFulfillmentService.mjs');
    const modalSource = readRepoFile('frontend/src/pages/gallery/VIPConversionModal.tsx');

    expect(routeSource).toMatch(/success_url:[\s\S]*vip=success[\s\S]*session_id=\{CHECKOUT_SESSION_ID\}/);
    expect(routeSource).toMatch(/checkout\.sessions\.retrieve\((sessionId|validation\.sessionId)/);
    expect(routeSource).toMatch(/payment_status\s*!==\s*'paid'/);
    expect(routeSource).toMatch(/fulfillGalleryVipSession/);

    expect(webhookSource).toContain("session.metadata?.type === 'vip_pt_session'");
    expect(webhookSource).toContain('fulfillGalleryVipSession');

    expect(fulfillmentSource).toContain('processed_stripe_sessions');
    expect(fulfillmentSource).toContain("import { NON_DEDUCTING_CLIENT_SOURCES } from './sessionBillingPolicy.mjs';");
    expect(fulfillmentSource).toContain("increment('availableSessions'");
    expect(fulfillmentSource).toContain('NON_DEDUCTING_CLIENT_SOURCES.has(user.clientSource)');
    expect(fulfillmentSource).toContain("clientSource: 'swanstudios'");
    expect(fulfillmentSource).toContain("role: 'client'");

    expect(modalSource).toContain("params.get('session_id')");
    expect(modalSource).toContain('/api/gallery/vip-activate');
  });
});

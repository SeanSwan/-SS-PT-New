import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const routeSource = readFileSync(resolve(process.cwd(), 'routes/galleryRoutes.mjs'), 'utf8').replace(/\r\n/g, '\n');
const webhookSource = readFileSync(resolve(process.cwd(), 'webhooks/stripeWebhook.mjs'), 'utf8').replace(/\r\n/g, '\n');

describe('gallery donation webhook fulfillment contract', () => {
  it('records card and Venmo donations only after Stripe confirms checkout completion', () => {
    expect(routeSource).toContain("type: 'gallery_donation'");
    expect(routeSource).toContain("method: 'stripe'");
    expect(routeSource).toContain("method: 'venmo'");
    expect(routeSource).toContain('amount: String(donationAmount)');
    expect(routeSource).not.toContain("method: 'stripe',\n        stripePaymentId: session.id");
    expect(routeSource).not.toContain("method: 'venmo',\n        stripePaymentId: session.id");

    expect(webhookSource).toContain("session.metadata?.type === 'gallery_donation'");
    expect(webhookSource).toContain('await fulfillGalleryDonation(session);');
    expect(webhookSource).toContain('async function fulfillGalleryDonation(session)');
    expect(webhookSource).toContain("'gallery-donation'");
    expect(webhookSource).toContain('processed_stripe_sessions');
    expect(webhookSource).toContain('await GalleryDonation.create({');
    expect(webhookSource).toContain('stripePaymentId: session.id');
  });
});

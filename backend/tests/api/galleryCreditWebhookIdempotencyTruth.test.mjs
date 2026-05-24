import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '../../..');

const readRepoFile = (relativePath) =>
  readFileSync(resolve(repoRoot, relativePath), 'utf8');

describe('gallery credit webhook idempotency contract', () => {
  it('uses the processed Stripe session ledger before incrementing gallery credits', () => {
    const gallerySource = readRepoFile('backend/routes/galleryRoutes.mjs');
    const webhookSource = readRepoFile('backend/webhooks/stripeWebhook.mjs');

    expect(gallerySource).toContain("type: 'gallery_credits'");
    expect(webhookSource).toContain('processed_stripe_sessions');
    expect(webhookSource).toContain('ON CONFLICT ("sessionId") DO NOTHING');
    expect(webhookSource).toContain("GalleryVisitor.increment('enhancementCredits'");
  });
});

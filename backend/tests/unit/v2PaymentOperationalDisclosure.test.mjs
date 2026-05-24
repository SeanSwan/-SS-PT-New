import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));
const source = readFileSync(join(repoRoot, 'backend/routes/v2PaymentRoutes.mjs'), 'utf8');
const compactSource = source.replace(/\s+/g, ' ');

describe('v2 payment operational disclosure guard', () => {
  it('keeps payment health authenticated and minimal', () => {
    expect(compactSource).toContain("router.get('/health', protect, (req, res)");
    expect(source).not.toContain('configured: !!process.env.STRIPE_SECRET_KEY');
    expect(source).not.toContain('mode: getStripeSecretKeyMode(process.env.STRIPE_SECRET_KEY)');
    expect(source).not.toContain('liveLocalBlocked:');
  });

  it('does not return checkout debug internals in client error responses', () => {
    expect(source).not.toContain('debugInfo:');
    expect(source).not.toContain('details: error.message');
    expect(source).not.toContain("details: process.env.NODE_ENV === 'development' ? error.message");
    expect(source).not.toContain("details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'");
    expect(source).toContain("details: 'Stripe service could not be initialized'");
    expect(source).toContain("details: 'Internal server error'");
  });
});

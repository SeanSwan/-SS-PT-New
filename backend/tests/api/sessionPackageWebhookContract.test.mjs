import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const readBackendFile = (relativePath) =>
  readFileSync(resolve(__dirname, '..', '..', relativePath), 'utf8').replace(/\r\n/g, '\n');

const routeSource = readBackendFile('routes/sessionPackageRoutes.mjs');
const middlewareSource = readBackendFile('core/middleware/index.mjs');
const coreRoutesSource = readBackendFile('core/routes.mjs');

describe('direct session-package Stripe webhook contract', () => {
  it('mounts session-package routes at /api/session-packages', () => {
    expect(coreRoutesSource).toMatch(
      /app\.use\(\s*['"]\/api\/session-packages['"]\s*,\s*sessionPackageRoutes\s*\)/,
    );
  });

  it('skips global express.json for /api/session-packages/webhook so Stripe raw signature verification can work', () => {
    expect(middlewareSource).toMatch(
      /req\.path\.startsWith\(['"]\/api\/session-packages\/webhook['"]\)/,
    );
  });

  it('keeps the webhook signature-verified and fail-closed', () => {
    expect(routeSource).toMatch(/router\.post\(['"]\/webhook['"],\s*express\.raw\(\{\s*type:\s*['"]application\/json['"]\s*\}\)/);
    expect(routeSource).toContain('process.env.STRIPE_WEBHOOK_SECRET');
    expect(routeSource).toMatch(/if\s*\(!webhookSecret\)[\s\S]{0,160}return\s+res\.status\(500\)/);
    expect(routeSource).toContain('stripeClient.webhooks.constructEvent');
  });

  it('returns 500 on retryable fulfillment failures', () => {
    expect(routeSource).toMatch(
      /fulfillSessionPackageCheckoutSession\(session\)[\s\S]{0,320}return\s+res\.status\(500\)\.send\(['"]Session package webhook processing error['"]\)/,
    );
  });
});

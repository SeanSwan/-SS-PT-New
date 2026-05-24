import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));
const read = (path) => readFileSync(join(repoRoot, path), 'utf8');

describe('public operational disclosure guard', () => {
  it('keeps contact diagnostic routes admin-only', () => {
    const source = read('backend/routes/contactRoutes.mjs');

    expect(source).toContain('router.get("/test", protect, adminOnly');
    expect(source).toContain('router.get("/health", protect, adminOnly');
    expect(source).not.toContain("environment: process.env.NODE_ENV || 'development'");
    expect(source).not.toContain('Request body');
    expect(source).not.toContain("error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'");
  });

  it('keeps public health responses free of environment and provider configuration details', () => {
    const source = read('backend/routes/healthRoutes.mjs');

    expect(source).not.toMatch(/environment:\s*process\.env\.NODE_ENV/);
    expect(source).not.toContain('process.memoryUsage()');
    expect(source).not.toContain('stripeConfigured');
    expect(source).not.toContain('STRIPE_SECRET_KEY && process.env.VITE_STRIPE_PUBLISHABLE_KEY');
    expect(source).not.toContain('totalPackages');
    expect(source).not.toContain('activePackages: activePackages');
    expect(source).not.toContain('validPricedPackages: validPricedPackages');
    expect(source).not.toContain('message: error.message');
    expect(source).not.toContain('error: error.message');
  });

  it('keeps public root/test and AI health endpoints as minimal liveness checks', () => {
    const coreRoutes = read('backend/core/routes.mjs');
    const aiRoutes = read('backend/routes/aiRoutes.mjs');

    expect(coreRoutes).not.toContain("environment: process.env.NODE_ENV || 'development'");
    expect(aiRoutes).not.toContain('getRegisteredAdapterNames');
    expect(aiRoutes).not.toContain('adapters:');
    expect(aiRoutes).not.toContain('killSwitch:');
    expect(aiRoutes).not.toContain('AI_WORKOUT_GENERATION_ENABLED');
  });

  it('keeps public sessions health as a minimal liveness check', () => {
    const source = read('backend/routes/sessions.mjs');
    const healthRoute = source.slice(
      source.indexOf('router.get("/health"'),
      source.indexOf('router.get("/admin/cancelled"')
    );

    expect(healthRoute).toContain('router.get("/health", async (_req, res)');
    expect(healthRoute).not.toContain('return res.status(200).json(health)');
    expect(healthRoute).not.toContain("service: 'UnifiedSessionService'");
    expect(healthRoute).not.toContain('version:');
    expect(healthRoute).not.toContain('error: error.message');
  });
});

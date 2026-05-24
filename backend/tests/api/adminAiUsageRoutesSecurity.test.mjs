import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const routeSource = readFileSync(resolve(__dirname, '../../routes/adminAiUsageRoutes.mjs'), 'utf8');
const coreRoutesSource = readFileSync(resolve(__dirname, '../../core/routes.mjs'), 'utf8');

describe('admin AI usage route security', () => {
  it('keeps AI usage and admin health routes behind admin authentication', () => {
    expect(coreRoutesSource).toContain("app.use('/api/admin', adminAiUsageRoutes)");
    expect(routeSource).toContain("router.get('/ai-usage', protect, adminOnly");
    expect(routeSource).toContain("router.get('/health', protect, adminOnly");
  });

  it('does not expose raw runtime version or database error details from admin health', () => {
    expect(routeSource).not.toContain('nodeVersion: process.version');
    expect(routeSource).not.toContain('error: error.message');
    expect(routeSource).toContain('database: { connected: false }');
  });
});

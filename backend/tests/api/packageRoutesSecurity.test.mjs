import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('packageRoutes security contract', () => {
  it('is mounted at the legacy packages API path', () => {
    const coreRoutes = readFileSync(resolve(__dirname, '../../core/routes.mjs'), 'utf8');

    expect(coreRoutes).toContain("app.use('/api/packages', packageRoutes)");
  });

  it('does not expose raw package creation errors to clients', () => {
    const source = readFileSync(resolve(__dirname, '../../routes/packageRoutes.mjs'), 'utf8');

    expect(source).toContain("const INTERNAL_ERROR = 'INTERNAL_ERROR';");
    expect(source).toContain('code: INTERNAL_ERROR');
    expect(source).not.toMatch(/error:\s*error\.message/);
  });
});

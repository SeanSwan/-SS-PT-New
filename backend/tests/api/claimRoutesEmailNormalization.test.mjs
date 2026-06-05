import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const routeSource = readFileSync(resolve(__dirname, '../../routes/claimRoutes.mjs'), 'utf8');

describe('claim routes email normalization', () => {
  it('normalizes optional activation emails before compare, validation, lookup, and save', () => {
    expect(routeSource).toContain("from '../services/clientOnboardIdentityService.mjs'");
    expect(routeSource).toContain('const normalizedEmail = normalizeClientOnboardEmailInput(email);');
    expect(routeSource).toContain('if (normalizedEmail && normalizedEmail !== matchedUser.email)');
    expect(routeSource).toContain('test(normalizedEmail)');
    expect(routeSource).toContain('email: normalizedEmail');
    expect(routeSource).toContain('updates.email = normalizedEmail');
  });
});

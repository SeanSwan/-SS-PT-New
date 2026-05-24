import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SOURCE = readFileSync(resolve(__dirname, './index.ts'), 'utf8');

describe('ClientManagement barrel truth lock', () => {
  it('defaults the live trainer clients route to the real assignment-backed view', () => {
    expect(SOURCE).toMatch(/export\s*\{\s*default\s*\}\s*from\s*['"]\.\/MyClientsView['"]/);
  });

  it('keeps the demo wrapper from becoming the live route default', () => {
    expect(SOURCE).not.toMatch(/export\s*\{\s*default\s*\}\s*from\s*['"]\.\/MyClientsViewWithFallback['"]/);
    expect(SOURCE).toMatch(/export\s*\{\s*default\s+as\s+MyClientsViewWithFallback\s*\}/);
  });
});

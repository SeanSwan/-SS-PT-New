import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('client onboarding server-only seed password entropy', () => {
  it('uses crypto entropy instead of Math.random for server-only seed passwords', () => {
    const source = readFileSync(resolve(__dirname, '../../controllers/onboardingController.mjs'), 'utf8');

    expect(source).toContain("from 'node:crypto'");
    expect(source).not.toContain('Math.random');
    expect(source).toContain('randomBytes');
  });
});

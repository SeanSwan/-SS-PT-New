import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));
const source = readFileSync(join(repoRoot, 'backend/controllers/authController.mjs'), 'utf8');

describe('auth controller public disclosure guard', () => {
  it('does not write public auth request bodies or headers to console', () => {
    expect(source).not.toContain('Registration request body');
    expect(source).not.toContain('LOGIN REQUEST BODY');
    expect(source).not.toContain('Request headers');
    expect(source).not.toMatch(/console\.(log|error|warn)\(/);
  });

  it('does not return development debug payloads from public auth failures', () => {
    expect(source).not.toContain('DETAILED REGISTRATION ERROR');
    expect(source).not.toContain('LOGIN ERROR DETAILS');
    expect(source).not.toContain('debug: errorDetails');
    expect(source).not.toContain("error: process.env.NODE_ENV === 'development' ? error.message");
    expect(source).not.toContain("details: process.env.NODE_ENV === 'development'");
  });
});

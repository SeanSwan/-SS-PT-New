import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));
const source = readFileSync(join(repoRoot, 'backend/generate-admin-token.mjs'), 'utf8');

describe('admin token generator secret guard', () => {
  it('does not mint admin tokens with a fallback JWT secret', () => {
    expect(source).not.toContain("process.env.JWT_SECRET || 'your-secret-key'");
    expect(source).toContain('const JWT_SECRET = process.env.JWT_SECRET;');
    expect(source).toContain('JWT_SECRET is required to generate an admin token');
    expect(source).toContain("JWT_SECRET === 'your-secret-key'");
    expect(source).toContain("JWT_SECRET === 'your-production-jwt-secret-key-here-change-this'");
  });
});

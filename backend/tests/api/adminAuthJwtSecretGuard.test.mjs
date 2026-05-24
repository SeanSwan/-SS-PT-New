import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));
const source = readFileSync(join(repoRoot, 'backend/middleware/adminAuth.mjs'), 'utf8');
const runtimeSource = source.replace(/\/\*[\s\S]*?\*\//g, '');

describe('admin auth JWT secret guard', () => {
  it('does not fall back to a predictable JWT signing secret', () => {
    expect(source).not.toContain("process.env.JWT_SECRET || 'your-secret-key-change-in-production'");
    expect(source).not.toContain("process.env.JWT_SECRET || 'your-secret-key'");
    expect(source).not.toMatch(/const\s+JWT_SECRET\s*=/);
    expect(source).toContain('const getJwtSecret = () =>');
    expect(source).toContain('INSECURE_JWT_PLACEHOLDERS.has(secret)');
    expect(source).toContain('JwtSecretConfigurationError');
  });

  it('verifies admin tokens with the fail-closed secret resolver', () => {
    expect(runtimeSource).not.toContain('jwt.verify(token, JWT_SECRET)');
    expect(runtimeSource.match(/jwt\.verify\(token, getJwtSecret\(\)\)/g)).toHaveLength(3);
  });
});

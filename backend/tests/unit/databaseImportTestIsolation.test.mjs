import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('database import test isolation', () => {
  it('does not authenticate or warn about a missing root env file during Vitest imports', () => {
    const source = readFileSync(resolve(process.cwd(), 'database.mjs'), 'utf8');

    expect(source).toContain("const isTest = process.env.NODE_ENV === 'test';");
    expect(source).toContain('if (!isTest) {');
    expect(source).toContain('testConnection();');
    expect(source).toContain("} else if (!isTest) {");
  });
});

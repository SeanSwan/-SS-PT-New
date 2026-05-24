import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('AuthContext clientSource persistence', () => {
  it('maps clientSource through every auth user formatting path', () => {
    const source = readFileSync(resolve(__dirname, 'AuthContext.tsx'), 'utf8');
    const mappings = source.match(/clientSource:\s*userData\.clientSource/g) || [];

    expect(mappings.length).toBeGreaterThanOrEqual(4);
  });
});

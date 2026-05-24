import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('VIPConversionModal auth persistence contract', () => {
  it('persists returned app auth after gallery VIP signup or login', () => {
    const source = readFileSync(
      resolve(__dirname, 'VIPConversionModal.tsx'),
      'utf8'
    );

    expect(source).toContain("ProductionTokenManager.setToken(data.token)");
    expect(source).toContain('ProductionTokenManager.setUser(data.user)');
    expect(source).toContain('apiService.setAuthToken(data.token)');
  });
});

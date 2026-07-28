import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(resolve(__dirname, './useHeaderState.ts'), 'utf-8');

describe('useHeaderState role access', () => {
  it('treats trainers as client-dashboard capable staff in the header gate', () => {
    const clientCaseStart = source.indexOf("case 'client':");
    const userCaseStart = source.indexOf("case 'user':", clientCaseStart);
    expect(clientCaseStart).toBeGreaterThan(-1);
    expect(userCaseStart).toBeGreaterThan(clientCaseStart);

    const clientCase = source.slice(clientCaseStart, userCaseStart);
    expect(clientCase).toContain("user.role === 'admin'");
    expect(clientCase).toContain("user.role === 'trainer'");
    expect(clientCase).toContain("user.role === 'client'");
  });
});

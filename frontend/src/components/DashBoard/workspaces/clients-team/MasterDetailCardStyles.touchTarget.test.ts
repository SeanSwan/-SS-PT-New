import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(resolve(__dirname, './MasterDetailCardStyles.ts'), 'utf8');

describe('MasterDetailCardStyles touch target contract', () => {
  it('keeps client quick action buttons at the app minimum touch target size', () => {
    expect(source).toMatch(/export const QuickActionBtn = styled\.button[\s\S]*width: 44px;/);
    expect(source).toMatch(/export const QuickActionBtn = styled\.button[\s\S]*height: 44px;/);
    expect(source).toMatch(/export const QuickActionBtn = styled\.button[\s\S]*min-width: 44px;/);
  });
});

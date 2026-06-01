import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(resolve(__dirname, './MasterDetailShellStyles.ts'), 'utf8');

describe('MasterDetailShellStyles touch target contract', () => {
  it('keeps the sidebar collapse control at the app minimum touch target size', () => {
    expect(source).toMatch(/export const CollapseButton = styled\.button`[\s\S]*min-width: 44px;/);
    expect(source).toMatch(/export const CollapseButton = styled\.button`[\s\S]*min-height: 44px;/);
  });

  it('keeps pillar navigation controls at the app minimum touch target size', () => {
    expect(source).toMatch(/export const PillarButton = styled\.button[\s\S]*min-height: 44px;/);
  });
});

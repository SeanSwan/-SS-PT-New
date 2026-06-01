import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(resolve(__dirname, './EnhancedTrainerDataManagement.tsx'), 'utf8');

describe('EnhancedTrainerDataManagement prompt contract', () => {
  it('uses an in-app trainer photo editor instead of browser-native prompt', () => {
    expect(source).not.toContain('window.prompt');
    expect(source).toContain('Set trainer photo');
    expect(source).toContain('PhotoUrlInput');
  });

  it('keeps pagination controls at the app minimum touch target size', () => {
    expect(source).toMatch(/const PaginationSelect = styled\.select`[\s\S]*min-height: 44px;/);
    expect(source).toMatch(/const PaginationButton = styled\.button[\s\S]*min-width: 44px;/);
    expect(source).toMatch(/const PaginationButton = styled\.button[\s\S]*min-height: 44px;/);
  });
});

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(resolve(__dirname, './CoachMarkdownStyles.ts'), 'utf8');

describe('CoachMarkdownStyles touch target contract', () => {
  it('keeps code copy controls at the app minimum touch target size', () => {
    expect(source).toMatch(/export const CopyBtn = styled\.button`[\s\S]*min-width: 44px;/);
    expect(source).toMatch(/export const CopyBtn = styled\.button`[\s\S]*min-height: 44px;/);
  });
});

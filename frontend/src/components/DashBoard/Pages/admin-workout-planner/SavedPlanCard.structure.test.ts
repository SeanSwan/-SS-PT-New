import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (fileName: string) =>
  readFileSync(resolve(__dirname, fileName), 'utf8');

describe('SavedPlanCard structure', () => {
  it('keeps card styles in a focused sibling styles module', () => {
    const cardSource = read('SavedPlanCard.tsx');
    const styleSource = read('SavedPlanCard.styles.ts');

    expect(cardSource).toContain("from './SavedPlanCard.styles'");
    expect(cardSource).not.toContain("from 'styled-components'");
    expect(cardSource).not.toMatch(/const\s+\w+\s*=\s*styled\./);
    expect(styleSource).toContain("from 'styled-components'");
    expect(styleSource).toContain('export const Card');
    expect(styleSource).toContain('export const RenameInput');
  });
});

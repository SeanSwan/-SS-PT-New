import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('CoachTeachModePanel style extraction', () => {
  it('keeps the active Teach Mode panel component under the line cap with styles extracted', () => {
    const componentSource = readFileSync(resolve(__dirname, './CoachTeachModePanel.tsx'), 'utf8');
    const stylesSource = readFileSync(resolve(__dirname, './CoachTeachModePanel.styles.ts'), 'utf8');

    expect(componentSource.split(/\r?\n/).length).toBeLessThanOrEqual(300);
    expect(componentSource).not.toContain('styled.');
    expect(componentSource).toContain("from './CoachTeachModePanel.styles'");
    expect(stylesSource).toContain('export const PanelContainer');
    expect(stylesSource).toContain('export const ResultsDropdown');
    expect(stylesSource).toContain('var(--danger-text, #C92A54)');
    expect(stylesSource).not.toContain('width: 32px');
    expect(stylesSource).not.toContain('height: 32px');
    expect(stylesSource).toMatch(/export const CloseBtn = styled\.button`[\s\S]*width: 44px;[\s\S]*height: 44px;[\s\S]*min-width: 44px;[\s\S]*min-height: 44px;[\s\S]*&:focus-visible/);
  });
});

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

const componentSource = readFileSync(resolve(__dirname, 'TrainingTabContent.tsx'), 'utf8');
const stylesSource = readFileSync(resolve(__dirname, 'TrainingTabContent.styles.ts'), 'utf8');

describe('TrainingTabContent style extraction', () => {
  it('keeps the active training workflow component focused on orchestration', () => {
    expect(componentSource).toContain("from './TrainingTabContent.styles'");
    expect(componentSource).not.toContain('styled.button');
    expect(componentSource).not.toContain('styled.div`');
  });

  it('exports the responsive training shell styles from a dedicated module', () => {
    [
      'LayoutWrapper',
      'Sidebar',
      'SidebarItem',
      'ContentArea',
      'ShimmerLoader',
      'PlaceholderCard',
    ].forEach((exportName) => {
      expect(stylesSource).toContain(`export const ${exportName}`);
    });
  });

  it('keeps active and focus accents theme-tokened for dashboard theme sync', () => {
    expect(stylesSource).toContain('var(--accent-secondary, #8B5CF6)');
    expect(stylesSource).toContain('var(--accent-primary, #60C0F0)');
    expect(stylesSource).toContain('color-mix(in srgb, var(--accent-primary, #60C0F0)');
    expect(stylesSource).not.toContain('background: #8B5CF6');
    expect(stylesSource).not.toContain('outline: 2px solid #60C0F0');
    expect(stylesSource).not.toContain('rgba(96, 192, 240, 0.5)');
    expect(stylesSource).not.toContain('rgba(96, 192, 240, 0.4)');
  });

  it('keeps mobile training tabs at the project 44px minimum touch target', () => {
    expect(stylesSource).not.toContain('min-height: 40px');
    expect(stylesSource).toContain('min-height: 44px');
  });
});

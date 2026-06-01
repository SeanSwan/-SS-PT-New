import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

const componentSource = readFileSync(resolve(__dirname, 'OverviewTabContent.tsx'), 'utf8');
const stylesSource = readFileSync(resolve(__dirname, 'OverviewTabContent.styles.ts'), 'utf8');

describe('OverviewTabContent style extraction', () => {
  it('keeps the overview component focused on data mapping and card composition', () => {
    expect(componentSource).toContain("from './OverviewTabContent.styles'");
    expect(componentSource).not.toContain('styled.div`');
    expect(componentSource).not.toContain('styled.h4`');
    expect(componentSource).not.toContain('import styled from');
  });

  it('exports the bento overview visual contract from a dedicated module', () => {
    [
      'BentoGrid',
      'BentoCard',
      'CardHeader',
      'CardIcon',
      'CardTitle',
      'CardValue',
      'CardSubtext',
      'HeroRow',
      'HeroStat',
      'HeroStatLabel',
      'HeroStatValue',
    ].forEach((exportName) => {
      expect(stylesSource).toContain(`export const ${exportName}`);
    });
  });

  it('keeps responsive, dark-first, theme-tokened dashboard styling', () => {
    expect(stylesSource).toContain('grid-template-columns: repeat(4, 1fr)');
    expect(stylesSource).toContain('@media (max-width: 1024px)');
    expect(stylesSource).toContain('@media (max-width: 430px)');
    expect(stylesSource).toContain('var(--bg-surface, #141419)');
    expect(stylesSource).toContain('var(--accent-primary, #60C0F0)');
  });
});

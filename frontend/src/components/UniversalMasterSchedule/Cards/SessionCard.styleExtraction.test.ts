import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

const readSource = (relativePath: string) =>
  readFileSync(resolve(process.cwd(), relativePath), 'utf8');

describe('UniversalMasterSchedule drag card style extraction', () => {
  const componentPath = 'src/components/UniversalMasterSchedule/Cards/SessionCard.tsx';
  const stylesPath = 'src/components/UniversalMasterSchedule/Cards/SessionCard.styles.ts';

  it('keeps the drag/drop SessionCard behavior isolated from its styled-components definitions', () => {
    const componentSource = readSource(componentPath);
    const stylesSource = readSource(stylesPath);

    expect(componentSource).toContain("from './SessionCard.styles'");
    expect(componentSource).not.toContain("from 'styled-components'");
    expect(componentSource.split(/\r?\n/).length).toBeLessThanOrEqual(300);

    expect(stylesSource).toContain('export const LiteCardContainer');
    expect(stylesSource).toContain('export const CardContainer');
    expect(stylesSource).toContain('export const SessionsBadge');
    expect(stylesSource).toContain('styled.div');
    expect(stylesSource).toContain('mobileOptimizations');
  });

  it('keeps active schedule drag cards off the retired Galaxy-Swan theme', () => {
    const stylesSource = readSource(stylesPath);

    expect(stylesSource).not.toContain('galaxy-swan-theme');
    expect(stylesSource).toContain('var(--bg-elevated');
    expect(stylesSource).toContain('var(--accent-primary');
    expect(stylesSource).toContain('var(--text-primary');
    expect(stylesSource).not.toContain('#00FF88');
    expect(stylesSource).not.toContain('#FF4757');
  });
});

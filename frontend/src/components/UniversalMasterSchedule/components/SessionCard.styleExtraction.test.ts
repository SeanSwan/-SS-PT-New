import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

const readSource = (relativePath: string) =>
  readFileSync(resolve(process.cwd(), relativePath), 'utf8');

describe('UniversalMasterSchedule timeline SessionCard style extraction', () => {
  const componentPath = 'src/components/UniversalMasterSchedule/components/SessionCard.tsx';
  const stylesPath = 'src/components/UniversalMasterSchedule/components/SessionCard.styles.ts';

  it('keeps the timeline SessionCard below the line cap by moving styled-components to a sibling module', () => {
    const componentSource = readSource(componentPath);
    const stylesSource = readSource(stylesPath);

    expect(componentSource).toContain("from './SessionCard.styles'");
    expect(componentSource).not.toContain('styled(');
    expect(componentSource).not.toContain('keyframes`');
    expect(componentSource.split(/\r?\n/).length).toBeLessThanOrEqual(300);

    expect(stylesSource).toContain('export const CardWrapper');
    expect(stylesSource).toContain('export const BookButton');
    expect(stylesSource).toContain('export const JoinButton');
    expect(stylesSource).toContain('styled(motion.button)');
    expect(stylesSource).toContain('keyframes`');
  });

  it('keeps the timeline SessionCard bridged to dashboard surface and shadow tokens', () => {
    const stylesSource = readSource(stylesPath);

    expect(stylesSource).toContain('var(--bg-elevated');
    expect(stylesSource).toContain('var(--shadow-strong');
    expect(stylesSource).toContain('var(--shadow-soft');
    expect(stylesSource).not.toContain('var(--surface-elevated');
    expect(stylesSource).not.toContain('box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5)');
    expect(stylesSource).not.toContain('box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3)');
  });
});

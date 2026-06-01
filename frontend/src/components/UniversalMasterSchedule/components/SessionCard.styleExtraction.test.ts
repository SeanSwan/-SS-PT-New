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
});

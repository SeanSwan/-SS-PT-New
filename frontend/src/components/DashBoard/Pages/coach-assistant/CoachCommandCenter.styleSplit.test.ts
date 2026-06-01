import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const STYLE_FILES = [
  'CoachCommandCenter.styles.ts',
  'CoachCommandCenter.shellStyles.ts',
  'CoachCommandCenter.foundationStyles.ts',
  'CoachCommandCenter.workspaceStyles.ts',
  'CoachCommandCenter.composerStyles.ts',
  'CoachCommandCenter.responsiveStyles.ts',
];

const readStyleFile = (fileName: string) =>
  readFileSync(resolve(__dirname, fileName), 'utf8');

describe('CoachCommandCenter style split', () => {
  it('keeps the canonical shell API split into capped style modules', () => {
    const sources = STYLE_FILES.map(readStyleFile);
    const [rootSource] = sources;

    expect(rootSource).toContain('export const CommandCenterShell = styled.div');
    expect(rootSource).toContain('coachCommandShellStyles');
    expect(rootSource).toContain('coachCommandFoundationStyles');
    expect(rootSource).toContain('coachCommandWorkspaceStyles');
    expect(rootSource).toContain('coachCommandComposerStyles');
    expect(rootSource).toContain('coachCommandResponsiveStyles');

    STYLE_FILES.forEach((fileName, index) => {
      expect(
        sources[index].split(/\r?\n/).length,
        `${fileName} should stay within the project file-size cap`,
      ).toBeLessThanOrEqual(300);
    });
  });

  it('uses the styled-components css helper for shared style fragments', () => {
    STYLE_FILES.slice(1).forEach((fileName) => {
      const source = readStyleFile(fileName);

      expect(source).toContain("import { css } from 'styled-components';");
      expect(source).toMatch(/export const \w+ = css`/);
    });
  });
});

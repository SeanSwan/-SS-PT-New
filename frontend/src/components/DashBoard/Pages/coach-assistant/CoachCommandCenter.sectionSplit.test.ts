import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const SECTION_FILES = [
  'CoachCommandCenter.types.ts',
  'CoachCommandCenter.actions.ts',
  'CoachCommandCenter.controller.ts',
  'useCoachCommandCenterDrawerEffects.ts',
  'CoachCommandLeftRail.tsx',
  'CoachCommandComposer.tsx',
  'CoachCommandLogPanel.tsx',
  'CoachCommandOverview.tsx',
  'CoachCommandOpsRail.tsx',
];

const readCoachFile = (fileName: string) =>
  readFileSync(resolve(__dirname, fileName), 'utf8');

describe('CoachCommandCenter section split', () => {
  it('delegates the mounted page shell to capped section components', () => {
    const pageSource = readCoachFile('CoachCommandCenterPage.tsx');

    expect(pageSource.split(/\r?\n/).length).toBeLessThanOrEqual(300);
    expect(pageSource).toContain("from './CoachCommandCenter.controller'");
    expect(pageSource).toContain("from './useCoachCommandCenterDrawerEffects'");
    expect(pageSource).toContain("from './CoachCommandLeftRail'");
    expect(pageSource).toContain("from './CoachCommandComposer'");
    expect(pageSource).toContain("from './CoachCommandLogPanel'");
    expect(pageSource).toContain("from './CoachCommandOverview'");
    expect(pageSource).toContain("from './CoachCommandOpsRail'");
    expect(pageSource).toContain('<CoachCommandLeftRail');
    expect(pageSource).toContain('<CoachCommandComposer');
    expect(pageSource).toContain('<CoachCommandLogPanel');
    expect(pageSource).toContain('<CoachCommandOverview');
    expect(pageSource).toContain('<CoachCommandOpsRail');

    SECTION_FILES.forEach((fileName) => {
      expect(
        readCoachFile(fileName).split(/\r?\n/).length,
        `${fileName} should stay within the project file-size cap`,
      ).toBeLessThanOrEqual(300);
    });
  });
});

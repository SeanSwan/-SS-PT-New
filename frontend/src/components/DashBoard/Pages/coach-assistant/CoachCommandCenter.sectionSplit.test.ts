import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const SECTION_FILES = [
  'CoachCommandCenter.types.ts',
  'CoachCommandCenter.actions.ts',
  'CoachCommandCenter.controller.ts',
  'useCoachCommandCenterDrawerEffects.ts',
  'CoachCommandCenter.bridgeStyles.ts',
  'CoachClientBar.tsx',
  'CoachCommandTabBar.tsx',
  'CoachCommandCenterReviewPanel.tsx',
  'CoachCommandCenterWorkbenchPanel.tsx',
  'CoachReviewHub.tsx',
  'CoachOnboardingWorkbench.tsx',
  'CoachOnboardingWorkbench.logic.ts',
  'CoachOnboardingWorkbench.styles.ts',
  'CoachChatTranscript.tsx',
  'CoachConsoleDock.tsx',
  'CoachCommandLeftRail.tsx',
  'CoachCommandOpsRail.tsx',
];

const readCoachFile = (fileName: string) =>
  readFileSync(resolve(__dirname, fileName), 'utf8');

describe('CoachCommandCenter section split', () => {
  it('delegates the mounted page shell to capped section components', () => {
    const pageSource = readCoachFile('CoachCommandCenterPage.tsx');
    const reviewPanelSource = readCoachFile('CoachCommandCenterReviewPanel.tsx');

    expect(pageSource.split(/\r?\n/).length).toBeLessThanOrEqual(300);
    expect(pageSource).toContain("from './CoachCommandCenter.controller'");
    expect(pageSource).toContain("from './useCoachCommandCenterDrawerEffects'");
    expect(pageSource).toContain("from './CoachCommandCenter.bridgeStyles'");
    expect(pageSource).toContain("from './CoachCommandCenterReviewPanel'");
    expect(pageSource).toContain("from './CoachChatTranscript'");
    expect(pageSource).toContain("from './CoachClientBar'");
    expect(pageSource).toContain("from './CoachCommandTabBar'");
    expect(pageSource).toContain("from './CoachConsoleDock'");
    expect(pageSource).toContain("from './CoachCommandLeftRail'");
    expect(pageSource).toContain("from './CoachCommandOpsRail'");
    expect(pageSource).toContain('<CoachClientBar');
    expect(pageSource).toContain('<CoachCommandTabBar');
    expect(pageSource).toContain('<CoachCommandCenterReviewPanel');
    expect(pageSource).toContain('<CoachChatTranscript');
    expect(pageSource).toContain('<CoachConsoleDock');
    expect(pageSource).toContain('<CoachCommandLeftRail');
    expect(pageSource).toContain('<CoachCommandOpsRail');

    expect(reviewPanelSource).toContain("from './CoachReviewHub'");
    expect(reviewPanelSource).toContain("from './CoachCommandCenterWorkbenchPanel'");
    expect(reviewPanelSource).toContain('<CoachReviewHub');
    expect(reviewPanelSource).toContain('<CoachCommandCenterWorkbenchPanel');

    SECTION_FILES.forEach((fileName) => {
      expect(
        readCoachFile(fileName).split(/\r?\n/).length,
        `${fileName} should stay within the project file-size cap`,
      ).toBeLessThanOrEqual(300);
    });
  });
});
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
  'CoachCommandOpsSurface.tsx',
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
    // Review is a code-split boundary: the page must import the LAZY
    // wrapper, never the eager panel (that would re-inflate the chunk).
    expect(pageSource).toContain("from './CoachCommandCenterReviewPanelLazy'");
    expect(pageSource).not.toContain("from './CoachCommandCenterReviewPanel';");
    const lazySource = readCoachFile('CoachCommandCenterReviewPanelLazy.tsx');
    expect(lazySource).toContain('React.lazy(');
    expect(lazySource).toContain("import('./CoachCommandCenterReviewPanel')");
    expect(pageSource).toContain("from './CoachChatTranscript'");
    expect(pageSource).toContain("from './CoachClientBar'");
    expect(pageSource).toContain("from './CoachCommandTabBar'");
    expect(pageSource).toContain("from './CoachConsoleDock'");
    expect(pageSource).toContain("from './CoachCommandLeftRail'");
    expect(pageSource).toContain("from './CoachCommandOpsSurface'");
    expect(pageSource).toContain('<CoachClientBar');
    expect(pageSource).toContain('<CoachCommandTabBar');
    expect(pageSource).toContain('<CoachCommandCenterReviewPanel');
    const controllerSource = readCoachFile('CoachCommandCenter.controller.ts');
    expect(controllerSource).toContain('handleIntentSubmit: actions.handleIntentSubmit');
    expect(pageSource).toContain('<CoachChatTranscript');
    expect(pageSource).toContain('<CoachConsoleDock');
    expect(pageSource).toContain('<CoachCommandLeftRail');
    expect(pageSource).toContain('<CoachCommandOpsSurface');

    expect(reviewPanelSource).toContain("from './CoachReviewHub'");
    expect(reviewPanelSource).toContain("from './CoachCommandCenterWorkbenchPanel'");
    expect(reviewPanelSource).toContain('<CoachReviewHub');
    expect(reviewPanelSource).toContain('<CoachCommandCenterWorkbenchPanel');

    SECTION_FILES.forEach((fileName) => {
      expect(
        // trimEnd: the raw split counts the phantom empty string after the
        // trailing newline, failing files at EXACTLY the 300 cap (house
        // counter pattern, see WorkoutLogger *.typeContract tests).
        readCoachFile(fileName).trimEnd().split(/\r?\n/).length,
        `${fileName} should stay within the project file-size cap`,
      ).toBeLessThanOrEqual(300);
    });
  });
});

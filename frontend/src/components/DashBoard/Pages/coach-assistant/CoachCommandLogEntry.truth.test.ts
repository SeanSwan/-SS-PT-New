import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const readCoachFile = (fileName: string) =>
  readFileSync(resolve(__dirname, fileName), 'utf8');

const readDashboardFile = (fileName: string) =>
  readFileSync(resolve(__dirname, '../../', fileName), 'utf8');

describe('CoachCommandLogEntry canonical command-center contract', () => {
  it('stays wired into the admin Coach Command Center route chain', () => {
    const layoutSource = readDashboardFile('UniversalDashboardLayout.tsx');
    const pageSource = readCoachFile('CoachCommandCenterPage.tsx');
    const panelSource = readCoachFile('CoachCommandLogPanel.tsx');

    expect(layoutSource).toContain("const CoachCommandCenterPage = React.lazy(() => import('./Pages/coach-assistant/CoachCommandCenterPage'))");
    expect(layoutSource).toContain("{ path: '/coach-assistant', component: CoachCommandCenterPage");
    expect(pageSource).toContain("import CoachCommandLogPanel from './CoachCommandLogPanel'");
    expect(pageSource).toContain('<CoachCommandLogPanel logs={commandCenter.logs}');
    expect(pageSource).toContain('onReset={commandCenter.resetLogs}');
    expect(panelSource).toContain("import CoachCommandLogEntry from './CoachCommandLogEntry'");
    expect(panelSource).toContain('<CoachCommandLogEntry entry={entry} key={entry.id} />');
  });

  it('keeps the command-log renderer split into capped renderer, style, and type modules', () => {
    const rendererSource = readCoachFile('CoachCommandLogEntry.tsx');
    const stylesSource = readCoachFile('CoachCommandLogEntry.styles.ts');
    const typesSource = readCoachFile('CoachCommandLogEntry.types.ts');

    expect(rendererSource).toContain("from './CoachCommandLogEntry.styles'");
    expect(rendererSource).toContain("from './CoachCommandLogEntry.types'");
    expect(rendererSource).not.toContain("styled.");
    expect(rendererSource).not.toContain("styled.article");

    expect(stylesSource).toContain("import styled, { css } from 'styled-components';");
    expect(stylesSource).toContain('export const LogEntry = styled.article');
    expect(typesSource).toContain("export type LogActor = CommandLogEntry['actor'];");
    expect(typesSource).toContain('export type CoachCommandLogEntryProps');

    [
      ['CoachCommandLogEntry.tsx', rendererSource],
      ['CoachCommandLogEntry.styles.ts', stylesSource],
      ['CoachCommandLogEntry.types.ts', typesSource],
    ].forEach(([fileName, source]) => {
      expect(
        source.split(/\r?\n/).length,
        `${fileName} should stay within the project file-size cap`,
      ).toBeLessThanOrEqual(300);
    });
  });
});

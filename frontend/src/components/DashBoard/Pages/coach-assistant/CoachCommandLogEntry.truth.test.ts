import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const readCoachFile = (fileName: string) =>
  readFileSync(resolve(__dirname, fileName), 'utf8');

const readDashboardFile = (fileName: string) =>
  readFileSync(resolve(__dirname, '../../', fileName), 'utf8');

describe('CoachCommandLogEntry canonical command-center contract', () => {
  it('stays wired into the admin Coach Command Center route chain', () => {
    const routeComponentsSource = readDashboardFile('UniversalDashboardLayout.routeComponents.tsx');
    const routesSource = readDashboardFile('UniversalDashboardLayout.routes.tsx');
    const pageSource = readCoachFile('CoachCommandCenterPage.tsx');
    const transcriptSource = readCoachFile('CoachChatTranscript.tsx');

    expect(routeComponentsSource).toContain("export const CoachCommandCenterPage = React.lazy(() => import('./Pages/coach-assistant/CoachCommandCenterPage'))");
    expect(routesSource).toContain("{ path: '/coach-assistant', component: CoachCommandCenterPage");
    expect(pageSource).toContain("import CoachChatTranscript from './CoachChatTranscript'");
    expect(pageSource).toContain('<CoachChatTranscript');
    expect(pageSource).toContain('logs={commandCenter.logs}');
    expect(pageSource).toContain('onCancelCommand={commandCenter.handleCancelCommand}');
    expect(pageSource).toContain('onConfirmCommand={commandCenter.handleConfirmCommand}');
    // onReset was dead wiring (never consumed by the transcript) — the live
    // affordance contract is the failed-send retry lane.
    expect(pageSource).toContain('onRetryMessage={commandCenter.handleRetryMessage}');
    expect(transcriptSource).toContain("import CoachCommandLogEntry from './CoachCommandLogEntry'");
    expect(transcriptSource).toContain('<CoachCommandLogEntry');
    expect(transcriptSource).toContain('entry={entry}');
    expect(transcriptSource).toContain('key={entry.id}');
    expect(transcriptSource).toContain('onCancelCommand={onCancelCommand}');
    expect(transcriptSource).toContain('onConfirmCommand={onConfirmCommand}');
  });

  it('keeps the command-log renderer split into capped renderer, style, and type modules', () => {
    const rendererSource = readCoachFile('CoachCommandLogEntry.tsx');
    const formatterSource = readCoachFile('CoachCommandLogEntry.format.ts');
    const stylesSource = readCoachFile('CoachCommandLogEntry.styles.ts');
    const typesSource = readCoachFile('CoachCommandLogEntry.types.ts');

    expect(rendererSource).toContain("from './CoachCommandLogEntry.styles'");
    expect(rendererSource).toContain("from './CoachCommandLogEntry.types'");
    expect(rendererSource).toContain("from './CoachCommandLogEntry.format'");
    expect(formatterSource).toContain('export function formatCommandLogBody');
    expect(rendererSource).not.toContain("styled.");
    expect(rendererSource).not.toContain("styled.article");

    expect(stylesSource).toContain("import styled, { css } from 'styled-components';");
    expect(stylesSource).toContain('export const LogEntry = styled.article');
    expect(typesSource).toContain("export type LogActor = CommandLogEntry['actor'];");
    expect(typesSource).toContain('export type CoachCommandLogEntryProps');
    expect(rendererSource).not.toContain('onAcknowledge={() => undefined}');
    expect(rendererSource).toContain('setAcknowledgedConfirmationId');
    expect(rendererSource).toContain('confirmation.operationId !== acknowledgedConfirmationId');

    [
      ['CoachCommandLogEntry.tsx', rendererSource],
      ['CoachCommandLogEntry.format.ts', formatterSource],
      ['CoachCommandLogEntry.styles.ts', stylesSource],
      ['CoachCommandLogEntry.types.ts', typesSource],
    ].forEach(([fileName, source]) => {
      expect(
        // trimEnd: the raw split counts the phantom empty string after the
        // trailing newline, failing files at EXACTLY the 300 cap (house
        // counter pattern, see WorkoutLogger *.typeContract tests).
        source.trimEnd().split(/\r?\n/).length,
        `${fileName} should stay within the project file-size cap`,
      ).toBeLessThanOrEqual(300);
    });
  });
});

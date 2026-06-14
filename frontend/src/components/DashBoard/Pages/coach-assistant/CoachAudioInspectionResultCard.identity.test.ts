import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { audioInspectionItemKey } from './CoachAudioInspectionResultCard';

const readCoachFile = (fileName: string) =>
  readFileSync(resolve(__dirname, fileName), 'utf8');

const readDashboardFile = (fileName: string) =>
  readFileSync(resolve(__dirname, '../../', fileName), 'utf8');

describe('CoachAudioInspectionResultCard identity contract', () => {
  it('stays wired into the canonical Swan Coach command-result route chain', () => {
    const layoutSource = readDashboardFile('UniversalDashboardLayout.tsx');
    const pageSource = readCoachFile('CoachCommandCenterPage.tsx');
    const hookSource = readCoachFile('hooks/useCoachAssistant.ts');
    const commandHookSource = readFileSync(
      resolve(__dirname, '../../../../hooks/useCoachCommand.ts'),
      'utf8',
    );
    const messageSource = readCoachFile('CoachMessage.tsx');
    const transcriptSource = readCoachFile('CoachChatTranscript.tsx');
    const logEntrySource = readCoachFile('CoachCommandLogEntry.tsx');
    const resultSource = readCoachFile('CoachExecutionResultCard.tsx');
    const routeSource = readFileSync(resolve(__dirname, '../../../../../../backend/routes/aiCommandRoutes.mjs'), 'utf8');
    const coreRoutesSource = readFileSync(resolve(__dirname, '../../../../../../backend/core/routes.mjs'), 'utf8');

    expect(layoutSource).toContain("const CoachCommandCenterPage = React.lazy(() => import('./Pages/coach-assistant/CoachCommandCenterPage'))");
    expect(layoutSource).toContain("{ path: '/coach-assistant', component: CoachCommandCenterPage");
    expect(pageSource).toContain('<CoachChatTranscript');
    expect(transcriptSource).toContain('<CoachCommandLogEntry');
    expect(logEntrySource).toContain('<ExecutionResultCard');
    expect(hookSource).toContain('useCoachCommand()');
    expect(commandHookSource).toContain("apiService.post('/api/ai-command/execute'");
    expect(coreRoutesSource).toContain("app.use('/api/ai-command', aiCommandRoutes)");
    expect(routeSource).toContain("router.post('/execute', protect");
    expect(messageSource).toContain('<ExecutionResultCard');
    expect(resultSource).toContain('<CoachAudioInspectionResultCard');
  });

  it('uses deterministic audio item keys without falling back to map indexes', () => {
    const source = readCoachFile('CoachAudioInspectionResultCard.tsx');

    expect(source).toContain('export function audioInspectionItemKey');
    expect(source).toContain('key={audioInspectionItemKey(item)}');
    expect(source).not.toMatch(/key=\{item\.id \|\| `audio-item-\$\{index\}`\}/);

    expect(audioInspectionItemKey({
      kind: 'coach_intake',
      queueStatus: 'unprocessed',
      audioPieces: 3,
      audioBundles: 2,
      audioConfidence: 'low',
      reviewRoute: '/dashboard/admin/coach-assistant?intake=audio-1',
    })).toBe('audio-review-coach_intake-unprocessed-3-2-low-/dashboard/admin/coach-assistant?intake=audio-1');

    expect(audioInspectionItemKey({
      audioPieces: Number.NaN,
      audioBundles: undefined,
      needsOrderingReview: true,
    })).toBe('audio-review-unknown-unknown-0-0-medium-review');
  });
});

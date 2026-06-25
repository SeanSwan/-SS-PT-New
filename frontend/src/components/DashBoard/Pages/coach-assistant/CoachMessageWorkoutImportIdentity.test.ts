import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  workoutImportItemKey,
  workoutImportItems,
} from './CoachMessageWorkoutImportIdentity';

function readCoachFile(fileName: string): string {
  return readFileSync(resolve(__dirname, fileName), 'utf8');
}

const readDashboardFile = (fileName: string) =>
  readFileSync(resolve(__dirname, '../../', fileName), 'utf8');

describe('CoachMessage workout import identity contract', () => {
  it('keeps legacy Swan Coach assistant message modules wired for backward-compatible transcripts', () => {
    const routeComponentsSource = readDashboardFile('UniversalDashboardLayout.routeComponents.tsx');
    const routesSource = readDashboardFile('UniversalDashboardLayout.routes.tsx');
    const pageSource = readCoachFile('SwanCoachAssistantPage.tsx');
    const panelSource = readCoachFile('SwanCoachMessagesPanel.tsx');
    const messageSource = readCoachFile('CoachMessage.tsx');
    const chatHookSource = readFileSync(resolve(__dirname, '../../../../hooks/useAIChat.ts'), 'utf8');
    const backendRoutesSource = readFileSync(resolve(__dirname, '../../../../../../backend/core/routes.mjs'), 'utf8');
    const aiChatRoutesSource = readFileSync(resolve(__dirname, '../../../../../../backend/routes/aiChatRoutes.mjs'), 'utf8');

    expect(routeComponentsSource).toContain("export const CoachCommandCenterPage = React.lazy(() => import('./Pages/coach-assistant/CoachCommandCenterPage'))");
    expect(routesSource).toContain("{ path: '/coach-assistant', component: CoachCommandCenterPage");
    expect(pageSource).toContain('const chat = useAIChat()');
    expect(pageSource).toContain('<SwanCoachMessagesPanel');
    expect(panelSource).toContain('<CoachMessage');
    expect(messageSource).toContain('workoutImportResults');
    expect(messageSource).toContain("from './CoachMessageWorkoutImportIdentity'");
    expect(chatHookSource).toContain("apiService.post('/api/ai-chat/conversations'");
    expect(chatHookSource).toContain('`/api/ai-chat/conversations/${convId}/messages`');
    expect(backendRoutesSource).toContain("app.use('/api/ai-chat', aiChatRoutes)");
    expect(aiChatRoutesSource).toContain("router.post('/conversations/:id/messages'");
  });

  it('uses deterministic workout import keys without falling back to map indexes', () => {
    expect(workoutImportItemKey({
      success: true,
      sessionId: 'session-123',
      date: '2026-05-05',
      exerciseCount: 4,
      totalSets: 12,
      totalReps: 108,
      totalWeight: 2450,
    })).toBe('workout-import-session-session-123');

    const rows = workoutImportItems([
      {
        success: false,
        date: '2026-05-05',
        exerciseCount: 0,
        totalSets: 0,
        totalReps: 0,
        totalWeight: 0,
      },
      {
        success: false,
        date: '2026-05-05',
        exerciseCount: 0,
        totalSets: 0,
        totalReps: 0,
        totalWeight: 0,
      },
    ]);

    expect(rows.map((row) => row.key)).toEqual([
      'workout-import-2026-05-05-failed-0-exercises-0-sets-0-reps-0-lbs-1',
      'workout-import-2026-05-05-failed-0-exercises-0-sets-0-reps-0-lbs-2',
    ]);
  });
});

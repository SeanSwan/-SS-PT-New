import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  buildTrainerHomeCoachPath,
  TRAINER_HOME_COACH_PATH,
  TRAINER_HOME_COACH_PROMPT,
  TRAINER_HOME_QUICK_ACTIONS,
} from './TrainerHomeQuickActions.config';

const __dirname = dirname(fileURLToPath(import.meta.url));
const componentSource = readFileSync(resolve(__dirname, 'TrainerHomeTab.tsx'), 'utf8');
const quickActionStyles = readFileSync(resolve(__dirname, 'TrainerHomeQuickActions.styles.ts'), 'utf8');

describe('TrainerHomeTab quick-action priority', () => {
  it('keeps the daily coaching loop before schedule and planning work', () => {
    expect(TRAINER_HOME_QUICK_ACTIONS.map(action => action.label)).toEqual([
      'Log Workout',
      'Ask Coach',
      'View Clients',
      'Client Progress',
    ]);

    expect(TRAINER_HOME_QUICK_ACTIONS.map(action => action.path)).toEqual([
      '/dashboard/trainer/clients?intent=log_workout',
      TRAINER_HOME_COACH_PATH,
      '/dashboard/trainer/clients',
      '/dashboard/trainer/client-progress',
    ]);

    const coachUrl = new URL(TRAINER_HOME_COACH_PATH, 'https://sswanstudios.test');
    expect(coachUrl.pathname).toBe('/dashboard/trainer/coach-assistant');
    expect(coachUrl.searchParams.get('teachPrompt')).toBe(TRAINER_HOME_COACH_PROMPT);

    expect(TRAINER_HOME_QUICK_ACTIONS[0]).toMatchObject({
      label: 'Log Workout',
      primary: true,
      overline: 'Start here',
      detail: 'Pick a client and save today.',
    });
    expect(TRAINER_HOME_QUICK_ACTIONS.slice(1).map(action => Boolean(action.primary))).toEqual([
      false,
      false,
      false,
    ]);
  });

  it('keeps trainer quick-action styles extracted for future mobile polish', () => {
    expect(componentSource).toContain("from './TrainerHomeQuickActions.config'");
    expect(componentSource).toContain("from './TrainerHomeQuickActions.styles'");
    expect(quickActionStyles).toContain('export const QuickGrid');
    expect(quickActionStyles).toContain('grid-template-columns: repeat(3, minmax(0, 1fr))');
    expect(quickActionStyles).toContain("min-height: ${({ $primary }) => ($primary ? '78px' : '64px')}");
    expect(quickActionStyles).toContain('@media (max-width: 520px) { grid-template-columns: 1fr; }');
  });

  it('builds a trainer Home Coach path with a compact no-PII day snapshot', () => {
    const route = buildTrainerHomeCoachPath({
      sessionsToday: 3,
      clientsToday: 2,
      completionRate: 67,
      hasNextActionableSession: true,
    });
    const url = new URL(route, 'https://sswanstudios.test');
    const prompt = url.searchParams.get('teachPrompt') || '';

    expect(url.pathname).toBe('/dashboard/trainer/coach-assistant');
    expect(prompt).toContain('3 sessions today');
    expect(prompt).toContain('2 clients today');
    expect(prompt).toContain('67% complete');
    expect(prompt).toContain('next booked client needs action');
    expect(prompt).not.toMatch(/name|email|phone|Ada|Lovelace|Grace|Hopper/i);
    expect(prompt.length).toBeLessThan(460);
  });
});

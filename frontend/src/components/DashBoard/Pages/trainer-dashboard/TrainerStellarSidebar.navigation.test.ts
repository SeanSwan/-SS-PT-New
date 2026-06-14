import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { TRAINER_HOME_COACH_PATH } from './TrainerHomeQuickActions.config';
import { trainerNavConfig } from './TrainerStellarSidebar';

const dashboardLayoutSource = readFileSync(resolve(__dirname, '../../UniversalDashboardLayout.tsx'), 'utf8');

function trainerRoutesBlock(): string {
  const roleConfigurationsStart = dashboardLayoutSource.indexOf('const roleConfigurations');
  const start = dashboardLayoutSource.indexOf('  trainer: {', roleConfigurationsStart);
  const end = dashboardLayoutSource.indexOf('  client: {', start);
  expect(roleConfigurationsStart).toBeGreaterThan(-1);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return dashboardLayoutSource.slice(start, end);
}

describe('TrainerStellarSidebar navigation priority', () => {
  it('keeps daily client workout actions beside assigned clients', () => {
    const clientClusterLabels = trainerNavConfig
      .find((group) => group.section === 'CLIENTS')
      ?.items.map((item) => item.label);

    expect(clientClusterLabels).toEqual([
      'My Clients',
      'Log Workout',
      'Client Progress',
      'Messages',
    ]);
  });

  it('routes the sidebar Log Workout entry through client selection instead of an empty logger', () => {
    const logWorkoutItem = trainerNavConfig
      .find((group) => group.section === 'CLIENTS')
      ?.items.find((item) => item.label === 'Log Workout');

    expect(logWorkoutItem?.path).toBe('/dashboard/trainer/clients?intent=log_workout');
  });

  it('routes Swan Coach sidebar entry into the trainer command context', () => {
    const coachItem = trainerNavConfig
      .find((group) => group.section === 'STUDIO')
      ?.items.find((item) => item.label === 'Swan Coach');

    expect(coachItem?.path).toBe(TRAINER_HOME_COACH_PATH);
  });

  it('mounts the trainer Coach route on the command center, not the legacy assistant shell', () => {
    const trainerBlock = trainerRoutesBlock();

    expect(trainerBlock).toContain("{ path: '/coach-assistant', component: CoachCommandCenterPage");
    expect(trainerBlock).not.toContain("{ path: '/coach-assistant', component: SwanCoachAssistantPage");
  });
});

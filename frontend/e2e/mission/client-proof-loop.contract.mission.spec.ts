/**
 * Mission QA: client proof loop.
 *
 * Contract mode verifies SwanStudios' core promise without production writes:
 * current workout visibility -> progress proof route -> 12-chart data surface.
 */

import { expect, test } from '@playwright/test';
import {
  installMissionUser,
  mockClientProgressMissionApi,
  watchConsoleErrors,
  type MissionApiState,
} from './missionHarness';

test.describe.configure({ retries: 0 });

function missionExpectedConsoleNoise(message: string) {
  if (/preloaded using link preload/i.test(message)) return true;

  return process.env.SWAN_MISSION_QA_MODE === 'contract'
    && /WebSocket connection to 'ws:\/\/(?:localhost|127\.0\.0\.1):10000\/socket\.io\//i.test(message);
}

test('@mission @contract @readonly client sees assignment, log CTA, and progress proof charts', async ({ page }, testInfo) => {
  expect(process.env.SWAN_MISSION_QA_ALLOW_WRITES || '0').toBe('0');

  const apiState: MissionApiState = { blockedWrites: [], currentWorkoutAssignments: [] };
  const consoleErrors = watchConsoleErrors(page);
  await mockClientProgressMissionApi(page, apiState);
  await installMissionUser(page);

  await page.goto('/dashboard/client/overview', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => undefined);

  const currentWorkoutCard = page.getByTestId('current-workout-card');
  await expect(currentWorkoutCard).toBeVisible();
  await expect(page.getByText(/current workout|today's assignment/i)).toBeVisible();
  await expect(page.getByText(/lower body strength/i).first()).toBeVisible();
  await expect(page.getByText(/coach homework/i)).toBeVisible();
  const logAssignmentButton = currentWorkoutCard.getByRole('button', { name: /log today's assignment/i });
  await expect(logAssignmentButton).toBeVisible();
  await expect(logAssignmentButton).toHaveText(/log assignment/i);

  await page.goto('/dashboard/client/progress', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => undefined);

  await expect(page.getByRole('heading', { name: /my progress/i })).toBeVisible();
  await expect(page.getByText(/wk workouts/i)).toBeVisible();
  await expect(page.getByText(/^3$/).first()).toBeVisible();
  await expect(page.getByTestId('canonical-progress-charts-grid')).toBeVisible();
  await expect(page.getByText(/progress overview - 12 of 12 charts populated/i)).toBeVisible();
  await expect(page.getByText(/goblet squat/i).first()).toBeVisible();

  const layout = await page.evaluate(() => ({
    overflowX: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
    bodyText: document.body.innerText,
  }));

  expect(layout.overflowX).toBeLessThanOrEqual(12);
  expect(layout.bodyText).not.toMatch(/demo mode|Sarah Johnson|Starter Fitness Package/i);
  expect(apiState.currentWorkoutAssignments).toContainEqual(expect.objectContaining({
    assignmentType: 'homework',
    sessionType: 'solo',
    isBillable: false,
    shouldDeductSession: false,
  }));
  expect(apiState.blockedWrites).toEqual([]);
  expect(consoleErrors.filter((item) => !missionExpectedConsoleNoise(item))).toEqual([]);

  await page.screenshot({ path: testInfo.outputPath('client-proof-loop.png'), fullPage: false });
});

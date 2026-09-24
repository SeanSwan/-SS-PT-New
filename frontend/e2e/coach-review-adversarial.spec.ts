import { expect, test } from '@playwright/test';
import { json, seed, mockApi } from './coachWorkspace.fixtures';
test('denied target must not expose locally restored Floor data', async ({ page }, info) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await seed(page);
  await mockApi(page);
  let refusals = 0;
  await page.route('**/api/ai-chat/target-access**', route => { refusals++; return json(route, { success: false, code: 'FORBIDDEN', error: 'Access denied' }, 403); });
  await page.addInitScript(() => {
    sessionStorage.setItem('swan-coach:floor:v2:1:admin:12', JSON.stringify({
      day: '2026-09-23', index: 0, exercises: [{ name: 'Private stored rehab exercise', targetSets: 3, targetReps: 6, sets: [{ weight: 145, reps: 6 }] }],
    }));
  });
  await page.goto('/dashboard/admin/coach-assistant?clientId=12');
  await expect(page.getByRole('navigation', { name: 'Coach view' })).toBeVisible();
  await expect.poll(() => refusals).toBeGreaterThan(0);
  await page.getByRole('navigation', { name: 'Coach view' }).getByRole('button', { name: 'Floor' }).click();
  await page.screenshot({ path: info.outputPath('denied-floor.png') });
  await expect(page.getByRole('heading', { name: 'Private stored rehab exercise' })).toHaveCount(0);
});

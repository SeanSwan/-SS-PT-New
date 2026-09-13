/**
 * Sprint Planner a11y + geometry, browser-verified (bucket-1 slice).
 *
 * Lane C findings this locks at the real browser boundary:
 *  - sprint cards and slot pills must be NATIVE buttons, not role="button" divs;
 *  - day/focus toggles and the timeline/calendar tabs must expose aria-pressed;
 *  - the SprintToggleButton floor is 44px (was 36px);
 *  - controls stay >= 44px tall at phone width (iPhone XR class) and desktop.
 *
 * API is stubbed at the network layer (no backend, no DB) exactly like the
 * other protected-surface smokes; the app runs as the real bundle.
 */
import { expect, test, type Page, type Route } from '@playwright/test';

const adminUser = {
  id: 1, email: 'qa.admin@swanstudios.local', username: 'qa_admin',
  firstName: 'QA', lastName: 'Admin', role: 'admin', isActive: true,
};

const sprints = [
  {
    id: 7, trainerId: 4, name: 'Q4 Hypertrophy Block', startDate: '2026-09-14',
    endDate: '2026-12-06', durationWeeks: 12, classesPerWeek: 3, status: 'active',
    progressionStrategy: 'linear', totalClassesPlanned: 36, totalClassesCompleted: 4,
  },
  {
    id: 8, trainerId: 4, name: 'Conditioning Base', startDate: '2026-10-01',
    endDate: '2026-11-26', durationWeeks: 8, classesPerWeek: 2, status: 'draft',
    progressionStrategy: 'undulating', totalClassesPlanned: 16, totalClassesCompleted: 0,
  },
];

const sprintDetail = {
  ...sprints[0],
  notes: null, spaceProfileId: null, defaultFormat: '4x4_r2', defaultStyle: 'standard',
  weeks: [
    {
      id: 701, weekNumber: 1, isDeloadWeek: false, intensityModifier: 1.0,
      startDate: '2026-09-14', endDate: '2026-09-20', theme: null,
      classSlots: [
        { id: 9001, sprintId: 7, weekId: 701, dayOfWeek: 1, scheduledDate: '2026-09-14', dayType: 'lower_body', classFormat: '4x4_r2', classStyle: 'standard', status: 'planned' },
        { id: 9002, sprintId: 7, weekId: 701, dayOfWeek: 3, scheduledDate: '2026-09-16', dayType: 'upper_body', classFormat: '4x4_r2', classStyle: 'standard', status: 'planned' },
      ],
    },
    {
      id: 702, weekNumber: 2, isDeloadWeek: false, intensityModifier: 1.05,
      startDate: '2026-09-21', endDate: '2026-09-27', theme: null,
      classSlots: [
        { id: 9003, sprintId: 7, weekId: 702, dayOfWeek: 1, scheduledDate: '2026-09-21', dayType: 'full_body', classFormat: '4x4_r2', classStyle: 'standard', status: 'planned' },
      ],
    },
  ],
};

async function fulfillJson(route: Route, body: unknown, status = 200) {
  await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

async function stubSprintApi(page: Page) {
  await page.route('**/health**', async (route) => fulfillJson(route, { status: 'ok' }));
  await page.route('**/api/**', async (route) => {
    const endpoint = new URL(route.request().url()).pathname;
    if (endpoint === '/api/auth/me' || endpoint === '/api/profile') return fulfillJson(route, { success: true, user: adminUser });
    if (endpoint === '/api/auth/clients') return fulfillJson(route, { success: true, clients: [] });
    if (endpoint === '/api/subscriptions/status') {
      return fulfillJson(route, { success: true, subscription: { tier: 'pro', status: 'active', isInTrial: false, hasFullAIAccess: true }, usage: {} });
    }
    if (endpoint === '/api/bootcamp/sprints' && route.request().method() === 'GET') {
      return fulfillJson(route, { success: true, sprints });
    }
    if (/^\/api\/bootcamp\/sprints\/\d+$/.test(endpoint) && route.request().method() === 'GET') {
      return fulfillJson(route, { success: true, sprint: sprintDetail });
    }
    return fulfillJson(route, { success: true });
  });
}

test.beforeEach(async ({ page }) => {
  await stubSprintApi(page);
  await page.addInitScript(() => {
    window.localStorage.setItem('token', 'qa.token.signature');
  });
});

test('cards and slot pills are native buttons; no role=button divs remain', async ({ page }) => {
  await page.goto('/sprint-planner');
  await expect(page.getByRole('button', { name: /Open sprint Q4 Hypertrophy Block/ })).toBeVisible();

  await page.getByRole('button', { name: /Open sprint Q4 Hypertrophy Block/ }).click();
  await expect(page.getByRole('button', { name: /Open 2026-09-14 lower body class/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Open \d{4}-\d{2}-\d{2}/ })).toHaveCount(3);

  // The lane C defect, stated as its absence: zero divs masquerading as buttons.
  expect(await page.locator('div[role="button"]').count()).toBe(0);
});

test('timeline/calendar tabs expose aria-pressed', async ({ page }) => {
  await page.goto('/sprint-planner');
  await page.getByRole('button', { name: /Open sprint Q4 Hypertrophy Block/ }).click();

  const timeline = page.getByRole('button', { name: 'Timeline' });
  const calendar = page.getByRole('button', { name: 'Calendar' });
  await expect(timeline).toHaveAttribute('aria-pressed', 'true');
  await expect(calendar).toHaveAttribute('aria-pressed', 'false');

  await calendar.click();
  await expect(calendar).toHaveAttribute('aria-pressed', 'true');
  await expect(timeline).toHaveAttribute('aria-pressed', 'false');
});

test('day/focus toggles are aria-pressed and meet the 44px floor', async ({ page }) => {
  await page.goto('/sprint-planner');
  await page.getByRole('button', { name: /New Sprint|Create First Sprint/ }).click();

  const monday = page.getByRole('button', { name: 'MON', exact: true });
  await expect(monday).toBeVisible();
  await expect(monday).toHaveAttribute('aria-pressed', 'false');
  await monday.click();
  await expect(monday).toHaveAttribute('aria-pressed', 'true');

  const box = await monday.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.height).toBeGreaterThanOrEqual(44);
});

test('interactive controls hold 44px minimum height at phone width', async ({ page }) => {
  await page.setViewportSize({ width: 414, height: 896 });
  await page.goto('/sprint-planner');

  const card = page.getByRole('button', { name: /Open sprint Q4 Hypertrophy Block/ });
  await expect(card).toBeVisible();
  const cardBox = await card.boundingBox();
  expect(cardBox!.height).toBeGreaterThanOrEqual(44);

  await page.getByRole('button', { name: /New Sprint|Create First Sprint/ }).click();
  for (const name of ['MON', 'TUE', 'WED']) {
    const toggle = page.getByRole('button', { name, exact: true });
    await expect(toggle).toBeVisible();
    const box = await toggle.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44);
  }
});

test('slot detail opens via keyboard and returns focus to the originating pill on close', async ({ page }) => {
  await page.goto('/sprint-planner');
  await page.getByRole('button', { name: /Open sprint Q4 Hypertrophy Block/ }).click();

  const pill = page.getByRole('button', { name: /Open 2026-09-14 lower body class/i });
  await pill.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(pill).toBeFocused();
});

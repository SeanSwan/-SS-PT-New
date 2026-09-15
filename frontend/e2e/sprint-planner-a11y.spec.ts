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

// Same shape api.service reads; tokenTimestamp gates the "stale token" path.
function jwt() {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return [
    encode({ alg: 'none', typ: 'JWT' }),
    encode({ iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 3600 }),
    'qa-signature',
  ].join('.');
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
  await page.addInitScript(
    ({ token, user }) => {
      localStorage.setItem('token', token);
      localStorage.setItem('tokenTimestamp', Date.now().toString());
      localStorage.setItem('user', JSON.stringify(user));
    },
    { token: jwt(), user: adminUser },
  );
});

test('cards and slot pills are native buttons; no role=button divs remain', async ({ page }) => {
  await page.goto('/sprint-planner');
  await expect(page.getByRole('button', { name: /Open sprint Q4 Hypertrophy Block/ })).toBeVisible();

  await page.getByRole('button', { name: /Open sprint Q4 Hypertrophy Block/ }).click();
  await expect(page.getByRole('button', { name: /Open 2026-09-14 lower body class/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Open \d{4}-\d{2}-\d{2}/ })).toHaveCount(3);

  // The lane C defect, stated per element: each card/pill is a REAL <button>,
  // not a role="button" div. (The dashboard SHELL outside this page has its own
  // role=button divs — out of slice scope.)
  for (const name of [/Open sprint Q4 Hypertrophy Block/, /Open sprint Conditioning Base/, /Open 2026-09-14 lower body class/i]) {
    expect(await page.getByRole('button', { name }).evaluateAll(nodes => nodes.every(n => n.tagName === 'BUTTON'))).toBe(true);
  }
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
  // Monday may start pre-selected (modal default): assert the toggle FLIPS.
  const pressedBefore = await monday.getAttribute('aria-pressed');
  await monday.click();
  await expect(monday).toHaveAttribute('aria-pressed', pressedBefore === 'true' ? 'false' : 'true');

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

test('slot detail opens via keyboard and returns focus to the originating pill on close @xr', async ({ page }) => {
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


test('workout-planner surface: saved-plan cards, lens cards and shell are native buttons @xr', async ({ page }) => {
  await page.goto('/workout-planner');
  await page.waitForLoadState('networkidle');
  // The whole census rule, stated as its absence on the planner surface.
  await expect(async () => {
    expect(await page.locator('div[role="button"]').count()).toBe(0);
  }).toPass({ timeout: 5_000 });
  const planCard = page.locator('button.lens2-row').first();
  if (await planCard.count()) {
    expect(await planCard.evaluate(n => n.tagName)).toBe('BUTTON');
    const box = await planCard.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44);
  }
});

test('master-schedule surface: session cards, slots, headers and stats are native buttons @xr', async ({ page }) => {
  await page.route('**/api/sessions/**', async (route) => {
    const endpoint = new URL(route.request().url()).pathname;
    if (endpoint.endsWith('/stats')) {
      return fulfillJson(route, { success: true, stats: { total: 1, available: 0, booked: 1, confirmed: 0, completed: 0, cancelled: 0, blocked: 0, upcoming: 1 } });
    }
    if (endpoint.endsWith('/users/trainers')) return fulfillJson(route, [{ id: 't-qa', firstName: 'QA', lastName: 'Trainer', role: 'trainer' }]);
    if (endpoint.endsWith('/users/clients')) return fulfillJson(route, [{ id: 'c-qa', firstName: 'QA', lastName: 'Client', role: 'client' }]);
    return fulfillJson(route, { success: true, sessions: [], data: [] });
  });
  await page.goto('/master-schedule');
  await expect(page.getByRole('button', { name: /New Sprint|Create|Schedule|Add/i }).first()).toBeVisible().catch(() => {});
  await page.waitForLoadState('networkidle');
  await expect(async () => {
    expect(await page.locator('div[role="button"]').count()).toBe(0);
  }).toPass({ timeout: 5_000 });
  // A real control to prove the page is interactive, not an empty shell
  // (schedule content renders outside <main>; count all buttons).
  const anyNative = await page.locator('button:visible').count();
  expect(anyNative).toBeGreaterThan(3);
});

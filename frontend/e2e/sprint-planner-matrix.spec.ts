/**
 * Sprint Planner across the FULL 20-viewport matrix (bucket-1 extension).
 *
 * Same viewport table as the coach mobile gate (12 phone incl. the 320px
 * floor, 8 tablet/desktop incl. 4K). Per viewport: no horizontal page
 * overflow, ZERO div[role="button"] (cards, pills and the shell FAB are all
 * native buttons now), and the interactive controls hold the 44px floor.
 * API is stubbed at the route layer; the app runs as the real bundle.
 */
import { expect, test, type Page, type Route } from '@playwright/test';

const adminUser = { id: 1, email: 'qa.admin@local', username: 'qa_admin', firstName: 'QA', lastName: 'Admin', role: 'admin', isActive: true };

const sprints = [{ id: 7, trainerId: 4, name: 'Q4 Hypertrophy Block', startDate: '2026-09-14', endDate: '2026-12-06', durationWeeks: 12, classesPerWeek: 3, status: 'active', progressionStrategy: 'linear', totalClassesPlanned: 36, totalClassesCompleted: 4 }];
const sprintDetail = { ...sprints[0], notes: null, spaceProfileId: null, defaultFormat: '4x4_r2', defaultStyle: 'standard',
  weeks: [{ id: 701, weekNumber: 1, isDeloadWeek: false, intensityModifier: 1.0, startDate: '2026-09-14', endDate: '2026-09-20', theme: null,
    classSlots: [
      { id: 9001, sprintId: 7, weekId: 701, dayOfWeek: 1, scheduledDate: '2026-09-14', dayType: 'lower_body', classFormat: '4x4_r2', classStyle: 'standard', status: 'planned' },
      { id: 9002, sprintId: 7, weekId: 701, dayOfWeek: 3, scheduledDate: '2026-09-16', dayType: 'upper_body', classFormat: '4x4_r2', classStyle: 'standard', status: 'planned' },
    ] }] };

const VIEWPORTS = [
  { id: 'P1 XR', width: 414, height: 896, dpr: 2 },
  { id: 'P2', width: 390, height: 844, dpr: 3 },
  { id: 'P3', width: 393, height: 852, dpr: 3 },
  { id: 'P4', width: 375, height: 812, dpr: 3 },
  { id: 'P5', width: 402, height: 874, dpr: 3 },
  { id: 'P6', width: 360, height: 780, dpr: 3 },
  { id: 'P7', width: 412, height: 915, dpr: 2.625 },
  { id: 'P8', width: 430, height: 932, dpr: 3 },
  { id: 'P9', width: 384, height: 832, dpr: 3.75 },
  { id: 'P10 SE', width: 375, height: 667, dpr: 2 },
  { id: 'P11', width: 440, height: 956, dpr: 3 },
  { id: 'P12 floor', width: 320, height: 568, dpr: 2 },
  { id: 'tablet portrait', width: 768, height: 1024, dpr: 1 },
  { id: 'tablet landscape', width: 1024, height: 768, dpr: 1 },
  { id: 'laptop', width: 1280, height: 800, dpr: 1 },
  { id: 'desktop', width: 1440, height: 900, dpr: 1 },
  { id: '1080p', width: 1920, height: 1080, dpr: 1 },
  { id: 'QHD', width: 2560, height: 1440, dpr: 1 },
  { id: 'ultrawide', width: 3440, height: 1440, dpr: 1 },
  { id: '4K', width: 3840, height: 2160, dpr: 1 },
];

async function fulfillJson(route: Route, body: unknown) {
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
}

test.beforeEach(async ({ page }) => {
  await page.route('**/api/**', async (route) => {
    const endpoint = new URL(route.request().url()).pathname;
    if (endpoint === '/api/auth/me' || endpoint === '/api/profile') return fulfillJson(route, { success: true, user: adminUser });
    if (endpoint === '/api/bootcamp/sprints' && route.request().method() === 'GET') return fulfillJson(route, { success: true, sprints });
    if (/^\/api\/bootcamp\/sprints\/\d+$/.test(endpoint)) return fulfillJson(route, { success: true, sprint: sprintDetail });
    return fulfillJson(route, { success: true });
  });
  await page.addInitScript(
    ({ token, user }) => {
      localStorage.setItem('token', token);
      localStorage.setItem('tokenTimestamp', Date.now().toString());
      localStorage.setItem('user', JSON.stringify(user));
    },
    {
      token: [
        Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url'),
        Buffer.from(JSON.stringify({ iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url'),
        'qa-signature',
      ].join('.'),
      user: adminUser,
    },
  );
});

test('sprint planner holds a11y + geometry across the full viewport matrix @matrix', async ({ page }) => {
  for (const viewport of VIEWPORTS) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto('/sprint-planner');
    await expect(page.getByRole('button', { name: /Open sprint Q4 Hypertrophy Block/ })).toBeVisible();

    // No horizontal page overflow at any width.
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `${viewport.id}: horizontal overflow ${overflow}px`).toBeLessThanOrEqual(1);

    // The shell FAB and every planner control are native buttons. Retried:
    // late-mounting mobile shell pieces can flash a stale frame mid-hydration;
    // the SETTLED page is the contract.
    await expect(async () => {
      expect(await page.locator('div[role="button"]').count(), `${viewport.id}: div[role=button] count`).toBe(0);
    }).toPass({ timeout: 5_000 });

    // 44px floor on the visible planner controls.
    const card = page.getByRole('button', { name: /Open sprint Q4 Hypertrophy Block/ });
    const cardBox = await card.boundingBox();
    expect(cardBox!.height, `${viewport.id}: card height`).toBeGreaterThanOrEqual(44);

    // Activate via keyboard: at some widths Playwright's auto-scroll parks the
    // control under the fixed header, whose buttons intercept pointer events.
    // Keyboard activation is interception-proof and is the a11y path anyway.
    const newSprint = page.getByRole('button', { name: /New Sprint|Create First Sprint/ });
    await newSprint.focus();
    await page.keyboard.press('Enter');
    const monday = page.getByRole('button', { name: 'MON', exact: true });
    await expect(monday).toBeVisible();
    const toggleBox = await monday.boundingBox();
    expect(toggleBox!.height, `${viewport.id}: toggle height`).toBeGreaterThanOrEqual(44);
    await page.keyboard.press('Escape');
  }
});

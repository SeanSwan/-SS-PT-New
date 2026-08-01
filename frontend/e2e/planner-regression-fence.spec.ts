/**
 * S13 planner golden snapshots.
 *
 * These use the real mounted planner route with only browser-level API stubs:
 * no production data or credentials are involved. The screenshots protect
 * S14-S18 refactors from changing the established studio-classic surface.
 */
import { expect, test, type Page, type Route } from '@playwright/test';

const adminUser = {
  id: 1, email: 'qa.admin@swanstudios.local', username: 'qa_admin',
  firstName: 'QA', lastName: 'Admin', role: 'admin', isActive: true,
};
const qaClient = {
  id: 91, firstName: 'QA', lastName: 'Client', email: 'qa.client@swanstudios.local',
  role: 'client', canGenerateWorkoutPlans: true,
};
const exercises = [
  {
    id: 'goblet-squat', exerciseKey: 'goblet-squat', name: 'Goblet Squat',
    exerciseType: 'compound', difficulty: 320, primaryMuscles: ['quadriceps'],
    equipmentNeeded: ['Dumbbell'], bodyPartCategory: 'legs',
  },
  {
    id: 'supported-row', exerciseKey: 'supported-row', name: 'Supported Dumbbell Row',
    exerciseType: 'compound', difficulty: 280, primaryMuscles: ['back'],
    equipmentNeeded: ['Dumbbell', 'Bench'], bodyPartCategory: 'back',
  },
];
const viewports = [
  // Blueprint goldens retain these five exact widths.
  { name: '375', width: 375, height: 812, golden: true },
  { name: '430', width: 430, height: 932, golden: true },
  { name: '768', width: 768, height: 1024, golden: true },
  { name: '1280', width: 1280, height: 960, golden: true },
  { name: '1920', width: 1920, height: 1080, golden: true },
  // Rule 24 matrix: exercise the interaction/overflow fence at each required width.
  { name: '320', width: 320, height: 568, golden: false },
  { name: '414', width: 414, height: 896, golden: false },
  { name: '1024', width: 1024, height: 768, golden: false },
  { name: '1440', width: 1440, height: 900, golden: false },
  { name: '2560', width: 2560, height: 1440, golden: false },
  { name: '3840', width: 3840, height: 2160, golden: false },
] as const;

const jwt = () => {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return [encode({ alg: 'none', typ: 'JWT' }), encode({ iat: 1, exp: 4_102_444_800 }), 'qa-signature'].join('.');
};

const fulfillJson = async (route: Route, body: unknown, status = 200) => {
  await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
};

const unmockedEndpoints: string[] = [];

const isPlannerEndpoint = (endpoint: string) => (
  endpoint === '/api/auth/clients'
  || endpoint === '/api/exercises/library'
  || endpoint === '/api/equipment-profiles'
  || endpoint.startsWith('/api/workout-plans')
  || endpoint.startsWith('/api/workout-builder')
  || endpoint.startsWith('/api/client-trainer-assignments')
  || endpoint.startsWith('/api/ai/debate/')
);

const mockPlannerApi = async (page: Page) => {
  await page.route('**/socket.io/**', route => route.abort());
  await page.route('**/health**', route => fulfillJson(route, { status: 'ok' }));
  await page.route('**/api/**', async route => {
    const endpoint = new URL(route.request().url()).pathname;
    if (endpoint === '/api/health') return fulfillJson(route, { status: 'ok' });
    if (endpoint === '/api/auth/me' || endpoint === '/api/profile') {
      return fulfillJson(route, { success: true, user: adminUser });
    }
    if (endpoint === '/api/auth/clients') return fulfillJson(route, { success: true, clients: [qaClient] });
    if (endpoint === '/api/exercises/library') {
      return fulfillJson(route, { success: true, exercises, count: exercises.length });
    }
    if (endpoint === '/api/equipment-profiles') return fulfillJson(route, { success: true, profiles: [] });
    if (endpoint === '/api/workout-plans') return fulfillJson(route, { success: true, plans: [] });
    if (endpoint.startsWith('/api/workout-plans/backup/')) {
      return fulfillJson(route, { success: true, backup: null });
    }
    if (isPlannerEndpoint(endpoint)) {
      unmockedEndpoints.push(`${route.request().method()} ${endpoint}`);
      return fulfillJson(route, { error: `S13 fence: unmocked planner endpoint ${endpoint}` }, 501);
    }
    // Dashboard-shell traffic is outside this planner fence; keep it inert so
    // an unrelated polling loop cannot hide or prevent a planner assertion.
    return fulfillJson(route, { success: true, data: [], notifications: [], sessions: [], stats: {} });
  });
};

test.beforeEach(async ({ page }) => {
  unmockedEndpoints.length = 0;
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await mockPlannerApi(page);
  await page.addInitScript(({ token, user }) => {
    localStorage.setItem('token', token);
    localStorage.setItem('tokenTimestamp', '4102444800000');
    localStorage.setItem('user', JSON.stringify(user));
  }, { token: jwt(), user: adminUser });
});

for (const viewport of viewports) {
  test(`planner studio-classic golden at ${viewport.name}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/dashboard/admin/workout-planner', { waitUntil: 'domcontentloaded' });
    await page.addStyleTag({ content: `
      *, *::before, *::after { animation: none !important; transition: none !important; }
    ` });
    await expect(page.getByRole('heading', { name: /workout planner/i, level: 1 })).toBeVisible();
    await page.evaluate(async () => { await document.fonts.ready; });
    await page.getByLabel('Select client').selectOption('91');
    await expect(page.getByText('Exercise Rolodex', { exact: true })).toBeVisible();
    await expect(page.getByText('2 results', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Add Goblet Squat' }).click();
    await page.getByRole('button', { name: 'Add Supported Dumbbell Row' }).click();
    await expect(page.getByRole('button', { name: 'Remove Goblet Squat' })).toBeVisible();

    if (viewport.width <= 414) {
      const box = await page.getByRole('button', { name: 'Remove Goblet Squat' }).boundingBox();
      expect(box?.width, `touch target width at ${viewport.width}px`).toBeGreaterThanOrEqual(44);
      expect(box?.height, `touch target height at ${viewport.width}px`).toBeGreaterThanOrEqual(44);
    }
    const { overflowers, masked, documentOverflow } = await page.evaluate(() => {
      const overflowers: string[] = [];
      for (const element of document.querySelectorAll<HTMLElement>('body *')) {
        // Native editable controls use an internal scroll area for long values;
        // that is reachable text editing, not clipped layout content.
        if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) continue;
        if (element.scrollWidth - element.clientWidth > 1) {
          const overflowX = getComputedStyle(element).overflowX;
          if (overflowX !== 'auto' && overflowX !== 'scroll') {
            overflowers.push(`${element.tagName}.${String(element.className)}`.slice(0, 120));
          }
        }
      }
      return {
        overflowers,
        masked: getComputedStyle(document.documentElement).overflowX === 'hidden'
          || getComputedStyle(document.body).overflowX === 'hidden',
        documentOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    });
    expect(masked, `overflow-x mask at ${viewport.width}px`).toBe(false);
    expect(overflowers, `clipped elements at ${viewport.width}px`).toEqual([]);
    expect(documentOverflow, `planner overflows at ${viewport.width}px`).toBeLessThanOrEqual(1);
    expect(unmockedEndpoints, `unmocked API calls at ${viewport.width}px`).toEqual([]);
    if (viewport.golden) {
      await expect(page).toHaveScreenshot(`planner-studio-classic-${viewport.name}.png`, {
        animations: 'disabled', caret: 'hide', fullPage: true,
      });
    }
  });
}

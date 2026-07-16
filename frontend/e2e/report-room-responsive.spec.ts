/**
 * ============================================================================
 * FILE: report-room-responsive.spec.ts
 * PURPOSE: Verify the authenticated voice-first Report Room as a real journey.
 * ROUTE: /support -> reporter issue API, receipt, and report history.
 * PRIVACY: Uses local-only QA identities and mocked support records.
 * ACCESSIBILITY: Checks named controls, keyboard validation, touch targets,
 *                reduced motion, and horizontal containment.
 * ============================================================================
 */
import { expect, test, type Browser, type Page, type Route } from '@playwright/test';

const demoUser = {
  id: 901,
  email: 'reporter.qa@swanstudios.local',
  username: 'reporter_qa',
  firstName: 'Report',
  lastName: 'Tester',
  role: 'client',
  hasLinkedWaiver: true,
  waiverStatus: 'linked',
  isActive: true,
};
const createdIssue = {
  id: '11111111-1111-4111-8111-111111111111',
  referenceCode: 'SWR-20260716-AB12CD34',
  category: 'workout',
  severity: 'high',
  status: 'new',
  source: 'text',
  title: 'Workout logger will not save',
  description: 'The save action returns me to the same unsaved workout.',
  expectedBehavior: 'The workout should save and appear in history.',
  impact: 'I cannot record today\'s training.',
  reproductionSteps: ['Open workout logger', 'Enter a set', 'Choose save'],
  diagnostics: { path: '/support' },
  lastActivityAt: '2026-07-16T18:00:00.000Z',
  createdAt: '2026-07-16T18:00:00.000Z',
  updatedAt: '2026-07-16T18:00:00.000Z',
  events: [],
};
const viewports = [
  { name: 'iPhone XR', width: 414, height: 896 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'QHD', width: 2560, height: 1440 },
  { name: '4K', width: 3840, height: 2160 },
] as const;

function jwt() {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return [encode({ alg: 'none', typ: 'JWT' }), encode({ iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 3600 }), 'qa'].join('.');
}

async function fulfillJson(route: Route, body: unknown, status = 200) {
  await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

async function installSession(page: Page) {
  await page.addInitScript(({ token, user }) => {
    localStorage.setItem('token', token);
    localStorage.setItem('tokenTimestamp', Date.now().toString());
    localStorage.setItem('user', JSON.stringify(user));
  }, { token: jwt(), user: demoUser });
}

async function mockApi(page: Page, submitted?: { payload?: Record<string, unknown> }) {
  await page.route('**/health', async (route) => fulfillJson(route, { status: 'ok' }));
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const endpoint = new URL(request.url()).pathname;
    if (endpoint === '/api/auth/me') return fulfillJson(route, { success: true, user: demoUser });
    if (endpoint === '/api/profile') return fulfillJson(route, { success: true, user: demoUser });
    if (endpoint === '/api/support/issues' && request.method() === 'GET') {
      return fulfillJson(route, { issues: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 } });
    }
    if (endpoint === '/api/support/issues' && request.method() === 'POST') {
      if (submitted) submitted.payload = request.postDataJSON() as Record<string, unknown>;
      return fulfillJson(route, { issue: createdIssue }, 201);
    }
    return fulfillJson(route, { success: true, data: [], items: [], notifications: [] });
  });
}

async function openReportRoom(page: Page) {
  await installSession(page);
  await mockApi(page);
  await page.goto('/support', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'The Report Room' })).toBeVisible();
}

test('member explains an issue, reviews it, and receives a durable receipt', async ({ page }) => {
  const submitted: { payload?: Record<string, unknown> } = {};
  await installSession(page);
  await mockApi(page, submitted);
  await page.goto('/support', { waitUntil: 'domcontentloaded' });

  await expect(page.getByRole('heading', { name: 'The Report Room' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start talking' }).or(page.getByText(/private on-device dictation is not available/i))).toBeVisible();
  await page.getByRole('button', { name: 'Send report' }).click();
  await expect(page.getByText('Add a short title with at least 4 characters.')).toBeVisible();
  await expect(page.getByLabel('Short title')).toBeFocused();

  await page.getByLabel('Issue type').selectOption('workout');
  await page.getByLabel('How urgent?').selectOption('high');
  await page.getByLabel('Short title').fill(createdIssue.title);
  await page.getByLabel('What happened?').fill(createdIssue.description);
  await page.getByLabel('What did you expect?').fill(createdIssue.expectedBehavior);
  await page.getByLabel('How did this affect you?').fill(createdIssue.impact);
  await page.getByRole('textbox', { name: 'Steps to repeat it' }).fill(createdIssue.reproductionSteps.join('\n'));
  await expect(page.getByText('Preview the agent-ready report')).toBeVisible();
  await page.getByRole('button', { name: 'Send report' }).click();

  await expect(page.locator('#support-receipt')).toContainText(createdIssue.referenceCode);
  expect(submitted.payload).toMatchObject({
    category: 'workout', severity: 'high', title: createdIssue.title,
    reproductionSteps: createdIssue.reproductionSteps,
  });
  expect(JSON.stringify(submitted.payload)).not.toContain(demoUser.email);
});

test('safe application-error handoff prefills route context without query data', async ({ page }) => {
  const submitted: { payload?: Record<string, unknown> } = {};
  await installSession(page);
  await mockApi(page, submitted);
  await page.goto('/support?source=error_boundary&code=ROUTE_RENDER_ERROR&path=/checkout&token=private', { waitUntil: 'domcontentloaded' });

  await expect(page.getByLabel('Short title')).toHaveValue('Problem on /checkout');
  await expect(page.getByLabel('What happened?')).toHaveValue('An application error interrupted what I was doing on /checkout.');
  await page.getByRole('button', { name: 'Send report' }).click();
  await expect(page.locator('#support-receipt')).toContainText(createdIssue.referenceCode);
  expect(submitted.payload).toMatchObject({
    source: 'error_boundary',
    diagnostics: { path: '/checkout', errorCode: 'ROUTE_RENDER_ERROR' },
  });
  expect(JSON.stringify(submitted.payload)).not.toContain('private');
});

async function auditViewport(browser: Browser, viewport: typeof viewports[number]) {
  const context = await browser.newContext({
    baseURL: process.env.BASE_URL || 'http://localhost:5173',
    viewport: { width: viewport.width, height: viewport.height },
    reducedMotion: 'reduce',
    serviceWorkers: 'block',
  });
  const page = await context.newPage();
  try {
    await openReportRoom(page);
    const audit = await page.evaluate(() => {
      const visible = (element: HTMLElement) => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
      };
      const reportRoom = Array.from(document.querySelectorAll('main')).find((main) => main.querySelector('h1')?.textContent === 'The Report Room');
      const controls = Array.from(reportRoom?.querySelectorAll<HTMLElement>('button, a, input, select, textarea') ?? []).filter(visible);
      return {
        overflow: document.documentElement.scrollWidth - window.innerWidth,
        clipped: controls.filter((element) => {
          const rect = element.getBoundingClientRect();
          return rect.left < -1 || rect.right > window.innerWidth + 1;
        }).map((element) => element.getAttribute('aria-label') || element.textContent?.trim() || element.tagName),
        smallTargets: controls.filter((element) => {
          const rect = element.getBoundingClientRect();
          return rect.width < 43.5 || rect.height < 43.5;
        }).map((element) => element.getAttribute('aria-label') || element.textContent?.trim() || element.tagName),
      };
    });
    return audit;
  } finally {
    await context.close();
  }
}

test('required responsive matrix contains every visible control at 44px or larger', async ({ browser }) => {
  const failures: string[] = [];
  for (const viewport of viewports) {
    const audit = await auditViewport(browser, viewport);
    if (audit.overflow > 1) failures.push(`${viewport.name}: horizontal overflow ${audit.overflow}px`);
    if (audit.clipped.length) failures.push(`${viewport.name}: clipped ${audit.clipped.join(', ')}`);
    if (audit.smallTargets.length) failures.push(`${viewport.name}: sub-44px ${audit.smallTargets.join(', ')}`);
  }
  expect(failures, failures.join('\n')).toEqual([]);
});

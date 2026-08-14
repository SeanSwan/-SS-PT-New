import { expect, test, type Page, type Route } from '@playwright/test';
import { isSuppressedProductNoise } from './mission/productNoise';

test.describe.configure({ retries: 0 });

const externalSmoke = process.env.SWAN_PLAYWRIGHT_SKIP_WEBSERVER === '1';
const includeLocalBundleRoutes = process.env.SWAN_SMOKE_LOCAL_BUNDLE_ROUTES === '1' && !externalSmoke;

const demoUser = {
  id: '101',
  email: 'qa.client@swanstudios.local',
  username: 'qa_client',
  firstName: 'QA',
  lastName: 'Client',
  role: 'client',
  hasLinkedWaiver: true,
  waiverStatus: 'linked',
  isActive: true,
};

const stableRoutes = [
  { path: '/user-dashboard', expectedPaths: ['/user-dashboard', '/dashboard/client/overview'] },
  { path: '/dashboard/client/overview', expectedPaths: ['/dashboard/client/overview'] },
  { path: '/dashboard/client/progress', expectedPaths: ['/dashboard/client/progress'] },
  { path: '/dashboard/client/progress/detailed', expectedPaths: ['/dashboard/client/progress/detailed'] },
  { path: '/dashboard/client/community', expectedPaths: ['/dashboard/client/community'] },
  { path: '/dashboard/client/rewards', expectedPaths: ['/dashboard/client/rewards'] },
  {
    path: '/dashboard/client/coach-assistant?sourcePath=%2Fdashboard%2Fclient%2Fcommunity',
    expectedPaths: ['/dashboard/client/coach-assistant'],
  },
];

const localBundleRoutes = [
  { path: '/dashboard/client/overview/reels', expectedPaths: ['/dashboard/client/overview/reels'] },
  { path: '/dashboard/client/overview/friends', expectedPaths: ['/dashboard/client/overview/friends'] },
  { path: '/dashboard/client/overview/challenges', expectedPaths: ['/dashboard/client/overview/challenges'] },
];

const routes = includeLocalBundleRoutes ? [...stableRoutes, ...localBundleRoutes] : stableRoutes;

type FailedResource = {
  status: number;
  url: string;
  failureText?: string;
};

function isSocketTransportFailure(resource: FailedResource) {
  if (resource.status !== 0) return false;

  try {
    return new URL(resource.url).pathname === '/socket.io/';
  } catch {
    return false;
  }
}

function isKnownRealtimeTransportNoise(message: string, failedResources: FailedResource[]) {
  if (/Failed to load resource: net::ERR_CONNECTION_REFUSED/i.test(message)) {
    const transportFailures = failedResources.filter((resource) => (
      resource.status === 0
      && /ERR_CONNECTION_REFUSED/i.test(resource.failureText ?? '')
    ));
    return transportFailures.length > 0 && transportFailures.every(isSocketTransportFailure);
  }
  if (!/Failed to load resource: the server responded with a status of 400/i.test(message)) return false;

  return failedResources.some((resource) => {
    if (resource.status !== 400) return false;

    const url = new URL(resource.url);
    return url.pathname === '/socket.io/' && url.searchParams.get('transport') === 'polling';
  });
}

function actionableConsoleErrors(consoleErrors: string[], failedResources: FailedResource[]) {
  const socketCorsNoise = consoleErrors.some((item) => /\/socket\.io\/.*blocked by CORS/i.test(item));
  return consoleErrors.filter((item) => {
    if (isSuppressedProductNoise(item)) return false;
    if (/\/socket\.io\/.*blocked by CORS/i.test(item) || (socketCorsNoise && /Failed to load resource: net::ERR_FAILED/i.test(item))) return false;
    if (isKnownRealtimeTransportNoise(item, failedResources)) return false;
    return true;
  });
}

function jwt() {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return [
    encode({ alg: 'none', typ: 'JWT' }),
    encode({ iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 3600 }),
    'qa-signature',
  ].join('.');
}

async function fulfillJson(route: Route, body: unknown) {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

async function mockDashboardApi(page: Page) {
  await page.route('**/health**', async (route) => fulfillJson(route, { status: 'ok' }));

  await page.route('**/api/**', async (route) => {
    const endpoint = new URL(route.request().url()).pathname;

    if (endpoint === '/api/cart') return fulfillJson(route, { id: 1, status: 'active', items: [], total: 0, totalSessions: 0 });

    if (endpoint === '/api/auth/me') return fulfillJson(route, { user: demoUser });
    if (endpoint === '/api/profile') return fulfillJson(route, { success: true, user: demoUser });
    if (/^\/api\/profile\/(?:[^/]+\/)?posts$/.test(endpoint)) return fulfillJson(route, { success: true, posts: [], pagination: { limit: 20, offset: 0, total: 0 } });
    if (endpoint === '/api/profile/stats') {
      return fulfillJson(route, {
        success: true,
        stats: { posts: 1, followers: 0, following: 0, points: 1240, level: 2, streak: 4 },
      });
    }
    if (endpoint === '/api/v1/gamification/profile') {
      return fulfillJson(route, {
        profile: {
          userId: demoUser.id,
          points: 1240,
          level: 2,
          tier: 'bronze_forge',
          streakDays: 4,
          userAchievements: [],
          recentTransactions: [],
        },
      });
    }
    if (endpoint === '/api/social/posts/feed') {
      return fulfillJson(route, {
        success: true,
        posts: [
          {
            id: 'post-1',
            userId: demoUser.id,
            content: 'QA dashboard feed post',
            type: 'general',
            visibility: 'public',
            createdAt: '2026-05-15T12:00:00.000Z',
            user: demoUser,
            likesCount: 0,
            commentsCount: 0,
          },
        ],
        pagination: { total: 1, limit: 10, offset: 0 },
      });
    }
    if (endpoint === '/api/workouts/101/current') {
      return fulfillJson(route, {
        success: true,
        data: {
          id: 'plan-qa-six-month',
          title: 'Lower Body Strength Assignment With Long Mobile-Safe Copy',
          todayAssignment: {
            assignmentKey: 'plan-qa-six-month:w2:d3:homework',
            assignmentType: 'homework',
            sessionType: 'solo',
            isLoggable: true,
            ctaLabel: 'Log Assignment',
            weekNumber: 2,
            dayNumber: 3,
            exerciseCount: 4,
            firstExerciseName: 'Goblet Squat',
          },
          homeworkSummary: {
            assignmentType: 'homework',
            todayIsLoggable: true,
            recentCompletedCount: 2,
            recentCompletions: [],
          },
        },
      });
    }
    if (endpoint.includes('/weekly-recap')) {
      return fulfillJson(route, { success: true, current: { streak: 4, xp: 1240 }, data: [] });
    }

    return fulfillJson(route, {
      success: true,
      data: [],
      achievements: [],
      rewards: [],
      leaderboard: [],
      challenges: [],
      posts: [],
      notifications: [],
    });
  });
}

async function inspectLayout(page: Page) {
  return page.evaluate(() => {
    const visible = (element: Element) => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
    };
    const controls = [...document.querySelectorAll('a,button,[role="button"],[role="tab"]')].filter(visible);
    const smallTargets = controls
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          label: (element.textContent || element.getAttribute('aria-label') || '').trim().slice(0, 80),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        };
      })
      .filter((item) => item.width < 44 || item.height < 44);

    return {
      bodyLength: Math.max(
        document.body.innerText.trim().length,
        document.body.textContent?.trim().length || 0,
      ),
      overflowX: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
      smallTargets,
    };
  });
}

async function inspectCurrentWorkoutPriorityCard(page: Page) {
  return page.evaluate(() => {
    const card = [...document.querySelectorAll('[data-testid="current-workout-card"]')]
      .find((element) => {
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
      });
    if (!card) return null;
    const rect = card.getBoundingClientRect();
    const button = card.querySelector('button');
    const buttonRect = button?.getBoundingClientRect();
    return {
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      cardTop: Math.round(rect.top),
      cardBottom: Math.round(rect.bottom),
      cardOverflowX: Math.max(0, card.scrollWidth - card.clientWidth),
      buttonWidth: buttonRect ? Math.round(buttonRect.width) : 0,
      buttonHeight: buttonRect ? Math.round(buttonRect.height) : 0,
    };
  });
}

test.beforeEach(async ({ page }) => {
  await mockDashboardApi(page);
  await page.addInitScript(
    ({ token, user }) => {
      localStorage.setItem('token', token);
      localStorage.setItem('tokenTimestamp', Date.now().toString());
      localStorage.setItem('user', JSON.stringify(user));
    },
    { token: jwt(), user: demoUser }
  );
});

for (const route of routes) {
  test(`client dashboard route smoke: ${route.path}`, async ({ page }, testInfo) => {
    const consoleErrors: string[] = [];
    const failedResources: FailedResource[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('pageerror', (error) => consoleErrors.push(error.message));
    page.on('response', (response) => {
      if (response.status() >= 400) failedResources.push({ status: response.status(), url: response.url() });
    });
    page.on('requestfailed', (request) => {
      failedResources.push({
        status: 0,
        url: request.url(),
        failureText: request.failure()?.errorText,
      });
    });

    await page.goto(route.path, { waitUntil: 'domcontentloaded' });
    await page.screenshot({ path: testInfo.outputPath('viewport.png'), fullPage: false });

    const layout = await inspectLayout(page);
    expect(route.expectedPaths).toContain(new URL(page.url()).pathname);
    expect(layout.bodyLength).toBeGreaterThan(80);
    expect(layout.overflowX).toBeLessThanOrEqual(12);
    expect(layout.smallTargets).toEqual([]);
    if (route.path === '/dashboard/client/overview') {
      await expect(page.getByTestId('current-workout-card')).toBeVisible({
        timeout: 15_000,
      });
      const priorityCard = await inspectCurrentWorkoutPriorityCard(page);
      expect(priorityCard).not.toBeNull();
      expect(priorityCard?.cardOverflowX).toBe(0);
      expect(priorityCard?.buttonWidth).toBeGreaterThanOrEqual(44);
      expect(priorityCard?.buttonHeight).toBeGreaterThanOrEqual(44);
      if ((priorityCard?.viewportWidth || 0) <= 600) {
        const workoutPriorityBoundary = Math.ceil((priorityCard?.viewportHeight || 0) * 0.72);
        expect(priorityCard?.cardTop).toBeLessThanOrEqual(workoutPriorityBoundary);
      }
    }
    expect(actionableConsoleErrors(consoleErrors, failedResources)).toEqual([]);
  });
}

test('client overview lens buttons stay inside the observatory route', async ({ page }) => {
  test.skip(!includeLocalBundleRoutes, 'Lens route assertions are opt-in and require the matching local bundle.');

  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(error.message));

  await page.goto('/dashboard/client/overview', { waitUntil: 'domcontentloaded' });

  for (const [label, expectedPath] of [
    ['Reels', '/dashboard/client/overview/reels'],
    ['Friends', '/dashboard/client/overview/friends'],
    ['Challenges', '/dashboard/client/overview/challenges'],
    ['Feed', '/dashboard/client/overview'],
  ] as const) {
    const lensButton = page
      .getByRole('navigation', { name: 'Dashboard lenses' })
      .getByRole('button', { name: label });

    await expect(lensButton).toBeVisible();
    await lensButton.scrollIntoViewIfNeeded();
    await lensButton.click({ timeout: 10_000 });
    await expect.poll(() => new URL(page.url()).pathname, { timeout: 10_000 }).toBe(expectedPath);
    expect(new URL(page.url()).pathname.startsWith('/social')).toBe(false);
  }

  expect(consoleErrors.filter((item) => !isSuppressedProductNoise(item))).toEqual([]);
});

test('client dashboard feed navigation releases bottom scroll and mobile body lock', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'Mobile Chrome', 'Mobile body lock only exists behind the mobile dashboard menu.');

  await page.goto('/dashboard/client/progress', { waitUntil: 'domcontentloaded' });

  await page.evaluate(() => {
    const roots = [...document.querySelectorAll<HTMLElement>('[data-dashboard-scroll-root]')];
    roots.forEach((root) => {
      root.scrollTop = Math.max(root.scrollHeight - root.clientHeight, 500);
    });
    window.scrollTo(0, document.documentElement.scrollHeight);
    document.documentElement.scrollTop = Math.max(document.documentElement.scrollHeight, 500);
    document.body.scrollTop = Math.max(document.body.scrollHeight, 500);
  });

  await page.getByRole('button', { name: 'Open client menu' }).click();
  await expect.poll(
    () => page.evaluate(() => document.body.classList.contains('mobile-sidebar-open')),
    { timeout: 10_000 },
  ).toBe(true);

  await page.getByRole('menuitem', { name: 'Home', exact: true }).click();

  await expect.poll(() => new URL(page.url()).pathname, { timeout: 10_000 })
    .toBe('/dashboard/client/overview');
  await expect(page.getByLabel('Community feed preview')).toBeVisible();

  await expect.poll(
    () => page.evaluate(() => {
      const roots = [...document.querySelectorAll<HTMLElement>('[data-dashboard-scroll-root]')];
      const rootDetails = roots.map((root, index) => ({
        index,
        tag: root.tagName.toLowerCase(),
        scrollTop: root.scrollTop,
        className: root.className,
      }));
      const rootScrollTop = Math.max(0, ...rootDetails.map((root) => root.scrollTop));
      const scrollingElement = document.scrollingElement as HTMLElement | null;
      const activeDocumentScrollTop = scrollingElement?.scrollTop ?? 0;
      return {
        bodyLocked: document.body.classList.contains('mobile-sidebar-open'),
        maxScrollTop: Math.max(
          rootScrollTop,
          window.scrollY,
          activeDocumentScrollTop,
        ),
        windowScrollY: window.scrollY,
        scrollingElementTag: scrollingElement?.tagName.toLowerCase() ?? null,
        activeDocumentScrollTop,
        documentScrollTop: document.documentElement.scrollTop,
        bodyScrollTop: document.body.scrollTop,
        rootDetails,
      };
    }),
    { timeout: 10_000 },
  ).toMatchObject({ bodyLocked: false, maxScrollTop: 0 });
});

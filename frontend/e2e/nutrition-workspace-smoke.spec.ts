import { expect, test, type Page, type Route } from '@playwright/test';
import { openNutritionManualReview } from './nutrition-workspace-smoke.helpers';
import { isSuppressedProductNoise } from './mission/productNoise';
const clientUser = {
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
type FailedResource = {
  status: number;
  url: string;
  failureText?: string;
};

const externalSmoke = process.env.SWAN_SMOKE_TARGET === 'external';

function isSocketPolling400(resource: FailedResource) {
  if (resource.status !== 400) return false;

  try {
    const url = new URL(resource.url);
    return url.pathname === '/socket.io/' && url.searchParams.get('transport') === 'polling';
  } catch {
    return false;
  }
}

function isSocketTransportFailure(resource: FailedResource) {
  if (resource.status !== 0) return false;

  try {
    return new URL(resource.url).pathname === '/socket.io/';
  } catch {
    return false;
  }
}

function isKnownRealtimeTransportNoise(message: string, failedResources: FailedResource[]) {
  const transportFailures = failedResources.filter((resource) => (
    resource.status === 0
    && /ERR_CONNECTION_REFUSED/i.test(resource.failureText ?? '')
  ));
  const onlySocketTransportFailures = transportFailures.length > 0
    && transportFailures.every(isSocketTransportFailure);
  if (onlySocketTransportFailures && (
    /Failed to load resource: net::ERR_CONNECTION_REFUSED/i.test(message)
    || /\[API Monitor\] XHR error detected/i.test(message)
    || /\[API Monitor\] Too many XHR errors/i.test(message)
  )) {
    return true;
  }

  if (!/^Failed to load resource: the server responded with a status of 400 \((?:Bad Request)?\)$/i.test(message)) {
    return false;
  }

  const failed400s = failedResources.filter((resource) => resource.status === 400);
  return failed400s.length > 0 && failed400s.every(isSocketPolling400);
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

async function mockNutritionApi(page: Page) {
  await page.route('**/health**', async (route) => fulfillJson(route, { status: 'ok' }));
  await page.route('**/api/**', async (route) => {
    const endpoint = new URL(route.request().url()).pathname;

    if (endpoint === '/api/auth/me') return fulfillJson(route, { success: true, user: clientUser });
    if (endpoint === '/api/profile') return fulfillJson(route, { success: true, user: clientUser });
    if (endpoint === '/api/v1/gamification/profile') return fulfillJson(route, { profile: { points: 0, level: 1, tier: 'bronze' } });
    if (/^\/api\/profile\/(?:[^/]+\/)?posts$/.test(endpoint)) return fulfillJson(route, { success: true, posts: [], pagination: { limit: 20, offset: 0, total: 0 } });
    if (endpoint === '/api/subscriptions/status') {
      return fulfillJson(route, {
        success: true,
        subscription: {
          tier: 'pro',
          tierName: 'Swan Guardian',
          status: 'active',
          hasFullAIAccess: true,
          isInTrial: false,
          trialDaysRemaining: 0,
          trialEndDate: null,
          currentPeriodEnd: null,
          amount: 99,
          paymentMethod: 'card',
        },
        usage: {
          aiMessagesUsed: 2,
          aiMessagesLimit: 1000,
          aiGenerationsUsed: 1,
          aiGenerationsLimit: 100,
          resetDate: null,
        },
      });
    }
    if (endpoint === '/api/subscriptions/tiers') return fulfillJson(route, { success: true, tiers: [] });
    if (endpoint === '/api/macros/summary') {
      return fulfillJson(route, {
        success: true,
        summary: {
          date: '2026-05-23',
          userId: Number(clientUser.id),
          totalCalories: 1940,
          totalProtein: 142,
          totalCarbs: 188,
          totalFat: 61,
          totalFiber: 31,
          totalSugar: 48,
          totalSodium: 1580,
          mealCount: 3,
          meals: {
            breakfast: { calories: 480, protein: 36, carbs: 54, fat: 16, count: 1 },
            lunch: { calories: 690, protein: 52, carbs: 78, fat: 20, count: 1 },
            dinner: { calories: 770, protein: 54, carbs: 56, fat: 25, count: 1 },
          },
        },
      });
    }
    if (endpoint === '/api/macros/weekly') return fulfillJson(route, { success: true, days: [{ date: '2026-05-23', mealCount: 3 }] });
    if (endpoint === '/api/macros' && route.request().method() === 'GET') {
      return fulfillJson(route, { success: true, entries: [{
        id: 91, date: '2026-05-23', mealType: 'lunch', description: 'Chicken bowl',
        calories: 690, protein: 52, carbs: 78, fat: 20, fiber: 9, source: 'barcode',
        servingBasis: 'household', servingQuantity: 1, servingUnit: 'bowl',
        confidenceScore: 0.82, reviewStatus: 'needs_review', reviewReason: 'calorie_mismatch',
      }] });
    }
    if (endpoint === '/api/macros/drafts') return fulfillJson(route, { success: true, draftId: 'qa-reviewed-draft', entries: [] });
    if (endpoint === '/api/hydration/weekly') return fulfillJson(route, { success: true, days: [] });
    if (endpoint === '/api/hydration') return fulfillJson(route, { success: true, hydration: { glassesFilled: 5, dailyGoal: 8, glassOz: 10 } });
    if (endpoint === '/api/workout/sessions') return fulfillJson(route, { success: true, data: { sessions: [] } });
    if (endpoint === '/api/cart') return fulfillJson(route, { id: 1, status: 'active', items: [], total: 0, totalSessions: 0 });
    if (endpoint === '/api/sessions') return fulfillJson(route, { sessions: [] });

    return fulfillJson(route, {
      success: true,
      data: [],
      achievements: [],
      rewards: [],
      leaderboard: [],
      notifications: [],
      stats: {},
    });
  });
}

async function installClientSession(page: Page) {
  await page.addInitScript(
    ({ token, user }) => {
      localStorage.setItem('token', token);
      localStorage.setItem('tokenTimestamp', Date.now().toString());
      localStorage.setItem('user', JSON.stringify(user));
    },
    { token: jwt(), user: clientUser },
  );
}

async function inspectNutritionWorkspace(page: Page) {
  return page.evaluate(() => {
    const visible = (element: Element) => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
    };
    const workspace = [...document.querySelectorAll('[role="tabpanel"], main, body')]
      .find((element) => (element.textContent || '').includes('Nutrition Intelligence')) ?? document.body;
    const controls = [...workspace.querySelectorAll('a,button,[role="button"],[role="tab"],input,select,textarea')]
      .filter(visible);
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
      bodyText: document.body.innerText,
      overflowX: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
      smallTargets,
    };
  });
}

async function gotoNutritionWorkspace(page: Page, resetTransientSignals: () => void) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    await page.goto('/user-dashboard/nutrition', { waitUntil: 'domcontentloaded' });

    try {
      await expect(page.getByRole('heading', { name: 'Nutrition Intelligence' })).toBeVisible({ timeout: 10000 });
      return;
    } catch (error) {
      const rootText = await page.locator('#root').textContent({ timeout: 1000 }).catch(() => '');
      if (attempt === 0 && !rootText?.trim()) {
        resetTransientSignals();
        continue;
      }
      throw error;
    }
  }
}

test.beforeEach(async ({ page }) => {
  await mockNutritionApi(page);
  await installClientSession(page);
});

test('client nutrition workspace enforces review-first logging across the responsive command center', async ({ page }, testInfo) => {
  const consoleErrors: string[] = [];
  const failedResources: FailedResource[] = [];
  page.on('response', (response) => {
    if (response.status() >= 400) {
      failedResources.push({
        status: response.status(),
        url: response.url(),
      });
    }
  });
  page.on('requestfailed', (request) => {
    failedResources.push({
      status: 0,
      url: request.url(),
      failureText: request.failure()?.errorText,
    });
  });
  page.on('console', (message) => {
    if (['error', 'warning'].includes(message.type())) consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(error.message));

  await gotoNutritionWorkspace(page, () => {
    consoleErrors.length = 0;
    failedResources.length = 0;
  });

  const captureRail = page.getByRole('navigation', { name: /nutrition capture modes/i });
  await expect(captureRail.getByRole('button')).toHaveCount(5);
  const reviewDialog = await openNutritionManualReview(page);
  for (let index = 0; index < 8; index += 1) {
    await page.keyboard.press('Tab');
    expect(await reviewDialog.evaluate((dialog) => dialog.contains(document.activeElement))).toBe(true);
  }
  const draftRequest = page.waitForRequest((request) => (
    request.method() === 'POST' && new URL(request.url()).pathname === '/api/macros/drafts'
  ));
  await page.getByRole('button', { name: /approve and save 1 item/i }).click();
  const draftPayload = (await draftRequest).postDataJSON();
  expect(draftPayload).toMatchObject({ contractVersion: '1.0', source: 'manual' });
  expect(draftPayload.foods).toHaveLength(1);
  await expect(reviewDialog).toBeHidden();
  await expect(page.getByRole('button', { name: /open today/i })).toHaveAttribute('aria-pressed', 'true');
  await page.getByLabel(/more nutrition tools/i).selectOption('macros');
  await expect(page.getByRole('region', { name: /macronutrient split donut chart/i })).toBeVisible();
  await expect(page.getByText('1,940')).toBeVisible();
  await expect(page.getByText(/daily macronutrient distribution/i)).toBeVisible();
  const layout = await inspectNutritionWorkspace(page);
  expect(new URL(page.url()).pathname).toBe('/user-dashboard/nutrition');
  expect(layout.bodyText).not.toMatch(/Generate mock nutrition plan for demo/i);
  expect(layout.overflowX).toBeLessThanOrEqual(12);
  expect(layout.smallTargets).toEqual([]);
  const unexpectedConsoleErrors = consoleErrors.filter((item) => (
    !isSuppressedProductNoise(item)
    && !isKnownRealtimeTransportNoise(item, failedResources)
    && !/React Router Future Flag Warning/i.test(item)
    && !/Service Worker registration blocked by Playwright/i.test(item)
    && !/\[PerformanceMonitor\] Long task detected/i.test(item)
    && !/WebGL: CONTEXT_LOST_WEBGL: loseContext: context lost/i.test(item)
    && !(externalSmoke && /Budget violations/i.test(item))
    && !(externalSmoke && /^\s*- (?:LCP|TTI|FPS):/i.test(item))
  ));
  expect(unexpectedConsoleErrors).toEqual([]);
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  const violations = await page.evaluate(async () => {
    const heading = [...document.querySelectorAll('h1,h2,h3')]
      .find((node) => /nutrition intelligence/i.test(node.textContent || ''));
    let root = heading?.parentElement ?? document.body;
    while (root.parentElement && !root.querySelector('[aria-label="Nutrition capture modes"]')) root = root.parentElement;
    root.id = 'nutrition-qa-root';
    const result = await (window as any).axe.run('#nutrition-qa-root', {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag22aa'] },
    });
    return result.violations.map((violation: { id: string; impact: string; nodes: unknown[] }) => ({
      id: violation.id, impact: violation.impact, nodes: violation.nodes.length,
    }));
  });
  expect(violations).toEqual([]);
  if (testInfo.project.name === 'Desktop Chrome') {
    const viewports = [[320, 568], [375, 667], [414, 896], [768, 1024], [1024, 768],
      [1280, 800], [1440, 900], [1920, 1080], [2560, 1440], [3440, 1440], [3840, 2160]];
    for (const [width, height] of viewports) {
      await page.setViewportSize({ width, height });
      await page.goto('/user-dashboard/nutrition', { waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('heading', { name: 'Nutrition Intelligence' })).toBeVisible();
      const viewportLayout = await inspectNutritionWorkspace(page);
      expect(viewportLayout.overflowX, `${width}px horizontal overflow`).toBeLessThanOrEqual(12);
      expect(viewportLayout.smallTargets, `${width}px touch targets`).toEqual([]);
      if (width === 414) expect((await captureRail.getByRole('button').first().boundingBox())?.y ?? height, `${width}px capture action visibility`).toBeLessThanOrEqual(height - 44);
      if (width <= 414) {
        const mobileDialog = await openNutritionManualReview(page);
        const save = mobileDialog.getByRole('button', { name: /approve and save 1 item/i });
        await save.scrollIntoViewIfNeeded();
        const box = await save.boundingBox();
        expect(box?.height ?? 0, `${width}px review action height`).toBeGreaterThanOrEqual(44);
        expect((box?.x ?? -1) + (box?.width ?? width + 1), `${width}px review action fit`).toBeLessThanOrEqual(width + 1);
        await mobileDialog.getByRole('button', { name: /cancel/i }).click();
      }
      if ([414, 1440, 2560, 3840].includes(width)) {
        await page.screenshot({ path: testInfo.outputPath(`nutrition-${width}.png`), fullPage: false });
      }
    }
  }
  await page.screenshot({ path: testInfo.outputPath('nutrition-workspace-smoke.png'), fullPage: false });
});

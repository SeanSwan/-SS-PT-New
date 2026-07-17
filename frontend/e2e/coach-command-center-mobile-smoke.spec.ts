/**
 * Coach Command Center mobile smoke (NEXT-CHAT W3 accept gate).
 *
 * Proves, against the real mounted route with a mocked admin session + APIs:
 *  1. typed "hello" → a real coach reply renders in the transcript
 *  2. the thread owns the majority of a phone viewport (no smoosh)
 *  3. the composer dock is visible and inside the viewport
 *  4. no horizontal overflow at 375 / 414 / 1440
 */
import { expect, test, type Page, type Route } from '@playwright/test';

const adminUser = {
  id: 1,
  email: 'qa.admin@swanstudios.local',
  username: 'qa_admin',
  firstName: 'QA',
  lastName: 'Admin',
  role: 'admin',
  isActive: true,
};

const COACH_REPLY = 'Hey coach — Swan Coach here. Ask me to log, plan, or review and I will prepare it for your approval.';

function jwt() {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return [
    encode({ alg: 'none', typ: 'JWT' }),
    encode({ iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 3600 }),
    'qa-signature',
  ].join('.');
}

async function fulfillJson(route: Route, body: unknown, status = 200) {
  await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

async function mockCoachApi(page: Page) {
  await page.route('**/health**', async (route) => fulfillJson(route, { status: 'ok' }));
  await page.route('**/api/**', async (route) => {
    const endpoint = new URL(route.request().url()).pathname;
    const method = route.request().method();

    if (endpoint === '/api/auth/me' || endpoint === '/api/profile') {
      return fulfillJson(route, { success: true, user: adminUser });
    }
    if (endpoint === '/api/auth/clients') return fulfillJson(route, { success: true, clients: [] });
    if (endpoint === '/api/subscriptions/status') {
      return fulfillJson(route, {
        success: true,
        subscription: { tier: 'pro', tierName: 'Swan Guardian', status: 'active', hasFullAIAccess: true, isInTrial: false },
        usage: {},
      });
    }
    if (endpoint === '/api/ai-chat/conversations' && method === 'GET') {
      return fulfillJson(route, { success: true, conversations: [] });
    }
    if (endpoint === '/api/ai-chat/conversations' && method === 'POST') {
      return fulfillJson(route, {
        success: true,
        conversation: {
          id: 501,
          title: 'QA thread',
          context: 'coach_assistant',
          role: 'admin',
          status: 'active',
          messageCount: 0,
          createdAt: new Date().toISOString(),
          lastMessageAt: new Date().toISOString(),
        },
      });
    }
    if (/^\/api\/ai-chat\/conversations\/\d+\/messages$/.test(endpoint) && method === 'POST') {
      const now = new Date().toISOString();
      return fulfillJson(route, {
        success: true,
        userMessage: { role: 'user', content: 'hello', timestamp: now },
        assistantMessage: { role: 'assistant', content: COACH_REPLY, timestamp: now },
        messageCount: 2,
      });
    }

    return fulfillJson(route, { success: true, data: [], items: [], summary: {}, notifications: [], conversations: [] });
  });
}

async function installAdminSession(page: Page) {
  await page.addInitScript(
    ({ token, user }) => {
      localStorage.setItem('token', token);
      localStorage.setItem('tokenTimestamp', Date.now().toString());
      localStorage.setItem('user', JSON.stringify(user));
    },
    { token: jwt(), user: adminUser },
  );
}

async function measureCoachLayout(page: Page) {
  return page.evaluate(() => {
    const stream = document.querySelector('.transcript-stream');
    const dock = document.querySelector('.console-dock');
    const streamRect = stream?.getBoundingClientRect();
    const dockRect = dock?.getBoundingClientRect();
    const shell = document.querySelector('.bridge-shell');
    const shellRect = shell?.getBoundingClientRect();
    return {
      overflowX: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
      viewportHeight: window.innerHeight,
      streamHeight: streamRect ? Math.round(streamRect.height) : 0,
      dockVisible: Boolean(dockRect && dockRect.bottom <= window.innerHeight + 1 && dockRect.height > 0),
      dockHeight: dockRect ? Math.round(dockRect.height) : 0,
      dockBottom: dockRect ? Math.round(dockRect.bottom) : 0,
      shellTop: shellRect ? Math.round(shellRect.top) : 0,
      shellHeight: shellRect ? Math.round(shellRect.height) : 0,
      scrollY: Math.round(window.scrollY),
    };
  });
}

test.beforeEach(async ({ page }) => {
  await mockCoachApi(page);
  await installAdminSession(page);
});

// Thread-share floors measured against the QA no-client state, whose client
// bar is at its tallest; pre-W3 the dock alone ate ~232px. The 375x667 case
// runs WITHOUT pointer:coarse here, so it cannot reach the short-viewport
// tier that real SE-class phones get — its floor reflects that ceiling.
for (const viewport of [
  { name: 'iphone-xr', width: 414, height: 896, minThreadShare: 0.36 },
  { name: 'small-iphone', width: 375, height: 667, minThreadShare: 0.2 },
] as const) {
  test(`coach chat works and owns the ${viewport.name} viewport (${viewport.width}x${viewport.height})`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto('/dashboard/admin/coach-assistant', { waitUntil: 'domcontentloaded' });

    const composer = page.getByRole('textbox', { name: /message swan coach/i });
    // Dev-server cold transforms of the dashboard graph can take >5s.
    await expect(composer).toBeVisible({ timeout: 45_000 });

    const layout = await measureCoachLayout(page);
    console.log(`[coach-layout ${viewport.name}]`, JSON.stringify(layout));
    expect(layout.overflowX, 'no horizontal overflow').toBe(0);
    expect(layout.dockVisible, 'composer dock fully inside the viewport').toBe(true);
    expect(layout.dockHeight, 'dock stays dieted (was ~232px before W3)').toBeLessThanOrEqual(170);
    expect(
      layout.streamHeight / viewport.height,
      `transcript owns >=${viewport.minThreadShare * 100}% of the viewport`,
    ).toBeGreaterThanOrEqual(viewport.minThreadShare);

    await composer.fill('hello');
    await composer.press('Enter');
    await expect(page.locator('.transcript-stream').getByText(COACH_REPLY)).toBeVisible();

    await page.screenshot({ path: testInfo.outputPath(`coach-cc-${viewport.name}.png`), fullPage: false });
  });
}

test('coach chat renders and replies at desktop 1440x900', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/dashboard/admin/coach-assistant', { waitUntil: 'domcontentloaded' });

  const composer = page.getByRole('textbox', { name: /message swan coach/i });
  await expect(composer).toBeVisible({ timeout: 45_000 });
  await composer.fill('hello');
  await composer.press('Enter');
  await expect(page.locator('.transcript-stream').getByText(COACH_REPLY)).toBeVisible();

  const layout = await measureCoachLayout(page);
  expect(layout.overflowX).toBe(0);
  expect(layout.dockVisible).toBe(true);

  await page.screenshot({ path: testInfo.outputPath('coach-cc-desktop-1440.png'), fullPage: false });
});

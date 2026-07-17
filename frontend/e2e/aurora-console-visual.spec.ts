/**
 * Aurora Console visual proof (S1 accept gate — "Sean must SEE it").
 *
 * Captures the Coach Command Center wearing the `aurora-console` skin so Sean
 * can approve the look BEFORE the skin is pushed to a live production surface.
 *
 * HONESTY GUARDS (this spec is worthless if it lies):
 *  - The lens is committed through the REAL persistence path
 *    (`style-lens-os:appearance-profile`), NOT by force-setting the attribute.
 *    `StyleLensProvider` owns `document.documentElement`, so a forced attribute
 *    would be overwritten and we'd screenshot the DEFAULT lens while calling it
 *    Aurora. Seeding storage makes the provider commit the lens itself, which
 *    also proves the lens-switch path Sean will actually use.
 *  - Before every capture we ASSERT the committed attribute and the computed
 *    `display` of the atmosphere sheet. A screenshot is only taken once the
 *    skin is proven live.
 *  - The fail-closed case asserts the DEFAULT lens renders the atmosphere at
 *    `display: none` (rule: every other lens renders identically).
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

const COACH_REPLY =
  'Hey coach — Swan Coach here. Ask me to log, plan, or review and I will prepare it for your approval.';

const APPEARANCE_STORAGE_KEY = 'style-lens-os:appearance-profile';
const AURORA_LENS_ID = 'aurora-console';
const DEFAULT_LENS_ID = 'default-safety';

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
  await page.route('**/health', async (route) => fulfillJson(route, { status: 'ok' }));
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
        subscription: {
          tier: 'pro',
          tierName: 'Swan Guardian',
          status: 'active',
          hasFullAIAccess: true,
          isInTrial: false,
        },
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

    return fulfillJson(route, {
      success: true,
      data: [],
      items: [],
      summary: {},
      notifications: [],
      conversations: [],
    });
  });
}

/**
 * Seed the session AND (optionally) the committed appearance profile. The
 * profile envelope shape is the real one read by `createAppearancePersistence`
 * (schema v1); an invalid envelope silently resets to Default, which is exactly
 * the failure this spec asserts against.
 */
async function installSession(
  page: Page,
  options: { lensId?: string; themeId?: string } = {},
) {
  const { lensId, themeId = 'crystalline-dark' } = options;
  await page.addInitScript(
    ({ token, user, storageKey, lens, theme }) => {
      localStorage.setItem('token', token);
      localStorage.setItem('tokenTimestamp', Date.now().toString());
      localStorage.setItem('user', JSON.stringify(user));
      if (lens) {
        localStorage.setItem(
          storageKey,
          JSON.stringify({
            sourceId: 'aurora-visual-probe',
            profile: {
              profileSchemaVersion: 1,
              paletteThemeId: theme,
              styleLensId: lens,
              motionMode: 'auto',
              density: 'comfortable',
              updatedAt: new Date().toISOString(),
            },
          }),
        );
      }
    },
    { token: jwt(), user: adminUser, storageKey: APPEARANCE_STORAGE_KEY, lens: lensId, theme: themeId },
  );
}

async function gotoCoach(page: Page) {
  await page.goto('/dashboard/admin/coach-assistant', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => undefined);
  const composer = page.getByRole('textbox', { name: /message swan coach/i });
  await expect(composer).toBeVisible({ timeout: 45_000 });
  return composer;
}

/** Reads the truth of what is actually committed + rendered. */
async function readSkinTruth(page: Page) {
  return page.evaluate(() => {
    // Matches the documented mount contract exactly: the atmosphere is the
    // first child of the shell that exposes the state. A looser selector could
    // grab an unrelated aria-hidden node and report the wrong `display`.
    const shell = document.querySelector('[data-voice-state]');
    const atmosphere = document.querySelector('[data-voice-state] > [aria-hidden="true"]');
    const styles = atmosphere ? getComputedStyle(atmosphere) : null;
    const read = (name: string) =>
      getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return {
      committedLens: document.documentElement.getAttribute('data-style-lens'),
      voiceState: shell?.getAttribute('data-voice-state') ?? null,
      atmosphereDisplay: styles?.display ?? 'missing',
      consoleSurface: read('--console-surface'),
      consoleStateIdle: read('--console-state-idle'),
      overflowX: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
    };
  });
}

/**
 * SERVER-IDENTITY GUARD (2026-07-17 incident).
 *
 * A vite dev server from an UNRELATED worktree (`ss-lens-finish-20260714`) was
 * squatting on the port this probe targeted. Playwright rendered that stale
 * checkout — which contains no Aurora code — and the run "proved" the aurora
 * did not render. The skin was never at fault; the server was.
 *
 * Vite falls back to index.html for unknown paths, so a missing module returns
 * HTML instead of JS. Asserting the manifest module is really served pins this
 * run to a checkout that actually CONTAINS the code under test.
 */
test.beforeAll(async ({ request }) => {
  const baseURL = process.env.BASE_URL || 'http://localhost:5173';
  const res = await request.get(`${baseURL}/src/adapters/style-lens-swan/manifests/auroraConsole.ts`);
  const body = await res.text();
  expect(
    body.includes('AURORA_CONSOLE_MANIFEST'),
    `BASE_URL ${baseURL} is not serving this worktree's Aurora code (stale/foreign dev server?)`,
  ).toBe(true);
});

test.beforeEach(async ({ page }) => {
  await mockCoachApi(page);
});

const VIEWPORTS = [
  { name: '414-iphone-xr', width: 414, height: 896 },
  { name: '375-small-iphone', width: 375, height: 667 },
  { name: '1440-laptop', width: 1440, height: 900 },
  { name: '2560-qhd', width: 2560, height: 1440 },
] as const;

for (const viewport of VIEWPORTS) {
  test(`aurora-console renders at ${viewport.name} (idle + listening)`, async ({ page }, testInfo) => {
    await installSession(page, { lensId: AURORA_LENS_ID });
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await gotoCoach(page);

    // --- HONESTY GATE: prove the skin is actually live before capturing it ---
    const truth = await readSkinTruth(page);
    console.log(`[aurora ${viewport.name}]`, JSON.stringify(truth));
    expect(truth.committedLens, 'the aurora-console lens actually committed').toBe(AURORA_LENS_ID);
    expect(truth.atmosphereDisplay, 'aurora sheet is rendering (not fail-closed)').toBe('block');
    expect(truth.consoleSurface, '--console-surface resolves from theme vars').not.toBe('');
    expect(truth.overflowX, 'no horizontal overflow under the skin').toBe(0);

    await page.screenshot({
      path: testInfo.outputPath(`aurora-${viewport.name}-idle.png`),
      fullPage: false,
    });

    // Drive the documented state contract the atmosphere reads.
    await page.evaluate(() => {
      document.querySelector('[data-voice-state]')?.setAttribute('data-voice-state', 'listening');
    });
    await page.waitForTimeout(400);
    const listening = await readSkinTruth(page);
    expect(listening.voiceState, 'listening state applied to the shell').toBe('listening');
    expect(listening.atmosphereDisplay, 'aurora still rendering while listening').toBe('block');

    await page.screenshot({
      path: testInfo.outputPath(`aurora-${viewport.name}-listening.png`),
      fullPage: false,
    });
  });
}

test('FAIL-CLOSED: the default lens renders the surface without any aurora', async ({ page }, testInfo) => {
  // No lens seeded → provider commits DEFAULT_STYLE_LENS_ID.
  await installSession(page);
  await page.setViewportSize({ width: 414, height: 896 });
  await gotoCoach(page);

  const truth = await readSkinTruth(page);
  console.log('[aurora fail-closed]', JSON.stringify(truth));
  expect(truth.committedLens, 'default lens is committed').toBe(DEFAULT_LENS_ID);
  expect(truth.atmosphereDisplay, 'aurora sheet is display:none under every other lens').toBe('none');

  await page.screenshot({
    path: testInfo.outputPath('aurora-414-FAIL-CLOSED-default-lens.png'),
    fullPage: false,
  });
});

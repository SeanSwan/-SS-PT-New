/**
 * Aurora Console — S2 theme-changer matrix (Sean's "works with the theme changer" requirement).
 *
 * The claim under test: every `--console-*` value composes from THEME variables, so switching the
 * theme recolors the skin with NO skin-side change. This spec proves that rather than asserting it.
 *
 * HONESTY GUARDS (each answers a way this could pass while proving nothing):
 *  - TWO SEPARATE SYSTEMS. `UniversalThemeContext` persists to `swanstudios-theme` and does NOT read
 *    the Style-Lens appearance profile's `paletteThemeId`. Seeding the profile alone would render
 *    crystalline-dark three times and still "pass" a matrix. So the theme is driven by its real key,
 *    and the committed `data-theme` is asserted per case.
 *  - DERIVATION, NOT COINCIDENCE. We assert the console token EQUALS its source theme var
 *    (`--console-state-idle` === `--accent-primary`), which is what "recolors from theme vars alone"
 *    actually means. A hardcoded skin would pass a mere "it rendered" check.
 *  - RECOLOR, NOT STATIC. We assert the resolved values genuinely DIFFER across themes. If two themes
 *    happened to share a palette, an equality-only test would be vacuous.
 *  - SERVED-CODE IDENTITY. A dev server from an unrelated worktree once served a checkout with no
 *    Aurora code and "proved" the feature broken; vite's index.html fallback hides a missing module.
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

const APPEARANCE_STORAGE_KEY = 'style-lens-os:appearance-profile';
const THEME_STORAGE_KEY = 'swanstudios-theme';
const AURORA_LENS_ID = 'aurora-console';

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
    if (endpoint === '/api/ai-chat/conversations') return fulfillJson(route, { success: true, conversations: [] });
    return fulfillJson(route, { success: true, data: [], items: [], summary: {}, notifications: [], conversations: [] });
  });
}

async function installSession(page: Page, themeId: string) {
  await page.addInitScript(
    ({ token, user, appearanceKey, themeKey, lens, theme }) => {
      localStorage.setItem('token', token);
      localStorage.setItem('tokenTimestamp', Date.now().toString());
      localStorage.setItem('user', JSON.stringify(user));
      // The lens (skin) — Style Lens OS.
      localStorage.setItem(
        appearanceKey,
        JSON.stringify({
          sourceId: 'aurora-theme-matrix',
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
      // The THEME — a separate system with its own key. This is the one that recolors.
      localStorage.setItem(themeKey, theme);
    },
    {
      token: jwt(),
      user: adminUser,
      appearanceKey: APPEARANCE_STORAGE_KEY,
      themeKey: THEME_STORAGE_KEY,
      lens: AURORA_LENS_ID,
      theme: themeId,
    },
  );
}

/** Resolve the console tokens AND the theme vars they claim to derive from. */
async function readTokens(page: Page) {
  return page.evaluate(() => {
    const root = getComputedStyle(document.documentElement);
    const read = (n: string) => root.getPropertyValue(n).trim();
    const atmosphere = document.querySelector('[data-voice-state] > [aria-hidden="true"]');
    return {
      committedLens: document.documentElement.getAttribute('data-style-lens'),
      committedTheme: document.documentElement.getAttribute('data-theme'),
      atmosphereDisplay: atmosphere ? getComputedStyle(atmosphere).display : 'missing',
      // console tokens
      consoleSurface: read('--console-surface'),
      consoleStateIdle: read('--console-state-idle'),
      consoleStateSpeaking: read('--console-state-speaking'),
      consoleStateThinking: read('--console-state-thinking'),
      // the theme vars they must derive FROM
      accentPrimary: read('--accent-primary'),
      accentSecondary: read('--accent-secondary'),
      accentGold: read('--accent-gold'),
      bgElevated: read('--bg-elevated'),
    };
  });
}

test.beforeAll(async ({ request }) => {
  const baseURL = process.env.BASE_URL || 'http://localhost:5173';
  const res = await request.get(`${baseURL}/src/adapters/style-lens-swan/manifests/auroraConsole.ts`);
  expect(
    (await res.text()).includes('AURORA_CONSOLE_MANIFEST'),
    `BASE_URL ${baseURL} is not serving this worktree's Aurora code (stale/foreign dev server?)`,
  ).toBe(true);
});

test.beforeEach(async ({ page }) => {
  await mockCoachApi(page);
});

const THEMES = ['crystalline-dark', 'frozen-aurora', 'obsidian-black'] as const;
const collected: Record<string, Awaited<ReturnType<typeof readTokens>>> = {};

for (const themeId of THEMES) {
  test(`aurora-console recolors from theme vars alone under ${themeId}`, async ({ page }, testInfo) => {
    await installSession(page, themeId);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/dashboard/admin/coach-assistant', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => undefined);
    await expect(page.getByRole('textbox', { name: /message swan coach/i })).toBeVisible({ timeout: 45_000 });

    const t = await readTokens(page);
    console.log(`[theme ${themeId}]`, JSON.stringify(t));

    // The theme really switched (not silently reset to the default).
    expect(t.committedTheme, `theme ${themeId} actually committed`).toBe(themeId);
    // The skin is really on.
    expect(t.committedLens, 'aurora lens committed').toBe(AURORA_LENS_ID);
    expect(t.atmosphereDisplay, 'aurora rendering under this theme').toBe('block');

    // DERIVATION: the console tokens ARE the theme's vars, not a private palette.
    expect(t.consoleStateIdle, 'idle derives from --accent-primary').toBe(t.accentPrimary);
    expect(t.consoleStateThinking, 'thinking derives from --accent-secondary').toBe(t.accentSecondary);
    expect(t.consoleStateSpeaking, 'speaking derives from --accent-gold').toBe(t.accentGold);
    // --console-surface is a color-mix OF --bg-elevated, so it must quote that theme value.
    expect(t.consoleSurface, '--console-surface composes from --bg-elevated').toContain(t.bgElevated);

    collected[themeId] = t;
    await page.screenshot({ path: testInfo.outputPath(`aurora-theme-${themeId}.png`), fullPage: false });
  });
}

test('RECOLOR: the three themes produce genuinely different console palettes', async () => {
  // Guards against a vacuous pass: if every theme resolved the same values, the per-theme equality
  // assertions above would hold while proving the skin does NOT recolor.
  const seen = THEMES.map((t) => collected[t]).filter(Boolean);
  expect(seen.length, 'all three theme cases ran before this check').toBe(THEMES.length);

  const idles = new Set(seen.map((t) => t.consoleStateIdle));
  const surfaces = new Set(seen.map((t) => t.consoleSurface));
  console.log('[recolor] idles=', [...idles], 'surfaces=', [...surfaces]);
  expect(idles.size, `--console-state-idle must differ across themes, got ${[...idles]}`).toBeGreaterThan(1);
  expect(surfaces.size, `--console-surface must differ across themes, got ${[...surfaces]}`).toBeGreaterThan(1);
});

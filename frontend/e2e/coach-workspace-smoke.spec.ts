/**
 * v4 Coach Workspace smoke (brain-v4 acceptance gate).
 *
 * Against the real mounted route with a mocked admin session + APIs, proves:
 *  1. typed "hello" → a real coach reply renders in the transcript (C2 stays fixed);
 *  2. the conversation owns the phone viewport (≥ 55% transcript), composer inside it;
 *  3. no horizontal overflow at 375 / 414 / 768 / 1440 / 2560;
 *  4. the header Swan Style Lens changes the layout (data-ws-layout + docking);
 *  5. the header theme changer repaints the workspace (theme var → computed colour);
 *  6. today's sessions from the Universal Master Schedule render in the inspector.
 */
import { expect, test, type Page, type Route } from '@playwright/test';

const admin = { id: 1, email: 'qa.admin@swanstudios.local', username: 'qa_admin', firstName: 'Sean', lastName: 'QA', role: 'admin', isActive: true };
const REPLY = 'Swan Coach here. Tell me what to log, plan, or review and I will prepare it for your approval.';

const jwt = () => {
  const enc = (v: unknown) => Buffer.from(JSON.stringify(v)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  return [enc({ alg: 'none', typ: 'JWT' }), enc({ iat: now, exp: now + 3600 }), 'qa'].join('.');
};
const json = (route: Route, body: unknown, status = 200) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

function todayAt(hour: number): string {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

async function mockApi(page: Page) {
  await page.route('**/health**', (route) => json(route, { status: 'ok' }));
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    const method = route.request().method();
    if (path === '/api/auth/me' || path === '/api/profile') return json(route, { success: true, user: admin });
    if (path === '/api/ai-chat/target-access') {
      return json(route, { success: true, access: { scope: 'coach_target_read', actorUserId: 1, actorRole: 'admin', targetUserId: null, conversationId: null } });
    }
    if (path === '/api/subscriptions/status') {
      return json(route, { success: true, subscription: { tier: 'pro', status: 'active', hasFullAIAccess: true }, usage: {} });
    }
    if (path === '/api/ai-command/commands') {
      return json(route, { success: true, commands: [
        { type: 'brief_my_day', description: "Day sheet — today's sessions with per-client attention flags", category: 'G' },
        { type: 'at_risk_clients', description: 'Show at-risk clients who need attention', category: 'A' },
        { type: 'log_workout', description: "Log today's workout for a client", category: 'W' },
      ] });
    }
    if (path === '/api/sessions' && method === 'GET') {
      return json(route, [
        { id: 's1', sessionDate: todayAt(9), duration: 60, userId: '12', trainerId: '1', status: 'confirmed', client: { firstName: 'Avery', lastName: 'Stone' }, createdAt: '', updatedAt: '' },
        { id: 's2', sessionDate: todayAt(16), duration: 45, userId: '14', trainerId: '1', status: 'scheduled', client: { firstName: 'Jordan', lastName: 'Lee' }, createdAt: '', updatedAt: '' },
        { id: 'open', sessionDate: todayAt(18), duration: 60, userId: null, trainerId: '1', status: 'available', createdAt: '', updatedAt: '' },
      ]);
    }
    if (path === '/api/ai-chat/conversations' && method === 'GET') return json(route, { success: true, conversations: [] });
    if (path === '/api/ai-chat/conversations' && method === 'POST') {
      const now = new Date().toISOString();
      return json(route, { success: true, conversation: { id: 501, title: 'QA thread', context: 'coach_assistant', role: 'admin', targetUserId: null, status: 'active', messageCount: 0, createdAt: now, lastMessageAt: now } });
    }
    if (/^\/api\/ai-chat\/conversations\/\d+\/messages$/.test(path) && method === 'POST') {
      const now = new Date().toISOString();
      return json(route, { success: true, userMessage: { role: 'user', content: 'hello', timestamp: now }, assistantMessage: { role: 'assistant', content: REPLY, timestamp: now }, conversationId: 501, messageCount: 2 });
    }
    return json(route, { success: true, data: [], items: [], summary: {}, notifications: [], conversations: [] });
  });
}

async function seed(page: Page, opts: { lens?: string; theme?: string } = {}) {
  await page.addInitScript(({ token, user, lens, theme }) => {
    localStorage.setItem('token', token);
    localStorage.setItem('tokenTimestamp', Date.now().toString());
    localStorage.setItem('user', JSON.stringify(user));
    if (theme) localStorage.setItem('swanstudios-theme', theme);
    if (lens) {
      localStorage.setItem('style-lens-os:appearance-profile', JSON.stringify({
        sourceId: 'e2e',
        profile: { profileSchemaVersion: 1, paletteThemeId: theme || 'crystalline-dark', styleLensId: lens, motionMode: 'off', density: 'comfortable', updatedAt: new Date().toISOString() },
      }));
    }
  }, { token: jwt(), user: admin, lens: opts.lens, theme: opts.theme });
}

async function open(page: Page, width: number, height: number, opts: { lens?: string; theme?: string } = {}) {
  await mockApi(page);
  await seed(page, opts);
  await page.setViewportSize({ width, height });
  await page.goto('/dashboard/admin/coach-assistant', { waitUntil: 'domcontentloaded' });
  const composer = page.getByRole('combobox', { name: /message swan coach/i });
  await expect(composer).toBeVisible({ timeout: 45_000 });
  return composer;
}

const layoutOf = (page: Page) => page.evaluate(() => {
  const shell = document.querySelector('[data-coach-workspace="v4"]') as HTMLElement | null;
  const scroll = document.querySelector('[data-testid="ws-transcript"]')?.getBoundingClientRect();
  const composer = document.querySelector('.ws-composer-card')?.getBoundingClientRect();
  const visible = (sel: string) => {
    const el = document.querySelector(sel) as HTMLElement | null;
    if (!el) return false;
    const cs = getComputedStyle(el); const r = el.getBoundingClientRect();
    return cs.visibility !== 'hidden' && cs.display !== 'none' && r.width > 0 && r.right > 0 && r.left < window.innerWidth;
  };
  return {
    layout: shell?.getAttribute('data-ws-layout'),
    overflowX: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
    transcriptShare: scroll ? scroll.height / window.innerHeight : 0,
    composerInside: Boolean(composer && composer.bottom <= window.innerHeight + 1 && composer.height > 0),
    sidebarVisible: visible('.ws-sidebar'),
    inspectorVisible: visible('.ws-inspector'),
    headerControls: document.querySelectorAll('[data-coach-workspace="v4"] > header button').length,
  };
});

for (const vp of [
  { name: 'se', width: 375, height: 667, minShare: 0.5 },
  { name: 'xr', width: 414, height: 896, minShare: 0.55 },
  { name: 'tablet', width: 768, height: 1024, minShare: 0.5 },
  { name: 'desktop', width: 1440, height: 900, minShare: 0.45 },
  { name: 'qhd', width: 2560, height: 1440, minShare: 0.5 },
]) {
  test(`v4 workspace sends and owns the ${vp.name} viewport (${vp.width}x${vp.height})`, async ({ page }, info) => {
    const composer = await open(page, vp.width, vp.height);
    const before = await layoutOf(page);
    console.log(`[ws-layout ${vp.name}]`, JSON.stringify(before));
    expect(before.layout).toBe('operator-grid');
    expect(before.overflowX, 'no horizontal overflow').toBe(0);
    expect(before.composerInside, 'composer fully inside the viewport').toBe(true);
    expect(before.transcriptShare, `transcript ≥ ${vp.minShare * 100}% of viewport`).toBeGreaterThanOrEqual(vp.minShare);
    expect(before.sidebarVisible).toBe(vp.width >= 768);
    expect(before.inspectorVisible).toBe(vp.width >= 1200);
    expect(before.headerControls, 'header stays quiet (≤ 5 buttons)').toBeLessThanOrEqual(5);

    await composer.fill('hello');
    await composer.press('Enter');
    await expect(page.getByTestId('ws-transcript').getByText(REPLY)).toBeVisible();
    await expect(page.getByTestId('ws-transcript').getByText('message not sent')).toHaveCount(0);
    await page.screenshot({ path: info.outputPath(`ws-${vp.name}.png`) });
  });
}

test('Universal Master Schedule: today renders in the inspector, open slots excluded', async ({ page }) => {
  await open(page, 1440, 900);
  const today = page.getByRole('list', { name: "Today's sessions" });
  await expect(today.getByText('Avery S.')).toBeVisible();
  await expect(today.getByText('Jordan L.')).toBeVisible();
  await expect(today.locator('li')).toHaveCount(2);
  await today.getByRole('button', { name: /ask swan coach about the/i }).first().click();
  await expect(page.getByRole('combobox', { name: /message swan coach/i })).toHaveValue(/Prep me for today's .* session/);
  await expect(page.getByRole('combobox', { name: /message swan coach/i })).not.toHaveValue(/Avery|Stone/);
});

for (const lens of [
  { id: 'quiet-meridian', layout: 'editorial-column', sidebar: false, inspector: false },
  { id: 'split-horizon', layout: 'atrium-split', sidebar: false, inspector: true },
  { id: 'glass-rail', layout: 'playfield-stack', sidebar: false, inspector: false },
  { id: 'aurora-console', layout: 'operator-grid', sidebar: true, inspector: true },
]) {
  test(`Style Lens ${lens.id} → ${lens.layout}`, async ({ page }, info) => {
    await open(page, 1440, 900, { lens: lens.id });
    await expect(page.locator('[data-coach-workspace="v4"]')).toHaveAttribute('data-ws-layout', lens.layout);
    const state = await layoutOf(page);
    expect(state.overflowX).toBe(0);
    expect(state.sidebarVisible).toBe(lens.sidebar);
    expect(state.inspectorVisible).toBe(lens.inspector);
    await page.screenshot({ path: info.outputPath(`ws-lens-${lens.id}.png`) });
  });
}

test('header theme changer repaints the workspace (no hardcoded colour survives)', async ({ page }) => {
  await open(page, 1440, 900);
  const read = () => page.evaluate(() => getComputedStyle(document.querySelector('.ws-composer-card') as Element).backgroundColor);
  const before = await read();
  await page.evaluate(() => {
    const style = document.createElement('style');
    style.textContent = ':root { --bg-elevated: rgb(10, 120, 60) !important; }';
    document.head.appendChild(style);
  });
  await expect.poll(read).toBe('rgb(10, 120, 60)');
  expect(before).not.toBe('rgb(10, 120, 60)');
});

test('the thread list is a sheet on phones and closes with Escape', async ({ page }) => {
  await open(page, 414, 896);
  await page.getByRole('button', { name: 'Conversations' }).click();
  await expect.poll(async () => (await layoutOf(page)).sidebarVisible).toBe(true);
  await page.keyboard.press('Escape');
  await expect.poll(async () => (await layoutOf(page)).sidebarVisible).toBe(false);
  await expect(page.getByRole('button', { name: 'Conversations' })).toBeFocused();
});

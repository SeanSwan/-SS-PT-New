/**
 * Shared mocks for the v4 Coach Workspace e2e specs (not a spec itself).
 * A mocked session + APIs against the real mounted route; ids only (Rule 8).
 */
import { expect, type Page, type Route } from '@playwright/test';

export const admin = { id: 1, email: 'qa.admin@swanstudios.local', username: 'qa_admin', firstName: 'Sean', lastName: 'QA', role: 'admin', isActive: true };
export const REPLY = 'Swan Coach here. Tell me what to log, plan, or review and I will prepare it for your approval.';

export const jwt = () => {
  const enc = (v: unknown) => Buffer.from(JSON.stringify(v)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  return [enc({ alg: 'none', typ: 'JWT' }), enc({ iat: now, exp: now + 3600 }), 'qa'].join('.');
};
export const json = (route: Route, body: unknown, status = 200) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

export function todayAt(hour: number): string {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

export const SEED_THREAD = { id: 777, title: 'Leg day review', context: 'coach_assistant', role: 'admin', targetUserId: null, status: 'active', messageCount: 2, createdAt: todayAt(7), lastMessageAt: todayAt(8) };
export const SEED_MESSAGES = [
  { role: 'user', content: 'How did the squat session go?', timestamp: todayAt(8) },
  { role: 'assistant', content: 'Squat top set moved well; keep the load and add one back-off set.', timestamp: todayAt(8) },
];

export type SessionUser = typeof admin;

export async function mockApi(page: Page, opts: { history?: boolean; user?: SessionUser } = {}) {
  const user = opts.user ?? admin;
  const threads: Array<Record<string, unknown>> = opts.history ? [SEED_THREAD] : [];
  let nextId = 501;
  await page.route('**/health**', (route) => json(route, { status: 'ok' }));
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    const method = route.request().method();
    if (path === '/api/auth/me' || path === '/api/profile') return json(route, { success: true, user });
    if (path === '/api/ai-chat/target-access') {
      const id = (key: string) => (url.searchParams.get(key) ? Number(url.searchParams.get(key)) : null);
      return json(route, { success: true, access: { scope: 'coach_target_read', actorUserId: 1, actorRole: 'admin', targetUserId: id('targetUserId'), conversationId: id('conversationId') } });
    }
    if (path === '/api/subscriptions/status') {
      return json(route, { success: true, subscription: { tier: 'pro', status: 'active', hasFullAIAccess: true }, usage: {} });
    }
    if (path === '/api/admin/clients') {
      return json(route, { success: true, data: { clients: [{ id: 12, firstName: 'Avery', lastName: 'Stone', email: '', role: 'client' }] } });
    }
    if (path === '/api/notes/12' && method === 'POST') return json(route, { success: false, message: 'Notes service down' }, 500);
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
    if (path === '/api/ai-chat/conversations' && method === 'GET') return json(route, { success: true, conversations: threads });
    if (path === '/api/ai-chat/conversations' && method === 'POST') {
      const now = new Date().toISOString();
      // Echo the audience role and target the way the real endpoint does.
      const body = (route.request().postDataJSON() ?? {}) as { targetUserId?: number };
      const conversation = { id: nextId++, title: `QA thread ${nextId - 501}`, context: 'coach_assistant', role: user.role, targetUserId: body.targetUserId ?? null, status: 'active', messageCount: 0, createdAt: now, lastMessageAt: now };
      threads.unshift(conversation);
      return json(route, { success: true, conversation });
    }
    const one = /^\/api\/ai-chat\/conversations\/(\d+)$/.exec(path);
    if (one && method === 'GET') {
      const found = threads.find((t) => t.id === Number(one[1]));
      return found ? json(route, { success: true, conversation: { ...found, messages: found.id === 777 ? SEED_MESSAGES : [], metadata: {} } }) : json(route, { success: false, error: 'not found' }, 404);
    }
    const msg = /^\/api\/ai-chat\/conversations\/(\d+)\/messages$/.exec(path);
    if (msg && method === 'POST') {
      const now = new Date().toISOString();
      const text = String((route.request().postDataJSON() as { message?: string })?.message ?? '');
      return json(route, { success: true, userMessage: { role: 'user', content: text, timestamp: now }, assistantMessage: { role: 'assistant', content: `${REPLY} (#${msg[1]})`, timestamp: now }, conversationId: Number(msg[1]), messageCount: 2 });
    }
    return json(route, { success: true, data: [], items: [], summary: {}, notifications: [], conversations: [] });
  });
}

export async function seed(page: Page, opts: { lens?: string; theme?: string; user?: SessionUser } = {}) {
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
  }, { token: jwt(), user: opts.user ?? admin, lens: opts.lens, theme: opts.theme });
}

export async function open(page: Page, width: number, height: number, opts: { lens?: string; theme?: string; history?: boolean; user?: SessionUser; path?: string } = {}) {
  await mockApi(page, { history: opts.history, user: opts.user });
  await seed(page, opts);
  await page.setViewportSize({ width, height });
  await page.goto(opts.path ?? '/dashboard/admin/coach-assistant', { waitUntil: 'domcontentloaded' });
  const composer = page.getByRole('combobox', { name: /message swan coach/i });
  await expect(composer).toBeVisible({ timeout: 45_000 });
  return composer;
}

export const layoutOf = (page: Page) => page.evaluate(() => {
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

/**
 * ============================================================================
 * FILE: coach-thread-hydration.spec.ts
 * PURPOSE: Lock the routed Coach thread to an actual detail fetch + messages.
 * AUTHOR: Astra | LAST MODIFIED: 2026-09-13
 * AI VILLAGE VALIDATED: Not requested
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Enters `/dashboard/admin/coach-assistant?threadId=301`
 * with mocked private data and asserts that the mounted app issues
 * `GET /api/ai-chat/conversations/301` and renders that thread's messages
 * inside `.transcript-stream` instead of the empty state.
 * HOW IT FITS IN THE APP: Dashboard route -> Coach bridge -> useAIChat
 * publication gate -> `GET /api/ai-chat/conversations/:id` -> transcript.
 * KEY DECISIONS: The wire-level request is the assertion, because the defect is
 * a load that is retired before dispatch - a state-only check would not prove
 * the thread was ever fetched.
 * NASM PROTOCOL CONTEXT: N/A - conversation hydration only.
 */
import { expect, test, type Page, type Route } from '@playwright/test';

const ROUTED_THREAD_ID = 301;

const adminUser = {
  id: 101,
  email: 'qa.admin@swanstudios.local',
  username: 'qa_admin',
  firstName: 'QA',
  lastName: 'Admin',
  role: 'admin',
  isActive: true,
};

const routedThread = {
  id: ROUTED_THREAD_ID,
  title: 'QA Clientone M daily workout log',
  context: 'coach_assistant',
  role: 'admin',
  status: 'active',
  messageCount: 2,
  lastMessageAt: '2026-07-13T20:00:20.000Z',
  createdAt: '2026-07-13T20:00:00.000Z',
  targetUserId: 41,
  metadata: {},
  messages: [
    { id: 3011, role: 'user', content: 'Log my bench session.', timestamp: '2026-07-13T20:00:10.000Z' },
    { id: 3012, role: 'assistant', content: 'Draft ready. Confirm to save.', timestamp: '2026-07-13T20:00:20.000Z' },
  ],
};

function jwt() {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return [
    encode({ alg: 'none', typ: 'JWT' }),
    encode({ iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 3600 }),
    'qa-signature',
  ].join('.');
}

async function fulfillJson(route: Route, body: unknown) {
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
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

async function mockCoachApi(page: Page) {
  await page.route('**/health', async (route) => fulfillJson(route, { status: 'ok' }));
  await page.route('**/api/**', async (route) => {
    const endpoint = new URL(route.request().url()).pathname;

    if (endpoint === '/api/auth/me') return fulfillJson(route, { success: true, user: adminUser });
    if (endpoint === '/api/profile') return fulfillJson(route, { success: true, user: adminUser });
    if (endpoint === '/api/admin/clients') {
      return fulfillJson(route, {
        success: true,
        data: { clients: [
          { id: 41, firstName: 'QA Clientone', lastName: 'M', email: 'client@swanstudios.local', role: 'client' },
        ] },
      });
    }
    if (endpoint === '/api/ai-chat/conversations') {
      return fulfillJson(route, { success: true, conversations: [{ ...routedThread, messages: [] }] });
    }
    const detail = endpoint.match(/^\/api\/ai-chat\/conversations\/(\d+)$/);
    if (detail) return fulfillJson(route, { success: true, conversation: routedThread });
    if (endpoint === '/api/coach/intake/queue') {
      return fulfillJson(route, {
        success: true,
        items: [],
        summary: { actionable: 0, today: 0, unprocessed: 0, processing: 0, readyReview: 0, preparedDrafts: 0 },
        scope: 'actionable',
        limit: 12,
        schemaReady: true,
      });
    }
    return fulfillJson(route, { success: true, data: [], items: [], notifications: [], stats: {}, counts: {} });
  });
}

test.describe('routed Coach thread hydration', () => {
  test('issues the routed thread detail request and renders its messages', async ({ page }) => {
    await installAdminSession(page);
    await mockCoachApi(page);

    const detailRequests: string[] = [];
    page.on('request', (request) => {
      const endpoint = new URL(request.url()).pathname;
      if (request.method() === 'GET' && /^\/api\/ai-chat\/conversations\/\d+$/.test(endpoint)) {
        detailRequests.push(endpoint);
      }
    });

    await page.goto(`/dashboard/admin/coach-assistant?threadId=${ROUTED_THREAD_ID}`);
    await page.locator('.bridge-shell').waitFor({ state: 'visible' });

    // The defect: the routed thread detail is never fetched at all.
    await expect
      .poll(
        () => detailRequests.filter((endpoint) => endpoint === `/api/ai-chat/conversations/${ROUTED_THREAD_ID}`).length,
        { timeout: 20_000, message: 'routed thread detail request was never issued' },
      )
      .toBeGreaterThan(0);

    const stream = page.locator('.transcript-stream');
    await expect(stream.locator('.transcript-empty')).toHaveCount(0);
    await expect(stream).toContainText('Log my bench session.');
    await expect(stream).toContainText('Draft ready. Confirm to save.');
  });
});

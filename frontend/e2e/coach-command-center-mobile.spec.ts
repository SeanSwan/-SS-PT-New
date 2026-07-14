/**
 * ============================================================================
 * FILE: coach-command-center-mobile.spec.ts
 * PURPOSE: Lock the canonical Coach Command Center to usable mobile geometry.
 * AUTHOR: Codex | LAST MODIFIED: 2026-07-13
 * AI VILLAGE VALIDATED: Not requested
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Exercises the authenticated Coach route at iPhone XR,
 * P1-P12 phone, and required desktop viewports with mocked private data.
 * HOW IT FITS IN THE APP: Dashboard route -> Coach bridge -> layout assertions.
 * KEY DECISIONS: Measure mounted controls because overflow-hidden can conceal
 * unusable geometry from document.scrollWidth.
 * NASM PROTOCOL CONTEXT: N/A - responsive application shell only.
 */
import { expect, test, type Page, type Route } from '@playwright/test';

const IPHONE_XR = { width: 414, height: 896 } as const;
type ViewportCase = { id: string; width: number; height: number; dpr: number; phone: boolean; pixelPerfect: boolean };

const PHONE_MATRIX: readonly ViewportCase[] = [
  { id: 'P1 XR', width: 414, height: 896, dpr: 2, phone: true, pixelPerfect: true },
  { id: 'P2', width: 390, height: 844, dpr: 3, phone: true, pixelPerfect: true },
  { id: 'P3', width: 393, height: 852, dpr: 3, phone: true, pixelPerfect: true },
  { id: 'P4', width: 375, height: 812, dpr: 3, phone: true, pixelPerfect: true },
  { id: 'P5', width: 402, height: 874, dpr: 3, phone: true, pixelPerfect: true },
  { id: 'P6', width: 360, height: 780, dpr: 3, phone: true, pixelPerfect: true },
  { id: 'P7', width: 412, height: 915, dpr: 2.625, phone: true, pixelPerfect: true },
  { id: 'P8', width: 430, height: 932, dpr: 3, phone: true, pixelPerfect: true },
  { id: 'P9', width: 384, height: 832, dpr: 3.75, phone: true, pixelPerfect: true },
  { id: 'P10 SE', width: 375, height: 667, dpr: 2, phone: true, pixelPerfect: true },
  { id: 'P11', width: 440, height: 956, dpr: 3, phone: true, pixelPerfect: true },
  { id: 'P12 floor', width: 320, height: 568, dpr: 2, phone: true, pixelPerfect: false },
];
const DESKTOP_MATRIX: readonly ViewportCase[] = [
  { id: 'tablet portrait', width: 768, height: 1024, dpr: 1, phone: false, pixelPerfect: true },
  { id: 'tablet landscape', width: 1024, height: 768, dpr: 1, phone: false, pixelPerfect: true },
  { id: 'laptop', width: 1280, height: 800, dpr: 1, phone: false, pixelPerfect: true },
  { id: 'desktop', width: 1440, height: 900, dpr: 1, phone: false, pixelPerfect: true },
  { id: '1080p', width: 1920, height: 1080, dpr: 1, phone: false, pixelPerfect: true },
  { id: 'QHD', width: 2560, height: 1440, dpr: 1, phone: false, pixelPerfect: true },
  { id: 'ultrawide', width: 3440, height: 1440, dpr: 1, phone: false, pixelPerfect: true },
  { id: '4K', width: 3840, height: 2160, dpr: 1, phone: false, pixelPerfect: true },
];
const adminUser = {
  id: 101,
  email: 'qa.admin@swanstudios.local',
  username: 'qa_admin',
  firstName: 'QA',
  lastName: 'Admin',
  role: 'admin',
  isActive: true,
};
const conversation = {
  id: 301,
  title: 'Jessee M daily workout log',
  context: 'coach_assistant',
  role: 'admin',
  status: 'active',
  messages: [],
  messageCount: 0,
  lastMessageAt: '2026-07-13T20:00:00.000Z',
  createdAt: '2026-07-13T20:00:00.000Z',
  targetUserId: 41,
  metadata: {},
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
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(body),
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
          { id: 41, firstName: 'Jessee', lastName: 'M', email: 'client@swanstudios.local', role: 'client' },
          { id: 42, firstName: 'Alexandria', lastName: 'Montgomery-Swanington', email: 'long-client@swanstudios.local', role: 'client' },
        ] },
      });
    }
    if (endpoint === '/api/ai-chat/conversations/301') {
      return fulfillJson(route, { success: true, conversation });
    }
    if (endpoint === '/api/ai-chat/conversations') {
      return fulfillJson(route, { success: true, conversations: [conversation] });
    }
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

test.beforeEach(async ({ page, browserName }) => {
  await page.setViewportSize({
    width: IPHONE_XR.width,
    height: browserName === 'webkit' ? 715 : IPHONE_XR.height,
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await mockCoachApi(page);
  await installAdminSession(page);
});

test('@xr iPhone XR keeps the Talk surface and every primary control inside the viewport', async ({ page }) => {
  await page.goto('/dashboard/admin/coach-assistant?threadId=301', { waitUntil: 'domcontentloaded' });

  const bridge = page.locator('.bridge-shell');
  const tabList = page.getByRole('tablist', { name: 'Swan Coach sections' });
  const dock = page.locator('.console-dock');
  await expect(bridge).toBeVisible();
  await expect(tabList).toBeVisible();
  await expect(page.getByRole('tab', { name: 'History' })).toBeVisible();
  await expect(page.getByLabel('Main client')).toHaveValue('41');
  await expect(page.getByText('Jessee M daily workout log').first()).toBeVisible();
  await expect(page.getByRole('status', { name: 'Recommended coach action', exact: true })).toBeVisible();

  const layout = await page.evaluate(() => {
    const main = document.querySelector<HTMLElement>('main[data-dashboard-scroll-root]');
    const shell = document.querySelector<HTMLElement>('.bridge-shell');
    const important = Array.from(document.querySelectorAll<HTMLElement>(
      '.client-bar, .tab-bar, .tab-button, .tab-content, .console-dock, .dock-next-pill, .dock-more, .dock-mic, .dock-send',
    ));
    const rectOf = (node: HTMLElement | null) => {
      const rect = node?.getBoundingClientRect();
      return rect ? { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height } : null;
    };

    return {
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      main: rectOf(main),
      mainOverflow: main ? main.scrollWidth - main.clientWidth : null,
      shell: rectOf(shell),
      transcript: rectOf(document.querySelector<HTMLElement>('.transcript-stream')),
      dock: rectOf(document.querySelector<HTMLElement>('.console-dock')),
      clipped: important
        .map((node) => ({
          selector: node.className,
          ...rectOf(node),
        }))
        .filter((item) => item.width && (item.left! < -1 || item.right! > window.innerWidth + 1)),
    };
  });

  expect(layout.main?.left).toBeGreaterThanOrEqual(-1);
  expect(layout.main?.right).toBeLessThanOrEqual(layout.viewportWidth + 1);
  expect(layout.mainOverflow).toBeLessThanOrEqual(1);
  expect(layout.shell?.left).toBeGreaterThanOrEqual(-1);
  expect(layout.shell?.right).toBeLessThanOrEqual(layout.viewportWidth + 1);
  expect(layout.shell?.bottom).toBeLessThanOrEqual(layout.viewportHeight + 1);
  expect(layout.transcript?.height).toBeGreaterThanOrEqual(120);
  expect(layout.dock?.bottom).toBeLessThanOrEqual(layout.viewportHeight + 1);
  expect(layout.clipped).toEqual([]);

  await dock.scrollIntoViewIfNeeded();
  await expect(page.getByRole('button', { name: 'More command tools' })).toBeVisible();
  await expect(page.getByRole('button', { name: /voice (?:recording|dictation)|listening/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /send to swan coach/i })).toBeVisible();

  const dockBox = await dock.boundingBox();
  expect(dockBox?.x ?? -1).toBeGreaterThanOrEqual(-1);
  expect((dockBox?.x ?? 0) + (dockBox?.width ?? 0)).toBeLessThanOrEqual(IPHONE_XR.width + 1);
});

test('@matrix Device Matrix and required desktop widths keep Coach controls reachable', async ({ browser }) => {
  test.setTimeout(240_000);
  const failures: string[] = [];

  for (const viewport of [...PHONE_MATRIX, ...DESKTOP_MATRIX]) {
    const context = await browser.newContext({
      baseURL: process.env.BASE_URL || 'http://127.0.0.1:5197',
      viewport: { width: viewport.width, height: viewport.height },
      screen: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: viewport.dpr,
      isMobile: viewport.phone,
      hasTouch: viewport.phone,
      reducedMotion: 'reduce',
      serviceWorkers: 'block',
    });
    const matrixPage = await context.newPage();

    try {
      await mockCoachApi(matrixPage);
      await installAdminSession(matrixPage);
      await matrixPage.goto('/dashboard/admin/coach-assistant?threadId=301', { waitUntil: 'domcontentloaded' });
      await matrixPage.locator('.bridge-shell').waitFor({ state: 'visible' });

      const audit = await matrixPage.evaluate(() => {
        const rectOf = (node: HTMLElement | null) => {
          const rect = node?.getBoundingClientRect();
          return rect ? { left: rect.left, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height } : null;
        };
        const visible = (node: HTMLElement) => {
          const rect = node.getBoundingClientRect();
          const style = getComputedStyle(node);
          return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
        };
        const important = Array.from(document.querySelectorAll<HTMLElement>(
          '.client-bar, .main-client-picker select, .tab-bar, .tab-button, .tab-content, .console-dock, .dock-next-pill, .dock-more, .dock-mic, .dock-send',
        )).filter(visible);
        const primary = Array.from(document.querySelectorAll<HTMLElement>(
          '.client-bar button, .main-client-picker select, .tab-button, .console-dock button',
        )).filter(visible);

        return {
          viewportWidth: window.innerWidth,
          viewportHeight: window.innerHeight,
          documentOverflow: document.documentElement.scrollWidth - window.innerWidth,
          main: rectOf(document.querySelector<HTMLElement>('main[data-dashboard-scroll-root]')),
          mainOverflow: (() => {
            const main = document.querySelector<HTMLElement>('main[data-dashboard-scroll-root]');
            return main ? main.scrollWidth - main.clientWidth : null;
          })(),
          shell: rectOf(document.querySelector<HTMLElement>('.bridge-shell')),
          transcript: rectOf(document.querySelector<HTMLElement>('.transcript-stream')),
          dock: rectOf(document.querySelector<HTMLElement>('.console-dock')),
          clipped: important.filter((node) => {
            const rect = node.getBoundingClientRect();
            return rect.left < -1 || rect.right > window.innerWidth + 1;
          }).map((node) => node.className),
          smallTargets: primary.filter((node) => {
            const rect = node.getBoundingClientRect();
            return rect.width < 43.5 || rect.height < 43.5;
          }).map((node) => ({ className: node.className, ...rectOf(node) })),
          primaryCounts: {
            client: important.filter((node) => node.matches('.main-client-picker select')).length,
            tabs: important.filter((node) => node.matches('.tab-button')).length,
            more: important.filter((node) => node.matches('.dock-more')).length,
            mic: important.filter((node) => node.matches('.dock-mic')).length,
            send: important.filter((node) => node.matches('.dock-send')).length,
          },
        };
      });

      const label = `${viewport.id} ${viewport.width}x${viewport.height}@${viewport.dpr}`;
      const record = (failed: boolean, detail: string) => { if (failed) failures.push(`${label}: ${detail}`); };
      record(audit.documentOverflow > 1, `document overflow ${audit.documentOverflow}px`);
      record((audit.mainOverflow ?? 0) > 1, `main overflow ${audit.mainOverflow}px`);
      record(!audit.main || audit.main.left < -1 || audit.main.right > audit.viewportWidth + 1, 'main is outside viewport');
      record(!audit.shell || audit.shell.left < -1 || audit.shell.right > audit.viewportWidth + 1, 'Coach shell is outside viewport');
      record(audit.clipped.length > 0, `clipped: ${audit.clipped.join(', ')}`);
      record(Object.values(audit.primaryCounts).some((count) => count === 0), 'a primary control is missing');

      if (viewport.phone) {
        const transcriptFloor = viewport.id === 'P12 floor' ? 1 : viewport.id === 'P10 SE' ? 64 : 120;
        record(!audit.transcript || audit.transcript.height < transcriptFloor, `transcript ${audit.transcript?.height ?? 0}px is below ${transcriptFloor}px`);
        record(!audit.shell || audit.shell.bottom > audit.viewportHeight + 1, 'Coach shell extends below viewport');
        record(!audit.dock || audit.dock.bottom > audit.viewportHeight + 1, 'dock extends below viewport');
        record(viewport.pixelPerfect && audit.smallTargets.length > 0, `sub-44px targets: ${JSON.stringify(audit.smallTargets)}`);
      }
    } catch (error) {
      failures.push(`${viewport.id}: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      await context.close();
    }
  }

  expect(failures, failures.join('\n')).toEqual([]);
});

import { expect, test, type Page, type Route } from '@playwright/test';
import path from 'node:path';

const adminUser = {
  id: 1,
  email: 'qa.admin@swanstudios.local',
  username: 'qa_admin',
  firstName: 'QA',
  lastName: 'Admin',
  role: 'admin',
  isActive: true,
};

const demoVideoPath = path.resolve(process.cwd(), 'src/assets/Swan-Video-Logo.mp4');
const uploadedDemoUrl = '/qa/bootcamp-uploaded-demo-loop.mp4';

const exercises = [
  'Goblet Squat',
  'Dumbbell Row',
  'Push-Up',
  '90/90 Hip Stretch',
].map((name, index) => ({
  id: `qa-uploaded-${index + 1}`,
  exerciseKey: `qa-uploaded-${index + 1}`,
  name,
  exerciseType: index === 3 ? 'flexibility' : 'strength',
  difficulty: 220 + index * 40,
  primaryMuscles: index === 3 ? ['hips'] : ['full body'],
  equipmentNeeded: index === 2 ? ['Bodyweight'] : ['Dumbbell'],
  bodyPartCategory: index === 3 ? 'flexibility' : 'strength',
  videoUrl: uploadedDemoUrl,
  previewVideoUrl: uploadedDemoUrl,
  thumbnailUrl: '/Logo.png',
}));

function jwt() {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return [
    encode({ alg: 'none', typ: 'JWT' }),
    encode({ iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 3600 }),
    'qa-signature',
  ].join('.');
}

async function fulfillJson(route: Route, body: unknown, status = 200) {
  await route.fulfill({
    status,
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

async function mockBootcampQaApi(page: Page) {
  await page.route(`**${uploadedDemoUrl}`, async (route) => {
    await route.fulfill({ path: demoVideoPath, contentType: 'video/mp4' });
  });

  await page.route('**/api/**', async (route) => {
    const endpoint = new URL(route.request().url()).pathname;

    if (endpoint === '/api/auth/me') return fulfillJson(route, { success: true, user: adminUser });
    if (endpoint === '/api/profile') return fulfillJson(route, { success: true, user: adminUser });
    if (endpoint === '/api/cart') return fulfillJson(route, { id: 1, status: 'active', items: [], total: 0, totalSessions: 0 });
    if (endpoint === '/api/exercises/library') return fulfillJson(route, { success: true, exercises });
    if (endpoint === '/api/workout/recommendations') return fulfillJson(route, { success: true, exercises });
    if (endpoint === '/api/workout/plans') return fulfillJson(route, { success: true, plans: [] });
    if (endpoint === '/api/subscriptions/tiers') return fulfillJson(route, { success: true, tiers: [] });
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

    return fulfillJson(route, { success: true, data: [], plans: [], stats: {} });
  });
}

async function buildUploadedMediaBootcamp(page: Page) {
  await page.goto('/dashboard/admin/bootcamp', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /boot camp class builder/i })).toBeVisible();
  await page.getByRole('button', { name: /^manual$/i }).click();
  await expect(page.getByText(/exercise rolodex/i)).toBeVisible();

  for (let station = 0; station < 4; station += 1) {
    for (const exercise of exercises) {
      await page.getByRole('button', { name: new RegExp(`add ${exercise.name}`, 'i') }).click();
    }
  }

  await expect(page.getByText('Floor visuals ready')).toBeVisible();
  await expect(page.getByLabel('Bootcamp class workflow')).toContainText('Run-ready');
  await page.getByRole('button', { name: /prepare class/i }).click();
  await expect(page.getByRole('button', { name: /start class/i })).toBeVisible();
  await page.getByRole('button', { name: /start class/i }).click();
  await expect(page.getByLabel('Bootcamp station exercise demo mode')).toBeVisible();
  await expect(page.getByLabel('Live bootcamp class runner')).toBeVisible();
  await expect(page.getByLabel('Floor director status')).toContainText('4/4 demos');
  await expect(page.getByLabel('Floor director status')).toContainText('Class 16/16 demos ready');
}

async function assertUploadedVideosReady(page: Page, minWidth: number, expectedCount = 16) {
  const videos = page.locator('video[aria-label*="exercise demo preview"]');
  await expect(videos).toHaveCount(expectedCount);
  await expect.poll(async () => videos.evaluateAll((nodes, mediaUrl) => (
    nodes.every((node) => {
      const video = node as HTMLVideoElement;
      return video.readyState >= HTMLMediaElement.HAVE_METADATA
        && video.currentSrc.includes(mediaUrl)
        && video.videoWidth > 0
        && video.videoHeight > 0;
    })
  ), uploadedDemoUrl), { timeout: 15_000 }).toBe(true);

  const layout = await page.evaluate(() => ({
    overflowX: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
    videoRects: [...document.querySelectorAll('video[aria-label*="exercise demo preview"]')]
      .map((node) => {
        const rect = node.getBoundingClientRect();
        return { width: Math.round(rect.width), height: Math.round(rect.height) };
      }),
  }));

  expect(layout.overflowX).toBeLessThanOrEqual(12);
  expect(layout.videoRects.every((rect) => rect.width >= minWidth && rect.height > 0)).toBe(true);
}

async function assertPresentationChromeHidden(page: Page, maxMainLeft: number) {
  const layout = await page.evaluate(() => {
    const main = document.querySelector('main[data-dashboard-scroll-root]');
    const appHeader = document.querySelector('[data-swan-app-header]');
    const visibleAside = [...document.querySelectorAll('aside')]
      .some((node) => getComputedStyle(node).display !== 'none');
    const visibleRoleMenu = ['Open admin menu', 'Open trainer menu', 'Open client menu'].some((label) => {
      const button = document.querySelector(`button[aria-label="${label}"]`);
      return button ? getComputedStyle(button).display !== 'none' : false;
    });
    return {
      floorClassActive: document.body.classList.contains('swan-bootcamp-floor-active'),
      appHeaderVisible: appHeader ? getComputedStyle(appHeader).display !== 'none' : false,
      mainLeft: main ? Math.round(main.getBoundingClientRect().left) : -1,
      visibleAside,
      visibleRoleMenu,
    };
  });

  expect(layout.floorClassActive).toBe(true);
  expect(layout.appHeaderVisible).toBe(false);
  expect(layout.visibleAside).toBe(false);
  expect(layout.visibleRoleMenu).toBe(false);
  expect(layout.mainLeft).toBeGreaterThanOrEqual(0);
  expect(layout.mainLeft).toBeLessThanOrEqual(maxMainLeft);
}

test.beforeEach(async ({ page }) => {
  await mockBootcampQaApi(page);
  await installAdminSession(page);
});

test('admin Bootcamp Demo Mode renders uploaded exercise videos on a 4K TV viewport', async ({ page }, testInfo) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(error.message));

  await page.setViewportSize({ width: 3840, height: 2160 });
  await buildUploadedMediaBootcamp(page);
  await assertUploadedVideosReady(page, 430);
  await assertPresentationChromeHidden(page, 56);

  await page.screenshot({ path: testInfo.outputPath('bootcamp-demo-mode-4k-uploaded-videos.png'), fullPage: false });

  await page.getByRole('link', { name: /open video/i }).first().click();
  const dialog = page.getByRole('dialog', { name: /demo video/i });
  await expect(dialog).toBeVisible();
  const modalVideo = dialog.locator('video');
  await expect(modalVideo).toBeVisible();
  await expect.poll(async () => modalVideo.evaluate((node) => {
    const video = node as HTMLVideoElement;
    return video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA
      && video.videoWidth > 0
      && video.videoHeight > 0;
  }), { timeout: 15_000 }).toBe(true);
  await modalVideo.evaluate((node) => {
    const video = node as HTMLVideoElement;
    video.muted = true;
    return video.play().catch(() => undefined);
  });
  await expect.poll(async () => modalVideo.evaluate((node) => (node as HTMLVideoElement).currentTime), {
    timeout: 15_000,
  }).toBeGreaterThan(0.35);
  await page.screenshot({ path: testInfo.outputPath('bootcamp-demo-video-modal-4k.png'), fullPage: false });

  expect(consoleErrors.filter((item) => !/preloaded using link preload/i.test(item))).toEqual([]);
});

test('admin Bootcamp Demo Mode keeps uploaded videos usable on mobile', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 430, height: 932 });
  await buildUploadedMediaBootcamp(page);
  await assertUploadedVideosReady(page, 260);
  await assertPresentationChromeHidden(page, 16);

  await page.getByRole('button', { name: /^focus$/i }).click();
  const demoBoard = page.getByLabel('Bootcamp station exercise demo mode');
  await expect(demoBoard.getByRole('button', { name: /select goblet squat/i })).toBeVisible();
  await expect(demoBoard.getByRole('button', { name: /select dumbbell row/i })).toBeVisible();

  await page.screenshot({ path: testInfo.outputPath('bootcamp-demo-mode-mobile-uploaded-videos.png'), fullPage: false });
});

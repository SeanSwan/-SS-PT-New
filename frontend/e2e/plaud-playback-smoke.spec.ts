/**
 * SMOKE: PLAUD Playback
 * =====================
 * Verifies the trainer PLAUD workspace can load authenticated clip bytes into
 * the native browser audio player without relying on seeded accounts or real
 * production recordings.
 */

import { expect, test, type Page, type Route } from '@playwright/test';

const trainerUser = {
  id: 202,
  email: 'qa.trainer@swanstudios.local',
  username: 'qa_trainer',
  firstName: 'QA',
  lastName: 'Trainer',
  role: 'trainer',
  isActive: true,
};

const clipId = '11111111-1111-4111-8111-111111111111';

function jwt() {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return [
    encode({ alg: 'none', typ: 'JWT' }),
    encode({ iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 3600 }),
    'qa-signature',
  ].join('.');
}

function silentWavBytes() {
  const sampleRate = 8000;
  const sampleCount = Math.floor(sampleRate / 4);
  const dataBytes = sampleCount * 2;
  const buffer = Buffer.alloc(44 + dataBytes);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataBytes, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataBytes, 40);

  return buffer;
}

async function fulfillJson(route: Route, body: unknown) {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

async function mockPlaudApi(page: Page) {
  await page.route('**/health', async (route) => fulfillJson(route, { status: 'ok' }));

  await page.route('**/api/**', async (route) => {
    const endpoint = new URL(route.request().url()).pathname;

    if (endpoint === '/api/auth/me') return fulfillJson(route, { success: true, user: trainerUser });
    if (endpoint === '/api/profile') return fulfillJson(route, { success: true, user: trainerUser });
    if (endpoint === `/api/plaud/clips/${clipId}/audio`) {
      return route.fulfill({
        status: 200,
        contentType: 'audio/wav',
        headers: {
          'Content-Disposition': `inline; filename="plaud-clip-${clipId}.wav"`,
        },
        body: silentWavBytes(),
      });
    }
    if (endpoint === '/api/plaud/clips') {
      return fulfillJson(route, {
        success: true,
        clips: [
          {
            clipId,
            filename: 'session-a.wav',
            mimetype: 'audio/wav',
            size: 4044,
            durationSec: 1,
            r2MirrorStatus: 'ready',
            status: 'pending_merge',
            clipSource: 'manual_upload',
            recordedAt: '2026-05-22T18:00:00.000Z',
            uploadedAt: '2026-05-22T18:01:00.000Z',
            expiresAt: '2026-05-23T18:01:00.000Z',
            playbackReady: true,
            playbackPath: `/api/plaud/clips/${clipId}/audio`,
          },
        ],
        nextCursor: null,
        hasMore: false,
      });
    }
    if (endpoint === '/api/plaud/intake') {
      return fulfillJson(route, {
        success: true,
        items: [],
        summary: {
          total: 1,
          actionable: 1,
          today: 1,
          unprocessed: 1,
          processing: 0,
          readyReview: 0,
          needsClarification: 0,
          duplicateHold: 0,
          failed: 0,
          needsClient: 0,
        },
        scope: 'actionable',
        limit: 20,
      });
    }
    if (endpoint === '/api/plaud/intake/groups') {
      return fulfillJson(route, { success: true, groups: [], limit: 8, maxGapMinutes: 90 });
    }

    return fulfillJson(route, { success: true, data: [], notifications: [], stats: {}, counts: {} });
  });
}

async function installTrainerSession(page: Page) {
  await page.addInitScript(
    ({ token, user }) => {
      localStorage.setItem('token', token);
      localStorage.setItem('tokenTimestamp', Date.now().toString());
      localStorage.setItem('user', JSON.stringify(user));
    },
    { token: jwt(), user: trainerUser },
  );
}

test.beforeEach(async ({ page }) => {
  await mockPlaudApi(page);
  await installTrainerSession(page);
});

test('trainer PLAUD workspace loads clip bytes into native audio playback', async ({ page }, testInfo) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(error.message));

  await page.goto('/dashboard/trainer/plaud?pieces=pending', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => undefined);

  await expect(page.getByTestId('plaud-intelligence-workspace')).toBeVisible();
  await expect(page.getByRole('list', { name: /pending plaud clips/i })).toBeVisible();
  await expect(page.getByText('Audio clip 1')).toBeVisible();

  const audioResponse = page.waitForResponse((response) => (
    new URL(response.url()).pathname === `/api/plaud/clips/${clipId}/audio`
  ));
  await page.getByRole('button', { name: /load audio preview for audio clip 1/i }).click();
  await expect((await audioResponse).status()).toBe(200);

  const player = page.getByLabel(/audio preview for audio clip 1/i);
  await expect(player).toBeVisible();
  await expect(player).toHaveJSProperty('controls', true);

  const playback = await player.evaluate(async (node) => {
    const audio = node as HTMLAudioElement;
    audio.muted = true;
    audio.load();
    await new Promise<void>((resolve, reject) => {
      if (audio.readyState >= HTMLMediaElement.HAVE_METADATA) {
        resolve();
        return;
      }
      const timer = window.setTimeout(() => reject(new Error('audio metadata timeout')), 5000);
      audio.addEventListener('loadedmetadata', () => {
        window.clearTimeout(timer);
        resolve();
      }, { once: true });
      audio.addEventListener('error', () => {
        window.clearTimeout(timer);
        reject(new Error(`audio element error ${audio.error?.code || 'unknown'}`));
      }, { once: true });
    });
    await audio.play();
    const result = {
      currentSrc: audio.currentSrc,
      duration: audio.duration,
      paused: audio.paused,
      readyState: audio.readyState,
    };
    audio.pause();
    return result;
  });

  expect(playback.currentSrc).toMatch(/^blob:/);
  expect(playback.duration).toBeGreaterThan(0);
  expect(playback.paused).toBe(false);
  expect(playback.readyState).toBeGreaterThanOrEqual(1);

  await page.screenshot({ path: testInfo.outputPath('plaud-playback-smoke.png'), fullPage: false });
  expect(consoleErrors.filter((item) => !/preloaded using link preload/i.test(item))).toEqual([]);
});

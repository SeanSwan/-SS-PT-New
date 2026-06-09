/**
 * SMOKE: Coach Intake PLAUD Playback
 * ==================================
 * Verifies the unified admin Coach intake card can play PLAUD clip bytes and
 * stay touch-safe inside the active mobile review target.
 */

import { expect, test, type Page, type Route } from '@playwright/test';

const adminUser = {
  id: 101,
  email: 'qa.admin@swanstudios.local',
  username: 'qa_admin',
  firstName: 'QA',
  lastName: 'Admin',
  role: 'admin',
  isActive: true,
};

const clipId = '11111111-1111-4111-8111-111111111111';
const now = '2026-05-22T18:01:00.000Z';

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

function summary() {
  return {
    total: 1,
    actionable: 1,
    today: 1,
    unprocessed: 1,
    processing: 0,
    readyReview: 0,
    needsClarification: 0,
    duplicateHold: 0,
    failed: 0,
    needsClient: 1,
    preparedDrafts: 0,
    pendingDrafts: 0,
    applyingDrafts: 0,
    approvedDrafts: 0,
    appliedDrafts: 0,
    rejectedDrafts: 0,
    failedDrafts: 0,
  };
}

function activeClipItem() {
  return {
    id: `clip:${clipId}`,
    entityId: clipId,
    kind: 'clip',
    source: 'applaud_local_sync',
    sourceLabel: 'Applaud',
    queueStatus: 'unprocessed',
    title: 'Applaud recording awaiting client match',
    clientId: null,
    clientName: null,
    needsClient: true,
    clipCount: 1,
    parsedExerciseCount: null,
    canReview: false,
    errorCode: null,
    status: 'pending_merge',
    createdAt: now,
    timelineAt: now,
    timelineAtSource: 'uploaded_at',
    recordedAt: '2026-05-22T18:00:00.000Z',
    completedAt: null,
    expiresAt: '2026-05-23T18:01:00.000Z',
    durationSec: 1,
    sizeBytes: 4044,
    mirrorStatus: 'mirrored',
    r2MirrorStatus: 'mirrored',
    mimetype: 'audio/wav',
    playbackReady: true,
    playbackPath: `/api/plaud/clips/${clipId}/audio`,
    audioPuzzle: {
      pieceCount: 1,
      bundleCount: 1,
      autoBundleCount: 0,
      needsOrderingReview: false,
      confidence: 'single',
    },
  };
}

async function mockAdminApi(page: Page) {
  await page.route('**/health', async (route) => fulfillJson(route, { status: 'ok' }));

  await page.route('**/api/**', async (route) => {
    const endpoint = new URL(route.request().url()).pathname;

    if (endpoint === '/api/auth/me') return fulfillJson(route, { success: true, user: adminUser });
    if (endpoint === '/api/profile') return fulfillJson(route, { success: true, user: adminUser });
    if (endpoint === '/api/ai-chat/conversations') {
      return fulfillJson(route, { success: true, conversations: [] });
    }
    if (endpoint === '/api/coach/intake/queue') {
      return fulfillJson(route, {
        success: true,
        items: [activeClipItem()],
        summary: summary(),
        scope: 'actionable',
        limit: 12,
        schemaReady: true,
      });
    }
    if (endpoint === '/api/coach/intake/health') {
      return fulfillJson(route, {
        success: true,
        health: {
          schemaReady: true,
          status: 'attention',
          generatedAt: now,
          counts: { ...summary(), stuckProcessing: 0 },
          oldestActionableAt: now,
          oldestProcessingAt: null,
          thresholds: { processingStuckMinutes: 15 },
          nextOperatorAction: { key: 'review_ready', label: 'Review next intake' },
        },
      });
    }
    if (endpoint === '/api/coach/intake/retention') {
      return fulfillJson(route, {
        success: true,
        retention: {
          schemaReady: true,
          status: 'healthy',
          generatedAt: now,
          summary: { totalWithRawArtifacts: 1, purgeReady: 0, reviewRequired: 1, retained: 1 },
          items: [],
          nextOperatorAction: { key: 'review_stale_intake', label: 'Retention clear' },
        },
      });
    }
    if (endpoint === '/api/coach/intake/retention/purge-plan') {
      return fulfillJson(route, {
        success: true,
        purgePlan: {
          enabled: false,
          dryRun: true,
          schemaReady: true,
          generatedAt: now,
          summary: { totalWithRawArtifacts: 1, purgeReady: 0, reviewRequired: 1, retained: 1 },
          purgeReady: 0,
          purged: 0,
          skippedReason: 'disabled',
        },
      });
    }
    if (endpoint === `/api/plaud/clips/${clipId}/audio`) {
      return route.fulfill({
        status: 200,
        contentType: 'audio/wav',
        headers: { 'Content-Disposition': `inline; filename="plaud-clip-${clipId}.wav"` },
        body: silentWavBytes(),
      });
    }
    if (endpoint === '/api/plaud/clips') {
      return fulfillJson(route, { success: true, clips: [], nextCursor: null, hasMore: false });
    }
    if (endpoint === '/api/plaud/merge-requests') {
      return fulfillJson(route, { success: true, mergeRequests: [] });
    }
    if (endpoint === '/api/plaud/intake' || endpoint === '/api/plaud/intake/groups') {
      return fulfillJson(route, { success: true, items: [], groups: [], summary: summary(), scope: 'actionable', limit: 20 });
    }

    return fulfillJson(route, { success: true, data: [], notifications: [], stats: {}, counts: {} });
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

test.beforeEach(async ({ page }) => {
  await mockAdminApi(page);
  await installAdminSession(page);
});

test('admin Coach intake active PLAUD card plays audio without mobile overflow', async ({ page }, testInfo) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto(`/dashboard/admin/coach-assistant?intake=${clipId}`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => undefined);

  const activeTarget = page.getByTestId('coach-active-intake-dossier');
  await expect(activeTarget).toBeVisible();
  await expect(activeTarget.getByText('Audio playback')).toBeVisible();

  const audioResponse = page.waitForResponse((response) => (
    new URL(response.url()).pathname === `/api/plaud/clips/${clipId}/audio`
  ));
  await activeTarget.getByRole('button', { name: /load audio preview for active plaud intake clip/i }).click();
  await expect((await audioResponse).status()).toBe(200);
  await expect(activeTarget.getByLabel(/audio preview for active plaud intake clip/i)).toBeVisible();

  const touchIssues = await activeTarget.locator('button, a, audio').evaluateAll((nodes) => nodes
    .map((node) => {
      const rect = node.getBoundingClientRect();
      return {
        label: node.getAttribute('aria-label') || node.textContent?.trim() || node.tagName,
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      };
    })
    .filter((item) => item.width > 0 && item.height > 0 && (item.width < 44 || item.height < 44)));
  expect(touchIssues).toEqual([]);

  const layout = await activeTarget.evaluate((node) => ({
    clientWidth: node.clientWidth,
    scrollWidth: node.scrollWidth,
  }));
  expect(layout.scrollWidth - layout.clientWidth).toBeLessThanOrEqual(1);

  const overlaps = await activeTarget.locator('button, a, audio').evaluateAll((nodes) => {
    const boxes = nodes
      .map((node) => {
        const rect = node.getBoundingClientRect();
        return {
          label: node.getAttribute('aria-label') || node.textContent?.trim() || node.tagName,
          left: rect.left,
          right: rect.right,
          top: rect.top,
          bottom: rect.bottom,
          width: rect.width,
          height: rect.height,
        };
      })
      .filter((box) => box.width > 0 && box.height > 0);
    const pairs: string[] = [];
    for (let i = 0; i < boxes.length; i += 1) {
      for (let j = i + 1; j < boxes.length; j += 1) {
        const a = boxes[i];
        const b = boxes[j];
        if (a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top) {
          pairs.push(`${a.label} overlaps ${b.label}`);
        }
      }
    }
    return pairs;
  });
  expect(overlaps).toEqual([]);

  await activeTarget.screenshot({ path: testInfo.outputPath('coach-intake-plaud-active-card.png') });
  expect(pageErrors).toEqual([]);
});

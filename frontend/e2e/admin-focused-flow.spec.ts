import { test, expect, type APIRequestContext, type Page, type Locator } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:10000';

type AdminSession = {
  token: string;
  user: any;
  username: string;
};

type CredentialCandidate = {
  username: string;
  password: string;
};

// TODO: Replace hardcoded credentials with env-only auth before production/CI.
// These are temporary dev/test fallbacks to unblock local Playwright runs.
const credentialCandidates: CredentialCandidate[] = [
  {
    username: process.env.E2E_ADMIN_EMAIL || '',
    password: process.env.E2E_ADMIN_PASSWORD || '',
  },
  {
    username: process.env.E2E_ADMIN_USERNAME || '',
    password: process.env.E2E_ADMIN_PASSWORD || '',
  },
  {
    username: process.env.TEST_EMAIL || '',
    password: process.env.TEST_PASSWORD || '',
  },
  { username: 'admin@swanstudios.com', password: 'admin123' },
  { username: 'ogpswan@yahoo.com', password: 'KlackKlack80' },
  { username: 'admin@swanstudios.com', password: 'KlackKlack80' },
].filter((candidate) => candidate.username.trim() && candidate.password.trim());

let cachedSession: AdminSession | null = null;

function parseIdFromTestId(value: string | null, prefix: string) {
  if (!value || !value.startsWith(prefix)) return null;
  const id = Number(value.replace(prefix, ''));
  return Number.isFinite(id) ? id : null;
}

async function resolveAdminSession(request: APIRequestContext): Promise<AdminSession> {
  if (cachedSession) return cachedSession;

  const attempts: Array<{ username: string; status: number; hasToken: boolean }> = [];

  for (const candidate of credentialCandidates) {
    const response = await request.post(`${API_BASE_URL}/api/auth/login`, {
      data: { username: candidate.username, password: candidate.password },
    });

    let payload: any = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    attempts.push({
      username: candidate.username,
      status: response.status(),
      hasToken: Boolean(payload?.token),
    });

    if (response.ok() && payload?.token) {
      cachedSession = {
        token: payload.token,
        user: payload.user || {},
        username: candidate.username,
      };
      return cachedSession;
    }
  }

  throw new Error(`Unable to login as admin. Attempts: ${JSON.stringify(attempts)}`);
}

async function bootstrapAdminPage(page: Page) {
  const session = await resolveAdminSession(page.request);

  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(
    ({ token, user }) => {
      localStorage.setItem('token', token);
      localStorage.setItem('accessToken', token);
      localStorage.setItem('tokenTimestamp', Date.now().toString());
      localStorage.setItem('user', JSON.stringify(user || {}));
    },
    { token: session.token, user: session.user }
  );

  return session;
}

async function fetchJson(page: Page, token: string, url: string) {
  const response = await page.request.get(`${API_BASE_URL}${url}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(response.ok(), `GET ${url} should succeed`).toBeTruthy();
  return response.json();
}

test.describe('Focused Admin Verification Flow', () => {
  test.setTimeout(180_000);

  test('Command Center social + orientation widgets render with live data', async ({ page }) => {
    await bootstrapAdminPage(page);

    const socialResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === 'GET' &&
        response.url().includes('/api/social/posts/feed'),
      { timeout: 45_000 }
    );

    const orientationResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === 'GET' &&
        response.url().includes('/api/orientation/all'),
      { timeout: 45_000 }
    );

    await page.goto(`${BASE_URL}/dashboard/home`, { waitUntil: 'domcontentloaded' });

    const [socialResponse, orientationResponse] = await Promise.all([
      socialResponsePromise,
      orientationResponsePromise,
    ]);

    expect(socialResponse.status(), 'Social feed request should be authorized and successful').toBe(200);
    expect(orientationResponse.status(), 'Orientation queue request should be authorized and successful').toBe(200);

    const socialPayload = await socialResponse.json();
    const orientationPayload = await orientationResponse.json();

    expect(Array.isArray(socialPayload?.posts), 'Social payload should contain posts array').toBe(true);
    expect(Array.isArray(orientationPayload?.data), 'Orientation payload should contain data array').toBe(true);

    await expect(page.getByRole('heading', { name: 'Orientation Intake' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Social Intelligence' })).toBeVisible();
    await expect(page.getByText('Could not load social feed metrics')).toHaveCount(0);
  });

  test('client/trainer photo updates persist', async ({ page }) => {
    const session = await bootstrapAdminPage(page);
    const stamp = Date.now();
    const nextClientPhoto = `https://cdn.swanstudios.dev/qa/client-photo-${stamp}.jpg`;
    const nextTrainerPhoto = `https://cdn.swanstudios.dev/qa/trainer-photo-${stamp}.jpg`;

    let clientId: number | null = null;
    let trainerId: number | null = null;
    let originalClientPhoto: string | null = null;
    let originalTrainerPhoto: string | null = null;

    try {
      await page.goto(`${BASE_URL}/dashboard/people`, { waitUntil: 'domcontentloaded' });
      const firstClientCard = page.locator('[data-testid^="client-card-"]').first();
      await expect(firstClientCard).toBeVisible({ timeout: 30_000 });

      const clientTestId = await firstClientCard.getAttribute('data-testid');
      clientId = parseIdFromTestId(clientTestId, 'client-card-');
      expect(clientId, 'Could not parse client id from data-testid').not.toBeNull();

      const clientsPayload = await fetchJson(page, session.token, '/api/admin/clients?limit=200');
      const clientsRows = Array.isArray(clientsPayload?.data?.clients) ? clientsPayload.data.clients : [];
      const clientRow = clientsRows.find((row: any) => Number(row.id) === clientId);
      expect(clientRow, `Client ${clientId} should exist in API payload`).toBeTruthy();
      originalClientPhoto = clientRow?.photo || null;

      const clientUpdatePromise = page.waitForResponse(
        (response) =>
          response.request().method() === 'PUT' &&
          response.url().includes(`/api/admin/clients/${clientId}`),
        { timeout: 20_000 }
      );
      page.once('dialog', (dialog) => dialog.accept(nextClientPhoto));
      await firstClientCard.locator('[data-action-menu] button').click();
      await page.getByTestId(`menu-set-client-photo-${clientId}`).click();
      const clientUpdateResponse = await clientUpdatePromise;
      expect(clientUpdateResponse.status(), 'Client photo update should not fail').toBeLessThan(500);

      await page.goto(`${BASE_URL}/dashboard/people`, { waitUntil: 'domcontentloaded' });
      const refreshedClientCard = page.getByTestId(`client-card-${clientId}`);
      await expect(refreshedClientCard).toBeVisible({ timeout: 30_000 });

      let clientPromptDefault = '';
      const clientPromptCaptured = new Promise<void>((resolve) => {
        page.once('dialog', (dialog) => {
          clientPromptDefault = dialog.defaultValue();
          dialog.dismiss();
          resolve();
        });
      });
      await refreshedClientCard.locator('[data-action-menu] button').click();
      await page.getByTestId(`menu-set-client-photo-${clientId}`).click();
      await clientPromptCaptured;
      expect(clientPromptDefault.trim(), 'Client photo prompt should preload persisted URL').toBe(nextClientPhoto);

      const clientsAfter = await fetchJson(page, session.token, '/api/admin/clients?limit=200');
      const persistedClient = (clientsAfter?.data?.clients || []).find((row: any) => Number(row.id) === clientId);
      expect((persistedClient?.photo || '').trim(), 'Client photo should persist in API payload').toBe(nextClientPhoto);

      await page.goto(`${BASE_URL}/dashboard/people/trainers`, { waitUntil: 'domcontentloaded' });
      const firstTrainerRow = page.locator('[data-testid^="trainer-row-"]').first();
      await expect(firstTrainerRow).toBeVisible({ timeout: 30_000 });

      const trainerTestId = await firstTrainerRow.getAttribute('data-testid');
      trainerId = parseIdFromTestId(trainerTestId, 'trainer-row-');
      expect(trainerId, 'Could not parse trainer id from data-testid').not.toBeNull();

      const trainersPayload = await fetchJson(page, session.token, '/api/admin/trainers');
      const trainerRows = Array.isArray(trainersPayload?.trainers) ? trainersPayload.trainers : [];
      const trainerRow = trainerRows.find((row: any) => Number(row.id) === trainerId);
      expect(trainerRow, `Trainer ${trainerId} should exist in API payload`).toBeTruthy();
      originalTrainerPhoto = trainerRow?.photo || null;

      const trainerUpdatePromise = page.waitForResponse(
        (response) =>
          response.request().method() === 'PUT' &&
          response.url().includes(`/api/admin/users/${trainerId}`),
        { timeout: 20_000 }
      );
      page.once('dialog', (dialog) => dialog.accept(nextTrainerPhoto));
      await page.getByTestId(`set-trainer-photo-${trainerId}`).click();
      const trainerUpdateResponse = await trainerUpdatePromise;
      expect(trainerUpdateResponse.status(), 'Trainer photo update should not fail').toBeLessThan(500);

      await page.goto(`${BASE_URL}/dashboard/people/trainers`, { waitUntil: 'domcontentloaded' });
      await expect(page.getByTestId(`trainer-row-${trainerId}`)).toBeVisible({ timeout: 30_000 });

      let trainerPromptDefault = '';
      const trainerPromptCaptured = new Promise<void>((resolve) => {
        page.once('dialog', (dialog) => {
          trainerPromptDefault = dialog.defaultValue();
          dialog.dismiss();
          resolve();
        });
      });
      await page.getByTestId(`set-trainer-photo-${trainerId}`).click();
      await trainerPromptCaptured;
      expect(trainerPromptDefault.trim(), 'Trainer photo prompt should preload persisted URL').toBe(nextTrainerPhoto);
    } finally {
      if (clientId !== null) {
        await page.request.put(`${API_BASE_URL}/api/admin/clients/${clientId}`, {
          headers: { Authorization: `Bearer ${session.token}` },
          data: { photo: originalClientPhoto || null },
        });
      }

      if (trainerId !== null) {
        await page.request.put(`${API_BASE_URL}/api/admin/users/${trainerId}`, {
          headers: { Authorization: `Bearer ${session.token}` },
          data: { photo: originalTrainerPhoto || null },
        });
      }
    }
  });

  test('assignment drag/drop + unassign works end-to-end', async ({ page }) => {
    await bootstrapAdminPage(page);
    await page.goto(`${BASE_URL}/dashboard/people/assignments`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('assignment-board')).toBeVisible({ timeout: 30_000 });

    const unassignedPanel = page.getByTestId('unassigned-clients-panel');
    const trainerZones = page.locator('[data-testid^="trainer-zone-"]');
    await expect(trainerZones.first()).toBeVisible({ timeout: 30_000 });

    const ensureUnassignedClient = async () => {
      const cards = unassignedPanel.locator('[data-testid^="unassigned-client-"]');
      if ((await cards.count()) > 0) return;

      const removeButtons = page.locator('[data-testid^="remove-assignment-"]');
      if ((await removeButtons.count()) === 0) {
        throw new Error('Cannot validate assignment flow: no unassigned clients and no existing assignments to remove.');
      }

      const deleteResponse = page.waitForResponse(
        (response) =>
          response.request().method() === 'DELETE' &&
          response.url().includes('/api/assignments/'),
        { timeout: 20_000 }
      );
      await removeButtons.first().click();
      await deleteResponse;
      await expect(cards.first()).toBeVisible({ timeout: 20_000 });
    };

    await ensureUnassignedClient();

    let targetZone: Locator | null = null;
    const zoneCount = await trainerZones.count();
    for (let idx = 0; idx < zoneCount; idx += 1) {
      const zone = trainerZones.nth(idx);
      const zoneText = await zone.innerText();
      const capacityMatch = zoneText.match(/(\d+)\s*\/\s*(\d+)/);
      const isNotFull = !capacityMatch || Number(capacityMatch[1]) < Number(capacityMatch[2]);
      if (!isNotFull) continue;

      const removeCount = await zone.locator('[data-testid^="remove-assignment-"]').count();
      if (removeCount === 0) {
        targetZone = zone;
        break;
      }

      if (!targetZone) {
        targetZone = zone;
      }
    }

    expect(targetZone, 'No trainer zone available for assignment').toBeTruthy();
    const dropZone = targetZone as Locator;

    const clientCard = unassignedPanel.locator('[data-testid^="unassigned-client-"]').first();
    const clientName = (await clientCard.locator('.name').innerText()).trim();
    const clientTestId = await clientCard.getAttribute('data-testid');
    const draggedClientId = parseIdFromTestId(clientTestId, 'unassigned-client-');
    expect(draggedClientId, 'Could not parse client id from assignment card').not.toBeNull();

    const assignResponse = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        response.url().endsWith('/api/assignments'),
      { timeout: 20_000 }
    );
    await clientCard.dragTo(dropZone);
    await assignResponse;

    const assignedItem = dropZone.getByTestId(`assigned-client-${draggedClientId}`);
    await expect(assignedItem).toBeVisible({ timeout: 20_000 });

    const removeButton = assignedItem.locator('[data-testid^="remove-assignment-"]').first();
    await expect(removeButton).toBeEnabled({ timeout: 20_000 });

    const unassignResponse = page.waitForResponse(
      (response) =>
        response.request().method() === 'DELETE' &&
        response.url().includes('/api/assignments/'),
      { timeout: 20_000 }
    );
    await removeButton.click();
    await unassignResponse;

    await expect(unassignedPanel.locator('.name', { hasText: clientName })).toBeVisible({ timeout: 20_000 });
  });
});

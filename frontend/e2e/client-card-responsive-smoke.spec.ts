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

const trainerUser = {
  id: 7,
  email: 'qa.trainer@swanstudios.local',
  username: 'qa_trainer',
  firstName: 'QA',
  lastName: 'Trainer',
  role: 'trainer',
  isActive: true,
};

const stressClient = {
  id: 501,
  firstName: 'Alexandria-Cassandra',
  lastName: 'Van Der Performance-Rebuild',
  email: 'alexandria.measurements.biometrics.programs@swanstudios.local',
  phone: '+1 555 010 2219',
  clientSource: 'swanstudios',
  isActive: true,
  availableSessions: 12,
  totalWorkouts: 47,
  fitnessGoal: 'Programs, biometrics, measurements, and strength rebuild tracked without cramped mobile overlap.',
  trainingExperience: 'advanced return-to-training',
  onboardingPct: 86,
  onboardingCompletionPercentage: 86,
  membershipLevel: 'elite',
  createdAt: '2026-05-01T12:00:00.000Z',
  joinDate: '2026-05-01T12:00:00.000Z',
  lastWorkoutDate: '2026-06-05T12:00:00.000Z',
  nextSessionDate: '2026-06-12T12:00:00.000Z',
};

const secondClient = {
  id: 502,
  firstName: 'Jordan',
  lastName: 'Mobility',
  email: 'jordan.mobility@swanstudios.local',
  phone: null,
  clientSource: 'move_fitness',
  isActive: true,
  availableSessions: 0,
  totalWorkouts: 3,
  fitnessGoal: 'Rebuild conditioning and keep plan accountability visible.',
  trainingExperience: 'returning',
  onboardingPct: 100,
  membershipLevel: 'premium',
  createdAt: '2026-05-02T12:00:00.000Z',
};

const responsiveViewports = [
  { name: 'phone', width: 414, height: 896 },
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'qhd', width: 2560, height: 1440 },
  { name: '4k', width: 3840, height: 2160 },
] as const;

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

async function seedAuth(page: Page, user: typeof adminUser | typeof trainerUser) {
  await page.addInitScript(
    ({ token, currentUser }) => {
      localStorage.setItem('token', token);
      localStorage.setItem('tokenTimestamp', Date.now().toString());
      localStorage.setItem('user', JSON.stringify(currentUser));
    },
    { token: jwt(), currentUser: user },
  );
}

async function mockSharedApi(page: Page, user: typeof adminUser | typeof trainerUser) {
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const endpoint = new URL(request.url()).pathname;

    if (endpoint === '/api/auth/me') return fulfillJson(route, { success: true, user });
    if (endpoint === '/api/profile') return fulfillJson(route, { success: true, user });
    if (endpoint === '/api/admin/clients') {
      return fulfillJson(route, { success: true, data: { clients: [stressClient, secondClient] } });
    }
    if (endpoint === '/api/admin/clients/501') {
      return fulfillJson(route, { success: true, data: { client: stressClient } });
    }
    if (endpoint === '/api/admin/clients/activation-queue') {
      return fulfillJson(route, {
        success: true,
        data: {
          queue: [],
          summary: {
            total: 0,
            needsWaiver: 0,
            needsOnboarding: 0,
            awaitingSessionAllocation: 0,
            readyToSchedule: 0,
            byNextStep: {},
          },
        },
      });
    }
    if (endpoint === '/api/client-trainer-assignments/trainer/7') {
      return fulfillJson(route, {
        success: true,
        totalClients: 2,
        assignments: [
          { id: 9001, trainerId: 7, status: 'active', assignedAt: '2026-05-22T12:00:00.000Z', client: stressClient },
          { id: 9002, trainerId: 7, status: 'active', assignedAt: '2026-05-23T12:00:00.000Z', client: secondClient },
        ],
      });
    }
    if (endpoint === '/api/sessions/history/501') {
      return fulfillJson(route, [{ id: 1, status: 'completed', sessionDate: '2026-06-05T12:00:00.000Z' }]);
    }
    if (endpoint === '/api/sessions/history/502') {
      return fulfillJson(route, [{ id: 2, status: 'completed', sessionDate: '2026-06-01T12:00:00.000Z' }]);
    }
    if (endpoint === '/api/sessions/upcoming/501') {
      return fulfillJson(route, [{ id: 3, status: 'scheduled', sessionDate: '2026-06-12T12:00:00.000Z' }]);
    }
    if (endpoint === '/api/sessions/upcoming/502') return fulfillJson(route, []);

    return fulfillJson(route, { success: true, data: [], clients: [], stats: {}, notifications: [] });
  });
}

async function inspectCardLayout(page: Page) {
  return page.evaluate(() => {
    const issues: string[] = [];
    const visible = (element: Element) => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
    };
    const labelFor = (element: Element) =>
      element.getAttribute('aria-label')
      || element.getAttribute('data-swan-card-section')
      || element.getAttribute('data-swan-client-card')
      || element.textContent?.trim().replace(/\s+/g, ' ').slice(0, 80)
      || element.tagName.toLowerCase();
    const overlapArea = (a: DOMRect, b: DOMRect) => {
      const width = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
      const height = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
      return width * height;
    };
    const checkGroup = (group: Element) => {
      const groupRect = group.getBoundingClientRect();
      const children = Array.from(group.children).filter(visible);
      children.forEach((child) => {
        const rect = child.getBoundingClientRect();
        if (rect.left < groupRect.left - 1 || rect.right > groupRect.right + 1) {
          issues.push(`${labelFor(child)} escapes ${labelFor(group)} horizontally`);
        }
      });
      for (let i = 0; i < children.length; i += 1) {
        for (let j = i + 1; j < children.length; j += 1) {
          const first = children[i].getBoundingClientRect();
          const second = children[j].getBoundingClientRect();
          if (overlapArea(first, second) > 1) {
            issues.push(`${labelFor(children[i])} overlaps ${labelFor(children[j])} in ${labelFor(group)}`);
          }
        }
      }
    };

    document.querySelectorAll('[data-swan-client-card], [data-swan-card-section]').forEach((element) => {
      if (visible(element)) checkGroup(element);
    });

    document.querySelectorAll('[data-swan-client-card] button').forEach((button) => {
      if (!visible(button)) return;
      const rect = button.getBoundingClientRect();
      if (rect.width < 43 || rect.height < 43) {
        issues.push(`${labelFor(button)} touch target is ${Math.round(rect.width)}x${Math.round(rect.height)}`);
      }
    });

    return {
      overflowX: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
      issues,
    };
  });
}

function collectUnexpectedConsoleErrors(page: Page) {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(error.message));
  return consoleErrors;
}

const isKnownConsoleNoise = (message: string) => (
  /preloaded using link preload/i.test(message)
  || /^Failed to load resource: the server responded with a status of 400 \(Bad Request\)$/.test(message)
);

for (const viewport of responsiveViewports) {
  test(`admin client cards have no responsive overlap at ${viewport.name}`, async ({ page }, testInfo) => {
    const consoleErrors = collectUnexpectedConsoleErrors(page);
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await seedAuth(page, adminUser);
    await mockSharedApi(page, adminUser);

    await page.goto('/dashboard/admin/client-management', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => undefined);
    await expect(page.locator('[data-swan-client-card="admin"]').first()).toBeVisible();
    await expect(page.getByText(/Programs, biometrics, measurements/i)).toBeVisible();

    await page.getByRole('button', { name: /select a client/i }).click();
    await page.getByLabel(/search clients/i).fill('biometrics');
    await expect(page.getByRole('option', { name: /Alexandria-Cassandra/i })).toBeVisible();

    const layout = await inspectCardLayout(page);
    expect(layout.overflowX, `horizontal overflow at ${viewport.name}`).toBeLessThanOrEqual(12);
    expect(layout.issues).toEqual([]);
    expect(consoleErrors.filter((item) => !isKnownConsoleNoise(item))).toEqual([]);

    await page.screenshot({ path: testInfo.outputPath(`admin-client-cards-${viewport.name}.png`), fullPage: false });
  });

  test(`trainer client cards have no responsive overlap at ${viewport.name}`, async ({ page }, testInfo) => {
    const consoleErrors = collectUnexpectedConsoleErrors(page);
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await seedAuth(page, trainerUser);
    await mockSharedApi(page, trainerUser);

    await page.goto('/dashboard/trainer/clients', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => undefined);
    await expect(page.locator('[data-swan-client-card="trainer"]').first()).toBeVisible();
    await expect(page.locator('[data-swan-client-card="trainer"]').first().getByText(/Workout Proof/i)).toBeVisible();

    await page.getByPlaceholder(/search clients/i).fill('measurements');
    await expect(page.locator('[data-swan-client-card="trainer"]').filter({ hasText: /Alexandria-Cassandra/i })).toBeVisible();
    await expect(page.getByText(/Jordan Mobility/i)).toHaveCount(0);

    const layout = await inspectCardLayout(page);
    expect(layout.overflowX, `horizontal overflow at ${viewport.name}`).toBeLessThanOrEqual(12);
    expect(layout.issues).toEqual([]);
    expect(consoleErrors.filter((item) => !isKnownConsoleNoise(item))).toEqual([]);

    await page.screenshot({ path: testInfo.outputPath(`trainer-client-cards-${viewport.name}.png`), fullPage: false });
  });
}

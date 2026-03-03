import { test, expect, type Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:10000';

type CredentialCandidate = {
  username: string;
  password: string;
};

type LoginCache = {
  token: string;
  user: any;
};

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
  { username: 'admin@sswanstudios.com', password: 'testpassword' },
  { username: 'admin@test.com', password: 'TestAdmin123!' },
].filter((candidate) => candidate.username.trim() && candidate.password.trim());

let loginCache: LoginCache | null = null;

async function tryApiLogin(page: Page, candidate: CredentialCandidate) {
  const response = await page.request.post(`${API_BASE_URL}/api/auth/login`, {
    data: { username: candidate.username, password: candidate.password },
  });

  let body: any = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  return {
    ok: response.ok(),
    status: response.status(),
    token: body?.token || null,
    user: body?.user || null,
  };
}

async function loginAsAdmin(page: Page) {
  if (!loginCache) {
    let winningToken: string | null = null;
    let winningUser: any = null;
    const attempts: Array<{ username: string; status: number; hasToken: boolean }> = [];

    for (const candidate of credentialCandidates) {
      const attempt = await tryApiLogin(page, candidate);
      attempts.push({
        username: candidate.username,
        status: attempt.status,
        hasToken: Boolean(attempt.token),
      });
      if (attempt.ok && attempt.token) {
        winningToken = attempt.token;
        winningUser = attempt.user;
        break;
      }
    }

    expect(
      winningToken,
      `No admin credential candidate was accepted by /api/auth/login. Attempts: ${JSON.stringify(attempts)}`
    ).toBeTruthy();
    loginCache = { token: winningToken as string, user: winningUser };
  }

  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(
    ({ token, user }) => {
      localStorage.setItem('token', token);
      localStorage.setItem('tokenTimestamp', Date.now().toString());
      localStorage.setItem('user', JSON.stringify(user || {}));
    },
    { token: loginCache.token, user: loginCache.user }
  );

  await page.goto(`${BASE_URL}/dashboard/people`, { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/\/dashboard\/people/, { timeout: 30000 });
}

test.describe('Admin Nav Cleanup - Clients & Team', () => {
  test.setTimeout(120000);

  test('shows strict curated tab set and hides removed top-level tabs', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(`${BASE_URL}/dashboard/people`);

    const expectedVisibleTabs = [
      'Clients',
      'Users',
      'Trainers',
      'Orientation Queue',
      'Onboarding',
      'Messages',
      'Measurements',
      'Progress',
      'Assignments',
      'Waivers',
    ];

    for (const tabName of expectedVisibleTabs) {
      await expect(page.getByRole('tab', { name: tabName })).toBeVisible();
    }

    const removedTabs = [
      'SMS Logs',
      'Notes',
      'Nutrition',
      'Workouts',
      'Photos',
      'NASM',
      'Permissions',
      'Social',
    ];

    for (const tabName of removedTabs) {
      await expect(page.getByRole('tab', { name: tabName })).toHaveCount(0);
    }
  });

  test('navigates through key retained tabs without dead routes', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(`${BASE_URL}/dashboard/people`);

    const routeChecks: Array<{ tab: string; expectedPath: string }> = [
      { tab: 'Orientation Queue', expectedPath: '/dashboard/people/orientations' },
      { tab: 'Measurements', expectedPath: '/dashboard/people/measurements' },
      { tab: 'Assignments', expectedPath: '/dashboard/people/assignments' },
      { tab: 'Waivers', expectedPath: '/dashboard/people/waivers' },
    ];

    for (const check of routeChecks) {
      const tab = page.getByRole('tab', { name: check.tab });
      await tab.evaluate((el) => (el as HTMLElement).click());
      await expect(page).toHaveURL(new RegExp(check.expectedPath.replace(/\//g, '\\/')), {
        timeout: 15000,
      });
      await expect(page.locator('body')).toBeVisible();
    }
  });
});

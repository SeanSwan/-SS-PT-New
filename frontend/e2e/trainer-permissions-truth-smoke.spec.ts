import { expect, test, type Page, type Route } from '@playwright/test';
import { isSuppressedProductNoise } from './mission/productNoise';

const adminUser = {
  id: 1,
  email: 'qa.admin@swanstudios.local',
  username: 'qa_admin',
  firstName: 'QA',
  lastName: 'Admin',
  role: 'admin',
  isActive: true,
};

const trainers = [
  {
    id: 901,
    firstName: 'Asha',
    lastName: 'Reed',
    email: 'asha.reed@swanstudios.local',
    role: 'trainer',
    isActive: true,
  },
  {
    id: 902,
    firstName: 'Byron',
    lastName: 'Mills',
    email: 'byron.mills@swanstudios.local',
    role: 'trainer',
    isActive: true,
  },
];

interface PermissionRecord {
  id: number;
  trainerId: number;
  permissionType: string;
  grantedBy: number;
  isActive: boolean;
  grantedAt: string;
  createdAt: string;
  updatedAt: string;
}

interface PermissionApiState {
  nextPermissionId: number;
  permissionsByTrainer: Record<string, PermissionRecord[]>;
  grantHits: number;
  revokeHits: number;
}

const permissionTypes = [
  'edit_workouts',
  'view_progress',
  'manage_clients',
  'access_nutrition',
  'modify_schedules',
  'view_analytics',
];

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

function activePermission(trainerId: number, permissionType: string, id: number): PermissionRecord {
  return {
    id,
    trainerId,
    permissionType,
    grantedBy: adminUser.id,
    isActive: true,
    grantedAt: '2026-05-22T12:00:00.000Z',
    createdAt: '2026-05-22T12:00:00.000Z',
    updatedAt: '2026-05-22T12:00:00.000Z',
  };
}

function permissionPayload(trainerId: string, state: PermissionApiState) {
  const permissions = state.permissionsByTrainer[trainerId] || [];
  const permissionsByType = Object.fromEntries(permissionTypes.map((permissionType) => {
    const permission = permissions.find((item) => item.permissionType === permissionType && item.isActive);
    return [permissionType, {
      hasPermission: Boolean(permission),
      permission: permission || null,
      isExpiringSoon: false,
      daysUntilExpiration: null,
    }];
  }));

  return {
    success: true,
    permissions,
    permissionsByType,
    totalActivePermissions: permissions.filter((item) => item.isActive).length,
    availablePermissionTypes: permissionTypes,
  };
}

async function mockPermissionApi(page: Page, state: PermissionApiState) {
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const endpoint = new URL(request.url()).pathname;

    if (endpoint === '/api/cart') return fulfillJson(route, { id: 1, status: 'active', items: [], total: 0, totalSessions: 0 });

    if (endpoint === '/api/auth/me') return fulfillJson(route, { success: true, user: adminUser });
    if (endpoint === '/api/profile') return fulfillJson(route, { success: true, user: adminUser });
    if (endpoint === '/api/auth/users/trainers') {
      return fulfillJson(route, {
        success: true,
        trainers,
        pagination: { total: trainers.length, pages: 1, page: 1, limit: 100 },
      });
    }
    if (endpoint.startsWith('/api/trainer-permissions/trainer/')) {
      const trainerId = endpoint.split('/').pop() || '901';
      return fulfillJson(route, permissionPayload(trainerId, state));
    }
    if (endpoint === '/api/trainer-permissions/stats') {
      const activePermissions = Object.values(state.permissionsByTrainer).flat().filter((item) => item.isActive).length;
      return fulfillJson(route, {
        success: true,
        stats: {
          totalPermissions: activePermissions,
          activePermissions,
          revokedPermissions: 0,
          expiredPermissions: 0,
          expiringPermissions: 0,
          totalTrainers: trainers.length,
          averagePermissionsPerTrainer: (activePermissions / trainers.length).toFixed(1),
          permissionTypeDistribution: {},
        },
      });
    }
    if (endpoint === '/api/trainer-permissions/grant' && request.method() === 'POST') {
      const body = request.postDataJSON() as { trainerId: number; permissionType: string };
      const trainerKey = String(body.trainerId);
      state.grantHits += 1;
      const existing = state.permissionsByTrainer[trainerKey]?.find(
        (item) => item.permissionType === body.permissionType && item.isActive,
      );
      const permission = existing || activePermission(body.trainerId, body.permissionType, state.nextPermissionId++);
      state.permissionsByTrainer[trainerKey] = [
        ...(state.permissionsByTrainer[trainerKey] || []).filter((item) => item.permissionType !== body.permissionType),
        permission,
      ];
      return fulfillJson(route, { success: true, permission, message: 'Permission granted' });
    }
    if (/^\/api\/trainer-permissions\/\d+\/revoke$/.test(endpoint) && request.method() === 'PUT') {
      const permissionId = Number(endpoint.split('/')[3]);
      state.revokeHits += 1;
      for (const key of Object.keys(state.permissionsByTrainer)) {
        state.permissionsByTrainer[key] = state.permissionsByTrainer[key].filter((item) => item.id !== permissionId);
      }
      return fulfillJson(route, {
        success: true,
        permission: { id: permissionId, isActive: false },
        message: 'Permission revoked',
      });
    }

    return fulfillJson(route, { success: true, data: [], stats: {}, notifications: [] });
  });
}

async function inspectLayout(page: Page) {
  return page.evaluate(() => ({
    bodyText: document.body.innerText,
    overflowX: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
  }));
}

test('admin trainer permissions uses live trainers and functional controls', async ({ page }, testInfo) => {
  const apiState: PermissionApiState = {
    nextPermissionId: 4000,
    permissionsByTrainer: {
      '901': [activePermission(901, 'view_progress', 3901)],
      '902': [],
    },
    grantHits: 0,
    revokeHits: 0,
  };
  const consoleErrors: string[] = [];

  await mockPermissionApi(page, apiState);
  await page.addInitScript(
    ({ token, user }) => {
      localStorage.setItem('token', token);
      localStorage.setItem('tokenTimestamp', Date.now().toString());
      localStorage.setItem('user', JSON.stringify(user));
    },
    { token: jwt(), user: adminUser },
  );

  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(error.message));

  await page.goto('/dashboard/admin/trainer-permissions', { waitUntil: 'domcontentloaded' });

  await expect(page.getByRole('heading', { name: /trainer permissions manager/i })).toBeVisible();
  await expect(page.getByText(/Asha Reed/i)).toBeVisible();
  await expect(page.getByText(/Byron Mills/i)).toBeVisible();
  await expect(page.getByText(/John Smith|Sarah Johnson|Mike Wilson/i)).toHaveCount(0);
  await expect(page.getByRole('button', { name: /0 pending permission requests/i })).toBeDisabled();

  await page.getByPlaceholder(/search trainers/i).fill('asha');
  await expect(page.getByText(/Byron Mills/i)).toHaveCount(0);
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /export filtered trainer permissions report/i }).click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  let csv = '';
  for await (const chunk of stream!) csv += chunk.toString();
  expect(csv).toContain('Asha Reed');
  expect(csv).not.toContain('Byron Mills');

  await page.getByRole('button', { name: /clear trainer permission filter/i }).click();
  await expect(page.getByText(/Byron Mills/i)).toBeVisible();

  await page.getByRole('button', { name: /grant edit client workouts for Asha Reed/i }).click();
  await expect(page.getByRole('alertdialog', { name: /confirm edit client workouts for Asha Reed/i })).toBeVisible();
  await expect.poll(() => apiState.grantHits).toBe(0);
  await page.getByRole('button', { name: /confirm grant edit client workouts for Asha Reed/i }).click();
  await expect.poll(() => apiState.grantHits).toBe(1);
  await expect(page.getByRole('button', { name: /revoke edit client workouts for Asha Reed/i })).toBeVisible();

  await page.getByRole('button', { name: /revoke edit client workouts for Asha Reed/i }).click();
  await expect.poll(() => apiState.revokeHits).toBe(1);
  await expect(page.getByRole('button', { name: /grant edit client workouts for Asha Reed/i })).toBeVisible();

  const layout = await inspectLayout(page);
  expect(layout.bodyText).not.toMatch(/john\.smith@example\.com|sarah\.johnson@example\.com|mike\.wilson@example\.com/i);
  expect(layout.overflowX).toBeLessThanOrEqual(12);
  expect(consoleErrors.filter((item) => !isSuppressedProductNoise(item))).toEqual([]);

  await page.screenshot({ path: testInfo.outputPath('trainer-permissions-truth-smoke.png'), fullPage: false });
});

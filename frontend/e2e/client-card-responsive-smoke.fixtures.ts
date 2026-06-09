/**
 * Responsive client-card smoke fixtures.
 *
 * Purpose: centralizes local-only QA users, API mocks, and DOM layout probes for
 * the admin/trainer client card mobile matrix.
 * Privacy: all identities use swanstudios.local test data; no production PII.
 * Verification: imported by client-card-responsive-smoke.spec.ts for overlap,
 * touch-target, horizontal-scroll, and mobile fixed-overlay assertions.
 */
import type { Page, Route } from '@playwright/test';

export const adminUser = {
  id: 1,
  email: 'qa.admin@swanstudios.local',
  username: 'qa_admin',
  firstName: 'QA',
  lastName: 'Admin',
  role: 'admin',
  isActive: true,
};

export const trainerUser = {
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

export const responsiveViewports = [
  { name: 'compact-phone', width: 390, height: 844 },
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

export async function seedAuth(page: Page, user: typeof adminUser | typeof trainerUser) {
  await page.addInitScript(
    ({ token, currentUser }) => {
      localStorage.setItem('token', token);
      localStorage.setItem('tokenTimestamp', Date.now().toString());
      localStorage.setItem('user', JSON.stringify(currentUser));
    },
    { token: jwt(), currentUser: user },
  );
}

export async function mockSharedApi(page: Page, user: typeof adminUser | typeof trainerUser) {
  await page.route('**/api/**', async (route) => {
    const endpoint = new URL(route.request().url()).pathname;
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
    if (endpoint === '/api/measurements/user/501/latest') {
      return fulfillJson(route, {
        id: 7001,
        userId: 501,
        measurementDate: '2026-06-01',
        weight: 172,
        bodyFatPercentage: 18,
        muscleMassPercentage: 42,
        weightUnit: 'lbs',
        circumferenceUnit: 'inches',
      });
    }
    if (endpoint === '/api/measurements/user/501/stats') {
      return fulfillJson(route, { success: true, data: { totalMeasurements: 1, latestWeight: 172 } });
    }
    if (endpoint === '/api/measurements/user/501') {
      return fulfillJson(route, { success: true, data: { measurements: [{ id: 7001, measurementDate: '2026-06-01', weight: 172 }] } });
    }
    return fulfillJson(route, { success: true, data: [], clients: [], stats: {}, notifications: [] });
  });
}

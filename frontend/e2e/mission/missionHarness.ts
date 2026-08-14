/**
 * FILE: missionHarness.ts
 * PURPOSE: Shared fixtures and API interceptors for mission-level Playwright
 * tests.
 * OWNER: SwanStudios Mission QA.
 * DATA: Uses synthetic `@swanstudios-qa.local` personas only.
 * SAFETY: Blocks POST/PUT/PATCH/DELETE calls in contract/read-only tests so the
 * same spec shape can run against production bundles without mutating data.
 *
 * These helpers keep opt-in mission specs deterministic while protecting
 * production and local-prod databases from accidental writes.
 */

import type { Page, Route } from '@playwright/test';
import { isSuppressedProductNoise, todayIso } from './productNoise';

/**
 * A user the harness can install into localStorage. The client-only fields are
 * optional because the harness installs trainers and admins too — inferring the
 * parameter type from the client fixture alone made every non-client caller a
 * type error (swan-coach's trainer). Playwright never typechecks specs, so that
 * error sat unseen until the mission dir got a scoped tsconfig.
 */
export interface MissionUser {
  id: number;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  clientSource?: string;
  availableSessions?: number;
}

export const missionClientUser: MissionUser = {
  id: 101,
  email: 'client.proof@swanstudios-qa.local',
  username: 'client_proof',
  firstName: 'Mission',
  lastName: 'Client',
  role: 'client',
  isActive: true,
  clientSource: 'swanstudios',
  availableSessions: 3,
};

export interface MissionApiState {
  blockedWrites: string[];
  currentWorkoutAssignments?: Array<Record<string, unknown>>;
  capturedWorkoutFormSubmissions?: Array<Record<string, unknown>>;
}

export function jwt() {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return [
    encode({ alg: 'none', typ: 'JWT' }),
    encode({ iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 3600 }),
    'mission-qa-signature',
  ].join('.');
}

export async function fulfillJson(route: Route, body: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

export async function installMissionUser(page: Page, user: MissionUser = missionClientUser) {
  await page.addInitScript(
    ({ token, currentUser }) => {
      localStorage.setItem('token', token);
      localStorage.setItem('tokenTimestamp', Date.now().toString());
      localStorage.setItem('user', JSON.stringify(currentUser));
    },
    { token: jwt(), currentUser: user },
  );
}

export function watchConsoleErrors(page: Page) {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() !== 'error') return;

    const locationUrl = message.location().url;
    consoleErrors.push(locationUrl ? `${message.text()} (${locationUrl})` : message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(error.message));
  return consoleErrors;
}

export function isExpectedMissionConsoleNoise(message: string, today: string = todayIso()) {
  // PRODUCT noise routes through the expiring registry (SWA-157). This used to be
  // a permanent hardcoded copy of the same pattern, so the registry entry could
  // expire and fail the crawl while this gate swallowed it forever.
  if (isSuppressedProductNoise(message, today)) return true;

  // Everything below is HARNESS EXHAUST — the rig's own output, state-dependent
  // rather than message-matchable. It must NOT expire; see productNoise.ts.
  if (
    /Failed to load resource: net::ERR_CONNECTION_FAILED/i.test(message)
    && /https:\/\/fonts\.googleapis\.com\/css2\?/i.test(message)
  ) {
    return true;
  }

  if (
    process.env.SWAN_MISSION_QA_MODE === 'contract'
    && /WebSocket connection to 'ws:\/\/(?:localhost|127\.0\.0\.1):10000\/socket\.io\//i.test(message)
  ) {
    return true;
  }

  if (
    process.env.SWAN_MISSION_QA_MODE === 'contract'
    && /http:\/\/(?:localhost|127\.0\.0\.1):10000\/socket\.io\/\?[^)\s'"]*transport=polling/i.test(message)
  ) {
    return true;
  }

  // In production read-only smoke, Chromium reports Socket.IO polling cleanup
  // as a generic resource 400 without the URL in the console message.
  if (
    process.env.SWAN_MISSION_QA_MODE === 'prod-readonly'
    && /^Failed to load resource: the server responded with a status of 400 \(\)$/i.test(message)
  ) {
    return true;
  }

  if (
    process.env.SWAN_MISSION_QA_MODE === 'prod-readonly'
    && /^Failed to load resource: the server responded with a status of 400 \(\)\s+\(https:\/\/ss-pt-new\.onrender\.com\/socket\.io\/\?[^)]*transport=polling/i.test(message)
  ) {
    return true;
  }

  return false;
}

const point = (x: string, y: number) => ({ x, y });

const chartResponses: Record<string, () => unknown> = {
  '/chart-attendance-reliability': () => ({
      success: true,
      data: [point('Mon', 1), point('Wed', 1), point('Fri', 1)],
      reliabilityPercent: 96,
      totals: { completed: 12, skipped: 0, cancelled: 1, resolved: 13 },
  }),
  '/chart-sets-reps-trend': () => (
    { success: true, data: { sets: [point('W1', 12)], reps: [point('W1', 118)] } }
  ),
  '/chart-anchor-lifts': () => ({
      success: true,
      data: { 'Goblet Squat': [{ x: 'W1', y: 55, reps: 10 }] },
      exercises: ['Goblet Squat'],
  }),
  '/chart-weekly-volume': () => ({ success: true, data: [{ x: 'W1', y: 4200, workouts: 3 }] }),
  '/chart-pr-timeline': () => (
    { success: true, data: [{ x: 'W1', y: 55, exercise: 'Goblet Squat', reps: 10 }] }
  ),
  '/chart-intensity-rpe-trend': () => ({ success: true, data: [{ x: 'W1', y: 7, source: 'rpe' }] }),
  '/chart-exercise-frequency': () => ({ success: true, data: [{ x: 'Push-up', y: 8, sets: 8 }] }),
  '/chart-movement-pattern-balance': () => ({ success: true, data: [{ x: 'Squat', y: 9, sets: 9 }] }),
  '/chart-muscle-group-balance': () => ({ success: true, data: [{ x: 'Legs', y: 14, sets: 14 }] }),
  '/chart-recovery-signal': () => (
    { success: true, data: [{ x: 'W1', y: 92, painFlags: 0, highRpeFlags: 1, totalSets: 18 }] }
  ),
};

const staticApiResponses: Record<string, unknown> = {
  '/api/auth/me': { success: true, user: missionClientUser },
  '/api/profile': { success: true, user: missionClientUser },
  '/api/profile/stats': { success: true, stats: { posts: 2, points: 1840, level: 4, streak: 6 } },
  '/api/subscriptions/status': {
    success: true,
    subscription: { tier: 'pro', status: 'active', hasFullAIAccess: true, isInTrial: false },
  },
  '/api/v1/gamification/profile': { profile: { points: 1840, level: 4, tier: 'bronze_forge', streakDays: 6 } },
  '/api/gamification/users/101/weekly-recap': {
    data: { thisWeek: { workouts: 3, surpriseMultipliers: 1, totalXP: 240 }, current: { streak: 6 } },
  },
  '/api/client/analytics/personal-records': {
    success: true,
    data: [{ exerciseName: 'Goblet Squat', weight: 55, reps: 10 }],
  },
};

function chartData(endpoint: string) {
  const chartKey = endpoint.replace('/api/client/analytics', '');
  return chartResponses[chartKey]?.() ?? { success: true, data: [point('W1', 3)] };
}

function currentWorkoutResponse() {
  const todayAssignment = {
    assignmentType: 'homework',
    sessionType: 'solo',
    status: 'ready',
    isLoggable: true,
    isBillable: false,
    shouldDeductSession: false,
    assignmentKey: 'six-month-strength-arc-w2-d3-homework',
    title: 'Lower Body Strength',
    weekNumber: 2,
    dayNumber: 3,
    exerciseCount: 5,
    firstExerciseName: 'Goblet Squat',
    ctaLabel: 'Log Assignment',
  };

  return {
    data: {
      title: 'Six Month Strength Arc',
      currentWeek: 2,
      currentDay: 3,
      currentSession: { dayLabel: 'Lower Body Strength', exercises: [{ name: 'Goblet Squat' }] },
      todayAssignment,
      trainingPlanCatalog: { defaultHorizonKey: 'six_month', filledHorizonKeys: ['six_month'], slots: [] },
    },
  };
}

function readOnlyApiResponse(endpoint: string, state?: MissionApiState) {
  if (staticApiResponses[endpoint]) return staticApiResponses[endpoint];
  if (endpoint.startsWith('/api/client/analytics/chart-')) return chartData(endpoint);
  if (endpoint === '/api/workouts/101/current') {
    const response = currentWorkoutResponse();
    state?.currentWorkoutAssignments?.push(response.data.todayAssignment);
    return response;
  }
  return { success: true, data: [], posts: [], achievements: [], rewards: [], leaderboard: [] };
}

export async function mockClientProgressMissionApi(page: Page, state: MissionApiState) {
  await page.route('**/health', async (route) => fulfillJson(route, { status: 'ok' }));
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const endpoint = new URL(request.url()).pathname;
    const method = request.method();

    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      state.blockedWrites.push(`${method} ${endpoint}`);
      return fulfillJson(route, { success: false, message: 'Mission QA read-only write blocked' }, 405);
    }

    return fulfillJson(route, readOnlyApiResponse(endpoint, state));
  });
}

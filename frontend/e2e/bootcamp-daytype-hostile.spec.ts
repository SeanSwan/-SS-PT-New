/**
 * SWA-105 Phase 2 — day-type hostile spec.
 * Presses the REAL controls (Day Type select, Generate Class button) for all
 * four rotations and asserts the two things the whole program exists for:
 *   1. the board never shows a wrong-day exercise;
 *   2. the safety rail (ExplanationsStrip) is VISIBLE — contract verdict,
 *      small-class collapse, equipment warning, brain provenance — with the
 *      warning rows styled distinctly from info rows.
 *
 * Auth + APIs are route-mocked using the 4k spec's proven catch-all pattern
 * (auth/me + profile + subscriptions must be mocked or the page hangs on its
 * auth bootstrap). NO prod writes: save/log POSTs are refused loudly, so a
 * surprise persist fails the test instead of the DB.
 */
import { expect, test, type Page, type Route } from '@playwright/test';

const adminUser = {
  id: 1, email: 'qa.admin@swanstudios.local', username: 'qa_admin',
  firstName: 'QA', lastName: 'Admin', role: 'admin', isActive: true,
};

function jwt() {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return [
    encode({ alg: 'none', typ: 'JWT' }),
    encode({ iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 3600 }),
    'qa-signature',
  ].join('.');
}

async function fulfillJson(route: Route, body: unknown, status = 200) {
  await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

async function installAdminSession(page: Page) {
  await page.addInitScript(({ token, user }) => {
    localStorage.setItem('token', token);
    localStorage.setItem('tokenTimestamp', Date.now().toString());
    localStorage.setItem('user', JSON.stringify(user));
  }, { token: jwt(), user: adminUser });
}

const ex = (exerciseName: string, stationIndex: number, sortOrder: number) => ({
  exerciseName, stationIndex, sortOrder,
  durationSec: 40, restSec: 15, isCardioFinisher: false,
  muscleTargets: 'mixed', board: 'main',
  easyVariation: null, mediumVariation: null, hardVariation: null,
  kneeMod: null, shoulderMod: null, ankleMod: null,
  wristMod: null, backMod: null, elbowMod: null, footMod: null, hipMod: null,
  description: null, equipmentRequired: 'dumbbell', videoUrl: null,
  previewVideoUrl: null, imageUrl: null, thumbnailUrl: null,
});

/** Per-day boards: right-day names + the wrong-day name that must NEVER appear. */
const DAY_CASES = [
  { day: 'upper_body', names: ['Dumbbell Bench Press', 'Single-Arm Row'], forbidden: 'Goblet Squat' },
  { day: 'lower_body', names: ['Goblet Squat', 'Romanian Deadlift'], forbidden: 'Dumbbell Bench Press' },
  { day: 'cardio', names: ['Fast Feet', 'Mountain Climbers'], forbidden: 'Romanian Deadlift' },
  { day: 'full_body', names: ['Goblet Squat', 'Push-Up'], forbidden: 'Barbell Curl' },
] as const;

function generatedPayload(day: string, names: readonly string[]) {
  // The hook reads data.bootcamp (useBootcampAPI.generateClass); the backend
  // returns { success, bootcamp } (bootcampRoutes.mjs:117). Match it exactly —
  // a wrong key here is the test lying, not the app.
  return {
    success: true,
    bootcamp: {
      name: `QA ${day} class`, classFormat: '4x4_r2', classStyle: 'standard',
      dayType: day, stationCount: 2, exercisesPerStation: 1, rounds: 2,
      exerciseDurationSec: 40, targetDuration: 45, totalWorkoutMin: 30,
      demoDuration: 5, clearDuration: 5, stretchDurationMin: 3, totalClassMin: 43,
      expectedParticipants: 4, includeStretch: true,
      stations: [
        { stationNumber: 1, stationName: 'Station 1', equipmentNeeded: 'Dumbbell', sortOrder: 1, setupTimeSec: 0 },
        { stationNumber: 2, stationName: 'Station 2', equipmentNeeded: 'Dumbbell', sortOrder: 2, setupTimeSec: 0 },
      ],
      exercises: names.map((n, i) => ex(n, i % 2, i + 1)),
      stretches: [], overflowPlan: null, flowData: [],
      explanations: [
        { type: 'day_type_contract', message: `${day} contract: ${names.length} exercises qualify (0 wrong primary region).` },
        { type: 'small_class', message: 'Small class: 4 participants — collapsed to 2 stations so every station keeps a pair.' },
        { type: 'equipment_feasibility', message: 'Equipment may bottleneck: kettlebell x2 for ~2 people.' },
        { type: 'brain_fallback', message: 'Generated with the deterministic engine (coach brain unavailable: no provider).' },
      ],
      relaxationSummary: { relaxedSlots: 0, constraints: [], deepest: 'R0' },
      aiGenerated: false, brainUsed: 'heuristic', brainFallbackReason: 'no_provider',
      declaredAssumptions: [],
    },
  };
}

/**
 * Superset of the 4k spec's catch-all: the page's auth bootstrap requires
 * /api/auth/me + /api/profile, or ConfigPanel never renders. The bootcamp
 * generate override and the write-block sit ON TOP of the catch-all.
 */
async function mockApis(page: Page, day: string, names: readonly string[]) {
  await page.route('**/api/**', async (route) => {
    const endpoint = new URL(route.request().url()).pathname;
    const method = route.request().method();

    if (endpoint === '/api/bootcamp/generate') return fulfillJson(route, generatedPayload(day, names));
    // Writes are refused loudly — this spec must never persist.
    if (method === 'POST' && (endpoint === '/api/bootcamp/save' || endpoint === '/api/bootcamp/log')) {
      return fulfillJson(route, { success: false, message: 'BLOCKED BY SPEC' }, 500);
    }
    if (endpoint === '/api/auth/me') return fulfillJson(route, { success: true, user: adminUser });
    if (endpoint === '/api/profile') return fulfillJson(route, { success: true, user: adminUser });
    if (endpoint === '/api/cart') return fulfillJson(route, { id: 1, status: 'active', items: [], total: 0, totalSessions: 0 });
    if (endpoint === '/api/subscriptions/status') {
      return fulfillJson(route, {
        success: true,
        subscription: { tier: 'pro', tierName: 'Swan Guardian', status: 'active', hasFullAIAccess: true, isInTrial: false },
        usage: {},
      });
    }
    return fulfillJson(route, { success: true, data: [], plans: [], templates: [], history: [], classLogs: [], spaces: [], profiles: [], items: [], exercises: [], stats: {} });
  });
}

for (const { day, names, forbidden } of DAY_CASES) {
  test(`generate ${day}: right exercises on the board, wrong-day absent, safety rail visible`, async ({ page }) => {
    await installAdminSession(page);
    await mockApis(page, day, names);
    await page.goto('/dashboard/admin/bootcamp', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /boot camp class builder/i })).toBeVisible();

    // The REAL day-type control (buildMode defaults to 'ai', so ConfigPanel shows).
    await page.getByLabel('Day Type').selectOption(day);
    await page.getByRole('button', { name: /generate class/i }).click();

    // The board shows the day's exercises (rendered as "N. Name")...
    for (const name of names) {
      await expect(page.getByText(name).first()).toBeVisible();
    }
    // ...and never a wrong-day one.
    await expect(page.getByText(forbidden)).toHaveCount(0);

    // The safety rail is VISIBLE (F1), all four rows.
    for (const kind of ['day_type_contract', 'small_class', 'equipment_feasibility', 'brain_fallback']) {
      await expect(page.getByTestId(`explanation-${kind}`)).toBeVisible();
    }

    // Warning rows read GOLD; info reads cyan-side — the two tones must differ.
    const warnColor = await page.getByTestId('explanation-equipment_feasibility')
      .evaluate((el) => getComputedStyle(el).color);
    const infoColor = await page.getByTestId('explanation-day_type_contract')
      .evaluate((el) => getComputedStyle(el).color);
    expect(warnColor).not.toBe(infoColor);
  });
}

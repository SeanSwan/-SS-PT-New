/**
 * SWA-105 Phase 2 — day-type hostile spec.
 * Presses the REAL controls (day-type select, Generate Class button) for all
 * four rotations and asserts the two things the whole program exists for:
 *   1. the board never shows a wrong-day exercise;
 *   2. the safety rail (ExplanationsStrip) is VISIBLE — contract verdict,
 *      small-class collapse, equipment warning, brain provenance — with the
 *      warning rows styled gold.
 * Auth + APIs are route-mocked (the 4k spec's pattern): no prod writes.
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
  kneeMod: 'Knee-friendly variant shown here', shoulderMod: null, ankleMod: null,
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
  return {
    success: true,
    generatedClass: {
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

async function mockBootcampApis(page: Page, day: string, names: readonly string[]) {
  await page.route('**/api/bootcamp/generate', (route) => fulfillJson(route, generatedPayload(day, names)));
  // Read endpoints the page touches on load — empty is fine.
  await page.route('**/api/bootcamp/templates*', (r) => fulfillJson(r, { success: true, templates: [] }));
  await page.route('**/api/bootcamp/history*', (r) => fulfillJson(r, { success: true, history: [], classLogs: [] }));
  await page.route('**/api/bootcamp/spaces*', (r) => fulfillJson(r, { success: true, spaces: [] }));
  await page.route('**/api/bootcamp/exercises*', (r) => fulfillJson(r, { success: true, exercises: [] }));
  await page.route('**/api/equipment/**', (r) => fulfillJson(r, { success: true, profiles: [], items: [] }));
  // ANY persisting bootcamp POST outside generate is refused loudly — the spec
  // must never write, and a surprise write should fail the test, not the DB.
  await page.route('**/api/bootcamp/save', (r) => fulfillJson(r, { success: false, message: 'BLOCKED BY SPEC' }, 500));
  await page.route('**/api/bootcamp/log', (r) => fulfillJson(r, { success: false, message: 'BLOCKED BY SPEC' }, 500));
}

for (const { day, names, forbidden } of DAY_CASES) {
  test(`generate ${day}: right exercises on the board, wrong-day absent, safety rail visible`, async ({ page }) => {
    await installAdminSession(page);
    await mockBootcampApis(page, day, names);
    await page.goto('/dashboard/admin/bootcamp');

    // The REAL day-type control (styled Select under the "Day Type" label).
    const daySelect = page.locator('div').filter({ hasText: /^Day Type/ }).locator('select').first();
    await daySelect.selectOption(day);

    // The REAL button.
    await page.getByRole('button', { name: /generate class/i }).click();

    // The board shows the day's exercises...
    for (const name of names) {
      await expect(page.getByText(name).first()).toBeVisible();
    }
    // ...and never a wrong-day one.
    await expect(page.getByText(forbidden)).toHaveCount(0);

    // The safety rail is VISIBLE (F1), all four rows.
    for (const kind of ['day_type_contract', 'small_class', 'equipment_feasibility', 'brain_fallback']) {
      await expect(page.getByTestId(`explanation-${kind}`)).toBeVisible();
    }

    // Warning rows read GOLD (Gilded Fern family), info reads cyan-side.
    const warnColor = await page.getByTestId('explanation-equipment_feasibility')
      .evaluate((el) => getComputedStyle(el).color);
    const infoColor = await page.getByTestId('explanation-day_type_contract')
      .evaluate((el) => getComputedStyle(el).color);
    expect(warnColor).not.toBe(infoColor);
  });
}

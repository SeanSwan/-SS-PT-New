import { chromium, request as playwrightRequest } from '@playwright/test';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const args = process.argv.slice(2);

const getArg = (name, fallback = null) => {
  const idx = args.indexOf(name);
  if (idx === -1) return fallback;
  return args[idx + 1] ?? fallback;
};

const hasFlag = (name) => args.includes(name);

const baseUrl = (getArg('--base-url', process.env.BASE_URL || 'https://sswanstudios.com') || '').replace(/\/+$/, '');
const clientId = getArg('--client-id', process.env.CLIENT_ID || null);
const loginPath = getArg('--login-path', '/login');
const headed = !hasFlag('--headless');
const runReset = hasFlag('--run-reset-onboarding');

if (!clientId) {
  console.error('Missing client id. Use --client-id <id> or set CLIENT_ID.');
  process.exit(1);
}

const todayIso = new Date().toISOString().slice(0, 10);

const futureIso = (() => {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
})();

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const promptEnter = async (question) => {
  const rl = readline.createInterface({ input, output });
  try {
    await rl.question(question);
  } finally {
    rl.close();
  }
};

const pickTokenFromStorage = (snapshot) => {
  const candidates = [
    'token',
    'swanstudios_token',
    'auth_token',
  ];
  for (const key of candidates) {
    if (typeof snapshot[key] === 'string' && snapshot[key].length > 20) {
      return { key, token: snapshot[key] };
    }
  }
  return null;
};

const maskToken = (token) =>
  !token || token.length < 12 ? '[missing]' : `${token.slice(0, 8)}...${token.slice(-6)}`;

const extractStorageSnapshot = async (page) =>
  page.evaluate(() => {
    const out = {};
    for (const key of Object.keys(localStorage)) {
      out[key] = localStorage.getItem(key);
    }
    return out;
  });

const parseJsonSafe = async (resp) => {
  const text = await resp.text();
  try {
    return { json: JSON.parse(text), text };
  } catch {
    return { json: null, text };
  }
};

const ensureStatus = (name, status, allowed) => {
  if (!allowed.includes(status)) {
    throw new Error(`${name}: expected status ${allowed.join('/')} but got ${status}`);
  }
};

const main = async () => {
  const browser = await chromium.launch({ headless: !headed });
  const context = await browser.newContext();
  const page = await context.newPage();

  const results = [];
  try {

  console.log(`Opening login page: ${baseUrl}${loginPath}`);
  await page.goto(`${baseUrl}${loginPath}`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});

  console.log('\nManual step required:');
  console.log('1) Log in as admin in the opened browser window');
  console.log('2) Wait until you are fully logged in (dashboard/home loaded)');
  await promptEnter('3) Press Enter here to continue smoke tests...');

  // Give SPA a moment to write auth state.
  await delay(1000);

  const storage = await extractStorageSnapshot(page);
  const tokenInfo = pickTokenFromStorage(storage);
  if (!tokenInfo) {
    console.error('No auth token found in localStorage. Available keys:', Object.keys(storage));
    throw new Error('Could not detect auth token after manual login');
  }

  console.log(`Using auth token from localStorage key "${tokenInfo.key}": ${maskToken(tokenInfo.token)}`);

  const api = await playwrightRequest.newContext({
    baseURL: baseUrl,
    extraHTTPHeaders: {
      Authorization: `Bearer ${tokenInfo.token}`,
      'Content-Type': 'application/json',
    },
  });

  const call = async ({ name, method, path, expected, body }) => {
    const resp = await api.fetch(path, {
      method,
      data: body,
      failOnStatusCode: false,
    });
    const status = resp.status();
    const { json, text } = await parseJsonSafe(resp);
    ensureStatus(name, status, expected);
    results.push({ name, status, ok: true });
    console.log(`PASS ${name} -> ${status}`);
    return { status, json, text };
  };

  // 1) Baseline onboarding status (200 or 404 acceptable)
  await call({
    name: 'GET onboarding status (baseline)',
    method: 'GET',
    path: `/api/admin/clients/${clientId}/onboarding`,
    expected: [200, 404],
  });

  // 2) Save onboarding draft
  const draftPayload = {
    mode: 'draft',
    responsesJson: {
      fullName: 'Smoke Test Client',
      email: 'smoke@example.com',
      primaryGoal: 'strength',
      heightFeet: '5',
      heightInches: '10',
      currentWeight: '180',
      dietaryPreferences: ['high-protein'],
      foodAllergies: ['peanuts'],
      mealFrequency: 4,
      medicalConditions: [],
      pastInjuries: [],
      currentPainLevel: 1,
    },
  };

  const draftResp = await call({
    name: 'POST onboarding draft',
    method: 'POST',
    path: `/api/admin/clients/${clientId}/onboarding`,
    expected: [200],
    body: draftPayload,
  });

  if (!draftResp.json?.success) {
    throw new Error('POST onboarding draft returned success=false');
  }

  // 3) Get onboarding status (after draft)
  await call({
    name: 'GET onboarding status (after draft)',
    method: 'GET',
    path: `/api/admin/clients/${clientId}/onboarding`,
    expected: [200],
  });

  // 4) Optional reset to avoid leaving a draft behind
  if (runReset) {
    await call({
      name: 'DELETE onboarding reset',
      method: 'DELETE',
      path: `/api/admin/clients/${clientId}/onboarding`,
      expected: [200],
    });
  }

  // 5) Log workout (happy path)
  const workoutPayload = {
    date: todayIso,
    title: 'Smoke Test Workout',
    duration: 45,
    intensity: 7,
    notes: 'Phase 1B production smoke test',
    exercises: [
      {
        exerciseName: 'Barbell Squat',
        sets: [
          { setNumber: 1, reps: 10, weight: 135, tempo: '3-1-2', rest: 90, rpe: 7 },
        ],
      },
    ],
  };

  const workoutResp = await call({
    name: 'POST workout log (happy path)',
    method: 'POST',
    path: `/api/admin/clients/${clientId}/workouts`,
    expected: [201],
    body: workoutPayload,
  });

  if (!workoutResp.json?.success) {
    throw new Error('POST workout log returned success=false');
  }

  // 6) Get workout history
  await call({
    name: 'GET workout history',
    method: 'GET',
    path: `/api/admin/clients/${clientId}/workouts?limit=5&offset=0`,
    expected: [200],
  });

  // 7) Negative validation: future date
  await call({
    name: 'POST workout log (future date negative)',
    method: 'POST',
    path: `/api/admin/clients/${clientId}/workouts`,
    expected: [400],
    body: {
      ...workoutPayload,
      date: futureIso,
      title: 'Future Date Should Fail',
      exercises: [{ name: 'Pushup', sets: [{ setNumber: 1, reps: 10, weight: 0 }] }],
    },
  });

  console.log('\nSmoke test summary:');
  for (const r of results) {
    console.log(`- ${r.name}: ${r.status}`);
  }
  console.log('\nAll selected Phase 1B smoke checks passed.');

  await api.dispose();
  await browser.close();
  } catch (error) {
  console.error('\nSmoke test failed:', error.message);
  try {
    await page.screenshot({ path: 'phase1b-prod-smoke-failure.png', fullPage: true });
    console.error('Saved screenshot: phase1b-prod-smoke-failure.png');
  } catch {}
  await browser.close();
  process.exit(1);
  }
};

await main();

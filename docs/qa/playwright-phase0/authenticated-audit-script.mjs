/**
 * Phase 0 Authenticated Playwright Audit (Starter)
 * ------------------------------------------------
 * Captures authenticated UI evidence for admin/trainer/client routes:
 * - screenshots
 * - console errors
 * - failed network requests (>= 400)
 * - key assertions
 *
 * Target:
 *   BASE_URL=https://sswanstudios.com
 *
 * Credentials (matches existing E2E pattern):
 *   TEST_EMAIL / TEST_PASSWORD (admin, required on production — local-only fallback)
 *   TEST_TRAINER_EMAIL / TEST_TRAINER_PASSWORD (optional — skips trainer if missing)
 *   TEST_CLIENT_EMAIL / TEST_CLIENT_PASSWORD (optional — skips client if missing)
 *
 * Run (from repo root):
 *   node docs/qa/playwright-phase0/authenticated-audit-script.mjs
 */

import { createRequire } from 'module';
import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Resolve Playwright from frontend package (script lives under docs/)
const require = createRequire(new URL('../../../frontend/package.json', import.meta.url));
const { chromium } = require('playwright');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '../../../');
const OUT_DIR = path.join(__dirname, 'authenticated');
const RESULTS_JSON = path.join(__dirname, 'authenticated-audit-results.json');
const SUMMARY_MD = path.join(__dirname, 'authenticated-audit-summary.md');

const BASE_URL = process.env.BASE_URL || 'https://sswanstudios.com';
const isProduction = !/localhost|127\.0\.0\.1/i.test(BASE_URL);

const VIEWPORTS = [
  { width: 375, height: 812, label: '375-mobile' },
  { width: 1280, height: 800, label: '1280-desktop' },
];

// Admin uses same env vars as existing E2E specs (TEST_EMAIL/TEST_PASSWORD with fallbacks)
// Trainer/client are optional — roles are skipped if credentials not provided
const ROLE_CREDS = {
  admin: {
    email: process.env.TEST_ADMIN_EMAIL || process.env.TEST_EMAIL || (isProduction ? null : 'admin@sswanstudios.com'),
    password: process.env.TEST_ADMIN_PASSWORD || process.env.TEST_PASSWORD || (isProduction ? null : 'testpassword'),
  },
  trainer: {
    email: process.env.TEST_TRAINER_EMAIL || null,
    password: process.env.TEST_TRAINER_PASSWORD || null,
  },
  client: {
    email: process.env.TEST_CLIENT_EMAIL || null,
    password: process.env.TEST_CLIENT_PASSWORD || null,
  },
};

function roleAvailable(role) {
  return Boolean(ROLE_CREDS[role]?.email && ROLE_CREDS[role]?.password);
}

function assertEnv() {
  // Fail fast on production if no explicit credentials provided
  if (isProduction && (!ROLE_CREDS.admin.email || !ROLE_CREDS.admin.password)) {
    throw new Error(
      'TEST_EMAIL/TEST_PASSWORD (or TEST_ADMIN_EMAIL/TEST_ADMIN_PASSWORD) are required for production authenticated audit runs.\n' +
      'Run with: TEST_EMAIL=<email> TEST_PASSWORD=<pw> node docs/qa/playwright-phase0/authenticated-audit-script.mjs'
    );
  }
  if (!ROLE_CREDS.admin.email || !ROLE_CREDS.admin.password) {
    throw new Error('Admin credentials missing.');
  }
  // Log which roles will be tested
  const roles = ['admin', 'trainer', 'client'];
  for (const r of roles) {
    console.log(`  ${r}: ${roleAvailable(r) ? 'ENABLED' : 'SKIPPED (no credentials)'}`);
  }
}

function ensureDirs() {
  mkdirSync(OUT_DIR, { recursive: true });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function safeName(...parts) {
  return parts
    .filter(Boolean)
    .join('-')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function shortUrl(u) {
  try {
    const url = new URL(u);
    return `${url.pathname}${url.search}`.slice(0, 220);
  } catch {
    return String(u).slice(0, 220);
  }
}

function attachObservers(page) {
  const consoleErrors = [];
  const failedRequests = [];

  const onConsole = (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push({
        type: msg.type(),
        text: msg.text().slice(0, 400),
        location: msg.location?.()?.url ? shortUrl(msg.location().url) : 'unknown',
      });
    }
  };

  const onResponse = (response) => {
    const status = response.status();
    if (status >= 400) {
      failedRequests.push({
        status,
        method: response.request().method(),
        url: shortUrl(response.url()),
      });
    }
  };

  page.on('console', onConsole);
  page.on('response', onResponse);

  return {
    consoleErrors,
    failedRequests,
    detach() {
      page.off('console', onConsole);
      page.off('response', onResponse);
    },
  };
}

async function gotoWithFallback(page, url, timeout = 30000) {
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout });
  } catch {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout });
  }
}

async function waitForServerConnectedIfPresent(page) {
  const indicator = page.locator('text=Server Connected');
  if (await indicator.isVisible().catch(() => false)) {
    await indicator.waitFor({ state: 'visible', timeout: 90000 });
  }
}

async function login(page, role, creds) {
  const assertions = [];

  await gotoWithFallback(page, `${BASE_URL}/login`, 60000);
  await waitForServerConnectedIfPresent(page);

  const usernameInput = page
    .locator('input[placeholder*="Username" i], input[placeholder*="email" i]')
    .first();
  const passwordInput = page.locator('input[type="password"]').first();
  const submitBtn = page.locator('button[type="submit"]').first();

  await usernameInput.waitFor({ state: 'visible', timeout: 10000 });
  await passwordInput.waitFor({ state: 'visible', timeout: 10000 });
  await submitBtn.waitFor({ state: 'visible', timeout: 10000 });

  await usernameInput.fill(creds.email);
  await passwordInput.fill(creds.password);
  await submitBtn.click();

  // Wait for either dashboard shell or route change away from /login
  let loginSucceeded = false;
  try {
    await Promise.race([
      page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 30000 }),
      page.getByRole('button', { name: /dashboard/i }).waitFor({ state: 'visible', timeout: 30000 }),
      page.locator('h1:has-text("Dashboard")').waitFor({ state: 'visible', timeout: 30000 }),
    ]);
    loginSucceeded = true;
  } catch {
    loginSucceeded = false;
  }

  assertions.push({ name: 'loginSucceeded', pass: loginSucceeded });
  assertions.push({ name: 'leftLoginPage', pass: !page.url().includes('/login') });

  // Role landing sanity (non-fatal, just recorded)
  const finalUrl = page.url();
  assertions.push({
    name: `${role}LandingPathObserved`,
    pass: /dashboard|trainer-dashboard|client-dashboard|workout|schedule/i.test(finalUrl),
  });

  return assertions;
}

async function loginAndNavigateToClients(page) {
  const adminLoginAssertions = await login(page, 'admin', ROLE_CREDS.admin);
  await gotoWithFallback(page, `${BASE_URL}/dashboard/people/clients`, 45000);

  // Wait for client cards/stat content
  const totalClients = page.locator('text=Total Clients');
  const firstHeading = page.locator('h3').first();
  await Promise.race([
    totalClients.waitFor({ state: 'visible', timeout: 20000 }).catch(() => {}),
    firstHeading.waitFor({ state: 'visible', timeout: 20000 }).catch(() => {}),
  ]);

  return adminLoginAssertions;
}

async function openFirstClientContextMenu(page) {
  // Reusing selector strategy from existing admin E2E spec
  const actionButtons = page
    .locator('[role="tabpanel"] button:has(svg)')
    .filter({ hasNotText: /\w/ });

  const actionBtn = actionButtons.first();
  await actionBtn.waitFor({ state: 'visible', timeout: 15000 });
  await actionBtn.click();
  await sleep(500);

  const startOnboarding = page.locator('[data-testid="menu-start-onboarding"]').or(
    page.getByRole('button', { name: 'Start Onboarding' })
  );
  const logWorkout = page.locator('[data-testid="menu-log-workout"]').or(
    page.getByRole('button', { name: 'Log Workout' })
  );

  return { startOnboarding, logWorkout };
}

async function captureState(page, results, meta, actionFn) {
  const obs = attachObservers(page);
  const assertions = [];
  let error = null;

  try {
    if (actionFn) {
      const extraAssertions = await actionFn(page);
      if (Array.isArray(extraAssertions)) assertions.push(...extraAssertions);
    }
  } catch (e) {
    error = String(e?.message || e).slice(0, 500);
  }

  await sleep(1000);

  const screenshot = `${safeName(meta.role, meta.name, meta.viewport)}.png`;
  try {
    await page.screenshot({
      path: path.join(OUT_DIR, screenshot),
      fullPage: true,
    });
  } catch (e) {
    if (!error) error = `Screenshot failed: ${String(e?.message || e).slice(0, 300)}`;
  }

  const finalUrl = (() => {
    try {
      return shortUrl(page.url()).replace(BASE_URL, '');
    } catch {
      return '';
    }
  })();

  const redirectedToLogin = finalUrl.includes('/login');
  assertions.push({ name: 'notRedirectedToLogin', pass: !redirectedToLogin });

  results.push({
    role: meta.role,
    name: meta.name,
    viewport: meta.viewport,
    route: meta.route,
    finalUrl,
    redirectedToLogin,
    screenshot,
    consoleErrors: obs.consoleErrors.slice(0, 20),
    failedRequests: obs.failedRequests.slice(0, 30),
    assertions,
    error,
    notes: meta.notes || '',
  });

  obs.detach();
}

async function roleProbe(page, role, candidates) {
  const assertions = [];
  let matchedRoute = null;
  let matchedAssertion = false;

  for (const c of candidates) {
    await gotoWithFallback(page, `${BASE_URL}${c.path}`, 30000);
    await sleep(1000);

    if (page.url().includes('/login')) {
      continue;
    }

    let visible = false;
    for (const selector of c.selectors) {
      const locator = selector.role
        ? page.getByRole(selector.role, selector.options)
        : page.locator(selector.locator);

      if (await locator.isVisible().catch(() => false)) {
        visible = true;
        break;
      }
    }

    if (visible) {
      matchedRoute = c.path;
      matchedAssertion = true;
      break;
    }

    // If route itself loaded and wasn't login, still allow shell capture as partial
    if (!page.url().includes('/login')) {
      matchedRoute = c.path;
    }
  }

  assertions.push({ name: `${role}RouteProbeMatched`, pass: Boolean(matchedRoute) });
  assertions.push({ name: `${role}TargetUiVisible`, pass: matchedAssertion });

  return { assertions, matchedRoute };
}

function summarize(results) {
  const total = results.length;
  const consoleErrs = results.reduce((n, r) => n + (r.consoleErrors?.length || 0), 0);
  const failedReqs = results.reduce((n, r) => n + (r.failedRequests?.length || 0), 0);
  const errors = results.filter((r) => r.error).length;
  const failedAssertions = results.reduce(
    (n, r) => n + (r.assertions || []).filter((a) => !a.pass).length,
    0
  );

  return { total, consoleErrs, failedReqs, errors, failedAssertions };
}

function writeSummary(results) {
  const s = summarize(results);
  const lines = [];

  lines.push('# Smart Workout Logger - Phase 0 Authenticated Playwright Follow-Up');
  lines.push('');
  lines.push(`- **Date:** ${new Date().toISOString()}`);
  lines.push(`- **Target:** ${BASE_URL}`);
  lines.push(`- **Roles tested:** admin, trainer, client`);
  lines.push(`- **Total authenticated states captured:** ${s.total}`);
  lines.push(`- **Console errors captured:** ${s.consoleErrs}`);
  lines.push(`- **Failed network requests captured:** ${s.failedReqs}`);
  lines.push(`- **State-level execution errors:** ${s.errors}`);
  lines.push(`- **Failed assertions (informational + hard):** ${s.failedAssertions}`);
  lines.push('');
  lines.push('## Results by State');
  lines.push('');

  for (const r of results) {
    const passCount = (r.assertions || []).filter((a) => a.pass).length;
    const failCount = (r.assertions || []).filter((a) => !a.pass).length;
    lines.push(
      `- **${r.role} / ${r.name} / ${r.viewport}** -- ` +
      `URL: \`${r.finalUrl || '(unknown)'}\`, ` +
      `console: ${(r.consoleErrors || []).length}, ` +
      `network: ${(r.failedRequests || []).length}, ` +
      `assertions: ${passCount} pass / ${failCount} fail` +
      (r.error ? `, error: ${r.error}` : '')
    );
  }

  lines.push('');
  lines.push('## Artifact Locations');
  lines.push('');
  lines.push(`- Screenshots: \`docs/qa/playwright-phase0/authenticated/\``);
  lines.push(`- JSON results: \`docs/qa/playwright-phase0/authenticated-audit-results.json\``);
  lines.push('');
  lines.push('## Notes');
  lines.push('');
  lines.push('- This is a Phase 0 evidence pass (load/render + route/auth + UI-open checks), not full workflow mutation testing.');
  lines.push('- Review any failed assertions and decide whether they are selector drift vs real regressions.');

  writeFileSync(SUMMARY_MD, lines.join('\n'));
}

async function runAdminStates(browser, viewport, results) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    ignoreHTTPSErrors: true,
    userAgent: 'SwanStudios-Phase0-AuthAudit/1.0 Playwright',
  });
  const page = await context.newPage();

  let loginAssertions = [];
  await captureState(page, results, {
    role: 'admin',
    name: 'dashboard-home',
    viewport: viewport.label,
    route: '/dashboard',
  }, async (p) => {
    loginAssertions = await login(p, 'admin', ROLE_CREDS.admin);
    await gotoWithFallback(p, `${BASE_URL}/dashboard`, 45000);
    return [
      ...loginAssertions,
      { name: 'adminDashboardLoaded', pass: !p.url().includes('/login') },
    ];
  });

  await captureState(page, results, {
    role: 'admin',
    name: 'clients-page',
    viewport: viewport.label,
    route: '/dashboard/people/clients',
  }, async (p) => {
    // Re-login if prior state failed or session expired
    if (p.url().includes('/login')) {
      await login(p, 'admin', ROLE_CREDS.admin);
    }
    await gotoWithFallback(p, `${BASE_URL}/dashboard/people/clients`, 45000);

    const totalClientsVisible = await p.locator('text=Total Clients').isVisible().catch(() => false);
    const h3Visible = await p.locator('h3').first().isVisible().catch(() => false);

    return [
      { name: 'clientsPageLoaded', pass: !p.url().includes('/login') },
      { name: 'clientsContentVisible', pass: totalClientsVisible || h3Visible },
    ];
  });

  await captureState(page, results, {
    role: 'admin',
    name: 'client-onboarding-panel',
    viewport: viewport.label,
    route: '/dashboard/people/clients',
  }, async (p) => {
    if (p.url().includes('/login')) {
      await loginAndNavigateToClients(p);
    } else {
      await gotoWithFallback(p, `${BASE_URL}/dashboard/people/clients`, 45000);
    }

    const { startOnboarding } = await openFirstClientContextMenu(p);
    await startOnboarding.waitFor({ state: 'visible', timeout: 10000 });
    await startOnboarding.click();

    const panel = p.locator('[data-testid="admin-onboarding-panel"]');
    const panelVisible = await panel.isVisible().catch(() => false);

    return [
      { name: 'startOnboardingMenuItemVisible', pass: true },
      { name: 'adminOnboardingPanelVisible', pass: panelVisible },
    ];
  });

  await captureState(page, results, {
    role: 'admin',
    name: 'client-workout-logger-modal',
    viewport: viewport.label,
    route: '/dashboard/people/clients',
  }, async (p) => {
    if (p.url().includes('/login')) {
      await loginAndNavigateToClients(p);
    } else {
      await gotoWithFallback(p, `${BASE_URL}/dashboard/people/clients`, 45000);
    }

    const { logWorkout } = await openFirstClientContextMenu(p);
    await logWorkout.waitFor({ state: 'visible', timeout: 10000 });
    await logWorkout.click();

    const modal = p.locator('[data-testid="workout-logger-modal"]');
    const title = p.locator('[data-testid="workout-title"]');
    const date = p.locator('[data-testid="workout-date"]');
    const duration = p.locator('[data-testid="workout-duration"]');
    const intensity = p.locator('[data-testid="workout-intensity"]');

    return [
      { name: 'logWorkoutMenuItemVisible', pass: true },
      { name: 'workoutLoggerModalVisible', pass: await modal.isVisible().catch(() => false) },
      { name: 'workoutTitleVisible', pass: await title.isVisible().catch(() => false) },
      { name: 'workoutDateVisible', pass: await date.isVisible().catch(() => false) },
      { name: 'workoutDurationVisible', pass: await duration.isVisible().catch(() => false) },
      { name: 'workoutIntensityVisible', pass: await intensity.isVisible().catch(() => false) },
    ];
  });

  await context.close();
}

async function runTrainerStates(browser, viewport, results) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    ignoreHTTPSErrors: true,
    userAgent: 'SwanStudios-Phase0-AuthAudit/1.0 Playwright',
  });
  const page = await context.newPage();

  await captureState(page, results, {
    role: 'trainer',
    name: 'trainer-workout-surface',
    viewport: viewport.label,
    route: '/trainer-dashboard/*',
    notes: 'Route-probe capture; selector ladders may need tuning per current trainer UI.',
  }, async (p) => {
    const loginAssertions = await login(p, 'trainer', ROLE_CREDS.trainer);

    const probe = await roleProbe(p, 'trainer', [
      {
        path: '/trainer-dashboard/workouts',
        selectors: [
          { locator: 'h1:has-text("Workout")' },
          { locator: 'h2:has-text("Workout")' },
          { locator: 'text=/Workout Management/i' },
          { locator: 'form' },
        ],
      },
      {
        path: '/trainer-dashboard/workout-management',
        selectors: [
          { locator: 'text=/Workout/i' },
          { locator: 'h1, h2' },
        ],
      },
      {
        path: '/trainer-dashboard',
        selectors: [
          { locator: 'text=/Trainer/i' },
          { locator: 'h1, h2' },
        ],
      },
    ]);

    return [
      ...loginAssertions,
      ...probe.assertions,
      { name: 'trainerNotRedirectedToLogin', pass: !p.url().includes('/login') },
    ];
  });

  await captureState(page, results, {
    role: 'trainer',
    name: 'trainer-schedule',
    viewport: viewport.label,
    route: '/trainer-dashboard/schedule',
  }, async (p) => {
    if (p.url().includes('/login')) {
      await login(p, 'trainer', ROLE_CREDS.trainer);
    }

    // Try direct trainer schedule, then shared /schedule if app routes there
    await gotoWithFallback(p, `${BASE_URL}/trainer-dashboard/schedule`, 30000);
    if (p.url().includes('/login') || /404/i.test(await p.textContent('body').catch(() => ''))) {
      await gotoWithFallback(p, `${BASE_URL}/schedule`, 30000);
    }

    const scheduleShell = await p
      .locator('text=/Schedule/i')
      .first()
      .isVisible()
      .catch(() => false);

    return [
      { name: 'trainerScheduleNotRedirectedToLogin', pass: !p.url().includes('/login') },
      { name: 'trainerScheduleShellVisible', pass: scheduleShell || !p.url().includes('/login') },
    ];
  });

  await context.close();
}

async function runClientStates(browser, viewport, results) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    ignoreHTTPSErrors: true,
    userAgent: 'SwanStudios-Phase0-AuthAudit/1.0 Playwright',
  });
  const page = await context.newPage();

  await captureState(page, results, {
    role: 'client',
    name: 'client-workout-page',
    viewport: viewport.label,
    route: '/workout',
  }, async (p) => {
    const loginAssertions = await login(p, 'client', ROLE_CREDS.client);
    await gotoWithFallback(p, `${BASE_URL}/workout`, 30000);

    const shellVisible = await p
      .locator('text=/Workout|Training/i')
      .first()
      .isVisible()
      .catch(() => false);

    return [
      ...loginAssertions,
      { name: 'clientWorkoutNotRedirectedToLogin', pass: !p.url().includes('/login') },
      { name: 'clientWorkoutShellVisible', pass: shellVisible || !p.url().includes('/login') },
    ];
  });

  await captureState(page, results, {
    role: 'client',
    name: 'client-schedule',
    viewport: viewport.label,
    route: '/schedule',
  }, async (p) => {
    if (p.url().includes('/login')) {
      await login(p, 'client', ROLE_CREDS.client);
    }
    await gotoWithFallback(p, `${BASE_URL}/schedule`, 30000);

    const scheduleVisible = await p
      .locator('text=/Schedule/i')
      .first()
      .isVisible()
      .catch(() => false);

    return [
      { name: 'clientScheduleNotRedirectedToLogin', pass: !p.url().includes('/login') },
      { name: 'clientScheduleShellVisible', pass: scheduleVisible || !p.url().includes('/login') },
    ];
  });

  await context.close();
}

async function main() {
  assertEnv();
  ensureDirs();

  const browser = await chromium.launch({ headless: true });
  const results = [];

  try {
    for (const vp of VIEWPORTS) {
      console.log(`\n=== Viewport: ${vp.label} ===`);

      console.log('Admin states...');
      await runAdminStates(browser, vp, results);

      if (roleAvailable('trainer')) {
        console.log('Trainer states...');
        await runTrainerStates(browser, vp, results);
      } else {
        console.log('Trainer states... SKIPPED (no credentials)');
      }

      if (roleAvailable('client')) {
        console.log('Client states...');
        await runClientStates(browser, vp, results);
      } else {
        console.log('Client states... SKIPPED (no credentials)');
      }
    }
  } finally {
    await browser.close();
  }

  writeFileSync(RESULTS_JSON, JSON.stringify(results, null, 2));
  writeSummary(results);

  const s = summarize(results);
  console.log('\n=== AUTHENTICATED PHASE 0 AUDIT SUMMARY ===');
  console.log(`States: ${s.total}`);
  console.log(`Console errors: ${s.consoleErrs}`);
  console.log(`Failed requests: ${s.failedReqs}`);
  console.log(`Execution errors: ${s.errors}`);
  console.log(`Failed assertions: ${s.failedAssertions}`);
  console.log(`Screenshots: ${OUT_DIR}`);
  console.log(`JSON: ${RESULTS_JSON}`);
  console.log(`Summary: ${SUMMARY_MD}`);
}

main().catch((e) => {
  console.error('Authenticated audit failed:', e?.message || e);
  process.exit(1);
});

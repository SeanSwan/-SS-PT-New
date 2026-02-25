/**
 * Phase 0 Playwright Audit — Workout/AI/Onboarding Routes
 * Captures: screenshots, console errors, failed network requests
 * Target: sswanstudios.com (production)
 */
import { chromium } from '../../../frontend/node_modules/playwright/index.mjs';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCREENSHOT_DIR = __dirname;
const BASE_URL = 'https://sswanstudios.com';

// Routes to audit (public + auth-gated)
const ROUTES = [
  { path: '/', name: 'homepage', auth: false },
  { path: '/client-onboarding', name: 'client-onboarding', auth: false },
  { path: '/workout', name: 'workout-dashboard', auth: true },
  { path: '/login', name: 'login', auth: false },
  { path: '/schedule', name: 'schedule', auth: true },
  { path: '/dashboard', name: 'admin-dashboard', auth: true },
  { path: '/gamification', name: 'gamification', auth: true },
];

const VIEWPORTS = [
  { width: 375, height: 812, label: '375-mobile' },
  { width: 1280, height: 800, label: '1280-desktop' },
];

async function auditRoute(page, route, viewport, results) {
  const consoleErrors = [];
  const failedRequests = [];

  // Collect console errors
  const consoleHandler = (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push({
        text: msg.text().slice(0, 300),
        location: msg.location()?.url?.slice(0, 100) || 'unknown',
      });
    }
  };
  page.on('console', consoleHandler);

  // Collect failed network requests
  const responseHandler = (response) => {
    const status = response.status();
    if (status >= 400) {
      failedRequests.push({
        url: response.url().slice(0, 150),
        status,
        method: response.request().method(),
      });
    }
  };
  page.on('response', responseHandler);

  await page.setViewportSize({ width: viewport.width, height: viewport.height });

  const url = `${BASE_URL}${route.path}`;
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
  } catch (e) {
    // networkidle timeout is OK — page may have long-polling
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 });
    } catch (e2) {
      results.push({
        route: route.path,
        name: route.name,
        viewport: viewport.label,
        error: `Navigation failed: ${e2.message.slice(0, 200)}`,
        consoleErrors: [],
        failedRequests: [],
      });
      page.off('console', consoleHandler);
      page.off('response', responseHandler);
      return;
    }
  }

  // Wait a bit for lazy content
  await page.waitForTimeout(2000);

  // Screenshot
  const screenshotName = `${route.name}-${viewport.label}.png`;
  await page.screenshot({
    path: join(SCREENSHOT_DIR, screenshotName),
    fullPage: true,
  });

  // Check what page we actually landed on (auth redirects)
  const finalUrl = page.url();
  const wasRedirected = !finalUrl.includes(route.path) && route.path !== '/';

  results.push({
    route: route.path,
    name: route.name,
    viewport: viewport.label,
    screenshot: screenshotName,
    finalUrl: finalUrl.replace(BASE_URL, ''),
    redirected: wasRedirected,
    authGated: route.auth,
    consoleErrors: consoleErrors.slice(0, 10),
    failedRequests: failedRequests.slice(0, 15),
  });

  page.off('console', consoleHandler);
  page.off('response', responseHandler);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    userAgent: 'SwanStudios-Phase0-Audit/1.0 Playwright',
  });
  const page = await context.newPage();
  const results = [];

  for (const route of ROUTES) {
    for (const vp of VIEWPORTS) {
      console.log(`Auditing ${route.path} @ ${vp.label}...`);
      await auditRoute(page, route, vp, results);
    }
  }

  await browser.close();

  // Write results JSON
  writeFileSync(
    join(SCREENSHOT_DIR, 'audit-results.json'),
    JSON.stringify(results, null, 2)
  );

  // Print summary
  console.log('\n=== PHASE 0 PLAYWRIGHT AUDIT SUMMARY ===\n');
  for (const r of results) {
    const errors = r.consoleErrors?.length || 0;
    const failed = r.failedRequests?.length || 0;
    const redirect = r.redirected ? ` → REDIRECTED to ${r.finalUrl}` : '';
    console.log(`${r.name} @ ${r.viewport}: ${errors} console errors, ${failed} failed requests${redirect}`);
    if (r.error) console.log(`  ERROR: ${r.error}`);
    for (const e of (r.consoleErrors || [])) {
      console.log(`  CONSOLE: ${e.text.slice(0, 120)}`);
    }
    for (const f of (r.failedRequests || [])) {
      console.log(`  NETWORK: ${f.method} ${f.url.slice(0, 100)} → ${f.status}`);
    }
  }

  console.log(`\nTotal routes audited: ${results.length}`);
  console.log(`Screenshots saved to: ${SCREENSHOT_DIR}`);
}

main().catch((e) => {
  console.error('Audit failed:', e.message);
  process.exit(1);
});

import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const REPORT_DIR = path.resolve('frontend/e2e/reports/admin-tab-audit');

const clean = (value) => (value == null ? '' : String(value).trim());

const credentialCandidates = [
  {
    username: process.env.E2E_ADMIN_EMAIL,
    password: process.env.E2E_ADMIN_PASSWORD,
    source: 'env:E2E_ADMIN_*',
  },
  {
    username: process.env.E2E_ADMIN_USERNAME,
    password: process.env.E2E_ADMIN_PASSWORD,
    source: 'env:E2E_ADMIN_*_USERNAME',
  },
  { username: 'ogpswan@yahoo.com', password: 'KlackKlack80', source: 'project-env-admin' },
  { username: 'ogpswan', password: 'KlackKlack80', source: 'project-env-admin-username' },
  { username: 'admin@swanstudios.com', password: 'admin123', source: 'seed-test-accounts' },
  { username: 'admin@sswanstudios.com', password: 'testpassword', source: 'legacy-e2e-default' },
  { username: 'admin@test.com', password: 'TestAdmin123!', source: 'backend-test-fixture' },
]
  .map((c) => ({ ...c, username: clean(c.username), password: clean(c.password) }))
  .filter((c) => c.username && c.password);

const PLACEHOLDER_PATTERNS = [
  /coming soon/i,
  /under construction/i,
  /not implemented/i,
  /todo/i,
  /placeholder/i,
  /mock data/i,
  /sample data/i,
  /this workspace encountered an error/i,
  /unable to load/i,
  /failed to load/i,
];

function normalizeText(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .replace(/\u0000/g, '')
    .trim();
}

function slug(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function hashText(value) {
  return createHash('sha1').update(value || '').digest('hex');
}

async function tryApiLogin(page, candidate) {
  const response = await page.request.post('http://localhost:10000/api/auth/login', {
    data: { username: candidate.username, password: candidate.password },
  });
  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  return {
    status: response.status(),
    ok: response.ok(),
    body,
  };
}

async function login(page) {
  const loginAttempts = [];
  let winningAttempt = null;

  for (const candidate of credentialCandidates) {
    const result = await tryApiLogin(page, candidate);
    const success = result.ok && !!result.body?.token;
    loginAttempts.push({
      username: candidate.username,
      source: candidate.source,
      status: result.status,
      success,
    });

    if (success) {
      winningAttempt = { candidate, result };
      break;
    }
  }

  if (!winningAttempt) {
    throw new Error(`Unable to authenticate admin via API. Attempts: ${JSON.stringify(loginAttempts)}`);
  }

  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(
    ({ token, user }) => {
      localStorage.setItem('token', token);
      localStorage.setItem('tokenTimestamp', Date.now().toString());
      localStorage.setItem('user', JSON.stringify(user));
    },
    {
      token: winningAttempt.result.body.token,
      user: winningAttempt.result.body.user,
    }
  );

  await page.goto(`${BASE_URL}/dashboard/home`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});

  if (!page.url().includes('/dashboard/')) {
    throw new Error('Token injection login did not reach dashboard route.');
  }

  return {
    reusedSession: false,
    loginAttempts,
    selectedCredential: {
      username: winningAttempt.candidate.username,
      source: winningAttempt.candidate.source,
    },
  };
}

async function getVisibleHeading(page) {
  const headingLocator = page
    .locator('h1, h2, [role="heading"]')
    .filter({ hasText: /\S/ })
    .first();

  if ((await headingLocator.count()) === 0) return null;
  try {
    const text = normalizeText(await headingLocator.innerText({ timeout: 2000 }));
    return text || null;
  } catch {
    return null;
  }
}

async function getTabPanelText(page) {
  const panel = page.locator('[role="tabpanel"]').first();
  try {
    if ((await panel.count()) > 0) {
      return normalizeText(await panel.innerText({ timeout: 5000 }));
    }
  } catch {
    // fall through
  }
  return normalizeText(await page.locator('body').innerText());
}

async function runAudit() {
  mkdirSync(REPORT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ baseURL: BASE_URL, viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();

  const runtime = {
    consoleErrors: [],
    pageErrors: [],
    apiErrors: [],
  };

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      runtime.consoleErrors.push({ url: page.url(), text: normalizeText(msg.text()) });
    }
  });

  page.on('pageerror', (error) => {
    runtime.pageErrors.push({ url: page.url(), text: normalizeText(error.message) });
  });

  page.on('response', (response) => {
    if (response.status() >= 400 && response.url().includes('/api/')) {
      runtime.apiErrors.push({
        url: page.url(),
        apiUrl: response.url(),
        status: response.status(),
      });
    }
  });

  const loginMeta = await login(page);

  const workspaceButtons = page.locator('nav button[role="menuitem"]');
  const workspaceCount = await workspaceButtons.count();
  if (workspaceCount === 0) {
    throw new Error('No admin workspace buttons found in sidebar.');
  }

  const results = [];
  const workspaceSummary = [];

  for (let w = 0; w < workspaceCount; w += 1) {
    const workspaceButton = page.locator('nav button[role="menuitem"]').nth(w);
    const workspaceLabel = normalizeText(await workspaceButton.innerText());

    await workspaceButton.click();
    await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});

    const workspacePath = new URL(page.url()).pathname;
    const tabButtons = page.locator('[role="tablist"] [role="tab"]');
    const tabCount = await tabButtons.count();

    workspaceSummary.push({
      workspaceLabel,
      workspacePath,
      tabCount,
    });

    for (let t = 0; t < tabCount; t += 1) {
      const tabButton = page.locator('[role="tablist"] [role="tab"]').nth(t);
      const tabLabel = normalizeText(await tabButton.innerText());

      const before = {
        consoleErrors: runtime.consoleErrors.length,
        pageErrors: runtime.pageErrors.length,
        apiErrors: runtime.apiErrors.length,
      };

      await tabButton.click();
      await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
      await page
        .waitForFunction(
          (index) => {
            const tabs = Array.from(document.querySelectorAll('[role="tablist"] [role="tab"]'));
            return tabs[index]?.getAttribute('aria-selected') === 'true';
          },
          t,
          { timeout: 5000 }
        )
        .catch(() => {});

      const currentPath = new URL(page.url()).pathname;
      const heading = await getVisibleHeading(page);
      const panelText = await getTabPanelText(page);
      const panelTextLower = panelText.toLowerCase();
      const contentSignature = hashText(panelTextLower.slice(0, 2000));

      const placeholderSignals = PLACEHOLDER_PATTERNS.filter((pattern) => pattern.test(panelTextLower)).map((pattern) => pattern.source);

      const newConsoleErrors = runtime.consoleErrors.slice(before.consoleErrors);
      const newPageErrors = runtime.pageErrors.slice(before.pageErrors);
      const newApiErrors = runtime.apiErrors.slice(before.apiErrors);

      const issueFlags = [];
      if (placeholderSignals.length > 0) issueFlags.push('placeholder_or_unfinished_content');
      if (newConsoleErrors.length > 0 || newPageErrors.length > 0) issueFlags.push('runtime_js_error');
      if (newApiErrors.some((e) => e.status >= 500)) issueFlags.push('api_5xx_error');
      if (!heading) issueFlags.push('missing_heading');

      let screenshotPath = null;
      if (issueFlags.length > 0) {
        screenshotPath = path.join(REPORT_DIR, `${slug(workspaceLabel)}__${slug(tabLabel)}.png`);
        await page.screenshot({ path: screenshotPath, fullPage: true });
      }

      results.push({
        workspaceLabel,
        workspacePath,
        tabLabel,
        tabIndex: t,
        path: currentPath,
        heading,
        issueFlags,
        placeholderSignals,
        runtime: {
          newConsoleErrors: newConsoleErrors.slice(0, 5),
          newPageErrors: newPageErrors.slice(0, 5),
          newApiErrors: newApiErrors.slice(0, 5),
          counts: {
            consoleErrors: newConsoleErrors.length,
            pageErrors: newPageErrors.length,
            apiErrors: newApiErrors.length,
          },
        },
        contentSignature,
        contentPreview: panelText.slice(0, 400),
        screenshotPath,
      });
    }
  }

  const bySignature = new Map();
  for (const item of results) {
    if (!bySignature.has(item.contentSignature)) bySignature.set(item.contentSignature, []);
    bySignature.get(item.contentSignature).push(item);
  }

  const duplicateGroups = Array.from(bySignature.values())
    .filter((group) => group.length > 1)
    .map((group) => ({
      signature: group[0].contentSignature,
      tabs: group.map((g) => ({ workspaceLabel: g.workspaceLabel, tabLabel: g.tabLabel, path: g.path })),
    }));

  const summary = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    loginMeta,
    workspaceCount,
    tabCount: results.length,
    tabsWithIssues: results.filter((r) => r.issueFlags.length > 0).length,
    duplicateContentGroups: duplicateGroups.length,
    workspaceSummary,
  };

  const report = {
    summary,
    duplicateGroups,
    tabs: results,
    runtimeTotals: {
      consoleErrors: runtime.consoleErrors.length,
      pageErrors: runtime.pageErrors.length,
      apiErrors: runtime.apiErrors.length,
      sampleConsoleErrors: runtime.consoleErrors.slice(0, 20),
      samplePageErrors: runtime.pageErrors.slice(0, 20),
      sampleApiErrors: runtime.apiErrors.slice(0, 20),
    },
  };

  const reportPath = path.join(REPORT_DIR, 'report.json');
  writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');

  const quickSummaryPath = path.join(REPORT_DIR, 'summary.txt');
  const lines = [
    `Generated: ${summary.generatedAt}`,
    `Workspaces scanned: ${summary.workspaceCount}`,
    `Tabs scanned: ${summary.tabCount}`,
    `Tabs with issue flags: ${summary.tabsWithIssues}`,
    `Duplicate content groups: ${summary.duplicateContentGroups}`,
    `Report: ${reportPath}`,
  ];
  writeFileSync(quickSummaryPath, `${lines.join('\n')}\n`, 'utf8');

  console.log(JSON.stringify(summary, null, 2));

  await context.close();
  await browser.close();
}

runAudit().catch((error) => {
  console.error('Admin tab audit failed:', error);
  process.exit(1);
});

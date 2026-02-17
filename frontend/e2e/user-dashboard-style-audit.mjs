import fs from 'fs/promises';
import path from 'path';
import { chromium, devices } from '@playwright/test';

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://sswanstudios.com';
const API_URL = process.env.API_URL || 'https://ss-pt-new.onrender.com';
const OUT_DIR = path.resolve('test-results', 'user-dashboard-style-audit');

function nowStamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function short(text, max = 240) {
  if (!text) return '';
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

function collectPageEvents(page, bucket) {
  page.on('console', (msg) => {
    const type = msg.type();
    const text = msg.text();
    if (['error', 'warning'].includes(type)) {
      bucket.console.push({
        type,
        text: short(text),
        url: page.url()
      });
    }
  });

  page.on('requestfailed', (request) => {
    bucket.requestFailures.push({
      method: request.method(),
      url: request.url(),
      failure: request.failure()?.errorText || 'unknown'
    });
  });

  page.on('response', (response) => {
    const status = response.status();
    if (status >= 400) {
      bucket.httpErrors.push({
        status,
        url: response.url(),
        method: response.request().method()
      });
    }
  });
}

async function createAuthUser() {
  const stamp = Date.now();
  const username = `qa_style_${stamp}`;
  const email = `qa.style.${stamp}@swanstudios-qa.local`;
  const password = 'StyleAudit!2026Aa';

  const registerRes = await fetch(`${API_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      firstName: 'Style',
      lastName: 'Audit',
      email,
      username,
      password
    })
  });

  if (!registerRes.ok) {
    throw new Error(`Register failed: HTTP ${registerRes.status}`);
  }

  const data = await registerRes.json();
  if (!data?.success || !data?.token || !data?.user) {
    throw new Error('Register succeeded but auth payload missing token/user');
  }

  return {
    username,
    email,
    token: data.token,
    refreshToken: data.refreshToken || '',
    user: data.user
  };
}

async function injectAuth(page, auth) {
  await page.goto(FRONTEND_URL, { waitUntil: 'domcontentloaded' });
  await page.evaluate((payload) => {
    localStorage.setItem('token', payload.token);
    if (payload.refreshToken) localStorage.setItem('refreshToken', payload.refreshToken);
    localStorage.setItem('user', JSON.stringify(payload.user));
  }, auth);
}

async function runDiagnostics(page) {
  return page.evaluate(() => {
    function isVisible(el) {
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    }

    function selectorOf(el) {
      if (el.id) return `#${el.id}`;
      const cls = (el.className || '')
        .toString()
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .join('.');
      return cls ? `${el.tagName.toLowerCase()}.${cls}` : el.tagName.toLowerCase();
    }

    function textOf(el) {
      const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
      if (!text) return '';
      return text.length > 90 ? `${text.slice(0, 90)}...` : text;
    }

    const all = Array.from(document.querySelectorAll('*'));
    const overflowElements = [];
    const smallTapTargets = [];
    const tallElements = [];
    let brokenImages = 0;

    for (const el of all) {
      if (!isVisible(el)) continue;
      if (el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 2) {
        overflowElements.push({
          selector: selectorOf(el),
          text: textOf(el),
          scrollWidth: el.scrollWidth,
          clientWidth: el.clientWidth
        });
      }

      const rect = el.getBoundingClientRect();
      if (rect.height > 900) {
        tallElements.push({
          selector: selectorOf(el),
          text: textOf(el),
          height: Math.round(rect.height),
          width: Math.round(rect.width),
          position: window.getComputedStyle(el).position
        });
      }
    }

    const tapCandidates = Array.from(
      document.querySelectorAll('button, a, [role="button"], input, select, textarea, [tabindex]:not([tabindex="-1"])')
    );
    for (const el of tapCandidates) {
      if (!isVisible(el)) continue;
      const rect = el.getBoundingClientRect();
      if (rect.width < 44 || rect.height < 44) {
        smallTapTargets.push({
          selector: selectorOf(el),
          text: textOf(el),
          width: Math.round(rect.width),
          height: Math.round(rect.height)
        });
      }
    }

    const imgs = Array.from(document.images || []);
    for (const img of imgs) {
      if (!img.complete || img.naturalWidth === 0) {
        brokenImages += 1;
      }
    }

    return {
      pageUrl: window.location.href,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      documentScrollWidth: document.documentElement.scrollWidth,
      documentScrollHeight: document.documentElement.scrollHeight,
      horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
      overflowCount: overflowElements.length,
      overflowSample: overflowElements.slice(0, 20),
      tallestElements: tallElements
        .sort((a, b) => b.height - a.height)
        .slice(0, 20),
      smallTapTargetCount: smallTapTargets.length,
      smallTapTargetSample: smallTapTargets.slice(0, 30),
      brokenImages
    };
  });
}

async function auditViewport(browser, label, config, auth) {
  const context = await browser.newContext(config);
  const page = await context.newPage();
  const events = { console: [], requestFailures: [], httpErrors: [] };
  collectPageEvents(page, events);

  await injectAuth(page, auth);
  await page.goto(`${FRONTEND_URL}/user-dashboard`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  const screenshotPath = path.join(OUT_DIR, `${label}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  const diagnostics = await runDiagnostics(page);

  await context.close();
  return {
    label,
    screenshotPath,
    diagnostics,
    events
  };
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const auditId = nowStamp();

  const auth = await createAuthUser();
  const browser = await chromium.launch({ headless: true });

  const desktop = await auditViewport(browser, `desktop-${auditId}`, { viewport: { width: 1440, height: 900 } }, auth);
  const mobile = await auditViewport(
    browser,
    `mobile-${auditId}`,
    { ...devices['iPhone 13'] },
    auth
  );

  await browser.close();

  const report = {
    auditId,
    frontendUrl: FRONTEND_URL,
    apiUrl: API_URL,
    authUser: { username: auth.username, email: auth.email },
    desktop,
    mobile
  };

  const reportPath = path.join(OUT_DIR, `report-${auditId}.json`);
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2), 'utf8');
  console.log(JSON.stringify({ ok: true, reportPath, desktop: desktop.screenshotPath, mobile: mobile.screenshotPath }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error.message, stack: error.stack }, null, 2));
  process.exit(1);
});

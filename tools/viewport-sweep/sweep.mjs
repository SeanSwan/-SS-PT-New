/**
 * sweep.mjs — portable mobile-viewport sweep runner
 * ===================================================
 * LIFT-OUT PORTABLE: this tool has ZERO app-specific and ZERO package
 * dependencies of its own. The config file injects EVERYTHING app-specific —
 * including the Playwright browser object — so copying tools/viewport-sweep/
 * into any project + writing a config = a working sweep. (See README.md.)
 *
 * Usage:  node tools/viewport-sweep/sweep.mjs [path/to/config.mjs]
 * Default config: ./viewport-sweep.config.mjs (next to this file)
 *
 * Per bucket × route it asserts the "pixel-perfect" floor:
 *   1. NO horizontal overflow (documentElement.scrollWidth ≤ innerWidth+1),
 *      with the top offending elements named.
 *   2. NO undersized touch targets: visible interactive elements ≥44px in
 *      BOTH dimensions (unless inside an element matching an allowlist).
 *   3. NO offscreen-right interactive elements (clipped controls).
 * Output: JSON + Markdown defect ledger in config.outputDir.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { VIEWPORT_BUCKETS } from './buckets.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

const configPath = process.argv[2]
  ? resolve(process.cwd(), process.argv[2])
  : resolve(__dirname, 'viewport-sweep.config.mjs');

const { default: config } = await import(pathToFileURL(configPath).href);

const {
  chromium,             // injected Playwright chromium (from the HOST app)
  baseUrl,              // e.g. http://localhost:4173
  routes,               // [{ path, label, readySelector?, waitMs? }]
  outputDir = resolve(__dirname, 'output'),
  buckets = VIEWPORT_BUCKETS,
  touchTargetMin = 44,
  touchTargetIgnore = [],   // CSS selectors whose subtree is exempt
  screenshotFailures = true,
  storageStatePath = null,  // optional authed session for protected routes
} = config;

if (!chromium || !baseUrl || !Array.isArray(routes) || routes.length === 0) {
  console.error('Config must provide { chromium, baseUrl, routes[] }');
  process.exit(2);
}

mkdirSync(outputDir, { recursive: true });

/** Runs inside the page: overflow + touch-target + clipped-control audit. */
const AUDIT_FN = ([minPx, ignoreSelectors]) => {
  const vw = window.innerWidth;
  const doc = document.documentElement;
  const describe = (el) => {
    const id = el.id ? `#${el.id}` : '';
    const cls = typeof el.className === 'string' && el.className
      ? `.${el.className.trim().split(/\s+/).slice(0, 2).join('.')}`
      : '';
    const text = (el.textContent || '').trim().slice(0, 32).replace(/\s+/g, ' ');
    return `${el.tagName.toLowerCase()}${id}${cls}${text ? ` "${text}"` : ''}`;
  };
  const ignored = (el) => ignoreSelectors.some((sel) => { try { return el.closest(sel); } catch { return false; } });
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return false;
    // Off-canvas (honeypots, left:-9999 anti-spam fields, off-screen carousels)
    // are not user-facing tap targets.
    if (r.right < 0 || r.left > vw || r.bottom < 0) return false;
    const style = getComputedStyle(el);
    if (style.opacity === '0') return false;
    return style.visibility !== 'hidden' && style.display !== 'none' && style.pointerEvents !== 'none';
  };

  const overflowPx = Math.max(0, doc.scrollWidth - vw);
  const overflowOffenders = [];
  if (overflowPx > 1) {
    for (const el of document.body.querySelectorAll('*')) {
      const r = el.getBoundingClientRect();
      if (r.right > vw + 1 && r.width > 8 && !ignored(el)) {
        overflowOffenders.push({ el: describe(el), right: Math.round(r.right) });
        if (overflowOffenders.length >= 5) break;
      }
    }
  }

  const smallTargets = [];
  const clippedControls = [];
  const interactive = document.querySelectorAll(
    'a[href], button, [role="button"], input:not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  for (const el of interactive) {
    if (!visible(el) || ignored(el)) continue;
    const r = el.getBoundingClientRect();
    if ((r.width + 0.5 < minPx || r.height + 0.5 < minPx) && smallTargets.length < 8) {
      smallTargets.push({ el: describe(el), w: Math.round(r.width), h: Math.round(r.height) });
    }
    if (r.left > vw - 4 && clippedControls.length < 5) {
      clippedControls.push({ el: describe(el), left: Math.round(r.left) });
    }
  }
  return { overflowPx, overflowOffenders, smallTargets, clippedControls };
};

const browser = await chromium.launch({ headless: true });
const results = [];

for (const bucket of buckets) {
  const context = await browser.newContext({
    viewport: { width: bucket.width, height: bucket.height },
    deviceScaleFactor: bucket.dpr,
    isMobile: true,
    hasTouch: true,
    ...(storageStatePath ? { storageState: storageStatePath } : {}),
  });
  const page = await context.newPage();

  for (const route of routes) {
    const url = `${baseUrl}${route.path}`;
    const record = { bucket: bucket.id, viewport: `${bucket.width}x${bucket.height}@${bucket.dpr}`, route: route.path, label: route.label, pixelPerfect: bucket.pixelPerfect };
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      if (route.readySelector) {
        await page.waitForSelector(route.readySelector, { timeout: 15000 }).catch(() => {});
      }
      await page.waitForTimeout(route.waitMs ?? 600);
      const audit = await page.evaluate(AUDIT_FN, [touchTargetMin, touchTargetIgnore]);
      record.audit = audit;
      record.pass =
        audit.overflowPx <= 1 &&
        (bucket.pixelPerfect ? audit.smallTargets.length === 0 : true) &&
        audit.clippedControls.length === 0;
      if (!record.pass && screenshotFailures) {
        const shot = resolve(outputDir, `FAIL-${bucket.id}-${route.label.replace(/\W+/g, '-')}.png`);
        await page.screenshot({ path: shot, fullPage: false }).catch(() => {});
        record.screenshot = shot;
      }
    } catch (error) {
      record.pass = false;
      record.error = error?.message?.slice(0, 200);
    }
    results.push(record);
    console.log(`${record.pass ? '✅' : '❌'} ${bucket.id} ${bucket.width}x${bucket.height} ${route.path}${record.error ? ` (${record.error})` : ''}`);
  }
  await context.close();
}

await browser.close();

const failures = results.filter((r) => !r.pass);
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
writeFileSync(resolve(outputDir, `sweep-${stamp}.json`), JSON.stringify(results, null, 2));

const md = [
  `# Viewport sweep — ${stamp}`,
  `Base: ${baseUrl} · ${buckets.length} buckets × ${routes.length} routes = ${results.length} checks · **${failures.length} failures**`,
  '',
  ...failures.map((f) => {
    const a = f.audit ?? {};
    return [
      `## ❌ ${f.bucket} ${f.viewport} — ${f.route}`,
      f.error ? `- load error: ${f.error}` : null,
      a.overflowPx > 1 ? `- horizontal overflow: ${a.overflowPx}px → ${a.overflowOffenders.map((o) => o.el).join(' · ')}` : null,
      a.smallTargets?.length ? `- touch targets <${touchTargetMin}px: ${a.smallTargets.map((t) => `${t.el} (${t.w}x${t.h})`).join(' · ')}` : null,
      a.clippedControls?.length ? `- clipped controls: ${a.clippedControls.map((c) => c.el).join(' · ')}` : null,
      f.screenshot ? `- screenshot: ${f.screenshot}` : null,
    ].filter(Boolean).join('\n');
  }),
  failures.length === 0 ? '✅ All checks green.' : '',
].join('\n');
writeFileSync(resolve(outputDir, `sweep-${stamp}.md`), md);

console.log(`\n${failures.length === 0 ? '✅ SWEEP GREEN' : `❌ ${failures.length}/${results.length} FAILURES`} — ledger: ${resolve(outputDir, `sweep-${stamp}.md`)}`);
process.exit(failures.length === 0 ? 0 : 1);

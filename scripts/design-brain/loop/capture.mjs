/**
 * capture.mjs — real-browser capture + deterministic DOM meters (S3, SWA-185).
 * ============================================================================
 * BLUEPRINT §S3. The deterministic tier's browser lane: the rendered file is
 * opened in headless Chromium and measured with REAL computed styles and REAL
 * geometry — closing S1's honest gap where contrast was measured on token
 * fallbacks by regex and "CTA in first viewport" was a string split. Zero LLM
 * involvement, per doctrine: everything here is arithmetic on the live DOM.
 *
 * Playwright resolves via a ladder (repo root, then frontend/node_modules —
 * where this repo actually installs it). Unavailability is returned as a
 * value, never thrown: the caller decides whether a missing browser fails the
 * run (default: yes — silent degradation is how receipts become theater).
 */
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

export const DEFAULT_VIEWPORTS = [
  { width: 375, height: 667 },
  { width: 1440, height: 900 },
];

/** Resolve playwright from root or frontend/node_modules. Returns module or null. */
export function resolvePlaywright() {
  for (const base of [join(ROOT, 'package.json'), join(ROOT, 'frontend', 'package.json')]) {
    try {
      return createRequire(pathToFileURL(base))('playwright');
    } catch { /* next rung */ }
  }
  return null;
}

/** In-page metric script — serialized into page.evaluate. Pure DOM arithmetic. */
function pageMetrics(viewportHeight) {
  const lum = (r, g, b) => {
    const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const parse = (s) => {
    const m = s.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    return m ? { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] } : null;
  };
  const effectiveBg = (el) => {
    for (let n = el; n; n = n.parentElement) {
      const c = parse(getComputedStyle(n).backgroundColor);
      if (c && c.a > 0.9) return c;
    }
    return { r: 255, g: 255, b: 255, a: 1 };
  };
  const ratio = (a, b) => {
    const [hi, lo] = [lum(a.r, a.g, a.b), lum(b.r, b.g, b.b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  };

  const doc = document.documentElement;
  const overflow = doc.scrollWidth > (window.innerWidth + 2);

  const tapFails = [];
  for (const el of document.querySelectorAll('a, button, [data-cta]')) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && (r.width < 44 || r.height < 44)) {
      tapFails.push({ tag: el.tagName.toLowerCase(), w: Math.round(r.width), h: Math.round(r.height), text: (el.textContent || '').trim().slice(0, 40) });
    }
  }

  const cta = document.querySelector('[data-cta]');
  const ctaTop = cta ? Math.round(cta.getBoundingClientRect().top + window.scrollY) : null;

  const contrastFails = [];
  let minFont = Infinity;
  for (const el of document.querySelectorAll('h1, h2, h3, p, li, td, span, a, [data-kpi]')) {
    if (!el.textContent || !el.textContent.trim()) continue;
    const cs = getComputedStyle(el);
    const fs = parseFloat(cs.fontSize);
    if (fs) minFont = Math.min(minFont, fs);
    const fg = parse(cs.color);
    if (!fg) continue;
    const r = Math.round(ratio(fg, effectiveBg(el)) * 100) / 100;
    if (r < 4.5) contrastFails.push({ tag: el.tagName.toLowerCase(), ratio: r, text: el.textContent.trim().slice(0, 40) });
  }

  return {
    overflow,
    scrollWidth: doc.scrollWidth,
    innerWidth: window.innerWidth,
    tapFails,
    ctaTop,
    ctaInFold: cta ? ctaTop < viewportHeight : false,
    contrastFails,
    minFont: minFont === Infinity ? null : Math.round(minFont * 10) / 10,
  };
}

/**
 * Open the rendered HTML in headless Chromium; per viewport: screenshot the
 * fold and the full page, and measure. Returns {available, viewports:[...]}.
 */
export async function captureAndMeasure(htmlPath, outDir, { viewports = DEFAULT_VIEWPORTS, playwright = resolvePlaywright() } = {}) {
  if (!playwright) return { available: false, reason: 'playwright not resolvable from root or frontend/node_modules' };
  mkdirSync(outDir, { recursive: true });

  const browser = await playwright.chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(pathToFileURL(htmlPath).href);
    const results = [];
    for (const vp of viewports) {
      await page.setViewportSize(vp);
      const fold = join(outDir, `${vp.width}-fold.png`);
      const full = join(outDir, `${vp.width}-full.png`);
      await page.screenshot({ path: fold });
      await page.screenshot({ path: full, fullPage: true });
      const metrics = await page.evaluate(pageMetrics, vp.height);
      results.push({ viewport: vp, shots: { fold, full }, ...metrics });
    }
    return { available: true, viewports: results };
  } finally {
    await browser.close();
  }
}

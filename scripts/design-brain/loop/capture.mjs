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
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

/** Scroll-strip stops (percent of scrollable range) — blueprint §S6 motion lane. */
export const SCROLL_STOPS = Object.freeze([0, 20, 40, 60, 80, 100]);

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

  // S6 motion lint (deterministic tier — no LLM ever touches this).
  // Two failure classes the blueprint names: animating LAYOUT properties (which
  // forces reflow on every frame instead of riding the compositor), and infinite
  // ambient loops above the fold (which never let the first viewport settle).
  const LAYOUT_PROPS = ['width', 'height', 'top', 'left', 'right', 'bottom', 'margin', 'padding', 'inset'];
  const motionFindings = [];
  const label = (el) => {
    const zone = el.closest('[data-zone]');
    return `${zone ? `${zone.getAttribute('data-zone')}>` : ''}${el.tagName.toLowerCase()}`;
  };
  // DURATION IS THE TEST, NOT THE PROPERTY LIST. `transition-property` computes
  // to its initial value `all` on EVERY element that declares no transition —
  // including <head> and <style>. The first cut of this meter flagged all 26
  // elements of a page with zero animation, which is how a gate teaches people
  // to switch it off. Nothing animates unless its duration is greater than zero.
  const secs = (v) => String(v ?? '').split(',').map((x) => {
    const t = x.trim();
    const n = parseFloat(t);
    if (!Number.isFinite(n)) return 0;
    return t.endsWith('ms') ? n / 1000 : n;
  });
  let animatedCount = 0;
  for (const el of document.querySelectorAll('*')) {
    const cs = getComputedStyle(el);

    const tProps = String(cs.transitionProperty ?? '').split(',').map((x) => x.trim());
    const tDurs = secs(cs.transitionDuration);
    tProps.forEach((prop, i) => {
      const dur = tDurs[i] ?? tDurs[0] ?? 0;
      if (dur <= 0) return; // declared nothing, or explicitly instant
      if (prop === 'all') {
        motionFindings.push({ kind: 'transition-all', sel: label(el), detail: `transition:all for ${dur}s sweeps layout properties in by accident` });
      } else if (LAYOUT_PROPS.some((lp) => prop === lp || prop.startsWith(`${lp}-`))) {
        motionFindings.push({ kind: 'layout-transition', sel: label(el), detail: `${prop} (${dur}s) — animating layout forces reflow every frame` });
      }
    });

    const names = String(cs.animationName ?? '').split(',').map((x) => x.trim());
    const aDurs = secs(cs.animationDuration);
    const counts = String(cs.animationIterationCount ?? '').split(',').map((x) => x.trim());
    names.forEach((name, i) => {
      if (name === 'none' || (aDurs[i] ?? aDurs[0] ?? 0) <= 0) return;
      animatedCount += 1;
      if ((counts[i] ?? counts[0]) !== 'infinite') return;
      const r = el.getBoundingClientRect();
      if (r.top < viewportHeight && r.height > 0) {
        motionFindings.push({ kind: 'infinite-above-fold', sel: label(el), detail: name });
      }
    });
  }

  // A declared plate that did not DECODE is the "count of attempts is not a
  // count of outcomes" bug: the attribute is stamped, the <img> is in the DOM,
  // every other meter passes, and the page shows a broken image. Measured as an
  // outcome (naturalWidth), never as the presence of the tag.
  const plateFails = [];
  let plateCount = 0;
  for (const el of document.querySelectorAll('[data-plate]')) {
    plateCount += 1;
    if (el.tagName.toLowerCase() !== 'img') continue;
    if (!el.complete || el.naturalWidth === 0) {
      plateFails.push({ src: el.getAttribute('src'), reason: el.complete ? 'decoded to zero width' : 'never finished loading' });
    }
  }

  return {
    overflow,
    motionFindings,
    animatedCount,
    plateFails,
    plateCount,
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
      // Chromium can refuse a capture taken in the same tick as a resize
      // ("Protocol error (Page.captureScreenshot): Unable to capture
      // screenshot") — intermittently, and more often under load. Waiting two
      // animation frames lets the compositor settle after the resize. A retry
      // would have hidden a real race behind a flaky-looking green.
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
      const fold = join(outDir, `${vp.width}-fold.png`);
      const full = join(outDir, `${vp.width}-full.png`);
      await page.screenshot({ path: fold });
      await page.screenshot({ path: full, fullPage: true });
      const metrics = await page.evaluate(pageMetrics, vp.height);

      // S6 scroll strip: six stills across the page's own scroll range. A single
      // fold shot cannot show a scroll journey, and the blueprint is explicit
      // that stills never certify the motion bar — this is the evidence layer,
      // not the judgement.
      const strip = [];
      for (const pct of SCROLL_STOPS) {
        await page.evaluate((f) => {
          const max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
          window.scrollTo(0, Math.round(max * f));
        }, pct / 100);
        await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
        const shot = join(outDir, `${vp.width}-scroll-${String(pct).padStart(3, '0')}.png`);
        await page.screenshot({ path: shot });
        strip.push({ pct, path: shot });
      }
      await page.evaluate(() => window.scrollTo(0, 0));

      // Composite the strip into ONE viewable artifact per viewport. Blueprint
      // §S6 asks for the stills "composited"; six loose PNGs are the evidence,
      // this is the thing a human actually opens to read the scroll journey.
      // Plain HTML on purpose — no image library, no new dependency.
      const stripPath = join(outDir, `${vp.width}-scroll-strip.html`);
      writeFileSync(stripPath, `<!-- scroll strip: ${vp.width}px -->
<style>body{margin:0;background:#0A0A0F;color:#E0ECF4;font:14px system-ui}
figure{margin:0}figcaption{padding:6px 8px;font-family:ui-monospace,monospace}
.strip{display:flex;gap:12px;padding:12px;overflow-x:auto}
img{display:block;height:320px;width:auto;border:1px solid #003080}</style>
<h1 style="padding:12px 16px;font-size:15px">scroll strip · ${vp.width}px</h1>
<div class="strip">${strip.map((x) => `<figure><img src="./${basename(x.path)}" alt="scroll ${x.pct}%"><figcaption>${x.pct}%</figcaption></figure>`).join('')}</div>`);

      results.push({ viewport: vp, shots: { fold, full }, strip, stripPath, ...metrics });
    }

    // Reduced-motion dual run: the SAME page under `prefers-reduced-motion:
    // reduce`. Honouring the preference is measured on the rendered result, not
    // inferred from the presence of a media query in the stylesheet.
    let reducedMotion = null;
    try {
      const rmCtx = await browser.newContext({ reducedMotion: 'reduce', viewport: viewports[0] });
      const rmPage = await rmCtx.newPage();
      await rmPage.goto(pathToFileURL(htmlPath).href);
      const rm = await rmPage.evaluate(pageMetrics, viewports[0].height);
      reducedMotion = { animatedCount: rm.animatedCount, motionFindings: rm.motionFindings };
      await rmCtx.close();
    } catch (err) {
      // Recorded as unavailable, never silently skipped (fail-closed, §1.6).
      reducedMotion = { unavailable: err.message };
    }

    return { available: true, viewports: results, reducedMotion };
  } finally {
    await browser.close();
  }
}

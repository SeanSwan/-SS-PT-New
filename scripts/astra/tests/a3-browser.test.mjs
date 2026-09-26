/**
 * a3-browser.test.mjs — slice A3's BROWSER measurements.
 *
 * T-A-01  no horizontal overflow at 360 / 560 / 768 / 1024 / 1440
 * T-A-02  the tier badge and the palette line survive the narrow layout
 * T-A-03  keyboard-only traversal: every control reachable, a visible focus ring, no trap
 * T-A-05  `prefers-reduced-motion` gates a transition that actually exists
 *
 * THESE ARE MEASUREMENTS, NOT PROXIES. Each one drives a real Chromium over CDP: a
 * real layout viewport for T-A-01, a real `Tab` key event for T-A-03, and a real
 * emulated media feature for T-A-05. The alternative for T-A-01 — asserting that the
 * stylesheet contains no fixed widths — would pass against a page that overflowed,
 * because the thing that makes a page overflow is not usually a literal `width:`.
 *
 * ONE BROWSER FOR THE WHOLE FILE. Launching per test would spawn six Chromium
 * processes and take minutes; the subtests share a page and each navigates for
 * itself, so no test can observe another's leftovers.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';

import { ASTRA_EVIDENCE } from '../core/paths.mjs';
import { startServer } from '../surface/server.mjs';
import { withPage, findBrowser } from './helpers/cdp.mjs';

const WIDTHS = [360, 560, 768, 1024, 1440];
const BRIEF = { text: 'a frozen lake at dawn, low vantage, the ice breathing', intent: 'hero', aspect: '16:9' };

const BROWSER = findBrowser();

/** POST helper against the live server. */
const post = async (base, route, body, token) => {
  const r = await fetch(`${base}/api/${route}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(token ? { 'x-astra-token': token } : {}) },
    body: JSON.stringify(body ?? {}),
  });
  return { status: r.status, body: await r.json() };
};

test('A3 browser measurements', { skip: BROWSER ? false : 'no Chromium/Chrome/Edge binary on this machine' }, async (t) => {
  const server = await startServer({ port: 0, token: 'browser-test-token' });
  const base = server.url.replace(/\/$/, '');

  // Ask for directions first, so the Choose pane's cards exist and the overflow test
  // measures the layout WITH content rather than an empty grid that trivially fits.
  const dirs = await post(base, 'directions', BRIEF);
  assert.equal(dirs.status, 200);
  const compiled = await post(base, 'compile', { brief: BRIEF }, server.token);
  assert.equal(compiled.status, 200);
  const thinkUrl = `${base}/think/${compiled.body.compileId}`;

  try {
    await withPage(async (page) => {
      // ---------------------------------------------------------------------
      // T-A-01 — no horizontal overflow, at five widths, on two panes
      // ---------------------------------------------------------------------
      await t.test('T-A-01 no horizontal overflow at any of the five widths', async () => {
        const measured = [];
        for (const url of [`${base}/`, thinkUrl]) {
          for (const w of WIDTHS) {
            await page.viewport(w, 900);
            await page.goto(url);
            const m = await page.eval(`JSON.stringify({
              sw: document.documentElement.scrollWidth,
              cw: document.documentElement.clientWidth,
              bodySw: document.body.scrollWidth
            })`);
            const r = JSON.parse(m);
            measured.push({ url: url.replace(base, ''), w, ...r });
            assert.ok(r.sw <= r.cw,
              `horizontal overflow at ${url.replace(base, '')} @${w}px: scrollWidth ${r.sw} > clientWidth ${r.cw}`);
          }
        }
        assert.equal(measured.length, WIDTHS.length * 2);
        // The instrument must be able to FAIL. This proves the measurement is not
        // reading a value that is pinned to equal by some other rule.
        await page.viewport(360, 900);
        await page.goto(`${base}/`);
        const probe = await page.eval(`(() => {
          const d = document.createElement('div');
          d.style.cssText = 'width:900px;height:8px';
          document.body.appendChild(d);
          const over = document.documentElement.scrollWidth > document.documentElement.clientWidth;
          d.remove();
          return over;
        })()`);
        assert.equal(probe, true, 'the overflow measurement cannot detect a deliberate overflow');
      });

      // ---------------------------------------------------------------------
      // T-A-02 — the load-bearing information survives the narrow layout
      // ---------------------------------------------------------------------
      await t.test('T-A-02 the tier badge and the palette line are visible at 360px', async () => {
        await page.viewport(360, 900);
        await page.goto(`${base}/`);
        const r = JSON.parse(await page.eval(`(() => {
          const badge = document.querySelector('.card-tier .badge');
          const palette = document.querySelector('.card-palette');
          const why = document.querySelector('.tier-why');
          const vis = (el) => !!el && el.offsetParent !== null && el.getBoundingClientRect().height > 0;
          return JSON.stringify({
            badge: vis(badge), badgeText: badge && badge.textContent,
            palette: vis(palette), paletteText: palette && palette.textContent.trim(),
            why: vis(why), whyText: why && why.textContent.trim()
          });
        })()`));
        assert.equal(r.badge, true, 'the tier badge must never be hidden by the collapse');
        assert.ok(['PRIOR', 'EVIDENCE'].includes(r.badgeText), `unexpected badge: ${r.badgeText}`);
        assert.equal(r.palette, true, 'the palette line must never be hidden by the collapse');
        assert.ok(r.paletteText.length > 0);
        // `tierReason` is ALWAYS present, so a PRIOR card cannot be mistaken for an
        // EVIDENCE one. Rendering the badge without the reason would leave the
        // distinction to a colour.
        assert.equal(r.why, true, 'tierReason must render, not just the badge');
        assert.ok(r.whyText.length > 0);
      });

      // ---------------------------------------------------------------------
      // T-A-03 — a REAL Tab traversal
      // ---------------------------------------------------------------------
      await t.test('T-A-03 every control is reachable by Tab, with a visible focus ring', async () => {
        await page.viewport(1024, 900);
        await page.goto(`${base}/`);

        // Each focusable is ANNOTATED with a unique id before the traversal, because
        // the rail links carry neither an `id` nor a `data-control` — a first draft
        // identified elements by `id || data-control || tagName`, so eight nav links
        // all reported "A", the distinct-count check saw 12 instead of 23, and it
        // reported a focus trap that did not exist. The instrument was wrong.
        const focusables = await page.eval(`(() => {
          const sel = 'a[href], button, input, select, textarea, [tabindex]';
          const els = [...document.querySelectorAll(sel)].filter((el) => {
            if (el.disabled) return false;
            if (el.tabIndex < 0) return false;
            if (el.offsetParent === null && el.tagName !== 'A') return false;
            return true;
          });
          els.forEach((el, i) => { el.dataset.tabId = 'f' + i; });
          return els.length;
        })()`);
        assert.ok(focusables >= 8, `expected a real surface to traverse, found ${focusables} focusables`);

        const seen = [];
        const rings = [];
        for (let i = 0; i < focusables; i += 1) {
          await page.pressTab();
          const r = JSON.parse(await page.eval(`(() => {
            const el = document.activeElement;
            if (!el || el === document.body) return JSON.stringify({ none: true });
            const cs = getComputedStyle(el);
            return JSON.stringify({
              id: el.dataset ? el.dataset.tabId : null,
              tag: el.tagName,
              outlineWidth: parseFloat(cs.outlineWidth) || 0,
              outlineStyle: cs.outlineStyle
            });
          })()`));
          if (r.none) break;
          seen.push(r.id);
          rings.push(r);
        }

        assert.equal(seen.length, focusables,
          `Tab reached ${seen.length} of ${focusables} focusable elements — the rest are unreachable`);
        assert.equal(new Set(seen).size, seen.length,
          `Tab reached the same element twice — a focus trap: ${seen.join(' > ')}`);
        assert.ok(seen.every((id) => typeof id === 'string' && id.startsWith('f')),
          `an unannotated element took focus: ${JSON.stringify(seen)}`);

        // A visible focus ring, measured on an element that is ACTUALLY focused by a
        // real key event. `:focus-visible` does not reliably match programmatic
        // focus, which is why this is read after a Tab rather than after `.focus()`.
        const withRing = rings.filter((r) => r.outlineWidth > 0 && r.outlineStyle !== 'none');
        assert.ok(withRing.length >= 1,
          `no focused element had a visible outline: ${JSON.stringify(rings.slice(0, 3))}`);
      });

      // ---------------------------------------------------------------------
      // T-A-05 — the reduced-motion gate, over an animation that exists
      // ---------------------------------------------------------------------
      await t.test('T-A-05 prefers-reduced-motion switches off a real animation', async () => {
        await page.goto(`${base}/`);

        await page.reducedMotion('no-preference');
        await page.goto(`${base}/`, 250);
        const moving = JSON.parse(await page.eval(`(() => {
          const c = document.querySelector('.card');
          const cs = getComputedStyle(c);
          return JSON.stringify({ name: cs.animationName, dur: cs.animationDuration });
        })()`));
        assert.equal(moving.name, 'card-in',
          'the gate must have something real to gate — an animation nobody wrote proves nothing');

        await page.reducedMotion('reduce');
        await page.goto(`${base}/`, 250);
        const still = JSON.parse(await page.eval(`(() => {
          const c = document.querySelector('.card');
          const cs = getComputedStyle(c);
          return JSON.stringify({
            name: cs.animationName, dur: cs.animationDuration,
            htmlFlag: document.documentElement.getAttribute('data-reduced-motion')
          });
        })()`));
        assert.equal(still.name, 'none', `reduced motion must remove the animation, got ${still.name}`);
        assert.equal(still.htmlFlag, 'reduce',
          'the client must read the same media query the stylesheet uses, so the two cannot disagree');

        await page.reducedMotion('no-preference');
      });

      // ---------------------------------------------------------------------
      // Evidence: the screenshots the slice's exit criterion names
      // ---------------------------------------------------------------------
      await t.test('T-A-06 evidence screenshots at 360 / 768 / 1440', async () => {
        for (const w of [360, 768, 1440]) {
          await page.viewport(w, 900);
          await page.goto(`${base}/`);
          await page.screenshot(join(ASTRA_EVIDENCE, `a3-compose-${w}.png`));
        }
        await page.viewport(1440, 900);
        await page.goto(thinkUrl);
        await page.screenshot(join(ASTRA_EVIDENCE, 'a3-think-1440.png'));
      });
    });
  } finally {
    await server.close();
  }
});

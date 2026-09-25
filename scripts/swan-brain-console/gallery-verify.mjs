/**
 * gallery-verify — proves all 20 Three.js variants actually render in a browser.
 * @module scripts/swan-brain-console/gallery-verify
 *
 * WHY THIS EXISTS
 * The contract suite proves structure (unique tuples, real geometry builders, a
 * component per variant). It cannot prove a single pixel reaches the screen.
 *
 * WHY EACH VARIANT IS CHECKED IN ISOLATION
 * A page wanting 20 co-mounted live worlds exceeds the browser's WebGL context cap
 * BY CONSTRUCTION — browsers cap live contexts (~8–16) and evict the oldest, firing
 * `webglcontextlost` on a canvas still in use, after which `getActiveUniform` can
 * return null and Three's `parseUniform` dereferences it. The runtime now enforces a
 * 4-live-world pool (renderSlots.ts), and this verifier additionally proves the pool
 * HOLDS and HANDS OFF on the all-20 page. Isolation per variant remains: it is the
 * production shape (one live variant per route) and it keeps per-variant evidence
 * free of context contention.
 *
 * ATTRIBUTION NOTE (corrected in round 4, rule 53 sweep): an earlier version of this
 * header blamed the co-mount crash on the software renderer. Round 2 withdrew that
 * attribution — the crash signature is produced by browser context eviction, and the
 * code-side leak+demand fixed in rounds 2–3 is the better-supported cause. No control
 * experiment isolating SwiftShader specifically has been run.
 *
 * The honest signal for "did it draw" is the runtime's presented-frame counter.
 * `readPixels` is deliberately NOT used: under software rendering the back buffer
 * is undefined after compositing, so it reports pure black for scenes that are
 * visibly drawing.
 *
 * Run: node scripts/swan-brain-console/gallery-verify.mjs [baseUrl]
 * Exits non-zero on any failure so it can gate a merge.
 */
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkHarnessIdentity } from './harnessIdentity.mjs';
// The canonical variant ids. ONE definition, shared with `shot-diff.mjs` (round 11): this file
// used to resolve `skeletons.ts` itself, so "the fleet" had two independent answers and a
// change to either could silently disagree with the other.
import { loadFleetIds } from './fleetData.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..');
const require = createRequire(resolve(REPO, 'frontend', 'noop.cjs'));
const { chromium } = require('playwright');

const BASE = process.argv[2] ?? 'http://127.0.0.1:5199/qa-worlds.html';

const results = [];
const pass = (n, d = '') => results.push({ ok: true, n, d });
const fail = (n, d = '') => results.push({ ok: false, n, d });

/**
 * Print every result collected so far, then exit. Also the crash path.
 *
 * A CRASH MUST NOT DESTROY THE EVIDENCE (round 5, 2026-09-19). Results were previously
 * printed only after the whole run, so an uncaught exception anywhere in the 20-variant
 * loop discarded every PASS/FAIL already gathered — measured: a Playwright timeout
 * produced ZERO lines of output, which makes a real regression look like a flake and is
 * how a red gate gets waved through. Now a crash reports what it had.
 */
const reportAndExit = (code) => {
  const failed = results.filter((r) => !r.ok);
  for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.n}${r.d ? `  — ${r.d}` : ''}`);
  console.log(`\n[gallery] ${results.length - failed.length}/${results.length} checks passed`);
  process.exit(code);
};
process.on('uncaughtException', (err) => {
  console.error(`\n[gallery] CRASHED after ${results.length} checks — reporting what was collected:`);
  console.error(`[gallery] ${err?.message ?? err}`);
  reportAndExit(1);
});

const ids = await loadFleetIds();
const browser = await chromium.launch({
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
});

/*
 * IDENTITY BEFORE MEASUREMENT (round 4, 2026-09-19).
 *
 * This script navigates the harness THREE times — the per-variant loop below, the layout pass,
 * and the reduced-motion pass — and checked the identity of its target NONE of the time.
 * Measured: `grep -n "HARNESS_TITLE|title|identity|marker" gallery-verify.mjs` returned no
 * matches, while its sibling `shot-diff.mjs` hard-stops on the same marker and explains why at
 * line 51: in S4, :5199 was owned by a DIFFERENT worktree's dev server, so the run found zero
 * `[data-world]` nodes and reported a confusing selector timeout instead of "you are pointing
 * at the wrong application". The lesson was encoded in the smaller script and never applied to
 * the larger one.
 *
 * The symptom here is worse than a confusing timeout, and it is measured. Pointed at a
 * non-harness page, this script ran for 36 SECONDS and ended in `CRASHED after 1 checks`,
 * reporting a variant-level failure that reads like a rendering regression:
 *
 *     FAIL  v01: animating with real draws  — cards=0 · no canvas · backing store 0x0 ·
 *           zero draw calls · -1 colour token
 *
 * With the gate: 1.5 seconds, and the wrong target named. A reader of the first output would
 * reasonably conclude the fleet had stopped rendering.
 *
 * A PASS/FAIL set recorded against the wrong app is worse than none, because it looks
 * authoritative. So this is a hard stop, before a single variant is measured.
 *
 * (First measurement of this was confounded: it used spawnSync, which blocks on the stdout
 * pipe Chromium inherits and returns empty output on its timeout path. The numbers above are
 * from an A/B against a copy with only this block removed, using the same async spawn the
 * shipped test uses.)
 */
{
  const identityContext = await browser.newContext();
  const identityPage = await identityContext.newPage();
  const identity = await checkHarnessIdentity(identityPage, BASE);
  await identityContext.close();
  if (!identity.ok) {
    fail('harness identity', identity.message);
    await browser.close();
    reportAndExit(1);
  }
}

const digests = [];
try {
  for (const id of ids) {
    // A fresh context per variant: no shared GPU state, no context contention.
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e.message)));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

    await page.goto(`${BASE}?only=${id}`, { waitUntil: 'networkidle', timeout: 90000 });
    await page.waitForTimeout(4000);

    const info = await page.evaluate(() => {
      const card = document.querySelector('[data-world]');
      const world = document.querySelector('[data-world-id]');
      const canvas = document.querySelector('canvas');
      // Live diagnostics come from data attributes the runtime republishes every
      // 250ms. The React-rendered frame count is a frozen snapshot and cannot
      // distinguish an animating scene from a single black first frame.
      return {
        cards: document.querySelectorAll('[data-world]').length,
        hasCanvas: Boolean(canvas),
        w: canvas ? canvas.width : 0,
        h: canvas ? canvas.height : 0,
        motion: world?.getAttribute('data-motion') ?? null,
        live: world?.getAttribute('data-live') === 'yes',
        frames: Number(world?.dataset.frames ?? '0'),
        running: world?.dataset.running ?? 'no',
        onScreen: world?.dataset.onScreen ?? 'no',
        contextLost: world?.dataset.contextLost ?? 'no',
        drawCalls: Number(world?.dataset.drawCalls ?? '0'),
        primitives: Number(world?.dataset.primitives ?? '0'),
        colorFallbacks: Number(world?.dataset.colorFallbacks ?? '-1'),
        sceneError: world?.getAttribute('data-scene-error') || null,
      };
    });

    const problems = [];
    if (info.cards !== 1) problems.push(`cards=${info.cards}`);
    if (!info.hasCanvas) problems.push('no canvas');
    if (!(info.w > 0 && info.h > 0)) problems.push(`backing store ${info.w}x${info.h}`);
    if (info.motion !== 'live') problems.push(`motion=${info.motion}`);
    if (!info.live) problems.push('not live');
    if (info.contextLost === 'yes') problems.push('context lost');
    // The scene must be ANIMATING: many frames, the loop running, and real draws.
    if (info.frames <= 2) problems.push(`only ${info.frames} frames presented`);
    if (info.running !== 'yes') problems.push(`loop stopped (running=${info.running})`);
    if (info.drawCalls <= 0) problems.push('zero draw calls');
    // `drawCalls > 0` alone passes an empty draw, and a STOPPED canvas keeps its last
    // non-zero count. Requiring primitives while the loop runs is the honest assertion
    // (adopted from Fable 5.1's ruling).
    // Triangles + lines + points: a Line/Points scene is 0 triangles but not empty.
    if (info.primitives <= 0) problems.push('zero primitives rendered (empty draw)');
    // A palette that failed to resolve used to be invisible — the scene simply showed
    // house colours. It is counted now, so a broken token surface fails the gate.
    if (info.colorFallbacks !== 0) {
      problems.push(`${info.colorFallbacks} colour token(s) fell back to hardcoded defaults`);
    }
    if (info.sceneError) problems.push(`scene error: ${info.sceneError.slice(0, 120)}`);
    const realErrors = errors.filter((e) => !/favicon|DevTools/i.test(e));
    if (realErrors.length) problems.push(`console: ${realErrors[0].slice(0, 120)}`);

    if (problems.length === 0) {
      pass(`${id}: animating with real draws`,
        `${info.frames} frames · ${info.drawCalls} draws · ${info.primitives} prims · 0 colour fallbacks`);
    } else {
      fail(`${id}: animating with real draws`, problems.join(' · '));
    }

    // A per-variant screenshot digest: proves the twenty do not render the same.
    const buf = await page.locator('[data-world] .frame').screenshot();
    let h = 0;
    for (let i = 0; i < buf.length; i += 97) h = (h * 31 + buf[i]) >>> 0;
    digests.push({ id, bytes: buf.length, hash: h });

    /*
     * LAYOUT OVERLAP GUARD — the repo's most-recurred defect class, finally automated.
     *
     * The rail reserve silently failed TWICE: first the custom properties were declared
     * on a sibling so they never reached the content, then the corrected rules compiled
     * to a descendant selector that could not match the surface element. Both times the
     * code read as correct while the nav sat on top of the headline across 18 nav-model
     * permutations. Nothing in any suite noticed; a human had to measure it.
     *
     * SCOPE IS EDGE-ANCHORED MODELS ONLY. `floating-pill`, `radial-hub` and `orbital`
     * are centred over the content BY DESIGN — a floating pill floating over the hero is
     * the intended composition, not a collision — so asserting non-overlap there would
     * demand the design be wrong. Only the rail models produce geometry that MUST not
     * intersect, because they are edge-anchored and reserve space for exactly that.
     */
    const EDGE_ANCHORED = new Set([
      'vertical-index', 'gutter-index', 'stepper-left',
      'side-rail', 'split-rail', 'progress-spine',
    ]);
    const navModel = await page.evaluate(
      () => document.querySelector('[data-world-id]')?.getAttribute('data-nav-model') ?? '',
    );
    const layout = await page.evaluate(() => {
      const root = document.querySelector('[data-world-id]');
      const nav = root?.querySelector('nav');
      const heading = root?.querySelector('h1');
      const railReserve = root ? getComputedStyle(root).getPropertyValue('--rail-left').trim() : '';
      if (!nav || !heading) return { measured: false, railReserve };
      const n = nav.getBoundingClientRect();
      const t = heading.getBoundingClientRect();
      const intersects = !(n.right <= t.left || n.left >= t.right || n.bottom <= t.top || n.top >= t.bottom);
      return {
        measured: true,
        intersects,
        navRight: Math.round(n.right),
        headingLeft: Math.round(t.left),
        railReserve,
      };
    });
    if (!layout.measured) {
      // `no-nav` genuinely has no nav element; anything else missing one is a fault.
      if (navModel !== 'no-nav') fail(`${id}: layout overlap guard`, `no nav/headline found for model ${navModel}`);
    } else if (layout.intersects && !EDGE_ANCHORED.has(navModel)) {
      pass(`${id}: layout overlap guard`,
        `${navModel} overlaps by design (centred model), nav ends ${layout.navRight}`);
    } else if (layout.intersects) {
      fail(`${id}: layout overlap guard`,
        `edge-anchored ${navModel} overlaps the headline (navRight ${layout.navRight}, headingLeft ${layout.headingLeft}, rail ${layout.railReserve || 'unset'})`);
    } else {
      pass(`${id}: layout overlap guard`, `nav ends ${layout.navRight}, headline starts ${layout.headingLeft}`);
    }

    /*
     * TOKEN-MUTATION PROBE — the assertion that the palette is LIVE, not merely declared.
     *
     * Zero fallbacks is true by construction: the token declarations are generated from
     * the same table the resolver reads, so the count cannot disagree with itself. The
     * round-2 defect was that a token change would move ZERO pixels. This is the test of
     * that defect: mutate `--primary`, re-resolve, and require the colour to FOLLOW.
     */
    const mutation = await page.evaluate(() => {
      const root = document.querySelector('[data-world-id]');
      const before = root?.dataset.primaryResolved ?? '';
      const fn = root?.__resolveColors;
      if (!root || typeof fn !== 'function') return { ran: false };
      root.style.setProperty('--primary', 'rgb(240, 12, 200)');
      fn();
      const after = root.dataset.primaryResolved ?? '';
      root.style.removeProperty('--primary');
      fn();
      const restored = root.dataset.primaryResolved ?? '';
      return { ran: true, before, after, restored };
    });
    if (!mutation.ran) {
      fail(`${id}: token mutation reaches the scene`, 'no re-resolve hook was published by the runtime');
    } else if (mutation.after === mutation.before) {
      fail(`${id}: token mutation reaches the scene`,
        `--primary changed but the resolved colour stayed ${mutation.before} — the palette is inert`);
    } else if (mutation.restored !== mutation.before) {
      fail(`${id}: token mutation reaches the scene`,
        `restore failed: ${mutation.before} -> ${mutation.after} -> ${mutation.restored}`);
    } else {
      pass(`${id}: token mutation reaches the scene`, `${mutation.before} -> ${mutation.after} -> restored`);
    }

    /*
     * HOUSE-RULE ASSERTIONS — rule 2 and rule 7, measured in the browser.
     *
     * These were open for the whole workstream: the house rules say 44px minimum on
     * anything interactive and 4.5:1 minimum text contrast, and until now NOTHING
     * measured either in the browser layer. Fable named the gap in round 3 (§C.8).
     *
     * CONTRAST IS BEST-EFFORT DETERMINISTIC: the effective background is found by
     * walking ancestors for the first opaque background-color and compositing the
     * text's own alpha against it. A scene's gradient or canvas can locally be
     * brighter or darker than the declared surface, so this measures the DECLARED
     * surface — the honest, stable part of the contract — not every pixel behind
     * every glyph.
     */
    const house = await page.evaluate(() => {
      const lum = (r, g, b) => {
        const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
        return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
      };
      const parse = (s) => {
        const m = s.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/);
        return m ? { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] } : null;
      };
      const blend = (fg, bg, a) => ({
        r: fg.r * a + bg.r * (1 - a), g: fg.g * a + bg.g * (1 - a), b: fg.b * a + bg.b * (1 - a), a: 1,
      });
      const effectiveBg = (el) => {
        let n = el;
        while (n && n !== document.documentElement) {
          const c = parse(getComputedStyle(n).backgroundColor);
          if (c && c.a >= 0.9) return c;
          n = n.parentElement;
        }
        return { r: 3, g: 7, b: 18, a: 1 }; // --bg-base fallback
      };
      const contrastOf = (el) => {
        const cs = getComputedStyle(el);
        const fgRaw = parse(cs.color);
        if (!fgRaw) return null;
        const fg = fgRaw.a >= 1 ? fgRaw : blend(fgRaw, effectiveBg(el), fgRaw.a);
        const bg = effectiveBg(el);
        const l1 = lum(fg.r, fg.g, fg.b);
        const l2 = lum(bg.r, bg.g, bg.b);
        const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
        return (hi + 0.05) / (lo + 0.05);
      };
      const root = document.querySelector('[data-world-id]');
      if (!root) return { measured: false };
      const textTargets = [
        ...root.querySelectorAll('h1, p'),
        ...root.querySelectorAll('button, a'),
      ];
      const worst = { ratio: Infinity, tag: '' };
      for (const el of textTargets) {
        const r = contrastOf(el);
        if (r !== null && r < worst.ratio) worst.ratio = r, worst.tag = `${el.tagName.toLowerCase()}:${(el.textContent ?? '').slice(0, 24)}`;
      }
      const controls = [...root.querySelectorAll('button, a')];
      // A 0x0 box is an UNRENDERED control (display:none — v12's no-nav nav), not a
      // small one: it takes no space, cannot be focused, and is outside the a11y
      // tree. Rule 2 governs VISIBLE touch targets, so only rendered boxes count.
      const renderedControls = controls.filter((el) => {
        const b = el.getBoundingClientRect();
        return !(b.width === 0 && b.height === 0);
      });
      const smallest = renderedControls.reduce(
        (m, el) => {
          const b = el.getBoundingClientRect();
          return Math.min(m, b.width, b.height);
        },
        Infinity,
      );
      return {
        measured: true,
        worstRatio: worst.ratio,
        worstTag: worst.tag,
        smallestControl: smallest,
        renderedControls: renderedControls.length,
      };
    });
    if (!house.measured) {
      fail(`${id}: house rules — text contrast`, 'no world surface found');
    } else if (house.worstRatio < 4.5) {
      fail(`${id}: house rules — text contrast`,
        `worst ${house.worstRatio.toFixed(2)}:1 on ${house.worstTag} (rule 7 wants >= 4.5:1)`);
    } else {
      pass(`${id}: house rules — text contrast`,
        `worst ${house.worstRatio.toFixed(2)}:1 (${house.worstTag})`);
    }
    if (!house.measured) {
      fail(`${id}: house rules — 44px controls`, 'no world surface found');
    } else if (house.smallestControl < 44) {
      fail(`${id}: house rules — 44px controls`,
        `smallest control is ${Math.round(house.smallestControl)}px (rule 2 wants >= 44px)`);
    } else {
      pass(`${id}: house rules — 44px controls`, `smallest control ${Math.round(house.smallestControl)}px`);
    }

    if (id === ids[0]) {
      await page.screenshot({ path: resolve(REPO, '.qa/gallery-v01.png') });
    }
    if (id === 'v18') {
      await page.screenshot({ path: resolve(REPO, '.qa/gallery-v18-wildcard.png') });
    }

    await context.close();
  }

  // Distinctness across the twenty isolated renders.
  const unique = new Set(digests.map((d) => `${d.bytes}:${d.hash}`)).size;
  unique === ids.length
    ? pass('fleet: all 20 render distinctly', `${unique}/20 unique screenshot digests`)
    : fail('fleet: all 20 render distinctly', `${unique}/20 unique — collisions: ${
      digests.filter((d, i) => digests.findIndex((o) => `${o.bytes}:${o.hash}` === `${d.bytes}:${d.hash}`) !== i)
        .map((d) => d.id).join(', ')}`);

  // Layout pass: all twenty together, checking they coexist and each shows a poster
  // or canvas. Rendering correctness was already proven per variant above.
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 120000 });
  await page.waitForTimeout(2000);
  const layout = await page.evaluate(() => {
    const cards = document.querySelectorAll('[data-world]');
    const tuples = new Set();
    let withVisual = 0;
    for (const c of cards) {
      const w = c.querySelector('[data-world-id]');
      if (w && (c.querySelector('canvas') || c.querySelector('[aria-hidden="true"]'))) withVisual += 1;
      const t = [w?.getAttribute('data-nav-model'), w?.getAttribute('data-hero-mechanics'), w?.getAttribute('data-grid')].join('|');
      tuples.add(t);
    }
    return { cards: cards.length, withVisual, uniqueTuples: tuples.size };
  });
  layout.cards === 20
    ? pass('layout: 20 cards coexist on one page', String(layout.cards))
    : fail('layout: 20 cards coexist on one page', String(layout.cards));
  layout.withVisual === 20
    ? pass('layout: every card shows a canvas or its poster')
    : fail('layout: every card shows a canvas or its poster', `${layout.withVisual}/20`);
  layout.uniqueTuples === 20
    ? pass('layout: all 20 divergence tuples are unique on screen', String(layout.uniqueTuples))
    : fail('layout: all 20 divergence tuples are unique on screen', String(layout.uniqueTuples));

  /*
   * CONTEXT BUDGET — the design that made a crash look like a renderer mystery.
   *
   * Browsers cap live WebGL contexts (~8-16 in Chrome) and evict the oldest, firing
   * webglcontextlost on a canvas still in use. Twenty co-mounted variants exceed that
   * cap BY CONSTRUCTION, so a page asking for all twenty was always going to lose
   * contexts. The pool caps live worlds; these assertions prove the cap holds AND
   * that the DOM tells the same story: since the runtime creates one canvas per
   * slot-holding world, the number of <canvas> elements must equal the number of
   * live worlds (round 4 — before the hand-off existed, 20 canvases sat in the DOM
   * while only the first 4 mounted worlds ever animated).
   */
  const pool = await page.evaluate(() => ({
    live: Number(document.documentElement.dataset.liveWorlds ?? '-1'),
    cap: Number(document.documentElement.dataset.liveWorldCap ?? '-1'),
    canvases: document.querySelectorAll('canvas').length,
    liveIds: [...document.querySelectorAll('[data-world-id][data-live="yes"]')]
      .map((n) => n.getAttribute('data-world-id')),
  }));
  if (pool.cap <= 0) {
    fail('context budget: live worlds stay under the cap', 'the pool published no cap');
  } else if (pool.live > pool.cap) {
    fail('context budget: live worlds stay under the cap', `${pool.live} live > cap ${pool.cap}`);
  } else {
    pass('context budget: live worlds stay under the cap',
      `${pool.live} live / cap ${pool.cap} at scroll 0`);
  }
  if (pool.cap > 0 && pool.canvases === pool.live && pool.live <= pool.cap) {
    pass('context budget: DOM canvas count equals live worlds',
      `${pool.canvases} canvases == ${pool.live} live (one per slot holder)`);
  } else if (pool.cap > 0) {
    fail('context budget: DOM canvas count equals live worlds',
      `${pool.canvases} canvases vs ${pool.live} live — a canvas without a slot is a dead context waiting to be evicted`);
  }

  /*
   * SLOT HAND-OFF — the round-4 finding. The receipt CLAIMED "off-screen scenes hand
   * their slot to the ones you're looking at" since round 3, but nothing implemented
   * it: the first four worlds mounted held their slots forever, so worlds 5-20 showed
   * posters even while on screen. The honest contract is not about ONE variant (which
   * one wins a freed slot is scheduler order): it is that (a) the cap still holds,
   * (b) the set of live worlds CHANGED when the viewport moved — slots travel, and
   * (c) every live world is one the reader can actually SEE — no off-screen world
   * may hold a slot.
   */
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(3000);
  const handoff = await page.evaluate(() => ({
    live: Number(document.documentElement.dataset.liveWorlds ?? '-1'),
    cap: Number(document.documentElement.dataset.liveWorldCap ?? '-1'),
    liveIds: [...document.querySelectorAll('[data-world-id][data-live="yes"]')]
      .map((n) => n.getAttribute('data-world-id')),
    worlds: [...document.querySelectorAll('[data-world-id]')].map((n) => ({
      id: n.getAttribute('data-world-id'),
      live: n.getAttribute('data-live') === 'yes',
      onScreen: n.dataset.onScreen === 'yes',
      running: n.dataset.running === 'yes',
      frames: Number(n.dataset.frames ?? '0'),
    })),
  }));
  const liveWorlds = handoff.worlds.filter((w) => w.live);
  const topSet = new Set(pool.liveIds);
  const moved = handoff.liveIds.some((x) => !topSet.has(x));
  const offScreenHolders = liveWorlds.filter((w) => !w.onScreen);
  if (handoff.cap <= 0) {
    fail('context budget: slots hand off to newly visible worlds', 'the pool published no cap');
  } else if (handoff.live > handoff.cap) {
    fail('context budget: slots hand off to newly visible worlds',
      `cap broken at scroll-bottom: ${handoff.live} live > ${handoff.cap}`);
  } else if (!moved) {
    fail('context budget: slots hand off to newly visible worlds',
      `live set unchanged after scrolling (${[...topSet].join(',')} ) — slots never travel`);
  } else if (offScreenHolders.length > 0) {
    fail('context budget: slots hand off to newly visible worlds',
      `off-screen worlds hold slots: ${offScreenHolders.map((w) => w.id).join(', ')}`);
  } else if (liveWorlds.some((w) => w.frames <= 2)) {
    fail('context budget: slots hand off to newly visible worlds',
      `a live world has not presented frames: ${liveWorlds.filter((w) => w.frames <= 2).map((w) => w.id).join(', ')}`);
  } else {
    pass('context budget: slots hand off to newly visible worlds',
      `live set moved to on-screen worlds (${handoff.liveIds.join(', ')}), ${handoff.live}/${handoff.cap} slots held`);
  }

  /*
   * TORN-DOWN TELEMETRY — a world with no context must not advertise one.
   *
   * The poster path already obeys this rule: the reduced-motion check below asserts a
   * frozen world reports 0 frames. The hand-off path did not. Teardown removes the canvas
   * and stops the loop, but the diagnostics timer was merely CANCELLED, so the last
   * published attributes froze on the element — a handed-off world kept reporting
   * `frames=131` and `running=yes` while holding no <canvas> at all (measured
   * reproducibly over three runs, 2026-09-19).
   *
   * This matters more than a stale number. `data-frames` is the only rendering signal the
   * fleet publishes, and `data-running` is the attribute a reader trusts to mean "this is
   * animating". A dead world claiming to run is the false telemetry the diagnostics
   * contract exists to prevent — the same class as the frame counter that keeps climbing
   * on a dead scene (loop.ts:9-10).
   *
   * The dead-set must be non-empty, or the check would pass on a page where nothing was
   * ever handed off — a guard that cannot fail.
   */
  const dead = handoff.worlds.filter((w) => !w.live);
  const lying = dead.filter((w) => w.frames > 0 || w.running);
  if (dead.length === 0) {
    fail('context budget: a torn-down world reports no live context',
      'no torn-down world on the page, so this check proved nothing');
  } else if (lying.length > 0) {
    fail('context budget: a torn-down world reports no live context',
      `${lying.length}/${dead.length} torn-down worlds still advertise a context: ` +
      lying.map((w) => `${w.id}(frames=${w.frames}, running=${w.running})`).join(', '));
  } else {
    pass('context budget: a torn-down world reports no live context',
      `${dead.length} torn-down worlds all report frames=0, running=no`);
  }

  /*
   * REDUCED-MOTION FREEZE — the rule-3 floor, measured in the browser. The unit
   * suite proves resolveMotion returns poster when prefers-reduced-motion is set;
   * this proves the BROWSER honours it end to end: motion poster, no canvas element
   * mounted at all (the runtime must never create a context for this user), and the
   * explanatory static note visible.
   */
  for (const id of ['v01', 'v18']) {
    const rmContext = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      reducedMotion: 'reduce',
    });
    const rmPage = await rmContext.newPage();
    await rmPage.goto(`${BASE}?only=${id}`, { waitUntil: 'networkidle', timeout: 90000 });
    await rmPage.waitForTimeout(1200);
    const rm = await rmPage.evaluate(() => {
      const world = document.querySelector('[data-world-id]');
      return {
        motion: world?.getAttribute('data-motion') ?? null,
        live: world?.getAttribute('data-live') ?? null,
        frames: Number(world?.dataset.frames ?? '0'),
        canvases: document.querySelectorAll('canvas').length,
        note: document.querySelector('p')?.textContent ?? '',
        posterPresent: Boolean(document.querySelector('[data-world-id] [aria-hidden="true"]')),
      };
    });
    const rmProblems = [];
    if (rm.motion !== 'poster') rmProblems.push(`motion=${rm.motion}`);
    if (rm.live !== 'no') rmProblems.push(`live=${rm.live}`);
    if (rm.frames !== 0) rmProblems.push(`${rm.frames} frames presented`);
    if (rm.canvases !== 0) rmProblems.push(`${rm.canvases} canvas mounted`);
    if (!rm.posterPresent) rmProblems.push('no poster rendered');
    if (rmProblems.length === 0) {
      pass(`${id}: reduced-motion freezes to the poster`, 'motion=poster, 0 canvases, 0 frames');
    } else {
      fail(`${id}: reduced-motion freezes to the poster`, rmProblems.join(' · '));
    }
    await rmContext.close();
  }

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: resolve(REPO, '.qa/gallery-all-top.png') });
  await page.evaluate(() => window.scrollTo(0, 2200));
  await page.waitForTimeout(800);
  await page.screenshot({ path: resolve(REPO, '.qa/gallery-all-mid.png') });
  await context.close();
} finally {
  await browser.close();
}

reportAndExit(results.some((r) => !r.ok) ? 1 : 0);

/**
 * Verify the SwanMark3D *component* in real headless Chromium.
 *
 * Checks, in order:
 *   1. every slot reaches mode=live (the dynamic import landed, WebGL came up)
 *   2. the backing store matches the documented sizing policy
 *   3. no console errors or warnings
 *   4. one screenshot per slot, so size_fidelity_component.py can compare the
 *      component's actual output against the PNG the app ships today
 *
 * Usage:  node shoot-component.mjs
 */
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../../../../../');
const require = createRequire(path.join(root, 'frontend', 'package.json'));
const puppeteer = require('puppeteer');

const pageUrl = pathToFileURL(path.join(here, 'component.html')).href;
const out = path.join(here, '..');

const args = new Set(process.argv.slice(2));
// --sweep renders the ladder under several sizing policies into
// shot-comp-<label>-<n>.png. The Python proxy downscales with LANCZOS, which does
// NOT model what Chrome does to a canvas, so the policy has to be chosen here.
//
//   native     backing == css px exactly (no supersample, no floor)
//   floor128   ss=1 but never below 128 device px
//   ss2        backing == css * 2, floored at 128
//   ss4        backing == css * 4, floored at 128  (the original default)
//   ss2nof     backing == css * 2, NO floor - tests the hypothesis that what
//              matters is the downscale RATIO, not the absolute resolution
//   ss3nof     backing == css * 3, NO floor
//   ss4nof     backing == css * 4, NO floor
const sweep = args.has('--sweep');
// The device pixel ratio is a first-class variable here, not a constant. The
// fallback <img> is resampled by the browser from whatever the asset is to
// css * dpr device px, so an asset that is fine at dpr 1 can be UPSCALED - and
// therefore soft - on a retina display. `--dpr=2` closes that gap.
const dprArg = [...args].find((a) => a.startsWith('--dpr='));
const DPR = dprArg ? Number(dprArg.split('=')[1]) : 1;
const CONFIGS = sweep
  ? [
      { label: 'native', ss: 1, minb: 1 },
      { label: 'ss2nof', ss: 2, minb: 1 },
      { label: 'ss4nof', ss: 4, minb: 1 },
      { label: 'ss2hi', ss: 2, minb: 1, ir: 'high-quality' },
      { label: 'ss4hi', ss: 4, minb: 1, ir: 'high-quality' },
      { label: 'ss8hi', ss: 8, minb: 1, ir: 'high-quality' },
      { label: 'ss16hi', ss: 16, minb: 1, ir: 'high-quality' },
      { label: 'ss2px', ss: 2, minb: 1, ir: 'pixelated' },
      { label: 'ss4px', ss: 4, minb: 1, ir: 'pixelated' },
    ]
  : [{ label: 'default', ss: 2, minb: 1 }]; // the component's own defaults

const browser = await puppeteer.launch({
  headless: 'new',
  args: [
    '--enable-unsafe-swiftshader',
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--disable-gpu-sandbox',
    '--no-sandbox',
    '--hide-scrollbars',
  ],
});

let failed = false;

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 400, deviceScaleFactor: DPR });

  // --nogl breaks WebGL before any script runs, to exercise the fallback the
  // component is supposed to fall back to. A logo must never break the header,
  // and that path was otherwise never tested.
  if (args.has('--nogl')) {
    await page.evaluateOnNewDocument(() => {
      const real = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
        if (String(type).indexOf('webgl') === 0) return null;
        return real.call(this, type, ...rest);
      };
    });
    console.log('--- WebGL disabled for this run ---');
  }

  const problems = [];
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') problems.push(`${m.type()}: ${m.text()}`);
  });
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));

  await page.goto(pageUrl, { waitUntil: 'load' });
  await page.waitForFunction('window.__ready === true', { timeout: 40000 });

  // --- WebGL-absent path ---------------------------------------------------
  // Every slot must settle on 'fallback' and the PNG must be visible, because the
  // header must not break on a machine without WebGL.
  if (args.has('--nogl')) {
    const info = await page.evaluate(() => window.__component());
    const stillLive = info.filter((r) => r.mode === 'live');
    const fallback = info.filter((r) => r.mode === 'fallback');
    console.log(`slots: ${fallback.length} fallback, ${stillLive.length} live`);
    if (stillLive.length) {
      console.log('FAIL: a slot went live even though WebGL was disabled');
      failed = true;
    }
    if (fallback.length !== info.length) {
      console.log('FAIL: not every slot fell back');
      failed = true;
    } else {
      console.log('ok: every slot fell back');
    }

    const imgs = await page.evaluate(() =>
      Array.from(document.querySelectorAll('[data-size]')).map((el) => {
        const img = el.querySelector('img');
        if (!img) return { size: Number(el.dataset.size), img: false };
        const r = img.getBoundingClientRect();
        return {
          size: Number(el.dataset.size),
          img: true,
          natural: img.naturalWidth,
          w: Math.round(r.width),
          h: Math.round(r.height),
          visible: getComputedStyle(img).display !== 'none',
        };
      }),
    );
    for (const i of imgs) {
      const ok = i.img && i.natural > 0 && i.w === i.size && i.h === i.size && i.visible;
      if (!ok) failed = true;
      console.log(
        `  ${ok ? 'ok  ' : 'FAIL'} css ${String(i.size).padStart(3)}px -> ` +
          `fallback img ${i.w}x${i.h} natural=${i.natural ?? 0} visible=${i.visible ?? false}`,
      );
    }
    await page.screenshot({ path: path.join(out, 'shot-comp-nogl-fullpage.png'), fullPage: true });

    // Same integer boxes as the live path, so the fallback can be MEASURED and not
    // merely eyeballed. Without this the --nogl run only ever proved the PNG was
    // visible, never that it was correct - and `fallback_asset_audit.py` needs the
    // boxes to score the fallback against the same LANCZOS reference.
    //
    // Boxes are in CSS px; `dpr` is recorded alongside because a full-page
    // screenshot at deviceScaleFactor N is N times larger, so a consumer cropping
    // the image has to scale by it. At dpr 1 nothing changes.
    const noglBoxes = (
      await page.evaluate(() =>
        Array.from(document.querySelectorAll('[data-size]')).map((el) => {
          const r = el.getBoundingClientRect();
          return {
            size: Number(el.dataset.size),
            x: Math.round(r.x + window.scrollX),
            y: Math.round(r.y + window.scrollY),
            w: Math.round(r.width),
            h: Math.round(r.height),
          };
        }),
      )
    ).map((b) => ({ ...b, dpr: DPR }));
    fs.writeFileSync(
      path.join(out, 'shot-comp-nogl-boxes.json'),
      JSON.stringify(noglBoxes, null, 2),
    );

    console.log('wrote shot-comp-nogl-fullpage.png + shot-comp-nogl-boxes.json');
    console.log('');
    console.log(problems.length ? '--- diagnostics ---' : 'no console errors or warnings');
    for (const p of [...new Set(problems)].slice(0, 20)) console.log(' ', p);
    console.log(failed ? '\nRESULT: FAIL' : '\nRESULT: PASS');
    process.exit(failed ? 1 : 0);
  }

  for (const cfg of CONFIGS) {
    if (sweep) {
      const q = `ss=${cfg.ss}&minb=${cfg.minb}${cfg.ir ? `&ir=${cfg.ir}` : ''}`;
      await page.goto(`${pageUrl}?${q}`, { waitUntil: 'load' });
      await page.waitForFunction('window.__ready === true', { timeout: 40000 });
    }

    const info = await page.evaluate(() => window.__component());
    console.log(`--- ${cfg.label} (ss=${cfg.ss}, minBacking=${cfg.minb}${cfg.ir ? `, image-rendering=${cfg.ir}` : ''}) ---`);
    for (const row of info) console.log(' ', JSON.stringify(row));

    const notLive = info.filter((r) => r.mode !== 'live');
    if (notLive.length) {
      console.log(`FAIL: ${notLive.length} slot(s) never went live:`, JSON.stringify(notLive));
      failed = true;
    } else {
      console.log('ok: all slots live');
    }

    // Sizing policy from swanMarkScene.ts:
    //   displayed backing = round(css * min(dpr, maxPixelRatio=2))
    //   GL backing        = clamp(displayed * ss, min, max)
    const effDpr = Math.min(DPR, 2);
    const expectedDisplay = (n) => Math.max(1, Math.round(n * effDpr));
    const expectedGl = (n) =>
      Math.max(cfg.minb, Math.min(1024, Math.round(expectedDisplay(n) * cfg.ss)));
    console.log(`--- backing stores vs policy (displayed / GL) at dpr=${effDpr} ---`);
    for (const row of info) {
      const wantD = `${expectedDisplay(row.size)}x${expectedDisplay(row.size)}`;
      const wantG = `${expectedGl(row.size)}x${expectedGl(row.size)}`;
      const okD = row.backing === wantD;
      const okG = row.glBacking === wantG;
      if (!okD || !okG) failed = true;
      console.log(
        `  ${okD && okG ? 'ok  ' : 'FAIL'} css ${String(row.size).padStart(3)}px -> ` +
          `display ${String(row.backing).padEnd(9)} (want ${wantD.padEnd(9)})  ` +
          `gl ${String(row.glBacking).padEnd(9)} (want ${wantG})`,
      );
    }

    // REGRESSION GUARD: the canvas must sit exactly on its container's box.
    //
    // The Frame was `display: inline-block` without `vertical-align: top`, so it
    // was baseline-aligned in its parent's line box. When the mark was SHORTER
    // than the parent's line strut the descender pushed it down: measured at 16px
    // the canvas was at y=129 while its box was at y=128. Larger sizes escaped it
    // only because they were taller than the strut. This asserts the offset is 0
    // at every size, so the class of bug cannot come back unnoticed.
    console.log('--- geometry: canvas must sit exactly on its container box ---');
    const geom = await page.evaluate(() =>
      Array.from(document.querySelectorAll('[data-size]')).map((el) => {
        const slot = el.getBoundingClientRect();
        const cv = el.querySelector('canvas')?.getBoundingClientRect();
        if (!cv) return { size: Number(el.dataset.size), missing: true };
        return {
          size: Number(el.dataset.size),
          offX: cv.x - slot.x,
          offY: cv.y - slot.y,
          dw: cv.width - slot.width,
          dh: cv.height - slot.height,
        };
      }),
    );
    for (const g of geom) {
      if (g.missing) {
        console.log(`  FAIL css ${g.size}px -> no canvas`);
        failed = true;
        continue;
      }
      const aligned =
        Math.abs(g.offX) < 0.01 && Math.abs(g.offY) < 0.01 &&
        Math.abs(g.dw) < 0.01 && Math.abs(g.dh) < 0.01;
      if (!aligned) failed = true;
      console.log(
        `  ${aligned ? 'ok  ' : 'FAIL'} css ${String(g.size).padStart(3)}px -> ` +
          `offset (${g.offX}, ${g.offY})  size delta (${g.dw}, ${g.dh})`,
      );
    }

    console.log('--- per-slot screenshots ---');
    // Element screenshots are kept for eyeballing, but they are NOT used for
    // measurement: at small sizes elementHandle.screenshot() can clip one row
    // off, which is 6% of a 16px image and swamps the metric. Measurement uses
    // the full-page snapshot + integer boxes below instead.
    for (const row of info) {
      const el = await page.$(`#slot-${row.size}`);
      if (!el) {
        console.log(`  FAIL: #slot-${row.size} not found`);
        failed = true;
        continue;
      }
      const name = sweep
        ? `shot-comp-${cfg.label}-${row.size}.png`
        : `shot-comp-${row.size}.png`;
      await el.screenshot({ path: path.join(out, name) });
    }
    console.log(`  wrote ${info.length} element screenshots (eyeball only)`);

    // Authoritative capture: one full-page snapshot, plus the integer bounding
    // boxes so Python can crop without any per-element rounding.
    const tag = sweep ? cfg.label : 'default';
    const fullName = `shot-comp-${tag}-fullpage.png`;
    await page.screenshot({ path: path.join(out, fullName), fullPage: true });

    const boxes = (
      await page.evaluate(() =>
        Array.from(document.querySelectorAll('[data-size]')).map((el) => {
          const r = el.getBoundingClientRect();
          return {
            size: Number(el.dataset.size),
            x: Math.round(r.x + window.scrollX),
            y: Math.round(r.y + window.scrollY),
            w: Math.round(r.width),
            h: Math.round(r.height),
          };
        }),
      )
    ).map((b) => ({ ...b, dpr: DPR }));
    fs.writeFileSync(
      path.join(out, `shot-comp-${tag}-boxes.json`),
      JSON.stringify(boxes, null, 2),
    );
    console.log(`  wrote ${fullName} + shot-comp-${tag}-boxes.json`);

    const rowShot = path.join(
      out,
      sweep ? `shot-comp-ladder-${cfg.label}.png` : 'shot-comp-ladder.png',
    );
    const ladder = await page.$('#ladder');
    if (ladder) {
      await ladder.screenshot({ path: rowShot });
      console.log(`  wrote ${path.basename(rowShot)}`);
    }
  }

  console.log('');
  if (problems.length) {
    console.log('--- page diagnostics ---');
    for (const p of [...new Set(problems)].slice(0, 25)) console.log(' ', p);
    failed = true;
  } else {
    console.log('no console errors or warnings');
  }
} finally {
  await browser.close();
}

console.log(failed ? '\nRESULT: FAIL' : '\nRESULT: PASS');
process.exit(failed ? 1 : 0);

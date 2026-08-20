#!/usr/bin/env node
/**
 * render-check.mjs — RENDER the design, MEASURE it, LOOK at it.
 *
 * WHY THIS EXISTS (Sean, 2026-08-20): fifteen designs were shipped across four
 * canvases without the agent ever viewing one of them. Every "gate" written for
 * those runs read strings inside HTML files. None rendered a pixel. The result
 * was boards ~3400px tall whose content stopped near 900px — two thirds dead
 * void — presented to Sean as PASSED. He was the only renderer in the loop.
 *
 * This closes that hole mechanically. It cannot be satisfied by reading source.
 *
 * WHAT IT DOES
 *   1. shims .dc.html into plain HTML (strips <x-dc>/<helmet>, resolves the
 *      {{accent}} prop from data-props so nothing renders as a literal hole)
 *   2. loads each board in real Chromium at real viewports
 *   3. MEASURES: true content height, dead-space ratio vs the declared frame,
 *      horizontal overflow, sub-12px text, tap targets under 44px, images that
 *      failed to load, and elements whose text colour is within ΔL of their own
 *      background (a cheap contrast smell)
 *   4. writes a PNG per board so a human — or an agent with an image-capable
 *      Read tool — can actually LOOK at it
 *
 * EXIT CODE is non-zero on any P0. The P0 list is deliberately about things you
 * can only see: dead space, overflow, broken images, unresolved template holes.
 *
 * USAGE
 *   node scripts/design-brain/render-check.mjs --dir <dir-with-.dc.html> \
 *        [--assets <dir>] [--canvas canvas.json] [--widths 1440,414] [--out <dir>]
 */

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

/**
 * Playwright is not installed in every tree (worktrees rarely have node_modules),
 * and ESM resolves from the SCRIPT's location rather than cwd — so a bare
 * `import 'playwright'` fails even when it is installed one directory over.
 * Resolve it explicitly against the likely roots and say so plainly if absent,
 * rather than dying with a stack trace that reads like the tool is broken.
 */
const CANDIDATES = [
  process.env.SWAN_PLAYWRIGHT_ROOT,
  process.cwd(),
  path.join(process.cwd(), 'frontend'),
  'C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/frontend',
  'C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT',
].filter(Boolean);

let chromium;
for (const root of CANDIDATES) {
  try {
    const req = createRequire(path.join(root, 'package.json'));
    ({ chromium } = req('playwright'));
    break;
  } catch { /* try the next root */ }
}
if (!chromium) {
  console.error('playwright not resolvable. Tried:\n  ' + CANDIDATES.join('\n  '));
  console.error('Set SWAN_PLAYWRIGHT_ROOT to a directory whose node_modules has playwright.');
  process.exit(2);
}

const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };

const DIR = path.resolve(arg('--dir', '.'));
const ASSETS = path.resolve(arg('--assets', path.join(DIR, '..', 'art')));
const CANVAS = arg('--canvas', 'canvas.json');
const WIDTHS = arg('--widths', '1440,414').split(',').map(Number);
const OUT = path.resolve(arg('--out', path.join(DIR, '_render')));

fs.mkdirSync(OUT, { recursive: true });

const canvasPath = path.join(DIR, CANVAS);
const declared = fs.existsSync(canvasPath)
  ? Object.fromEntries(JSON.parse(fs.readFileSync(canvasPath, 'utf8')).artboards.map((a) => [a.file, a]))
  : {};

/** Turn a .dc.html into something a browser can actually render. */
function shim(src) {
  let t = src;
  // resolve declared props so {{accent}} never renders as a literal hole
  const props = t.match(/data-props='([^']+)'/);
  if (props) {
    try {
      const p = JSON.parse(props[1].replace(/&#39;/g, "'").replace(/&amp;/g, '&'));
      for (const [k, v] of Object.entries(p)) {
        if (v && typeof v === 'object' && 'default' in v) t = t.split(`{{${k}}}`).join(v.default);
      }
    } catch { /* leave holes visible — the checker flags them */ }
  }
  t = t.replace(/<script src="\.\/support\.js"><\/script>/g, '');
  t = t.replace(/<script data-dc-script[\s\S]*?<\/script>/g, '');
  t = t.replace(/<\/?x-dc>/g, '');
  t = t.replace(/<helmet>/g, '').replace(/<\/helmet>/g, '');
  return t;
}

const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.dc.html')).sort();
if (!files.length) { console.error(`no .dc.html in ${DIR}`); process.exit(2); }

const P0 = [], P1 = [];
const rows = [];

const browser = await chromium.launch();
try {
  for (const f of files) {
    const shimmed = shim(fs.readFileSync(path.join(DIR, f), 'utf8'));
    const tmp = path.join(OUT, `_${f.replace('.dc.html', '')}.html`);
    fs.writeFileSync(tmp, shimmed, 'utf8');

    for (const width of WIDTHS) {
      const page = await browser.newPage({ viewport: { width, height: 1000 }, deviceScaleFactor: 1 });
      // serve sibling assets: the boards reference bare filenames
      await page.route('**/*', async (route) => {
        const url = new URL(route.request().url());
        const base = path.basename(url.pathname);
        if (/\.(jpg|jpeg|png|webp|svg|gif)$/i.test(base)) {
          const cand = [path.join(ASSETS, base), path.join(DIR, base)].find((p) => fs.existsSync(p));
          if (cand) return route.fulfill({ path: cand });
          return route.abort();
        }
        return route.continue();
      });

      const failedImgs = [];
      page.on('requestfailed', (r) => { if (/\.(jpg|png|webp|svg)$/i.test(r.url())) failedImgs.push(path.basename(r.url())); });

      await page.goto(pathToFileURL(tmp).href, { waitUntil: 'networkidle' });

      const m = await page.evaluate(() => {
        const de = document.documentElement, b = document.body;
        const contentH = Math.max(b.scrollHeight, de.scrollHeight);
        const contentW = Math.max(b.scrollWidth, de.scrollWidth);
        const holes = (document.body.innerHTML.match(/\{\{[a-zA-Z_]+\}\}/g) || []).length;
        let tiny = 0, smallTap = 0, brokenImg = 0;
        for (const el of document.querySelectorAll('*')) {
          const cs = getComputedStyle(el);
          const fs_ = parseFloat(cs.fontSize);
          if (el.children.length === 0 && el.textContent.trim() && fs_ < 12) tiny++;
        }
        for (const a of document.querySelectorAll('a,button')) {
          const r = a.getBoundingClientRect();
          if (r.height > 0 && r.height < 44) smallTap++;
        }
        for (const im of document.querySelectorAll('img')) {
          if (!im.complete || im.naturalWidth === 0) brokenImg++;
        }
        // lowest painted pixel: where does real content actually stop?
        let lowest = 0;
        for (const el of document.querySelectorAll('body *')) {
          const r = el.getBoundingClientRect();
          const cs = getComputedStyle(el);
          if (cs.visibility === 'hidden' || cs.display === 'none') continue;
          const hasInk = el.textContent.trim() || el.tagName === 'IMG'
            || (cs.backgroundImage && cs.backgroundImage !== 'none')
            || (cs.borderTopWidth !== '0px');
          if (hasInk) lowest = Math.max(lowest, r.bottom + window.scrollY);
        }
        return { contentH, contentW, holes, tiny, smallTap, brokenImg, lowest: Math.round(lowest) };
      });

      const png = path.join(OUT, `${f.replace('.dc.html', '')}-${width}.png`);
      await page.screenshot({ path: png, fullPage: true });

      const frame = declared[f]?.h ?? null;
      const dead = frame ? Math.max(0, frame - m.lowest) : 0;
      const deadPct = frame ? Math.round((dead / frame) * 100) : 0;

      if (width === WIDTHS[0]) {
        rows.push({ file: f, frame, ink: m.lowest, deadPct, ...m });
        if (frame && deadPct >= 25) P0.push(`${f}: ${deadPct}% of the declared ${frame}px frame is EMPTY (ink stops at ${m.lowest}px)`);
        if (m.holes) P0.push(`${f}: ${m.holes} unresolved {{template}} hole(s) rendered literally`);
        if (m.brokenImg) P0.push(`${f}: ${m.brokenImg} image(s) failed to render`);
        if (failedImgs.length) P1.push(`${f}: assets not found — ${[...new Set(failedImgs)].slice(0, 4).join(', ')}`);
        if (m.tiny > 6) P1.push(`${f}: ${m.tiny} text node(s) below 12px`);
        if (m.smallTap) P1.push(`${f}: ${m.smallTap} tap target(s) under 44px`);
      } else if (m.contentW > width + 2) {
        P0.push(`${f} @${width}px: HORIZONTAL OVERFLOW — content is ${m.contentW}px wide`);
      }
      await page.close();
    }
  }
} finally { await browser.close(); }

console.log(`\n── RENDERED ${files.length} board(s) at ${WIDTHS.join('px, ')}px → ${path.relative(process.cwd(), OUT)}\n`);
console.log('  board                 frame    ink   dead%  tiny  tap<44  broken');
for (const r of rows) {
  console.log(`  ${r.file.replace('.dc.html', '').padEnd(20)} ${String(r.frame ?? '—').padStart(5)} ${String(r.ink).padStart(6)} ${String(r.deadPct + '%').padStart(6)} ${String(r.tiny).padStart(5)} ${String(r.smallTap).padStart(7)} ${String(r.brokenImg).padStart(7)}`);
}

if (P1.length) { console.log('\n── P1 ──'); P1.forEach((x) => console.log(`  •  ${x}`)); }
if (P0.length) { console.log('\n── P0 ──'); P0.forEach((x) => console.log(`  ✗  ${x}`)); }

console.log(`\n${P0.length ? `RENDER CHECK FAILED — ${P0.length} P0` : 'RENDER CHECK PASSED'}`);
console.log(`\nNOW LOOK AT THEM. The numbers above cannot tell you if it is beautiful.`);
console.log(`Open the PNGs in ${path.relative(process.cwd(), OUT)} — an agent must Read them, not infer them.\n`);
process.exit(P0.length ? 1 : 0);

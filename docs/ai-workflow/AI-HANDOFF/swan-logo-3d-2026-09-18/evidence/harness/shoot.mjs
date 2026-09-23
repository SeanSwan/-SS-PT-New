/**
 * Render the swan mark in real headless Chromium and write PNGs.
 *
 * This is the gate that matters: the Python rasteriser is only a proxy, and the
 * deliverable is what a browser actually draws.
 *
 *   node shoot.mjs                 -> front view at 1024 (the fidelity gate)
 *   node shoot.mjs --sizes         -> the responsive ladder
 *   node shoot.mjs --super         -> each ladder size rendered at 4x, so
 *                                     size_fidelity.py can compare a genuinely
 *                                     supersampled render against a native one
 *   node shoot.mjs --turntable     -> 8 yaw steps, to prove it is a 3D object
 */
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../../../../../');
const require = createRequire(path.join(root, 'frontend', 'package.json'));
const puppeteer = require('puppeteer');

const pageUrl = pathToFileURL(path.join(here, 'index.html')).href;
const out = path.join(here, '..');

const args = new Set(process.argv.slice(2));

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

try {
  const page = await browser.newPage();
  const problems = [];
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') problems.push(`${m.type()}: ${m.text()}`);
  });
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));

  await page.goto(pageUrl, { waitUntil: 'load' });
  await page.waitForFunction('window.__ready === true', { timeout: 30000 });

  const info = await page.evaluate(() => ({
    name: window.__swan.specName,
    version: window.__swan.specVersion,
    facets: window.__swan.facets,
    triangles: window.__swan.triangles,
    renderer: (() => {
      const c = document.getElementById('c');
      const gl = c.getContext('webgl2') || c.getContext('webgl');
      if (!gl) return 'NO WEBGL';
      const d = gl.getExtension('WEBGL_debug_renderer_info');
      return d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : 'unknown';
    })(),
  }));
  console.log('spec          :', info.name, 'v' + info.version);
  console.log('facets        :', info.facets, ' triangles:', info.triangles);
  console.log('gl renderer   :', info.renderer);

  async function shot(file, state) {
    await page.evaluate((s) => window.__swan.apply(s), state);
    const buf = await page.evaluate(() => {
      const c = document.getElementById('c');
      return c.toDataURL('image/png');
    });
    const b64 = buf.replace(/^data:image\/png;base64,/, '');
    fs.writeFileSync(file, Buffer.from(b64, 'base64'));
    console.log('wrote', path.relative(out, file), JSON.stringify(state));
  }

  // The sizes the header actually lays the logo out at, plus the extremes.
  const LADDER = [16, 24, 28, 32, 36, 44, 48, 52, 64, 96, 128, 256, 512, 1024];

  if (args.has('--sizes')) {
    for (const size of LADDER) {
      await shot(path.join(out, `shot-size-${size}.png`), { size });
    }
  } else if (args.has('--super')) {
    // Render at 4x the target size. size_fidelity.py downscales these to the
    // target and compares against a native render, which is the only honest way
    // to answer "should the canvas supersample at header sizes".
    for (const size of LADDER) {
      await shot(path.join(out, `shot-ss-${size}.png`), { size: size * 4 });
    }
  } else if (args.has('--ssweep')) {
    // Header sizes at several supersample factors, to find the cheapest factor
    // that already sits on the facet-partition error floor.
    for (const size of [24, 28, 32, 36, 44, 52]) {
      for (const f of [1, 2, 4, 8]) {
        await shot(path.join(out, `shot-ssw-${size}x${f}.png`), { size: size * f });
      }
    }
  } else if (args.has('--turntable')) {
    for (let i = 0; i < 8; i++) {
      const yaw = (i / 8) * Math.PI * 2;
      await shot(path.join(out, `shot-yaw-${String(i).padStart(2, '0')}.png`), { size: 512, yaw });
    }
  } else {
    await shot(path.join(out, 'shot-front-1024.png'), { size: 1024, yaw: 0, pitch: 0 });
    await shot(path.join(out, 'shot-front-512.png'), { size: 512, yaw: 0, pitch: 0 });
  }

  if (problems.length) {
    console.log('\n--- page diagnostics ---');
    for (const p of [...new Set(problems)].slice(0, 20)) console.log(' ', p);
  } else {
    console.log('\nno console errors or warnings');
  }
} finally {
  await browser.close();
}

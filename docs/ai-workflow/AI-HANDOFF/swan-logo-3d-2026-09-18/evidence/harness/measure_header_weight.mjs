/**
 * What does the header actually pull over the wire?
 *
 * I claimed "three and the spec never touch the header bundle". That was verified
 * against a production build (dynamic imports, no modulepreload) - but a dynamic
 * import still FETCHES, and the header renders the mark on every page, so the chunks
 * are pulled shortly after mount. "Not in the entry chunk" and "not downloaded" are
 * different claims and only one of them is true.
 *
 * This measures the real thing: every request the header makes, with encoded bytes,
 * and it FAILS if the fallback image exceeds its budget - so the H-1 regression
 * cannot come back unnoticed.
 *
 * Usage:  node measure_header_weight.mjs
 */
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../../../../../');
const require = createRequire(path.join(root, 'frontend', 'package.json'));
const puppeteer = require('puppeteer');

const pageUrl = pathToFileURL(path.join(here, 'logo.html')).href;

const browser = await puppeteer.launch({
  headless: 'new',
  args: [
    '--enable-unsafe-swiftshader',
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--no-sandbox',
    '--hide-scrollbars',
  ],
});

let overBudget = false;

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 400 });

  const client = await page.target().createCDPSession();
  await client.send('Network.enable');

  const reqs = new Map();
  client.on('Network.responseReceived', (e) => {
    reqs.set(e.requestId, {
      url: e.response.url,
      type: e.type,
      mime: e.response.mimeType,
      status: e.response.status,
      bytes: 0,
    });
  });
  client.on('Network.loadingFinished', (e) => {
    const r = reqs.get(e.requestId);
    if (r) r.bytes = e.encodedDataLength;
  });

  await page.goto(pageUrl, { waitUntil: 'networkidle0', timeout: 60000 });

  // The mark must have gone live before we read the totals, or we would be
  // measuring a page that never requested the 3-D chunks.
  await page.waitForFunction(
    () => document.querySelectorAll('canvas').length > 0,
    { timeout: 30000 },
  );
  await new Promise((r) => setTimeout(r, 1500)); // let late chunks land

  const rows = [...reqs.values()].filter((r) => r.bytes > 0);
  const total = rows.reduce((a, r) => a + r.bytes, 0);

  const kb = (n) => `${(n / 1024).toFixed(1)} KB`;
  console.log('\n--- every request the header made ---');
  for (const r of rows.sort((a, b) => b.bytes - a.bytes)) {
    const name = r.url.split('/').pop().slice(0, 46);
    console.log(`  ${kb(r.bytes).padStart(10)}  ${r.mime.padEnd(24)} ${name}`);
  }

  const png = rows.filter((r) => r.mime.includes('image') || r.url.endsWith('.png'));
  const js = rows.filter((r) => r.mime.includes('javascript'));

  console.log('\n--- summary ---');
  console.log(`  total transferred        : ${kb(total)}`);
  console.log(`  javascript               : ${kb(js.reduce((a, r) => a + r.bytes, 0))}`);
  console.log(`  images                   : ${kb(png.reduce((a, r) => a + r.bytes, 0))}`);
  for (const r of png) {
    console.log(`     ${r.url.split('/').pop()}  ${kb(r.bytes)}`);
  }

  // This harness is a single esbuild bundle, so every module - including three and
  // the spec - is inlined into logo-bundle.js. JS chunk attribution is therefore
  // MEANINGLESS here and is not reported. The chunk split is proven against the real
  // production build instead: `vite build`, then check that index.html preloads no
  // three chunk and that the entry contains `import("./swan-mark.mesh.*.js")`.
  const bundled = rows.some((r) => /logo-bundle\.js$/.test(r.url));
  console.log('\n--- what this run can and cannot tell you ---');
  console.log(`  image weight             : VALID (the PNG is fetched as its own file)`);
  console.log(`  js chunk attribution     : ${bundled ? 'N/A - single esbuild bundle, modules inlined' : 'valid'}`);

  // BUDGET, not just a report.
  //
  // The fallback <img> renders before the 3-D chunks resolve, so this asset is on
  // the critical path of every page even when WebGL works. It used to be the
  // 1.2 MB brand asset (H-1, measured at 1,177.7 KB) purely because nothing was
  // watching; the fix is only durable if something fails when it comes back.
  // 128px covers the ladder (52 CSS px at maxPixelRatio 2 = 104 device px) and
  // measures 20.9 KB. The budget leaves room to move to 256px, not back to 1024.
  const IMAGE_BUDGET = 128 * 1024;
  const imageBytes = png.reduce((a, r) => a + r.bytes, 0);
  overBudget = imageBytes > IMAGE_BUDGET;
  console.log(
    `\n  fallback image budget    : ${kb(imageBytes)} of ${kb(IMAGE_BUDGET)}  ` +
      `${overBudget ? 'OVER BUDGET' : 'ok'}`,
  );
  if (overBudget) {
    console.log('  REGRESSION: the fallback is on the critical path of every page. If it');
    console.log('  is the 1.2 MB brand asset again, see evidence/fallback_asset_audit.py');
    console.log('  and regenerate with evidence/make_fallback_mark.py.');
  }
} finally {
  await browser.close();
}

console.log(overBudget ? '\nRESULT: FAIL - image budget exceeded' : '\nRESULT: PASS');
process.exit(overBudget ? 1 : 0);

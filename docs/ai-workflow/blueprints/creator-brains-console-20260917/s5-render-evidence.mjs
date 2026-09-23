/**
 * S5 exit-evidence render harness — "Sean has seen it".
 *
 * `08-slices-operations.md` S5 exit gate, verbatim:
 *   "T-T1/T-T2/T-W7 green; T-E3 budget measured; Sean has seen it
 *    (ideation follow-through)"
 *
 * The last clause is not decorative. The slice exists because Sean picked CD3
 * "Vault Observatory" out of S0's concept directions, and the whole point of
 * the pick was to SEE it. A green suite cannot discharge that clause — only a
 * rendered frame can. This script produces the rendered frame.
 *
 * ── WHY THIS DRIVES THE COMPONENT DIRECTLY RATHER THAN THE LIVE BRIDGE ──────
 *
 * The honest option was to start the real bridge and screenshot the app. That
 * was tried first and it renders the EMPTY STATE: this store's `journal.json`
 * reads `{"status":"no-op","reason":"no enabled creators — nothing to do"}` and
 * the vault holds zero creators. A screenshot of an empty store would "satisfy"
 * the gate while showing Sean nothing about the constellation — which is the
 * opposite of ideation follow-through.
 *
 * So this harness mounts the REAL `BrainConstellation` component — the shipped
 * one, not a copy — with a roster built to the `CreatorRow` contract, and
 * screenshots THAT. What Sean sees is the actual component's actual output. The
 * data is synthetic; the component, its gates, its layout maths, and its
 * rendering path are all the shipping article.
 *
 * Usage: node s5-render-evidence.mjs [--out DIR]
 */
import { createServer } from 'node:http';
import { readFile, writeFile, unlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
// docs/ai-workflow/blueprints/creator-brains-console-20260917/ → repo root
const REPO = join(HERE, '..', '..', '..', '..');
const WEB = join(REPO, 'packages', 'creator-brains-console', 'web');

const argOut = process.argv.indexOf('--out');
const OUT = argOut >= 0 ? process.argv[argOut + 1] : HERE;

/** MIME for the handful of extensions the harness page requests. */
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
};

/**
 * The roster. Shaped like the real population: a long tail of small channels,
 * a few large ones, and every visual state represented so the constellation's
 * colour and size encodings are all visible in one frame.
 *
 * `videos`/`fetched` drive size and arc; `enabled` drives colour. `fetched:null`
 * is used deliberately — `CreatorRow` says a null count "COULD NOT BE TAKEN" and
 * must render as absent, never as 0 (S1-H9), so one row exercises that path.
 */
const NAMES = [
  'Systems Weekly', 'Quiet Machines', 'Field Notes', 'Deep Field', 'Latent Space',
  'Signal Path', 'Cold Start', 'Tangent', 'Understory', 'Redshift',
  'Long Form', 'Brittle Stars', 'Slate', 'Antenna', 'Half Life',
  'Moth & Lamp', 'Relay', 'Dry Creek', 'Nacre', 'Overtone',
  'Wavelength', 'Found Objects', 'Slow Burn', 'Parallax', 'Iron Filings',
  'Tide Mill', 'Cinder', 'Bright Noise', 'Lodestar', 'Feral Craft',
  'Glass Onion', 'Bedrock', 'Pale Blue', 'Salt Flat', 'Static Bloom',
  'Wireframe', 'Hollow Bone', 'Lumen', 'Silt', 'Terminal Velocity',
];

function buildRoster() {
  return NAMES.map((title, i) => {
    // A descending power-ish tail so the size encoding has real range.
    const videos = Math.max(3, Math.round(980 / (1 + i * 0.42)));
    const failCount = i % 13 === 0;
    const fetched = failCount ? null : Math.round(videos * (0.35 + ((i * 7) % 60) / 100));
    return {
      channelId: `UC${String(i).padStart(22, 'a')}`,
      title,
      // A believable mix: most enabled, a stubborn minority off.
      enabled: i % 5 !== 0,
      videos,
      fetched,
    };
  });
}

const STATUS = {
  ytdlp: {
    ok: true, version: '2025.09.17', reason: '', checkedAt: new Date().toISOString(),
    ageMs: 42000, source: 'probe', stale: false, note: null,
  },
  creators: { total: 40, enabled: 32, damaged: null },
  state: {
    damaged: null,
    videos: { total: 11240, fetched: 9180, coverage: 0.8167, counts: { fetched: 9180, pending: 2060 } },
  },
  lock: { held: false, holder: null, ageMs: null },
  throttle: { perHour: 12, used: 3, remaining: 9, windowMs: 3600000 },
  budget: { spent: 9180, cap: 20000, remaining: 10820 },
  recentRuns: [
    { runId: 'run-2026-09-22T18', status: 'completed', startedAt: new Date(Date.now() - 3600e3).toISOString(), ok: true },
    { runId: 'run-2026-09-22T17', status: 'completed', startedAt: new Date(Date.now() - 7200e3).toISOString(), ok: true },
  ],
};

/** The harness page. Imports the REAL component; provides only the data. */
function harnessHtml() {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="color-scheme" content="dark" />
<title>S5 — BrainConstellation (Vault Observatory)</title>
<style>
  :root { color-scheme: dark; }
  html, body { margin: 0; height: 100%; background: #06060A; }
  #root { height: 100%; }
</style>
</head>
<body>
<div id="root"></div>
<script type="module" src="/__s5-harness.jsx"></script>
</body>
</html>`;
}

/** Mounts the shipped component with the roster above. */
function harnessMain() {
  return `
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrainConstellation } from '/src/components/BrainConstellation.tsx';

const roster = ${JSON.stringify(buildRoster())};
const status = ${JSON.stringify(STATUS)};

/**
 * The frame the constellation is designed for.
 *
 * The component's own styles give it \`min-height: 380px\` inside a card and the
 * camera settles at z=230 looking at a ~100-unit layout sphere. Rendering it
 * edge-to-edge in an 860px viewport (which the first attempt did) hands it a
 * ~1280x820 aspect ratio and crops the near hemisphere — a harness artefact,
 * not a component defect. A real console gives it a panel, so the harness does
 * the same and frames it the way the operator sees it.
 */
function Harness() {
  return React.createElement(
    'div',
    {
      style: {
        minHeight: '100%',
        padding: '28px',
        boxSizing: 'border-box',
        background: '#06060A',
        fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif',
      },
    },
    React.createElement(
      'div',
      { style: { maxWidth: '1040px', margin: '0 auto' } },
      React.createElement(
        'header',
        { style: { marginBottom: '18px' } },
        React.createElement('div', {
          style: { fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(224,236,244,0.42)' },
        }, 'CD3 · Vault Observatory'),
        React.createElement('h1', {
          style: { margin: '6px 0 4px', fontSize: '22px', fontWeight: 600, color: '#e0ecf4' },
        }, 'Brain constellation'),
        React.createElement('p', {
          style: { margin: 0, fontSize: '13px', color: 'rgba(224,236,244,0.55)' },
        }, '${buildRoster().length} creators · size is video count · colour is state · the arc is fetch coverage'),
      ),
      React.createElement(
        // The panel the constellation lives in, at the aspect the camera expects.
        'div',
        { style: { height: '560px' } },
        React.createElement(BrainConstellation, {
          rows: roster,
          status,
          onOpenBrain: (id) => console.log('open', id),
          webglAvailable: true,
          reducedMotion: false,
        }),
      ),
    ),
  );
}

createRoot(document.getElementById('root')).render(React.createElement(Harness));

// Ready once the deferred chunk has loaded AND the 1100ms entry dolly has
// settled — screenshotting mid-dolly would capture a frame the eye never rests
// on, which is the opposite of showing Sean the settled design.
window.__S5_READY__ = false;
setTimeout(() => { window.__S5_READY__ = true; }, 1900);
`;
}

async function main() {
  // `playwright/package.json` maps `import` → `index.mjs`, so importing the CJS
  // `index.js` directly yields a namespace with everything under `.default`.
  // Import the ESM entry instead of unwrapping by hand.
  const pwEntry = join(REPO, 'frontend', 'node_modules', 'playwright', 'index.mjs');
  const pw = await import(pathToFileURL(existsSync(pwEntry) ? pwEntry : join(REPO, 'frontend', 'node_modules', 'playwright', 'index.js')).href);
  const { chromium } = pw.chromium ? pw : pw.default;

  // The harness entry must be a REAL file inside the Vite root and requested
  // through Vite's own HTML pipeline — a virtual module served by middleware
  // never receives Vite's transform chain, which is how the first attempt
  // produced a blank frame. Written before the server starts, removed after
  // the browser closes.
  const ENTRY_HTML = join(WEB, '__s5-harness.html');
  const ENTRY_JSX = join(WEB, '__s5-harness.jsx');
  await writeFile(ENTRY_HTML, harnessHtml(), 'utf8');
  await writeFile(ENTRY_JSX, harnessMain(), 'utf8');

  const viteEntry = join(WEB, 'node_modules', 'vite', 'dist', 'node', 'index.js');
  if (!existsSync(viteEntry)) throw new Error(`vite not found at ${viteEntry}`);
  const { createServer: createViteServer } = await import(pathToFileURL(viteEntry).href);

  const server = await createViteServer({
    root: WEB,
    configFile: false, // the package's own config loads the React plugin; we do not want it
    appType: 'spa',
    server: { port: 0, host: '127.0.0.1', open: false },
    logLevel: 'silent',
    esbuild: { jsx: 'automatic', jsxImportSource: 'react' },
    optimizeDeps: { include: ['react', 'react-dom', 'react-dom/client', 'styled-components'] },
  });

  await server.listen();
  const addr = server.httpServer.address();
  const url = `http://127.0.0.1:${addr.port}/__s5-harness.html`;
  console.log(`[s5] harness served at ${url}`);

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 860 }, deviceScaleFactor: 2 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

  await page.goto(url, { waitUntil: 'load' });
  // Wait for the deferred chunk + first frame, then let the entry dolly settle.
  await page.waitForFunction(() => window.__S5_READY__ === true, null, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(900);

  const shot = join(OUT, 'S5-brain-constellation.png');
  await page.screenshot({ path: shot, fullPage: false });
  console.log(`[s5] wrote ${shot}`);

  // ── RENDER-TIME ASSERTIONS ────────────────────────────────────────────────
  // A screenshot that "looks about right" is not evidence. These read the live
  // DOM and the canvas, so the receipt can state what was actually on screen.

  const canvasCount = await page.locator('canvas').count();
  const rosterEntries = await page.locator('[data-testid="constellation-node-list"] > li').count();

  // Read the canvas back and count how many of the two state colours appear.
  // This is the end-to-end check that the STATE MAP reached the GPU, which the
  // unit tests cannot prove (they assert the map, not the draw).
  //
  // The renderer is built WITHOUT `preserveDrawingBuffer` (which is correct for
  // shipping — the flag costs performance and nothing in the app reads pixels).
  // That means the buffer is undefined AFTER compositing, so `readPixels` from
  // the top level returns an empty or stale image and would silently report
  // "no nodes". Rather than set a shipping flag to suit the harness, we hook
  // `requestAnimationFrame` so the read happens in the same task as the draw,
  // before the buffer is presented.
  const colourCensus = await page.evaluate(async () => {
    const c = document.querySelector('canvas');
    if (!c) return { error: 'no canvas' };
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    if (!gl) return { error: 'no webgl context' };
    return await new Promise((resolve) => {
      requestAnimationFrame(() => {
        const w = c.width, h = c.height;
        const px = new Uint8Array(w * h * 4);
        gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
        const near = (r, g, b, tr, tg, tb, tol) =>
          Math.abs(r - tr) <= tol && Math.abs(g - tg) <= tol && Math.abs(b - tb) <= tol;
        let on = 0, off = 0, other = 0;
        for (let i = 0; i < px.length; i += 4) {
          const [r, g, b, a] = [px[i], px[i + 1], px[i + 2], px[i + 3]];
          if (a < 8) continue;
          if (near(r, g, b, 0x60, 0xc0, 0xf0, 30)) on++;
          else if (near(r, g, b, 0x40, 0x70, 0xc0, 30)) off++;
          else other++;
        }
        resolve({ w, h, on, off, other });
      });
    });
  });

  console.log(`[s5] canvas elements: ${canvasCount}`);
  console.log(`[s5] roster DOM li entries: ${rosterEntries}`);
  console.log(`[s5] canvas readback: ${JSON.stringify(colourCensus)}`);
  if (errors.length) console.log(`[s5] page errors (${errors.length}):\n  ` + errors.slice(0, 8).join('\n  '));

  await browser.close();
  await server.close();
  // Leave the web package exactly as found: these are harness scaffolding, not
  // part of the slice, and a stray `.jsx` in `src/` would be picked up by
  // `tsconfig`/test globs on the next run.
  await unlink(ENTRY_HTML).catch(() => {});
  await unlink(ENTRY_JSX).catch(() => {});
  console.log('[s5] harness scaffolding removed');
}

main().catch((err) => { console.error('[s5] FAILED:', err); process.exit(1); });

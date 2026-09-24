#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: packages/creator-brains-console/web/bench/frame-bench.mjs
 * PURPOSE: T-E3's real measurement — drive the BUILT constellation chunk in a
 *          real browser: frame timing (CPU + per-frame-synced), observable
 *          output, allocation growth, and camera-dolly behaviour.
 * PART OF: Creator Brains — S5 / T-E3 (Astra 140126 D1, closed rounds 3-4)
 * ADDED: 2026-09-22 | EXTENDED: same day (U2 sync variant, U3 diagnostics/dolly)
 * ============================================================================
 *
 * WHY THIS EXISTS. `constellation-budget.test.ts` timed a local loop — retracted
 * as T-E3 evidence (19 §4). Astra's fix demanded: real browser + WebGL + 40
 * nodes, observable output so an empty renderer fails, mutation-proven timing,
 * and (D1 aux) allocation/dolly observed on the REAL scene rather than asserted
 * on empty-layout equality. jsdom cannot do any of that; this harness can.
 *
 * THE HASH PROBLEM. The lazy chunk's filename is content-hashed, so this script
 * locates it in `dist/assets`, locates the ENTRY from `dist/index.html`, and
 * REWRITES `dist/frame-bench.html` at the current hashes — generated, never
 * stale. The entry must load FIRST: the chunk statically imports it for shared
 * pure layout modules (benign in the shell, fatal standalone — recorded in the
 * round-3 review), and the entry needs `#root` to evaluate.
 *
 * RUN:
 *   1. node bench/frame-bench.mjs --prepare     (after `vite build`)
 *   2. npx vite preview --port 4179             (binds `localhost`, not 127.0.0.1)
 *   3. agent-browser open http://localhost:4179/frame-bench.html
 *      agent-browser snapshot   → one line: `T_E3_RESULT {json}`
 *      agent-browser close
 *
 * GUARDS in `pass` (all must hold):
 *   drawn        readPixels after warm frames is non-zero (empty renderer fails)
 *   freshRender  full-canvas pixel count CHANGES after a colour-only post-warm-up
 *                update+frame — a frozen-after-warm-up renderer keeps drawn:true
 *                but cannot pass this (E5 / Astra R2 #6, R3 #6)
 *   cpuPass      median of 120 scene.frame() samples ≤ 16.7 (the clause's basis)
 *   syncPass     median of 60 samples WITH readPixels-per-frame ≤ 16.7 — forces
 *                GPU completion INSIDE every sample, so a raster tail cannot
 *                hide between samples (the stricter variant; U2)
 *   allocPass    geometry count stable across repeated updates of the SAME
 *                roster (a leak grows it — this is the D2-dispose class made
 *                observable; U3 / Astra's "real scene allocations")
 *   dollyPass    with entryDolly:true the camera actually moves in and
 *                converges (cameraZ sampled per frame; U3 / "camera behaviour")
 *   noDollyWhenDisabled  entryDolly:false cameraZ is bit-identical start→end
 *
 * Backend identity: `gl.RENDERER` is Chromium's masked string; the machine's
 * real backend is read from chrome://gpu once per session and recorded in
 * `19-s5-exit-evidence.md` §4 (this run: ANGLE/D3D11 on RTX 5090).
 *
 * @module creator-brains-console/web/bench/frame-bench
 */
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const mode = process.argv[2] || '--prepare';
if (mode !== '--prepare') {
  console.error('usage: node bench/frame-bench.mjs --prepare');
  process.exit(2);
}

const webRoot = resolve(process.cwd());
const dist = join(webRoot, 'dist');
const assets = join(dist, 'assets');
if (!existsSync(assets)) {
  console.error('[bench] dist/assets missing — run `vite build` first');
  process.exit(1);
}

// The chunk is the module that both exports createScene and contains the
// renderer; the entry contains neither (Q3 verified: entry has zero three code).
const chunk = readdirSync(assets).find((f) => {
  if (!f.endsWith('.js')) return false;
  const src = readFileSync(join(assets, f), 'utf-8');
  return src.includes('createScene') && src.includes('WebGLRenderer');
});
if (!chunk) {
  console.error('[bench] constellation-three chunk not found in dist/assets');
  process.exit(1);
}

const entryHtml = readFileSync(join(dist, 'index.html'), 'utf-8');
const entryMatch = entryHtml.match(/src="\/(assets\/index-[^"]+\.js)"/);
if (!entryMatch) {
  console.error('[bench] entry script not found in dist/index.html');
  process.exit(1);
}
const entry = entryMatch[1];

const NODE_COUNT = 40;
const CEILING_MS = 16.7;
const FRAMES = 120;   // clause basis: CPU submit samples
const SYNC_FRAMES = 60; // stricter: readPixels forces completion per sample
const DOLLY_FRAMES = 80; // 80 × 16ms = 1280ms > DOLLY_MS(1100) → must converge

// Deterministic 40-node fixture: golden-angle spread, cycling states, mixed
// coverage so arcs (the expensive line geometry) are exercised, not skipped.
const fixture = `
const NODES = Array.from({ length: ${NODE_COUNT} }, (_, i) => {
  const golden = Math.PI * (3 - Math.sqrt(5));
  const y = 1 - (i / (${NODE_COUNT} - 1)) * 2;
  const ring = Math.sqrt(Math.max(0, 1 - y * y));
  const theta = golden * i;
  const R = 2.5 * (0.78 + 0.22 * ((i % 7) / 7));
  const cov = i % 3 === 0 ? null : ((i * 7) % 10) / 10;
  return {
    channelId: 'bench-' + i,
    title: 'Bench ' + i,
    size: (i % 5) / 5,
    coverage: cov,
    arc: (cov === null ? 0 : cov) * Math.PI * 2,
    state: ['on', 'off', 'throttle', 'stale'][i % 4],
    position: { x: Math.cos(theta) * ring * R, y: y * R, z: Math.sin(theta) * ring * R },
    enabled: i % 6 !== 5,
    videos: 100 + i,
    fetched: cov === null ? null : Math.round(cov * (100 + i)),
  };
});`;

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>T-E3 frame bench</title>
    <style>body { background: #0A0A0F; color: #E0ECF4; font: 14px monospace; } canvas { display: none; } #root { display: none; }</style>
  </head>
  <body>
    <div id="root"></div>
    <pre id="out">T_E3_RESULT {"state":"running"}</pre>
    <!-- Production order: the entry module evaluates FIRST (the chunk statically
         imports it for shared layout modules), then the bench performs the same
         dynamic import the loader performs. -->
    <script type="module" src="/${entry}"></script>
    <script type="module">
      const out = document.getElementById('out');
      const emit = (o) => { out.textContent = 'T_E3_RESULT ' + JSON.stringify(o); };
      const med = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
      const mkCanvas = (id) => {
        const c = document.createElement('canvas');
        c.id = id; c.width = 800; c.height = 600; c.style.display = 'none';
        document.body.appendChild(c);
        return c;
      };
      try {
        const mod = await import('/assets/${chunk}');
        ${fixture}

        // ── PHASE 1: steady scene, dolly DISABLED — timing, output, allocation
        const canvas = mkCanvas('bench-c1');
        const scene = mod.createScene(canvas, { entryDolly: false });
        scene.update(NODES);
        scene.resize(800, 600);
        scene.frame(16); scene.frame(16); scene.frame(16);
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
        const px = new Uint8Array(4);
        gl.readPixels(400, 300, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
        const drawn = px[0] + px[1] + px[2] > 0;
        const centerPixel = Array.from(px);
        // Read the backend NOW — scene.dispose() below force-loses the context,
        // and getParameter on a lost context returns null (first full run did
        // exactly that; the guard run exposed it by emitting renderer:null).
        const rendererStr = gl.getParameter(gl.RENDERER);
        const zDisabledStart = scene.diagnostics().cameraZ;

        // E5 FRESHNESS PROBE (Astra R2 #6 / R3 #6): "drawn" above is read ONCE
        // after warm-up, so a renderer that painted during warm-up and then froze
        // would keep drawn:true while every timing loop happily measured a scene
        // nothing redraws. Prove the renderer still PAINTS after warm-up: change
        // node 0's STATE (colour only — positions untouched, so the camera fit and
        // therefore noDollyWhenDisabled cannot move), frame once, and require the
        // FULL canvas to differ. Separate buffers: this probe never touches px,
        // keeping the output probe distinct from the timing workload (Astra's fix,
        // verbatim requirement). No raw backticks in here: this whole block lives
        // INSIDE the html template literal, and one would end the string.
        const freshBefore = new Uint8Array(800 * 600 * 4);
        gl.readPixels(0, 0, 800, 600, gl.RGBA, gl.UNSIGNED_BYTE, freshBefore);
        // Flip EVERY node's state (never its position — camera fit must not move).
        // First attempt flipped only node 0 and read 0 changed pixels: fixture
        // size (0%5)/5 = 0 makes node 0 minNodeRadius — sub-pixel, so the colour
        // swap landed on nothing. A probe that can select an invisible subject is
        // a probe that can false-fail; all-40 removes the choice.
        scene.update(NODES.map((n) => (n.state === 'stale' ? { ...n, state: 'off' } : { ...n, state: 'stale' })));
        scene.frame(16);
        const freshAfter = new Uint8Array(800 * 600 * 4);
        gl.readPixels(0, 0, 800, 600, gl.RGBA, gl.UNSIGNED_BYTE, freshAfter);
        let freshChangedPx = 0;
        for (let i = 0; i < freshBefore.length; i += 4) {
          if (freshBefore[i] !== freshAfter[i] || freshBefore[i + 1] !== freshAfter[i + 1] || freshBefore[i + 2] !== freshAfter[i + 2]) freshChangedPx += 1;
        }
        const freshRender = freshChangedPx > 0;
        scene.update(NODES); scene.frame(16); // restore the canonical roster for timing

        const samples = [];
        for (let i = 0; i < ${FRAMES}; i += 1) {
          const t0 = performance.now();
          scene.frame(16);
          samples.push(performance.now() - t0);
        }

        // ALLOCATION (Astra D1 aux): repeated updates of the SAME roster must
        // not grow the renderer's geometry count — a missing dispose grows it
        // every update (the D2/D4 leak class, observed on the real scene).
        const allocFirst = scene.diagnostics().geometries;
        scene.update(NODES); scene.frame(16);
        scene.update(NODES); scene.frame(16);
        const allocFinal = scene.diagnostics().geometries;
        const diag = scene.diagnostics();
        const zDisabledEnd = scene.diagnostics().cameraZ;

        // U2 STRICT VARIANT: readPixels after EVERY frame forces GPU completion
        // inside the sample — a raster tail cannot hide between samples.
        const syncSamples = [];
        for (let i = 0; i < ${SYNC_FRAMES}; i += 1) {
          const t0 = performance.now();
          scene.frame(16);
          gl.readPixels(400, 300, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
          syncSamples.push(performance.now() - t0);
        }
        scene.dispose();

        // ── PHASE 2: dolly ENABLED — real camera behaviour (Astra D1 aux)
        const canvas2 = mkCanvas('bench-c2');
        const scene2 = mod.createScene(canvas2, { entryDolly: true });
        scene2.update(NODES);
        scene2.resize(800, 600);
        // Read AFTER the first frame — before it the camera sits at z=0 and the
        // baseline would invert the assertion (first full run: zStart 0,
        // moved:false while the dolly had actually run; the guard caught it).
        scene2.frame(16);
        const dz = [scene2.diagnostics().cameraZ];
        for (let i = 1; i < ${DOLLY_FRAMES}; i += 1) {
          scene2.frame(16);
          dz.push(scene2.diagnostics().cameraZ);
        }
        const dollyMoved = dz[dz.length - 1] < dz[0] - 1; // pushed IN by >1 unit
        const tail3 = dz.slice(-3);
        const dollyConverged = Math.max(...tail3) - Math.min(...tail3) < 1e-6;
        scene2.dispose();

        const medianMs = Number(med(samples).toFixed(3));
        const syncMedianMs = Number(med(syncSamples).toFixed(3));
        const allocGrew = allocFinal - allocFirst;
        const noDollyWhenDisabled = zDisabledEnd === zDisabledStart;
        const guards = {
          freshRender, // E5: the renderer still paints AFTER warm-up
          cpuPass: medianMs <= ${CEILING_MS},
          syncPass: syncMedianMs <= ${CEILING_MS},
          allocPass: allocGrew <= 5,
          dollyPass: dollyMoved && dollyConverged,
          noDollyWhenDisabled,
        };
        emit({
          nodes: ${NODE_COUNT},
          frames: { cpu: ${FRAMES}, sync: ${SYNC_FRAMES}, dolly: ${DOLLY_FRAMES} },
          drawn, centerPixel, freshChangedPx,
          medianMs, p95Ms: Number([...samples].sort((a, b) => a - b)[Math.floor(${FRAMES} * 0.95)].toFixed(3)),
          syncMedianMs,
          alloc: { first: allocFirst, final: allocFinal, grew: allocGrew },
          diagnostics: diag,
          dolly: { zStart: dz[0], zEnd: dz[dz.length - 1], moved: dollyMoved, converged: dollyConverged },
          zDisabledStart, zDisabledEnd,
          ceiling: ${CEILING_MS},
          renderer: rendererStr,
          method: 'cpu: scene.frame() submit time; sync: same with readPixels per frame; completion forced at readPixels points',
          guards,
          pass: drawn && Object.values(guards).every(Boolean),
        });
      } catch (e) {
        emit({ error: String(e && e.message || e), pass: false });
      }
    </script>
  </body>
</html>
`;

writeFileSync(join(dist, 'frame-bench.html'), html, 'utf-8');
console.log(`[bench] dist/frame-bench.html generated → chunk=${chunk}, entry=${entry}, nodes=${NODE_COUNT}, cpu=${FRAMES}, sync=${SYNC_FRAMES}, dolly=${DOLLY_FRAMES}, ceiling=${CEILING_MS}ms`);

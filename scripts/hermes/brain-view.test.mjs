/**
 * brain-view.test.mjs — the graphical command center. Slice 1 (v2 redesign):
 * real-data render + the readability/layout foundation + the security gates
 * (network invariant, embed-escaper) + the ranked NBA rail.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { ensureLanes, seedSwitches, writeReceipt, readReceipts } from './hermesRunsLib.mjs';
import { renderBrainView, gatherBrainData } from './brain-view.mjs';
import { escapeForEmbed } from './brainViewTemplate.mjs';
import { computeTransforms, cameraClientJs } from './brainCamera.mjs';
import { svgCameraTransform, labelCameraTransform, svgScreenPos, labelScreenPos } from './graphGeometry.mjs';
import { initSchedule } from './runnerLib.mjs';

process.env.HERMES_ANCHOR_KEY = 'brain-test-key';
const DAY = '2026-07-01';
const NOW = `${DAY}T08:00:00Z`;

function fresh() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hermes-brain-'));
  const swFile = path.join(root, 'switches.json');
  ensureLanes(root);
  seedSwitches(swFile);
  initSchedule(root);
  return { root, swFile };
}
const receipt = (root, over = {}) => writeReceipt(root, {
  who: 'harness/hermes-doctor', what: 'hermes-doctor (T0)', target: 'self', when: NOW,
  'approved-by': 'n/a', outcome: 'ok — 7 checks healthy', evidence: 'x', ...over,
});

test('renders the full brain: clusters, core, HUD, thought stream, sparkline, aurora', () => {
  const { root, swFile } = fresh();
  receipt(root);
  const out = renderBrainView(root, swFile, DAY, { now: NOW });
  const html = fs.readFileSync(out.path, 'utf8');
  for (const s of ['HERMES', 'APPLICATIONS · C2', 'ROUTINES · C4', 'MEMORY · C1', 'SKILLS · C3', 'class="glegend"',
    'Thought stream', 'Next best action', 'class="aurora"', 'class="sparkline"', 'core-spin', 'prefers-reduced-motion']) {
    assert.ok(html.includes(s), s);
  }
  assert.ok(out.skills >= 20, 'real .claude/skills inventory rendered');
  assert.equal(out.routines, 4, 'schedule entries rendered as routine nodes');
  assert.ok(readReceipts(root, DAY).some((r) => r.what === 'brain-view (T0)' && r.evidence === out.path));
});

test('Slice-1 layout foundation: grid shell + HTML label overlay + loud NBA hero present', () => {
  const { root, swFile } = fresh();
  receipt(root);
  const html = fs.readFileSync(renderBrainView(root, swFile, DAY, { now: NOW }).path, 'utf8');
  assert.ok(html.includes('class="shell"') && html.includes('class="main"'), 'grid shell regions');
  assert.ok(html.includes('class="label-layer"') && /class="nlabel[ "]/.test(html), 'HTML label overlay (the readability fix)');
  assert.ok(html.includes('class="nlabel k-sk"'), 'skill labels tagged for the semantic-zoom tier');
  assert.ok(html.includes('class="graph-pane"') && html.includes('aspect-ratio:1280/700'), 'aspect-locked graph pane');
  assert.ok(/class="nba[^"]*"[\s\S]*class="lead"/.test(html), 'NBA hero band with a loud lead line');
});

test('READABILITY: no text token or font-size renders below the 13px operator floor', () => {
  const { root, swFile } = fresh();
  receipt(root);
  const html = fs.readFileSync(renderBrainView(root, swFile, DAY, { now: NOW }).path, 'utf8');
  const sizes = [...html.matchAll(/(?:font-size:\s*|--t-[a-z]+:)(\d+)px/g)].map((m) => Number(m[1]));
  assert.ok(sizes.length > 0, 'type ramp present in output');
  const tooSmall = sizes.filter((n) => n < 13);
  assert.equal(tooSmall.length, 0, `every text size >= 13px; found ${tooSmall}`);
});

/**
 * v2 B2 — the DOCTRINE SWAP. Slice 2 lands view-only client JS, so the old
 * "no <script>" assertion is REPLACED (never deleted) by the invariant it was
 * really standing in for: the page grants nothing. No network-capable API, no
 * remote resource, no form, no inline event handler, no command/action surface.
 */
test('SECURITY: view-only — no network-capable API surface (replaces the <script> ban, v2 B2)', () => {
  const { root, swFile } = fresh();
  const html = fs.readFileSync(renderBrainView(root, swFile, DAY, { now: NOW }).path, 'utf8');
  for (const banned of ['fetch(', 'XMLHttpRequest', 'WebSocket(', 'sendBeacon', 'EventSource', 'eval(', '<script src=', '<form', 'javascript:']) {
    assert.ok(!html.includes(banned), banned);
  }
  assert.ok(!/<[^>]+(?:src|href|action)\s*=\s*["']?https?:/i.test(html), 'no remote resource / remote nav');
  assert.ok(!/<[^>]+\son[a-z]+\s*=/i.test(html), 'no inline event handler attribute (addEventListener only)');
  assert.equal((html.match(/<script\b/g) || []).length, 1, 'exactly one inline script (the camera)');
});

test('SECURITY: the only buttons manipulate the VIEW — zero command/broker surface', () => {
  const { root, swFile } = fresh();
  const html = fs.readFileSync(renderBrainView(root, swFile, DAY, { now: NOW }).path, 'utf8');
  const ids = [...html.matchAll(/<button[^>]*id="([^"]+)"/g)].map((m) => m[1]).sort();
  assert.deepEqual(ids, ['zin', 'zout', 'zreset'], 'only zoom/reset view controls exist');
  assert.equal((html.match(/<button\b/g) || []).length, 3, 'no other buttons');
});

test('SECURITY: attacker receipt text cannot break out of the embed or execute (v2 B1)', () => {
  const { root, swFile } = fresh();
  // the refusal trail carries verbatim attacker text by design (audit-receipts §2)
  receipt(root, { outcome: 'refused — </script><img src=x onerror=window.__hit=1>', what: 'switch-flip (T2)' });
  const html = fs.readFileSync(renderBrainView(root, swFile, DAY, { now: NOW }).path, 'utf8');
  assert.equal((html.match(/<\/script>/g) || []).length, 1, 'payload did NOT open a second </script>');
  assert.ok(!html.includes('<img'), 'payload never becomes a real <img> tag');
  assert.ok(html.includes('&lt;img'), 'payload is present, but escaped as inert text');
  assert.ok(!html.includes('.innerHTML'), 'client builds DOM with textContent, never innerHTML');
  const embed = /var NODES=(\[.*?\]);/.exec(html);
  assert.ok(embed, 'snapshot embed present');
  assert.ok(!embed[1].includes('<'), 'embedded JSON carries no raw < (escapeForEmbed)');
  assert.ok(Array.isArray(JSON.parse(embed[1])), 'embed is valid JSON the client can parse');
});

test('SECURITY: escapeForEmbed neutralizes </script and roundtrips (v2 B1, ready for Slice 2)', () => {
  const payload = { o: 'refused — </script><img src=x onerror=window.__hit=1>', t: 'client- -sep' };
  const out = escapeForEmbed(payload);
  assert.ok(!out.includes('</script'), 'no </script breakout');
  assert.ok(!out.includes(' '), 'no raw line separator');
  assert.deepEqual(JSON.parse(out), payload, 'roundtrips to the exact value');
});

test('Slice-2 camera: A1 parity — both layers get the SAME converted transform (labels stay on nodes)', () => {
  for (const w of [640, 1280, 2560, 3840]) {
    for (const c of [{ tx: 0, ty: 0, s: 1 }, { tx: 120, ty: -80, s: 2.5 }, { tx: -340, ty: 210, s: 0.6 }]) {
      const t = computeTransforms(c.tx, c.ty, c.s, w);
      assert.equal(t.svg, svgCameraTransform(c.tx, c.ty, c.s));
      assert.equal(t.label, labelCameraTransform(c.tx, c.ty, c.s, w));
      // the invariant that matters: a node projects to the same screen px via either layer
      const a = svgScreenPos(300, 122, c.tx, c.ty, c.s, w);
      const b = labelScreenPos(300, 122, c.tx, c.ty, c.s, w);
      assert.ok(Math.abs(a.x - b.x) < 1e-9 && Math.abs(a.y - b.y) < 1e-9, `w=${w} s=${c.s}`);
    }
  }
});

test('Slice-2 camera: client JS is view-only, reduced-motion gated, and transforms BOTH layers', () => {
  const js = cameraClientJs('[{"id":"app-0","x":300,"y":122}]');
  new Function(js); // parses as valid JS
  assert.ok(js.includes("g.setAttribute('transform'"), 'SVG camera group transformed');
  assert.ok(js.includes('layer.style.transform'), 'label layer transformed');
  assert.ok(js.includes("layer.style.transformOrigin='0 0'"), 'origin 0 0 — required for the parity math');
  assert.ok(/reduce=matchMedia/.test(js) && /if\(reduce\)\{cam\.tx=to\.tx/.test(js), 'reduced-motion gates the rAF tween at init');
  assert.ok(!js.includes('innerHTML') && !/fetch\(|XMLHttpRequest|WebSocket\(|sendBeacon/.test(js), 'no innerHTML, no network');
});

test('Slice-2 render: nodes are focusable, aria-live announcer + view controls present', () => {
  const { root, swFile } = fresh();
  receipt(root);
  const html = fs.readFileSync(renderBrainView(root, swFile, DAY, { now: NOW }).path, 'utf8');
  assert.ok(html.includes('<g class="camera">'), 'camera group wraps the vectors');
  assert.ok(/data-node="app-0"[^>]*|tabindex="0"[^>]*data-node="app-0"/.test(html) || html.includes('data-node="app-0"'), 'nodes carry focus ids');
  assert.ok(html.includes('tabindex="0"') && html.includes('role="button"'), 'nodes keyboard-focusable');
  assert.ok(html.includes('id="ann"') && html.includes('aria-live="polite"'), 'screen-reader announcer');
  assert.ok(html.includes('var NODES='), 'node index embedded for focus/keyboard nav');
});

test('NBA is a RANKED rail (collect-all-true, not first-match): multiple issues -> multiple lines', () => {
  const { root, swFile } = fresh();
  // two independent true conditions: no doctor receipt today + unsigned anchor
  // (run unkeyed so anchorStatus reports 'warn'). v1 short-circuited to one; v2 collects both.
  const key = process.env.HERMES_ANCHOR_KEY;
  delete process.env.HERMES_ANCHOR_KEY;
  try {
    const d = gatherBrainData(root, swFile, DAY, { now: NOW });
    assert.ok(Array.isArray(d.nbaRail) && d.nbaRail.length >= 2, `ranked rail: ${JSON.stringify(d.nbaRail)}`);
    assert.equal(d.nba, d.nbaRail[0], 'nba is the loudest rail item');
    assert.match(d.nbaRail.join(' '), /doctor|anchor/);
  } finally { process.env.HERMES_ANCHOR_KEY = key; }
});

test('NBA truthfulness: quiet day all-green; unreadable switches dominate + health red', () => {
  const { root, swFile } = fresh();
  receipt(root);
  const quiet = gatherBrainData(root, swFile, DAY, { now: NOW });
  assert.ok(/all quiet|inbox memo|anchor degraded/.test(quiet.nba), quiet.nba);
  const broken = gatherBrainData(root, path.join(root, 'nope.json'), DAY, { now: NOW });
  assert.match(broken.nba, /switches file unreadable/);
  assert.equal(broken.health, 'red');
});

test('hourly sparkline counts receipts into UTC buckets', () => {
  const { root, swFile } = fresh();
  receipt(root, { when: `${DAY}T08:10:00Z` });
  receipt(root, { when: `${DAY}T08:40:00Z` });
  receipt(root, { when: `${DAY}T19:05:00Z` });
  const d = gatherBrainData(root, swFile, DAY, { now: NOW });
  assert.ok(d.hourly[8] >= 2 && d.hourly[19] >= 1);
});

test('degrades honestly: no receipts, missing repo stores -> renders, never crashes, shows fail-closed', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hermes-brain-'));
  ensureLanes(root);
  const html = fs.readFileSync(renderBrainView(root, path.join(root, 'never.json'), DAY, { now: NOW }).path, 'utf8');
  assert.match(html, /switches UNREADABLE|fail closed/);
});

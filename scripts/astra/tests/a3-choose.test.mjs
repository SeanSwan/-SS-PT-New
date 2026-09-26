/**
 * a3-choose.test.mjs — the Choose pane's contract, and the contrast audit.
 *
 * THIS FILE EXISTS BECAUSE `04-TESTS-TRACEABILITY.md` ASSIGNS FOUR TESTS TO SLICE A3
 * AND A3 BUILT NONE OF THEM. The slice's own exit criterion (`T-A-01`/`T-A-03`/`T-A-05`
 * + `AC4.6`) was met, but §3's traceability rows put `T-U-02`, `T-U-03`, `T-I-07` and
 * `T-A-04` on A3 as well. Recording them as "not run" would have been the silent
 * omission this packet keeps fixing, so they are built here instead.
 *
 * Kept in its own file rather than appended to `a3-surface.test.mjs` (273 lines) or
 * `panes.mjs` (289 lines), because both are close to Rule 4's 300-line cap.
 *
 * T-U-02 AND T-U-03 ARE BOTH "THE CARD MUST NOT OVERCLAIM" TESTS. `AC2.2` makes the
 * tier badge load-bearing: a `prior` card that shows the word `EVIDENCE`, or a swatch
 * strip that varies between renders, would be decoration pretending to be information.
 *
 * T-A-04 USES THE REPO'S OWN INSTRUMENT. `packages/swan-forge/scripts/audit-contrast.mjs`
 * exports `contrastRatio`, so Astra's palette is measured by the same rule the design
 * system uses — not by a second implementation that could disagree with it.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { renderDirections, renderThink } from '../surface/panes.mjs';
import { swatchesFor } from '../../../shared/swanDirections.mjs';
import { CONTROLS, controlsForPane } from '../surface/controls.mjs';
import { contrastRatio } from '../../../packages/swan-forge/scripts/audit-contrast.mjs';

const CSS_PATH = fileURLToPath(new URL('../static/astra.css', import.meta.url));
const css = readFileSync(CSS_PATH, 'utf8');

/** Read `--name: #hex;` declarations out of the stylesheet's own `:root`. */
function cssVars(text) {
  const out = {};
  for (const m of text.matchAll(/(--[a-z-]+):\s*(#[0-9a-fA-F]{3,8})\s*;/g)) out[m[1]] = m[2];
  return out;
}
const V = cssVars(css);

const direction = (over = {}) => ({
  name: 'Obsidian Plane', sentence: 'a low plane of cold light', phenomenon: 'the ice breathes',
  facets: ['optics', 'material'], paletteLaw: 'A-swan-native', swatches: swatchesFor(['optics', 'material']),
  tier: 'prior', tierReason: 'no picks injected — cold start', evidenceEventIds: [], ...over,
});

// ---------------------------------------------------------------------------
// T-U-02 — the tier badge is load-bearing, not decoration
// ---------------------------------------------------------------------------

test('T-U-02 a prior direction renders PRIOR, and never EVIDENCE', () => {
  const html = renderDirections({ directions: [direction()] });
  assert.match(html, /badge-prior/, 'the card must carry the prior badge class');
  assert.match(html, />PRIOR</, 'the visible text must say PRIOR');
  // The forbidden side effect is the whole point: a card that shows both words
  // tells the operator nothing, because they cannot tell which one is the finding.
  assert.doesNotMatch(html, /EVIDENCE/, 'a prior card must not contain the word EVIDENCE at all');
  assert.match(html, /no picks injected/, 'AC2.2 requires the tier REASON to render with the badge');
});

test('T-U-02 an evidence direction renders EVIDENCE and cites the event ids', () => {
  const html = renderDirections({
    directions: [direction({
      tier: 'evidence', tierReason: '2 of your own picks agree', evidenceEventIds: ['ev-1', 'ev-2'],
    })],
  });
  assert.match(html, /badge-evidence/);
  assert.match(html, />EVIDENCE</);
  assert.match(html, /ev-1, ev-2/, 'tier is truth — an evidence card must name the events behind it');
  assert.doesNotMatch(html, /badge-prior/, 'the two tiers must not render the same card class');
});

// ---------------------------------------------------------------------------
// T-U-03 — the swatch strip is a property, not a decoration
// ---------------------------------------------------------------------------

test('T-U-03 swatches derived from fixed facets are byte-identical twice', () => {
  const a = JSON.stringify(swatchesFor(['optics', 'material', 'light']));
  const b = JSON.stringify(swatchesFor(['optics', 'material', 'light']));
  assert.equal(a, b, 'the same facets must produce the same strip, or the card is not a stable claim');

  const full1 = renderDirections({ directions: [direction()] });
  const full2 = renderDirections({ directions: [direction()] });
  assert.equal(full1, full2, 'rendering the same direction twice must be byte-identical');
});

test('T-U-03 the strip carries no image bytes and reaches no network', () => {
  const strip = swatchesFor(['optics']);
  const hexes = strip.map((s) => s.hex);
  assert.ok(hexes.every((h) => /^#[0-9a-f]{6}$/i.test(h)), 'a swatch must be a plain hex, not a URL');
  // The forbidden side effect: `AC2.3` says the strip is derived, so a data-URI, a
  // url(), or an http reference would mean bytes came from somewhere else.
  const blob = JSON.stringify(strip);
  assert.doesNotMatch(blob, /data:|url\(|https?:\/\//i, 'no embedded or fetched image bytes');
  // Different facets must produce a different strip, or the derivation is a constant.
  assert.notEqual(JSON.stringify(swatchesFor(['optics'])), JSON.stringify(swatchesFor(['material'])));
});

// ---------------------------------------------------------------------------
// T-I-07 (no-override half) — a failed LAW check offers no way past it
// ---------------------------------------------------------------------------

test('T-I-07 the Law pane offers NO override affordance — by construction, not by wording', () => {
  // THE STRUCTURAL GUARANTEE, and the reason this test does not grep for the word
  // "override": `slots.stageOverrides` is one of the THREE LEGAL DIALS and its name
  // contains the word. A substring scan for "override" therefore fires on the dial the
  // packet explicitly permits — a scan that cannot tell a legal dial from a LAW bypass.
  // (Same class as A2's D11: a scan reading a declaration as the thing declared.)
  assert.deepEqual(controlsForPane('law'), [], 'no control may live on the Law pane');
  assert.deepEqual(controlsForPane('state'), [], 'no control may live on the State pane');

  // The legal dial is legal BECAUSE it acts on the slot layer of one compile, never on
  // a law check. Asserting that is what makes the name coincidence a documented fact
  // rather than a blind spot. (`effect` is the registry's "what it affects" field; the
  // human name lives in `label`.)
  const stage = CONTROLS.find((c) => c.id === 'slots.stageOverrides');
  assert.ok(stage, 'the slot override dial must exist');
  assert.equal(stage.kind, 'dial', 'the slot override layer is one of the three LEGAL dials');
  assert.match(stage.label, /override/i, 'its label is where the word "override" lives');
  assert.doesNotMatch(stage.effect, /\blaw\b|lawCheck/i, 'a legal dial must not touch the LAW filter');
  assert.ok(stage.pane !== 'law' && stage.pane !== 'state', 'it is not a control on a read-only pane');

  // The strongest form: render a BLOCKED compile and require that every control it
  // emits belongs to a pane that is not the Law or State pane.
  const html = renderThink({
    view: {
      blocked: true, partial: false, brainVersion: 'x', slots: [], capabilities: {}, promptText: '',
      lawChecks: [
        { law: 'kill-list', passed: true, detail: null, slot: null },
        { law: 'LAW4-optics', passed: false, detail: 'literal creature', slot: 'optics' },
      ],
    },
    compileId: 'cmp-blocked',
  });
  const emitted = [...html.matchAll(/data-control="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(emitted.length > 0, 'the Think pane must still render its own controls');
  for (const id of emitted) {
    const c = CONTROLS.find((x) => x.id === id);
    assert.ok(c, `${id} is rendered but not registered`);
    assert.ok(c.pane !== 'law' && c.pane !== 'state',
      `${id} lives on the read-only pane "${c.pane}" — a failed check must have no way past it`);
  }
  assert.match(html, /E_LAW_VIOLATION/, 'the refusal is named, not silent');
  assert.match(html, /optics/, 'the offending slot is named');
});

// ---------------------------------------------------------------------------
// T-A-04 — the contrast audit, using the repo's own instrument
// ---------------------------------------------------------------------------

/** Every TEXT pair Astra actually paints, and the WCAG minimum it must clear. */
const TEXT_PAIRS = [
  ['ink on page', '--ink', '--bg', 4.5],
  ['ink on panel', '--ink', '--panel', 4.5],
  ['muted on page', '--muted', '--bg', 4.5],
  ['muted on panel', '--muted', '--panel', 4.5],
  ['accent on page', '--accent', '--bg', 4.5],
  ['accent on panel', '--accent', '--panel', 4.5],
  ['pass on panel', '--pass', '--panel', 4.5],
  ['fail on panel', '--fail', '--panel', 4.5],
  ['prior on panel', '--prior', '--panel', 4.5],
];

/**
 * NON-TEXT pairs that were measured and are deliberately NOT audited as text.
 *
 * `T-A-04` is about TEXT. Recording these explicitly — with a reason — is what stops
 * the exemption list from becoming a place to hide a failing text pair: the test
 * below asserts every entry here is genuinely a non-text pair.
 */
const NON_TEXT_EXEMPT = [
  {
    pair: ['--line', '--panel'],
    measured: 1.32,
    why: 'a decorative 1px panel edge. WCAG 1.4.11 governs non-text UI where the graphic '
      + 'is the ONLY means of conveying the information; here panels are separated by layout, '
      + 'spacing and a distinct surface, and no state or affordance is signalled by the edge alone.',
  },
];

test('T-A-04 every text pair Astra paints meets the repo contrast rule', () => {
  const failures = [];
  for (const [name, fg, bg, min] of TEXT_PAIRS) {
    assert.ok(V[fg], `${fg} must be declared in astra.css`);
    assert.ok(V[bg], `${bg} must be declared in astra.css`);
    const ratio = contrastRatio(V[fg], V[bg]);
    if (ratio < min) failures.push(`${name} (${fg} on ${bg}) = ${ratio.toFixed(2)}:1, needs ${min}:1`);
  }
  assert.deepEqual(failures, [], `text pairs below the WCAG minimum:\n  ${failures.join('\n  ')}`);
});

test('T-A-04 the non-text exemptions are explicit, reasoned, and not text pairs', () => {
  const textPairs = new Set(TEXT_PAIRS.map(([, fg, bg]) => `${fg}|${bg}`));
  for (const ex of NON_TEXT_EXEMPT) {
    assert.ok(ex.why && ex.why.length > 40, `${ex.pair.join('/')} needs a real reason, not a label`);
    assert.ok(typeof ex.measured === 'number', `${ex.pair.join('/')} must record its measured ratio`);
    // THE GUARD THAT MATTERS: a text pair must not be quietly moved into this list.
    assert.ok(!textPairs.has(`${ex.pair[0]}|${ex.pair[1]}`),
      `${ex.pair.join('/')} is a TEXT pair and may not be exempted`);
    // And the recorded ratio must be the one the instrument actually computes.
    const actual = contrastRatio(V[ex.pair[0]], V[ex.pair[1]]);
    assert.ok(Math.abs(actual - ex.measured) < 0.02,
      `recorded ${ex.measured} but measured ${actual.toFixed(2)} — the note has gone stale`);
  }
});

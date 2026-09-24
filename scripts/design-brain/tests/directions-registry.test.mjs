/**
 * directions-registry.test.mjs — the Direction Registry's own gate.
 *
 * Two levels, following the discipline in scripts/design-brain/README.md:
 *   · unit  — the validator and the selector against synthetic directions
 *   · real  — the actual registry on disk, which is what ships
 *
 * The hostile-review lesson recorded in that README is honoured here: **for every guard,
 * there is a test for the case it must NOT catch.** A guard that only gets tested on the
 * input it should reject will happily reject everything.
 *
 * Run: npm run design-brain:test    (or)    node --test "scripts/design-brain/tests/*.test.mjs"
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  contrastRatio,
  luminance,
  extractDirectionBlock,
  validateDirection,
  validateRegistry,
  loadRegistry,
  REQUIRED_ROLES,
} from '../directions/validate-directions.mjs';

import { selectDirection, hashBrief, isEligible, ledgerEntry, readLedger } from '../directions/select.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..', '..', '..');
const DIRS = path.join(REPO_ROOT, 'docs', 'ai-workflow', 'design-brain', 'directions');

const BASE = {
  schema: 'swan-direction/1',
  id: 'test-dir',
  name: 'Test Direction',
  version: '1.0.0',
  status: 'experimental',
  theme_id: null,
  theme_source: null,
  scope: ['product'],
  feel: 'A synthetic direction that exists only to exercise the validator and the selector.',
  match_terms: ['testing'],
  ground_inverts: false,
  palette: {
    ground: '#101010',
    surface: '#181818',
    panel: '#202020',
    text: '#F0F0F0',
    muted: '#9A9A9A',
    focus: '#FFD400',
    rare: '#00C2A8',
  },
  contrast_pairs: [
    { fg: 'text', bg: 'ground', min: 4.5, role: 'body on page' },
    { fg: 'muted', bg: 'ground', min: 4.5, role: 'secondary' },
  ],
  contrast_exceptions: [],
  type: {
    display: "'Sora', system-ui, sans-serif",
    body: "'Plus Jakarta Sans', system-ui, sans-serif",
    mono: "'Fira Code', monospace",
  },
  radius: 'inherit',
  space: 'inherit',
  motion: {
    easings: { out: 'ease-out' },
    durations: { fast: '140ms' },
    signature_budget: 1,
    gate: ['css', 'js'],
  },
  glow: {
    rule: 'dual-button',
    primary: { bg: 'focus', glow: 'rare' },
    accent: { bg: 'rare', glow: 'focus' },
  },
  signature: { name: 'Test device', device: 'A device that exists only so the validator has something to check.' },
  bans: [],
  evidence: ['synthetic fixture'],
  derived_roles: [],
  supersedes: null,
};

const make = (over = {}) => ({ ...structuredClone(BASE), ...over });
const expectClean = (dir, id = dir.id) => {
  const errs = validateDirection(dir, id);
  assert.deepEqual(errs, [], `expected a clean direction, got:\n  ${errs.join('\n  ')}`);
};
const expectError = (dir, fragment, id = dir.id) => {
  const errs = validateDirection(dir, id);
  assert.ok(
    errs.some((e) => e.toLowerCase().includes(fragment.toLowerCase())),
    `expected an error mentioning ${JSON.stringify(fragment)}, got:\n  ${errs.join('\n  ') || '(none)'}`
  );
};

// ── Contrast arithmetic ────────────────────────────────────────────────────────

describe('WCAG contrast arithmetic', () => {
  test('the extremes are exact', () => {
    assert.equal(contrastRatio('#FFFFFF', '#000000').toFixed(2), '21.00');
    assert.equal(contrastRatio('#FFFFFF', '#FFFFFF').toFixed(2), '1.00');
  });

  test('it is symmetric — order must not matter', () => {
    const a = contrastRatio('#F5E003', '#05060D');
    const b = contrastRatio('#05060D', '#F5E003');
    assert.equal(a.toFixed(6), b.toFixed(6));
  });

  test('a known pair lands where WCAG says it should', () => {
    // #767676 on #FFFFFF is the canonical "exactly 4.5:1" boundary pair.
    const r = contrastRatio('#767676', '#FFFFFF');
    assert.ok(r >= 4.5 && r < 4.6, `expected ~4.54, got ${r.toFixed(3)}`);
  });

  test('luminance is monotonic in lightness', () => {
    assert.ok(luminance('#000000') < luminance('#808080'));
    assert.ok(luminance('#808080') < luminance('#FFFFFF'));
  });
});

// ── Extraction ─────────────────────────────────────────────────────────────────

describe('payload extraction', () => {
  test('it finds the json direction block', () => {
    const md = 'prose\n\n```json direction\n{"a":1}\n```\n\nmore prose\n';
    const r = extractDirectionBlock(md);
    assert.equal(r.ok, true);
    assert.deepEqual(r.value, { a: 1 });
  });

  test('it reports a missing block rather than throwing', () => {
    const r = extractDirectionBlock('no block here');
    assert.equal(r.ok, false);
    assert.match(r.error, /no .*block/i);
  });

  test('it reports malformed JSON rather than throwing', () => {
    const r = extractDirectionBlock('```json direction\n{ nope }\n```');
    assert.equal(r.ok, false);
    assert.match(r.error, /not valid JSON/i);
  });

  test('a bare ```json fence is NOT accepted — the info string is the contract', () => {
    const r = extractDirectionBlock('```json\n{"a":1}\n```');
    assert.equal(r.ok, false);
  });
});

// ── Structural validation ──────────────────────────────────────────────────────

describe('structural validation', () => {
  test('the baseline fixture is clean', () => expectClean(make()));

  test('id must equal the filename stem', () => {
    expectError(make({ id: 'other-dir' }), 'must equal the filename stem', 'test-dir');
  });

  test('a missing required role fails', () => {
    const pal = structuredClone(BASE.palette);
    delete pal.muted;
    expectError(make({ palette: pal }), 'missing the required role "muted"');
  });

  test('an unknown palette role fails — the schema is closed', () => {
    const pal = { ...structuredClone(BASE.palette), 'sneaky-role': '#123456' };
    expectError(make({ palette: pal }), 'not in the allowed set');
  });

  test('a malformed hex fails', () => {
    const pal = { ...structuredClone(BASE.palette), ground: '#12345' };
    expectError(make({ palette: pal }), 'must be a 6-digit hex');
  });

  test('a banned display face fails', () => {
    const type = { ...structuredClone(BASE.type), display: "'Inter', system-ui, sans-serif" };
    expectError(make({ type }), 'banned display face');
  });

  test('a banned face in BODY does not fail — only display faces are banned', () => {
    const type = { ...structuredClone(BASE.type), body: "-apple-system, 'Inter', system-ui, sans-serif" };
    expectClean(make({ type }));
  });

  test('a single-gated motion config fails', () => {
    const motion = { ...structuredClone(BASE.motion), gate: ['css'] };
    expectError(make({ motion }), 'must include BOTH');
  });

  test('a signature-less direction fails — it would be a palette, not a direction', () => {
    expectError(make({ signature: { name: '', device: 'x'.repeat(30) } }), 'signature.name');
  });

  test('no evidence fails', () => {
    expectError(make({ evidence: [] }), 'evidence must be non-empty');
  });

  test('an out-of-range signature budget fails', () => {
    const motion = { ...structuredClone(BASE.motion), signature_budget: 5 };
    expectError(make({ motion }), 'signature_budget must be an integer 0..2');
  });

  test('a glow pointing at a non-existent role fails', () => {
    const glow = { rule: 'dual-button', primary: { bg: 'focus', glow: 'nope' }, accent: { bg: 'rare', glow: 'focus' } };
    expectError(make({ glow }), 'not a role in this direction');
  });

  test('the required seven are exactly what design-bridge fixes', () => {
    assert.deepEqual(REQUIRED_ROLES, ['ground', 'surface', 'panel', 'text', 'muted', 'focus', 'rare']);
  });
});

// ── Contrast enforcement ───────────────────────────────────────────────────────

describe('contrast enforcement', () => {
  test('a pair below its declared minimum fails', () => {
    const pal = { ...structuredClone(BASE.palette), muted: '#2A2A2A' };
    expectError(make({ palette: pal }), 'below the declared minimum');
  });

  test('a pair that exactly meets its minimum passes', () => {
    // #767676 on #FFFFFF measures ~4.54, just over the 4.5 floor.
    const pal = { ...structuredClone(BASE.palette), ground: '#FFFFFF', text: '#767676' };
    const dir = make({ palette: pal, contrast_pairs: [{ fg: 'text', bg: 'ground', min: 4.5, role: 'body' }] });
    expectClean(dir);
  });

  test('a pair referencing an unknown role fails', () => {
    const dir = make({ contrast_pairs: [{ fg: 'ghost', bg: 'ground', min: 4.5, role: 'body' }] });
    expectError(dir, 'is not a role in this direction');
  });

  test('an empty contrast_pairs fails — a direction with no measured pairs is a guess', () => {
    expectError(make({ contrast_pairs: [] }), 'non-empty array');
  });

  test('an exception with an accurate number passes', () => {
    const pal = { ...structuredClone(BASE.palette), line: '#2A2A2A' };
    const measured = Number(contrastRatio(pal.line, pal.ground).toFixed(2));
    const dir = make({
      palette: pal,
      contrast_exceptions: [{
        fg: 'line', bg: 'ground', measured,
        reason: 'A decorative hairline that carries no state of its own.',
        compensated_by: 'Focus rings carry every interactive boundary at well over 3:1.',
      }],
    });
    expectClean(dir);
  });

  test('an exception with a STALE number fails — a stale number is worse than none', () => {
    const pal = { ...structuredClone(BASE.palette), line: '#2A2A2A' };
    const dir = make({
      palette: pal,
      contrast_exceptions: [{
        fg: 'line', bg: 'ground', measured: 9.99,
        reason: 'A decorative hairline that carries no state of its own.',
        compensated_by: 'Focus rings carry every interactive boundary at well over 3:1.',
      }],
    });
    expectError(dir, 'recorded measured');
  });

  test('an exception cannot launder a pair that actually passes', () => {
    const dir = make({
      contrast_exceptions: [{
        fg: 'text', bg: 'ground', measured: 16.7,
        reason: 'This pair passes easily and should not be an exception at all.',
        compensated_by: 'There is nothing to compensate for, which is the point of this test.',
      }],
    });
    expectError(dir, 'that passes, so it is not an exception');
  });

  test('an exception with a token-length mechanism fails — a placeholder is not a mechanism', () => {
    const pal = { ...structuredClone(BASE.palette), line: '#2A2A2A' };
    const dir = make({
      palette: pal,
      contrast_exceptions: [{
        fg: 'line', bg: 'ground', measured: Number(contrastRatio(pal.line, pal.ground).toFixed(2)),
        reason: 'Decorative hairline.',
        compensated_by: 'n/a',
      }],
    });
    expectError(dir, 'must be a real mechanism');
  });
});

// ── Registry-wide checks ───────────────────────────────────────────────────────

describe('registry-wide checks', () => {
  const dirsOf = (list) => list.map((dir, i) => ({ file: `${dir.id}.md`, id: dir.id, dir }));
  const registryOf = (list, extra = {}) => ({
    schema: 'swan-direction-registry/1',
    directions: list.map((d) => ({
      id: d.id, file: `${d.id}.md`, status: d.status, theme_id: d.theme_id,
      ground_inverts: Boolean(d.ground_inverts), scope: d.scope, signature: d.signature?.name,
    })),
    ...extra,
  });

  const A = make({ id: 'aaa', match_terms: ['alpha'], signature: { name: 'Alpha device', device: 'A device for the alpha direction in this synthetic fixture.' } });
  const B = make({ id: 'bbb', match_terms: ['beta'], ground_inverts: true, signature: { name: 'Beta device', device: 'A device for the beta direction in this synthetic fixture.' } });

  test('a consistent registry passes', () => {
    const errs = validateRegistry({ registry: registryOf([A, B]), directions: dirsOf([A, B]) });
    assert.deepEqual(errs, []);
  });

  test('registry/file drift on status is caught', () => {
    const reg = registryOf([A, B]);
    reg.directions[0].status = 'canonical';
    const errs = validateRegistry({ registry: reg, directions: dirsOf([A, B]) });
    assert.ok(errs.some((e) => e.includes('registry says aaa.status')));
  });

  test('an unlisted direction file is caught', () => {
    const errs = validateRegistry({ registry: registryOf([A]), directions: dirsOf([A, B]) });
    assert.ok(errs.some((e) => e.includes('exists but is not listed')));
  });

  test('a registry entry with no file is caught', () => {
    const errs = validateRegistry({ registry: registryOf([A, B]), directions: dirsOf([A]) });
    assert.ok(errs.some((e) => e.includes('no bbb.md was loaded')));
  });

  test('a match_terms collision is caught — it would collapse the registry to one answer', () => {
    const C = make({ id: 'ccc', match_terms: ['alpha'], signature: { name: 'Gamma device', device: 'A device for the gamma direction in this fixture.' } });
    const errs = validateRegistry({ registry: registryOf([A, C]), directions: dirsOf([A, C]) });
    assert.ok(errs.some((e) => e.includes('match_terms collision')));
  });

  test('a shared signature is caught — two directions differing only in hue are one direction', () => {
    const C = make({ id: 'ccc', match_terms: ['gamma'], signature: { name: 'Alpha device', device: 'The same device under a different name, which is the defect.' } });
    const errs = validateRegistry({ registry: registryOf([A, C]), directions: dirsOf([A, C]) });
    assert.ok(errs.some((e) => e.includes('share the signature')));
  });

  test('the breadth rule fails a registry of two dark directions', () => {
    const D2 = make({ id: 'ddd', match_terms: ['delta'], signature: { name: 'Delta device', device: 'A second dark direction, so the registry claims variety it does not have.' } });
    const errs = validateRegistry({ registry: registryOf([A, D2]), directions: dirsOf([A, D2]) });
    assert.ok(errs.some((e) => e.includes('breadth rule')));
  });

  test('the breadth rule passes once one direction inverts the ground', () => {
    const errs = validateRegistry({ registry: registryOf([A, B]), directions: dirsOf([A, B]) });
    assert.ok(!errs.some((e) => e.includes('breadth rule')));
  });

  test('a SINGLE-direction registry does NOT trip the breadth rule — it claims no variety yet', () => {
    const errs = validateRegistry({ registry: registryOf([A]), directions: dirsOf([A]) });
    assert.ok(!errs.some((e) => e.includes('breadth rule')));
  });

  test('a quarantined direction does not satisfy the breadth rule', () => {
    const D2 = make({ id: 'ddd', match_terms: ['delta'], signature: { name: 'Delta device', device: 'A second dark direction, so the registry claims variety it does not have.' } });
    const Q = make({ id: 'qqq', status: 'quarantined', match_terms: ['q'], ground_inverts: true, signature: { name: 'Q device', device: 'A quarantined device that must not count toward breadth.' } });
    const errs = validateRegistry({ registry: registryOf([A, D2, Q]), directions: dirsOf([A, D2, Q]) });
    assert.ok(errs.some((e) => e.includes('breadth rule')), 'the only ground-inverting direction is quarantined, so breadth is not satisfied');
  });

  test('known_themes accounting that does not add up is caught', () => {
    const reg = registryOf([A, B], {
      known_themes: { source: 'x', covered: 99, uncovered: 0, themes: [{ theme_id: 't1', direction: 'aaa' }, { theme_id: 't2', direction: null }] },
    });
    const errs = validateRegistry({ registry: reg, directions: dirsOf([A, B]) });
    assert.ok(errs.some((e) => e.includes('known_themes.covered says 99')));
    assert.ok(errs.some((e) => e.includes('known_themes.uncovered says 0')));
  });

  test('a known_themes row pointing at a missing direction is caught', () => {
    const reg = registryOf([A, B], {
      known_themes: { source: 'x', covered: 2, uncovered: 0, themes: [{ theme_id: 't1', direction: 'aaa' }, { theme_id: 't2', direction: 'ghost' }] },
    });
    const errs = validateRegistry({ registry: reg, directions: dirsOf([A, B]) });
    assert.ok(errs.some((e) => e.includes('which is not in registry.directions')));
  });
});

// ── The anti-convergence gate ──────────────────────────────────────────────────

describe('anti-convergence gate', () => {
  const DIRS_ = [
    { id: 'alpha', status: 'experimental', scope: ['product'], match_terms: ['dashboard'] },
    { id: 'beta', status: 'experimental', scope: ['product'], match_terms: ['beta'] },
    { id: 'gamma', status: 'experimental', scope: ['product'], match_terms: ['gamma'] },
  ];
  const three = (id, pinned = false) => Array.from({ length: 3 }, () => ({ direction: id, surface_class: 'product', pinned, mode: pinned ? 'pinned' : 'matched' }));

  test('the fourth identical unpinned match is REFUSED', () => {
    const r = selectDirection({ directions: DIRS_, brief: 'build me a dashboard', surfaceClass: 'product', ledger: three('alpha') });
    assert.equal(r.ok, false);
    assert.equal(r.refused, true);
    assert.match(r.reason, /REFUSED/);
    assert.ok(r.candidates.includes('beta') && r.candidates.includes('gamma'));
  });

  test('three PINNED selections do NOT refuse — a pin with a reason is a legitimate answer', () => {
    const r = selectDirection({ directions: DIRS_, brief: 'build me a dashboard', surfaceClass: 'product', ledger: three('alpha', true) });
    assert.equal(r.ok, true);
    assert.equal(r.direction, 'alpha');
  });

  test('a window that is not yet full does NOT refuse', () => {
    const ledger = three('alpha').slice(0, 2);
    const r = selectDirection({ directions: DIRS_, brief: 'build me a dashboard', surfaceClass: 'product', ledger });
    assert.equal(r.ok, true);
    assert.equal(r.direction, 'alpha');
  });

  test('a DIFFERENT brief that matches elsewhere does NOT refuse', () => {
    const r = selectDirection({ directions: DIRS_, brief: 'something with beta in it', surfaceClass: 'product', ledger: three('alpha') });
    assert.equal(r.ok, true);
    assert.equal(r.direction, 'beta');
  });

  test('the window is per surface class — a different class does NOT refuse', () => {
    const ledger = Array.from({ length: 3 }, () => ({ direction: 'alpha', surface_class: 'marketing', pinned: false, mode: 'matched' }));
    const r = selectDirection({ directions: DIRS_, brief: 'build me a dashboard', surfaceClass: 'product', ledger });
    assert.equal(r.ok, true);
  });

  test('a non-contiguous history does NOT refuse — only the last N in order count', () => {
    const ledger = [
      { direction: 'alpha', surface_class: 'product', pinned: false },
      { direction: 'beta', surface_class: 'product', pinned: false },
      { direction: 'alpha', surface_class: 'product', pinned: false },
      { direction: 'alpha', surface_class: 'product', pinned: false },
    ];
    const r = selectDirection({ directions: DIRS_, brief: 'build me a dashboard', surfaceClass: 'product', ledger });
    assert.equal(r.ok, true);
  });

  test('pinning bypasses the gate and is recorded with its reason', () => {
    const r = selectDirection({ directions: DIRS_, brief: 'build me a dashboard', surfaceClass: 'product', ledger: three('alpha'), pinnedId: 'alpha', pinReason: 'this is the client-facing storefront and must be house style' });
    assert.equal(r.ok, true);
    assert.equal(r.mode, 'pinned');
    assert.match(r.reason, /pinned/);
  });

  test('a pin with no reason is rejected — a pin without a reason is indistinguishable from the default', () => {
    const r = selectDirection({ directions: DIRS_, brief: 'x', surfaceClass: 'product', ledger: [], pinnedId: 'alpha' });
    assert.equal(r.ok, false);
    assert.match(r.reason, /requires a reason/);
  });

  test('pinning an ineligible direction is rejected', () => {
    const dirs = [{ id: 'op', status: 'experimental', scope: ['operator'], match_terms: [] }];
    const r = selectDirection({ directions: dirs, brief: 'x', surfaceClass: 'product', pinnedId: 'op', pinReason: 'a long enough reason here' });
    assert.equal(r.ok, false);
    assert.match(r.reason, /not eligible for surface class/);
  });

  test('pinning an unknown direction is rejected', () => {
    const r = selectDirection({ directions: DIRS_, brief: 'x', surfaceClass: 'product', pinnedId: 'ghost', pinReason: 'a long enough reason here' });
    assert.equal(r.ok, false);
    assert.match(r.reason, /not a known direction/);
  });

  test('no eligible direction is reported, not guessed', () => {
    const dirs = [{ id: 'op', status: 'experimental', scope: ['operator'], match_terms: [] }];
    const r = selectDirection({ directions: dirs, brief: 'x', surfaceClass: 'product' });
    assert.equal(r.ok, false);
    assert.match(r.reason, /no direction is eligible/);
  });

  test('a quarantined direction is never selected', () => {
    const dirs = [{ id: 'bad', status: 'quarantined', scope: ['product'], match_terms: ['dashboard'] }];
    const r = selectDirection({ directions: dirs, brief: 'dashboard', surfaceClass: 'product' });
    assert.equal(r.ok, false);
  });
});

// ── Rotation and determinism ───────────────────────────────────────────────────

describe('rotation and determinism', () => {
  const DIRS_ = [
    { id: 'a', status: 'experimental', scope: ['product'], match_terms: [] },
    { id: 'b', status: 'experimental', scope: ['product'], match_terms: [] },
    { id: 'c', status: 'experimental', scope: ['product'], match_terms: [] },
  ];

  test('with no match it rotates, and prefers the least recently used', () => {
    const ledger = [
      { direction: 'a', surface_class: 'product', pinned: false },
      { direction: 'b', surface_class: 'product', pinned: false },
    ];
    const r = selectDirection({ directions: DIRS_, brief: 'no terms here', surfaceClass: 'product', ledger });
    assert.equal(r.ok, true);
    assert.equal(r.mode, 'rotated');
    assert.equal(r.direction, 'c', 'c has never been used, so it must win');
  });

  test('a match beats rotation', () => {
    const dirs = [
      { id: 'a', status: 'experimental', scope: ['product'], match_terms: [] },
      { id: 'b', status: 'experimental', scope: ['product'], match_terms: ['dashboard'] },
    ];
    const r = selectDirection({ directions: dirs, brief: 'a dashboard please', surfaceClass: 'product', ledger: [] });
    assert.equal(r.mode, 'matched');
    assert.equal(r.direction, 'b');
  });

  test('the same brief twice gives the same answer', () => {
    const one = selectDirection({ directions: DIRS_, brief: 'identical brief', surfaceClass: 'product', ledger: [] });
    const two = selectDirection({ directions: DIRS_, brief: 'identical brief', surfaceClass: 'product', ledger: [] });
    assert.equal(one.direction, two.direction);
  });

  test('different briefs can give different answers — the tie-break is brief-stable', () => {
    const seen = new Set();
    for (const brief of ['alpha brief', 'beta brief', 'gamma brief', 'delta brief', 'epsilon brief', 'zeta brief']) {
      seen.add(selectDirection({ directions: DIRS_, brief, surfaceClass: 'product', ledger: [] }).direction);
    }
    assert.ok(seen.size > 1, `expected the tie-break to vary across briefs, got only ${[...seen].join(', ')}`);
  });

  test('the hash is stable and unsigned', () => {
    assert.equal(hashBrief('abc'), hashBrief('abc'));
    assert.notEqual(hashBrief('abc'), hashBrief('abd'));
    assert.ok(hashBrief('abc') >= 0);
  });

  test('eligibility respects status and scope', () => {
    assert.equal(isEligible({ status: 'canonical', scope: ['product'] }, 'product'), true);
    assert.equal(isEligible({ status: 'quarantined', scope: ['product'] }, 'product'), false);
    assert.equal(isEligible({ status: 'canonical', scope: ['operator'] }, 'product'), false);
  });

  test('a ledger entry is only built from a decision that was made', () => {
    const r = selectDirection({ directions: DIRS_, brief: 'x', surfaceClass: 'product', ledger: [] });
    const e = ledgerEntry({ result: r, brief: 'x', surfaceClass: 'product', agent: 'test' });
    assert.equal(e.direction, r.direction);
    assert.equal(e.mode, r.mode);
    assert.equal(e.surface_class, 'product');
    assert.equal(e.agent, 'test');
    assert.ok(e.at);
  });
});

// ── Ledger resilience ──────────────────────────────────────────────────────────

describe('ledger resilience', () => {
  const tmp = path.join(REPO_ROOT, 'scripts', 'design-brain', 'tests', '.tmp-ledger.jsonl');

  test('a missing ledger is empty, not an error', () => {
    const r = readLedger(path.join(REPO_ROOT, 'scripts', 'design-brain', 'tests', '.does-not-exist.jsonl'));
    assert.deepEqual(r, { entries: [], skipped: 0 });
  });

  test('malformed lines are skipped AND counted — a corrupt line must not disable the gate', () => {
    fs.writeFileSync(tmp, [
      JSON.stringify({ direction: 'a', surface_class: 'product' }),
      '{ this is not json',
      JSON.stringify({ no_direction_key: true }),
      '',
      JSON.stringify({ direction: 'b', surface_class: 'product' }),
    ].join('\n'), 'utf8');
    const r = readLedger(tmp);
    assert.equal(r.entries.length, 2);
    assert.equal(r.skipped, 2, 'one unparseable line and one object with no direction');
    fs.unlinkSync(tmp);
  });
});

// ── The real registry on disk ──────────────────────────────────────────────────

describe('the real registry on disk', () => {
  const { registry, directions, errors: loadErrors } = loadRegistry({ dirs: DIRS });

  test('every direction file parses', () => {
    assert.deepEqual(loadErrors, []);
  });

  test('every direction validates', () => {
    const errs = [];
    for (const { file, id, dir } of directions) {
      for (const e of validateDirection(dir, id)) errs.push(`${file}: ${e}`);
    }
    assert.deepEqual(errs, []);
  });

  test('the registry and the files agree', () => {
    assert.deepEqual(validateRegistry({ registry, directions }), []);
  });

  test('the registry carries the direction set it claims', () => {
    assert.ok(directions.length >= 5, `expected at least 5 directions, found ${directions.length}`);
    assert.ok(directions.some((d) => d.dir.id === 'cyberpunk-edgerunners'));
  });

  test('the breadth rule is satisfied by a real direction, not a fixture', () => {
    assert.ok(directions.some((d) => d.dir.ground_inverts === true), 'no real ground-inverting direction');
  });

  test('known_themes reports the uncovered runtime themes honestly', () => {
    const kt = registry.known_themes;
    assert.ok(kt.themes.length >= 10);
    assert.equal(kt.covered, kt.themes.filter((t) => t.direction).length);
    assert.equal(kt.uncovered, kt.themes.length - kt.covered);
  });

  test('the default runtime theme is recorded as uncovered — the gap is visible', () => {
    const dflt = registry.known_themes.themes.find((t) => t.theme_id === 'crystalline-dark');
    assert.ok(dflt, 'crystalline-dark must be listed');
    assert.equal(dflt.direction, null, 'crystalline-dark has no direction file yet, and the registry must say so');
  });

  test('codex-restraint carries the corrected tertiary value, not the AA-failing original', () => {
    const cr = directions.find((d) => d.dir.id === 'codex-restraint');
    assert.ok(cr, 'codex-restraint must be present');
    assert.notEqual(cr.dir.palette.muted.toLowerCase(), '#6b7280', 'the AA-failing original must not be registered');
    assert.ok(contrastRatio(cr.dir.palette.muted, cr.dir.palette.ground) >= 4.5);
  });
});

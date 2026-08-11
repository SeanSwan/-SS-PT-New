import test from 'node:test';
import assert from 'node:assert/strict';
import { applyLaws, assertLawful } from '../../../shared/swanLawFilter.mjs';

const clean = {
  intent: 'hero substrate for a public landing surface',
  medium: 'macro photograph',
  styleAnchor: "Anton Corbijn's classical photograph of refracted light",
  optics: 'tilt-shift lens, aperture 1.2, Kodak Portra 400',
  light: 'cold rim light from below, 4am colour temperature',
  palette: 'midnight sapphire dominant, ice wing accent, frost white text',
};

test('a lawful prompt passes with every check green', () => {
  const r = applyLaws(clean, ['Temperature>Arctic', 'Mark>FineLines']);
  assert.equal(r.passed, true);
  assert.equal(r.violations.length, 0);
  assert.ok(r.checks.every((c) => c.passed));
});

test('LAW 3 blocks the iridescent-gradient family', () => {
  const r = applyLaws({ ...clean, material: 'an iridescent gradient wash across the surface' });
  assert.equal(r.passed, false);
  assert.equal(r.violations[0].law, 'LAW3-kill-list');
  assert.equal(r.violations[0].slot, 'material');
});

test('LAW 3 blocks the named purple-to-cyan diagonal wash', () => {
  assert.equal(applyLaws({ ...clean, palette: 'purple -> cyan diagonal' }).passed, false);
  assert.equal(applyLaws({ ...clean, palette: 'cyan to purple sweep' }).passed, false);
});

test('LAW 3 blocks lens flare, causeless particles, and glass-on-glass', () => {
  for (const bad of ['heavy lens flare', 'floating particles everywhere', 'frosted glass on glass panels', 'glassmorphism card']) {
    assert.equal(applyLaws({ ...clean, light: bad }).passed, false, `should block: ${bad}`);
  }
});

test('LAW 4 blocks a literal creature', () => {
  const r = applyLaws({ ...clean, subject: 'a swan gliding across the water' });
  assert.equal(r.passed, false);
  assert.equal(r.violations[0].law, 'LAW4-optics-not-creatures');
});

test('LAW 4 ALLOWS a creature as a dark occluder — the sanctioned escape hatch', () => {
  // This is the shipped About-page pattern: the swan is bent light, never drawn.
  const r = applyLaws({ ...clean, subject: 'a swan as a dark occluder in a caustic field' });
  assert.equal(r.passed, true);
});

test('LAW 2 blocks gold outside its allowlist but permits the sanctioned roles', () => {
  assert.equal(applyLaws({ ...clean, palette: 'gold everywhere, gilded surfaces' }).passed, false);
  assert.equal(applyLaws({ ...clean, palette: 'gold on the PR numeral and its delta' }).passed, true);
  assert.equal(applyLaws({ ...clean, material: 'a 1px gold filigree line' }).passed, true);
});

test('retired Galaxy-Swan values are caught even inside a var() fallback', () => {
  const retired = '#' + '7851' + 'a9';
  const r = applyLaws({ ...clean, palette: `var(--accent, ${retired})` });
  assert.equal(r.passed, false);
  assert.equal(r.violations[0].law, 'LAW9-retired-palette');
});

test('LAW 10 blocks yoga/meditation language', () => {
  const r = applyLaws({ ...clean, intent: 'a calm yoga studio at sunrise' });
  assert.equal(r.passed, false);
  assert.equal(r.violations[0].law, 'LAW10-content');
});

test('LAW 10 blocks the forbidden credential form', () => {
  const joined = 'NASM' + '-certified';
  assert.equal(applyLaws({ ...clean, intent: `trainer, ${joined}` }).passed, false);
});

test('banned taxonomy facets are rejected, including dotted paths', () => {
  assert.equal(applyLaws(clean, ['Psychedelic']).passed, false);
  assert.equal(applyLaws(clean, ['Mood>Cute']).passed, false);
  assert.equal(applyLaws(clean, ['Mood>Subdued']).passed, true);
});

test('multiple violations are all reported, not just the first', () => {
  const r = applyLaws({ subject: 'a wolf', palette: 'gold everywhere', light: 'lens flare' });
  assert.ok(r.violations.length >= 3);
  const laws = new Set(r.violations.map((v) => v.law));
  assert.ok(laws.has('LAW4-optics-not-creatures'));
  assert.ok(laws.has('LAW2-gold-allowlist'));
  assert.ok(laws.has('LAW3-kill-list'));
});

test('assertLawful throws E_LAW_VIOLATION naming the slot, and never strips', () => {
  const slots = { ...clean, subject: 'a dragon' };
  assert.throws(
    () => assertLawful(slots),
    (e) => e.code === 'E_LAW_VIOLATION' && /slot "subject"/.test(e.message) && Array.isArray(e.violations),
  );
  // the input is untouched — blocking, not laundering
  assert.equal(slots.subject, 'a dragon');
});

test('empty and partial slot maps do not crash', () => {
  assert.equal(applyLaws({}).passed, true);
  assert.equal(applyLaws({ subject: undefined, intent: '' }).passed, true);
  assert.equal(applyLaws(undefined, undefined).passed, true);
});

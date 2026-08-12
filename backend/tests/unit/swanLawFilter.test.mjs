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

// ── Regressions: three defects found by adversarial dry-loop rounds ──────────

test('REGRESSION: hyphenated purple-to-cyan does not bypass (round 1)', () => {
  // Original pattern matched only "->", "→" and a spaced " to ".
  assert.equal(applyLaws({ palette: 'purple-to-cyan diagonal' }).passed, false);
  assert.equal(applyLaws({ palette: 'purple – to – cyan' }).passed, false);
});

test('REGRESSION: plural and possessive creatures do not bypass (round 1)', () => {
  // \bswan\b cannot match inside "swans" — plurals escaped the original pattern.
  for (const s of ['two swans landing', 'a pack of wolves', 'foxes in snow', "a swan's wing"]) {
    assert.equal(applyLaws({ subject: s }).passed, false, `should block: ${s}`);
  }
});

test("REGRESSION: bird's-eye view is a CAMERA POSITION, not a creature (round 2)", () => {
  // Swan's own composition vocabulary. Rejecting it would train the operator
  // to fight the filter — the exact failure this filter exists to avoid.
  for (const c of ["bird's-eye view of the surface", 'birds eye view', "worm's-eye view"]) {
    assert.equal(applyLaws({ composition: c }).passed, true, `should allow: ${c}`);
  }
  assert.equal(applyLaws({ optics: 'fish-eye lens, aperture 1.2' }).passed, true);
});

test('REGRESSION: the idiom allowance is not itself a bypass (round 3)', () => {
  assert.equal(applyLaws({ subject: "bird's-eye view of a bird in flight" }).passed, false);
  assert.equal(applyLaws({ composition: "bird's-eye view", subject: 'a swan' }).passed, false);
});

test('no false positives on legitimate Swan vocabulary', () => {
  for (const slots of [
    { light: 'a soft glow at the horizon' },
    { palette: 'ice wing cyan accent on midnight sapphire' },
    { intent: 'a stretching and flexibility session' },
    { material: 'caustic refraction through crystal' },
    { material: 'dust motes lit by a shaft of window light' },
    { composition: 'low-vantage point view, symmetrical' },
  ]) {
    const r = applyLaws(slots);
    assert.equal(r.passed, true, `false positive: ${JSON.stringify(slots)} -> ${r.violations[0]?.detail}`);
  }
});

test('REGRESSION: the `negative` slot is EXEMPT — it exists to name banned things', () => {
  // Found when the compiler first ran: the negative prompt legitimately contains
  // every kill-list term, so scanning it made every lawful compile self-reject.
  // A term here is an instruction to AVOID it — the desired behaviour, not a bypass.
  const r = applyLaws({
    ...clean,
    negative: 'iridescent gradient, lens flare, causeless particles, glassmorphism, literal creature form',
  });
  assert.equal(r.passed, true);
});

test('the exemption is scoped to `negative` only — other slots still scanned', () => {
  assert.equal(applyLaws({ material: 'iridescent gradient wash' }).passed, false);
  assert.equal(applyLaws({ subject: 'a dragon' }).passed, false);
});

// ── Regressions from the shipped-code hostile review (Kimi K3) ──────────────

test('REGRESSION: "golden hour" is LIGHT, not gold ornament', () => {
  // The highest-damage false positive found: the most on-brand photographic
  // phrase Swan has was being blocked by LAW 2.
  assert.equal(applyLaws({ light: 'golden hour light through Baltic amber' }).passed, true);
  assert.equal(applyLaws({ composition: 'golden ratio grid' }).passed, true);
  // Gold as ornament is still blocked — the idiom is not a general amnesty.
  assert.equal(applyLaws({ palette: 'gilded surfaces throughout' }).passed, false);
});

test('REGRESSION: occluder framing is a SHAPE allowance, not a rendering licence', () => {
  // Presence of lawful framing is not absence of unlawful rendering.
  assert.equal(applyLaws({
    subject: 'a photorealistic swan rendered as a dark occluder in a caustic field, feathers visible, eyes detailed',
  }).passed, false);
  assert.equal(applyLaws({ subject: 'swan as dark occluder, feathers visible' }).passed, false);
  // The legitimate form still passes.
  assert.equal(applyLaws({ subject: 'a swan as a dark occluder in a caustic field' }).passed, true);
});

test('REGRESSION: unicode and spacing evasion is normalized before matching', () => {
  assert.equal(applyLaws({ material: 'iridescent​ gradient wash' }).passed, false, 'zero-width');
  assert.equal(applyLaws({ material: 'ｉｒｉｄｅｓｃｅｎｔ gradient' }).passed, false, 'fullwidth');
  assert.equal(applyLaws({ material: 'i r i d e s c e n t gradient' }).passed, false, 'spaced letters');
});

test('normalization does not mangle ordinary prose', () => {
  // The spaced-letter collapse only fires on runs of 4+ single letters.
  assert.equal(applyLaws({ light: 'a soft glow at the horizon' }).passed, true);
  assert.equal(applyLaws({ intent: 'I do not want a lens flare' }).passed, false); // still catches the real term
});

// ── Regressions from the HY3 shipped-code hostile review ────────────────────

test('REGRESSION: a lawful phrase elsewhere in the slot is not a shield (HY3 F3)', () => {
  // "occluder" appearing anywhere used to license any creature in the same slot.
  assert.equal(applyLaws({
    subject: 'a dark occluder in a caustic field - and a smiling swan paddling in the foreground',
  }).passed, false);
  // A static light-blocking shape is still lawful.
  assert.equal(applyLaws({ subject: 'a swan as a dark occluder in a caustic field' }).passed, true);
});

test('REGRESSION: LAW 10 applies to the negative slot — exempt from taste, not content (HY3 F4)', () => {
  // The negative slot reaches a verified provider verbatim and is persisted to
  // the generation record. Taste exemption is not a content-law exemption.
  assert.equal(applyLaws({ intent: 'hero', negative: 'yoga, meditation' }).passed, false);
  // Naming banned AESTHETICS in negative remains correct and must keep passing.
  assert.equal(applyLaws({
    intent: 'hero',
    negative: 'iridescent gradient, lens flare, literal creature form',
  }).passed, true);
});

test('REGRESSION: retired palette is reachable by NAME, not only hex (HY3 F5)', () => {
  assert.equal(applyLaws({ palette: 'fill with galaxy purple' }).passed, false);
  assert.equal(applyLaws({ palette: 'nebula blue wash' }).passed, false);
  // "cosmic" in ordinary prose is not a palette claim.
  assert.equal(applyLaws({ intent: 'a vast cosmic scale' }).passed, true);
});

test('REGRESSION: non-English creature lemmas are caught (HY3 F2)', () => {
  // An image model understands "cygne" even though an ASCII regex does not.
  for (const s of ['a cygne rendered as bent light', 'ein schwan im licht', 'un cisne']) {
    assert.equal(applyLaws({ subject: s }).passed, false, `should block: ${s}`);
  }
});

test('DISPROVEN CLAIM (kept as a guard): bird-eye idiom variants all pass', () => {
  // HY3 claimed only the exact string was masked. It was not — but pin it.
  for (const v of ["bird's-eye view", 'birds-eye view', 'bird eye view', "bird's eye view", 'birds eye view']) {
    assert.equal(applyLaws({ composition: `${v} of the fjord` }).passed, true, `should allow: ${v}`);
  }
});

test('empty and partial slot maps do not crash', () => {
  assert.equal(applyLaws({}).passed, true);
  assert.equal(applyLaws({ subject: undefined, intent: '' }).passed, true);
  assert.equal(applyLaws(undefined, undefined).passed, true);
});

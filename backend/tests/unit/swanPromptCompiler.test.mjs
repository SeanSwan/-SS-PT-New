import test from 'node:test';
import assert from 'node:assert/strict';
import {
  compileImage, compileVideo, resolveSlots, personify, BRAIN_VERSION, FACETS,
} from '../../../shared/swanPromptCompiler.mjs';

const VERIFIED_CAPS = {
  provider: 'gemini-image-flash',
  modelVersion: 'gemini-3.1-flash-image-preview',
  seedIsDeterministic: 'verified',
  honorsNegativePrompt: 'verified',
  supportedAspectRatios: ['16:9', '1:1', '9:16'],
};

const brief = {
  briefId: 'b-1',
  text: 'light bending through a frozen structure',
  surfaceClass: 'public',
  intent: 'hero',
  aspect: '16:9',
  facets: ['Temperature>Arctic', 'Optics>Caustics', 'Form>Geometric'],
};

test('the personification formula produces the strong form, never "by artist"', () => {
  const s = personify('Anton Corbijn', 'classical photograph', 'a frozen structure');
  assert.equal(s, "Anton Corbijn's classical photograph depicting a frozen structure");
  assert.doesNotMatch(s, /\bby\b/);
});

test('personify tolerates a trailing possessive and a missing subject', () => {
  assert.equal(personify("Erwin Wurm's", 'installation', ''), "Erwin Wurm's installation");
});

test('a full compile produces prompt text, seed, slots and law checks', () => {
  const c = compileImage(brief, VERIFIED_CAPS);
  assert.equal(c.brainVersion, BRAIN_VERSION);
  assert.equal(c.provider, 'gemini-image-flash');
  assert.ok(c.promptText.length > 40);
  assert.ok(Number.isInteger(c.seed));
  assert.ok(c.lawChecks.every((x) => x.passed));
  assert.deepEqual(c.facetsApplied, ['Temperature>Arctic', 'Optics>Caustics', 'Form>Geometric']);
});

test('facets actually change the prompt — this is a composer, not a template', () => {
  const arctic = compileImage({ ...brief, facets: ['Temperature>Arctic'] }, VERIFIED_CAPS);
  const ember = compileImage({ ...brief, facets: ['Temperature>Ember'] }, VERIFIED_CAPS);
  assert.notEqual(arctic.promptText, ember.promptText);
  assert.match(arctic.promptText, /ice wing cyan/i);
  assert.match(ember.promptText, /warm ember/i);
  // Ember expresses warmth as light temperature, never as gold — LAW 2.
  assert.doesNotMatch(ember.promptText, /\bgilded\b|\bgolden\b/i);
});

test('surface class changes the abstraction budget (LAW 6)', () => {
  const pub = compileImage({ ...brief, surfaceClass: 'public' }, VERIFIED_CAPS);
  const app = compileImage({ ...brief, surfaceClass: 'in-app' }, VERIFIED_CAPS);
  assert.match(pub.promptText, /impossible phenomenon/i);
  assert.match(app.promptText, /calm|nothing competing/i);
});

test('an abstract facet can deliberately EMPTY the subject slot', () => {
  const slots = resolveSlots({ ...brief, facets: ['Form>Abstract'] });
  assert.equal(slots.subject, '');
  assert.match(slots.composition, /non-representational/i);
});

test('CAPABILITY GATE: unverified negative-prompt support means NO negative text', () => {
  // A provider that merely CLAIMS support must not be trusted — a false claim
  // would silently void the kill-list.
  const claimed = compileImage(brief, { ...VERIFIED_CAPS, honorsNegativePrompt: 'claimed' });
  assert.equal(claimed.negativeText, undefined);

  const verified = compileImage(brief, VERIFIED_CAPS);
  assert.match(verified.negativeText, /iridescent gradient/);
});

test('CAPABILITY GATE: unverified seed determinism means no seed param sent', () => {
  const claimed = compileImage(brief, { ...VERIFIED_CAPS, seedIsDeterministic: 'claimed' });
  assert.equal(claimed.params.seed, undefined);
  assert.ok(Number.isInteger(claimed.seed), 'seed is still RECORDED for replay');
});

test('the negative slot always carries the kill-list even when unusable', () => {
  const slots = resolveSlots(brief);
  assert.match(slots.negative, /iridescent gradient/);
  assert.match(slots.negative, /literal creature form/);
});

test('unsupported aspect ratio is refused, not silently coerced', () => {
  assert.throws(
    () => compileImage({ ...brief, aspect: '21:9' }, VERIFIED_CAPS),
    (e) => e.code === 'E_CAPABILITY_UNVERIFIED',
  );
});

test('REPLAYABLE: same brief + same seed yields the same prompt and seed', () => {
  const a = compileImage({ ...brief, seed: 12345 }, VERIFIED_CAPS);
  const b = compileImage({ ...brief, seed: 12345 }, VERIFIED_CAPS);
  assert.equal(a.promptText, b.promptText);
  assert.equal(a.seed, 12345);
  assert.equal(b.seed, 12345);
});

test('an auto-assigned seed is always recorded, never left undefined', () => {
  const c = compileImage(brief, VERIFIED_CAPS);
  assert.ok(Number.isInteger(c.seed) && c.seed > 0);
});

test('LAW filter runs inside compile — unlawful briefs never reach a provider', () => {
  assert.throws(
    () => compileImage({ ...brief, slotOverrides: { material: 'an iridescent gradient wash' } }, VERIFIED_CAPS),
    (e) => e.code === 'E_LAW_VIOLATION',
  );
});

test('slotOverrides (refine chips) are applied last and win', () => {
  const c = compileImage({ ...brief, slotOverrides: { light: 'flat overcast light' } }, VERIFIED_CAPS);
  assert.equal(c.slots.light, 'flat overcast light');
});

test('IMAGE-FIRST is enforced in CORE: video without an init image throws', () => {
  assert.throws(
    () => compileVideo(brief, VERIFIED_CAPS),
    (e) => e.code === 'E_IMAGE_FIRST_REQUIRED' && /conforms far better/.test(e.message),
  );
});

test('video compile with an approved still carries the init image through', () => {
  const v = compileVideo(brief, VERIFIED_CAPS, 'asset-9');
  assert.equal(v.initImageAssetId, 'asset-9');
  assert.equal(v.params.init_image, 'asset-9');
  assert.ok(v.promptText.length > 40);
});

test('every curated facet is well-formed and patches only real slot names', () => {
  const valid = new Set(Object.keys(resolveSlots({})));
  for (const [name, patch] of Object.entries(FACETS)) {
    for (const k of Object.keys(patch)) {
      assert.ok(valid.has(k), `facet ${name} patches unknown slot "${k}"`);
    }
  }
});

test('no curated facet can itself produce a law violation', () => {
  for (const name of Object.keys(FACETS)) {
    assert.doesNotThrow(
      () => compileImage({ ...brief, facets: [name] }, VERIFIED_CAPS),
      `facet ${name} produces an unlawful prompt`,
    );
  }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  compileImage, compileVideo, resolveSlots, personify, BRAIN_VERSION, FACETS,
  SERIALIZERS, serializeFor, strategyFor, fitToBudget,
} from '../../../shared/swanPromptCompiler.mjs';

const VERIFIED_CAPS = {
  provider: 'gemini-image-flash',
  promptStyle: 'sentence', // declared, as a real caption-trained provider would
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

// ── Serializer strategies (from the shipped-code hostile review) ────────────

test('the same IR renders differently under different strategies', () => {
  // The whole point: slots are the IR, serialization is provider-dependent.
  const slots = resolveSlots(brief);
  const sentence = serializeFor('sentence', slots);
  const tag = serializeFor('tag', slots);
  const fragment = serializeFor('fragment', slots);
  assert.notEqual(sentence, tag);
  assert.notEqual(sentence, fragment);
  assert.notEqual(tag, fragment);
});

test('sentence strategy produces prose, tag strategy produces a comma stack', () => {
  const slots = resolveSlots(brief);
  const sentence = serializeFor('sentence', slots);
  const tag = serializeFor('tag', slots);
  assert.match(sentence, /^A .+:/, 'sentence should open with a medium clause');
  assert.match(sentence, /Framed |Lit and surfaced with /, 'sentence should use binding clauses');
  assert.doesNotMatch(tag, /Framed |Lit and surfaced with /, 'tag should be bare');
  assert.ok(tag.split(',').length >= 5, 'tag should be a comma stack');
});

test('precedence: DECLARED promptStyle beats a provider-name hint', () => {
  // Provider names are marketing, not architecture. "stable-diffusion-3-api"
  // serves SD3, which is caption-trained via T5 and wants prose — the brand
  // string says the opposite. A declared capability must always win.
  assert.equal(strategyFor({ provider: 'sdxl-local', promptStyle: 'sentence' }), 'sentence');
  assert.equal(strategyFor({ provider: 'stable-diffusion-3-api', promptStyle: 'sentence' }), 'sentence');
  assert.equal(strategyFor({ provider: 'gemini', promptStyle: 'tag' }), 'tag');
});

test('an undeclared provider gets the FLATTEST-FAILURE default, not the prettiest', () => {
  // Deliberately NOT 'sentence'. Under an unknown token limit a truncated
  // sentence loses grammatical coherence AND its tail content; a truncated
  // delimited list loses only tail items. Defaulting to prose promoted a cheap
  // unvalidated assumption into an expensive one.
  assert.equal(strategyFor({ provider: 'something-new' }), 'fragment');
  assert.equal(strategyFor({}), 'fragment');
  assert.equal(strategyFor({ provider: 'minimax-h3-hosted' }), 'fragment');
});

test('provider-name hints remain, but only as a last resort', () => {
  assert.equal(strategyFor({ provider: 'sdxl-local' }), 'tag');
  assert.equal(strategyFor({ provider: 'comfyui-wan22' }), 'tag');
});

test('an unknown explicit style falls back rather than throwing at selection time', () => {
  assert.equal(strategyFor({ provider: 'gemini', promptStyle: 'nonsense' }), 'fragment');
});

test('token budget drops TAIL SEGMENTS, never cuts mid-string', () => {
  const long = 'alpha one. beta two. gamma three. delta four. epsilon five.';
  const fitted = fitToBudget(long, 30);
  assert.ok(fitted.text.length <= 30);
  assert.equal(fitted.truncated, true);
  assert.ok(fitted.droppedSegments > 0);
  assert.ok(long.startsWith(fitted.text.split('.')[0]), 'head must be preserved intact');
  // No budget declared = untouched.
  assert.equal(fitToBudget(long, 0).text, long);
  assert.equal(fitToBudget(long, undefined).truncated, false);
});

test('compile honours a provider prompt budget and reports the truncation', () => {
  const c = compileImage({ ...brief }, { ...VERIFIED_CAPS, maxPromptChars: 60 });
  assert.ok(c.promptText.length <= 60);
  assert.equal(c.truncated, true);
  assert.ok(c.droppedSegments > 0);
});

test('an unknown serializer throws rather than silently emitting nothing', () => {
  assert.throws(() => serializeFor('nope', resolveSlots(brief)), (e) => e.code === 'E_UNKNOWN_SERIALIZER');
});

test('compile records which strategy produced the text', () => {
  const c = compileImage(brief, VERIFIED_CAPS);
  assert.equal(c.promptStyle, 'sentence');
  assert.equal(c.promptText, serializeFor('sentence', c.slots));
});

test('REGRESSION: tag strategy does not duplicate the subject inside styleAnchor', () => {
  // The personification formula embeds the subject; emitting both repeats it.
  const withArtist = { ...brief, artist: 'Anton Corbijn', artistMedium: 'classical photograph' };
  const tag = serializeFor('tag', resolveSlots(withArtist));
  const subject = brief.text;
  const occurrences = tag.toLowerCase().split(subject.toLowerCase()).length - 1;
  assert.equal(occurrences, 1, `subject appears ${occurrences}x in tag output`);
});

test('every strategy still yields a lawful, non-empty string', () => {
  const slots = resolveSlots(brief);
  for (const name of Object.keys(SERIALIZERS)) {
    const out = serializeFor(name, slots);
    assert.ok(out && out.trim().length > 20, `${name} produced a degenerate string`);
  }
});

test('REGRESSION: a substanceless prompt is REFUSED, not billed for', () => {
  const blank = {
    intent: '', subject: '', medium: '', styleAnchor: '', composition: '',
    optics: '', light: '', palette: '', material: '', abstraction: '',
  };
  assert.throws(
    () => compileImage({ ...brief, slotOverrides: blank }, VERIFIED_CAPS),
    (e) => e.code === 'E_EMPTY_PROMPT',
  );
  assert.throws(
    () => compileImage({ ...brief, slotOverrides: { ...blank, subject: '...' } }, VERIFIED_CAPS),
    (e) => e.code === 'E_EMPTY_PROMPT',
  );
});

test('REGRESSION: the empty-prompt guard does NOT refuse terse-but-real briefs', () => {
  // A first threshold of 12 chars refused "a frozen lake" (11 stripped). Same
  // false-positive class the must-pass corpus exists to prevent: a guard that
  // blocks real work gets disabled. It checks for absence of content, not brevity.
  const blank = {
    intent: '', subject: '', medium: '', styleAnchor: '', composition: '',
    optics: '', light: '', palette: '', material: '', abstraction: '',
  };
  for (const t of ['ice', 'fog', 'a frozen lake', 'light']) {
    const c = compileImage({ ...brief, slotOverrides: { ...blank, subject: t } }, VERIFIED_CAPS);
    assert.ok(c.promptText.includes(t), `terse brief "${t}" must survive`);
  }
});

test('REGRESSION: sentence strategy does not drop a medium that has no lead', () => {
  // "A photograph" used to vanish entirely, yielding a bare ".".
  assert.equal(serializeFor('sentence', { medium: 'photograph' }), 'A photograph.');
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

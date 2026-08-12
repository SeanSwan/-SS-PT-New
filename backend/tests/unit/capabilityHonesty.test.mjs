import test from 'node:test';
import assert from 'node:assert/strict';
import { capabilities as apiCaps, MODELS, QUARANTINED_CAPABILITIES as QUARANTINED } from '../../../shared/providers/openrouterModels.mjs';
import { capabilities as dropCaps } from '../../../shared/providers/dropFolderImage.mjs';

/**
 * THE CAPABILITY TRI-STATE, enforced across every provider.
 *
 * The tri-state ('verified' | 'claimed' | false) only works if every provider
 * uses the same three values. A drop-folder provider shipped
 * `seedIsDeterministic: 'false'` — the STRING, which is truthy in JavaScript.
 * `capOk()` rejected it by luck, because it happens to test `=== true ||
 * === 'verified'` rather than truthiness. Correct behaviour for the wrong
 * reason is how this class of bug survives, so it is now a test rather than
 * a coincidence.
 */

const TRI_STATE_FIELDS = [
  'supportsSeed', 'seedIsDeterministic', 'honorsNegativePrompt',
  'supportsImageInit', 'supportsInpainting',
];

const LEGAL = new Set(['verified', 'claimed', true, false]);

const PROVIDERS = [
  ['openrouter/default', apiCaps()],
  ['drop-folder', dropCaps()],
  ...Object.keys(MODELS).map((m) => [m, apiCaps(m)]),
];

test('no capability is a TRUTHY STRING masquerading as a boolean', () => {
  for (const [name, caps] of PROVIDERS) {
    for (const f of TRI_STATE_FIELDS) {
      if (caps[f] === undefined) continue;
      assert.notEqual(caps[f], 'false',
        `${name}.${f} is the string 'false', which is truthy — use boolean false`);
      assert.notEqual(caps[f], 'true',
        `${name}.${f} is the string 'true' — use boolean true, or 'verified' if probed`);
    }
  }
});

test('every capability value is one of the four legal states', () => {
  for (const [name, caps] of PROVIDERS) {
    for (const f of TRI_STATE_FIELDS) {
      if (caps[f] === undefined) continue;
      assert.ok(LEGAL.has(caps[f]),
        `${name}.${f} = ${JSON.stringify(caps[f])} is not one of verified|claimed|true|false`);
    }
  }
});

test('a PROBED capability records its verdict, and the probes that ran are pinned here', () => {
  // Probed 2026-08-12 with real spend. If either flips back to 'claimed' or true
  // without a new probe, someone has undone evidence.
  const caps = apiCaps();
  // QUARANTINED, not merely false. A probed-dead capability is now absent from
  // the exposed surface entirely — the compiler cannot see a key for something
  // proven to be a lie. `false` in the hot path was a footgun with docs.
  assert.equal(caps.supportsSeed, undefined, 'quarantined, not exposed as false');
  assert.equal(caps.seedIsDeterministic, undefined);
  assert.equal(QUARANTINED.supportsSeed.verdict, false);
  assert.match(QUARANTINED.supportsSeed.evidence, /different bytes/);
  assert.equal(QUARANTINED.supportsSeed.probedOn, '2026-08-12');

  // IMAGE-INIT: resolved 'claimed' -> false by the INFLUENCE probe the same day.
  // One prompt ("preserve the dominant colour of the supplied image exactly"),
  // three arms, output colour measured by decoding pixels:
  //   BLUE  #002882 -> #fbde5e (yellow)
  //   AMBER #d28c14 -> #f8c288
  //   none  control -> #fcd158 (yellow)
  // The blue-seeded output lands on top of the no-input control. The parameter
  // is accepted, BILLED MORE ($0.006136 vs $0.003736), and inert — so neither
  // acceptance nor cost is evidence of use.
  assert.equal(caps.supportsImageInit, undefined, 'quarantined');
  assert.equal(QUARANTINED.supportsImageInit.verdict, false);
  assert.match(QUARANTINED.supportsImageInit.evidence, /billed more/);

  // Every quarantined entry must carry its evidence — "why is this dead" has to
  // outlive my memory of probing it.
  for (const [name, q] of Object.entries(QUARANTINED)) {
    assert.equal(q.verdict, false, `${name} must be a verdict, not a maybe`);
    assert.ok(q.evidence && q.evidence.length > 20, `${name} needs stated evidence`);
  }
});

test('drop-folder does not promise what its request sheet cannot ask for', () => {
  // The sheet it writes tells a human: prompt, aspect ratio, filename, folder.
  // It never asks for an input image, so claiming image-init would hand an
  // operator a sheet with no way to supply one.
  assert.equal(dropCaps().supportsImageInit, 'claimed');
  assert.equal(dropCaps().costCents, 0);
});

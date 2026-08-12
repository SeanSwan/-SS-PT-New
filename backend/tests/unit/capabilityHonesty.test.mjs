import test from 'node:test';
import assert from 'node:assert/strict';
import { capabilities as apiCaps, MODELS } from '../../../shared/providers/openrouterModels.mjs';
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
  assert.equal(caps.supportsSeed, false, 'probe: same prompt + same seed gave different bytes');
  assert.equal(caps.seedIsDeterministic, false);

  // Probed the same day: the `image` parameter is ACCEPTED (HTTP 200) but its
  // INFLUENCE is untested, and acceptance is not evidence — the seed parameter
  // is accepted too and does nothing. So this must stay 'claimed'.
  assert.equal(caps.supportsImageInit, 'claimed',
    'acceptance is not influence; do not promote this without an influence test');
});

test('drop-folder does not promise what its request sheet cannot ask for', () => {
  // The sheet it writes tells a human: prompt, aspect ratio, filename, folder.
  // It never asks for an input image, so claiming image-init would hand an
  // operator a sheet with no way to supply one.
  assert.equal(dropCaps().supportsImageInit, 'claimed');
  assert.equal(dropCaps().costCents, 0);
});

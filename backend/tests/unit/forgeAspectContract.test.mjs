import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { compileImage } from '../../../shared/swanPromptCompiler.mjs';
import { requestDrop } from '../../../shared/providers/dropFolderImage.mjs';

/**
 * THE ASPECT CONTRACT, tested across every consumer at once.
 *
 * The defect this suite exists to prevent: the aspect ratio was stored in
 * `slots.output`, serialized into the prompt PROSE, and then regexed back OUT of
 * that same prose by the provider to fill an API parameter. One field, two
 * consumers, one structured and one prose — and no detector for the case where
 * they disagreed.
 *
 * The rule now: aspect is STRUCTURE. Prose is a projection of it. Nothing parses
 * its own output back into a parameter.
 */

const CAPS = {
  provider: 'openai/gpt-5.4-image-2',
  promptStyle: 'sentence',
  modelVersion: 'openai/gpt-5.4-image-2',
  supportedAspectRatios: ['16:9', '1:1', '9:16', '4:5'],
};

const BRIEF = { briefId: 'b-aspect', text: 'a frozen lake under low winter sun', intent: 'hero' };

test('the compiled object carries aspect as a TYPED field, not buried in prose', () => {
  assert.equal(compileImage({ ...BRIEF, aspect: '9:16' }, CAPS).aspect, '9:16');
  assert.equal(compileImage({ ...BRIEF, aspect: '1:1' }, CAPS).aspect, '1:1');
  assert.equal(compileImage(BRIEF, CAPS).aspect, '16:9', 'documented default when the brief is silent');
});

test('THE REGRESSION: an incidental ratio in prose cannot hijack the aspect parameter', () => {
  // Before the fix the provider ran /(\d{1,2}:\d{1,2})/ over slots.output and
  // took the first match. An output slot mentioning a time-of-day would ship
  // `aspect_ratio: "10:30"` to a paid API, silently, forever.
  const hijack = compileImage({
    ...BRIEF, aspect: '16:9',
    slotOverrides: { output: '10:30 golden hour light, 16:9' },
  }, CAPS);
  assert.equal(hijack.aspect, '16:9');
  assert.notEqual(hijack.aspect, '10:30');
});

test('a prose ratio that DISAGREES with the declared aspect is detected, not silently obeyed', () => {
  const diverged = compileImage({
    ...BRIEF, aspect: '16:9',
    slotOverrides: { output: 'composed as 4:5 portrait' },
  }, CAPS);
  assert.equal(diverged.aspect, '16:9', 'structure wins');
  assert.deepEqual(diverged.aspectDivergence, { declared: '16:9', inProse: '4:5' });
});

test('an ordinary brief has NO divergence — the detector must not cry wolf', () => {
  for (const aspect of ['16:9', '1:1', '9:16', '4:5']) {
    const c = compileImage({ ...BRIEF, aspect }, CAPS);
    assert.equal(c.aspectDivergence, null, `unexpected divergence for ${aspect}`);
  }
});

test('the DROP-FOLDER sheet gives a human a clean ratio, not a prose blob', () => {
  // Sibling defect, found by a repo-wide sweep rather than by the failing test:
  // the human-facing request sheet printed `compiled.slots.output`, so an
  // operator was told 'aspect ratio: **16:9, seamless, edge-matched**' and left
  // to guess which part to type into the tool. Same root cause, aimed at a
  // person instead of a parameter.
  const root = mkdtempSync(join(tmpdir(), 'forge-drop-'));
  try {
    const compiled = compileImage({ ...BRIEF, intent: 'texture', aspect: '1:1' }, CAPS);
    const { requestPath } = requestDrop(compiled, root);
    const sheet = readFileSync(join(root, requestPath), 'utf8');
    assert.match(sheet, /aspect ratio: \*\*1:1\*\*/);
    assert.doesNotMatch(sheet, /aspect ratio: \*\*[^*]*,/, 'the ratio line must not contain a comma-joined blob');
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('the output CONTRACT still reaches the model in the prompt text', () => {
  // Belt and braces, and the reason this is asserted: dropping the output
  // contract from the prose once produced a portrait image from a 16:9 brief.
  // The parameter is now the authority, but the prose still states the frame.
  const c = compileImage({ ...BRIEF, aspect: '16:9' }, CAPS);
  assert.match(c.promptText, /16:9/);
});

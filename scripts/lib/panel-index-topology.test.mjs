import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const runner = fs.readFileSync(new URL('../consult-panel.mjs', import.meta.url), 'utf8');

test('panel index reports requested external seats plus the active GPT third pass', () => {
  assert.match(runner, /\*\*Active GPT pass:\*\* \$\{adjudicator\}/);
  assert.match(runner, /requested external seat/);
  assert.match(runner, /active GPT pass is the third local adjudication pass/);
  assert.match(runner, /returned valid artifacts/);
  assert.match(runner, /failed before artifact/);
  assert.doesNotMatch(runner, /\*\*Coverage:\*\* full panel — all \$\{Object\.keys\(SEATS\)\.length\} seats ran/);
  assert.doesNotMatch(runner, /\*\*Coverage:\*\* PARTIAL — \$\{seatsToRun\.length\} of \$\{Object\.keys\(SEATS\)\.length\} seats ran/);
});

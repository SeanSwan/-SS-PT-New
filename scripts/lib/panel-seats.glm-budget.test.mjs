import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { buildSeats } from './panel-seats.mjs';

const MAX_GLM_OUTPUT_TOKENS = '34000';

function maxTokensFor(seat) {
  const args = seat.args('packet.md', 'review.md');
  const flagIndex = args.indexOf('--max-tokens');
  assert.notEqual(flagIndex, -1, `${seat.label} must pass an explicit --max-tokens ceiling`);
  return args[flagIndex + 1];
}

test('GLM 5.3 Flash and GLM 5.3 are both capped at 34K output tokens', () => {
  const seats = buildSeats('hostile review');

  assert.equal(maxTokensFor(seats.glmflash), MAX_GLM_OUTPUT_TOKENS);
  assert.equal(maxTokensFor(seats.glm), MAX_GLM_OUTPUT_TOKENS);
});

test('the default panel runs GLM 5.3 Flash before regular GLM 5.3', () => {
  const source = readFileSync(new URL('../consult-panel.mjs', import.meta.url), 'utf8');

  assert.match(source, /arg\('--seats', 'glmflash,glm'\)/);
  assert.match(source, /for \(const seatName of seatsToRun\)[\s\S]*await runSeat\(seatName\)/);
  assert.doesNotMatch(source, /Promise\.all\(seatsToRun\.map\(runSeat\)\)/);
});

test('both GLM seats in one panel share one secret-free review-round identifier', () => {
  const source = readFileSync(new URL('../consult-panel.mjs', import.meta.url), 'utf8');

  assert.match(source, /const reviewRoundId = `panel_\$\{randomUUID\(\)\}`/);
  assert.match(source, /SWAN_GLM_REVIEW_ROUND_ID: reviewRoundId/);
});

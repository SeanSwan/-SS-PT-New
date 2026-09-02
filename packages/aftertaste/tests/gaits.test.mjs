import test from 'node:test';
import assert from 'node:assert/strict';
import { gaitPose, gaitSeed } from '../src/enemies/gaits.js';
import { ROSTER } from '../src/enemies/roster.js';

/** Gait law (blueprint v2, Flash #15): a gait DECORATES the body — every pose stays bounded so
 *  the rendered creature never leaves its measured hit shapes. */

test('every declared gait stays bounded across a full cycle sweep', () => {
  for (const [type, row] of Object.entries(ROSTER)) {
    if (!row.gait) continue;
    for (let i = 0; i < 500; i++) {
      const p = gaitPose(row.gait, i * 0.021, gaitSeed(type + i));
      assert.ok(Math.abs(p.rotZ) <= 0.15, `${type} sway bounded`);
      assert.ok(Math.abs(p.rotX) <= 0.15, `${type} lean bounded`);
      assert.ok(Math.abs(p.yawJitter) <= (row.gait.jitter ?? 0) + 1e-9, `${type} jitter obeys its row`);
      assert.ok(p.yOffset >= 0 && p.yOffset <= 0.05, `${type} bob bounded`);
      assert.ok(p.speedScale > 0 && p.speedScale <= 1.7, `${type} burst bounded`);
    }
  }
});

test('the skitter averages roughly the roster speed — bursts are rhythm, not a stealth buff', () => {
  const g = ROSTER['crumb-roach'].gait;
  let sum = 0; const N = 4000;
  for (let i = 0; i < N; i++) sum += gaitPose(g, i * 0.0173, 0.4).speedScale;
  const avg = sum / N;
  assert.ok(avg > 0.85 && avg < 1.15, `average speedScale ${avg.toFixed(3)} stays near 1`);
});

test('no gait = the STILL pose; unknown gait types fail soft, never throw', () => {
  assert.deepEqual(gaitPose(undefined, 5, 1), { rotX: 0, rotZ: 0, yawJitter: 0, yOffset: 0, speedScale: 1 });
  assert.equal(gaitPose({ type: 'sprout?' }, 5, 1).speedScale, 1);
});

test('seeds spread a crowd out of lockstep', () => {
  const a = gaitPose(ROSTER.regular.gait, 3, gaitSeed('e1'));
  const b = gaitPose(ROSTER.regular.gait, 3, gaitSeed('e2'));
  assert.notEqual(a.rotZ, b.rotZ, 'two Regulars at the same instant sway differently');
});

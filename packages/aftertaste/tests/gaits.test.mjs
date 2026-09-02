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
      // A flier legitimately floats, so the lift ceiling is DECLARED per row — but it can never
      // exceed a quarter of the creature's own height, or the body leaves its measured hit shapes.
      const maxLift = Math.min((row.gait.lift ?? 0) + (row.gait.bob ?? 0.05), row.renderHeight * 0.25);
      assert.ok(p.yOffset >= 0 && p.yOffset <= maxLift + 1e-9, `${type} lift ${p.yOffset} exceeds ${maxLift}`);
      // No arbitrary ceiling here: the REAL law is 'a gait's peak speed may not outrun the
      // player', asserted against the actual sprint number in its own test below. A magic 1.7 was
      // just the skitter's peak wearing the costume of a rule.
      assert.ok(p.speedScale > 0 && Number.isFinite(p.speedScale), `${type} speedScale sane`);
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

// ---- S3: the kissing bug's creep→lunge, and the re-sculpted cast's gaits -----------------------
test('the creep gait is the ONLY one that reads distance — and it commits inside its range', async () => {
  const g = ROSTER['kissing-bug'].gait;
  const far = gaitPose(g, 2, 0.5, g.lungeRange + 5);
  const near = gaitPose(g, 2, 0.5, g.lungeRange - 0.1);
  assert.ok(far.speedScale < 1, 'creeping is SLOWER than its roster speed');
  assert.equal(near.speedScale, g.lungeMult, 'inside range it commits at full lunge');
  assert.ok(near.rotX < far.rotX, 'the lunge throws it forward out of the crouch');
  // Every other gait must ignore distance — otherwise "reads the world" stops being this
  // creature's signature and becomes an accident of the argument list.
  for (const [type, row] of Object.entries(ROSTER)) {
    if (!row.gait || row.gait.type === 'creep') continue;
    assert.deepEqual(
      gaitPose(row.gait, 3, 1, 0.5), gaitPose(row.gait, 3, 1, 999),
      `${type} must not change with player distance`,
    );
  }
});

test('the lunge cannot outrun the player — a creature that does ends the game', () => {
  const PLAYER_SPRINT = 5 * 1.45; // movement.js SPEED x SPRINT_MULT
  for (const [type, row] of Object.entries(ROSTER)) {
    const peak = row.gait?.lungeMult ?? row.gait?.lungeMult ?? 1;
    const maxScale = Math.max(
      ...Array.from({ length: 400 }, (_, i) => gaitPose(row.gait, i * 0.017, 0.3, 1).speedScale),
      peak,
    );
    assert.ok(row.speed * maxScale < PLAYER_SPRINT,
      `${type} peaks at ${(row.speed * maxScale).toFixed(2)} vs sprint ${PLAYER_SPRINT.toFixed(2)}`);
  }
});

test('every re-sculpted face declares a gait — a silent row is how the cast went back to sliding', () => {
  for (const [type, row] of Object.entries(ROSTER)) {
    assert.ok(row.gait?.type, `${type} has no gait`);
  }
});

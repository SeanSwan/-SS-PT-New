import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ATTACK_SECONDS, DEATH_SECONDS } from '../src/systems/lifecycle.js';
import { ROSTER } from '../src/enemies/roster.js';

/**
 * The lifecycle's durations and the GLB clips are TWO copies of one fact, and nothing enforced
 * their agreement: ATTACK_SECONDS assumes "16 frames at 24fps", and if anyone re-exports a clip
 * at a different rate the state machine expires the attack while the lunge is still playing —
 * with every other test green (GLM-5.3 hostile review, finding 12). This test reads the ACTUAL
 * files and holds the two copies together. It runs against all four roster monsters, so a fifth
 * monster with a mistimed export fails here on arrival.
 */

function clipDurations(glbPath) {
  const buf = readFileSync(glbPath);
  assert.equal(buf.readUInt32LE(0), 0x46546c67, `${glbPath} is a GLB (magic)`);
  const jsonLen = buf.readUInt32LE(12);
  const gltf = JSON.parse(buf.subarray(20, 20 + jsonLen).toString());
  const out = {};
  for (const anim of gltf.animations ?? []) {
    let end = 0;
    for (const sampler of anim.samplers) {
      const input = gltf.accessors[sampler.input];
      end = Math.max(end, input.max?.[0] ?? 0);
    }
    out[anim.name] = end;
  }
  return out;
}

for (const type of Object.keys(ROSTER)) {
  test(`${type}: the attack and death clips last what the lifecycle THINKS they last`, () => {
    const clips = clipDurations(new URL(`../../../assets/runtime/enemy/${type}/lod0.glb`, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
    assert.ok(clips.attack, `${type} carries an attack clip`);
    assert.ok(clips.death, `${type} carries a death clip`);
    // 60ms tolerance: export rounding is real, a re-export at the wrong fps is not.
    assert.ok(Math.abs(clips.attack - ATTACK_SECONDS) < 0.06,
      `${type} attack clip is ${clips.attack}s but the state lasts ${ATTACK_SECONDS}s`);
    assert.ok(Math.abs(clips.death - DEATH_SECONDS) < 0.06,
      `${type} death clip is ${clips.death}s but the corpse is removed at ${DEATH_SECONDS}s`);
  });
}

/**
 * store.test.mjs — the SEAM between the round rules and the world state.
 *
 * WHY THIS FILE EXISTS (a defect, not a hunch):
 * waves.test.mjs proves tickRound is correct. combat.test.mjs proves the combat maths. Both passed
 * while the game was unloseable, because store.tick COMPOSED them wrongly: during the mercy window
 * it passed an EMPTY enemy list to tickRound to suppress damage, and an empty list also means
 * "wave cleared". So every hit advanced the wave and teleported the flock back to radius 18.
 *
 * The lesson worth keeping: units passing does not mean the thing they compose into works. Test the
 * seam, at the level where the composition happens.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { useGameStore } from '../src/state/store.js';
import { PLAYER_HP } from '../src/systems/waves.js';

const ORIGIN = { x: 0, z: 0 };
const onPlayer = () => useGameStore.getState().enemies.map((e) => { e.x = 0; e.z = 0; return e; });

test.beforeEach(() => useGameStore.getState().reset());

test('a fresh round is wave 1, full hp, not over, with enemies on the board', () => {
  const s = useGameStore.getState();
  assert.equal(s.hp, PLAYER_HP);
  assert.equal(s.wave, 1);
  assert.equal(s.over, false);
  assert.ok(s.enemies.length > 0);
});

test('being touched costs exactly one hp, not one per frame', () => {
  onPlayer();
  useGameStore.getState().tick(ORIGIN, 0);
  assert.equal(useGameStore.getState().hp, PLAYER_HP - 1);
  // Same second, several frames: the mercy window must hold.
  for (const t of [0.1, 0.2, 0.5, 0.9]) useGameStore.getState().tick(ORIGIN, t);
  assert.equal(useGameStore.getState().hp, PLAYER_HP - 1, 'mercy window must absorb these');
});

test('THE REGRESSION: a hit, and the mercy frames after it, must not advance the wave', () => {
  onPlayer();
  useGameStore.getState().tick(ORIGIN, 0);        // the hit itself
  assert.equal(useGameStore.getState().wave, 1, 'the hit frame is not a cleared wave');

  // The frames INSIDE the mercy window are the ones that mattered: tick used to suppress damage by
  // handing tickRound an empty enemy list, and an empty list also reads as "wave cleared". So the
  // wave advanced and the flock respawned at radius 18 on every hit, and the round was unloseable.
  // A single non-merciful tick does not reach that path — this is the frame that does.
  useGameStore.getState().tick(ORIGIN, 0.1);
  const s = useGameStore.getState();
  assert.equal(s.wave, 1, 'a mercy frame is not a cleared wave');
  assert.ok(s.enemies.length > 0, 'a mercy frame must not respawn the flock');
});

test('enough touches end the round', () => {
  for (let i = 0; i < PLAYER_HP; i++) {
    onPlayer();
    useGameStore.getState().tick(ORIGIN, i * 2); // past the mercy window each time
  }
  const s = useGameStore.getState();
  assert.equal(s.hp, 0);
  assert.equal(s.over, true);
});

test('once the round is over, ticking changes nothing', () => {
  for (let i = 0; i < PLAYER_HP; i++) { onPlayer(); useGameStore.getState().tick(ORIGIN, i * 2); }
  const before = { ...useGameStore.getState() };
  useGameStore.getState().tick(ORIGIN, 99);
  const after = useGameStore.getState();
  assert.equal(after.hp, before.hp);
  assert.equal(after.wave, before.wave);
});

test('clearing the board really does advance the wave, and the next one is bigger', () => {
  const first = useGameStore.getState().enemies.length;
  useGameStore.setState({ enemies: [] });
  useGameStore.getState().tick({ x: 999, z: 999 }, 0);
  const s = useGameStore.getState();
  assert.equal(s.wave, 2);
  assert.ok(s.enemies.length > first, `wave 2 (${s.enemies.length}) must exceed wave 1 (${first})`);
});

test('reset restores a full, playable round', () => {
  for (let i = 0; i < PLAYER_HP; i++) { onPlayer(); useGameStore.getState().tick(ORIGIN, i * 2); }
  useGameStore.getState().reset();
  const s = useGameStore.getState();
  assert.equal(s.hp, PLAYER_HP);
  assert.equal(s.wave, 1);
  assert.equal(s.kills, 0);
  assert.equal(s.over, false);
  assert.ok(s.enemies.length > 0, 'reset must respawn a wave, not leave an empty board');
});

// --- shoot(): the FPS trigger's seam into the world -------------------------------------------

const shotAt = (enemy) => useGameStore.getState().shoot(
  { x: enemy.x, y: 10, z: enemy.z },
  { x: 0, y: -1, z: 0 },
);

test('a connected shot damages exactly the enemy under the ray', () => {
  const s = useGameStore.getState();
  const target = s.enemies[0];
  const others = s.enemies.slice(1).map((e) => e.hp);
  assert.equal(shotAt(target), true);
  const after = useGameStore.getState().enemies;
  assert.equal(after.find((e) => e.id === target.id).hp, target.hp - 1);
  assert.deepEqual(after.slice(1).map((e) => e.hp), others, 'bystanders untouched');
});

test('the killing shot removes the enemy and scores the kill', () => {
  const target = useGameStore.getState().enemies[0];
  shotAt(target);
  shotAt(target);
  const s = useGameStore.getState();
  assert.equal(s.enemies.some((e) => e.id === target.id), false);
  assert.equal(s.kills, 1);
});

test('a miss changes nothing and reports false', () => {
  const before = useGameStore.getState();
  const result = before.shoot({ x: 999, y: 10, z: 999 }, { x: 0, y: -1, z: 0 });
  assert.equal(result, false);
  assert.equal(useGameStore.getState().enemies.length, before.enemies.length);
  assert.equal(useGameStore.getState().kills, 0);
});

test('hitmarker timestamps: every hit stamps lastHitAt; only a kill stamps lastKillAt to match', () => {
  const target = useGameStore.getState().enemies[0];
  // Advance the game clock so timestamps are non-zero (tick caches it for shoot).
  useGameStore.getState().tick({ x: 500, z: 500 }, 7);
  shotAt(target);
  let s = useGameStore.getState();
  assert.equal(s.lastHitAt, 7);
  assert.notEqual(s.lastKillAt, s.lastHitAt, 'first hit is not a kill');
  shotAt(target);
  s = useGameStore.getState();
  assert.equal(s.lastKillAt, 7, 'the kill stamps lastKillAt');
});

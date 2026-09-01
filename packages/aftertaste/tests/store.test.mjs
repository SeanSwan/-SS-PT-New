/**
 * store.test.mjs — the SEAM between the round rules and the world state.
 *
 * WHY THIS FILE EXISTS (a defect, not a hunch):
 * waves.test.mjs proves tickRound is correct. combat.test.mjs proves fireAt is correct. Both passed
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

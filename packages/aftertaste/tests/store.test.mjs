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
 *
 * TEST-DELTA DISCLOSURE (lifecycle wiring): damage is no longer proximity-per-frame — an enemy
 * must mature from `spawning`, enter `attacking` in touch range, and pass ATTACK_WINDUP before a
 * strike lands. Every touch-flow test below walks that sequence via landStrike(); the old
 * single-tick versions asserted a mechanic that left the game. The game clock is monotonic across
 * tests on purpose: in the real game the clock never rewinds either.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { useGameStore } from '../src/state/store.js';
import { PLAYER_HP } from '../src/systems/waves.js';
import { ATTACK_WINDUP, SPAWN_SECONDS, DEATH_SECONDS } from '../src/systems/lifecycle.js';

const ORIGIN = { x: 0, z: 0 };
const FAR = { x: 999, z: 999 };
const onPlayer = () => useGameStore.getState().enemies.forEach((e) => { e.x = 0; e.z = 0; });
const tick = (player, t) => useGameStore.getState().tick(player, t);

/** A monotonic clock: the game's clock never rewinds, so neither does the tests'. */
let T = 0;

/** Mature the freshly spawned flock into `alive` (far from the player, so nobody attacks). */
function mature() {
  tick(FAR, T += 10);
}

/**
 * Walk one full strike: enemies on the player → attacking → wind-up passes → strike lands.
 * The wind-up tick steps PAST the boundary, not onto it: (a + 0.4) - a is 0.3999… in floating
 * point often enough that landing exactly on ATTACK_WINDUP is a coin flip. (Same IEEE-754 lesson
 * as the lifecycle boundary tests — it bit twice in one session.)
 */
function landStrike() {
  onPlayer(); tick(ORIGIN, T += 10);                   // 10s later: mercy long expired, spawns matured
  onPlayer(); tick(ORIGIN, T += 0.016);                // in range → attacking
  onPlayer(); tick(ORIGIN, T += ATTACK_WINDUP + 0.01); // comfortably past the wind-up → strike lands
  return T;
}

test.beforeEach(() => useGameStore.getState().reset());

test('a fresh round is wave 1, full hp, not over, with enemies on the board', () => {
  const s = useGameStore.getState();
  assert.equal(s.hp, PLAYER_HP);
  assert.equal(s.wave, 1);
  assert.equal(s.over, false);
  assert.ok(s.enemies.length > 0);
});

test('spawn protection: an enemy ON the player deals nothing until it matures and winds up', () => {
  onPlayer();
  tick(ORIGIN, T += 0.016);
  assert.equal(useGameStore.getState().hp, PLAYER_HP, 'a spawning enemy cannot hurt you');
});

test('a landed strike costs exactly one hp, and the mercy window absorbs the frames after', () => {
  const at = landStrike();
  assert.equal(useGameStore.getState().hp, PLAYER_HP - 1);
  // Several frames inside the mercy second: the strike is still "landing" (attack not expired).
  for (const dt of [0.05, 0.1, 0.2]) { onPlayer(); tick(ORIGIN, at + dt); }
  assert.equal(useGameStore.getState().hp, PLAYER_HP - 1, 'mercy window must absorb these');
});

test('THE REGRESSION: a strike, and the mercy frames after it, must not advance the wave', () => {
  const at = landStrike();
  assert.equal(useGameStore.getState().wave, 1, 'the strike frame is not a cleared wave');
  // The frames INSIDE the mercy window are the ones that mattered: tick used to suppress damage by
  // handing tickRound an empty enemy list, and an empty list also reads as "wave cleared".
  onPlayer(); tick(ORIGIN, at + 0.1);
  const s = useGameStore.getState();
  assert.equal(s.wave, 1, 'a mercy frame is not a cleared wave');
  assert.ok(s.enemies.length > 0, 'a mercy frame must not respawn the flock');
});

test('enough strikes end the round', () => {
  for (let i = 0; i < PLAYER_HP; i++) landStrike();
  const s = useGameStore.getState();
  assert.equal(s.hp, 0);
  assert.equal(s.over, true);
});

test('once the round is over, ticking changes nothing', () => {
  for (let i = 0; i < PLAYER_HP; i++) landStrike();
  const before = { ...useGameStore.getState() };
  tick(ORIGIN, T += 10);
  const after = useGameStore.getState();
  assert.equal(after.hp, before.hp);
  assert.equal(after.wave, before.wave);
});

test('clearing the board really does advance the wave, and the next one is bigger', () => {
  const first = useGameStore.getState().enemies.length;
  useGameStore.setState({ enemies: [] });
  tick(FAR, T += 1);
  const s = useGameStore.getState();
  assert.equal(s.wave, 2);
  assert.ok(s.enemies.length > first, `wave 2 (${s.enemies.length}) must exceed wave 1 (${first})`);
});

test('reset restores a full, playable round', () => {
  for (let i = 0; i < PLAYER_HP; i++) landStrike();
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
  mature();
  const s = useGameStore.getState();
  const target = s.enemies[0];
  const others = s.enemies.slice(1).map((e) => e.hp);
  assert.equal(shotAt(target), true);
  const after = useGameStore.getState().enemies;
  assert.equal(after.find((e) => e.id === target.id).hp, target.hp - 1);
  assert.deepEqual(after.slice(1).map((e) => e.hp), others, 'bystanders untouched');
});

test('a SPAWNING enemy cannot be shot — fair-spawn cuts both ways', () => {
  // No mature(): the flock is still materialising.
  const target = useGameStore.getState().enemies[0];
  assert.equal(shotAt(target), false);
  assert.equal(useGameStore.getState().enemies[0].hp, target.hp);
});

test('the killing shot starts the death: corpse on the board, kill scored, wave not held open', () => {
  mature();
  const target = useGameStore.getState().enemies[0];
  shotAt(target);
  shotAt(target);
  const s = useGameStore.getState();
  const corpse = s.enemies.find((e) => e.id === target.id);
  assert.ok(corpse, 'the corpse STAYS on the board to topple');
  assert.equal(corpse.state, 'dying');
  assert.equal(s.kills, 1);
});

test('a corpse cannot be shot again, and the ray passes through it', () => {
  mature();
  const target = useGameStore.getState().enemies[0];
  shotAt(target);
  shotAt(target);
  const killsAfter = useGameStore.getState().kills;
  assert.equal(shotAt(target), false, 'no double-kill farming');
  assert.equal(useGameStore.getState().kills, killsAfter);
});

test('the corpse leaves the board when its death clip ends', () => {
  mature();
  const target = useGameStore.getState().enemies[0];
  shotAt(target);
  shotAt(target);
  const board = useGameStore.getState().enemies.length;
  tick(FAR, T += DEATH_SECONDS + 0.05);
  assert.equal(useGameStore.getState().enemies.some((e) => e.id === target.id), false);
  assert.ok(useGameStore.getState().enemies.length < board, 'the corpse was removed');
});

test('corpses SURVIVE a wave respawn — kills fall, they do not pop', () => {
  mature();
  const s = useGameStore.getState();
  // Kill one enemy, delete the rest outright so the wave clears on the next tick.
  const target = s.enemies[0];
  shotAt(target);
  shotAt(target);
  useGameStore.setState({ enemies: useGameStore.getState().enemies.filter((e) => e.id === target.id) });
  tick(FAR, T += 0.016);
  const after = useGameStore.getState();
  assert.equal(after.wave, 2, 'the wave advanced past the corpse');
  assert.ok(after.enemies.some((e) => e.id === target.id && e.state === 'dying'),
    'the corpse rode through the respawn');
});

test('a miss changes nothing and reports false', () => {
  mature();
  const before = useGameStore.getState();
  const result = before.shoot({ x: 9999, y: 10, z: 9999 }, { x: 0, y: -1, z: 0 });
  assert.equal(result, false);
  assert.equal(useGameStore.getState().enemies.length, before.enemies.length);
  assert.equal(useGameStore.getState().kills, 0);
});

test('hitmarker timestamps: every hit stamps lastHitAt; only a kill stamps lastKillAt to match', () => {
  mature();
  const target = useGameStore.getState().enemies[0];
  shotAt(target);
  let s = useGameStore.getState();
  assert.equal(s.lastHitAt, T);
  assert.notEqual(s.lastKillAt, s.lastHitAt, 'first hit is not a kill');
  shotAt(target);
  s = useGameStore.getState();
  assert.equal(s.lastKillAt, T, 'the kill stamps lastKillAt');
});

test('spawn maturity is time-based, not tick-count-based', () => {
  // One tick just before the window closes: still spawning. One just after: alive.
  const spawnedAt = T + 10;
  useGameStore.getState().reset();
  tick(FAR, T = spawnedAt); // reset stamps at the PREVIOUS clock; this tick re-ages from there
  useGameStore.getState().reset(); // stamp precisely at spawnedAt
  tick(FAR, spawnedAt + SPAWN_SECONDS - 0.05);
  assert.equal(useGameStore.getState().enemies[0].state, 'spawning');
  tick(FAR, T = spawnedAt + SPAWN_SECONDS + 0.05);
  assert.equal(useGameStore.getState().enemies[0].state, 'alive');
});

test('the dead do not shoot: shoot() is a no-op once the round is over (GLM-5.3 finding 1)', () => {
  mature();
  for (let i = 0; i < PLAYER_HP; i++) landStrike();
  assert.equal(useGameStore.getState().over, true, 'precondition: the round is over');
  const target = useGameStore.getState().enemies.find((e) => e.state !== 'dying');
  const killsBefore = useGameStore.getState().kills;
  assert.equal(shotAt(target), false, 'a shot from the death screen must not land');
  assert.equal(useGameStore.getState().kills, killsBefore, 'no kill farming while dead');
  assert.equal(useGameStore.getState().enemies.find((e) => e.id === target.id).hp, target.hp);
});

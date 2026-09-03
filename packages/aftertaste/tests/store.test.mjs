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
import { DEBRIS_TTL, MELEE_COOLDOWN } from '../src/state/store.js';

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
  // TEST-DELTA (S2): enemies[0] is now the PARTED regular, and a straight-down ray lands on its
  // HEAD part (×2) — correct behaviour, wrong fixture for a plain-damage claim. Target a partless
  // type so this test keeps asserting base damage; part multipliers have their own tests.
  mature();
  const s = useGameStore.getState();
  const target = s.enemies.find((e) => e.type === 'grease-fly');
  const others = s.enemies.filter((e) => e.id !== target.id).map((e) => e.hp);
  assert.equal(shotAt(target), true);
  const after = useGameStore.getState().enemies;
  assert.equal(after.find((e) => e.id === target.id).hp, target.hp - 1);
  assert.deepEqual(after.filter((e) => e.id !== target.id).map((e) => e.hp), others, 'bystanders untouched');
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

// --- D3: severing — headshots, detached parts, debris (T1-T4 defaults) -------------------------

const headShotAt = (enemy) => {
  // The fryling's head sphere sits at normalized offset (+0.1666, -0.1666) from the enemy —
  // a vertical ray THERE pierces the head before the body (proven in combat.test.mjs).
  const head = enemy.parts.find((p) => p.tag === 'head').hitShape.c;
  return useGameStore.getState().shoot(
    { x: enemy.x + head[0], y: 10, z: enemy.z + head[2] },
    { x: 0, y: -1, z: 0 },
  );
};

test('a headshot one-shots a full-hp fryling: x2 damage, onSever kill, corpse missing its head', () => {
  mature();
  const target = useGameStore.getState().enemies.find((e) => e.type === 'fryling' && e.state === 'alive');
  assert.ok(target?.parts, 'precondition: wave-1 frylings carry parts');
  assert.equal(headShotAt(target), true);
  const s = useGameStore.getState();
  const corpse = s.enemies.find((e) => e.id === target.id);
  assert.equal(corpse.state, 'dying', 'head off = dead, whatever the pool said');
  assert.ok(corpse.severed?.includes('head'), 'the corpse records its missing head');
  assert.equal(s.kills, 1);
});

test('a body shot deals normal damage and severs nothing', () => {
  mature();
  const target = useGameStore.getState().enemies.find((e) => e.type === 'fryling' && e.state === 'alive');
  // TEST-DELTA (S3 re-sculpt): the fryling's new silhouette puts its head over the centre line,
  // so the old straight-down ray now pierces the HEAD first (entry-ordered hitscan, working as
  // designed). A body shot must be aimed at the body: fire horizontally at the body capsule's own
  // height, offset from the head's x so the head sphere is not in the path.
  const body = target.parts.find((p) => p.tag === 'body').hitShape;
  const bodyY = (body.a[1] + body.b[1]) / 2 * (target.renderScale ?? 1);
  assert.equal(useGameStore.getState().shoot(
    { x: target.x, y: bodyY, z: target.z - 10 },
    { x: 0, y: 0, z: 1 },
  ), true);
  const after = useGameStore.getState().enemies.find((e) => e.id === target.id);
  assert.equal(after.hp, target.hp - 1, 'body damage is x1');
  assert.equal(after.state, 'alive');
  assert.equal(after.severed, undefined);
});

test('a sever spawns debris; debris lives in its own array, never among enemies', () => {
  mature();
  const target = useGameStore.getState().enemies.find((e) => e.type === 'fryling' && e.state === 'alive');
  headShotAt(target);
  const s = useGameStore.getState();
  assert.ok(s.debris.length >= 1, 'the severed head became debris');
  assert.ok(s.debris.every((d) => d.part && typeof d.bornAt === 'number'));
  assert.ok(!s.enemies.some((e) => e.part), 'no debris leaked into the enemy list');
});

test('debris expires after its TTL and a fresh round starts with none', () => {
  mature();
  const target = useGameStore.getState().enemies.find((e) => e.type === 'fryling' && e.state === 'alive');
  headShotAt(target);
  assert.ok(useGameStore.getState().debris.length >= 1);
  tick(FAR, T += DEBRIS_TTL + 0.1);
  assert.equal(useGameStore.getState().debris.length, 0, 'the floor does not fill with crumbs');
  useGameStore.getState().reset();
  assert.equal(useGameStore.getState().debris.length, 0);
});

// --- FEEL PACK: the punch, through the store ---------------------------------------------------

test('a punch damages and SHOVES everything in the arc, and respects its cooldown', () => {
  mature();
  const s0 = useGameStore.getState();
  const target = s0.enemies.find((e) => e.state === 'alive');
  // Put the target dead ahead of the player, in punch range.
  target.x = 0; target.z = -1.2;
  const before = { hp: target.hp, z: target.z };
  assert.equal(useGameStore.getState().melee({ x: 0, z: 0 }, 0), true, 'the punch landed');
  const after = useGameStore.getState().enemies.find((e) => e.id === target.id);
  assert.equal(after.hp, before.hp - 1, 'a punch is 1 damage');
  assert.ok(after.z < before.z - 0.5, `shoved away (z ${after.z} vs ${before.z})`);
  // Inside the cooldown a second punch whiffs entirely.
  assert.equal(useGameStore.getState().melee({ x: 0, z: after.z + 1.2 }, 0), false, 'cooldown holds');
});

test('a punch can finish an enemy — the corpse follows the same dying rules as a bullet kill', () => {
  mature();
  const target = useGameStore.getState().enemies.find((e) => e.state === 'alive');
  target.x = 0; target.z = -1.2;
  shotAt(target); // soften to 1 hp (fryling) or kill (fly) — find a fryling to be sure
  const soft = useGameStore.getState().enemies.find((e) => e.id === target.id);
  if (soft && soft.state === 'alive') {
    tick(FAR, T += MELEE_COOLDOWN + 0.05); // clear any cooldown, keep the clock honest
    const t2 = useGameStore.getState().enemies.find((e) => e.id === target.id);
    t2.x = 0; t2.z = -1.2;
    useGameStore.getState().melee({ x: 0, z: 0 }, 0);
    const corpse = useGameStore.getState().enemies.find((e) => e.id === target.id);
    assert.equal(corpse.state, 'dying', 'punched to death = same corpse rules');
  }
});

// --- FEEL PACK: visible bullets — every trigger pull records a tracer, hit or miss -------------

test('every shot records a tracer segment (miss included), and tracers drain fast', () => {
  mature();
  const target = useGameStore.getState().enemies.find((e) => e.state === 'alive');
  shotAt(target); // hit
  useGameStore.getState().shoot({ x: 9999, y: 10, z: 9999 }, { x: 0, y: -1, z: 0 }); // miss
  const s = useGameStore.getState();
  assert.equal(s.shots.length, 2, 'hit AND miss both drew a bullet');
  assert.ok(s.shots.every((sh) => Array.isArray(sh.from) && Array.isArray(sh.to) && typeof sh.at === 'number'));
  const hitShot = s.shots[0];
  const missShot = s.shots[1];
  const len = (sh) => Math.hypot(sh.to[0] - sh.from[0], sh.to[1] - sh.from[1], sh.to[2] - sh.from[2]);
  assert.ok(len(hitShot) < len(missShot), 'a hit tracer STOPS at the monster; a miss flies to max range');
  tick(FAR, T += 1);
  assert.equal(useGameStore.getState().shots.length, 0, 'tracers are gone within a blink');
});

// --- S4: the sever-native economy at the store seam -------------------------------------------

test('a body shot pays NOTHING; the kill pays; the sever pays on top', () => {
  mature();
  const target = useGameStore.getState().enemies.find((e) => e.type === 'fryling' && e.state === 'alive');
  const body = target.parts.find((p) => p.tag === 'body').hitShape;
  const bodyY = (body.a[1] + body.b[1]) / 2 * (target.renderScale ?? 1);
  const before = useGameStore.getState().points;
  useGameStore.getState().shoot({ x: target.x, y: bodyY, z: target.z - 10 }, { x: 0, y: 0, z: 1 });
  assert.equal(useGameStore.getState().points, before, 'plinking a body must not pay');

  // Now take the head off: the sever AND the kill land on one shot.
  const alive = useGameStore.getState().enemies.find((e) => e.id === target.id);
  headShotAt(alive);
  const after = useGameStore.getState();
  assert.ok(after.points > before, `a result pays (${before} -> ${after.points})`);
});

test('clearing a round pays a bonus that scales with the round', () => {
  const first = useGameStore.getState().points;
  useGameStore.setState({ enemies: [] });
  tick(FAR, T += 1);
  const afterWave1 = useGameStore.getState().points;
  assert.ok(afterWave1 > first, 'surviving wave 1 paid');
  useGameStore.setState({ enemies: [] });
  tick(FAR, T += 1);
  const afterWave2 = useGameStore.getState().points;
  assert.ok(afterWave2 - afterWave1 > afterWave1 - first, 'wave 2 pays more than wave 1');
});

test('reset empties the wallet — a new run starts broke', () => {
  useGameStore.setState({ points: 9999 });
  useGameStore.getState().reset();
  assert.equal(useGameStore.getState().points, 0);
});

// --- S4.5 F1: the economy's SECOND door ---------------------------------------------------------
// A choke point is only a choke point if every path that can produce the event goes through it.
// shoot() paid; melee() killed things and paid nothing (Fable 5.1 review, F1 CRIT).

test('F1: a PUNCH kill pays the kill award — the fist is not a free door out of the economy', async () => {
  const { AWARD } = await import('../src/systems/economy.js');
  mature();
  // A one-hp face dies to a single punch, so the award is exact rather than "more than before".
  // grease-fly, not crumb-roach: beforeEach resets to WAVE 1 and the roach only unlocks at wave 2.
  // (My fixture was wrong, not the game — the first draft asserted a face that cannot be on the board.)
  const roach = useGameStore.getState().enemies.find((e) => e.type === 'grease-fly' && e.state === 'alive');
  assert.ok(roach, 'a one-hp face must be on the wave-1 board for this fixture');
  roach.x = 0; roach.z = -1.2;                       // directly in front (yaw 0 faces -z)
  const before = useGameStore.getState().points;
  useGameStore.setState({ meleeReadyAt: -1 });        // no cooldown in the way
  assert.equal(useGameStore.getState().melee({ x: 0, z: 0 }, 0), true, 'the punch connected');
  const after = useGameStore.getState();
  assert.equal(after.enemies.find((e) => e.id === roach.id).state, 'dying', 'the punch killed it');
  assert.equal(after.points, before + AWARD.kill, 'a punch kill pays exactly the kill award');
});

test('F1: a punch that only WOUNDS pays nothing — results pay, contact does not', async () => {
  mature();
  const tough = useGameStore.getState().enemies.find((e) => e.type === 'regular' && e.state === 'alive');
  tough.x = 0; tough.z = -1.2;
  const before = useGameStore.getState().points;
  useGameStore.setState({ meleeReadyAt: -1 });
  useGameStore.getState().melee({ x: 0, z: 0 }, 0);
  const after = useGameStore.getState();
  assert.equal(after.enemies.find((e) => e.id === tough.id).state, 'alive', 'it survived the punch');
  assert.equal(after.points, before, 'wounding pays nothing — the same law the gun obeys');
});

test('F5: the decoration arrays are CAPPED — a long run cannot grow them without bound', async () => {
  const { SHOT_CAP } = await import('../src/state/store.js');
  mature();
  // Fire far more shots than the cap, all misses (straight up at nothing).
  for (let i = 0; i < SHOT_CAP + 40; i++) {
    useGameStore.getState().shoot({ x: 0, y: 0, z: 0 }, { x: 0, y: 1, z: 0 });
  }
  assert.equal(useGameStore.getState().shots.length, SHOT_CAP, 'tracers ring-buffer at the cap');
});

test('F6: reset marks a NEW RUN so the trigger knows to holster', () => {
  const before = useGameStore.getState().runId;
  useGameStore.getState().reset();
  assert.equal(useGameStore.getState().runId, before + 1);
});

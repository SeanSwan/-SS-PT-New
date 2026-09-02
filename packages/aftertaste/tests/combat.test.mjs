/**
 * Combat, as pure functions — rewritten for the FPS slice.
 *
 * TEST-DELTA DISCLOSURE: the Slice-4 tests for `hits`/`fireAt` (point-and-radius, click-to-shoot)
 * were REMOVED together with that mechanic when Sean redirected shooting to the Overwatch/BF6
 * model — hitscan from the eye. The damage/isDead tests survive unchanged; the ray tests below
 * are the new mechanic's contract. See CONCEPTS/fps-camera-and-hitscan.md.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  hitscan, damage, isDead, meleeHits, ENEMY_HP, AIM_RADIUS, TARGET_HEIGHT, MAX_RANGE,
} from '../src/combat/combat.js';

const eye = { x: 0, y: 1.6, z: 0 };
/** A level ray needs a level target: fire from waist height so geometry is 2D-simple. */
const waist = { x: 0, y: TARGET_HEIGHT, z: 0 };
const FWD = { x: 0, y: 0, z: -1 };

test('a straight-ahead shot hits the enemy in front of you', () => {
  const hit = hitscan(waist, FWD, [{ id: 'a', x: 0, z: -10 }]);
  assert.equal(hit?.target.id, 'a');
  // t reports where the bullet ENTERS the sphere (centre minus radius), not the centre distance —
  // entry is what selection orders on, so entry is what the contract reports.
  assert.ok(Math.abs(hit.t - (10 - AIM_RADIUS)) < 1e-9, 'entry distance along the ray is reported');
});

test('an enemy BEHIND you is never hit — guns do not shoot backwards', () => {
  assert.equal(hitscan(waist, FWD, [{ id: 'a', x: 0, z: +10 }]), null);
});

test('of two enemies on the same line, the NEARER one takes the shot', () => {
  const hit = hitscan(waist, FWD, [
    { id: 'far', x: 0, z: -20 },
    { id: 'near', x: 0, z: -5 },
  ]);
  assert.equal(hit.target.id, 'near');
});

test('a shot passing within AIM_RADIUS counts; outside it misses', () => {
  assert.ok(hitscan(waist, FWD, [{ id: 'graze', x: AIM_RADIUS - 0.01, z: -10 }]));
  assert.equal(hitscan(waist, FWD, [{ id: 'wide', x: AIM_RADIUS + 0.01, z: -10 }]), null);
});

test('beyond MAX_RANGE the shot hits nothing', () => {
  assert.equal(hitscan(waist, FWD, [{ id: 'a', x: 0, z: -(MAX_RANGE + 1) }]), null);
});

test('shooting from eye height at the floor-standing enemy works when the ray tilts down', () => {
  // Enemy centre is at TARGET_HEIGHT; from a 1.6-high eye a LEVEL ray passes 1.1 above it — too
  // far. Aim down at it and it hits. This is why aim has pitch.
  const ez = -10;
  assert.equal(hitscan(eye, FWD, [{ id: 'a', x: 0, z: ez }]), null, 'level ray sails over');
  const dy = TARGET_HEIGHT - eye.y;
  const len = Math.hypot(ez, dy);
  const down = { x: 0, y: dy / len, z: ez / len };
  assert.equal(hitscan(eye, down, [{ id: 'a', x: 0, z: ez }])?.target.id, 'a');
});

test('an empty world is a miss, not a crash', () => {
  assert.equal(hitscan(waist, FWD, []), null);
});

test('damage reduces hp and never mutates the enemy passed in', () => {
  const enemy = { hp: ENEMY_HP, x: 0, z: 0 };
  const hurt = damage(enemy, 1);
  assert.equal(hurt.hp, ENEMY_HP - 1);
  assert.equal(enemy.hp, ENEMY_HP, 'the original must be untouched');
});

test('hp floors at zero — negative hp breaks every UI that renders a bar', () => {
  assert.equal(damage({ hp: 1, x: 0, z: 0 }, 999).hp, 0);
});

test('dead means hp <= 0', () => {
  assert.equal(isDead({ hp: 0 }), true);
  assert.equal(isDead({ hp: 1 }), false);
});

test('an enemy takes ENEMY_HP shots to kill, not one', () => {
  let e = { hp: ENEMY_HP, x: 0, z: 0 };
  for (let i = 0; i < ENEMY_HP - 1; i++) {
    e = damage(e, 1);
    assert.equal(isDead(e), false, `died early after ${i + 1} shots`);
  }
  assert.equal(isDead(damage(e, 1)), true);
});

test('a target may carry its OWN aimRadius — the long patty-larva is easier to hit than a fryling', () => {
  const wide = { id: 'larva', x: 0.8, z: -10, aimRadius: 0.9 };
  const normal = { id: 'fry', x: 0.8, z: -10 };
  assert.equal(hitscan(waist, FWD, [wide])?.target.id, 'larva', 'inside ITS radius');
  assert.equal(hitscan(waist, FWD, [normal]), null, 'same offset misses the default radius');
});

// --- GLM-5.3 hostile-review round (2026-09-01): the two hitscan cases the suite never had ------

test('the bullet hits the sphere it ENTERS first, not the nearest centre (grazing-shot ordering)', () => {
  // A is dead-centre with its centre closer along the ray than B's — but B is grazed and its
  // sphere ENTRY point is closer to the muzzle than A's. The bullet physically reaches B first.
  const A = { id: 'A', x: 0, z: -6.0, aimRadius: 1.2 };      // entry at t = 6.0 - 1.2 = 4.8
  const B = { id: 'B', x: 1.1, z: -5.9, aimRadius: 1.2 };    // centre approach t=5.9, graze — entry ≈ 5.42... pick numbers below
  // Recompute honestly: choose B so its entry beats A's entry while its centre-t is LARGER.
  // A: centre t=6.0, entry 4.8. B at z=-5.5, x=0 with small radius? Need centre-t(B) > centre-t(A)
  // AND entry(B) < entry(A): B centre t=6.2, radius 1.5 -> entry 4.7 < 4.8. Offset x=0 keeps it exact.
  const B2 = { id: 'B2', x: 0, z: -6.2, aimRadius: 1.5 };    // entry at 6.2 - 1.5 = 4.7
  const hit = hitscan(waist, FWD, [A, B2]);
  assert.equal(hit?.target.id, 'B2', 'entry order decides, not centre order');
});

test('a muzzle INSIDE a sphere still hits it — entry clamps to zero, it does not go negative-and-skip', () => {
  const swallowing = { id: 'S', x: 0.1, z: 0.2, aimRadius: 1.0 }; // the waist origin is inside this sphere
  const hit = hitscan(waist, FWD, [swallowing]);
  assert.equal(hit?.target.id, 'S', 'point-blank contact must register');
});

// --- D3: locational hitscan — the ray picks the PART it enters first ---------------------------

const PARTED = () => ({
  id: 'parted', x: 0, z: -10,
  parts: [
    { tag: 'body', hitShape: { kind: 'capsule', a: [0, 0.3333, 0], b: [0, 0.3333, 0], r: 0.3333 } },
    { tag: 'head', hitShape: { kind: 'sphere', c: [0.1666, 0.8334, -0.1666], r: 0.1667 } },
  ],
});

test('a ray through the head sphere reports part "head"', () => {
  // Straight down over the head shape's own x/z: it pierces the head at y=1.0 before it could
  // reach the body capsule lower down — entry ORDER picks the part, exactly like enemy selection.
  const origin = { x: 0.1666, y: 10, z: -10.1666 };
  const hit = hitscan(origin, { x: 0, y: -1, z: 0 }, [PARTED()]);
  assert.equal(hit?.target.id, 'parted');
  assert.equal(hit.part, 'head');
});

test('a ray through the torso reports part "body"', () => {
  // Level ray at waist height through the enemy's centre line — inside the body capsule,
  // far from the head sphere.
  const hit = hitscan({ x: 0, y: 0.3333, z: 0 }, FWD, [PARTED()]);
  assert.equal(hit?.target.id, 'parted');
  assert.equal(hit.part, 'body');
});

test('head-vs-body ordering: a downward ray clipping BOTH shapes goes to the one entered first', () => {
  // x/z chosen so the vertical ray passes through the head sphere AND within the body capsule's
  // radius. Head entry is higher (y≈1.0) than body entry (y≈0.57): head must win.
  const origin = { x: 0.1666, y: 10, z: -10.1666 };
  const e = PARTED();
  const hit = hitscan(origin, { x: 0, y: -1, z: 0 }, [e]);
  // precondition: the body capsule IS reachable by this ray (lateral distance < r)
  const lat = Math.hypot(0.1666 - 0, -10.1666 - (-10));
  assert.ok(lat < 0.3333, `precondition failed: lateral ${lat}`);
  assert.equal(hit.part, 'head');
});

test('a partless enemy still hits with part null — lifecycle for the other three monsters', () => {
  const hit = hitscan(waist, FWD, [{ id: 'plain', x: 0, z: -10 }]);
  assert.equal(hit?.target.id, 'plain');
  assert.equal(hit.part ?? null, null);
});

test('nearest ENTRY still arbitrates across enemies when one is parted', () => {
  // A partless enemy in front of the parted one: its sphere entry comes first.
  const near = { id: 'near', x: 0, z: -5 };
  const hit = hitscan(waist, FWD, [PARTED(), near]);
  assert.equal(hit.target.id, 'near');
});

test('a miss on every part is a miss on the enemy — no falling back to the whole-body sphere', () => {
  // Ray passes the OLD whole-body sphere region but outside every part shape: above the body
  // capsule, beside the head. A parted monster is exactly its parts.
  const hit = hitscan({ x: -0.3, y: 0.9, z: 0 }, FWD, [PARTED()]);
  assert.equal(hit, null);
});

test('renderScale scales part shapes: hitboxes follow the rendered silhouette (H8 guard)', () => {
  // FIRST VERSION OF THIS TEST measured an incidental arrangement (§10.2's own lesson): it fired
  // at the old 1x head position and expected a miss — but the 2x head sphere GROWS enough to
  // still cover that ray. The claim worth testing is the ENTRY HEIGHT: a doubled monster's head
  // is entered roughly twice as high, so the vertical ray's entry t (from y=10) is smaller.
  const big = { ...PARTED(), id: 'big', renderScale: 2 };
  const headAt1 = hitscan({ x: 0.1666, y: 10, z: -10.1666 }, { x: 0, y: -1, z: 0 }, [PARTED()]);
  assert.equal(headAt1.part, 'head', 'precondition: the 1x ray finds the head');
  const scaledRay = hitscan({ x: 0.3332, y: 10, z: -10.3332 }, { x: 0, y: -1, z: 0 }, [big]);
  assert.equal(scaledRay?.part, 'head', 'the 2x head lives at 2x the offset');
  // 1x head top ≈ y 1.0 → t ≈ 9.0; 2x head entry ≈ y 1.9-2.0 → t ≈ 8.0-8.1.
  assert.ok(scaledRay.t < headAt1.t - 0.5,
    `the scaled head is entered HIGHER (t ${scaledRay.t.toFixed(2)} vs ${headAt1.t.toFixed(2)})`);
  // And a ray ABOVE the 1x head but inside the 2x head's reach hits only the big one.
  const highRay = { x: 0.3332, y: 1.75, z: 0 };
  assert.equal(hitscan(highRay, FWD, [PARTED()]), null, '1x monster tops out below y=1.75');
  assert.equal(hitscan(highRay, FWD, [big])?.part, 'head', 'the 2x head occupies that height');
});

// --- FEEL PACK: the punch — close range, in your facing arc, shoves what it hits --------------

test('meleeHits: in range AND inside the facing arc hits; behind you or far away does not', () => {
  const player = { x: 0, z: 0 };
  const enemies = [
    { id: 'front', x: 0, z: -1.2 },   // dead ahead (yaw 0 faces -z)
    { id: 'flank', x: 1.0, z: -1.0 }, // ~45° off — inside the arc
    { id: 'behind', x: 0, z: 1.2 },   // behind
    { id: 'far', x: 0, z: -3 },       // ahead but out of reach
  ];
  const hits = meleeHits(enemies, player, 0).map((e) => e.id).sort();
  assert.deepEqual(hits, ['flank', 'front']);
});

test('meleeHits respects yaw: turn 180° and the arc turns with you', () => {
  const hits = meleeHits([{ id: 'b', x: 0, z: 1.2 }], { x: 0, z: 0 }, Math.PI);
  assert.deepEqual(hits.map((e) => e.id), ['b']);
});

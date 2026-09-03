/**
 * store.js — the one place that knows the state of the world.
 *
 * TEACHING NOTE — WHY A STORE AT ALL:
 * The camera needs the player's position. Later, every enemy will too. Passing it down through
 * component props would mean threading it through everything in between ("prop drilling"). A store
 * is a small shared table any component can read from directly.
 *
 * Zustand is used because it is tiny and does not force a re-render unless the specific value you
 * subscribed to changed. That property matters a lot in a game.
 */
import { create } from 'zustand';

export const usePlayerStore = create((set) => ({
  position: { x: 0, z: 0 },
  setPosition: (position) => {
    set({ position });
    // A deliberate test seam, not a leak. A browser test cannot reach into a JS module's closure,
    // so without this the only way to assert "the player actually moved" is to compare screenshots
    // — which is slow, flaky, and tells you nothing about WHY it failed. One readable global, wide
    // enough for a test to read and narrow enough that nothing else is tempted to depend on it.
    if (typeof window !== 'undefined') window.__swanPlayerPos = position;
  },
}));

/**
 * The world state that more than one system touches: the enemies, and the score.
 *
 * TEACHING NOTE — WHEN TO PROMOTE STATE INTO A STORE:
 * In Slice 3 the enemy list lived inside Enemies.jsx, and that was correct: only one thing used it.
 * Slice 4 adds shooting, which must REMOVE enemies from somewhere else entirely. The moment a
 * second system needs the same data is the moment it belongs in the store — not before. Promoting
 * everything "just in case" is how a small game turns into a tangle.
 */
import { hitscan, damage, isDead, meleeHits } from '../combat/combat.js';

/** Seconds between punches, and how far a landed punch shoves its victims. */
export const MELEE_COOLDOWN = 0.4;
export const MELEE_KNOCKBACK = 1.4;
import { waveSize, spawnRing, tickRound, PLAYER_HP, inTouchRange } from '../systems/waves.js';
import { stepLifecycle, can, holdsWave } from '../systems/lifecycle.js';
import { PART_DAMAGE } from '../enemies/partsData.js';
import { ROSTER } from '../enemies/roster.js';
import { awardForShot, awardForRound } from '../systems/economy.js';
import { startRoom, roomAt, visibleRooms } from '../world/rooms.js';

/** Seconds a severed part's debris tumbles before fading off the floor — T4 default. */
export const DEBRIS_TTL = 4;

/** Seconds a tracer streak lives. A blink — the bullet already arrived; this is its wake. */
export const SHOT_TTL = 0.08;

/**
 * Hard caps on the DECORATION arrays (F5). Both drain on a TTL, which is fine at wave 3 and a
 * garbage-collector problem at wave 15 with a shotgun: eight tracers per trigger pull, every pull.
 * A cap turns an unbounded allocation into a ring — oldest out, newest in, cost known in advance.
 */
export const SHOT_CAP = 48;
export const DEBRIS_CAP = 24;

/** Append with a ceiling: the oldest entries fall off the front. */
export const pushCapped = (arr, items, cap) => {
  const next = arr.concat(items);
  return next.length > cap ? next.slice(next.length - cap) : next;
};

/** Seconds of mercy after a hit, so one touch is not three instant deaths. */
const INVULN_SECONDS = 1.0;

/**
 * The game clock's latest reading, OUTSIDE the reactive state on purpose: it changes 60 times a
 * second, and putting it in the store would re-render every HUD subscriber every frame for a
 * number no UI draws. tick() refreshes it; shoot() reads it to timestamp hitmarkers. Same
 * reasoning as the aim living outside the store — see aim.js.
 */
let clockNow = 0;

/** Where threats appear, relative to the player. ONE export — it used to be a literal 18 in
 *  three call sites, and the blueprint's "change the game by editing a number" promise was a lie
 *  for this number (GLM-5.3 hostile review, finding 15). */
export const SPAWN_RADIUS = 18;

const firstWave = () => spawnRing(waveSize(1), SPAWN_RADIUS, 1, { x: 0, z: 0 }, 0, startRoom());

export const useGameStore = create((set, get) => ({
  enemies: firstWave(),
  kills: 0,
  /** The wallet. Earned by RESULTS only — see systems/economy.js. */
  points: 0,
  hp: PLAYER_HP,
  wave: 1,
  over: false,
  /** Which room the player is standing in (S6a). null = the pre-room open yard. */
  room: startRoom(),
  /** Doors bought this run — permanent, which is what makes opening one a commitment. */
  openDoors: [],
  invulnUntil: 0,
  /** Bumped by reset(); the trigger holsters the gun when it sees a new value (F6). */
  runId: 0,
  /** Kissing-bug fever: a clock time, 0 = healthy. Visible on the HUD by design (S3). */
  feverUntil: 0,
  /** When the last shot connected / killed — the HUD's hitmarker reads these. -1 = never:
   *  0 is a REAL clock value (a hit on the first frame, before any tick), and using it as the
   *  sentinel swallowed that hitmarker. Sentinels must live outside the value's domain. */
  lastHitAt: -1,
  lastKillAt: -1,
  /** The last award, and when. The HUD floats a "+N" from these — a number that changes silently
   *  in a corner teaches nobody the rule that severing is how you get paid (G1). */
  lastAward: 0,
  lastAwardAt: -1,
  /** Severed parts tumbling on the floor. DECORATION, by contract: never consulted by tickRound,
   *  hitscan, or steering — a gib cannot hold a wave open or soak a bullet. Drained by tick. */
  debris: [],
  /** Live tracer streaks — every trigger pull, hit or miss ("I wanna see bullets"). Drained fast. */
  shots: [],

  /**
   * Fire one hitscan shot from `origin` along `dir` (the Overwatch/BF6 model — the decision is a
   * ray test at the instant of the trigger; any tracer is decoration). Returns true on a hit.
   */
  shoot: (origin, dir) => {
    const { enemies, kills, over } = get();
    // The dead do not shoot. Without this, dying while holding the trigger farms kills from the
    // death screen — tick() stops, but the trigger's frame loop does not (GLM-5.3, finding 1).
    if (over) return false;
    // Only the shootable are targets — the ray passes THROUGH a toppling corpse and a still-
    // materialising spawn to whatever stands behind them. The lifecycle table decides, not us.
    // BROADPHASE (blueprint §2.5): a shot only tests monsters in rooms it could possibly reach.
    // The cost of a trigger pull is bounded by the room you stand in, not by how many monsters
    // exist — which is what makes a shotgun's eight pellets affordable at wave 15.
    const { room, openDoors } = get();
    const reachable = room ? visibleRooms(room, new Set(openDoors)) : null;
    const targets = enemies.filter((e) => can(e, 'canBeShot')
      && (!reachable || reachable.has(roomAt(e.x, e.z) ?? room)));
    const hit = hitscan(origin, dir, targets);
    // THE BULLET IS VISIBLE, hit or miss: a hit tracer stops at the monster, a miss flies to max
    // range. Recorded before the miss-return so whiffs still read as gunfire.
    const reach = hit ? hit.t : 60;
    const tracer = {
      id: `shot-${clockNow.toFixed(3)}-${Math.random().toString(36).slice(2, 6)}`,
      from: [origin.x, origin.y, origin.z],
      to: [origin.x + dir.x * reach, origin.y + dir.y * reach, origin.z + dir.z * reach],
      at: clockNow,
    };
    if (!hit) { set({ shots: pushCapped(get().shots, [tracer], SHOT_CAP) }); return false; }
    // LOCATIONAL DAMAGE (D3): the struck part sets the multiplier — headshots hit twice as hard
    // (T3 default). A partless monster's null part reads as x1.
    let hurt = damage(hit.target, PART_DAMAGE[hit.part] ?? 1);
    // SEVERING, per the roster-v2 contract: a severable part detaches when the pool crosses its
    // threshold AND that part took the crossing hit — you shot the arm off, the arm you shot.
    const newDebris = [];
    const struck = hit.part && (hit.target.parts ?? []).find((p) => p.tag === hit.part);
    if (struck?.severable && !(hit.target.severed ?? []).includes(struck.tag)) {
      const maxHp = ROSTER[hit.target.type]?.hp ?? hit.target.hp;
      if (hurt.hp <= struck.severAtHpFraction * maxHp) {
        hurt = { ...hurt, severed: [...(hit.target.severed ?? []), struck.tag] };
        if (struck.onSever === 'kill') hurt = { ...hurt, hp: 0 };
        if (struck.onSever === 'slow') hurt = { ...hurt, speedScale: (hit.target.speedScale ?? 1) * 0.5 };
        newDebris.push({
          id: `${hit.target.id}-${struck.tag}`, type: hit.target.type, part: struck.tag,
          x: hit.target.x, z: hit.target.z, bornAt: clockNow,
        });
      }
    }
    const killed = isDead(hurt) ? 1 : 0;
    // The killing shot does NOT remove the enemy — it starts the death. The corpse stays on the
    // board playing its topple until the lifecycle ages it off; the kill is SCORED now, because
    // the kill happened now.
    const next = enemies.map((e) => {
      if (e.id !== hit.target.id) return e;
      return killed ? { ...hurt, state: 'dying', stateSince: clockNow } : hurt;
    });
    // ONE choke point for income (S4): every point in the game is minted here or at round clear.
    const earned = awardForShot({ severed: newDebris.length, killed: killed === 1 });
    const severedNow = newDebris.length;
    set({
      enemies: next,
      kills: kills + killed,
      ...(earned ? { points: get().points + earned, lastAward: earned, lastAwardAt: clockNow } : {}),
      lastHitAt: clockNow,
      shots: pushCapped(get().shots, [tracer], SHOT_CAP),
      ...(killed ? { lastKillAt: clockNow } : {}),
      ...(newDebris.length ? { debris: pushCapped(get().debris, newDebris, DEBRIS_CAP) } : {}),
    });
    if (typeof window !== 'undefined') {
      window.__swanKills = kills + killed;
      // The store stays pure of Web Audio: it announces WHAT happened and the sound layer decides
      // how that sounds. One seam, and node tests never meet an AudioContext.
      window.__swanSfx?.(severedNow ? 'sever' : killed ? 'kill' : null);
    }
    return true;
  },

  /** When the last punch may swing again — outside reactive state (it never draws UI). */
  meleeReadyAt: 0,

  /**
   * The punch (playtest 2). Hits EVERYTHING in range inside the swing arc: 1 damage each plus a
   * shove away from you. Fists are not locational — no severing, no multipliers; a punch that
   * finishes an enemy starts the same dying it would from a bullet.
   */
  melee: (player, yaw) => {
    const s = get();
    if (s.over || clockNow < s.meleeReadyAt) return false;
    const victims = meleeHits(s.enemies.filter((e) => can(e, 'canBeShot')), player, yaw);
    if (!victims.length) { set({ meleeReadyAt: clockNow + MELEE_COOLDOWN }); return false; }
    let killedNow = 0;
    const ids = new Set(victims.map((v) => v.id));
    const next = s.enemies.map((e) => {
      if (!ids.has(e.id)) return e;
      let hurt = damage(e, 1);
      // The shove: straight away from the player, capped so nobody teleports.
      const dx = e.x - player.x; const dz = e.z - player.z;
      const d = Math.hypot(dx, dz) || 1;
      hurt = { ...hurt, x: e.x + (dx / d) * MELEE_KNOCKBACK, z: e.z + (dz / d) * MELEE_KNOCKBACK };
      if (isDead(hurt)) { killedNow += 1; hurt = { ...hurt, state: 'dying', stateSince: clockNow }; }
      return hurt;
    });
    // THE SECOND DOOR (F1). shoot() minted points and melee() did not, so every fist kill was
    // free labour — "one choke point" is only true if every path that PRODUCES the event goes
    // through it. Fists pay the kill award and never a sever: precision is what severing pays for,
    // and a punch is survival, not marksmanship.
    const earned = killedNow * awardForShot({ killed: true });
    set({
      enemies: next,
      kills: s.kills + killedNow,
      ...(earned ? { points: s.points + earned, lastAward: earned, lastAwardAt: clockNow } : {}),
      meleeReadyAt: clockNow + MELEE_COOLDOWN,
      lastHitAt: clockNow,
      ...(killedNow ? { lastKillAt: clockNow } : {}),
    });
    if (typeof window !== 'undefined') window.__swanKills = s.kills + killedNow;
    return true;
  },

  /**
   * One frame of round logic. Called from the game loop.
   *
   * TEACHING NOTE — WHY AN INVULNERABILITY WINDOW:
   * tickRound costs one life per FRAME an enemy is touching. At 60fps that is 60 lives a second,
   * so a single bump would end the round instantly. Every game with contact damage has a brief
   * mercy period after a hit; this is that. Without it the death feels arbitrary, and the player
   * blames the game rather than themselves.
   */
  tick: (player, elapsed) => {
    const s = get();
    clockNow = elapsed;
    if (s.over) return;

    const merciful = elapsed < s.invulnUntil;

    // Age every enemy through the state machine against the REAL clock and board: spawns mature,
    // attacks begin when in touch range and expire back to alive, corpses fall off the board.
    // stepLifecycle returns the SAME object when nothing changed, so `changed` is an identity
    // check, and a frame where nobody transitions costs no React work at all.
    const stepped = [];
    let changed = false;
    for (const e of s.enemies) {
      // The SAME range function tickRound asks — attack trigger and strike range cannot drift.
      // The ambush clock (F11): stamp the moment a telegraphing creature first crosses into its
      // lunge range, so its gait can hold a wind-up. Stamped HERE, not in the gait, because a pure
      // pose function must not own memory — and cleared when it leaves, so a dodge really resets it.
      const lunge = ROSTER[e.type]?.gait?.lungeRange;
      if (lunge) {
        const near = (e.x - player.x) ** 2 + (e.z - player.z) ** 2 <= lunge ** 2;
        if (near && e.enteredRangeAt == null) e.enteredRangeAt = elapsed;
        else if (!near && e.enteredRangeAt != null) e.enteredRangeAt = null;
      }
      const next = stepLifecycle(e, elapsed, inTouchRange(e, player));
      if (next !== e) changed = true;
      if (next) stepped.push(next);
    }

    // Ask about the REAL board, then decide what to act on. An earlier version suppressed damage by
    // handing tickRound an empty enemy list -- but an empty list also means "wave cleared", so every
    // hit advanced the wave and respawned the flock at radius 18, and the round could not be lost.
    // Both units were correct; the composition was not. Suppress the CONSEQUENCE, never the input.
    const r = tickRound({ hp: s.hp, wave: s.wave }, player, stepped, elapsed);

    const patch = {};
    if (changed) patch.enemies = stepped;
    // Debris fades when its TTL ends — decoration cleans itself up (T4 default: 4s).
    if (s.debris.length && s.debris.some((d) => elapsed - d.bornAt >= DEBRIS_TTL)) {
      patch.debris = s.debris.filter((d) => elapsed - d.bornAt < DEBRIS_TTL);
    }
    if (s.shots.length && s.shots.some((sh) => elapsed - sh.at >= SHOT_TTL)) {
      patch.shots = s.shots.filter((sh) => elapsed - sh.at < SHOT_TTL);
    }
    if (r.touched && !merciful) {
      patch.hp = r.hp;
      patch.over = r.over;
      patch.invulnUntil = elapsed + INVULN_SECONDS;
      // A fever is a VISIBLE timer (roster onTouch). It rides the same invulnerability gate as the
      // damage that carried it, so a bite you were merciful-immune to cannot infect you either.
      if (r.fever > 0) patch.feverUntil = elapsed + r.fever;
    }
    // Expire it here rather than in the HUD: one clock owns the truth, and the HUD only draws.
    if (s.feverUntil > 0 && elapsed >= s.feverUntil) patch.feverUntil = 0;
    if (r.cleared) {
      patch.wave = r.wave;
      patch.points = s.points + awardForRound(s.wave);
      patch.lastAward = awardForRound(s.wave);
      patch.lastAwardAt = elapsed;
      // Centred on the PLAYER: the floor follows you now, so a ring fixed at the origin would
      // spawn the next wave a full sprint behind wherever you have kited to. Corpses still mid-
      // topple SURVIVE the respawn — the lifecycle removes them when their death clip ends;
      // replacing the whole array would make kills pop instead of fall.
      patch.enemies = [
        ...stepped.filter((e) => e.state === 'dying'),
        ...spawnRing(waveSize(r.wave), SPAWN_RADIUS, r.wave, player, elapsed, s.room),
      ];
    }
    if (Object.keys(patch).length) set(patch);

    if (typeof window !== 'undefined') {
      const now = get();
      window.__swanRound = {
        hp: now.hp, wave: now.wave, over: now.over,
        // "Remaining" counts what still holds the wave open — a corpse is not remaining.
        left: now.enemies.filter(holdsWave).length,
      };
    }
  },

  reset: () => {
    // The player does not teleport home on a restart, so the fresh wave rings THEM.
    const centre = usePlayerStore.getState().position;
    set({
      enemies: spawnRing(waveSize(1), SPAWN_RADIUS, 1, centre, clockNow, startRoom()),
      kills: 0, points: 0, hp: PLAYER_HP, wave: 1, over: false, invulnUntil: 0, feverUntil: 0,
      room: startRoom(), openDoors: [],
      lastAward: 0, lastAwardAt: -1,
      runId: get().runId + 1,
      lastHitAt: -1, lastKillAt: -1, debris: [], shots: [], meleeReadyAt: 0,
    });
    if (typeof window !== 'undefined') {
      // Reset owns EVERY seam a round accumulates — a per-round stat built on a seam that
      // survives restarts silently inherits the previous round (GLM-5.3, finding 13).
      window.__swanKills = 0;
      window.__swanShotsFired = 0;
      window.__swanRound = { hp: PLAYER_HP, wave: 1, over: false, left: waveSize(1) };
    }
  },
}));

// Test seam, same reasoning as __swanPlayerPos: a browser test cannot reach into a module closure,
// and driving combat through exact screen pixels of a MOVING box is flaky for reasons unrelated to
// the feature under test. The raycast path is covered by its own ground-click test.
if (typeof window !== 'undefined') window.__swanGameStore = useGameStore;

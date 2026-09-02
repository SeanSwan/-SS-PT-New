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
import { hitscan, damage, isDead } from '../combat/combat.js';
import { waveSize, spawnRing, tickRound, PLAYER_HP, inTouchRange } from '../systems/waves.js';
import { stepLifecycle, can, holdsWave } from '../systems/lifecycle.js';
import { PART_DAMAGE } from '../enemies/partsData.js';
import { ROSTER } from '../enemies/roster.js';

/** Seconds a severed part's debris tumbles before fading off the floor — T4 default. */
export const DEBRIS_TTL = 4;

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

const firstWave = () => spawnRing(waveSize(1), SPAWN_RADIUS, 1);

export const useGameStore = create((set, get) => ({
  enemies: firstWave(),
  kills: 0,
  hp: PLAYER_HP,
  wave: 1,
  over: false,
  invulnUntil: 0,
  /** When the last shot connected / killed — the HUD's hitmarker reads these. -1 = never:
   *  0 is a REAL clock value (a hit on the first frame, before any tick), and using it as the
   *  sentinel swallowed that hitmarker. Sentinels must live outside the value's domain. */
  lastHitAt: -1,
  lastKillAt: -1,
  /** Severed parts tumbling on the floor. DECORATION, by contract: never consulted by tickRound,
   *  hitscan, or steering — a gib cannot hold a wave open or soak a bullet. Drained by tick. */
  debris: [],

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
    const hit = hitscan(origin, dir, enemies.filter((e) => can(e, 'canBeShot')));
    if (!hit) return false;
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
    set({
      enemies: next,
      kills: kills + killed,
      lastHitAt: clockNow,
      ...(killed ? { lastKillAt: clockNow } : {}),
      ...(newDebris.length ? { debris: [...get().debris, ...newDebris] } : {}),
    });
    if (typeof window !== 'undefined') window.__swanKills = kills + killed;
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
    if (r.touched && !merciful) {
      patch.hp = r.hp;
      patch.over = r.over;
      patch.invulnUntil = elapsed + INVULN_SECONDS;
    }
    if (r.cleared) {
      patch.wave = r.wave;
      // Centred on the PLAYER: the floor follows you now, so a ring fixed at the origin would
      // spawn the next wave a full sprint behind wherever you have kited to. Corpses still mid-
      // topple SURVIVE the respawn — the lifecycle removes them when their death clip ends;
      // replacing the whole array would make kills pop instead of fall.
      patch.enemies = [
        ...stepped.filter((e) => e.state === 'dying'),
        ...spawnRing(waveSize(r.wave), SPAWN_RADIUS, r.wave, player, elapsed),
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
      enemies: spawnRing(waveSize(1), SPAWN_RADIUS, 1, centre, clockNow),
      kills: 0, hp: PLAYER_HP, wave: 1, over: false, invulnUntil: 0,
      lastHitAt: -1, lastKillAt: -1, debris: [],
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

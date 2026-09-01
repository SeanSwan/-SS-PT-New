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
import { waveSize, spawnRing, tickRound, PLAYER_HP, TOUCH_RADIUS } from '../systems/waves.js';
import { stepLifecycle, can, holdsWave } from '../systems/lifecycle.js';

/** Seconds of mercy after a hit, so one touch is not three instant deaths. */
const INVULN_SECONDS = 1.0;

/**
 * The game clock's latest reading, OUTSIDE the reactive state on purpose: it changes 60 times a
 * second, and putting it in the store would re-render every HUD subscriber every frame for a
 * number no UI draws. tick() refreshes it; shoot() reads it to timestamp hitmarkers. Same
 * reasoning as the aim living outside the store — see aim.js.
 */
let clockNow = 0;

const firstWave = () => spawnRing(waveSize(1), 18, 1);

export const useGameStore = create((set, get) => ({
  enemies: firstWave(),
  kills: 0,
  hp: PLAYER_HP,
  wave: 1,
  over: false,
  invulnUntil: 0,
  /** When the last shot connected / killed — the HUD's hitmarker reads these. 0 = never. */
  lastHitAt: 0,
  lastKillAt: 0,

  /**
   * Fire one hitscan shot from `origin` along `dir` (the Overwatch/BF6 model — the decision is a
   * ray test at the instant of the trigger; any tracer is decoration). Returns true on a hit.
   */
  shoot: (origin, dir) => {
    const { enemies, kills } = get();
    // Only the shootable are targets — the ray passes THROUGH a toppling corpse and a still-
    // materialising spawn to whatever stands behind them. The lifecycle table decides, not us.
    const hit = hitscan(origin, dir, enemies.filter((e) => can(e, 'canBeShot')));
    if (!hit) return false;
    const hurt = damage(hit.target, 1);
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
    const touch2 = TOUCH_RADIUS ** 2;
    const stepped = [];
    let changed = false;
    for (const e of s.enemies) {
      const inRange = (e.x - player.x) ** 2 + (e.z - player.z) ** 2 <= touch2;
      const next = stepLifecycle(e, elapsed, inRange);
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
        ...spawnRing(waveSize(r.wave), 18, r.wave, player, elapsed),
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
      enemies: spawnRing(waveSize(1), 18, 1, centre, clockNow),
      kills: 0, hp: PLAYER_HP, wave: 1, over: false, invulnUntil: 0,
      lastHitAt: 0, lastKillAt: 0,
    });
    if (typeof window !== 'undefined') {
      window.__swanKills = 0;
      window.__swanRound = { hp: PLAYER_HP, wave: 1, over: false, left: waveSize(1) };
    }
  },
}));

// Test seam, same reasoning as __swanPlayerPos: a browser test cannot reach into a module closure,
// and driving combat through exact screen pixels of a MOVING box is flaky for reasons unrelated to
// the feature under test. The raycast path is covered by its own ground-click test.
if (typeof window !== 'undefined') window.__swanGameStore = useGameStore;

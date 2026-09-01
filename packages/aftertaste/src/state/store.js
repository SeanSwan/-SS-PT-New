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
import { fireAt as fireAtPure } from '../combat/combat.js';
import { ENEMY_HP } from '../combat/combat.js';

const START = [
  { id: 'e1', x: -6, z: -8, hp: ENEMY_HP },
  { id: 'e2', x: 0, z: -10, hp: ENEMY_HP },
  { id: 'e3', x: 6, z: -8, hp: ENEMY_HP },
];

export const useGameStore = create((set, get) => ({
  enemies: START.map((e) => ({ ...e })),
  kills: 0,

  /** Fire at a world point. Returns how many died, so the caller can react (sound, later). */
  fire: (point) => {
    const { enemies, kills } = get();
    const result = fireAtPure(enemies, point);
    set({ enemies: result.enemies, kills: kills + result.killed });
    if (typeof window !== 'undefined') window.__swanKills = kills + result.killed;
    return result.killed;
  },

  reset: () => {
    set({ enemies: START.map((e) => ({ ...e })), kills: 0 });
    if (typeof window !== 'undefined') window.__swanKills = 0;
  },
}));

// Test seam, same reasoning as __swanPlayerPos: a browser test cannot reach into a module closure,
// and driving combat through exact screen pixels of a MOVING box is flaky for reasons unrelated to
// the feature under test. The raycast path is covered by its own ground-click test.
if (typeof window !== 'undefined') window.__swanGameStore = useGameStore;

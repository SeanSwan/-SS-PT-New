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

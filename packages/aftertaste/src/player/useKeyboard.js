/**
 * useKeyboard.js — turns key events into a plain object of booleans.
 *
 * TEACHING NOTE — THE MOST IMPORTANT HABIT IN THIS FILE:
 * This hook does NOT move anything. It only records what is currently held down. The game loop
 * reads that record each frame and decides what it means. Input -> state -> update -> draw.
 *
 * Why not move the player directly in the keydown handler? Because keydown fires at the operating
 * system's repeat rate (irregular, and different on every machine), not once per frame. Movement
 * driven from keydown is jittery and frame-rate dependent. Movement driven from a per-frame read of
 * "is W down" is smooth everywhere.
 *
 * We use a ref, not React state, on purpose: this changes many times a second and NOTHING should
 * re-render because a key moved. Re-rendering 60x/second is how a React game gets slow.
 */
import { useEffect, useRef } from 'react';

const MAP = {
  KeyW: 'forward', ArrowUp: 'forward',
  KeyS: 'back', ArrowDown: 'back',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
};

export function useKeyboard() {
  const keys = useRef({ forward: false, back: false, left: false, right: false });

  useEffect(() => {
    const set = (code, value) => {
      const name = MAP[code];
      if (name) keys.current[name] = value;
    };
    const down = (e) => set(e.code, true);
    const up = (e) => set(e.code, false);
    // If the window loses focus mid-press, the keyup never arrives and the player runs forever.
    const blur = () => { keys.current = { forward: false, back: false, left: false, right: false }; };

    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
    };
  }, []);

  return keys;
}

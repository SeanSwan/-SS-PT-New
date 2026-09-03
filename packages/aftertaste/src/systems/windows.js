/**
 * windows.js — the barricade and the climb (Beyond-Zombies S6b).
 *
 * THIS IS THE MECHANIC THE WHOLE DESIGN HANGS ON. A spawn ring teleports pressure in from
 * anywhere; a window makes pressure a PLACE — something you can watch, prioritise, repair, and
 * fail to hold. Everything downstream (the repair economy, the cleanse tug-of-war, the door-greed
 * loop) needs a window to exist first.
 *
 * A window is five panels and one climb slot. A monster tears one panel per beat from OUTSIDE,
 * and only when the last panel is gone — and only if the slot is free — does it climb. That is
 * what "one by one" means mechanically: the wall is not a queue rule bolted on, it is a real
 * bottleneck a player can lengthen by rebuilding panels.
 *
 * Pure and node-testable: no React, no three.js. The state machine here is the contract the
 * renderer and the director both read.
 */

export const PANELS = 5;

/** Seconds a mob spends taking one panel down, and climbing through once they are all gone. */
export const TEAR_BEAT = 1.1;
export const CLIMB_SECONDS = 1.4;

/** How many mobs may queue at one window before the director must send them elsewhere. */
export const QUEUE_CAP = 3;

/** A window's starting state. `panels` counts what still stands. */
export const freshWindow = (id) => ({
  id, panels: PANELS, climbing: null, climbStartedAt: 0, lastTearAt: -Infinity, repairedThisRound: 0,
});

/** Contested = a mob is physically in the opening. Repair is blocked; tearing does not block it. */
export const isContested = (w) => w.climbing != null;

/** Repair is allowed whenever the window is damaged and nobody is in the opening. */
export const canRepair = (w) => !isContested(w) && w.panels < PANELS;

/**
 * Rebuild one panel. Returns the delta plus whether this one PAID — the cap limits income, never
 * defence: a player who has used their paid repairs can still board up, they just stop earning
 * for it. A cap that blocked the action itself would make round 8 unsurvivable by arithmetic.
 */
export function repair(w, cap = PANELS) {
  if (!canRepair(w)) return {};
  const pays = w.repairedThisRound < cap;
  return {
    panels: Math.min(PANELS, w.panels + 1),
    repairedThisRound: w.repairedThisRound + (pays ? 1 : 0),
    paid: pays,
  };
}

/**
 * One frame of a window, given the mob currently working on it.
 *
 * Returns `{ window, event }` where event is one of:
 *   'tear'  — a panel came down
 *   'enter' — the mob is through; the caller moves it inside and the slot frees
 *   null    — nothing happened this frame
 *
 * The mob is IDENTIFIED, not embedded: a window holds an id, and the enemy list stays the one
 * place a monster's own state lives. Two copies of "which monster" is how a climb survives a death.
 */
export function stepWindow(w, mobId, now) {
  // A mob in the opening is committed; the only thing that can happen is finishing.
  if (w.climbing != null) {
    if (w.climbing !== mobId && mobId != null) return { window: w, event: null }; // someone else waits
    if (now - w.climbStartedAt >= CLIMB_SECONDS) {
      return { window: { ...w, climbing: null, climbStartedAt: 0 }, event: 'enter' };
    }
    return { window: w, event: null };
  }
  if (mobId == null) return { window: w, event: null };

  // Panels still standing: tear one, on the beat.
  if (w.panels > 0) {
    if (now - w.lastTearAt < TEAR_BEAT) return { window: w, event: null };
    return { window: { ...w, panels: w.panels - 1, lastTearAt: now }, event: 'tear' };
  }

  // The way is open and the slot is free: this mob takes it.
  return { window: { ...w, climbing: mobId, climbStartedAt: now }, event: null };
}

/**
 * A mob that dies mid-climb frees the slot immediately — and the panels it tore STAY torn.
 * Killing a climber buys back the opening; it does not rebuild the wall.
 */
export const releaseIfClimbing = (w, mobId) =>
  (w.climbing === mobId ? { ...w, climbing: null, climbStartedAt: 0 } : w);

/** Board-Up (a power-up, S10): restores UNCONTESTED windows only — carpentry, not a spell. */
export const boardUp = (w) => (isContested(w) ? w : { ...w, panels: PANELS });

/** A new round resets what repairs PAY, never the damage itself. */
export const startRound = (w) => ({ ...w, repairedThisRound: 0 });

/**
 * How long one mob takes to get through an intact window — the number a round's length is made of
 * (blueprint §7). Exposed so the director can compute expected round duration instead of hoping
 * for one.
 */
export const throughputSeconds = () => PANELS * TEAR_BEAT + CLIMB_SECONDS;

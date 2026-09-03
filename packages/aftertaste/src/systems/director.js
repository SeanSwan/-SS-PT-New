/**
 * director.js — who arrives, where, and when (Beyond-Zombies S6b).
 *
 * ONE MACHINE, NOT TWO COUNTERS. The blueprint's hardest-won rule (HY3, via the 08-25 panel) is
 * that a wave director which counts waves and nests separately can spawn a boss before the nests
 * are clear. So there is exactly one state here: a BUDGET of monsters still owed to this round,
 * and the queues at each window. Nothing else counts.
 *
 * The ring spawner this replaces put threats anywhere; the director puts them OUTSIDE, at a
 * window, and the window decides when they get in. That is the whole shape change: the horde
 * becomes a stream you can watch and lose.
 *
 * Pure. The store owns the objects; this owns the decisions.
 */
import { QUEUE_CAP, throughputSeconds } from './windows.js';
import { typeForSlot, ROSTER } from '../enemies/roster.js';

/**
 * What a round is WORTH, in budget rather than head-count: a Regular costs 1, a roach costs a
 * fraction. Composition can then shift by round without touching the size curve, and a wave of
 * forty roaches costs the same pressure as a handful of bruisers.
 */
export const COST = { 'crumb-roach': 0.4, 'grease-fly': 0.7, 'kissing-bug': 2, default: 1 };
export const costOf = (type) => COST[type] ?? COST.default;

/** A round's budget. Grows steadily and caps — the same shape waveSize had, in budget units. */
export const budgetFor = (wave) => Math.min(40, 2 + wave * 2);

/**
 * How long this round should take, in seconds, given how many windows are live.
 *
 * THIS IS THE DIAL (blueprint §7 / GLM #12). Round length is not a hope: it is budget divided by
 * how fast the windows can physically admit bodies. Writing it down is what makes "round 5 takes
 * about ninety seconds" a checkable claim instead of a surprise at playtest.
 */
export const expectedRoundSeconds = (wave, activeWindows) =>
  (budgetFor(wave) / Math.max(1, activeWindows)) * throughputSeconds();

/**
 * Assign the next arrival to a window: the least-crowded one, ties broken by declaration order so
 * a wave's shape is reproducible. Returns null when every window is at QUEUE_CAP — the director
 * then simply WAITS, which is what keeps the queue arrays bounded (GLM #17).
 */
export function pickWindow(windowIds, queues) {
  let best = null; let bestLen = Infinity;
  for (const id of windowIds) {
    const len = (queues[id] ?? []).length;
    if (len >= QUEUE_CAP) continue;
    if (len < bestLen) { best = id; bestLen = len; }
  }
  return best;
}

/**
 * One step of the round.
 *
 * `state` = { wave, budgetLeft, queues, lastReleaseAt }
 * Returns the same shape plus `spawn` — the arrival to create, or null.
 *
 * RELEASE CADENCE: the director does not empty its budget into the queues on frame one. It lets
 * one body out per `releaseInterval`, so pressure builds instead of arriving as a lump, and so a
 * round that is nearly over has fewer bodies alive than one that just began.
 */
export function stepDirector(state, windowIds, now, releaseInterval = 1.2) {
  if (state.budgetLeft <= 0) return { ...state, spawn: null };
  if (now - state.lastReleaseAt < releaseInterval) return { ...state, spawn: null };

  const windowId = pickWindow(windowIds, state.queues);
  if (!windowId) return { ...state, spawn: null }; // every window is full: wait, do not accumulate

  // A MONOTONIC RELEASE COUNTER, not an index derived from the budget. Deriving it from spend
  // produced only EVEN indices (every common face costs 1.0), so `typeForSlot` cycled through half
  // the unlock table and the crumb-roach and grease-fly could never spawn in wave 2 at all. A wave
  // composition that silently drops faces is exactly the class of bug that looks like art missing.
  const type = typeForSlot(state.wave, state.released ?? 0);
  const batch = ROSTER[type]?.batch ?? 1;
  const cost = costOf(type) * batch;

  return {
    ...state,
    budgetLeft: state.budgetLeft - cost,
    released: (state.released ?? 0) + 1,
    lastReleaseAt: now,
    queues: { ...state.queues, [windowId]: [...(state.queues[windowId] ?? []), type] },
    spawn: { type, windowId, batch },
  };
}

/**
 * Is the round finished? Budget spent AND nothing left holding it open.
 *
 * THE GRACE PATH (GLM #12): a single mob stuck behind a slow window must never hold the night
 * hostage. Once the budget is spent, a round that has run past its own expected length plus a
 * generous margin closes anyway — the stragglers are forgiven rather than waited on.
 */
export function roundOver(state, holdingCount, now, roundStartedAt, activeWindows) {
  if (state.budgetLeft > 0) return false;
  if (holdingCount === 0) return true;
  const grace = expectedRoundSeconds(state.wave, activeWindows) * 1.5 + 20;
  return now - roundStartedAt > grace;
}

export const freshRound = (wave, now) => ({
  wave,
  budgetLeft: budgetFor(wave),
  released: 0,
  queues: {},
  lastReleaseAt: now,
});

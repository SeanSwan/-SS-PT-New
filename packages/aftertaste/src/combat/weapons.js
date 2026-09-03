/**
 * weapons.js — every gun as DATA, exactly like the monster roster (playtest 3 doctrine, Sean):
 * "weapons in BF6 have different kick and all that... to figure out how strong they are, what
 * type of gun they are." A weapon is a ROW: damage, rate, a DETERMINISTIC recoil pattern, a
 * spread model with a CAP, and a zoom. Adding a gun is adding a row.
 *
 * TEACHING NOTE — RECOIL IS A PATTERN, SPREAD IS A CONE:
 * Two different things that beginners merge. RECOIL moves your AIM — deterministically, the same
 * climb-and-drift every time (Sean: "not just a random kick up"), so a player can LEARN a gun and
 * pull against it. SPREAD moves the BULLET inside a cone around your aim — random within the
 * cone, but the cone's size is knowable: it blooms per shot, is CAPPED, and shrinks when you
 * stop. Skill lives in controlling recoil and respecting spread.
 *
 * recoilPattern: per-consecutive-shot [pitchKick, yawKick] in radians, cycled from the start of
 * each burst; the index resets after RECOIL_RESET seconds without firing. Values are what the
 * player fights — positive pitch = muzzle climbs.
 *
 * Names are WORKING NAMES — Sean owns the creative gun identity (his call: real-feeling guns AND
 * "our own creative guns"). The stats are the contract; the fiction is the owner's.
 */

export const RECOIL_RESET = 0.35; // seconds without firing before the pattern restarts

export const WEAPONS = {
  // THE STARTER (S5). Sean named the 9mm first among the real classes; it takes the starter slot
  // because a starting gun's job is to teach aim, not to carry a run — accurate, honest, and weak
  // enough that the first wall-buy is a real relief. Semi-auto: every shot is a decision.
  'sidearm-9': {
    name: 'Sidearm 9 (working name)',
    damage: 1,
    fireInterval: 0.22,   // ~270 rpm ceiling; the trigger finger is the real limit
    fireMode: 'semi',
    mag: 12,
    reserve: 60,
    reloadSeconds: 1.2,
    // A small, fast-settling pop: two firm kicks, then almost nothing. A pistol you can hold on
    // target if you pace it — the exact opposite grammar to the rifle's climb.
    recoilPattern: [[0.008, 0.000], [0.007, 0.001], [0.004, -0.001], [0.003, 0.001]],
    recoilLoop: [2, 3],
    spread: { base: 0.002, perShot: 0.004, max: 0.018, recovery: 0.14, adsScale: 0.30 },
    zoomFov: 60,
    adsSensitivity: 0.7,
    tracer: '#ffe9a8',
  },
  'fry-rifle': {
    name: 'Fry Rifle (working name)',
    damage: 1,
    fireInterval: 0.15,
    fireMode: 'auto',      // 'auto' fires while held; 'semi' needs a fresh click per shot
    mag: 24,               // rounds in a full magazine
    reserve: 120,          // rounds carried beyond the magazine
    reloadSeconds: 1.6,
    // A learnable climb: strong first kicks easing off, drifting right — classic AR grammar.
    recoilPattern: [
      [0.010, 0.000], [0.009, 0.001], [0.008, 0.002], [0.006, 0.002],
      [0.005, 0.003], [0.004, 0.003], [0.004, -0.002], [0.004, -0.003],
    ],
    // The segment that repeats once the pattern runs out — the settled part of the climb, so a
    // held burst becomes rhythmic instead of sliding left forever (F7).
    recoilLoop: [4, 7],
    spread: { base: 0.004, perShot: 0.006, max: 0.035, recovery: 0.08, adsScale: 0.35 },
    zoomFov: 55,       // right-click ADS — the slot a real scope upgrades later
    adsSensitivity: 0.6,
    tracer: '#ffe9a8',
  },
};

// You start with the pistol. The rifle becomes a wall-buy when wall-buys exist (S7); until then
// the dev keys 1/2 put it in your hands for testing.
export const DEFAULT_WEAPON = 'sidearm-9';

/** How long after breaking into a sprint before the gun can fire (S5 / G2). Sprinting is a
 *  commitment: the shooters Sean named all make you pay a beat to come out of it, which is what
 *  turns "always sprint" into a decision. */
export const SPRINT_OUT_SECONDS = 0.2;

/** How long swapping weapons takes. Long enough to be a choice, short enough not to be a punish. */
export const SWAP_SECONDS = 0.45;

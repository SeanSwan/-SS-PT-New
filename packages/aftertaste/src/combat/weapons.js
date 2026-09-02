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
  'fry-rifle': {
    name: 'Fry Rifle (working name)',
    damage: 1,
    fireInterval: 0.15,
    // A learnable climb: strong first kicks easing off, drifting right — classic AR grammar.
    recoilPattern: [
      [0.010, 0.000], [0.009, 0.001], [0.008, 0.002], [0.006, 0.002],
      [0.005, 0.003], [0.004, 0.003], [0.004, -0.002], [0.004, -0.003],
    ],
    spread: { base: 0.004, perShot: 0.006, max: 0.035, recovery: 0.08, adsScale: 0.35 },
    zoomFov: 55,       // right-click ADS — the slot a real scope upgrades later
    adsSensitivity: 0.6,
    tracer: '#ffe9a8',
  },
};

export const DEFAULT_WEAPON = 'fry-rifle';

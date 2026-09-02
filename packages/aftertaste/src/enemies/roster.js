/**
 * roster.js — every monster as DATA. Pure and importable by node tests on purpose: the model
 * FILES live in models.js (Vite-only `?url` imports would crash node), the model FACTS live here.
 *
 * TEACHING NOTE — A MONSTER IS A ROW, NOT A CLASS:
 * The temptation is FrylingClass / DripCystClass, each with its own movement and damage code. But
 * the four monsters DIFFER only in numbers — hp, speed, size, colour — while every RULE (steer,
 * lifecycle, hitscan) is shared. So a monster is a row in a table, and adding the fifth enemy is
 * writing one row + one URL, not one file. When a monster someday needs a genuinely new BEHAVIOUR
 * (flying? burrowing?), that is the moment for code — not before.
 *
 * TEACHING NOTE — MEASURED, NOT GUESSED:
 * `model` bounds come from each GLB's POSITION accessor (min/max), read from the file. The fryling
 * lesson: origins are wherever the author left them; a model whose feet you did not measure stands
 * beside where the game thinks it is, and every collision looks unfair for invisible reasons.
 *
 * The stat spread is the ROLE system: fryling = the baseline; drip-cyst = slow bruiser;
 * grease-fly = fast and fragile (dies to ONE shot, but closes distance); patty-larva = armoured
 * crawler, long and low, soaks four hits. Every speed stays below the player's 5 — the moment an
 * enemy outruns you there is no game left, only a countdown.
 *
 * aimRadius is a SINGLE sphere standing in for a body, and for a long body that is an admitted
 * approximation: it must at least cover most of the longest half-extent, or shots visibly through
 * the rendered tail miss with no feedback — "unfair for invisible reasons" (GLM-Flash finding 4;
 * the schema test enforces the floor). The honest shape for the larva is a capsule/per-part
 * spheres — that arrives WITH the roster-v2 dismemberment contract, which needs parts anyway.
 */

export const ROSTER = {
  fryling: {
    hp: 2, speed: 2.2, aimRadius: 0.6, renderHeight: 1.0,
    model: { minX: 0, maxX: 2, minZ: 0, maxZ: 2, height: 3 },
    tint: ['#C4462F', '#7A2418'], ember: '#571510',
  },
  'drip-cyst': {
    hp: 3, speed: 1.8, aimRadius: 0.6, renderHeight: 1.5,
    model: { minX: -1, maxX: 2, minZ: 0, maxZ: 2, height: 4 },
    tint: ['#C9A227', '#71581A'], ember: '#4a3a10',
  },
  'grease-fly': {
    hp: 1, speed: 3.4, aimRadius: 0.55, renderHeight: 0.8,
    model: { minX: -1, maxX: 2, minZ: 0, maxZ: 1, height: 3 },
    tint: ['#9DB04C', '#4F5C28'], ember: '#39470f',
  },
  'patty-larva': {
    hp: 4, speed: 1.4, aimRadius: 1.05, renderHeight: 0.55,
    model: { minX: -2, maxX: 3, minZ: 0, maxZ: 2, height: 2 },
    tint: ['#B06A4C', '#5E2F26'], ember: '#571f15',
  },
  // Beyond-Zombies S2 — the real cast begins (Sean, playtest 4: "the zombies as people").
  // The Regular: a zombified diner, tallest thing in the wave, the shambling body of the horde.
  // C7 law: a VICTIM being saved, never a caricature — greys and bruise tones, no body-mockery.
  regular: {
    hp: 3, speed: 1.6, aimRadius: 0.55, renderHeight: 1.7,
    model: { minX: -2, maxX: 2, minZ: -1, maxZ: 3, height: 9 },
    tint: ['#8A8D96', '#4A4E5A'], ember: '#2e3140',
    gait: { type: 'shamble', sway: 0.09, hz: 1.4 },
  },
  // Crumb-roach: flood pressure — cheap, fast, dies to one hit; terror is the COUNT, not the unit.
  'crumb-roach': {
    hp: 1, speed: 3.0, aimRadius: 0.85, renderHeight: 0.45,
    model: { minX: -1, maxX: 3, minZ: 0, maxZ: 2, height: 2 },
    tint: ['#6B4A2B', '#3E2B18'], ember: '#2b1d10',
    gait: { type: 'skitter', burstHz: 2.2, jitter: 0.22 },
  },
};

/**
 * Waves introduce the cast fast enough for a FIRST session to meet it (Fable review R2: the old
 * one-face-per-wave gate meant a player dying on wave 2 saw one monster — Sean did). Wave 1 pairs
 * the baseline with the fast-fragile flier; the full cast arrives by wave 3.
 */
const UNLOCK_BY_WAVE = [
  // S2: the Regular leads every wave — the horde's face is a PERSON now, per Sean's playtest-4 ask.
  ['regular', 'fryling', 'grease-fly'],                                            // wave 1
  ['regular', 'crumb-roach', 'fryling', 'grease-fly'],                             // wave 2
  ['regular', 'crumb-roach', 'fryling', 'grease-fly', 'drip-cyst', 'patty-larva'], // wave 3+
];

export function unlockedTypes(wave) {
  return UNLOCK_BY_WAVE[Math.max(0, Math.min(wave - 1, UNLOCK_BY_WAVE.length - 1))];
}

/**
 * Which monster fills slot `i` of a wave. Deterministic (a cycle, not a dice roll) so a wave's
 * composition is testable and a player can learn what wave 3 sends.
 */
export function typeForSlot(wave, i) {
  const types = unlockedTypes(wave);
  return types[i % types.length];
}

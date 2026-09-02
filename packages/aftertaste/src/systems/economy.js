/**
 * economy.js — points, as one table (Beyond-Zombies S4).
 *
 * TEACHING NOTE — THE ONE RULE THAT MAKES THIS GAME'S ECONOMY ITS OWN:
 * There are NO points for a body hit. In the genre this borrows from, every bullet that connects
 * pays, which makes "shoot the nearest thing forever" the optimal strategy and made our own window
 * metering a farm (GLM 5.3, finding 11). Here income comes from RESULTS — parts you sever and
 * things you kill. That single subtraction does three jobs at once: it removes the farm, it breaks
 * the most-imitated structural resemblance to the genre king, and it makes dismemberment the
 * actual wallet instead of a bonus number.
 *
 * TEACHING NOTE — WHY A TABLE AND NOT `points += 25` AT EACH SITE:
 * Multipliers (a future Feeding Frenzy), caps, and tests all need ONE place to ask "what is this
 * worth". Scattered arithmetic is how an economy quietly develops two prices for the same event.
 */

/** What each event pays, before multipliers. A kill pays more than a sever; a headshot kill is
 *  the sever and the kill together, which is why it is the best outcome in the game. */
export const AWARD = {
  sever: 8,
  kill: 20,
  roundClear: 35, // × the round number
};
// TUNED BY THE GATE, not by feel: the first numbers here (25/60/100) paid a round-5 player 4475
// points against a door+gun cost of 2000 — every choice the economy exists to force was already
// bought. The affordability test found that before a single point reached the HUD.

/**
 * Points for one shot's outcome. `severed` is how many parts came off on THIS shot (0 or 1 today;
 * a shotgun pellet spread will make it more).
 */
export function awardForShot({ severed = 0, killed = false } = {}) {
  return severed * AWARD.sever + (killed ? AWARD.kill : 0);
}

/** Points for surviving a round. Scales with the round so pushing deeper is worth the risk. */
export const awardForRound = (wave) => AWARD.roundClear * wave;

/**
 * The affordability gate, as arithmetic instead of a vibe (GLM 5.3, finding 13). Given the cast a
 * round sends and what each face is worth, what does a clean round pay? The blueprint's design
 * gate — "a round-5 player affords the first door OR the first gun, not both" — is checked against
 * THIS, so the numbers can be tuned without the claim silently rotting.
 */
export function expectedRoundIncome(types, roster, wave) {
  const perEnemy = types.reduce((sum, t) => {
    const parts = roster[t]?.parts ?? [];
    // The honest expectation: a player severs the head on roughly the killing blow, so a typical
    // enemy pays one sever plus one kill. Not every player plays that way — this is the middle.
    const severable = parts.length ? 1 : 0;
    return sum + AWARD.kill + severable * AWARD.sever;
  }, 0);
  return perEnemy + awardForRound(wave);
}

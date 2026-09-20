/**
 * astra-reseller-gate.mjs — the DOUBLE gate on Astra-via-OpenRouter.
 * ==================================================================
 * WHY THIS EXISTS (Sean, 2026-09-19):
 *
 *   "if we're ever calling Astra, it's no longer going to be via OpenRouter.
 *    We are not paying no money to call Astra now because we have subscription."
 *
 * …followed by the correction that makes this a *gate* rather than a *block*:
 *
 *   "we do not need to block it but it needs to be double gated so we have to
 *    stop and confirm once then stop confirm again"
 *
 * WHY NOT A HARD BLOCK. The ChatGPT subscription serves `gpt-6-astra` but NOT
 * `gpt-6-astra-pro` — measured 2026-09-19, the account returns
 *   HTTP 400 "The 'gpt-6-astra-pro' model is not supported when using Codex
 *   with a ChatGPT account."
 * A hard block would therefore delete the pro tier outright rather than route
 * it. The seat stays reachable; it just cannot be reached by accident.
 *
 * WHY TWO KEYS AND NOT ONE. This repo's corpus records prose rules being
 * violated four times in a single session after being written up, so the
 * control sits at the egress chokepoint rather than in a doc. But a single
 * acknowledgement flag becomes muscle memory — it is typed once and then
 * carried in a shell for a week. Two *independent* tokens cannot be satisfied
 * by habit: the first says "I know this is a reseller call", the second says
 * "and I accept the bill". The runner surfaces them as two sequential stops,
 * so the operator literally stops and confirms, then stops and confirms again.
 *
 * SCOPE. Only OpenRouter. A direct Z.ai/Google/Anthropic call is untouched, and
 * the subscription transport does not come through here at all — it is a child
 * process, not an HTTP body.
 */

/** Model ids whose seat is already covered by the ChatGPT subscription. */
const ASTRA_SUBSCRIPTION_MODELS = ['openai/gpt-6-astra', 'openai/gpt-6-astra-pro'];

/** Gate 1 — "I know Astra is subscription-covered and this call re-buys it." */
export const ASTRA_GATE1_ENV = 'SWAN_ASTRA_RESELLER_ACK';
/** Gate 2 — "and I accept that this specific call bills OpenRouter." */
export const ASTRA_GATE2_ENV = 'SWAN_ASTRA_RESELLER_CONFIRM';

/** Astra Pro pricing per token, read from the live catalog 2026-09-19. */
export const ASTRA_PRICE_IN_PER_M = 10;
export const ASTRA_PRICE_OUT_PER_M = 50;

const isArmed = (env, key) => String(env?.[key] ?? '').trim() === '1';

/** True when `model` is an Astra seat that a subscription already covers. */
export function isAstraSubscriptionModel(model) {
  const value = String(model ?? '').toLowerCase();
  return ASTRA_SUBSCRIPTION_MODELS.some((id) => value.startsWith(id));
}

/**
 * Which of the two gates are satisfied for this request.
 * Never throws — a malformed body, a model-less body or a non-OpenRouter host
 * all report `applies: false`, matching `assertNotResoldSubscriptionSeat`.
 *
 * @returns {{applies: boolean, model: string, gate1: boolean, gate2: boolean}}
 */
export function astraResellerGateState(url, body, env = process.env) {
  const none = { applies: false, model: '', gate1: false, gate2: false };

  let host = '';
  try { host = new URL(url).host.toLowerCase(); } catch { return none; }
  if (!host.includes('openrouter')) return none;

  let model = '';
  try { model = String(JSON.parse(body)?.model ?? ''); } catch { return none; }
  if (!isAstraSubscriptionModel(model)) return none;

  return {
    applies: true,
    model,
    gate1: isArmed(env, ASTRA_GATE1_ENV),
    gate2: isArmed(env, ASTRA_GATE2_ENV),
  };
}

/**
 * Enforce the double gate. Throws at whichever stage is unmet so the operator
 * is stopped twice, not once — the message names the exact variable to set.
 */
export function assertAstraResellerDoubleArmed(url, body, env = process.env) {
  const state = astraResellerGateState(url, body, env);
  if (!state.applies) return;
  if (state.gate1 && state.gate2) return;

  if (!state.gate1) {
    throw new Error(
      `[astra-gate] STOP 1 of 2: "${state.model}" via OpenRouter re-buys a seat the ChatGPT ` +
      `subscription already covers. The free route is the subscription transport ` +
      `(node scripts/consult-astra-subscription.mjs). To pay OpenRouter anyway, set ` +
      `${ASTRA_GATE1_ENV}=1 and re-run — you will be stopped once more.`,
    );
  }

  throw new Error(
    `[astra-gate] STOP 2 of 2: gate 1 is confirmed for "${state.model}", but this call bills ` +
    `OpenRouter at $${ASTRA_PRICE_IN_PER_M}/M in and $${ASTRA_PRICE_OUT_PER_M}/M out. This is the ` +
    `second, separate confirmation. Set ${ASTRA_GATE2_ENV}=1 as well to send.`,
  );
}

export default {
  isAstraSubscriptionModel, astraResellerGateState, assertAstraResellerDoubleArmed,
  ASTRA_GATE1_ENV, ASTRA_GATE2_ENV, ASTRA_SUBSCRIPTION_MODELS,
};

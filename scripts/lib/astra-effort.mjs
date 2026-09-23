/**
 * astra-effort.mjs — make the reasoning effort of a subscription consult an ARGV FACT.
 *
 * THE DISCOVERY (measured 2026-09-19, codex-cli 0.154.0)
 * ======================================================
 * The codex-cli transport built its argv with `--model` and nothing else about depth:
 *
 *   exec --json --ephemeral --sandbox read-only -C <root> --model <model> -
 *
 * `model_reasoning_effort` therefore came from whatever `$CODEX_HOME/config.toml` was
 * ambient. Three consequences, and each one alone is enough to invalidate a review:
 *
 *   1. The ambient home on this machine sets `model_reasoning_effort = "low"`. Every
 *      consult dispatched without an explicit override ran at `low` — including one
 *      believed to be `high`.
 *   2. The transport also passes `--ephemeral`, which suppresses the rollout log. So
 *      there was no session file to inspect after the fact either.
 *   3. Nothing in the receipt recorded effort, because nothing in the invocation
 *      carried it. A run could not be asked what depth it executed at.
 *
 * The repair is not a rule asking callers to set an env var — that is the same silent
 * failure with an extra step. Effort is now an explicit `-c` override on the argv, so
 * it is visible in the invocation and can be written into the receipt.
 *
 * `-c` IS THE RIGHT LEVER — proven, not assumed. Measured by passing a deliberately
 * invalid level and reading the response:
 *
 *   codex exec ... -c 'model_reasoning_effort="bogus_level_xyz"' -
 *   → HTTP 400 [ReasoningEffortParam] [reasoning.effort] [invalid_enum_value]
 *
 * The server echoing the exact value back proves the flag is parsed AND forwarded as
 * `reasoning.effort`. A `-c` override also outranks `config.toml`, so an ambient home
 * cannot quietly win.
 *
 * ⚠️ THERE ARE TWO ENUMS, AND THE FIRST ONE YOU GET IS A TRAP.
 * Two different 400s are reachable, and they list different sets:
 *
 *   A. GLOBALLY INVALID value  (`bogus_level_xyz`) → code `invalid_enum_value`
 *      "Supported values are: 'none', 'minimal', 'low', 'medium', 'high', 'xhigh', and 'max'."
 *
 *   B. VALID BUT MODEL-UNSUPPORTED value (`minimal`) → code `unsupported_value`
 *      "Unsupported value: 'minimal' is not supported with the 'gpt-6-astra' model.
 *       Supported values are: 'low', 'medium', 'high', 'xhigh', and 'max'."
 *
 * Error A reports the GLOBAL reasoning enum. Error B reports the MODEL enum. They are
 * not the same, and error A is the one you get first, from the obvious probe. A
 * validator built from A alone accepts `none` and `minimal`, and then fails on a live
 * dispatch — which is exactly what happened here, to this module, one dispatch after it
 * was written. Only B is authoritative for `gpt-6-astra`.
 *
 * AND THE LOCAL CACHE IS WRONG TOO. `~/.codex/models_cache.json` advertises
 * `low, medium, high, xhigh, max, ultra` for `gpt-6-astra`. `ultra` is rejected by the
 * server. Neither the cache nor the global enum is the model enum; both are traps in
 * opposite directions.
 *
 * WHAT THIS MODULE DELIBERATELY DOES NOT CLAIM
 * `reasoning_output_tokens` is the field that could reveal the executed depth, and it
 * is captured by the transport. But it is NOT a general proxy: measured on the trivial
 * prompt "say OK", it is **0 at every level** (`low` → 0, `xhigh` → 0), because no
 * reasoning was required. It discriminates only on prompts that demand reasoning, and
 * only within one prompt. The earlier note claiming a `high -> 516 / max -> 1912`
 * curve was measured on a reasoning-demanding prompt and must not be read as a
 * universal scale. Never infer a run's effort from a bare token count without the
 * prompt it came from.
 */

/**
 * The levels `gpt-6-astra` accepts, in the order error B reports them.
 *
 * This is the MODEL enum. Do not re-derive it from `models_cache.json` (`ultra` is a
 * lie) and do not re-derive it from the global enum (`none`/`minimal` are a trap).
 */
export const ASTRA_EFFORT_LEVELS = Object.freeze([
  'low', 'medium', 'high', 'xhigh', 'max',
]);

/**
 * The level used when the caller does not choose one.
 *
 * Named rather than ambient ON PURPOSE. The defect was never that `low` is a bad
 * level — it is that `low` arrived by accident and left no trace. A recorded default
 * is falsifiable; an inherited one is not.
 */
export const DEFAULT_ASTRA_EFFORT = 'high';

/**
 * Both 400s, verbatim, because reading only the first one is the trap this module
 * exists to close. Kept in full so the next reader can re-run the measurement.
 */
export const SERVER_ENUM_EVIDENCE =
  'A) globally invalid value → code invalid_enum_value: "Supported values are: '
  + "'none', 'minimal', 'low', 'medium', 'high', 'xhigh', and 'max'.\" — the GLOBAL enum. "
  + 'B) valid-but-model-unsupported value → code unsupported_value: "Unsupported value: '
  + "'minimal' is not supported with the 'gpt-6-astra' model. Supported values are: "
  + "'low', 'medium', 'high', 'xhigh', and 'max'.\" — the MODEL enum, and the only "
  + 'authoritative one. (measured 2026-09-19, codex-cli 0.154.0, gpt-6-astra)';

/**
 * Normalise an operator-supplied level, or refuse it.
 *
 * Refusing HERE rather than letting the API do it is the same call this repo already
 * makes for the pro tier: a wrong level is the operator's to fix, and spending a
 * dispatch to be told so is a round-trip that buys nothing. This module learned that
 * the expensive way — see the two-enums note in the header.
 *
 * @param {string|null|undefined} value raw level; falsy means "use the default"
 * @returns {string} a member of {@link ASTRA_EFFORT_LEVELS}
 */
export function resolveEffort(value) {
  const raw = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (!raw) return DEFAULT_ASTRA_EFFORT;
  if (!ASTRA_EFFORT_LEVELS.includes(raw)) {
    throw new Error(
      `unsupported reasoning effort for gpt-6-astra: "${value}" — `
      + `supported values are ${ASTRA_EFFORT_LEVELS.join(', ')}. `
      + '(models_cache.json lists "ultra", which the server rejects; the global enum '
      + 'lists "none"/"minimal", which this model does not support.)',
    );
  }
  return raw;
}

/**
 * The argv fragment for an effort override, or `[]` when no level is requested.
 *
 * The value is quoted because `-c` values are TOML-parsed: an unquoted `high` is not
 * a string, and the failure mode is a parse error rather than a silent default.
 *
 * @param {string|null|undefined} effort
 * @returns {string[]} `['-c', 'model_reasoning_effort="<level>"']` or `[]`
 */
export function buildEffortArgs(effort) {
  const raw = typeof effort === 'string' ? effort.trim() : '';
  if (!raw) return [];
  return ['-c', `model_reasoning_effort="${resolveEffort(raw)}"`];
}

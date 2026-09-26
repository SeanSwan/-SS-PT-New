/**
 * overrides.mjs — WHICH brief fields a caller may override, and which are REFUSED.
 *
 * WHY THIS IS A CORE MODULE AND NOT AN `if` IN THE ROUTE. Two consumers need the
 * same answer: the API boundary, which must REFUSE a blocked key, and the Tune
 * pane, which must SHOW the operator why the key is not on offer. Two copies of
 * one rule is how a pane invites a control the API then rejects — the operator
 * is handed a refusal they were asked to make. One definition, both consumers.
 *
 * WHAT WAS WRONG. `resolveSlots` applies `brief.slotOverrides` LAST, after the
 * kill-list is set, so an override can delete a LAW. The compile route passed the
 * request body's `slotOverrides` straight through, unvalidated — any key, any
 * value, any type. The law filter now catches a deleted kill-list (LAW 3's second
 * condition), but a guard that fires only AFTER the deletion is a net, not a
 * fence. This is the fence: the deletion is never performed.
 *
 * `negative` IS BLOCKED, AND THAT IS THE WHOLE POINT. It is not a dial. It
 * carries LAW 3's kill-list, and a taste law is not an operator preference — the
 * console's split is three legal dials plus one proposal channel, and the laws sit
 * above both. Offering `negative` as editable would make the kill-list a knob
 * with the label `DIAL` on it, which `AC4.6` exists to prevent.
 */

/**
 * Blocked override keys, each with the reason the operator is shown.
 *
 * The reason is operator-facing copy, not a log line: it is rendered on the pane
 * next to the control that is deliberately absent.
 */
export const BLOCKED_OVERRIDE_KEYS = Object.freeze({
  negative: 'the negative slot carries LAW 3\'s kill-list. A law is not a dial — '
    + 'overriding it deletes the ban instead of tuning it, so the slot is not offered '
    + 'and the API refuses it. Tune the dials instead.',
});

/**
 * Validate a requested override layer against the slot keys.
 *
 * @param {unknown} raw       the requested `slotOverrides`
 * @param {readonly string[]} slotKeys  the compiler's own slot keys, in its order
 * @returns {{ok: true, overrides: object} | {ok: false, code: string, message: string}}
 *
 * Order of findings is fixed (blocked, then unknown, then type) so the code a
 * caller sees is deterministic when a request is wrong in several ways at once —
 * and the message names EVERY offender, so one round-trip fixes the request
 * rather than three.
 */
export function validateOverrides(raw, slotKeys) {
  if (raw === undefined || raw === null) return { ok: true, overrides: {} };
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      ok: false,
      code: 'E_OVERRIDE_SHAPE',
      message: `slotOverrides must be an object of slot key -> string, got ${Array.isArray(raw) ? 'an array' : typeof raw}.`,
    };
  }

  const allowed = new Set(slotKeys);
  const blocked = [];
  const unknown = [];
  const badType = [];
  for (const [key, value] of Object.entries(raw)) {
    if (Object.hasOwn(BLOCKED_OVERRIDE_KEYS, key)) { blocked.push(key); continue; }
    if (!allowed.has(key)) { unknown.push(key); continue; }
    if (typeof value !== 'string') badType.push(`${key} (${value === null ? 'null' : typeof value})`);
  }

  if (blocked.length) {
    return {
      ok: false,
      code: 'E_OVERRIDE_KEY_BLOCKED',
      message: blocked.map((k) => `"${k}": ${BLOCKED_OVERRIDE_KEYS[k]}`).join(' '),
    };
  }
  if (unknown.length) {
    return {
      ok: false,
      code: 'E_OVERRIDE_KEY_UNKNOWN',
      message: `unknown slot ${unknown.length === 1 ? 'key' : 'keys'} ${unknown.map((k) => JSON.stringify(k)).join(', ')}. `
        + `Known slots: ${slotKeys.join(', ')}.`,
    };
  }
  if (badType.length) {
    return {
      ok: false,
      code: 'E_OVERRIDE_VALUE_TYPE',
      message: `every override value must be a string — got ${badType.join(', ')}.`,
    };
  }
  return { ok: true, overrides: { ...raw } };
}

/**
 * The slot keys a caller MAY override — every slot except the blocked ones.
 *
 * Derived from `BLOCKED_OVERRIDE_KEYS` rather than listed, so the editor cannot
 * offer a key the API refuses: adding a block is the single edit that removes it
 * from the editor too. The reverse — a hand-kept list of editable slots — is how
 * a pane invites a refusal.
 */
export function overridableKeys(slotKeys) {
  return slotKeys.filter((k) => !Object.hasOwn(BLOCKED_OVERRIDE_KEYS, k));
}

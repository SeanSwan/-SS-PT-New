/**
 * transcript-settle.mjs — read a Stop-hook transcript that may not be flushed yet (SWA-194).
 *
 * THE BUG, REPRODUCED
 * -------------------
 * dual-tier-gate and dry-loop-gate blocked closeout messages that visibly contained
 * everything they require. Replaying this session's transcript proves the gates' logic was
 * never wrong — the only variable is whether the closing message had reached the .jsonl
 * when the hook read it:
 *
 *     closeout @2236   after flush: buildShaped=true plain=true  -> allow
 *                     before flush: buildShaped=true plain=false -> BLOCK
 *     ... identical at @2286, @2674, @2910.       4 of 4 turns tested.
 *
 * Both gates do a single unconditional `readFileSync(transcript_path)` with no retry. If the
 * Stop hook runs before the final assistant message lands, the gate sees a turn full of tool
 * activity (buildShaped) and no closing text — and blocks it for being ABSENT when it was
 * merely not yet written.
 *
 * WHY IT MATTERS MORE THAN A FLAKY GATE
 * -------------------------------------
 * The agent is told its compliant closeout is non-compliant, so it rewrites and retries,
 * burning a turn. Do that a few times and the lesson learned is "this gate cries wolf" —
 * after which the N/A escape hatch gets reached for reflexively and the gate stops
 * governing anything. That is Rule 34's logic pointed at a gate instead of a rule.
 * `dual-tier-gate.mjs:72` already records one earlier bug of this same class.
 *
 * THE NARROW FIX
 * --------------
 * Exactly ONE state is ambiguous: a build-shaped turn carrying no closing assistant text at
 * all. Everything else is decided on the first read with no delay:
 *
 *     not build-shaped                    -> no settle; the gate allows anyway
 *     closing text present, sections bad  -> no settle; block immediately and correctly
 *     closing text present and good       -> no settle; allow
 *
 * So the cost is paid only in the case that is genuinely indistinguishable, never on a turn
 * the gate can already judge. Bounded at 2 retries x 250ms.
 *
 * A settle that RESCUES a read is the proof this was right, so it is announced on stderr
 * rather than silently swallowed. Silence would make the fix unfalsifiable.
 */

/**
 * Block synchronously without a dependency. `Atomics.wait` on a SharedArrayBuffer nobody
 * else holds is the standard sync sleep; a Stop hook cannot await a timer.
 */
function sleepSync(ms) {
  try {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
  } catch {
    // SharedArrayBuffer unavailable in a locked-down runtime — degrade to no delay rather
    // than throwing. The gate then behaves exactly as it did before this fix.
  }
}

export const SETTLE_ATTEMPTS = 2;
export const SETTLE_MS = 250;

/**
 * Has the turn's closing message reached the transcript yet?
 *
 * The obvious test — "does the turn contain any assistant text" — DOES NOT WORK, and this
 * comment exists because the first version of this fix used it and silently never fired.
 * Every substantial turn carries mid-turn narration, so that signal is true long before the
 * closeout is written. Measured at four reproduced race points: `hasClosingText` was already
 * true pre-flush in all four.
 *
 * What actually separates the two states is the LAST entry in the file:
 *
 *     pre-flush   @2236 bridge-session   @2286 attachment
 *                 @2674 attachment       @2910 bridge-session
 *     post-flush  assistant:TEXT at all four
 *
 * So: the closing message has landed iff the final transcript entry is an assistant entry
 * carrying non-empty text. Anything else — a tool result, an attachment, a bridge record —
 * means the model has not finished speaking.
 *
 * @param {string} raw  full transcript text
 */
export function closingMessageLanded(raw) {
  const lines = String(raw).split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return false;
  let entry;
  try { entry = JSON.parse(lines[lines.length - 1]); } catch { return false; }
  if (entry?.type !== 'assistant') return false;
  const content = entry.message?.content;
  if (typeof content === 'string') return content.trim().length > 0;
  if (!Array.isArray(content)) return false;
  return content.some((c) => c?.type === 'text' && String(c.text ?? '').trim().length > 0);
}

/**
 * Read the transcript, re-reading briefly ONLY while `ambiguous(raw)` holds.
 *
 * @param {string} path                     transcript_path from the hook payload
 * @param {(raw: string) => boolean} ambiguous  true = build-shaped with no closing text yet
 * @param {(p: string) => string|null} slurp    injectable reader (tests pass a fake)
 * @param {{attempts?: number, ms?: number, sleep?: (n: number) => void}} [opts]
 * @returns {{raw: string|null, attempts: number, rescued: boolean}}
 */
export function readSettled(path, ambiguous, slurp, opts = {}) {
  const maxAttempts = opts.attempts ?? SETTLE_ATTEMPTS;
  const waitMs = opts.ms ?? SETTLE_MS;
  const nap = opts.sleep ?? sleepSync;

  let raw = slurp(path);
  if (raw === null || raw === undefined) return { raw: null, attempts: 0, rescued: false };

  let attempts = 0;
  while (attempts < maxAttempts && ambiguous(raw)) {
    nap(waitMs);
    attempts += 1;
    const again = slurp(path);
    if (again === null || again === undefined) break;
    raw = again;
  }

  return { raw, attempts, rescued: attempts > 0 && !ambiguous(raw) };
}

/**
 * One stderr line when a settle actually changed the outcome. Silent otherwise — a gate that
 * narrates every quiet turn is a gate people stop reading.
 */
export function settleNote(result, gateName) {
  if (!result?.rescued) return null;
  return `[${gateName}] the closing message was not in the transcript on read 1; it appeared after `
    + `${result.attempts} re-read(s). Nothing was blocked. (SWA-194 — this is the race, caught.)`;
}

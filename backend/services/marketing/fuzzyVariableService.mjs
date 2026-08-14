/**
 * SERVICE: Fuzzy Variables (marketing personalization)
 * ====================================================
 * A rigid merge tag renders `Hi {{firstName}}` and reads like a mail-merge.
 * A FUZZY variable renders a short, contextual clause written from what the
 * prospect actually said — inside copy a human wrote:
 *
 *   "Hey Dana, just saw your form. I hear {{paraphrasedNeed}}. We'll call you
 *    in the next 5 minutes to sort it out."
 *                  ^ "the upstairs isn't cooling down"
 *
 * The value is in the RATIO. A human writes the whole email; the model writes
 * ~8 words. The lower the generated proportion, the less it reads as machine
 * output — and the smaller the blast radius when the generator is wrong.
 *
 * ── WHY THIS IS NOT JUST "CALL AN LLM" ──────────────────────────────────────
 * This text goes to a real prospect, unreviewed, seconds after they raise their
 * hand. So the generator is the LEAST trusted component here and is treated as
 * such: it is injectable, its output is validated as hostile input, and EVERY
 * failure path returns null so the caller falls back to the human-written
 * static copy. A missing clause reads as a normal short email. A wrong or
 * leaking clause is a brand incident.
 *
 * ── PRIVACY (rule 8 / rule 59) ──────────────────────────────────────────────
 * The generator NEVER receives identity. Not the name, not the email, not the
 * phone, not the lead id. It receives the note text only, already run through
 * `sanitizeClientText` (shape + prompt-injection defense, reused per rule 18
 * rather than reinvented). Identity is re-attached by the TEMPLATE, locally,
 * after generation.
 *
 * ── DEFAULT GENERATOR IS DETERMINISTIC, ON PURPOSE ──────────────────────────
 * `deterministicGenerator` uses no model at all. It is the safe default so this
 * harness can ship and be proven without simultaneously shipping an
 * unreviewed LLM call into live prospect email. An LLM generator plugs into the
 * same seam and must pass the same validator — it is gated separately by
 * `MARKETING_FUZZY_LLM_ENABLED` and is NOT wired here.
 */
import { sanitizeClientText } from '../ai/clientTextSanitizer.mjs';
import logger from '../../utils/logger.mjs';

/** Hard ceiling on generated clause length. Short is the entire point. */
export const MAX_WORDS = 10;

/** Feature flag — exact-match 'true', mirroring every other marketing flag. */
const flagEnabled = (env) => env?.MARKETING_FUZZY_VARS_ENABLED === 'true';

/**
 * Shapes that must never appear in generated copy. If the generator emits any
 * of these it has either leaked source data or hallucinated a contact detail,
 * and the clause is discarded rather than repaired — a validator that "fixes"
 * output is a validator that can be talked into passing something.
 */
const FORBIDDEN_SHAPES = [
  /[\w.+-]+@[\w-]+\.[\w.]+/,          // email address
  /\+?\d[\d\s().-]{7,}\d/,            // phone-ish digit run
  /https?:\/\//i,                     // URL
  /\bwww\./i,                         // bare domain
  /\$\s?\d/,                          // price / money claim
  /\d{1,3}\s?%/,                      // percentage claim
  /<[^>]*>/,                          // markup
  /[{}]/,                             // unresolved template braces
];

/**
 * Phrases that indicate the generator answered the PROMPT instead of doing the
 * job — the classic failure where a model narrates its task back at you.
 */
const META_PHRASES = [
  /\b(as an ai|language model|i cannot|i can't help|sorry,)\b/i,
  /\b(paraphrase|summary|summarize|the (customer|lead|user) (said|wrote))\b/i,
  /\bhere('s| is)\b/i,
];

const wordCount = (s) => s.trim().split(/\s+/).filter(Boolean).length;

/**
 * Validate a generated clause as hostile input.
 * @returns {{ok:true, value:string} | {ok:false, reason:string}}
 */
export function validateClause(raw, { maxWords = MAX_WORDS } = {}) {
  if (typeof raw !== 'string') return { ok: false, reason: 'not_a_string' };

  // Collapse whitespace/newlines: the clause is interpolated mid-sentence, so a
  // newline would visibly break the human-written sentence around it.
  const value = raw.replace(/\s+/g, ' ').trim();

  if (!value) return { ok: false, reason: 'empty' };
  if (wordCount(value) > maxWords) return { ok: false, reason: 'too_long' };

  for (const shape of FORBIDDEN_SHAPES) {
    if (shape.test(value)) return { ok: false, reason: 'forbidden_shape' };
  }
  for (const meta of META_PHRASES) {
    if (meta.test(value)) return { ok: false, reason: 'meta_output' };
  }
  // Must read as a clause, not a sentence or a list.
  if (/[.!?]$/.test(value)) return { ok: false, reason: 'terminal_punctuation' };
  // Comma COUNT, not length. A short list ("heating, cooling, ducts, vents")
  // is only 4 words and would have slipped a word-count guard, yet reads badly
  // interpolated mid-sentence. One comma is a legitimate subordinate clause
  // ("the upstairs, which stays hot"); two or more is an enumeration.
  if ((value.match(/,/g) || []).length >= 2) return { ok: false, reason: 'list_like' };

  return { ok: true, value };
}

/**
 * Deterministic generator — no model, no network, no cost.
 *
 * Extracts the prospect's own leading clause and trims it to the cap. It cannot
 * invent a fact, because it only ever returns a substring of what they wrote.
 * That property is why it is the safe default: the worst case is an awkward
 * clause, never a fabricated one.
 */
export function deterministicGenerator({ noteText }) {
  if (!noteText) return null;
  // First clause: prospects lead with the actual problem.
  const first = noteText.split(/[.!?;\n]/)[0] || '';
  const words = first.trim().split(/\s+/).filter(Boolean);
  if (words.length < 3) return null; // too thin to read as a paraphrase
  return words.slice(0, MAX_WORDS).join(' ').toLowerCase();
}

/**
 * Resolve fuzzy variables for one lead.
 *
 * NEVER throws and NEVER blocks a send. Returns null whenever the clause cannot
 * be produced safely, which the caller reads as "use the static copy".
 *
 * @param {object}   opts
 * @param {string}   [opts.noteText]  the prospect's own free text — NO identity
 * @param {string}   [opts.source]    'consult' | 'contact' | 'prism' (logging only)
 * @param {Function} [opts.generator] injectable; must return string|null
 * @param {object}   [opts.env]
 * @returns {Promise<{paraphrasedNeed:string, provenance:string}|null>}
 */
export async function resolveFuzzyVariables({
  noteText,
  source,
  generator = deterministicGenerator,
  env = process.env,
} = {}) {
  try {
    if (!flagEnabled(env)) return null;

    // Sanitize BEFORE the generator sees it: shape control + prompt-injection
    // defense. Reused from the coach/workout prompt lane (rule 18) rather than
    // written fresh — that module has already had two review passes find real
    // ordering bugs in it, and a second implementation would not inherit them.
    const safeNote = sanitizeClientText(noteText, { maxLen: 280 });
    if (!safeNote) return null;

    const raw = await generator({ noteText: safeNote, source });
    const verdict = validateClause(raw);

    if (!verdict.ok) {
      // Rejection is the EXPECTED path often enough that it is info, not warn.
      // Never log the clause itself or the note — reason code only.
      logger.info(`[fuzzy-vars] clause rejected (${verdict.reason}) src=${source ?? '?'}`);
      return null;
    }

    return {
      paraphrasedNeed: verdict.value,
      provenance: generator === deterministicGenerator ? 'deterministic' : 'generated',
    };
  } catch (err) {
    // A personalization failure must never cost the send.
    logger.warn(`[fuzzy-vars] unexpected error (non-blocking) src=${source ?? '?'}: ${err?.message}`);
    return null;
  }
}

export default { resolveFuzzyVariables, validateClause, deterministicGenerator, MAX_WORDS };

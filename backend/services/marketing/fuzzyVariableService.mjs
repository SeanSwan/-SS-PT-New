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

import {
  MAX_WORDS, MAX_CHARS, MAX_RAW_CHARS, GENERATOR_TIMEOUT_MS,
  INVISIBLE_RE, CONTROL_RE, LONE_SURROGATE_RE, COMBINING_STACK_RE,
  BARE_DOMAIN_RE, FORBIDDEN_SHAPES, META_PHRASES,
  hasNonAsciiDigit, hasMixedScriptToken,
} from './fuzzyClauseGuards.mjs';

export { MAX_WORDS, MAX_CHARS };

/** Feature flag - exact-match 'true', mirroring every other marketing flag. */
const flagEnabled = (env) => env?.MARKETING_FUZZY_VARS_ENABLED === 'true';

const wordCount = (s) => s.trim().split(/\s+/).filter(Boolean).length;

/** Unique sentinel so a generator returning any real value can never impersonate a timeout. */
const TIMED_OUT = Symbol('fuzzy-vars-generator-timeout');

/**
 * Validate a generated clause as hostile input.
 * @returns {{ok:true, value:string} | {ok:false, reason:string}}
 */
export function validateClause(raw, { maxWords = MAX_WORDS } = {}) {
  if (typeof raw !== 'string') return { ok: false, reason: 'not_a_string' };

  // RAW ceiling BEFORE normalization (Sol FVS-02). `MAX_CHARS` is checked only
  // after NFKC, a full regex replace, a trim and a split, so a 5,000,000-char
  // return value was fully processed before being rejected. NFKC can also
  // expand. This bounds the work at the hostile-generator seam.
  if (raw.length > MAX_RAW_CHARS) return { ok: false, reason: 'too_long_raw' };

  // NFKC FIRST, and the normalized string is what every later check sees AND
  // what we return. Every FORBIDDEN_SHAPE below is an ASCII character class,
  // and JS `\w`/`\d` are ASCII-only, so the same payload written in fullwidth
  // forms walked past all eight of them (probed 2026-08-14: `＄1200`, `40％`,
  // `＜script＞`, `ｈｔｔｐｓ://`, and a fullwidth email were all accepted).
  // Folding first is what makes the existing guards actually load-bearing.
  //
  // This is canonicalization, not repair: it is total, deterministic and
  // idempotent, it runs before every check, and the value returned is the exact
  // string that was checked — closing the "validate one form, ship another" gap
  // rather than opening a negotiate-with-the-validator seam.
  const normalized = raw.normalize('NFKC');

  // Before whitespace collapse: `\s` does not include U+200B, so an invisible
  // payload would survive the collapse untouched.
  if (INVISIBLE_RE.test(normalized)) return { ok: false, reason: 'invisible_control' };

  // Collapse whitespace/newlines: the clause is interpolated mid-sentence, so a
  // newline would visibly break the human-written sentence around it.
  const value = normalized.replace(/\s+/g, ' ').trim();

  if (!value) return { ok: false, reason: 'empty' };
  // Checked after the collapse, so the TAB/LF/CR that the collapse legitimately
  // folds are already gone and anything left is a genuine control character.
  if (CONTROL_RE.test(value)) return { ok: false, reason: 'control_char' };
  // An unpaired surrogate is not valid text and is commonly replaced in
  // transport, so what the prospect receives is not what validated (Sol FVS-12).
  if (LONE_SURROGATE_RE.test(value)) return { ok: false, reason: 'lone_surrogate' };
  if (COMBINING_STACK_RE.test(value)) return { ok: false, reason: 'combining_stack' };
  if (wordCount(value) > maxWords) return { ok: false, reason: 'too_long' };
  // A word cap is not a size cap: ten 500-character tokens satisfy `maxWords`.
  if (value.length > MAX_CHARS) return { ok: false, reason: 'too_long_chars' };
  for (const shape of FORBIDDEN_SHAPES) {
    if (shape.test(value)) return { ok: false, reason: 'forbidden_shape' };
  }

  // These three run AFTER the shape loop on purpose: they are backstops for what
  // the ASCII shapes structurally CANNOT see, not replacements for them. Ordering
  // them first silently reclassified `dana@example.com` from `forbidden_shape` to
  // `bare_domain` — same rejection, but it churns a reason code three existing
  // tests pin, and reason codes are the only forensic signal this module logs.
  if (hasMixedScriptToken(value)) return { ok: false, reason: 'mixed_script' };
  if (hasNonAsciiDigit(value)) return { ok: false, reason: 'non_ascii_digit' };
  if (BARE_DOMAIN_RE.test(value)) return { ok: false, reason: 'bare_domain' };
  for (const meta of META_PHRASES) {
    if (meta.test(value)) return { ok: false, reason: 'meta_output' };
  }
  // Must read as a clause, not a sentence or a list. NFKC folds `！` and `？`
  // onto ASCII but leaves U+3002 IDEOGRAPHIC FULL STOP alone, so it is listed.
  if (/[.!?。]$/.test(value)) return { ok: false, reason: 'terminal_punctuation' };
  // Comma COUNT, not length. A short list ("heating, cooling, ducts, vents")
  // is only 4 words and would have slipped a word-count guard, yet reads badly
  // interpolated mid-sentence. One comma is a legitimate subordinate clause
  // ("the upstairs, which stays hot"); two or more is an enumeration.
  // U+3001 IDEOGRAPHIC COMMA enumerates identically but survives NFKC, and an
  // ideographic list is a single whitespace-token so the word cap never sees it.
  if ((value.match(/[,、]/g) || []).length >= 2) return { ok: false, reason: 'list_like' };

  return { ok: true, value };
}

/**
 * Deterministic generator — no model, no network, no cost.
 *
 * Extracts the prospect's own leading clause and trims it to the cap.
 *
 * CLAIM CORRECTED (Sol FVS-19): earlier wording here said it "only ever returns
 * a SUBSTRING of what they wrote". That is false — `.toLowerCase()` and the
 * re-join on single spaces both mean the output need not appear verbatim in the
 * input. The accurate and still-useful property is weaker: it only ever returns
 * WORDS THE PROSPECT WROTE, in their original order, so it cannot invent a fact.
 *
 * It CAN still mislead by truncation (Sol FVS-20): cutting at the word cap can
 * drop a negation or leave a dangling fragment, e.g. "the upstairs unit is
 * definitely not cooling the bedrooms at". That is a copy-quality risk, not a
 * safety one, and it is the strongest argument for keeping the generated
 * proportion small.
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

    // TIMEOUT (Sol FVS-22). "Never blocks a send" was false: `await generator()`
    // on a promise that never settles hangs the send forever, and the LLM
    // generator this seam exists for is exactly the kind that can hang. Losing
    // the race yields null — the same safe fallback as any other failure.
    //
    // The timer is CLEARED on the winning path rather than unref'd. An unref'd
    // timer does not hold the event loop open, so when nothing else is pending
    // the process can exit before it fires and the promise never settles at all
    // — reintroducing the hang it was added to fix (observed: a standalone probe
    // produced no output and exited silently). clearTimeout gives both
    // properties: the timeout always fires, and no handle outlives the call.
    let timer;
    const raw = await Promise.race([
      generator({ noteText: safeNote, source }),
      new Promise((resolve) => { timer = setTimeout(() => resolve(TIMED_OUT), GENERATOR_TIMEOUT_MS); }),
    ]).finally(() => clearTimeout(timer));

    if (raw === TIMED_OUT) {
      logger.warn(`[fuzzy-vars] generator timed out after ${GENERATOR_TIMEOUT_MS}ms src=${source ?? '?'}`);
      return null;
    }

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

export default {
  resolveFuzzyVariables, validateClause, deterministicGenerator, MAX_WORDS, MAX_CHARS,
};

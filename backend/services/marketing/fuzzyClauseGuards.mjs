/**
 * GUARDS: Fuzzy-variable clause validation primitives
 * ====================================================
 * Extracted from `fuzzyVariableService.mjs` when the external review panel
 * (Kimi K3 / Tencent HY3 / GPT-5.6 Sol, 2026-08-14) produced 20 confirmed
 * findings and the fixes pushed the parent past the 300-line cap (rule 4).
 *
 * Every constant here exists because a specific input got through. The comment
 * on each names that input, so a future reader can tell a load-bearing guard
 * from a decorative one — and so nobody "simplifies" one back open.
 *
 * DOCTRINE: reject, never repair. A rejected clause degrades to the static
 * human-written copy, which is a good email. That asymmetry is why these
 * guards are tuned to over-reject rather than under-reject: the cost of a
 * false positive is a slightly less personalized email, and the cost of a
 * false negative is a brand incident in a prospect's inbox.
 */

/** Hard ceiling on generated clause length. Short is the entire point. */
export const MAX_WORDS = 10;

/**
 * Absolute character ceiling. A WORD cap is not a SIZE cap: ten 500-character
 * tokens satisfied a ten-word ceiling at 5,009 characters.
 */
export const MAX_CHARS = 120;

/**
 * Coarse ceiling applied to the RAW string BEFORE normalization (Sol FVS-02).
 * `MAX_CHARS` is checked only after NFKC, a full regex replace, a trim and a
 * split — so a 5,000,000-character return value was fully processed before
 * being rejected (measured: 12ms, plus the allocations). NFKC can also expand.
 * This bounds the work at the hostile-generator seam.
 */
export const MAX_RAW_CHARS = 4096;

/** Milliseconds a generator may take before the send gives up on it. */
export const GENERATOR_TIMEOUT_MS = 2000;

/**
 * Invisible and bidirectional format characters.
 *
 * U+061C (Sol FVS-06 / HY3 #1) and U+034F (Sol FVS-07) were BOTH missing from
 * the first version of this class, which is why the "bidi is rejected outright"
 * claim was overstated. U+061C is a strong RTL mark that flips the surrounding
 * human-written sentence exactly like U+202E; U+034F COMBINING GRAPHEME JOINER
 * is invisible and splits a phone number so the digit-run guard cannot see it.
 */
export const INVISIBLE_RE = new RegExp(
  '[\\u00AD'           // soft hyphen
  + '\\u034F'          // combining grapheme joiner — invisible digit separator
  + '\\u061C'          // arabic letter mark — strong RTL, flips surrounding text
  + '\\u180E'          // mongolian vowel separator
  + '\\u200B-\\u200F'  // zero-width space/non-joiner/joiner, LTR & RTL marks
  + '\\u202A-\\u202E'  // bidi embedding / override
  + '\\u2060-\\u2064'  // word joiner, invisible operators
  + '\\u2066-\\u2069'  // bidi isolates
  + '\\uFEFF]',        // BOM / zero-width no-break space
);

/**
 * C0/C1 controls.
 *
 * VT (U+000B) and FF (U+000C) are deliberately ABSENT (Sol FVS-01): JavaScript
 * `\s` includes them, so the whitespace collapse folds them to a space before
 * this ever runs. Listing them implied a rejection that could never happen and
 * contradicted "reject, never repair" — they are repaired, as whitespace, and
 * that is fine. TAB/LF/CR are excluded for the same reason.
 */
export const CONTROL_RE = new RegExp(
  '[\\u0000-\\u0008'   // NUL..BS
  + '\\u000E-\\u001F'  // SO..US
  + '\\u007F-\\u009F]',// DEL + C1
);

/**
 * An unpaired UTF-16 surrogate (Sol FVS-12). It is not valid text, survives
 * validation, and is commonly mangled or replaced in transport — so what the
 * prospect receives is not what was validated.
 */
export const LONE_SURROGATE_RE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/;

/**
 * Three or more stacked combining marks ("zalgo") render as vertical noise.
 *
 * `\p{M}`, NOT `\p{Mn}` (Sol FVS-13): the original nonspacing-only class missed
 * ENCLOSING marks (`\p{Me}`, e.g. U+20DD..U+20E0), which stack and render
 * identically. `\p{M}` covers Mn, Mc and Me.
 */
export const COMBINING_STACK_RE = /\p{M}{3,}/u;

/** Latin vs Cyrillic/Greek — the confusable pairs that make homoglyph domains work. */
const LATIN_RE = /[A-Za-z]/;
const CONFUSABLE_SCRIPT_RE = /[Ͱ-ϿЀ-ӿ]/;

/**
 * Bare domain with no scheme and no `www.`.
 *
 * Deliberately GENERIC, not a curated TLD list (HY3 #4 / Sol FVS-03): the
 * curated list missed `.cloud` and `.ai`, and mail clients maintain their own
 * far larger auto-link tables — so a string the validator believed contained no
 * link was rendered as a clickable hyperlink by Gmail. Matching any dotted
 * token over-rejects (`report.info` degrades to static copy, Sol FVS-18) and
 * that is the intended direction.
 */
export const BARE_DOMAIN_RE = /\b[a-z0-9][a-z0-9-]*\.[a-z]{2,24}\b/i;

/**
 * Shapes that must never appear in generated copy.
 * Each entry is annotated with the input that defeated its previous form.
 */
export const FORBIDDEN_SHAPES = [
  /[\w.+-]+@[\w-]+\.[\w.]+/,            // email address
  /\+?\d[\d\s().-]{7,}\d/,              // long phone-ish digit run
  /\b\d{3}[\s.\u2010-\u2015-]?\d{4}\b/, // SHORT local phone: "555 1234" (Sol FVS-05)
  /https?:\/\//i,                       // URL
  /\bwww\./i,                           // bare www
  /\p{Sc}\s?\d|\d\s?\p{Sc}/u,           // money, EITHER order: "€1200" and "1200 €" (Sol FVS-08)
  /\d\s?%/,                             // percentage claim
  /\b\d+\s?(?:dollars?|usd|eur|euros?|pounds?|percent|pct)\b/i, // spelled-out claims (Sol FVS-09)
  /[<>]/,                               // ANY angle bracket: `/<[^>]*>/` needed a closing
                                        // `>`, so `<!--` and `<script` passed (HY3 #2)
  /&(?:[a-z]{2,10}|#\d{2,5}|#x[0-9a-f]{2,5});/i, // HTML entities: `&lt;b&gt;` decodes to
                                        // markup in a non-double-escaping sink (HY3 #3)
  /[{}]/,                               // unresolved template braces
];

/**
 * Phrases that indicate the generator answered the PROMPT instead of doing the
 * job — the classic failure where a model narrates its task back at you.
 */
export const META_PHRASES = [
  /\b(as an ai|language model|i cannot|i can't help|sorry,)\b/i,
  /\b(paraphrase|summary|summarize|the (customer|lead|user) (said|wrote))\b/i,
  /\bhere('s| is)\b/i,
];

/** Any Unicode decimal digit that is not an ASCII digit (Arabic-Indic, Devanagari...). */
export const hasNonAsciiDigit = (s) => [...s].some((ch) => /\p{Nd}/u.test(ch) && (ch < '0' || ch > '9'));

/** A single token carrying both Latin and Cyrillic/Greek letters is a homoglyph, not a word. */
export const hasMixedScriptToken = (s) => s.split(/\s+/).some(
  (tok) => LATIN_RE.test(tok) && CONFUSABLE_SCRIPT_RE.test(tok),
);

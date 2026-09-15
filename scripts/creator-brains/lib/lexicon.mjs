#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/lib/lexicon.mjs
 * PURPOSE: The deterministic vocabulary layer — stop words, filler, outro and
 *          sponsor boilerplate, marker patterns, POLARITY, and phrase building.
 * PART OF: Creator Brains — SS-PT acquisition engine (review repair HR06, HR09)
 * ADDED: 2026-09-12 | REWRITTEN 2026-09-13
 * ============================================================================
 *
 * THE DEFECT THIS REWRITE CLOSES (reproduced finding HR06):
 *   `keyPhraseFrom` filtered out every stop word, and `never`, `don't` and
 *   `avoid` were stop words or markers that were consumed and discarded. So:
 *
 *     "always blur the tear trough crease before retouching portraits"
 *     "never  blur the tear trough crease before retouching portraits"
 *
 *   both became `directive — blur tear trough crease retouching portraits`, and
 *   because the phrase recurred across two videos the doctrine detector promoted
 *   it. **The brain asserted the exact opposite of what the creator said, twice,
 *   and called it their most-repeated belief.**
 *
 *   That is worse than a missing feature. "It cannot invent a rule" was the
 *   stated justification for shipping deterministic extraction instead of an
 *   LLM, and this defect falsified it: the extractor invented a rule by
 *   destroying the one word that carried the meaning.
 *
 * THE FIX — POLARITY IS A FIRST-CLASS FIELD:
 *   A claim now carries `polarity` ('affirm' | 'negate'), `action`, `object`,
 *   and an optional `condition`, kept SEPARATE from `keyPhrase` (which stays a
 *   search-friendly bag of content words). Doctrine grouping keys on
 *   (phrase, polarity), so opposing statements can never merge — and when both
 *   polarities occur the brain reports a stance change or a conflict instead of
 *   averaging them into a false consensus.
 *
 * WHAT THIS STILL DOES NOT DO:
 *   It does not understand meaning. "I used to blur the tear trough but now I
 *   never do" is beyond a marker scan, and claims are therefore labelled
 *   `candidate`, never `validated`. The module's job is to stop DESTROYING
 *   meaning, not to claim it has recovered all of it.
 *
 * @module creator-brains/lexicon
 */

import { normalizeWords } from './fidelity.mjs';

/** Lane C phrase cap. The fidelity gate in render.mjs is the enforcing control;
 *  this keeps the common case small before the check ever runs. */
export const MAX_PHRASE_WORDS = 7;

/** Minimum words before a cue can carry a rule. */
export const MIN_CLAIM_WORDS = 6;

/** Grammar and filler. NOTE: modality words (`never`, `always`, `avoid`,
 *  `don't`) are deliberately NOT here — they used to be, and that is HR06. */
const STOP = new Set(('a an the and or but if then than that this these those i you he she it we they me him her us them '
  + 'is are was were be been being am do does did doing have has had having will would shall can could may might '
  + 'of in on at to for with from by about into over after before under again further once here there when where why how '
  + 'all any both each few more most other some such no nor not only own same so too very s t just don now our your their '
  + 'my its his her what which who whom while because as until against between during through above below up down out off '
  + 'get got go going really kind sort lot thing things stuff okay ok yeah right like well know think want need see '
  + 'look make made take taken come came give given use used using one two three first second next last time way day '
  + 'let lets im youre thats were cant wont isnt doesnt didnt theyre theres heres whats '
  + 'also maybe even still much many every another back around going gonna wanna gotta said says say something anything '
  + 'everything nothing someone anyone everyone little bit lot sure basically actually literally probably definitely '
  + 'course point part place put puts putting call called calls show shows showing shown work works working'
).split(/\s+/));

/** Words that are never subject matter, even at length. */
const FILLER = new Set(('tuned subscribed subscribe bell notification notifications description link links below '
  + 'video videos channel comment comments watch watching guys friends friend everyone welcome today hello hey'
).split(/\s+/));

/**
 * OUTRO AND SPONSOR BOILERPLATE.
 *
 *   Reproduced live: before this filter, a run over three real videos returned
 *   "forget subscribe", "friend don't miss" and "video sure" as the creator's
 *   top recurring doctrines — every video ends with "don't forget to subscribe",
 *   so the phrase recurred and the doctrine detector promoted a call to action
 *   to the loudest signal in the brain.
 */
const BOILERPLATE = /\b(subscri\w*|hit the bell|notification bell|bell icon|like (?:this|the) video|comment (?:below|down|section)|link(?:s)? (?:in|below)|description (?:below|box)|patreon|sponsor\w*|promo code|discount code|coupon|members? (?:of the )?channel|join this channel|thanks? for watching|thank you (?:so much )?for watching|see you (?:in the )?next|catch you (?:in the )?next|stay tuned|keep creating|miss (?:future|any) (?:tips|videos|tutorials)|share (?:this|the) video|ring the bell)\b/i;

/** Strip possessives and clitics so `it's`/`its`/`its'` collapse to one key. */
function normalizeWord(raw) {
  return String(raw || '')
    .toLowerCase()
    .replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, '')
    .replace(/'(?:s|t|re|ve|ll|d|m)$/i, '');
}

function isContent(w) {
  const n = normalizeWord(w);
  return n.length >= 4 && !STOP.has(n) && !FILLER.has(n);
}

/**
 * Modality markers, each declaring its POLARITY — or `null` when the marker
 * does not determine one.
 *
 * `null` IS THE IMPORTANT VALUE, AND IT WAS A BUG TO OMIT IT (review HR15).
 *
 *   The first repaired version mapped every `caution` marker to `negate`. That
 *   made "be careful preserve texture while adjusting the shadow contrast" a
 *   NEGATION of "always preserve texture while adjusting the shadow contrast",
 *   and the query surface then reported one creator as disagreeing with
 *   themselves. They agree: both say to preserve texture.
 *
 *   A caution marker says something is worth attention; it does not say whether
 *   the advice is to do the thing or to avoid it. "Watch out for banding" warns
 *   against banding; "be careful to preserve texture" recommends preserving
 *   texture. Claiming a contradiction from a marker whose polarity you do not
 *   know is inventing evidence — the same failure as inventing a rule, one layer
 *   up. So ambiguous markers carry `null`, and `null` never contradicts.
 *
 * Polarity therefore comes from the words that actually negate, never from the
 * modality label.
 */
const NEGATION = /\b(never|do not|don't|avoid|refrain from|stay away from|must not|shouldn't|should not)\b/i;
const AFFIRMATION = /\b(always|must|should|make sure|be sure|you need to|you have to)\b/i;

const MARKERS = [
  // ── directives: polarity comes from the negation/affirmation word itself ──
  { modality: 'directive', re: /\b(always|must|should|make sure|be sure|you need to|you have to)\b/i, polarity: 'affirm' },
  { modality: 'directive', re: NEGATION, polarity: 'negate' },
  // ── preferences: a stated preference affirms the thing preferred ──
  { modality: 'preference', re: /\b(i (?:would )?(?:rather|prefer)|i prefer|my preference|i like|i love|my favou?rite|in my opinion|imo)\b/i, polarity: 'affirm' },
  // ── cautions: polarity UNDETERMINED unless the sentence also negates ──
  { modality: 'caution', re: NEGATION, polarity: 'negate' },
  { modality: 'caution', re: /\b(careful|watch out|beware|the mistake|most people get|the problem is|kills|ruins|breaks|destroys)\b/i, polarity: null },
  // ── techniques: naming a technique affirms it ──
  { modality: 'technique', re: /\b(the trick|the key|the secret|pro tip|what i do|the way i|the best way|the only way|my approach)\b/i, polarity: 'affirm' },
];

/** Leading condition clauses, captured so they are not lost. */
const CONDITION = /\b(?:if|when|whenever|before|after|unless|as long as|for)\s+([^,.;]{3,60})/i;

const words = (s) => String(s || '').replace(/[^\p{L}\p{N}\s'-]/gu, ' ').split(/\s+/).filter(Boolean);

export function modalityOf(text) {
  const m = MARKERS.find((mk) => mk.re.test(text));
  return m ? { modality: m.modality, polarity: m.polarity } : null;
}
/**
 * Build the search phrase: content words only, hyphen-normalized.
 *
 *   Uses the SAME normalizer as the fidelity gate, so `frequency-separation`
 *   contributes two words here and two words there. The old tokenizer kept the
 *   hyphen, which is how seven tokens became a fourteen-word verbatim run
 *   (review HR09).
 */
export function keyPhraseFrom(text, maxWords = MAX_PHRASE_WORDS) {
  const kept = normalizeWords(text).filter(isContent);
  if (kept.length < 2) return null;
  return kept.slice(0, maxWords).join(' ');
}

/** A human-readable label for the polarity, used in the statement. */
const POLARITY_LABEL = { affirm: 'do', negate: 'do not', unknown: '[polarity unclear]' };

/**
 * The complete editorial decision for one cue.
 *
 * Returns `{ modality, polarity, keyPhrase, action, object, condition, statement }`
 * or `null`. Order matters: boilerplate is rejected BEFORE any marker test,
 * because "don't forget to subscribe" contains a negated directive and would
 * otherwise become this creator's most-repeated rule.
 */
export function claimFromCue(cueText) {
  const text = String(cueText || '');
  if (BOILERPLATE.test(text)) return null;
  if (words(text).length < MIN_CLAIM_WORDS) return null;

  const mod = modalityOf(text);
  if (!mod) return null;

  const marker = MARKERS.find((mk) => mk.modality === mod.modality && mk.re.test(text));
  const m = marker ? marker.re.exec(text) : null;
  const after = m ? text.slice(m.index + m[0].length) : text;

  // The phrase is built from AFTER the marker, but the POLARITY is preserved
  // separately — it is no longer thrown away with the marker word.
  const keyPhrase = keyPhraseFrom(after) || keyPhraseFrom(text);
  if (!keyPhrase) return null;

  const conditionMatch = CONDITION.exec(text);
  const condition = conditionMatch ? keyPhraseFrom(conditionMatch[1], 6) : null;

  const kw = keyPhrase.split(' ');
  const action = kw.slice(0, 1).join(' ');
  const object = kw.slice(1).join(' ') || null;

  // `null` becomes the explicit string 'unknown' so it survives JSON and so a
  // consumer must decide what to do with it rather than reading `undefined`.
  const polarity = mod.polarity === null || mod.polarity === undefined ? 'unknown' : mod.polarity;

  return {
    modality: mod.modality,
    polarity,
    keyPhrase,
    action,
    object,
    condition,
    // POLARITY IS IN THE STATEMENT. Two cues that differ only by always/never
    // now produce two different statements, which is the entire point.
    statement: `${POLARITY_LABEL[polarity]} ${keyPhrase}`
      + `${condition ? ` (when ${condition})` : ''}`,
  };
}

/** Group cues into ~90s windows — a free, creator-authored-ish segment. */
export function segmentCues(cues, windowMs = 90_000) {
  const out = [];
  let cur = null;
  for (const cue of cues || []) {
    if (!cur || cue.ms - cur.startMs >= windowMs) {
      cur = { startMs: cue.ms, cues: [] };
      out.push(cur);
    }
    cur.cues.push(cue);
  }
  return out.map((w) => ({ startMs: w.startMs, text: w.cues.map((c) => c.text).join(' ') }));
}

/** Content terms with counts, for the topic map. */
export function termCounts(texts) {
  const counts = new Map();
  const spread = new Map();
  for (const t of texts) {
    const seen = new Set();
    for (const raw of words(t)) {
      const w = normalizeWord(raw);
      if (w.length < 5 || STOP.has(w) || FILLER.has(w) || /^\d+$/.test(w)) continue;
      if (!isContent(w)) continue;
      counts.set(w, (counts.get(w) || 0) + 1);
      if (!seen.has(w)) { spread.set(w, (spread.get(w) || 0) + 1); seen.add(w); }
    }
  }
  return { counts, spread };
}

/** Exposed for tests and for the doctrine grouping key. */
export const POLICY = { MAX_PHRASE_WORDS, MIN_CLAIM_WORDS, STOP_SIZE: STOP.size };

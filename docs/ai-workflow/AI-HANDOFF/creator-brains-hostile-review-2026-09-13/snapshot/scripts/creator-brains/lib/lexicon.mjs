#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/lib/lexicon.mjs
 * PURPOSE: The deterministic vocabulary layer — stop words, filler, outro and
 *          sponsor boilerplate, marker patterns, and the Lane C phrase cap.
 * PART OF: Creator Brains — SS-PT acquisition engine (blueprint 1.0, S6)
 * ADDED: 2026-09-12
 * ============================================================================
 *
 * WHY THIS IS ITS OWN MODULE:
 *   It was the top third of extract.mjs, which pushed that file past the Rule 4
 *   300-line cap once the hostile-review fixes landed. The seam is real rather
 *   than cosmetic: this file is the part that encodes editorial judgement about
 *   language, and extract.mjs is the part that walks documents and counts. Every
 *   entry here is a REPRODUCED failure, not a precaution — see the boilerplate
 *   note below for the live run that produced it.
 *
 * IT IS ALSO THE TIER BOUNDARY'S ENFORCEMENT POINT. MAX_PHRASE_WORDS is what
 *   guarantees no Lane C surface can carry a long verbatim run of the creator's
 *   spoken work, and keyPhraseFrom is the only function allowed to produce
 *   Lane C text from a transcript.
 *
 * @module creator-brains/lexicon
 */

/** Lane C phrase cap. See the header — this is what makes the tier boundary
 *  enforceable by a test instead of by a promise. */
export const MAX_PHRASE_WORDS = 7;

/** Small English stop list — enough to keep a topic map readable.
 *  Clitics are listed in their BARE, de-apostrophed form because
 *  `normalizeWord` strips the clitic before lookup — so `it's` has already
 *  become `it` by the time this set is consulted, and listing the contracted
 *  spelling would be dead weight. (It would also break the string literal.) */
const STOP = new Set(('a an the and or but if then than that this these those i you he she it we they me him her us them '
  + 'is are was were be been being am do does did doing have has had having will would shall should can could may might '
  + 'of in on at to for with from by about into over after before under again further once here there when where why how '
  + 'all any both each few more most other some such no nor not only own same so too very s t just don now our your their '
  + 'my its his her what which who whom while because as until against between during through above below up down out off '
  + 'get got go going really kind sort lot thing things stuff okay ok yeah right like well know think want need see '
  + 'look make made take taken come came give given use used using one two three first second next last time way day '
  + 'let lets im youre thats were cant wont isnt doesnt didnt dont theyre theres heres whats '
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
 *   This filter is not cosmetic. Before it existed, a live run over three real
 *   videos produced "forget subscribe", "friend don't miss" and "video sure" as
 *   this creator's top recurring doctrines — because every video ends with
 *   "don't forget to subscribe", so the phrase recurred across videos and the
 *   doctrine detector promoted it. The single loudest signal in the brain was
 *   a call to action. A rule about the outro is not a rule about the craft.
 *
 *   Sponsor reads have the same shape and the same problem ("use code X"), which
 *   is the upstream review's upgrade #11 — implemented here as a filter rather
 *   than a flag because a flag nobody reads is not a control.
 */
const BOILERPLATE = /\b(subscri\w*|hit the bell|notification bell|bell icon|like (?:this|the) video|comment (?:below|down|section)|link(?:s)? (?:in|below)|description (?:below|box)|patreon|sponsor\w*|promo code|discount code|coupon|members? (?:of the )?channel|join this channel|thanks? for watching|thank you (?:so much )?for watching|see you (?:in the )?next|catch you (?:in the )?next|stay tuned|keep creating|miss (?:future|any) (?:tips|videos|tutorials)|share (?:this|the) video|ring the bell)\b/i;

/** Strip possessives and clitics so `it's`/`its`/`its'` collapse to one key. */
function normalizeWord(raw) {
  return String(raw || '')
    .toLowerCase()
    .replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, '')
    .replace(/'(?:s|t|re|ve|ll|d|m)$/i, '');
}

/** A content word: long enough, not grammar, not filler. */
function isContent(w) {
  const n = normalizeWord(w);
  return n.length >= 4 && !STOP.has(n) && !FILLER.has(n);
}

/** Marker → modality. Deterministic, auditable, and cheap to extend. */
const MARKERS = [
  ['directive', /\b(always|never|must|should|do not|don't|avoid|make sure|be sure)\b/i],
  ['preference', /\b(i (?:would )?(?:rather|prefer)|i prefer|my preference|i like|i love|my favou?rite|in my opinion|imo)\b/i],
  ['caution', /\b(careful|watch out|beware|the mistake|most people get|the problem is|kills|ruins|breaks|destroys)\b/i],
  ['technique', /\b(the trick|the key|the secret|pro tip|what i do|the way i|the best way|the only way|my approach)\b/i],
];

const words = (s) => String(s || '').replace(/[^\p{L}\p{N}\s'-]/gu, ' ').split(/\s+/).filter(Boolean);

/**
 * Pick a ≤7-word phrase from AFTER the marker, keeping CONTENT words only.
 *
 *   Dropping grammar here is what turns "don't forget to subscribe" into an
 *   empty phrase (and therefore no claim), and "never blur the tear trough
 *   crease" into "blur tear trough crease" — the useful fragment. A phrase needs
 *   at least two content words to be citable; one content word is a keyword, not
 *   a rule.
 *
 *   The 7-word cap is a LEGAL control, not a style choice: Lane C is the only
 *   tier allowed to leave the machine, and the cap is what guarantees no
 *   derived surface can carry a long verbatim run of the creator's spoken work.
 */
export function keyPhraseFrom(text, maxWords = MAX_PHRASE_WORDS) {
  const kept = words(text).filter(isContent);
  if (kept.length < 2) return null;
  return kept.slice(0, maxWords).map(normalizeWord).join(' ').trim() || null;
}

/** Minimum words before a cue can carry a rule. A 4-word cue produces fragments
 *  like "tuned sure keep" — noise dressed as a claim. */
export const MIN_CLAIM_WORDS = 6;

/**
 * The whole editorial decision for one cue, in one function.
 *
 *   Order matters: boilerplate is rejected BEFORE any marker test, because
 *   "don't forget to subscribe" contains a directive marker and would otherwise
 *   become this creator's most-repeated doctrine. Then length, then modality,
 *   then the phrase — anchored AFTER the marker, since "never blur the tear
 *   trough" is the useful fragment and "we never blur" is not.
 *
 *   Returns `{ modality, phrase }` or `null`. Keeping this here rather than in
 *   extract.mjs is what lets the vocabulary stay private to this module: the
 *   caller never sees BOILERPLATE, MARKERS or the stop list, so it has no way to
 *   construct Lane C text by some other route.
 */
export function claimFromCue(cueText) {
  const text = String(cueText || '');
  if (BOILERPLATE.test(text)) return null;
  if (words(text).length < MIN_CLAIM_WORDS) return null;
  const modality = modalityOf(text);
  if (!modality) return null;
  const m = MARKERS.find(([n]) => n === modality)[1].exec(text);
  const after = m ? text.slice(m.index + m[0].length) : text;
  const phrase = keyPhraseFrom(after) || keyPhraseFrom(text);
  if (!phrase) return null;
  return { modality, phrase };
}


function modalityOf(text) {
  for (const [name, re] of MARKERS) if (re.test(text)) return name;
  return null;
}

/** Group cues into ~90s windows — a free, creator-authored-ish topic segment. */
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

/** Content terms with counts, for the topic map. Grammar, filler and
 *  boilerplate are removed BEFORE counting — a topic table whose top entries are
 *  `let's` and `don't` is a table of the creator's verbal tics, not their
 *  subject matter, and it was the first thing the live run got wrong. */
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


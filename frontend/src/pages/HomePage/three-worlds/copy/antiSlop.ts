/**
 * antiSlop — the copy gate that keeps front-page language from reading as generated filler.
 * @module pages/HomePage/three-worlds/copy/antiSlop
 *
 * WHY: Sean's rule for this work is that the writing must not read as AI. A style
 * guide is not enforceable, so this module turns the judgement into a mechanical
 * gate that tests can run (blueprint R5 / T7).
 *
 * The banned classes are chosen from observed failure modes, not taste:
 *   1. AI connective tissue — "unlock", "elevate", "seamless", "empower", "delve".
 *      These words carry no information and appear in generated copy at far above
 *      human-written base rates.
 *   2. Empty intensifiers — "truly", "incredibly", "game-changing", "world-class".
 *      A claim that needs an intensifier usually has no number behind it.
 *   3. Journey/landscape metaphor — "embark on a journey", "in today's landscape".
 *      Padded framings that delay the actual sentence.
 *   4. Rule 9 language — "yoga", "meditation", "mindfulness". House rule: use
 *      "stretching" / "flexibility".
 *   5. Engagement bait — "look no further", "the best part?".
 *
 * Deliberately NOT banned: plain words that are only slop in combination
 * ("boost", "transform", "community"). Banning a bare noun would force awkward
 * writing, which is a worse outcome than the problem. Phrases are the unit.
 *
 * Every phrase is matched case-insensitively on word boundaries so "unlocked
 * doors" in a real sentence is still caught, while a proper noun containing the
 * substring is not silently destroyed.
 */

/** Phrase class → the phrases themselves. Grows only with a recorded reason. */
export const BANNED_PHRASES: Record<string, string[]> = {
  'ai-connective-tissue': [
    'unlock the', 'unlock your', 'elevate your', 'seamless', 'seamlessly',
    'empower', 'empowering', 'delve', 'dive into', 'let us help you',
    'we believe that', 'it is not just', "it's not just", 'more than just',
    'take it to the next level', 'next level',
  ],
  'empty-intensifier': [
    'truly', 'incredibly', 'game-changing', 'game changer', 'world-class',
    'cutting-edge', 'state-of-the-art', 'unparalleled', 'revolutionary',
    'best-in-class', 'unrivaled',
    /* Round 4: the UNHYPHENATED forms passed the hyphenated bans. */
    'game changing', 'world class', 'cutting edge', 'state of the art', 'best in class',
  ],
  'journey-metaphor': [
    'embark on a journey', 'on your journey', 'your fitness journey',
    'in today\u2019s landscape', "in today's landscape", 'in the realm of',
    'when it comes to', 'at the end of the day',
  ],
  'rule-9-language': ['yoga', 'meditation', 'meditative', 'mindfulness', 'mindful'],
  'engagement-bait': [
    'look no further', 'the best part?', 'but here is the thing',
    'here\u2019s the thing', "here's the thing", 'imagine a world',
  ],
  /*
   * Round 4 — HOUSE VOCABULARY. The credentials rule (CLAUDE.md rule 65, from the
   * copy-tournament doctrine) is explicit: say "26+ years" and "NASM-protocol" /
   * "NASM OPT model", never "NASM-certified" — a credential-claim phrasing that is
   * neither Sean's voice nor a verified fact. The pack itself carried one instance
   * in its shared sub until this class caught it, which is exactly the point.
   */
  'house-vocabulary': ['nasm-certified', 'nasm certified'],
};

/**
 * Slop VERBS are caught by stem so inflections cannot slip through the word
 * boundary: round 3's gate banned "empower"/"empowering" while "empowers" sailed
 * past, because the trailing `s` satisfied the boundary regex. Suffixes are
 * constrained to real inflections, so "power" or "embrace" never match.
 */
const SLOP_STEMS: Array<{ cls: string; stem: string }> = [
  { cls: 'ai-connective-tissue', stem: 'unlock' },
  { cls: 'ai-connective-tissue', stem: 'elevate' },
  { cls: 'ai-connective-tissue', stem: 'empower' },
  { cls: 'ai-connective-tissue', stem: 'delve' },
  { cls: 'ai-connective-tissue', stem: 'unleash' },
];

const STEM_SUFFIX = '(?:s|es|ed|d|ing|ment|ly)?';

/** Flattened list for fast scanning. */
const FLAT: Array<{ cls: string; phrase: string; re: RegExp }> = [
  ...Object.entries(BANNED_PHRASES).flatMap(([cls, phrases]) => phrases.map((phrase) => ({
    cls,
    phrase,
    re: new RegExp(`(^|[^a-z0-9])${escapeRe(phrase)}([^a-z0-9]|$)`, 'i'),
  }))),
  // A stem ending in 'e' drops it before vowel suffixes ("delving", "unleashing"),
  // so the trailing e is made optional INSIDE the stem rather than appended after
  // it — otherwise delve+ing could only ever match the impossible "delveing".
  ...SLOP_STEMS.map(({ cls, stem }) => {
    const body = stem.endsWith('e') ? `${stem.slice(0, -1)}(?:e)?` : escapeRe(stem);
    return {
      cls,
      phrase: `${stem}* (stem match)`,
      re: new RegExp(`(^|[^a-z0-9])${body}${STEM_SUFFIX}([^a-z0-9]|$)`, 'i'),
    };
  }),
];

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Find banned phrases in a body of copy.
 * @param text any string (the suite passes JSON.stringify of the whole pack)
 * @returns array of `class :: phrase` findings, empty when clean
 */
export function findSlop(text: string): string[] {
  const hits: string[] = [];
  for (const { cls, phrase, re } of FLAT) {
    if (re.test(text)) hits.push(`${cls} :: ${phrase}`);
  }
  return hits;
}

/**
 * Word-count guard: a headline that needs more than this many words is usually
 * two sentences wearing one coat. Advisory — surfaced by the console, not a test
 * failure, because some real headlines legitimately run long.
 */
export const HEADLINE_WORD_BUDGET = 9;

/** Report headlines that exceed the budget, so the console can flag them. */
export function longHeadlines(headlines: string[]): string[] {
  return headlines.filter((h) => h.trim().split(/\s+/).length > HEADLINE_WORD_BUDGET);
}

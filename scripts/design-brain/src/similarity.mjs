/**
 * similarity.mjs — deterministic, zero-dependency lexical similarity for claim corroboration.
 * ===========================================================================================
 * The corroboration matcher's math (Kimi design 2026-07-20). Pure functions only — no I/O, no
 * randomness, byte-identical output for identical input. This closes the CORROBORATION half of the
 * K5 semantic-dedup gap: near-verbatim rewordings of the same principle (what re-runs of one canonical
 * question actually produce) score high; true disjoint-vocabulary paraphrase deliberately does NOT
 * (it falls out as a fresh claim Sean merges with one `m` letter — cheap, human-visible failure).
 *
 * Score S = 0.5·Jaccard + 0.3·Overlap + 0.2·TrigramDice. The conjunction of three cheap metrics is
 * the anti-gaming guard: the AUTO gate (in corroborate.mjs) requires S AND overlap AND a margin, so
 * no single fuzzy number can carry a weak match into an accepted claim.
 *
 * @module design-brain/similarity
 */
import { normalizePrinciple } from './synthesize.mjs';

/** Light, inspectable suffix stemmer — 5 ordered rules, applied once. NOT Porter (zero-dep, auditable). */
export function stem(token) {
  if (token.length <= 3) return token;
  for (const [suf, rep] of [['ies', 'y'], ['ing', ''], ['ed', ''], ['es', ''], ['s', '']]) {
    if (token.endsWith(suf) && token.length - suf.length >= 2) return token.slice(0, -suf.length) + rep;
  }
  return token;
}

/**
 * Tokenize a principle into content tokens: normalize → split → drop stopwords → stem → drop <3 chars.
 * @param {string} text
 * @param {Set<string>} stopwords
 * @returns {string[]}
 */
export function contentTokens(text, stopwords = new Set()) {
  return normalizePrinciple(text)
    .split(/\s+/)
    .filter(Boolean)
    .filter((w) => !stopwords.has(w))
    .map(stem)
    .filter((w) => w.length >= 3 && !stopwords.has(w));
}

/** Character trigrams of a space-padded normalized string. */
export function trigrams(text) {
  const s = `  ${normalizePrinciple(text)} `;
  const grams = new Set();
  for (let i = 0; i < s.length - 2; i++) grams.add(s.slice(i, i + 3));
  return grams;
}

const interSize = (a, b) => { let n = 0; for (const x of a) if (b.has(x)) n++; return n; };

/** Dice coefficient over trigram sets. */
export function trigramDice(a, b) {
  const A = trigrams(a);
  const B = trigrams(b);
  if (A.size === 0 && B.size === 0) return 1;
  if (A.size === 0 || B.size === 0) return 0;
  return (2 * interSize(A, B)) / (A.size + B.size);
}

/**
 * Score one principle pair. Returns {S, J, O, T, tokensA, tokensB}.
 * J = token Jaccard, O = overlap coefficient (subset-catching), T = trigram Dice.
 */
export function scorePair(a, b, { stopwords = new Set(), weights = { jaccard: 0.5, overlap: 0.3, trigram: 0.2 } } = {}) {
  const ta = contentTokens(a, stopwords);
  const tb = contentTokens(b, stopwords);
  const A = new Set(ta);
  const B = new Set(tb);
  const inter = interSize(A, B);
  const union = new Set([...A, ...B]).size;
  const J = union === 0 ? 0 : inter / union;
  const O = Math.min(A.size, B.size) === 0 ? 0 : inter / Math.min(A.size, B.size);
  const T = trigramDice(a, b);
  const S = weights.jaccard * J + weights.overlap * O + weights.trigram * T;
  return { S, J, O, T, tokensA: ta, tokensB: tb };
}

/**
 * Score `principle` against many candidates, returning matches sorted by S descending.
 * @param {string} principle
 * @param {Array<{claimId, principle, ...}>} candidates
 * @returns {Array<{claimId, S, J, O, T, target}>}
 */
export function bestMatches(principle, candidates, opts = {}) {
  return candidates
    .map((c) => {
      const { S, J, O, T } = scorePair(principle, c.principle, opts);
      return { claimId: c.claimId, S, J, O, T, target: c };
    })
    .sort((x, y) => y.S - x.S);
}

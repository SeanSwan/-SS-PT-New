#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/lib/fidelity.mjs
 * PURPOSE: The single shared-boundary check. Every derived artifact is
 *          normalized and compared against its source corpus BEFORE it is
 *          published, and a nonconforming generation is quarantined.
 * PART OF: Creator Brains — SS-PT acquisition engine (review repair HR09)
 * ADDED: 2026-09-13
 * ============================================================================
 *
 * WHAT WAS WRONG (reproduced defect HR09):
 *   The "seven-word cap" was applied to `keyPhraseFrom` — one field, in one
 *   function, using a tokenizer that kept hyphens. The reviewer fed it seven
 *   hyphenated tokens and the claim carried **14 consecutive normalized source
 *   words**: `frequency-separation layers-masks …` is 7 whitespace tokens and 14
 *   words. A twelve-word creator title was copied verbatim into headers, and gap
 *   reasons bypassed the cap entirely.
 *
 *   That is the signature of a per-field control: it holds for the field someone
 *   remembered and leaks through every other path — titles, handles, error
 *   strings, concatenated fields, table cells.
 *
 * THE FIX IS STRUCTURAL, NOT ANOTHER CAP:
 *   This module checks the FINAL SERIALIZED BYTES of each published file against
 *   the documents it was derived from. If any window of `maxRun + 1` consecutive
 *   normalized words appears in both, the artifact does not publish. It does not
 *   matter which field produced it, how it was punctuated, or whether it was
 *   concatenated at render time — the check runs last, over everything.
 *
 * NORMALIZATION IS THE WHOLE GAME:
 *   NFKC (so full-width and compatibility forms fold), lowercase, and every
 *   non-alphanumeric character becomes a separator — including hyphens,
 *   apostrophes, underscores and zero-width joiners. Comparing raw substrings is
 *   what let `frequency-separation` count as one word.
 *
 * WHAT THIS IS NOT:
 *   It is an INTERNAL POLICY CONTROL, not a legal certification, and it is
 *   deliberately conservative: it will reject a harmless coincidence of eight
 *   common words. That is the correct trade — a rejected generation is visible
 *   and repairable; a published one is not.
 *
 * @module creator-brains/fidelity
 */

/** Windows we will not publish. Policy, not law — see the header. */
export const MAX_SHARED_RUN = 7;

/**
 * Normalize text to a word sequence for comparison.
 * Every non-alphanumeric character is a separator, so hyphenated compounds
 * cannot smuggle a longer run past the check.
 */
export function normalizeWords(text) {
  return String(text ?? '')
    .normalize('NFKC')
    .toLowerCase()
    // Keep letters and digits from any script; everything else separates.
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);
}

/** Every window of `n` consecutive words in `words`. */
export function windows(words, n) {
  const out = new Set();
  for (let i = 0; i + n <= words.length; i += 1) out.add(words.slice(i, i + n).join(' '));
  return out;
}

/**
 * The longest run of consecutive normalized words that appears in BOTH the
 * output and any source. Returns `{ run, sample, sourceIndex }`.
 *
 * Binary-searches the run length: an 8-gram implies a 7-gram, so the predicate
 * is monotone and we do not need to materialize every window of every size.
 */
export function longestSharedRun(outputText, sources, { maxProbe = 40 } = {}) {
  const outWords = normalizeWords(outputText);
  if (!outWords.length) return { run: 0, sample: null, sourceIndex: null };
  const srcWords = (Array.isArray(sources) ? sources : [sources]).map((s) => normalizeWords(s));

  const shares = (n) => {
    if (n < 1) return { hit: true, sample: null, sourceIndex: null };
    for (let i = 0; i + n <= outWords.length; i += 1) {
      const phrase = outWords.slice(i, i + n).join(' ');
      for (let s = 0; s < srcWords.length; s += 1) {
        const w = srcWords[s];
        if (w.length < n) continue;
        // Slide a window over the source; stop at the first match.
        for (let j = 0; j + n <= w.length; j += 1) {
          let same = true;
          for (let k = 0; k < n; k += 1) {
            if (w[j + k] !== outWords[i + k]) { same = false; break; }
          }
          if (same) return { hit: true, sample: phrase, sourceIndex: s };
        }
      }
    }
    return { hit: false, sample: null, sourceIndex: null };
  };

  const cap = Math.min(maxProbe, outWords.length);
  let best = { run: 0, sample: null, sourceIndex: null };
  let lo = 1;
  let hi = cap;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const r = shares(mid);
    if (r.hit) { best = { run: mid, sample: r.sample, sourceIndex: r.sourceIndex }; lo = mid + 1; } else { hi = mid - 1; }
  }
  return best;
}

/**
 * Check one derived artifact against its sources.
 * Returns `{ ok, worst, sample, sourceIndex, limit }` — `ok: false` means the
 * artifact must NOT be published.
 */
export function checkArtifact(outputText, sources, { maxRun = MAX_SHARED_RUN } = {}) {
  const worst = longestSharedRun(outputText, sources, { maxProbe: maxRun + 8 });
  return {
    ok: worst.run <= maxRun,
    worst: worst.run,
    sample: worst.sample,
    sourceIndex: worst.sourceIndex,
    limit: maxRun,
  };
}

/**
 * Check a whole generation. `files` is `[{name, text}]`; `sources` is the raw
 * transcript text of the documents it was derived from.
 *
 * Returns `{ ok, checked, failures }`. Every failure names the file and the
 * offending word window, so a quarantine is diagnosable rather than mysterious.
 */
export function checkGeneration(files, sources, { maxRun = MAX_SHARED_RUN } = {}) {
  const failures = [];
  for (const file of files) {
    const res = checkArtifact(file.text, sources, { maxRun });
    if (!res.ok) {
      failures.push({
        name: file.name,
        run: res.worst,
        limit: res.limit,
        sample: res.sample,
      });
    }
  }
  return { ok: failures.length === 0, checked: files.length, failures };
}

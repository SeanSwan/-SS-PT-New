/**
 * clientNameBoundaryDetector.mjs
 * ===============================
 * Detects whether a merged transcript appears to span multiple clients
 * (Sean's PLAUD workflow: each merge group should be one client per
 * session; the next client's name spoken is the boundary).
 *
 * Phase 3 Slice 3.7 (2026-05-04). Plan: PHASE-3-PLAUD-MERGE-INGESTION-PLAN-v3-2026-05-04.md §5.
 *
 * Codex Round 1 MEDIUM finding: Levenshtein fuzzy match disabled for
 * names <5 chars (avoid false positives on common short words like
 * "Mike"/"like"). Common-word stopword list also rejected.
 *
 * Codex Round 2 HIGH #7 finding: confidence is `medium` (one or more
 * detected) at most. The original `high` claim depended on inferred
 * segment boundaries that don't survive ffmpeg concat — dropped.
 *
 * Public API:
 *   detectBoundary({ transcript, roster })
 *     -> { detectedNames, confidence: 'low'|'medium', warning: bool }
 *   roster: [{ id, firstName, lastName }]
 *
 * Returns:
 *   warning: true when ≥2 distinct clients matched in transcript
 *   confidence: 'low' if 0-1 detected, 'medium' if 2+
 *   detectedNames: array of { id, firstName, lastName, mentions }
 */

const COMMON_WORDS_STOPLIST = new Set([
  // Words that are common English and could collide with short names
  'and', 'are', 'all', 'any', 'ana', 'ann', 'ben', 'bob', 'big',
  'can', 'cat', 'dad', 'day', 'did', 'eat', 'end', 'eve', 'far',
  'fit', 'for', 'get', 'got', 'had', 'has', 'his', 'her', 'him',
  'how', 'its', 'kid', 'lap', 'leg', 'let', 'lie', 'low', 'man',
  'may', 'mom', 'new', 'not', 'now', 'odd', 'off', 'oil', 'one',
  'our', 'out', 'put', 'red', 'ron', 'run', 'sat', 'say', 'see',
  'set', 'she', 'sit', 'son', 'sun', 'ten', 'the', 'too', 'top',
  'try', 'two', 'use', 'van', 'was', 'who', 'why', 'win', 'won',
  'yes', 'yet', 'you',
  'like', 'bike', 'hike', 'mike', 'nice', 'rice',
]);

const MIN_FUZZY_LEN = 5;

/**
 * Levenshtein distance with early exit when distance exceeds maxAllowed.
 */
function levenshteinDistance(a, b, maxAllowed = Infinity) {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > maxAllowed) return maxAllowed + 1;
  const al = a.length;
  const bl = b.length;
  if (al === 0) return bl;
  if (bl === 0) return al;
  let prev = new Array(bl + 1);
  let curr = new Array(bl + 1);
  for (let j = 0; j <= bl; j += 1) prev[j] = j;
  for (let i = 1; i <= al; i += 1) {
    curr[0] = i;
    let rowMin = i;
    for (let j = 1; j <= bl; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        curr[j - 1] + 1,
        prev[j] + 1,
        prev[j - 1] + cost,
      );
      if (curr[j] < rowMin) rowMin = curr[j];
    }
    if (rowMin > maxAllowed) return maxAllowed + 1;
    [prev, curr] = [curr, prev];
  }
  return prev[bl];
}

function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9'\- ]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function nameMatchesToken(name, token) {
  const n = name.toLowerCase();
  if (n === token) return true;
  // Fuzzy match only for names >= MIN_FUZZY_LEN chars
  if (n.length < MIN_FUZZY_LEN || token.length < MIN_FUZZY_LEN) return false;
  return levenshteinDistance(n, token, 1) <= 1;
}

/**
 * Scan transcript tokens against roster. Returns array of detected
 * clients with mention counts.
 */
function detectMentions(transcript, roster) {
  const tokens = tokenize(transcript);
  const detected = new Map();

  for (const client of roster) {
    if (!client || !client.id) continue;
    const firstName = (client.firstName || '').trim();
    const lastName = (client.lastName || '').trim();
    if (!firstName && !lastName) continue;

    let mentions = 0;
    const fullNameTokens = [firstName, lastName].filter(Boolean).map((n) => n.toLowerCase());

    for (let i = 0; i < tokens.length; i += 1) {
      const token = tokens[i];
      if (!token) continue;
      if (COMMON_WORDS_STOPLIST.has(token)) continue;

      // Check sequential full-name match: "sarah johnson"
      if (fullNameTokens.length === 2 && i + 1 < tokens.length) {
        if (nameMatchesToken(fullNameTokens[0], token) && nameMatchesToken(fullNameTokens[1], tokens[i + 1])) {
          mentions += 2;
          i += 1;
          continue;
        }
      }
      // First-name match
      if (firstName && nameMatchesToken(firstName, token)) {
        mentions += 1;
      } else if (lastName && nameMatchesToken(lastName, token)) {
        mentions += 1;
      }
    }

    if (mentions > 0) {
      detected.set(client.id, {
        id: client.id,
        firstName,
        lastName,
        mentions,
      });
    }
  }

  return Array.from(detected.values());
}

export function detectBoundary({ transcript, roster }) {
  if (!transcript || !Array.isArray(roster) || roster.length === 0) {
    return { detectedNames: [], confidence: 'low', warning: false };
  }
  const detected = detectMentions(transcript, roster);
  const distinctCount = detected.length;

  // Codex Round 2 HIGH #7: no segment-aware confidence (segment markers
  // don't survive ffmpeg concat). Confidence simplified to low/medium.
  let confidence = 'low';
  let warning = false;
  if (distinctCount >= 2) {
    confidence = 'medium';
    warning = true;
  }

  return {
    detectedNames: detected.map((d) => ({
      id: d.id,
      firstName: d.firstName,
      lastName: d.lastName,
      mentions: d.mentions,
    })),
    confidence,
    warning,
  };
}

export const _internal = {
  COMMON_WORDS_STOPLIST,
  MIN_FUZZY_LEN,
  levenshteinDistance,
  tokenize,
  nameMatchesToken,
  detectMentions,
};

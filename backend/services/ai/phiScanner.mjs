/**
 * PHI Scanner — Protected Health Information Detection
 * =====================================================
 * Scans user messages for PHI (names, conditions, medications, SSNs, etc.)
 * before they're sent to cloud AI models. Runs locally, no network calls.
 *
 * Pipeline position: InputSanitizer → **PhiScanner** → IntentClassifier → ...
 *
 * V3: Includes regex patterns + basic fuzzy matching for misspellings.
 */
import logger from '../../utils/logger.mjs';

// ── Medical Patterns (Regex) ────────────────────────────────────────────────

const MEDICAL_PATTERNS = [
  // Injury descriptions
  /\b(torn|ruptured|fractured|sprained|dislocated|herniated|bulging)\s+(ACL|MCL|PCL|LCL|rotator\s*cuff|meniscus|labrum|hamstring|achilles|disc|vertebra)\b/i,
  // Medication references
  /\b(taking|prescribed|on|using|stopped|allergic\s+to)\s+(Oxycodone|Vicodin|Percocet|Tramadol|Ibuprofen|Naproxen|Cortisone|Metformin|Lisinopril|Atorvastatin|Amlodipine|Omeprazole|Losartan|Gabapentin|Hydrochlorothiazide|Sertraline|Prednisone|Insulin)\b/i,
  // Diagnosis references
  /\b(diagnosed\s+with|suffering\s+from|has|history\s+of|managing|treated\s+for)\s+(diabetes|hypertension|heart\s+disease|asthma|arthritis|COPD|fibromyalgia|lupus|epilepsy|cancer|HIV|hepatitis|Crohn'?s|colitis|multiple\s+sclerosis|Parkinson'?s)\b/i,
  // Surgery references
  /\b(surgery|operation|procedure|replacement|reconstruction|arthroscopy)\s+(on|for|to|of)\b/i,
  // SSN pattern
  /\b\d{3}-\d{2}-\d{4}\b/,
  // Insurance ID pattern
  /\b[A-Z]{2,3}\d{7,12}\b/,
  // Email pattern (PII)
  /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/,
  // Phone pattern (PII)
  /\b(\+1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/,
  // Date of birth pattern
  /\b(DOB|date\s+of\s+birth|born\s+on|birthday)\s*:?\s*\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/i,
];

// ── Fuzzy Matching Terms ────────────────────────────────────────────────────
// Common medical terms that users might misspell in voice dictation

const PHI_TERMS = [
  'ACL', 'MCL', 'PCL', 'rotator cuff', 'meniscus', 'labrum', 'herniated',
  'Oxycodone', 'Vicodin', 'Percocet', 'Tramadol', 'Metformin', 'Insulin',
  'diabetes', 'hypertension', 'arthritis', 'fibromyalgia', 'lupus',
  'epilepsy', 'Parkinson', 'multiple sclerosis', 'surgery', 'reconstruction',
];

/**
 * Simple Levenshtein distance for fuzzy matching.
 * Avoids pulling in fuse.js for this single use case.
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
function levenshtein(a, b) {
  const la = a.length, lb = b.length;
  if (la === 0) return lb;
  if (lb === 0) return la;

  const matrix = Array.from({ length: la + 1 }, (_, i) =>
    Array.from({ length: lb + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );

  for (let i = 1; i <= la; i++) {
    for (let j = 1; j <= lb; j++) {
      const cost = a[i - 1].toLowerCase() === b[j - 1].toLowerCase() ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[la][lb];
}

/**
 * Fuzzy match a word against known PHI terms.
 * Threshold: Levenshtein distance ≤ 30% of term length (matches fuse.js threshold 0.3).
 * @param {string} word
 * @returns {string|null} Matched term or null
 */
function fuzzyMatchPHI(word) {
  if (word.length < 3) return null; // Skip short words
  const lower = word.toLowerCase();

  for (const term of PHI_TERMS) {
    const termLower = term.toLowerCase();
    // Quick exact check
    if (lower === termLower) return term;
    // Only compare similar-length words
    if (Math.abs(word.length - term.length) > 3) continue;
    const dist = levenshtein(lower, termLower);
    const threshold = Math.ceil(term.length * 0.3);
    if (dist <= threshold) return term;
  }
  return null;
}

/**
 * Scan text for PHI (Protected Health Information).
 * Returns matches found + whether the text should be flagged.
 *
 * @param {string} text - User's raw message text
 * @returns {{ hasPHI: boolean, matches: string[], categories: string[] }}
 */
export function scanForPHI(text) {
  if (!text || typeof text !== 'string') {
    return { hasPHI: false, matches: [], categories: [] };
  }

  const matches = new Set();
  const categories = new Set();

  // 1. Regex pattern matching
  for (const pattern of MEDICAL_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      matches.add(match[0]);
      // Categorize the match
      if (/SSN|insurance|\d{3}-\d{2}-\d{4}/i.test(match[0])) categories.add('identifier');
      else if (/@/.test(match[0])) categories.add('email');
      else if (/\d{3}.*\d{3}.*\d{4}/.test(match[0])) categories.add('phone');
      else if (/DOB|born|birthday/i.test(match[0])) categories.add('dob');
      else if (/surgery|operation|procedure/i.test(match[0])) categories.add('surgery');
      else if (/taking|prescribed|allergic/i.test(match[0])) categories.add('medication');
      else if (/diagnosed|suffering|history/i.test(match[0])) categories.add('diagnosis');
      else categories.add('medical');
    }
  }

  // 2. Fuzzy matching for misspelled medical terms (voice dictation)
  const words = text.split(/\s+/);
  for (const word of words) {
    const cleanWord = word.replace(/[.,!?;:'"()]/g, '');
    const matched = fuzzyMatchPHI(cleanWord);
    if (matched && cleanWord.toLowerCase() !== matched.toLowerCase()) {
      // AI Village consensus: Check against existing matches before adding (dedup)
      const alreadyMatched = [...matches].some(m =>
        m.toLowerCase().includes(cleanWord.toLowerCase()) ||
        m.toLowerCase().includes(matched.toLowerCase())
      );
      if (!alreadyMatched) {
        matches.add(`${cleanWord} (≈${matched})`);
        categories.add('medical_fuzzy');
      }
    }
  }

  const matchArray = [...matches];
  const categoryArray = [...categories];

  if (matchArray.length > 0) {
    logger.info('[PHIScanner] PHI detected in user message', {
      matchCount: matchArray.length,
      categories: categoryArray,
    });
  }

  return {
    hasPHI: matchArray.length > 0,
    matches: matchArray,
    categories: categoryArray,
  };
}

/**
 * Strip detected PHI from text, replacing with safe placeholders.
 * Used when PHI is found but the message should still be processed.
 *
 * @param {string} text
 * @param {string[]} matches - PHI matches to strip
 * @returns {string}
 */
export function stripPHI(text, matches) {
  let cleaned = text;
  for (const match of matches) {
    // For fuzzy matches like "rotadr cuff (≈rotator cuff)", use original word
    const originalWord = match.includes('(≈') ? match.split(' (≈')[0] : match;
    // Use negative lookahead/lookbehind to prevent mid-word matches
    // while allowing punctuation boundaries (e.g., "lab:" but not "collaborate")
    const pattern = new RegExp(`(?<!\\w)${escapeRegex(originalWord)}(?!\\w)`, 'gi');
    cleaned = cleaned.replace(pattern, '[REDACTED]');
  }
  return cleaned;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

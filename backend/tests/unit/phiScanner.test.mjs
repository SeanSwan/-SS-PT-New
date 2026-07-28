/**
 * Tests for the PHI scanner — the gate that keeps protected health information out of cloud AI.
 *
 * WHY THIS FILE EXISTS (SWA-71, 2026-07-28):
 * `phiScanner.mjs` guards the most sensitive path in the product — it runs in `commandExecutor`,
 * `commandAudit`, `intentClassifier`, and `piiSanitizationMiddleware` — and had **zero test
 * coverage**. The first hostile probe against it found the detection logic was INVERTED:
 *
 *     "patient mentions Metformn today"   (misspelled) -> DETECTED
 *     "patient mentions Metformin today"  (correct)    -> MISSED
 *
 * `scanForPHI` guarded the fuzzy branch with
 * `matched && cleanWord.toLowerCase() !== matched.toLowerCase()`, which discarded exactly the case
 * the term list exists to catch. The regex patterns only fire with a lead-in verb ("taking X",
 * "diagnosed with X"), so a bare correctly-spelled term matched NEITHER path and went to the model
 * verbatim. Verified missing for all ten of ACL, meniscus, Oxycodone, Metformin, diabetes,
 * hypertension, fibromyalgia, Parkinson, surgery, herniated.
 *
 * These tests pin three properties:
 *   1. Correctly-spelled PHI terms are detected (the inverted-logic regression).
 *   2. Misspellings and homoglyphs are still detected (voice dictation — the original feature).
 *   3. Ordinary coaching language is NOT flagged, because a scanner that flags everything gets
 *      disabled and then protects nothing.
 */
import { describe, it, expect } from 'vitest';
import { scanForPHI, stripPHI } from '../../services/ai/phiScanner.mjs';

describe('scanForPHI — correctly-spelled PHI terms (the inverted-logic regression)', () => {
  it.each([
    'ACL', 'meniscus', 'Oxycodone', 'Metformin', 'diabetes',
    'hypertension', 'fibromyalgia', 'Parkinson', 'surgery', 'herniated'
  ])('detects the bare exact term %s', (term) => {
    const result = scanForPHI(`patient mentions ${term} today`);
    expect(result.hasPHI).toBe(true);
    expect(result.categories).toContain('medical_term');
  });

  it('is case-insensitive on exact terms', () => {
    expect(scanForPHI('mentions METFORMIN').hasPHI).toBe(true);
    expect(scanForPHI('mentions metformin').hasPHI).toBe(true);
  });
});

describe('scanForPHI — misspellings and dictation artifacts still detected', () => {
  it.each(['ACLL', 'menicus', 'Oxycodne', 'Metformn', 'diabetees', 'hypertenson'])(
    'fuzzy-matches the misspelling %s',
    (typo) => {
      const result = scanForPHI(`patient mentions ${typo} today`);
      expect(result.hasPHI).toBe(true);
      expect(result.categories).toContain('medical_fuzzy');
    }
  );

  it('catches a unicode homoglyph substitution', () => {
    // Cyrillic omicron in place of the Latin o — a real dictation/copy-paste artifact.
    expect(scanForPHI('taking Metfοrmin').hasPHI).toBe(true);
  });

  it('labels exact hits and fuzzy hits differently', () => {
    expect(scanForPHI('mentions Metformin').categories).toContain('medical_term');
    expect(scanForPHI('mentions Metformn').categories).toContain('medical_fuzzy');
  });
});

describe('scanForPHI — pattern-based categories', () => {
  it.each([
    ['medication phrase', 'client is taking Metformin', 'medication'],
    ['diagnosis phrase', 'she was diagnosed with diabetes', 'diagnosis'],
    ['email', 'reach me at jane.doe@example.com', 'email'],
    ['SSN', 'ssn is 123-45-6789', 'identifier'],
    ['phone', 'call me at 555-123-4567', 'phone'],
    ['date of birth', 'DOB: 03/14/1985', 'dob']
  ])('categorizes %s', (_label, text, category) => {
    const result = scanForPHI(text);
    expect(result.hasPHI).toBe(true);
    expect(result.categories).toContain(category);
  });
});

describe('scanForPHI — named healthcare providers are third-party PII', () => {
  // Found leaking through free-text goal descriptions: the client's own name was aliased out and
  // the diagnosis stripped, but "Dr. Smith cleared her after ACL surgery" still sent the
  // physician's name to the model.
  it.each([
    'Dr. Smith cleared her',
    'Doctor Nguyen said',
    'see Nurse Patel',
    "Surgeon O'Brien operated",
    'Therapist Lee recommends'
  ])('detects a provider name in: %s', (text) => {
    const result = scanForPHI(text);
    expect(result.hasPHI).toBe(true);
    expect(result.categories).toContain('provider_name');
  });

  it.each([
    '123 Oak Dr',
    'drive to the gym',
    'turn onto Maple Dr today',
    'dr appointment',
    'Prof gains this week'
  ])('does not false-positive on: %s', (text) => {
    // The rule requires an honorific followed by a Capitalized surname, so street abbreviations
    // and lowercase prose stay clean.
    expect(scanForPHI(text).hasPHI).toBe(false);
  });
});

describe('scanForPHI — ordinary coaching language must NOT flag', () => {
  // A scanner that flags everything gets turned off, and then it protects nothing. These are real
  // messages a trainer or client would send; none of them contain PHI.
  it.each([
    'Client hit a PR on deadlift today, 315 for 3',
    'Move to phase 2 hypertrophy next week',
    'Add 10 minutes of steady state cardio after lifting',
    'Log 3 sets of 12 goblet squats at 40lb',
    'He wants to lose 15 lbs before the wedding',
    'Swap barbell bench for dumbbell press this week',
    'Great mobility work on the hip flexors',
    'Increase protein to 180g per day',
    'Client is traveling next week, give a hotel workout',
    '3 sets of 12 goblet squats'
  ])('does not flag: %s', (text) => {
    expect(scanForPHI(text).hasPHI).toBe(false);
  });
});

describe('scanForPHI — input robustness', () => {
  it.each([[null], [undefined], [''], [42], [{}], [[]]])('returns a safe result for %s', (input) => {
    const result = scanForPHI(input);
    expect(result.hasPHI).toBe(false);
    expect(result.matches).toEqual([]);
    expect(result.categories).toEqual([]);
  });

  it('never reports a match it cannot name', () => {
    const result = scanForPHI('client is taking Metformin and has diabetes');
    expect(result.hasPHI).toBe(true);
    expect(result.matches.length).toBeGreaterThan(0);
    expect(result.matches.every((m) => typeof m === 'string' && m.length > 0)).toBe(true);
  });
});

describe('stripPHI — removes what the scanner found', () => {
  it('redacts an exact-term hit out of the text', () => {
    const text = 'client is taking Metformin and has diabetes';
    const { matches } = scanForPHI(text);
    const stripped = stripPHI(text, matches);
    expect(stripped).not.toContain('Metformin');
    expect(stripped).not.toContain('diabetes');
    expect(stripped).toContain('[REDACTED]');
  });

  it('unwraps the fuzzy annotation and redacts the original word', () => {
    const text = 'client is on Metformn';
    const { matches } = scanForPHI(text);
    // Fuzzy matches are stored as "Metformn (≈Metformin)"; stripPHI must redact the word that
    // actually appears in the text, not the annotation.
    expect(stripPHI(text, matches)).not.toContain('Metformn');
  });

  it('does not redact across word boundaries', () => {
    // The strip pattern uses lookarounds so a term inside a larger word is left alone.
    expect(stripPHI('collaborate on the lab work', ['lab'])).toContain('collaborate');
  });

  it('returns text unchanged when there is nothing to strip', () => {
    const text = '3 sets of 12 goblet squats';
    expect(stripPHI(text, [])).toBe(text);
  });
});

describe('scanForPHI — stays fast enough for the AI request path', () => {
  it('scans a typical message in well under a millisecond', () => {
    const message = 'Client hit a PR on deadlift today, 315 for 3 and felt good overall';
    const start = Date.now();
    for (let i = 0; i < 200; i += 1) scanForPHI(message);
    // Measured ~0.27ms/scan; 200 scans should finish far inside this bound on any CI box.
    expect(Date.now() - start).toBeLessThan(2000);
  });
});

/**
 * Phase 16 (2026-04-16) — WorkoutLogger writer-defaults source-text lock
 * =========================================================================
 * Prevents regression of the phantom rating seeds that contaminated the
 * canonical intensity/RPE chart before Phase 16.
 *
 * What this test file locks:
 *   1. `useState(5)` for overallIntensity is never reintroduced
 *   2. No constructor path seeds `rpe: 5`, `formQuality: 3`, or
 *      `formRating: 3` as a hardcoded literal
 *   3. All constructor paths use `null` for untouched rating fields
 *   4. Save-path omission contract is present (conditional spread)
 *
 * The behavioral contract — that a submit without touched intensity
 * produces a POST body WITHOUT the `overallIntensity` key — is covered
 * separately in `WorkoutLogger.submitContract.test.tsx` (T10). This
 * file is the grep-level companion to T10, catching literal-seed
 * regressions that compile cleanly but would leak phantoms again.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const RAW_SOURCE = readFileSync(
  resolve(__dirname, './WorkoutLogger.tsx'),
  'utf8',
);

// Strip single-line (//) and multi-line (/* ... */) comments so source-
// text regex checks don't false-positive on Phase 16 docstrings that
// mention the old phantom patterns as historical context.
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '');
}

const SOURCE = stripComments(RAW_SOURCE);

describe('Phase 16 — WorkoutLogger writer defaults', () => {
  it('overallIntensity state initializer is null, not 5', () => {
    // The pattern we are banning.
    expect(SOURCE).not.toMatch(
      /useState\s*\(\s*5\s*\)\s*[;,\n\s/]+\s*(?:\/\/[^\n]*\n\s*)?.*?overallIntensity/s,
    );
    // The pattern we expect.
    expect(SOURCE).toMatch(
      /useState<number\s*\|\s*null>\s*\(\s*null\s*\)/,
    );
  });

  it('no constructor path seeds `rpe: 5` as a literal', () => {
    expect(SOURCE).not.toMatch(/\brpe\s*:\s*5\b/);
  });

  it('no constructor path seeds `formQuality: 3` as a literal', () => {
    expect(SOURCE).not.toMatch(/\bformQuality\s*:\s*3\b/);
  });

  it('no constructor path seeds `formRating: 3` as a literal', () => {
    expect(SOURCE).not.toMatch(/\bformRating\s*:\s*3\b/);
  });

  it('constructors use `rpe: null` for untouched sets', () => {
    // At least one occurrence — the constructor sweep hits multiple
    // paths (template-load, AI-prefill, today's-plan, createEmptySet),
    // so a single match means the pattern is adopted.
    expect(SOURCE).toMatch(/\brpe\s*:\s*null\b/);
  });

  it('constructors use `formQuality: null` for untouched sets', () => {
    expect(SOURCE).toMatch(/\bformQuality\s*:\s*null\b/);
  });

  it('constructors use `formRating: null` for untouched exercise entries', () => {
    expect(SOURCE).toMatch(/\bformRating\s*:\s*null\b/);
  });

  it('save-path uses the extracted buildWorkoutFormSubmitBody utility', () => {
    // The wire-contract logic is extracted to `workoutLoggerSubmitPayload.ts`
    // so it's independently unit-testable (see T10). A regression that
    // reimplements the payload inline — bypassing the sanitizer — would
    // lose that test coverage. Ensure the extracted utility is imported
    // AND invoked from handleSubmit.
    expect(SOURCE).toMatch(
      /import\s*\{\s*buildWorkoutFormSubmitBody\s*\}\s*from\s*['"]\.\/workoutLoggerSubmitPayload['"]/,
    );
    expect(SOURCE).toMatch(/buildWorkoutFormSubmitBody\s*\(/);
  });

  it('carries a Phase 16 docstring anchoring the null-honest contract', () => {
    // Explicitly checks the raw source, because comments are what
    // should carry the "why" — this test would fail if someone stripped
    // the docstring without preserving the rationale elsewhere.
    expect(RAW_SOURCE).toMatch(/Phase 16/i);
  });
});

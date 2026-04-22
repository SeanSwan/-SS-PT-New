/**
 * Regression test for scripts/consult-gemini.mjs parseArgs.
 *
 * Guards against the 2026-04-21 argv parser bug where the four mode
 * flags (--plan, --design, --review, --ask) greedily consumed the
 * next arg as inline input regardless of value — so
 * `node scripts/consult-gemini.mjs --review --file X` bound
 * opts.input = '--file' and never read the file, causing Gemini to
 * review the literal string "--file" and hallucinate.
 *
 * Handoff: docs/ai-workflow/AI-HANDOFF/SCRIPT-BUG-CONSULT-GEMINI-ARGV-2026-04-21.md
 *
 * Run:
 *   node --test scripts/__tests__/consult-gemini.parseArgs.test.mjs
 */

// Skip preflight — we are not making API calls, only unit-testing argv
// parsing. Must be set BEFORE the dynamic import below so preflight sees
// it. Static imports above this line don't trigger preflight.
process.env.SKIP_AI_PREFLIGHT = '1';

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { readFileSync } from 'node:fs';

// Dynamic import so SKIP_AI_PREFLIGHT is set first.
const { parseArgs } = await import('../consult-gemini.mjs');

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..');
const FIXTURE_REL_PATH = 'scripts/__tests__/fixtures/parseArgs-fixture.txt';
const FIXTURE_PATH = resolve(REPO_ROOT, FIXTURE_REL_PATH);
const FIXTURE_CONTENT = readFileSync(FIXTURE_PATH, 'utf8');

describe('consult-gemini.mjs parseArgs — argv bug regression (2026-04-21)', () => {
  describe('mode flag followed by --file (pre-fix broken order)', () => {
    it('--review --file X reads file contents, not literal "--file"', () => {
      const opts = parseArgs(['--review', '--file', FIXTURE_REL_PATH]);
      assert.equal(opts.mode, 'review');
      assert.equal(opts.file, FIXTURE_REL_PATH);
      assert.equal(opts.input, FIXTURE_CONTENT);
      assert.notEqual(opts.input, '--file');
      assert.equal(opts.reviewPath, FIXTURE_REL_PATH);
    });

    it('--plan --file X reads file contents, not literal "--file"', () => {
      const opts = parseArgs(['--plan', '--file', FIXTURE_REL_PATH]);
      assert.equal(opts.mode, 'plan');
      assert.equal(opts.file, FIXTURE_REL_PATH);
      assert.equal(opts.input, FIXTURE_CONTENT);
      assert.notEqual(opts.input, '--file');
    });

    it('--design --file X reads file contents, not literal "--file"', () => {
      const opts = parseArgs(['--design', '--file', FIXTURE_REL_PATH]);
      assert.equal(opts.mode, 'design');
      assert.equal(opts.file, FIXTURE_REL_PATH);
      assert.equal(opts.input, FIXTURE_CONTENT);
      assert.notEqual(opts.input, '--file');
    });

    it('--ask --file X reads file contents, not literal "--file"', () => {
      const opts = parseArgs(['--ask', '--file', FIXTURE_REL_PATH]);
      assert.equal(opts.mode, 'ask');
      assert.equal(opts.file, FIXTURE_REL_PATH);
      assert.equal(opts.input, FIXTURE_CONTENT);
      assert.notEqual(opts.input, '--file');
    });
  });

  describe('pre-existing working invocations (preservation)', () => {
    it('--review "inline text" still binds inline input', () => {
      const opts = parseArgs(['--review', 'inline text for review']);
      assert.equal(opts.mode, 'review');
      assert.equal(opts.input, 'inline text for review');
      assert.equal(opts.file, undefined);
    });

    it('--design "component description" still binds inline input', () => {
      const opts = parseArgs(['--design', 'hero section with parallax']);
      assert.equal(opts.mode, 'design');
      assert.equal(opts.input, 'hero section with parallax');
      assert.equal(opts.file, undefined);
    });

    it('--file X --review (historical workaround order) still works', () => {
      const opts = parseArgs(['--file', FIXTURE_REL_PATH, '--review']);
      assert.equal(opts.mode, 'review');
      assert.equal(opts.file, FIXTURE_REL_PATH);
      assert.equal(opts.input, FIXTURE_CONTENT);
      assert.equal(opts.reviewPath, FIXTURE_REL_PATH);
    });
  });

  describe('--research grounding flag interactions', () => {
    it('--review --research --file X sets all three correctly', () => {
      const opts = parseArgs(['--review', '--research', '--file', FIXTURE_REL_PATH]);
      assert.equal(opts.mode, 'review');
      assert.equal(opts.useGrounding, true);
      assert.equal(opts.file, FIXTURE_REL_PATH);
      assert.equal(opts.input, FIXTURE_CONTENT);
    });

    it('--plan --research "text" still binds inline input after research', () => {
      const opts = parseArgs(['--plan', '--research', 'plan text here']);
      assert.equal(opts.mode, 'plan');
      assert.equal(opts.useGrounding, true);
      // After the guard, --plan sees next arg is '--research' and does NOT
      // consume it. --research sets useGrounding. Then the 'plan text here'
      // falls through to the `else if (!opts.input)` branch and becomes input.
      assert.equal(opts.input, 'plan text here');
    });
  });

  describe('no-input edge case (fail-loud path in main())', () => {
    it('--review with no input leaves opts.input empty so main() guard fires', () => {
      const opts = parseArgs(['--review']);
      assert.equal(opts.mode, 'review');
      assert.equal(opts.input, '');
      assert.equal(opts.file, undefined);
    });

    it('--ask with no input leaves opts.input empty so main() guard fires', () => {
      const opts = parseArgs(['--ask']);
      assert.equal(opts.mode, 'ask');
      assert.equal(opts.input, '');
      assert.equal(opts.file, undefined);
    });
  });

  describe('empty argv returns safe defaults', () => {
    it('parseArgs([]) returns mode=null, input="", useGrounding=false', () => {
      const opts = parseArgs([]);
      assert.equal(opts.mode, null);
      assert.equal(opts.input, '');
      assert.equal(opts.useGrounding, false);
      assert.equal(opts.file, undefined);
    });
  });
});

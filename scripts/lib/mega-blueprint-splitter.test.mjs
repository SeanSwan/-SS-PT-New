/**
 * mega-blueprint-splitter.test.mjs — the splitter half of the Mega Blueprint contract.
 * ==================================================================================
 * Split out of `mega-blueprint-mandate.test.mjs` (round-7 finding, 2026-09-19) when that
 * file reached 347 lines against Rule 4's 300-line cap. The seam is real rather than
 * cosmetic: the mandate tests exercise a pure function, these exercise a CLI through a
 * subprocess. Only 2 of 34 test files in this repo exceed the cap and both were files this
 * workstream had been editing — a rule nobody enforces gets broken by whoever is editing.
 *
 * The CONTRACT test lives here because it is the one that ties the two halves together:
 * it asserts the splitter imports the mandate's document list, so prompt and splitter
 * cannot drift apart.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FORGE_DOCS, MEGA_BLUEPRINT_REQUIRED_DOCS } from './mega-blueprint-mandate.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SPLITTER = join(ROOT, 'scripts', 'split-astra-blueprint.mjs');

test('CONTRACT: the mandate and the splitter cannot drift apart', () => {
  // The splitter is a CLI (it calls process.exit on import), so ask it rather
  // than importing it: --help must not be the only way to learn its doc list.
  const src = readFileSync(SPLITTER, 'utf8');
  assert.match(src, /MEGA_BLUEPRINT_REQUIRED_DOCS/, 'splitter must import the mandate doc list');
  assert.match(src, /FORGE_DOCS/, 'splitter must import the base doc list');
  assert.equal(
    MEGA_BLUEPRINT_REQUIRED_DOCS.length, FORGE_DOCS.length + 1,
    'Mega Blueprint mode adds exactly one document',
  );
});

// ------------------------------------------------------ splitter integration

function syntheticReply({ docs = MEGA_BLUEPRINT_REQUIRED_DOCS, fenceDocs = false } = {}) {
  const body = docs.map((d) => `### ${d}\n\ncontent for ${d}`).join('\n\n');
  const fenced = fenceDocs
    ? docs.map((d) => `\`\`\`markdown\n### ${d}\n\`\`\``).join('\n\n')
    : '';
  return [
    '# Astra Reply',
    '',
    '## PART A — HOSTILE REVIEW',
    '',
    'A1 findings for the existing blueprints. A2 findings for my own package.',
    '',
    '## PART B — FORGED PACKAGE',
    '',
    fenced,
    body,
    '',
    '## PART C — DECISION-DENSITY SELF-TEST',
    '',
    'Zero silent gaps.',
    '',
  ].join('\n');
}

function runSplitter(replyText, { megaBlueprint = true } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'mb-split-'));
  const inPath = join(dir, 'REPLY.md');
  writeFileSync(inPath, replyText, 'utf8');
  const args = [SPLITTER, '--in', inPath, '--out-dir', join(dir, 'out')];
  if (megaBlueprint) args.push('--mega-blueprint');
  try {
    const out = execFileSync(process.execPath, args, { encoding: 'utf8' });
    return { code: 0, out, dir };
  } catch (error) {
    return { code: error.status ?? 1, out: `${error.stdout || ''}${error.stderr || ''}`, dir };
  }
}

test('splitter ACCEPTS a complete Mega Blueprint reply', () => {
  const result = runSplitter(syntheticReply());
  assert.equal(result.code, 0, result.out);
  assert.match(result.out, /09-tests\.md/);
});

test('splitter REJECTS a Mega Blueprint reply missing 09-tests.md', () => {
  const partial = MEGA_BLUEPRINT_REQUIRED_DOCS.filter((d) => d !== '09-tests.md');
  const result = runSplitter(syntheticReply({ docs: partial }));
  assert.notEqual(result.code, 0, 'a package missing the test plan must not exit 0');
  assert.match(result.out, /missing PART B documents.*09-tests\.md/s);
});

test('splitter IGNORES headings inside fences — a fenced template is not a package', () => {
  const result = runSplitter(syntheticReply({ docs: [], fenceDocs: true }));
  assert.notEqual(result.code, 0, 'fenced headings must not satisfy the contract');
  assert.match(result.out, /missing PART B documents/);
});

test('the base Forge contract still works without --mega-blueprint', () => {
  const result = runSplitter(syntheticReply({ docs: FORGE_DOCS }), { megaBlueprint: false });
  assert.equal(result.code, 0, result.out);
  assert.ok(!existsSync(join(result.dir, 'out', '09-tests.md')), 'no test doc in base mode');
});

test('a reply with NO headings at all is rejected', () => {
  const result = runSplitter('# nothing\n\njust prose, no sections');
  assert.notEqual(result.code, 0);
  assert.match(result.out, /missing top-level sections/);
});

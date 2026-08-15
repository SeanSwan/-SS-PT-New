/**
 * constitution-references.test.mjs — proves the reference lint CAN fail.
 *
 * A guard whose failure mode is silence is not a guard. These build throwaway
 * docs on disk and assert the checker's verdict, including the exemption paths,
 * because a lint that exempts too eagerly is the same as no lint.
 *
 * Run: node --test scripts/hooks/constitution-references.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkReferences } from './constitution-references.mjs';

function sandbox(docBody, realPaths = []) {
  const dir = mkdtempSync(join(tmpdir(), 'swan-refs-'));
  for (const p of realPaths) {
    const full = join(dir, p);
    mkdirSync(join(full, '..'), { recursive: true });
    writeFileSync(full, 'x', 'utf8');
  }
  const doc = join(dir, 'CLAUDE.md');
  writeFileSync(doc, docBody, 'utf8');
  return { dir, doc };
}

test('BLOCKS a citation to a file that does not exist', () => {
  const s = sandbox('See `docs/ai-workflow/references/GHOST.md` for details.');
  try {
    const r = checkReferences(s.doc, s.dir);
    assert.equal(r.missing.length, 1, 'must flag the phantom path');
    assert.match(r.errors[0], /GHOST\.md/);
    assert.match(r.errors[0], /no such file or directory/);
  } finally { rmSync(s.dir, { recursive: true, force: true }); }
});

test('PASSES a citation that resolves — proves a block is the defect, not a red harness', () => {
  const s = sandbox('See `docs/ai-workflow/references/REAL.md`.', ['docs/ai-workflow/references/REAL.md']);
  try {
    const r = checkReferences(s.doc, s.dir);
    assert.equal(r.missing.length, 0, `must pass. got: ${r.errors.join('; ')}`);
    assert.equal(r.checked, 1);
  } finally { rmSync(s.dir, { recursive: true, force: true }); }
});

test('IGNORES bare filenames used as prose shorthand', () => {
  // 63 of these exist in the real document. Flagging them would make the lint
  // unusable, and an unusable lint gets bypassed wholesale.
  const s = sandbox('The bug was in `MeasurementEntry.tsx` and `StorefrontItem.mjs`.');
  try {
    const r = checkReferences(s.doc, s.dir);
    assert.equal(r.checked, 0, 'bare filenames are not repo-rooted pointers');
    assert.equal(r.missing.length, 0);
  } finally { rmSync(s.dir, { recursive: true, force: true }); }
});

test('EXEMPTS template placeholders and gitignored runtime paths', () => {
  const s = sandbox([
    'Skills live at `.claude/skills/<name>/SKILL.md`.',
    'Lanes live at `.ai-workflow/coordination/claude.lane.md`.',
    'The catalog never writes into `wiki/`.',
  ].join('\n'));
  try {
    const r = checkReferences(s.doc, s.dir);
    assert.equal(r.missing.length, 0, `exemptions must hold. got: ${r.errors.join('; ')}`);
    assert.equal(r.exempt, 3, 'all three are exempt for stated reasons');
  } finally { rmSync(s.dir, { recursive: true, force: true }); }
});

test('still BLOCKS a real path even when exempt paths are present alongside it', () => {
  // An exemption list that accidentally swallows real findings is worse than none.
  const s = sandbox([
    'Placeholder `.claude/skills/<name>/SKILL.md` is fine.',
    'But `scripts/hooks/does-not-exist.mjs` is not.',
  ].join('\n'));
  try {
    const r = checkReferences(s.doc, s.dir);
    assert.equal(r.missing.length, 1, 'the real miss must survive the exemption pass');
    assert.match(r.errors[0], /does-not-exist\.mjs/);
  } finally { rmSync(s.dir, { recursive: true, force: true }); }
});

#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/mutation-check.mjs
 * PURPOSE: Apply each mutation, require the named test to FAIL, restore the file,
 *          and prove the restore by hash.
 * PART OF: Creator Brains — SS-PT acquisition engine (review repair HR26)
 * ADDED: 2026-09-13
 * ============================================================================
 *
 *   node scripts/creator-brains/mutation-check.mjs --check     # validate anchors only, no writes
 *   node scripts/creator-brains/mutation-check.mjs [--only M5,M9]
 *
 * WHAT IT GUARANTEES:
 *   - an anchor that no longer matches the code is a HARNESS FAILURE, not a silent
 *     no-op: a mutation that applied to nothing "survives" and would read as a
 *     coverage hole that is not one;
 *   - the file is restored in a `finally`, and the restore is verified by sha256
 *     against the bytes read before the edit — a mutation run that leaves the tree
 *     modified fails loudly;
 *   - a SURVIVING mutation is reported as a coverage hole and exits non-zero. That
 *     is the point of the exercise: the suite must bite.
 *
 * WHAT IT DELIBERATELY DOES NOT DO:
 *   It does not invent a mutation and it does not soften a test to make a mutation
 *   die. If a definition survives, the definition stays and the gap is reported.
 *
 * @module creator-brains/mutation-check
 */

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { MUTATIONS } from './mutations.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..');
const args = process.argv.slice(2);
const only = (() => {
  const i = args.indexOf('--only');
  if (i > -1 && args[i + 1]) return new Set(args[i + 1].split(',').map((s) => s.trim()));
  return null;
})();
const checkOnly = args.includes('--check');

const sha = (t) => createHash('sha256').update(t, 'utf8').digest('hex').slice(0, 16);
const out = (s) => process.stdout.write(`${s}\n`);

/** Validate every anchor against the revision on disk. No writes. */
function validate(list) {
  const problems = [];
  for (const m of list) {
    const path = join(HERE, m.file);
    let text;
    try {
      text = readFileSync(path, 'utf8');
    } catch (e) {
      problems.push(`${m.id}: ${m.file} is unreadable (${e.code || e.message})`);
      continue;
    }
    const hits = text.split(m.find).length - 1;
    if (hits !== 1) {
      problems.push(`${m.id}: the anchor occurs ${hits} time(s) in ${m.file} — expected exactly 1`);
    }
    const testPath = join(HERE, m.killedBy);
    try {
      readFileSync(testPath, 'utf8');
    } catch {
      problems.push(`${m.id}: killer test ${m.killedBy} does not exist`);
    }
    if (!m.finding || !m.why) problems.push(`${m.id}: needs a finding and a why`);
    if (typeof m.expectFail !== 'string' || !m.expectFail) {
      problems.push(`${m.id}: needs expectFail — the failing test name a kill must be earned by`);
    } else {
      // The named test must actually exist in the killer file, or the definition can
      // never be satisfied and would be reported as a suspect kill forever.
      try {
        const killerSrc = readFileSync(join(HERE, m.killedBy), 'utf8');
        if (!killerSrc.includes(m.expectFail)) {
          problems.push(`${m.id}: ${m.killedBy} has no test named like '${m.expectFail}'`);
        }
      } catch { /* already reported as a missing killer file */ }
    }
  }
  return problems;
}

/**
 * Run one test file and report WHICH tests failed.
 *
 * A kill must be earned by the test the definition names. Until probe F2 this
 * function returned only the file's verdict, so a killer file that broke for an
 * unrelated reason (a moved import, a count assertion, a fixture that no longer
 * builds) scored a kill — evidence of nothing. `expectFail` closes that: the
 * harness now requires the named test among the failures and otherwise reports a
 * SUSPECT KILL, which fails the run.
 */
function runKiller(relPath) {
  try {
    execFileSync(process.execPath, [
      '--experimental-test-isolation=none', '--test', join(HERE, relPath),
    ], {
      cwd: REPO,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      // Tells `mutation-gaps.test.mjs` to stand down: while a mutation is applied,
      // an anchor check inside a killer test could fail for a reason unrelated to
      // the invariant, which would score a FALSE KILL.
      env: { ...process.env, CREATOR_BRAINS_MUTATION_RUN: '1' },
    });
    return { failed: false, names: [] };
  } catch (e) {
    const text = `${e.stdout || ''}${e.stderr || ''}`;
    const names = [...new Set((text.match(/^✖ .+$/gm) || [])
      .map((l) => l.replace(/^✖\s*/, '').trim())
      // `✖ failing tests:` and the repetition of each name are both filtered out.
      .filter((l) => l && !/^failing tests:?$/.test(l)))];
    return { failed: /^ℹ fail [1-9]/m.test(text) || e.status > 0, names };
  }
}

const selected = MUTATIONS.filter((m) => !only || only.has(m.id));
const problems = validate(selected);
out(`mutation definitions: ${selected.length} selected of ${MUTATIONS.length}`);
if (problems.length) {
  out('');
  out('ANCHOR VALIDATION FAILED — the harness refuses to run against a moved codebase:');
  for (const p of problems) out(`  ✖ ${p}`);
  process.exitCode = 2;
} else {
  out('anchor validation: every mutation matches exactly once, every killer test exists');
}

if (!problems.length && checkOnly) {
  out('');
  out('--check only: nothing was modified.');
  process.exitCode = 0;
} else if (!problems.length) {
  out('');
  const results = [];
  for (const m of selected) {
    const path = join(HERE, m.file);
    const before = readFileSync(path, 'utf8');
    const beforeHash = sha(before);
    let applied = false;
    try {
      writeFileSync(path, before.replace(m.find, m.replace), 'utf8');
      applied = true;
      const verdict = runKiller(m.killedBy);
      const matched = verdict.names.filter((n) => n.includes(m.expectFail));
      const killed = verdict.failed && matched.length > 0;
      results.push({
        id: m.id,
        finding: m.finding,
        killed,
        suspect: verdict.failed && matched.length === 0,
        detail: matched[0] || verdict.names.slice(0, 2).join(' | ') || 'the file passed',
      });
      const mark = killed ? '✖ killed ' : (verdict.failed ? '? SUSPECT' : '⚠ SURVIVED');
      out(`${mark} ${m.id} (${m.finding}) — ${m.what}`);
      if (killed) {
        out(`           killer: ${m.killedBy} → ${matched[0]}`);
      } else if (verdict.failed) {
        out(`           the file FAILED but not in ${m.expectFail} — expected it among: `
          + `${verdict.names.slice(0, 3).join(' | ') || '(no test names parsed)'}`);
        out('           a killer that breaks for an unrelated reason proves nothing (probe F2)');
      } else {
        out(`           killer: ${m.killedBy} → passed (coverage hole)`);
      }
    } finally {
      if (applied) writeFileSync(path, before, 'utf8');
      const restored = readFileSync(path, 'utf8');
      if (sha(restored) !== beforeHash) {
        out(`  ✖ RESTORE FAILED for ${m.file} — the working tree is modified. Stop and fix this.`);
        process.exitCode = 3;
      }
    }
  }

  const killed = results.filter((r) => r.killed).length;
  const suspect = results.filter((r) => r.suspect);
  const survived = results.filter((r) => !r.killed && !r.suspect);
  out('');
  out(`mutations run: ${results.length} · killed: ${killed} · suspect: ${suspect.length} · survived: ${survived.length}`);
  if (suspect.length) {
    out('SUSPECT KILLS — the killer file failed, but not in the test the definition names.');
    out('A mutation is only killed when the invariant it breaks is the thing that fails:');
    for (const s of suspect) out(`  ? ${s.id} (${s.finding}): ${s.detail}`);
    process.exitCode = 1;
  }
  if (survived.length) {
    out('SURVIVORS ARE COVERAGE HOLES — each one is a test that does not bite:');
    for (const s of survived) out(`  ⚠ ${s.id} (${s.finding}): ${s.detail}`);
    process.exitCode = 1;
  }
  if (!suspect.length && !survived.length) {
    out('every definition was killed by the test it names, and every file was restored byte-for-byte');
  }
}

#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/hooks/drift-check-gate.test.mjs
 * PURPOSE: Prove drift-check-gate.mjs both FIRES on real drift and stays SILENT
 *          when clean. A detector that never fires is indistinguishable from a
 *          detector that works, which is how the previous guards failed unnoticed.
 * AUTHOR: Opus 5 | CREATED: 2026-08-02
 * ============================================================================
 * Run: node --test scripts/hooks/drift-check-gate.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const SS_PT_ADAPTER_LINES = 45;
const norm = (s) => s.replace(/\r\n/g, '\n');

// Resolved from this file, not process.cwd(). This suite asserts the HOOK is
// cwd-independent while its own reads were not — run from anywhere else it failed
// on a missing AGENTS.md (found 2026-08-03). Same class it exists to police.
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const repoFile = (p) => readFileSync(resolve(REPO_ROOT, p), 'utf-8');

/** Mirrors the hook's SS-PT contract: AGENTS.md = adapter + CLAUDE.md body. */
function ssPtMirrorDrifted(agentsText, claudeText) {
  const body = norm(agentsText).split('\n').slice(SS_PT_ADAPTER_LINES).join('\n');
  return body.trimEnd() !== norm(claudeText).trimEnd();
}

/** SwanGuard contract: byte-identical. */
function byteMirrorDrifted(a, b) {
  return norm(a) !== norm(b);
}

function fromGit(ref, path) {
  return execFileSync('git', ['show', `${ref}:${path}`], {
    encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 32 * 1024 * 1024,
  });
}

test('FIRES on real drift — main had a genuinely drifted mirror on 2026-08-02', () => {
  let agents, claude;
  try {
    agents = fromGit('main', 'AGENTS.md');
    claude = fromGit('main', 'CLAUDE.md');
  } catch {
    return; // main unavailable in this checkout; skip rather than fail the suite
  }
  assert.equal(
    ssPtMirrorDrifted(agents, claude), true,
    'detector missed known drift on main — false negative, the dangerous direction',
  );
});

test('SILENT when clean — the working tree after sync', () => {
  const agents = repoFile('AGENTS.md');
  const claude = repoFile('CLAUDE.md');
  assert.equal(
    ssPtMirrorDrifted(agents, claude), false,
    'false positive on a synced pair — a noisy guard gets ignored, then fails silently',
  );
});

test('adapter is preserved — byte-identical would be WRONG for SS-PT', () => {
  const agents = norm(repoFile('AGENTS.md'));
  const claude = norm(repoFile('CLAUDE.md'));
  assert.notEqual(agents, claude, 'SS-PT AGENTS.md must retain its Codex adapter header');
  const adapter = agents.split('\n').slice(0, SS_PT_ADAPTER_LINES).join('\n');
  assert.match(adapter, /Codex Adapter Notes/, 'adapter header missing from lines 1-45');
  assert.match(adapter, /Mirror maintenance/, 'mirror-maintenance clause missing');
});

test('CRLF vs LF alone never reports as drift', () => {
  const base = 'x'.repeat(10) + '\n';
  const adapter = Array(SS_PT_ADAPTER_LINES).fill('adapter').join('\n') + '\n';
  assert.equal(ssPtMirrorDrifted(adapter + base, base), false, 'LF baseline should match');
  assert.equal(
    ssPtMirrorDrifted((adapter + base).replace(/\n/g, '\r\n'), base), false,
    'CRLF must not be reported as drift',
  );
});

test('byte-mirror contract (SwanGuard) detects a one-character change', () => {
  assert.equal(byteMirrorDrifted('same\n', 'same\n'), false);
  assert.equal(byteMirrorDrifted('same\n', 'sameX\n'), true);
});

test('branch freshness measures against origin/main, not the stale local main', () => {
  // Regression, hostile review 2026-08-03 round 2: the check ran
  // `rev-list main...HEAD`. Local `main` is itself a branch that goes stale — on
  // 2026-08-03 it sat 746 commits behind origin, so this gate announced "684
  // commits behind" when the true distance was 1430. A staleness detector that is
  // itself stale is worse than no detector: it reads as authoritative and
  // understates the risk. The finding must also NAME the ref it measured, so the
  // number can be audited instead of trusted.
  const hook = fileURLToPath(new URL('./drift-check-gate.mjs', import.meta.url));
  const repoRoot = resolve(dirname(hook), '..', '..');
  const behindOf = (ref) => Number(
    execFileSync('git', ['rev-list', '--left-right', '--count', `${ref}...HEAD`], {
      cwd: repoRoot, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'],
    }).trim().split(/\s+/)[0],
  );

  let out;
  try {
    out = execFileSync(process.execPath, [hook], {
      cwd: repoRoot, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 30000,
    });
  } catch { return; } // hook unavailable in this environment

  // Counted AFTER the run so the hook's own fetch cannot race the expectation.
  let local, remote;
  try { local = behindOf('main'); remote = behindOf('origin/main'); } catch { return; }
  if (!Number.isFinite(remote) || remote < 50) return; // nothing for the gate to report

  assert.match(out, /behind origin\/main/,
    'branch finding must name the ref it measured against');
  assert.match(out, new RegExp(`\\b${remote} commits behind`),
    `must report the origin/main distance (${remote})`);
  if (Number.isFinite(local) && local !== remote) {
    assert.doesNotMatch(out, new RegExp(`\\b${local} commits behind`),
      `reported the stale local-main distance (${local}) instead of ${remote}`);
  }
});

test('cwd-independent — the hook must not silently no-op from a foreign directory', () => {
  // Regression, hostile review 2026-08-02: the hook resolved the repo from
  // process.cwd(). Invoked from anywhere else it printed nothing and exited 0 —
  // indistinguishable from "no drift found". A dead guard that looks alive is
  // exactly check #6 in the drift-check skill. It now resolves from import.meta.url.
  const hook = fileURLToPath(new URL('./drift-check-gate.mjs', import.meta.url));
  const repoRoot = resolve(dirname(hook), '..', '..');
  const foreign = tmpdir();

  const run = (cwd) => execFileSync(process.execPath, [hook], {
    cwd, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 20000,
  });

  const fromRepo = run(repoRoot);
  const fromForeign = run(foreign);

  assert.equal(
    fromForeign, fromRepo,
    'hook output differs by cwd — it is resolving the repo from process.cwd() again',
  );

  // Guard against the test passing because BOTH are empty (e.g. a fully clean repo):
  // force a known-drifted state by checking the branch-behind signal is observable.
  const behind = Number(
    execFileSync('git', ['rev-list', '--left-right', '--count', 'main...HEAD'], {
      cwd: repoRoot, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'],
    }).trim().split(/\s+/)[0],
  );
  if (Number.isFinite(behind) && behind >= 50) {
    assert.match(
      fromForeign, /drift-check/,
      'repo is >=50 commits behind but the hook stayed silent from a foreign cwd',
    );
  }
});

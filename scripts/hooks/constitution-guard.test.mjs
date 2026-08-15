/**
 * constitution-guard.test.mjs — proves the guard CAN fail.
 *
 * A guard whose failure mode is silence is not a guard (Hermes inbox report
 * §1f). So this does not unit-test the parser in isolation — it builds a real
 * throwaway git repo, replays the actual 10a3e7fa1 clobber, and asserts the
 * hook exits non-zero. Then it asserts the clean case exits zero, so we know
 * the block is caused by the defect and not by the harness always being red.
 *
 * Run: node --test scripts/hooks/constitution-guard.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const GUARD = resolve(dirname(fileURLToPath(import.meta.url)), 'constitution-guard.mjs');
const MARKER = '--- project-doc mirror from CLAUDE.md ---';

/**
 * A minimal CLAUDE.md carrying `nums` as MANDATORY rules.
 * Bodies are multi-line and carry the reversion signatures check 3 reads:
 * the MANDATORY token and accumulated amendment markers.
 * `bodies` overrides a rule's body so a reversion can be simulated.
 */
function claudeDoc(nums, { renumber = null, bodies = {} } = {}) {
  const NAMES = {
    16: 'AI Village (15-brain) requires Sean\'s permission',
    46: 'Kimi Hostile-Review Gate',
    73: 'ADW Discipline',
    74: 'Proof-Before-Done',
    80: 'Second-Vantage Verification',
    81: 'Test-Delta Disclosure',
  };
  const fullBody = (n) => [
    `${n}. **${NAMES[n]}** — (MANDATORY) Established 2026-07-01. Body text for rule ${n}.`,
    `    AMENDED 2026-08-01: an enforcement paragraph that accumulated after the fact.`,
    `    Further detail that a stale snapshot would not contain, padded so that`,
    `    dropping it registers as a material shrink rather than a copy-edit.`,
  ].join('\n');

  const lines = ['# CLAUDE.md', '', '## MANDATORY Rules', ''];
  for (const n of nums) {
    const num = renumber && renumber[n] ? renumber[n] : n;
    const body = bodies[n] !== undefined ? bodies[n] : fullBody(n);
    lines.push(body.replace(/^\d{1,3}\. /, `${num}. `), '');
  }
  lines.push('## Dual-Pass Fix/Review Discipline', '', 'tail.');
  return lines.join('\n');
}
const agentsDoc = (claude) => `# AGENTS.md\n\nheader owned by Codex.\n\n${MARKER}\n\n${claude}`;

function repo() {
  const dir = mkdtempSync(join(tmpdir(), 'swan-constitution-'));
  const g = (...a) => spawnSync('git', a, { cwd: dir, encoding: 'utf8' });
  g('init', '-q');
  g('config', 'user.email', 't@t.t');
  g('config', 'user.name', 'test');
  g('config', 'commit.gpgsign', 'false');
  return { dir, g };
}
function commitDocs(r, claude) {
  writeFileSync(join(r.dir, 'CLAUDE.md'), claude, 'utf8');
  writeFileSync(join(r.dir, 'AGENTS.md'), agentsDoc(claude), 'utf8');
  r.g('add', 'CLAUDE.md', 'AGENTS.md');
  r.g('commit', '-q', '-m', 'baseline');
}
function stageDocs(r, claude, { agents = null } = {}) {
  writeFileSync(join(r.dir, 'CLAUDE.md'), claude, 'utf8');
  writeFileSync(join(r.dir, 'AGENTS.md'), agents ?? agentsDoc(claude), 'utf8');
  r.g('add', 'CLAUDE.md', 'AGENTS.md');
}
const runGuard = (r, env = {}) =>
  spawnSync(process.execPath, [GUARD], { cwd: r.dir, encoding: 'utf8', env: { ...process.env, ...env } });

const BASE = [16, 46, 73, 74, 80, 81];

test('BLOCKS the 10a3e7fa1 clobber: rules present in HEAD vanish from the staged file', () => {
  const r = repo();
  try {
    commitDocs(r, claudeDoc(BASE));
    stageDocs(r, claudeDoc([16, 74])); // 46, 73, 80, 81 silently reverted
    const out = runGuard(r);
    assert.equal(out.status, 1, 'guard must BLOCK a silent rule deletion');
    assert.match(out.stderr, /COMMIT BLOCKED: constitution integrity/);
    assert.match(out.stderr, /rule 46 .*is GONE/s);
    assert.match(out.stderr, /rule 80 .*is GONE/s);
  } finally { rmSync(r.dir, { recursive: true, force: true }); }
});

test('BLOCKS the 73/74 renumber that collided the two constitutions', () => {
  const r = repo();
  try {
    commitDocs(r, claudeDoc(BASE));
    stageDocs(r, claudeDoc(BASE.filter((n) => n !== 73), { renumber: { 74: 73 } }));
    const out = runGuard(r);
    assert.equal(out.status, 1, 'guard must BLOCK a silent renumber');
    assert.match(out.stderr, /renumbered 74 -> 73/);
  } finally { rmSync(r.dir, { recursive: true, force: true }); }
});

test('BLOCKS mirror drift — Codex and Claude must never read different law', () => {
  const r = repo();
  try {
    commitDocs(r, claudeDoc(BASE));
    // every rule intact, but AGENTS.md body no longer equals CLAUDE.md
    stageDocs(r, claudeDoc(BASE), { agents: agentsDoc(claudeDoc(BASE)) + '\nsneaky divergence\n' });
    const out = runGuard(r);
    assert.equal(out.status, 1, 'guard must BLOCK mirror drift');
    assert.match(out.stderr, /AGENTS\.md body != CLAUDE\.md/);
  } finally { rmSync(r.dir, { recursive: true, force: true }); }
});

test('PASSES an honest edit — proves the block is the defect, not a red harness', () => {
  const r = repo();
  try {
    commitDocs(r, claudeDoc(BASE));
    const edited = claudeDoc(BASE).replace('Body text for rule 16.', 'Body text for rule 16, now corrected.');
    // Assert the fixture actually changed. The first version of this test used
    // the wrong case, so .replace() silently returned the input unchanged, the
    // commit staged nothing, and the guard "passed" by never running — the exact
    // silent-no-op class this whole guard exists to catch, inside its own test.
    assert.notEqual(edited, claudeDoc(BASE), 'fixture must differ or the test proves nothing');
    stageDocs(r, edited);
    const out = runGuard(r);
    assert.equal(out.status, 0, `honest edit must PASS. stderr: ${out.stderr}`);
    assert.match(out.stdout, /PASS/);
  } finally { rmSync(r.dir, { recursive: true, force: true }); }
});

test('PASSES a DELIBERATE removal only when the numbers are named', () => {
  const r = repo();
  try {
    commitDocs(r, claudeDoc(BASE));
    stageDocs(r, claudeDoc(BASE.filter((n) => n !== 46)));
    assert.equal(runGuard(r).status, 1, 'unnamed removal still blocks');
    const ok = runGuard(r, { SWAN_ALLOW_RULE_REMOVAL: '46' });
    assert.equal(ok.status, 0, `named removal must pass. stderr: ${ok.stderr}`);
  } finally { rmSync(r.dir, { recursive: true, force: true }); }
});

test('PASSES a DELIBERATE renumber only when named — an unblockable check gets bypassed wholesale', () => {
  const r = repo();
  try {
    commitDocs(r, claudeDoc(BASE));
    // exactly this repair: ADW(73) removed, Proof-Before-Done moves 74 -> 73
    stageDocs(r, claudeDoc(BASE.filter((n) => n !== 73), { renumber: { 74: 73 } }));
    assert.equal(runGuard(r).status, 1, 'unnamed renumber still blocks');
    const ok = runGuard(r, { SWAN_ALLOW_RULE_REMOVAL: '73,74' });
    assert.equal(ok.status, 0, `named renumber must pass. stderr: ${ok.stderr}`);
  } finally { rmSync(r.dir, { recursive: true, force: true }); }
});

// --- check 3: body reversion. Added after Kimi K3 finding D1 — the original
// guard did not cover its own founding incident, because 10a3e7fa1 damaged
// rule 46 by reverting its BODY, and only a coincidental rename exposed it.
test('BLOCKS a body reversion: same name, same number, older shorter text', () => {
  const r = repo();
  try {
    commitDocs(r, claudeDoc(BASE));
    // exactly a stale-copy clobber of rule 46: name and number identical,
    // body rolled back to a pre-amendment snapshot.
    const stale = '46. **Kimi Hostile-Review Gate** — (MANDATORY) Established 2026-07-01. Body text for rule 46.';
    stageDocs(r, claudeDoc(BASE, { bodies: { 46: stale } }));
    const out = runGuard(r);
    assert.equal(out.status, 1, 'guard must BLOCK a silent body reversion');
    assert.match(out.stderr, /rule 46 .*looks REVERTED/s);
    assert.match(out.stderr, /lost 1 amendment marker/);
  } finally { rmSync(r.dir, { recursive: true, force: true }); }
});

test('BLOCKS a rule quietly downgraded from MANDATORY', () => {
  const r = repo();
  try {
    commitDocs(r, claudeDoc(BASE));
    const softened = claudeDoc(BASE).replace('(MANDATORY) Established 2026-07-01. Body text for rule 80.', '(recommended) Established 2026-07-01. Body text for rule 80.');
    stageDocs(r, softened);
    const out = runGuard(r);
    assert.equal(out.status, 1, 'downgrading MANDATORY must BLOCK');
    assert.match(out.stderr, /dropped the "MANDATORY" token/);
  } finally { rmSync(r.dir, { recursive: true, force: true }); }
});

test('PASSES an honest body expansion — check 3 targets reversion, not change', () => {
  const r = repo();
  try {
    commitDocs(r, claudeDoc(BASE));
    const grown = claudeDoc(BASE).replace(
      'Body text for rule 46.',
      'Body text for rule 46, now with a genuinely added clause that makes it longer.',
    );
    stageDocs(r, grown);
    const out = runGuard(r);
    assert.equal(out.status, 0, `honest expansion must PASS. stderr: ${out.stderr}`);
  } finally { rmSync(r.dir, { recursive: true, force: true }); }
});

// --- D3: fail CLOSED on git trouble, not open.
test('FAILS CLOSED when git cannot be interrogated', () => {
  const dir = mkdtempSync(join(tmpdir(), 'swan-nogit-'));
  try {
    const out = spawnSync(process.execPath, [GUARD], { cwd: dir, encoding: 'utf8' });
    assert.equal(out.status, 1, 'a guard that cannot verify must BLOCK, not wave through');
    assert.match(out.stderr, /fails CLOSED/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

// --- D2: a hatch left set in a shell profile is a standing bypass credential.
test('WARNS loudly that a stale override is still set', () => {
  const r = repo();
  try {
    commitDocs(r, claudeDoc(BASE));
    stageDocs(r, claudeDoc(BASE).replace('Body text for rule 16.', 'Body text for rule 16, corrected.'));
    const out = runGuard(r, { SWAN_ALLOW_RULE_REMOVAL: '46,73' });
    assert.equal(out.status, 0, 'an honest edit still passes');
    assert.match(out.stderr, /stale override left set/);
  } finally { rmSync(r.dir, { recursive: true, force: true }); }
});

// --- Q2: rename is a first-class operation. Forcing a legitimate rename through
// the removal hatch is how a check trains people to bypass it wholesale.
test('BLOCKS an undeclared rename but NAMES the exact command to declare it', () => {
  const r = repo();
  try {
    commitDocs(r, claudeDoc(BASE));
    // rule 46 renamed in place — exactly what happened to 3-Brain -> Kimi gate
    const renamed = claudeDoc(BASE).replace('**Kimi Hostile-Review Gate**', '**Consensus Review Gate**');
    assert.notEqual(renamed, claudeDoc(BASE), 'fixture must differ or the test proves nothing');
    stageDocs(r, renamed);
    const out = runGuard(r);
    assert.equal(out.status, 1, 'undeclared rename must BLOCK');
    assert.match(out.stderr, /may be a RENAME, not a deletion/);
    assert.match(out.stderr, /SWAN_RULE_RENAME="46=46"/);
  } finally { rmSync(r.dir, { recursive: true, force: true }); }
});

test('PASSES a DECLARED rename', () => {
  const r = repo();
  try {
    commitDocs(r, claudeDoc(BASE));
    const renamed = claudeDoc(BASE).replace('**Kimi Hostile-Review Gate**', '**Consensus Review Gate**');
    stageDocs(r, renamed);
    const ok = runGuard(r, { SWAN_RULE_RENAME: '46=46' });
    assert.equal(ok.status, 0, `declared rename must PASS. stderr: ${ok.stderr}`);
    assert.match(ok.stdout, /rename accepted: 46/);
  } finally { rmSync(r.dir, { recursive: true, force: true }); }
});

test('REJECTS a rename declaration that does not land anywhere', () => {
  const r = repo();
  try {
    commitDocs(r, claudeDoc(BASE));
    stageDocs(r, claudeDoc(BASE.filter((n) => n !== 46))); // deleted, not renamed
    const out = runGuard(r, { SWAN_RULE_RENAME: '46=99' });
    assert.equal(out.status, 1, 'a rename claim with no destination must BLOCK');
    assert.match(out.stderr, /no NEW rule appears at 99/);
  } finally { rmSync(r.dir, { recursive: true, force: true }); }
});

test('SKIPS cleanly when no constitution file is staged', () => {
  const r = repo();
  try {
    commitDocs(r, claudeDoc(BASE));
    writeFileSync(join(r.dir, 'unrelated.txt'), 'hi', 'utf8');
    r.g('add', 'unrelated.txt');
    const out = runGuard(r);
    assert.equal(out.status, 0);
    assert.match(out.stdout, /no constitution file staged/);
  } finally { rmSync(r.dir, { recursive: true, force: true }); }
});

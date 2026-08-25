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
// F6 (Kimi round 2): a warning printed at the moment of misuse is not expiry. A
// hatch left set in a shell profile must fail the NEXT commit, not lie in wait.
test('BLOCKS on a stale override rather than merely warning about it', () => {
  const r = repo();
  try {
    commitDocs(r, claudeDoc(BASE));
    stageDocs(r, claudeDoc(BASE).replace('Body text for rule 16.', 'Body text for rule 16, corrected.'));
    const out = runGuard(r, { SWAN_ALLOW_RULE_REMOVAL: '46,73' });
    assert.equal(out.status, 1, 'a hatch authorising nothing here must BLOCK, so it cannot be left set');
    assert.match(out.stderr, /STALE override/);
    assert.match(out.stderr, /unset SWAN_ALLOW_RULE_REMOVAL/);
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
    assert.match(ok.stdout, /rename accepted \([\d.]+% content continuity\): 46/);
  } finally { rmSync(r.dir, { recursive: true, force: true }); }
});

// F1 — the worst defect this workstream shipped, and it came from a FIX.
// The first rename hatch accepted any addition at the target number, so a
// deletion could be laundered as a rename and reported as a verified PASS.
test('F1: REJECTS a deletion laundered as a rename (unrelated replacement body)', () => {
  const r = repo();
  try {
    commitDocs(r, claudeDoc(BASE));
    // delete MANDATORY rule 46, put a completely unrelated rule at 46
    const laundered = claudeDoc(BASE, {
      bodies: { 46: '46. **Hydration Reminder** — (MANDATORY) Established 2026-08-15. Drink water regularly throughout the working day.\n    AMENDED 2026-08-15: prefer room temperature.' },
    });
    stageDocs(r, laundered);
    const out = runGuard(r, { SWAN_RULE_RENAME: '46=46' });
    assert.equal(out.status, 1, 'an unrelated replacement must NOT pass as a rename');
    assert.match(out.stderr, /RENAME .*REJECTED|SWAN_RULE_RENAME 46=46 REJECTED/);
    assert.match(out.stderr, /content overlap/);
  } finally { rmSync(r.dir, { recursive: true, force: true }); }
});

test('F1: REJECTS a rename that quietly downgrades a MANDATORY rule', () => {
  const r = repo();
  try {
    commitDocs(r, claudeDoc(BASE));
    // same content, but MANDATORY silently dropped
    const downgraded = claudeDoc(BASE).replace(
      '46. **Kimi Hostile-Review Gate** — (MANDATORY)',
      '46. **Kimi Review Suggestion** — (optional)',
    );
    assert.notEqual(downgraded, claudeDoc(BASE), 'fixture must differ or the test proves nothing');
    stageDocs(r, downgraded);
    const out = runGuard(r, { SWAN_RULE_RENAME: '46=46' });
    assert.equal(out.status, 1, 'a rename must not be a downgrade vector');
    assert.match(out.stderr, /MANDATORY and the replacement is not/);
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

// --- Kimi round 3 D1: the flagship round-2 fix was blind to the most damaging
// payload in its own threat model, because the stopword list stripped the very
// words that carry prohibition.
test('D1: REJECTS a rename that INVERTS the obligation while keeping the vocabulary', () => {
  const r = repo();
  try {
    // The attack is a DECLARED RENAME whose body inverts: new title (so it reads as
    // removal+addition), identical vocabulary, flipped polarity.
    const orig = '46. **Commit Hygiene** — (MANDATORY) Established 2026-07-01. You must never commit generated files, and you must always run the linter first.\n    AMENDED 2026-08-01: applies to every branch without exception.';
    const inverted = '46. **Commit Standards** — (MANDATORY) Established 2026-07-01. You must always commit generated files, and you must never run the linter first.\n    AMENDED 2026-08-01: applies to every branch without exception.';
    commitDocs(r, claudeDoc(BASE, { bodies: { 46: orig } }));
    stageDocs(r, claudeDoc(BASE, { bodies: { 46: inverted } }));
    const out = runGuard(r, { SWAN_RULE_RENAME: '46=46' });
    assert.equal(out.status, 1, 'an exact semantic inversion must NOT pass as a rename');
    assert.match(out.stderr, /obligation INVERTED/);
  } finally { rmSync(r.dir, { recursive: true, force: true }); }
});

// Kimi round 4 F1: inversion was tested, DELETION was not. Dropping the negating
// token is the more dangerous edit — a prohibition silently becomes a permission —
// and "no polarity after" is not "a different polarity after".
test('F1: REJECTS a rename that DELETES the negation entirely', () => {
  const r = repo();
  try {
    const orig = '46. **Secret Handling** — (MANDATORY) Established 2026-07-01. You must never commit credentials anywhere in this repository.';
    const dropped = '46. **Secret Handling Policy** — (MANDATORY) Established 2026-07-01. You must commit credentials anywhere in this repository.';
    commitDocs(r, claudeDoc(BASE, { bodies: { 46: orig } }));
    stageDocs(r, claudeDoc(BASE, { bodies: { 46: dropped } }));
    const out = runGuard(r, { SWAN_RULE_RENAME: '46=46' });
    assert.equal(out.status, 1, 'dropping the negation turns a prohibition into a permission — must BLOCK');
    assert.match(out.stderr, /obligation INVERTED|no longer governed/);
  } finally { rmSync(r.dir, { recursive: true, force: true }); }
});

// Kimi round 4, item 2: a downgrade expressed with no modal verb at all.
test('REJECTS a rename that downgrades "required" to "recommended"', () => {
  const r = repo();
  try {
    const orig = '46. **Review Gate** — (MANDATORY) Established 2026-07-01. A hostile review is required before every substantial merge.';
    const soft = '46. **Review Guidance** — (MANDATORY) Established 2026-07-01. A hostile review is recommended before every substantial merge.';
    commitDocs(r, claudeDoc(BASE, { bodies: { 46: orig } }));
    stageDocs(r, claudeDoc(BASE, { bodies: { 46: soft } }));
    const out = runGuard(r, { SWAN_RULE_RENAME: '46=46' });
    assert.equal(out.status, 1, '"required" -> "recommended" is a downgrade and must BLOCK');
  } finally { rmSync(r.dir, { recursive: true, force: true }); }
});

// Self-found: forward-only scanning made an honest PASSIVE rewording look like a
// dropped negation. Direction-comparison plus a backward scan fixes it, and this
// test pins the false positive so it cannot come back.
test('PASSES an honest passive rewording that preserves the prohibition', () => {
  const r = repo();
  try {
    const active = '46. **Secret Handling** — (MANDATORY) Established 2026-07-01. You must never commit credentials into this repository.';
    const passive = '46. **Secret Handling Policy** — (MANDATORY) Established 2026-07-01. Committing credentials into this repository is forbidden, always, without exception.';
    commitDocs(r, claudeDoc(BASE, { bodies: { 46: active } }));
    stageDocs(r, claudeDoc(BASE, { bodies: { 46: passive } }));
    const out = runGuard(r, { SWAN_RULE_RENAME: '46=46' });
    assert.equal(out.status, 0, `a prohibition restated passively is still a prohibition. stderr: ${out.stderr}`);
  } finally { rmSync(r.dir, { recursive: true, force: true }); }
});

// Found by probing the shipped scanner (Kimi round 5 prompted the look, though its
// own scenario did not reproduce): an adverb between the polarity word and its
// subject stole the attachment, so deleting the negation went UNDETECTED.
test('BLOCKS a negation deletion even when filler words sit between it and the subject', () => {
  const r = repo();
  try {
    const orig = '46. **Secret Handling** — (MANDATORY) Established 2026-07-01. You should never, ever, commit credentials here.';
    const dropped = '46. **Secret Handling Policy** — (MANDATORY) Established 2026-07-01. You should commit credentials here.';
    commitDocs(r, claudeDoc(BASE, { bodies: { 46: orig } }));
    stageDocs(r, claudeDoc(BASE, { bodies: { 46: dropped } }));
    const out = runGuard(r, { SWAN_RULE_RENAME: '46=46' });
    assert.equal(out.status, 1, 'a filler word must not let a dropped negation through');
  } finally { rmSync(r.dir, { recursive: true, force: true }); }
});

// The reviewer predicted this would FALSE-BLOCK. Probed against the real scanner, it
// does not — the scan attaches to the first content word and stops. Pinned so the
// non-reproduction stays true if the scanner is touched again.
test('PASSES an honest reword across a comma (reviewer predicted a false block here)', () => {
  const r = repo();
  try {
    const orig = '46. **Commit Size** — (MANDATORY) Established 2026-07-01. Please avoid large commits, keep them small.';
    const reworded = '46. **Commit Size Policy** — (MANDATORY) Established 2026-07-01. Please keep commits small.';
    commitDocs(r, claudeDoc(BASE, { bodies: { 46: orig } }));
    stageDocs(r, claudeDoc(BASE, { bodies: { 46: reworded } }));
    const out = runGuard(r, { SWAN_RULE_RENAME: '46=46' });
    assert.equal(out.status, 0, `honest reword must PASS, not false-block. stderr: ${out.stderr}`);
  } finally { rmSync(r.dir, { recursive: true, force: true }); }
});

test('D1: an honest expansion that ADDS clauses is not mistaken for an inversion', () => {
  const r = repo();
  try {
    // Same shape (a real rename: new title) but obligations are ADDED, not flipped.
    const orig = '46. **Commit Hygiene** — (MANDATORY) Established 2026-07-01. You must never commit generated files anywhere.';
    const grown = '46. **Commit Hygiene Policy** — (MANDATORY) Established 2026-07-01. You must never commit generated files anywhere.\n    AMENDED 2026-08-15: you must always run the linter first, and must never skip the secret scan.';
    commitDocs(r, claudeDoc(BASE, { bodies: { 46: orig } }));
    stageDocs(r, claudeDoc(BASE, { bodies: { 46: grown } }));
    const out = runGuard(r, { SWAN_RULE_RENAME: '46=46' });
    assert.equal(out.status, 0, `adding new obligations must PASS. stderr: ${out.stderr}`);
  } finally { rmSync(r.dir, { recursive: true, force: true }); }
});

// --- Kimi round 3 D3: death by a thousand trims. Each rule clears the per-rule
// floor; the corpus still loses a rule's worth of text.
test('D3: BLOCKS an aggregate bleed where every single rule clears the per-rule floor', () => {
  const r = repo();
  try {
    // Each rule loses ~1.4% — comfortably under the 2% per-rule floor, exactly the
    // "editorial cleanup" framing. The corpus still bleeds well past the 0.5% budget.
    const PAD = 'padding sentence for length. ';
    const head = (n) => `${n}. **Rule ${n} Title** — (MANDATORY) Established 2026-07-01. `;
    const long = (n) => `${head(n)}${PAD.repeat(70)}\n    AMENDED 2026-08-01: an enforcement paragraph.`;
    const trimmed = (n) => `${head(n)}${PAD.repeat(69)}\n    AMENDED 2026-08-01: an enforcement paragraph.`;
    const nums = [16, 46, 73, 74, 80, 81];
    commitDocs(r, claudeDoc(nums, { bodies: Object.fromEntries(nums.map((n) => [n, long(n)])) }));
    stageDocs(r, claudeDoc(nums, { bodies: Object.fromEntries(nums.map((n) => [n, trimmed(n)])) }));
    const out = runGuard(r);
    assert.equal(out.status, 1, 'a corpus-wide bleed must BLOCK even when no single rule trips');
    assert.match(out.stderr, /combined length/);
    assert.doesNotMatch(out.stderr, /looks REVERTED/, 'no individual rule should have tripped the per-rule floor');
  } finally { rmSync(r.dir, { recursive: true, force: true }); }
});

// 2026-08-25: the first legitimate narrative-cut proved the D3 budget unsatisfiable —
// "declare it" had no declaration mechanism for surviving-but-trimmed rules. Declared
// trims are authorised-and-loud (same principle as declared removals) and leave the
// budget guarding every UNDECLARED rule at full strength.
test('D3: PASSES an aggregate trim when every trimmed rule is DECLARED', () => {
  const r = repo();
  try {
    const PAD = 'padding sentence for length. ';
    const head = (n) => `${n}. **Rule ${n} Title** — (MANDATORY) Established 2026-07-01. `;
    const long = (n) => `${head(n)}${PAD.repeat(70)}\n    AMENDED 2026-08-01: an enforcement paragraph.`;
    const trimmed = (n) => `${head(n)}${PAD.repeat(69)}\n    AMENDED 2026-08-01: an enforcement paragraph.`;
    const nums = [16, 46, 73, 74, 80, 81];
    commitDocs(r, claudeDoc(nums, { bodies: Object.fromEntries(nums.map((n) => [n, long(n)])) }));
    stageDocs(r, claudeDoc(nums, { bodies: Object.fromEntries(nums.map((n) => [n, trimmed(n)])) }));
    const out = runGuard(r, { SWAN_ALLOW_RULE_REMOVAL: nums.join(',') });
    assert.equal(out.status, 0, `a fully-declared narrative-cut must PASS. stderr: ${out.stderr}`);
    assert.match(out.stderr, /OVERRIDE ACTIVE/, 'the declaration must still print loudly');
  } finally { rmSync(r.dir, { recursive: true, force: true }); }
});

test('D3: BLOCKS a declared GUTTING — a survivor trimmed past 50% even with the env set', () => {
  const r = repo();
  try {
    const PAD = 'padding sentence for length. ';
    const head = (n) => `${n}. **Rule ${n} Title** — (MANDATORY) Established 2026-07-01. `;
    const long = (n) => `${head(n)}${PAD.repeat(70)}\n    AMENDED 2026-08-01: an enforcement paragraph.`;
    const gutted = (n) => `${head(n)}${PAD.repeat(10)}`;  // ~85% of the body gone
    const nums = [16, 46, 73];
    commitDocs(r, claudeDoc(nums, { bodies: Object.fromEntries(nums.map((n) => [n, long(n)])) }));
    stageDocs(r, claudeDoc(nums, { bodies: Object.fromEntries(nums.map((n) => [n, n === 46 ? gutted(n) : long(n)])) }));
    const out = runGuard(r, { SWAN_ALLOW_RULE_REMOVAL: '46' });
    assert.equal(out.status, 1, 'a declaration is not a license to hollow a surviving rule');
    assert.match(out.stderr, /GUTTING/);
  } finally { rmSync(r.dir, { recursive: true, force: true }); }
});

test('D3: BLOCKS STACKED sub-floor declared trims — 40% each × 6 rules is a set gutting (Ox r2 F1)', () => {
  const r = repo();
  try {
    const PAD = 'padding sentence for length. ';
    const head = (n) => `${n}. **Rule ${n} Title** — (MANDATORY) Established 2026-07-01. `;
    const long = (n) => `${head(n)}${PAD.repeat(70)}\n    AMENDED 2026-08-01: an enforcement paragraph.`;
    const cut40 = (n) => `${head(n)}${PAD.repeat(42)}\n    AMENDED 2026-08-01: an enforcement paragraph.`;
    const nums = [16, 46, 73, 74, 80, 81];
    commitDocs(r, claudeDoc(nums, { bodies: Object.fromEntries(nums.map((n) => [n, long(n)])) }));
    stageDocs(r, claudeDoc(nums, { bodies: Object.fromEntries(nums.map((n) => [n, cut40(n)])) }));
    const out = runGuard(r, { SWAN_ALLOW_RULE_REMOVAL: nums.join(',') });
    assert.equal(out.status, 1, 'each trim clears the 50% per-rule floor; their composition must still BLOCK');
    assert.match(out.stderr, /DECLARED rules collectively/);
  } finally { rmSync(r.dir, { recursive: true, force: true }); }
});

test('D3: BLOCKS the PADDED-DECOY variant — declared growth must not buy back the breadth budget (GLM r3 F1)', () => {
  const r = repo();
  try {
    const PAD = 'padding sentence for length. ';
    const head = (n) => `${n}. **Rule ${n} Title** — (MANDATORY) Established 2026-07-01. `;
    const long = (n) => `${head(n)}${PAD.repeat(70)}\n    AMENDED 2026-08-01: an enforcement paragraph.`;
    const cut40 = (n) => `${head(n)}${PAD.repeat(42)}\n    AMENDED 2026-08-01: an enforcement paragraph.`;
    const grownDecoy = (n) => `${head(n)}${PAD.repeat(700)}\n    AMENDED 2026-08-01: an enforcement paragraph.`;
    const nums = [16, 46, 73, 74, 80, 81, 82];
    const bodies = Object.fromEntries(nums.map((n) => [n, long(n)]));
    commitDocs(r, claudeDoc(nums, { bodies }));
    // Six rules cut 40% each; the seventh — also declared — is inflated 10× as a decoy.
    const staged = Object.fromEntries(nums.map((n) => [n, n === 82 ? grownDecoy(n) : cut40(n)]));
    stageDocs(r, claudeDoc(nums, { bodies: staged }));
    const out = runGuard(r, { SWAN_ALLOW_RULE_REMOVAL: nums.join(',') });
    assert.equal(out.status, 1, 'a grown decoy must not dilute the set floor — clipped losses count regardless');
    assert.match(out.stderr, /DECLARED rules collectively/);
  } finally { rmSync(r.dir, { recursive: true, force: true }); }
});

test('D3: still BLOCKS when the bleed extends past the declared rules', () => {
  const r = repo();
  try {
    const PAD = 'padding sentence for length. ';
    const head = (n) => `${n}. **Rule ${n} Title** — (MANDATORY) Established 2026-07-01. `;
    const long = (n) => `${head(n)}${PAD.repeat(70)}\n    AMENDED 2026-08-01: an enforcement paragraph.`;
    const trimmed = (n) => `${head(n)}${PAD.repeat(69)}\n    AMENDED 2026-08-01: an enforcement paragraph.`;
    const nums = [16, 46, 73, 74, 80, 81];
    commitDocs(r, claudeDoc(nums, { bodies: Object.fromEntries(nums.map((n) => [n, long(n)])) }));
    stageDocs(r, claudeDoc(nums, { bodies: Object.fromEntries(nums.map((n) => [n, trimmed(n)])) }));
    // Only HALF the trimmed rules are declared — the undeclared half still bleeds.
    const out = runGuard(r, { SWAN_ALLOW_RULE_REMOVAL: '16,46,73' });
    assert.equal(out.status, 1, 'undeclared bleed must still BLOCK');
    assert.match(out.stderr, /combined length/);
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

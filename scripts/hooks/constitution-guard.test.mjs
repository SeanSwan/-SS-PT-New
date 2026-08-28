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

test('D3: BLOCKS the DILUTED stack via the ABS CAP — untouched declared padding cannot buy back the budget (GLM+Grok r4)', () => {
  const r = repo();
  try {
    const PAD = 'padding sentence for length. ';
    const head = (n) => `${n}. **Rule ${n} Title** — (MANDATORY) Established 2026-07-01. `;
    // Big bodies so six ~47% cuts exceed the 11,500-char cap while six untouched
    // declared rules dilute the RATIO below the 25% floor — this test fails unless
    // the ABS CAP branch itself fires (it also closes Ox r4's zero-coverage LOW).
    const long = (n) => `${head(n)}${PAD.repeat(150)}\n    AMENDED 2026-08-01: an enforcement paragraph.`;
    const cut47 = (n) => `${head(n)}${PAD.repeat(78)}\n    AMENDED 2026-08-01: an enforcement paragraph.`;
    const nums = [11, 12, 13, 14, 15, 16, 46, 73, 74, 80, 81, 82];
    const cutSet = new Set([11, 12, 13, 14, 15, 16]);
    commitDocs(r, claudeDoc(nums, { bodies: Object.fromEntries(nums.map((n) => [n, long(n)])) }));
    stageDocs(r, claudeDoc(nums, { bodies: Object.fromEntries(nums.map((n) => [n, cutSet.has(n) ? cut47(n) : long(n)])) }));
    const out = runGuard(r, { SWAN_ALLOW_RULE_REMOVAL: nums.join(',') });
    assert.equal(out.status, 1, 'ratio diluted under 25% by untouched declared rules — the absolute cap must still BLOCK');
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

// ---- X2: merge baseline is origin/main, not the pre-merge tip -------------
// These exist because the guard's HEAD baseline INVERTS during a merge: a branch behind
// origin/main carries stale law, so every rule main legitimately trimmed reads as a
// reversion and a correct merge is blocked. The tests pin both directions — the correct
// merge passes, and a merge that actually loses main's law still blocks.

// A rule body deliberately SHORTER than fullBody(), standing in for main trimming a rule.
const trimmed = (n, name) => `${n}. **${name}** — (MANDATORY) Trimmed on main.`;

// Builds: HEAD = long bodies (this branch, stale) · origin/main = trimmed bodies · REAL merge
// in progress. The merge is performed by git rather than simulated: `git update-ref MERGE_HEAD`
// is refused outright ("refusing to update pseudoref"), and a first version of this helper
// ignored that failure, so MERGING was false and the test proved nothing while looking green.
function mergeRepo({ stagedDoc }) {
  const r = repo();
  commitDocs(r, claudeDoc(BASE));                        // base: full/long bodies
  const base = r.g('rev-parse', 'HEAD').stdout.trim();

  // origin/main: a real commit off base that TRIMS rule 46 (main's deliberate narrative-cut)
  const mainDoc = claudeDoc(BASE, { bodies: { 46: trimmed(46, 'Kimi Hostile-Review Gate') } });
  writeFileSync(join(r.dir, 'CLAUDE.md'), mainDoc, 'utf8');
  writeFileSync(join(r.dir, 'AGENTS.md'), agentsDoc(mainDoc), 'utf8');
  r.g('add', 'CLAUDE.md', 'AGENTS.md');
  r.g('commit', '-q', '-m', 'main trims rule 46');
  r.g('update-ref', 'refs/remotes/origin/main', r.g('rev-parse', 'HEAD').stdout.trim());

  // this branch: diverges from base WITHOUT touching the constitution, so HEAD keeps the
  // long bodies and the merge is a clean carry of main's text — the real-world shape
  r.g('checkout', '-q', '-b', 'side', base);
  writeFileSync(join(r.dir, 'unrelated.txt'), 'side work\n', 'utf8');
  r.g('add', 'unrelated.txt');
  r.g('commit', '-q', '-m', 'side work');

  const m = r.g('merge', '--no-commit', '--no-ff', 'refs/remotes/origin/main');
  const merging = r.g('rev-parse', '-q', '--verify', 'MERGE_HEAD');
  // Assert the PRECONDITION. Without this the suite silently degrades into testing the
  // non-merge path, which is exactly how the first version of it passed while proving nothing.
  assert.ok(merging.status === 0, `fixture must leave a real merge in progress: ${m.stderr}${merging.stderr}`);

  stageDocs(r, stagedDoc(mainDoc));
  return r;
}

test('X2 PASSES a merge that faithfully carries a rule main trimmed', () => {
  // The founding case: 13 rules reported "REVERTED, stale-copy signature" whose staged
  // bodies were byte-identical to origin/main. Against HEAD that is a reversion; against
  // current law it is adoption.
  const r = mergeRepo({ stagedDoc: (mainDoc) => mainDoc });
  try {
    const out = runGuard(r);
    assert.equal(out.status, 0, `faithful merge carry must PASS, got ${out.status}: ${out.stderr}`);
    assert.match(out.stdout, /baseline is origin\/main/);
  } finally { rmSync(r.dir, { recursive: true, force: true }); }
});

test('X2 does NOT blanket-pass a merge: losing a rule main HAS is still BLOCKED', () => {
  // The abuse case. If X2 merely skipped checking during a merge, this would pass.
  const r = mergeRepo({ stagedDoc: () => claudeDoc([16, 74]) }); // 46, 73, 80, 81 dropped
  try {
    const out = runGuard(r);
    assert.equal(out.status, 1, 'a merge that DROPS main rules must still block');
    assert.match(out.stderr, /rule 46 .*is GONE/s);
  } finally { rmSync(r.dir, { recursive: true, force: true }); }
});

test('X2 FAILS CLOSED: merge in progress but origin/main missing => baseline stays HEAD', () => {
  const r = mergeRepo({ stagedDoc: (mainDoc) => mainDoc });
  try {
    r.g('update-ref', '-d', 'refs/remotes/origin/main');
    const out = runGuard(r);
    assert.equal(out.status, 1, 'without origin/main the HEAD baseline must judge it a reversion');
    assert.doesNotMatch(out.stdout, /baseline is origin\/main/);
  } finally { rmSync(r.dir, { recursive: true, force: true }); }
});

test('X2: with NO merge in progress the baseline stays HEAD and a reversion still blocks', () => {
  const r = repo();
  try {
    commitDocs(r, claudeDoc(BASE));
    stageDocs(r, claudeDoc(BASE, { bodies: { 46: trimmed(46, 'Kimi Hostile-Review Gate') } }));
    const out = runGuard(r);
    assert.equal(out.status, 1, 'outside a merge, a shorter body is still a reversion');
    assert.match(out.stderr, /rule 46 .*REVERTED/s);
  } finally { rmSync(r.dir, { recursive: true, force: true }); }
});

// ---- X2b: the merge baseline is the UNION of both parents --------------------
// This is the hole X2's first form opened, found and closed in the same hostile round that
// shipped it. A rule the BRANCH added, which main never had, was silently droppable by a
// merge: origin/main has no such rule, so its absence from the result was not a removal —
// exactly the 10a3e7fa1 class this guard exists to stop, re-opened by its own fix.
// The general lesson these pin: a guard's baseline may be WIDENED, never SWAPPED.
function unionRepo({ mainNums, branchNums, stagedNums }) {
  const r = repo();
  commitDocs(r, claudeDoc(BASE));
  const base = r.g('rev-parse', 'HEAD').stdout.trim();
  stageDocs(r, claudeDoc(mainNums)); r.g('commit', '-q', '-m', 'main moves on');
  r.g('update-ref', 'refs/remotes/origin/main', r.g('rev-parse', 'HEAD').stdout.trim());
  r.g('checkout', '-q', '-b', 'side', base);
  stageDocs(r, claudeDoc(branchNums)); r.g('commit', '-q', '-m', 'branch adds its own rule');
  r.g('merge', '--no-commit', '--no-ff', 'refs/remotes/origin/main');
  const merging = r.g('rev-parse', '-q', '--verify', 'MERGE_HEAD');
  assert.equal(merging.status, 0, 'fixture must leave a REAL merge in progress');
  stageDocs(r, claudeDoc(stagedNums));
  return r;
}

test('X2b BLOCKS a merge that silently drops a rule only the BRANCH had', () => {
  const r = unionRepo({ mainNums: [16, 46, 80], branchNums: [16, 46, 81], stagedNums: [16, 46, 80] });
  try {
    const out = runGuard(r);
    assert.equal(out.status, 1, 'dropping a branch-only rule during a merge must BLOCK');
    assert.match(out.stderr, /rule 81 .*is GONE/s);
    // and it must send the reader to the RIGHT tree — 81 is not in origin/main
    assert.match(out.stderr, /rule 81 .*exists in the pre-merge HEAD/s);
  } finally { rmSync(r.dir, { recursive: true, force: true }); }
});

test('X2b BLOCKS a merge that drops a rule only MAIN had', () => {
  const r = unionRepo({ mainNums: [16, 46, 80], branchNums: [16, 46, 81], stagedNums: [16, 46, 81] });
  try {
    const out = runGuard(r);
    assert.equal(out.status, 1, 'dropping a main-only rule during a merge must BLOCK');
    assert.match(out.stderr, /rule 80 .*is GONE/s);
    assert.match(out.stderr, /rule 80 .*exists in origin\/main/s);
  } finally { rmSync(r.dir, { recursive: true, force: true }); }
});

test('X2b PASSES the honest merge: rules from BOTH parents survive', () => {
  const r = unionRepo({ mainNums: [16, 46, 80], branchNums: [16, 46, 81], stagedNums: [16, 46, 80, 81] });
  try {
    const out = runGuard(r);
    assert.equal(out.status, 0, `keeping BOTH parents' rules must PASS: ${out.stderr}`);
  } finally { rmSync(r.dir, { recursive: true, force: true }); }
});

// ---- X2c: SELECTION must be merge-aware too ---------------------------------
// The most severe finding of the round, and it PREDATED the X2 baseline work: `git diff
// --cached` is index-vs-HEAD, so a merge resolved by keeping the branch's CLAUDE.md verbatim
// leaves the file un-staged relative to HEAD. The guard printed "no constitution file staged
// — SKIP" and the commit went green, with every rule main added since the fork discarded.
// Baseline logic is irrelevant if the file is never selected.
test('X2c BLOCKS a merge that discards main\'s rules by keeping the branch file verbatim', () => {
  const r = repo();
  try {
    commitDocs(r, claudeDoc([16, 46]));
    const base = r.g('rev-parse', 'HEAD').stdout.trim();
    stageDocs(r, claudeDoc([16, 46, 80])); r.g('commit', '-q', '-m', 'main adds 80');
    r.g('update-ref', 'refs/remotes/origin/main', r.g('rev-parse', 'HEAD').stdout.trim());
    r.g('checkout', '-q', '-b', 'side', base);
    stageDocs(r, claudeDoc([16, 46, 81])); r.g('commit', '-q', '-m', 'branch adds 81');
    r.g('merge', '--no-commit', '--no-ff', 'refs/remotes/origin/main');
    assert.equal(r.g('rev-parse', '-q', '--verify', 'MERGE_HEAD').status, 0, 'fixture needs a real merge');
    // resolve by keeping the BRANCH's file verbatim => index == HEAD for this path
    stageDocs(r, claudeDoc([16, 46, 81]));
    assert.ok(
      !r.g('diff', '--cached', '--name-only').stdout.split('\n').includes('CLAUDE.md'),
      'precondition: the file must NOT appear in diff --cached, or this tests nothing',
    );
    const out = runGuard(r);
    assert.equal(out.status, 1, 'discarding main\'s rules via a merge resolution must BLOCK');
    assert.match(out.stderr, /rule 80 .*is GONE/s);
  } finally { rmSync(r.dir, { recursive: true, force: true }); }
});

// ---- X2d: body must be judged three-way, not against one parent --------------
// The union fixed PRESENCE and left BODY one-sided. "staged == main's copy, HEAD's differs"
// covers two opposite situations that are textually identical: main deliberately trimmed
// (adopt it) versus the merge discarded THIS branch's newer law (block it). Only the merge
// base separates them. (GLM 5.3, R8/B1 — finding right, proposed fix would have re-blocked
// every legitimate adoption.)
function threeWayRepo({ branchEdits }) {
  const r = repo();
  const base12 = '12. **Rule 12 name** — (MANDATORY) Established 2026-07-01. Body for 12.\n    AMENDED 2026-08-01: enforcement paragraph.\n    Padding padding padding.';
  const docWith = (twelve, extra = []) => claudeDoc([16, ...extra], { bodies: {} })
    .replace('## Dual-Pass Fix/Review Discipline', `${twelve}\n\n## Dual-Pass Fix/Review Discipline`);
  commitDocs(r, docWith(base12));
  const base = r.g('rev-parse', 'HEAD').stdout.trim();
  stageDocs(r, docWith(base12, [80])); r.g('commit', '-q', '-m', 'main adds 80, leaves 12 alone');
  r.g('update-ref', 'refs/remotes/origin/main', r.g('rev-parse', 'HEAD').stdout.trim());
  r.g('checkout', '-q', '-b', 'side', base);
  const branch12 = branchEdits
    ? `${base12}\n    AMENDED 2026-08-27: the branch tightened this rule with new enforcement law.`
    : base12;
  stageDocs(r, docWith(branch12)); r.g('commit', '-q', '-m', 'branch work');
  r.g('merge', '--no-commit', '--no-ff', 'refs/remotes/origin/main');
  assert.equal(r.g('rev-parse', '-q', '--verify', 'MERGE_HEAD').status, 0, 'fixture needs a real merge');
  stageDocs(r, docWith(base12, [80]));   // resolve to MAIN's side wholesale
  return r;
}

test('X2d BLOCKS a merge that discards a rule body THIS BRANCH tightened', () => {
  const r = threeWayRepo({ branchEdits: true });
  try {
    const out = runGuard(r);
    assert.equal(out.status, 1, 'discarding the branch\'s own newer law must BLOCK');
    assert.match(out.stderr, /rule 12/s);
  } finally { rmSync(r.dir, { recursive: true, force: true }); }
});

test('X2d PASSES the same shape when the branch never edited that rule', () => {
  // identical text outcome; only the merge base distinguishes it. If this fails, the fix
  // has become the false positive X2 existed to remove.
  const r = threeWayRepo({ branchEdits: false });
  try {
    const out = runGuard(r);
    assert.equal(out.status, 0, `legitimate adoption must still PASS: ${out.stderr}`);
  } finally { rmSync(r.dir, { recursive: true, force: true }); }
});

// ---- squash merges stage carried content with NO MERGE_HEAD ------------------
// `git merge --squash` writes only SQUASH_MSG. Keying merge-mode on MERGE_HEAD alone left the
// closest sibling of the operation this work supports uncovered, and the original incident
// reproduced verbatim through it. (GLM 5.3 Flash, R8, finding 2 — verified against real git.)
test('SQUASH: a squash-sync of main is treated as a merge, not as this commit\'s own edit', () => {
  const r = repo();
  try {
    // main trims rule 46; the branch merely carries the older, longer copy
    commitDocs(r, claudeDoc(BASE));
    const base = r.g('rev-parse', 'HEAD').stdout.trim();
    const trimmed46 = '46. **Kimi Hostile-Review Gate** — (MANDATORY) Trimmed on main.';
    stageDocs(r, claudeDoc(BASE, { bodies: { 46: trimmed46 } }));
    r.g('commit', '-q', '-m', 'main trims 46');
    r.g('update-ref', 'refs/remotes/origin/main', r.g('rev-parse', 'HEAD').stdout.trim());
    r.g('checkout', '-q', '-b', 'side', base);
    writeFileSync(join(r.dir, 'unrelated.txt'), 'side\n', 'utf8');
    r.g('add', 'unrelated.txt'); r.g('commit', '-q', '-m', 'side');

    r.g('merge', '--squash', 'refs/remotes/origin/main');
    // precondition: this is the whole point — a squash records NO MERGE_HEAD
    assert.notEqual(r.g('rev-parse', '-q', '--verify', 'MERGE_HEAD').status, 0,
      'precondition: a squash must NOT write MERGE_HEAD, or this tests nothing');
    stageDocs(r, claudeDoc(BASE, { bodies: { 46: trimmed46 } }));

    const out = runGuard(r);
    assert.equal(out.status, 0, `carrying main's trim via squash must PASS: ${out.stderr}`);
    assert.match(out.stdout, /baseline is origin\/main/);
  } finally { rmSync(r.dir, { recursive: true, force: true }); }
});

// ---- X2e: aggregate shrink is PER PARENT, never pooled -----------------------
// A long-diverged branch adopts many unchanged rules from main. Pooling them puts pure
// ballast in the denominator, so the fixed 0.5% budget stops describing the rules actually
// at risk and a real death-by-a-thousand-trims hides behind adopted mass. Constructed so the
// branch pool trips (>0.5%) while the POOLED figure does not — the two mutations that
// survived the first pass were "pool everything" and "report the best pool". (GLM 5.3, R8/B3.)
const pad = (n, chars) => `${n}. **Rule ${n} name** — (MANDATORY) Established 2026-07-01. ${'x'.repeat(chars)}`;

test('X2e BLOCKS trims that only trip once the branch pool is measured alone', () => {
  const r = repo();
  try {
    // 5 main rules x ~1000 chars of unchanged ballast, 2 branch rules x ~1000 chars
    const mainRules = [50, 51, 52, 53, 54].map((n) => pad(n, 1000));
    const branchFull = [60, 61].map((n) => pad(n, 1000));
    const branchTrim = [60, 61].map((n) => pad(n, 985));   // -15 chars each: 1.5% < 2% floor
    const doc = (extra) => ['# CLAUDE.md', '', '## MANDATORY Rules', '', ...extra.flatMap((b) => [b, '']),
      '## Dual-Pass Fix/Review Discipline', '', 'tail.'].join('\n');

    commitDocs(r, doc(mainRules));
    const base = r.g('rev-parse', 'HEAD').stdout.trim();
    // main must ADVANCE past base, or the merge is already-up-to-date and writes no
    // MERGE_HEAD — the fixture then silently tests the non-merge path and proves nothing.
    writeFileSync(join(r.dir, 'main-only.txt'), 'main moved on\n', 'utf8');
    r.g('add', 'main-only.txt'); r.g('commit', '-q', '-m', 'main advances');
    r.g('update-ref', 'refs/remotes/origin/main', r.g('rev-parse', 'HEAD').stdout.trim());

    r.g('checkout', '-q', '-b', 'side', base);
    stageDocs(r, doc([...mainRules, ...branchFull]));
    r.g('commit', '-q', '-m', 'branch adds two rules of its own');

    r.g('merge', '--no-commit', '--no-ff', 'refs/remotes/origin/main');
    assert.equal(r.g('rev-parse', '-q', '--verify', 'MERGE_HEAD').status, 0, 'fixture needs a real merge');
    stageDocs(r, doc([...mainRules, ...branchTrim]));       // trim ONLY the branch's own rules

    const out = runGuard(r);
    // precondition: pooled would be 30/7000 = 0.43% < 0.5% and would NOT block.
    // If this starts passing, the per-parent split has been lost.
    assert.equal(out.status, 1, `branch-pool trims must BLOCK once measured alone: ${out.stdout}${out.stderr}`);
    assert.match(out.stderr, /surviving rules from the pre-merge HEAD lost/);
  } finally { rmSync(r.dir, { recursive: true, force: true }); }
});

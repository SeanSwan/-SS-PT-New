#!/usr/bin/env node
/**
 * hook-provenance.test.mjs — check 8 (live-but-uncommitted registration).
 * =======================================================================
 * WHY THE INVARIANTS MATTER MORE THAN THE ANSWERS. The sibling check-7 suite records
 * five rewrites that each reintroduced a silent path, and one round that shipped a
 * PASSING test asserting the outage was correct behaviour. The lesson taken from it:
 * a gate whose failure mode is SILENCE cannot be tested by checking answers alone,
 * because the bug and the healthy case produce byte-identical output.
 *
 * So three invariants are pinned here, and each one is a specific way this module
 * could quietly become useless:
 *
 *   I1  settings.local.json is NEVER named in a finding. It is gitignored by design,
 *       so flagging it would fire on every machine forever — and a check that always
 *       fires is a check that gets deleted. This is the single most important
 *       false-positive guard in the module.
 *   I2  Every unreadable/undeterminable state produces a finding. "Could not check"
 *       must never render as "clean" — that is the exact ambiguity check 8 exists to
 *       remove, and reproducing it here would make the module a decoration.
 *   I3  A finding names the WHOLE command. The first draft keyed on a space and
 *       rendered "node (PreToolUse)", naming a guard that does not exist.
 *
 * Run: node scripts/hooks/hook-provenance.test.mjs   (exit 0 = pass)
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { auditHookProvenance, collectHookCommands, normalizeCommand } from '../lib/hook-provenance.mjs';

let pass = 0;
const failures = [];
function check(name, cond, detail = '') {
  if (cond) { pass++; return; }
  failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
}

/** Build a throwaway repo root with a working-tree settings.json. */
function root(liveJson) {
  const d = mkdtempSync(join(tmpdir(), 'hookprov-'));
  mkdirSync(join(d, '.claude'), { recursive: true });
  if (liveJson !== undefined) {
    writeFileSync(join(d, '.claude', 'settings.json'),
      typeof liveJson === 'string' ? liveJson : JSON.stringify(liveJson));
  }
  return d;
}
const dirs = [];
const mk = (j) => { const d = root(j); dirs.push(d); return d; };
/** A readHead stub returning a committed blob. */
const head = (j) => () => (typeof j === 'string' ? j : JSON.stringify(j));
const headMissing = () => { const e = new Error("fatal: path '.claude/settings.json' exists on disk, but not in 'HEAD'"); throw e; };
const headBroken = () => { throw new Error('fatal: not a git repository'); };

const hooks = (event, ...cmds) => ({ hooks: { [event]: [{ hooks: cmds.map((c) => ({ command: c })) }] } });
const GATE = 'node scripts/hooks/exit-status-gate.mjs';
const DRIFT = 'node scripts/hooks/drift-check-gate.mjs';
const all = (r) => r.findings.join(' || ');

// ---- 1. The panel's P0: live here, absent from HEAD ------------------------
{
  const r = auditHookProvenance(mk(hooks('PreToolUse', GATE, DRIFT)), { readHead: head(hooks('PreToolUse', DRIFT)) });
  check('1a live-uncommitted is reported', /LIVE HERE BUT NOT COMMITTED/.test(all(r)), all(r));
  check('1b names the uncommitted gate', all(r).includes(GATE), all(r));
  check('1c does NOT accuse the committed one', !/LIVE HERE BUT NOT COMMITTED[^|]*drift-check/.test(all(r)), all(r));
  // I3 — the whole command, not its first token.
  check('1d I3: full command in finding', /node scripts\/hooks\/exit-status-gate\.mjs \(PreToolUse\)/.test(all(r)), all(r));
}

// ---- 2. The reverse: committed for everyone, switched off here -------------
{
  const r = auditHookProvenance(mk(hooks('PreToolUse', DRIFT)), { readHead: head(hooks('PreToolUse', DRIFT, GATE)) });
  check('2a locally-removed is reported', /NOT LIVE in this working tree/.test(all(r)), all(r));
  check('2b names it', all(r).includes(GATE), all(r));
}

// ---- 3. Agreement is silent ------------------------------------------------
{
  const same = hooks('PreToolUse', GATE, DRIFT);
  const r = auditHookProvenance(mk(same), { readHead: head(same) });
  check('3 identical registrations produce NO findings', r.findings.length === 0, all(r));
}

// ---- 4. Normalization is symmetric, not a blind spot -----------------------
{
  // Same guard, spelled for Windows and reformatted. Must NOT read as two guards.
  const live = hooks('PreToolUse', 'node  scripts\\hooks\\exit-status-gate.mjs');
  const r = auditHookProvenance(mk(live), { readHead: head(hooks('PreToolUse', GATE)) });
  check('4a path/whitespace spelling is not a false positive', r.findings.length === 0, all(r));
  // ...but a genuinely different command still differs.
  const r2 = auditHookProvenance(mk(hooks('PreToolUse', GATE + ' --strict')), { readHead: head(hooks('PreToolUse', GATE)) });
  check('4b a real argument change IS caught', /LIVE HERE BUT NOT COMMITTED/.test(all(r2)), all(r2));
  // Same command, different EVENT is a different registration.
  const r3 = auditHookProvenance(mk(hooks('Stop', GATE)), { readHead: head(hooks('PreToolUse', GATE)) });
  check('4c same command under a different event is caught', r3.findings.length > 0, all(r3));
}

// ---- 5. settings.json itself uncommitted -----------------------------------
{
  const r = auditHookProvenance(mk(hooks('PreToolUse', GATE)), { readHead: headMissing });
  check('5a reports the whole file uncommitted', /is not committed at all/.test(all(r)), all(r));
  check('5b counts the orphaned hooks', /1 live hook/.test(all(r)), all(r));
  // A file that is uncommitted but registers nothing is not an alarm.
  const r2 = auditHookProvenance(mk({ permissions: {} }), { readHead: headMissing });
  check('5c uncommitted file with no hooks is silent', r2.findings.length === 0, all(r2));
}

// ---- 6. I2 — undeterminable is never clean ---------------------------------
{
  const r = auditHookProvenance(mk(hooks('PreToolUse', GATE)), { readHead: headBroken });
  check('6a I2: git failure produces a finding', r.findings.length > 0, all(r));
  check('6b I2: and says UNKNOWN, not clean', /UNKNOWN, not clean/.test(all(r)), all(r));

  const r2 = auditHookProvenance(mk('{ not json'), { readHead: head(hooks('PreToolUse', GATE)) });
  check('6c I2: unparseable working file produces a finding', r2.findings.length > 0, all(r2));

  const r3 = auditHookProvenance(mk(hooks('PreToolUse', GATE)), { readHead: head('{ not json') });
  check('6d I2: unparseable HEAD blob produces a finding', r3.findings.length > 0, all(r3));
  check('6e I2: and names the blast radius', /fresh checkout runs NONE/.test(all(r3)), all(r3));

  // A MISSING working settings.json while HEAD registers hooks is the split-brain at
  // its worst: every committed guard is off in the tree doing the work. This case
  // originally asserted silence ("nothing is live, so nothing to report"), which was
  // backwards, and the module was written to match. Caught by hostile review minutes
  // after the identical mistake surfaced in rule-count.mjs — same author, same
  // session, same error class: treating absent input as nothing-to-report rather than
  // asking what the absence implies.
  const r4 = auditHookProvenance(mk(undefined), { readHead: head(hooks('PreToolUse', GATE)) });
  check('6f missing working file + committed hooks IS a finding', r4.findings.length > 0, all(r4));
  check('6g and says the guards are off here', /OFF here/.test(all(r4)), all(r4));
  check('6h and names them', all(r4).includes(GATE), all(r4));

  // Absent on BOTH sides registers nothing anywhere — the one legitimate silence.
  const r5 = auditHookProvenance(mk(undefined), { readHead: head({ permissions: {} }) });
  check('6i absent both sides is legitimately silent', r5.findings.length === 0, all(r5));
  const r6 = auditHookProvenance(mk(undefined), { readHead: headMissing });
  check('6j absent working file and no HEAD blob is silent', r6.findings.length === 0, all(r6));
}

// ---- 7. Shape traps inherited from check 7's eight hostile rounds ----------
// Each of these once read as CLEAN in the sibling module. Silence here is the bug.
{
  const shapes = [
    ['null root', null],
    ['array root', []],
    ['number root', 42],
    ['string root', 'nope'],
    ['hooks: null', { hooks: null }],
    ['hooks: array', { hooks: [] }],
    ['hooks: string', { hooks: 'x' }],
    ['event not array', { hooks: { PreToolUse: null } }],
  ];
  for (const [label, cfg] of shapes) {
    const { keys, shape } = collectHookCommands(cfg, 'T');
    check(`7 ${label} yields a shape finding, not silence`, shape.length > 0 && keys.size === 0,
      `shape=${shape.length} keys=${keys.size}`);
  }
  // A group with no hooks array registers nothing and must not throw.
  const { keys } = collectHookCommands({ hooks: { PreToolUse: [{}, { hooks: null }] } }, 'T');
  check('7 malformed group does not throw and registers nothing', keys.size === 0);
}

// ---- 8. normalizeCommand rejects non-strings and blanks --------------------
{
  check('8a null command', normalizeCommand(null) === null);
  check('8b number command', normalizeCommand(42) === null);
  check('8c blank command', normalizeCommand('   ') === null);
  check('8d undefined command', normalizeCommand(undefined) === null);
  check('8e real command survives', normalizeCommand(' node  a/b.mjs ') === 'node a/b.mjs');
}

// ---- 9. I1 — the false-positive guard that keeps this check alive ----------
{
  // A local-only settings file is EXPECTED to be uncommitted. If check 8 ever learns
  // to read it, it fires forever on every machine and gets deleted within a week.
  const d = mk(hooks('PreToolUse', GATE));
  writeFileSync(join(d, '.claude', 'settings.local.json'), JSON.stringify(hooks('Stop', 'node scripts/local-only.mjs')));
  const r = auditHookProvenance(d, { readHead: head(hooks('PreToolUse', GATE)) });
  check('9a I1: local-only hooks are never flagged', r.findings.length === 0, all(r));
  check('9b I1: findings never name settings.local.json', !all(r).includes('settings.local.json'));
  check('9c I1: the scope note discloses the exclusion', /settings\.local\.json is gitignored by design/.test(r.scopeNote), r.scopeNote);
}

// ---- 10. Every return path carries the scope note --------------------------
{
  const cases = [
    auditHookProvenance(mk(hooks('PreToolUse', GATE)), { readHead: head(hooks('PreToolUse', GATE)) }),
    auditHookProvenance(mk('{bad'), { readHead: head({}) }),
    auditHookProvenance(mk(hooks('PreToolUse', GATE)), { readHead: headMissing }),
    auditHookProvenance(mk(hooks('PreToolUse', GATE)), { readHead: headBroken }),
    auditHookProvenance(mk(undefined), { readHead: head({}) }),
  ];
  check('10 scope note present on every path', cases.every((c) => typeof c.scopeNote === 'string' && c.scopeNote.length > 20));
}

for (const d of dirs) { try { rmSync(d, { recursive: true, force: true }); } catch { /* temp */ } }

if (failures.length) {
  console.error(`FAIL ${failures.length} of ${pass + failures.length}`);
  for (const f of failures) console.error('  ✗ ' + f);
  process.exit(1);
}
console.log(`hook-provenance: ${pass}/${pass} pass`);

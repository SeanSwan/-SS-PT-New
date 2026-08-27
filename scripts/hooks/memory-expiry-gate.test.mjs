/**
 * memory-expiry-gate.test.mjs — coverage for the memory state-expiry gate.
 * Run: node scripts/hooks/memory-expiry-gate.test.mjs
 *
 * The false-positive tests matter more than the true-positive ones here. A
 * hygiene gate that fires on legitimate writes gets bypassed, and a bypassed
 * gate is worse than no gate — so the "must ALLOW" cases are the real spec.
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { decide, isMemoryFile, statusWords, hasExpiry, scanWindow } from './memory-expiry-gate.mjs';

const GATE = join(dirname(fileURLToPath(import.meta.url)), 'memory-expiry-gate.mjs');

let pass = 0;
const fail = [];
const t = (name, fn) => {
  try { fn(); pass += 1; console.log(`  PASS  ${name}`); }
  catch (e) { fail.push(name); console.log(`  FAIL  ${name}\n        ${e.message}`); }
};

const MEM = 'C:/Users/x/.claude/projects/proj/memory/project_thing.md';
const write = (content, file_path = MEM) => ({ tool_name: 'Write', tool_input: { file_path, content } });
const edit = (new_string, file_path = MEM) => ({ tool_name: 'Edit', tool_input: { file_path, new_string } });

console.log('memory-expiry-gate');

// ---- scope -----------------------------------------------------------------

t('recognises a memory file path (both slash styles)', () => {
  assert.equal(isMemoryFile(MEM), true);
  assert.equal(isMemoryFile('C:\\Users\\x\\.claude\\projects\\p\\memory\\a.md'), true);
});

t('MEMORY.md (the index) is deliberately out of scope', () => {
  assert.equal(isMemoryFile('C:/Users/x/.claude/projects/p/memory/MEMORY.md'), false);
});

t('non-memory paths are ignored', () => {
  assert.equal(isMemoryFile('C:/repo/src/thing.md'), false);
  assert.equal(isMemoryFile('C:/repo/docs/memory-notes.md'), false);
  assert.equal(isMemoryFile(undefined), false);
});

t('tools other than Write/Edit are ignored', () => {
  assert.equal(decide({ tool_name: 'Read', tool_input: { file_path: MEM, content: 'SHIPPED' } }), null);
});

// ---- must DENY -------------------------------------------------------------

t('DENY: undated SHIPPED', () => {
  const r = decide(write('---\nname: x\n---\n\nThe storefront SHIPPED on Tuesday.'));
  assert.ok(r, 'expected a denial');
  assert.match(r, /asserts a STATE \(SHIPPED\)/);
  assert.match(r, /review-after: YYYY-MM-DD/);
});

t('DENY: undated PENDING via Edit new_string', () => {
  const r = edit('The prod reset is PENDING and NOT executed.');
  assert.ok(decide(r), 'expected a denial on Edit');
});

t('DENY: every status word is named in the reason', () => {
  const r = decide(write('This is OBSOLETE, was SUPERSEDED, and is AWAITING review.'));
  assert.match(r, /OBSOLETE/);
  assert.match(r, /SUPERSEDED/);
  assert.match(r, /AWAITING/);
});

// ---- must ALLOW (the real spec) --------------------------------------------

t('ALLOW: status WITH review-after', () => {
  assert.equal(decide(write('---\nname: x\nreview-after: 2026-09-15\n---\n\nThe migration SHIPPED.')), null);
});

t('ALLOW: any accepted expiry key', () => {
  for (const k of ['expires', 'expires-at', 'verified-at', 'recheck-after']) {
    assert.equal(decide(write(`---\n${k}: 2026-09-01\n---\n\nPENDING work.`)), null, `${k} should satisfy the gate`);
  }
});

t('ALLOW: durable law with no status vocabulary', () => {
  assert.equal(decide(write('Rule: the canonical user table is "Users", not users.')), null);
});

t('ALLOW: prose containing a status word as part of another word', () => {
  // "pending" inside "impending", "shipped" inside "shipper" — word boundaries matter.
  assert.equal(statusWords('an impending change to the shipper module').length, 0);
});

t('ALLOW: a Write with no content field (nothing to judge)', () => {
  assert.equal(decide({ tool_name: 'Write', tool_input: { file_path: MEM } }), null);
});

// ---- calibration against the real corpus -----------------------------------
// Both of these were measured, not guessed. A whole-body scan denied 48/150
// real memories (32%); these two narrowings took it to 23/150 (15%), and every
// remaining denial is a project-state memory — zero durable `feedback_` laws.
// If either regresses, the gate goes back to denying permanent rules, which is
// how a hygiene gate earns a bypass.

t('CALIBRATION: a status word deep in the body is NOT a state claim', () => {
  // Real case: feedback_proof_before_done_rule_73 LISTS "shipped" among banned
  // words far below the opening. It is quoting vocabulary, not asserting state.
  const body = '---\nname: law\n---\n\nA permanent rule.\n\nNever say done/fixed/shipped without proof.';
  assert.equal(decide(write(body)), null, 'body prose must not trip the gate');
});

t('CALIBRATION: hyphen-compounded status words are adjectival, not assertions', () => {
  // Real case: feedback_verify_branch_freshness says "plan against
  // already-shipped code" in its description. \bSHIPPED\b matched it, because
  // a hyphen is a word boundary. It is a durable law and must pass.
  assert.equal(statusWords('you plan against already-shipped code').length, 0);
  assert.equal(statusWords('this SHIPPED yesterday').length, 1, 'the bare word still counts');
});

t('CALIBRATION: the scan window is frontmatter + first paragraph only', () => {
  const w = scanWindow('---\ndescription: "x PENDING"\n---\n\nopening line\n\nlater paragraph');
  assert.match(w, /PENDING/, 'frontmatter is in the window');
  assert.match(w, /opening line/, 'first paragraph is in the window');
  assert.doesNotMatch(w, /later paragraph/, 'later prose is out of the window');
});

// ---- helpers ---------------------------------------------------------------

t('hasExpiry only matches a frontmatter-style key at line start', () => {
  assert.equal(hasExpiry('review-after: 2026-09-01'), true);
  assert.equal(hasExpiry('we should review-after: shipping'), false, 'mid-sentence must not count');
});

// ---- end-to-end through the real binary ------------------------------------

const run = (payload) => {
  const r = spawnSync(process.execPath, [GATE], { input: JSON.stringify(payload), encoding: 'utf8' });
  const out = (r.stdout || '').trim();
  return { code: r.status, parsed: out ? JSON.parse(out) : null };
};

t('E2E: denial emits the PreToolUse deny shape', () => {
  const { code, parsed } = run(write('The thing SHIPPED.'));
  assert.equal(code, 0, 'hook must always exit 0');
  assert.equal(parsed.hookSpecificOutput.hookEventName, 'PreToolUse');
  assert.equal(parsed.hookSpecificOutput.permissionDecision, 'deny');
  assert.match(parsed.hookSpecificOutput.permissionDecisionReason, /MEMORY EXPIRY GATE/);
});

t('E2E: allow emits nothing', () => {
  const { code, parsed } = run(write('A durable fact with no state claim.'));
  assert.equal(code, 0);
  assert.equal(parsed, null);
});

t('E2E: FAIL-OPEN on unparseable stdin', () => {
  const r = spawnSync(process.execPath, [GATE], { input: 'not json at all', encoding: 'utf8' });
  assert.equal(r.status, 0);
  assert.equal((r.stdout || '').trim(), '', 'a broken payload must never block a write');
});

console.log(`\n${pass} passed, ${fail.length} failed`);
if (fail.length) { console.error('FAILED: ' + fail.join(', ')); process.exit(1); }

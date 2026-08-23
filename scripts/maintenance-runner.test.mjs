/**
 * maintenance-runner.test.mjs — coverage for the location guard.
 * Run: node scripts/maintenance-runner.test.mjs
 *
 * The guard is the entire safety argument for letting this run unattended. The catalog is
 * branch-relative state, so a regen in the wrong checkout produces a file that is internally
 * consistent, passes every check, and quietly describes the wrong tree. There is no conflict
 * to review and no error to notice — a generated file that shrank still looks like a
 * generated file. Every refusal case below is therefore a silent-corruption case, which is
 * why they are tested individually rather than as one "is it safe" boolean.
 */
import assert from 'node:assert/strict';
import { locationRefusal } from './maintenance-runner.mjs';

let pass = 0;
const fail = [];
const t = (name, fn) => {
  try { fn(); pass += 1; console.log(`  PASS  ${name}`); }
  catch (e) { fail.push(name); console.log(`  FAIL  ${name}\n        ${e.message}`); }
};

const SAFE = { branch: 'main', behind: 0, ahead: 0, dirty: false };

t('clean, current main → proceeds', () => {
  assert.equal(locationRefusal(SAFE), null);
});

t('not on main → refuses, and says why merging it forward is the danger', () => {
  const r = locationRefusal({ ...SAFE, branch: 'wip/comms-notifications-2026-07-05' });
  assert.ok(r, 'expected a refusal');
  assert.match(r, /not main/);
  assert.match(r, /merging it forward|shrink/i, 'refusal should name the deferred damage, not just the rule');
});

t('behind origin/main → refuses (would describe a tree nobody has)', () => {
  const r = locationRefusal({ ...SAFE, behind: 2170 });
  assert.ok(r);
  assert.match(r, /behind/);
  assert.match(r, /2170/, 'should quote the actual distance so the operator can judge it');
});

t('ahead of origin/main → refuses (unpushed commits nobody else can fetch)', () => {
  const r = locationRefusal({ ...SAFE, ahead: 3 });
  assert.ok(r);
  assert.match(r, /ahead/);
});

t('dirty tree → refuses (rows would key off SHAs nobody can fetch)', () => {
  const r = locationRefusal({ ...SAFE, dirty: true });
  assert.ok(r);
  assert.match(r, /dirty/);
});

t('branch check takes precedence over the others', () => {
  // A stale wip branch is usually ALSO behind and dirty. The wrong-branch message is the
  // one that explains the real hazard, so it must not be masked by a lesser complaint.
  const r = locationRefusal({ branch: 'wip/x', behind: 500, ahead: 2, dirty: true });
  assert.match(r, /not main/);
});

t('every refusal explains consequence, not just condition', () => {
  // A guard that only says "no" gets overridden. Each message must carry the why.
  for (const bad of [
    { ...SAFE, branch: 'wip/x' },
    { ...SAFE, behind: 5 },
    { ...SAFE, ahead: 5 },
    { ...SAFE, dirty: true },
  ]) {
    const r = locationRefusal(bad);
    assert.ok(r.length > 80, `refusal too terse to act on: ${r}`);
    assert.match(r, /would|describes|match/i, `refusal states no consequence: ${r}`);
  }
});

t('the safe case is genuinely narrow — any single deviation refuses', () => {
  const deviations = [
    { branch: 'develop' }, { behind: 1 }, { ahead: 1 }, { dirty: true },
  ];
  for (const d of deviations) {
    assert.ok(locationRefusal({ ...SAFE, ...d }), `should refuse for ${JSON.stringify(d)}`);
  }
});

console.log(`\nmaintenance-runner: ${pass} passed, ${fail.length} failed`);
if (fail.length) process.exit(1);

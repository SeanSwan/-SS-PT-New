/** SWAN-CHART-V3 planning validator. Checks artifacts, NOT runtime behavior or full Mermaid parsing. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = dirname(fileURLToPath(import.meta.url));
const read = name => readFileSync(resolve(root, name), 'utf8');
const docs = ['README.md','01-review-and-baseline.md','02-experience-and-wireframes.md',
  '03-metric-registry.md','04-contracts.md','05-flows.md','06-tests-and-traceability.md',
  '07-luna-handoff.md','08-readiness.md','09-adoption-register.md','10-approved-uniformity.md',
  '11-s0-readiness.md','12-worldwide-weight-units.md','13-kg0-verification.md',
  '14-external-review-gate.md','15-kg1-preflight.md','16-kg1a-db-guard.md','17-kg1a-verification.md',
  '18-workout-log-field-census.md','19-kg1b0-same-handle.md','20-kg1b0-verification.md','21-kg1b1-storage.md',
  '22-kg1b1-verification.md','23-writer-decision-receipt.md','24-history-writer-surface-receipt.md',
  '25-kg1c0-writer-draft-contract.md','26-kg1c0-verification.md','27-kg1c1-mounted-contract.md',
  '28-kg1c1-verification.md'];
test('P01 all governing documents exist with identity/owner/version/status', () => {
  for (const name of docs) {
    assert.ok(existsSync(resolve(root,name)), name);
    for (const field of ['artifact_id:', 'owner:', 'version:', 'status:']) assert.ok(read(name).includes(field), `${name}: ${field}`);
  }
});
test('P02 local Markdown links resolve', () => {
  for (const name of docs) for (const match of read(name).matchAll(/\]\(([^)]+)\)/g)) {
    const link = match[1].split('#')[0];
    if (!link || /^(https?:|[A-Z]:)/.test(link)) continue;
    assert.ok(existsSync(resolve(root,link)), `${name}: ${link}`);
  }
});
test('P03 exactly fifteen canonical metric rows', () => {
  const registry=read('03-metric-registry.md');
  const ids=['workoutFrequency','attendanceReliability','weeklyVolume','setsRepsTrend','durationTrend',
    'intensityRpeTrend','prTimeline','anchorLifts','exerciseFrequency','movementPatternBalance',
    'muscleGroupBalance','recoverySignal','weightTrend','bodyFatTrend','estOneRm'];
  assert.equal((registry.match(/^\| `\w+` \/ /gm)||[]).length,15);
  for (const id of ids) assert.equal(registry.split(`| \`${id}\` /`).length-1,1,id);
});
test('P04 all executable RED IDs have traceability rows', () => {
  const tests=read('acceptance.red.mjs');
  const matrix=read('06-tests-and-traceability.md');
  const ids=[...tests.matchAll(/test\('(M\d+) /g)].map(m=>m[1]);
  assert.equal(ids.length,12);
  assert.equal(new Set(ids).size,12);
  for (const id of ids) assert.match(matrix,new RegExp(`\\| ${id} `));
});
test('P05 diagrams have balanced fences and required adverse paths', () => {
  const text=read('05-flows.md');
  assert.equal((text.match(/^```mermaid$/gm)||[]).length,5);
  assert.equal((text.match(/^```$/gm)||[]).length,5);
  for (const word of ['locked','denied','Discard','rollback','Stop']) assert.ok(text.includes(word),word);
  // This is structural lint. A real Mermaid parser/browser render is still a separate gate.
});
test('P06 approved scope preserves role and slice authorization gates', () => {
  assert.match(read('README.md'),/S0 is authorized now/);
  assert.match(read('README.md'),/Lead Codex owns design and review; Luna owns implementation/);
  assert.match(read('07-luna-handoff.md'),/STOP — S/);
  assert.match(read('07-luna-handoff.md'),/S1 remains gated by S0/);
  assert.match(read('10-approved-uniformity.md'),/No push, deploy/);
});
test('P07 synthetic preview arithmetic and external-resource exclusion', () => {
  const values=[1,2,1,2,2,2,3,3,3,3,3,2];
  assert.equal(values.slice(7,11).reduce((a,b)=>a+b,0),12);
  assert.equal(values.slice(3,7).reduce((a,b)=>a+b,0),9);
  for(const name of ['preview.html','preview.css','preview.js']) assert.doesNotMatch(read(name),/(?:src|href)=["']https?:|url\(["']?https?:/);
  assert.match(read('preview.html'),/Synthetic examples/);
});
test('P08 new authoring files remain within 300 lines', () => {
  for(const name of readdirSync(root)) if(/\.(md|mjs|html|css|js)$/.test(name)) {
    assert.ok(read(name).split('\n').length<=300,`${name}: exceeds line cap`);
  }
});
test('P09 all 44 acceptance IDs are unique and present', () => {
  const matrix=read('06-tests-and-traceability.md');
  const ids=[...matrix.matchAll(/^\| ([MBCE]\d{2}|X\d{2}) /gm)].map(m=>m[1]);
  assert.equal(ids.length,44);
  assert.equal(new Set(ids).size,44);
});

test('P10 twelve uniformity gates supplement, not replace, original acceptance', () => {
  const ids=[...read('10-approved-uniformity.md').matchAll(/^\| (U\d{2}) /gm)].map(m=>m[1]);
  assert.deepEqual(ids,Array.from({length:12},(_,i)=>`U${String(i+1).padStart(2,'0')}`));
  assert.match(read('06-tests-and-traceability.md'),/56 specified cases, not 56 passing tests/);
  for(const name of ['README.md','07-luna-handoff.md','09-adoption-register.md']) {
    assert.ok(read(name).includes('10-approved-uniformity.md'), name);
  }
});

test('P11 approved visual reference is byte-identical', () => {
  const expected={
    'preview.html':'457a107695e93a57d896b8e0756092641f4b7ddbc6a5ffbcce3b50a9728aa0ac',
    'preview.css':'b1a5ef74eca075718c050c20523c1d3810f1ca327777a1f7d4773c50924893fb',
    'preview.js':'ee6e5ec11bd2ecdb67929563238cf6c18c641ea6b75561ec02464befc7c82076',
  };
  for(const [name,hash] of Object.entries(expected)) {
    assert.equal(createHash('sha256').update(readFileSync(resolve(root,name))).digest('hex'),hash,name);
    assert.ok(read('10-approved-uniformity.md').includes(hash),name);
  }
});

test('P12 unit extension has twenty cases and eight executable mappings', () => {
  const units=read('12-worldwide-weight-units.md');
  const ids=[...units.matchAll(/^\| (KG\d{2}) /gm)].map(m=>m[1]);
  assert.deepEqual(ids,Array.from({length:20},(_,i)=>`KG${String(i+1).padStart(2,'0')}`));
  const executable=[...read('weight-units.red.mjs').matchAll(/test\('(KG\d{2}) /g)].map(m=>m[1]);
  assert.deepEqual(executable,ids.slice(0,8));
  for(const word of ['KG0 and additive KG1b1 storage are locally verified','No automatic backfill','76 specified cases']) {
    assert.ok(units.includes(word),word);
  }
  for(const name of ['README.md','07-luna-handoff.md','06-tests-and-traceability.md']) {
    assert.ok(read(name).includes('12-worldwide-weight-units.md'),name);
  }
});

test('P13 KG0 evidence has separate real-caller and boundary gates', () => {
  for(const name of ['verify-weight-types.mjs','verify-weight-boundaries.mjs','13-kg0-verification.md']) {
    assert.ok(existsSync(resolve(root,name)),name);
  }
  assert.match(read('verify-weight-types.mjs'),/negative.includes\(7016\)/);
  assert.match(read('verify-weight-types.mjs'),/negative.includes\(2578\)/);
  assert.match(read('13-kg0-verification.md'),/KG1 is not implemented/);
  assert.match(read('12-worldwide-weight-units.md'),/weight\.d\.mts/);
});

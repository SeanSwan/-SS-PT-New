/**
 * SCU final review integration — planning coverage, NOT runtime acceptance.
 * Owner: final local reviewer. Inputs: canonical plan and immutable model receipts.
 * Purpose: catch omitted review context, dead handoff links and undefined gates.
 * Run explicitly with node --test; no DB, server, provider or environment load.
 * Failure: incomplete plan or changed evidence; never edit a test just to pass.
 * Limits: text assertions prove documentation coverage, not implementation truth.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const packet = fileURLToPath(new URL('../', import.meta.url));
const read = name => readFileSync(resolve(packet, name), 'utf8');
const hash = value => createHash('sha256').update(value).digest('hex');
const contains = (body, patterns) => patterns.forEach(pattern =>
  assert.ok(pattern.test(body), `Missing planning coverage: ${pattern}`));

test('RI01 final start-here links resolve and no required artifact is missing', () => {
  for (const file of ['11-comprehensive-handoff.md', '12-astra-review.md',
    '13-foundation-execution.md', '14-experience-execution.md',
    '15-acceptance-and-release.md', '16-state-and-data-flows.md',
    '17-astra-readiness.md', 'session-desk-review.html']) {
    assert.ok(existsSync(resolve(packet, file)), `Missing final artifact: ${file}`);
  }
  const source = read('11-comprehensive-handoff.md');
  const links = [...source.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)].map(match => match[1]);
  for (const link of links.filter(link => !/^(https?:|#)/.test(link))) {
    assert.ok(existsSync(resolve(packet, link.split('#')[0])), `Dead handoff link: ${link}`);
  }
});

test('RI02 original paired model artifacts still match their exact receipt', () => {
  const dir = 'evidence/panel-20260905-hostile-r3-dispatch/';
  const receipt = JSON.parse(read(`${dir}PANEL-ARTIFACT-RECEIPT.json`));
  assert.equal(receipt.seats.length, 2);
  for (const [seat, model, file] of [
    ['glm', 'glm-5.3', 'GLM-PANEL-REVIEW.md'],
    ['glmflash', 'glm-5.3-flash', 'GLM-5.3-FLASH-PANEL-REVIEW.md'],
  ]) {
    const entry = receipt.seats.find(entry => entry.seat === seat);
    assert.equal(entry?.status, 'valid');
    assert.equal(entry.model, model);
    const body = read(`${dir}${file}`);
    assert.equal(hash(readFileSync(resolve(packet, dir, file))), entry.replySha256);
    assert.ok(body.includes(`**Requested:** \`${model}\``));
    assert.ok(body.includes(`**Served:** \`${model}\``));
  }
  assert.equal(hash(readFileSync(resolve(packet, 'evidence/glm-blueprint-review-packet-20260905.md'))), receipt.documentSha256);
});

test('RI03 canonical adjudication integrates reviews without claiming proven P0s', () => {
  const body = read('12-astra-review.md');
  contains(body, [/hostile-r3-review\.md/, /R3-1/, /R3-3/, /AF13/, /GLM/i,
    /unsupported|speculative|unproven/i, /advisory|packet.only/i]);
});

test('RI04 S1 names the logger producer and the shared default-provenance boundary', () => {
  const body = read('13-foundation-execution.md').split('## S2')[0];
  contains(body, [/useWorkoutLoggerDictation/, /useCoachCommand/, /voice|mixed/i,
    /unknown/i, /text/i]);
});

test('RI05 S3 specifies no-change truth, stable retry identity and a finite scan budget', () => {
  const body = read('13-foundation-execution.md').split('## S3')[1]?.split('## S4')[0] ?? '';
  contains(body, [/No data was changed|no.change/i, /unknown/i, /same|retain/i,
    /key|intent/i, /500/, /10 query batches/, /empty page/i, /lookahead/i]);
});

test('RI06 review findings have acceptance mappings, not only prose adjudication', () => {
  const body = read('15-acceptance-and-release.md');
  contains(body, [/R3-1/, /R3-3/, /AF13|R3-2/, /T13/, /T01|T03/,
    /query|scan/i, /provenance|dictation/i]);
});

test('RI07 diagram distinguishes unknown recovery from explicit known-rollback retry', () => {
  const body = read('16-state-and-data-flows.md');
  contains(body, [/unknown -->/, /failed --> awaiting_approval/,
    /never retry write|no replay|without replay/i, /response/i]);
  assert.doesNotMatch(body, /unknown\s*-->\s*(executing|awaiting_approval)/);
});

test('RI08 readiness keeps plan completeness separate from unresolved runtime evidence', () => {
  const body = read('17-astra-readiness.md');
  contains(body, [/review-integration\.test\.mjs/, /runtime/i, /REVISE|blocked|incomplete/i,
    /next|S0-R|S1-close/i, /snapshot|preserv/i]);
});

test('RI09 empty pages preserve cursor continuation and authorized lookahead', () => {
  const body = read('15-acceptance-and-release.md');
  contains(body, [/empty page is not EOF/i, /nextCursor:null/, /lookahead/i,
    /same actor\/filter/, /zero skips or\s+duplicates/i]);
  assert.ok(!body.includes('empty page terminates'), 'Ambiguous empty-page termination contract returned');
});

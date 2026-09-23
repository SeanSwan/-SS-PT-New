import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync, utimesSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  GLM_BATCH_APPROVAL_PHRASE,
  GLM_MAX_OUTPUT_TOKENS,
  GLM_REVIEW_ROUND_LIMIT,
  approveNextGlmBatch,
  appendGlmLedger,
  assertGlmPolicy,
  acquireGlmLock,
  readGlmLedger,
} from './glm-consumption-guard.mjs';

test('transport refuses output ceilings above 34K', () => {
  assert.equal(GLM_MAX_OUTPUT_TOKENS, 34_000);
  assert.throws(
    () => assertGlmPolicy({ maxTokens: 64_000, events: [], now: new Date('2026-08-30T12:00:00-07:00') }),
    /34,000/,
  );
});

test('provider-default policy is explicit and bypasses only the numeric output ceiling', () => {
  const policy = assertGlmPolicy({
    maxTokens: null,
    tokenPolicy: 'provider-default',
    events: [],
    reviewRoundId: 'provider_default_01',
  });
  assert.equal(policy.tokenPolicy, 'provider-default');
  assert.throws(
    () => assertGlmPolicy({ maxTokens: null, events: [], reviewRoundId: 'provider_default_02' }),
    /positive integer/,
  );
});

test('review gate allows 15 distinct rounds, allows the second seat, and blocks round 16', () => {
  assert.equal(GLM_REVIEW_ROUND_LIMIT, 15);
  const events = Array.from({ length: 15 }, (_, index) => ({
    event: 'started',
    at: `2026-08-${String(index + 1).padStart(2, '0')}T12:00:00-07:00`,
    reviewRoundId: `panel_${index + 1}`,
  }));
  assert.doesNotThrow(() => assertGlmPolicy({
    maxTokens: 34_000,
    events,
    reviewRoundId: 'panel_15',
  }));
  assert.throws(
    () => assertGlmPolicy({ maxTokens: 34_000, events, reviewRoundId: 'panel_16' }),
    /15-review-round checkpoint reached.*explicit owner approval/i,
  );
});

test('legacy started events without a review-round id do not consume the new checkpoint', () => {
  const legacyEvents = Array.from({ length: 20 }, (_, index) => ({
    event: 'started',
    at: `2026-08-30T${String(index % 10).padStart(2, '0')}:00:00-07:00`,
  }));
  const policy = assertGlmPolicy({
    maxTokens: 34_000,
    events: legacyEvents,
    reviewRoundId: 'panel_newpolicy',
  });
  assert.equal(policy.roundsStarted, 0);
  assert.equal(policy.remainingAfterRoundStart, 14);
});

test('an explicit approval marker opens one new 15-round batch and cannot be pre-approved', () => {
  const root = mkdtempSync(join(tmpdir(), 'glm-approval-'));
  const ledgerPath = join(root, 'usage.jsonl');
  const lockPath = join(root, 'usage.lock');

  assert.throws(
    () => approveNextGlmBatch({ ledgerPath, lockPath, confirmation: GLM_BATCH_APPROVAL_PHRASE }),
    /cannot pre-approve/i,
  );
  for (let index = 1; index <= 15; index += 1) {
    appendGlmLedger(ledgerPath, {
      event: 'started', model: 'glm-5.3-flash', maxTokens: 34_000,
      reviewRoundId: `panel_${index}`,
    });
  }
  assert.throws(
    () => approveNextGlmBatch({ ledgerPath, lockPath, confirmation: 'yes' }),
    /exact owner-approval phrase/i,
  );
  approveNextGlmBatch({ ledgerPath, lockPath, confirmation: GLM_BATCH_APPROVAL_PHRASE });

  const events = readGlmLedger(ledgerPath);
  assert.doesNotThrow(() => assertGlmPolicy({
    maxTokens: 34_000,
    events,
    reviewRoundId: 'panel_16',
  }));
  assert.equal(events.at(-1).event, 'batch-approved');
  assert.equal(events.at(-1).roundsApproved, 15);
  assert.doesNotMatch(readFileSync(ledgerPath, 'utf8'), new RegExp(GLM_BATCH_APPROVAL_PHRASE));

  const nextBatch = Array.from({ length: 15 }, (_, index) => ({
    event: 'started',
    reviewRoundId: `next_${index + 1}`,
  }));
  assert.throws(
    () => assertGlmPolicy({
      maxTokens: 34_000,
      events: [...events, ...nextBatch],
      reviewRoundId: 'next_16_round',
    }),
    /15-review-round checkpoint reached/,
  );
  rmSync(root, { recursive: true, force: true });
});

test('single-flight lock rejects a concurrent GLM transport', () => {
  const root = mkdtempSync(join(tmpdir(), 'glm-guard-'));
  const lockPath = join(root, 'glm.lock');
  const first = acquireGlmLock(lockPath);
  assert.throws(() => acquireGlmLock(lockPath), /already active/);
  first.release();
  const second = acquireGlmLock(lockPath);
  second.release();
  rmSync(root, { recursive: true, force: true });
});

test('ledger writes an allowlisted no-secret record', () => {
  const root = mkdtempSync(join(tmpdir(), 'glm-ledger-'));
  const ledgerPath = join(root, 'usage.jsonl');
  appendGlmLedger(ledgerPath, {
    event: 'started', model: 'glm-5.3-flash', maxTokens: 34_000,
    promptChars: 1234, reviewRoundId: 'panel_1234',
    apiKey: 'must-not-appear', document: 'private-path.md',
  });
  const saved = readFileSync(ledgerPath, 'utf8');
  assert.match(saved, /glm-5\.3-flash/);
  assert.match(saved, /panel_1234/);
  assert.doesNotMatch(saved, /must-not-appear|private-path/);
  rmSync(root, { recursive: true, force: true });
});

test('unknown execution stays locked even after stale PID and age thresholds', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'glm-unresolved-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const lockPath = join(root, 'glm.lock');
  const lock = acquireGlmLock(lockPath);
  lock.markUnresolved();
  const stored = JSON.parse(readFileSync(lockPath, 'utf8'));
  writeFileSync(lockPath, JSON.stringify({ ...stored, pid: -1 }));
  utimesSync(lockPath, new Date(0), new Date(0));
  assert.throws(() => acquireGlmLock(lockPath), /unresolved.*reconciliation/);
  assert.equal(JSON.parse(readFileSync(lockPath, 'utf8')).state, 'unresolved');
});

test('unreadable old lock is not removed and a changed owner is never released', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'glm-owner-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const lockPath = join(root, 'glm.lock');
  const lock = acquireGlmLock(lockPath);
  writeFileSync(lockPath, '{invalid');
  utimesSync(lockPath, new Date(0), new Date(0));
  assert.throws(() => acquireGlmLock(lockPath), /unreadable/);
  writeFileSync(lockPath, JSON.stringify({ pid: process.pid, token: 'another-owner' }));
  assert.throws(() => lock.release(), /ownership changed/);
  assert.equal(JSON.parse(readFileSync(lockPath, 'utf8')).token, 'another-owner');
});

/**
 * @file attempt-journal.mjs
 * @description Immutable, metadata-only provider attempt records for crash reconciliation.
 *
 * Records never contain prompts, completions, credentials, or arbitrary error messages. Each
 * state is written once with `wx`, so an existing attempt cannot be silently reused or rewritten.
 * These records are diagnostic evidence only; they never authorize a retry or a clean verdict.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const ATTEMPT_ID = /^[A-Za-z0-9_-]{16,160}$/;
const STATES = new Set(['AUTHORIZED', 'DISPATCH_STARTED', 'RESPONSE_HEADERS', 'COMPLETED', 'FAILED']);
const STRING_FIELDS = new Set(['model', 'generationId', 'packetHash', 'sourceHash', 'scopeHash', 'errorCode']);
const NUMBER_FIELDS = new Set(['status', 'inTok', 'outTok', 'cost', 'wallMs', 'maxUsd']);

export function defaultAttemptRoot() {
  return join(tmpdir(), 'swan-context-attempts');
}

function safeDetail(event) {
  const detail = {};
  for (const [key, value] of Object.entries(event)) {
    if (key === 'state') continue;
    if (STRING_FIELDS.has(key) && typeof value === 'string' && value.length <= 256) detail[key] = value;
    if (NUMBER_FIELDS.has(key) && Number.isFinite(value)) detail[key] = value;
  }
  return detail;
}

export function recordProviderAttemptEvent(attemptId, event, {
  root = defaultAttemptRoot(), now = new Date().toISOString(),
} = {}) {
  if (!ATTEMPT_ID.test(String(attemptId ?? ''))) throw new Error('Invalid provider attempt id');
  if (!STATES.has(event?.state)) throw new Error('Invalid provider attempt state');
  mkdirSync(root, { recursive: true });
  const body = {
    schema: 'swan-context.provider-attempt.v1', attemptId, state: event.state,
    observedAt: now, detail: safeDetail(event),
  };
  const recordHash = createHash('sha256').update(JSON.stringify(body)).digest('hex');
  const path = join(root, `${attemptId}.${event.state}.json`);
  writeFileSync(path, `${JSON.stringify({ ...body, recordHash }, null, 2)}\n`, {
    encoding: 'utf8', flag: 'wx', mode: 0o600,
  });
  return path;
}

function hashBody(body) {
  return createHash('sha256').update(JSON.stringify(body)).digest('hex');
}

export function readProviderAttempt(attemptId, { root = defaultAttemptRoot() } = {}) {
  if (!ATTEMPT_ID.test(String(attemptId ?? ''))) throw new Error('Invalid provider attempt id');
  if (!existsSync(root)) return Object.freeze({ attemptId, status: 'MISSING', generationId: null, retrySafe: false, events: [] });
  const prefix = `${attemptId}.`;
  const records = [];
  let corrupt = false;
  for (const name of readdirSync(root).filter((item) => item.startsWith(prefix) && item.endsWith('.json'))) {
    try {
      const record = JSON.parse(readFileSync(join(root, name), 'utf8'));
      const { recordHash, ...body } = record;
      if (body.schema !== 'swan-context.provider-attempt.v1' || body.attemptId !== attemptId ||
          !STATES.has(body.state) || hashBody(body) !== recordHash) {
        corrupt = true;
      } else records.push(body);
    } catch {
      corrupt = true;
    }
  }
  records.sort((left, right) => String(left.observedAt).localeCompare(String(right.observedAt)));
  const states = new Set(records.map((record) => record.state));
  const status = corrupt ? 'CORRUPT' : states.has('COMPLETED') ? 'COMPLETED' :
    states.has('FAILED') ? 'FAILED' : states.has('RESPONSE_HEADERS') ? 'UNRESOLVED_AFTER_HEADERS' :
      states.has('DISPATCH_STARTED') ? 'UNRESOLVED_AFTER_DISPATCH' :
        states.has('AUTHORIZED') ? 'AUTHORIZED_NOT_DISPATCHED' : 'MISSING';
  const generationId = [...records].reverse().find((record) => record.detail?.generationId)?.detail.generationId ?? null;
  return Object.freeze({ attemptId, status, generationId, retrySafe: false, events: Object.freeze(records) });
}

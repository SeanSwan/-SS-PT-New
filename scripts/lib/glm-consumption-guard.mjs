import {
  appendFileSync,
  closeSync,
  mkdirSync,
  openSync,
  readFileSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { randomUUID } from 'node:crypto';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

export const GLM_MAX_OUTPUT_TOKENS = 34_000;
export const GLM_REVIEW_ROUND_LIMIT = 15;
export const GLM_BATCH_APPROVAL_PHRASE = 'APPROVE NEXT 15 GLM REVIEW ROUNDS';
export const GLM_TOKEN_POLICY_PROVIDER_DEFAULT = 'provider-default';

const stateRoot = process.env.LOCALAPPDATA
  ? join(process.env.LOCALAPPDATA, 'SwanAI')
  : join(homedir(), '.swan-ai');

export const DEFAULT_GLM_LEDGER_PATH = join(stateRoot, 'glm-usage.jsonl');
export const DEFAULT_GLM_LOCK_PATH = join(stateRoot, 'glm-call.lock');

function currentBatchRoundIds(events) {
  const approvalIndex = events.findLastIndex((event) => event.event === 'batch-approved');
  const rounds = new Set();
  events.slice(approvalIndex + 1).forEach((event) => {
    if (event.event !== 'started' || !event.reviewRoundId) return;
    rounds.add(event.reviewRoundId);
  });
  return rounds;
}

export function readGlmLedger(path = DEFAULT_GLM_LEDGER_PATH) {
  try {
    return readFileSync(path, 'utf8').split(/\r?\n/).filter(Boolean).flatMap((line) => {
      try { return [JSON.parse(line)]; } catch { return []; }
    });
  } catch (error) {
    if (error?.code === 'ENOENT') return [];
    throw error;
  }
}

export function assertGlmPolicy({
  maxTokens,
  tokenPolicy = 'numeric',
  events,
  reviewRoundId,
  roundLimit = GLM_REVIEW_ROUND_LIMIT,
}) {
  if (tokenPolicy !== 'numeric' && tokenPolicy !== GLM_TOKEN_POLICY_PROVIDER_DEFAULT) {
    throw new Error(`Unsupported GLM token policy: ${tokenPolicy}`);
  }
  if (tokenPolicy === GLM_TOKEN_POLICY_PROVIDER_DEFAULT) {
    if (maxTokens !== null) {
      throw new Error('GLM provider-default policy requires maxTokens to be null.');
    }
  } else {
    if (!Number.isInteger(maxTokens) || maxTokens <= 0) {
      throw new Error('GLM max_tokens must be a positive integer.');
    }
    if (maxTokens > GLM_MAX_OUTPUT_TOKENS) {
      throw new Error(`GLM max_tokens exceeds the hard 34,000 output-token ceiling (${maxTokens}).`);
    }
  }
  if (typeof reviewRoundId !== 'string' || !/^[A-Za-z0-9_-]{8,80}$/.test(reviewRoundId)) {
    throw new Error('GLM reviewRoundId must be a secret-free identifier using 8-80 letters, numbers, underscores, or hyphens.');
  }
  const roundIds = currentBatchRoundIds(events);
  const existingRound = roundIds.has(reviewRoundId);
  if (!existingRound && roundIds.size >= roundLimit) {
    throw new Error(
      `GLM ${roundLimit}-review-round checkpoint reached (${roundIds.size}/${roundLimit}); no request sent. ` +
      `Explicit owner approval is required before the next batch. After approval, run: ` +
      `node scripts/approve-glm-batch.mjs --confirmation "${GLM_BATCH_APPROVAL_PHRASE}"`,
    );
  }
  return {
    reviewRoundId,
    tokenPolicy,
    roundsStarted: roundIds.size,
    existingRound,
    remainingAfterRoundStart: roundLimit - roundIds.size - (existingRound ? 0 : 1),
  };
}

function pidIsLive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try { process.kill(pid, 0); return true; } catch { return false; }
}

export function acquireGlmLock(path = DEFAULT_GLM_LOCK_PATH) {
  mkdirSync(dirname(path), { recursive: true });
  let descriptor;
  try {
    descriptor = openSync(path, 'wx');
  } catch (error) {
    if (error?.code !== 'EEXIST') throw error;
    let owner = {};
    try { owner = JSON.parse(readFileSync(path, 'utf8')); } catch {
      throw new Error('GLM lock is unreadable; manual reconciliation required.');
    }
    if (owner.state === 'unresolved') {
      throw new Error('GLM execution is unresolved; terminal reconciliation is required before another call.');
    }
    const ageMs = Date.now() - statSync(path).mtimeMs;
    if (pidIsLive(Number(owner.pid)) || ageMs < 30 * 60 * 1000) {
      throw new Error(`A GLM request is already active (pid=${owner.pid || 'unknown'}).`);
    }
    unlinkSync(path);
    descriptor = openSync(path, 'wx');
  }
  const owner = { pid: process.pid, at: new Date().toISOString(), token: randomUUID() };
  writeFileSync(descriptor, JSON.stringify(owner));
  closeSync(descriptor);
  let released = false;
  return {
    markUnresolved() {
      // Persist BEFORE the socket call. A crash/timeout is not proof the provider stopped.
      const current = JSON.parse(readFileSync(path, 'utf8'));
      if (current.token !== owner.token) throw new Error('GLM lock ownership changed.');
      writeFileSync(path, JSON.stringify({ ...owner, state: 'unresolved' }));
    },
    release() {
      if (released) return;
      released = true;
      try {
        const current = JSON.parse(readFileSync(path, 'utf8'));
        if (current.token !== owner.token) throw new Error('GLM lock ownership changed.');
        unlinkSync(path);
      } catch (error) { if (error?.code !== 'ENOENT') throw error; }
    },
  };
}

export function appendGlmLedger(path = DEFAULT_GLM_LEDGER_PATH, event = {}) {
  mkdirSync(dirname(path), { recursive: true });
  const safe = {
    at: event.at || new Date().toISOString(),
    event: event.event,
    model: event.model,
    maxTokens: event.maxTokens,
    tokenPolicy: event.tokenPolicy,
    promptChars: event.promptChars,
    httpStatus: event.httpStatus,
    promptTokens: event.promptTokens,
    completionTokens: event.completionTokens,
    totalTokens: event.totalTokens,
    result: event.result,
    reason: event.reason,
    reviewRoundId: event.reviewRoundId,
    roundsApproved: event.roundsApproved,
  };
  appendFileSync(path, `${JSON.stringify(safe)}\n`, 'utf8');
}

/**
 * INF-5 / GLM-seat deadlock: a crashed call leaves `{state:'unresolved'}` and
 * acquireGlmLock refuses every later call, because the unresolved check runs BEFORE the
 * 30-minute staleness rule — so age never applies. The guard demanded "terminal
 * reconciliation" and shipped no way to perform one, which converts a transient crash
 * into a permanent outage. Observed live 2026-09-13.
 *
 * COMPARE-AND-CLEAR is the whole point. A first attempt at this recovery read the lock,
 * verified the owner was dead, and then cleared it — but the pid had CHANGED between the
 * read and the clear, so a live holder's lock was discarded and two GLM calls ran
 * concurrently. Therefore this function re-derives liveness and re-reads the record at
 * the moment of clearing, and refuses whenever the owner is alive or the token moved.
 *
 * The ledger append is written directly rather than through appendGlmLedger because that
 * helper whitelists fields and would drop pid/token — the owner identity that makes this
 * record auditable after the fact.
 */
export function reconcileGlmLock({
  path = DEFAULT_GLM_LOCK_PATH,
  ledgerPath = DEFAULT_GLM_LEDGER_PATH,
  reason,
  evidence,
  by = 'operator',
  readLock = (target) => readFileSync(target, 'utf8'),
} = {}) {
  if (typeof reason !== 'string' || reason.trim() === '') {
    throw new Error('reconcileGlmLock requires a reason describing why the lock is being cleared.');
  }
  let owner;
  try {
    owner = JSON.parse(readLock(path));
  } catch (error) {
    if (error?.code === 'ENOENT') return { reconciled: false, detail: 'no lock present' };
    throw new Error('GLM lock is unreadable; manual reconciliation required.');
  }

  // Re-check liveness NOW — not at diagnosis time.
  const ownerAlive = pidIsLive(Number(owner.pid));
  if (ownerAlive) {
    throw new Error(`Refusing to reconcile a live lock (pid=${owner.pid}). The owner process is still running.`);
  }

  // Re-read and confirm the record has not moved. If another holder acquired it between
  // the read above and this point, the token differs and we must not clear it.
  const confirm = JSON.parse(readLock(path));
  if (confirm.token !== owner.token || Number(confirm.pid) !== Number(owner.pid)) {
    throw new Error('GLM lock ownership changed during reconciliation; nothing was cleared. Re-run to re-check.');
  }

  const lockAgeMs = Date.now() - statSync(path).mtimeMs;
  mkdirSync(dirname(ledgerPath), { recursive: true });
  appendFileSync(ledgerPath, `${JSON.stringify({
    at: new Date().toISOString(),
    event: 'reconciled',
    reason,
    evidence: evidence || null,
    by,
    pid: owner.pid,
    token: owner.token,
    lockAcquiredAt: owner.at,
    lockState: owner.state || null,
    lockAgeMs,
    ownerAlive: false,
  })}\n`, 'utf8');

  unlinkSync(path);
  return { reconciled: true, pid: owner.pid, token: owner.token, lockAgeMs };
}

export function approveNextGlmBatch({
  ledgerPath = DEFAULT_GLM_LEDGER_PATH,
  lockPath = DEFAULT_GLM_LOCK_PATH,
  confirmation,
}) {
  if (confirmation !== GLM_BATCH_APPROVAL_PHRASE) {
    throw new Error(`Use the exact owner-approval phrase: ${GLM_BATCH_APPROVAL_PHRASE}`);
  }
  const lock = acquireGlmLock(lockPath);
  try {
    const events = readGlmLedger(ledgerPath);
    const rounds = currentBatchRoundIds(events).size;
    if (rounds < GLM_REVIEW_ROUND_LIMIT) {
      throw new Error(
        `Cannot pre-approve a GLM batch (${rounds}/${GLM_REVIEW_ROUND_LIMIT} review rounds used).`,
      );
    }
    appendGlmLedger(ledgerPath, {
      event: 'batch-approved',
      roundsApproved: GLM_REVIEW_ROUND_LIMIT,
    });
    return { roundsClosed: rounds, roundsApproved: GLM_REVIEW_ROUND_LIMIT };
  } finally {
    lock.release();
  }
}

export function beginGlmCall({ model, maxTokens, tokenPolicy, promptChars, reviewRoundId }) {
  const lock = acquireGlmLock();
  try {
    const policy = assertGlmPolicy({ maxTokens, tokenPolicy, events: readGlmLedger(), reviewRoundId });
    appendGlmLedger(DEFAULT_GLM_LEDGER_PATH, {
      event: 'started', model, maxTokens, tokenPolicy, promptChars, reviewRoundId,
    });
    return { lock, policy, ledgerPath: DEFAULT_GLM_LEDGER_PATH };
  } catch (error) {
    lock.release();
    throw error;
  }
}

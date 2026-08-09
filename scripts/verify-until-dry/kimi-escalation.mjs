/**
 * @file kimi-escalation.mjs
 * @description Fail-closed Kimi K3 preflight and single-shot dispatch planning.
 *
 * Kimi remains design-ceiling under repository policy. The original evidence
 * manifest is screened before a sanitized temp packet can reach consult-kimi.
 */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { enforceCeiling, estimateCost, getProvider } from '../context-gateway/src/providers.mjs';
import { executeCommand } from './fenced-runner.mjs';
import { canonicalJson, sha256 } from './ledger.mjs';

const REMIT = `You are Kimi K3 acting as an independent hostile logic reviewer. Attack the supplied
state machine, invariants, edge cases, failure handling, concurrency assumptions, and false-clean
paths. Return VERDICT: CLEAN or REVISE, then only reproducible findings with severity, evidence id,
failing scenario, and the smallest safe repair direction. For CLEAN, the second and only remaining
nonblank line must be exactly: No reproducible findings. Never trust builder conclusions.`;
const READY_PLANS = new WeakSet();
const NONCE = /^[A-Za-z0-9_-]{16,128}$/;

function sameList(left, right) {
  return Array.isArray(left) && Array.isArray(right) &&
    canonicalJson(left) === canonicalJson(right);
}

function packetIntegrityValid(packet) {
  if (!packet || typeof packet.text !== 'string' || typeof packet.canonical !== 'string' ||
      !/^[a-f0-9]{64}$/.test(String(packet.textHash ?? '')) ||
      !/^[a-f0-9]{64}$/.test(String(packet.hash ?? '')) ||
      sha256(packet.text) !== packet.textHash || sha256(packet.canonical) !== packet.hash) return false;
  try {
    const bound = JSON.parse(packet.canonical);
    const manifest = bound?.packet?.evidenceManifest;
    return canonicalJson(bound) === packet.canonical && bound.textHash === packet.textHash &&
      bound.packet?.sourceHash === packet.sourceHash && bound.packet?.scopeHash === packet.scopeHash &&
      sameList(manifest?.includedPaths, packet.evidencePaths) &&
      sameList(manifest?.excludedPaths, packet.excludedEvidencePaths ?? []);
  } catch {
    return false;
  }
}

function preflight(packet, config, provider) {
  const bytes = Buffer.byteLength(packet.text, 'utf8');
  const maxTokens = config.kimi.maxTokens;
  const worstCaseUsd = estimateCost(provider, bytes, maxTokens);
  return Object.freeze({
    packetHash: packet.hash,
    model: provider.model,
    maxTokens,
    worstCaseUsd: Number(worstCaseUsd.toFixed(6)),
    hardCapUsd: config.kimi.maxUsdPerCall,
    callCount: 1,
  });
}

/** Produce a zero-network plan. Required reviews block until every policy gate passes. */
export function planKimiReview({ required, packet, config, approval = null, now = new Date().toISOString() }) {
  if (!required) return Object.freeze({ status: 'NOT_REQUIRED', callCount: 0 });
  if (!config?.kimi?.enabled || config.kimi.approvalMode === 'disabled') {
    return Object.freeze({ status: 'BLOCKED_DISABLED', callCount: 0 });
  }
  if (!packetIntegrityValid(packet)) {
    return Object.freeze({ status: 'BLOCKED_PACKET_INTEGRITY', callCount: 0 });
  }

  const provider = getProvider('kimi');
  if (provider.model !== config.kimi.model) {
    return Object.freeze({ status: 'BLOCKED_MODEL_DRIFT', callCount: 0, expected: config.kimi.model, actual: provider.model });
  }
  try {
    enforceCeiling(provider, {
      evidence: packet.evidencePaths.map((path, index) => ({ id: `E${index + 1}`, path })),
    });
  } catch (error) {
    if (error?.code === 'CEILING') {
      return Object.freeze({ status: 'BLOCKED_CEILING', callCount: 0, reasons: Object.freeze(error.detail ?? []) });
    }
    throw error;
  }

  const dryRun = preflight(packet, config, provider);
  if (dryRun.worstCaseUsd > config.kimi.maxUsdPerCall) {
    return Object.freeze({ status: 'BLOCKED_COST_CAP', callCount: 0, preflight: dryRun });
  }
  const exactApproval = config.kimi.approvalMode === 'exact-run' &&
    approval?.mode === 'exact-run' && approval.model === config.kimi.model &&
    approval.packetHash === packet.hash && approval.sourceHash === packet.sourceHash &&
    approval.scopeHash === packet.scopeHash && NONCE.test(String(approval.nonce ?? '')) &&
    Date.parse(approval.expiresAt ?? '') > Date.parse(now) &&
    Number.isFinite(approval?.maxUsd) && approval.maxUsd >= dryRun.worstCaseUsd &&
    approval.maxUsd <= config.kimi.maxUsdPerCall;
  const expiresAt = Date.parse(approval?.expiresAt ?? '');
  const standingApproval = config.kimi.approvalMode === 'standing' &&
    approval?.mode === 'standing' && approval.model === config.kimi.model &&
    approval.scopeHash === packet.scopeHash && Number.isInteger(approval.remainingCalls) &&
    NONCE.test(String(approval.nonce ?? '')) && Number.isInteger(approval.callNumber) && approval.callNumber >= 1 &&
    approval.callNumber <= approval.remainingCalls && approval.callNumber <= config.kimi.maxCallsPerRun &&
    approval.remainingCalls >= 1 && Number.isFinite(approval.maxUsdPerCall) &&
    approval.maxUsdPerCall >= dryRun.worstCaseUsd && approval.maxUsdPerCall <= config.kimi.maxUsdPerCall &&
    Number.isFinite(approval.remainingUsd) && approval.remainingUsd >= dryRun.worstCaseUsd &&
    approval.remainingUsd <= config.kimi.maxUsdPerRun &&
    Number.isFinite(expiresAt) && expiresAt > Date.parse(now);
  if (!exactApproval && !standingApproval) {
    return Object.freeze({ status: 'BLOCKED_AUTHORIZATION', callCount: 0, preflight: dryRun });
  }

  const approvedCap = exactApproval ? approval.maxUsd : approval.maxUsdPerCall;

  const plan = Object.freeze({
    status: 'READY',
    callCount: 0,
    preflight: dryRun,
    authorization: Object.freeze({
      nonce: approval.nonce, callNumber: exactApproval ? 1 : approval.callNumber,
      mode: approval.mode, expiresAt: approval.expiresAt,
    }),
    command: Object.freeze({
      command: process.execPath,
      args: Object.freeze([
        config.kimi.launcher,
        '--document', '{{PACKET_PATH}}',
        '--out', '{{OUTPUT_PATH}}',
        '--remit', REMIT,
        '--effort', 'high',
        '--max-tokens', String(dryRun.maxTokens),
      ]),
      env: Object.freeze({
        SWAN_CONTEXT_MAX_USD: String(approvedCap),
        SWAN_KIMI_MODEL: config.kimi.model,
      }),
      allowEnv: Object.freeze(['OPENROUTER_API_KEY', 'OPEN_ROUTER_API_KEY']),
      timeoutMs: config.kimi.timeoutMs,
      shell: false,
    }),
  });
  READY_PLANS.add(plan);
  return plan;
}

/** Dispatch exactly once. Callers persist packet/output paths and substitute placeholders. */
export async function dispatchKimi(plan, execute) {
  if (plan?.status !== 'READY') throw new Error(`Kimi dispatch is not ready: ${plan?.status ?? 'missing plan'}`);
  if (!READY_PLANS.has(plan)) throw new Error('Kimi plan was already consumed');
  READY_PLANS.delete(plan);
  return execute(plan.command);
}

function consumeAuthorization(authorization) {
  const directory = join(tmpdir(), 'verify-until-dry', 'kimi-authorization');
  mkdirSync(directory, { recursive: true });
  const path = join(directory, `${authorization.nonce}-${authorization.callNumber}.used`);
  writeFileSync(path, authorization.expiresAt, { encoding: 'utf8', flag: 'wx' });
}

/** Materialize the approved packet, dispatch once, hash output, and remove temporary input. */
export async function executeKimiReview({
  plan, packet, outPath = null, execute = executeCommand, consume = consumeAuthorization,
}) {
  if (plan?.status !== 'READY') throw new Error(`Kimi execution is not ready: ${plan?.status ?? 'missing plan'}`);
  if (!packetIntegrityValid(packet) || packet.hash !== plan.preflight.packetHash) {
    throw new Error('Kimi packet integrity verification failed');
  }
  const temp = mkdtempSync(join(tmpdir(), 'verify-kimi-'));
  const packetPath = join(temp, 'packet.md');
  const outputPath = outPath ?? join(temp, 'review.md');
  writeFileSync(packetPath, packet.text, 'utf8');
  const command = {
    ...plan.command,
    args: plan.command.args.map((arg) => arg
      .replace('{{PACKET_PATH}}', packetPath)
      .replace('{{OUTPUT_PATH}}', outputPath)),
    cwd: process.cwd(),
  };
  try {
    consume(plan.authorization);
    const raw = await dispatchKimi(plan, () => execute(command));
    if (raw.code !== 0) throw new Error(`Kimi K3 call failed once with exit ${raw.code}: ${raw.stderr ?? ''}`);
    const text = readFileSync(outputPath, 'utf8');
    return Object.freeze({
      status: 'COMPLETED_ADVISORY',
      model: plan.preflight.model,
      packetHash: packet.hash,
      outputHash: sha256(text),
      outputPath: outPath ?? null,
      text,
      callCount: 1,
    });
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
}

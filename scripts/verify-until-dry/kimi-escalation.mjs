/**
 * @file kimi-escalation.mjs
 * @description Fail-closed Kimi K3 preflight and single-shot dispatch planning.
 *
 * Kimi remains design-ceiling under repository policy. The original evidence
 * manifest is screened before a sanitized temp packet can reach consult-kimi.
 */
import { enforceCeiling, estimateCost, getProvider } from '../context-gateway/src/providers.mjs';

const REMIT = `You are Kimi K3 acting as an independent hostile logic reviewer. Attack the supplied
state machine, invariants, edge cases, failure handling, concurrency assumptions, and false-clean
paths. Return VERDICT: CLEAN or REVISE, then only reproducible findings with severity, evidence id,
failing scenario, and the smallest safe repair direction. Never trust builder conclusions.`;

function preflight(packet, config, provider) {
  const worstCaseUsd = estimateCost(provider, Buffer.byteLength(packet.text, 'utf8'), config.kimi.maxTokens);
  return Object.freeze({
    packetHash: packet.hash,
    model: provider.model,
    maxTokens: config.kimi.maxTokens,
    worstCaseUsd: Number(worstCaseUsd.toFixed(6)),
    hardCapUsd: config.kimi.maxUsdPerCall,
    callCount: 1,
  });
}

/** Produce a zero-network plan. Required reviews block until every policy gate passes. */
export function planKimiReview({ required, packet, config, approval = null }) {
  if (!required) return Object.freeze({ status: 'NOT_REQUIRED', callCount: 0 });
  if (!config?.kimi?.enabled) return Object.freeze({ status: 'BLOCKED_DISABLED', callCount: 0 });

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
  const exactApproval = approval?.packetHash === packet.hash &&
    Number.isFinite(approval?.maxUsd) && approval.maxUsd >= dryRun.worstCaseUsd &&
    approval.maxUsd <= config.kimi.maxUsdPerCall;
  if (!exactApproval) {
    return Object.freeze({ status: 'BLOCKED_AUTHORIZATION', callCount: 0, preflight: dryRun });
  }

  return Object.freeze({
    status: 'READY',
    callCount: 0,
    preflight: dryRun,
    command: Object.freeze({
      command: process.execPath,
      args: Object.freeze([
        config.kimi.launcher,
        '--document', '{{PACKET_PATH}}',
        '--out', '{{OUTPUT_PATH}}',
        '--remit', REMIT,
        '--effort', 'high',
        '--max-tokens', String(config.kimi.maxTokens),
      ]),
      env: Object.freeze({
        SWAN_CONTEXT_MAX_USD: String(approval.maxUsd),
        SWAN_KIMI_MODEL: config.kimi.model,
      }),
      timeoutMs: config.kimi.timeoutMs,
      shell: false,
    }),
  });
}

/** Dispatch exactly once. Callers persist packet/output paths and substitute placeholders. */
export async function dispatchKimi(plan, execute) {
  if (plan?.status !== 'READY') throw new Error(`Kimi dispatch is not ready: ${plan?.status ?? 'missing plan'}`);
  return execute(plan.command);
}

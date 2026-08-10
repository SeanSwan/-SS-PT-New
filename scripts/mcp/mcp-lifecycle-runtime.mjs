/**
 * ============================================================================
 * FILE: mcp-lifecycle-runtime.mjs
 * PURPOSE: Enforce fail-safe MCP lifecycle runtime policy.
 * AUTHOR: Codex | LAST MODIFIED: 2026-08-09
 * AI VILLAGE VALIDATED: Not run (permission-gated)
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Resolves audit/enforce mode independently from process
 * ownership and mutation code.
 * HOW IT FITS IN THE APP: Lifecycle manager -> runtime policy -> release gate.
 * KEY DECISIONS: Missing, unknown, or dirty state always resolves to audit.
 * NASM PROTOCOL CONTEXT: Not applicable; this is agent infrastructure.
 */

import { parseKeepList } from './mcp-lifecycle-core.mjs';
import { performance } from 'node:perf_hooks';

/** Hard code gate: audit-to-enforce requires a separate reviewed revision. */
export const ENFORCEMENT_ENABLED = false;

/** Create one absolute monotonic deadline shared by every hook phase. */
export function createBudget(raw, now = () => performance.now()) {
  const parsed = Number(raw);
  const totalMs = Number.isInteger(parsed) && parsed >= 2000 && parsed <= 60_000 ? parsed : 10_000;
  const deadline = now() + totalMs;
  const remaining = () => Math.max(0, deadline - now());
  return {
    totalMs, deadline, remaining,
    has: (reserve = 0) => remaining() > reserve,
    timeout: (cap, reserve = 0) => Math.max(0, Math.min(cap, remaining() - reserve)),
  };
}

/** Parse the narrow lifecycle CLI and default missing mode to audit. */
export function parseCliArgs(args) {
  const result = { confirm: false, keep: null, mode: 'audit' };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--confirm') result.confirm = true;
    else if (arg.startsWith('--mode=')) {
      const mode = arg.slice('--mode='.length);
      if (!['audit', 'enforce'].includes(mode)) throw new Error('unknown mode');
      result.mode = resolveLifecycleMode(mode, false);
    } else if (arg.startsWith('--keep=')) result.keep = parseKeepList(arg.slice('--keep='.length));
    else if (arg === '--keep') {
      const value = args[index + 1];
      if (!value || value.startsWith('--')) throw new Error('KEEP requires a value');
      result.keep = parseKeepList(value);
      index += 1;
    } else throw new Error('unknown argument');
  }
  return result;
}

/** Resolve the only two modes; dirty state always disables enforcement. */
export function resolveLifecycleMode(requested, dirty = false) {
  return requested === 'enforce' && dirty !== true ? 'enforce' : 'audit';
}

/** Authorize the sole process-mutation boundary after mode and intent checks. */
export function canReleaseProcesses({
  command, mode, confirm = false, dirty = false, coordinated = false,
}) {
  return ENFORCEMENT_ENABLED === true
    && command === 'hook-end'
    && resolveLifecycleMode(mode, dirty) === 'enforce'
    && confirm === true
    && coordinated === true;
}

/** Invoke a supplied release only when the process-mutation boundary is open. */
export function runReleaseBoundary(options) {
  if (!canReleaseProcesses(options)) {
    return { released: 0, incomplete: 0, auditOnly: true };
  }
  if (typeof options.release !== 'function') throw new Error('release callback required');
  return options.release();
}

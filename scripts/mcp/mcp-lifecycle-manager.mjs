#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: mcp-lifecycle-manager.mjs
 * PURPOSE: Orchestrate fail-closed MCP audits and Claude SessionEnd cleanup.
 * AUTHOR: Codex | LAST MODIFIED: 2026-08-08
 * AI VILLAGE VALIDATED: Not run (permission-gated)
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Discovers processes, registers hook leases, builds
 * sanitized receipts, and mutates only revalidated Windows Playwright trees.
 * HOW IT FITS IN THE APP: Claude hooks -> manager -> lease/core safety layers.
 * KEY DECISIONS: Mutation is SessionEnd-routed; Codex/non-Windows are audit-only.
 * NASM PROTOCOL CONTEXT: Not applicable; this is agent infrastructure.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { analyzeProcesses, auditText, buildReleasePlan, buildStartWarning, findCurrentAgent } from './mcp-lifecycle-core.mjs';
import { discoverProcesses, parseProcessJson } from './mcp-lifecycle-discovery.mjs';
import { collectDoctorReport, formatDoctorReport } from './mcp-lifecycle-doctor.mjs';
import {
  allLeases, allPendingStarts, archiveIncompleteLease, CURRENT_STATE_DIR, leaseMatchesOwner, nextLease, nextPendingStart, readLease, readPendingStart,
  quarantinePendingStart, removeLease, removePendingStart, saveLease, savePendingStart, sessionOwnsExclusiveState,
  validateHookInput,
} from './mcp-lifecycle-leases.mjs';
import { executeRelease } from './mcp-lifecycle-release.mjs';
import { createBudget, parseCliArgs, runReleaseBoundary } from './mcp-lifecycle-runtime.mjs';
import { ownerHasTombstone, readDirtyLatch, readJournal, readTombstones, recordTombstoneAndRemove,
  pruneExitedTombstones, rearmDirtyLatch, releaseJournalEntry, runEnforcementTransaction,
  tombstoneLeaseStatus } from './mcp-lifecycle-state.mjs';
export { parseCliArgs } from './mcp-lifecycle-runtime.mjs';
export { parseProcessJson } from './mcp-lifecycle-discovery.mjs';

// SECTION: Process discovery and input parsing
// PURPOSE: Build bounded snapshots and accept only the documented CLI grammar.
// WHY: Raw process or argument content must never escape in failure receipts.

function hookInput() {
  try {
    const raw = readFileSync(0, 'utf8').trim();
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
function ownerInventory(budget) {
  const inventory = analyzeProcesses(discoverProcesses(budget));
  return { inventory, owner: findCurrentAgent(inventory, process.pid) };
}
function leasesForOwner(owner) {
  return allLeases().filter((lease) => leaseMatchesOwner(lease, owner));
}
function exactLeaseForManualCommand(owner) {
  const leases = leasesForOwner(owner);
  if (leases.length !== 1) throw new Error('exactly one active Claude session lease is required');
  return leases[0];
}
// SECTION: Ownership and planning
// PURPOSE: Bind every plan to a fresh exact owner snapshot.
// WHY: Inventory captured before a lock or session boundary is stale evidence.

/** Resolve KEEP semantics; SessionEnd intentionally ignores task KEEP state. */
export function keepForBoundary(command, argsKeep, leaseKeep = []) {
  return command === 'hook-end' ? new Set() : (argsKeep ?? new Set(leaseKeep));
}
/** Claim only one newly born root while this session is the sole exact-owner state. */
export function claimSessionRoots(inventory, owner, pending, leases, pendingStarts, tombstones) {
  const concurrent = [...leases, ...pendingStarts].some((item) =>
    item.sessionId !== pending.sessionId && leaseMatchesOwner(item, owner));
  if (concurrent || ownerHasTombstone(tombstones, owner)) return [];
  const candidates = inventory.groups.filter((group) => group.agentPid === owner.pid
    && group.agentCreatedAt === owner.createdAt && group.ownershipProven
    && Number.isFinite(group.rootCreatedAt) && group.rootCreatedAt > pending.publishedAt);
  return candidates.length === 1
    ? candidates.map((group) => ({ pid: group.rootPid, createdAt: group.rootCreatedAt })) : [];
}
/** Re-prove owner identity and rebuild the release plan from a fresh snapshot. */
export function refreshedReleasePlan(
  expectedOwner, rawProcesses, fromPid = process.pid, notBefore = null, claimedRoots = null,
) {
  const inventory = analyzeProcesses(rawProcesses);
  const owner = findCurrentAgent(inventory, fromPid);
  if (owner.kind !== 'claude'
    || owner.pid !== expectedOwner.pid
    || owner.createdAt !== expectedOwner.createdAt) throw new Error('owner identity changed');
  return {
    inventory,
    owner,
    plan: buildReleasePlan({
      inventory, owner, keep: keepForBoundary('hook-end'), notBefore, claimedRoots,
    }),
  };
}
function terminateWindows(group, timeout) {
  const script = [
    '$ErrorActionPreference="Stop"',
    '$items=[Console]::In.ReadToEnd() | ConvertFrom-Json',
    '$opened=@()',
    'try { foreach($item in $items) { $p=[Diagnostics.Process]::GetProcessById([int]$item.pid); $null=$p.Handle; $actual=([DateTimeOffset]$p.StartTime.ToUniversalTime()).ToUnixTimeMilliseconds(); if($actual -ne [long]$item.createdAt){throw "identity changed"}; $opened += [pscustomobject]@{Process=$p;Depth=[int]$item.depth} }; foreach($entry in ($opened | Sort-Object Depth -Descending)){if(-not $entry.Process.HasExited){$entry.Process.Kill()}} } finally { foreach($entry in $opened){$entry.Process.Dispose()} }',
  ].join('; ');
  execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], {
    input: JSON.stringify(group.treeMembers), stdio: ['pipe', 'ignore', 'ignore'], timeout,
  });
}
export function sanitizedReceipt(result, protectedCount, evidence = 'not-needed', lease = 'removed', wouldRelease = 0) {
  const state = result.auditOnly
    ? `mode=audit, would-release=${wouldRelease}, released=0, incomplete=not-attempted`
    : result.unsupported ? 'audit-only platform'
      : `released=${result.released}, incomplete=${result.incomplete}`;
  return `[mcp-hygiene] ${state}, protected=${protectedCount}, evidence=${evidence}, lease=${lease}.\n`;
}

/** Remove an ended lease and return a sanitized status instead of throwing. */
export function removeLeaseStatus(sessionId, remover = removeLease) {
  try {
    remover(sessionId);
    return 'removed';
  } catch {
    return 'removal-failed';
  }
}

/** Return a sanitized hook preflight failure receipt without claiming cleanup. */
export function hookFailureReceipt(command, leaseState = 'unknown') {
  if (command === 'hook-end') {
    return `[mcp-hygiene] lifecycle preflight failed; evidence=not-attempted, lease=${leaseState}; run a sanitized audit.\n`;
  }
  return '[mcp-hygiene] lifecycle action skipped or incomplete; run a sanitized audit.\n';
}

async function main() {
  // SECTION: Hook and CLI orchestration
  // PURPOSE: Enforce session leases around every lifecycle transition.
  // WHY: A pending SessionStart must be visible before it waits on the owner lock.
  const [command = 'audit', ...rawArgs] = process.argv.slice(2);
  const hook = command.startsWith('hook-start-') || command === 'hook-end';
  let hookLeaseState = 'unknown';
  try {
    const args = parseCliArgs(rawArgs);
    const budget = createBudget(process.env.SWAN_MCP_BUDGET_MS);
    const report = collectDoctorReport({
      readDirty: () => readDirtyLatch(CURRENT_STATE_DIR),
      readJournal: () => readJournal(CURRENT_STATE_DIR),
      readTombstones: () => readTombstones(CURRENT_STATE_DIR),
      readLeases: allLeases, readPending: allPendingStarts,
    });
    const dirty = report.dirty === 1 || report.ambiguous > 0;
    if (['status', 'doctor'].includes(command)) return process.stdout.write(formatDoctorReport(report));
    const coordinatedMutation = hook || ['keep', 'rearm'].includes(command);
    if (coordinatedMutation && process.env.SWAN_MCP_COORDINATED !== '1') {
      throw new Error('coordinator proof missing');
    }
    if (command === 'rearm') {
      rearmDirtyLatch(CURRENT_STATE_DIR, { approved: args.confirm, doctorClean: report.cleanForRearm });
      return process.stdout.write('[mcp-hygiene] dirty latch rearmed after clean doctor result.\n');
    }
    const { inventory, owner } = ownerInventory(budget);
    if (command === 'audit') return process.stdout.write(auditText(inventory, owner, process.pid));
    if (command === 'hook-start-publish') {
      const input = hookInput();
      const sessionId = validateHookInput(input, 'SessionStart');
      if (owner.kind !== 'claude' || !Number.isFinite(owner.createdAt)) throw new Error('Claude owner unavailable');
      const holder = inventory.processes.find((item) => item.pid === process.pid);
      savePendingStart(nextPendingStart(sessionId, owner, holder));
      return process.stdout.write('[mcp-hygiene] SessionStart pending claim published.\n');
    }
    if (command === 'hook-start-register') {
      const input = hookInput();
      const sessionId = validateHookInput(input, 'SessionStart');
      if (owner.kind !== 'claude' || !Number.isFinite(owner.createdAt)) throw new Error('Claude owner unavailable');
      const pending = readPendingStart(sessionId);
      if (!pending || !leaseMatchesOwner(pending, owner) || pending.expiresAt <= Date.now()) {
        throw new Error('matching pending claim unavailable');
      }
      try {
        const refreshed = refreshedReleasePlan(owner, discoverProcesses(budget), process.pid);
        pruneExitedTombstones(CURRENT_STATE_DIR, refreshed.inventory.processes);
        for (const stale of allPendingStarts().filter((item) => item.expiresAt <= Date.now())) {
          quarantinePendingStart(stale.sessionId, stale, refreshed.inventory.processes);
        }
        const roots = claimSessionRoots(
          refreshed.inventory, owner, pending, allLeases(), allPendingStarts(),
          readTombstones(CURRENT_STATE_DIR),
        );
        saveLease(nextLease(readLease(sessionId), sessionId, owner, roots));
      } finally {
        removePendingStart(sessionId, pending.nonce);
      }
      return process.stdout.write(buildStartWarning(inventory));
    }
    if (command === 'keep') {
      if (!args.keep) throw new Error('keep requires --keep=<names|none>');
      if (owner.kind !== 'claude') throw new Error('shared Codex and unresolved hosts are audit-only');
      const lease = exactLeaseForManualCommand(owner);
      lease.keep = [...args.keep].sort();
      saveLease(lease);
      return process.stdout.write(`[mcp-hygiene] KEEP recorded for ${lease.keep.length} server label(s).\n`);
    }
    if (!['release', 'hook-end'].includes(command)) throw new Error('unknown command');
    if (owner.kind !== 'claude') throw new Error('shared Codex and unresolved hosts are audit-only');

    if (command === 'hook-end') {
      // Hook JSON is an operational routing signal, not same-user cryptographic attestation.
      const input = hookInput();
      const sessionId = validateHookInput(input, 'SessionEnd');
      if (!args.confirm) throw new Error('SessionEnd confirmation missing');
      {
        const lease = readLease(sessionId);
        hookLeaseState = lease ? 'retained' : 'absent';
        if (!lease || !leaseMatchesOwner(lease, owner)) throw new Error('matching session lease unavailable');
        const noSiblingLease = () => {
          const current = readLease(sessionId);
          return sessionOwnsExclusiveState(
            sessionId, owner, current, allLeases(), allPendingStarts(),
            readTombstones(CURRENT_STATE_DIR),
          );
        };
        let result = null;
        let protectedCount = 0;
        try {
          if (!noSiblingLease()) throw new Error('same-host Claude concurrency detected');
          const refreshed = refreshedReleasePlan(
            owner, discoverProcesses(budget), process.pid, null, lease.roots,
          );
          if (!leaseMatchesOwner(lease, refreshed.owner)) throw new Error('owner identity changed');
          const { plan } = refreshed;
          if (plan.refusedReason) throw new Error(plan.refusedReason);
          result = runReleaseBoundary({
            command, mode: args.mode, confirm: args.confirm,
            dirty, coordinated: process.env.SWAN_MCP_COORDINATED === '1',
            release: () => runEnforcementTransaction(CURRENT_STATE_DIR, {
              release: () => executeRelease(plan, {
                discover: () => discoverProcesses(budget), terminate: terminateWindows, canMutate: noSiblingLease,
                deadline: budget.deadline, finalReserve: 1500,
                validateInventory: (candidate) => !buildReleasePlan({
                  inventory: candidate, owner, claimedRoots: lease.roots,
                }).refusedReason,
              }),
              journalEntry: (value) => releaseJournalEntry(value, plan.kill.length, plan.protected.length),
            }),
          });
          protectedCount = plan.protected.length;
          if (result.auditOnly) {
            try {
              recordTombstoneAndRemove({
                root: CURRENT_STATE_DIR, lease, reason: 'audit-ended', removeLease,
              });
              return process.stdout.write(sanitizedReceipt(
                result, protectedCount, 'tombstoned', 'removed', plan.kill.length));
            } catch {
              return process.stdout.write(sanitizedReceipt(
                result, protectedCount, 'failed', 'retained', plan.kill.length));
            }
          }
        } catch {
          let evidence = 'failed';
          try {
            archiveIncompleteLease(lease, result);
            evidence = 'archived';
          } catch {}
          const leaseState = tombstoneLeaseStatus(CURRENT_STATE_DIR, lease, 'release-refused', removeLease);
          return process.stdout.write(
            `[mcp-hygiene] lifecycle action skipped or incomplete; evidence=${evidence}, lease=${leaseState}; run a sanitized audit.\n`,
          );
        }
        let evidence = 'not-needed';
        if (result.incomplete > 0) {
          try {
            archiveIncompleteLease(lease, result);
            evidence = 'archived';
          } catch {
            evidence = 'failed';
          }
        }
        const leaseState = result.incomplete > 0
          ? tombstoneLeaseStatus(CURRENT_STATE_DIR, lease, 'release-incomplete', removeLease) : removeLeaseStatus(sessionId);
        return process.stdout.write(sanitizedReceipt(result, protectedCount, evidence, leaseState));
      }
    }
    if (args.confirm) throw new Error('confirmed process mutation is reserved for SessionEnd');
    const lease = exactLeaseForManualCommand(owner);
    const keep = keepForBoundary('release', args.keep, lease.keep);
    const plan = buildReleasePlan({ inventory, owner, keep });
    if (plan.refusedReason) throw new Error(plan.refusedReason);
    return process.stdout.write(`[mcp-hygiene] dry-run: would release ${plan.kill.length} owned tree(s).\n`);
  } catch {
    if (hook) {
      process.stdout.write(hookFailureReceipt(command, hookLeaseState));
      return;
    }
    process.stderr.write('[mcp-hygiene] REFUSED: lifecycle operation failed safely.\n');
    process.exitCode = 2;
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) await main();

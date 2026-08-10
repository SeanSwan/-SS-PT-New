/**
 * ============================================================================
 * FILE: mcp-lifecycle-release.mjs
 * PURPOSE: Execute a proven MCP release plan against repeated process snapshots.
 * AUTHOR: Codex | LAST MODIFIED: 2026-08-08
 * AI VILLAGE VALIDATED: Not run (permission-gated)
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Revalidates owner/root/descendant identities before and
 * after bounded Windows tree termination, returning sanitized result counts.
 * HOW IT FITS IN THE APP: Lifecycle manager -> release executor -> OS terminator.
 * KEY DECISIONS: Every ambiguity is incomplete; non-Windows is audit-only.
 * NASM PROTOCOL CONTEXT: Not applicable; this is agent infrastructure.
 */

import process from 'node:process';
import { performance } from 'node:perf_hooks';

import { analyzeProcesses, sameGroup } from './mcp-lifecycle-core.mjs';

// SECTION: Revalidated mutation
// PURPOSE: Close only immutable identities that remain proven at kill time.
// WHY: PID reuse, reparenting, and new descendants can invalidate an old plan.

function memberSurvives(processes, member) {
  const live = processes.find((proc) => proc.pid === member.pid);
  return Boolean(live && (!Number.isFinite(live.createdAt) || live.createdAt === member.createdAt));
}

function tracesToPriorMember(proc, membersByPid, finalByPid) {
  let cursor = proc;
  const seen = new Set();
  while (cursor && !seen.has(cursor.pid)) {
    seen.add(cursor.pid);
    const expectedParent = membersByPid.get(cursor.ppid);
    if (expectedParent) {
      if (!Number.isFinite(cursor.createdAt) || !Number.isFinite(expectedParent.createdAt)) return true;
      return expectedParent.createdAt <= cursor.createdAt;
    }
    const parent = finalByPid.get(cursor.ppid);
    if (!parent) return false;
    if (Number.isFinite(cursor.createdAt) && Number.isFinite(parent.createdAt)
      && parent.createdAt > cursor.createdAt) return false;
    cursor = parent;
  }
  return false;
}

/** Execute a Windows release plan with two pre-kill snapshots and final proof. */
export function executeRelease(plan, dependencies = {}) {
  const platform = dependencies.platform ?? process.platform;
  const discover = dependencies.discover;
  const terminateTree = dependencies.terminate;
  const canMutate = dependencies.canMutate ?? (() => true);
  const validateInventory = dependencies.validateInventory ?? (() => true);
  const now = dependencies.now ?? (() => performance.now());
  if (platform !== 'win32') return { released: 0, incomplete: plan.kill.length, unsupported: true };
  if (typeof discover !== 'function' || typeof terminateTree !== 'function') {
    throw new Error('release dependencies unavailable');
  }
  const incompleteTargets = new Set();
  const observedByTarget = plan.kill.map((group) => [...group.treeMembers]);
  let inventoryAmbiguous = false;
  const refuseInventory = () => {
    inventoryAmbiguous = true;
    for (let target = 0; target < plan.kill.length; target += 1) incompleteTargets.add(target);
  };
  const deadline = Number.isFinite(dependencies.deadline) ? dependencies.deadline : now() + 8_000;
  const finalReserve = Number.isFinite(dependencies.finalReserve) ? dependencies.finalReserve : 1_000;
  for (let index = 0; index < plan.kill.length; index += 1) {
    const planned = plan.kill[index];
    if (now() >= deadline - finalReserve) {
      incompleteTargets.add(index);
      continue;
    }
    try {
      const before = analyzeProcesses(discover());
      if (!validateInventory(before)) {
        refuseInventory();
        break;
      }
      const current = before.groups.find((group) => sameGroup(planned, group));
      if (!current || !current.ownershipProven) {
        if (planned.treeMembers.some((member) => memberSurvives(before.processes, member))) {
          incompleteTargets.add(index);
        }
        continue;
      }
      observedByTarget[index].push(...current.treeMembers);
      if (!canMutate()) {
        for (let rest = index; rest < plan.kill.length; rest += 1) incompleteTargets.add(rest);
        break;
      }
      const immediateInventory = analyzeProcesses(discover());
      if (!validateInventory(immediateInventory)) {
        refuseInventory();
        break;
      }
      const immediate = immediateInventory.groups.find((group) => sameGroup(current, group));
      if (!immediate || !immediate.ownershipProven) {
        const expected = [...planned.treeMembers, ...current.treeMembers];
        if (expected.some((member) => memberSurvives(immediateInventory.processes, member))) {
          incompleteTargets.add(index);
        }
        continue;
      }
      observedByTarget[index].push(...immediate.treeMembers);
      const terminateTimeout = Math.min(1500, deadline - now() - finalReserve);
      if (terminateTimeout < 250) throw new Error('release budget exhausted');
      terminateTree(immediate, terminateTimeout);
      const after = analyzeProcesses(discover());
      if (!validateInventory(after)) {
        refuseInventory();
        break;
      }
      const observedMembers = observedByTarget[index];
      if (observedMembers.some((member) => memberSurvives(after.processes, member))) {
        incompleteTargets.add(index);
      }
    } catch {
      incompleteTargets.add(index);
    }
  }
  let finalInventory;
  try {
    finalInventory = analyzeProcesses(discover());
  } catch {
    return { released: 0, incomplete: Math.max(1, plan.kill.length), unsupported: false };
  }
  if (!validateInventory(finalInventory)) refuseInventory();
  const targetAliases = new Set(plan.kill.flatMap((group) => group.aliases));
  const finalByPid = new Map(finalInventory.processes.map((proc) => [proc.pid, proc]));
  const owner = plan.kill[0];
  const residual = owner ? finalInventory.groups.filter((group) =>
    group.agentPid === owner.agentPid
    && group.agentCreatedAt === owner.agentCreatedAt
    && group.aliases.some((alias) => targetAliases.has(alias))) : [];
  for (let index = 0; index < plan.kill.length; index += 1) {
    const planned = plan.kill[index];
    if (observedByTarget[index].some((member) => memberSurvives(finalInventory.processes, member))) {
      incompleteTargets.add(index);
    }
    const membersByPid = new Map(observedByTarget[index].map((member) => [member.pid, member]));
    if (finalInventory.processes.some((proc) => tracesToPriorMember(proc, membersByPid, finalByPid))) {
      incompleteTargets.add(index);
    }
  }
  for (const group of residual) {
    const exactIndex = plan.kill.findIndex((planned) => sameGroup(planned, group));
    const availableIndex = plan.kill.findIndex((planned, index) => !incompleteTargets.has(index)
      && planned.aliases.some((alias) => group.aliases.includes(alias)));
    const targetIndex = exactIndex >= 0 ? exactIndex : availableIndex;
    if (targetIndex >= 0) incompleteTargets.add(targetIndex);
  }
  const incomplete = Math.max(incompleteTargets.size, inventoryAmbiguous ? 1 : 0);
  return { released: Math.max(0, plan.kill.length - incomplete), incomplete, unsupported: false };
}

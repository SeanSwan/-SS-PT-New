/**
 * ============================================================================
 * FILE: mcp-lifecycle-core.mjs
 * PURPOSE: Prove MCP process identity and ownership without mutating processes.
 * AUTHOR: Codex | LAST MODIFIED: 2026-08-08
 * AI VILLAGE VALIDATED: Not run (permission-gated)
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Normalizes process snapshots, recognizes only the exact
 * configured Playwright wrapper, and builds fail-closed release plans.
 * HOW IT FITS IN THE APP: Lifecycle manager -> pure inventory analysis -> plan.
 * KEY DECISIONS: Creation-time ancestry and exact executable shapes are required.
 * NASM PROTOCOL CONTEXT: Not applicable; this is agent infrastructure.
 */
import { canMutateLabel, classifyRegistryProcess, MANAGED_LABELS } from './mcp-lifecycle-registry.mjs';
export { MANAGED_LABELS } from './mcp-lifecycle-registry.mjs';
const MCP_LIKE_RE = /(?:\bmcp\b|model-context-protocol|graphify)/i;
function tokens(commandLine = '') {
  return [...String(commandLine).matchAll(/"([^"]*)"|'([^']*)'|(\S+)/g)].map(
    (match) => match[1] ?? match[2] ?? match[3],
  );
}
function slash(value = '') { return String(value).replaceAll('\\', '/').toLowerCase(); }
function basename(value = '') { return slash(value).split('/').at(-1); }
// SECTION: Exact identities
// PURPOSE: Recognize managed MCP roots and supported agent executables.
// WHY: Substring matching could authorize termination of unrelated processes.
/** Return the managed label for an exact reviewed command shape, or null. */
export function classifyMcpProcess(commandLine = '', processName = '') {
  return classifyRegistryProcess(commandLine, processName);
}
function creationMs(value) {
  if (Number.isFinite(value)) return Number(value);
  if (!value) return null;
  const dotNet = String(value).match(/^\\?\/Date\((\d+)(?:[+-]\d+)?\)\\?\/$/);
  if (dotNet) return Number(dotNet[1]);
  const parsed = Date.parse(String(value)); return Number.isFinite(parsed) ? parsed : null;
}
function normalizeProcess(raw) {
  return {
    pid: Number(raw.pid ?? raw.ProcessId), ppid: Number(raw.ppid ?? raw.ParentProcessId),
    name: String(raw.name ?? raw.Name ?? ''), commandLine: String(raw.commandLine ?? raw.CommandLine ?? ''),
    createdAt: creationMs(raw.createdAt ?? raw.CreationDate),
  };
}
function agentKind(proc) {
  const executable = basename(proc?.name);
  const invoked = basename(tokens(proc?.commandLine)[0]);
  if (['claude', 'claude.exe'].includes(executable)
    && ['claude', 'claude.exe'].includes(invoked)) return 'claude';
  if (['codex', 'codex.exe'].includes(executable)
    && ['codex', 'codex.exe'].includes(invoked)) return 'codex';
  return null;
}
function validParent(child, parent) {
  return Number.isFinite(child?.createdAt)
    && Number.isFinite(parent?.createdAt)
    && parent.createdAt <= child.createdAt;
}
function ancestorChain(proc, byPid, limit = 32) {
  const chain = [];
  let cursor = proc;
  const seen = new Set();
  while (cursor && chain.length < limit && !seen.has(cursor.pid)) {
    chain.push(cursor);
    seen.add(cursor.pid);
    const parent = byPid.get(cursor.ppid);
    if (!parent || !validParent(cursor, parent)) break;
    cursor = parent;
  }
  return chain;
}
function isDescendantOf(proc, ancestorPid, byPid) { return ancestorChain(proc, byPid)
  .some((item) => item.pid === ancestorPid); }
function isRawDescendantOf(proc, ancestorPid, byPid) {
  let cursor = proc;
  const seen = new Set();
  for (let depth = 0; cursor && depth <= byPid.size && !seen.has(cursor.pid); depth += 1) {
    if (cursor.pid === ancestorPid) return true;
    seen.add(cursor.pid);
    cursor = byPid.get(cursor.ppid);
  }
  return false;
}
function rawAncestorChain(proc, byPid) {
  const chain = [];
  let cursor = proc;
  const seen = new Set();
  for (let depth = 0; cursor && depth <= byPid.size && !seen.has(cursor.pid); depth += 1) {
    chain.push(cursor);
    seen.add(cursor.pid);
    cursor = byPid.get(cursor.ppid);
  }
  return chain;
}
function hasValidPathTo(proc, ancestorPid, byPid) {
  let cursor = proc;
  const seen = new Set();
  for (let depth = 0; cursor && depth <= byPid.size && !seen.has(cursor.pid); depth += 1) {
    if (cursor.pid === ancestorPid) return true;
    seen.add(cursor.pid);
    const parent = byPid.get(cursor.ppid);
    if (!parent || !validParent(cursor, parent)) return false;
    cursor = parent;
  }
  return false;
}
// SECTION: Inventory proof
// PURPOSE: Normalize a finite snapshot and prove complete temporal ancestry.
// WHY: taskkill /T is safe only when every raw descendant edge is attributable.
/** Analyze a raw process snapshot into managed groups and audit-only lookalikes. */
export function analyzeProcesses(rawProcesses) {
  const processes = rawProcesses.map(normalizeProcess).filter((proc) => Number.isInteger(proc.pid));
  const byPid = new Map(processes.map((proc) => [proc.pid, proc]));
  const classified = new Map();
  for (const proc of processes) {
    const label = classifyMcpProcess(proc.commandLine, proc.name);
    if (label) classified.set(proc.pid, label);
  }
  const groups = [];
  for (const proc of processes) {
    if (!classified.has(proc.pid)) continue;
    const ancestors = ancestorChain(proc, byPid).slice(1);
    const rawAncestors = rawAncestorChain(proc, byPid).slice(1);
    if (ancestors.some((parent) => classified.has(parent.pid))) continue;
    const owner = ancestors.find((parent) => agentKind(parent));
    const probableOwner = owner || rawAncestors.find((parent) => agentKind(parent));
    const aliases = processes
      .filter((candidate) => classified.has(candidate.pid) && isDescendantOf(candidate, proc.pid, byPid))
      .map((candidate) => classified.get(candidate.pid));
    const rawTree = processes.filter((candidate) => isRawDescendantOf(candidate, proc.pid, byPid));
    const treeMembers = rawTree
      .map((candidate) => ({
        pid: candidate.pid, createdAt: candidate.createdAt,
        depth: rawAncestorChain(candidate, byPid).findIndex((item) => item.pid === proc.pid),
      }));
    groups.push({
      aliases: [...new Set(aliases)].sort(),
      treeMembers,
      rootPid: proc.pid,
      rootCreatedAt: proc.createdAt,
      agentKind: probableOwner ? agentKind(probableOwner) : null,
      agentPid: probableOwner?.pid ?? null,
      agentCreatedAt: probableOwner?.createdAt ?? null,
      ownershipProven: Boolean(owner
        && Number.isFinite(owner.createdAt)
        && Number.isFinite(proc.createdAt)
        && rawTree.every((candidate) => hasValidPathTo(candidate, proc.pid, byPid))),
    });
  }
  const managedMemberPids = new Set(groups.flatMap((group) => group.treeMembers.map((member) => member.pid)));
  return {
    processes,
    groups: groups.sort((a, b) => (a.agentPid ?? 0) - (b.agentPid ?? 0) || a.rootPid - b.rootPid),
    unmanagedMcpLike: processes.filter(
      (proc) => MCP_LIKE_RE.test(proc.commandLine) && !managedMemberPids.has(proc.pid),
    ),
  };
}
/** Find the exact Claude or Codex executable that owns the current invocation. */
export function findCurrentAgent(inventory, fromPid) {
  const byPid = new Map(inventory.processes.map((proc) => [proc.pid, proc]));
  const start = byPid.get(fromPid);
  const owner = ancestorChain(start, byPid).find((proc) => agentKind(proc));
  return owner
    ? { kind: agentKind(owner), pid: owner.pid, createdAt: owner.createdAt }
    : { kind: null, pid: null, createdAt: null };
}
/** Render a sanitized audit while excluding the manager invocation tree itself. */
export function auditText(inventory, owner, fromPid) {
  const counts = new Map();
  for (const group of inventory.groups) {
    for (const label of group.aliases) counts.set(label, (counts.get(label) || 0) + 1);
  }
  const running = [...counts].map(([label, count]) => `${label}=${count}`).join(', ') || 'none';
  const byPid = new Map(inventory.processes.map((proc) => [proc.pid, proc]));
  const invocationPids = new Set([fromPid]);
  let cursor = byPid.get(fromPid);
  const ancestorSeen = new Set();
  while (cursor && cursor.pid !== owner.pid && !ancestorSeen.has(cursor.pid)) {
    invocationPids.add(cursor.pid);
    ancestorSeen.add(cursor.pid);
    const parent = byPid.get(cursor.ppid);
    if (!parent || !validParent(cursor, parent)) break;
    cursor = parent;
  }
  const descendantPids = new Set([fromPid]);
  let added = true;
  while (added) {
    added = false;
    for (const proc of inventory.processes) {
      const parent = byPid.get(proc.ppid);
      if (!descendantPids.has(proc.pid) && descendantPids.has(proc.ppid)
        && validParent(proc, parent)) {
        descendantPids.add(proc.pid);
        added = true;
      }
    }
  }
  for (const pid of descendantPids) invocationPids.add(pid);
  const unmanagedCount = inventory.unmanagedMcpLike.filter((item) => !invocationPids.has(item.pid)).length;
  return [
    'MCP lifecycle audit (process layer only)',
    `current-agent: ${owner.kind || 'unresolved'}`,
    `managed-running-groups: ${running}`,
    `unmanaged-mcp-like-processes: ${unmanagedCount} (never auto-terminated)`,
    'context-note: stopping a process does not remove tool schemas already exposed to this session.',
  ].join('\n') + '\n';
}
// SECTION: Release planning
// PURPOSE: Validate operator intent and select only proven current-owner groups.
// WHY: Unknown labels and ambiguous ownership must fail closed.
/** Parse a comma-separated KEEP value against the managed-label allowlist. */
export function parseKeepList(value = '') {
  const names = String(value).split(',').map((item) => item.trim().toLowerCase()).filter(Boolean);
  if (names.length === 1 && names[0] === 'none') return new Set();
  const unknown = names.filter((name) => !MANAGED_LABELS.has(name));
  if (!names.length || unknown.length) {
    throw new Error(unknown.length ? 'KEEP contains a non-allowlisted label' : 'KEEP requires a value');
  }
  return new Set(names);
}
function hasClaimedSurvivor(processes, root) {
  const byPid = new Map(processes.map((proc) => [proc.pid, proc]));
  return processes.some((proc) => {
    let cursor = proc; const seen = new Set();
    while (cursor && !seen.has(cursor.pid)) {
      seen.add(cursor.pid);
      if (cursor.ppid === root.pid) return !Number.isFinite(cursor.createdAt)
        || cursor.createdAt >= root.createdAt;
      cursor = byPid.get(cursor.ppid);
    }
    return false;
  });
}
/** Build a non-mutating release plan for the exact current Claude owner. */
export function buildReleasePlan({ inventory, owner, keep = new Set(), notBefore = null, claimedRoots = null }) {
  if (owner.kind !== 'claude') {
    const reason = owner.kind === 'codex'
      ? 'Codex Desktop is a shared host; process release is audit-only.'
      : 'No current Claude session owner could be proven.';
    return { kill: [], kept: [], protected: inventory.groups, refusedReason: reason };
  }
  let owned = inventory.groups.filter((group) => group.agentKind === 'claude'
    && group.agentPid === owner.pid
    && group.agentCreatedAt === owner.createdAt
    && group.ownershipProven
    && group.aliases.every(canMutateLabel));
  const ambiguousOwned = inventory.groups.some((group) => group.agentKind === 'claude'
    && group.agentPid === owner.pid && !group.ownershipProven);
  if (ambiguousOwned) {
    return { kill: [], kept: [], protected: inventory.groups, refusedReason: 'Process ownership is ambiguous.' };
  }
  if (Array.isArray(claimedRoots)) {
    const claims = new Set(claimedRoots.map((root) => `${root.pid}:${root.createdAt}`));
    const unaccounted = claimedRoots.some((root) => {
      const live = inventory.processes.find((proc) => proc.pid === root.pid);
      const exact = owned.some((group) => group.rootPid === root.pid
        && group.rootCreatedAt === root.createdAt);
      if (live && (!Number.isFinite(live.createdAt) || live.createdAt === root.createdAt)) return !exact;
      return hasClaimedSurvivor(inventory.processes, root);
    });
    if (unaccounted) return { kill: [], kept: [], protected: inventory.groups,
      refusedReason: 'A claimed tree is not proven exited or current.' };
    const unclaimed = owned.some((group) => !claims.has(`${group.rootPid}:${group.rootCreatedAt}`));
    if (unclaimed) {
      return { kill: [], kept: [], protected: inventory.groups, refusedReason: 'A same-owner tree is not claimed by this lease.' };
    }
    owned = owned.filter((group) => claims.has(`${group.rootPid}:${group.rootCreatedAt}`));
  }
  const preLeaseOwned = Number.isFinite(notBefore) && owned.some((group) =>
    !Number.isFinite(group.rootCreatedAt) || group.rootCreatedAt <= notBefore);
  if (preLeaseOwned) {
    return { kill: [], kept: [], protected: inventory.groups, refusedReason: 'A same-owner tree predates the session lease.' };
  }
  return {
    kill: owned.filter((group) => !group.aliases.some((label) => keep.has(label))),
    kept: owned.filter((group) => group.aliases.some((label) => keep.has(label))),
    protected: inventory.groups.filter((group) => !owned.includes(group)),
    refusedReason: null,
  };
}
/** Compare two independently observed groups by immutable owner/root identity. */
export function sameGroup(left, right) {
  return left.ownershipProven === true
    && right.ownershipProven === true
    && left.rootPid === right.rootPid
    && left.rootCreatedAt === right.rootCreatedAt
    && left.agentPid === right.agentPid
    && left.agentCreatedAt === right.agentCreatedAt
    && left.aliases.join(',') === right.aliases.join(',');
}
export { buildStartWarning } from './mcp-lifecycle-report.mjs';

#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: mcp-lifecycle-races.test.mjs
 * PURPOSE: Reproduce hostile process races at the Windows mutation boundary.
 * AUTHOR: Codex | LAST MODIFIED: 2026-08-08
 * AI VILLAGE VALIDATED: Not run (permission-gated)
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Simulates PID reuse, reparenting, respawn, invalid
 * descendants, lease loss, and deep trees across repeated process snapshots.
 * HOW IT FITS IN THE APP: Node test runner -> release executor safety boundary.
 * KEY DECISIONS: A false incomplete result is safer than a false released result.
 * NASM PROTOCOL CONTEXT: Not applicable; this is agent infrastructure.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { analyzeProcesses, buildReleasePlan } from './mcp-lifecycle-core.mjs';
import { executeRelease } from './mcp-lifecycle-release.mjs';

const at = (seconds) => Date.parse(`2026-08-08T00:00:${String(seconds).padStart(2, '0')}.000Z`);
const owner = { pid: 100, ppid: 1, name: 'claude.exe', commandLine: 'claude.exe', createdAt: at(1) };
const wrapper = {
  pid: 110, ppid: 100, name: 'cmd.exe',
  commandLine: 'cmd /c npx -y @playwright/mcp@latest', createdAt: at(2),
};
const child = {
  pid: 111, ppid: 110, name: 'node.exe',
  commandLine: 'node C:/npm/node_modules/@playwright/mcp/cli.js', createdAt: at(3),
};
const raw = [owner, wrapper, child];
const agent = { kind: 'claude', pid: 100, createdAt: at(1) };
const planFor = (items = raw) => buildReleasePlan({
  inventory: analyzeProcesses(items), owner: agent, keep: new Set(),
});
const validateClaims = (roots) => (inventory) => !buildReleasePlan({
  inventory, owner: agent, keep: new Set(), claimedRoots: roots,
}).refusedReason;

// SECTION: Pre-kill identity races
// PURPOSE: Refuse mutation whenever the root, owner, descendants, or lease drift.
// WHY: taskkill /T follows the live OS tree, not the earlier JavaScript plan.

test('revalidates each target immediately and refuses a reused later PID', () => {
  const second = { ...wrapper, pid: 120, createdAt: at(4) };
  const initial = [owner, wrapper, child, second];
  const plan = planFor(initial);
  const withoutFirst = [owner, second];
  const drifted = [owner, { ...second, createdAt: at(20) }];
  const snapshots = [initial, initial, withoutFirst, drifted, drifted];
  const terminated = [];
  const result = executeRelease(plan, {
    platform: 'win32', discover: () => snapshots.shift() || drifted,
    terminate: (group) => terminated.push(group.rootPid), now: () => 1,
  });
  assert.deepEqual(terminated, [110]);
  assert.deepEqual(result, { released: 1, incomplete: 1, unsupported: false });
});

test('reports a same-owner replacement tree as incomplete', () => {
  const replacement = [owner, { ...wrapper, pid: 130, createdAt: at(30) }];
  const snapshots = [raw, raw, [owner], replacement];
  const result = executeRelease(planFor(), {
    platform: 'win32', discover: () => snapshots.shift() || replacement,
    terminate: () => {}, now: () => 1,
  });
  assert.deepEqual(result, { released: 0, incomplete: 1, unsupported: false });
});

test('checks lease concurrency immediately before mutation', () => {
  const terminated = [];
  const result = executeRelease(planFor(), {
    platform: 'win32', discover: () => raw,
    terminate: (group) => terminated.push(group.rootPid), canMutate: () => false, now: () => 1,
  });
  assert.deepEqual(terminated, []);
  assert.deepEqual(result, { released: 0, incomplete: 1, unsupported: false });
});

test('absolute deadline reserves final verification and refuses a late mutation', () => {
  const terminated = [];
  const result = executeRelease(planFor(), {
    platform: 'win32', discover: () => raw,
    terminate: (group) => terminated.push(group.rootPid),
    now: () => 600, deadline: 1000, finalReserve: 500,
  });
  assert.deepEqual(terminated, []);
  assert.deepEqual(result, { released: 0, incomplete: 1, unsupported: false });
});

test('refuses a tree that gains an invalid descendant after planning', () => {
  const invalid = [...raw, {
    pid: 112, ppid: 110, name: 'stale.exe', commandLine: 'stale.exe', createdAt: at(1),
  }];
  const terminated = [];
  const result = executeRelease(planFor(), {
    platform: 'win32', discover: () => invalid,
    terminate: (group) => terminated.push(group.rootPid), now: () => 1,
  });
  assert.deepEqual(terminated, []);
  assert.deepEqual(result, { released: 0, incomplete: 1, unsupported: false });
});

test('refuses a claimed live root whose command provenance becomes unavailable', () => {
  const hidden = analyzeProcesses([owner, { ...wrapper, commandLine: '' }, child]);
  assert.match(buildReleasePlan({
    inventory: hidden, owner: agent, claimedRoots: [{ pid: 110, createdAt: at(2) }],
  }).refusedReason, /claimed tree is not proven/i);
});

test('refuses a surviving child after its claimed wrapper exits', () => {
  const orphan = analyzeProcesses([owner, child]);
  assert.match(buildReleasePlan({
    inventory: orphan, owner: agent, claimedRoots: [{ pid: 110, createdAt: at(2) }],
  }).refusedReason, /claimed tree is not proven/i);
});

test('an unclaimed root appearing before the immediate snapshot blocks mutation', () => {
  const second = { ...wrapper, pid: 120, createdAt: at(4) };
  const expanded = [...raw, second];
  const snapshots = [raw, expanded, expanded];
  const terminated = [];
  const result = executeRelease(planFor(), {
    platform: 'win32', discover: () => snapshots.shift() || expanded,
    terminate: (group) => terminated.push(group.rootPid), now: () => 1,
    validateInventory: validateClaims([{ pid: 110, createdAt: at(2) }]),
  });
  assert.deepEqual(terminated, []);
  assert.deepEqual(result, { released: 0, incomplete: 1, unsupported: false });
});

test('an unclaimed root appearing after an empty plan is incomplete', () => {
  const appeared = [owner, wrapper];
  const result = executeRelease(planFor([owner]), {
    platform: 'win32', discover: () => appeared, terminate: () => {}, now: () => 1,
    validateInventory: validateClaims([]),
  });
  assert.deepEqual(result, { released: 0, incomplete: 1, unsupported: false });
});

test('an unclaimed post-kill root blocks every remaining claimed target', () => {
  const second = { ...wrapper, pid: 120, createdAt: at(4) };
  const third = { ...wrapper, pid: 130, createdAt: at(5) };
  const initial = [...raw, second];
  const after = [owner, second, third];
  const snapshots = [initial, initial, after, after];
  const terminated = [];
  const result = executeRelease(planFor(initial), {
    platform: 'win32', discover: () => snapshots.shift() || after,
    terminate: (group) => terminated.push(group.rootPid), now: () => 1,
    validateInventory: validateClaims([
      { pid: 110, createdAt: at(2) }, { pid: 120, createdAt: at(4) },
    ]),
  });
  assert.deepEqual(terminated, [110]);
  assert.deepEqual(result, { released: 0, incomplete: 2, unsupported: false });
});

test('refuses an invalid descendant that appears only in the immediate snapshot', () => {
  const immediateInvalid = [...raw, {
    pid: 112, ppid: 110, name: 'stale.exe', commandLine: 'stale.exe', createdAt: at(1),
  }];
  const snapshots = [raw, immediateInvalid, immediateInvalid];
  const terminated = [];
  const result = executeRelease(planFor(), {
    platform: 'win32', discover: () => snapshots.shift() || immediateInvalid,
    terminate: (group) => terminated.push(group.rootPid), now: () => 1,
  });
  assert.deepEqual(terminated, []);
  assert.deepEqual(result, { released: 0, incomplete: 1, unsupported: false });
});

test('ambiguous live root identity is incomplete, never released', () => {
  const ambiguous = [{ ...owner }, { ...wrapper, ppid: 999 }];
  const terminated = [];
  const result = executeRelease(planFor(), {
    platform: 'win32', discover: () => ambiguous,
    terminate: (group) => terminated.push(group.rootPid), now: () => 1,
  });
  assert.deepEqual(terminated, []);
  assert.deepEqual(result, { released: 0, incomplete: 1, unsupported: false });
});

test('missing creation time after termination is incomplete', () => {
  const after = [owner, { ...wrapper, createdAt: null }];
  const snapshots = [raw, raw, after, after];
  const result = executeRelease(planFor(), {
    platform: 'win32', discover: () => snapshots.shift() || after,
    terminate: () => {}, now: () => 1,
  });
  assert.deepEqual(result, { released: 0, incomplete: 1, unsupported: false });
});

test('an original child orphaned before mutation remains part of final proof', () => {
  const orphaned = [owner, wrapper, { ...child, ppid: 1 }];
  const snapshots = [orphaned, orphaned, orphaned, orphaned];
  const result = executeRelease(planFor(), {
    platform: 'win32', discover: () => snapshots.shift() || orphaned,
    terminate: () => {}, now: () => 1,
  });
  assert.deepEqual(result, { released: 0, incomplete: 1, unsupported: false });
});

test('a surviving planned child is incomplete after its wrapper root exits', () => {
  const staleOrphan = [owner, { ...child, ppid: 110 }];
  const terminated = [];
  const result = executeRelease(planFor(), {
    platform: 'win32', discover: () => staleOrphan,
    terminate: (group) => terminated.push(group.rootPid), now: () => 1,
  });
  assert.deepEqual(terminated, []);
  assert.deepEqual(result, { released: 0, incomplete: 1, unsupported: false });
});

test('a current-only child survives root exit before the immediate snapshot', () => {
  const lateChild = { pid: 112, ppid: 110, name: 'child.exe', commandLine: 'child.exe', createdAt: at(4) };
  const current = [...raw, lateChild];
  const orphaned = [owner, { ...lateChild, ppid: 110 }];
  const snapshots = [current, orphaned, orphaned];
  const result = executeRelease(planFor(), {
    platform: 'win32', discover: () => snapshots.shift() || orphaned,
    terminate: () => assert.fail('must not terminate an unproven tree'), now: () => 1,
  });
  assert.deepEqual(result, { released: 0, incomplete: 1, unsupported: false });
});

test('counts disjoint failed and respawned trees as separate incomplete targets', () => {
  const second = { ...wrapper, pid: 120, createdAt: at(4) };
  const firstOrphan = [owner, { ...child, ppid: 110 }, second];
  const replacement = [owner, { ...wrapper, pid: 130, createdAt: at(30) }];
  const snapshots = [firstOrphan, [owner, second], [owner, second], replacement, replacement];
  const result = executeRelease(planFor([...raw, second]), {
    platform: 'win32', discover: () => snapshots.shift() || replacement,
    terminate: () => {}, now: () => 1,
  });
  assert.deepEqual(result, { released: 0, incomplete: 2, unsupported: false });
});

test('a child spawned after the immediate snapshot is attributed after parent exit', () => {
  const lateOrphan = [owner, {
    pid: 112, ppid: 111, name: 'node.exe', commandLine: 'node late-mcp-child.mjs', createdAt: at(4),
  }];
  const snapshots = [raw, raw, lateOrphan, lateOrphan];
  const result = executeRelease(planFor(), {
    platform: 'win32', discover: () => snapshots.shift() || lateOrphan,
    terminate: () => {}, now: () => 1,
  });
  assert.deepEqual(result, { released: 0, incomplete: 1, unsupported: false });
});

test('a post-snapshot child with missing creation time is ambiguous and incomplete', () => {
  const ambiguousOrphan = [owner, {
    pid: 112, ppid: 111, name: 'node.exe', commandLine: 'node late-mcp-child.mjs', createdAt: null,
  }];
  const snapshots = [raw, raw, ambiguousOrphan, ambiguousOrphan];
  const result = executeRelease(planFor(), {
    platform: 'win32', discover: () => snapshots.shift() || ambiguousOrphan,
    terminate: () => {}, now: () => 1,
  });
  assert.deepEqual(result, { released: 0, incomplete: 1, unsupported: false });
});

test('a child of an immediate-only member remains attributable after both exit', () => {
  const immediateMember = {
    pid: 112, ppid: 111, name: 'node.exe', commandLine: 'node immediate-child.mjs', createdAt: at(4),
  };
  const expanded = [...raw, immediateMember];
  const survivingGrandchild = [owner, {
    pid: 113, ppid: 112, name: 'node.exe', commandLine: 'node late-grandchild.mjs', createdAt: at(5),
  }];
  const snapshots = [expanded, expanded, survivingGrandchild, survivingGrandchild];
  const result = executeRelease(planFor(), {
    platform: 'win32', discover: () => snapshots.shift() || survivingGrandchild,
    terminate: () => {}, now: () => 1,
  });
  assert.deepEqual(result, { released: 0, incomplete: 1, unsupported: false });
});

// SECTION: Complete descendant proof
// PURPOSE: Ensure finite-inventory traversal has no arbitrary depth blind spot.
// WHY: Windows tree termination can reach descendants deeper than typical wrappers.

test('raw descendant proof has no fixed-depth blind spot', () => {
  const deep = [{ ...owner, pid: 600, createdAt: 1000 }, {
    ...wrapper, pid: 601, ppid: 600, createdAt: 1001,
  }];
  for (let pid = 602; pid <= 670; pid += 1) {
    deep.push({ pid, ppid: pid - 1, name: 'child.exe', commandLine: 'child.exe', createdAt: 1000 + pid });
  }
  const group = analyzeProcesses(deep).groups[0];
  assert.equal(group.ownershipProven, true);
  assert.equal(group.treeMembers.length, 70);
  assert.equal(group.treeMembers.at(-1).pid, 670);
});

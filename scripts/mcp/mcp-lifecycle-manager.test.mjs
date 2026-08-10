#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: mcp-lifecycle-manager.test.mjs
 * PURPOSE: Lock the MCP lifecycle identity, lease, hook, and receipt contracts.
 * AUTHOR: Codex | LAST MODIFIED: 2026-08-08
 * AI VILLAGE VALIDATED: Not run (permission-gated)
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Exercises exact allowlists, ownership proof, lease
 * schemas, sanitized output, and the installed Claude hook configuration.
 * HOW IT FITS IN THE APP: Node test runner -> lifecycle modules and project config.
 * KEY DECISIONS: Negative lookalikes and fail-closed corruption are first-class.
 * NASM PROTOCOL CONTEXT: Not applicable; this is agent infrastructure.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyzeProcesses, auditText, buildReleasePlan, buildStartWarning, classifyMcpProcess, parseKeepList } from './mcp-lifecycle-core.mjs';
import { hookFailureReceipt, keepForBoundary, parseCliArgs, parseProcessJson, refreshedReleasePlan, removeLeaseStatus } from './mcp-lifecycle-manager.mjs';
import {
  allLeases, CURRENT_SCOPE_ID, CURRENT_STATE_DIR, leaseMatchesOwner, nextLease, parseLeaseText, readLease,
  removeLease, saveLease, validateHookInput, validateLease,
  sessionOwnsExclusiveState, withOwnerLock, withOwnerStartupGate,
} from './mcp-lifecycle-leases.mjs';
const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..');
const at = (seconds) => Date.parse(`2026-08-08T00:00:${String(seconds).padStart(2, '0')}.000Z`);
const processes = [
  { pid: 100, ppid: 1, name: 'claude.exe', commandLine: 'claude.exe', createdAt: at(1) },
  { pid: 110, ppid: 100, name: 'cmd.exe', commandLine: 'cmd /c npx -y @playwright/mcp@latest', createdAt: at(2) },
  { pid: 111, ppid: 110, name: 'node.exe', commandLine: 'node C:/npm/node_modules/@playwright/mcp/cli.js', createdAt: at(3) },
  { pid: 120, ppid: 100, name: 'cmd.exe', commandLine: 'cmd /c npx -y @playwright/mcp@latest', createdAt: at(4) },
  { pid: 200, ppid: 1, name: 'claude.exe', commandLine: 'claude.exe', createdAt: at(5) },
  { pid: 210, ppid: 200, name: 'cmd.exe', commandLine: 'cmd /c npx -y @playwright/mcp@latest', createdAt: at(6) },
  { pid: 300, ppid: 1, name: 'codex.exe', commandLine: 'codex.exe app-server', createdAt: at(7) },
  { pid: 310, ppid: 300, name: 'cmd.exe', commandLine: 'cmd /c npx -y @playwright/mcp@latest', createdAt: at(8) },
  { pid: 400, ppid: 300, name: 'node.exe', commandLine: 'node C:/brain/lumen-graphify-mcp.mjs', createdAt: at(9) },
  { pid: 500, ppid: 1, name: 'node.exe', commandLine: 'node custom-mcp-server.mjs', createdAt: at(10) },
];
assert.match(CURRENT_STATE_DIR.replaceAll('\\', '/'), /swan-mcp-lifecycle-tests\/\d+$/);
assert.doesNotMatch(CURRENT_STATE_DIR.replaceAll('\\', '/'), /swan-mcp-lifecycle\/host-v2$/);
// SECTION: Exact process identity and ownership
// PURPOSE: Prove that only configured roots under real agent executables qualify.
// WHY: Process mutation cannot rely on command-line substring resemblance.
test('classifies only the exact repo-configured Playwright wrapper', () => {
  const configured = JSON.parse(readFileSync(join(REPO, '.mcp.json'), 'utf8')).mcpServers.playwright;
  assert.deepEqual(
    [configured.command, ...configured.args],
    ['cmd', '/c', 'npx', '-y', '@playwright/mcp@latest'],
  );
  assert.equal(
    classifyMcpProcess('cmd /c npx -y @playwright/mcp@latest', 'cmd.exe'),
    'playwright',
  );
  const lookalikes = [
    ['cmd /c echo @playwright/mcp', 'cmd.exe'],
    ['node archive.mjs C:/brain/lumen-graphify-mcp.mjs', 'node.exe'],
    ['node runner.mjs C:/bin/graphify-mcp.mjs', 'node.exe'],
    ['node runner.mjs C:/bin/node_repl.exe', 'node.exe'],
    ['node runner.mjs C:/open-design/apps/daemon/dist/cli.js mcp', 'node.exe'],
    ['node C:/tmp/test-fixtures/lumen-graphify-mcp.mjs', 'node.exe'],
    ['node C:/customer/project/graphify-mcp.mjs', 'node.exe'],
    ['C:/unrelated/bin/node_repl.exe', 'node_repl.exe'],
    ['cmd /c npx @playwright/mcp@latest', 'cmd.exe'],
    ['cmd /c npx -y @playwright/mcp@latest && echo done', 'cmd.exe'],
    ['cmd.exe /q /v /c npx -y @playwright/mcp@latest', 'cmd.exe'],
    ['node C:/unrelated/node_modules/@playwright/mcp/cli.js --help', 'node.exe'],
  ];
  for (const [command, name] of lookalikes) assert.equal(classifyMcpProcess(command, name), null);
});
test('collapses the exact wrapper and child into one owned process tree', () => {
  const inventory = analyzeProcesses(processes);
  const group = inventory.groups.find((item) => item.rootPid === 110);
  assert.deepEqual(group.aliases, ['playwright']);
  assert.deepEqual(group.treeMembers.map((member) => member.pid), [110, 111]);
  assert.equal(inventory.groups.some((item) => item.rootPid === 111), false);
  assert.equal(inventory.unmanagedMcpLike.some((item) => item.pid === 400), true);
});
test('KEEP protects the full tree and plans only current-Claude trees', () => {
  const inventory = analyzeProcesses(processes);
  const owner = { kind: 'claude', pid: 100, createdAt: at(1) };
  const kept = buildReleasePlan({ inventory, owner, keep: parseKeepList('playwright') });
  assert.deepEqual(kept.kill, []);
  assert.deepEqual(kept.kept.map((group) => group.rootPid), [110, 120]);
  const plan = buildReleasePlan({ inventory, owner, keep: new Set() });
  assert.deepEqual(plan.kill.map((group) => group.rootPid), [110, 120]);
  assert.equal(plan.protected.some((group) => group.agentPid === 200), true);
  assert.equal(plan.protected.some((group) => group.agentPid === 300), true);
  assert.match(buildReleasePlan({
    inventory, owner, keep: new Set(), notBefore: at(3),
  }).refusedReason, /predates the session lease/i);
  const oneRoot = analyzeProcesses(processes.filter((item) => [100, 110, 111].includes(item.pid)));
  assert.match(buildReleasePlan({
    inventory: oneRoot, owner, notBefore: at(2), claimedRoots: [{ pid: 110, createdAt: at(2) }],
  }).refusedReason, /predates the session lease/i);
  assert.match(buildReleasePlan({
    inventory, owner, claimedRoots: [{ pid: 110, createdAt: at(2) }],
  }).refusedReason, /not claimed by this lease/i);
});
test('shared Codex hosts and ambiguous ancestry cannot receive a release plan', () => {
  const inventory = analyzeProcesses(processes);
  const codexPlan = buildReleasePlan({
    inventory, owner: { kind: 'codex', pid: 300, createdAt: at(7) }, keep: new Set(),
  });
  assert.match(codexPlan.refusedReason, /shared host/i);
  const reused = analyzeProcesses([
    { pid: 10, ppid: 1, name: 'claude.exe', commandLine: 'claude.exe', createdAt: at(9) },
    { pid: 11, ppid: 10, name: 'cmd.exe', commandLine: 'cmd /c npx -y @playwright/mcp@latest', createdAt: at(2) },
  ]);
  assert.equal(reused.groups[0].ownershipProven, false);
  const staleChild = analyzeProcesses([
    { pid: 40, ppid: 1, name: 'claude.exe', commandLine: 'claude.exe', createdAt: at(1) },
    { pid: 41, ppid: 40, name: 'cmd.exe', commandLine: 'cmd /c npx -y @playwright/mcp@latest', createdAt: at(4) },
    { pid: 42, ppid: 41, name: 'old.exe', commandLine: 'old.exe', createdAt: at(2) },
  ]);
  assert.equal(staleChild.groups[0].ownershipProven, false);
  assert.match(buildReleasePlan({
    inventory: staleChild, owner: { kind: 'claude', pid: 40, createdAt: at(1) }, keep: new Set(),
  }).refusedReason, /ambiguous/i);
  const missingRootTime = analyzeProcesses([
    { pid: 50, ppid: 1, name: 'claude.exe', commandLine: 'claude.exe', createdAt: at(1) },
    { pid: 51, ppid: 50, name: 'cmd.exe', commandLine: 'cmd /c npx -y @playwright/mcp@latest' },
  ]);
  assert.equal(missingRootTime.groups[0].agentPid, 50);
  assert.equal(missingRootTime.groups[0].ownershipProven, false);
  assert.match(buildReleasePlan({
    inventory: missingRootTime, owner: { kind: 'claude', pid: 50, createdAt: at(1) }, keep: new Set(),
  }).refusedReason, /ambiguous/i);
});
test('Claude owner recognition rejects command-line helper lookalikes', () => {
  for (const fakeOwner of [
    { pid: 60, ppid: 1, name: 'node.exe', commandLine: 'node C:/tools/claude-code-helper.mjs', createdAt: at(1) },
    { pid: 60, ppid: 1, name: 'claude.exe', commandLine: 'node C:/tools/helper.mjs', createdAt: at(1) },
  ]) {
    const helper = analyzeProcesses([
      fakeOwner,
      { pid: 61, ppid: 60, name: 'cmd.exe', commandLine: 'cmd /c npx -y @playwright/mcp@latest', createdAt: at(2) },
    ]);
    assert.equal(helper.groups[0].agentKind, null);
    assert.equal(buildReleasePlan({
      inventory: helper, owner: { kind: null, pid: null, createdAt: null }, keep: new Set(),
    }).kill.length, 0);
  }
});
test('PowerShell dotnet CreationDate values preserve valid ancestry proof', () => {
  const inventory = analyzeProcesses([
    { ProcessId: 30, ParentProcessId: 1, Name: 'claude.exe', CommandLine: 'claude.exe', CreationDate: '\\/Date(1000)\\/' },
    { ProcessId: 31, ParentProcessId: 30, Name: 'cmd.exe', CommandLine: 'cmd /c npx -y @playwright/mcp@latest', CreationDate: '\\/Date(2000)\\/' },
  ]);
  assert.equal(inventory.groups[0].agentKind, 'claude');
  assert.equal(inventory.groups[0].ownershipProven, true);
});
test('KEEP and CLI parsers refuse missing, malformed, and unknown values', () => {
  assert.equal(parseCliArgs([]).mode, 'audit');
  assert.equal(parseCliArgs(['--mode=enforce']).mode, 'enforce');
  assert.throws(() => parseCliArgs(['--mode=unexpected']), /unknown mode/i);
  assert.deepEqual([...parseCliArgs(['--keep=playwright', '--confirm']).keep], ['playwright']);
  assert.throws(() => parseCliArgs(['--keep', '--confirm']), /requires a value/i);
  assert.throws(() => parseCliArgs(['--keep=typo']), /non-allowlisted/i);
  try {
    parseCliArgs(['--mystery=secret-value']);
    assert.fail('expected sanitized refusal');
  } catch (error) {
    assert.equal(error.message, 'unknown argument');
  }
  assert.deepEqual([...parseKeepList('none')], []);
});
test('inventory parsing and audit receipts never echo command material', () => {
  assert.throws(() => parseProcessJson('{"CommandLine":"sentinel-secret"'), {
    message: 'process inventory parse failed',
  });
  assert.throws(() => parseProcessJson(' '.repeat((4 * 1024 * 1024) + 1)), {
    message: 'process inventory bound exceeded',
  });
  assert.throws(() => parseProcessJson(JSON.stringify(Array.from({ length: 10_001 }, () => ({})))), {
    message: 'process inventory bound exceeded',
  });
  const inventory = analyzeProcesses([
    { pid: 300, ppid: 1, name: 'codex.exe', commandLine: 'codex.exe app-server', createdAt: at(1) },
    { pid: 301, ppid: 300, name: 'node.exe', commandLine: 'node mcp-lifecycle-manager.mjs', createdAt: at(2) },
    { pid: 302, ppid: 301, name: 'powershell.exe', commandLine: 'powershell process mcp inventory', createdAt: at(3) },
  ]);
  const receipt = auditText(inventory, { kind: 'codex', pid: 300 }, 301);
  assert.match(receipt, /unmanaged-mcp-like-processes: 0/);
  assert.doesNotMatch(receipt, /sentinel|commandline/i);
  const unresolved = analyzeProcesses([
    { pid: 1, ppid: 0, name: 'explorer.exe', commandLine: 'explorer.exe', createdAt: at(1) },
    { pid: 301, ppid: 1, name: 'node.exe', commandLine: 'node mcp-lifecycle-manager.mjs', createdAt: at(2) },
    { pid: 302, ppid: 301, name: 'powershell.exe', commandLine: 'powershell mcp inventory', createdAt: at(3) },
    { pid: 400, ppid: 1, name: 'node.exe', commandLine: 'node unrelated-mcp-server.mjs', createdAt: at(2) },
  ]);
  assert.match(auditText(unresolved, { kind: null, pid: null }, 301), /unmanaged-mcp-like-processes: 1/);
  const reusedManagerPid = analyzeProcesses([
    { pid: 301, ppid: 1, name: 'node.exe', commandLine: 'node mcp-lifecycle-manager.mjs', createdAt: at(3) },
    { pid: 302, ppid: 301, name: 'node.exe', commandLine: 'node unrelated-mcp-server.mjs', createdAt: at(1) },
  ]);
  assert.match(auditText(reusedManagerPid, { kind: null, pid: null }, 301), /unmanaged-mcp-like-processes: 1/);
});
test('hook input requires the expected event and a bounded string session ID', () => {
  assert.equal(
    validateHookInput({ hook_event_name: 'SessionStart', session_id: 'abc-123' }, 'SessionStart'),
    'abc-123',
  );
  assert.throws(() => validateHookInput({ hook_event_name: 'SessionEnd', session_id: 'abc' }, 'SessionStart'));
  assert.throws(() => validateHookInput({ hook_event_name: 'SessionStart', session_id: {} }, 'SessionStart'));
  assert.throws(() => validateHookInput({ hook_event_name: 'SessionStart', session_id: ' '.repeat(2) }, 'SessionStart'));
  assert.throws(() => validateHookInput({ hook_event_name: 'SessionStart', session_id: 'x'.repeat(257) }, 'SessionStart'));
});
// SECTION: Lease and hook concurrency
// PURPOSE: Exercise atomic state and pre-lock startup visibility.
// WHY: An unregistered SessionStart must block cleanup before it gets the lock.
test('repeated SessionStart preserves KEEP and rejects owner identity drift', () => {
  const owner = { kind: 'claude', pid: 100, createdAt: at(1) };
  const existing = {
    sessionId: 'abc', agentKind: 'claude', agentPid: 100, agentCreatedAt: at(1),
    scopeId: CURRENT_SCOPE_ID, keep: ['playwright'], roots: [], startedAt: new Date(at(2)).toISOString(),
  };
  assert.equal(nextLease(existing, 'abc', owner), existing);
  assert.deepEqual(nextLease(null, 'new', owner).keep, []);
  assert.throws(() => nextLease(existing, 'abc', { ...owner, createdAt: at(2) }), /mismatch/i);
  assert.equal(leaseMatchesOwner(existing, owner), true);
});
test('lease schema rejects corruption and stored-session mismatches', () => {
  const valid = {
    sessionId: 'lease-test', agentKind: 'claude', agentPid: 100,
    agentCreatedAt: at(1), scopeId: CURRENT_SCOPE_ID,
    keep: ['playwright'], roots: [], startedAt: new Date(at(2)).toISOString(),
  };
  assert.equal(validateLease(valid, 'lease-test'), valid);
  assert.throws(() => validateLease(valid, 'other-session'), /invalid lease state/i);
  assert.throws(() => parseLeaseText('{broken'), /invalid lease state/i);
  assert.throws(() => validateLease({ ...valid, keep: ['unknown'] }), /invalid lease state/i);
  assert.throws(() => validateLease({ ...valid, roots: [{ pid: 0, createdAt: at(1) }] }), /invalid lease state/i);
});
test('lease writes atomically replace valid state and owner locks are exclusive', () => {
  const sessionId = `unit-${process.pid}-${Date.now()}`;
  const owner = { kind: 'claude', pid: 99991, createdAt: at(1) };
  const first = nextLease(null, sessionId, owner);
  try {
    saveLease(first);
    saveLease({ ...first, keep: ['playwright'] });
    assert.deepEqual(readLease(sessionId).keep, ['playwright']);
    withOwnerLock(owner, () => {
      assert.throws(() => withOwnerLock(owner, () => {}, 20), /lock unavailable/i);
      withOwnerStartupGate(owner, () => {
        assert.throws(() => withOwnerStartupGate(owner, () => {}, 20), /lock unavailable/i);
      });
    });
  } finally {
    removeLease(sessionId);
  }
});
test('same-owner state from a different worktree blocks exclusive cleanup', () => {
  const owner = { kind: 'claude', pid: 100, createdAt: at(1) };
  const current = nextLease(null, 'current-scope', owner);
  const foreignScope = { ...nextLease(null, 'foreign-scope', owner), scopeId: 'abcdef0123456789abcd' };
  assert.equal(sessionOwnsExclusiveState('current-scope', owner, current, [current], []), true);
  const tombstone = { ownerPid: owner.pid, ownerCreatedAt: owner.createdAt };
  assert.equal(sessionOwnsExclusiveState('current-scope', owner, current, [current], [], [tombstone]), false);
  assert.equal(sessionOwnsExclusiveState(
    'current-scope', owner, current, [current, foreignScope], [],
  ), false);
  assert.equal(sessionOwnsExclusiveState(
    'current-scope', owner, current, [current], [foreignScope],
  ), false);
});
test('lease removal failures return an explicit sanitized status', () => {
  assert.equal(removeLeaseStatus('receipt-test', () => {}), 'removed');
  assert.equal(removeLeaseStatus('receipt-test', () => { throw new Error('secret path'); }), 'removal-failed');
  assert.match(hookFailureReceipt('hook-end'), /evidence=not-attempted, lease=unknown/);
  assert.match(hookFailureReceipt('hook-end', 'absent'), /lease=absent/);
  assert.match(hookFailureReceipt('hook-end', 'retained'), /lease=retained/);
});
test('SessionEnd ignores task KEEP while dry-run release honors it', () => {
  assert.deepEqual([...keepForBoundary('hook-end', null, ['playwright'])], []);
  assert.deepEqual([...keepForBoundary('release', null, ['playwright'])], ['playwright']);
});
test('SessionEnd refreshes an initially empty inventory inside the owner lock', () => {
  const owner = { kind: 'claude', pid: 100, createdAt: at(1) };
  const managerLeaf = {
    pid: 101, ppid: 100, name: 'node.exe', commandLine: 'node mcp-lifecycle-manager.mjs', createdAt: at(2),
  };
  const initial = analyzeProcesses([processes[0], managerLeaf]);
  assert.equal(buildReleasePlan({ inventory: initial, owner, keep: new Set() }).kill.length, 0);
  const refreshed = refreshedReleasePlan(owner, [processes[0], managerLeaf, processes[3]], 101);
  assert.deepEqual(refreshed.plan.kill.map((group) => group.rootPid), [120]);
});
test('start warning counts duplicate trees inside one Claude session', () => {
  const warning = buildStartWarning(analyzeProcesses(
    processes.filter((item) => [100, 110, 111, 120].includes(item.pid)),
  ));
  assert.match(warning, /2 playwright groups/i);
  const separateOwners = analyzeProcesses(processes.filter(
    (item) => [100, 110, 111, 200, 210].includes(item.pid),
  ));
  assert.equal(buildStartWarning(separateOwners), '');
});

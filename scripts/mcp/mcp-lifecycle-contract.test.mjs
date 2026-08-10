#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: mcp-lifecycle-contract.test.mjs
 * PURPOSE: Lock the installed Claude hook and mirrored skill contract.
 * AUTHOR: Codex | LAST MODIFIED: 2026-08-08
 * AI VILLAGE VALIDATED: Not run (permission-gated)
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Verifies portable hook commands, timeout budgets, and
 * identical honest lifecycle guidance across Claude and Codex skill surfaces.
 * HOW IT FITS IN THE APP: Node test runner -> project config and skill mirrors.
 * KEY DECISIONS: Config must dominate internal waits and disclose provenance limits.
 * NASM PROTOCOL CONTEXT: Not applicable; this is agent infrastructure.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..');

// SECTION: Installed contract
// PURPOSE: Verify hook portability, bounded timeouts, and mirrored skill truth.
// WHY: Correct library code is ineffective if configuration or guidance drifts.

test('Claude hooks use project-root-safe commands and bounded timeout budgets', () => {
  const settings = JSON.parse(readFileSync(join(REPO, '.claude', 'settings.json'), 'utf8'));
  const hooks = (event) => (settings.hooks?.[event] || []).flatMap((group) => group.hooks || [])
    .filter((hook) => hook.command.includes('mcp-lifecycle-hook'));
  assert.deepEqual(hooks('SessionStart'), [{
    type: 'command',
    command: 'powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "${CLAUDE_PROJECT_DIR}/scripts/mcp/mcp-lifecycle-hook.ps1" -Event SessionStart -Mode audit',
    timeout: 45,
  }]);
  assert.deepEqual(hooks('SessionEnd'), [{
    type: 'command',
    command: 'powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "${CLAUDE_PROJECT_DIR}/scripts/mcp/mcp-lifecycle-hook.ps1" -Event SessionEnd -Mode audit',
    timeout: 60,
  }]);
  const discoveryBudgetSeconds = 2;
  const twoLockWaitsSeconds = 24;
  const releaseAndFinalScanSeconds = 10;
  assert.ok(hooks('SessionStart')[0].timeout > discoveryBudgetSeconds + twoLockWaitsSeconds);
  assert.ok(hooks('SessionEnd')[0].timeout
    > discoveryBudgetSeconds + twoLockWaitsSeconds + releaseAndFinalScanSeconds);
});

test('Windows hook coordinator owns named mutexes and a kill-on-close Job Object', () => {
  const path = join(REPO, 'scripts', 'mcp', 'mcp-lifecycle-hook.ps1');
  assert.equal(existsSync(path), true);
  const coordinator = readFileSync(path, 'utf8');
  assert.match(coordinator, /System\.Threading\.Mutex/);
  assert.match(coordinator, /JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE/);
  assert.match(coordinator, /SWAN_MCP_COORDINATED/);
  assert.match(coordinator, /hook-start-publish/);
  assert.match(coordinator, /hook-start-register/);
  assert.match(coordinator, /lifecycle[\s\S]*startup/);
  assert.match(coordinator, /\$parentCreated\s*-gt\s*\$childCreated/);
  assert.match(coordinator, /StandardError\.ReadToEndAsync\(\)/);
  assert.match(coordinator, /Assign\([\s\S]*StandardInput\.Write\(\$HookJson\)/);
  assert.match(coordinator, /global-state/);
  assert.match(coordinator, /'Keep'[\s\S]*keep --keep=/);
  assert.match(coordinator, /'Rearm'[\s\S]*rearm --confirm/);
});

test('mirrored skill states SessionEnd-routed mutation and honest Codex limits', () => {
  const agentSkill = readFileSync(join(REPO, '.agents', 'skills', 'mcp-lifecycle-hygiene', 'SKILL.md'), 'utf8');
  const claudeSkill = readFileSync(join(REPO, '.claude', 'skills', 'mcp-lifecycle-hygiene', 'SKILL.md'), 'utf8');
  assert.equal(claudeSkill, agentSkill);
  assert.match(agentSkill, /SessionEnd-routed/i);
  assert.match(agentSkill, /manual,\s+audit-only Codex/i);
  assert.match(agentSkill, /does not continuously negotiate/i);
  assert.match(agentSkill, /not cryptographically attested/i);
});

test('Windows mutation uses start-time-bound process handles and start failure is visible', () => {
  const manager = readFileSync(join(REPO, 'scripts', 'mcp', 'mcp-lifecycle-manager.mjs'), 'utf8');
  assert.doesNotMatch(manager, /taskkill/i);
  assert.match(manager, /\.Handle/);
  assert.match(manager, /StartTime/);
  assert.match(manager, /\.Kill\(\)/);
  assert.match(manager, /Claude owner unavailable/);
  assert.match(manager, /result\s*=\s*runReleaseBoundary\(/);
  assert.match(manager, /mode:\s*args\.mode/);
  assert.match(manager, /\bdirty,\s*coordinated:/);
  assert.match(manager, /coordinated:\s*process\.env\.SWAN_MCP_COORDINATED\s*===\s*'1'/);
  assert.match(manager, /runEnforcementTransaction\(CURRENT_STATE_DIR/);
  assert.match(manager, /readDirtyLatch\(CURRENT_STATE_DIR\)/);
  assert.match(manager, /\['status',\s*'doctor'\]\.includes\(command\)/);
  assert.match(manager, /rearmDirtyLatch\(CURRENT_STATE_DIR/);
  assert.match(manager, /\['keep',\s*'rearm'\]\.includes\(command\)/);
  assert.match(manager, /pruneExitedTombstones\(CURRENT_STATE_DIR,\s*refreshed\.inventory\.processes\)/);
  assert.match(manager, /result\.auditOnly[\s\S]*recordTombstoneAndRemove/);
  assert.match(manager, /claimSessionRoots\(/);
  assert.match(manager, /group\.rootCreatedAt\s*>\s*pending\.publishedAt/);
  assert.match(manager, /savePendingStart\(nextPendingStart\(sessionId,\s*owner,\s*holder\)\)/);
  assert.match(manager, /removePendingStart\(sessionId,\s*pending\.nonce\)/);
  assert.match(manager, /command === 'hook-start-publish'/);
  assert.match(manager, /command === 'hook-start-register'/);
  assert.match(manager, /readPendingStart\(sessionId\)/);
  assert.match(manager, /quarantinePendingStart\(stale\.sessionId,\s*stale,\s*refreshed\.inventory\.processes\)/);
});

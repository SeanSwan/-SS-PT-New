#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: mcp-lifecycle-locks.test.mjs
 * PURPOSE: Prove the Windows mutex and Job Object coordinator with a safe worker.
 * AUTHOR: Codex | LAST MODIFIED: 2026-08-09
 * AI VILLAGE VALIDATED: Not run (permission-gated)
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Runs coordinator self-test mode; no MCP process is touched.
 * HOW IT FITS IN THE APP: Node test runner -> PowerShell lifecycle coordinator.
 * KEY DECISIONS: The test child is owned by the test Job Object only.
 * NASM PROTOCOL CONTEXT: Not applicable; this is agent infrastructure.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), 'mcp-lifecycle-hook.ps1');
const waitUntil = async (predicate, timeoutMs = 5000) => {
  const deadline = Date.now() + timeoutMs;
  while (!predicate() && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 25));
  return predicate();
};

test('coordinator acquires named mutex and runs a Job-owned safe worker', {
  skip: process.platform !== 'win32',
}, () => {
  const output = execFileSync('powershell.exe', [
    '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', SCRIPT,
    '-Event', 'SessionStart', '-Mode', 'audit', '-SelfTest',
  ], { encoding: 'utf8', timeout: 10_000, env: { ...process.env, SWAN_MCP_SELF_TEST: '1' } });
  assert.match(output, /self-test=pass/);
});

test('coordinator self-test switches refuse without the test-only environment gate', {
  skip: process.platform !== 'win32',
}, () => {
  const env = { ...process.env };
  delete env.SWAN_MCP_SELF_TEST;
  const output = execFileSync('powershell.exe', [
    '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', SCRIPT,
    '-Event', 'SessionStart', '-Mode', 'audit', '-SelfTest',
  ], { encoding: 'utf8', timeout: 10_000, env });
  assert.match(output, /refused safely/);
  assert.doesNotMatch(output, /self-test=pass/);
});

test('coordinator death closes the Job and kills its test child', {
  skip: process.platform !== 'win32', timeout: 15_000,
}, async (t) => {
  const root = mkdtempSync(join(tmpdir(), 'mcp-job-test-'));
  const pidFile = join(root, 'child.pid');
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const coordinator = spawn('powershell.exe', [
    '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', SCRIPT,
    '-Event', 'SessionStart', '-Mode', 'audit', '-SelfTestCrash', '-SelfTestPidFile', pidFile,
  ], { stdio: 'ignore', env: { ...process.env, SWAN_MCP_SELF_TEST: '1' } });
  t.after(() => { if (!coordinator.killed) coordinator.kill(); });
  assert.equal(await waitUntil(() => existsSync(pidFile)), true);
  const childPid = Number(readFileSync(pidFile, 'utf8'));
  assert.ok(Number.isInteger(childPid) && childPid > 0);
  coordinator.kill();
  assert.equal(await waitUntil(() => {
    try {
      execFileSync('powershell.exe', [
        '-NoProfile', '-NonInteractive', '-Command',
        `if(Get-Process -Id ${childPid} -ErrorAction SilentlyContinue){exit 0}else{exit 1}`,
      ], { stdio: 'ignore', timeout: 1000 });
      return false;
    } catch { return true; }
  }), true);
});

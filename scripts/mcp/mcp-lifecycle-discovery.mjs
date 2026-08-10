/**
 * ============================================================================
 * FILE: mcp-lifecycle-discovery.mjs
 * PURPOSE: Discover a bounded process inventory inside one hook deadline.
 * AUTHOR: Codex | LAST MODIFIED: 2026-08-09
 * AI VILLAGE VALIDATED: Not run (permission-gated)
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Runs the platform inventory command and parses only a
 * bounded count and byte volume into lifecycle analysis input.
 * HOW IT FITS IN THE APP: Lifecycle manager -> discovery -> core analyzer.
 * KEY DECISIONS: Exhausted budget and oversized inventory fail closed.
 * NASM PROTOCOL CONTEXT: Not applicable; this is agent infrastructure.
 */

import { execFileSync } from 'node:child_process';
import process from 'node:process';

const MAX_BYTES = 4 * 1024 * 1024;
const MAX_PROCESSES = 10_000;

/** Parse process JSON without echoing command material in errors. */
export function parseProcessJson(output) {
  if (Buffer.byteLength(output, 'utf8') > MAX_BYTES) {
    throw new Error('process inventory bound exceeded');
  }
  try {
    const parsed = JSON.parse(output);
    if (Array.isArray(parsed) && parsed.length > MAX_PROCESSES) {
      throw new Error('process inventory bound exceeded');
    }
    return parsed;
  } catch (error) {
    if (error?.message === 'process inventory bound exceeded') throw error;
    throw new Error('process inventory parse failed');
  }
}

function timeoutFor(budget, cap) {
  const timeout = budget ? budget.timeout(cap, 2_000) : cap;
  if (timeout < 250) throw new Error('process discovery budget exhausted');
  return timeout;
}

function discoverWindows(budget) {
  const script = [
    '$p=Get-CimInstance Win32_Process | Select-Object Name,ProcessId,ParentProcessId,CreationDate,CommandLine',
    '$p | ConvertTo-Json -Compress -Depth 2',
  ].join('; ');
  const output = execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], {
    encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: timeoutFor(budget, 1500),
    maxBuffer: MAX_BYTES,
  }).trim();
  if (!output) return [];
  const parsed = parseProcessJson(output);
  return Array.isArray(parsed) ? parsed : [parsed];
}

function discoverPosix(budget) {
  const output = execFileSync('ps', ['-eo', 'pid=,ppid=,comm=,args='], {
    encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: timeoutFor(budget, 4000),
    maxBuffer: MAX_BYTES,
  });
  const processes = output.split(/\r?\n/).flatMap((line) => {
    const match = line.match(/^\s*(\d+)\s+(\d+)\s+(\S+)\s+(.*)$/);
    return match ? [{ pid: match[1], ppid: match[2], name: match[3], commandLine: match[4] }] : [];
  });
  if (processes.length > MAX_PROCESSES) throw new Error('process inventory bound exceeded');
  return processes;
}

/** Discover one bounded snapshot for the current operating system. */
export function discoverProcesses(budget) {
  return process.platform === 'win32' ? discoverWindows(budget) : discoverPosix(budget);
}

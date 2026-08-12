#!/usr/bin/env node
/**
 * lane-session-start.mjs — SessionStart orientation for the Coordination Ledger
 * =============================================================================
 * Prints the DELTA digest (who holds locks right now, my delivery state) so an
 * agent is oriented before its first edit. Never blocks.
 *
 * WHY DELTA AND CAPPED (hostile review, Kimi K3 + Tencent HY3, 2026-08-11 — both,
 * independently): a digest that reports EVERYTHING — 10 lanes, 184 worktrees, 225
 * dirty files — trains the reader to skim NOTHING. Because it never blocks it will
 * not be removed; it will be IGNORED, which fails silently while everyone believes
 * orientation is happening. So it reports only what intersects the next action:
 * fresh locks, my own delivery state, and counts (not lists) for everything else.
 *
 * Delegates to scripts/lane.mjs so there is ONE implementation of ledger truth.
 * Fail-open: any error prints nothing and exits 0.
 */
import { execSync } from 'node:child_process';

try {
  const out = execSync('node scripts/lane.mjs digest', {
    encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 10_000,
  }).trim();
  if (out) {
    console.log(out);
    console.log('[lane] claim before your first edit: node scripts/lane.mjs claim --task "<one line>" --files "a,b"');
  }
} catch { /* fail-open — orientation is never worth failing a session start */ }
process.exit(0);

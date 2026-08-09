#!/usr/bin/env node
/**
 * @file verify-until-dry-gate.mjs
 * @description Stop-hook adapter for current, hash-bound Code Perfectionist receipts.
 *
 * Observe reports gaps. Assist blocks only build/review-shaped turns and accepts
 * current LOCAL_ADVISORY proof. Enforce requires protected CI proof.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, lstatSync, readFileSync, realpathSync } from 'node:fs';
import { basename, dirname, isAbsolute, parse, relative, resolve } from 'node:path';

import { defaultReceiptPath } from '../verify-until-dry/cli.mjs';
import { decideHook } from '../verify-until-dry/hook-decision.mjs';
import { captureSnapshot } from '../verify-until-dry/snapshot.mjs';
import { analyzeTurn, isRealUserLine, parseTranscript, userLineText } from './dry-loop-gate.mjs';

const OWN_FEEDBACK_RE = /^\s*Stop hook feedback:[\s\S]*Code Perfectionist:/i;
const READ_ONLY_GIT_RE = /^\s*(?:LC_ALL=C\s+)?git(?:\.exe)?(?:\s+--no-pager)?(?:\s+-C\s+(?:"[^"]+"|'[^']+'|\S+))?\s+(?:status|diff|log|show|rev-parse|ls-files|grep|describe|cat-file|merge-base|cherry)\b/i;
const READ_ONLY_GIT_META_RE = /^\s*(?:LC_ALL=C\s+)?git(?:\.exe)?\s+(?:remote\s+(?:-v|get-url\b)|config\s+--(?:get|get-all|get-regexp|list)\b)/i;
const READ_ONLY_COMMAND_RE = /^\s*(?:rg|grep|cat|head|tail|ls|pwd|Get-Content|Test-Path|Get-ChildItem|Select-String|Get-Location)\b/i;

function readJson(path) {
  try { return JSON.parse(readFileSync(path, 'utf8')); } catch { return null; }
}

export function resolveMode(input = {}, env = process.env, argv = process.argv.slice(2)) {
  const flagIndex = argv.indexOf('--mode');
  const equalsFlag = argv.find((arg) => arg.startsWith('--mode='));
  const flagMode = flagIndex >= 0 ? argv[flagIndex + 1] : equalsFlag?.slice('--mode='.length);
  return flagMode ?? input.mode ?? env.VERIFY_UNTIL_DRY_MODE ?? 'observe';
}

export function canonicalRepoRoot(cwd) {
  const root = execFileSync('git', ['rev-parse', '--show-toplevel'], {
    cwd: resolve(cwd), encoding: 'utf8', windowsHide: true, timeout: 10_000,
  }).trim();
  if (!root) throw new Error('git-root-empty');
  return realpathSync(root);
}

function within(root, target) {
  const rel = relative(root, target);
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
}

function resolveAliases(target) {
  let cursor = resolve(target);
  const suffix = [];
  while (!existsSync(cursor)) {
    const parent = dirname(cursor);
    if (parent === cursor) return resolve(target);
    suffix.unshift(basename(cursor));
    cursor = parent;
  }
  try { return resolve(realpathSync(cursor), ...suffix); } catch { return resolve(target); }
}

function stripQuoted(command) {
  let quote = null;
  let escaped = false;
  let visible = '';
  for (const character of command) {
    if (escaped) { escaped = false; visible += quote ? ' ' : character; continue; }
    if (character === '\\') { escaped = true; visible += quote ? ' ' : character; continue; }
    if (quote) {
      if (character === quote) quote = null;
      visible += ' ';
    } else if (character === '"' || character === "'") {
      quote = character;
      visible += ' ';
    } else visible += character;
  }
  return visible;
}

function shellMayMutateRepo(command) {
  if (/[\r\n`]|\$\(/.test(command)) return true;
  const visible = stripQuoted(command);
  if (/[<>|;&]/.test(visible) || /\s(?:-o|--output)(?:\s|=)/i.test(visible)) return true;
  if (/(?:^|\s)-c(?:\s|$)/.test(visible) ||
      /--(?:ext-diff|filters|open-files-in-pager|textconv|pre|pre-glob)(?:\s|=|$)/i.test(visible)) return true;
  if (READ_ONLY_GIT_RE.test(command) || READ_ONLY_GIT_META_RE.test(command) ||
      READ_ONLY_COMMAND_RE.test(command)) return false;
  return true;
}

export function countOwnFeedback(transcriptRaw) {
  const entries = parseTranscript(transcriptRaw);
  const lastUser = entries.reduce((index, entry, candidate) =>
    (isRealUserLine(entry) ? candidate : index), -1);
  return entries.slice(lastUser + 1)
    .filter((entry) => entry?.type === 'user' && OWN_FEEDBACK_RE.test(userLineText(entry)))
    .length;
}

export function isVerificationTurn(transcriptRaw, repoRoot = null) {
  const signals = analyzeTurn(parseTranscript(transcriptRaw));
  const relevantWrite = signals.writePaths.some((target) => {
    if (!repoRoot) return true;
    const canonicalRoot = realpathSync(repoRoot);
    const lexicalTarget = resolve(repoRoot, target);
    const canonicalTarget = resolveAliases(lexicalTarget);
    if (within(canonicalRoot, canonicalTarget)) return true;
    if (!existsSync(lexicalTarget)) return false;
    if (parse(canonicalRoot).root.toLowerCase() !== parse(canonicalTarget).root.toLowerCase()) {
      return false;
    }
    try {
      const stat = lstatSync(lexicalTarget, { bigint: true });
      return stat.isFile() && stat.nlink > 1n;
    } catch { return true; }
  });
  const mutatingShell = signals.shellCommands.some((command) => shellMayMutateRepo(command));
  return relevantWrite || signals.gitActivity || mutatingShell ||
    signals.reviewRequested || signals.formalVerdictSeen;
}

export function main() {
  let input = {};
  try { input = JSON.parse(readFileSync(0, 'utf8')); } catch { /* enforce path handles absence */ }
  const mode = resolveMode(input);
  if (input?.stop_hook_active && mode !== 'assist') return;
  let repoRoot = null;
  try { repoRoot = canonicalRepoRoot(input.cwd ?? process.cwd()); } catch {
    if (mode !== 'observe' && mode !== 'assist') {
      process.stdout.write(`${JSON.stringify({
        decision: 'block',
        reason: 'Code Perfectionist: git-root-discovery-failed. Enforce mode cannot verify an unknown repository root.',
      })}\n`);
    }
    return;
  }
  if (mode === 'assist') {
    let transcriptRaw = '';
    try { transcriptRaw = readFileSync(String(input.transcript_path ?? ''), 'utf8'); } catch { return; }
    if (!isVerificationTurn(transcriptRaw, repoRoot)) return;
    if (input?.stop_hook_active && countOwnFeedback(transcriptRaw) >= 2) return;
  }
  const receiptPath = resolve(input.receipt_path ?? process.env.VERIFY_UNTIL_DRY_RECEIPT ?? defaultReceiptPath(repoRoot));
  const receipt = readJson(receiptPath);
  let currentSnapshot = null;
  let captureError = null;
  if (receipt) {
    try {
      currentSnapshot = captureSnapshot({ cwd: repoRoot, scopeContract: receipt.scopeContract ?? {} });
    } catch (error) {
      captureError = error.message;
    }
  }
  const decision = captureError
    ? { mode, block: mode !== 'observe', reason: `snapshot-capture-failed:${captureError}` }
    : decideHook({ mode, receipt, currentSnapshot });
  if (decision.block) {
    process.stdout.write(`${JSON.stringify({
      decision: 'block',
      reason: `Code Perfectionist: ${decision.reason}. Run the verify-until-dry skill and obtain ` +
        'a current CLEAN_IN_PROVEN_SCOPE receipt. A required paid Kimi K3 call still needs exact approval.',
    })}\n`);
  } else if (decision.reason !== 'clean-current-receipt') {
    process.stderr.write(`[verify-until-dry][observe] ${decision.reason}\n`);
  }
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop())) {
  main();
}

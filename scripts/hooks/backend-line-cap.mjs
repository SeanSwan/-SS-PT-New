#!/usr/bin/env node
/**
 * backend-line-cap.mjs — Rule 4's 300-line cap, for the half of the repo the frontend
 * guard never looks at.
 *
 * ── WHY THIS EXISTS ────────────────────────────────────────────────────────
 * `frontend-guards.mjs` already carries G6, the 300-line advisory. It only runs on
 * FRONTEND files, so backend `.mjs` drift has never been reported by anything. Over one
 * long review session six separate files crossed the cap while gaining fixes, and every
 * one was noticed a commit LATE — by a human reading `wc -l` after the fact, or by a
 * reviewer filing it as a house-rule violation.
 *
 * That is a duty enforced by memory, which is the failure mode this codebase keeps
 * writing up: corrections that name a command hold, corrections that name an intention
 * do not. So this is the command.
 *
 * ── ADVISORY, NOT BLOCKING, AND DELIBERATELY SO ────────────────────────────
 * Same reasoning G6 gives: the repo has pre-existing files over the cap, and a guard that
 * blocks a commit for legacy debt the author did not create (Rule 34) is a guard people
 * learn to bypass. It reports every time so the debt stays visible and cannot silently
 * grow. `swan-guard-allow-long-file` anywhere in the file opts out.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';

/** Match `wc -l`: count NEWLINES, not array slots. A file ending in a newline splits
 *  into one more element than it has lines, so a naive length reports 301 for a file
 *  every other tool calls 300 — and a guard that disagrees with wc by one is a guard
 *  whose warnings get argued with instead of acted on. */
const NL = String.fromCharCode(10);
const CAP = 300;
const BACKEND_RE = /^(backend|shared|scripts)\/.*\.(mjs|js|cjs)$/;
const VENDORED = /(^|\/)(node_modules|vendor|third[-_]party|migrations)\//;

function staged() {
  try {
    const out = execFileSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACMR'], { encoding: 'utf8' });
    return out.split('\n').map((f) => f.trim()).filter(Boolean).filter((f) => BACKEND_RE.test(f) && !VENDORED.test(f));
  } catch {
    return [];
  }
}

const args = process.argv.slice(2).filter((a) => a !== '--staged');
const targets = args.length ? args.filter((f) => existsSync(f)) : staged().filter((f) => existsSync(f));

const over = [];
for (const file of targets) {
  const text = readFileSync(file, 'utf8');
  if (/swan-guard-allow-long-file/.test(text)) continue;
  const lines = text.endsWith(NL) ? text.split(NL).length - 1 : text.split(NL).length;
  if (lines > CAP) over.push({ file, lines });
}

if (over.length) {
  for (const { file, lines } of over) {
    console.error(`WARN: backend-line-cap (Rule 4) — ${file} — ${lines} lines exceeds the ${CAP} cap; extract a cohesive piece when you next work in here.`);
  }
  console.error(`[backend-line-cap] ${over.length} file(s) over the cap. Advisory — the commit proceeds.`);
} else {
  console.log(`[backend-line-cap] CLEAN — ${targets.length} backend file(s) within the ${CAP}-line cap.`);
}
process.exit(0);

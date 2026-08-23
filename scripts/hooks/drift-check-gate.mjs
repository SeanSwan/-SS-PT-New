#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/hooks/drift-check-gate.mjs
 * PURPOSE: SessionStart hook — automatic drift detection (the `drift-check` skill,
 *          mechanised so it fires without anyone remembering to invoke it).
 * AUTHOR: Opus 5 | CREATED: 2026-08-02
 * ============================================================================
 *
 * WHAT THIS FILE DOES: at session start, runs the two fastest, highest-yield drift
 * checks and prints a compact warning ONLY when something is actually wrong.
 *
 *   1. Mirror drift — AGENTS.md vs CLAUDE.md, per each repo's own contract.
 *      SS-PT:     AGENTS.md = 45-line Codex adapter + mirrored CLAUDE.md body.
 *                 Byte-identical would be WRONG — it would delete the adapter.
 *      SwanGuard: AGENTS.md and CLAUDE.md ARE byte-identical mirrors.
 *      Same symptom, opposite correct fix. The hook encodes both contracts.
 *
 *   2. Branch freshness — commits behind main. A stale branch makes every other
 *      audit unreliable and means a fix here does not reach main.
 *
 * WHY THIS EXISTS: on 2026-08-02 both repos had drifted mirrors. In SwanGuard the
 * slice-continuity rule lived only in CLAUDE.md, and because context discovery is
 * first-match-wins (AGENTS.md sorts first), it was invisible to every agent relying
 * on auto-discovery. Nothing errored. A build ran against the wrong product.
 *
 * WHY SILENT WHEN CLEAN: Sean's standing token-economy rule. A hook that prints on
 * every session becomes noise and gets ignored — which is how the last guard failed.
 * Zero output on a clean repo; it only speaks when it has something to say.
 *
 * SAFETY: read-only. No writes, no network, no npm, no secrets read. Fail-open —
 * any error exits 0 silently rather than blocking a session.
 */

import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Resolve the repo from THIS FILE's location, never process.cwd().
 *
 * Caught in hostile review 2026-08-02: with `process.cwd()` the hook printed nothing
 * and exited 0 whenever the harness invoked it from any other directory — a silent
 * no-op that looks exactly like "no drift found". That is the precise failure class
 * `.claude/skills/drift-check/SKILL.md` check #6 warns about: a guard that reads as
 * protection while covering nothing.
 *
 * This file lives at <repo>/scripts/hooks/, so the repo root is two levels up.
 */
const SS_PT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SWANGUARD = 'C:/Users/BigotSmasher/Desktop/SwanGuard-Newsroom';

/** SS-PT contract: AGENTS.md = adapter header + mirrored CLAUDE.md body. */
const SS_PT_ADAPTER_LINES = 45;

const findings = [];

function read(p) {
  try { return existsSync(p) ? readFileSync(p, 'utf-8') : null; } catch { return null; }
}

/** Normalise line endings so CRLF/LF never reports as false drift. */
const norm = (s) => s.replace(/\r\n/g, '\n');

// ---- Check 1a: SS-PT mirror (adapter + body contract) ----------------------
try {
  const agents = read(join(SS_PT, 'AGENTS.md'));
  const claude = read(join(SS_PT, 'CLAUDE.md'));
  if (agents && claude) {
    const body = norm(agents).split('\n').slice(SS_PT_ADAPTER_LINES).join('\n');
    if (body.trimEnd() !== norm(claude).trimEnd()) {
      findings.push(
        'SS-PT AGENTS.md mirror body != CLAUDE.md. ' +
        'Fix: `node scripts/sync-agents-mirror.mjs` (use --check first). ' +
        'Do NOT make them byte-identical — lines 1-45 are the Codex adapter.'
      );
    }
  }
} catch { /* fail-open */ }

// ---- Check 1b: SwanGuard mirror (byte-identical contract) ------------------
try {
  const a = read(join(SWANGUARD, 'AGENTS.md'));
  const c = read(join(SWANGUARD, 'CLAUDE.md'));
  if (a && c && norm(a) !== norm(c)) {
    findings.push(
      'SwanGuard AGENTS.md != CLAUDE.md. These ARE byte-identical mirrors of one ' +
      'merged document — reconcile and copy one over the other before other work.'
    );
  }
} catch { /* fail-open */ }

// ---- Check 2: branch freshness --------------------------------------------
// Measured against origin/main, refreshed first. This used to run `main...HEAD`,
// but local `main` is itself a branch that goes stale: on 2026-08-03 it sat 746
// commits behind origin, so this gate announced "684 commits behind" when the true
// distance was 1430. A staleness detector that is itself stale is worse than no
// detector — it reads as authoritative and understates the risk, which is the exact
// failure class this hook exists to catch. The finding names the ref it measured so
// the number can be audited rather than trusted.
try {
  const git = (args, timeout = 5000) => execFileSync('git', args,
    { cwd: SS_PT, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'], timeout });

  const hasRef = (ref) => {
    try { git(['rev-parse', '--verify', '--quiet', `${ref}^{commit}`]); return true; }
    catch { return false; }
  };

  // Bounded refresh. Offline or slow remote falls through to whatever ref exists —
  // a stale origin/main still beats local main, and the label stays honest either way.
  try { git(['fetch', '--quiet', 'origin', 'main'], 8000); } catch { /* offline — fail-open */ }

  const ref = hasRef('origin/main') ? 'origin/main' : 'main';
  const out = git(['rev-list', '--left-right', '--count', `${ref}...HEAD`]);
  const [behind, ahead] = out.trim().split(/\s+/).map(Number);
  if (Number.isFinite(behind) && behind >= 50) {
    findings.push(
      `SS-PT branch is ${behind} commits behind ${ref} (${ahead} ahead). Files here may ` +
      'not reflect reality, tooling may appear "missing" when it exists on main, and ' +
      `fixes made here do NOT reach main. Verify against ${ref} before auditing.`
    );
  }
} catch { /* not a repo / no main / git absent — fail-open */ }

// ---- 7) Hook-registration integrity: a registered guard whose file is absent ----
//
// THE FAILURE THIS CATCHES (2026-08-22, found by Sean from outside the system):
// `.claude/settings.json` registered `lane-session-start.mjs` (SessionStart) and
// `push-blast-radius.mjs` (PreToolUse). Neither file existed on the branch. The
// harness cannot run a file it cannot find, so it emitted NOTHING — and nothing is
// byte-identical to what a healthy guard that found no problems emits. No error, no
// warning, no degraded mode. Every session read as clean while the Coordination
// Ledger went unread for weeks and pushes went unguarded.
//
// That is the general shape and it is why this check has to be mechanical:
// REGISTRATION IS NOT EXISTENCE, and a guard's silence is ambiguous by construction.
// You cannot notice this from inside a session; the only prior detection was a human
// spotting a second-order symptom (agents ignoring each other's notes).
//
// Also covers the wider version: an unparseable settings file silently disables EVERY
// hook it declares, which is the same failure with a larger blast radius.
try {
  const PATH_RE = /(?:scripts|\.claude)[/\\][A-Za-z0-9_./\\-]+\.(?:mjs|js|sh|ps1|py)/g;
  const missing = [];
  const unreadable = [];

  for (const name of ['settings.json', 'settings.local.json']) {
    const cfgPath = join(SS_PT, '.claude', name);
    const raw = read(cfgPath);
    if (raw === null) continue;              // absent is legitimate — settings.local.json is optional

    let cfg;
    try {
      cfg = JSON.parse(raw);
    } catch {
      // Not fail-open: a settings file the harness cannot parse runs NO hooks at all.
      unreadable.push(name);
      continue;
    }

    const seen = new Set();
    for (const [event, groups] of Object.entries(cfg.hooks || {})) {
      for (const group of groups || []) {
        for (const hook of group.hooks || []) {
          for (const m of String(hook.command || '').matchAll(PATH_RE)) {
            const rel = m[0].replace(/\\/g, '/');
            const key = `${event}:${rel}`;
            if (seen.has(key)) continue;
            seen.add(key);
            if (!existsSync(join(SS_PT, rel))) missing.push(`${rel} (${event}, ${name})`);
          }
        }
      }
    }
  }

  if (unreadable.length) {
    findings.push(
      `.claude/${unreadable.join(' and ')} is not valid JSON — the harness runs NONE of the ` +
      'hooks it declares. Every gate those files register is silently inactive right now.'
    );
  }
  if (missing.length) {
    findings.push(
      `${missing.length} registered hook file(s) DO NOT EXIST: ${missing.join('; ')}. ` +
      'A hook the harness cannot find emits nothing, which is indistinguishable from a ' +
      'hook that ran and found no problems — so this protection is off and reads as on. ' +
      'Restore the file(s) or remove the registration; do not leave a phantom guard.'
    );
  }
} catch { /* never let the integrity check itself break session start — fail-open */ }

// ---- Emit: silent when clean ----------------------------------------------
if (findings.length) {
  process.stdout.write(
    '[drift-check] ⚠ ' + findings.length + ' drift finding(s) — a doc that reads as ' +
    'authoritative may be wrong:\n' +
    findings.map((f, i) => `  ${i + 1}. ${f}`).join('\n') +
    '\nFull procedure (7 checks incl. stale registry, stale index, missing tooling, ' +
    'guard coverage gaps, hook-registration integrity): .claude/skills/drift-check/SKILL.md\n'
  );
}

process.exit(0);

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

import { readFileSync, existsSync, statSync } from 'node:fs';
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
//
// EXTRACTION — rewritten 2026-08-23 (second panel round). Two regex generations both
// failed, in opposite directions, and a third regex was the wrong answer:
//   v1 required `scripts/` or `.claude/` in the path, so a bare
//      `node lane-session-start.mjs` — literally the file from the incident —
//      matched nothing and the check went silent.
//   v2 anchored on the extension, which fixed that but broke two new ways:
//      FALSE POSITIVE: `node $CLAUDE_PROJECT_DIR/scripts/hooks/x.mjs` (the canonical
//        portable idiom) matched `CLAUDE_PROJECT_DIR/scripts/hooks/x.mjs` and reported
//        a healthy hook as missing. A phantom finding is not a harmless over-report —
//        it trains the operator to ignore the gate, which restores the original outage.
//      FALSE NEGATIVE: no match could ever START with `/` or `X:`, so absolute paths
//        were invisible, and the `^(?:[A-Za-z]:|\/)` branch written to handle them was
//        unreachable dead code. `NOT_A_FILE` was dead too — every match ends in an
//        extension, so it could never equal `npm`/`node`.
// Tokenising is the honest tool: split the command, look at each argument as an
// argument. Anything unresolvable is reported as UNVERIFIABLE rather than guessed in
// either direction — because for this check, a confident wrong answer in EITHER
// direction is the failure mode.
try {
  const SCRIPT_EXT = /\.(?:mjs|cjs|js|ts|mts|cts|sh|bash|ps1|py|rb)$/i;
  const URL_SCHEME = /^[a-z][a-z0-9+.-]*:\/\//i;
  /**
   * Split a shell-ish command into arguments, honouring simple quoting.
   *
   * The alternation must GLUE a quoted run to whatever abuts it: the canonical
   * portable form is `node "$CLAUDE_PROJECT_DIR"/scripts/hooks/x.mjs`, and a
   * naive `"[^"]*"|'[^']*'|\S+` splits that into `$CLAUDE_PROJECT_DIR` plus a
   * dangling `/scripts/hooks/x.mjs`, which then reads as an ABSOLUTE path and is
   * reported missing — a phantom on a perfectly healthy hook. Caught by this
   * check's own case matrix 2026-08-23, after a panel seat predicted it.
   */
  const tokenize = (cmd) => (String(cmd).match(/(?:"[^"]*"|'[^']*'|[^\s"'])+/g) || [])
    .map((t) => t.replace(/["']/g, ''));

  // ROUND 3 REDESIGN — asserting MISSING requires an unambiguous command.
  //
  // Three rounds of panel review each broke the previous shell-parsing attempt, in
  // alternating directions: v1 under-matched, v2 phantomed on $VAR and went blind on
  // absolute paths, v3 phantomed on `~/` and `sh -c '...'` while going silent on
  // `x.mjs;echo` (metacharacter glued to the token defeats the $-anchored extension
  // test — the ORIGINAL outage shape, reopened by the fix for it).
  //
  // The pattern in those failures is not a missing case. It is that a static checker
  // cannot faithfully parse arbitrary shell, and every patch that made one direction
  // safer made the other worse. So stop trying to be right about every command and
  // become HONEST about which ones can be judged:
  //
  //   simple command  -> assert. `<interpreter> <plain-path> [plain args]`, no shell
  //                      metacharacters anywhere, no globs, no interpolation. Here a
  //                      non-existent file is a real finding.
  //   anything else   -> UNVERIFIED. Reported as "could not check", never as clean
  //                      and never as missing.
  //
  // This trades some coverage for zero phantoms and zero false clean. Both wrong
  // answers are eliminated; what remains is an honest "I could not judge this one",
  // which a human can action. A checker that says "unknown" is useful; one that says
  // "clean" when it did not look is the thing this whole check exists to destroy.
  const SHELL_META = /[;&|><`$(){}*?~!#\n]|\\\s/;   // anything that changes word meaning
  const missing = [];
  const unresolvable = [];
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
      // A structurally-wrong hooks block is itself a finding. The previous version
      // coerced anomalies to [] and enumerated nothing, which reported "clean" for a
      // config the harness probably cannot run — the silence-means-clean pathology
      // reborn inside the fix meant to kill it. Flag the shape, then skip it.
      if (!Array.isArray(groups)) {
        unresolvable.push(`${event} in ${name} is ${groups === null ? 'null' : typeof groups}, not an array — hooks here may not run at all`);
        continue;
      }
      for (const group of groups) {
        if (!Array.isArray(group?.hooks)) {
          unresolvable.push(`a group under ${event} in ${name} has no hooks array — that group registers nothing`);
          continue;
        }
        for (const hook of group.hooks) {
          const cmd = hook?.command;
          const where = `${event}, ${name}`;

          // An entry with no usable command registers nothing. Silently skipping it
          // is the same silence-means-clean pathology one level further down —
          // caught by a panel seat in round 3 after round 2 fixed only the group level.
          if (typeof cmd !== 'string' || !cmd.trim()) {
            unresolvable.push(`a hook entry under ${where} has no usable "command" string — it registers nothing`);
            continue;
          }

          // A COMPLEX command is judged whole and never tokenised. `x.mjs;echo`
          // glues a metacharacter to the path, so the token fails the $-anchored
          // extension test and would be dropped BEFORE any per-token gate could see
          // it — silent, which is the original outage shape. So when the command
          // uses shell syntax, look for a script extension ANYWHERE in it (unanchored)
          // and emit one command-level "not verified". Under-specific on purpose:
          // naming the file would mean parsing the shell, which is what failed three
          // times. "This registration was not checked" is the honest, actionable claim.
          if (SHELL_META.test(cmd) || /%[A-Za-z_][A-Za-z0-9_]*%/.test(cmd)) {
            if (/\.(?:mjs|cjs|js|ts|mts|cts|sh|bash|ps1|py|rb)\b/i.test(cmd)) {
              const key = `${event}:${cmd}`;
              if (!seen.has(key)) {
                seen.add(key);
                unresolvable.push(`${where}: \`${cmd.slice(0, 90)}\` — uses shell syntax (variable, glob, operator or subshell); existence NOT verified`);
              }
            }
            continue;
          }

          for (const rawTok of tokenize(cmd)) {
            const tok = rawTok.replace(/\\/g, '/');
            if (!SCRIPT_EXT.test(tok)) continue;          // not a script argument
            // A remote URL ending in .sh is not a local file and must never be
            // reported missing — `curl https://host/x.sh` would otherwise phantom.
            if (URL_SCHEME.test(tok)) continue;
            // A quoted subcommand (`sh -c 'node scripts/x.mjs'`) survives tokenising
            // as one space-bearing token. It is a command, not a path.
            if (/\s/.test(tok)) continue;

            const key = `${event}:${tok}`;
            if (seen.has(key)) continue;
            seen.add(key);

            // (complex commands never reach here — they are handled whole, above)

            // Absolute: POSIX /…, Windows C:/…, or UNC //host/share.
            const isAbs = tok.startsWith('/') || /^[A-Za-z]:\//.test(tok);
            const abs = isAbs ? tok : join(SS_PT, tok);
            // isFile, not exists: a DIRECTORY named `x.mjs` satisfies existsSync and
            // would let a phantom registration read as healthy (panel round 3).
            let ok = false;
            try { ok = statSync(abs).isFile(); } catch { ok = false; }
            if (!ok) missing.push(`${tok} (${where})`);
          }
        }
      }
    }
  }

  // Reported at LOWER volume than `missing`: these are "could not check", not
  // "is broken". Stating the difference is the whole point — an unverified item
  // must never be laundered into either a clean bill or a phantom alarm.
  if (unresolvable.length) {
    findings.push(
      `${unresolvable.length} hook registration(s) could NOT be verified: ` +
      `${unresolvable.join('; ')}. This is UNKNOWN, not clean — check these by hand.`
    );
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
} catch (err) {
  // FAIL-OPEN, NOT FAIL-SILENT. The first version swallowed its own errors and
  // emitted nothing — which is byte-identical to "no phantom guards found", i.e. the
  // exact ambiguity this check's own header lectures about. Two panel seats caught
  // the hypocrisy 2026-08-23. A guard that cannot run must SAY it could not run;
  // it still must not block session start.
  findings.push(
    `hook-registration check could not complete (${err?.message || err}). Phantom-guard ` +
    'detection did NOT run this session — its silence means "unknown", not "clean".'
  );
}

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

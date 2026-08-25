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

import { readFileSync, existsSync, readdirSync } from 'node:fs';
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
    // THE ADAPTER LENGTH IS DETECTED, NOT ASSUMED.
    //
    // This used to slice a hardcoded SS_PT_ADAPTER_LINES (45). That is correct on the
    // branch it was written on and WRONG on main, where the adapter is 6 lines — so
    // porting this gate to main made it report mirror divergence on a mirror that is
    // byte-for-byte in sync, every session, forever. A gate that cries wolf on every
    // run is the gate everyone learns to ignore, which is the attrition failure mode
    // every hostile seat named as the thing that kills mechanisms.
    //
    // Found 2026-08-23 while porting to main: a "1,125 divergent lines" reading that
    // was entirely an offset artifact. With the boundary detected, the true answer was
    // ZERO. The lesson is the same one this file already teaches about absent input —
    // an instrument mis-set reports confidently and wrongly.
    //
    // The body starts where CLAUDE.md's first line appears in AGENTS.md. If that line
    // is not found, the mirror contract does not hold at all, which is itself the
    // finding — and is reported as such rather than silently assuming an offset.
    const aLines = norm(agents).split('\n');
    const cLines = norm(claude).split('\n');
    const start = aLines.indexOf(cLines[0]);
    if (start < 0) {
      findings.push(
        'SS-PT AGENTS.md does not contain CLAUDE.md\'s first line at all, so the ' +
        'adapter+body mirror contract cannot be checked. This is UNKNOWN, not clean.'
      );
    } else if (aLines.slice(start).join('\n').trimEnd() !== cLines.join('\n').trimEnd()) {
      findings.push(
        `SS-PT AGENTS.md mirror body != CLAUDE.md (adapter detected as ${start} lines). ` +
        'Fix: `node scripts/sync-agents-mirror.mjs` (use --check first). ' +
        'Do NOT make them byte-identical — the leading lines are the Codex adapter.'
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

// ---- 7) Hook-registration integrity ---------------------------------------
//
// A registered guard whose FILE IS ABSENT emits nothing — byte-identical to a
// healthy guard that found no problems. That ambiguity hid two missing hooks on
// this branch for weeks (2026-08-22); it was only ever caught by a human noticing
// a second-order symptom from outside. Registration is not existence.
//
// The classifier lives in scripts/lib/hook-registration.mjs so there is ONE
// implementation and the test imports it rather than mirroring it. Six hostile
// rounds are recorded there, along with the invariant they produced: every hook
// entry yields exactly one verdict, so silence is unrepresentable.
try {
  const { auditHookRegistrations } = await import(
    new URL('../lib/hook-registration.mjs', import.meta.url)
  );
  const audit = auditHookRegistrations(SS_PT);
  // The scope note ships WITH the findings. Round 6 computed it and the caller
  // dropped it on the floor, so a limitation the module deliberately surfaced was
  // never once seen by an operator — a check advertising "hook-registration
  // integrity" while silently covering only project scope. Two seats caught that
  // the deliverable was computed, not emitted. (Round 7.)
  if (audit.findings.length) {
    findings.push(...audit.findings, `hook-registration coverage: ${audit.scopeNote}`);
  }
} catch (err) {
  // FAIL-OPEN, NOT FAIL-SILENT. A guard that cannot run must SAY it could not run;
  // reporting nothing would be the very ambiguity this check exists to remove.
  findings.push(
    `hook-registration check could not complete (${err?.message || err}). Phantom-guard ` +
    'detection did NOT run this session — its silence means "unknown", not "clean".'
  );
}

// ---- 8) Hook-registration PROVENANCE --------------------------------------
//
// Check 7 asks "does the registered file exist?". This asks the mirror question:
// does the registration protecting THIS tree exist for anyone else?
//
// Found 2026-08-23: the exit-status gate — built against the most recurring defect
// class in the corpus — was live in one working tree and in NO commit. It ran for
// the agent that wrote it and existed for nobody else. Five of six hostile panel
// seats independently ranked this P0. The failure is silent in both directions: the
// tree that has it sees a healthy guard, and every other tree sees nothing at all
// while the operator still believes the class is blocked.
try {
  const { auditHookProvenance } = await import(
    new URL('../lib/hook-provenance.mjs', import.meta.url)
  );
  const prov = auditHookProvenance(SS_PT);
  if (prov.findings.length) {
    findings.push(...prov.findings, `hook-provenance coverage: ${prov.scopeNote}`);
  }
} catch (err) {
  // Same contract as check 7: could-not-run is UNKNOWN and must be said out loud.
  findings.push(
    `hook-provenance check could not complete (${err?.message || err}). Whether the live ` +
    'guards are committed is UNKNOWN this session, not clean.'
  );
}

// ---- 9) Rule-count drift ---------------------------------------------------
//
// CLAUDE.md's router says "the 66 MANDATORY rules". The section defines 73. A
// forensics report counted 164. Four hostile seats flagged it, and ox-alpha named
// why it outweighs its size: the program's thesis is that drifted numbers are a root
// cause, and the rulebook's own count is a drifted number. `MERGED:` closure also
// validates against this registry, and a registry whose size is unknown by ~2.5x
// cannot support merge detection at all.
try {
  const { auditRuleCount } = await import(
    new URL('../lib/rule-count.mjs', import.meta.url)
  );
  const rc = auditRuleCount(SS_PT);
  if (rc.findings.length) findings.push(...rc.findings);
} catch (err) {
  findings.push(
    `rule-count check could not complete (${err?.message || err}). Whether the rulebook ` +
    'can state its own size is UNKNOWN this session, not clean.'
  );
}

// ---- 10) Dead CI — has ANY workflow ever succeeded? ------------------------
//
// Found 2026-08-24 (Fable): a PR was opened purely to give the migration shadow check
// its first real run. It startup_failed in 0s — and so had EVERY Actions run in the
// repo, all workflows, all event types INCLUDING schedule (which runs from the default
// branch and exonerates any pushed file), with zero successes in queryable history.
// Private repo on free-tier minutes: exhausted minutes or a billing block. Every CI
// gate in the tree was an intention, not a protection, and nothing anywhere said so —
// because everything asks whether the workflow FILE exists and parses, and nothing
// asks for its last green run.
//
// Two repo-wide queries, not per-workflow: the failure mode this catches is
// account-level, where everything dies at once. GLM 5.3 (2026-08-24): a single "no
// successes" test conflated four conditions with four different remedies — never-ran
// (disabled/billing), running-but-all-failing (a real workflow defect), success-but-stale
// (recency), and gh-can't-answer (auth/network). One extra call splits them. 20s
// timeout: this fires once per session, so the pathological case costs seconds; a
// stream of false UNKNOWNs costs trust in the whole probe. Fail-UNKNOWN like 7-9.
try {
  const { execSync } = await import('node:child_process');
  const wfDir = join(SS_PT, '.github', 'workflows');
  if (existsSync(wfDir)) {
    const gh = (args) => JSON.parse(execSync(
      `gh run list ${args}`, { cwd: SS_PT, timeout: 20000, stdio: ['ignore', 'pipe', 'ignore'] }
    ).toString().trim() || '[]');
    const newest = gh('--limit 1 --json conclusion,workflowName,updatedAt')[0];
    const lastOk = gh('--status success --limit 1 --json updatedAt,workflowName')[0];
    const anyScheduled = readdirSync(wfDir).some((f) =>
      /\.ya?ml$/i.test(f) && /^\s*schedule\s*:/m.test(read(join(wfDir, f)) || ''));
    const staleDays = anyScheduled ? 7 : 30;
    const ageDays = (iso) => (Date.now() - Date.parse(iso)) / 86_400_000;

    if (!newest) {
      findings.push(
        'GitHub Actions: NO runs at all in queryable history — Actions is disabled for the repo ' +
        'or has never been triggered. Every workflow gate is an intention, not a protection.'
      );
    } else if (!lastOk) {
      const c = newest.conclusion || 'unknown';
      findings.push(
        `GitHub Actions: runs exist but ZERO have ever succeeded (newest: "${newest.workflowName || '?'}" → ${c}). ` +
        (c === 'startup_failure'
          ? 'Blanket startup_failure incl. schedule = ACCOUNT-LEVEL (exhausted free-tier minutes or a ' +
            'billing block), not any workflow file. Fix: github.com/settings/billing.'
          : 'Workflows RUN and FAIL — that is a workflow/repo defect, NOT a billing signature. Read the ' +
            'newest run’s log before touching billing.')
      );
    } else if (ageDays(lastOk.updatedAt) > staleDays) {
      findings.push(
        `GitHub Actions: newest successful run ("${lastOk.workflowName || '?'}") is ${Math.round(ageDays(lastOk.updatedAt))}d old ` +
        `(threshold ${staleDays}d${anyScheduled ? ', a schedule exists' : ''}). Gates may have gone dead since — ` +
        `newest run of any status: "${newest.workflowName || '?'}" → ${newest.conclusion || 'unknown'}.`
      );
    }
  }
} catch (err) {
  findings.push(
    `dead-CI check could not complete (${err?.message || String(err).slice(0, 80)}). Whether any ` +
    'Actions gate has ever run is UNKNOWN this session, not clean.'
  );
}

// ---- Emit: silent when clean ----------------------------------------------
if (findings.length) {
  process.stdout.write(
    '[drift-check] ⚠ ' + findings.length + ' drift finding(s) — a doc that reads as ' +
    'authoritative may be wrong:\n' +
    findings.map((f, i) => `  ${i + 1}. ${f}`).join('\n') +
    // NO CHECK COUNT HERE, deliberately. This line said "7 checks", then "8", and
    // would now say "9" — a hand-maintained number inside the gate whose newest
    // check exists to catch hand-maintained numbers. Check 9 would have flagged
    // this line if it scanned source. Generate it or stop printing it; there is
    // nothing to generate it from, so it is not printed.
    '\nFull procedure: .claude/skills/drift-check/SKILL.md\n'
  );
}

// EXIT CODE CONTRACT — always 0, deliberately, even with a confirmed MISSING.
//
// Three panel seats read the unconditional 0 as a defect in round 8 ("the gate cannot
// gate"), and the reasoning is sound for a CI check. It is wrong for THIS one, and the
// contract was never written down, which is the actual defect they found.
//
// This is a SessionStart hook. A non-zero exit here does not fail a build — it risks
// failing the operator's session, on a repo that is merely drifted. Blocking every
// session because a hook file is absent would trade a silent gap for a hard stop on
// unrelated work, and the first thing anyone would do is disable the hook. That is
// the same outage arriving through the operator's own frustration.
//
// The SIGNAL here is stdout, not the exit status, and stdout is silent when clean —
// so anything printed is already the alarm. Enforcement that must BLOCK belongs in a
// PreToolUse or Stop gate, where refusing is proportionate.
//
// exitCode rather than process.exit(): when stdout is a pipe (always, under the
// harness) Node queues writes asynchronously and process.exit() tears the loop down
// without draining. MISSING findings are appended LAST, so under backpressure the
// highest-severity alarm truncates first — a diagnostic whose whole contract is
// "never silently lose the signal", losing it nondeterministically. (Round 6.)
process.exitCode = 0;

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
import { homedir } from 'node:os';

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
// SwanGuard is a SEPARATE repo sitting beside this one on the Desktop. Derived from the
// running account rather than hardcoded (2026-08-27): the literal pinned this gate to one
// machine, and anywhere else `read()` returned null and every SwanGuard check silently
// passed — the exact "reads as protection while covering nothing" failure described above,
// and the same class as the process.cwd() bug this file already documents.
// SWANGUARD_ROOT overrides when the repo lives elsewhere.
const SWANGUARD = process.env.SWANGUARD_ROOT
  || resolve(homedir(), 'Desktop', 'SwanGuard-Newsroom');

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
  // No `gh` on this machine → nothing to measure → say nothing (round-1 GLM F7 / Ox F8:
  // an UNKNOWN finding on every session for a tool that is simply not installed is
  // alarm fatigue, not signal). `gh` present but failing (auth, network) still falls
  // to the UNKNOWN finding below — that IS signal.
  let ghPresent = true;
  try { execSync('gh --version', { stdio: 'ignore', timeout: 5000 }); } catch { ghPresent = false; }
  if (existsSync(wfDir) && ghPresent) {
    const gh = (args) => JSON.parse(execSync(
      `gh run list ${args}`, { cwd: SS_PT, timeout: 20000, stdio: ['ignore', 'pipe', 'ignore'] }
    ).toString().trim() || '[]');
    // ONE call on the common path (round-1 Grok F7 / GLM F7: two serial 20s calls were
    // a 40s worst-case at SessionStart): pull the newest 20 runs and derive both facts
    // from them. Only when no success appears in that window does the targeted
    // second query run — a healthy repo never pays for it.
    const recent = gh('--limit 20 --json conclusion,workflowName,updatedAt,status');
    const newest = recent[0];
    // Fallback query only when it could change the answer. If the 20 newest runs are
    // ALL startup_failure, that is the account-level signature (billing / minutes) and
    // no older success alters the diagnosis — skip the second call, so the dead-CI
    // case does not pay 20s on every session start (Ox r2 F5).
    const allStartupFail = recent.length > 0 && recent.every((r) => r.conclusion === 'startup_failure');
    const lastOk = recent.find((r) => r.conclusion === 'success')
      || ((newest && !allStartupFail) ? gh('--status success --limit 1 --json updatedAt,workflowName')[0] : undefined);
    // An IN-PROGRESS newest run has conclusion null — that is "pending", not "failed"
    // (round-1 GLM F7 / Ox F8). Judge on the newest COMPLETED run instead.
    const pending = newest && (newest.conclusion === null || newest.conclusion === '' || newest.status === 'in_progress' || newest.status === 'queued');
    if (pending && newest) newest.conclusion = 'pending';
    const anyScheduled = readdirSync(wfDir).some((f) =>
      /\.ya?ml$/i.test(f) && /^\s*schedule\s*:/m.test(read(join(wfDir, f)) || ''));
    const staleDays = anyScheduled ? 7 : 30;
    const ageDays = (iso) => (Date.now() - Date.parse(iso)) / 86_400_000;

    if (!newest) {
      findings.push(
        'GitHub Actions: NO runs at all in queryable history — Actions is disabled for the repo ' +
        'or has never been triggered. Every workflow gate is an intention, not a protection.'
      );
    } else if (!lastOk && pending) {
      // Newest run is still going and nothing has ever succeeded: undecidable this
      // second. No finding — the next session judges the completed run.
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

// ---- 11) Rulebook commits on origin/main without a RULEBOOK trailer --------
//
// WHY (SOUL-delta panel 2026-08-25, unanimous G6 — Kimi/Ox/Grok): the
// rulebook-review-guard is a LOCAL commit-msg hook. A GitHub-UI squash/merge, a
// web edit, or any clone without core.hooksPath bypasses it silently, and the CI
// mirror is blocked on dead Actions billing. This probe converts that silent
// bypass into a detected-at-next-session event: any commit on origin/main (as of
// the last fetch — no network here) in the last 14 days that touches
// CLAUDE.md/AGENTS.md but carries no RULEBOOK trailer gets named. Read-only,
// fail-open, silent when clean, like every probe above.
try {
  // SINGLE SOURCE OF TRUTH (r3 fold, all three seats): the trailer test and the
  // protected-file list are IMPORTED from the guard itself, so probe and guard cannot
  // judge compliance by different standards (Ox F1: the hand-copied regex here was
  // same-line/case-sensitive while conventional multi-line trailers are compliant).
  const { hasRulebookTrailer, ALWAYS_ON } = await import('./rulebook-review-guard.mjs');
  // ANCESTRY anchor, not a date window (GLM r3 F2): --since filters on committer
  // date, which a rebase rewrites in both directions — pre-guard commits replayed
  // after ship enter a date window (false alarm), post-guard commits replayed with
  // --committer-date-is-author-date leave it (missed drift). `<guard-sha>..origin/main`
  // is rewrite-proof: it asks "landed after the guard shipped", which is the actual
  // question. If history is rewritten and the SHA vanishes, git fails and the catch
  // below now SAYS so instead of reading as clean.
  const GUARD_SHA = '732843e399ac2568d04acc3dc188542b210f6192'; // PR #72 merge — the guard's ship commit
  const CAP = 21;
  // Pathspec matches the GUARD'S reach, not just root paths (Ox r4 F3): the guard
  // protects by basename anywhere in the tree, so a nested `docs/CLAUDE.md` commit was
  // guarded but invisible here — probe CLEAN where the guard would flag. `:(glob)**/x`
  // covers nested copies; the bare entry covers the root file.
  const pathspec = [...ALWAYS_ON, ...ALWAYS_ON.map((a) => `:(glob)**/${a.replace(/^.*\//, '')}`)];
  const shas = execFileSync('git',
    ['log', `--max-count=${CAP}`, '--format=%H', `${GUARD_SHA}..origin/main`, '--', ...pathspec],
    { cwd: SS_PT, timeout: 15000, stdio: ['ignore', 'pipe', 'ignore'] }
  ).toString().trim().split('\n').filter(Boolean);
  // Unmarked clipping is exactly what reflex 3 forbids (GLM/Grok r3 F1): at the cap,
  // older commits went unchecked and MUST be said, whatever the naked count is.
  const truncated = shas.length >= CAP;
  const naked = [];
  for (const sha of shas.slice(0, CAP - 1)) {
    const msg = execFileSync('git', ['log', '-1', '--format=%B', sha],
      { cwd: SS_PT, timeout: 10000, stdio: ['ignore', 'pipe', 'ignore'] }).toString();
    if (!hasRulebookTrailer(msg)) naked.push(sha.slice(0, 9));
  }
  if (naked.length || truncated) {
    findings.push(
      (naked.length
        ? `Rulebook drift: ${naked.length} commit(s) on origin/main since the guard shipped touched ` +
          `${ALWAYS_ON.slice(0, 2).join('/')} (or another protected file) WITHOUT a RULEBOOK trailer ` +
          `(${naked.join(', ')}). The local commit-msg guard was bypassed (GitHub-UI squash, web edit, ` +
          'or an unhooked clone). Read those diffs before trusting the current rule text.'
        : 'Rulebook drift scan: ') +
      (truncated
        ? ` LIST TRUNCATED at ${CAP - 1} commits — older rulebook commits in range were NOT checked; ` +
          'this result is PARTIAL, not clean.'
        : '')
    );
  }
} catch (err) {
  // Silent fail-open made a dead probe byte-identical to a clean sweep (Ox F2 /
  // Grok F3 / GLM F3 — the instrument violating the reflexes shipped beside it).
  // Fail-open stands (SessionStart must not block), but it now SPEAKS.
  findings.push(
    `Rulebook drift check could not complete (${(err?.message || String(err)).slice(0, 80)}). ` +
    'Whether trailer-less rulebook commits landed on origin/main is UNKNOWN this session, not clean.'
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

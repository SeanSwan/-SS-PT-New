---
title: Kimi review packet — S4 slice certification gate
date: 2026-08-13
originating_model: claude-opus-5
reviewer: moonshotai/kimi-k3
remit: hostile review of a release-certification gate that will authorize schema/migration work
privacy: IDs/roles only; no secrets, no PII, no DB exports, no absolute paths
---

# Review remit

I built a release-certification gate. It is the **last thing standing between four
unreviewed bug fixes and a set of slices that will alter a production PostgreSQL schema**.
If this gate lies, a migration ships on a false green.

Your job is to find the ways it can report PASS while the tree is not actually safe to
proceed from, and the ways it can report FAIL for something that is fine. Rank by
whether *you* could trigger the failure, not by how bad it sounds.

Repository truth outranks me. If you assert something about the current code, say what
would verify it — I will run it.

## Why a new gate existed to be written

The repo already had `scripts/qa/release-verification.mjs`. It is real: it spawns real
commands and honours exit codes. Two of its steps cannot tell the truth.

**1. A step that can never fail.** It is named `staging area is empty` and runs:

```
git diff --cached --name-only
```

That command LISTS staged files and exits 0 either way. Probed directly: with a file
staged, exit code 0. The check has never been able to fail in its entire existence.

**2. A step that can never pass.** Its `backend test suite` step runs the full vitest
suite. That suite is RED on a clean tree — `adminWorkoutLoggerHistoryDate.test.mjs`
fails to collect with `TypeError: default.define is not a function`. Confirmed
pre-existing: zero commits in my range touch that file, and it is byte-identical to the
plan's authoring SHA ignoring line endings.

So the orchestrator reports FAIL regardless of the change under test, and one of its
green checks is decorative. **A gate that always passes and a gate that always fails are
the same defect: the verdict carries no information.**

## What I am asking you to attack

The new gate is below in full. Specific questions, but do not limit yourself to them:

1. **Which checks can report PASS on a tree that is not safe?** I care most about
   `checkBackendDrift` (rule 42: untracked/uncommitted backend files crash the host at
   boot) and `checkTargetedSuites`.
2. **`checkTargetedSuites` hardcodes five suite paths.** I made a missing suite FAIL
   rather than silently shrink the gate. Is that sufficient, or is a hardcoded list
   itself the flaw — and what is the alternative that does not just re-run a red suite?
3. **`checkMigrationsStatic` greps for destructive SQL** with a regex over changed
   migration files, and only for `HEAD~1..HEAD`. Name the destructive migration shapes
   that regex misses. Assume an author who is not trying to evade it, and then one who is.
4. **`checkBackendSyntax` and `checkMigrationsStatic` both diff `HEAD~1..HEAD`.** What
   breaks when a slice lands as several commits, or as a merge?
5. **UNPROVEN is a third state** (live topology, unavailable git). It exits 0 while
   printing "UNPROVEN items are not passes." Is that honest, or is it a pass wearing a
   disclaimer? I considered exiting non-zero and rejected it because a permanently
   red gate is the failure mode I am fixing. Argue me out of it if I am wrong.
6. **The self-test** (`--self-test`) currently proves exactly one check can fail. That is
   weaker than the falsification standard I hold my own tests to. What is the minimum set
   that would make it meaningful rather than ceremonial?
7. **Anything I have not asked about.** Preferred over answering the above well.

## Context: what this gate is certifying

Four fixes are committed locally and unpushed. Each was built failing-test-first with a
controlled falsification (defect reintroduced, tests proven to catch it, defect removed).

- **Trainer calendar authorization.** `trainerId || (user.role === 'trainer' ? user.id : null)`
  — the submitted value short-circuits the `||`, so an authenticated trainer could write
  blocked time onto another trainer's calendar. The retired shadow router had the clamp
  the right way round; a rewrite reversed the operands.
- **Staff onboarding fully blocked.** The wizard sends `firstName`/`lastName`; the
  controller demanded `fullName`, which does not exist anywhere in the frontend
  onboarding flow. Every staff onboarding returned 400. The existing test passed because
  its fixture sends `fullName` — written to the contract the server wants rather than the
  payload the client sends.
- **Workout Coach reported saves that had not happened.** The AI bridge acknowledged
  before an unawaited save whose result was discarded; the ack defaults to `true` when
  called with no argument, and the intent log recorded every submit as `applied`.
  Awaiting is not the fix — the dispatch seam reads its result synchronously, so a late
  ack reads as "nobody was listening".
- **Onboarding injury/PAR-Q answers discarded.** The wizard writes `injuries`; the
  master-prompt projection reads `pastInjuries || []`. 20 of 45 wizard fields were read
  under a different name or not at all. Fixing it opened a prompt-injection lane —
  client free text now reaches a workout prompt — closed in the same slice using the
  sanitizer that already existed for that threat.

## The gate, in full

```javascript
// scripts/qa/slice-certification.mjs — checks only; helpers elided for length

/** The pinned SHA and whether the tree matches it. Provenance for every result. */
const checkPinnedTree = () => {
  const head = run('git', ['rev-parse', 'HEAD']);
  const dirty = run('git', ['status', '--porcelain']);
  if (head.code !== 0 || dirty.code !== 0) return { ok: null, detail: 'git unavailable' };
  const sha = head.out.trim();
  const dirtyFiles = dirty.out.split('\n').filter((l) => l.trim() !== '');
  return dirtyFiles.length === 0
    ? { ok: true, detail: `clean at ${sha}` }
    : { ok: false, detail: `${dirtyFiles.length} uncommitted change(s)` };
};

/** --quiet is what makes it decidable: exits 1 when a difference exists. */
const checkStagingEmpty = () => {
  const result = run('git', ['diff', '--cached', '--quiet']);
  return result.code === 0
    ? { ok: true, detail: 'nothing staged' }
    : { ok: false, detail: 'files are staged; certify a committed tree' };
};

const checkWhitespace = () => {
  const result = run('git', ['diff', '--check']);
  return result.code === 0
    ? { ok: true, detail: 'no whitespace errors' }
    : { ok: false, detail: 'whitespace errors in working diff' };
};

const checkBackendSyntax = () => {
  const listed = run('git', ['ls-files', 'backend/**/*.mjs']);
  if (listed.code !== 0) return { ok: null, detail: 'could not list backend modules' };
  const changed = run('git', ['diff', '--name-only', 'HEAD~1..HEAD', '--', 'backend']);
  const files = (changed.code === 0 ? changed.out : '')
    .split('\n').map((f) => f.trim())
    .filter((f) => f.endsWith('.mjs') && existsSync(path.join(repoRoot, f)));
  if (files.length === 0) return { ok: true, detail: 'no backend modules changed in HEAD' };
  const bad = files.filter((f) => run('node', ['--check', f]).code !== 0);
  return bad.length === 0
    ? { ok: true, detail: `${files.length} changed backend module(s) parse` }
    : { ok: false, detail: `syntax errors: ${bad.join(', ')}` };
};

/** Rule 42: untracked or modified-uncommitted backend files crash the host at boot. */
const checkBackendDrift = () => {
  const untracked = run('git', ['ls-files', '--others', '--exclude-standard', 'backend/']);
  const modified = run('git', ['diff', '--name-only', 'HEAD', '--', 'backend/']);
  const drift = [
    ...untracked.out.split('\n').filter((l) => l.trim()),
    ...modified.out.split('\n').filter((l) => l.trim()),
  ];
  return drift.length === 0
    ? { ok: true, detail: 'no untracked or uncommitted backend drift' }
    : { ok: false, detail: `${drift.length} backend file(s) would be missing on the remote` };
};

/** Named explicitly, because the full backend suite is red on baseline. */
const CERTIFIED_SUITES = [
  'tests/unit/sessionBlockAuthorization.test.mjs',
  'tests/api/sessionBlockAuthorization.test.mjs',
  'tests/api/onboardingStaffNameContract.test.mjs',
  'tests/api/onboardingFieldDictionary.test.mjs',
  'tests/unit/sessionsRouteOrder.test.mjs',
];

const checkTargetedSuites = () => {
  const present = CERTIFIED_SUITES.filter((s) => existsSync(path.join(backendDir, s)));
  if (present.length !== CERTIFIED_SUITES.length) {
    const missing = CERTIFIED_SUITES.filter((s) => !present.includes(s));
    return { ok: false, detail: `certified suite missing: ${missing.join(', ')}` };
  }
  const result = run(path.join('node_modules', '.bin', bin('vitest')),
    ['run', ...present, '--no-coverage'], backendDir);
  return result.code === 0
    ? { ok: true, detail: `${present.length} certified suites pass` }
    : { ok: false, detail: 'a certified suite failed' };
};

/** Migrations are reviewed statically. This gate NEVER executes one. */
const checkMigrationsStatic = () => {
  const dir = path.join(backendDir, 'migrations');
  if (!existsSync(dir)) return { ok: null, detail: 'no migrations directory' };
  const changed = run('git', ['diff', '--name-only', 'HEAD~1..HEAD', '--', 'backend/migrations']);
  const touched = (changed.code === 0 ? changed.out : '')
    .split('\n').map((f) => f.trim()).filter(Boolean);
  if (touched.length === 0) return { ok: true, detail: 'no migration changed in HEAD' };
  const destructive = /\b(DROP\s+(TABLE|COLUMN|DATABASE)|TRUNCATE|DELETE\s+FROM)\b/i;
  const offenders = touched.filter((f) => {
    const full = path.join(repoRoot, f);
    return existsSync(full) && destructive.test(readFileSync(full, 'utf8'));
  });
  return offenders.length === 0
    ? { ok: true, detail: `${touched.length} migration(s) changed, none destructive` }
    : { ok: false, detail: `destructive statement in: ${offenders.join(', ')}` };
};

const checkSecrets = () => {
  const result = run('bash', ['scripts/scan-secrets.sh', '--all']);
  return result.code === 0
    ? { ok: true, detail: 'secret scan clean' }
    : { ok: false, detail: 'secret scan reported hits' };
};

/** Live topology is NOT decidable from a tree. Reported UNPROVEN on purpose. */
const checkLiveTopology = () => ({
  ok: null,
  detail: 'live instance count and env presence are owner checks; not inferable from source',
});

// A thrown check is a FAILED check, never a skipped one:
try { outcome = check(); }
catch (error) { outcome = { ok: false, detail: `check threw: ${redact(error?.message)}` }; }

process.exit(failed.length === 0 ? 0 : 1);   // UNPROVEN does not fail the run
```

## Constraints on your recommendations

- **No new infrastructure.** Docker Compose, Testcontainers, and a hosted CI product have
  all been rejected on this codebase already. Work with git, node, vitest, bash.
- **No database connection from this gate.** It certifies a tree, not an environment.
- The deploy host runs migrations on push, so a push IS a schema change. That is why the
  gate exists before the push rather than after.
- Windows is the development platform; `spawnSync(..., { shell: true })` is deliberate.

## Output I want

For each finding: what breaks, the concrete input or sequence that triggers it, how
cheaply an ordinary contributor could hit it by accident, and the smallest fix. Then a
single verdict on whether this gate is fit to authorize schema work, and if not, the
minimum that would make it so.

Say plainly when you are inferring rather than certain. I will verify every factual claim
you make about the current code before acting on it.

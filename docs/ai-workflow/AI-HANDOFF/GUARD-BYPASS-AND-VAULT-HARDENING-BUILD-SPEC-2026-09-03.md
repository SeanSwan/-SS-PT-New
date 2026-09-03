---
decision: Close the blast-radius guard bypass (inline-interpreter writes) with a fence AND a content-integrity hook; finish the vault residuals; zero-decision execution by a cheap seat
status: open
supersedes: none
author: claude-fable-5-1 (Final Decider) — review + blueprint only, no code applied
ticket: SWA-230 (vault) + new SWA ticket for the guard bypass (executor creates, see §6.1)
---

# Guard-Bypass + Vault Hardening — Hostile Review & Zero-Decision Build Spec

**Written 2026-09-03 by Fable 5.1.** Sean's directive: *"do a hostile review, give me all the fixes,
comprehensive, so the next agent doesn't even need to use their brain — they follow your
instructions to the T and it's perfectly done."* Fable tokens are scarce; this document is the
one Fable pass. **Executor: Opus 5 or Sonnet 5. Do not re-plan. Do not improve. Do exactly this.**

Branch: `wip/comms-notifications-2026-07-05` at `91a1c201e` or later. Do **not** rebase or merge
main during this work (branch is ~2,379 commits behind; that reconciliation is a separate task).

---

## 0. Executor rules (read twice)

1. **Every step is mandatory and in order.** A step's "VERIFY" block must pass before the next step
   begins. If it does not pass, STOP, write what you saw into SWA-230, and end the turn. Do not
   "fix forward" outside this spec.
2. **Guard files need Sean's approval — four times, listed in §1.** The ritual is always identical:
   attempt the exact edit → gate denies and prints an id → write the request file the gate names
   (§5 has the text) → hand Sean the one command → Sean says "approved" → re-issue the **byte-
   identical** edit. Changing one character voids the approval.
3. **Never edit a guard file through Bash** (`python`, `node -e`, `sed -i`, `cp`, heredoc, `git
   checkout --`). Guard files: `scripts/hooks/db-blast-radius-gate.mjs`,
   `scripts/blast-radius-approve.mjs`, `scripts/lib/blast-radius-analyze.mjs`, `.claude/settings.json`,
   `.ai-workflow/blast-radius/approved/`, and after §3 also `scripts/hooks/guard-integrity.mjs` and
   `.ai-workflow/blast-radius/baseline/`. Use the Edit/Write tool only. The bypass this spec closes
   is exactly "Bash + interpreter"; using it to close itself would be the punchline of this session.
4. Use `set -o pipefail` in any Bash that pipes. Prove negatives by producing the artifact, not by
   the absence of an error.
5. Commit per step with the exact messages given; explicit paths only; **no push** (Rule 70).
6. Lane: `node scripts/lane.mjs claim --task "guard-bypass + vault hardening (Fable spec 2026-09-03)" --files "scripts/hooks/db-blast-radius-gate.mjs,scripts/hooks/db-blast-radius-approval.test.mjs,scripts/hooks/guard-integrity.mjs,scripts/hooks/guard-integrity.test.mjs,scripts/blast-radius-baseline.mjs,scripts/blast-radius-approve.mjs,scripts/hooks/vault-guard.mjs,scripts/hooks/vault-guard.test.mjs,.claude/settings.json,CLAUDE.md,AGENTS.md,docs/ai-workflow/learning-drops-ledger.md"` before the first edit.

---

## 1. What Sean must do (four terminal approvals, in this order)

Each command is printed by the gate at the moment the executor is blocked; the executor relays it.
Sean runs it **from anywhere** (cwd bug is fixed) and replies "approved".

| # | File | Why | Step |
|---|------|-----|------|
| A1 | `scripts/hooks/db-blast-radius-gate.mjs` | close the inline-interpreter bypass + record `targetPath` on consumed approvals + protect the new baseline dir | §2 |
| A2 | `.claude/settings.json` (hooks) | register `guard-integrity` on PostToolUse + SessionStart | §4.1 |
| A3 | `.claude/settings.json` (deny list) | make `blast-radius-baseline.mjs` owner-only | §4.2 |
| A4 | `scripts/blast-radius-approve.mjs` | F4: read-back before printing "approved" | §5 |

Also Sean-only, no agent can do it: delete the stray folder `%USERPROFILE%\.ai-workflow\`
(contains one inert, already-consumed token from the 2026-09-02 cwd incident).

---

## 2. Hostile review — all session work, ranked

Rounds 1–2 (GLM-5.3) on the vault are closed and verified; this is Fable's pass over the whole
session's output including the gate. Severity → finding → disposition.

| Sev | Finding | Disposition |
|-----|---------|-------------|
| **HIGH** | **Guard bypass.** `db-blast-radius-gate.mjs:120` `IN_PLACE_WRITER` enumerates write *verbs* (`sed -i`, `perl -i`, `cp`, `mv`, `install`, `rsync`). Any inline interpreter (`python - <<PY`, `python -c`, `node -e`, `ruby -e`, `pwsh -Command`) that opens a guard file for writing matches nothing. Proven: Opus edited `blast-radius-approve.mjs` this way and no gate fired. Also unmatched: `dd of=`, `truncate`, `ln -sf`, `patch`, `git apply`, and `git checkout -- <guard>` (restores older content). | **Fix in §3 (fence) + §3 (integrity).** Both. A blocklist alone is the class of defence that just failed. |
| **HIGH** | **No integrity invariant.** Nothing verifies guard-file *content* after the fact. Every protection is "parse the tool call"; a write path the parser doesn't know about is invisible forever. | **Fix in §3.** New `guard-integrity.mjs`: hash guard files after every tool call, compare to a protected baseline and to `git HEAD`, accept only with a consumed approval that names the file; otherwise quarantine + restore (if the agent's own call did it) + block. |
| MED | **F4 open** — `blast-radius-approve.mjs` prints "approved" without reading the token back from the path the gate consults. The 2026-09-02 incident was invisible for two round-trips because of this. Written and proven by Opus, then correctly reverted because it had gone in through the bypass. | **Fix in §5.** |
| MED | **Vault sweep is capped at 400 files, deterministically.** `sweepVaultClassTree(limit=400)` walks `docs/` in stack order; if more than 400 vault-class files exist, the *same* files are never swept on `git reset --hard` — a silent, permanent hole for exactly those blueprints. The sweep also hashes files that would lose nothing (unchanged tracked files survive a reset). | **Fix in §6.2:** sweep only what a destructive command can actually destroy — `git status --porcelain` modified/untracked vault-class files — falling back to the walk (raised cap) only if git is unavailable. |
| MED | `DESTRUCTIVE` regex fires the full sweep on read-only forms (`git stash list`, `git restore --staged`) and on any `rm -rf <anything>`. Cost after §6.2 is small (only dirty files hashed) so this is acceptable; **do not narrow the regex** — a false negative here loses the current version. | Accept. Documented. |
| LOW | `pathsFromCommand`: mentioning any directory under `docs/` (even `ls docs`) walks up to 400 files. Deduped → cost is one stat per file on repeats. | Accept. |
| LOW | Vault tests write into the real `docs/ai-workflow/brainstorms/` tree (R2-14). A crash mid-test leaves vault-class `__vault-*.md` files that later sweeps will keep snapshotting. | **Fix in §6.3** (single tmp dir + global cleanup). |
| LOW | Constitution text now stale: CLAUDE.md/AGENTS.md say the vault is "PreToolUse on Write/Edit"; it is also on Bash, and after §3 there is an integrity hook. Trailhead-Truth. | **Fix in §7.** |
| LOW | `IN_PLACE_WRITER` matches the *source* operand of `cp`, so `cp scripts/blast-radius-approve.mjs /tmp/x` is blocked (a read). Fail-closed, harmless; note only. | Accept. |
| INFO | Other enforcement hooks (`orient-gate`, `hermes-closeout-gate`, `vault-guard`, `lane-*`) are **not** guard-class; an agent may silently edit them. Widening class S to all of `scripts/hooks/` is a policy decision for Sean, not this spec. | Executor files a follow-up ticket (§8), nothing else. |
| INFO | Threat model. This system stops *careless* agents, not a fully adversarial one: `python evil.py && git commit -am x` in one Bash call makes file == HEAD before the PostToolUse check. Raising that bar needs git-side hooks; out of scope. Say this in the ticket; do not pretend otherwise. | Documented in §3.4. |

Everything else reviewed clean: learning-drop skill + ledger + SOUL.md (no PII, correct scope);
vault dedupe/prune/nesting/realpath (round-2 verified); `mirrorVault` placement + timestamps;
cwd fix in the approve script; the 21-test vault suite is non-vacuous (instrument validated).

---

## 3. STEP 1 — Gate fence + baseline protection + `targetPath` (approval A1)

**File:** `scripts/hooks/db-blast-radius-gate.mjs`. One approval → apply as **ONE Write** of the
whole file, not several Edits (each Edit is hashed separately and would cost an approval each).

### 3.1 Pre-flight in scratch (mandatory — a failed test after approval costs another approval)

```
SCRATCH=<your scratchpad>/gate-preflight
mkdir -p $SCRATCH/scripts/hooks $SCRATCH/scripts/lib $SCRATCH/backend $SCRATCH/.ai-workflow/blast-radius/requests $SCRATCH/.ai-workflow/blast-radius/approved
git show HEAD:scripts/lib/blast-radius-analyze.mjs > $SCRATCH/scripts/lib/blast-radius-analyze.mjs
git show HEAD:backend/schema-snapshot.json      > $SCRATCH/backend/schema-snapshot.json
git show HEAD:scripts/hooks/db-blast-radius-approval.test.mjs > $SCRATCH/scripts/hooks/db-blast-radius-approval.test.mjs
git show HEAD:scripts/hooks/db-blast-radius-gate.test.mjs     > $SCRATCH/scripts/hooks/db-blast-radius-gate.test.mjs
```
Build the new gate content (3.2) and write it with the **Write tool** to
`$SCRATCH/scripts/hooks/db-blast-radius-gate.mjs` (not a guard path → allowed). Append the new tests
(3.3) to `$SCRATCH/scripts/hooks/db-blast-radius-approval.test.mjs`. Then, from `$SCRATCH`:
```
cd $SCRATCH && node scripts/hooks/db-blast-radius-approval.test.mjs && node scripts/hooks/db-blast-radius-gate.test.mjs
```
**VERIFY:** both suites pass (18 + 6 new = 24, and 20). Only then proceed to the real file.

### 3.2 The change (apply to the real file as one Write of the full assembled content)

Start from the current file content (`git show HEAD:scripts/hooks/db-blast-radius-gate.mjs`).
Make exactly these four modifications:

**(a)** After the `IN_PLACE_WRITER` constant (line ~120), extend it and add the interpreter fence:

```js
const IN_PLACE_WRITER = /\b(?:sed\s+(?:-[a-zA-Z]*i|--in-place)|perl\s+-[a-zA-Z]*i|cp|mv|install|rsync|dd|truncate|shred|ln|patch|git\s+apply)\b([^|;&]*)/g;

/**
 * Inline interpreters can open any file for writing with no shell write verb at
 * all. 2026-09-03: a `python - <<'PY'` heredoc rewrote blast-radius-approve.mjs
 * and this gate saw nothing, because it enumerated write COMMANDS. A command that
 * both (a) invokes an interpreter with inline/stdin code and (b) mentions a guard
 * path anywhere is treated as a guarded write. Over-approximate on purpose: a
 * blocked read costs one approval; a missed write costs the control plane.
 * `node --check <file>` and `python script.py` carry no inline code and pass.
 */
const INLINE_INTERPRETER =
  /\b(?:python3?|py|node|deno|bun|ruby|perl|php|pwsh|powershell(?:\.exe)?)\b[^|;&\n]*?(?:\s-(?:c|e|p)\b|\s--eval\b|\s-\s|<<|\s-Command\b)/i;

/** SELF_PROTECTED with the end anchors removed, for matching INSIDE a command string. */
const SELF_PROTECTED_ANYWHERE = SELF_PROTECTED.map(
  (re) => new RegExp(re.source.replace(/\$$/, ''), re.flags),
);
```

**(b)** In `SELF_PROTECTED`, immediately after the `approved(?:[\\/]|$)` entry, add:

```js
  // Integrity baseline + quarantine (guard-integrity.mjs). An agent that can
  // rewrite the baseline can launder an unauthorized guard edit.
  /\.ai-workflow[\\/]blast-radius[\\/](?:baseline|quarantine)(?:[\\/]|$)/i,
  // The integrity hook itself.
  /scripts[\\/]hooks[\\/]guard-integrity\.mjs$/i,
  /scripts[\\/]blast-radius-baseline\.mjs$/i,
```

**(c)** `consumeApproval` records which file the approval was spent on, so the integrity hook can
accept that change and nothing else. Change the signature and body:

```js
function consumeApproval(contentHash, targetPath = '') {
  const file = join(APPROVAL_DIR, `${contentHash}.json`);
  try {
    const approval = JSON.parse(readFileSync(file, 'utf8'));
    approval.consumed = true;
    approval.consumedAt = new Date().toISOString();
    // Recorded for guard-integrity.mjs: an approved edit is accepted ONLY for the
    // file it was spent on. Normalised to forward slashes, repo-relative.
    approval.targetPath = String(targetPath).replace(/\\/g, '/').replace(/^\.\//, '');
    writeFileSync(file, `${JSON.stringify(approval, null, 2)}\n`, 'utf8');
  } catch {
    /* best effort — an unburnable approval must not wedge the edit */
  }
}
```
and update **every** `consumeApproval(contentHash)` call to pass the target:
- in `guardWriteAttempt`: `consumeApproval(contentHash, targetPath);`
- in the Write/Edit branch (line ~348): `consumeApproval(contentHash, filePath);`
- in the two Bash-branch calls (lines ~384, ~398): `consumeApproval(contentHash, target);` and
  `consumeApproval(contentHash, what);` respectively (whatever the local variable holding the
  path/label is at that site — pass it).

**(d)** In the Bash branch, immediately after the `IN_PLACE_WRITER` while-loop, add:

```js
    // Inline interpreter code that references a guard path (the 2026-09-03 bypass).
    if (INLINE_INTERPRETER.test(command)) {
      for (const re of SELF_PROTECTED_ANYWHERE) {
        const m = command.match(re);
        if (m) guardWriteAttempt(m[0], hashOf(command), 'runs inline interpreter code that references');
      }
    }
```

### 3.3 New tests — append to `scripts/hooks/db-blast-radius-approval.test.mjs`

Copy the assertion shape of the existing test **`'sed -i over a guard file is caught (was a silent bypass)'`** exactly (same `runHook`, same way it asserts a denial). Add these six tests with these
exact names; the command strings are the whole point, keep them verbatim:

1. `'python heredoc that opens a guard file is caught (silent bypass, 2026-09-03)'` — command:
   ``python - <<'PY'\nimport io\np='scripts/blast-radius-approve.mjs'\nio.open(p,'w').write('x')\nPY`` → **denied**.
2. `'node -e that writes a guard file is caught'` — command:
   `node -e "require('fs').writeFileSync('.claude/settings.json','{}')"` → **denied**.
3. `'python -c that writes the approval dir is caught'` — command:
   `python -c "open('.ai-workflow/blast-radius/approved/x.json','w')"` → **denied**.
4. `'node --check on a guard file is a read and passes'` — command:
   `node --check scripts/blast-radius-approve.mjs` → **allowed** (null / no decision).
5. `'an inline interpreter that names no guard path passes'` — command:
   `python - <<'PY'\nprint('hello')\nPY` → **allowed**.
6. `'dd / ln -sf / patch onto a guard file are caught'` — three sub-assertions, commands:
   `dd if=/dev/zero of=scripts/hooks/db-blast-radius-gate.mjs`, `ln -sf /tmp/x .claude/settings.json`,
   `patch scripts/blast-radius-approve.mjs < /tmp/p.diff` → each **denied**.

### 3.4 Apply, verify, commit

1. Write the assembled content to the real path with the Write tool → gate denies with id → write
   `.ai-workflow/blast-radius/requests/<id>.md` using the §9.1 template → relay the command →
   "approved" → re-issue the identical Write.
2. **VERIFY:** `node scripts/hooks/db-blast-radius-approval.test.mjs` → 24 pass;
   `node scripts/hooks/db-blast-radius-gate.test.mjs` → 20 pass; `node --check` clean.
   Then the live proof, in this exact order: run **through the Bash tool**
   `python - <<'PY'\nprint('probe: this must be BLOCKED')\np='scripts/blast-radius-approve.mjs'\nPY`
   → expect the gate's class-S denial (the command only *mentions* the path; the fence must fire on
   mention+interpreter). Then `node --check scripts/blast-radius-approve.mjs` → expect it to run.
3. Commit (explicit paths: the gate + the test file):
   ```
   fix(guard): close inline-interpreter bypass; protect integrity baseline; record targetPath

   2026-09-03: a python heredoc rewrote blast-radius-approve.mjs and the gate saw
   nothing - IN_PLACE_WRITER enumerated write VERBS. Any inline interpreter that
   mentions a guard path is now a guarded write (over-approximating by design);
   dd/truncate/shred/ln/patch/git-apply join the verb list. consumeApproval records
   targetPath so guard-integrity.mjs can accept exactly the approved change. Baseline
   + quarantine dirs and the integrity hook are class S.

   Tests: +6 (24/24 approval, 20/20 gate). Approved by Sean: <A1 id>.

   Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
   ```

---

## 4. STEP 2 — Content-integrity hook (no approval for the new files; approvals A2+A3 for settings)

### 4.1 `scripts/hooks/guard-integrity.mjs` — create with the Write tool, verbatim

```js
#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/hooks/guard-integrity.mjs
 * PURPOSE: PostToolUse + SessionStart hook — verify guard-file CONTENT, not
 *          the command that produced it.
 * ADDED: 2026-09-03 (Fable 5.1 spec) after an inline-interpreter write slipped
 *        past db-blast-radius-gate.mjs, which parses tool calls.
 * ============================================================================
 *
 * THE INVARIANT: a guard file may only change through (a) a consumed approval
 * that names it, or (b) a commit (content == git HEAD). Any other change is
 * unauthorized, whatever produced it. This hook checks the invariant after
 * EVERY tool call, so it does not need to know how a write happened.
 *
 * ON VIOLATION:
 *   1. the current content is copied to .ai-workflow/blast-radius/quarantine/
 *      (nothing is ever lost);
 *   2. if THIS tool call referenced the file (Write/Edit/NotebookEdit target, or
 *      a Bash command mentioning it), the baseline copy is RESTORED - the agent
 *      did it, so the agent's write is undone;
 *   3. otherwise (the change is not attributable to this call - it may be Sean
 *      editing by hand) nothing is restored; the turn is blocked with the path
 *      of the quarantined copy and the owner-only command to accept it;
 *   4. exit 2 so the model sees the message; INTEGRITY.log records it.
 *
 * TRUST ON FIRST USE: with no baseline on file, the current content becomes the
 * baseline and this is printed. SessionStart mode never restores; it reports.
 *
 * FAIL-OPEN ON INTERNAL ERROR (exit 0 + stderr + log): an integrity hook that
 * blocks every turn on its own bug gets disabled, and then there is no hook.
 *
 * ENV: SWAN_GUARD_INTEGRITY_DISABLE=1 (skip), SWAN_APPROVAL_WINDOW_MIN (default 10)
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..');
const BASE = path.join(REPO, '.ai-workflow', 'blast-radius');
const BASELINE = path.join(BASE, 'baseline');
const QUARANTINE = path.join(BASE, 'quarantine');
const APPROVED = path.join(BASE, 'approved');
const LOG = path.join(BASE, 'INTEGRITY.log');
const WINDOW_MIN = Number(process.env.SWAN_APPROVAL_WINDOW_MIN) > 0
  ? Number(process.env.SWAN_APPROVAL_WINDOW_MIN) : 10;

/** Repo-relative, forward slashes. Keep in sync with SELF_PROTECTED in the gate. */
export const GUARD_FILES = [
  'scripts/hooks/db-blast-radius-gate.mjs',
  'scripts/lib/blast-radius-analyze.mjs',
  'scripts/blast-radius-approve.mjs',
  'scripts/blast-radius-baseline.mjs',
  'scripts/schema-snapshot.mjs',
  'backend/schema-snapshot.json',
  '.claude/settings.json',
  '.claude/settings.local.json',
  'scripts/hooks/guard-integrity.mjs',
];

const sha = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

function log(line) {
  try {
    fs.mkdirSync(BASE, { recursive: true });
    fs.appendFileSync(LOG, `${new Date().toISOString()}\t${line}\n`);
  } catch { /* best effort */ }
}

function readIfExists(abs) {
  try { return fs.readFileSync(abs); } catch { return null; }
}

function headContent(rel) {
  const r = spawnSync('git', ['show', `HEAD:${rel}`], { cwd: REPO, encoding: 'buffer' });
  return r.status === 0 ? r.stdout : null;
}

function baselinePaths(rel) {
  const flat = rel.replace(/[\\/]/g, '__');
  return { content: path.join(BASELINE, flat), hash: path.join(BASELINE, `${flat}.sha256`) };
}

export function writeBaseline(rel, buf) {
  const { content, hash } = baselinePaths(rel);
  fs.mkdirSync(BASELINE, { recursive: true });
  fs.writeFileSync(content, buf);
  fs.writeFileSync(hash, `${sha(buf)}\n`);
}

function readBaseline(rel) {
  const { content, hash } = baselinePaths(rel);
  const buf = readIfExists(content);
  const h = readIfExists(hash);
  if (!buf || !h) return null;
  // The stored hash must match the stored content, or the baseline itself was tampered.
  if (sha(buf) !== String(h).trim()) return { tampered: true };
  return { buf, hash: String(h).trim() };
}

/** A consumed approval for this file within the window. */
function recentApprovalFor(rel) {
  let files = [];
  try { files = fs.readdirSync(APPROVED).filter((f) => f.endsWith('.json')); } catch { return null; }
  const now = Date.now();
  for (const f of files) {
    try {
      const a = JSON.parse(fs.readFileSync(path.join(APPROVED, f), 'utf8'));
      if (!a.consumed || !a.consumedAt) continue;
      if (now - Date.parse(a.consumedAt) > WINDOW_MIN * 60_000) continue;
      const t = String(a.targetPath || '').replace(/\\/g, '/');
      // Legacy approvals (before targetPath existed) name no file: accept within window.
      if (!t || t === rel || t.endsWith(`/${rel}`) || rel.endsWith(t)) return a.contentHash || f;
    } catch { /* skip unreadable */ }
  }
  return null;
}

function attributable(payload, rel) {
  const input = payload?.tool_input || {};
  const target = String(input.file_path || input.notebook_path || '').replace(/\\/g, '/');
  if (target && (target === rel || target.endsWith(`/${rel}`))) return true;
  const cmd = String(input.command || '');
  return cmd.includes(rel) || cmd.includes(path.basename(rel));
}

function quarantine(rel, buf) {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  const out = path.join(QUARANTINE, `${rel.replace(/[\\/]/g, '__')}.${stamp}`);
  fs.mkdirSync(QUARANTINE, { recursive: true });
  fs.writeFileSync(out, buf);
  return out;
}

/**
 * @returns {{violations: string[], notes: string[]}}
 */
export function check({ payload = null, sessionStart = false } = {}) {
  const violations = [];
  const notes = [];

  for (const rel of GUARD_FILES) {
    const abs = path.join(REPO, rel);
    const cur = readIfExists(abs);
    const base = readBaseline(rel);

    if (base && base.tampered) {
      violations.push(`${rel}: BASELINE TAMPERED (stored hash does not match stored content). ` +
        `Owner must re-establish it: node scripts/blast-radius-baseline.mjs accept ${rel}`);
      continue;
    }

    if (cur === null) {
      if (base) violations.push(`${rel}: guard file is MISSING (baseline exists).`);
      continue; // optional files (settings.local.json) may legitimately not exist
    }

    if (!base) {
      writeBaseline(rel, cur);
      notes.push(`baseline initialised: ${rel}`);
      continue;
    }

    if (sha(cur) === base.hash) continue; // invariant holds

    // Changed. Authorized?
    const approvalId = recentApprovalFor(rel);
    if (approvalId) {
      writeBaseline(rel, cur);
      notes.push(`accepted approved change: ${rel} (approval ${approvalId})`);
      log(`ACCEPT\t${rel}\tapproval=${approvalId}`);
      continue;
    }
    const head = headContent(rel);
    if (head && sha(head) === sha(cur)) {
      writeBaseline(rel, cur);
      notes.push(`accepted committed content: ${rel} (== HEAD)`);
      log(`ACCEPT\t${rel}\t== HEAD`);
      continue;
    }

    // Unauthorized.
    const q = quarantine(rel, cur);
    if (!sessionStart && payload && attributable(payload, rel)) {
      fs.writeFileSync(abs, base.buf);
      log(`RESTORE\t${rel}\tquarantine=${q}`);
      violations.push(
        `${rel}: UNAUTHORIZED CHANGE by this tool call - RESTORED from baseline.\n` +
        `  Your version is preserved at: ${q}\n` +
        `  Guard files change only through an approved Edit/Write. File a change request and ask Sean.`,
      );
    } else {
      log(`DRIFT\t${rel}\tquarantine=${q}`);
      violations.push(
        `${rel}: content differs from baseline and from HEAD, and no approval names it.\n` +
        `  Not restored (not attributable to this call). Copy preserved at: ${q}\n` +
        `  If Sean made this change on purpose, he runs:\n` +
        `    node scripts/blast-radius-baseline.mjs accept ${rel}`,
      );
    }
  }
  return { violations, notes };
}

function isEntryPoint() {
  if (!process.argv[1]) return false;
  const real = (p) => { try { return fs.realpathSync(p); } catch { return path.resolve(p); } };
  return real(process.argv[1]) === real(fileURLToPath(import.meta.url));
}

if (isEntryPoint()) {
  try {
    if (process.env.SWAN_GUARD_INTEGRITY_DISABLE === '1') process.exit(0);
    const sessionStart = process.argv.includes('--session-start');
    let payload = null;
    if (!sessionStart) {
      try { payload = JSON.parse(fs.readFileSync(0, 'utf8')); } catch { payload = null; }
    }
    const { violations, notes } = check({ payload, sessionStart });
    for (const n of notes) process.stdout.write(`[guard-integrity] ${n}\n`);
    if (violations.length) {
      const msg = `GUARD-INTEGRITY — ${violations.length} guard file(s) changed without authorization:\n\n` +
        violations.map((v) => `- ${v}`).join('\n\n') + '\n';
      process.stderr.write(msg);
      process.exit(sessionStart ? 0 : 2);
    }
    process.exit(0);
  } catch (err) {
    log(`ERROR\t${err && err.message ? err.message : String(err)}`);
    process.stderr.write(`[guard-integrity] internal error (fail-open): ${err && err.message}\n`);
    process.exit(0);
  }
}
```

### 4.2 `scripts/blast-radius-baseline.mjs` — create verbatim (owner-only after A3)

```js
#!/usr/bin/env node
/**
 * blast-radius-baseline.mjs — owner-only baseline management for guard-integrity.
 *
 * FOR SEAN, NOT THE AGENT. Deny-listed in .claude/settings.json like
 * blast-radius-approve.mjs. An agent that can re-baseline can launder any edit.
 *
 *   node scripts/blast-radius-baseline.mjs status
 *   node scripts/blast-radius-baseline.mjs accept <repo-relative guard path>
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GUARD_FILES, writeBaseline, check } from './hooks/guard-integrity.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [cmd, arg] = process.argv.slice(2);

if (cmd === 'status') {
  const { violations, notes } = check({ sessionStart: true });
  for (const n of notes) console.log(`note: ${n}`);
  if (!violations.length) { console.log('all guard files match their baseline'); process.exit(0); }
  for (const v of violations) console.log(`DRIFT: ${v}`);
  process.exit(1);
}

if (cmd === 'accept') {
  const rel = String(arg || '').replace(/\\/g, '/');
  if (!GUARD_FILES.includes(rel)) {
    console.error(`error: "${rel}" is not a guard file. Known:\n  ${GUARD_FILES.join('\n  ')}`);
    process.exit(1);
  }
  const abs = path.join(REPO, rel);
  if (!fs.existsSync(abs)) { console.error(`error: ${rel} does not exist`); process.exit(1); }
  writeBaseline(rel, fs.readFileSync(abs));
  console.log(`baseline updated: ${rel} (current content accepted)`);
  process.exit(0);
}

console.log('usage: node scripts/blast-radius-baseline.mjs status | accept <guard path>');
process.exit(2);
```

### 4.3 `scripts/hooks/guard-integrity.test.mjs` — create verbatim

```js
/**
 * guard-integrity.mjs regression tests. The hook must (1) accept committed
 * content, (2) accept an approved change, (3) restore an attributable
 * unauthorized change and quarantine it, (4) block-not-restore a drift it did
 * not cause, (5) never wedge on its own errors. Runs against a scratch repo so
 * the real baseline is never touched.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REAL_REPO = path.resolve(HERE, '..', '..');

// Build a throwaway repo whose scripts/hooks/guard-integrity.mjs is a COPY of the
// real one (the hook derives REPO from its own location).
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'guard-integrity-'));
fs.mkdirSync(path.join(tmp, 'scripts', 'hooks'), { recursive: true });
fs.mkdirSync(path.join(tmp, '.claude'), { recursive: true });
fs.copyFileSync(path.join(REAL_REPO, 'scripts/hooks/guard-integrity.mjs'), path.join(tmp, 'scripts/hooks/guard-integrity.mjs'));
const HOOK = path.join(tmp, 'scripts/hooks/guard-integrity.mjs');
const GUARD = path.join(tmp, '.claude', 'settings.json');   // a real GUARD_FILES entry
const BASE = path.join(tmp, '.ai-workflow', 'blast-radius');

function git(...args) { return spawnSync('git', args, { cwd: tmp, encoding: 'utf8' }); }
git('init', '-q');
git('config', 'user.email', 't@t'); git('config', 'user.name', 't');
fs.writeFileSync(GUARD, '{"v":1}\n');
git('add', '.'); git('commit', '-qm', 'init');

function run(payload, extra = []) {
  return spawnSync(process.execPath, [HOOK, ...extra], {
    input: payload ? JSON.stringify(payload) : '',
    encoding: 'utf8',
    env: { ...process.env },
  });
}

test('first run initialises the baseline and exits 0', () => {
  const r = run({ tool_name: 'Bash', tool_input: { command: 'ls' } });
  assert.equal(r.status, 0);
  assert.match(r.stdout, /baseline initialised: \.claude\/settings\.json/);
});

test('an attributable unauthorized change is restored and quarantined, exit 2', () => {
  fs.writeFileSync(GUARD, '{"v":"EVIL"}\n');
  const r = run({ tool_name: 'Bash', tool_input: { command: "python - <<PY\nopen('.claude/settings.json','w')\nPY" } });
  assert.equal(r.status, 2);
  assert.match(r.stderr, /RESTORED from baseline/);
  assert.equal(fs.readFileSync(GUARD, 'utf8'), '{"v":1}\n', 'content restored');
  const q = fs.readdirSync(path.join(BASE, 'quarantine'));
  assert.ok(q.length >= 1, 'evil content preserved in quarantine');
  assert.match(fs.readFileSync(path.join(BASE, 'quarantine', q[0]), 'utf8'), /EVIL/);
});

test('a non-attributable drift is blocked but NOT restored', () => {
  fs.writeFileSync(GUARD, '{"v":"hand-edit"}\n');
  const r = run({ tool_name: 'Edit', tool_input: { file_path: 'frontend/src/App.tsx' } });
  assert.equal(r.status, 2);
  assert.match(r.stderr, /Not restored/);
  assert.equal(fs.readFileSync(GUARD, 'utf8'), '{"v":"hand-edit"}\n', 'left in place for Sean');
  fs.writeFileSync(GUARD, '{"v":1}\n'); // put it back for the next tests
});

test('committed content is accepted and re-baselines', () => {
  fs.writeFileSync(GUARD, '{"v":2}\n');
  git('add', '.'); git('commit', '-qm', 'v2');
  const r = run({ tool_name: 'Bash', tool_input: { command: 'git status' } });
  assert.equal(r.status, 0);
  assert.match(r.stdout, /accepted committed content/);
});

test('an approved change (consumed approval naming the file) is accepted', () => {
  fs.mkdirSync(path.join(BASE, 'approved'), { recursive: true });
  fs.writeFileSync(path.join(BASE, 'approved', 'abcdefabcdefabcd.json'), JSON.stringify({
    contentHash: 'abcdefabcdefabcd', consumed: true, consumedAt: new Date().toISOString(),
    targetPath: '.claude/settings.json',
  }));
  fs.writeFileSync(GUARD, '{"v":3}\n');
  const r = run({ tool_name: 'Edit', tool_input: { file_path: '.claude/settings.json' } });
  assert.equal(r.status, 0);
  assert.match(r.stdout, /accepted approved change/);
});

test('an approval for a DIFFERENT file does not launder this one', () => {
  fs.writeFileSync(path.join(BASE, 'approved', '1111111111111111.json'), JSON.stringify({
    contentHash: '1111111111111111', consumed: true, consumedAt: new Date().toISOString(),
    targetPath: 'scripts/blast-radius-approve.mjs',
  }));
  fs.writeFileSync(GUARD, '{"v":4}\n');
  const r = run({ tool_name: 'Edit', tool_input: { file_path: '.claude/settings.json' } });
  assert.equal(r.status, 2);
  assert.equal(fs.readFileSync(GUARD, 'utf8'), '{"v":3}\n', 'restored to the last accepted state');
});

test('session-start mode reports but never restores and exits 0', () => {
  fs.writeFileSync(GUARD, '{"v":"drift"}\n');
  const r = run(null, ['--session-start']);
  assert.equal(r.status, 0);
  assert.match(r.stderr, /GUARD-INTEGRITY/);
  assert.equal(fs.readFileSync(GUARD, 'utf8'), '{"v":"drift"}\n');
  fs.writeFileSync(GUARD, '{"v":3}\n');
});

test('a tampered baseline is reported, not trusted', () => {
  const flat = '.claude__settings.json';
  fs.writeFileSync(path.join(BASE, 'baseline', `${flat}.sha256`), 'deadbeef\n');
  const r = run({ tool_name: 'Bash', tool_input: { command: 'ls' } });
  assert.equal(r.status, 2);
  assert.match(r.stderr, /BASELINE TAMPERED/);
});

test('malformed stdin never wedges the turn', () => {
  const r = spawnSync(process.execPath, [HOOK], { input: 'not json', encoding: 'utf8' });
  assert.ok(r.status === 0 || r.status === 2, 'exits cleanly either way');
});
```

**VERIFY:** `node scripts/hooks/guard-integrity.test.mjs` → 9/9. `node --check` on all three files.

### 4.4 Register (approvals A2 then A3)

**A2 — one Edit of `.claude/settings.json`.** `old_string` (exact, current file):
```
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node scripts/hooks/drift-check-gate.mjs",
```
`new_string`:
```
    "PostToolUse": [
      {
        "matcher": "Write|Edit|NotebookEdit|Bash",
        "hooks": [
          {
            "type": "command",
            "command": "node scripts/hooks/guard-integrity.mjs",
            "timeout": 15
          }
        ]
      }
    ],
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node scripts/hooks/guard-integrity.mjs --session-start",
            "timeout": 15
          },
          {
            "type": "command",
            "command": "node scripts/hooks/drift-check-gate.mjs",
```
Approval ritual; then **VERIFY** `node -e "JSON.parse(require('fs').readFileSync('.claude/settings.json','utf8'));console.log('json ok')"`.

**A3 — one Edit of `.claude/settings.json`.** `old_string`:
```
      "Bash(node scripts/blast-radius-approve*)"
    ],
```
`new_string`:
```
      "Bash(node scripts/blast-radius-approve*)",
      "Bash(node scripts/blast-radius-baseline*)"
    ],
```
Approval ritual; **VERIFY** JSON parses.

**Note for the executor:** the moment A2 is applied, guard-integrity is live *on your next tool
call* only after a session restart (hooks load at session start). Until then nothing enforces; that
is expected. After restart, the first tool call prints `baseline initialised:` for every guard file —
paste those lines into SWA-230 as proof.

### 4.5 Commit
```
feat(guard): content-integrity hook - guard files verified after every tool call

Parsing tool calls is a blocklist; the 2026-09-03 bypass proved it. This hook
checks the INVARIANT instead: a guard file may change only through a consumed
approval naming it, or a commit (== HEAD). Anything else is quarantined,
restored when this tool call caused it, and blocked (exit 2). Trust on first
use; SessionStart reports drift without restoring. Owner-only rebaseline via
scripts/blast-radius-baseline.mjs (deny-listed to agents).

Tests: guard-integrity.test.mjs 9/9 in a scratch git repo.
Approved by Sean: <A2 id>, <A3 id>.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
```

### 4.6 Behaviour change Sean must know (put verbatim in the SWA comment)
> If Sean edits a guard file by hand in his editor, the next agent tool call will **block** (not
> restore) with the quarantined copy's path and `node scripts/blast-radius-baseline.mjs accept
> <file>`. That one command accepts his edit. Codex has no hooks, so a Codex edit to a guard file
> shows up the same way at the next Claude tool call.

---

## 5. STEP 3 — F4: approve-script read-back (approval A4)

**File:** `scripts/blast-radius-approve.mjs`. Assemble the full new content in scratch from
`git show HEAD:scripts/blast-radius-approve.mjs` with these three replacements, `node --check` it,
then apply with **ONE Write**.

**(a)** In the "no change request on file" branch, add a line showing where it looked. Current:
```js
    process.stdout.write(
      `note: no change request on file for ${id}.\n` +
        '      The agent should have written one. Approving anyway is your call.\n\n',
    );
```
New:
```js
    process.stdout.write(
      `note: no change request on file for ${id}.\n` +
        `      looked in: ${REQUEST_DIR}\n` +
        '      The agent should have written one. Approving anyway is your call.\n\n',
    );
```

**(b)** Name the path once. Current:
```js
  const expiresAt = new Date(Date.now() + minutes * 60_000).toISOString();
  writeFileSync(
    join(APPROVAL_DIR, `${id}.json`),
```
New:
```js
  const expiresAt = new Date(Date.now() + minutes * 60_000).toISOString();
  const approvalPath = join(APPROVAL_DIR, `${id}.json`);
  writeFileSync(
    approvalPath,
```

**(c)** Read back before printing success. Current:
```js
  process.stdout.write(
    `approved ${id}\n  reason: ${reason}\n  expires: ${expiresAt} (${minutes}m)\n` +
      '  single use — the gate burns it on the next matching action.\n',
  );
  return 0;
```
New:
```js
  // F4 (GLM-5.3 hostile review): READ BACK before claiming success. A security
  // tool that prints "approved" without confirming the token is readable at the
  // path the gate consults produces confidence with nothing behind it - the
  // 2026-09-02 wrong-directory incident, caught two round-trips late.
  //
  // Deliberate deviation from the reviewer: it proposed refusing to mint when no
  // change request is on file. Not done - the owner must stay able to approve in
  // an emergency. Read-back is what turns a silent no-op into a loud failure.
  try {
    const back = JSON.parse(readFileSync(approvalPath, 'utf8'));
    if (back.contentHash !== id) throw new Error(`id mismatch: ${back.contentHash}`);
  } catch (error) {
    process.stderr.write(
      'FAILED: the approval was NOT stored where the gate reads it.\n' +
        `  wrote to : ${approvalPath}\n` +
        `  error    : ${error.message}\n` +
        '  Nothing was approved. Re-run from inside the repository.\n',
    );
    return 1;
  }

  process.stdout.write(
    `approved ${id}\n  stored : ${approvalPath}\n  reason: ${reason}\n  expires: ${expiresAt} (${minutes}m)\n` +
      '  single use — the gate burns it on the next matching action.\n',
  );
  return 0;
```

Approval ritual (A4). **VERIFY:** `node --check` clean; `node scripts/hooks/db-blast-radius-approval.test.mjs` → 24/24; the executor may NOT run the script (deny-listed) — Sean's next real approval is the live proof and must show `stored : …\approved\<id>.json`.

Commit:
```
fix(guard): approve script reads the token back before printing "approved" (F4)

Approved by Sean: <A4 id>.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
```

---

## 6. STEP 4 — Vault residuals (no approvals)

### 6.1 Ticket
Create Linear issue in team SwanStudios: title **"Blast-radius guard bypass: inline-interpreter
writes evaded the gate (2026-09-03)"**, priority Urgent, body = §2 rows 1–2 + §3.4 threat-model
note + link to this spec. Reference its id in every commit message from here on.

### 6.2 Sweep only what a destructive command can destroy — `scripts/hooks/vault-guard.mjs`

Replace the body of `sweepVaultClassTree` with:

```js
export function sweepVaultClassTree(limit = 2000) {
  let taken = 0;
  // A destructive command (reset --hard, clean, checkout --, stash) can only
  // destroy what is NOT already in a commit: modified + untracked files. That is
  // exactly what `git status --porcelain` lists, so sweep that set - complete,
  // and cheap even when docs/ holds thousands of blueprints. A fixed-order walk
  // capped at N would leave the SAME files unprotected every time.
  const r = spawnSync('git', ['status', '--porcelain', '--untracked-files=all', '--',
    'docs', 'CLAUDE.md', 'CLAUDE.local.md', 'AGENTS.md', 'SOUL.md', 'ACTIVE-INDEX.md'],
    { cwd: REPO, encoding: 'utf8' });
  if (r.status === 0) {
    for (const line of r.stdout.split('\n')) {
      if (taken >= limit) break;
      if (!line.trim()) continue;
      // porcelain: XY<space>path ; renames: "old -> new" -> take the new side
      let rel = line.slice(3).trim();
      if (rel.includes(' -> ')) rel = rel.split(' -> ').pop();
      rel = rel.replace(/^"|"$/g, '');
      if (line[1] === 'D' || line[0] === 'D') continue;          // already gone
      if (!isVaultClass(rel)) continue;
      if (snapshot(path.join(REPO, rel))) taken += 1;
    }
    // Root SWAN-*.md packets are untracked-or-tracked; `git status -- docs ...` above
    // does not list them, so add them explicitly.
    try {
      for (const f of fs.readdirSync(REPO, { withFileTypes: true })) {
        if (taken >= limit) break;
        if (f.isFile() && /^swan-.*\.md$/i.test(f.name) && snapshot(path.join(REPO, f.name))) taken += 1;
      }
    } catch { /* ignore */ }
    return taken;
  }
  // git unavailable: fall back to the walk, with a cap high enough to be complete
  // for this repo (raise if docs/ ever exceeds it - check with a find | wc -l).
  try {
    for (const f of fs.readdirSync(REPO, { withFileTypes: true })) {
      if (taken >= limit) return taken;
      if (!f.isFile() || !isVaultClass(f.name)) continue;
      if (snapshot(path.join(REPO, f.name))) taken += 1;
    }
  } catch { /* fall through */ }
  const stack = [path.join(REPO, 'docs')];
  while (stack.length && taken < limit) {
    const dir = stack.pop();
    let entries = [];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { continue; }
    for (const e of entries) {
      if (taken >= limit) break;
      const child = path.join(dir, e.name);
      if (e.isDirectory()) { stack.push(child); continue; }
      if (isVaultClass(path.relative(REPO, child)) && snapshot(child)) taken += 1;
    }
  }
  return taken;
}
```
Add `import { spawnSync } from 'node:child_process';` to the imports.

Add this test to `vault-guard.test.mjs` (the existing R2-1 test keeps passing because the temp doc is
untracked):
```js
test('sweep targets dirty files: an UNCHANGED tracked blueprint is not re-hashed', () => {
  // docs/ai-workflow/references/BLUEPRINT-PROTOCOL.md is tracked and clean.
  const slot = slotFor('docs/ai-workflow/references/BLUEPRINT-PROTOCOL.md');
  const before = fs.existsSync(slot) ? fs.readdirSync(slot).length : 0;
  const r = spawnSync(process.execPath, [HOOK], {
    input: JSON.stringify({ tool_name: 'Bash', tool_input: { command: 'git reset --hard' } }),
    encoding: 'utf8',
  });
  assert.equal(r.status, 0);
  const after = fs.existsSync(slot) ? fs.readdirSync(slot).length : 0;
  assert.equal(after, before, 'a clean tracked file loses nothing on reset, so it is skipped');
});
```
If that path is dirty on the executor's machine, substitute any tracked, clean `docs/ai-workflow/**/*.md`
(`git status --porcelain <path>` prints nothing).

**VERIFY:** 22/22.

### 6.3 Test hygiene (R2-14) — `vault-guard.test.mjs`
Change `tempDoc` so every test doc lives under one dir, and remove it globally:
```js
const TMP_REL = 'docs/ai-workflow/brainstorms/__vault-test-tmp';
function tempDoc(_relDir, name, body) {           // signature kept; first arg ignored
  const dir = path.join(REPO, TMP_REL);
  fs.mkdirSync(dir, { recursive: true });
  const abs = path.join(dir, name);
  fs.writeFileSync(abs, body);
  return abs;
}
import { after } from 'node:test';
after(() => {
  cleanup([path.join(REPO, TMP_REL), slotFor(TMP_REL), path.join(VAULT, 'ERRORS.log')]);
});
```
and update every `rel`/`slotFor(...)` string in the tests from `docs/ai-workflow/brainstorms/__vault-…`
to `docs/ai-workflow/brainstorms/__vault-test-tmp/__vault-…` (the F6 test's two paths become
`…/__vault-test-tmp/__vt/a.md` and `…/__vault-test-tmp/__vt__a.md`). **VERIFY:** 22/22 and
`git status --porcelain docs/` shows no `__vault` leftovers after the run.

### 6.4 Commit
```
fix(vault): sweep exactly the files a destructive command can destroy; test hygiene

sweepVaultClassTree now snapshots `git status --porcelain` modified+untracked
vault-class files (complete and cheap) instead of a fixed-order walk capped at
400, which left the same blueprints unprotected on every reset. Tests use one
tmp dir with global cleanup (R2-14). 22/22.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
```

---

## 7. STEP 5 — Constitution truth (CLAUDE.md + AGENTS.md, identical; no approval)

In the section **"Learning Drop + Blueprint Vault (added 2026-09-01 …)"**, replace the sentence
fragment `The Blueprint Vault (`scripts/hooks/vault-guard.mjs`, PreToolUse on Write/Edit)` with
`The Blueprint Vault (`scripts/hooks/vault-guard.mjs`, PreToolUse on Write/Edit/NotebookEdit/Bash — command-line overwrites and repo-wide destructive commands are swept too)`.

Append one bullet to the same section (both files, identical):

`- **Guard files are content-verified, not just call-parsed (added 2026-09-03).** After an inline-interpreter write slipped past the blast-radius gate, `scripts/hooks/guard-integrity.mjs` (PostToolUse + SessionStart) hashes every guard file after each tool call; a change that has no consumed approval naming the file and does not equal `git HEAD` is quarantined, restored when your own call caused it, and blocks the turn. Never edit a guard file through Bash. If Sean changed one by hand: `node scripts/blast-radius-baseline.mjs accept <file>` (owner-only). Full spec: `docs/ai-workflow/AI-HANDOFF/GUARD-BYPASS-AND-VAULT-HARDENING-BUILD-SPEC-2026-09-03.md`.`

Commit with the RULEBOOK trailer the guard demands:
```
docs(constitution): vault covers Bash; guard files are content-verified

RULEBOOK: amend Learning Drop + Blueprint Vault section (mirror-sync CLAUDE.md+AGENTS.md) — reviewed-by: fable (spec 2026-09-03)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
```
**VERIFY:** `diff <(tail -12 CLAUDE.md) <(tail -12 AGENTS.md)` prints nothing.

---

## 8. STEP 6 — Closeout (exact)

1. **Round 3 of the vault review** (GLM-5.3, then glm-5.3-flash), packet =
   `<scratchpad>/round3-packet.md` regenerated from the CURRENT files by re-running the block in the
   session log that built it (or rebuild: header + full `vault-guard.mjs` + full test file +
   `mirrorVault`). If the Z.ai lock is held, retry every 75 s for up to 40 attempts; never seize.
   If a round returns **material** findings: do NOT fix — paste them into SWA-230 and stop.
   If it returns nothing material: write "DRY — round N clean" in SWA-230.
2. Follow-up ticket (do not act): "Widen class S to all enforcement hooks in scripts/hooks/? (policy — Sean)".
3. Update this spec's frontmatter `status: shipped` and add `shipped_commits: <list>`.
4. Hermes inbox memo (one file) with a **`## Mistakes I made`** section — include: the Fable-authored
   spec's own errors if any were found while executing (there will be some; say which).
5. Learning drop: one line in `docs/ai-workflow/learning-drops-ledger.md`, category `security`,
   topic "blocklists enumerate the past; invariants cover the future" — no repeat of an existing topic.
6. Orient: `node scripts/orient.mjs --pid learning-vault --set status=OK now="…" proof="<commit shas>; 24/24 gate; 9/9 integrity; 22/22 vault" next="…"` then `--full`.
7. **Do not push.** Batch stays local until Sean says.

---

## 9. Templates

### 9.1 Change-request file (write to the exact path the gate prints)
```
# Change request — <one line>

**Date:** <today> · **Requested by:** <seat> · **File:** `<path>` · **Approval id:** `<id>`
**Source:** Fable 5.1 build spec 2026-09-03, §<n> · SWA-<ticket>

## WHAT is wrong, in plain English
<2–4 sentences from §2>

## WHY it matters
<2 sentences>

## OPTION A (recommended): <the change in one sentence>
**Cost:** <one line>

## OPTION B: leave it
**Cost:** <one line>

## What will be verified after the change
<the VERIFY block of that step, as a numbered list>

## To approve
node "<repo>\scripts\blast-radius-approve.mjs" <id> --reason "<why>"
```

### 9.2 Definition of done (all must be true, with the artifact shown)
- [ ] `db-blast-radius-approval.test.mjs` 24/24 · `db-blast-radius-gate.test.mjs` 20/20
- [ ] Live: a `python - <<PY` mentioning a guard path is denied by the gate; `node --check <guard>` runs
- [ ] `guard-integrity.test.mjs` 9/9; after restart, SessionStart prints `baseline initialised:` × 9 (or 8 if `settings.local.json` is absent)
- [ ] Live: with the hook armed, a Bash `python` write to a guard file is restored and the turn blocked (run it ONCE, on `.claude/settings.local.json` if it exists, else on `scripts/blast-radius-baseline.mjs`; paste the block message and the quarantine path)
- [ ] `vault-guard.test.mjs` 22/22; no `__vault` leftovers in `docs/`
- [ ] `settings.json` parses; four approvals recorded in `.ai-workflow/blast-radius/approved/` as consumed with `targetPath`
- [ ] CLAUDE.md/AGENTS.md tails identical
- [ ] SWA-230 + new ticket updated; spec frontmatter `status: shipped`

---

## 10. Residual risk (state these, do not solve them)

- A fully adversarial agent can still `python evil.py && git commit -am x` in one Bash call so the
  file equals HEAD before PostToolUse runs. Defence needs git-side hooks under Sean's control; out of scope.
- Codex runs no Claude hooks: its guard-file edits are detected at the *next Claude* tool call, not at
  write time; its blueprint overwrites are covered by git only.
- Trust-on-first-use: the first run of guard-integrity blesses whatever content exists. Sean should run
  `node scripts/blast-radius-baseline.mjs status` once after restart and eyeball the nine paths.
- This branch is ~2,379 commits behind main. The settings.json and constitution edits will conflict on
  merge; whoever merges must re-apply §4.4 and §7 by hand if git cannot.

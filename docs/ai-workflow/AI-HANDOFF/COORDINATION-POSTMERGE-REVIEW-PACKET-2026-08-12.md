# Post-merge hostile review — Coordination Ledger v2.3 (SHIPPED)

**Reviewers:** Kimi K3, Tencent HY3 · **Merged:** `53cdf20b3` on `main`, deployed, health 200.

This code is ALREADY LIVE. Findings now become follow-up commits, so tell me plainly
if anything here is bad enough to warrant a revert rather than a patch.

## Three prior passes already ran. Do NOT re-report these — they are FIXED:

**Design (settled, not open for re-litigation):** session-namespaced lanes; locks are
advisory broadcast not exclusion; no Stop-hook freshness gate; no committed delivery log;
push gate advisory not blocking; server-side branch protection is the real control.

**Already fixed defects:**
1. Ledger resolved from cwd → forked across 187 worktrees (9 unreadable claims).
2. Agent-name-keyed lanes → concurrent sessions clobbered each other.
3. `release()` cleared only the FIRST lock (`$` under `/m` = end-of-line).
4. `parseLane` returned 1 lock for a lane holding 186 (same `$`-under-`/m`).
5. Prose bullets rendered as locks (false locks).
6. `- ` bullet requirement → fenced code blocks parsed to ZERO locks.
7. Extensionless / bare-directory locks dropped (`Dockerfile`, `backend`, `docs`).
8. `deliveryState` coerced a FAILED count to 0 → false `pushed-branch`.
9. Literal backspace bytes from a patch script → a regex that compiled and never matched.
10. Push-hook false positives: `git config push.default`, `git log --grep=push`,
    `git commit -m "...push..."`, `-f` inside quotes, `feature/main-fix` as deploy-linked.
11. Push-hook false negatives: `-uf` clusters, uppercase `GIT PUSH`, sibling-session locks.
12. `release()` read-modify-write race; slug hash widened 6→10 hex.

## Environment
Windows 11, Git Bash, Node ESM, CRLF in places. ~110 worktrees, several agents concurrent.
Ledger is gitignored at `<git-common-dir>/../.ai-workflow/coordination/`. Hooks: stdin
`{tool_name, tool_input}`, exit 0 = allow, must never break a push. `render.yaml` build runs
`npm run migrate:production` — a push to a deploy-linked branch migrates production.

## Your remit — find the SIXTH defect class
1. **Parsing/consumer defects that survived twelve fixes.** Over-report, under-report,
   wrong-entry. This module has produced five defects in one day; assume a sixth.
2. **The SKILL.md and settings.json wiring** — never reviewed. Does the documented
   procedure match what the code does? Does the hook wiring do what the doc claims?
3. **Interaction between the two hooks** and with the five pre-existing Stop hooks.
4. **Failure modes only visible at scale** — 110 worktrees, 10+ lanes, many agents.
5. **Anything that reports success while doing nothing.** The founding failure class.
6. **Should anything here be REVERTED rather than patched?**

Rank by cost × likelihood. Cite file + line. No praise. Say nothing about what is fine.

---

## `scripts/lib/lane-core.mjs` (214 lines)

```javascript
     1	/**
     2	 * lane-core.mjs — the ONE implementation of ledger truth (Rule 67 v2.1)
     3	 * =====================================================================
     4	 * Extracted after a Kimi K3 implementation review found the ledger was parsed by
     5	 * THREE separate copies of the same logic which had already drifted: `lane.mjs`
     6	 * resolved the agent name as `SWAN_AGENT_SURFACE || CLAUDE_AGENT || 'vs-claude'`
     7	 * while `push-blast-radius.mjs` had silently dropped `CLAUDE_AGENT`, so a lane
     8	 * claimed as `codex--main` was compared against `vs-claude--main` and the hook
     9	 * warned an agent about its own locks. A comment three lines above congratulated
    10	 * itself for fixing that exact bug class. Duplication is the defect; one module
    11	 * is the fix.
    12	 *
    13	 * Everything here is pure/read-only except nothing — no writes live in this file.
    14	 */
    15	import { execSync } from 'node:child_process';
    16	import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
    17	import { basename, resolve } from 'node:path';
    18	import { createHash } from 'node:crypto';
    19	
    20	/** A lane is considered LIVE within this window. Single definition — it was
    21	 *  duplicated as a bare 120 in two files. */
    22	export const FRESH_MIN = 120;
    23	
    24	/** Conventional extensionless files that are real lock targets. `Dockerfile` is in
    25	 *  the push hook's executes-on-deploy list, so dropping it was the worst case. */
    26	export const EXTENSIONLESS = new Set([
    27	  'Dockerfile', 'Makefile', 'README', 'LICENSE', 'Procfile', 'Jenkinsfile', 'CODEOWNERS', '.env',
    28	]);
    29	
    30	/** Run git. Returns null on failure — NEVER '' — so callers can distinguish
    31	 *  "empty result" from "command failed". Conflating those made the push hook
    32	 *  fail-open: a failed `git diff` produced an empty file list and the guard
    33	 *  returned silently on a migration push. */
    34	export const sh = (cmd, cwd = process.cwd()) => {
    35	  try {
    36	    return execSync(cmd, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    37	  } catch {
    38	    return null;
    39	  }
    40	};
    41	
    42	/** Normalize a path for Windows reality: backslashes → forward, and MSYS/Git-Bash
    43	 *  `/c/foo` → `C:/foo`. Node's resolve() treats `/c/repo/.git` as drive-relative and
    44	 *  would silently invent `C:\c\repo\...` — a phantom ledger that mkdirSync would
    45	 *  happily CREATE, resurrecting the v1 fork via path form instead of cwd.
    46	 *  (Git returns the `C:/` form on this machine; this is belt-and-braces for other
    47	 *  git builds, and it costs nothing.) */
    48	export function normPath(p) {
    49	  if (!p) return p;
    50	  let s = String(p).replace(/\\/g, '/');
    51	  const msys = s.match(/^\/([a-zA-Z])\/(.*)$/);
    52	  if (msys) s = `${msys[1].toUpperCase()}:/${msys[2]}`;
    53	  return s;
    54	}
    55	
    56	/** Case- and separator-insensitive path identity. Windows filesystems are
    57	 *  case-insensitive, so a raw `===` between two git outputs decided session
    58	 *  identity and could flip IS_MAIN on nothing but shell invocation casing. */
    59	export const samePath = (a, b) => normPath(resolve(normPath(a || ''))).toLowerCase()
    60	  === normPath(resolve(normPath(b || ''))).toLowerCase();
    61	
    62	/** The canonical ledger directory — identical from every worktree, or null. */
    63	export function ledgerDir(cwd = process.cwd()) {
    64	  const common = sh('git rev-parse --path-format=absolute --git-common-dir', cwd)
    65	    ?? sh('git rev-parse --git-common-dir', cwd);
    66	  if (!common) return null;
    67	  return normPath(resolve(normPath(common), '..', '.ai-workflow', 'coordination'));
    68	}
    69	
    70	/** Who am I? Identity is agent + worktree, and the worktree part carries a short
    71	 *  hash of the FULL path: with 184 worktrees, two checkouts whose directories are
    72	 *  both named `repo` produced the same lane file and overwrote each other — the
    73	 *  exact last-writer-wins regression this rebuild exists to prevent. A linked
    74	 *  worktree literally named `main` collided with the main tree the same way. */
    75	export function identity(cwd = process.cwd()) {
    76	  const agent = process.env.SWAN_AGENT_SURFACE || process.env.CLAUDE_AGENT || 'vs-claude';
    77	  const top = sh('git rev-parse --show-toplevel', cwd);
    78	  const ledger = ledgerDir(cwd);
    79	  const mainTree = ledger ? resolve(ledger, '..', '..') : null;
    80	  const isMain = Boolean(top && mainTree && samePath(top, mainTree));
    81	  let slug = 'main';
    82	  if (!isMain) {
    83	    const full = normPath(top || cwd);
    84	    const short = createHash('sha1').update(full.toLowerCase()).digest('hex').slice(0, 10);
    85	    slug = `${basename(full)}-${short}`;
    86	  }
    87	  return { agent, top: normPath(top || cwd), isMain, slug, laneName: `${agent}--${slug}.lane.md` };
    88	}
    89	
    90	/** Git refnames may legally contain `$ ( ) ; \`` — all shell-active. Refuse to
    91	 *  interpolate anything outside a conservative safe set rather than hand it to a
    92	 *  shell. Returns null when the ref is not provably safe. */
    93	export function safeRef(ref) {
    94	  return typeof ref === 'string' && /^[A-Za-z0-9._\/-]{1,255}$/.test(ref) && !ref.includes('..')
    95	    ? ref
    96	    : null;
    97	}
    98	
    99	/** Parse one lane file's body. CRLF-tolerant everywhere: these files are written
   100	 *  by tools AND edited by hand, and a bare-\n assumption silently no-ops. */
   101	export function parseLane(src, root = null) {
   102	  /* Line-wise, deliberately — TWICE now this logic was written as one clever regex
   103	   * and both times `$` inside a lookahead under the /m flag (where `$` means
   104	   * end-of-LINE, not end-of-string) made the lazy quantifier stop at the first
   105	   * newline. In release() that cleared one lock of three; here it returned ONE lock
   106	   * for a lane holding sixteen — a digest reporting a locked file as free, which is
   107	   * the false-negative collision detector this whole rebuild exists to prevent.
   108	   * Anchor on the HEADING, not the phrase: `Task: stop editing now buttons`
   109	   * precedes the heading in the claim template. */
   110	  const all = src.split(/\r?\n/);
   111	  const head = all.findIndex((l) => /^#{1,6}\s.*EDITING NOW/i.test(l));
   112	  const body = [];
   113	  if (head !== -1) {
   114	    for (let i = head + 1; i < all.length; i += 1) {
   115	      const t = all[i].trim();
   116	      if (/^#{1,6}\s/.test(t)) break;            // next heading ends the section
   117	      if (/^[A-Z][a-z]+ intent:/.test(t)) break; // "Next intent:" ends it
   118	      body.push(all[i]);
   119	    }
   120	  }
   121	  /* FORMAT-AGNOSTIC, and it has to be. Requiring a `- ` bullet made a real lane
   122	   * parse to ZERO locks: the live claude.lane.md listed its locked paths inside a
   123	   * fenced code block, so an entire locked directory tree was invisible to every
   124	   * consumer. Agents also write `*`/`+` bullets, numbered lists and `- [ ]`
   125	   * checkboxes. Accept any line, strip whatever list/fence decoration it carries,
   126	   * and let the path-shape test below decide — that test is what keeps prose out,
   127	   * so being liberal about decoration costs nothing.
   128	   *
   129	   * The path-shape test is load-bearing in the other direction: agents write prose
   130	   * bullets in the lock section ("- I work in an isolated worktree and rebase onto
   131	   * origin/main before each push,") which rendered verbatim under "DO NOT edit
   132	   * these". It also drops the `(released)` / `(none declared yet)` placeholders
   133	   * that release() and claim() write. An entry that cannot match a file path
   134	   * cannot do a lock's job, and false locks are what train a reader to ignore the
   135	   * digest. Trailing commentary is dropped: "docs/x.md (new, mine only)" → "docs/x.md". */
   136	  const locks = body.map((l) => l.trim())
   137	    .filter((l) => l && !/^```/.test(l))
   138	    .map((l) => l
   139	      .replace(/^(?:[-*+]\s+|\d+[.)]\s+)/, '')   // bullet or numbered marker
   140	      .replace(/^\[[ xX]\]\s*/, '')               // checkbox
   141	      // Strip backticks only. `*` is NOT decoration here — it is glob syntax
   142	      // (`docs/x/**`, `services/contentStudio*`), and stripping it silently
   143	      // narrowed a directory-wide claim to a single nonexistent path. Markdown
   144	      // bold like `**Nothing.**` survives this but is dropped by the path test.
   145	      .replace(/`/g, '')
   146	      .trim())
   147	    // A bullet may list several comma-separated files ("- a.ts, b.ts").
   148	    .flatMap((l) => l.split(','))
   149	    .map((l) => l.trim().replace(/^["']|["']$/g, '').split(/\s+/)[0].replace(/[,;:]+$/, ''))
   150	    /* Strip a fully-wrapped `**bold**` TOKEN. This has to run on the token, not the
   151	     * line: `- **Nothing.** Every slice is pushed.` is not wrapped as a whole, but
   152	     * its first token is — and because `*` is kept for globs, that token otherwise
   153	     * passed the shape test and rendered as a lock. */
   154	    .map((l) => l.replace(/^\*\*(.+?)\*\*$/, '$1'))
   155	    .map((l) => l.replace(/^\.\//, ''))   // "./src/a.ts" never matched a repo-relative path
   156	    .filter(Boolean)
   157	    .filter((l) => !/^\(/.test(l))
   158	    /* Shape test, plus two escape hatches. The shape test alone silently dropped
   159	     * the BROADEST locks an agent can declare — `- docs`, `- backend`, and
   160	     * crucially `- Dockerfile`, which is itself in the push hook's
   161	     * executes-on-deploy list. The ledger would have reported "clear" on exactly
   162	     * the files that trigger a production migration. Extensionless real paths are
   163	     * admitted by an existence check when we know the repo root, and by a small
   164	     * list of conventional extensionless files when we do not. Prose still fails
   165	     * all three ("work", "isolated", "rebase" are neither paths nor files). */
   166	    .filter((l) => /[/\\*]/.test(l)
   167	      || /\.[A-Za-z0-9]{1,6}$/.test(l)
   168	      || EXTENSIONLESS.has(l)
   169	      || (root && existsSync(resolve(root, l))))
   170	    .map((l) => l.slice(0, 120)); // lane files are untrusted input
   171	  const heads = [...src.matchAll(/^#{1,6}\s+(.+)$/gm)].map((h) => h[1].trim())
   172	    .filter((h) => !/EDITING NOW/i.test(h));
   173	  const task = (src.match(/^Task:\s*(.+)$/m) || [])[1]?.trim() || heads[0] || '(no task stated)';
   174	  return { locks, task: task.slice(0, 90) };
   175	}
   176	
   177	/** Every lane in the canonical ledger, with freshness from file mtime. */
   178	export function readLanes(ledger, selfName = null) {
   179	  if (!ledger || !existsSync(ledger)) return [];
   180	  const root = resolve(ledger, '..', '..');
   181	  return readdirSync(ledger).filter((f) => f.endsWith('.lane.md')).map((file) => {
   182	    const path = resolve(ledger, file);
   183	    const { locks, task } = parseLane(readFileSync(path, 'utf8'), root);
   184	    return {
   185	      file,
   186	      self: file === selfName,
   187	      ageMin: Math.round((Date.now() - statSync(path).mtimeMs) / 60000),
   188	      locks,
   189	      task,
   190	    };
   191	  });
   192	}
   193	
   194	/** Does a changed path fall under a declared lock? Both sides normalized, because
   195	 *  git emits forward-slash exact-case while a lane holds agent-authored prose that
   196	 *  may use backslashes or different casing. Supports `dir/**` and `dir/*`. */
   197	export function lockMatches(changedPath, lock) {
   198	  const c = normPath(changedPath).toLowerCase();
   199	  const raw = normPath(lock).toLowerCase().replace(/^["']|["']$/g, '').replace(/^\.\//, '');
   200	  if (raw.includes('*')) {
   201	    /* Compile the glob rather than prefix-matching it. Prefix-only made
   202	     * `src/*.js` lock the whole of `src/`, discarding the extension constraint —
   203	     * an over-report, and over-reports are what get a digest ignored. `**`
   204	     * crosses directory separators; a single `*` does not. */
   205	    const esc = (lit) => lit.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
   206	    const body = raw.split('**')
   207	      .map((seg) => seg.split('*').map(esc).join('[^/]*'))
   208	      .join('.*');
   209	    return new RegExp(`^${body}(?:/.*)?$`).test(c);
   210	  }
   211	  const stem = raw.replace(/\/+$/, '');
   212	  if (!stem) return false;
   213	  return c === stem || c.startsWith(`${stem}/`);
   214	}
```

---

## `scripts/lane.mjs` (243 lines)

```javascript
     1	#!/usr/bin/env node
     2	/**
     3	 * lane.mjs — the cross-agent Coordination Ledger CLI (Rule 67 v2.1)
     4	 * ==================================================================
     5	 * Parallel agents (Claude sessions, Codex, Fable, cloud agents) working one repo
     6	 * publish what they are doing here so they do not step on each other. Locks are
     7	 * ADVISORY BROADCAST, not exclusion — nothing in this file blocks an edit. The
     8	 * reviewed evidence is that visibility is what has ever paid; exclusion has never
     9	 * prevented a collision.
    10	 *
    11	 * v2   rebuilt after a design review (Kimi K3 + Tencent HY3) killed the
    12	 *      cwd-relative ledger AND the agent-name-keyed lane that would have replaced it.
    13	 * v2.1 hardened after a Kimi K3 IMPLEMENTATION review; shared logic moved to
    14	 *      lib/lane-core.mjs because three drifted copies of it were the real defect.
    15	 *
    16	 * Writes are atomic (tmp + rename) and never touch another session's lane.
    17	 * Nothing is ever deleted (Rule 34) — `doctor` reports only.
    18	 *
    19	 * Usage:
    20	 *   node scripts/lane.mjs claim   --task "<one line>" [--files "a,b,c"] [--next "..."] [--notes "..."]
    21	 *   node scripts/lane.mjs release [--outcome "<one line>"]
    22	 *   node scripts/lane.mjs digest  [--json]   # DELTA orientation, capped — for SessionStart
    23	 *   node scripts/lane.mjs doctor  [--json]   # hygiene: orphan ledgers, rot (report only)
    24	 *   node scripts/lane.mjs whoami
    25	 *
    26	 * Exit codes: 0 ok · 2 not a git repo · 3 write failed · 4 unknown subcommand.
    27	 */
    28	import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, statSync, writeFileSync, appendFileSync, unlinkSync } from 'node:fs';
    29	import { resolve } from 'node:path';
    30	import { FRESH_MIN, sh, normPath, samePath, ledgerDir, identity, safeRef, readLanes } from './lib/lane-core.mjs';
    31	
    32	const ARGV = process.argv.slice(2);
    33	const CMD = ARGV[0] ?? 'digest';
    34	const JSON_MODE = ARGV.includes('--json');
    35	const flag = (name, dflt = '') => {
    36	  const i = ARGV.indexOf(`--${name}`);
    37	  return i >= 0 && ARGV[i + 1] && !ARGV[i + 1].startsWith('--') ? ARGV[i + 1] : dflt;
    38	};
    39	
    40	const LEDGER = ledgerDir();
    41	if (!LEDGER) {
    42	  console.error('[lane] not a git repository — no ledger.');
    43	  process.exit(2);
    44	}
    45	const ME = identity();
    46	const LANE_PATH = resolve(LEDGER, ME.laneName);
    47	
    48	/* ── Delivery state — COMPUTED from git, never asserted ─────────────────────
    49	 * v1's schema could only say "Last commit: <sha>", so the committed-vs-pushed-vs-
    50	 * merged confusion that caused the incident was unrepresentable and uncheckable. */
    51	function deliveryState() {
    52	  const branch = sh('git rev-parse --abbrev-ref HEAD');
    53	  if (!branch || branch === 'HEAD') return { branch: branch || 'detached', state: 'detached', unpushed: 0 };
    54	  const ref = safeRef(branch);
    55	  if (!ref) return { branch, state: 'unknown (unsafe refname)', unpushed: 0 };
    56	  const onRemote = Boolean(sh(`git rev-parse --verify --quiet origin/${ref}`));
    57	  const mergedMain = Boolean(sh('git branch --remotes --contains HEAD --list origin/main'));
    58	  /* `?? 0` here was the incident's own bug class landing on the field the incident
    59	   * created: sh() returns null on FAILURE, and coercing that to 0 made a shallow
    60	   * clone (no merge base) report `Delivery: pushed-branch` while HEAD was
    61	   * arbitrarily far ahead. An agent reading that field to decide a branch is safe
    62	   * to abandon would be reading a lie. Failure is `unknown`, never a count. */
    63	  const rawCount = sh(`git rev-list --count ${onRemote ? `origin/${ref}` : 'origin/main'}..HEAD`);
    64	  if (rawCount === null) return { branch, state: 'unknown (count unavailable)', unpushed: 0, onRemote };
    65	  const unpushed = Number(rawCount) || 0;
    66	  let state = 'local-commit';
    67	  if (mergedMain) state = 'merged-to-main';
    68	  else if (onRemote && unpushed === 0) state = 'pushed-branch';
    69	  return { branch, state, unpushed, onRemote };
    70	}
    71	
    72	/* ── Writes ─────────────────────────────────────────────────────────────────── */
    73	function atomicWrite(path, body) {
    74	  const tmp = `${path}.tmp-${process.pid}`;
    75	  try {
    76	    writeFileSync(tmp, body, 'utf8');
    77	    renameSync(tmp, path); // atomic on same filesystem — no torn reads
    78	  } catch (err) {
    79	    // Windows renameSync throws EPERM/EEXIST when the destination is held open by
    80	    // antivirus, an indexer, or a concurrent reader. Retry once, then fail LOUDLY:
    81	    // a silently lost claim is a lane nobody can see, which is the whole bug class.
    82	    try {
    83	      renameSync(tmp, path);
    84	    } catch {
    85	      try { if (existsSync(tmp)) unlinkSync(tmp); } catch { /* leave no litter */ }
    86	      console.error(`[lane] FAILED to write ${path}: ${err.code || err.message}`);
    87	      console.error('[lane] your claim was NOT published — other agents cannot see it. Retry.');
    88	      process.exit(3);
    89	    }
    90	  }
    91	}
    92	
    93	const logActivity = (line) => {
    94	  try { appendFileSync(resolve(LEDGER, 'activity.log.md'), `${line}\n`, 'utf8'); } catch { /* non-fatal */ }
    95	};
    96	
    97	function claim() {
    98	  if (!existsSync(LEDGER)) mkdirSync(LEDGER, { recursive: true });
    99	  const task = flag('task', '(unstated)');
   100	  const files = flag('files').split(',').map((s) => s.trim()).filter(Boolean);
   101	  const d = deliveryState();
   102	  atomicWrite(LANE_PATH, `# ${ME.agent} — Live Lane (session: ${ME.slug})
   103	Updated: ${new Date().toISOString()}
   104	Status: in-progress
   105	Agent: ${ME.agent}
   106	Worktree: ${ME.top}${ME.isMain ? '  (MAIN TREE)' : ''}
   107	Branch: ${d.branch}
   108	Delivery: ${d.state}${d.unpushed ? ` (${d.unpushed} unpushed)` : ''}
   109	Task: ${task}
   110	
   111	## EDITING NOW
   112	${files.length ? files.map((f) => `- ${f}`).join('\n') : '- (none declared yet)'}
   113	
   114	Next intent: ${flag('next', '—')}
   115	Notes for other agents: ${flag('notes', '—')}
   116	`);
   117	  logActivity(`${new Date().toISOString()} CLAIM ${ME.agent}@${ME.slug} :: ${task} :: ${files.length} file(s)`);
   118	  console.log(`[lane] claimed → ${ME.laneName}\n[lane] ledger: ${LEDGER}\n[lane] delivery: ${d.state}`);
   119	}
   120	
   121	function release() {
   122	  if (!existsSync(LANE_PATH)) { console.log('[lane] no lane to release.'); return; }
   123	  const d = deliveryState();
   124	  /* release() is a read-modify-write; tmp+rename makes each WRITE atomic but not
   125	   * the sequence. A concurrent claim() landing between the read and the rename
   126	   * would be silently overwritten — the new locks vanish while claim already
   127	   * printed "claimed". Same-lane concurrency is real here (a Stop hook releasing
   128	   * while the main loop re-claims), so re-stat before committing the write. */
   129	  const mtimeAtRead = statSync(LANE_PATH).mtimeMs;
   130	  const src = readFileSync(LANE_PATH, 'utf8');
   131	  // CRLF-tolerant. A bare-\n pattern silently no-ops on a hand-edited CRLF lane,
   132	  // leaving every lock in place while printing "released" — phantom locks for
   133	  // FRESH_MIN minutes on a file other agents act on.
   134	  const header = src
   135	    .replace(/^Status: .*$/m, 'Status: idle')
   136	    .replace(/^Updated: .*$/m, `Updated: ${new Date().toISOString()}`)
   137	    .replace(/^Delivery: .*$/m, `Delivery: ${d.state}${d.unpushed ? ` (${d.unpushed} unpushed)` : ''}`);
   138	
   139	  /* Line-wise, deliberately. The regex version used `$` inside a lookahead under
   140	   * the /m flag — where `$` means end-of-LINE — so the lazy quantifier stopped at
   141	   * the first newline and cleared only the FIRST lock, leaving the rest live while
   142	   * printing "released". Verified on a CRLF lane. Clever beats readable right up
   143	   * until it silently half-works on the operation other agents act on. */
   144	  const eol = src.includes('\r\n') ? '\r\n' : '\n';
   145	  const lines = header.split(/\r?\n/);
   146	  const head = lines.findIndex((l) => /^#{1,6}\s.*EDITING NOW/i.test(l));
   147	  let removed = 0;
   148	  if (head !== -1) {
   149	    let end = head + 1;
   150	    while (end < lines.length && (lines[end].trim() === '' || lines[end].trim().startsWith('- '))) {
   151	      if (lines[end].trim().startsWith('- ')) removed += 1;
   152	      end += 1;
   153	    }
   154	    lines.splice(head + 1, end - (head + 1), '- (released)', '');
   155	  }
   156	  const cleared = lines.join(eol);
   157	  const leftover = cleared.split(/\r?\n/)
   158	    .slice(head + 1, head + 1 + removed + 2)
   159	    .filter((l) => l.trim().startsWith('- ') && !/\(released\)/.test(l));
   160	  if (head === -1 || leftover.length) {
   161	    console.error('[lane] WARNING: lock list may not have cleared — verify the lane file by hand.');
   162	  }
   163	  if (statSync(LANE_PATH).mtimeMs !== mtimeAtRead) {
   164	    console.error('[lane] ABORTED release: the lane changed while I was reading it — a concurrent');
   165	    console.error('[lane] claim would have been erased. Nothing written. Re-run to release.');
   166	    process.exit(3);
   167	  }
   168	  atomicWrite(LANE_PATH, `${cleared}\nOutcome: ${flag('outcome', '—')}\n`);
   169	  logActivity(`${new Date().toISOString()} RELEASE ${ME.agent}@${ME.slug} :: ${flag('outcome', '—')} :: delivery=${d.state}`);
   170	  console.log(`[lane] released. delivery: ${d.state}`);
   171	}
   172	
   173	/* ── DELTA digest — capped. A digest that reports EVERYTHING trains readers to
   174	 * skim NOTHING; because it never blocks it would not be removed, it would be
   175	 * ignored, which fails silently while everyone believes orientation happened. */
   176	function digest() {
   177	  const lanes = readLanes(LEDGER, ME.laneName);
   178	  const live = lanes.filter((l) => !l.self && l.ageMin <= FRESH_MIN && l.locks.length);
   179	  const staleCount = lanes.filter((l) => !l.self && l.ageMin > FRESH_MIN && l.locks.length).length;
   180	  const d = deliveryState();
   181	  if (JSON_MODE) {
   182	    console.log(JSON.stringify({ ledger: LEDGER, me: ME.laneName, delivery: d, live, staleCount }, null, 2));
   183	    return;
   184	  }
   185	  const out = [
   186	    `[lane] ledger ${LEDGER}`,
   187	    `[lane] me: ${ME.agent}@${ME.slug} · branch ${d.branch} · delivery ${d.state}${d.unpushed ? ` · ${d.unpushed} UNPUSHED` : ''}`,
   188	  ];
   189	  if (!existsSync(LANE_PATH)) {
   190	    out.push('[lane] ⚠ you have NOT published a lane this session — run: node scripts/lane.mjs claim --task "..." --files "..."');
   191	  }
   192	  if (live.length) {
   193	    out.push(`[lane] ${live.length} agent(s) hold locks right now — DO NOT edit these:`);
   194	    for (const l of live.slice(0, 6)) {
   195	      out.push(`   ${l.file.replace('.lane.md', '')} (${l.ageMin}m ago) — ${l.task}`);
   196	      for (const f of l.locks.slice(0, 5)) out.push(`      🔒 ${f}`);
   197	      if (l.locks.length > 5) out.push(`      … +${l.locks.length - 5} more`);
   198	    }
   199	    if (live.length > 6) out.push(`   … +${live.length - 6} more live lane(s)`);
   200	  } else {
   201	    out.push('[lane] no fresh locks held by other agents.');
   202	  }
   203	  if (staleCount) {
   204	    out.push(`[lane] ${staleCount} stale lane(s) still holding locks (>${FRESH_MIN}m) — advisory; never silently seize (R5). \`node scripts/lane.mjs doctor\``);
   205	  }
   206	  console.log(out.join('\n'));
   207	}
   208	
   209	/* ── Hygiene — REPORTS ONLY. Rule 34 forbids auto-deletion. ─────────────────── */
   210	function doctor() {
   211	  const lanes = readLanes(LEDGER, ME.laneName);
   212	  const orphans = [];
   213	  for (const line of (sh('git worktree list --porcelain') ?? '').split('\n')) {
   214	    if (!line.startsWith('worktree ')) continue;
   215	    const dir = normPath(line.slice(9).trim());
   216	    const dirLedger = resolve(dir, '.ai-workflow', 'coordination');
   217	    if (samePath(dirLedger, LEDGER) || !existsSync(dirLedger)) continue;
   218	    const strays = readdirSync(dirLedger).filter((f) => f.endsWith('.lane.md') || f === 'review-queue.md');
   219	    if (strays.length) orphans.push({ dir, strays });
   220	  }
   221	  const rot = existsSync(LEDGER)
   222	    ? readdirSync(LEDGER)
   223	      .filter((f) => !f.endsWith('.lane.md') && f !== 'README.md')
   224	      .map((f) => ({ f, kb: Math.round(statSync(resolve(LEDGER, f)).size / 1024) }))
   225	      .filter((x) => x.kb > 128 || /\.tmp-\d+$/.test(x.f))
   226	    : [];
   227	  if (JSON_MODE) { console.log(JSON.stringify({ ledger: LEDGER, orphans, rot, lanes }, null, 2)); return; }
   228	  console.log(`[lane doctor] canonical ledger: ${LEDGER}`);
   229	  console.log(`[lane doctor] lanes present: ${lanes.length}`);
   230	  if (orphans.length) {
   231	    console.log(`[lane doctor] ⚠ ${orphans.length} ORPHANED worktree-local ledger(s) — published where no agent reads (report only, never auto-deleted):`);
   232	    for (const o of orphans) console.log(`   ${o.dir} :: ${o.strays.join(', ')}`);
   233	  } else console.log('[lane doctor] no orphaned worktree ledgers.');
   234	  for (const r of rot) console.log(`[lane doctor] ⚠ ledger artifact: ${r.f} (${r.kb} KB) — candidate for prune, pending approval.`);
   235	}
   236	
   237	const COMMANDS = { claim, release, digest, doctor, whoami: () => console.log(`${ME.agent}@${ME.slug} → ${LANE_PATH}`) };
   238	if (!COMMANDS[CMD]) {
   239	  // A typo used to fall through to `digest` and exit 0 — the agent believed it had
   240	  // published a claim nobody could see. Silent failure on the primary write path.
   241	  console.error(`[lane] unknown subcommand '${CMD}'. Expected: ${Object.keys(COMMANDS).join(' | ')}`);
   242	  process.exit(4);
   243	}
   244	COMMANDS[CMD]();```

---

## `scripts/hooks/push-blast-radius.mjs` (159 lines)

```javascript
     1	#!/usr/bin/env node
     2	/**
     3	 * push-blast-radius.mjs — PreToolUse advisory on `git push` (Rule 67 v2.1)
     4	 * ========================================================================
     5	 * THE GAP: on this repo a push is not a publish, it is a DEPLOY AND A MIGRATION
     6	 * RUN — `render.yaml` builds with `cd backend && npm install && npm run
     7	 * migrate:production`. On 2026-08-11 an agent came within one command of executing
     8	 * an unreviewed production schema change as a side effect of publishing a document.
     9	 * The existing db-blast-radius gate matches migration RUNNER commands; it has never
    10	 * seen a push.
    11	 *
    12	 * ADVISORY, NEVER BLOCKING — both design reviewers, independently: "migration+main
    13	 * => block" is too broad (migrations are the normal deploy path, so it trains
    14	 * rubber-stamping or blocks deploys until someone routes around via `gh`) and too
    15	 * narrow (`gh pr merge`, the API, force-push and tag releases do the same
    16	 * irreversible thing without matching `git push`). So this is early-warning UX.
    17	 * Real enforcement is server-side branch protection on `main`.
    18	 *
    19	 * Because its whole value is being rare enough to still be read, every false
    20	 * positive is a real cost. v2.1 fixed four of them found in review.
    21	 *
    22	 * Contract: stdin = { tool_name, tool_input }. ALWAYS exit 0. Fail-open on throw.
    23	 */
    24	import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
    25	import { resolve } from 'node:path';
    26	import { FRESH_MIN, sh, ledgerDir, identity, safeRef, parseLane, lockMatches } from '../lib/lane-core.mjs';
    27	
    28	/** Paths automation EXECUTES on deploy — enumerated from render.yaml and CI reality,
    29	 *  not just `backend/migrations/**`, which was the narrow predicate reviewers rejected. */
    30	const EXECUTES_ON_PUSH = [
    31	  { re: /^backend\/migrations\//i, what: 'DB migration — runs against PRODUCTION on deploy' },
    32	  { re: /^(backend\/)?seeders\//i, what: 'seeder — may mutate production rows' },
    33	  { re: /\.sql$/i, what: 'raw SQL' },
    34	  { re: /^render\.yaml$/i, what: 'deploy manifest — changes the build/migrate command itself' },
    35	  { re: /(^|\/)package\.json$/i, what: 'package.json — postinstall/engines run at build' },
    36	  { re: /(^|\/)(package-lock\.json|yarn\.lock|pnpm-lock\.yaml)$/i, what: 'lockfile — repoints what npm install executes at build' },
    37	  { re: /(^|\/)\.npmrc$/i, what: '.npmrc — controls the registry npm install pulls from' },
    38	  { re: /^\.github\/workflows\//i, what: 'CI workflow — executes on push' },
    39	  { re: /(^|\/)Dockerfile$/i, what: 'container build' },
    40	];
    41	
    42	function main() {
    43	  let payload;
    44	  try { payload = JSON.parse(readFileSync(0, 'utf8')); } catch { return; }
    45	  if ((payload?.tool_name || '') !== 'Bash') return;
    46	  const cmd = String(payload.tool_input?.command || '');
    47	
    48	  /* Strip quoted strings BEFORE any matching. `git commit -m "fix: push handling"`
    49	   * fired this advisory — verified false positive. Handles escaped quotes, which the
    50	   * first version did not. ALL later regexes run on `bare`, not `cmd`: the force-push
    51	   * test used to run on the raw string and flagged `git commit -m "try -f first"`. */
    52	  const bare = cmd
    53	    .replace(/"(?:[^"\\]|\\.)*"/g, '""')
    54	    .replace(/'(?:[^'\\]|\\.)*'/g, "''");
    55	
    56	  /* `push` must be the git SUBCOMMAND, not merely a later word: `git config
    57	   * push.default simple` and `git log --grep=push` both fired the old pattern.
    58	   * Case-insensitive because cmd.exe happily runs `GIT PUSH`. */
    59	  if (!/\bgit\b(?:\s+(?:-[A-Za-z-]+|--[a-z-]+=\S+|-C\s+\S+|-c\s+\S+))*\s+push\b/i.test(bare)) return;
    60	
    61	  const branch = sh('git rev-parse --abbrev-ref HEAD');
    62	  const ref = safeRef(branch || '');
    63	  /* `-f` combined into a cluster (`-uf`, `-fv`) was undetected. */
    64	  const forced = /--force(?!-with-lease)\b|(?:^|\s)-[A-Za-z]*f[A-Za-z]*(?:\s|$)/i.test(bare);
    65	  const leased = /--force-with-lease/i.test(bare);
    66	  /* Token-exact: `\b(main)\b` flagged `feature/main-fix` and `production-notes`,
    67	   * because `-` and `/` are non-word chars. Match whole ref tokens only. */
    68	  const targetsDeployRef = /(?:^|[\s:])(?:origin\/)?(main|master|production)(?:\s|$)/i.test(bare)
    69	    || ['main', 'master', 'production'].includes(branch || '');
    70	
    71	  /* An explicit refspec, --all, or a tag push means the range below (which is
    72	   * HEAD-based) is NOT what is being pushed. Disclose rather than mislead. */
    73	  /* PreToolUse fires BEFORE the command runs, so every fact below describes the
    74	   * CURRENT branch. `git checkout main && git push` — a routine compound command —
    75	   * would be analysed against the feature branch: not deploy-linked, wrong diff,
    76	   * reassuring silence on a push to main. Detect the switch and say the analysis
    77	   * cannot be trusted. */
    78	  const switchesBranch = /\b(checkout|switch|merge|reset|rebase)\b[\s\S]*\bpush\b/i.test(bare);
    79	  const explicitRefspec = /\s\S+:\S+/.test(bare) || /\s--all\b|\s--tags\b|\s--mirror\b/i.test(bare);
    80	
    81	  let changed = null;
    82	  let rangeNote = '';
    83	  if (ref) {
    84	    const remoteRef = sh(`git rev-parse --verify --quiet origin/${ref}`) ? `origin/${ref}` : 'origin/main';
    85	    /* sh() returns NULL on failure and '' on empty. Conflating them made this
    86	     * fail-open: a failed `git diff` looked like "nothing to push" and the hook
    87	     * returned silently on a migration push. */
    88	    const raw = sh(`git diff --name-only ${remoteRef}...HEAD`);
    89	    if (raw === null) rangeNote = `⚠ could not compute the diff against ${remoteRef} — this check did NOT run.`;
    90	    else changed = raw.split('\n').filter(Boolean);
    91	  } else {
    92	    rangeNote = '⚠ could not resolve a safe branch name — file-level checks did NOT run.';
    93	  }
    94	
    95	  const hits = [];
    96	  for (const f of changed ?? []) for (const p of EXECUTES_ON_PUSH) if (p.re.test(f)) hits.push({ f, what: p.what });
    97	
    98	  /* Files another LIVE session has locked (advisory, Rule 67 R6). */
    99	  const lockClash = [];
   100	  try {
   101	    const ledger = ledgerDir();
   102	    const mine = identity().laneName; // exact session lane — NOT the agent-name prefix
   103	    if (ledger && existsSync(ledger) && changed?.length) {
   104	      for (const file of readdirSync(ledger).filter((x) => x.endsWith('.lane.md'))) {
   105	        if (file === mine) continue;
   106	        const p = resolve(ledger, file);
   107	        if ((Date.now() - statSync(p).mtimeMs) / 60000 > FRESH_MIN) continue;
   108	        for (const lock of parseLane(readFileSync(p, 'utf8'), resolve(ledger, '..', '..')).locks) {
   109	          if (changed.some((c) => lockMatches(c, lock))) {
   110	            lockClash.push(`${file.replace('.lane.md', '')} :: ${lock}`);
   111	          }
   112	        }
   113	      }
   114	    }
   115	  } catch { /* advisory only */ }
   116	
   117	  if (!hits.length && !forced && !leased && !lockClash.length && !rangeNote && !explicitRefspec && !switchesBranch) return;
   118	
   119	  const out = ['⚠ PUSH BLAST RADIUS — read before you confirm this push.', ''];
   120	  out.push(`branch: ${branch || '(unknown)'}${targetsDeployRef ? '   ⚠ DEPLOY-LINKED' : ''}`);
   121	  if (rangeNote) out.push(`🟠 ${rangeNote}  Treat the file list below as INCOMPLETE.`);
   122	  if (switchesBranch) {
   123	    out.push('🟠 this command changes branch before pushing. Everything below describes the');
   124	    out.push('   CURRENT branch, not the one that will be pushed. Treat it as UNVERIFIED.');
   125	  }
   126	  if (explicitRefspec) {
   127	    out.push('🟠 this push names an explicit refspec / --all / --tags. The file list below is');
   128	    out.push('   computed from HEAD and may describe DIFFERENT commits than the ones pushed.');
   129	  }
   130	  if (forced) out.push("🔴 FORCE PUSH without --force-with-lease — can destroy another agent's pushed commits.");
   131	  else if (leased) out.push('🟠 force-with-lease — history rewrite; safe only if you know what the remote holds.');
   132	  if (hits.length) {
   133	    out.push('', `🔴 ${hits.length} file(s) in this range are EXECUTED by automation on deploy:`);
   134	    for (const h of hits.slice(0, 12)) out.push(`   ${h.f}  → ${h.what}`);
   135	    if (hits.length > 12) out.push(`   … +${hits.length - 12} more`);
   136	    if (targetsDeployRef && hits.some((h) => /migration|seeder|SQL/i.test(h.what))) {
   137	      out.push('', '   render.yaml runs `npm run migrate:production` in the build.');
   138	      out.push('   Pushing this to a deploy-linked branch RUNS THESE AGAINST PRODUCTION.');
   139	      out.push('   Split the batch by blast radius: push the reversible commits now, hold the');
   140	      out.push("   schema commits for review and Sean's approval.");
   141	    }
   142	  }
   143	  if (lockClash.length) {
   144	    out.push('', '🟠 this push carries file(s) another LIVE session has locked (R6):');
   145	    for (const c of lockClash.slice(0, 8)) out.push(`   ${c}`);
   146	  }
   147	  out.push('', 'Advisory only — nothing is blocked. Real enforcement is branch protection on main.');
   148	  console.error(out.join('\n'));
   149	}
   150	
   151	try {
   152	  main();
   153	} catch (err) {
   154	  /* Fail-OPEN so this hook can never break a push — but not fail-SILENT. A thrown
   155	   * bug used to exit 0 with no output, indistinguishable from "nothing to warn
   156	   * about", which is the reports-success-while-doing-nothing class this whole
   157	   * system exists to kill. */
   158	  console.error(`⚠ push blast-radius check FAILED to run (${err?.code || err?.message}) — this push is UNCHECKED.`);
   159	}
   160	process.exit(0);```

---

## `scripts/hooks/lane-session-start.mjs` (43 lines)

```javascript
     1	#!/usr/bin/env node
     2	/**
     3	 * lane-session-start.mjs — SessionStart orientation for the Coordination Ledger
     4	 * =============================================================================
     5	 * Prints the DELTA digest (who holds locks right now, my delivery state) so an
     6	 * agent is oriented before its first edit. Never blocks.
     7	 *
     8	 * v2.1 — the first version ran `execSync('node scripts/lane.mjs digest')`, which
     9	 * only resolves when the session's cwd happens to be the repo root. A session
    10	 * started in `backend/` got ENOENT, the catch swallowed it, and NOTHING printed
    11	 * (verified: running this from `backend/` produced zero output). That is exactly
    12	 * the failure this hook exists to prevent — orientation believed, not happening.
    13	 * The script path now resolves from THIS FILE's location, so cwd is irrelevant.
    14	 *
    15	 * Delegates to lane.mjs so there is one implementation of ledger truth.
    16	 * Fail-open on any error, but not fail-SILENT: a broken guard says so.
    17	 */
    18	import { execFileSync } from 'node:child_process';
    19	import { fileURLToPath } from 'node:url';
    20	import { dirname, resolve } from 'node:path';
    21	import { existsSync } from 'node:fs';
    22	
    23	const HERE = dirname(fileURLToPath(import.meta.url));
    24	const LANE = resolve(HERE, '..', 'lane.mjs');
    25	
    26	try {
    27	  if (!existsSync(LANE)) {
    28	    console.log(`[lane] orientation unavailable — ${LANE} not found.`);
    29	  } else {
    30	    const out = execFileSync(process.execPath, [LANE, 'digest'], {
    31	      encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 10_000,
    32	    }).trim();
    33	    if (out) {
    34	      console.log(out);
    35	      console.log('[lane] claim before your first edit: node scripts/lane.mjs claim --task "<one line>" --files "a,b"');
    36	    }
    37	  }
    38	} catch (err) {
    39	  // Say so rather than vanish — a silent orientation hook is indistinguishable
    40	  // from a healthy one, which is how the ledger went unread for weeks.
    41	  console.log(`[lane] orientation check failed (${err.code || err.message}) — run \`node scripts/lane.mjs digest\` manually.`);
    42	}
    43	process.exit(0);
```

---

## `.claude/skills/agent-lane/SKILL.md` — NEVER REVIEWED

```markdown
---
name: agent-lane
description: The cross-agent coordination protocol — how parallel AI agents (Claude sessions, Codex, Fable, cloud agents) working the same SwanStudios repo publish what they are doing so they do not step on each other, delete each other's work, sweep each other's files into a commit, or push a dirty/irreversible batch to production. Fires at session start via the lane-session-start hook; also use when Sean says "who else is working", "claim these files", "what's in flight", "is anyone editing X", "/agent-lane", or before any push to a deploy-linked branch. Carries the ledger commands, the delivery-state vocabulary (committed is not delivered), and the push blast-radius checklist.
---

# Agent Lane — the coordination protocol for parallel agents

> Rule 67 v2. Rebuilt 2026-08-11 after a hostile review by **Kimi K3** and **Tencent HY3**
> demolished v1 *and* my first proposed fix. Read §6 before you "improve" this — several
> obvious upgrades are actively harmful and were rejected with reasons.

## 1. What this is for

Many agents work this repo at once, across ~184 git worktrees. They collide in four ways,
in increasing order of cost:

1. **Two agents edit the same file** → one silently overwrites the other.
2. **One commit sweeps another's WIP** → happened: 63 files.
3. **One agent builds on a phantom** → Agent A deletes a service (unpushed); Agent B keeps
   writing code that depends on it, or reviews it approvingly. The cost is the rewrite.
4. **One agent pushes an irreversible batch** → on this repo `render.yaml` builds with
   `npm run migrate:production`, so **a push to a deploy-linked branch runs migrations
   against the production database.**

The mitigation is **broadcast, not exclusion**. The reviewed evidence is unambiguous: the
ledger's proven wins have all come from *visibility* — nine review findings, a self-corrected
error, four schema columns caught while still cheap. No lock has ever prevented a collision.
So: publish early, read before you edit, and treat locks as advisory hints.

## 2. The three commands

```bash
node scripts/lane.mjs digest      # who holds locks NOW + my delivery state (runs at session start)
node scripts/lane.mjs claim  --task "<one line>" --files "a.tsx,b.mjs" [--next "..."] [--notes "..."]
node scripts/lane.mjs release --outcome "<one line>"
node scripts/lane.mjs doctor      # hygiene: orphaned ledgers, oversized artifacts (report only)
```

**Claim before your first edit. Release when the slice ends.** If you learn mid-slice that
you must touch a file you did not claim, re-run `claim` with the fuller list — a claim is
cheap and a stale claim is a lie.

## 3. Identity: one lane per SESSION, never per agent name

Your lane file is `<agent>--<worktree>-<hash>.lane.md` (e.g.
`vs-claude--ss-creator-local-video-a71588.lane.md`); the main tree is just
`<agent>--main.lane.md`. The hash is six characters of the worktree's full path — with 184
worktrees, two checkouts whose directories share a basename would otherwise write the same
lane file and overwrite each other, and a linked worktree named `main` would collide with
the main tree. All identity and lane parsing lives in one place, `scripts/lib/lane-core.mjs`;
three drifted copies of that logic was itself a defect (one had silently dropped an env var,
so the push hook warned agents about their own locks).

This matters more than it looks. v1 used a bare `claude.lane.md`. With several Claude
sessions running at once that is **last-writer-wins**: one session's claim silently erases
another's, and the surviving file reads as authoritative. An agent then checks the ledger,
sees a file "free", and edits it while a live session holds it. Both reviewers independently
called that class of bug the worst in the catalog — *a false-negative collision detector* —
because unlike a missing ledger, it looks like success.

**Never write another session's lane file** (R4). You read theirs; you write only yours.

## 4. The ledger is ONE directory, reachable from every worktree

`<git-common-dir>/../.ai-workflow/coordination/` — resolved with
`git rev-parse --path-format=absolute --git-common-dir`, which returns the *main* repo's
`.git` even from a linked worktree.

v1 resolved it from `process.cwd()`. With 184 worktrees that forked the ledger silently:
**eight worktrees held their own private coordination folders containing nine published lane
files that no other agent could ever read**, the oldest from 2026-07-14. Coordination was
believed, and void. That is the same disease as the incident that prompted this work —
finished work placed where its reader does not look.

`node scripts/lane.mjs doctor` lists those orphans. It **never deletes them** (Rule 34);
merging them forward would mean writing other agents' lanes and importing phantom locks from
dead sessions, which R4 and R5 both forbid. Report to Sean; let him decide.

## 5. Committed is not delivered

The lane's `Delivery:` field is **computed from git on every read**, never asserted by you:

| state | meaning |
|---|---|
| `local-commit` | committed on a branch that is not on the remote, or has unpushed commits. **Invisible to every other agent and to Hermes.** |
| `pushed-branch` | on the remote, not merged. Visible to off-machine agents. Not live. |
| `merged-to-main` | actually delivered — it exists where its readers look. |

An artifact is delivered only when it exists **where its reader looks**. A branch, a
gitignored directory, an unmerged worktree and a local file are all places where finished
work goes to be invisible. Before you say a thing is done, check which of the three states
it is in — and say that state out loud.

## 6. Before you push — the blast-radius checklist

`scripts/hooks/push-blast-radius.mjs` prints this automatically on any `git push`. It is
**advisory and never blocks.** Read it anyway:

- **What else does this push do?** On this repo a push is a deploy *and* a migration run.
  "I am only committing docs" is a statement about the diff, not about the consequences of
  merging it.
- **Does the range touch anything automation executes?** migrations, seeders, `*.sql`,
  `render.yaml`, `package.json`, CI workflows, Dockerfile.
- **Is the batch mixed?** When a batch mixes reversible and irreversible work, **split it.**
  Push the safe half now; hold the risky half for review. The safe half should never wait on
  the risky half's review, and the risky half should never ride the safe half's momentum.
- **Does it carry a file another live session has locked?** Stage explicit paths.
  `git add -A` is forbidden while another lane holds a lock.
- **Force-push?** `--force` without `--force-with-lease` can destroy another agent's pushed
  commits.

**The local hook is early warning, not enforcement.** It only sees `git push` typed into a
hooked shell — it is blind to `gh pr merge`, the GitHub API, and any agent not on this
machine. The only control that covers every actor is **server-side branch protection on
`main`** (PR required, status checks, no direct pushes). Both reviewers ranked that the
single highest-value change available. It is Sean's to enable; until he does, this hook is
the only thing standing between an agent and an unreviewed production schema change.

## 7. Mutual hostile review (the highest-value review available, and it is free)

Finishing a substantial slice → append a request to `review-queue.md`; the other agent
returns `APPROVE | REVISE | REJECT` + findings. This has repeatedly caught what the author
could not see. Publish your lane **early** — they cannot correct what they cannot see, and a
deletion that sits unpublished for hours is a deletion other agents keep building on.

## 8. Deliberately NOT built (rejected with reasons — do not add these)

- **A Stop-hook "lane freshness" gate.** Both reviewers named this the single thing not to
  build. It keys on file *count* (uncorrelated with risk — a one-line `render.yaml` edit is
  the most dangerous change in the repo; a 20-file docs sweep is harmless), it fires *after*
  the writes so it prevents nothing, and any escape hatch it ships is model-writable, so
  within a week `LANE: N/A — routine` becomes a reflex and the hook gets deleted. You would
  then believe coordination is enforced when it is not — worse than knowing it is not.
- **A committed `DELIVERY-LOG.md`.** `git log origin/main` already *is* the delivery log:
  computed, not asserted, with SHAs that cannot be hallucinated. A tracked shared file
  reintroduces exactly the merge-conflict surface the gitignore rationale correctly avoided
  (the 220 KB `review-queue.md.orig` rotting in the ledger is the in-repo proof), and it
  recurses into this document's own lesson — a delivery log is itself undelivered until pushed.
- **Blocking pushes locally on "migration + main".** Too broad (migrations are the normal
  deploy path → approval theater or blocked deploys → bypass via `gh`) and too narrow (misses
  force-push, tags, branch deploys, `gh pr merge`, the API, cloud agents).
- **Auto-merging orphaned worktree ledgers.** Violates R4 by construction and imports phantom
  locks from dead sessions.

## 9. Known gaps this system still does NOT catch

State these honestly rather than implying coverage:

- **Semantic collisions.** Agent A renames a function; Agent B writes a caller for the old
  name in a different file. No file overlap, both compliant, breaks at integration.
- **Migration version collisions.** Two branches each add a migration; each passes its own
  tests; order against the production DB is decided at deploy time.
- **Off-machine agents.** The live ledger is gitignored and local. A cloud agent cannot read
  it — and local hooks do not constrain it either. The actors with the least visibility have
  the fewest gates. Branch protection is the only control that reaches them.
- **TOCTOU.** Two agents can both read "file free" in the same second. There is no mutex.
- **Sean is an unnamed agent.** He edits files too, and publishes no lane.
- **Stale locks.** A crashed session leaves locks behind. R5: flag, never silently seize.
- **Freshness is advisory, not proof.** Lane age comes from file mtime rather than the
  agent-authored `Updated:` line, because prose is easy to get wrong by accident. mtime is
  not unforgeable — `touch` exists, and releasing a lane bumps it — so treat "LIVE" as a
  hint, never as evidence that someone is actually at the keyboard.
- **The push advisory reads HEAD.** For an explicit refspec, `--all`, or a tag push it says
  so and tells you the file list may describe different commits; it does not parse refspecs.
- **`gh pr merge`, the GitHub API, and off-machine agents bypass every hook here.** Only
  branch protection reaches them.
```

---

## `.claude/settings.json` hooks block — NEVER REVIEWED

```json
{
  "UserPromptSubmit": [
    {
      "hooks": [
        {
          "type": "command",
          "command": "node scripts/hooks/prompt-watcher.mjs"
        }
      ]
    }
  ],
  "PreToolUse": [
    {
      "matcher": "Bash",
      "hooks": [
        {
          "type": "command",
          "command": "node scripts/hooks/push-blast-radius.mjs",
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
          "command": "node scripts/hooks/hermes-inbox-reminder.mjs"
        },
        {
          "type": "command",
          "command": "node scripts/hooks/lane-session-start.mjs",
          "timeout": 15
        }
      ]
    }
  ],
  "Stop": [
    {
      "hooks": [
        {
          "type": "command",
          "command": "node scripts/hooks/hermes-closeout-gate.mjs",
          "timeout": 30
        },
        {
          "type": "command",
          "command": "node scripts/hooks/dry-loop-gate.mjs",
          "timeout": 30
        },
        {
          "type": "command",
          "command": "node scripts/hooks/linear-sync-gate.mjs",
          "timeout": 30
        },
        {
          "type": "command",
          "command": "node scripts/hooks/dual-tier-gate.mjs",
          "timeout": 30
        },
        {
          "type": "command",
          "command": "node scripts/hooks/backup-after-work.mjs",
          "timeout": 15
        },
        {
          "type": "command",
          "command": "node scripts/hooks/lesson-recall-gate.mjs",
          "timeout": 30
        }
      ]
    }
  ]
}
```

# Final hostile-review packet — Coordination Ledger v2.2 + worktree prune

**Reviewers:** Kimi K3, Tencent HY3 (one pass each) · **Commit:** 389ddc10c · **PR:** #36

This system is FINISHED and about to be merged to `main`, which triggers a production deploy.
This is the last gate. Two prior reviews already ran — a design pass and an implementation
pass — and their findings are ALREADY FIXED. Do not re-litigate settled design:
session-namespaced lanes, advisory-not-blocking gates, no Stop-hook freshness gate, no
committed delivery log, branch protection as the real control. **Attack the CODE AS IT NOW
STANDS, and the destructive operation that was already executed against the machine.**

## Context you need

- Windows 11, Git Bash, Node ESM. Paths mix `C:/` and `/c/`. Some files CRLF.
- ~110 git worktrees on one repo; several AI agents work it concurrently.
- The ledger dir is gitignored and lives at `<git-common-dir>/../.ai-workflow/coordination/`.
- Hook contract: stdin `{tool_name, tool_input}`; exit 0 = allow. Hooks must never break a push.
- `render.yaml` buildCommand runs `npm run migrate:production` — a push to a deploy-linked
  branch runs migrations against the production database.
- **Already executed, irreversibly:** 79 of 187 worktrees removed by `prune-worktrees.mjs`
  (included below). If that script had a flaw, damage is already done — say so plainly and
  say how to detect it now.

## Three parsing defects were found in `parseLane`'s neighbourhood in one day
1. `release()` cleared only the FIRST lock (`$` under `/m` = end-of-line).
2. `parseLane` returned 1 lock for a lane holding 186 (same `$`-under-`/m` bug).
3. Prose bullets inside a lock list rendered as locks (false locks).
**Assume there is a fourth.** The parser and its consumers are the primary attack surface.

## Your remit
1. **Is there a fourth parsing/consumer defect?** Over-report, under-report, or wrong-entry.
2. **`prune-worktrees.mjs` — was the executed operation actually safe?** What could it have
   destroyed that nobody would notice? How would we detect that now, after the fact?
3. **Concurrency.** Multiple agents claim/release/read simultaneously; the ledger is plain
   files on one filesystem. Where is the remaining race?
4. **The push advisory.** False positives that would get it disabled; false negatives that
   would let an irreversible push through silently.
5. **Anything that reports success while doing nothing** — the failure class that started all
   of this.
6. **Merge risk.** This is about to land on `main` and deploy. What should block the merge?

Rank by cost x likelihood. Cite file + line. No praise. If it is fine, say nothing about it.

---

## `scripts/lib/lane-core.mjs` (163 lines)

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
    24	/** Run git. Returns null on failure — NEVER '' — so callers can distinguish
    25	 *  "empty result" from "command failed". Conflating those made the push hook
    26	 *  fail-open: a failed `git diff` produced an empty file list and the guard
    27	 *  returned silently on a migration push. */
    28	export const sh = (cmd, cwd = process.cwd()) => {
    29	  try {
    30	    return execSync(cmd, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    31	  } catch {
    32	    return null;
    33	  }
    34	};
    35	
    36	/** Normalize a path for Windows reality: backslashes → forward, and MSYS/Git-Bash
    37	 *  `/c/foo` → `C:/foo`. Node's resolve() treats `/c/repo/.git` as drive-relative and
    38	 *  would silently invent `C:\c\repo\...` — a phantom ledger that mkdirSync would
    39	 *  happily CREATE, resurrecting the v1 fork via path form instead of cwd.
    40	 *  (Git returns the `C:/` form on this machine; this is belt-and-braces for other
    41	 *  git builds, and it costs nothing.) */
    42	export function normPath(p) {
    43	  if (!p) return p;
    44	  let s = String(p).replace(/\\/g, '/');
    45	  const msys = s.match(/^\/([a-zA-Z])\/(.*)$/);
    46	  if (msys) s = `${msys[1].toUpperCase()}:/${msys[2]}`;
    47	  return s;
    48	}
    49	
    50	/** Case- and separator-insensitive path identity. Windows filesystems are
    51	 *  case-insensitive, so a raw `===` between two git outputs decided session
    52	 *  identity and could flip IS_MAIN on nothing but shell invocation casing. */
    53	export const samePath = (a, b) => normPath(resolve(normPath(a || ''))).toLowerCase()
    54	  === normPath(resolve(normPath(b || ''))).toLowerCase();
    55	
    56	/** The canonical ledger directory — identical from every worktree, or null. */
    57	export function ledgerDir(cwd = process.cwd()) {
    58	  const common = sh('git rev-parse --path-format=absolute --git-common-dir', cwd)
    59	    ?? sh('git rev-parse --git-common-dir', cwd);
    60	  if (!common) return null;
    61	  return normPath(resolve(normPath(common), '..', '.ai-workflow', 'coordination'));
    62	}
    63	
    64	/** Who am I? Identity is agent + worktree, and the worktree part carries a short
    65	 *  hash of the FULL path: with 184 worktrees, two checkouts whose directories are
    66	 *  both named `repo` produced the same lane file and overwrote each other — the
    67	 *  exact last-writer-wins regression this rebuild exists to prevent. A linked
    68	 *  worktree literally named `main` collided with the main tree the same way. */
    69	export function identity(cwd = process.cwd()) {
    70	  const agent = process.env.SWAN_AGENT_SURFACE || process.env.CLAUDE_AGENT || 'vs-claude';
    71	  const top = sh('git rev-parse --show-toplevel', cwd);
    72	  const ledger = ledgerDir(cwd);
    73	  const mainTree = ledger ? resolve(ledger, '..', '..') : null;
    74	  const isMain = Boolean(top && mainTree && samePath(top, mainTree));
    75	  let slug = 'main';
    76	  if (!isMain) {
    77	    const full = normPath(top || cwd);
    78	    const short = createHash('sha1').update(full.toLowerCase()).digest('hex').slice(0, 6);
    79	    slug = `${basename(full)}-${short}`;
    80	  }
    81	  return { agent, top: normPath(top || cwd), isMain, slug, laneName: `${agent}--${slug}.lane.md` };
    82	}
    83	
    84	/** Git refnames may legally contain `$ ( ) ; \`` — all shell-active. Refuse to
    85	 *  interpolate anything outside a conservative safe set rather than hand it to a
    86	 *  shell. Returns null when the ref is not provably safe. */
    87	export function safeRef(ref) {
    88	  return typeof ref === 'string' && /^[A-Za-z0-9._\/-]{1,255}$/.test(ref) && !ref.includes('..')
    89	    ? ref
    90	    : null;
    91	}
    92	
    93	/** Parse one lane file's body. CRLF-tolerant everywhere: these files are written
    94	 *  by tools AND edited by hand, and a bare-\n assumption silently no-ops. */
    95	export function parseLane(src) {
    96	  /* Line-wise, deliberately — TWICE now this logic was written as one clever regex
    97	   * and both times `$` inside a lookahead under the /m flag (where `$` means
    98	   * end-of-LINE, not end-of-string) made the lazy quantifier stop at the first
    99	   * newline. In release() that cleared one lock of three; here it returned ONE lock
   100	   * for a lane holding sixteen — a digest reporting a locked file as free, which is
   101	   * the false-negative collision detector this whole rebuild exists to prevent.
   102	   * Anchor on the HEADING, not the phrase: `Task: stop editing now buttons`
   103	   * precedes the heading in the claim template. */
   104	  const all = src.split(/\r?\n/);
   105	  const head = all.findIndex((l) => /^#{1,6}\s.*EDITING NOW/i.test(l));
   106	  const body = [];
   107	  if (head !== -1) {
   108	    for (let i = head + 1; i < all.length; i += 1) {
   109	      const t = all[i].trim();
   110	      if (/^#{1,6}\s/.test(t)) break;            // next heading ends the section
   111	      if (/^[A-Z][a-z]+ intent:/.test(t)) break; // "Next intent:" ends it
   112	      body.push(all[i]);
   113	    }
   114	  }
   115	  const locks = body.map((l) => l.trim())
   116	    // `\(` is load-bearing: release() writes `- (released)` and claim() writes
   117	    // `- (none declared yet)`. Without it a RELEASED lane renders under
   118	    // "DO NOT edit these" — a false lock, and false locks are what get a digest ignored.
   119	    .filter((l) => l.startsWith('- ') && !/^-\s*[`'"*]*\s*(nothing|none|_|\()/i.test(l))
   120	    .map((l) => l.replace(/^-\s*/, '').replace(/[`*]/g, '').trim())
   121	    .filter(Boolean)
   122	    /* Keep only the path token, and only if it LOOKS like a path. Agents write
   123	     * prose bullets inside the lock section ("- I work in an isolated worktree and
   124	     * rebase onto origin/main before each push,"), which rendered verbatim under
   125	     * "DO NOT edit these" — a false lock. False locks are precisely what train a
   126	     * reader to ignore the digest, and an entry that cannot match a file path
   127	     * cannot do a lock's job anyway. Trailing commentary is dropped:
   128	     * "docs/x.md (new, my worktree only)" → "docs/x.md". */
   129	    .map((l) => l.split(/\s+/)[0].replace(/[,;]$/, ''))
   130	    .filter((l) => /[/\\]/.test(l) || /\.[A-Za-z0-9]{1,6}$/.test(l))
   131	    .map((l) => l.slice(0, 120)); // lane files are untrusted input
   132	  const heads = [...src.matchAll(/^#{1,6}\s+(.+)$/gm)].map((h) => h[1].trim())
   133	    .filter((h) => !/EDITING NOW/i.test(h));
   134	  const task = (src.match(/^Task:\s*(.+)$/m) || [])[1]?.trim() || heads[0] || '(no task stated)';
   135	  return { locks, task: task.slice(0, 90) };
   136	}
   137	
   138	/** Every lane in the canonical ledger, with freshness from file mtime. */
   139	export function readLanes(ledger, selfName = null) {
   140	  if (!ledger || !existsSync(ledger)) return [];
   141	  return readdirSync(ledger).filter((f) => f.endsWith('.lane.md')).map((file) => {
   142	    const path = resolve(ledger, file);
   143	    const { locks, task } = parseLane(readFileSync(path, 'utf8'));
   144	    return {
   145	      file,
   146	      self: file === selfName,
   147	      ageMin: Math.round((Date.now() - statSync(path).mtimeMs) / 60000),
   148	      locks,
   149	      task,
   150	    };
   151	  });
   152	}
   153	
   154	/** Does a changed path fall under a declared lock? Both sides normalized, because
   155	 *  git emits forward-slash exact-case while a lane holds agent-authored prose that
   156	 *  may use backslashes or different casing. Supports `dir/**` and `dir/*`. */
   157	export function lockMatches(changedPath, lock) {
   158	  const c = normPath(changedPath).toLowerCase();
   159	  const raw = normPath(lock).toLowerCase().replace(/^["']|["']$/g, '');
   160	  const stem = raw.replace(/\/\*+.*$/, '').replace(/\/+$/, '');
   161	  if (!stem) return false;
   162	  return c === raw || c === stem || c.startsWith(`${stem}/`);
   163	}
```

---

## `scripts/lane.mjs` (225 lines)

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
    58	  const unpushed = Number(sh(`git rev-list --count ${onRemote ? `origin/${ref}` : 'origin/main'}..HEAD`) ?? 0) || 0;
    59	  let state = 'local-commit';
    60	  if (mergedMain) state = 'merged-to-main';
    61	  else if (onRemote && unpushed === 0) state = 'pushed-branch';
    62	  return { branch, state, unpushed, onRemote };
    63	}
    64	
    65	/* ── Writes ─────────────────────────────────────────────────────────────────── */
    66	function atomicWrite(path, body) {
    67	  const tmp = `${path}.tmp-${process.pid}`;
    68	  try {
    69	    writeFileSync(tmp, body, 'utf8');
    70	    renameSync(tmp, path); // atomic on same filesystem — no torn reads
    71	  } catch (err) {
    72	    // Windows renameSync throws EPERM/EEXIST when the destination is held open by
    73	    // antivirus, an indexer, or a concurrent reader. Retry once, then fail LOUDLY:
    74	    // a silently lost claim is a lane nobody can see, which is the whole bug class.
    75	    try {
    76	      renameSync(tmp, path);
    77	    } catch {
    78	      try { if (existsSync(tmp)) unlinkSync(tmp); } catch { /* leave no litter */ }
    79	      console.error(`[lane] FAILED to write ${path}: ${err.code || err.message}`);
    80	      console.error('[lane] your claim was NOT published — other agents cannot see it. Retry.');
    81	      process.exit(3);
    82	    }
    83	  }
    84	}
    85	
    86	const logActivity = (line) => {
    87	  try { appendFileSync(resolve(LEDGER, 'activity.log.md'), `${line}\n`, 'utf8'); } catch { /* non-fatal */ }
    88	};
    89	
    90	function claim() {
    91	  if (!existsSync(LEDGER)) mkdirSync(LEDGER, { recursive: true });
    92	  const task = flag('task', '(unstated)');
    93	  const files = flag('files').split(',').map((s) => s.trim()).filter(Boolean);
    94	  const d = deliveryState();
    95	  atomicWrite(LANE_PATH, `# ${ME.agent} — Live Lane (session: ${ME.slug})
    96	Updated: ${new Date().toISOString()}
    97	Status: in-progress
    98	Agent: ${ME.agent}
    99	Worktree: ${ME.top}${ME.isMain ? '  (MAIN TREE)' : ''}
   100	Branch: ${d.branch}
   101	Delivery: ${d.state}${d.unpushed ? ` (${d.unpushed} unpushed)` : ''}
   102	Task: ${task}
   103	
   104	## EDITING NOW
   105	${files.length ? files.map((f) => `- ${f}`).join('\n') : '- (none declared yet)'}
   106	
   107	Next intent: ${flag('next', '—')}
   108	Notes for other agents: ${flag('notes', '—')}
   109	`);
   110	  logActivity(`${new Date().toISOString()} CLAIM ${ME.agent}@${ME.slug} :: ${task} :: ${files.length} file(s)`);
   111	  console.log(`[lane] claimed → ${ME.laneName}\n[lane] ledger: ${LEDGER}\n[lane] delivery: ${d.state}`);
   112	}
   113	
   114	function release() {
   115	  if (!existsSync(LANE_PATH)) { console.log('[lane] no lane to release.'); return; }
   116	  const d = deliveryState();
   117	  const src = readFileSync(LANE_PATH, 'utf8');
   118	  // CRLF-tolerant. A bare-\n pattern silently no-ops on a hand-edited CRLF lane,
   119	  // leaving every lock in place while printing "released" — phantom locks for
   120	  // FRESH_MIN minutes on a file other agents act on.
   121	  const header = src
   122	    .replace(/^Status: .*$/m, 'Status: idle')
   123	    .replace(/^Updated: .*$/m, `Updated: ${new Date().toISOString()}`)
   124	    .replace(/^Delivery: .*$/m, `Delivery: ${d.state}${d.unpushed ? ` (${d.unpushed} unpushed)` : ''}`);
   125	
   126	  /* Line-wise, deliberately. The regex version used `$` inside a lookahead under
   127	   * the /m flag — where `$` means end-of-LINE — so the lazy quantifier stopped at
   128	   * the first newline and cleared only the FIRST lock, leaving the rest live while
   129	   * printing "released". Verified on a CRLF lane. Clever beats readable right up
   130	   * until it silently half-works on the operation other agents act on. */
   131	  const eol = src.includes('\r\n') ? '\r\n' : '\n';
   132	  const lines = header.split(/\r?\n/);
   133	  const head = lines.findIndex((l) => /^#{1,6}\s.*EDITING NOW/i.test(l));
   134	  let removed = 0;
   135	  if (head !== -1) {
   136	    let end = head + 1;
   137	    while (end < lines.length && (lines[end].trim() === '' || lines[end].trim().startsWith('- '))) {
   138	      if (lines[end].trim().startsWith('- ')) removed += 1;
   139	      end += 1;
   140	    }
   141	    lines.splice(head + 1, end - (head + 1), '- (released)', '');
   142	  }
   143	  const cleared = lines.join(eol);
   144	  const leftover = cleared.split(/\r?\n/)
   145	    .slice(head + 1, head + 1 + removed + 2)
   146	    .filter((l) => l.trim().startsWith('- ') && !/\(released\)/.test(l));
   147	  if (head === -1 || leftover.length) {
   148	    console.error('[lane] WARNING: lock list may not have cleared — verify the lane file by hand.');
   149	  }
   150	  atomicWrite(LANE_PATH, `${cleared}\nOutcome: ${flag('outcome', '—')}\n`);
   151	  logActivity(`${new Date().toISOString()} RELEASE ${ME.agent}@${ME.slug} :: ${flag('outcome', '—')} :: delivery=${d.state}`);
   152	  console.log(`[lane] released. delivery: ${d.state}`);
   153	}
   154	
   155	/* ── DELTA digest — capped. A digest that reports EVERYTHING trains readers to
   156	 * skim NOTHING; because it never blocks it would not be removed, it would be
   157	 * ignored, which fails silently while everyone believes orientation happened. */
   158	function digest() {
   159	  const lanes = readLanes(LEDGER, ME.laneName);
   160	  const live = lanes.filter((l) => !l.self && l.ageMin <= FRESH_MIN && l.locks.length);
   161	  const staleCount = lanes.filter((l) => !l.self && l.ageMin > FRESH_MIN && l.locks.length).length;
   162	  const d = deliveryState();
   163	  if (JSON_MODE) {
   164	    console.log(JSON.stringify({ ledger: LEDGER, me: ME.laneName, delivery: d, live, staleCount }, null, 2));
   165	    return;
   166	  }
   167	  const out = [
   168	    `[lane] ledger ${LEDGER}`,
   169	    `[lane] me: ${ME.agent}@${ME.slug} · branch ${d.branch} · delivery ${d.state}${d.unpushed ? ` · ${d.unpushed} UNPUSHED` : ''}`,
   170	  ];
   171	  if (!existsSync(LANE_PATH)) {
   172	    out.push('[lane] ⚠ you have NOT published a lane this session — run: node scripts/lane.mjs claim --task "..." --files "..."');
   173	  }
   174	  if (live.length) {
   175	    out.push(`[lane] ${live.length} agent(s) hold locks right now — DO NOT edit these:`);
   176	    for (const l of live.slice(0, 6)) {
   177	      out.push(`   ${l.file.replace('.lane.md', '')} (${l.ageMin}m ago) — ${l.task}`);
   178	      for (const f of l.locks.slice(0, 5)) out.push(`      🔒 ${f}`);
   179	      if (l.locks.length > 5) out.push(`      … +${l.locks.length - 5} more`);
   180	    }
   181	    if (live.length > 6) out.push(`   … +${live.length - 6} more live lane(s)`);
   182	  } else {
   183	    out.push('[lane] no fresh locks held by other agents.');
   184	  }
   185	  if (staleCount) {
   186	    out.push(`[lane] ${staleCount} stale lane(s) still holding locks (>${FRESH_MIN}m) — advisory; never silently seize (R5). \`node scripts/lane.mjs doctor\``);
   187	  }
   188	  console.log(out.join('\n'));
   189	}
   190	
   191	/* ── Hygiene — REPORTS ONLY. Rule 34 forbids auto-deletion. ─────────────────── */
   192	function doctor() {
   193	  const lanes = readLanes(LEDGER, ME.laneName);
   194	  const orphans = [];
   195	  for (const line of (sh('git worktree list --porcelain') ?? '').split('\n')) {
   196	    if (!line.startsWith('worktree ')) continue;
   197	    const dir = normPath(line.slice(9).trim());
   198	    const dirLedger = resolve(dir, '.ai-workflow', 'coordination');
   199	    if (samePath(dirLedger, LEDGER) || !existsSync(dirLedger)) continue;
   200	    const strays = readdirSync(dirLedger).filter((f) => f.endsWith('.lane.md') || f === 'review-queue.md');
   201	    if (strays.length) orphans.push({ dir, strays });
   202	  }
   203	  const rot = existsSync(LEDGER)
   204	    ? readdirSync(LEDGER)
   205	      .filter((f) => !f.endsWith('.lane.md') && f !== 'README.md')
   206	      .map((f) => ({ f, kb: Math.round(statSync(resolve(LEDGER, f)).size / 1024) }))
   207	      .filter((x) => x.kb > 128 || /\.tmp-\d+$/.test(x.f))
   208	    : [];
   209	  if (JSON_MODE) { console.log(JSON.stringify({ ledger: LEDGER, orphans, rot, lanes }, null, 2)); return; }
   210	  console.log(`[lane doctor] canonical ledger: ${LEDGER}`);
   211	  console.log(`[lane doctor] lanes present: ${lanes.length}`);
   212	  if (orphans.length) {
   213	    console.log(`[lane doctor] ⚠ ${orphans.length} ORPHANED worktree-local ledger(s) — published where no agent reads (report only, never auto-deleted):`);
   214	    for (const o of orphans) console.log(`   ${o.dir} :: ${o.strays.join(', ')}`);
   215	  } else console.log('[lane doctor] no orphaned worktree ledgers.');
   216	  for (const r of rot) console.log(`[lane doctor] ⚠ ledger artifact: ${r.f} (${r.kb} KB) — candidate for prune, pending approval.`);
   217	}
   218	
   219	const COMMANDS = { claim, release, digest, doctor, whoami: () => console.log(`${ME.agent}@${ME.slug} → ${LANE_PATH}`) };
   220	if (!COMMANDS[CMD]) {
   221	  // A typo used to fall through to `digest` and exit 0 — the agent believed it had
   222	  // published a claim nobody could see. Silent failure on the primary write path.
   223	  console.error(`[lane] unknown subcommand '${CMD}'. Expected: ${Object.keys(COMMANDS).join(' | ')}`);
   224	  process.exit(4);
   225	}
   226	COMMANDS[CMD]();```

---

## `scripts/hooks/push-blast-radius.mjs` (139 lines)

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
    36	  { re: /^\.github\/workflows\//i, what: 'CI workflow — executes on push' },
    37	  { re: /(^|\/)Dockerfile$/i, what: 'container build' },
    38	];
    39	
    40	function main() {
    41	  let payload;
    42	  try { payload = JSON.parse(readFileSync(0, 'utf8')); } catch { return; }
    43	  if ((payload?.tool_name || '') !== 'Bash') return;
    44	  const cmd = String(payload.tool_input?.command || '');
    45	
    46	  /* Strip quoted strings BEFORE any matching. `git commit -m "fix: push handling"`
    47	   * fired this advisory — verified false positive. Handles escaped quotes, which the
    48	   * first version did not. ALL later regexes run on `bare`, not `cmd`: the force-push
    49	   * test used to run on the raw string and flagged `git commit -m "try -f first"`. */
    50	  const bare = cmd
    51	    .replace(/"(?:[^"\\]|\\.)*"/g, '""')
    52	    .replace(/'(?:[^'\\]|\\.)*'/g, "''");
    53	
    54	  /* `push` must be the git SUBCOMMAND, not merely a later word: `git config
    55	   * push.default simple` and `git log --grep=push` both fired the old pattern.
    56	   * Case-insensitive because cmd.exe happily runs `GIT PUSH`. */
    57	  if (!/\bgit\b(?:\s+(?:-[A-Za-z-]+|--[a-z-]+=\S+|-C\s+\S+|-c\s+\S+))*\s+push\b/i.test(bare)) return;
    58	
    59	  const branch = sh('git rev-parse --abbrev-ref HEAD');
    60	  const ref = safeRef(branch || '');
    61	  /* `-f` combined into a cluster (`-uf`, `-fv`) was undetected. */
    62	  const forced = /--force(?!-with-lease)\b|(?:^|\s)-[A-Za-z]*f[A-Za-z]*(?:\s|$)/i.test(bare);
    63	  const leased = /--force-with-lease/i.test(bare);
    64	  /* Token-exact: `\b(main)\b` flagged `feature/main-fix` and `production-notes`,
    65	   * because `-` and `/` are non-word chars. Match whole ref tokens only. */
    66	  const targetsDeployRef = /(?:^|[\s:])(?:origin\/)?(main|master|production)(?:\s|$)/i.test(bare)
    67	    || ['main', 'master', 'production'].includes(branch || '');
    68	
    69	  /* An explicit refspec, --all, or a tag push means the range below (which is
    70	   * HEAD-based) is NOT what is being pushed. Disclose rather than mislead. */
    71	  const explicitRefspec = /\s\S+:\S+/.test(bare) || /\s--all\b|\s--tags\b|\s--mirror\b/i.test(bare);
    72	
    73	  let changed = null;
    74	  let rangeNote = '';
    75	  if (ref) {
    76	    const remoteRef = sh(`git rev-parse --verify --quiet origin/${ref}`) ? `origin/${ref}` : 'origin/main';
    77	    /* sh() returns NULL on failure and '' on empty. Conflating them made this
    78	     * fail-open: a failed `git diff` looked like "nothing to push" and the hook
    79	     * returned silently on a migration push. */
    80	    const raw = sh(`git diff --name-only ${remoteRef}...HEAD`);
    81	    if (raw === null) rangeNote = `⚠ could not compute the diff against ${remoteRef} — this check did NOT run.`;
    82	    else changed = raw.split('\n').filter(Boolean);
    83	  } else {
    84	    rangeNote = '⚠ could not resolve a safe branch name — file-level checks did NOT run.';
    85	  }
    86	
    87	  const hits = [];
    88	  for (const f of changed ?? []) for (const p of EXECUTES_ON_PUSH) if (p.re.test(f)) hits.push({ f, what: p.what });
    89	
    90	  /* Files another LIVE session has locked (advisory, Rule 67 R6). */
    91	  const lockClash = [];
    92	  try {
    93	    const ledger = ledgerDir();
    94	    const mine = identity().laneName; // exact session lane — NOT the agent-name prefix
    95	    if (ledger && existsSync(ledger) && changed?.length) {
    96	      for (const file of readdirSync(ledger).filter((x) => x.endsWith('.lane.md'))) {
    97	        if (file === mine) continue;
    98	        const p = resolve(ledger, file);
    99	        if ((Date.now() - statSync(p).mtimeMs) / 60000 > FRESH_MIN) continue;
   100	        for (const lock of parseLane(readFileSync(p, 'utf8')).locks) {
   101	          if (changed.some((c) => lockMatches(c, lock))) {
   102	            lockClash.push(`${file.replace('.lane.md', '')} :: ${lock}`);
   103	          }
   104	        }
   105	      }
   106	    }
   107	  } catch { /* advisory only */ }
   108	
   109	  if (!hits.length && !forced && !leased && !lockClash.length && !rangeNote && !explicitRefspec) return;
   110	
   111	  const out = ['⚠ PUSH BLAST RADIUS — read before you confirm this push.', ''];
   112	  out.push(`branch: ${branch || '(unknown)'}${targetsDeployRef ? '   ⚠ DEPLOY-LINKED' : ''}`);
   113	  if (rangeNote) out.push(`🟠 ${rangeNote}  Treat the file list below as INCOMPLETE.`);
   114	  if (explicitRefspec) {
   115	    out.push('🟠 this push names an explicit refspec / --all / --tags. The file list below is');
   116	    out.push('   computed from HEAD and may describe DIFFERENT commits than the ones pushed.');
   117	  }
   118	  if (forced) out.push("🔴 FORCE PUSH without --force-with-lease — can destroy another agent's pushed commits.");
   119	  else if (leased) out.push('🟠 force-with-lease — history rewrite; safe only if you know what the remote holds.');
   120	  if (hits.length) {
   121	    out.push('', `🔴 ${hits.length} file(s) in this range are EXECUTED by automation on deploy:`);
   122	    for (const h of hits.slice(0, 12)) out.push(`   ${h.f}  → ${h.what}`);
   123	    if (hits.length > 12) out.push(`   … +${hits.length - 12} more`);
   124	    if (targetsDeployRef && hits.some((h) => /migration|seeder|SQL/i.test(h.what))) {
   125	      out.push('', '   render.yaml runs `npm run migrate:production` in the build.');
   126	      out.push('   Pushing this to a deploy-linked branch RUNS THESE AGAINST PRODUCTION.');
   127	      out.push('   Split the batch by blast radius: push the reversible commits now, hold the');
   128	      out.push("   schema commits for review and Sean's approval.");
   129	    }
   130	  }
   131	  if (lockClash.length) {
   132	    out.push('', '🟠 this push carries file(s) another LIVE session has locked (R6):');
   133	    for (const c of lockClash.slice(0, 8)) out.push(`   ${c}`);
   134	  }
   135	  out.push('', 'Advisory only — nothing is blocked. Real enforcement is branch protection on main.');
   136	  console.error(out.join('\n'));
   137	}
   138	
   139	try { main(); } catch { /* fail-open: never break a push on this hook's own bug */ }
   140	process.exit(0);```

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

## `prune-worktrees.mjs` — ALREADY EXECUTED against the machine

```javascript
     1	/**
     2	 * prune-worktrees.mjs — Step 4 executor. Sean-approved 2026-08-12.
     3	 *
     4	 * Removes ONLY worktrees that re-verify, at the moment of removal, as:
     5	 *   - not the main tree
     6	 *   - on a branch fully contained in origin/main (0 commits ahead)
     7	 *   - working copy completely clean (git status --porcelain empty)
     8	 *
     9	 * Never uses --force: git refuses a dirty worktree, and that refusal is the
    10	 * safety property we are relying on. State is re-derived per item, not trusted
    11	 * from the inventory — a worktree can be dirtied between listing and removal.
    12	 *
    13	 * Usage: node prune-worktrees.mjs <batchSize> [--apply]
    14	 *        without --apply it is a dry run and removes nothing.
    15	 */
    16	import { execSync } from 'node:child_process';
    17	
    18	const BATCH = Number(process.argv[2] || 20);
    19	const APPLY = process.argv.includes('--apply');
    20	const sh = (c) => { try { return execSync(c, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { return null; } };
    21	
    22	const raw = sh('git worktree list --porcelain') ?? '';
    23	const wts = [];
    24	let cur = null;
    25	for (const line of raw.split('\n')) {
    26	  if (line.startsWith('worktree ')) { if (cur) wts.push(cur); cur = { path: line.slice(9).trim(), branch: null, detached: false }; }
    27	  else if (line.startsWith('branch ')) { if (cur) cur.branch = line.slice(7).replace('refs/heads/', ''); }
    28	  else if (line === 'detached') { if (cur) cur.detached = true; }
    29	}
    30	if (cur) wts.push(cur);
    31	
    32	const MAIN = wts[0].path;
    33	let removed = 0; let skipped = 0; let failed = 0;
    34	const log = [];
    35	
    36	for (const w of wts.slice(1)) {
    37	  if (removed >= BATCH) break;
    38	  if (w.path === MAIN) continue;
    39	  if (w.detached || !w.branch) { skipped += 1; continue; }
    40	
    41	  // Re-verify NOW, not from the inventory.
    42	  const ahead = sh(`git rev-list --count origin/main..${JSON.stringify(w.branch)}`);
    43	  if (ahead === null || Number(ahead) !== 0) { skipped += 1; continue; }
    44	  const dirty = sh(`git -C "${w.path}" status --porcelain`);
    45	  if (dirty === null) { log.push(`SKIP  (unreadable)      ${w.path}`); skipped += 1; continue; }
    46	  if (dirty !== '') { skipped += 1; continue; }
    47	
    48	  if (!APPLY) { log.push(`WOULD-REMOVE  ${w.branch}  ${w.path}`); removed += 1; continue; }
    49	  const res = sh(`git worktree remove "${w.path}"`);
    50	  if (res === null) { log.push(`FAILED (git refused)  ${w.path}`); failed += 1; }
    51	  else { log.push(`removed  ${w.branch}  ${w.path}`); removed += 1; }
    52	}
    53	
    54	console.log(log.join('\n'));
    55	console.log(`\n${APPLY ? 'REMOVED' : 'WOULD REMOVE'}: ${removed} · skipped (not clean-merged): ${skipped} · failed: ${failed}`);
```

# Implementation hostile-review packet — Coordination Ledger v2 (Rule 67)

**Reviewer:** Kimi K3 · **Date:** 2026-08-12 · **Commit:** 2092af72e · **PR:** #36

You previously reviewed the DESIGN of this system and I adopted your findings
(session-namespaced lanes instead of agent-name-keyed; no Stop freshness gate; no
committed delivery log; advisory push gate not a blocking one; branch protection as
the real control). **This packet is the resulting CODE.** Review the implementation,
not the design — the design argument is settled.

## Environment facts you need
- Windows 11, Git Bash, Node ESM. Paths mix `C:/` and `/c/` forms. Files are CRLF.
- 184 git worktrees; the ledger dir is gitignored; several agents run concurrently.
- Hook contract: stdin = JSON `{tool_name, tool_input}`; exit 0 = allow.
- `render.yaml` buildCommand runs `npm run migrate:production`.

## Your remit (implementation only)
Find real defects, ranked by cost x likelihood. Specifically hunt:
1. **Correctness bugs** — logic that does not do what its comment claims.
2. **Race conditions / atomicity** — concurrent agents, partial writes, torn reads.
3. **Windows/path defects** — separator mixing, case, `resolve()` misuse, drive letters.
4. **Regex flaws** — false positives AND false negatives, catastrophic backtracking.
5. **Fail-open vs fail-closed** — where does a throw silently disable a guard?
6. **Command injection / untrusted input** — lane files and tool_input are attacker-ish input.
7. **Silent-failure paths** — where does this report OK while being wrong?
8. **Claims in the SKILL/doc the code does not actually deliver.**

No praise. Cite file + line. If something is fine, say nothing about it.

---

## `scripts/lane.mjs` (213 lines)

```javascript
     1	#!/usr/bin/env node
     2	/**
     3	 * lane.mjs — the cross-agent Coordination Ledger engine (Rule 67 v2)
     4	 * ==================================================================
     5	 * Replaces cwd-relative, agent-name-keyed lane files with a SINGLE canonical
     6	 * ledger addressed by SESSION identity, so N parallel agents (and N worktrees)
     7	 * can publish without erasing each other.
     8	 *
     9	 * WHY v2 (hostile review, Kimi K3 + Tencent HY3, 2026-08-11):
    10	 *  - v1 resolved the ledger from `process.cwd()`. With 184 worktrees that forked
    11	 *    the ledger silently — 9 published lane files sat in worktree-local dirs no
    12	 *    other agent could ever read. Coordination was believed, and void.
    13	 *  - The obvious fix (centralize on `<git-common-dir>/..`) is a REGRESSION on its
    14	 *    own: every Claude session writes `claude.lane.md`, so last-writer-wins and a
    15	 *    live agent's locks vanish. Both reviewers independently called that a
    16	 *    "false-negative collision detector" — worse than the fork it replaces.
    17	 *    => Identity is `<agent>--<worktree-slug>`, one file per SESSION, never shared.
    18	 *  - Locks here are ADVISORY BROADCAST, not exclusion. The reviewed evidence is
    19	 *    that visibility is what has ever paid ("they cannot correct what they cannot
    20	 *    see"); exclusion has never prevented a single collision. Nothing in this file
    21	 *    blocks an edit.
    22	 *
    23	 * Writes are atomic (tmp + rename); appends use O_APPEND. Never writes another
    24	 * session's lane. Never deletes anything (Rule 34) — `doctor` reports only.
    25	 *
    26	 * Usage:
    27	 *   node scripts/lane.mjs claim   --task "<one line>" [--files "a,b,c"] [--next "..."] [--notes "..."]
    28	 *   node scripts/lane.mjs release [--outcome "<one line>"]
    29	 *   node scripts/lane.mjs digest  [--json]     # DELTA orientation, capped — for SessionStart
    30	 *   node scripts/lane.mjs doctor  [--json]     # hygiene: orphan ledgers, stale lanes, rot
    31	 *   node scripts/lane.mjs whoami
    32	 *
    33	 * Exit codes: 0 ok · 2 not a git repo. Never fails on findings.
    34	 */
    35	import { execSync } from 'node:child_process';
    36	import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, statSync, writeFileSync, appendFileSync } from 'node:fs';
    37	import { basename, resolve } from 'node:path';
    38	
    39	const ARGV = process.argv.slice(2);
    40	const CMD = ARGV[0] ?? 'digest';
    41	const JSON_MODE = ARGV.includes('--json');
    42	const flag = (name, dflt = '') => {
    43	  const i = ARGV.indexOf(`--${name}`);
    44	  return i >= 0 && ARGV[i + 1] && !ARGV[i + 1].startsWith('--') ? ARGV[i + 1] : dflt;
    45	};
    46	
    47	const sh = (cmd, cwd = process.cwd()) => {
    48	  try { return execSync(cmd, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); }
    49	  catch { return ''; }
    50	};
    51	
    52	/* ── 1. Canonical ledger — identical from every worktree ────────────────────
    53	 * `--path-format=absolute` needs git >= 2.31; fall back to resolving the plain
    54	 * form against cwd (HY3 flagged that the plain form can be RELATIVE for linked
    55	 * worktrees on older git — it returns absolute on this machine, but resolving
    56	 * defensively is free and correct in both cases). */
    57	function resolveLedger() {
    58	  let common = sh('git rev-parse --path-format=absolute --git-common-dir');
    59	  if (!common) common = sh('git rev-parse --git-common-dir');
    60	  if (!common) return null;
    61	  return resolve(common, '..', '.ai-workflow', 'coordination');
    62	}
    63	
    64	const LEDGER = resolveLedger();
    65	if (!LEDGER) {
    66	  console.error('[lane] not a git repository — no ledger.');
    67	  process.exit(2);
    68	}
    69	const LANES_GLOB = () => (existsSync(LEDGER) ? readdirSync(LEDGER).filter((f) => f.endsWith('.lane.md')) : []);
    70	
    71	/* ── 2. Session identity — agent + worktree, never a bare agent name ──────── */
    72	const AGENT = process.env.SWAN_AGENT_SURFACE || process.env.CLAUDE_AGENT || 'vs-claude';
    73	const WORKTREE = basename(sh('git rev-parse --show-toplevel') || process.cwd());
    74	const IS_MAIN = resolve(sh('git rev-parse --show-toplevel') || '.') === resolve(LEDGER, '..', '..');
    75	const SLUG = IS_MAIN ? 'main' : WORKTREE;
    76	const LANE_NAME = `${AGENT}--${SLUG}.lane.md`;
    77	const LANE_PATH = resolve(LEDGER, LANE_NAME);
    78	
    79	/* ── 3. Delivery state — COMPUTED from git, never asserted by the agent ─────
    80	 * The v1 schema could only say "Last commit: <sha>", so the committed-vs-pushed-
    81	 * vs-merged confusion that caused the 2026-08-11 incident was unrepresentable and
    82	 * therefore uncheckable. This computes it fresh on every read. */
    83	function deliveryState() {
    84	  const branch = sh('git rev-parse --abbrev-ref HEAD');
    85	  if (!branch || branch === 'HEAD') return { branch: branch || 'detached', state: 'detached', ahead: 0, unpushed: [] };
    86	  const onRemote = sh(`git rev-parse --verify --quiet origin/${branch}`);
    87	  const mergedMain = sh(`git branch --remotes --contains HEAD --list origin/main`);
    88	  const ahead = Number(sh(`git rev-list --count origin/main..HEAD`) || 0);
    89	  const unpushed = onRemote
    90	    ? sh(`git rev-list --count origin/${branch}..HEAD`)
    91	    : sh('git rev-list --count origin/main..HEAD');
    92	  let state = 'local-commit';
    93	  if (mergedMain) state = 'merged-to-main';
    94	  else if (onRemote && Number(unpushed) === 0) state = 'pushed-branch';
    95	  return { branch, state, ahead, unpushed: Number(unpushed) || 0, onRemote: Boolean(onRemote) };
    96	}
    97	
    98	/* ── 4. Read every lane. Freshness comes from file mtime, NOT the agent-authored
    99	 * `Updated:` line — a model can hallucinate prose; it cannot fake an mtime. */
   100	function readLanes() {
   101	  return LANES_GLOB().map((file) => {
   102	    const path = resolve(LEDGER, file);
   103	    const src = readFileSync(path, 'utf8');
   104	    const mtime = statSync(path).mtimeMs;
   105	    const section = src.split(/EDITING NOW/i)[1]?.split(/\n#{1,3}\s/)[0] ?? '';
   106	    const locks = section.split('\n').map((l) => l.trim())
   107	      .filter((l) => l.startsWith('- ') && !/^-\s*(nothing|none|_)/i.test(l))
   108	      .map((l) => l.replace(/^-\s*/, '').replace(/`/g, ''));
   109	    const task = (src.match(/^Task:\s*(.+)$/m) || [])[1] || (src.match(/^##\s+(.+)$/m) || [])[1] || '';
   110	    return { file, self: file === LANE_NAME, ageMin: Math.round((Date.now() - mtime) / 60000), locks, task: task.slice(0, 90) };
   111	  });
   112	}
   113	
   114	/* ── 5. Commands ───────────────────────────────────────────────────────────── */
   115	function atomicWrite(path, body) {
   116	  const tmp = `${path}.tmp-${process.pid}`;
   117	  writeFileSync(tmp, body, 'utf8');
   118	  renameSync(tmp, path); // atomic on same filesystem — no torn reads
   119	}
   120	
   121	function logActivity(line) {
   122	  try { appendFileSync(resolve(LEDGER, 'activity.log.md'), `${line}\n`, 'utf8'); } catch { /* non-fatal */ }
   123	}
   124	
   125	function claim() {
   126	  if (!existsSync(LEDGER)) mkdirSync(LEDGER, { recursive: true });
   127	  const task = flag('task', '(unstated)');
   128	  const files = flag('files').split(',').map((s) => s.trim()).filter(Boolean);
   129	  const d = deliveryState();
   130	  const body = `# ${AGENT} — Live Lane (session: ${SLUG})
   131	Updated: ${new Date().toISOString()}
   132	Status: in-progress
   133	Agent: ${AGENT}
   134	Worktree: ${WORKTREE}${IS_MAIN ? ' (MAIN TREE)' : ''}
   135	Branch: ${d.branch}
   136	Delivery: ${d.state}${d.unpushed ? ` (${d.unpushed} unpushed commit${d.unpushed === 1 ? '' : 's'})` : ''}
   137	Task: ${task}
   138	
   139	## EDITING NOW
   140	${files.length ? files.map((f) => `- ${f}`).join('\n') : '- (none declared yet)'}
   141	
   142	Next intent: ${flag('next', '—')}
   143	Notes for other agents: ${flag('notes', '—')}
   144	`;
   145	  atomicWrite(LANE_PATH, body);
   146	  logActivity(`${new Date().toISOString()} CLAIM ${AGENT}@${SLUG} :: ${task} :: ${files.length} file(s)`);
   147	  console.log(`[lane] claimed → ${LANE_NAME}\n[lane] ledger: ${LEDGER}\n[lane] delivery: ${d.state}`);
   148	}
   149	
   150	function release() {
   151	  if (!existsSync(LANE_PATH)) { console.log('[lane] no lane to release.'); return; }
   152	  const d = deliveryState();
   153	  const src = readFileSync(LANE_PATH, 'utf8')
   154	    .replace(/^Status: .*$/m, 'Status: idle')
   155	    .replace(/^Updated: .*$/m, `Updated: ${new Date().toISOString()}`)
   156	    .replace(/^Delivery: .*$/m, `Delivery: ${d.state}${d.unpushed ? ` (${d.unpushed} unpushed)` : ''}`)
   157	    .replace(/## EDITING NOW\n[\s\S]*?(?=\nNext intent:)/, '## EDITING NOW\n- (released)\n');
   158	  atomicWrite(LANE_PATH, `${src}\nOutcome: ${flag('outcome', '—')}\n`);
   159	  logActivity(`${new Date().toISOString()} RELEASE ${AGENT}@${SLUG} :: ${flag('outcome', '—')} :: delivery=${d.state}`);
   160	  console.log(`[lane] released. delivery: ${d.state}`);
   161	}
   162	
   163	/* DELTA digest — capped. Both reviewers: a digest that reports EVERYTHING trains
   164	 * readers to skim NOTHING. Show only live lanes, their locks, and my delivery. */
   165	const FRESH_MIN = 120;
   166	function digest() {
   167	  const lanes = readLanes();
   168	  const live = lanes.filter((l) => !l.self && l.ageMin <= FRESH_MIN && l.locks.length);
   169	  const stale = lanes.filter((l) => !l.self && l.ageMin > FRESH_MIN && l.locks.length);
   170	  const d = deliveryState();
   171	  if (JSON_MODE) { console.log(JSON.stringify({ ledger: LEDGER, me: LANE_NAME, delivery: d, live, staleCount: stale.length }, null, 2)); return; }
   172	
   173	  const out = [`[lane] ledger ${LEDGER}`, `[lane] me: ${AGENT}@${SLUG} · branch ${d.branch} · delivery ${d.state}${d.unpushed ? ` · ${d.unpushed} UNPUSHED` : ''}`];
   174	  if (!existsSync(LANE_PATH)) out.push('[lane] ⚠ you have NOT published a lane this session — run: node scripts/lane.mjs claim --task "..." --files "..."');
   175	  if (live.length) {
   176	    out.push(`[lane] ${live.length} agent(s) hold locks right now — DO NOT edit these:`);
   177	    for (const l of live.slice(0, 6)) {
   178	      out.push(`   ${l.file.replace('.lane.md', '')} (${l.ageMin}m ago) — ${l.task}`);
   179	      for (const f of l.locks.slice(0, 5)) out.push(`      🔒 ${f}`);
   180	      if (l.locks.length > 5) out.push(`      … +${l.locks.length - 5} more`);
   181	    }
   182	  } else out.push('[lane] no fresh locks held by other agents.');
   183	  if (stale.length) out.push(`[lane] ${stale.length} stale lane(s) still holding locks (>${FRESH_MIN}m) — treat as advisory; never silently seize (R5). \`node scripts/lane.mjs doctor\``);
   184	  console.log(out.join('\n'));
   185	}
   186	
   187	/* Hygiene — REPORTS ONLY. Rule 34 forbids auto-deletion. */
   188	function doctor() {
   189	  const lanes = readLanes();
   190	  const orphans = [];
   191	  for (const line of sh('git worktree list --porcelain').split('\n')) {
   192	    if (!line.startsWith('worktree ')) continue;
   193	    const dir = line.slice(9).trim();
   194	    const dirLedger = resolve(dir, '.ai-workflow', 'coordination');
   195	    if (resolve(dirLedger) === resolve(LEDGER) || !existsSync(dirLedger)) continue;
   196	    const strays = readdirSync(dirLedger).filter((f) => f.endsWith('.lane.md') || f === 'review-queue.md');
   197	    if (strays.length) orphans.push({ dir, strays });
   198	  }
   199	  const rot = existsSync(LEDGER)
   200	    ? readdirSync(LEDGER).filter((f) => !f.endsWith('.lane.md') && f !== 'README.md')
   201	        .map((f) => ({ f, kb: Math.round(statSync(resolve(LEDGER, f)).size / 1024) })).filter((x) => x.kb > 128)
   202	    : [];
   203	  if (JSON_MODE) { console.log(JSON.stringify({ orphans, rot, lanes }, null, 2)); return; }
   204	  console.log(`[lane doctor] canonical ledger: ${LEDGER}`);
   205	  console.log(`[lane doctor] lanes present: ${lanes.length}`);
   206	  if (orphans.length) {
   207	    console.log(`[lane doctor] ⚠ ${orphans.length} ORPHANED worktree-local ledger(s) — published where no agent reads (report only, never auto-deleted):`);
   208	    for (const o of orphans) console.log(`   ${o.dir} :: ${o.strays.join(', ')}`);
   209	  } else console.log('[lane doctor] no orphaned worktree ledgers.');
   210	  for (const r of rot) console.log(`[lane doctor] ⚠ oversized ledger artifact: ${r.f} (${r.kb} KB) — candidate for prune, pending approval.`);
   211	}
   212	
   213	({ claim, release, digest, doctor, whoami: () => console.log(`${AGENT}@${SLUG} → ${LANE_PATH}`) }[CMD] ?? digest)();
```

---

## `scripts/hooks/push-blast-radius.mjs` (127 lines)

```javascript
     1	#!/usr/bin/env node
     2	/**
     3	 * push-blast-radius.mjs — PreToolUse advisory on `git push` (Rule 67 v2)
     4	 * ======================================================================
     5	 * THE GAP THIS CLOSES: on this repo a push is not a publish, it is a DEPLOY AND A
     6	 * MIGRATION RUN — `render.yaml` builds with `cd backend && npm install && npm run
     7	 * migrate:production`. On 2026-08-11 an agent came within one command of executing
     8	 * an unreviewed production schema change as a side effect of publishing a document.
     9	 * `db-blast-radius-gate.mjs` matches migration RUNNER commands; it has never seen a push.
    10	 *
    11	 * WHY ADVISORY, NOT BLOCKING (hostile review, Kimi K3 + Tencent HY3, 2026-08-11 —
    12	 * both reviewers, independently):
    13	 *  - "migration + main => block" is too BROAD: migrations are the normal deploy
    14	 *    path, so blocking them trains rubber-stamping, or blocks deploys while Sean
    15	 *    sleeps until an agent helpfully routes around via `gh`. A gate that annoys is
    16	 *    a gate that gets removed.
    17	 *  - It is also too NARROW: `gh pr merge`, the GitHub API, a cloud agent's own git
    18	 *    client, force-push, and tag-triggered releases all perform the same
    19	 *    irreversible act with zero characters matching `git push`.
    20	 *  - Therefore: this hook is EARLY-WARNING UX — it makes the agent find out before
    21	 *    the push, not after the deploy. The real enforcement is server-side branch
    22	 *    protection on `main` (a Sean action; see the skill). This hook never blocks,
    23	 *    so it cannot produce the false-positive fatigue that gets hooks disabled.
    24	 *
    25	 * Contract: stdin = { tool_name, tool_input }. Always exit 0. Fail-open on any throw.
    26	 */
    27	import { execSync } from 'node:child_process';
    28	import { readFileSync } from 'node:fs';
    29	import { existsSync, readdirSync, statSync } from 'node:fs';
    30	import { resolve, basename } from 'node:path';
    31	
    32	const sh = (cmd) => {
    33	  try { return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); }
    34	  catch { return ''; }
    35	};
    36	
    37	/** Paths automation EXECUTES on deploy. Enumerated from render.yaml + CI reality,
    38	 *  not just `backend/migrations/**` — the narrow predicate both reviewers rejected. */
    39	const EXECUTES_ON_PUSH = [
    40	  { re: /^backend\/migrations\//i, what: 'DB migration — runs against PRODUCTION on deploy' },
    41	  { re: /^backend\/seeders\//i, what: 'seeder — may mutate production rows' },
    42	  { re: /\.sql$/i, what: 'raw SQL' },
    43	  { re: /^render\.yaml$/i, what: 'deploy manifest — changes the build/migrate command itself' },
    44	  { re: /(^|\/)package\.json$/i, what: 'package.json — postinstall/engines run at build' },
    45	  { re: /^\.github\/workflows\//i, what: 'CI workflow — executes on push' },
    46	  { re: /(^|\/)Dockerfile$/i, what: 'container build' },
    47	];
    48	
    49	function main() {
    50	  let payload = {};
    51	  try { payload = JSON.parse(readFileSync(0, 'utf8')); } catch { return; }
    52	  if ((payload.tool_name || '') !== 'Bash') return;
    53	  const cmd = String(payload.tool_input?.command || '');
    54	  /* Strip quoted strings BEFORE matching. Without this, `git commit -m "fix: push
    55	   * handling"` fires the advisory — verified false positive, hostile round 1. That
    56	   * is the exact false-positive-fatigue class that gets a hook disabled, and this
    57	   * hook's whole value is that it is rare enough to still be read. */
    58	  const bare = cmd.replace(/"[^"]*"/g, '""').replace(/'[^']*'/g, "''");
    59	  if (!/\bgit\b[^|;&]*\bpush\b/.test(bare)) return;
    60	
    61	  const branch = sh('git rev-parse --abbrev-ref HEAD');
    62	  const forced = /--force(?!-with-lease)|(?:^|\s)-f(?:\s|$)/.test(cmd);
    63	  const leased = /--force-with-lease/.test(cmd);
    64	  const deployLinked = /\b(main|master|production)\b/.test(cmd) || ['main', 'master', 'production'].includes(branch);
    65	
    66	  // Range vs the remote's ACTUAL state — not path patterns over the whole local
    67	  // branch. A branch merely CONTAINING an already-shipped migration must not warn.
    68	  const remoteRef = sh(`git rev-parse --verify --quiet origin/${branch}`) ? `origin/${branch}` : 'origin/main';
    69	  const changed = sh(`git diff --name-only ${remoteRef}...HEAD`).split('\n').filter(Boolean);
    70	  if (!changed.length && !forced && !leased) return;
    71	
    72	  const hits = [];
    73	  for (const f of changed) for (const p of EXECUTES_ON_PUSH) if (p.re.test(f)) hits.push({ f, what: p.what });
    74	
    75	  // Does this push carry a file another LIVE session has locked? (advisory)
    76	  let lockClash = [];
    77	  try {
    78	    let common = sh('git rev-parse --path-format=absolute --git-common-dir') || sh('git rev-parse --git-common-dir');
    79	    const ledger = resolve(common, '..', '.ai-workflow', 'coordination');
    80	    /* Skip only MY OWN session's lane — not every lane sharing my agent name.
    81	     * Matching on the `vs-claude--` prefix made a SECOND vs-claude session's locks
    82	     * invisible here, which is the same same-agent-collision class this rebuild
    83	     * exists to kill (found in hostile round 4). Identity is agent + worktree. */
    84	    const top = sh('git rev-parse --show-toplevel');
    85	    const isMain = resolve(top || '.') === resolve(ledger, '..', '..');
    86	    const mine = `${process.env.SWAN_AGENT_SURFACE || 'vs-claude'}--${isMain ? 'main' : basename(top || '')}.lane.md`;
    87	    if (existsSync(ledger)) {
    88	      for (const file of readdirSync(ledger).filter((x) => x.endsWith('.lane.md'))) {
    89	        if (file === mine) continue;
    90	        if ((Date.now() - statSync(resolve(ledger, file)).mtimeMs) / 60000 > 120) continue;
    91	        const sec = readFileSync(resolve(ledger, file), 'utf8').split(/EDITING NOW/i)[1]?.split(/\n#{1,3}\s/)[0] ?? '';
    92	        for (const l of sec.split('\n').map((s) => s.trim()).filter((s) => s.startsWith('- '))) {
    93	          const lock = l.replace(/^-\s*/, '').replace(/`/g, '').replace(/\*+$/, '');
    94	          if (!lock || /^\(/.test(lock)) continue;
    95	          const stem = lock.replace(/\/\*\*.*$/, '');
    96	          if (changed.some((c) => c === lock || c.startsWith(stem))) lockClash.push(`${basename(file, '.lane.md')} :: ${lock}`);
    97	        }
    98	      }
    99	    }
   100	  } catch { /* advisory only */ }
   101	
   102	  if (!hits.length && !forced && !leased && !lockClash.length) return;
   103	
   104	  const out = ['⚠ PUSH BLAST RADIUS — read before you confirm this push.', ''];
   105	  out.push(`branch: ${branch} → ${remoteRef}${deployLinked ? '   ⚠ DEPLOY-LINKED' : ''}`);
   106	  if (forced) out.push('🔴 FORCE PUSH without --force-with-lease — this can destroy another agent\'s pushed commits.');
   107	  if (leased) out.push('🟠 force-with-lease — history rewrite; safe only if you know what the remote holds.');
   108	  if (hits.length) {
   109	    out.push('', `🔴 ${hits.length} file(s) in this range are EXECUTED by automation on deploy:`);
   110	    for (const h of hits.slice(0, 12)) out.push(`   ${h.f}  → ${h.what}`);
   111	    if (deployLinked && hits.some((h) => /migration|seeder|SQL/i.test(h.what))) {
   112	      out.push('', '   render.yaml runs `npm run migrate:production` in the build.');
   113	      out.push('   Pushing this to a deploy-linked branch RUNS THESE AGAINST PRODUCTION.');
   114	      out.push('   Rule 70 / 2026-08-11 incident: split the batch by blast radius — push the');
   115	      out.push('   reversible commits now, hold the schema commits for review + Sean\'s approval.');
   116	    }
   117	  }
   118	  if (lockClash.length) {
   119	    out.push('', `🟠 this push carries file(s) another LIVE session has locked (Rule 67 R6):`);
   120	    for (const c of lockClash.slice(0, 8)) out.push(`   ${c}`);
   121	  }
   122	  out.push('', 'Advisory only — nothing is blocked. Real enforcement is branch protection on main.');
   123	  console.error(out.join('\n'));
   124	}
   125	
   126	try { main(); } catch { /* fail-open */ }
   127	process.exit(0);
```

---

## `scripts/hooks/lane-session-start.mjs` (29 lines)

```javascript
     1	#!/usr/bin/env node
     2	/**
     3	 * lane-session-start.mjs — SessionStart orientation for the Coordination Ledger
     4	 * =============================================================================
     5	 * Prints the DELTA digest (who holds locks right now, my delivery state) so an
     6	 * agent is oriented before its first edit. Never blocks.
     7	 *
     8	 * WHY DELTA AND CAPPED (hostile review, Kimi K3 + Tencent HY3, 2026-08-11 — both,
     9	 * independently): a digest that reports EVERYTHING — 10 lanes, 184 worktrees, 225
    10	 * dirty files — trains the reader to skim NOTHING. Because it never blocks it will
    11	 * not be removed; it will be IGNORED, which fails silently while everyone believes
    12	 * orientation is happening. So it reports only what intersects the next action:
    13	 * fresh locks, my own delivery state, and counts (not lists) for everything else.
    14	 *
    15	 * Delegates to scripts/lane.mjs so there is ONE implementation of ledger truth.
    16	 * Fail-open: any error prints nothing and exits 0.
    17	 */
    18	import { execSync } from 'node:child_process';
    19	
    20	try {
    21	  const out = execSync('node scripts/lane.mjs digest', {
    22	    encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 10_000,
    23	  }).trim();
    24	  if (out) {
    25	    console.log(out);
    26	    console.log('[lane] claim before your first edit: node scripts/lane.mjs claim --task "<one line>" --files "a,b"');
    27	  }
    28	} catch { /* fail-open — orientation is never worth failing a session start */ }
    29	process.exit(0);
```

---

## `scripts/tree-sentinel.mjs` — changed region only

```javascript
diff --git a/scripts/tree-sentinel.mjs b/scripts/tree-sentinel.mjs
index cc75b37c7..66be9b724 100644
--- a/scripts/tree-sentinel.mjs
+++ b/scripts/tree-sentinel.mjs
@@ -23,7 +23,7 @@
  * Exit codes: 0 = ran (digest printed). 2 = git unavailable. Never fails on findings.
  */
 import { execSync } from 'node:child_process';
-import { existsSync, readFileSync } from 'node:fs';
+import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
 
 const ROOT = process.cwd();
 const JSON_MODE = process.argv.includes('--json');
@@ -111,20 +111,31 @@ for (const [idx, wt] of worktrees.entries()) {
 }
 
 /* ---------- 3. Rule-67 lane locks ---------- */
+/* Was a hardcoded ['claude','codex'] resolved against process.cwd(). Two bugs:
+ * (a) ten lane files exist, so six agents' locks were invisible to the tool whose
+ * job is reporting locks; (b) cwd resolution reads a WORKTREE-LOCAL ledger, which
+ * is how nine published claims ended up unreadable. Glob the canonical ledger. */
+const LEDGER_DIR = (() => {
+  const common = sh('git rev-parse --path-format=absolute --git-common-dir') || sh('git rev-parse --git-common-dir');
+  return common ? `${common}/../.ai-workflow/coordination` : `${ROOT}/.ai-workflow/coordination`;
+})();
 const lanes = {};
-for (const agent of ['claude', 'codex']) {
-  const lanePath = `${ROOT}/.ai-workflow/coordination/${agent}.lane.md`;
-  if (!existsSync(lanePath)) {
-    lanes[agent] = 'no lane file';
-    continue;
-  }
+const laneFiles = existsSync(LEDGER_DIR)
+  ? readdirSync(LEDGER_DIR).filter((f) => f.endsWith('.lane.md'))
+  : [];
+for (const file of laneFiles) {
+  const agent = file.replace(/\.lane\.md$/, '');
+  const lanePath = `${LEDGER_DIR}/${file}`;
+  /* Freshness from mtime, not the agent-authored `Updated:` prose — a model can
+   * hallucinate a timestamp; it cannot fake an mtime. */
+  const ageMin = Math.round((Date.now() - statSync(lanePath).mtimeMs) / 60000);
   const src = readFileSync(lanePath, 'utf8');
   const section = src.split(/EDITING NOW/i)[1]?.split(/\n#{1,3}\s/)[0] ?? '';
   const locked = section
     .split('\n')
     .map((l) => l.trim())
-    .filter((l) => l.startsWith('- ') && !/^- Nothing/i.test(l));
-  lanes[agent] = locked.length ? locked : 'released';
+    .filter((l) => l.startsWith('- ') && !/^-\s*(Nothing|None|\()/i.test(l));
+  lanes[agent] = locked.length ? { ageMin, locked } : { ageMin, locked: 'released' };
 }
 
 /* ---------- output ---------- */
@@ -167,9 +178,13 @@ if (JSON_MODE) {
       console.log(`  +${w.ahead} ahead, ${d}  ${w.branch}  ${w.path}`);
     }
   }
-  console.log(`\nLane locks:`);
+  console.log(`\nLane locks (canonical ledger — all sessions):`);
+  if (!Object.keys(lanes).length) console.log('  (no lane files)');
   for (const [agent, v] of Object.entries(lanes)) {
-    console.log(`  ${agent}: ${Array.isArray(v) ? `\n    ${v.join('\n    ')}` : v}`);
+    const fresh = v.ageMin <= 120 ? 'LIVE' : `stale ${v.ageMin}m`;
+    console.log(
+      `  ${agent} [${fresh}]: ${Array.isArray(v.locked) ? `\n    ${v.locked.join('\n    ')}` : v.locked}`,
+    );
   }
   console.log(
     `\n(read-only digest — cleanup of MERGED-CLEAN candidates stays Sean-gated per Rule 34; see Linear SWA-11)`,
```

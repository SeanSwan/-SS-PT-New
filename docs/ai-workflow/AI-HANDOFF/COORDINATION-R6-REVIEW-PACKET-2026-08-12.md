# Round-6 — hostile review of v2.5 + WHAT TO DO NEXT, in order

**Reviewer:** Kimi K3 · **Live on `main`** (`610295fb4`, deployed, health 200).

Two jobs this time. Part A is another hostile pass. **Part B is the one I actually need
most: tell me what to do next and in what order.**

## Part A — hostile review of the v2.5 delta

Five passes have run today. Each targeted a different artifact: the design, the
implementation, the shipped code, the round-4 delta, and now the round-5 delta. Every pass
found real defects, including a critical at pass 4 and the headline at pass 5. **The measured
pattern is that code written to fix a review finding contains the next defect**, so the delta
below is again the primary attack surface.

### Already fixed — do NOT re-report
Ledger forked across worktrees · agent-name-keyed lanes clobbering · `$`-under-`/m` in both
release() and parseLane · prose-as-locks · fenced blocks parsing to zero · extensionless locks
dropped (`Dockerfile`) · `deliveryState` coercing failure to 0 · backspace bytes from a patch
script · push-hook false positives (`git config push.default`, `git log --grep=push`, commit
messages, `-f` in quotes, `feature/main-fix`) · false negatives (`-uf`, uppercase, sibling
locks) · session identity vs worktree identity · idle rule reaching one of three consumers ·
quoted paths with spaces · `-C` analysing the wrong repo · deploy-ref scanning the whole
command · scp remotes read as refspecs · `**/glob` eaten by bold-strip · `+undefined ahead` ·
cwd-relative hint in the orientation hook.

### Rejected on evidence — do not re-raise without new proof
- `..` instead of `...`: three-dot yields the 16 files actually pushed, two-dot yields 2.
- "banner always fires on push to main": does not reproduce.
- "bare `*` matches nothing": it matches `a.ts`, correctly not `a/b.ts`.

### Settled design — not open
Advisory not blocking · no Stop-hook freshness gate · no committed delivery log · locks are
broadcast not exclusion · server-side branch protection is the real control · release() wipes
the whole lock section (that structure exists only to group the locks being released).

### Attack these specifically
1. The **interaction** between the v2.5 fixes. Three of five rounds had a defect caused by two
   of my own fixes disagreeing; round 5's headline was exactly that.
2. `activeLocks` vs `parseLane` — two entry points, one of which deliberately ignores idle.
3. The conditional-splitting rules: quoted extraction, then all-tokens-pathish, then
   path-plus-commentary with a bracket/short-dash/one-word test. Where does that misfire?
4. Fail-closed `-C`: does it ever fail closed when it should not?
5. Anything that reports success while doing nothing.

## Part B — NEXT SLICES, IN ORDER (this is the priority)

Given everything below, tell me what to do next and in what sequence. Be opinionated. Say
what to do FIRST, what to defer, and what to **not** do at all. Justify by risk and value, not
by tidiness. I would rather stop hardening this and go fix something that matters, if that is
the right call.

### What exists now
A coordination ledger for parallel AI agents on one repo: one canonical ledger reachable from
every worktree, one lane per session, locks as advisory broadcast, a session-start orientation
digest, an advisory push blast-radius warning, a read-only worktree/ledger `doctor`, and a
skill documenting the protocol. Six rounds of review, ~$1.5 of external review, all merged.

### Known-open, unresolved
- **Branch protection on `main` is STILL NOT ENABLED.** Nine passes have named it the only
  control covering `gh pr merge`, the API, and off-machine agents. It is a human action.
- **191 uncommitted files** in a merged worktree, protected by a 27-day-old lane holding 186
  locks. Nobody has decided keep-or-discard.
- **42 worktrees holding 4,235 uncommitted files** — merged branches, unreviewed working copies.
- **~110 worktrees total**; one registration has lost its `.git`.
- A **second live session** of the same agent was detected on the main tree during round 5.
- `activity.log.md` grows unbounded; nothing invokes the prune script.
- The ledger is gitignored, so **off-machine agents cannot see it at all**.
- Deferred by choice: session-env-absence warning is informational only; `doctor` has no
  reaper; no rotation story.

### The wider context
This is a production personal-training SaaS. The coordination system is *infrastructure for
the agents building it*, not product. Every hour spent here is an hour not spent on the
product. Six rounds is already a lot.

Rank by cost × likelihood for Part A. For Part B give an ordered list with a one-line
justification each, and name anything I should stop doing.

---

## The v2.5 delta

```diff
diff --git a/scripts/hooks/lane-session-start.mjs b/scripts/hooks/lane-session-start.mjs
index e5c269bd6..2f0a4418a 100644
--- a/scripts/hooks/lane-session-start.mjs
+++ b/scripts/hooks/lane-session-start.mjs
@@ -30,9 +30,12 @@ try {
     const out = execFileSync(process.execPath, [LANE, 'digest'], {
       encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 10_000,
     }).trim();
+    if (!out) console.log('[lane] digest produced no output — ledger may be empty or unreadable.');
     if (out) {
       console.log(out);
-      console.log('[lane] claim before your first edit: node scripts/lane.mjs claim --task "<one line>" --files "a,b"');
+      // Print the RESOLVED path. Advertising a relative command reintroduced, in the
+      // hint, the exact cwd bug this hook was rewritten to fix.
+      console.log(`[lane] claim before your first edit: node "${LANE}" claim --task "<one line>" --files "a,b"`);
     }
   }
 } catch (err) {
diff --git a/scripts/hooks/push-blast-radius.mjs b/scripts/hooks/push-blast-radius.mjs
index d64156417..b5872e23b 100644
--- a/scripts/hooks/push-blast-radius.mjs
+++ b/scripts/hooks/push-blast-radius.mjs
@@ -23,7 +23,7 @@
  */
 import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
 import { resolve } from 'node:path';
-import { FRESH_MIN, sh, ledgerDir, identity, safeRef, parseLane, lockMatches } from '../lib/lane-core.mjs';
+import { FRESH_MIN, sh, ledgerDir, identity, safeRef, parseLane, activeLocks, lockMatches } from '../lib/lane-core.mjs';
 
 /** Paths automation EXECUTES on deploy — enumerated from render.yaml and CI reality,
  *  not just `backend/migrations/**`, which was the narrow predicate reviewers rejected. */
@@ -65,8 +65,19 @@ function main() {
    * directory instead reported the wrong branch, the wrong diff and the wrong
    * deploy-linked verdict, with no hint that it had done so — verified:
    * `git -C C:/tmp/ss-apex push` printed this repo's branch. Honour -C. */
-  const dashC = bare.match(/\s-C\s+("?)([^\s"]+)\1/);
-  const REPO = dashC && existsSync(dashC[2]) ? dashC[2] : process.cwd();
+  /* Quoted paths are the norm on Windows and the old pattern could not span one, so
+   * `git -C "C:/My Repo" push` fell through to cwd and reported THIS repo as fact.
+   * Silent fallback is the failure this fix exists to kill, so an unresolvable -C now
+   * fails CLOSED: the analysis is skipped and the skip is stated. Also accepts the
+   * `=` form and --git-dir/--work-tree, which the detection regex already admitted. */
+  /* Match on the RAW command, not the quote-stripped copy:  blanks quoted
+   * runs, so a quoted -C path was gone before this ever looked for it. */
+  const dashC = cmd.match(/\s-C(?:\s+|=)(?:"([^"]+)"|'([^']+)'|(\S+))/)
+    || bare.match(/\s--(?:git-dir|work-tree)(?:\s+|=)(?:"([^"]+)"|'([^']+)'|(\S+))/);
+  const dashCRaw = dashC ? (dashC[1] ?? dashC[2] ?? dashC[3]) : null;
+  const dashCPath = dashCRaw ? dashCRaw.replace(/[/\\]\.git$/, '') : null;
+  const dashCBroken = Boolean(dashCPath) && !existsSync(dashCPath);
+  const REPO = dashCPath && !dashCBroken ? dashCPath : process.cwd();
   const shx = (cmd) => sh(cmd, REPO);
 
   const branch = shx('git rev-parse --abbrev-ref HEAD');
@@ -81,7 +92,12 @@ function main() {
    * DEPLOY-LINKED flag. And do NOT infer deploy-linked from the CURRENT branch
    * when the command names an explicit target — sitting on `main` while pushing a
    * feature branch produced the production lecture for no reason. */
-  const deRef = bare.replace(/refs\/(heads|remotes|tags)\//gi, '').replace(/origin\//gi, ' ');
+  /* Only the text AFTER `push` describes the target. Scanning the whole command
+   * meant `git pull origin main && git push origin feature-x` — the single most
+   * common flow here — raised DEPLOY-LINKED on a feature push, training readers to
+   * ignore the highest-severity flag this hook has. */
+  const afterPush = bare.slice(bare.search(/\bpush\b/i) + 4);
+  const deRef = afterPush.replace(/refs\/(heads|remotes|tags)\//gi, '').replace(/origin\//gi, ' ');
   const deployRefNamed = /(?:^|[\s:\/])(main|master|production)(?:\s|$)/i.test(deRef);
   const pushIdx = bare.split(/\s+/).findIndex((t) => /^push$/i.test(t));
   const pushArgs = pushIdx === -1 ? [] : bare.split(/\s+/).slice(pushIdx + 1).filter((t) => !t.startsWith("-"));
@@ -101,7 +117,11 @@ function main() {
    * refspec fired the warning on any git command carrying an absolute path —
    * a false positive on one of the most common shapes in this repo. Exclude
    * single-letter drive prefixes. */
-  const refspecToken = bare.split(/\s+/).some((t) => /^[^:]+:[^:]+$/.test(t) && !/^[A-Za-z]:[\\/]/.test(t));
+  /* `git@github.com:org/repo.git` is an scp-style remote, not a refspec, and it fired
+   * this warning on every SSH push with a perfectly trustworthy range below it. */
+  const refspecToken = bare.split(/\s+/).some((t) => /^[^:]+:[^:]+$/.test(t)
+    && !/^[A-Za-z]:[\\/]/.test(t)
+    && !/@/.test(t.split(':')[0]));
   const explicitRefspec = refspecToken || /\s--all\b|\s--tags\b|\s--mirror\b/i.test(bare);
 
   let changed = null;
@@ -127,14 +147,14 @@ function main() {
   /* Files another LIVE session has locked (advisory, Rule 67 R6). */
   const lockClash = [];
   try {
-    const ledger = ledgerDir();
+    const ledger = ledgerDir(REPO);   // the repo being pushed, not necessarily the cwd
     const mine = identity().laneName; // exact session lane — NOT the agent-name prefix
     if (ledger && existsSync(ledger) && changed?.length) {
       for (const file of readdirSync(ledger).filter((x) => x.endsWith('.lane.md'))) {
         if (file === mine) continue;
         const p = resolve(ledger, file);
         if ((Date.now() - statSync(p).mtimeMs) / 60000 > FRESH_MIN) continue;
-        for (const lock of parseLane(readFileSync(p, 'utf8'), resolve(ledger, '..', '..')).locks) {
+        for (const lock of activeLocks(readFileSync(p, 'utf8'), resolve(ledger, '..', '..'))) {
           if (changed.some((c) => lockMatches(c, lock))) {
             lockClash.push(`${file.replace('.lane.md', '')} :: ${lock}`);
           }
@@ -143,11 +163,15 @@ function main() {
     }
   } catch { /* advisory only */ }
 
-  if (!hits.length && !forced && !leased && !lockClash.length && !rangeNote && !explicitRefspec && !switchesBranch) return;
+  if (!hits.length && !forced && !leased && !lockClash.length && !rangeNote && !explicitRefspec && !switchesBranch && !dashCBroken) return;
 
   const out = ['⚠ PUSH BLAST RADIUS — read before you confirm this push.', ''];
   out.push(`branch: ${branch || '(unknown)'}${targetsDeployRef ? '   ⚠ DEPLOY-LINKED' : ''}`);
   if (REPO !== process.cwd()) out.push(`repo:   ${REPO}  (via -C — analysed there, not here)`);
+  if (dashCBroken) {
+    out.push(`🔴 -C target ${dashCPath} does not exist — NOTHING below was analysed for it.`);
+    out.push('   The figures shown describe the current directory instead. Treat as UNCHECKED.');
+  }
   if (rangeNote) out.push(`🟠 ${rangeNote}  Treat the file list below as INCOMPLETE.`);
   if (switchesBranch) {
     out.push('🟠 this command changes branch before pushing. Everything below describes the');
diff --git a/scripts/lane.mjs b/scripts/lane.mjs
index 482dedc22..0c5a47de9 100644
--- a/scripts/lane.mjs
+++ b/scripts/lane.mjs
@@ -201,6 +201,16 @@ function digest() {
   ];
   if (!existsSync(LANE_PATH)) {
     out.push('[lane] ⚠ you have NOT published a lane this session — run: node scripts/lane.mjs claim --task "..." --files "..."');
+    /* If a lane exists for this agent+worktree under a DIFFERENT session suffix, say
+     * so. Without a session id the name falls back to the old shape, and a manual
+     * `release` from a terminal would then target a name the hook never wrote —
+     * releasing nothing while the real lane keeps its locks. Naming the sibling is
+     * the difference between noticing that and not. */
+    const stem = ME.laneName.replace(/-s[A-Za-z0-9]+\.lane\.md$/, '').replace(/\.lane\.md$/, '');
+    const siblings = lanes.filter((x) => x.file.startsWith(stem) && x.file !== ME.laneName);
+    for (const s of siblings) {
+      out.push(`[lane]   note: ${s.file} is the same agent+worktree from another session (${s.ageMin}m old, ${Array.isArray(s.locks) ? s.locks.length : 0} lock(s)).`);
+    }
   }
   if (live.length) {
     out.push(`[lane] ${live.length} agent(s) hold locks right now — DO NOT edit these:`);
@@ -237,7 +247,24 @@ function doctor() {
       .map((f) => ({ f, kb: Math.round(statSync(resolve(LEDGER, f)).size / 1024) }))
       .filter((x) => x.kb > 128 || /\.tmp-\d+$/.test(x.f))
     : [];
-  if (JSON_MODE) { console.log(JSON.stringify({ ledger: LEDGER, orphans, rot, lanes }, null, 2)); return; }
+  /* Hand-written lanes stack historical entries, so a file can hold several
+   * `EDITING NOW` sections. Every consumer reads the FIRST one, which assumes
+   * newest-at-top. That assumption holds for most lanes and is silently violated by
+   * others — on 2026-08-12, two of three multi-section lanes put the newest first
+   * and one put it last, so the stale section was the one being read. Reading all
+   * sections instead would resurrect dead locks (the phantom-lock direction, which
+   * is worse), so the convention stays and the exception gets surfaced here. */
+  const multi = [];
+  for (const l of lanes) {
+    const src = readFileSync(resolve(LEDGER, l.file), 'utf8');
+    const n = src.split(/\r?\n/).filter((x) => /^#{1,6}\s.*EDITING NOW/i.test(x)).length;
+    if (n > 1) multi.push({ file: l.file, sections: n });
+  }
+  if (JSON_MODE) { console.log(JSON.stringify({ ledger: LEDGER, orphans, rot, multi, lanes }, null, 2)); return; }
+  for (const m of multi) {
+    console.log(`[lane doctor] ⚠ ${m.file} has ${m.sections} EDITING NOW sections — only the FIRST is read.`);
+    console.log('[lane doctor]    Verify the newest entry is at the top, or the ledger reads a stale claim.');
+  }
   console.log(`[lane doctor] canonical ledger: ${LEDGER}`);
   console.log(`[lane doctor] lanes present: ${lanes.length}`);
   if (orphans.length) {
diff --git a/scripts/lib/lane-core.mjs b/scripts/lib/lane-core.mjs
index 7c2e197b0..79e9e225a 100644
--- a/scripts/lib/lane-core.mjs
+++ b/scripts/lib/lane-core.mjs
@@ -114,6 +114,8 @@ export function safeRef(ref) {
 /** Parse one lane file's body. CRLF-tolerant everywhere: these files are written
  *  by tools AND edited by hand, and a bare-\n assumption silently no-ops. */
 export function parseLane(src, root = null) {
+  /* A lane declares its own worktree; use it as a second root for existence checks. */
+  const altRoot = (src.match(/^Worktree:\s*(\S+)/m) || [])[1] || null;
   /* Line-wise, deliberately — TWICE now this logic was written as one clever regex
    * and both times `$` inside a lookahead under the /m flag (where `$` means
    * end-of-LINE, not end-of-string) made the lazy quantifier stop at the first
@@ -140,50 +142,99 @@ export function parseLane(src, root = null) {
       body.push(all[i]);
     }
   }
-  /* FORMAT-AGNOSTIC, and it has to be. Requiring a `- ` bullet made a real lane
-   * parse to ZERO locks: the live claude.lane.md listed its locked paths inside a
-   * fenced code block, so an entire locked directory tree was invisible to every
-   * consumer. Agents also write `*`/`+` bullets, numbered lists and `- [ ]`
-   * checkboxes. Accept any line, strip whatever list decoration it carries, and
-   * let the path-shape test decide.
+  /* FORMAT-AGNOSTIC, because requiring a specific bullet made a real lane parse to
+   * ZERO locks: the live claude.lane.md listed its paths inside a fenced code block.
+   * Accept any line, strip list decoration, then decide per line.
    *
-   * SPLITTING IS CONDITIONAL, and that condition is load-bearing in both directions.
-   * Splitting every line on whitespace picks up `b.ts` from `- a.ts b.ts` (good) but
-   * also turns `origin/main` inside a prose sentence into a lock (bad — verified
-   * regression). Splitting on commas only does the reverse. So: a line becomes a
-   * LIST only when every token on it is path-shaped; otherwise it is treated as one
-   * path plus commentary, and prose yields nothing at all. */
+   * QUOTED SEGMENTS ARE EXTRACTED FIRST. Splitting on whitespace before honouring
+   * quotes tore "backend/migrations/014 add col.sql" into three tokens and kept
+   * "backend/migrations/014" — a path that exists nowhere, so the lock could never
+   * match. That directly undid the push hook's core.quotePath=false fix: git was
+   * finally emitting space-bearing migration paths and the parser could not
+   * represent them.
+   *
+   * SPLITTING IS CONDITIONAL. Splitting every line picks up b.ts from "- a.ts b.ts"
+   * but also turns origin/main inside a sentence into a lock. So a line becomes a
+   * LIST only when every token is path-shaped; otherwise it is one path plus
+   * commentary, and only when the remainder LOOKS like commentary — parenthesised,
+   * dashed, or a single trailing word. "- origin/main is my upstream" is prose and
+   * yields nothing. */
   const clean = (t) => t.trim()
     .replace(/^["']|["']$/g, '')
     .replace(/[,;:]+$/, '')
-    .replace(/^\*\*(.+?)\*\*$/, '$1')   // markdown bold TOKEN, not glob syntax
-    .replace(/^\.\//, '');               // "./src/a.ts" never matched a repo-relative path
+    // Markdown bold ONLY. `**/migrations/**` is a valid glob and must survive, so
+    // refuse to unwrap when the inner text carries path or glob syntax.
+    .replace(/^\*\*(.+?)\*\*$/, (m, inner) => (/[\/\\*]/.test(inner) ? m : inner))
+    .replace(/^\.\//, '');
   const pathish = (t) => Boolean(t)
-    && !/^\(/.test(t)                     // "(released)" / "(none declared yet)"
+    && !/^\(/.test(t)
     && (/[/\\*]/.test(t)
       || /\.[A-Za-z0-9]{1,6}$/.test(t)
       || EXTENSIONLESS.has(t)
-      || (root && existsSync(resolve(root, t))));
+      /* Try the lane's own worktree as well as the main tree. The escape hatch
+       * that admits extensionless locks (`Dockerfile`, `backend`) resolved only
+       * against the main checkout, so a brand-new extensionless file living in a
+       * linked worktree failed the test and was dropped — an under-report, in a
+       * repo with ~110 worktrees. */
+      || (root && existsSync(resolve(root, t)))
+      || (altRoot && existsSync(resolve(altRoot, t))));
+  /* Bracketed comments are the real convention in these lanes — "(all)",
+   * "(whole directory)". A dash is NOT reliable: prose such as
+   * "audit-write-paths.mjs — those belong to the other branch" starts with one and
+   * is a sentence, not an annotation, so it minted a lock for a file the lane was
+   * explicitly disclaiming. Dashes count only when the remainder is short. */
+  const bracketed = /^[([{#]|^\/\//;
+  const dashed = /^(?:[—–]|-{1,2}\s)/;
 
   const locks = body.map((l) => l.trim())
-    .filter((l) => l && !/^```/.test(l))
+    .filter((l) => l && !/^[`]{3}/.test(l))
     .map((l) => l
-      .replace(/^(?:[-*+]\s+|\d+[.)]\s+)/, '')   // bullet or numbered marker
-      .replace(/^\[[ xX]\]\s*/, '')              // checkbox
-      .replace(/`/g, '')                          // backticks; `*` is glob syntax, kept
+      .replace(/^(?:[-*+]\s+|\d+[.)]\s+)/, '')
+      .replace(/^\[[ xX]\]\s*/, '')
+      .replace(/[`]/g, '')
       .trim())
     .flatMap((line) => {
-      const toks = line.split(/[,\s]+/).map(clean).filter(Boolean);
+      // Pull quoted runs out whole so their internal spaces survive the split.
+      const quoted = [];
+      const rest = line.replace(/"([^"]+)"|'([^']+)'/g, (_m, a, b) => {
+        quoted.push(a ?? b);
+        return ' ';
+      });
+      const loose = rest.split(/[,\s]+/).map(clean).filter(Boolean);
+      const toks = [...quoted.map(clean).filter(Boolean), ...loose];
       if (!toks.length) return [];
-      if (toks.length > 1 && toks.every(pathish)) return toks;      // a list of paths
-      return pathish(toks[0]) ? [toks[0]] : [];                     // path + commentary, or prose
+      if (toks.every(pathish)) return toks;                 // a list of paths
+      if (!pathish(toks[0])) return [];                     // prose
+      const remainder = rest.replace(/^\S+\s*/, '').trim();
+      const words = remainder ? remainder.split(/\s+/).length : 0;
+      const looksLikeComment = bracketed.test(remainder) || words <= 1
+        || (dashed.test(remainder) && words <= 4);
+      return looksLikeComment ? [toks[0]] : [];             // path + commentary, else prose
     })
-    .map((t) => t.slice(0, 120));               // lane files are untrusted input
-
+    .map((t) => t.slice(0, 120));                           // lane files are untrusted input
   const heads = [...src.matchAll(/^#{1,6}\s+(.+)$/gm)].map((h) => h[1].trim())
     .filter((h) => !/EDITING NOW/i.test(h));
   const task = (src.match(/^Task:\s*(.+)$/m) || [])[1]?.trim() || heads[0] || '(no task stated)';
-  return { locks, task: task.slice(0, 90) };
+  const idle = /^Status:\s*(idle|released|done)/mi.test(src);
+  return { locks, idle, task: task.slice(0, 90) };
+}
+
+/** What a lane is holding RIGHT NOW — the question every consumer actually asks.
+ *
+ *  This exists because the two consumers disagreed. `digest` applied the idle check
+ *  (a lane declaring `Status: idle` holds nothing, whatever its body still says)
+ *  while the push hook called `parseLane` directly and did not — so a released lane
+ *  was invisible in the digest yet still produced a lock-clash warning on push. A
+ *  writer and a reader disagreeing about the same format produced the two worst bugs
+ *  in this module already; one definition is the only fix that stays fixed.
+ *
+ *  Deliberately NOT folded into `parseLane`: release() verifies its own work by
+ *  re-parsing the cleared text, and that text says `Status: idle`, so an idle-aware
+ *  parse would return [] and make the verification vacuously pass. release() needs
+ *  the RAW parse; everyone else needs this. */
+export function activeLocks(src, root = null) {
+  const { locks, idle } = parseLane(src, root);
+  return idle ? [] : locks;
 }
 
 /** Every lane in the canonical ledger, with freshness from file mtime. */
@@ -193,13 +244,7 @@ export function readLanes(ledger, selfName = null) {
   return readdirSync(ledger).filter((f) => f.endsWith('.lane.md')).map((file) => {
     const path = resolve(ledger, file);
     const raw = readFileSync(path, 'utf8');
-    const { locks, task } = parseLane(raw, root);
-    /* A lane that declares itself idle is not holding locks, whatever its body
-     * still contains. release() bumps mtime, so a clear that only half-worked
-     * would otherwise convert stale phantom locks into FRESH ones for another
-     * FRESH_MIN minutes — released work reappearing as live, *because* release ran.
-     * Trust the declared status as well as the parsed body. */
-    const idle = /^Status:\s*(idle|released|done)/mi.test(raw);
+    const { locks, idle, task } = parseLane(raw, root);
     return {
       file,
       self: file === selfName,
diff --git a/scripts/tree-sentinel.mjs b/scripts/tree-sentinel.mjs
index dd60467d5..4ac5195e7 100644
--- a/scripts/tree-sentinel.mjs
+++ b/scripts/tree-sentinel.mjs
@@ -24,7 +24,7 @@
  */
 import { execSync } from 'node:child_process';
 import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
-import { ledgerDir, parseLane, FRESH_MIN } from './lib/lane-core.mjs';
+import { ledgerDir, activeLocks, FRESH_MIN } from './lib/lane-core.mjs';
 
 const ROOT = process.cwd();
 const JSON_MODE = process.argv.includes('--json');
@@ -93,6 +93,11 @@ for (const [idx, wt] of worktrees.entries()) {
     const [behind, ahead] = counts.split(/\s+/).map(Number);
     wt.behind = behind;
     wt.ahead = ahead;
+  } else {
+    /* A failed rev-list used to leave `ahead` undefined; `undefined === 0` is false,
+     * so every worktree fell through to UNMERGED and printed "+undefined ahead" in
+     * the tool whose output drives cleanup decisions. Unknown is its own state. */
+    wt.ahead = null;
   }
   if (FAST) {
     wt.dirty = -1; // not checked in fast mode
@@ -105,6 +110,7 @@ for (const [idx, wt] of worktrees.entries()) {
   // hide its branch from the UNMERGED list (bug caught 2026-07-21 final audit).
   if (wt.isPrimary) wt.klass = 'MAIN-TREE';
   else if (wt.detached) wt.klass = wt.dirty > 0 ? 'DETACHED-DIRTY' : 'DETACHED';
+  else if (wt.ahead === null) wt.klass = 'AHEAD-UNKNOWN';
   else if (wt.ahead === 0)
     // dirty unknown (--fast) → plain MERGED, never claim CLEAN without checking (Rule 19)
     wt.klass = wt.dirty === 0 ? 'MERGED-CLEAN' : wt.dirty > 0 ? 'MERGED-DIRTY' : 'MERGED';
@@ -130,7 +136,11 @@ for (const file of laneFiles) {
    * release() rewrite bumps it) — it is simply harder to get wrong by accident,
    * which is the actual failure mode here. Advisory either way. */
   const ageMin = Math.round((Date.now() - statSync(lanePath).mtimeMs) / 60000);
-  const { locks } = parseLane(readFileSync(lanePath, 'utf8'), `${LEDGER_DIR}/../..`);
+  /* activeLocks, not parseLane: a lane declaring itself idle holds nothing. The
+   * digest and the push hook were fixed to honour that; this file was the THIRD
+   * consumer and was left behind, so a released lane still showed locks here —
+   * the same two-readers-disagree bug, one file over. One helper, all three. */
+  const locks = activeLocks(readFileSync(lanePath, 'utf8'), `${LEDGER_DIR}/../..`);
   // Back-compat: `laneLocks[agent]` keeps its original string | string[] shape for
   // any existing --json consumer; freshness rides alongside in `laneAges`.
   lanes[agent] = locks.length ? locks : 'released';
```

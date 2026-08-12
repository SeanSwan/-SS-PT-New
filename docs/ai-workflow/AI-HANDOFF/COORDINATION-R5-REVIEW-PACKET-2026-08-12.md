# Round-5 hostile review — the code I wrote IN RESPONSE to your round-4 review

**Reviewers:** Kimi K3, Tencent HY3 · **Live on `main`** (`e70591b88`, deployed, health 200).

## Why this pass exists, and where to aim

Four passes have run on this system today. You have already fixed the design, the
implementation, the shipped v2.3, and then v2.4. **This pass targets the v2.4 delta itself
— the ~320 lines I wrote in response to your last review.**

That is the highest-yield target because of a measured pattern: **in three of four rounds,
the code I wrote to fix a review finding introduced a NEW defect.** Documented instances,
all mine, all caught after the "fix" was written:
- Fixing prose-as-locks → dropped extensionless and bare-directory locks (`Dockerfile`).
- Fixing comma-splitting → whitespace-splitting turned `origin/main` inside a prose
  sentence into a lock.
- Fixing markdown bold → kept `*` for globs, so `**Nothing.**` passed the shape test.
- Extracting a shared parser → reintroduced the `$`-under-`/m` bug that made it return 1
  lock for a lane holding 186.
- A patch script wrote literal BACKSPACE bytes where `\b` belonged: compiled, passed
  `node --check`, displayed correctly under grep, matched nothing.

So: **assume the round-4 fixes contain a round-5 defect.** Attack the new code, not the old.

## Round-4 fixes now in the code — each is a candidate regression site
1. **Session identity** — `laneName` gained a `CLAUDE_CODE_SESSION_ID` suffix.
2. **Conditional splitting** — a lock line splits into multiple locks ONLY when every token
   is path-shaped; otherwise first-token-only; otherwise nothing.
3. **Glob compilation** — `*` → `[^/]*`, `**` → `.*`, trailing subtree only when the pattern
   asked for it.
4. **Section terminator** — ends at a same-or-higher-level heading, not any heading.
5. **release()** — clears the whole section to its terminator; verifies via `parseLane`.
6. **`idle` guard** — `readLanes` zeroes locks for a lane declaring `Status: idle`.
7. **Deploy-ref detection** — strips `refs/heads/`, and ignores the current branch when the
   command names an explicit target.
8. **`-C` / `--git-dir`** — analysis runs against the named repo.
9. **`core.quotePath=false`**, **extensionless allowlist**, **`./` stripping**,
   **10-hex path hash**, **`${CLAUDE_PROJECT_DIR:-.}` wiring**.

## Rejected last round, with evidence — do not re-raise without new proof
- "Use `..` instead of `...`" — **would have broken the guard**: three-dot yields the 16
  files actually being pushed; two-dot yields 2, hiding 14. Verified on a real branch.
- "The banner always fires on any push to main" — does not reproduce; `targetsDeployRef` is
  not in the early-return guard.

## Settled design — not open
Advisory not blocking; no Stop-hook freshness gate; no committed delivery log; locks are
broadcast not exclusion; branch protection is the real control.

## Environment
Windows 11, Git Bash, Node ESM, CRLF in places. ~110 worktrees, many concurrent agents.
Gitignored ledger at `<git-common-dir>/../.ai-workflow/coordination/`. Hooks: stdin
`{tool_name, tool_input}`, exit 0 = allow, must never break a push. `render.yaml` build runs
`npm run migrate:production`.

## Remit
1. **Find the regression in the round-4 fixes.** Interaction between fixes 1–9 counts.
2. **Where do two of these fixes disagree with each other?** The last two rounds' worst bugs
   were a writer and a reader disagreeing about the same format.
3. **Anything that reports success while doing nothing.** Founding failure class.
4. **`tree-sentinel.mjs` and `lane-session-start.mjs`** — least-reviewed files here.
5. **Is any of this worth reverting**, or is it all patchable?

Rank by cost × likelihood. Cite file + line. Say nothing about what is fine.

---

## THE v2.4 DELTA — the code written in response to your last review

```diff
diff --git a/.claude/settings.json b/.claude/settings.json
index 97f5e077e..050abddc3 100644
--- a/.claude/settings.json
+++ b/.claude/settings.json
@@ -310,8 +310,8 @@
         "hooks": [
           {
             "type": "command",
-            "command": "node scripts/hooks/push-blast-radius.mjs",
-            "timeout": 15
+            "command": "node \"${CLAUDE_PROJECT_DIR:-.}/scripts/hooks/push-blast-radius.mjs\"",
+            "timeout": 30
           }
         ]
       }
@@ -325,8 +325,8 @@
           },
           {
             "type": "command",
-            "command": "node scripts/hooks/lane-session-start.mjs",
-            "timeout": 15
+            "command": "node \"${CLAUDE_PROJECT_DIR:-.}/scripts/hooks/lane-session-start.mjs\"",
+            "timeout": 30
           }
         ]
       }
diff --git a/scripts/hooks/push-blast-radius.mjs b/scripts/hooks/push-blast-radius.mjs
index 85fb38f18..d64156417 100644
--- a/scripts/hooks/push-blast-radius.mjs
+++ b/scripts/hooks/push-blast-radius.mjs
@@ -56,17 +56,38 @@ function main() {
   /* `push` must be the git SUBCOMMAND, not merely a later word: `git config
    * push.default simple` and `git log --grep=push` both fired the old pattern.
    * Case-insensitive because cmd.exe happily runs `GIT PUSH`. */
-  if (!/\bgit\b(?:\s+(?:-[A-Za-z-]+|--[a-z-]+=\S+|-C\s+\S+|-c\s+\S+))*\s+push\b/i.test(bare)) return;
+  /* Long options with a SEPARATE argument (`--git-dir <path>`, `--work-tree <path>`,
+   * `--namespace <n>`) matched none of the branches. Detection then depended on an
+   * accident of backtracking rather than on the pattern being right. */
+  if (!/\bgit\b(?:\s+(?:--(?:git-dir|work-tree|namespace|exec-path)[= ]\S+|-[Cc]\s+\S+|--?[A-Za-z][A-Za-z-]*(?:=\S+)?))*\s+push\b/i.test(bare)) return;
 
-  const branch = sh('git rev-parse --abbrev-ref HEAD');
+  /* `git -C <dir> push` operates on ANOTHER repository. Analysing the current
+   * directory instead reported the wrong branch, the wrong diff and the wrong
+   * deploy-linked verdict, with no hint that it had done so — verified:
+   * `git -C C:/tmp/ss-apex push` printed this repo's branch. Honour -C. */
+  const dashC = bare.match(/\s-C\s+("?)([^\s"]+)\1/);
+  const REPO = dashC && existsSync(dashC[2]) ? dashC[2] : process.cwd();
+  const shx = (cmd) => sh(cmd, REPO);
+
+  const branch = shx('git rev-parse --abbrev-ref HEAD');
   const ref = safeRef(branch || '');
   /* `-f` combined into a cluster (`-uf`, `-fv`) was undetected. */
   const forced = /--force(?!-with-lease)\b|(?:^|\s)-[A-Za-z]*f[A-Za-z]*(?:\s|$)/i.test(bare);
   const leased = /--force-with-lease/i.test(bare);
   /* Token-exact: `\b(main)\b` flagged `feature/main-fix` and `production-notes`,
    * because `-` and `/` are non-word chars. Match whole ref tokens only. */
-  const targetsDeployRef = /(?:^|[\s:])(?:origin\/)?(main|master|production)(?:\s|$)/i.test(bare)
-    || ['main', 'master', 'production'].includes(branch || '');
+  /* Strip ref namespaces first: `HEAD:refs/heads/main` has `main` preceded by `/`,
+   * so the token test missed it and a push straight at production carried no
+   * DEPLOY-LINKED flag. And do NOT infer deploy-linked from the CURRENT branch
+   * when the command names an explicit target — sitting on `main` while pushing a
+   * feature branch produced the production lecture for no reason. */
+  const deRef = bare.replace(/refs\/(heads|remotes|tags)\//gi, '').replace(/origin\//gi, ' ');
+  const deployRefNamed = /(?:^|[\s:\/])(main|master|production)(?:\s|$)/i.test(deRef);
+  const pushIdx = bare.split(/\s+/).findIndex((t) => /^push$/i.test(t));
+  const pushArgs = pushIdx === -1 ? [] : bare.split(/\s+/).slice(pushIdx + 1).filter((t) => !t.startsWith("-"));
+  const namesAnyRef = pushArgs.length > 1;
+  const targetsDeployRef = deployRefNamed
+    || (!namesAnyRef && ['main', 'master', 'production'].includes(branch || ''));
 
   /* An explicit refspec, --all, or a tag push means the range below (which is
    * HEAD-based) is NOT what is being pushed. Disclose rather than mislead. */
@@ -76,16 +97,24 @@ function main() {
    * reassuring silence on a push to main. Detect the switch and say the analysis
    * cannot be trusted. */
   const switchesBranch = /\b(checkout|switch|merge|reset|rebase)\b[\s\S]*\bpush\b/i.test(bare);
-  const explicitRefspec = /\s\S+:\S+/.test(bare) || /\s--all\b|\s--tags\b|\s--mirror\b/i.test(bare);
+  /* A refspec is `src:dst`. `C:/tmp/x` is a Windows path, and matching it as a
+   * refspec fired the warning on any git command carrying an absolute path —
+   * a false positive on one of the most common shapes in this repo. Exclude
+   * single-letter drive prefixes. */
+  const refspecToken = bare.split(/\s+/).some((t) => /^[^:]+:[^:]+$/.test(t) && !/^[A-Za-z]:[\\/]/.test(t));
+  const explicitRefspec = refspecToken || /\s--all\b|\s--tags\b|\s--mirror\b/i.test(bare);
 
   let changed = null;
   let rangeNote = '';
   if (ref) {
-    const remoteRef = sh(`git rev-parse --verify --quiet origin/${ref}`) ? `origin/${ref}` : 'origin/main';
+    const remoteRef = shx(`git rev-parse --verify --quiet origin/${ref}`) ? `origin/${ref}` : 'origin/main';
     /* sh() returns NULL on failure and '' on empty. Conflating them made this
      * fail-open: a failed `git diff` looked like "nothing to push" and the hook
      * returned silently on a migration push. */
-    const raw = sh(`git diff --name-only ${remoteRef}...HEAD`);
+    /* `-c core.quotePath=false`: git C-quotes paths with spaces or non-ASCII by
+     * default, so `"backend/migrations/014 add col.sql"` matched no anchored
+     * pattern — the hook's own worst case, a migration push, produced nothing. */
+    const raw = shx(`git -c core.quotePath=false diff --name-only ${remoteRef}...HEAD`);
     if (raw === null) rangeNote = `⚠ could not compute the diff against ${remoteRef} — this check did NOT run.`;
     else changed = raw.split('\n').filter(Boolean);
   } else {
@@ -118,6 +147,7 @@ function main() {
 
   const out = ['⚠ PUSH BLAST RADIUS — read before you confirm this push.', ''];
   out.push(`branch: ${branch || '(unknown)'}${targetsDeployRef ? '   ⚠ DEPLOY-LINKED' : ''}`);
+  if (REPO !== process.cwd()) out.push(`repo:   ${REPO}  (via -C — analysed there, not here)`);
   if (rangeNote) out.push(`🟠 ${rangeNote}  Treat the file list below as INCOMPLETE.`);
   if (switchesBranch) {
     out.push('🟠 this command changes branch before pushing. Everything below describes the');
@@ -130,7 +160,9 @@ function main() {
   if (forced) out.push("🔴 FORCE PUSH without --force-with-lease — can destroy another agent's pushed commits.");
   else if (leased) out.push('🟠 force-with-lease — history rewrite; safe only if you know what the remote holds.');
   if (hits.length) {
-    out.push('', `🔴 ${hits.length} file(s) in this range are EXECUTED by automation on deploy:`);
+    out.push('', targetsDeployRef
+      ? `🔴 ${hits.length} file(s) in this range are EXECUTED by automation on deploy:`
+      : `🟠 ${hits.length} file(s) in this range WOULD be executed by automation once this reaches a deploy-linked branch:`);
     for (const h of hits.slice(0, 12)) out.push(`   ${h.f}  → ${h.what}`);
     if (hits.length > 12) out.push(`   … +${hits.length - 12} more`);
     if (targetsDeployRef && hits.some((h) => /migration|seeder|SQL/i.test(h.what))) {
diff --git a/scripts/lane.mjs b/scripts/lane.mjs
index 1eecba544..482dedc22 100644
--- a/scripts/lane.mjs
+++ b/scripts/lane.mjs
@@ -27,7 +27,7 @@
  */
 import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, statSync, writeFileSync, appendFileSync, unlinkSync } from 'node:fs';
 import { resolve } from 'node:path';
-import { FRESH_MIN, sh, normPath, samePath, ledgerDir, identity, safeRef, readLanes } from './lib/lane-core.mjs';
+import { FRESH_MIN, sh, normPath, samePath, ledgerDir, identity, safeRef, readLanes, parseLane } from './lib/lane-core.mjs';
 
 const ARGV = process.argv.slice(2);
 const CMD = ARGV[0] ?? 'digest';
@@ -146,19 +146,32 @@ function release() {
   const head = lines.findIndex((l) => /^#{1,6}\s.*EDITING NOW/i.test(l));
   let removed = 0;
   if (head !== -1) {
+    /* Clear the WHOLE section to its terminator, not just lines starting with `- `.
+     * parseLane accepts `*`/`+` bullets, numbered lists, checkboxes and bare lines
+     * inside fenced blocks; release only understood `- `, so a lane written in any
+     * other format kept every lock while printing "released" — the parser and the
+     * releaser disagreeing about what a lock is, which is the phantom-lock class. */
+    const level = (lines[head].match(/^#+/) || ['#'])[0].length;
     let end = head + 1;
-    while (end < lines.length && (lines[end].trim() === '' || lines[end].trim().startsWith('- '))) {
-      if (lines[end].trim().startsWith('- ')) removed += 1;
+    while (end < lines.length) {
+      const t = lines[end].trim();
+      const m = t.match(/^(#{1,6})\s/);
+      if (m && m[1].length <= level) break;        // same-or-higher heading
+      if (/^[A-Z][a-z]+ intent:/.test(t)) break;   // "Next intent:"
+      if (t) removed += 1;
       end += 1;
     }
     lines.splice(head + 1, end - (head + 1), '- (released)', '');
   }
   const cleared = lines.join(eol);
-  const leftover = cleared.split(/\r?\n/)
-    .slice(head + 1, head + 1 + removed + 2)
-    .filter((l) => l.trim().startsWith('- ') && !/\(released\)/.test(l));
-  if (head === -1 || leftover.length) {
-    console.error('[lane] WARNING: lock list may not have cleared — verify the lane file by hand.');
+  /* Verify with the SAME parser every other consumer uses, rather than a
+   * bullet-prefix heuristic. The old check only looked for `- ` lines, so it
+   * agreed with a releaser that had the identical blind spot and passed while
+   * locks remained. Ask the authority: does anything still parse as a lock? */
+  const stillLocked = parseLane(cleared, resolve(LEDGER, '..', '..')).locks;
+  if (head === -1 || stillLocked.length) {
+    console.error(`[lane] WARNING: ${stillLocked.length} lock(s) still parse after release — verify by hand:`);
+    for (const l of stillLocked.slice(0, 5)) console.error(`[lane]   ${l}`);
   }
   if (statSync(LANE_PATH).mtimeMs !== mtimeAtRead) {
     console.error('[lane] ABORTED release: the lane changed while I was reading it — a concurrent');
diff --git a/scripts/lib/lane-core.mjs b/scripts/lib/lane-core.mjs
index 29cd35fa1..7c2e197b0 100644
--- a/scripts/lib/lane-core.mjs
+++ b/scripts/lib/lane-core.mjs
@@ -84,7 +84,22 @@ export function identity(cwd = process.cwd()) {
     const short = createHash('sha1').update(full.toLowerCase()).digest('hex').slice(0, 10);
     slug = `${basename(full)}-${short}`;
   }
-  return { agent, top: normPath(top || cwd), isMain, slug, laneName: `${agent}--${slug}.lane.md` };
+  /* SESSION discriminator, not just worktree. agent+worktree alone meant two
+   * concurrent sessions in the SAME worktree shared one lane file — and the main
+   * tree is the common case, so this quietly recreated the last-writer-wins
+   * clobbering that this naming scheme exists to prevent, in the one place
+   * concurrency is most likely. The doc promised "one lane per SESSION"; without
+   * this it delivered one lane per worktree. Falls back to the old shape when no
+   * session id is available, which is no worse than before. */
+  const sid = process.env.CLAUDE_CODE_SESSION_ID || process.env.CLAUDE_SESSION_ID || '';
+  const sess = sid ? `-s${sid.replace(/[^A-Za-z0-9]/g, '').slice(0, 8)}` : '';
+  return {
+    agent,
+    top: normPath(top || cwd),
+    isMain,
+    slug: `${slug}${sess}`,
+    laneName: `${agent}--${slug}${sess}.lane.md`,
+  };
 }
 
 /** Git refnames may legally contain `$ ( ) ; \`` — all shell-active. Refuse to
@@ -111,9 +126,16 @@ export function parseLane(src, root = null) {
   const head = all.findIndex((l) => /^#{1,6}\s.*EDITING NOW/i.test(l));
   const body = [];
   if (head !== -1) {
+    /* The section ends at a heading of the SAME OR HIGHER level, not at ANY
+     * heading. Breaking on any `#` meant a lane that groups its locks under
+     * sub-headings — `## EDITING NOW` / `### backend` / `- a.ts` — parsed to ZERO
+     * locks, the whole section invisible. Sub-headings are structure WITHIN the
+     * section, not the end of it. */
+    const level = (all[head].match(/^#+/) || ['#'])[0].length;
     for (let i = head + 1; i < all.length; i += 1) {
       const t = all[i].trim();
-      if (/^#{1,6}\s/.test(t)) break;            // next heading ends the section
+      const m = t.match(/^(#{1,6})\s/);
+      if (m && m[1].length <= level) break;      // same-or-higher heading ends it
       if (/^[A-Z][a-z]+ intent:/.test(t)) break; // "Next intent:" ends it
       body.push(all[i]);
     }
@@ -122,52 +144,42 @@ export function parseLane(src, root = null) {
    * parse to ZERO locks: the live claude.lane.md listed its locked paths inside a
    * fenced code block, so an entire locked directory tree was invisible to every
    * consumer. Agents also write `*`/`+` bullets, numbered lists and `- [ ]`
-   * checkboxes. Accept any line, strip whatever list/fence decoration it carries,
-   * and let the path-shape test below decide — that test is what keeps prose out,
-   * so being liberal about decoration costs nothing.
+   * checkboxes. Accept any line, strip whatever list decoration it carries, and
+   * let the path-shape test decide.
    *
-   * The path-shape test is load-bearing in the other direction: agents write prose
-   * bullets in the lock section ("- I work in an isolated worktree and rebase onto
-   * origin/main before each push,") which rendered verbatim under "DO NOT edit
-   * these". It also drops the `(released)` / `(none declared yet)` placeholders
-   * that release() and claim() write. An entry that cannot match a file path
-   * cannot do a lock's job, and false locks are what train a reader to ignore the
-   * digest. Trailing commentary is dropped: "docs/x.md (new, mine only)" → "docs/x.md". */
+   * SPLITTING IS CONDITIONAL, and that condition is load-bearing in both directions.
+   * Splitting every line on whitespace picks up `b.ts` from `- a.ts b.ts` (good) but
+   * also turns `origin/main` inside a prose sentence into a lock (bad — verified
+   * regression). Splitting on commas only does the reverse. So: a line becomes a
+   * LIST only when every token on it is path-shaped; otherwise it is treated as one
+   * path plus commentary, and prose yields nothing at all. */
+  const clean = (t) => t.trim()
+    .replace(/^["']|["']$/g, '')
+    .replace(/[,;:]+$/, '')
+    .replace(/^\*\*(.+?)\*\*$/, '$1')   // markdown bold TOKEN, not glob syntax
+    .replace(/^\.\//, '');               // "./src/a.ts" never matched a repo-relative path
+  const pathish = (t) => Boolean(t)
+    && !/^\(/.test(t)                     // "(released)" / "(none declared yet)"
+    && (/[/\\*]/.test(t)
+      || /\.[A-Za-z0-9]{1,6}$/.test(t)
+      || EXTENSIONLESS.has(t)
+      || (root && existsSync(resolve(root, t))));
+
   const locks = body.map((l) => l.trim())
     .filter((l) => l && !/^```/.test(l))
     .map((l) => l
       .replace(/^(?:[-*+]\s+|\d+[.)]\s+)/, '')   // bullet or numbered marker
-      .replace(/^\[[ xX]\]\s*/, '')               // checkbox
-      // Strip backticks only. `*` is NOT decoration here — it is glob syntax
-      // (`docs/x/**`, `services/contentStudio*`), and stripping it silently
-      // narrowed a directory-wide claim to a single nonexistent path. Markdown
-      // bold like `**Nothing.**` survives this but is dropped by the path test.
-      .replace(/`/g, '')
+      .replace(/^\[[ xX]\]\s*/, '')              // checkbox
+      .replace(/`/g, '')                          // backticks; `*` is glob syntax, kept
       .trim())
-    // A bullet may list several comma-separated files ("- a.ts, b.ts").
-    .flatMap((l) => l.split(','))
-    .map((l) => l.trim().replace(/^["']|["']$/g, '').split(/\s+/)[0].replace(/[,;:]+$/, ''))
-    /* Strip a fully-wrapped `**bold**` TOKEN. This has to run on the token, not the
-     * line: `- **Nothing.** Every slice is pushed.` is not wrapped as a whole, but
-     * its first token is — and because `*` is kept for globs, that token otherwise
-     * passed the shape test and rendered as a lock. */
-    .map((l) => l.replace(/^\*\*(.+?)\*\*$/, '$1'))
-    .map((l) => l.replace(/^\.\//, ''))   // "./src/a.ts" never matched a repo-relative path
-    .filter(Boolean)
-    .filter((l) => !/^\(/.test(l))
-    /* Shape test, plus two escape hatches. The shape test alone silently dropped
-     * the BROADEST locks an agent can declare — `- docs`, `- backend`, and
-     * crucially `- Dockerfile`, which is itself in the push hook's
-     * executes-on-deploy list. The ledger would have reported "clear" on exactly
-     * the files that trigger a production migration. Extensionless real paths are
-     * admitted by an existence check when we know the repo root, and by a small
-     * list of conventional extensionless files when we do not. Prose still fails
-     * all three ("work", "isolated", "rebase" are neither paths nor files). */
-    .filter((l) => /[/\\*]/.test(l)
-      || /\.[A-Za-z0-9]{1,6}$/.test(l)
-      || EXTENSIONLESS.has(l)
-      || (root && existsSync(resolve(root, l))))
-    .map((l) => l.slice(0, 120)); // lane files are untrusted input
+    .flatMap((line) => {
+      const toks = line.split(/[,\s]+/).map(clean).filter(Boolean);
+      if (!toks.length) return [];
+      if (toks.length > 1 && toks.every(pathish)) return toks;      // a list of paths
+      return pathish(toks[0]) ? [toks[0]] : [];                     // path + commentary, or prose
+    })
+    .map((t) => t.slice(0, 120));               // lane files are untrusted input
+
   const heads = [...src.matchAll(/^#{1,6}\s+(.+)$/gm)].map((h) => h[1].trim())
     .filter((h) => !/EDITING NOW/i.test(h));
   const task = (src.match(/^Task:\s*(.+)$/m) || [])[1]?.trim() || heads[0] || '(no task stated)';
@@ -180,12 +192,20 @@ export function readLanes(ledger, selfName = null) {
   const root = resolve(ledger, '..', '..');
   return readdirSync(ledger).filter((f) => f.endsWith('.lane.md')).map((file) => {
     const path = resolve(ledger, file);
-    const { locks, task } = parseLane(readFileSync(path, 'utf8'), root);
+    const raw = readFileSync(path, 'utf8');
+    const { locks, task } = parseLane(raw, root);
+    /* A lane that declares itself idle is not holding locks, whatever its body
+     * still contains. release() bumps mtime, so a clear that only half-worked
+     * would otherwise convert stale phantom locks into FRESH ones for another
+     * FRESH_MIN minutes — released work reappearing as live, *because* release ran.
+     * Trust the declared status as well as the parsed body. */
+    const idle = /^Status:\s*(idle|released|done)/mi.test(raw);
     return {
       file,
       self: file === selfName,
       ageMin: Math.round((Date.now() - statSync(path).mtimeMs) / 60000),
-      locks,
+      locks: idle ? [] : locks,
+      idle,
       task,
     };
   });
@@ -206,7 +226,13 @@ export function lockMatches(changedPath, lock) {
     const body = raw.split('**')
       .map((seg) => seg.split('*').map(esc).join('[^/]*'))
       .join('.*');
-    return new RegExp(`^${body}(?:/.*)?$`).test(c);
+    /* Only `**` may cross a directory boundary. The unconditional `(?:/.*)?` made
+     * `src/*` match `src/foo/bar`, silently widening a single-level claim into the
+     * whole subtree — an over-report, and over-reports are what teach a reader to
+     * ignore the digest. A trailing subtree match is allowed only when the pattern
+     * actually asked for one. */
+    const subtree = raw.includes('**') || raw.endsWith('/');
+    return new RegExp(`^${body}${subtree ? '(?:/.*)?' : ''}$`).test(c);
   }
   const stem = raw.replace(/\/+$/, '');
   if (!stem) return false;
```

---

## `scripts/tree-sentinel.mjs` — full current file (192 lines)

```javascript
     1	#!/usr/bin/env node
     2	/**
     3	 * tree-sentinel.mjs — read-only working-tree + worktree health digest
     4	 * ===================================================================
     5	 * The "don't step on each other's toes" sentinel (Linear-todo workflow, 2026-07-21).
     6	 * Prints a deterministic digest an agent (or Hermes) can read, diff, or post to a
     7	 * Linear issue comment. NEVER writes, deletes, prunes, or touches git state
     8	 * (Rule 34 / Rule 47 read-only doctrine — cleanup is a separate Sean-gated pass).
     9	 *
    10	 * Reports:
    11	 *  1. Main-tree dirty files, grouped by top-level dir (the "dirty files sitting
    12	 *     around" risk before any push).
    13	 *  2. Worktree inventory: branch, ahead/behind origin/main, dirty count, and a
    14	 *     MERGED/UNMERGED/STALE classification.
    15	 *  3. Rule-67 lane locks (who has files claimed right now).
    16	 *
    17	 * Usage:  node scripts/tree-sentinel.mjs [--json] [--fast] [--no-fetch]
    18	 *   --fast      skip per-worktree dirty checks (1 git call per worktree instead of 2) —
    19	 *               use for session-start orientation; full mode before pushes/cleanup decisions.
    20	 *   --no-fetch  skip the freshness fetch of origin/main (offline / speed). Without a fresh
    21	 *               origin/main the MERGED/UNMERGED classification can be WRONG — a merged
    22	 *               branch reads UNMERGED against a stale ref. The digest reports which mode ran.
    23	 * Exit codes: 0 = ran (digest printed). 2 = git unavailable. Never fails on findings.
    24	 */
    25	import { execSync } from 'node:child_process';
    26	import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
    27	import { ledgerDir, parseLane, FRESH_MIN } from './lib/lane-core.mjs';
    28	
    29	const ROOT = process.cwd();
    30	const JSON_MODE = process.argv.includes('--json');
    31	const FAST = process.argv.includes('--fast');
    32	/** Windows-safe path identity: forward slashes + lowercase drive/case-insensitive FS. */
    33	const norm = (p) => p.replace(/\\/g, '/').toLowerCase();
    34	
    35	const sh = (cmd, cwd = ROOT) => {
    36	  try {
    37	    return execSync(cmd, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
    38	  } catch {
    39	    return null;
    40	  }
    41	};
    42	
    43	if (sh('git rev-parse --git-dir') === null) {
    44	  console.error('tree-sentinel: not a git repository (or git unavailable)');
    45	  process.exit(2);
    46	}
    47	
    48	/* Freshness: classification diffs against origin/main — refresh the ref unless opted out.
    49	   `git fetch` updates remote-tracking refs only (no worktree/index writes) → still read-only
    50	   in the Rule-34 sense. Failure (offline) degrades gracefully and is disclosed. */
    51	const NO_FETCH = process.argv.includes('--no-fetch');
    52	const fetched = NO_FETCH ? 'skipped (--no-fetch)' : sh('git fetch origin main --quiet') !== null ? 'fresh' : 'FAILED (offline?) — counts may be stale';
    53	
    54	/* ---------- 1. main-tree dirty files, grouped ---------- */
    55	const porcelain = sh('git status --porcelain') ?? '';
    56	const dirty = porcelain ? porcelain.split('\n') : [];
    57	const byDir = {};
    58	for (const line of dirty) {
    59	  const p = line.slice(3).replace(/^"|"$/g, '');
    60	  const top = p.includes('/') ? p.split('/')[0] : '(root)';
    61	  byDir[top] = (byDir[top] ?? 0) + 1;
    62	}
    63	
    64	/* ---------- 2. worktree inventory ---------- */
    65	const wtRaw = sh('git worktree list --porcelain') ?? '';
    66	const worktrees = [];
    67	let cur = null;
    68	for (const line of wtRaw.split('\n')) {
    69	  if (line.startsWith('worktree ')) {
    70	    if (cur) worktrees.push(cur);
    71	    cur = { path: line.slice(9), branch: null, detached: false };
    72	  } else if (line.startsWith('branch ')) {
    73	    if (cur) cur.branch = line.slice(7).replace('refs/heads/', '');
    74	  } else if (line === 'detached') {
    75	    if (cur) cur.detached = true;
    76	  }
    77	}
    78	if (cur) worktrees.push(cur);
    79	
    80	for (const [idx, wt] of worktrees.entries()) {
    81	  // git worktree list always emits the primary tree first — positional, not cwd-dependent,
    82	  // so the label is correct even when the sentinel runs from inside a linked worktree.
    83	  wt.isPrimary = idx === 0;
    84	  wt.exists = existsSync(wt.path);
    85	  if (!wt.exists) {
    86	    wt.klass = 'MISSING-DIR';
    87	    continue;
    88	  }
    89	  const counts = wt.branch
    90	    ? sh(`git rev-list --left-right --count origin/main...${JSON.stringify(wt.branch)}`)
    91	    : null;
    92	  if (counts) {
    93	    const [behind, ahead] = counts.split(/\s+/).map(Number);
    94	    wt.behind = behind;
    95	    wt.ahead = ahead;
    96	  }
    97	  if (FAST) {
    98	    wt.dirty = -1; // not checked in fast mode
    99	  } else {
   100	    const wtDirty = sh('git status --porcelain', wt.path);
   101	    wt.dirty = wtDirty === null ? -1 : wtDirty ? wtDirty.split('\n').length : 0;
   102	  }
   103	  // Positional ONLY: the primary tree is always listed first by git. Do NOT also match
   104	  // cwd — running from a linked worktree would mislabel that worktree MAIN-TREE and
   105	  // hide its branch from the UNMERGED list (bug caught 2026-07-21 final audit).
   106	  if (wt.isPrimary) wt.klass = 'MAIN-TREE';
   107	  else if (wt.detached) wt.klass = wt.dirty > 0 ? 'DETACHED-DIRTY' : 'DETACHED';
   108	  else if (wt.ahead === 0)
   109	    // dirty unknown (--fast) → plain MERGED, never claim CLEAN without checking (Rule 19)
   110	    wt.klass = wt.dirty === 0 ? 'MERGED-CLEAN' : wt.dirty > 0 ? 'MERGED-DIRTY' : 'MERGED';
   111	  else wt.klass = wt.dirty > 0 ? 'UNMERGED-DIRTY' : 'UNMERGED';
   112	}
   113	
   114	/* ---------- 3. Rule-67 lane locks ---------- */
   115	/* Was a hardcoded ['claude','codex'] resolved against process.cwd(). Two bugs:
   116	 * (a) ten lane files exist, so six agents' locks were invisible to the tool whose
   117	 * job is reporting locks; (b) cwd resolution reads a WORKTREE-LOCAL ledger, which
   118	 * is how nine published claims ended up unreadable. Glob the canonical ledger. */
   119	const LEDGER_DIR = ledgerDir(ROOT);
   120	const lanes = {};
   121	const laneAges = {};
   122	const laneFiles = LEDGER_DIR && existsSync(LEDGER_DIR)
   123	  ? readdirSync(LEDGER_DIR).filter((f) => f.endsWith('.lane.md'))
   124	  : [];
   125	for (const file of laneFiles) {
   126	  const agent = file.replace(/\.lane\.md$/, '');
   127	  const lanePath = `${LEDGER_DIR}/${file}`;
   128	  /* Freshness from mtime, not the agent-authored `Updated:` prose — a model can
   129	   * hallucinate a timestamp. mtime is not unforgeable (`touch` exists, and a
   130	   * release() rewrite bumps it) — it is simply harder to get wrong by accident,
   131	   * which is the actual failure mode here. Advisory either way. */
   132	  const ageMin = Math.round((Date.now() - statSync(lanePath).mtimeMs) / 60000);
   133	  const { locks } = parseLane(readFileSync(lanePath, 'utf8'), `${LEDGER_DIR}/../..`);
   134	  // Back-compat: `laneLocks[agent]` keeps its original string | string[] shape for
   135	  // any existing --json consumer; freshness rides alongside in `laneAges`.
   136	  lanes[agent] = locks.length ? locks : 'released';
   137	  laneAges[agent] = ageMin;
   138	}
   139	
   140	/* ---------- output ---------- */
   141	const summary = {
   142	  generatedAt: new Date().toISOString(),
   143	  originMainRef: fetched,
   144	  currentTreePath: ROOT,
   145	  currentTreeDirty: dirty.length,
   146	  currentTreeDirtyByDir: byDir,
   147	  worktreeCount: worktrees.length,
   148	  worktreesByClass: worktrees.reduce((acc, w) => {
   149	    acc[w.klass] = (acc[w.klass] ?? 0) + 1;
   150	    return acc;
   151	  }, {}),
   152	  unmergedWorktrees: worktrees
   153	    .filter((w) => w.klass?.startsWith('UNMERGED'))
   154	    .map((w) => ({ path: w.path, branch: w.branch, ahead: w.ahead, dirty: w.dirty })),
   155	  laneLocks: lanes,
   156	  laneAgesMin: laneAges,
   157	  ledgerDir: LEDGER_DIR,
   158	};
   159	
   160	if (JSON_MODE) {
   161	  console.log(JSON.stringify(summary, null, 2));
   162	} else {
   163	  console.log(`# tree-sentinel digest — ${summary.generatedAt}`);
   164	  console.log(`origin/main ref: ${fetched}`);
   165	  // Section 1 scans the CURRENT tree (cwd) — name it honestly; it is the main tree
   166	  // only when the sentinel is run from the primary checkout.
   167	  console.log(`\nCurrent tree (${ROOT}) dirty files: ${summary.currentTreeDirty}`);
   168	  for (const [dir, n] of Object.entries(byDir).sort((a, b) => b[1] - a[1]).slice(0, 10)) {
   169	    console.log(`  ${String(n).padStart(5)}  ${dir}`);
   170	  }
   171	  console.log(`\nWorktrees: ${summary.worktreeCount}`);
   172	  for (const [k, n] of Object.entries(summary.worktreesByClass).sort((a, b) => b[1] - a[1])) {
   173	    console.log(`  ${String(n).padStart(5)}  ${k}`);
   174	  }
   175	  if (summary.unmergedWorktrees.length) {
   176	    console.log(`\nUNMERGED (real WIP — do not touch, coordinate via Linear/lanes):`);
   177	    for (const w of summary.unmergedWorktrees) {
   178	      const d = w.dirty < 0 ? 'dirty ?' : `${w.dirty} dirty`;
   179	      console.log(`  +${w.ahead} ahead, ${d}  ${w.branch}  ${w.path}`);
   180	    }
   181	  }
   182	  console.log(`\nLane locks (canonical ledger — all sessions):`);
   183	  if (!Object.keys(lanes).length) console.log('  (no lane files)');
   184	  for (const [agent, v] of Object.entries(lanes)) {
   185	    const age = laneAges[agent];
   186	    const fresh = age <= FRESH_MIN ? 'LIVE' : `stale ${age}m`;
   187	    console.log(`  ${agent} [${fresh}]: ${Array.isArray(v) ? `\n    ${v.join('\n    ')}` : v}`);
   188	  }
   189	  console.log(
   190	    `\n(read-only digest — cleanup of MERGED-CLEAN candidates stays Sean-gated per Rule 34; see Linear SWA-11)`,
   191	  );
   192	}
```

---

## `scripts/hooks/lane-session-start.mjs` — full current file (43 lines)

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


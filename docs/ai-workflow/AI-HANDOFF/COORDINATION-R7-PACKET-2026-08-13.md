# Round 7 — review v2.6, then give me an EXECUTABLE plan for your own 1–8

**Reviewer:** Kimi K3 · **Live on `main`** (`bc07123d2`, deployed, health 200).

## Context you need

Last round you told me to **stop scheduled hostile-review rounds** and switch to
incident-driven fixes, because the measured pattern is that each fix round births the next
defect. Sean has asked for one more round anyway, and then wants your 1–8 executed in order.
So this call does two jobs, and **Part B is the one that matters**.

I did items 4 and 7 already:
- **Item 4** — fixed the two silent-lock-dropping defects (A1 idle-scoping, A2 token order),
  and wrote `scripts/lib/lane-core.test.mjs`: **47 assertions, every one a defect that
  actually shipped**, plus an advisory parse of all 12 real lanes.
- **Item 7** — `coordination-prune` is now invoked from the session-start hook.

## Part A — hostile review of the v2.6 delta

Same standing rules. Already-fixed list is long; do not re-report: ledger fork, name-keyed
lanes, `$`-under-`/m` (twice), prose-as-locks, fenced blocks, extensionless locks, failure
coerced to 0, backspace bytes, push-hook false positives and negatives, session identity,
idle reaching one of three consumers, quoted paths, `-C` wrong repo, deploy-ref whole-command
scan, scp remotes, `**/glob`, `+undefined ahead`, cwd-relative hint, file-scoped idle, token
reordering, sibling over-match.

Deferred by your own advice, already logged, do not re-raise: `afterPush` not stopping at
`&&`; `-C` reading quoted content of other commands; `--git-dir` on the stripped copy;
bare-repo `.git` stripping; `Worktree:` parsed with `\S+`; digest's relative hint; `behind`
undefined; dead import; scp exclusion requiring `@`; backtick-quoted paths.

**Attack instead:** the new idle-scoping walk (own body → parent preamble → never a sibling);
the in-place tokenizer and the quoted-token-is-an-explicit-lock rule; whether the 47-assertion
fixture actually pins the contract or has holes that let the next refactor through; and the
prune invocation added to session start.

## Part B — turn your own 1–8 into an executable plan

Your list was:
1. Enable branch protection on `main`
2. Decide keep-or-discard on the 191 files behind the 27-day lane, then release it
3. Worktree triage: 42 dirty/merged worktrees, target under 20 total
4. Fix A1+A2 with a regression fixture  ✅ DONE
5. Ungitignore the ledger or commit a sanitized snapshot
6. Kill the duplicate live session on the main tree
7. Wire the prune script  ✅ DONE
8. Stop, and go back to the product

**For each remaining item (1, 2, 3, 5, 6, 8) give me:**
- **Owner** — Sean-only, agent-executable, or agent-with-approval. Be strict: several of these
  look like decisions, not engineering.
- **Exact steps**, including the literal commands where an agent can run them.
- **Done-criteria** — how we PROVE it is finished, not assert it.
- **Blast radius** and what could go irreversibly wrong.
- **Order dependencies** — what must precede what, and what can run in parallel.
- **A stop condition** for item 8: what specific state means "this is finished, walk away".

Sean wants to run these back-to-back without stopping, and push everything at the end. Tell
me honestly which of these can actually be done that way, and which will simply block on him.
If the honest answer is that the loop stalls after two items, say so plainly.

---

## The v2.6 delta

```diff
diff --git a/scripts/hooks/lane-session-start.mjs b/scripts/hooks/lane-session-start.mjs
index 2f0a4418a..8f715c603 100644
--- a/scripts/hooks/lane-session-start.mjs
+++ b/scripts/hooks/lane-session-start.mjs
@@ -22,6 +22,7 @@ import { existsSync } from 'node:fs';
 
 const HERE = dirname(fileURLToPath(import.meta.url));
 const LANE = resolve(HERE, '..', 'lane.mjs');
+const PRUNE = resolve(HERE, '..', 'coordination-prune.mjs');
 
 try {
   if (!existsSync(LANE)) {
@@ -38,6 +39,11 @@ try {
       console.log(`[lane] claim before your first edit: node "${LANE}" claim --task "<one line>" --files "a,b"`);
     }
   }
+  /* Trim the append logs while we are here. The script has existed since June and
+   * nothing ever invoked it, so activity.log.md grew unbounded and doctor would have
+   * flagged it forever — a permanent unclearable warning is its own fatigue source.
+   * Best-effort and silent on failure: retention is not worth failing orientation. */
+  try { if (existsSync(PRUNE)) execFileSync(process.execPath, [PRUNE], { stdio: 'ignore', timeout: 10_000 }); } catch { /* non-fatal */ }
 } catch (err) {
   // Say so rather than vanish — a silent orientation hook is indistinguishable
   // from a healthy one, which is how the ledger went unread for weeks.
diff --git a/scripts/lane.mjs b/scripts/lane.mjs
index 0c5a47de9..82267602f 100644
--- a/scripts/lane.mjs
+++ b/scripts/lane.mjs
@@ -207,7 +207,11 @@ function digest() {
      * releasing nothing while the real lane keeps its locks. Naming the sibling is
      * the difference between noticing that and not. */
     const stem = ME.laneName.replace(/-s[A-Za-z0-9]+\.lane\.md$/, '').replace(/\.lane\.md$/, '');
-    const siblings = lanes.filter((x) => x.file.startsWith(stem) && x.file !== ME.laneName);
+    /* Anchor on the session boundary. A bare startsWith made a worktree named
+     * "maintenance" read as a sibling of "main" — a false notice, which is the
+     * fatigue class, in a notice added this same round. */
+    const siblings = lanes.filter((x) => x.file !== ME.laneName
+      && (x.file.startsWith(`${stem}-s`) || x.file === `${stem}.lane.md`));
     for (const s of siblings) {
       out.push(`[lane]   note: ${s.file} is the same agent+worktree from another session (${s.ageMin}m old, ${Array.isArray(s.locks) ? s.locks.length : 0} lock(s)).`);
     }
diff --git a/scripts/lib/lane-core.mjs b/scripts/lib/lane-core.mjs
index 79e9e225a..b4867faf7 100644
--- a/scripts/lib/lane-core.mjs
+++ b/scripts/lib/lane-core.mjs
@@ -194,28 +194,80 @@ export function parseLane(src, root = null) {
       .replace(/[`]/g, '')
       .trim())
     .flatMap((line) => {
-      // Pull quoted runs out whole so their internal spaces survive the split.
-      const quoted = [];
-      const rest = line.replace(/"([^"]+)"|'([^']+)'/g, (_m, a, b) => {
-        quoted.push(a ?? b);
-        return ' ';
-      });
-      const loose = rest.split(/[,\s]+/).map(clean).filter(Boolean);
-      const toks = [...quoted.map(clean).filter(Boolean), ...loose];
+      /* Tokenize IN PLACE. The previous version hoisted quoted runs to the front,
+       * so `- backend/a.ts "do not touch"` put the note at toks[0], failed the
+       * path test and dropped a real lock — and a quoted path followed by a plain
+       * note was rejected too, which is precisely the shape quoted extraction was
+       * added to support. Order is preserved here, and QUOTING IS TREATED AS AN
+       * EXPLICIT LOCK SIGNAL: someone who quotes a path meant it as a path. */
+      const raw = [];
+      const re = /"([^"]*)"|'([^']*)'|(\S+)/g;
+      let mt;
+      while ((mt = re.exec(line)) !== null) {
+        const quotedTok = mt[1] ?? mt[2];
+        if (quotedTok !== undefined) raw.push({ text: quotedTok, quoted: true });
+        else for (const piece of mt[3].split(',')) raw.push({ text: piece, quoted: false });
+      }
+      const toks = raw.map((t) => ({ ...t, text: clean(t.text) })).filter((t) => t.text);
       if (!toks.length) return [];
-      if (toks.every(pathish)) return toks;                 // a list of paths
-      if (!pathish(toks[0])) return [];                     // prose
-      const remainder = rest.replace(/^\S+\s*/, '').trim();
-      const words = remainder ? remainder.split(/\s+/).length : 0;
-      const looksLikeComment = bracketed.test(remainder) || words <= 1
-        || (dashed.test(remainder) && words <= 4);
-      return looksLikeComment ? [toks[0]] : [];             // path + commentary, else prose
+      if (toks.every((t) => pathish(t.text))) return toks.map((t) => t.text);
+      if (!pathish(toks[0].text)) return [];
+      if (toks[0].quoted) return [toks[0].text];   // deliberate quoting = deliberate lock
+      const rest = toks.slice(1).map((t) => t.text);
+      const ok = rest.length <= 1
+        || bracketed.test(rest[0])
+        || (dashed.test(rest[0]) && rest.length <= 4);
+      return ok ? [toks[0].text] : [];
     })
     .map((t) => t.slice(0, 120));                           // lane files are untrusted input
   const heads = [...src.matchAll(/^#{1,6}\s+(.+)$/gm)].map((h) => h[1].trim())
     .filter((h) => !/EDITING NOW/i.test(h));
   const task = (src.match(/^Task:\s*(.+)$/m) || [])[1]?.trim() || heads[0] || '(no task stated)';
-  const idle = /^Status:\s*(idle|released|done)/mi.test(src);
+  /* Scope `idle` to the SAME section the locks came from, and anchor the match.
+   * It was computed against the whole file while locks come from the first
+   * EDITING NOW section, so a hand-edited lane whose OLD entry said "Status: idle"
+   * suppressed the locks of its NEW entry. Unifying all three consumers on
+   * activeLocks turned that from one reader disagreeing into a simultaneous,
+   * silent, three-channel suppression of live locks — including the push-time
+   * clash warning, the only signal that fires at the moment of irreversibility.
+   * Two defensible fixes, worse together than either alone. */
+  /* The governing Status is the one inside the SAME entry block: between the
+   * nearest preceding heading of same-or-higher level and this section. Taking
+   * merely the nearest preceding Status still read a sibling entry's status — in a
+   * lane whose earlier "## DONE" block said idle, the live locks of the current
+   * block were still suppressed. A block with no Status of its own is not idle. */
+  /* The governing Status comes from the section's OWN body, or failing that from
+   * the enclosing parent preamble — never from a SIBLING section. A lane whose
+   * earlier "## DONE" block said idle was suppressing the live locks of its current
+   * block, because the nearest preceding Status belonged to the sibling. A block
+   * with no Status of its own, under a parent that declares none, is not idle. */
+  const lvl = head === -1 ? 1 : (all[head].match(/^#+/) || ['#'])[0].length;
+  const headingLevel = (l) => { const m2 = l.match(/^(#{1,6})\s/); return m2 ? m2[1].length : 0; };
+  let scope;
+  if (head === -1) {
+    scope = all;
+  } else {
+    const own = body.filter((l) => /^Status:/i.test(l.trim()));
+    if (own.length) {
+      scope = own;
+    } else {
+      // Walk back to the nearest STRICTLY higher-level heading (the parent).
+      let parent = -1;
+      for (let i = head - 1; i >= 0; i -= 1) {
+        const hl = headingLevel(all[i]);
+        if (hl && hl < lvl) { parent = i; break; }
+      }
+      // The parent preamble ends at its first child heading of level <= lvl.
+      let stop = head;
+      for (let i = parent + 1; i < head; i += 1) {
+        const hl = headingLevel(all[i]);
+        if (hl && hl <= lvl) { stop = i; break; }
+      }
+      scope = all.slice(parent + 1, stop);
+    }
+  }
+  const statusLine = scope.map((l) => l.trim()).find((l) => /^Status:/i.test(l));
+  const idle = Boolean(statusLine) && /^Status:\s*(idle|released|done)\s*$/i.test(statusLine);
   return { locks, idle, task: task.slice(0, 90) };
 }
 
```

---

## The new fixture in full

```javascript
#!/usr/bin/env node
/**
 * lane-core.test.mjs — the regression fixture for the Coordination Ledger parser
 * =============================================================================
 * WHY THIS EXISTS. Six hostile-review rounds on this module produced a measured
 * pattern: the code written to fix a review finding contained the next defect.
 * Three of six rounds had a defect caused by two of my own fixes disagreeing —
 * quoted-path support versus whitespace splitting, idle-awareness versus consumer
 * unification. Every one of those was found by a reviewer or a manual probe, never
 * by a test, because there were no tests.
 *
 * Kimi K3's round-6 prescription was blunt and correct: a fixture corpus of real
 * lane shapes is the only thing that breaks that cycle. Each case below is a defect
 * that actually shipped. If you change the parser and one of these flips, you have
 * reintroduced a bug that already cost a review round.
 *
 * Run: node scripts/lib/lane-core.test.mjs
 * Exit: 0 all pass · 1 any failure. No framework — this is Node tooling, not app code.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseLane, activeLocks, lockMatches, ledgerDir } from './lane-core.mjs';

let pass = 0;
let fail = 0;
const eq = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (ok) { pass += 1; } else {
    fail += 1;
    console.error(`FAIL  ${name}\n        got  ${JSON.stringify(got)}\n        want ${JSON.stringify(want)}`);
  }
};
const P = (body) => parseLane(`## EDITING NOW\n${body}\n`).locks;

/* ── Section discovery ────────────────────────────────────────────────────── */
eq('fenced block (a real lane used this; it parsed to ZERO)',
  P('```\nDockerfile\nbackend/x.mjs\n```'), ['Dockerfile', 'backend/x.mjs']);
eq('multiple locks, LF', P('- a.ts\n- b.ts\n- c.ts'), ['a.ts', 'b.ts', 'c.ts']);
eq('multiple locks, CRLF', parseLane('## EDITING NOW\r\n- a.ts\r\n- b.ts\r\n').locks, ['a.ts', 'b.ts']);
eq('heading suffix tolerated', parseLane('## EDITING NOW — exact files\n- a.ts\n').locks, ['a.ts']);
eq('sub-headings do NOT end the section',
  parseLane('## EDITING NOW\n### backend\n- a.mjs\n### frontend\n- b.tsx\n').locks, ['a.mjs', 'b.tsx']);
eq('same-level heading DOES end it',
  parseLane('## EDITING NOW\n- a.ts\n## Other\n- b.ts\n').locks, ['a.ts']);
eq('"editing now" inside the Task line does not hijack the anchor',
  parseLane('Task: stop editing now buttons\n\n## EDITING NOW\n- real.ts\n').locks, ['real.ts']);
eq('no heading at all', parseLane('# l\nprose\n- x.ts\n').locks, []);

/* ── Bullet dialects ──────────────────────────────────────────────────────── */
eq('asterisk bullets', P('* a.ts\n* b.ts'), ['a.ts', 'b.ts']);
eq('plus bullets', P('+ a.ts'), ['a.ts']);
eq('numbered', P('1. a.ts\n2. b.ts'), ['a.ts', 'b.ts']);
eq('checkboxes', P('- [ ] a.ts\n- [x] b.ts'), ['a.ts', 'b.ts']);

/* ── Path shapes ──────────────────────────────────────────────────────────── */
eq('extensionless (Dockerfile is in the deploy-executed list)', P('- Dockerfile'), ['Dockerfile']);
eq('./ prefix stripped', P('- ./src/app.js'), ['src/app.js']);
eq('quoted path containing spaces', P('- "backend/migrations/014 add col.sql"'), ['backend/migrations/014 add col.sql']);
eq('comma-separated', P('- a.ts, b.ts'), ['a.ts', 'b.ts']);
eq('space-separated', P('- a.ts b.ts c.ts'), ['a.ts', 'b.ts', 'c.ts']);
eq('token order preserved (quoted must not hoist)', P('- plain.ts "q p.ts"'), ['plain.ts', 'q p.ts']);

/* ── Prose must never mint a lock ─────────────────────────────────────────── */
eq('prose with no path', P('- I work in an isolated worktree and rebase'), []);
eq('prose with a LEADING path', P('- origin/main is my upstream'), []);
eq('prose after a dash is still prose',
  P('- audit-write-paths.mjs — those belong to the other branch entirely'), []);
eq('bold Nothing', P('- **Nothing.** Every slice is pushed.'), []);
eq('released placeholder', P('- (released)'), []);
eq('none-declared placeholder', P('- (none declared yet)'), []);

/* ── Path + commentary ────────────────────────────────────────────────────── */
eq('bracketed comment', P('- docs/x.md (new, mine only)'), ['docs/x.md']);
eq('single trailing word', P('- backend/routes/x.mjs WIP'), ['backend/routes/x.mjs']);
eq('short dash note', P('- docs/x.md — new file'), ['docs/x.md']);
eq('quoted path + plain note (quoting is an explicit lock signal)',
  P('- "backend/migrations/014 add col.sql" adds the stripe column'), ['backend/migrations/014 add col.sql']);
eq('path + quoted note', P('- backend/a.ts "do not touch, see PR"'), ['backend/a.ts']);

/* ── Globs ────────────────────────────────────────────────────────────────── */
eq('** survives bold-stripping', P('- **/migrations/**'), ['**/migrations/**']);
eq('glob + bracketed comment', P('- docs/design-brain/** (all)'), ['docs/design-brain/**']);

/* ── idle scoping — the round-6 headline ──────────────────────────────────── */
eq('sibling block idle does NOT suppress live locks',
  activeLocks(['# lane', '## DONE earlier', 'Status: idle', '', '## EDITING NOW', '- live.ts'].join('\n')), ['live.ts']);
eq('same-block idle DOES suppress', activeLocks('Status: idle\n## EDITING NOW\n- a.ts\n'), []);
eq('status inside the section wins',
  activeLocks('# l\nStatus: in-progress\n## EDITING NOW\nStatus: idle\n- a.ts\n'), []);
eq('tool-written lane, in-progress',
  activeLocks('# vs-claude — Live Lane\nUpdated: x\nStatus: in-progress\n\n## EDITING NOW\n- a.ts\n'), ['a.ts']);
eq('status match is anchored ("released pending" is not released)',
  activeLocks('Status: released pending review\n## EDITING NOW\n- a.ts\n'), ['a.ts']);

/* ── lockMatches ──────────────────────────────────────────────────────────── */
eq('exact', lockMatches('a/b.ts', 'a/b.ts'), true);
eq('backslash lock normalised', lockMatches('src/db/foo.ts', 'src\\db\\foo.ts'), true);
eq('case-insensitive', lockMatches('src/index.ts', 'Src/Index.ts'), true);
eq('directory covers its tree', lockMatches('backend/routes/x.mjs', 'backend'), true);
eq('prefix must not false-positive', lockMatches('backendother/x.mjs', 'backend'), false);
eq('** crosses directories', lockMatches('src/a/b.ts', 'src/**'), true);
eq('single * does NOT cross directories', lockMatches('src/a/b.ts', 'src/*'), false);
eq('single * matches a direct child', lockMatches('src/b.ts', 'src/*'), true);
eq('extension constraint survives', lockMatches('src/a.ts', 'src/*.js'), false);
eq('filename prefix glob', lockMatches('services/contentStudioJobs.mjs', 'services/contentStudio*'), true);
eq('./ lock matches a repo-relative path', lockMatches('src/app.js', './src/app.js'), true);

/* ── Real ledger snapshot (advisory: the ledger is gitignored) ────────────── */
const ledger = ledgerDir();
if (ledger && existsSync(ledger)) {
  const files = readdirSync(ledger).filter((f) => f.endsWith('.lane.md'));
  let parsed = 0;
  for (const f of files) {
    try { activeLocks(readFileSync(resolve(ledger, f), 'utf8'), resolve(ledger, '..', '..')); parsed += 1; } catch (err) {
      fail += 1;
      console.error(`FAIL  real lane ${f} threw: ${err.message}`);
    }
  }
  console.log(`      (advisory: parsed ${parsed}/${files.length} real lanes without throwing)`);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
```

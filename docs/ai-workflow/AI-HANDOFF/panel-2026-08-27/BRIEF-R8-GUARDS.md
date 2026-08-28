# BRIEF R8 — hostile review of THREE SAFETY MECHANISMS I changed today

**This is NEW code. It is not the ownership work you took to DRY at round 7 — do not re-review
that.** Today I modified three pre-commit guards and edited the constitution. None of it has been
seen by anyone but me. Attack it.

## Why this deserves a harder look than feature code

A bug in a guard does not throw. It **silently stops protecting**, and every subsequent commit
looks green. The failure mode is indistinguishable from success until something bad ships. Two of
these three guards exist because a real incident already happened:

- `constitution-guard` exists because commit `10a3e7fa1` silently reverted **nine MANDATORY
  rules** and shipped green; Claude then read a constitution missing 9 rules for ~15 hours while
  Codex read the complete one, and the two agents operated under different law.
- `frontend-guards` G5 exists because a plain template literal interpolating a styled-components
  primitive took down the entire admin dashboard at mount (2026-04-12) while the build passed and
  nothing warned.

**If my change re-opens either of those holes, that is a CRITICAL finding.**

There is also no server-side enforcement: these are client-side pre-commit hooks, CI has never
gated a merge in this repo's history, and branch protection is unavailable on the current plan.
These guards are the only thing standing there.

## What I changed and why

All three guards shared one blind spot: **they could not tell a line the commit AUTHORED from a
line that merely ARRIVED via a merge.** A merge stages everything it carries, so each guard judged
this commit for the contents of the branch being adopted. Net effect, previously unnoticed:
`origin/main` could not be merged into ANY branch while main carried a single violation anywhere.

- **X1 `frontend-guards.mjs`** — during a merge, skip a staged path whose blob OID equals that
  path's blob OID in `origin/main`. Log every exemption with both OIDs.
- **X2 `constitution-guard.mjs`** — during a merge, the baseline for the removal/renumber/reversion
  checks becomes `origin/main` instead of `HEAD`. Also pinned `MSYS_NO_PATHCONV=1` on its git helper.
- **X3 `token-registry-check.mjs`** — during a merge, "lines this commit ADDS" are measured with
  `git diff --cached origin/main` instead of against `HEAD`.

All three claim to fail CLOSED (no `MERGE_HEAD`, or unresolvable `origin/main` ⇒ original
behaviour). Each has an abuse test that should fail if the fix merely skipped checking.

I also edited **rule 74 (Proof-Before-Done)** in CLAUDE.md + AGENTS.md, because it cited
`scripts/hooks/dry-loop-gate.mjs` as its enforcing hook and that file was deleted from main on
2026-08-26 in `371877268`. The rule had been promising mechanical enforcement that does not exist.

## THE DIFFS

See `newwork.diff` content inline below the questions. Read the code, not my description of it.

---

## Attack these specifically

**A1 — Can X1 be used to land a violation?** The predicate is: `MERGE_HEAD` exists AND staged blob
OID == `origin/main:<path>` blob OID. I claim editing a file changes its blob and re-enters the
checked set. **Find a way to get violating content past it.** Consider: a merge where `origin/main`
is itself attacker-influenced; `origin/main` being stale vs the real remote; a path that exists in
main but is *moved* here; symlinks; a file whose violation is introduced by a rename rather than an
edit; `git checkout origin/main -- <path>` staged OUTSIDE a merge but with a MERGE_HEAD left over
from an unrelated aborted merge.

**A2 — Is a leftover `MERGE_HEAD` exploitable?** `MERGE_HEAD` persists during a conflicted merge
and can be left behind. In all three guards it is the *only* gate on merge-mode. **What can someone
commit while a stale `MERGE_HEAD` sits in `.git/`?** Is `git rev-parse --verify MERGE_HEAD` the
right liveness test, or should it be paired with something stronger?

**A3 — X2 is the most dangerous change here.** It swaps the baseline for the guard that exists to
stop silent rule deletion. **Construct a stale-copy clobber that X2 now lets through and HEAD-baseline
would have caught.** Specifically: a merge where the branch legitimately ADDED a rule main lacks,
and the merge silently drops it — main's baseline has no such rule, so is the deletion invisible?
That is my top self-suspicion and I want it confirmed or killed.

**A4 — X3's diff direction.** I used `git diff --cached origin/main`. Is the argument order right,
does `--cached` with a commit mean index-vs-commit as I assume, and can a rename or mode change
produce hunk headers that make added-line numbers wrong? A wrong line-number map means the gate
judges the wrong lines — silently.

**A5 — Fail-closed claims.** I assert all three degrade to prior behaviour when `MERGE_HEAD` or
`origin/main` is missing. **Check that claim in the code, not in my comments.** Note X1 and X3
swallow git errors in a `catch` that returns null/'' — does any failure mode there fail OPEN?

**A6 — The rule-74 edit.** Does it actually make the document TRUE? It claims there is no dry-loop
Stop hook today and lists four registered Stop gates. Is that accurate, is any claim in it
unverifiable, and does the wording weaken rule 74's force in a way that matters? I chose to state
plainly that the rule is now weaker rather than paper over it — argue the other side if you think
recording the weakness invites ignoring the rule.

**A7 — What did I not think to ask?** Highest-value slot. Three guards had the same blind spot; I
found it by hitting it. **What OTHER shared assumption do these guards make that a revert, a
cherry-pick, a squash-merge, a submodule bump, or a vendored-dependency update would break?**

## Answer format

Findings only. For each: **file:line · severity (CRITICAL/HIGH/MEDIUM/LOW) · the concrete failure
scenario · the fix.** No praise, no summary of what the code does — I wrote it, I know.

If a question yields nothing, say "A<n>: nothing" and move on. **Do not manufacture findings** —
this is round 8 and a fabricated finding costs more than silence. If you genuinely find nothing
anywhere, say **DRY** and say what you attacked to earn it.
### X1 — frontend-guards (1a8235b16)
diff --git a/scripts/hooks/frontend-guards.mjs b/scripts/hooks/frontend-guards.mjs
index 9a68a27a7..70a7d5694 100644
--- a/scripts/hooks/frontend-guards.mjs
+++ b/scripts/hooks/frontend-guards.mjs
@@ -14,6 +14,14 @@
  * G6  ADVISORY (warns, never blocks): file over the 300-line cap (Rule 4)
  *       G6 opt-out: `swan-guard-allow-long-file` anywhere in the file; vendored paths skipped.
  *
+ * X1  MERGE VERBATIM-CARRY EXEMPTION (added 2026-08-27). During a merge (MERGE_HEAD
+ *     present), a staged path whose blob is byte-identical to that path's blob in
+ *     origin/main is skipped and logged with both OIDs. A merge stages what it carries;
+ *     judging carried bytes enforces nothing (they are already on main and deployed) and
+ *     makes origin/main unmergeable into any branch while main holds one violation.
+ *     Cannot launder: editing a file changes its blob and re-enters the checked set.
+ *     Fails CLOSED — unresolvable MERGE_HEAD or origin/main means no exemption.
+ *
  * Usage: node scripts/hooks/frontend-guards.mjs --staged   (from .githooks/pre-commit)
  *        node scripts/hooks/frontend-guards.mjs --file <path>...   (self-test / spot check)
  * Exit 0 = clean · 1 = violations (one FAIL: line each, actionable) · 2 = usage error.
@@ -42,10 +50,68 @@ function stagedContent(file) {
   return execFileSync('git', ['show', `:${file}`], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
 }
 
+// --- merge verbatim-carry exemption (X1) ------------------------------------
+// A merge commit STAGES every path it brings in, including paths it did not author.
+// Judging those enforces nothing — the bytes are already on the default branch and
+// already deployed — while the side effect is severe: origin/main can never be merged
+// into ANY branch while main carries a single G1-G5 violation anywhere.
+//
+// Exempt ONLY a verbatim carry: MERGE_HEAD present AND the staged blob byte-identical
+// to that path's blob in origin/main's tree. This cannot launder a violation. Editing a
+// file to smuggle one changes its blob, which drops it straight back into the checked
+// set; anchoring to origin/main (not to a merge parent) means exempted bytes must
+// already be on the default branch, so a poison branch has nothing to offer; and
+// requiring MERGE_HEAD closes the squash path.
+//
+// FAILS CLOSED: if MERGE_HEAD or origin/main cannot be resolved, nothing is exempt.
+//
+// Rule 34 (pre-existing debt is not this commit's blocker) is the same principle G6
+// already applies to the 300-line cap; its absence for G1-G5 was a coverage gap, not a
+// deliberate stance. Filed after it blocked a zero-conflict sync merge on 2026-08-27.
+function gitOut(args) {
+  try {
+    // MSYS_NO_PATHCONV: `<rev>:<path>` is the documented Git-Bash path-conversion trap
+    // in this repo — it returns a false negative silently, which here would mean
+    // "not a verbatim carry", i.e. it fails closed even if the pin were dropped.
+    return execFileSync('git', args, {
+      encoding: 'utf8',
+      stdio: ['ignore', 'pipe', 'ignore'],
+      env: { ...process.env, MSYS_NO_PATHCONV: '1' },
+    }).trim();
+  } catch {
+    return null;
+  }
+}
+
+const MERGE_IN_PROGRESS = gitOut(['rev-parse', '-q', '--verify', 'MERGE_HEAD']) !== null;
+
+function verbatimCarryFrom(file) {
+  if (!MERGE_IN_PROGRESS) return null;
+  const staged = (gitOut(['ls-files', '-s', '--', file]) || '').match(/^\d+\s+([0-9a-f]{40})\s/);
+  const main = gitOut(['rev-parse', `origin/main:${file}`]);
+  if (!staged || !main || staged[1] !== main) return null;
+  return { staged: staged[1], main };
+}
+
+const exempted = [];
+function checkedStagedFiles() {
+  return stagedFiles().filter((f) => {
+    const carry = verbatimCarryFrom(f);
+    if (!carry) return true;
+    exempted.push(`  X1 verbatim-carry exempt — ${f} — staged ${carry.staged} == origin/main ${carry.main}`);
+    return false;
+  });
+}
+
 const targets = STAGED
-  ? stagedFiles().map((f) => ({ file: f, text: stagedContent(f) }))
+  ? checkedStagedFiles().map((f) => ({ file: f, text: stagedContent(f) }))
   : fileArgs.filter((f) => existsSync(f)).map((f) => ({ file: f, text: readFileSync(f, 'utf8') }));
 
+if (exempted.length) {
+  console.error(`[frontend-guards] ${exempted.length} path(s) exempt as verbatim carries from origin/main during a merge:`);
+  exempted.forEach((e) => console.error(e));
+}
+
 const GALAXY = /#0a0a1a|#00FFFF|#7851A9/i;
 const MUI = /from\s+['"]@mui\/|require\(\s*['"]@mui\//;
 const RECHARTS = /from\s+['"]recharts['"]|require\(\s*['"]recharts['"]\)/;

### X2 — constitution-guard (b9e22196d)
diff --git a/scripts/hooks/constitution-guard.mjs b/scripts/hooks/constitution-guard.mjs
index a961780de..3f5edffe5 100644
--- a/scripts/hooks/constitution-guard.mjs
+++ b/scripts/hooks/constitution-guard.mjs
@@ -78,6 +78,25 @@
  * The cheapest real closure available here is detective, not preventive: a scheduled
  * job running this script against origin/main and alerting on failure.
  *
+ * MERGE BASELINE (X2, added 2026-08-27)
+ * -------------------------------------
+ * Checks 1-3 compare the staged file against HEAD. During a MERGE that is wrong, and
+ * wrong in the direction that blocks correct work: HEAD is the PRE-merge tip, so for a
+ * branch behind origin/main it is STALE LAW, and every rule main legitimately edited
+ * reads as a REVERSION — the merge is carrying main's newer text over this branch's
+ * older copy, and the guard calls adopting current law a regression.
+ *
+ * So when MERGE_HEAD is present the baseline becomes origin/main: "does this merge lose
+ * law relative to the branch that HOLDS current law." Strictly the right question, and
+ * strictly stronger — a merge that clobbers one of main's rules with this branch's older
+ * text still shrinks against main and is still BLOCKED. FAILS CLOSED: no MERGE_HEAD, or
+ * origin/main unreadable, and the baseline stays HEAD with every check unchanged.
+ *
+ * Found when a zero-conflict sync merge reported 13 rules "REVERTED, stale-copy
+ * signature" whose staged bodies were byte-identical to origin/main — main had trimmed
+ * them deliberately. This is the same structural gap the frontend guard had (X1): a
+ * guard that cannot tell a line it AUTHORED from a line that ARRIVED.
+ *
  * EXIT: 0 = pass or not applicable. 1 = blocked.
  */
 import { spawnSync } from 'node:child_process';
@@ -86,7 +105,14 @@ const MIRROR_MARKER = '--- project-doc mirror from CLAUDE.md ---';
 const FILES = ['CLAUDE.md', 'AGENTS.md'];
 
 const git = (args) => {
-  const r = spawnSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
+  // MSYS_NO_PATHCONV: `<rev>:<path>` is the documented Git-Bash path-conversion trap in
+  // this repo — it fails silently, and a silent failure here reaches `die()` rather than
+  // passing, but the pin removes the class rather than relying on that.
+  const r = spawnSync('git', args, {
+    encoding: 'utf8',
+    maxBuffer: 64 * 1024 * 1024,
+    env: { ...process.env, MSYS_NO_PATHCONV: '1' },
+  });
   return { ok: r.status === 0, out: r.stdout ?? '', err: r.stderr ?? '' };
 };
 
@@ -160,6 +186,40 @@ const SHRINK_TOLERANCE = 0.02;
  */
 const AGGREGATE_SHRINK_TOLERANCE = 0.005;
 
+/**
+ * Depth bound for a DECLARED trim of a SURVIVING rule (prune panel 2026-08-25,
+ * GLM F1 + Grok F3 convergence): SWAN_ALLOW_RULE_REMOVAL waves a rule through the
+ * per-rule and aggregate checks, which without a floor lets one env var hollow a
+ * declared rule to a header-stub while the count stays intact. Past 50% the honest
+ * description is a GUTTING, not a trim — do it as a real removal, or split it so a
+ * reviewer sees each piece. A rule that is actually removed/renumbered is untouched
+ * by this bound; it applies only to same-number survivors.
+ */
+const DECLARED_TRIM_FLOOR = 0.5;
+
+/**
+ * Breadth bound for the declared SET (Ox prune-r2 F1): the per-rule floor bounds how
+ * deep ONE declared trim may go, but k rules trimmed to 49% each stack into half the
+ * constitution's text leaving in one legally-declared commit. The set of declared
+ * SURVIVORS may collectively lose at most 25% of its combined length — comfortably
+ * above any legitimate prune (the 2026-08-25 narrative-cut, the largest ever, was
+ * 6.04%) and far below the stacking attack. Residual, accepted: per-commit gating can
+ * be stacked ACROSS commits; the drift probe and review history are that backstop.
+ */
+const DECLARED_SET_FLOOR = 0.25;
+
+/**
+ * Absolute companion to the ratio (GLM prune-r3 F1 hardening; CALIBRATED by GLM+Grok
+ * prune-r4, unanimously): ratios can be diluted by inflating the denominator with
+ * declared-but-untouched rules; characters cannot. The first shipped value (15,000)
+ * sat ABOVE the very attack its comment cited — 6 rules × 49% of ~4.5k = 13,230 —
+ * so the cap was a no-op on its own threat model, caught by two seats independently
+ * from the arithmetic alone. The viable window is (9,056 — the largest legitimate
+ * prune ever recorded, 2026-08-25 — , 13,230); 11,500 sits inside it with ~27%
+ * headroom over history and a hard stop under the canonical stack.
+ */
+const DECLARED_SET_ABS_CAP = 11_500;
+
 /**
  * Minimum token overlap for a DECLARED rename to be believed — also derived.
  * The one known-legitimate rename in this repo's history (rule 46, "3-Brain
@@ -397,12 +457,41 @@ const usedRenames = new Set();
 const blockers = [];
 let checked = 0;
 
+// ---- merge baseline (X2) -------------------------------------------------
+// During a merge, HEAD is the PRE-merge branch tip. For a branch behind origin/main
+// that tip is STALE LAW, and diffing the merge result against it inverts every check:
+// each rule main legitimately edited reads as a REVERSION, because the merge is
+// carrying main's newer text over this branch's older copy. That is exactly backwards
+// — the merge is adopting current law, and the guard calls adopting it a regression.
+//
+// So during a merge the baseline becomes origin/main: "does this merge lose law
+// relative to the branch that HOLDS current law." That question is strictly the right
+// one and strictly stronger, because:
+//   - a merge that clobbers one of main's rules with this branch's older text still
+//     shrinks against main, and is still BLOCKED;
+//   - a rule this branch legitimately ADDED that main lacks is growth, never flagged;
+//   - a rule main removed deliberately is absent from the baseline, so carrying that
+//     removal is not reported as this commit removing it.
+//
+// FAILS CLOSED: without MERGE_HEAD, or if origin/main is unreadable, the baseline
+// stays HEAD and every check behaves exactly as before.
+//
+// Discovered 2026-08-27: a zero-conflict sync merge reported 13 rules "REVERTED, stale-copy
+// signature" whose staged bodies were byte-identical to origin/main — main had trimmed them
+// deliberately. Same structural gap the frontend guard had (X1): a guard that cannot tell
+// a line it AUTHORED from a line that ARRIVED.
+const MERGING = git(['rev-parse', '-q', '--verify', 'MERGE_HEAD']).ok;
+const BASELINE = MERGING && git(['rev-parse', '-q', '--verify', 'origin/main']).ok ? 'origin/main' : 'HEAD';
+if (BASELINE !== 'HEAD') {
+  console.log(`[constitution-guard] merge in progress — baseline is ${BASELINE} (current law), not the pre-merge tip`);
+}
+
 // ---- checks 1, 2, 3: removal, renumber, reversion ------------------------
 for (const file of touched) {
-  const head = git(['show', `HEAD:${file}`]);
+  const head = git(['show', `${BASELINE}:${file}`]);
   const next = git(['show', `:${file}`]);
   // D3: a file we cannot read is a file we cannot clear. Never skip past it.
-  if (!head.ok) die(`${file}: could not read HEAD version (${head.err.trim().slice(0, 100)})`);
+  if (!head.ok) die(`${file}: could not read ${BASELINE} version (${head.err.trim().slice(0, 100)})`);
   if (!next.ok) die(`${file}: could not read staged version (${next.err.trim().slice(0, 100)})`);
   const beforeText = file === 'AGENTS.md' ? head.out.slice(head.out.indexOf(MIRROR_MARKER)) : head.out;
   const afterText = file === 'AGENTS.md' ? next.out.slice(next.out.indexOf(MIRROR_MARKER)) : next.out;
@@ -418,6 +507,7 @@ for (const file of touched) {
   const removed = [];
   const renumbered = [];
   const reverted = [];
+  let declSetBefore = 0; let declSetLost = 0;
   for (const [key, was] of before) {
     const now = after.get(key);
     // Decide whether this rule is VIOLATING first, and only then consult the
@@ -447,7 +537,23 @@ for (const file of touched) {
     // An unblockable check is a check people learn to bypass wholesale, so
     // legitimate changes need a sanctioned way through — Proof-Before-Done
     // genuinely moved 73 -> 74 during this very repair.
-    if (allowed.has(String(was.num))) { usedHatch.add(String(was.num)); continue; }
+    if (allowed.has(String(was.num))) {
+      // The hatch is not bottomless: a declared SURVIVOR may trim, not vanish in
+      // place. Beyond DECLARED_TRIM_FLOOR the declaration stops being believable
+      // as a trim and the change must be an explicit removal.
+      if (now && now.num === was.num) {
+        // CLIPPED losses (GLM prune-r3 F1): a net measure let one declared decoy
+        // GROWN in the same commit buy back the whole breadth budget. Growth never
+        // offsets loss — only chars that actually left count.
+        declSetBefore += was.len;
+        declSetLost += Math.max(0, was.len - now.len);
+        const declaredShrink = (was.len - now.len) / Math.max(was.len, 1);
+        if (declaredShrink > DECLARED_TRIM_FLOOR) {
+          blockers.push(`${file}: rule ${was.num} "${was.name.slice(0, 56)}" — declared trim removed ${Math.round(declaredShrink * 100)}% of the body (${was.len} -> ${now.len} chars). Past ${DECLARED_TRIM_FLOOR * 100}% this is a GUTTING wearing a trim declaration: declare it as a REMOVAL, or land the cut across separately reviewed commits.`);
+        }
+      }
+      usedHatch.add(String(was.num)); continue;
+    }
     violation();
   }
 
@@ -456,18 +562,39 @@ for (const file of touched) {
   // 2% while a rule's worth of constitution quietly disappears. Aggregate is
   // measured over rules present in BOTH versions, so declared removals — which are
   // already authorised and loud — do not count against the budget.
+  // Same principle for rules that SURVIVE but were DECLARED (2026-08-25, first
+  // legitimate narrative-cut): a trim named in SWAN_ALLOW_RULE_REMOVAL is a
+  // decision on the record, exactly as authorised-and-loud as a declared removal —
+  // counting it against the aggregate budget left the check unsatisfiable for the
+  // RULEBOOK trailer's own `narrative-cut` class ("declare it" with no way to).
+  // The budget still guards every UNDECLARED rule at full strength.
   let aggBefore = 0; let aggAfter = 0;
   for (const [key, was] of before) {
     const now = after.get(key);
     if (!now) continue;
+    if (allowed.has(String(was.num))) {
+      if (now.len !== was.len) usedHatch.add(String(was.num));
+      continue;
+    }
     aggBefore += was.len; aggAfter += now.len;
   }
+  // Breadth bound on the declared SET (Ox prune-r2 F1, hardened GLM prune-r3 F1):
+  // many individually-plausible declared trims must not compose into a gutting.
+  // Numerator is CLIPPED loss (growth never offsets), and an ABSOLUTE cap backs the
+  // ratio so stuffing the declared list with untouched rules cannot dilute the
+  // denominator into vacuity: the largest legitimate prune in history lost 9,056
+  // chars; DECLARED_SET_ABS_CAP sits above it with headroom, below any half-
+  // constitution stack (6 rules × 49% of ~4.5k ≈ 13k).
+  const declSetShrink = declSetBefore ? declSetLost / declSetBefore : 0;
+  if (declSetShrink > DECLARED_SET_FLOOR || declSetLost > DECLARED_SET_ABS_CAP) {
+    blockers.push(`${file}: the DECLARED rules collectively lost ${declSetLost} chars (${(declSetShrink * 100).toFixed(1)}% of their combined ${declSetBefore}; growth does not offset) — individually-plausible trims stacking past ${DECLARED_SET_FLOOR * 100}% or ${DECLARED_SET_ABS_CAP} chars is a GUTTING of the set. Declare removals explicitly, or land the cut across separately reviewed commits.`);
+  }
   const aggShrink = aggBefore ? (aggBefore - aggAfter) / aggBefore : 0;
   if (aggShrink > AGGREGATE_SHRINK_TOLERANCE) {
     blockers.push(`${file}: the surviving rules lost ${(aggShrink * 100).toFixed(1)}% of their combined length (${aggBefore} -> ${aggAfter} chars) even though no single rule tripped the per-rule floor. Death by a thousand trims is the same outcome as a clobber. Declare it or split it.`);
   }
 
-  console.log(`[constitution-guard] ${file}: ${before.size} rules in HEAD -> ${after.size} staged; ${removed.length} removed, ${renumbered.length} renumbered, ${reverted.length} reverted; aggregate body ${aggShrink >= 0 ? '-' : '+'}${Math.abs(aggShrink * 100).toFixed(2)}%`);
+  console.log(`[constitution-guard] ${file}: ${before.size} rules in ${BASELINE} -> ${after.size} staged; ${removed.length} removed, ${renumbered.length} renumbered, ${reverted.length} reverted; aggregate body ${aggShrink >= 0 ? '-' : '+'}${Math.abs(aggShrink * 100).toFixed(2)}%`);
 
   // Q2 — rename is a first-class operation, not an error.
   // A rule renamed in place reads as removal-of-X + addition-of-Y, and the only
@@ -526,7 +653,7 @@ for (const file of touched) {
     blockers.push(`${file}: ${removed.length} rule(s) removed and ${added.length} added in the same commit — this may be a RENAME, not a deletion. If so, declare it: SWAN_RULE_RENAME="${hint}"`);
   }
 
-  for (const r of removed) blockers.push(`${file}: rule ${r.num} "${r.name.slice(0, 70)}" exists in HEAD and is GONE from the staged file.`);
+  for (const r of removed) blockers.push(`${file}: rule ${r.num} "${r.name.slice(0, 70)}" exists in ${BASELINE} and is GONE from the staged file.`);
   for (const { was, now } of renumbered) blockers.push(`${file}: "${was.name.slice(0, 60)}" renumbered ${was.num} -> ${now.num}. Every "Rule ${was.num}" citation in the repo now points elsewhere.`);
   for (const { was, why } of reverted) blockers.push(`${file}: rule ${was.num} "${was.name.slice(0, 55)}" looks REVERTED, not edited — ${why.join('; ')}. This is the stale-copy signature: older text restored over newer law.`);
 }

### X3 — token-registry-check (280b6f38b)
diff --git a/scripts/hooks/token-registry-check.mjs b/scripts/hooks/token-registry-check.mjs
index 37b5be2db..272d50074 100644
--- a/scripts/hooks/token-registry-check.mjs
+++ b/scripts/hooks/token-registry-check.mjs
@@ -242,12 +242,43 @@ function main() {
   // `-U0` makes each hunk header name exactly the added range: "@@ -a,b +c,d @@" means d lines
   // starting at c are new. d is omitted when it is 1.
   const addedLines = new Map();
+
+  // --- merge baseline (X3) --------------------------------------------------
+  // `git diff --cached` is against HEAD, and during a MERGE that inverts the meaning of
+  // "a line this commit ADDS": HEAD is the PRE-merge tip, so every line the merge carries
+  // in from origin/main counts as newly added by this commit. It is not. Those lines are
+  // already on the default branch and already deployed, and blocking on them means
+  // origin/main can never be merged into a branch while main carries inherited token debt
+  // — the exact inherited-debt case that made this gate --added-only rather than --strict
+  // in the first place (Rule 34).
+  //
+  // So during a merge the diff baseline becomes origin/main: lines this merge genuinely
+  // authors relative to current law. Strictly the right question and strictly narrower —
+  // a file the merge actually MODIFIED still diffs against main and its new lines are
+  // still judged; only verbatim carries fall away.
+  //
+  // FAILS CLOSED: no MERGE_HEAD, or origin/main unresolvable, and the baseline stays HEAD.
+  // Third guard found with this same blind spot on 2026-08-27 (after frontend-guards X1 and
+  // constitution-guard X2), which is what makes it a pattern rather than three bugs: a guard
+  // that cannot tell a line it AUTHORED from a line that ARRIVED.
+  const gitQuiet = (a) => {
+    try {
+      return execFileSync('git', a, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], env: { ...process.env, MSYS_NO_PATHCONV: '1' } }).trim();
+    } catch { return null; }
+  };
+  const DIFF_BASE = gitQuiet(['rev-parse', '-q', '--verify', 'MERGE_HEAD']) !== null
+    && gitQuiet(['rev-parse', '-q', '--verify', 'origin/main']) !== null
+    ? ['origin/main'] : [];
+  if (DIFF_BASE.length) {
+    console.error('[token-registry] merge in progress — added lines measured against origin/main, not the pre-merge tip');
+  }
+
   if (ADDED_ONLY) {
     for (const f of targets) {
       const set = new Set();
       let diff = '';
       try {
-        diff = execFileSync('git', ['diff', '--cached', '-U0', '--', f], { encoding: 'utf8' });
+        diff = execFileSync('git', ['diff', '--cached', ...DIFF_BASE, '-U0', '--', f], { encoding: 'utf8' });
       } catch {
         // A file with no staged diff is not an error - it simply contributes no added lines.
         diff = '';

### rule-74 edit (e607d2dc6, CLAUDE.md only — AGENTS.md is byte-identical mirror)
-    **ENFORCED (added 2026-08-03):** this rule is no longer prose-only. `scripts/hooks/dual-tier-gate.mjs` is a deterministic `Stop` hook (wired in `.claude/settings.json` beside the Hermes, dry-loop and Linear gates). Any build-shaped turn — ≥2 non-emission file writes OR a git commit/push — whose closing message lacks a **plain-English section**, or that puts technical *before* plain-English, is BLOCKED. Escape hatch for genuinely non-qualifying turns: `DUAL-TIER: N/A — <reason>`. **Why the hook:** Sean flagged on 2026-08-03 that this rule had been silently skipped for an entire session. It was the only closeout rule without a gate — the Hermes memo, dry-loop ledger and Linear sync fire every turn precisely because they have one. Same lesson as the Hermes outbox at n=443: a duty enforced only by the model remembering is a duty that will eventually be dropped.
+    **ENFORCED (added 2026-08-03):** this rule is no longer prose-only. `scripts/hooks/dual-tier-gate.mjs` is a deterministic `Stop` hook (wired in `.claude/settings.json` beside the Hermes, dry-loop and Linear gates). Any build-shaped turn — ≥2 non-emission file writes OR a git commit/push — whose closing message lacks a **plain-English section**, or that puts technical *before* plain-English, is BLOCKED. Escape hatch for genuinely non-qualifying turns: `DUAL-TIER: N/A — <reason>`.
-    **Closeout enforcement:** this rule is enforced at the `closeout-evidence-lock` gate (Rule 41) — closeout must refuse to emit a completion claim that lacks proof + a clean hostile pass, and must print the proof + the dry-pass round count. Additionally the deterministic `Stop` hook `scripts/hooks/dry-loop-gate.mjs` BLOCKS any build-shaped turn (≥2 non-emission file writes OR a git commit/push) whose closeout lacks EITHER the `DRY-LOOP: CLEAN×2` marker OR a `PROOF:` token (unit-tested in `dry-loop-gate.test.mjs`). **Why:** Sean has burned countless hours catching "done" claims that weren't. The fix is structural: proof and an adversarial dry-loop are the price of the word "done." No proof, no done.
+    **Closeout enforcement:** this rule is enforced at the `closeout-evidence-lock` gate (Rule 41) — closeout must refuse to emit a completion claim that lacks proof + a clean hostile pass, and must print the proof + the dry-pass round count. A deterministic `Stop` hook (scripts/hooks/dry-loop-gate.mjs — named here as history, not as a pointer to read) enforced this mechanically — blocking any build-shaped turn whose closeout lacked EITHER a `DRY-LOOP: CLEAN×2` marker OR a `PROOF:` token — **until 2026-08-26, when it was deleted in `371877268`**: it fired on 37–47% of turns with no escape hatch, and PR #70 had shipped the enforcement to `main` while leaving the relief on a branch. **There is no dry-loop `Stop` hook today.** The registered `Stop` gates are `scripts/hooks/dual-tier-gate.mjs`, `scripts/hooks/hermes-closeout-gate.mjs`, `scripts/hooks/linear-sync-gate.mjs` and `scripts/hooks/privacy-boundary-gate.mjs` (hooks, not skills). Until a replacement lands, this rule rests on the `closeout-evidence-lock` gate (Rule 41) and on the model actually running the loop — which is **weaker**, and is said plainly here rather than left to read as mechanically enforced. *(Corrected 2026-08-27: the citation outlived the file by a day, because the file-existence check only runs when a constitution file is staged and the deleting commit staged none.)* Proof and an adversarial dry-loop are the price of the word "done." No proof, no done.

---
---

# ADDENDUM — my own hostile pass ran first and found THREE holes. Attack the FIXES.

I ran my own pass before reading yours. It produced three real findings, all now fixed with
regression tests and mutation coverage. **Your job is to break the fixes, and to find what all
of us still missed.** Do not re-report these three.

## F1 (CRITICAL, mine, FIXED) — X2's baseline SWAP opened the hole it was fixing

Replacing the `HEAD` baseline with `origin/main` meant a rule **this branch legitimately added,
which main never had**, could be silently dropped by the merge: origin/main has no such rule, so
its absence is not a removal. Exactly the 10a3e7fa1 class, re-opened by its own fix. Constructed
and confirmed, then fixed.

**Fix (X2b):** the merge baseline is the **UNION** of both parents. Presence — a rule in EITHER
parent must survive. Body — judged against origin/main's copy where main has the rule, against
HEAD's copy for a branch-only rule. Blockers now name the parent a rule actually came from.
**Generalised lesson: a guard's baseline may be WIDENED, never SWAPPED.**

## F2 (CRITICAL, PRE-EXISTING on main, FIXED) — the guard never even looked at the file

`git diff --cached` is index-vs-HEAD. Resolve a merge by keeping the branch's `CLAUDE.md`
verbatim and the file is **not listed as staged at all** — the guard printed
`no constitution file staged — SKIP` and the commit went green, with every rule main added since
the fork silently discarded. Baseline logic is irrelevant when the file is never selected.
**This predates my X2 work and is live on main today.** Found by attacking my own fix.

**Fix (X2c):** during a merge, a constitution file also counts as touched when it differs from
`origin/main`.

## F3 (HIGH, mine + pre-existing, FIXED) — same selection hole in frontend-guards

Same shape: main FIXES a G5 violation, the merge resolves by keeping the branch's old file, the
fix is silently reverted and the guard never looks. G5 is the production-outage class (styled
-components error #12 at mount), not a style nag.

**Fix (X1b):** merge-aware selection in `stagedFiles()`.

## KNOWN REMAINING, deliberately not yet fixed — tell me if these are worse than I think

- `.githooks/pre-commit` gates `constitution-references.mjs` on `git diff --cached` (line ~90),
  so the same merge that hides `CLAUDE.md` also skips the reference check. The constitution guard
  itself is invoked unconditionally (line ~62), which is why X2c is reachable — I verified that.
- The same hook builds token-registry's `--file` list from `git diff --cached` (line ~119), so a
  merge that reverts main's token definitions is unchecked.
- **The generalisation:** every guard AND the hook orchestrator share one assumption —
  *"what this commit affects" == `git diff --cached`* (index vs HEAD). That is false during a
  merge in BOTH directions: it over-reports carried lines (the original bug) and under-reports
  discarded ones (F2/F3).

## Attack these

**B1** — Break X2b's union. Can a rule still vanish? Consider: a rule RENAMED on one parent and
dropped on the other; the same rule number under different names in each parent; a rule present in
both but whose body is taken from neither; the `SWAN_ALLOW_RULE_REMOVAL` / `SWAN_RULE_RENAME`
hatches interacting with a union baseline (they are keyed by number IN HEAD — is that still
coherent when the baseline has two parents?).

**B2** — Break X2c/X1b selection. Is `git diff --cached origin/main` the right second axis, or
should it be `MERGE_HEAD`? They differ when `origin/main` has moved since the merge started, or
when merging something that is NOT main. Construct the case where that difference matters.

**B3** — Does the union change the *reversion* (shrink) maths in a way I did not intend? Aggregate
shrink is computed over `before`, which is now a union and therefore LARGER. Does that dilute the
aggregate-shrink percentage enough to let a real "death by a thousand trims" through?

**B4** — What else shares the `diff --cached` assumption that I have not named?

Same rules as before: findings only, file:line, severity, concrete scenario, fix. Do not
manufacture. If nothing, say DRY and say what you attacked.

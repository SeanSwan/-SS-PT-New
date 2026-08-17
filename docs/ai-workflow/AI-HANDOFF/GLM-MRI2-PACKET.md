# GLM-5.3 MRI ROUND 2 — DID YOUR OWN FINDINGS ACTUALLY GET FIXED?

- **Requested by:** Sean (owner, SwanStudios) - **Assembled by:** Claude Opus 5 - **Date:** 2026-08-16
- **Branch:** `claude/design-brain-repave-20260816`, now 9 commits, pushed. NOT merged.
- **You reviewed this branch at commit 7.** This packet is commits 8-9 plus the current state of everything you attacked.

---

## Section 0 - YOUR REMIT

You gave this branch **MERGE WITH FIXES** and listed W1-W6 (wrong) and I1-I4 (incomplete). The author claims to have fixed most of them. **Your job now is to verify that, and to attack what the fixes introduced.**

Three questions, in priority order:

1. **Did your findings actually get fixed, or performatively fixed?** For each of W1-W6 and I1-I4 the author's claim is quoted in Section 2. Check the CODE, not the claim. A fix that narrows the symptom while leaving the mechanism is worse than no fix, because it closes the ticket.
2. **What did the fixes break?** The checker was heavily rewritten (regex, resolution, parsing, bounds). New code written under review pressure is where new defects live. The author already found one himself: his range-expansion fix turned one typo into 99,982 findings before he bounded it. Assume there are more.
3. **What is STILL wrong that neither of us has found?** Two rounds have not exhausted this corpus. Your first review found rot the author's grep missed; your second found rot the author's *checker* missed. Find the third layer.

**Ground rules:**
- Cite file and line. The full current checker is in Section 4 - read it as a program.
- **Do not accept a claim because it is specific.** The author's D3 "proof" last round tested the wrong defect class entirely and read as rigorous.
- Mark speculation `[HYPOTHESIS]`. Do not claim absence from the system when it is absence from this packet.
- If a fix is genuinely correct, one line, move on.
- **Anything else is in scope**, including whether this branch should still merge.

**Output priority: put the TABLES FIRST.** Your last review truncated at the token cap with 30k spent on reasoning, losing your merge verdict entirely. Lead with the verdict paragraph, then the defect tables, then everything else. If you run short, the tables are what survives.

---

## Section 1 - THE PROBLEM THIS BRANCH EXISTS TO FIX

The Design Brain (`docs/ai-workflow/design-brain/`) is markdown that AI agents load at task time to build UI for SwanStudios, a production personal-training SaaS. A canon rewrite renumbered `design.md` from 28 sections to 17, and no satellite file followed. An agent that follows a dead pointer resolves it *safely* - by skipping the doctrine it cannot find - so the corpus degraded silently while every individual file still read correct.

**The measured scale, using the finished checker against the ORIGINAL `origin/main` corpus: 34 structural defects — 25 dangling refs, 4 unindexed files, 4 orphaned index rows, 1 impossible bare ref.**

The author's counts of that same unchanged corpus went **10** (hand grep) -> **16** (checker v1) -> **25** (checker final). Every published count was confident, evidence-backed, and low.

---

## Section 2 - YOUR FINDINGS, AND WHAT THE AUTHOR CLAIMS HE DID

Verify each against the code. The author's own words are quoted so you can attack the reasoning, not just the result.

| Your finding | Author's claim | Verify |
|---|---|---|
| **W1** `components.md:4` `§§9–22` invisible; en-dash range parsed as lone `§9` | Regex now accepts `,` / `and` / en-, em-, hyphen ranges AND **expands** them. Also discovered the real cause was broader: the regex required *whitespace* after the filename, so `` `design.md` §25 `` never matched at all — **8 dangling refs were hidden behind a backtick**, on the "Extends:" header line of the most-loaded satellites. Fixed: `anti-patterns.md:3` §27→§14, `motion.md:4` §25→§8, `components.md:4` §§9–22→§§6,11–12, `motion.md:41` `reviewers.md §4`→`§A2 lens 4`. | Is the regex right now? What other citation *shapes* still evade it? |
| **W2** index.md claims the gate catches D3 attic rot; the gate exempts attic basenames | **Conceded as the branch committing its own sin.** Exemption now requires the *mention itself* to be marked ATTICKED, so an honest record passes and a live-looking row fails. Proven by stripping the marker: 2 rows flagged where 0 were before. | Is the ATTICKED-marker test robust, or trivially defeated? |
| **W3** hook validates working tree, not staged index | Hook now **refuses to certify at all** when any brain file differs between tree and index, rather than issuing a verdict about the wrong tree. Proven with the exact stage-broken/fix-on-disk attack; HEAD unchanged. | Is refusing correct, or should it check the index properly? What does this block that it shouldn't? |
| **W4** `anti-patterns.md:49` §15 for tier badges may be an 18th wrong-target | **Checked, NOT changed.** Canon §15 does carry "color never sole signal", so the a11y rule is the right target; the badge is just the example. | Agree or overturn. |
| **W5** `components.md:49` 24px modal radius vs README's canon scale | **False alarm caused by the author.** The README abbreviated canon's radius scale and dropped `24 modals`, making canon look self-contradictory. Canon §9 in full: `20` cards, `12` controls, `999` pills, `24` modals. README now quotes it complete. | Confirm. |
| **W6** README describes a "build" that does not exist; hook message says D1/D2/D3, omits D4 | Both fixed; README rewritten to describe actual behaviour including the tree-vs-index refusal and the no-CI reality. | Is the new description now accurate, or has it drifted again? |
| **I1** refs to files outside corpus silently skipped; case-mismatch | Skipped targets are now **counted and listed** in output. Resolution is case-insensitive. Both current external targets verified real files. | Sufficient? |
| **I2** D2 substring containment; `techniques.md` ⊂ `field-techniques.md` | Exact-name set matching now. | Confirm. |
| **I3** decimal refs coerced (`§1.7` -> `§1`) | No longer coerced — `§9.2` is checked as `9.2` and flags. Also: `## 15.1` headings were unparseable, so a LIVE section read as dangling. | Confirm both directions. |
| **I4** bare filename refs unvalidated; `./index.md` ambiguity | **FOUR files in this corpus are named `index.md`** (top level, adapters/, obsidian/, graphify/). Basename keying resolved against whichever was read last. Resolution is now path-aware relative to the citing file, falling back to basename ONLY when unique, reporting ambiguity otherwise. | Is the resolution order right? |

### Self-found after your review (attack these too)

- **Unbounded range expansion was a DoS.** `§§1–99999` expanded to 99,982 findings. Now bounded at `MAX_RANGE_SPAN = 50`; reversed and absurd ranges are reported as ONE malformed ref that can never resolve.
- **Author destroyed two of his own fixes** with `git checkout --` during a probe; the gate caught it (CLEAN -> FAIL).

### Found independently, NOT fixed, deferred to Sean

1. `CLAUDE.md:157` and `AGENTS.md:163` (rule 40) cite `cinematic-pages.md §8/§18`. Max is §17; **§18 has never existed in any revision**.
2. `design.html` does not mirror canon at all — its own scheme (§2 TYPOGRAPHY, §3 SPACING, §7->§12 gap) vs canon's §2 Taste Bible, §3 Optics. A wrong-target *generator*.
3. `design.md:14` claims `design.html` is generated by `pnpm canon:build` with CI reverting hand edits. **No such script, no CI job, and the repo does not use pnpm.**

That third is the **third fictional mechanism** found in this corpus (after `swan/spacing` lint rules that exist in 8 docs and 0 code, and the gate's own D3 claim). Sean has approved a follow-up slice to sweep every "enforced by / generated by / CI reverts" claim in the brain. **Is that the right next move, and what should its acceptance criteria be?**

---

## Section 3 - THE DELTA YOU HAVE NOT SEEN (commits 8-9, verbatim)


```
14ccb43d2445ccff816fcd8ef89d173945475a98
fix(design-brain): bound range expansion — one typo was a 100,000-finding DoS

Dry-loop round 2, adversarial input against the range expansion I added one
commit earlier. `§§1–99999` expanded to 99,982 dangling records: a single
mistyped digit floods the output, buries every real finding, and makes the gate
useless at exactly the moment someone needs it.

Ranges wider than 50 sections — and reversed ranges like `§§22–9` — are now
reported as ONE malformed reference instead of expanded. No real document has a
50-section span, so a wider one is a typo or hostile input either way, and a
malformed range can never resolve.

The fix I shipped for a real bug carried a worse bug than the one it fixed. That
is the argument for attacking new code from a fresh angle rather than re-reading
it: the range expansion was correct on every input I had in mind, and I only had
correct inputs in mind.

Other edge cases confirmed handled while here: decimal refs are not coerced
(`§9.2` flags rather than reading as `§9`), a `../../../etc/passwd.md` citation
is reported as an unvalidated external target with no filesystem access
attempted, and `DESIGN.md §9` resolves case-insensitively as a human means it.

Corpus CLEAN (70 refs, 0 dangle). Suite 73/73.

SWA-163.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>

----------------------------------------
91417a3b049d1b87ec592e2590c3d9fb30bc9015
fix(design-brain): MRI findings — the gate lied about itself, and missed 8 refs behind a backtick

GLM-5.3 hostile review of this branch. Verdict: merge with fixes. It found the
branch committing the exact sin it exists to purge, and the checker missing an
entire syntactic class. Both correct.

W2 — THE GATE LIED ABOUT ITSELF. index.md said the D3 check "now catches" attic
rot. It did not: `orphaned` exempted any name whose basename existed anywhere
under docs/_attic, so replaying 4d192e5ac — file moved to attic, row still
presenting it as live doctrine — was silent. My injected-defect "proof" had
tested a row pointing at a file deleted outright, i.e. the class that did NOT
happen. The exemption now requires the MENTION to be marked ATTICKED, so an
honest record passes and a live-looking row fails. Proven by stripping the
marker: 2 rows flagged where 0 were before.

W1 — 8 DANGLING REFS BEHIND A BACKTICK. The ref regex required whitespace after
the filename, so `` `design.md` §25 `` never matched. Every satellite's
"Extends:" header line was invisible to both the original hand grep AND the
checker that replaced it:
  anti-patterns.md:3  §27 -> §14   (old "Anti-patterns summary" -> Anti-generic bans)
  motion.md:4         §25 -> §8    (old "Motion summary" -> Two-speed law)
  components.md:4     §§9–22 -> §§6, 11–12
  motion.md:41        adapters/reviewers.md §4 -> §A2 lens 4 (accessibility)
Ranges are now expanded rather than read as their first element — `§§9–22`
parsed as a lone resolving `§9`, so the dangling half shipped inside the branch
that killed that class.

**GLM flagged anti-patterns.md §27 in its FIRST review and I dismissed it**,
because my backtick-blind grep found nothing. It was right; my instrument was
broken. That is the second time this session an unvalidated negative overrode a
correct external finding.

W3 — the hook validated the working tree, not the staged index. Stage broken,
fix on disk, commit: gate passes, broken blob lands. It now refuses to certify
at all when brain files differ between tree and index. Proven by that exact
attack; HEAD unchanged.

Checker also fixed: decimal headings (`## 15.1`) were unparseable, so a live
section read as dangling; FOUR files here are named index.md and basename keying
resolved `index.md §3` against whichever was read last, so resolution is now
path-aware relative to the citing file; D2 used substring containment, and
`techniques.md` is a substring of `field-techniques.md`, so that row could be
deleted undetected forever; refs to files outside the corpus are now COUNTED and
listed, because a typo is indistinguishable from an external doc (both current
ones verified real).

W4 checked, NOT changed: anti-patterns.md:49 §15 is correct — canon §15 does
carry "color never sole signal". W5 was a false alarm caused by MY README
abbreviating canon's radius scale and dropping `24 modals`, which made canon
look self-contradictory; the scale is now quoted complete. W6 fixed: the README
described a "build" that does not exist and a gate two commits out of date.

All four classes re-proven by injection after the rewrite. 70 refs resolve, 0
dangle. Suite 73/73.

SWA-163.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>

----------------------------------------

```

```diff
diff --git a/.githooks/pre-commit b/.githooks/pre-commit
index 2b5082b52..14da71f6d 100755
--- a/.githooks/pre-commit
+++ b/.githooks/pre-commit
@@ -114,9 +114,21 @@ fi
 BRAIN_LINKS="$REPO_ROOT/scripts/design-brain/check-brain-links.mjs"
 if git diff --cached --name-only | grep -qE '^docs/ai-workflow/design-brain/'; then
   if [[ -f "$BRAIN_LINKS" ]]; then
+    # The checker reads the WORKING TREE, not the staged index. If any brain file differs
+    # between them, a pass here says nothing about the blob being committed: stage a broken
+    # file, fix it on disk without staging, and the gate waves the broken blob through.
+    # Refuse to certify in that state rather than issue a verdict about the wrong tree.
+    BRAIN_UNSTAGED="$(git diff --name-only -- docs/ai-workflow/design-brain/ scripts/design-brain/)"
+    if [[ -n "$BRAIN_UNSTAGED" ]]; then
+      echo "COMMIT BLOCKED: Design Brain files differ between the working tree and the index." >&2
+      echo "  The structural check reads the working tree, so it CANNOT vouch for what you are committing." >&2
+      echo "  Stage or stash these, then commit:" >&2
+      echo "$BRAIN_UNSTAGED" | sed 's/^/    /' >&2
+      exit 1
+    fi
     echo "[pre-commit] Running Design Brain structural check (dangling refs / index law)..."
     if ! node "$BRAIN_LINKS"; then
-      echo "COMMIT BLOCKED: Design Brain structural defect (see D1/D2/D3 above)." >&2
+      echo "COMMIT BLOCKED: Design Brain structural defect (see D1-D4 above)." >&2
       echo "  A dangling ref makes an agent silently SKIP the doctrine it cannot find." >&2
       exit 1
     fi
diff --git a/docs/ai-workflow/AI-HANDOFF/GLM-53-MRI-REPAVE-REVIEW.md b/docs/ai-workflow/AI-HANDOFF/GLM-53-MRI-REPAVE-REVIEW.md
new file mode 100644
index 000000000..f1bd92302
--- /dev/null
+++ b/docs/ai-workflow/AI-HANDOFF/GLM-53-MRI-REPAVE-REVIEW.md
@@ -0,0 +1,36 @@
+# GLM Consult
+
+**Model:** glm-5.3
+**Document:** docs/ai-workflow/AI-HANDOFF/GLM-MRI-REPAVE-PACKET.md
+**Tokens:** 26831 in / 32000 out (reasoning: 30150) | total 58831
+**Wall:** 477.3s
+
+---
+
+# Verdict
+
+This is partly sound work that should merge with fixes. The repave itself (16 dangling refs, index honesty, 17 wrong-target redirects) is internally consistent everywhere I can cross-check it against the branch's own canon map, the `authority.mjs` fail-closed fix is correct and correctly tested, and the checker is a genuinely better instrument than the hand grep it replaced. But the branch commits the exact sin it was founded to purge — **three places where new doctrine describes enforcement the code does not actually perform** (the index.md claim that the gate catches D3 attic rot, the README's "fails the build," the hook's own error message) — the gate's wiring validates the **working tree instead of the staged index**, so a broken commit can pass by fixing the file after `git add`, and there is **at least one live dangling ref still in the corpus** (`components.md:4`, invisible to the checker because of an en-dash) — in the header line of the most-loaded satellite file, after a repave whose entire purpose was killing that class. The checker was the right first move; it is not the thing Sean asked for (the manifest generator), and the branch should say so.
+
+---
+
+## 1. Defects in the fix
+
+### WRONG — the fix itself damages or lies
+
+| # | Finding | Where | Severity | Why it costs |
+|---|---|---|---|---|
+| W1 | **`design.md` §§9–22` still cites §18–§22, which don't exist.** The en-dash range form is invisible to `refsIn` — the regex continuation accepts only `,` and `and` (`(?:\s*(?:,\|and)\s*§?\s*\d+)*`), so `§§9–22` parses as a single ref to §9, which resolves. The dangling half of the range ships to main inside the branch that killed it. This is line 4 of `components.md` — the "Extends" line every loader reads first. | `components.md:4`; `check-brain-links.mjs:~100` (`refsIn` regex) | **HIGH** | Same consequence as the original rot: an agent reading the extends-line tries §18–§22, resolves "safely" by skipping. The gate reports CLEAN over it today. |
+| W2 | **The index.md attic note claims the gate catches the exact rot class the gate exempts.** New text: "the rot `check-brain-links.mjs` now catches (D3)." But `orphaned` returns `false` for any listed name whose **basename exists anywhere under `docs/_attic`** (`if (atticBasenames.has(basename(name))) return false;`). Replay the 4d192e5ac incident — file moved to attic, index row still presenting it as live doctrine — and the gate is silent. The injected-defect "proof" tested a row pointing at a file deleted outright, i.e., the class that *didn't* happen. | `index.md:~71–77, ~81–84`; `check-brain-links.mjs:~196` | **HIGH** | This is the branch's own corollary #2 — "a cited mechanism is not an existing mechanism" — committed by the branch, in the corpus, in the same push. And the historical rot class is permanently ungated as written. |
+| W3 | **The gate validates the working tree, not the staged index.** The hook runs `node $BRAIN_LINKS` against files on disk. Stage a broken brain file, fix the file on disk without staging, commit: gate sees the fixed disk, passes, main receives the broken blob. Inverse: unstaged breakage in a *sibling* brain file blocks a commit whose staged content is fine. Both symptoms, one root: checking the wrong tree. | `.githooks/pre-commit:117–121` | **HIGH** | This is the direct answer to "what makes it exit 0 over a broken corpus" — no malice required, ordinary `git add` ordering does it. |
+| W4 | **`anti-patterns.md:49` keeps `design.md §15` for "Tier badges … pair color with text/icon (a11y)".** Commit e9440279 asserts §15 "mentions badges and tints exactly zero times," and every sibling badge ref (hermes:27, components:56,70, website-archetypes:470) was repointed to §11. This one was in neither the redirect list nor the checked-and-left-alone list. Either it's the lone correct §15 (generic a11y pairing rule) or it's the 18th wrong-target ref, missed in both passes. Verify against canon §15 text or repoint. | `anti-patterns.md:49` | MED | If wrong, it's the highest-danger class the branch itself defined: resolves confidently, misleads. |
+| W5 | **`components.md:49` attributes "24px radius" modal chrome to `design.md §11` while README item 7 states canon radius as `20` cards · `12` controls.** Either §11 contains a 24 the README example hides, or the modal spec is off-canon — i.e., the token schism is *live inside a repaved file*, not just between design.md and typography-grid. | `components.md:49` vs `README.md:37` | MED | Sean's pending scale decision cannot be made from the README summary if canon itself carries a third value for modals. Ten-second check. |
+| W6 | **README's gate description is stale within the branch's own lifetime.** "fails the build on a reference to a *canon* section that does not exist" — written before 155d66db widened to satellite refs and e9440279 added D4. It also says "fails the build"; there is no build, only a pre-commit hook and an npm script. The hook's own block message says "(see D1/D2/D3 above)" — D4 absent. Four commits of doctrine drift, in the branch that exists to stop doctrine drift. | `README.md:40`; `.githooks/pre-commit:119` | LOW–MED | The describing text is what future agents will trust; it is already wrong on arrival at main. |
+
+### INCOMPLETE — same-class gaps in coverage
+
+| # | Finding | Where | Severity | Why it costs |
+|---|---|---|---|---|
+| I1 | **Refs to files not in the corpus are silently skipped** (`if (!targetSections) continue;`). A misspelled `motions.md §4`, or a case-mismatched `Design.md §9` (the regex is `/i`, the Map lookup is not — and this is a Windows/MSYS repo where the filesystem is case-insensitive), passes as "not ours to validate." The checker cannot distinguish "external doc" from "typo." At minimum, count skipped targets in the summary so silence becomes visible. | `check-brain-links.mjs:~118` | MED–HIGH | Filename rot is the same failure class as section rot; it is entirely ungated. |
+| I2 | **D2 uses substring containment** (`indexText.includes(basename(f))`). `techniques.md` is currently a substring of the listed `field-techniques.md` — so deleting the `techniques.md` row while leaving `field-techniques.md` listed would go undetected forever. Parse index rows into a set; compare exactly. | `check-brain-links.mjs:~168` | MED | The index law is enforced by a mechanism that can't see row deletions for any suffix-named file. Live latent pair exists today. |
+| I3 | **Decimal refs are silently coerced**: `§1.7` parses as `§1`. The fix for anti-patterns:70 was content-level; the parser still accepts `§9.2` as a valid `§9` ref for every future author. | `refsIn`, `check-brain-links.mjs:~100` | LOW–MED | Precision loss with no signal. |
+| I4 | **Bare filename refs are unvalidated** — `qa-gates.md` cites `cinematic-pages.md`; `hermes.md:27` cites `./index.md`, which resolves to `adapters/index.md` — **[HYPOTHESIS] does that file exist?** If not, the adapter's normative "per `./index.md`" points at a constitution that isn't there, and no check sees it. Renaming/atticking any cited-without-
diff --git a/docs/ai-workflow/AI-HANDOFF/GLM-MRI-REPAVE-PACKET.md b/docs/ai-workflow/AI-HANDOFF/GLM-MRI-REPAVE-PACKET.md
new file mode 100644
index 000000000..ee20afc88
--- /dev/null
+++ b/docs/ai-workflow/AI-HANDOFF/GLM-MRI-REPAVE-PACKET.md
@@ -0,0 +1,1479 @@
+# GLM-5.3 MRI — HOSTILE REVIEW OF THE DESIGN BRAIN REPAVE
+
+- **Requested by:** Sean (owner, SwanStudios) - **Assembled by:** Claude Opus 5 - **Date:** 2026-08-16
+- **Target:** branch `claude/design-brain-repave-20260816`, 7 commits, 15 files, +492/-47, already pushed to origin. NOT merged.
+- **Baseline:** `origin/main` @ `8257e42b6`.
+
+---
+
+## Section 0 - YOUR REMIT
+
+You reviewed the Swan Brain earlier today and found the defects this branch claims to fix. **This is the MRI of the fix itself.** Sean's instruction: hostile review, he makes fixes until it runs dry.
+
+Your job is NOT to re-report the original findings. It is to attack **the work that responded to them**:
+
+1. **Is the fix correct?** Where is a repaired reference pointed at the wrong section anyway? Where is a claim in a commit message false? Where does the code have a bug?
+2. **Is the fix complete?** What defect of the same class is still in the corpus and was missed? The author's own hand-grep missed 6 of 16 refs and an entire subdirectory before a tool was written — assume more was missed.
+3. **Is the gate sound?** `check-brain-links.mjs` is new and now blocks commits. Can it be bypassed, fooled, or made to pass over a broken corpus? Does it have false positives that will get it disabled? Does it fail open anywhere?
+4. **Is the reasoning honest?** The commit messages make specific claims about what was verified and why decisions were made. Attack those claims. Where is confidence unearned? Where does a message describe a mechanism that does not exist (the exact failure this branch found in the doctrine it was fixing)?
+5. **What should have been done instead?** If an approach is wrong-headed, say so and name the better one.
+
+**Ground rules:**
+- Cite file and line from the diff. "This looks fragile" is worthless; "line N does X, so input Y produces Z" is the product.
+- **Assume the author is wrong until the diff proves otherwise.** He under-counted his own verified finding by 60% earlier today.
+- Mark speculation `[HYPOTHESIS]`. Do not claim something is absent from the system when it is merely absent from this packet.
+- If something is genuinely right, one line, then move on.
+- **Anything else in scope** - including whether this whole effort was worth doing versus the alternatives you recommended (manifest + load packs, measurement instrument).
+
+---
+
+## Section 1 - WHAT THE WORK WAS SUPPOSED TO DO
+
+Your earlier review found, and the author independently verified against `origin/main`:
+
+1. **Cross-reference rot.** A canon rewrite renumbered `design.md` from §1-28 down to §1-17; satellites still cited §18-§28. An agent following a dead pointer resolves it *safely* - by skipping the doctrine it cannot find - so canon supremacy was fiction on every path that hit one.
+2. **`index.md` breaks its own stated law** ("every file in this folder is listed here").
+3. **Token schism.** `design.md` §9 and `typography-grid.md` §3/§5/§6 state different spacing/radius/easing scales.
+4. **Egress policy has zero production callers.**
+5. **Revocation fails open.** `authority.mjs` defaulted `revokedIds = []`.
+
+Sean asked for two things: the cheapest protective one-liner (#5, unrecoverable once signing keys exist), and the repave (#1, #2, #3) - "ideally as a manifest generator so it can't silently rot again."
+
+### What the author decided NOT to do, and why
+
+**#3 token schism was left unfixed.** Your review concluded `typography-grid.md` was "dead letter or permanent exception noise" **because the lint enforces canon**. The author checked: `swan/spacing`, `swan/z-scale` and `swan/two-speed` appear in **eight documents and in zero lines of code**; the only real token linter (`scripts/ci/check-token-discipline.mjs`) checks raw hex only. So neither scale is mechanically canonical, reconciling them changes button/card geometry on every surface, and the brain's own enforcement item 4 says new/changed tokens are proposals to Sean. Left open, flagged in `README.md`. **Attack this reasoning if it is wrong.**
+
+**#4 egress was left alone** as out of scope for this branch.
+
+### What the author claims the dry loop found (attack these too)
+
+Across two dry-loop cycles the author reports finding, in his own work: the checker matched nothing on this CRLF repo (JS `.` does not match `\r`); a `sed` that fixed only the first match per line left two more wrong refs on one line; a bare `§18` in a 17-section file that the checker deliberately skipped; and a misleading error message naming the wrong file. Each was fixed in a later commit on this branch.
+
+---
+
+## Section 2 - THE COMMIT MESSAGES (the reasoning, verbatim - attack the claims)
+
+
+```
+b7e00b1dfc89e62f95de537d42b870ec6346e904
+docs(hermes): learning packet — build the counter before you quote the count
+
+Lands on this branch rather than the working tree so it reaches main with the
+work it describes. The working tree is 1,948 commits behind; a durable packet
+written there compounds nowhere.
+
+The lesson: I reported 10 dangling refs and there were 16. Each of the 10 was
+real and individually verified — but a `[VERIFIED]` count asserts two things,
+that each item is real AND that the search was exhaustive, and I only proved the
+first. The wrong number reached three commit messages, a Linear issue and a memo
+before anything checked it, because counts get copied rather than re-derived.
+
+Also records the entry that matters most: believing a negative from an
+unvalidated instrument happened THREE times this session, and it was already
+written up in memory beforehand. A lesson documented and then repeated proves the
+write-up was not the fix, so the packet states the procedural correction rather
+than another resolution to be careful.
+
+External-model calibration for GLM-5.3: observations 5/5 verified true;
+one causal attribution invented (a linter it claimed enforces canon does not
+exist in code) — and that fabricated mechanism was exactly what would have
+licensed resolving the token conflict without Sean. Trust its observations,
+verify its mechanisms.
+
+Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
+
+---------------------------------------------
+e9440279c204be3a3bc37b849cfb0a02af2bbec2
+fix(design-brain): three refs the last pass missed, and the blind spot that hid them
+
+Dry-loop round 1 on the wrong-target pass. Three findings, all from the same
+root: my line-addressed `sed` fixed the FIRST match on a line, and refs travel
+in clusters.
+
+`adapters/hermes.md:27` carries THREE section refs. I fixed one and reported the
+line done. The other two were both wrong:
+  - "Tier badges appear wherever §15 applies" — bare, stale; tier badges are §11
+  - "lightened text tints noted in design.md §15" — the tints are crystallized in
+    §6 (`--lavender-text` / `--purple-text` / `--danger-text`). §15 is the
+    accessibility floor and mentions badges and tints exactly zero times.
+
+`components.md:58` — "route through confirm (§17) or two-step arm (§18)". These
+are self-references, and they are off by one: confirm is §16, two-step arm is
+§17, and **§18 does not exist** — the file has 17 sections. A dangling reference
+that survived the whole repave because it was bare.
+
+That last one is the important part. The previous commit documented bare `§N` as
+a deliberate blind spot, reasoning that self-references would produce false
+positives and a gate that cries wolf gets ignored. The reasoning was sound and
+the conclusion was too weak: a bare ref cannot be ATTRIBUTED, but it can be
+proven IMPOSSIBLE. If N exceeds both canon's highest section and the containing
+file's own highest, no reading of it resolves.
+
+So D4 gates exactly that and nothing more. A bare `§6` in a 17-section file is
+still not flagged, even if it meant something else — proving that needs intent.
+Under-reporting is the price of never crying wolf, and the fix for a genuinely
+ambiguous ref is to cite the filename, which promotes it to the D1 check.
+
+Ref count 43 -> 44: `hermes.md:27`'s bare `§15` became an attributed `design.md
+§11`, which is the promotion the rule intends.
+
+Verified by injection again (D4 fires on `§99`, silent on every real self-ref),
+plus a message fix for files with no numbered headings, which previously read
+"this file has §1–§0". Suite 73/73. Gate CLEAN across all four classes.
+
+SWA-163.
+
+Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
+
+---------------------------------------------
+9acc17c03cb05512ac8dfe265093bf9d9faa9692
+fix(design-brain): 17 wrong-target refs — pointers that resolved, and lied
+
+The dangling refs were the visible half. These are the dangerous half: they
+RESOLVE, so no gate catches them and no agent hesitates — it reads confident
+doctrine from the wrong section and proceeds. The canon rewrite moved content
+between sections; these pointers kept their old numbers and quietly acquired new
+meanings.
+
+Every redirect verified by locating the concept's ACTUAL section in canon, not
+by assuming the old ordering shifted uniformly:
+
+  builders.md:48        §4  -> §6   token names live in Color, not Dispersion law
+  hermes.md:27          §15 -> §11  the T0-T4 badge table is Components, not A11y
+  anti-patterns.md:17   §3  -> §5   Cyberforest/ops is Worlds, not "Optics"
+  anti-patterns.md:25   §8  -> §10  weighted minmax columns is Layout, not Two-speed
+  anti-patterns.md:62   §7  -> §9   elevation glass+glow is Space/elevation, not Type
+  anti-patterns.md:70   §1.7-> §1   §1 has no numbered subsections; .7 never existed
+  components.md:11      §10 -> §11  button variants are Components, not Layout
+  components.md:13      §5  -> §6   Dual-Button Glow matrix is Color — and §6 is
+                                    literally titled "Color, contrast & Dual-Button Glow"
+  components.md:18      §9  -> §11  SheenCard is a Card
+  components.md:56,70   §15 -> §11  tier badges again
+  motion.md:53,56       §9  -> §11  data cards / SheenCard are Components
+  qa-gates.md:34        §10 -> §6   the focus-visible matrix is crystallized in §6
+  qa-gates.md:51        §7  -> §9   the spacing scale is §9; §7 is Typography
+  website-archetypes:470 §15-> §11  "badge ladder" is the §11 tier badges
+
+Checked and left alone because they were already right — the point of the audit
+was to find the wrong ones, not to renumber on a pattern:
+  hermes.md:25 §4 (Danger red IS Dispersion law's one off-palette semantic)
+  anti-patterns.md:41 §14 (§14 bans user-facing "AI" via copy CI grep)
+  plus the 12 refs repaired in a9bd5fb25.
+
+One honest imperfection: motion.md:54 cited §17 for "tables, forms mid-entry,
+low-tap trainer flows." No low-tap-flow doctrine survives anywhere in canon — the
+rewrite dropped the concept. Redirected to §11 because tables and inputs do live
+there, but the motion-in-live-session rule it was reaching for no longer exists.
+That is a doctrine gap, not a pointer gap, and renumbering cannot fix it.
+
+Structural gate stays CLEAN (43/43 resolve). Diff is 17 insertions / 17
+deletions — line-addressed edits, so the 25 already-correct refs were untouched,
+verified individually after the fact.
+
+SWA-163.
+
+Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
+
+---------------------------------------------
+155d66db3bd8d3bba21b8dc87870a2d211dddb65
+fix(design-brain): the checker only watched half the corpus
+
+Dry-loop round 2 against my own round-1 work. The gate validated references to
+canon and ignored satellite-to-satellite ones — `adapters/hermes.md` cites
+`motion.md §4`, and nothing checked it. That is the identical rot class: renumber
+motion.md and the pointer dies just as silently, with the same consequence (the
+agent skips the doctrine it cannot find). It resolves correctly today; nothing
+was keeping it that way.
+
+Now parses both heading dialects — canon writes `## §9 Title`, satellites write
+`## 4. Title` — and validates every `<file>.md §N` reference against that file's
+own sections. Coverage went 39 -> 43 refs.
+
+Widening the check broke its own reporting: a `motion.md §77` break printed
+"reference to a canon section that does not exist (canon has §1-§17)", naming
+the wrong file and the wrong range. Each dangling ref now names its actual
+target and that target's real range. Both paths re-proven by injection:
+  motion.md §77   -> "motion.md has §1-§10, not §77"
+  design.md §99   -> "design.md has §1-§17, not §99"
+
+Deliberately NOT closed, and documented in the source: bare `§N` with no
+filename. Several files use bare `§N` for their own sections, so resolving them
+against canon would produce false positives — and a gate that cries wolf gets
+ignored, which is worse than a gate with a stated blind spot. Same reasoning
+that made D3 resolve cross-folder and attic paths in the first pass.
+
+Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
+
+---------------------------------------------
+5467e82978a555da87646bf832b9a54ff719aae2
+docs(design-brain): conflict law — precedence is how you READ, not licence to choose quietly
+
+The corpus had no rule for what an agent does when two canonical files disagree.
+Every contradiction therefore resolved to agent discretion, which is the
+minimum-effort failure mode codified: two agents read two docs and ship two
+different products, both defensibly.
+
+Adds enforcement-contract item 7: canon > satellite > adapter for READING, but a
+token-VALUE divergence is a corpus defect — stop, surface it, do not silently
+pick. Names the live one (spacing/radius/easing/duration between design.md
+§8/§9 and typography-grid.md §3/§5/§6) rather than leaving it for the next agent
+to rediscover.
+
+Correcting the review's premise while landing it: the hostile review assumed the
+lint enforced canon, and concluded typography-grid was therefore "dead letter or
+permanent exception noise." Verified false — `swan/spacing`, `swan/z-scale` and
+`swan/two-speed` appear in eight documents and in NO code; the only real token
+linter, scripts/ci/check-token-discipline.mjs, checks raw hex and nothing else.
+So neither scale is mechanically canonical, and reconciling them is a visual
+decision affecting every surface — Sean's call under enforcement item 4, not a
+mechanical cleanup I should make. Left open and flagged rather than guessed.
+
+Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
+
+---------------------------------------------
+a9bd5fb25b12e053cca838a952eb7e4774867875
+fix(design-brain): repave the corpus — 16 dangling refs, index law, and a gate so it cannot rot again
+
+A canon rewrite renumbered design.md from §1-28 down to §1-17 and no satellite
+followed. An agent that follows a dead pointer resolves safely by SKIPPING the
+doctrine it could not find, so canon supremacy was fiction on every path that
+hit one. This repaves the corpus and installs the gate that makes the rot
+impossible to reintroduce silently.
+
+D1 DANGLING (16 refs repaired). Old -> new, each verified against the section's
+actual content, not guessed:
+  §28 gotchas        -> §9  (translateZ/stacking now lives in the z-scale bullet)
+  §19 Hermes         -> §5  (ops world: "Hermes operator cockpit, Sean-only")
+  §18 Coach Cmd Ctr  -> §5  (pro world names Coach Command Center explicitly)
+  §20 modals/drawers -> §11 (Components: "Modals/drawers: Graphite obsidian glass")
+  §21 navigation     -> §11 (Components: "Nav: left rail 72px")
+  §22 states         -> §12 (States & onboarding)
+  §24 wide-monitor   -> §10 (Layout & density: "cards never stretch to fill 4K")
+  §§14,18 / §§15,20  -> §§5,11 / §11 (chat surfaces + tier badges are Components)
+
+D2 UNINDEXED (4). index.md declares "every file in this folder is listed here"
+and did not list typography-grid / style-taxonomy / field-techniques /
+forge-compiler-contract. The brain's NEWEST doctrine was invisible to any agent
+loading it as designed.
+
+D3 ORPHANED (4). index.md still listed obsidian/ and graphify/ files atticked
+in 4d192e5ac. Recorded as ATTICKED with their real home rather than deleted —
+the record survives, the pointer stops lying.
+
+The gate: scripts/design-brain/check-brain-links.mjs, wired into .githooks/
+pre-commit (path-conditional, announce-if-absent, same idiom as the constitution
+and skill-registry guards) plus `npm run brain:links`.
+
+Two things worth knowing about the checker:
+- It nearly shipped broken. In JS `.` does not match `\r` — it is a line
+  terminator — so on this CRLF repo the `$`-anchored heading regex matched
+  nothing. A "parsed zero sections" guard caught it; without that guard the gate
+  would have reported CLEAN over a broken corpus forever. Guards on the
+  instrument, not just the subject.
+- It was proven to FAIL before it was trusted: one injected defect per class
+  (D1/D2/D3) each blocked a real commit attempt, and the corpus returned CLEAN
+  on restore.
+
+Deliberately NOT fixed here: wrong-target refs — pointers that resolve but land
+on the wrong section (e.g. button variants citing §10 Layout, Dual-Button Glow
+citing §5 Worlds, focus ring citing §10). Those are more dangerous than dangling
+ones because an agent follows them confidently, but repairing them is a semantic
+judgement per ref, not a mechanical fix. `npm run brain:links:titles` prints
+every ref beside its target heading for that pass. Tracked in SWA-163.
+
+Found by GLM-5.3 hostile review (SWA-163). The hand grep that preceded the
+checker found 12 of the 16 refs and 3 of the 4 unindexed files, and missed the
+adapters/ directory and the `§§14, 18` multi-ref form entirely — which is the
+argument for the checker over another careful human pass.
+
+Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
+
+---------------------------------------------
+1a098c15f093cc9b855199e98cb1cb2e92c8b03a
+fix(design-brain): revocation fails open — an absent list is not an empty list
+
+verifyAuthorityRecord defaulted `revokedIds = []`, so a caller that could not
+produce a revocation list was indistinguishable from one that produced an empty
+one. Every one of the four call sites spreads a caller-built object into it, and
+every production entry point defaults that object to `{}` — so the highest-
+privilege operation in the system (enabling Spec mode) consulted no revocation
+list at all and still verified.
+
+Latent today, catastrophic the day keys go live. Landing it now, before any key
+exists, is the whole point: after keys ship it is unrecoverable.
+
+The suite was certifying the hole. Two tests called assertSpecModeEnabled with
+no revocation list and asserted success; four more asserted failure and would
+now have passed for the wrong reason (missing list rather than the tamper under
+test). All six now pass `revokedIds: []` explicitly — the honest statement of
+"we consulted the list and it was empty."
+
+No production behaviour changes: those paths already failed on `publicKey
+required`, verified by probe. The engine is inert; this fix is free today and
+load-bearing later.
+
+Found by GLM-5.3 hostile review (SWA-163, finding 5), verified against source.
+
+Tests: 73/73 across 10 files (was 72 + 1 new RED→GREEN).
+
+Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
+
+---------------------------------------------
+
+```
+
+---
+
+## Section 3 - THE COMPLETE DIFF (verbatim, `origin/main...HEAD`)
+
+
+```diff
+diff --git a/.githooks/pre-commit b/.githooks/pre-commit
+index 80bb105ae..2b5082b52 100755
+--- a/.githooks/pre-commit
++++ b/.githooks/pre-commit
+@@ -111,4 +111,18 @@ if git diff --cached --name-only | grep -qE '^(CLAUDE\.md|AGENTS\.md|\.claude/sk
+   fi
+ fi
+ 
++BRAIN_LINKS="$REPO_ROOT/scripts/design-brain/check-brain-links.mjs"
++if git diff --cached --name-only | grep -qE '^docs/ai-workflow/design-brain/'; then
++  if [[ -f "$BRAIN_LINKS" ]]; then
++    echo "[pre-commit] Running Design Brain structural check (dangling refs / index law)..."
++    if ! node "$BRAIN_LINKS"; then
++      echo "COMMIT BLOCKED: Design Brain structural defect (see D1/D2/D3 above)." >&2
++      echo "  A dangling ref makes an agent silently SKIP the doctrine it cannot find." >&2
++      exit 1
++    fi
++  else
++    echo "[pre-commit] brain-links check: SCRIPT ABSENT in this checkout — skipped (announced, not silent)"
++  fi
++fi
++
+ exit 0
+diff --git a/docs/ai-workflow/design-brain/README.md b/docs/ai-workflow/design-brain/README.md
+index 8820f1aaf..b4171dfe4 100644
+--- a/docs/ai-workflow/design-brain/README.md
++++ b/docs/ai-workflow/design-brain/README.md
+@@ -33,6 +33,10 @@ Every agent that builds or reviews UI agrees to this:
+ 4. **Propose — never invent — new tokens.** A new color, spacing step, or radius is a proposal to Sean (and a paired update to `SWAN-CINEMATIC-DESIGN-SYSTEM.md` §B + CLAUDE.md Active Palette per that doc's §G maintenance rules). It is never a hardcoded hex in a component.
+ 5. **Verify responsive + accessibility** against `qa-gates.md` Gates 1–2 before claiming done.
+ 6. **Run visual QA** (`qa-gates.md` Gate 3 hostile critique) before claiming done, and produce the QA receipt it defines.
++7. **Conflict law — when two files in this folder disagree.** Precedence is **`design.md` (canon) > satellite (`motion.md`, `components.md`, `typography-grid.md`, …) > adapter**. But precedence is how you *read*, not a licence to proceed quietly: if a satellite states a token VALUE that canon also states and they differ, **STOP, do not pick one, and surface it** — the divergence is a defect in the corpus, and silently choosing means two agents ship two different products. Name the conflict in your task thread and in the QA receipt.
++   - **Open conflict, as of 2026-08-16 — spacing / radius / easing / duration.** `design.md` §8/§9 and `typography-grid.md` §3/§5/§6 state different scales (e.g. canon radius `20` cards · `12` controls; `typography-grid.md` `6/10/16/24/9999`, with buttons at `10`). **Neither is mechanically enforced:** canon says arbitrary values are `swan/spacing` lint errors, but no `swan/*` rule exists in the repo — `scripts/ci/check-token-discipline.mjs` enforces raw-hex discipline only. Until Sean rules on which scale wins, treat **canon as the read-precedence default** and flag any surface where the choice would be visible. Tracked in SWA-163.
++
++**Structural integrity of this folder is gated, not trusted.** `scripts/design-brain/check-brain-links.mjs` (`npm run brain:links`, and pre-commit on any `design-brain/` change) fails the build on a reference to a canon section that does not exist, a file missing from `index.md`, or an `index.md` row pointing at nothing. Run `npm run brain:links:titles` to audit the class it cannot judge: references that *resolve* but point at the wrong section.
+ 
+ ## 4. What this folder does NOT override
+ 
+diff --git a/docs/ai-workflow/design-brain/adapters/builders.md b/docs/ai-workflow/design-brain/adapters/builders.md
+index c9a23a92b..3f91e94ad 100644
+--- a/docs/ai-workflow/design-brain/adapters/builders.md
++++ b/docs/ai-workflow/design-brain/adapters/builders.md
+@@ -45,7 +45,7 @@
+ DESIGN RECEIPT — <surface name>
+ Surface:      <route + mounted component, file:line>   (rule 26 receipt: <link/anchor>)
+ Direction:    <Fable direction name, or "polish — no direction gate needed">
+-Tokens used:  <list — design.md §4 names only, e.g. --bg-base, --ice-wing, --gilded-fern>
++Tokens used:  <list — design.md §6 names only, e.g. --bg-base, --ice-wing, --gilded-fern>
+ Patterns:     <C-patterns / components.md entries reused — e.g. C12 glass panel (obsidian variant), C11 chart env>
+ Viewports:    <widths actually checked, with any monitor-class dims>
+ Motion:       <framer variants + reduced-motion handling, or "static">
+diff --git a/docs/ai-workflow/design-brain/adapters/hermes.md b/docs/ai-workflow/design-brain/adapters/hermes.md
+index 9e2dcb51f..205225612 100644
+--- a/docs/ai-workflow/design-brain/adapters/hermes.md
++++ b/docs/ai-workflow/design-brain/adapters/hermes.md
+@@ -24,11 +24,11 @@ Every command, button, and automation rendered in an operator surface shows its
+ | **T3** external-visible | Wing Purple `#8B5CF6` | `var(--wing-purple, #8B5CF6)` | Glow-accent weight; approval + receipt required |
+ | **T4** destructive/irreversible | Danger red `#E5484D` | `var(--danger, #E5484D)` | design.md §4's ONE off-palette semantic. No pulse/glow — gravity without alarm theatrics. Two-step confirm chrome mandatory |
+ 
+-Notes: this table is `../design.md` §15 verbatim — it reuses EXISTING tokens and coins none (no `--tier-*` tokens exist; an adapter may never introduce tokens, per `./index.md`). Tier badges appear wherever §15 applies — including the Coach Command Center product surface — not only in Cyberforest mode. Badges are text+color, never color alone (a11y); tier text ("T3") renders in Fira Code. Small badge text on dark uses the lightened text tints noted in design.md §15.
++Notes: this table is `../design.md` §11 verbatim — it reuses EXISTING tokens and coins none (no `--tier-*` tokens exist; an adapter may never introduce tokens, per `./index.md`). Tier badges appear wherever design.md §11 applies — including the Coach Command Center product surface — not only in Cyberforest mode. Badges are text+color, never color alone (a11y); tier text ("T3") renders in Fira Code. Small badge text on dark uses the lightened text tints crystallized in design.md §6 (`--lavender-text` / `--purple-text` / `--danger-text`).
+ 
+ ## 3. Operational-calm rules
+ 
+-- **No ambient motion on data-dense panels.** Queues, logs, receipts, registries: zero looping animation, zero parallax, zero hover-tilt. Motion in operator UI is reserved for state *transitions* (item approved → moves lane) and completes in ≤200ms (design.md §19 / motion.md §4 — adapters translate canon, never relax it). An operator scanning for anomalies must never compete with decoration.
++- **No ambient motion on data-dense panels.** Queues, logs, receipts, registries: zero looping animation, zero parallax, zero hover-tilt. Motion in operator UI is reserved for state *transitions* (item approved → moves lane) and completes in ≤200ms (design.md §5 (ops world) / motion.md §4 — adapters translate canon, never relax it). An operator scanning for anomalies must never compete with decoration.
+ - **Receipts render in Fira Code.** Audit receipts (`who · what+tier · target · when · approved-by · outcome · evidence`, per bridge §8 / `../../hermes-agentic-os/audit-receipts.md`) are monospaced, line-oriented, copyable. Never restyled into marketing cards.
+ - **Hierarchy is status → attention → action, in that order.** Top: system truth (health, kill-switch states, running automations). Middle: what needs Sean (approval queue, flagged anomalies). Bottom/edge: action affordances with tier badges. A command center that leads with buttons instead of truth is upside down.
+ - **Kill switches are a first-class panel** (bridge §9), never buried in settings. The master switch is always visible, always ≥44px.
+diff --git a/docs/ai-workflow/design-brain/anti-patterns.md b/docs/ai-workflow/design-brain/anti-patterns.md
+index 8b1851991..1d4585fd3 100644
+--- a/docs/ai-workflow/design-brain/anti-patterns.md
++++ b/docs/ai-workflow/design-brain/anti-patterns.md
+@@ -14,7 +14,7 @@
+ | **Retired Galaxy-Swan tokens** `#0a0a1a` `#00FFFF` `#7851A9` | Retired brand. Gemini sometimes still proposes them — reject on sight |
+ | **Hardcoded hex without `var(--token, #fallback)`** (rule 6) | Kills theming and drift detection; the fallback IS the contract |
+ | **Arctic Cyan `#50A0F0` on buttons/glow** | It is the DATA color; on controls it collapses the chart-vs-action distinction |
+-| **Cyberforest tokens on client-facing surfaces** | Operator mode is Sean-only (design.md §3); leakage blurs the product/operator boundary |
++| **Cyberforest tokens on client-facing surfaces** | Operator mode is Sean-only (design.md §5); leakage blurs the product/operator boundary |
+ | **The quarantined "LILA BAN"** (design-taste-frontend's purple-glow ban) | Directly contradicts the Dual-Button Glow rule. Swan doctrine wins; the skill stays quarantined |
+ 
+ ## Layout & composition bans
+@@ -22,11 +22,11 @@
+ | Ban | Why |
+ |---|---|
+ | **Generic SaaS template feel** (centered hero → 3-up features → logo row → CTA) | The #1 AI tell; Swan pages follow a named B2 arc with editorial asymmetry |
+-| **`repeat(4, 1fr)` equal card grids as default** | Equal weight says nothing is important; use weighted `minmax` columns (design.md §8) |
++| **`repeat(4, 1fr)` equal card grids as default** | Equal weight says nothing is important; use weighted `minmax` columns (design.md §10) |
+ | **Center-everything symmetry** | Kills hierarchy and rhythm; source §B mandates asymmetry and negative space |
+ | **Cards inside cards** | Double chrome, wasted padding, muddy elevation story; flatten to sections within one panel |
+ | **Hero-style dashboards** | Dashboards are Phase 1–4 working surfaces, not brand pages; decorative banners bury the data |
+-| **Stretched cards filling 4K** | Wide monitors get MORE columns, not bigger cards (design.md §24) |
++| **Stretched cards filling 4K** | Wide monitors get MORE columns, not bigger cards (design.md §10) |
+ | **Identical card grids with no hierarchy** | If everything is a medium card, nothing is the next best action |
+ 
+ ## Truth & content bans
+@@ -35,7 +35,7 @@
+ |---|---|
+ | **Fake/mock metrics presented as real** | Violates the Data-truth rule; mock data is a labeled gap, never dressed as proof |
+ | **Lorem ipsum shipping** | Placeholder copy in production is an integrity failure; write real SwanStudios-voice copy or a designed empty state |
+-| **Bare "No data" empty states** | Empty states are onboarding moments: Cormorant italic explanation + a CTA to create the first real thing (design.md §22) |
++| **Bare "No data" empty states** | Empty states are onboarding moments: Cormorant italic explanation + a CTA to create the first real thing (design.md §12) |
+ | **Yoga/meditation language** (rule 9) | Brand rule — use "stretching"/"flexibility" |
+ | **"NASM-certified" claims** | Credentials rule: "26+ years training experience," "NASM workshop-trained," "NASM-protocol" |
+ | **Calling Swan Coach "AI" user-facing** | Product naming rule (design.md §14) |
+@@ -49,7 +49,7 @@
+ | **Color as the only signal** | Tier badges, states, deltas always pair color with text/icon (a11y; design.md §15) |
+ | **Hidden controls on data cards** | Swan Card Standard: client/trainer/admin cards expose their actions; discovery-by-hover is a desktop myth |
+ | **Emoji glyphs as control icons** | Repo standard is lucide-react (the 2026-07-03 cart slice replaced emoji with lucide); emoji render inconsistently across platforms and can't be sized/labeled reliably |
+-| **Two stacked modals** | Decision-on-decision; use drawer + modal or sequence the flow (design.md §20) |
++| **Two stacked modals** | Decision-on-decision; use drawer + modal or sequence the flow (design.md §11) |
+ | **Destructive action adjacent to submit** | One mis-tap from data loss; separate spatially and by variant (Danger has no glow — destruction isn't celebrated) |
+ 
+ ## Motion & atmosphere bans
+@@ -59,7 +59,7 @@
+ | **Motion without purpose / dead decorative loops** | Fails the earned-motion test (`motion.md`); burns GPU and attention |
+ | **Neon overload / chaotic glow** | Glow is a discipline system with recipes (C12); more glow = less premium |
+ | **Ambient motion in calm zones** | Operator panels, data cards, forms — the data is the show (`motion.md` calm zones) |
+-| **Flat gray shadows** | Swan elevation is glass + tinted glow (design.md §7); gray drop-shadows read as 2015 Bootstrap |
++| **Flat gray shadows** | Swan elevation is glass + tinted glow (design.md §9); gray drop-shadows read as 2015 Bootstrap |
+ | **Flat depthless backgrounds on hero/marketing** | Source §B atmospheric rules require layered atmosphere; add gradient depth + 2–5% grain |
+ | **Ungated animation (missing reduced-motion)** | Accessibility failure AND a rule-25 violation; DUAL gating (CSS + JS) per `motion.md` |
+ 
+@@ -67,7 +67,7 @@
+ 
+ | Ban | Why |
+ |---|---|
+-| **Inventing new tokens/components inside a slice** | New tokens are PROPOSALS to Sean (design.md §1.7); silent invention = drift |
++| **Inventing new tokens/components inside a slice** | New tokens are PROPOSALS to Sean (design.md §1); silent invention = drift |
+ | **Updating design.html without design.md (or vice versa)** | They ship together; divergence makes the mirror a liar (README enforcement contract) |
+ | **Skipping the mounted-surface receipt before a UI fix** | Rule 26 — you may be styling a dormant component |
+ | **"Looks good" as a QA verdict** | qa-gates.md verdicts are binary gates with receipts, not vibes (rule 19) |
+diff --git a/docs/ai-workflow/design-brain/components.md b/docs/ai-workflow/design-brain/components.md
+index 01836e1bd..b20805b21 100644
+--- a/docs/ai-workflow/design-brain/components.md
++++ b/docs/ai-workflow/design-brain/components.md
+@@ -2,20 +2,20 @@
+ 
+ - **Date:** 2026-07-03 · **Author:** Fable (claude-fable-5) · **Status:** CANONICAL (within its scope)
+ - **Extends:** `design.md` §§9–22 (tokens, surfaces, tiers). **Source of truth:** `SWAN-CINEMATIC-DESIGN-SYSTEM.md` §C1–C12 — pattern recipes live there; this file maps components onto them and fixes anatomy/states/do-don't.
+-- Universal: every interactive element ≥44px (rule 2); `var(--token, #fallback)` only (rule 6); dark-first (rule 3); all data-bearing components ship empty/loading/error/success states (design.md §22); motion per `motion.md`.
++- Universal: every interactive element ≥44px (rule 2); `var(--token, #fallback)` only (rule 6); dark-first (rule 3); all data-bearing components ship empty/loading/error/success states (design.md §12); motion per `motion.md`.
+ 
+ ---
+ 
+ ## 1. GlowButton
+ 
+-- **Purpose:** every CTA and action trigger. Variants per design.md §10 (Primary / Accent / Luxury / Ghost / Danger).
++- **Purpose:** every CTA and action trigger. Variants per design.md §11 (Primary / Accent / Luxury / Ghost / Danger).
+ - **Anatomy:** 44px+ height, 12px radius, label (Plus Jakarta Sans; Sora on gaming surfaces), optional leading icon, glow layer as pseudo-element (opacity-animated, `motion.md` §2).
+-- **Dual-Button Glow (both directions, mandatory — design.md §5):** blue bg (Midnight Sapphire/Royal Depth) → **Wing Purple** glow + focus ring; purple bg (Wing Purple) → **Ice Wing** glow + focus ring. Conflicting library advice (LILA BAN class) is rejected, not adapted.
++- **Dual-Button Glow (both directions, mandatory — design.md §6):** blue bg (Midnight Sapphire/Royal Depth) → **Wing Purple** glow + focus ring; purple bg (Wing Purple) → **Ice Wing** glow + focus ring. Conflicting library advice (LILA BAN class) is rejected, not adapted.
+ - **States:** default / hover (glow up + 1–2% scale) / active (0.98) / focus-visible (2px glow-color ring, 2px offset) / disabled (40% opacity, no glow) / loading (inline spinner, label persists).
+ - **Do:** one Primary per view region; Danger gets `--danger` bg and NO glow (destruction isn't celebrated).
+ - **Don't:** Arctic Cyan anywhere on a button (data-only token); icon-only button without `aria-label`; two primaries side-by-side.
+ 
+-## 2. SheenCard vs low-motion data card (design.md §9)
++## 2. SheenCard vs low-motion data card (design.md §11)
+ 
+ - **SheenCard (sell/showcase):** C12 sapphire or luxury-gold glass + chrome edge + metallic sheen + glints + hover motion (C7 tilt allowed). For storefront/feature/ascension — anything meant to SELL. Family: C5/C6/C7.
+ - **Data card (client/trainer/admin/biometrics/program/workout-log):** same geometry and C12 chrome, dark-blue gradient surface, **low-motion**: no pointer tracking, no loops, no hover-only actions, no hidden controls. Compact grouped facts — never the same fact twice on one card; 44px icon buttons; wrap/stack at phone width.
+@@ -46,20 +46,20 @@
+ ## 6. Drill-down modal
+ 
+ - **Purpose:** expand a chart point / row / KPI into detail without navigation.
+-- **Anatomy:** design.md §20 modal chrome (Graphite C12-obsidian glass, 24px radius, blurred overlay); header names the exact entity drilled into; body = C11 mini-environment or data-card facts; footer = next-action CTA.
++- **Anatomy:** design.md §11 modal chrome (Graphite C12-obsidian glass, 24px radius, blurred overlay); header names the exact entity drilled into; body = C11 mini-environment or data-card facts; footer = next-action CTA.
+ - **States:** focus-trapped; ESC closes; **focus returns to the trigger element on close** (WCAG 2.4.3); loading skeleton inside, never a blank modal.
+ - **Don't:** modal-over-modal (drill again → replace content with breadcrumb back); hover-only drill affordance.
+ 
+ ## 7. Command dock
+ 
+ - **Purpose:** operator command entry (Coach Command Center, Hermes surfaces).
+-- **Anatomy:** docked bar/panel, Graphite surface, input (§11 field spec), command list rows each carrying exactly one T0–T4 tier badge (design.md §15), keyboard-first (↑/↓/Enter, visible focus).
++- **Anatomy:** docked bar/panel, Graphite surface, input (§11 field spec), command list rows each carrying exactly one T0–T4 tier badge (design.md §11), keyboard-first (↑/↓/Enter, visible focus).
+ - **States:** idle / typing (filtered list) / armed (T3+ selection shows confirm affordance inline) / executing (row-level spinner, dock stays interactive) / result (links to receipt row, §9).
+-- **Don't:** execute T3/T4 straight from the dock — route through confirm (§17) or two-step arm (§18); ambient motion (calm zone, `motion.md` §4).
++- **Don't:** execute T3/T4 straight from the dock — route through confirm (§16) or two-step arm (§17); ambient motion (calm zone, `motion.md` §4).
+ 
+ ## 8. Coach proposal card
+ 
+-- **Purpose:** Swan Coach / dictation / PLAUD draft output awaiting human approval (design.md §§14, 18).
++- **Purpose:** Swan Coach / dictation / PLAUD draft output awaiting human approval (design.md §§5, 11).
+ - **Anatomy:** T1 data card; **"DRAFT" badge** (Swan Lavender pill, top-left, text+color); proposed content diff-style (what will be written, for whom); approve + dismiss buttons ≥44px; provenance line (source: dictation/PLAUD/chat).
+ - **States:** draft / approving (button loading) / approved (morphs to receipt link) / dismissed (undo toast window) / error (why + retry).
+ - **Do:** writes land only through approval-gated endpoints (operator bridge §3) — the card is UI over that gate, never a bypass.
+@@ -67,10 +67,10 @@
+ 
+ ## 9. Approval-queue row + receipt ledger row
+ 
+-- **Approval-queue row (Coach Command Center / operator):** anatomy — tier badge (T0–T4 colors, design.md §15) + action summary + target entity + requester/source + age + approve/reject 44px targets; ≥48px row height; keyboard operable. States: pending / selected (detail panel opens) / processing / done. Don't: color-only tier signal; hover-revealed actions.
++- **Approval-queue row (Coach Command Center / operator):** anatomy — tier badge (T0–T4 colors, design.md §11) + action summary + target entity + requester/source + age + approve/reject 44px targets; ≥48px row height; keyboard operable. States: pending / selected (detail panel opens) / processing / done. Don't: color-only tier signal; hover-revealed actions.
+ - **Receipt ledger row:** immutable record of an executed command. Anatomy — timestamp + actor + tier badge + action + target + outcome, values in **Fira Code** (tabular figures, right-aligned numerics per §12 tables); links to rollback note where T4. States: success / failed (single `--danger` accent) / rolled-back. Don't: editable receipts; truncating the target entity on mobile (stack, don't clip).
+ 
+-## 10. Navigation rail (design.md §21)
++## 10. Navigation rail (design.md §11)
+ 
+ - **Anatomy:** left rail, icons + labels, collapsible to 72px icon rail; active item = Ice Wing edge + tint; 44px targets. Mobile: bottom tab bar ≤5 items, active = glow dot; Progress/workout never buried below social/profile (Product Core Loop).
+ - **States:** active / inactive / hover wash / focus-visible ring / collapsed (tooltip labels).
+@@ -88,12 +88,12 @@
+ - **States:** default / focus (Ice Wing border + soft ring — or Wing Purple, one accent per form) / error (`--danger` border + message + `aria-describedby`) / disabled / success (inline check).
+ - **Don't:** destructive action adjacent to submit; error color as the only error signal; clearing user input on failed submit.
+ 
+-## 13. Empty state (design.md §22)
++## 13. Empty state (design.md §12)
+ 
+ - **Anatomy:** Cormorant Garamond Italic explanation (why it's empty), one CTA to create the first real thing, optional on-brand still.
+ - **Don't:** bare "No data"; mock-filled chart as placeholder; multiple competing CTAs.
+ 
+-## 14. Skeleton / loading (design.md §22)
++## 14. Skeleton / loading (design.md §12)
+ 
+ - **Anatomy:** skeleton blocks matching final geometry (no shift on swap); shimmer = ambient tier, reduced-motion → static blocks. Spinners only for sub-400ms or inline-button loads.
+ - **Don't:** full-page spinner for panel loads; skeletons that don't match the layout they resolve into.
+@@ -106,14 +106,14 @@
+ 
+ ## 16. Confirm modal (T3)
+ 
+-- **Purpose:** gate external-visible actions (design.md §§15, 20).
++- **Purpose:** gate external-visible actions (design.md §11).
+ - **Anatomy:** modal chrome per §6; names **exact action + target** ("Send reminder SMS to client #482"); Wing Purple T3 tier badge; confirm button carries the action verb — never "OK"; cancel is the safe default focus.
+ - **States:** open (focus-trapped) / confirming (loading) / result. Focus returns to trigger on close.
+ - **Don't:** generic copy ("Are you sure?"); confirm as the initially-focused element; ESC disabled (allowed to cancel — this is T3, not T4 mid-flow).
+ 
+ ## 17. Two-step arm modal (T4)
+ 
+-- **Purpose:** destructive/irreversible actions (design.md §§15, 20).
++- **Purpose:** destructive/irreversible actions (design.md §11).
+ - **Anatomy:** step 1 **arm** — typed target name or explicit toggle; step 2 **execute** — danger button (`--danger` bg, no glow) enabled only after arming; Danger `#E5484D` T4 badge; **rollback plan line** visible before execution.
+ - **States:** unarmed (execute disabled) / armed / executing / done (links receipt + rollback note) / failed. ESC allowed before execution, not mid-execution.
+ - **Don't:** pre-filled arm input; single-click destructive paths anywhere in Swan; hiding the rollback line to save space.
+diff --git a/docs/ai-workflow/design-brain/index.md b/docs/ai-workflow/design-brain/index.md
+index c00fb982f..8f42a806f 100644
+--- a/docs/ai-workflow/design-brain/index.md
++++ b/docs/ai-workflow/design-brain/index.md
+@@ -32,6 +32,10 @@ Production code; component implementations; screenshots/QA dumps (those go to QA
+ | `techniques.md` | WFX-01–WFX-13 visual-effect contracts, render ladder, maturity/dependency truth, performance/recovery/fallback law |
+ | `psychology.md` | PSY-01–PSY-10 ethical `[HYPOTHESIS]` contracts, evidence posture, psychology + experiment receipts |
+ | `experience-mode.md` | M4 license, inheritance, product/Hermes firewall, gate ritual, adaptive-quality and backend-loss rules |
++| `typography-grid.md` | Type scale, grid/breakpoint substrate, elevation + radius contract. **Where it states a token value that `design.md` also states, `design.md` wins** — see the conflict law in `README.md` §3 |
++| `style-taxonomy.md` | Two-axis style model (aesthetic × era) and its Swan mapping. Captured third-party facet counts drift and are reference-only, never doctrine |
++| `field-techniques.md` | Field-tested effect techniques and the CONVERGENCE note on producing hero creative (image-first loop, interpolation, reference ladder) |
++| `forge-compiler-contract.md` | Swan Forge prompt-compiler contract — the 12-slot composer, capability gating, provider-safety classification |
+ 
+ ### Callable World Engine skill (manual-only)
+ 
+@@ -64,16 +68,16 @@ Production code; component implementations; screenshots/QA dumps (those go to QA
+ | File | Purpose |
+ |---|---|
+ | `obsidian/index.md` | Bridge map |
+-| `obsidian/vault-routing.md` | Where design notes land in the vault (raw/wiki/outputs/runs lanes) |
+-| `obsidian/design-decision-log-policy.md` | What design decisions get logged, format, retention |
++
++> **ATTICKED 2026-07 (`4d192e5ac`).** `vault-routing.md` and `design-decision-log-policy.md` moved to `docs/_attic/2026-07-wiki-mythos/obsidian/` with the rest of the wiki-mythos material. They are historical reference, not loadable doctrine. This index kept listing them for weeks after the move — the rot `scripts/design-brain/check-brain-links.mjs` now catches (D3).
+ 
+ ### `graphify/` — relationship-graph bridge (parallel agents)
+ 
+ | File | Purpose |
+ |---|---|
+ | `graphify/index.md` | Bridge map |
+-| `graphify/graphify-policy.md` | Import quarantine (`graph-imports/` until promoted), what design entities enter the graph |
+-| `graphify/templates.md` | Node/edge templates for design entities (surface, token, pattern, decision) |
++
++> **ATTICKED 2026-07 (`4d192e5ac`).** `graphify-policy.md` and `templates.md` moved to `docs/_attic/2026-07-wiki-mythos/graphify/`. Historical reference only. Graphify itself is not installed (see the Swan Brain architecture decision record); nothing here is a live tool contract.
+ 
+ ## Standing key
+ 
+diff --git a/docs/ai-workflow/design-brain/motion.md b/docs/ai-workflow/design-brain/motion.md
+index 919ddfd75..e5b285b32 100644
+--- a/docs/ai-workflow/design-brain/motion.md
++++ b/docs/ai-workflow/design-brain/motion.md
+@@ -29,7 +29,7 @@ Animate **`transform` and `opacity`. Nothing else** without an explicit exceptio
+ - Banned from animation: `width`, `height`, `top`, `left`, `margin`, `padding`, `box-shadow` (animate a pre-rendered glow layer's `opacity` instead), `filter: blur()` on large surfaces, `background-position` on big images.
+ - Glow-on-hover recipe: stack a pseudo-element carrying the full glow `box-shadow`, animate its `opacity 0 → 1`. Same look, compositor-only.
+ - `will-change: transform` only while animating; remove after. Standing `will-change` on dozens of cards eats VRAM.
+-- `translateZ(0)` creates stacking contexts — give the parent `position: relative; z-index` (design.md §28 / gotchas).
++- `translateZ(0)` creates stacking contexts — give the parent `position: relative; z-index` (design.md §9 — z-scale / stacking).
+ 
+ ## 3. Reduced motion — MANDATORY dual gating
+ 
+@@ -48,12 +48,12 @@ Animate **`transform` and `opacity`. Nothing else** without an explicit exceptio
+ 
+ Data-dense operator and work surfaces stay **calm**: response-tier only, no ambient loops, no narrative beats, no signature moments.
+ 
+-- **Hermes operator surfaces (Cyberforest):** ambient banned, response ≤200ms (design.md §19 — "a cockpit, not a brand page").
+-- **Coach Command Center** approval queue / receipt ledger (design.md §18): response-tier only.
+-- **Data cards** (client/trainer/admin/biometrics/program/workout-log): no pointer tracking, no animation loops, no hover-only actions (Swan Card/Button Standard; design.md §9).
+-- Tables, forms mid-entry, and anything a trainer uses live in a session (low-tap flows, design.md §17): motion must never delay the next tap.
++- **Hermes operator surfaces (Cyberforest):** ambient banned, response ≤200ms (design.md §5 (ops world) — "a cockpit, not a brand page").
++- **Coach Command Center** approval queue / receipt ledger (design.md §5 — pro world): response-tier only.
++- **Data cards** (client/trainer/admin/biometrics/program/workout-log): no pointer tracking, no animation loops, no hover-only actions (Swan Card/Button Standard; design.md §11).
++- Tables, forms mid-entry, and anything a trainer uses live in a session (low-tap flows, design.md §11): motion must never delay the next tap.
+ 
+-SheenCard sell/showcase surfaces are the licensed exception (design.md §9) — and even they honor §3.
++SheenCard sell/showcase surfaces are the licensed exception (design.md §11) — and even they honor §3.
+ 
+ ## 5. Signature-moment budget
+ 
+diff --git a/docs/ai-workflow/design-brain/qa-gates.md b/docs/ai-workflow/design-brain/qa-gates.md
+index 0643416b6..b7e294a04 100644
+--- a/docs/ai-workflow/design-brain/qa-gates.md
++++ b/docs/ai-workflow/design-brain/qa-gates.md
+@@ -20,7 +20,7 @@ The full matrix (CLAUDE.md Premium Design Critique Loop §5). Check every row th
+ | `1280px` | Laptop | Baseline desktop composition |
+ | `1440px` | Desktop browser width | ⚠ `1440px` width ≠ 1440p — this is just a browser width |
+ | `1920px` | 1080p desktop | Section gaps at full scale; hero media crop |
+-| `2560×1440` | **1440p/QHD monitor class (Sean's)** | Density scales by MORE columns, not bigger cards (design.md §24); no stretched cards |
++| `2560×1440` | **1440p/QHD monitor class (Sean's)** | Density scales by MORE columns, not bigger cards (design.md §10); no stretched cards |
+ | `3840×2160` | 4K monitor class | Same; prose capped ~72ch; dashboards cap ~1920px centered or add columns |
+ | `3440px` | Ultrawide | Full-bleed only for cinematic media; content never ribbon-stretches |
+ 
+@@ -31,7 +31,7 @@ If the QA tool accepts width only: use `2560px`/`3840px` widths and state the te
+ ## Gate 2 — ACCESSIBILITY
+ 
+ 1. **Contrast:** 4.5:1 minimum for text (rule 7), checked against the ACTUAL rendered background (glass panels: check against the darkest AND lightest blur state; media: brightest frame per `cinematic-pages.md`). Known trap: raw `--swan-lavender` (#4070C0) text on dark surfaces computes ~4.0:1 — use it for borders/fills, or use lightened text tints.
+-2. **Focus:** `:focus-visible` ring on every interactive element (glow-color, 2px, offset 2px per design.md §10); logical tab order; **focus restoration to trigger on modal/drawer close** (WCAG 2.4.3 — a repeat offender in this repo, now source-locked in several suites).
++2. **Focus:** `:focus-visible` ring on every interactive element (glow-color, 2px, offset 2px per design.md §6); logical tab order; **focus restoration to trigger on modal/drawer close** (WCAG 2.4.3 — a repeat offender in this repo, now source-locked in several suites).
+ 3. **Keyboard paths:** every pointer path has a keyboard path; no hover-only reveals (anti-patterns); ESC closes non-destructive overlays.
+ 4. **Touch:** ≥44px targets, ≥8px between adjacent targets; no nested interactive elements (invalid DOM + trap).
+ 5. **Reduced motion:** DUAL gating verified — CSS `@media (prefers-reduced-motion)` AND `useReducedMotion()` for framer-motion/JS (`motion.md` §4; the 2026-06-20 lesson).
+@@ -48,7 +48,7 @@ Run AFTER building, in hostile-reviewer mode (rule 23): actively try to prove th
+ **The checklist (from the Premium Design Critique Loop, mapped to Design Brain docs):**
+ - Generic/template feel? (anti-patterns §layout — is there a named B2 arc and editorial asymmetry?)
+ - Weak hierarchy or unclear CTA? (one primary action per view; the biggest thing = the biggest idea)
+-- Inconsistent spacing rhythm? (every gap on the design.md §7 scale?)
++- Inconsistent spacing rhythm? (every gap on the design.md §9 scale?)
+ - Cheap shadows/borders/icons? (glass + tinted glow only; lucide icons, no emoji controls)
+ - Flat, depthless backgrounds? (atmosphere layers + grain on large dark surfaces)
+ - Unreadable density / mobile squeeze? (Gate 1 evidence)
+diff --git a/docs/ai-workflow/design-brain/website-archetypes.md b/docs/ai-workflow/design-brain/website-archetypes.md
+index 94fd27f74..340b7bc09 100644
+--- a/docs/ai-workflow/design-brain/website-archetypes.md
++++ b/docs/ai-workflow/design-brain/website-archetypes.md
+@@ -467,7 +467,7 @@ All budgets ship Full / Lean / Still runtime-quality modes from design-system §
+ - **Use when:** Sean's private operator surface — approval queue, kill switches, receipts, agent status. NOT a product surface; governed by the Operator Bridge (T0–T4, §10 design boundary).
+ - **Feel:** Crystalline Cyberforest — the same token system in operator dress: darker, denser, bioluminescent-circuit accents; a night-forest ops room. Operator aesthetics NEVER leak into client-facing UI.
+ - **Arc:** Dash 4-phase. **Hero:** status-horizon band — runtime health, active agents, pending approvals count, master kill-switch state, all in one glance. **Motion:** M1 hard cap (an ops surface must never animate away trust; status changes pulse once, then rest).
+-- **Sections in order:** Phase 1 status horizon → Phase 2 approval queue (each entry: actor · command · tier · target · expiry; T3/T4 visually loud — Wing Purple for T3, Danger red + two-step confirm for T4 (badge ladder per design.md §15)) → Phase 3 receipts stream (append-only, filterable) + agent activity → Phase 4 next decision (oldest pending approval or "all clear").
++- **Sections in order:** Phase 1 status horizon → Phase 2 approval queue (each entry: actor · command · tier · target · expiry; T3/T4 visually loud — Wing Purple for T3, Danger red + two-step confirm for T4 (badge ladder per design.md §11)) → Phase 3 receipts stream (append-only, filterable) + agent activity → Phase 4 next decision (oldest pending approval or "all clear").
+ - **Conversion goal:** operator decision speed — approve/deny with full context in minimum taps; kill switch reachable in ≤2 interactions from anywhere.
+ - **Trust:** receipts are the truth surface ("no receipt → it didn't happen correctly"); kill switches first-class panel, never buried; ambiguity rounds UP visually (uncertain tier renders as the higher tier).
+ - **Mobile:** Telegram is the mobile lane — this surface optimizes desktop/1440p+; still no hover-only controls (product rules apply to operator UI too: 44px, dark-first, reduced-motion, 4.5:1).
+diff --git a/docs/ai-workflow/hermes-learning-packets/20260816-build-the-counter-before-you-quote-the-count.md b/docs/ai-workflow/hermes-learning-packets/20260816-build-the-counter-before-you-quote-the-count.md
+new file mode 100644
+index 000000000..bc648320a
+--- /dev/null
++++ b/docs/ai-workflow/hermes-learning-packets/20260816-build-the-counter-before-you-quote-the-count.md
+@@ -0,0 +1,164 @@
++---
++originating_model: claude-opus-5
++tier: fable-tier
++date: 2026-08-16
++topic: "A `[VERIFIED]` count asserts two things — that each item is real, and that the search was complete. I proved the first, asserted the second, and was wrong by 60%."
++models_used:
++  - model: claude-opus-5
++    role: packet assembler, builder, hostile reviewer of own work
++    did: assembled two 300KB review packets from origin/main; verified 5/5 of the external model's design findings against source; repaved the corpus and built the structural gate; ran the dry loop that found its own under-count
++    cost: subscription (flat)
++  - model: z-ai/glm-5.3
++    role: hostile reviewer (design half + security half)
++    did: two calls, 144k in / 48k out; five verifiable design findings all confirmed true; one causal attribution (which linter enforces canon) was invented and would have licensed a bad decision
++    cost: flat-rate Z.ai coding plan
++skills_touched:
++  - id: check-brain-links.mjs
++    change: created
++    failure: a canon rewrite renumbered design.md §1-28 -> §1-17 and no satellite followed; 16 refs dangled and 4 index rows pointed at atticked files, for weeks, invisible to reading
++  - id: stale-check
++    change: proposed-amendment
++    failure: a hand grep produced a count that was quoted into three commit messages, a Linear issue and a memo before anything checked the search itself for completeness
++  - id: cross-env-verify
++    change: proposed-amendment
++    failure: `git show <rev>:<path>` mangled by MSYS path conversion errored into an empty pipe; `grep -c` returned 0; the zero read as a finding, not as a broken instrument
++---
++
++# Build the counter before you quote the count
++
++## The lesson
++
++I found dangling cross-references in a documentation corpus, verified each one against source,
++tagged the finding `[VERIFIED]`, and reported **10**. There were **16**.
++
++Every one of the 10 was real. The tag was honest about them. What the tag did not cover — and
++what I never checked — was whether the *search* that produced them was complete. It was not:
++my grep never walked the `adapters/` subdirectory, and its regex read `design.md §§14, 18` as a
++single reference to §14, silently discarding `, 18`.
++
++**A verified count is two claims: that each item is real, and that the search that found them was
++exhaustive.** They need separate evidence. Item-level verification — the part that feels rigorous,
++because you are opening files and citing line numbers — says nothing whatsoever about coverage.
++I did the satisfying half and assumed the other.
++
++The correction that worked was not another careful read. It was writing a 196-line checker and
++letting it enumerate. It found the 16, plus a whole defect class I had not thought to look for
++(index rows pointing at files atticked weeks earlier), plus later a broken self-reference that
++had survived the entire repave.
++
++**When a finding is countable, build the counter before you quote the count.** A number produced
++by a human-authored search is a hypothesis about coverage wearing the costume of a measurement.
++
++## Why this is not just "grep more carefully"
++
++The wrong number propagated instantly, because a count is exactly the kind of fact that gets
++copied rather than re-derived. Before anything checked it, "10" was in three commit messages,
++a Linear issue description, and a memo intended for durable storage. Downstream readers had no
++way to tell it from a measured figure. Correcting it meant amending all four.
++
++Counts are load-bearing in a way individual findings are not. "Here is a broken reference" invites
++verification. "There are 10 broken references" invites planning.
++
++## Corollaries this session paid for
++
++1. **A prose law without a gate is decoration.** `index.md` opened with "every file in this folder
++   is listed here" and had been violating it for weeks, in both directions at once. The law was
++   written, nothing checked it, and every agent loading the brain as designed missed its newest
++   doctrine.
++2. **A cited mechanism is not an existing mechanism.** Canon states that off-scale values are
++   `swan/spacing` lint errors. That rule appears in eight documents and in **zero lines of code**.
++   Doctrine can describe enforcement that was never built, and the description is indistinguishable
++   from the real thing until someone greps for the implementation.
++3. **Guard the instrument, not only the subject.** My checker nearly shipped broken: in JavaScript
++   `.` does not match `\r` (it is a line terminator), so on a CRLF repo the `$`-anchored heading
++   regex matched nothing. A defensive "parsed zero sections → exit 2" guard turned silence into a
++   loud failure. Without it the gate would have reported CLEAN over a broken corpus indefinitely,
++   which is strictly worse than no gate. **Every checker needs an assertion that it can still see
++   its own input, and a proof that it FAILS on an injected defect before it is trusted.**
++4. **"Cannot be checked" often means "cannot be checked precisely."** I documented bare `§N` refs
++   as an accepted blind spot because self-references would cause false positives. Sound reasoning,
++   conclusion too weak — a reference you cannot ATTRIBUTE can still be proven IMPOSSIBLE. One file
++   cited `§18` while having 17 sections: unresolvable under any reading. The weaker check was sound
++   all along and was hiding a live defect.
++
++## Who did what
++
++**Opus 5 (me)** assembled the review packets, verified GLM's findings, built the gate, and made
++every error in this packet. The under-count, the CRLF bug, the one-match-per-line `sed`, the
++documented-instead-of-closed blind spot, and the third `MSYS_NO_PATHCONV` false negative of the
++session are all mine. The dry loop caught all of them; Sean caught none of them, which is the
++system working as intended.
++
++**GLM-5.3** was the reason any of this started. Two calls found the rot class, and its five
++verifiable design findings were **5/5 confirmed true** against source, each cited to file and
++section. Its counts were conservative and correct where mine were not — I initially graded its
++"at least 8 dangling" as loose against my "7 distinct sections", then had to retract: it was
++counting pointers, I was counting sections, and it was right.
++
++**Sean** interjected mid-turn to ask whether any uncommitted work existed. That question is what
++forced the check that revealed the working branch was 1,947 commits stale and missing 9 of the
++files under review. Without it I would have reviewed an obsolete corpus and reported confidently
++on a brain that does not exist.
++
++## Skills created or changed
++
++- **`scripts/design-brain/check-brain-links.mjs` (created).** Gates four classes: D1 dangling refs
++  (canon and satellite-to-satellite), D2 files missing from the index, D3 index rows pointing at
++  nothing, D4 bare `§N` that resolves under no reading. Wired into pre-commit path-conditionally
++  plus `npm run brain:links`. Built because a hand grep found 12 of 16 refs and missed an entire
++  directory — the argument for the tool over another careful pass.
++- **`stale-check` (proposed amendment).** Should require that a *count* carry its search command,
++  not only its items. Motivated by the failure above.
++- **`cross-env-verify` (proposed amendment).** Should treat a zero-count in a comparison table as
++  requiring a positive control before it is believed. Motivated by the MSYS false negative.
++
++## Mistakes I made
++
++- Reported 10 dangling refs; there were 16. Marked `[VERIFIED]` on item-level evidence while
++  asserting search completeness I never tested. Propagated to 3 commit messages, 1 Linear issue,
++  1 memo.
++- Wrote a checker whose heading regex matched nothing on this CRLF repo; only a defensive guard
++  stopped it reporting CLEAN over a broken corpus.
++- Used line-addressed `sed`, which replaces one match per line, then declared the lines fixed.
++  One line carried three stale refs; two survived.
++- Documented bare `§N` as uncheckable rather than testing the weaker claim. It was hiding a real
++  dangling self-reference.
++- Third `MSYS_NO_PATHCONV` false negative of the session — a mangled `git show <rev>:<path>` piped
++  into `grep -c` returned 0 and read as "this guard is absent from main," the opposite of the truth.
++- Nearly changed button and card geometry across the entire app on the strength of an external
++  model's claim that a linter enforced one of two conflicting token scales. That linter does not
++  exist. Verifying the premise is the only thing that stopped it.
++- Built a 300KB artifact with inline shell instead of a script; an arithmetic error silently
++  produced a packet with no instructions in it. Caught by checking the line count, not by design.
++
++## Error → fix → repeat ledger
++
++| Error class | Times this session | Written up before it recurred? | What actually stopped it |
++|---|---|---|---|
++| Believing a negative from an unvalidated instrument (empty grep, mangled path, zero count) | **3** | **Yes — a memory exists for the exact `MSYS_NO_PATHCONV` trap, and I wrote it up again after occurrence 2** | Nothing yet. It recurred *after* being documented twice. The only correction with a chance is procedural and unconditional: `MSYS_NO_PATHCONV=1` on every `git show <rev>:<path>` on this machine, and a positive control before any zero is reported as a finding. |
++| Quoting a count whose search was never checked for completeness | 1 (propagated to 4 places) | No | Writing the counter. |
++| Fixing the first match and declaring the line done | 1 | No | The dry loop re-auditing every ref from scratch rather than trusting the previous pass. |
++| Shipping an instrument that cannot see its input | 1 (caught pre-ship) | No | A guard I happened to write for a different reason. |
++
++**The top row is the entry that matters.** That class has now been documented twice and recurred
++after each write-up, which proves the write-up was not the fix. A lesson that survives is
++procedural ("run this exact command / require this exact control"), never resolutional ("be more
++careful about negatives"). I have written the resolutional version twice. This packet records the
++procedural one; if it recurs a fourth time, the procedural version failed too and it needs a hook.
++
++## External-model calibration
++
++**GLM-5.3 — z-ai, flat-rate coding plan, ~$0 marginal.** Two calls, 144k in / 48k out, ~17 min wall.
++
++- **Observations: 5/5 verified true.** Every design finding I checked against source held, cited to
++  file and section. It declined to re-litigate the Kimi/HY3 findings pre-loaded into the packet and
++  spent its budget on new ground. It self-labelled the genuinely good parts in one line instead of
++  padding.
++- **Causal attributions: one was invented and consequential.** It concluded a file was "dead letter
++  or permanent exception noise" *because the lint enforces canon*. The lint does not exist. The
++  observation (two conflicting token scales) was correct; the mechanism it attributed was fabricated,
++  and that mechanism was exactly what would have licensed me to resolve the conflict unilaterally.
++- **Routing verdict:** worth using again for corpus-scale hostile review where the target fits in
++  ~70–80k tokens. **Trust its observations; verify its mechanisms before acting on any conclusion
++  built on one.** That split — high-accuracy observation, unreliable causal attribution — is the
++  useful calibration fact, and it generalizes better than an overall quality score would.
+diff --git a/package.json b/package.json
+index 8271e7b1d..b2b67528a 100644
+--- a/package.json
++++ b/package.json
+@@ -29,6 +29,8 @@
+     "qa:dashboard-crawl:prod:auto": "node scripts/qa/bootstrap-prod-dashboard-auth.mjs --run-crawl",
+     "qa:mission:cleanup": "node scripts/qa/mission-qa-cleanup.mjs",
+     "qa:mission:report": "node scripts/qa/mission-report.mjs",
++    "brain:links": "node scripts/design-brain/check-brain-links.mjs",
++    "brain:links:titles": "node scripts/design-brain/check-brain-links.mjs --titles",
+     "code-health": "fallow --format json",
+     "code-health:audit": "fallow audit --base HEAD --gate all --format json",
+     "code-health:audit:main": "fallow audit --base main --format json",
+diff --git a/scripts/design-brain/check-brain-links.mjs b/scripts/design-brain/check-brain-links.mjs
+new file mode 100644
+index 000000000..21862774b
+--- /dev/null
++++ b/scripts/design-brain/check-brain-links.mjs
+@@ -0,0 +1,234 @@
++#!/usr/bin/env node
++/**
++ * check-brain-links.mjs — structural integrity gate for the Design Brain corpus.
++ *
++ * The Design Brain is markdown that agents load at task time. Three failure modes rot it
++ * silently, and all three have shipped to `main` at least once:
++ *
++ *   D1 DANGLING   a file cites `<other>.md §N` for an N that does not exist — canon refs
++ *                 (`design.md §N`) and satellite-to-satellite refs (`motion.md §4`) alike.
++ *                 A canon rewrite renumbered §1-28 down to §1-17 and no satellite followed.
++ *                 An agent that follows a dead pointer resolves safely by SKIPPING the
++ *                 doctrine it could not find — so canon supremacy becomes fiction.
++ *   D2 UNINDEXED  `index.md` declares "every file in this folder is listed here", then
++ *                 does not list the folder's newest files. Index-driven loaders never see them.
++ *   D3 ORPHANED   `index.md` lists a file that no longer exists.
++ *   D4 IMPOSSIBLE a bare `§N` (no filename) that resolves under NO reading — it exceeds both
++ *                 canon's highest section and its own file's. Found `components.md` citing
++ *                 `§18` for a two-step-arm modal that is `§17`, in a 17-section file.
++ *
++ * This checker is deliberately dumb and deterministic: it parses headings and references,
++ * it never calls a model, and it exits non-zero so CI and pre-commit can gate on it.
++ *
++ * It does NOT judge whether a resolvable reference points at the RIGHT section — that is a
++ * semantic call. `--titles` prints every reference beside its target's heading so a human
++ * (or a review agent) can audit wrong-target refs, which are more dangerous than dangling
++ * ones because they resolve confidently to the wrong doctrine.
++ *
++ * Usage:
++ *   node scripts/design-brain/check-brain-links.mjs            # gate: exit 1 on any defect
++ *   node scripts/design-brain/check-brain-links.mjs --titles   # audit aid: ref -> target heading
++ */
++import { readFileSync, readdirSync, existsSync } from 'node:fs';
++import { join, dirname, basename } from 'node:path';
++import { fileURLToPath } from 'node:url';
++
++const BRAIN = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'docs', 'ai-workflow', 'design-brain');
++const CANON = 'design.md';
++const showTitles = process.argv.includes('--titles');
++
++if (!existsSync(join(BRAIN, CANON))) {
++  console.error(`[brain-links] canon not found: ${join(BRAIN, CANON)}`);
++  process.exit(2);
++}
++
++/**
++ * Split on either line ending. This repo is CRLF; in JavaScript `.` does NOT match `\r`
++ * (it is a line terminator), so a trailing `\r` silently defeats any `$`-anchored regex.
++ * Normalising here rather than per-regex is the difference between this checker working
++ * and it reporting CLEAN on a broken corpus.
++ */
++const lines = (text) => text.split(/\r?\n/);
++
++/**
++ * Section numbers + headings for one file. Two heading dialects are in use:
++ * canon writes `## §9 Space, elevation, z`; satellites write `## 4. Where motion is banned`.
++ * Both are parsed so cross-file references can be validated, not just references to canon.
++ */
++function sectionsOf(text) {
++  const map = new Map();
++  for (const line of lines(text)) {
++    const m = /^##\s+(?:§\s*(\d+)|(\d+)\.)\s+(.*)$/.exec(line);
++    if (m) map.set(m[1] ?? m[2], m[3].trim());
++  }
++  return map;
++}
++
++const canonText = readFileSync(join(BRAIN, CANON), 'utf8');
++const sections = sectionsOf(canonText);
++if (!sections.size) {
++  console.error('[brain-links] parsed zero sections from canon — heading format changed; fix this checker before trusting it');
++  process.exit(2);
++}
++
++/**
++ * Every `<some-file>.md §N` reference on a line, including the `§§14, 18` multi-form.
++ * Covers cross-file refs (e.g. `motion.md §4`), not just references to canon — a satellite
++ * citing another satellite's renumbered section rots exactly the same way.
++ *
++ * Bare `§N` (no filename) is handled separately by `impossibleBareRefs` below — it cannot be
++ * attributed to a file, but it can still be proven IMPOSSIBLE. See D4.
++ */
++function refsIn(line) {
++  const out = [];
++  const re = /([a-z0-9-]+\.md)\s+§{1,2}\s*(\d+(?:\s*(?:,|and)\s*§?\s*\d+)*)/gi;
++  let m;
++  while ((m = re.exec(line)) !== null) {
++    for (const n of m[2].match(/\d+/g) ?? []) out.push({ file: m[1], n, raw: m[0] });
++  }
++  return out;
++}
++
++const mdFiles = [];
++(function walk(dir, rel = '') {
++  for (const e of readdirSync(dir, { withFileTypes: true })) {
++    const p = join(dir, e.name);
++    if (e.isDirectory()) walk(p, rel ? `${rel}/${e.name}` : e.name);
++    else if (e.name.endsWith('.md')) mdFiles.push(rel ? `${rel}/${e.name}` : e.name);
++  }
++})(BRAIN);
++
++/** Section maps for every file in the corpus, keyed by basename, parsed once. */
++const sectionsByFile = new Map();
++for (const rel of mdFiles) sectionsByFile.set(basename(rel), sectionsOf(readFileSync(join(BRAIN, rel), 'utf8')));
++
++const dangling = [];
++const resolved = [];
++for (const rel of mdFiles) {
++  const fileLines = lines(readFileSync(join(BRAIN, rel), 'utf8'));
++  fileLines.forEach((line, i) => {
++    for (const { file: target, n, raw } of refsIn(line)) {
++      const targetSections = sectionsByFile.get(basename(target));
++      // A reference to a file outside this corpus is not ours to validate.
++      if (!targetSections) continue;
++      const rec = { file: rel, line: i + 1, target: basename(target), n, raw, ctx: line.trim().slice(0, 110) };
++      if (targetSections.has(n)) resolved.push({ ...rec, title: targetSections.get(n) });
++      else dangling.push(rec);
++    }
++  });
++}
++
++/**
++ * D4 IMPOSSIBLE BARE REF. A bare `§N` carries no filename, so it cannot be attributed —
++ * it may mean canon or the containing file's own sections. It can still be proven
++ * impossible: if N exceeds BOTH canon's highest section AND the containing file's own
++ * highest, then no reading of it resolves. That is a dangling ref by any interpretation,
++ * with no ambiguity to trade against — so it is safe to gate on.
++ *
++ * This is deliberately the weakest possible claim. A bare `§6` in a file with 17 sections
++ * is NOT flagged even if it was meant as a canon ref to something else, because proving
++ * that needs intent. Under-reporting here is the price of never crying wolf; the fix for
++ * an ambiguous ref is to cite the filename, which promotes it to the D1 check above.
++ */
++const canonMax = Math.max(...[...sections.keys()].map(Number));
++const impossibleBare = [];
++for (const rel of mdFiles) {
++  const ownMax = Math.max(0, ...[...(sectionsByFile.get(basename(rel))?.keys() ?? [])].map(Number));
++  lines(readFileSync(join(BRAIN, rel), 'utf8')).forEach((line, i) => {
++    // Strip attributed refs first so `motion.md §4` is not re-counted as a bare `§4`.
++    const bare = line.replace(/[a-z0-9-]+\.md.{0,3}§+\s*[\d,\s]*\d/gi, '');
++    for (const m of bare.matchAll(/§\s*(\d+)/g)) {
++      const n = Number(m[1]);
++      if (n > canonMax && n > ownMax) {
++        impossibleBare.push({ file: rel, line: i + 1, n, ownMax, ctx: line.trim().slice(0, 110) });
++      }
++    }
++  });
++}
++
++// D2/D3: index.md must list exactly the folder's markdown files (excluding itself + backups).
++const indexText = existsSync(join(BRAIN, 'index.md')) ? readFileSync(join(BRAIN, 'index.md'), 'utf8') : '';
++const IGNORE = new Set(['index.md']);
++const isBackup = (f) => /\.(pre-redo|bak|orig)$/.test(f) || f.endsWith('.pre-redo');
++const unindexed = mdFiles.filter((f) => !IGNORE.has(f) && !isBackup(f) && !indexText.includes(basename(f)));
++// index.md legitimately cites docs OUTSIDE this folder (the source-of-truth design system,
++// the world-factory skill). Those are cross-references, not orphans — resolve any listed
++// path against the repo root before calling it missing, or the gate cries wolf and gets ignored.
++const REPO = join(BRAIN, '..', '..', '..');
++
++/** Basenames of every markdown file under docs/_attic — the documented home for retired docs. */
++const atticBasenames = new Set();
++(function walkAttic(dir) {
++  if (!existsSync(dir)) return;
++  for (const e of readdirSync(dir, { withFileTypes: true })) {
++    if (e.isDirectory()) walkAttic(join(dir, e.name));
++    else if (e.name.endsWith('.md')) atticBasenames.add(e.name);
++  }
++})(join(REPO, 'docs', '_attic'));
++
++const listedNames = [...indexText.matchAll(/`([A-Za-z0-9._/-]+\.md)`/g)].map((m) => m[1]);
++const orphaned = [...new Set(listedNames)].filter((name) => {
++  if (mdFiles.some((f) => f === name || basename(f) === basename(name))) return false; // in this folder
++  if (existsSync(join(BRAIN, name))) return false;                                     // folder-relative
++  if (existsSync(join(REPO, name))) return false;                                      // repo-relative cross-ref
++  // Bare names may cite the two source-of-truth docs, which live in references/.
++  if (existsSync(join(REPO, 'docs', 'ai-workflow', 'references', name))) return false;
++  // Retired docs move to docs/_attic/. An index row that HONESTLY records a file as
++  // atticked (with its new home) is documentation, not an orphan — the D3 defect is an
++  // index pointing at nothing, not an index admitting something moved.
++  if (atticBasenames.has(basename(name))) return false;
++  return true;
++});
++
++if (showTitles) {
++  console.log('REFERENCE AUDIT — check each ref against its target heading (wrong-target refs resolve, but mislead):\n');
++  for (const r of resolved) {
++    console.log(`  ${r.file}:${r.line}  ${r.target} §${r.n} = ${r.title}`);
++    console.log(`      ${r.ctx}`);
++  }
++  console.log('');
++}
++
++let bad = 0;
++if (dangling.length) {
++  bad += dangling.length;
++  console.log(`D1 DANGLING — ${dangling.length} reference(s) to a section that does not exist:`);
++  for (const d of dangling) {
++    const have = [...(sectionsByFile.get(d.target)?.keys() ?? [])].map(Number).sort((a, b) => a - b);
++    const range = have.length ? `§${have[0]}–§${have[have.length - 1]}` : '(no numbered sections)';
++    console.log(`  ${d.file}:${d.line}  "${d.raw}" — ${d.target} has ${range}, not §${d.n}\n      ${d.ctx}`);
++  }
++  console.log('');
++}
++if (unindexed.length) {
++  bad += unindexed.length;
++  console.log(`D2 UNINDEXED — ${unindexed.length} file(s) present but absent from index.md, whose own law is "every file in this folder is listed here":`);
++  for (const f of unindexed) console.log(`  ${f}`);
++  console.log('');
++}
++if (impossibleBare.length) {
++  bad += impossibleBare.length;
++  console.log(`D4 IMPOSSIBLE BARE REF — ${impossibleBare.length} bare §N that resolves under NO reading (exceeds canon's §${canonMax} and the file's own sections):`);
++  for (const b of impossibleBare) {
++    const own = b.ownMax > 0 ? `this file has §1–§${b.ownMax}` : 'this file has no numbered sections';
++    console.log(`  ${b.file}:${b.line}  §${b.n} — canon has §1–§${canonMax}, ${own}\n      ${b.ctx}`);
++  }
++  console.log('');
++}
++if (orphaned.length) {
++  bad += orphaned.length;
++  console.log(`D3 ORPHANED — ${orphaned.length} file(s) listed in index.md but not on disk:`);
++  for (const f of orphaned) console.log(`  ${f}`);
++  console.log('');
++}
++
++console.log(
++  `[brain-links] ${mdFiles.length} files · ${sections.size} canon sections · ` +
++  `${resolved.length + dangling.length} refs (${resolved.length} resolve, ${dangling.length} dangle) · ` +
++  `${unindexed.length} unindexed · ${orphaned.length} orphaned · ${impossibleBare.length} impossible-bare`,
++);
++if (bad) {
++  console.error(`[brain-links] FAIL — ${bad} structural defect(s). Fix the corpus, not this checker.`);
++  process.exit(1);
++}
++console.log('[brain-links] CLEAN');
+diff --git a/scripts/design-brain/src/authority.mjs b/scripts/design-brain/src/authority.mjs
+index af7367a53..bd38f7273 100644
+--- a/scripts/design-brain/src/authority.mjs
++++ b/scripts/design-brain/src/authority.mjs
+@@ -15,14 +15,18 @@ export const signablePayload = (record) => {
+   const { signature: _signature, ...payload } = record ?? {};
+   return JSON.stringify(canonicalize(payload));
+ };
+-export function verifyAuthorityRecord(record, { publicKey, trustedNow, revokedIds = [], purpose } = {}) {
++export function verifyAuthorityRecord(record, { publicKey, trustedNow, revokedIds, purpose } = {}) {
+   const errors = [];
+   const allowed = PURPOSE_KEYS[purpose];
+   if (!allowed) errors.push('recognized purpose required');
+   for (const key of Object.keys(record ?? {})) if (allowed && !allowed.has(key)) errors.push(`unknown authority field: ${key}`);
+   if (!publicKey) errors.push('publicKey required');
+   if (!(trustedNow instanceof Date) || Number.isNaN(trustedNow.getTime())) errors.push('trustedNow required');
+-  if (!record?.recordId || revokedIds.includes(record.recordId)) errors.push('recordId missing or revoked');
++  // Fail closed: an absent revocation list is NOT an empty one. A caller that cannot
++  // produce the list has not proven the record is unrevoked, so it must not verify.
++  const haveRevocationList = Array.isArray(revokedIds);
++  if (!haveRevocationList) errors.push('revocation list required: an absent list is not an empty list');
++  if (!record?.recordId || (haveRevocationList && revokedIds.includes(record.recordId))) errors.push('recordId missing or revoked');
+   if (record?.approvedBy !== 'sean') errors.push('approvedBy must be sean');
+   if (record?.purpose !== purpose) errors.push(`purpose must be ${purpose}`);
+   if (!Array.isArray(record?.evidenceRefs) || !record.evidenceRefs.length || !record.evidenceRefs.every((ref) => typeof ref === 'string' && ref.length >= 4)) errors.push('evidenceRefs must be non-empty strings');
+diff --git a/scripts/design-brain/tests/governance-hardening.test.mjs b/scripts/design-brain/tests/governance-hardening.test.mjs
+index b152c8471..7259b7389 100644
+--- a/scripts/design-brain/tests/governance-hardening.test.mjs
++++ b/scripts/design-brain/tests/governance-hardening.test.mjs
+@@ -101,7 +101,7 @@ test('X clearance is signed, time-bounded, and revocation-aware', () => {
+   });
+   assert.deepEqual(provenance.validateSourceClearance(clearance, { publicKey, trustedNow: NOW, revokedIds: [] }), { ok: true, errors: [] });
+   assert.equal(provenance.validateSourceClearance(clearance, { publicKey, trustedNow: NOW, revokedIds: ['CLR-mobbin-001'] }).ok, false);
+-  assert.equal(provenance.validateSourceClearance({ ...clearance, signature: 'tampered' }, { publicKey, trustedNow: NOW }).ok, false);
++  assert.equal(provenance.validateSourceClearance({ ...clearance, signature: 'tampered' }, { publicKey, trustedNow: NOW, revokedIds: [] }).ok, false);
+   assert.equal(provenance.validateSourceClearance(clearance, { publicKey }).ok, false, 'missing trusted clock fails closed');
+ });
+ 
+@@ -109,7 +109,7 @@ test('Spec enablement requires a valid signed activation record', () => {
+   assert.ok(authority, 'authority.mjs must exist');
+   const enabled = { schemaVersion: 'spec-mode/2', enabled: true, termsVersion: '2026-05-16', activationRef: 'AUTH-spec-enable-001' };
+   assert.throws(() => contract.assertSpecModeEnabled(enabled, {}), (error) => error.code === 'E_SPEC_ACTIVATION_REQUIRED');
+-  assert.doesNotThrow(() => contract.assertSpecModeEnabled(enabled, { activation: activation({ configDigest: contract.configDigestFor(enabled) }), publicKey, trustedNow: NOW }));
++  assert.doesNotThrow(() => contract.assertSpecModeEnabled(enabled, { activation: activation({ configDigest: contract.configDigestFor(enabled) }), publicKey, trustedNow: NOW, revokedIds: [] }));
+   assert.throws(() => contract.assertSpecModeEnabled(enabled, {
+     activation: activation({ notAfter: '2026-07-25T00:00:00.000Z', configDigest: contract.configDigestFor(enabled) }), publicKey, trustedNow: NOW,
+   }), (error) => error.code === 'E_SPEC_ACTIVATION_INVALID');
+@@ -187,10 +187,10 @@ test('authority signatures cover nested fields and reject cross-config replay',
+   const config = { schemaVersion: 'spec-mode/2', enabled: true, termsVersion: '2026-05-16', activationRef: 'AUTH-spec-enable-001' };
+   const record = activation({ evidenceRefs: ['counsel-record', 'phase-gate-record'], configDigest: contract.configDigestFor(config) });
+   const tampered = { ...record, evidenceRefs: ['counsel-record', 'changed-record'] };
+-  assert.equal(contract.assertSpecModeEnabled(config, { activation: record, publicKey, trustedNow: NOW }), true);
+-  assert.throws(() => contract.assertSpecModeEnabled(config, { activation: tampered, publicKey, trustedNow: NOW }), (error) => error.code === 'E_SPEC_ACTIVATION_INVALID');
+-  assert.throws(() => contract.assertSpecModeEnabled({ ...config, unexpectedPolicy: true }, { activation: record, publicKey, trustedNow: NOW }), (error) => error.code === 'E_SPEC_ACTIVATION_INVALID');
+-  assert.throws(() => contract.assertSpecModeEnabled({ ...config, termsVersion: 'changed' }, { activation: record, publicKey, trustedNow: NOW }), (error) => error.code === 'E_SPEC_ACTIVATION_INVALID');
++  assert.equal(contract.assertSpecModeEnabled(config, { activation: record, publicKey, trustedNow: NOW, revokedIds: [] }), true);
++  assert.throws(() => contract.assertSpecModeEnabled(config, { activation: tampered, publicKey, trustedNow: NOW, revokedIds: [] }), (error) => error.code === 'E_SPEC_ACTIVATION_INVALID');
++  assert.throws(() => contract.assertSpecModeEnabled({ ...config, unexpectedPolicy: true }, { activation: record, publicKey, trustedNow: NOW, revokedIds: [] }), (error) => error.code === 'E_SPEC_ACTIVATION_INVALID');
++  assert.throws(() => contract.assertSpecModeEnabled({ ...config, termsVersion: 'changed' }, { activation: record, publicKey, trustedNow: NOW, revokedIds: [] }), (error) => error.code === 'E_SPEC_ACTIVATION_INVALID');
+ });
+ test('safety-critical prescription variants are all refused', () => {
+   const extensions = ['screening-incomplete', 'contraindication-present', 'trainer-approval-required', 'stale-assessment'].map((name) => ({ name, behavior: `${name} blocks progression and routes to qualified human review` }));
+@@ -264,4 +264,23 @@ test('safety-critical prescription units are refused regardless of number wordin
+ test('claim provenance refuses unsigned lifecycle revisions', () => {
+   const claim = { claimId: 'CLM-lifecycle', domainId: 'D01', principle: 'A sufficiently substantive synthetic principle for lifecycle validation', workflowPhase: 'progress', userRole: 'client', products: ['Synthetic'], receiptRefs: ['RCP-none'], exceptions: [], contradictions: [], swanTranslation: {}, confidence: { level: 'low', basis: 'single source' }, singleSource: true, status: 'accepted', createdUtc: NOW.toISOString(), rev: 999 };
+   assert.equal(validateClaimProvenance(claim, new Map(), {}), false);
+-});
+\ No newline at end of file
++});
++test('an absent revocation list fails closed and is not treated as an empty list', () => {
++  const record = activation();
++  const ctx = { publicKey, trustedNow: NOW, purpose: 'spec-enable' };
++  // Baseline: an explicitly-empty list is a real answer and verifies clean.
++  assert.equal(authority.verifyAuthorityRecord(record, { ...ctx, revokedIds: [] }).ok, true);
++  // A caller that omits the list must NOT verify -- absent is not the same as empty.
++  const omitted = authority.verifyAuthorityRecord(record, ctx);
++  assert.equal(omitted.ok, false, 'omitting revokedIds must fail closed');
++  assert.ok(omitted.errors.some((e) => /revocation list/i.test(e)), 'error must name the missing revocation list');
++  // Any non-array is an unusable list and fails the same way.
++  for (const bad of [null, undefined, '', 'AUTH-spec-enable-001', {}, 0]) {
++    assert.equal(
++      authority.verifyAuthorityRecord(record, { ...ctx, revokedIds: bad }).ok, false,
++      `revokedIds=${JSON.stringify(bad)} must fail closed`,
++    );
++  }
++  // A genuinely revoked id still fails, as before.
++  assert.equal(authority.verifyAuthorityRecord(record, { ...ctx, revokedIds: ['AUTH-spec-enable-001'] }).ok, false);
++});
+
+```
+
+---
+
+## Section 4 - THE NEW GATE, AS A WHOLE FILE
+
+The diff shows it as an addition, but it is the load-bearing artifact and now blocks commits. Read it as a program, not as a patch.
+
+
+```javascript
+#!/usr/bin/env node
+/**
+ * check-brain-links.mjs — structural integrity gate for the Design Brain corpus.
+ *
+ * The Design Brain is markdown that agents load at task time. Three failure modes rot it
+ * silently, and all three have shipped to `main` at least once:
+ *
+ *   D1 DANGLING   a file cites `<other>.md §N` for an N that does not exist — canon refs
+ *                 (`design.md §N`) and satellite-to-satellite refs (`motion.md §4`) alike.
+ *                 A canon rewrite renumbered §1-28 down to §1-17 and no satellite followed.
+ *                 An agent that follows a dead pointer resolves safely by SKIPPING the
+ *                 doctrine it could not find — so canon supremacy becomes fiction.
+ *   D2 UNINDEXED  `index.md` declares "every file in this folder is listed here", then
+ *                 does not list the folder's newest files. Index-driven loaders never see them.
+ *   D3 ORPHANED   `index.md` lists a file that no longer exists.
+ *   D4 IMPOSSIBLE a bare `§N` (no filename) that resolves under NO reading — it exceeds both
+ *                 canon's highest section and its own file's. Found `components.md` citing
+ *                 `§18` for a two-step-arm modal that is `§17`, in a 17-section file.
+ *
+ * This checker is deliberately dumb and deterministic: it parses headings and references,
+ * it never calls a model, and it exits non-zero so CI and pre-commit can gate on it.
+ *
+ * It does NOT judge whether a resolvable reference points at the RIGHT section — that is a
+ * semantic call. `--titles` prints every reference beside its target's heading so a human
+ * (or a review agent) can audit wrong-target refs, which are more dangerous than dangling
+ * ones because they resolve confidently to the wrong doctrine.
+ *
+ * Usage:
+ *   node scripts/design-brain/check-brain-links.mjs            # gate: exit 1 on any defect
+ *   node scripts/design-brain/check-brain-links.mjs --titles   # audit aid: ref -> target heading
+ */
+import { readFileSync, readdirSync, existsSync } from 'node:fs';
+import { join, dirname, basename } from 'node:path';
+import { fileURLToPath } from 'node:url';
+
+const BRAIN = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'docs', 'ai-workflow', 'design-brain');
+const CANON = 'design.md';
+const showTitles = process.argv.includes('--titles');
+
+if (!existsSync(join(BRAIN, CANON))) {
+  console.error(`[brain-links] canon not found: ${join(BRAIN, CANON)}`);
+  process.exit(2);
+}
+
+/**
+ * Split on either line ending. This repo is CRLF; in JavaScript `.` does NOT match `\r`
+ * (it is a line terminator), so a trailing `\r` silently defeats any `$`-anchored regex.
+ * Normalising here rather than per-regex is the difference between this checker working
+ * and it reporting CLEAN on a broken corpus.
+ */
+const lines = (text) => text.split(/\r?\n/);
+
+/**
+ * Section numbers + headings for one file. Two heading dialects are in use:
+ * canon writes `## §9 Space, elevation, z`; satellites write `## 4. Where motion is banned`.
+ * Both are parsed so cross-file references can be validated, not just references to canon.
+ */
+function sectionsOf(text) {
+  const map = new Map();
+  for (const line of lines(text)) {
+    const m = /^##\s+(?:§\s*(\d+)|(\d+)\.)\s+(.*)$/.exec(line);
+    if (m) map.set(m[1] ?? m[2], m[3].trim());
+  }
+  return map;
+}
+
+const canonText = readFileSync(join(BRAIN, CANON), 'utf8');
+const sections = sectionsOf(canonText);
+if (!sections.size) {
+  console.error('[brain-links] parsed zero sections from canon — heading format changed; fix this checker before trusting it');
+  process.exit(2);
+}
+
+/**
+ * Every `<some-file>.md §N` reference on a line, including the `§§14, 18` multi-form.
+ * Covers cross-file refs (e.g. `motion.md §4`), not just references to canon — a satellite
+ * citing another satellite's renumbered section rots exactly the same way.
+ *
+ * Bare `§N` (no filename) is handled separately by `impossibleBareRefs` below — it cannot be
+ * attributed to a file, but it can still be proven IMPOSSIBLE. See D4.
+ */
+function refsIn(line) {
+  const out = [];
+  const re = /([a-z0-9-]+\.md)\s+§{1,2}\s*(\d+(?:\s*(?:,|and)\s*§?\s*\d+)*)/gi;
+  let m;
+  while ((m = re.exec(line)) !== null) {
+    for (const n of m[2].match(/\d+/g) ?? []) out.push({ file: m[1], n, raw: m[0] });
+  }
+  return out;
+}
+
+const mdFiles = [];
+(function walk(dir, rel = '') {
+  for (const e of readdirSync(dir, { withFileTypes: true })) {
+    const p = join(dir, e.name);
+    if (e.isDirectory()) walk(p, rel ? `${rel}/${e.name}` : e.name);
+    else if (e.name.endsWith('.md')) mdFiles.push(rel ? `${rel}/${e.name}` : e.name);
+  }
+})(BRAIN);
+
+/** Section maps for every file in the corpus, keyed by basename, parsed once. */
+const sectionsByFile = new Map();
+for (const rel of mdFiles) sectionsByFile.set(basename(rel), sectionsOf(readFileSync(join(BRAIN, rel), 'utf8')));
+
+const dangling = [];
+const resolved = [];
+for (const rel of mdFiles) {
+  const fileLines = lines(readFileSync(join(BRAIN, rel), 'utf8'));
+  fileLines.forEach((line, i) => {
+    for (const { file: target, n, raw } of refsIn(line)) {
+      const targetSections = sectionsByFile.get(basename(target));
+      // A reference to a file outside this corpus is not ours to validate.
+      if (!targetSections) continue;
+      const rec = { file: rel, line: i + 1, target: basename(target), n, raw, ctx: line.trim().slice(0, 110) };
+      if (targetSections.has(n)) resolved.push({ ...rec, title: targetSections.get(n) });
+      else dangling.push(rec);
+    }
+  });
+}
+
+/**
+ * D4 IMPOSSIBLE BARE REF. A bare `§N` carries no filename, so it cannot be attributed —
+ * it may mean canon or the containing file's own sections. It can still be proven
+ * impossible: if N exceeds BOTH canon's highest section AND the containing file's own
+ * highest, then no reading of it resolves. That is a dangling ref by any interpretation,
+ * with no ambiguity to trade against — so it is safe to gate on.
+ *
+ * This is deliberately the weakest possible claim. A bare `§6` in a file with 17 sections
+ * is NOT flagged even if it was meant as a canon ref to something else, because proving
+ * that needs intent. Under-reporting here is the price of never crying wolf; the fix for
+ * an ambiguous ref is to cite the filename, which promotes it to the D1 check above.
+ */
+const canonMax = Math.max(...[...sections.keys()].map(Number));
+const impossibleBare = [];
+for (const rel of mdFiles) {
+  const ownMax = Math.max(0, ...[...(sectionsByFile.get(basename(rel))?.keys() ?? [])].map(Number));
+  lines(readFileSync(join(BRAIN, rel), 'utf8')).forEach((line, i) => {
+    // Strip attributed refs first so `motion.md §4` is not re-counted as a bare `§4`.
+    const bare = line.replace(/[a-z0-9-]+\.md.{0,3}§+\s*[\d,\s]*\d/gi, '');
+    for (const m of bare.matchAll(/§\s*(\d+)/g)) {
+      const n = Number(m[1]);
+      if (n > canonMax && n > ownMax) {
+        impossibleBare.push({ file: rel, line: i + 1, n, ownMax, ctx: line.trim().slice(0, 110) });
+      }
+    }
+  });
+}
+
+// D2/D3: index.md must list exactly the folder's markdown files (excluding itself + backups).
+const indexText = existsSync(join(BRAIN, 'index.md')) ? readFileSync(join(BRAIN, 'index.md'), 'utf8') : '';
+const IGNORE = new Set(['index.md']);
+const isBackup = (f) => /\.(pre-redo|bak|orig)$/.test(f) || f.endsWith('.pre-redo');
+const unindexed = mdFiles.filter((f) => !IGNORE.has(f) && !isBackup(f) && !indexText.includes(basename(f)));
+// index.md legitimately cites docs OUTSIDE this folder (the source-of-truth design system,
+// the world-factory skill). Those are cross-references, not orphans — resolve any listed
+// path against the repo root before calling it missing, or the gate cries wolf and gets ignored.
+const REPO = join(BRAIN, '..', '..', '..');
+
+/** Basenames of every markdown file under docs/_attic — the documented home for retired docs. */
+const atticBasenames = new Set();
+(function walkAttic(dir) {
+  if (!existsSync(dir)) return;
+  for (const e of readdirSync(dir, { withFileTypes: true })) {
+    if (e.isDirectory()) walkAttic(join(dir, e.name));
+    else if (e.name.endsWith('.md')) atticBasenames.add(e.name);
+  }
+})(join(REPO, 'docs', '_attic'));
+
+const listedNames = [...indexText.matchAll(/`([A-Za-z0-9._/-]+\.md)`/g)].map((m) => m[1]);
+const orphaned = [...new Set(listedNames)].filter((name) => {
+  if (mdFiles.some((f) => f === name || basename(f) === basename(name))) return false; // in this folder
+  if (existsSync(join(BRAIN, name))) return false;                                     // folder-relative
+  if (existsSync(join(REPO, name))) return false;                                      // repo-relative cross-ref
+  // Bare names may cite the two source-of-truth docs, which live in references/.
+  if (existsSync(join(REPO, 'docs', 'ai-workflow', 'references', name))) return false;
+  // Retired docs move to docs/_attic/. An index row that HONESTLY records a file as
+  // atticked (with its new home) is documentation, not an orphan — the D3 defect is an
+  // index pointing at nothing, not an index admitting something moved.
+  if (atticBasenames.has(basename(name))) return false;
+  return true;
+});
+
+if (showTitles) {
+  console.log('REFERENCE AUDIT — check each ref against its target heading (wrong-target refs resolve, but mislead):\n');
+  for (const r of resolved) {
+    console.log(`  ${r.file}:${r.line}  ${r.target} §${r.n} = ${r.title}`);
+    console.log(`      ${r.ctx}`);
+  }
+  console.log('');
+}
+
+let bad = 0;
+if (dangling.length) {
+  bad += dangling.length;
+  console.log(`D1 DANGLING — ${dangling.length} reference(s) to a section that does not exist:`);
+  for (const d of dangling) {
+    const have = [...(sectionsByFile.get(d.target)?.keys() ?? [])].map(Number).sort((a, b) => a - b);
+    const range = have.length ? `§${have[0]}–§${have[have.length - 1]}` : '(no numbered sections)';
+    console.log(`  ${d.file}:${d.line}  "${d.raw}" — ${d.target} has ${range}, not §${d.n}\n      ${d.ctx}`);
+  }
+  console.log('');
+}
+if (unindexed.length) {
+  bad += unindexed.length;
+  console.log(`D2 UNINDEXED — ${unindexed.length} file(s) present but absent from index.md, whose own law is "every file in this folder is listed here":`);
+  for (const f of unindexed) console.log(`  ${f}`);
+  console.log('');
+}
+if (impossibleBare.length) {
+  bad += impossibleBare.length;
+  console.log(`D4 IMPOSSIBLE BARE REF — ${impossibleBare.length} bare §N that resolves under NO reading (exceeds canon's §${canonMax} and the file's own sections):`);
+  for (const b of impossibleBare) {
+    const own = b.ownMax > 0 ? `this file has §1–§${b.ownMax}` : 'this file has no numbered sections';
+    console.log(`  ${b.file}:${b.line}  §${b.n} — canon has §1–§${canonMax}, ${own}\n      ${b.ctx}`);
+  }
+  console.log('');
+}
+if (orphaned.length) {
+  bad += orphaned.length;
+  console.log(`D3 ORPHANED — ${orphaned.length} file(s) listed in index.md but not on disk:`);
+  for (const f of orphaned) console.log(`  ${f}`);
+  console.log('');
+}
+
+console.log(
+  `[brain-links] ${mdFiles.length} files · ${sections.size} canon sections · ` +
+  `${resolved.length + dangling.length} refs (${resolved.length} resolve, ${dangling.length} dangle) · ` +
+  `${unindexed.length} unindexed · ${orphaned.length} orphaned · ${impossibleBare.length} impossible-bare`,
+);
+if (bad) {
+  console.error(`[brain-links] FAIL — ${bad} structural defect(s). Fix the corpus, not this checker.`);
+  process.exit(1);
+}
+console.log('[brain-links] CLEAN');
+
+```
+
+---
+
+## Section 5 - CURRENT GATE OUTPUT ON THE FIXED CORPUS
+
+```
+[brain-links] 28 files - 17 canon sections - 44 refs (44 resolve, 0 dangle) - 0 unindexed - 0 orphaned - 0 impossible-bare
+[brain-links] CLEAN
+```
+
+Test suite: 73 pass / 0 fail across 10 files (`node --test scripts/design-brain/tests/*.test.mjs`, per file).
+
+**Treat both numbers as claims to attack, not as evidence you must accept.** A gate reporting CLEAN is exactly what a broken gate also reports - the author's own CRLF bug produced that failure mode once already and was caught only by a defensive guard.
+
+---
+
+## Section 6 - ANSWER THESE
+
+**Q1 - Wrong-target refs.** 20 references were re-pointed. Using the diff, check each redirect against what that canon section actually contains. Which are still wrong? The author verified each by locating the concept in canon, but he also verified his original count and was wrong by 60%.
+
+**Q2 - Completeness.** What defect of these classes remains in the corpus? Consider forms the tooling cannot see: refs by section TITLE rather than number, refs in prose ("the accessibility section says..."), refs from files outside `design-brain/` that consume it, refs in `design.html` (the visual mirror, deliberately excluded), and the `.pre-redo` backup.
+
+**Q3 - Attack the gate.** `check-brain-links.mjs`: bypasses, false negatives, false positives, fail-open paths, performance, and whether its D4 "impossible bare ref" rule is actually sound or merely clever. What input makes it wrong? What makes it exit 0 over a broken corpus?
+
+**Q4 - The pre-commit wiring.** It blocks commits when `docs/ai-workflow/design-brain/` is staged. Is the trigger condition right? What legitimate work does it block? What broken work does it let through? Note the hook file is versioned per-branch and `core.hooksPath` is relative.
+
+**Q5 - The authority fix.** `revokedIds` is now required. Is the implementation right? Does it fail closed on every path? The author changed six existing test call sites to pass `revokedIds: []` - is that a legitimate re-anchoring or did it weaken the suite? What about the other findings in your security review (signature base64 malleability, digest binding, trust anchor) - does this change interact with any of them?
+
+**Q6 - The conflict law.** `README.md` §3 item 7 now says precedence is canon > satellite > adapter for reading, and that a token-value divergence must be surfaced rather than resolved. Is that the right rule? Will an agent actually obey it? Does it make the unfixed token schism safe, or just documented?
+
+**Q7 - The decision not to fix the token schism.** Was leaving it to Sean correct, or is it an abdication dressed as caution? If you think the author should have picked a scale, say which and why.
+
+**Q8 - Opportunity cost.** Your review's #1 recommendation was a generated `brain-manifest.json` + load packs, on the grounds that measurement is meaningless while agents load inconsistently. This branch built a *validator* instead of a *compiler*. Was that the right first move, or did it spend the slot on the cheaper thing? Be specific about what the manifest would do that this does not.
+
+**Q9 - Anything else.** Invited.
+
+---
+
+## Section 7 - OUTPUT FORMAT
+
+Lead with a **one-paragraph verdict**: is this work sound, partly sound, or should some of it be reverted?
+
+1. **Defects in the fix** (table: rank / finding / file+line / severity / why it costs). Separate **wrong** from **incomplete** from **fragile**.
+2. **What was missed** - same-class defects still in the corpus.
+3. **False or unearned claims** in the commit messages or the doctrine text this branch added.
+4. **Answers to Q1-Q9**, headed.
+5. **Merge verdict:** MERGE / MERGE WITH FIXES (list them) / REVISE / REVERT - and the reasoning.
+
+Do not soften. A specific wrong call Sean can test beats a vague correct one.
diff --git a/docs/ai-workflow/design-brain/README.md b/docs/ai-workflow/design-brain/README.md
index b4171dfe4..cf56ce80c 100644
--- a/docs/ai-workflow/design-brain/README.md
+++ b/docs/ai-workflow/design-brain/README.md
@@ -34,9 +34,9 @@ Every agent that builds or reviews UI agrees to this:
 5. **Verify responsive + accessibility** against `qa-gates.md` Gates 1–2 before claiming done.
 6. **Run visual QA** (`qa-gates.md` Gate 3 hostile critique) before claiming done, and produce the QA receipt it defines.
 7. **Conflict law — when two files in this folder disagree.** Precedence is **`design.md` (canon) > satellite (`motion.md`, `components.md`, `typography-grid.md`, …) > adapter**. But precedence is how you *read*, not a licence to proceed quietly: if a satellite states a token VALUE that canon also states and they differ, **STOP, do not pick one, and surface it** — the divergence is a defect in the corpus, and silently choosing means two agents ship two different products. Name the conflict in your task thread and in the QA receipt.
-   - **Open conflict, as of 2026-08-16 — spacing / radius / easing / duration.** `design.md` §8/§9 and `typography-grid.md` §3/§5/§6 state different scales (e.g. canon radius `20` cards · `12` controls; `typography-grid.md` `6/10/16/24/9999`, with buttons at `10`). **Neither is mechanically enforced:** canon says arbitrary values are `swan/spacing` lint errors, but no `swan/*` rule exists in the repo — `scripts/ci/check-token-discipline.mjs` enforces raw-hex discipline only. Until Sean rules on which scale wins, treat **canon as the read-precedence default** and flag any surface where the choice would be visible. Tracked in SWA-163.
+   - **Open conflict, as of 2026-08-16 — spacing / radius / easing / duration.** `design.md` §8/§9 and `typography-grid.md` §3/§5/§6 state different scales. Canon §9 in full: radius `20` cards · `12` controls · `999` pills · `24` modals; spacing `4 8 12 16 24 32 48 72 108 160 240`. `typography-grid.md` §5: `6/10/16/24/9999`, buttons at `10`. (Quote canon's scale complete — an abbreviated version makes canon look self-contradictory when a satellite legitimately cites the `24` modal radius.) **Neither is mechanically enforced:** canon says arbitrary values are `swan/spacing` lint errors, but no `swan/*` rule exists in the repo — `scripts/ci/check-token-discipline.mjs` enforces raw-hex discipline only. Until Sean rules on which scale wins, treat **canon as the read-precedence default** and flag any surface where the choice would be visible. Tracked in SWA-163.
 
-**Structural integrity of this folder is gated, not trusted.** `scripts/design-brain/check-brain-links.mjs` (`npm run brain:links`, and pre-commit on any `design-brain/` change) fails the build on a reference to a canon section that does not exist, a file missing from `index.md`, or an `index.md` row pointing at nothing. Run `npm run brain:links:titles` to audit the class it cannot judge: references that *resolve* but point at the wrong section.
+**Structural integrity of this folder is gated, not trusted.** `scripts/design-brain/check-brain-links.mjs` — `npm run brain:links`, and a pre-commit hook on any `design-brain/` change — exits non-zero on: a reference to a section that does not exist in the file it names (canon *and* satellite-to-satellite, including ranges like `§§9–22`), a file missing from `index.md`, an `index.md` row presenting an atticked or deleted file as live doctrine, and a bare `§N` that resolves under no reading. It also lists every referenced file outside this corpus, because a typo is indistinguishable from an external doc. There is no CI job — the hook and the npm script are the whole enforcement, and the hook refuses to certify when brain files differ between the working tree and the index. Run `npm run brain:links:titles` to audit the one class it cannot judge: references that *resolve* but point at the wrong section.
 
 ## 4. What this folder does NOT override
 
diff --git a/docs/ai-workflow/design-brain/anti-patterns.md b/docs/ai-workflow/design-brain/anti-patterns.md
index 1d4585fd3..3ae2865e2 100644
--- a/docs/ai-workflow/design-brain/anti-patterns.md
+++ b/docs/ai-workflow/design-brain/anti-patterns.md
@@ -1,6 +1,6 @@
 # anti-patterns.md — The Banned List (with WHY)
 
-- **Date:** 2026-07-03 · **Author:** Fable (claude-fable-5) · **Status:** CANONICAL (expands `design.md` §27; bans inherited from `SWAN-CINEMATIC-DESIGN-SYSTEM.md` §B "explicit bans" win all conflicts)
+- **Date:** 2026-07-03 · **Author:** Fable (claude-fable-5) · **Status:** CANONICAL (expands `design.md` §14; bans inherited from `SWAN-CINEMATIC-DESIGN-SYSTEM.md` §B "explicit bans" win all conflicts)
 - A PR that reintroduces any item below fails visual QA regardless of how good it looks.
 
 ---
diff --git a/docs/ai-workflow/design-brain/components.md b/docs/ai-workflow/design-brain/components.md
index b20805b21..6f27475d8 100644
--- a/docs/ai-workflow/design-brain/components.md
+++ b/docs/ai-workflow/design-brain/components.md
@@ -1,7 +1,7 @@
 # components.md — Swan Component Pattern Index (Design Brain core)
 
 - **Date:** 2026-07-03 · **Author:** Fable (claude-fable-5) · **Status:** CANONICAL (within its scope)
-- **Extends:** `design.md` §§9–22 (tokens, surfaces, tiers). **Source of truth:** `SWAN-CINEMATIC-DESIGN-SYSTEM.md` §C1–C12 — pattern recipes live there; this file maps components onto them and fixes anatomy/states/do-don't.
+- **Extends:** `design.md` §§6, 11–12 (tokens, components, states). **Source of truth:** `SWAN-CINEMATIC-DESIGN-SYSTEM.md` §C1–C12 — pattern recipes live there; this file maps components onto them and fixes anatomy/states/do-don't.
 - Universal: every interactive element ≥44px (rule 2); `var(--token, #fallback)` only (rule 6); dark-first (rule 3); all data-bearing components ship empty/loading/error/success states (design.md §12); motion per `motion.md`.
 
 ---
diff --git a/docs/ai-workflow/design-brain/motion.md b/docs/ai-workflow/design-brain/motion.md
index e5b285b32..0af75c1be 100644
--- a/docs/ai-workflow/design-brain/motion.md
+++ b/docs/ai-workflow/design-brain/motion.md
@@ -1,7 +1,7 @@
 # motion.md — Swan Motion Doctrine (Design Brain core)
 
 - **Date:** 2026-07-03 · **Author:** Fable (claude-fable-5) · **Status:** CANONICAL (within its scope)
-- **Extends:** `design.md` §25 · **Source of truth:** `SWAN-CINEMATIC-DESIGN-SYSTEM.md` §A (motion tools, Full/Lean/Still runtime quality, Reduced Motion override), §B (motion bans), §C1–C12 (per-pattern fallbacks). That doc wins conflicts.
+- **Extends:** `design.md` §8 · **Source of truth:** `SWAN-CINEMATIC-DESIGN-SYSTEM.md` §A (motion tools, Full/Lean/Still runtime quality, Reduced Motion override), §B (motion bans), §C1–C12 (per-pattern fallbacks). That doc wins conflicts.
 
 ---
 
@@ -38,7 +38,7 @@ Animate **`transform` and `opacity`. Nothing else** without an explicit exceptio
 1. **CSS gate** — `@media (prefers-reduced-motion: reduce)` inside the styled-component: kill nonessential keyframes, transitions, and scroll effects; keep the complete authored Still composition intact per source §A.
 2. **JS gate** — framer-motion `useReducedMotion()` (or `<MotionConfig reducedMotion="user">` at the surface root) disabling variants, springs, `useMotionValue` count-ups, and rAF loops.
 
-**The CSS media query does NOT govern JS-driven entrances.** Lesson of 2026-06-20: a surface shipped with the CSS query in place and framer springs still animating for reduced-motion users — CSS `@media` cannot stop what framer applies as inline styles from JS. Reviewers reject any slice that gates only one layer (see `adapters/builders.md` §"Reduced motion, both layers", `adapters/reviewers.md` §4).
+**The CSS media query does NOT govern JS-driven entrances.** Lesson of 2026-06-20: a surface shipped with the CSS query in place and framer springs still animating for reduced-motion users — CSS `@media` cannot stop what framer applies as inline styles from JS. Reviewers reject any slice that gates only one layer (see `adapters/builders.md` §"Reduced motion, both layers", `adapters/reviewers.md` §A2 lens 4 (accessibility)).
 
 - Reduced Motion means **reduced, not gutted**: content, layout, and tokens all remain through the authored Still composition (source §A). A blank hero is a failure; a static poster is the spec.
 - Video/canvas under reduced motion: show the poster frame; do not autoplay.
diff --git a/scripts/design-brain/check-brain-links.mjs b/scripts/design-brain/check-brain-links.mjs
index 21862774b..2ff7427d6 100644
--- a/scripts/design-brain/check-brain-links.mjs
+++ b/scripts/design-brain/check-brain-links.mjs
@@ -58,8 +58,10 @@ const lines = (text) => text.split(/\r?\n/);
 function sectionsOf(text) {
   const map = new Map();
   for (const line of lines(text)) {
-    const m = /^##\s+(?:§\s*(\d+)|(\d+)\.)\s+(.*)$/.exec(line);
-    if (m) map.set(m[1] ?? m[2], m[3].trim());
+    // `## §9 Title` · `## 4. Title` · `## 15.1 Title`. The decimal form is real
+    // (cinematic-pages.md §15.1) and omitting it made the gate report a live section as dangling.
+    const m = /^##\s+(?:§\s*(\d+(?:\.\d+)?)|(\d+(?:\.\d+)?)\.?)\s+(.*)$/.exec(line);
+    if (m) map.set((m[1] ?? m[2]).replace(/\.$/, ''), m[3].trim());
   }
   return map;
 }
@@ -79,12 +81,38 @@ if (!sections.size) {
  * Bare `§N` (no filename) is handled separately by `impossibleBareRefs` below — it cannot be
  * attributed to a file, but it can still be proven IMPOSSIBLE. See D4.
  */
+const MAX_RANGE_SPAN = 50;
 function refsIn(line) {
   const out = [];
-  const re = /([a-z0-9-]+\.md)\s+§{1,2}\s*(\d+(?:\s*(?:,|and)\s*§?\s*\d+)*)/gi;
+  // Continuation accepts `,` / `and` / an en-, em- or hyphen RANGE. Ranges are EXPANDED:
+  // `§§9–22` means every section from 9 to 22, and reading it as a single ref to §9 is how a
+  // half-dangling range ships undetected — which is exactly what happened on components.md:4,
+  // the "Extends" header line of the most-loaded satellite, inside the branch that killed this class.
+  // Path component captured too (`adapters/reviewers.md`, `./index.md`) — four files in this
+  // corpus are named index.md, so a basename-only match resolves against the wrong one.
+  const re = /((?:\.{0,2}\/)?(?:[a-z0-9-]+\/)*[a-z0-9-]+\.md)[`\s]*\s*§{1,2}\s*(\d+(?:\.\d+)?(?:\s*(?:,|and|[–—-])\s*§?\s*\d+(?:\.\d+)?)*)/gi;
   let m;
   while ((m = re.exec(line)) !== null) {
-    for (const n of m[2].match(/\d+/g) ?? []) out.push({ file: m[1], n, raw: m[0] });
+    const body = m[2];
+    // Decimal refs (`§1.7`) are NOT coerced to §1 — a subsection that does not exist is a
+    // dangling ref, and silently truncating it is how anti-patterns.md:70 survived two passes.
+    for (const part of body.split(/\s*(?:,|and)\s*/)) {
+      const range = /^§?\s*(\d+(?:\.\d+)?)\s*[–—-]\s*§?\s*(\d+(?:\.\d+)?)$/.exec(part.trim());
+      if (range && Number.isInteger(+range[1]) && Number.isInteger(+range[2])) {
+        const [lo, hi] = [Math.ceil(+range[1]), Math.floor(+range[2])];
+        // Bound the expansion. No real doc has a 50-section span, so a wider range is a typo
+        // or hostile input — and expanding it verbatim turns one bad character into tens of
+        // thousands of findings that bury every real one. Report the range itself instead.
+        if (hi < lo || hi - lo > MAX_RANGE_SPAN) {
+          out.push({ file: m[1], n: `${lo}-${hi}`, raw: m[0], malformed: true });
+        } else {
+          for (let i = lo; i <= hi; i++) out.push({ file: m[1], n: String(i), raw: m[0] });
+        }
+      } else {
+        const one = /§?\s*(\d+(?:\.\d+)?)/.exec(part);
+        if (one) out.push({ file: m[1], n: one[1], raw: m[0] });
+      }
+    }
   }
   return out;
 }
@@ -100,19 +128,51 @@ const mdFiles = [];
 
 /** Section maps for every file in the corpus, keyed by basename, parsed once. */
 const sectionsByFile = new Map();
-for (const rel of mdFiles) sectionsByFile.set(basename(rel), sectionsOf(readFileSync(join(BRAIN, rel), 'utf8')));
+// Keyed by full corpus-relative path, lower-cased. Basename keying collided: FOUR files here
+// are named index.md (top level, adapters/, obsidian/, graphify/), so `index.md §3` silently
+// resolved against whichever was read last.
+for (const rel of mdFiles) sectionsByFile.set(rel.toLowerCase(), sectionsOf(readFileSync(join(BRAIN, rel), 'utf8')));
+
+/**
+ * Resolve a cited path the way a reader would: relative to the citing file's directory first,
+ * then as a corpus-root path, then — only if the basename is UNIQUE — by basename. An ambiguous
+ * bare basename is reported rather than guessed, because guessing is what produced the collision.
+ */
+function resolveTarget(cited, fromRel) {
+  const clean = cited.replace(/^\.\//, '').toLowerCase();
+  const dir = fromRel.includes('/') ? fromRel.slice(0, fromRel.lastIndexOf('/')).toLowerCase() : '';
+  const candidates = [];
+  if (clean.startsWith('../')) candidates.push(clean.replace(/^\.\.\//, ''));
+  if (dir) candidates.push(`${dir}/${clean}`);
+  candidates.push(clean);
+  for (const c of candidates) if (sectionsByFile.has(c)) return { key: c, sections: sectionsByFile.get(c) };
+  const base = basename(clean);
+  const byBase = [...sectionsByFile.keys()].filter((k) => basename(k) === base);
+  if (byBase.length === 1) return { key: byBase[0], sections: sectionsByFile.get(byBase[0]) };
+  if (byBase.length > 1) return { ambiguous: byBase };
+  return null;
+}
 
 const dangling = [];
 const resolved = [];
+const skippedTargets = new Map(); // target -> count. Silence must be visible, not assumed benign.
 for (const rel of mdFiles) {
   const fileLines = lines(readFileSync(join(BRAIN, rel), 'utf8'));
   fileLines.forEach((line, i) => {
-    for (const { file: target, n, raw } of refsIn(line)) {
-      const targetSections = sectionsByFile.get(basename(target));
-      // A reference to a file outside this corpus is not ours to validate.
-      if (!targetSections) continue;
-      const rec = { file: rel, line: i + 1, target: basename(target), n, raw, ctx: line.trim().slice(0, 110) };
-      if (targetSections.has(n)) resolved.push({ ...rec, title: targetSections.get(n) });
+    for (const { file: target, n, raw, malformed } of refsIn(line)) {
+      const hit = resolveTarget(target, rel);
+      // A ref to a file outside this corpus is not ours to validate — but it is indistinguishable
+      // from a TYPO (`motions.md §4`). Counted and reported so the gap is visible rather than silent.
+      if (!hit || hit.ambiguous) {
+        const label = hit?.ambiguous ? `${target} (AMBIGUOUS: ${hit.ambiguous.join(' | ')})` : target;
+        skippedTargets.set(label, (skippedTargets.get(label) ?? 0) + 1);
+        continue;
+      }
+      const rec = { file: rel, line: i + 1, target: hit.key, n, raw, ctx: line.trim().slice(0, 110) };
+      // A malformed range (reversed, or absurdly wide) can never resolve — it is reported as
+      // one defect, not expanded into thousands.
+      if (malformed) dangling.push(rec);
+      else if (hit.sections.has(n)) resolved.push({ ...rec, title: hit.sections.get(n) });
       else dangling.push(rec);
     }
   });
@@ -150,7 +210,14 @@ for (const rel of mdFiles) {
 const indexText = existsSync(join(BRAIN, 'index.md')) ? readFileSync(join(BRAIN, 'index.md'), 'utf8') : '';
 const IGNORE = new Set(['index.md']);
 const isBackup = (f) => /\.(pre-redo|bak|orig)$/.test(f) || f.endsWith('.pre-redo');
-const unindexed = mdFiles.filter((f) => !IGNORE.has(f) && !isBackup(f) && !indexText.includes(basename(f)));
+// EXACT names, not substring containment. `techniques.md` is a substring of the listed
+// `field-techniques.md`, so a containment test can never see the `techniques.md` row being
+// deleted — the index law would be enforced by a mechanism blind to its own most likely failure.
+const indexLines = lines(indexText);
+const listedExact = new Set(
+  [...indexText.matchAll(/`([A-Za-z0-9._/-]+\.md)`/g)].map((m) => basename(m[1])),
+);
+const unindexed = mdFiles.filter((f) => !IGNORE.has(f) && !isBackup(f) && !listedExact.has(basename(f)));
 // index.md legitimately cites docs OUTSIDE this folder (the source-of-truth design system,
 // the world-factory skill). Those are cross-references, not orphans — resolve any listed
 // path against the repo root before calling it missing, or the gate cries wolf and gets ignored.
@@ -173,10 +240,18 @@ const orphaned = [...new Set(listedNames)].filter((name) => {
   if (existsSync(join(REPO, name))) return false;                                      // repo-relative cross-ref
   // Bare names may cite the two source-of-truth docs, which live in references/.
   if (existsSync(join(REPO, 'docs', 'ai-workflow', 'references', name))) return false;
-  // Retired docs move to docs/_attic/. An index row that HONESTLY records a file as
-  // atticked (with its new home) is documentation, not an orphan — the D3 defect is an
-  // index pointing at nothing, not an index admitting something moved.
-  if (atticBasenames.has(basename(name))) return false;
+  // Retired docs move to docs/_attic/. An index entry that HONESTLY records a file as atticked
+  // is documentation; a row still presenting it as live doctrine is the 4d192e5ac rot itself.
+  //
+  // Exempting by basename alone could not tell those apart, so the gate was silent on exactly
+  // the historical failure it was built for — while index.md claimed it "now catches (D3)".
+  // That is this branch committing the sin it exists to purge. The exemption now requires the
+  // MENTION ITSELF to be marked ATTICKED, so an honest record passes and a live-looking row fails.
+  if (atticBasenames.has(basename(name))) {
+    const mentioned = indexLines.filter((l) => l.includes(name) || l.includes(basename(name)));
+    const allMarked = mentioned.length > 0 && mentioned.every((l) => /ATTICKED/i.test(l));
+    if (allMarked) return false;
+  }
   return true;
 });
 
@@ -222,10 +297,15 @@ if (orphaned.length) {
   console.log('');
 }
 
+if (skippedTargets.size) {
+  console.log(`NOTE — ${skippedTargets.size} referenced file(s) are outside this corpus and were NOT validated. A typo is indistinguishable from an external doc; confirm each is real:`);
+  for (const [t, c] of [...skippedTargets].sort()) console.log(`  ${t} (${c} ref${c > 1 ? 's' : ''})`);
+  console.log('');
+}
 console.log(
   `[brain-links] ${mdFiles.length} files · ${sections.size} canon sections · ` +
   `${resolved.length + dangling.length} refs (${resolved.length} resolve, ${dangling.length} dangle) · ` +
-  `${unindexed.length} unindexed · ${orphaned.length} orphaned · ${impossibleBare.length} impossible-bare`,
+  `${unindexed.length} unindexed · ${orphaned.length} orphaned · ${impossibleBare.length} impossible-bare · ${skippedTargets.size} unvalidated target(s)`,
 );
 if (bad) {
   console.error(`[brain-links] FAIL — ${bad} structural defect(s). Fix the corpus, not this checker.`);

```

---

## Section 4 - THE CURRENT CHECKER, WHOLE (read as a program)

This is the load-bearing artifact and it blocks commits. It was substantially rewritten in the delta above.


```javascript
#!/usr/bin/env node
/**
 * check-brain-links.mjs — structural integrity gate for the Design Brain corpus.
 *
 * The Design Brain is markdown that agents load at task time. Three failure modes rot it
 * silently, and all three have shipped to `main` at least once:
 *
 *   D1 DANGLING   a file cites `<other>.md §N` for an N that does not exist — canon refs
 *                 (`design.md §N`) and satellite-to-satellite refs (`motion.md §4`) alike.
 *                 A canon rewrite renumbered §1-28 down to §1-17 and no satellite followed.
 *                 An agent that follows a dead pointer resolves safely by SKIPPING the
 *                 doctrine it could not find — so canon supremacy becomes fiction.
 *   D2 UNINDEXED  `index.md` declares "every file in this folder is listed here", then
 *                 does not list the folder's newest files. Index-driven loaders never see them.
 *   D3 ORPHANED   `index.md` lists a file that no longer exists.
 *   D4 IMPOSSIBLE a bare `§N` (no filename) that resolves under NO reading — it exceeds both
 *                 canon's highest section and its own file's. Found `components.md` citing
 *                 `§18` for a two-step-arm modal that is `§17`, in a 17-section file.
 *
 * This checker is deliberately dumb and deterministic: it parses headings and references,
 * it never calls a model, and it exits non-zero so CI and pre-commit can gate on it.
 *
 * It does NOT judge whether a resolvable reference points at the RIGHT section — that is a
 * semantic call. `--titles` prints every reference beside its target's heading so a human
 * (or a review agent) can audit wrong-target refs, which are more dangerous than dangling
 * ones because they resolve confidently to the wrong doctrine.
 *
 * Usage:
 *   node scripts/design-brain/check-brain-links.mjs            # gate: exit 1 on any defect
 *   node scripts/design-brain/check-brain-links.mjs --titles   # audit aid: ref -> target heading
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const BRAIN = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'docs', 'ai-workflow', 'design-brain');
const CANON = 'design.md';
const showTitles = process.argv.includes('--titles');

if (!existsSync(join(BRAIN, CANON))) {
  console.error(`[brain-links] canon not found: ${join(BRAIN, CANON)}`);
  process.exit(2);
}

/**
 * Split on either line ending. This repo is CRLF; in JavaScript `.` does NOT match `\r`
 * (it is a line terminator), so a trailing `\r` silently defeats any `$`-anchored regex.
 * Normalising here rather than per-regex is the difference between this checker working
 * and it reporting CLEAN on a broken corpus.
 */
const lines = (text) => text.split(/\r?\n/);

/**
 * Section numbers + headings for one file. Two heading dialects are in use:
 * canon writes `## §9 Space, elevation, z`; satellites write `## 4. Where motion is banned`.
 * Both are parsed so cross-file references can be validated, not just references to canon.
 */
function sectionsOf(text) {
  const map = new Map();
  for (const line of lines(text)) {
    // `## §9 Title` · `## 4. Title` · `## 15.1 Title`. The decimal form is real
    // (cinematic-pages.md §15.1) and omitting it made the gate report a live section as dangling.
    const m = /^##\s+(?:§\s*(\d+(?:\.\d+)?)|(\d+(?:\.\d+)?)\.?)\s+(.*)$/.exec(line);
    if (m) map.set((m[1] ?? m[2]).replace(/\.$/, ''), m[3].trim());
  }
  return map;
}

const canonText = readFileSync(join(BRAIN, CANON), 'utf8');
const sections = sectionsOf(canonText);
if (!sections.size) {
  console.error('[brain-links] parsed zero sections from canon — heading format changed; fix this checker before trusting it');
  process.exit(2);
}

/**
 * Every `<some-file>.md §N` reference on a line, including the `§§14, 18` multi-form.
 * Covers cross-file refs (e.g. `motion.md §4`), not just references to canon — a satellite
 * citing another satellite's renumbered section rots exactly the same way.
 *
 * Bare `§N` (no filename) is handled separately by `impossibleBareRefs` below — it cannot be
 * attributed to a file, but it can still be proven IMPOSSIBLE. See D4.
 */
const MAX_RANGE_SPAN = 50;
function refsIn(line) {
  const out = [];
  // Continuation accepts `,` / `and` / an en-, em- or hyphen RANGE. Ranges are EXPANDED:
  // `§§9–22` means every section from 9 to 22, and reading it as a single ref to §9 is how a
  // half-dangling range ships undetected — which is exactly what happened on components.md:4,
  // the "Extends" header line of the most-loaded satellite, inside the branch that killed this class.
  // Path component captured too (`adapters/reviewers.md`, `./index.md`) — four files in this
  // corpus are named index.md, so a basename-only match resolves against the wrong one.
  const re = /((?:\.{0,2}\/)?(?:[a-z0-9-]+\/)*[a-z0-9-]+\.md)[`\s]*\s*§{1,2}\s*(\d+(?:\.\d+)?(?:\s*(?:,|and|[–—-])\s*§?\s*\d+(?:\.\d+)?)*)/gi;
  let m;
  while ((m = re.exec(line)) !== null) {
    const body = m[2];
    // Decimal refs (`§1.7`) are NOT coerced to §1 — a subsection that does not exist is a
    // dangling ref, and silently truncating it is how anti-patterns.md:70 survived two passes.
    for (const part of body.split(/\s*(?:,|and)\s*/)) {
      const range = /^§?\s*(\d+(?:\.\d+)?)\s*[–—-]\s*§?\s*(\d+(?:\.\d+)?)$/.exec(part.trim());
      if (range && Number.isInteger(+range[1]) && Number.isInteger(+range[2])) {
        const [lo, hi] = [Math.ceil(+range[1]), Math.floor(+range[2])];
        // Bound the expansion. No real doc has a 50-section span, so a wider range is a typo
        // or hostile input — and expanding it verbatim turns one bad character into tens of
        // thousands of findings that bury every real one. Report the range itself instead.
        if (hi < lo || hi - lo > MAX_RANGE_SPAN) {
          out.push({ file: m[1], n: `${lo}-${hi}`, raw: m[0], malformed: true });
        } else {
          for (let i = lo; i <= hi; i++) out.push({ file: m[1], n: String(i), raw: m[0] });
        }
      } else {
        const one = /§?\s*(\d+(?:\.\d+)?)/.exec(part);
        if (one) out.push({ file: m[1], n: one[1], raw: m[0] });
      }
    }
  }
  return out;
}

const mdFiles = [];
(function walk(dir, rel = '') {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, rel ? `${rel}/${e.name}` : e.name);
    else if (e.name.endsWith('.md')) mdFiles.push(rel ? `${rel}/${e.name}` : e.name);
  }
})(BRAIN);

/** Section maps for every file in the corpus, keyed by basename, parsed once. */
const sectionsByFile = new Map();
// Keyed by full corpus-relative path, lower-cased. Basename keying collided: FOUR files here
// are named index.md (top level, adapters/, obsidian/, graphify/), so `index.md §3` silently
// resolved against whichever was read last.
for (const rel of mdFiles) sectionsByFile.set(rel.toLowerCase(), sectionsOf(readFileSync(join(BRAIN, rel), 'utf8')));

/**
 * Resolve a cited path the way a reader would: relative to the citing file's directory first,
 * then as a corpus-root path, then — only if the basename is UNIQUE — by basename. An ambiguous
 * bare basename is reported rather than guessed, because guessing is what produced the collision.
 */
function resolveTarget(cited, fromRel) {
  const clean = cited.replace(/^\.\//, '').toLowerCase();
  const dir = fromRel.includes('/') ? fromRel.slice(0, fromRel.lastIndexOf('/')).toLowerCase() : '';
  const candidates = [];
  if (clean.startsWith('../')) candidates.push(clean.replace(/^\.\.\//, ''));
  if (dir) candidates.push(`${dir}/${clean}`);
  candidates.push(clean);
  for (const c of candidates) if (sectionsByFile.has(c)) return { key: c, sections: sectionsByFile.get(c) };
  const base = basename(clean);
  const byBase = [...sectionsByFile.keys()].filter((k) => basename(k) === base);
  if (byBase.length === 1) return { key: byBase[0], sections: sectionsByFile.get(byBase[0]) };
  if (byBase.length > 1) return { ambiguous: byBase };
  return null;
}

const dangling = [];
const resolved = [];
const skippedTargets = new Map(); // target -> count. Silence must be visible, not assumed benign.
for (const rel of mdFiles) {
  const fileLines = lines(readFileSync(join(BRAIN, rel), 'utf8'));
  fileLines.forEach((line, i) => {
    for (const { file: target, n, raw, malformed } of refsIn(line)) {
      const hit = resolveTarget(target, rel);
      // A ref to a file outside this corpus is not ours to validate — but it is indistinguishable
      // from a TYPO (`motions.md §4`). Counted and reported so the gap is visible rather than silent.
      if (!hit || hit.ambiguous) {
        const label = hit?.ambiguous ? `${target} (AMBIGUOUS: ${hit.ambiguous.join(' | ')})` : target;
        skippedTargets.set(label, (skippedTargets.get(label) ?? 0) + 1);
        continue;
      }
      const rec = { file: rel, line: i + 1, target: hit.key, n, raw, ctx: line.trim().slice(0, 110) };
      // A malformed range (reversed, or absurdly wide) can never resolve — it is reported as
      // one defect, not expanded into thousands.
      if (malformed) dangling.push(rec);
      else if (hit.sections.has(n)) resolved.push({ ...rec, title: hit.sections.get(n) });
      else dangling.push(rec);
    }
  });
}

/**
 * D4 IMPOSSIBLE BARE REF. A bare `§N` carries no filename, so it cannot be attributed —
 * it may mean canon or the containing file's own sections. It can still be proven
 * impossible: if N exceeds BOTH canon's highest section AND the containing file's own
 * highest, then no reading of it resolves. That is a dangling ref by any interpretation,
 * with no ambiguity to trade against — so it is safe to gate on.
 *
 * This is deliberately the weakest possible claim. A bare `§6` in a file with 17 sections
 * is NOT flagged even if it was meant as a canon ref to something else, because proving
 * that needs intent. Under-reporting here is the price of never crying wolf; the fix for
 * an ambiguous ref is to cite the filename, which promotes it to the D1 check above.
 */
const canonMax = Math.max(...[...sections.keys()].map(Number));
const impossibleBare = [];
for (const rel of mdFiles) {
  const ownMax = Math.max(0, ...[...(sectionsByFile.get(basename(rel))?.keys() ?? [])].map(Number));
  lines(readFileSync(join(BRAIN, rel), 'utf8')).forEach((line, i) => {
    // Strip attributed refs first so `motion.md §4` is not re-counted as a bare `§4`.
    const bare = line.replace(/[a-z0-9-]+\.md.{0,3}§+\s*[\d,\s]*\d/gi, '');
    for (const m of bare.matchAll(/§\s*(\d+)/g)) {
      const n = Number(m[1]);
      if (n > canonMax && n > ownMax) {
        impossibleBare.push({ file: rel, line: i + 1, n, ownMax, ctx: line.trim().slice(0, 110) });
      }
    }
  });
}

// D2/D3: index.md must list exactly the folder's markdown files (excluding itself + backups).
const indexText = existsSync(join(BRAIN, 'index.md')) ? readFileSync(join(BRAIN, 'index.md'), 'utf8') : '';
const IGNORE = new Set(['index.md']);
const isBackup = (f) => /\.(pre-redo|bak|orig)$/.test(f) || f.endsWith('.pre-redo');
// EXACT names, not substring containment. `techniques.md` is a substring of the listed
// `field-techniques.md`, so a containment test can never see the `techniques.md` row being
// deleted — the index law would be enforced by a mechanism blind to its own most likely failure.
const indexLines = lines(indexText);
const listedExact = new Set(
  [...indexText.matchAll(/`([A-Za-z0-9._/-]+\.md)`/g)].map((m) => basename(m[1])),
);
const unindexed = mdFiles.filter((f) => !IGNORE.has(f) && !isBackup(f) && !listedExact.has(basename(f)));
// index.md legitimately cites docs OUTSIDE this folder (the source-of-truth design system,
// the world-factory skill). Those are cross-references, not orphans — resolve any listed
// path against the repo root before calling it missing, or the gate cries wolf and gets ignored.
const REPO = join(BRAIN, '..', '..', '..');

/** Basenames of every markdown file under docs/_attic — the documented home for retired docs. */
const atticBasenames = new Set();
(function walkAttic(dir) {
  if (!existsSync(dir)) return;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) walkAttic(join(dir, e.name));
    else if (e.name.endsWith('.md')) atticBasenames.add(e.name);
  }
})(join(REPO, 'docs', '_attic'));

const listedNames = [...indexText.matchAll(/`([A-Za-z0-9._/-]+\.md)`/g)].map((m) => m[1]);
const orphaned = [...new Set(listedNames)].filter((name) => {
  if (mdFiles.some((f) => f === name || basename(f) === basename(name))) return false; // in this folder
  if (existsSync(join(BRAIN, name))) return false;                                     // folder-relative
  if (existsSync(join(REPO, name))) return false;                                      // repo-relative cross-ref
  // Bare names may cite the two source-of-truth docs, which live in references/.
  if (existsSync(join(REPO, 'docs', 'ai-workflow', 'references', name))) return false;
  // Retired docs move to docs/_attic/. An index entry that HONESTLY records a file as atticked
  // is documentation; a row still presenting it as live doctrine is the 4d192e5ac rot itself.
  //
  // Exempting by basename alone could not tell those apart, so the gate was silent on exactly
  // the historical failure it was built for — while index.md claimed it "now catches (D3)".
  // That is this branch committing the sin it exists to purge. The exemption now requires the
  // MENTION ITSELF to be marked ATTICKED, so an honest record passes and a live-looking row fails.
  if (atticBasenames.has(basename(name))) {
    const mentioned = indexLines.filter((l) => l.includes(name) || l.includes(basename(name)));
    const allMarked = mentioned.length > 0 && mentioned.every((l) => /ATTICKED/i.test(l));
    if (allMarked) return false;
  }
  return true;
});

if (showTitles) {
  console.log('REFERENCE AUDIT — check each ref against its target heading (wrong-target refs resolve, but mislead):\n');
  for (const r of resolved) {
    console.log(`  ${r.file}:${r.line}  ${r.target} §${r.n} = ${r.title}`);
    console.log(`      ${r.ctx}`);
  }
  console.log('');
}

let bad = 0;
if (dangling.length) {
  bad += dangling.length;
  console.log(`D1 DANGLING — ${dangling.length} reference(s) to a section that does not exist:`);
  for (const d of dangling) {
    const have = [...(sectionsByFile.get(d.target)?.keys() ?? [])].map(Number).sort((a, b) => a - b);
    const range = have.length ? `§${have[0]}–§${have[have.length - 1]}` : '(no numbered sections)';
    console.log(`  ${d.file}:${d.line}  "${d.raw}" — ${d.target} has ${range}, not §${d.n}\n      ${d.ctx}`);
  }
  console.log('');
}
if (unindexed.length) {
  bad += unindexed.length;
  console.log(`D2 UNINDEXED — ${unindexed.length} file(s) present but absent from index.md, whose own law is "every file in this folder is listed here":`);
  for (const f of unindexed) console.log(`  ${f}`);
  console.log('');
}
if (impossibleBare.length) {
  bad += impossibleBare.length;
  console.log(`D4 IMPOSSIBLE BARE REF — ${impossibleBare.length} bare §N that resolves under NO reading (exceeds canon's §${canonMax} and the file's own sections):`);
  for (const b of impossibleBare) {
    const own = b.ownMax > 0 ? `this file has §1–§${b.ownMax}` : 'this file has no numbered sections';
    console.log(`  ${b.file}:${b.line}  §${b.n} — canon has §1–§${canonMax}, ${own}\n      ${b.ctx}`);
  }
  console.log('');
}
if (orphaned.length) {
  bad += orphaned.length;
  console.log(`D3 ORPHANED — ${orphaned.length} file(s) listed in index.md but not on disk:`);
  for (const f of orphaned) console.log(`  ${f}`);
  console.log('');
}

if (skippedTargets.size) {
  console.log(`NOTE — ${skippedTargets.size} referenced file(s) are outside this corpus and were NOT validated. A typo is indistinguishable from an external doc; confirm each is real:`);
  for (const [t, c] of [...skippedTargets].sort()) console.log(`  ${t} (${c} ref${c > 1 ? 's' : ''})`);
  console.log('');
}
console.log(
  `[brain-links] ${mdFiles.length} files · ${sections.size} canon sections · ` +
  `${resolved.length + dangling.length} refs (${resolved.length} resolve, ${dangling.length} dangle) · ` +
  `${unindexed.length} unindexed · ${orphaned.length} orphaned · ${impossibleBare.length} impossible-bare · ${skippedTargets.size} unvalidated target(s)`,
);
if (bad) {
  console.error(`[brain-links] FAIL — ${bad} structural defect(s). Fix the corpus, not this checker.`);
  process.exit(1);
}
console.log('[brain-links] CLEAN');

```

---

## Section 5 - THE PRE-COMMIT WIRING, WHOLE


```bash
#!/usr/bin/env bash
# pre-commit hook — Swan Studios
# Runs scripts/scan-secrets.sh on staged files.
# Installed via: git config core.hooksPath .githooks
#
# To bypass in emergencies (DO NOT MAKE A HABIT):
#   git commit --no-verify
# Per CLAUDE.md Rule 44, secret scanning is MANDATORY.

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
SCANNER="$REPO_ROOT/scripts/scan-secrets.sh"

if [[ ! -x "$SCANNER" ]]; then
  echo "⚠️  scripts/scan-secrets.sh not executable. Run: chmod +x scripts/scan-secrets.sh" >&2
  exit 1
fi

echo "[pre-commit] Running secret scan on staged files..."
if ! "$SCANNER" --staged; then
  cat >&2 <<'EOF'

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
COMMIT BLOCKED: secret-pattern detected in staged changes.

Next steps:
1. Remove the secret from the file (use env vars / getpass / read -s instead)
2. If this is a KNOWN-ROTATED historical fingerprint needed for incident documentation,
   add an allowlist entry to .secretignore:
       docs/your/file.md::rotated-render-pg-2026-04

Per CLAUDE.md Rule 44: secret scanning covers writes, not only shell commands.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EOF
  exit 1
fi

echo "[pre-commit] Secret scan: CLEAN"

# Frontend design-rule guards (SWA-32 Slice 0, Rule 73 twice=codify):
# G1 no-MUI · G2 no-recharts · G3 retired Galaxy palette · G4 hardcoded hex.
# Staged frontend/src files only; existing violations tracked separately (Rule 34).
echo "[pre-commit] Running frontend guards on staged files..."
if ! node "$REPO_ROOT/scripts/hooks/frontend-guards.mjs" --staged; then
  echo "COMMIT BLOCKED: frontend design-rule violation (see FAIL lines above)." >&2
  echo "These rules are mechanically enforced — fix the line, do not bypass. (CLAUDE.md rules 1/6/10)" >&2
  exit 1
fi

# Constitution integrity (added 2026-08-14 after commit 10a3e7fa1 silently
# reverted 9 MANDATORY rules from CLAUDE.md while shipping two correct edits).
# Blocks: rule deletion, silent renumbering, body reversion, and mirror drift.
# Only runs when a constitution file is staged; skips otherwise.
#
# Absence is announced, never silent. `core.hooksPath` is relative (`.githooks`),
# so every worktree runs ITS OWN committed hooks — but a worktree checked out
# before this guard existed has the hook file without the script. Failing there
# would break commits on old branches for no safety gain; failing SILENTLY would
# reproduce the exact defect this guard exists to catch. So: say so, loudly.
CONSTITUTION_GUARD="$REPO_ROOT/scripts/hooks/constitution-guard.mjs"
if [[ -f "$CONSTITUTION_GUARD" ]]; then
  echo "[pre-commit] Running constitution guard..."
  if ! node "$CONSTITUTION_GUARD"; then
    exit 1
  fi
elif git diff --cached --name-only | grep -qE '^(CLAUDE\.md|AGENTS\.md)$'; then
  # Editing the constitution in a checkout too old to carry its guard is the
  # highest-risk case there is. Refuse rather than wave it through.
  echo "COMMIT BLOCKED: you are editing a constitution file, but this checkout" >&2
  echo "  has no scripts/hooks/constitution-guard.mjs (it predates 2026-08-14)." >&2
  echo "  Rebase/merge onto current main before editing CLAUDE.md or AGENTS.md," >&2
  echo "  or the same silent rule-deletion that caused 10a3e7fa1 can recur here." >&2
  exit 1
else
  echo "[pre-commit] constitution guard: SCRIPT ABSENT (pre-2026-08-14 checkout) — skipped; no constitution file staged"
fi

# Skill-advertising parity (added 2026-08-14, Kimi finding D7). The routing table
# in CLAUDE.md IS the router: a skill absent from it never fires. That table had
# drifted 43% (23 advertised vs 42 installed) while entrypoint validation passed
# the whole time, because existence is not advertisement.
# Constitution reference resolution (added 2026-08-15, Kimi round-1 question 6).
# Four defects in the 2026-08-14 repair were identical in BOTH constitutions, so no
# diff or mirror-parity check could ever surface them. The mechanical half of
# "read for contradiction" is: resolve the document's verifiable assertions against
# ground truth. Cited paths are the cheapest such assertion — first run found five
# documents that NEVER existed in git, two of them marked MANDATORY.
CONSTITUTION_REFS="$REPO_ROOT/scripts/hooks/constitution-references.mjs"
if git diff --cached --name-only | grep -qE '^(CLAUDE\.md|AGENTS\.md)$'; then
  if [[ -f "$CONSTITUTION_REFS" ]]; then
    echo "[pre-commit] Resolving constitution references..."
    if ! node "$CONSTITUTION_REFS"; then
      exit 1
    fi
  else
    echo "[pre-commit] constitution-refs: SCRIPT ABSENT in this checkout — skipped (announced, not silent)"
  fi
fi

SKILL_REGISTRY="$REPO_ROOT/scripts/ai-workflow/validate-skill-registry.mjs"
if git diff --cached --name-only | grep -qE '^(CLAUDE\.md|AGENTS\.md|\.claude/skills/|\.agents/skills/)'; then
  if [[ -f "$SKILL_REGISTRY" ]]; then
    echo "[pre-commit] Running skill-advertising parity check..."
    if ! node "$SKILL_REGISTRY" --check; then
      echo "COMMIT BLOCKED: skill registry / advertising parity (see FAIL lines above)." >&2
      exit 1
    fi
  else
    echo "[pre-commit] skill-advertising check: SCRIPT ABSENT in this checkout — skipped (announced, not silent)"
  fi
fi

BRAIN_LINKS="$REPO_ROOT/scripts/design-brain/check-brain-links.mjs"
if git diff --cached --name-only | grep -qE '^docs/ai-workflow/design-brain/'; then
  if [[ -f "$BRAIN_LINKS" ]]; then
    # The checker reads the WORKING TREE, not the staged index. If any brain file differs
    # between them, a pass here says nothing about the blob being committed: stage a broken
    # file, fix it on disk without staging, and the gate waves the broken blob through.
    # Refuse to certify in that state rather than issue a verdict about the wrong tree.
    BRAIN_UNSTAGED="$(git diff --name-only -- docs/ai-workflow/design-brain/ scripts/design-brain/)"
    if [[ -n "$BRAIN_UNSTAGED" ]]; then
      echo "COMMIT BLOCKED: Design Brain files differ between the working tree and the index." >&2
      echo "  The structural check reads the working tree, so it CANNOT vouch for what you are committing." >&2
      echo "  Stage or stash these, then commit:" >&2
      echo "$BRAIN_UNSTAGED" | sed 's/^/    /' >&2
      exit 1
    fi
    echo "[pre-commit] Running Design Brain structural check (dangling refs / index law)..."
    if ! node "$BRAIN_LINKS"; then
      echo "COMMIT BLOCKED: Design Brain structural defect (see D1-D4 above)." >&2
      echo "  A dangling ref makes an agent silently SKIP the doctrine it cannot find." >&2
      exit 1
    fi
  else
    echo "[pre-commit] brain-links check: SCRIPT ABSENT in this checkout — skipped (announced, not silent)"
  fi
fi

exit 0

```

---

## Section 6 - CURRENT OUTPUT

```
NOTE — 2 referenced file(s) are outside this corpus and were NOT validated. A typo is indistinguishable from an external doc; confirm each is real:
  docs/ai-workflow/references/HERMES-SWANSTUDIOS-OPERATOR-BRIDGE.md (3 refs)
  docs/ai-workflow/references/SWANSTUDIOS-AI-SKILL-AND-OPERATOR-REGISTRY.md (2 refs)

[brain-links] 28 files - 17 canon sections - 70 refs (70 resolve, 0 dangle) - 0 unindexed - 0 orphaned - 0 impossible-bare - 2 unvalidated target(s)
[brain-links] CLEAN
```

Suite: 73 pass / 0 fail across 10 files. All four defect classes re-proven by injection after the rewrite.

**Treat CLEAN as a claim, not evidence.** A broken gate reports CLEAN too — this checker did exactly that once already, when a CRLF bug made its heading regex match nothing, and only a defensive "parsed zero sections" guard turned silence into failure.

---

## Section 7 - ANSWER THESE

**Q1** - Per-finding verdict on W1-W6 and I1-I4: FIXED / PARTIALLY FIXED / NOT FIXED / WRONG FIX. Cite the code.

**Q2** - What did the rewrite break? Attack `refsIn`, `sectionsOf`, `resolveTarget`, the range bounds, the ATTICKED test, and the D4 `impossibleBare` logic with adversarial input.

**Q3** - **The third layer.** What class of rot is still ungated? Consider: citation shapes the regex still cannot see; refs by section TITLE rather than number; refs from files outside `design-brain/` that consume it (`CLAUDE.md` already proved to carry one); `design.html`; refs inside code comments or the JSON schemas; and anything the `--titles` audit cannot judge.

**Q4** - Is `MAX_RANGE_SPAN = 50` the right bound, and is "report as one malformed ref" the right behaviour versus hard-failing?

**Q5** - The hook refuses to run when tree != index. Is that correct engineering, or should it check the staged blobs directly (`git show :path`)? What legitimate workflow does the refusal break?

**Q6** - The three deferred items. Should any of them have been fixed in this branch rather than deferred? Specifically: is deferring the `CLAUDE.md`/`AGENTS.md` `§18` dead pointer defensible when it is a one-character-class fix in the project's own constitution?

**Q7** - The fictional-mechanism sweep is the approved next slice. Design its acceptance criteria. What exactly should it check, what should it do when it finds one (fix / delete the claim / flag), and how does it avoid becoming a fourth fictional mechanism itself?

**Q8** - **Merge verdict:** MERGE / MERGE WITH FIXES (list) / REVISE / REVERT.

**Q9** - Anything else.

---

## Section 8 - OUTPUT FORMAT

1. **One-paragraph verdict**, blunt.
2. **Per-finding verification table** (W1-W6, I1-I4): finding / verdict / evidence.
3. **New defects table**: rank / finding / file+line / severity / why it costs.
4. **The third layer** — still-ungated rot classes, ranked.
5. Answers to Q4-Q9.

Tables before prose. If you run out of budget, the tables must have landed.

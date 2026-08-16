# SWAN BRAIN — merge-readiness hostile review of two branches

- **Date:** 2026-08-16 · **Author of the work AND this packet:** Claude Opus 5. Assume I am the least reliable narrator here.
- **Branch A — `claude/design-brain-repave-20260816` @ `28cdf5941`** (design-brain corpus + gate + review tooling)
- **Branch B — `claude/constitution-s18-20260816` @ `bd8d0a96c`** (cut fresh from `origin/main`; constitution + GLM header)
- Both pushed. **Neither merged. Nothing deploy-linked** — Render deploys from `main`.

---

## 0. YOUR REMIT — THREE QUESTIONS

1. **What is broken or wrong in the diffs below?**
2. **What did I MISS?** This session has repeatedly produced partial sweeps — fix two of three call sites, declare victory. Assume the same defect exists somewhere I have not looked.
3. **Is this safe to merge to `main`?** Name anything that must happen first. Render deploys from `main`, so a merge is the moment this becomes real.

### Output format — TABLES FIRST, PROSE LAST (hard requirement)

1. Findings table: `ID | severity | claim | evidence (diff hunk / file:line) | proposed fix`
2. Merge-readiness table: `branch | safe to merge? | blocking issues | pre-merge checklist`
3. Prose only after both tables.

Severity: **CRITICAL** (breaks prod / destroys doctrine) · **HIGH** (silent doctrine loss) · **MEDIUM** · **LOW**.

**Cite the diff.** A finding without a hunk or file:line is a hypothesis — label it one. **If you cannot verify a mechanism, say so** rather than asserting it exists; reviewers in this workstream have asserted non-existent mechanisms more than once. **Say plainly where the work is right** — do not manufacture findings.

---

## 1. WHAT THIS WORKSTREAM IS

`docs/ai-workflow/design-brain/` is a 28-file markdown doctrine corpus that every AI agent loads before building UI. A canon rewrite once renumbered `design.md` from 28 sections to 17 and **no satellite file followed**. Nothing errored: an agent that hits a dead pointer resolves it *safely*, by silently skipping the doctrine it cannot find. 34 structural defects accumulated invisibly.

A six-class gate now blocks that at commit time — `scripts/design-brain/check-brain-links.mjs`, `npm run brain:links`, wired into `.githooks/pre-commit`:

**D1** dangling `<file>.md §N` · **D2** file absent from `index.md` · **D3** index row for a missing file · **D4** impossible bare `§N` · **D5** citation of a file existing nowhere · **D6** citation of atticked doctrine.

**The governing lesson, learned the hard way:** *a count is a property of the instrument, not of the world*, and *proof scoped to the inputs you had in mind is not proof*.

---

## 2. WHAT THESE TWO BRANCHES CHANGE

### Branch A — design-brain repave (`28cdf5941`)

Earlier commits (already hostile-reviewed by GLM-5.3 + Kimi K3, findings fixed): the corpus repair, the gate, four owed reviews, the S1 truth commits, and the "sole canonical copy" correction. **Do not re-review those** unless you see something the prior rounds missed.

**NEW since the last review — this is what to attack:**
- `scripts/context-gateway/src/consult.mjs` — review headers now derive their H1 from the reviewed document instead of a static provider title.
- `scripts/consult-hy3-design.mjs` — same fix; **it was MISSED in the first pass** and found only by grepping for the old static strings.
- 9 review artifacts retitled to name the work (SWAN BRAIN) rather than the tool.

### Branch B — constitution (`bd8d0a96c`)

- Rule 40 in **both** constitutions cited `cinematic-pages.md §8/§18`. **§18 has never existed.** Removed.
- The `AGENTS.md` mirror was **DRIFTED**, which blocks every constitution commit — that is *why* the dead ref survived. Resynced from `CLAUDE.md`.
- `scripts/consult-glm.mjs` — same header fix (it lives only on `main`).

---

## 3. WHAT I VERIFIED BY EXECUTION (not asserted)

- **Header derivation: 8/8 cases** — both real packets (each containing a fenced diff), H1-after-blockquote, no-H1 fallback, empty doc, 400-char truncation, and a hostile fenced-`#` case. Shipped logic byte-identical to the tested logic.
- **`§18` absent on main**, verified with the gate's own section regex: 20 section keys parsed, numeric max 17, no key "18". *My first check — `grep -oE '^## §?[0-9]+'` — returned EMPTY for that 20-section file, because `§` is multibyte and the shell locale mangles it. That zero would have "confirmed" the claim from a blind instrument.*
- **Mirror drift analysed before syncing** (the standing warning is that syncing can destroy the good copy when `AGENTS.md` is newer). Diffed both bodies using the guard's own marker-split. Drift was **31 lines in two places, CLAUDE.md newer in both** — nothing in `AGENTS.md` was newer.
- **Post-sync:** adapter header byte-identical (232 chars); body byte-for-byte equal to `CLAUDE.md`; `§18` absent from both; new rule 67 present, June rule 67 gone; parity IN SYNC; 139 constitution citations resolve.
- **The two new commits on `main` since I branched touched neither constitution** — so the mirror sync cannot clobber newer law.
- **Zero file overlap between branches A and B** — they cannot conflict with each other.
- Brain gate **CLEAN** (28 files · 75 refs · 0 defects); suite **73 pass / 0 fail**.

---

## 4. KNOWN-OPEN ITEMS (already identified — do not re-report, but DO tell me if any blocks a merge)

- **The gate is blind to non-markdown files.** All six classes walk only `*.md`. Proven empirically: after `design.html` was retired, `index.md` still listed it and the gate reported CLEAN. `index.md` now says "Markdown only" — corpus law enforced by nothing.
- **`scripts/hermes/design-mirror-check.mjs` is permanently obsolete** on branch A — it diffs `design.md` against the retired `design.html`. It was **already failing before this work** (baseline-tested: mirror drift, 3 canonical tokens missing); the retirement changed its failure *mode* from a graceful error to an unhandled crash. Two test files assert on it: `scripts/hermes/receipt-prune.test.mjs` (1 fail) and `scripts/__tests__/verify-world-engine.test.mjs` (2 fails). **All three were red before this work and remain red.**
- **Both constitutions still call `design.html` a live mirror.** That is TRUE on `main` and FALSE after branch A merges. Deliberately not changed on branch B, because writing "retired" there would be a fictional claim until A lands. **This is a merge-ORDER dependency — tell me if I have it backwards.**
- **`adapters/knowledge.md`** — a Final-Decider ruling said retire it. I refused: §1's policy column is dead, but §5 is a live `world-engine-graph/v1` schema nothing else carries. Owner decision pending.
- **15 historical review docs** still carry generic tool-name headers (pre-date this work; the generator covers all future ones).

---

## 5. SPECIFIC ATTACK SURFACES

1. **The header fix touched three separate consult paths. Is there a fourth?** I grepped `scripts/` for static-header writes and found only `catalog-regen-local.mjs`, which writes a generated index (legitimately static). Did I miss a path — a different directory, a template, a cloud runner?
2. **Does the header change break anything downstream?** I grepped for parsers of the old strings and found none. But absence-of-parser is exactly the negative this session has been wrong about repeatedly.
3. **Is the retitling itself a doctrine risk?** Nine files had their H1 rewritten by a script. If anything indexed them by title (a catalog, a handoff, an index), those references now dangle.
4. **The mirror resync rewrote AGENTS.md's entire body.** I verified the adapter header survived and the body equals `CLAUDE.md`. What else could a whole-body rewrite have destroyed that a byte-equality check would not reveal?
5. **Merge order.** Branch B is 2 behind `main` (main moved). Branch A is much further behind. What is the correct merge sequence, and what breaks if done in the wrong order?
6. **Is leaving three known-red test surfaces acceptable at merge time?** They were red before this work — but "pre-existing" is a reason, not an absolution.
7. **The `SWAN_RULE_RENAME="67=67"` escape hatch** was used to land the mirror resync (rule 67 kept its number, changed its name). Was that the right hatch, or did it wave through something it should not have?

---

## 6. BRANCH A DIFF — new material since the last hostile review (`57360a699..28cdf5941`)
```diff
diff --git a/.claude/skills/swan-design-router/SKILL.md b/.claude/skills/swan-design-router/SKILL.md
index 63df4980b..c95d02225 100644
--- a/.claude/skills/swan-design-router/SKILL.md
+++ b/.claude/skills/swan-design-router/SKILL.md
@@ -261,7 +261,7 @@ hardcode `p.theme.colors.*` hex; CLAUDE.md Rule 46 + the shipped architecture wi
 |---|---|
 | `SWAN-CINEMATIC-DESIGN-SYSTEM.md` | Cinematic/public builds; deep palette + motion values |
 | `SWAN-ASSET-STORYBOARDING.md` | Any generated/commissioned media |
-| `docs/ai-workflow/design-brain/design.md` | The Crystalline Canon — **sole** source of truth (the `design.html` mirror was retired 2026-08-16; there is no second copy to reconcile) |
+| `docs/ai-workflow/design-brain/design.md` | The Crystalline Canon — **sole canonical copy** (the `design.html` mirror was retired 2026-08-16; no second file to reconcile). Still ADAPTS the two source-of-truth docs above — "sole" means one copy, not top of the precedence chain |
 | `design.md.pre-redo` / `SKILL.md.pre-redo` | Historical context only |
 
 **Precedence on conflict:** this skill > reference docs > existing components >
diff --git a/docs/ai-workflow/AI-HANDOFF/FABLE-REPAVE-FIXPLAN-RULING.md b/docs/ai-workflow/AI-HANDOFF/FABLE-REPAVE-FIXPLAN-RULING.md
index e08624388..03630e24d 100644
--- a/docs/ai-workflow/AI-HANDOFF/FABLE-REPAVE-FIXPLAN-RULING.md
+++ b/docs/ai-workflow/AI-HANDOFF/FABLE-REPAVE-FIXPLAN-RULING.md
@@ -1,4 +1,4 @@
-# SwanStudios Fable Final-Decider
+# SWAN BRAIN — repave fix plan + rot-spread audit — FINAL RULING by Fable 5
 
 **Reviewer:** OpenRouter `anthropic/claude-fable-5`
 **Document:** docs\ai-workflow\AI-HANDOFF\GLM-REPAVE-FIXPLAN-PACKET.md
diff --git a/docs/ai-workflow/AI-HANDOFF/GLM-53-REPAVE-FIXPLAN-REVIEW.md b/docs/ai-workflow/AI-HANDOFF/GLM-53-REPAVE-FIXPLAN-REVIEW.md
index 66ac806ad..822c6fe06 100644
--- a/docs/ai-workflow/AI-HANDOFF/GLM-53-REPAVE-FIXPLAN-REVIEW.md
+++ b/docs/ai-workflow/AI-HANDOFF/GLM-53-REPAVE-FIXPLAN-REVIEW.md
@@ -1,4 +1,4 @@
-# GLM Consult
+# SWAN BRAIN — repave fix plan + rot-spread audit — reviewed by GLM-5.3
 
 **Model:** glm-5.3
 **Document:** docs/ai-workflow/AI-HANDOFF/GLM-REPAVE-FIXPLAN-PACKET.md
diff --git a/docs/ai-workflow/AI-HANDOFF/GLM-53-S1-HOSTILE.md b/docs/ai-workflow/AI-HANDOFF/GLM-53-S1-HOSTILE.md
new file mode 100644
index 000000000..124525b20
--- /dev/null
+++ b/docs/ai-workflow/AI-HANDOFF/GLM-53-S1-HOSTILE.md
@@ -0,0 +1,40 @@
+# SWAN BRAIN — hostile review of the S1 "truth commits" — reviewed by GLM-5.3
+
+**Model:** glm-5.3
+**Document:** docs/ai-workflow/AI-HANDOFF/S1-HOSTILE-PACKET.md
+**Tokens:** 6630 in / 15947 out (reasoning: 12921) | total 22577
+**Wall:** 234.4s
+
+---
+
+## TABLE 1 — FINDINGS
+
+*Standing caveat on every row: I have the packet and the diff only — no repo access. Rows are graded on what the packet itself proves or fails to prove; per your own rule, an unprovable mechanism is flagged as such, not asserted.*
+
+| ID | severity | claim | evidence | proposed fix |
+|---|---|---|---|---|
+| F1 | HIGH | The correction's **REAL list is verified asymmetrically**. §2's "verified by execution" exhaustively covers the *negatives* (no `canon/`, no `pnpm-lock`, no `stylelint-config-swan`) but covers only ONE positive (`tokens.json` location). The design.md hunk asserts as REAL: `check-token-discipline.mjs` exists **and** its scope is "raw-hex only, not §9 scales"; `check-degalaxy.mjs` exists **and** is a "retired-palette ban"; the gate is "wired to pre-commit." None of those three claims appears in the executed-verification list. If any is wrong, the fix commits the original sin *inside the fix, under a "corrected 2026-08-16" imprimatur* — the most trusted sentence in the file. Not asserting wrong; asserting unproven-by-packet, which by this packet's own standard is a pre-merge gap. | design.md hunk "Enforcement — what actually exists" vs §2 bullet 1; registry row repeats "pre-commit" to operators | Run each script and record output in the handoff; trigger the pre-commit hook deliberately with a violation commit and paste the failure. Minutes of work; closes the exact class. |
+| F2 | HIGH | The **AGENTS.md half of the §18 deferral is unproven**. Every stated reason is CLAUDE-specific: divergence +14/−11, 70-behind, merge-revert risk. The packet is silent on whether `AGENTS.md` differs from `origin/main` — it wasn't edited, so it wasn't diffed. If AGENTS.md is clean, the rationale doesn't apply, and "widens CLAUDE/AGENTS divergence" is a drift-check warning about a *truth-correction* — the check being coarse, not a harm. These are the only 2 dead refs in the highest-loaded doctrine in the repo, and no gate instrument scans CLAUDE/AGENTS, so nothing will ever flag them again. | §3.2 in full; §2 last bullet (diffs cover only edited files + CLAUDE.md) | `git diff origin/main -- AGENTS.md`. If the §163 region is clean: fix it. Best form: a tiny branch **off origin/main** — the fix is causally independent of the retirement, so it never needed to live on this branch at all. For CLAUDE.md: handoff note with the exact edit ("§8/§18" → "§8"; §18 never existed in any revision) so the merge agent executes mechanically. |
+| F3 | MEDIUM | **Non-`.md` sweep still not done.** `.html/.json/.yaml/.ts/.tsx/.github/`, hooks — unswept. Your own ACTIVE-INDEX context (visible in the diff) notes GitHub Actions dead repo-wide since 2026-08-12, so no CI backstop exists; manual grep is the only instrument. | §4.2 admission; ACTIVE-INDEX.md hunk context (S0 handoff P1 line) | `git grep -n "design.html"` with no pathspec, plus variants (`design-html`, `_attic/2026-08`). One command. |
+| F4 | MEDIUM | **"Independently revertible" is false for the set, and unverified for commit 1.** You concede 2–4 couple, but commit 1's independence is unconfirmed: the range diff can't attribute hunks, and design.md's header now contains retirement text ("Mirror: none — retired 2026-08-16… moved to `docs/_attic/`"). If any of that landed in `67897b9f5`, commit 1 also lies transiently (says "retired" while the file still sits in the brain between commits 1 and 2) and is non-revertible alone. | §4.7; design.md header hunk vs commit table | `git show` each commit; confirm all retirement text lives in `1bfa48c9a`. Document revert order as 4→3→2, with 1 independent only if verified. |
+| F5 | MEDIUM | **Commit 4's existence is evidence the first outside-sweep was incomplete.** Commits 3 and 4 fix the same class of defect (outside-brain consumers of the retired file); the split implies the registry ref was found after commit 3 shipped "the outside refs fixed." Confidence in "no remaining `.md` refs" should be proportional to the final sweep's method — which the packet never states. | Commit table rows 3–4; no sweep-command or zero-output recorded anywhere in §2 | Record the exact final command and its zero-output (minus attic/historical hits) in the handoff. |
+| F6 | MEDIUM | **The blind-spot mechanism is source-read, not executed — but it has a second, packet-internal corroboration you missed:** the gate reported "28 files" *both before and after* retiring a file from a 29-file corpus (28 md + 1 html). If design.html were ever in the instrument's world, the count would have moved. It didn't — the file never existed as far as the gate's file-set was concerned, which is precisely your stated mechanism. The blind spot is also *still live*: "Markdown only" (index.md hunk) is now corpus law enforced by nothing; a future non-md file in the folder is invisible to all six classes. | §2 "Gate CLEAN (28 files · 75 refs · 0 defects)" vs §1 "28-file markdown corpus" + §6 (the html existed); §4.3 | Confirm the glob line by reading it aloud in the handoff (you did read it — say so). Then add a seventh class: enumerate the corpus directory (all extensions) and diff against `index.md`. Cheap, closes the class, and honors your own instrument-lesson. |
+| F7 | MEDIUM | **"Sole source of truth" overclaims.** The accurate claim is "sole *copy* — no mirror." But index.md's unchanged law says the brain "ADAPTS the two source-of-truth docs — it never contradicts them," and SKILL.md's precedence chain places the skill above reference docs. A future agent reading "design.md is the **sole** source of truth" (SKILL.md hunk, README hunk, index hunk, registry hunk) can reasonably conclude design.md outranks `SWAN-CINEMATIC-DESIGN-SYSTEM.md` — contradicting the corpus's layered-truth model. This is exactly the ambiguity class this workstream exists to kill. | SKILL.md/README/index/registry/`design.md` hunks vs index.md unchanged line "Everything here ADAPTS the two source-of-truth docs" | Reword to "sole canonical copy — the mirror was retired, there is no second file to reconcile" in the four touched files. |
+| F8 | MEDIUM | **The corrected enforcement list may undercount in the other direction.** You verified a 73-pass suite exists, yet "Enforcement — what actually exists" names four mechanisms and no tests. If any of the 73 enforce doctrine (token discipline? brain links?), the new list is incomplete by omission — and an unlisted real mechanism tells readers "nothing else handles this," the mirror image of the sin you just fixed. | design.md REAL bullet vs §2 "73 pass / 0 fail" | Inventory what the suite enforces; add it to the list or note explicitly that it's non-doctrinal. |
+| F9 | LOW | **Verification bullet under-describes its coverage.** "3 identical (edited)" against a range touching 7 edited files (+1 moved). The charitable reading: only the outside-the-brain candidates were diffed. As written it's ambiguous, and this packet's credibility rests on verification precision. | §2 final bullet vs §5 diff file list | State per-file main-diff status for all 8 touched paths. |
+| F10 | LOW | **Humans lost their only pointer.** README deleted "(a human can inspect visually…)" with no replacement; a stable frozen copy exists in the attic. | README §1 hunk; §6 | One clause: "Humans wanting a visual snapshot: `docs/_attic/2026-08-design-html/` (frozen, non-doctrinal)." |
+
+## TABLE 2 — THE TWO STOP DECISIONS
+
+| item | was stopping correct? | what I would do instead |
+|---|---|---|
+| `adapters/knowledge.md` refusal | **Yes — but incomplete.** The Decider ruled on your packet's own misdescription ("*entire* routing table's Policy column" = §1 ≈ 20% of the file). A ruling on false inputs is not a ruling; bouncing it was required, not insubordinate. The spec/fig-leaf distinction is **real, not a fig leaf**: §5.4's disclaimer positions §5 as normative (what a future implementation must satisfy) rather than descriptive (what an installed system does), and it cites live doctrine — unlike the tombstoned prose, which described installed machinery that never existed. But it is **undecidable from text alone**: this corpus has produced confident fiction before, and only the owner knows whether the graph is planned or dead. Which is exactly why refusing beats obeying — and also beats *preserving silently*. Refusal that generates no re-decision is a veto, and keep-by-default is itself an owner decision you made unilaterally. | Refuse **and re-submit** with the corrected description and three options: (a) retire whole file; (b) rewrite §1's Policy column with tombstone-notes, keep §5; (c) keep as-is with a warning header. One owner question: "Is the world-engine graph planned or dead?" Its D6 exposure stays tracked in the baseline meanwhile — not silent. |
+| `CLAUDE.md`/`AGENTS.md` §18 | **Split.** CLAUDE.md: **yes** — diverged +14/−11 on a branch 70 behind; touching it buys a conflict hunk in a constitution file for a one-token gain, and this repo's demonstrated failure mode is bad conflict resolution, not missing edits. AGENTS.md: **not established** — the packet never diffed it, and its only stated reason (divergence) is CLAUDE-specific. "Widens CLAUDE/AGENTS drift" is dressing: converging *toward truth* is not the drift anyone fears. The dynamic that produced the original rot is not deferral per se — it's **deferral without a tracking artifact**. Here there is no artifact. | (1) Diff AGENTS.md vs main; if the region is clean, fix it. (2) Recognize the fix is causally independent of this branch — a two-file, two-line branch off `origin/main` carries zero merge risk to either branch. (3) For CLAUDE.md, a handoff line with the exact edit, so the merge agent executes rather than re-decides. Total cost: minutes. The branch-hygiene instinct was right; letting it convert "not here" into "not now" was the failure. |
+
+## PROSE — WHERE THE WORK IS RIGHT, AND THE ONE META-POINT
+
+The core correction is right and important. Replacing a 9/10-fictional enforcement list with verified reality plus an explicit DOES-NOT-EXIST roster inverts the failure mode: the old line said "handled" about nothing; the new line says "not handled, do not cite" about nothing. The principle you wrote — *a cited-but-absent mechanism is worse than no mechanism, because it tells every reader "this is handled" and stops them building it* — is the best sentence in the diff and should survive into the corpus's general doctrine. The D6-baseline disproof (empty it in place, watch 19 violations surface) and the controlled blind-spot experiment (move file, leave row, observe CLEAN) are exactly the adversarial self-testing this workstream's history demands, and I found no fabrication in the four commits' factual claims about the past — only the unproven claims about the present (F1) and the "sole" overreach (F7).
+
+On the remaining surfaces: retiring `design.html` was correct for this corpus specifically, because its pathology is silent wrongness — a mirror that mis-answers `§N` citations fails *quietly*, while a missing visual reference fails *loudly* (a human notices there's nothing to look at). The anti-patterns rewrite is not dead weight: a ban on re-creating the thing you just cleaned up, with the correct alternative encoded ("generated, never hand-kept"), is the most live rule in that file. Commit 4 was required completeness, not scope creep — its *sequencing* is the tell (F5). And the §16 restraint was right: you flagged that canon's own change protocol depends on the missing apparatus — "unchangeable by its own law, or the law is decorative" — and declined to perform unilateral surgery on a frozen file's governance. Putting that flag *inside* the file is mildly self-authorizing, but co-locating the warning with the lie it flags is better than a satellite file nobody loads; I'd keep it.
+
+The meta-point: your governing lesson — *a count is a property of the instrument* — applies to your own §2. The verification section proves the negatives by execution and asserts the positives in prose. That asymmetry is F1, and it is the only thing standing between this branch and "merge modulo F2/F3." Close it, and this is the rare correction commit that survives the hostility it invites.
diff --git a/docs/ai-workflow/AI-HANDOFF/GLM-REPAVE-FIXPLAN-PACKET.md b/docs/ai-workflow/AI-HANDOFF/GLM-REPAVE-FIXPLAN-PACKET.md
index adb5786ca..9b393fab2 100644
--- a/docs/ai-workflow/AI-HANDOFF/GLM-REPAVE-FIXPLAN-PACKET.md
+++ b/docs/ai-workflow/AI-HANDOFF/GLM-REPAVE-FIXPLAN-PACKET.md
@@ -1,4 +1,4 @@
-# HOSTILE REVIEW PACKET — DESIGN BRAIN REPAVE: THE FIX PLAN, AND THE SPREAD
+# SWAN BRAIN (Design Brain) — repave fix plan + "is this rot spreading?" — hostile review packet
 
 - **Target branch:** `claude/design-brain-repave-20260816` @ `6798ae029` (17 commits, pushed, NOT merged)
 - **Corpus:** `docs/ai-workflow/design-brain/` — 28 markdown files, the doctrine every AI agent loads before building UI
diff --git a/docs/ai-workflow/AI-HANDOFF/HY3-REPAVE-FIXPLAN-REVIEW.md b/docs/ai-workflow/AI-HANDOFF/HY3-REPAVE-FIXPLAN-REVIEW.md
index 02f37a4c3..82cb856b5 100644
--- a/docs/ai-workflow/AI-HANDOFF/HY3-REPAVE-FIXPLAN-REVIEW.md
+++ b/docs/ai-workflow/AI-HANDOFF/HY3-REPAVE-FIXPLAN-REVIEW.md
@@ -1,4 +1,4 @@
-# Tencent Hy3 - Design Inspiration
+# SWAN BRAIN — repave fix plan + rot-spread audit — reviewed by HY3
 
 **Reviewer:** `tencent/hy3` (medium)
 **Document:** docs/ai-workflow/AI-HANDOFF/GLM-REPAVE-FIXPLAN-PACKET.md
diff --git a/docs/ai-workflow/AI-HANDOFF/KIMI-REPAVE-FIXPLAN-REVIEW.md b/docs/ai-workflow/AI-HANDOFF/KIMI-REPAVE-FIXPLAN-REVIEW.md
index c47cdaa7a..64f815b86 100644
--- a/docs/ai-workflow/AI-HANDOFF/KIMI-REPAVE-FIXPLAN-REVIEW.md
+++ b/docs/ai-workflow/AI-HANDOFF/KIMI-REPAVE-FIXPLAN-REVIEW.md
@@ -1,4 +1,4 @@
-# SwanStudios Kimi K3 Design Review
+# SWAN BRAIN — repave fix plan + rot-spread audit — reviewed by Kimi K3
 
 **Reviewer:** OpenRouter `moonshotai/kimi-k3` (effort: medium)
 **Document:** docs\ai-workflow\AI-HANDOFF\GLM-REPAVE-FIXPLAN-PACKET.md
diff --git a/docs/ai-workflow/AI-HANDOFF/KIMI-S1-HOSTILE.md b/docs/ai-workflow/AI-HANDOFF/KIMI-S1-HOSTILE.md
new file mode 100644
index 000000000..71e831af0
--- /dev/null
+++ b/docs/ai-workflow/AI-HANDOFF/KIMI-S1-HOSTILE.md
@@ -0,0 +1,43 @@
+# SWAN BRAIN — hostile review of the S1 "truth commits" — reviewed by Kimi K3
+
+**Reviewer:** OpenRouter `moonshotai/kimi-k3` (effort: medium)
+**Document:** docs\ai-workflow\AI-HANDOFF\S1-HOSTILE-PACKET.md
+**Seed:** (none)
+**Tokens:** 7003 in / 2844 out · **Cost:** ~$0.0637 · **Wall:** 75.3s · **finish_reason:** stop
+
+---
+
+## Findings
+
+| ID | severity | claim | evidence (diff hunk / file:line) | proposed fix |
+|---|---|---|---|---|
+| F1 | HIGH | Gate blind spot to non-`.md` files is real and now load-bearing: after retiring `design.html`, `index.md`'s live row for it reported CLEAN. The diff itself removes the `design.html` row from `index.md` (`index.md` hunk, `- \| design.html \| …` deleted) — but the author states the gate saw it as clean *before* that fix, proving D2/D3 cannot see the corpus's only `.html` file. The Decider's "retirement self-audits" rationale is disproven; the author correctly disproved it but the gate is **still blind** after these four commits. | `index.md` hunk removing the `design.html` row; packet §2 "gate reported CLEAN… all six classes walk only `*.md`" | Add a non-md sweep to `check-brain-links.mjs` (at minimum: any file present on disk but absent from `index.md` and vice versa, regardless of extension). One D7 class or extend D2/D3 to all files. |
+| F2 | MEDIUM | Attack surface 2 stands: the consumer sweep was `*.md`-only. `.html`, `.json`, `.yaml`, `.ts/.tsx`, `.github/`, hooks were never swept for `design.html` references. If any code/config references the old path, it now 404s silently. **HYPOTHESIS** that such a consumer exists — but the sweep gap is a fact, and it is the same class of miss the whole workstream exists to catch. | Packet §4 attack surface 2 (author's own admission); no diff evidence either way | Run one grep for `design.html` across all tracked files (`git grep -n design.html $(git rev-list --all)` scoped to HEAD, all extensions). If zero hits, close the gap in the commit message. |
+| F3 | MEDIUM | "Independently revertible" is not true for commits 2–4. Reverting `1bfa48c9a` alone restores `design.html` to the brain while `dfcdc07d6` and `57360a699` still assert "retired 2026-08-16, no mirror exists" in `SKILL.md`, `ACTIVE-INDEX.md`, and the REGISTRY — instant doctrine contradiction. | `SKILL.md` hunk: "the `design.html` mirror was retired 2026-08-16; there is no second copy"; REGISTRY hunk: same claim | Stop claiming per-commit revertibility for 2–4; document that they revert as a unit (2+3+4 together, or none). Fix in commit messages/PR body, not the files. |
+| F4 | LOW | The new `anti-patterns.md` ban is *mostly* live (it bans re-creating a mirror — a forward-looking ban, which is legitimate), but its rationale text is now the only place several files repeat the full retirement story. The ban is fine; the worry in attack surface 5 is overstated. However the row's "Why" duplicates narrative that lives in `design.md`'s header and README — three copies of the same history, each a future drift candidate. | `anti-patterns.md` hunk: "Re-creating a second 'visual mirror' of canon… retired 2026-08-16. A hand-maintained mirror becomes a liar…" vs. `design.md` header hunk and `README.md` hunk carrying the same story | Keep the ban row to one sentence ("never hand-maintain a second visual mirror; generate it from `design.md`") and link the history, don't re-tell it. LOW because it's maintenance hygiene, not wrongness. |
+| F5 | LOW | Scope question (attack surface 6) resolves fine — commit 4 editing the REGISTRY is required completeness, not creep. The REGISTRY asserted "update together" as a live T1 obligation; leaving it would have left a known-false law in a Tier-1 doc. **No defect here.** | `SWANSTUDIOS-AI-SKILL-AND-OPERATOR-REGISTRY.md` hunk | None. Correctly done. |
+| F6 | LOW | The `design.md` correction block (attack surface 1) appears internally consistent with the packet's executed verification (no `canon/`, no pnpm, tokens.json at `scripts/design-brain/config/`). I cannot independently execute, so per my own rules: the *diff text* is self-consistent and the *verification claims* are labeled as executed in-session; I mark the underlying truth **HYPOTHESIS-unverifiable-from-here** but find no internal contradiction. One soft spot: the block claims `check-token-discipline.mjs` does "raw-hex discipline only — it does not check the radius/spacing scales in §9" — if that characterization is wrong, it's a fictional-mechanism claim inside the fix. Worth one `node --check`-style confirmation run. | `design.md` hunk: "REAL: `scripts/ci/check-token-discipline.mjs` (raw-hex discipline only…)" | Re-run each named script once and paste output into the PR body; the workstream's own lesson says proof scoped to assumed inputs isn't proof. |
+| F7 | LOW | The §16-unfollowable flag is honest and correctly scoped as "flagged, not fixed." But it leaves canon in a state where its own header simultaneously says "CRYSTALLIZED — frozen; change only via §16 thaw" and "§16 is unfollowable" — every future agent edit to `design.md` will hit that paradox and have to re-derive the author's "truth-corrections don't need a thaw" argument. That argument is sound but lives in a blockquote, not in §16 itself. | `design.md` hunk: the ⚠ §16 blockquote | Acceptable for now; ensure Sean's §16 decision is tracked as an open item somewhere load-bearing (ACTIVE-INDEX or an issue), not only in this blockquote. |
+
+## Stop decisions
+
+| item | was stopping correct? | what you would do instead |
+|---|---|---|
+| 3.1 Refusing to retire `adapters/knowledge.md` | **Yes — correct, and this is exactly the behavior the workstream's lesson demands.** The Decider ruled from the packet's *description* of the file; the author checked the actual file before deleting. §5 is a schema with self-aware non-authorization language ("does not authorize Graphify installation, a vault scan…") — that is a spec, not a ghost, and the distinction is real, not a fig leaf: a ghost *claims* machinery exists; §5.4 explicitly disclaims it. Destroying a live, uniquely-held schema on a secondhand description would be the precise failure mode (count = property of the instrument) this workstream exists to kill. Caveat: the Decider's factual premise ("entire routing table points at atticked files") was only ~20% true, so the ruling was made on bad input and should be re-run with the corrected description, not just refused. | Exactly what was done, plus one thing: send the Decider back the corrected file description (§1 ~20% stale, §5 live schema citing live files) and get a re-ruling on the record. If the re-ruling says retire §1 only, do that. The refusal protects §5; it shouldn't silently preserve §1's dead pointers either — §1's policy column pointing at tombstoned docs is still a D6-shaped wound. |
+| 3.2 Deferring the `§18`→`§8` fix in `CLAUDE.md`/`AGENTS.md` | **Partially correct — the branch-hygiene reasoning is sound, the completeness reasoning is not.** Being 70 commits behind main with `CLAUDE.md` already +14/−11 diverged makes editing it here genuinely risky: a merge could revert live constitution work. That part is engineering, not excuse. But the fix did not need to touch `CLAUDE.md` *on this branch*: the dead refs sit in the two files every agent loads first, and the workstream's own origin story is "defer the cheap fix" → months of invisible rot. The author has now *documented* the rot in a packet on an unmerged branch — which is where rot documentation goes to die. | (a) File the fix as a tracked item against **main**, not this branch — a one-line commit directly on main or a fast-track PR: `§18` → `§8`, both files, with the drift-check run after. (b) Do *not* fix it on this 70-behind branch — that judgment is right. (c) Add the pair to ACTIVE-INDEX.md's known-defects list *in this diff* so the deferral has a receipt in a file agents actually read. Deferral with a receipt is caution; deferral recorded only in a review packet is avoidance. Currently it's the latter. |
+
+## Prose
+
+**Attack surface 4 — the design question you actually asked me about.** Retiring `design.html` was correct, and I'll defend it on design grounds, not just hygiene grounds.
+
+A drifting visual reference for a *design system* is not worse than no reference — it is much worse, and worse in a specifically design-flavored way. A wrong textual claim gets argued with; a wrong *visual* gets *copied*. Nobody cites `design.html §3` and lands on wrong doctrine just by reading — they land on it by *looking at a swatch and using the color*. The artifact's failure mode was silent visual adoption: an agent or human opens it, sees a plausible polished page, and lifts a token, a type scale, a spacing rhythm that contradicts canon — and because it *looked authoritative* (self-contained, 1,340 lines, nicely rendered), it out-ranks the prose it contradicts in exactly the moment of use. Its independent section numbering with a §7→§12 gap means it wasn't even drifting toward canon; it had speciated. For a design corpus, a speciated visual mirror is an active competitor to canon wearing canon's clothes. Delete it. The author is right that "one file, one truth" beats "two files, one of which lies beautifully."
+
+What the corpus loses, concretely: (1) **pre-attentive token comprehension** — a human verifies a swatch contrast in 200ms; parsing `--color-arctic-cyan: #…` in a markdown table is slower and error-prone for exactly the properties (hue relationships, elevation depth, glow falloff) that are spatial, not lexical; (2) **type specimen verification** — you cannot judge whether the §4 scale *feels* right from a ratio table; (3) **the human onboarding ramp** — README now describes a system no human can *see* without building something.
+
+The replacement constraint the author wrote into `anti-patterns.md` is the right one and should be treated as law: **the visual reference must be generated from `design.md` by a named, real script, or not exist.** Hand-kept mirrors re-speciate; that's not a discipline failure, it's the entropy of two artifacts. The minimal viable replacement is unglamorous: a ~200-line build script that parses the token tables out of `design.md` and emits swatch/specimen HTML in CI, checked in or artifact-published, with a header "GENERATED — do not edit." If nobody builds it, no visual reference is the correct steady state — absence is honest; a mirror is a claim.
+
+**Attack surface 5 — the anti-patterns rewrite.** Not dead weight. The old ban ("updating design.html without design.md") would be dead weight; the new ban ("re-creating a second visual mirror") is a *forward-looking* ban on the recurrence of the exact failure just amputated — that is what a bans file is for. A bans file that only bans currently-possible sins is a changelog. My only complaint is F4: the row re-tells the retirement history a third time. Live ban, trimmed rationale, linked history.
+
+**Where the work is plainly right:** the nine-fictional-mechanisms correction is the highest-value change in the diff and its reasoning ("a cited-but-absent mechanism tells every reader 'this is handled'") is the correct doctrine; the empirically-executed disproof of the Decider's two rationales (gate self-auditing, D6-baseline-to-zero) is the review process working as intended; the §16 flag-not-fix is the right restraint; commit 4 is completeness, not creep; and the refusal on `knowledge.md` is the single best judgment call in the packet.
+
+**The one thing that should not survive this review unchanged:** the gate itself. These four commits fix four symptoms of a gate that cannot see the file type this whole saga was about. F1 is the only HIGH I found, and it's the one that will re-bite.
diff --git a/docs/ai-workflow/AI-HANDOFF/REPAVE-FOUR-REVIEW-SYNTHESIS-2026-08-16.md b/docs/ai-workflow/AI-HANDOFF/REPAVE-FOUR-REVIEW-SYNTHESIS-2026-08-16.md
index 28d6929e0..d9f799f36 100644
--- a/docs/ai-workflow/AI-HANDOFF/REPAVE-FOUR-REVIEW-SYNTHESIS-2026-08-16.md
+++ b/docs/ai-workflow/AI-HANDOFF/REPAVE-FOUR-REVIEW-SYNTHESIS-2026-08-16.md
@@ -1,4 +1,4 @@
-# THE FOUR OWED REVIEWS — SYNTHESIS AND LOCKED PLAN
+# SWAN BRAIN — the four owed reviews: synthesis and locked plan
 
 - **Date:** 2026-08-16 · **Author:** Claude Opus 5 (vs-claude)
 - **Branch:** `claude/design-brain-repave-20260816` @ `6798ae029` — nothing merged, nothing deploy-linked
diff --git a/docs/ai-workflow/AI-HANDOFF/S1-HOSTILE-PACKET.md b/docs/ai-workflow/AI-HANDOFF/S1-HOSTILE-PACKET.md
new file mode 100644
index 000000000..2ec9edc8b
--- /dev/null
+++ b/docs/ai-workflow/AI-HANDOFF/S1-HOSTILE-PACKET.md
@@ -0,0 +1,243 @@
+# SWAN BRAIN (Design Brain) — the S1 "truth commits" — hostile review packet
+
+- **Branch:** `claude/design-brain-repave-20260816` @ `57360a699` (4 commits, pushed, NOT merged, nothing deploy-linked)
+- **Range under review:** `b258a75dc..57360a699` · **Date:** 2026-08-16
+- **Author of the work AND of this packet:** Claude Opus 5. Assume I am the least reliable narrator here.
+
+---
+
+## 0. YOUR REMIT
+
+Attack this diff. Two questions, in priority order:
+
+1. **What did I break, miss, or get wrong in these four commits?**
+2. **Two items I deliberately did NOT do — was stopping correct, or am I dressing up avoidance as caution?**
+
+### Output format — TABLES FIRST, PROSE LAST (hard requirement)
+
+Prior reviews in this workstream truncated at the token cap with most of the budget spent on reasoning. So:
+
+1. Findings table: `ID | severity | claim | evidence (file:line or diff hunk) | proposed fix`.
+2. Second table on the two stop decisions: `item | was stopping correct? | what you would do instead`.
+3. Prose only after both tables.
+
+Severity: **CRITICAL** (ships a wrong build / destroys doctrine) · **HIGH** (silent doctrine loss) · **MEDIUM** · **LOW**.
+
+**Cite the diff.** A finding without a hunk or file:line is a hypothesis — label it one.
+**If you cannot verify a mechanism, say so** rather than asserting it exists. That failure mode has bitten this workstream repeatedly, including from reviewers.
+**Say plainly where the work is right.** Do not manufacture findings to fill a quota.
+
+---
+
+## 1. CONTEXT — WHAT THIS CORPUS IS AND WHAT WENT WRONG BEFORE
+
+`docs/ai-workflow/design-brain/` is a 28-file markdown doctrine corpus every AI agent loads before building UI. A canon rewrite once renumbered `design.md` from 28 sections down to 17 and **no satellite file followed**. Nothing errored — an agent that follows a dead pointer resolves it *safely*, by silently skipping the doctrine it cannot find. 34 structural defects accumulated invisibly.
+
+A six-class gate now blocks that at commit time (`scripts/design-brain/check-brain-links.mjs`, `npm run brain:links`, wired to pre-commit):
+
+- **D1 DANGLING** — `<file>.md §N` where N doesn't exist in that file
+- **D2 UNINDEXED** — a file present but absent from `index.md`, whose own law is "every file in this folder is listed here"
+- **D3 ORPHANED** — an `index.md` row for a file not on disk
+- **D4 IMPOSSIBLE** — a bare `§N` that resolves under no reading
+- **D5 PHANTOM** — a citation of a file that exists nowhere in the repo
+- **D6 ATTICKED** — a citation of doctrine that now lives only in `docs/_attic/`
+
+**The governing lesson of this workstream, established the hard way:** *a count is a property of the instrument, not of the world*, and *proof scoped to the inputs you had in mind is not proof*. Four separate defects shipped because a test used the same example the author developed against.
+
+---
+
+## 2. WHAT THE FOUR COMMITS DID
+
+| SHA | What |
+|---|---|
+| `67897b9f5` | `design.md`'s "Enforcement files" line named **ten** mechanisms; **nine do not exist**. Replaced with real enforcement + an explicit DOES-NOT-EXIST list. Also added a flag that §16 (the thaw protocol) is unfollowable. |
+| `1bfa48c9a` | Retired `design.html` → `docs/_attic/2026-08-design-html/`, fixed 8 consumer refs inside the brain. |
+| `dfcdc07d6` | Fixed 2 refs **outside** the brain that the retirement orphaned: `swan-design-router/SKILL.md`, `ACTIVE-INDEX.md`. |
+| `57360a699` | Fixed a 3rd outside ref: `SWANSTUDIOS-AI-SKILL-AND-OPERATOR-REGISTRY.md`. |
+
+### What I verified by execution this session (not asserted)
+
+- No `canon/` directory exists anywhere in the repo; no `canon:*` npm scripts; no `pnpm-lock.yaml`; `stylelint-config-swan` not installed. `tokens.json` exists but at `scripts/design-brain/config/`, **not** `canon/`.
+- **Gate blind spot, found empirically:** after moving `design.html`, `index.md` still carried a live row for it and the gate reported **CLEAN**. All six classes walk only `*.md`, so the corpus's single `.html` file is invisible to every one of them. This disproves the Final Decider's stated rationale that "atticking makes any surviving consumer a D6 defect the gate now catches — the retirement self-audits."
+- **D6 baseline claim disproven:** the Final Decider said retiring `adapters/knowledge.md` would "empty the D6 baseline to zero." I emptied the baseline in place and re-ran: **19 violations** appear, from the other four baselined files.
+- Gate CLEAN (28 files · 75 refs · 0 defects) and suite **73 pass / 0 fail** after every commit.
+- Every edited file diffed against `origin/main` before editing: 3 identical (edited), `CLAUDE.md` differs +14/−11 (left alone).
+
+---
+
+## 3. THE TWO THINGS I STOPPED ON — ATTACK THESE HARDEST
+
+### 3.1 `adapters/knowledge.md` — I refused a Final Decider ruling
+
+The Decider ruled **retire**, based on my own packet's description: *"its entire routing table's Policy column points at four atticked files."* Before deleting, I opened the file. §1's policy column does point at atticked docs — but **§1 is roughly 20% of a 95-line file, and §5 is a live `world-engine-graph/v1` schema**: 7 entity types with stable ID shapes, 6 named edges with direction and validation rules, quarantine-rejection rules, a verification checklist. Authored 2026-07-12, citing **live** files (`worlds.md`, `techniques.md`, `psychology.md`, `experience-mode.md`). Nothing else in the corpus carries it.
+
+Relevant context: `obsidian/index.md` and `graphify/index.md` are now 6-line **TOMBSTONES** reading *"This described a system that never existed on disk… Do not resurrect this prose"* (owner-approved 2026-07-20). So the policies §1 points at were retired as describing a system that never existed.
+
+**Question:** was refusing correct? Or is §5 *also* fiction — a meticulous schema for a graph nobody ever installed — in which case I preserved a more sophisticated ghost and should have retired the whole file? Note §5.4 says defining the schema "does not authorize Graphify installation, a vault scan, a factory run, or any direct Hermes write," which reads as self-aware spec rather than a claim of existing machinery. Is that distinction real or a fig leaf?
+
+### 3.2 The constitution `§18` fix — I did not do it
+
+`CLAUDE.md:157` and `AGENTS.md:163` both cite `cinematic-pages.md §8/§18`. Max is §17; **§18 has never existed in any revision**. `§8` is correct. These are the only 2 real dead refs in live doctrine outside the brain, sitting in the files every agent loads first. The Decider ruled **fix now**.
+
+I did not, because: `CLAUDE.md` differs from `origin/main` (+14/−11) and this branch is **70 commits behind main**, so editing it here risks reverting live constitution work at merge; and editing `AGENTS.md` alone would widen a CLAUDE/AGENTS divergence that a drift-check already warns about.
+
+**Question:** is that sound engineering, or an excuse? A one-character fix deferred for branch hygiene is still a deferred fix, and "defer the cheap fix" is precisely the dynamic that let the original rot persist for months. What would you have done instead?
+
+---
+
+## 4. SPECIFIC ATTACK SURFACES
+
+1. **Did I introduce new fictional mechanisms in my own correction text?** `67897b9f5` adds a long prose block asserting what exists and what does not. If any of *those* claims is wrong, I have committed the exact sin I was fixing, inside the fix.
+2. **Did I miss a `design.html` consumer?** I swept `*.md` repo-wide. I did **not** sweep `.html`, `.json`, `.yaml`, `.ts/.tsx`, `.github/`, or git hooks for references to it.
+3. **Is the "gate blind to non-`.md`" finding actually right,** or did the CLEAN have a different cause I misattributed? I inferred the mechanism from source reading plus one observation — the same reading-not-executing pattern I criticize elsewhere in this packet.
+4. **Is retiring `design.html` correct at all?** It was the only human-visual reference to the design system. Its replacement is nothing. For a *design* corpus, is a drifting visual reference worse than no visual reference?
+5. **The `anti-patterns.md` rewrite** replaced a ban on "updating design.html without design.md" with a ban on "re-creating a second visual mirror." Did I convert a live rule into a rule about a thing that no longer exists — dead weight in a file whose job is live bans?
+6. **Scope discipline:** commit 4 edits a *reference doc* outside the design brain. Scope creep, or required completeness?
+7. **Reversibility:** each commit claims to be independently revertible. Is that actually true, given commits 2–4 are all consequences of the same retirement? Reverting 2 alone would restore the file while leaving 3 and 4's "it was retired" text in place.
+
+---
+
+## 5. THE COMPLETE DIFF (`b258a75dc..57360a699`, markdown, rename-detected)
+```diff
+diff --git a/.claude/skills/swan-design-router/SKILL.md b/.claude/skills/swan-design-router/SKILL.md
+index e853621bb..63df4980b 100644
+--- a/.claude/skills/swan-design-router/SKILL.md
++++ b/.claude/skills/swan-design-router/SKILL.md
+@@ -261,7 +261,7 @@ hardcode `p.theme.colors.*` hex; CLAUDE.md Rule 46 + the shipped architecture wi
+ |---|---|
+ | `SWAN-CINEMATIC-DESIGN-SYSTEM.md` | Cinematic/public builds; deep palette + motion values |
+ | `SWAN-ASSET-STORYBOARDING.md` | Any generated/commissioned media |
+-| `docs/ai-workflow/design-brain/design.md` | The Crystalline Canon (design.md wins over design.html) |
++| `docs/ai-workflow/design-brain/design.md` | The Crystalline Canon — **sole** source of truth (the `design.html` mirror was retired 2026-08-16; there is no second copy to reconcile) |
+ | `design.md.pre-redo` / `SKILL.md.pre-redo` | Historical context only |
+ 
+ **Precedence on conflict:** this skill > reference docs > existing components >
+diff --git a/ACTIVE-INDEX.md b/ACTIVE-INDEX.md
+index da6824052..34dd688b9 100644
+--- a/ACTIVE-INDEX.md
++++ b/ACTIVE-INDEX.md
+@@ -23,7 +23,7 @@
+ - **`docs/ai-workflow/references/FABLE-CONTEXT-COMPRESSION-PROTOCOL.md`** - cost-control rule for Fable token economy: semantic compression, query-first reads, image-context estimator, and proxy safety gates
+ - **Startup router rule:** fresh AI sessions read `AGENTS.md`/`CLAUDE.md`, then this index; keep bulky protocol details linked here instead of copied into startup context.
+ - **`docs/ai-workflow/hermes-agentic-os/index.md`** - Hermes Agentic OS map: approval gates, receipts, kill switches, channels, command center
+-- **`docs/ai-workflow/design-brain/index.md`** - Design Brain map: design.md (canonical) + design.html mirror, adapters, archetypes, QA gates
++- **`docs/ai-workflow/design-brain/index.md`** - Design Brain map: design.md (canonical, sole — the design.html mirror was retired 2026-08-16), adapters, archetypes, QA gates
+ - **`docs/ai-workflow/references/LENS-ADD-A-STYLE.md`** - the 30-minute five-entry recipe for adding Style Lens #N (proven: aurora-console #26 shipped through it with zero count-literal edits); pairs with `LENS-PORTABILITY-CONTRACT.md` (taking the v2 engine to a new host)
+ - **`docs/ai-workflow/AI-HANDOFF/S0-CONSULT-LANE-HANDOFF-2026-08-14.md`** — **START HERE for consult-lane / receipts / model-review work.** S0 is merged (`5b2aa5030`, PR #42): every paid model call now leaves an auditable receipt, and a call that returns nothing is recorded as a failure rather than as `ok`. Carries the mandated hostile review of that work through **both Kimi K3 and HY3** (exact commands, verified dry-run), model calibration showing HY3 at ~40× better cost-per-usable-review, and a **P1: GitHub Actions has been dead repo-wide since 2026-08-12** (100/100 startup_failure) so every merge to main is currently ungated.
+ - **`docs/ai-workflow/AI-HANDOFF/SWAN-CONTINUATION-HANDOFF-2026-08-14.md`** — **START HERE for Swan Brain / Forge / taste-curation work.** What is live (Swan Forge, 16 modules, capability truths already paid for — seed and i2i both probed dead, do not re-test), what Sean owes (blind A/B ruling — the file lives ONLY in the primary checkout, `.ai-workflow/` is gitignored), the reviewed 7-slice taste-curation plan (**start at Slice 0**, the contract), how to work alongside parallel agents, and the failure modes that cost this workstream real time. Supersedes `SWAN-MASTER-HANDOFF-2026-08-13.md`
+diff --git a/docs/ai-workflow/design-brain/README.md b/docs/ai-workflow/design-brain/README.md
+index 10d0b0961..3321171bf 100644
+--- a/docs/ai-workflow/design-brain/README.md
++++ b/docs/ai-workflow/design-brain/README.md
+@@ -8,7 +8,7 @@
+ 
+ ## 1. What this is
+ 
+-The Design Brain is the **callable form** of the Swan visual operating system. It does not replace the design system — it ADAPTS `docs/ai-workflow/references/SWAN-CINEMATIC-DESIGN-SYSTEM.md` and `docs/ai-workflow/references/SWAN-ASSET-STORYBOARDING.md` into a folder an agent can read in minutes before a UI slice, and a human can inspect visually (`design.html`).
++The Design Brain is the **callable form** of the Swan visual operating system. It does not replace the design system — it ADAPTS `docs/ai-workflow/references/SWAN-CINEMATIC-DESIGN-SYSTEM.md` and `docs/ai-workflow/references/SWAN-ASSET-STORYBOARDING.md` into a folder an agent can read in minutes before a UI slice.
+ 
+ It exists to make four brains draw the same picture: same tokens, same patterns, same bans, same QA gates — whether the surface is a landing page, a SaaS dashboard, a client portal, a cinematic brand page, or a Sean-only Hermes operator tool.
+ 
+@@ -27,7 +27,7 @@ It exists to make four brains draw the same picture: same tokens, same patterns,
+ 
+ Every agent that builds or reviews UI agrees to this:
+ 
+-1. **`design.md` is canonical.** `design.html` mirrors it visually for humans. **If they disagree, `design.md` wins** — and whoever notices updates both together in the same pass.
++1. **`design.md` is canonical, and now sole.** The `design.html` visual mirror was **retired to `docs/_attic/2026-08-design-html/` on 2026-08-16** — it had drifted into its own section numbering, so citations into it landed on the wrong doctrine. There is no mirror to keep in sync any more; one file, one truth.
+ 2. **Before any frontend work, read `design.md`.** Not from memory — from disk. Tokens drift; memory drifts faster.
+ 3. **Reuse documented tokens and components.** If a token or pattern you need exists in `design.md`/`components.md`, use it. Do not fork a near-duplicate.
+ 4. **Propose — never invent — new tokens.** A new color, spacing step, or radius is a proposal to Sean (and a paired update to `SWAN-CINEMATIC-DESIGN-SYSTEM.md` §B + CLAUDE.md Active Palette per that doc's §G maintenance rules). It is never a hardcoded hex in a component.
+diff --git a/docs/ai-workflow/design-brain/anti-patterns.md b/docs/ai-workflow/design-brain/anti-patterns.md
+index 3ae2865e2..d67904e1f 100644
+--- a/docs/ai-workflow/design-brain/anti-patterns.md
++++ b/docs/ai-workflow/design-brain/anti-patterns.md
+@@ -68,7 +68,7 @@
+ | Ban | Why |
+ |---|---|
+ | **Inventing new tokens/components inside a slice** | New tokens are PROPOSALS to Sean (design.md §1); silent invention = drift |
+-| **Updating design.html without design.md (or vice versa)** | They ship together; divergence makes the mirror a liar (README enforcement contract) |
++| **Re-creating a second "visual mirror" of canon** | The old `design.html` mirror drifted into its own section numbering and was retired 2026-08-16. A hand-maintained mirror becomes a liar the first time someone edits one side. If a visual reference is wanted again, it must be **generated** from `design.md`, never hand-kept |
+ | **Skipping the mounted-surface receipt before a UI fix** | Rule 26 — you may be styling a dormant component |
+ | **"Looks good" as a QA verdict** | qa-gates.md verdicts are binary gates with receipts, not vibes (rule 19) |
+ 
+diff --git a/docs/ai-workflow/design-brain/design.md b/docs/ai-workflow/design-brain/design.md
+index 5c572b682..d44ab40c7 100644
+--- a/docs/ai-workflow/design-brain/design.md
++++ b/docs/ai-workflow/design-brain/design.md
+@@ -1,8 +1,8 @@
+ > **Crystalline Canon — adopted 2026-07-19 (Sean-confirmed)** from KIMI-DESIGN-BRAIN-ENHANCED,
+ > the decisive rewrite of the prior Design Brain (killed the hedged "OR" laws; added z/duration/
+ > density scales + a `canon:contrast` CI trigger + the SOLID/LIQUID canon lifecycle). Prior version
+-> preserved at `design.md.pre-redo`. This canon is the source of truth; `design.html` mirrors it and
+-> loses on any conflict. The 6 builder-validated refinements (reduced-motion-in-JS, the fail-closed
++> preserved at `design.md.pre-redo`. This canon is the sole source of truth (the former `design.html`
++> mirror was retired 2026-08-16). The 6 builder-validated refinements (reduced-motion-in-JS, the fail-closed
+ > gate/flag scaffold, content-law-scans-comments, Gemini-is-author-not-gate, consult-kimi --effort
+ > medium, consumer-vs-emitter world-token boundary) live in the swan-design-router LAWs — canon +
+ > law are complementary. Validated by 7 shipped design-overhaul surfaces + their cross-cutting review.
+@@ -11,8 +11,20 @@
+ 
+ - **Crystal:** v2.0 · **Status:** CRYSTALLIZED — frozen; change only via §16 thaw · **Date:** 2026-07-04 · **Review pass:** Kimi K3
+ - **Supersedes:** Fable draft 2026-07-03. Survives: T0–T4 tiers, dual-glow concept, C11 chart environments, data-only Arctic Cyan, low-motion data cards, 44px discipline. Changes: everything vibes-based is now mechanized or deleted.
+-- **Mirror:** `design.html` is GENERATED from this file (`pnpm canon:build`). Hand edits are reverted by CI. One source, one truth.
+-- **Enforcement files:** `canon/tokens.json` · `canon/route-manifest.json` · `canon/signature-moments.json` · `canon/motion-caps.json` · `canon/copy-lexicon.json` · `stylelint-config-swan` · gates: `canon:check`, `canon:contrast`, `canon:build`.
++- **Mirror: none — retired 2026-08-16.** `design.html` moved to `docs/_attic/2026-08-design-html/`. It was **never** generated: the claim that it was built by `pnpm canon:build` with CI reverting hand edits was false in three ways at once — no such script, no such CI job, and the repo does not use pnpm. Left hand-maintained, it drifted into its own section numbering (its §2/§3 were TYPOGRAPHY/SPACING against canon's Taste Bible/Optics), so every `design.html §N` citation landed on unrelated doctrine. **If a visual reference is wanted again it must be generated from this file by a real, named script — never hand-kept.**
++- **Enforcement — what actually exists** (corrected 2026-08-16; the previous list was fictional):
++  - **REAL:** `scripts/ci/check-token-discipline.mjs` (raw-hex discipline only — it does **not** check the radius/spacing scales in §9) · `scripts/ci/check-degalaxy.mjs` (retired-palette ban) · `scripts/design-brain/config/tokens.json` · `scripts/design-brain/check-brain-links.mjs` + `npm run brain:links` (cross-reference gate, pre-commit).
++  - **DOES NOT EXIST — do not cite as enforcement:** there is no `canon/` directory anywhere in the repo; no `canon/route-manifest.json`, `canon/signature-moments.json`, `canon/motion-caps.json`, or `canon/copy-lexicon.json`; no `stylelint-config-swan` package; and no `canon:check` / `canon:contrast` / `canon:build` npm script. `tokens.json` is real but lives at `scripts/design-brain/config/`, not `canon/`.
++  - **Why this line changed:** the previous version named ten mechanisms, nine of which were never built. A cited-but-absent mechanism is worse than no mechanism, because it tells every reader "this is handled" and stops them building it.
++
++> **⚠ §16 IS CURRENTLY UNFOLLOWABLE — flagged for Sean, deliberately not "fixed" here.**
++> This file says *"CRYSTALLIZED — frozen; change only via §16 thaw."* But §16 requires opening a
++> LIQUID proposal in `canon/liquid/`, a `canon:contrast` recompute, and manifest/registry diffs —
++> **none of which exist** (verified 2026-08-16). The protocol that governs changing canon depends
++> on the same apparatus this correction just found missing, so canon is either unchangeable by its
++> own law or the law is decorative. **The edits above are truth-corrections — they delete
++> statements that are factually false — not design-law changes, so they do not need a thaw.**
++> Repairing or retiring §16 is a doctrine decision and belongs to Sean.
+ 
+ ## §1 How canon works — Crystallization
+ 
+diff --git a/docs/ai-workflow/design-brain/index.md b/docs/ai-workflow/design-brain/index.md
+index 8f42a806f..0f25f51f6 100644
+--- a/docs/ai-workflow/design-brain/index.md
++++ b/docs/ai-workflow/design-brain/index.md
+@@ -7,7 +7,7 @@
+ 
+ ## What belongs in this folder
+ 
+-Compact, agent-callable design doctrine: tokens, patterns, motion rules, bans, QA gates, page generators, and per-agent adapters. Markdown (plus the single `design.html` visual mirror). Everything here ADAPTS the two source-of-truth docs — it never contradicts them.
++Compact, agent-callable design doctrine: tokens, patterns, motion rules, bans, QA gates, page generators, and per-agent adapters. Markdown only. Everything here ADAPTS the two source-of-truth docs — it never contradicts them.
+ 
+ ## What does NOT belong here
+ 
+@@ -21,8 +21,7 @@ Production code; component implementations; screenshots/QA dumps (those go to QA
+ |---|---|
+ | `README.md` | What the Design Brain is, load order, enforcement contract, what it does not override |
+ | `index.md` | This map |
+-| `design.md` | THE dense canonical design system — tokens, modes (Crystalline Swan + Crystalline Cyberforest), type, spacing, surfaces, components-by-surface, states, responsive + a11y rules. `design.html` mirrors it; `design.md` wins conflicts |
+-| `design.html` | Static, no-dev-server visual mirror of `design.md` for humans (built by a parallel agent; update together with `design.md`) |
++| `design.md` | THE dense canonical design system — tokens, modes (Crystalline Swan + Crystalline Cyberforest), type, spacing, surfaces, components-by-surface, states, responsive + a11y rules. **Sole source of truth** — the former `design.html` mirror was retired 2026-08-16 |
+ | `motion.md` | Motion tiers, GPU-safe rules, reduced-motion gating (CSS + JS), duration/easing tokens, motion bans, signature-moment budget |
+ | `components.md` | Component pattern index — purpose / anatomy / states / do–don't / C1–C12 mapping for every canonical pattern |
+ | `anti-patterns.md` | The banned list with WHY per item |
+diff --git a/docs/ai-workflow/references/SWANSTUDIOS-AI-SKILL-AND-OPERATOR-REGISTRY.md b/docs/ai-workflow/references/SWANSTUDIOS-AI-SKILL-AND-OPERATOR-REGISTRY.md
+index fa06a985d..08c2958e0 100644
+--- a/docs/ai-workflow/references/SWANSTUDIOS-AI-SKILL-AND-OPERATOR-REGISTRY.md
++++ b/docs/ai-workflow/references/SWANSTUDIOS-AI-SKILL-AND-OPERATOR-REGISTRY.md
+@@ -92,7 +92,7 @@ Data classes: `repo` (code/docs) · `app-meta` (routes, configs, non-client data
+ | Entry | Owner | Tier | Decision | Notes |
+ |---|---|---|---|---|
+ | Design Brain bundle | Fable authors · all builders consume | T1 | CREATE → done | `docs/ai-workflow/design-brain/` — adapts, never replaces, SWAN-CINEMATIC-DESIGN-SYSTEM.md |
+-| design.md / design.html enforcement | Claude Code/Codex | T1 gate | CREATE → done | design.md canonical; design.html mirrors it; update together |
++| design.md enforcement | Claude Code/Codex | T1 gate | CREATE → done | `design.md` is canonical **and sole** — the `design.html` mirror was retired 2026-08-16, so there is no "update together" obligation any more. Structural enforcement is `npm run brain:links` (pre-commit) |
+ | Fable Design Brain adapter | Fable | T1 | CREATE → done | `adapters/fable.md` |
+ | Website archetype codex | Fable authors | T1 | CREATE → done | 21 archetypes, one dense doc; #21 is the licensed Experience/World Showcase archetype |
+ | World Engine catalog + M4 license | Fable authors · Codex/Claude execute | T1 doctrine / T2 ignored proof | CREATE → done | 18 World DNA recipes, WFX/PSY contracts, product/Hermes firewall, deterministic proof receipts |
+```
+
+---
+
+## 6. THE RETIRED FILE
+
+The retired `design.html` was ~1,340 lines of self-contained static HTML: an 18-section visual mirror of the canon (token swatches, type specimens, component examples). It carried its own section numbering — its §2/§3 were TYPOGRAPHY/SPACING against canon §2 Taste Bible / §3 Optics, plus a §7→§12 gap — so every `design.html §N` citation landed on unrelated doctrine. It is preserved at `docs/_attic/2026-08-design-html/design.html`; nothing was deleted.
diff --git a/docs/ai-workflow/design-brain/README.md b/docs/ai-workflow/design-brain/README.md
index 3321171bf..c20502212 100644
--- a/docs/ai-workflow/design-brain/README.md
+++ b/docs/ai-workflow/design-brain/README.md
@@ -27,7 +27,7 @@ It exists to make four brains draw the same picture: same tokens, same patterns,
 
 Every agent that builds or reviews UI agrees to this:
 
-1. **`design.md` is canonical, and now sole.** The `design.html` visual mirror was **retired to `docs/_attic/2026-08-design-html/` on 2026-08-16** — it had drifted into its own section numbering, so citations into it landed on the wrong doctrine. There is no mirror to keep in sync any more; one file, one truth.
+1. **`design.md` is canonical, and now the sole canonical *copy*.** The `design.html` visual mirror was **retired to `docs/_attic/2026-08-design-html/` on 2026-08-16** — it had drifted into its own section numbering, so citations into it landed on the wrong doctrine. There is no mirror to keep in sync any more. **This does not change the layering:** the brain still ADAPTS `SWAN-CINEMATIC-DESIGN-SYSTEM.md` and `SWAN-ASSET-STORYBOARDING.md` and never outranks them — "sole" means one copy, not top of the hierarchy. Humans wanting a visual snapshot can open the frozen, **non-doctrinal** copy in the attic.
 2. **Before any frontend work, read `design.md`.** Not from memory — from disk. Tokens drift; memory drifts faster.
 3. **Reuse documented tokens and components.** If a token or pattern you need exists in `design.md`/`components.md`, use it. Do not fork a near-duplicate.
 4. **Propose — never invent — new tokens.** A new color, spacing step, or radius is a proposal to Sean (and a paired update to `SWAN-CINEMATIC-DESIGN-SYSTEM.md` §B + CLAUDE.md Active Palette per that doc's §G maintenance rules). It is never a hardcoded hex in a component.
diff --git a/docs/ai-workflow/design-brain/design.md b/docs/ai-workflow/design-brain/design.md
index d44ab40c7..0b1aec1b2 100644
--- a/docs/ai-workflow/design-brain/design.md
+++ b/docs/ai-workflow/design-brain/design.md
@@ -1,8 +1,9 @@
 > **Crystalline Canon — adopted 2026-07-19 (Sean-confirmed)** from KIMI-DESIGN-BRAIN-ENHANCED,
 > the decisive rewrite of the prior Design Brain (killed the hedged "OR" laws; added z/duration/
 > density scales + a `canon:contrast` CI trigger + the SOLID/LIQUID canon lifecycle). Prior version
-> preserved at `design.md.pre-redo`. This canon is the sole source of truth (the former `design.html`
-> mirror was retired 2026-08-16). The 6 builder-validated refinements (reduced-motion-in-JS, the fail-closed
+> preserved at `design.md.pre-redo`. This canon is the sole canonical COPY — the former `design.html`
+> mirror was retired 2026-08-16, so there is no second file to reconcile; it still ADAPTS the two
+> source-of-truth reference docs and does not outrank them. The 6 builder-validated refinements (reduced-motion-in-JS, the fail-closed
 > gate/flag scaffold, content-law-scans-comments, Gemini-is-author-not-gate, consult-kimi --effort
 > medium, consumer-vs-emitter world-token boundary) live in the swan-design-router LAWs — canon +
 > law are complementary. Validated by 7 shipped design-overhaul surfaces + their cross-cutting review.
@@ -13,7 +14,7 @@
 - **Supersedes:** Fable draft 2026-07-03. Survives: T0–T4 tiers, dual-glow concept, C11 chart environments, data-only Arctic Cyan, low-motion data cards, 44px discipline. Changes: everything vibes-based is now mechanized or deleted.
 - **Mirror: none — retired 2026-08-16.** `design.html` moved to `docs/_attic/2026-08-design-html/`. It was **never** generated: the claim that it was built by `pnpm canon:build` with CI reverting hand edits was false in three ways at once — no such script, no such CI job, and the repo does not use pnpm. Left hand-maintained, it drifted into its own section numbering (its §2/§3 were TYPOGRAPHY/SPACING against canon's Taste Bible/Optics), so every `design.html §N` citation landed on unrelated doctrine. **If a visual reference is wanted again it must be generated from this file by a real, named script — never hand-kept.**
 - **Enforcement — what actually exists** (corrected 2026-08-16; the previous list was fictional):
-  - **REAL:** `scripts/ci/check-token-discipline.mjs` (raw-hex discipline only — it does **not** check the radius/spacing scales in §9) · `scripts/ci/check-degalaxy.mjs` (retired-palette ban) · `scripts/design-brain/config/tokens.json` · `scripts/design-brain/check-brain-links.mjs` + `npm run brain:links` (cross-reference gate, pre-commit).
+  - **REAL:** `scripts/ci/check-token-discipline.mjs` (raw-hex discipline only — it does **not** check the radius/spacing scales in §9) · `scripts/ci/check-degalaxy.mjs` (retired-palette ban) · `scripts/design-brain/config/tokens.json` · `scripts/design-brain/check-brain-links.mjs` + `npm run brain:links` (cross-reference gate; wired into `.githooks/pre-commit` via the `BRAIN_LINKS` block — verified 2026-08-16, cited by symbol not line number because line numbers in that file have drifted three times already), backed by a 73-test suite in `scripts/design-brain/tests/` that tests the *gate*, not doctrine.
   - **DOES NOT EXIST — do not cite as enforcement:** there is no `canon/` directory anywhere in the repo; no `canon/route-manifest.json`, `canon/signature-moments.json`, `canon/motion-caps.json`, or `canon/copy-lexicon.json`; no `stylelint-config-swan` package; and no `canon:check` / `canon:contrast` / `canon:build` npm script. `tokens.json` is real but lives at `scripts/design-brain/config/`, not `canon/`.
   - **Why this line changed:** the previous version named ten mechanisms, nine of which were never built. A cited-but-absent mechanism is worse than no mechanism, because it tells every reader "this is handled" and stops them building it.
 
diff --git a/docs/ai-workflow/design-brain/index.md b/docs/ai-workflow/design-brain/index.md
index 0f25f51f6..4f7aa61e6 100644
--- a/docs/ai-workflow/design-brain/index.md
+++ b/docs/ai-workflow/design-brain/index.md
@@ -21,7 +21,7 @@ Production code; component implementations; screenshots/QA dumps (those go to QA
 |---|---|
 | `README.md` | What the Design Brain is, load order, enforcement contract, what it does not override |
 | `index.md` | This map |
-| `design.md` | THE dense canonical design system — tokens, modes (Crystalline Swan + Crystalline Cyberforest), type, spacing, surfaces, components-by-surface, states, responsive + a11y rules. **Sole source of truth** — the former `design.html` mirror was retired 2026-08-16 |
+| `design.md` | THE dense canonical design system — tokens, modes (Crystalline Swan + Crystalline Cyberforest), type, spacing, surfaces, components-by-surface, states, responsive + a11y rules. **Sole canonical copy** — the former `design.html` mirror was retired 2026-08-16, so there is no second file to reconcile. (This does **not** elevate it above `SWAN-CINEMATIC-DESIGN-SYSTEM.md`; the brain still ADAPTS the two source-of-truth docs.) |
 | `motion.md` | Motion tiers, GPU-safe rules, reduced-motion gating (CSS + JS), duration/easing tokens, motion bans, signature-moment budget |
 | `components.md` | Component pattern index — purpose / anatomy / states / do–don't / C1–C12 mapping for every canonical pattern |
 | `anti-patterns.md` | The banned list with WHY per item |
diff --git a/docs/ai-workflow/references/SWANSTUDIOS-AI-SKILL-AND-OPERATOR-REGISTRY.md b/docs/ai-workflow/references/SWANSTUDIOS-AI-SKILL-AND-OPERATOR-REGISTRY.md
index 08c2958e0..079c72e73 100644
--- a/docs/ai-workflow/references/SWANSTUDIOS-AI-SKILL-AND-OPERATOR-REGISTRY.md
+++ b/docs/ai-workflow/references/SWANSTUDIOS-AI-SKILL-AND-OPERATOR-REGISTRY.md
@@ -92,7 +92,7 @@ Data classes: `repo` (code/docs) · `app-meta` (routes, configs, non-client data
 | Entry | Owner | Tier | Decision | Notes |
 |---|---|---|---|---|
 | Design Brain bundle | Fable authors · all builders consume | T1 | CREATE → done | `docs/ai-workflow/design-brain/` — adapts, never replaces, SWAN-CINEMATIC-DESIGN-SYSTEM.md |
-| design.md enforcement | Claude Code/Codex | T1 gate | CREATE → done | `design.md` is canonical **and sole** — the `design.html` mirror was retired 2026-08-16, so there is no "update together" obligation any more. Structural enforcement is `npm run brain:links` (pre-commit) |
+| design.md enforcement | Claude Code/Codex | T1 gate | CREATE → done | `design.md` is canonical and the **sole canonical copy** — the `design.html` mirror was retired 2026-08-16, so there is no "update together" obligation any more. It still ADAPTS `SWAN-CINEMATIC-DESIGN-SYSTEM.md`; "sole" means one copy, not top of the hierarchy. Structural enforcement is `npm run brain:links` (pre-commit) |
 | Fable Design Brain adapter | Fable | T1 | CREATE → done | `adapters/fable.md` |
 | Website archetype codex | Fable authors | T1 | CREATE → done | 21 archetypes, one dense doc; #21 is the licensed Experience/World Showcase archetype |
 | World Engine catalog + M4 license | Fable authors · Codex/Claude execute | T1 doctrine / T2 ignored proof | CREATE → done | 18 World DNA recipes, WFX/PSY contracts, product/Hermes firewall, deterministic proof receipts |
diff --git a/scripts/consult-hy3-design.mjs b/scripts/consult-hy3-design.mjs
index c76b8e616..f2d39d0b1 100644
--- a/scripts/consult-hy3-design.mjs
+++ b/scripts/consult-hy3-design.mjs
@@ -183,7 +183,20 @@ async function main() {
       + `> Re-run with --max-tokens higher, or split the packet into narrower consults.\n\n`
     : '';
 
-  const output = `# Tencent Hy3 - Design Inspiration\n\n**Reviewer:** \`${model}\` (${options.effort})\n`
+  // SELF-DESCRIBING HEADER (Sean, 2026-08-16) — third of three consult paths to get this; the
+  // gateway (consult.mjs) and consult-glm.mjs were fixed first and this one was MISSED, found by
+  // grepping for the old static strings rather than by memory of which files I had touched.
+  // The H1 named the TOOL ("Tencent Hy3 - Design Inspiration") and not the WORK, so a review could
+  // not be identified without opening it. Derive it from the reviewed document's own H1. Fenced
+  // blocks are stripped first: packets embed diffs, and a `# comment` inside a fence sits at line
+  // start exactly like a heading — a header describing the wrong thing is worse than a generic one.
+  const SUBJECT_MAX = 120;
+  let subject = (document.replace(/^```[\s\S]*?^```/gm, '').match(/^#\s+(.+?)\s*$/m)?.[1] ?? '')
+    .replace(/\s+/g, ' ').trim();
+  if (subject.length > SUBJECT_MAX) subject = `${subject.slice(0, SUBJECT_MAX - 1).trimEnd()}…`;
+  const h1 = subject ? `${subject} — reviewed by HY3 (${model})` : 'Tencent Hy3 - Design Inspiration';
+
+  const output = `# ${h1}\n\n**Reviewer:** \`${model}\` (${options.effort})\n`
     + `**Document:** ${options.document}\n**Seed:** ${options.seed || '(none)'}\n`
     + `**Tokens:** ${inputTokens} in / ${outputTokens} out | **Cost:** ~$${actualUsd.toFixed(4)} | **Wall:** ${seconds}s`
     + ` | **finish_reason:** ${finish ?? '?'}\n\n---\n\n${banner}${text}\n`;
diff --git a/scripts/context-gateway/src/consult.mjs b/scripts/context-gateway/src/consult.mjs
index 9115736a0..1756723b6 100644
--- a/scripts/context-gateway/src/consult.mjs
+++ b/scripts/context-gateway/src/consult.mjs
@@ -218,7 +218,24 @@ async function runConsultInner(providerName, defaultRemit, defaultOut, ctx = {})
       + `${r.finishReason ? `; finish_reason: \`${r.finishReason}\`` : ''}. `
       + 'Do not treat anything below as a verdict.\n'
     : '';
-  writeFileSync(outPath, `# ${provider.title}\n${failBanner}\n**Reviewer:** OpenRouter \`${r.model}\`${effort ? ` (effort: ${effort})` : ''}\n**Document:** ${shortPath(docPath)}\n**Seed:** ${seedPath ? shortPath(seedPath) : '(none)'}\n**Tokens:** ${r.inTok} in / ${r.outTok} out · **Cost:** ~$${r.cost.toFixed(4)} · **Wall:** ${(r.wallMs / 1000).toFixed(1)}s${r.finishReason ? ` · **finish_reason:** ${r.finishReason}` : ''}\n\n---\n\n${r.text}\n`, 'utf-8');
+  // SELF-DESCRIBING HEADER (Sean, 2026-08-16). The H1 used to be a STATIC provider title —
+  // "SwanStudios Kimi K3 Design Review" — which names the TOOL and not the WORK. Open such a file
+  // cold and you cannot tell a Swan Brain review from a storefront audit; Sean's words: "it
+  // completely doesn't let me know what we're really working on." Derive the subject from the
+  // reviewed document's own H1 so every future review is self-describing with zero author effort.
+  // Falls back to the provider title when the document has no H1 — never throws, never blocks a
+  // paid call that already succeeded.
+  // Fenced blocks are stripped FIRST: review packets routinely embed diffs and shell snippets, and
+  // a `# comment` inside a fence sits at line-start exactly like a heading. Without this, a packet
+  // whose first fence precedes its title would be named after a bash comment — a self-describing
+  // header that describes the wrong thing is worse than a generic one.
+  const SUBJECT_MAX = 120;
+  const unfenced = doc.replace(/^```[\s\S]*?^```/gm, '');
+  let subject = (unfenced.match(/^#\s+(.+?)\s*$/m)?.[1] ?? '').replace(/\s+/g, ' ').trim();
+  if (subject.length > SUBJECT_MAX) subject = `${subject.slice(0, SUBJECT_MAX - 1).trimEnd()}…`;
+  const shortTitle = provider.title.replace(/^SwanStudios\s+/, '');
+  const h1 = subject ? `${subject} — reviewed by ${shortTitle}` : provider.title;
+  writeFileSync(outPath, `# ${h1}\n${failBanner}\n**Reviewer:** OpenRouter \`${r.model}\`${effort ? ` (effort: ${effort})` : ''}\n**Document:** ${shortPath(docPath)}\n**Seed:** ${seedPath ? shortPath(seedPath) : '(none)'}\n**Tokens:** ${r.inTok} in / ${r.outTok} out · **Cost:** ~$${r.cost.toFixed(4)} · **Wall:** ${(r.wallMs / 1000).toFixed(1)}s${r.finishReason ? ` · **finish_reason:** ${r.finishReason}` : ''}\n\n---\n\n${r.text}\n`, 'utf-8');
   // Relative, matching the receipt line: an absolute --out carries the OS username into the
   // transcript. The basename-only principle is the LANE's, not just the DENY branch's (Kimi r3, N2).
   console.log(`[consult-${providerName}] saved -> ${shortPath(outPath)}`);
```

---

## 7. BRANCH B DIFF — the whole branch, vs its merge base with main

```diff
diff --git a/AGENTS.md b/AGENTS.md
index c619ad148..2ec9ad320 100644
--- a/AGENTS.md
+++ b/AGENTS.md
@@ -12,7 +12,7 @@ SwanStudios (SS-PT): Production personal training SaaS on Render (sswanstudios.c
 - **Theme:** Enchanted Apex: Crystalline Swan (dark-first, frozen enchanted forest + deep-ocean luxury vault)
 - **RETIRED:** Galaxy-Swan theme (`#0a0a1a`, `#00FFFF`, `#7851A9`) — do NOT use
 
-- **⚠ PARALLEL AI CODING (active 2026-06-13 → ~Fable-5 return):** You may NOT be the only agent in this tree. **Claude and Codex code this SAME working tree at the same time.** Before editing ANY file you MUST follow **Rule 67** — read the other agent's lane in `.ai-workflow/coordination/` first (read-before-edit), claim your files in your own lane, and never `git add -A` while the other has files locked. A fresh session re-enters cheaply by reading the two tiny lane files + `review-queue.md`. You are not alone — coordinate. Spec: `docs/ai-workflow/references/AI-PAIR-CODING-PROTOCOL.md`.
+- **⚠ PARALLEL AI CODING (PERMANENT — Sean works with multiple agents 24/7, not a temporary arrangement):** You are almost never the only agent in this repo. Typical live state is **4-8 concurrent sessions across ~184 worktrees** — several Claude sessions, Codex, cloud agents. Most collisions are **Claude↔Claude**, not Claude↔Codex. **Run `node scripts/lane.mjs digest` at session start and before your first edit** — it is the one command; do NOT read `claude.lane.md`/`codex.lane.md` by name, those are stale relics and per-session lanes are named `<agent>--<worktree>-<hash>-s<session>.lane.md`. **When another agent holds what you need, TALK TO THEM in `.ai-workflow/coordination/review-queue.md` — that is the comms channel, and using it is the expected first move, not escalating to Sean.** Read their committed work and handoff docs BEFORE forming your own plan; theirs may already override it. Full: **Rule 67** + the `agent-lane` skill + `docs/ai-workflow/references/AI-PAIR-CODING-PROTOCOL.md`.
 
 - **Priority:** SwanStudios production work is the default priority. Side projects, internal experiments, and non-SwanStudios plans are out of scope unless Sean explicitly names them. Hermes (Sean's internal Pi+Telegram operator bridge) is in scope only when Sean explicitly connects it to SwanStudios operator/coding/continuity work or names it as the active task. Do not blur public in-app Swan Coach with Sean-only Hermes Operator Mode — see `docs/ai-workflow/references/HERMES-SWANSTUDIOS-OPERATOR-BRIDGE.md`.
 
@@ -160,7 +160,7 @@ Full protocol: `docs/ai-workflow/references/PROMPT-RECONSTRUCTION-HOSTILE-REVIEW
 
 39. **Artifact Recurrence / .gitignore Rule (MANDATORY)** — If a hygiene scan identifies a recurring temp/log/build-artifact class (e.g. `combined.log`, `tsc-errors.txt`, ad hoc root `.png` QA dumps), Claude must propose the matching `.gitignore` update in the same cleanup plan so the same clutter does not repopulate the repo root after cleanup. The `.gitignore` proposal is part of Phase 1 planning output; the actual `.gitignore` edit happens only with Sean's explicit approval in Phase 2.
 
-40. **Design work routes through `swan-design-router` by default (MANDATORY)** — All UI/visual work auto-routes through the Swan design router. The router is the only default-exposed design brain. It loads `docs/ai-workflow/references/SWAN-CINEMATIC-DESIGN-SYSTEM.md` and `docs/ai-workflow/references/SWAN-ASSET-STORYBOARDING.md` as its source-of-truth docs, and treats `frontend-design` + `ui-ux-pro-max` as reference libraries (not co-equal steering brains). The 7 narrow aesthetic skills (`minimalist-ui`, `industrial-brutalist-ui`, `high-end-visual-design`, `design-taste-frontend`, `stitch-design-taste`, `redesign-existing-projects`, `web-design-guidelines`) are **explicit-invocation-only** — they do not steer default design work. For net-new pages and major redesigns, the router's 2-3 concept-direction ideation gate is mandatory before coding; small polish tasks can skip it. See `.claude/skills/swan-design-router/SKILL.md`. The router also loads `docs/ai-workflow/design-brain/` (design.md canonical, design.html visual mirror); the Design Brain is subordinate to SWAN-CINEMATIC-DESIGN-SYSTEM.md. **Taste-ceiling doctrine (added 2026-07-22 from the Kimi-K3 scroll-film transcript):** the highest Swan aesthetic tier — ABOVE Mobbin/conventional app-UI reference — is the cinematic scroll-journey. For any net-new **awe** surface (hero/landing/showcase/brand), the router's ideation gate now runs an 8-12-concept **breadth pass** (taste-cut by Sean), at least one direction must open with an **Extreme Macro-Journey** hook (`inside → through → across → out`, SWAN-CINEMATIC-DESIGN-SYSTEM.md §B2.4), and the maximalist option is the **C13 Scroll-Bound Macro Journey** (§C13 — the creative IS the page; scroll drives the video playhead; gates = 60fps scrub + tour mode). Mobbin stays the lane for conventional working surfaces; the cinematic-journey tier is the lane for awe. Production craft: `docs/ai-workflow/design-brain/cinematic-pages.md` §8/§18.
+40. **Design work routes through `swan-design-router` by default (MANDATORY)** — All UI/visual work auto-routes through the Swan design router. The router is the only default-exposed design brain. It loads `docs/ai-workflow/references/SWAN-CINEMATIC-DESIGN-SYSTEM.md` and `docs/ai-workflow/references/SWAN-ASSET-STORYBOARDING.md` as its source-of-truth docs, and treats `frontend-design` + `ui-ux-pro-max` as reference libraries (not co-equal steering brains). The 7 narrow aesthetic skills (`minimalist-ui`, `industrial-brutalist-ui`, `high-end-visual-design`, `design-taste-frontend`, `stitch-design-taste`, `redesign-existing-projects`, `web-design-guidelines`) are **explicit-invocation-only** — they do not steer default design work. For net-new pages and major redesigns, the router's 2-3 concept-direction ideation gate is mandatory before coding; small polish tasks can skip it. See `.claude/skills/swan-design-router/SKILL.md`. The router also loads `docs/ai-workflow/design-brain/` (design.md canonical, design.html visual mirror); the Design Brain is subordinate to SWAN-CINEMATIC-DESIGN-SYSTEM.md. **Taste-ceiling doctrine (added 2026-07-22 from the Kimi-K3 scroll-film transcript):** the highest Swan aesthetic tier — ABOVE Mobbin/conventional app-UI reference — is the cinematic scroll-journey. For any net-new **awe** surface (hero/landing/showcase/brand), the router's ideation gate now runs an 8-12-concept **breadth pass** (taste-cut by Sean), at least one direction must open with an **Extreme Macro-Journey** hook (`inside → through → across → out`, SWAN-CINEMATIC-DESIGN-SYSTEM.md §B2.4), and the maximalist option is the **C13 Scroll-Bound Macro Journey** (§C13 — the creative IS the page; scroll drives the video playhead; gates = 60fps scrub + tour mode). Mobbin stays the lane for conventional working surfaces; the cinematic-journey tier is the lane for awe. Production craft: `docs/ai-workflow/design-brain/cinematic-pages.md` §8.
 
 41. **Closeout routes through `closeout-evidence-lock` by default (MANDATORY)** — End-of-task closeout for any substantial task auto-routes through the Swan closeout skill. It enforces the Claim-to-Evidence Lock (rule 28), the dual-pass hostile review (rule 17), the post-task hygiene check (rule 38), and the forbidden-language filter (rule 34). It preserves the full substantive code-review checklist (security, performance, test coverage, breaking changes, conventions) inherited from the retired `requesting-code-review` skill. The `requesting-code-review` skill is **removed from default use** — it depends on a missing `superpowers:code-reviewer` subagent and silently fails. Do NOT dispatch to `requesting-code-review` from any new code path. See `.claude/skills/closeout-evidence-lock/SKILL.md`.
 
@@ -540,15 +540,18 @@ Full protocol: `docs/ai-workflow/references/PROMPT-RECONSTRUCTION-HOSTILE-REVIEW
 
     **Why:** Sean's words 2026-06-11 — "I want every prompt I give to be the best that it could possibly be," with the AI telling SIMPLE apart from "an idea I'm trying to bring into reality," enhancing silently for least clicks / least tokens. Full procedure: `.claude/skills/prompt-watcher/SKILL.md`.
 
-67. **Live Pair-Coding Coordination (MANDATORY while Claude + Codex run in parallel)** — Established 2026-06-13 by Sean. Claude and Codex code the SAME working tree at the same time; without a live channel they collide (a commit once swept in 63 of the other agent's WIP files). The fix is a **Live Coordination Ledger** of gitignored, same-machine files at `.ai-workflow/coordination/` — both agents share Sean's filesystem, so they see each other instantly with zero git churn. (Gitignored on purpose: a committed "editing now" file would itself cause merge conflicts.) This is the real-time, 2-agent layer on top of the cross-session continuity bridge (`.ai-workflow/continuity/`) and the per-phase debate files; it does not replace them.
-    - **Session start:** read `claude.lane.md` + `codex.lane.md` + `review-queue.md`; run `node scripts/coordination-prune.mjs`.
-    - **R1 read-before-edit:** before editing ANY file, read the other agent's lane; if your target is in their **🔒 EDITING NOW**, don't edit it — pick another, queue a review request, or ask Sean.
-    - **R2/R3 claim/release:** overwrite your OWN `*.lane.md` (status, 🔒 EDITING NOW, timestamp) when you start a slice; clear it when done. Never write the other agent's lane file.
-    - **R5 staleness:** a lane `Updated:` > 30 min old + still `in-progress` may be abandoned — flag to Sean, don't silently seize.
-    - **R6 commit safety:** no `git add -A` while the other agent has any file locked; stage explicit paths; Codex coordinates commit timing on shared slices.
-    - **R7 mutual hostile review (Sean's #1 ask):** finishing a substantial slice → append a request to `review-queue.md`; the other agent runs a hostile review (rule 17 + rule 41 + the HANDOFF-PROTOCOL Business-Logic Audit) and writes back APPROVE/REVISE/REJECT + findings.
-    - **R8 lanes:** keep a standing "owned area" in your lane file; current split — Codex = storefront purchase path + Coach + Social; Claude = admin product/catalog UI + money-path safety tests + cross-cutting infra; shared = `adminPackageRoutes.mjs`, `CLAUDE.md`/`AGENTS.md`, the coordination dir.
-    - **Retention:** lane files overwrite in place (no growth); `review-queue.md`/`activity.log.md` pruned to 30 days / 256 KB by `scripts/coordination-prune.mjs` (gitignored+local → no history loss). Full spec: `docs/ai-workflow/references/AI-PAIR-CODING-PROTOCOL.md`. **Why:** Sean 2026-06-13 — tight real-time Claude↔Codex communication to avoid collisions, build faster, and catch each other's work via mutual hostile review, for the ~month until Fable 5 returns.
+67. **Multi-Agent Coordination (MANDATORY, PERMANENT, every session)** — Established 2026-06-13; rewritten 2026-08-14 after the v1 text caused the failure it existed to prevent. **Sean runs multiple AI agents on this repo continuously** — typically 4-8 live sessions across ~184 worktrees. v1 said "while Claude + Codex run in parallel," described a "2-agent layer," and named two lane files; by August the real state was many concurrent **Claude↔Claude** sessions with per-session lanes, so a literal reading of the rule did not even apply to the commonest collision. **This rule is unconditional. Assume other agents are live until the digest says otherwise.**
+    - **Session start AND before your first edit:** `node scripts/lane.mjs digest`. That is the command. **Never read `claude.lane.md`/`codex.lane.md` by name** — they are stale relics; live lanes are `<agent>--<worktree>-<hash>-s<session>.lane.md`. A `SessionStart` hook prints the digest automatically: **it is an instruction, not a banner.** Reading it and proceeding as if alone is the failure mode.
+    - **R1 read-before-edit:** if your target is in another agent's **🔒 EDITING NOW**, do not edit it.
+    - **R1b TALK TO THEM FIRST (added 2026-08-14 — this is the fix).** The ledger is a two-way channel, not a notice board. When another agent holds your file, is mid-slice on your topic, or has already shipped work in your area: **write to `.ai-workflow/coordination/review-queue.md`** — state what you are taking, what you are not touching, and what you need from them. v1 listed "or ask Sean" as a co-equal option to queuing a request, and R5 said to flag staleness "to Sean"; an agent following it exactly escalates a coordination problem to the human instead of using the channel built for it. **Sean is the last resort, not the first.** Escalate only for a genuine conflict of intent, a destructive/irreversible action, or an owner-gated decision.
+    - **R1c read their work before forming your plan.** Check the other agent's commits and any `SESSION-HANDOFF-*` / `AI-HANDOFF/` doc in your area **before** recommending a direction. On 2026-08-14 a session spent a turn recommending a build that a parallel session had already proven unnecessary — its evidence-backed "do NOT build this" was sitting committed and unread. **A peer's finding can override your own recommendation; go find it first.**
+    - **R2/R3 claim/release:** `node scripts/lane.mjs claim --task "..." --files "a,b"` before the first edit; `release --outcome "..."` at the end. Re-claim with the fuller list if scope grows — a stale claim is a lie. **Never write another agent's lane file** (R4).
+    - **R5 staleness:** a lane older than ~120 min still `in-progress` may be abandoned — **judge peers by git, not by their lane**, whose `Delivery:` field froze at their last write. Commits newer than the lane mean live-but-stale-lane, not gone. Never silently seize.
+    - **R6 commit safety:** no `git add -A` while another agent holds a lock — and a bare `git commit` takes the whole shared index, so stage **explicit paths** and verify with `git diff --cached --name-only` before committing. Nothing enforces this; it is discipline, not a guard.
+    - **R7 mutual hostile review:** finishing a substantial slice → append a request to `review-queue.md`; another agent returns APPROVE/REVISE/REJECT + findings (rule 17 + 41 + HANDOFF-PROTOCOL Business-Logic Audit).
+    - **R8 lanes are declared in the ledger, not here.** v1 hardcoded a June lane split that was stale within weeks. Perishable state does not belong in a doc that reads as authoritative — publish your owned area in your lane file and read the digest for everyone else's.
+    - **Committed ≠ delivered.** A branch that is not pushed is invisible to every off-machine agent and to Hermes. Say which state work is in: `local-commit` / `pushed-branch` / `merged-to-main`.
+    - **Retention:** lane files overwrite in place; `review-queue.md`/`activity.log.md` pruned by `scripts/coordination-prune.mjs`. Skill: `.claude/skills/agent-lane/SKILL.md` (carries the push blast-radius checklist and the deliberately-NOT-built list). Spec: `docs/ai-workflow/references/AI-PAIR-CODING-PROTOCOL.md`. **Why:** Sean 2026-06-13, restated 2026-08-14 — "I'm always working with other agents 24/7… I already created a system where you can talk to other agents and see what they're doing." The system existed and worked; the rule described a smaller world than the one it ran in, so agents used it as a warning to relay rather than a channel to use.
 
 68. **Fable-Grade Plan → Worker-Bot Build → Hermes Learning Loop (MANDATORY routing for major "Fable vision" initiatives)** — Established 2026-07-05 by Sean. Fable is expensive, so its highest-leverage use is producing **plans so complete a lower-tier worker-bot executes them verbatim in Fable's exact vision** — not hand-writing every line. The standing pipeline for any major remake/vision initiative:
     ```
@@ -920,7 +923,7 @@ Use this on every new page, redesign, landing page, dashboard surface, and any v
       The `SWAN_AGENT_SURFACE` env var (one of `vs-claude` / `vs-codex` / `tg-claude` / `tg-codex`) must be set by the launch environment; the script reads gitignored `scripts/continuity-config.local.json` when present, otherwise the tracked template, and hard-fails if placeholders remain in the loaded config.
     - **Closeouts are explicit-trigger-only.** Do not auto-append — the discipline is that Sean decides when a session is meaningful enough to log.
     - Full spec + review chain: `docs/ai-workflow/AI-HANDOFF/CONTINUITY-BRIDGE-PHASE-B-DEBATE-2026-04-22.md`. Directory README: `.ai-workflow/continuity/README.md`.
-11. **Live Pair-Coding Coordination Ledger (Rule 67, added 2026-06-13 — while Claude + Codex run in parallel):** at session start, also read `.ai-workflow/coordination/claude.lane.md` + `codex.lane.md` (what the other agent is editing right now) + `review-queue.md` (open review requests for me), then run `node scripts/coordination-prune.mjs`. Before editing ANY file, re-check the other agent's lane (read-before-edit). Full spec: `docs/ai-workflow/references/AI-PAIR-CODING-PROTOCOL.md`.
+11. **Multi-Agent Coordination Ledger (Rule 67, rewritten 2026-08-14 — PERMANENT; 4-8 live agents is normal):** at session start run **`node scripts/lane.mjs digest`** — never read `claude.lane.md`/`codex.lane.md` by name, they are stale relics and live lanes are per-session. Read `.ai-workflow/coordination/review-queue.md` for open requests. Before editing ANY file, re-run the digest (read-before-edit). **If another agent holds your file or your topic, write to `review-queue.md` and talk to them — do not relay it to Sean as a blocker.** Read their commits and any `SESSION-HANDOFF-*` doc in your area before forming your plan; their finding may override yours. Full spec: `docs/ai-workflow/references/AI-PAIR-CODING-PROTOCOL.md`; skill: `.claude/skills/agent-lane/SKILL.md`.
 
 ## Reference Docs (Read ONLY when needed for current task)
 | Topic | File | When to Read |
diff --git a/CLAUDE.md b/CLAUDE.md
index 364565795..b33d64bd1 100644
--- a/CLAUDE.md
+++ b/CLAUDE.md
@@ -154,7 +154,7 @@ Full protocol: `docs/ai-workflow/references/PROMPT-RECONSTRUCTION-HOSTILE-REVIEW
 
 39. **Artifact Recurrence / .gitignore Rule (MANDATORY)** — If a hygiene scan identifies a recurring temp/log/build-artifact class (e.g. `combined.log`, `tsc-errors.txt`, ad hoc root `.png` QA dumps), Claude must propose the matching `.gitignore` update in the same cleanup plan so the same clutter does not repopulate the repo root after cleanup. The `.gitignore` proposal is part of Phase 1 planning output; the actual `.gitignore` edit happens only with Sean's explicit approval in Phase 2.
 
-40. **Design work routes through `swan-design-router` by default (MANDATORY)** — All UI/visual work auto-routes through the Swan design router. The router is the only default-exposed design brain. It loads `docs/ai-workflow/references/SWAN-CINEMATIC-DESIGN-SYSTEM.md` and `docs/ai-workflow/references/SWAN-ASSET-STORYBOARDING.md` as its source-of-truth docs, and treats `frontend-design` + `ui-ux-pro-max` as reference libraries (not co-equal steering brains). The 7 narrow aesthetic skills (`minimalist-ui`, `industrial-brutalist-ui`, `high-end-visual-design`, `design-taste-frontend`, `stitch-design-taste`, `redesign-existing-projects`, `web-design-guidelines`) are **explicit-invocation-only** — they do not steer default design work. For net-new pages and major redesigns, the router's 2-3 concept-direction ideation gate is mandatory before coding; small polish tasks can skip it. See `.claude/skills/swan-design-router/SKILL.md`. The router also loads `docs/ai-workflow/design-brain/` (design.md canonical, design.html visual mirror); the Design Brain is subordinate to SWAN-CINEMATIC-DESIGN-SYSTEM.md. **Taste-ceiling doctrine (added 2026-07-22 from the Kimi-K3 scroll-film transcript):** the highest Swan aesthetic tier — ABOVE Mobbin/conventional app-UI reference — is the cinematic scroll-journey. For any net-new **awe** surface (hero/landing/showcase/brand), the router's ideation gate now runs an 8-12-concept **breadth pass** (taste-cut by Sean), at least one direction must open with an **Extreme Macro-Journey** hook (`inside → through → across → out`, SWAN-CINEMATIC-DESIGN-SYSTEM.md §B2.4), and the maximalist option is the **C13 Scroll-Bound Macro Journey** (§C13 — the creative IS the page; scroll drives the video playhead; gates = 60fps scrub + tour mode). Mobbin stays the lane for conventional working surfaces; the cinematic-journey tier is the lane for awe. Production craft: `docs/ai-workflow/design-brain/cinematic-pages.md` §8/§18.
+40. **Design work routes through `swan-design-router` by default (MANDATORY)** — All UI/visual work auto-routes through the Swan design router. The router is the only default-exposed design brain. It loads `docs/ai-workflow/references/SWAN-CINEMATIC-DESIGN-SYSTEM.md` and `docs/ai-workflow/references/SWAN-ASSET-STORYBOARDING.md` as its source-of-truth docs, and treats `frontend-design` + `ui-ux-pro-max` as reference libraries (not co-equal steering brains). The 7 narrow aesthetic skills (`minimalist-ui`, `industrial-brutalist-ui`, `high-end-visual-design`, `design-taste-frontend`, `stitch-design-taste`, `redesign-existing-projects`, `web-design-guidelines`) are **explicit-invocation-only** — they do not steer default design work. For net-new pages and major redesigns, the router's 2-3 concept-direction ideation gate is mandatory before coding; small polish tasks can skip it. See `.claude/skills/swan-design-router/SKILL.md`. The router also loads `docs/ai-workflow/design-brain/` (design.md canonical, design.html visual mirror); the Design Brain is subordinate to SWAN-CINEMATIC-DESIGN-SYSTEM.md. **Taste-ceiling doctrine (added 2026-07-22 from the Kimi-K3 scroll-film transcript):** the highest Swan aesthetic tier — ABOVE Mobbin/conventional app-UI reference — is the cinematic scroll-journey. For any net-new **awe** surface (hero/landing/showcase/brand), the router's ideation gate now runs an 8-12-concept **breadth pass** (taste-cut by Sean), at least one direction must open with an **Extreme Macro-Journey** hook (`inside → through → across → out`, SWAN-CINEMATIC-DESIGN-SYSTEM.md §B2.4), and the maximalist option is the **C13 Scroll-Bound Macro Journey** (§C13 — the creative IS the page; scroll drives the video playhead; gates = 60fps scrub + tour mode). Mobbin stays the lane for conventional working surfaces; the cinematic-journey tier is the lane for awe. Production craft: `docs/ai-workflow/design-brain/cinematic-pages.md` §8.
 
 41. **Closeout routes through `closeout-evidence-lock` by default (MANDATORY)** — End-of-task closeout for any substantial task auto-routes through the Swan closeout skill. It enforces the Claim-to-Evidence Lock (rule 28), the dual-pass hostile review (rule 17), the post-task hygiene check (rule 38), and the forbidden-language filter (rule 34). It preserves the full substantive code-review checklist (security, performance, test coverage, breaking changes, conventions) inherited from the retired `requesting-code-review` skill. The `requesting-code-review` skill is **removed from default use** — it depends on a missing `superpowers:code-reviewer` subagent and silently fails. Do NOT dispatch to `requesting-code-review` from any new code path. See `.claude/skills/closeout-evidence-lock/SKILL.md`.
 
diff --git a/scripts/consult-glm.mjs b/scripts/consult-glm.mjs
index 893d010c8..1a19b355a 100644
--- a/scripts/consult-glm.mjs
+++ b/scripts/consult-glm.mjs
@@ -78,8 +78,21 @@ for await (const chunk of res.body) {
 if (!content) content = '(empty)';
 const wall = ((Date.now() - started) / 1000).toFixed(1);
 
+// SELF-DESCRIBING HEADER (Sean, 2026-08-16). The H1 was the static string "GLM Consult", which
+// names the TOOL and not the WORK — cold-open a review and you cannot tell a Swan Brain audit from
+// a storefront one. Derive it from the reviewed document's own H1 so every review is
+// self-describing with zero author effort. Fenced blocks are stripped FIRST: packets routinely
+// embed diffs and shell snippets, and a `# comment` inside a fence sits at line-start exactly like
+// a heading — a header that describes the wrong thing is worse than a generic one. Falls back to
+// the old title when the document has no H1: never throw away a paid call that already succeeded.
+const SUBJECT_MAX = 120;
+let subject = (body.replace(/^```[\s\S]*?^```/gm, '').match(/^#\s+(.+?)\s*$/m)?.[1] ?? '')
+  .replace(/\s+/g, ' ').trim();
+if (subject.length > SUBJECT_MAX) subject = `${subject.slice(0, SUBJECT_MAX - 1).trimEnd()}…`;
+const h1 = subject ? `${subject} — reviewed by GLM (${model})` : 'GLM Consult';
+
 mkdirSync(dirname(out), { recursive: true });
-writeFileSync(out, `# GLM Consult
+writeFileSync(out, `# ${h1}
 
 **Model:** ${model}
 **Document:** ${document}
```

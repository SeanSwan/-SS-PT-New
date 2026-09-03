# DESIGN BRAIN REPAVE — FULL SESSION HANDOFF

- **Date:** 2026-08-16 · **Author:** Claude Opus 5 (vs-claude) · **Status:** work pushed, NOT merged; four reviews owed before the next slice
- **Branch:** `claude/design-brain-repave-20260816` @ `89fa3eb39` — 16 commits, 19 files, +4849/−51, pushed to origin
- **Tracker:** SWA-163 (In Progress) — three comments carry the running detail
- **Read time:** ~8 minutes. Read §1–§3 before touching anything; §7 is your first task.

> **Why this exists:** the originating conversation ran long and Sean called a handoff. Everything below is reconstructed from the work itself, not from memory of the chat.

---

## 1. WHAT THIS WAS

Sean asked for a GLM-5.3 hostile review of the **Swan Brain** — the Design Brain at `docs/ai-workflow/design-brain/`, the markdown corpus every AI agent loads before building UI — covering design and security, with an explicit "how do we take it to the next level" remit.

The review found real rot. Fixing it consumed the rest of the session, through three hostile-review rounds and fourteen dry-loop rounds.

### The core defect class, stated once

A canon rewrite renumbered `design.md` from 28 sections down to 17. **No satellite file followed.** Nothing errored. An agent that follows a dead pointer resolves it *safely* — by skipping the doctrine it cannot find — so the corpus degraded silently while every individual file still read correct.

Measured with the finished tool against the **original** `origin/main` corpus: **34 structural defects — 25 dangling refs, 4 unindexed files, 4 orphaned index rows, 1 impossible bare ref.**

**The count progression is the most important fact in this document:**

| Instrument | Dangling refs found |
|---|---|
| Hand grep | 10 |
| Checker v1 | 16 |
| Checker final (backticks, ranges, paths, decimals, letters) | **25** |

The corpus never changed. Every published count was confident, evidence-backed, and low. **A count is a property of the instrument, not of the world.**

---

## 2. WHAT SHIPPED (16 commits, in order)

| SHA | What |
|---|---|
| `1a098c15f` | **Revocation fail-closed.** `verifyAuthorityRecord` defaulted `revokedIds = []`, so "cannot produce a revocation list" was indistinguishable from "nothing is revoked." Landed before any signing key exists — after keys ship it is unrecoverable. |
| `a9bd5fb25` | **The repave + the gate.** 16 dangling refs, 4 missing index rows, 4 orphans recorded as ATTICKED. New `scripts/design-brain/check-brain-links.mjs` + pre-commit wiring + `npm run brain:links`. |
| `5467e8297` | **Conflict law.** The corpus had no rule for what an agent does when two canonical files disagree, so every contradiction resolved to agent discretion. |
| `155d66db3` | Checker widened to satellite-to-satellite refs. |
| `9acc17c03` | **17 wrong-target refs** — pointers that *resolve* but land on the wrong section. |
| `e9440279c` | 3 more refs + **D4** (impossible bare ref). |
| `b7e00b1df` | Hermes learning packet (durable corpus). |
| `91417a3b0` | **MRI round 1 fixes** — the gate lied about itself; 8 refs hidden behind a backtick. |
| `14ccb43d2` | Bounded range expansion (a typo was a 100k-finding DoS). |
| `aa6b9498f` | **MRI round 2 fixes** — stale map key, comma-chain DoS, divergent grammars, lettered sections, joined separators. |
| `7d03bc0f6` | Separator class still one character short. |
| `4cb14c1b9` | **The gate now gates its own docstring.** |
| `c87d9cfb8` | **D6** — 19 live citations of doctrine atticked months ago. |
| `413563c8c` | README drifted again; self-check scope limit documented. |
| `097c185e5` | A guard that passed by coincidence (case). |
| `89fa3eb39` | Two more case comparisons of the same habit. |

### The gate, as it stands

`scripts/design-brain/check-brain-links.mjs` — `npm run brain:links`, plus pre-commit on any `design-brain/` **or** `scripts/design-brain/` change. Six classes:

- **D1 DANGLING** — `<file>.md §N` where N doesn't exist in that file. Canon *and* satellite-to-satellite. Ranges expanded.
- **D2 UNINDEXED** — a file missing from `index.md`, whose own law is "every file in this folder is listed here."
- **D3 ORPHANED** — an `index.md` row presenting an atticked or deleted file as live doctrine.
- **D4 IMPOSSIBLE** — a bare `§N` that resolves under no reading (exceeds both canon's max and its own file's).
- **D5 PHANTOM** — a `<file>.md §N` citation whose file exists nowhere in the repo.
- **D6 ATTICKED** — a citation of doctrine surviving only in `docs/_attic/`. **Carries a dated 5-file baseline** (see §5).

Plus a **startup self-check**: the gate refuses to run if it emits a `D<n>` class its own header doesn't document.

**Current state: CLEAN** — 28 files, 75 refs all resolving, 0 dangling / unindexed / orphaned / impossible / phantom, 0 attic-cite against baseline. Suite 73/73.

---

## 3. HOW TO VERIFY IT YOURSELF (do this first)

```bash
cd C:/tmp/swan-repave           # the worktree, cut from origin/main
node scripts/design-brain/check-brain-links.mjs        # expect CLEAN
node scripts/design-brain/check-brain-links.mjs --titles  # every ref + its target heading
for f in scripts/design-brain/tests/*.test.mjs; do node --test "$f"; done   # 73 pass
```

**Do not trust CLEAN on sight.** This checker reported CLEAN over a broken corpus once already (a CRLF bug made its heading regex match nothing; only a defensive "parsed zero sections" guard caught it). Prove it still detects by injecting one defect per class — and **inject into a file in `adapters/`, not a root-level file.** A root-file proof is what hid the worst bug of the session (§6).

---

## 4. THE THREE HOSTILE REVIEWS ALREADY RUN

All by **GLM-5.3**, all in `docs/ai-workflow/AI-HANDOFF/`:

| Packet | Review | Verdict |
|---|---|---|
| `GLM-SWAN-BRAIN-PACKET-A-DESIGN.md` (312 KB) | *(review A, design)* | brain is "a museum with an excellent security guard, not a machine" |
| `GLM-SWAN-BRAIN-PACKET-B-SECURITY.md` (274 KB) | *(review B, security)* | governance layer "a well-engineered brick" — real crypto, currently switched off |
| `GLM-MRI-REPAVE-PACKET.md` | `GLM-53-MRI-REPAVE-REVIEW.md` | MERGE WITH FIXES — W1–W6, I1–I4 |
| `GLM-MRI2-PACKET.md` | `GLM-53-MRI2-REVIEW.md` | MERGE WITH FIXES — N1–N12; 8/10 prior findings genuinely fixed |

**Calibration on GLM-5.3 (4 calls, flat-rate Z.ai, ~$0 marginal):** observations verified 5/5 in round 1 and near-perfectly after. **One fabricated causal attribution in its first review** — it claimed a linter enforces canon (it doesn't exist), and that fiction would have licensed changing button geometry across the app. **Trust its observations; verify its mechanisms.** Zero fabrications in rounds 2–3. Both later reviews truncated at the 32k output cap with ~30k spent on reasoning, so **demand tables first in the output format** — round 3 did that and lost only prose.

---

## 5. WHAT SEAN OWES A DECISION ON (do not decide these yourself)

1. **The token schism.** `design.md` §9: radius `20` cards · `12` controls · `999` pills · `24` modals; spacing `4 8 12 16 24 32 48 72 108 160 240`. `typography-grid.md` §5: `6/10/16/24/9999`, buttons at `10`. **Neither is mechanically enforced** — `swan/spacing`, `swan/z-scale`, `swan/two-speed` appear in eight documents and **zero lines of code**; the only real token linter (`scripts/ci/check-token-discipline.mjs`) checks raw hex. Reconciling changes geometry on every surface. Flagged in `README.md` §3 item 7.
2. **`design.html`.** It does **not** mirror canon — it has its own scheme (§2 TYPOGRAPHY, §3 SPACING, §7→§12 gap) against canon's §2 Taste Bible, §3 Optics. It is a wrong-target *generator*. Retire it, maintain it honestly, or regenerate it?
3. **`design.md:14`'s claim** that `design.html` is generated by `pnpm canon:build` with CI reverting hand edits. No such script, no CI job, **and the repo doesn't use pnpm.**
4. **Rule 40's `§18`.** `CLAUDE.md:157` and `AGENTS.md:163` both cite `cinematic-pages.md §8/§18`. Max is §17; **§18 has never existed in any revision.** `§8` is correct. One-character fix in the constitution — deliberately not touched.
5. **`adapters/knowledge.md`.** Its entire routing table's Policy column points at four atticked files, while its header says "real policy lives in `../obsidian/` and `../graphify/`" — directories now holding one index each. Retire, rewrite, or restore? **This is the D6 baseline's whole content.**

---

## 6. THE FAILURE PATTERNS — READ THIS BEFORE YOU FIX ANYTHING

These recurred *within one session*, several after being written up. They are why the work took three review rounds.

### 6.1 Proof scoped to the inputs you had in mind — **4 instances, still recurring**

The worst bug of the session: after re-keying a map by full path, D4 still looked it up by basename. Every subdirectory file broke; `obsidian/index.md` silently read the **root** index's data. My "all four classes re-proven by injection" ran on a **root-level file**, where `basename(rel) === rel`. **The test could not have failed.**

Also: bounded a DoS on dash-ranges and left comma-chains unbounded; widened a separator class and still got it one character short; "proved" D3 by injecting the defect class that never happened.

**Procedure for you:** prove on the shape *most unlike* the one you developed against. Subdirectory not root. Hostile input not valid input. Capitalised not lower-case.

### 6.2 Believing a negative from an unvalidated instrument — **5 instances**

An empty grep looks identical to a broken grep. Specifics that bit:
- `git show <rev>:<path>` mangled by MSYS path conversion → git errored → `grep -c` on empty input returned `0` → read as a finding. **Always `MSYS_NO_PATHCONV=1` for `<rev>:<path>` on this machine.**
- A grep requiring whitespace after a filename found nothing, so **I dismissed a correct GLM finding** (`anti-patterns.md §27`). It was right; my tool was blind. That happened **twice**.
- `bc` absent → a count printed blank, which reads as zero.

**Procedure for you:** run a positive control before reporting any absence. Prove the grep finds something you know exists in that file, *then* report the zero.

### 6.3 Documentation drifting from behaviour — **4 instances**

Header docstring, hook message, and README each described a defect set the code had moved past. Fixed by a startup self-check that fires on the author — it caught me within the hour. **But it only reads this file's header**; the README drifted *again* afterwards. Its scope limit is now stated in the source. An unstated limit is how a mechanism becomes the next fictional mechanism.

### 6.4 Fictional mechanisms — **4 found in this corpus**

Doctrine describing enforcement that was never built: `swan/spacing` lint rules (8 docs, 0 code); `pnpm canon:build` + CI (no script, no job, no pnpm); the gate's own former D3 claim; `knowledge.md`'s routing table. **A cited mechanism is not an existing mechanism** — and the fake one does active harm, because it tells every future reader "this is handled."

### 6.5 One habit wearing three costumes

Three case-comparison bugs, all passing *today* only because every filename in the corpus is lower-case. **Tests were green throughout — the fixtures share the coincidence.** A suite inherits its blind spots from its data. Reading the comparisons found them; running them never would have.

---

## 7. YOUR FIRST TASK — THE FOUR REVIEWS SEAN ASKED FOR

Sean asked for **Fable, GLM-5.3, Kimi K3, and HY3** hostile reviews, aimed at: *how do we plan to fix these issues, and is this happening anywhere else?*

**He explicitly said: do NOT create a skill for this.** Get the reviews, make the fixes, check for the same rot elsewhere.

### Key availability — verified this session

`OPENROUTER_API_KEY` is **in `.env` but not exported to the shell.** `ZAI_API_KEY` is in the shell. Load without echoing (Rule 59 — never print the value):

```bash
export OPENROUTER_API_KEY=$(grep '^OPENROUTER_API_KEY=' .env | cut -d= -f2)
```

### The four commands

```bash
# GLM-5.3 (Z.ai, flat-rate, already working)
node scripts/consult-glm.mjs --document <packet> --out <review> --model glm-5.3 --max-tokens 32000

# Fable, Kimi K3, HY3 (all OpenRouter — anthropic/claude-fable-5, moonshotai/kimi-k3, tencent/hy3)
node scripts/consult-fable.mjs      --document <packet> --out <review>
node scripts/consult-kimi.mjs       --document <packet> --out <review>
node scripts/consult-hy3-design.mjs --document <packet> --out <review>
```

**Fable is paid and is the Final Decider (rule 46/Co-Orchestrator hierarchy) — ask Sean before spending on it.** Kimi is one review per topic, ask first (standing rule). GLM is flat-rate and free at the margin.

### Packet construction — learned the hard way

- **Build it in a written script file, never inline shell.** An inline arithmetic error once produced a 2,693-line packet with **no instructions in it**; only a line-count check caught it. Verify size *and* spot-check the head before sending.
- **Secret-scan every packet before it leaves the machine**, largest first: `bash scripts/scan-secrets.sh <packet>`.
- **Demand tables before prose** in the output format. Both long reviews truncated at the token cap.
- Tell the reviewer what's already been found so it spends its budget on new ground.

### What to point them at

The three unfixed rot classes in §5, plus the "is this happening elsewhere" question. Concrete leads already gathered:
- **Consumers outside the brain cite its sections** and nothing checks them — `CLAUDE.md`/`AGENTS.md` already proven to carry a dead `§18`. The existing `scripts/hooks/constitution-references.mjs` resolves *paths*, not *sections*.
- Refs in `scripts/` comments, JSON schemas, and skill files that point into the brain — never scanned. `[HYPOTHESIS]`, unverified.
- Prose/title-form refs ("the accessibility floor", "the Two-speed law") are invisible to every check including `--titles`.

---

## 8. THE APPROVED NEXT SLICE (after the reviews, per Sean's sequencing)

**Sweep every "enforced by / generated by / reverted by CI" claim in the brain and mark each real or fictional.** Four known instances (§6.4). Mechanical and bounded: grep the claims, resolve each against code, and for each either fix the mechanism, delete the claim, or flag it.

**Acceptance criterion, from the pattern itself:** the sweep must not become a fifth fictional mechanism. Whatever it produces has to be re-runnable and must fail on a new false claim, or it is a one-time audit wearing a gate's costume.

---

## 9. HOW TO WORK IN THIS TREE

- **Work in `C:/tmp/swan-repave`** (worktree on `claude/design-brain-repave-20260816`, cut from `origin/main`).
- **Do NOT work in the main tree** (`<REPO>`). It is on `wip/comms-notifications-2026-07-05`, **~1,948 commits behind origin/main, and missing 9 design-brain files.** Editing the brain there forks the design system a second time. Its pre-commit hook is also from May and missing three guards that exist on main.
- The pre-commit hook **refuses to certify** when brain files differ between working tree and index. Stage before committing; that is deliberate.
- Commit per slice, push at batch end (Rule 70). Nothing here is deploy-linked — Render deploys from `main`, and this branch is not merged.
- Emit a Hermes memo at substantial closes (`.ai-workflow/hermes-inbox/pending/`) with a literal `## Mistakes I made` heading — a Stop hook blocks without it. Secret-scan it.
- **Careful with `git checkout -- <file>` after probes.** It restored from the index and destroyed two real fixes this session; the gate caught it going CLEAN → FAIL.

---

## 10. WHERE EVERYTHING IS

| Thing | Path |
|---|---|
| The gate | `scripts/design-brain/check-brain-links.mjs` |
| Its wiring | `.githooks/pre-commit` (path-conditional), `package.json` → `brain:links`, `brain:links:titles` |
| The corpus | `docs/ai-workflow/design-brain/` (28 files) |
| Reviews + packets | `docs/ai-workflow/AI-HANDOFF/GLM-*.md` |
| This handoff | `docs/ai-workflow/AI-HANDOFF/DESIGN-BRAIN-REPAVE-HANDOFF-2026-08-16.md` |
| Durable lesson | `docs/ai-workflow/hermes-learning-packets/20260816-build-the-counter-before-you-quote-the-count.md` |
| Session memos | `.ai-workflow/hermes-inbox/pending/20260816T*-vs-claude-*.md` (4 for this workstream) |
| Tracker | SWA-163, In Progress, 3 comments |

---

## 11. THE ONE-PARAGRAPH VERSION

A design-doctrine corpus rotted silently because a canonical file was renumbered and nothing pointed at the new numbers; agents resolved dead pointers by skipping doctrine, so quality degraded while every file still read correct. This branch repaired 25 dangling references, 4 index-law violations, 4 orphaned rows and 20 wrong-target pointers, and — more importantly — replaced the discipline with a six-class gate that blocks the rot at commit time and refuses to run if its own documentation is out of date. Three hostile reviews and fourteen dry-loop rounds found that most of my repairs initially carried worse bugs than they closed, almost always because my proof was scoped to the inputs I had in mind. **Nothing is merged. Five decisions belong to Sean, four reviews are owed, and the corpus is CLEAN as of `89fa3eb39`.**

# SWAN BRAIN (Design Brain) — repave fix plan + "is this rot spreading?" — hostile review packet

- **Target branch:** `claude/design-brain-repave-20260816` @ `6798ae029` (17 commits, pushed, NOT merged)
- **Corpus:** `docs/ai-workflow/design-brain/` — 28 markdown files, the doctrine every AI agent loads before building UI
- **Gate:** `scripts/design-brain/check-brain-links.mjs` — currently CLEAN, suite 73/73
- **Date:** 2026-08-16

> ## ⚠ POST-REVIEW CORRECTIONS (added after the four reviews returned)
>
> The four reviewers read **v1** of this packet. Two of its claims were wrong, and both are
> corrected inline below and marked `[CORRECTED]`. They are recorded here rather than silently
> edited, because a packet that quietly repairs itself teaches nothing.
>
> 1. **§3.1 carried a FALSE load-bearing claim** — "reconciling changes geometry on every surface
>    in the app." **Fable rated this CRITICAL and was right.** The evidence refuting it sat three
>    lines below the claim in the same section: the scales appear in 7 documents and **0 lines of
>    code**. Nothing shipped reads either scale, so reconciling the docs ships **zero** visual
>    regression. I inherited the sentence from the prior handoff and repeated it *while pasting the
>    grep that disproves it*. Verified independently after the review: no code reads the brain's
>    scales, and there are 0 references to `swan/spacing` / `swan/z-scale` / `swan/two-speed`
>    anywhere in `frontend/` or `backend/`.
> 2. **§5.2 over-claimed a negative.** "Largely DISCONFIRMED" was asserted across *all* citation
>    forms on the strength of a control that validated exactly *one* form. GLM and Fable caught
>    this independently. Corrected to: disconfirmed **for the `<file>.md §N` form only.**
>
> **New evidence gathered after the reviews** (both with their own positive controls) is in §5.4.

---

## 0. YOUR REMIT — ANSWER THESE TWO QUESTIONS

1. **How do we plan to fix the issues that remain?** Five are unfixed and belong to the owner (§3). Give a concrete plan per item, not a preference.
2. **Is this happening anywhere else?** The rot class is *silent structural decay in a doctrine corpus*. §5 shows where I already looked and what I found. Tell me where I did **not** look.

### Output format — TABLES FIRST, PROSE LAST (this is a hard requirement)

Two prior reviews of this workstream **truncated at the output-token cap with ~26k of 32k spent on reasoning**, losing their conclusions. So:

1. Open with a findings table: `ID | severity | claim | file:line evidence | proposed fix`.
2. Then a second table answering question 2: `where else | is the rot present? | how you'd check`.
3. Only then prose. If you run short, the tables must already carry the answer.

### What is already known — do not spend budget re-deriving these

Everything in §1–§5 is established and evidence-backed. Findings that merely restate them are low value. **Spend your budget on new ground: the fix plans in §3, and the unexamined surfaces in §5.3.**

---

## 1. THE DEFECT CLASS, STATED ONCE

A canon rewrite renumbered `design.md` from 28 sections to 17. **No satellite file followed.** Nothing errored. An agent that follows a dead pointer resolves it *safely* — by silently skipping the doctrine it cannot find — so the corpus degraded while every individual file still read correct.

Measured against the original `origin/main` corpus: **34 structural defects** — 25 dangling refs, 4 unindexed files, 4 orphaned index rows, 1 impossible bare ref. Plus 20 wrong-target refs (pointers that *resolve* but land on the wrong section) found later.

**The count progression is the single most important fact here:**

| Instrument | Dangling refs found |
|---|---|
| Hand grep | 10 |
| Checker v1 | 16 |
| Checker final (backticks, ranges, paths, decimals, letters) | **25** |

The corpus never changed. Every published count was confident, evidence-backed, and low. **A count is a property of the instrument, not of the world.** Assume every number in this packet — including mine in §5 — is a lower bound.

---

## 2. WHAT THE GATE NOW DOES (and how I verified it, independently, today)

`npm run brain:links`, plus pre-commit on any `design-brain/` or `scripts/design-brain/` change. Six classes:

| ID | Class | Catches |
|---|---|---|
| D1 | DANGLING | `<file>.md §N` where N doesn't exist in that file. Canon *and* satellite-to-satellite. Ranges expanded. |
| D2 | UNINDEXED | A file missing from `index.md`, whose own law is "every file in this folder is listed here". |
| D3 | ORPHANED | An `index.md` row presenting an atticked/deleted file as live doctrine. |
| D4 | IMPOSSIBLE | A bare `§N` resolving under no reading. |
| D5 | PHANTOM | A `<file>.md §N` citation whose file exists nowhere in the repo. |
| D6 | ATTICKED | A citation of doctrine surviving only in `docs/_attic/`. Dated 5-file baseline. |

Plus a **startup self-check**: the gate refuses to run if it emits a `D<n>` class its own header doesn't document.

### My independent verification (not the author's self-report)

The handoff warns: *"Do not trust CLEAN on sight. This checker reported CLEAN over a broken corpus once already."* So I ran a positive control before believing anything.

I injected one defect per class into **`obsidian/index.md`** — a *subdirectory* file whose basename collides with the root `index.md`. That collision is the exact shape that hid the worst bug of the session (§4.1). Results:

| Injected | Detected? | Gate output |
|---|---|---|
| D1 `design.md §99` | ✅ | `D1 DANGLING — 1 reference(s)`, FAIL |
| D4 bare `§99` | ✅ | `D4 IMPOSSIBLE BARE REF — 1`, FAIL |
| D5 `totally-not-a-real-file.md §2` | ✅ | `D5 PHANTOM FILE — 1`, FAIL |
| D2 new unindexed subdir file | ✅ | `D2 UNINDEXED — 1`, FAIL |
| (restore) | ✅ | CLEAN, 28 files, 75 refs, 0 defects |

Suite: **73/73 pass, 0 fail** across 10 files. Baseline CLEAN confirmed before and after.

**Attack this verification.** I did not inject D3 or D6 (both need corpus-shape setup, not a one-line append). If that omission matters, say so.

---

## 3. THE FIVE UNFIXED ITEMS — QUESTION 1 IS ABOUT THESE

These are deliberately not fixed. The owner decides; **your job is to give him the plan and the consequences of each option**, including which is reversible.

### 3.1 The token schism — two conflicting scales, neither enforced

- `design.md` §9: radius `20` cards · `12` controls · `999` pills · `24` modals; spacing `4 8 12 16 24 32 48 72 108 160 240`
- `typography-grid.md` §5: `6/10/16/24/9999`, buttons at `10`

**Both are canonical. They contradict. Nothing mechanically enforces either.**

> **[CORRECTED]** v1 said here: *"Reconciling changes button and card geometry on every surface in
> the app."* **That is false.** No shipped code reads either scale — verified twice (7 docs / 0
> code, and a second post-review grep of `frontend/` + `backend/` finding zero `swan/*` scale
> references). Reconciling the documents is a **doc-only change with zero visual regression**.
> The migration crisis was fictional, and believing it is what would keep the schism alive: a
> worker-bot told "this is an app-wide migration" defers a one-commit fix indefinitely.

> **VERIFIED TODAY (positive-control grep):** `swan/spacing`, `swan/z-scale`, `swan/two-speed` appear in **7 documents and 0 lines of code**. The only real token linter, `scripts/ci/check-token-discipline.mjs`, checks raw hex — not these scales.

**Question:** what is the migration path that does not ship a visual regression across the whole app? Is there a defensible "canon wins, satellite documents the exception" rule, or must one scale die?

### 3.2 `design.html` — a wrong-target generator

It does **not** mirror canon. It has its own numbering (§2 TYPOGRAPHY, §3 SPACING, a §7→§12 gap) against canon's §2 Taste Bible, §3 Optics. Anything citing it by section lands somewhere unintended. **Retire it, maintain it honestly, or regenerate it from canon?**

### 3.3 A fictional build mechanism, stated as fact in canon

`design.md:14` claims `design.html` is generated by `pnpm canon:build`, with CI reverting hand edits. **There is no such script, no such CI job, and the repo does not use pnpm.** Fix the claim, or build the mechanism?

### 3.4 Rule 40's dead `§18` — present in BOTH constitutions

`CLAUDE.md:157` and `AGENTS.md:163` both cite `cinematic-pages.md §8/§18`. Max is §17. **§18 has never existed in any revision.** `§8` is correct. A one-character fix in the constitution — deliberately untouched because the constitutions are governed separately and a guard blocks unreviewed rule edits.

### 3.5 `adapters/knowledge.md` — an entire routing table pointing at the attic

Its whole Policy column points at four atticked files, while its header says "real policy lives in `../obsidian/` and `../graphify/`" — directories that now hold **one index file each**. **Retire, rewrite, or restore?** This file is the entire content of the D6 baseline.

---

## 4. THE FAILURE PATTERNS THAT PRODUCED ALL THIS

These recurred *within one session*, several **after being written up**. They are why the work took three review rounds and fourteen dry-loop rounds. Judge the fix plans in §3 against them.

**4.1 Proof scoped to the inputs you had in mind — 4 instances, still recurring.**
The worst bug: after re-keying a map by full path, D4 still looked it up by basename. Every subdirectory file broke; `obsidian/index.md` silently read the **root** index's data. The author's "all four classes re-proven by injection" ran on a **root-level file**, where `basename(rel) === rel`. **The test could not have failed.** Also: bounded a DoS on dash-ranges, left comma-chains unbounded; widened a separator class and was still one character short; "proved" D3 by injecting a class that never occurred.

**4.2 Believing a negative from an unvalidated instrument — 5 instances.**
An empty grep looks identical to a broken grep. `git show <rev>:<path>` mangled by MSYS path conversion → git errored → `grep -c` on empty input returned `0` → read as a finding. A grep requiring whitespace after a filename found nothing, so a **correct** GLM finding (`anti-patterns.md §27`) was dismissed — twice.

**4.3 Documentation drifting from behaviour — 4 instances.** Header docstring, hook message, and README each described a defect set the code had moved past.

**4.4 Fictional mechanisms — 4 in this corpus.** Doctrine describing enforcement that was never built. **The fake one does active harm: it tells every future reader "this is handled."**

**4.5 One habit wearing three costumes.** Three case-comparison bugs, all passing today only because every filename in the corpus is lower-case. **Tests were green throughout — the fixtures share the coincidence.** Reading the comparisons found them; running them never would have.

---

## 5. QUESTION 2 — "IS THIS HAPPENING ANYWHERE ELSE?" WHAT I ALREADY FOUND

The brain's gate only walks `docs/ai-workflow/design-brain/`. Consumers outside it cite brain sections and **nothing resolves them**. I scanned for that today.

### 5.1 Method (attack this — the method is the finding)

I wrote a scanner reusing the gate's `refsIn()` and `sectionsOf()` regexes **copied verbatim**, because a divergent grammar was itself one of this session's bugs (§4.1) and an approximate copy would produce a count that is a property of my script.

**Instrument validation, mandatory before reporting any absence (§4.2):** the scanner must re-find the known-dead `cinematic-pages.md §18` in both constitutions, or it exits and reports nothing. **It passed** — found the control at `CLAUDE.md:157` and `AGENTS.md:163`.

Scope: `CLAUDE.md`, `AGENTS.md`, `ACTIVE-INDEX.md`, `.claude/`, `.agents/`, `scripts/`, `docs/ai-workflow/references/`, `docs/ai-workflow/AI-HANDOFF/`, `docs/ai-workflow/hermes-agentic-os/`, `AI-Village-Documentation/`. Extensions: md, mjs, js, ts, tsx, json, yaml, yml, sh, ps1. **2,031 files scanned; 428 brain citations found outside the brain** — measured at `6798ae029`, *before* this packet and the four reviews existed.

> **⚠ THIS MEASUREMENT PERTURBS ITSELF — found in a dry-loop round after committing.**
> Re-running the identical scanner after this review round returns ~2,037 files and ~470+
> citations. Nothing rotted. The delta is *exactly* the documents this review round produced:
> a packet and four reviews that discuss dead references necessarily **contain** dead references
> (the quoted-defect vocabulary — `§99`, `§18`, and so on).
>
> **Do not read the figures above or below as stable.** The first draft of this very warning
> pinned an exact count; the next dry-loop round re-ran the scanner and found the count had moved
> **again, by exactly the two citations this warning paragraph introduced.** A number that changes
> when you describe it cannot be quoted as a fact — only the *mechanism* can. That is why no
> current figure is given here: any number printed in this file is falsified by the printing.
>
> **So the E-bucket is not merely "expected and harmless" — it is self-inflating, and it grows
> every time anyone reviews it.** Any future count over `AI-HANDOFF/` is a measurement of how much
> review has happened, not how much rot exists. This is the §1 lesson in a new costume: the count
> moved without the world moving, because the instrument's *scope* now includes its own output.
>
> **Consequence for the fix plan:** Fable F-5 and Kimi F14 both asked for a quarantine convention
> for quoted defects. This makes it non-optional — without a marker excluding review documents
> **by marker rather than by directory**, the number is uninterpretable and trends upward forever.

### 5.2 Result — the hypothesis was largely DISCONFIRMED

| Citing surface | Dead refs | Assessment |
|---|---|---|
| **A — Constitutions** (`CLAUDE.md`, `AGENTS.md`) | **2** | **REAL.** Both are the known §18 (§3.4). |
| **B — Skills** (`.claude/skills`, `.agents/skills`) | **0** | Clean. |
| **C — Reference docs** (`docs/ai-workflow/references/`) | **0** | Clean. |
| **D — Code** (`scripts/`) | 1 | **False positive** — the gate's own source comment using `index.md §3` as an *example* of the collision bug. |
| **E — Handoff records** (`AI-HANDOFF/`) | 111 | **Expected and harmless** — review documents *quoting* defects, e.g. `design.md §99, 99, 99` as a DoS test vector. |

**[CORRECTED] So: the handoff's `[HYPOTHESIS]` that skills, scripts, and JSON schemas carry dead brain refs is disconfirmed *for the `<file>.md §N` citation form only*.** Outside the brain, in live doctrine, that form yields exactly **2** dead refs and both were already known.

> v1 said "largely DISCONFIRMED" without that qualifier. My control validated **one** citation
> form; declaring a negative across **all** forms is the §4.2 failure committed inside the
> document that describes §4.2. The scanner also resolved only refs *to brain files*, so
> non-brain→non-brain rot **could not have been found even while the control passed** — the §4.1
> failure (proof scoped to the inputs you had in mind) applied to my own instrument.

### 5.3 But here is what that scan CANNOT see — this is where I want your attention

**(a) A fifth latent rot class I found while validating: the corpus has four heading dialects, and two files with no numbering at all.**

| File | Heading dialect | Consequence |
|---|---|---|
| `design.md` (canon) | `## §9 Title` | `§N` valid |
| most satellites | `## 4. Title` | `§N` valid |
| `cinematic-pages.md` | `## 15.1 Title` | decimals valid |
| `adapters/reviewers.md` | `### A1. Title` | **lettered — numeric `§N` is a category error** |
| `field-techniques.md` | `## T1 — Title` | **T-prefixed — numeric `§N` is a category error** |
| `index.md` | `## What belongs in this folder` | **NO numbering — every `index.md §N` is unresolvable by construction** |
| `anti-patterns.md` | `## Stack & token bans` | **NO numbering — this is why `anti-patterns.md §27` was a real defect** |

**Nothing tells an author which dialect a target file uses.** A citation form valid for one file is meaningless for another, and the author gets no feedback. Is this the *actual* root cause, upstream of the renumbering? Should the fix be a normalized heading scheme rather than a better link checker?

**(b) Prose and title-form references are invisible to every check, including `--titles`.** "the accessibility floor", "the Two-speed law", "the Taste Bible" — these are how agents actually cite doctrine in practice. **Completely unmeasured. I have no count and no method.** This may be far larger than the 25 structural refs. How would you measure it?

**(c) Surfaces I did not scan at all:** the frontend source tree (`frontend/src/**` — comments citing design doctrine), backend, `.github/`, git hooks outside `scripts/`, and any doctrine cited from inside skill *frontmatter* rather than body.

**(d) The reverse direction is unchecked:** the brain cites 6 external files (`SWAN-CINEMATIC-DESIGN-SYSTEM.md`, `HERMES-SWANSTUDIOS-OPERATOR-BRIDGE.md`, `SWANSTUDIOS-AI-SKILL-AND-OPERATOR-REGISTRY.md`). The gate confirms those files **exist** but explicitly **does not parse their sections** — so all 6 `§N` values are unverified. Those are live doctrine pointers with zero validation.

### 5.4 NEW EVIDENCE — gathered after the reviews returned

Three things the reviewers asked for, now measured. Each ran its own positive control first.

**(i) All six gate classes now have a positive control — GLM's R7 was right and I was wrong.**
v1 §2 omitted D3 and D6, justifying it as "needs corpus-shape setup, not a one-line append."
**That justification was false.** Both are one-line injectable and both fired:

| Injected (one line each) | Result |
|---|---|
| D6 — cite atticked `vault-routing.md §1` from `obsidian/index.md` | ✅ `D6 ATTICKED CITATION — 1`, FAIL |
| D6 variant — cite `KARPATHY-WIKI-OPERATIONS.md §2` | ✅ `D6 ATTICKED CITATION — 1`, FAIL |
| D3 — append an index row naming a non-live file | ✅ `D3 ORPHANED — 1`, FAIL |

Corpus restored to CLEAN after each. **6/6 classes now have executed proof, not 4/6.**
(One correction to GLM's own reasoning: it described the D6 baseline as a list of *attic
basenames*. It is a list of five *citing files* that are exempt — `ATTIC_CITATION_BASELINE`,
keyed by full corpus-relative path. The finding stands; the stated mechanism was wrong.)

**(ii) `frontend/src` + `backend` — the surface Fable ranked highest (F-6) — is CLEAN.**
Control first: the scanner had to re-find brain refs I had already seen by eye inside `.ts`
comments; it found 7. Then: **8,451 code files scanned · 11 brain citations found in code · 0 dead.**
Ten use the `§N` form (9 → `design.md`, 1 → `motion.md`); one uses a prose form,
`design.md section 10` at `TrainerHomeTab.layoutStyles.ts:13`, which resolves.

**This is a real answer, with a real limit.** Doctrine citations *do* live in code, right beside
the components they govern — Fable was right that this surface matters. Today none are dead.
But nothing gates them, so this is a **snapshot, not a guarantee**: the next canon renumber
breaks them silently and no check would notice.

**(iii) A third citation grammar exists, and my scanner is blind to it.** `design.md section 10`
uses the word "section", not `§`. The gate's `refsIn()` requires `§`, so this form is invisible
**everywhere, including inside the brain**. One instance in code; unmeasured in the corpus. This
is §5.3(b) with a concrete example — and I found it only because I re-read output I had already
called clean.

---

## 6. THE PROPOSED NEXT SLICE — CRITIQUE THIS PLAN

**Sweep every "enforced by / generated by / reverted by CI" claim in the brain and mark each real or fictional.** Four known instances (§4.4).

**Stated acceptance criterion:** the sweep must not become a *fifth* fictional mechanism. Whatever it produces has to be re-runnable and must fail on a new false claim, or it is a one-time audit wearing a gate's costume.

**Questions:** Is that the right next move, or is §5.3(a) — the dialect problem — the higher-value fix? Is the acceptance criterion sufficient? How would you mechanically detect a claim of enforcement, given that such claims are written in prose?

---

## 7. GROUND RULES FOR YOUR REVIEW

- **Cite `file:line` for every finding.** A finding without evidence is a hypothesis.
- **If you cannot verify a mechanism, say so** rather than asserting it exists. In your first review of this workstream you claimed a linter enforces canon; **it does not exist**, and acting on that fiction would have licensed changing button geometry app-wide. Your observations have been reliable; your *causal attributions* have not. Flag your own confidence.
- **Say plainly where a design is already right.** Do not manufacture findings to fill a quota.
- Severity: CRITICAL (ships a wrong build) / HIGH (silent doctrine loss) / MEDIUM / LOW.
- Tables first. If you are running out of output budget, drop prose, never the tables.

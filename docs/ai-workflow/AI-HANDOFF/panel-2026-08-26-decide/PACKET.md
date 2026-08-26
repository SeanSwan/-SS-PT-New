# PANEL PACKET — HOSTILE REVIEW + DECIDE WHAT HAPPENS NEXT

## READ THIS FIRST

**You CANNOT read files.** Everything is here. Do not plan to inspect anything.

**This is a DECISION packet, not an analysis packet.** Sean has no paid credits left; you
(GLM 5.3, Ox Alpha) and the authoring agent are the entire review capacity. The output that
matters is **what to do in the next hour**, not a taxonomy.

**The authoring agent has been wrong repeatedly in this workstream about work it was
confident in** — including shipping a gate-flip through an unverified channel one commit
ago. Assume there is another one sitting in what follows.

**Answer every question. Dissent is mandatory.**

---

## PART 1 — WHAT IS SITTING UNMERGED

Two open PRs, both `MERGEABLE` / `CLEAN` against current `origin/main`. Nothing has been
merged in ~2 days of work. `origin/main` has moved **16 commits** ahead in that time (a
different agent shipping "Forge" UI work).

### PR #82 — money-path rescue · 8 commits · +2138 −92 · 39 files

Fixes stranded on an abandoned WIP branch, **never deployed**. Render deploys from `main`.

- The pricing sheet handed to prospects advertised a **$200 tier that does not exist** and a
  10-session pack at $160/session labelled "Save $200" — a volume discount the business does
  not offer.
- Clients were shown an **invented late fee**: code fell through to an $88 admin placeholder,
  wrong for anyone on the $110 package (real figure $55).
- Cancellation charge now **server-derived** instead of trusted from the caller.
- Pricing **fails closed** when package pricing cannot be loaded.
- Warning UI and service **disagreed on the 24-hour boundary**.

Verification: **68/68 tests** (41 frontend / 27 backend), `tsc --noEmit` exit 0 whole-frontend
baseline-clean, `node --check` clean on 3 backend modules, frontend-guards + secret scan CLEAN.

Method note: `main` had its own Jul 5 – Aug 13 work in the *same files* (billing policy,
credit double-deduct repair, trainer-calendar isolation). A file-copy would have dropped it,
so this was a commit-by-commit port. Two conflicts resolved with evidence.

### PR #83 — operating-system doctrine · 7 commits

1. `grill-me` made standalone + values-first; a `SWAN-VALUES-CORPUS.md` created.
2. Six-seat panel folded — **the corpus was gutted to EMPTY** after all seats called it
   "artifact #1,608 with better branding"; hard ~2KB cap, mandatory eviction, ack dates.
3. `npx-decoy` gate (verifier substitution) + `measure-plan-rot.mjs`.
4. **Rules 15 / 64 / 68 amended in `CLAUDE.md` + `AGENTS.md`** — Rule 68's "ZERO further
   questions" retired; Rule 15's universal quantifier replaced by a checkable allowlist
   (money/auth/data-migration/PII/outward-facing); plans redefined as runtime artifacts,
   never committed.
5. Heredoc gate flipped SHADOW → ENFORCE, then **re-fixed** when the dry-loop found the flip
   had been shipped through an unverified `settings.json` env channel. Now inverted in code.
6. Two Hermes learning packets; panel replies committed as evidence.

---

## PART 2 — THE EVIDENCE BASE (measured, not asserted)

**Plan rot** — 793 persisted docs × 350k transcript lines: **51.1% never re-read.** Split by
class: direction/vision **38.1%** re-read, implementation blueprints **14.4%**. What rots is
the *solution* commitment, not the *problem* definition.

**Mined error corpus** — 1,208 memos, 644 with a hook-required "Mistakes I made" section,
**2,514 confessed error bullets.** Top classes:

| n | % | class |
|---|---|---|
| **400** | **15.9%** | repeated an error after being warned |
| 190 | 7.6% | claimed done without proof |
| 125 | 5.0% | shell quoting / heredoc / escaping |
| 122 | 4.9% | stale / wrong branch or tree |
| 117 | 4.7% | scope creep / did not do the ask |

(53% unbucketed — every number is a floor.)

**The gated-vs-ungated contrast, observed on the authoring agent in one session:**

| class | times | had a write-up? | what stopped it |
|---|---|---|---|
| shell escaping in `node -e` | 4 | yes, repeatedly | changing technique by hand |
| CRLF multi-line anchor | 5 | yes | changing technique by hand |
| `$?` after a pipeline | 2 | yes | **the gate — in seconds, both times** |
| facade / described-not-wired | 1 | yes (14 in corpus) | the dry-loop |

**Prior panel rulings, unanimous:** `lesson-recall-gate` is a **Stop** hook and therefore
structurally too late ("a eulogy, not a guardrail"). You gate *mechanisms*, not recidivism.
Intra-session repeats prove **the lesson was already in context** — context-presence does not
produce compliance. **No new skill clears the ladder bar** (78 exist).

**Standing, unfixed:** `SOUL.md` untouched (separate machine, no hooks). ~195 code commits
still stranded on the WIP branch. Hermes inbox drained 512 → 1, but the *emission requirement
that created it* is untouched, so it will refill.

---

# THE QUESTIONS

## Q1 — HOSTILE REVIEW: what is wrong with what is sitting unmerged?

Attack PR #82 and PR #83 as described. Specifically:
- **#82 is money-path code.** Server-derived charges, fail-closed pricing, a 24-hour
  boundary. What could this break that 68 passing tests would not catch? Name the failure
  mode, not a category.
- **#83 changed the constitution.** Rule 15 now gates on an allowlist — what work does that
  allowlist *fail to cover* that the old universal rule did cover? Is there a class of
  dangerous change that is neither money, auth, data-migration, PII, nor outward-facing?
- The heredoc gate now **blocks by default for every agent on this repo**, including Codex.
  What breaks on Monday morning that nobody has thought of?

## Q2 — MERGE OR NOT, AND IN WHAT ORDER?

Give a decision, not options. Consider: #82 has a **running business cost** (live mis-quote
to prospects) but touches money code. #83 changes the rules every agent operates under and
turns on a blocking gate. `main` moves under both.

If your answer is "merge #82 now, hold #83," say what specifically must be true before #83
lands.

## Q3 — WHAT IS THE SINGLE HIGHEST-VALUE NEXT ACTION AFTER THE MERGE DECISION?

One thing. Candidates already identified but **not built**:
- Move `lesson-recall` off Stop to a pre-act hook point (attacks the #1 class, 400).
- Exactly-once-assertion elimination for scripted string-replace (3/3 seats: dies at tier 1).
- Worktree-per-lane to eliminate the stale-tree class (122).
- **Stop the memo emission requirement** (the inbox refills otherwise).
- Triage the ~195 stranded commits.
- `SOUL.md`.

Rank the top three by **expected error-reduction per hour of effort**, and name the one to
start. If your answer is "none — stop building and merge what exists," say that.

## Q4 — What is MISSING that nobody has proposed?

Given the mined data and the gated-vs-ungated contrast, name something absent. Do not pad.

## Q5 — ADVERSARIAL + DISSENT (mandatory)

- **Steelman that the correct action is to close both PRs unmerged and revert the
  constitution changes.** Then say whether you believe it.
- **Where is this packet wrong?** The author has shipped a facade once already in this
  workstream and has been corrected by panels three times. Find the next one.

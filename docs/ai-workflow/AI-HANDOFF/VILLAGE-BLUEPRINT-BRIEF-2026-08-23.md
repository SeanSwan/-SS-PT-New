# Village Brief — architect the operating files an agent boots into

**Asked by:** Sean (owner) · **Prepared by:** vs-claude (claude-opus-5), 2026-08-23
**Repo:** SwanStudios (SS-PT) · **Branch:** `wip/comms-notifications-2026-07-05`, **2,209 commits behind `origin/main`**

You are one seat on a panel. Read §5 before you reason. It exists because a previous
panel on this same programme had **7 of 7 seats echo back a false premise** that was
stated confidently in the brief. Fable was the only seat that audited premises before
answering. **Audit these premises. Disagreeing with this brief is the highest-value
thing you can do.**

---

## 1. What Sean actually wants

Not "fix bugs." Across two sessions, in his words:

1. **Stop the same errors recurring.** They have recurred for months, across every agent.
2. **Use the recorded evidence to rewrite the operating files** — `CLAUDE.md`,
   `AGENTS.md`, the Hermes workflow, and `SOUL.md`.
3. **Make boot context small.** An agent should start able to *think fast and move
   quickly*, not wade through a giant rulebook. **This is a performance goal, not tidiness.**
4. **Build guards so the errors cannot happen**, rather than writing them down again.
5. Produce the **blueprint, wireframe, flowchart and mermaid** for how to do this.

**`SOUL.md` does not exist.** Sean named it as a file to update; there is no such file
in the repo. Treat its purpose as an open question — proposing what it should be (or
that it should not exist) is in scope.

## 2. Ground truth — measured today, not remembered

| Fact | Value | How measured |
|---|---|---|
| `CLAUDE.md` | **164,499 bytes** ≈ **49k tokens** | `wc -c`; tokens at 3.36 chars/token, the ratio this panel's own harness reported on this brief |
| `AGENTS.md` | **169,319 bytes** ≈ **50k tokens** | `wc -c` — 45-line Codex adapter + a **byte-for-byte duplicate** of `CLAUDE.md`'s 988-line body |
| Boot surface **per agent** | **~164 KB ≈ 49k tokens** | **CORRECTED — see §5.9.** Claude loads `CLAUDE.md`; Codex loads `AGENTS.md`. Neither loads both. |
| Duplicated rulebook **in the repo** | **~164 KB** | real, and it is why the mirror has already drifted — but it is a *maintenance* cost, not a per-agent *context* cost |
| MANDATORY rules **defined** | **73** (1–73, no gaps, no duplicates) | script, bounded to the section, column zero |
| MANDATORY rules **claimed** in prose | **66** | same script |
| Rules recorded on the tracking issue | **83** (max rule 83) | almost certainly `main`; this branch is 2,209 behind |
| Files carrying self-reported issues | **612** = 528 memos + 84 packets | inventory index, row-counted |
| Total issues recorded | **2,546** = 2,096 memo + 450 packet | inventory index, summed |
| Mistake bullets in the machine extract | **2,096**, from exactly **528** files | `memo-mistakes.json` |
| **Extract scope** | **MEMOS ONLY — all 84 learning packets (450 issues) are absent** | 2,096 + 450 = 2,546 exactly. See §5.10 |
| Bullets the classifier labels | **904** = 43.1% *of the extract* | script |
| **TRUE verified coverage of the corpus** | **904 / 2,546 = 35.5%** | not 43% — §5.1 |
| Registered hooks in `HEAD` | **14** | `git show HEAD:.claude/settings.json` |
| Hook test suites | **13**, all passing | self-attested, on this branch |
| Hooks documented in §6 | **7** — leaving **7 registered guards with no documented trigger, command or failure mode** | §6 vs the 14 above |

The rulebook cannot state its own size, and the three available numbers (66 / 73 / 83)
do not agree. That is now detected automatically, not fixed.

## 3. The governing finding

Measured across the memo corpus by phrase-matching:

```
caught because [ran/checked] ... 84      already written .......... 41
caught reading ................. 26      three times .............. 39
hostile round / pass ........... ~65     third time this session .. 13
rule-recall .................... negligible   (see §5 — NOT zero)
```

> **A rule that does not name its trigger and its command is not a rule. It is lore.**
> — Fable 5, Final-Decider ruling

Corollary added since: **a mechanism the agent must choose to invoke is not a mechanism.**

## 4. Machine-measured class distribution

From the 2,096-bullet extract — which is **memos only**. The 84 Fable-tier learning
packets, the corpus deliberately written to hold the *durable* lessons, contribute
**zero** rows to this table. **A bullet may carry several classes.**

| Count | Class | Meaning |
|---|---|---|
| 331 | `D_number_drift` | a number in a doc no longer matches reality |
| 313 | `C_green_not_correct` | a passing check that proved nothing |
| 234 | `A_instrument_lies` | the tool/harness reported the opposite of the truth |
| 123 | `E_process_shape` | the procedure itself produced the error |
| 104 | `B_absence_claim` | "X is missing" — and X existed |

**1,192 of 2,096 records (56.9%) carry NO class at all.** See §5.

## 5. WHERE OUR OWN EVIDENCE IS WEAK — read before reasoning

Do not treat §3 or §4 as established fact. Each of these is a known defect in our own
instrument, and a seat that reasons past them will produce a confident, wrong blueprint.

1. **The classifier verifies 35.5% of the corpus, not 43%.** Two losses compound: the
   extract holds 2,096 of 2,546 issues (packets excluded, §5.10), and the classifier
   labels 904 of those 2,096. **904 / 2,546 = 35.5%.** §4's ranking describes *the
   subset of memos our regexes happened to match*. `D_number_drift` may lead because
   number-drift is easy to pattern-match, not because it is most common.
   *(Corrected after ox-alpha computed this from the brief's own inconsistent figures.)*
2. **`caught by remembering a rule: 0` is an instrument artifact, not a measurement.**
   Nobody writes that sentence; an agent whose rule fired writes "checked first." The
   defensible claim is *rare and mostly unmeasurable*, not zero. **A previous panel
   reasoned from the zero. Do not.**
3. **The whole corpus is self-reported and survivorship-biased.** These are the
   mistakes agents *noticed and chose to write down*. Silent wrong outputs are
   structurally absent. We are optimising the visible error distribution and calling it
   the error distribution.
4. **The catch-profile numbers in §3 total ~268 against 2,546 issues — roughly 10.5%
   coverage** from an unaudited prose classifier. The programme's motivating claim
   ("mechanisms beat rules") rests on that 11%.
5. **Commit SHAs and "shipped" labels in §6 are claims from a brief, not verified
   facts.** A prior panel had three seats re-report an already-fixed defect because the
   brief listed fixed and open items together. Treat §6 as asserted.
6. **This branch is 2,209 commits behind `main`.** Any file we measured may differ
   there. The 83-vs-73 rule count is the known instance; there are probably others.
7. **"215 KB rulebook" appears in earlier framing; the measured size is 164 KB.** One
   of those is wrong and we have not reconciled which.
8. **We have zero false-positive telemetry on any shipped gate.** We count catches;
   nothing counts wrongful blocks. Attrition is the kill condition for every mechanism
   proposed here, and we are blind to it.
9. **THIS BRIEF ALREADY CONTAINED ONE — and two seats caught it differently.** The
   first version asserted a *"combined boot surface ~334 KB, both auto-discovered."*
   That was wrong. Each agent loads exactly one file: Claude reads `CLAUDE.md`, Codex
   reads `AGENTS.md`. Per-agent boot is **~164 KB ≈ 49k tokens**, not 334 KB.

   Gemini 3.1 Pro rejected the 334 KB figure — correctly — but replaced it with a
   different error, asserting the agent "is reading the exact same rulebook twice."
   It is not; there is one reader per file. **Both the brief and its first hostile
   reviewer got this wrong, in opposite directions, from the same two numbers.**

   The 164 KB duplication is nonetheless real and costly: it is precisely why the
   mirror has *already* diverged (a live drift finding on this branch today). It is a
   maintenance and truth-drift cost, not a boot-token cost. **A blueprint that halves
   boot context by deleting `AGENTS.md` is solving the wrong problem** — deleting it
   fixes drift, not speed.

   Kept here rather than quietly edited out, because it is the cleanest available
   demonstration of what §5 is for: the brief that warns you to audit its premises
   shipped with a false premise in its own evidence table.
10. **THE PACKETS ARE MISSING FROM THE EVIDENCE, AND NOBODY NOTICED.** The first
    version of this brief cited three different corpus totals — 2,546, 2,096 and 2,523.
    ox-alpha caught it and called the 450-record difference an unexplained ~18% silent
    extraction loss. It reconciles exactly, and the true answer is more interesting than
    loss: **`memo-mistakes.json` covers the 528 memos only.** 2,096 memo issues + 450
    packet issues = 2,546. Confirmed by summing the inventory index by kind.

    So it is a **scope boundary nobody documented**, not a lossy pipeline — and the
    consequence is worse than a rounding error: **every class distribution, every
    catch-profile number, and the entire "mechanisms beat rules" finding excludes the
    84 Fable-tier learning packets** — the corpus specifically written to hold durable,
    high-quality lessons. We ranked error classes using the lower-quality half and
    never said so. The 2,523 figure remains unexplained and should not be cited.
11. **The rule-count instrument may itself be an artifact.** GLM notes that "73" comes
    from a regex bounded to column zero, which by construction cannot see a rule
    indented inside a list, table or fence. The count is reproducible; that is not the
    same as correct. It has not been hand-verified against `main`.

## 6. What has shipped (ASSERTED — verify before relying)

> **RESOLVED TODAY, BEFORE THIS BRIEF WAS SENT — read this first.** The three hooks
> that were live in one working tree and in no commit — `spend-guard-gate` (Rule 16
> money gate), `egress-privacy-gate` (Rule 8 PII gate) and `exit-status-gate` — were
> **committed in `35a886bf5`**, together with the previously-untracked PII gate file
> and its first test suite. `HEAD` now registers 14 hooks; drift-check 8 reports clean.
>
> The first version of this brief described that as an open finding, because it was
> the finding that *motivated* check 8. Two free seats consequently spent their entire
> P0 slot on a fixed defect. **That is the second time this programme has burned panel
> capacity by listing fixed and open items in one undifferentiated table — the exact
> failure §5.5 warns about, committed again in the section §5.5 points at.** Fixed
> items are now marked inline below.

| Mechanism | What it does |
|---|---|
| Schema `mistake_terminal_state` | a mistake bullet must end in `MECHANISM:` / `LORE:` / `MERGED:`. **Token-presence only** — `MECHANISM: I will try harder` passes. |
| Review-debt ledger | debt opens when a review is owed; closeout blocks on it. **Closes by naming any artifact that EXISTS** — `README.md` closes any debt. Known hole. |
| Panel anti-clobber | refuses a colliding write before any seat spends. |
| Exit-status gate | PreToolUse(Bash); blocks `pipeline + bare $?`. 44 corpus hits — the most-recurring un-ruled class. |
| Lane-staged guard | pre-commit; refuses a commit carrying files the session never claimed. Opt-in by claiming. |
| drift-check 8 — hook provenance | is the guard protecting me present for anyone else? Found 3 hooks live in one tree and in no commit, including the spend gate and the PII gate. **✅ All three committed today (`35a886bf5`); check 8 now reports clean.** |
| drift-check 9 — rule-count | the rulebook cannot state its own size. |

## 7. Open items (our ranking — attack it)

1. **Leased claims.** Orphaned worktree ledgers, stale `EDITING NOW` claims, stuck
   locks and the shared git index may be **one problem: shared mutable state with no
   ownership lease.** Build owner + heartbeat + TTL + auto-release once and three
   collapse into configuration. *(ox-alpha's synthesis; unbuilt.)*
2. **Review-debt closes on existence, not content** — an authorization flaw.
3. **`settle()` is a two-phase write** where an atomic rename would do.
4. **Schema validity is scoped by wall-clock date** — packets minutes apart get
   different rules; a wrong clock bypasses or false-fails.
5. **Boot context is ~164 KB ≈ 49k tokens per agent.** No budget, no tiering, no
   measurement of what an agent actually reads before acting.
6. **THE THESIS ITSELF IS UNDER ATTACK — engage this directly.** Qwen 3.8 (free seat,
   already returned) argues the programme conflates *documentation* with *execution*:
   hooks are deterministic binary checks, but a large share of these errors are
   **semantic**. Its sharpest line: *"a hook cannot detect that a test passed but
   tested the wrong thing."* If true, `C_green_not_correct` (313 hits, the #2 class)
   is structurally unguardable and the guard-set deliverable is smaller than we think.
   Its prescription: **split the rulebook first, measure agent performance, and only
   then build more hooks** — because if the agent still fails on a small boot context,
   the problem was never lore-vs-mechanism. **Say whether you agree, and what
   experiment would settle it.**

---

## 8. DELIVERABLES — all six, in this order

**1. BLUEPRINT.** Target architecture for `CLAUDE.md` / `AGENTS.md` / the Hermes
workflow / `SOUL.md`. What is one file vs many; what loads always vs on trigger; how
the Codex adapter and the mirror survive it; what `SOUL.md` is *for*, if anything.

**2. WIREFRAME.** What an agent actually *sees* at conversation start — the literal
text/panes/order. Desktop terminal and a narrow view. This is a UI problem: the boot
surface is an interface.

**3. FLOWCHART + MERMAID.** Two graphs, in fenced ```mermaid blocks:
   (a) **trigger → command → refusal** for a rule that has become a mechanism;
   (b) the **boot-load path** — what is read, in what order, and what is skipped.

**4. BOOT-CONTEXT BUDGET — in two parts.** GLM's objection is accepted: we demand a
*measured* target while §7.5 concedes nothing measures what an agent actually reads. A
worker-bot told to produce "a measured token target" will invent one, and we will have
manufactured new false ground truth in the document that exists to stop that.
   - **4a — INSTRUMENT.** What to log to find out what boot context is actually read
     vs merely injected. Name the counter, where it lives, how long to collect.
   - **4b — BUDGET.** The target derived *from* 4a, the admission test (what earns a
     place, who decides), what you would cut from ~164 KB / ~49k tokens first, and what
     must never be cut. **Name the tokenizer/runtime you are budgeting for** — counts
     vary ±30% across tokenizers and the brief did not previously say.

**5. THE GUARD SET.** Which recurring error classes get a mechanism, which stay lore,
and — most valuable — **which are honestly unguardable.** For each mechanism: its
trigger, its command, its failure behaviour, and how it would be *switched off* by an
annoyed agent. A gate that gets disabled protects nothing.

   **CORRECTED — failure direction is not uniform.** The first version demanded
   fail-open plus a documented off-switch from *every* mechanism. Applied to the PII
   gate that is a specified leak path, and to the spend gate a documented budget
   bypass. Classify each mechanism first:
   - **Compliance gates** (PII egress, spend, secrets, auth): **fail CLOSED, fail
     LOUD.** Disabling requires owner approval and leaves an audit record.
   - **Convenience gates** (lint-shaped, coordination, hygiene): fail open, announce,
     and publish the off-switch — because here attrition is the real risk.
   Say which of the 14 registered hooks belong in which class, and justify any gate
   whose current behaviour contradicts its class.

   **6b. SUCCESS METRIC (required, not optional).** Define "recurring-error rate" and
   how to baseline it *before* any new guard ships. Without it, six artifacts get
   delivered, errors persist in the unmeasured 64.5%, and success is declared on
   artifact existence — which is the review-debt failure mode at programme scale.

**6. WHAT ELSE SHOULD SEAN HAVE that he has not asked for.** Charts, dashboards,
indexes, receipts, telemetry. Absence-first: name what is missing, ranked by the value
or risk it leaves on the table.

## 9. Output contract

- Lead with **PREMISE AUDIT** — which of §1–§7 you reject, and why. If you reject
  nothing, say so explicitly and say what evidence would change your mind.
- Then the six deliverables, numbered as above.
- Then **CONFIDENCE**: what you could not verify from this brief, and what evidence
  would settle it.
- Concrete over comprehensive. A blueprint a worker-bot could execute **with zero
  further questions** is the bar. Name file paths, section names, token counts.
- **Every deliverable must state its own storage tier** — always-loaded, on-trigger, or
  reference-only — and pass Deliverable 4b's admission test. Otherwise these six
  artifacts land beside `CLAUDE.md` as new always-discovered prose and boot context
  *grows* while the rulebook shrinks.

- **Binding constraints — the complete list (11).** The first version named five; GLM
  correctly flagged that a `CLAUDE.md` rebuilt from a truncated catalogue silently
  repeals whatever was left out:
  1. **No Material-UI** — styled-components only
  2. **Victory only** for charts (no Recharts in new work)
  3. **Dark-first**, default theme `crystalline-dark`
  4. **No hardcoded colours** — `var(--token, #fallback)`, Crystalline Swan palette
  5. **Dual-Button Glow** — blue bg → purple glow, purple bg → cyan glow
  6. **WCAG 4.5:1** contrast minimum
  7. **44px minimum** touch targets
  8. **≤300 lines per file** — *this one constrains Deliverable 1 directly: it is the
     only hard size cap the operating files are already subject to*
  9. **Zero PII to LLMs** — client IDs only
  10. **No "yoga"/"meditation"** language — use "stretching"/"flexibility"
  11. **"26+ years experience", NASM-protocol — never "NASM-certified"**

  Do not propose work that violates these; say so if one blocks a better design.

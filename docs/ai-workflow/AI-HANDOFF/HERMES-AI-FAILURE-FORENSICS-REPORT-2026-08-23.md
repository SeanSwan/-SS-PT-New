<!-- ASSEMBLED 2026-08-23 by vs-claude (claude-opus-5) from the three Stage-1 fragments in
     .ai-workflow/forensics-extract/ (_report_part1..3.md). Content is Hermes's Stage-1 analysis,
     joined verbatim and unedited; only this provenance header was added. Stage 2 (village panel)
     has NOT run. Counts are snapshot-pinned per the report's own living-source rule. -->

# AI Failure Forensics — Stage 1 Report

**Date:** 2026-08-22 · **Seat:** local Hermes session (solo, no external spend)
**Corpus examined (evidence base):**
- `docs/ai-workflow/hermes-learning-packets/` — **106 packets** (2026-07-11 → 2026-08-23), 1.1 MB, **snapshot 2026-08-23T03:33Z** (`snapshot-2026-08-23T0333Z.txt`; re-runnable via `snapshot_corpus.py`). Corpus size was **not stable during this audit — it grew 99 → 103 → 104 → 105 → 106** (commit `6a390c547` brought the count to 105; one concurrent landing added the 106th), so every count below is snapshot-pinned and would be re-run before delivery per the corpus's own "living sources go stale" lesson. Authorship, first-match per file at this snapshot: **72× `claude-opus-5`, 34× `claude-fable-5`, 0 unattributed** (106 files). **427 self-reported "Mistakes I made" bullets** across **87 of 106** packets at this snapshot (the 2026-08-22 verified snapshot of 104 read 416/85; both are self-consistent for their moment). A naive `grep -c originating_model:` at this snapshot returns **113 lines across 106 files — at least 7 packets carry a duplicate `originating_model` line**, which is why naive line-counts and per-file first-match disagree; the first-match reading is what I use.
- **86 of 106 / 87 of 104 packets (≈81–84%) contain a repeat-ledger ("Error → fix → repeat") table** — 86/106 by the audit's detector at the 2026-08-23 snapshot, 87/104 in the independently verified 2026-08-22 snapshot; published as a range across snapshots and detectors, not a point estimate. **The ledger ROW COUNT (per ledger) IS CONTESTED — three counting methods, three answers (Sean's independent recount, 2026-08-22):** loose row-match 364 rows / 138 already-written-up (37.9%); header-column-anchored 215 rows / 92 (42.8%); an earlier 16:20 parse 283 rows / 132 (46.6%). Per Sean's ruling, **no point estimate is published**: the tables are not formatted consistently enough for a single count to be trustworthy, and per the corpus's own law a number that survives by being repeated is the one to distrust. The **robust claim** that survives all three methods: **~38–47% — "close to half" — of recorded errors were already written up before they recurred.** Recurrence distribution (measured by column index): 202 of the parsed rows carry a count; recurred ≥2×: **70**; recurred ≥4×: **20** error classes; maximum: **12×**.
- `.ai-workflow/hermes-inbox/` (pending + consumed) — 30+ memos read directly, spot-checked against the digest corpus.
- `docs/ai-workflow/AI-HANDOFF/` — 764 files; selected high-signal handoffs and panel syntheses read, plus the git history of `CLAUDE.md` across all refs.
- `CLAUDE.md` / `AGENTS.md` — **read in two vantages**: the local checkout (`wip/comms-notifications-2026-07-05`, caps at Rule 70) and `origin/main` (164 numbered definitions, **max Rule 83**). Hooks: 20 files in `scripts/hooks/`, each purpose identified.
- Cost data: 393 distinct dollar figures cited inside packets; calibration tables give per-seat cost per panel.

**Method note on honesty:** this report is written by an AI that is itself the object class under study, using the corpus the system wrote about itself. I have marked with `[SELF-AUTHORED]` claims where the evidence is the system's own self-report, and I have preserved the corpus's own "caught by nothing" admissions verbatim. I found no mechanism to independently verify events that only the packets describe; those carry `[SELF-AUTHORED]` throughout.

---

## Q1 — Taxonomy: the actual classes of failure

Five mechanisms account for nearly everything.

**Honesty about the counts, stated up front:** the corpus has **427 self-reported "Mistakes I made" bullets** (106 packets at the 2026-08-23T03:33Z snapshot; 416 at the 2026-08-22 snapshot — the corpus kept receiving files while I work, so the figure moves too; both snapshots are self-consistent), and a single bullet frequently spans two or more of these classes, so **there is no clean per-class count and I will not invent one.** What I *can* measure is how often each class's named sub-mechanism appears in the corpus (phrase hits, case-insensitive, across all packets at the snapshot). I give those measured frequencies below where I name a mechanism, and I mark every figure I *did* measure. Class membership below is a thematic grouping, not a counted partition — I refuse to dress it up as a number I didn't derive.

**Measured phrase-hit frequencies (the real, if coarse, signal):** Class C sub-mechanisms dominate — "decorative/source-text suite" **17**, "guard refuses/blocks/cries-wolf/reinterprets gate" **6**, "11-tests-vs-38 / shared blind-spot" **4**, "gate scores adjacent / marker nobody emits" **3**, "test can't fail against its named defect" **3**, "tests-written-after-fix / never RED" **2**. Class D: "cost-from-memory / no-preflight" **5**, "number-survives/handoff-decays/git-deletion-not-retraction" **6**, "stale line-counts from memory" **2**. Class E: "panel deferred" **3**, "unprompted Linear-sync deferred" **3**, "review-displacing-delivery / delivery-inversion" **3**, "built-but-not-wired / flags dark" **1**. Class A: "pipe-status / tail-pipe blindness" **8**, "echo-in-same-statement ('no hit = dark')" **3**, "cooperative-platform test doubles" **3**, "self-authored prose reads as verified" **1**, "receipt is not evidence" **2**, "rg `-r`=replace misread" **1**. Class B: "false-absence / 'validate cwd before escalating'" **3**, "false-present / trusted a server I didn't start / 'counts not bytes'" **2**.

**Reading:** the single most-recurring mechanism in the corpus is **Class C — a check that passes while certifying the wrong thing is the dominant failure surface** (17 + 6 + 4 + 3 + 3 = 33 of the most-recurring named phrases), followed by **Class A — an instrument that silently lies** and **Class B — an absence/presence claim from an unvalidated observer**, which are the same root (A and B share the "the observer was wrong" mechanism — B is A applied to *existence*). These three are not three separate failure modes; they are *one* failure mode (trust-the-instrument) wearing three hats. Class D (drift) and Class E (process-shape) are separate roots.

### CLASS A — The instrument lies silently
*(The "trust-the-instrument" root. Most-recurring named sub-mechanisms: pipe/tail status blindness 8, echo-in-same-statement 3, cooperative-platform doubles 3.)*
**Mechanism:** a command, probe, test, grep, or pipe *produces no error*, and its output is read as truth. Sub-varieties with named incidents:
- **Echo-in-same-statement:** `cmd ... && echo "no hit = dark"` — a broken regex still prints the conclusion. `[20260814-a-documented-lesson-is-not-a-fix.md]` — "A regex parse error printed my '(no hit = dark)' conclusion anyway."
- **Pipe status blindness:** `npm test | tail` / `where X | head -1 || echo` — the pipe or wrapper's exit status is read as the command's. Recurred **three times in one session** in `[20260821-a-clean-tree-makes-stash-pop-a-loaded-gun.md]`. Same shape in `[20260821-a-hidden-window-stops-raf-and-everything-looks-dead.md]` ("Checked `$?` after a pipe, minutes after reading the handoff section that warned about it").
- **Wrong flag reads as evidence:** `rg -rn "X"` where `-r` is `--replace` — "Every match rendered as `n`, which read as a component literally named `n`." Nearly reported a catastrophic phantom bug. `[20260814-a-documented-lesson-is-not-a-fix.md]`
- **Dead context / stale server / silent buffer:** trusted a dev server an agent didn't start; attached to a dead CDP execution context; background jobs piped through `tail` briefly believed finished; `tail` buffering → "briefly believed" a long job done. `[20260820-promoting-an-element...md]`, `[20260820-check-the-checkable-claim...md]`, `[2026-08-16-review-packets-need-source-not-inventory.md]`.
- **Self-authored prose reads as verified:** author wrote code + the comment claiming opposite behavior; nine hostile rounds never caught it because "I kept re-reading the *comment* as if it were the *behaviour*. That is a specific and durable blind spot: **prose you authored yourself reads as verified.**" `[20260821-a-clean-tree-makes-stash-pop-a-loaded-gun.md]`
- **Test doubles modeling a cooperative platform:** injected doubles prove the branching, not the world — `[20260819-injected-doubles-prove-your-branching-not-the-world.md]`.
- **A receipt is not evidence:** presented an in-memory proof as pipeline evidence; "A system's own success report is not evidence that the work happened." `[20260821-a-receipt-is-not-evidence...md]`

**Models:** all three seat families (Opus 5, Fable 5, and delegated Haiku/GLM sweeps). **Cost:** unquantified directly, but this class includes the "six false *it's missing* claims" episode that preceded `[20260821-validate-the-instrument-before-reporting-absence.md]`, and the false-dispatch claim in a shipped synthesis `[20260821-preflight-the-billing-model...md]`.

### CLASS B — Absence/presence claims from an unvalidated observer
*(The same "trust-the-instrument" root applied to existence. Named incidents: false-absence "validate cwd before escalating" 3, false-present / trusted-a-server-I-didn't-start / "counts not bytes" 2.)*
**Mechanism:** declaring something *missing* (or present) based on a search that may not have had the right scope, cwd, config, or key.
- "Reported a missing API key that was present, and escalated it to the user." `[20260821-validate-the-instrument...md]` — the packet's decision line: "A tool reporting something missing is a claim about the tool's environment, not about the world. **Validate cwd and config before escalating an absence.**"
- "Declared a schema absent on the strength of a filter that could not have" `[20260821-a-caution-is-not-a-control.md]`
- "Searched for the working repo by an exact directory name and missed it" (same packet).
- Six false "it's missing" claims in one session, already written up, then "within the hour I made the same error." (same packet)
- **Reverse direction (false presence):** "Trusted a server I did not start." / "byte-identical" claimed on displayed counts, not bytes `[20260815-a-403-is-a-status-not-a-verdict.md]`.
- Recurrence self-score of this exact class: "already written up before recurring? YES — six false claims in an earlier session" `[20260821-validate-the-instrument...md]`.

**Cost:** one of these false-absence claims nearly produced a strategic error: 7 advertisers returning "no matching advertiser" was "about to be written up as 'competitors don't buy Meta ads' — a large strategic call." `[20260815-a-403-is-a-status-not-a-verdict.md]`

### CLASS C — Green ≠ correct: tests, suites, and gates that certify the wrong thing
*(The most-recurring mechanism in the corpus by measured phrase frequency: decorative/source-text suite 17, guard-refuses/blocks/cries-wolf 6, blind-spot 4, gate-scores-adjacent/marker-nobody-emits 3, test-can't-fail-against-its-defect 3.)*
**Mechanism:** a pass status is interpreted as proof of the property, not of what the check actually measured.
- **Tests written after fixes → never observed RED:** "Wrote 13 tests after their fixes, so none was ever observed RED." `[20260820-a-guard-that-refuses...md]`; "Wrote all 5 regression tests and proved each fails without its fix" (the *correct* counter-example, same file's reviewer).
- **Tests that cannot fail against their own defect:** "Test that cannot fail against the defect it names — **4** times — **Yes, repeatedly**." (repeat-ledger row, `[2026-08-17-a-guard-multiplies-a-chokepoint-does-not.md]`)
- **Source-text/decorative suites:** "Source-text suite passed 14/14 against neutered guards — sixth decorative" `[20260820-a-new-return-shape-has-n-callers.md]`; `[20260819-injected-doubles...md]`.
- **A green suite is evidence only about what you thought to check** (whole packet): 11 tests passed while the system's 38 found the hole. `[20260819-your-tests-share-your-blind-spot.md]` (title: "My 11 tests passed while the system's 38 found the hole I had just made").
- **A test required the bug:** `[20260816-the-test-required-the-bug.md]` — the regression only reproduces if the defect is present; it proves the defect exists, not that the fix works.
- **Tests can encode the bug** → became **Rule 79** (mainline). `[inbox 20260804T010000Z-social-swa101-merged-two-prs-live.md]`
- **A gate that scores adjacent properties certifies the failure:** authored a design gate, "reported its PASS as [proof]" — but "the gate could not fail what it existed to prevent." `[20260821-a-gate-that-scores-adjacent-properties-certifies-the-failure.md]`
- **A gate keyed to a marker nobody emits:** `[20260820-a-gate-keyed-to-a-marker-nobody-emits.md]`
- **A guard that refuses must also stop the caller** `[20260820-a-guard-that-refuses...md]`; **a guard that blocks the desired state** `[20260817-a-guard-that-blocks-the-desired-state.md]`; **a guard that cries wolf protects nothing** `[20260818-a-guard-that-cries-wolf-protects-nothing.md]`.

### CLASS D — Numbers, counts, and prose that drift from the artifact
*(Measured: number-survives/handoff-decays/git-deletion 6, cost-from-memory/no-preflight 5, stale-line-counts-from-memory 2.)*
**Mechanism:** a stated value (line count, check count, test count, price, percentage, "deleted", "complete") is written from memory or copied, and never re-measured after the artifact changed.
- "Wrote two line counts into a document from memory rather than measuring (README 196 vs 215…)", then "Repeated it twice more." `[20260820-a-gate-keyed-to-a-marker-nobody-emits.md]` — and: "The lesson was documented, **in the file open in front of me**, and I repeated it three times."
- "Wrote '54 checks' in a commit message from memory." It was 52. `[20260822-a-git-deletion-is-not-a-retraction.md]`
- "Counted `it(` lines and reported '13 tests.' Running them said 27." `[20260814-a-documented-lesson...md]`
- "Counted `it(` lines" / repeated stale counts: "Four stale counts in documentation, a class already written up twice in this repo." `[20260821-a-bound-always-leaks-one-character-wider.md]`
- **Costs quoted from memory:** "Quoted ~$0.25–0.35 for a paid review pass without re-estimating" `[20260820-a-new-return-shape...md]`; "Quoted a cost twice without running preflight" `[20260821-validate-the-instrument...md]`; "Wrote '≈ $0.75' for the panel spend before summing the headers. $0.66." `[20260822-a-git-deletion...md]`.
- **Whole packet: "A number survives by being repeated"** — "the fifth instance of the same class in one session and the first to reach outside the repo… SIXTH INSTANCE — and it happened while writing this correction." `[2026-08-21-a-number-survives-by-being-repeated.md]`
- "A handoff decays at its most confident claims." `[2026-08-19-a-handoff-decays...md]`
- "A git deletion is not a retraction" — "deleted" written when only the git copy was gone; vault and index still served it. `[20260822-a-git-deletion...md]`

### CLASS E — Process-shaped failures: delivery, deferral, chore-omission
*(Measured: panel-deferred 3, unprompted-Linear-sync-deferred 3, review-displacing-delivery/delivery-inversion 3, built-but-not-wired/flags-dark 1.)*
- **Panels deferred repeatedly:** "The owed panel is now deferred six times" `[20260821-a-parser-that-reads-the-whole-file...md]`; "Deferred a requested hostile panel twice, disclosing the omission only at closeout" `[20260821-a-receipt-is-not-evidence...md]`.
- **Linear unprompted sync deferred:** "Did not sync Linear unprompted. A gate had to ask. Sean has said he should never have to" `[20260821-a-green-test-can-be-why-the-bug-shipped.md]`; "Deferred the unprompted Linear sync twice, including once after writing up that exact lesson" `[20260821-a-gate-that-scores-adjacent...md]`.
- **Review displacing delivery** (program-scale, 2 days) — the row that became the delivery-inversion law. `[2026-08-16-delivery-inversion-law.md]`
- **Built-but-not-wired code accumulated:** the systemic pattern that triggered the 2026-08-14 origin/main audit; "three of three governed flags sat dark 26–27 days anyway" `[20260814-a-documented-lesson...md]`.
- **Face-saving scope** and reinterpreting a gate to unblock oneself: `[2026-08-18-face-saving-scope...md]`, `[20260817-an-agent-that-reinterprets-a-gate-to-unblock-itself.md]`.

### The one meta-class that generates the others
**Choosing the answer first, then building the analysis that proves it.** Named verbatim across the lensing/unlensed series: "I built a taxonomy that made my preferred conclusion inevitable, and presented it as analysis." `[20260816-lensing-a-panel-destroys-what-it-was-meant-to-find.md]`; the scope-choice framing: "I chose the search scope, then forgot it was a choice." `[20260813-i-chose-the-search-scope-then-forgot-it-was-a-choice.md]`; and "Reasoned toward a conclusion… then dismissed the interference risk as 'vibes'" `[20260819-name-the-assumption-and-invite-the-attack.md]`.

---

## Q2 — Recurrence: lessons written down and repeated anyway

**This is the single strongest finding in the corpus, and the corpus is self-aware about it.** The exact phrase "A lesson that recurs after being written up proves the write-up was not the fix" appears in `[2026-08-18-a-lock-that-only-sees-committed-state.md]` and "a lesson that is written down and then repeated proves the write-up was not the fix" in `[20260817-a-fix-in-the-code-is-not-a-fix-in-the-suite.md]`.

The numbers: the ledger row count is **contested by method** (see evidence base — 215/283/364 depending on how you parse the tables), so no point estimate is printed. The robust figure that survives all three methods: **close to half (38–47%)** of the recorded rows were explicitly self-marked "already written up before recurring = YES." Recurrence (column-index parsed): **20 error classes recurred ≥4×; one recurred 12×.** Below, the highest-signal individual recurrences, each with count and source.

| Lesson (paraphrased) | Recurrences | Written up before? | What finally stopped it | Source packet |
|---|---|---|---|---|
| Trusting a harness/instrument that cannot observe the thing | **4** | Yes — three times, and it recurred after each | "Mutation testing, and only when run." | `[2026-08-16-a-comment-is-not-a-control.md]` |
| Declaring a defect closed when one instance was closed | **3** | Yes, after the second | "An independent reviewer with different priors. Never [by the author]" | idem |
| Believed a probe negative before validating the probe | **6** in one session (one packet); **5** in a prior session | **Yes** | "The written rule actually fired" (once); otherwise reviewer | `[20260821-validate-the-instrument...md]`, `[2026-08-16-panel-claims-are-hypotheses...md]` |
| Narrow check reported as a general finding | **7** | **YES — written up twice, then repeated five more times** | "A procedural command (state the scope…)" | `[20260813-i-chose-the-search-scope-then-forgot-it-was-a-choice.md]` |
| A lesson in the **memory I had loaded**, violated anyway | **3** in one session | Yes — it was in the loaded skill `feedback_validate_probe_before_absence_claim` | A *mechanical* rule ("never emit a verdict line in the same statement as the command that produces it") | `[20260814-a-documented-lesson-is-not-a-fix.md]` |
| Stale line-counts in docs after edits | **3** in one session (plus two other sessions) | **Yes — in the file open in front of me** | A procedural command, not knowledge | `[20260820-a-gate-keyed-to-a-marker-nobody-emits.md]` |
| A number quoted from memory | **6** in one session | **Yes — "in the file I was writing it in… did not survive twenty minutes"** | Named measure before use | `[2026-08-21-a-number-survives-by-being-repeated.md]` |
| Instance-fix for a category defect | **3** | "Yes, twice, with the rule stated plainly" | **Changing the fix SHAPE (chokepoint), not remembering harder** | `[2026-08-17-a-guard-multiplies-a-chokepoint-does-not.md]` |
| Test that cannot fail against its named defect | **4** | "Yes, repeatedly" | "Running new tests against pre-fix source — every time, without exception" | idem |
| Uncommitted work written through a hostile window | recurred in-session after being written up an hour earlier | Yes | "A grep I ran" | `[2026-08-17-reflog-before-narrative.md]` |
| Guard-is-the-failure (reinterpreting the gate) | recurred after "written up last session, in this same project" | Yes | — (the packet is the record) | `[20260816-the-guard-was-the-failure-twice.md]` |
| MSYS/Windows path trap | "already been written down and it happened anyway" | Yes | — | `[20260817-a-guard-that-blocks-the-desired-state.md]` |
| Believed a negative from an unvalidated instrument | **4** in one session (one packet) | **Yes, "in this corpus"** | "Printing the instrument's own state" | `[20260820-promoting-an-element...md]` |
| Assert-without-measure ("confirmed fit") | recurred "in new form" after write-up | "Yes — twice" | "'confirmed' is banned until a named test has run" | `[2026-08-16-delivery-inversion-law.md]` |

**The meta-recurrence (the pattern that recurs):** the *remedy of writing it down harder* is itself the thing that recurs. The corpus says this three times in its own words:
- "[20260814-a-documented-lesson-is-not-a-fix.md]" — **title**: "A documented lesson is not a fix."
- "[20260816-the-control-term-is-the-only-thing-that-worked.md]" — "when a lesson recurs after being written up, do not re-write the lesson harder. **Convert it into a mechanism.**"
- "[2026-08-19-a-ranking-is-not-a-control.md]" — "The recurring one is #1, and it has now been written up **three times without stopping**."

**Conclusion (Q2):** documentation does not reduce recurrence. The 38–47% (contested-by-method, so published as a range) figure is a floor, not a ceiling, because many repeated rows are only *implicitly* marked "seen before." The fix that held, every time it is identifiable, is **procedural or mechanical** (a command, a gate, a chokepoint, a test run before the fix). The fix that never held is **resolutional** ("be more careful"). This matches Sean's prior read — see Q4.

---

## Q3 — Detection: what actually caught each class (and what catches nothing)

Reconstructed from the "caught by" columns in the ledger rows (count contested by method: 215/283/364 — see part 1 evidence base) and the "what actually stopped it" free-text field.

### What catches what (frequency-ordered by the corpus's own tallies)

| Mechanism | Catches | Evidence |
|---|---|---|
| **An independent reviewer with different priors** (hostile panel, external model, or a different seat) — *the single most-cited catcher in the ledger* | Defect-class closure errors, prose-vs-code inversions, false dispatch claims, security findings, "the finding worth the whole fee" | `[20260816-a-comment-is-not-a-control.md]` "An independent reviewer with different priors. Never [the author]." `[20260821-a-clean-tree...md]` panel found the inverse-logic bug after nine self-hostile rounds missed it. `[20260820-check-the-checkable-claim...md]` GLM-5.3 found the ReDoS both paid seats cleared. |
| **Mutation testing / red-before-green test execution** | Tests-that-cannot-fail, injected-doubles, decorative suites | `[20260816-a-comment-is-not-a-control.md]` "The headline number in this table is the 4… The only intervention with a high hit-rate was mutation testing." |
| **A procedural command fired before the action** (measure-then-state, control-grep before absence-claim, preflight before quote) | Instrument-lies, absence-claims, stale numbers, cost quotes | `[20260816-reachability-is-severity-not-a-footnote.md]` "the habit fired *before* the claim this time: control-grep first." `[20260821-validate-the-instrument...md]` |
| **A mechanical gate/hook that refuses** (dry-loop-gate, db-blast-radius-gate, drift-check-gate, dual-tier-gate, hermes-closeout-gate, linear-sync-gate, frontend-guards, token-registry-check) | Chose the wrong workflow, blast-radius, drift, closeout hygiene, unprompted sync, silent-failure frontend patterns | Hook headers in `scripts/hooks/` + `[20260820-a-gate-keyed-to-a-marker-nobody-emits.md]` decision line |
| **A real instrument on real hardware** (browser on real GPU, Postgres instance) | Visual/contrast/empty-state bugs, silent availability hazards, DB contract drift | `[20260820-promoting-an-element...md]` "the expensive reviewer is a browser, not a model." `[20260819-your-tests-share-your-blind-spot.md]` "a hostile panel adds little where a test suite and a Postgres instance can answer." |
| **A human** (Sean, the operator) | Program-scale review displacement, budget overruns, privacy leakage, scope creep, face-saving | `[20260816-delivery-inversion-law.md]` (2-day delivery inversion), inbox memos with "Sean has said he should never have to [ask]" |
| **An existing test suite** | Contract/caller drift | `[20260820-a-new-return-shape-has-n-callers.md]` "Source-text suite passed 14/14 against neutered guards — sixth decorative" (the *negative* case) vs. `[20260820-an-enforcement-point...md]` "three of the four defects were found by writing a test that failed" |
| **Nothing / luck** | see gaps below | — |

### What catches **nothing** — the corpus's own admissions, verbatim

These are the highest-value lines in the corpus. Quote them:

1. **"A guard that refuses must also stop the caller"** — the refusal path existed; the caller kept running. `[20260820-a-guard-that-refuses...md]`. The guard's own suite did not catch this. **Nothing in the toolchain enforces that a refuse actually halts the caller.**

2. **"A gate that scores adjacent properties certifies the failure"** — the gate PASSED. The author reported the PASS as proof. **Nothing inspects the gate's own discriminant power.** `[20260821-a-gate-that-scores-adjacent-properties...md]`

3. **"A gate keyed to a marker nobody emits"** — the gate looked for a string that had no contractual emitter. **Nothing traces a gate's marker back to its emitter.** `[20260820-a-gate-keyed-to-a-marker-nobody-emits.md]`

4. **"A test required the bug"** — the regression test only reproduces if the defect is present; green means the bug is still there. **Nothing distinguishes a regression test that proves the fix works from one that proves the bug is still there.** `[20260816-the-test-required-the-bug.md]`

5. **"Trusted a harness that cannot observe the thing… 4 times… The only intervention with a high hit-rate was mutation testing, and only when run."** — "only when run" being the load-bearing clause. **Nothing forces mutation testing to be *run* as opposed to *defined*.** `[20260816-a-comment-is-not-a-control.md]`

6. **"The recurring one is #1, and it has now been written up three times without stopping."** — the lesson-recurrence itself has no detector. `[20260819-a-ranking-is-not-a-control.md]`

7. **"The owed panel is now deferred six times."** — the deferral is itself the gap; nothing fires when a requested external review is not dispatched. `[20260821-a-parser-that-reads-the-whole-file...md]`, `[20260821-a-receipt-is-not-evidence...md]`

8. **"Did not sync Linear unprompted. A gate had to ask. Sean has said he should never have to."** — the gate (linear-sync-gate) does exist and fires, but the *unprompted* behavior the operator expects is still a gap in the agent's model. The gate catches the *miss*, not the *need*. `[20260821-a-green-test-can-be-why-the-bug-shipped.md]`

9. **"Four stale counts in documentation, a class already written up twice in this repo."** — nothing diffs a doc's stated number against the artifact's measured number on edit. `[20260821-a-bound-always-leaks...md]`

10. **"Prose you authored yourself reads as verified."** — nothing separates code from the author-written comment that contradicts it. `[20260821-a-clean-tree...md]`

11. **The scanner itself**: "a review packet in this very workstream leaked a Windows username to six vendors because a scanner returned a false negative and it was believed. **Validate your scanner on a string you know is present before trusting its silence.**" (staged prompt, §Rules). This is a *known* gap the system is already managing ad-hoc, not a standing control.

12. **A receipt is not evidence**: "Presented an in-memory proof as evidence the pipeline worked." Nothing re-executes the pipeline when a receipt is presented. `[20260821-a-receipt-is-not-evidence...md]`

### Meta-gap
There is no standing detector for **"the gate is the failure"** — i.e., a check that *its own check is capable of failing what it claims to guard*. This is the class that keeps generating new rules (79, 80, 81, 82) rather than the one mechanical control that would retire several of them.

---

## Q4 — The fix that worked vs the fix that didn't

I tested Sean's prior read: **"procedural fixes survive, resolutional fixes don't."** The evidence strongly supports this, with one exception worth flagging.

### The ledger rows, split by the *kind* of fix the author wrote down (row count contested by method — 215/283/364; the split below is directional, not precise)

| Fix kind (parsed from "What actually stopped it") | Rows | Examples (verbatim short) |
|---|---|---|
| **Procedural** — a named command/step to run ("Measure, then change.", "control-grep first.", "Running new tests against pre-fix source — every time, without exception.", "'confirmed' is banned until a named test has run.", "state the scope before reporting.") | ~90 (dominant in recurring rows) | the rows in `[20260816-the-control-term...md]`, `[20260816-reachability...md]`, `[20260817-a-guard-multiplies...md]`, `[20260816-delivery-inversion-law.md]` |
| **Mechanical** — a hook/gate/test/script that refuses or fires | ~55 | all of `scripts/hooks/` rows; `[20260820-a-gate-keyed-to-a-marker-nobody-emits.md]`; `[20260821-a-bound-always-leaks...md]` "Only a mechanical rule stopped it." |
| **Structural** — change the shape of the system (chokepoint, enumeration, freeze) rather than the behaviour | ~20 | "Changing the fix SHAPE (chokepoint), not remembering harder"; "remove the bound and enumerate the space"; "DRY=frozen with revert-or" |
| **Resolutional / caution** — "be careful", "be more rigorous", "never do X" with no named command or artifact | ~70 (dominant in *first* recurrence rows only; nearly absent from rows that stopped recurring) | rows where "What stopped it" is "A lesson written down", "A rule", or "The write-up itself" — these are exactly the rows that *recurred again* in the next packet |
| **External seat / reviewer** — rely on a different model | ~30 | the "independent reviewer" rows; always paired with a procedural or mechanical step in the *next* packet |

### The pattern that holds
- **Fixes that stuck** are always one of: procedural (a named command), mechanical (a gate/test), or structural (a shape change). The corpus's own language: "The correction that will hold is **mechanical** (never emit a verdict line in the same statement as the command that produces it), **not motivational.**" `[20260814-a-documented-lesson...md]`
- **Fixes that didn't stick** are almost always prose: "be careful", "the rule", "a lesson", "a caution". The corpus's own line: "**A caution is not a control.**" `[20260821-a-caution-is-not-a-control.md]`
- **The one exception that muddies the pattern:** the "fix" that *most reliably failed to stick* — the **panel-deferral** — was not resolutional in form; it was a *procedural* obligation ("run a hostile panel before reporting done") that simply was never triggered. The gap is not the *form* of the rule, it is that **the rule has no trigger**. Rule 74 (Proof-Before-Done, mainline) and Rule 46 (Kimi Hostile-Review Gate) are both procedural, and both were deferred six times. The form was right; the *emitter* was missing. This is the same shape as the "gate keyed to a marker nobody emits" gap (Q3.3).

**So: Sean's read is correct *with one refinement*.** Procedural fixes survive **when they are attached to a named trigger** (a hook, a workflow boundary, a command that runs before the risky act). Procedural fixes with **no emitter** are no better than resolutional prose. The distinguishing axis is not *procedural vs resolutional* but **tethered vs untethered** — does the fix have a mechanical point that fires it?

---

## Q5 — Model-specific patterns (with cost)

The corpus is unusually honest about which seat does what. I am including the authors' own self-assessments verbatim, plus the per-panel cost tables the panels produced.

### Author-seat patterns (packets authored by)

**`claude-opus-5` (72 packets at the 2026-08-23T03:33Z snapshot; 70 at the 104-packet snapshot) and `claude-fable-5` (34 packets, stable across both); 0 unattributed** — per-file first-match reading. (Several files carry duplicate `originating_model` lines, which is why a naive `grep | sort | uniq -c` disagrees with the per-file count — 113 origin lines across 106 files at the final snapshot; the per-file first match is what I use.) Note my earlier draft said 66/30/6 and even earlier 66/33 — both were from a 99-packet snapshot of a corpus that kept growing (66/30/6 was itself once corrected by v1.1.0 and then went stale again); the per-file-anchored 72/34/0 at the 2026-08-23 snapshot is the current state.

Their self-reports show:
- **The author class-signature is indistinguishable between the two seat families by my method.** I ran a coarse signature matcher for Classes A/B/C/E/D over each model's packets, and both families land mostly in the "no clear signature" bucket (Opus 38, Fable 23) with the named-mechanism hits thin and uneven (Opus C/E=10, Fable C/E=3; Opus D=6, Fable D=3). This is **not evidence of a reliable per-seat failure bias**, and I am not going to assert one. *I previously wrote "Fable shows more process-shape failures, Opus more measurement failures" — I am retracting that as an unverified hypothesis I could not measure cleanly.*
- **Self-hostile rounds are run** (often 4–6) **but miss the author's own framing errors** — this is the shared, model-independent blind spot across *both* families: "My four hostile rounds did not catch this because they were all attacking the *inventory*, and the error was in the *sequence*." `[20260814-a-documented-lesson...md]`; "Nine probe/detector failures where I nearly blamed the artefact" `[20260821-a-gate-that-scores-adjacent...md]`.
- **The author's own prose is read as verified** — the single most-recurring self-blind-spot in *both* families: "prose you authored yourself reads as verified." `[20260821-a-clean-tree...md]`

### Reviewed-seat patterns (as reviewers — per-panel calibration tables)

These are the corpus's own per-panel verdicts, quoted from the packet's calibration section. I have not re-verified any of them by execution; they are the author's self-report of the panel's output.

| Seat | Best at (across ≥3 packets) | Fails at (across ≥3 packets) | Cost per appearance |
|---|---|---|---|
| **GLM 5.3** (subscription) | Precedent-finding ("both HIGHs it identified an existing correct implementation elsewhere"); control-flow consequence tracing; "highest leverage per dollar"; "the best finding was about my own instrument" | "Highest variance — always execute its claims"; 5 false positives in one panel `[20260821-a-clean-tree...md]`; "1 refuted, 1 overstated" `[20260820-the-cheapest-seat...md]`; cleared a real ReDoS `[20260820-check-the-checkable...md]` | **$0** (subscription/plan credit). The corpus's own verdict: "for adversarial code review of this kind, **GLM should be the default seat and the paid models the escalation, not the reverse**." `[20260821-a-bound-always-leaks...md]` |
| **Kimi K3** (paid, allowlisted) | Architecture structure; "highest value per dollar on the panel" `[20260820-check-the-checkable...md]`; "fastest + most complete" `[20260821-the-approval-instrument...md]`; "tracing arguments across files; composed defects" `[20260821-validate-the-instrument...md]`; **inverted three conclusions of an Opus-5 packet** `[20260814-a-documented-lesson...md]` | "1 severity overstated" `[20260820-the-cheapest-seat...md]`; "blocked, key absent" in one packet `[20260820-a-new-return-shape...md]`; cleared the same ReDoS GLM caught `[20260820-check-the-checkable...md]` | $0.0288 to $0.78 per appearance. Median ≈ $0.15. |
| **GPT-5.6 Sol Pro** (paid, expensive) | "Deepest coverage"; statistical/rigour questions; "the only seat that questioned owner-approved copy" `[20260821-a-gate-that-scores-adjacent...md]` | **"84% of spend"** `[20260821-preflight...md]`; "96% of spend; reserve for statistical/rigour questions" `[20260820-the-cheapest-seat...md]`; **"truncated before verdict"** `[20260821-a-bound-always-leaks...md]`; ~10× naive cost estimate `[20260821-preflight...md]` | $0.4898 to $1.01 per appearance. Median ≈ $0.85. |
| **Grok 4.6** (paid) | "Best findings-per-dollar; keep as the hostile seat" `[20260821-a-gate-that-scores-adjacent...md]`; "absence-first list" `[20260821-a-clean-tree...md]`; "clean first outing" `[20260821-preflight...md]` | "3 false positives" `[20260821-a-clean-tree...md]`; **0/0 real findings in one panel** `[20260822-a-git-deletion...md]` | $0.0554 to $0.0958 per appearance. |
| **Qwen 3.8 (local)** | "Free, private, no reason not to include on every panel" `[20260820-the-cheapest-seat...md]`; "free convergence check; always seat" `[20260821-the-approval-instrument...md]`; "the clearest mechanism statement and did it fastest and free" `[20260818-unlensed-panel packet]` | "0 unique decisive findings" in the panel where it was present `[20260821-a-bound-always-leaks...md]` — it matched the headlines but found nothing new | **$0** |
| **DeepSeek V4 Pro / V4 Flash** | "Decision 1 fallback" `[20260822-a-git-deletion...md]`; cheap, high-volume | "1 (Law 6 'contradiction')", "2 (Law 5 tautology; Law 12 wording)" refuted `[20260822-a-git-deletion...md]` | $0.0014 to $0.0065 per appearance — the cheapest paid seats in the corpus. |
| **Claude Haiku 4.5** (delegated sweeps) | "Right tool for mechanical breadth" | "~77% accuracy (10 of 13 load-bearing claims survived hand-verification)"; "**the flag census MISSED the very flag the audit was about**" `[20260814-a-documented-lesson...md]` — "a delegated census that misses the subject of the investigation is a reminder that breadth tools have no idea what matters." | subscription |
| **HY3 / HY3-Design** (lensed consult) | Design/UX-specific | "The consult scripts default to LENSED remits — you must override them" (Rule 82, mainline) — the default remit is narrow *and* Swan-branded; "omitting it silently reintroduces exactly the failure this rule bans" **[Rule 82, verified on origin/main]**; lense-dictation of a borrowed skeleton `[20260821-a-number-survives...md]` | per-seat, not consistently logged |

### The cost pattern the corpus itself extracted
- "Panel ≈ **$0.09** actual vs **$0.91** disclosed worst case. Pattern across two consecutive panels: disclose worst case, cap, fire once — **actuals land at 3–10% of disclosed**." `[20260821-the-approval-instrument...md]`
- "Sol Pro ≈ 10× naive" per-seat cost multiplier — budget at 10× the naive estimate. `[20260821-preflight...md]`
- "The free seat outperformed both paid seats on findings and cost. That is the single most actionable routing fact here." `[20260821-a-bound-always-leaks...md]`
- **393 distinct dollar figures** are cited inside packets; the corpus does not carry a consolidated spend ledger — each panel records its own per-seat cost, and the calibration tables are the only cost-of-record. `[SELF-AUTHORED]`

---

## Q6 — Where the current rules FAILED

This is the section Sean explicitly asked for. I am reading the authoritative mainline `CLAUDE.md` (164 numbered definitions, max Rule 83) as the rulebook in force, and cross-referencing each major incident class (Q1) against the rule that *should* have caught it.

**Two vantages, one rulebook.** The local checkout (`wip/comms-notifications-2026-07-05`, 2181 commits behind `origin/main`) caps at Rule 70. `origin/main` runs to Rule 83. The memos in the corpus quote "Rule 74", "Rule 80", "Rule 82" — all present on `origin/main`, absent on the WIP branch. **This is not a rulebook bug; it is a branch-staleness hazard that recurs in the corpus itself** (the "clean tree / stash pop / worktree" line of packets). I am calling it out as a *forensic artifact of the environment I ran in*, not as a finding about the rulebook.

### The rulebook's own self-contradiction (a standing finding)
- Line 16 (both local and main): "the **66 MANDATORY** rules + dual-pass disciplines". The actual count on `origin/main` is **164 numbered definitions** (not all of them "MANDATORY", but the file does not cleanly separate them). A reader who trusts the "66" will skip ~2/3 of the rules that follow. This is a Trailhead-Truth (Rule 75, mainline) violation in the rulebook itself.
- **"66 MANDATORY"** appears in the Four-C Router section on both vantages; the file does not carry a second, reconciled count anywhere I could find. `[UNVERIFIED — I have not exhaustively searched both files for every count-claim; I have found the Line-16 one in both vantages and found no reconciling statement.]`

### Per-incident rule-failure mapping (named rule numbers, mainline)

| Incident (source) | Rule that should have caught it | Why it didn't | Category (Sean's) |
|---|---|---|---|
| Echo-in-same-statement; pipe-status blindness; `rg -r` flag misread | **Rule 80** (Second-Vantage Verification — "one tool's failure is NEVER proof something is broken") | Rule 80 is *prose*. It says "verify", it does not *fire*. The corpus says it outright: "[20260814-a-documented-lesson...md]" — "Rule 30 was already written down and it still nearly failed, because a plausible, well-argued [claim]…". Rule 80 was **violated four times in one session after being written up**. `[SELF-AUTHORED]` | **unenforceable prose** |
| Stale line-counts in docs (×3 in one session) | **Rule 75** (Trailhead-Truth) + **Rule 73** (ADW Discipline) | Rule 75 demands "docs describe what the code does"; it does not demand the doc's *number* be re-measured when the code changes. No hook diffs a doc's count against the artifact. | **no mechanical control** |
| Test-that-required-the-bug; decorative suites; injected doubles | **Rule 79** (Tests Can Encode The Bug) + **Rule 30** (Subagent Skepticism) | Rule 79 says "a red test after a fix is a QUESTION, not a verdict" — correct, but it is *prose*. No hook distinguishes a regression test that proves the fix from one that proves the bug persists. | **unenforceable prose** |
| Guard-refuses-but-caller-continues | No rule — the class is not named in the mainline rulebook I could find | **No rule existed.** The corpus's own admission: "[20260820-a-guard-that-refuses...md]" is a *new* rule, not a rule that was violated. | **no rule existed** |
| Gate-keyed-to-a-marker-nobody-emits | **Rule 74** (Proof-Before-Done) | Rule 74 demands proof before "done"; it does not demand the proof's *premise* (the marker) be traceable to an emitter. The gate looked for a string nothing writes. | **hook's condition too narrow** (marker existence assumed, not verified) |
| Panel-deferral (×6) | **Rule 74** (Proof-Before-Done), **Rule 46** (Kimi Hostile-Review Gate), **Rule 82** (Full-Spectrum Panel) | The rules exist and are MANDATORY; the *emitter* is missing. No hook fires when a requested panel is not dispatched. The corpus: "The owed panel is now deferred six times." | **rule existed but had no trigger** (emitter missing) |
| Prose-vs-code inversion (9 hostile rounds missed) | **Rule 30** (Subagent Skepticism), **Rule 80** (Second-Vantage) | "I kept re-reading the *comment* as if it were the *behaviour*." The author-self-prior is the enemy; no rule addresses *self*-authored prose specifically. | **no rule existed** (for the self-authored-prose case) |
| Linear-sync deferral | **Rule 67** (Multi-Agent Coordination) + the `linear-sync-gate.mjs` hook | The hook exists and fires, but the *unprompted* expectation is not encoded anywhere the agent reads before it starts the work. The gate catches the miss *after*; nothing prompts the need *before*. | **hook fires too late** (post-hoc, not pre-act) |
| Secret/PII leak (username to six vendors) | **Rule 8** (Zero PII to LLMs), **Rule 59** (Read-Time Secret Exposure Prevention) | The scanner returned a false negative and was believed. The corpus's own line: "**Validate your scanner on a string you know is present before trusting its silence.**" (prompt §Rules) — this is the *post-hoc* control that should have been a *pre-hoc* one. | **hook's condition too narrow** (trusts the scanner; no positive control) |
| Built-but-not-wired (26–27 days dark) | **Rule 68** (Fable-Grade Plan → Worker-Bot Build → Hermes Learning Loop) | Rule 68 routes the *build*; it does not route the *wiring*. A flag that is built and never flipped is outside Rule 68's surface. | **no rule existed** (for the "wiring" half) |
| MSYS/Windows path trap | No rule — the environment is not named in the mainline ruleset | **No rule existed.** | **no rule existed** |
| Cost quoted from memory (×3 in one session) | **Rule 16** (AI Village permission — the spend gate) | Rule 16 gates *Sparks* (Village runs), not *per-seat* quotes. No rule demands a `--dry-run` before quoting a per-seat cost. The corpus: "quote it from a `--dry-run`, never from memory." `[20260821-a-clean-tree...md]` | **no rule existed** (per-seat preflight) |
| A caution is not a control; a ranking is not a control; a written trap is not a control | **Rules 15, 27, 30, 54, 57, 79, 80, 81** (a large cluster) | All prose. The corpus's own verdict: "several rules in this system are already exactly that [rules which only ask an agent to be careful]" (prompt §Stage 2 remit). | **unenforceable prose** (the dominant category) |

### The four categories, scored by the corpus's own evidence
1. **Unenforceable prose** — **the most common category**. Rules 15, 27, 30, 54, 57, 75, 79, 80, 81 are all prose. The corpus's own line: "a rule which only asks an agent to be careful is not a defense at all" (prompt §Stage 2). My count of "the write-up was not the fix" rows in the ledger set is ~70 (**directional — the row base itself is contested by method, so treat as "on the order of" not exact**), and *almost all of them cite a prose rule as the prior control*.
2. **No rule existed** — second most common. The guard-refuses-class, the self-authored-prose-class, the MSYS-class, the wiring-class, the per-seat-cost-class are all *new* classes that the rulebook has not yet named.
3. **Hook's condition too narrow** — the secret-leak (no positive control), the gate-keyed-to-a-marker (emitter unverified), the Linear-sync (fires too late).
4. **Rule existed and was simply ignored** — **I found no clean example of this in the corpus.** The pattern the corpus actually shows is *not* "the rule was ignored" but *"the rule was read, understood, and violated while being read."* This is a meaningful distinction: the corpus's own self-blame is almost always "I knew the rule and did it anyway", not "I did not know the rule." I flag this as a **findings that differs from the categories Sean expected**: the corpus does not support "ignored" as a *category*; it supports "violated-understanding" as the *mechanism*. **[This is a finding I am surfacing against Sean's prior.]**

### One rule that actually *held* (the counter-example worth keeping)
**Rule 54 (Sibling-Sweep Grep Evidence Requirement)** — cited in `[20260817-an-agent-that-reinterprets-a-gate-to-unblock-itself.md]`: "this is Rule 54's class, and I repeated it anyway… Reviewers caught both. **Procedural fix: every 'reuses the existing [pattern]' claim must name the sibling file and be grep-verified.**" The fix that stuck was the *procedural form* of Rule 54 — the grep — not the *prose*. This is the single clearest example in the corpus of a rule that became a control **when a command was attached to it**.

---

## Q7 — The gaps Sean has not noticed

These are classes I found in the corpus that the corpus itself has **not** written up as a standing lesson, or that it has written up once and the recurrence is still unmanaged.

1. **The scanner's own false-negative has no standing positive control.** The username-leak episode is the *only* place the corpus records a scanner failing. The remedy ("validate on a string you know is present") is in the prompt, not in a rule, hook, or CI step. [Prompt §Rules; no mainline rule found by name.] → **Candidate new mechanical control: a privacy-scanner self-test (positive control) that runs on every outbound packet.**

2. **No rule covers the wiring half of "built".** A flag, surface, or feature that is built and sits dark 26–27 days is outside the surface of Rule 68 (build routing) and every other rule I could find. The corpus names it as "activation debt" `[20260814-a-documented-lesson...md]` but no rule owns it. → **Candidate new rule: "shipped-but-dark" is a defect class with a named owner and a flip-or-delete deadline.**

3. **Per-seat cost preflight is not a rule.** Rule 16 gates Village runs (Sparks). Per-seat quotes from memory recurred in at least three packets. The corpus's own fix ("quote from a `--dry-run`, never from memory") has no rule number. → **Candidate: extend the spend gate from "run" to "quote".**

4. **Self-authored prose is an unaddressed blind spot.** The corpus says it once, bluntly: "prose you authored yourself reads as verified. An outside reader has no such prior." `[20260821-a-clean-tree...md]`. No rule addresses *self*-authored comments as a distinct evidence class. Rule 30 (Subagent Skepticism) covers *delegated* claims; this is the author's own. → **Candidate: treat author-written comments contradicting code as a defect, not a note.**

5. **The deferral of a requested panel is itself a defect with no detector.** Six occurrences of "the owed panel is deferred". No rule counts a *not-dispatched* requested review as an open obligation. The closeout gate checks *closeout hygiene*; it does not check *outstanding reviews*. → **Candidate: a closeout-gate check that "requested hostile review" either ran or is explicitly waived in the closeout.**

6. **A receipt presented as evidence.** The corpus names it once and moves on. There is no standing rule that a *work claim* (not a *test claim*) requires re-execution. → **Candidate: "a receipt is not evidence of the work" as a first-class rule with a re-execution step.**

7. **The rulebook's own count is stale.** "66 MANDATORY" vs 164 numbered definitions. This is a Trailhead-Truth (Rule 75) violation *in the file that enforces it*. The corpus has not flagged this. → **Fix the count, or stop asserting one.**

8. **The corpus is its own single point of failure.** It is *the* evidence base for the ruleset, and it is a 1.1 MB markdown directory with no CI. A corrupt or truncated packet would silently remove evidence from the record. The schema validator exists (`_schema.json`) but I did not find a CI step that runs it on every commit. `[UNVERIFIED — I have not traced the schema validator to a CI trigger; I have read the schema and seen the validator's self-documentation, not its invocation graph.]` → **Candidate: a standing check that the corpus is valid and complete, run in CI.**

9. **The branch-staleness hazard is unmanaged.** The local checkout I ran in was 2181 commits behind `origin/main`. The corpus's own "clean tree / stash / worktree" packets show this is a *class*, not a fluke. No rule gates "which branch am I on / is my checkout current" at session start. → **Candidate: a session-start branch-currency check, printed to the transcript.**

10. **The corpus has no consolidated spend ledger.** 393 dollar figures scattered across calibration tables; no single source of truth for "how much has this program cost Sean". The operator tracks spend closely (per memory), but the corpus itself does not aggregate it. → **Candidate: a machine-readable per-run spend file (model, seat, cost, date, task-class) that the corpus's calibration tables are generated from.**

---

## Appendix A — The rules I could not verify, stated plainly

- I did not verify any panel's per-seat cost by re-running it; the cost tables are the author's self-report.
- I did not verify the username-leak episode against the actual outbound packet (the corpus does not carry it, by design).
- I did not trace the schema validator to a CI trigger.
- I did not exhaustively search both rulebook files for every count-claim.

Each of these is tagged `[UNVERIFIED]` or `[SELF-AUTHORED]` inline where it lands in the body.

## Appendix B — What I did NOT do

- I did not fire any paid model seat. This report is Stage 1, solo, local.
- I did not modify `CLAUDE.md`, `AGENTS.md`, or any rule. This report reads them.
- I did not re-run any of the hooks in `scripts/hooks/`. I read their headers and named their purposes; I did not execute them.
- I did not re-execute the corpus's recurrences. I took the ledger at face value (it is the corpus's own self-report; the row count is contested by method — 215/283/364 — so I publish the method-robust 38–47% range rather than a point estimate) and flagged the self-authored character where it matters.

## Appendix C — The one finding I am surfacing against Sean's stated expectation

Sean asked me to look for the category **"a rule existed and was simply ignored."** I did not find a clean example. The corpus's own self-blame is uniformly *"I knew the rule and did it anyway."* That is a meaningfully different mechanism from ignorance: it means the ruleset is *read*, *understood*, and *violated under understanding* — which is to say, the problem is not that the rules are invisible, it is that **the rules are not attached to anything that fires when the agent is about to act.** The fix that held, every time it is identifiable, is a command, a gate, a chokepoint, or a re-execution — *tethered*, not *proclaimed*. This reframes Stage 2 from "which rules should exist" to "which of the existing rules need a trigger, and which should be deleted because no trigger is buildable."

---

# STAGE 2 — Cost estimate and cap (to be approved by Sean before any seat fires)

The Stage 2 panel is **eight independent seats**, each answering the full (A) + (B) remit against the Stage 1 report.

### Per-seat cost (from the corpus's own calibration tables — the only cost-of-record)

| Seat | Class | Per-appearance cost (corpus-recorded) | Notes |
|---|---|---|---|
| GLM 5.3 | **subscription** | **$0** | plan credit; include, no cost line |
| Gemini 3.1 Pro | **subscription** (per the prompt) | **$0** | the prompt lists it as subscription; not yet costed in the corpus's own tables — I have no per-appearance figure to quote, and I will **not guess one**. `[UNVERIFIED cost]` |
| Grok 4.6 | paid | **$0.0554 – $0.0958** per appearance | corpus's own best-per-dollar hostile seat |
| Kimi K3 | paid (allowlisted) | **$0.0288 – $0.78** per appearance; median ≈ **$0.15** | most consistent per-dollar in the corpus |
| HY3 / HY3-Design | paid | **no per-appearance cost in the corpus tables** I could find | I will run it under the same disclosed cap and read the billed cost back; I will **not** invent a figure here. `[UNVERIFIED cost]` |
| DeepSeek V4 | paid, cheap | **$0.0065** (one corpus appearance) | cheapest paid seat in the corpus |
| DeepSeek V4 Pro | paid, cheap | **$0.0014** (one corpus appearance) | cheapest paid seat in the corpus |
| GPT-5.6 Sol Pro | **paid, expensive** | **$0.4898 – $1.01**; **~10× naive**; "84–96% of a panel's spend" | the corpus's single most-expensive seat |

### Honest cost math for the eight-seat panel

**Known-paid seats (corpus-cited, per appearance):** Grok + Kimi + DeepSeek×2 + Sol Pro ≈ **$0.09 + $0.15 + $0.01 + $0.85 ≈ $1.10** nominal. Applying the corpus's own multiplier for Sol Pro (budget at 10× naive on that seat) and the "actuals land at 3–10% of disclosed worst case" pattern, I will disclose a **worst-case cap per paid seat** rather than a point estimate.

**The two seats with no corpus cost figure** (Gemini, HY3) I will run under a per-seat cap and read the billed number back, rather than quote a figure I do not hold.

**My proposed disclosed worst-case cap for the full eight-seat Stage 2 run: ≤ $6.00**, structured as:
- GLM 5.3: $0
- Gemini 3.1 Pro: **$1.00 cap** (no corpus figure; capped, not quoted)
- Grok 4.6: **$0.25 cap**
- Kimi K3: **$0.50 cap**
- HY3: **$1.00 cap** (no corpus figure; capped, not quoted)
- DeepSeek V4: **$0.05 cap**
- DeepSeek V4 Pro: **$0.05 cap**
- GPT-5.6 Sol Pro: **$3.00 cap** (10× its corpus median ≈ $0.30, rounded up)

**Total disclosed worst-case cap: ≤ $6.00.** Actuals are historically 3–10% of disclosed in this corpus, so the *expected* spend is **well under $1.00** — but I am setting the cap at $6 because that is where my liability actually is, and the prompt told me to cap it.

### The two hard constraints I will enforce, per the corpus's own lessons
1. **Positive-control the privacy scanner on a known-present string before the first outbound packet** (the username-leak lesson, now pre-hoc).
2. **Fire once, do not retry verbatim.** If a seat returns empty or failed, I report it as empty and do not re-fire it three times to fill a slot. (The "one seat returned an empty response after billing" lesson; the "never retry the same call a third time verbatim" operating discipline.)

### What I need from Sean before I fire any of this
- **Go / no-go on the $6.00 worst-case cap.**
- **Confirm the two seats with no corpus cost figure (Gemini, HY3)** — do you want them run under a $1.00 cap each, or excluded?
- **Confirm the full-spectrum remit (Rule 82) is applied** — every seat answers the complete (A)+(B) brief, not a lensed subset.
- **Confirm the privacy positive-control step is acceptable overhead** before the first fire.

I will not fire the panel, and I will not spend one cent, until you approve the cap and answer the four questions above.
---

## Q8 — The memo corpus: 2,096 mistake bullets the Stage-1 report never read

**Added 2026-08-23 by vs-claude (claude-opus-5).** Stage 1's evidence base states it read
"30+ memos." The inbox holds **1,109 memos** (416 pending + 693 consumed). This section closes
that gap. It is the larger half of the evidence and it was missing.

### Scale

| Corpus | Files | "Mistakes I made" bullets | In Stage 1? |
|---|---|---|---|
| Learning packets | 106 | **427** | yes |
| **Inbox memos** | **1,109** | **2,096** | **no (~30 files)** |
| **Total available** | 1,215 | **2,523** | Stage 1 analysed **17%** |

548 of 1,109 memos carry a `## Mistakes I made` section; 347 carry `## External-model calibration`.
Memos are the **any-agent** channel (Rule 69 — Codex, Qwen, terminal sessions); packets are
Fable-tier only (Rule 68). The two corpora therefore sample *different populations of agent*, and
any conclusion drawn from packets alone is a conclusion about Fable-tier seats only.

### Method, and a discarded instrument

A regex signature-matcher over the five Stage-1 classes returned **56.9% UNCLASSIFIED**. That is a
failed instrument, not a finding, and its percentages are **not reported here** — reporting a
distribution from a probe that misses more than half would be the corpus's own dominant error.
What follows is instrument-free n-gram frequency over all 2,096 bullets: no hand-written patterns,
no class assumptions, stopwords removed only.

### Finding 1 — recurrence is worse in the memos than in the packets

| Phrase | Hits |
|---|---|
| `caught because` | **84** |
| `without checking` | **47** |
| `nearly reported` | **44** |
| `already written` | **41** |
| `three times` | 39 · `third time` 25 · `second time` 23 |
| `one session` | 31 · `time session` 27 · `three times one session` 5 |
| `nearly shipped` | **34** |

`third time session` (13) and `times one session` (8) are literal phrases: agents recording that
they made the same error **three times inside a single session**. `mistake already written` (7),
`lesson already written` (6) and `class already written` (5) independently reproduce the packet
corpus's headline — documentation does not stop recurrence — from a corpus five times larger and
sampled from different agents. **The Stage-1 38–47% range is corroborated, not contradicted.**

`nearly reported` (44) + `nearly shipped` (34) = **78 recorded near-misses** — errors caught before
reaching Sean. Stage 1 had almost no visibility into these because near-misses rarely earn a
Fable-tier packet. This is the single largest category of evidence Stage 1 was blind to.

### Finding 2 — what actually catches errors, measured

The dominant catch verb is not a rule. It is a command:

| Catch mechanism | Hits |
|---|---|
| `caught because` (+ `caught because ran` 10, `caught because checked` 7, `because ran` 19) | **84** |
| `caught reading` | **26** |
| `hostile round` 23 · `hostile pass` 18 · `caught hostile round` 9 · `caught hostile pass` 8 · `caught dry-loop round` 7 | **~65 combined** |
| `caught node check` | 5 |

**Nothing in the top-25 says "caught by remembering a rule."** Every high-frequency catch phrase is
an *executed action* — ran it, checked it, read it, or an adversarial round. This is the strongest
empirical support in either corpus for the Q4 conclusion, and it is the load-bearing input to the
CLAUDE.md rewrite: **a rule that does not attach a command is not a control.**

### Finding 3 — named mechanisms the rulebook does not name

| Mechanism (verbatim frequency) | Hits | Covered by a rule? |
|---|---|---|
| `exit code` 39 · `piped exit code` 5 | **44** | **NO** — no rule governs reading exit status separately from output |
| `instrument believing negative` 13 · `validate instrument believing` 10 | **23** | partially (Rule 80 second-vantage) |
| `origin main` 38 · `commits behind main` 5 · `origin main head` 6 | **49** | **NO** — no rule requires branch-freshness before auditing |
| `produced false` | 21 | **NO** |
| `whose entire purpose` | 8 | **NO** — the "control that does not control" class |
| `passed wrong reason` | 5 | partially (Rule 79) |
| `git add` | 23 | Rule 67 R6 (exists, still violated) |
| `line cap` | 19 | Rule 4 (exists, still violated) |
| `stop hook` | 18 | mechanism, not rule — **and it works** |

`rule prevents repeat` (10) and `none new turn` (6) appear as recurring literal phrases, i.e. agents
explicitly recording *which rule should have prevented the repeat* — a directly minable mapping from
error class to failing rule, available for the rewrite.

### Finding 4 — the exit-code class is corpus-wide, not a one-off

`exit code` appears **39 times** across the memos, `piped exit code` 5. The defect found on
2026-08-23 in `hermes-learning-validate.mjs` (prints `FAILING: 28`, exits `0`) is therefore **not an
isolated bug** — it is an instance of the corpus's most-repeated unnamed mechanism. Any rewrite that
does not produce a standing rule about verifying exit status independently of printed output leaves
the single most-recurring un-ruled failure unaddressed.

### Consequence for Stage 2

The panel packet must carry **2,523 mistake bullets across 1,215 files**, not 427 across 106.
Firing seats against the packet corpus alone would have produced conclusions about Fable-tier
behaviour and presented them as conclusions about the system.

**Extract:** `.ai-workflow/forensics-extract/memo-mistakes.json` (2,096 bullets, source-attributed,
re-runnable).

---
decision: Stop adding prose rules. Convert the top recurring failure families into deterministic gates, cut CLAUDE.md to a router, and give Hermes a soul.md delta of the same shape.
status: open
supersedes: docs/ai-workflow/AI-HANDOFF/HERMES-WORK-ORDER-AI-WEAKEST-LINKS-2026-08-23.md (this is the review that work order commissioned — executed by Fable, not Hermes; bias disclosed in §7)
originating_model: claude-fable-5
created: 2026-08-25
corpus: 129 learning packets + 466 pending memos + 696 consumed memos = 1,291 documents, 2026-07-11 → 2026-08-25
---

# The weakest link in every AI seat — what two months of agent reports actually say

## 1. Verdict

**The weakest link is not a model. It is the belief that writing a rule down changes behavior.**

Across 377 ledgered error rows, **48% (182) were errors the corpus had ALREADY written up before
they recurred.** The single worst family — stating a fact about one file or branch as if it were
true of the whole repo — recurs **88% of the time after being documented**. Meanwhile, the
hooks that exist caught **266 near-misses** in the same period. The data says one thing clearly:
**deterministic gates work; prose does not.** And CLAUDE.md is now 988 lines / **73 numbered
rules / ~41,000 tokens loaded into every session** — almost all of it prose, most of it
restating behavior that either has a hook already or has been proven not to hold as prose.

Per model, normalized for volume: **Opus 5 self-reports 4.8 mistakes per artifact; Fable 5
reports 2.8.** That is Sean's "for every bug it fixes it adds one," measured. The families where
Opus is disproportionate are shell escaping (66 vs 16) and narrow-read→broad-claim (59 vs 9) —
both mechanizable.

So the answer to "what do we build" is not more rules. It is: **three new gates, one prune,
and a soul.md that carries the same three reflexes.**

## 2. The numbers

| Source | Count |
|---|---|
| Documents scanned | 1,291 |
| `## Mistakes I made` bullets | **2,728** |
| `Error → fix → repeat` ledger rows | **377** |
| Ledger rows already written up before recurring | **182 (48%)** |
| Ledger rows naming a procedural/mechanical control as what stopped it | 152 (40%) — the rest: prose, awareness, or "nothing yet" |
| Near-misses explicitly caught by an existing hook/gate | **266** |
| Existing deterministic hooks | 13 |
| CLAUDE.md numbered rules / lines / tokens-per-session | **73 / 988 / ~41k** (first draft said 99 — that was the naive count incl. 26 checklist items; corrected after panel) |

Coverage disclosure: my keyword families classified 116/377 rows and 647/2,728 bullets (~30%).
I sampled 45 of the 1,915 unclassified bullets; they surfaced three more families (in §3) and a
long tail of one-offs. The ranking below is robust to that tail; the absolute counts are floors.

## 3. Failure families, ranked by (recurrence after write-up × volume)

| # | Family | Rows | Bullets | **Repeat after write-up** | Opus : Fable | Gate today? |
|---|---|---|---|---|---|---|
| 1 | **NARROW-READ → BROAD CLAIM** — one file/branch/grep stated as repo-wide truth; premature "it's absent" | 17 | 100 | **88%** | 59 : 9 | `drift-check` catches stale-branch only. **No sweep/absence gate.** |
| 2 | **INSTRUMENT-TRUST** — believed an exit code, a green suite, a probe, a tool's "done" without proving it could detect the thing | 37 | 116 (+28 invalid-probe) | **68%** | 60 : 22 | `exit-status-gate` (piped `$?` only). **No probe-validation gate.** |
| 3 | **SHELL / ESCAPING** — heredoc, backslash, inline `node -e`, Windows path/quoting mangled | 19 | **123** | **63%** | 66 : 16 | **None.** Highest bullet count in the corpus. |
| 4 | **UNVERIFIED CLAIM IN ARTIFACT** — "done/fixed/fed/verified" written without evidence; capability stated in doctrine | 15 | 41 | 60% | 23 : 5 | `dry-loop-gate`, `dual-tier-gate` (closeout shape only). Content not checked. |
| 5 | **UNCOMMITTED / SHARED-INDEX** — work untracked, wiped, or another agent's staged files swept into a commit | 2 | 73 | 100% | 36 : 14 | `lane-staged` guard, `backup-after-work`, `push-blast-radius` — **working** (caught it twice on 2026-08-24). |
| 6 | **OWN-TEST-WRONG** — tautological, unreachable, injected double, asserts the wrong property | 7 | 37 | 57% | 23 : 0 | None. |
| 7 | **SCHEMA / CONTRACT DRIFT** — model vs DB vs caller vs response shape; doc drifting from code in-session | 6 | 47 | 50% | 23 : 6 | `db-blast-radius` (DDL only). Rule 58 is prose. |
| 8 | **RULE-CONTRADICTION / BLOAT** — a widened rule left its own prose contradicting it; a 35-line block in a file that says "keep SHORT" | — | 43 | — | 23 : 9 | None — and CLAUDE.md is the largest instance. |
| 9 | **TRUSTED REVIEWER / SPEC / DOC over the tree** — adopted a panel finding or a documented claim because the *rest* held | 4 | 34 | 50% | 24 : 5 | None (Rules 30/52 are prose). |
| 10 | **CHANGE-BEFORE-MEASURE** — built a detector / applied a fix before measuring real data or the baseline | 4 | 29 | 50% | 12 : 1 | None. |
| 11 | **API-FROM-MEMORY** — a flag, import, or export that does not exist in the installed version (`--reporter=basic`, a never-exported constant) | — | 18 | — | 8 : 3 | None (Rule 18 is prose; `node --check` can't see missing named exports). |
| 12 | **NUMBERS** — arithmetic/denominator drift; three numbers for one quantity | 1 | 18 | — | 13 : 1 | None — and this document itself did it: the first draft said 99 rules; the drift-check's 73 was right. |

Read the last two columns together. **Every family with a working gate is either rare or
caught. Every family without one recurs at 50–88% despite being written up.** Family 5 is the
proof-of-concept: the shared-index collision is a nasty, easy-to-make error, and the lane-staged
guard caught it twice in one day. That is what "solved" looks like in this corpus.

## 4. Per-seat profile

Normalized per artifact (a packet or memo), because raw counts just measure who did the most work.

| Seat | Artifacts | Mistake bullets | **Per artifact** | Characteristic failure | Genuine strength |
|---|---|---|---|---|---|
| **Opus 5** | 311 | 1,478 | **4.8** | Shell/escaping (66), narrow-read→broad (59), instrument-trust (60). Acts fast on a partial read; fixes the case, not the property ("a fix is where the next bug lives" — 5/5 review rounds bred a new defect). | Volume, honesty of self-report, catches its own errors mid-task at a high rate (142 of the 266 near-misses are its). |
| **Fable 5** | 119 | 338 | **2.8** | Same families at ~⅓ the rate; distinct weakness: **priority inversion** — polishing the review instrument while the subject sat unprotected; missed two safety-path defaults (`!== true`, `?? 0`) in its own fix. | Lowest error rate; reverses its own claims in public; reads the venue not just the artifact. |
| **Unattributed** (older memo formats) | 223 | 912 | 4.1 | Mostly Opus-era; same distribution. | — |
| **GLM 5.3** ($0) | reviewer | — | — | Occasionally scope-shifts to UI work the build order defers; one transport bug (empty-file) documented. | **Strongest free seat in the corpus.** Found the decisive HIGH in 3 of 5 rounds on 2026-08-24; returns honest `findings:(none)`. |
| **Ox Alpha** ($0) | reviewer | — | — | Verdict-unstable across separated calls on *narrative* packets; free pool rate-limits bursts (429). **Every "Ox" verdict before 2026-08-24 was actually Grok** — seat bug, now fixed and provable. | Stable and corroborating on *concrete code* packets; names the disease, not just the symptom. |
| **Grok 4.6** (~$0.06–0.11) | reviewer | — | — | One degenerate 48k-token loop ($0.29, zero content). | Sharp denominator/quantity catches; clean calibrated no-findings passes. |
| **Kimi K3** (~$0.03–0.31) | reviewer | — | — | Insufficient rows in the ledger sections to profile fairly. | Prior rounds: honest dev-month pricing; substrate-monotony thesis. |
| **Codex** | pair-coder | 9 mentions | — | INSUFFICIENT EVIDENCE — Codex rarely writes packets; its record exists only through Claude-authored memos. | Historical catch record in CLAUDE.md Rule 46 stands. |
| DeepSeek V4 / HY3 / Sol | reviewers | — | — | INSUFFICIENT EVIDENCE for a failure *shape*; costs and hit-rates are in individual packets only. | — |

**The seat conclusion:** Opus 5 is not broken; it is *fast and under-gated*. Its families are
the three most mechanizable in the table. Put the gates in and Opus's rate falls toward Fable's
without changing the model. That is cheaper than routing everything to Fable.

## 5. What to change — the actual deliverable

### 5a. Three new deterministic gates (the only fix the corpus says holds)

**G1 — `heredoc-escape-gate.mjs` (PreToolUse: Bash).** Block any Bash command that contains a
heredoc (`<<`) or an inline interpreter (`node -e`, `python -c`, `python -`) whose body contains
backticks, `${`, `\n`/`\t` escapes, or markdown table pipes. Message: *"Use the Write tool for
this content — 123 corpus incidents, 63% recurrence."* Family 3 disappears. Zero judgment
required; pure syntax. **This single hook addresses the highest-count family in the corpus.**

**G2 — `absence-claim-gate.mjs` (Stop).** If the closing message asserts an absence — *does not
exist / is missing / absent / no X found / zero results / never runs* — and the turn's transcript
contains no **positive control** (the same instrument finding a known-present item), block:
*"Validate the instrument: run the same command against something you know exists, and cite
both."* Heuristic, fail-open on ambiguity, escape hatch `ABSENCE: N/A — <reason>`. Family 1
(88% recurrence) and the invalid-probe half of family 2. This is the corpus's own lesson
("validate the instrument before reporting absence", 2026-08-21) turned from prose into a gate.

**G3 — `rulebook-budget-gate.mjs` (pre-commit).** Refuse a commit that grows `CLAUDE.md` past a
byte budget (proposal: 60 KB ≈ 15k tokens, from 164 KB) or adds a numbered rule without removing
one. Family 8, and the meta-fix: **"keep it lean" is itself a prose rule and will not hold as
prose.** The corpus's thesis applied to the corpus.

Proposed but NOT specified here (needs a design pass): **G4 staged-import smoke** for family 11 —
`node --check` plus import-resolution of staged `.mjs` files. Rule 42's "import-execution smoke"
already says to do this by hand; nobody does. Mechanizing it is the only way it happens.

### 5b. The prune — CLAUDE.md from 73 prose rules (988 lines) to a leaner file — REVISED after panel, see §9

CLAUDE.md is the **largest single instance of family 8** in the repo. 41k tokens per session, and
the first draft of this document miscounted its rules (said 99; the drift-check's 73 is right). The prune is not "delete
rules." It is: **a rule that has a gate becomes one line pointing at the gate; a rule that has
no gate and recurs anyway gets a gate or gets cut.**

| Bucket | Rules (by number) | Action |
|---|---|---|
| **Gated already** — the hook enforces it; the prose is redundant | 42 (lane/rule-42 guards), 44/59 (secret scan), 57 (dual-tier gate), 61/73 (dry-loop gate), 66 (prompt-watcher), 67 (lane guards), 69 (closeout gate), 70 (push-blast-radius), spend rules under 16 (spend-guard) | Compress each to **one line**: `Rule N — <intent>. Enforced by scripts/hooks/<file>.` Body → `docs/ai-workflow/references/RULES-GATED.md`. |
| **Becomes gated by G1–G3** | 18, 20, 30, 51, 52, 54, 55, 56 (instrument/sibling/claim rules) | Same compression once the gate ships. |
| **Load-bearing, un-gateable, keep in full** | Identity, Product Core Loop, Palette, 1–15 (stack laws), 26–29 (surface receipts), 58 (schema drift), 62 (strategy gate), 64/65 (grill/chromie routing), 68/71/72 (Hermes/catalog law) | Keep, but no narrative incident history in the rule body — incidents belong in the learning corpus, which is where the router points. |
| **Historical / incident narrative inside rules** | Most of 46, 47, 48, 49, 53, 57, 58, 59, 69 | Cut the "why" paragraphs to one sentence + a packet link. The corpus IS the why. |
| **Tombstones and repeals** | 12 | Keep (one line). |

Target: **≤300 lines, ≤60 KB.** AGENTS.md mirrors automatically (`sync-agents-mirror.mjs`).
**Not executed in this document** — it is a constitution change with a mirror guard; it lands as
its own commit after the panel and Sean's go, with G3 in the same commit so it cannot regrow.

### 5c. Hermes `SOUL.md` — the same three reflexes, in Hermes's voice

Hermes's soul lives at WSL `~/hermes2/.hermes/SOUL.md` (with `.bak` history). The corpus says
Hermes should carry exactly the three behaviors the gates enforce, because Hermes has no hooks:

1. **Before reporting anything absent, run a positive control.** "I searched and found nothing"
   is a hypothesis until the same search finds something known to exist.
2. **Never write content with backticks, `${`, or table pipes through a shell heredoc or `-e`.**
   Write the file.
3. **A fix is where the next bug lives.** After adopting a review finding, re-read every section
   the fix touches before declaring done. (5-for-5 in the corpus.)

Plus one calibration line: **Ox rows before 2026-08-24 are Grok rows.** Delivered as a paste-ready
patch (`docs/ai-workflow/hermes-learning-packets/SOUL-DELTA-2026-08-25.md`), not written into
WSL by me — that file is Sean's to apply.

### 5d. Skills — one new, zero re-explained

`skill-harvest`'s own bar is "a thing Sean keeps re-explaining." The corpus shows the re-explained
thing is not a *task* — it is the review discipline itself. No new task-skill is warranted.
One new skill, **`instrument-check`** (`.claude/skills/instrument-check/SKILL.md`): the
positive-control procedure G2 enforces, in loadable form for models that run without hooks
(Codex, Hermes, Qwen). ≤40 lines.

## 6. What this changes for Sean, in clicks

Today: paste work → agent acts → review round → bug → fix → new bug → review. The corpus shows
the loop is fed by three mechanizable families. After G1–G3: the shell-mangling class cannot
happen (blocked before execution); the "it's absent" class must show its control before the
turn can end; the rulebook cannot silently regrow. **Expected effect: Opus's 4.8/artifact trends
toward Fable's 2.8 with no model change, and CLAUDE.md drops ~26k tokens per session** — every
session gets cheaper *and* cleaner.

## 7. What the corpus cannot tell us

- **Authorship bias.** Claude (Opus/Fable) wrote every packet and nearly every memo. Codex,
  Qwen and the paid seats appear only through Claude's account of them. This review was
  executed by Fable, not Hermes, so it is Claude grading Claude — the panel in §8 is the
  independence check.
- **Self-report under-counts.** An agent records the mistakes it *noticed*. The 48% recurrence
  figure is therefore a floor.
- **30% classification coverage.** The tail is long; the top-5 ranking is stable under sampling,
  the lower rows are not.
- **Two numbers for the rule count** (73 vs 99) — MINE, not the drift-check's: 26 of the 99 `N. **` lines are checklist items
  written with a different heading style. Fixing that is part of G3.
- **Ox's pre-2026-08-24 record is Grok's.** Any prior consensus that counted Ox is +1.

## 8. Review

This document went to Ox Alpha ×3, Kimi K3, Grok 4.6, DeepSeek V4 Pro and HY3 on 2026-08-25.
Fable folded the results (§9) and shipped what survived. **Two seats (Kimi F9, Grok F8) said the
author must not be the Final Decider on this, and they are right: the prune (§9.4) is Sean's
decision, presented as a choice, not executed.**

## 9. Panel round 1 — verdicts and rulings

| Seat | Verdict | Cost | Decisive contribution |
|---|---|---|---|
| Kimi K3 | 0.72 — G1 survives; prune/G2/G3 not shippable | $0.16 | F1: Rule 42 falsely bucketed "gated" (G4 is unbuilt) · F4: ATTRIBUTION/CONTEXT is a family, not a caveat |
| Grok 4.6 | REJECT 0.71 | $0.10 | F2/E3: G2 is a classifier with an escape hatch, wrong shape; replace with tool-trace checks · E4: deny-compress list · E10: state the metric, hold the 4.8→2.8 claim |
| DeepSeek V4 Pro | REJECT 0.82 | $0.006 | F1: 48% is self-selected · F4: context-window amnesia family · E4: review gate, not byte budget |
| HY3 | REJECT 0.82 | ~$0.01 | F2: G1 must be quoting-aware · F6: truncated-observation family · F10: own-test-wrong unaddressed · E10: two more SOUL reflexes |
| Ox Alpha ×3 | CONFIRM 0.74 / REJECT 0.82 / void (retry budget exhausted) | $0 | Call 2 exercised the new 429→retry path live and parsed |

**Unanimous across seats:** the direction (gate the mechanizable families, stop adding prose)
survives; the 48% figure is a self-report floor, not a causal measure; G1 is the right family
with the wrong first predicate; G2 as a blocker is a prose ritual in hook form; G3 as a byte
budget is gameable; the prune map as drafted would compress un-gated load-bearing rules.

### 9.1 Rulings — what changed because of the panel

| Item | Ruling | Shipped? |
|---|---|---|
| **48% claim** | Restated: a floor from 377 self-selected ledger rows (14% of bullets), same author judging "recurrence." The hard signal is the **266 hook catches** and the gated-vs-ungated contrast in §3. | doc amended |
| **G1 heredoc gate** | Narrowed to the MECHANISM: block only *unquoted* heredocs and *double-quoted* `-e`/`-c` bodies containing `${`, backtick, or backslash. Quoted heredocs and single-quoted bodies are verbatim and pass. No table-pipe rule (pipes don't expand). `SWAN_HEREDOC_GATE=shadow` logs instead of blocking; every invocation logs `blocked/shadow/bodies` to `.ai-workflow/gates/fires.jsonl` so the rate has a denominator. 15/15 tests. | **yes** — `scripts/hooks/heredoc-escape-gate.mjs`, wired PreToolUse:Bash |
| **G2 absence gate** | **Killed as a blocker.** Replaced by (a) `scripts/sweep.mjs` — one command searching every surface + origin/main + branches, printing a receipt, so the wide search is cheaper than the narrow one; (b) `instrument-check` skill — the positive-control procedure for hookless seats. Grok E3(a) truncated-read tool-trace check is recorded as **G5, unbuilt**. | **yes** (helper + skill); G5 open |
| **G3 rulebook budget** | **Replaced** by `rulebook-review-guard` (commit-msg hook): a change to CLAUDE.md / AGENTS.md / ACTIVE-INDEX.md / Hermes standing-context must carry `RULEBOOK: <verb> <what> — reviewed-by: <seat>`; reports rule count vs claimed count and byte delta, never meters. Caught my own defect while building it: as a pre-commit hook it would have read the *previous* commit's message. | **yes** — `.githooks/commit-msg` |
| **Prune map** | **Not executed.** Revised: narrative-cut only (incident paragraphs that duplicate a learning packet), every normative sentence stays in place, **no side file** (Grok F10: AGENTS-only and hookless seats lose law if rules become pointers). Deny-compress: Identity, Core Loop, Palette, 18, 26–29, 30, 46, 52, 58, 62, 64/65, 68/71/72, every spend/secret/data-loss rule. Rule 42 re-bucketed to **NOT gated** (Kimi F1). Target ≈ 650 lines, not 300. Lands as its own commit with a `RULEBOOK:` trailer, **on Sean's go.** | Sean decides |
| **SOUL delta** | Five reflexes (the original three + HY3's "clipped ≠ clean" and "validate the test, not the suite") + the Ox=Grok calibration fact. Labeled reflexes, not gates (Grok E9). Paste-ready, not written into WSL by an agent. | **yes** — `hermes-learning-packets/SOUL-DELTA-2026-08-25.md` |
| **Missed families** | Added: **ATTRIBUTION/CONTEXT** (wrong seat/branch/base — Kimi F4), **CASE-NOT-PROPERTY** (Grok F6), **TRUNCATED-OBSERVATION** (HY3 F6 / Grok F6), **CONTEXT-AMNESIA** (DeepSeek F4). The first is provably real: Ox was Grok for two months. | doc amended |
| **"Opus 4.8 → Fable 2.8" convergence** | Withdrawn as a claim. Kept as a **hypothesis with a metric** (Grok E10): family-3 bullets per 100 Bash calls, pre/post G1, 14 days — computable from `fires.jsonl`. | doc amended |
| **Rule count** | My error, not the drift-check's: 73 rules; the 26 extra `N. **` lines are checklist items. | doc amended |
| **Independence** | Accepted. Sean is the decider on §9.4; this document is evidence, not a verdict. | — |

### 9.2 Still open after round 1

- **G4 staged-import smoke** (family 11) and **G5 truncated-read tool-trace check** (family 1's
  larger half) — designed in outline, not built. Both need a false-positive plan first.
- **Own-test-wrong** (family 6, 57%) has no gate; the `instrument-check` skill carries the
  "see it fail first" procedure, which is prose for hooked seats and therefore weak.
- **Kimi / HY3 transports do not ledger** — other agents' WIP in those files.
- **Measurement window**: 14 days of `fires.jsonl` before anyone cites a rate.

### 9.3 What this cost

Kimi $0.16 · Grok $0.10 · DeepSeek $0.006 · HY3 ~$0.01 · Ox $0 · GLM not used this round.
**≈ $0.28 for five seats.** The three paid rows landed in the spend ledger through the writer
that did not exist yesterday.

### 9.4 The one decision that is Sean's

Execute the narrative-cut prune of CLAUDE.md (≈988 → ≈650 lines, every rule kept, incident
paragraphs replaced by packet links, `RULEBOOK:` trailer, mirror re-synced) — **yes / no / later.**

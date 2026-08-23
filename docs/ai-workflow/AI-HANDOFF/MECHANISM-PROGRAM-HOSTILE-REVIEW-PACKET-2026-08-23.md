# Mechanism Program — Hostile Review Packet

**Date:** 2026-08-23 · **For:** ox-alpha · Grok 4.6 · DeepSeek V4 Pro · Kimi K3 · GLM 5.3
**Linear:** SWA-201 (program) · SWA-198 (coordination) · SWA-190 (corpus durability)
**Full evidence:** `HERMES-AI-FAILURE-FORENSICS-REPORT-2026-08-23.md` (Q1–Q8, 2,523 mistake bullets)
**Prior ruling:** `panel-forensics-direction-2026-08-23/FABLE-PANEL-REVIEW.md`

---

## 1. What this program is

An AI coding system kept repeating the same mistakes. 2,523 self-reported agent-mistake bullets were
mined from 1,215 files (427 from 106 Fable-tier learning packets, 2,096 from 1,109 any-agent inbox
memos). Measured catch profile:

```
caught because [ran/checked] ... 84     already written .......... 41
caught reading ................. 26     three times .............. 39
hostile round / pass ........... ~65    third time session ....... 13
rule-recall .................... negligible (see §5 caveat)
```

Fable 5's ruling: **a rule that does not name its trigger and its command is not a rule, it is lore.**
The program converts prose rules into mechanisms that fire at the moment of the act.

## 2. Shipped this session (attack these)

| # | Mechanism | Commit | What it does |
|---|---|---|---|
| 1 | **Schema 1.2.0 `mistake_terminal_state`** | `0692dae7b` | A mistake bullet must contain `MECHANISM:` / `LORE:` / `MERGED:`. "I will be more careful" becomes inexpressible. Date-scoped 2026-08-24 (same-day scoping retro-failed 7 packets by other agents; reverted). |
| 2 | **Review-debt ledger (rules 46+74+82 merged)** | `f28ef6cc8` | A debt opens when a review is owed; closeout blocks build-shaped turns carrying open debt; closes only by naming an artifact that EXISTS, or a recorded waiver. One JSON file per debt. |
| 3 | **Panel anti-clobber** | `f0b4d075b` | Three panels shared `panel-<date>/` and destroyed five of seven replies to the forensics report. Default now carries a doc slug; guard refuses a colliding write (exit 4). |
| 4 | **Exit-status gate** | `3bcea829f` + `13d62e887` | PreToolUse(Bash). Blocks `pipeline + bare $?` with no PIPESTATUS/pipefail. 44 corpus hits, the most-recurring un-ruled mechanism. |
| 5 | **Coordination ledger repair** | `1afe5bde5` | Pruner now archives dead session lanes; SessionStart briefing capped. 72 lanes → 35; briefing 24 lines → 9. |

## 3. Defects found IN THIS WORK, already fixed (the pattern matters more than the fixes)

- **Review-debt `settle()`** wrote `closed/` then unlinked `open/` — a crash between left the debt in BOTH dirs, blocking closeout forever with no way to settle. Found by Qwen, not by 24 passing tests.
- **Exit-status gate, false positive:** blocked a compound command whose `$?` followed a BARE command, because an unrelated earlier statement had a pipe. Fired falsely within two commands of going live.
- **Exit-status gate, false negative introduced by that fix:** segment offsets built on a quote-masked string while `$?` was located in the raw one, and the mask COLLAPSED quoted spans. `npm test | tail -5; echo "exit=$?"` — 34 raw, 27 masked, statusIdx 31 past the end — silently un-blocked the defect in its most common form.
- **A test that pinned the bug:** `stripQuoted removes quoted spans without eating $?` asserted the exact collapsed output, i.e. the implementation detail that caused the failure. It would have gone green on the broken version.
- **Schema rule scoped to today** retro-failed 7 packets by other agents (28 → 35 FAILING).
- **A hook that read stdin at module load**, making its own test suite hang and its logic untestable.

## 4. Open, NOT fixed — decisions needed

1. **6 orphaned worktree ledgers** under `C:/tmp/...` — agents published lanes "where no agent reads". Those sessions were invisible to everyone. Redirect, or aggregate?
2. **Shared git index.** `git add` by one agent + `git commit` by another transfers the files. Observed `f0b4d075b`. Lane discipline cannot prevent it.
3. **Review-debt gate is volume-triggered** (3+ writes or a commit). Two writes with no commit evades. Lowering to 1 write would block trivial edits and get the gate switched off.
4. **Registration is uncommitted.** The exit-status gate's `settings.json` entry is live but not committed, because that file carries another agent's 71-insertion restructure.
5. `fable.lane.md` has TWO `EDITING NOW` sections; only the first is read → stale claim.
6. **24 stale lanes still hold locks**; releasing them is a human call (R5).
7. `scripts/lane.mjs` has **no test file** — the tooling governing multi-agent safety is untested.
8. **The rulebook still says "66 MANDATORY rules"; there are 83 definitions** (a third figure, 164 numbered defs, appears in the report). Three numbers, no agreement.

## 5. Known weaknesses in our own evidence — do not repeat them back to us

- `caught by remembering a rule: 0` is an **instrument artifact**. Nobody writes that phrase; an agent whose rule fired writes "checked first," which lands in another bucket. Treat as *rare and unmeasurable*, not zero.
- The 5-class taxonomy is really **3 roots**: trusted instrument, drifted number, untriggered process.
- Coverage of the memo corpus was verified by grep for one heading; near-misses are under-sampled because they rarely earn a packet.
- **A premise inside a review prompt is not reviewed.** A previous panel had 7 of 7 seats echo back a false premise because it was stated in the brief. Audit §1–§4 before reasoning from them.

## 6. Your remit — FULL SPECTRUM (Rule 82)

Every seat answers ALL of the following. A reply covering only one lane is incomplete.

1. **Attack the five shipped mechanisms.** Where does each fail, get bypassed, or produce false confidence? Name the escape.
2. **§3 is a list of defects we shipped and then caught.** What does that pattern say about how this work is being done, and what mechanism would catch the NEXT one earlier?
3. **§4 — rank the eight open items** by real risk, and say which are actually the same problem.
4. **What are we building that we should NOT be?** Which of these mechanisms will be switched off within a month, and why?
5. **Logic and components to upgrade:** concretely, what should be rewritten rather than patched?
6. **What is the next slice?** Not a wish list — the single highest-value next move, with the evidence that makes it highest.
7. **What did nobody look at?**

Be concrete and adversarial. Do not praise. If you would design any of this differently, say exactly how.

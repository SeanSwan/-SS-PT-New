# SESSION HANDOFF — Mechanism Program

**Written:** 2026-08-23 by `vs-claude` (claude-opus-5) · **For:** the next agent, cold start
**Branch:** `wip/comms-notifications-2026-07-05` — **2,197+ commits behind `origin/main`**
**Linear:** SWA-201 (program) · SWA-198 (coordination) · SWA-190 (corpus durability)

> Read §1 and §2. Everything else is reference you can pull when you need it.
> If you read only one thing: **§7 — things I believed that were false.**

---

## 1. What Sean is actually trying to do

Not "fix bugs." The goal, in his words across two sessions:

1. **Stop the same errors recurring.** They have been recurring for months, across every agent.
2. **Use the recorded evidence to rewrite the operating files** — `CLAUDE.md`, `AGENTS.md`, the
   Hermes workflow, and `SOUL.md` — so the rules reflect what actually goes wrong.
3. **Make boot context small.** An agent should start a conversation able to *think fast and move
   quickly*, not wade through a 215 KB rulebook. This is a performance goal, not tidiness.
4. **Build guards so the errors cannot happen**, rather than writing them down again.
5. **Run the full AI Village** — explicitly including **ox-alpha, GPT-5.6 Sol, and Fable** — to
   produce the **blueprint, wireframe, flowchart, and mermaid** for how to do this.

**`SOUL.md` does not exist yet.** I checked. Sean named it as a file to update; treat it as
to-be-created and ask him what belongs in it before inventing a purpose for it.

## 2. Where we are right now

**The evidence is complete and delivered.** Two reports:

| Report | What it answers |
|---|---|
| `HERMES-AI-FAILURE-FORENSICS-REPORT-2026-08-23.md` | **Thematic** — Q1–Q8, what *kinds* of mistakes we make, across 2,523 bullets |
| `PER-FILE-ISSUE-INVENTORY-2026-08-23.md` | **Per-file** — all 612 files, all 2,546 issues, verbatim, worst-first |

The second exists because Sean asked three times for "all the files that shows all the issues" and
kept getting the first one. **A thematic report is not an inventory.** Do not repeat that.

**Four mechanisms have shipped.** Three panels have run. The next task is the Village blueprint run
(§8) — it has not started.

## 3. The governing finding

Measured, instrument-free, across 2,096 memo bullets:

```
caught because [ran/checked] ... 84     already written .......... 41
caught reading ................. 26     three times .............. 39
hostile round / pass ........... ~65    third time session ....... 13
rule-recall .................... negligible  (see §7 — NOT zero)
```

> **A rule that does not name its trigger and its command is not a rule. It is lore.**
> — Fable 5, Final-Decider ruling

Corollary added this session: **a mechanism the agent must choose to invoke is not a mechanism.**

## 4. Shipped (attack these, don't rebuild them)

| Mechanism | Commit | What it does |
|---|---|---|
| Schema 1.2.0 `mistake_terminal_state` | `0692dae7b` | A mistake bullet must carry `MECHANISM:` / `LORE:` / `MERGED:`. "I'll be more careful" is inexpressible. Effective 2026-08-24. |
| Review-debt ledger (46+74+82 merged) | `f28ef6cc8` | Debt opens when a review is owed; closeout blocks build turns carrying it; closes only by naming an artifact that exists, or a recorded waiver. |
| Panel anti-clobber | `f0b4d075b` | Default out-dir carries a doc slug; guard refuses a colliding write (exit 4) **before any seat spends**. |
| Exit-status gate | `3bcea829f`, `13d62e887` | PreToolUse(Bash). Blocks `pipeline + bare $?`. 31 tests. **Registration is live but UNCOMMITTED — see §6.1.** |
| Coordination ledger repair | `1afe5bde5` | Pruner archives dead lanes; briefing capped. 72 lanes → 35; briefing 24 lines → 9. |
| Lane-staged guard | `2048f6286` | Refuses a commit carrying files you never claimed. **Built, tested, NOT WIRED — Sean's call.** |

## 5. Panel verdicts to date

- **Fable 5 (Final Decider)** — `panel-forensics-direction-2026-08-23/FABLE-PANEL-REVIEW.md`. Ranked seven planks by evidence strength; four are now shipped. **Fable audited the prompt's premises and rejected four of them** before answering. Read that section before writing any new panel brief.
- **ox-alpha** — `panel-2026-08-23-mechanism-program-hostile-review-packet-2026-08-/OX-ALPHA-PANEL-REVIEW.md`. **REVISE.** Three P1 blockers; I verified two of them do not apply (§7). Its synthesis is the most valuable output of the session — see §6.
- Also in that dir: Grok, DeepSeek V4 Pro, Kimi K3, GLM 5.3, Qwen. All substantive, unread by me at handoff time. **Read them — I did not.**

## 6. Open items, ranked (ox-alpha's ordering, which I agree with)

### 6.1 — HIGHEST RISK: the shared git index
Agents share one index. `git add` by A + `git commit` by B puts A's files in B's commit.
**Observed three times in 24 hours**, including once by me the day after I documented it.
- Fix (a): per-agent worktree with its own `GIT_INDEX_FILE`. Hours of work, no protocol change.
- Fix (b): **SHIPPED as `scripts/lane-staged-guard.mjs`** — needs one line in `.githooks/pre-commit`.
- ox: *"Do this before adding any further gate. Gates on top of corrupt foundations produce
  confident wrong verdicts."*

### 6.2 — Exit-status gate registration is uncommitted
The `settings.json` entry is live in the working tree but not in any commit, because that file
carries another agent's 71-insertion restructure. ox's scenario: **another agent commits their
`settings.json` from a checkout without the entry, the gate silently ceases to exist, the catch
rate drops, and you read it as improvement.** Cheapest high-asymmetry fix on the board.

### 6.3 — `lane.mjs` has zero tests
It governs 6.1, 6.4, 6.5. Untested safety-critical tooling is the meta-defect.

### 6.4–6.6 — Four symptoms, ONE missing mechanism
ox's synthesis, and the best idea in the session:
- 6 orphaned worktree ledgers under `C:/tmp/...` — lanes published where no reader looks
- `fable.lane.md` has two `EDITING NOW` sections; only the first is read → stale claim
- 24 stale lanes still holding locks
- the shared index itself

> All four are **shared mutable state with no ownership lease.** Build **leased claims**
> (owner + heartbeat + TTL + automatic release on expiry) once in `lane.mjs`, and 6.4–6.6 collapse
> into configuration. **ox's recommended next slice, test-first.**

### 6.7 — Rule-count drift: 66 vs 83 vs 164
The header says 66; there are 83 definitions; the report says 164 numbered defs. Three numbers, no
agreement. ox: symbolically fatal — *the program's thesis is that drifted numbers are a root cause,
and the rulebook's own count is a drifted number.* Generate it or stop printing it.

### 6.8 — Review-debt gate is volume-triggered
3+ writes or a commit. Two writes with no commit evades. Tuning, not structural.

## 7. Things I believed that were FALSE — do not re-derive them

This is the highest-value section. Each cost real time.

1. **"The validator prints FAIL and exits 0."** FALSE — `--check` exits 2. Then I claimed **"nothing
   invokes it"** — also FALSE, `hermes-closeout-gate.mjs` imports `validatePacket` as a module and
   blocks on it, with 19 tests. Then **"a scoped gate needs designing"** — FALSE, `--file` exists.
   **Three wrong claims about one file, all of which reached a paid panel as premises.**
2. **"caught by remembering a rule: 0"** is an **instrument artifact**, not a measurement (Fable).
   Nobody writes that phrase. Treat as *rare and unmeasurable*.
3. **"The 3 AM gateway crash."** Not a crash — a scheduled backup stopping the gateway for a
   consistent snapshot and restarting it.
4. **"The nightly backup covers untracked files."** FALSE — `SS-PT-full-*.bundle` are git bundles;
   they carry committed objects only.
5. **ox Blocker 1 (`settle()` may silently destroy debt)** — does not apply. Verified: `closed/` is
   written first and `openDebts()` filters any open file with a matching closed record, so a crash
   mid-settle reads as settled.
6. **ox Blocker 2 (anti-clobber discards a reply)** — wrong mechanism. The guard sits before
   `mkdirSync` and `spawn`; it refuses the *run*, pre-spend. TOCTOU residual is real but narrow.

**Method note:** in four separate cases my own test harness produced a false negative and I nearly
"fixed" working code. Before concluding something is broken, **prove your harness can produce a
positive.**

## 8. THE NEXT TASK — the Village blueprint run

Sean's explicit ask. Not started.

**Seats:** the full Village, and he named three specifically — **ox-alpha, GPT-5.6 Sol, Fable 5**.
Suggested full roster: `ox,sol,fable,kimi,glm,grok,dspro,dsflash,qwen,gemini`.
Est. **≈$1.50–2.00** (fable ~$0.47, sol ~$0.13 dominate). **Rule 16: ask Sean before spending.**
The spend-guard hook will block a single call over $1.00 and require his token — expect that.

**Deliverables to demand from every seat (full-spectrum, Rule 82):**
1. **Blueprint** — the target architecture for `CLAUDE.md` / `AGENTS.md` / Hermes workflow / `SOUL.md`
2. **Wireframe** — what an agent actually sees at conversation start, laid out
3. **Flowchart + mermaid** — trigger → command → refusal, and the boot-load path
4. **A boot-context budget** — measured token target, and what earns a place in it
5. **The guard set** — which recurring errors get a mechanism, and which are honestly unguardable
6. **What ELSE Sean should have** that he hasn't asked for — charts, dashboards, indexes, receipts

**Brief must include a §5 "our own evidence is weak here" section.** A previous panel had **7 of 7
seats echo back a false premise** because it was stated in the brief. Fable was the only seat that
audited premises before reasoning. Pre-empt it or you will buy consensus on your own errors.

**Feed the panel the per-file inventory, not just the thematic report.** The inventory is the thing
Sean built this program to get.

## 9. Artifact index

```
docs/ai-workflow/AI-HANDOFF/
  HERMES-AI-FAILURE-FORENSICS-REPORT-2026-08-23.md      thematic, Q1–Q8
  PER-FILE-ISSUE-INVENTORY-2026-08-23.md                612 files, 2,546 issues
  MECHANISM-PROGRAM-HOSTILE-REVIEW-PACKET-2026-08-23.md the packet ox reviewed
  CLAUDE-AGENTS-MD-REARCHITECTURE-BLUEPRINT-V2-2026-08-23.md  superseded in substance
  panel-forensics-direction-2026-08-23/                 Fable ruling + 6 seats
  panel-2026-08-23-mechanism-program-hostile-review-packet-2026-08-/  ox REVISE + 5 seats
.ai-workflow/forensics-extract/
  memo-mistakes.json                                    2,096 bullets, source-attributed
scripts/
  review-debt.mjs · lane-staged-guard.mjs · hooks/exit-status-gate.mjs
  coordination-prune.mjs · lane.mjs · hermes-learning-validate.mjs
```

## 10. My hostile review of this program

Sean asked for mine too. Three things I think are wrong with what we built:

1. **We are building gates faster than we are measuring them.** Six mechanisms, zero false-positive
   telemetry. The corpus counts catches; nothing counts wrongful blocks. ox is right that attrition
   is the kill condition, and we are flying blind on the only metric that predicts survival.
2. **`mistake_terminal_state` is a spell-checker, not a semantic gate.** `MECHANISM: I will try
   harder` passes. I built token-presence and called it a decision. It raises the cost of writing
   lore, which is worth something — but the packet oversold it and I should say so plainly.
3. **The corpus has survivorship bias and the whole program inherits it.** 2,546 issues are the
   *noticed* ones. Silent wrong outputs are structurally absent from the dataset driving every
   decision here. We are optimising the visible error distribution and calling it the error
   distribution.

One thing I think is right: **converting rules into triggers is correct, and the evidence for it is
the strongest in the corpus.** Do not let the criticisms above stall it.

---

## Cold-start checklist

1. `git log --oneline -12` — see the six mechanism commits
2. Read §7 of this file before believing anything
3. `node scripts/lane.mjs claim --task "..." --files "..."` — claim before your first edit
4. `node scripts/hermes-learning-validate.mjs` — corpus health (28 known failures)
5. `node scripts/review-debt.mjs list` — outstanding reviews
6. Ask Sean about `SOUL.md` before assuming its purpose
7. Ask Sean for spend approval before the Village run

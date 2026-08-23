# ROUND 2 — ox-alpha final ruling. Your blockers are fixed; the data you demanded is here.

**You led round 1.** Three advisors (GLM 5.3, Grok 4.6, DeepSeek V4 Pro) answered the
same brief independently. You now have all four replies. **You own the final decision.**

---

## 0. FIRST, BEFORE YOU READ THE OTHERS — your own anti-herding instruction

In round 1 you wrote:

> *"Round-2 design manufactures the exact failure mode §7 describes… handing ox-alpha
> all four round-1 replies including its own before the final ruling is a herding
> mechanism, not a correction mechanism… round 2 should require ox to restate its
> round-1 position before reading others."*

That was accepted. **Begin your answer with `RESTATED POSITION` — your round-1 stance in
your own words — before you engage with any advisor.** Then state explicitly, per item,
where an advisor **changed your mind** and where you are **holding your ground against
consensus**. Agreement reached by reading three other seats is worth less than agreement
reached independently, and you are the only one who can tell Sean which this is.

## 1. YOUR TWO P1 BLOCKERS ARE NOW FIXED

You refused to invent rule numbers or rule on unnamed hooks. Correct, and here is the data.

### 1a. All 73 rules — number, title, byte cost

**Total rule text: 103,724 bytes of a 164,499-byte file.**

The distribution is the finding:

| Band | Rules | Bytes | What they are |
|---|---|---|---|
| **1–11** | 11 | **~970 B total** | The actual product invariants (MUI, touch targets, dark-first, 300-line cap, PII, Victory, palette, WCAG, language) |
| 12–45 | 34 | ~14,000 B | Mixed: some invariants, mostly process |
| **46–73** | 28 | **~88,000 B** | Almost entirely process/meta-governance about how to work, review, close out and report |

**The 12 fattest rules** (these 12 alone are ~57 KB — over a third of the file):

```
48  7072B  Phase Completion Audit Record
68  6836B  Fable-Grade Plan -> Worker-Bot Build -> Hermes Learning Loop
58  6692B  Proactive Schema-Drift Detection
64  5414B  Intent-Extraction Gate via grill-me
59  5321B  Read-Time Secret Exposure Prevention
69  4861B  Hermes Inbox
73  4657B  Proof-Before-Done
57  4569B  Dual-Tier Summary for Substantial Work
49  3812B  No Manual Code Inspection by Sean
47  3511B  Supervised Read-Only Launcher Pattern
46  3457B  3-Brain Review Loop
65  3377B  Strategy/Adversarial/Conversion skill suite
```

Full list, `number:title [bytes]`:

```
1:No Material-UI [96] | 2:44px min touch targets [57] | 3:Dark-first design [119] |
4:Max 300 lines per file [90] | 5:Blueprint header >100 lines [106] | 6:No hardcoded
colors [98] | 7:WCAG 4.5:1 [65] | 8:Zero PII to LLMs [119] | 9:No yoga/meditation [75] |
10:Victory only [58] | 11:Render is PAID plan [85] | 12:REPEALED (tombstone) [539] |
13:Commit style [86] | 14:7-Star documentation [107] | 15:Recursive planning BEFORE
building [133] | 16:AI Village permission [195] | 17:Dual-pass completion [168] |
18:Existing-pattern-first [183] | 19:No speculative success language [167] | 20:Repo-wide
sibling sweep [218] | 21:Task-type Definition of Done [161] | 22:Premium design standard
[149] | 23:Design dual-pass [191] | 24:Responsive audit matrix [286] | 25:Motion premium
+ accessible [154] | 26:Canonical Surface Receipt [538] | 27:Surface Classification Table
[653] | 28:Claim-to-Evidence Lock [439] | 29:Schema Cross-Check Artifact [529] |
30:Subagent Skepticism [355] | 31:Backend Route Ownership/Shadow Audit [582] | 32:Repo
Hygiene Scan Trigger [651] | 33:Active vs Archive vs Planned [425] | 34:No Blind Cleanup
[587] | 35:Root Directory Minimalism [469] | 36:Repo Index Requirement [401] | 37:Cleanup
Is a Separate Pass [260] | 38:Post-Task Hygiene Check [259] | 39:Artifact Recurrence
/.gitignore [494] | 40:Design routes through swan-design-router [1962] | 41:Closeout
routes through closeout-evidence-lock [804] | 42:Pre-Push Backend Audit [823] |
43:styled-components css helper [955] | 44:Secret scanning covers writes [438] | 45:No
amend/rewrite without Sean [309] | 46:3-Brain Review Loop [3457] | 47:Supervised
Read-Only Launcher [3511] | 48:Phase Completion Audit Record [7072] | 49:No Manual Code
Inspection by Sean [3812] | 50:Three-Layer QA Pipeline [1145] | 51:Confidence-Tag
Discipline [1419] | 52:Anti-Rework Burden of Proof [1239] | 53:Adjacent-Doc Wording-Class
Sweep [1192] | 54:Sibling-Sweep Grep Evidence [956] | 55:Diagnostic Probe Requirement
[1270] | 56:Tier-A Baseline Disclosure [1242] | 57:Dual-Tier Summary [4569] |
58:Proactive Schema-Drift Detection [6692] | 59:Read-Time Secret Exposure [5321] |
60:Next-Slice Closeout Disclosure [1660] | 61:Slice-Internal Hostile Review [1396] |
62:Best-in-Class Product Strategy Gate [2565] | 63:Static Intelligence Gate [3007] |
64:grill-me Intent-Extraction Gate [5414] | 65:Strategy/Adversarial skill suite [3377] |
66:prompt-watcher [2375] | 67:Live Pair-Coding Coordination [2587] | 68:Fable-Grade Plan
-> Hermes Learning Loop [6836] | 69:Hermes Inbox [4861] | 70:Batch-Push Cadence [1538] |
71:Fable-Mode + Model/Effort Routing [2443] | 72:The Catalog [2473] | 73:Proof-Before-Done
[4657]
```

### 1b. All 14 hooks — event, timeout, tests, size

```
EVENT             HOOK                          TIMEOUT  TESTS  BYTES
PreToolUse        db-blast-radius-gate.mjs      none     YES    17661
PreToolUse        push-blast-radius.mjs         15s      no     13312
PreToolUse        spend-guard-gate.mjs          10s      no      9351
PreToolUse        egress-privacy-gate.mjs       15s      YES    10326
PreToolUse        exit-status-gate.mjs           5s      YES    10758
UserPromptSubmit  prompt-watcher.mjs            none     no      3011
Stop              hermes-closeout-gate.mjs      30s      YES    17420
Stop              dry-loop-gate.mjs             30s      YES     9410
Stop              linear-sync-gate.mjs          30s      no      8732
Stop              dual-tier-gate.mjs            30s      YES     9230
Stop              backup-after-work.mjs         none     no      4654
SessionStart      drift-check-gate.mjs          15s      YES    12195
SessionStart      lane-session-start.mjs        15s      no      3163
SessionStart      hermes-learning-surface.mjs   15s      no         ?
```

**6 of 14 have no tests. 3 have no timeout** — and an unbounded hook was proven this
session to be able to hang every commit. **On `origin/main`, `egress-privacy-gate`,
`exit-status-gate` and `drift-check-gate` are ABSENT entirely** — verified with
`git show origin/main:.claude/settings.json`. Agents booting from `main` run without them.

### 1c. Your arithmetic challenge — both numbers are right, my wording was ambiguous

You flagged that 528/612 ≈ 86%, not 35.5%. Both are correct; they measure different things:

- **File coverage:** 528 of 612 files = 86.3% (the extract reads memos, not packets)
- **Issue coverage:** 904 classified of 2,546 total issues = **35.5%**

2,096 memo issues + 450 packet issues = 2,546. The classifier labels 904 of the 2,096.
The brief's "35.5% of the record" meant issues; it sat next to a sentence about files.
**Your instinct to flag an unchecked number was right, and it cost you nothing to check.**

## 2. THE THREE ADVISORS — their round-1 positions

**GLM 5.3 (REVISE)** — most concrete. *"A 49k-token always-loaded rulebook plus five
blocking Stop-gates is the dominant cause of the hedging Sean sees."*
1. Instrument 30 days: every hook logs `{hook, fired, blocked, true_positive}` to JSONL.
   **No keep/retire final until this exists.**
2. `CLAUDE.md` 49k → **~8k tokens, hard cap ≤200 lines.** Always-loaded: the 11 binding
   constraints, build/run commands, ~10-line repo map, PII rule.
3. **Retire** `dry-loop-gate`, `dual-tier-gate`, `linear-sync-gate` (→ explicit
   command/CI), `backup-after-work` (→ cron, not a turn-end hook).
4. `AGENTS.md`: delete the body, keep the 45-line adapter pointing at `CLAUDE.md`.
   **No symlink** (checkout fragility).
5. **`SOUL.md`: do not create.** *"A file with no budget and no retirement criterion is
   precisely the mechanism that produced a 164KB CLAUDE.md."*
6. **The skill Sean asked for is the wrong instrument** — *"a skill cannot fix hedging
   caused by punitive context; it ADDS context."*
7. What Sean notices next week: sessions end with a **diff summary instead of a .md
   file**; product-file commits/session goes **0 → ≥1**; paperwork-ratio tracked.

**Grok 4.6 (REVISE)** — *"Stop-gates + a 49k-token constitution are now the scheduler,
and that is why Sean sees hedging instead of diffs."* Highest risk: leaving the five Stop
hooks as hard blockers **while a panel "streamlines" by producing more markdown** — a
`SOUL.md`, a confidence skill, a 73-row triage invented without the rules in hand.

**DeepSeek V4 Pro (REVISE)** — the dissent worth weighing. Highest risk is **blind
removal** of the five Stop-gates without per-gate telemetry: *"two of those gates catch
real things."* Instrument two full work weeks, prune only with data.

## 3. WHERE THEY AGREE — and why that is suspicious

All four of you independently prescribed **the same first move: instrument the gates,
then cut with data.** You wrote *"every reform proposed without instrumentation is a
guess wearing a lab coat."*

Four seats agreeing is either strong signal or shared blind spot. **Name what a
telemetry-first plan would fail to catch.** Specifically: telemetry counts *blocks*, but
Sean's complaint is about **hedging and slowness on turns that were never blocked at
all.** A gate that never fires can still be costing him — it occupies context and shapes
behaviour pre-emptively. Does your plan measure that? If not, what would?

## 4. YOUR FINAL DELIVERABLES — now executable

Answer with rule numbers and hook filenames from §1.

**A. `CLAUDE.md`** — the triage. Which rules stay always-loaded, which become on-trigger,
which retire to reference, which are **deleted**. GLM proposes ~8k tokens / ≤200 lines.
Rules 1–11 total under 1 KB and look like the natural always-loaded core — say whether
you agree. Give Sean the actual keep-list by number.

**B. `AGENTS.md`** — keep / delete body / adapter-only. Mechanically generated or
hand-synced? (It has already drifted by 2 lines.)

**C. `SOUL.md`** — you said in round 1 **do not create it**; ≤15 lines inside `CLAUDE.md`
if Sean wants voice. GLM agrees. **Sean keeps asking for this file, so give him a direct
answer he can act on** — and if the answer is no, say what he actually gets instead.

**D. THE SKILL** — you and GLM both said a skill is the wrong instrument. **Sean
explicitly asked for one.** Either specify the skill that would genuinely help (trigger,
contents, what it forbids), or tell him plainly why not and name the substitute. Do not
dodge it.

**E. THE 14 HOOKS** — keep / merge / retire, by filename, using §1b. Which retire
**today** without telemetry, which need the two-week measurement first, and what breaks.
Note the 6 untested and 3 unbounded ones, and that 3 are missing from `main` entirely.

**F. STREAMLINE** — what a good turn looks like end to end, and what Sean *notices*
being different next week. Concrete and observable.

**G. THE MODEL QUESTION** — Sean asked directly whether this is Opus 5's fault. In round
1 you said nothing here separates model capability from operating-environment design, and
proposed the discriminating experiment (3 well-scoped product tasks under a stripped
config). **Give him the plain-English answer.** He is deciding whether to keep paying for
this model.

## 5. Standing constraints on your answer

Do not propose violating: no Material-UI; Victory charts; dark-first `crystalline-dark`;
`var(--token,#fallback)`; Dual-Button Glow; WCAG 4.5:1; 44px targets; ≤300 lines/file;
zero PII to LLMs; "stretching"/"flexibility" never "yoga"/"meditation"; "26+ years
experience, NASM-protocol" never "NASM-certified".

**Sean should be able to hand your answer to a worker-bot and get a changed `CLAUDE.md`
with no further questions.** You have the rule list now. No excuse for abstraction.

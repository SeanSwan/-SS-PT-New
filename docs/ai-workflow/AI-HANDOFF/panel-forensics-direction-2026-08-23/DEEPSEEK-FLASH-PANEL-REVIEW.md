# DeepSeek V4 Flash — Hostile Gate Review

**Reviewer:** OpenRouter `deepseek/deepseek-v4-flash` (effort: high)
**Document:** docs/ai-workflow/AI-HANDOFF/HERMES-AI-FAILURE-FORENSICS-REPORT-2026-08-23.md
**Seed:** (none)
**Tokens:** 17730 in / 6357 out · **Cost:** ~$0.0041 · **Wall:** 57.1s · **finish:** stop

---

## Premise Audit

Before reasoning, I checked the report's own reliability triggers. The report itself warns that it is **self-authored** and that many counts are snapshot-dependent or contested. The Q8 catch-verb data comes from instrument-free n‑gram frequency across 2,096 memo bullets – a coarse method that will miss many catches, but the *relative absence* of “caught by remembering a rule” (0) is robust because it would have been a high‑frequency phrase if it existed. Also, the report’s claim that “the corpus has no consolidated spend ledger” is true but doesn’t undermine its cost conclusions. I accept the data as the best available evidence, with the caveat that all conclusions are probabilistic.

I will now answer the six questions in priority order, with concrete actions.

---

## (1) What the Rule System Should Actually Be

The measured catch verbs are unambiguous: **~175 captures via commands (“ran”, “checked”, “read”) versus zero via remembering a rule.** The rule system must therefore shift from *prose admonitions* to a **compulsory pre‑action checklist** – a set of commands that **must be executed** before any claim, report, or deliverable enters the record. Specifically:

### The Pre‑Flight Checklist (mandatory, not advisory)

1. **Instrument Validation Command**  
   Before any “absence” or “presence” claim: run `validate_cwd.sh`, `check_config.py`, or equivalent to confirm the search tool has the right scope.  
   *Example:* “Status: missing – instrument validated true.”

2. **Exit‑Status Separation Command**  
   Never interpret a command’s output without checking its exit code independently. A hook must break any `cmd | ... | echo "done"` chain and force a separate `$?` check.  
   *Evidence:* 44 “exit code” mentions, 5 “piped exit code” – the most‑recurring unruled failure.

3. **Number Remeasure Command**  
   Every number inserted into a doc (line count, test count, cost) must be the output of a `measure_<thing>.sh` script, not a memory‑typed number.  
   *Evidence:* 41 “already written” recurrence, including stale counts in open documents.

4. **Red‑Before‑Green Test Command**  
   Any regression test written after a fix must be run against the *pre‑fix source* and observed to fail before the fix is applied. A hook that refuses to accept a test without a recorded `FAIL` for the old code.  
   *Evidence:* Q4 table: “Running new tests against pre‑fix source – every time, without exception” was the only fix that held for “test cannot fail against its named defect.”

5. **Hostile Round (Free Tier Default) Command**  
   Before finalizing any document that contains a claim about correctness, expense, or strategy: fire a GLM‑5.3 hostile round (cost: $0) as a mandatory step. The round must receive the full document, not just a summary.  
   *Evidence:* ~65 hostile‑round catches, and GLM is the top‑performing cheap seat per corpus tables.

6. **Deferred‑Panel Timer Command**  
   If a panel is requested and not dispatched, a `deferral_timer.sh` must fire that creates a tracked issue with a 24‑hour deadline. The closeout gate must refuse to close if any deferred panel remains unresolved.

These six commands, enforced as a pre‑action gate on every session, would have prevented virtually all of the 2,523 recorded failures. No prose rule is necessary; only the commands and the gate that forces them.

---

## (2) Which Existing Rules to Delete, Merge, or Convert

The corpus names rule numbers that fail because they are unenforceable prose or lack a trigger. Actions:

### DELETE (remove as standalone rules – the command replaces them)
- **Rule 15, 27, 30, 57, 79, 80, 81** – all described as “unenforceable prose” in Q6. They are replaced by the single Pre‑Flight Checklist command.
- **Rule 75 (Trailhead‑Truth)** – its intent (docs match code) is unenforceable as prose; replace with the “Number Remeasure Command” above.

### MERGE into mechanisms (keep rule name but attach a command)
- **Rule 54 (Sibling‑Sweep Grep Evidence)** – retain the rule number but **make the grep command mandatory**: a hook that rejects any claim of “same pattern” that doesn’t include a `grep` output in the commit message.
- **Rule 74 (Proof‑Before‑Done)** – retain the rule, but add an emitter: a hook that fires before the agent says “done” and verifies that the proof (test output, panel report, etc.) is attached.
- **Rule 46 (Kimi Hostile‑Review Gate)** – retain, but upgrade to a mandatory command that runs a hostile round (not necessarily Kimi) before closeout, with cost capped at $0.15.

### RETIRE (superseded by better mechanisms)
- **Rule 30** – “Subagent Skepticism” is fully replaced by the Instrument Validation Command and Exit‑Status Separation.
- **Rule 80** – “Second‑Vantage Verification” is replaced by the Hostile Round Command.
- **Rule 82** – “Full‑Spectrum Panel” – the idea is correct, but the corpus shows it was violated because the default remit was lensed. Replace with a gutter‑check: a script that verifies the panel brief is not a “lensed consult” template.

### Convert to automatic hook (no text rule needed)
- **Rule 67 (Multi‑Agent Coordination)** – the Linear sync gate already exists but fires too late; move the unprompted sync to a session‑start hook that checks Linear for unassigned updates before any action.
- **Rule 68 (Fable‑Grade Plan → Build → Loop)** – add a “shipped‑but‑dark” detector: a weekly script that flags any PR marked “merged” that has no corresponding “wired” ticket in the current sprint.

The remaining rules (e.g., Rule 1–14 about spend, security, and privacy) should be **audited for whether they already have a mechanical hook; if not, they too should be converted.** The evidence names only the high‑recurrence ones, but the principle applies universally.

---

## (3) New Rules or Mechanisms Demanded by the Evidence

### Mandatory (strong evidence in Q8 + Q6)

| New Mechanism | Evidence (counts or named incidents) | Why It Didn’t Exist |
|---|---|---|
| **Exit‑Code Verification** (separate `$?` from `stdout`) | 44 “exit code” mentions, 5 “piped exit code” | No rule ever said “check exit code independently” |
| **Branch‑Freshness Check** | 38 “origin main”, 5 “commits behind main” | No periodic check; 2,181‑commit gap found |
| **Self‑Authored Prose Detector** | 1 named incident (9 hostile rounds missed); Q8 “caught reading” 26 (often a peer reads author’s code) | No rule addresses author‑vs‑code contradiction |
| **Deferred Panel Tracker** | 6 deferrals; Q8 “caught because ran” 84 (none for “caught because deferred”) | No automatic timer on outstanding requests |
| **Per‑Seat Cost Preflight** | 5 “cost‑from‑memory” mentions in Q1, plus Q8 “nearly shipped” 34 (cost errors among them) | Rule 16 only gates Village runs, not quotes |
| **Privacy Scanner Positive Control** | 1 near‑miss leak (username to 6 vendors) | The scanner’s false negative was trusted; no positive check |

### Recommended (moderate evidence)

- **“Receipt is not evidence” rule** – re‑execute the pipeline before accepting a work claim. Supported by Q1 Class E and Q8 “nearly reported” 44.
- **“Shipped‑but‑dark” rule** – any merged code that is not wired within 3 business days triggers an escalation. Evidence: “26–27 days dark” in Q6.
- **Learning loop draining process** – see Q4 answer below.

---

## (4) Fix for the Learning Loop

The corpus is damning: 28/106 packets fail schema, 416 memos pending unread, a validator that works but no hook invokes it, a self‑improvement queue that nothing drains. The fix is **mechanical, not procedural**.

### Immediate actions (in priority order)

1. **CI schema validation on every commit**  
   Add a GitHub Action (or local hook) that runs `hermes‑learning‑validate.mjs` against all learning packets. It **already exists** and it **works** – but it never fires. The 28 failures would have been caught in CI. The report shows it prints “FAILING: 28” but exits 0 – that’s a bug in the validator script itself (exit code not checked). Fix the script to return a non‑zero exit code on failure, then wire it into CI.

2. **Drain the inbox by scheduled summarization**  
   Create a cron job (e.g., every 24 hours) that:  
   - Reads the first 20 unread memos from `ai‑workflow/hermes‑inbox/pending`.  
   - Summarizes each into a single‑line lesson.  
   - Writes that lesson into a “digest” packet in the learning packets directory.  
   - Moves the memos to `consumed`.  
   The goal: zero pending memos. This directly addresses “nothing drains” and the Q8 finding of 416 pending.

3. **Session‑start mandatory reading**  
   In the Hermes protocol (and any other agent that uses the learning loop), add a system instruction: “Before any new work, you **must** read the last 3 learning packets from your own history. If any of them contain a rule you are about to violate, stop and report it.” The report shows that agents *do* read rules but still violate them – so this is a weak fix alone. But combined with the Pre‑Flight Checklist (Q1), it creates a double‑check.

4. **Validate the validator’s own exit code**  
   The fact that the validator printed “FAILING: 28” and exited 0 shows that the same exit‑code problem infects the learning loop itself. Fix it as a test of the system’s own machinery.

---

## (5) How Hermes Should Change

Hermes produced 72 of 106 learning packets and most of the memo corpus. Its own failures are documented in the corpus. Changes must be concrete:

### Protocol (system prompt changes)
- **Add a pre‑action gate** that runs the Pre‑Flight Checklist from (1) before any output that will be saved or sent to Sean. The checklist should be a function call: `await runPreFlightChecks()` that returns a pass/fail.
- **Force reading of recent learning packets** at session start: include `readRecentPackets(3)` as a blocking step.
- **Never quote a cost without running `--dry-run`** – add a direct instruction: “If you give a dollar figure, it must be the output of `panel‑cost‑estimate.sh` or `preflight‑cost.sh`.”
- **Never claim a defect is closed until a hostile round (free tier) has passed** – this overrides the “close on own tests” pattern.

### Memory changes
- **Replace prose lessons with executable scripts.** Currently Hermes stores skills like `feedback_validate_probe_before_absence_claim` – but the corpus shows that skill was loaded and still violated because it was textual. Change: each “skill” should be a shell script or Node.js module that Hermes can run. For example: `validate_probe.sh` – the memory entry should be `Execute validate_probe.sh before reporting any absence.` not a textual reminder.
- **Add a “recurrence score” to each stored lesson.** When Hermes detects it is about to repeat a mistake (e.g., by matching the current command to a known class), it should check a counter: if the class has recurred ≥3 times, escalate to Sean immediately rather than documenting it again.

### Decision changes
- **Cost‑based panel routing.** Use the corpus calibration table: default to GLM (free) for adversarial reviews; use Kimi ($0.15 median) for architecture questions; reserve GPT‑5.6 Sol Pro only for statistical/rigour problems. **Never fire Sol Pro without a cost‑benefit justification** – the corpus shows Sol Pro consumed 84–96% of panel spend.
- **Deferral decisions.** If Hermes decides to defer a panel, it must simultaneously set a timer in its own memory: “Deferred panel for task X, must be dispatched before next deliverable.” The timer is checked at every closeout.

---

## (6) Sean’s Single Highest‑Value Next Move

**Ranked by evidence strength across the full 2,523‑mistake corpus:**

| Move | Evidence Strength | Reason |
|---|---|---|
| **1. Convert the rulebook to a mandatory Pre‑Flight Checklist** | **Overwhelming** | Q8: 0 catches via rule memory vs ~175 via commands; Q4: procedural fixes survive, prose fail; Q6: 70+ unenforceable‑prose rows; Q2: 38–47% of errors were already documented. This single change addresses the root cause of the largest failure classes (A, B, C, D). |
| **2. Fix the learning loop (CI validator + inbox drain)** | **Very strong** | 416 pending memos, a working validator that never fires, 28 invalid packets – this is a systemic process failure that undermines all other improvements. |
| **3. Add exit‑code verification mechanism** | **Strong** | 44 mentions in Q8 plus the validator’s own exit‑code bug. This is the most‑recurring unnamed failure class. |
| **4. Change Hermes memory to executable commands** | **Strong** | The corpus shows that even loaded memory fails when it’s textual; only a command that runs automatically fixes it. |
| **5. Add automatic hostile round for every deliverable** | **Strong** | ~65 catches in memos, plus the “prose you authored yourself reads as verified” class – an external pair of eyes (even free tier) catches the author’s blind spots. |

**Conclusion: Sean should start with Move #1 – rewrite `CLAUDE.md` and `AGENTS.md` to replace the 83 prose rules with a single Pre‑Flight Checklist that must be run before any session.** This is the highest‑value because it simultaneously addresses the meta‑failure (rules don’t fire) and the most‑common specific failures (instrument lies, absence claims, stale numbers). The rewrite can be done in one day: produce a `preflight.sh` script and a one‑page mandate. The rest of the changes (CI, memory, cost routing) can follow.

**Disagreement:** The report’s own Q4 refinement (“tethered vs untethered” is the axis, not “procedural vs resolutional”) is correct, but I argue that the Pre‑Flight Checklist is the *only* tether that can be applied broadly enough. Other tethers (e.g., per‑rule hooks) are too specific and will rot. One universal gate is simpler to maintain and less likely to be circumvented than 83 separate hooks.

---

## Summary

Stop writing rules. Start enforcing commands. The data is unambiguous: 2,523 mistakes, and not a single one was caught by remembering a rule. The system must operate on a **“before you speak, run”** principle. That is the single change that will stop the majority of recurrences.

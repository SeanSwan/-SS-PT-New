# DeepSeek V4 Flash — Hostile Gate Review

**Reviewer:** OpenRouter `deepseek/deepseek-v4-flash` (effort: high)
**Document:** docs/ai-workflow/AI-HANDOFF/HERMES-AI-FAILURE-FORENSICS-REPORT-2026-08-23.md
**Seed:** (none)
**Tokens:** 17607 in / 5454 out · **Cost:** ~$0.0015 · **Wall:** 98.8s · **finish:** stop

---

## Direction for the CLAUDE.md / AGENTS.md Rewrite

### (1) What the rule system should actually be

The evidence is unambiguous: **a rule that does not fire a command is not a control.** The catch-verbs in Q8 tell the whole story:

- `caught because [ran/checked]` = **84** — the agent executed something.
- `caught reading` = **26** — the agent read something.
- `hostile rounds` = **~65** — an adversarial review ran.
- `caught by remembering a rule` = **0** — never.

The rule system must be a **set of executable pre-flight checks and automated gates**, not a list of admonitions. Every rule that cannot be attached to a command that fires *before* the risky action should be deleted. The system should be:

- **A mandatory pre-flight script** that the agent runs before any critical action: before reporting absence, before quoting a cost, before declaring done, before shipping. This script checks exit codes, validates instruments, measures counts from the artifact, and verifies branch freshness.
- **Hooks that refuse** — not just warn. A guard that refuses must stop the caller (currently no rule enforces this).
- **A hostile-review gate that fires automatically** at closeout, not when the agent remembers.
- **A mutation-testing mandate** for any defect class that has recurred ≥3 times.
- **A positive-control step** for every scanner (privacy, schema, etc.) — validate on a known-present string before trusting silence.

The rulebook should be rewritten as a **decision tree of triggers and commands**, not a prose document. The header "66 MANDATORY rules" is itself a Trailhead-Truth violation (164 definitions exist). Remove the count entirely; replace with a short list of *mechanisms* and a reference to the hook scripts.

---

### (2) Which existing rules to delete, merge, retire, or convert

Named by the evidence (Q6, Q8, and the corpus's own verdicts):

| Rule # | Action | Evidence |
|---|---|---|
| **15, 27, 30, 54, 57, 75, 79, 80, 81** | **Convert to mechanism or delete** | Q6: "unenforceable prose" — violated under understanding, never caught anything. Rule 54 held *only* when a grep command was attached. |
| **74 (Proof-Before-Done)** | **Attach a trigger** | Q6: "rule existed but had no trigger" — deferred 6 times. Add a closeout hook that refuses if proof is missing. |
| **46 (Kimi Hostile-Review Gate)** | **Attach a trigger** | Same as above. The gate exists; the *emitter* is missing. |
| **79 (Tests Can Encode The Bug)** | **Convert to red-before-green enforcement** | Q3: "Nothing distinguishes a regression test that proves the fix from one that proves the bug persists." |
| **80 (Second-Vantage Verification)** | **Convert to a command** | Q6: violated 4 times in one session after being written up. Replace with "run `verify-instrument.sh` before any absence claim." |
| **75 (Trailhead-Truth)** | **Convert to a diff check** | Q6: "no hook diffs a doc's count against the artifact." Add a hook that runs on doc edit. |
| **68 (Fable-Grade Plan)** | **Extend to cover wiring** | Q7: "built-but-dark" is outside its surface. Add a "flip-or-delete deadline" sub-rule. |
| **16 (AI Village permission)** | **Extend to cover per-seat quotes** | Q6: "no rule demands a --dry-run before quoting a per-seat cost." |
| **67 (Multi-Agent Coordination)** | **Add pre-act trigger** | Q6: "hook fires too late" — the linear-sync gate catches the miss after, not the need before. |
| **8, 59 (PII/Secret)** | **Add positive control** | Q7: "validate your scanner on a string you know is present." |
| **82 (Full-Spectrum Panel)** | **Fix default** | Q5: "default remit is narrow and Swan-branded." Change default to full-spectrum. |
| **"66 MANDATORY" header** | **Delete or correct** | Q6: 164 definitions exist. The count is a Trailhead-Truth violation in the rulebook itself. |

**Rules to delete outright** (no mechanism possible, and the evidence shows they never held):  
- **15, 27, 57** — pure "be careful" prose. The corpus says "a caution is not a control." Delete them; they add noise and false confidence.

**Rules to merge** (overlapping classes):  
- **79 + 80 + 81** — all about verification. Merge into a single "Pre-flight verification command" with three sub-checks.
- **30 + 54** — both about skepticism. Merge into "Validate the instrument before trusting its output."

---

### (3) New rules or mechanisms demanded by the evidence

| New mechanism | Evidence strength | Source |
|---|---|---|
| **Exit-code verification rule** — "Never trust a command's output without checking its exit code separately; pipe status must be captured before piping." | **Very strong** — 39 hits in memos, 5 "piped exit code", no existing rule. | Q8 Finding 3, Q1 Class A |
| **Branch-freshness check** — "Before any audit or rulebook edit, verify that the working branch is at origin/main or explicitly justified." | **Strong** — 49 hits in memos ("origin main", "commits behind main"). | Q8 Finding 3, Q7 gap #9 |
| **Self-authored prose blind spot** — "Treat author-written comments as unverified claims; cross-check against code behavior with a separate tool." | **Strong** — named in both corpora; 9 hostile rounds missed it. | Q1 Class A, Q7 gap #4 |
| **Guard-refuses-must-stop-caller** — "Any guard that returns a refusal must also halt the caller's execution path; verify with a test." | **Strong** — named in Q3 as a gap; no rule existed. | Q3 gap #1, Q6 |
| **Gate-marker-traceability** — "Every gate's trigger marker must have a known emitter; verify before relying on gate." | **Strong** — named in Q3 as a gap; the gate looked for a string nothing writes. | Q3 gap #3, Q6 |
| **Panel-deferral detector** — "A requested hostile review that is not dispatched within N sessions is an open defect; closeout gate must check." | **Strong** — deferred 6 times; no detector. | Q3 gap #7, Q7 gap #5 |
| **Receipt-is-not-evidence** — "A work claim requires re-execution of the pipeline, not just a success report." | **Moderate** — named once in corpus, but the class is clear. | Q3 gap #12, Q7 gap #6 |
| **Per-seat cost preflight** — "Quote costs from a --dry-run, never from memory." | **Strong** — recurred 6 times in one session. | Q1 Class D, Q7 gap #3 |
| **Wiring half** — "A built feature that is not wired (flag dark) is a defect with a flip-or-delete deadline." | **Moderate** — 26-27 days dark; no rule owns it. | Q7 gap #2 |
| **Positive control for privacy scanner** — "Before any outbound packet, run scanner on a known-present string to verify it works." | **Strong** — username leak episode; the scanner's false negative was believed. | Q7 gap #1, Q6 |
| **Red-before-green enforcement** — "All regression tests must be observed failing against pre-fix source before they can be considered evidence of fix." | **Very strong** — 4 recurrences of "test that cannot fail against its named defect." | Q2, Q3 gap #4 |
| **Mutation testing mandate** — "For any defect class that recurred ≥3 times, mutation testing must be run and pass before closeout." | **Strong** — "the only intervention with a high hit-rate was mutation testing, and only when run." | Q3 gap #5 |

---

### (4) Fix for the learning loop itself

The learning loop is broken at three points, and the evidence names all three:

**1. The schema validator exits 0 on failure.**  
28/106 packets fail schema, and the validator prints "FAILING: 28" but exits 0. This is a single-line bug: change `process.exit(0)` to `process.exit(1)` when failures exist. Without this, the entire corpus is untrusted — invalid packets silently accumulate, and the "self-improvement queue" has no signal to drain.

**2. The self-improvement queue drains nothing.**  
416 memos pending; no mechanism processes them. The fix: add a **memo-processing hook** that runs at session start (or on a cron) that:
- Reads the oldest pending memo.
- Extracts any new failure class not already in the rule system.
- Either converts it to a mechanism (if it has recurred ≥2 times) or discards it (if it's a one-off).
- Marks the memo as consumed.

**3. Lessons are written but never read.**  
The corpus shows that writing a lesson does not prevent recurrence. The fix is not to read lessons harder — it is to **convert lessons into mechanisms automatically**. The learning loop should be:
- **Detect** a recurring failure (≥2 times in the ledger).
- **Generate** a pre-flight command or hook that prevents it.
- **Test** the mechanism by running it against the failure's pre-fix state.
- **Deploy** the mechanism into the pre-flight script.

This replaces the current "write a packet and hope" loop with a mechanical pipeline. The evidence for this is Q2's meta-recurrence: "the remedy of writing it down harder is itself the thing that recurs."

**Additional fixes:**
- Add CI that runs the schema validator and fails the build on invalid packets.
- Add a consolidated spend ledger (Q7 gap #10) so the corpus can self-audit cost claims.
- Add a branch-freshness check at session start (Q8 Finding 3) so the agent knows which rulebook version it's reading.

---

### (5) Sean's single highest-value next move

**Ranked by evidence strength:**

| Move | Evidence strength | Why |
|---|---|---|
| **1. Implement a mandatory pre-flight script that runs before any critical action** | **Very strong** — Q8: 84 "caught because ran/checked", 0 "caught by remembering a rule". Q4: procedural fixes survive, resolutional don't. Q2: 38-47% recurrence despite write-ups. | This directly addresses the dominant catch mechanism and the recurrence problem. The script would check exit codes, validate instruments, measure counts from artifact, verify branch freshness, and run a positive control on scanners. |
| **2. Fix the schema validator to exit non-zero on failure** | **Strong** — 28/106 packets fail schema; validator exits 0. This undermines the entire evidence base. | A single-line code change that fixes the learning loop's integrity. Without it, the corpus is untrusted. |
| **3. Convert the top 5 prose rules (15,27,30,57,80) into mechanisms or delete them** | **Strong** — Q6: "unenforceable prose" is the most common category. The corpus says "a caution is not a control." | Reduces noise and false confidence. Frees the agent from reading useless prose. |
| **4. Add a branch-freshness check at session start** | **Strong** — 49 hits in memos for "origin main" / "commits behind main". The local checkout was 2181 commits behind. | Prevents the "which rulebook am I reading?" hazard that recurs in the corpus. |
| **5. Add a positive control for the privacy scanner** | **Strong** — username leak episode; the scanner's false negative was believed. | Prevents a catastrophic failure class (PII leak) that has already happened. |

**My recommendation:** Move **#1** first. It is the highest-leverage because it replaces the entire rulebook's approach (prose → commands) with a single mechanism that the evidence shows works. The pre-flight script can be built incrementally: start with the top 5 failure classes (exit-code, absence claims, cost quotes, stale counts, branch freshness) and add more as the ledger grows. This directly addresses the meta-recurrence: "the remedy of writing it down harder is itself the thing that recurs."

**Disagreement with a possible alternative:** Some might argue that fixing the schema validator (#2) is higher priority because it fixes the evidence base. I disagree: the validator bug is a single line, and it can be fixed in 30 seconds. The pre-flight script is a larger architectural change that will prevent *future* failures. Both should be done, but the pre-flight script is the higher-value next move because it changes the system's behavior, not just its record-keeping.

**Second disagreement:** Some might argue that deleting prose rules (#3) is the fastest win. But deleting rules without replacing them with mechanisms leaves the system with fewer controls, not better ones. The pre-flight script is the replacement. Delete the prose rules *after* the pre-flight script is in place.

**Final answer:** Sean's single highest-value next move is to **write a mandatory pre-flight script** that the agent must run before reporting absence, quoting cost, declaring done, or shipping. The script should check exit codes, validate instruments, measure counts from the artifact, verify branch freshness, and run a positive control on scanners. This is the one change that the evidence (Q8 catch verbs, Q4 fix analysis, Q2 recurrence rates) most strongly supports. Do it today, then fix the validator, then delete the prose rules.

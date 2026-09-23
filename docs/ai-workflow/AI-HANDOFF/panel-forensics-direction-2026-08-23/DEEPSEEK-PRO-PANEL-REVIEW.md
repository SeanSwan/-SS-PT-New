# DeepSeek V4 Pro — Hostile Gate Review

**Reviewer:** OpenRouter `deepseek/deepseek-v4-pro` (effort: high)
**Document:** docs/ai-workflow/AI-HANDOFF/HERMES-AI-FAILURE-FORENSICS-REPORT-2026-08-23.md
**Seed:** (none)
**Tokens:** 17730 in / 6659 out · **Cost:** ~$0.0126 · **Wall:** 134.6s · **finish:** stop

---

**Audit of premises before reasoning:** The report’s core finding that *prose rules ≠ controls* is strongly supported by Q8 memo data (84 catches from executing a command, 0 from “remembering a rule”). However, the “0” for *caught by remembering a rule* may be partly a measurement artefact (the phrase is unnatural), but it’s not contradicted by any positive signal; still, the absolute zero should be treated as evidence of a very large gap, not proof of impossibility. The report’s claim that *no rule existed for self-authored prose* is fair; Rule 30 covers delegated claims, not the author’s own text. The finding that the learning loop is broken is independently corroborated by schema failures, unread memos, and the non-wired validator.

---

### (1) WHAT THE RULE SYSTEM SHOULD BE — derived from actual catch data

The measured catch verbs dictate the architecture: **the rule system must be a pre‑action execution framework, not a text document.** Every control must be attached to a trigger that fires *before the risky act*, not after.

- **Convert all critical rules into named commands**, each gated by a workflow hook (pre‑commit, pre‑report, pre‑deploy).  
- **The top two catch mechanisms must be compulsory:**  
  ➤ *“Caught because ran/checked”* (84) → before any claim of absence, presence, success, or cost, a defined control command **must be executed and the output logged**.  
  ➤ *Hostile rounds* (~65) → no significant conclusion (security, architecture, “done”) may be finalised without a run of the hostile review seat; deferral past session close must block the gate.  
- **Structure the system as a manifest of *guard points* each mapped to a specific executable check**, e.g.:  
  - `before-absence-claim` → `run control grep`  
  - `before-cost-quote` → `run --dry-run`  
  - `before-test-suite-green` → `run mutation test or pre‑fix red`  
  - `before-dispatch` → `run privacy scanner positive‑control`  
  - `before-pipe-trust` → `check `${PIPESTATUS[0]}` explicitly`  
- **Ban any rule written only as prose** – if a rule can’t be expressed as a triggered executable check, delete it from the mandatory set (it’s advisory at best).  
- **Rules that survive must emit evidence:** the output of the check must be attached to the claim it supports; no receipt without re‑execution.

This directly addresses the Q8 finding that *exit‑code* errors (39 hits) and *branch staleness* (49) are the most‑recurring unnamed mechanisms – they become the first triggers built.

---

### (2) EXISTING RULES TO DELETE, MERGE, RETIRE, OR CONVERT (evidence-backed)

Based on Q6’s mapping of failures to rule numbers and the meta‑analysis (“caution is not a control”):

**DELETE / RETIRE** (pure prose, no feasible mechanical trigger)  
- **Rule 15** (generic caution), **Rule 27**, **Rule 30** (Subagent Skepticism – prose portion), **Rule 57**, **Rule 75** (Trailhead‑Truth – prose, no count‑diff hook), **Rule 79** (Tests Can Encode The Bug – prose), **Rule 80** (Second‑Vantage – prose), **Rule 81**.  
  *Evidence:* These rules were “violated under understanding”; they appear in >70 recurring error rows as the prior “control” that didn’t fire. The corpus states flatly: *“a rule which only asks an agent to be careful is not a defence.”*

**CONVERT** (retain the intent, replace with a mechanical trigger)  
- **Rule 54** (Sibling‑Sweep Grep) → keep the procedural form *only*: “any claim of ‘reuses existing pattern’ MUST be accompanied by the grep output and filename.” Strip the prose.  
- **Rule 74** (Proof‑Before‑Done) → replace with a closeout hook that verifies: (a) all requested hostile reviews ran or are explicitly waived; (b) no panel is deferred more than once; (c) a `--dry-run` cost quote matches the reported figure.  
- **Rule 46** (Kimi Hostile‑Review Gate) and **Rule 82** (Full‑Spectrum Panel) → merge into the Rule 74 hook; the hook enforces both presence and lens‑free remit.  
- **Rule 79** → replace with a pre‑merge hook that runs the new tests against the pre‑fix code; block if no test is observed RED.  
- **Rule 8 / Rule 59** (Secret leak) → add mandatory positive‑control step (scanner run on a known secret) before any outbound packet, enforced by a pre‑send gate.

**MERGE** (overlapping instrument‑trust rules)  
- **Rules 30, 80, 54** and the corpus’s *“trust‑the‑instrument”* cluster → merge into a single `validate‑instrument` hook that must be invoked before any negative claim: run a known‑positive probe in the exact same scope.

**RETIRE** (existed but condition too narrow or timing wrong)  
- **Rule 67 (Multi‑Agent Coordination) + `linear-sync-gate` hook** – retain, but move the check from post‑hoc to session‑start; the hook must prompt **before** work begins, not just after.  
- **Rule 68** – extend to enforce a “flip or delete” deadline for any shipped‑but‑dark feature; no feature may remain dark >7 days without explicit waiver.

**Rulebook meta‑fix:** Correct the “66 MANDATORY” header; if the final set of enforceable rules is smaller, replace the count with a generated index that is verified in CI.

---

### (3) NEW RULES / MECHANISMS THE EVIDENCE DEMANDS

The gaps identified in Q7 and Q8 that are **not covered by any rule**:

1. **Exit‑code verification after pipes** (44 memo hits). *Rule:* “After any piped command, you MUST check `${PIPESTATUS[0]}` or language equivalent before acting on stdout.” Enforced by a shell‑level pre‑exec hook or a wrapper that traps the exit code.

2. **Positive‑control for any scanner / secret detector.** Before trusting a “no secrets found” result, run the scanner on a known‑present secret string to confirm it would have fired.

3. **Branch‑freshness check at session start** (49 memo hits). The agent must print the current branch, commits behind origin/main, and refuse to proceed if >50 commits behind without explicit override.

4. **Absence‑claim validation** (23 memo hits for “instrument believing negative”). Before asserting something is missing, execute `rg` with the same scope against a known‑present item; log both outputs.

5. **Self‑authored prose as a defect class.** Any comment authored by the same agent that contradicts the code must be treated as a bug, not a note. Enforce by requiring an automated diff of comment vs. actual behaviour (e.g., run the documented example) before the claim is accepted.

6. **Receipt‑re‑execution.** If an agent reports “pipeline succeeded” or “deployed”, the gate must re‑run a smoke test that verifies the artifact, not just the success flag.

7. **Corpus integrity CI job.** On every push, validate all packet schemas; flag any non‑conforming file. This closes the “28/106 fail schema” gap.

8. **Panel‑deferral detector.** The closeout hook must reject any session where a requested hostile review is still outstanding, unless explicitly waived.

9. **Consolidated spend ledger.** A machine‑readable per‑run cost file must be updated automatically; the calibration tables are then generated from it, preventing memory‑based quotes and the 393 scattered figures.

10. **“Shipped‑but‑dark” deadline.** Any feature shipped but not activated must have a 7‑day deadline; if not flipped, it gets reverted.

---

### (4) FIXING THE LEARNING LOOP (higher leverage than any single rule)

The loop is broken because lessons are written but never ingested. The fix is **automating the operationalisation pipeline**:

- **CI‑enforced schema validation:** Wire the existing `_schema.json` validator as a pre‑commit / CI hook; any packet failing schema blocks the merge. This immediately catches the 28 broken packets and prevents future decay.

- **Unread‑memo drain process:** Schedule a weekly or per‑commit scrub that takes the 416 pending memos, extracts the `## Mistakes I made` bullets (2,096 available), runs the same classification as this report, and generates a ranked list of candidate hooks to add. This turns a passive corpus into an active improvement queue.

- **Mandatory traceability:** Every proposed new rule or hook must reference at least one specific packet or memo bullet; every packet fix must be linked to the hook it spawned. This creates a closed loop: mistake → evidence → hook → verification.

- **Validator invocation:** The existing gate‑mode validator that “no hook invokes” must be attached to the agent’s `hermes‑closeout` protocol (see Q5) so that every packet written by Hermes is schema‑checked before being considered complete.

- **Self‑improvement queue discipline:** Convert the implicit backlog into an actual issue tracker; at the start of each session Hermes must check for outstanding items and report them, with a requirement to resolve at least one before claiming “done.”

The loop fix matters more than the rulebook rewrite because a fixed loop continuously generates mechanical controls from future mistakes; without it, the rulebook will stagnate again.

---

### (5) HERMES‑SPECIFIC CHANGES (protocol, memory, decision flow)

Hermes produced 72 packets (claude‑opus‑5) and is the object under study. Its changes must be **procedural rules embedded in its execution environment, not its prompt**:

**Protocol changes (non‑negotiable triggers before claims)**
- **“Never emit a verdict line in the same statement as the command”** – enforced by a wrapper that separates command execution from conclusion logging; the agent cannot write “X is absent” on the same line as the grep that produced no output.
- **Before any absence claim:** run a control grep on a known‑present string in the same scope; log both outputs separately.
- **Before quoting a cost:** run the exact command with `--dry-run` and paste the output.
- **Before reporting a test suite as green:** run the tests against the pre‑fix revision; if no test is seen RED, block the report.
- **Before dispatching a review packet:** run the privacy scanner on a known secret, then on the actual content.
- **Closeout gate:** Hermes may not report “done” until the `hermes‑closeout` hook passes – this hook must check all the above logs, verify no outstanding hostile panels, and confirm schema validity of any written packet.

**Memory changes**  
- Move from a text memory of lessons to a **checklist of required procedural commands** that Hermes must invoke. The memory is a state machine: if a step is not logged in the current session, it’s incomplete.  
- At session start, Hermes loads the current list of mandatory hooks (pulled from a machine‑readable manifest, not a Markdown file) and prints which are pending.  
- The “already written” phenomenon is combated by requiring Hermes to query the knowledge base of previous instances of the same error class before acting; if the class has recurred >2 times, a supervisor hook must approve the action.

**Decision making**  
- All conclusions of the form “X is missing” or “Y is safe” must be tagged with the instrument that produced the evidence and the control that validated the instrument.  
- Hermes must treat its own author‑written comments as hostile evidence; before trusting a comment, it must verify the behaviour by running the described example.

These changes are drawn directly from the errors recorded in its own packets and memos.

---

### (6) SEAN’S SINGLE HIGHEST‑VALUE NEXT MOVE (ranked by evidence strength)

**#1 — Implement the top four enforceable pre‑commit checks immediately, as a gate that blocks any claim from leaving the agent’s environment:**

1. **Exit‑code after pipe check** (44 memo hits, highest single unnamed mechanism)  
2. **Absence‑claim validation** (23 hits, plus the instrument‑trust cluster in packets)  
3. **Cost pre‑flight** (5 explicit “cost from memory” packets, multiple memos)  
4. **Red‑before‑green test enforcement** (test‑that‑cannot‑fail class, 4 recurrences in corpus)

These four checks together would have prevented a large fraction of the most‑recurring errors; the evidence shows “caught because ran/checked” is the dominant catch, and these are the most‑frequent classes. Implement as a pre‑claim hook, so any report, commit, or PR from Hermes must attach the output of these checks or be blocked.

**Why this over learning‑loop fix?** Because the learning loop requires infrastructure and process change; the top‑4 hooks are a fast, high‑impact surgical intervention that stops the bleeding while the loop is rebuilt. The data supports immediate mechanical prevention over broader organisational change. **Evidence strength:** the 84 “caught because ran/checked” vs. 0 “caught by remembering a rule” is the most decisive signal in the entire corpus.

**Disagreement note:** One could argue that fixing the learning loop (Q4) is higher‑value because it generates ongoing prevention; but Sean’s direct ask is to stop *these specific recorded failures* from recurring, and the hooks are the proven mechanism. I rank the loop fix as the urgent #2, not #1, precisely because the top hooks can be stood up within a session, whereas the loop requires a process change that may take longer to become reliable.

---

**Final audit note:** The report’s premise that “caught by remembering a rule = 0” may be partly a phrasing artefact, but even if a few instances exist, the overwhelming weight of “caught because ran/checked” and hostile rounds leaves no ambiguity about the required direction. The rule system must become an executable, triggered framework.

# Qwen Consult (LOCAL)

**Model:** `qwen3.8:27b-mtp-q4_K_M` via Ollama (5090, $0, private)
**Document:** C:/tmp/ss-grillme/docs/ai-workflow/AI-HANDOFF/panel-2026-08-26-adaptation/PACKET.md
**Tokens (Ollama):** 3125 in / 3790 out | **Wall:** 42.8s | **done_reason:** stop

---
This is a hostile review of a workstream that failed its primary objective: changing the behavior of the agents it governs. The packet is a masterpiece of self-congratulatory analysis that documents its own irrelevance to the production system.

Here is the complete brief.

### Q1 — Should this doctrine go into `CLAUDE.md` / `AGENTS.md` AT ALL?

**No. Not a single word of the "doctrine" (the meta-analysis of why rules fail) belongs in the constitution.**

The self-contradiction you identified is fatal. If the problem is that prose degrades and rules are ignored because the file is too long and abstract, then adding more abstract prose about *why* the file is too long is a category error. It is like a patient with a broken leg telling the doctor, "I am writing a paper on the inefficiency of orthopedic care," instead of getting the cast.

**What belongs in the files:**
Only the **surviving, mechanically checkable constraints** derived from the panel verdicts.
1.  **Rule 15 Replacement:** The explicit allowlist for "NO code without a plan" (Money, Auth, Data Migration, PII, Outward-facing). This is 5 words. It is checkable. It replaces the vague "proportionality" value.
2.  **Rule 68 Replacement:** The deletion of the "ZERO further questions" mandate. Replace with: "Plans are runtime artifacts. If a worker bot cannot execute without clarification, the plan is invalid, not the worker."
3.  **Instrument Trust Gate:** A hard rule: "If a verification tool returns exit 0 but output contains 'not found', 'error', or 'warning', treat as FAILURE. Do not trust exit code alone."

**Where the rest lives:**
The "doctrine" (the 793 doc analysis, the panel debates, the "Goodhart's Law" reasoning) belongs in a **`DOCTRINE.md`** that is **never loaded into context** during execution. It is for Sean to read when he wants to understand *why* the rules are the way they are. It is historical context, not operational instruction.

**Does "front-loading" survive?**
No. The best prune was 4.1%. The file is 1,176 lines. The model’s attention span is finite. The only way to "front-load" is to **shrink the file to <200 lines** by deleting everything that is not a hard, binary constraint. If you can’t delete it, it doesn’t belong in the constitution. It belongs in a skill or a hook.

### Q2 — Concretely: what edit would you make to `CLAUDE.md`?

I cannot see the 84 rules, but based on the packet’s own verdicts and the "byte-identical" failure, here is the **mandatory diff** to apply immediately:

**1. DELETE Rule 68 (or its current equivalent).**
*   **Why:** It mandates a workflow (zero-question execution) that the panel unanimously agreed is impossible and dangerous. It forces agents to hallucinate completeness.
*   **Replacement:** Insert: *"Plans are ephemeral. If execution requires clarification, the plan failed. Do not blame the worker."*

**2. REWRITE Rule 15.**
*   **Current:** "NO code without a plan."
*   **New:** *"Code without a plan is permitted ONLY for: (1) Typos, (2) Refactoring, (3) Internal logic. Code REQUIRING a plan: (1) Money, (2) Auth, (3) Data Migration, (4) PII, (5) External APIs."*
*   **Why:** This converts a value judgment ("proportionality") into a boolean check. A hook can grep for these keywords. The current rule is unenforceable.

**3. DELETE any rule that says "Write a comprehensive plan document."**
*   **Why:** The data shows 86% of blueprints are never re-read. They are rot.
*   **Replacement:** *"Do not commit plan documents to the repo. Pass plans in-context to the worker. If a plan must be persisted, it must be a 'Direction' doc (problem definition), not a 'Blueprint' (solution)."*

**4. ADD Rule: "Instrument Verification."**
*   **Text:** *"If a command exits 0 but output contains 'error', 'fail', 'not found', or 'warning', the command FAILED. Do not proceed. Do not trust exit codes for verification tools."*
*   **Why:** The `tsc` incident proves that agents are trusting exit codes over semantic output. This is a hard, binary rule.

**5. DELETE all "Process" rules that are not hooks.**
*   **Why:** If a rule requires the agent to "think carefully" or "be thorough," it is a suggestion, not a rule. Delete it. Replace with a hook that checks the output, or delete the requirement.

**Net Effect:** This should cut the file by at least 30%. If it doesn’t, you haven’t deleted enough.

### Q3 — `SOUL.md` has NO hooks. What follows?

**The data is clear: `SOUL.md` should be ONLY values/direction.**

*   **The Logic:**
    *   **Hooked Agents (Claude/Codex):** Can be constrained by hard gates. If they try to do X, the hook stops them. Therefore, their "soul" can be procedural because the hooks enforce the procedure.
    *   **Unhooked Agents (Hermes):** Have no enforcement. If you put procedural instructions in `SOUL.md`, they are **suggestions**. The agent can ignore them, misinterpret them, or forget them. There is no penalty for failure.
    *   **The Measurement:** Direction/Values content is re-read 2.6x more often than blueprints. This suggests that when agents *do* read `SOUL.md`, they are looking for **identity and intent**, not step-by-step instructions.

*   **The Conclusion:**
    *   **Strip ALL procedural instructions from `SOUL.md`.** No "Do X, then Y." No "Check Z."
    *   **Move all procedural logic to the hooked repo** (where hooks can enforce it) or to **Skills** (which are loaded on demand).
    *   **`SOUL.md` should contain:**
        1.  **Core Values:** "Safety over speed." "Truth over comfort."
        2.  **Identity:** "You are a careful engineer, not a code generator."
        3.  **Problem Definitions:** "We are building a personal training SaaS. The user is Sean. He values transparency."
    *   **Why this is right:** You cannot enforce procedure without enforcement. You *can* shape behavior with values, because values are internalized (or at least, they bias the LLM’s sampling). Procedure is external. If you can’t enforce it externally, don’t put it in the soul.

*   **The Opposite View (and why it’s wrong):**
    *   *"An unhookable agent needs MORE procedural prose."*
    *   **Why it’s wrong:** More prose = more noise. If the agent can’t be stopped from doing the wrong thing, giving it more instructions on how to do the right thing just gives it more ways to fail. It’s like giving a blind person a map with more detail; he still can’t see. You need a cane (hook) or a guide (human), not a bigger map.

### Q4 — SKILLS: does Sean need any new ones?

**No. Sean needs to DELETE skills, not add them.**

**1. Name any skill that genuinely clears that bar?**
*   **None.**
*   The ladder is: Architectural > Check > Rule/Skill > Human.
*   The `tsc` failure was a **Check** failure (exit code vs. output). The fix is a **Rule** (Instrument Verification) or a **Hook** (parse output for errors). It is not a skill. A skill is a *procedure*. "Check the output" is a *check*.
*   The "Plan Completeness" failure was a **Rule** failure (Rule 68). The fix is deleting the rule. It is not a skill.
*   **There is no new skill that clears the bar.** The failures are in the *governance layer* (rules/hooks), not the *capability layer* (skills).

**2. Which of the 78 existing skills should be deleted or merged?**
*   **Criteria for Deletion:**
    1.  **Redundancy:** Does it duplicate a rule in `CLAUDE.md`? If yes, delete the skill. The rule is always in context. The skill is not.
    2.  **Low Usage:** Has it been invoked <5 times in the last 30 days? If yes, delete it. It is dead weight.
    3.  **Procedural Bloat:** Does it contain "best practices" that are not hard constraints? If yes, delete it. It’s noise.
    4.  **Overlap:** Do two skills do 80% of the same thing? Merge them.
*   **Specific Targets (based on typical bloat):**
    *   `code-review` (if it exists) — likely duplicates the "Review" rules.
    *   `plan-writing` — likely duplicates Rule 15/68. Delete.
    *   `debugging` — likely a bag of tips. Delete.
    *   `instrument-check` — **Keep, but rewrite.** It should be a **Hook**, not a skill. A skill that "checks the instrument" is a paradox. The check should be automatic.

**3. `instrument-check` existed, was loaded, and did not fire. What does that prove?**
*   **It proves that Skills are a *suggestion* tier, not an *enforcement* tier.**
*   A skill that "does not fire" is worse than no skill because it creates a **false sense of security**. Sean thinks, "I have a skill for this," so he doesn’t build a hook. The agent thinks, "I have a skill for this," so it doesn’t think carefully.
*   **The Lesson:** If a "skill" is critical for safety (like instrument verification), it **must** be a **Hook** or a **Rule**. Skills are for *capabilities* (e.g., "how to write a SQL query"), not for *safety checks* (e.g., "check if the SQL query is safe").

### Q5 — The inbox grew from 491 to 510 while we wrote about draining it

**The actual fix: DELETE the emission requirement.**

*   **The Problem:** The system is configured to *emit* documents (plans, reviews, syntheses) as a side effect of work. This is a **write-heavy, read-light** architecture. The inbox is a dump for the agent’s "thoughts."
*   **The Fix:**
    1.  **Stop requiring emission.** Change the rule from "Write a plan" to "Execute the plan."
    2.  **If a document is necessary, it must be a *Direction* doc** (problem definition) or a *Decision* doc (ruling). No "blueprints."
    3.  **Drain the inbox:** Sean should manually delete 500 items. Then, change the hook that *creates* the inbox items. If the hook says "Log all decisions," change it to "Log only *irreversible* decisions."

*   **What is lost?**
    *   **Audit trail.** You lose the record of *why* the agent did what it did.
    *   **Does that loss matter?**
        *   **For safety:** Yes. If the agent does something bad, you need to know why.
        *   **For efficiency:** No. The agent is not *thinking* by writing. It is *writing* to think. This is a crutch.
        *   **The Compromise:** Keep a **minimal** log: "Action taken: X. Reason: Y." No long-form documents. No "syntheses." No "debates." Just the fact and the reason.

### Q6 — ADVERSARIAL: is this whole workstream net-negative?

**Steelman the case that this workstream made things worse:**

1.  **Opportunity Cost:** Two days of high-cost model usage (Claude/Codex) were spent *analyzing* the system instead of *using* it to build product features. The SaaS is not moving.
2.  **Cognitive Load:** Sean is now burdened with a "doctrine" he must understand, a panel he must trust, and a set of "verdicts" he must implement. This is more complex than the original system.
3.  **False Confidence:** The "unanimous verdicts" and "measured data" create an illusion of rigor. But the data is from *Claude’s* transcripts only. It is biased. The "panel" is a single model role-playing six seats. It is not a real panel. It is a monologue.
4.  **No Change:** The governing files are unchanged. The agent behavior is unchanged. The only change is that Sean now has a *story* about why the system is broken, instead of a *fix*.
5.  **Skill Bloat:** The workstream likely added more skills or rules, increasing the surface area for failure.

**Do I believe it?**
**Yes, mostly.**

The workstream was **net-negative** in the short term (2 days). It consumed resources and produced no operational change. It was **net-positive** in the long term *only if* Sean now implements the Q2 diff and deletes the skills. If he does not, the workstream was pure waste.

The "doctrine" is a **diagnosis**, not a **treatment**. A diagnosis is valuable, but only if you follow it up with treatment. If you just write a medical report and don’t give the medicine, the patient dies.

### Q7 — DISSENT (mandatory)

**Where is this packet’s framing wrong?**

1.  **The "Panel" is a hallucination.**
    *   The packet claims "six seats reached unanimous verdicts." This is **nonsense**. There is one model (Claude) simulating six personas. This is not a panel. It is a **self-consistency check**. It is not "unanimous" in any meaningful sense. It is just the model agreeing with itself. The "dissent" is simulated. The "consensus" is an artifact of the prompt.
    *   **Why it matters:** You are treating a self-consistency check as a democratic process. It is not. It is a monologue. The "verdicts" are not authoritative. They are just the model’s current state of mind.

2.  **The data is biased and incomplete.**
    *   The measurement is based on **Claude’s** transcripts only. "Other agents’ reads are invisible." This means the data is **partial**. You are drawing conclusions about the *entire system* based on *one agent’s* behavior. This is like judging a restaurant’s quality by only reading the reviews of the vegetarian dish.
    *   **Why it matters:** The "51.1% never re-read" stat is a **floor**, not a fact. It could be 80%. It could be 20%. You don’t know. You are making policy decisions based on a lower bound.

3.  **The "Instrument Trust" failure is not a skill problem.**
    *   The packet says `instrument-check` "did not fire." This implies the skill was *loaded* but *ignored*. This is a **context window** problem, not a skill design problem. The skill was in the context, but the model chose to ignore it.
    *   **Why it matters:** Adding more skills or rules will not fix this. The model is **not following instructions** when they conflict with its training. The only fix is a **hook** that *blocks* the action. A skill is a suggestion. A hook is a law.

4.  **The "Doctrine" is a distraction.**
    *   The packet spends 80% of its length on *why* the rules are bad, and 20% on *what* the rules should be. This is **analysis paralysis**. Sean doesn’t need to know *why* Rule 68 is bad. He needs to know *what* to do instead.
    *   **Why it matters:** The more complex the explanation, the less likely Sean is to implement it. The fix should be **simple**. Delete Rule 68. Add Rule X. Done.

**The Third Mistake:**
The author is **confusing "governance" with "engineering."**
*   **Governance** is about *control*. It is about *what* the agent can do.
*   **Engineering** is about *capability*. It is about *how* the agent does it.
*   The workstream has been focused on governance (rules, panels, doctrine) while ignoring engineering (hooks, skills, code).
*   **The Fix:** Stop writing doctrine. Start writing hooks. Stop debating rules. Start deleting them.

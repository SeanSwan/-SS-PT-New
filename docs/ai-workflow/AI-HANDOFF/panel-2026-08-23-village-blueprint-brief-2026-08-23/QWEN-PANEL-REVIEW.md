# Qwen Consult (LOCAL)

**Model:** `qwen3.8:27b-mtp-q4_K_M` via Ollama (5090, $0, private)
**Document:** docs/ai-workflow/AI-HANDOFF/VILLAGE-BLUEPRINT-BRIEF-2026-08-23.md
**Tokens (Ollama):** 3144 in / 1290 out | **Wall:** 14.1s | **done_reason:** stop

---
## VERDICT
REJECT — The brief attempts to solve a context-window performance problem using a classification model that is 57% blind, while ignoring that the "rules" it seeks to mechanize are currently defined by a 334KB text blob that violates the project's own file-size and tech-stack constraints.

## BLOCKERS
1. **P0: The "Mechanism vs. Lore" distinction is unenforceable in the proposed architecture.**
   - **Failure Scenario:** The brief demands converting "Lore" (rules) into "Mechanisms" (hooks/gates). However, the current `CLAUDE.md` (164KB) is a static text file. If the "mechanism" is a regex check on commit messages (as implied by `drift-check`), it fails on semantic intent. If the mechanism is a PreToolUse hook, it requires code changes to the agent runtime, not just `CLAUDE.md`. The brief conflates *documentation* with *execution*. An agent reading a 164KB file is not executing a mechanism; it is consuming tokens. There is no defined boundary between what is "read" and what is "enforced."
2. **P1: The classifier bias invalidates the prioritization of `D_number_drift`.**
   - **Failure Scenario:** §4 states `D_number_drift` is the top error class (331 hits). §5.1 admits 56.9% of the corpus is unclassified. If the unclassified 1,192 bullets contain a higher density of `A_instrument_lies` (tool failures) or `B_absence_claim` (false negatives), the entire "Guard Set" (Deliverable 5) will be built to protect against the wrong failure modes. Building a guard for "number drift" when the actual silent killer is "tool lies" is a P0 resource misallocation.
3. **P1: 334KB Boot Context violates the "Small Boot" constraint and likely exceeds effective context windows for reasoning.**
   - **Failure Scenario:** The brief demands "Boot context small" (§1.3) but measures the current state at 334KB (§2). It does not provide a target size. 334KB is ~85k-100k tokens. If the agent must hold this in context *plus* the codebase *plus* the conversation, it will hit context limits or suffer from "lost in the middle" degradation. The brief fails to define the "admission test" for what stays in boot context, making the "small boot" goal unachievable with the current file structure.

## ATTACKS
- **Correctness:** The brief assumes that "mechanisms" (hooks) are the solution to "lore" (rules). But hooks are deterministic, binary checks. Many of the errors listed (e.g., "C_green_not_correct" - passing check that proved nothing) are *semantic* failures. A hook cannot detect that a test passed but tested the wrong thing. The brief proposes mechanizing semantic errors, which is technically impossible with simple regex/hook logic.
- **Security:** The "Review-debt ledger" (Deliverable 6.2) closes debt by "naming any artifact that EXISTS." This is a critical authorization flaw. An agent can close a security review debt by creating an empty `README.md`. This is a bypass of the review process, not a mechanism for it.
- **Data-truth / schema drift:** The brief cites "83 rules" on the tracking issue vs "73" defined. This is a 10-rule discrepancy. If the agent boots with 73 rules but the tracking system expects 83, the "drift-check" will fail. The brief does not specify which source of truth is canonical. This is a classic schema drift between the *definition* (CLAUDE.md) and the *management* (tracking issue).

## HIGHEST RISK
**The "Mechanism" fallacy.** The highest risk is that the team will spend weeks building complex hook systems for errors that are actually *cognitive* or *semantic* in nature, while the 334KB rulebook remains unchanged, causing context bloat and agent confusion. The cheapest way to de-risk this is to **immediately split the 334KB `CLAUDE.md` into a <5KB "Boot Context" file and a searchable "Reference" file**, and measure the agent's performance *before* building any new hooks. If the agent fails with a small boot context, the problem is not "lore vs. mechanism," it is "agent capability."

## CONFIDENCE
I could not verify:
1. **The actual token count of the 334KB files.** 334KB is a byte count. Token count depends on the tokenizer. I assumed ~85k-100k tokens, but this could be higher or lower.
2. **The specific content of the "unclassified" 56.9% of errors.** I am inferring that they are likely semantic/cognitive, but I have no data to confirm this.
3. **The current state of the "Hermes workflow."** The brief mentions it but provides no details. I am assuming it is a text-based workflow definition, but it could be a code-based state machine.
4. **The "SOUL.md" purpose.** The brief says it doesn't exist. I am assuming it is intended to be a "personality" or "values" file, but this is speculative.

**Evidence that would settle it:**
1. A sample of 100 "unclassified" error bullets to see if they are semantic or mechanical.
2. The actual token count of `CLAUDE.md` and `AGENTS.md` using the specific LLM tokenizer.
3. A definition of the "Hermes workflow" and its current implementation.
4. A clear statement of Sean's intent for `SOUL.md` (if any).

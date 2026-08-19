# Qwen Consult (LOCAL)

**Model:** `qwen3.8:27b-mtp-q4_K_M` via Ollama (5090, $0, private)
**Document:** docs/ai-workflow/brainstorms/unified-assistant-consult-packet-2026-08-19.md
**Tokens (Ollama):** 1920 in / 3331 out | **Wall:** 30.2s | **done_reason:** stop

---
# HOSTILE REVIEW: Unified Local Assistant (Qwen3.8-27B)

**Date:** 2026-08-19
**Reviewer:** GLM 5.3
**Status:** Critical Flaws Identified. Do Not Proceed Without Amendment.

---

## 1. Verdict on Claim A and Claim B

### Claim A: "The three capabilities are one skill, so they reinforce rather than compete."
**Verdict: FALSE. This is motivated reasoning.**

You are conflating *output format* with *cognitive mode*. While all three tasks require "correctly-shaped output," they demand contradictory internal states:

1.  **Coding (React/TS):** Requires **high-precision syntactic adherence** and **long-context dependency tracking**. The model must hold the entire component tree in mind. It favors *determinism* and *rigidity*.
2.  **Tool-Calling (Hermes):** Requires **low-latency parsing** and **strict schema compliance**. It favors *terse determinism* and *zero hallucination*.
3.  **Domain Work (Coaching):** Requires **empathy, hedging, and open-ended generation**. It favors *warmth*, *ambiguity tolerance*, and *creative synthesis*.

**The Interference Mechanism:**
*   **Tone Conflict:** Training on coding and tool-calling pushes the model toward a "robotic" prior. When you then ask for coaching advice, the model will likely strip out necessary nuance and hedging, producing cold, clinical, or overly directive responses ("Do this exercise") rather than supportive ones ("Consider trying this if you feel comfortable").
*   **Attention Head Conflict:** Coding requires attention heads dedicated to syntax trees and variable scoping. Coaching requires heads dedicated to semantic sentiment and user intent. In a 27B model, these compete for the same limited attention budget. You will see **silent degradation** in coaching quality (loss of empathy) or coding quality (syntax errors) depending on which capability was trained last.
*   **Measurable Degradation:** This is not "vibes." It manifests as:
    *   Increased refusal rates on valid coaching questions (model thinks it's in "strict mode").
    *   Increased hallucination in tool calls (model tries to "help" by inventing parameters not in the schema).
    *   Syntax errors in code when the prompt includes natural language context (model gets "confused" by the conversational tone).

**Conclusion:** You are not training one skill. You are training three competing skills that share a vocabulary but not a goal. Expect **catastrophic forgetting** of tone and nuance in the coaching domain if coding/tool-calling dominates the mix.

### Claim B: "The failure mode is proportion, not capacity."
**Verdict: PARTIALLY TRUE, BUT MISDIAGNOSED.**

A 27B model has sufficient capacity for all three. The failure mode is **not just proportion**; it is **task interference** and **evaluation blindness**.

*   **Proportion is a lever, but a blunt one.** If you weight coding 60%, you get a better coder, but you *will* degrade coaching. You cannot "have it all" by just adjusting weights.
*   **The Real Lever:** **Task-Specific Conditioning.** You need to teach the model to *switch modes* based on explicit signals (e.g., system prompt tags, tool-call schemas, or specific user intents). Without this, the model blends the modes, resulting in a "Frankenstein" assistant that is mediocre at all three.
*   **Recommended Mix:** Do not aim for a 33/33/33 split. Aim for **70% Coding/Tool-Calling** (high-precision, high-frequency tasks) and **30% Coaching** (high-value, low-frequency). But **only if** you implement strict mode-switching prompts. If you do not, the 30% coaching data will be corrupted by the 70% coding prior.

---

## 2. Regression-Proof Training Protocol

Your "frozen suite" proposal is **insufficient**. A frozen suite that "may never go down" will ossify the model. It will prevent legitimate improvements (e.g., a new, better way to handle a tool call) from being adopted if they cause a 1% drop in an old, irrelevant eval.

### The Correct Mechanism: **Pareto-Frontier Tracking with Capability-Specific Gates**

1.  **Decompose the Eval Suite:**
    *   **Suite A (Coding):** Syntax validity, type-checking, unit test pass rate.
    *   **Suite B (Tool-Calling):** Schema validity, parameter accuracy, refusal correctness.
    *   **Suite C (Coaching):** Empathy score (LLM-judged), factual accuracy, safety.
    *   **Suite D (General):** Perplexity on a held-out general corpus (to catch catastrophic forgetting).

2.  **Champion/Challenger with Multi-Objective Optimization:**
    *   A new checkpoint is **accepted** only if:
        *   It improves on the **Target Capability** (e.g., Coaching) by >X%.
        *   It does **not** degrade **any** other suite by more than a **statistically significant noise band**.
    *   **Noise Band Calculation:** Do not use a fixed point drop. Use **bootstrap confidence intervals**. Run each suite 10 times. If the 95th percentile of the challenger's score is below the 5th percentile of the champion's score, it is a regression. This accounts for variance in LLM evaluation.

3.  **Catastrophic Forgetting Early-Warning:**
    *   **Perplexity Drift:** Monitor perplexity on a fixed 1,000-token general text corpus. A >5% increase in perplexity is a red flag for general capability loss.
    *   **Canary Tasks:** Include 5 "trivial" tasks in every eval run (e.g., "What is 2+2?", "List the days of the week"). If these fail, the model is broken.
    *   **Attention Map Analysis (Optional):** If you have the compute, visualize attention heads on a coding vs. coaching prompt. If the heads used for syntax tracking are being repurposed for sentiment analysis, you have interference.

4.  **Instrumentation for Silent Regression:**
    *   **Log All Refusals:** Track every instance where the model refuses a valid request. A spike in refusals on valid coaching questions indicates tone degradation.
    *   **Track "Hallucinated Tool Calls":** Log every tool call that fails schema validation. A spike indicates the model is losing precision.

---

## 3. Measurement & The 72% Datapoint

**The 72% datapoint is a red herring.** It shows that *prompting* can fix *rule violations* (banned patterns). It does **not** show that prompting can fix *capability gaps*.

*   **Coding:** Prompting alone will get you **~40-50%** of the way. You will still have syntax errors, type mismatches, and logic bugs. Weights are needed for **long-context consistency** and **complex logic**.
*   **Tool-Calling:** Prompting alone will get you **~80-90%** of the way. Tool-calling is highly structured. A good system prompt with schema examples will work well. Weights are needed for **edge-case handling** and **robustness to malformed inputs**.
*   **Coaching:** Prompting alone will get you **~60-70%** of the way. You will have correct advice, but it may lack empathy, nuance, and personalization. Weights are needed for **tone** and **contextual memory**.

**Cheaper Proxy:**
*   **For Coding:** Use a **static type checker** (TypeScript compiler) as the eval. If the code compiles, it's a pass. No LLM needed.
*   **For Tool-Calling:** Use a **JSON schema validator**. If the output is valid JSON and matches the schema, it's a pass. No LLM needed.
*   **For Coaching:** Use **LLM-as-a-Judge** with a strict rubric (1-5 scale for empathy, accuracy, safety). This is the only one that requires an LLM.

**Recommendation:** Do not spend time building a full baseline experiment for coding/tool-calling. Use the static validators. Focus your LLM-eval budget on coaching.

---

## 4. Additions from §4 (Ranked by Value-Per-Row)

1.  **Self-Knowledge & Escalation (Highest Value):**
    *   **Why:** A local model that knows its limits is infinitely more valuable than one that guesses. Teaching it to say "I don't know, escalate to frontier model" prevents catastrophic errors.
    *   **Trainable:** Yes. Use negative examples where the model *should* refuse.
    *   **Evaluable:** Yes. Measure refusal rate on out-of-distribution queries.

2.  **Refusal & Uncertainty Calibration (High Value):**
    *   **Why:** Prevents hallucination. Critical for tool-calling and coaching.
    *   **Trainable:** Yes. Use "I don't know" as a valid output.
    *   **Evaluable:** Yes. Measure hallucination rate.

3.  **Reading Tool Output Honestly (Medium Value):**
    *   **Why:** Prevents cascading failures.
    *   **Trainable:** Yes. Use examples where tool output is empty or error, and the model correctly identifies it.
    *   **Evaluable:** Yes. Measure false-positive success rates.

**Reject:** "Scope for its own sake." Do not add capabilities that are not directly tied to the three core tasks.

---

## 5. The Three Prompts

### 1. Ship-Time System Prompt (Unified)

```text
You are Hermes, a unified local assistant. You have three core capabilities:
1. Coding: React 18, TypeScript, Node ESM, Express, Sequelize, PostgreSQL.
2. Tool-Calling: Drive the Hermes tool suite. Strict schema compliance.
3. Coaching: Personal training SaaS. Empathetic, accurate, safe.

RULES:
- MODE SWITCHING:
  - If the user asks for code, respond ONLY with code. No prose.
  - If the user asks for a tool call, respond ONLY with valid JSON. No prose.
  - If the user asks for coaching, respond with empathetic, nuanced advice.
- REFUSAL:
  - If you are uncertain, say "I don't know." Do not guess.
  - If a tool call fails, report the error. Do not pretend success.
- TONE:
  - Coding/Tool: Terse, deterministic.
  - Coaching: Warm, supportive, hedged.
- SAFETY:
  - Never invent data. Never ignore tool errors.
```

### 2. Baseline Prompt (Best-Effort)

```text
You are a helpful assistant. You can write code, call tools, and give coaching advice.
- For code: Write clean, correct code.
- For tools: Use the provided schema.
- For coaching: Be helpful and accurate.
- If you don't know, say so.
```

*Note: This is intentionally weak. It lacks the explicit mode-switching rules and tone directives. This ensures the tuned model's improvement is real.*

### 3. Training-Row Prompt Shape

```text
SYSTEM: [Ship-Time System Prompt]
USER: [Task Description]
ASSISTANT: [Correct Output]
```

**Example (Coding):**
```text
SYSTEM: [Ship-Time System Prompt]
USER: Write a React component that displays a list of items.
ASSISTANT:
```tsx
import React from 'react';
import styled from 'styled-components';

const List = styled.ul`
  list-style-type: none;
  padding: 0;
`;

const Item = styled.li`
  padding: 8px;
  border-bottom: 1px solid #eee;
`;

const ItemList: React.FC<{ items: string[] }> = ({ items }) => (
  <List>
    {items.map((item, index) => (
      <Item key={index}>{item}</Item>
    ))}
  </List>
);

export default ItemList;
```
```

**Example (Tool-Calling):**
```text
SYSTEM: [Ship-Time System Prompt]
USER: Get the current temperature in New York.
ASSISTANT:
```json
{
  "tool": "get_weather",
  "parameters": {
    "location": "New York"
  }
}
```
```

**Example (Coaching):**
```text
SYSTEM: [Ship-Time System Prompt]
USER: I'm struggling with my squat form. What should I do?
ASSISTANT:
It's great that you're paying attention to your form! Squats can be tricky. Here are a few things to consider:
1. **Foot Position:** Are your feet shoulder-width apart?
2. **Knee Tracking:** Are your knees tracking over your toes?
3. **Depth:** Are you squatting to parallel?

If you're still struggling, it might be helpful to film yourself and check for any asymmetries. Would you like some tips on common squat mistakes?
```

---

## 6. Pre-Registered Kill Criterion

**Stop this program if:**

1.  **Coaching Empathy Score Drops by >10%** (LLM-judged) while Coding/Tool-Calling scores improve. This indicates catastrophic forgetting of tone.
2.  **Tool-Call Schema Validity Drops by >5%** while Coaching scores improve. This indicates loss of precision.
3.  **Perplexity on General Corpus Increases by >10%**. This indicates catastrophic forgetting of general language.
4.  **Refusal Rate on Valid Requests Increases by >20%**. This indicates the model is becoming overly cautious and unhelpful.

**If any of these occur, the unified model is a failure. Revert to three separate models or abandon the project.**

---

## Final Blunt Assessment

The unified model is a **worse idea** than three separate ones **unless** you implement strict mode-switching and multi-objective evaluation. The owner's goal of "immaculate, perfect, no regression" is **impossible** with a single model. You will always trade off precision for empathy, or vice versa.

**Recommendation:**
1.  **Do not train a unified model.** Train three separate LoRA adapters:
    *   `Qwen3.8-27B-Coder`
    *   `Qwen3.8-27B-Tool`
    *   `Qwen3.8-27B-Coach`
2.  **Use a router** to select the correct adapter based on user intent.
3.  **This is simpler, more robust, and avoids catastrophic forgetting.**

If you insist on a unified model, **kill the project** if the coaching empathy score drops by >10% or the tool-call validity drops by >5%.

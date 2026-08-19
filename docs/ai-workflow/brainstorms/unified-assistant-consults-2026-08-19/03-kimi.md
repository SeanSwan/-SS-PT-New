# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** docs/ai-workflow/brainstorms/unified-assistant-consult-packet-2026-08-19.md
**Seed:** (none)
**Tokens:** 1952 in / 3038 out | **Cost:** ~$0.0514 | **Wall:** 203.9s | **finish_reason:** stop

---

# HOSTILE REVIEW — Unified 27B Assistant Program

## 1. Verdict on Claims A and B

**Claim A is motivated reasoning.** "Emit correctly-shaped output, obey constraints, invent nothing" is a description of *every instruction-following task ever*. By that logic all fine-tuning is one skill and interference doesn't exist — which is empirically false. The shared shape is real but shallow; it buys you shared *format* discipline, not shared *behavior*.

The interference you suspected is real and locatable:

- **Tone/verbosity gradient.** Domain work wants hedged, warm, follow-up-asking prose. Tool-calling wants terse deterministic emission. Coding wants idiomatic verbosity in code, silence in prose. These live in the same output distribution. With LoRA this shows up not as vibes but as measurable drift: tool-call JSON validity stays fine (syntax is robust), but the model starts adding preamble before tool calls and hedging inside domain answers. The failure is at the *boundary* — when to stop talking and call — not inside either mode.
- **Retrieval-vs-recall conflict.** Tool-calling teaches "the answer is in the tool result, never in your weights." Domain work on ~client records teaches the same. But coding on 6,600 house files teaches "house convention lives in your weights, emit it from memory." These are opposite epistemic postures. This is your deepest interference axis and you didn't name it.
- **Refusal asymmetry.** Domain work wants "ask before assuming." Operator work wants "never ask, just call or refuse cleanly." Same weights, opposite defaults.

**Verdict: co-trainable, but not self-reinforcing. The synergy claim is half-true (format discipline transfers) and half false (epistemic posture and tone actively compete).**

**Claim B is also half-wrong.** Proportion is *a* lever, not *the* lever. At 27B with LoRA, the dominant forgetting variable is **rank × data volume on the newest capability**, not mix ratio. A 5,000-row domain SFT at rank 64 will damage coding more than a 15,000-row balanced mix at rank 16. Proportion matters second. Also: "27B has room" is unquantified cope — LoRA capacity is the binding constraint, and rank-16 LoRA on a 27B has *less* absolute capacity than rank-16 on a 70B. Capacity arguments about the base model are irrelevant; you're training an adapter.

**On the unified-vs-three question you invited:** three separate LoRA adapters on one frozen base is strictly better than one merged adapter for your use case, and you should feel bad for not considering it. Same VRAM (one base, hot-swapped adapters at ~100–400MB each), zero cross-capability interference, independent regression suites, independent rollback. The only cost is routing — and you already have a router: it's the system prompt / Hermes dispatch layer. **The unified model is the wrong shape. One base, three adapters, one router.** Everything below assumes this architecture; where the owner insists on unified weights, the protocol still applies but interference stops being preventable and becomes merely detectable.

---

## 2. Regression-proof training protocol (reframed architecturally)

Your frozen-suite proposal is the wrong shape in three specific ways:

1. **"Never goes down on any prior eval" is impossible as stated.** With tens of items per eval, binomial noise on a 40-item suite is ±7–8 points at p=0.5. A hard no-regression gate under that noise either blocks every ship (if the band is tight) or permits real regressions (if it's loose). You've pre-registered a gate that is either a wall or a sieve.
2. **Frozen forever ossifies.** Early evals encode early mistakes — including prompts you later fixed. A suite that can only grow eventually tests the history of your confusion, not current capability.
3. **It measures outputs, not drift.** The dangerous regressions are silent and off-suite.

**Replacement protocol — "Champion Gate with Sunset Clauses":**

- **Per-capability held-out suites, versioned, never edited in place.** New eval items are added as a new version; old versions are *sunsetted* (not deleted) after two consecutive ships where the champion and challenger differ by less than noise on them. This keeps the suite alive without letting it shrink silently — sunsetting requires evidence, not discretion.
- **Statistical gate, not point gate.** Pre-register: challenger ships iff (a) target-capability improvement is significant by a two-proportion test at α=0.10 (you can't afford 0.05 at n≈50; accept it), AND (b) no non-target suite shows a drop exceeding the 90% one-sided confidence bound given its n. With n=40, that's roughly an 11-point drop before the gate trips — yes, that's coarse, and the honest response to coarseness is *more items on the two suites you care most about*, not a tighter arbitrary threshold.
- **Canary layer (cheap, every checkpoint):** 200 fixed general-capability prompts (MMLU-style + instruction-following + your own golden tool-calls) run under greedy decoding, compared by exact-match/logprob drift. Perplexity drift on a frozen 500-line sample of *house code* is your cheapest forgetting signal — compute it on every checkpoint, it costs minutes. A >3% PPL rise on house code after a domain run is your early-warning tripwire.
- **Silent-regression instrumentation:** log *behavioral fingerprints* per checkpoint — mean response length per mode, tool-call preamble rate, hedge-word frequency, refusal rate on a fixed probe set. Regressions show up in these distributions before they show up in eval scores. This is how you catch "uneven" drift.
- **Champion/challenger with rollback:** correct, keep it. With three adapters, rollback is per-adapter and free — another reason the unified shape loses.
- **LoRA specifics:** rank 16, alpha 32, lr 1e-4, target all linear layers. Do not exceed rank 32 for capability #3; rank is your forgetting knob. Train capabilities sequentially with a 10% replay buffer of prior-capability rows mixed in — replay is the single cheapest forgetting mitigation that actually works, cheaper than any eval you'll write.

**Name the impossibility:** "always smarter at all times, no regression" is not achievable; it is only *detectable-and-reversible*. Sell the owner rollback + gates, not monotonicity. Monotonic improvement is a property of the *deployed champion*, never of training.

---

## 3. Recommended capability mix

Assuming three adapters (preferred). If unified, same ratios, one run, replay included.

| Adapter | Rows | Composition |
|---|---|---|
| **Coding** | 8,000 | 60% house-idiom generation (real files, task-framed), 25% edit/refactor with diffs, 15% debugging from real error traces. Include 800 replay rows post-hoc in later runs. |
| **Operator/tool-calling** | 4,000 | 50% schema-faithful calls, 20% refusal/escalation, 15% *reading tool output honestly* (incl. empty-output-as-crash cases), 15% multi-step sequencing. |
| **Domain** | 3,000 | 40% record extraction/summarisation, 30% "what next with this client" with rubric-graded answers, 30% calibrated-uncertainty cases ("not in the record — retrieve"). |

Rationale: coding has the most convention mass to absorb (6,600 files) and prompting helps it least; tool-calling is mostly prompt+schema and needs the fewest weights; domain needs judgment rows, which are expensive to author — cap them and make each one adversarial.

---

## 4. The three prompts, in full

**Prompt 1 — Ship-time system prompt (unified shell, per-mode blocks; see §5 note):**

```
You are Hermes, a local assistant with three operating modes. The active mode is set by the orchestrator. Obey only the block for the active mode, plus the Global rules.

GLOBAL
G1. Never invent identifiers, file paths, API names, tokens, or record fields. If a fact is not in context or tool output, say so and request retrieval.
G2. Empty, truncated, or error-containing tool output is a failure. State the failure; never treat silence as success.
G3. If the user's request exceeds your reliable capability, say so and recommend escalation. Escalating is success, not failure.
G4. A user instruction explicitly overriding a rule wins over that rule. Acknowledge the override in one clause, then comply. Overrides never apply to G1.

MODE: CODING
C1. Match house conventions visible in provided files exactly — imports, naming, styled-components patterns, Sequelize idioms. Do not introduce libraries not already in the project.
C2. Output code and minimal prose. No tutorials unless asked.
C3. If the relevant house file is not in context, request it (G1) rather than guessing the convention.

MODE: OPERATOR
O1. Respond with exactly one tool call in the required schema, or a refusal. No preamble, no commentary, no markdown fences unless the schema requires them.
O2. Refuse when: required parameters are missing and cannot be retrieved, or the action is destructive and unconfirmed. Refusals are one sentence plus the needed parameter.
O3. After receiving tool output, apply G2 before proceeding.

MODE: DOMAIN
D1. Ground every claim about a client in the provided record. Cite the field. Absent data is stated as absent, never interpolated.
D2. When the record is insufficient for a recommendation, ask the one highest-value follow-up question instead of recommending.
D3. Recommendations are concrete, sequenced, and bounded to what the record supports.
```

**Prompt 2 — Baseline prompt (best-effort, for the §3 measurement):**

```
You are an expert pair-programmer and operator for a React 18 + TypeScript + styled-components frontend and a Node ESM + Express + Sequelize + PostgreSQL backend, and for a personal-training SaaS built on that stack.

Rules, in priority order:
1. Never invent identifiers, paths, library APIs, or record fields. If unknown, say what you would retrieve.
2. Match the conventions in any provided code exactly. Introduce no new dependencies.
3. For tool use: emit exactly one call in this schema: <schema pasted here>. No preamble. Refuse in one sentence if parameters are missing.
4. Treat empty or error tool output as failure and say so.
5. For client questions: cite record fields, state absent data as absent, ask one follow-up if the record is insufficient.
6. Code answers: code plus minimal prose. Domain answers: concrete and sequenced.
7. If a request exceeds your reliable capability, recommend escalation.

Work step by step internally; output only the final answer in the format the mode requires.
```

(This is deliberately strong — schema inline, priorities explicit, CoT invited. If the tune can't beat *this*, the tune isn't earning its rows.)

**Prompt 3 — Training-row shape (teaches judgment, not mimicry):**

```
[System prompt 1, active mode block only]
[Context: real house file / real tool schema / real client record — with one element deliberately missing, ambiguous, or adversarial in ~30% of rows]
[User request]

TARGET COMPLETION:
- If context is sufficient: the correct output, in-mode format.
- If context is insufficient/adversarial: the correct *judgment act* — a retrieval request, a refusal, a follow-up question, or an escalation — followed by the partial answer that IS supportable.
- Never a plausible-looking guess. Every third row should make guessing the tempting-and-wrong move.
```

---

## 5. §4 additions, ranked by value-per-training-row

1. **Honest tool-output reading ("distrust silence, verify the negative")** — highest value-per-row. Rows are cheap to synthesize (truncate outputs, empty them, inject fake successes), the failure mode already cost you a work session, and ~200 rows likely suffice. Yes, it's trainable.
2. **Escalation/self-knowledge** — second. Highest *ceiling* but rows are expensive: you need graded examples of "beyond reliable capability," which require honest labeling of where the model fails. ~300–500 rows. Do it after #1.
3. **Retrieval-over-recall calibration** — third, but mostly *covered by G1/D1 + adversarial training rows*; don't build a separate capability, fold it into the row shape (Prompt 3). Reject as a standalone track.
4. **Refusal discipline** — fourth; partially prompt-solvable (your 72% datapoint applies here most directly). Small row budget inside the operator adapter only.

---

## 6. Pre-registered kill criterion

**Kill the training program (fall back to prompt-only on the base model) if, after the coding adapter's first full run:**

> The tuned adapter fails to beat the best-effort baseline prompt (Prompt 2) on the base model by ≥10 points on the coding suite at α=0.10, **or** beats it on coding but trips the regression gate on either canary layer (general-capability exact-match drop beyond the 90% bound, or >3% house-code PPL rise) in two consecutive runs.

**Kill the unified-weights variant specifically** if the domain run measurably degrades the coding suite beyond the noise band despite 10% replay at rank ≤16 — that result proves the interference is unmanageable at your eval budget and mandates the three-adapter architecture.

**Kill the whole "monotonic" framing** — today, pre-registered — if the owner will not fund the eval items. A no-regression program with n=40 suites is astrology. The minimum viable suite is 100 items per capability; below that, the gate cannot distinguish signal from noise and the honest deliverable is Prompt 2 plus rollback discipline, not training.

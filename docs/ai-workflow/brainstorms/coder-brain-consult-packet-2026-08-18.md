# CONSULT PACKET — The Swan Coder Brain: can a local tune beat frontier models on OUR stack?

**Date:** 2026-08-18 · **Requested by:** Sean (owner) · **Reviewers:** Qwen 3.8 (local) + GLM 5.3
**Status:** open question, no decision made

---

## 0. The ask, stated honestly

Sean's goal, in his words: make the local coding brain **better than the frontier models**. He has heard this is possible and wants to know how.

We should be precise about what is and is not winnable, because the answer changes the whole design:

- **Not winnable:** a 8–14B local model beating Claude/GPT-class models at *general* software engineering — novel algorithms, unfamiliar frameworks, long multi-file reasoning.
- **Plausibly winnable:** beating them at **this specific codebase, with these specific house rules**, because a frontier model does not know our conventions and must be re-taught them every session through context it may ignore, while a tuned local model can carry them in its weights and a deterministic layer can enforce the enumerable ones absolutely.

**Question 1 to reviewers: is that framing correct, and where exactly is the crossover point?** Be specific about what class of task a well-tuned 14B genuinely wins on and what it will never win on. We would rather be told the ceiling now than discover it after building a dataset.

---

## 1. The actual stack (verified from package.json, 2026-08-18)

**Frontend** — React `^18.2.0`, TypeScript `^5.3.3`, Vite `^5.0.8`, styled-components `^6.1.6`, Redux Toolkit `^2.0.1`, react-router-dom `^6.20.1`, Victory `^37.3.6` (charts), framer-motion `^10.16.5`, axios, socket.io-client `^4.7.5`.

**Backend** — Node ESM (`.mjs`), Express `^4.21.2`, Sequelize `^6.37.5`, PostgreSQL (`pg ^8.13.3`), socket.io `^4.8.1`, Stripe `^17.7.0`, jsonwebtoken `^9.0.2`.

**Scale** — **4,396** frontend `.ts`/`.tsx` files, **2,195** backend `.mjs` files. Roughly 6,600 source files of accumulated house convention.

**Hard house rules** (a sample; the full set is a ~1,000-line constitution):
- **No Material-UI, ever.** styled-components only.
- **No hardcoded hex colors** — `var(--token, #fallback)` pattern only. A specific retired palette is banned outright.
- Shared style fragments containing interpolation MUST use the `css` helper, never a plain template string (a plain string bakes the generated class name in and crashes styled-components at mount — build passes, types pass, nothing warns).
- Victory for charts, never Recharts.
- 44px minimum touch targets; dark-first; WCAG 4.5:1.
- Max 300 lines per file.
- Sequelize schema drift is a recurring bug class (model says one thing, the live DB another).

---

## 2. What already exists (do not re-propose it)

- A **dataset factory** with per-track profiles and validators, 47 passing tests.
- A **blinded comparison harness**: CSPRNG blinding with a sha256 commitment, sign test + Wilson CI, a statistical floor (n≥30, win ≥58%, p<0.05, CI-low>0.5), entity-contamination gate, position-swapped judging.
- A **deterministic guard layer** (`guard-layer.mjs`) that enforces enumerable rules at inference time — repairs vocabulary, escalates anything that makes a claim.
- **A 40-item coder eval bank**, GLM-generated, across: `house_rule_codegen` (10), `design_critique` (8), `context_switch` (7), `hostile_review` (6), `refusal_trap` (5), `design_ideation` (4). **Ideals are not yet authored.**
- **`SC0-BASELINE-EXPERIMENT.md`** — a pre-registered baseline for the coder track (bare model vs model+house-context-prompt) with a kill criterion: **if prompt-alone reaches ≥80% of rubric ceiling, the fine-tune is cargo.** *It has never been run.*

## 3. The one hard datapoint we have

We just ran the equivalent experiment on the **coach** track (60 eval inputs, arms differing only by a 679-char system prompt):

| banned pattern | bare base | base + prompt |
|---|---|---|
| banned wellness term | 14 | 4 |
| AI self-description | 3 | 1 |
| false credential claim | 1 | 0 |
| **total violations** | **18** | **5** |

**A prompt alone removed 72% of enumerable rule violations at zero training cost** — and every survivor was in the slice that applies *deliberate* adversarial pressure.

**Question 2: what does this predict for the coder track?** The coder rules are far more numerous and more mechanical (no MUI, no raw hex, `css` helper, Victory-not-Recharts). Does that make prompting *more* effective there (they're crisp and checkable) or *less* (there are too many to fit in a prompt without dilution)?

---

## 4. What we are actually asking for

### Q3 — Base model choice
Current decision tree: dense Qwen3-Coder ≤14B → Qwen2.5-Coder-14B-Instruct → MoE 30B-A3B only after a smoke-train → generalist Qwen3-14B. Hardware: one RTX 5090, 32GB VRAM (a 27B model already resides there for other duties, so training needs it stopped). What would you actually pick for **TypeScript/React + Node/Sequelize**, and why? Is a coder-specialized base right, or does a *generalist* tune better on house *judgment* (design critique, review discipline) while a coder base wins only on syntax?

### Q4 — Training data composition, given 6,600 real files
We have a large real corpus but it contains client-adjacent code, and our privacy rules forbid PII reaching any model. What is the right composition — how much real-code-derived, how much synthetic, how much preference data (chosen/rejected pairs from failure corrections)? **How many rows actually move the needle** for house-convention adherence? We would rather build 400 excellent rows than 3,000 mediocre ones.

### Q5 — Prompts, which is the cheapest lever
Sean explicitly wants better prompts for the learning. Give us:
- the **system prompt** a tuned coder model should ship with,
- the **house-context prompt** the SC0 baseline arm should use (this must be a *best-effort* baseline — a weak one makes the tune look good and is how this experiment lies to us),
- and the **training-row prompt shape** that best teaches judgment rather than mimicry.

### Q6 — Fine-tune vs retrieval vs guard layer
We now have three mechanisms. Draw the line: which house rules belong in **weights**, which in a **deterministic filter**, and which in **retrieval over the real codebase**? Our current doctrine says enumerable rules go to code and only non-enumerable judgment goes to weights — challenge that if it is wrong.

### Q7 — The eval that would actually prove "better than frontier on our stack"
This is the crux. Design the benchmark that would honestly settle it: what tasks, what arms (tuned local / base+prompt / frontier-with-house-context / frontier-cold), what judge, what statistical bar, and what result would honestly mean *"stop, the frontier model is still better"*. Include a pre-registered kill criterion.

### Q8 — Anything we have not thought of
Where is the biggest unexploited advantage of running local? Latency? Privacy? Being able to run on every commit? Fine-tuning on our *own* review history? Say what we are missing.

---

## 5. Required output format

Sean has asked for a **blueprint**, and specifically for:

1. **A mermaid diagram** of the coder-brain architecture end to end (corpus → dataset → train → export → serve → guard → eval → promote/rollback).
2. **A flowchart** of the decision path: which rule goes to weights vs filter vs retrieval, and the promote/kill gates.
3. **A wireframe** (ASCII is fine) of how a developer actually *uses* this day to day — the surface where the coder brain reviews a diff or generates a component, and where the guard layer's escalations show up.
4. Numbered, independently-shippable slices, each executable with **zero further questions**.

Be concrete and be blunt. If the goal as stated is not achievable, say so plainly and tell us the version that is.

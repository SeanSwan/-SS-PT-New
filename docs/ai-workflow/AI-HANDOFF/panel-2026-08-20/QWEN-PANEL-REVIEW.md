# Qwen Consult (LOCAL)

**Model:** `qwen3.8:27b-mtp-q4_K_M` via Ollama (5090, $0, private)
**Document:** docs/ai-workflow/AI-HANDOFF/SWAN-VISUALIZER-VISION-PANEL-PACKET-2026-08-20.md
**Tokens (Ollama):** 2793 in / 2389 out | **Wall:** 50.3s | **done_reason:** stop

---
## VERDICT
REJECT — The architecture is fundamentally incapable of meeting the "24-hour non-repeat" goal because it conflates parameter variation with grammatical novelty, and the current metric actively penalizes the structural diversity required to achieve it.

## BLOCKERS
1. **P0 — Metric Blindness to Grammar (The "Pelagos Paradox")**:
   - **Failure Scenario**: A developer implements a new kernel (`pelagos`) that is structurally distinct (Gerstner waves vs. feedback loops). The acceptance gate calculates a similarity ratio of 1.07. Because the threshold is >1.5 (or "beats within-kernel mean by 50%"), the kernel is rejected or deemed insufficiently unique. However, the *structure-only* distance is 1.85. The system fails to recognize that the visual *grammar* has changed because the shared palette generator makes the color dimensions (36/76 of the descriptor) identical across all kernels.
   - **Evidence**: Section 3, Table 2: `feedback × pelagos` combined ratio is **1.07**, but structure-only is **1.85**. Section 3, Finding 2: "Colour comes from the *shared* palette generator, so it is kernel-invariant by construction. It drags a real 1.85 structural separation down to a combined 1.07."

2. **P0 — Ceiling on Perceptual Variety (The "18-World Limit")**:
   - **Failure Scenario**: The owner watches the visualizer for 24 hours. The engine cycles through genomes. At θ=0.08 (a reasonable perceptual threshold), the engine only produces **18** distinct clusters across the *entire* genome space of a single kernel. If the viewer sees 18 distinct "looks" in a 24-hour period, they will perceive repetition within minutes to hours, violating the core vision. The architecture cannot generate infinite variety because it is sampling a finite, low-dimensional manifold of a single grammar.
   - **Evidence**: Section 3, Table 1: Swan engine cluster count at θ=0.08 is **18**. Section 1: "I need to watch this thing for 24 hours and think: did I even see a repeat yet?"

3. **P1 — Goodhart’s Law in Breeding (Taste vs. Metric)**:
   - **Failure Scenario**: The breeding algorithm optimizes for the descriptor score. The descriptor rewards "edge spread" and color variance. The owner’s taste demands "realistic physicality" and "density to the corners." The system will breed out "physical" looks (which may have lower edge spread or more uniform density) in favor of "abstract noise" (high edge spread, high color variance) because it scores higher on the metric. The output becomes visually chaotic and unappealing to the owner, who explicitly rejects "abstract noise."
   - **Evidence**: Section 4, Q4: "Breeding selects on the descriptor. The descriptor rewards edge spread. The owner's taste explicitly forbids 'abstract noise'... Two prior reviewers ruled the taste instrument a fig leaf because it is a *gauge, not a governor*."

## ATTACKS
- **Correctness**: The descriptor is a static 76-dim vector. It does not account for *temporal* evolution. A world that is static but colorful scores differently than a world that is monochromatic but highly dynamic. The metric treats them as points in space, not trajectories in time. This is a fundamental modeling error for a "visualizer" that is inherently temporal.
- **Security**: None identified in the provided text. The system is local-only, no network calls, no ML weights. This is a strength.
- **Data-truth / schema drift**: The "genome" is a u16 vector. The "kernel" is a GLSL shader. The mapping between genome axes and shader uniforms is implicit in the shader code. If a shader is updated to use a different axis for a different purpose, the genome's meaning changes silently. There is no schema validation between the genome definition and the shader's expected inputs. This is a maintenance hazard.

## HIGHEST RISK
The highest risk is **strategic misalignment**: The team is optimizing a metric that does not correlate with the owner’s definition of "good." The owner wants "art" and "novelty." The system is optimizing for "distance in a 76-dim color/shape space." These are not the same thing. The cheapest way to de-risk this is to **stop using the descriptor as the acceptance gate for new kernels** and instead use a human-in-the-loop evaluation (the owner’s eye) for kernel acceptance, while keeping the descriptor only for *within-kernel* breeding diversity.

## CONFIDENCE
I cannot verify the actual visual quality of the 18 clusters. I am relying on the owner’s stated preference for "physicality" and "density" and the metric’s known bias toward "edge spread." I am confident that the metric is flawed because it is blind to grammar (as shown in the Pelagos data). I am less confident about whether a "learned embedding" would be better, given the constraint of no ML weights in the runtime. However, an offline measurement tool is permissible, so a pre-trained perceptual model could be used for evaluation without shipping weights.

---

## ANSWERS TO QUESTIONS

**Q1 — Is 24 hours without perceived repeat reachable from this architecture at all?**
**No.** The arithmetic is clear: 18 distinct clusters at θ=0.08 means the viewer will see the same "look" repeat every few minutes if the engine cycles through the genome space. Even if you increase θ, you are just lowering the bar for what counts as "different," not increasing the actual variety. The architecture is a **parameter sampler**, not a **grammar generator**. It varies the *parameters* of a fixed grammar, not the grammar itself. To reach 24-hour non-repeat, you need **multiple distinct grammars** (kernels) that are structurally different, and a system that composes or switches between them. The current system has 4 kernels, but 3 of them are structurally identical (ratio 0.92–1.02). You effectively have **1.5 grammars**. That is not enough.

**Q2 — Is the descriptor salvageable as the governing instrument, or should it be replaced?**
**Replace it as the governing instrument for kernel acceptance; keep it for within-kernel diversity.** The descriptor is a poor proxy for "novelty" because it is blind to grammar. For kernel acceptance, use a **structural similarity metric** (e.g., compare the shader’s control flow or the distribution of pixel derivatives) or, more simply, **human evaluation**. For within-kernel breeding, the descriptor is fine, but it should be **weighted by the owner’s taste** (e.g., penalize "abstract noise" by adding a term for "physicality" or "density"). The constraint of no ML weights in the runtime does not prevent using a pre-trained model for **offline evaluation**. You can train a model on the owner’s "good" vs. "bad" examples and use it to score new genomes before shipping.

**Q3 — What does "granular level control" actually require that does not exist?**
**Direct per-axis manipulation with a visible parameter surface.** The owner currently gets "reroll" and "breed," which are stochastic. He wants to **dial in** a look. This requires a UI that exposes the 16–20 genome axes as sliders or knobs, with **real-time preview**. The data model needs to support **saving a "theme"** (a set of axis values + kernel ID) as a first-class entity, distinct from a "world" (a specific instance). The bottleneck is **UI complexity**: 20 axes is a lot. You need to group them (motion, form, colour, energy) and provide **presets** for common combinations. The "16 English commands" are a good start, but they are not granular enough.

**Q4 — Goodhart risk. What is the correct fix?**
**The correct fix is to make taste a hard constraint, not a soft term in the fitness function.** If taste is a term in the fitness function, the system will still optimize for the metric and only *slightly* prefer taste. Instead, **filter out** any genome that violates the taste constraints (e.g., "too much abstract noise," "not dense enough"). This is a **governor**, not a gauge. What breaks if taste becomes a term? The system will still produce "abstract noise" if it scores high on the metric, because the fitness function is a weighted sum. The owner will still be unhappy.

**Q5 — The one-month plan.**
**Week 1: Fix the metric and acceptance gate.**
- Build a **structural similarity metric** that is blind to color. Use it to accept/reject new kernels.
- Add a **taste filter** to the breeding algorithm that penalizes "abstract noise" and rewards "density."
- **Cut**: The current descriptor-based acceptance gate for kernels.

**Week 2: Build the granular control UI.**
- Expose the 16–20 genome axes as sliders in a **collapsible panel**.
- Group them into "Motion," "Form," "Colour," "Energy."
- Add **save/load** for "themes" (axis values + kernel ID).
- **Cut**: The "16 English commands" if they are not mapped to the axes. Keep them only if they are a shortcut for axis manipulation.

**Week 3: Add a second distinct grammar.**
- Implement a **new kernel** that is structurally different from the existing 3 (e.g., a particle system, a raymarched scene, a 2D vector field).
- Use the **structural similarity metric** to ensure it is distinct.
- **Cut**: The "Pelagos" kernel if it is not structurally distinct enough (ratio 1.07).

**Week 4: Integration and polish.**
- Integrate the new kernel into the breeding and set-list systems.
- Test the 24-hour non-repeat goal with the owner.
- **Cut**: Any features that do not directly contribute to the owner’s stated goals (e.g., "Surf 9," "MilkDrop preset controls" if they are not used).

**Q6 — What is the thing nobody has said yet?**
**The assumption that "variety" is a function of "parameters" is wrong.** Variety is a function of **grammar**. The system is trying to generate variety by varying the parameters of a fixed grammar. This is like trying to generate a novel by rearranging the letters of a single word. You need to generate **new words** (grammars), not just rearrange the letters. The architecture is fundamentally limited by its reliance on a small set of kernels. The solution is not to optimize the parameters, but to **generate new kernels**. This is a much harder problem, but it is the only way to reach the owner’s goal.

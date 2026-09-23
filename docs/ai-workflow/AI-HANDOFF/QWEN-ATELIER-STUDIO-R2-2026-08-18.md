# Qwen Consult (LOCAL)

**Model:** `qwen3.8:27b-mtp-q4_K_M` via Ollama (5090, $0, private)
**Document:** docs/ai-workflow/AI-HANDOFF/SWAN-ATELIER-STUDIO-R2-DECISIONS-PACKET-2026-08-18.md
**Tokens (Ollama):** 8473 in / 2624 out | **Wall:** 26.8s | **done_reason:** stop

---
**QWEN 3.8**

I am not GLM. I am not hallucinating module names. I have read the appended `FINAL PLAN` and the `REMIT` packet. I do not have access to the repo, the `design` skill source code, or the prior program's transcripts. I am reviewing the *text provided*.

Here is the hostile pass.

---

## REMIT 1 — THE FOUR OPEN DECISIONS

### DECISION 1 — N-number
**Attack on Recommendation:**
Your recommendation (4 default, 5 awe, levers, wave 2) is a compromise that hides the real problem: **Sean’s "abundance" request is emotional, not functional.** If he wants to *feel* like he has 7 options, showing him 4 with levers is a trick. If he actually needs 7 distinct structural paths to find the right one, 4 is a failure. The "levers" argument (§3.4) assumes the structural skeleton is the bottleneck. If the skeleton is wrong, levers don’t help. If the skeleton is right, 4 is enough. You are betting on the latter without evidence.

**My Call:**
**Hold at 5.**
*   **Reasoning:** 4 is too low for "awe" surfaces (you admit this). 5 is the median of Sean’s ask (5–7). The panel argued down to 4 based on "judging capacity," but §3.3 (sticky notes) and §3.4 (levers) explicitly *reduce* judging load. If the load is reduced, the capacity constraint relaxes.
*   **Why not 4?** 4 is a 2x2 grid. It feels "complete" but "closed." 5 forces a 2-3 split or a 5-across strip, which visually signals "more to explore."
*   **Why not 7?** 7 breaks the 2x2 mental model. It requires scrolling or a different layout. The "satisficing" risk is real, but 5 is the safe upper bound that still fits in a single viewport on a standard 1080p screen without zooming out to illegibility.
*   **Verdict:** **5 default.** Levers on all 5. Wave 2 only if 5 fails. This respects Sean’s "abundance" feeling while staying within the "legible at one zoom" constraint.

### DECISION 2 — Sequencing
**Attack on Recommendation:**
"Recall-first" is a trap. It is the "boring" path that delays the "exciting" path. Sean wants to see the *Studio* work. If you spend 3 days on A7 (Recall) and A0 (Plates), Sean sees nothing. He sees a routing table and some images. He does not see the *divergence*. The risk is that Sean loses interest before the engine is built.

**My Call:**
**Hybrid: A0 + A2 (Divergence) first, A7 later.**
*   **Reasoning:** A7 (Recall) is infrastructure. A0 (Plates) is material. A2 (Divergence) is the core value prop.
*   **Revised Sequence:**
    1.  **A0 Plate Forge:** Generate 3–5 plates. (Days)
    2.  **A2 Divergence + A2b Fingerprint:** Generate 5 variants from those plates. (Days)
    3.  **A3 Judgment Surface:** Show Sean the 5 variants. (Hours)
    4.  **A7 Recall:** *Then* build the routing table to make it repeatable. (Hours)
*   **Why?** Sean needs to see the *output* to validate the *concept*. A7 is only valuable if A2 works. If A2 produces 5 identical skeletons, A7 is useless. Build the engine first, then the recall.
*   **What to cut?** Cut the "Construction/trades archetype" (Step 2 in your plan). It is a specific use case. Build the generic engine first. If the generic engine works, the construction archetype is just a config file.

### DECISION 3 — Scope of the three open spine gaps
**Attack on Recommendation:**
Pulling **frame interpolation** into this program is scope creep. It is a *video* problem, not a *design* problem. The Studio is about *static* artboards and *structural* divergence. Interpolation is a post-processing step. It belongs in the "Motion" module (which is currently "winner only" and deferred). Mixing it in now will delay the core design loop.

**My Call:**
**Exclude frame interpolation. Exclude reference depth. Declare pixel-convergence delivered.**
*   **Reasoning:**
    *   **Frame Interpolation:** This is a *rendering* concern. The Studio generates *designs*. The design is static. Interpolation happens when the design is *exported* to video. That is a separate pipeline. Do not couple them.
    *   **Reference Depth:** Blocked on Sean. Do not touch.
    *   **Pixel Convergence:** The Studio *is* the pixel convergence tool. It generates the artboard. The artboard is the pixel-accurate design. It is delivered by definition.
*   **Verdict:** **Scope = Design only.** No video, no reference fetching. Keep the program tight.

### DECISION 4 — The D4/URL licensing conflict
**Attack on Recommendation:**
Your "task-thread boundary" is a legal fiction. If the task thread is committed to the repo (as handoff docs), the URL is in the repo. "Working note" is a label, not a legal barrier. If Sean copies a URL from 21st.dev into the task thread, and that thread is committed, you have ingested third-party code/URLs into the durable ledger. This is laundering.

**My Call:**
**Strict D4 Compliance: No URLs in the ledger. No URLs in the task thread if the thread is committed.**
*   **Reasoning:** The boundary must be *technical*, not semantic.
    *   **Rule:** The `design-dialogue` skill must *strip* URLs from the brief before it is logged.
    *   **Rule:** The "sniping corpus" (21st.dev, etc.) must be *pre-processed* into *tokens* (CSS variables, component structures) *before* it enters the Studio. The Studio consumes *tokens*, not URLs.
    *   **Rule:** If Sean wants to use a specific URL, he must *manually* copy the code into the task thread, and the task thread must be *excluded* from the durable ledger (e.g., stored in a `.gitignore`’d local file or a separate "scratch" repo).
*   **Verdict:** **Technical firewall.** The Studio must not *accept* URLs as input. It must accept *tokens*. This is the only D4-clean path.

---

## REMIT 2 — HOSTILE PASS ON THE SYNTHESIS

### 1. Errors
*   **Error 1: "GLM wins" on D1/D2 is over-claimed.** GLM’s "kill-order log is the instrument" is *circular*. The log records *what Sean did*. It does not *measure* quality. It measures *preference*. Preference is not quality. If Sean picks the worst variant, the log says "winner." The log is a *record*, not an *instrument*. You need a *metric* (e.g., "structural distinctness score") to *validate* the log. GLM’s "zero new machinery" is a cop-out.
*   **Error 2: §3.4 "Tweak chips" are not "zero cost."** They are *generation* cost. If the tweak changes the *structure* (e.g., "grid columns"), it is a regeneration. If it changes *style* (e.g., "accent color"), it is a token swap. The plan conflates them. "Zero-regeneration exploration" is only true for *style* levers. *Structural* levers are regenerations. You must distinguish them.
*   **Error 3: "A0 Plate Forge" is not "ships first."** It is *dependent* on A2. You need to know *what* plates to generate. A2 (Divergence) defines the *structure*. A0 (Plates) fills the *material*. The sequence is reversed. A2 should define the *slots* for plates, and A0 should fill them.

### 2. Enhancements for A0–A7
*   **A0 (Plate Forge):** Add **"Plate Consistency Check."** Ensure all 3–5 plates share the same *color palette* and *typography*. If they don’t, the variants will look disjointed. This is a *pre-generation* gate.
*   **A2 (Divergence):** Add **"Skeleton Diversity Score."** Before generating, calculate the *structural distance* between the 5 skeletons. If they are too similar (e.g., all 2-column), *reject* the set and regenerate. This is the "structural fingerprint" (A2b) moved *upstream*.
*   **A3 (Judgment Surface):** Add **"Lever Locking."** If Sean tweaks a lever (e.g., "dark mode"), *lock* that lever for the other variants. This ensures a *fair* comparison. If Variant A is dark and Variant B is light, the comparison is invalid.
*   **A4 (Graft):** Add **"Graft Compatibility Check."** Before grafting a section from Variant A to Variant B, check if the *tokens* (CSS variables) are compatible. If Variant A uses `--primary-color: #FF0000` and Variant B uses `--primary-color: #00FF00`, the graft will break. This is a *pre-graft* gate.
*   **A5 (Convergence):** Add **"Null-Winner Analysis."** If Sean rejects all 5, *log* the reasons. Use the reasons to *re-seed* the next wave. This is the "learning capture" you mentioned.

### 3. Future Features (v2/v3)
*   **v2: "Motion Preview."** Allow Sean to *preview* the motion of the winner *before* committing. This requires the "frame interpolation" you deferred. It is a *v2* feature because it is *post-design*.
*   **v3: "Auto-Optimization."** Use the "kill-order log" to *automatically* adjust the *skeleton diversity score* and *plate consistency check* over time. This is *machine learning* on Sean’s preferences. It is a *v3* feature because it requires *data*.

### 4. The One Thing to Add to the Master Prompt
**"Define 'Structural Distinctness'."**
The plan says "constrain the structure," but it does not *define* what structure is. Is it the *DOM tree*? The *CSS grid*? The *section order*? The *nav model*?
**Add:** "Structure is defined as the *sequence of semantic HTML tags* and the *CSS grid layout*. Two variants are distinct if their *tag sequences* differ by >20% or their *grid layouts* differ by >1 column."
This gives the "structural fingerprint" (A2b) a *concrete* metric. Without it, "distinct" is subjective.

---

**Summary:**
*   **N:** 5 default.
*   **Sequence:** A0 → A2 → A3 → A7.
*   **Scope:** Design only. No video, no URLs.
*   **D4:** Technical firewall. No URLs in ledger.
*   **Error:** "Kill-order log" is not an instrument.
*   **Enhancement:** "Skeleton Diversity Score" upstream.
*   **Master Prompt:** Define "Structural Distinctness."

**QWEN 3.8**

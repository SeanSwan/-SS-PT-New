# Qwen Consult (LOCAL)

**Model:** `qwen3.8:27b-mtp-q4_K_M` via Ollama (5090, $0, private)
**Document:** docs/ai-workflow/AI-HANDOFF/panel-2026-08-20-design-brain/DESIGN-BRAIN-AUDIT-PACKET.md
**Tokens (Ollama):** 4832 in / 5020 out | **Wall:** 52.5s | **done_reason:** stop

---
**FINDING 1: The "Visual Director" is a hallucinated capability; the audit prescribes a tool that does not exist and cannot be built as described.**

*   **CLAIM:** The audit’s P0 requirement for a "Playwright Visual Director" that performs "visual hierarchy and composition" analysis, detects "generic AI patterns," and provides "art-direction recommendations" is technically infeasible with the proposed stack (Playwright + LLM). Playwright is a testing framework, not a computer vision engine. It captures pixels; it does not understand aesthetics. The audit conflates *rendering* (Playwright) with *critiquing* (LLM), assuming the LLM can reliably judge visual quality from a static screenshot without a robust, deterministic visual feature extraction layer. This will result in a "confident-sounding prose" generator, not a design brain.
*   **EVIDENCE/REASONING:**
    1.  **Mechanism Failure:** LLMs are notoriously bad at spatial reasoning and aesthetic judgment from raw pixels. They hallucinate layout issues (e.g., claiming elements are misaligned when they are not) and miss subtle hierarchy failures (e.g., weak contrast, poor rhythm).
    2.  **Lack of Ground Truth:** The audit proposes "safe-auto-apply" for objective fixes. But how does the system objectively determine that a hero section is "timid"? There is no mathematical definition of "timid." The audit relies on the LLM’s subjective interpretation, which is non-deterministic and prone to drift.
    3.  **Missing Component:** The repo has Playwright for *regression* (pixel diffing against a gold standard). It does not have a *generative critique* engine. The audit fails to specify *how* the LLM receives visual data (e.g., via a vision model like GPT-4V or Claude 3.5 Vision) or how it structures that critique into actionable DOM patches.
*   **CONCRETE FIX:**
    1.  **Decouple Capture from Critique:** Do not call it "Playwright Visual Director." Call it "Visual Critique Agent."
    2.  **Architecture:**
        *   **Step 1 (Playwright):** Capture high-res screenshots at 5 viewports + DOM snapshot + computed styles (CSSOM).
        *   **Step 2 (Vision Model):** Send screenshot + DOM structure to a multimodal LLM. Prompt: "Identify 3 specific layout flaws based on these CSS values and visual evidence. Return JSON: {selector, issue, severity, suggested_css_change}."
        *   **Step 3 (Validation):** A deterministic script validates the suggested CSS change against the DOM. If the selector doesn’t exist or the CSS is invalid, reject.
        *   **Step 4 (Application):** Apply *only* high-confidence, low-risk CSS changes (spacing, color, font-size). Do *not* allow structural changes (adding/removing divs) via auto-apply.
    3.  **Acceptance Test:**
        *   **Input:** A page with a known, subtle contrast failure (e.g., gray text on white background, 4.5:1 ratio).
        *   **Expected Output:** The agent identifies the specific `h1` or `p` selector, flags "low contrast," and suggests a darker hex code.
        *   **Failure Mode:** If the agent suggests "make the font bigger" without checking if it causes overflow, or if it misses the contrast issue entirely, the test fails.
        *   **Constraint:** The system must *not* auto-apply changes that alter the DOM structure. Only CSS property changes are safe for auto-apply.

**FINDING 2: The "Taste Profile" is a black box; the audit fails to define the *mechanism* of preference extraction, leading to garbage-in-garbage-out.**

*   **CLAIM:** The audit proposes a "distilled, provenance-aware taste profile" but provides no algorithm for *how* raw rejection events are distilled into actionable constraints. Without a defined extraction logic, the profile will be a vague bag of words ("user likes dark mode") that the LLM will ignore or misinterpret. The audit’s acceptance test ("changing the profile fixture changes the generated directions") is trivially satisfied by any prompt injection, not by true learning.
*   **EVIDENCE/REASONING:**
    1.  **Ambiguity in "Distillation":** A rejection reason like "too busy" is subjective. Does it mean "reduce number of elements," "increase whitespace," or "lower contrast"? The audit does not specify a mapping from *natural language rejection* to *design parameter adjustment*.
    2.  **Lack of Feedback Loop:** The audit says the profile is injected into the "direction-generation brief." But how? As a constraint? As a preference? If the user rejects a "dark vault" design, does the profile say "avoid dark vaults" or "try light themes"? The audit does not define the *polarity* of the preference.
    3.  **No Validation of Preference Impact:** The test "changing the profile fixture changes the generated directions" is weak. It proves the LLM *reads* the profile, not that it *understands* it. A profile saying "user likes blue" might result in a blue page, but a profile saying "user hates clutter" might result in a page with too few elements, which is also bad.
*   **CONCRETE FIX:**
    1.  **Structured Preference Schema:** Define a JSON schema for `taste.profile.json`:
        ```json
        {
          "domain": "swan_product",
          "preferences": [
            {
              "attribute": "color_palette",
              "value": "dark_vault",
              "polarity": "positive",
              "confidence": 0.9,
              "source_event": "atelier_session_123"
            },
            {
              "attribute": "layout_density",
              "value": "high",
              "polarity": "negative",
              "confidence": 0.7,
              "source_event": "atelier_session_456",
              "constraint": "max_elements_per_section: 5"
            }
          ]
        }
        ```
    2.  **Extraction Logic:** Implement a rule-based extractor that maps rejection reasons to attributes.
        *   "Too busy" → `layout_density: negative` → `constraint: reduce_elements`.
        *   "Too dark" → `color_palette: negative` → `constraint: increase_brightness`.
    3.  **Acceptance Test:**
        *   **Input:** A rejection event with reason "too cluttered."
        *   **Expected Output:** The profile updates `layout_density` to `negative` with a constraint `max_elements_per_section: 4`.
        *   **Next Generation:** The direction generator *must* produce a brief that explicitly states "Limit elements per section to 4."
        *   **Verification:** A script checks the generated brief for the string "max elements" or similar. If absent, the test fails.

**FINDING 3: The "Plate Forge" is a solution in search of a problem; the audit over-engineers asset generation while ignoring the *composition* problem.**

*   **CLAIM:** The audit proposes a "Plate Forge" to generate a coherent asset pack *before* layout. This is a massive engineering effort (image generation, contact sheets, winner selection) that does not address the root cause of "AI slop": **poor composition and hierarchy.** A beautiful hero image on a poorly structured page is still "AI slop." The audit prioritizes *material* over *structure*, which is backwards.
*   **EVIDENCE/REASONING:**
    1.  **Misdiagnosis:** The audit says "A palette does not create a composition." Correct. But it then says "generate the actual image/video material... BEFORE designing." This assumes that having good images will lead to good design. It won’t. LLMs are bad at layout. They will place the beautiful image in a generic card, with a generic heading, and a generic CTA.
    2.  **Cost vs. Value:** Image generation is expensive and slow. If the layout is bad, the user will reject the page, and the assets are wasted. The audit does not propose a *layout-first* approach.
    3.  **Missing Layout Engine:** The audit has no component for *generating* distinct layout structures. It relies on the LLM to "propose distinct design directions." But LLMs are bad at structural diversity. They tend to converge on the same 3-4 layout patterns.
*   **CONCRETE FIX:**
    1.  **Layout-First Approach:**
        *   **Step 1:** Generate 3 *structurally distinct* layout skeletons (e.g., Hero-Centered, Split-Screen, Grid-Based) using a deterministic layout generator (not LLM).
        *   **Step 2:** Populate the skeletons with *placeholder* content (lorem ipsum, generic images).
        *   **Step 3:** Critique the *structure* using the Visual Critique Agent (Finding 1).
        *   **Step 4:** Only after the structure is approved, generate the *specific* assets (Plate Forge) to fit the approved structure.
    2.  **Acceptance Test:**
        *   **Input:** A brief for a "premium marketing page."
        *   **Expected Output:** 3 layout skeletons with *different* DOM structures (e.g., one with a full-width hero, one with a split hero, one with a grid hero).
        *   **Verification:** A script checks the DOM structure of the 3 skeletons. If they are structurally similar (e.g., all have a hero, then 3 cards, then a CTA), the test fails.
        *   **Constraint:** The system must *not* generate assets until the layout is approved.

**FINDING 4: The audit’s "Domain Pack" architecture is too rigid; it will lead to fragmentation and maintenance hell.**

*   **CLAIM:** The audit proposes a "shared creative kernel" + "domain packs" (Swan, General, Classroom). This is a classic microservices anti-pattern applied to design. It will lead to code duplication, inconsistent behavior, and difficulty in sharing best practices across domains. The "kernel" will become a bottleneck, and the "packs" will diverge.
*   **EVIDENCE/REASONING:**
    1.  **Lack of Abstraction:** What is in the "kernel"? The audit says "DISCOVER → DIVERGE → CREATE MATERIALS → RENDER → VISUALLY INSPECT → CRITIQUE → REVISE → VERIFY → LEARN." This is a process, not a code module. How is this implemented? As a state machine? A set of functions? The audit does not specify.
    2.  **Domain-Specific Logic:** The "Swan" domain has specific brand rules (dark vault, crystal). The "Classroom" domain has specific rules (age-appropriate, low ink). These are not just "packs"; they are *different design systems*. Forcing them into a shared kernel will lead to conditional logic everywhere (`if domain == 'swan' then ... else ...`).
    3.  **Maintenance Burden:** Every change to the kernel (e.g., updating the Visual Critique Agent) requires testing in all domains. This is slow and error-prone.
*   **CONCRETE FIX:**
    1.  **Plugin Architecture:** Instead of "kernel + packs," use a *plugin* architecture.
        *   **Core:** A minimal engine that handles the *process* (state machine, file I/O, LLM calls).
        *   **Plugins:** Each domain (Swan, Classroom) is a plugin that provides:
            *   **Prompts:** Domain-specific prompts for ideation, critique, and revision.
            *   **Rules:** Domain-specific rules (e.g., "Swan: use dark colors," "Classroom: use light colors").
            *   **Validators:** Domain-specific validators (e.g., "Swan: check for crystal effects," "Classroom: check for age-appropriateness").
    2.  **Acceptance Test:**
        *   **Input:** A brief for a "classroom slide deck."
        *   **Expected Output:** The system loads the "Classroom" plugin, which provides prompts and rules.
        *   **Verification:** The generated output uses light colors and simple fonts.
        *   **Constraint:** The core engine must *not* contain any domain-specific logic. All domain-specific logic must be in the plugin.

**FINDING 5: The audit’s "Acceptance Benchmark" is a vanity metric; it does not measure *design quality*.**

*   **CLAIM:** The audit proposes a "12-brief blind benchmark with ≥70% blind human preference." This is a weak metric. It measures *preference*, not *quality*. A user might prefer a "pretty" page that is hard to use, or a "ugly" page that is easy to use. The audit does not define what "quality" means.
*   **EVIDENCE/REASONING:**
    1.  **Subjectivity:** "Preference" is subjective. What one user likes, another may hate. The audit does not account for this.
    2.  **Lack of Objective Metrics:** The audit does not propose any objective metrics for design quality (e.g., usability, accessibility, performance, conversion).
    3.  **Gaming the Metric:** The system can be optimized to produce "pretty" pages that score well in the benchmark but are not actually good designs.
*   **CONCRETE FIX:**
    1.  **Multi-Metric Benchmark:**
        *   **Usability:** Measure task completion time and error rate.
        *   **Accessibility:** Measure WCAG compliance.
        *   **Performance:** Measure Lighthouse score.
        *   **Aesthetics:** Measure blind human preference (but weight it lower).
    2.  **Acceptance Test:**
        *   **Input:** A brief for a "mobile workflow."
        *   **Expected Output:** A page that scores high on usability, accessibility, and performance.
        *   **Verification:** A script checks the Lighthouse score and WCAG compliance. If the score is below a threshold, the test fails.
        *   **Constraint:** The system must *not* sacrifice usability for aesthetics.

**FINDING 6: The audit ignores the *cost* and *latency* of the proposed system.**

*   **CLAIM:** The audit proposes a complex system with multiple LLM calls, image generation, and Playwright tests. This will be slow and expensive. The audit does not address cost controls or latency optimization.
*   **EVIDENCE/REASONING:**
    1.  **LLM Costs:** Each LLM call costs money. The audit proposes multiple calls per design iteration (ideation, critique, revision). This will be expensive.
    2.  **Image Generation Costs:** Image generation is expensive. The audit proposes generating a "coherent asset pack" for each design. This will be very expensive.
    3.  **Latency:** The system will be slow. The user will have to wait for multiple LLM calls, image generation, and Playwright tests. This is a poor user experience.
*   **CONCRETE FIX:**
    1.  **Cost Controls:**
        *   **Cache LLM Responses:** Cache the results of LLM calls for similar inputs.
        *   **Limit Image Generation:** Only generate images for the *final* design, not for every iteration.
        *   **Parallelize:** Run LLM calls and Playwright tests in parallel.
    2.  **Acceptance Test:**
        *   **Input:** A brief for a "premium marketing page."
        *   **Expected Output:** The system completes the design within a time limit (e.g., 5 minutes) and a cost limit (e.g., $10).
        *   **Verification:** A script measures the time and cost. If it exceeds the limit, the test fails.
        *   **Constraint:** The system must *not* exceed the cost limit.

**FINDING 7: The audit’s "Hardening" section is too generic; it does not address *drift* and *regression*.**

*   **CLAIM:** The audit proposes "determinism/reproducibility" and "drift between doctrine and runtime." But it does not specify *how* to achieve this. The system will drift over time as the LLMs change and the user’s preferences evolve.
*   **EVIDENCE/REASONING:**
    1.  **LLM Drift:** LLMs are non-deterministic. The same input may produce different outputs. The audit does not address this.
    2.  **Preference Drift:** The user’s preferences may change over time. The audit does not address how to handle this.
    3.  **Regression:** The system may regress over time as new features are added. The audit does not address how to prevent this.
*   **CONCRETE FIX:**
    1.  **Versioning:**
        *   **Version the Prompts:** Keep a history of all prompts.
        *   **Version the Taste Profile:** Keep a history of all taste profiles.
        *   **Version the Design:** Keep a history of all designs.
    2.  **Regression Testing:**
        *   **Golden Designs:** Keep a set of "golden" designs that the system must reproduce.
        *   **Regression Test:** Run the system on the golden designs and compare the output to the expected output.
    3.  **Acceptance Test:**
        *   **Input:** A "golden" design brief.
        *   **Expected Output:** The system reproduces the "golden" design.
        *   **Verification:** A script compares the output to the expected output. If it differs, the test fails.
        *   **Constraint:** The system must *not* regress.

**FINDING 8: The audit’s "Studio Surface" is too complex; it will be hard to use.**

*   **CLAIM:** The audit proposes a "Studio surface" with N-up direction preview, device toggles, element selection, screenshot-region annotation, DOM-selector annotation, tweak chips, keep-this-change-that grafting, comment-to-patch conversion, before/after round history, explicit winner/rejection/null-winner controls. This is too many features. It will be hard to learn and use.
*   **EVIDENCE/REASONING:**
    1.  **Cognitive Load:** The user will be overwhelmed by the number of options.
    2.  **Complexity:** The system will be hard to build and maintain.
    3.  **Usability:** The user will not know which features to use.
*   **CONCRETE FIX:**
    1.  **Simplify the UI:**
        *   **Focus on the Core:** Only include the core features (N-up preview, element selection, comment-to-patch).
        *   **Hide Advanced Features:** Put the advanced features (tweak chips, grafting) in a "Advanced" tab.
    2.  **Acceptance Test:**
        *   **Input:** A user who wants to change the color of a button.
        *   **Expected Output:** The user can do this in 3 clicks or less.
        *   **Verification:** A script measures the number of clicks. If it is more than 3, the test fails.
        *   **Constraint:** The system must *not* be hard to use.

**FINDING 9: The audit’s "Reference-Analysis Lane" is too vague; it does not specify *how* to extract principles.**

*   **CLAIM:** The audit proposes a "Reference-Analysis Lane" that extracts principles from URLs, screenshots, mood boards, etc. But it does not specify *how* to do this. The LLM will just generate a list of generic principles ("use good typography," "use good colors").
*   **EVIDENCE/REASONING:**
    1.  **Lack of Specificity:** The audit does not specify what "principles" means.
    2.  **Lack of Actionability:** The principles will not be actionable.
    3.  **Lack of Validation:** The audit does not specify how to validate the principles.
*   **CONCRETE FIX:**
    1.  **Structured Principle Extraction:**
        *   **Input:** A URL or screenshot.
        *   **Output:** A JSON object with specific principles:
            ```json
            {
              "typography": {
                "font_family": "Inter",
                "font_size": "16px",
                "line_height": "1.5"
              },
              "color": {
                "primary": "#000000",
                "secondary": "#FFFFFF"
              },
              "layout": {
                "grid": "12-column",
                "spacing": "24px"
              }
            }
            ```
    2.  **Acceptance Test:**
        *   **Input:** A URL to a well-designed website.
        *   **Expected Output:** A JSON object with specific typography, color, and layout principles.
        *   **Verification:** A script checks the JSON object. If it is missing any fields, the test fails.
        *   **Constraint:** The system must *not* generate generic principles.

**FINDING 10: The audit’s "Portable, Deterministic Routing" is too complex; it will be hard to maintain.**

*   **CLAIM:** The audit proposes "One canonical workflow definition generating agent-specific entrypoints." This is too complex. It will be hard to maintain and debug.
*   **EVIDENCE/REASONING:**
    1.  **Complexity:** The system will be hard to understand.
    2.  **Maintenance:** The system will be hard to update.
    3.  **Debugging:** The system will be hard to debug.
*   **CONCRETE FIX:**
    1.  **Simplify the Routing:**
        *   **Use a Simple State Machine:** Use a simple state machine to manage the workflow.
        *   **Use a Simple API:** Use a simple API to communicate with the LLM.
    2.  **Acceptance Test:**
        *   **Input:** A design brief.
        *   **Expected Output:** The system completes the design.
        *   **Verification:** A script checks the output. If it is incorrect, the test fails.
        *   **Constraint:** The system must *not* be hard to maintain.

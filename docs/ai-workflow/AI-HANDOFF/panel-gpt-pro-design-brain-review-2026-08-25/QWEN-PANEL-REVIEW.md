# Qwen Consult (LOCAL)

**Model:** `qwen3.8:27b-mtp-q4_K_M` via Ollama (5090, $0, private)
**Document:** docs/ai-workflow/AI-HANDOFF/GPT-PRO-DESIGN-BRAIN-REVIEW-PANEL-PACKET-2026-08-25.md
**Tokens (Ollama):** 10455 in / 970 out | **Wall:** 24.0s | **done_reason:** stop

---
## VERDICT
REVISE — The review correctly identifies the missing visual loop, but it proposes a machine-learning infrastructure (Bradley-Terry, active sampling) and a complex multi-file schema that is unbuildable by a solo founder in week 1, and it fails to resolve the copyright/licensing boundary for the visual comparison surface.

## BLOCKERS
1. **P0: Unbuildable "Week 1" Scope.** The review recommends a "regularized contextual Bradley–Terry model" and an "active sampler" in §1A and §3. For a solo founder with a $2-3 spend ceiling, implementing a latent utility model ($u(i,m,p) = (w_{shared} + w_{media,m} + w_{project,p})^T x_i$) before having a single UI to collect data is a P0 failure of engineering judgment. It creates a dependency on data that does not exist yet. **Fix:** Replace with a simple JSON log of A/B choices and a static "top 5 most chosen" list.
2. **P0: Copyright/License Ambiguity in Comparison Surface.** §4 Q4 asks how to handle Midlibrary images (copyrighted, cannot leave machine) vs. generated images. The review suggests "256–512px generated candidates" but does not specify *how* they are generated locally without violating the "no PII to LLMs" or "local-only" constraints if using external APIs. If using local ComfyUI, the review ignores the GPU memory overhead of loading SDXL/Flux for a "cheap" comparison. **Fix:** Explicitly mandate local-only rendering via ComfyUI for the comparison surface, or use pre-generated static assets. No external API calls for the *comparison* step.
3. **P1: Schema Drift in TasteEvent.** The `TasteEvent` schema in §3 includes `candidateA: CandidateSnapshot` and `candidateB?: CandidateSnapshot`. This is a nested object. In a JSONL append-only log, this creates massive duplication if the same candidate is compared multiple times. It also lacks a `styleId` or `srefId` field, forcing the system to re-derive the style from the prompt hash, which is brittle. **Fix:** Use `candidateAId` and `candidateBId` referencing a separate `Catalog` table/file.

## ATTACKS
- **Correctness:** The review suggests "active learning" to select comparisons. This is over-engineering. With <200 events, a random or round-robin selection of style pairs is more robust and easier to debug. The "contradiction testing" mentioned in §1A is a P2 feature, not a P0.
- **Security:** The review does not address the risk of the "grill-me" skill leaking PII into the local log. While it says "IDs only," the `note` field in `TasteEvent` is free text. **Fix:** Enforce a strict regex or length limit on `note` and sanitize it before writing to `events/<session>.jsonl`.
- **Data-truth / schema drift:** The review proposes `style-taxonomy.md` as a source of truth but also suggests a "deterministic catalog index (JSON/SQLite)." This is a dual-source-of-truth problem. If the markdown and the JSON drift, the system breaks. **Fix:** The JSON/SQLite catalog is the *only* source of truth. The markdown is generated from it.

## HIGHEST RISK
The highest risk is **Scope Creep into ML Infrastructure**. The review is seduced by the elegance of Bradley-Terry models, but Sean needs a *tool*, not a *model*. The cheapest way to de-risk this is to **strip all ML terminology from the Week 1 plan**. Week 1 is: (1) A local HTML page that displays 2 images side-by-side. (2) A button to log "A", "B", or "Both" to a JSON file. (3) A script that reads the JSON and prints the top 3 most chosen styles. That's it. No models, no sampling, no active learning.

## CONFIDENCE
I could not verify if Sean's local ComfyUI setup is currently stable enough to serve images to a local HTML page without a custom backend. I also could not verify if the "Midlibrary" images are actually licensed for local display in a dev environment. I am confident that the ML recommendation is wrong for the current stage, but I am less confident about the specific implementation details of the local image server.

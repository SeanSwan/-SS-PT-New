# Qwen Consult (LOCAL)

**Model:** `qwen3.8:27b-mtp-q4_K_M` via Ollama (5090, $0, private)
**Document:** docs/ai-workflow/brainstorms/aftertaste-voxel-game-panel-packet-2026-08-25.md
**Tokens (Ollama):** 5244 in / 1459 out | **Wall:** 26.6s | **done_reason:** stop

---
## VERDICT
REJECT — The plan is a high-fidelity architectural fantasy that ignores the immediate technical debt of the existing codebase (G7), hallucinates non-existent repo anchors (G8), and proposes a "build-vs-buy" strategy that underestimates the integration cost of local AI 3D generation versus the proven reliability of established paid pipelines for a solo developer.

## BLOCKERS
1. **P0 — Hallucinated Repo Anchor (G8):** The plan cites `world.miniature-play.voxel-realm` as a design anchor. This file does not exist on `origin/main`. The actual anchor is `pocket-worlds`. Building the "Midnight Food Court" against a non-existent schema will cause immediate integration failures and context drift. **Fix:** Re-map all lore references to `pocket-worlds` and `swanverse-game-universe-vision-2026-07-22.md`.
2. **P0 — Branch Drift Ignorance (G7):** The working branch is 443 commits ahead / 2246 behind `origin/main`. The plan assumes a stable base. Any new code written against the current dirty branch will conflict massively with the upcoming merge or be lost. **Fix:** Halt all feature development. Create a clean branch from `origin/main` for the vertical slice. The "Asset Factory" must be isolated in a separate repo or monorepo package that does not depend on the dirty app state.
3. **P1 — Unrealistic "Local AI 3D" Pipeline (G6/§5):** The plan suggests using local TRELLIS/Hunyuan3D on an RTX 5090 to replace Meshy/Rodin. While the hardware is capable, the *integration* of raw AI-generated meshes into a game-ready pipeline (retopo, UVs, rigging) is a massive manual bottleneck. For a solo dev, the time cost of fixing AI artifacts in Blender exceeds the subscription cost of a paid service that outputs clean, rigged GLBs. **Fix:** Use paid services (Meshy/Rodin) for *base* mesh generation to save time, or strictly limit local AI to *concept* generation, not final asset production. Do not build a "local AI 3D factory" as a P1 priority; it is a research project, not a production tool.
4. **P1 — R3F/React 18 Constraint Mismatch (G5):** The plan proposes R3F v8 + Rapier. While technically compatible with React 18, adding a physics engine (Rapier) to a React 18 app that is already complex (Avatar Home, etc.) creates a high-risk dependency chain. If the game grows, React 18 + R3F v8 will hit performance ceilings faster than a dedicated engine. **Fix:** Accept Route C (Godot) or a WebAssembly-based engine (e.g., PlayCanvas) for the game slice. Do not force a game engine into a React 18 dashboard.

## ATTACKS
- **Correctness:** The plan assumes "deterministic event log" for the game state. In a browser environment with variable frame rates (especially on "Potato" PCs), deterministic simulation is nearly impossible without a fixed-timestep logic loop decoupled from rendering. The plan mentions "imperative simulation layer" but does not specify the timestep strategy. **Risk:** Desync between visual state and logic state on low-end devices.
- **Security:** "Zero PII to LLMs" is stated, but the plan involves sending "asset manifests" and "provenance" to local LLMs for concept generation. If the local LLM (Qwen 3.8) is ever swapped for a cloud model (e.g., via Ollama proxy or API fallback), the manifest may contain internal IDs or structure that leaks proprietary game logic. **Fix:** Strictly sanitize all prompts sent to LLMs; use a proxy layer that strips all non-essential metadata.
- **Data-truth / Schema Drift:** The plan uses `swan.game-asset.v1` and `aftertaste.game-result.v1`. It does not define the *shape* of these contracts. The existing app uses `ClientProgress.overallLevel` (0-1000). The game plan uses "Level 1-1000" for planet unlocking. **Risk:** If the game's "level" is not strictly mapped to `ClientProgress.overallLevel`, users will experience inconsistent progression. **Fix:** Define a strict adapter layer: `GameLevel = f(ClientProgress.overallLevel)`. No independent level storage in the game.

## HIGHEST RISK
**Building a "Local AI Asset Factory" (Route A) before proving the game loop is fun.**
The Owner is distracted by the *tooling* (Blender-MCP, local AI, optimization scripts) rather than the *product* (the game). If the game loop is boring, the asset factory is a sunk cost.
**Cheapest De-risk:** **Route B (Playable-loop first).** Build a grey-box version of "Midnight Food Court" in 3 days using primitive meshes in R3F (or even a simple canvas 2D prototype). Play it. If it's not fun, kill it. If it is fun, *then* invest in the asset pipeline. Do not build the factory until you have 3 assets that you *need* to replace.

## CONFIDENCE
- **Could NOT verify:** The actual performance of `three ^0.169` with `@react-three/fiber` v8 on the specific "Potato PC" target (integrated GPU). The plan claims "30 fps floor" but provides no benchmark data.
- **Could NOT verify:** The legal status of "Mirthmouth, Ringmaster of the Banquet." While it sounds original, "Ringmaster" + "Banquet" + "Clown" is a crowded IP space (e.g., *Five Nights at Freddy's*, *Cuphead*). A trademark search is required before naming.
- **Uncertainty:** I am confident that the "Local AI 3D" pipeline is a trap for a solo dev. I am less confident about the exact performance ceiling of R3F v8 on React 18, but I am confident that a dedicated engine (Godot/WebAssembly) is safer for a "vertical slice" that may grow.

**Evidence needed to settle:**
1. A 30-second video of the grey-box loop (Route B) to judge fun factor.
2. A benchmark report of `three ^0.169` + R3F v8 on an Intel UHD 620 (or similar iGPU) with 50 instanced enemies.
3. A trademark search for "Mirthmouth" and "Banquet Ringmaster."

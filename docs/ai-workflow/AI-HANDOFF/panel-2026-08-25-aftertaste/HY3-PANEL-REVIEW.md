# PANEL PACKET — Project Aftertaste + Asset Factory (2026-08-25) — reviewed by HY3 (tencent/hy3)

**Reviewer:** `tencent/hy3` (high)
**Document:** docs/ai-workflow/brainstorms/aftertaste-voxel-game-panel-packet-2026-08-25.md
**Seed:** (none)
**Tokens:** 5248 in / 6611 out | **Cost:** ~$0.0042 | **Wall:** 122.9s | **finish_reason:** stop

---

> **⚠ VOID PREMISE — READ BEFORE THIS REVIEW.** The packet this seat reviewed contained a FALSE grounding row (G8): it asserted `world.miniature-play.voxel-realm` did not exist and that the plan citing it had hallucinated a repo anchor. **The entry exists** — `docs/ai-workflow/design-brain/worlds.md` entry 16 of 18, carried in the frozen expected-ID list in `scripts/ai-workflow/world-engine-catalog-validation.mjs`. The verifying grep was `head -8`-capped over an 18-entry file. **Any finding below that rests on the hallucinated-anchor claim is VOID.** The seat reasoned correctly from inputs it could not audit; the failure was upstream. All other findings stand. Corrected analysis: `docs/ai-workflow/brainstorms/aftertaste-swanverse-game-blueprint-2026-08-25.md` §CORRECTION. Body below is verbatim and unedited.

---


## VERDICT
REVISE — the prior plan is anchored on a hallucinated repo entry (G8) and ignores verified Swanverse lore and quality vocabulary, so it must be re-grounded against origin/main + lore docs before any asset or code work.

## BLOCKERS
1. **P0** — Hallucinated repo anchor. Inputs: blueprint extends `world.miniature-play.voxel-realm`. State: that entry does not exist on origin/main. Wrong output: build/runtime error or silent fallback to wrong world container when code references missing config. Evidence: `origin/main:docs/ai-workflow/design-brain/worlds.md` L204–224 (only `tiny-metropolis` and `pocket-worlds` present).
2. **P0** — Lore mismatch / cosmology drift. Inputs: MVP scoped as standalone "Midnight Food Court" (§3.3). State: G1 proves Project Aftertaste must be a negative-energy Swanverse world redeemed by the champion. Wrong output: assets, progression, and narrative built without required link → later reskin breaks avatar-tier contracts and wastes proof assets. Evidence: `docs/ai-workflow/brainstorms/swanverse-game-universe-vision-2026-07-22.md` (local branch only, cited G1).
3. **P1** — Quality-tier vocabulary drift. Inputs: plan §3.8 invents Ultra/High/Medium/Low/Potato ladder. State: repo mandated Full/Lean/Still (+Lite) per G3. Wrong output: settings UI reads undefined enum → undefined behavior, wrong fallback tier, or crash on quality switch. Evidence: `swanstudios-rpg-game-2026-06-13.md` §Key Highlights (Crystal Ring quality modes).
4. **P1** — Missing local tooling. Inputs: §3.10 asset workflow calls MagicaVoxel → Blender → gltf-transform. State: G6 `where` probe shows none installed (only ffmpeg/Python/Node/Ollama). Wrong output: pipeline fails at step one; zero proof assets produced. Evidence: G6 tooling probe.
5. **P2** — Branch state drift. Inputs: blueprint written against local working branch. State: 443 ahead / 2246 behind origin/main (G7). Wrong output: referenced file paths may be stale or absent on origin/main → broken imports on merge. Evidence: G7 drift-check hook.
6. **P2** — Binding frontend house rules not mandated. Inputs: §3.7 states "React owns menus/HUD/settings/a11y/app bridge" but specifies no styled-components, Victory, Crystalline Swan CSS-var palette, 44px targets, dark-first, WCAG 4.5:1, or <=300 lines/file. State: house rules are non-negotiable. Wrong output: future game UI code will violate rules by default. Evidence: §3.7 architecture paragraph (no rule citation).

## ATTACKS
- **Correctness**
  - Happy-path-only: §3.2 core loop assumes cleanse→boss→win; no player-death, save-corruption, or partial-cleanse recovery path defined.
  - Null/undefined: §3.7 signed reward receipts (`swan.training-reward.v1` / `aftertaste.game-result.v1`); if signature missing/null, handling unspecified → silent drop or crash.
  - Stale state: §3.8 quality selection by frame-time + user override; persisted override using old vocab maps to nonexistent tier after G3 alignment.
  - Race conditions: §3.7 imperative sim layer outside React; HUD reading mutable enemy/wave state via ref without sync may read half-updated director state.
  - Off-by-one: §3.3 "3 waves + boss" vs §3.2 "cleanse 3 nests → boss"; wave director could spawn boss before nests cleared if counts mismatched.
  - Unhandled error paths: §3.10 Blender-MCP generated Python; no described catch/rollback if agent script throws → corrupted .blend on only copy.

- **Security**
  - Authn/authz/IDOR: §3.7 opaque IDs + signed receipts; if verification not enforced, forged `aftertaste.game-result.v1` could credit app cosmetics/loot to arbitrary user ID.
  - Injection: §3.10 Blender-MCP executes LLM-generated Python locally; untrusted asset names/prompts could embed code execution.
  - Replay/idempotency: §3.7 claims "signed idempotent reward receipts" but no nonce/expiry described → replay doubles cosmetics.
  - Multi-tenant scope leaks: P3 opt-in preview integration; no mention of scoping saved zone by user ID → IDOR load of another user's local save.
  - Secret handling: §5 local Qwen 3.8 via Ollama; no note on binding to localhost only → potential LAN exposure of model API.

- **Data-truth / schema drift**
  - Model column vs caller field: §3.9 manifest `swan.game-asset.v1` provenance fields vs existing `CompanionPetService.mjs` (5 species × 6 stages) field names not mapped.
  - PascalCase-vs-snake_case: `ClientProgress.overallLevel` (camel, G2) vs receipt/topic names snake_case (`swan.training-reward.v1`) → serializer drift.
  - FK target drift: game avatar tiers (Bronze Forge…Crystalline Swan, G2) must map to DB tier IDs; no contract shown.
  - Frontend response-shape drift: §3.7 R3F scene emits events to React HUD; no defined schema → shape mismatch breaks HUD.

## HIGHEST RISK
The most dangerous item is **Blockers 1+2: building the entire asset factory and MVP on a hallucinated world anchor while ignoring the verified Swanverse redemption cosmology**. Cheapest de-risk before ship: spend ~2 hours authoring an explicit `pocket-worlds` child entry (or new `voxel-realm` doc) that binds "Midnight Food Court" as a fallen pocket-world, write a one-page cosmology+progression contract, and get Owner sign-off via the existing `story` interviewer skill. This costs almost nothing and prevents wholesale asset/reskin rework.

## CONFIDENCE
I could NOT verify from the document alone: the actual text of the Swanverse lore doc (only a summary is provided); whether `frontend/package.json` truly lacks R3F/drei/rapier (claim only); real-world performance/quality of local TRELLIS/Hunyuan3D on the RTX 5090 32 GB; whether repo quality modes are exactly Full/Lean/Still or have extra tiers; whether the §3.5 IP matrix is legally sufficient; whether Blender-MCP can run safely on Owner hardware without network exposure. Evidence that would settle it: direct read of `docs/ai-workflow/design-brain/worlds.md` L204–224, the lore md, and `origin/main:frontend/package.json`; a timed benchmark exporting one proof asset via local image→3D + Blender; and a human legal review of §3.5. I am explicitly uncertain about Route A ROI without proving local 3D-gen quality — my judgment assumes the G1–G9 summaries are factual but I have not seen raw files.

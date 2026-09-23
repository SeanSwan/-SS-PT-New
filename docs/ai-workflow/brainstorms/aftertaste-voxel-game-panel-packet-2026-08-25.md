---
decision: "Hostile-review packet — Swan Studios game universe (Project Aftertaste vertical slice) + AI-assisted voxel asset factory workflow"
status: open
supersedes: none
privacy: IDs/roles only. "Owner" = the human product owner. No client data, no credentials.
---

> **⚠ CORRECTED AFTER THE PANEL RAN (2026-08-25).** Row **G8 below is WRONG.** `world.miniature-play.voxel-realm` **does exist** — entry 16 of 18 in `docs/ai-workflow/design-brain/worlds.md` on `origin/main` (L229), validated by `scripts/ai-workflow/world-engine-catalog-validation.mjs`. The verifying grep was `head -8`-capped and never reached it. All five seats received G8 as fact and four made it a P0 blocker; those blockers are void. Every other G-row was verified independently and stands. Corrected analysis: `aftertaste-swanverse-game-blueprint-2026-08-25.md` §CORRECTION. This packet is kept UNEDITED below as the record of what the seats were actually sent.

# PANEL PACKET — Project Aftertaste + Asset Factory (2026-08-25)

## 0. Your remit (every seat)

You are a hostile reviewer. The Owner wants to build (a) an original round-based survival browser game where the enemies are contamination/junk-food/insect horrors, (b) a repeatable AI-assisted voxel/Blender asset pipeline that also feeds the main SwanStudios app, and (c) a path from a tiny browser slice to a standalone RPG/life-sim. A prior model already produced a plan (§3). Your job:

1. **Break the plan.** Wrong assumptions, missing decisions, sequencing errors, legal/health-language exposure, performance traps, cost traps.
2. **What the prior reviewer missed** — and what the *repo grounding in §2* changes about the plan. §2 contains facts the prior plan did not have.
3. **Route decision:** of the three routes in §4, which do you pick and why? Name what you'd cut from the MVP.
4. **Build-vs-buy:** for every third-party tool/service the plan implies (§5), say whether an in-house script on the Owner's hardware (RTX 5090, 32 GB VRAM, local Qwen 3.8 via Ollama, Python 3.12, Node, ffmpeg) beats paying — and name the tool to build.
5. **Upgrades/ideas** the Owner hasn't thought of, ranked by leverage. No scope for its own sake — must serve: coaching, adherence, progress proof, community, revenue, trust (the app's core loop), or the game's originality/performance.
6. **Art direction:** the "one level above Minecraft" question — critique "Microvoxel Diorama Horror" (§3.6). Is the macro-form + selective-microvoxel + baked-detail hybrid right, or is there a better answer (e.g. voxel-authored → remeshed/beveled low-poly, SDF/marching-cubes, or 2.5D)?
7. **Workflow to teach:** what the Owner must install and in what order, what can be automated by scripts, and what must stay human taste.

Output format (mandatory): `## Verdict` (APPROVE / REVISE / REJECT for the plan as a whole) · `## Top findings` (numbered, severity-tagged, each with the specific §-reference you're attacking and a concrete fix) · `## Route pick` · `## Build-vs-buy table` · `## Upgrades` · `## What I could not verify`. Be specific. Don't restate the plan back.

## 1. What the Owner asked for (reconstructed intent)

- A **first small mini-game** inside SwanStudios that can grow into a real game one day; separate repo/deploy eventually because it "will get too big."
- Enemies: junk/heart-attack foods as zombies (fries, pizza, burgers, fried chicken, shakes), plus maggots, flies, roaches, bacteria — the things that eat leftovers.
- Bosses: "knock-off" fast-food mascots (a clown that force-feeds burgers/sugar). *The prior plan correctly converts these to fully original archetypes — see §3.5.*
- Debuffs from bad food (fictional: sugar crash, grease drag…), counters from real healthy food + water + movement; **working out levels the avatar**.
- Every user has their **own avatar** (already the app's "You, crystallized" champion); Sims-like world-building later; RPG later.
- Art: voxel, but "the next level up" — smaller blocks than Minecraft for more realism, beautiful on potato PCs, decent PCs, and powerful PCs.
- Workflow: Claude Code / Codex driving Blender (Blender-MCP style) to create **the Owner's own assets** for the app AND the game — this is where the whole request started.
- Deliverables wanted: blueprint, wireframes, flowchart, mermaid, tool list, install list, learning path (YouTube), and a hostile review by this panel.

## 2. Repo grounding the prior plan did NOT have (verified 2026-08-25)

| # | Fact | Evidence | Why it matters |
|---|---|---|---|
| G1 | **A master game-universe lore doc already exists** — "The Swanverse" (2026-07-22): God-made infinite universe; good planets (super-Earth, rainforest, glacier, angel, benevolent robot) vs negative-energy planets (demon, hell-world, mutant-alien); the player is a chosen one who earns the right to travel by training on Earth first; mission = destroy abominations and **turn dark planets benevolent**; leveling (1–1000) literally builds/unlocks planets; Sims build-mode with photo-to-3D room import; a `story` interviewer skill exists to grow the lore. | `docs/ai-workflow/brainstorms/swanverse-game-universe-vision-2026-07-22.md` (local branch only — NOT on origin/main, so the prior model's GitHub audit could not see it) | **Project Aftertaste is not a new universe. It must be the first "negative-energy world" the champion redeems** — a contaminated Earth-tier zone. The "cleanse nests → boss → zone turns clean" loop already matches the redemption mechanic. Panel: is "Midnight Food Court" the right first world, or should it be framed as a planet/pocket-world from day one? |
| G2 | Existing built systems to REUSE (rule: no competing silo): avatar tiers Bronze Forge → Silver Edge → Titanium Core → Obsidian Warrior → Crystalline Swan; Companion Pets `CompanionPetService.mjs` 5 species × 6 stages; Aegis HUD 5-needs bars; Vault loot 5 rarities; 5 job classes; `ClientProgress.overallLevel` 0–1000; a shipped animated **Crystal Ring** level indicator (Full/Lean/Still quality modes). | `swanstudios-rpg-game-2026-06-13.md` §Key Highlights; `swan-badge-companion-progression-2026-07-22.md` | The game's progression, pets, loot rarity, and quality-mode vocabulary already exist. The plan's "one canonical progression" law is right; the packet must name these as the canonical objects. |
| G3 | **Standing quality mandate (Owner, 2026-07-22):** highest visual quality is the ante AND it must scale to potato PCs — tiers Ultra/High/Medium/Low/Potato from day one; guaranteed working simpler experience on the worst device; existing pattern = ring's Full/Lean/Still + reduced-motion + 2D `MinimalistView` fallback. | same docs | Plan's 5-mode ladder is aligned; naming should collapse to the repo's Full/Lean/Still (+Lite) rather than invent a parallel vocabulary. |
| G4 | **Business verdict on record: DEFER (bank, don't kill)** — revisit when ≥ ~50 weekly-active users AND chart/KPI truthfulness work is complete. Timing labelled "post-December 2026". | `swanstudios-rpg-game-ceo-2026-06-14.md` | Production integration is gated. Asset-factory proof + isolated prototype are NOT gated. Panel: does an asset factory that ALSO produces app assets (badges, companions, hero visuals) change the ROI math enough to justify starting now? |
| G5 | Frontend: React 18.2, `three ^0.169` present; **no** `@react-three/fiber`, `drei`, or `rapier`. `AvatarHome/HomeWorld.tsx` is a styled-components room card (no 3D). | `origin/main:frontend/package.json`, `HomeWorld.tsx` | Confirmed externally: R3F v8 ↔ React 18; R3F v9 needs React 19; rapier v1 ↔ R3F 8. Do NOT upgrade React for the game. |
| G6 | Local tooling: **Blender, MagicaVoxel, Godot, gltf-transform NOT installed.** Present: ffmpeg 8.1, Python 3.12, Node, RTX 5090 (32 GB), local Qwen 3.8 (Ollama). | `where` probe | The 5090 can run local image→3D (TRELLIS / Hunyuan3D-class) and local LLM concept passes for $0 — build-vs-buy vs Meshy/Rodin subscriptions. |
| G7 | Branch state: working branch is 443 ahead / 2246 behind `origin/main`. | drift-check hook | Any blueprint must be written against origin/main + the two lore docs; assume file paths drift. |
| G8 | The prior plan cited a design-brain world entry `world.miniature-play.voxel-realm`. **It does not exist on origin/main.** The Miniature & Play family has only `tiny-metropolis` and `pocket-worlds` (floating micro-diorama islands, "each island carries one idea completely"). | `origin/main:docs/ai-workflow/design-brain/worlds.md` L204–224 | The prior reviewer hallucinated a repo anchor. The real nearest anchor is **Pocket Worlds** — which fits G1 (planets/pocket-worlds) far better than a food court. A voxel-realm entry would have to be AUTHORED, not extended. |
| G9 | Paid-model discipline: cumulative spend caps ($1/call, $3/topic, $5/day); cheap seats first; Fable once at the end as arbiter. | `.claude/skills/spend-guard` | This panel is round 1; there is no budget for a second paid round — put everything in this pass. |

## 3. The prior plan (condensed — attack it)

### 3.1 Product model
Two layers, one canonical player: **Layer A — Swan Life RPG / Avatar Home** (calm, Sims-like, needs, rooms, pets, cosmetics, coach quests) and **Layer B — Project Aftertaste** (round-based survival, single-player first). Law: *app and game share identity + content contracts, not necessarily the same renderer or codebase.*

### 3.2 Core loop
Enter zone → survive escalating waves → cleanse 3 contamination nests → boss → zone cleansed → rewards (cosmetics, build materials to Avatar Home). Status conditions (fictional): Sugar Crash, Grease Drag, Salt Lock, Gut Static, Contamination, Fatigue, Dehydration. Counters: Water Flask, Fiber Pack, Greens Charge, Sweet-Potato Ration, Recovery Meal, Movement Burst (in-game exercise station), Clean Plate. Healthy items are game counters, never disease cures.

### 3.3 MVP scope ("Midnight Food Court")
One map (central court, kitchen corridors, storage, cleaning station, loading-dock extraction). Enemies: Frylings (swarm), Patty Larvae (armored, spawns on break), Crumb Roaches (flank/ambush), Grease Flies (instanced, vision denial). Elite: Pizza Husk. Boss: **Mirthmouth, Ringmaster of the Banquet** (original; attacks: Banquet Barrage, Sugar Flood, Grease Ring, Open Wide, Last Call). 3 waves + boss, 2 tools, 4 statuses, 4 counters, 5–10 min session, KB/M + gamepad, local save. NO multiplayer, store, battle pass, open world, UGC, or production integration.

### 3.4 Health/ethics
Villains = contamination, decay, excess, manipulation, neglect — never body size. No medical diagnoses as arcade jokes. Preserve existing Avatar-Mirror guardrail (progress affects radiance/posture/gear/vitality, not forced body-fat morphing).

### 3.5 Legal
"Call of Duty Zombies" = internal inspiration only; no perks/HUD/round sounds/terminology. No knockoff mascots — bosses from broad archetypes (banquet ringmaster, syrup prophet, grease monarch, dough regent). IP separation matrix per character (name, silhouette, palette, costume, props, voice, catchphrase, story function, commercial comparisons). Trademark clearance before title/marketing; human legal review before commercialization. Codename "Project Aftertaste" pending clearance.

### 3.6 Art direction — "Microvoxel Diorama Horror"
Not literally smaller cubes (geometry/draw-call/collision explosion). Hybrid: **Layer 1 macro form** (low-poly / voxel-derived mesh, clean silhouette, shared skeletons, simple collision proxy) · **Layer 2 selective microvoxel detail** only where it buys identity (crumbs, salt, mold, insect segments, cheese tears, boss face) · **Layer 3 baked detail** (normal/AO/roughness/emissive/vertex color into atlases). Rules: beveled edges, asymmetry, irregular voxel sizes, tactile roughness, restricted palette, crystalline Swan accents reserved for player/cleansed areas/rewards, contamination = dirty amber/sick green/old grease/bruised red. Every asset ships LOD0/1/2 + impostor + collision + still fallback + stable semantic ID.

### 3.7 Architecture
React 18 + three + R3F 8 + drei + rapier 1 (if physics) + TS. **Imperative simulation layer outside React** (player/enemy state, wave director, combat, statuses, physics, pools, deterministic event log); React owns menus/HUD/settings/a11y/app bridge; R3F owns scene/lights/models/mixers/VFX/audio. Lazy-loaded game boundary; a WebGL failure must not crash the dashboard. GLB runtime; KTX2/Meshopt/Draco after measuring; instancing + pooling + LOD + dynamic resolution + baked lighting. App↔game firewall: opaque IDs, signed idempotent reward receipts (`swan.training-reward.v1` in, `aftertaste.game-result.v1` out); game never becomes a second source of truth for workout levels; playable without recent workouts.

### 3.8 Quality ladder
Still/Accessible · Lite/Potato (30 fps floor, dynamic res, baked light) · Lean/Balanced (60 fps) · Full · Cinematic Capture. Selection by observed frame-time with hysteresis + user override; initial scene ~10–20 MB compressed (hypothesis).

### 3.9 Roadmap
P0 canonical preproduction (vision, IP bible, art sheet, taxonomy, health-language guardrails, data boundary, manifest schema, perf matrix) → P1 asset-factory proof (1 player proxy, 1 Fryling, 1 Patty Larva, 1 boss bust, 1 tile set, 1 tool, 1 VFX family) → P2 isolated vertical slice → P3 app preview integration (flag, opt-in, test accounts) → P4 standalone web game (separate deploy, shared identity/assets) → P5 life-RPG/world-building → P6 native/high-end engine decision (Godot/Unity/Unreal; portable = Blender sources, GLBs, clips, skeletons, materials, lore, IDs, balance data — not browser gameplay code).

### 3.10 Asset workflow
MagicaVoxel (silhouettes, palette, blockouts) → Blender (canonical source: cleanup, retopo, bevel, UV, bake, rig, animate, collision, LOD, GLB) → deterministic optimizer (gltf-transform: prune/dedup/resize/KTX2/meshopt, validate, hash). Asset manifest `swan.game-asset.v1` with source, runtime LODs, skeleton, clips, provenance (human owner, AI systems, references, license, prompt receipt, sha256), clearance flags, budgets. Blender-MCP treated as **local code execution**: work on copies, checkpoint before every agent pass, review generated Python, no secrets in Blender, restricted network, one writer per asset, re-validate exported GLBs in a clean scene.

### 3.11 Multi-AI studio
Human owner final; Fable = vision/architecture/arbitration; Kimi + Opus = visual concepts; GLM = systems decomposition; Grok = originality/tone/hostile concept challenge; Codex = technical hostile review; Claude Code = everyday build + Blender iteration; one controlled Blender worker; deterministic validators = truth. **One-writer law** per file/asset/table.

### 3.12 Learning path (YouTube, ranked by relevance)
Wawa Sensei (Sims-style R3F series; avatar builder; Blender→Three baking; R3F mini-game VFX; 3D world in React) · Joey Carlino (Rig MagicaVoxel characters in Blender; animation for impatient people; rigging for beginners) · Max Novak (Claude + Blender MCP) · SimonDev (browser-game architecture) · Wael Yasmina (Three.js basics) · TutsByKai (voxel/pixel art in Blender 4.4). Order: raw Three → R3F world → voxel export/cleanup → rig/animate → bake/optimize → avatar builder → mini-game VFX → Sims rooms → Blender MCP → perf.

## 4. Three routes — pick one

- **Route A — Asset factory first (recommended by the prior plan).** P0 + P1 only for ~2–3 weeks: stand up Blender + MCP + optimizer + manifest + validators; produce the 7 proof assets; ALSO use the same factory for app assets (badge frames, companion pets, hero visuals) so the investment pays even while the game stays deferred.
- **Route B — Playable-loop first.** Skip art quality; grey-box the food court in R3F with primitive meshes; prove the wave/cleanse/boss loop is fun in 5–10 minutes; only then invest in assets.
- **Route C — Engine-first (Godot 4 web export).** Accept a second runtime now; use Blender→glTF→Godot; embed via iframe; trade React integration for a real game engine (GDScript, physics, navmesh, LOD built-in) and avoid an inevitable P6 rewrite.

## 5. Build-vs-buy candidates (critique and extend)

| Need | Pay | In-house alternative on Owner hardware |
|---|---|---|
| Text/image → 3D base meshes | Meshy / Rodin / Luma subscription | Local TRELLIS / Hunyuan3D on the 5090 (batch script, provenance hash) |
| Concept variants / enemy taxonomy expansion | paid LLM calls | Local Qwen 3.8 for first-pass variants; paid seat only for the cut |
| Voxel authoring | MagicaVoxel (free) / Blockbench (free) | keep free; write a `.vox → beveled mesh` remesher in Blender Python |
| Rigging | Mixamo (free, non-voxel-friendly) / AccuRIG | Shared Swan skeletons + Rigify presets script |
| GLB optimization | none needed | `gltf-transform` CLI in an npm script + budget validator |
| Asset validator / manifest gate | none | Node script: tri-count, texture MB, clip names, ID uniqueness, provenance completeness, sha256 |
| IP-similarity gate | lawyer only at commercialization | Checklist script + panel prompt per character; lawyer at title/marketing |
| Perf lab | none | Playwright harness that boots the scene at 3 quality tiers and records frame-time percentiles + heap |
| Tutorial ingestion | none | existing `swan-scout` yt transcript MCP → per-video notes |
| Screenshot/turntable renders for design review | none | Blender headless render script → contact sheets |
| Blender automation | Blender-MCP (free, OSS) | same, wrapped with checkpoint/save-copy/script-log guard |

## 6. Specific questions the panel must answer

1. Given G1, should the **zone be re-skinned as a "fallen world" in the Swanverse cosmology** now (cheap), or kept as a plain food court until the `story` skill defines planets? What breaks if we choose wrong?
2. Does the **workout → game bridge** ("work out to level up") risk locking the game behind real exercise for users who haven't trained — and what's the minimum ethical design (bonus not gate)?
3. Are the **fictional statuses** (Sugar Crash etc.) safe from a health-claims standpoint, or does "Grease Drag" still read as fat-shaming to a hostile reader? Rename anything that fails.
4. Is **R3F-in-the-app** (Route A/B) a trap once the game needs navmesh, animation blending, and physics? At what feature does the browser+React path stop being cheaper than Godot?
5. **Asset budget reality:** for Lite mode on an integrated-GPU laptop, give a concrete per-scene budget (tris, draw calls, texture MB, instanced enemies on screen) the plan should adopt instead of "TBD".
6. What is the **smallest deliverable that proves the asset factory works** — the prior plan says 7 assets; is that too many for proof?
7. Which **third-party tool subscriptions are worth paying for anyway** (time saved > cost) — be honest.
8. What **automation/tool** should the Owner build first that has the highest compounding value across app + game?

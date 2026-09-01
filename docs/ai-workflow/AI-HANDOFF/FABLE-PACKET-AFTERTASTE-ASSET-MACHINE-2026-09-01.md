---
decision: "Fable packet — hostile review of Project Aftertaste's asset machine + game path, and the worker-bot-executable plan that follows it"
status: open
supersedes: none (extends aftertaste-swanverse-game-blueprint-2026-08-25.md and AFTERTASTE-SESSION-HANDOFF-2026-08-26.md)
linear: SWA-211 (parent SWA-60)
privacy: IDs/roles only. No PII, no secrets, no credentials.
---

# FABLE PACKET — Project Aftertaste: the asset machine, and the game it feeds

**Prepared by:** Opus 5 (Fable-tier), 2026-09-01 · **For:** Fable 5, hand-driven by Sean
**Seat rule:** Fable is REVIEW-AND-BLUEPRINT ONLY. This packet is not a build authorization.

---

## 0. What Sean is asking Fable to do

Two jobs, in order.

**Job 1 — HOSTILE REVIEW.** Attack everything in sections 2–6. Assume the plan is wrong and find
where. Specifically wanted: *what is missing that should exist*, ranked by value and by money/time
left on the table (absence-first, not just defect-first).

**Job 2 — THE PLAN.** Produce a plan so complete that a **lower-tier worker-bot executes it with
ZERO further questions**. Sean's words: *"I want it so that agent does not have to make any
decisions … the details and instructions … are gonna be so comprehensive, they just need to just
do it."* If a worker-bot would have to ask Fable anything, the plan is incomplete.

### Required output contract — ALL ELEVEN parts, per workstream

1. **Vision statement** — what it is, where it sits (parent vs child surface), why it matters.
2. **Grounded current state** — real `file:line`. Section 3 below seeds it; extend, don't restate.
3. **Desired end state** — elevated: spectacularly beautiful, maximally easy, fewest clicks.
4. **Gap analysis** — absence-first, ranked by value left on the table.
5. **Mermaid diagrams** — architecture/flow + data-flow, and a state machine wherever modes exist.
6. **Wireframes** — desktop AND mobile, for EVERY state (loading / empty / populated / error).
   ASCII or precise structured description.
7. **Data & API contract** — every field (type + nullability), every endpoint (method, path, auth
   role, request/response), every drift risk.
8. **Component breakdown** — exact files to create/modify, each under 300 lines, blueprint header.
9. **Slice plan** — numbered, independently shippable. Each slice: goal, files touched,
   failing-test-first, acceptance criteria, hostile-review checklist, responsive-matrix targets,
   rollback step.
10. **Uniformity/consolidation note** — which competing/legacy/dormant surfaces this retires, with
    grep + mount evidence they are safe to retire.
11. **Hermes Learning hook** — one paragraph: what Hermes should learn from this.

Responsive matrix: `320 · 375 · 414 · 768 · 1024 · 1280 · 1440 · 1920 · 2560x1440 · 3840x2160 · 3440`.

---

## 1. What Project Aftertaste is

A **voxel zombie-survival game** — a SwanStudios take on Call of Duty Zombies where the monsters are
junk food, decay organisms, parasites, deep-ocean horrors and parasitic robots. It is the first
**contamination pocket-world** of the Swanverse: a fallen Earth-tier shard the champion redeems. The
food court is its first *zone skin*, not its identity.

It inherits design-brain world `world.miniature-play.voxel-realm` (entry 16 of 18 in
`docs/ai-workflow/design-brain/worlds.md`). **Voxel is the AUTHORING dialect, not the runtime** —
creatures are authored as small integer cell-grids (4–40 occupied cells), then remeshed, bevelled,
decimated to an LOD ladder, and atlas-baked. Nothing ships raw voxels.

**Engine: React Three Fiber** (WebGL, in-browser). Godot deferred to P6 behind named tripwires:
more than 30 pathfinding agents, animation state machines past ~4 layers, ragdoll/stacked physics,
rollback networking, or a second walkable interior.

---

## 2. LAWS THAT CANNOT BE VIOLATED (any plan breaking one is rejected)

| # | Law | Consequence |
|---|---|---|
| L1 | **Law B — Licensed Departure.** No Swan-branded surface may wear Voxel-Realm chrome. | The standalone build wears Law B; any in-dashboard embed must render Law A (Crystalline Swan). This makes standalone deploy the natural home. |
| L2 | **The game never writes `overallLevel`.** Game XP is in-session only. | One enum `full \| lean \| lite \| still`. Mapping table + tests at 0 and 1000. |
| L3 | **Combat power and zone completion are 100% in-session.** Verified training grants **souvenirs** (cosmetics), never power. | "Missing receipt equals full game, fewer souvenirs." Decay-free. No gameplay gates proof or action. |
| L4 | **Debuffs are named for the environment/material, never the body.** | Health-language landmine; a hostile reader must not be able to read fat-shaming. |
| L5 | **Asset IDs come from one registry.** Validator rejects unregistered IDs. | `assets/registry.json`, modelled on `world-engine-catalog-validation.mjs`. |
| L6 | **Provenance required**: generator/model/version, seed, licences, SHA-256, similarity review excluding protected game assets, characters, UI, audio, trademarks, real likeness. | Inherited from Voxel Realm DNA. |
| L7 | **Banned likeness:** Minecraft likeness, branded blocks, loot-box visuals, plastic toy shine, readable fake UI text, logos, retired Galaxy-Swan tones. | Anti-cheese: the world "fails fastest when block fonts, loot sparkle, achievements and a copied sandbox look turn evidence into gamification sludge." |
| L8 | **Pay for nothing this phase.** | Meshy/Rodin/Luma/Mixamo/courses: no. One month of Meshy pre-authorised ONLY if local TRELLIS/Hunyuan3D fails to produce a usable base mesh in 3 engineer-days. |

---

## 3. GROUNDED CURRENT STATE (verified 2026-09-01, not remembered)

### 3.1 The asset factory — EXISTS and is CI-gated

| Component | Path | Size | State |
|---|---|---|---|
| Roster to voxel blockout | `tools/blender/roster-to-obj.py` | 230 ln | works; `--mirror-break` is REQUIRED (off/on0/on1) |
| Headless Blender pipe | `tools/blender/swan_pipe.py` | 311 ln | weld, dissolve, bevel, smooth, UV, LOD ladder, convex hull, Workbench still, manifest stub |
| Bounded wrapper | `scripts/assets/run-blender.mjs` | 111 ln | fail-closed: version compare, `--out` required, run-bound UUID receipt, 30-min timeout |
| The gate | `scripts/assets/validate-asset.mjs` | 154 ln | lifecycle-aware required clips; rejects unregistered IDs |
| GLB spec validation | `tools/asset-pipeline/validate-gltf.mjs` | — | Khronos validator + glTF-Transform 4.4.2, exact-pinned |
| Roster grammar | `tools/blender/roster_grammar_selftest.py` | — | 53 checks |

**Chain:** authored roster `.md` → `roster-to-obj.py` → `run-blender.mjs` + `swan_pipe.py` →
hand-authored `manifest.json` → `validate-asset.mjs`.

**CI:** `.github/workflows/aftertaste-asset-gate.yml` — as of 2026-09-01 it runs on `codex/**` and
`claude/**` (it was `main`-only and had **never executed**), actions are SHA-pinned, and it passed
green on GitHub, 9/9 steps, 42s.

### 3.2 Assets — 5 registered, 4 creature manifests, ALL `planned`

`assets/registry.json` holds 5 IDs: `enemy.fryling`, `enemy.patty-larva`, `enemy.grease-fly`,
`enemy.drip-cyst`, `app.companion-stage.frost-swan.s1`.

**Every creature manifest is `status: planned` with `clips: 0`.** 16 runtime GLBs exist and pass
Khronos with zero spec errors; three carry warnings (Fryling, Grease Fly, Patty Larva).

**Fryling — the 1+1 proof subject — is missing all four authored clips** (`move`, `attack`, `hit`,
`death`). This is the live blocker on the entire Route A-prime proof.

### 3.3 Tooling installed (verified, hash-checked where noted)

Blender **4.5.13 LTS** · glTF-Transform **4.4.2** · KTX-Software **4.4.2** (`toktx`) ·
Blockbench **5.1.6** portable (SHA-256 verified) · Node/Python toolchain.
ComfyUI 0.34.2 + MiniMax H3 (video) and SeedVR2/RIFE (upscale) exist but are a **separate lane** —
marketing/cinematic video, not game assets. Do not conflate the two.

### 3.4 Install ladder — what is NOT done

| Step | Item | State |
|---|---|---|
| **0** | **Ollama firewall fix — marked FIX NOW** | **STILL OPEN. Both `ollama.exe` inbound rules are ENABLED on the Public profile (any port, any remote).** On public Wi-Fi anyone can drive the 5090. Fix script exists at `c:\tmp\ollama-firewall-fix.ps1` (disables, never deletes; tests WSL reach; auto-reverts). Needs Administrator. |
| 5 | `packages/aftertaste` R3F app | **DOES NOT EXIST.** `packages/` contains only `swan-forge`. **There is no game yet.** |
| 6 | `dependency-cruiser` sim-purity rule | not done |
| 7 | Hunyuan3D-2.1 / TRELLIS local text-to-3D | not done (deliberately later) |
| 8 | blender-mcp | not done (correctly last — see section 4) |
| — | MagicaVoxel 0.99.7 | not found (Blockbench present as the GLB-native alternative) |

### 3.5 Branch reality

Asset work lives on `claude/aftertaste-p0-20260825` (PR #84). The hardening branch
`codex/aftertaste-hardening-20260830` is **36 ahead / 31 behind `origin/main`** and is NOT
merge-ready without a deliberate sync. Fable must plan the sync, not assume it.

---

## 4. NEW RESEARCH — Blender MCP (the decision Sean asked about)

Sean's ask: *"I wanted to do it at MCP via Blender. The most powerful way I could, having Claude and
agents build my assets."* The panel already ruled this **C5: "Blender-MCP is local RCE"** and placed
it LAST in the install order. New research (2026-09-01) confirms C5 and adds a finding the panel did
not have.

**The project:** `ahujasid/blender-mcp` — 26.6k stars, PyPI 1.9.0, last commit 2026-08-30, actively
maintained. Declares Blender 3.0+, no upper cap; 4.5 works (the two 4.5 issues are transport, not API).

**Finding A — unrestricted RCE, confirmed in source.** `addon.py` does
`namespace = {"bpy": bpy}; exec(code, namespace)`. No sandbox, no allowlist, no confirmation.
Passing only `bpy` is **not** a restriction — `import os, subprocess, socket` all work inside the
exec'd string. Blast radius is **full compromise of the Windows user account**: arbitrary file
read/write/delete, network egress, shell execution, credential theft from `.env` / `.ssh`.

**Finding B — TELEMETRY IS ON BY DEFAULT, AND THIS IS THE ONE THE PANEL MISSED.**
Endpoint `https://yzasssndwqceclzilcdu.supabase.co`, table `telemetry_events`. With consent
(**default ON**) it ships: the full text of prompts, the complete code strings executed, **viewport
screenshots**, scene metadata, trajectory data, and *"edits made directly in Blender while the MCP
server is running"* — i.e. Sean's manual work, not just agent actions. Terms grant a
**"worldwide, royalty-free, perpetual license"** to use that data to **train AI models** and
**share datasets with the research community**. The GDPR objection is issue #232, open, no maintainer
response. `uvx blender-mcp` activates telemetry before a user can discover it.

**For an unreleased commercial game this is a direct IP-leakage channel** for creature designs,
prompts and screenshots of unshipped work. Mitigation is reliable but must be done BEFORE first run:
`DISABLE_TELEMETRY=true` in the MCP env block **and** uncheck telemetry in addon preferences.

**Finding C — it cannot run headless.** The server's own timeout message: *"If Blender is running
headless (`blender -b`), commands never execute."* The addon needs Blender's event loop.
**Therefore MCP structurally cannot replace or augment the existing `blender --background` pipeline.**

**Finding D — there are no mesh tools.** 28 tools total; no decimate, no remesh, no export. Every
modelling operation routes through `execute_blender_code`. So for remesh / decimate / LOD / export
MCP adds **zero capability** over the existing script — it only changes who types the `bpy` call.

**Finding E — what it genuinely adds:** `get_viewport_screenshot` (closes the visual loop so an agent
can judge silhouette and proportion at low poly — a blind script cannot) and **Poly Pizza** low-poly
asset search. Caution: roughly 69% of Poly Pizza is **CC-BY, requiring creator attribution wherever
the model appears** — a real obligation for a shipped commercial game.

**Finding F — cost and failure modes.** 180-second hard command timeout. Context/state loss is the
dominant real-world failure; an independent test burned **60% of a 200 dollar/month plan on one donut
scene** and ended with corrupted geometry. Weak at organic modelling; sculpt mode unreachable;
topology below production bar — do not use it for rigging or anything that deforms.

**Recommended posture (Fable to confirm or overturn):** do NOT put MCP in the build pipeline.
Optionally install it as a **separate, hardened, exploration-only tool**, and use the highest-value
pattern: *discover operations interactively via MCP, then harvest the working `bpy` calls into the
headless script* where they become deterministic, reviewable and free.
Avoid `6xvl/blender-mcp` entirely — it force-auto-updates addon **and** server code from GitHub on
every Blender start, opt-out by default: an unreviewed remote-code-push channel.

---

## 5. THE CONCEPTUAL CORRECTION SEAN NEEDS IN THE PLAN

Sean asked what he needs Blender for, naming *"AI movements, routes, all that stuff."*
**Blender does none of that.** The plan must teach this split explicitly, because getting it wrong
costs months:

| Blender authors | The engine (R3F) decides |
|---|---|
| mesh, materials, UVs | when a monster walks, and where |
| rig / skeleton | pathfinding across the zone |
| animation **clips** (idle, move, attack, hit, death) | which clip plays right now |
| collision hulls, LOD ladder, baked lighting | spawning, waves, damage, score, input, camera |
| navmesh **geometry** | the pathfinding **algorithm** over it |

Blender authors the walk cycle; the engine decides when to walk. Named engine-side candidates worth
evaluating in the plan: `yuka` (steering behaviours for three.js), `three-pathfinding` (navmesh),
and a spatial hash grid for swarm broad-phase (needed because rapier is excluded at this stage).

---

## 6. OPEN DECISIONS THAT BLOCK AUTHORING (Fable must resolve or force to Sean)

1. **Two visual tiers or three — UNANSWERED.** No creature art can be authored until this lands; it
   determines whether every monster needs one build or two. Prior recommendation: TWO tiers, ONE
   cast identity, cluster-level variant (swap face/head clusters plus palette and material). Argument
   against a fully forked cast: two players in different modes cannot discuss the same enemy — the
   wiki forks, streams do not match. A previously-claimed "two seats independently converged" was
   **retracted**: they were Ox Alpha and GLM, the same lab, sibling tiers. One family answering
   twice is not corroboration.
2. **On-screen mode labels — UNANSWERED.** *"'Hardcore' printed on a settings screen tells every
   nine-year-old what the game thinks of them."* Proposed: **Natural / Stylised**.
3. **The MIRROR-BREAK grammar ambiguity.** *"odd-indexed copies of any N receive z += 1
   (validator-visible asymmetry)"* pins neither actor nor index base, giving at least three readings
   (`off` / `on0` / `on1`) that build different creatures, plus two more Fable previously named that
   the current model cannot express (extent growth `dz+1` rather than translation; "odd-indexed"
   ranging over recipe statements rather than copies within one N). All four reviewing seats said
   independently: **ask the author.** `--explain` reports the roster's own parenthetical points to
   **reader-applied** — the opposite of the verdict currently in the `.obj` headers.
4. **Where the game is deployed** — standalone (Law B) versus in-dashboard embed (must be Law A).

---

## 7. WHAT SEAN IS ACTUALLY OPTIMISING FOR

He is **new to game development** and explicitly asked to be taught, not just handed a plan. He is
expert in training and business, not gamedev. The plan should therefore:

- state the Blender-versus-engine split plainly (section 5) rather than assume it;
- protect him from the classic beginner trap — **do not author 50 monsters before knowing the game
  is fun.** Route A-prime already says: asset-factory 1+1 proof, then a **48-hour grey-box fun probe**
  (untextured boxes, no art). If it is boring with boxes it is boring with beautiful Frylings;
- respect that the factory is currently **ahead of the game** — assets have nowhere to go because
  `packages/aftertaste` does not exist. Fable should say plainly whether the next move is more
  asset capability or the grey-box probe;
- sequence to a visible, playable thing early.

### Verified learning path (already curated, section 11 of the blueprint)
Joey Carlino voxel-to-Blender rig (`bkn_uA2_qbc`) · TutsByKai rig (`c8xocTFhvaw`) · Wawa Sensei baking
(`fBH8SYA1aTI`) and lighting bake (`w2XvGYxQiOk`) · Wawa Sensei R3F game (`zwNF1-lsia8`) ·
SimonDev 3D RPG (`SBfZAVzbhCg`) plus spatial hash grids (`sx4IIQL0x7c`) and character controller
(`EkPfhzIbp2g`) · FinalForEach why runtime voxels are wrong (`fz3Td2zlgro`) · Max Novak Blender MCP
(`r7H60u0kHRA`) · Stefan 3D AI 72-hour game (`k9cbm5jSOxk`). **Watch 1–4 before touching MCP.**

### New (2026-09-01, swan-scout verified, views at crawl)
`YwoPuZa8N_g` Can Claude Fable Make AI Assets Game Ready? (98.7k) · `wSY1kHXSap0` Claude+Blender Full
Free Setup (245.8k) · `YwIGmEs0NdU` Claude Code Took Over Blender (299.5k) · `QkckeI0tITg` Fable 5
Makes FULL GAME with Godot MCP + Blender MCP (113.2k) · `mmpLXA-xzrQ` Complete AI 3D Workflow for
Indie Devs 2026 (39.8k) · `mFNokTtsTAk` I Gave Claude Code Blender Skills (33.8k) ·
`i0HCAwszhs8` Claude-to-Blender full setup (20.0k) · `uPmy2ERmkVU` Claude as game designer (22.7k).
Engine-side: `voJ_z1y8fjk` R3F pathfinding (Wawa Sensei) · `apoFCaxUlg8` Yuka steering behaviours ·
`K8vq4TGVlY8` three.js NPC pathfinding · `PdGfz7Wt9iM` navmesh creation.

**Transcript evidence (`YwoPuZa8N_g`, pulled in full):** the popular AI-3D workflow generates meshes
at **roughly 1.8M polygons** with holes, missing chunks and warped textures; naive Decimate destroys
the textures. That entire industry workflow is a **repair** pipeline. **Sean's voxel-authoring path
is a construction pipeline** — clean low-poly by construction, with no 1.8M-poly mess to rescue.
Fable should weigh whether text-to-3D belongs anywhere here (likely: props and environment where
silhouette authoring is expensive, never creatures).

---

## 8. THE QUESTION FABLE MUST ANSWER FIRST

Before the eleven-part plan: **is the next move more asset-machine capability, or the grey-box fun
probe?** Sean asked for an "asset creating machine", but the grounded state says the factory works
and has no consumer. Answer that, with reasoning, then plan accordingly.

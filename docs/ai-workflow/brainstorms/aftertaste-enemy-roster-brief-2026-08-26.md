---
decision: "Ox Alpha authors the Aftertaste enemy roster as BUILDABLE specs — voxel blockout dimensions, silhouette, palette slots, skeleton fit, animation intent — that swan_pipe.py can turn into assets without further interpretation"
status: open
supersedes: none
privacy: IDs/roles only.
---

# ASSET-AUTHORING BRIEF — Aftertaste enemy roster · 2026-08-26

## 0. What I need from you, precisely

You are authoring **specs a pipeline consumes**, not prose. There is a working Blender pipeline (`swan_pipe.py`) that takes a **voxel blockout `.obj`** and produces LOD0/1/2 + a convex-hull collision + a still, and a **validator** that refuses anything whose manifest disagrees with its bytes. Your output becomes the input to a generator script that emits those `.obj` files.

For each enemy, give me **exactly** the fields in §3. Numbers, not adjectives. A spec I have to interpret is a spec I have to re-do.

**Hard limit: one enemy per response is wrong — give me the full roster in one pass.** Calls are rate-limited to one per minute and credits are exhausted, so this brief must carry everything you need.

## 1. The world (binding constraints, not flavour)

- **Setting:** a contaminated Earth-tier pocket-shard the champion cleanses. Enemies are food waste, grease, sugar, and the things that feed on leftovers, animate.
- **Art law, inherited and non-negotiable** (`world.miniature-play.voxel-realm`): *"beveled voxels with disciplined roughness, not plastic cubes."* Minecraft likeness is **banned**. Voxel is the **authoring dialect**; the runtime is remeshed beveled low-poly. So: design in whole voxels, but the silhouette must survive a bevel and a 5× decimation.
- **Villains are contamination, decay, excess, manipulation, neglect — never body size.** No enemy is "fat", "obese", or a person. Grease is a *material*, not a physique.
- **Banned:** branded shapes (golden arches, a specific clown, a crowned burger figure, buckets, mascots), loot-box visuals, plastic toy shine, readable fake UI text.
- **Palette law B** (standalone build): `--world-night #10141A` ground · `--world-stone #52606B` structure · `--world-grass #4F8C5B` terrain · `--world-water #3E93AE` system · `--world-resource #E1B64E` rare reward · `--world-portal #8D68D8` single action · `--world-type #F1F4F2` text · `--world-danger #D85A55` **error only**. You get **at most 4 palette slots per enemy** and `--world-danger` is reserved for a telegraph, never body colour.

## 2. What already exists (do not re-invent, do not contradict)

- **Proof asset `enemy.fryling`**: a 5-voxel L-shaped blockout → 260 tris LOD0 / 124 LOD1 / 52 LOD2 / 16-tri collision hull. That is the *scale* the pipeline is calibrated at. Your specs should sit in that neighbourhood, not 10× it.
- **Skeleton `skeleton.creature-small.v1`**, clips: `idle, move, attack, hit, death`. Every rigged enemy uses **this one skeleton**. If an enemy cannot be driven by a small shared creature rig, say so and propose it as a **static prop** instead — that is a legitimate answer.
- **Tier ceilings enforced by the validator:** LOD1 ≤ 50 % of LOD0, LOD2 ≤ 25 %, collision ≤ 25 %. A design whose silhouette dies at 25 % is a design the pipeline will refuse.
- Named in the blueprint already: **Frylings** (swarm), **Patty Larvae** (armored, splits), **Crumb Roaches** (ambush/flank), **Grease Flies** (area denial, instanced), **Pizza Husk** (elite). A boss archetype exists — *a maître d' of rot*, name unassigned, force-feeding cut. You may refine these and add up to **three** more, but every addition must justify a distinct *gameplay* role, not a new flavour.

## 3. Required output — one block per enemy, this exact shape

```
id:              enemy.<lowercase-kebab>          # becomes a registry id
role:            swarm | armored | ambush | area-denial | elite | prop
voxelDims:       W x H x D                        # whole voxels, the bounding blockout
voxelCount:      <int>                            # occupied cells; keep 4-40
silhouette:      <one sentence — what it reads as at 25% triangles, in shadow>
buildRecipe:     <ordered list of voxel clusters with offsets, e.g.
                  "base 2x1x2 at (0,0,0); stalk 1x3x1 at (0,1,0); crown 3x1x3 at (-1,4,0)">
paletteSlots:    <=4 of the Law-B tokens, each with what it covers
rig:             skeleton.creature-small.v1 | none
clipIntent:      idle: <one line>  move: <one line>  attack: <one line>  hit: <...>  death: <...>
telegraph:       <the readable tell before its attack — shape/motion, NOT colour alone>
counterplay:     <what the player does about it — must tie to hydration/fiber/greens/movement>
ipRow:           nearest 3 commercial comparisons + why this is distinct
healthCheck:     <one line confirming it depicts contamination/decay, never a body>
```

## 4. Rules for the `buildRecipe` field (this is the part a script consumes)

- Origin `(0,0,0)` is the **bottom-centre**. `+Y` is up. Units are whole voxels.
- Every cluster is an axis-aligned box: `WxHxD at (x,y,z)`.
- Clusters must **touch or overlap** — a floating cluster produces a disconnected mesh and the collision hull will swallow the gap.
- Asymmetry is good (the art law bans plastic-cube regularity); **perfect mirror symmetry is a fail**.
- Keep total occupied cells in **4–40**. Below 4 has no silhouette; above 40 blows the tier ceilings at this calibration.

## 5. What to give me at the end

1. A one-paragraph **roster rationale**: why these roles, in this order, for a wave-based cleanse loop.
2. The **build order** you recommend (which three to author first, and why).
3. Anything in §1–§4 you think is **wrong** — you are still a hostile reviewer; a brief is not exempt.
